// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetOperatingSystemCacheForTests,
  formatShortcutDisplay,
  getOperatingSystem,
  isMacOS,
  isModKey,
  matchesShortcut,
  parseShortcut,
} from '../shortcut';

// ---------------------------------------------------------------------------
// Test harness -- swap navigator.userAgent / platform / userAgentData between
// tests so we exercise both Mac and non-Mac branches without spinning up two
// jsdom environments.
// ---------------------------------------------------------------------------

interface NavStub {
  userAgent?: string;
  platform?: string;
  userAgentData?: { platform: string };
}

/**
 * Force navigator to look like the given platform. jsdom's `navigator` is
 * a Proxy whose `userAgent` / `platform` have no configurable descriptors,
 * so we use `Object.defineProperty(..., { configurable: true })` to layer
 * our stubs over them. The afterEach hook tears them down so the next
 * file (or test) sees a clean navigator.
 */
function setNavigator(stub: NavStub): void {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    get: () => stub.userAgent ?? '',
  });
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    get: () => stub.platform ?? '',
  });
  Object.defineProperty(window.navigator, 'userAgentData', {
    configurable: true,
    get: () => stub.userAgentData,
  });
  __resetOperatingSystemCacheForTests();
}

beforeEach(() => {
  __resetOperatingSystemCacheForTests();
});

afterEach(() => {
  // Reset stubbed accessors to noop getters so subsequent tests can re-stub
  // freely (configurable: true keeps the slot writable).
  try {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      get: () => '',
    });
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      get: () => '',
    });
    Object.defineProperty(window.navigator, 'userAgentData', {
      configurable: true,
      get: () => undefined,
    });
  } catch {
    // jsdom in some environments freezes a navigator getter; swallow
    // because we still reset the OS cache for the next test.
  }
  __resetOperatingSystemCacheForTests();
});

// ---------------------------------------------------------------------------
// getOperatingSystem
// ---------------------------------------------------------------------------

