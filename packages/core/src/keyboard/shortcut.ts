// ---------------------------------------------------------------------------
// Keyboard-shortcut utilities
//
// Centralizes operating-system detection and the parse / display normalization
// the rest of the design system uses when a consumer passes a shortcut
// string (e.g. `'Ctrl+P'`, `'Shift+Alt+F'`, `'/'`).
//
// Why these live in `@arvo/utils`:
//   * Search / AdvanceSearch (React + JS) each shipped a local `parseShortcut`
//     that did the same Mac-aware cmd<->ctrl swap. Consolidating here drops
//     the four-copy drift surface and gives every component the same
//     mac-symbol rendering for free.
//   * Tabstrip's built-in shortcuts (Ctrl+P / Ctrl+Home / Ctrl+End / etc.)
//     must work on macOS where the platform shortcut is the Cmd key. The
//     `isModKey()` helper bakes the cross-platform "mod = ctrl on PC, cmd on
//     Mac" check in one place.
//   * Menu rows, tooltips, search badges, and tab-action menus all display
//     shortcuts as text. `formatShortcutDisplay()` turns the canonical
//     `'Ctrl+P'` developer input into the platform-correct visual
//     (`'Ctrl P'` on Windows / Linux, `'\u2318 P'` on Mac) so consumer
//     code never has to branch on platform.
//
// All helpers are SSR-safe: they tolerate a missing `navigator` (returns
// the `'other'` family + assumes non-Mac modifier semantics).
// ---------------------------------------------------------------------------

/**
 * Coarse operating-system family. Used internally by the modifier-key check
 * and the shortcut display formatter; consumers normally call `isMacOS()`
 * (the only branch the design system actually cares about) but the raw
 * family is exported so app code can drive its own platform-specific UX.
 */
export type ArvoOperatingSystem = 'mac' | 'windows' | 'linux' | 'other';

/**
 * Cached OS detection so the User-Agent string is parsed at most once per
 * page load. Re-reads if `navigator` was missing the first time (e.g.
 * during early SSR) so the value is correct as soon as it becomes
 * available.
 */
let _cachedOS: ArvoOperatingSystem | null = null;

/**
 * Reads the user's operating-system family from the browser. Prefers the
 * modern `navigator.userAgentData.platform` (Chromium 90+) and falls back
 * to the legacy `navigator.platform` / `navigator.userAgent` strings on
 * older engines or Safari/Firefox where UA-Client-Hints isn't available.
 *
 * Returns `'other'` when no navigator information is present (Node SSR,
 * Workers, jsdom without the polyfill). Callers should treat `'other'`
 * the same as Windows / Linux for modifier-key purposes -- Mac is the
 * only family the design system shifts behavior for.
 */
export function getOperatingSystem(): ArvoOperatingSystem {
  if (_cachedOS) return _cachedOS;
  if (typeof navigator === 'undefined') return 'other';

  // Modern User-Agent Client Hints (Chromium 90+). Available synchronously
  // on the `userAgentData` object even though the high-entropy values
  // require an async call.
  type UADataLike = { platform?: string };
  const nav = navigator as Navigator & { userAgentData?: UADataLike };
  const uaPlatform = nav.userAgentData?.platform?.toLowerCase() ?? '';
  const legacyPlatform = (nav.platform ?? '').toLowerCase();
  const ua = (nav.userAgent ?? '').toLowerCase();

  const haystack = `${uaPlatform} ${legacyPlatform} ${ua}`;

  let os: ArvoOperatingSystem;
  if (/mac|iphone|ipad|ipod|darwin/.test(haystack)) {
    os = 'mac';
  } else if (/win/.test(haystack)) {
    os = 'windows';
  } else if (/linux|cros|android/.test(haystack)) {
    os = 'linux';
  } else {
    os = 'other';
  }

  _cachedOS = os;
  return os;
}

/** Convenience: true on macOS / iPadOS / iOS. */
export function isMacOS(): boolean {
  return getOperatingSystem() === 'mac';
}

/**
 * Cross-platform "mod" key check. Returns true when the keyboard event
 * carries the platform's canonical primary modifier -- `Cmd` on macOS,
 * `Ctrl` everywhere else. Use this when wiring a built-in shortcut that
 * should fire under either modifier depending on the OS the user is on.
 *
 * The helper also rejects the "wrong" modifier on each platform so a
 * literal `Ctrl+P` on macOS (which the browser binds to "Print") does
 * not accidentally fire the design-system shortcut.
 */
