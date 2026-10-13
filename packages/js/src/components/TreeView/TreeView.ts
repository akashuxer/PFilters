import { createTreeNav, type TreeNav } from '@arvo/core';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoCheckbox } from '../Checkbox/Checkbox';
import { ArvoBadge, type ArvoBadgeOptions } from '../Badge/Badge';
import { ArvoEmptyState } from '../EmptyState/EmptyState';
import { ArvoLoader } from '../Loader/Loader';
import { ArvoActionMenu, type ArvoActionMenuOptions } from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Per-row trailing meta indicator. Either a bare string (text-only shortcut,
 * e.g. `'EXT'`) or an object that supports an icon, text, or both. Rendered
 * between the label and any inline actions inside `__content`.
 */
export type TreeItemMeta = string | { icon?: string; text?: string };

export interface ArvoTreeItem {
  id: string;
  label: string;
  icon?: string;
  secondaryLabel?: string;
  badge?: ArvoBadgeOptions | string | number;
  /** Optional trailing supporting indicator (1-3 char text and/or 12x12 icon). */
  meta?: TreeItemMeta;
  children?: ArvoTreeItem[] | null;
  isDisabled?: boolean;
  /**
   * Whether this row participates in selection. Defaults to `true`.
   * Set `false` on group / category parent rows whose only role is
   * to group their children:
   *   - in `multiSelect` / `navigationMultiSelect` the checkbox is
   *     suppressed and the row carries no `aria-checked`;
   *   - in `singleSelect` the row body + Enter + Space only expand /
   *     collapse (no selection occurs, no `aria-selected` is set);
   *   - in `expandOnly` the row already only expands (no change);
   *   - in `navigation` / `navigationMultiSelect` the row body + Enter
   *     still fire `onNavigate` (navigation is independent of
   *     selection).
   * The row is excluded from the multi-select cascade -- it is
   * neither toggled when an ancestor is checked nor counted toward an
   * ancestor's indeterminate state -- but its selectable descendants
   * are still cascaded. Unrelated to `isDisabled`, which blocks ALL
   * interaction including expansion / focus / navigation.
   */
  isSelectable?: boolean;
  isLoading?: boolean;
  isAsyncLoading?: boolean;
  isEmphasized?: boolean;
  /**
   * Per-item visual emphasis override. Falls back to the tree-level
   * `appearance` option when omitted. `'strong'` bumps the label
   * typography one step (sm: 14px medium; lg: 16px medium) and is
   * intended for major hierarchy sections, important parent items,
   * group-style parents, or primary categories. It changes ONLY visual
   * emphasis -- selection, navigation, expansion, keyboard, and
   * accessibility semantics are unaffected.
   */
  appearance?: TreeAppearance;
  /**
   * Render the row in the 'currently open / active destination' treatment
   * (same chrome as `selected`). Independent from `isSelected` -- use to
   * compose the Figma `navigation` / `navigationMultiSelect` patterns.
   */
  isActive?: boolean;
  /**
   * Per-row override for the search-highlight modifier. When set, the row
   * uses this value instead of the auto-derived "label contains
   * searchQuery" check. Consumers running their own match logic (fuzzy
   * match, scoring, etc.) can use this to drive which rows visually
   * highlight while still relying on the tree's substring highlight
   * overlay inside `__label-match`.
   */
  isSearchMatch?: boolean;
  ariaCurrent?: boolean | 'page' | 'location' | 'true';
  ariaLabel?: string;
  /** Per-row override of the tree-level `actions` default. */
  actions?: TreeRowAction[];
  /**
   * Per-row override for the drag handle (spec section 24). Defaults
   * to `true` when the tree-level `isReorderable` is true. Set `false`
   * to keep the row in place: it cannot be picked up via keyboard or
   * click, but it can still be the TARGET of a move from another row
   * unless `canMoveItem` rejects the move.
   */
  hasDragHandle?: boolean;
  /**
   * When true (and the tree-level `contextMenu` option is configured),
   * render a trailing `more-vertical` overflow button in the
   * inline-actions zone that opens the same context menu (spec
   * section 23). Mirrors the React API.
   */
  hasOverflowMenu?: boolean;
  /**
   * Decoupled "this row requires additional visual attention" flag
   * (spec section 33). Renders the row's label in bold italic.
   * Independent from `isSelected`, `isActive`, and `isEmphasized` --
   * compose freely. Use for tenant / source / imported / recommended
   * / recently-used / business-specific highlights.
   */
  isHighlighted?: boolean;
}

export interface TreeViewEmptyConfig {
  illustration?: string;
  title?: string;
  message?: string;
}

export type TreeSelectionMode = 'single' | 'multiple';
export type TreeSize = 'sm' | 'lg';
export type TreeAppearance = 'default' | 'strong';

/**
 * The five canonical TreeView interaction models (spec sections 6.1-6.5).
 * Choosing a `variant` defines what the chevron, label/row body,
 * checkbox (if any), Enter, and Space do for every row in the tree --
 * developers do not configure label vs checkbox vs chevron behavior
 * individually. Mapping:
 *
 * | variant                 | ARIA selection model      | row-body action  | Enter             | Space            |
 * | ----------------------- | ------------------------- | ---------------- | ----------------- | ---------------- |
 * | `expandOnly`            | none (parent rows only)   | expand / no-op   | expand            | no-op            |
 * | `singleSelect`          | aria-selected             | select           | select            | select           |
 * | `multiSelect`           | aria-checked + multisel.  | expand / no-op   | expand            | toggle checkbox  |
 * | `navigation`            | none                      | onNavigate       | onNavigate        | no-op            |
 * | `navigationMultiSelect` | aria-checked + multisel.  | onNavigate       | onNavigate        | toggle checkbox  |
 *
 * Rows whose `isSelectable === false` route the row body to `expand`
 * (or `onNavigate` in navigation variants) regardless of the tree
 * variant.
 */
export type TreeVariant =
  | 'expandOnly'
  | 'singleSelect'
  | 'multiSelect'
  | 'navigation'
  | 'navigationMultiSelect';

/**
 * Internal routing for the row body / Enter. Derived from `variant`
 * and never exposed as a public option.
 */
export type TreeRowInteraction = 'expand' | 'select' | 'navigate';

export interface TreeSelectionContext {
  item: ArvoTreeItem;
  isSelected: boolean;
}

export interface TreeExpandContext {
  item: ArvoTreeItem;
  isExpanded: boolean;
}

export interface TreeRowAction {
  id: string;
  icon: string;
  ariaLabel: string;
  isDisabled?: boolean;
  onClick?: (item: ArvoTreeItem, event: Event) => boolean | void;
}

/**
 * Drop position relative to the target row (spec section 24):
 *   - `'before'` -- place the moved row before the target (same parent).
 *   - `'after'`  -- place the moved row after the target (same parent).
 *   - `'inside'` -- place the moved row inside the target as its child.
 */
export type TreeDropPosition = 'before' | 'after' | 'inside';

export interface TreeReorderContext {
  item: ArvoTreeItem;
  fromParentId: string | null;
  fromIndex: number;
  toParentId: string | null;
  toIndex: number;
  /** Drop position relative to the target (spec section 24). */
  position: TreeDropPosition;
}

export type TreeMaxVisualLevel = 1 | 2 | 3 | 4;

export interface ArvoTreeViewOptions {
  items?: ArvoTreeItem[];
  /**
   * Selects one of the five UX interaction models (spec sections
   * 6.1-6.5). Defaults to `'expandOnly'`. See {@link TreeVariant} for
   * the per-variant mapping of row body, Enter, Space, checkbox, and
   * ARIA semantics. Rows whose `isSelectable === false` always route
   * the row body to expand (or `onNavigate` in navigation variants),
   * regardless of the tree variant.
   */
  variant?: TreeVariant;
  /**
   * Called when the row body is clicked or `Enter` is pressed AND the
   * tree's `variant` is `'navigation'` or `'navigationMultiSelect'`.
   * Selection state is NOT mutated; pair with per-row `isActive` (and
   * optionally `ariaCurrent`) to drive the "currently open destination"
   * chrome.
   */
  onNavigate?: (item: ArvoTreeItem, event: Event) => void;
  size?: TreeSize;
  /**
   * Tree-level default for per-row appearance. Per-row
   * `item.appearance` overrides this for individual rows.
   */
  appearance?: TreeAppearance;
  /**
   * When `true`, render vertical + elbow connector lines that
   * communicate parent-child relationships. Default `false` -- depth is
   * communicated through indentation alone (spec section 13).
   */
  hasHierarchyLines?: boolean;
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  searchQuery?: string;
  onLoadChildren?: (item: ArvoTreeItem) => Promise<ArvoTreeItem[]>;
  isDisabled?: boolean;
  isLoading?: boolean;
  emptyConfig?: TreeViewEmptyConfig;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  onSelectionChange?: (ids: string[], context: TreeSelectionContext) => void;
  onExpandedChange?: (ids: string[], context: TreeExpandContext) => void;
  /** Default action set rendered on every row. Per-row `item.actions` overrides this. */
  actions?: TreeRowAction[];
  /** Visibility of the `__actions` row. Defaults to 'hover'. */
  actionsVisibility?: 'always' | 'hover';
  /**
   * Max number of indent slots rendered per row (1-4). Defaults to 4.
   * Deeper rows still receive accurate `aria-level`; only the visual
   * indent cluster caps.
   */
  maxVisualLevel?: TreeMaxVisualLevel;
  /** Enables the keyboard + click reorder mode. */
  isReorderable?: boolean;
  /** Called before a reorder commits. Return false to cancel. */
  onReorder?: (context: TreeReorderContext) => boolean | void;
  /**
   * Optional pre-commit validator. Called BEFORE `tree:reorder` is
   * dispatched and BEFORE `onReorder` runs. Return `false` to reject
   * the move; the live region announces "Move not allowed." and the
   * row stays in place.
   */
  canMoveItem?: (context: TreeReorderContext) => boolean;
  /**
   * Per-row context menu configuration (spec section 23). Either a
   * static `ArvoActionMenuOptions['items']` array OR a function that
   * returns the items for a given row. When set, the tree wires four
   * triggers: right-click on the row, `Shift+F10`, `Ctrl+Shift+X`,
   * and the Context Menu key. Pairs with per-item `hasOverflowMenu`
   * which adds a keyboard-accessible inline overflow button.
   */
  contextMenu?:
    | ArvoActionMenuOptions['items']
    | ((item: ArvoTreeItem) => ArvoActionMenuOptions['items']);
  /**
   * Optional callback fired when a context menu opens on a row.
   * Receives the originating tree item and the trigger source:
   * `'mouse'` for right-click, `'keyboard'` for Shift+F10 /
   * Ctrl+Shift+X / ContextMenu, `'overflow'` for the inline overflow
   * button.
   */
  onContextMenu?: (
    item: ArvoTreeItem,
    trigger: 'mouse' | 'keyboard' | 'overflow',
  ) => void;
  /**
   * Read-only mode (spec section A14). Selection and expansion are
   * still possible; mutating affordances (inline actions, drag
   * handles, overflow menu, context menu) are suppressed. The tree
   * root carries `aria-readonly='true'`.
   */
  isReadOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VisibleRow {
  item: ArvoTreeItem;
  level: number;
  /** isLastChild[i] = ancestor at depth i was the last sibling at that depth. */
  ancestorIsLastFlags: boolean[];
  isLastChild: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId: string | null;
  setSize: number;
  posInSet: number;
}

function hasChildrenShape(item: ArvoTreeItem): boolean {
  return item.children !== undefined;
}

function buildVisibleRows(
  items: ArvoTreeItem[],
  expandedSet: Set<string>,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  function walk(
    nodes: ArvoTreeItem[],
    level: number,
    ancestorIsLastFlags: boolean[],
    parentId: string | null,
  ): void {
    nodes.forEach((node, idx) => {
      const isLastChild = idx === nodes.length - 1;
      const hasChildren = hasChildrenShape(node);
      const isExpanded = hasChildren && expandedSet.has(node.id);
      rows.push({
        item: node,
        level,
        ancestorIsLastFlags,
        isLastChild,
        hasChildren,
        isExpanded,
        parentId,
        setSize: nodes.length,
        posInSet: idx + 1,
      });
      if (
        hasChildren &&
        isExpanded &&
        Array.isArray(node.children) &&
        node.children.length > 0
      ) {
        walk(
          node.children,
          level + 1,
          [...ancestorIsLastFlags, isLastChild],
          node.id,
        );
      }
    });
  }
  walk(items, 0, [], null);
  return rows;
}

interface NormalizedMeta {
  icon: string | null;
  text: string | null;
}

/**
 * Normalize the `meta` field into a `{ icon, text }` shape. Returns `null`
 * when neither icon nor text is supplied so callers can skip rendering.
 */
function normalizeMeta(meta: TreeItemMeta | undefined): NormalizedMeta | null {
  if (meta == null) return null;
  if (typeof meta === 'string') {
    return meta.length > 0 ? { icon: null, text: meta } : null;
  }
  const icon = typeof meta.icon === 'string' && meta.icon.length > 0 ? meta.icon : null;
  const text = typeof meta.text === 'string' && meta.text.length > 0 ? meta.text : null;
  if (icon == null && text == null) return null;
  return { icon, text };
}

function findItemById(
  items: ArvoTreeItem[],
  id: string,
): ArvoTreeItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (Array.isArray(item.children)) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function patchItemById(
  items: ArvoTreeItem[],
  id: string,
  patch: Partial<ArvoTreeItem>,
): boolean {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items[i] = { ...items[i], ...patch };
      return true;
    }
    if (Array.isArray(items[i].children)) {
      if (patchItemById(items[i].children as ArvoTreeItem[], id, patch)) {
        return true;
      }
    }
  }
  return false;
}

