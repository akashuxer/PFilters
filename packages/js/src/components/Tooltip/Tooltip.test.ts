import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoTooltip } from './Tooltip';
import { createTooltipManager } from '@arvo/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createTrigger(tag: keyof HTMLElementTagNameMap = 'button'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el as HTMLElement;
}

// Tooltip managers ship disabled by default so the system stays inert until
// host apps explicitly opt in via `setupTooltips({ enabled: true })` (see
// the gate behavior tests at the bottom of this file). The behavior tests in
// this file all assume an opted-in manager, so use this helper everywhere
// instead of calling `createTooltipManager()` directly.
function createEnabledManager(): ReturnType<typeof createTooltipManager> {
  const manager = createTooltipManager();
  manager.configure({ enabled: true });
  return manager;
}

async function showOnHover(trigger: HTMLElement): Promise<void> {
  trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  vi.advanceTimersByTime(400);
  await vi.runAllTimersAsync();
}

async function showOnFocus(trigger: HTMLElement): Promise<void> {
  trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.runAllTimersAsync();
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('Tooltip - initialization', () => {
  it('ArvoTooltip.initialize() returns an ArvoTooltip instance', () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip text' }, manager);
    expect(tip).toBeInstanceOf(ArvoTooltip);
  });

  it('stores the element reference via .element getter', () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip text' }, manager);
    expect(tip.element).toBe(el);
  });

  it('uses the global tooltipManager when no manager is provided', () => {
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Global manager tip' });
    expect(tip).toBeInstanceOf(ArvoTooltip);
  });

  it('DEFAULTS is an empty object by default', () => {
    expect(ArvoTooltip.DEFAULTS).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Tooltip on hover
// ---------------------------------------------------------------------------
describe('Tooltip - hover trigger', () => {
  it('shows tooltip after 400ms hover delay on mouseenter', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    await showOnHover(el);
    expect(manager.isVisible()).toBe(true);
  });

  it('tooltip element has role="tooltip"', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    await showOnHover(el);
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it('tooltip has .arvo-tip class', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    await showOnHover(el);
    expect(document.querySelector('.arvo-tip')).not.toBeNull();
  });

  it('trigger gets aria-describedby after hover', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    await showOnHover(el);
    const tipId = document.querySelector('[role="tooltip"]')!.id;
    expect(el.getAttribute('aria-describedby')).toContain(tipId);
  });

  it('does not show tooltip before 400ms elapses', () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(399);
    expect(manager.isVisible()).toBe(false);
  });

  it('hides tooltip on mouseleave after hide delay', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    await showOnHover(el);
    expect(manager.isVisible()).toBe(true);

    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('removes aria-describedby from trigger after mouseleave', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Hover tip' }, manager);
    await showOnHover(el);

    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tooltip on focus
// ---------------------------------------------------------------------------
describe('Tooltip - focus trigger', () => {
  it('shows tooltip immediately on focusin (0ms delay)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Focus tip' }, manager);
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(true);
  });

  it('trigger gets aria-describedby on focusin', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Focus tip' }, manager);
    await showOnFocus(el);
    const tipId = document.querySelector('[role="tooltip"]')!.id;
    expect(el.getAttribute('aria-describedby')).toContain(tipId);
  });

  it('hides tooltip immediately on focusout', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Focus tip' }, manager);
    await showOnFocus(el);

    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('removes aria-describedby on focusout', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Focus tip' }, manager);
    await showOnFocus(el);

    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await vi.runAllTimersAsync();
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
describe('Tooltip - content', () => {
  it('displays content text in .arvo-tip__txt', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'My tooltip content' }, manager);
    await showOnHover(el);
    const txtEl = document.querySelector('.arvo-tip__txt');
    expect(txtEl).not.toBeNull();
    expect(txtEl!.textContent).toBe('My tooltip content');
  });

  it('displays shortcut in .arvo-tip__shortcut when shortcut is provided (display-normalized)', async () => {
    // Shortcut strings flow through `formatShortcutDisplay` so the
    // visible text matches the active OS. The jsdom default platform
    // resolves to non-Mac so `Ctrl+S` renders as `Ctrl S`.
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Save', shortcut: 'Ctrl+S' }, manager);
    await showOnHover(el);
    const shortcutEl = document.querySelector('.arvo-tip__shortcut');
    expect(shortcutEl).not.toBeNull();
    expect(shortcutEl!.textContent).toBe('Ctrl S');
  });

  it('shortcut element is hidden when shortcut is not provided', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'No shortcut' }, manager);
    await showOnHover(el);
    const shortcutEl = document.querySelector('.arvo-tip__shortcut') as HTMLElement | null;
    expect(shortcutEl).not.toBeNull();
    expect(shortcutEl!.style.display).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
describe('Tooltip - update()', () => {
  it('update() changes tooltip content', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Original content' }, manager);

    tip.update({ content: 'Updated content' });
    await showOnHover(el);
    const txtEl = document.querySelector('.arvo-tip__txt');
    expect(txtEl!.textContent).toBe('Updated content');
  });

  it('update() changes placement without error', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip', placement: 'bottom-center' }, manager);

    tip.update({ placement: 'top-center' });
    await showOnHover(el);
    expect(manager.isVisible()).toBe(true);
  });

  it('update() with shortcut updates the shortcut value (display-normalized)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Save', shortcut: 'Ctrl+K' }, manager);

    tip.update({ content: 'Save', shortcut: 'Ctrl+Z' });
    await showOnHover(el);
    const shortcutEl = document.querySelector('.arvo-tip__shortcut');
    expect(shortcutEl!.textContent).toBe('Ctrl Z');
  });

  // ------------------------------------------------------------------------
  // Regression: update() must NOT clobber existing fields when the caller
  // omits them -- spreading `undefined` over unspecified keys would blank
  // content/placement/shortcut.
  // ------------------------------------------------------------------------

  it('update({ placement }) preserves the existing content (W1-TIP-DRIFT-001)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Original content' }, manager);

    tip.update({ placement: 'top-center' });
    await showOnHover(el);
    const txtEl = document.querySelector('.arvo-tip__txt');
    expect(txtEl).not.toBeNull();
    expect(txtEl!.textContent).toBe('Original content');
  });

  it('update({ placement }) preserves an existing shortcut', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(
      el,
      { content: 'Save', shortcut: 'Ctrl+S' },
      manager,
    );

    tip.update({ placement: 'top-center' });
    await showOnHover(el);
    const shortcutEl = document.querySelector('.arvo-tip__shortcut');
    expect(shortcutEl).not.toBeNull();
    // Display is normalized to the active OS -- jsdom is non-Mac.
    expect(shortcutEl!.textContent).toBe('Ctrl S');
  });

  it('update({ content }) preserves an existing shortcut', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(
      el,
      { content: 'Save', shortcut: 'Ctrl+S' },
      manager,
    );

    tip.update({ content: 'Save changes' });
    await showOnHover(el);
    const txtEl = document.querySelector('.arvo-tip__txt');
    const shortcutEl = document.querySelector('.arvo-tip__shortcut');
    expect(txtEl!.textContent).toBe('Save changes');
    expect(shortcutEl!.textContent).toBe('Ctrl S');
  });

  it('update({}) is a no-op (no fields supplied -> nothing changes)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(
      el,
      { content: 'Original', shortcut: 'Ctrl+K' },
      manager,
    );

    tip.update({});
    await showOnHover(el);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Original');
    expect(document.querySelector('.arvo-tip__shortcut')!.textContent).toBe('Ctrl K');
  });
});

