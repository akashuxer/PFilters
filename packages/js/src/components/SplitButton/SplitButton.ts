import { ArvoActionMenu } from '../ActionMenu/ActionMenu';
import type {
  ArvoActionMenuOptions,
  MenuItemData,
} from '../ActionMenu/ActionMenu';

export type { MenuItemData } from '../ActionMenu/ActionMenu';
import { type ListGroup } from '@arvo/core';
import type { MenuSearchProp } from '../../types/menu-search';
import type {
  DropdownButtonOverlayFactory,
  ExternalOverlayInstance,
} from '../DropdownButton/DropdownButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
//
// SplitButton is label-bearing, so per the design system tooltip standard it
// does not expose a tooltip option -- consumers wrap the trigger with
// ArvoTooltip when one is needed. The caret segment is treated as an internal
// part: consumers attach onFocus / onBlur to the action segment, and the
// caret's accessible name comes from `triggerLabel`.

/**
 * Scoped escape-hatch bag for inner `ArvoActionMenu` options the parent
 * does not curate as a flat option. Mirrors the React
 * `SplitButtonMenuProps` type exactly -- drift checker enforces parity.
 */
export type SplitButtonMenuProps = Pick<
  ArvoActionMenuOptions,
  'actionsVisibility' | 'submenuTrigger' | 'menuWidth' | 'submenuWidth'
>;

/**
 * Re-export the DropdownButton overlay factory shape -- SplitButton uses the
 * same contract. The factory is invoked with the caret/trigger segment
 * element.
 */
export type SplitButtonOverlayFactory = DropdownButtonOverlayFactory;

