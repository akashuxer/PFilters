/**
 * ArvoHybridPopover -- vanilla JS implementation.
 *
 * Composes ArvoPopover internally for chrome (header, footer, body, positioning,
 * overlay registration, focus trap, transitions). HybridPopover renders the
 * structured filter-list content variants (multi-select, single-select,
 * reorder-only) inside the Popover's stickyHeader and content slots.
 *
 * See descriptors/hybrid-popover.json and the React parity reference at
 * packages/react/src/components/HybridPopover/HybridPopover.tsx.
 */

import {
  createResizeHandle,
  createInlinePanelStack,
  filterItems,
  filterGroups,
} from '@arvo/core';
import type {
  ArvoInitialFocusTarget,
  ResizeHandleInstance,
  InlinePanelStack,
} from '@arvo/core';
import { formatMatchCountMessage } from '@arvo/utils';
import { ArvoPopover } from '../Popover/Popover';
import type {
  ArvoPopoverActionConfig,
  ArvoPopoverHeaderActionConfig,
} from '../Popover/Popover';
import { ArvoSearch } from '../Search/Search';
import { type ArvoButton } from '../Button/Button';
import { ArvoButtonGroup } from '../ButtonGroup/ButtonGroup';
import { ArvoBannerAlert } from '../BannerAlert/BannerAlert';
import type { ArvoBannerAlertOptions } from '../BannerAlert/BannerAlert';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import type { ArvoMessageAlertType } from '../MessageAlert/MessageAlert';
import { ArvoList } from '../List/List';
import type {
  ArvoListItemData,
  ArvoListReorderDetail,
} from '../List/List';
import {
  isPopoverInlineConfig,
  mapListEmptyState,
  resolveItemInline,
  toListPayload,
  type PopoverInlineConfig,
} from './hpop-helpers';

export type { PopoverInlineConfig };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HPOP_MIN_WIDTH = 270; // aligns with $arvo-popover-wmin so the composed Popover cannot disagree
export const HPOP_DEFAULT_WIDTH = 360; // Figma spec default
export const HPOP_MAX_WIDTH = 700; // matches $arvo-popover-wmax
export const HPOP_MIN_HEIGHT = 272;

const HPOP_SKELETON_ROWS = 12; // forwarded to the embedded ArvoList unless overridden via options.listProps.skeletonRows

// ---------------------------------------------------------------------------
// Custom types (parity with React)
// ---------------------------------------------------------------------------

export interface HybridPopoverItem {
  id: string;
  label: string;
  icon?: string;
  value?: unknown;
  isDisabled?: boolean;
  isExcluded?: boolean;
  isDraggable?: boolean;
  /** @deprecated Use `inline` instead. */
  hasInline?: boolean | HybridPopoverItem[] | HybridPopoverInlineConfig;
  inline?: HybridPopoverInlineConfig | PopoverInlineConfig;
  isIndeterminate?: boolean;
}

export interface HybridPopoverGroup {
  id: string;
  label?: string;
  isDraggable?: boolean;
  hasSelectAll?: boolean;
  items: HybridPopoverItem[];
}

export interface HybridPopoverMessageAlertConfig {
  type?: ArvoMessageAlertType;
  message?: string | ((count: number, total: number) => string);
  icon?: string | null;
}

export interface HybridPopoverSearchConfig {
  variant?: 'default' | 'filter-search';
  placeholder?: string;
  shortcut?: string;
  counter?: boolean;
  messageAlert?: false | HybridPopoverMessageAlertConfig;
}

export interface HybridPopoverConditionalConfig {
  value: 'and' | 'or';
  onChange: (value: 'and' | 'or') => void;
}

export interface HybridPopoverEmptyConfig {
  noDataTitle?: string;
  noDataMessage?: string;
  noResultsTitle?: string;
  noResultsMessage?: string;
  noResultsClearLabel?: string;
  /** Informational message rendered when dataState='appliesToAll'. */
  appliesToAllMessage?: string;
}

export type HybridPopoverDataState =
  | 'data'
  | 'appliesToAll'
  | 'noResults'
  | 'noData';

export interface HybridPopoverInlineConfig {
  title?: string;
  items?: HybridPopoverItem[] | HybridPopoverGroup[];
  variant?: 'multi' | 'single';
  hasBackButton?: boolean;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onBack?: () => void;
}

export interface HybridPopoverReorderDetail {
  fromIndex: number;
  toIndex: number;
  fromGroup: string | null;
  toGroup: string | null;
  items: HybridPopoverItem[] | HybridPopoverGroup[];
}

export interface HybridPopoverChangeMeta {
  item: HybridPopoverItem | null;
  action: 'toggle' | 'select-all' | 'group-select-all' | 'apply' | 'reset' | 'clear';
}

export type HybridPopoverVariant =
  | 'multi'
  | 'single'
  | 'boolean'
  | 'conditional'
  | 'custom';

