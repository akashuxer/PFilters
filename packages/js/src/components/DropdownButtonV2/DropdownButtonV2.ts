import { ArvoActionMenu } from '../ActionMenu/ActionMenu';
import type {
  ArvoActionMenuOptions,
  MenuItemData,
} from '../ActionMenu/ActionMenu';

export type { MenuItemData } from '../ActionMenu/ActionMenu';
import { type ListGroup } from '@arvo/core';
import type { MenuSearchProp } from '../../types/menu-search';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Scoped escape-hatch bag for inner `ArvoActionMenu` options that the
 * parent does not curate as a flat option. Mirrors the React
 * `DropdownButtonMenuProps` type exactly -- the drift checker enforces
 * key-set parity.
 *
 * Excludes parent-owned (`items`, `onSelect`, `onOpenChange`,
 * `isDisabled`) and already-flat (`placement`, `maxHeight`, `search`,
 * `hasGroupDividers`, `closeOnSelect`, `onOpen`, `onClose`) options. On
 * overlap, the parent's flat option wins.
 */
export type DropdownButtonMenuProps = Pick<
  ArvoActionMenuOptions,
  'actionsVisibility' | 'submenuTrigger' | 'menuWidth' | 'submenuWidth'
>;

/**
 * Loose duck-typed shape of an external overlay instance returned by an
 * `overlay` factory. Every Arvo overlay (Popover, HybridPopover,
 * DropdownTree, ActionMenu, RichTooltip, OptionList) exposes some
 * subset of these methods -- we forward when the method exists, fall back
 * to a synthesized click otherwise.
 */
export interface ExternalOverlayInstance {
  destroy?: () => void;
  open?: () => void;
  close?: () => void;
  toggle?: (force?: boolean) => void;
}

export type DropdownButtonOverlayFactory = (
  trigger: HTMLElement,
) => ExternalOverlayInstance;

export type ArvoDropdownButtonV2Appearance = 'button' | 'field';