/** Whether a row participates in selection. Defaults to `true`. */
function isItemSelectable(item: ArvoTreeItem): boolean {
  return item.isSelectable !== false;
}

/**
 * Resolve the internal `{ selectionMode, rowInteraction }` pair for a
 * given public `variant`. Single source of truth for the five UX
 * interaction models -- the rest of the class never branches on
 * `variant` directly; it reads the derived pair.
 */
function variantToModes(
  variant: TreeVariant,
): { selectionMode: TreeSelectionMode; rowInteraction: TreeRowInteraction } {
  switch (variant) {
    case 'expandOnly':
      return { selectionMode: 'single', rowInteraction: 'expand' };
    case 'singleSelect':
      return { selectionMode: 'single', rowInteraction: 'select' };
    case 'multiSelect':
      return { selectionMode: 'multiple', rowInteraction: 'expand' };
    case 'navigation':
      return { selectionMode: 'single', rowInteraction: 'navigate' };
    case 'navigationMultiSelect':
      return { selectionMode: 'multiple', rowInteraction: 'navigate' };
  }
}

/**
 * Collect the ids of every selectable descendant under `item` that
 * should participate in the multi-select cascade and the indeterminate
 * calculation. Skips descendants that are:
 *   - `isDisabled` (spec section 16)
 *   - `isSelectable === false` (group/category parents) -- those rows
 *     are invisible to selection. The walk still continues INTO their
 *     own selectable descendants, which ARE cascaded as a group.
 */
function collectEligibleDescendantIds(item: ArvoTreeItem): string[] {
  const ids: string[] = [];
  function walk(node: ArvoTreeItem): void {
    if (!Array.isArray(node.children)) return;
    for (const child of node.children) {
      if (child.isDisabled) continue;
      if (isItemSelectable(child)) ids.push(child.id);
      // Always recurse so selectable grandchildren under a
      // non-selectable group parent still cascade.
      walk(child);
    }
  }
  walk(item);
  return ids;
}

/**
 * Compute tri-state aria-checked for a row in multi-select mode. A parent
 * with descendants reports `'mixed'` when some (but not all) eligible
 * descendants are selected, satisfying the WAI-ARIA Tree pattern's
 * `indeterminateMultiSelect` requirement.
 *
 * Disabled descendants are excluded from the count (spec section 16).
 * Rows with `isSelectable === false` are also excluded (they neither
 * receive nor contribute selection state) but the walk still recurses
 * into their selectable descendants. A parent whose only unselected
 * descendants are disabled or non-selectable therefore reads as fully
 * selected ('true') once every eligible descendant is selected, instead
 * of being stuck at 'mixed'. Leaf rows fall back to the boolean
 * isRowSelected.
 */
function computeMultiAriaChecked(
  item: ArvoTreeItem,
  isRowSelected: boolean,
  selectedSet: Set<string>,
): boolean | 'mixed' {
  if (!Array.isArray(item.children) || item.children.length === 0) {
    return isRowSelected;
  }
  const descendants = collectEligibleDescendantIds(item);
  if (descendants.length === 0) return isRowSelected;
  let selectedCount = 0;
  for (const id of descendants) {
    if (selectedSet.has(id)) selectedCount += 1;
  }
  if (selectedCount === 0) return false;
  if (selectedCount === descendants.length) return true;
  return 'mixed';
}

/**
 * Auto-derive whether a row's label contains the active search query.
 * Returns false for an empty query so the row-level
 * `--search-highlight` modifier is suppressed when search is inactive
 * (the previous implementation incorrectly applied the modifier to every
 * row whenever `searchQuery` was truthy). Consumers running their own
 * match logic can override this via `item.isSearchMatch`.
 */
function labelMatchesQuery(label: string, query: string): boolean {
  if (!query) return false;
  return label.toLowerCase().includes(query.toLowerCase());
}

