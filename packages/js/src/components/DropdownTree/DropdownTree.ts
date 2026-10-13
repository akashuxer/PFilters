/**
 * ArvoDropdownTree -- vanilla JS implementation.
 *
 * Composes ArvoPopover internally for chrome (header, footer, body, positioning,
 * overlay registration, focus trap, transitions). DropdownTree mounts:
 *   - a sticky search row (ArvoSearch + adjacent filter ArvoDropdownIconButton)
 *     inside the Popover's stickyHeader slot
 *   - an embedded ArvoTreeView inside the Popover's content slot, wrapped in
 *     a body container that branches between data / noData empty / noResults
 *     empty / loading skeleton states
 *   - corner resize handles around the panel
 *
 * Implemented: popover shell + search row with live filtering and substring
 * highlight + four-branch body (data / noData / noResults / loading) +
 * Reset/Cancel/Apply footer + resize. Apply/Reset/Cancel draft-then-commit
 * semantics, global select-all, and multi-tree sections rendering are RESERVED.
 *
 * See descriptors/dropdown-tree.json and the React parity reference at
 * packages/react/src/components/DropdownTree/DropdownTree.tsx.
 */

import {
  createResizeHandle,
  type ResizeHandleInstance,
} from '@arvo/core';
import { ArvoPopover } from '../Popover/Popover';
import type {
  ArvoPopoverActionConfig,
  ArvoPopoverHeaderActionConfig,
  ArvoPopoverOptions,
} from '../Popover/Popover';
import { ArvoSearch } from '../Search/Search';
import { ArvoDropdownIconButton } from '../DropdownIconButton/DropdownIconButton';
import { ArvoTreeView } from '../TreeView/TreeView';
import type {
  ArvoTreeItem,
  ArvoTreeViewOptions,
  TreeSelectionMode,
  TreeSize,
  TreeAppearance,
  TreeSelectionContext,
  TreeExpandContext,
  TreeViewEmptyConfig,
} from '../TreeView/TreeView';
import { ArvoEmptyState } from '../EmptyState/EmptyState';
import { ArvoCheckbox } from '../Checkbox/Checkbox';
import type { MenuItemData } from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DD_TREE_MIN_WIDTH = 270;
export const DD_TREE_DEFAULT_WIDTH = 362;
export const DD_TREE_MAX_WIDTH = 700;
export const DD_TREE_MIN_HEIGHT = 272;

const SKELETON_ROW_COUNT = 6;

const NO_RESULTS_TITLE = 'No results found';
const NO_RESULTS_MESSAGE = 'Try adjusting your search query.';
const CLEAR_SEARCH_LABEL = 'Clear Search';

const NO_DATA_DEFAULT: Required<TreeViewEmptyConfig> = {
  illustration: 'no-data',
  title: 'No data available',
  message: 'There are no items to display.',
};

/** Max header actions enforced (including the close X). */
const HEADER_ACTIONS_MAX = 4;

// ---------------------------------------------------------------------------
// Custom types (parity with React)
// ---------------------------------------------------------------------------

export interface DropdownTreeSearchConfig {
  placeholder?: string;
  shortcut?: string;
}

export interface DropdownTreeFilterConfig {
  icon?: string;
  tooltip?: string;
  items?: MenuItemData[];
  onSelect?: (item: MenuItemData, index: number) => boolean | void;
}

/**
 * Shape of the noData empty-state override. Mirrors React's
 * `DropdownTreeEmptyConfig` 1:1. Includes optional `primaryAction`
 * for the Refresh button (spec B7).
 */
export interface DropdownTreeEmptyConfig extends TreeViewEmptyConfig {
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'tertiary' | 'outline';
  };
}

/**
 * RESERVED for follow-up. Supplying `sections` today logs a console.warn and
 * falls back to the flat `items` shape.
 */
export interface DropdownTreeSection {
  id: string;
  label?: string;
  items: ArvoTreeItem[];
  selectionMode?: TreeSelectionMode;
  size?: TreeSize;
  appearance?: TreeAppearance;
  hasSelectAll?: boolean;
}

type DropdownTreePlacement =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end'
  | 'auto';

/**
 * Scoped escape-hatch bag for the inner `ArvoPopover` (panel chrome) options
 * the parent does not curate as a flat option. Mirrors the React
 * `DropdownTreePopoverProps` type exactly -- drift checker enforces parity.
 */
export type DropdownTreePopoverProps = Pick<
  ArvoPopoverOptions,
  'hasArrow' | 'isInteractive' | 'trigger'
>;

/**
 * Scoped escape-hatch bag for the inner `ArvoTreeView` options the parent
 * does not curate as a flat option. Mirrors the React `DropdownTreeTreeProps`
 * type exactly. `emptyConfig`, `searchQuery`, and `isLoading` are flat
 * parent-owned options so the data-state branching stays the single source
 * of truth.
 */
export type DropdownTreeTreeProps = Pick<
  ArvoTreeViewOptions,
  | 'actions'
  | 'actionsVisibility'
  | 'isReorderable'
  | 'onReorder'
  | 'onLoadChildren'
  | 'ariaLabelledBy'
