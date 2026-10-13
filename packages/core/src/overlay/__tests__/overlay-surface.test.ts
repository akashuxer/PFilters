// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOverlaySurface } from '../overlay-surface';
import { createOverlayHub } from '../overlay-hub';
import type { OverlayHub } from '../overlay-hub';

// ---------------------------------------------------------------------------
// Polyfills / mocks (jsdom lacks ResizeObserver; transitions need matchMedia)
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe(): void {
    /* noop */
  }
  unobserve(): void {
    /* noop */
  }
  disconnect(): void {
    /* noop */
  }
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  // Reduced motion -> transitions resolve synchronously (no transitionend wait).
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSurface(id = 'surf'): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  const inner = document.createElement('button');
  inner.textContent = 'focusable';
  el.appendChild(inner);
  return el;
}

function makeTrigger(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = 'trigger';
  document.body.appendChild(btn);
  return btn;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createOverlaySurface', () => {
  let hub: OverlayHub;
  const cleanup: Array<() => void> = [];

  beforeEach(() => {
    hub = createOverlayHub();
  });

  afterEach(() => {
    hub.closeAll();
    for (const fn of cleanup.splice(0)) fn();
    document.body.innerHTML = '';
  });

  it('wires trigger ARIA on creation', () => {
    const trigger = makeTrigger();
    const surface = makeSurface();
    const s = createOverlaySurface({
      hub,
      surface,
      type: 'dropdown',
      trigger,
      triggerAria: { haspopup: 'listbox' },
    });
    cleanup.push(() => s.destroy());

    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-controls')).toBe('surf');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('registers with the hub and reflects aria-expanded on open/close', async () => {
    const trigger = makeTrigger();
    const surface = makeSurface();
    document.body.appendChild(surface);
    const s = createOverlaySurface({
      hub,
      id: 'drop',
      surface,
      type: 'dropdown',
      priority: 20,
      trigger,
      position: false,
      transition: null,
      triggerAria: { haspopup: 'listbox' },
    });
    cleanup.push(() => s.destroy());

    await s.open();
    expect(s.isOpen()).toBe(true);
    expect(hub.isOpen('drop')).toBe(true);
    expect(surface.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await s.close();
    expect(s.isOpen()).toBe(false);
    expect(hub.isOpen('drop')).toBe(false);
    expect(surface.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('is idempotent on repeated open/close', async () => {
    const surface = makeSurface();
    document.body.appendChild(surface);
    const s = createOverlaySurface({
      hub,
      id: 'idem',
      surface,
      type: 'popover',
      position: false,
      transition: null,
    });
    cleanup.push(() => s.destroy());

    await s.open();
    await s.open();
    expect(hub.getActive().filter((e) => e.id === 'idem')).toHaveLength(1);
    await s.close();
    await s.close();
    expect(hub.isOpen('idem')).toBe(false);
  });

  it('activates a focus trap when focus.mode is trap', async () => {
    const trigger = makeTrigger();
    const surface = makeSurface();
    document.body.appendChild(surface);
    const inner = surface.querySelector('button') as HTMLButtonElement;
    const s = createOverlaySurface({
      hub,
      id: 'modal',
      surface,
      type: 'modal',
      trigger,
      position: false,
      transition: null,
      focus: { mode: 'trap', initialFocus: 'first' },
    });
    cleanup.push(() => s.destroy());

    await s.open();
    expect(document.activeElement).toBe(inner);
    await s.close();
  });

  it('does not move focus when focus.mode is none (activedescendant model)', async () => {
    const trigger = makeTrigger();
    trigger.focus();
    const surface = makeSurface();
    document.body.appendChild(surface);
    const s = createOverlaySurface({
      hub,
      id: 'list',
      surface,
      type: 'dropdown',
      trigger,
      position: false,
      transition: null,
      focus: { mode: 'none' },
    });
    cleanup.push(() => s.destroy());

    await s.open();
    expect(document.activeElement).toBe(trigger);
    await s.close();
  });

  it('closes when the hub dismisses the entry (outside click / escape)', async () => {
    const onClose = vi.fn();
    const surface = makeSurface();
    document.body.appendChild(surface);
    const s = createOverlaySurface({
      hub,
      id: 'dismiss',
      surface,
      type: 'dropdown',
      position: false,
      transition: null,
      onClose,
    });
    cleanup.push(() => s.destroy());

    await s.open();
    // Simulate the hub closing the entry (as the global outside-click does).
    hub.close('dismiss');
    expect(s.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('paints a mask and removes it on close', async () => {
    const surface = makeSurface();
    document.body.appendChild(surface);
    const s = createOverlaySurface({
      hub,
      id: 'masked',
      surface,
      type: 'modal',
      position: false,
      transition: null,
      mask: true,
    });
    cleanup.push(() => s.destroy());

    await s.open();
    expect(document.querySelector('.arvo-overlay__mask')).not.toBeNull();
    await s.close();
    // Mask hide is animated=true by default -> detaches after a delay; assert
    // it is at least no longer marked visible.
    const mask = document.querySelector('.arvo-overlay__mask');
    if (mask) {
      expect(mask.classList.contains('arvo-overlay__mask--visible')).toBe(false);
    }
  });

  it('returns focus to the trigger on close for non-trap surfaces', async () => {
    const trigger = makeTrigger();
    const surface = makeSurface();
    document.body.appendChild(surface);
    const s = createOverlaySurface({
      hub,
      id: 'ret',
      surface,
      type: 'dropdown',
      trigger,
      position: false,
      transition: null,
      focus: { mode: 'none', returnFocus: true },
    });
    cleanup.push(() => s.destroy());

    await s.open();
    await s.close();
    expect(document.activeElement).toBe(trigger);
  });

  it('mounts and unmounts the surface when mount is configured', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const surface = makeSurface();
    const s = createOverlaySurface({
      hub,
      id: 'mounted',
      surface,
      type: 'dropdown',
      position: false,
      transition: null,
      mount: { target: host, removeOnClose: true },
    });
    cleanup.push(() => s.destroy());

    await s.open();
    expect(host.contains(surface)).toBe(true);
    await s.close();
    expect(host.contains(surface)).toBe(false);
  });

  it('pre-paints --arvo-overlay-width before the first computePosition call', async () => {
    // Regression: OptionList SCSS uses `var(--arvo-overlay-width, 100%)`,
    // so on first open the panel was being measured at viewport width
    // (causing the horizontal clamp to push x to the boundary edge) BEFORE
    // `defaultApplyPosition` could set the var. The engine must seed the
    // var from the resolved width option before the first measurement.
    const trigger = makeTrigger();
    Object.defineProperty(trigger, 'getBoundingClientRect', {
      value: () => ({
        x: 100,
        y: 100,
        left: 100,
        top: 100,
        right: 300,
        bottom: 132,
        width: 200,
        height: 32,
        toJSON: () => ({}),
      }),
    });

    const surface = document.createElement('div');
    surface.id = 'pre-paint';
    document.body.appendChild(surface);

    // Spy on the SUFRACE element's style write so we can assert ordering.
    const setProperty = surface.style.setProperty.bind(surface.style);
    const calls: Array<{ prop: string; value: string }> = [];
    surface.style.setProperty = ((prop: string, value: string | null) => {
      if (value != null) calls.push({ prop, value });
      return setProperty(prop, value ?? '');
    }) as typeof surface.style.setProperty;

    const s = createOverlaySurface({
      hub,
      id: 'pre-paint',
      surface,
      type: 'dropdown',
      trigger,
      position: { width: 'anchor' },
      transition: null,
    });
    cleanup.push(() => s.destroy());

    await s.open();

    const widthCalls = calls.filter((c) => c.prop === '--arvo-overlay-width');
    expect(widthCalls.length).toBeGreaterThanOrEqual(1);
    // First write must be the anchor width (200px), not a post-compute
    // fallback. This guarantees the panel is sized BEFORE compute runs.
    expect(widthCalls[0].value).toBe('200px');

    await s.close();
  });

  it('does not snap focus back to closed trigger when a sibling overlay took focus', async () => {
    // Regression: opening dropdown A then clicking dropdown B (B opens, hub
    // closes A via stacking rules) must not steal focus back to A's trigger.
    // The close() belt-and-braces `_trigger.focus()` must only fire when
    // focus has been LOST or is still inside the closing surface, never
    // when a sibling already holds it.
    const triggerA = makeTrigger();
    triggerA.id = 'trigger-a';
    const triggerB = makeTrigger();
    triggerB.id = 'trigger-b';

    const surfaceA = document.createElement('div');
    surfaceA.id = 'surf-a';
    const innerA = document.createElement('button');
    innerA.textContent = 'A item';
    surfaceA.appendChild(innerA);
    document.body.appendChild(surfaceA);

    const surfaceB = document.createElement('div');
    surfaceB.id = 'surf-b';
    const innerB = document.createElement('button');
    innerB.textContent = 'B item';
    surfaceB.appendChild(innerB);
    document.body.appendChild(surfaceB);

    const a = createOverlaySurface({
      hub,
      id: 'a',
      surface: surfaceA,
      type: 'action-menu',
      trigger: triggerA,
      position: false,
      transition: null,
      focus: { mode: 'trap', initialFocus: 'first' },
    });
    const b = createOverlaySurface({
      hub,
      id: 'b',
      surface: surfaceB,
      type: 'action-menu',
      trigger: triggerB,
      position: false,
      transition: null,
      focus: { mode: 'trap', initialFocus: 'first' },
    });
    cleanup.push(() => {
      a.destroy();
      b.destroy();
    });

    await a.open();
    // A's trap focused its first item.
    expect(document.activeElement).toBe(innerA);

    // Opening B triggers stacking-rule close on A. After both have
    // settled, focus must be inside B (B's first item), NOT on A's
    // trigger.
    await b.open();
    // Simulate what `_focusInitial`-style onOpen callbacks do: move
    // focus to a panel item after activate (mirrors ActionMenu's
    // `initialFocus: 'none'` + `_handleSurfaceOpened` -> `_focusInitial`
    // pattern).
    innerB.focus();
    // Let any awaited exit transition microtasks flush.
    await new Promise((r) => setTimeout(r, 0));

    expect(document.activeElement).toBe(innerB);
    expect(document.activeElement).not.toBe(triggerA);
    expect(a.isOpen()).toBe(false);
    expect(b.isOpen()).toBe(true);
  });

  it('removes trigger ARIA on destroy', () => {
    const trigger = makeTrigger();
    const surface = makeSurface();
    const s = createOverlaySurface({
      hub,
      surface,
      type: 'dropdown',
      trigger,
      triggerAria: { haspopup: 'listbox' },
    });
    s.destroy();
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
  });
});
