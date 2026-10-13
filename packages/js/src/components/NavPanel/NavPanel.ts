/**
 * ArvoNavPanel -- vanilla JS implementation.
 *
 * Thin wrapper over the internal `PanelBase` primitive. Composes the
 * shared `arvo-pnl` shell (overlay + docked modes, left/right placement,
 * modal / non-modal, pinnable, standard + rich header, sticky region,
 * footer actions, FAB, edge, scoped container, notify-but-no-veto
 * dismissal) with a body slot that hosts a single `ArvoNav` instance.
 *
 * Placement is narrowed to `'left' | 'right'`. The panel is NOT
 * resizable and NOT expandable.
 *
 * Compact rail: `isCompact=true` collapses the panel to an icon-only
 * rail whose width is derived from the nested Arvo Nav `size` (sm=32px,
 * md=40px, lg=48px). NavItem labels are preserved as the accessible
 * name + native hover / focus tooltip; the inline banner / TabStrip /
 * full search input are suppressed by the panel's compact CSS.
 *
 * Sticky-search filtering runs in the wrapper via `runItemFilter`
 * because `ArvoNav` does not accept `searchQuery` today. Default
 * `searchKeys` is `['label']`.
 *
 * See `descriptors/nav-panel.json` for the full spec.
 */

import {
  runItemFilter,
  type ArvoPanelHeaderAction,
  type ArvoPanelStickyHeaderConfig,
  type ArvoPanelAction,
  type ArvoPanelMenuItem,
  type ArvoPanelPlacement,
  type ArvoPanelDisplayMode,
  type ArvoPanelCloseReason,
} from '@arvo/utils';
import type { ArvoInitialFocusTarget } from '@arvo/core';
import {
  createPanelBase,
  type PanelBaseInstance,
  type ArvoPanelRichHeaderConfig as PanelBaseRichHeaderConfig,
} from '../PanelBase/PanelBase';
import {
  ArvoNav,
  type ArvoNavOptions,
  type ArvoNavItemData,
  type ArvoNavSize,
} from '../Nav/Nav';
import type { ArvoFabButtonOptions } from '../FabButton/FabButton';
import type { ArvoStatusConfig } from '../Status/Status';
import type { ArvoBadgeOptions } from '../Badge/Badge';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoNavPanelRichHeaderConfig = PanelBaseRichHeaderConfig;

/** Narrowed placement enum -- ArvoNavPanel supports left / right only. */
export type ArvoNavPanelPlacement = Extract<ArvoPanelPlacement, 'left' | 'right'>;

export interface ArvoNavPanelOptions {
  // -- Placement / mode --------------------------------------------------
  displayMode?: ArvoPanelDisplayMode;
  placement?: ArvoNavPanelPlacement;
  isEdge?: boolean;

  // -- Visibility -------------------------------------------------------
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: (reason: ArvoPanelCloseReason) => boolean | void;

  // -- Modal ------------------------------------------------------------
  isModal?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  container?: HTMLElement | (() => HTMLElement) | null;
  initialFocus?: ArvoInitialFocusTarget | null;

  // -- Header chrome ---------------------------------------------------
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

  // -- Pin / dismiss ---------------------------------------------------
  isPinnable?: boolean;
  isPinned?: boolean;
  defaultPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  isDismissible?: boolean;

  // -- Rich header / sticky / footer / fab -----------------------------
  richHeader?: ArvoNavPanelRichHeaderConfig | false;
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  actions?: ArvoPanelAction[] | false;
  fab?: ArvoFabButtonOptions | false;

  // -- Standard --------------------------------------------------------
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;

