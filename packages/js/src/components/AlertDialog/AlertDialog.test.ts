// @vitest-environment jsdom
//
// ArvoAlertDialog (JS) -- OverlaySurface engine migration (modal mode).
//
// The dialog routes its lifecycle through `createOverlaySurface` from @arvo/core.
// Engine helpers (overlayHub, enter/exit, createFocusTrap) run real against jsdom;
// ResizeObserver + matchMedia polyfills make transitions resolve synchronously.
//
// Two-path dismissal split (CRITICAL):
//   Programmatic paths (close(reason), primary/secondary/close-button click):
//     - onClose({reason}) veto WORKS (returns false prevents close)
//     - alert-dlg:close event IS dispatched with correct reason payload
//
//   Engine-driven paths (Escape via own keydown listener, backdrop via mask):
//     - onClose callback is NOT called
//     - alert-dlg:close event is NOT dispatched
//     - dialog STILL closes (isOpen() returns false)
//
// Covered:
//   initialization  open state & structure  variants  open/close/toggle
//   dismissal-policy split (CRITICAL)  onClose veto  alert-dlg:action event
//   alert-dlg:close  alert-dlg:open  confirm input  dontShowAgain
//   loading state  disabled state  hasBackdrop:false  content prop
//   getters/setters (title, message, setVariant, setActions, setLoading)
//   destroy  inner component composition  axe-core

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoAlertDialog } from './AlertDialog';
import type { ArvoAlertDialogOptions } from './AlertDialog';
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

  // matches:true => engine's enter/exit transitions resolve synchronously.
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

function createDialog(opts: Partial<ArvoAlertDialogOptions> = {}) {
  return ArvoAlertDialog.initialize({ title: 'Test Title', ...opts });
}

function getRoot(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg');
}
function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__panel');
}
function getBackdrop(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__overlay-mask');
}
function getTitle(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__title');
}
function getMsg(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__msg');
}
function getCloseBtn(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__close-btn button');
}
function getActions(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__actions');
}
function getPrimaryBtn(): HTMLElement | null {
  return getActions()?.querySelector('.arvo-btn--primary, .arvo-btn--danger') ?? null;
}
function getSecondaryBtn(): HTMLElement | null {
  return getActions()?.querySelector('.arvo-btn--secondary') ?? null;
}
function getDontShowEl(): HTMLElement | null {
  return document.querySelector('.arvo-alert-dlg__dont-show');
}
function getConfirmInput(): HTMLInputElement | null {
  return document.querySelector('.arvo-alert-dlg__confirm-input input');
}

// ===========================================================================
// 1. Initialization
// ===========================================================================

describe('ArvoAlertDialog -- initialization', () => {
  it('static initialize() returns an ArvoAlertDialog instance', () => {
    const dlg = createDialog();
    expect(dlg).toBeInstanceOf(ArvoAlertDialog);
    dlg.destroy();
  });

  it('constructor returns an ArvoAlertDialog instance', () => {
    const dlg = new ArvoAlertDialog({ title: 'Direct' });
    expect(dlg).toBeInstanceOf(ArvoAlertDialog);
    dlg.destroy();
  });

  it('dialog is NOT mounted in DOM before open()', () => {
    const dlg = createDialog();
    expect(document.body.querySelector('.arvo-alert-dlg')).toBeNull();
    dlg.destroy();
  });

  it('isOpen() returns false initially', () => {
    const dlg = createDialog();
    expect(dlg.isOpen()).toBe(false);
    dlg.destroy();
  });
});

// ===========================================================================
// 2. Open state & structure
// ===========================================================================

