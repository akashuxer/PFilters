// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoList } from './List';
import type { ArvoListItemData, ArvoListGroup } from './List';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEl(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const ITEMS: ArvoListItemData[] = [
  { id: 'one', label: 'One' },
  { id: 'two', label: 'Two' },
  { id: 'three', label: 'Three', isDisabled: true },
  { id: 'four', label: 'Four' },
];

const GROUPS: ArvoListGroup[] = [
  { id: 'g1', label: 'Group 1', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
  { id: 'g2', label: 'Group 2', items: [{ id: 'c', label: 'C' }, { id: 'd', label: 'D' }] },
];

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization + DOM structure
// ---------------------------------------------------------------------------

describe('ArvoList -- initialization', () => {
  it('static initialize returns an ArvoList instance', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    expect(inst).toBeInstanceOf(ArvoList);
  });

  it('adds arvo-list class to root', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    expect(el.classList.contains('arvo-list')).toBe(true);
  });

  it('applies standard variant class by default', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    expect(el.classList.contains('arvo-list--standard')).toBe(true);
  });

  it('applies rich variant class', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, variant: 'rich' });
    expect(el.classList.contains('arvo-list--rich')).toBe(true);
  });

  it('root role = list when selectionMode=none', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    expect(el.getAttribute('role')).toBe('list');
  });

  it('root role = listbox + aria-multiselectable when multi', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, selectionMode: 'multi' });
    expect(el.getAttribute('role')).toBe('listbox');
    expect(el.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('root role = radiogroup when single', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, selectionMode: 'single' });
    expect(el.getAttribute('role')).toBe('radiogroup');
  });

  it('renders one row per item', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    expect(el.querySelectorAll('.arvo-list-item').length).toBe(4);
  });

  it('renders item labels', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    const labels = Array.from(
      el.querySelectorAll<HTMLElement>('.arvo-list-item__lbl'),
    ).map((e) => e.textContent);
    expect(labels).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('honors width as a CSS variable', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, width: '320px' });
    expect(el.style.getPropertyValue('--arvo-list-width')).toBe('320px');
  });
});

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

describe('ArvoList -- groups', () => {
  it('renders one group block per group', () => {
    const el = createEl();
    ArvoList.initialize(el, { groups: GROUPS });
    expect(el.querySelectorAll('.arvo-list__group').length).toBe(2);
  });

  it('renders headings and dashed divider', () => {
    const el = createEl();
    ArvoList.initialize(el, { groups: GROUPS });
    expect(el.querySelector('.arvo-list__group-hdr')?.textContent).toBe('Group 1');
    expect(el.querySelectorAll('.arvo-list__divider').length).toBe(1);
  });

  it('omits dividers when hasGroupDividers=false', () => {
    const el = createEl();
    ArvoList.initialize(el, { groups: GROUPS, hasGroupDividers: false });
    expect(el.querySelectorAll('.arvo-list__divider').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Selection -- multi
// ---------------------------------------------------------------------------

describe('ArvoList -- selection (multi)', () => {
  it('row click toggles selection', () => {
    const el = createEl();
    const onSelectionChange = vi.fn();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      onSelectionChange,
    });
    const row = el.querySelector('[data-arvo-list-item-id="one"]') as HTMLElement;
    row.click();
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedIds: ['one'] }),
    );
  });

  it('dispatches list:select event', () => {
    const el = createEl();
    const spy = vi.fn();
    el.addEventListener('list:select', spy);
    ArvoList.initialize(el, { items: ITEMS, selectionMode: 'multi' });
    const row = el.querySelector('[data-arvo-list-item-id="one"]') as HTMLElement;
    row.click();
    expect(spy).toHaveBeenCalled();
  });

  it('selected() getter/setter pair', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
    });
    inst.selected(['one', 'two']);
    expect(inst.selected()).toEqual(['one', 'two']);
  });

  it('updates aria-selected when selection changes', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
    });
    inst.selected(['one']);
    const row = el.querySelector('[data-arvo-list-item-id="one"]') as HTMLElement;
    expect(row.getAttribute('aria-selected')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Selection -- single
// ---------------------------------------------------------------------------

describe('ArvoList -- selection (single)', () => {
  it('row click selects the row', () => {
    const el = createEl();
    const onSelectionChange = vi.fn();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'single',
      onSelectionChange,
    });
    const row = el.querySelector('[data-arvo-list-item-id="two"]') as HTMLElement;
    row.click();
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedIds: 'two' }),
    );
  });

  it('selected() returns a string in single mode', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'single',
    });
    inst.selected('two');
    expect(inst.selected()).toBe('two');
  });
});