  // -- NavPanel body surface -------------------------------------------
  /**
   * Compact icon-only rail. When true, the panel width is derived from
   * `size` (sm=32px, md=40px, lg=48px) and every NavItem renders only
   * its leading icon; label + metadata are preserved as the accessible
   * name and native hover / focus tooltip.
   */
  isCompact?: boolean;
  /**
   * Nested Arvo Nav density. Cascades to every NavItem row height
   * (sm=32px, md=40px, lg=48px) and, when `isCompact=true`, drives the
   * compact rail width.
   */
  size?: ArvoNavSize;
  /** Nav destinations. Required unless `isLoading=true`. */
  items: ArvoNavItemData[];
  /** Controlled active destination id. */
  activeId?: string;
  /** Uncontrolled initial active destination id. */
  defaultActiveId?: string;
  /** Nav activation callback. */
  onActivate?: (detail: { id: string; item: ArvoNavItemData }) => void;
  /** Escape-hatch bag applied to the inner ArvoNav (bag-first / flat-wins).
   *  `size` and `isCompact` are parent-owned and excluded. */
  navProps?: Pick<
    ArvoNavOptions,
    | 'hasPinning'
    | 'actionsVisibility'
    | 'menuProps'
    | 'onPinChange'
    | 'onAction'
  >;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoNavPanel {
  private _base: PanelBaseInstance;
  private _nav: ArvoNav;
  private _navHostEl: HTMLElement;
  private _items: ArvoNavItemData[];
  private _currentQuery = '';
  private _searchKeys: Array<keyof ArvoNavItemData & string> = ['label'];
  private _getItemSearchText:
    | ((item: ArvoNavItemData) => string)
    | undefined = undefined;
  private _unsubscribeSearch: (() => void) | null = null;
  private _destroyed = false;

  private _isCompact: boolean;
  private _size: ArvoNavSize;

  /**
   * Icon-only rail widths for compact mode. Must stay in sync with the
   * `--arvo-nav-panel-compact-wmin-*` tokens in `_arvo-pnl.scss`. When
   * `isCompact=true` these override the PanelBase default 400px width
   * (which otherwise wins the cascade because PanelBase writes it as an
   * inline style on the host element).
   */
  private static readonly COMPACT_WIDTHS: Record<ArvoNavSize, number> = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  static initialize(
    element: HTMLElement,
    options: ArvoNavPanelOptions,
  ): ArvoNavPanel {
    return new ArvoNavPanel(element, options);
  }

  constructor(element: HTMLElement, options: ArvoNavPanelOptions) {
    this._items = options.items ?? [];
    this._isCompact = !!options.isCompact;
    this._size = options.size ?? 'md';

    // Body host -- ArvoNav renders its own `<nav>` landmark inside this
    // element. The body element becomes a child of PanelBase's __body
    // slot.
    this._navHostEl = document.createElement('div');
    this._navHostEl.className = 'arvo-pnl__nav-host';

    const navOptions: ArvoNavOptions = {
      ...(options.navProps ?? {}),
      size: this._size,
      isCompact: this._isCompact,
      items: this._items,
      selectedId:
        options.activeId ?? options.defaultActiveId ?? null,
      onSelect: (detail) => {
        options.onActivate?.({ id: detail.id, item: detail.item });
        this._base.paneEl.dispatchEvent(
          new CustomEvent('pnl:nav-activate', {
            bubbles: true,
            detail: { id: detail.id },
          }),
        );
      },
    };
    this._nav = ArvoNav.initialize(this._navHostEl, navOptions);

    // Compose panel host modifier classes for size + compact.
    const extraHostClasses = [`arvo-pnl--size-${this._size}`];
    if (this._isCompact) extraHostClasses.push('arvo-pnl--compact');

    // In compact mode, pin the panel width to the icon-rail dimension so
    // the PanelBase inline `--arvo-pnl-size` matches the compact CSS
    // ramp and the pane physically shrinks to the rail. Otherwise
    // PanelBase's 400px default would win the cascade over the compact
    // CSS class (inline > class).
    const compactWidth = this._isCompact
      ? ArvoNavPanel.COMPACT_WIDTHS[this._size]
      : undefined;
    const sizeOverrides = compactWidth
      ? {
          defaultSize: compactWidth,
          minSize: compactWidth,
          maxSize: compactWidth,
        }
      : {};

    this._base = createPanelBase(element, {
      ...options,
      ...sizeOverrides,
      body: this._navHostEl,
      panelType: 'navigation',
      extraHostClasses,
    } as Parameters<typeof createPanelBase>[1]);

    // Resolve default `searchKeys` from `stickyHeader.search`.
    const searchCfg =
      options.stickyHeader && typeof options.stickyHeader === 'object'
        ? options.stickyHeader.search
        : undefined;
    if (searchCfg && typeof searchCfg === 'object' && searchCfg.searchKeys) {
      this._searchKeys = searchCfg.searchKeys as Array<
        keyof ArvoNavItemData & string
      >;
    }
    this._getItemSearchText =
      searchCfg && typeof searchCfg === 'object'
        ? (searchCfg.getItemSearchText as
            | ((item: ArvoNavItemData) => string)
            | undefined)
        : undefined;

    // Subscribe to sticky-search changes. `onSearchQueryChange` fires
    // once immediately with the current value.
    this._unsubscribeSearch = this._base.onSearchQueryChange((query) => {
      this._currentQuery = query;
      this._applyFilter();
    });
  }

  private _applyFilter(): void {
    // `runItemFilter` is typed against `ListItemBase` (id + label +
    // string-typed leading slot). ArvoNavItemData widens those fields
    // (avatar is a config object) so we cast for the filter call and
    // cast back for the result. The filter only reads `id` + `label`
    // unless `getItemSearchText` overrides.
    const filtered: ArvoNavItemData[] =
      this._currentQuery.length > 0
        ? (runItemFilter(
            this._items as unknown as Array<{ id: string; label: string }>,
            this._currentQuery,
            {
              keys: this._searchKeys as Array<'id' | 'label'>,
              getItemSearchText: this._getItemSearchText as
                | ((item: { id: string; label: string }) => string)
                | undefined,
            },
          ) as unknown as ArvoNavItemData[])
        : this._items;
    this._nav.setItems(filtered);
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
    // Refresh searchKeys / getItemSearchText overrides if the new
    // config specifies them.
    if (config && typeof config === 'object' && config.search) {
      const s = config.search;
      if (typeof s === 'object') {
        this._searchKeys = (s.searchKeys as Array<
          keyof ArvoNavItemData & string
        >) ?? ['label'];
        this._getItemSearchText = s.getItemSearchText as
          | ((item: ArvoNavItemData) => string)
          | undefined;
      } else {
        this._searchKeys = ['label'];
        this._getItemSearchText = undefined;
      }
    }
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

  setRichHeader(config: ArvoNavPanelRichHeaderConfig | false): void {
    this._base.setRichHeader(config);
  }

  setItems(items: ArvoNavItemData[]): void {
    this._items = items;
    this._applyFilter();
  }

  setActiveId(id: string | null): void {
    this._nav.selected(id);
  }

  setCompact(compact: boolean): void {
    if (this._isCompact === compact) return;
    this._isCompact = compact;
    const host = this._base.hostEl;
    if (compact) host.classList.add('arvo-pnl--compact');
    else host.classList.remove('arvo-pnl--compact');
    this._applyCompactSizeOverride();
    // Cascade to the inner ArvoNav (updates the arvo-nav--compact
    // class + per-item arvo-nav-item--compact + a11y attrs).
    (this._nav as unknown as {
      _options: ArvoNavOptions;
      _render: () => void;
    })._options.isCompact = compact;
    (this._nav as unknown as { _render: () => void })._render();
  }

  setSize(size: ArvoNavSize): void {
    if (this._size === size) return;
    const host = this._base.hostEl;
    host.classList.remove(`arvo-pnl--size-${this._size}`);
    host.classList.add(`arvo-pnl--size-${size}`);
    this._size = size;
    this._applyCompactSizeOverride();
    (this._nav as unknown as {
      _options: ArvoNavOptions;
      _render: () => void;
    })._options.size = size;
    (this._nav as unknown as { _render: () => void })._render();
  }

  /**
   * Sync the inline `--arvo-pnl-size` / `--arvo-pnl-min-size` /
   * `--arvo-pnl-max-size` variables on the host to the current
   * compact-vs-expanded state. When compact, all three are pinned to
   * the icon-rail width for the active `size`; when expanded, the
   * inline overrides are removed so PanelBase's own defaults win.
   */
  private _applyCompactSizeOverride(): void {
    const host = this._base.hostEl;
    if (this._isCompact) {
      const w = `${ArvoNavPanel.COMPACT_WIDTHS[this._size]}px`;
      host.style.setProperty('--arvo-pnl-size', w);
      host.style.setProperty('--arvo-pnl-min-size', w);
      host.style.setProperty('--arvo-pnl-max-size', w);
    } else {
      host.style.removeProperty('--arvo-pnl-size');
      host.style.removeProperty('--arvo-pnl-min-size');
      host.style.removeProperty('--arvo-pnl-max-size');
    }
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
    this._nav.disabled(state);
  }

  focus(target?: 'first' | 'title' | 'search' | 'list'): void {
    this._base.focus(target);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._unsubscribeSearch?.();
    this._unsubscribeSearch = null;
    this._nav.destroy();
    this._base.destroy();
  }
}

export default ArvoNavPanel;