function buildMatchParts(label: string, query: string): Array<{ text: string; isMatch: boolean }> {
  if (!query) return [{ text: label, isMatch: false }];
  const haystack = label.toLowerCase();
  const needle = query.toLowerCase();
  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let i = 0;
  while (i < label.length) {
    const idx = haystack.indexOf(needle, i);
    if (idx === -1) {
      parts.push({ text: label.slice(i), isMatch: false });
      break;
    }
    if (idx > i) parts.push({ text: label.slice(i, idx), isMatch: false });
    parts.push({ text: label.slice(idx, idx + needle.length), isMatch: true });
    i = idx + needle.length;
  }
  return parts;
}

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoTreeView {
  private _element: HTMLElement;
  private _options: Required<
    Omit<
      ArvoTreeViewOptions,
      | 'onSelectionChange'
      | 'onExpandedChange'
      | 'onLoadChildren'
      | 'onReorder'
      | 'onNavigate'
      | 'canMoveItem'
      | 'contextMenu'
      | 'onContextMenu'
      | 'isReadOnly'
      | 'selectedIds'
      | 'expandedIds'
      | 'searchQuery'
      | 'emptyConfig'
      | 'ariaLabel'
      | 'ariaLabelledBy'
      | 'actions'
      | 'variant'
    >
  > & {
    selectedIds: string[] | undefined;
    expandedIds: string[] | undefined;
    searchQuery: string;
    emptyConfig: TreeViewEmptyConfig | null;
    ariaLabel: string | null;
    ariaLabelledBy: string | null;
    actions: TreeRowAction[] | null;
    /** Public variant value (kept for re-rendering / introspection). */
    variant: TreeVariant;
    /** Derived from `variant`; never set directly. */
    selectionMode: TreeSelectionMode;
    /** Derived from `variant`; never set directly. */
    rowInteraction: TreeRowInteraction;
    onSelectionChange: ArvoTreeViewOptions['onSelectionChange'] | null;
    onExpandedChange: ArvoTreeViewOptions['onExpandedChange'] | null;
    onLoadChildren: ArvoTreeViewOptions['onLoadChildren'] | null;
    onReorder: ArvoTreeViewOptions['onReorder'] | null;
    onNavigate: ArvoTreeViewOptions['onNavigate'] | null;
    canMoveItem: ArvoTreeViewOptions['canMoveItem'] | null;
    contextMenu: ArvoTreeViewOptions['contextMenu'] | null;
    onContextMenu: ArvoTreeViewOptions['onContextMenu'] | null;
    isReadOnly: boolean;
  };
  private _id: string;
  private _items: ArvoTreeItem[];
  private _selectedSet: Set<string>;
  private _expandedSet: Set<string>;
  private _asyncLoadingSet: Set<string> = new Set();
  private _activeIndex = 0;
  private _reorderingId: string | null = null;
  private _liveRegionEl: HTMLElement | null = null;
  // A9 context menu state. The tree owns ONE ArvoActionMenu instance
  // whose trigger element re-points at the current "context row" each
  // time the menu opens; focus restores to that row on close.
  private _contextMenu: ArvoActionMenu | null = null;
  private _contextTriggerEl: HTMLElement | null = null;
  private _contextItemId: string | null = null;
  private _treeNav: TreeNav | null = null;
  /**
   * Tree-level inner instances created during a full rebuild that are
   * NOT scoped to a single row (e.g. the global EmptyState body and
   * the whole-tree Pattern B loader). Per-row inner instances live in
   * `_innerInstancesByRow` so a surgical update can tear down or
   * preserve them independently of unaffected rows.
   */
  private _innerInstancesTreeLevel: Array<{ destroy: () => void }> = [];
  /**
   * Per-row inner instances keyed by the row's id. Each entry is the
   * list of ArvoBadge / ArvoCheckbox / ArvoIconButton instances
   * mounted inside that row. Surgical expansion updates destroy
   * ONLY the entries for rows that are leaving the visible set;
   * surgical selection updates touch zero instances (they mutate
   * DOM attrs in place).
   */
  private _innerInstancesByRow: Map<string, Array<{ destroy: () => void }>> = new Map();
  /**
   * Per-row BODY inner instance keyed by the row's id. Tracks the
   * single ArvoLoader / ArvoEmptyState mounted in the body sibling
   * (`__loader` / `__empty`) of an async-loading or empty parent.
   * Kept separate from `_innerInstancesByRow` so the body's instance
   * can be torn down independently when the body is removed (collapse
   * of an empty parent, resolution of an async load) without touching
   * the row's own badge / checkbox / icon button instances.
   */
  private _bodyInstanceByRow: Map<string, { destroy: () => void }> = new Map();
  /**
   * Map from row id to its rendered `[role="treeitem"]` element. Used
   * by surgical helpers (`_renderSelectionChange`,
   * `_renderExpansionChange`, `_renderSearchHighlight`) so they can
   * locate a row in O(1) without re-querying the DOM.
   */
  private _rowMap: Map<string, HTMLElement> = new Map();
  /**
   * Map from row id to the latest `ArvoTreeItem` it was built from.
   * Mirrors `_rowMap` so surgical helpers can read item data
   * (icon, badge, isDisabled, isSelectable, etc.) without walking
   * the source `_items` tree.
   */
  private _dataMap: Map<string, ArvoTreeItem> = new Map();
  /**
   * The full visible-row layout from the last full rebuild. Surgical
   * expansion uses this snapshot to know which children to insert
   * (and where) when a parent opens, or which descendant rows to
   * remove when it closes.
   */
  private _lastVisibleRows: VisibleRow[] = [];
  private _isControlledSelection: boolean;
  private _isControlledExpansion: boolean;

  static initialize(element: HTMLElement, options?: ArvoTreeViewOptions): ArvoTreeView {
    return new ArvoTreeView(element, options);
  }

  constructor(element: HTMLElement, options: ArvoTreeViewOptions = {}) {
    this._element = element;
    this._id = `arvo-tree-${++_idCounter}`;

    this._isControlledSelection = options.selectedIds !== undefined;
    this._isControlledExpansion = options.expandedIds !== undefined;

    const variant = options.variant ?? 'expandOnly';
    const { selectionMode, rowInteraction } = variantToModes(variant);
    this._options = {
      items: options.items ?? [],
      variant,
      selectionMode,
      rowInteraction,
      size: options.size ?? 'sm',
      appearance: options.appearance ?? 'default',
      hasHierarchyLines: options.hasHierarchyLines ?? false,
      selectedIds: options.selectedIds,
      defaultSelectedIds: options.defaultSelectedIds ?? [],
      expandedIds: options.expandedIds,
      defaultExpandedIds: options.defaultExpandedIds ?? [],
      searchQuery: options.searchQuery ?? '',
      isDisabled: options.isDisabled ?? false,
      isLoading: options.isLoading ?? false,
      emptyConfig: options.emptyConfig ?? null,
      ariaLabel: options.ariaLabel ?? null,
      ariaLabelledBy: options.ariaLabelledBy ?? null,
      actions: options.actions ?? null,
      actionsVisibility: options.actionsVisibility ?? 'hover',
      maxVisualLevel: options.maxVisualLevel ?? 4,
      isReorderable: options.isReorderable ?? false,
      onSelectionChange: options.onSelectionChange ?? null,
      onExpandedChange: options.onExpandedChange ?? null,
      onLoadChildren: options.onLoadChildren ?? null,
      onReorder: options.onReorder ?? null,
      onNavigate: options.onNavigate ?? null,
      canMoveItem: options.canMoveItem ?? null,
      contextMenu: options.contextMenu ?? null,
      onContextMenu: options.onContextMenu ?? null,
      isReadOnly: options.isReadOnly ?? false,
    };

    this._items = this._options.items;
    this._selectedSet = new Set(
      this._isControlledSelection
        ? (this._options.selectedIds as string[])
        : this._options.defaultSelectedIds,
    );
    this._expandedSet = new Set(
      this._isControlledExpansion
        ? (this._options.expandedIds as string[])
        : this._options.defaultExpandedIds,
    );

    this._fullRebuild();
    this._bindEvents();
  }

  destroy(): void {
    this._unbindEvents();
    this._contextMenu?.destroy();
    this._contextMenu = null;
    this._contextTriggerEl = null;
    this._element.replaceChildren();
    this._element.removeAttribute('role');
    this._element.removeAttribute('aria-label');
    this._element.removeAttribute('aria-labelledby');
    this._element.removeAttribute('aria-multiselectable');
    this._element.removeAttribute('aria-disabled');
    this._element.removeAttribute('aria-busy');
    this._element.removeAttribute('id');
    this._element.classList.remove(
      'arvo-tree',
      'arvo-tree--sm',
      'arvo-tree--lg',
      'arvo-tree--expandOnly',
      'arvo-tree--singleSelect',
      'arvo-tree--multiSelect',
      'arvo-tree--navigation',
      'arvo-tree--navigationMultiSelect',
      'arvo-tree--multiple',
      'arvo-tree--strong',
      'arvo-tree--lines',
      'arvo-tree--readonly',
      'arvo-tree--actions-on-hover',
      'is-disabled',
      'loading',
    );
    this._element.removeAttribute('aria-readonly');
  }

  // -- Public methods --------------------------------------------------------

  selected(ids?: string[]): string[] | void {
    if (ids === undefined) return Array.from(this._selectedSet);
    if (!this._isControlledSelection) {
      this._selectedSet = new Set(ids);
      this._renderSelectionChange();
    }
  }

  expanded(ids?: string[]): string[] | void {
    if (ids === undefined) return Array.from(this._expandedSet);
    if (!this._isControlledExpansion) {
      const prev = this._expandedSet;
      const next = new Set(ids);
      this._expandedSet = next;
      // Diff the two sets and apply each change individually so
      // unchanged rows keep their DOM identity + mounted inner
      // instances. Falls back to the full rebuild when the affected
      // parent is no longer in the data tree.
      const allChanged: Array<{ id: string; willExpand: boolean }> = [];
      for (const id of next) if (!prev.has(id)) allChanged.push({ id, willExpand: true });
      for (const id of prev) if (!next.has(id)) allChanged.push({ id, willExpand: false });
      if (allChanged.length === 0) return;
      for (const change of allChanged) {
        const item = findItemById(this._items, change.id);
        if (!item) {
          this._fullRebuild();
          return;
        }
        this._renderExpansionChange(item, change.willExpand);
      }
    }
  }

  expand(id: string): void {
    const item = findItemById(this._items, id);
    if (item) this._setExpansion(item, true);
  }

  collapse(id: string): void {
    const item = findItemById(this._items, id);
    if (item) this._setExpansion(item, false);
  }

  toggleExpansion(id: string): void {
    const item = findItemById(this._items, id);
    if (item) this._setExpansion(item, !this._expandedSet.has(id));
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;
    this._options.isDisabled = state;
    this._renderTreeState();
  }

  setLoading(state: boolean): void {
    // Transitioning the tree-level skeleton on or off swaps the body
    // content between rendered rows and the Pattern B skeleton; the
    // shape change is large enough that the full rebuild is the right
    // path. Tree-level disabled + readOnly stay surgical because they
    // only toggle classes / ARIA on existing rows.
    this._options.isLoading = state;
    this._fullRebuild();
  }

  /**
   * Update the search query used for substring highlighting in row labels.
   * Mirrors the reactive React `searchQuery` prop so composing parents
   * (DropdownTree, ActionMenu, HybridPopover, etc.) can drive highlighting
   * without tearing down + rebuilding the tree on every keystroke.
   */
  setSearchQuery(query: string): void {
    if (this._options.searchQuery === query) return;
    this._options.searchQuery = query;
    this._renderSearchHighlight();
  }

  setItems(items: ArvoTreeItem[]): void {
    const prevItems = this._items;
    // Capture focus context BEFORE `_render()` wipes the DOM (focused
    // element becomes <body> after replaceChildren).
    const focusToken = this._captureFocusContext();
    this._items = items;
    // Prune selected / expanded ids that no longer exist.
    const allIds = new Set<string>();
    function walk(n: ArvoTreeItem): void {
      allIds.add(n.id);
      if (Array.isArray(n.children)) n.children.forEach(walk);
    }
    items.forEach(walk);
    if (!this._isControlledSelection) {
      this._selectedSet = new Set(
        Array.from(this._selectedSet).filter(id => allIds.has(id)),
      );
    }
    if (!this._isControlledExpansion) {
      this._expandedSet = new Set(
        Array.from(this._expandedSet).filter(id => allIds.has(id)),
      );
    }
    this._reconcileLazyLoadSelection(prevItems);
    this._fullRebuild();
    this._restoreFocusAfterMutation(focusToken);
  }

  updateItem(id: string, partial: Partial<ArvoTreeItem>): void {
    // Snapshot BEFORE mutating so the A8 reconciliation can compare
    // old vs new descendant sets. The most common consumer of
    // `updateItem` is the async-load completion path
    // (`updateItem(parentId, { children: loaded })`), which is exactly
    // the case A8 handles. The patch may carry structural changes
    // (children: null -> array; children gaining new entries; loader
    // flag flipping) so the full rebuild is the safe path here.
    const prevSnapshot = this._snapshotItems();
    const focusToken = this._captureFocusContext();
    if (patchItemById(this._items, id, partial)) {
      this._reconcileLazyLoadSelection(prevSnapshot);
      this._fullRebuild();
      this._restoreFocusAfterMutation(focusToken);
    }
  }

  /**
   * Capture a shallow snapshot of `_items` BEFORE a mutation so the A8
   * reconciliation can compare old vs new descendant sets. Used by
   * `updateItem` which mutates in place; `setItems` already has the
   * old array available.
   */
  private _snapshotItems(): ArvoTreeItem[] {
    function clone(node: ArvoTreeItem): ArvoTreeItem {
      const c: ArvoTreeItem = { ...node };
      if (Array.isArray(node.children)) {
        c.children = node.children.map(clone);
      }
      return c;
    }
    return this._items.map(clone);
  }

  /**
   * A8 lazy-load selection inheritance (multi-select only). When the
   * items array changes, walk the new tree and find selected parents
   * whose eligible descendant set has GROWN since the previous render.
   * Add the new eligible descendant ids to the selection. Parents
   * that were `mixed` (a user-selected subset) are left alone.
   */
  private _reconcileLazyLoadSelection(prevItems: ArvoTreeItem[]): void {
    if (this._options.selectionMode !== 'multiple') return;
    if (this._selectedSet.size === 0) return;

    const additions: string[] = [];
    const walk = (nodes: ArvoTreeItem[]): void => {
      for (const node of nodes) {
        if (
          this._selectedSet.has(node.id) &&
          Array.isArray(node.children) &&
          node.children.length > 0
        ) {
          const prevNode = findItemById(prevItems, node.id);
          const prevEligible = prevNode
            ? new Set(collectEligibleDescendantIds(prevNode))
            : new Set<string>();
          const wasFullySelected =
            prevNode == null ||
            Array.from(prevEligible).every(id => this._selectedSet.has(id));
          if (!wasFullySelected) {
            walk(node.children);
            continue;
          }
          const nowEligible = collectEligibleDescendantIds(node);
          for (const id of nowEligible) {
            if (!prevEligible.has(id) && !this._selectedSet.has(id)) {
              additions.push(id);
            }
          }
        }
        if (Array.isArray(node.children)) walk(node.children);
      }
    };
    walk(this._items);

    if (additions.length === 0) return;
    if (!this._isControlledSelection) {
      additions.forEach(id => this._selectedSet.add(id));
    }
    const next = Array.from(this._selectedSet);
    this._options.onSelectionChange?.(next, {
      item: this._items[0],
      isSelected: true,
    });
  }

  /**
   * Capture the focus context before a structural mutation. Returns
   * `null` when the tree does not own focus, so the restoration step
   * can be skipped without stealing focus from outside the tree.
   */
  private _captureFocusContext(): {
    focusedId: string | null;
    parentId: string | null;
    index: number;
  } | null {
    const treeEl = this._element;
    if (!treeEl.contains(document.activeElement)) return null;
    const focusedEl = document.activeElement as HTMLElement | null;
    const focusedId = focusedEl?.id?.match(/-row-(.+)$/)?.[1] ?? null;
    if (!focusedId) return { focusedId: null, parentId: null, index: this._activeIndex };
    const visible = buildVisibleRows(this._items, this._expandedSet);
    const idx = visible.findIndex(r => r.item.id === focusedId);
    if (idx === -1) return { focusedId, parentId: null, index: this._activeIndex };
    return {
      focusedId,
      parentId: visible[idx].parentId,
      index: idx,
    };
  }

  /**
   * A12 focus restoration. After a structural mutation, if the
   * previously focused row id is no longer in the visible row set,
   * fall back via the spec's order (spec section 31):
   *   next sibling -> previous sibling -> parent -> first non-disabled
   *
   * Receives a token captured BEFORE the mutation -- `_render()` wipes
   * the DOM, so `document.activeElement` is no longer reliable by the
   * time this method runs.
   */
  private _restoreFocusAfterMutation(
    token: {
      focusedId: string | null;
      parentId: string | null;
      index: number;
    } | null,
  ): void {
    if (!token) return;
    const visible = buildVisibleRows(this._items, this._expandedSet);
    if (visible.length === 0) {
      this._activeIndex = 0;
      return;
    }
    // 1. Previously focused row still visible? Re-focus it.
    if (token.focusedId) {
      const idx = visible.findIndex(r => r.item.id === token.focusedId);
      if (idx !== -1) {
        this._activeIndex = idx;
        this._focusActiveRow();
        return;
      }
    }
    // 2. Next sibling under the same parent (then previous sibling --
    //    handled naturally by picking the row at the same index
    //    position; when the index falls off the end of the new sibling
    //    list, clamp to the new last sibling).
    const sameParent = visible.filter(r => r.parentId === token.parentId);
    if (sameParent.length > 0) {
      const sibling =
        sameParent[Math.min(token.index, sameParent.length - 1)];
      if (sibling) {
        this._activeIndex = visible.indexOf(sibling);
        this._focusActiveRow();
        return;
      }
    }
    // 3. Parent row.
    if (token.parentId) {
      const parentIdx = visible.findIndex(r => r.item.id === token.parentId);
      if (parentIdx !== -1) {
        this._activeIndex = parentIdx;
        this._focusActiveRow();
        return;
      }
    }
    // 4. First non-disabled row.
    const firstEnabled = visible.findIndex(
      r => !r.item.isDisabled && !this._options.isDisabled,
    );
    if (firstEnabled !== -1) {
      this._activeIndex = firstEnabled;
      this._focusActiveRow();
    }
  }

  focusItem(id: string): void {
    const visible = buildVisibleRows(this._items, this._expandedSet);
    const index = visible.findIndex(r => r.item.id === id);
    if (index === -1) return;
    this._activeIndex = index;
    this._focusActiveRow();
  }

  // -- Render ---------------------------------------------------------------

  /**
   * Full rebuild. Called once on mount and from mutators whose change
   * is large enough that targeted updates would be more error-prone
   * than helpful (e.g. `setItems`, async-load arrivals, reorder
   * commits, tree-level loading skeleton transitions). Surgical
   * helpers (`_renderSelectionChange`, `_renderExpansionChange`,
   * `_renderSearchHighlight`, `_renderTreeState`) avoid this path for
   * the common selection / expansion / search-highlight / disabled
   * mutations so unchanged rows keep their DOM identity and their
   * mounted inner instances (ArvoBadge, ArvoCheckbox, ArvoIconButton,
   * ArvoActionMenu) are not torn down and re-created. The row-enter
   * SCSS animation uses `@starting-style` so it only runs for genuinely
   * new rows.
   */
  private _fullRebuild(): void {
    this._destroyInnerInstances();
    this._rowMap.clear();
    this._dataMap.clear();

    const el = this._element;
    el.id = this._id;
    el.setAttribute('role', 'tree');
    el.classList.add(
      'arvo-tree',
      `arvo-tree--${this._options.size}`,
      `arvo-tree--${this._options.variant}`,
    );
    // Toggle the other variant modifiers off so a runtime variant
    // change (rare; today this only happens if a consumer mutates
    // `_options.variant` directly, but the surgical-update perf
    // refactor in a follow-up phase will need this) doesn't leave a
    // stale class on the root.
    for (const v of [
      'expandOnly',
      'singleSelect',
      'multiSelect',
      'navigation',
      'navigationMultiSelect',
    ] as const) {
      el.classList.toggle(`arvo-tree--${v}`, v === this._options.variant);
    }
    el.classList.toggle(
      'arvo-tree--multiple',
      this._options.selectionMode === 'multiple',
    );
    el.classList.toggle(
      'arvo-tree--strong',
      this._options.appearance === 'strong',
    );
    el.classList.toggle(
      'arvo-tree--lines',
      this._options.hasHierarchyLines,
    );
    el.classList.toggle(
      'arvo-tree--readonly',
      this._options.isReadOnly,
    );
    if (this._options.isReadOnly) el.setAttribute('aria-readonly', 'true');
    else el.removeAttribute('aria-readonly');
    el.classList.toggle('is-disabled', this._options.isDisabled);
    el.classList.toggle('loading', this._options.isLoading);
    el.classList.toggle(
      'arvo-tree--actions-on-hover',
      this._options.actionsVisibility === 'hover',
    );
    if (this._options.ariaLabel) el.setAttribute('aria-label', this._options.ariaLabel);
    else el.removeAttribute('aria-label');
    if (this._options.ariaLabelledBy)
      el.setAttribute('aria-labelledby', this._options.ariaLabelledBy);
    else el.removeAttribute('aria-labelledby');
    if (this._options.selectionMode === 'multiple')
      el.setAttribute('aria-multiselectable', 'true');
    else el.removeAttribute('aria-multiselectable');
    if (this._options.isDisabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
    if (this._options.isLoading) el.setAttribute('aria-busy', 'true');
    else el.removeAttribute('aria-busy');

    el.replaceChildren();

    if (this._options.isLoading) {
      this._renderSkeleton();
      return;
    }

    if (this._items.length === 0) {
      this._renderEmptyTree();
      return;
    }

    if (this._options.isReorderable) {
      const live = document.createElement('div');
      live.className = 'arvo-tree__live';
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      el.appendChild(live);
      this._liveRegionEl = live;
    } else {
      this._liveRegionEl = null;
    }

    const group = document.createElement('div');
    group.className = 'arvo-tree__group';
    group.setAttribute('role', 'group');

    const visible = buildVisibleRows(this._items, this._expandedSet);
    this._lastVisibleRows = visible;

    visible.forEach((row, index) => {
      const rowEl = this._buildRowEl(row, index);
      group.appendChild(rowEl);
      // Async-loading and empty parents get a SIBLING body element
      // (loader / empty state). Sibling-based composition keeps the
      // row's DOM identity stable across `isExpanded` toggles so the
      // surgical helpers never have to unwrap a row from a former
      // shell. See `_buildBodyEl` for the body's data-* targeting.
      const isAsync =
        this._asyncLoadingSet.has(row.item.id) || !!row.item.isAsyncLoading;
      const isEmptyParent =
        row.isExpanded &&
        Array.isArray(row.item.children) &&
        row.item.children.length === 0 &&
        !isAsync;
      if (isAsync) {
        group.appendChild(this._buildBodyEl(row.item, 'loader'));
      } else if (isEmptyParent) {
        group.appendChild(this._buildBodyEl(row.item, 'empty'));
      }
    });

    el.appendChild(group);
    this._setupTreeNav(visible);
  }

  private _renderSkeleton(): void {
    const skel = document.createElement('div');
    skel.className = 'arvo-tree__skeleton';
    for (let i = 0; i < 5; i++) {
      const r = document.createElement('div');
      r.className = 'arvo-tree__skeleton-row';
      const ico = document.createElement('span');
      ico.className = 'arvo-tree__skeleton-icon';
      ico.setAttribute('aria-hidden', 'true');
      const txt = document.createElement('span');
      txt.className = 'arvo-tree__skeleton-text';
      txt.setAttribute('aria-hidden', 'true');
      r.append(ico, txt);
      skel.appendChild(r);
    }
    this._element.appendChild(skel);
  }

  private _renderEmptyTree(): void {
    const wrap = document.createElement('div');
    wrap.className = 'arvo-tree__empty';
    this._element.appendChild(wrap);
    const empty = ArvoEmptyState.initialize(wrap, {
      illustration: this._options.emptyConfig?.illustration ?? 'no-data',
      title: this._options.emptyConfig?.title,
      message: this._options.emptyConfig?.message ?? 'No Items Available',
      size: 'sm',
      orientation: 'vertical',
    });
    this._innerInstancesTreeLevel.push(empty);
  }

  // -- Enter / exit animation ----------------------------------------------

  /**
   * Whether the user has opted into reduced motion. The animation
   * helpers below short-circuit to instant insert / remove when true
   * (and in non-browser test environments where `matchMedia` is
   * unavailable, e.g. jsdom -- we conservatively skip animations there
   * so the unit tests see synchronous DOM mutations).
   */
  private _prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  }

  /**
   * Animation budget. When a single expand or collapse touches more
   * than this many elements we skip the fade and snap the change in
   * synchronously -- protects very large trees from running 1000+
   * transitions per interaction. The compositor handles a few hundred
   * concurrent opacity/transform animations comfortably; this ceiling
   * is well above any reasonable per-screen row count.
   */
  private static readonly _ANIMATION_BUDGET = 120;
  /** Exit transition duration in ms. Mirrors the SCSS `$arvo-duration-base`. */
  private static readonly _EXIT_DURATION_MS = 200;

  /**
   * Enter is fully CSS-driven via `@starting-style` in `_arvo-tree.scss`
   * -- the browser interpolates `opacity` + `transform` (compositor-only
   * properties) on first paint after a node attaches to the document.
   *
   * This method is intentionally a no-op. It is kept on the class so
   * the surgical insertion paths can stay readable ("insert + animate
   * enter") and so a future motion redesign has one symbol to swap.
   * Inserting 1000 rows therefore costs zero per-row main-thread
   * animation work -- the GPU handles every fade in parallel.
   */
  private _animateEnter(_el: HTMLElement): void {
    /* CSS @starting-style drives the entrance; nothing to do here. */
  }

  /**
   * Fade `el` out (compositor-only) then run `onComplete` for the
   * physical DOM removal + inner-instance teardown. For batch exits
   * prefer `_animateExitBatch` -- it sets all classes in one pass and
   * shares a single timer for the whole group.
   *
   * Marks the element with `data-arvo-leaving="true"` so the surgical
   * expand path can detect and instantly purge a dying row if the user
   * re-expands a branch before the previous exit completes (preventing
   * a duplicate-id collision in the DOM).
   *
   * No height measurement, no inline-style transitions, no
   * `transitionend` listener -- the SCSS class fully defines the
   * animation and a single timeout schedules the cleanup. This keeps
   * the cost O(1) per element regardless of tree size.
   */
  private _animateExit(el: HTMLElement, onComplete?: () => void): void {
    if (this._prefersReducedMotion()) {
      onComplete?.();
      return;
    }
    el.classList.add('is-leaving');
    el.setAttribute('data-arvo-leaving', 'true');
    setTimeout(() => {
      onComplete?.();
    }, ArvoTreeView._EXIT_DURATION_MS);
  }

  /**
   * Batched fade-out for a group of elements that all leave together
   * (e.g. all descendant rows of a collapsing parent + their body
   * siblings). All elements get the `is-leaving` class in a single
   * synchronous pass, the GPU runs every transition in parallel on
   * the compositor thread, and a SINGLE timer schedules all of the
   * cleanups in one frame.
   *
   * For very large groups (more than `_ANIMATION_BUDGET` elements) the
   * fade is skipped entirely and the cleanup runs synchronously --
   * 1000-row collapses become an instant snap that completes in a
   * single frame, with zero animation cost.
   */
  private _animateExitBatch(
    elements: Array<{ el: HTMLElement; cleanup: () => void }>,
  ): void {
    if (elements.length === 0) return;
    if (
      this._prefersReducedMotion() ||
      elements.length > ArvoTreeView._ANIMATION_BUDGET
    ) {
      for (const entry of elements) entry.cleanup();
      return;
    }
    for (const entry of elements) {
      entry.el.classList.add('is-leaving');
      entry.el.setAttribute('data-arvo-leaving', 'true');
    }
    setTimeout(() => {
      for (const entry of elements) entry.cleanup();
    }, ArvoTreeView._EXIT_DURATION_MS);
  }

  // -- Surgical render helpers ----------------------------------------------

  /**
   * Apply tree-level state changes (`isDisabled`, `isLoading`,
   * `isReadOnly`) to the root element without rebuilding any rows.
   * Falls back to `_fullRebuild` when `isLoading` transitions to /
   * from skeleton mode (the body content type changes).
   */
  private _renderTreeState(): void {
    const el = this._element;
    const opts = this._options;
    el.classList.toggle('is-disabled', opts.isDisabled);
    el.classList.toggle('loading', opts.isLoading);
    el.classList.toggle('arvo-tree--readonly', opts.isReadOnly);
    if (opts.isDisabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
    if (opts.isLoading) el.setAttribute('aria-busy', 'true');
    else el.removeAttribute('aria-busy');
    if (opts.isReadOnly) el.setAttribute('aria-readonly', 'true');
    else el.removeAttribute('aria-readonly');
    // Propagate aria-disabled onto every row so screen readers see
    // the cascaded state.
    for (const [id, rowEl] of this._rowMap) {
      const item = this._dataMap.get(id);
      const isRowDisabled = !!item?.isDisabled || !!opts.isDisabled;
      rowEl.classList.toggle('is-disabled', isRowDisabled);
      if (isRowDisabled) rowEl.setAttribute('aria-disabled', 'true');
      else rowEl.removeAttribute('aria-disabled');
    }
  }

  /**
   * Update `.selected`, `aria-selected`, `aria-checked`, and the inner
   * checkbox state (where applicable) for every rendered row to match
   * the current `_selectedSet`. Does NOT touch row DOM identity or
   * tear down any inner instances -- only attributes / classes /
   * input.checked / input.indeterminate are written. This is what
   * makes a multi-select cascade O(visible rows) of attribute writes
   * instead of O(visible rows) of full DOM recreation.
   */
  private _renderSelectionChange(): void {
    const isSingleSelect = this._options.rowInteraction === 'select';
    const isMulti = this._options.selectionMode === 'multiple';
    for (const [id, rowEl] of this._rowMap) {
      const item = this._dataMap.get(id);
      if (!item) continue;
      const rowSelectable = isItemSelectable(item);
      const isRowSelected = rowSelectable && this._selectedSet.has(id);
      const isRowDisabled = !!item.isDisabled || !!this._options.isDisabled;

      rowEl.classList.toggle('selected', isRowSelected);

      // singleSelect variant: maintain aria-selected on every row.
      // Other variants strip it.
      if (isSingleSelect && rowSelectable && !isRowDisabled) {
        rowEl.setAttribute('aria-selected', String(isRowSelected));
      } else {
        rowEl.removeAttribute('aria-selected');
      }

      // multiSelect / navigationMultiSelect: maintain aria-checked and
      // update the row's checkbox input + host attributes in place.
      if (isMulti && rowSelectable) {
        const checked = computeMultiAriaChecked(
          item,
          isRowSelected,
          this._selectedSet,
        );
        rowEl.setAttribute(
          'aria-checked',
          checked === 'mixed' ? 'mixed' : String(checked),
        );
        const input = rowEl.querySelector<HTMLInputElement>(
          '.arvo-tree__check input[type="checkbox"]',
        );
        if (input) {
          // Setting these properties does NOT fire a change event, so
          // this is safe to call from inside the checkbox's own
          // onChange handler (the user-clicked row's input is already
          // in the right state; this is for cascade targets +
          // ancestors).
          input.indeterminate = checked === 'mixed';
          input.checked = checked === 'mixed' ? true : checked === true;
          if (checked === 'mixed') {
            input.setAttribute('data-indeterminate', 'true');
          } else {
            input.removeAttribute('data-indeterminate');
          }
        }
        const cbHost = rowEl.querySelector<HTMLElement>(
          '.arvo-tree__check .arvo-cb',
        );
        if (cbHost) {
          if (checked === 'mixed') {
            cbHost.setAttribute('data-indeterminate', 'true');
          } else {
            cbHost.removeAttribute('data-indeterminate');
          }
        }
      } else {
        rowEl.removeAttribute('aria-checked');
      }
    }
  }

  /**
   * Update the `--search-highlight` modifier and the `__label-match`
   * span structure on every rendered row to match the current
   * `searchQuery`. Inner instances are untouched.
   */
  private _renderSearchHighlight(): void {
    const query = this._options.searchQuery;
    for (const [id, rowEl] of this._rowMap) {
      const item = this._dataMap.get(id);
      if (!item) continue;
      const hasMatch =
        item.isSearchMatch !== undefined
          ? item.isSearchMatch
          : labelMatchesQuery(item.label, query);
      rowEl.classList.toggle('arvo-tree__item--search-highlight', hasMatch);
      // Rebuild the label DOM in place (just text + match spans -- no
      // inner instances to dispose).
      const lbl = rowEl.querySelector<HTMLElement>('.arvo-tree__label');
      if (lbl) {
        lbl.textContent = '';
        const parts = buildMatchParts(item.label, query);
        parts.forEach(p => {
          if (p.isMatch) {
            const span = document.createElement('span');
            span.className = 'arvo-tree__label-match';
            span.textContent = p.text;
            lbl.appendChild(span);
          } else {
            lbl.appendChild(document.createTextNode(p.text));
          }
        });
      }
    }
  }

  /**
   * Apply an expansion change to the visible row set without
   * rebuilding the entire tree. Handles every variant surgically:
   *
   *  - Expand a parent with children: build the newly-visible
   *    descendant rows and insert them as siblings right after the
   *    parent in `__group`; animate each one in.
   *  - Expand a parent whose `children === []` (empty parent):
   *    insert an `__empty` body element as a sibling right after the
   *    parent; tag the row with `--empty` and animate the body in.
   *  - Expand a parent whose `children === null` (async-load):
   *    insert an `__loader` body element as a sibling; tag the row
   *    with `--async-loading` + `aria-busy`. The body is replaced /
   *    removed by `_resolveAsyncLoad` once the children promise
   *    resolves.
   *  - Collapse any of the above: remove the body sibling (if any),
   *    remove the row classes, then animate out + remove every
   *    descendant row (and its own attached body) below the parent.
   *
   * Inner instances mounted under unaffected rows are NEVER torn
   * down -- the parent row keeps the same DOM identity in every case
   * so the previously-allocated ArvoBadge / ArvoCheckbox /
   * ArvoIconButton / ArvoActionMenu instances stay alive.
   */
  private _renderExpansionChange(item: ArvoTreeItem, willExpand: boolean): void {
    const id = item.id;
    const parentRowEl = this._rowMap.get(id);
    if (!parentRowEl) {
      this._fullRebuild();
      return;
    }
    const group = parentRowEl.parentElement;
    if (!group) {
      this._fullRebuild();
      return;
    }

    // Update parent row attributes + chevron tooltip up front -- the
    // visual aria-expanded flip should be synchronous regardless of
    // which body / descendant path we take.
    parentRowEl.setAttribute('aria-expanded', String(willExpand));
    parentRowEl.classList.toggle('arvo-tree__item--expanded', willExpand);
    const chevronBtn = parentRowEl.querySelector<HTMLElement>(
      '.arvo-tree__chevron button',
    );
    if (chevronBtn) {
      chevronBtn.setAttribute(
        'aria-label',
        willExpand ? `Collapse ${item.label}` : `Expand ${item.label}`,
      );
      const tooltipEl = parentRowEl.querySelector<HTMLElement>(
        '.arvo-tree__chevron [data-arvo-tooltip]',
      );
      if (tooltipEl) {
        tooltipEl.textContent = willExpand
          ? `Collapse ${item.label}`
          : `Expand ${item.label}`;
      }
    }

    if (willExpand) {
      const isAsync =
        item.children === null ||
        this._asyncLoadingSet.has(id) ||
        !!item.isAsyncLoading;
      const isEmptyParent =
        !isAsync &&
        Array.isArray(item.children) &&
        item.children.length === 0;

      if (isAsync) {
        parentRowEl.classList.add('arvo-tree__item--async-loading');
        parentRowEl.setAttribute('aria-busy', 'true');
        // Clear any dying body left over from a previous collapse so
        // we don't end up with a ghost beside the row.
        this._purgeDyingBody(id);
        const existingBody = this._findRowBody(parentRowEl, id);
        if (!existingBody) {
          const loaderEl = this._buildBodyEl(item, 'loader');
          group.insertBefore(loaderEl, parentRowEl.nextSibling);
          this._animateEnter(loaderEl);
        }
        // Refresh tree-nav so keyboard nav still points at the right
        // index even though no rows changed.
        this._lastVisibleRows = buildVisibleRows(
          this._items,
          this._expandedSet,
        );
        this._setupTreeNav(this._lastVisibleRows);
        return;
      }

      if (isEmptyParent) {
        parentRowEl.classList.add('arvo-tree__item--empty');
        this._purgeDyingBody(id);
        const existingBody = this._findRowBody(parentRowEl, id);
        if (!existingBody) {
          const emptyEl = this._buildBodyEl(item, 'empty');
          group.insertBefore(emptyEl, parentRowEl.nextSibling);
          this._animateEnter(emptyEl);
        }
        this._lastVisibleRows = buildVisibleRows(
          this._items,
          this._expandedSet,
        );
        this._setupTreeNav(this._lastVisibleRows);
        return;
      }

      // Real children -- compute the new visible row layout, build
      // every descendant into a single DocumentFragment, then attach
      // the fragment in ONE DOM insertion. One reflow regardless of
      // how many rows are appearing. Each row's entrance animation is
      // driven by CSS `@starting-style` so this loop allocates no
      // listeners and no timers per row.
      const newVisible = buildVisibleRows(this._items, this._expandedSet);
      this._lastVisibleRows = newVisible;
      const parentIdx = newVisible.findIndex(r => r.item.id === id);
      if (parentIdx === -1) {
        this._fullRebuild();
        return;
      }
      const parentLevel = newVisible[parentIdx].level;
      const pivot: Node | null = parentRowEl.nextSibling;
      const fragment = document.createDocumentFragment();
      for (let i = parentIdx + 1; i < newVisible.length; i++) {
        const r = newVisible[i];
        if (r.level <= parentLevel) break;
        // Clear any dying copy of this row left over from a previous
        // collapse whose exit animation hasn't finished yet --
        // otherwise the freshly-inserted row would clash with the
        // existing id. The purge is O(1) -- it scans the small set of
        // currently-leaving elements only.
        this._purgeDyingRow(r.item.id);
        fragment.appendChild(this._buildRowEl(r, i));
        // The newly-mounted row may itself be an expanded async / empty
        // parent (when the consumer pre-expanded a deeper id) -- attach
        // its body sibling now so the layout stays consistent without
        // a second pass.
        const childIsAsync =
          this._asyncLoadingSet.has(r.item.id) || !!r.item.isAsyncLoading;
        const childIsEmpty =
          r.isExpanded &&
          Array.isArray(r.item.children) &&
          r.item.children.length === 0 &&
          !childIsAsync;
        if (childIsAsync) {
          fragment.appendChild(this._buildBodyEl(r.item, 'loader'));
        } else if (childIsEmpty) {
          fragment.appendChild(this._buildBodyEl(r.item, 'empty'));
        }
      }
      // Single DOM insertion -- one reflow. Every row's `@starting-style`
      // fires on the next compositor frame.
      if (fragment.firstChild) {
        group.insertBefore(fragment, pivot);
      }
      this._setupTreeNav(newVisible);
      return;
    }

    // ---- Collapsing -----------------------------------------------------
    // 1. Strip the parent's body modifiers + aria-busy. The body itself
    //    (if any) is animated out and removed below.
    parentRowEl.classList.remove('arvo-tree__item--empty');
    parentRowEl.classList.remove('arvo-tree__item--async-loading');
    parentRowEl.removeAttribute('aria-busy');

    // 2. Collect every element that's about to leave (parent's body +
    //    descendant rows + descendant bodies) into one batch list, then
    //    detach them from the lookup maps right now so subsequent
    //    surgical operations see a consistent state. The actual DOM
    //    removal + inner-instance teardown is deferred via
    //    `_animateExitBatch`, which fires all CSS transitions in
    //    parallel and shares ONE timer for the whole group.
    const leaving: Array<{ el: HTMLElement; cleanup: () => void }> = [];
    const existingBody = this._findRowBody(parentRowEl, id);
    if (existingBody) {
      const bodyOwnerId = id;
      leaving.push({
        el: existingBody,
        cleanup: () => {
          existingBody.remove();
          this._destroyBodyInstance(bodyOwnerId);
        },
      });
    }
    const oldVisible = this._lastVisibleRows;
    const parentIdx = oldVisible.findIndex(r => r.item.id === id);
    if (parentIdx !== -1) {
      const parentLevel = oldVisible[parentIdx].level;
      for (let i = parentIdx + 1; i < oldVisible.length; i++) {
        const r = oldVisible[i];
        if (r.level <= parentLevel) break;
        const rowEl = this._rowMap.get(r.item.id);
        const rowItemId = r.item.id;
        const childBody = rowEl ? this._findRowBody(rowEl, rowItemId) : null;
        if (rowEl) {
          this._rowMap.delete(rowItemId);
          this._dataMap.delete(rowItemId);
          leaving.push({
            el: rowEl,
            cleanup: () => {
              rowEl.remove();
              this._destroyRowInstances(rowItemId);
            },
          });
        } else {
          this._destroyRowInstances(rowItemId);
          this._rowMap.delete(rowItemId);
          this._dataMap.delete(rowItemId);
        }
        if (childBody) {
          leaving.push({
            el: childBody,
            cleanup: () => {
              childBody.remove();
            },
          });
        }
      }
    }
    // Single batched fade-out. For very large branches the batch
    // helper skips the animation entirely and snaps the change
    // through synchronously -- collapse-all stays instant.
    this._animateExitBatch(leaving);
    const newVisible = buildVisibleRows(this._items, this._expandedSet);
    this._lastVisibleRows = newVisible;
    this._setupTreeNav(newVisible);
  }

  /**
   * Resolve an async-load: clear the row's loading chrome and remove
   * the loader body sibling (if any). Called by `_setExpansion` from
   * the `Promise.finally` once the consumer's `onLoadChildren`
   * settles. The consumer is responsible for committing the resolved
   * children via `updateItem(id, { children: loaded })` -- once they
   * do, `_fullRebuild` (or the surgical update we may add later)
   * renders the children. This method only handles the loader
   * lifecycle so the row's other inner instances stay intact.
   */
  private _resolveAsyncLoad(item: ArvoTreeItem): void {
    const id = item.id;
    const parentRowEl = this._rowMap.get(id);
    if (!parentRowEl) return; // row already gone -- nothing to clean up
    parentRowEl.classList.remove('arvo-tree__item--async-loading');
    parentRowEl.removeAttribute('aria-busy');
    const loaderEl = this._findRowBody(parentRowEl, id);
    if (loaderEl && loaderEl.getAttribute('data-arvo-loader-for') === id) {
      this._animateExit(loaderEl, () => {
        loaderEl.remove();
        this._destroyBodyInstance(id);
      });
    }
    this._lastVisibleRows = buildVisibleRows(this._items, this._expandedSet);
    this._setupTreeNav(this._lastVisibleRows);
  }

  private _buildRowEl(row: VisibleRow, index: number): HTMLElement {
    const item = row.item;
    // Async-loading chrome only applies while the row's children are
    // still null (the auto-set in `_asyncLoadingSet` tracks the
    // in-flight callback, but the loader visual MUST disappear the
    // moment the consumer commits resolved children via `updateItem`
    // -- otherwise the brief window between the consumer's setItems
    // and our `.finally` would render the loader on top of the freshly
    // loaded child rows). Explicit `item.isAsyncLoading` still forces
    // the chrome regardless of children for consumer-driven async
    // patterns.
    const hasResolvedChildren =
      item.children !== null && item.children !== undefined;
    const isAsync = hasResolvedChildren
      ? !!item.isAsyncLoading
      : this._asyncLoadingSet.has(item.id) || !!item.isAsyncLoading;
    const isEmptyParent =
      row.isExpanded &&
      Array.isArray(item.children) &&
      item.children.length === 0 &&
      !isAsync;
    const isRowDisabled =
      !!item.isDisabled || !!this._options.isDisabled;
    const rowSelectable = isItemSelectable(item);
    const isRowSelected = rowSelectable && this._selectedSet.has(item.id);
    const isRowFocused = this._activeIndex === index;

    const rowEl = document.createElement('div');
    rowEl.id = `${this._id}-row-${item.id}`;
    rowEl.className = 'arvo-tree__item';
    rowEl.setAttribute('role', 'treeitem');
    // Register the row in the surgical-update maps. Doing this here
    // (instead of in `_fullRebuild` after the row is built) means
    // `_buildRowEl` can also be used by surgical-expansion to insert
    // brand-new descendant rows without touching the rest of the tree.
    this._rowMap.set(item.id, rowEl);
    this._dataMap.set(item.id, item);
    rowEl.tabIndex = isRowFocused ? 0 : -1;
    rowEl.setAttribute('aria-level', String(row.level + 1));
    rowEl.setAttribute('aria-setsize', String(row.setSize));
    rowEl.setAttribute('aria-posinset', String(row.posInSet));
    if (row.hasChildren) {
      rowEl.setAttribute('aria-expanded', String(row.isExpanded));
    }
    // Non-selectable rows carry no aria-selected / aria-checked. Only
    // the `singleSelect` variant emits aria-selected; `multiSelect` /
    // `navigationMultiSelect` emit aria-checked. `expandOnly` and
    // `navigation` emit neither.
    if (
      this._options.rowInteraction === 'select' &&
      rowSelectable &&
      !isRowDisabled
    ) {
      rowEl.setAttribute('aria-selected', String(isRowSelected));
    }
    if (this._options.selectionMode === 'multiple' && rowSelectable) {
      const checked = computeMultiAriaChecked(item, isRowSelected, this._selectedSet);
      rowEl.setAttribute(
        'aria-checked',
        checked === 'mixed' ? 'mixed' : String(checked),
      );
    }
    if (isRowDisabled) rowEl.setAttribute('aria-disabled', 'true');
    if (isAsync || item.isLoading) rowEl.setAttribute('aria-busy', 'true');
    // aria-current is set further below so it can default to 'true' when
    // isActive is true and the consumer didn't supply an explicit value.
    if (item.ariaLabel) rowEl.setAttribute('aria-label', item.ariaLabel);

    const isActive = !!item.isActive;
    // Search-highlight is per-row (spec section 25): prefer an explicit
    // `item.isSearchMatch` override, otherwise derive from whether the
    // label contains the active query. Non-matching rows must NOT carry
    // the row-level modifier even when the tree's `searchQuery` is set.
    const hasSearchMatch =
      item.isSearchMatch !== undefined
        ? item.isSearchMatch
        : labelMatchesQuery(item.label, this._options.searchQuery);
    if (isRowSelected) rowEl.classList.add('selected');
    if (isActive) rowEl.classList.add('arvo-tree__item--active');
    if (isRowDisabled) rowEl.classList.add('is-disabled');
    if (item.isLoading) rowEl.classList.add('loading');
    if (item.isEmphasized) rowEl.classList.add('arvo-tree__item--emphasized');
    // Per-row strong appearance overrides the tree-level default for
    // this single row (spec section 11). It can promote a default row
    // inside a default tree to strong, OR demote a row inside a strong
    // tree (the SCSS scopes the typography ramp to the per-row modifier
    // when it is present).
    if (item.appearance === 'strong') rowEl.classList.add('arvo-tree__item--strong');
    if (item.isHighlighted) rowEl.classList.add('arvo-tree__item--highlighted');
    if (hasSearchMatch) rowEl.classList.add('arvo-tree__item--search-highlight');
    if (row.isExpanded) rowEl.classList.add('arvo-tree__item--expanded');
    if (isAsync) rowEl.classList.add('arvo-tree__item--async-loading');
    if (isEmptyParent) rowEl.classList.add('arvo-tree__item--empty');
    if (this._reorderingId === item.id) rowEl.classList.add('is-grab-active');

    // aria-current default when the row is active and the consumer has
    // not supplied an explicit value:
    //   - rowInteraction='navigate' -> 'page' (user is on this route)
    //   - otherwise                -> 'true' (active item, unspecified)
    // Explicit `item.ariaCurrent` always wins.
    if (item.ariaCurrent != null) {
      rowEl.setAttribute('aria-current', String(item.ariaCurrent));
    } else if (isActive) {
      rowEl.setAttribute(
        'aria-current',
        this._options.rowInteraction === 'navigate' ? 'page' : 'true',
      );
    }

    // Connector slots (capped at maxVisualLevel - 1). The last visible slot
    // becomes an end-elbow when the row is the last sibling, otherwise an
    // elbow -- stays consistent even when the row's true depth is clamped.
    const visualLevel = Math.min(row.level, this._options.maxVisualLevel - 1);
    for (let i = 0; i < visualLevel; i++) {
      const c = document.createElement('span');
      c.className = 'arvo-tree__connector';
      const isLastVisibleSlot = i === visualLevel - 1;
      if (isLastVisibleSlot) {
        c.classList.add(
          row.isLastChild
            ? 'arvo-tree__connector--end'
            : 'arvo-tree__connector--elbow',
        );
      } else if (row.ancestorIsLastFlags[i]) {
        c.classList.add('arvo-tree__connector--empty');
      }
      c.setAttribute('aria-hidden', 'true');
      rowEl.appendChild(c);
    }

    // Drag handle (Session 2 reorder mode). Per-row override via
    // `item.hasDragHandle` (spec section 24): default true when the
    // tree-level `isReorderable` is on; setting it false keeps the row
    // in place (it can still be the TARGET of a move). `isReadOnly`
    // suppresses the handle entirely (spec A14: mutating affordance).
    if (
      this._options.isReorderable &&
      item.hasDragHandle !== false &&
      !this._options.isReadOnly
    ) {
      const dh = document.createElement('span');
      dh.className = 'arvo-tree__drag';
      dh.setAttribute('data-tree-stop', '');
      const btnEl = document.createElement('button');
      btnEl.type = 'button';
      dh.appendChild(btnEl);
      const dragBtn = ArvoIconButton.initialize(btnEl, {
        icon: 'drag-handle',
        size: 'xs',
        variant: 'tertiary',
        tooltip:
          this._reorderingId === item.id
            ? `Drop ${item.label}`
            : `Reorder ${item.label}`,
        isDisabled: isRowDisabled,
      });
      btnEl.setAttribute('tabindex', '-1');
      btnEl.setAttribute(
        'aria-pressed',
        String(this._reorderingId === item.id),
      );
      btnEl.addEventListener('click', e => {
        e.stopPropagation();
        this._handleDragHandleClick(item, e as MouseEvent);
      });
      rowEl.appendChild(dh);
      this._pushRowInstance(item.id, dragBtn);
    }

    // Chevron OR placeholder
    if (row.hasChildren) {
      const chev = document.createElement('span');
      chev.className = 'arvo-tree__chevron';
      chev.setAttribute('data-tree-stop', '');
      const btnEl = document.createElement('button');
      btnEl.type = 'button';
      chev.appendChild(btnEl);
      const btn = ArvoIconButton.initialize(btnEl, {
        icon: 'angle-right',
        size: 'xs',
        variant: 'tertiary',
        tooltip: row.isExpanded
          ? `Collapse ${item.label}`
          : `Expand ${item.label}`,
        isDisabled: isRowDisabled,
      });
      btnEl.setAttribute('tabindex', '-1');
      btnEl.addEventListener('click', e => {
        e.stopPropagation();
        this._setExpansion(item, !this._expandedSet.has(item.id));
      });
      rowEl.appendChild(chev);
      this._pushRowInstance(item.id, btn);
    } else {
      const c = document.createElement('span');
      c.className = 'arvo-tree__connector arvo-tree__connector--elbow';
      c.setAttribute('aria-hidden', 'true');
      rowEl.appendChild(c);
    }

    // Multi-select checkbox -- decorative; the row itself carries
    // aria-checked, so the inner input is hidden from the a11y tree to
    // avoid duplicate semantics. Mirror the React component exactly.
    // Rows whose `isSelectable === false` render no checkbox (group /
    // category parents).
    if (this._options.selectionMode === 'multiple' && rowSelectable) {
      const ck = document.createElement('span');
      ck.className = 'arvo-tree__check';
      ck.setAttribute('data-tree-stop', '');
      ck.setAttribute('aria-hidden', 'true');
      const ckHost = document.createElement('div');
      ck.appendChild(ckHost);
      rowEl.appendChild(ck);
      const checkedState = computeMultiAriaChecked(
        item,
        isRowSelected,
        this._selectedSet,
      );
      const cb = ArvoCheckbox.initialize(ckHost, {
        isChecked: isRowSelected,
        isIndeterminate: checkedState === 'mixed',
        isDisabled: isRowDisabled,
        label: null,
        onChange: () => this._toggleSelection(item),
      });
      this._pushRowInstance(item.id, cb);
    }

    // Inner content cluster: icon + label + meta + actions. Holds
    // flex: 1 0 0 so the label truncates inside the cluster, while the
    // trailing badge stays at the row level (right-most slot).
    const content = document.createElement('span');
    content.className = 'arvo-tree__content';
    rowEl.appendChild(content);

    // Leading icon
    if (item.icon) {
      const ico = document.createElement('span');
      ico.className = `arvo-tree__icon o9con o9con-${item.icon}`;
      ico.setAttribute('aria-hidden', 'true');
      content.appendChild(ico);
    }

    // Label (with optional search highlight)
    const lbl = document.createElement('span');
    lbl.className = 'arvo-tree__label';
    const parts = buildMatchParts(item.label, this._options.searchQuery);
    parts.forEach(p => {
      if (p.isMatch) {
        const span = document.createElement('span');
        span.className = 'arvo-tree__label-match';
        span.textContent = p.text;
        lbl.appendChild(span);
      } else {
        lbl.appendChild(document.createTextNode(p.text));
      }
    });
    content.appendChild(lbl);

    // Meta: optional 12x12 icon and/or 10px text. Sits between the label
    // and the inline actions per spec section 2.
    const meta = normalizeMeta(item.meta);
    if (meta) {
      const metaWrap = document.createElement('span');
      metaWrap.className = 'arvo-tree__meta';
      metaWrap.setAttribute('aria-hidden', 'true');
      if (meta.icon) {
        const mi = document.createElement('span');
        mi.className = `arvo-tree__meta-icon o9con o9con-${meta.icon}`;
        metaWrap.appendChild(mi);
      }
      if (meta.text) {
        const mt = document.createElement('span');
        mt.className = 'arvo-tree__meta-text';
        mt.textContent = meta.text;
        metaWrap.appendChild(mt);
      }
      content.appendChild(metaWrap);
    }

    // Inline actions (revealed on hover/focus by default) + optional
    // overflow menu trigger that opens the same context menu (A9 spec
    // section 23: keyboard-accessible UI parity for context actions).
    // isReadOnly (A14) suppresses BOTH the action list and the
    // overflow trigger.
    const rowActions = this._options.isReadOnly
      ? null
      : (item.actions ?? this._options.actions ?? null);
    const showsOverflow =
      !!this._options.contextMenu &&
      item.hasOverflowMenu === true &&
      !isRowDisabled &&
      !this._options.isReadOnly;
    if (((rowActions && rowActions.length > 0) || showsOverflow) && !isRowDisabled) {
      const actionsWrap = document.createElement('span');
      actionsWrap.className = 'arvo-tree__actions';
      actionsWrap.setAttribute('data-tree-stop', '');
      rowActions?.forEach(action => {
        const aBtn = document.createElement('button');
        aBtn.type = 'button';
        const ab = ArvoIconButton.initialize(aBtn, {
          icon: action.icon,
          size: 'xs',
          variant: 'tertiary',
          tooltip: action.ariaLabel,
          isDisabled: action.isDisabled ?? false,
        });
        aBtn.setAttribute('tabindex', '-1');
        aBtn.addEventListener('click', e => {
          e.stopPropagation();
          action.onClick?.(item, e);
        });
        actionsWrap.appendChild(aBtn);
        this._pushRowInstance(item.id, ab);
      });
      if (showsOverflow) {
        const ovBtn = document.createElement('button');
        ovBtn.type = 'button';
        const ovInst = ArvoIconButton.initialize(ovBtn, {
          icon: 'more-vertical',
          size: 'xs',
          variant: 'tertiary',
          tooltip: 'More actions',
        });
        ovBtn.setAttribute('tabindex', '-1');
        ovBtn.addEventListener('click', e => {
          e.stopPropagation();
          this._openContextMenu(item, rowEl, 'overflow');
        });
        actionsWrap.appendChild(ovBtn);
        this._pushRowInstance(item.id, ovInst);
      }
      content.appendChild(actionsWrap);
    }

    // Trailing badge (right-most slot, outside __content)
    if (item.badge != null) {
      const bw = document.createElement('span');
      bw.className = 'arvo-tree__badge';
      bw.setAttribute('data-tree-stop', '');
      const bh = document.createElement('span');
      bw.appendChild(bh);
      rowEl.appendChild(bw);
      const bopts: ArvoBadgeOptions =
        typeof item.badge === 'string' || typeof item.badge === 'number'
          ? { variant: 'counter', counterMode: 'single', count: Number(item.badge) }
          : item.badge;
      const b = ArvoBadge.initialize(bh, bopts);
      this._pushRowInstance(item.id, b);
    }

    // In-place row skeleton overlay (mirror React)
    if (item.isLoading) {
      const sk = document.createElement('div');
      sk.className = 'arvo-tree__skeleton-row';
      sk.setAttribute('aria-hidden', 'true');
      const sIco = document.createElement('span');
      sIco.className = 'arvo-tree__skeleton-icon';
      const sTxt = document.createElement('span');
      sTxt.className = 'arvo-tree__skeleton-text';
      sk.append(sIco, sTxt);
      rowEl.appendChild(sk);
    }

    // A9 -- right-click opens the configured context menu without
    // mutating selection (spec section 23: "Right-click must not
    // silently alter checkbox selection."). Suppressed in read-only
    // mode (spec A14: mutating affordance).
    if (this._options.contextMenu && !isRowDisabled && !this._options.isReadOnly) {
      rowEl.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openContextMenu(item, rowEl, 'mouse');
      });
    }

    // Row body click resolution (spec "One target, one responsibility").
    // The five UX variants compose down to `{ selectionMode,
    // rowInteraction }` and this listener is the single source of
    // truth for what happens when the row label / row whitespace is
    // clicked.
    //   - 'select'   -> toggle selection (singleSelect)
    //   - 'expand'   -> expand parent / no-op leaf (expandOnly, multiSelect)
    //   - 'navigate' -> fire onNavigate(item, event); selection
    //                   untouched (navigation, navigationMultiSelect)
    // Non-selectable rows downgrade 'select' to 'expand' so the
    // group / category parent only opens its children. Navigation
    // variants keep firing `onNavigate` for them.
    rowEl.addEventListener('click', e => {
      if (this._options.isDisabled || isRowDisabled || this._options.isLoading) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-tree-stop]')) return;
      this._activeIndex = index;
      const mode = this._options.rowInteraction;
      if (mode === 'navigate') {
        this._options.onNavigate?.(item, e);
        return;
      }
      const effectiveMode: TreeRowInteraction =
        mode === 'select' && !rowSelectable ? 'expand' : mode;
      if (effectiveMode === 'expand') {
        if (hasChildrenShape(item)) {
          this._setExpansion(item, !this._expandedSet.has(item.id));
        }
        return;
      }
      this._toggleSelection(item);
    });

    return rowEl;
  }

  /**
   * Build the empty / loader body element that sits as a SIBLING of an
   * async-loading or empty parent row inside `__group`. Identified by a
   * `data-arvo-empty-for` / `data-arvo-loader-for` attribute pointing at
   * the row's item id so surgical helpers can locate + remove the body
   * in O(1) without touching the parent row's DOM. The body's inner
   * ArvoLoader / ArvoEmptyState instance is registered under the parent
   * row's id so it is destroyed alongside the row when the row leaves
   * the visible set.
   */
  private _buildBodyEl(
    item: ArvoTreeItem,
    kind: 'loader' | 'empty',
  ): HTMLElement {
    // Destroy any prior body instance for this row before allocating
    // a new one -- otherwise a fast async->empty swap could leak the
    // earlier ArvoLoader. (Belt-and-suspenders; callers should remove
    // the prior body first, but the guard is cheap.)
    this._destroyBodyInstance(item.id);
    if (kind === 'loader') {
      const ld = document.createElement('div');
      ld.className = 'arvo-tree__loader';
      ld.setAttribute('data-arvo-loader-for', item.id);
      ld.setAttribute('aria-hidden', 'true');
      const loader = ArvoLoader.initialize(ld, {
        variant: 'dot',
        size: 'sm',
        orientation: 'horizontal',
      });
      this._bodyInstanceByRow.set(item.id, loader);
      return ld;
    }
    const em = document.createElement('div');
    em.className = 'arvo-tree__empty';
    em.setAttribute('data-arvo-empty-for', item.id);
    em.setAttribute('aria-hidden', 'true');
    const empty = ArvoEmptyState.initialize(em, {
      illustration: this._options.emptyConfig?.illustration ?? 'no-data',
      message: this._options.emptyConfig?.message ?? 'No Items Available',
      size: 'xs',
      orientation: 'horizontal',
    });
    this._bodyInstanceByRow.set(item.id, empty);
    return em;
  }

  /** Destroy the body inner instance (if any) registered under `id`. */
  private _destroyBodyInstance(id: string): void {
    const inst = this._bodyInstanceByRow.get(id);
    if (!inst) return;
    try {
      inst.destroy();
    } catch {
      /* noop */
    }
    this._bodyInstanceByRow.delete(id);
  }

  /**
   * Find the empty / loader body element currently rendered as the next
   * sibling of `rowEl` (if any). Returns `null` when the row has no
   * attached body. Used by the surgical helpers to locate the body
   * without re-walking `__group`.
   */
  private _findRowBody(
    rowEl: HTMLElement,
    rowItemId: string,
  ): HTMLElement | null {
    const sibling = rowEl.nextElementSibling as HTMLElement | null;
    if (!sibling) return null;
    if (
      sibling.getAttribute('data-arvo-empty-for') === rowItemId ||
      sibling.getAttribute('data-arvo-loader-for') === rowItemId
    ) {
      return sibling;
    }
    return null;
  }

  /**
   * Instantly remove any leftover dying DOM element belonging to the
   * given row id. Used by the surgical expand path so a rapid
   * collapse -> expand sequence does not leave the dying copy in the
   * document (which would collide with the freshly-inserted row's id
   * and confuse `_focusActiveRow` / accessibility tools). Cancels any
   * pending exit animation by removing the node outright. The matching
   * body sibling (if any) is also cleared.
   *
   * Avoids `CSS.escape` (unavailable in some non-browser environments
   * such as the jsdom test runner) by scanning the small set of
   * currently-leaving elements with an attribute selector.
   */
  private _purgeDyingRow(rowItemId: string): void {
    const targetId = `${this._id}-row-${rowItemId}`;
    const dying = this._element.querySelectorAll<HTMLElement>(
      '[data-arvo-leaving="true"]',
    );
    for (const node of Array.from(dying)) {
      if (node.id !== targetId) continue;
      const dyingBody = node.nextElementSibling as HTMLElement | null;
      if (
        dyingBody?.getAttribute('data-arvo-leaving') === 'true' &&
        (dyingBody.getAttribute('data-arvo-empty-for') === rowItemId ||
          dyingBody.getAttribute('data-arvo-loader-for') === rowItemId)
      ) {
        dyingBody.remove();
      }
      node.remove();
      this._destroyRowInstances(rowItemId);
      break;
    }
  }

  /**
   * Instantly remove a leaving body sibling for the given row id (the
   * row itself is still alive). Used by the surgical expand path so
   * a rapid collapse -> re-expand of an empty / async parent doesn't
   * end up with a half-faded ghost body next to the row.
   */
  private _purgeDyingBody(rowItemId: string): void {
    const parentRowEl = this._rowMap.get(rowItemId);
    if (!parentRowEl) return;
    const body = this._findRowBody(parentRowEl, rowItemId);
    if (body && body.getAttribute('data-arvo-leaving') === 'true') {
      body.remove();
      this._destroyBodyInstance(rowItemId);
    }
  }

  // -- Selection / expansion ------------------------------------------------

  private _toggleSelection(item: ArvoTreeItem): void {
    if (this._options.isDisabled || item.isDisabled) return;
    // Non-selectable group / category rows are invisible to selection
    // in every variant. The row body click and keyboard Space/Enter
    // routing already prevent this for the most part; this guard
    // backstops programmatic / cascade callers.
    if (!isItemSelectable(item)) return;
    const isSelected = this._selectedSet.has(item.id);
    let next: string[];
    let nextSet: Set<string>;
    if (this._options.selectionMode === 'single') {
      next = isSelected ? [] : [item.id];
      nextSet = new Set(next);
    } else {
      // Multi-select cascade: include only eligible (non-disabled)
      // descendants so disabled descendants are never reachable via a
      // parent toggle (spec section 16).
      nextSet = new Set(this._selectedSet);
      const targets = [item.id, ...collectEligibleDescendantIds(item)];
      if (isSelected) {
        for (const t of targets) nextSet.delete(t);
      } else {
        for (const t of targets) nextSet.add(t);
      }
      next = Array.from(nextSet);
    }

    // Dispatch BEFORE mutating internal state so the cancel path leaves
    // the component in its previous state (no manual revert needed).
    const cancelled = !this._dispatchEvent('tree:select', {
      ids: next,
      item,
      isSelected: !isSelected,
    });
    if (cancelled) return;

    if (!this._isControlledSelection) {
      this._selectedSet = nextSet;
    }

    this._options.onSelectionChange?.(next, {
      item,
      isSelected: !isSelected,
    });
    // Surgical: update classes / ARIA / checkbox state in place. No
    // row DOM is recreated, no inner instance is torn down.
    this._renderSelectionChange();
  }

  private _setExpansion(item: ArvoTreeItem, willExpand: boolean): void {
    if (this._options.isDisabled || item.isDisabled || !hasChildrenShape(item))
      return;
    if (willExpand === this._expandedSet.has(item.id)) return;
    const newSet = new Set(this._expandedSet);
    if (willExpand) newSet.add(item.id);
    else newSet.delete(item.id);
    const next = Array.from(newSet);

    const cancelled = !this._dispatchEvent('tree:expand', {
      ids: next,
      item,
      isExpanded: willExpand,
    });
    if (cancelled) return;

    if (!this._isControlledExpansion) {
      this._expandedSet = newSet;
    }
    this._options.onExpandedChange?.(next, { item, isExpanded: willExpand });

    // Async-load children. The auto-loader cascade flips on the
    // `_asyncLoadingSet` (so `_renderExpansionChange` knows to mount
    // the loader body sibling), kicks off the consumer's
    // `onLoadChildren`, and then -- once the promise settles --
    // clears the set and runs `_resolveAsyncLoad` to surgically
    // tear down the loader chrome. The consumer is responsible for
    // committing the resolved children via `updateItem`.
    const isAsyncLoad =
      willExpand &&
      item.children === null &&
      this._options.onLoadChildren &&
      !this._asyncLoadingSet.has(item.id);
    if (isAsyncLoad) {
      const proceed = this._dispatchEvent('tree:loadchildren', { item });
      if (!proceed) {
        // Treat as cancelled: collapse again.
        if (!this._isControlledExpansion) {
          this._expandedSet.delete(item.id);
        }
        return;
      }
      this._asyncLoadingSet.add(item.id);
      Promise.resolve(this._options.onLoadChildren!(item))
        .catch(() => {
          /* consumer surfaces errors */
        })
        .finally(() => {
          this._asyncLoadingSet.delete(item.id);
          this._resolveAsyncLoad(item);
        });
      // Surgical: mount the loader body sibling under the parent row.
      this._renderExpansionChange(item, true);
      return;
    }

    // Synchronous expansion / collapse: apply surgically so the
    // unchanged rows keep their DOM identity + mounted inner
    // instances.
    this._renderExpansionChange(item, willExpand);
  }

  // -- Keyboard navigation --------------------------------------------------

  private _setupTreeNav(visible: VisibleRow[]): void {
    if (this._treeNav) {
      this._treeNav.destroy();
      this._treeNav = null;
    }
    if (this._options.isDisabled || this._options.isLoading) return;
    const items: HTMLElement[] = visible.map(r => {
      const id = `${this._id}-row-${r.item.id}`;
      return (
        document.getElementById(id) ?? document.createElement('span')
      );
    });
    if (this._activeIndex >= items.length) {
      this._activeIndex = Math.max(0, items.length - 1);
    }
    this._treeNav = createTreeNav({
      items,
      getRowMeta: i => {
        const r = visible[i];
        return {
          hasChildren: r?.hasChildren ?? false,
          isExpanded: r?.isExpanded ?? false,
          isDisabled: r?.item.isDisabled === true || this._options.isDisabled,
          level: r?.level ?? 0,
        };
      },
      onNavigate: (_el, index) => {
        this._activeIndex = index;
        this._focusActiveRow();
      },
      onSelect: (_el, index) => {
        // Tree-nav fires onSelect for Enter AND Space. Enter is already
        // pre-empted by `_onKeyDown` for `'expand'` and `'navigate'`
        // modes; Space is handled here. Only `'select'` mode (and
        // multi-select, which always has a checkbox) route Space to a
        // selection toggle -- otherwise Space is a no-op (spec section
        // 28: expandOnly Space = "No selection action"; navigation
        // Space = "No selection action"). Non-selectable rows ignore
        // Space / Enter selection routing entirely.
        const r = visible[index];
        if (!r) return;
        if (!isItemSelectable(r.item)) return;
        if (
          this._options.selectionMode === 'multiple' ||
          this._options.rowInteraction === 'select'
        ) {
          this._toggleSelection(r.item);
        }
      },
      onExpand: index => {
        const r = visible[index];
        if (r) this._setExpansion(r.item, true);
      },
      onCollapse: index => {
        const r = visible[index];
        if (r) this._setExpansion(r.item, false);
      },
      typeAhead: { getLabel: i => visible[i]?.item.label ?? '' },
    });
  }

  private _focusActiveRow(): void {
    const visible = buildVisibleRows(this._items, this._expandedSet);
    const r = visible[this._activeIndex];
    if (!r) return;
    const id = `${this._id}-row-${r.item.id}`;
    const rowEl = document.getElementById(id);
    if (rowEl) {
      // Update tabindex roving.
      this._element
        .querySelectorAll<HTMLElement>('[role="treeitem"]')
        .forEach(el => {
          el.tabIndex = el === rowEl ? 0 : -1;
        });
      rowEl.focus();
      if (typeof rowEl.scrollIntoView === 'function') {
        rowEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // -- Reorder mode ---------------------------------------------------------

  private _announce(msg: string): void {
    if (this._liveRegionEl) this._liveRegionEl.textContent = msg;
  }

  /**
   * A9 -- open the configured context menu at the given row. Resolves
   * per-row items if `contextMenu` is a function. Reuses a single
   * ArvoActionMenu instance for the lifetime of the tree; destroys
   * and re-creates only when items differ from the previous open.
   */
  private _openContextMenu(
    item: ArvoTreeItem,
    rowEl: HTMLElement,
    trigger: 'mouse' | 'keyboard' | 'overflow',
  ): void {
    const cfg = this._options.contextMenu;
    if (!cfg || item.isDisabled || this._options.isDisabled) return;
    // isReadOnly suppresses the context menu (spec A14).
    if (this._options.isReadOnly) return;
    const items = typeof cfg === 'function' ? cfg(item) : cfg;
    if (!items || (Array.isArray(items) && items.length === 0)) return;

    this._options.onContextMenu?.(item, trigger);

    // Destroy any prior instance -- items may differ per row, and
    // ArvoActionMenu does not accept dynamic items after init.
    this._contextMenu?.destroy();
    this._contextTriggerEl = rowEl;
    this._contextItemId = item.id;

    this._contextMenu = ArvoActionMenu.initialize(rowEl, {
      items,
      placement: 'bottom-start',
      onOpenChange: (isOpen: boolean) => {
        if (isOpen) return;
        // Restore focus to the originating row (spec section 23).
        const focusTarget = this._contextTriggerEl;
        this._contextItemId = null;
        if (focusTarget) focusTarget.focus();
      },
    });
    // Defer the open so positioning sees the updated trigger element.
    requestAnimationFrame(() => {
      this._contextMenu?.open();
    });
  }

  private _findItemLocation(id: string): {
    parent: ArvoTreeItem | null;
    parentChildren: ArvoTreeItem[];
    index: number;
  } | null {
    const walk = (
      siblings: ArvoTreeItem[],
      parent: ArvoTreeItem | null,
    ): { parent: ArvoTreeItem | null; parentChildren: ArvoTreeItem[]; index: number } | null => {
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].id === id) {
          return { parent, parentChildren: siblings, index: i };
        }
        if (Array.isArray(siblings[i].children)) {
          const found = walk(siblings[i].children as ArvoTreeItem[], siblings[i]);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(this._items, null);
  }

  private _enterReorderMode(item: ArvoTreeItem): void {
    if (!this._options.isReorderable || item.isDisabled || this._options.isDisabled)
      return;
    this._reorderingId = item.id;
    this._announce(
      `Picked up ${item.label}. Use Up and Down to move, Enter to drop, Escape to cancel.`,
    );
    // Surgical: toggle the `is-grab-active` class + the drag-handle
    // aria-pressed attribute only on the picked-up row. No other rows
    // are touched.
    const rowEl = this._rowMap.get(item.id);
    if (rowEl) {
      rowEl.classList.add('is-grab-active');
      const dragBtn = rowEl.querySelector<HTMLElement>(
        '.arvo-tree__drag button',
      );
      dragBtn?.setAttribute('aria-pressed', 'true');
    }
  }

  private _cancelReorderMode(): void {
    if (this._reorderingId == null) return;
    const id = this._reorderingId;
    this._reorderingId = null;
    this._announce('Move cancelled.');
    const rowEl = this._rowMap.get(id);
    if (rowEl) {
      rowEl.classList.remove('is-grab-active');
      const dragBtn = rowEl.querySelector<HTMLElement>(
        '.arvo-tree__drag button',
      );
      dragBtn?.setAttribute('aria-pressed', 'false');
    }
  }

  private _commitReorder(
    item: ArvoTreeItem,
    fromParentId: string | null,
    fromIndex: number,
    toParentId: string | null,
    toIndex: number,
    toLen: number,
    position: TreeDropPosition = 'before',
  ): boolean {
    const ctx: TreeReorderContext = {
      item,
      fromParentId,
      fromIndex,
      toParentId,
      toIndex,
      position,
    };
    // Pre-commit validator (spec section 24). Runs BEFORE the
    // cancellable event so a "Move not allowed" rejection is
    // announced once and the row stays in place.
    if (this._options.canMoveItem && this._options.canMoveItem(ctx) === false) {
      this._announce('Move not allowed.');
      return false;
    }
    const cancelled = !this._dispatchEvent('tree:reorder', ctx as unknown as Record<string, unknown>);
    if (cancelled) return false;
    const result = this._options.onReorder?.(ctx);
    if (result === false) return false;
    this._announce(
      `Moved ${item.label} to position ${toIndex + 1} of ${toLen}.`,
    );
    return true;
  }

  private _handleDragHandleClick(item: ArvoTreeItem, ev?: MouseEvent): void {
    if (this._reorderingId === item.id) {
      this._announce(`${item.label} dropped.`);
      this._reorderingId = null;
      // Reorder mode toggled off without moving the row. Strip the
      // `is-grab-active` chrome from the picked-up row only.
      const rowEl = this._rowMap.get(item.id);
      if (rowEl) {
        rowEl.classList.remove('is-grab-active');
        const dragBtn = rowEl.querySelector<HTMLElement>(
          '.arvo-tree__drag button',
        );
        dragBtn?.setAttribute('aria-pressed', 'false');
      }
    } else if (this._reorderingId != null) {
      const dragged = findItemById(this._items, this._reorderingId);
      const draggedLoc = this._findItemLocation(this._reorderingId);
      const targetLoc = this._findItemLocation(item.id);
      if (dragged && draggedLoc && targetLoc) {
        // Compute drop position from the pointer's vertical position
        // within the target row's bounding box (spec section 24):
        //   - top third  -> 'before' (insert as preceding sibling)
        //   - middle     -> 'inside' (only when target is a parent)
        //   - bottom third -> 'after' (insert as following sibling)
        let position: TreeDropPosition = 'after';
        let toParentId: string | null = targetLoc.parent?.id ?? null;
        let toIndex = targetLoc.index + 1;
        let toLen = targetLoc.parentChildren.length;
        const targetRow = (ev?.currentTarget as HTMLElement | undefined)
          ?.closest('[role="treeitem"]') as HTMLElement | null;
        const rect = targetRow?.getBoundingClientRect();
        if (rect && ev) {
          const localY = ev.clientY - rect.top;
          const third = rect.height / 3;
          const targetItem = targetLoc.parentChildren[targetLoc.index];
          const targetIsParent =
            Array.isArray(targetItem.children) && targetItem.children;
          if (localY < third) {
            position = 'before';
            toIndex = targetLoc.index;
          } else if (localY > rect.height - third) {
            position = 'after';
            toIndex = targetLoc.index + 1;
          } else if (targetIsParent) {
            position = 'inside';
            toParentId = targetItem.id;
            toIndex = (targetItem.children as ArvoTreeItem[]).length;
            toLen = toIndex;
          } else {
            position = 'after';
            toIndex = targetLoc.index + 1;
          }
        }
        this._commitReorder(
          dragged,
          draggedLoc.parent?.id ?? null,
          draggedLoc.index,
          toParentId,
          toIndex,
          toLen,
          position,
        );
      }
      this._reorderingId = null;
      // Reorder commits restructure the tree -- a full rebuild is the
      // safe path so the visible row order, indices, and connector
      // shapes all settle in one pass.
      this._fullRebuild();
    } else {
      this._enterReorderMode(item);
    }
  }

  /**
   * Programmatically move a row. Dispatches `tree:reorder`. Optional
   * `position` defaults to `'before'`.
   */
  move(
    id: string,
    target: {
      parentId: string | null;
      index: number;
      position?: TreeDropPosition;
    },
  ): void {
    const from = this._findItemLocation(id);
    if (!from) return;
    const item = from.parentChildren[from.index];
    let toLen: number;
    if (target.parentId == null) {
      toLen = this._items.length;
    } else {
      const tp = findItemById(this._items, target.parentId);
      if (!tp || !Array.isArray(tp.children)) return;
      toLen = tp.children.length;
    }
    this._commitReorder(
      item,
      from.parent?.id ?? null,
      from.index,
      target.parentId,
      target.index,
      toLen,
      target.position ?? 'before',
    );
  }

  // -- Events / lifecycle ---------------------------------------------------

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this._options.isDisabled || this._options.isLoading) return;

    // A10 -- inline-action keyboard navigation (spec section 22).
    const focusedEl = document.activeElement as HTMLElement | null;
    const focusedRowEl = focusedEl?.closest<HTMLElement>(
      '[role="treeitem"]',
    ) ?? null;
    const isFocusOnRow = focusedEl != null && focusedEl === focusedRowEl;
    const isFocusInActions =
      focusedEl?.closest('.arvo-tree__actions') != null;

    if (isFocusOnRow && e.key === 'Tab' && !e.shiftKey) {
      const actionsEl = focusedRowEl?.querySelector<HTMLElement>(
        '.arvo-tree__actions',
      );
      const firstAction = actionsEl?.querySelector<HTMLButtonElement>(
        'button:not([disabled])',
      );
      if (firstAction) {
        e.preventDefault();
        firstAction.focus();
        return;
      }
    }
    if (isFocusInActions) {
      if (e.key === 'Escape' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        focusedRowEl?.focus();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const actionsEl = focusedRowEl?.querySelector<HTMLElement>(
          '.arvo-tree__actions',
        );
        const actionButtons = actionsEl
          ? Array.from(
              actionsEl.querySelectorAll<HTMLButtonElement>(
                'button:not([disabled])',
              ),
            )
          : [];
        const currentIdx = actionButtons.findIndex(btn => btn === focusedEl);
        if (currentIdx !== -1) {
          e.preventDefault();
          const direction = e.key === 'ArrowRight' ? 1 : -1;
          const nextIdx =
            (currentIdx + direction + actionButtons.length) %
            actionButtons.length;
          actionButtons[nextIdx]?.focus();
          return;
        }
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        const actionsEl = focusedRowEl?.querySelector<HTMLElement>(
          '.arvo-tree__actions',
        );
        const actionButtons = actionsEl
          ? Array.from(
              actionsEl.querySelectorAll<HTMLButtonElement>(
                'button:not([disabled])',
              ),
            )
          : [];
        const currentIdx = actionButtons.findIndex(btn => btn === focusedEl);
        if (currentIdx !== -1 && currentIdx === actionButtons.length - 1) {
          // Last action -- let the browser advance focus out.
          return;
        }
        if (currentIdx !== -1 && currentIdx < actionButtons.length - 1) {
          e.preventDefault();
          actionButtons[currentIdx + 1]?.focus();
          return;
        }
      }
      return;
    }

    // A9 -- context menu keyboard triggers (spec section 23). Use
    // document.activeElement (not _activeIndex) so the shortcut
    // targets the row the user is ACTUALLY on, even if they reached
    // it via direct .focus() rather than arrow keys.
    const isContextMenuKey =
      e.key === 'ContextMenu' ||
      (e.key === 'F10' && e.shiftKey && !e.ctrlKey && !e.altKey) ||
      (e.key.toLowerCase() === 'x' && e.shiftKey && e.ctrlKey && !e.altKey);
    if (isContextMenuKey && this._options.contextMenu && focusedRowEl) {
      const itemId = focusedRowEl.id.match(/-row-(.+)$/)?.[1];
      const focusItem = itemId ? findItemById(this._items, itemId) : null;
      if (focusItem && !focusItem.isDisabled) {
        e.preventDefault();
        this._openContextMenu(focusItem, focusedRowEl, 'keyboard');
        return;
      }
    }

    // A11 -- `*` expands every visible parent at the focused row's
    // hierarchy level (spec section 27). The bulk expand does NOT
    // recurse into grandchildren and leaves focus on the originally
    // focused row.
    if (e.key === '*') {
      const visible = buildVisibleRows(this._items, this._expandedSet);
      const focusRow = visible[this._activeIndex];
      if (focusRow) {
        const targetLevel = focusRow.level;
        e.preventDefault();
        let mutated = false;
        for (const r of visible) {
          if (
            r.level === targetLevel &&
            r.hasChildren &&
            !r.isExpanded &&
            !r.item.isDisabled
          ) {
            if (!this._expandedSet.has(r.item.id)) {
              if (!this._isControlledExpansion) {
                this._expandedSet.add(r.item.id);
              }
              mutated = true;
            }
          }
        }
        if (mutated) {
          // Bulk expand at the focused row's hierarchy level. Apply
          // each newly-expanded parent surgically so unchanged rows
          // keep their DOM identity + mounted inner instances.
          for (const r of visible) {
            if (
              r.level === targetLevel &&
              r.hasChildren &&
              !r.isExpanded &&
              !r.item.isDisabled &&
              this._expandedSet.has(r.item.id)
            ) {
              this._renderExpansionChange(r.item, true);
            }
          }
        }
        return;
      }
    }

    // Enter routing per the variant interaction matrix (spec section
    // 28). Space stays delegated to tree-nav so it continues to invoke
    // onSelect -> _toggleSelection (which is the checkbox toggle in
    // multi-select mode, and the row select in `singleSelect`).
    // Non-selectable rows downgrade 'select' to 'expand' so Enter only
    // expands.
    if (e.key === 'Enter') {
      const visible = buildVisibleRows(this._items, this._expandedSet);
      const row = visible[this._activeIndex];
      if (row && !row.item.isDisabled) {
        const mode = this._options.rowInteraction;
        if (mode === 'navigate') {
          e.preventDefault();
          this._options.onNavigate?.(row.item, e);
          return;
        }
        const effectiveMode: TreeRowInteraction =
          mode === 'select' && !isItemSelectable(row.item) ? 'expand' : mode;
        if (effectiveMode === 'expand') {
          e.preventDefault();
          if (row.hasChildren) {
            this._setExpansion(row.item, !this._expandedSet.has(row.item.id));
          }
          return;
        }
        // effectiveMode === 'select' -- fall through to tree-nav onSelect.
      }
    }

    // Reorder mode interception.
    if (this._reorderingId != null) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const loc = this._findItemLocation(this._reorderingId);
        if (loc) {
          const target = loc.index + direction;
          if (target >= 0 && target < loc.parentChildren.length) {
            const item = loc.parentChildren[loc.index];
            // Keyboard reorder moves among siblings only -- emit
            // 'after' when moving down past the next sibling, 'before'
            // when moving up. Both keep the parent unchanged.
            this._commitReorder(
              item,
              loc.parent?.id ?? null,
              loc.index,
              loc.parent?.id ?? null,
              target,
              loc.parentChildren.length,
              direction === 1 ? 'after' : 'before',
            );
          }
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const reorderId = this._reorderingId;
        const item = findItemById(this._items, reorderId);
        if (item) this._announce(`${item.label} dropped.`);
        this._reorderingId = null;
        // Strip the `is-grab-active` chrome from the dropped row only.
        const rowEl = this._rowMap.get(reorderId);
        if (rowEl) {
          rowEl.classList.remove('is-grab-active');
          const dragBtn = rowEl.querySelector<HTMLElement>(
            '.arvo-tree__drag button',
          );
          dragBtn?.setAttribute('aria-pressed', 'false');
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this._cancelReorderMode();
        return;
      }
      return;
    }

    this._treeNav?.handleKeyDown(e);
  };

  private _bindEvents(): void {
    this._element.addEventListener('keydown', this._onKeyDown);
  }

  private _unbindEvents(): void {
    this._element.removeEventListener('keydown', this._onKeyDown);
    if (this._treeNav) {
      this._treeNav.destroy();
      this._treeNav = null;
    }
    this._destroyInnerInstances();
  }

  /**
   * Tear down every mounted inner instance (per-row + body + tree-level).
   * Called from `_fullRebuild` and `destroy()`. Surgical updates use
   * the more targeted `_destroyRowInstances(id)` / `_destroyBodyInstance(id)`
   * so they only touch the rows / bodies that are actually leaving
   * the visible set.
   */
  private _destroyInnerInstances(): void {
    for (const insts of this._innerInstancesByRow.values()) {
      for (const inst of insts) {
        try {
          inst.destroy();
        } catch {
          /* noop */
        }
      }
    }
    this._innerInstancesByRow.clear();
    for (const inst of this._bodyInstanceByRow.values()) {
      try {
        inst.destroy();
      } catch {
        /* noop */
      }
    }
    this._bodyInstanceByRow.clear();
    for (const inst of this._innerInstancesTreeLevel) {
      try {
        inst.destroy();
      } catch {
        /* noop */
      }
    }
    this._innerInstancesTreeLevel = [];
  }

  /**
   * Destroy the inner instances mounted inside a single row (chevron,
   * drag handle, checkbox, badge, inline actions). Does NOT touch the
   * body instance for the same row -- use `_destroyBodyInstance(id)`
   * for that. This split lets `_resolveAsyncLoad` tear down the
   * loader body without disturbing the parent row's still-needed
   * inner instances.
   */
  private _destroyRowInstances(id: string): void {
    const insts = this._innerInstancesByRow.get(id);
    if (insts) {
      for (const inst of insts) {
        try {
          inst.destroy();
        } catch {
          /* noop */
        }
      }
      this._innerInstancesByRow.delete(id);
    }
    // When a row leaves the visible set, its body (if any) also
    // leaves -- tear that down too.
    this._destroyBodyInstance(id);
  }

  /** Register an inner instance under the row id that owns it. */
  private _pushRowInstance(id: string, inst: { destroy: () => void }): void {
    let arr = this._innerInstancesByRow.get(id);
    if (!arr) {
      arr = [];
      this._innerInstancesByRow.set(id, arr);
    }
    arr.push(inst);
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): boolean {
    const ev = new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail,
    });
    return this._element.dispatchEvent(ev);
  }
}

export default ArvoTreeView;