// ---------------------------------------------------------------------------
// Escape dismissal
// ---------------------------------------------------------------------------
describe('Tooltip - Escape dismissal', () => {
  it('pressing Escape hides the tooltip', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Escape tip' }, manager);
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('Escape removes aria-describedby from trigger', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Escape tip' }, manager);
    await showOnFocus(el);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.runAllTimersAsync();
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('Tooltip - destroy()', () => {
  it('destroy() removes event listeners (mouseenter no longer shows tooltip)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip' }, manager);

    tip.destroy();
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(400);
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('destroy() removes focusin listener (tooltip no longer shows on focus)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip' }, manager);

    tip.destroy();
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('destroy() hides any currently visible tooltip', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip' }, manager);
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(true);

    tip.destroy();
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('destroy() clears aria-describedby from trigger', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip' }, manager);
    await showOnFocus(el);

    tip.destroy();
    await vi.runAllTimersAsync();
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });

  it('does not throw when destroy() is called without prior show', () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    const tip = ArvoTooltip.initialize(el, { content: 'Tip' }, manager);
    expect(() => tip.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Single instance (singleton manager)
// ---------------------------------------------------------------------------
describe('Tooltip - single instance', () => {
  it('showing tooltip on element B hides tooltip from element A', async () => {
    const manager = createEnabledManager();
    const elA = createTrigger();
    const elB = createTrigger();
    ArvoTooltip.initialize(elA, { content: 'Tip A' }, manager);
    ArvoTooltip.initialize(elB, { content: 'Tip B' }, manager);

    await showOnFocus(elA);
    expect(manager.isVisible()).toBe(true);
    const tipId = document.querySelector('[role="tooltip"]')!.id;
    expect(elA.getAttribute('aria-describedby')).toContain(tipId);

    await showOnFocus(elB);
    expect(manager.isVisible()).toBe(true);
    expect(elA.getAttribute('aria-describedby')).toBeNull();
    expect(elB.getAttribute('aria-describedby')).toContain(tipId);
  });

  it('only one tooltip element exists in the DOM at a time', async () => {
    const manager = createEnabledManager();
    const elA = createTrigger();
    const elB = createTrigger();
    ArvoTooltip.initialize(elA, { content: 'Tip A' }, manager);
    ArvoTooltip.initialize(elB, { content: 'Tip B' }, manager);

    await showOnFocus(elA);
    await showOnFocus(elB);
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);
  });

  it('tooltip content updates when switching between triggers', async () => {
    const manager = createEnabledManager();
    const elA = createTrigger();
    const elB = createTrigger();
    ArvoTooltip.initialize(elA, { content: 'Content A' }, manager);
    ArvoTooltip.initialize(elB, { content: 'Content B' }, manager);

    await showOnFocus(elA);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Content A');

    await showOnFocus(elB);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Content B');
  });
});

// ---------------------------------------------------------------------------
// Placement -- all 12 values
// ---------------------------------------------------------------------------
describe('Tooltip -- all 12 placement values', () => {
  const ALL_PLACEMENTS = [
    'bottom-center', 'bottom-start', 'bottom-end',
    'top-center', 'top-start', 'top-end',
    'left-center', 'left-start', 'left-end',
    'right-center', 'right-start', 'right-end',
  ] as const;

  it.each(ALL_PLACEMENTS)(
    'accepts placement and shows tooltip without error (%s)',
    async (placement) => {
      const manager = createEnabledManager();
      const el = createTrigger();
      ArvoTooltip.initialize(el, { content: 'Tip ' + placement, placement }, manager);
      await showOnFocus(el);
      expect(manager.isVisible()).toBe(true);
      expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Tip ' + placement);
    },
  );

  it.each(ALL_PLACEMENTS)(
    'sets aria-describedby on trigger for placement (%s)',
    async (placement) => {
      const manager = createEnabledManager();
      const el = createTrigger();
      ArvoTooltip.initialize(el, { content: 'Tip', placement }, manager);
      await showOnFocus(el);
      const tipId = document.querySelector('[role="tooltip"]')!.id;
      expect(el.getAttribute('aria-describedby')).toContain(tipId);
    },
  );

  it.each(['left-center', 'left-start', 'left-end', 'right-center', 'right-start', 'right-end'] as const)(
    'horizontal placement shows tooltip via hover (%s)',
    async (placement) => {
      const manager = createEnabledManager();
      const el = createTrigger();
      ArvoTooltip.initialize(el, { content: 'Horizontal ' + placement, placement }, manager);
      await showOnHover(el);
      expect(manager.isVisible()).toBe(true);
    },
  );

  it.each(ALL_PLACEMENTS)(
    'update() changes to placement without error (%s)',
    async (placement) => {
      const manager = createEnabledManager();
      const el = createTrigger();
      const tip = ArvoTooltip.initialize(el, { content: 'Tip', placement: 'bottom-center' }, manager);
      tip.update({ placement });
      await showOnFocus(el);
      expect(manager.isVisible()).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// Disabled-by-default gate
//
// The shared tooltipManager (and any manager created via createTooltipManager)
// ships with `enabled: false`. This is intentional -- the tooltip system stays
// inert until the host app explicitly opts in via setupTooltips({ enabled: true })
// or manager.configure({ enabled: true }). These tests lock that contract.
// ---------------------------------------------------------------------------
describe('Tooltip -- disabled-by-default gate', () => {
  it('createTooltipManager() returns a manager with enabled: false by default', () => {
    const manager = createTooltipManager();
    expect(manager.getConfig().enabled).toBe(false);
  });

  it('hover does not show tooltip when manager is disabled', async () => {
    const manager = createTooltipManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Tip' }, manager);
    await showOnHover(el);
    expect(manager.isVisible()).toBe(false);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('focus does not show tooltip when manager is disabled', async () => {
    const manager = createTooltipManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Tip' }, manager);
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(false);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('disabled manager does not set aria-describedby on trigger', async () => {
    const manager = createTooltipManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Tip' }, manager);
    await showOnFocus(el);
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });

  it('configure({ enabled: true }) re-enables a previously disabled manager', async () => {
    const manager = createTooltipManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Tip' }, manager);

    // Initial show is suppressed
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(false);

    // Opt in, then trigger again
    manager.configure({ enabled: true });
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(true);
  });

  it('configure({ enabled: false }) suppresses subsequent shows on a previously enabled manager', async () => {
    const manager = createEnabledManager();
    const elA = createTrigger();
    const elB = createTrigger();
    ArvoTooltip.initialize(elA, { content: 'Tip A' }, manager);
    ArvoTooltip.initialize(elB, { content: 'Tip B' }, manager);

    await showOnFocus(elA);
    expect(manager.isVisible()).toBe(true);

    manager.configure({ enabled: false });

    // New focus on B should be a no-op; the existing tooltip from A
    // remains until explicitly hidden (configure() does not force-hide).
    elB.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.runAllTimersAsync();
    // Tooltip text should NOT have switched to "Tip B" because show() bailed.
    const txtEl = document.querySelector('.arvo-tip__txt');
    expect(txtEl?.textContent).toBe('Tip A');
  });
});

// ---------------------------------------------------------------------------
// Non-persistent on tooltip hover (standard tooltip)
// The standard tooltip is purely informational and must not stay visible
// when the cursor moves from the trigger onto the tooltip element. This
// keeps adjacent tooltipped controls reachable. The tooltip element itself
// is `pointer-events: none` in SCSS so the cursor passes through it;
// triggering mouseenter on the tip element (as can happen via synthetic
// dispatchEvent) must NOT cancel the pending hide.
//
// The persistence escape hatch (mouseenter/mouseleave bridge handlers on
// the tip element + a non-zero hideDelay) is preserved in the manager for
// the future rich tooltip variant, which will opt in via the
// `arvo-tip--rich` modifier (pointer-events: auto) plus a configured
// hideDelay.
// ---------------------------------------------------------------------------
describe('Tooltip - non-persistent on tooltip hover (standard)', () => {
  it('mouseleave on trigger hides the tooltip even if the cursor enters the tooltip element', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Standard tip' }, manager);
    await showOnHover(el);
    expect(manager.isVisible()).toBe(true);

    // Mouse leaves trigger -- hide is immediate for the standard tooltip
    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    // Even if a mouseenter fires on the tip element (which cannot happen at
    // runtime because the panel is pointer-events: none, but tests can
    // dispatch the event synthetically), the bridge must not persist the
    // tooltip while in standard mode.
    const tipEl = manager.getElement()!;
    expect(tipEl).not.toBeNull();
    tipEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);
  });

  it('manager default hideDelay is 0 so the standard tooltip dismisses immediately', () => {
    const manager = createTooltipManager();
    expect(manager.getConfig().hideDelay).toBe(0);
  });

  it('tooltip element does not set an inline pointer-events override (CSS controls interactivity)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Standard tip' }, manager);
    await showOnHover(el);
    const tipEl = manager.getElement()!;
    expect(tipEl.style.pointerEvents).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Persistent (WCAG 1.4.13)
// The tooltip must not auto-dismiss on a countdown; it stays visible until
// the user explicitly dismisses (Escape, blur, or moves pointer away from
// both trigger and tooltip).
// ---------------------------------------------------------------------------
describe('Tooltip - persistent (WCAG 1.4.13)', () => {
  it('tooltip does not auto-dismiss after a long interval (no countdown timer)', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Persistent tip' }, manager);
    await showOnHover(el);
    expect(manager.isVisible()).toBe(true);

    // Advance 10 seconds -- no auto-dismiss timer should fire
    vi.advanceTimersByTime(10_000);
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(true);
  });

  it('focus-shown tooltip persists until dismissed by blur or Escape', async () => {
    const manager = createEnabledManager();
    const el = createTrigger();
    ArvoTooltip.initialize(el, { content: 'Persistent focus tip' }, manager);
    await showOnFocus(el);
    expect(manager.isVisible()).toBe(true);

    vi.advanceTimersByTime(5_000);
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------
describe('Tooltip - accessibility (axe-core)', () => {
  it('visible tooltip with role="tooltip" + aria-describedby passes axe (region disabled)', async () => {
    // Switch to real timers so axe can resolve its internal promises
    vi.useRealTimers();
    const manager = createEnabledManager();
    // Give the trigger button an accessible name so the button-name rule passes
    const el = document.createElement('button');
    el.textContent = 'Save';
    document.body.appendChild(el);
    ArvoTooltip.initialize(el, { content: 'Accessible tooltip text' }, manager);

    // Focus trigger -- delay is 0ms so tooltip shows synchronously
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(manager.isVisible()).toBe(true);
    expect(el.getAttribute('aria-describedby')).not.toBeNull();
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