export interface ArvoDropdownButtonV2Options {
  label?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline';
  appearance?: ArvoDropdownButtonV2Appearance;
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
  isLoading?: boolean;
  /**
   * Menu items passed through to the internal ArvoActionMenu. Required
   * for the default internal-menu composition; OPTIONAL (and ignored)
   * when an external `overlay` factory is supplied or the wrapper is in
   * pure-headless mode.
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
  menuProps?: DropdownButtonMenuProps;
  /**
   * Optional external overlay factory. When supplied, the internal
   * ArvoActionMenu is NOT created/initialized; the factory is invoked
   * once at init with the trigger element and the returned instance is
   * stored and destroyed on `destroy()`. The wrapper still owns chrome
   * state -- it observes the trigger's `aria-expanded` attribute (via
   * MutationObserver) and toggles `.open` + dispatches `dd-btn:open` /
   * `dd-btn:close` accordingly. Selection mode falls back to action
   * mode (with a dev warning) when an overlay factory is in use.
   */
  overlay?: DropdownButtonOverlayFactory;
  /**
   * Controlled open state for external-overlay / headless mode. When a
   * boolean is supplied, the wrapper mirrors it for chrome state. The
   * MutationObserver path is then disabled. In the default internal
   * ArvoActionMenu composition this is ignored (the menu drives state
   * itself).
   */
  isOpen?: boolean;
  onSelect?: (item: MenuItemData, index: number) => boolean | void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (isOpen: boolean) => void;
  onClick?: (event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoDropdownButtonV2Options,
    | 'onSelect'
    | 'onOpen'
    | 'onClose'
    | 'onOpenChange'
    | 'onClick'
    | 'onFocus'
    | 'onBlur'
    | 'maxHeight'
    | 'icon'
    | 'appearance'
    | 'search'
    | 'defaultValue'
    | 'menuProps'
    | 'overlay'
    | 'isOpen'
  >
> & {
  search: MenuSearchProp | undefined;
  icon: string | null;
  appearance: ArvoDropdownButtonV2Appearance;
  maxHeight: string | null;
  menuProps: DropdownButtonMenuProps | null;
  overlay: DropdownButtonOverlayFactory | null;
  isOpen: boolean | null;
  onSelect: ((item: MenuItemData, index: number) => boolean | void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onOpenChange: ((isOpen: boolean) => void) | null;
  onClick: ((event: Event) => void) | null;
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

export class ArvoDropdownButtonV2 {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _actionMenu: ArvoActionMenu | null = null;
  private _externalOverlay: ExternalOverlayInstance | null = null;
  private _iconEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _caretEl: HTMLSpanElement | null = null;
  private _selectedItemId: string | number | null = null;
  private _isOpen = false;
  private _originalLabel: string;
  private _isExternalMode: boolean;
  private _ariaExpandedObserver: MutationObserver | null = null;

  private _boundHandleClick: (event: Event) => void;
  private _boundHandleFocus: (event: FocusEvent) => void;
  private _boundHandleBlur: (event: FocusEvent) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'tertiary', 'outline'] as const;
  static readonly APPEARANCES = ['button', 'field'] as const;
  static readonly FIELD_VARIANTS = ['secondary', 'tertiary'] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    label: '',
    variant: 'primary',
    appearance: 'button',
    size: 'md',
    icon: null,
    mode: 'action',
    displaySelected: 'label',
    value: null,
    isDisabled: false,
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
    onSelect: null,
    onOpen: null,
    onClose: null,
    onOpenChange: null,
    onClick: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(
    element: HTMLElement,
    options?: ArvoDropdownButtonV2Options,
  ): ArvoDropdownButtonV2 {
    return new ArvoDropdownButtonV2(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoDropdownButtonV2Options) {
    this._element = element;

    const appearance =
      options?.appearance &&
      (ArvoDropdownButtonV2.APPEARANCES as readonly string[]).includes(options.appearance)
        ? options.appearance
        : ArvoDropdownButtonV2.DEFAULTS.appearance;

    const variant =
      options?.variant &&
      (ArvoDropdownButtonV2.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoDropdownButtonV2.DEFAULTS.variant;

    const resolvedVariant =
      appearance === 'field' &&
      !(ArvoDropdownButtonV2.FIELD_VARIANTS as readonly string[]).includes(variant)
        ? 'secondary'
        : variant;

    const size =
      options?.size &&
      (ArvoDropdownButtonV2.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoDropdownButtonV2.DEFAULTS.size;

    this._options = {
      ...ArvoDropdownButtonV2.DEFAULTS,
      ...options,
      appearance,
      variant: resolvedVariant,
      size,
      label: options?.label ?? element.textContent?.trim() ?? '',
      icon: options?.icon ?? null,
      maxHeight: options?.maxHeight ?? null,
      items: options?.items ?? [],
      menuProps: options?.menuProps ?? null,
      overlay: options?.overlay ?? null,
      isOpen: options?.isOpen ?? null,
      onSelect: options?.onSelect ?? null,
      onOpen: options?.onOpen ?? null,
      onClose: options?.onClose ?? null,
      onOpenChange: options?.onOpenChange ?? null,
      onClick: options?.onClick ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
    };


    // -- Composition mode --------------------------------------------------
    // External when an overlay factory is provided OR neither items nor a
    // menuProps escape-hatch were supplied (pure headless). Anything that
    // touches the internal ArvoActionMenu path (items + menuProps) keeps
    // the default behavior.
    const hasItems =
      Array.isArray(options?.items) && (options!.items as unknown[]).length > 0;
    const hasMenuProps = options?.menuProps != null;
    this._isExternalMode =
      this._options.overlay != null || (!hasItems && !hasMenuProps);

    // -- Selection mode + external overlay: dev warning + action fallback --
    if (
      this._isExternalMode &&
      this._options.mode === 'selection' &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production'
    ) {
      console.warn(
        'ArvoDropdownButtonV2: `mode: "selection"` is only supported with the default internal ArvoActionMenu composition. Falling back to `mode: "action"`. To update the button label from an external overlay, call your overlay\'s onSelect handler with whatever payload makes sense and update the label via setLabel() yourself.',
      );
      this._options.mode = 'action';
    }

    this._originalLabel = this._options.label;
    // Seed uncontrolled selected id from `defaultValue` when controlled
    // `value` is omitted.
    this._selectedItemId =
      options?.value !== undefined
        ? (options.value ?? null)
        : (options?.defaultValue !== undefined ? (options.defaultValue ?? null) : null);

    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);

    this._render();
    this._bindEvents();

    if (this._isExternalMode) {
      this._initExternalOverlay();
    } else {
      this._initActionMenu();
    }

    if (
      this._selectedItemId != null &&
      this._options.mode === 'selection' &&
      !this._isExternalMode
    ) {
      this._applySelection(this._selectedItemId);
    }

    // Seed open chrome from a controlled `isOpen` option (external only).
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

    el.classList.add('arvo-dd-btn', 'arvo-btn');
    el.classList.add(`arvo-btn--${this._options.variant}`);
    el.classList.add(`arvo-btn--${this._options.size}`);
    el.classList.add(`arvo-dd-btn--${this._options.appearance}`);

    if (el instanceof HTMLButtonElement) {
      el.setAttribute('type', 'button');
    }

    if (this._options.icon) {
      this._iconEl = document.createElement('span');
      this._iconEl.className = `arvo-dd-btn__icon o9con o9con-${this._options.icon}`;
      this._iconEl.setAttribute('aria-hidden', 'true');
      el.appendChild(this._iconEl);
    }

    this._labelEl = document.createElement('span');
    this._labelEl.className = 'arvo-dd-btn__lbl';
    this._labelEl.textContent = this._options.label;
    el.appendChild(this._labelEl);

    this._caretEl = document.createElement('span');
    this._caretEl.className = 'arvo-dd-btn__caret o9con o9con-angle-down';
    this._caretEl.setAttribute('aria-hidden', 'true');
    el.appendChild(this._caretEl);

    if (this._options.isDisabled) {
      if (el instanceof HTMLButtonElement) {
        el.disabled = true;
      } else {
        el.setAttribute('aria-disabled', 'true');
      }
    }

    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    }

  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private _bindEvents(): void {
    this._element?.addEventListener('click', this._boundHandleClick);
    this._element?.addEventListener('focus', this._boundHandleFocus);
    this._element?.addEventListener('blur', this._boundHandleBlur);
    this._element?.addEventListener('keydown', this._boundHandleKeydown);
  }

  private _handleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this._options.onClick?.(event);
  }

  private _handleFocus(event: FocusEvent): void {
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: FocusEvent): void {
    this._options.onBlur?.(event);
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      (this._options.isDisabled || this._options.isLoading)
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // ArrowDown (with or without Alt) opens the menu. ArvoActionMenu's
    // open path auto-focuses the first enabled item. Alt+ArrowDown stays
    // supported for WAI-ARIA combobox parity. Modifier combos other than
    // Alt (Ctrl, Meta, Shift) are ignored so we don't swallow app-level
    // shortcuts.
    if (
      event.key === 'ArrowDown' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !this._options.isDisabled &&
      !this._options.isLoading
    ) {
      event.preventDefault();
      if (this._isExternalMode) {
        // External overlay: forward to the overlay instance when it has an
        // open() method (Popover, HybridPopover, ActionMenu, DropdownTree,
        // RichTooltip, OptionList all expose this). Otherwise synthesize a
        // click on the trigger so any click-trigger overlay opens.
        if (this._externalOverlay?.open) {
          this._externalOverlay.open();
        } else {
          this._element?.click();
        }
      } else {
        this._actionMenu?.open();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ActionMenu Init (internal mode)
  // ---------------------------------------------------------------------------

  private _initActionMenu(): void {
    if (!this._element) return;

    // Hybrid prop surface: spread `menuProps` first so the flat / computed
    // values below always win on overlap. The bag's TypeScript whitelist
    // (DropdownButtonMenuProps) excludes anything already flat, so in
    // practice only bag-only keys (`actionsVisibility`,
    // `submenuTrigger`) flow through here.
    const menuOptions: ArvoActionMenuOptions = {
      ...(this._options.menuProps ?? undefined),
      items: this._getProcessedItems(),
      search: this._options.search,
      placement: this._options.placement,
      maxHeight: this._options.maxHeight ?? undefined,
      hasGroupDividers: this._options.hasGroupDividers,
      closeOnSelect: this._options.closeOnSelect,
      isDisabled: this._options.isDisabled || this._options.isLoading,
      onOpen: this._options.onOpen ?? undefined,
      onClose: this._options.onClose ?? undefined,
      onSelect: (item, index) => this._handleSelect(item, index),
      onOpenChange: (isOpen) => this.setOpenState(isOpen),
    };

    this._actionMenu = ArvoActionMenu.initialize(this._element, menuOptions);
  }

  // ---------------------------------------------------------------------------
  // External overlay init (overlay-slot / headless)
  // ---------------------------------------------------------------------------

  private _initExternalOverlay(): void {
    if (!this._element) return;

    // Run the consumer-supplied factory exactly once at init. The returned
    // instance is destroyed (when it exposes `destroy`) in our own destroy().
    if (this._options.overlay) {
      try {
        this._externalOverlay = this._options.overlay(this._element);
      } catch (err) {
        if (
          typeof process !== 'undefined' &&
          process.env?.NODE_ENV !== 'production'
        ) {
          console.error(
            'ArvoDropdownButtonV2: overlay factory threw while initializing the external overlay.',
            err,
          );
        }
      }
    }

    // Open-state sync: if controlled `isOpen` was supplied we honor it
    // (set up via constructor). Otherwise install a MutationObserver on the
    // trigger element's aria-expanded attribute -- every Arvo overlay sets
    // this through the OverlaySurface engine, so we auto-sync chrome with
    // zero consumer wiring.
    if (this._options.isOpen == null && typeof MutationObserver !== 'undefined') {
      this._ariaExpandedObserver = new MutationObserver(() => {
        const value = this._element?.getAttribute('aria-expanded');
        this.setOpenState(value === 'true');
      });
      this._ariaExpandedObserver.observe(this._element, {
        attributes: true,
        attributeFilter: ['aria-expanded'],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Selection Logic (internal mode only)
  // ---------------------------------------------------------------------------

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
      const previousId = this._selectedItemId;
      const previousItem = previousId != null
        ? flattenItems(this._options.items).find(
            (i) => i.id === String(previousId),
          ) ?? null
        : null;

      this._selectedItemId = item.id;
      this._updateDisplayLabel();
      this._actionMenu?.updateItems(this._getProcessedItems());

      this._dispatchEvent('dd-btn:change', {
        item,
        index,
        previousItem,
      });
    } else {
      this._dispatchEvent('dd-btn:select', { item, index });
    }

    return this._options.onSelect?.(item, index);
  }

  private _updateDisplayLabel(): void {
    if (!this._labelEl) return;

    if (this._options.mode === 'action' || this._selectedItemId == null) {
      this._labelEl.textContent = this._originalLabel;
      return;
    }

    const flat = flattenItems(this._options.items);
    const selId = String(this._selectedItemId);
    const selectedItem = flat.find((item) => item.id === selId);

    if (!selectedItem) {
      this._labelEl.textContent = this._originalLabel;
      return;
    }

    if (this._options.displaySelected === 'value') {
      const val = (selectedItem as unknown as Record<string, unknown>).value;
      this._labelEl.textContent = val != null ? String(val) : selectedItem.id;
    } else {
      this._labelEl.textContent = selectedItem.label;
    }
  }

  private _applySelection(itemId: string | number): void {
    this._selectedItemId = itemId;
    this._updateDisplayLabel();
    this._actionMenu?.updateItems(this._getProcessedItems());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _dispatchEvent(
    name: string,
    detail: Record<string, unknown>,
  ): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail }),
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Open the menu / overlay.
   * - Internal mode: delegates to ArvoActionMenu.open().
   * - External mode with factory + open(): forwards to the overlay instance.
   * - Headless / factory without open(): synthesizes a click on the trigger.
   */
  open(): void {
    if (this._isExternalMode) {
      if (this._externalOverlay?.open) {
        this._externalOverlay.open();
      } else {
        this._element?.click();
      }
      return;
    }
    this._actionMenu?.open();
  }

  /**
   * Close the menu / overlay.
   * - Internal mode: delegates to ArvoActionMenu.close().
   * - External mode with factory + close(): forwards to the overlay instance.
   * - Headless without a close()-bearing instance: synthesizes a click
   *   on the trigger to toggle. Open click-trigger overlays close on a
   *   second click. Consumers using non-click overlays in pure headless
   *   mode should drive close via the controlled `isOpen` option.
   */
  close(): void {
    if (this._isExternalMode) {
      if (this._externalOverlay?.close) {
        this._externalOverlay.close();
      } else if (this._isOpen) {
        this._element?.click();
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
        this._element?.click();
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
   * Returns the trigger element so a consumer-composed external overlay
   * can anchor against it (pass into ArvoPopover.initialize, etc.).
   * Returns null after destroy().
   */
  triggerElement(): HTMLElement | null {
    return this._element;
  }

  /**
   * Manually flip the wrapper's open chrome state. Idempotent -- no-op on
   * transitions to the current state. Called automatically when the wrapper
   * observes `aria-expanded` changes on the trigger.
   */
  setOpenState(open: boolean): void {
    if (this._isOpen === open) return;
    this._isOpen = open;
    this._element?.classList.toggle('open', open);
    if (open) {
      this._dispatchEvent('dd-btn:open', {});
    } else {
      this._dispatchEvent('dd-btn:close', {});
    }
    this._options.onOpenChange?.(open);
  }

  value(itemId?: string | number | null): MenuItemData | null | void {
    if (itemId === undefined) {
      if (this._options.mode !== 'selection' || this._selectedItemId == null) {
        return null;
      }
      const flat = flattenItems(this._options.items);
      return flat.find((item) => item.id === String(this._selectedItemId)) ?? null;
    }

    if (this._options.mode !== 'selection') return;

    if (itemId == null) {
      this._selectedItemId = null;
      this._updateDisplayLabel();
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
        this._updateDisplayLabel();
      }
    }

    this._actionMenu?.updateItems(this._getProcessedItems());
  }

  setLabel(text: string): void {
    this._originalLabel = text;
    if (
      this._options.mode === 'action' ||
      this._selectedItemId == null
    ) {
      if (this._labelEl) this._labelEl.textContent = text;
    }
  }

  setIcon(iconName: string | null): void {
    if (!iconName) {
      this._iconEl?.remove();
      this._iconEl = null;
      this._options.icon = null;
      return;
    }

    if (this._iconEl) {
      const oldClass = this._options.icon ? `o9con-${this._options.icon}` : null;
      if (oldClass) this._iconEl.classList.remove(oldClass);
      this._iconEl.classList.add(`o9con-${iconName}`);
    } else if (this._element) {
      this._iconEl = document.createElement('span');
      this._iconEl.className = `arvo-dd-btn__icon o9con o9con-${iconName}`;
      this._iconEl.setAttribute('aria-hidden', 'true');
      this._element.insertBefore(this._iconEl, this._element.firstChild);
    }

    this._options.icon = iconName;
  }

  setVariant(variant: string): void {
    if (!(ArvoDropdownButtonV2.VARIANTS as readonly string[]).includes(variant))
      return;
    if (
      this._options.appearance === 'field' &&
      !(ArvoDropdownButtonV2.FIELD_VARIANTS as readonly string[]).includes(variant)
    ) {
      return;
    }

    const el = this._element;
    if (!el) return;

    ArvoDropdownButtonV2.VARIANTS.forEach((v) =>
      el.classList.remove(`arvo-btn--${v}`),
    );
    el.classList.add(`arvo-btn--${variant}`);
    this._options.variant = variant as RequiredOptions['variant'];
  }

  setAppearance(appearance: string): void {
    if (!(ArvoDropdownButtonV2.APPEARANCES as readonly string[]).includes(appearance)) {
      return;
    }

    const el = this._element;
    if (!el) return;

    ArvoDropdownButtonV2.APPEARANCES.forEach((value) =>
      el.classList.remove(`arvo-dd-btn--${value}`),
    );
    el.classList.add(`arvo-dd-btn--${appearance}`);
    this._options.appearance = appearance as RequiredOptions['appearance'];

    if (
      appearance === 'field' &&
      !(ArvoDropdownButtonV2.FIELD_VARIANTS as readonly string[]).includes(this._options.variant)
    ) {
      this.setVariant('secondary');
    }
  }

  setSize(size: string): void {
    if (!(ArvoDropdownButtonV2.SIZES as readonly string[]).includes(size)) return;

    const el = this._element;
    if (!el) return;

    ArvoDropdownButtonV2.SIZES.forEach((s) =>
      el.classList.remove(`arvo-btn--${s}`),
    );
    el.classList.add(`arvo-btn--${size}`);
    this._options.size = size as RequiredOptions['size'];
  }

  setLoading(isLoading: boolean): void {
    this._options.isLoading = isLoading;

    if (isLoading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
    }

    this._actionMenu?.disabled(isLoading || this._options.isDisabled);
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;

    if (this._element instanceof HTMLButtonElement) {
      this._element.disabled = state;
    } else if (this._element) {
      if (state) {
        this._element.setAttribute('aria-disabled', 'true');
      } else {
        this._element.removeAttribute('aria-disabled');
      }
    }

    this._actionMenu?.disabled(state || this._options.isLoading);
  }

  focus(): void {
    this._element?.focus();
  }

  destroy(): void {
    this._actionMenu?.destroy();
    this._actionMenu = null;

    this._externalOverlay?.destroy?.();
    this._externalOverlay = null;

    this._ariaExpandedObserver?.disconnect();
    this._ariaExpandedObserver = null;

    const el = this._element;
    if (el) {
      el.removeEventListener('click', this._boundHandleClick);
      el.removeEventListener('focus', this._boundHandleFocus);
      el.removeEventListener('blur', this._boundHandleBlur);
      el.removeEventListener('keydown', this._boundHandleKeydown);

      el.classList.remove(
        'arvo-dd-btn',
        'arvo-dd-btn--button',
        'arvo-dd-btn--field',
        'arvo-btn',
        'open',
        'loading',
      );
      ArvoDropdownButtonV2.VARIANTS.forEach((v) =>
        el.classList.remove(`arvo-btn--${v}`),
      );
      ArvoDropdownButtonV2.SIZES.forEach((s) =>
        el.classList.remove(`arvo-btn--${s}`),
      );

      el.removeAttribute('aria-haspopup');
      el.removeAttribute('aria-controls');
      el.removeAttribute('aria-expanded');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('aria-busy');

      if (el instanceof HTMLButtonElement) {
        el.disabled = false;
      }

      this._iconEl?.remove();
      this._labelEl?.remove();
      this._caretEl?.remove();
    }

    this._element = null;
    this._iconEl = null;
    this._labelEl = null;
    this._caretEl = null;
  }
}