describe('ArvoAlertDialog -- open state & structure', () => {
  it('open() mounts root to document.body with "open" class', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getRoot()).not.toBeNull();
    expect(getRoot()!.classList.contains('open')).toBe(true);
    dlg.destroy();
  });

  it('isOpen() returns true after open()', () => {
    const dlg = createDialog();
    dlg.open();
    expect(dlg.isOpen()).toBe(true);
    dlg.destroy();
  });

  it('root has class arvo-alert-dlg', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg')).toBe(true);
    dlg.destroy();
  });

  it('panel has role="alertdialog"', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPanel()!.getAttribute('role')).toBe('alertdialog');
    dlg.destroy();
  });

  it('panel has aria-modal="true"', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPanel()!.getAttribute('aria-modal')).toBe('true');
    dlg.destroy();
  });

  it('panel has aria-labelledby referencing the title', () => {
    const dlg = createDialog();
    dlg.open();
    const labelledBy = getPanel()!.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const titleEl = document.getElementById(labelledBy!);
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe('Test Title');
    dlg.destroy();
  });

  it('panel has aria-describedby referencing the body', () => {
    const dlg = createDialog({ message: 'Test msg' });
    dlg.open();
    const describedBy = getPanel()!.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const bodyEl = document.getElementById(describedBy!);
    expect(bodyEl!.classList.contains('arvo-alert-dlg__body')).toBe(true);
    dlg.destroy();
  });

  it('panel has tabIndex=-1', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPanel()!.tabIndex).toBe(-1);
    dlg.destroy();
  });

  it('renders title text', () => {
    const dlg = createDialog({ title: 'My Alert' });
    dlg.open();
    expect(getTitle()!.textContent).toBe('My Alert');
    dlg.destroy();
  });

  it('renders message text', () => {
    const dlg = createDialog({ message: 'Something happened' });
    dlg.open();
    expect(getMsg()!.textContent).toBe('Something happened');
    dlg.destroy();
  });

  it('backdrop has aria-hidden="true"', () => {
    const dlg = createDialog();
    dlg.open();
    const backdrop = getBackdrop();
    expect(backdrop).not.toBeNull();
    expect(backdrop!.getAttribute('aria-hidden')).toBe('true');
    dlg.destroy();
  });

  it('icon has aria-hidden="true" and o9con class', () => {
    const dlg = createDialog();
    dlg.open();
    const ico = document.querySelector('.arvo-alert-dlg__ico');
    expect(ico).not.toBeNull();
    expect(ico!.getAttribute('aria-hidden')).toBe('true');
    expect(ico!.classList.contains('o9con')).toBe(true);
    dlg.destroy();
  });
});

// ===========================================================================
// 3. Variants
// ===========================================================================

describe('ArvoAlertDialog -- variants', () => {
  it('default variant is warning', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--warning')).toBe(true);
    dlg.destroy();
  });

  it('variant="info" adds arvo-alert-dlg--info class', () => {
    const dlg = createDialog({ variant: 'info' });
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--info')).toBe(true);
    dlg.destroy();
  });

  it('variant="positive" adds arvo-alert-dlg--positive class', () => {
    const dlg = createDialog({ variant: 'positive' });
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--positive')).toBe(true);
    dlg.destroy();
  });

  it('variant="negative" adds arvo-alert-dlg--negative class', () => {
    const dlg = createDialog({ variant: 'negative' });
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--negative')).toBe(true);
    dlg.destroy();
  });

  it('variant="block" adds arvo-alert-dlg--block class', () => {
    const dlg = createDialog({ variant: 'block' });
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--block')).toBe(true);
    dlg.destroy();
  });

  it('setVariant("info") updates variant class', () => {
    const dlg = createDialog();
    dlg.open();
    dlg.setVariant('info');
    expect(getRoot()!.classList.contains('arvo-alert-dlg--info')).toBe(true);
    expect(getRoot()!.classList.contains('arvo-alert-dlg--warning')).toBe(false);
    dlg.destroy();
  });

  it('renders without any sm/md/lg size modifier (size is token-driven)', () => {
    const dlg = createDialog();
    dlg.open();
    const root = getRoot()!;
    expect(root.classList.contains('arvo-alert-dlg--sm')).toBe(false);
    expect(root.classList.contains('arvo-alert-dlg--md')).toBe(false);
    expect(root.classList.contains('arvo-alert-dlg--lg')).toBe(false);
    dlg.destroy();
  });
});

// ===========================================================================
// 4. Toggle & open/close lifecycle
// ===========================================================================

