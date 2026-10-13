import {
  aggregateSelectionState,
  createSortableList,
  nextSelectionForRangeShift,
  type AggregateSelectionState,
} from '@arvo/core';
import {
  attachTitleTruncationTooltip,
  type TitleTruncationHandle,
} from '@arvo/utils';
import { ArvoIconButton, type ArvoIconButtonOptions } from '../IconButton/IconButton';
import { ArvoCheckbox } from '../Checkbox/Checkbox';
import { ArvoRadio } from '../Radio/Radio';
import { ArvoBadge, type ArvoBadgeOptions, type ArvoBadgeSemanticType } from '../Badge/Badge';
import { ArvoAvatar, type ArvoAvatarOptions } from '../Avatar/Avatar';
import { ArvoStatus, type ArvoStatusType } from '../Status/Status';
import { ArvoEmptyState } from '../EmptyState/EmptyState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LIST_MAX_ROW_ACTIONS = 4;

// ---------------------------------------------------------------------------
// Public types (mirrors @arvo/react)
// ---------------------------------------------------------------------------

export type ArvoListVariant = 'standard' | 'rich';
export type ArvoListSelectionMode = 'none' | 'single' | 'multi';
export type ArvoListActionsVisibility = 'hover' | 'always';

export interface ArvoListItemAvatarConfig {
  variant?: ArvoAvatarOptions['variant'];
  name?: string;
  src?: string;
  icon?: string;
  colorMode?: ArvoAvatarOptions['colorMode'];
  semanticType?: ArvoAvatarOptions['semanticType'];
  customColor?: ArvoAvatarOptions['customColor'];
  tooltip?: string;
}

export interface ArvoListItemBadgeConfig {
  message: string;
  semanticType?: ArvoBadgeSemanticType;
  variant?: ArvoBadgeOptions['variant'];
  appearance?: 'subtle' | 'filled';
  customColor?: ArvoBadgeOptions['customColor'];
  colorMode?: ArvoBadgeOptions['colorMode'];
}

export interface ArvoListItemStatusConfig {
  type: ArvoStatusType;
  icon?: string;
  tooltip?: string;
}

export interface ArvoListItemAction {
  id: string;
  icon: string;
  tooltip: string;
  onClick?: (detail: {
    itemId: string;
    actionId: string;
    item: ArvoListItemData;
    event: Event;
  }) => void;
  isDisabled?: boolean;
  isDanger?: boolean;
}

export interface ArvoListItemData {
  id: string;
  label: string;
  secondaryLabel?: string;
  icon?: string;
  avatar?: ArvoListItemAvatarConfig | null;
  badge?: ArvoListItemBadgeConfig | null;
  isSelected?: boolean;
  isChecked?: boolean;
  isIndeterminate?: boolean;
  isExcluded?: boolean;
  isDisabled?: boolean;
  isReorderable?: boolean;
  isLoading?: boolean;
  isSearchMatch?: boolean;
  matchFragment?: string;
  hasInlineNav?: boolean;
  hasContextMenu?: boolean;
  actions?: ArvoListItemAction[];
  status?: ArvoListItemStatusConfig | null;
  tooltip?: string;
  data?: unknown;
  avatarProps?: Partial<Pick<ArvoAvatarOptions, 'appearance' | 'isInteractive' | 'alt'>>;
  badgeProps?: Partial<Pick<ArvoBadgeOptions, 'tooltip' | 'customColor' | 'colorMode'>>;
  iconButtonProps?: Partial<Pick<ArvoIconButtonOptions, 'tooltip'>>;
}

export interface ArvoListGroup {
  id: string;
  label?: string;
  items: ArvoListItemData[];
  hasSelectAll?: boolean;
  isCollapsed?: boolean;
}

