import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ArvoFilterPanel,
  type ArvoFilterPanelOptions,
  type ArvoPanelFilterGroup,
} from './FilterPanel';
import type { ArvoListItemData } from '../List/List';

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

const FLAT_ITEMS: ArvoListItemData[] = [
  { id: 'r1', label: 'Americas' },
  { id: 'r2', label: 'EMEA' },
  { id: 'r3', label: 'APAC' },
];

const GROUPS: ArvoPanelFilterGroup[] = [
  {
    id: 'region',
    title: 'Region',
    items: [
      { id: 'r1', label: 'Americas' },
      { id: 'r2', label: 'EMEA' },
    ],
  },
  {
    id: 'category',
    title: 'Category',
    items: [
      { id: 'c1', label: 'Alpha' },
      { id: 'c2', label: 'Beta' },
    ],
  },
];

let hostEl: HTMLElement;

function create(options: Partial<ArvoFilterPanelOptions> = {}): ArvoFilterPanel {
  return ArvoFilterPanel.initialize(hostEl, {
    ariaLabel: 'Filters',
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
// 1. Rendering + host modifiers
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- rendering', () => {
  it('writes filter-{view} + select-{mode} modifiers on the host', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      filterView: 'flat',
      selectionMode: 'multiple',
    });
    expect(hostEl.classList.contains('arvo-pnl--type-filter')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--filter-flat')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--select-multiple')).toBe(true);
    p.destroy();
  });

  it('renders inner ArvoList with all items (flat)', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      filterView: 'flat',
      selectionMode: 'single',
    });
    expect(hostEl.querySelectorAll('[data-arvo-list-item-id]').length).toBe(3);
    p.destroy();
  });

  it('renders one accordion + all rows (grouped)', () => {
    const p = create({
      displayMode: 'docked',
      groups: GROUPS,
      filterView: 'grouped',
      selectionMode: 'multiple',
    });
    expect(hostEl.querySelectorAll('.arvo-acc').length).toBe(1);
    expect(hostEl.querySelectorAll('[data-arvo-list-item-id]').length).toBe(4);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 2. Selection (single, multi, grouped)
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- selection', () => {
  it('flat single: fires onSelectionChange + pnl:filter-change', () => {
    const onSelectionChange = vi.fn();
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      filterView: 'flat',
      selectionMode: 'single',
      onSelectionChange,
    });
    const pane = hostEl.querySelector('.arvo-pnl__pane') as HTMLElement;
    const handler = vi.fn();
    pane.addEventListener('pnl:filter-change', handler as EventListener);
    hostEl.querySelector<HTMLElement>('[data-arvo-list-item-id="r2"]')!.click();
    expect(onSelectionChange).toHaveBeenCalledWith(['r2']);
    expect(handler).toHaveBeenCalled();
    p.destroy();
  });

  it('flat multiple: accumulates selection', () => {
    const onSelectionChange = vi.fn();
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      filterView: 'flat',
      selectionMode: 'multiple',
      onSelectionChange,
    });
    hostEl.querySelector<HTMLElement>('[data-arvo-list-item-id="r1"]')!.click();
    hostEl.querySelector<HTMLElement>('[data-arvo-list-item-id="r3"]')!.click();
    const last =
      onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
    expect(last).toContain('r1');
    expect(last).toContain('r3');
    p.destroy();
  });

  it('grouped multiple: consolidates section selection into flat selectedIds', () => {
    const onSelectionChange = vi.fn();
    const p = create({
      displayMode: 'docked',
      groups: GROUPS,
      filterView: 'grouped',
      selectionMode: 'multiple',
      defaultSelectedIds: ['r1'],
      onSelectionChange,
    });
    hostEl.querySelector<HTMLElement>('[data-arvo-list-item-id="c1"]')!.click();
    const call = onSelectionChange.mock.calls[0][0];
    expect(call).toContain('r1');
    expect(call).toContain('c1');
    p.destroy();
  });

  it('setSelectedIds imperatively updates the selection', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      filterView: 'flat',
      selectionMode: 'multiple',
    });
    p.setSelectedIds(['r2']);
    const r2 = hostEl.querySelector<HTMLElement>(
      '[data-arvo-list-item-id="r2"]',
    )!;
    expect(r2.getAttribute('aria-checked') === 'true' ||
      r2.getAttribute('aria-selected') === 'true').toBe(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 3. setFilterView + setSelectionMode
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- imperative view + mode swap', () => {
  it('setFilterView swaps the extra host classes and rebuilds the body', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      groups: GROUPS,
      filterView: 'flat',
      selectionMode: 'multiple',
    });
    expect(hostEl.classList.contains('arvo-pnl--filter-flat')).toBe(true);
    // Provide groups for the grouped view before switching.
    p.setGroups(GROUPS);
    p.setFilterView('grouped');
    expect(hostEl.classList.contains('arvo-pnl--filter-flat')).toBe(false);
    expect(hostEl.classList.contains('arvo-pnl--filter-grouped')).toBe(true);
    expect(hostEl.querySelectorAll('.arvo-acc').length).toBe(1);
    p.destroy();
  });

  it('setSelectionMode swaps the extra host classes', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      filterView: 'flat',
      selectionMode: 'multiple',
    });
    p.setSelectionMode('single');
    expect(hostEl.classList.contains('arvo-pnl--select-multiple')).toBe(false);
    expect(hostEl.classList.contains('arvo-pnl--select-single')).toBe(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 4. Sticky-search forwarding
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- sticky-search forwarding', () => {
  it('forwards the query into each inner ArvoList (grouped)', () => {
    const p = create({
      displayMode: 'docked',
      groups: GROUPS,
      filterView: 'grouped',
      selectionMode: 'multiple',
      stickyHeader: { search: true },
    });
    const input = hostEl.querySelector<HTMLInputElement>(
      'input[type="search"], input[type="text"]',
    )!;
    input.value = 'Ame';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(hostEl.querySelector('.arvo-list-item__match')).not.toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 5. Rich header
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- rich header', () => {
  it('fires onClear + removes the region', () => {
    const onClear = vi.fn();
    const content = document.createElement('span');
    content.textContent = '1 applied';
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      richHeader: { content, hasClear: true, onClear },
    });
    const clearBtn = hostEl.querySelector<HTMLButtonElement>(
      'button.arvo-pnl__rich-hdr-clear',
    );
    clearBtn!.click();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Modes + pinnable
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- modes', () => {
  it('renders overlay + role=dialog when defaultOpen=true', () => {
    const p = create({
      displayMode: 'overlay',
      isModal: true,
      defaultOpen: true,
      items: FLAT_ITEMS,
    });
    const pane = hostEl.querySelector('.arvo-pnl__pane')!;
    expect(pane.getAttribute('role')).toBe('dialog');
    p.destroy();
  });

  it('fires pnl:pin when pinned() is called', () => {
    const onPinChange = vi.fn();
    const p = create({
      displayMode: 'overlay',
      defaultOpen: true,
      items: FLAT_ITEMS,
      isPinnable: true,
      onPinChange,
    });
    p.pinned(true);
    expect(onPinChange).toHaveBeenCalledWith(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 8. Optional resizing
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- resizable', () => {
  it('mounts the splitter when isResizable=true', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      isResizable: true,
      defaultSize: 400,
      minSize: 320,
      maxSize: 800,
    });
    expect(hostEl.classList.contains('arvo-pnl--resizable')).toBe(true);
    p.destroy();
  });

  it('exposes size() getter + setter when resizable', () => {
    const p = create({
      displayMode: 'docked',
      items: FLAT_ITEMS,
      isResizable: true,
      defaultSize: 400,
      minSize: 320,
      maxSize: 800,
    });
    expect(typeof p.size).toBe('function');
    p.size(480);
    expect(p.size()).toBe(480);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// 9. Public API
// ---------------------------------------------------------------------------

describe('ArvoFilterPanel JS -- public API', () => {
  it('exposes the required method set (size present; no expanded)', () => {
    const p = create({ displayMode: 'docked', items: FLAT_ITEMS });
    for (const name of [
      'open',
      'close',
      'toggle',
      'isOpen',
      'pinned',
      'setDisplayMode',
      'setStickyHeader',
      'setHeaderActions',
      'setActions',
      'setTitle',
      'setIcon',
      'setRichHeader',
      'setItems',
      'setGroups',
      'setSelectedIds',
      'setFilterView',
      'setSelectionMode',
      'search',
      'selectedTab',
      'loading',
      'disabled',
      'focus',
      'size',
      'destroy',
    ]) {
      expect(
        typeof (p as unknown as Record<string, unknown>)[name],
      ).toBe('function');
    }
    expect((p as unknown as Record<string, unknown>).expanded).toBeUndefined();
    p.destroy();
  });

  it('destroy cleans up all classes and DOM', () => {
    const p = create({ displayMode: 'docked', items: FLAT_ITEMS });
    p.destroy();
    expect(hostEl.classList.contains('arvo-pnl')).toBe(false);
    expect(hostEl.querySelector('.arvo-pnl__pane')).toBeNull();
  });
});