describe('ArvoAlertDialog -- toggle & open/close lifecycle', () => {
  it('toggle() opens when closed', () => {
    const dlg = createDialog();
    expect(dlg.isOpen()).toBe(false);
    dlg.toggle();
    expect(dlg.isOpen()).toBe(true);
    dlg.destroy();
  });

  it('toggle() closes when open', () => {
    const dlg = createDialog();
    dlg.open();
    expect(dlg.isOpen()).toBe(true);
    dlg.toggle();
    expect(dlg.isOpen()).toBe(false);
    dlg.destroy();
  });

  it('open() is a no-op when already open', () => {
    const onOpen = vi.fn();
    const dlg = createDialog({ onOpen });
    dlg.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    dlg.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    dlg.destroy();
  });

  it('close() is a no-op when already closed', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ onClose });
    dlg.close();
    expect(onClose).not.toHaveBeenCalled();
    dlg.destroy();
  });

  it('onOpen returning false prevents open()', () => {
    const onOpen = vi.fn(() => false as const);
    const dlg = createDialog({ onOpen });
    dlg.open();
    expect(onOpen).toHaveBeenCalled();
    expect(dlg.isOpen()).toBe(false);
    dlg.destroy();
  });
});

// ===========================================================================
// 5. Dismissal-policy -- PROGRAMMATIC paths (cancellable)
//
// close(reason), primary/secondary/close-button click.
// onClose({reason}) veto WORKS; alert-dlg:close IS dispatched.
// ===========================================================================

describe('ArvoAlertDialog -- dismissal-policy: programmatic paths (cancellable)', () => {
  it('close("primary") dispatches alert-dlg:close with reason="primary"', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    dlg.close('primary');
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.reason).toBe('primary');
    dlg.destroy();
  });

  it('close("secondary") dispatches alert-dlg:close with reason="secondary"', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    dlg.close('secondary');
    expect((handler.mock.calls[0][0] as CustomEvent).detail.reason).toBe('secondary');
    dlg.destroy();
  });

  it('close("close-button") dispatches event with reason="close-button"', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    dlg.close('close-button');
    expect((handler.mock.calls[0][0] as CustomEvent).detail.reason).toBe('close-button');
    dlg.destroy();
  });

  it('close("programmatic") dispatches event with reason="programmatic"', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    dlg.close();
    expect((handler.mock.calls[0][0] as CustomEvent).detail.reason).toBe('programmatic');
    dlg.destroy();
  });

  it('onClose returning false VETOES the close (isOpen stays true)', () => {
    const onClose = vi.fn(() => false as const);
    const dlg = createDialog({ onClose });
    dlg.open();
    dlg.close('primary');
    expect(onClose).toHaveBeenCalledWith({ reason: 'primary' });
    expect(dlg.isOpen()).toBe(true);
    dlg.destroy();
  });

  it('onClose returning false: alert-dlg:close event NOT dispatched on veto', () => {
    const onClose = vi.fn(() => false as const);
    const dlg = createDialog({ onClose });
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    dlg.close('primary');
    expect(handler).not.toHaveBeenCalled();
    dlg.destroy();
  });

  it('primary button click: onClose called with reason="primary"', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ onClose });
    dlg.open();
    getPrimaryBtn()!.click();
    expect(onClose).toHaveBeenCalledWith({ reason: 'primary' });
    dlg.destroy();
  });

  it('secondary button click: onClose called with reason="secondary"', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ onClose });
    dlg.open();
    getSecondaryBtn()!.click();
    expect(onClose).toHaveBeenCalledWith({ reason: 'secondary' });
    dlg.destroy();
  });

  it('close-button click: onClose called with reason="close-button"', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ isClosable: true, onClose });
    dlg.open();
    getCloseBtn()!.click();
    expect(onClose).toHaveBeenCalledWith({ reason: 'close-button' });
    dlg.destroy();
  });
});

