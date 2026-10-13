/**
 * ArvoFilterPanel -- vanilla JS implementation.
 *
 * Thin wrapper over the internal `PanelBase` primitive. Renders one
 * `ArvoList` (`filterView: 'flat'`) or an `ArvoAccordion` wrapping one
 * `ArvoList` per group (`filterView: 'grouped'`). Selection is single
 * (radio rows) or multi (checkbox rows).
 *
 * Placement narrowed to left / right. NOT resizable, NOT expandable.
 *
 * Sticky-search forwards the current query into every inner ArvoList
 * via a private `_options.searchQuery` mutation + re-render (ArvoList
 * JS does not expose a public `setSearchQuery()` today).
 *
 * See `descriptors/filter-panel.json` for the full spec.
 */

import type {
  ArvoInitialFocusTarget,
} from '@arvo/core';
import type {
  ArvoPanelHeaderAction,
  ArvoPanelStickyHeaderConfig,
  ArvoPanelAction,
  ArvoPanelMenuItem,
  ArvoPanelPlacement,
  ArvoPanelDisplayMode,
  ArvoPanelCloseReason,
} from '@arvo/utils';
import {
  createPanelBase,
  type PanelBaseInstance,
  type ArvoPanelRichHeaderConfig as PanelBaseRichHeaderConfig,
} from '../PanelBase/PanelBase';
import {
  ArvoList,
  type ArvoListOptions,
  type ArvoListItemData,
  type ArvoListSelectionMode,
} from '../List/List';
import {
  ArvoAccordion,
  type ArvoAccordionOptions,
  type ArvoAccordionItemData,
} from '../Accordion/Accordion';
import type { ArvoFabButtonOptions } from '../FabButton/FabButton';
import type { ArvoStatusConfig } from '../Status/Status';
import type { ArvoBadgeOptions } from '../Badge/Badge';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoFilterPanelRichHeaderConfig = PanelBaseRichHeaderConfig;
export type ArvoFilterPanelPlacement = Extract<
  ArvoPanelPlacement,
  'left' | 'right'
>;

export type ArvoPanelFilterView = 'flat' | 'grouped';
/**
 * Filter selection mode. `'single'` maps to inner ArvoList
 * `selectionMode='single'` (radio rows); `'multiple'` maps to inner
 * ArvoList `selectionMode='multi'` (checkbox rows). ArvoFilterPanel
 * exposes the human-friendly `'multiple'` and translates internally.
 */
export type ArvoPanelFilterSelectionMode = 'single' | 'multiple';

export interface ArvoPanelFilterGroup {
  id: string;
  title: string;
  icon?: string;
  items: ArvoListItemData[];
}

export interface ArvoFilterPanelOptions {
  displayMode?: ArvoPanelDisplayMode;
  placement?: ArvoFilterPanelPlacement;
  isEdge?: boolean;

  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: (reason: ArvoPanelCloseReason) => boolean | void;

  isModal?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  container?: HTMLElement | (() => HTMLElement) | null;
  initialFocus?: ArvoInitialFocusTarget | null;

  hasHeader?: boolean;
  title?: string | null;
  icon?: string;
  status?: Omit<ArvoStatusConfig, 'placement'>;
  badge?: Omit<Partial<ArvoBadgeOptions>, 'placement'>;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPanelHeaderAction[];
  hasOverflowMenu?: boolean;
  overflowMenuItems?: ArvoPanelMenuItem[];

  isPinnable?: boolean;
  isPinned?: boolean;
  defaultPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  isDismissible?: boolean;

  richHeader?: ArvoFilterPanelRichHeaderConfig | false;
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  actions?: ArvoPanelAction[] | false;
  fab?: ArvoFabButtonOptions | false;

  // -- Optional resizing ------------------------------------------------
  /**
   * When true, mounts an `ArvoSplitter` on the inner edge so users can
   * resize the panel width between `minSize` and `maxSize`.
   * Recommended defaults per guidelines: min 320px, default 400px,
   * overlay max `min(800px, 80vw)`, docked max `min(800px, 60vw)`.
   */
  isResizable?: boolean;
  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;
  onResize?: (size: number) => void;
  onResizeCommit?: (size: number) => void;

  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;

