import {
  createOverlaySurface,
  createArrowNav,
  createInlinePanelStack,
  filterItems,
  filterGroups,
} from '@arvo/core';
import type {
  Placement,
  ArrowNav,
  InlinePanelStack,
  ListItemBase,
  ListGroup,
  OverlayRelation,
  OverlaySurface,
} from '@arvo/core';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoDropdownIconButton } from '../DropdownIconButton/DropdownIconButton';
import { ArvoPopover, type ArvoPopoverActionConfig } from '../Popover/Popover';
import {
  ArvoHybridPopover,
  type HybridPopoverItem,
  type HybridPopoverGroup,
} from '../HybridPopover/HybridPopover';
import { ArvoSearch } from '../Search/Search';
import { ArvoSwitch } from '../Switch/Switch';
import { ArvoEmptyState, type ArvoEmptyStateOptions } from '../EmptyState/EmptyState';
import type { MenuSearchProp, MenuSearchConfig } from '../../types/menu-search';
import { normalizeSearch } from '../../types/menu-search';
import {
  attachTitleTruncationTooltip,
  formatShortcutDisplay,
  type TitleTruncationHandle,
} from '@arvo/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuItemAction {
  id: string;
  icon: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  onClick?: (item: MenuItemData, event: Event) => boolean | void;
  inlinePopover?: MenuInlinePopoverConfig;
  inlineHybridPopover?: MenuInlineHybridPopoverConfig;
}

export interface MenuInlinePopoverConfig {
  title?: string;
  content: HTMLElement | string;
  actions?: ArvoPopoverActionConfig[];
  isClosable?: boolean;
  hasBackButton?: boolean;
  /**
   * Optional explicit width for the inline popover panel. CSS length string
   * (e.g. `"360px"`, `"50%"`) or a px number. Forwarded to the underlying
   * ArvoPopover instance; omitted by default (panel sizes to content).
   */
  width?: string | number;
  /**
   * Optional explicit height for the inline popover panel. CSS length string
   * or px number. Omitted by default (panel sizes to content).
   */
  height?: string | number;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onBack?: () => void;
}

export interface MenuInlineHybridPopoverConfig {
  title?: string;
  variant?: 'multi' | 'single';
  items?: HybridPopoverItem[] | HybridPopoverGroup[];
  hasBackButton?: boolean;
  /**
   * Optional explicit width (px) for the inline hybrid popover panel.
   * Forwarded to the underlying ArvoHybridPopover instance; omitted by
   * default (uses the hybrid popover's default width).
   */
  width?: number;
  /**
   * Optional explicit height (px) for the inline hybrid popover panel.
   * Omitted by default (panel sizes to content).
   */
  height?: number;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onBack?: () => void;
}

export interface MenuItemSwitch {
  checked: boolean;
  onChange?: (checked: boolean, item: MenuItemData) => void;
  ariaLabel?: string;
}

/**
 * Status indicator config for a menu item's trailing zone. A semantic key
 * maps to the matching `arvo-menu-item--status-*` modifier class; an explicit
 * `{ color }` object sets `--arvo-menu-item-status-color` inline so the dot
 * can take an arbitrary token-driven color.
 */
export type MenuItemStatus =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | { color: string };

export interface MenuItemData extends ListItemBase {
  shortcut?: string;
  /** Right-aligned meta value text rendered in the trailing zone before any actions / overflow / submenu chevron. */
  value?: string;
  /** Status indicator dot rendered in the trailing zone before meta / shortcut. */
  status?: MenuItemStatus;
  /**
   * When provided, the row is rendered as an `<a>` element (still
   * `role="menuitem"`). Must not be combined with `inlinePopover` /
   * `inlineHybridPopover` (the inline panel wins; warned in dev).
   */
  href?: string;
  /**
   * Anchor target. When `'_blank'`, the row also renders the `__external`
   * icon and adds `rel="noopener noreferrer"` plus an `aria-label` suffix
   * announcing "opens in a new window". Ignored unless `href` is set.
   */
  target?: '_self' | '_blank';
  destructive?: boolean;
  active?: boolean;
  submenu?: MenuItemData[];
  actions?: MenuItemAction[];
  inlinePopover?: MenuInlinePopoverConfig;
  inlineHybridPopover?: MenuInlineHybridPopoverConfig;
  switch?: MenuItemSwitch;
}

// Overlay empty state surface: only the curated keys are exposed. The
// wiring layer always passes size='sm', orientation='vertical', and the
// only configurable action is the secondaryAction (typically a clear-search
// affordance).
export type ActionMenuEmptyConfig = Pick<
  ArvoEmptyStateOptions,
  'illustration' | 'title' | 'message' | 'secondaryAction'
>;

export interface ArvoActionMenuOptions {
  items: MenuItemData[] | ListGroup<MenuItemData>[];
  isLoading?: boolean;
  /** Enable search with defaults (`true`) or pass a config object. */
  search?: MenuSearchProp;
  placement?:
    | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
    | 'left-start' | 'left-end' | 'right-start' | 'right-end' | 'auto';
  /** Optional CSS width for the parent menu panel. Omit/null for natural auto width. */
  menuWidth?: string | number | null;
  /** Optional CSS width for nested submenu panels only. Omit/null for natural auto width. */
  submenuWidth?: string | number | null;
  maxHeight?: string;
  hasGroupDividers?: boolean;
  actionsVisibility?: 'always' | 'hover';
  /**
   * Maximum number of trailing actions rendered inline per item. Any actions
   * beyond this cap are moved into an overflow `ArvoDropdownIconButton`
   * rendered inside the `__overflow` slot. Defaults to `4` per the spec.
   */
  actionsMaxVisible?: number;
  submenuTrigger?: 'hover' | 'click';
  closeOnSelect?: boolean;
  isDisabled?: boolean;
  /** Initial open state (uncontrolled). Mirrors React's `defaultOpen`. */
  defaultOpen?: boolean;
  /**
   * Initial open state seed (controlled-style). When `true` the menu opens on
   * initialize. After init, drive open/close via `open()` / `close()` /
   * `toggle()`. Mirrors React's `isOpen` for parity.
   */
  isOpen?: boolean;
  emptyConfig?: Partial<ActionMenuEmptyConfig>;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onSelect?: (item: MenuItemData, index: number) => boolean | void;
  onOpenChange?: (isOpen: boolean) => void;
}

type RequiredActionMenuOptions = Required<
  Omit<
    ArvoActionMenuOptions,
    | 'onOpen' | 'onClose' | 'onSelect' | 'onOpenChange'
    | 'maxHeight' | 'menuWidth' | 'submenuWidth' | 'search' | 'emptyConfig'
    | 'defaultOpen' | 'isOpen'
  >
