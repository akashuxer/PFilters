import {
  connectTooltip,
  tooltipManager,
  type TooltipPlacement,
  type TooltipConnector,
} from '@arvo/core';
import {
  ArvoBadge,
  type ArvoBadgeConfig,
  type ArvoBadgeOptions,
  type ArvoBadgeSemanticType,
} from '../Badge/Badge';
import {
  ArvoStatus,
  type ArvoStatusConfig,
  type ArvoStatusOptions,
  type ArvoStatusType,
} from '../Status/Status';

export type IconButtonTooltipOption = string | {
  content: string;
  placement?: TooltipPlacement;
  shortcut?: string;
};

// ---------------------------------------------------------------------------
// Public variant union
// ---------------------------------------------------------------------------

/**
 * Visual style variant for `ArvoIconButton`. Mirrors the React twin's
 * `ArvoIconButtonVariant` exactly. `danger` is a back-compat alias for
 * `danger-primary`. `inline` is intentionally excluded -- it is a
 * Button-only variant.
 */
export type ArvoIconButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'danger-primary'
  | 'danger'
  | 'danger-tertiary'
  | 'danger-outline'
  | 'nova-primary';

export type ArvoIconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

// ---------------------------------------------------------------------------
// Slot config types (narrowed Pick<> of the canonical configs)
// ---------------------------------------------------------------------------

export type ArvoIconButtonBadgePlacement = 'top-right';
export type ArvoIconButtonStatusPlacement = 'top-right' | 'bottom-right';

/**
 * Narrowed badge slot config for ArvoIconButton. Mirrors React's
 * `ArvoIconButtonBadgeConfig` shape. Surface restrictions vs
 * canonical:
 *   - `size` is fixed to `'sm'`.
 *   - `appearance` is fixed to `'filled'`.
 *   - `colorMode` is fixed to `'semantic'`.
 *   - `variant` is fixed to `'counter'` and `counterMode` to `'single'`.
 *   - `customColor`, `hasBadgeIcon`, `icon`, `tooltip`, `message`,
 *     `total` are excluded.
 *   - `placement` accepts overlay corners only.
 */
export type ArvoIconButtonBadgeConfig = Omit<
  Pick<
    ArvoBadgeConfig,
    | 'placement'
    | 'count'
    | 'overflowCount'
    | 'hideWhenZero'
    | 'autoFormat'
    | 'localeAware'
    | 'semanticType'
    | 'className'
  >,
  'placement'
> & {
  placement?: ArvoIconButtonBadgePlacement;
};

/**
 * Narrowed status slot config for ArvoIconButton. Mirrors React's
 * `ArvoIconButtonStatusConfig` shape.
 *   - `size` is derived from icon button size -- not exposed
 *     (`xs` -> `sm`; `sm`/`md`/`lg` map 1:1).
 *   - `tooltip` is excluded.
 *   - `placement` accepts the overlay corners only.
 */
export type ArvoIconButtonStatusConfig = Omit<
  Pick<ArvoStatusConfig, 'type' | 'placement' | 'icon' | 'className'>,
  'placement'
> & {
  placement?: ArvoIconButtonStatusPlacement;
};

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Apply the IconButton matrix's fixed-value contract to a
 * consumer-supplied `ArvoIconButtonBadgeConfig`. Output is a
 * fully-resolved `ArvoBadgeOptions` ready for `ArvoBadge.initialize`.
 * Mirrors React's `resolveIconButtonBadge`.
 */
export function resolveIconButtonBadge(
  cfg: ArvoIconButtonBadgeConfig,
): ArvoBadgeOptions {
  const placement: ArvoIconButtonBadgePlacement = cfg.placement ?? 'top-right';
  const semanticType: ArvoBadgeSemanticType = cfg.semanticType ?? 'neutral';
  return {
    ...cfg,
    placement,
    semanticType,
    size: 'sm',
    appearance: 'filled',
    colorMode: 'semantic',
    variant: 'counter',
    counterMode: 'single',
    hasBadgeIcon: false,
  };
}