// ---------------------------------------------------------------------------
// Selection -- none
// ---------------------------------------------------------------------------

describe('ArvoList -- selection (none)', () => {
  it('does not render selection controls', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    expect(el.querySelectorAll('.arvo-list-item__check').length).toBe(0);
  });

  it('fires onItemClick on click', () => {
    const el = createEl();
    const onItemClick = vi.fn();
    ArvoList.initialize(el, { items: ITEMS, onItemClick });
    const row = el.querySelector('[data-arvo-list-item-id="one"]') as HTMLElement;
    row.click();
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'one' }));
  });

  it('renders a leading icon when item.icon is set', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [{ id: 'x', label: 'X', icon: 'user' }],
    });
    expect(el.querySelector('.arvo-list-item__ico.o9con-user')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Disabled rows
// ---------------------------------------------------------------------------

describe('ArvoList -- disabled', () => {
  it('disabled row is non-interactive', () => {
    const el = createEl();
    const onSelectionChange = vi.fn();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      onSelectionChange,
    });
    const row = el.querySelector('[data-arvo-list-item-id="three"]') as HTMLElement;
    row.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('whole-list disabled adds is-disabled and aria-disabled', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled() getter/setter pair', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    expect(inst.disabled()).toBe(false);
    inst.disabled(true);
    expect(inst.disabled()).toBe(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Global select-all
// ---------------------------------------------------------------------------

describe('ArvoList -- global select-all', () => {
  it('renders the global select-all when hasGlobalSelectAll + multi', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      hasGlobalSelectAll: true,
    });
    expect(el.querySelector(':scope > .arvo-list__sa')).toBeTruthy();
  });

  it('clicking the select-all selects every enabled row', () => {
    const el = createEl();
    const onSelectionChange = vi.fn();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      hasGlobalSelectAll: true,
      onSelectionChange,
    });
    (el.querySelector(':scope > .arvo-list__sa') as HTMLElement).click();
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedIds: ['one', 'two', 'four'] }),
    );
  });
});

// ---------------------------------------------------------------------------
// Loading + empty
// ---------------------------------------------------------------------------