// ===========================================================================
// 6. Dismissal-policy -- ENGINE-DRIVEN paths (unconditional / silent)
//
// Escape via own keydown listener; backdrop click via mask pointerdown.
// onClose is NOT called; alert-dlg:close is NOT dispatched; isOpen() -> false.
// ===========================================================================

describe('ArvoAlertDialog -- dismissal-policy: engine-driven paths (silent)', () => {
  it('Escape: onClose is NOT called (engine path is silent)', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ onClose });
    dlg.open();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(onClose).not.toHaveBeenCalled();
    dlg.destroy();
  });

  it('Escape: alert-dlg:close is NOT dispatched', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();
    dlg.destroy();
  });

  it('Escape: dialog CLOSES (isOpen() returns false)', () => {
    const dlg = createDialog();
    dlg.open();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dlg.isOpen()).toBe(false);
    dlg.destroy();
  });

  it('Escape with closeOnEscape=false: dialog does NOT close', () => {
    const dlg = createDialog({ closeOnEscape: false });
    dlg.open();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dlg.isOpen()).toBe(true);
    dlg.destroy();
  });

  it('backdrop click: onClose is NOT called when closeOnBackdrop=true', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ closeOnBackdrop: true, onClose });
    dlg.open();
    const backdrop = getBackdrop();
    expect(backdrop).not.toBeNull();
    backdrop!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    dlg.destroy();
  });

  it('backdrop click: alert-dlg:close is NOT dispatched', () => {
    const dlg = createDialog({ closeOnBackdrop: true });
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:close', handler);
    getBackdrop()!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    dlg.destroy();
  });

  it('backdrop click: dialog CLOSES (isOpen() returns false)', () => {
    const dlg = createDialog({ closeOnBackdrop: true });
    dlg.open();
    getBackdrop()!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dlg.isOpen()).toBe(false);
    dlg.destroy();
  });

  it('backdrop click does NOT close when closeOnBackdrop=false (default)', () => {
    const dlg = createDialog({ closeOnBackdrop: false });
    dlg.open();
    getBackdrop()!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dlg.isOpen()).toBe(true);
    dlg.destroy();
  });
});

// ===========================================================================
// 7. Action buttons
// ===========================================================================

describe('ArvoAlertDialog -- action buttons', () => {
  it('renders primary (OK) and secondary (Cancel) buttons by default', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPrimaryBtn()).not.toBeNull();
    expect(getSecondaryBtn()).not.toBeNull();
    dlg.destroy();
  });

  it('primary has arvo-btn--primary class', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPrimaryBtn()!.classList.contains('arvo-btn--primary')).toBe(true);
    dlg.destroy();
  });

  it('secondary has arvo-btn--secondary class', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getSecondaryBtn()!.classList.contains('arvo-btn--secondary')).toBe(true);
    dlg.destroy();
  });

  it('hasDangerAction: primary has arvo-btn--danger and root has --danger', () => {
    const dlg = createDialog({ hasDangerAction: true });
    dlg.open();
    expect(getPrimaryBtn()!.classList.contains('arvo-btn--danger')).toBe(true);
    expect(getRoot()!.classList.contains('arvo-alert-dlg--danger')).toBe(true);
    dlg.destroy();
  });

  it('hasSecondaryBtn=false hides secondary button', () => {
    const dlg = createDialog({ hasSecondaryBtn: false });
    dlg.open();
    expect(getSecondaryBtn()).toBeNull();
    dlg.destroy();
  });

  it('secondaryAction=null hides secondary button', () => {
    const dlg = createDialog({ secondaryAction: null });
    dlg.open();
    expect(getSecondaryBtn()).toBeNull();
    dlg.destroy();
  });

  it('custom labels render correctly', () => {
    const dlg = createDialog({
      primaryAction: { label: 'Delete' },
      secondaryAction: { label: 'Keep' },
    });
    dlg.open();
    expect(getPrimaryBtn()!.textContent).toContain('Delete');
    expect(getSecondaryBtn()!.textContent).toContain('Keep');
    dlg.destroy();
  });
});

// ===========================================================================
// 8. alert-dlg:action event
// ===========================================================================