export type HybridPopoverSelectionMode = 'multi' | 'single' | 'none';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ArvoHybridPopoverOptions {
  variant?: HybridPopoverVariant;
  selectionMode?: HybridPopoverSelectionMode;
  /** Controlled item ordering. */
  items?: HybridPopoverItem[] | HybridPopoverGroup[];
  /** Initial items for uncontrolled order management (drag persists internally). */
  defaultItems?: HybridPopoverItem[] | HybridPopoverGroup[];
  value?: string[] | string | null;
  defaultValue?: string[] | string | null;
  onChange?: (
    value: string[] | string | null,
    meta: HybridPopoverChangeMeta,
  ) => void;
  commitOn?: 'apply' | 'change';

  search?: false | HybridPopoverSearchConfig;
  bannerAlert?: ArvoBannerAlertOptions | false;
  conditional?: false | HybridPopoverConditionalConfig;

  hasGlobalSelectAll?: boolean;
  enableReorder?: boolean;
  crossGroupDrag?: boolean;
  onReorder?: (detail: HybridPopoverReorderDetail) => void;

  emptyConfig?: HybridPopoverEmptyConfig;
  /**
   * Escape-hatch bag forwarded to the embedded ArvoList instance using the
   * bag-first / flat-wins merge rule. Use for the long-tail ArvoList knobs
   * the HybridPopover does not curate (e.g. `actionsVisibility`,
   * `hasGroupDividers`, `skeletonRows`, `width`, `ariaLabel`). Parent-owned
   * props (selection, items, isLoading, isReorderable, search-derived
   * isEmpty / emptyState) cannot be overridden via this bag.
   */
  listProps?: {
    variant?: 'standard' | 'rich';
    actionsVisibility?: 'hover' | 'always';
    hasGroupDividers?: boolean;
    skeletonRows?: number;
    width?: string;
    ariaLabel?: string;
  };
  actions?: ArvoPopoverActionConfig[] | false;

  isResizable?: boolean;
  width?: number;
  height?: number | null;
  onResize?: (detail: { width: number; height: number }) => void;
  onResizeCommit?: (detail: { width: number; height: number }) => void;

  title?: string | null;
  hasHeader?: boolean;
  isClosable?: boolean;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPopoverHeaderActionConfig[];

  placement?: ArvoPopoverOptionsPlacement;
  offset?: number;
  closeOnOutside?: boolean;

  isLoading?: boolean;
  /**
   * Explicit data-state override. When 'data' (default) the component infers
   * state from items + filter query (totalCount === 0 -> noData,
   * filteredCount === 0 -> noResults). Set to 'appliesToAll' to render the
   * informational filter-applies-to-all message (header, search, and footer
   * remain). Setting 'noData' / 'noResults' forces those branches regardless
   * of items.
   * State precedence: isLoading > noResults > noData > appliesToAll > data.
   */
  dataState?: HybridPopoverDataState;
  defaultOpen?: boolean;

  isInline?: boolean;
  parent?: string | null;
  /**
   * Initial focus target for the composed popover. `'auto'` keeps the
   * searchable HybridPopover behavior: search receives focus when rendered,
   * otherwise the first focusable body item is used.
   */
  initialFocus?: ArvoInitialFocusTarget | null;

  onApply?: (value: string[] | string | null) => boolean | void;
  onCancel?: () => void;
  onReset?: () => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
}

type ArvoPopoverOptionsPlacement =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end'
  | 'auto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isGrouped(
  items: HybridPopoverItem[] | HybridPopoverGroup[],
): items is HybridPopoverGroup[] {
  return items.length > 0 && 'items' in (items[0] as object);
}

