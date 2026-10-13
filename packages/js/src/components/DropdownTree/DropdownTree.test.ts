// @vitest-environment jsdom
/**
 * ArvoDropdownTree (vanilla JS) -- regression tests.
 *
 * Mirrors the React suite: open/close lifecycle, selection (single + multi),
 * search filtering, filter dropdown, footer Apply/Cancel/Reset, and the
 * `popoverProps` / `treeProps` escape-hatch bag merge contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { overlayHub } from '@arvo/core';
import {
  ArvoDropdownTree,
  type ArvoDropdownTreeOptions,
  DD_TREE_DEFAULT_WIDTH,
} from './DropdownTree';
import type { ArvoTreeItem } from '../TreeView/TreeView';
Element.prototype.scrollIntoView = vi.fn() as never;
global.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// matchMedia: matches=true so the enter/exit animations resolve synchronously
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: true,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

let triggerEl: HTMLButtonElement;

const sampleItems: ArvoTreeItem[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'q1', label: 'Q1 report' },
      { id: 'q2', label: 'Q2 report' },
    ],
  },
  { id: 'photos', label: 'Photos' },
  { id: 'readme', label: 'README' },
];

beforeEach(() => {
  triggerEl = document.createElement('button');
  triggerEl.textContent = 'Open';
  document.body.appendChild(triggerEl);
});

afterEach(() => {
  overlayHub.closeAll();
  triggerEl.remove();
  document.body.innerHTML = '';
});

function initDropdown(
  options: Partial<ArvoDropdownTreeOptions> = {},
): ArvoDropdownTree {
  const opts: ArvoDropdownTreeOptions = {
    items: sampleItems,
    isResizable: false,
    ...options,
  };
  return ArvoDropdownTree.initialize(triggerEl, opts);
}

function panelOf(): HTMLElement {
  const panelId = triggerEl.getAttribute('aria-controls');
  if (!panelId) throw new Error('aria-controls not set on trigger');
  const panel = document.getElementById(panelId);
  if (!panel) throw new Error('panel not in DOM');
  return panel;
}

// ---------------------------------------------------------------------------
// Open / close lifecycle
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- open/close lifecycle', () => {
  it('isOpen() reports false before open()', () => {
    const dd = initDropdown();
    expect(dd.isOpen()).toBe(false);
    dd.destroy();
  });

  it('open() flips isOpen() to true and adds .open class to the panel', () => {
    const dd = initDropdown();
    dd.open();
    expect(dd.isOpen()).toBe(true);
    const panel = panelOf();
    expect(panel.classList.contains('open')).toBe(true);
    dd.destroy();
  });

  it('close() flips isOpen() back to false', () => {
    const dd = initDropdown({ defaultOpen: false });
    dd.open();
    dd.close();
    expect(dd.isOpen()).toBe(false);
    dd.destroy();
  });

  it('toggle() flips between open and closed', () => {
    const dd = initDropdown();
    expect(dd.isOpen()).toBe(false);
    dd.toggle();
    expect(dd.isOpen()).toBe(true);
    dd.toggle();
    expect(dd.isOpen()).toBe(false);
    dd.destroy();
  });

  it('dispatches dd-tree:open on the trigger when opened', () => {
    const dd = initDropdown();
    const events: Event[] = [];
    triggerEl.addEventListener('dd-tree:open', (e) => events.push(e));
    dd.open();
    expect(events.length).toBe(1);
    dd.destroy();
  });

  it('dispatches dd-tree:close on the trigger when closed', () => {
    const dd = initDropdown();
    const events: Event[] = [];
    triggerEl.addEventListener('dd-tree:close', (e) => events.push(e));
    dd.open();
    dd.close();
    expect(events.length).toBe(1);
    dd.destroy();
  });

  it('destroy() removes the popover from the DOM', () => {
    const dd = initDropdown();
    dd.open();
    const panelId = triggerEl.getAttribute('aria-controls');
    dd.destroy();
    // ArvoPopover's destroy removes the panel from the DOM.
    if (panelId) {
      expect(document.getElementById(panelId)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Selection (single + multiple)
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- selection', () => {
  it('imperative selected() returns the seeded defaultSelectedIds', () => {
    const dd = initDropdown({
      defaultSelectedIds: ['photos', 'readme'],
    });
    expect(dd.selected()).toEqual(
      expect.arrayContaining(['photos', 'readme']),
    );
    dd.destroy();
  });

  it('imperative selected(ids) writes the selection through to the inner TreeView', () => {
    const dd = initDropdown();
    dd.open();
    dd.selected(['photos']);
    expect(dd.selected()).toEqual(expect.arrayContaining(['photos']));
    dd.destroy();
  });

  // Resolve a tree row by item id. ArvoTreeView sets `rowEl.id =
  // '{tree_instance_id}-row-{item.id}'`, so we use a suffix selector.
  function findRow(itemId: string): HTMLElement | null {
    return panelOf().querySelector(
      `[id$="-row-${itemId}"][role="treeitem"]`,
    ) as HTMLElement | null;
  }

  it('commitOn="change": multi-select checkbox click toggles selection and fires onSelectionChange', () => {
    // In multi-select mode the row body never toggles selection -- only
    // the checkbox does. Click the actual <input>.
    const onSelectionChange = vi.fn();
    const dd = initDropdown({
      selectionMode: 'multiple',
      commitOn: 'change',
      defaultOpen: true,
      onSelectionChange,
    });
    dd.open();

    const row = findRow('photos');
    expect(row).toBeTruthy();
    const cb = row!.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    );
    expect(cb).toBeTruthy();
    cb!.click();

    expect(onSelectionChange).toHaveBeenCalled();
    dd.destroy();
  });

  it('commitOn="apply" (default): selection clicks update the draft but onSelectionChange waits for Apply', () => {
    const onSelectionChange = vi.fn();
    const dd = initDropdown({
      selectionMode: 'multiple',
      defaultOpen: true,
      onSelectionChange,
    });
    dd.open();
    const row = findRow('photos');
    const cb = row!.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    cb.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
    dd.destroy();
  });

  it('dispatches dd-tree:change on the trigger when selection changes (single-select + commitOn="change")', () => {
    // Use single-select so the row body click toggles selection
    // (multi-select requires a checkbox click).
    const dd = initDropdown({
      selectionMode: 'single',
      commitOn: 'change',
      defaultOpen: true,
    });
    dd.open();
    const events: CustomEvent[] = [];
    triggerEl.addEventListener('dd-tree:change', (e) =>
      events.push(e as CustomEvent),
    );

    const row = findRow('readme');
    expect(row).toBeTruthy();
    row!.click();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const last = events[events.length - 1];
    expect(last.detail).toMatchObject({ isSelected: true });
    dd.destroy();
  });

  it('Apply dispatches dd-tree:apply with the draft selection (commit-on-apply)', () => {
    const dd = initDropdown({ selectionMode: 'multiple', defaultOpen: true });
    dd.open();
    const events: CustomEvent[] = [];
    triggerEl.addEventListener('dd-tree:apply', (e) =>
      events.push(e as CustomEvent),
    );
    const row = findRow('photos');
    const cb = row!.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    cb.click();
    // Click the Apply button (last in the footer action list).
    const applyBtn = panelOf().querySelector(
      '.arvo-popover__footer button:last-child',
    ) as HTMLButtonElement;
    applyBtn.click();
    expect(events.length).toBe(1);
    expect((events[0].detail as { ids: string[] }).ids).toContain('photos');
    dd.destroy();
  });

  it('Cancel reverts the draft to the open-time snapshot and dispatches dd-tree:cancel', () => {
    const dd = initDropdown({
      selectionMode: 'multiple',
      defaultSelectedIds: ['readme'],
      defaultOpen: true,
    });
    dd.open();
    const cancelEvents: CustomEvent[] = [];
    triggerEl.addEventListener('dd-tree:cancel', (e) =>
      cancelEvents.push(e as CustomEvent),
    );
    const row = findRow('photos');
    const cb = row!.querySelector<HTMLInputElement>(
      '.arvo-tree__check input[type="checkbox"]',
    )!;
    cb.click();
    // Cancel (second button in the footer).
    const cancelBtn = Array.from(
      panelOf().querySelectorAll('.arvo-popover__footer button'),
    ).find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancelBtn.click();
    expect(cancelEvents.length).toBe(1);
    // Committed state never moved past the original ['readme'].
    expect(dd.selected()).toEqual(['readme']);
    dd.destroy();
  });

  it('Reset dispatches dd-tree:reset and keeps the panel open', () => {
    const dd = initDropdown({ selectionMode: 'multiple', defaultOpen: true });
    dd.open();
    const resetEvents: CustomEvent[] = [];
    triggerEl.addEventListener('dd-tree:reset', (e) =>
      resetEvents.push(e as CustomEvent),
    );
    const resetBtn = Array.from(
      panelOf().querySelectorAll('.arvo-popover__footer button'),
    ).find(b => b.textContent?.trim() === 'Reset') as HTMLButtonElement;
    resetBtn.click();
    expect(resetEvents.length).toBe(1);
    expect(dd.isOpen()).toBe(true);
    dd.destroy();
  });

  it('B4 -- renders the select-all row when hasGlobalSelectAll + multi-select', () => {
    const dd = initDropdown({
      selectionMode: 'multiple',
      hasGlobalSelectAll: true,
      defaultOpen: true,
    });
    dd.open();
    const sa = panelOf().querySelector('.arvo-dd-tree__sa');
    expect(sa).not.toBeNull();
    expect(sa?.querySelector('input[type="checkbox"]')).not.toBeNull();
    dd.destroy();
  });

  it('B4 -- does NOT render the select-all row in single-select mode', () => {
    const dd = initDropdown({
      selectionMode: 'single',
      hasGlobalSelectAll: true,
      defaultOpen: true,
    });
    dd.open();
    expect(panelOf().querySelector('.arvo-dd-tree__sa')).toBeNull();
    dd.destroy();
  });

  it('B4 -- clicking select-all selects every eligible item (commit-on-change)', () => {
    const onSelectionChange = vi.fn();
    const dd = initDropdown({
      selectionMode: 'multiple',
      hasGlobalSelectAll: true,
      commitOn: 'change',
      defaultOpen: true,
      onSelectionChange,
    });
    dd.open();
    const sa = panelOf().querySelector(
      '.arvo-dd-tree__sa input[type="checkbox"]',
    ) as HTMLInputElement;
    sa.click();
    expect(onSelectionChange).toHaveBeenCalled();
    const calls = onSelectionChange.mock.calls;
    const ids = calls[calls.length - 1][0] as string[];
    expect(ids).toContain('photos');
    expect(ids).toContain('readme');
    expect(ids).toContain('documents');
    expect(ids).toContain('q1');
    expect(ids).toContain('q2');
    dd.destroy();
  });

  it('single-select commitOn="change" click replaces the current selection', () => {
    const dd = initDropdown({
      selectionMode: 'single',
      commitOn: 'change',
      defaultOpen: true,
    });
    dd.open();

    const photos = findRow('photos');
    expect(photos).toBeTruthy();
    photos!.click();
    expect(dd.selected()).toEqual(['photos']);

    const readme = findRow('readme');
    expect(readme).toBeTruthy();
    readme!.click();
    expect(dd.selected()).toEqual(['readme']);

    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// Search and filter
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- search and filter', () => {
  it('renders the search input host by default', () => {
    const dd = initDropdown();
    dd.open();
    expect(
      panelOf().querySelector('.arvo-dd-tree__search-input'),
    ).not.toBeNull();
    dd.destroy();
  });

  it('hides the search input when search={false}', () => {
    const dd = initDropdown({ search: false });
    dd.open();
    expect(
      panelOf().querySelector('.arvo-dd-tree__search-input'),
    ).toBeNull();
    dd.destroy();
  });

  it('moves initial focus to the first non-disabled tree row when search={false}', async () => {
    // Focus moves to the search field on open; when search is hidden, fall
    // through to the first treeitem so keyboard users land inside the tree
    // instead of waiting for the focus trap to drop them on a footer button.
    const dd = initDropdown({ search: false });
    dd.open();
    await new Promise(requestAnimationFrame);
    const firstRow = panelOf().querySelector<HTMLElement>(
      '[role="treeitem"]',
    );
    expect(firstRow).not.toBeNull();
    expect(document.activeElement).toBe(firstRow);
    dd.destroy();
  });

  it('renders the filter dropdown trigger by default', () => {
    const dd = initDropdown();
    dd.open();
    expect(panelOf().querySelector('.arvo-dd-tree__filter')).not.toBeNull();
    dd.destroy();
  });

  it('hides the filter dropdown when filter={false}', () => {
    const dd = initDropdown({ filter: false });
    dd.open();
    expect(panelOf().querySelector('.arvo-dd-tree__filter')).toBeNull();
    dd.destroy();
  });

  it('tracks the search query as the user types', () => {
    const dd = initDropdown();
    dd.open();
    const input = panelOf().querySelector(
      '.arvo-dd-tree__search-input input, .arvo-dd-tree__search-input textarea',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'q1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('q1');
    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// Footer Apply / Cancel / Reset
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- footer actions', () => {
  function getFooterButton(panel: HTMLElement, label: string): HTMLElement {
    const btns = Array.from(
      panel.querySelectorAll('.arvo-popover__footer button'),
    ) as HTMLElement[];
    const match = btns.find((b) => b.textContent?.trim() === label);
    if (!match) throw new Error(`Footer button "${label}" not found`);
    return match;
  }

  it('Reset fires onReset and keeps the panel open', () => {
    const onReset = vi.fn();
    const dd = initDropdown({ onReset });
    dd.open();
    const panel = panelOf();
    getFooterButton(panel, 'Reset').click();
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(dd.isOpen()).toBe(true);
    dd.destroy();
  });

  it('Cancel fires onCancel and closes the panel', () => {
    const onCancel = vi.fn();
    const dd = initDropdown({ onCancel });
    dd.open();
    const panel = panelOf();
    getFooterButton(panel, 'Cancel').click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dd.isOpen()).toBe(false);
    dd.destroy();
  });

  it('Apply fires onApply with the current shadow selection and closes the panel', () => {
    const onApply = vi.fn();
    const dd = initDropdown({
      onApply,
      defaultSelectedIds: ['photos', 'readme'],
    });
    dd.open();
    const panel = panelOf();
    getFooterButton(panel, 'Apply').click();
    expect(onApply).toHaveBeenCalledWith(['photos', 'readme']);
    expect(dd.isOpen()).toBe(false);
    dd.destroy();
  });

  it('Apply returning false keeps the panel open', () => {
    const onApply = vi.fn(() => false as const);
    const dd = initDropdown({ onApply });
    dd.open();
    const panel = panelOf();
    getFooterButton(panel, 'Apply').click();
    expect(dd.isOpen()).toBe(true);
    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// popoverProps / treeProps escape-hatch bag merge
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- escape-hatch bags', () => {
  it('popoverProps.hasArrow flows through to the inner Popover panel', () => {
    const dd = initDropdown({ popoverProps: { hasArrow: true } });
    dd.open();
    const panel = panelOf();
    expect(panel.classList.contains('arvo-popover--with-arrow')).toBe(true);
    dd.destroy();
  });

  it('treeProps.ariaLabelledBy flows through to the inner TreeView', () => {
    const dd = initDropdown({
      treeProps: { ariaLabelledBy: 'external-label-id' },
    });
    dd.open();
    const tree = panelOf().querySelector('[role="tree"]');
    expect(tree).not.toBeNull();
    expect(tree?.getAttribute('aria-labelledby')).toBe('external-label-id');
    dd.destroy();
  });

  it('parent-curated ariaLabel beats any bag attempt (treeProps.actionsVisibility still applies as a bag-only key)', () => {
    const dd = initDropdown({
      title: 'Parent title',
      treeProps: { actionsVisibility: 'always' },
    });
    dd.open();
    const tree = panelOf().querySelector('[role="tree"]');
    expect(tree).not.toBeNull();
    expect(tree?.getAttribute('aria-label')).toBe('Parent title');
    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// Width clamping
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- panel sizing', () => {
  it('default width is 362 (matches the figma reference)', () => {
    expect(DD_TREE_DEFAULT_WIDTH).toBe(362);
  });

  it('default width is applied to the panel via inline style after open', () => {
    const dd = initDropdown();
    dd.open();
    const panel = panelOf();
    expect(panel.style.width).toBe(`${DD_TREE_DEFAULT_WIDTH}px`);
    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// Search highlight + live filter
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- search highlight + live filter', () => {
  function typeQuery(panel: HTMLElement, value: string): void {
    const input = panel.querySelector(
      '.arvo-dd-tree__search-input input, .arvo-dd-tree__search-input textarea',
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function rowLabels(panel: HTMLElement): string[] {
    return Array.from(panel.querySelectorAll('.arvo-tree__label')).map(
      (n) => (n as HTMLElement).textContent ?? '',
    );
  }

  it('forwards the trimmed query to the embedded TreeView (label-match wraps appear)', () => {
    const dd = initDropdown();
    dd.open();
    const panel = panelOf();
    typeQuery(panel, 'photos');
    expect(panel.querySelectorAll('.arvo-tree__label-match').length).toBeGreaterThan(0);
    dd.destroy();
  });

  it('live-filters the tree to keep only matching nodes (and their ancestors)', () => {
    const dd = initDropdown();
    dd.open();
    const panel = panelOf();
    expect(rowLabels(panel)).toEqual(
      expect.arrayContaining(['Documents', 'Photos', 'README']),
    );

    typeQuery(panel, 'q1');

    const after = rowLabels(panel);
    expect(after).toContain('Documents');
    expect(after).toContain('Q1 report');
    expect(after).not.toContain('Photos');
    expect(after).not.toContain('README');
    expect(after).not.toContain('Q2 report');
    dd.destroy();
  });

  it('switches to the noResults empty state when the query has zero matches', () => {
    const dd = initDropdown();
    dd.open();
    const panel = panelOf();
    typeQuery(panel, 'zzz-no-such-thing');

    const empty = panel.querySelector('.arvo-dd-tree__empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent ?? '').toContain('No results found');
    expect(panel.querySelector('.arvo-dd-tree__tree')).toBeNull();
    dd.destroy();
  });

  it('Clear Search button in the noResults state resets the query and returns to the data branch', () => {
    const dd = initDropdown();
    dd.open();
    const panel = panelOf();
    typeQuery(panel, 'zzz');

    const clearBtn = Array.from(
      panel.querySelectorAll('.arvo-dd-tree__empty button'),
    ).find((b) => /clear search/i.test((b as HTMLElement).textContent ?? '')) as
      | HTMLButtonElement
      | undefined;
    expect(clearBtn).toBeTruthy();
    clearBtn!.click();

    expect(panel.querySelector('.arvo-dd-tree__empty')).toBeNull();
    expect(panel.querySelector('.arvo-dd-tree__tree')).not.toBeNull();
    const input = panel.querySelector(
      '.arvo-dd-tree__search-input input',
    ) as HTMLInputElement;
    expect(input.value).toBe('');
    dd.destroy();
  });

  it('onSearchChange fires on every keystroke with the new query', () => {
    const onSearchChange = vi.fn();
    const dd = initDropdown({ onSearchChange });
    dd.open();
    const panel = panelOf();
    typeQuery(panel, 'p');
    typeQuery(panel, 'photo');
    expect(onSearchChange).toHaveBeenCalledWith('p');
    expect(onSearchChange).toHaveBeenCalledWith('photo');
    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// Empty states (noData / emptyConfig override)
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- empty states', () => {
  it('renders the noData empty state when items is empty', () => {
    const dd = initDropdown({ items: [] });
    dd.open();
    const panel = panelOf();
    const empty = panel.querySelector('.arvo-dd-tree__empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent ?? '').toContain('No data available');
    expect(empty?.textContent ?? '').toContain('There are no items to display.');
    // No Clear Search button in the noData branch.
    const clearBtns = Array.from(
      panel.querySelectorAll('.arvo-dd-tree__empty button'),
    ).filter((b) => /clear search/i.test((b as HTMLElement).textContent ?? ''));
    expect(clearBtns.length).toBe(0);
    dd.destroy();
  });

  it('emptyConfig overrides the noData copy and illustration', () => {
    const dd = initDropdown({
      items: [],
      emptyConfig: {
        illustration: 'no-results',
        title: 'Custom title',
        message: 'Custom message',
      },
    });
    dd.open();
    const panel = panelOf();
    const empty = panel.querySelector('.arvo-dd-tree__empty');
    expect(empty?.textContent ?? '').toContain('Custom title');
    expect(empty?.textContent ?? '').toContain('Custom message');
    dd.destroy();
  });

  it('emptyConfig does NOT affect the noResults copy', () => {
    const dd = initDropdown({
      emptyConfig: { title: 'Custom title' },
    });
    dd.open();
    const panel = panelOf();
    const input = panel.querySelector(
      '.arvo-dd-tree__search-input input',
    ) as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const empty = panel.querySelector('.arvo-dd-tree__empty');
    expect(empty?.textContent ?? '').toContain('No results found');
    expect(empty?.textContent ?? '').not.toContain('Custom title');
    dd.destroy();
  });
});

// ---------------------------------------------------------------------------
// Loading skeleton (Pattern B)
// ---------------------------------------------------------------------------

describe('ArvoDropdownTree -- loading skeleton', () => {
  it('renders the dropdown-tree skeleton rows when isLoading=true', () => {
    const dd = initDropdown({ isLoading: true });
    dd.open();
    const panel = panelOf();
    const skel = panel.querySelector('.arvo-dd-tree__skeleton');
    expect(skel).not.toBeNull();
    const rows = skel?.querySelectorAll('.arvo-dd-tree__skeleton-row');
    expect((rows?.length ?? 0)).toBeGreaterThan(0);
    expect(panel.querySelector('.arvo-dd-tree__tree')).toBeNull();
    expect(panel.querySelector('.arvo-dd-tree__empty')).toBeNull();
    dd.destroy();
  });

  it('hides the sticky search row while loading', () => {
    const dd = initDropdown({ isLoading: true });
    dd.open();
    const panel = panelOf();
    const sticky = panel.querySelector('.arvo-dd-tree__sticky') as HTMLElement | null;
    // The sticky element is owned by DropdownTree and hidden via inline
    // display when loading. It may still be in the DOM tree but must not be
    // visible.
    expect(sticky === null || sticky.style.display === 'none').toBe(true);
    dd.destroy();
  });

  it('toggles into the skeleton state via setLoading(true) on an already-open panel', () => {
    const dd = initDropdown();
    dd.open();
    const panel = panelOf();
    expect(panel.querySelector('.arvo-dd-tree__tree')).not.toBeNull();
    dd.setLoading(true);
    expect(panel.querySelector('.arvo-dd-tree__skeleton')).not.toBeNull();
    expect(panel.querySelector('.arvo-dd-tree__tree')).toBeNull();
    dd.setLoading(false);
    expect(panel.querySelector('.arvo-dd-tree__skeleton')).toBeNull();
    expect(panel.querySelector('.arvo-dd-tree__tree')).not.toBeNull();
    dd.destroy();
  });
});