  // -- FilterPanel body surface ---------------------------------------
  filterView?: ArvoPanelFilterView;
  selectionMode?: ArvoPanelFilterSelectionMode;
  items?: ArvoListItemData[];
  groups?: ArvoPanelFilterGroup[];
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  listProps?: Pick<
    ArvoListOptions,
    | 'variant'
    | 'hasGroupDividers'
    | 'actionsVisibility'
    | 'isReorderable'
    | 'onReorder'
    | 'onItemContextMenu'
    | 'emptyState'
  >;
  accordionProps?: Pick<
    ArvoAccordionOptions,
    'expandMode' | 'isCollapsible' | 'size' | 'variant'
  >;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArraySelection(next: string[] | string | null): string[] {
  if (next == null) return [];
  return Array.isArray(next) ? next : [next];
}

function setListSearchQuery(list: ArvoList, query: string): void {
  const internal = list as unknown as {
    _options: { searchQuery: string | null };
    _render: () => void;
  };
  if (internal._options) {
    internal._options.searchQuery = query || null;
    internal._render?.();
  }
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoFilterPanel {
  private _base: PanelBaseInstance;
  private _bodyHostEl: HTMLElement;

  private _filterView: ArvoPanelFilterView;
  private _selectionMode: ArvoPanelFilterSelectionMode;
  private _items: ArvoListItemData[] | null;
  private _groups: ArvoPanelFilterGroup[] | null;
  private _selectedIds: string[];
  private _listProps: ArvoFilterPanelOptions['listProps'];
  private _accordionProps: ArvoFilterPanelOptions['accordionProps'];
  private _onSelectionChange: ArvoFilterPanelOptions['onSelectionChange'];

  private _flatList: ArvoList | null = null;
  private _accordion: ArvoAccordion | null = null;
  private _sectionLists: Map<string, ArvoList> = new Map();

  private _unsubscribeSearch: (() => void) | null = null;
  private _currentQuery = '';
  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options: ArvoFilterPanelOptions = {},
  ): ArvoFilterPanel {
    return new ArvoFilterPanel(element, options);
  }

  constructor(element: HTMLElement, options: ArvoFilterPanelOptions = {}) {
    this._filterView = options.filterView ?? 'flat';
    this._selectionMode = options.selectionMode ?? 'multiple';
    this._items = options.items ?? null;
    this._groups = options.groups ?? null;
    this._selectedIds =
      options.selectedIds ?? options.defaultSelectedIds ?? [];
    this._listProps = options.listProps;
    this._accordionProps = options.accordionProps;
    this._onSelectionChange = options.onSelectionChange;

    this._bodyHostEl = document.createElement('div');
    this._bodyHostEl.className = 'arvo-pnl__filter-host';

    this._base = createPanelBase(element, {
      ...options,
      body: this._bodyHostEl,
      panelType: 'filter',
      extraHostClasses: [
        `arvo-pnl--filter-${this._filterView}`,
        `arvo-pnl--select-${this._selectionMode}`,
      ],
    } as Parameters<typeof createPanelBase>[1]);

    this._buildBody();

    this._unsubscribeSearch = this._base.onSearchQueryChange((query) => {
      this._currentQuery = query;
      this._applySearchQuery();
    });
  }

  private _emitSelectionChange(next: string[]): void {
    this._selectedIds = next;
    this._onSelectionChange?.(next);
    this._base.paneEl.dispatchEvent(
      new CustomEvent('pnl:filter-change', {
        bubbles: true,
        detail: { selectedIds: next },
      }),
    );
  }

  private _handleSectionSelection(
    sectionIdSet: Set<string>,
    nextForSection: string[],
  ): void {
    const preserved = this._selectedIds.filter((id) => !sectionIdSet.has(id));
    this._emitSelectionChange([...preserved, ...nextForSection]);
  }

  private _innerListSelectionMode(): ArvoListSelectionMode {
    // Translate the panel's human-friendly value into the inner
    // ArvoList's own selectionMode value (which is still `'multi'`).
    return this._selectionMode === 'multiple' ? 'multi' : 'single';
  }

  private _destroyBody(): void {
    this._flatList?.destroy();
    this._flatList = null;
    for (const list of this._sectionLists.values()) list.destroy();
    this._sectionLists.clear();
    this._accordion?.destroy();
    this._accordion = null;
    this._bodyHostEl.textContent = '';
  }

  private _buildBody(): void {
    this._destroyBody();

    if (this._filterView === 'grouped' && this._groups) {
      this._buildGroupedBody(this._groups);
    } else {
      this._buildFlatBody(this._items ?? []);
    }
  }

  private _buildFlatBody(items: ArvoListItemData[]): void {
    const mode = this._innerListSelectionMode();
    const listHost = document.createElement('div');
    this._bodyHostEl.appendChild(listHost);

    const listOptions: ArvoListOptions = {
      ...(this._listProps ?? {}),
      selectionMode: mode,
      items,
      selectedIds:
        mode === 'single'
          ? (this._selectedIds[0] ?? null)
          : this._selectedIds,
      searchQuery: this._currentQuery || undefined,
      onSelectionChange: (detail) => {
        this._emitSelectionChange(toArraySelection(detail.selectedIds));
      },
    };
    this._flatList = ArvoList.initialize(listHost, listOptions);
  }

  private _buildGroupedBody(groups: ArvoPanelFilterGroup[]): void {
    const mode = this._innerListSelectionMode();
    const accordionHost = document.createElement('div');
    this._bodyHostEl.appendChild(accordionHost);

    // Build one ArvoAccordionItemData per group with a body-host element
    // that will receive an ArvoList after the accordion mounts.
    const perGroupContentEls = new Map<string, HTMLElement>();
    const items: ArvoAccordionItemData[] = groups.map((group) => {
      const contentEl = document.createElement('div');
      contentEl.className = 'arvo-pnl__filter-group-content';
      perGroupContentEls.set(group.id, contentEl);
      return {
        value: group.id,
        title: group.title,
        icon: group.icon,
        content: contentEl,
      };
    });

    this._accordion = ArvoAccordion.initialize(accordionHost, {
      ...(this._accordionProps ?? {}),
      items,
    });

    // Mount each per-group ArvoList inside the accordion body host.
    for (const group of groups) {
      const contentEl = perGroupContentEls.get(group.id);
      if (!contentEl) continue;
      const sectionIdSet = new Set(group.items.map((i) => i.id));
      const listHost = document.createElement('div');
      contentEl.appendChild(listHost);
      const listOptions: ArvoListOptions = {
        ...(this._listProps ?? {}),
        selectionMode: mode,
        items: group.items,
        selectedIds:
          mode === 'single'
            ? (this._selectedIds.find((id) => sectionIdSet.has(id)) ?? null)
            : this._selectedIds.filter((id) => sectionIdSet.has(id)),
        searchQuery: this._currentQuery || undefined,
        onSelectionChange: (detail) => {
          const nextForSection = toArraySelection(detail.selectedIds);
          this._handleSectionSelection(sectionIdSet, nextForSection);
        },
      };
      const list = ArvoList.initialize(listHost, listOptions);
      this._sectionLists.set(group.id, list);
    }
  }

  private _applySearchQuery(): void {
    if (this._flatList) {
      setListSearchQuery(this._flatList, this._currentQuery);
    }
    for (const list of this._sectionLists.values()) {
      setListSearchQuery(list, this._currentQuery);
    }
  }

  // -- Public API -----------------------------------------------------

  open(): void {
    this._base.open();
  }

  close(reason: ArvoPanelCloseReason = 'programmatic'): void {
    this._base.close(reason);
  }

  toggle(): void {
    this._base.toggle();
  }

  isOpen(): boolean {
    return this._base.isOpen();
  }

  pinned(): boolean;
  pinned(value: boolean): void;
  pinned(value?: boolean): boolean | void {
    if (value === undefined) return this._base.pinned() as boolean;
    this._base.pinned(value);
  }

  setDisplayMode(mode: ArvoPanelDisplayMode): void {
    this._base.setDisplayMode(mode);
  }

  setStickyHeader(config: ArvoPanelStickyHeaderConfig | false): void {
    this._base.setStickyHeader(config);
  }

  setHeaderActions(actions: ArvoPanelHeaderAction[]): void {
    this._base.setHeaderActions(actions);
  }

  setActions(actions: ArvoPanelAction[] | false): void {
    this._base.setActions(actions);
  }

  setTitle(title: string | null): void {
    this._base.setTitle(title);
  }

  setIcon(icon: string | null): void {
    this._base.setIcon(icon);
  }

  setRichHeader(config: ArvoFilterPanelRichHeaderConfig | false): void {
    this._base.setRichHeader(config);
  }

  setItems(items: ArvoListItemData[]): void {
    this._items = items;
    this._groups = null;
    if (this._filterView === 'flat') this._buildBody();
  }

  setGroups(groups: ArvoPanelFilterGroup[]): void {
    this._groups = groups;
    this._items = null;
    if (this._filterView === 'grouped') this._buildBody();
  }

  setSelectedIds(ids: string[]): void {
    this._selectedIds = ids;
    this._buildBody();
  }

  setFilterView(view: ArvoPanelFilterView): void {
    if (this._filterView === view) return;
    const host = this._base.hostEl;
    host.classList.remove(`arvo-pnl--filter-${this._filterView}`);
    host.classList.add(`arvo-pnl--filter-${view}`);
    this._filterView = view;
    this._buildBody();
  }

  setSelectionMode(mode: ArvoPanelFilterSelectionMode): void {
    if (this._selectionMode === mode) return;
    const host = this._base.hostEl;
    host.classList.remove(`arvo-pnl--select-${this._selectionMode}`);
    host.classList.add(`arvo-pnl--select-${mode}`);
    this._selectionMode = mode;
    this._buildBody();
  }

  search(): string;
  search(query: string): void;
  search(query?: string): string | void {
    if (query === undefined) return this._base.search() as string;
    this._base.search(query);
  }

  selectedTab(): string | null;
  selectedTab(id: string): void;
  selectedTab(id?: string): string | null | void {
    if (id === undefined) return this._base.selectedTab() as string | null;
    this._base.selectedTab(id);
  }

  loading(): boolean;
  loading(state: boolean): void;
  loading(state?: boolean): boolean | void {
    if (state === undefined) return this._base.loading() as boolean;
    this._base.loading(state);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._base.disabled() as boolean;
    this._base.disabled(state);
    this._flatList?.disabled(state);
    for (const list of this._sectionLists.values()) list.disabled(state);
  }

  focus(target?: 'first' | 'title' | 'search' | 'list'): void {
    this._base.focus(target);
  }

  size(): number;
  size(next: number): void;
  size(next?: number): number | void {
    if (next === undefined) return this._base.size() as number;
    this._base.size(next);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._unsubscribeSearch?.();
    this._unsubscribeSearch = null;
    this._destroyBody();
    this._base.destroy();
  }
}

export default ArvoFilterPanel;