describe('ArvoAlertDialog -- alert-dlg:action event', () => {
  it('primary click dispatches alert-dlg:action with action="primary"', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:action', handler);
    getPrimaryBtn()!.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.action).toBe('primary');
    dlg.destroy();
  });

  it('secondary click dispatches alert-dlg:action with action="secondary"', () => {
    const dlg = createDialog();
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:action', handler);
    getSecondaryBtn()!.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.action).toBe('secondary');
    dlg.destroy();
  });

  it('action event includes confirmValue and dontShowAgain in payload', () => {
    const dlg = createDialog({
      confirmInput: { placeholder: 'Type DELETE' },
      dontShowAgain: true,
    });
    dlg.open();
    const handler = vi.fn();
    getPanel()!.addEventListener('alert-dlg:action', handler);

    const input = getConfirmInput();
    if (input) {
      input.value = 'test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    getPrimaryBtn()!.click();
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.action).toBe('primary');
    expect(detail.confirmValue).toBe('test');
    expect(typeof detail.dontShowAgain).toBe('boolean');
    dlg.destroy();
  });
});

// ===========================================================================
// 9. alert-dlg:open event
// ===========================================================================

describe('ArvoAlertDialog -- alert-dlg:open event', () => {
  it('alert-dlg:open fires on open()', () => {
    const dlg = createDialog();
    const handler = vi.fn();
    document.body.addEventListener('alert-dlg:open', handler);
    dlg.open();
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('alert-dlg:open', handler);
    dlg.destroy();
  });
});

// ===========================================================================
// 10. Close button
// ===========================================================================

describe('ArvoAlertDialog -- close button', () => {
  it('NOT rendered by default (isClosable=false)', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getCloseBtn()).toBeNull();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--closable')).toBe(false);
    dlg.destroy();
  });

  it('rendered when isClosable=true', () => {
    const dlg = createDialog({ isClosable: true });
    dlg.open();
    expect(getCloseBtn()).not.toBeNull();
    dlg.destroy();
  });

  it('arvo-alert-dlg--closable class when isClosable=true', () => {
    const dlg = createDialog({ isClosable: true });
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--closable')).toBe(true);
    dlg.destroy();
  });

  it('clicking close button calls onClose with reason="close-button"', () => {
    const onClose = vi.fn();
    const dlg = createDialog({ isClosable: true, onClose });
    dlg.open();
    getCloseBtn()!.click();
    expect(onClose).toHaveBeenCalledWith({ reason: 'close-button' });
    dlg.destroy();
  });
});

// ===========================================================================
// 11. Backdrop
// ===========================================================================

describe('ArvoAlertDialog -- backdrop', () => {
  it('backdrop rendered when hasBackdrop=true (default)', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getBackdrop()).not.toBeNull();
    dlg.destroy();
  });

  it('does NOT emit the removed --with-backdrop modifier (EX-11)', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--with-backdrop')).toBe(false);
    dlg.destroy();
  });

  it('no backdrop when hasBackdrop=false', () => {
    const dlg = createDialog({ hasBackdrop: false });
    dlg.open();
    expect(getBackdrop()).toBeNull();
    expect(getRoot()!.classList.contains('arvo-alert-dlg--with-backdrop')).toBe(false);
    dlg.destroy();
  });

  it('hasBackdrop=false: dialog still renders with aria-modal="true"', () => {
    const dlg = createDialog({ hasBackdrop: false });
    dlg.open();
    expect(getPanel()).not.toBeNull();
    expect(getPanel()!.getAttribute('aria-modal')).toBe('true');
    dlg.destroy();
  });

  it('hasBackdrop=false: Escape still closes the dialog', () => {
    const dlg = createDialog({ hasBackdrop: false });
    dlg.open();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dlg.isOpen()).toBe(false);
    dlg.destroy();
  });
});

// ===========================================================================
// 12. Confirm input
// ===========================================================================