export interface ArvoSplitButtonOptions {
  label?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  icon?: string | null;
  mode?: 'action' | 'selection';
  displaySelected?: 'label' | 'value';
  value?: string | number | null;
  /**
   * Uncontrolled initial selected item id. Only consulted when `value` is
   * omitted. Mirrors the React `defaultValue` prop. Only meaningful when
   * `mode: 'selection'`.
   */
  defaultValue?: string | number | null;
  isDisabled?: boolean;
  isActionDisabled?: boolean;
  isTriggerDisabled?: boolean;
  isLoading?: boolean;
  /**
   * Menu items passed through to the internal ArvoActionMenu. Required
   * for the default internal-menu composition; OPTIONAL (and ignored)
   * when an external `overlay` factory is supplied or in pure-headless
   * mode.
   */
  items?: MenuItemData[] | ListGroup<MenuItemData>[];
  /** Enable search with defaults (`true`) or pass a config object. */
  search?: MenuSearchProp;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  maxHeight?: string;
  hasGroupDividers?: boolean;
  closeOnSelect?: boolean;
  /**
   * Escape hatch for inner `ArvoActionMenu` options the parent doesn't
   * expose flat. Bag-only keys (`actionsVisibility`,
   * `submenuTrigger`) flow through. On any conflict with a flat option,
   * the flat option wins.
   */
  menuProps?: SplitButtonMenuProps;
  /**
   * Optional external overlay factory invoked once at init with the
   * CARET segment element. When supplied, the internal ArvoActionMenu
   * is NOT created. Selection mode falls back to action mode (with a
   * dev warning) when this is set.
   */
  overlay?: SplitButtonOverlayFactory;
  /**
   * Controlled open state for external-overlay / headless mode.
   * When boolean, drives chrome and disables the MutationObserver
   * auto-sync path.
   */
  isOpen?: boolean;
  /** Accessible label for the trigger (caret) segment. Default: "Show options". */
  triggerLabel?: string;
  onAction?: (
    event: Event,
    selectedItem: MenuItemData | null,
  ) => void;
  onSelect?: (item: MenuItemData, index: number) => boolean | void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (isOpen: boolean) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoSplitButtonOptions,
    | 'onAction'
    | 'onSelect'
    | 'onOpen'
    | 'onClose'
    | 'onOpenChange'
    | 'onFocus'
    | 'onBlur'
    | 'maxHeight'
    | 'icon'
    | 'search'
    | 'defaultValue'
    | 'menuProps'
    | 'overlay'
    | 'isOpen'
  >
> & {
  search: MenuSearchProp | undefined;
  icon: string | null;
  maxHeight: string | null;
  menuProps: SplitButtonMenuProps | null;
  overlay: SplitButtonOverlayFactory | null;
  isOpen: boolean | null;
  onAction:
    | ((event: Event, selectedItem: MenuItemData | null) => void)
    | null;
  onSelect: ((item: MenuItemData, index: number) => boolean | void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onOpenChange: ((isOpen: boolean) => void) | null;
  onFocus: ((event: FocusEvent) => void) | null;
  onBlur: ((event: FocusEvent) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isGrouped(
  items: MenuItemData[] | ListGroup<MenuItemData>[],
): items is ListGroup<MenuItemData>[] {
  return items.length > 0 && 'items' in items[0];
}

function flattenItems(
  items: MenuItemData[] | ListGroup<MenuItemData>[],
): MenuItemData[] {
  if (isGrouped(items)) {
    const result: MenuItemData[] = [];
    for (const group of items) {
      for (const item of group.items) result.push(item);
    }
    return result;
  }
  return items as MenuItemData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoSplitButton {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _actionEl: HTMLButtonElement | null = null;
  private _triggerEl: HTMLButtonElement | null = null;
  private _iconEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _caretEl: HTMLSpanElement | null = null;
  private _actionMenu: ArvoActionMenu | null = null;
  private _externalOverlay: ExternalOverlayInstance | null = null;
  private _selectedItemId: string | number | null = null;
  private _isOpen = false;
  private _isExternalMode: boolean;
  private _ariaExpandedObserver: MutationObserver | null = null;
  // Roving tabindex: the split button is ONE tab stop. The active segment
  // holds tabindex=0; the other holds tabindex=-1. Mirrors the React twin.
  private _activeSegment: 'action' | 'trigger' = 'action';

  private _boundHandleActionClick: (event: Event) => void;
  private _boundHandleTriggerClick: (event: Event) => void;
  private _boundHandleActionKeydown: (event: KeyboardEvent) => void;
  private _boundHandleActionFocus: (event: FocusEvent) => void;
  private _boundHandleActionBlur: (event: FocusEvent) => void;
  private _boundHandleWrapperKeydown: (event: KeyboardEvent) => void;
  private _boundHandleWrapperFocusin: (event: FocusEvent) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'tertiary'] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    label: '',
    variant: 'primary',
    size: 'md',
    icon: null,
    mode: 'action',
    displaySelected: 'label',
    value: null,
    isDisabled: false,
    isActionDisabled: false,
    isTriggerDisabled: false,
    isLoading: false,
    items: [],
    search: undefined,
    placement: 'bottom-end',
    maxHeight: null,
    hasGroupDividers: true,
    closeOnSelect: true,
    menuProps: null,
    overlay: null,
    isOpen: null,
    triggerLabel: 'Show options',
    onAction: null,
    onSelect: null,
    onOpen: null,
    onClose: null,
    onOpenChange: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(
    element: HTMLElement,
    options?: ArvoSplitButtonOptions,
  ): ArvoSplitButton {
    return new ArvoSplitButton(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoSplitButtonOptions) {
    this._element = element;

    const variant =
      options?.variant &&
      (ArvoSplitButton.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoSplitButton.DEFAULTS.variant;

    const size =
      options?.size &&
      (ArvoSplitButton.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoSplitButton.DEFAULTS.size;

    this._options = {
      ...ArvoSplitButton.DEFAULTS,
      ...options,
      variant,
      size,
      label: options?.label ?? ArvoSplitButton.DEFAULTS.label,
      icon: options?.icon ?? null,
      maxHeight: options?.maxHeight ?? null,
      items: options?.items ?? [],
      menuProps: options?.menuProps ?? null,
      overlay: options?.overlay ?? null,
      isOpen: options?.isOpen ?? null,
      onAction: options?.onAction ?? null,
      onSelect: options?.onSelect ?? null,
      onOpen: options?.onOpen ?? null,
      onClose: options?.onClose ?? null,
      onOpenChange: options?.onOpenChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
    };


    const hasItems =
      Array.isArray(options?.items) && (options!.items as unknown[]).length > 0;
    const hasMenuProps = options?.menuProps != null;
    this._isExternalMode =
      this._options.overlay != null || (!hasItems && !hasMenuProps);

    // Selection mode + external overlay: dev warning + action fallback.
    if (
      this._isExternalMode &&
      this._options.mode === 'selection' &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production'
    ) {
      console.warn(
        'ArvoSplitButton: `mode: "selection"` is only supported with the default internal ArvoActionMenu composition. Falling back to `mode: "action"`. To update the action segment label from an external overlay, call your overlay\'s callback with whatever payload makes sense and update the label via setLabel() yourself.',
      );
      this._options.mode = 'action';
    }

    // Seed uncontrolled selected id from `defaultValue` when controlled
    // `value` is omitted.
    this._selectedItemId =
      options?.value !== undefined
        ? (options.value ?? null)
        : (options?.defaultValue !== undefined ? (options.defaultValue ?? null) : null);

    this._boundHandleActionClick = this._handleActionClick.bind(this);
    this._boundHandleTriggerClick = this._handleTriggerClick.bind(this);
    this._boundHandleActionKeydown = this._handleActionKeydown.bind(this);
    this._boundHandleActionFocus = this._handleActionFocus.bind(this);
    this._boundHandleActionBlur = this._handleActionBlur.bind(this);
    this._boundHandleWrapperKeydown = this._handleWrapperKeydown.bind(this);
    this._boundHandleWrapperFocusin = this._handleWrapperFocusin.bind(this);

    this._render();
    this._bindEvents();

    if (this._isExternalMode) {
      this._initExternalOverlay();
    } else {
      this._initActionMenu();
    }

    if (this._isExternalMode && this._options.isOpen === true) {
      this.setOpenState(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    el.classList.add('arvo-split-btn');
    el.classList.add(`arvo-split-btn--${this._options.variant}`);
    el.classList.add(`arvo-split-btn--${this._options.size}`);
    el.setAttribute('role', 'group');

    // Action segment
    const actionEl = document.createElement('button');
    actionEl.type = 'button';
    actionEl.className =
      `arvo-btn arvo-btn--${this._options.variant} ` +
      `arvo-btn--${this._options.size} arvo-split-btn__action`;
    this._actionEl = actionEl;

    const initialIcon = this._resolveDisplayIcon();
    if (initialIcon) {
      const iconEl = document.createElement('span');
      iconEl.className = `arvo-split-btn__icon o9con o9con-${initialIcon}`;
      iconEl.setAttribute('aria-hidden', 'true');
      actionEl.appendChild(iconEl);
      this._iconEl = iconEl;
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'arvo-split-btn__lbl';
    labelEl.textContent = this._resolveDisplayLabel();
    actionEl.appendChild(labelEl);
    this._labelEl = labelEl;

    // Trigger segment (caret)
    const triggerEl = document.createElement('button');
    triggerEl.type = 'button';
    triggerEl.className =
      `arvo-btn arvo-btn--${this._options.variant} ` +
      `arvo-btn--${this._options.size} arvo-split-btn__trigger`;
    triggerEl.setAttribute('aria-label', this._options.triggerLabel);
    this._triggerEl = triggerEl;

    const caretEl = document.createElement('span');
    caretEl.className = 'arvo-split-btn__caret o9con o9con-angle-down';
    caretEl.setAttribute('aria-hidden', 'true');
    triggerEl.appendChild(caretEl);
    this._caretEl = caretEl;

    el.appendChild(actionEl);
    el.appendChild(triggerEl);

    // `_applySegmentDisabled` also seeds the initial roving tabindex via
    // `_applyRovingTabindex`, so the action segment starts as the rover
    // (tabindex=0) and the trigger starts at -1.
    this._applySegmentDisabled();

    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    }

    if (this._options.isDisabled) {
      el.setAttribute('aria-disabled', 'true');
    }
  }

  private _applySegmentDisabled(): void {
    if (this._actionEl) {
      this._actionEl.disabled =
        this._options.isDisabled ||
        this._options.isActionDisabled ||
        this._options.isLoading;
    }
    if (this._triggerEl) {
      this._triggerEl.disabled =
        this._options.isDisabled ||
        this._options.isTriggerDisabled ||
        this._options.isLoading;
    }
    this._applyRovingTabindex();
  }

  // ---------------------------------------------------------------------------
  // Roving tabindex
  // ---------------------------------------------------------------------------

  private _isActionDisabled(): boolean {
    return (
      this._options.isDisabled ||
      this._options.isActionDisabled ||
      this._options.isLoading
    );
  }

  private _isTriggerDisabled(): boolean {
    return (
      this._options.isDisabled ||
      this._options.isTriggerDisabled ||
      this._options.isLoading
    );
  }

  private _effectiveActiveSegment(): 'action' | 'trigger' {
    const actionOff = this._isActionDisabled();
    const triggerOff = this._isTriggerDisabled();
    if (this._activeSegment === 'action' && actionOff && !triggerOff)
      return 'trigger';
    if (this._activeSegment === 'trigger' && triggerOff && !actionOff)
      return 'action';
    return this._activeSegment;
  }

  private _applyRovingTabindex(): void {
    const active = this._effectiveActiveSegment();
    if (this._actionEl) {
      const tabIdx = this._isActionDisabled() || active !== 'action' ? -1 : 0;
      this._actionEl.tabIndex = tabIdx;
    }
    if (this._triggerEl) {
      const tabIdx =
        this._isTriggerDisabled() || active !== 'trigger' ? -1 : 0;
      this._triggerEl.tabIndex = tabIdx;
    }
  }

  private _setActiveSegment(next: 'action' | 'trigger'): void {
    this._activeSegment = next;
    this._applyRovingTabindex();
  }

  private _focusSegment(next: 'action' | 'trigger'): void {
    this._setActiveSegment(next);
    const target = next === 'action' ? this._actionEl : this._triggerEl;
    target?.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private _bindEvents(): void {
    this._actionEl?.addEventListener('click', this._boundHandleActionClick);
    this._actionEl?.addEventListener('keydown', this._boundHandleActionKeydown);
    this._actionEl?.addEventListener('focus', this._boundHandleActionFocus);
    this._actionEl?.addEventListener('blur', this._boundHandleActionBlur);
    // External-mode-only trigger click. In internal mode the ArvoActionMenu
    // attached to the trigger element binds its own click handler via the
    // OverlaySurface engine (so adding our own would either double-fire or
    // fight the menu's state machine). In external mode the consumer-supplied
    // overlay similarly binds its own click handler -- our click handler
    // exists only to suppress activation when the trigger segment is
    // disabled and to keep the click event reachable for the wrapper's own
    // dispatch / aria-expanded MutationObserver pipeline.
    this._triggerEl?.addEventListener('click', this._boundHandleTriggerClick);
    // Wrapper-level handlers: roving tabindex + open-menu shortcut. The
    // trigger segment has no per-element keydown -- the wrapper owns
    // ArrowDown/ArrowLeft/ArrowRight/Home/End for both segments uniformly.
    this._element?.addEventListener('keydown', this._boundHandleWrapperKeydown);
    this._element?.addEventListener('focusin', this._boundHandleWrapperFocusin);
  }

  private _handleActionClick(event: Event): void {
    if (
      !this._actionEl ||
      this._actionEl.disabled ||
      this._options.isLoading
    ) {
      return;
    }

    if (this._options.mode === 'selection') {
      const selectedItem = this._getSelectedItem();
      if (selectedItem) {
        const flat = flattenItems(this._options.items);
        const currentIndex = flat.findIndex((i) => i.id === selectedItem.id);
        this._dispatchEvent('split-btn:action', { selectedItem });
        this._options.onSelect?.(selectedItem, currentIndex);
        return;
      }
    }

    this._dispatchEvent('split-btn:action', { selectedItem: null });
    this._options.onAction?.(event, null);
  }

  private _handleTriggerClick(event: Event): void {
    if (
      !this._triggerEl ||
      this._triggerEl.disabled ||
      this._options.isLoading
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // In both internal and external mode, the inner overlay binds its own
    // click handler on this element (via createOverlaySurface). The wrapper's
    // own handler is intentionally a no-op for normal clicks.
  }

  private _handleActionKeydown(event: KeyboardEvent): void {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      (this._options.isDisabled ||
        this._options.isActionDisabled ||
        this._options.isLoading)
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private _handleActionFocus(event: FocusEvent): void {
    this._options.onFocus?.(event);
  }

  private _handleActionBlur(event: FocusEvent): void {
    this._options.onBlur?.(event);
  }

  /**
   * Wrapper-level keydown -- composite-widget keyboard model.
   *
   * ArrowLeft / ArrowRight / Home / End move the rover between the action
   * and trigger segments (roving tabindex). ArrowDown / Alt+ArrowDown on
   * either segment opens the menu (focus-trap moves into the first item).
   * The open-menu shortcut works even if the trigger segment itself is
   * disabled, because the menu only needs the trigger element as an anchor
   * for positioning + focus return -- not as an interactive surface.
   *
   * In external mode ArrowDown synthesizes a click on the caret segment
   * so any click-trigger overlay opens; consumers using non-click overlays
   * should drive the open state via the controlled `isOpen` option.
   */
  private _handleWrapperKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    const onAction = target === this._actionEl;
    const onTrigger = target === this._triggerEl;
    if (!onAction && !onTrigger) return;

    const { key, altKey } = event;
    const actionOff = this._isActionDisabled();
    const triggerOff = this._isTriggerDisabled();

    if (key === 'ArrowDown' || (altKey && key === 'ArrowDown')) {
      if (actionOff && triggerOff) return;
      event.preventDefault();
      if (this._isExternalMode) {
        if (this._externalOverlay?.open) {
          this._externalOverlay.open();
        } else {
          this._triggerEl?.click();
        }
      } else {
        this._actionMenu?.open();
      }
      return;
    }

    if (key === 'ArrowRight' && onAction) {
      if (triggerOff) return;
      event.preventDefault();
      this._focusSegment('trigger');
      return;
    }

    if (key === 'ArrowLeft' && onTrigger) {
      if (actionOff) return;
      event.preventDefault();
      this._focusSegment('action');
      return;
    }

    if (key === 'Home') {
      if (actionOff) return;
      event.preventDefault();
      this._focusSegment('action');
      return;
    }

    if (key === 'End') {
      if (triggerOff) return;
      event.preventDefault();
      this._focusSegment('trigger');
      return;
    }
  }

  private _handleWrapperFocusin(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (target === this._actionEl) this._setActiveSegment('action');
    else if (target === this._triggerEl) this._setActiveSegment('trigger');
  }

  // ---------------------------------------------------------------------------
  // ActionMenu Init (internal mode)
  // ---------------------------------------------------------------------------

  private _initActionMenu(): void {
    if (!this._triggerEl) return;

    // Hybrid prop surface: spread menuProps first; flat / computed wins.
    const menuOptions: ArvoActionMenuOptions = {
      ...(this._options.menuProps ?? undefined),
      items: this._getProcessedItems(),
      search: this._options.search,
      placement: this._options.placement,
      maxHeight: this._options.maxHeight ?? undefined,
      hasGroupDividers: this._options.hasGroupDividers,
      closeOnSelect: this._options.closeOnSelect,
      isDisabled:
        this._options.isDisabled ||
        this._options.isTriggerDisabled ||
        this._options.isLoading,
      onOpen: this._options.onOpen ?? undefined,
      onClose: this._options.onClose ?? undefined,
      onSelect: (item, index) => this._handleSelect(item, index),
      onOpenChange: (isOpen) => this.setOpenState(isOpen),
    };

    this._actionMenu = ArvoActionMenu.initialize(this._triggerEl, menuOptions);
  }

  // ---------------------------------------------------------------------------
  // External overlay init
  // ---------------------------------------------------------------------------

  private _initExternalOverlay(): void {
    if (!this._triggerEl) return;

    if (this._options.overlay) {
      try {
        this._externalOverlay = this._options.overlay(this._triggerEl);
      } catch (err) {
        if (
          typeof process !== 'undefined' &&
          process.env?.NODE_ENV !== 'production'
        ) {
          console.error(
            'ArvoSplitButton: overlay factory threw while initializing.',
            err,
          );
        }
      }
    }

    // Auto-sync chrome via MutationObserver on the caret segment's
    // aria-expanded attribute when not controlled.
    if (this._options.isOpen == null && typeof MutationObserver !== 'undefined') {
      this._ariaExpandedObserver = new MutationObserver(() => {
        const value = this._triggerEl?.getAttribute('aria-expanded');
        this.setOpenState(value === 'true');
      });
      this._ariaExpandedObserver.observe(this._triggerEl, {
        attributes: true,
        attributeFilter: ['aria-expanded'],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Selection Logic (internal mode only)
  // ---------------------------------------------------------------------------

  private _getSelectedItem(): MenuItemData | null {
    if (this._selectedItemId == null) return null;
    const flat = flattenItems(this._options.items);
    const id = String(this._selectedItemId);
    return flat.find((item) => item.id === id) ?? null;
  }

  private _getProcessedItems(): MenuItemData[] | ListGroup<MenuItemData>[] {
    const { items, mode } = this._options;
    if (mode !== 'selection' || this._selectedItemId == null) return items;

    const selId = String(this._selectedItemId);
    const mark = (item: MenuItemData): MenuItemData => ({
      ...item,
      active: item.id === selId,
    });

    if (isGrouped(items)) {
      return items.map((group) => ({
        ...group,
        items: group.items.map(mark),
      }));
    }
    return (items as MenuItemData[]).map(mark);
  }

  private _handleSelect(item: MenuItemData, index: number): boolean | void {
    if (this._options.mode === 'selection') {
      const previousItem = this._getSelectedItem();
      this._selectedItemId = item.id;
      this._updateDisplayLabelAndIcon();
      this._actionMenu?.updateItems(this._getProcessedItems());

      this._dispatchEvent(
        'split-btn:change',
        { item, previousItem },
        false,
      );
    } else {
      this._dispatchEvent('split-btn:select', { item, index });
    }

    return this._options.onSelect?.(item, index);
  }

  // ---------------------------------------------------------------------------
  // Display Label / Icon Resolution
  // ---------------------------------------------------------------------------

  private _resolveDisplayLabel(): string {
    if (this._options.mode === 'action' || this._selectedItemId == null) {
      return this._options.label;
    }

    const selectedItem = this._getSelectedItem();
    if (!selectedItem) return this._options.label;

    if (this._options.displaySelected === 'value') {
      const val = (selectedItem as unknown as Record<string, unknown>).value;
      return val != null ? String(val) : selectedItem.id;
    }
    return selectedItem.label;
  }

  private _resolveDisplayIcon(): string | null {
    if (this._options.mode === 'action') return this._options.icon;
    const selectedItem = this._getSelectedItem();
    return selectedItem?.icon ?? this._options.icon;
  }

  private _updateDisplayLabelAndIcon(): void {
    if (this._labelEl) {
      this._labelEl.textContent = this._resolveDisplayLabel();
    }
    this._setRenderedIcon(this._resolveDisplayIcon());
  }

  private _setRenderedIcon(iconName: string | null): void {
    if (!this._actionEl) return;

    if (!iconName) {
      this._iconEl?.remove();
      this._iconEl = null;
      return;
    }

    const existing = this._iconEl;
    if (existing) {
      const toRemove: string[] = [];
      existing.classList.forEach((c) => {
        if (c.startsWith('o9con-')) toRemove.push(c);
      });
      toRemove.forEach((c) => existing.classList.remove(c));
      existing.classList.add(`o9con-${iconName}`);
      return;
    }

    const iconEl = document.createElement('span');
    iconEl.className = `arvo-split-btn__icon o9con o9con-${iconName}`;
    iconEl.setAttribute('aria-hidden', 'true');
    this._actionEl.insertBefore(iconEl, this._actionEl.firstChild);
    this._iconEl = iconEl;
  }

  private _applySelection(itemId: string | number): void {
    this._selectedItemId = itemId;
    this._updateDisplayLabelAndIcon();
    this._actionMenu?.updateItems(this._getProcessedItems());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _dispatchEvent(
    name: string,
    detail: Record<string, unknown>,
    cancelable = true,
  ): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable, detail }),
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    if (this._isExternalMode) {
      if (this._externalOverlay?.open) {
        this._externalOverlay.open();
      } else {
        this._triggerEl?.click();
      }
      return;
    }
    this._actionMenu?.open();
  }

  close(): void {
    if (this._isExternalMode) {
      if (this._externalOverlay?.close) {
        this._externalOverlay.close();
      } else if (this._isOpen) {
        this._triggerEl?.click();
      }
      return;
    }
    this._actionMenu?.close();
  }

  toggle(force?: boolean): void {
    if (this._isExternalMode) {
      if (this._externalOverlay?.toggle) {
        this._externalOverlay.toggle(force);
        return;
      }
      if (force === undefined) {
        this._triggerEl?.click();
        return;
      }
      if (force && !this._isOpen) this.open();
      else if (!force && this._isOpen) this.close();
      return;
    }
    this._actionMenu?.toggle(force);
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Returns the CARET (trigger) segment so a consumer-composed external
   * overlay can anchor against it. NOT the action segment -- using the
   * action segment as an overlay anchor would misalign the popover.
   * Returns null after destroy().
   */
  triggerElement(): HTMLElement | null {
    return this._triggerEl;
  }

  /**
   * Manually flip the wrapper's open chrome state. Idempotent -- no-op on
   * transitions to the current state. Called automatically when the wrapper
   * observes `aria-expanded` changes on the caret segment.
   */
  setOpenState(open: boolean): void {
    if (this._isOpen === open) return;
    this._isOpen = open;
    this._element?.classList.toggle('open', open);
    if (open) {
      this._dispatchEvent('split-btn:open', {});
    } else {
      this._dispatchEvent('split-btn:close', {});
    }
    this._options.onOpenChange?.(open);
  }

  value(itemId?: string | number | null): MenuItemData | null | void {
    if (itemId === undefined) {
      if (this._options.mode !== 'selection' || this._selectedItemId == null) {
        return null;
      }
      return this._getSelectedItem();
    }

    if (this._options.mode !== 'selection') return;

    if (itemId == null) {
      this._selectedItemId = null;
      this._updateDisplayLabelAndIcon();
      this._actionMenu?.updateItems(this._getProcessedItems());
      return;
    }

    this._applySelection(itemId);
  }

  updateItems(items: MenuItemData[] | ListGroup<MenuItemData>[]): void {
    this._options.items = items;

    if (this._selectedItemId != null && this._options.mode === 'selection') {
      const flat = flattenItems(items);
      const selId = String(this._selectedItemId);
      if (!flat.some((item) => item.id === selId)) {
        this._selectedItemId = null;
      }
    }

    this._actionMenu?.updateItems(this._getProcessedItems());
    this._updateDisplayLabelAndIcon();
  }

  setLabel(text: string): void {
    this._options.label = text;
    this._updateDisplayLabelAndIcon();
  }

  setIcon(iconName: string | null): void {
    this._options.icon = iconName;
    this._updateDisplayLabelAndIcon();
  }

  setVariant(variant: string): void {
    if (!(ArvoSplitButton.VARIANTS as readonly string[]).includes(variant))
      return;

    const oldVariant = this._options.variant;

    this._element?.classList.remove(`arvo-split-btn--${oldVariant}`);
    this._element?.classList.add(`arvo-split-btn--${variant}`);

    if (this._actionEl) {
      this._actionEl.classList.remove(`arvo-btn--${oldVariant}`);
      this._actionEl.classList.add(`arvo-btn--${variant}`);
    }
    if (this._triggerEl) {
      this._triggerEl.classList.remove(`arvo-btn--${oldVariant}`);
      this._triggerEl.classList.add(`arvo-btn--${variant}`);
    }

    this._options.variant = variant as RequiredOptions['variant'];
  }

  setSize(size: string): void {
    if (!(ArvoSplitButton.SIZES as readonly string[]).includes(size)) return;

    const oldSize = this._options.size;

    this._element?.classList.remove(`arvo-split-btn--${oldSize}`);
    this._element?.classList.add(`arvo-split-btn--${size}`);

    if (this._actionEl) {
      this._actionEl.classList.remove(`arvo-btn--${oldSize}`);
      this._actionEl.classList.add(`arvo-btn--${size}`);
    }
    if (this._triggerEl) {
      this._triggerEl.classList.remove(`arvo-btn--${oldSize}`);
      this._triggerEl.classList.add(`arvo-btn--${size}`);
    }

    this._options.size = size as RequiredOptions['size'];
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading;

    const el = this._element;
    if (el) {
      if (loading) {
        el.classList.add('loading');
        el.setAttribute('aria-busy', 'true');
      } else {
        el.classList.remove('loading');
        el.removeAttribute('aria-busy');
      }
    }

    this._applySegmentDisabled();
    this._actionMenu?.disabled(
      this._options.isDisabled ||
        this._options.isTriggerDisabled ||
        loading,
    );
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;
    this._applySegmentDisabled();

    if (this._element) {
      if (state) {
        this._element.setAttribute('aria-disabled', 'true');
      } else {
        this._element.removeAttribute('aria-disabled');
      }
    }

    this._actionMenu?.disabled(
      state ||
        this._options.isTriggerDisabled ||
        this._options.isLoading,
    );
  }

  actionDisabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isActionDisabled;
    }

    this._options.isActionDisabled = state;
    this._applySegmentDisabled();
  }

  triggerDisabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isTriggerDisabled;
    }

    this._options.isTriggerDisabled = state;
    this._applySegmentDisabled();
    this._actionMenu?.disabled(
      this._options.isDisabled || state || this._options.isLoading,
    );
  }

  focus(): void {
    this._actionEl?.focus();
  }

  destroy(): void {
    this._actionMenu?.destroy();
    this._actionMenu = null;

    this._externalOverlay?.destroy?.();
    this._externalOverlay = null;

    this._ariaExpandedObserver?.disconnect();
    this._ariaExpandedObserver = null;

    if (this._actionEl) {
      this._actionEl.removeEventListener('click', this._boundHandleActionClick);
      this._actionEl.removeEventListener('keydown', this._boundHandleActionKeydown);
      this._actionEl.removeEventListener('focus', this._boundHandleActionFocus);
      this._actionEl.removeEventListener('blur', this._boundHandleActionBlur);
    }

    if (this._triggerEl) {
      this._triggerEl.removeEventListener('click', this._boundHandleTriggerClick);
    }

    const el = this._element;
    if (el) {
      el.removeEventListener('keydown', this._boundHandleWrapperKeydown);
      el.removeEventListener('focusin', this._boundHandleWrapperFocusin);
      el.classList.remove('arvo-split-btn', 'open', 'loading');
      ArvoSplitButton.VARIANTS.forEach((v) =>
        el.classList.remove(`arvo-split-btn--${v}`),
      );
      ArvoSplitButton.SIZES.forEach((s) =>
        el.classList.remove(`arvo-split-btn--${s}`),
      );

      el.removeAttribute('role');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('aria-busy');

      this._iconEl?.remove();
      this._labelEl?.remove();
      this._caretEl?.remove();
      this._actionEl?.remove();
      this._triggerEl?.remove();
    }

    this._element = null;
    this._actionEl = null;
    this._triggerEl = null;
    this._iconEl = null;
    this._labelEl = null;
    this._caretEl = null;
  }
}
