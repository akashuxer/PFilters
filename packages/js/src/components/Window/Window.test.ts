// @vitest-environment jsdom
//
// ArvoWindow (JS) -- OverlaySurface engine in modal mode + createDragHandle.
//
// Two-path dismissal split (CRITICAL, mirrors AlertDialog):
//   Programmatic paths (close(reason), close-button click, primary/secondary click,
//   back, imperative close): onClose({reason}) veto WORKS; win:close dispatched.
//
//   Engine-driven paths (Escape via own keydown listener, backdrop via mask):
//     - onClose is NOT called
//     - win:close is NOT dispatched
//     - window STILL closes (isOpen() returns false)
//
// Covered:
//   initialization, structure, sizes, header parts, header actions,
//   footer actions, programmatic close veto, maximize/restore, empty state,
//   hasBackdrop:false, loading/disabled (gated), getters/setters, custom events,
//   destroy, axe-core.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoWindow } from './Window';
import type { ArvoWindowOptions } from './Window';
// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;

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
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWindow(opts: Partial<ArvoWindowOptions> = {}) {
  return ArvoWindow.initialize({ title: 'Test Window', ...opts });
}

function getRoot(): HTMLElement | null {
  return document.querySelector('.arvo-win');
}
function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-win__panel');
}
function getCloseBtn(): HTMLElement | null {
  return document.querySelector('.arvo-win__close-btn button');
}
function getBackBtn(): HTMLElement | null {
  return document.querySelector('.arvo-win__back-btn button');
}
function getMaxBtn(): HTMLElement | null {
  return document.querySelector('.arvo-win__max-btn button');
}
function getActions(): HTMLElement | null {
  return document.querySelector('.arvo-win__actions');
}
function getPrimaryBtn(): HTMLElement | null {
  return (
    getActions()?.querySelector(
      '.arvo-btn--primary, .arvo-btn--danger-primary',
    ) ?? null
  );
}
function getMask(): HTMLElement | null {
  return document.querySelector('.arvo-win__overlay-mask');
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoWindow -- initialization', () => {
  it('initialize() returns an instance without mounting it', () => {
    const win = createWindow();
    expect(win).toBeInstanceOf(ArvoWindow);
    expect(getRoot()).toBeNull();
  });

  it('open() mounts the window to the body', () => {
    const win = createWindow();
    win.open();
    expect(getRoot()).not.toBeNull();
    expect(getPanel()).not.toBeNull();
    win.destroy();
  });

  it('open() is idempotent', () => {
    const win = createWindow();
    win.open();
    win.open();
    expect(document.querySelectorAll('.arvo-win')).toHaveLength(1);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Structure & ARIA
// ---------------------------------------------------------------------------

describe('ArvoWindow -- structure', () => {
  it('root has the arvo-win and open classes', () => {
    const win = createWindow();
    win.open();
    expect(getRoot()!.classList.contains('arvo-win')).toBe(true);
    expect(getRoot()!.classList.contains('open')).toBe(true);
    win.destroy();
  });

  it('panel has role="dialog" and aria-modal="true" by default', () => {
    const win = createWindow();
    win.open();
    expect(getPanel()!.getAttribute('role')).toBe('dialog');
    expect(getPanel()!.getAttribute('aria-modal')).toBe('true');
    win.destroy();
  });

  it('aria-modal="false" when hasBackdrop=false', () => {
    const win = createWindow({ hasBackdrop: false });
    win.open();
    expect(getPanel()!.getAttribute('aria-modal')).toBe('false');
    win.destroy();
  });

  it('panel has aria-labelledby referencing the title', () => {
    const win = createWindow({ title: 'Hello' });
    win.open();
    const labelledBy = getPanel()!.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe('Hello');
    win.destroy();
  });

  it('uses aria-label when no visible title', () => {
    const win = createWindow({
      hasTitle: false,
      title: undefined,
      ariaLabel: 'Window for editing',
    });
    win.open();
    expect(getPanel()!.getAttribute('aria-label')).toBe('Window for editing');
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

describe('ArvoWindow -- sizes', () => {
  it('default size is md', () => {
    const win = createWindow();
    win.open();
    expect(getRoot()!.classList.contains('arvo-win--md')).toBe(true);
    win.destroy();
  });

  (['sm', 'md', 'lg', 'xl'] as const).forEach((size) => {
    it(`applies arvo-win--${size} when size="${size}"`, () => {
      const win = createWindow({ size });
      win.open();
      expect(getRoot()!.classList.contains(`arvo-win--${size}`)).toBe(true);
      win.destroy();
    });
  });

  it('setSize() updates the modifier class', () => {
    const win = createWindow({ size: 'sm' });
    win.open();
    win.setSize('lg');
    expect(getRoot()!.classList.contains('arvo-win--lg')).toBe(true);
    expect(getRoot()!.classList.contains('arvo-win--sm')).toBe(false);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Header parts
// ---------------------------------------------------------------------------

describe('ArvoWindow -- header parts', () => {
  it('renders the close button by default', () => {
    const win = createWindow();
    win.open();
    expect(getCloseBtn()).not.toBeNull();
    win.destroy();
  });

  it('does NOT render a header when hasHeader=false', () => {
    const win = createWindow({ hasHeader: false, ariaLabel: 'No header' });
    win.open();
    expect(document.querySelector('.arvo-win__header')).toBeNull();
    win.destroy();
  });

  it('renders the back button when hasBackBtn=true', () => {
    const win = createWindow({ hasBackBtn: true });
    win.open();
    expect(getBackBtn()).not.toBeNull();
    win.destroy();
  });

  it('renders the maximize button when hasMaximize=true', () => {
    const win = createWindow({ hasMaximize: true });
    win.open();
    expect(getMaxBtn()).not.toBeNull();
    win.destroy();
  });

  it('renders the leading icon when hasIcon=true', () => {
    const win = createWindow({ hasIcon: true, icon: 'desktop' });
    win.open();
    const ico = document.querySelector('.arvo-win__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-desktop')).toBe(true);
    win.destroy();
  });

  it('renders the status indicator when hasStatusIndicator=true', () => {
    const win = createWindow({ hasStatusIndicator: true });
    win.open();
    expect(document.querySelector('.arvo-win__status')).not.toBeNull();
    win.destroy();
  });

  it('renders the badge when a badge config is passed', () => {
    const win = createWindow({ badge: { message: 'Beta' } });
    win.open();
    expect(document.querySelector('.arvo-win__badge')).not.toBeNull();
    win.destroy();
  });

  it('back button click invokes onBack and dispatches win:back', () => {
    const onBack = vi.fn();
    const onBackEvent = vi.fn();
    const win = createWindow({ hasBackBtn: true, onBack });
    win.open();
    getPanel()!.addEventListener('win:back', onBackEvent);
    getBackBtn()!.click();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onBackEvent).toHaveBeenCalledTimes(1);
    win.destroy();
  });

  it('close button click triggers onClose with reason="close-button"', () => {
    const onClose = vi.fn();
    const win = createWindow({ onClose });
    win.open();
    getCloseBtn()!.click();
    expect(onClose).toHaveBeenCalledWith({ reason: 'close-button' });
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Header actions
// ---------------------------------------------------------------------------

describe('ArvoWindow -- header actions', () => {
  it('renders icon-button header action', () => {
    const win = createWindow({
      headerActions: [
        { type: 'icon-button', icon: 'settings', tooltip: 'Settings' },
      ],
    });
    win.open();
    const actionsGroup = document.querySelector('.arvo-win__header-actions');
    expect(actionsGroup).not.toBeNull();
    expect(actionsGroup!.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
    win.destroy();
  });

  it('clamps to 3 consumer-provided header actions', () => {
    const actions = Array.from({ length: 5 }, (_, i) => ({
      type: 'icon-button' as const,
      icon: 'settings',
      tooltip: `S${i}`,
      id: `s${i}`,
    }));
    const win = createWindow({ headerActions: actions });
    win.open();
    const actionsGroup = document.querySelector('.arvo-win__header-actions');
    expect(actionsGroup!.querySelectorAll('button')).toHaveLength(4);
    win.destroy();
  });

  it('renders switch header action', () => {
    const win = createWindow({
      headerActions: [{ type: 'switch', defaultChecked: true }],
    });
    win.open();
    expect(document.querySelector('.arvo-sw')).not.toBeNull();
    win.destroy();
  });

  it('setHeaderActions() replaces consumer-provided actions', () => {
    const win = createWindow({
      headerActions: [{ type: 'icon-button', icon: 'one', tooltip: 'One' }],
    });
    win.open();
    expect(
      document.querySelectorAll('.arvo-win__header-actions > span').length,
    ).toBeGreaterThanOrEqual(2);
    win.setHeaderActions([
      { type: 'icon-button', icon: 'two', tooltip: 'Two' },
      { type: 'icon-button', icon: 'three', tooltip: 'Three' },
    ]);
    // The close button wrapper is always present; the consumer count should be 2.
    const wrappers = document.querySelectorAll(
      '.arvo-win__header-actions > span:not(.arvo-win__close-btn):not(.arvo-win__max-btn)',
    );
    expect(wrappers.length).toBe(2);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Footer actions
// ---------------------------------------------------------------------------

describe('ArvoWindow -- footer actions', () => {
  it('renders primary footer action', () => {
    const win = createWindow({ primaryAction: { label: 'Save' } });
    win.open();
    expect(getPrimaryBtn()).not.toBeNull();
    expect(getPrimaryBtn()!.textContent).toContain('Save');
    win.destroy();
  });

  it('uses danger-primary variant when semantic="danger-primary"', () => {
    const win = createWindow({
      primaryAction: { label: 'Delete', semantic: 'danger-primary' },
    });
    win.open();
    const btn = getPrimaryBtn();
    expect(btn).not.toBeNull();
    expect(btn!.classList.contains('arvo-btn--danger-primary')).toBe(true);
    win.destroy();
  });

  it('primary click triggers onClose with reason="primary" and dispatches win:action', () => {
    const onClose = vi.fn();
    const win = createWindow({ primaryAction: { label: 'Save' }, onClose });
    win.open();
    const onAction = vi.fn();
    getPanel()!.addEventListener('win:action', onAction);
    getPrimaryBtn()!.click();
    expect(onClose).toHaveBeenCalledWith({ reason: 'primary' });
    expect(onAction).toHaveBeenCalled();
    win.destroy();
  });

  it('returning false from onClick vetoes the close', () => {
    const onClick = vi.fn().mockReturnValue(false);
    const onClose = vi.fn();
    const win = createWindow({
      primaryAction: { label: 'Save', onClick },
      onClose,
    });
    win.open();
    getPrimaryBtn()!.click();
    expect(onClick).toHaveBeenCalled();
    expect(win.isOpen()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    win.destroy();
  });

  it('clamps secondaryActions to 2', () => {
    const win = createWindow({
      secondaryActions: [
        { label: 'a' },
        { label: 'b' },
        { label: 'c' },
        { label: 'd' },
      ],
    });
    win.open();
    expect(getActions()!.querySelectorAll('.arvo-btn--secondary')).toHaveLength(2);
    win.destroy();
  });

  it('renders footer-left content when provided', () => {
    const win = createWindow({ footerLeft: '<span data-testid="left">x</span>' });
    win.open();
    expect(document.querySelector('[data-testid="left"]')).not.toBeNull();
    win.destroy();
  });

  // Footer buttons must be direct children of __actions, not wrapped in a
  // `<span>` host: the shared `overlay-footer-actions-layout` SCSS mixin's
  // `> *:not(...)` selector needs to match the real button directly for
  // the 112px equal-share basis and icon-only exemption to apply. React
  // Window has no wrapper, so JS must match.
  it('renders footer buttons as direct children of __actions (no wrapper)', () => {
    const win = createWindow({
      primaryAction: { label: 'Save' },
      secondaryActions: [{ label: 'Cancel' }, { label: 'Discard' }],
    });
    win.open();
    const actions = getActions();
    expect(actions).not.toBeNull();
    const directChildren = Array.from(actions!.children);
    expect(directChildren.length).toBe(3);
    for (const child of directChildren) {
      expect(
        child.classList.contains('arvo-btn') ||
          child.classList.contains('arvo-dd-btn') ||
          child.classList.contains('arvo-split-btn'),
      ).toBe(true);
    }
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Maximize / Restore
// ---------------------------------------------------------------------------

describe('ArvoWindow -- maximize/restore', () => {
  it('maximize() flips state and dispatches win:maximize', () => {
    const onMax = vi.fn();
    const win = createWindow({
      hasMaximize: true,
      onMaximizeChange: onMax,
    });
    win.open();
    const onMaxEvent = vi.fn();
    getPanel()!.addEventListener('win:maximize', onMaxEvent);
    win.maximized(true);
    expect(win.maximized()).toBe(true);
    expect(getRoot()!.classList.contains('arvo-win--maximized')).toBe(true);
    expect(onMax).toHaveBeenCalledWith(true);
    expect(onMaxEvent).toHaveBeenCalled();
    win.destroy();
  });

  it('un-maximize fires win:restore and removes --maximized', () => {
    const win = createWindow({ hasMaximize: true, isMaximized: true });
    win.open();
    const onRestore = vi.fn();
    getPanel()!.addEventListener('win:restore', onRestore);
    win.maximized(false);
    expect(win.maximized()).toBe(false);
    expect(getRoot()!.classList.contains('arvo-win--maximized')).toBe(false);
    expect(onRestore).toHaveBeenCalled();
    win.destroy();
  });

  it('maximize button click toggles state', () => {
    const win = createWindow({ hasMaximize: true });
    win.open();
    getMaxBtn()!.click();
    expect(win.maximized()).toBe(true);
    getMaxBtn()!.click();
    expect(win.maximized()).toBe(false);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('ArvoWindow -- empty state', () => {
  it('renders ArvoEmptyState in body when isEmptyState=true', () => {
    const win = createWindow({
      isEmptyState: true,
      emptyContent: { title: 'No data' },
    });
    win.open();
    expect(document.querySelector('.arvo-empty')).not.toBeNull();
    win.destroy();
  });

  it('uses sm empty-state size when not maximized', () => {
    const win = createWindow({
      isEmptyState: true,
      emptyContent: { title: 'No data' },
    });
    win.open();
    expect(document.querySelector('.arvo-empty--sm')).not.toBeNull();
    win.destroy();
  });

  it('uses lg empty-state size when maximized', () => {
    const win = createWindow({
      isEmptyState: true,
      isMaximized: true,
      emptyContent: { title: 'No data' },
    });
    win.open();
    expect(document.querySelector('.arvo-empty--lg')).not.toBeNull();
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Backdrop / Mask
// ---------------------------------------------------------------------------

describe('ArvoWindow -- backdrop', () => {
  it('renders the mask when hasBackdrop=true (default)', () => {
    const win = createWindow();
    win.open();
    expect(getMask()).not.toBeNull();
    win.destroy();
  });

  it('does NOT render the mask when hasBackdrop=false', () => {
    const win = createWindow({ hasBackdrop: false });
    win.open();
    expect(getMask()).toBeNull();
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Loading / Disabled (gated)
// ---------------------------------------------------------------------------

describe('ArvoWindow -- loading & disabled', () => {
  it('applies aria-busy when isLoading=true', () => {
    const win = createWindow({ isLoading: true });
    win.open();
    expect(getPanel()!.getAttribute('aria-busy')).toBe('true');
    win.destroy();
  });

  it('disables interactive header controls when isDisabled=true', () => {
    const win = createWindow({
      isDisabled: true,
      hasBackBtn: true,
      hasMaximize: true,
    });
    win.open();
    // Each composed IconButton sets aria-disabled when isDisabled is passed.
    expect(
      (getCloseBtn() as HTMLButtonElement).disabled ||
        getCloseBtn()!.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Dismissal-policy split (picker-silent)
// ---------------------------------------------------------------------------

describe('ArvoWindow -- dismissal policy', () => {
  it('programmatic close() invokes onClose AND dispatches win:close', () => {
    const onClose = vi.fn();
    const win = createWindow({ onClose });
    win.open();
    const onCloseEvt = vi.fn();
    getPanel()!.addEventListener('win:close', onCloseEvt);
    win.close('programmatic');
    expect(onClose).toHaveBeenCalledWith({ reason: 'programmatic' });
    expect(onCloseEvt).toHaveBeenCalled();
    expect(win.isOpen()).toBe(false);
  });

  it('onClose returning false vetoes the programmatic close', () => {
    const onClose = vi.fn().mockReturnValue(false);
    const win = createWindow({ onClose });
    win.open();
    win.close('programmatic');
    expect(win.isOpen()).toBe(true);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoWindow -- custom events', () => {
  it('open() dispatches win:open', () => {
    const win = createWindow();
    const onOpen = vi.fn();
    document.body.addEventListener('win:open', onOpen);
    win.open();
    expect(onOpen).toHaveBeenCalled();
    document.body.removeEventListener('win:open', onOpen);
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// Getters / setters
// ---------------------------------------------------------------------------

describe('ArvoWindow -- getters & setters', () => {
  it('title() returns current title and accepts updates', () => {
    const win = createWindow({ title: 'Original' });
    win.open();
    expect(win.title()).toBe('Original');
    win.title('Updated');
    expect(win.title()).toBe('Updated');
    expect(document.querySelector('.arvo-win__title')!.textContent).toBe(
      'Updated',
    );
    win.destroy();
  });

  it('renderBody() replaces the body content', () => {
    const win = createWindow({ content: '<p>old</p>' });
    win.open();
    expect(document.querySelector('.arvo-win__body')!.textContent).toContain(
      'old',
    );
    win.renderBody('<p>new</p>');
    expect(document.querySelector('.arvo-win__body')!.textContent).toContain(
      'new',
    );
    win.destroy();
  });

  it('resetPosition() resets drag offsets to 0', () => {
    const win = createWindow();
    win.open();
    const panel = getPanel()!;
    panel.style.setProperty('--arvo-win-x', '120px');
    panel.style.setProperty('--arvo-win-y', '60px');
    win.resetPosition();
    expect(panel.style.getPropertyValue('--arvo-win-x')).toBe('0px');
    expect(panel.style.getPropertyValue('--arvo-win-y')).toBe('0px');
    win.destroy();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoWindow -- destroy', () => {
  it('removes the root from the DOM and unregisters listeners', () => {
    const win = createWindow();
    win.open();
    expect(getRoot()).not.toBeNull();
    win.destroy();
    expect(getRoot()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------

describe('ArvoWindow -- accessibility', () => {
  it('passes axe-core checks on the default open window', async () => {
    const win = createWindow({
      primaryAction: { label: 'Save' },
      secondaryActions: [{ label: 'Cancel' }],
    });
    win.open();
    const results = await axe.run(getPanel()!);
    expect(results.violations).toEqual([]);
    win.destroy();
  });
});