describe('ArvoAlertDialog -- confirm input', () => {
  it('not rendered by default', () => {
    const dlg = createDialog();
    dlg.open();
    expect(document.querySelector('.arvo-alert-dlg__confirm-input')).toBeNull();
    dlg.destroy();
  });

  it('rendered when confirmInput is set', () => {
    const dlg = createDialog({ confirmInput: { placeholder: 'Type DELETE' } });
    dlg.open();
    expect(document.querySelector('.arvo-alert-dlg__confirm-input')).not.toBeNull();
    dlg.destroy();
  });

  it('confirmValue() returns current input value (starts empty)', () => {
    const dlg = createDialog({ confirmInput: {} });
    dlg.open();
    expect(dlg.confirmValue()).toBe('');
    dlg.destroy();
  });

  it('confirmValue() updates after input event', () => {
    const dlg = createDialog({ confirmInput: {} });
    dlg.open();
    const input = getConfirmInput();
    if (input) {
      input.value = 'DEL';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(dlg.confirmValue()).toBe('DEL');
    }
    dlg.destroy();
  });

  it('confirm value resets after close()', () => {
    const dlg = createDialog({ confirmInput: {} });
    dlg.open();
    const input = getConfirmInput();
    if (input) {
      input.value = 'DELETE';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    dlg.close();
    expect(dlg.confirmValue()).toBe('');
    dlg.destroy();
  });

  it('primary disabled when expectedValue is unmet', () => {
    const dlg = createDialog({ confirmInput: { expectedValue: 'DELETE' } });
    dlg.open();
    const primary = getPrimaryBtn()!;
    expect(
      primary.hasAttribute('disabled') || primary.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    dlg.destroy();
  });

  it('onConfirmInputChange fires on input', () => {
    const onConfirmInputChange = vi.fn();
    const dlg = createDialog({ confirmInput: {}, onConfirmInputChange });
    dlg.open();
    const input = getConfirmInput();
    if (input) {
      input.value = 'hello';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(onConfirmInputChange).toHaveBeenCalledWith('hello');
    }
    dlg.destroy();
  });
});

// ===========================================================================
// 13. Don't show again
// ===========================================================================

describe('ArvoAlertDialog -- dontShowAgain', () => {
  it('not rendered by default', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getDontShowEl()).toBeNull();
    dlg.destroy();
  });

  it('rendered when dontShowAgain=true with default label', () => {
    const dlg = createDialog({ dontShowAgain: true });
    dlg.open();
    expect(getDontShowEl()).not.toBeNull();
    expect(getDontShowEl()!.textContent).toContain("Don't show this again");
    dlg.destroy();
  });

  it('rendered with custom label', () => {
    const dlg = createDialog({ dontShowAgain: { label: 'Skip next time' } });
    dlg.open();
    expect(getDontShowEl()!.textContent).toContain('Skip next time');
    dlg.destroy();
  });

  it('dontShowAgainChecked() returns false initially', () => {
    const dlg = createDialog({ dontShowAgain: true });
    expect(dlg.dontShowAgainChecked()).toBe(false);
    dlg.destroy();
  });

  it('dontShowAgainChecked(true) sets the checked state', () => {
    const dlg = createDialog({ dontShowAgain: true });
    dlg.dontShowAgainChecked(true);
    expect(dlg.dontShowAgainChecked()).toBe(true);
    dlg.destroy();
  });

  it('dontShowAgainChecked(false) clears the checked state', () => {
    const dlg = createDialog({ dontShowAgain: { defaultChecked: true } });
    dlg.dontShowAgainChecked(false);
    expect(dlg.dontShowAgainChecked()).toBe(false);
    dlg.destroy();
  });

  it('onDontShowAgainChange fires when checkbox is toggled', () => {
    const onChange = vi.fn();
    const dlg = createDialog({ dontShowAgain: { onChange } });
    dlg.open();
    const cb = getDontShowEl()!.querySelector('input');
    if (cb) {
      cb.click();
      expect(onChange).toHaveBeenCalled();
    }
    dlg.destroy();
  });
});

// ===========================================================================
// 14. Loading state
// ===========================================================================

