import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoNavPanel, type ArvoNavPanelOptions } from './NavPanel';
import type { ArvoNavItemData } from '../Nav/Nav';

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

const NAV_ITEMS: ArvoNavItemData[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'reports', label: 'Reports', icon: 'file-text' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
];

let hostEl: HTMLElement;

function create(options: Partial<ArvoNavPanelOptions> = {}): ArvoNavPanel {
  return ArvoNavPanel.initialize(hostEl, {
    ariaLabel: 'Nav',
    items: NAV_ITEMS,
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
// 1. Rendering + inner Nav
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- rendering', () => {
  it('renders host with arvo-pnl + type-navigation modifier', () => {
    const p = create({ displayMode: 'docked' });
    expect(hostEl.classList.contains('arvo-pnl')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--type-navigation')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--mode-docked')).toBe(true);
    p.destroy();
  });

  it('renders __pane with role=navigation for docked mode', () => {
    const p = create({ displayMode: 'docked' });
    const pane = hostEl.querySelector('.arvo-pnl__pane')!;
    expect(pane.getAttribute('role')).toBe('navigation');
    p.destroy();
  });

  it('renders the inner ArvoNav with all items', () => {
    const p = create({ displayMode: 'docked' });
    expect(hostEl.querySelectorAll('[data-nav-item-id]').length).toBe(3);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 2. Placement narrowed
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- placement', () => {
  it.each(['left', 'right'] as const)(
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
// 3. Activation
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- activation', () => {
  it('fires onActivate + pnl:nav-activate when a row is clicked', () => {
    const onActivate = vi.fn();
    const p = create({ displayMode: 'docked', onActivate });
    const pane = hostEl.querySelector('.arvo-pnl__pane') as HTMLElement;
    const handler = vi.fn();
    pane.addEventListener('pnl:nav-activate', handler as EventListener);
    const reports = hostEl.querySelector<HTMLElement>(
      '[data-nav-item-id="reports"]',
    )!;
    reports.click();
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][0]).toEqual({
      id: 'reports',
      item: expect.objectContaining({ id: 'reports' }),
    });
    expect(handler).toHaveBeenCalled();
    const ev = handler.mock.calls[0][0] as CustomEvent;
    expect(ev.detail.id).toBe('reports');
    p.destroy();
  });

  it('setActiveId updates the inner Nav', () => {
    const p = create({ displayMode: 'docked', defaultActiveId: 'home' });
    p.setActiveId('reports');
    // Nav items without `href` render as buttons -- selection surfaces
    // as `aria-pressed="true"` on the button node.
    const reports = hostEl.querySelector<HTMLElement>(
      '[data-nav-item-id="reports"]',
    )!;
    expect(reports.getAttribute('aria-pressed')).toBe('true');
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 4. Sticky-search filtering
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- sticky-search filtering', () => {
  it('re-filters via runItemFilter when a query enters via the search input', () => {
    // PanelShell (JS) does NOT seed the search input from
    // `stickyHeader.search.defaultValue` today (pre-existing parity gap
    // with React). Drive the query via the input's `input` + `blur`
    // events instead.
    const p = create({
      displayMode: 'docked',
      stickyHeader: { search: true },
    });
    expect(hostEl.querySelectorAll('[data-nav-item-id]').length).toBe(3);
    const input = hostEl.querySelector<HTMLInputElement>(
      'input[type="search"], input[type="text"]',
    )!;
    input.value = 'sett';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(hostEl.querySelectorAll('[data-nav-item-id]').length).toBe(1);
    expect(hostEl.querySelector('[data-nav-item-id="settings"]')).not.toBeNull();
    p.destroy();
  });

  it('setItems() re-filters against the current query', () => {
    const p = create({
      displayMode: 'docked',
      stickyHeader: { search: true },
    });
    // Prime the query via the input.
    const input = hostEl.querySelector<HTMLInputElement>(
      'input[type="search"], input[type="text"]',
    )!;
    input.value = 'ho';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(hostEl.querySelectorAll('[data-nav-item-id]').length).toBe(1);
    p.setItems([
      ...NAV_ITEMS,
      { id: 'holidays', label: 'Holidays', icon: 'calendar' },
    ]);
    expect(hostEl.querySelectorAll('[data-nav-item-id]').length).toBe(2);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 5. Rich header
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- rich header', () => {
  it('renders bare HTMLElement rich header content', () => {
    const content = document.createElement('span');
    content.setAttribute('data-testid', 'rh');
    content.textContent = 'Workspace: Q1';
    const p = create({ displayMode: 'docked', richHeader: content });
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).not.toBeNull();
    expect(hostEl.querySelector('[data-testid="rh"]')).not.toBeNull();
    p.destroy();
  });

  it('fires onClear + removes rich-header DOM when clear button is clicked', () => {
    const onClear = vi.fn();
    const content = document.createElement('span');
    content.textContent = 'Chip';
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
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Overlay + pinning
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- modes', () => {
  it('renders __pane with role=dialog + aria-modal for overlay modal', () => {
    const p = create({ displayMode: 'overlay', isModal: true, defaultOpen: true });
    const pane = hostEl.querySelector('.arvo-pnl__pane')!;
    expect(pane.getAttribute('role')).toBe('dialog');
    expect(pane.getAttribute('aria-modal')).toBe('true');
    p.destroy();
  });

  it('renders pin button when isPinnable=true', () => {
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      isPinnable: true,
    });
    expect(hostEl.querySelector('.arvo-pnl__pin')).not.toBeNull();
    p.destroy();
  });

  it('fires pnl:pin when pinned() is called', () => {
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
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. Compact rail + size
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- compact rail', () => {
  it('applies arvo-pnl--compact + arvo-pnl--size-{size} on init', () => {
    const p = create({ displayMode: 'docked', isCompact: true, size: 'md' });
    expect(hostEl.classList.contains('arvo-pnl--compact')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--size-md')).toBe(true);
    p.destroy();
  });

  it.each(['sm', 'md', 'lg'] as const)(
    'writes size modifier for size=%s',
    (size) => {
      const p = create({ displayMode: 'docked', isCompact: true, size });
      expect(hostEl.classList.contains(`arvo-pnl--size-${size}`)).toBe(true);
      p.destroy();
    },
  );

  it('inner Nav row is marked compact and carries aria-label from label', () => {
    const p = create({ displayMode: 'docked', isCompact: true });
    const row = hostEl.querySelector<HTMLElement>(
      '[data-nav-item-id="reports"]',
    )!;
    expect(row.classList.contains('arvo-nav-item--compact')).toBe(true);
    expect(row.getAttribute('aria-label')).toBe('Reports');
    expect(row.getAttribute('title')).toBe('Reports');
    p.destroy();
  });

  it('setCompact toggles the compact class + cascades to Nav', () => {
    const p = create({ displayMode: 'docked' });
    expect(hostEl.classList.contains('arvo-pnl--compact')).toBe(false);
    p.setCompact(true);
    expect(hostEl.classList.contains('arvo-pnl--compact')).toBe(true);
    const row = hostEl.querySelector<HTMLElement>(
      '[data-nav-item-id="home"]',
    )!;
    expect(row.classList.contains('arvo-nav-item--compact')).toBe(true);
    p.setCompact(false);
    expect(hostEl.classList.contains('arvo-pnl--compact')).toBe(false);
    p.destroy();
  });

  it('setSize swaps the size modifier + cascades to Nav', () => {
    const p = create({ displayMode: 'docked', size: 'md' });
    expect(hostEl.classList.contains('arvo-pnl--size-md')).toBe(true);
    p.setSize('lg');
    expect(hostEl.classList.contains('arvo-pnl--size-lg')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--size-md')).toBe(false);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 8. Disabled + Loading
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- state', () => {
  it('applies is-disabled class when isDisabled=true', () => {
    const p = create({ displayMode: 'docked', isDisabled: true });
    expect(hostEl.classList.contains('is-disabled')).toBe(true);
    p.destroy();
  });

  it('accepts isLoading without throwing', () => {
    // Pattern-B loading class is gated by the global
    const p = create({ displayMode: 'docked', isLoading: true });
    expect(hostEl.classList.contains('arvo-pnl')).toBe(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 9. Public API surface
// ---------------------------------------------------------------------------

describe('ArvoNavPanel JS -- public API', () => {
  it('exposes the required method set (no `expanded`)', () => {
    const p = create({ displayMode: 'docked', isPinnable: true });
    expect(typeof p.open).toBe('function');
    expect(typeof p.close).toBe('function');
    expect(typeof p.toggle).toBe('function');
    expect(typeof p.isOpen).toBe('function');
    expect(typeof p.pinned).toBe('function');
    expect(typeof p.setDisplayMode).toBe('function');
    expect(typeof p.setStickyHeader).toBe('function');
    expect(typeof p.setHeaderActions).toBe('function');
    expect(typeof p.setActions).toBe('function');
    expect(typeof p.setTitle).toBe('function');
    expect(typeof p.setIcon).toBe('function');
    expect(typeof p.setRichHeader).toBe('function');
    expect(typeof p.setItems).toBe('function');
    expect(typeof p.setActiveId).toBe('function');
    expect(typeof p.setCompact).toBe('function');
    expect(typeof p.setSize).toBe('function');
    expect(typeof p.search).toBe('function');
    expect(typeof p.selectedTab).toBe('function');
    expect(typeof p.loading).toBe('function');
    expect(typeof p.disabled).toBe('function');
    expect(typeof p.focus).toBe('function');
    expect(typeof p.destroy).toBe('function');
    // No `expanded()` on NavPanel (kept off the specialized panel).
    expect((p as unknown as Record<string, unknown>).expanded).toBeUndefined();
    p.destroy();
  });

  it('destroy() removes all classes and cleans up', () => {
    const p = create({ displayMode: 'docked' });
    p.destroy();
    expect(hostEl.classList.contains('arvo-pnl')).toBe(false);
    expect(hostEl.querySelector('.arvo-pnl__pane')).toBeNull();
  });
});
