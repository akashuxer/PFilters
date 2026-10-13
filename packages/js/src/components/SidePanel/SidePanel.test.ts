// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoSidePanel } from './SidePanel';
import type { ArvoSidePanelOptions } from './SidePanel';
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
  };
});

// PanelShell is intentionally NOT mocked. JS SidePanel tests run against the
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

let hostEl: HTMLDivElement;

beforeEach(() => {
  hostEl = document.createElement('div');
  document.body.appendChild(hostEl);
});

afterEach(() => {
  document.body.innerHTML = '';
});

function create(opts: ArvoSidePanelOptions = {}): ArvoSidePanel {
  return ArvoSidePanel.initialize(hostEl, opts);
}

// ---------------------------------------------------------------------------
// 1. Initial render / DOM scaffold
// ---------------------------------------------------------------------------

describe('Initial render / DOM scaffold', () => {
  it('applies arvo-sp host class', () => {
    const inst = create();
    expect(hostEl.classList.contains('arvo-sp')).toBe(true);
    inst.destroy();
  });

  it('renders arvo-sp__pane as a child of the host', () => {
    const inst = create();
    const pane = hostEl.querySelector('.arvo-sp__pane');
    expect(pane).not.toBeNull();
    expect(pane!.parentElement).toBe(hostEl);
    inst.destroy();
  });

  it('defaults to layout variant (arvo-sp--layout)', () => {
    const inst = create();
    expect(hostEl.classList.contains('arvo-sp--layout')).toBe(true);
    inst.destroy();
  });

  it('defaults to right side (arvo-sp--side-right)', () => {
    const inst = create();
    expect(hostEl.classList.contains('arvo-sp--side-right')).toBe(true);
    inst.destroy();
  });

  it('renders __body inside __pane (via panel-shell)', () => {
    const inst = create();
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.querySelector('.arvo-sp__body')).not.toBeNull();
    inst.destroy();
  });

  it('renders __hdr with __title when title is set', () => {
    const inst = create({ title: 'Filters' });
    const title = hostEl.querySelector('.arvo-sp__title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Filters');
    inst.destroy();
  });

  it('applies arvo-sp--pinnable class and renders __pin when isPinnable', () => {
    const inst = create({ isPinnable: true, title: 'Test' });
    expect(hostEl.classList.contains('arvo-sp--pinnable')).toBe(true);
    expect(hostEl.querySelector('.arvo-sp__pin')).not.toBeNull();
    inst.destroy();
  });

  it('renders __pin inside __hdr-actions', () => {
    const inst = create({ isPinnable: true, title: 'Test' });
    const hdrActions = hostEl.querySelector('.arvo-sp__hdr-actions')!;
    expect(hdrActions.querySelector('.arvo-sp__pin')).not.toBeNull();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 2. Variant + Side modifiers
// ---------------------------------------------------------------------------

describe('Variant + Side modifiers', () => {
  it('variant=overlay adds arvo-sp--overlay class', () => {
    const inst = create({ variant: 'overlay' });
    expect(hostEl.classList.contains('arvo-sp--overlay')).toBe(true);
    inst.destroy();
  });

  it('side=left adds arvo-sp--side-left class', () => {
    const inst = create({ side: 'left' });
    expect(hostEl.classList.contains('arvo-sp--side-left')).toBe(true);
    inst.destroy();
  });

  it('overlay variant sets role=dialog and aria-modal=false on __pane', () => {
    const inst = create({ variant: 'overlay', defaultOpen: true });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.getAttribute('role')).toBe('dialog');
    expect(pane.getAttribute('aria-modal')).toBe('false');
    inst.destroy();
  });

  it('layout variant sets role=region on __pane', () => {
    const inst = create({ variant: 'layout' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.getAttribute('role')).toBe('region');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 3. Pin/unpin DOM-position invariance (CRITICAL)
// ---------------------------------------------------------------------------

describe('Pin/unpin DOM-position invariance', () => {
  it('preserves __pane element identity across pin flip', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    const paneBefore = hostEl.querySelector('.arvo-sp__pane');

    inst.pinned(false);

    const paneAfter = hostEl.querySelector('.arvo-sp__pane');
    expect(paneBefore).toBe(paneAfter);
    inst.destroy();
  });

  it('preserves shell instance reference across pin flip', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    const shellBefore = inst.shell;

    inst.pinned(false);

    expect(inst.shell).toBe(shellBefore);
    inst.destroy();
  });

  it('flips host classes correctly on pin toggle', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    expect(hostEl.classList.contains('is-pinned')).toBe(true);
    expect(hostEl.classList.contains('arvo-sp--layout')).toBe(true);

    inst.pinned(false);

    expect(hostEl.classList.contains('is-unpinned')).toBe(true);
    expect(hostEl.classList.contains('arvo-sp--overlay')).toBe(true);
    expect(hostEl.classList.contains('is-pinned')).toBe(false);
    expect(hostEl.classList.contains('arvo-sp--layout')).toBe(false);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 5. Layout variant ignores Escape; overlay variant closes on Escape
// ---------------------------------------------------------------------------

describe('Escape key handling', () => {
  it('layout variant ignores Escape', () => {
    const onClose = vi.fn();
    const inst = create({ variant: 'layout', onClose });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('overlay variant closes on Escape when closeOnEscape=true (default)', async () => {
    const onClose = vi.fn();
    const inst = create({
      variant: 'overlay',
      defaultOpen: true,
      onClose,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // Wait for the close() promise to resolve.
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    inst.destroy();
  });

  it('overlay variant does NOT close on Escape when closeOnEscape=false', () => {
    const onClose = vi.fn();
    const inst = create({
      variant: 'overlay',
      defaultOpen: true,
      closeOnEscape: false,
      onClose,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Splitter slot rendering
// ---------------------------------------------------------------------------

describe('Splitter slot rendering', () => {
  it('hasSplitter=auto + layout renders splitter', () => {
    const inst = create({ hasSplitter: 'auto', variant: 'layout' });
    expect(hostEl.querySelector('.arvo-sp__splitter')).not.toBeNull();
    inst.destroy();
  });

  it('hasSplitter=auto + overlay does NOT render splitter', () => {
    const inst = create({ hasSplitter: 'auto', variant: 'overlay' });
    expect(hostEl.querySelector('.arvo-sp__splitter')).toBeNull();
    inst.destroy();
  });

  it('hasSplitter=true + overlay renders splitter', () => {
    const inst = create({ hasSplitter: true, variant: 'overlay' });
    expect(hostEl.querySelector('.arvo-sp__splitter')).not.toBeNull();
    inst.destroy();
  });

  it('hasSplitter=false + layout does NOT render splitter', () => {
    const inst = create({ hasSplitter: false, variant: 'layout' });
    expect(hostEl.querySelector('.arvo-sp__splitter')).toBeNull();
    inst.destroy();
  });

  it('side=right: splitter is the FIRST child of host (before __pane)', () => {
    const inst = create({ hasSplitter: true, side: 'right' });
    const children = Array.from(hostEl.children);
    const splitterIdx = children.findIndex((c) => c.classList.contains('arvo-sp__splitter'));
    const paneIdx = children.findIndex((c) => c.classList.contains('arvo-sp__pane'));
    expect(splitterIdx).toBeLessThan(paneIdx);
    expect(hostEl.classList.contains('arvo-sp--with-splitter-l')).toBe(true);
    inst.destroy();
  });

  it('side=left: splitter is the LAST child of host (after __pane)', () => {
    const inst = create({ hasSplitter: true, side: 'left' });
    const children = Array.from(hostEl.children);
    const splitterIdx = children.findIndex((c) => c.classList.contains('arvo-sp__splitter'));
    const paneIdx = children.findIndex((c) => c.classList.contains('arvo-sp__pane'));
    expect(splitterIdx).toBeGreaterThan(paneIdx);
    expect(hostEl.classList.contains('arvo-sp--with-splitter-r')).toBe(true);
    inst.destroy();
  });

  it('splitter is an interactive ArvoSplitter (role=separator)', () => {
    const inst = create({ hasSplitter: true });
    const splitter = hostEl.querySelector('.arvo-sp__splitter')!;
    expect(splitter.getAttribute('role')).toBe('separator');
    expect(splitter.classList.contains('arvo-spl')).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. Pin button placement and accessibility
// ---------------------------------------------------------------------------

describe('Pin button placement and accessibility', () => {
  it('DOM order: user actions, then __pin, then __close', () => {
    const inst = create({
      isPinnable: true,
      isClosable: true,
      title: 'Test',
      headerActions: [
        { id: 'action-a', type: 'btn', icon: 'cog', label: 'A' },
        { id: 'action-b', type: 'btn', icon: 'cog', label: 'B' },
      ],
    });
    const hdrActions = hostEl.querySelector('.arvo-sp__hdr-actions')!;
    const children = Array.from(hdrActions.children);

    const actionIdx = children.findIndex((c) =>
      c.classList.contains('arvo-sp__action'),
    );
    const pinIdx = children.findIndex((c) =>
      c.classList.contains('arvo-sp__pin'),
    );
    const closeIdx = children.findIndex((c) =>
      c.classList.contains('arvo-sp__close'),
    );

    expect(actionIdx).toBeLessThan(pinIdx);
    expect(pinIdx).toBeLessThan(closeIdx);
    inst.destroy();
  });

  it('__pin has aria-pressed=true when pinned', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    const pin = hostEl.querySelector('.arvo-sp__pin')!;
    expect(pin.getAttribute('aria-pressed')).toBe('true');
    inst.destroy();
  });

  it('__pin has aria-pressed=false when unpinned', () => {
    const inst = create({ isPinnable: true, defaultPinned: false, title: 'Test' });
    const pin = hostEl.querySelector('.arvo-sp__pin')!;
    expect(pin.getAttribute('aria-pressed')).toBe('false');
    inst.destroy();
  });

  it('__pin has aria-label=Unpin panel when pinned', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    const pin = hostEl.querySelector('.arvo-sp__pin')!;
    expect(pin.getAttribute('aria-label')).toBe('Unpin panel');
    inst.destroy();
  });

  it('__pin has aria-label=Pin panel when unpinned', () => {
    const inst = create({ isPinnable: true, defaultPinned: false, title: 'Test' });
    const pin = hostEl.querySelector('.arvo-sp__pin')!;
    expect(pin.getAttribute('aria-label')).toBe('Pin panel');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 8. Pin transition focus retention
// ---------------------------------------------------------------------------

describe('Pin transition focus retention', () => {
  it('focus stays on pin button after clicking it', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    const pin = hostEl.querySelector('.arvo-sp__pin') as HTMLElement;
    pin.focus();
    pin.click();

    expect(document.activeElement === pin || pin.contains(document.activeElement)).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 9. PanelShell delegation wiring
// ---------------------------------------------------------------------------

describe('PanelShell delegation wiring', () => {
  it('setTitle updates the __title text', () => {
    const inst = create({ title: 'A' });
    expect(hostEl.querySelector('.arvo-sp__title')!.textContent).toBe('A');

    inst.setTitle('B');
    expect(hostEl.querySelector('.arvo-sp__title')!.textContent).toBe('B');
    inst.destroy();
  });

  it('search getter/setter round-trips via shell delegate', () => {
    const inst = create({
      title: 'Test',
      stickyHeader: { search: true },
    });
    inst.search('foo');
    // Real shell stores the query and returns it from the bare getter.
    expect(inst.search()).toBe('foo');
    inst.destroy();
  });

  it('loading(true) applies loading class on __pane via shell', () => {
    const inst = create({ title: 'Test' });
    inst.loading(true);
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.classList.contains('loading')).toBe(true);
    inst.destroy();
  });

  it('disabled(true) applies is-disabled class on __pane via shell', () => {
    const inst = create({ title: 'Test' });
    inst.disabled(true);
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.classList.contains('is-disabled')).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 10. Custom events (JS only)
// ---------------------------------------------------------------------------

describe('Custom events', () => {
  it('sp:pin fires with correct detail on pinned(false)', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    const handler = vi.fn();
    pane.addEventListener('sp:pin', handler);

    inst.pinned(false);

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.pinned).toBe(false);
    inst.destroy();
  });

  it('sp:close fires on close()', async () => {
    const inst = create({
      variant: 'overlay',
      defaultOpen: true,
      title: 'Test',
    });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    const handler = vi.fn();
    pane.addEventListener('sp:close', handler);

    await inst.close();

    expect(handler).toHaveBeenCalledTimes(1);
    inst.destroy();
  });

  it('sp:close fires when __close button is clicked', () => {
    const inst = create({ isClosable: true, title: 'Test' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    const handler = vi.fn();
    pane.addEventListener('sp:close', handler);

    const closeBtn = hostEl.querySelector('.arvo-sp__close') as HTMLElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(handler).toHaveBeenCalledTimes(1);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 11. Disabled / loading state propagation
// ---------------------------------------------------------------------------

describe('Disabled / loading state propagation', () => {
  it('isDisabled option applies is-disabled class and aria-disabled on __pane', () => {
    const inst = create({ isDisabled: true, title: 'Test' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.classList.contains('is-disabled')).toBe(true);
    expect(pane.getAttribute('aria-disabled')).toBe('true');
    inst.destroy();
  });

  it('isLoading option applies loading class and aria-busy on __pane', () => {
    const inst = create({ isLoading: true, title: 'Test' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    expect(pane.classList.contains('loading')).toBe(true);
    expect(pane.getAttribute('aria-busy')).toBe('true');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// 12. destroy()
// ---------------------------------------------------------------------------

describe('destroy()', () => {
  it('removes __pane from host', () => {
    const inst = create({ title: 'Test' });
    expect(hostEl.querySelector('.arvo-sp__pane')).not.toBeNull();

    inst.destroy();

    expect(hostEl.querySelector('.arvo-sp__pane')).toBeNull();
  });

  it('removes arvo-sp class from host', () => {
    const inst = create();
    expect(hostEl.classList.contains('arvo-sp')).toBe(true);

    inst.destroy();

    expect(hostEl.classList.contains('arvo-sp')).toBe(false);
  });

  it('subsequent destroy() calls do not throw', () => {
    const inst = create();
    inst.destroy();
    expect(() => inst.destroy()).not.toThrow();
  });

  it('removes splitter from host', () => {
    const inst = create({ hasSplitter: true });
    expect(hostEl.querySelector('.arvo-sp__splitter')).not.toBeNull();

    inst.destroy();

    expect(hostEl.querySelector('.arvo-sp__splitter')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Additional: static initialize and open/close lifecycle
// ---------------------------------------------------------------------------

describe('initialize and overlay lifecycle', () => {
  it('initialize creates an instance', () => {
    const inst = create({ title: 'Test' });
    expect(inst).toBeInstanceOf(ArvoSidePanel);
    inst.destroy();
  });

  it('isOpen returns true for layout variant', () => {
    const inst = create({ variant: 'layout' });
    expect(inst.isOpen()).toBe(true);
    inst.destroy();
  });

  it('open/close cycle for overlay variant', async () => {
    const inst = create({ variant: 'overlay', defaultOpen: false });
    expect(inst.isOpen()).toBe(false);

    await inst.open();
    expect(inst.isOpen()).toBe(true);
    expect(hostEl.classList.contains('open')).toBe(true);

    // close() is synchronous void; isOpen() is updated immediately.
    // The engine drops the 'open' class asynchronously after its exit
    // transition completes, so poll until the class disappears.
    inst.close();
    expect(inst.isOpen()).toBe(false);
    await vi.waitFor(() => {
      expect(hostEl.classList.contains('open')).toBe(false);
    });
    inst.destroy();
  });

  it('pinned() getter returns current pinned state', () => {
    const inst = create({ isPinnable: true, defaultPinned: true, title: 'Test' });
    expect(inst.pinned()).toBe(true);

    inst.pinned(false);
    expect(inst.pinned()).toBe(false);
    inst.destroy();
  });

  it('onPinChange callback fires', () => {
    const onPinChange = vi.fn();
    const inst = create({
      isPinnable: true,
      defaultPinned: true,
      title: 'Test',
      onPinChange,
    });

    inst.pinned(false);

    expect(onPinChange).toHaveBeenCalledWith(false);
    inst.destroy();
  });

  it('toggle flips overlay open state', async () => {
    const inst = create({ variant: 'overlay', defaultOpen: false });
    inst.toggle();
    await vi.waitFor(() => {
      expect(inst.isOpen()).toBe(true);
    });
    inst.destroy();
  });

  it('setVariant changes variant for non-pinnable panel', () => {
    const inst = create({ variant: 'layout' });
    expect(hostEl.classList.contains('arvo-sp--layout')).toBe(true);

    inst.setVariant('overlay');
    expect(hostEl.classList.contains('arvo-sp--overlay')).toBe(true);
    expect(hostEl.classList.contains('arvo-sp--layout')).toBe(false);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Real-shell: PanelShell composition (no mocks)
//
// These tests exercise the real createPanelShell factory to catch regressions
// in Arvo* primitive composition.
// ---------------------------------------------------------------------------

describe('Real-shell: header actions instantiate the right Arvo class', () => {
  it('type=btn renders an ArvoIconButton (.arvo-icon-btn) inside __action', () => {
    const inst = create({
      title: 'T',
      headerActions: [
        { id: 'refresh', type: 'btn', icon: 'refresh', label: 'Refresh' },
      ],
    });
    const action = hostEl.querySelector('[data-action-id="refresh"]')!;
    expect(action.querySelector('.arvo-icon-btn')).not.toBeNull();
    inst.destroy();
  });

  it('type=switch renders an ArvoSwitch (.arvo-sw) inside __action', () => {
    const inst = create({
      title: 'T',
      headerActions: [
        { id: 'live', type: 'switch', label: 'Live', defaultChecked: true },
      ],
    });
    const action = hostEl.querySelector('[data-action-id="live"]')!;
    expect(action.querySelector('.arvo-sw')).not.toBeNull();
    inst.destroy();
  });

  it('type=checkbox renders an ArvoCheckbox (.arvo-cb) inside __action', () => {
    const inst = create({
      title: 'T',
      headerActions: [
        { id: 'select-all', type: 'checkbox', label: 'Select all' },
      ],
    });
    const action = hostEl.querySelector('[data-action-id="select-all"]')!;
    expect(action.querySelector('.arvo-cb')).not.toBeNull();
    inst.destroy();
  });

  it('back button renders as a real ArvoIconButton (.arvo-icon-btn.arvo-sp__back)', () => {
    const inst = create({ title: 'T', hasBackButton: true });
    const back = hostEl.querySelector('.arvo-sp__back');
    expect(back).not.toBeNull();
    expect(back!.classList.contains('arvo-icon-btn')).toBe(true);
    inst.destroy();
  });

  it('close button renders as a real ArvoIconButton (.arvo-icon-btn.arvo-sp__close)', () => {
    const inst = create({ title: 'T', isClosable: true });
    const close = hostEl.querySelector('.arvo-sp__close');
    expect(close).not.toBeNull();
    expect(close!.classList.contains('arvo-icon-btn')).toBe(true);
    inst.destroy();
  });
});

describe('Real-shell: sticky region wires up Arvo primitives', () => {
  it('stickyHeader.tabs instantiates ArvoTabstrip (.arvo-tabs on the same element)', () => {
    const inst = create({
      title: 'T',
      stickyHeader: {
        tabs: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      },
    });
    const tabs = hostEl.querySelector('.arvo-sp__tabs')!;
    expect(tabs).not.toBeNull();
    expect(tabs.classList.contains('arvo-tabs')).toBe(true);
    inst.destroy();
  });

  it('stickyHeader.search instantiates ArvoSearch (.arvo-search nested inside __search container)', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { search: true },
    });
    // panel-shell renders a flex-row `__search` wrapper and a SEPARATE
    // inner `<div class="arvo-search ...">` (so the wrapper can host the
    // optional sticky-action sibling without inheriting ArvoSearch's
    // flex-column layout).
    const search = hostEl.querySelector('.arvo-sp__search')!;
    expect(search).not.toBeNull();
    expect(search.classList.contains('arvo-search')).toBe(false);
    expect(search.querySelector('.arvo-search')).not.toBeNull();
    inst.destroy();
  });
});

describe('Real-shell: footer instantiates ArvoButton', () => {
  it('renders each footer action as an ArvoButton (.arvo-btn)', () => {
    const inst = create({
      title: 'T',
      actions: [
        { id: 'cancel', label: 'Cancel', variant: 'secondary' },
        { id: 'apply',  label: 'Apply',  variant: 'primary'   },
      ],
    });
    const buttons = hostEl.querySelectorAll(
      '.arvo-sp__footer-actions .arvo-btn',
    );
    expect(buttons.length).toBe(2);
    inst.destroy();
  });

  it('primary action carries the .arvo-btn--primary modifier (CSS order target)', () => {
    const inst = create({
      title: 'T',
      actions: [
        { id: 'apply',  label: 'Apply',  variant: 'primary'   },
        { id: 'cancel', label: 'Cancel', variant: 'secondary' },
      ],
    });
    const primary = hostEl.querySelector(
      '.arvo-sp__footer-actions .arvo-btn--primary',
    );
    expect(primary).not.toBeNull();
    expect(primary!.getAttribute('data-action-id')).toBe('apply');
    inst.destroy();
  });
});

describe('Real-shell: custom content + search', () => {
  it('renders custom body content into the __content slot', () => {
    const body = document.createElement('ul');
    body.className = 'my-list';
    body.innerHTML = '<li>Alpha</li><li>Beta</li>';
    const inst = create({ title: 'T', content: body });
    const list = hostEl.querySelector('.arvo-sp__content .my-list');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li').length).toBe(2);
    inst.destroy();
  });

  it('setContent replaces the custom body content', () => {
    const inst = create({ title: 'T', content: '<p class="a">A</p>' });
    expect(hostEl.querySelector('.arvo-sp__content .a')).not.toBeNull();
    inst.setContent('<p class="b">B</p>');
    expect(hostEl.querySelector('.arvo-sp__content .a')).toBeNull();
    expect(hostEl.querySelector('.arvo-sp__content .b')).not.toBeNull();
    inst.destroy();
  });

  it('forwards onSearchChange so the consumer can filter its own content', () => {
    const onSearchChange = vi.fn();
    const inst = create({
      title: 'T',
      stickyHeader: { search: true },
      content: '<div>Body</div>',
      onSearchChange,
    });
    const input = hostEl.querySelector(
      '.arvo-sp__search input',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'Alp';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(onSearchChange).toHaveBeenCalled();
    inst.destroy();
  });

  it('setInfo surfaces a filtered-only info row tied to the search query', () => {
    const inst = create({
      title: 'T',
      stickyHeader: {
        search: true,
        info: { type: 'info', message: '', showWhen: 'filtered' },
      },
      content: '<div>Body</div>',
    });
    const infoRow = hostEl.querySelector('.arvo-sp__info') as HTMLElement;
    expect(infoRow).not.toBeNull();
    // Hidden while no query is active (showWhen: 'filtered').
    expect(infoRow.style.display).toBe('none');

    inst.search('Alp');
    inst.setInfo({ type: 'info', message: 'Showing 1 of 2', showWhen: 'filtered' });
    expect(infoRow.style.display).not.toBe('none');
    expect(infoRow.textContent).toContain('Showing 1 of 2');
    inst.destroy();
  });
});

describe('Real-shell: loading hides sticky and footer', () => {
  it('loading(true) swaps body for skeleton and removes sticky + footer', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { search: true },
      actions: [{ id: 'apply', label: 'Apply', variant: 'primary' }],
    });

    inst.loading(true);
    expect(hostEl.querySelector('.arvo-sp__skeleton')).not.toBeNull();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// __info uses the SHARED arvo-msg-alert pattern (Figma alignment)
// ---------------------------------------------------------------------------

describe('__info renders the shared arvo-msg-alert pattern', () => {
  it('emits .arvo-msg-alert + __ico + __msg inside the __info slot', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { info: { type: 'info', message: '24 matching results' } },
    });
    const info = hostEl.querySelector('.arvo-sp__info');
    expect(info).not.toBeNull();
    const alert = info!.querySelector('.arvo-msg-alert');
    expect(alert).not.toBeNull();
    expect(alert!.classList.contains('arvo-msg-alert--info')).toBe(true);
    expect(alert!.querySelector('.arvo-msg-alert__ico')).not.toBeNull();
    expect(alert!.querySelector('.arvo-msg-alert__msg')!.textContent).toBe(
      '24 matching results',
    );
    inst.destroy();
  });

  it('defaults type to "info" when config.type is omitted', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { info: { message: 'fallback' } },
    });
    expect(
      hostEl.querySelector('.arvo-sp__info .arvo-msg-alert--info'),
    ).not.toBeNull();
    inst.destroy();
  });

  it('uses role="alert" for error / warning and role="status" for info / success / neutral', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { info: { type: 'negative', message: 'boom' } },
    });
    expect(
      hostEl
        .querySelector('.arvo-sp__info .arvo-msg-alert--negative')!
        .getAttribute('role'),
    ).toBe('alert');
    inst.destroy();

    const inst2 = create({
      title: 'T',
      stickyHeader: { info: { type: 'info', message: 'fyi' } },
    });
    expect(
      hostEl
        .querySelector('.arvo-sp__info .arvo-msg-alert--info')!
        .getAttribute('role'),
    ).toBe('status');
    inst2.destroy();
  });
});

// ---------------------------------------------------------------------------
// __info slot uses the shared arvo-msg-alert pattern (content-agnostic)
// ---------------------------------------------------------------------------

describe('__info slot uses the shared arvo-msg-alert pattern', () => {
  it('renders .arvo-msg-alert markup inside .arvo-sp__info', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { info: { message: '24 results' } },
    });
    const info = hostEl.querySelector('.arvo-sp__info');
    expect(info).not.toBeNull();
    const alert = info!.querySelector('.arvo-msg-alert.arvo-msg-alert--info');
    expect(alert).not.toBeNull();
    expect(alert!.querySelector('.arvo-msg-alert__ico[aria-hidden="true"]')).not.toBeNull();
    expect(alert!.querySelector('.arvo-msg-alert__msg')!.textContent).toBe('24 results');
    inst.destroy();
  });

  it('uses role="status" for info / positive / neutral', () => {
    for (const type of ['info', 'positive', 'neutral'] as const) {
      const inst = create({
        title: 'T',
        stickyHeader: { info: { type, message: `${type} msg` } },
      });
      expect(
        hostEl.querySelector(`.arvo-msg-alert--${type}`)!.getAttribute('role'),
      ).toBe('status');
      inst.destroy();
    }
  });

  it('setInfo replaces message without recreating the wrapper element when type changes', () => {
    const inst = create({
      title: 'T',
      stickyHeader: { info: { type: 'info', message: 'initial' } },
    });
    const infoInner = hostEl.querySelector('.arvo-sp__info .arvo-msg-alert');
    expect(infoInner).not.toBeNull();

    inst.setInfo({ type: 'positive', message: 'done' });

    const infoInnerAfter = hostEl.querySelector('.arvo-sp__info .arvo-msg-alert');
    expect(infoInnerAfter).not.toBeNull();
    expect(infoInnerAfter!.classList.contains('arvo-msg-alert--positive')).toBe(true);
    expect(infoInnerAfter!.getAttribute('role')).toBe('status');
    expect(infoInnerAfter!.querySelector('.arvo-msg-alert__msg')!.textContent).toBe('done');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// sp:close dismissal-policy (notify-but-no-veto)
//
// Programmatic paths (close button, imperative close()): onClose veto WORKS;
// sp:close dispatched with cancelable=true; detail is always {}.
// Engine paths (Escape, outside-click): onClose IS called for notification
// but veto is IGNORED; sp:close dispatched with cancelable=false.
// ---------------------------------------------------------------------------

describe('sp:close dismissal-policy (notify-but-no-veto)', () => {
  it('sp:close detail is {} (no reason payload) for programmatic path', () => {
    const inst = create({ isClosable: true, title: 'T' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    let detail: unknown;
    pane.addEventListener('sp:close', (e) => { detail = (e as CustomEvent).detail; });
    (hostEl.querySelector('.arvo-sp__close') as HTMLElement).click();
    expect(detail).toEqual({});
    inst.destroy();
  });

  it('sp:close detail is {} (no reason payload) for engine path (Escape)', async () => {
    const inst = create({ variant: 'overlay', defaultOpen: true });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    let detail: unknown;
    pane.addEventListener('sp:close', (e) => { detail = (e as CustomEvent).detail; });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(detail).toBeDefined());
    expect(detail).toEqual({});
    inst.destroy();
  });

  it('sp:close.cancelable=true for close-button click (programmatic path)', () => {
    const inst = create({ isClosable: true, title: 'T' });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    let cancelable: boolean | undefined;
    pane.addEventListener('sp:close', (e) => { cancelable = e.cancelable; });
    (hostEl.querySelector('.arvo-sp__close') as HTMLElement).click();
    expect(cancelable).toBe(true);
    inst.destroy();
  });

  it('sp:close.cancelable=false for Escape (engine path)', async () => {
    const inst = create({ variant: 'overlay', defaultOpen: true });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    let cancelable: boolean | undefined;
    pane.addEventListener('sp:close', (e) => { cancelable = e.cancelable; });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(cancelable).toBeDefined());
    expect(cancelable).toBe(false);
    inst.destroy();
  });

  it('Escape: onClose IS called for notification (engine path)', async () => {
    const onClose = vi.fn();
    const inst = create({ variant: 'overlay', defaultOpen: true, onClose });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    inst.destroy();
  });

  it('Escape: onClose returning false does NOT veto -- panel closes', async () => {
    const onClose = vi.fn(() => false as const);
    const inst = create({ variant: 'overlay', defaultOpen: true, onClose });
    const closeHandler = vi.fn();
    hostEl.querySelector('.arvo-sp__pane')!.addEventListener('sp:close', closeHandler);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(closeHandler).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('close-button: onClose returning false DOES veto (programmatic path)', () => {
    const onClose = vi.fn(() => false as const);
    const inst = create({ isClosable: true, variant: 'overlay', defaultOpen: true, onClose });
    (hostEl.querySelector('.arvo-sp__close') as HTMLElement).click();
    expect(onClose).toHaveBeenCalled();
    expect(inst.isOpen()).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// sp:open event (overlay variant only)
// ---------------------------------------------------------------------------

describe('sp:open: fires for overlay variant only', () => {
  it('sp:open IS dispatched when overlay panel opens', async () => {
    const inst = create({ variant: 'overlay', defaultOpen: false });
    const pane = hostEl.querySelector('.arvo-sp__pane')!;
    const handler = vi.fn();
    pane.addEventListener('sp:open', handler);
    await inst.open();
    expect(handler).toHaveBeenCalledTimes(1);
    inst.destroy();
  });

  it('sp:open is NOT dispatched for layout variant', () => {
    const handler = vi.fn();
    document.addEventListener('sp:open', handler);
    const inst = create({ variant: 'layout' });
    document.removeEventListener('sp:open', handler);
    expect(handler).not.toHaveBeenCalled();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------

describe('Accessibility (axe-core)', () => {
  it('zero violations for layout variant', async () => {
    // Layout: role=region; aria-label from title via _applyAria.
    const inst = create({ title: 'Settings', variant: 'layout' });
    const results = await axe.run(hostEl, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    inst.destroy();
  }, 15000);

  it('zero violations for overlay variant when open', async () => {
    // Overlay: role=dialog, aria-modal=false; aria-label from title.
    const inst = create({ variant: 'overlay', defaultOpen: true, title: 'Navigation' });
    const results = await axe.run(hostEl, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    inst.destroy();
  }, 15000);
});