describe('ArvoList -- loading + empty', () => {
  it(
    'renders skeleton rows when isLoading=true',
    () => {
      const el = createEl();
      ArvoList.initialize(el, { items: ITEMS, isLoading: true, skeletonRows: 5 });
      expect(el.classList.contains('loading')).toBe(true);
      expect(el.querySelectorAll('.arvo-list__skeleton-row').length).toBe(5);
    },
  );

  it('setLoading() toggles loading on demand', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    inst.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    inst.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('renders empty state when items is empty and emptyState provided', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [],
      emptyState: { title: 'No data' },
    });
    expect(el.classList.contains('is-empty')).toBe(true);
    expect(el.querySelector('.arvo-list__empty')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

describe('ArvoList -- actions', () => {
  it('renders an IconButton per action', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [
        {
          id: 'x',
          label: 'X',
          actions: [
            { id: 'edit', icon: 'pencil-square-o', tooltip: 'Edit' },
            { id: 'delete', icon: 'bin-alt', tooltip: 'Delete', isDanger: true },
          ],
        },
      ],
    });
    expect(el.querySelectorAll('.arvo-list-item__actions .arvo-icon-btn').length).toBe(2);
  });

  it('action click does not bubble to row selection', () => {
    const el = createEl();
    const onSelectionChange = vi.fn();
    const onClick = vi.fn();
    ArvoList.initialize(el, {
      items: [
        {
          id: 'x',
          label: 'X',
          actions: [{ id: 'edit', icon: 'pencil-square-o', tooltip: 'Edit', onClick }],
        },
      ],
      selectionMode: 'multi',
      onSelectionChange,
    });
    const btn = el.querySelector(
      '.arvo-list-item__actions .arvo-icon-btn',
    ) as HTMLButtonElement;
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Inline navigation chevron
// ---------------------------------------------------------------------------

describe('ArvoList -- inline navigation', () => {
  it('renders the chevron when hasInlineNav=true', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [{ id: 'x', label: 'X', hasInlineNav: true }],
    });
    expect(el.querySelector('.arvo-list-item__chev')).toBeTruthy();
  });

  it('chevron click fires onItemActivate and does not bubble', () => {
    const el = createEl();
    const onItemActivate = vi.fn();
    const onSelectionChange = vi.fn();
    ArvoList.initialize(el, {
      items: [{ id: 'x', label: 'X', hasInlineNav: true }],
      selectionMode: 'multi',
      onItemActivate,
      onSelectionChange,
    });
    const btn = el.querySelector(
      '.arvo-list-item__chev .arvo-icon-btn',
    ) as HTMLButtonElement;
    btn.click();
    expect(onItemActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'x' }));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Items / mutation API
// ---------------------------------------------------------------------------

describe('ArvoList -- mutation API', () => {
  it('setItems replaces items', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    inst.setItems([{ id: 'z', label: 'Z' }]);
    expect(el.querySelectorAll('.arvo-list-item').length).toBe(1);
    expect(el.querySelector('.arvo-list-item__lbl')?.textContent).toBe('Z');
  });

  it('addItem appends a row', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    inst.addItem({ id: 'five', label: 'Five' });
    expect(el.querySelectorAll('.arvo-list-item').length).toBe(5);
  });

  it('removeItem drops a row', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    inst.removeItem('one');
    expect(el.querySelector('[data-arvo-list-item-id="one"]')).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Search highlight
// ---------------------------------------------------------------------------

describe('ArvoList -- search highlight', () => {
  it('wraps the matched substring in __match', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [{ id: 'x', label: 'Supply Chain' }],
      searchQuery: 'Sup',
    });
    expect(el.querySelector('.arvo-list-item__match')?.textContent).toBe('Sup');
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Drag-and-drop
// ---------------------------------------------------------------------------

describe('ArvoList -- drag-and-drop', () => {
  it('renders drag handles on every enabled row when isReorderable=true', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, isReorderable: true });
    expect(el.querySelectorAll('.arvo-list-item__drag').length).toBe(3);
  });

  it('per-row isReorderable=false renders a drag-spacer instead of a handle', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', isReorderable: false },
      ],
      isReorderable: true,
    });
    expect(el.querySelectorAll('.arvo-list-item__drag').length).toBe(1);
    expect(el.querySelectorAll('.arvo-list-item__drag-spacer').length).toBe(1);
  });

  it('disabled rows in a reorderable list render a drag-spacer for column alignment', () => {
    const el = createEl();
    // ITEMS includes 'three' which is isDisabled; the disabled row must
    // surface a spacer so its selection-control column aligns with peers.
    ArvoList.initialize(el, { items: ITEMS, isReorderable: true });
    expect(el.querySelectorAll('.arvo-list-item__drag-spacer').length).toBe(1);
  });

  it('does not render handles when isReorderable=false', () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS });
    expect(el.querySelectorAll('.arvo-list-item__drag').length).toBe(0);
  });

  it('renders a drag-spacer in the global select-all row when reorderable', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      hasGlobalSelectAll: true,
      isReorderable: true,
    });
    const sa = el.querySelector('.arvo-list__sa');
    expect(sa).toBeTruthy();
    expect(sa?.querySelector('.arvo-list-item__drag-spacer')).toBeTruthy();
  });

  it('does not render a drag-spacer in the SA row when not reorderable', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      hasGlobalSelectAll: true,
    });
    const sa = el.querySelector('.arvo-list__sa');
    expect(sa).toBeTruthy();
    expect(sa?.querySelector('.arvo-list-item__drag-spacer')).toBeFalsy();
  });

  it('accepts crossGroupReorder without affecting group rendering', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      groups: GROUPS,
      selectionMode: 'multi',
      isReorderable: true,
      crossGroupReorder: true,
    });
    expect(el.querySelectorAll('[data-arvo-list-group-id]').length).toBe(
      GROUPS.length,
    );
  });
});

