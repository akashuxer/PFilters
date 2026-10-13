import { ArvoActionMenu } from '../ActionMenu/ActionMenu';
import type {
  ArvoActionMenuOptions,
  MenuItemData,
} from '../ActionMenu/ActionMenu';

export type { MenuItemData } from '../ActionMenu/ActionMenu';
import {
  connectTooltip,
  tooltipManager,
  type ListGroup,
  type TooltipConnector,
} from '@arvo/core';
import type { IconButtonTooltipOption } from '../IconButton/IconButton';
import type { MenuSearchProp } from '../../types/menu-search';
import type {
  DropdownButtonOverlayFactory,
  ExternalOverlayInstance,
} from '../DropdownButton/DropdownButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Scoped escape-hatch bag for inner `ArvoActionMenu` options the parent
 * does not curate as a flat option. Mirrors the React
 * `SplitIconButtonMenuProps` type exactly -- drift checker enforces
 * parity.
 */
export type SplitIconButtonMenuProps = Pick<
  ArvoActionMenuOptions,
  'actionsVisibility' | 'submenuTrigger' | 'menuWidth' | 'submenuWidth'
>;

/** Re-export the DropdownButton overlay factory shape -- same contract. */
export type SplitIconButtonOverlayFactory = DropdownButtonOverlayFactory;