export function isModKey(event: KeyboardEvent | { ctrlKey: boolean; metaKey: boolean }): boolean {
  return isMacOS() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface ParsedShortcut {
  /** The non-modifier key (e.g. `'p'`, `'/'`, `'arrowleft'`, `'home'`). */
  key: string;
  /** Whether the parsed shortcut expects `event.ctrlKey === true`. */
  ctrl: boolean;
  /** Whether the parsed shortcut expects `event.altKey === true`. */
  alt: boolean;
  /** Whether the parsed shortcut expects `event.shiftKey === true`. */
  shift: boolean;
  /** Whether the parsed shortcut expects `event.metaKey === true`. */
  meta: boolean;
}

/**
 * Parse a developer-authored shortcut string into a matcher that lines up
 * with `KeyboardEvent` modifier flags. Recognizes:
 *
 *   * `+` as the modifier / key separator (canonical developer format).
 *   * Case-insensitive modifier names: `Ctrl`, `Control`, `Cmd`, `Command`,
 *     `Meta`, `Alt`, `Option`, `Shift`, `Mod`.
 *   * The `Mod` alias (and the equivalent `Ctrl` / `Cmd` literal) which
 *     maps to `metaKey` on macOS and `ctrlKey` everywhere else so a single
 *     shortcut definition works on both platforms.
 *
 * The trailing token is treated as the non-modifier `key`. Returns the
 * matcher as a struct so callers can compare each flag against the live
 * `KeyboardEvent` without further branching.
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  const key = parts.pop() ?? '';
  const set = new Set(parts);

  const isMac = isMacOS();
  const hasModAlias =
    set.has('mod') || set.has('ctrl') || set.has('control') || set.has('cmd') || set.has('command');

  return {
    key,
    ctrl: hasModAlias && !isMac,
    alt: set.has('alt') || set.has('option'),
    shift: set.has('shift'),
    meta: (hasModAlias && isMac) || set.has('meta'),
  };
}

/**
 * Compare a parsed shortcut against a live keyboard event. The non-modifier
 * key is matched case-insensitively against `event.key`. All four
 * modifier flags must match exactly so `Ctrl+P` does not also fire on
 * `Ctrl+Shift+P` (which is a different built-in shortcut on most
 * platforms).
 */
export function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  return (
    event.key.toLowerCase() === parsed.key &&
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.metaKey === parsed.meta
  );
}

// ---------------------------------------------------------------------------
// Display formatter
// ---------------------------------------------------------------------------

/**
 * Map of recognized modifier tokens (case-insensitive, normalized) to their
 * platform-specific display glyphs. On macOS the design system mirrors
 * the OS conventions (`\u2318` for Cmd / Ctrl-as-Mod, `\u2325` for Alt /
 * Option, `\u21E7` for Shift, `\u2303` for literal Control). Everywhere
 * else modifiers stay as their English name so a Windows user does not
 * see unfamiliar glyphs.
 *
 * The arrow / nav glyphs (`ArrowLeft`, `Home`, `Enter`, etc.) get short
 * symbolic forms on both platforms because their full English names
 * read awkwardly inline (`Move tab    Ctrl ArrowLeft` -> `Ctrl \u2190`).
 * Single-character keys (`p`, `/`) display unchanged but uppercased so
 * they read as "press this physical key".
 */
const MAC_MODIFIER_MAP: Record<string, string> = {
  mod: '\u2318',
  ctrl: '\u2318',
  control: '\u2318',
  cmd: '\u2318',
  command: '\u2318',
  meta: '\u2318',
  alt: '\u2325',
  option: '\u2325',
  shift: '\u21E7',
};

const NON_MAC_MODIFIER_MAP: Record<string, string> = {
  mod: 'Ctrl',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  cmd: 'Ctrl',
  command: 'Ctrl',
  meta: 'Meta',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
};

/**
 * Display labels for common non-character keys. Arrow glyphs (and Enter /
 * Backspace) read better than their English names when slotted next to
 * a modifier glyph in a menu row. Same map is used on both platforms --
 * it is the modifier glyphs (above) that flip per OS.
 */