>;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ArvoDropdownTreeOptions {
  // -- Tree data + selection -------------------------------------------------
  items?: ArvoTreeItem[];
  /** RESERVED for follow-up. */
  sections?: DropdownTreeSection[];

  selectionMode?: TreeSelectionMode;
  size?: TreeSize;
  appearance?: TreeAppearance;

  selectedIds?: string[];
  defaultSelectedIds?: string[];
  expandedIds?: string[];
  defaultExpandedIds?: string[];

  onSelectionChange?: (ids: string[], context: TreeSelectionContext) => void;
  onExpandedChange?: (ids: string[], context: TreeExpandContext) => void;

  // -- Search + filter -------------------------------------------------------
  searchQuery?: string;
  /** Called whenever the internal search query changes. */
  onSearchChange?: (query: string) => void;
  search?: false | DropdownTreeSearchConfig;
  filter?: false | DropdownTreeFilterConfig;

  /** Override for the noData empty state copy and illustration. */
  emptyConfig?: DropdownTreeEmptyConfig;

  /**
   * When true (and `selectionMode='multiple'`), render a sticky
   * select-all checkbox row above the tree body. The checkbox toggles
   * every eligible (non-disabled) tree row; the external label is
   * clickable.
   */
  hasGlobalSelectAll?: boolean;

  // -- Resize ---------------------------------------------------------------
  isResizable?: boolean;
  width?: number;
  height?: number | null;
  onResize?: (detail: { width: number; height: number }) => void;
  onResizeCommit?: (detail: { width: number; height: number }) => void;

  // -- Popover chrome -------------------------------------------------------
  title?: string | null;
  hasHeader?: boolean;
  isClosable?: boolean;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPopoverHeaderActionConfig[];

  placement?: DropdownTreePlacement;
  offset?: number;
  closeOnOutside?: boolean;

  actions?: ArvoPopoverActionConfig[] | false;

  // -- State ----------------------------------------------------------------
  isLoading?: boolean;
  defaultOpen?: boolean;

  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;

  /**
   * Escape hatch for the inner `ArvoPopover` (panel chrome) options the
   * parent doesn't expose flat. Bag-only keys (`hasArrow`, `isInteractive`,
   * `trigger`) flow through. On any conflict with a parent-owned option the
   * parent wins.
   */
  popoverProps?: DropdownTreePopoverProps;

  /**
   * Escape hatch for the inner `ArvoTreeView` options the parent doesn't
   * expose flat. Bag-only keys (`actions`, `actionsVisibility`,
   * `isReorderable`, `onReorder`, `onLoadChildren`, `emptyConfig`,
   * `ariaLabelledBy`) flow through. On any conflict with a parent-owned
   * option the parent wins.
   */
  treeProps?: DropdownTreeTreeProps;

  // -- Footer commit semantics ---------------------------------------------
  /**
   * When selection changes should be committed. Defaults to `'apply'`
   * which buffers selection inside the panel until Apply commits.
   * `'change'` keeps the legacy behavior (every toggle commits live).
   */
  commitOn?: 'change' | 'apply';
  onApply?: (ids: string[]) => boolean | void;
  onCancel?: () => void;
  onReset?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface FilteredTree {
  items: ArvoTreeItem[];
  expanded: string[];
}

/**
 * Walk a tree and collect every non-disabled item id. Used by the
 * global select-all row to compute the "select every visible row"
 * target set (B4). Mirrors `collectAllEligibleIds` in React 1:1.
 */
function collectAllEligibleIds(items: ArvoTreeItem[]): string[] {
  const ids: string[] = [];
  function walk(nodes: ArvoTreeItem[]): void {
    for (const node of nodes) {
      if (node.isDisabled) continue;
      ids.push(node.id);
      if (Array.isArray(node.children)) walk(node.children);
    }
  }
  walk(items);
  return ids;
}

/**
 * Recursively prune a tree to nodes whose label matches `query` (case-insensitive
 * substring) OR have at least one matching descendant. Ancestors of matches are
 * collected into `expanded` so the dropdown can auto-expand them while a query
 * is active. Mirrors `filterTreeByQuery` in the React twin 1:1.
 */
function filterTreeByQuery(
  items: ArvoTreeItem[],
  query: string,
): FilteredTree {
  const trimmed = query.trim();
  if (!trimmed) return { items, expanded: [] };
  const needle = trimmed.toLowerCase();
  const expanded: string[] = [];

  function walk(node: ArvoTreeItem): ArvoTreeItem | null {
    const labelMatches = node.label.toLowerCase().includes(needle);
    const children = Array.isArray(node.children) ? node.children : null;

    if (children && children.length > 0) {
      const filteredChildren: ArvoTreeItem[] = [];
      for (const child of children) {
        const kept = walk(child);
        if (kept) filteredChildren.push(kept);
      }

      if (filteredChildren.length > 0) {
        expanded.push(node.id);
        return { ...node, children: filteredChildren };
      }
      return labelMatches ? { ...node, children } : null;
    }

    return labelMatches ? node : null;
  }

  const filtered: ArvoTreeItem[] = [];
  for (const root of items) {
    const kept = walk(root);
    if (kept) filtered.push(kept);
  }
  return { items: filtered, expanded };
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

let _idCounter = 0;

export class ArvoDropdownTree {
  private _trigger: HTMLElement | null;
  private _options: ArvoDropdownTreeOptions;
  private _id: string;

  private _selectionMode: TreeSelectionMode;
  private _items: ArvoTreeItem[];
  private _query: string;
  private _isLoading: boolean;

  // Shadow state -- mirrors React's shadow refs so the imperative
  // `selected()` / `expanded()` calls can read/write without re-instantiating
  // the inner TreeView.
  private _selectedIds: string[];
  private _expandedIds: string[];
  private _isControlledSelection: boolean;
  private _isControlledExpansion: boolean;
  // Commit-on-apply: the draft is what the embedded TreeView
  // displays. In 'change' mode draft === committed; in 'apply' mode
  // the draft diverges until Apply commits it.
  private _draftSelectedIds: string[];
  private _openSnapshot: string[];
  private _isCommitOnApply: boolean;

  // Inner Popover composition
  private _popover: ArvoPopover | null = null;
  private _panelEl: HTMLElement | null = null;

  // Slot containers we own and re-render into.
  private _stickyEl: HTMLDivElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;
  private _treeHostEl: HTMLDivElement | null = null;
  private _emptyHostEl: HTMLDivElement | null = null;
  private _skeletonEl: HTMLDivElement | null = null;

  // Inner instances tracked for teardown.
  private _searchInstance: ArvoSearch | null = null;
  private _filterInstance: ArvoDropdownIconButton | null = null;
  private _treeInstance: ArvoTreeView | null = null;
  private _emptyInstance: ArvoEmptyState | null = null;
  private _selectAllInstance: ArvoCheckbox | null = null;

  // Last data-state we rendered so the body can re-paint surgically when
  // (items, query, isLoading) change.
  private _bodyState: 'data' | 'noData' | 'noResults' | 'loading' = 'data';
  // Last query value we seeded auto-expansion against. Mirrors the React
  // `lastTrimmedQueryRef` so we only seed once per query transition.
  private _lastSeededQuery = '';

  // Adapters
  private _resize: ResizeHandleInstance | null = null;

  // Resize state -- seeded from options and persisted across opens.
  private _resizedWidth: number;
  private _resizedHeight: number | null;

  // Bound listeners
  private _boundOnPopoverOpen: (e: Event) => void;
  private _boundOnPopoverClose: (e: Event) => void;

  static initialize(
    element: HTMLElement,
    options?: ArvoDropdownTreeOptions,
  ): ArvoDropdownTree {
    return new ArvoDropdownTree(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoDropdownTreeOptions) {
    this._trigger = element;
    this._options = { ...(options ?? {}) };
    this._id = `arvo-dd-tree-${++_idCounter}`;

    this._selectionMode = this._options.selectionMode ?? 'multiple';
    this._items = this._options.items ?? [];
    this._query = this._options.searchQuery ?? '';
    this._isLoading = (this._options.isLoading ?? false) === true;

    this._isControlledSelection = this._options.selectedIds !== undefined;
    this._isControlledExpansion = this._options.expandedIds !== undefined;
    this._selectedIds = this._options.selectedIds ?? this._options.defaultSelectedIds ?? [];
    this._expandedIds = this._options.expandedIds ?? this._options.defaultExpandedIds ?? [];
    this._isCommitOnApply = (this._options.commitOn ?? 'apply') === 'apply';
    this._draftSelectedIds = [...this._selectedIds];
    this._openSnapshot = [...this._selectedIds];

    // Dev-only warn when headerActions exceeds the max.
    if (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV !== 'production'
    ) {
      const closeCount = this._options.isClosable === false ? 0 : 1;
      const headerCount = (this._options.headerActions?.length ?? 0) + closeCount;
      if (headerCount > HEADER_ACTIONS_MAX) {
        console.warn(
          `ArvoDropdownTree: header has ${headerCount} actions (including the close X) -- ` +
            `the spec allows a maximum of ${HEADER_ACTIONS_MAX}. Consider moving overflow ` +
            'into the body or footer.',
        );
      }
    }

    this._resizedWidth = clamp(
      this._options.width ?? DD_TREE_DEFAULT_WIDTH,
      DD_TREE_MIN_WIDTH,
      DD_TREE_MAX_WIDTH,
    );
    this._resizedHeight = this._options.height ?? null;

    // One-time warn for the RESERVED multi-tree sections shape.
    if (
      this._options.sections !== undefined &&
      this._options.sections.length > 0
    ) {
      console.warn(
        'ArvoDropdownTree: `sections` is reserved for a follow-up release and is ignored in this build. ' +
          'The dropdown renders the flat `items` option instead.',
      );
    }

    // Build slot containers. The body host is reused across data-state
    // transitions; the inner shape (tree / empty / skeleton) is repopulated
    // in `_renderBody()`.
    this._stickyEl = document.createElement('div');
    this._stickyEl.className = 'arvo-dd-tree__sticky';

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-dd-tree__body';

    this._treeHostEl = document.createElement('div');
    this._treeHostEl.className = 'arvo-dd-tree__tree';

    // Compose ArvoPopover. Hybrid options surface: spread `popoverProps`
    // first so flat / parent-computed values win on overlap. Only bag-only
    // keys flow through.
    this._popover = new ArvoPopover(element, {
      ...(this._options.popoverProps ?? {}),
      variant: 'edge',
      title: this._options.title ?? '',
      hasHeader: this._options.hasHeader ?? true,
      isClosable: this._options.isClosable ?? true,
      hasBackButton: this._options.hasBackButton ?? false,
      onBack: this._options.onBack,
      headerActions: this._options.headerActions ?? [],
      placement: (this._options.placement ?? 'auto') as DropdownTreePlacement,
      offset: this._options.offset ?? 4,
      closeOnOutside: this._options.closeOnOutside ?? true,
      isLoading: this._isLoading,
      stickyHeader: this._stickyEl,
      content: this._bodyEl,
      actions: this._buildPopoverActions(),
      hasFooter: true,
      onOpen: () => this._options.onOpen?.(),
      onClose: () => this._options.onClose?.(),
    });

    // Resolve the panel element via aria-controls (set by Popover's
    // constructor synchronously). Mirrors the HPop pattern.
    const panelId = element.getAttribute('aria-controls');
    if (panelId) {
      this._panelEl = document.getElementById(panelId);
    }
    this._applyPanelClasses();

    // Wire popover lifecycle events.
    this._boundOnPopoverOpen = this._handlePopoverOpen.bind(this);
    this._boundOnPopoverClose = this._handlePopoverClose.bind(this);
    element.addEventListener('popover:open', this._boundOnPopoverOpen);
    element.addEventListener('popover:close', this._boundOnPopoverClose);

    // Initial render of slots.
    this._renderSticky();
    this._renderBody();

    // Loading state may need the footer hidden immediately.
    if (this._isLoading) {
      this._popover.setFooterVisible(false);
    }

    if (this._options.defaultOpen) {
      queueMicrotask(() => this.open());
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    // Commit-on-apply: snapshot the committed selection at the
    // moment the panel opens so Cancel can revert and the draft
    // re-seeds from the latest committed state.
    this._openSnapshot = [...this._selectedIds];
    this._draftSelectedIds = [...this._selectedIds];
    // Push the draft into the embedded tree if it's already rendered.
    this._treeInstance?.selected(this._draftSelectedIds);
    this._syncSelectAllUi();
    this._popover?.open();
    // Initial focus on open (spec): focus the search field when one is
    // rendered; otherwise focus the first non-disabled treeitem so
    // keyboard users land inside the tree instead of waiting for the
    // popover focus trap to drop them on a footer button.
    const searchEnabled = this._options.search !== false;
    requestAnimationFrame(() => {
      if (searchEnabled && this._stickyEl) {
        const input = this._stickyEl.querySelector(
          '.arvo-dd-tree__search input, .arvo-dd-tree__search textarea',
        ) as HTMLElement | null;
        input?.focus();
        return;
      }
      const panel = this._panelEl;
      const firstRow = panel?.querySelector<HTMLElement>(
        '[role="treeitem"]:not([aria-disabled="true"])',
      );
      if (firstRow) {
        const itemId = firstRow.id.match(/-row-(.+)$/)?.[1];
        if (itemId && this._treeInstance) {
          this._treeInstance.focusItem(itemId);
        } else {
          firstRow.focus();
        }
      }
    });
  }

  close(): void {
    this._popover?.close();
  }

  isOpen(): boolean {
    return this._popover?.isOpen() ?? false;
  }

  toggle(): void {
    this._popover?.toggle();
  }

  selected(ids?: string[]): string[] | void {
    if (ids === undefined) {
      // Return the committed selection (not the draft) so consumers
      // always see the authoritative state regardless of commit mode.
      return [...this._selectedIds];
    }
    // Imperative setter updates BOTH committed and draft so the panel
    // reflects the seeding immediately in both commit modes.
    this._selectedIds = [...ids];
    this._draftSelectedIds = [...ids];
    this._treeInstance?.selected(ids);
    this._syncSelectAllUi();
  }

  expanded(ids?: string[]): string[] | void {
    if (ids === undefined) {
      return this._treeInstance ? (this._treeInstance.expanded() as string[]) : [...this._expandedIds];
    }
    this._expandedIds = [...ids];
    this._treeInstance?.expanded(ids);
  }

  setLoading(loading: boolean): void {
    if (this._isLoading === loading) return;
    this._isLoading = loading;
    this._popover?.setLoading(loading);
    this._popover?.setFooterVisible(!loading);
    this._applyPanelClasses();
    this._renderSticky();
    this._renderBody();
  }

  updateItems(items: ArvoTreeItem[]): void {
    this._items = items;
    this._renderBody();
  }

  reposition(): void {
    this._popover?.reposition();
  }

  destroy(): void {
    const trigger = this._trigger;
    if (trigger) {
      trigger.removeEventListener('popover:open', this._boundOnPopoverOpen);
      trigger.removeEventListener('popover:close', this._boundOnPopoverClose);
    }
    this._teardownResize();
    this._destroyInnerInstances();
    this._popover?.destroy();
    this._popover = null;
    this._stickyEl?.remove();
    this._bodyEl?.remove();
    this._stickyEl = null;
    this._bodyEl = null;
    this._treeHostEl = null;
    this._panelEl = null;
    this._trigger = null;
  }

  // ---------------------------------------------------------------------------
  // Popover lifecycle wiring
  // ---------------------------------------------------------------------------

  private _handlePopoverOpen(): void {
    this._applyPanelClasses();
    this._applyDimensions();
    this._mountResize();
    this._dispatchEvent('dd-tree:open', {});
  }

  private _handlePopoverClose(): void {
    this._teardownResize();
    this._dispatchEvent('dd-tree:close', {});
  }

  // ---------------------------------------------------------------------------
  // Panel chrome
  // ---------------------------------------------------------------------------

  private _applyPanelClasses(): void {
    const panel = this._panelEl;
    if (!panel) return;

    const searchEnabled = this._options.search !== false;
    const filterEnabled = this._options.filter !== false;
    const isResizable = this._options.isResizable !== false;

    // Remove any prior dd-tree classes we set.
    const toRemove: string[] = [];
    panel.classList.forEach((c) => {
      if (c.startsWith('arvo-dd-tree')) toRemove.push(c);
    });
    toRemove.forEach((c) => panel.classList.remove(c));

    panel.classList.add('arvo-dd-tree');
    panel.classList.add(`arvo-dd-tree--${this._selectionMode}`);
    if (searchEnabled) panel.classList.add('arvo-dd-tree--with-search');
    if (filterEnabled) panel.classList.add('arvo-dd-tree--with-filter');
    if (isResizable) panel.classList.add('arvo-dd-tree--with-resize');

    if (this._isLoading) panel.classList.add('loading');
  }

  private _applyDimensions(): void {
    const panel = this._panelEl;
    if (!panel) return;
    panel.style.width = `${clamp(
      this._resizedWidth,
      DD_TREE_MIN_WIDTH,
      DD_TREE_MAX_WIDTH,
    )}px`;
    if (this._resizedHeight != null) {
      const maxH = Math.floor(window.innerHeight * 0.9);
      panel.style.height = `${clamp(
        this._resizedHeight,
        DD_TREE_MIN_HEIGHT,
        maxH,
      )}px`;
    } else {
      panel.style.removeProperty('height');
    }
  }

  // ---------------------------------------------------------------------------
  // Sticky header (search + filter)
  // ---------------------------------------------------------------------------

  private _renderSticky(): void {
    const sticky = this._stickyEl;
    if (!sticky) return;

    this._searchInstance?.destroy();
    this._searchInstance = null;
    this._filterInstance?.destroy();
    this._filterInstance = null;
    this._selectAllInstance?.destroy();
    this._selectAllInstance = null;
    sticky.textContent = '';

    if (this._isLoading) {
      sticky.style.display = 'none';
      return;
    }

    const searchEnabled = this._options.search !== false;
    const filterEnabled = this._options.filter !== false;
    const selectAllEnabled =
      this._options.hasGlobalSelectAll === true &&
      this._selectionMode === 'multiple' &&
      this._items.length > 0;

    if (!searchEnabled && !filterEnabled && !selectAllEnabled) {
      sticky.style.display = 'none';
      return;
    }

    sticky.style.display = '';

    let row: HTMLDivElement | null = null;
    if (searchEnabled || filterEnabled) {
      row = document.createElement('div');
      row.className = 'arvo-dd-tree__search';
      sticky.appendChild(row);
    }

    if (searchEnabled && row) {
      const searchWrap = document.createElement('div');
      searchWrap.className = 'arvo-dd-tree__search-input';
      const searchHost = document.createElement('div');
      searchWrap.appendChild(searchHost);

      const searchCfg: DropdownTreeSearchConfig =
        typeof this._options.search === 'object' ? this._options.search : {};

      this._searchInstance = ArvoSearch.initialize(searchHost as HTMLDivElement, {
        variant: 'filter',
        value: this._query,
        placeholder: searchCfg.placeholder ?? 'Search',
        shortcut: searchCfg.shortcut,
        isFullWidth: true,
        'aria-label': 'Filter tree',
        onChange: (value: string) => this._handleSearchInput(value),
        onSearch: (value: string) => this._handleSearchInput(value),
        onClear: () => this._handleSearchClear(),
      });

      row.appendChild(searchWrap);
    }

    if (filterEnabled && row) {
      const filterWrap = document.createElement('div');
      filterWrap.className = 'arvo-dd-tree__filter';
      const filterHost = document.createElement('button');
      filterHost.type = 'button';
      filterWrap.appendChild(filterHost);

      const filterCfg: DropdownTreeFilterConfig =
        typeof this._options.filter === 'object' ? this._options.filter : {};

      this._filterInstance = ArvoDropdownIconButton.initialize(filterHost, {
        icon: filterCfg.icon ?? 'filter',
        tooltip: filterCfg.tooltip ?? 'Filter',
        variant: 'secondary',
        size: 'sm',
        items: filterCfg.items ?? [],
        onSelect: filterCfg.onSelect,
      });

      row.appendChild(filterWrap);
    }

    if (selectAllEnabled) {
      const saRow = document.createElement('div');
      saRow.className = 'arvo-dd-tree__sa';
      const cbHost = document.createElement('div');
      saRow.appendChild(cbHost);
      const label = document.createElement('span');
      label.className = 'arvo-dd-tree__sa__lbl';
      label.textContent = 'Select all';
      label.addEventListener('click', () => this._handleSelectAllToggle());
      saRow.appendChild(label);
      sticky.appendChild(saRow);

      const state = this._computeSelectAllState();
      this._selectAllInstance = ArvoCheckbox.initialize(cbHost, {
        isChecked: state === 'all',
        isIndeterminate: state === 'some',
        label: null,
        onChange: () => this._handleSelectAllToggle(),
      });
      // ArvoCheckbox doesn't expose aria-label as an option; set it
      // directly on the rendered input so screen readers announce
      // "Select all" without needing a visible label.
      const cbInput = cbHost.querySelector('input[type="checkbox"]');
      cbInput?.setAttribute('aria-label', 'Select all');
    }
  }

  private _handleSearchInput(value: string): void {
    if (this._query === value) return;
    this._query = value;
    this._options.onSearchChange?.(value);
    // The body re-renders to flip into the noResults branch when the new
    // query has no matches and back into the data branch as soon as one
    // appears. Highlighting is forwarded to the TreeView via setSearchQuery
    // inside `_renderBody` so we get the same call site for both initial
    // mount and live typing.
    this._renderBody();
  }

  private _handleSearchClear(): void {
    if (this._query === '') {
      this._searchInstance?.value('');
      return;
    }
    this._query = '';
    if (this._searchInstance) {
      this._searchInstance.value('');
    }
    this._options.onSearchChange?.('');
    this._renderBody();
  }

  // ---------------------------------------------------------------------------
  // Body (data / noData / noResults / loading branches)
  // ---------------------------------------------------------------------------

  /**
   * Re-paint the body slot for the current `(items, query, isLoading)` tuple.
   * Mirrors the React four-branch `renderBody`: loading > noData > noResults
   * > data. The tree host element is preserved across renders so the inner
   * ArvoTreeView keeps its DOM identity when the user types/clears within
   * the data branch.
   */
  private _renderBody(): void {
    const body = this._bodyEl;
    if (!body) return;

    const trimmedQuery = this._query.trim();
    const isQueryActive = trimmedQuery.length > 0;
    const { items: filteredItems, expanded: queryExpandedIds } =
      filterTreeByQuery(this._items, trimmedQuery);

    // Auto-expand ancestors of matches once per query transition. Subsequent
    // user-driven collapses persist because the seeding only happens on the
    // transition. Mirrors the React `useEffect` guard with `lastTrimmedQueryRef`.
    if (
      trimmedQuery !== this._lastSeededQuery &&
      trimmedQuery.length > 0 &&
      queryExpandedIds.length > 0 &&
      !this._isControlledExpansion
    ) {
      const next = Array.from(
        new Set([...this._expandedIds, ...queryExpandedIds]),
      );
      this._expandedIds = next;
      this._treeInstance?.expanded(next);
    }
    this._lastSeededQuery = trimmedQuery;

    const nextState: 'loading' | 'noData' | 'noResults' | 'data' =
      this._isLoading
        ? 'loading'
        : this._items.length === 0
          ? 'noData'
          : isQueryActive && filteredItems.length === 0
            ? 'noResults'
            : 'data';

    // Tear down inner instances that don't survive the new state. Tree stays
    // around for transitions within the data branch (user typing) so it can
    // keep its scroll position + internal expansion. Empty / skeleton are
    // re-created on every state change because they're cheap and we want
    // their own teardown to fire cleanly.
    const wasState = this._bodyState;
    this._bodyState = nextState;

    if (nextState !== 'data' && this._treeInstance) {
      this._treeInstance.destroy();
      this._treeInstance = null;
    }
    if (nextState !== 'noData' && nextState !== 'noResults') {
      this._emptyInstance?.destroy();
      this._emptyInstance = null;
      this._emptyHostEl = null;
    }
    if (nextState !== 'loading') {
      this._skeletonEl = null;
    }

    // Drop the body's children only when the state changed. Within the data
    // branch the tree host is preserved so re-renders are surgical.
    if (wasState !== nextState) {
      body.replaceChildren();
    }

    // Mirror aria-busy on the body so screen readers announce the loading
    // state for the tree region.
    if (nextState === 'loading') {
      body.setAttribute('aria-busy', 'true');
    } else {
      body.removeAttribute('aria-busy');
    }

    if (nextState === 'loading') {
      this._renderSkeleton(body);
      return;
    }

    if (nextState === 'noData' || nextState === 'noResults') {
      this._renderEmpty(body, nextState);
      return;
    }

    // dataState === 'data'.
    if (!this._treeHostEl) {
      this._treeHostEl = document.createElement('div');
      this._treeHostEl.className = 'arvo-dd-tree__tree';
    }
    if (this._treeHostEl.parentElement !== body) {
      body.replaceChildren(this._treeHostEl);
    }

    if (this._treeInstance) {
      this._treeInstance.setItems(filteredItems);
      this._treeInstance.setSearchQuery(trimmedQuery);
      if (!this._isControlledExpansion) {
        this._treeInstance.expanded(this._expandedIds);
      }
    } else {
      // Hybrid options surface: spread `treeProps` first so flat / parent-
      // computed values win on overlap.
      this._treeInstance = ArvoTreeView.initialize(this._treeHostEl, {
        ...(this._options.treeProps ?? {}),
        items: filteredItems,
        variant: this._selectionMode === 'multiple' ? 'multiSelect' : 'singleSelect',
        size: this._options.size ?? 'sm',
        appearance: this._options.appearance ?? 'default',
        // Always treat the draft as controlled state for the embedded
        // tree so commit-on-apply works without races.
        selectedIds: this._draftSelectedIds,
        expandedIds: this._isControlledExpansion ? this._expandedIds : undefined,
        defaultExpandedIds: this._isControlledExpansion ? undefined : this._expandedIds,
        searchQuery: trimmedQuery,
        ariaLabel: this._options.title ?? 'Tree items',
        onSelectionChange: (ids, ctx) => this._handleTreeSelectionChange(ids, ctx),
        onExpandedChange: (ids, ctx) => this._handleTreeExpandedChange(ids, ctx),
      });
    }
  }

  /**
   * B4 helper -- compute the select-all checkbox state from the
   * current draft against the eligible (non-disabled) ids in the
   * unfiltered tree.
   */
  private _computeSelectAllState(): 'none' | 'some' | 'all' {
    const allEligible = collectAllEligibleIds(this._items);
    if (allEligible.length === 0) return 'none';
    const draftSet = new Set(this._draftSelectedIds);
    let count = 0;
    for (const id of allEligible) if (draftSet.has(id)) count += 1;
    if (count === 0) return 'none';
    if (count === allEligible.length) return 'all';
    return 'some';
  }

  private _syncSelectAllUi(): void {
    if (!this._selectAllInstance) return;
    const state = this._computeSelectAllState();
    this._selectAllInstance.toggle(state === 'all');
    this._selectAllInstance.indeterminate(state === 'some');
  }

  private _handleSelectAllToggle(): void {
    const state = this._computeSelectAllState();
    const next = state === 'all' ? [] : collectAllEligibleIds(this._items);
    this._draftSelectedIds = next;
    this._treeInstance?.selected(next);
    this._syncSelectAllUi();
    if (!this._isCommitOnApply) {
      this._selectedIds = [...next];
      const ctx: TreeSelectionContext = {
        item: this._items[0] ?? ({ id: '', label: '' } as ArvoTreeItem),
        isSelected: state !== 'all',
      };
      this._options.onSelectionChange?.(next, ctx);
      this._dispatchEvent('dd-tree:change', {
        ids: [...next],
        item: ctx.item,
        isSelected: ctx.isSelected,
      });
    }
  }

  private _renderSkeleton(body: HTMLElement): void {
    if (!this._skeletonEl) {
      const skel = document.createElement('div');
      skel.className = 'arvo-dd-tree__skeleton';
      for (let i = 0; i < SKELETON_ROW_COUNT; i++) {
        const row = document.createElement('div');
        row.className = 'arvo-dd-tree__skeleton-row';
        // Anatomy mirrors the figma 38556-44115 reference: leading 16x16
        // square (chevron / checkbox slot) + text fill + two trailing
        // 16x16 squares (lock + badge slots).
        const lead = document.createElement('span');
        lead.className = 'arvo-dd-tree__skeleton-icon';
        lead.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.className = 'arvo-dd-tree__skeleton-text';
        text.setAttribute('aria-hidden', 'true');
        const trail1 = document.createElement('span');
        trail1.className = 'arvo-dd-tree__skeleton-icon';
        trail1.setAttribute('aria-hidden', 'true');
        const trail2 = document.createElement('span');
        trail2.className = 'arvo-dd-tree__skeleton-icon';
        trail2.setAttribute('aria-hidden', 'true');
        row.append(lead, text, trail1, trail2);
        skel.appendChild(row);
      }
      this._skeletonEl = skel;
    }
    if (this._skeletonEl.parentElement !== body) {
      body.replaceChildren(this._skeletonEl);
    }
  }

  private _renderEmpty(body: HTMLElement, state: 'noData' | 'noResults'): void {
    if (!this._emptyHostEl) {
      this._emptyHostEl = document.createElement('div');
      this._emptyHostEl.className = 'arvo-dd-tree__empty';
    }
    if (this._emptyHostEl.parentElement !== body) {
      body.replaceChildren(this._emptyHostEl);
    }

    const isNoResults = state === 'noResults';
    const customCfg = this._options.emptyConfig;
    const illustration = isNoResults
      ? 'no-results'
      : (customCfg?.illustration ?? NO_DATA_DEFAULT.illustration);
    const title = isNoResults
      ? NO_RESULTS_TITLE
      : (customCfg?.title ?? NO_DATA_DEFAULT.title);
    const message = isNoResults
      ? NO_RESULTS_MESSAGE
      : (customCfg?.message ?? NO_DATA_DEFAULT.message);
    // noResults gets the Clear Search action; noData optionally gets
    // a consumer-supplied primaryAction (e.g. "Refresh").
    const noDataAction = customCfg?.primaryAction
      ? {
          label: customCfg.primaryAction.label,
          variant:
            (customCfg.primaryAction.variant ?? 'outline') as
              | 'primary' | 'secondary' | 'tertiary' | 'outline',
          onClick: customCfg.primaryAction.onClick,
        }
      : undefined;
    const primaryAction = isNoResults
      ? {
          label: CLEAR_SEARCH_LABEL,
          variant: 'outline' as const,
          onClick: () => this._handleSearchClear(),
        }
      : noDataAction;

    if (this._emptyInstance) {
      this._emptyInstance.update({
        size: 'sm',
        orientation: 'vertical',
        illustration,
        title,
        message,
        primaryAction,
      });
    } else {
      // Create the EmptyState with its own root div so we don't overwrite
      // the `arvo-dd-tree__empty` className on the host wrapper. Mirrors the
      // React JSX shape: <div class="arvo-dd-tree__empty"><ArvoEmptyState/></div>.
      this._emptyInstance = ArvoEmptyState.create({
        size: 'sm',
        orientation: 'vertical',
        illustration,
        title,
        message,
        primaryAction,
      });
      this._emptyHostEl.appendChild(this._emptyInstance.el);
    }
  }

  private _handleTreeSelectionChange(
    ids: string[],
    ctx: TreeSelectionContext,
  ): void {
    // Always update the draft -- the embedded TreeView is rendered
    // from this state in both commit modes.
    this._draftSelectedIds = [...ids];
    this._syncSelectAllUi();
    if (!this._isCommitOnApply) {
      this._selectedIds = [...ids];
      this._options.onSelectionChange?.(ids, ctx);
      this._dispatchEvent('dd-tree:change', {
        ids: [...ids],
        item: ctx.item,
        isSelected: ctx.isSelected,
      });
    }
    // In commit-on-apply mode the consumer's `onSelectionChange` and
    // `dd-tree:change` fire only when Apply commits the draft.
  }

  private _handleTreeExpandedChange(
    ids: string[],
    ctx: TreeExpandContext,
  ): void {
    this._expandedIds = [...ids];
    this._options.onExpandedChange?.(ids, ctx);
  }

  // ---------------------------------------------------------------------------
  // Footer actions
  // ---------------------------------------------------------------------------

  private _buildPopoverActions(): ArvoPopoverActionConfig[] {
    if (this._options.actions === false) return [];
    if (this._options.actions) return this._options.actions;
    return [
      {
        id: 'reset',
        label: 'Reset',
        variant: 'tertiary',
        action: () => {
          this._handleReset();
          return false;
        },
      },
      {
        id: 'cancel',
        label: 'Cancel',
        variant: 'secondary',
        action: () => this._handleCancel(),
      },
      {
        id: 'apply',
        label: 'Apply',
        variant: 'primary',
        action: () => this._handleApply(),
      },
    ];
  }

  private _handleReset(): boolean | void {
    // Clear the draft and (in 'change' mode) the committed state.
    this._draftSelectedIds = [];
    this._treeInstance?.selected([]);
    if (!this._isCommitOnApply) {
      this._selectedIds = [];
    }
    this._syncSelectAllUi();
    this._options.onReset?.();
    this._dispatchEvent('dd-tree:reset', {});
    // Reset keeps the panel open (spec): return false so the inner
    // Popover does NOT auto-close the action button click.
    return false;
  }

  private _handleCancel(): boolean | void {
    // Revert the draft to the open-time snapshot so the next open
    // sees the committed state.
    this._draftSelectedIds = [...this._openSnapshot];
    this._treeInstance?.selected(this._draftSelectedIds);
    this._syncSelectAllUi();
    this._options.onCancel?.();
    this._dispatchEvent('dd-tree:cancel', {});
    // Returning undefined -> Popover auto-closes.
  }

  private _handleApply(): boolean | void {
    const ids = [...this._draftSelectedIds];
    const result = this._options.onApply?.(ids);
    if (result === false) return false;
    if (this._isCommitOnApply) {
      this._selectedIds = ids;
      this._options.onSelectionChange?.(ids, {
        item: this._items[0] ?? ({ id: '', label: '' } as ArvoTreeItem),
        isSelected: true,
      });
    }
    this._dispatchEvent('dd-tree:apply', { ids });
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Resize adapter
  // ---------------------------------------------------------------------------

  private _mountResize(): void {
    if (this._resize) return;
    if (this._options.isResizable === false) return;
    const panel = this._panelEl;
    if (!panel) return;

    this._resize = createResizeHandle(panel, {
      corners: ['bottom-left', 'bottom-right'],
      min: { width: DD_TREE_MIN_WIDTH, height: DD_TREE_MIN_HEIGHT },
      max: (rect: DOMRect) => ({
        width: Math.max(
          DD_TREE_MIN_WIDTH,
          Math.min(DD_TREE_MAX_WIDTH, window.innerWidth - rect.left - 16),
        ),
        height: Math.max(
          DD_TREE_MIN_HEIGHT,
          Math.min(
            Math.floor(window.innerHeight * 0.9),
            window.innerHeight - rect.top - 16,
          ),
        ),
      }),
      viewportPadding: 16,
      onResize: (rect) => {
        this._resizedWidth = rect.width;
        this._resizedHeight = rect.height;
        this._options.onResize?.(rect);
      },
      onCommit: (rect) => {
        this._resizedWidth = rect.width;
        this._resizedHeight = rect.height;
        this._options.onResizeCommit?.(rect);
        this._popover?.reposition();
      },
    });
    this._resize.mount();
  }

  private _teardownResize(): void {
    this._resize?.destroy();
    this._resize = null;
  }

  // ---------------------------------------------------------------------------
  // Inner instance teardown
  // ---------------------------------------------------------------------------

  private _destroyInnerInstances(): void {
    this._searchInstance?.destroy();
    this._searchInstance = null;
    this._filterInstance?.destroy();
    this._filterInstance = null;
    this._treeInstance?.destroy();
    this._treeInstance = null;
    this._emptyInstance?.destroy();
    this._emptyInstance = null;
    this._selectAllInstance?.destroy();
    this._selectAllInstance = null;
    this._emptyHostEl = null;
    this._skeletonEl = null;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._trigger?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail }),
    );
  }
}

export default ArvoDropdownTree;