function flattenItems(
  items: HybridPopoverItem[] | HybridPopoverGroup[],
): HybridPopoverItem[] {
  if (isGrouped(items)) return items.flatMap((g) => g.items);
  return items as HybridPopoverItem[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveSelection(
  variant: HybridPopoverVariant,
  selectionMode: HybridPopoverSelectionMode | undefined,
): HybridPopoverSelectionMode {
  if (selectionMode) return selectionMode;
  if (variant === 'multi') return 'multi';
  if (variant === 'single') return 'single';
  return 'multi';
}

function defaultDraft(
  selection: HybridPopoverSelectionMode,
  seedValue: string[] | string | null | undefined,
): string[] | string | null {
  const seed = seedValue ?? null;
  if (selection === 'multi') {
    return Array.isArray(seed) ? [...seed] : [];
  }
  if (selection === 'single') {
    return typeof seed === 'string' ? seed : null;
  }
  return null;
}

function valuesEqual(
  a: string[] | string | null,
  b: string[] | string | null,
): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
}

function cloneValue(
  v: string[] | string | null,
): string[] | string | null {
  if (Array.isArray(v)) return [...v];
  return v;
}

/**
 * Apply a sortable-list commit (global fromIndex / toIndex with
 * fromGroup / toGroup) to an items array. Mirrors the React parity helper.
 */
function applyReorder(
  items: HybridPopoverItem[] | HybridPopoverGroup[],
  fromIndex: number,
  toIndex: number,
  fromGroup: string | null,
  toGroup: string | null,
): HybridPopoverItem[] | HybridPopoverGroup[] {
  if (!isGrouped(items)) {
    const arr = [...(items as HybridPopoverItem[])];
    if (fromIndex < 0 || fromIndex >= arr.length) return items;
    const [moved] = arr.splice(fromIndex, 1);
    const insertIdx = clamp(toIndex, 0, arr.length);
    arr.splice(insertIdx, 0, moved);
    return arr;
  }
  const groups = items as HybridPopoverGroup[];
  const flat: { item: HybridPopoverItem; groupId: string }[] = [];
  groups.forEach((g) =>
    g.items.forEach((it) => flat.push({ item: it, groupId: g.id })),
  );
  if (fromIndex < 0 || fromIndex >= flat.length) return items;
  const [moved] = flat.splice(fromIndex, 1);
  const targetGroupId = toGroup ?? fromGroup ?? moved.groupId;
  moved.groupId = targetGroupId;
  const insertIdx = clamp(toIndex, 0, flat.length);
  flat.splice(insertIdx, 0, moved);
  return groups.map((g) => ({
    ...g,
    items: flat.filter((entry) => entry.groupId === g.id).map((e) => e.item),
  }));
}

let _inlineIdCounter = 0;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

let _idCounter = 0;

export class ArvoHybridPopover {
  private _trigger: HTMLElement | null;
  private _options: ArvoHybridPopoverOptions;

  private _id: string;
  private _selection: HybridPopoverSelectionMode;

  private _items: HybridPopoverItem[] | HybridPopoverGroup[];
  private _committed: string[] | string | null;
  private _draft: string[] | string | null;
  private _query = '';
  private _isLoading: boolean;

  // Inner Popover composition
  private _popover: ArvoPopover | null = null;
  private _panelEl: HTMLElement | null = null;

  // Slot containers (we own these and re-render into them)
  private _stickyEl: HTMLDivElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;

  // Inner instances tracked for teardown
  private _searchInstance: ArvoSearch | null = null;
  private _bannerInstance: ArvoBannerAlert | null = null;
  private _messageAlertInstance: ArvoMessageAlert | null = null;
  private _conditionalInstance: ArvoButtonGroup | null = null;
  private _inlinePanelStack: InlinePanelStack | null = null;
  private _inlinePanelInstances = new Map<string, ArvoPopover | ArvoHybridPopover>();
  // The embedded ArvoList owns the row DOM (checkbox / radio / drag handle /
  // chev / select-all). HybridPopover holds a single reference so it can
  // forward setItems / selected / setLoading and destroy on teardown.
  private _listInstance: ArvoList | null = null;
  private _clearSearchInstance: ArvoButton | null = null;
  // Separate from _messageAlertInstance (which lives in the sticky search
  // counter). This one hosts the `dataState='appliesToAll'` info alert in the
  // body. Tracked here so _destroyBodyInstances can tear it down.
  private _appliesToAllAlertInstance: ArvoMessageAlert | null = null;

  // Adapters
  private _resize: ResizeHandleInstance | null = null;

  // Items ownership: true when caller passed `items`, false when uncontrolled
  // (defaultItems supplied or items omitted) -- uncontrolled mode mutates the
  // internal array on drag commit.
  private _isControlledItems: boolean;

  // Resize state -- seeded from options and persisted across opens.
  private _resizedWidth: number;
  private _resizedHeight: number | null;

  // Bound listeners
  private _boundOnPopoverOpen: (e: Event) => void;
  private _boundOnPopoverClose: (e: Event) => void;

  static initialize(
    element: HTMLElement,
    options?: ArvoHybridPopoverOptions,
  ): ArvoHybridPopover {
    return new ArvoHybridPopover(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoHybridPopoverOptions) {
    this._trigger = element;
    this._options = { ...(options ?? {}) };

    this._id = `arvo-hpop-${++_idCounter}`;

    const variant: HybridPopoverVariant = this._options.variant ?? 'multi';
    this._selection = resolveSelection(variant, this._options.selectionMode);

    if (
      variant === 'boolean' ||
      variant === 'conditional' ||
      variant === 'custom'
    ) {
      console.warn(
        `HybridPopover: variant "${variant}" is not yet implemented.`,
      );
    }

    this._isControlledItems =
      this._options.items !== undefined &&
      this._options.defaultItems === undefined;
    this._items =
      this._options.items ??
      this._options.defaultItems ??
      [];
    this._isLoading = !!this._options.isLoading;

    this._resizedWidth = clamp(
      this._options.width ?? HPOP_DEFAULT_WIDTH,
      HPOP_MIN_WIDTH,
      HPOP_MAX_WIDTH,
    );
    this._resizedHeight = this._options.height ?? null;

    // Seed committed/draft from value or defaultValue.
    const seedRaw =
      this._options.value !== undefined
        ? this._options.value
        : this._options.defaultValue ?? null;
    this._committed = defaultDraft(this._selection, seedRaw);
    this._draft = defaultDraft(this._selection, this._committed);

    this._stickyEl = document.createElement('div');
    this._stickyEl.className = 'arvo-hpop__sticky';

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-hpop__body-root';

    this._popover = new ArvoPopover(element, {
      variant: 'edge',
      title: this._options.title ?? '',
      hasHeader: this._options.hasHeader ?? true,
      isClosable: this._options.isClosable ?? true,
      hasBackButton: this._options.hasBackButton ?? false,
      onBack: this._options.onBack,
      headerActions: this._options.headerActions ?? [],
      placement: (this._options.placement ?? 'auto') as ArvoPopoverOptionsPlacement,
      offset: this._options.offset ?? 4,
      closeOnOutside: this._options.closeOnOutside ?? true,
      isLoading: this._isLoading,
      isInline: this._options.isInline ?? false,
      stickyHeader: this._stickyEl,
      content: this._bodyEl,
      actions: this._buildPopoverActions(),
      hasFooter: true,
      initialFocus: this._resolvePopoverInitialFocusOption(),
      onOpen: () => this._options.onOpen?.(),
      onClose: () => this._options.onClose?.(),
    });

    // Resolve panel element via aria-controls (set by Popover constructor).
    const panelId = element.getAttribute('aria-controls');
    if (panelId) {
      this._panelEl = document.getElementById(panelId);
    }
    this._applyPanelClasses();

    // Wire popover lifecycle events to dispatch our own + (de)mount adapters.
    this._boundOnPopoverOpen = this._handlePopoverOpen.bind(this);
    this._boundOnPopoverClose = this._handlePopoverClose.bind(this);
    element.addEventListener('popover:open', this._boundOnPopoverOpen);
    element.addEventListener('popover:close', this._boundOnPopoverClose);

    this._renderSticky();
    this._renderBody();

    // Loading state may need footer hidden immediately.
    if (this._isLoading) {
      this._popover.setFooterVisible(false);
    }

    if (this._options.defaultOpen) {
      // Defer so the panel is fully connected before computing position.
      queueMicrotask(() => this.open());
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    this._popover?.open();
    // Move focus to the search input when the popover opens with search
    // enabled. The underlying popover focus trap defaults to "first
    // focusable" which lands on the header back/close button -- never the
    // right choice for searchable filter panels.
    if (this._shouldFocusSearchOnOpen() && this._stickyEl) {
      requestAnimationFrame(() => {
        const input = this._stickyEl?.querySelector(
          '.arvo-hpop__search input, .arvo-hpop__search textarea',
        ) as HTMLElement | null;
        input?.focus();
      });
    }
  }

  private _shouldFocusSearchOnOpen(): boolean {
    const initialFocus = this._options.initialFocus;
    return this._options.search !== false && (initialFocus == null || initialFocus === 'auto');
  }

  private _resolvePopoverInitialFocusOption(): ArvoInitialFocusTarget {
    const initialFocus = this._options.initialFocus;
    if (initialFocus != null && initialFocus !== 'auto') return initialFocus;
    return this._options.search !== false ? 'none' : 'auto';
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

  value(): string[] | string | null;
  value(newValue: string[] | string | null): void;
  value(
    newValue?: string[] | string | null,
  ): string[] | string | null | void {
    if (newValue === undefined) {
      return cloneValue(this._committed);
    }
    const prev = this._committed;
    this._committed = cloneValue(newValue);
    this._draft = defaultDraft(this._selection, this._committed);
    // Re-render so the embedded ArvoList reflects the new committed value.
    this._renderBody();
    if (!valuesEqual(this._committed, prev)) {
      this._fireChange(this._committed, { item: null, action: 'apply' });
    }
  }

  setLoading(loading: boolean): void {
    if (this._isLoading === loading) return;
    this._isLoading = loading;
    this._popover?.setLoading(loading);
    this._popover?.setFooterVisible(!loading);
    this._renderSticky();
    this._renderBody();
    this._applyPanelClasses();
  }

  updateItems(items: HybridPopoverItem[] | HybridPopoverGroup[]): void {
    this._items = items;
    this._renderSticky();
    this._renderBody();
    this._applyPanelClasses();
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
    this._closeAllInlinePanels();
    this._teardownResize();
    this._teardownInlineStack();
    this._destroyInnerInstances();
    this._popover?.destroy();
    this._popover = null;
    this._stickyEl?.remove();
    this._bodyEl?.remove();
    this._stickyEl = null;
    this._bodyEl = null;
    this._panelEl = null;
    this._trigger = null;
  }

  // ---------------------------------------------------------------------------
  // Popover lifecycle wiring
  // ---------------------------------------------------------------------------

  private _handlePopoverOpen(): void {
    // Reset draft from committed; reset query.
    this._draft = defaultDraft(this._selection, this._committed);
    this._query = '';
    this._renderSticky();
    this._renderBody();
    this._applyPanelClasses();
    this._applyDimensions();
    this._mountInlineStack();
    this._mountResize();
    this._dispatchEvent('hpop:open', {});
  }

  private _handlePopoverClose(): void {
    this._closeAllInlinePanels();
    this._teardownResize();
    this._teardownInlineStack();
    this._dispatchEvent('hpop:close', {});
  }

  // ---------------------------------------------------------------------------
  // Panel chrome
  // ---------------------------------------------------------------------------

  /**
   * Effective data state: explicit prop wins over inferred. Precedence
   * mirrors spec 6.10: isLoading > noResults > noData > appliesToAll > data.
   * `dataState='data'` defers to the inferred path
   * (totalCount === 0 -> noData, otherwise filteredCount === 0 -> noResults).
   */
  private _resolveDataState(): HybridPopoverDataState {
    const prop = this._options.dataState ?? 'data';
    if (prop !== 'data') return prop;
    const flatAll = flattenItems(this._items);
    const totalCount = flatAll.length;
    if (totalCount === 0) return 'noData';
    const filteredCount = this._getFilteredItems().__filteredCount;
    if (filteredCount === 0) return 'noResults';
    return 'data';
  }

  private _applyPanelClasses(): void {
    const panel = this._panelEl;
    if (!panel) return;

    const variant = this._options.variant ?? 'multi';
    const searchEnabled = this._options.search !== false;
    const conditional = this._options.conditional;
    const isResizable = this._options.isResizable ?? true;

    const dataState = this._resolveDataState();

    // Remove any prior hpop classes we set.
    const toRemove: string[] = [];
    panel.classList.forEach((c) => {
      if (c.startsWith('arvo-hpop')) toRemove.push(c);
    });
    toRemove.forEach((c) => panel.classList.remove(c));

    panel.classList.add('arvo-hpop');
    panel.classList.add(`arvo-hpop--${variant}`);
    const bannerAlert = this._options.bannerAlert;
    if (bannerAlert !== false && bannerAlert) {
      panel.classList.add('arvo-hpop--with-banner');
    }
    if (searchEnabled) panel.classList.add('arvo-hpop--with-search');
    if (conditional) {
      panel.classList.add('arvo-hpop--with-conditional');
    }
    if (isResizable) panel.classList.add('arvo-hpop--with-resize');

    if (dataState === 'noData') panel.classList.add('arvo-hpop--no-data');
    else if (dataState === 'noResults') panel.classList.add('arvo-hpop--no-results');
    else if (dataState === 'appliesToAll') panel.classList.add('arvo-hpop--applies-to-all');

    // Footer follows data state: hide on noData (spec 5.4 / 6.9), restore
    // otherwise (unless loading, which is handled by setLoading).
    if (!this._isLoading) {
      this._popover?.setFooterVisible(dataState !== 'noData');
    }

    if (this._isLoading) panel.classList.add('loading');
  }

  private _applyDimensions(): void {
    const panel = this._panelEl;
    if (!panel) return;
    // Width is sourced from internal state which is seeded once from
    // options and updated by createResizeHandle. Subsequent opens preserve
    // user-resized dims.
    panel.style.width = `${clamp(
      this._resizedWidth,
      HPOP_MIN_WIDTH,
      HPOP_MAX_WIDTH,
    )}px`;
    if (this._resizedHeight != null) {
      const maxH = Math.floor(window.innerHeight * 0.9);
      panel.style.height = `${clamp(
        this._resizedHeight,
        HPOP_MIN_HEIGHT,
        maxH,
      )}px`;
    } else {
      panel.style.removeProperty('height');
    }
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  private _getFilteredItems(): {
    filtered: HybridPopoverItem[] | HybridPopoverGroup[];
    flatFiltered: HybridPopoverItem[];
    flatAll: HybridPopoverItem[];
    grouped: boolean;
    __filteredCount: number;
  } {
    const items = this._items;
    const grouped = isGrouped(items);
    const searchEnabled = this._options.search !== false;
    const query = this._query;

    let filtered: HybridPopoverItem[] | HybridPopoverGroup[];
    if (!searchEnabled || !query) {
      filtered = items;
    } else if (grouped) {
      filtered = filterGroups(items as HybridPopoverGroup[], {
        query,
        keys: ['label'],
      }) as HybridPopoverGroup[];
    } else {
      filtered = filterItems(items as HybridPopoverItem[], {
        query,
        keys: ['label'],
      }) as HybridPopoverItem[];
    }

    const flatFiltered = flattenItems(filtered);
    const flatAll = flattenItems(items);
    return {
      filtered,
      flatFiltered,
      flatAll,
      grouped,
      __filteredCount: flatFiltered.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Sticky header (search + conditional)
  // ---------------------------------------------------------------------------

  private _renderSticky(): void {
    const sticky = this._stickyEl;
    if (!sticky) return;

    this._searchInstance?.destroy();
    this._searchInstance = null;
    this._bannerInstance?.destroy();
    this._bannerInstance = null;
    this._messageAlertInstance?.destroy();
    this._messageAlertInstance = null;
    this._conditionalInstance?.destroy();
    this._conditionalInstance = null;
    sticky.textContent = '';

    if (this._isLoading) {
      sticky.style.display = 'none';
      return;
    }

    const searchEnabled = this._options.search !== false;
    const conditional = this._options.conditional;
    const bannerAlert = this._options.bannerAlert;
    const showBanner = bannerAlert !== false && !!bannerAlert;
    const showSearch = searchEnabled;
    const showConditional = !!conditional;

    // No-data state hides the sticky header (parity with React). Forced
    // noData via dataState prop also hides it so the body's empty figure
    // isn't crowded by an unusable search input.
    const dataState = this._resolveDataState();
    if (
      dataState === 'noData' ||
      (!showBanner && !showSearch && !showConditional)
    ) {
      sticky.style.display = 'none';
      return;
    }

    sticky.style.display = '';

    if (showBanner && bannerAlert) {
      const bannerWrap = document.createElement('div');
      bannerWrap.className = 'arvo-hpop__banner';
      const bannerHost = document.createElement('div');
      bannerWrap.appendChild(bannerHost);
      this._bannerInstance = ArvoBannerAlert.initialize(bannerHost, bannerAlert);
      sticky.appendChild(bannerWrap);
    }

    if (showSearch) {
      const searchWrap = document.createElement('div');
      searchWrap.className = 'arvo-hpop__search';

      const searchEl = document.createElement('div');
      searchWrap.appendChild(searchEl);

      const searchCfg: HybridPopoverSearchConfig =
        searchEnabled && this._options.search
          ? (this._options.search as HybridPopoverSearchConfig)
          : {};
      const placeholder = searchCfg.placeholder ?? 'Search';
      const shortcut = searchCfg.shortcut ?? null;
      const showCounter = !!searchCfg.counter && !!this._query;
      const counter = showCounter
        ? {
            current: this._getFilteredItems().__filteredCount,
            total: flattenItems(this._items).length,
          }
        : null;

      this._searchInstance = ArvoSearch.initialize(searchEl as HTMLDivElement, {
        variant: 'filter',
        value: this._query,
        placeholder,
        shortcut: shortcut ?? undefined,
        counter,
        isFullWidth: true,
        'aria-label': 'Filter options',
        onChange: (value: string) => this._handleSearchInput(value),
        onSearch: (value: string) => this._handleSearchInput(value),
        onClear: () => this._handleSearchClear(),
      });

      const msgText = this._resolveMessageAlertText();
      if (msgText) {
        const msgWrap = document.createElement('div');
        msgWrap.className = 'arvo-hpop__search-msg';
        const msgHost = document.createElement('div');
        msgWrap.appendChild(msgHost);
        const msgCfg =
          searchCfg.messageAlert && typeof searchCfg.messageAlert === 'object'
            ? searchCfg.messageAlert
            : {};
        this._messageAlertInstance = ArvoMessageAlert.initialize(msgHost, {
          type: msgCfg.type ?? 'info',
          message: msgText,
          icon: msgCfg.icon ?? undefined,
        });
        searchWrap.appendChild(msgWrap);
      }

      sticky.appendChild(searchWrap);
    }

    if (showConditional && conditional) {
      const condWrap = document.createElement('div');
      condWrap.className = 'arvo-hpop__cond';

      const condEl = document.createElement('div');
      condWrap.appendChild(condEl);

      this._conditionalInstance = ArvoButtonGroup.initialize(condEl, {
        ariaLabel: 'Combine filters',
        items: [
          { value: 'and', label: 'And' },
          { value: 'or', label: 'Or' },
        ],
        value: conditional.value,
        size: 'sm',
        onChange: (detail) => {
          const v = detail.value;
          if (v === 'and' || v === 'or') conditional.onChange(v);
        },
      });

      sticky.appendChild(condWrap);
    }
  }

  // ---------------------------------------------------------------------------
  // Body (mounted ArvoList | appliesToAll info alert | unimplemented stub)
  // ---------------------------------------------------------------------------

  private _renderBody(): void {
    const body = this._bodyEl;
    if (!body) return;

    // Tear down previous inner body instances (list + applies-to-all alert).
    this._destroyBodyInstances();
    body.textContent = '';

    const variant = this._options.variant ?? 'multi';
    const isUnimplemented =
      variant === 'boolean' || variant === 'conditional' || variant === 'custom';
    const dataState = this._resolveDataState();

    // appliesToAll is informational, not a list state -- render it outside
    // ArvoList so the embedded list is neither mounted nor sized for what is
    // conceptually a status banner (spec section 6.7). isLoading wins over
    // every data state per spec 6.10, so only branch here when not loading.
    if (!this._isLoading && dataState === 'appliesToAll') {
      body.appendChild(this._buildAppliesToAll());
      return;
    }

    if (isUnimplemented && !this._isLoading) {
      // Empty body for unimplemented variants (parity with React).
      return;
    }

    // Everything else (data / noData / noResults / loading) routes through
    // the embedded ArvoList. ArvoList renders the skeleton on isLoading and
    // the structured empty state on isEmpty.
    const { filtered } = this._getFilteredItems();
    const enableReorder = !!this._options.enableReorder;
    const payload = toListPayload(filtered, enableReorder);
    const isEmpty = dataState === 'noData' || dataState === 'noResults';
    const emptyState = isEmpty
      ? mapListEmptyState(
          dataState === 'noResults' ? 'no-results' : 'no-data',
          this._options.emptyConfig,
          dataState === 'noResults' ? () => this._handleSearchClear() : undefined,
        )
      : null;

    const listHost = document.createElement('div');
    body.appendChild(listHost);

    const listProps = this._options.listProps ?? {};
    const listVariant = listProps.variant ?? 'standard';
    const selectedIds =
      this._selection === 'none'
        ? null
        : (this._draft as string[] | string | null);

    // bag-first / flat-wins merge: spread listProps first, then force the
    // parent-owned keys so HybridPopover's vocabulary always wins on overlap.
    this._listInstance = ArvoList.initialize(listHost, {
      ...listProps,
      variant: listVariant,
      selectionMode: this._selection,
      items: payload.items,
      groups: payload.groups,
      selectedIds: selectedIds ?? undefined,
      hasGlobalSelectAll:
        !!this._options.hasGlobalSelectAll && this._selection === 'multi',
      isReorderable: enableReorder,
      crossGroupReorder: !!this._options.crossGroupDrag,
      isLoading: this._isLoading,
      skeletonRows: listProps.skeletonRows ?? HPOP_SKELETON_ROWS,
      isEmpty,
      emptyState,
      searchQuery: this._query || undefined,
      ariaLabel:
        listProps.ariaLabel ?? this._options.title ?? 'Filter options',
      onSelectionChange: (detail) => this._handleListSelectionChange(detail),
      onReorder: (detail) => this._handleListReorder(detail),
      onItemActivate: (detail) => this._handleListItemActivate(detail),
    });
  }

  private _buildAppliesToAll(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'arvo-hpop__applies-to-all';
    const host = document.createElement('div');
    wrap.appendChild(host);
    const cfgMessage = this._options.emptyConfig?.appliesToAllMessage;
    const message = cfgMessage ?? 'This filter currently applies to all values.';
    this._appliesToAllAlertInstance = ArvoMessageAlert.initialize(host, {
      type: 'info',
      message,
    });
    return wrap;
  }

  private _resolveMessageAlertText(): string | null {
    const searchEnabled = this._options.search !== false;
    if (!searchEnabled) return null;
    const searchCfg =
      this._options.search && typeof this._options.search === 'object'
        ? this._options.search
        : {};
    if (searchCfg.messageAlert === false) return null;
    if (!searchCfg.counter || !this._query) return null;
    const msgCfg =
      searchCfg.messageAlert && typeof searchCfg.messageAlert === 'object'
        ? searchCfg.messageAlert
        : {};
    const filteredCount = this._getFilteredItems().__filteredCount;
    const totalCount = flattenItems(this._items).length;
    if (typeof msgCfg.message === 'function') {
      return msgCfg.message(filteredCount, totalCount);
    }
    const template =
      typeof msgCfg.message === 'string'
        ? msgCfg.message
        : '{count} matching results found.';
    return formatMatchCountMessage(filteredCount, template);
  }

  // ---------------------------------------------------------------------------
  // ArvoList bridge handlers (selection / reorder / inline drill-down)
  // ---------------------------------------------------------------------------

  /**
   * Bridge ArvoList's onSelectionChange into HybridPopover's draft path.
   * The legacy onChange meta is reconstructed from a prev/next diff so the
   * public contract `onChange(value, { item, action })` stays unchanged.
   */
  private _handleListSelectionChange(detail: {
    selectedIds: string[] | string | null;
    items: ArvoListItemData[];
  }): void {
    if (this._selection === 'none') return;

    const next = detail.selectedIds;

    if (this._selection === 'single') {
      const nextId = typeof next === 'string' ? next : null;
      const item = nextId
        ? flattenItems(this._items).find((i) => i.id === nextId) ?? null
        : null;
      this._updateDraft(nextId, { item, action: 'toggle' });
      return;
    }

    const prevArr = Array.isArray(this._draft) ? this._draft : [];
    const nextArr = Array.isArray(next) ? next : [];
    const prevSet = new Set(prevArr);
    const nextSet = new Set(nextArr);
    const added: string[] = [];
    const removed: string[] = [];
    nextArr.forEach((id) => {
      if (!prevSet.has(id)) added.push(id);
    });
    prevArr.forEach((id) => {
      if (!nextSet.has(id)) removed.push(id);
    });
    const changed = [...added, ...removed].sort();

    if (changed.length === 0) {
      this._updateDraft(nextArr, { item: null, action: 'toggle' });
      return;
    }

    const flatAll = flattenItems(this._items);
    if (changed.length === 1) {
      const id = changed[0];
      const item = flatAll.find((i) => i.id === id) ?? null;
      this._updateDraft(nextArr, { item, action: 'toggle' });
      return;
    }

    const globalEnabled = flatAll
      .filter((i) => !i.isDisabled)
      .map((i) => i.id)
      .sort();
    const matchesSet = (a: string[], b: string[]) =>
      a.length === b.length && a.every((v, i) => v === b[i]);

    // Global SA is only authored when hasGlobalSelectAll is true; otherwise
    // the diff cannot have come from the global SA row. Gating on that flag
    // keeps the single-group case (where group enabled === global enabled)
    // classifying as 'group-select-all' instead of 'select-all'.
    if (
      this._options.hasGlobalSelectAll &&
      matchesSet(changed, globalEnabled)
    ) {
      this._updateDraft(nextArr, { item: null, action: 'select-all' });
      return;
    }

    if (isGrouped(this._items)) {
      const groupHit = (this._items as HybridPopoverGroup[]).find((g) => {
        const groupEnabled = g.items
          .filter((i) => !i.isDisabled)
          .map((i) => i.id)
          .sort();
        return matchesSet(changed, groupEnabled);
      });
      if (groupHit) {
        this._updateDraft(nextArr, { item: null, action: 'group-select-all' });
        return;
      }
    }

    // Last resort: when hasGlobalSelectAll was false but the diff still
    // matches the global enabled set (e.g. consumer-driven bulk change),
    // classify as select-all so the meta isn't a misleading 'toggle'.
    if (matchesSet(changed, globalEnabled)) {
      this._updateDraft(nextArr, { item: null, action: 'select-all' });
      return;
    }

    // Unknown multi-diff -- fall back to toggle without an item.
    this._updateDraft(nextArr, { item: null, action: 'toggle' });
  }

  private _handleListReorder(detail: ArvoListReorderDetail): void {
    const { fromIndex, toIndex, fromGroupId, toGroupId } = detail;

    // ArvoList allows cross-group drops by default. HybridPopover exposes
    // crossGroupDrag as an opt-in; reject the commit here when the consumer
    // has not opted in.
    if (
      !this._options.crossGroupDrag &&
      fromGroupId !== toGroupId
    ) {
      return;
    }

    const next = applyReorder(
      this._items,
      fromIndex,
      toIndex,
      fromGroupId,
      toGroupId,
    );
    if (!this._isControlledItems) {
      this._items = next;
      // Defer the re-render past the current sortable callback frame so the
      // sortable handle we are inside isn't destroyed mid-commit.
      queueMicrotask(() => {
        if (!this.isOpen()) return;
        this._renderBody();
      });
    }
    this._options.onReorder?.({
      fromIndex,
      toIndex,
      fromGroup: fromGroupId,
      toGroup: toGroupId,
      items: next,
    });
    this._dispatchEvent('hpop:reorder', {
      fromIndex,
      toIndex,
      fromGroup: fromGroupId,
      toGroup: toGroupId,
    });
  }

  private _handleListItemActivate(detail: {
    id: string;
    item: ArvoListItemData;
    event: Event;
  }): void {
    const flatAll = flattenItems(this._items);
    const source =
      (detail.item.data as HybridPopoverItem | undefined) ??
      flatAll.find((i) => i.id === detail.id) ??
      null;
    if (!source) return;
    const inlineCfg = resolveItemInline(source);
    if (!inlineCfg) return;
    // Prefer the listener element (the chev IconButton) so the inline panel
    // opens against the same anchor on both platforms. Fall back to event.target
    // if currentTarget is unavailable (event already drained / detached).
    const currentTarget = detail.event.currentTarget;
    const target = detail.event.target;
    const anchor =
      currentTarget instanceof HTMLElement
        ? currentTarget
        : target instanceof HTMLElement
          ? target
          : null;
    if (!anchor) return;
    this._openInlineFromItem(inlineCfg, anchor);
  }

  /**
   * Update HybridPopover's draft state. The embedded ArvoList has already
   * updated its own DOM / aria-checked attributes synchronously inside its
   * onSelectionChange flow, so we do NOT push back into it here -- doing so
   * would loop. Reset / Cancel / value() paths re-render the body instead.
   */
  private _updateDraft(
    next: string[] | string | null,
    meta: HybridPopoverChangeMeta,
  ): void {
    this._draft = next;
    if ((this._options.commitOn ?? 'apply') === 'change') {
      this._committed = cloneValue(next);
      this._fireChange(next, meta);
      this._dispatchEvent('hpop:change', { value: cloneValue(next) });
    }
  }

  // ---------------------------------------------------------------------------
  // Footer actions
  // ---------------------------------------------------------------------------

  private _buildPopoverActions(): ArvoPopoverActionConfig[] {
    if (this._options.actions === false) return [];
    if (this._options.actions) return this._options.actions;
    return [
      // Reset renders icon-only per Figma spec (32x32 ArvoIconButton with
      // o9con-rotate-left). The Popover footer takes the icon-only branch
      // when `icon` is set and `label` is omitted; the action `id` doubles
      // as the IconButton tooltip / aria-label fallback.
      {
        id: 'Reset',
        icon: 'rotate-left',
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

  private _handleApply(): boolean | void {
    const next = cloneValue(this._draft);
    const result = this._options.onApply?.(next);
    this._committed = next;
    this._fireChange(next, { item: null, action: 'apply' });
    this._dispatchEvent('hpop:apply', { value: cloneValue(next) });
    if (result === false) return false;
    return undefined;
  }

  private _handleCancel(): void {
    this._draft = defaultDraft(this._selection, this._committed);
    this._query = '';
    // Cancel auto-closes the popover, so focus is leaving the panel
    // anyway. Still avoid _renderSticky() so the live search instance is
    // not torn down before the close animation runs.
    this._searchInstance?.value('');
    this._renderBody();
    this._applyPanelClasses();
    this._updateMessageAlert();
    this._updateSearchCounter();
    this._options.onCancel?.();
    this._dispatchEvent('hpop:cancel', {});
    // Returning undefined -> Popover auto-closes.
  }

  private _handleReset(): void {
    const cleared = this._selection === 'multi' ? [] : null;
    this._draft = cleared as string[] | string | null;
    this._query = '';
    if ((this._options.commitOn ?? 'apply') === 'change') {
      this._committed = cloneValue(this._draft);
      this._fireChange(this._draft, { item: null, action: 'reset' });
    }
    // Don't tear down the search input on Reset. The user may be
    // mid-flow and we want the search box to stay alive (and refocusable
    // via Shift+Tab) instead of being destroyed and recreated.
    this._searchInstance?.value('');
    this._renderBody();
    this._applyPanelClasses();
    this._updateMessageAlert();
    this._updateSearchCounter();
    this._options.onReset?.();
    this._dispatchEvent('hpop:reset', {});
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  private _handleSearchInput(value: string): void {
    this._query = value;
    // CRITICAL: never call _renderSticky() here. _renderSticky tears down
    // the live ArvoSearch instance and rebuilds the <input> from scratch,
    // which rips DOM focus out of the search box mid-keystroke. The search
    // input must keep focus until the user intentionally moves it (Tab,
    // click elsewhere, Esc, etc.). Mirror the ActionMenu fix: re-render
    // only the body (filtered ArvoList) and update the message alert /
    // counter through the existing sticky instances without disturbing the
    // search input.
    this._renderBody();
    this._applyPanelClasses();
    this._updateMessageAlert();
    this._updateSearchCounter();
  }

  private _handleSearchClear(): void {
    this._query = '';
    if (this._searchInstance) {
      this._searchInstance.value('');
    }
    // See _handleSearchInput: do NOT call _renderSticky(). This handler
    // also runs when the user clicks the empty-state "Clear search"
    // button, in which case focus is on that button and is about to be
    // discarded along with the empty state -- destroying the search
    // instance is irrelevant. But when triggered programmatically (e.g.
    // from Reset) while the search has focus, _renderSticky() would
    // still steal focus. Keep the live instance and just update its
    // value + dependent UI.
    this._renderBody();
    this._applyPanelClasses();
    this._updateMessageAlert();
    this._updateSearchCounter();
  }

  /**
   * Update the message alert (counter results message) in the sticky
   * header without touching the live ArvoSearch instance. The alert may
   * need to appear, disappear, or update its text as the query / filtered
   * count changes during typing.
   */
  private _updateMessageAlert(): void {
    const sticky = this._stickyEl;
    if (!sticky) return;
    const searchWrap = sticky.querySelector('.arvo-hpop__search');
    if (!searchWrap) return;

    const msgText = this._resolveMessageAlertText();

    if (this._messageAlertInstance) {
      if (!msgText) {
        this._messageAlertInstance.destroy();
        this._messageAlertInstance = null;
        const msgWrap = searchWrap.querySelector('.arvo-hpop__search-msg');
        msgWrap?.remove();
        return;
      }
      this._messageAlertInstance.message(msgText);
      return;
    }

    if (!msgText) return;

    const searchCfg =
      this._options.search && typeof this._options.search === 'object'
        ? (this._options.search as HybridPopoverSearchConfig)
        : {};
    const msgCfg =
      searchCfg.messageAlert && typeof searchCfg.messageAlert === 'object'
        ? searchCfg.messageAlert
        : {};
    const msgWrap = document.createElement('div');
    msgWrap.className = 'arvo-hpop__search-msg';
    const msgHost = document.createElement('div');
    msgWrap.appendChild(msgHost);
    this._messageAlertInstance = ArvoMessageAlert.initialize(msgHost, {
      type: msgCfg.type ?? 'info',
      message: msgText,
      icon: msgCfg.icon ?? undefined,
    });
    searchWrap.appendChild(msgWrap);
  }

  private _updateSearchCounter(): void {
    if (!this._searchInstance) return;
    const searchCfg =
      this._options.search && typeof this._options.search === 'object'
        ? (this._options.search as HybridPopoverSearchConfig)
        : null;
    if (!searchCfg?.counter) return;
    if (!this._query) return;
    const flatAll = flattenItems(this._items);
    const filteredCount = this._getFilteredItems().__filteredCount;
    this._searchInstance.counter(filteredCount, flatAll.length);
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
      min: { width: HPOP_MIN_WIDTH, height: HPOP_MIN_HEIGHT },
      max: (rect: DOMRect) => ({
        width: Math.max(
          HPOP_MIN_WIDTH,
          Math.min(HPOP_MAX_WIDTH, window.innerWidth - rect.left - 16),
        ),
        height: Math.max(
          HPOP_MIN_HEIGHT,
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
        // Stamp the user-resized signal on the panel so the SCSS rules in
        // `_arvo-hpop.scss` ([data-arvo-resized='true']) switch nested
        // inline popovers from natural-height (default) to fill-parent
        // mode. Applied during the drag so the visual transition reads
        // immediately when the user releases.
        this._panelEl?.setAttribute('data-arvo-resized', 'true');
        this._options.onResize?.(rect);
      },
      onCommit: (rect) => {
        this._resizedWidth = rect.width;
        this._resizedHeight = rect.height;
        this._panelEl?.setAttribute('data-arvo-resized', 'true');
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

  // Roving tabindex is owned by ArvoList -- HybridPopover does not wire
  // createTabRoving directly. The search-input -> ArrowDown handoff into the
  // list relies on ArvoList's onKeyDown handler picking up arrow keys when
  // focus enters the list region.

  // ---------------------------------------------------------------------------
  // Inner instance teardown
  // ---------------------------------------------------------------------------

  private _destroyBodyInstances(): void {
    this._listInstance?.destroy();
    this._listInstance = null;
    this._clearSearchInstance?.destroy();
    this._clearSearchInstance = null;
    this._appliesToAllAlertInstance?.destroy();
    this._appliesToAllAlertInstance = null;
  }

  private _destroyInnerInstances(): void {
    this._searchInstance?.destroy();
    this._searchInstance = null;
    this._bannerInstance?.destroy();
    this._bannerInstance = null;
    this._messageAlertInstance?.destroy();
    this._messageAlertInstance = null;
    this._conditionalInstance?.destroy();
    this._conditionalInstance = null;
    this._destroyBodyInstances();
  }

  // ---------------------------------------------------------------------------
  // Inline panel stack
  // ---------------------------------------------------------------------------

  private _mountInlineStack(): void {
    if (this._inlinePanelStack || !this._panelEl) return;
    this._inlinePanelStack = createInlinePanelStack({
      host: this._panelEl,
      containerClass: 'arvo-hpop__inline-panel',
      maxDepth: 5,
    });
  }

  private _teardownInlineStack(): void {
    this._inlinePanelStack?.destroy();
    this._inlinePanelStack = null;
  }

  private _destroyInlineInstance(entryId: string): void {
    const instance = this._inlinePanelInstances.get(entryId);
    instance?.destroy();
    this._inlinePanelInstances.delete(entryId);
  }

  private _closeAllInlinePanels(): void {
    const stack = this._inlinePanelStack;
    if (!stack) return;
    for (const entry of stack.getEntries()) {
      this._destroyInlineInstance(entry.id);
    }
    stack.popAll();
  }

  private _popInlinePanel(via: 'back' | 'default' = 'default'): void {
    const stack = this._inlinePanelStack;
    if (!stack || stack.getDepth() === 0) return;
    const top = stack.getTop();
    if (!top) return;
    const entryId = top.id;
    stack.pop({ via: via === 'back' ? 'back' : 'default' });
    this._destroyInlineInstance(entryId);
  }

  private _openInlineFromItem(
    config: HybridPopoverInlineConfig | PopoverInlineConfig,
    sourceEl: HTMLElement,
  ): void {
    if (config.onOpen?.() === false) return;
    const stack = this._inlinePanelStack;
    if (!stack) return;

    const entryId = `hpop-inline-${++_inlineIdCounter}`;
    const hostEl = document.createElement('div');

    if (isPopoverInlineConfig(config)) {
      const hasBackButton = config.hasBackButton !== false;
      const isClosable = config.isClosable !== false;
      const popover = ArvoPopover.initialize(hostEl, {
        isInline: true,
        variant: 'edge',
        title: config.title ?? '',
        hasHeader: !!(config.title || hasBackButton || isClosable),
        isClosable,
        hasBackButton,
        content: config.content,
        actions: config.actions,
        isInteractive: true,
        onBack: () => {
          config.onBack?.();
          this._popInlinePanel('back');
        },
        onClose: () => {
          if (config.onClose?.() === false) return false;
          this._closeAllInlinePanels();
          return false;
        },
      });
      this._inlinePanelInstances.set(entryId, popover);
      const pushed = stack.push({
        id: entryId,
        kind: 'popover',
        element: hostEl,
        openedFrom: sourceEl,
        onBack: () => config.onBack?.(),
        onClose: () => (config.onClose?.() === false ? false : undefined),
      });
      if (!pushed) {
        this._destroyInlineInstance(entryId);
        return;
      }
      popover.open();
      return;
    }

    const hybridCfg = config as HybridPopoverInlineConfig;
    const hybrid = ArvoHybridPopover.initialize(hostEl, {
      isInline: true,
      parent: this._options.parent ?? this._id,
      title: hybridCfg.title ?? '',
      variant: hybridCfg.variant ?? 'multi',
      items: hybridCfg.items ?? [],
      hasBackButton: hybridCfg.hasBackButton !== false,
      isClosable: true,
      onBack: () => {
        hybridCfg.onBack?.();
        this._popInlinePanel('back');
      },
      onClose: () => {
        if (hybridCfg.onClose?.() === false) return false;
        this._closeAllInlinePanels();
        return false;
      },
    });
    this._inlinePanelInstances.set(entryId, hybrid);
    const pushed = stack.push({
      id: entryId,
      kind: 'hybrid',
      element: hostEl,
      openedFrom: sourceEl,
      onBack: () => hybridCfg.onBack?.(),
      onClose: () => (hybridCfg.onClose?.() === false ? false : undefined),
    });
    if (!pushed) {
      this._destroyInlineInstance(entryId);
      return;
    }
    hybrid.open();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _fireChange(
    value: string[] | string | null,
    meta: HybridPopoverChangeMeta,
  ): void {
    this._options.onChange?.(cloneValue(value), meta);
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._trigger?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail }),
    );
  }
}

export default ArvoHybridPopover;