const KEY_DISPLAY_MAP: Record<string, string> = {
  arrowleft: '\u2190',
  arrowright: '\u2192',
  arrowup: '\u2191',
  arrowdown: '\u2193',
  left: '\u2190',
  right: '\u2192',
  up: '\u2191',
  down: '\u2193',
  enter: 'Enter',
  return: 'Enter',
  esc: 'Esc',
  escape: 'Esc',
  space: 'Space',
  tab: 'Tab',
  backspace: 'Backspace',
  del: 'Del',
  delete: 'Del',
  home: 'Home',
  end: 'End',
  pageup: 'PgUp',
  pagedown: 'PgDn',
};

/**
 * Normalize a developer-authored shortcut string into a display label that
 * matches the active operating system. Examples (Windows / Linux):
 *
 *   * `'Ctrl+P'`         -> `'Ctrl P'`
 *   * `'Ctrl+Shift+\\'`  -> `'Ctrl Shift \\'`
 *   * `'Ctrl+ArrowLeft'` -> `'Ctrl \u2190'`
 *   * `'Del'`            -> `'Del'`
 *
 * On macOS the same inputs become:
 *
 *   * `'Ctrl+P'`         -> `'\u2318 P'`
 *   * `'Ctrl+Shift+\\'`  -> `'\u21E7 \u2318 \\'`  (Mac orders: Ctrl Alt Shift Cmd K)
 *   * `'Ctrl+ArrowLeft'` -> `'\u2318 \u2190'`
 *   * `'Del'`            -> `'Del'`
 *
 * Returns the original input unchanged if it is empty so downstream code
 * can still rely on a truthy check.
 */
export function formatShortcutDisplay(shortcut: string | null | undefined): string {
  if (!shortcut) return '';
  const trimmed = shortcut.trim();
  if (trimmed.length === 0) return '';

  const parts = trimmed.split('+').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) return '';

  const key = parts.pop() as string;
  const isMac = isMacOS();
  const modifierMap = isMac ? MAC_MODIFIER_MAP : NON_MAC_MODIFIER_MAP;

  // Mac convention orders modifiers Ctrl, Opt, Shift, Cmd (left to right).
  // Reorder so the result reads natively rather than echoing whatever
  // order the developer typed. Non-Mac platforms keep the developer's
  // order because there is no single conventional ordering and reordering
  // would surprise consumers.
  const orderedModifiers = isMac
    ? sortMacModifiers(parts.map((p) => p.toLowerCase()))
    : parts.map((p) => p.toLowerCase());

  const displayedModifiers = orderedModifiers.map((mod) => modifierMap[mod] ?? capitalize(mod));
  const displayedKey = formatKeyDisplay(key);

  return [...displayedModifiers, displayedKey].filter(Boolean).join(' ');
}

function formatKeyDisplay(rawKey: string): string {
  const lower = rawKey.toLowerCase();
  const mapped = KEY_DISPLAY_MAP[lower];
  if (mapped) return mapped;
  // Single-character keys uppercase for visibility (matches the convention
  // used by browser menu surfaces). Multi-character function keys keep
  // their original casing (e.g. `F1`, `F12`).
  if (rawKey.length === 1) return rawKey.toUpperCase();
  return rawKey;
}

function sortMacModifiers(modifiers: string[]): string[] {
  // Apple's keyboard-shortcut style guide orders modifiers
  //   Control, Option, Shift, Command
  // from left to right. On macOS the design system treats `Ctrl` / `Cmd`
  // / `Mod` in a developer-authored shortcut string as the platform's
  // primary modifier -- i.e. the Cmd key (the same swap `parseShortcut`
  // applies when matching). Sorting `'ctrl'` as Cmd (rank 3 instead of
  // rank 0) keeps the visual order consistent with the runtime behavior:
  // a `'Ctrl+Shift+\\'` shortcut both DISPLAYS as `Shift Cmd \` and
  // FIRES on Shift+Cmd+\ on macOS.
  const rank: Record<string, number> = {
    alt: 1,
    option: 1,
    shift: 2,
    control: 3,
    ctrl: 3,
    cmd: 3,
    command: 3,
    meta: 3,
    mod: 3,
  };
  return [...modifiers].sort((a, b) => (rank[a] ?? 99) - (rank[b] ?? 99));
}

function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ---------------------------------------------------------------------------
// Test-only helpers
// ---------------------------------------------------------------------------

/**
 * Reset the cached OS detection. Vitest suites that swap `navigator`
 * between tests can call this to force re-detection on the next access.
 * Not part of the public consumer API.
 *
 * @internal
 */
export function __resetOperatingSystemCacheForTests(): void {
  _cachedOS = null;
}
