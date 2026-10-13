import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { overlayHub } from '@arvo/core';
import { ArvoPanel, type ArvoPanelOptions } from './Panel';

// ArvoSearch uses a ResizeObserver for its dynamic-actions padding
// pattern; jsdom doesn't ship the API. Polyfill it up-front so any test
// that mounts a sticky search survives.
beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

let hostEl: HTMLElement;

function create(options: ArvoPanelOptions = {}): ArvoPanel {
  return ArvoPanel.initialize(hostEl, {
    ariaLabel: 'Test panel',
    ...options,
  });
}

beforeEach(() => {
  hostEl = document.createElement('div');
  document.body.appendChild(hostEl);
});

afterEach(() => {
  hostEl.remove();
});

// ---------------------------------------------------------------------------
// 1. Rendering basics
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- rendering basics', () => {
  it('renders a host with arvo-pnl + type-custom', () => {
    const p = create({ displayMode: 'docked' });
    expect(hostEl.classList.contains('arvo-pnl')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--mode-docked')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--placement-left')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--type-custom')).toBe(true);
    p.destroy();
  });

  it('renders __pane with role=region for docked', () => {
    const p = create({ displayMode: 'docked' });
    const pane = hostEl.querySelector('.arvo-pnl__pane');
    expect(pane?.getAttribute('role')).toBe('region');
    expect(pane?.getAttribute('aria-label')).toBe('Test panel');
    p.destroy();
  });

  it('renders __pane with role=dialog + aria-modal=true for overlay modal', () => {
    const p = create({ displayMode: 'overlay', isModal: true, defaultOpen: true });
    const pane = hostEl.querySelector('.arvo-pnl__pane');
    expect(pane?.getAttribute('role')).toBe('dialog');
    expect(pane?.getAttribute('aria-modal')).toBe('true');
    p.destroy();
  });

  it('overlay + non-modal sets aria-modal=false', () => {
    const p = create({
      displayMode: 'overlay',
      isModal: false,
      defaultOpen: true,
    });
    const pane = hostEl.querySelector('.arvo-pnl__pane');
    expect(pane?.getAttribute('aria-modal')).toBe('false');
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 2. Placement modifiers (4-way)
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- placement modifiers', () => {
  it.each(['left', 'right', 'top', 'bottom'] as const)(
    'placement=%s adds the placement modifier',
    (placement) => {
      const p = create({ displayMode: 'docked', placement });
      expect(hostEl.classList.contains(`arvo-pnl--placement-${placement}`)).toBe(
        true,
      );
      p.destroy();
    },
  );
});