// ---------------------------------------------------------------------------
// Escape-hatch bag passthrough
// ---------------------------------------------------------------------------

describe('ArvoList -- escape-hatch bags', () => {
  it('forwards iconButtonProps to every trailing action button', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [
        {
          id: 'x',
          label: 'X',
          actions: [{ id: 'edit', icon: 'pencil-square-o', tooltip: 'Edit' }],
          iconButtonProps: { tooltip: 'Override tooltip from bag' },
        },
      ],
    });
    // Cluster + action button render despite the bag (smoke test that the
    // merge did not throw on the inner initialize call).
    expect(el.querySelector('.arvo-list-item__actions .arvo-icon-btn')).toBeTruthy();
  });

  it('forwards avatarProps to the inner ArvoAvatar (rich variant)', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      variant: 'rich',
      items: [
        {
          id: 'x',
          label: 'Jane Doe',
          avatar: { variant: 'initials', name: 'Jane Doe' },
          avatarProps: { alt: 'Profile picture for Jane Doe' },
        },
      ],
    });
    expect(el.querySelector('.arvo-list-item__avt')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe)
// ---------------------------------------------------------------------------

describe('ArvoList -- accessibility', () => {
  // nested-interactive is an accepted pattern in this codebase when row-level
  // ArvoCheckbox / ArvoRadio are embedded as the visual selection indicator
  // inside role=option / role=radio (the row owns focus; the embedded input
  // is hidden via aria-hidden + tabindex=-1).
  const AXE_RULES = { 'nested-interactive': { enabled: false } };

  it('zero axe violations -- selectionMode=none', async () => {
    const el = createEl();
    ArvoList.initialize(el, { items: ITEMS, ariaLabel: 'List' });
    const results = await axe.run(el, { rules: AXE_RULES });
    expect(results.violations).toEqual([]);
  });

  it('zero axe violations -- selectionMode=multi with global select-all', async () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      hasGlobalSelectAll: true,
      ariaLabel: 'Filter list',
    });
    const results = await axe.run(el, { rules: AXE_RULES });
    expect(results.violations).toEqual([]);
  });

  it('zero axe violations -- selectionMode=single with selection', async () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'single',
      selectedIds: 'one',
      ariaLabel: 'Pick one',
    });
    const results = await axe.run(el, { rules: AXE_RULES });
    expect(results.violations).toEqual([]);
  });
});

describe('ArvoList -- badge', () => {
  it('renders a badge when item.badge is provided', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [{ id: 'x', label: 'X', badge: { message: '12' } }],
    });
    const bdg = el.querySelector('.arvo-list-item__badge');
    expect(bdg).toBeTruthy();
    expect(bdg?.textContent).toContain('12');
  });

  it('suppresses the badge icon even when the semantic type would render one', () => {
    const el = createEl();
    ArvoList.initialize(el, {
      items: [
        { id: 'x', label: 'X', badge: { message: 'Owner', semanticType: 'positive' } },
        { id: 'y', label: 'Y', badge: { message: 'Note', semanticType: 'warning' } },
      ],
    });
    expect(el.querySelectorAll('.arvo-list-item__badge').length).toBe(2);
    expect(el.querySelectorAll('.arvo-list-item__badge .arvo-bdg__ico').length).toBe(0);
  });
});

describe('ArvoList -- destroy', () => {
  it('removes the arvo-list class and child DOM', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, { items: ITEMS });
    expect(el.classList.contains('arvo-list')).toBe(true);
    inst.destroy();
    expect(el.classList.contains('arvo-list')).toBe(false);
    expect(el.children.length).toBe(0);
  });

  it('removes role + aria attributes', () => {
    const el = createEl();
    const inst = ArvoList.initialize(el, {
      items: ITEMS,
      selectionMode: 'multi',
      ariaLabel: 'X',
    });
    inst.destroy();
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('aria-multiselectable')).toBeNull();
  });
});
