// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoTreeView } from './TreeView';
import type { ArvoTreeItem } from './TreeView';

// jsdom shims
Element.prototype.scrollIntoView = vi.fn();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sample: ArvoTreeItem[] = [
  {
    id: 'documents',
    label: 'Documents',
    icon: 'folder',
    children: [
      {
        id: 'reports',
        label: 'Reports',
        children: [
          { id: 'q1', label: 'Q1' },
          { id: 'q2', label: 'Q2' },
        ],
      },
      { id: 'memo', label: 'Memo' },
    ],
  },
  { id: 'photos', label: 'Photos', children: [] },
  { id: 'readme', label: 'README' },
];

function mount(options: Partial<ConstructorParameters<typeof ArvoTreeView>[1]> = {}): {
  el: HTMLElement;
  inst: ArvoTreeView;
} {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const inst = ArvoTreeView.initialize(el, {
    items: sample,
    ariaLabel: 'Files',
    ...options,
  });
  return { el, inst };
}

let mounted: HTMLElement | null = null;

afterEach(() => {
  if (mounted) {
    document.body.removeChild(mounted);
    mounted = null;
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArvoTreeView (JS) -- rendering', () => {
  it('renders the role=tree container with the aria-label', () => {
    const { el, inst } = mount();
    mounted = el;
    expect(el.getAttribute('role')).toBe('tree');
    expect(el.getAttribute('aria-label')).toBe('Files');
    inst.destroy();
  });

  it('renders top-level rows only when nothing is expanded', () => {
    const { el, inst } = mount();
    mounted = el;
    const rows = el.querySelectorAll('[role="treeitem"]');
    expect(rows).toHaveLength(3);
    inst.destroy();
  });

  it('renders the empty-state body when items=[]', () => {
    const { el, inst } = mount({ items: [] });
    mounted = el;
    expect(el.querySelectorAll('[role="treeitem"]')).toHaveLength(0);
    expect(el.textContent).toMatch(/No Items Available/i);
    inst.destroy();
  });

  it('respects defaultExpandedIds', () => {
    const { el, inst } = mount({ defaultExpandedIds: ['documents'] });
    mounted = el;
    expect(el.textContent).toContain('Reports');
    expect(el.textContent).toContain('Memo');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- aria-level / setsize / posinset', () => {
  it('encodes hierarchy on every row', () => {
    const { el, inst } = mount({ defaultExpandedIds: ['documents'] });
    mounted = el;
    const documents = el.querySelector('#'.concat(el.id, '-row-documents'));
    const reports = el.querySelector('#'.concat(el.id, '-row-reports'));
    expect(documents?.getAttribute('aria-level')).toBe('1');
    expect(documents?.getAttribute('aria-setsize')).toBe('3');
    expect(documents?.getAttribute('aria-posinset')).toBe('1');
    expect(reports?.getAttribute('aria-level')).toBe('2');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- selection (single)', () => {
  it('clicking a row selects it; aria-selected flips', () => {
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({ variant: 'singleSelect', onSelectionChange });
    mounted = el;
    const readme = el.querySelector<HTMLElement>(
      '#'.concat(el.id, '-row-readme'),
    )!;
    readme.click();
    expect(onSelectionChange).toHaveBeenCalledWith(
      ['readme'],
      expect.objectContaining({ isSelected: true }),
    );
    expect(
      el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!
        .getAttribute('aria-selected'),
    ).toBe('true');
    inst.destroy();
  });

  it('dispatches a cancellable tree:select event', () => {
    const handler = vi.fn();
    const { el, inst } = mount({ variant: 'singleSelect' });
    mounted = el;
    el.addEventListener('tree:select', handler);
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!.click();
    expect(handler).toHaveBeenCalled();
    expect((handler.mock.calls[0][0] as CustomEvent).cancelable).toBe(true);
    inst.destroy();
  });

  it('selected() getter and setter work', () => {
    const { el, inst } = mount({ variant: 'singleSelect' });
    mounted = el;
    inst.selected(['readme']);
    expect(inst.selected()).toEqual(['readme']);
    expect(
      el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!
        .getAttribute('aria-selected'),
    ).toBe('true');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- selection (multiple)', () => {
  it('uses aria-checked + aria-multiselectable', () => {
    const { el, inst } = mount({
      variant: 'multiSelect',
      defaultSelectedIds: ['readme'],
    });
    mounted = el;
    expect(el.getAttribute('aria-multiselectable')).toBe('true');
    expect(
      el.querySelector('#'.concat(el.id, '-row-readme'))!
        .getAttribute('aria-checked'),
    ).toBe('true');
    inst.destroy();
  });

  it('selecting a parent via its checkbox cascades to descendants', () => {
    // Spec section 6.2: in multi-select mode the row body never toggles
    // selection -- only the checkbox does. Click the actual <input>.
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({
      variant: 'multiSelect',
      defaultExpandedIds: ['documents'],
      onSelectionChange,
    });
    mounted = el;
    const documentsRow = el.querySelector<HTMLElement>(
      '#'.concat(el.id, '-row-documents'),
    )!;
    const cb = documentsRow.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    cb.click();
    const ids = onSelectionChange.mock.calls.at(-1)![0] as string[];
    expect(ids).toContain('documents');
    expect(ids).toContain('memo');
    inst.destroy();
  });

  it('row body click on a parent in multi-select toggles expansion, not selection', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const { el, inst } = mount({
      variant: 'multiSelect',
      onSelectionChange,
      onExpandedChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-documents'))!.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).toHaveBeenCalledWith(
      ['documents'],
      expect.objectContaining({ isExpanded: true }),
    );
    inst.destroy();
  });

  it('row body click on a leaf in multi-select is a no-op', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const { el, inst } = mount({
      variant: 'multiSelect',
      onSelectionChange,
      onExpandedChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('cascade skips disabled descendants', () => {
    const onSelectionChange = vi.fn();
    const items: ArvoTreeItem[] = [
      {
        id: 'parent',
        label: 'Parent',
        children: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', isDisabled: true },
          { id: 'c', label: 'C' },
        ],
      },
    ];
    const { el, inst } = mount({
      items,
      variant: 'multiSelect',
      defaultExpandedIds: ['parent'],
      onSelectionChange,
    });
    mounted = el;
    const parentRow = el.querySelector<HTMLElement>(
      '#'.concat(el.id, '-row-parent'),
    )!;
    const cb = parentRow.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    cb.click();
    const ids = onSelectionChange.mock.calls.at(-1)![0] as string[];
    expect(ids).toContain('parent');
    expect(ids).toContain('a');
    expect(ids).toContain('c');
    expect(ids).not.toContain('b');
    inst.destroy();
  });

  it('indeterminate ignores disabled descendants', () => {
    const items: ArvoTreeItem[] = [
      {
        id: 'parent',
        label: 'Parent',
        children: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', isDisabled: true },
        ],
      },
    ];
    const { el, inst } = mount({
      items,
      variant: 'multiSelect',
      defaultExpandedIds: ['parent'],
      defaultSelectedIds: ['a'],
    });
    mounted = el;
    const parent = el.querySelector<HTMLElement>(
      '#'.concat(el.id, '-row-parent'),
    )!;
    expect(parent.getAttribute('aria-checked')).toBe('true');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- expansion', () => {
  it('expand() and collapse() toggle a parent', () => {
    const { el, inst } = mount();
    mounted = el;
    inst.expand('documents');
    expect(inst.expanded()).toContain('documents');
    expect(el.textContent).toContain('Reports');
    inst.collapse('documents');
    expect(inst.expanded()).not.toContain('documents');
    inst.destroy();
  });

  it('dispatches tree:expand', () => {
    const handler = vi.fn();
    const { el, inst } = mount();
    mounted = el;
    el.addEventListener('tree:expand', handler);
    inst.expand('documents');
    expect(handler).toHaveBeenCalled();
    inst.destroy();
  });

  it('toggleExpansion flips state', () => {
    const { el, inst } = mount();
    mounted = el;
    inst.toggleExpansion('documents');
    expect(inst.expanded()).toContain('documents');
    inst.toggleExpansion('documents');
    expect(inst.expanded()).not.toContain('documents');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- async loading', () => {
  it('expanding a row whose children are null triggers onLoadChildren', async () => {
    const onLoadChildren = vi.fn(async () => [
      { id: 'lazy-1', label: 'Lazy 1' },
    ]);
    const items: ArvoTreeItem[] = [
      { id: 'lazy', label: 'Lazy parent', children: null },
    ];
    const { el, inst } = mount({ items, onLoadChildren });
    mounted = el;
    inst.expand('lazy');
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- loading', () => {
  it('renders the skeleton when isLoading=true', () => {
    const { el, inst } = mount({ isLoading: true });
    mounted = el;
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.arvo-tree__skeleton')).toBeTruthy();
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- search highlight', () => {
  it('wraps matched substring in __label-match', () => {
    const { el, inst } = mount({ searchQuery: 'ME' });
    mounted = el;
    const matches = el.querySelectorAll('.arvo-tree__label-match');
    expect(matches.length).toBeGreaterThan(0);
    inst.destroy();
  });

  it('applies row-level --search-highlight only to matching rows', () => {
    const { el, inst } = mount({
      searchQuery: 'emo',
      defaultExpandedIds: ['documents'],
    });
    mounted = el;
    const highlighted = el.querySelectorAll('.arvo-tree__item--search-highlight');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain('Memo');
    inst.destroy();
  });

  it('clears the row-level modifier when the search query is reset to empty', () => {
    const { el, inst } = mount({ searchQuery: 'DO' });
    mounted = el;
    expect(
      el.querySelectorAll('.arvo-tree__item--search-highlight').length,
    ).toBeGreaterThan(0);
    inst.setSearchQuery('');
    expect(
      el.querySelectorAll('.arvo-tree__item--search-highlight').length,
    ).toBe(0);
    inst.destroy();
  });

  it('per-item isSearchMatch overrides the auto-derived match', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', isSearchMatch: true },
      { id: 'b', label: 'Beta', isSearchMatch: false },
    ];
    const { el, inst } = mount({ items, searchQuery: 'et' });
    mounted = el;
    const alpha = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    const beta = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!;
    expect(alpha.classList.contains('arvo-tree__item--search-highlight')).toBe(true);
    expect(beta.classList.contains('arvo-tree__item--search-highlight')).toBe(false);
    inst.destroy();
  });

  it('setSearchQuery() updates the highlight reactively', () => {
    const { el, inst } = mount();
    mounted = el;
    expect(el.querySelectorAll('.arvo-tree__label-match').length).toBe(0);

    inst.setSearchQuery('ME');
    expect(el.querySelectorAll('.arvo-tree__label-match').length).toBeGreaterThan(0);

    inst.setSearchQuery('');
    expect(el.querySelectorAll('.arvo-tree__label-match').length).toBe(0);
    inst.destroy();
  });

  it('setSearchQuery() is a no-op when the query is unchanged', () => {
    const { el, inst } = mount({ searchQuery: 'q' });
    mounted = el;
    const before = el.innerHTML;
    inst.setSearchQuery('q');
    expect(el.innerHTML).toBe(before);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- A8 lazy-load selection inheritance', () => {
  it('newly-loaded descendants inherit a selected parent (multi-select)', () => {
    const onSelectionChange = vi.fn();
    const items: ArvoTreeItem[] = [
      { id: 'p', label: 'Parent', children: null },
    ];
    const { el, inst } = mount({
      items,
      variant: 'multiSelect',
      defaultSelectedIds: ['p'],
      defaultExpandedIds: ['p'],
      onSelectionChange,
    });
    mounted = el;
    inst.updateItem('p', {
      children: [
        { id: 'c1', label: 'C1' },
        { id: 'c2', label: 'C2' },
      ],
    });
    const ids = onSelectionChange.mock.calls.at(-1)![0] as string[];
    expect(ids).toContain('p');
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
    inst.destroy();
  });

  it('does NOT cascade into a parent that was previously mixed', () => {
    const onSelectionChange = vi.fn();
    const items: ArvoTreeItem[] = [
      {
        id: 'p',
        label: 'Parent',
        children: [
          { id: 'c1', label: 'C1' },
          { id: 'c2', label: 'C2' },
        ],
      },
    ];
    const { el, inst } = mount({
      items,
      variant: 'multiSelect',
      defaultSelectedIds: ['p', 'c1'],
      defaultExpandedIds: ['p'],
      onSelectionChange,
    });
    mounted = el;
    onSelectionChange.mockReset();
    inst.updateItem('p', {
      children: [
        { id: 'c1', label: 'C1' },
        { id: 'c2', label: 'C2' },
        { id: 'c3', label: 'C3' },
      ],
    });
    expect(onSelectionChange).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('does NOT cascade in single-select mode', () => {
    const onSelectionChange = vi.fn();
    const items: ArvoTreeItem[] = [
      { id: 'p', label: 'Parent', children: null },
    ];
    const { el, inst } = mount({
      items,
      defaultSelectedIds: ['p'],
      onSelectionChange,
    });
    mounted = el;
    inst.updateItem('p', { children: [{ id: 'c1', label: 'C1' }] });
    expect(onSelectionChange).not.toHaveBeenCalled();
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- A12 focus restoration after mutation', () => {
  it('falls back to the next sibling when the focused row is deleted', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const bRow = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!;
    bRow.focus();
    expect(document.activeElement).toBe(bRow);
    inst.setItems([
      { id: 'a', label: 'A' },
      { id: 'c', label: 'C' },
    ]);
    // The previously-focused 'b' is gone -- focus should land on a
    // sibling at the same index position ('c' is now at index 1).
    const newRow = document.activeElement as HTMLElement;
    expect(newRow.id).toMatch(/-row-c$/);
    inst.destroy();
  });

  it('falls back to the previous sibling when the last row is deleted', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!.focus();
    inst.setItems([{ id: 'a', label: 'A' }]);
    const newRow = document.activeElement as HTMLElement;
    expect(newRow.id).toMatch(/-row-a$/);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- hasHierarchyLines', () => {
  it('does not add the --lines modifier by default', () => {
    const { el, inst } = mount();
    mounted = el;
    expect(el.classList.contains('arvo-tree--lines')).toBe(false);
    inst.destroy();
  });

  it('adds the --lines modifier when hasHierarchyLines=true', () => {
    const { el, inst } = mount({ hasHierarchyLines: true });
    mounted = el;
    expect(el.classList.contains('arvo-tree--lines')).toBe(true);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- per-item appearance', () => {
  it('adds the per-row --strong modifier when item.appearance is "strong"', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Header', appearance: 'strong' },
      { id: 'b', label: 'Regular' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const a = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    const b = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!;
    expect(a.classList.contains('arvo-tree__item--strong')).toBe(true);
    expect(b.classList.contains('arvo-tree__item--strong')).toBe(false);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- variant (UX interaction model)', () => {
  it('singleSelect: clicking a row selects it', () => {
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({ variant: 'singleSelect', onSelectionChange });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!.click();
    expect(onSelectionChange).toHaveBeenCalled();
    inst.destroy();
  });

  it('multiSelect: row body click expands instead of selecting (selection is checkbox-only)', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const { el, inst } = mount({
      variant: 'multiSelect',
      onSelectionChange,
      onExpandedChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-documents'))!.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).toHaveBeenCalled();
    inst.destroy();
  });

  it('expandOnly: label clicks expand parents and no-op leaves', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const { el, inst } = mount({
      variant: 'expandOnly',
      onSelectionChange,
      onExpandedChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-documents'))!.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).toHaveBeenCalled();
    onExpandedChange.mockReset();
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('navigation: clicking fires onNavigate and never mutates selection', () => {
    const onSelectionChange = vi.fn();
    const onNavigate = vi.fn();
    const { el, inst } = mount({
      variant: 'navigation',
      onSelectionChange,
      onNavigate,
    });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!.click();
    expect(onNavigate).toHaveBeenCalled();
    expect(onNavigate.mock.calls[0][0]).toMatchObject({ id: 'readme' });
    expect(onSelectionChange).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('navigationMultiSelect: checkbox selects, row body navigates', () => {
    const onSelectionChange = vi.fn();
    const onNavigate = vi.fn();
    const { el, inst } = mount({
      variant: 'navigationMultiSelect',
      onSelectionChange,
      onNavigate,
    });
    mounted = el;
    const photosRow = el.querySelector<HTMLElement>(
      '#'.concat(el.id, '-row-photos'),
    )!;
    const cb = photosRow.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    cb.click();
    expect(onSelectionChange).toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    photosRow.click();
    expect(onNavigate).toHaveBeenCalled();
    inst.destroy();
  });

  it('navigation: aria-current defaults to "page" when isActive is set', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', isActive: true },
    ];
    const { el, inst } = mount({ items, variant: 'navigation' });
    mounted = el;
    const alpha = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    expect(alpha.getAttribute('aria-current')).toBe('page');
    inst.destroy();
  });

  it('non-navigation variant: aria-current defaults to "true" when isActive is set', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', isActive: true },
    ];
    const { el, inst } = mount({ items, variant: 'singleSelect' });
    mounted = el;
    const alpha = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    expect(alpha.getAttribute('aria-current')).toBe('true');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- updateItem / setItems', () => {
  it('updateItem patches a single row in place', () => {
    const { el, inst } = mount();
    mounted = el;
    inst.updateItem('readme', { label: 'Read Me Now' });
    expect(el.textContent).toContain('Read Me Now');
    inst.destroy();
  });

  it('setItems replaces the data', () => {
    const { el, inst } = mount();
    mounted = el;
    inst.setItems([{ id: 'fresh', label: 'Fresh' }]);
    expect(el.querySelectorAll('[role="treeitem"]')).toHaveLength(1);
    expect(el.textContent).toContain('Fresh');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- inline actions', () => {
  it('renders actions in the trailing zone', () => {
    const onClick = vi.fn();
    const { el, inst } = mount({
      actions: [{ id: 'edit', icon: 'pencil', ariaLabel: 'Edit', onClick }],
    });
    mounted = el;
    const actionEls = el.querySelectorAll('.arvo-tree__actions button');
    expect(actionEls.length).toBe(3); // 3 visible rows
    inst.destroy();
  });

  it('clicking an action fires onClick without selecting the row', () => {
    const onAction = vi.fn();
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({
      items: [{ id: 'a', label: 'Alpha' }],
      actions: [{ id: 'edit', icon: 'pencil', ariaLabel: 'Edit', onClick: onAction }],
      onSelectionChange,
    });
    mounted = el;
    const btn = el.querySelector<HTMLButtonElement>('.arvo-tree__actions button')!;
    btn.click();
    expect(onAction).toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('applies arvo-tree--actions-on-hover by default', () => {
    const { el, inst } = mount({
      actions: [{ id: 'edit', icon: 'pencil', ariaLabel: 'Edit' }],
    });
    mounted = el;
    expect(el.classList.contains('arvo-tree--actions-on-hover')).toBe(true);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- reorder', () => {
  it('renders a drag handle on every row when isReorderable=true', () => {
    const { el, inst } = mount({ isReorderable: true });
    mounted = el;
    expect(el.querySelectorAll('.arvo-tree__drag button').length).toBe(3);
    inst.destroy();
  });

  it('renders the aria-live region only when isReorderable=true', () => {
    const { el, inst } = mount();
    mounted = el;
    expect(el.querySelector('.arvo-tree__live')).toBeNull();
    inst.destroy();

    const r2 = mount({ isReorderable: true });
    mounted = r2.el;
    expect(r2.el.querySelector('.arvo-tree__live')).toBeTruthy();
    r2.inst.destroy();
  });

  it('move() dispatches tree:reorder', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];
    const handler = vi.fn();
    const { el, inst } = mount({ items, isReorderable: true });
    mounted = el;
    el.addEventListener('tree:reorder', handler);
    inst.move('a', { parentId: null, index: 1 });
    expect(handler).toHaveBeenCalled();
    const ev = handler.mock.calls[0][0] as CustomEvent;
    expect(ev.cancelable).toBe(true);
    expect(ev.detail).toMatchObject({
      fromParentId: null,
      fromIndex: 0,
      toParentId: null,
      toIndex: 1,
    });
    inst.destroy();
  });

  it('clicking the drag handle once enters reorder mode (is-grab-active)', () => {
    const { el, inst } = mount({ isReorderable: true });
    mounted = el;
    const handle = el.querySelector<HTMLButtonElement>('.arvo-tree__drag button')!;
    handle.click();
    const documents = el.querySelector('[role="treeitem"]') as HTMLElement;
    expect(documents.classList.contains('is-grab-active')).toBe(true);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- isHighlighted (A13)', () => {
  it('adds the --highlighted modifier when item.isHighlighted is true', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A', isHighlighted: true },
      { id: 'b', label: 'B' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const a = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    const b = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!;
    expect(a.classList.contains('arvo-tree__item--highlighted')).toBe(true);
    expect(b.classList.contains('arvo-tree__item--highlighted')).toBe(false);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- isReadOnly (A14)', () => {
  it('sets aria-readonly and --readonly modifier on the tree root', () => {
    const { el, inst } = mount({ isReadOnly: true });
    mounted = el;
    expect(el.getAttribute('aria-readonly')).toBe('true');
    expect(el.classList.contains('arvo-tree--readonly')).toBe(true);
    inst.destroy();
  });

  it('still allows selection (read concern)', () => {
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({
      variant: 'singleSelect',
      isReadOnly: true,
      onSelectionChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!.click();
    expect(onSelectionChange).toHaveBeenCalled();
    inst.destroy();
  });

  it('suppresses inline actions even when actions is configured', () => {
    const { el, inst } = mount({
      isReadOnly: true,
      actions: [{ id: 'edit', icon: 'pencil', ariaLabel: 'Edit' }],
    });
    mounted = el;
    expect(el.querySelector('.arvo-tree__actions')).toBeNull();
    inst.destroy();
  });

  it('suppresses the drag handle even when isReorderable=true', () => {
    const { el, inst } = mount({ isReadOnly: true, isReorderable: true });
    mounted = el;
    expect(el.querySelector('.arvo-tree__drag')).toBeNull();
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- A11 `*` expands siblings at same level', () => {
  it('expands every visible parent at the focused row\'s level', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A', children: [{ id: 'a-1', label: 'A.1' }] },
      { id: 'b', label: 'B', children: [{ id: 'b-1', label: 'B.1' }] },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const a = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: '*', bubbles: true }));
    expect(el.textContent).toContain('A.1');
    expect(el.textContent).toContain('B.1');
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- A10 inline-action keyboard navigation', () => {
  it('Tab from a focused row moves focus to the first inline action', () => {
    const { el, inst } = mount({
      items: [{ id: 'a', label: 'A' }],
      actions: [
        { id: 'edit', icon: 'pencil', ariaLabel: 'Edit' },
        { id: 'delete', icon: 'bin', ariaLabel: 'Delete' },
      ],
    });
    mounted = el;
    const row = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const firstAction = el.querySelector<HTMLButtonElement>(
      '.arvo-tree__actions button',
    )!;
    expect(document.activeElement).toBe(firstAction);
    inst.destroy();
  });

  it('Escape dispatched at the tree root while focus is in actions triggers focus restoration', () => {
    // jsdom does not always bubble KeyboardEvents through buttons
    // hosted by ArvoIconButton (the icon button binds its own
    // keydown listener whose presence varies across vitest runs).
    // Dispatch the Escape event at the tree root directly so we
    // exercise the same code path the bubble phase would reach in a
    // real browser: my handler reads document.activeElement to
    // resolve focusedRowEl and isFocusInActions.
    const { el, inst } = mount({
      items: [{ id: 'a', label: 'A' }],
      actions: [{ id: 'edit', icon: 'pencil', ariaLabel: 'Edit' }],
    });
    mounted = el;
    const row = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const action = el.querySelector<HTMLButtonElement>('.arvo-tree__actions button')!;
    expect(document.activeElement).toBe(action);
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- A9 context menu', () => {
  it('right-click on a row fires onContextMenu with trigger="mouse"', () => {
    const onContextMenu = vi.fn();
    const { el, inst } = mount({
      contextMenu: [{ id: 'open', label: 'Open' }],
      onContextMenu,
    });
    mounted = el;
    const readme = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!;
    readme.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(onContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'readme' }),
      'mouse',
    );
    inst.destroy();
  });

  it('right-click does NOT mutate selection or checkbox state', () => {
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({
      variant: 'singleSelect',
      contextMenu: [{ id: 'open', label: 'Open' }],
      onSelectionChange,
    });
    mounted = el;
    const readme = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!;
    readme.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(readme.getAttribute('aria-selected')).toBe('false');
    inst.destroy();
  });

  it('Shift+F10 on the focused row fires onContextMenu with trigger="keyboard"', () => {
    const onContextMenu = vi.fn();
    const { el, inst } = mount({
      contextMenu: [{ id: 'open', label: 'Open' }],
      onContextMenu,
    });
    mounted = el;
    const readme = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-readme'))!;
    readme.focus();
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }),
    );
    expect(onContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'readme' }),
      'keyboard',
    );
    inst.destroy();
  });

  it('renders the overflow menu button when item.hasOverflowMenu is true and contextMenu is configured', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A', hasOverflowMenu: true },
      { id: 'b', label: 'B' },
    ];
    const { el, inst } = mount({
      items,
      contextMenu: [{ id: 'open', label: 'Open' }],
    });
    mounted = el;
    const a = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    const b = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!;
    expect(a.querySelector('.arvo-tree__actions button')).not.toBeNull();
    expect(b.querySelector('.arvo-tree__actions button')).toBeNull();
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- per-item drag handle (A4) + canMoveItem (A5)', () => {
  it('hides the drag handle when item.hasDragHandle is false', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A', hasDragHandle: false },
      { id: 'b', label: 'B' },
    ];
    const { el, inst } = mount({ items, isReorderable: true });
    mounted = el;
    const aRow = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-a'))!;
    const bRow = el.querySelector<HTMLElement>('#'.concat(el.id, '-row-b'))!;
    expect(aRow.querySelector('.arvo-tree__drag')).toBeNull();
    expect(bRow.querySelector('.arvo-tree__drag')).not.toBeNull();
    inst.destroy();
  });

  it('canMoveItem=false rejects the move and does not fire onReorder', () => {
    const onReorder = vi.fn();
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const { el, inst } = mount({
      items,
      isReorderable: true,
      canMoveItem: () => false,
      onReorder,
    });
    mounted = el;
    inst.move('a', { parentId: null, index: 1, position: 'after' });
    expect(onReorder).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('move() carries the position through to onReorder', () => {
    const onReorder = vi.fn();
    const items: ArvoTreeItem[] = [
      {
        id: 'p',
        label: 'Parent',
        children: [{ id: 'c1', label: 'C1' }],
      },
      { id: 'a', label: 'A' },
    ];
    const { el, inst } = mount({
      items,
      isReorderable: true,
      defaultExpandedIds: ['p'],
      onReorder,
    });
    mounted = el;
    inst.move('a', { parentId: 'p', index: 1, position: 'inside' });
    expect(onReorder).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'inside', toParentId: 'p' }),
    );
    inst.destroy();
  });
});

describe('ArvoTreeView (JS) -- destroy', () => {
  it('removes ARIA roles + classes from the element', () => {
    const { el, inst } = mount();
    mounted = el;
    inst.destroy();
    expect(el.getAttribute('role')).toBeNull();
    expect(el.classList.contains('arvo-tree')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Meta (trailing supporting indicator)
// ---------------------------------------------------------------------------

describe('ArvoTreeView (JS) -- meta', () => {
  it('renders a string meta as text-only inside __content', () => {
    const items: ArvoTreeItem[] = [{ id: 'a', label: 'Alpha', meta: 'EXT' }];
    const { el, inst } = mount({ items });
    mounted = el;
    const row = el.querySelector('.arvo-tree__item') as HTMLElement;
    const content = row.querySelector('.arvo-tree__content') as HTMLElement;
    const meta = row.querySelector('.arvo-tree__meta') as HTMLElement;
    expect(meta).toBeTruthy();
    expect(content.contains(meta)).toBe(true);
    expect(meta.querySelector('.arvo-tree__meta-text')?.textContent).toBe('EXT');
    expect(meta.querySelector('.arvo-tree__meta-icon')).toBeNull();
    expect(meta.getAttribute('aria-hidden')).toBe('true');
    inst.destroy();
  });

  it('renders icon-only meta', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', meta: { icon: 'lock' } },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const meta = el.querySelector('.arvo-tree__meta') as HTMLElement;
    expect(meta.querySelector('.arvo-tree__meta-icon')?.className).toContain(
      'o9con-lock',
    );
    expect(meta.querySelector('.arvo-tree__meta-text')).toBeNull();
    inst.destroy();
  });

  it('renders icon + text meta in order (icon first, then text)', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', meta: { icon: 'lock', text: 'V2' } },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const meta = el.querySelector('.arvo-tree__meta') as HTMLElement;
    const children = Array.from(meta.children).map(c => c.className);
    expect(children[0]).toContain('arvo-tree__meta-icon');
    expect(children[1]).toContain('arvo-tree__meta-text');
    expect(meta.querySelector('.arvo-tree__meta-text')?.textContent).toBe('V2');
    inst.destroy();
  });

  it('does not render __meta when meta is undefined / empty', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', meta: '' },
      { id: 'b', label: 'Beta', meta: {} },
      { id: 'c', label: 'Gamma' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    expect(el.querySelectorAll('.arvo-tree__meta').length).toBe(0);
    inst.destroy();
  });

  it('positions meta after the label and before the actions inside __content', () => {
    const items: ArvoTreeItem[] = [
      {
        id: 'a',
        label: 'Alpha',
        meta: { text: 'V2' },
        actions: [{ id: 'edit', icon: 'pencil', ariaLabel: 'Edit' }],
      },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const content = el.querySelector('.arvo-tree__content') as HTMLElement;
    const cls = Array.from(content.children).map(c => c.className);
    const labelIdx = cls.findIndex(c => c.includes('arvo-tree__label'));
    const metaIdx = cls.findIndex(c => c.includes('arvo-tree__meta'));
    const actionsIdx = cls.findIndex(c => c.includes('arvo-tree__actions'));
    expect(labelIdx).toBeGreaterThanOrEqual(0);
    expect(metaIdx).toBeGreaterThan(labelIdx);
    expect(actionsIdx).toBeGreaterThan(metaIdx);
    inst.destroy();
  });

  it('keeps the badge outside __content (right-most slot)', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', meta: 'EXT', badge: 3 },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const row = el.querySelector('.arvo-tree__item') as HTMLElement;
    const badge = row.querySelector('.arvo-tree__badge') as HTMLElement;
    const content = row.querySelector('.arvo-tree__content') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(content.contains(badge)).toBe(false);
    const rowChildren = Array.from(row.children);
    expect(rowChildren.indexOf(badge)).toBeGreaterThan(
      rowChildren.indexOf(content),
    );
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// isActive (navigation chrome)
// ---------------------------------------------------------------------------

describe('ArvoTreeView (JS) -- isActive', () => {
  it('adds arvo-tree__item--active and defaults aria-current to "true"', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', isActive: true },
      { id: 'b', label: 'Beta' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const rows = el.querySelectorAll<HTMLElement>('[role="treeitem"]');
    expect(rows[0].classList.contains('arvo-tree__item--active')).toBe(true);
    expect(rows[0].getAttribute('aria-current')).toBe('true');
    expect(rows[1].classList.contains('arvo-tree__item--active')).toBe(false);
    expect(rows[1].getAttribute('aria-current')).toBeNull();
    inst.destroy();
  });

  it('explicit ariaCurrent overrides the isActive default', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', isActive: true, ariaCurrent: 'page' },
    ];
    const { el, inst } = mount({ items });
    mounted = el;
    const row = el.querySelector('[role="treeitem"]') as HTMLElement;
    expect(row.getAttribute('aria-current')).toBe('page');
    inst.destroy();
  });

  it('isActive coexists with isSelected in multi-select mode', () => {
    const items: ArvoTreeItem[] = [
      { id: 'a', label: 'Alpha', isActive: true },
    ];
    const { el, inst } = mount({
      items,
      variant: 'multiSelect',
      defaultSelectedIds: ['a'],
    });
    mounted = el;
    const row = el.querySelector('[role="treeitem"]') as HTMLElement;
    expect(row.classList.contains('arvo-tree__item--active')).toBe(true);
    expect(row.classList.contains('selected')).toBe(true);
    expect(row.getAttribute('aria-checked')).toBe('true');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Connector slots + maxVisualLevel
// ---------------------------------------------------------------------------

describe('ArvoTreeView (JS) -- connector slots', () => {
  it('uses --empty on ancestor slots whose ancestor was the last sibling', () => {
    // Depth 4 so we can observe --empty on a NON-last-visible slot.
    const items: ArvoTreeItem[] = [
      {
        id: 'a',
        label: 'A',
        children: [
          {
            id: 'a-1',
            label: 'A-1',
            children: [
              {
                id: 'a-1-1',
                label: 'A-1-1',
                children: [{ id: 'leaf-a', label: 'Leaf A' }],
              },
            ],
          },
        ],
      },
      {
        id: 'b',
        label: 'B',
        children: [
          {
            id: 'b-1',
            label: 'B-1',
            children: [
              {
                id: 'b-1-1',
                label: 'B-1-1',
                children: [{ id: 'leaf-b', label: 'Leaf B' }],
              },
            ],
          },
        ],
      },
    ];
    const { el, inst } = mount({
      items,
      defaultExpandedIds: ['a', 'a-1', 'a-1-1', 'b', 'b-1', 'b-1-1'],
    });
    mounted = el;
    const leafA = el.querySelector(
      '[role="treeitem"][id$="-row-leaf-a"]',
    ) as HTMLElement;
    // 3 indent slots + 1 leaf placeholder elbow = 4 connector elements.
    const leafAConns = leafA.querySelectorAll<HTMLElement>(
      ':scope > .arvo-tree__connector',
    );
    expect(leafAConns).toHaveLength(4);
    expect(leafAConns[0].classList.contains('arvo-tree__connector--empty')).toBe(false);
    expect(leafAConns[1].classList.contains('arvo-tree__connector--empty')).toBe(true);
    expect(leafAConns[2].classList.contains('arvo-tree__connector--end')).toBe(true);
    expect(leafAConns[3].classList.contains('arvo-tree__connector--elbow')).toBe(true);

    const leafB = el.querySelector(
      '[role="treeitem"][id$="-row-leaf-b"]',
    ) as HTMLElement;
    const leafBConns = leafB.querySelectorAll<HTMLElement>(
      ':scope > .arvo-tree__connector',
    );
    expect(leafBConns).toHaveLength(4);
    expect(leafBConns[0].classList.contains('arvo-tree__connector--empty')).toBe(true);
    expect(leafBConns[1].classList.contains('arvo-tree__connector--empty')).toBe(true);
    expect(leafBConns[2].classList.contains('arvo-tree__connector--end')).toBe(true);
    expect(leafBConns[3].classList.contains('arvo-tree__connector--elbow')).toBe(true);
    inst.destroy();
  });

  it('clamps visual indent at maxVisualLevel but keeps accurate aria-level', () => {
    // l5 is a parent (so no placeholder elbow inflates the count).
    const items: ArvoTreeItem[] = [
      {
        id: 'l1',
        label: 'L1',
        children: [
          {
            id: 'l2',
            label: 'L2',
            children: [
              {
                id: 'l3',
                label: 'L3',
                children: [
                  {
                    id: 'l4',
                    label: 'L4',
                    children: [
                      {
                        id: 'l5',
                        label: 'L5',
                        children: [{ id: 'l6', label: 'L6 leaf' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const { el, inst } = mount({
      items,
      maxVisualLevel: 3,
      defaultExpandedIds: ['l1', 'l2', 'l3', 'l4'],
    });
    mounted = el;
    const l5 = el.querySelector(
      '[role="treeitem"][id$="-row-l5"]',
    ) as HTMLElement;
    expect(l5.getAttribute('aria-level')).toBe('5');
    const conns = l5.querySelectorAll<HTMLElement>(
      ':scope > .arvo-tree__connector',
    );
    expect(conns).toHaveLength(2);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Perf: surgical updates preserve row DOM identity
// ---------------------------------------------------------------------------

describe('ArvoTreeView (JS) -- surgical render', () => {
  it('selection change does NOT recreate row DOM nodes (multi-select)', () => {
    const { el, inst } = mount({
      variant: 'multiSelect',
      defaultExpandedIds: ['documents'],
    });
    mounted = el;
    const readmeRowBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    const memoRowBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-memo"]',
    )!;
    const memoCheckboxBefore = memoRowBefore.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;

    // Toggle README's checkbox.
    const readmeCheckbox = readmeRowBefore.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    readmeCheckbox.click();

    const readmeRowAfter = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    const memoRowAfter = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-memo"]',
    )!;
    const memoCheckboxAfter = memoRowAfter.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;

    expect(readmeRowAfter).toBe(readmeRowBefore);
    expect(memoRowAfter).toBe(memoRowBefore);
    expect(memoCheckboxAfter).toBe(memoCheckboxBefore);
    expect(readmeRowAfter.getAttribute('aria-checked')).toBe('true');
    inst.destroy();
  });

  it('selection change does NOT recreate row DOM nodes (singleSelect)', () => {
    const { el, inst } = mount({ variant: 'singleSelect' });
    mounted = el;
    const readmeBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    const photosBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-photos"]',
    )!;
    readmeBefore.click();
    const readmeAfter = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    const photosAfter = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-photos"]',
    )!;
    expect(readmeAfter).toBe(readmeBefore);
    expect(photosAfter).toBe(photosBefore);
    expect(readmeAfter.getAttribute('aria-selected')).toBe('true');
    photosAfter.click();
    expect(
      el.querySelector('[role="treeitem"][id$="-row-photos"]'),
    ).toBe(photosBefore);
    expect(photosBefore.getAttribute('aria-selected')).toBe('true');
    expect(readmeBefore.getAttribute('aria-selected')).toBe('false');
    inst.destroy();
  });

  it('expansion change preserves DOM identity for unchanged rows', () => {
    const { el, inst } = mount({ variant: 'singleSelect' });
    mounted = el;
    const photosBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-photos"]',
    )!;
    const readmeBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    inst.expand('documents');
    expect(
      el.querySelector('[role="treeitem"][id$="-row-photos"]'),
    ).toBe(photosBefore);
    expect(
      el.querySelector('[role="treeitem"][id$="-row-readme"]'),
    ).toBe(readmeBefore);
    // Newly visible descendant rows are mounted.
    expect(
      el.querySelector('[role="treeitem"][id$="-row-reports"]'),
    ).toBeTruthy();
    inst.collapse('documents');
    // Hidden descendants are removed from DOM, but original siblings remain.
    expect(
      el.querySelector('[role="treeitem"][id$="-row-photos"]'),
    ).toBe(photosBefore);
    expect(
      el.querySelector('[role="treeitem"][id$="-row-reports"]'),
    ).toBeNull();
    inst.destroy();
  });

  it('search query change does NOT recreate row DOM nodes', () => {
    const { el, inst } = mount();
    mounted = el;
    const readmeBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    inst.setSearchQuery('rea');
    const readmeAfter = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    expect(readmeAfter).toBe(readmeBefore);
    expect(
      readmeAfter.classList.contains('arvo-tree__item--search-highlight'),
    ).toBe(true);
    expect(readmeAfter.querySelector('.arvo-tree__label-match')).toBeTruthy();
    inst.setSearchQuery('');
    expect(
      el.querySelector('[role="treeitem"][id$="-row-readme"]'),
    ).toBe(readmeBefore);
    expect(
      readmeBefore.classList.contains('arvo-tree__item--search-highlight'),
    ).toBe(false);
    inst.destroy();
  });

  it('disabled() toggle does NOT recreate row DOM nodes', () => {
    const { el, inst } = mount();
    mounted = el;
    const readmeBefore = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    inst.disabled(true);
    const readmeAfter = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-readme"]',
    )!;
    expect(readmeAfter).toBe(readmeBefore);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(readmeAfter.getAttribute('aria-disabled')).toBe('true');
    inst.disabled(false);
    expect(
      el.querySelector('[role="treeitem"][id$="-row-readme"]'),
    ).toBe(readmeBefore);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Group parents (isSelectable: false)
// ---------------------------------------------------------------------------

describe('ArvoTreeView (JS) -- isSelectable (group parents)', () => {
  const groupItems: ArvoTreeItem[] = [
    {
      id: 'people',
      label: 'People',
      isSelectable: false,
      children: [
        { id: 'alice', label: 'Alice' },
        { id: 'bob', label: 'Bob' },
      ],
    },
    {
      id: 'places',
      label: 'Places',
      isSelectable: false,
      children: [
        { id: 'paris', label: 'Paris' },
        { id: 'tokyo', label: 'Tokyo' },
      ],
    },
  ];

  it('multiSelect: group parent renders no checkbox; children render checkboxes', () => {
    const { el, inst } = mount({
      variant: 'multiSelect',
      items: groupItems,
      defaultExpandedIds: ['people'],
    });
    mounted = el;
    const peopleRow = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-people"]',
    )!;
    const aliceRow = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-alice"]',
    )!;
    expect(peopleRow.querySelector('.arvo-tree__check')).toBeNull();
    expect(peopleRow.hasAttribute('aria-checked')).toBe(false);
    expect(aliceRow.querySelector('.arvo-tree__check')).toBeTruthy();
    expect(aliceRow.getAttribute('aria-checked')).toBe('false');
    inst.destroy();
  });

  it('multiSelect: group parent click expands instead of selecting', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const { el, inst } = mount({
      variant: 'multiSelect',
      items: groupItems,
      onSelectionChange,
      onExpandedChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('[role="treeitem"][id$="-row-people"]')!.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).toHaveBeenCalled();
    inst.destroy();
  });

  it('singleSelect: group parent click only expands (no selection)', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const { el, inst } = mount({
      variant: 'singleSelect',
      items: groupItems,
      onSelectionChange,
      onExpandedChange,
    });
    mounted = el;
    const peopleRow = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-people"]',
    )!;
    peopleRow.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onExpandedChange).toHaveBeenCalled();
    expect(peopleRow.hasAttribute('aria-selected')).toBe(false);
    inst.destroy();
  });

  it('singleSelect: children of a group parent still select normally', () => {
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({
      variant: 'singleSelect',
      items: groupItems,
      defaultExpandedIds: ['people'],
      onSelectionChange,
    });
    mounted = el;
    el.querySelector<HTMLElement>('[role="treeitem"][id$="-row-alice"]')!.click();
    expect(onSelectionChange).toHaveBeenCalled();
    expect(
      el
        .querySelector('[role="treeitem"][id$="-row-alice"]')!
        .getAttribute('aria-selected'),
    ).toBe('true');
    inst.destroy();
  });

  it('navigation: group parent click still fires onNavigate', () => {
    const onNavigate = vi.fn();
    const { el, inst } = mount({
      variant: 'navigation',
      items: groupItems,
      onNavigate,
    });
    mounted = el;
    el.querySelector<HTMLElement>('[role="treeitem"][id$="-row-people"]')!.click();
    expect(onNavigate).toHaveBeenCalled();
    expect(onNavigate.mock.calls[0][0]).toMatchObject({ id: 'people' });
    inst.destroy();
  });

  it('multiSelect: parent indeterminate state derives from selectable children only (group parents excluded from cascade)', () => {
    // Tree: Root group (non-selectable) -> selectable leaves
    // Selecting one leaf should NOT touch the group's aria-checked
    // (the group is invisible to selection). The leaf's siblings stay
    // unselected.
    const { el, inst } = mount({
      variant: 'multiSelect',
      items: groupItems,
      defaultExpandedIds: ['people'],
    });
    mounted = el;
    const aliceCb = el
      .querySelector<HTMLElement>('[role="treeitem"][id$="-row-alice"]')!
      .querySelector<HTMLInputElement>(
        '.arvo-tree__check input[type="checkbox"]',
      )!;
    aliceCb.click();
    const aliceRow = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-alice"]',
    )!;
    const bobRow = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-bob"]',
    )!;
    const peopleRow = el.querySelector<HTMLElement>(
      '[role="treeitem"][id$="-row-people"]',
    )!;
    expect(aliceRow.getAttribute('aria-checked')).toBe('true');
    expect(bobRow.getAttribute('aria-checked')).toBe('false');
    expect(peopleRow.hasAttribute('aria-checked')).toBe(false);
    inst.destroy();
  });

  it('multiSelect: cascading a SELECTABLE ancestor still selects descendants through a non-selectable group', () => {
    // Tree: root (selectable) -> group (isSelectable: false) -> leaves
    const items: ArvoTreeItem[] = [
      {
        id: 'root',
        label: 'Root',
        children: [
          {
            id: 'group',
            label: 'Category',
            isSelectable: false,
            children: [
              { id: 'leaf-1', label: 'Leaf 1' },
              { id: 'leaf-2', label: 'Leaf 2' },
            ],
          },
        ],
      },
    ];
    const onSelectionChange = vi.fn();
    const { el, inst } = mount({
      variant: 'multiSelect',
      items,
      defaultExpandedIds: ['root', 'group'],
      onSelectionChange,
    });
    mounted = el;
    const rootCb = el
      .querySelector<HTMLElement>('[role="treeitem"][id$="-row-root"]')!
      .querySelector<HTMLInputElement>(
        '.arvo-tree__check input[type="checkbox"]',
      )!;
    rootCb.click();
    const ids = onSelectionChange.mock.calls[0][0] as string[];
    expect(ids).toContain('root');
    expect(ids).toContain('leaf-1');
    expect(ids).toContain('leaf-2');
    // The non-selectable group is NEVER added to the selection set.
    expect(ids).not.toContain('group');
    inst.destroy();
  });
});
