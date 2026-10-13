// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoDrawer } from './Drawer';
import type { ArvoDrawerOptions } from './Drawer';
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@arvo/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arvo/core')>();
  return {
    ...actual,
    enter: vi.fn().mockResolvedValue(undefined),
    exit: vi.fn().mockResolvedValue(undefined),
    createFocusTrap: () => ({ activate: vi.fn(), deactivate: vi.fn() }),
    lockPageScroll: vi.fn(() => vi.fn()),
  };
});

// PanelShell is intentionally NOT mocked. JS Drawer tests run against the
// real createPanelShell factory in @arvo/js/components/PanelShell so we
// exercise actual Arvo* primitive instantiation (ArvoIconButton, ArvoTabstrip,
// ArvoSearch, ArvoButton, etc.).

Element.prototype.scrollIntoView = vi.fn() as never;
global.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let markerEl: HTMLDivElement;

beforeEach(() => {
  markerEl = document.createElement('div');
  document.body.appendChild(markerEl);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function create(opts: ArvoDrawerOptions = {}): ArvoDrawer {
  return ArvoDrawer.initialize(markerEl, opts);
}

function host(): HTMLElement | null {
  return document.body.querySelector('.arvo-drw');
}
function pane(): HTMLElement | null {
  return document.body.querySelector('.arvo-drw__pane');
}
function backdrop(): HTMLElement | null {
  // Mask elements are built by the shared `@arvo/core/mask` overlay
  // primitive and carry `.arvo-overlay__mask` plus `.arvo-drw__overlay-mask`.
  return document.body.querySelector('.arvo-drw__overlay-mask');
}

function fireBackdropClick(el: HTMLElement | null): void {
  el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
}

// ---------------------------------------------------------------------------
// 1. Initial render / DOM scaffold
// ---------------------------------------------------------------------------

describe('Initial render / DOM scaffold', () => {
  it('mounts the host into the container immediately on construction (defaultOpen false)', () => {
    // The host is always appended to the container in the constructor,
    // regardless of defaultOpen.
    const inst = create();
    expect(host()).not.toBeNull();
    expect(host()!.parentElement).toBe(document.body);
    inst.destroy();
  });

  it('mounts the portaled host into document.body when defaultOpen is true', () => {
    const inst = create({ defaultOpen: true });
    const h = host();
    expect(h).not.toBeNull();
    expect(h!.parentElement).toBe(document.body);
    inst.destroy();
  });

  it('renders __pane as a child of the host', () => {
    const inst = create({ defaultOpen: true });
    const p = pane();
    expect(p).not.toBeNull();
    expect(p!.parentElement).toBe(host());
    inst.destroy();
  });

  it('defaults to right side (arvo-drw--side-right)', () => {
    const inst = create({ defaultOpen: true });
    expect(host()!.classList.contains('arvo-drw--side-right')).toBe(true);
    inst.destroy();
  });

  it('renders __body inside __pane (via panel-shell)', () => {
    const inst = create({ defaultOpen: true });
    expect(pane()!.querySelector('.arvo-drw__body')).not.toBeNull();
    inst.destroy();
  });

  it('renders __hdr __title with the title text', () => {
    const inst = create({ defaultOpen: true, title: 'Filters' });
    const titleEl = document.body.querySelector('.arvo-drw__title');
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe('Filters');
    inst.destroy();
  });

  it('hasMask=true applies the with-mask host modifier', () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    const h = host()!;
    expect(h.classList.contains('arvo-drw--with-mask')).toBe(true);
    inst.destroy();
  });

  it('default render has no mask (hasMask defaults to false)', () => {
    const inst = create({ defaultOpen: true });
    const h = host()!;
    expect(h.classList.contains('arvo-drw--with-mask')).toBe(false);
    expect(backdrop()).toBeNull();
    inst.destroy();
  });

  it('does NOT render a __pin element regardless of options', () => {
    const inst = create({ defaultOpen: true, title: 'T' });
    expect(document.body.querySelector('.arvo-drw__pin')).toBeNull();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 2. Side variants
// ---------------------------------------------------------------------------

describe('Side variants', () => {
  it('side=left adds arvo-drw--side-left', () => {
    const inst = create({ defaultOpen: true, side: 'left' });
    expect(host()!.classList.contains('arvo-drw--side-left')).toBe(true);
    inst.destroy();
  });

  it('side=top falls back to right with a console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Cast bypasses the TS-level rejection since the union no longer
    // includes 'top' / 'bottom'; the runtime fallback path is verified.
    const inst = create({ defaultOpen: true, side: 'top' as 'left' });
    expect(host()!.classList.contains('arvo-drw--side-right')).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    inst.destroy();
  });

  it('side=bottom falls back to right with a console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inst = create({ defaultOpen: true, side: 'bottom' as 'right' });
    expect(host()!.classList.contains('arvo-drw--side-right')).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 3. Backdrop / mask
// ---------------------------------------------------------------------------

describe('Backdrop / mask', () => {
  it('renders the shared overlay-mask scrim when hasMask=true', async () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    // createMask uses a 10ms setTimeout to add `--visible`.
    await new Promise((r) => setTimeout(r, 20));
    const b = backdrop();
    expect(b).not.toBeNull();
    expect(pane()!.contains(b!)).toBe(false);
    expect(b!.parentElement).toBe(document.body);
    expect(b!.classList.contains('arvo-overlay__mask--visible')).toBe(true);
    inst.destroy();
  });

  it('does NOT render the mask when hasMask is false (the default)', () => {
    const inst = create({ defaultOpen: true, hasMask: false });
    expect(backdrop()).toBeNull();
    expect(host()!.classList.contains('arvo-drw--with-mask')).toBe(false);
    inst.destroy();
  });

  it('does NOT render the mask when hasMask is omitted (default)', () => {
    const inst = create({ defaultOpen: true });
    expect(backdrop()).toBeNull();
    expect(host()!.classList.contains('arvo-drw--with-mask')).toBe(false);
    inst.destroy();
  });

  it('aria-modal="true" on __pane when hasMask is truthy', () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    expect(pane()!.getAttribute('aria-modal')).toBe('true');
    inst.destroy();
  });

  it('aria-modal="false" on __pane when hasMask is false', () => {
    const inst = create({ defaultOpen: true, hasMask: false });
    expect(pane()!.getAttribute('aria-modal')).toBe('false');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 4. Mask click closes drawer + fires drw:mask-click
// ---------------------------------------------------------------------------

describe('Mask click', () => {
  it('mask click fires drw:mask-click BEFORE drw:close, and closes', async () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    const events: string[] = [];
    const p = pane()!;
    p.addEventListener('drw:mask-click', () => events.push('mask-click'));
    p.addEventListener('drw:close', (e) => {
      events.push(`close:${(e as CustomEvent).detail.reason}`);
    });

    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    await vi.waitFor(() => {
      expect(events).toContain('close:mask-click');
    });
    expect(events.indexOf('mask-click')).toBeLessThan(
      events.indexOf('close:mask-click'),
    );
    inst.destroy();
  });

  it('mask click does NOT close when closeOnMaskClick is false', async () => {
    const inst = create({ defaultOpen: true, hasMask: true, closeOnMaskClick: false });
    const p = pane()!;
    const closeHandler = vi.fn();
    p.addEventListener('drw:close', closeHandler);

    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    expect(closeHandler).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('mask config { closeOnClick: false } overrides top-level closeOnMaskClick', async () => {
    const inst = create({
      defaultOpen: true,
      closeOnMaskClick: true,
      hasMask: { closeOnClick: false },
    });
    const closeHandler = vi.fn();
    pane()!.addEventListener('drw:close', closeHandler);
    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    expect(closeHandler).not.toHaveBeenCalled();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 5. Escape closes drawer with reason 'escape'
// ---------------------------------------------------------------------------

describe('Escape', () => {
  it('Escape closes the drawer with reason="escape" when closeOnEscape is true (default)', async () => {
    const inst = create({ defaultOpen: true });
    let receivedReason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      receivedReason = (e as CustomEvent).detail.reason;
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(receivedReason).toBe('escape');
    });
    inst.destroy();
  });

  it('Escape is ignored when closeOnEscape is false', async () => {
    const onClose = vi.fn();
    const inst = create({
      defaultOpen: true,
      closeOnEscape: false,
      onClose,
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    // Give microtasks a chance to run.
    await Promise.resolve();
    await Promise.resolve();
    expect(onClose).not.toHaveBeenCalled();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Close button fires drw:close with reason="close-button"
// ---------------------------------------------------------------------------

describe('Close button', () => {
  it('clicking PanelShell __close fires drw:close with reason="close-button"', async () => {
    const inst = create({ defaultOpen: true, title: 'T' });
    let reason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      reason = (e as CustomEvent).detail.reason;
    });

    const closeBtn = document.body.querySelector(
      '.arvo-drw__close',
    ) as HTMLElement | null;
    expect(closeBtn).not.toBeNull();
    closeBtn!.click();
    await vi.waitFor(() => {
      expect(reason).toBe('close-button');
    });
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. onOpen / onClose cancellation
// ---------------------------------------------------------------------------

describe('onOpen / onClose cancellation', () => {
  it('returning false from onOpen cancels the open', async () => {
    const onOpenChange = vi.fn();
    const inst = create({
      title: 'T',
      onOpen: () => false,
      onOpenChange,
    });
    await inst.open();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('returning false from onClose cancels the close', async () => {
    const onOpenChange = vi.fn();
    const inst = create({
      defaultOpen: true,
      title: 'T',
      onClose: () => false,
      onOpenChange,
    });
    onOpenChange.mockClear();
    await inst.close();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(inst.isOpen()).toBe(true);
    inst.destroy();
  });

  it('onClose receives the close reason', async () => {
    const onClose = vi.fn();
    const inst = create({ defaultOpen: true, title: 'T', onClose });
    await inst.close('mask-click');
    expect(onClose).toHaveBeenCalledWith('mask-click');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 8. Container portal target
// ---------------------------------------------------------------------------

describe('Portal container', () => {
  it('honors a custom container element', () => {
    const customContainer = document.createElement('div');
    customContainer.id = 'drawer-anchor';
    document.body.appendChild(customContainer);

    const inst = create({ defaultOpen: true, container: customContainer });
    expect(customContainer.querySelector('.arvo-drw')).not.toBeNull();
    // Body should not have a top-level .arvo-drw outside the container.
    const directBodyChildren = Array.from(document.body.children).filter(
      (c) => c.classList.contains('arvo-drw'),
    );
    expect(directBodyChildren.length).toBe(0);
    inst.destroy();
  });

  it('honors a callable container returning an element', () => {
    const customContainer = document.createElement('div');
    document.body.appendChild(customContainer);
    const inst = create({
      defaultOpen: true,
      container: () => customContainer,
    });
    expect(customContainer.querySelector('.arvo-drw')).not.toBeNull();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 9. PanelShell delegate forwarders
// ---------------------------------------------------------------------------

describe('PanelShell delegate forwarders', () => {
  it('setContent delegates to shell.setContent and renders custom body content', () => {
    const inst = create({ defaultOpen: true });
    const body = document.createElement('div');
    body.className = 'my-body';
    body.textContent = 'Hello';
    inst.setContent(body);
    const content = document.body.querySelector('.arvo-drw__content .my-body');
    expect(content).not.toBeNull();
    expect(content!.textContent).toContain('Hello');
    inst.destroy();
  });

  it('setHeaderActions delegates to shell.setHeaderActions and updates the DOM', () => {
    const inst = create({ defaultOpen: true });
    inst.setHeaderActions([
      { id: 'save', type: 'btn', icon: 'save', label: 'Save' },
    ]);
    const action = document.body.querySelector('[data-action-id="save"]');
    expect(action).not.toBeNull();
    expect(action!.querySelector('.arvo-icon-btn')).not.toBeNull();
    inst.destroy();
  });

  it('setActions delegates to shell.setActions and renders ArvoButtons', () => {
    const inst = create({ defaultOpen: true });
    inst.setActions([
      { id: 'ok', label: 'OK', variant: 'primary' },
    ]);
    const btn = document.body.querySelector(
      '.arvo-drw__footer-actions [data-action-id="ok"]',
    );
    expect(btn).not.toBeNull();
    expect(btn!.classList.contains('arvo-btn')).toBe(true);
    inst.destroy();
  });

  it('updateAction delegates to shell.updateAction and updates the rendered button', () => {
    const inst = create({
      defaultOpen: true,
      actions: [{ id: 'ok', label: 'OK', variant: 'primary' }],
    });
    inst.updateAction('ok', { label: 'Confirm' });
    const btn = document.body.querySelector(
      '.arvo-drw__footer-actions [data-action-id="ok"]',
    );
    expect(btn!.textContent).toContain('Confirm');
    inst.destroy();
  });

  it('setTitle delegates to shell.setTitle and reflects in DOM', () => {
    const inst = create({ defaultOpen: true, title: 'A' });
    inst.setTitle('B');
    expect(document.body.querySelector('.arvo-drw__title')!.textContent).toBe(
      'B',
    );
    inst.destroy();
  });

  it('search() returns shell value', () => {
    const inst = create({ defaultOpen: true });
    expect(inst.search()).toBe('');
    inst.destroy();
  });

  it('focus() forwards to shell.focus', () => {
    const inst = create({
      defaultOpen: true,
      stickyHeader: { search: true },
    });
    const spy = vi.spyOn(inst.shell, 'focus');
    inst.focus('search');
    expect(spy).toHaveBeenCalledWith('search');
    spy.mockRestore();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 10. Disabled / loading state propagation
// ---------------------------------------------------------------------------

describe('Disabled / loading state propagation', () => {
  it('isDisabled adds is-disabled class on host AND aria-disabled on __pane via shell', () => {
    const inst = create({ defaultOpen: true, isDisabled: true });
    const h = host()!;
    expect(h.classList.contains('is-disabled')).toBe(true);
    expect(pane()!.getAttribute('aria-disabled')).toBe('true');
    inst.destroy();
  });

  it('isLoading adds loading class on host AND aria-busy on __pane via shell', () => {
    const inst = create({ defaultOpen: true, isLoading: true });
    const h = host()!;
    expect(h.classList.contains('loading')).toBe(true);
    expect(pane()!.getAttribute('aria-busy')).toBe('true');
    inst.destroy();
  });

  it('disabled(true) toggles state through delegate', () => {
    const inst = create({ defaultOpen: true });
    inst.disabled(true);
    expect(host()!.classList.contains('is-disabled')).toBe(true);
    expect(pane()!.getAttribute('aria-disabled')).toBe('true');
    inst.disabled(false);
    expect(host()!.classList.contains('is-disabled')).toBe(false);
    inst.destroy();
  });

  it('loading(true) toggles state through delegate', () => {
    const inst = create({ defaultOpen: true });
    inst.loading(true);
    expect(host()!.classList.contains('loading')).toBe(true);
    expect(pane()!.getAttribute('aria-busy')).toBe('true');
    inst.loading(false);
    expect(host()!.classList.contains('loading')).toBe(false);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 11. Sizing CSS variables
// ---------------------------------------------------------------------------

describe('Sizing CSS variables', () => {
  it('width=400 sets --arvo-drw-width on host', () => {
    const inst = create({ defaultOpen: true, width: 400 });
    expect(host()!.style.getPropertyValue('--arvo-drw-width')).toBe('400px');
    inst.destroy();
  });

  it('width="50vw" sets --arvo-drw-width on host', () => {
    const inst = create({ defaultOpen: true, width: '50vw' });
    expect(host()!.style.getPropertyValue('--arvo-drw-width')).toBe('50vw');
    inst.destroy();
  });

  it('animationDuration sets --arvo-drw-slide-duration on host', () => {
    const inst = create({ defaultOpen: true, animationDuration: 500 });
    expect(host()!.style.getPropertyValue('--arvo-drw-slide-duration')).toBe(
      '500ms',
    );
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 12. Imperative API: open / close / toggle / isOpen
// ---------------------------------------------------------------------------

describe('Imperative API', () => {
  it('isOpen() reflects controlled state', async () => {
    const inst = create({ title: 'T' });
    expect(inst.isOpen()).toBe(false);
    await inst.open();
    expect(inst.isOpen()).toBe(true);
    await inst.close();
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('toggle flips open state', async () => {
    const inst = create({ title: 'T' });
    inst.toggle();
    await vi.waitFor(() => expect(inst.isOpen()).toBe(true));
    inst.toggle();
    await vi.waitFor(() => expect(inst.isOpen()).toBe(false));
    inst.destroy();
  });

  it('close(reason) propagates the reason through drw:close', async () => {
    const inst = create({ defaultOpen: true, title: 'T' });
    let reason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      reason = (e as CustomEvent).detail.reason;
    });
    await inst.close('escape');
    expect(reason).toBe('escape');
    inst.destroy();
  });

  it('open() is a no-op when already open', async () => {
    const onOpen = vi.fn();
    const inst = create({ defaultOpen: true, onOpen });
    await inst.open();
    expect(onOpen).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('close() is a no-op when already closed', async () => {
    const onClose = vi.fn();
    const inst = create({ onClose });
    await inst.close();
    expect(onClose).not.toHaveBeenCalled();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 13. destroy() cleanup
// ---------------------------------------------------------------------------

describe('destroy() cleanup', () => {
  it('removes the portaled host from the DOM', () => {
    const inst = create({ defaultOpen: true });
    expect(host()).not.toBeNull();
    inst.destroy();
    expect(host()).toBeNull();
  });

  it('hides the backdrop', async () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(backdrop()).not.toBeNull();
    inst.destroy();
    // The shared mask hide() detaches after a 300ms transition window.
    await new Promise((r) => setTimeout(r, 320));
    expect(backdrop()).toBeNull();
  });

  it('subsequent method calls are no-ops (do not throw)', async () => {
    const inst = create({ defaultOpen: true });
    inst.destroy();
    // open() still returns Promise<void>; close()/toggle() are now synchronous void.
    await expect(inst.open()).resolves.toBeUndefined();
    expect(() => inst.close()).not.toThrow();
    expect(() => inst.toggle()).not.toThrow();
  });

  it('removes the Escape document keydown listener', async () => {
    const onClose = vi.fn();
    const inst = create({ defaultOpen: true, onClose });
    inst.destroy();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await Promise.resolve();
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 14. drw:close reason payload coverage
// ---------------------------------------------------------------------------

describe('drw:close reason payload', () => {
  it('reason="programmatic" when close() called without argument', async () => {
    const inst = create({ defaultOpen: true });
    let reason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      reason = (e as CustomEvent).detail.reason;
    });
    await inst.close();
    expect(reason).toBe('programmatic');
    inst.destroy();
  });

  it('reason="mask-click" when mask is clicked', async () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    let reason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      reason = (e as CustomEvent).detail.reason;
    });
    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    await vi.waitFor(() => expect(reason).toBe('mask-click'));
    inst.destroy();
  });

  it('reason="close-button" when close button is clicked', async () => {
    const inst = create({ defaultOpen: true, title: 'T' });
    let reason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      reason = (e as CustomEvent).detail.reason;
    });
    (
      document.body.querySelector('.arvo-drw__close') as HTMLElement
    ).click();
    await vi.waitFor(() => expect(reason).toBe('close-button'));
    inst.destroy();
  });

  it('reason="escape" when Escape key is pressed', async () => {
    const inst = create({ defaultOpen: true });
    let reason: string | undefined;
    pane()!.addEventListener('drw:close', (e) => {
      reason = (e as CustomEvent).detail.reason;
    });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await vi.waitFor(() => expect(reason).toBe('escape'));
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 15. drw:open dispatched on pane after open
// ---------------------------------------------------------------------------

describe('drw:open dispatch', () => {
  it('drw:open fires on __pane after open completes', async () => {
    const inst = create();
    const p = (() => {
      // Pane doesn't exist until first open mounts it; create then listen.
      // Trigger the mount via open() and listen on the resulting pane.
      return inst;
    })();
    void p;
    const handler = vi.fn();
    // Listen on document to catch bubbling.
    document.body.addEventListener('drw:open', handler);
    await inst.open();
    expect(handler).toHaveBeenCalled();
    document.body.removeEventListener('drw:open', handler);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 16. Real-shell: PanelShell composition (no mocks)
//
// These tests exercise the real createPanelShell factory to catch regressions
// in Arvo* primitive composition that the previous stub mock hid.
// ---------------------------------------------------------------------------

describe('Real-shell: header actions instantiate the right Arvo class', () => {
  it('type=btn renders an ArvoIconButton (.arvo-icon-btn) inside __action', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      headerActions: [
        { id: 'refresh', type: 'btn', icon: 'refresh', label: 'Refresh' },
      ],
    });
    const action = document.body.querySelector('[data-action-id="refresh"]')!;
    expect(action.querySelector('.arvo-icon-btn')).not.toBeNull();
    inst.destroy();
  });

  it('type=switch renders an ArvoSwitch (.arvo-sw) inside __action', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      headerActions: [
        { id: 'live', type: 'switch', label: 'Live', defaultChecked: true },
      ],
    });
    const action = document.body.querySelector('[data-action-id="live"]')!;
    expect(action.querySelector('.arvo-sw')).not.toBeNull();
    inst.destroy();
  });

  it('type=checkbox renders an ArvoCheckbox (.arvo-cb) inside __action', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      headerActions: [
        { id: 'select-all', type: 'checkbox', label: 'Select all' },
      ],
    });
    const action = document.body.querySelector(
      '[data-action-id="select-all"]',
    )!;
    expect(action.querySelector('.arvo-cb')).not.toBeNull();
    inst.destroy();
  });

  it('close button renders as a real ArvoIconButton (.arvo-icon-btn.arvo-drw__close)', () => {
    const inst = create({ defaultOpen: true, title: 'T', isClosable: true });
    const close = document.body.querySelector('.arvo-drw__close');
    expect(close).not.toBeNull();
    expect(close!.classList.contains('arvo-icon-btn')).toBe(true);
    inst.destroy();
  });
});

describe('Real-shell: sticky region wires up Arvo primitives', () => {
  it('stickyHeader.tabs instantiates ArvoTabstrip (.arvo-tabs on the same element)', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      stickyHeader: {
        tabs: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      },
    });
    const tabs = document.body.querySelector('.arvo-drw__tabs')!;
    expect(tabs).not.toBeNull();
    expect(tabs.classList.contains('arvo-tabs')).toBe(true);
    inst.destroy();
  });

  it('stickyHeader.search instantiates ArvoSearch (.arvo-search nested inside __search container)', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      stickyHeader: { search: true },
    });
    // panel-shell renders a flex-row `__search` wrapper and a SEPARATE
    // inner `<div class="arvo-search ...">` (so the wrapper can host the
    // optional sticky-action sibling without inheriting ArvoSearch's
    // flex-column layout).
    const search = document.body.querySelector('.arvo-drw__search')!;
    expect(search).not.toBeNull();
    expect(search.classList.contains('arvo-search')).toBe(false);
    expect(search.querySelector('.arvo-search')).not.toBeNull();
    inst.destroy();
  });
});

describe('Real-shell: footer instantiates ArvoButton', () => {
  it('renders each footer action as an ArvoButton (.arvo-btn)', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      actions: [
        { id: 'cancel', label: 'Cancel', variant: 'secondary' },
        { id: 'save',   label: 'Save',   variant: 'primary'   },
      ],
    });
    const buttons = document.body.querySelectorAll(
      '.arvo-drw__footer-actions .arvo-btn',
    );
    expect(buttons.length).toBe(2);
    inst.destroy();
  });

  it('primary action carries the .arvo-btn--primary modifier (CSS order target)', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      actions: [
        { id: 'save',   label: 'Save',   variant: 'primary'   },
        { id: 'cancel', label: 'Cancel', variant: 'secondary' },
      ],
    });
    const primary = document.body.querySelector(
      '.arvo-drw__footer-actions .arvo-btn--primary',
    );
    expect(primary).not.toBeNull();
    expect(primary!.getAttribute('data-action-id')).toBe('save');
    inst.destroy();
  });
});

describe('Real-shell: custom content + search', () => {
  it('renders custom body content into __content', () => {
    const body = document.createElement('ul');
    body.className = 'my-list';
    body.innerHTML = '<li>Alpha</li><li>Beta</li>';
    const inst = create({
      defaultOpen: true,
      title: 'T',
      content: body,
    });
    const list = document.body.querySelector('.arvo-drw__content .my-list');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li').length).toBe(2);
    inst.destroy();
  });

  it('forwards onSearchChange to the panel-shell (consumer owns filtering)', () => {
    const onSearchChange = vi.fn();
    const inst = create({
      defaultOpen: true,
      title: 'T',
      stickyHeader: { search: true },
      content: '<div>Body</div>',
      onSearchChange,
    });

    // Search change commits on blur, mirroring ArvoSearch's onChange semantics.
    const input = document.body.querySelector(
      '.arvo-drw__search input',
    ) as HTMLInputElement;
    input.value = 'Alp';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(onSearchChange).toHaveBeenCalled();

    inst.destroy();
  });

  it('setInfo surfaces a filtered-only info row tied to the search query', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      stickyHeader: {
        search: true,
        info: { type: 'info', message: '', showWhen: 'filtered' },
      },
      content: '<div>Body</div>',
    });

    const infoRow = document.body.querySelector('.arvo-drw__info') as HTMLElement;
    expect(infoRow).not.toBeNull();
    // Hidden while no query is active (showWhen: 'filtered').
    expect(infoRow.style.display).toBe('none');

    // Simulate a query + a consumer-driven count update.
    inst.search('Alp');
    inst.setInfo({ type: 'info', message: 'Showing 1 of 2', showWhen: 'filtered' });
    expect(infoRow.style.display).not.toBe('none');
    expect(infoRow.textContent).toContain('Showing 1 of 2');

    inst.destroy();
  });
});

describe('Real-shell: loading hides sticky and footer', () => {
  it('loading(true) swaps body for skeleton', () => {
    const inst = create({
      defaultOpen: true,
      title: 'T',
      stickyHeader: { search: true },
      actions: [{ id: 'apply', label: 'Apply', variant: 'primary' }],
    });

    inst.loading(true);
    expect(document.body.querySelector('.arvo-drw__skeleton')).not.toBeNull();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Notify-but-no-veto: engine paths (Escape + mask-click) ignore veto
//
// Engine paths NOTIFY onClose but ignore the return value.
// drw:close IS dispatched with cancelable=false.
// ---------------------------------------------------------------------------

describe('Notify-but-no-veto: engine paths ignore veto', () => {
  it('Escape: onClose IS called for notification (not silent)', async () => {
    const onClose = vi.fn();
    const inst = create({ defaultOpen: true, onClose });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith('escape'));
    inst.destroy();
  });

  it('Escape: onClose returning false does NOT veto -- drw:close is still dispatched', async () => {
    const onClose = vi.fn(() => false as const);
    const inst = create({ defaultOpen: true, onClose });
    const closeHandler = vi.fn();
    pane()!.addEventListener('drw:close', closeHandler);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(closeHandler).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledWith('escape');
    inst.destroy();
  });

  it('mask-click: onClose IS called for notification (not silent)', async () => {
    const onClose = vi.fn();
    const inst = create({ defaultOpen: true, hasMask: true, onClose });
    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith('mask-click'));
    inst.destroy();
  });

  it('mask-click: onClose returning false does NOT veto -- drw:close is still dispatched', async () => {
    const onClose = vi.fn(() => false as const);
    const inst = create({ defaultOpen: true, hasMask: true, onClose });
    const closeHandler = vi.fn();
    pane()!.addEventListener('drw:close', closeHandler);
    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    await vi.waitFor(() => expect(closeHandler).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledWith('mask-click');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Notify-but-no-veto: drw:close.cancelable property
//
// Programmatic paths: cancelable=true.  Engine paths: cancelable=false.
// ---------------------------------------------------------------------------

describe('Notify-but-no-veto: drw:close cancelable property', () => {
  it('drw:close.cancelable=true for close-button click (programmatic path)', async () => {
    const inst = create({ defaultOpen: true, title: 'T' });
    let cancelable: boolean | undefined;
    pane()!.addEventListener('drw:close', (e) => { cancelable = e.cancelable; });
    (document.body.querySelector('.arvo-drw__close') as HTMLElement).click();
    await vi.waitFor(() => expect(cancelable).toBeDefined());
    expect(cancelable).toBe(true);
    inst.destroy();
  });

  it('drw:close.cancelable=true for imperative close() (programmatic path)', async () => {
    const inst = create({ defaultOpen: true });
    let cancelable: boolean | undefined;
    pane()!.addEventListener('drw:close', (e) => { cancelable = e.cancelable; });
    await inst.close();
    expect(cancelable).toBe(true);
    inst.destroy();
  });

  it('drw:close.cancelable=false for Escape (engine path)', async () => {
    const inst = create({ defaultOpen: true });
    let cancelable: boolean | undefined;
    pane()!.addEventListener('drw:close', (e) => { cancelable = e.cancelable; });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(cancelable).toBeDefined());
    expect(cancelable).toBe(false);
    inst.destroy();
  });

  it('drw:close.cancelable=false for mask-click (engine path)', async () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    let cancelable: boolean | undefined;
    pane()!.addEventListener('drw:close', (e) => { cancelable = e.cancelable; });
    await new Promise((r) => setTimeout(r, 20));
    fireBackdropClick(backdrop());
    await vi.waitFor(() => expect(cancelable).toBeDefined());
    expect(cancelable).toBe(false);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// ARIA attributes on __pane
// ---------------------------------------------------------------------------

describe('ARIA attributes on __pane', () => {
  it('__pane has role="dialog"', () => {
    const inst = create({ defaultOpen: true });
    expect(pane()!.getAttribute('role')).toBe('dialog');
    inst.destroy();
  });

  it('__pane has aria-modal="true" when hasMask=true', () => {
    const inst = create({ defaultOpen: true, hasMask: true });
    expect(pane()!.getAttribute('aria-modal')).toBe('true');
    inst.destroy();
  });

  it('__pane has aria-modal="false" when no mask (default)', () => {
    const inst = create({ defaultOpen: true, hasMask: false });
    expect(pane()!.getAttribute('aria-modal')).toBe('false');
    inst.destroy();
  });

  it('consumer-supplied ariaLabelledBy survives the first paint, even with a panel-shell title', () => {
    // Regression: the panel-shell auto-wires its own aria-labelledby to the
    // parent (__pane) when a `title` is provided. _applyAria() must run AFTER
    // createPanelShell so the consumer's ariaLabelledBy is the final value.
    const externalLabel = document.createElement('h2');
    externalLabel.id = 'my-external-label';
    externalLabel.textContent = 'External Filters';
    document.body.appendChild(externalLabel);

    const inst = create({
      defaultOpen: true,
      title: 'Internal title',
      ariaLabelledBy: 'my-external-label',
    });
    expect(pane()!.getAttribute('aria-labelledby')).toBe('my-external-label');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------

describe('Accessibility (axe-core)', () => {
  it('zero violations when open (no mask)', async () => {
    // ariaLabel provides accessible name; no title so computedAriaLabel is set.
    const inst = create({ defaultOpen: true, ariaLabel: 'Filters drawer' });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    inst.destroy();
  }, 15000);

  it('zero violations when open with hasMask (aria-modal=true)', async () => {
    const inst = create({ defaultOpen: true, ariaLabel: 'Filters drawer', hasMask: true });
    await new Promise((r) => setTimeout(r, 20));
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    inst.destroy();
  }, 15000);
});