describe('ArvoAlertDialog -- loading state', () => {
  it('isLoading applies "loading" class to root', () => {
    const dlg = createDialog({ isLoading: true });
    dlg.open();
    expect(getRoot()!.classList.contains('loading')).toBe(true);
    dlg.destroy();
  });

  it('isLoading sets aria-busy="true" on panel', () => {
    const dlg = createDialog({ isLoading: true });
    dlg.open();
    expect(getPanel()!.getAttribute('aria-busy')).toBe('true');
    dlg.destroy();
  });

  it('panel does NOT have aria-busy when not loading', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPanel()!.getAttribute('aria-busy')).toBeNull();
    dlg.destroy();
  });

  it('setLoading(true) toggles loading class and aria-busy', () => {
    const dlg = createDialog();
    dlg.open();
    dlg.setLoading(true);
    expect(getRoot()!.classList.contains('loading')).toBe(true);
    expect(getPanel()!.getAttribute('aria-busy')).toBe('true');
    dlg.destroy();
  });

  it('setLoading(false) removes loading class and aria-busy', () => {
    const dlg = createDialog({ isLoading: true });
    dlg.open();
    dlg.setLoading(false);
    expect(getRoot()!.classList.contains('loading')).toBe(false);
    expect(getPanel()!.getAttribute('aria-busy')).toBeNull();
    dlg.destroy();
  });

  it('dont-show checkbox is disabled during loading', () => {
    const dlg = createDialog({ dontShowAgain: true, isLoading: true });
    dlg.open();
    const dontShowEl = getDontShowEl();
    const cb = dontShowEl!.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    const isDisabled =
      cb?.disabled ||
      cb?.getAttribute('aria-disabled') === 'true' ||
      dontShowEl!.classList.contains('disabled');
    expect(isDisabled).toBe(true);
    dlg.destroy();
  });
});

// ===========================================================================
// 15. Disabled state
// ===========================================================================

