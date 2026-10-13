import {
  createOverflowManager,
  createSortableList,
  isModKey,
  type ListGroup,
  type OverflowManager,
  type SortableHandle,
} from '@arvo/core';
import {
  attachTitleTruncationTooltip,
  type TitleTruncationHandle,
} from '@arvo/utils';
import {
  ArvoIconButton,
  type ArvoIconButtonStatusConfig,
} from '../IconButton/IconButton';
import { ArvoToggleButton } from '../ToggleButton/ToggleButton';
import {
  ArvoDropdownIconButton,
  type ArvoDropdownIconButtonOptions,
} from '../DropdownIconButton/DropdownIconButton';
import { ArvoButton } from '../Button/Button';
import { ArvoBadge } from '../Badge/Badge';
import type { ArvoBadgeSemanticType } from '../Badge/Badge';
import { ArvoStatus } from '../Status/Status';
import type { ArvoStatusType } from '../Status/Status';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import type { ArvoMessageAlertType } from '../MessageAlert/MessageAlert';
import {
  ArvoActionMenu,
  type ArvoActionMenuOptions,
  type MenuItemData,
  type MenuItemAction,
} from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Re-exports (mirrors React twin surface)
// ---------------------------------------------------------------------------

export type {
  ArvoBadgeSemanticType,
  ArvoStatusType,
  ArvoMessageAlertType,
  MenuItemData,
  ArvoIconButtonStatusConfig,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabItem {
  id: string;
  label: string;
  panelId?: string;
  icon?: string;
  isDisabled?: boolean;
  pinned?: boolean;
  isClosable?: boolean;
  order?: number;
  tooltip?: string;
  /**
   * Explicit override for the tab's accessible name. When omitted, the
   * Tabstrip composes a name of the form
   * `"<label> tab[, selected][, <badge>][, <alertLabel>][, status: <statusLabel>][, pinned]"`
   * so screen-reader users hear inline-slot state alongside the label.
   */
  ariaLabel?: string;
  /**
   * Inline badge slot. Renders `ArvoBadge size="sm"` with `hasBadgeIcon`
   * forced to `false`. When `tooltip` is provided it forwards as the
   * badge's hover tooltip.
   */
  badge?: { label: string; semanticType?: ArvoBadgeSemanticType; tooltip?: string };
  alert?: { label?: string; type?: ArvoMessageAlertType };
  /**
   * Inline status slot. Always rendered at size `'sm'`. When `tooltip`
   * is provided it replaces `label` as the ArvoStatus hover tooltip
   * (`label` is still used for the composed accessible name).
   */
  status?: { label: string; type?: ArvoStatusType; tooltip?: string };
  menuItems?: MenuItemData[];
  /**
   * Status overlay rendered on the per-tab pin action button.
   */
  pinActionStatus?: ArvoIconButtonStatusConfig | null;
  /** Same shape and rules as `pinActionStatus`, applied to the close button. */
  closeActionStatus?: ArvoIconButtonStatusConfig | null;
}

/**
 * Scoped escape-hatch bag for the per-tab `ArvoDropdownIconButton`. The
 * per-tab menu is always rendered with `isCompact: true`; the bag
 * intentionally excludes `isCompact`. Mirrors the React twin's
 * `TabstripMenuProps` exactly.
 */
export type TabstripMenuProps = Pick<
  ArvoDropdownIconButtonOptions,
  'placement' | 'maxHeight' | 'hasGroupDividers' | 'search' | 'menuProps'
>;

/**
 * Scoped escape-hatch bag for the overflow `ArvoActionMenu` ("More tabs").
 * `placement` is parent-owned (`bottom-end`) and intentionally excluded.
 */
export type TabstripOverflowMenuProps = Pick<
  ArvoActionMenuOptions,
  'maxHeight' | 'hasGroupDividers' | 'search' | 'actionsVisibility' | 'menuWidth' | 'submenuWidth'
>;

export interface ArvoTabstripOptions {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'lg';
  /** Default `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical';
  tabs?: TabItem[];
  selectedId?: string | null;
  /**
   * Uncontrolled initial selected tab id. Only consulted when `selectedId`
   * is omitted. Mirrors the React `defaultSelectedId` prop.
   */
  defaultSelectedId?: string | null;
  /** Default `'automatic'` -- arrow keys also activate. `'manual'` -- only Enter/Space activate. */
  activationMode?: 'manual' | 'automatic';
  isFullWidth?: boolean;
  isClosable?: boolean;
  isPinnable?: boolean;
  isReorderable?: boolean;
  /** Show the bottom border rule. Default `true`. Horizontal only. */
  hasTabstripBorder?: boolean;
  /** Enable overflow detection and overflow dropdown. Default `true`. Horizontal only. */
  hasOverflow?: boolean;
  /** Show the Add-New button. Default `false`. Horizontal only. */
  hasAddButton?: boolean;
  /** Label for the Add-New button. Default `'Add New'`. */
  addButtonLabel?: string;
  isAddDisabled?: boolean;
  /** When tabs.length >= maxTabs the Add-New button is automatically disabled. */
  maxTabs?: number;
  /** Which tab to auto-select when the selected tab is removed. Default `'select-nearest'`. */
  closeBehavior?: 'select-previous' | 'select-next' | 'select-nearest';
  isDisabled?: boolean;
  isLoading?: boolean;
  /** Per-tab dropdown options. The per-tab dropdown is always compact. */
  menuProps?: TabstripMenuProps;
  /** Overflow menu options. */
  overflowMenuProps?: TabstripOverflowMenuProps;
  onSelect?: (detail: { id: string; index: number }) => void;
  /**
   * Callback when a tab is closed (close button click, Delete/Backspace
   * on a focused closable tab, or `Close tab` / `Close other tabs` /
   * `Close tabs to the right` chosen from the per-tab action menu).
   * The Tabstrip OWNS the tab list and by DEFAULT removes the closed
   * tab from its internal `tabs` array AFTER this callback returns. The
   * consumer can cancel that default by:
   *   - returning `false` from this callback, OR
   *   - calling `event.preventDefault()` on the matching cancelable
   *     `tabs:close` CustomEvent.
   * Either signal suppresses the internal removal so the tab remains in
   * the strip (useful when the consumer wants to confirm a destructive
   * close, defer until a save, or fully own the data model).
   */
  onClose?: (detail: { id: string; index: number }) => boolean | void;
  onPin?: (detail: { id: string; pinned: boolean; tabOrder: string[] }) => void;
  onTabAdd?: () => void;
  onTabReorder?: (tabs: TabItem[]) => void;
  onOverflowOpen?: () => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoTabstripOptions,
    | 'onSelect'
    | 'onClose'
    | 'onPin'
    | 'onTabAdd'
    | 'onTabReorder'
    | 'onOverflowOpen'
    | 'selectedId'
    | 'defaultSelectedId'
    | 'maxTabs'
    | 'menuProps'
    | 'overflowMenuProps'
  >
> & {
  selectedId: string | null;
  maxTabs: number | undefined;
  menuProps: TabstripMenuProps | null;
  overflowMenuProps: TabstripOverflowMenuProps | null;
  onSelect: ((detail: { id: string; index: number }) => void) | null;
  onClose: ((detail: { id: string; index: number }) => boolean | void) | null;
  onPin: ((detail: { id: string; pinned: boolean; tabOrder: string[] }) => void) | null;
  onTabAdd: (() => void) | null;
  onTabReorder: ((tabs: TabItem[]) => void) | null;
  onOverflowOpen: (() => void) | null;
};

interface TabEntry {
  item: TabItem;
  el: HTMLDivElement;
  leftEl: HTMLSpanElement;
  lblEl: HTMLSpanElement;
  lblTextEl: HTMLSpanElement;
  icoEl: HTMLSpanElement | null;
  actionsEl: HTMLSpanElement | null;
  menuBtn: ArvoDropdownIconButton | null;
  /** Visible per-tab menu trigger button element (when rendered) -- used
   *  by the keyboard / right-click handlers to programmatically toggle
   *  the dropdown via a synthesized click. */
  menuBtnEl: HTMLButtonElement | null;
  /** Per-tab pin / unpin affordance. Always an `ArvoToggleButton`:
   *  `icon=push-pin`, `selectedIcon=push-pinned`, `isSelected` tracks
   *  the tab's pinned state, and `onSelectedChange` flips it. */
  pinBtn: ArvoToggleButton | null;
  closeBtn: ArvoIconButton | null;
  /** Hidden `ArvoActionMenu` mounted on tabs that have default actions
   *  (pin / close / move) but no visible ellipsis dropdown. Provides the
   *  Shift+F10 / right-click / Ctrl+Shift+\\ context-menu target so the
   *  keyboard surface stays complete even without an inline trigger. */
  hiddenMenu: ArvoActionMenu | null;
  hiddenMenuAnchorEl: HTMLButtonElement | null;
  skelEl: HTMLSpanElement | null;
  badgeEl: HTMLSpanElement | null;
  badgeInstance: ArvoBadge | null;
  statusEl: HTMLSpanElement | null;
  statusInstance: ArvoStatus | null;
  alertEl: HTMLSpanElement | null;
  alertInstance: ArvoMessageAlert | null;
  /**
   * Truncation tooltip handle. Renders the full label on hover/focus
   * ONLY when the visible label is ellipsis-truncated by the
   * `__tab-lbl-text` `text-overflow: ellipsis` rule. Mirrors the
   * `attachTitleTruncationTooltip` pattern used by ArvoButton so the
   * tab feels consistent with the rest of the design system.
   */
  truncationHandle: TitleTruncationHandle | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortTabs(tabs: TabItem[]): TabItem[] {
  const pinned = tabs.filter((t) => t.pinned);
  const unpinned = tabs.filter((t) => !t.pinned);

  const byOrder = (a: TabItem, b: TabItem) => {
    const aO = a.order ?? Infinity;
    const bO = b.order ?? Infinity;
    if (aO !== Infinity || bO !== Infinity) return aO - bO;
    return 0;
  };

  pinned.sort(byOrder);
  unpinned.sort(byOrder);
  return [...pinned, ...unpinned];
}

function getTabOrder(tabs: TabItem[]): string[] {
  return sortTabs(tabs).map((t) => t.id);
}

/**
 * Compose a tab's accessible name (per WAI-ARIA Tabs, Spec 7.2). Mirrors
 * the React twin's `composeAriaLabel` exactly so cross-platform a11y
 * announcements stay in lockstep.
 */
function composeAriaLabel(tab: TabItem, isSelected: boolean): string {
  if (tab.ariaLabel) return tab.ariaLabel;
  const parts: string[] = [`${tab.label} tab`];
  if (isSelected) parts.push('selected');
  if (tab.badge?.label) parts.push(tab.badge.label.toLowerCase());
  if (tab.alert) {
    parts.push(tab.alert.label ?? 'contains validation issues');
  }
  if (tab.status?.label) {
    parts.push(`status: ${tab.status.label.toLowerCase()}`);
  }
  if (tab.pinned) parts.push('pinned');
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Default per-tab menu action ids -- internal sentinels prefixed with
// `__tabstrip:` so they cannot collide with consumer-supplied menu item
// ids. Kept in lockstep with the React twin.
// ---------------------------------------------------------------------------

const TAB_MENU_ID = {
  PIN: '__tabstrip:pin',
  UNPIN: '__tabstrip:unpin',
  CLOSE: '__tabstrip:close',
  CLOSE_OTHERS: '__tabstrip:close-others',
  CLOSE_RIGHT: '__tabstrip:close-right',
  MOVE_LEFT: '__tabstrip:move-left',
  MOVE_RIGHT: '__tabstrip:move-right',
  MOVE_START: '__tabstrip:move-start',
  MOVE_END: '__tabstrip:move-end',
} as const;

interface DefaultActionFlags {
  isPinnable: boolean;
  isClosable: boolean;
  isReorderable: boolean;
  isHorizontal: boolean;
}

/**
 * Build the default per-tab action menu items. Per the latest UX direction
 * the tab context menu is icon-less -- the action labels carry the
 * meaning on their own and the trailing shortcut hint is the only
 * decorative slot. Shortcuts are authored in the canonical
 * developer format (`'Ctrl+P'`); the renderer normalizes the display
 * to the active OS (`Ctrl P` on Windows / Linux, `\u2318 P` on macOS)
 * via `formatShortcutDisplay`.
 */
function buildDefaultMenuItems(
  tab: TabItem,
  flags: DefaultActionFlags,
  globalClosable: boolean,
): MenuItemData[] {
  const items: MenuItemData[] = [];
  const tabClosable = tab.isClosable ?? globalClosable;

  if (flags.isPinnable && flags.isHorizontal && !tab.isDisabled) {
    items.push({
      id: tab.pinned ? TAB_MENU_ID.UNPIN : TAB_MENU_ID.PIN,
      label: tab.pinned ? 'Unpin tab' : 'Pin tab',
      shortcut: 'Ctrl+P',
    });
  }

  if (tabClosable && flags.isHorizontal && !tab.pinned && !tab.isDisabled) {
    items.push({
      id: TAB_MENU_ID.CLOSE,
      label: 'Close tab',
      shortcut: 'Del',
    });
    items.push({ id: TAB_MENU_ID.CLOSE_OTHERS, label: 'Close other tabs' });
    items.push({
      id: TAB_MENU_ID.CLOSE_RIGHT,
      label: 'Close tabs to the right',
    });
  }

  if (flags.isReorderable && flags.isHorizontal && !tab.isDisabled) {
    items.push({
      id: TAB_MENU_ID.MOVE_LEFT,
      label: 'Move left',
      shortcut: 'Ctrl+ArrowLeft',
    });
    items.push({
      id: TAB_MENU_ID.MOVE_RIGHT,
      label: 'Move right',
      shortcut: 'Ctrl+ArrowRight',
    });
    items.push({
      id: TAB_MENU_ID.MOVE_START,
      label: 'Move to start',
      shortcut: 'Ctrl+Home',
    });
    items.push({
      id: TAB_MENU_ID.MOVE_END,
      label: 'Move to end',
      shortcut: 'Ctrl+End',
    });
  }

  return items;
}

function composeTabMenu(
  tab: TabItem,
  flags: DefaultActionFlags,
  globalClosable: boolean,
): MenuItemData[] | ListGroup<MenuItemData>[] | null {
  const consumer = tab.menuItems ?? [];
  const defaults = buildDefaultMenuItems(tab, flags, globalClosable);
  if (consumer.length === 0 && defaults.length === 0) return null;
  if (consumer.length === 0) return defaults;
  if (defaults.length === 0) return consumer;
  return [
    { id: '__tabstrip:group-consumer', items: consumer },
    { id: '__tabstrip:group-defaults', items: defaults },
  ];
}

function flattenMenuPayload(
  payload: MenuItemData[] | ListGroup<MenuItemData>[] | null,
): MenuItemData[] {
  if (!payload || payload.length === 0) return [];
  if ('items' in payload[0]) {
    return (payload as ListGroup<MenuItemData>[]).flatMap((g) => g.items);
  }
  return payload as MenuItemData[];
}

function payloadIsGrouped(
  payload: MenuItemData[] | ListGroup<MenuItemData>[] | null,
): boolean {
  return (
    Array.isArray(payload) && payload.length > 0 && 'items' in payload[0]
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoTabstrip {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;

  private _listEl: HTMLDivElement | null = null;
  private _indicatorEl: HTMLSpanElement | null = null;
  private _rightClusterEl: HTMLDivElement | null = null;
  private _overflowWrapperEl: HTMLDivElement | null = null;
  private _overflowTriggerInstance: ArvoIconButton | null = null;
  private _overflowMenuInstance: ArvoActionMenu | null = null;
  private _overflowBtnEl: HTMLButtonElement | null = null;
  private _addBtnWrapperEl: HTMLDivElement | null = null;
  /** The current Add-New affordance. ArvoButton when there is room;
   *  ArvoIconButton when space-constrained (overflow active). */
  private _addBtnInstance: ArvoButton | ArvoIconButton | null = null;
  /**
   * Tracks the current Add-New affordance shape so we only rebuild the
   * inner button when the strip flips between expanded  compact, not
   * on every overflow recalculation.
   */
  private _addBtnIsCompact = false;
  private _dividerEl: HTMLSpanElement | null = null;
  private _tabs: TabEntry[] = [];
  private _displayOrder: TabItem[] = [];
  private _hiddenTabIds: Set<string> = new Set();
  private _overflowMgr: OverflowManager | null = null;
  private _sortable: SortableHandle | null = null;
  private _indicatorResizeObserver: ResizeObserver | null = null;

  private _boundHandleKeyDown: (e: KeyboardEvent) => void;
  private _boundHandleClick: (e: Event) => void;
  private _boundHandleContextMenu: (e: MouseEvent) => void;

  static readonly VARIANTS = ['primary', 'secondary'] as const;
  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    variant: 'primary',
    size: 'lg',
    orientation: 'horizontal',
    tabs: [],
    selectedId: null,
    activationMode: 'automatic',
    isFullWidth: false,
    isClosable: false,
    isPinnable: false,
    isReorderable: false,
    // Off by default per the latest UX guidance -- consumers opt in
    // explicitly when the surrounding layout doesn't already supply a
    // visual seam between the tab row and its content panel.
    hasTabstripBorder: false,
    hasOverflow: true,
    hasAddButton: false,
    addButtonLabel: 'Add New',
    isAddDisabled: false,
    maxTabs: undefined,
    closeBehavior: 'select-nearest',
    isDisabled: false,
    isLoading: false,
    menuProps: null,
    overflowMenuProps: null,
    onSelect: null,
    onClose: null,
    onPin: null,
    onTabAdd: null,
    onTabReorder: null,
    onOverflowOpen: null,
  };

  static initialize(element: HTMLElement, options?: ArvoTabstripOptions): ArvoTabstrip {
    return new ArvoTabstrip(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoTabstripOptions) {
    this._element = element;

    const variant =
      options?.variant &&
      (ArvoTabstrip.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoTabstrip.DEFAULTS.variant;

    const size =
      options?.size &&
      (ArvoTabstrip.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoTabstrip.DEFAULTS.size;

    const seededSelectedId =
      options?.selectedId !== undefined
        ? (options.selectedId ?? null)
        : (options?.defaultSelectedId !== undefined ? (options.defaultSelectedId ?? null) : null);

    this._options = {
      ...ArvoTabstrip.DEFAULTS,
      ...options,
      variant,
      size,
      tabs: options?.tabs ? [...options.tabs] : [],
      selectedId: seededSelectedId,
      maxTabs: options?.maxTabs,
      menuProps: options?.menuProps ?? null,
      overflowMenuProps: options?.overflowMenuProps ?? null,
      onSelect: options?.onSelect ?? null,
      onClose: options?.onClose ?? null,
      onPin: options?.onPin ?? null,
      onTabAdd: options?.onTabAdd ?? null,
      onTabReorder: options?.onTabReorder ?? null,
      onOverflowOpen: options?.onOverflowOpen ?? null,
    };


    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleContextMenu = this._handleContextMenu.bind(this);

    this._render();
    this._bindEvents();
    this._setupOverflowDetection();
    this._setupSortable();
    this._setupIndicatorObserver();

    if (!this._options.selectedId && this._options.tabs.length > 0) {
      const first = this._options.tabs.find((t) => !t.isDisabled);
      if (first) {
        this._options.selectedId = first.id;
        this._syncSelection();
      }
    }
  }

  private _computeDisplayOrder(): TabItem[] {
    return sortTabs(this._options.tabs);
  }

  // -- Rendering -----------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    this._tabs = [];
    this._displayOrder = this._computeDisplayOrder();

    const {
      variant,
      size,
      orientation,
      isFullWidth,
      isDisabled,
      isLoading,
      hasOverflow,
      hasAddButton,
      hasTabstripBorder,
    } = this._options;
    const isHorizontal = orientation === 'horizontal';

    el.classList.add(
      'arvo-tabs',
      `arvo-tabs--${variant}`,
      `arvo-tabs--${size}`,
      `arvo-tabs--${orientation}`,
    );
    if (isFullWidth) el.classList.add('arvo-tabs--full-width');
    if (isHorizontal && hasOverflow) el.classList.add('arvo-tabs--overflow');
    if (isDisabled) el.classList.add('is-disabled');
    if (isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    }

    this._listEl = document.createElement('div');
    this._listEl.className = 'arvo-tabs__list';
    this._listEl.setAttribute('role', 'tablist');
    this._listEl.setAttribute('aria-orientation', orientation);
    this._listEl.setAttribute('aria-label', 'Tabs');

    for (const tab of this._displayOrder) {
      const entry = this._createTabEntry(tab);
      this._tabs.push(entry);
      this._listEl.appendChild(entry.el);
    }

    // Animated active-tab indicator (rendered for both variants; SCSS
    // hides the rail on `--secondary` strips so secondary keeps its
    // static box-shadow indicator unchanged).
    this._indicatorEl = document.createElement('span');
    this._indicatorEl.className = 'arvo-tabs__indicator';
    this._indicatorEl.setAttribute('aria-hidden', 'true');
    this._indicatorEl.dataset.indicatorState = 'hidden';
    this._listEl.appendChild(this._indicatorEl);

    el.appendChild(this._listEl);

    const needsRightCluster =
      isHorizontal && (hasOverflow || hasAddButton);

    if (needsRightCluster) {
      this._rightClusterEl = document.createElement('div');
      this._rightClusterEl.className = 'arvo-tabs__right';
      el.appendChild(this._rightClusterEl);
    }

    // Overflow button - horizontal + hasOverflow only
    if (isHorizontal && hasOverflow && this._rightClusterEl) {
      this._overflowWrapperEl = document.createElement('div');
      this._overflowWrapperEl.className = 'arvo-tabs__overflow-btn';
      this._overflowBtnEl = document.createElement('button');
      this._overflowWrapperEl.appendChild(this._overflowBtnEl);

      this._overflowTriggerInstance = ArvoIconButton.initialize(
        this._overflowBtnEl,
        {
          icon: 'ellipsis-v',
          // Tertiary -- the overflow trigger is a strip utility, not a
          // primary call-to-action.
          variant: 'tertiary',
          size: this._iconBtnSize(),
          tooltip: 'More tabs',
          isDisabled,
          isLoading,
        },
      );

      this._overflowMenuInstance = ArvoActionMenu.initialize(
        this._overflowBtnEl,
        {
          ...(this._options.overflowMenuProps ?? undefined),
          items: [],
          placement: 'bottom-end',
          closeOnSelect: true,
          actionsVisibility:
            this._options.overflowMenuProps?.actionsVisibility ?? 'always',
          isDisabled: isDisabled || isLoading,
          onSelect: (item: MenuItemData) => {
            if (item.isDisabled) return;
            const idx = this._options.tabs.findIndex((t) => t.id === item.id);
            this._options.selectedId = item.id;
            this._syncSelection();
            this._overflowMgr?.refresh();
            this._dispatchEvent('tabs:select', { id: item.id, index: idx });
            this._options.onSelect?.({ id: item.id, index: idx });
          },
          onOpenChange: (isOpen: boolean) => {
            if (isOpen) {
              this._dispatchEvent('tabs:overflow-open', {});
              this._options.onOverflowOpen?.();
            }
          },
        },
      );

      this._overflowWrapperEl.style.display = 'none';

      this._rightClusterEl.appendChild(this._overflowWrapperEl);
    }

    // Add-New button - horizontal + hasAddButton only. Initially mounted
    // in the expanded ArvoButton shape; the overflow detection flips it
    // to compact ArvoIconButton when the strip becomes space-constrained.
    if (isHorizontal && hasAddButton && this._rightClusterEl) {
      this._addBtnWrapperEl = document.createElement('div');
      this._addBtnWrapperEl.className = 'arvo-tabs__add-btn';
      this._rightClusterEl.appendChild(this._addBtnWrapperEl);
      this._mountAddButton(false);
    }

    // Divider - horizontal + hasTabstripBorder only.
    if (isHorizontal && hasTabstripBorder && this._listEl) {
      this._dividerEl = document.createElement('span');
      this._dividerEl.className = 'arvo-tabs__divider';
      this._dividerEl.setAttribute('aria-hidden', 'true');
      this._listEl.insertBefore(this._dividerEl, this._listEl.firstChild);
    }

    this._syncSelection();
  }

  private _createTabEntry(tab: TabItem): TabEntry {
    const el = document.createElement('div');
    el.setAttribute('role', 'tab');
    el.setAttribute('data-tab-id', tab.id);
    el.setAttribute('aria-selected', 'false');
    el.tabIndex = -1;

    if (tab.panelId) el.setAttribute('aria-controls', tab.panelId);
    if (tab.tooltip) el.title = tab.tooltip;

    const isSelected = tab.id === this._options.selectedId;
    el.setAttribute('aria-label', composeAriaLabel(tab, isSelected));

    const { orientation, isLoading, isDisabled: stripDisabled } = this._options;
    const isHorizontal = orientation === 'horizontal';
    const isTabDisabled = tab.isDisabled || stripDisabled;

    if (isTabDisabled) el.setAttribute('aria-disabled', 'true');

    el.className = [
      'arvo-tabs__tab',
      isTabDisabled ? 'is-disabled' : '',
      tab.pinned ? 'is-pinned' : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Left section
    const leftEl = document.createElement('span');
    leftEl.className = 'arvo-tabs__tab-lft';

    let icoEl: HTMLSpanElement | null = null;
    if (tab.icon) {
      icoEl = document.createElement('span');
      icoEl.className = `arvo-tabs__tab-ico o9con o9con-${tab.icon}`;
      icoEl.setAttribute('aria-hidden', 'true');
      leftEl.appendChild(icoEl);
    }

    // Label slot. `data-label` feeds the medium-weight `::after` ghost
    // that reserves the active-state width so flipping `.active`
    // (regular -> medium) does NOT shift the surrounding tabs. The
    // visible text lives in `__tab-lbl-text` and shares the same single
    // grid cell as the ghost.
    const lblEl = document.createElement('span');
    lblEl.className = 'arvo-tabs__tab-lbl';
    lblEl.setAttribute('data-label', tab.label);
    const lblTextEl = document.createElement('span');
    lblTextEl.className = 'arvo-tabs__tab-lbl-text';
    lblTextEl.textContent = tab.label;
    lblEl.appendChild(lblTextEl);
    leftEl.appendChild(lblEl);

    // Alert slot
    let alertEl: HTMLSpanElement | null = null;
    let alertInstance: ArvoMessageAlert | null = null;
    if (tab.alert) {
      alertEl = document.createElement('span');
      alertEl.className = 'arvo-tabs__tab-alert';
      const alertInnerEl = document.createElement('span');
      alertEl.appendChild(alertInnerEl);
      alertInstance = ArvoMessageAlert.initialize(alertInnerEl, {
        isInline: true,
        type: tab.alert.type ?? 'negative',
        message: tab.alert.label,
      });
      leftEl.appendChild(alertEl);
    }

    // Badge slot
    let badgeEl: HTMLSpanElement | null = null;
    let badgeInstance: ArvoBadge | null = null;
    if (tab.badge) {
      badgeEl = document.createElement('span');
      badgeEl.className = 'arvo-tabs__tab-badge';
      const badgeInnerEl = document.createElement('span');
      badgeEl.appendChild(badgeInnerEl);
      badgeInstance = ArvoBadge.initialize(badgeInnerEl, {
        size: 'sm',
        semanticType: tab.badge.semanticType ?? 'positive',
        message: tab.badge.label,
        hasBadgeIcon: false,
        tooltip: tab.badge.tooltip ?? null,
      });
      leftEl.appendChild(badgeEl);
    }

    // Status slot -- always size 'sm' regardless of strip size. Tooltip
    // override: when `tab.status.tooltip` is provided we forward it;
    // otherwise we fall back to `tab.status.label`.
    let statusEl: HTMLSpanElement | null = null;
    let statusInstance: ArvoStatus | null = null;
    if (tab.status) {
      statusEl = document.createElement('span');
      statusEl.className = 'arvo-tabs__tab-status';
      const statusInnerEl = document.createElement('span');
      statusEl.appendChild(statusInnerEl);
      statusInstance = ArvoStatus.initialize(statusInnerEl, {
        size: 'sm',
        type: tab.status.type ?? 'available',
        placement: 'inline',
        tooltip: tab.status.tooltip ?? tab.status.label,
      });
      leftEl.appendChild(statusEl);
    }

    el.appendChild(leftEl);

    // Compose the per-tab menu payload (consumer items + default actions
    // separated by a group divider per the UX spec). When the payload is
    // empty no menu surface mounts; when non-empty AND there is no visible
    // ellipsis button, we mount a HIDDEN ArvoActionMenu anchored to a
    // dedicated hidden trigger so Shift+F10 / right-click / Ctrl+Shift+\
    // still have a menu to open.
    const flags: DefaultActionFlags = {
      isPinnable: this._options.isPinnable,
      isClosable: this._options.isClosable,
      isReorderable: this._options.isReorderable,
      isHorizontal,
    };
    const composedMenu = composeTabMenu(
      tab,
      flags,
      this._options.isClosable,
    );
    const composedIsGrouped = payloadIsGrouped(composedMenu);
    const composedFlatItems = flattenMenuPayload(composedMenu);
    const hasVisibleMenu =
      Array.isArray(tab.menuItems) && tab.menuItems.length > 0;
    const tabPinnable = isHorizontal && this._options.isPinnable;
    const tabClosable =
      isHorizontal && !tab.pinned && (tab.isClosable ?? this._options.isClosable);
    const hasActions = hasVisibleMenu || tabPinnable || tabClosable;

    let actionsEl: HTMLSpanElement | null = null;
    let menuBtn: ArvoDropdownIconButton | null = null;
    let menuBtnEl: HTMLButtonElement | null = null;
    let pinBtn: ArvoToggleButton | null = null;
    let closeBtn: ArvoIconButton | null = null;
    let hiddenMenu: ArvoActionMenu | null = null;
    let hiddenMenuAnchorEl: HTMLButtonElement | null = null;

    if (hasActions) {
      actionsEl = document.createElement('span');
      actionsEl.className = 'arvo-tabs__tab-actions';

      if (hasVisibleMenu) {
        const menuWrapEl = document.createElement('span');
        menuWrapEl.className = 'arvo-tabs__tab-menu';
        menuBtnEl = document.createElement('button');
        menuBtnEl.tabIndex = -1;
        menuWrapEl.appendChild(menuBtnEl);
        // Hybrid options surface: spread `menuProps` first so flat /
        // parent-computed values win on overlap. The per-tab menu button
        // is fixed at variant=tertiary, size=sm, isCompact=true (no
        // trailing caret) regardless of the parent strip size. The
        // composed item payload includes the consumer's `tab.menuItems`
        // PLUS the default Pin/Close/Move actions, separated by a group
        // divider per the UX spec.
        menuBtn = ArvoDropdownIconButton.initialize(menuBtnEl, {
          ...(this._options.menuProps ?? {}),
          icon: 'ellipsis-v',
          variant: 'tertiary',
          size: 'sm',
          isCompact: true,
          tooltip: 'Tab actions',
          items: composedIsGrouped
            ? (composedMenu as ListGroup<MenuItemData>[])
            : composedFlatItems,
          hasGroupDividers: composedIsGrouped,
          closeOnSelect: true,
          isDisabled: isTabDisabled,
          isLoading,
          onSelect: (item: MenuItemData) =>
            this._handleTabMenuSelect(tab, item),
        });
        actionsEl.appendChild(menuWrapEl);
      }

      if (tabPinnable) {
        const pinWrapEl = document.createElement('span');
        pinWrapEl.className = 'arvo-tabs__tab-pin';
        const pinBtnEl = document.createElement('button');
        pinBtnEl.tabIndex = -1;
        pinWrapEl.appendChild(pinBtnEl);
        // Pin / unpin is an ArvoToggleButton. The icon-pair
        // (push-pin / push-pinned) drives the visual flip natively via
        // `selectedIcon`, and `onSelectedChange` reports the next
        // pinned state. We translate that into the same `tabs:pin`
        // event + `onPin` callback the rest of the API expects.
        pinBtn = ArvoToggleButton.initialize(pinBtnEl, {
          icon: 'push-pin',
          selectedIcon: 'push-pinned',
          variant: 'tertiary',
          size: 'sm',
          tooltip: tab.pinned ? 'Unpin tab' : 'Pin tab',
          isDisabled: isTabDisabled,
          isLoading,
          isSelected: !!tab.pinned,
          status: tab.pinActionStatus ?? null,
          onClick: (e: Event) => {
            e.stopPropagation();
          },
          onSelectedChange: () => {
            if (
              tab.isDisabled ||
              this._options.isDisabled ||
              this._options.isLoading
            ) {
              return;
            }
            this._togglePin(tab);
          },
        });
        actionsEl.appendChild(pinWrapEl);
      }

      if (tabClosable) {
        const closeWrapEl = document.createElement('span');
        closeWrapEl.className = 'arvo-tabs__tab-close';
        const closeBtnEl = document.createElement('button');
        closeBtnEl.tabIndex = -1;
        closeWrapEl.appendChild(closeBtnEl);
        closeBtn = ArvoIconButton.initialize(closeBtnEl, {
          icon: 'close',
          variant: 'tertiary',
          size: 'sm',
          tooltip: 'Close tab',
          isDisabled: isTabDisabled,
          isLoading,
          status: tab.closeActionStatus ?? null,
          onClick: (e: Event) => {
            e.stopPropagation();
            if (
              tab.isDisabled ||
              this._options.isDisabled ||
              this._options.isLoading
            ) {
              return;
            }
            this._closeTab(tab.id);
          },
        });
        actionsEl.appendChild(closeWrapEl);
      }

      el.appendChild(actionsEl);
    }

    // When the tab has no visible ellipsis dropdown but DOES have a
    // composed menu (default Pin / Close / Move actions), mount a
    // hidden ArvoActionMenu against a hidden anchor button so the
    // keyboard / right-click context-menu paths still have a surface to
    // open. The anchor button is visually hidden but stays in the DOM
    // so the overlay surface can position against it.
    if (!hasVisibleMenu && composedMenu !== null) {
      hiddenMenuAnchorEl = document.createElement('button');
      hiddenMenuAnchorEl.type = 'button';
      hiddenMenuAnchorEl.tabIndex = -1;
      hiddenMenuAnchorEl.setAttribute('aria-hidden', 'true');
      hiddenMenuAnchorEl.className = 'arvo-tabs__tab-menu-anchor';
      Object.assign(hiddenMenuAnchorEl.style, {
        position: 'absolute',
        right: '0',
        bottom: '0',
        width: '1px',
        height: '1px',
        opacity: '0',
        pointerEvents: 'none',
      });
      el.appendChild(hiddenMenuAnchorEl);
      hiddenMenu = ArvoActionMenu.initialize(hiddenMenuAnchorEl, {
        items: composedIsGrouped
          ? (composedMenu as ListGroup<MenuItemData>[])
          : composedFlatItems,
        hasGroupDividers: composedIsGrouped,
        placement: 'bottom-end',
        closeOnSelect: true,
        isDisabled: isTabDisabled || isLoading,
        onSelect: (item: MenuItemData) =>
          this._handleTabMenuSelect(tab, item),
      });
    }

    // Skeleton loading overlay
    let skelEl: HTMLSpanElement | null = null;
    if (isLoading) {
      skelEl = document.createElement('span');
      skelEl.className = 'arvo-tabs__skel';
      skelEl.setAttribute('aria-hidden', 'true');
      el.appendChild(skelEl);
    }

    // Truncation tooltip on the label. Anchored to the tab root so
    // hover / focus on the tab (not just the inner label span) shows
    // the full label when truncated. The connector's
    // `autoOnTruncation: true` guard means it stays silent when the
    // label fits, so non-truncated tabs never get a tooltip.
    const truncationHandle = attachTitleTruncationTooltip({
      element: lblTextEl,
      triggerElement: el,
      content: tab.label,
      placement: 'bottom-center',
    });

    return {
      item: tab,
      el,
      leftEl,
      lblEl,
      lblTextEl,
      icoEl,
      actionsEl,
      menuBtn,
      menuBtnEl,
      pinBtn,
      closeBtn,
      hiddenMenu,
      hiddenMenuAnchorEl,
      skelEl,
      badgeEl,
      badgeInstance,
      statusEl,
      statusInstance,
      alertEl,
      alertInstance,
      truncationHandle,
    };
  }

  // -- Per-tab action helpers --------------------------------------------

  /**
   * Toggle the tab's pinned state and emit the matching event / callback.
   * Shared by the inline ToggleButton, the Ctrl+P shortcut, the Pin /
   * Unpin entry in the per-tab action menu, and the row-level pin
   * action inside the strip-level overflow menu.
   *
   * Accepts either a TabItem reference or its id so callers that hold
   * stale references (e.g. menu-item closures that captured an old
   * `tabs` array) can pass an id and we always operate on the live
   * `_options.tabs` entry.
   */
  private _togglePin(target: TabItem | string): void {
    const id = typeof target === 'string' ? target : target.id;
    const tab = this._options.tabs.find((t) => t.id === id);
    if (!tab) return;
    if (
      !this._options.isPinnable ||
      tab.isDisabled ||
      this._options.isDisabled ||
      this._options.isLoading
    ) {
      return;
    }
    const newPinned = !tab.pinned;
    // Persist BOTH on the live object reference (so other consumers
    // holding a reference see the flip) AND in a fresh array sent to
    // the consumer / event payload. Without persisting back to
    // `_options.tabs` the strip would diff incorrectly on the next
    // rebuild (the menu-item closures snapshot `tab.pinned` and the
    // updated copy diverges from the live array).
    tab.pinned = newPinned;
    const updated = this._options.tabs.map((t) =>
      t.id === id ? { ...t, pinned: newPinned } : t,
    );
    this._options.tabs = updated;
    const tabOrder = getTabOrder(updated);
    this._rebuildDisplay();
    this._dispatchEvent('tabs:pin', { id, pinned: newPinned, tabOrder });
    this._options.onPin?.({ id, pinned: newPinned, tabOrder });
  }

  /**
   * Close a tab. Dispatches the cancelable `tabs:close` CustomEvent and
   * invokes the `onClose` callback; both can suppress the internal
   * removal (event via `preventDefault()`, callback via `return false`).
   * When the close is NOT cancelled the Tabstrip removes the tab from
   * its own `tabs` array, falling back to the next enabled tab per
   * `closeBehavior` if the closed tab was selected.
   */
  private _closeTab(id: string): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const idx = this._options.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const evt = new CustomEvent('tabs:close', {
      bubbles: true,
      cancelable: true,
      detail: { id, index: idx },
    });
    this._element?.dispatchEvent(evt);
    const cbResult = this._options.onClose?.({ id, index: idx });
    if (evt.defaultPrevented || cbResult === false) return;
    this.removeTab(id);
  }

  /**
   * Move a tab one slot, to the start, or to the end of its OWN group
   * (pinned / unpinned). Shared by the menu actions and the
   * Ctrl+Home / Ctrl+End shortcuts. The single-slot left/right path is
   * intentionally also routed through here so the menu and shortcuts
   * stay in lockstep (the in-flight drag-reorder one-slot shortcut is
   * still handled by `createSortableList` directly when a drag is
   * active).
   */
  private _moveTabBy(
    tab: TabItem,
    action: 'left' | 'right' | 'start' | 'end',
  ): void {
    if (
      !this._options.isReorderable ||
      this._options.isDisabled ||
      this._options.isLoading
    ) {
      return;
    }
    const group: 'pinned' | 'unpinned' = tab.pinned ? 'pinned' : 'unpinned';
    const display = this._displayOrder;
    const groupTabs = display.filter(
      (t) => (t.pinned ? 'pinned' : 'unpinned') === group,
    );
    const idxInGroup = groupTabs.findIndex((t) => t.id === tab.id);
    if (idxInGroup < 0) return;
    let targetIdx = idxInGroup;
    if (action === 'start') targetIdx = 0;
    else if (action === 'end') targetIdx = groupTabs.length - 1;
    else if (action === 'left') targetIdx = Math.max(0, idxInGroup - 1);
    else if (action === 'right')
      targetIdx = Math.min(groupTabs.length - 1, idxInGroup + 1);
    if (targetIdx === idxInGroup) return;
    const newGroup = [...groupTabs];
    const [moved] = newGroup.splice(idxInGroup, 1);
    newGroup.splice(targetIdx, 0, moved);
    const newDisplay =
      group === 'pinned'
        ? [...newGroup, ...display.filter((t) => !t.pinned)]
        : [...display.filter((t) => t.pinned), ...newGroup];
    const orderById = new Map(newDisplay.map((t, i) => [t.id, i]));
    const reordered = [...this._options.tabs].sort((a, b) => {
      const ai = orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    this._options.tabs = reordered;
    this._rebuildDisplay();
    this._dispatchEvent('tabs:reorder', { tabs: reordered });
    this._options.onTabReorder?.(reordered);
  }

  /**
   * Centralized dispatcher for the per-tab action menu. Consumer-supplied
   * items keep their own onClick / onSelect (already invoked by the menu
   * surface) -- we act only on the internal `__tabstrip:*` sentinels.
   */
  private _handleTabMenuSelect(
    tab: TabItem,
    item: MenuItemData,
  ): boolean | void {
    switch (item.id) {
      case TAB_MENU_ID.PIN:
      case TAB_MENU_ID.UNPIN:
        this._togglePin(tab);
        return;
      case TAB_MENU_ID.CLOSE:
        this._closeTab(tab.id);
        return;
      case TAB_MENU_ID.CLOSE_OTHERS: {
        const otherIds = this._options.tabs
          .filter((t) => t.id !== tab.id && !t.pinned && !t.isDisabled)
          .map((t) => t.id);
        for (const id of otherIds) this._closeTab(id);
        return;
      }
      case TAB_MENU_ID.CLOSE_RIGHT: {
        const startIdx = this._displayOrder.findIndex((t) => t.id === tab.id);
        if (startIdx < 0) return;
        const rightIds = this._displayOrder
          .slice(startIdx + 1)
          .filter((t) => !t.pinned && !t.isDisabled)
          .map((t) => t.id);
        for (const id of rightIds) this._closeTab(id);
        return;
      }
      case TAB_MENU_ID.MOVE_LEFT:
        this._moveTabBy(tab, 'left');
        return;
      case TAB_MENU_ID.MOVE_RIGHT:
        this._moveTabBy(tab, 'right');
        return;
      case TAB_MENU_ID.MOVE_START:
        this._moveTabBy(tab, 'start');
        return;
      case TAB_MENU_ID.MOVE_END:
        this._moveTabBy(tab, 'end');
        return;
      default:
        return;
    }
  }

  /**
   * Open the tab's per-tab context menu. Prefers the visible dropdown
   * trigger (so the menu opens anchored to the visible affordance);
   * falls back to the hidden ArvoActionMenu mounted on tabs that only
   * have default actions.
   */
  private _openTabContextMenu(id: string): void {
    const entry = this._tabs.find((t) => t.item.id === id);
    if (!entry) return;
    if (entry.menuBtnEl) {
      entry.menuBtnEl.click();
      return;
    }
    entry.hiddenMenu?.open();
  }

  private _iconBtnSize(): 'sm' | 'md' {
    return this._options.size === 'sm' ? 'sm' : 'md';
  }

  /**
   * Mount the Add-New affordance into `_addBtnWrapperEl`. When
   * `compact=true` it is an icon-only ArvoIconButton (used while
   * tabs are overflowing); otherwise it is the expanded labeled
   * ArvoButton. We tear down + recreate the inner instance whenever
   * the shape flips, but skip the rebuild when nothing changed so we
   * don't churn DOM on every overflow recalc.
   */
  private _mountAddButton(compact: boolean): void {
    if (!this._addBtnWrapperEl) return;

    // Only rebuild on shape change.
    if (this._addBtnInstance && this._addBtnIsCompact === compact) {
      this._refreshAddButtonState();
      return;
    }

    this._addBtnInstance?.destroy();
    this._addBtnInstance = null;
    this._addBtnWrapperEl.textContent = '';
    this._addBtnIsCompact = compact;

    const addBtnEl = document.createElement('button');
    this._addBtnWrapperEl.appendChild(addBtnEl);

    const {
      isDisabled,
      isAddDisabled,
      maxTabs,
      tabs,
      addButtonLabel,
      isLoading,
      size,
    } = this._options;

    const addDisabled =
      isDisabled ||
      isAddDisabled ||
      (typeof maxTabs === 'number' && tabs.length >= maxTabs);

    if (compact) {
      this._addBtnInstance = ArvoIconButton.initialize(addBtnEl, {
        icon: 'plus',
        // Tertiary matches the overflow trigger's strip-utility weight
        // (the expanded form uses the outline ArvoButton).
        variant: 'tertiary',
        size: this._iconBtnSize(),
        tooltip: addButtonLabel,
        isDisabled: addDisabled,
        isLoading,
        onClick: () => {
          this._dispatchEvent('tabs:add', {});
          this._options.onTabAdd?.();
        },
      });
    } else {
      this._addBtnInstance = ArvoButton.initialize(addBtnEl, {
        variant: 'outline',
        icon: 'plus',
        size: size === 'sm' ? 'sm' : 'md',
        label: addButtonLabel,
        isDisabled: addDisabled,
        isLoading,
        onClick: () => {
          this._dispatchEvent('tabs:add', {});
          this._options.onTabAdd?.();
        },
      });
    }
  }

  /** Sync the Add-New button's disabled state without rebuilding it. */
  private _refreshAddButtonState(): void {
    if (!this._addBtnInstance) return;
    const { isDisabled, isAddDisabled, maxTabs, tabs } = this._options;
    const addDisabled =
      isDisabled ||
      isAddDisabled ||
      (typeof maxTabs === 'number' && tabs.length >= maxTabs);
    this._addBtnInstance.disabled(addDisabled);
  }

  private _destroyTabEntry(entry: TabEntry): void {
    entry.menuBtn?.destroy();
    entry.pinBtn?.destroy();
    entry.closeBtn?.destroy();
    entry.hiddenMenu?.destroy();
    entry.badgeInstance?.destroy();
    entry.statusInstance?.destroy();
    entry.alertInstance?.destroy();
    entry.truncationHandle?.destroy();
    entry.el.remove();
  }

  /**
   * Diff-rebuild the tab list. Tabs that survive across a rebuild
   * (pin/unpin, reorder, removeTab) keep their existing DOM nodes and
   * inner Arvo component instances -- we only:
   *  - rebuild entries that need new inner affordances (close button
   *    appearing/disappearing on (un)pin, menu items changing)
   *  - destroy entries for tabs that were removed from `_options.tabs`
   *  - move surviving entries to their new position in `_listEl`
   *
   * This is the key fix for the "all pin icons animate on every pin"
   * regression -- the old full-rebuild path tore down every entry and
   * recreated the ArvoToggleButton with `.active` already applied,
   * which kicked off the `arvo-toggle-grow` animation on every pinned
   * tab. With diff-based preservation only the AFFECTED toggle gets
   * its `.active` class flipped, so only its own animation runs.
   *
   * Focus is also preserved across rebuilds: if the user was focused
   * on a tab when the rebuild started, that tab keeps focus afterward
   * (or, if it was removed, focus follows the auto-selected next tab).
   */
  private _rebuildDisplay(): void {
    if (!this._listEl) return;

    // Capture focus so we can restore it after the rebuild. We walk up
    // from the active element to the closest tab so focus is preserved
    // even when the user is on an inner action button (pin/close/menu).
    const activeEl = document.activeElement as HTMLElement | null;
    const focusedTabId =
      activeEl?.closest<HTMLDivElement>('.arvo-tabs__tab')?.getAttribute('data-tab-id') ??
      null;

    this._teardownSortable();

    // Index existing entries by tab id so we can reuse them whenever the
    // matching tab still exists in the next display order. We also note
    // whether the entry's structural affordances (close button, hidden
    // context menu, action menu items) need to be rebuilt because the
    // tab's pinned / disabled state flipped.
    const previousEntries = new Map<string, TabEntry>();
    for (const entry of this._tabs) {
      previousEntries.set(entry.item.id, entry);
    }

    this._displayOrder = this._computeDisplayOrder();
    const nextEntries: TabEntry[] = [];
    const usedIds = new Set<string>();

    for (const tab of this._displayOrder) {
      const existing = previousEntries.get(tab.id);
      if (existing && this._canPatchEntry(existing, tab)) {
        // Reuse the existing entry's DOM + inner instances. We only
        // patch the pieces that can change between rebuilds (pinned
        // class, ToggleButton selected state, menu item payload, etc.)
        // so focus + animation state are preserved.
        this._patchTabEntry(existing, tab);
        nextEntries.push(existing);
        usedIds.add(tab.id);
      } else {
        // Either the tab is new, or its structural affordances have to
        // be rebuilt from scratch (e.g. close button appearing when an
        // unpinnable tab transitions out of `pinned: true`). Destroy
        // any predecessor entry first so we don't leak instances.
        if (existing) {
          this._destroyTabEntry(existing);
          usedIds.add(tab.id);
        }
        const entry = this._createTabEntry(tab);
        nextEntries.push(entry);
      }
    }

    // Destroy entries for tabs that no longer exist in the display order.
    for (const [id, entry] of previousEntries) {
      if (!usedIds.has(id) && !nextEntries.includes(entry)) {
        this._destroyTabEntry(entry);
      }
    }

    this._tabs = nextEntries;

    // Detach the indicator before re-ordering so it lands as the trailing
    // child of the list (keeps it painting above the divider + tabs).
    this._indicatorEl?.remove();

    // Move every surviving entry to its new slot in the list. Using
    // appendChild on an already-mounted node MOVES it without recreating
    // (DOM node identity is preserved), so animations + focus stick.
    for (const entry of this._tabs) {
      this._listEl.appendChild(entry.el);
    }

    if (this._indicatorEl) {
      this._listEl.appendChild(this._indicatorEl);
    }

    this._syncSelection();
    if (this._options.hasOverflow && this._options.orientation === 'horizontal') {
      this._checkOverflow();
    }
    this._setupSortable();
    this._setupIndicatorObserver();

    // Restore focus to the originally focused tab ONLY when focus was
    // actually lost during the rebuild. This is the keyboard-driven
    // case -- Ctrl+P, Ctrl+ArrowLeft/Right, removeTab -- where the
    // activeElement was the tab root and ended up on document.body
    // because its entry was destroyed (close) OR because the patch
    // path took something out from under it. When focus is still
    // inside the tabstrip (e.g. the user clicked an inline button and
    // the patch preserved its DOM), we leave focus alone so we don't
    // bounce it to the tab root and break the user's click.
    const activeAfter = document.activeElement as HTMLElement | null;
    const focusLost =
      !activeAfter ||
      activeAfter === document.body ||
      !this._element?.contains(activeAfter);
    if (focusedTabId && focusLost) {
      const focusEntry = this._tabs.find((t) => t.item.id === focusedTabId);
      if (focusEntry) {
        focusEntry.el.focus({ preventScroll: true });
      } else if (this._options.selectedId) {
        const selEntry = this._tabs.find(
          (t) => t.item.id === this._options.selectedId,
        );
        selEntry?.el.focus({ preventScroll: true });
      }
    }
  }

  /**
   * Decide whether an existing TabEntry can be patched in place to match
   * the new tab data, or whether its affordances have changed
   * structurally (close button appearing on unpin, hidden context menu
   * appearing because default actions changed, etc.) in which case we
   * fall back to a full destroy + recreate of that single entry.
   *
   * We intentionally KEEP the entry across pin toggles even though
   * `is-pinned` and the close-button slot may change -- those are
   * handled by `_patchTabEntry` so the pin ToggleButton instance (and
   * therefore the focus + animation state) is preserved.
   */
  private _canPatchEntry(entry: TabEntry, next: TabItem): boolean {
    // If the strip's structural flags (isHorizontal / hasPinning /
    // isClosable / isReorderable) changed since the entry was built
    // we cannot patch -- but those are only re-applied on a full
    // re-render path, not via `_rebuildDisplay`.
    const isHorizontal = this._options.orientation === 'horizontal';
    if (!isHorizontal) return true;

    const prev = entry.item;

    // Menu trigger presence depends on `tab.menuItems` (consumer-supplied).
    // If that flips between present/absent we need to rebuild the entry
    // because the visible ellipsis trigger appears/disappears.
    const prevHasVisibleMenu =
      Array.isArray(prev.menuItems) && prev.menuItems.length > 0;
    const nextHasVisibleMenu =
      Array.isArray(next.menuItems) && next.menuItems.length > 0;
    if (prevHasVisibleMenu !== nextHasVisibleMenu) return false;

    // Pin button presence is parent-driven (`isPinnable` on the strip).
    // It does not change per tab here, so we don't need to check it.

    // Close button presence depends on pinned + closable. If a tab is
    // newly pinned the close button vanishes, and vice versa. We patch
    // this in `_patchTabEntry` rather than rebuilding the entry so the
    // pin ToggleButton instance survives.
    return true;
  }

  /**
   * Patch the surviving entry to match the new tab data without
   * destroying the DOM node or its inner Arvo instances. Handles:
   *   - `is-pinned` / `is-disabled` class toggles
   *   - ToggleButton pin selected state (drives the icon swap)
   *   - close button add / remove on (un)pin transition
   *   - per-tab menu items refresh (Pin <-> Unpin entry, etc.)
   *   - inline slot data (icon / label / badge / status / alert)
   *   - aria-label recomposition
   */
  private _patchTabEntry(entry: TabEntry, next: TabItem): void {
    const stripDisabled = this._options.isDisabled;
    const isHorizontal = this._options.orientation === 'horizontal';
    const isTabDisabled = next.isDisabled || stripDisabled;

    // -- Class + a11y -------------------------------------------------------
    entry.el.classList.toggle('is-pinned', !!next.pinned);
    entry.el.classList.toggle('is-disabled', isTabDisabled);
    if (isTabDisabled) entry.el.setAttribute('aria-disabled', 'true');
    else entry.el.removeAttribute('aria-disabled');

    // -- Pin button: update selected + tooltip without re-creating ----------
    if (entry.pinBtn) {
      entry.pinBtn.selected(!!next.pinned);
      entry.pinBtn.disabled(isTabDisabled);
      const nextTip = next.pinned ? 'Unpin tab' : 'Pin tab';
      // setTooltip is a no-op when the value matches the existing one.
      entry.pinBtn.setTooltip?.(nextTip);
    }

    // -- Close button: appears on unpinned closable tabs, vanishes on
    //    pinned tabs. We add/remove the wrapper + inner instance in
    //    place so the surviving pin ToggleButton stays put.
    const tabClosable =
      isHorizontal && !next.pinned && (next.isClosable ?? this._options.isClosable);
    const hasClose = !!entry.closeBtn;
    if (tabClosable && !hasClose) {
      this._mountCloseButton(entry, next);
    } else if (!tabClosable && hasClose) {
      this._unmountCloseButton(entry);
    } else if (entry.closeBtn) {
      // Refresh status overlay if it changed across rebuilds.
      entry.closeBtn.disabled(isTabDisabled);
    }

    // -- Per-tab menu items (visible dropdown + hidden context menu) --------
    const flags: DefaultActionFlags = {
      isPinnable: this._options.isPinnable,
      isClosable: this._options.isClosable,
      isReorderable: this._options.isReorderable,
      isHorizontal,
    };
    const composed = composeTabMenu(next, flags, this._options.isClosable);
    const composedFlat = flattenMenuPayload(composed);
    const composedIsGrouped = payloadIsGrouped(composed);
    if (entry.menuBtn) {
      entry.menuBtn.updateItems(
        composedIsGrouped
          ? (composed as ListGroup<MenuItemData>[])
          : composedFlat,
      );
      entry.menuBtn.disabled(isTabDisabled);
    }
    if (entry.hiddenMenu) {
      entry.hiddenMenu.updateItems(
        composedIsGrouped
          ? (composed as ListGroup<MenuItemData>[])
          : composedFlat,
      );
      entry.hiddenMenu.disabled(isTabDisabled || this._options.isLoading);
    }

    // -- Refresh inline slot data (badge / status / alert / label / icon) --
    if (next.label !== entry.item.label) {
      entry.lblTextEl.textContent = next.label;
      entry.lblEl.setAttribute('data-label', next.label);
      // Keep the truncation tooltip's source-of-truth label in sync so
      // the (rare) hover after a programmatic label change shows the
      // new value, not the original one.
      entry.truncationHandle?.update(next.label);
    }
    if (next.tooltip !== entry.item.tooltip) {
      if (next.tooltip) entry.el.title = next.tooltip;
      else entry.el.removeAttribute('title');
    }
    if (entry.icoEl && next.icon) {
      // Swap glyph class if changed.
      if (next.icon !== entry.item.icon) {
        if (entry.item.icon) {
          entry.icoEl.classList.remove(`o9con-${entry.item.icon}`);
        }
        entry.icoEl.classList.add(`o9con-${next.icon}`);
      }
    }

    // Aria-label recompose (selection may also have changed).
    const isSelected = next.id === this._options.selectedId;
    entry.el.setAttribute('aria-label', composeAriaLabel(next, isSelected));

    // Finally, update the stored model reference so future patches diff
    // against the new value.
    entry.item = next;
  }

  /**
   * Mount a fresh close button into an existing entry's actions cluster.
   * Used by `_patchTabEntry` when a tab transitions from pinned to
   * unpinned (the close button slot reappears).
   */
  private _mountCloseButton(entry: TabEntry, tab: TabItem): void {
    if (entry.closeBtn) return;
    // Ensure the actions wrapper exists; if the original entry had no
    // actions (no menu / pin / close), create one now.
    if (!entry.actionsEl) {
      entry.actionsEl = document.createElement('span');
      entry.actionsEl.className = 'arvo-tabs__tab-actions';
      entry.el.appendChild(entry.actionsEl);
    }
    const closeWrapEl = document.createElement('span');
    closeWrapEl.className = 'arvo-tabs__tab-close';
    const closeBtnEl = document.createElement('button');
    closeBtnEl.tabIndex = -1;
    closeWrapEl.appendChild(closeBtnEl);
    const isTabDisabled = !!tab.isDisabled || this._options.isDisabled;
    entry.closeBtn = ArvoIconButton.initialize(closeBtnEl, {
      icon: 'close',
      variant: 'tertiary',
      size: 'sm',
      tooltip: 'Close tab',
      isDisabled: isTabDisabled,
      isLoading: this._options.isLoading,
      status: tab.closeActionStatus ?? null,
      onClick: (e: Event) => {
        e.stopPropagation();
        if (
          tab.isDisabled ||
          this._options.isDisabled ||
          this._options.isLoading
        ) {
          return;
        }
        this._closeTab(tab.id);
      },
    });
    entry.actionsEl.appendChild(closeWrapEl);
  }

  /**
   * Destroy and detach the close button from an existing entry. Used by
   * `_patchTabEntry` when a tab transitions from unpinned to pinned.
   */
  private _unmountCloseButton(entry: TabEntry): void {
    if (!entry.closeBtn) return;
    const wrap = entry.actionsEl?.querySelector('.arvo-tabs__tab-close');
    entry.closeBtn.destroy();
    entry.closeBtn = null;
    wrap?.remove();
  }

  // -- Overflow detection (shared @arvo/core utility) ---------------------

  private _setupOverflowDetection(): void {
    if (!this._options.hasOverflow || this._options.orientation !== 'horizontal') return;
    if (!this._listEl) return;

    this._overflowMgr?.destroy();

    this._overflowMgr = createOverflowManager({
      container: this._listEl,
      boundary: this._element?.parentElement ?? this._listEl,
      getItems: () => {
        const out: { id: string; el: HTMLElement }[] = [];
        for (const entry of this._tabs) {
          out.push({ id: entry.item.id, el: entry.el });
        }
        return out;
      },
      getTriggerWidth: () =>
        this._rightClusterEl?.offsetWidth
          ?? this._overflowBtnEl?.offsetWidth
          ?? 0,
      isPinned: (id) => {
        const tab = this._options.tabs.find((t) => t.id === id);
        return !!tab?.pinned;
      },
      getPromotedId: () => this._options.selectedId ?? null,
      onChange: (hidden) => {
        this._hiddenTabIds = hidden;
        const overflowActive = hidden.size > 0;
        this._element?.classList.toggle('has-overflow', overflowActive);
        if (this._overflowWrapperEl) {
          this._overflowWrapperEl.style.display = overflowActive ? '' : 'none';
        }
        this._updateOverflowMenu();
        // Flip the Add-New affordance to compact (icon-only) while the
        // strip is space-constrained, back to the labeled outline button
        // when there is room again.
        if (this._options.hasAddButton && this._addBtnWrapperEl) {
          this._mountAddButton(overflowActive);
        }
        // The indicator's host moves when tabs flip into/out of hidden
        // state, so re-pin it to the (possibly new) active tab.
        this._updateIndicator();
      },
    });
  }

  private _checkOverflow(): void {
    this._overflowMgr?.refresh();
  }

  // -- Drag-and-drop reorder (shared @arvo/core sortable, axis: 'x') -------

  private _setupSortable(): void {
    this._teardownSortable();
    if (!this._listEl) return;
    if (
      !this._options.isReorderable ||
      this._options.orientation !== 'horizontal' ||
      this._options.isDisabled ||
      this._options.isLoading
    ) {
      return;
    }

    this._sortable = createSortableList(this._listEl, {
      itemSelector: '.arvo-tabs__tab',
      handleSelector: null,
      axis: 'x',
      // A click on a tab MUST NOT start a drag -- the pointer has to
      // travel at least 4px along the strip's axis first.
      dragThreshold: 4,
      // Looser displacement -- siblings shift aside as soon as the
      // source has overlapped ~25% of a neighbor.
      overlapThreshold: 0.25,
      // Cross-axis lock to the strip: vertical page scroll during a
      // horizontal drag no longer drifts the clone off the strip.
      lockCrossAxisToContainer: true,
      getGroupOf: (el) => {
        const id = el.getAttribute('data-tab-id');
        const tab = id ? this._options.tabs.find((t) => t.id === id) : null;
        return tab?.pinned ? 'pinned' : 'unpinned';
      },
      allowCrossGroup: false,
      // Clamp the lifted clone to the source's group bounds so an
      // unpinned tab can never visually overlap the pinned region nor
      // the right-edge cluster (overflow / add-button), and a pinned
      // tab can never cross into the unpinned region.
      getDragBounds: (el) => {
        const id = el.getAttribute('data-tab-id');
        if (!id || !this._listEl) return null;
        const tab = this._options.tabs.find((t) => t.id === id);
        const group: 'pinned' | 'unpinned' = tab?.pinned
          ? 'pinned'
          : 'unpinned';
        const groupEls: HTMLElement[] = [];
        for (const entry of this._tabs) {
          const entryGroup: 'pinned' | 'unpinned' = entry.item.pinned
            ? 'pinned'
            : 'unpinned';
          if (entryGroup === group) groupEls.push(entry.el);
        }
        if (groupEls.length === 0) return null;
        const first = groupEls[0].getBoundingClientRect();
        const last = groupEls[groupEls.length - 1].getBoundingClientRect();
        return { min: first.left, max: last.right };
      },
      onCommit: (from, to) => {
        const display = this._displayOrder;
        if (
          from < 0 || from >= display.length ||
          to < 0 || to >= display.length || from === to
        ) {
          return;
        }
        const moved = display[from];
        const target = display[to];
        if (!moved || !target) return;
        const next = this._options.tabs.filter((t) => t.id !== moved.id);
        const targetIdx = next.findIndex((t) => t.id === target.id);
        if (targetIdx < 0) {
          next.push(moved);
        } else {
          const insertIdx = to > from ? targetIdx + 1 : targetIdx;
          next.splice(insertIdx, 0, moved);
        }
        this._options.tabs = next;
        this._dispatchEvent('tabs:reorder', { tabs: next });
        this._options.onTabReorder?.(next);
        this._rebuildDisplay();
      },
    });
  }

  private _teardownSortable(): void {
    this._sortable?.destroy();
    this._sortable = null;
  }

  // -- Animated active-tab indicator --------------------------------------

  private _setupIndicatorObserver(): void {
    this._indicatorResizeObserver?.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    if (!this._listEl) return;
    this._indicatorResizeObserver = new ResizeObserver(() => {
      this._updateIndicator();
    });
    this._indicatorResizeObserver.observe(this._listEl);
    const activeEntry = this._tabs.find(
      (entry) => entry.item.id === this._options.selectedId,
    );
    if (activeEntry) {
      this._indicatorResizeObserver.observe(activeEntry.el);
    }
  }

  private _updateIndicator(): void {
    const indicator = this._indicatorEl;
    const list = this._listEl;
    if (!indicator || !list) return;

    const activeEntry = this._tabs.find(
      (entry) => entry.item.id === this._options.selectedId,
    );

    const activeDisabled =
      !!activeEntry?.item.isDisabled ||
      this._options.isDisabled ||
      this._options.isLoading;
    const activeHidden = activeEntry
      ? this._hiddenTabIds.has(activeEntry.item.id)
      : false;

    // Both variants drive the animated indicator:
    //   primary  -> thin underline / left rail
    //   secondary -> full-tab background fill
    // The SCSS branches on `--primary` vs `--secondary` to choose the
    // right footprint + z-index, so the component only needs to feed
    // the x/y/w/h variables in either case.
    const show = !!activeEntry && !activeDisabled && !activeHidden;

    if (!show || !activeEntry) {
      indicator.dataset.indicatorState = 'hidden';
      return;
    }

    const tabRect = activeEntry.el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const isHorizontal = this._options.orientation === 'horizontal';

    if (isHorizontal) {
      const x = tabRect.left - listRect.left + list.scrollLeft;
      const w = tabRect.width;
      list.style.setProperty('--arvo-tabs-indicator-x', `${x}px`);
      list.style.setProperty('--arvo-tabs-indicator-w', `${w}px`);
    } else {
      const y = tabRect.top - listRect.top + list.scrollTop;
      const h = tabRect.height;
      list.style.setProperty('--arvo-tabs-indicator-y', `${y}px`);
      list.style.setProperty('--arvo-tabs-indicator-h', `${h}px`);
    }

    if (indicator.dataset.indicatorState !== 'visible') {
      // First reveal: snap to position without animating the slide-in.
      const previousTransition = indicator.style.transition;
      indicator.style.transition = 'none';
      void indicator.offsetWidth;
      indicator.dataset.indicatorState = 'visible';
      indicator.style.transition = previousTransition;
    }
  }

  private _updateOverflowMenu(): void {
    if (!this._overflowMenuInstance) return;

    // Capture the tab id here so the row-level pin / close actions
    // resolve against the LIVE `_options.tabs` array each time they run
    // (the menu item closures otherwise keep a stale `tab` reference
    // once `_togglePin` swaps the array out for an `updated` copy).
    const items: MenuItemData[] = this._displayOrder
      .filter((t) => this._hiddenTabIds.has(t.id))
      .map((tab) => {
        const tabId = tab.id;
        const actions: MenuItemAction[] = [];

        if (this._options.isPinnable) {
          actions.push({
            id: `pin-${tabId}`,
            icon: tab.pinned ? 'push-pinned' : 'push-pin',
            ariaLabel: tab.pinned ? 'Unpin tab' : 'Pin tab',
            isDisabled: tab.isDisabled || this._options.isDisabled,
            // Route through the shared helper so the side-effects
            // (model update + diff rebuild + event dispatch) stay in
            // lockstep with the inline pin ToggleButton and Ctrl+P.
            onClick: () => {
              this._togglePin(tabId);
              return false;
            },
          });
        }

        if (!tab.pinned && (tab.isClosable ?? this._options.isClosable)) {
          actions.push({
            id: `close-${tabId}`,
            icon: 'close',
            ariaLabel: 'Close tab',
            isDisabled: tab.isDisabled || this._options.isDisabled,
            // Route through the shared close helper so the tab is
            // actually removed from the model rather than just
            // dispatching the event.
            onClick: () => {
              this._closeTab(tabId);
              return false;
            },
          });
        }

        return {
          id: tabId,
          label: tab.label,
          icon: tab.icon,
          isDisabled: tab.isDisabled,
          active: tabId === this._options.selectedId,
          actions: actions.length > 0 ? actions : undefined,
        } as MenuItemData;
      });

    this._overflowMenuInstance.updateItems(items);

    // When the overflow region empties out (e.g. all hidden tabs were
    // pinned and floated back into the visible region) the overflow
    // trigger is hidden by `_setupOverflowDetection`'s onChange. Force
    // the menu surface closed so we never leave it anchored to a
    // `display: none` trigger, which would mis-position the menu at the
    // viewport origin.
    if (items.length === 0) {
      this._overflowMenuInstance.close();
    }
  }

  // -- Events --------------------------------------------------------------

  private _bindEvents(): void {
    this._listEl?.addEventListener('keydown', this._boundHandleKeyDown);
    this._listEl?.addEventListener('click', this._boundHandleClick);
    this._listEl?.addEventListener('contextmenu', this._boundHandleContextMenu);
  }

  private _handleClick(e: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const target = (e.target as HTMLElement).closest<HTMLDivElement>('.arvo-tabs__tab');
    if (!target) return;
    const tabId = target.getAttribute('data-tab-id');
    if (!tabId) return;

    const entry = this._tabs.find((t) => t.item.id === tabId);
    if (!entry || entry.item.isDisabled) return;
    if (tabId === this._options.selectedId) return;

    const idx = this._options.tabs.findIndex((t) => t.id === tabId);
    this._options.selectedId = tabId;
    this._syncSelection();
    this._overflowMgr?.refresh();
    this._dispatchEvent('tabs:select', { id: tabId, index: idx });
    this._options.onSelect?.({ id: tabId, index: idx });
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const isHorizontal = this._options.orientation === 'horizontal';
    const enabled = this._tabs.filter(
      (t) => !t.item.isDisabled && !this._hiddenTabIds.has(t.item.id),
    );
    if (enabled.length === 0) return;

    // Walk up from activeElement to the closest tab. This lets the
    // keyboard shortcuts (Delete to close, Ctrl+P to pin, arrow keys
    // to navigate) still resolve to the OWNING tab even when focus
    // happens to sit on an inner button (pin / close / menu trigger)
    // because the user clicked it -- otherwise the user has to re-Tab
    // back to the tab root before the keyboard shortcuts work.
    const activeEl = document.activeElement as HTMLElement | null;
    const currentId =
      activeEl
        ?.closest<HTMLDivElement>('.arvo-tabs__tab')
        ?.getAttribute('data-tab-id') ?? null;
    const currentIdx = enabled.findIndex((t) => t.item.id === currentId);
    if (currentIdx < 0) return;

    const currentTab = enabled[currentIdx].item;

    // -- Context-menu shortcuts (Shift+F10, Ctrl/Cmd+Shift+\) -----------
    if (e.key === 'F10' && e.shiftKey) {
      e.preventDefault();
      this._openTabContextMenu(currentTab.id);
      return;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      (e.key === '\\' || e.code === 'Backslash')
    ) {
      e.preventDefault();
      this._openTabContextMenu(currentTab.id);
      return;
    }

    // -- Ctrl/Cmd+P -- toggle pin on focused tab -------------------------
    // `isModKey` picks the platform's primary modifier (Cmd on macOS,
    // Ctrl elsewhere) so a Mac user firing Cmd+P toggles the pin without
    // also triggering the browser's built-in Cmd+P "Print" shortcut --
    // we `preventDefault` on the match.
    if (
      isModKey(e) &&
      !e.shiftKey &&
      !e.altKey &&
      (e.key === 'p' || e.key === 'P')
    ) {
      if (
        this._options.isPinnable &&
        isHorizontal &&
        !currentTab.isDisabled
      ) {
        e.preventDefault();
        this._togglePin(currentTab);
      }
      return;
    }

    // -- Ctrl/Cmd+Home / Ctrl/Cmd+End -- move tab to start / end -------
    if (isModKey(e) && (e.key === 'Home' || e.key === 'End')) {
      if (
        this._options.isReorderable &&
        isHorizontal &&
        !currentTab.isDisabled
      ) {
        e.preventDefault();
        this._moveTabBy(currentTab, e.key === 'Home' ? 'start' : 'end');
      }
      return;
    }

    let nextIdx: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        if (!isHorizontal) return;
        e.preventDefault();
        nextIdx = (currentIdx + 1) % enabled.length;
        break;
      case 'ArrowLeft':
        if (!isHorizontal) return;
        e.preventDefault();
        nextIdx = (currentIdx - 1 + enabled.length) % enabled.length;
        break;
      case 'ArrowDown':
        if (isHorizontal) return;
        e.preventDefault();
        nextIdx = (currentIdx + 1) % enabled.length;
        break;
      case 'ArrowUp':
        if (isHorizontal) return;
        e.preventDefault();
        nextIdx = (currentIdx - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = enabled.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentTab.id !== this._options.selectedId) {
          const id = currentTab.id;
          const tabsIdx = this._options.tabs.findIndex((t) => t.id === id);
          this._options.selectedId = id;
          this._syncSelection();
          this._overflowMgr?.refresh();
          this._dispatchEvent('tabs:select', { id, index: tabsIdx });
          this._options.onSelect?.({ id, index: tabsIdx });
        }
        return;
      case 'Delete':
      case 'Backspace': {
        if (currentTab.pinned) return;
        const tabClosable = currentTab.isClosable ?? this._options.isClosable;
        if (tabClosable) {
          e.preventDefault();
          this._closeTab(currentTab.id);
        }
        return;
      }
      default:
        return;
    }

    if (nextIdx !== null) {
      if (this._options.activationMode === 'automatic') {
        const target = enabled[nextIdx];
        const tabsIdx = this._options.tabs.findIndex(
          (t) => t.id === target.item.id,
        );
        this._options.selectedId = target.item.id;
        this._syncSelection();
        this._overflowMgr?.refresh();
        this._dispatchEvent('tabs:select', { id: target.item.id, index: tabsIdx });
        this._options.onSelect?.({ id: target.item.id, index: tabsIdx });
      }
      enabled[nextIdx].el.focus();
    }
  }

  /**
   * Right-click on a tab opens the SAME per-tab action menu as the
   * visible ellipsis dropdown / Shift+F10. We only call
   * `preventDefault()` when the tab has at least one composed action
   * so we don't suppress the native browser menu where it would be
   * useful (no actions = no replacement to show).
   */
  private _handleContextMenu(e: MouseEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const target = (e.target as HTMLElement | null)?.closest<HTMLDivElement>(
      '.arvo-tabs__tab',
    );
    if (!target) return;
    const tabId = target.getAttribute('data-tab-id');
    if (!tabId) return;
    const entry = this._tabs.find((t) => t.item.id === tabId);
    if (!entry) return;
    if (entry.item.isDisabled) return;
    if (!entry.menuBtnEl && !entry.hiddenMenu) return;
    e.preventDefault();
    this._openTabContextMenu(tabId);
  }

  private _syncSelection(): void {
    for (const entry of this._tabs) {
      const isSelected = entry.item.id === this._options.selectedId;
      entry.el.classList.toggle('active', isSelected);
      entry.el.setAttribute('aria-selected', String(isSelected));
      entry.el.tabIndex = isSelected ? 0 : -1;
      entry.el.setAttribute(
        'aria-label',
        composeAriaLabel(entry.item, isSelected),
      );
    }
    this._updateIndicator();
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail }),
    );
  }

  // -- Public API ---------------------------------------------------------

  select(id: string): void {
    const entry = this._tabs.find((t) => t.item.id === id);
    if (!entry || entry.item.isDisabled) return;
    if (id === this._options.selectedId) return;

    const idx = this._options.tabs.findIndex((t) => t.id === id);
    this._options.selectedId = id;
    this._syncSelection();
    this._overflowMgr?.refresh();
    this._dispatchEvent('tabs:select', { id, index: idx });
    this._options.onSelect?.({ id, index: idx });
  }

  selectedId(): string | null {
    return this._options.selectedId;
  }

  addTab(tab: TabItem, index?: number): void {
    const insertIdx =
      index !== undefined
        ? Math.min(index, this._options.tabs.length)
        : this._options.tabs.length;

    this._options.tabs.splice(insertIdx, 0, tab);
    this._rebuildDisplay();
    this._refreshAddButtonState();
  }

  removeTab(id: string): void {
    const tabIdx = this._options.tabs.findIndex((t) => t.id === id);
    if (tabIdx < 0) return;

    const wasSelected = id === this._options.selectedId;

    // Capture focus state BEFORE we tear down the entry so we can put
    // focus back onto a sensible neighbour after the rebuild. Without
    // this the act of destroying the closed tab's DOM moves focus to
    // <body> and the user has to Tab back into the strip.
    const activeEl = document.activeElement as HTMLElement | null;
    const focusedTabId =
      activeEl?.closest<HTMLDivElement>('.arvo-tabs__tab')?.getAttribute('data-tab-id') ??
      null;
    const focusWasOnClosedTab = focusedTabId === id;

    const entry = this._tabs.find((t) => t.item.id === id);
    if (entry) {
      this._destroyTabEntry(entry);
      this._tabs = this._tabs.filter((t) => t.item.id !== id);
    }

    this._options.tabs.splice(tabIdx, 1);

    let autoSelectedId: string | null = null;

    if (wasSelected) {
      const enabledTabs = this._options.tabs.filter((t) => !t.isDisabled);
      if (enabledTabs.length === 0) {
        this._options.selectedId = null;
      } else {
        let nextTab: TabItem | undefined;
        if (this._options.closeBehavior === 'select-next') {
          nextTab = enabledTabs.find((t) => this._options.tabs.indexOf(t) >= tabIdx);
          if (!nextTab) nextTab = enabledTabs[enabledTabs.length - 1];
        } else {
          const before = enabledTabs.filter((t) => this._options.tabs.indexOf(t) < tabIdx);
          nextTab = before.length > 0 ? before[before.length - 1] : enabledTabs[0];
        }
        if (nextTab) {
          this._options.selectedId = nextTab.id;
          autoSelectedId = nextTab.id;
        }
      }
    }

    this._rebuildDisplay();
    this._refreshAddButtonState();

    if (autoSelectedId !== null) {
      const newIdx = this._options.tabs.findIndex((t) => t.id === autoSelectedId);
      this._dispatchEvent('tabs:select', { id: autoSelectedId, index: newIdx });
      this._options.onSelect?.({ id: autoSelectedId, index: newIdx });
    }

    // Focus restoration after a close. Three cases:
    //   1) The closed tab was selected -- focus follows the auto-selected
    //      next tab so the user can keep arrow-keying without Tabbing
    //      back into the strip.
    //   2) The closed tab was the focused tab but NOT the selected tab
    //      (manual-activation mode). Focus the nearest enabled neighbour
    //      so keyboard close stays continuous.
    //   3) Focus was on a different tab than the one being closed -- the
    //      rebuild already preserved that tab's DOM, so the browser kept
    //      focus on it and we don't need to do anything.
    if (wasSelected && this._options.selectedId) {
      const focusEntry = this._tabs.find(
        (t) => t.item.id === this._options.selectedId,
      );
      focusEntry?.el.focus({ preventScroll: true });
    } else if (focusWasOnClosedTab) {
      // The focused tab was just closed but is NOT selected (manual mode).
      // Mirror the close-behavior search to find a sensible neighbour.
      const enabledEntries = this._tabs.filter(
        (e) => !e.item.isDisabled && !this._hiddenTabIds.has(e.item.id),
      );
      if (enabledEntries.length > 0) {
        let target: TabEntry | undefined;
        if (this._options.closeBehavior === 'select-next') {
          target =
            enabledEntries.find(
              (e) => this._options.tabs.indexOf(e.item) >= tabIdx,
            ) ?? enabledEntries[enabledEntries.length - 1];
        } else {
          const before = enabledEntries.filter(
            (e) => this._options.tabs.indexOf(e.item) < tabIdx,
          );
          target =
            before.length > 0 ? before[before.length - 1] : enabledEntries[0];
        }
        target?.el.focus({ preventScroll: true });
      }
    }
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;
    if (!this._element) return;
    this._options.isDisabled = state;
    this._element.classList.toggle('is-disabled', state);

    for (const entry of this._tabs) {
      if (state) {
        entry.el.classList.add('is-disabled');
        entry.el.setAttribute('aria-disabled', 'true');
      } else if (!entry.item.isDisabled) {
        entry.el.classList.remove('is-disabled');
        entry.el.removeAttribute('aria-disabled');
      }
      const tabDisabled = state || !!entry.item.isDisabled;
      entry.menuBtn?.disabled(tabDisabled);
      entry.pinBtn?.disabled(tabDisabled);
      entry.closeBtn?.disabled(tabDisabled);
      entry.hiddenMenu?.disabled(tabDisabled);
    }
    this._overflowTriggerInstance?.disabled(state);
    this._overflowMenuInstance?.disabled(state);
    this._refreshAddButtonState();
    this._updateIndicator();
    this._teardownSortable();
    this._setupSortable();
  }

  setLoading(isLoading: boolean): void {
    if (!this._element) return;
    this._options.isLoading = isLoading;
    this._element.classList.toggle('loading', isLoading);
    if (isLoading) {
      this._element.setAttribute('aria-busy', 'true');
    } else {
      this._element.removeAttribute('aria-busy');
    }

    for (const entry of this._tabs) {
      entry.menuBtn?.setLoading(isLoading);
      entry.pinBtn?.setLoading(isLoading);
      entry.closeBtn?.setLoading(isLoading);
      entry.hiddenMenu?.setLoading(isLoading);
      if (isLoading && !entry.skelEl) {
        entry.skelEl = document.createElement('span');
        entry.skelEl.className = 'arvo-tabs__skel';
        entry.skelEl.setAttribute('aria-hidden', 'true');
        entry.el.appendChild(entry.skelEl);
      } else if (!isLoading && entry.skelEl) {
        entry.skelEl.remove();
        entry.skelEl = null;
      }
    }
    this._overflowTriggerInstance?.setLoading(isLoading);
    this._overflowMenuInstance?.setLoading(isLoading);
    if (this._addBtnInstance) {
      this._addBtnInstance.setLoading(isLoading);
    }
    this._refreshAddButtonState();
    this._updateIndicator();
    this._teardownSortable();
    this._setupSortable();
  }

  destroy(): void {
    this._listEl?.removeEventListener('keydown', this._boundHandleKeyDown);
    this._listEl?.removeEventListener('click', this._boundHandleClick);
    this._listEl?.removeEventListener(
      'contextmenu',
      this._boundHandleContextMenu,
    );

    this._teardownSortable();
    this._indicatorResizeObserver?.disconnect();
    this._indicatorResizeObserver = null;

    this._overflowMgr?.destroy();
    this._overflowMgr = null;

    for (const entry of this._tabs) {
      entry.menuBtn?.destroy();
      entry.pinBtn?.destroy();
      entry.closeBtn?.destroy();
      entry.hiddenMenu?.destroy();
      entry.badgeInstance?.destroy();
      entry.statusInstance?.destroy();
      entry.alertInstance?.destroy();
      entry.truncationHandle?.destroy();
    }
    this._overflowMenuInstance?.destroy();
    this._overflowMenuInstance = null;
    this._overflowTriggerInstance?.destroy();
    this._overflowTriggerInstance = null;
    this._addBtnInstance?.destroy();
    this._addBtnInstance = null;

    if (this._element) {
      this._element.textContent = '';
      this._element.removeAttribute('aria-busy');
      this._element.className = '';
    }

    this._tabs = [];
    this._element = null;
    this._listEl = null;
    this._indicatorEl = null;
    this._rightClusterEl = null;
    this._overflowWrapperEl = null;
    this._overflowBtnEl = null;
    this._addBtnWrapperEl = null;
    this._dividerEl = null;
  }
}