export interface ArvoListEmptyState {
  illustration?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export interface ArvoListReorderDetail {
  item: ArvoListItemData;
  fromIndex: number;
  toIndex: number;
  fromGroupId: string | null;
  toGroupId: string | null;
}

export interface ArvoListOptions {
  variant?: ArvoListVariant;
  selectionMode?: ArvoListSelectionMode;
  items?: ArvoListItemData[];
  groups?: ArvoListGroup[];
  selectedIds?: string[] | string | null;
  excludedIds?: string[];
  isLoading?: boolean;
  skeletonRows?: number;
  isEmpty?: boolean;
  emptyState?: ArvoListEmptyState | null;
  hasGroupDividers?: boolean;
  hasGlobalSelectAll?: boolean;
  globalSelectAllLabel?: string;
  isReorderable?: boolean;
  /**
   * When `isReorderable` is true and the list is grouped, allow drag-reorder
   * across group boundaries. Defaults to `false` (drag is constrained to the
   * source group).
   */
  crossGroupReorder?: boolean;
  actionsVisibility?: ArvoListActionsVisibility;
  searchQuery?: string;
  isDisabled?: boolean;
  width?: string;
  ariaLabel?: string;
  onSelectionChange?: (detail: {
    selectedIds: string[] | string | null;
    items: ArvoListItemData[];
  }) => void;
  onExclusionChange?: (detail: { excludedIds: string[]; items: ArvoListItemData[] }) => void;
  onItemClick?: (detail: { id: string; item: ArvoListItemData; event: Event }) => void;
  onItemActivate?: (detail: { id: string; item: ArvoListItemData; event: Event }) => void;
  onReorder?: (detail: ArvoListReorderDetail) => void;
  onReorderCancel?: (detail: { id: string; item: ArvoListItemData }) => void;
  onItemContextMenu?: (detail: {
    id: string;
    item: ArvoListItemData;
    event: Event;
    anchorElement: HTMLElement | null;
  }) => void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type RequiredOptions = Required<
  Omit<
    ArvoListOptions,
    | 'items'
    | 'groups'
    | 'selectedIds'
    | 'excludedIds'
    | 'emptyState'
    | 'searchQuery'
    | 'width'
    | 'ariaLabel'
    | 'onSelectionChange'
    | 'onExclusionChange'
    | 'onItemClick'
    | 'onItemActivate'
    | 'onReorder'
    | 'onReorderCancel'
    | 'onItemContextMenu'
  >
> & {
  items: ArvoListItemData[];
  groups: ArvoListGroup[] | null;
  selectedIds: string[];
  excludedIds: string[];
  emptyState: ArvoListEmptyState | null;
  searchQuery: string | null;
  width: string | null;
  ariaLabel: string | null;
  onSelectionChange: ArvoListOptions['onSelectionChange'] | null;
  onExclusionChange: ArvoListOptions['onExclusionChange'] | null;
  onItemClick: ArvoListOptions['onItemClick'] | null;
  onItemActivate: ArvoListOptions['onItemActivate'] | null;
  onReorder: ArvoListOptions['onReorder'] | null;
  onReorderCancel: ArvoListOptions['onReorderCancel'] | null;
  onItemContextMenu: ArvoListOptions['onItemContextMenu'] | null;
};

interface ItemEntry {
  data: ArvoListItemData;
  rootEl: HTMLDivElement;
  labelEl: HTMLSpanElement | null;
  checkboxInst: ArvoCheckbox | null;
  radioInst: ArvoRadio | null;
  avatarInst: ArvoAvatar | null;
  badgeInst: ArvoBadge | null;
  statusInst: ArvoStatus | null;
  actionButtons: ArvoIconButton[];
  chevButton: ArvoIconButton | null;
  tooltipHandle: TitleTruncationHandle | null;
}

interface GroupBlock {
  group: { id: string; label?: string; items: ArvoListItemData[]; hasSelectAll?: boolean };
  bodyEl: HTMLDivElement;
  saInst: ArvoCheckbox | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeGroups(
  items: ArvoListItemData[],
  groups: ArvoListGroup[] | null,
): { id: string; label?: string; items: ArvoListItemData[]; hasSelectAll?: boolean }[] {
  if (groups && groups.length > 0) return groups.map((g) => ({ ...g }));
  return [{ id: '__default', items }];
}

function selectionToArray(selected: string[] | string | null | undefined): string[] {
  if (Array.isArray(selected)) return [...selected];
  if (typeof selected === 'string') return [selected];
  return [];
}

function arrayToSelection(
  arr: readonly string[],
  selectionMode: ArvoListSelectionMode,
): string[] | string | null {
  if (selectionMode === 'single') return arr[0] ?? null;
  if (selectionMode === 'multi') return [...arr];
  return null;
}

function splitLabelForMatch(
  label: string,
  fragment: string | null | undefined,
): { before: string; match: string; after: string } | null {
  if (!fragment) return null;
  const idx = label.toLowerCase().indexOf(fragment.toLowerCase());
  if (idx < 0) return null;
  return {
    before: label.slice(0, idx),
    match: label.slice(idx, idx + fragment.length),
    after: label.slice(idx + fragment.length),
  };
}

function isBadgeFilled(
  appearance: 'subtle' | 'filled' | undefined,
): 'filled' | 'primary' {
  return appearance === 'filled' ? 'filled' : 'primary';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoList {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;

  private _bodyEl: HTMLDivElement | null = null;
  private _liveEl: HTMLDivElement | null = null;
  private _saInst: ArvoCheckbox | null = null;
  private _emptyInst: ArvoEmptyState | null = null;
  private _entries: ItemEntry[] = [];
  private _groupBlocks: GroupBlock[] = [];
  private _selectionAnchorId: string | null = null;
  private _activeId: string | null = null;
  private _draggingId: string | null = null;
  private _sortableHandle: ReturnType<typeof createSortableList> | null = null;

  private _boundHandleKeyDown: (e: KeyboardEvent) => void;

  static readonly VARIANTS = ['standard', 'rich'] as const;
  static readonly SELECTION_MODES = ['none', 'single', 'multi'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    variant: 'standard',
    selectionMode: 'none',
    items: [],
    groups: null,
    selectedIds: [],
    excludedIds: [],
    isLoading: false,
    skeletonRows: 6,
    isEmpty: false,
    emptyState: null,
    hasGroupDividers: true,
    hasGlobalSelectAll: false,
    globalSelectAllLabel: 'Select all',
    isReorderable: false,
    crossGroupReorder: false,
    actionsVisibility: 'hover',
    searchQuery: null,
    isDisabled: false,
    width: null,
    ariaLabel: null,
    onSelectionChange: null,
    onExclusionChange: null,
    onItemClick: null,
    onItemActivate: null,
    onReorder: null,
    onReorderCancel: null,
    onItemContextMenu: null,
  };

  static initialize(element: HTMLElement, options?: ArvoListOptions): ArvoList {
    return new ArvoList(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoListOptions) {
    this._element = element;

    const variant =
      options?.variant && (ArvoList.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoList.DEFAULTS.variant;
    const selectionMode =
      options?.selectionMode &&
      (ArvoList.SELECTION_MODES as readonly string[]).includes(options.selectionMode)
        ? options.selectionMode
        : ArvoList.DEFAULTS.selectionMode;

    this._options = {
      ...ArvoList.DEFAULTS,
      ...options,
      variant,
      selectionMode,
      items: options?.items ? options.items.map((i) => ({ ...i })) : [],
      groups: options?.groups ? options.groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i })) })) : null,
      selectedIds: selectionToArray(options?.selectedIds),
      excludedIds: options?.excludedIds ? [...options.excludedIds] : [],
      emptyState: options?.emptyState ?? null,
      searchQuery: options?.searchQuery ?? null,
      width: options?.width ?? null,
      ariaLabel: options?.ariaLabel ?? null,
      onSelectionChange: options?.onSelectionChange ?? null,
      onExclusionChange: options?.onExclusionChange ?? null,
      onItemClick: options?.onItemClick ?? null,
      onItemActivate: options?.onItemActivate ?? null,
      onReorder: options?.onReorder ?? null,
      onReorderCancel: options?.onReorderCancel ?? null,
      onItemContextMenu: options?.onItemContextMenu ?? null,
    };

    this._boundHandleKeyDown = this._handleKeyDown.bind(this);

    this._render();
    this._bindEvents();
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  private _flatItems(): ArvoListItemData[] {
    if (this._options.groups) return this._options.groups.flatMap((g) => g.items);
    return this._options.items;
  }

  private _enabledIds(): string[] {
    return this._flatItems()
      .filter((i) => !i.isDisabled)
      .map((i) => i.id);
  }