describe('ArvoAlertDialog -- disabled state', () => {
  it('isDisabled propagates to action buttons', () => {
    const dlg = createDialog({ isDisabled: true });
    dlg.open();
    const primary = getPrimaryBtn()!;
    const secondary = getSecondaryBtn()!;
    expect(
      primary.hasAttribute('disabled') || primary.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    expect(
      secondary.hasAttribute('disabled') || secondary.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    dlg.destroy();
  });

  it('isDisabled propagates to close button', () => {
    const dlg = createDialog({ isDisabled: true, isClosable: true });
    dlg.open();
    const btn = getCloseBtn()!;
    expect(
      btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    dlg.destroy();
  });
});

// ===========================================================================
// 16. Content prop
// ===========================================================================

describe('ArvoAlertDialog -- content prop', () => {
  it('renderContent() replaces body with HTML string', () => {
    const dlg = createDialog({ message: 'Old message' });
    dlg.open();
    dlg.renderContent('<p class="custom-p">New content</p>');
    expect(document.querySelector('.custom-p')).not.toBeNull();
    expect(getMsg()).toBeNull();
    dlg.destroy();
  });

  it('renderContent() replaces body with HTMLElement', () => {
    const dlg = createDialog({ message: 'Old' });
    dlg.open();
    const el = document.createElement('span');
    el.className = 'injected';
    dlg.renderContent(el);
    expect(document.querySelector('.injected')).not.toBeNull();
    expect(getMsg()).toBeNull();
    dlg.destroy();
  });

  it('renderContent() replaces body with render callback', () => {
    const dlg = createDialog({ message: 'Old' });
    dlg.open();
    dlg.renderContent((container) => {
      const p = document.createElement('p');
      p.className = 'cb-rendered';
      container.appendChild(p);
    });
    expect(document.querySelector('.cb-rendered')).not.toBeNull();
    dlg.destroy();
  });

  it('content option renders custom body on open', () => {
    const dlg = createDialog({ content: '<b class="bold-content">Important</b>' });
    dlg.open();
    expect(document.querySelector('.bold-content')).not.toBeNull();
    expect(getMsg()).toBeNull();
    dlg.destroy();
  });
});

// ===========================================================================
// 17. Getters / setters
// ===========================================================================

describe('ArvoAlertDialog -- getters and setters', () => {
  it('title() returns current title', () => {
    const dlg = createDialog({ title: 'Hello' });
    expect(dlg.title()).toBe('Hello');
    dlg.destroy();
  });

  it('title("New") updates title text in DOM', () => {
    const dlg = createDialog({ title: 'Old' });
    dlg.open();
    dlg.title('New');
    expect(dlg.title()).toBe('New');
    expect(getTitle()!.textContent).toBe('New');
    dlg.destroy();
  });

  it('message() returns current message', () => {
    const dlg = createDialog({ message: 'My msg' });
    expect(dlg.message()).toBe('My msg');
    dlg.destroy();
  });

  it('message("New msg") updates message text in DOM', () => {
    const dlg = createDialog({ message: 'Old' });
    dlg.open();
    dlg.message('New');
    expect(dlg.message()).toBe('New');
    expect(getMsg()!.textContent).toBe('New');
    dlg.destroy();
  });

  it('setActions updates primary button label', () => {
    const dlg = createDialog();
    dlg.open();
    dlg.setActions({ primary: { label: 'Yes' } });
    expect(getPrimaryBtn()!.textContent).toContain('Yes');
    dlg.destroy();
  });

  it('setActions updates secondary button label', () => {
    const dlg = createDialog();
    dlg.open();
    dlg.setActions({ secondary: { label: 'Nope' } });
    expect(getSecondaryBtn()!.textContent).toContain('Nope');
    dlg.destroy();
  });
});

// ===========================================================================
// 18. Destroy
// ===========================================================================

describe('ArvoAlertDialog -- destroy', () => {
  it('destroy() removes root element from DOM when open', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getRoot()).not.toBeNull();
    dlg.destroy();
    expect(getRoot()).toBeNull();
  });

  it('destroy() while closed does not throw', () => {
    const dlg = createDialog();
    expect(() => dlg.destroy()).not.toThrow();
  });

  it('destroy() while open does not throw', () => {
    const dlg = createDialog();
    dlg.open();
    expect(() => dlg.destroy()).not.toThrow();
  });

  it('destroy() twice does not throw', () => {
    const dlg = createDialog();
    dlg.open();
    dlg.destroy();
    expect(() => dlg.destroy()).not.toThrow();
  });

  it('after destroy, open() does not throw', () => {
    const dlg = createDialog();
    dlg.destroy();
    expect(() => dlg.open()).not.toThrow();
  });
});

// ===========================================================================
// 19. Inner component composition
// ===========================================================================

describe('ArvoAlertDialog -- inner component composition', () => {
  it('primary action button renders as ArvoButton (arvo-btn class)', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getPrimaryBtn()!.classList.contains('arvo-btn')).toBe(true);
    dlg.destroy();
  });

  it('secondary action button renders as ArvoButton (arvo-btn class)', () => {
    const dlg = createDialog();
    dlg.open();
    expect(getSecondaryBtn()!.classList.contains('arvo-btn')).toBe(true);
    dlg.destroy();
  });

  it('close button inherits disabled from parent isDisabled', () => {
    const dlg = createDialog({ isClosable: true, isDisabled: true });
    dlg.open();
    const btn = getCloseBtn()!;
    expect(
      btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    dlg.destroy();
  });

  it('close button inherits disabled from parent isLoading', () => {
    const dlg = createDialog({ isClosable: true, isLoading: true });
    dlg.open();
    const btn = getCloseBtn()!;
    expect(
      btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    dlg.destroy();
  });
});

// ===========================================================================
// 20. Accessibility (axe-core)
// ===========================================================================

describe('ArvoAlertDialog -- accessibility (axe-core)', () => {
  it('zero violations when dialog is open', async () => {
    const dlg = createDialog({
      title: 'Confirm deletion',
      message: 'This action cannot be undone.',
      primaryAction: { label: 'Delete' },
      secondaryAction: { label: 'Cancel' },
    });
    dlg.open();
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    dlg.destroy();
  }, 15000);
});