// ---------------------------------------------------------------------------
// 3. Custom body (content option + setContent)
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- custom body', () => {
  it('renders content passed at construct time', () => {
    const inner = document.createElement('p');
    inner.textContent = 'Custom content';
    inner.setAttribute('data-testid', 'custom-body');
    const p = create({ displayMode: 'docked', content: inner });
    expect(hostEl.querySelector('[data-testid="custom-body"]')).not.toBeNull();
    p.destroy();
  });

  it('setContent replaces the body content', () => {
    const p = create({ displayMode: 'docked' });
    const first = document.createElement('p');
    first.setAttribute('data-testid', 'first');
    p.setContent(first);
    expect(hostEl.querySelector('[data-testid="first"]')).not.toBeNull();

    const second = document.createElement('p');
    second.setAttribute('data-testid', 'second');
    p.setContent(second);
    expect(hostEl.querySelector('[data-testid="first"]')).toBeNull();
    expect(hostEl.querySelector('[data-testid="second"]')).not.toBeNull();

    p.destroy();
  });

  it('setContent(null) clears the body', () => {
    const p = create({
      displayMode: 'docked',
      content: '<p data-testid="foo">Hi</p>',
    });
    expect(hostEl.querySelector('[data-testid="foo"]')).not.toBeNull();
    p.setContent(null);
    expect(hostEl.querySelector('[data-testid="foo"]')).toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 4. Sticky-header search variants
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- sticky search variants', () => {
  it('stickyHeader.search = true mounts an ArvoSearch', () => {
    const p = create({
      displayMode: 'docked',
      stickyHeader: { search: true },
    });
    const search = hostEl.querySelector('.arvo-pnl__search .arvo-search');
    expect(search).not.toBeNull();
    expect(hostEl.querySelector('.arvo-adv-search')).toBeNull();
    p.destroy();
  });

  it('stickyHeader.search.variant = "advance-search" mounts ArvoAdvanceSearch (default filterBy)', () => {
    const p = create({
      displayMode: 'docked',
      stickyHeader: {
        search: { variant: 'advance-search' },
      },
    });
    expect(
      hostEl.querySelector('.arvo-pnl__search .arvo-adv-search'),
    ).not.toBeNull();
    expect(hostEl.querySelector('.arvo-adv-search--filter-by')).not.toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 5. Rich header
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- rich header', () => {
  it('renders bare HTMLElement rich header content', () => {
    const content = document.createElement('span');
    content.setAttribute('data-testid', 'rh');
    content.textContent = 'Rich content';
    const p = create({ displayMode: 'docked', richHeader: content });
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).not.toBeNull();
    expect(hostEl.querySelector('[data-testid="rh"]')).not.toBeNull();
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr-clear')).toBeNull();
    p.destroy();
  });

  it('renders the clear button and removes the region on click', () => {
    const onClear = vi.fn();
    const content = document.createElement('span');
    content.textContent = 'Info';
    const p = create({
      displayMode: 'docked',
      richHeader: {
        content,
        hasClear: true,
        onClear,
      },
    });
    const clearBtn = hostEl.querySelector<HTMLButtonElement>(
      'button.arvo-pnl__rich-hdr-clear',
    );
    expect(clearBtn).not.toBeNull();
    clearBtn!.click();
    expect(onClear).toHaveBeenCalledTimes(1);
    // Rich header DOM is removed in-place on the JS path
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Visibility
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- visibility', () => {
  it('overlay panel respects defaultOpen=false', () => {
    const p = create({ displayMode: 'overlay', defaultOpen: false });
    expect(hostEl.classList.contains('open')).toBe(false);
    expect(p.isOpen()).toBe(false);
    p.destroy();
  });

  it('overlay panel respects defaultOpen=true', async () => {
    const p = create({ displayMode: 'overlay', defaultOpen: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(p.isOpen()).toBe(true);
    p.destroy();
  });

  it('docked panel always reports open', () => {
    const p = create({ displayMode: 'docked' });
    expect(p.isOpen()).toBe(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. Dismissal (notify-but-no-veto)
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- dismissal-policy (notify-but-no-veto)', () => {
  it('Escape: onClose is called for notification but veto is ignored', async () => {
    const onClose = vi.fn(() => false);
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      onClose,
    });
    await new Promise((r) => setTimeout(r, 50));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(onClose).toHaveBeenCalledWith('escape');
    expect(p.isOpen()).toBe(false);
    p.destroy();
  });

  it('programmatic close honors onClose veto', async () => {
    const onClose = vi.fn(() => false);
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      onClose,
    });
    await new Promise((r) => setTimeout(r, 50));
    p.close('programmatic');
    expect(onClose).toHaveBeenCalledWith('programmatic');
    expect(p.isOpen()).toBe(true);
    p.destroy();
  });

  it('non-modal overlay closes on outside click by default', async () => {
    const onClose = vi.fn();
    const p = create({
      displayMode: 'overlay',
      isModal: false,
      defaultOpen: true,
      onClose,
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(p.isOpen()).toBe(true);
    document.body.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    expect(onClose).toHaveBeenCalledWith('outside-click');
    expect(p.isOpen()).toBe(false);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 8. Expansion
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- expansion', () => {
  it('renders expand button when isExpandable=true', () => {
    const p = create({ displayMode: 'docked', isExpandable: true });
    expect(hostEl.querySelector('[data-action-id="__expand__"]')).not.toBeNull();
    p.destroy();
  });

  it('imperative expanded() toggles the state', () => {
    const onExpandChange = vi.fn();
    const p = create({
      displayMode: 'docked',
      isExpandable: true,
      onExpandChange,
    });
    expect(p.expanded()).toBe(false);
    p.expanded(true);
    expect(p.expanded()).toBe(true);
    expect(onExpandChange).toHaveBeenCalledWith(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 9. Resize
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- resize', () => {
  it('renders the splitter when isResizable=true', () => {
    const p = create({
      displayMode: 'docked',
      isResizable: true,
      minSize: 100,
      maxSize: 500,
    });
    expect(hostEl.querySelector('.arvo-pnl__splitter')).not.toBeNull();
    p.destroy();
  });

  it('imperative size() returns and sets the size', () => {
    const p = create({
      displayMode: 'docked',
      isResizable: true,
      defaultSize: 300,
      minSize: 100,
      maxSize: 500,
    });
    expect(p.size()).toBe(300);
    p.size(420);
    expect(p.size()).toBe(420);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 10. Pin/unpin
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- pin/unpin', () => {
  it('renders pin button when isPinnable=true', () => {
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      isPinnable: true,
    });
    expect(hostEl.querySelector('.arvo-pnl__pin')).not.toBeNull();
    p.destroy();
  });

  it('pnl:pin event fires with new pinned state', () => {
    const onPinChange = vi.fn();
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      isPinnable: true,
      onPinChange,
    });
    const pane = hostEl.querySelector('.arvo-pnl__pane') as HTMLElement;
    const handler = vi.fn();
    pane.addEventListener('pnl:pin', handler as EventListener);
    p.pinned(true);
    expect(onPinChange).toHaveBeenCalledWith(true);
    expect(handler).toHaveBeenCalled();
    const ev = handler.mock.calls[0][0] as CustomEvent;
    expect(ev.detail.pinned).toBe(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 11. Public API surface
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- public API surface', () => {
  it('exposes the full method set', () => {
    const p = create({
      displayMode: 'docked',
      isPinnable: true,
      isExpandable: true,
    });
    expect(typeof p.open).toBe('function');
    expect(typeof p.close).toBe('function');
    expect(typeof p.toggle).toBe('function');
    expect(typeof p.isOpen).toBe('function');
    expect(typeof p.pinned).toBe('function');
    expect(typeof p.expanded).toBe('function');
    expect(typeof p.size).toBe('function');
    expect(typeof p.setDisplayMode).toBe('function');
    expect(typeof p.setStickyHeader).toBe('function');
    expect(typeof p.setHeaderActions).toBe('function');
    expect(typeof p.setActions).toBe('function');
    expect(typeof p.setTitle).toBe('function');
    expect(typeof p.setIcon).toBe('function');
    expect(typeof p.setContent).toBe('function');
    expect(typeof p.search).toBe('function');
    expect(typeof p.selectedTab).toBe('function');
    expect(typeof p.loading).toBe('function');
    expect(typeof p.disabled).toBe('function');
    expect(typeof p.focus).toBe('function');
    expect(typeof p.destroy).toBe('function');
    p.destroy();
  });

  it('destroy() removes all classes and ARIA attrs', () => {
    const p = create({ displayMode: 'docked' });
    p.destroy();
    expect(hostEl.classList.contains('arvo-pnl')).toBe(false);
    expect(hostEl.querySelector('.arvo-pnl__pane')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12. isEdge + Container resolution
// ---------------------------------------------------------------------------

describe('ArvoPanel JS -- isEdge', () => {
  it('applies arvo-pnl--edge when isEdge=true', () => {
    const p = create({ displayMode: 'docked', isEdge: true });
    expect(hostEl.classList.contains('arvo-pnl--edge')).toBe(true);
    p.destroy();
  });
});

describe('ArvoPanel JS -- container resolution', () => {
  let scopeEl: HTMLElement;
  let explicitEl: HTMLElement;

  beforeEach(() => {
    scopeEl = document.createElement('div');
    scopeEl.id = 'pnl-test-scope';
    scopeEl.style.position = 'relative';
    document.body.appendChild(scopeEl);
    explicitEl = document.createElement('div');
    explicitEl.id = 'pnl-explicit';
    explicitEl.style.position = 'relative';
    document.body.appendChild(explicitEl);
  });

  afterEach(() => {
    overlayHub.configure({ containerSelector: 'body' });
    scopeEl.remove();
    explicitEl.remove();
    document
      .querySelectorAll('.arvo-pnl__overlay-mask')
      .forEach((el) => el.remove());
  });

  it('overlay default: attaches to document.body and does NOT apply arvo-pnl--scoped', () => {
    const p = create({ displayMode: 'overlay', defaultOpen: true });
    expect(hostEl.parentElement).toBe(document.body);
    expect(hostEl.classList.contains('arvo-pnl--scoped')).toBe(false);
    p.destroy();
  });

  it('overlay with explicit container wins over setupOverlays', () => {
    overlayHub.configure({ containerSelector: '#pnl-test-scope' });
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      container: explicitEl,
    });
    expect(hostEl.parentElement).toBe(explicitEl);
    expect(hostEl.classList.contains('arvo-pnl--scoped')).toBe(true);
    p.destroy();
  });
});