/**
 * Map the IconButton's 4-size scale onto the ArvoStatus 3-size scale.
 * `xs` collapses to `'sm'`; `sm`/`md`/`lg` map 1:1.
 */
function iconButtonStatusSize(
  buttonSize: ArvoIconButtonSize,
): 'sm' | 'md' | 'lg' {
  if (buttonSize === 'xs') return 'sm';
  return buttonSize;
}

/**
 * Apply the IconButton matrix's fixed-value contract to a
 * consumer-supplied `ArvoIconButtonStatusConfig`. Output is a
 * fully-resolved `ArvoStatusOptions` ready for `ArvoStatus.initialize`.
 * The status size is derived from the host icon button size.
 */
export function resolveIconButtonStatus(
  cfg: ArvoIconButtonStatusConfig,
  buttonSize: ArvoIconButtonSize,
): ArvoStatusOptions {
  return {
    ...cfg,
    size: iconButtonStatusSize(buttonSize),
    placement: cfg.placement ?? 'top-right',
  };
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface ArvoIconButtonOptions {
  variant?: ArvoIconButtonVariant;
  size?: ArvoIconButtonSize;
  type?: 'button' | 'submit' | 'reset';
  icon?: string;
  /** Tooltip content. Doubles as the button's `aria-label` because it is icon-only. */
  tooltip?: IconButtonTooltipOption;
  isDisabled?: boolean;
  /**
   * Parent-controlled active/selected visual. Renders `aria-pressed` and the
   * `.active` class. Use for non-toggle "active trigger" visuals (e.g. an
   * overlay-trigger icon button showing it has opened a menu / popover).
   * Click does NOT toggle this value -- the parent owns it.
   *
   * For a user-driven toggle, use `ArvoToggleButton` with `label` omitted.
   */
  isSelected?: boolean;
  isLoading?: boolean;
  onClick?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  /**
   * Embedded ArvoBadge slot. Overlay-only on IconButton: `placement`
   * is restricted to `'top-right' | 'bottom-right'`. Pass `null` /
   * omit to render no badge.
   */
  badge?: ArvoIconButtonBadgeConfig | null;
  /**
   * Embedded ArvoStatus slot. Overlay-only on IconButton: `placement`
   * is restricted to `'top-right' | 'bottom-right'`. Status `size` is
   * derived from the icon button's `size` option.
   */
  status?: ArvoIconButtonStatusConfig | null;
}

type RequiredIconButtonOptions = Required<
  Omit<
    ArvoIconButtonOptions,
    | 'onClick'
    | 'onKeyDown'
    | 'isSelected'
    | 'badge'
    | 'status'
  >
> & {
  onClick: ((event: Event) => void) | null;
  onKeyDown: ((event: KeyboardEvent) => void) | null;
  isSelected: boolean | undefined;
  badge: ArvoIconButtonBadgeConfig | null;
  status: ArvoIconButtonStatusConfig | null;
};

export class ArvoIconButton {
  private _element: HTMLButtonElement | null;
  private _options: RequiredIconButtonOptions;
  private _iconEl: HTMLSpanElement | null = null;
  private _badgeEl: HTMLSpanElement | null = null;
  private _badgeInstance: ArvoBadge | null = null;
  private _statusEl: HTMLSpanElement | null = null;
  private _statusInstance: ArvoStatus | null = null;
  private _boundHandleClick: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _tooltipConnector: TooltipConnector | null = null;

  static readonly VARIANTS = [
    'primary',
    'secondary',
    'tertiary',
    'outline',
    'danger-primary',
    'danger',
    'danger-tertiary',
    'danger-outline',
    'nova-primary',
  ] as const;
  static readonly SIZES = ['xs', 'sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredIconButtonOptions = {
    variant: 'primary',
    size: 'md',
    type: 'button',
    icon: '',
    tooltip: '',
    isDisabled: false,
    isSelected: undefined,
    isLoading: false,
    onClick: null,
    onKeyDown: null,
    badge: null,
    status: null,
  };

  static initialize(element: HTMLButtonElement, options?: ArvoIconButtonOptions): ArvoIconButton {
    return new ArvoIconButton(element, options);
  }

  constructor(element: HTMLButtonElement, options?: ArvoIconButtonOptions) {
    this._element = element;

    const variant = options?.variant && (ArvoIconButton.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoIconButton.DEFAULTS.variant;

    const size = options?.size && (ArvoIconButton.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoIconButton.DEFAULTS.size;

    this._options = {
      ...ArvoIconButton.DEFAULTS,
      ...options,
      variant,
      size,
      icon: options?.icon ?? ArvoIconButton.DEFAULTS.icon,
      tooltip: options?.tooltip ?? ArvoIconButton.DEFAULTS.tooltip,
      onClick: options?.onClick ?? null,
      onKeyDown: options?.onKeyDown ?? null,
      badge: options?.badge ?? null,
      status: options?.status ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);

    this._render();
    this._bindEvents();
    this._connectTooltip();
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

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    el.classList.add('arvo-icon-btn');
    el.classList.add(`arvo-btn--${this._options.variant}`);
    el.classList.add(`arvo-btn--${this._options.size}`);
    el.setAttribute('type', this._options.type);

    if (this._options.icon) {
      this._iconEl = this._createIconEl(this._options.icon);
      el.appendChild(this._iconEl);
    }

    if (this._options.badge) {
      this._renderBadge(this._options.badge);
    }
    if (this._options.status) {
      this._renderStatus(this._options.status);
    }

    if (this._options.tooltip) {
      const tip = this._options.tooltip;
      el.setAttribute('aria-label', typeof tip === 'string' ? tip : tip.content);
    }

    if (this._options.isDisabled) {
      el.disabled = true;
    }

    // aria-pressed is rendered only when the consumer explicitly passes
    // `isSelected` (controlled active-trigger visual). For a user-driven
    // toggle, use ArvoToggleButton (with `label` omitted for icon-only).
    if (this._options.isSelected !== undefined) {
      const isOn = this._options.isSelected === true;
      el.setAttribute('aria-pressed', String(isOn));
      if (isOn) el.classList.add('active');
    }

    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    }
  }

  private _createIconEl(iconName: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = `arvo-btn__ico o9con o9con-${iconName}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  private _renderBadge(cfg: ArvoIconButtonBadgeConfig): void {
    if (!this._element) return;
    const resolved = resolveIconButtonBadge(cfg);
    this._badgeEl = document.createElement('span');
    this._element.appendChild(this._badgeEl);
    this._badgeInstance = ArvoBadge.initialize(this._badgeEl, resolved);
  }

  private _removeBadge(): void {
    this._badgeInstance?.destroy();
    this._badgeInstance = null;
    this._badgeEl?.remove();
    this._badgeEl = null;
  }

  private _renderStatus(cfg: ArvoIconButtonStatusConfig): void {
    if (!this._element) return;
    const resolved = resolveIconButtonStatus(cfg, this._options.size);
    this._statusEl = document.createElement('span');
    this._element.appendChild(this._statusEl);
    this._statusInstance = ArvoStatus.initialize(this._statusEl, resolved);
  }

  private _removeStatus(): void {
    this._statusInstance?.destroy();
    this._statusInstance = null;
    this._statusEl?.remove();
    this._statusEl = null;
  }

  private _bindEvents(): void {
    this._element?.addEventListener('click', this._boundHandleClick);
    this._element?.addEventListener('keydown', this._boundHandleKeydown);
  }

  private _handleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (this._options.onClick) {
      this._options.onClick(event);
    }
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if ((event.key === 'Enter' || event.key === ' ') &&
        (this._options.isDisabled || this._options.isLoading)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (this._options.onKeyDown) {
      this._options.onKeyDown(event);
    }
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail,
    }));
  }

  setIcon(iconName: string): void {
    if (!iconName) return;

    if (this._iconEl) {
      const oldClass = this._options.icon ? `o9con-${this._options.icon}` : null;
      if (oldClass) {
        this._iconEl.classList.remove(oldClass);
      }
      this._iconEl.classList.add(`o9con-${iconName}`);
    } else if (this._element) {
      this._iconEl = this._createIconEl(iconName);
      this._element.insertBefore(this._iconEl, this._element.firstChild);
    }

    this._options.icon = iconName;
  }

  setTooltip(tooltip: string): void {
    this._options.tooltip = tooltip;
    this._element?.setAttribute('aria-label', tooltip);
    this._tooltipConnector?.update({ content: tooltip });
  }

  setVariant(variant: string): void {
    if (!(ArvoIconButton.VARIANTS as readonly string[]).includes(variant)) return;

    const el = this._element;
    if (!el) return;

    ArvoIconButton.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    el.classList.add(`arvo-btn--${variant}`);
    this._options.variant = variant as RequiredIconButtonOptions['variant'];
  }

  setSize(size: string): void {
    if (!(ArvoIconButton.SIZES as readonly string[]).includes(size)) return;

    const el = this._element;
    if (!el) return;

    ArvoIconButton.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));
    el.classList.add(`arvo-btn--${size}`);
    this._options.size = size as RequiredIconButtonOptions['size'];

    // The status slot derives its size from the icon button -- re-resolve and
    // re-apply when the icon button size changes. Mirrors ArvoButton.setSize.
    if (this._statusInstance && this._options.status) {
      this._statusInstance.setSize(iconButtonStatusSize(this._options.size));
    }
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

    this._dispatchEvent('btn:loading', { isLoading });
  }

  selected(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isSelected === true;
    }

    this._options.isSelected = state;

    if (state) {
      this._element?.classList.add('active');
    } else {
      this._element?.classList.remove('active');
    }

    this._element?.setAttribute('aria-pressed', String(state));
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;
    if (this._element) {
      this._element.disabled = state;
    }
    // Mirror sibling ArvoButton.disabled() so consumers can subscribe to
    // the same `btn:disabled` event regardless of which button variant they
    // have.
    this._dispatchEvent('btn:disabled', { isDisabled: state });
  }

  /**
   * Add, update, or remove the embedded ArvoBadge slot. Pass `null` to
   * tear the badge down; pass a config object to render or re-render.
   * Mirrors `ArvoButton.setBadge`.
   */
  setBadge(config: ArvoIconButtonBadgeConfig | null): void {
    this._options.badge = config;
    if (!config) {
      this._removeBadge();
      return;
    }
    // Simple strategy: tear down + re-render. The resolver result is
    // entirely derived from the consumer config + host context, so a
    // fresh ArvoBadge instance is the cheapest safe update path.
    this._removeBadge();
    this._renderBadge(config);
  }

  /**
   * Add, update, or remove the embedded ArvoStatus slot. Pass `null` to
   * tear the status down; pass a config object to render or re-render.
   * Mirrors `ArvoButton.setStatus`.
   */
  setStatus(config: ArvoIconButtonStatusConfig | null): void {
    this._options.status = config;
    if (!config) {
      this._removeStatus();
      return;
    }
    this._removeStatus();
    this._renderStatus(config);
  }

  focus(): void {
    if (this._element && !this._options.isLoading) {
      this._element.focus();
    }
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    el.removeEventListener('click', this._boundHandleClick);
    el.removeEventListener('keydown', this._boundHandleKeydown);

    el.classList.remove('arvo-icon-btn', 'active', 'loading', 'open', 'focus-border');
    ArvoIconButton.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    ArvoIconButton.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));

    el.removeAttribute('aria-label');
    el.removeAttribute('aria-pressed');
    el.removeAttribute('aria-expanded');
    el.removeAttribute('aria-haspopup');
    el.removeAttribute('aria-busy');

    el.disabled = false;

    this._iconEl?.remove();
    this._removeBadge();
    this._removeStatus();

    this._tooltipConnector?.destroy();
    this._tooltipConnector = null;

    this._element = null;
    this._iconEl = null;
  }
}

// Re-export the canonical config types so consumers can import from the
// IconButton entry point.
export type {
  ArvoBadgeConfig,
  ArvoStatusConfig,
  ArvoStatusType,
};