> & {
  search: MenuSearchProp | undefined;
  maxHeight: string | null;
  menuWidth: string | number | null;
  submenuWidth: string | number | null;
  emptyConfig: Partial<ActionMenuEmptyConfig> | null;
  defaultOpen: boolean;
  isOpen: boolean | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onSelect: ((item: MenuItemData, index: number) => boolean | void) | null;
  onOpenChange: ((isOpen: boolean) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
let _inlineIdCounter = 0;

const FILTER_KEYS = ['label', 'secondaryLabel'] as const;
const SKELETON_ROW_COUNT = 5;
const INLINE_HOVER_DELAY_MS = 200;

function isGrouped(
  items: MenuItemData[] | ListGroup<MenuItemData>[],
): items is ListGroup<MenuItemData>[] {
  return items.length > 0 && 'items' in items[0];
}

function flattenItems(items: MenuItemData[] | ListGroup<MenuItemData>[]): MenuItemData[] {
  if (isGrouped(items)) {
    const result: MenuItemData[] = [];
    for (const group of items) {
      for (const item of group.items) result.push(item);
    }
    return result;
  }
  return items as MenuItemData[];
}

/**
 * Splits an item's label around the first case-insensitive occurrence of a
 * fragment. Mirrors `splitLabelForMatch` in the React twin so the menu's
 * `__match` markup is identical across both implementations.
 */
function splitLabelForMatch(
  label: string,
  fragment: string | undefined,
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

/**
 * Resolves a `MenuItemStatus` into the per-item BEM modifier class and the
 * optional inline-style override for the dot color. Semantic keys produce
 * `arvo-menu-item--status-*` classes; explicit `{ color }` overrides set
 * `--arvo-menu-item-status-color` inline.
 */
function resolveStatus(status: MenuItemStatus | undefined): {
  modifier: string | null;
  inlineColor: string | null;
} {
  if (!status) return { modifier: null, inlineColor: null };
  if (typeof status === 'string') {
    return { modifier: `arvo-menu-item--status-${status}`, inlineColor: null };
  }
  return { modifier: null, inlineColor: status.color };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoActionMenu {
  private _element: HTMLElement | null;
  private _options: RequiredActionMenuOptions;

  private _panelEl: HTMLElement | null = null;
  private _scrollEl: HTMLElement | null = null;
  private _searchEl: HTMLElement | null = null;
  private _searchInstance: ArvoSearch | null = null;

  private _searchCfg: MenuSearchConfig | null = null;

  private _isOpen = false;
  private _isDisabled = false;
  private _isLoading = false;
  private _activeIndex = -1;
  private _query = '';

  private _arrowNav: ArrowNav | null = null;
  private _surface: OverlaySurface | null = null;
  /**
   * Reason for an in-flight close. Set immediately before any path that
   * invokes `_surface.close()`; consumed by the engine's `onClose` to decide
   * whether to fire the cancellable `action-menu:close` custom event and the
   * `onClose` option callback. Engine-driven dismissal (outside-click,
   * Escape) leaves this as `null` and is silent (per EX-3 / EX-4 policy).
   */
  private _closeReason: 'programmatic' | null = null;
  private _panelId: string;

  private _flatItems: MenuItemData[] = [];
  private _itemEls: HTMLElement[] = [];
  // Per-row truncation tooltip handles -- disposed before every render
  // pass (in `_renderItems`) AND in `destroy()`. Shared util keeps the
  // visual-only contract (no `aria-describedby`).
  private _truncationHandles: TitleTruncationHandle[] = [];
  private _submenus: Map<string, ArvoActionMenu> = new Map();
  private _trailingActionInstances: ArvoIconButton[] = [];
  private _overflowInstances: ArvoDropdownIconButton[] = [];
  private _switchInstances = new Map<string, ArvoSwitch>();
  private _emptyStateInstance: ArvoEmptyState | null = null;

  private _inlinePanelStack: InlinePanelStack | null = null;
  private _inlinePanelInstances = new Map<string, ArvoPopover | ArvoHybridPopover>();

  private _submenuTimer: ReturnType<typeof setTimeout> | null = null;
  private _inlinePanelTimer: ReturnType<typeof setTimeout> | null = null;

  private _isSubmenu = false;
  private _parentMenu: ArvoActionMenu | null = null;
  private _parentOverlayId: string | null = null;
  private _overlayRelation: OverlayRelation | undefined;

  private _boundHandleTriggerClick: (e: Event) => void;
  private _boundHandleKeyDown: (e: KeyboardEvent) => void;

  static readonly DEFAULTS: RequiredActionMenuOptions = {
    items: [],
    isLoading: false,
    search: undefined,
    placement: 'bottom-start',
    menuWidth: null,
    submenuWidth: null,
    maxHeight: null,
    hasGroupDividers: true,
    actionsVisibility: 'always',
    actionsMaxVisible: 4,
    submenuTrigger: 'hover',
    closeOnSelect: true,
    isDisabled: false,
    defaultOpen: false,
    isOpen: null,
    emptyConfig: null,
    onOpen: null,
    onClose: null,
    onSelect: null,
    onOpenChange: null,
  };

  static initialize(element: HTMLElement, options: ArvoActionMenuOptions): ArvoActionMenu {
    return new ArvoActionMenu(element, options);
  }

  /** @internal Factory for nested submenu instances. */
  static _createSubmenu(
    element: HTMLElement,
    options: ArvoActionMenuOptions,
    parent: ArvoActionMenu,
  ): ArvoActionMenu {
    return new ArvoActionMenu(element, options, {
      parent,
      parentOverlayId: parent._panelId,
      relation: 'submenu',
    });
  }

  constructor(
    element: HTMLElement,
    options: ArvoActionMenuOptions,
    submenuContext?: {
      parent: ArvoActionMenu;
      parentOverlayId: string;
      relation: OverlayRelation;
    },
  ) {
    this._element = element;
    this._panelId = `arvo-action-menu-${++_idCounter}`;

    if (submenuContext) {
      this._isSubmenu = true;
      this._parentMenu = submenuContext.parent;
      this._parentOverlayId = submenuContext.parentOverlayId;
      this._overlayRelation = submenuContext.relation;
    }

    this._options = {
      ...ArvoActionMenu.DEFAULTS,
      ...options,
      items: options.items ?? [],
      maxHeight: options.maxHeight ?? null,
      menuWidth: options.menuWidth ?? null,
      submenuWidth: options.submenuWidth ?? null,
      defaultOpen: options.defaultOpen ?? false,
      isOpen: options.isOpen ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onSelect: options.onSelect ?? null,
      onOpenChange: options.onOpenChange ?? null,
      emptyConfig: options.emptyConfig ?? null,
    };

    this._searchCfg = normalizeSearch(
      this._options.search,
    );

    this._isDisabled = this._options.isDisabled;
    // (before the panel is built and reads the loading state).
    this._isLoading = this._options.isLoading;

    this._boundHandleTriggerClick = this._handleTriggerClick.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);

    this._buildPanel();
    this._buildSurface();
    this._bindTriggerEvents();

    if (this._isDisabled) {
      element.setAttribute('aria-disabled', 'true');
    }

    // Seed initial open state. `isOpen: true` (controlled-style seed) takes
    // precedence over `defaultOpen` for parity with React.
    const seedOpen = this._options.isOpen ?? this._options.defaultOpen;
    if (seedOpen) {
      this.open();
    }
  }

  // ---------------------------------------------------------------------------
  // Engine wiring
  // ---------------------------------------------------------------------------

  private _buildSurface(): void {
    if (!this._panelEl || !this._element) return;
    this._surface = createOverlaySurface({
      id: this._panelId,
      surface: this._panelEl,
      type: 'action-menu',
      priority: 15,
      trigger: this._element,
      parentId: this._parentOverlayId ?? undefined,
      relation: this._overlayRelation,
      position: {
        // Top-level menus sit 4px off the trigger (the design-system
        // standard separation between anchored overlays and their
        // trigger); submenus sit flush so the parent item highlight
        // connects to the submenu chrome.
        placement: this._options.placement as Placement,
        gap: this._isSubmenu ? 0 : 4,
        // Filtering and dynamic item updates resize the panel; without the
        // lock, the watcher's `'float-size'` callback could re-resolve to a
        // different side once the smaller content suddenly fits the
        // originally-rejected placement, flipping the panel mid-keystroke.
        // Anchor / scroll / window-resize events still re-resolve normally
        // so the world-around-the-menu case is unaffected.
        lockPlacementOnFloatResize: true,
      },
      focus: {
        mode: 'trap',
        initialFocus: 'none',
        getOrderedElements: () => this._collectFocusableElements(),
      },
      transition: 'fade',
      transitionDuration: 150,
      triggerAria: { haspopup: 'menu' },
      onOpen: () => this._handleSurfaceOpened(),
      onClose: () => this._handleSurfaceClosed(),
    });
  }

  /**
   * Returns the focus trap's ordered tab-cycle. While an inline-panel-stack
   * layer is open, the engine's trap should cycle within the top inline
   * layer's focusable elements only -- otherwise it cycles within the panel
   * shell (search input, items, trailing actions).
   */
  private _collectFocusableElements(): Array<HTMLElement | null | undefined> {
    // Native interactive elements with tabindex=-1 are reachable only
    // programmatically (via ArrowRight/Left), NOT via Tab. The selector
    // below excludes them so the focus trap's Tab cycle inside the menu
    // is limited to:
    //   - the filter search input (when configured)
    //   - the active menu row (the only row carrying tabindex=0 via the
    //     roving-tabindex implementation)
    // Trailing action buttons and the embedded switch's input are forced
    // to tabindex=-1 by `_renderItem` so they're skipped here automatically.
    const selector =
      'a[href]:not([tabindex="-1"]), button:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
    if (
      this._inlinePanelStack &&
      this._inlinePanelStack.getDepth() > 0
    ) {
      const top = this._inlinePanelStack.getTop();
      if (top?.element) {
        return Array.from(
          top.element.querySelectorAll<HTMLElement>(selector),
        );
      }
    }
    if (!this._panelEl) return [];
    return Array.from(
      this._panelEl.querySelectorAll<HTMLElement>(selector),
    );
  }

  private _handleSurfaceOpened(): void {
    // Re-render items to ensure fresh state
    this._renderItems();
    this._setupArrowNav();
    this._focusInitial();
    this._panelEl?.addEventListener('keydown', this._boundHandleKeyDown);
  }

  private _handleSurfaceClosed(): void {
    // Engine path: outside-click / Escape / programmatic surface.close().
    // We cleared `_closeReason` BEFORE calling _surface.close() for the
    // programmatic path -- but that path also already dispatched the
    // cancellable `action-menu:close` event and called `onClose` itself.
    // For engine-driven dismissal (`_closeReason === null`) we silently
    // sync internal state without firing the cancellable event/callback.
    const reason = this._closeReason;
    this._closeReason = null;

    if (this._submenuTimer) {
      clearTimeout(this._submenuTimer);
      this._submenuTimer = null;
    }

    if (this._inlinePanelTimer) {
      clearTimeout(this._inlinePanelTimer);
      this._inlinePanelTimer = null;
    }

    this._closeAllInlinePanels();
    this._closeSubmenus();

    this._query = '';
    this._searchInstance?.clear();
    this._activeIndex = -1;

    this._panelEl?.removeEventListener('keydown', this._boundHandleKeyDown);
    this._arrowNav?.destroy();
    this._arrowNav = null;

    this._isOpen = false;
    this._options.onOpenChange?.(false);
    if (reason === 'programmatic') {
      // The programmatic path's onClose option was already consulted before
      // we called surface.close(); nothing else to do here.
    }
  }

  // ---------------------------------------------------------------------------
  // Panel Build
  // ---------------------------------------------------------------------------

  private _buildPanel(): void {
    this._panelEl = document.createElement('div');
    this._panelEl.id = this._panelId;
    this._panelEl.className = this._buildPanelClasses();
    this._panelEl.setAttribute('role', 'menu');

    if (this._isLoading) {
      this._panelEl.setAttribute('aria-busy', 'true');
    }

    if (this._options.maxHeight) {
      // Consumer-supplied cap. Sets the engine's generic CSS var so any
      // future SCSS rule keying off it (or the engine's `position.apply`)
      // can clamp the panel; also pinned as inline `max-height` to keep
      // existing visual behaviour (the position watcher will still emit
      // a tighter clamp via `--arvo-overlay-max-height` when needed).
      this._panelEl.style.setProperty('--arvo-overlay-max-height', this._options.maxHeight);
      this._panelEl.style.maxHeight = this._options.maxHeight;
    }

    this._applyPanelWidth();

    if (this._searchCfg) {
      this._searchEl = this._buildSearch();
      this._panelEl.appendChild(this._searchEl);
    }

    this._scrollEl = document.createElement('div');
    this._scrollEl.className = 'arvo-action-menu__scroll';
    this._panelEl.appendChild(this._scrollEl);

    this._renderItems();

    document.body.appendChild(this._panelEl);
  }

  private _buildPanelClasses(): string {
    return [
      'arvo-action-menu',
      this._options.isLoading && 'loading',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private _toCssLength(value: string | number | null | undefined): string | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? `${value}px` : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  }

  private _applyPanelWidth(): void {
    if (!this._panelEl) return;
    const raw = this._isSubmenu ? this._options.submenuWidth : this._options.menuWidth;
    const width = this._toCssLength(raw);
    if (width) {
      this._panelEl.style.setProperty('--arvo-overlay-width', width);
      this._panelEl.style.width = width;
    } else {
      this._panelEl.style.removeProperty('--arvo-overlay-width');
      this._panelEl.style.width = '';
    }
  }

  private _buildSearch(): HTMLElement {
    const cfg = this._searchCfg!;
    const wrapper = document.createElement('div');
    const classes = ['arvo-action-menu__search'];
    if (cfg.className) classes.push(cfg.className);
    wrapper.className = classes.join(' ');

    const searchRoot = document.createElement('div');
    wrapper.appendChild(searchRoot);

    this._searchInstance = ArvoSearch.initialize(searchRoot, {
      variant: 'filter',
      placeholder: cfg.placeholder,
      searchMode: cfg.searchMode,
      minChars: cfg.minChars,
      isClearable: cfg.isClearable,
      shortcut: cfg.shortcut ?? null,
      errorMsg: cfg.errorMsg,
      errorDisplay: 'tooltip',
      isDisabled: this._isDisabled,
      'aria-label': 'Filter menu items',
      onSearch: (value: string) => {
        this._handleFilterSearch(value);
      },
      onClear: () => {
        this._handleFilterClear();
      },
    });

    wrapper.addEventListener('keydown', (e: KeyboardEvent) => {
      // Arrow keys (and Home/End) move DOM focus out of the search input and
      // into the option list. Tab is left to native behavior -- the active
      // item carries a roving tabindex so Tab lands on it.
      if (e.key === 'ArrowDown' || e.key === 'Home') {
        e.preventDefault();
        // Stop the panel-level keydown handler from also running arrow-nav
        // and advancing a second step past the item we just focused.
        e.stopPropagation();
        this._focusListFromSearch('first');
      } else if (e.key === 'ArrowUp' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        this._focusListFromSearch('last');
      } else if (e.key === 'Enter') {
        // Enter from the search input activates the currently active row
        // (matching the React twin's handleSearchWrapperKeyDown). The
        // panel-level handler now bails out when the search input has focus
        // (`_handleKeyDown`'s `_isSearchFocused()` guard), so without this
        // branch Enter would simply submit the input form with no menu
        // action. We intentionally do NOT activate on Space -- Space must
        // insert a literal space character.
        if (
          this._activeIndex >= 0 &&
          this._activeIndex < this._flatItems.length
        ) {
          const item = this._flatItems[this._activeIndex];
          if (item && !item.isDisabled) {
            e.preventDefault();
            e.stopPropagation();
            this._handleItemActivation(this._activeIndex);
          }
        }
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        if (this._query) {
          this._handleFilterClear();
        } else {
          this.close();
        }
      }
    });

    return wrapper;
  }

  // ---------------------------------------------------------------------------
  // Item Rendering
  // ---------------------------------------------------------------------------

  private _renderItems(): void {
    if (!this._scrollEl) return;

    this._scrollEl.textContent = '';
    this._destroyTrailingActions();
    this._destroySwitchInstances();
    this._destroyEmptyState();
    // Tear down previous-render truncation handles before clearing the
    // DOM so their internal ResizeObservers don't leak to detached
    // label nodes.
    this._truncationHandles.forEach((h) => h.destroy());
    this._truncationHandles = [];
    this._itemEls = [];
    this._flatItems = [];

    if (this._isLoading) {
      this._renderLoadingSkeleton();
      this._updateSearchVisibility();
      return;
    }

    const items = this._getFilteredItems();

    if (isGrouped(items)) {
      (items as ListGroup<MenuItemData>[]).forEach((group, groupIndex) => {
        if (groupIndex > 0 && this._options.hasGroupDividers) {
          const divider = document.createElement('hr');
          divider.className = 'arvo-action-menu__divider';
          divider.setAttribute('role', 'separator');
          this._scrollEl!.appendChild(divider);
        }
        if (group.label) {
          const header = document.createElement('div');
          header.className = 'arvo-action-menu__hdr';
          header.setAttribute('role', 'presentation');
          header.textContent = group.label;
          this._scrollEl!.appendChild(header);
        }
        group.items.forEach(item => this._renderItem(item));
      });
    } else {
      (items as MenuItemData[]).forEach(item => this._renderItem(item));
    }

    if (this._flatItems.length === 0) {
      this._renderEmptyState();
    }

    this._updateSearchVisibility();
  }

  // Toggles the search wrapper between visible and `display: none` based on
  // whether there is anything to filter. When `items` is truly empty AND no
  // query is active (noData state), the search bar disappears -- but stays
  // visible during noResults (items empty with an active query) so the user
  // can clear or refine the filter.
  private _updateSearchVisibility(): void {
    if (!this._searchEl) return;
    const totalItems = flattenItems(this._options.items).length;
    const hide = !this._isLoading && totalItems === 0 && !this._query;
    this._searchEl.style.display = hide ? 'none' : '';
  }

  private _renderLoadingSkeleton(): void {
    if (!this._scrollEl) return;

    for (let i = 0; i < SKELETON_ROW_COUNT; i++) {
      const row = document.createElement('div');
      row.className = 'arvo-action-menu__skeleton';
      row.setAttribute('aria-hidden', 'true');

      const icon = document.createElement('div');
      icon.className = 'arvo-action-menu__skeleton-icon';
      row.appendChild(icon);

      const text = document.createElement('div');
      text.className = 'arvo-action-menu__skeleton-text';
      row.appendChild(text);

      this._scrollEl.appendChild(row);
    }
  }

  private _renderEmptyState(): void {
    if (!this._scrollEl) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'arvo-action-menu__empty';

    const cfg = this._options.emptyConfig ?? {};
    const isFiltered = !!this._query;

    const emptyOpts: ArvoEmptyStateOptions = {
      size: 'sm',
      orientation: 'vertical',
      illustration: cfg.illustration ?? (isFiltered ? 'no-results' : 'no-data'),
      title: cfg.title ?? (isFiltered ? 'No results found' : 'No data'),
      message:
        cfg.message ??
        (isFiltered ? 'Adjust your filter search query.' : 'There is nothing to show yet.'),
      secondaryAction:
        cfg.secondaryAction ??
        (isFiltered
          ? {
              label: 'Clear search',
              onClick: () => this._handleFilterClear(),
              variant: 'outline',
            }
          : undefined),
    };

    this._emptyStateInstance = ArvoEmptyState.create(emptyOpts);
    wrapper.appendChild(this._emptyStateInstance.el);
    this._scrollEl.appendChild(wrapper);
  }

  private _renderItem(item: MenuItemData): void {
    const idx = this._flatItems.length;
    this._flatItems.push(item);

    const hasSecondary = !!item.secondaryLabel;
    const useAnchor =
      !!item.href &&
      !item.inlinePopover &&
      !item.inlineHybridPopover &&
      !item.submenu;
    const isExternal = !!item.href && item.target === '_blank';

    // Dev-only contract checks: surface ambiguous combinations so consumers
    // can clean up their data. Code below still falls through by precedence
    // (inline panel > submenu > href).
    if (process.env.NODE_ENV !== 'production') {
      const hasInline = !!(item.inlinePopover || item.inlineHybridPopover);
      if (item.submenu && hasInline) {
        console.warn(
          `[ArvoActionMenu] Item "${item.id}" has both submenu and an inline panel; the inline panel will be ignored.`,
        );
      }
      if (item.href && hasInline) {
        console.warn(
          `[ArvoActionMenu] Item "${item.id}" has both href and an inline panel; the inline panel will be ignored.`,
        );
      }
    }

    const el = useAnchor
      ? (document.createElement('a') as HTMLAnchorElement)
      : document.createElement('div');

    el.className = this._buildItemClasses(item);
    el.setAttribute('role', 'menuitem');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('data-index', String(idx));

    if (useAnchor) {
      const anchor = el as HTMLAnchorElement;
      anchor.href = item.href!;
      anchor.target = item.target ?? '_self';
      if (isExternal) {
        anchor.rel = 'noopener noreferrer';
        anchor.setAttribute(
          'aria-label',
          `${item.label}, opens in a new window`,
        );
      }
    }

    // Per-item inline style for the `{ color }` form of status -- semantic
    // keys are handled via BEM modifier classes in _buildItemClasses.
    const status = resolveStatus(item.status);
    if (status.inlineColor) {
      el.style.setProperty('--arvo-menu-item-status-color', status.inlineColor);
    }

    if (item.isDisabled) {
      el.classList.add('is-disabled');
      el.setAttribute('aria-disabled', 'true');
    }

    if (item.submenu) {
      el.setAttribute('aria-haspopup', 'menu');
      el.setAttribute('aria-expanded', 'false');
    }

    // Leading icon
    if (item.icon) {
      const ico = document.createElement('span');
      ico.className = `arvo-menu-item__ico o9con o9con-${item.icon}`;
      ico.setAttribute('aria-hidden', 'true');
      el.appendChild(ico);
    }

    // Leading avatar
    if (item.avatar) {
      const avatar = document.createElement('img');
      avatar.className = 'arvo-menu-item__avatar';
      avatar.src = item.avatar;
      avatar.alt = '';
      avatar.setAttribute('aria-hidden', 'true');
      el.appendChild(avatar);
    }

    // Text container
    const txt = document.createElement('span');
    txt.className = 'arvo-menu-item__txt';

    const lbl = document.createElement('span');
    lbl.className = 'arvo-menu-item__lbl';
    // Search-match highlight: when a filter query is active and matches a
    // substring of the label, wrap that substring in
    // `<span class="arvo-menu-item__match">` so the shared mixin paints the
    // highlight pill + Medium-weight chars.
    const matchSplit = this._query
      ? splitLabelForMatch(item.label, this._query)
      : null;
    if (matchSplit) {
      lbl.appendChild(document.createTextNode(matchSplit.before));
      const matchEl = document.createElement('span');
      matchEl.className = 'arvo-menu-item__match';
      matchEl.textContent = matchSplit.match;
      lbl.appendChild(matchEl);
      lbl.appendChild(document.createTextNode(matchSplit.after));
    } else {
      lbl.textContent = item.label;
    }
    txt.appendChild(lbl);

    if (hasSecondary) {
      const secondary = document.createElement('span');
      secondary.className = 'arvo-menu-item__secondary';
      secondary.textContent = item.secondaryLabel!;
      txt.appendChild(secondary);
    }

    el.appendChild(txt);

    // Trailing zone -- includes status / meta / shortcut / switch / actions
    // (with overflow) / submenu chevron / external icon, in that order.
    const hasTrailing =
      !!item.status ||
      !!item.value ||
      !!item.shortcut ||
      !!item.submenu ||
      !!item.actions?.length ||
      !!item.switch ||
      isExternal;

    if (hasTrailing) {
      const trailing = document.createElement('span');
      trailing.className = 'arvo-menu-item__trailing';

      if (item.status) {
        const statusEl = document.createElement('span');
        statusEl.className = 'arvo-menu-item__status';
        statusEl.setAttribute('aria-hidden', 'true');
        trailing.appendChild(statusEl);
      }

      if (item.value) {
        const meta = document.createElement('span');
        meta.className = 'arvo-menu-item__meta';
        meta.textContent = item.value;
        trailing.appendChild(meta);
      }

      if (item.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'arvo-menu-item__shortcut';
        shortcut.textContent = formatShortcutDisplay(item.shortcut);
        trailing.appendChild(shortcut);
      }

      if (item.switch) {
        const switchWrap = document.createElement('span');
        switchWrap.className = 'arvo-menu-item__switch';
        const switchHost = document.createElement('span');
        switchWrap.appendChild(switchHost);

        const switchInst = ArvoSwitch.initialize(switchHost, {
          label: null,
          isChecked: item.switch.checked,
          isDisabled: item.isDisabled || this._isLoading,
          onChange: ({ isChecked }) => {
            item.switch!.checked = isChecked;
            item.switch!.onChange?.(isChecked, item);
          },
        });
        if (item.switch.ariaLabel) {
          switchHost.setAttribute('aria-label', item.switch.ariaLabel);
        }

        // The embedded switch is NOT focusable -- the menu row itself is the
        // toggle target. Remove ArvoSwitch's inner <input> from the Tab cycle
        // so Tab moves between the search input and the active row only.
        // Row activation (Enter/Space/click) calls item.switch.onChange via
        // _handleItemActivation, so the switch still toggles correctly.
        const switchInput = switchHost.querySelector<HTMLInputElement>(
          'input.arvo-sw__input',
        );
        if (switchInput) switchInput.tabIndex = -1;

        switchWrap.addEventListener('click', (e: Event) => e.stopPropagation());
        this._switchInstances.set(item.id, switchInst);
        trailing.appendChild(switchWrap);
      }

      if (item.actions?.length) {
        const cap = Math.max(1, this._options.actionsMaxVisible);
        const visible = item.actions.slice(0, cap);
        const overflow = item.actions.slice(cap);

        const actionsEl = document.createElement('span');
        actionsEl.className = 'arvo-menu-item__actions';

        for (const action of visible) {
          const btnEl = document.createElement('button') as HTMLButtonElement;
          // Trailing actions are reached by ArrowRight/ArrowLeft, NOT by Tab.
          // tabIndex=-1 removes them from the Tab cycle while keeping
          // `.focus()` working for the arrow-key navigation.
          btnEl.tabIndex = -1;
          const inst = ArvoIconButton.initialize(btnEl, {
            variant: 'tertiary',
            size: 'sm',
            icon: action.icon,
            tooltip: action.ariaLabel ?? action.id,
            isDisabled: item.isDisabled || action.isDisabled,
            onClick: (e: Event) => {
              e.stopPropagation();
              if (action.inlinePopover) {
                this._openInlinePopover(action.inlinePopover, btnEl);
              } else if (action.inlineHybridPopover) {
                this._openInlineHybridPopover(action.inlineHybridPopover, btnEl);
              } else {
                action.onClick?.(item, e);
              }
            },
          });
          btnEl.setAttribute('data-action-id', action.id);
          this._trailingActionInstances.push(inst);
          actionsEl.appendChild(btnEl);
        }

        trailing.appendChild(actionsEl);

        if (overflow.length > 0) {
          // Overflow actions: collapsed into a single ArvoDropdownIconButton
          // (ellipsis-v). The dropdown owns its own ActionMenu surface; per-
          // row activation routes back to inlinePopover / inlineHybridPopover
          // / onClick the same way as the inline path.
          const overflowWrap = document.createElement('span');
          overflowWrap.className = 'arvo-menu-item__overflow';
          overflowWrap.addEventListener('click', (e: Event) => e.stopPropagation());

          const overflowHost = document.createElement('button') as HTMLButtonElement;
          // Last stop in the ArrowRight cycle; not Tab-reachable.
          overflowHost.tabIndex = -1;
          overflowWrap.appendChild(overflowHost);

          const overflowItems: MenuItemData[] = overflow.map((action) => ({
            id: action.id,
            label: action.ariaLabel ?? action.id,
            icon: action.icon,
            isDisabled: item.isDisabled || action.isDisabled,
          }));

          const overflowInst = ArvoDropdownIconButton.initialize(overflowHost, {
            icon: 'ellipsis-v',
            tooltip: 'More actions',
            variant: 'tertiary',
            size: 'sm',
            isCompact: true,
            isDisabled: item.isDisabled || this._isLoading,
            items: overflowItems,
            onSelect: (menuItem) => {
              const action = overflow.find((a) => a.id === menuItem.id);
              if (!action) return;
              const synthetic = new Event('click');
              if (action.inlinePopover) {
                this._openInlinePopover(action.inlinePopover, overflowHost);
              } else if (action.inlineHybridPopover) {
                this._openInlineHybridPopover(action.inlineHybridPopover, overflowHost);
              } else {
                action.onClick?.(item, synthetic);
              }
            },
          });

          this._overflowInstances.push(overflowInst);
          trailing.appendChild(overflowWrap);
        }
      }

      if (item.submenu) {
        const submenuIcon = document.createElement('span');
        submenuIcon.className = 'arvo-menu-item__submenu o9con o9con-angle-right';
        submenuIcon.setAttribute('aria-hidden', 'true');
        trailing.appendChild(submenuIcon);
      }

      if (isExternal) {
        const externalIcon = document.createElement('span');
        externalIcon.className = 'arvo-menu-item__external o9con o9con-external-link';
        externalIcon.setAttribute('aria-hidden', 'true');
        trailing.appendChild(externalIcon);
      }

      el.appendChild(trailing);
    }

    // Click handler. Anchor rows still bubble through activation logic;
    // when activation has no submenu / inline panel / switch and onSelect
    // does not return false, the menu closes and the browser follows the
    // anchor's native navigation.
    el.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this._handleItemActivation(idx);
    });

    // Pointer hover -> set active + open submenu only when hover trigger.
    // Inline popovers and inline hybrid popovers NEVER open on hover -- they
    // require an explicit click on the item or a trailing action. Hover-
    // opening a stateful, interactive panel from a menu item is surprising
    // and traps users in panels they did not intend to enter.
    el.addEventListener('pointerenter', () => {
      if (!item.isDisabled) {
        this._setActiveIndex(idx);
      }

      if (this._submenuTimer) {
        clearTimeout(this._submenuTimer);
        this._submenuTimer = null;
      }

      if (this._options.submenuTrigger === 'hover' && item.submenu && !item.isDisabled) {
        this._submenuTimer = setTimeout(() => {
          this._closeSubmenus();
          this._openSubmenu(idx);
        }, INLINE_HOVER_DELAY_MS);
      } else if (this._options.submenuTrigger === 'hover') {
        this._closeSubmenus();
      }
    });

    el.addEventListener('pointerleave', () => {
      if (this._submenuTimer) {
        clearTimeout(this._submenuTimer);
        this._submenuTimer = null;
      }
    });

    this._itemEls.push(el);
    this._scrollEl!.appendChild(el);

    // Wire the shared truncation tooltip (visual-only, no
    // `aria-describedby` -- matches Button / Toast / List). The full
    // label is already part of the row's visible accessible name.
    const labelEl = el.querySelector<HTMLElement>('.arvo-menu-item__lbl');
    if (labelEl && item.label) {
      const handle = attachTitleTruncationTooltip({
        triggerElement: el,
        element: labelEl,
        content: item.label,
        placement: 'top-center',
      });
      this._truncationHandles.push(handle);
    }
  }

  private _buildItemClasses(item: MenuItemData): string {
    const hasSecondary = !!item.secondaryLabel;
    const status = resolveStatus(item.status);
    return [
      'arvo-menu-item',
      hasSecondary && 'arvo-menu-item--multi-line',
      item.destructive && 'arvo-menu-item--destructive',
      status.modifier,
      this._options.actionsVisibility === 'hover' &&
        item.actions?.length &&
        'arvo-menu-item--actions-on-hover',
      item.active && 'active',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  private _getFilteredItems(): MenuItemData[] | ListGroup<MenuItemData>[] {
    if (!this._query) return this._options.items;

    const items = this._options.items;
    const filterOpts = { query: this._query, keys: [...FILTER_KEYS] };
    if (isGrouped(items)) {
      return filterGroups(items, filterOpts);
    }
    return filterItems(items as MenuItemData[], filterOpts);
  }

  private _handleFilterSearch(value: string): void {
    this._query = value;
    this._renderItems();
    this._activeIndex = -1;

    if (this._flatItems.length > 0) {
      this._setupArrowNav();
      // Suppress focus during typing -- search input retains DOM focus and
      // the active item is conveyed via `aria-activedescendant`.
      this._setActiveIndex(0, { suppressFocus: true });
    } else {
      this._arrowNav?.destroy();
      this._arrowNav = null;
    }

    if (this._searchCfg && this._query) {
      this._searchCfg.onFilter?.(this._query, this._flatItems.length);
    }

    this._updateSearchCounter();
    // Synchronously refresh the panel's position so the watcher's
    // `ResizeObserver` rAF callback (which would otherwise produce one
    // stale-position frame on `top-*` placements where y depends on the
    // float height) never gets to paint. Combined with the engine's
    // `lockPlacementOnFloatResize`, this fully eliminates the flicker the
    // user sees while typing in the filter.
    this._surface?.reposition();
  }

  private _handleFilterClear(): void {
    this._query = '';
    this._renderItems();
    this._activeIndex = -1;

    if (this._flatItems.length > 0) {
      this._setupArrowNav();
      this._setActiveIndex(0, { suppressFocus: true });
    }

    this._searchCfg?.onClear?.();
    this._updateSearchCounter();
    // Same rationale as `_handleFilterSearch` -- clearing the filter
    // re-renders the full list which resizes the float.
    this._surface?.reposition();
  }

  private _updateSearchCounter(): void {
    if (!this._searchCfg?.counter || !this._searchInstance) return;
    if (this._query) {
      const total = flattenItems(this._options.items).length;
      this._searchInstance.counter(this._flatItems.length, total);
    } else {
      this._searchInstance.counter();
    }
  }

  // ---------------------------------------------------------------------------
  // Trigger Events
  // ---------------------------------------------------------------------------

  private _bindTriggerEvents(): void {
    this._element?.addEventListener('click', this._boundHandleTriggerClick);
  }

  private _handleTriggerClick(): void {
    if (this._isDisabled) return;
    this.toggle();
  }

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  private _handleKeyDown(e: KeyboardEvent): void {
    if (this._inlinePanelStack && this._inlinePanelStack.getDepth() > 0) {
      return;
    }

    // Submenu-specific: ArrowLeft or Escape closes the submenu
    if (this._isSubmenu && (e.key === 'ArrowLeft' || e.key === 'Escape')) {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }

    // Tab / Shift+Tab: never close the menu. The focus trap installed in
    // open() keeps focus cycling inside the panel (only the search input
    // and the active row are tabbable -- trailing actions and the switch
    // are tabindex=-1). Closing on Tab is hostile to keyboard users who
    // expect the search input to remain reachable.
    if (e.key === 'Tab') {
      return;
    }

    // When the filter search input owns DOM focus, the panel keyboard
    // logic must step aside so the input's native behavior (typing,
    // including Space; cursor movement via ArrowLeft/Right; printable
    // characters) is preserved. The search wrapper's own keydown handler
    // (`_createSearchWrapper`) intercepts the keys that need menu
    // semantics -- ArrowDown/Up/Home/End move focus into the list,
    // Escape clears the filter or closes the menu, Enter activates the
    // current row. Any other key (notably Space) must reach the input
    // untouched: prior to this guard, Space was bubbling up to the panel
    // and arrow-nav was activating the currently active row as if the
    // user had pressed Enter on it.
    if (this._isSearchFocused()) {
      return;
    }

    // Horizontal nav for submenus / trailing actions
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      this._handleHorizontalNav(e);
      return;
    }

    // Activation keys (Enter / Space) on a trailing action button or the
    // overflow dropdown trigger MUST activate that button only -- never
    // the parent row. Without this guard, the arrow-nav delegation below
    // would synthesize an onSelect on the active row, firing
    // _handleItemActivation -> close() and dismissing the whole menu
    // before the action's own click handler (which would open an inline
    // popover or the overflow dropdown menu) ever runs.
    //
    // Mouse clicks are not affected: each trailing button's onClick
    // already e.stopPropagation()s. The keyboard path lacked the
    // equivalent because the keydown bubbles to the panel BEFORE the
    // native button click is synthesized.
    if (e.key === 'Enter' || e.key === ' ') {
      const focused = document.activeElement as HTMLElement | null;
      if (
        focused &&
        focused.closest(
          '.arvo-menu-item__actions, .arvo-menu-item__overflow',
        )
      ) {
        // Let the focused button's native Enter/Space -> click pathway
        // run untouched. We do NOT preventDefault or stopPropagation:
        // the button needs the keydown to synthesize its click.
        return;
      }
    }

    this._arrowNav?.handleKeyDown(e);
  }

  private _handleHorizontalNav(event: KeyboardEvent): void {
    const item = this._flatItems[this._activeIndex];
    if (!item) return;

    // Submenu rows take precedence: ArrowRight opens the submenu regardless
    // of any (mis-)configured trailing actions. ArrowLeft inside a submenu
    // is handled by the parent menu's own _handleKeyDown (see
    // `_isSubmenu` branch).
    if (event.key === 'ArrowRight' && item.submenu) {
      this._openSubmenu(this._activeIndex);
      event.preventDefault();
      return;
    }

    const buttons = this._getActiveRowActionButtons();
    if (buttons.length === 0) return;

    const activeEl = document.activeElement as HTMLElement | null;
    const focusedActionIndex =
      activeEl instanceof HTMLButtonElement ? buttons.indexOf(activeEl) : -1;

    if (event.key === 'ArrowRight') {
      if (focusedActionIndex === -1) {
        // Focus is on the row -- step into the first action.
        buttons[0].focus({ preventScroll: true });
        event.preventDefault();
      } else if (focusedActionIndex < buttons.length - 1) {
        // Step through the cycle.
        buttons[focusedActionIndex + 1].focus({ preventScroll: true });
        event.preventDefault();
      }
      // Already on the last action -- no-op (no wrapping).
      return;
    }

    if (event.key === 'ArrowLeft') {
      if (focusedActionIndex === 0) {
        // Step back from the first action to the row.
        const itemEl = this._itemEls[this._activeIndex];
        itemEl?.focus({ preventScroll: true });
        event.preventDefault();
      } else if (focusedActionIndex > 0) {
        buttons[focusedActionIndex - 1].focus({ preventScroll: true });
        event.preventDefault();
      }
      // Focus is on the row already (or somewhere unrelated) -- no-op.
    }
  }

  // Returns the ordered list of focusable trailing-action buttons (visible
  // cluster + overflow dropdown trigger) for the currently active row.
  // ArrowRight / ArrowLeft cycle through this list. The buttons themselves
  // carry tabindex=-1 so the Tab cycle skips them but `.focus()` still works.
  private _getActiveRowActionButtons(): HTMLButtonElement[] {
    const itemEl = this._itemEls[this._activeIndex];
    if (!itemEl) return [];
    return Array.from(
      itemEl.querySelectorAll<HTMLButtonElement>(
        '.arvo-menu-item__actions button, .arvo-menu-item__overflow button',
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Active Index
  // ---------------------------------------------------------------------------

  private _setActiveIndex(
    index: number,
    options?: { suppressFocus?: boolean; forceFocus?: boolean },
  ): void {
    const prev = this._activeIndex;
    this._activeIndex = index;

    // Roving tabindex: only the active item is tabbable so Tab from the
    // search input (or trigger) lands on it and the focus trap keeps focus
    // inside the panel.
    if (prev >= 0 && prev < this._itemEls.length && prev !== index) {
      this._itemEls[prev].setAttribute('tabindex', '-1');
    }

    if (index >= 0 && index < this._itemEls.length) {
      const el = this._itemEls[index];
      el.setAttribute('tabindex', '0');
      // `forceFocus` moves DOM focus into the list even while the search
      // input holds focus (used when the user presses ArrowDown/ArrowUp/Tab
      // to step from search into the items). Otherwise, never steal focus
      // from the search input mid-typing -- the active item is tabbable and
      // can be reached on the next Tab/Arrow press.
      if (options?.forceFocus || (!options?.suppressFocus && !this._isSearchFocused())) {
        el.focus({ preventScroll: true });
      }
      this._scrollIntoView(el);
    }
  }

  // Moves DOM focus from the search input into the option list. `edge`
  // selects the first or last enabled item.
  private _focusListFromSearch(edge: 'first' | 'last'): void {
    if (this._flatItems.length === 0) return;
    let target = -1;
    if (edge === 'first') {
      target = this._flatItems.findIndex(item => !item.isDisabled);
    } else {
      for (let i = this._flatItems.length - 1; i >= 0; i--) {
        if (!this._flatItems[i].isDisabled) {
          target = i;
          break;
        }
      }
    }
    if (target >= 0) this._setActiveIndex(target, { forceFocus: true });
  }

  private _isSearchFocused(): boolean {
    if (!this._searchInstance) return false;
    const ae = typeof document !== 'undefined' ? document.activeElement : null;
    if (!ae) return false;
    // ArvoSearch wraps an inner <input>; check if focus is anywhere inside
    // the search wrapper element.
    const wrap = this._panelEl?.querySelector('.arvo-action-menu__search');
    return !!wrap && wrap.contains(ae);
  }

  private _scrollIntoView(el: HTMLElement): void {
    if (!this._scrollEl) return;
    const containerRect = this._scrollEl.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();

    if (itemRect.bottom > containerRect.bottom) {
      this._scrollEl.scrollTop += itemRect.bottom - containerRect.bottom;
    } else if (itemRect.top < containerRect.top) {
      this._scrollEl.scrollTop -= containerRect.top - itemRect.top;
    }
  }

  // ---------------------------------------------------------------------------
  // Item Activation
  // ---------------------------------------------------------------------------

  private _handleItemActivation(index: number): void {
    const item = this._flatItems[index];
    if (!item || item.isDisabled) return;

    const itemEl = this._itemEls[index];

    if (item.submenu) {
      this._openSubmenu(index);
      return;
    }

    if (item.inlineHybridPopover) {
      this._openInlineHybridPopover(item.inlineHybridPopover, itemEl);
      return;
    }

    if (item.inlinePopover) {
      this._openInlinePopover(item.inlinePopover, itemEl);
      return;
    }

    if (item.switch) {
      this._switchInstances.get(item.id)?.toggle();
      return;
    }

    // Fire select event
    const event = new CustomEvent('action-menu:select', {
      bubbles: true,
      cancelable: true,
      detail: { item, index },
    });
    const dispatched = this._element?.dispatchEvent(event) ?? true;

    const callbackResult = this._options.onSelect?.(item, index);

    if (this._options.closeOnSelect && callbackResult !== false && dispatched) {
      this.close();
    }
  }

  // ---------------------------------------------------------------------------
  // Submenus
  // ---------------------------------------------------------------------------

  private _openSubmenu(parentIndex: number): void {
    const item = this._flatItems[parentIndex];
    if (!item?.submenu) return;

    const parentEl = this._itemEls[parentIndex];
    parentEl.setAttribute('aria-expanded', 'true');

    // Submenus are nested ActionMenu instances that register with the hub
    // under the parent's overlay id with `relation: 'submenu'`. The hub
    // keeps the parent + child stack alive together; outside-click closes
    // the contiguous chain.
    const submenu = ArvoActionMenu._createSubmenu(parentEl, {
      items: item.submenu,
      placement: 'right-start',
      submenuWidth: this._options.submenuWidth,
      submenuTrigger: this._options.submenuTrigger,
      closeOnSelect: this._options.closeOnSelect,
      onClose: () => {
        parentEl.setAttribute('aria-expanded', 'false');
        parentEl.focus({ preventScroll: true });
      },
      onSelect: (selectedItem, selectedIndex) => {
        const result = this._options.onSelect?.(selectedItem, selectedIndex);
        if (this._options.closeOnSelect && result !== false) {
          this.close();
        }
        return false;
      },
    }, this);

    this._submenus.set(item.id, submenu);
    submenu.open();
  }

  private _closeSubmenus(): void {
    for (const [, submenu] of this._submenus) {
      submenu.destroy();
    }
    this._submenus.clear();
  }

  private _closeAll(): void {
    if (this._parentMenu) {
      this._parentMenu._closeAll();
    } else {
      this.close();
    }
  }

  // ---------------------------------------------------------------------------
  // Inline Panel Stack
  // ---------------------------------------------------------------------------

  private _getOrCreateInlineStack(): InlinePanelStack {
    if (!this._inlinePanelStack) {
      this._inlinePanelStack = createInlinePanelStack({
        host: this._panelEl!,
        containerClass: 'arvo-action-menu__inline-panel',
      });
    }
    return this._inlinePanelStack;
  }

  private _destroyInlineInstance(entryId: string): void {
    const instance = this._inlinePanelInstances.get(entryId);
    instance?.destroy();
    this._inlinePanelInstances.delete(entryId);
  }

  private _closeAllInlinePanels(): void {
    if (!this._inlinePanelStack) return;

    for (const entry of this._inlinePanelStack.getEntries()) {
      this._destroyInlineInstance(entry.id);
    }
    this._inlinePanelStack.popAll();
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

  private _openInlinePopover(config: MenuInlinePopoverConfig, sourceEl: HTMLElement): void {
    if (config.onOpen?.() === false) return;

    // Stack push (do NOT _closeAllInlinePanels here). The shared
    // `inline-panel-stack` mixin overlays the menu visually via
    // `position: absolute; inset: 0`, so the menu content is replaced
    // visually whether one or many layers are pushed. This matches the
    // React ActionMenu and HybridPopover behavior so JS and React are at
    // parity for nested inline popovers.
    const stack = this._getOrCreateInlineStack();
    const entryId = `inline-pop-${++_inlineIdCounter}`;
    const hostEl = document.createElement('div');

    const hasBackButton = config.hasBackButton !== false;
    const isClosable = config.isClosable !== false;

    // Optional explicit sizing. Width is forwarded to the ArvoPopover
    // instance (sets --arvo-popover-width); ArvoPopover has no height
    // option, so an explicit height is applied as --arvo-popover-height on
    // the host (inherited by the panel). The action-menu first-layer rule
    // honors both vars, falling back to natural content sizing when unset.
    if (config.height != null) {
      hostEl.style.setProperty(
        '--arvo-popover-height',
        typeof config.height === 'number' ? `${config.height}px` : config.height,
      );
    }

    const popover = ArvoPopover.initialize(hostEl, {
      isInline: true,
      variant: 'edge',
      title: config.title ?? '',
      hasHeader: !!(config.title || hasBackButton || isClosable),
      isClosable,
      hasBackButton,
      width: config.width,
      content: config.content,
      actions: config.actions,
      isInteractive: true,
      onBack: () => {
        config.onBack?.();
        this._popInlinePanel('back');
      },
      // Closing the inline popover via the header X button, a footer
      // action, or its own outside-click handler should pop just THIS
      // inline layer back to the menu list -- not destroy the entire menu
      // tree. Outside clicks that land truly outside the action menu are
      // handled by the overlay hub, which closes both the popover overlay
      // entry AND the parent action menu in the same gesture.
      onClose: () => {
        if (config.onClose?.() === false) return false;
        this._popInlinePanel('default');
        return false;
      },
    });

    stack.push({
      id: entryId,
      kind: 'popover',
      element: hostEl,
      openedFrom: sourceEl,
      onBack: () => config.onBack?.(),
      onClose: () => (config.onClose?.() === false ? false : undefined),
    });

    this._inlinePanelInstances.set(entryId, popover);
    popover.open();
  }

  private _openInlineHybridPopover(
    config: MenuInlineHybridPopoverConfig,
    sourceEl: HTMLElement,
  ): void {
    if (config.onOpen?.() === false) return;

    // Stack push (matches React behavior).
    const stack = this._getOrCreateInlineStack();
    const entryId = `inline-hybrid-${++_inlineIdCounter}`;
    const hostEl = document.createElement('div');

    const hybrid = ArvoHybridPopover.initialize(hostEl, {
      isInline: true,
      parent: this._panelId,
      title: config.title ?? '',
      variant: config.variant ?? 'multi',
      items: config.items ?? [],
      hasBackButton: config.hasBackButton !== false,
      isClosable: true,
      width: config.width,
      height: config.height,
      onBack: () => {
        config.onBack?.();
        this._popInlinePanel('back');
      },
      // See _openInlinePopover above. Header X / footer action / panel
      // outside-click pop just this layer; the overlay hub still closes
      // the menu tree on a true-outside gesture.
      onClose: () => {
        if (config.onClose?.() === false) return false;
        this._popInlinePanel('default');
        return false;
      },
    });

    stack.push({
      id: entryId,
      kind: 'hybrid',
      element: hostEl,
      openedFrom: sourceEl,
      onBack: () => config.onBack?.(),
      onClose: () => (config.onClose?.() === false ? false : undefined),
    });

    this._inlinePanelInstances.set(entryId, hybrid);
    hybrid.open();
  }

  // ---------------------------------------------------------------------------
  // Arrow Nav Setup
  // ---------------------------------------------------------------------------

  private _setupArrowNav(): void {
    this._arrowNav?.destroy();

    this._arrowNav = createArrowNav({
      items: this._itemEls,
      orientation: 'vertical',
      wrap: true,
      skipDisabled: (i: number) => this._flatItems[i]?.isDisabled === true,
      typeAhead: this._searchCfg
        ? undefined
        : { getLabel: (i: number) => this._flatItems[i]?.label ?? '' },
      onNavigate: (_el: HTMLElement, index: number) => this._setActiveIndex(index),
      onSelect: (_el: HTMLElement, index: number) => this._handleItemActivation(index),
      onEscape: () => this.close(),
    });
  }

  // ---------------------------------------------------------------------------
  // Focus Management
  // ---------------------------------------------------------------------------

  private _focusInitial(): void {
    if (this._searchCfg && this._searchEl) {
      const input = this._searchEl.querySelector('input');
      input?.focus({ preventScroll: true });
      // Seed the roving tabindex on the first enabled item so Tab / ArrowDown
      // can move focus straight into the list. DOM focus stays on the search.
      const firstEnabled = this._flatItems.findIndex(item => !item.isDisabled);
      if (firstEnabled >= 0) {
        this._setActiveIndex(firstEnabled, { suppressFocus: true });
      }
    } else if (this._flatItems.length > 0) {
      const firstEnabled = this._flatItems.findIndex(item => !item.isDisabled);
      if (firstEnabled >= 0) {
        this._setActiveIndex(firstEnabled);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    if (this._isOpen || this._isDisabled) return;
    if (this._options.onOpen?.() === false) return;

    const event = new CustomEvent('action-menu:open', {
      bubbles: true,
      cancelable: true,
    });
    if (!this._element?.dispatchEvent(event)) return;

    this._isOpen = true;
    this._closeReason = null;
    this._options.onOpenChange?.(true);

    // The engine writes aria-expanded, opens the hub entry, runs the enter
    // transition, activates the focus trap, and starts the position watcher.
    void this._surface?.open();
  }

  close(): void {
    if (!this._isOpen) return;
    if (this._options.onClose?.() === false) return;

    const event = new CustomEvent('action-menu:close', {
      bubbles: true,
      cancelable: true,
    });
    if (!this._element?.dispatchEvent(event)) return;

    // Mark this close path as programmatic so _handleSurfaceClosed (which
    // also runs on engine-driven dismissal) can stay silent for the latter.
    this._closeReason = 'programmatic';
    void this._surface?.close();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  toggle(force?: boolean): void {
    const shouldOpen = force !== undefined ? force : !this._isOpen;
    if (shouldOpen) this.open();
    else this.close();
  }

  updateItems(items: MenuItemData[] | ListGroup<MenuItemData>[]): void {
    this._options.items = items;
    this._query = '';
    this._searchInstance?.clear();

    if (this._isOpen) {
      this._renderItems();
      this._setupArrowNav();

      if (this._flatItems.length > 0) {
        this._setActiveIndex(0);
      } else {
        this._activeIndex = -1;
      }
    }
  }

  setLoading(isLoading: boolean): void {
    this._isLoading = isLoading;
    this._options.isLoading = isLoading;

    if (!this._panelEl) return;
    this._panelEl.classList.toggle('loading', isLoading);

    if (isLoading) {
      this._panelEl.setAttribute('aria-busy', 'true');
    } else {
      this._panelEl.removeAttribute('aria-busy');
    }

    if (this._isOpen) {
      this._renderItems();
      if (!isLoading && this._flatItems.length > 0) {
        this._setupArrowNav();
        const firstEnabled = this._flatItems.findIndex(item => !item.isDisabled);
        if (firstEnabled >= 0) {
          this._setActiveIndex(firstEnabled);
        }
      } else {
        this._arrowNav?.destroy();
        this._arrowNav = null;
        this._activeIndex = -1;
      }
    }
  }

  setMenuWidth(width: string | number | null | undefined): void {
    this._options.menuWidth = width ?? null;
    if (!this._isSubmenu) this._applyPanelWidth();
  }

  setSubmenuWidth(width: string | number | null | undefined): void {
    this._options.submenuWidth = width ?? null;
    if (this._isSubmenu) this._applyPanelWidth();
    for (const [, submenu] of this._submenus) {
      submenu.setSubmenuWidth(width);
    }
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._isDisabled;
    }

    this._isDisabled = state;
    this._options.isDisabled = state;

    if (state) {
      this._element?.setAttribute('aria-disabled', 'true');
      if (this._isOpen) this.close();
    } else {
      this._element?.removeAttribute('aria-disabled');
    }
  }

  destroy(): void {
    if (this._submenuTimer) {
      clearTimeout(this._submenuTimer);
      this._submenuTimer = null;
    }

    if (this._isOpen) {
      this._isOpen = false;
      this._closeAllInlinePanels();
      this._closeSubmenus();
      this._arrowNav?.destroy();
      this._arrowNav = null;
      this._panelEl?.removeEventListener('keydown', this._boundHandleKeyDown);
    }

    // Tearing down the surface unregisters the hub entry, deactivates the
    // focus trap, destroys the position watcher, and removes the engine-
    // managed aria-haspopup / aria-controls / aria-expanded attributes from
    // the trigger.
    this._surface?.destroy();
    this._surface = null;

    const el = this._element;
    if (el) {
      el.removeEventListener('click', this._boundHandleTriggerClick);
      el.removeAttribute('aria-disabled');
    }

    this._destroyTrailingActions();
    this._destroySwitchInstances();
    this._destroyEmptyState();

    if (this._inlinePanelTimer) {
      clearTimeout(this._inlinePanelTimer);
      this._inlinePanelTimer = null;
    }

    this._inlinePanelStack?.destroy();
    this._inlinePanelStack = null;
    this._inlinePanelInstances.clear();

    this._searchInstance?.destroy();
    this._searchInstance = null;

    if (this._panelEl) {
      this._panelEl.remove();
    }

    this._truncationHandles.forEach((h) => h.destroy());
    this._truncationHandles = [];

    this._element = null;
    this._panelEl = null;
    this._scrollEl = null;
    this._searchEl = null;
    this._flatItems = [];
    this._itemEls = [];
  }

  // ---------------------------------------------------------------------------
  // Internal Cleanup
  // ---------------------------------------------------------------------------

  private _destroyTrailingActions(): void {
    for (const inst of this._trailingActionInstances) {
      inst.destroy();
    }
    this._trailingActionInstances = [];
    for (const inst of this._overflowInstances) {
      inst.destroy();
    }
    this._overflowInstances = [];
  }

  private _destroySwitchInstances(): void {
    for (const inst of this._switchInstances.values()) {
      inst.destroy();
    }
    this._switchInstances.clear();
  }

  private _destroyEmptyState(): void {
    this._emptyStateInstance?.destroy();
    this._emptyStateInstance = null;
  }

  private _dispatchEvent(eventName: string, detail: Record<string, unknown> = {}): void {
    this._element?.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, cancelable: true, detail }),
    );
  }
}