export interface ArvoSplitIconButtonOptions {
  icon?: string;
  /**
   * Required tooltip content for the action segment. Doubles as `aria-label`
   * because the action is icon-only. Accepts a plain string or a config
   * object (`{ content, placement?, shortcut? }`). Mirrors `ArvoIconButton`.
   */
  tooltip?: IconButtonTooltipOption;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
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
  menuProps?: SplitIconButtonMenuProps;
  /**
   * Optional external overlay factory invoked once at init with the
   * CARET segment element. When supplied, the internal ArvoActionMenu
   * is NOT created.
   */
  overlay?: SplitIconButtonOverlayFactory;
  /**
   * Controlled open state for external-overlay / headless mode.
   */
  isOpen?: boolean;
  /** Accessible label for the trigger (caret) segment. Default: "Show options". */
  triggerLabel?: string;
  onAction?: (event: Event) => void;
  onSelect?: (item: MenuItemData, index: number) => boolean | void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (isOpen: boolean) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoSplitIconButtonOptions,
    | 'onAction'
    | 'onSelect'
    | 'onOpen'
    | 'onClose'
    | 'onOpenChange'
    | 'onFocus'
    | 'onBlur'
    | 'maxHeight'
    | 'icon'
    | 'tooltip'
    | 'search'
    | 'menuProps'
    | 'overlay'
    | 'isOpen'
  >
> & {
  search: MenuSearchProp | undefined;
  icon: string;
  tooltip: IconButtonTooltipOption | null;
  maxHeight: string | null;
  menuProps: SplitIconButtonMenuProps | null;
  overlay: SplitIconButtonOverlayFactory | null;
  isOpen: boolean | null;
  onAction: ((event: Event) => void) | null;
  onSelect: ((item: MenuItemData, index: number) => boolean | void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onOpenChange: ((isOpen: boolean) => void) | null;
  onFocus: ((event: FocusEvent) => void) | null;
  onBlur: ((event: FocusEvent) => void) | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoSplitIconButton {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _actionEl: HTMLButtonElement | null = null;
  private _triggerEl: HTMLButtonElement | null = null;
  private _iconEl: HTMLSpanElement | null = null;
  private _caretEl: HTMLSpanElement | null = null;
  private _actionMenu: ArvoActionMenu | null = null;
  private _externalOverlay: ExternalOverlayInstance | null = null;
  private _actionTooltipConnector: TooltipConnector | null = null;
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
    icon: '',
    variant: 'primary',
    size: 'md',
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
    tooltip: null,
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
    options?: ArvoSplitIconButtonOptions,
  ): ArvoSplitIconButton {
    return new ArvoSplitIconButton(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoSplitIconButtonOptions) {
    this._element = element;

    const variant =
      options?.variant &&
      (ArvoSplitIconButton.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoSplitIconButton.DEFAULTS.variant;

    const size =
      options?.size &&
      (ArvoSplitIconButton.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoSplitIconButton.DEFAULTS.size;

    this._options = {
      ...ArvoSplitIconButton.DEFAULTS,
      ...options,
      variant,
      size,
      icon: options?.icon ?? ArvoSplitIconButton.DEFAULTS.icon,
      tooltip: options?.tooltip ?? null,
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

    // Dev-time warning: tooltip is required because the action segment has
    // no visible label.
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production' &&
      !this._options.tooltip
    ) {
      console.warn(
        'ArvoSplitIconButton: `tooltip` is required so the action segment has an accessible name (it is also rendered as the visual tooltip).',
      );
    }

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

    this._connectActionTooltip();

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

    el.classList.add('arvo-split-icon-btn');
    el.classList.add(`arvo-split-icon-btn--${this._options.variant}`);
    el.classList.add(`arvo-split-icon-btn--${this._options.size}`);
    el.setAttribute('role', 'group');

    // Action segment (square icon-only button)
    const actionEl = document.createElement('button');
    actionEl.type = 'button';
    actionEl.className =
      `arvo-icon-btn arvo-btn--${this._options.variant} ` +
      `arvo-btn--${this._options.size} arvo-split-icon-btn__action`;
    const tipText = this._tooltipText();
    if (tipText) {
      actionEl.setAttribute('aria-label', tipText);
    }
    this._actionEl = actionEl;

    const iconEl = document.createElement('span');
    iconEl.className = `arvo-split-icon-btn__icon o9con o9con-${this._options.icon}`;
    iconEl.setAttribute('aria-hidden', 'true');
    actionEl.appendChild(iconEl);
    this._iconEl = iconEl;

    // Trigger segment (caret-only narrow button)
    const triggerEl = document.createElement('button');
    triggerEl.type = 'button';
    triggerEl.className =
      `arvo-btn arvo-btn--${this._options.variant} ` +
      `arvo-btn--${this._options.size} arvo-split-icon-btn__trigger`;
    triggerEl.setAttribute('aria-label', this._options.triggerLabel);
    this._triggerEl = triggerEl;

    const caretEl = document.createElement('span');
    caretEl.className = 'arvo-split-icon-btn__caret o9con o9con-angle-down';
    caretEl.setAttribute('aria-hidden', 'true');
    triggerEl.appendChild(caretEl);
    this._caretEl = caretEl;

    el.appendChild(actionEl);
    el.appendChild(triggerEl);

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
    this._triggerEl?.addEventListener('click', this._boundHandleTriggerClick);
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

    this._dispatchEvent('split-icon-btn:action', {});
    this._options.onAction?.(event);
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
    // Normal clicks: the inner overlay (ArvoActionMenu in internal mode, or
    // the consumer's factory-built instance in external mode) binds its own
    // click handler via createOverlaySurface. The wrapper-level handler is
    // intentionally a no-op for normal clicks.
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
      items: this._options.items,
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
            'ArvoSplitIconButton: overlay factory threw while initializing.',
            err,
          );
        }
      }
    }

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

  private _handleSelect(item: MenuItemData, index: number): boolean | void {
    this._dispatchEvent('split-icon-btn:select', { item, index });
    return this._options.onSelect?.(item, index);
  }

  // ---------------------------------------------------------------------------
  // Tooltip wiring
  // ---------------------------------------------------------------------------

  private _connectActionTooltip(): void {
    if (!this._actionEl || !this._options.tooltip) return;
    const tip = this._options.tooltip;
    const config = typeof tip === 'string' ? { content: tip } : tip;
    this._actionTooltipConnector = connectTooltip(tooltipManager, {
      anchor: this._actionEl,
      content: config.content,
      placement: config.placement,
      shortcut: config.shortcut,
    });
  }

  private _tooltipText(): string {
    const tip = this._options.tooltip;
    if (!tip) return '';
    return typeof tip === 'string' ? tip : tip.content;
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
   * overlay can anchor against it. NOT the action segment. Returns null
   * after destroy().
   */
  triggerElement(): HTMLElement | null {
    return this._triggerEl;
  }

  setOpenState(open: boolean): void {
    if (this._isOpen === open) return;
    this._isOpen = open;
    this._element?.classList.toggle('open', open);
    if (open) {
      this._dispatchEvent('split-icon-btn:open', {});
    } else {
      this._dispatchEvent('split-icon-btn:close', {});
    }
    this._options.onOpenChange?.(open);
  }

  updateItems(items: MenuItemData[] | ListGroup<MenuItemData>[]): void {
    this._options.items = items;
    this._actionMenu?.updateItems(items);
  }

  setIcon(iconName: string): void {
    this._options.icon = iconName;
    if (!this._iconEl) return;

    const toRemove: string[] = [];
    this._iconEl.classList.forEach((c) => {
      if (c.startsWith('o9con-')) toRemove.push(c);
    });
    toRemove.forEach((c) => this._iconEl?.classList.remove(c));
    this._iconEl.classList.add(`o9con-${iconName}`);
  }

  setVariant(variant: string): void {
    if (!(ArvoSplitIconButton.VARIANTS as readonly string[]).includes(variant))
      return;

    const oldVariant = this._options.variant;

    this._element?.classList.remove(`arvo-split-icon-btn--${oldVariant}`);
    this._element?.classList.add(`arvo-split-icon-btn--${variant}`);

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
    if (!(ArvoSplitIconButton.SIZES as readonly string[]).includes(size)) return;

    const oldSize = this._options.size;

    this._element?.classList.remove(`arvo-split-icon-btn--${oldSize}`);
    this._element?.classList.add(`arvo-split-icon-btn--${size}`);

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

  setTooltip(tooltip: IconButtonTooltipOption | null): void {
    this._options.tooltip = tooltip;
    this._actionTooltipConnector?.destroy();
    this._actionTooltipConnector = null;
    if (this._actionEl) {
      const tipText = this._tooltipText();
      if (tipText) {
        this._actionEl.setAttribute('aria-label', tipText);
      } else {
        this._actionEl.removeAttribute('aria-label');
      }
    }
    if (tooltip) this._connectActionTooltip();
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

    this._actionTooltipConnector?.destroy();
    this._actionTooltipConnector = null;

    const el = this._element;
    if (el) {
      el.removeEventListener('keydown', this._boundHandleWrapperKeydown);
      el.removeEventListener('focusin', this._boundHandleWrapperFocusin);
      el.classList.remove('arvo-split-icon-btn', 'open', 'loading');
      ArvoSplitIconButton.VARIANTS.forEach((v) =>
        el.classList.remove(`arvo-split-icon-btn--${v}`),
      );
      ArvoSplitIconButton.SIZES.forEach((s) =>
        el.classList.remove(`arvo-split-icon-btn--${s}`),
      );

      el.removeAttribute('role');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('aria-busy');

      this._iconEl?.remove();
      this._caretEl?.remove();
      this._actionEl?.remove();
      this._triggerEl?.remove();
    }

    this._element = null;
    this._actionEl = null;
    this._triggerEl = null;
    this._iconEl = null;
    this._caretEl = null;
  }
}