  private _resolveTabStopId(): string | null {
    const enabled = this._enabledIds();
    if (this._activeId && enabled.includes(this._activeId)) return this._activeId;
    for (const id of this._options.selectedIds) {
      if (enabled.includes(id)) return id;
    }
    return enabled[0] ?? null;
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    this._destroyInstances({ preserveLiveRegion: true });
    this._entries = [];
    this._groupBlocks = [];
    this._sortableHandle?.destroy();
    this._sortableHandle = null;

    const opts = this._options;

    // Root class + ARIA
    el.classList.add(
      'arvo-list',
      `arvo-list--${opts.variant}`,
      `arvo-list--${opts.selectionMode}`,
    );
    el.classList.toggle('arvo-list--reorderable', !!opts.isReorderable);
    el.classList.toggle('arvo-list--actions-always', opts.actionsVisibility === 'always');
    el.classList.toggle('is-disabled', !!opts.isDisabled);

    const rootRole =
      opts.selectionMode === 'multi'
        ? 'listbox'
        : opts.selectionMode === 'single'
          ? 'radiogroup'
          : 'list';
    el.setAttribute('role', rootRole);
    if (opts.selectionMode === 'multi') el.setAttribute('aria-multiselectable', 'true');
    else el.removeAttribute('aria-multiselectable');
    if (opts.isDisabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
    if (opts.ariaLabel) el.setAttribute('aria-label', opts.ariaLabel);
    if (opts.width) el.style.setProperty('--arvo-list-width', opts.width);

    // Render branches: loading > empty > normal
    if (opts.isLoading) {
      this._renderLoading();
      this._renderLiveRegion();
      return;
    }

    const flat = this._flatItems();
    const showEmpty = (opts.isEmpty || flat.length === 0) && !!opts.emptyState;
    if (showEmpty) {
      // Empty state: ArvoEmptyState carries role="status" which would violate
      // aria-required-children when nested inside listbox/radiogroup/list.
      // Drop the role + aria-multiselectable for the empty branch since
      // there is nothing to enumerate.
      el.removeAttribute('role');
      el.removeAttribute('aria-multiselectable');
      this._renderEmpty();
      this._renderLiveRegion();
      return;
    }

    el.classList.remove('loading', 'is-empty');

    // Global select-all row
    if (opts.hasGlobalSelectAll && opts.selectionMode === 'multi') {
      this._renderGlobalSelectAll();
    }

    // Groups + items
    const groups = normalizeGroups(opts.items, opts.groups);
    const tabStopId = this._resolveTabStopId();

    groups.forEach((group, idx) => {
      // Divider between groups
      if (idx > 0 && opts.hasGroupDividers) {
        const divider = document.createElement('div');
        divider.className = 'arvo-list__divider';
        divider.setAttribute('role', 'presentation');
        divider.setAttribute('aria-hidden', 'true');
        el.appendChild(divider);
      }

      const groupEl = document.createElement('div');
      groupEl.className = 'arvo-list__group';
      groupEl.setAttribute('data-arvo-list-group-id', group.id);
      el.appendChild(groupEl);

      if (group.label) {
        const hdr = document.createElement('div');
        hdr.className = 'arvo-list__group-hdr';
        hdr.setAttribute('role', 'presentation');
        hdr.textContent = group.label;
        groupEl.appendChild(hdr);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'arvo-list__group-body';
      groupEl.appendChild(bodyEl);

      let saInst: ArvoCheckbox | null = null;
      if (group.hasSelectAll && opts.selectionMode === 'multi') {
        const saRow = document.createElement('div');
        saRow.className = 'arvo-list__sa';
        saRow.setAttribute('role', 'option');
        saRow.tabIndex = -1;
        // Match the global SA spacer behavior so the per-group SA checkbox
        // aligns x-coord with items behind a drag handle.
        if (opts.isReorderable) {
          const spacer = document.createElement('span');
          spacer.className = 'arvo-list-item__drag-spacer';
          spacer.setAttribute('aria-hidden', 'true');
          saRow.appendChild(spacer);
        }
        const checkSlot = document.createElement('span');
        checkSlot.className = 'arvo-list-item__check';
        const cbHost = document.createElement('div');
        checkSlot.appendChild(cbHost);
        saInst = ArvoCheckbox.initialize(cbHost, {
          isChecked: false,
          isIndeterminate: false,
          isDisabled: opts.isDisabled,
        });
        cbHost.setAttribute('aria-hidden', 'true');
        cbHost.querySelectorAll('input').forEach((input) => input.setAttribute('tabindex', '-1'));
        const lbl = document.createElement('span');
        lbl.className = 'arvo-list__sa__lbl';
        lbl.textContent = opts.globalSelectAllLabel;
        saRow.appendChild(checkSlot);
        saRow.appendChild(lbl);
        saRow.addEventListener('click', () => this._handleGroupSelectAllToggle(group.id));
        saRow.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this._handleGroupSelectAllToggle(group.id);
          }
        });
        bodyEl.appendChild(saRow);
      }

      this._groupBlocks.push({ group, bodyEl, saInst });

      for (const item of group.items) {
        const entry = this._createItemEntry(item, item.id === tabStopId);
        bodyEl.appendChild(entry.rootEl);
        this._entries.push(entry);
      }
    });

    this._renderLiveRegion();
    this._syncSelectionAttributes();
    this._syncGroupSelectAllStates();
    this._lockActionsWidth();
    this._attachTruncationTooltips();
    this._initSortable();
  }