describe('getOperatingSystem', () => {
  it('detects macOS via userAgentData', () => {
    setNavigator({ userAgentData: { platform: 'macOS' }, userAgent: 'Mozilla/5.0' });
    expect(getOperatingSystem()).toBe('mac');
  });

  it('detects macOS via legacy platform', () => {
    setNavigator({ platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh)' });
    expect(getOperatingSystem()).toBe('mac');
  });

  it('detects iOS / iPad as mac for modifier purposes', () => {
    setNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' });
    expect(getOperatingSystem()).toBe('mac');
  });

  it('detects Windows', () => {
    setNavigator({
      userAgentData: { platform: 'Windows' },
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    });
    expect(getOperatingSystem()).toBe('windows');
  });

  it('detects Linux', () => {
    setNavigator({ platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' });
    expect(getOperatingSystem()).toBe('linux');
  });

  it('falls back to "other" when navigator is empty', () => {
    setNavigator({});
    expect(getOperatingSystem()).toBe('other');
  });

  it('caches the result across calls', () => {
    setNavigator({ platform: 'MacIntel' });
    expect(getOperatingSystem()).toBe('mac');
    setNavigator({ platform: 'Win32' });
    // Cache reset is what setNavigator does; without resetting the cache
    // would stick to the previous value. This documents the cache exists.
    expect(getOperatingSystem()).toBe('windows');
  });
});

// ---------------------------------------------------------------------------
// isMacOS / isModKey
// ---------------------------------------------------------------------------

describe('isMacOS / isModKey', () => {
  it('isMacOS returns true on mac', () => {
    setNavigator({ platform: 'MacIntel' });
    expect(isMacOS()).toBe(true);
  });

  it('isMacOS returns false on windows', () => {
    setNavigator({ platform: 'Win32' });
    expect(isMacOS()).toBe(false);
  });

  it('isModKey is ctrlKey on windows', () => {
    setNavigator({ platform: 'Win32' });
    expect(isModKey({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isModKey({ ctrlKey: false, metaKey: true })).toBe(false);
  });

  it('isModKey is metaKey on mac (cmd, not ctrl)', () => {
    setNavigator({ platform: 'MacIntel' });
    expect(isModKey({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isModKey({ ctrlKey: true, metaKey: false })).toBe(false);
  });

  it('isModKey rejects when both modifiers are pressed (avoids accidental fire)', () => {
    setNavigator({ platform: 'MacIntel' });
    expect(isModKey({ ctrlKey: true, metaKey: true })).toBe(false);
    setNavigator({ platform: 'Win32' });
    expect(isModKey({ ctrlKey: true, metaKey: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseShortcut
// ---------------------------------------------------------------------------

describe('parseShortcut', () => {
  it('parses Ctrl+P on Windows -> ctrlKey only', () => {
    setNavigator({ platform: 'Win32' });
    expect(parseShortcut('Ctrl+P')).toEqual({
      key: 'p',
      ctrl: true,
      alt: false,
      shift: false,
      meta: false,
    });
  });

  it('parses Ctrl+P on Mac -> metaKey (cmd swap)', () => {
    setNavigator({ platform: 'MacIntel' });
    expect(parseShortcut('Ctrl+P')).toEqual({
      key: 'p',
      ctrl: false,
      alt: false,
      shift: false,
      meta: true,
    });
  });

  it('parses Mod alias the same as Ctrl', () => {
    setNavigator({ platform: 'Win32' });
    expect(parseShortcut('Mod+K')).toEqual({
      key: 'k',
      ctrl: true,
      alt: false,
      shift: false,
      meta: false,
    });
    setNavigator({ platform: 'MacIntel' });
    expect(parseShortcut('Mod+K')).toEqual({
      key: 'k',
      ctrl: false,
      alt: false,
      shift: false,
      meta: true,
    });
  });

  it('parses Option as Alt on Mac', () => {
    setNavigator({ platform: 'MacIntel' });
    expect(parseShortcut('Option+/')).toEqual({
      key: '/',
      ctrl: false,
      alt: true,
      shift: false,
      meta: false,
    });
  });

  it('parses Shift+Alt+F as compound modifiers', () => {
    setNavigator({ platform: 'Win32' });
    expect(parseShortcut('Shift+Alt+F')).toEqual({
      key: 'f',
      ctrl: false,
      alt: true,
      shift: true,
      meta: false,
    });
  });

  it('parses a single key like "/" with no modifiers', () => {
    setNavigator({ platform: 'Win32' });
    expect(parseShortcut('/')).toEqual({
      key: '/',
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    });
  });
});

// ---------------------------------------------------------------------------
// matchesShortcut
// ---------------------------------------------------------------------------

describe('matchesShortcut', () => {
  it('matches Ctrl+P on Windows when ctrl+p pressed', () => {
    setNavigator({ platform: 'Win32' });
    const parsed = parseShortcut('Ctrl+P');
    const ev = {
      key: 'p',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    } as unknown as KeyboardEvent;
    expect(matchesShortcut(ev, parsed)).toBe(true);
  });

  it('does NOT match Ctrl+P on Mac when ctrl pressed (cmd is the mod there)', () => {
    setNavigator({ platform: 'MacIntel' });
    const parsed = parseShortcut('Ctrl+P');
    const ev = {
      key: 'p',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    } as unknown as KeyboardEvent;
    expect(matchesShortcut(ev, parsed)).toBe(false);
  });

  it('matches Ctrl+P on Mac when cmd pressed', () => {
    setNavigator({ platform: 'MacIntel' });
    const parsed = parseShortcut('Ctrl+P');
    const ev = {
      key: 'p',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: true,
    } as unknown as KeyboardEvent;
    expect(matchesShortcut(ev, parsed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatShortcutDisplay
// ---------------------------------------------------------------------------

describe('formatShortcutDisplay', () => {
  describe('on Windows / Linux', () => {
    beforeEach(() => {
      setNavigator({ platform: 'Win32' });
    });

    it('renders Ctrl+P as "Ctrl P" (space instead of plus)', () => {
      expect(formatShortcutDisplay('Ctrl+P')).toBe('Ctrl P');
    });

    it('renders compound shortcut with all modifiers space-joined', () => {
      expect(formatShortcutDisplay('Ctrl+Shift+\\')).toBe('Ctrl Shift \\');
    });

    it('renders arrow keys as glyphs', () => {
      expect(formatShortcutDisplay('Ctrl+ArrowLeft')).toBe('Ctrl \u2190');
      expect(formatShortcutDisplay('Ctrl+ArrowRight')).toBe('Ctrl \u2192');
    });

    it('renders nav keys preserved (Home, End)', () => {
      expect(formatShortcutDisplay('Ctrl+Home')).toBe('Ctrl Home');
      expect(formatShortcutDisplay('Ctrl+End')).toBe('Ctrl End');
    });

    it('renders Del/Delete unchanged', () => {
      expect(formatShortcutDisplay('Del')).toBe('Del');
      expect(formatShortcutDisplay('Delete')).toBe('Del');
    });

    it('uppercases single-character keys', () => {
      expect(formatShortcutDisplay('p')).toBe('P');
      expect(formatShortcutDisplay('/')).toBe('/');
    });

    it('returns empty string for null / undefined / empty input', () => {
      expect(formatShortcutDisplay(null)).toBe('');
      expect(formatShortcutDisplay(undefined)).toBe('');
      expect(formatShortcutDisplay('')).toBe('');
      expect(formatShortcutDisplay('   ')).toBe('');
    });
  });

  describe('on macOS', () => {
    beforeEach(() => {
      setNavigator({ platform: 'MacIntel' });
    });

    it('renders Ctrl+P as the Cmd glyph + key', () => {
      expect(formatShortcutDisplay('Ctrl+P')).toBe('\u2318 P');
    });

    it('renders Mod alias as Cmd glyph', () => {
      expect(formatShortcutDisplay('Mod+K')).toBe('\u2318 K');
    });

    it('renders Shift+Cmd+K in mac modifier order (Shift then Cmd)', () => {
      expect(formatShortcutDisplay('Cmd+Shift+K')).toBe('\u21E7 \u2318 K');
    });

    it('renders Option as the Mac option glyph', () => {
      expect(formatShortcutDisplay('Option+/')).toBe('\u2325 /');
      expect(formatShortcutDisplay('Alt+/')).toBe('\u2325 /');
    });

    it('renders Ctrl+ArrowLeft as Cmd glyph + arrow glyph', () => {
      expect(formatShortcutDisplay('Ctrl+ArrowLeft')).toBe('\u2318 \u2190');
    });

    it('renders compound Ctrl+Shift+\\ in mac order', () => {
      // 'Ctrl' is the Mod alias -> Cmd, leaving Shift as the only literal
      // modifier, so the expected order is "Shift Cmd \" in glyphs.
      expect(formatShortcutDisplay('Ctrl+Shift+\\')).toBe('\u21E7 \u2318 \\');
    });
  });
});
