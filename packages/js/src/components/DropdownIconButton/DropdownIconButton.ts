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
 * Scoped escape-hatch bag for inner `ArvoActionMenu` options that the
 * parent does not curate as a flat option. Mirrors the React
 * `DropdownIconButtonMenuProps` type exactly -- the drift checker
 * enforces key-set parity.
 */
export type DropdownIconButtonMenuProps = Pick<
  ArvoActionMenuOptions,
  'actionsVisibility' | 'submenuTrigger' | 'menuWidth' | 'submenuWidth'
>;

export interface ArvoDropdownIconButtonOptions {
  icon?: string;
  /**
   * Tooltip content. Accepts a plain string (used as `aria-label` and tooltip
   * content) or a config object (`{ content, placement?, shortcut? }`).
   * Mirrors `ArvoIconButton`.
   */
  tooltip?: IconButtonTooltipOption;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isCompact?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  /**
   * Menu items passed through to the internal ArvoActionMenu. Required
   * for the default internal-menu composition; OPTIONAL (and ignored)
   * when an external `overlay` factory is supplied or in pure headless
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
  menuProps?: DropdownIconButtonMenuProps;
  /**
   * Optional external overlay factory. When supplied, the internal
   * ArvoActionMenu is NOT created/initialized; the factory is invoked
   * once at init with the trigger element. See ArvoDropdownButton's
   * `overlay` option for the full contract.
   */
  overlay?: DropdownButtonOverlayFactory;
  /**
   * Controlled open state for external-overlay / headless mode. When
   * boolean, mirrors the prop for chrome state and disables the
   * MutationObserver auto-sync path.
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
    ArvoDropdownIconButtonOptions,
    | 'onSelect'
    | 'onOpen'
    | 'onClose'
    | 'onOpenChange'
    | 'onClick'
    | 'onFocus'
    | 'onBlur'
    | 'maxHeight'
    | 'tooltip'
    | 'search'
    | 'menuProps'
    | 'overlay'
    | 'isOpen'
  >
> & {
  search: MenuSearchProp | undefined;
  tooltip: IconButtonTooltipOption | null;
  maxHeight: string | null;
  menuProps: DropdownIconButtonMenuProps | null;
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
// Component
// ---------------------------------------------------------------------------

export class ArvoDropdownIconButton {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _actionMenu: ArvoActionMenu | null = null;
  private _externalOverlay: ExternalOverlayInstance | null = null;
  private _iconEl: HTMLSpanElement | null = null;
  private _caretEl: HTMLSpanElement | null = null;
  private _tooltipConnector: TooltipConnector | null = null;
  private _isOpen = false;
  private _isExternalMode: boolean;
  private _ariaExpandedObserver: MutationObserver | null = null;

  private _boundHandleClick: (event: Event) => void;
  private _boundHandleFocus: (event: FocusEvent) => void;
  private _boundHandleBlur: (event: FocusEvent) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'tertiary', 'outline'] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    icon: 'ellipsis-v',
    tooltip: null,
    variant: 'primary',
    size: 'md',
    isCompact: false,
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
    options?: ArvoDropdownIconButtonOptions,
  ): ArvoDropdownIconButton {
    return new ArvoDropdownIconButton(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoDropdownIconButtonOptions) {
    this._element = element;

    const variant =
      options?.variant &&
      (ArvoDropdownIconButton.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoDropdownIconButton.DEFAULTS.variant;

    const size =
      options?.size &&
      (ArvoDropdownIconButton.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoDropdownIconButton.DEFAULTS.size;

    this._options = {
      ...ArvoDropdownIconButton.DEFAULTS,
      ...options,
      variant,
      size,
      icon: options?.icon ?? ArvoDropdownIconButton.DEFAULTS.icon,
      tooltip: options?.tooltip ?? null,
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


    const hasItems =
      Array.isArray(options?.items) && (options!.items as unknown[]).length > 0;
    const hasMenuProps = options?.menuProps != null;
    this._isExternalMode =
      this._options.overlay != null || (!hasItems && !hasMenuProps);

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

    this._connectTooltip();

    if (this._isExternalMode && this._options.isOpen === true) {
      this.setOpenState(true);
    }
  }

  private _connectTooltip(): void {
    if (!this._element || !this._options.tooltip) return;
    const tip = this._options.tooltip;
    const config = typeof tip === 'string' ? { content: tip } : tip;
    this._tooltipConnector = connectTooltip(tooltipManager, {
      anchor: this._element,
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
  // Render
  // ---------------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    el.classList.add('arvo-dd-icon-btn', 'arvo-btn');
    el.classList.add(`arvo-btn--${this._options.variant}`);
    el.classList.add(`arvo-btn--${this._options.size}`);

    if (this._options.isCompact) {
      el.classList.add('arvo-dd-icon-btn--compact');
    }

    if (el instanceof HTMLButtonElement) {
      el.setAttribute('type', 'button');
    }

    this._iconEl = document.createElement('span');
    this._iconEl.className = `arvo-dd-icon-btn__icon o9con o9con-${this._options.icon}`;
    this._iconEl.setAttribute('aria-hidden', 'true');
    el.appendChild(this._iconEl);

    if (!this._options.isCompact) {
      this._caretEl = document.createElement('span');
      this._caretEl.className = 'arvo-dd-icon-btn__caret o9con o9con-angle-down';
      this._caretEl.setAttribute('aria-hidden', 'true');
      el.appendChild(this._caretEl);
    }

    const tipText = this._tooltipText();
    if (tipText) {
      el.setAttribute('aria-label', tipText);
    }

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

    // Hybrid prop surface: spread menuProps first; flat / computed wins.
    const menuOptions: ArvoActionMenuOptions = {
      ...(this._options.menuProps ?? undefined),
      items: this._options.items,
      search: this._options.search,
      placement: this._options.placement,
      maxHeight: this._options.maxHeight ?? undefined,
      hasGroupDividers: this._options.hasGroupDividers,
      closeOnSelect: this._options.closeOnSelect,
      isDisabled: this._options.isDisabled || this._options.isLoading,
      onOpen: this._options.onOpen ?? undefined,
      onClose: this._options.onClose ?? undefined,
      onSelect: (item, index) => this._handleMenuSelect(item, index),
      onOpenChange: (isOpen) => this.setOpenState(isOpen),
    };

    this._actionMenu = ArvoActionMenu.initialize(this._element, menuOptions);
  }

  // ---------------------------------------------------------------------------
  // External overlay init (overlay-slot / headless)
  // ---------------------------------------------------------------------------

  private _initExternalOverlay(): void {
    if (!this._element) return;

    if (this._options.overlay) {
      try {
        this._externalOverlay = this._options.overlay(this._element);
      } catch (err) {
        if (
          typeof process !== 'undefined' &&
          process.env?.NODE_ENV !== 'production'
        ) {
          console.error(
            'ArvoDropdownIconButton: overlay factory threw while initializing.',
            err,
          );
        }
      }
    }

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
  // Menu Handlers
  // ---------------------------------------------------------------------------

  private _handleMenuSelect(
    item: MenuItemData,
    index: number,
  ): boolean | void {
    this._dispatchEvent('dd-icon-btn:select', { item, index });
    return this._options.onSelect?.(item, index);
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

  triggerElement(): HTMLElement | null {
    return this._element;
  }

  setOpenState(open: boolean): void {
    if (this._isOpen === open) return;
    this._isOpen = open;
    this._element?.classList.toggle('open', open);
    if (open) {
      this._dispatchEvent('dd-icon-btn:open', {});
    } else {
      this._dispatchEvent('dd-icon-btn:close', {});
    }
    this._options.onOpenChange?.(open);
  }

  updateItems(items: MenuItemData[] | ListGroup<MenuItemData>[]): void {
    this._options.items = items;
    this._actionMenu?.updateItems(items);
  }

  setIcon(iconName: string): void {
    if (!this._iconEl) return;

    const oldClass = `o9con-${this._options.icon}`;
    this._iconEl.classList.remove(oldClass);
    this._iconEl.classList.add(`o9con-${iconName}`);
    this._options.icon = iconName;
  }

  setTooltip(tooltip: IconButtonTooltipOption | null): void {
    this._options.tooltip = tooltip;

    const tipText = this._tooltipText();
    if (tipText) {
      this._element?.setAttribute('aria-label', tipText);
    } else {
      this._element?.removeAttribute('aria-label');
    }

    if (!tooltip) {
      this._tooltipConnector?.update({ content: '' });
    } else if (typeof tooltip === 'string') {
      this._tooltipConnector?.update({ content: tooltip });
    } else {
      this._tooltipConnector?.update({
        content: tooltip.content,
        placement: tooltip.placement,
        shortcut: tooltip.shortcut,
      });
    }
  }

  compact(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isCompact;
    }

    if (state === this._options.isCompact) return;
    this._options.isCompact = state;

    if (state) {
      this._element?.classList.add('arvo-dd-icon-btn--compact');
      this._caretEl?.remove();
      this._caretEl = null;
    } else {
      this._element?.classList.remove('arvo-dd-icon-btn--compact');
      if (!this._caretEl && this._element) {
        this._caretEl = document.createElement('span');
        this._caretEl.className = 'arvo-dd-icon-btn__caret o9con o9con-angle-down';
        this._caretEl.setAttribute('aria-hidden', 'true');
        this._element.appendChild(this._caretEl);
      }
    }
  }

  setVariant(variant: string): void {
    if (!(ArvoDropdownIconButton.VARIANTS as readonly string[]).includes(variant))
      return;

    const el = this._element;
    if (!el) return;

    ArvoDropdownIconButton.VARIANTS.forEach((v) =>
      el.classList.remove(`arvo-btn--${v}`),
    );
    el.classList.add(`arvo-btn--${variant}`);
    this._options.variant = variant as RequiredOptions['variant'];
  }

  setSize(size: string): void {
    if (!(ArvoDropdownIconButton.SIZES as readonly string[]).includes(size))
      return;

    const el = this._element;
    if (!el) return;

    ArvoDropdownIconButton.SIZES.forEach((s) =>
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
        'arvo-dd-icon-btn',
        'arvo-dd-icon-btn--compact',
        'arvo-btn',
        'open',
        'loading',
      );
      ArvoDropdownIconButton.VARIANTS.forEach((v) =>
        el.classList.remove(`arvo-btn--${v}`),
      );
      ArvoDropdownIconButton.SIZES.forEach((s) =>
        el.classList.remove(`arvo-btn--${s}`),
      );

      el.removeAttribute('aria-haspopup');
      el.removeAttribute('aria-controls');
      el.removeAttribute('aria-expanded');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('aria-busy');
      el.removeAttribute('aria-label');

      if (el instanceof HTMLButtonElement) {
        el.disabled = false;
      }

      this._iconEl?.remove();
      this._caretEl?.remove();
    }

    this._tooltipConnector?.destroy();
    this._tooltipConnector = null;

    this._element = null;
    this._iconEl = null;
    this._caretEl = null;
  }
}