  private _renderLoading(): void {
    const el = this._element;
    if (!el) return;
    el.classList.add('loading');
    el.setAttribute('aria-busy', 'true');
    const skelStack = document.createElement('div');
    skelStack.className = 'arvo-list__skeleton';
    skelStack.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < this._options.skeletonRows; i += 1) {
      const row = document.createElement('div');
      row.className = 'arvo-list__skeleton-row';
      skelStack.appendChild(row);
    }
    el.appendChild(skelStack);
  }

  private _renderEmpty(): void {
    const el = this._element;
    if (!el || !this._options.emptyState) return;
    el.classList.add('is-empty');
    el.classList.remove('loading');
    el.removeAttribute('aria-busy');
    const wrap = document.createElement('div');
    wrap.className = 'arvo-list__empty';
    const host = document.createElement('div');
    wrap.appendChild(host);
    const empty = this._options.emptyState;
    this._emptyInst = ArvoEmptyState.initialize(host, {
      size: 'md',
      illustration: empty.illustration ?? 'no-results-found',
      title: empty.title,
      message: empty.description,
      primaryAction: empty.ctaLabel
        ? {
            label: empty.ctaLabel,
            variant: 'outline',
            onClick: () => empty.onCtaClick?.(),
          }
        : undefined,
    });
    el.appendChild(wrap);
  }

  private _renderGlobalSelectAll(): void {
    const el = this._element;
    if (!el) return;
    const saRow = document.createElement('div');
    saRow.className = 'arvo-list__sa';
    saRow.setAttribute('role', 'option');
    saRow.tabIndex = -1;
    // When the list is reorderable, reserve a 16px drag-spacer slot at the
    // start of the SA row so its checkbox aligns x-coord with items that
    // sit behind a drag handle.
    if (this._options.isReorderable) {
      const spacer = document.createElement('span');
      spacer.className = 'arvo-list-item__drag-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      saRow.appendChild(spacer);
    }
    const checkSlot = document.createElement('span');
    checkSlot.className = 'arvo-list-item__check';
    const cbHost = document.createElement('div');
    checkSlot.appendChild(cbHost);
    this._saInst = ArvoCheckbox.initialize(cbHost, {
      isChecked: false,
      isIndeterminate: false,
      isDisabled: this._options.isDisabled,
    });
    cbHost.setAttribute('aria-hidden', 'true');
    cbHost.querySelectorAll('input').forEach((input) => input.setAttribute('tabindex', '-1'));
    const lbl = document.createElement('span');
    lbl.className = 'arvo-list__sa__lbl';
    lbl.textContent = this._options.globalSelectAllLabel;
    saRow.appendChild(checkSlot);
    saRow.appendChild(lbl);
    saRow.addEventListener('click', () => this._handleGlobalSelectAllToggle());
    saRow.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this._handleGlobalSelectAllToggle();
      }
    });
    el.appendChild(saRow);
  }

  private _createItemEntry(item: ArvoListItemData, isTabStop: boolean): ItemEntry {
    const opts = this._options;
    const isChecked = item.isChecked ?? opts.selectedIds.includes(item.id);
    const isExcluded = item.isExcluded ?? opts.excludedIds.includes(item.id);
    const itemDisabled = opts.isDisabled || !!item.isDisabled;
    const itemLoading = item.isLoading === true;
    // Disabled rows drop the drag handle entirely (spec section 5.3).
    const itemReorderable =
      opts.isReorderable && (item.isReorderable ?? true) && !itemLoading && !itemDisabled;
    const itemSearchMatch =
      item.isSearchMatch ??
      (opts.searchQuery
        ? item.label.toLowerCase().includes(opts.searchQuery.toLowerCase())
        : false);
    const matchFragment = item.matchFragment ?? opts.searchQuery ?? null;

    const rootEl = document.createElement('div');
    const role =
      opts.selectionMode === 'multi'
        ? 'option'
        : opts.selectionMode === 'single'
          ? 'radio'
          : 'listitem';
    rootEl.setAttribute('role', role);
    rootEl.setAttribute('data-arvo-list-item-id', item.id);
    rootEl.tabIndex = isTabStop ? 0 : -1;
    rootEl.className = [
      'arvo-list-item',
      `arvo-list-item--${opts.variant}`,
      `arvo-list-item--${opts.selectionMode}`,
      item.isSelected ? 'active' : '',
      itemDisabled ? 'is-disabled' : '',
      itemLoading ? 'is-loading' : '',
      isExcluded && opts.selectionMode === 'multi' ? 'is-excluded' : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (itemDisabled) rootEl.setAttribute('aria-disabled', 'true');
    if (itemLoading) rootEl.setAttribute('aria-busy', 'true');
    if (item.isSelected) rootEl.setAttribute('aria-current', 'true');

    // Pattern-B per-row skeleton replaces inner content with a shimmer bar.
    if (itemLoading) {
      const skel = document.createElement('span');
      skel.className = 'arvo-list-item__skel';
      skel.setAttribute('aria-hidden', 'true');
      rootEl.appendChild(skel);
      return {
        data: item,
        rootEl,
        labelEl: null,
        checkboxInst: null,
        radioInst: null,
        avatarInst: null,
        badgeInst: null,
        statusInst: null,
        actionButtons: [],
        chevButton: null,
        tooltipHandle: null,
      };
    }

    // ARIA selection state
    if (opts.selectionMode === 'multi') {
      rootEl.setAttribute('aria-selected', String(!!isChecked));
      if (item.isIndeterminate) rootEl.setAttribute('aria-checked', 'mixed');
      else rootEl.setAttribute('aria-checked', String(!!isChecked));
    } else if (opts.selectionMode === 'single') {
      rootEl.setAttribute('aria-checked', String(!!isChecked));
    }

    if (item.tooltip) rootEl.setAttribute('aria-label', item.tooltip);

    // Leading: drag handle / spacer.
    // Render the active handle when the parent + per-row are both reorderable
    // AND the row isn't disabled / loading. Otherwise, when the parent list
    // IS reorderable, render an invisible 16px spacer so the row's selection
    // control column stays aligned with reorderable peers (covers
    // item.isReorderable === false AND item.isDisabled paths).
    if (itemReorderable) {
      const drag = document.createElement('span');
      drag.className = 'arvo-list-item__drag';
      drag.setAttribute('data-arvo-drag-handle', 'true');
      const ico = document.createElement('span');
      ico.className = 'arvo-ico o9con o9con-drag-handle';
      ico.setAttribute('aria-hidden', 'true');
      drag.appendChild(ico);
      rootEl.appendChild(drag);
    } else if (opts.isReorderable) {
      const spacer = document.createElement('span');
      spacer.className = 'arvo-list-item__drag-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      rootEl.appendChild(spacer);
    }

    // Selection control or leading icon
    let checkboxInst: ArvoCheckbox | null = null;
    let radioInst: ArvoRadio | null = null;
    if (opts.selectionMode === 'multi') {
      const slot = document.createElement('span');
      slot.className = 'arvo-list-item__check';
      const host = document.createElement('div');
      slot.appendChild(host);
      checkboxInst = ArvoCheckbox.initialize(host, {
        isChecked: !!isChecked && !item.isIndeterminate,
        isIndeterminate: !!item.isIndeterminate,
        isDisabled: itemDisabled,
      });
      host.setAttribute('aria-hidden', 'true');
      // Embedded native <input> is focusable by default; opt out so the row
      // remains the single focus stop and axe stays happy.
      host.querySelectorAll('input').forEach((input) => input.setAttribute('tabindex', '-1'));
      rootEl.appendChild(slot);
    } else if (opts.selectionMode === 'single') {
      const slot = document.createElement('span');
      slot.className = 'arvo-list-item__check';
      const host = document.createElement('div');
      slot.appendChild(host);
      radioInst = ArvoRadio.initialize(host, {
        value: item.id,
        name: '__arvo-list-radio',
        isChecked: !!isChecked,
        isDisabled: itemDisabled,
      });
      host.setAttribute('aria-hidden', 'true');
      host.querySelectorAll('input').forEach((input) => input.setAttribute('tabindex', '-1'));
      rootEl.appendChild(slot);
    } else if (item.icon) {
      const ico = document.createElement('span');
      ico.className = `arvo-list-item__ico o9con o9con-${item.icon}`;
      ico.setAttribute('aria-hidden', 'true');
      rootEl.appendChild(ico);
    }

    // Avatar (rich variant only)
    let avatarInst: ArvoAvatar | null = null;
    if (opts.variant === 'rich' && item.avatar) {
      const avtWrap = document.createElement('span');
      avtWrap.className = 'arvo-list-item__avt';
      const avtHost = document.createElement('div');
      avtWrap.appendChild(avtHost);
      avatarInst = ArvoAvatar.initialize(avtHost, {
        ...(item.avatarProps ?? {}),
        size: 'sm',
        variant: item.avatar.variant,
        name: item.avatar.name,
        src: item.avatar.src,
        icon: item.avatar.icon,
        colorMode: item.avatar.colorMode,
        semanticType: item.avatar.semanticType,
        customColor: item.avatar.customColor,
        tooltip: item.avatar.tooltip,
      });
      rootEl.appendChild(avtWrap);
    }

    // Label block
    const txtEl = document.createElement('span');
    txtEl.className = 'arvo-list-item__txt';
    const labelEl = document.createElement('span');
    labelEl.className = 'arvo-list-item__lbl';

    const split = itemSearchMatch ? splitLabelForMatch(item.label, matchFragment) : null;
    if (split) {
      labelEl.appendChild(document.createTextNode(split.before));
      const matchSpan = document.createElement('span');
      matchSpan.className = 'arvo-list-item__match';
      matchSpan.textContent = split.match;
      labelEl.appendChild(matchSpan);
      labelEl.appendChild(document.createTextNode(split.after));
    } else {
      labelEl.textContent = item.label;
    }

    txtEl.appendChild(labelEl);
    if (opts.variant === 'rich' && item.secondaryLabel) {
      const sec = document.createElement('span');
      sec.className = 'arvo-list-item__secondary';
      sec.textContent = item.secondaryLabel;
      txtEl.appendChild(sec);
    }
    rootEl.appendChild(txtEl);

    // Trailing: exclude marker
    if (isExcluded && opts.selectionMode === 'multi') {
      const exc = document.createElement('span');
      exc.className = 'arvo-list-item__exclude';
      exc.setAttribute('aria-hidden', 'true');
      const ico = document.createElement('span');
      ico.className = 'o9con o9con-exclude';
      exc.appendChild(ico);
      rootEl.appendChild(exc);
    }

    // Trailing: badge
    let badgeInst: ArvoBadge | null = null;
    if (item.badge) {
      const slot = document.createElement('span');
      slot.className = 'arvo-list-item__badge';
      const host = document.createElement('div');
      slot.appendChild(host);
      badgeInst = ArvoBadge.initialize(host, {
        ...(item.badgeProps ?? {}),
        size: 'sm',
        variant: item.badge.variant ?? 'label',
        appearance: isBadgeFilled(item.badge.appearance),
        semanticType: item.badge.semanticType ?? 'neutral',
        message: item.badge.message,
        hasBadgeIcon: false,
        customColor: item.badge.customColor,
        colorMode: item.badge.colorMode,
      });
      rootEl.appendChild(slot);
    }

    // Trailing: actions cluster
    const actionButtons: ArvoIconButton[] = [];
    let statusInst: ArvoStatus | null = null;
    const cappedActions = (item.actions ?? []).slice(0, LIST_MAX_ROW_ACTIONS);
    if ((item.actions ?? []).length > LIST_MAX_ROW_ACTIONS && process.env.NODE_ENV !== 'production') {
       
      console.warn(
        `[ArvoList] More than ${LIST_MAX_ROW_ACTIONS} actions provided on item "${item.id}" (got ${(item.actions ?? []).length}). Extras are truncated.`,
      );
    }
    const showActionsCluster = cappedActions.length > 0 || !!item.status;
    if (showActionsCluster) {
      const cluster = document.createElement('span');
      cluster.className = 'arvo-list-item__actions';
      cluster.setAttribute('data-arvo-actions-visibility', opts.actionsVisibility);

      if (item.status) {
        const stsHost = document.createElement('span');
        cluster.appendChild(stsHost);
        statusInst = ArvoStatus.initialize(stsHost, {
          type: item.status.type,
          size: 'sm',
          placement: 'inline',
          icon: item.status.icon,
          tooltip: item.status.tooltip,
        });
      }

      for (const action of cappedActions) {
        const btnHost = document.createElement('button');
        btnHost.type = 'button';
        btnHost.tabIndex = -1;
        const inst = ArvoIconButton.initialize(btnHost, {
          ...(item.iconButtonProps ?? {}),
          icon: action.icon,
          variant: action.isDanger ? 'danger-tertiary' : 'tertiary',
          size: 'sm',
          tooltip: action.tooltip,
          isDisabled: itemDisabled || !!action.isDisabled,
          onClick: (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            if (itemDisabled || action.isDisabled) return;
            action.onClick?.({ itemId: item.id, actionId: action.id, item, event: e });
            this._dispatchEvent('list-item:action', { id: item.id, actionId: action.id });
          },
        });
        actionButtons.push(inst);
        cluster.appendChild(btnHost);
      }

      rootEl.appendChild(cluster);
    }

    // Trailing: inline-nav chevron
    let chevButton: ArvoIconButton | null = null;
    if (item.hasInlineNav) {
      const slot = document.createElement('span');
      slot.className = 'arvo-list-item__chev';
      const btnHost = document.createElement('button');
      btnHost.type = 'button';
      btnHost.tabIndex = -1;
      slot.appendChild(btnHost);
      chevButton = ArvoIconButton.initialize(btnHost, {
        icon: 'angle-right',
        variant: 'tertiary',
        size: 'sm',
        tooltip: 'Navigate',
        isDisabled: itemDisabled,
        onClick: (e: Event) => {
          e.stopPropagation();
          if (itemDisabled) return;
          this._options.onItemActivate?.({ id: item.id, item, event: e });
          this._dispatchEvent('list:item-activate', { id: item.id });
        },
      });
      rootEl.appendChild(slot);
    }

    rootEl.addEventListener('click', (e) => this._handleRowClick(item, e));
    rootEl.addEventListener('keydown', (e) => this._handleRowKeyDown(item, e));
    if (item.hasContextMenu) {
      rootEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._options.onItemContextMenu?.({
          id: item.id,
          item,
          event: e,
          anchorElement: rootEl,
        });
      });
    }

    return {
      data: item,
      rootEl,
      labelEl,
      checkboxInst,
      radioInst,
      avatarInst,
      badgeInst,
      statusInst,
      actionButtons,
      chevButton,
      tooltipHandle: null,
    };
  }

  private _renderLiveRegion(): void {
    // The live region MUST live outside the role="listbox" / "radiogroup" /
    // "list" root because those roles only allow specific child roles per
    // WAI-ARIA. We attach it to document.body (matching createSortableList's
    // pattern) and tear it down in destroy().
    if (this._liveEl) return;
    const live = document.createElement('div');
    live.className = 'arvo-list__live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.style.cssText =
      'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(live);
    this._liveEl = live;
  }

  // ===========================================================================
  // Side-effects (truncation tooltips, actions-width reservation, drag)
  // ===========================================================================

  private _attachTruncationTooltips(): void {
    // Uses the shared `attachTitleTruncationTooltip` util (visual-only, no
    // `aria-describedby`, with a ResizeObserver so the tooltip toggles
    // correctly as the row resizes). Matches Button / Toast / BannerAlert /
    // AccordionItem. The full label is already in the row's accessible
    // name, so adding `aria-describedby` would cause AT double-announce.
    for (const entry of this._entries) {
      if (!entry.labelEl || !entry.rootEl) continue;
      const content = entry.data.tooltip ?? entry.data.label;
      if (!content) continue;
      entry.tooltipHandle = attachTitleTruncationTooltip({
        triggerElement: entry.rootEl,
        element: entry.labelEl,
        content,
        placement: 'top-center',
      });
    }
  }

  private _lockActionsWidth(): void {
    if (this._options.actionsVisibility !== 'hover') return;
    const root = this._element;
    if (!root) return;
    requestAnimationFrame(() => {
      const clusters = root.querySelectorAll<HTMLElement>('.arvo-list-item__actions');
      let max = 0;
      clusters.forEach((c) => {
        const w = c.offsetWidth;
        if (w > max) max = w;
      });
      root.style.setProperty('--arvo-list-item-actions-w', `${max + 8}px`);
    });
  }

  private _initSortable(): void {
    const root = this._element;
    if (!root || !this._options.isReorderable || this._options.isLoading || this._options.isDisabled) return;
    const flat = this._flatItems();
    // The sortable physically relocates the source row in the DOM as the
    // pointer moves; preview / commit visuals come from the sortable's own
    // `arvo-sortable--ghost` / `arvo-sortable--dragging` classes. We only
    // track the pickup id so onCancel + Escape know which item rolled back.
    this._sortableHandle = createSortableList(root, {
      itemSelector: '.arvo-list-item',
      handleSelector: '[data-arvo-drag-handle="true"]',
      getGroupOf: (item) =>
        item.closest<HTMLElement>('[data-arvo-list-group-id]')?.dataset.arvoListGroupId ?? null,
      allowCrossGroup: this._options.crossGroupReorder,
      onPreview: (fromIndex) => {
        const movedId = flat[fromIndex]?.id ?? null;
        const isNewDrag = this._draggingId !== movedId;
        this._draggingId = movedId;
        if (isNewDrag && movedId) {
          this._dispatchEvent('list:reorder-start', { id: movedId, fromIndex });
        }
      },
      onCommit: (fromIndex, toIndex, fromGroup, toGroup) => {
        const movedId = flat[fromIndex]?.id;
        const movedItem = movedId ? flat.find((i) => i.id === movedId) : null;
        this._draggingId = null;
        if (movedId && movedItem) {
          this._dispatchEvent('list:reorder', {
            id: movedId,
            fromIndex,
            toIndex,
            fromGroupId: fromGroup,
            toGroupId: toGroup,
          });
          this._options.onReorder?.({
            item: movedItem,
            fromIndex,
            toIndex,
            fromGroupId: fromGroup,
            toGroupId: toGroup,
          });
          this._announce(`Dropped ${movedItem.label} at position ${toIndex + 1}`);
        }
      },
      onCancel: () => {
        const cancelledId = this._draggingId;
        const cancelledItem = cancelledId ? flat.find((i) => i.id === cancelledId) : null;
        this._draggingId = null;
        if (cancelledId && cancelledItem) {
          this._dispatchEvent('list:reorder-cancel', { id: cancelledId });
          this._options.onReorderCancel?.({ id: cancelledId, item: cancelledItem });
          this._announce(`Drag cancelled, ${cancelledItem.label} returned to original position`);
        }
      },
    });
  }

  // ===========================================================================
  // Selection logic
  // ===========================================================================

  private _diffSelection(prev: string[], next: string[]): {
    addedId: string | null;
    removedId: string | null;
  } {
    const prevSet = new Set(prev);
    const nextSet = new Set(next);
    let addedId: string | null = null;
    let removedId: string | null = null;
    for (const id of next) if (!prevSet.has(id)) addedId = id;
    for (const id of prev) if (!nextSet.has(id)) removedId = id;
    return { addedId, removedId };
  }

  private _emitSelectionChange(next: string[]): void {
    const prev = this._options.selectedIds;
    const { addedId, removedId } = this._diffSelection(prev, next);
    this._options.selectedIds = next;
    this._syncSelectionAttributes();
    this._syncGroupSelectAllStates();
    const flat = this._flatItems();
    const detail = {
      selectedIds: arrayToSelection(next, this._options.selectionMode),
      items: flat,
    };
    this._dispatchEvent('list:select', {
      selectedIds: detail.selectedIds,
      addedId,
      removedId,
    });
    this._options.onSelectionChange?.(detail);
  }

  private _emitExclusionChange(next: string[]): void {
    const prev = this._options.excludedIds;
    const { addedId, removedId } = this._diffSelection(prev, next);
    this._options.excludedIds = next;
    this._syncSelectionAttributes();
    const flat = this._flatItems();
    this._dispatchEvent('list:exclude', { excludedIds: next, addedId, removedId });
    this._options.onExclusionChange?.({ excludedIds: next, items: flat });
  }

  private _toggleSelection(targetId: string, opts?: { rangeShift?: boolean }): void {
    const item = this._flatItems().find((i) => i.id === targetId);
    if (!item || item.isDisabled) return;
    const current = this._options.selectedIds;
    const mode = this._options.selectionMode;

    if (opts?.rangeShift && mode === 'multi') {
      const next = nextSelectionForRangeShift({
        selectedIds: current,
        orderedIds: this._flatItems().map((i) => i.id),
        anchorId: this._selectionAnchorId,
        targetId,
        disabledIds: this._flatItems().filter((i) => i.isDisabled).map((i) => i.id),
      });
      this._emitSelectionChange(next);
      this._selectionAnchorId = targetId;
      return;
    }

    if (mode === 'multi') {
      const set = new Set(current);
      if (set.has(targetId)) set.delete(targetId);
      else set.add(targetId);
      const next = [...set];
      this._emitSelectionChange(next);
      this._selectionAnchorId = targetId;
      this._announce(
        set.has(targetId) ? `${item.label}, selected` : `${item.label}, not selected`,
      );
    } else if (mode === 'single') {
      this._emitSelectionChange([targetId]);
      this._selectionAnchorId = targetId;
      this._announce(`${item.label}, selected`);
    }
  }

  private _handleGlobalSelectAllToggle(): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    if (this._options.selectionMode !== 'multi') return;
    const enabledIds = this._enabledIds();
    const aggregate = aggregateSelectionState(this._options.selectedIds, enabledIds);
    if (aggregate === 'all') {
      this._emitSelectionChange([]);
      this._announce('All items deselected');
    } else {
      this._emitSelectionChange([...enabledIds]);
      this._announce('All items selected');
    }
  }

  private _handleGroupSelectAllToggle(groupId: string): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    if (this._options.selectionMode !== 'multi') return;
    const group = this._groupBlocks.find((g) => g.group.id === groupId);
    if (!group) return;
    const groupEnabledIds = group.group.items
      .filter((i) => !i.isDisabled)
      .map((i) => i.id);
    const aggregate = aggregateSelectionState(this._options.selectedIds, groupEnabledIds);
    const current = new Set(this._options.selectedIds);
    if (aggregate === 'all') {
      groupEnabledIds.forEach((id) => current.delete(id));
    } else {
      groupEnabledIds.forEach((id) => current.add(id));
    }
    this._emitSelectionChange([...current]);
  }

  /**
   * Apply a boolean checked state to an embedded checkbox / radio by reaching
   * into the native input element. ArvoCheckbox / ArvoRadio expose `.checked()`
   * as a getter only -- their state is normally driven by user click. ArvoList
   * owns the toggle path and needs a programmatic setter, so we update the
   * underlying <input> directly.
   */
  private _syncInputChecked(
    slotEl: HTMLElement,
    isChecked: boolean,
    isIndeterminate?: boolean,
  ): void {
    const input = slotEl.querySelector<HTMLInputElement>('input');
    if (!input) return;
    input.checked = isChecked;
    input.indeterminate = !!isIndeterminate;
    if (isIndeterminate) input.setAttribute('data-indeterminate', 'true');
    else input.removeAttribute('data-indeterminate');
  }

  private _syncSelectionAttributes(): void {
    const mode = this._options.selectionMode;
    for (const entry of this._entries) {
      const id = entry.data.id;
      const isChecked =
        entry.data.isChecked ?? this._options.selectedIds.includes(id);
      const isExcluded =
        entry.data.isExcluded ?? this._options.excludedIds.includes(id);
      const slot = entry.rootEl.querySelector<HTMLElement>('.arvo-list-item__check');
      if (mode === 'multi') {
        entry.rootEl.setAttribute('aria-selected', String(!!isChecked));
        if (entry.data.isIndeterminate) entry.rootEl.setAttribute('aria-checked', 'mixed');
        else entry.rootEl.setAttribute('aria-checked', String(!!isChecked));
        if (slot) {
          this._syncInputChecked(
            slot,
            !!isChecked && !entry.data.isIndeterminate,
            !!entry.data.isIndeterminate,
          );
        }
      } else if (mode === 'single') {
        entry.rootEl.setAttribute('aria-checked', String(!!isChecked));
        if (slot) this._syncInputChecked(slot, !!isChecked);
      }
      entry.rootEl.classList.toggle('is-excluded', !!isExcluded && mode === 'multi');
    }
  }

  private _syncGroupSelectAllStates(): void {
    const enabledIds = this._enabledIds();
    const aggregateGlobal: AggregateSelectionState = aggregateSelectionState(
      this._options.selectedIds,
      enabledIds,
    );
    if (this._saInst) {
      const ariaRow = this._element?.querySelector<HTMLElement>(
        ':scope > .arvo-list__sa',
      );
      const slot = ariaRow?.querySelector<HTMLElement>('.arvo-list-item__check');
      if (slot) {
        this._syncInputChecked(
          slot,
          aggregateGlobal === 'all',
          aggregateGlobal === 'some',
        );
      }
      if (ariaRow) {
        ariaRow.setAttribute(
          'aria-checked',
          aggregateGlobal === 'all'
            ? 'true'
            : aggregateGlobal === 'some'
              ? 'mixed'
              : 'false',
        );
      }
    }
    for (const block of this._groupBlocks) {
      if (!block.saInst) continue;
      const groupEnabledIds = block.group.items
        .filter((i) => !i.isDisabled)
        .map((i) => i.id);
      const agg = aggregateSelectionState(this._options.selectedIds, groupEnabledIds);
      const ariaRow = block.bodyEl.querySelector<HTMLElement>('.arvo-list__sa');
      const slot = ariaRow?.querySelector<HTMLElement>('.arvo-list-item__check');
      if (slot) this._syncInputChecked(slot, agg === 'all', agg === 'some');
      if (ariaRow) {
        ariaRow.setAttribute(
          'aria-checked',
          agg === 'all' ? 'true' : agg === 'some' ? 'mixed' : 'false',
        );
      }
    }
  }

  // ===========================================================================
  // Event handlers
  // ===========================================================================

  private _bindEvents(): void {
    this._element?.addEventListener('keydown', this._boundHandleKeyDown);
  }

  private _unbindEvents(): void {
    this._element?.removeEventListener('keydown', this._boundHandleKeyDown);
  }

  private _handleRowClick(item: ArvoListItemData, e: MouseEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    if (item.isDisabled || item.isLoading) return;
    if (this._options.selectionMode !== 'none') this._toggleSelection(item.id);
    this._dispatchEvent('list:item-click', { id: item.id });
    this._options.onItemClick?.({ id: item.id, item, event: e });
  }

  private _handleRowKeyDown(item: ArvoListItemData, e: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    if (item.isDisabled || item.isLoading) return;
    if (
      item.hasContextMenu &&
      ((e.key === 'F10' && e.shiftKey) ||
        (e.shiftKey && e.ctrlKey && e.key.toUpperCase() === 'X'))
    ) {
      e.preventDefault();
      this._options.onItemContextMenu?.({
        id: item.id,
        item,
        event: e,
        anchorElement: this._entries.find((en) => en.data.id === item.id)?.rootEl ?? null,
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this._options.selectionMode !== 'none') this._toggleSelection(item.id);
      this._dispatchEvent('list:item-click', { id: item.id });
      this._options.onItemClick?.({ id: item.id, item, event: e });
    } else if (e.key === ' ' && !e.shiftKey) {
      e.preventDefault();
      if (this._options.selectionMode !== 'none') this._toggleSelection(item.id);
      this._dispatchEvent('list:item-click', { id: item.id });
      this._options.onItemClick?.({ id: item.id, item, event: e });
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const enabled = this._enabledIds();
    if (enabled.length === 0) return;

    if (
      this._options.selectionMode === 'multi' &&
      (e.metaKey || e.ctrlKey) &&
      e.key.toLowerCase() === 'a' &&
      !e.shiftKey
    ) {
      e.preventDefault();
      this._emitSelectionChange([...enabled]);
      this._announce('All items selected');
      return;
    }

    const activeRowId = this._activeId ?? this._resolveTabStopId();
    const currentIdx = activeRowId ? enabled.indexOf(activeRowId) : -1;

    let nextIdx: number | null = null;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % enabled.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIdx =
          currentIdx < 0
            ? enabled.length - 1
            : (currentIdx - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = enabled.length - 1;
        break;
      case ' ':
        if (e.shiftKey && this._options.selectionMode === 'multi' && activeRowId) {
          e.preventDefault();
          this._toggleSelection(activeRowId, { rangeShift: true });
        }
        return;
      case 'Escape':
        if (this._draggingId && this._sortableHandle) {
          // createSortableList honors Escape internally; nothing additional.
        }
        return;
      default:
        return;
    }

    if (nextIdx !== null) {
      const nextId = enabled[nextIdx];
      this._activeId = nextId;
      const entry = this._entries.find((en) => en.data.id === nextId);
      entry?.rootEl.focus();
      // Roving tabindex + focused-class update.
      for (const en of this._entries) {
        const isActive = en.data.id === nextId;
        en.rootEl.tabIndex = isActive ? 0 : -1;
        en.rootEl.classList.toggle('focused', isActive);
      }
    }
  }

  private _announce(msg: string): void {
    const live = this._liveEl;
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => {
      if (this._liveEl) this._liveEl.textContent = msg;
    });
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    if (!this._element) return;
    this._element.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  selected(): string[] | string | null;
  selected(ids: string[] | string | null): void;
  selected(ids?: string[] | string | null): string[] | string | null | void {
    if (arguments.length === 0) {
      return arrayToSelection(this._options.selectedIds, this._options.selectionMode);
    }
    const arr = selectionToArray(ids);
    this._emitSelectionChange(arr);
  }

  excluded(): string[];
  excluded(ids: string[]): void;
  excluded(ids?: string[]): string[] | void {
    if (arguments.length === 0) return [...this._options.excludedIds];
    this._emitExclusionChange(ids ?? []);
  }

  setItems(items: ArvoListItemData[] | ArvoListGroup[]): void {
    // Detect the shape: a group is { id, items: [...] }.
    if (
      Array.isArray(items) &&
      items.length > 0 &&
      'items' in (items[0] as object)
    ) {
      this._options.groups = (items as ArvoListGroup[]).map((g) => ({
        ...g,
        items: g.items.map((i) => ({ ...i })),
      }));
      this._options.items = [];
    } else {
      this._options.items = (items as ArvoListItemData[]).map((i) => ({ ...i }));
      this._options.groups = null;
    }
    this._options.selectedIds = this._options.selectedIds.filter((id) =>
      this._flatItems().some((i) => i.id === id),
    );
    this._render();
  }

  addItem(item: ArvoListItemData, index?: number, groupId?: string): void {
    if (this._options.groups) {
      const target =
        this._options.groups.find((g) => g.id === groupId) ??
        this._options.groups[this._options.groups.length - 1];
      const next = [...target.items];
      if (typeof index === 'number') next.splice(index, 0, { ...item });
      else next.push({ ...item });
      target.items = next;
    } else {
      const next = [...this._options.items];
      if (typeof index === 'number') next.splice(index, 0, { ...item });
      else next.push({ ...item });
      this._options.items = next;
    }
    this._render();
  }

  removeItem(id: string): void {
    if (this._options.groups) {
      for (const g of this._options.groups) {
        g.items = g.items.filter((i) => i.id !== id);
      }
    } else {
      this._options.items = this._options.items.filter((i) => i.id !== id);
    }
    this._options.selectedIds = this._options.selectedIds.filter((sid) => sid !== id);
    this._options.excludedIds = this._options.excludedIds.filter((sid) => sid !== id);
    this._render();
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading === true;
    this._render();
  }

  setReorderable(reorderable: boolean): void {
    this._options.isReorderable = !!reorderable;
    this._render();
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (arguments.length === 0) return this._options.isDisabled;
    this._options.isDisabled = !!state;
    this._render();
  }

  destroy(): void {
    this._unbindEvents();
    this._sortableHandle?.destroy();
    this._sortableHandle = null;
    this._destroyInstances();
    if (this._element) {
      this._element.textContent = '';
      this._element.classList.remove(
        'arvo-list',
        'arvo-list--standard',
        'arvo-list--rich',
        'arvo-list--none',
        'arvo-list--single',
        'arvo-list--multi',
        'arvo-list--reorderable',
        'arvo-list--actions-always',
        'is-disabled',
        'loading',
        'is-empty',
      );
      this._element.removeAttribute('role');
      this._element.removeAttribute('aria-busy');
      this._element.removeAttribute('aria-disabled');
      this._element.removeAttribute('aria-multiselectable');
      this._element.removeAttribute('aria-label');
      this._element.style.removeProperty('--arvo-list-width');
      this._element.style.removeProperty('--arvo-list-item-actions-w');
    }
    this._element = null;
    this._bodyEl = null;
    if (this._liveEl) {
      this._liveEl.remove();
      this._liveEl = null;
    }
    this._saInst = null;
    this._emptyInst = null;
    this._entries = [];
    this._groupBlocks = [];
  }

  private _destroyInstances(opts?: { preserveLiveRegion?: boolean }): void {
    this._saInst?.destroy?.();
    this._saInst = null;
    this._emptyInst?.destroy?.();
    this._emptyInst = null;
    for (const entry of this._entries) {
      entry.checkboxInst?.destroy?.();
      entry.radioInst?.destroy?.();
      entry.avatarInst?.destroy?.();
      entry.badgeInst?.destroy?.();
      entry.statusInst?.destroy?.();
      entry.chevButton?.destroy?.();
      entry.tooltipHandle?.destroy?.();
      for (const btn of entry.actionButtons) btn.destroy?.();
    }
    for (const block of this._groupBlocks) {
      block.saInst?.destroy?.();
    }
    if (!opts?.preserveLiveRegion && this._liveEl) {
      this._liveEl.remove();
      this._liveEl = null;
    }
  }
}

export default ArvoList;
