import { formatBadgeCount } from '@arvo/core';
import { ArvoStatus, type ArvoStatusType } from '../Status/Status';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoBadgeVariant = 'label' | 'counter';
export type ArvoBadgeSize = 'sm' | 'md' | 'lg';
export type ArvoBadgeAppearance = 'primary' | 'outline' | 'filled';
export type ArvoBadgeColorMode = 'semantic' | 'custom';
export type ArvoBadgeSemanticType = 'positive' | 'info' | 'neutral' | 'warning' | 'negative' | 'block' | 'none';
export type ArvoBadgeCustomColor = 'purple' | 'pink' | 'glacier' | 'amber' | 'greenish' | 'bluish';
export type ArvoBadgeCounterMode = 'single' | 'ratio';

/**
 * Single-axis layout selector. `'inline'` (default) renders the badge as
 * a normal-flow inline-flex element. `'top-right'` absolutely positions
 * the badge at the top-right corner of a `corner-host` parent so it
 * half-overhangs the host edge. (Bottom-right is intentionally
 * unsupported -- Status remains the bottom-anchored overlay primitive.)
 */
export type ArvoBadgePlacement = 'inline' | 'top-right';

/**
 * Canonical slot config for embedding ArvoBadge inside other Arvo
 * components. Consuming components Pick<> this surface to declare which
 * keys they expose. Intentionally omits the nested-status props
 * (`hasStatus` / `statusType` / `statusPosition`) and `role` -- hosts
 * own their own Status slot and accessible-name surface.
 */
export interface ArvoBadgeConfig {
  placement?: ArvoBadgePlacement;
  variant?: ArvoBadgeVariant;
  size?: ArvoBadgeSize;
  appearance?: ArvoBadgeAppearance;
  colorMode?: ArvoBadgeColorMode;
  semanticType?: ArvoBadgeSemanticType;
  customColor?: ArvoBadgeCustomColor;
  message?: string;
  counterMode?: ArvoBadgeCounterMode;
  count?: number;
  total?: number | null;
  overflowCount?: number;
  hideWhenZero?: boolean;
  autoFormat?: boolean;
  localeAware?: boolean;
  hasBadgeIcon?: boolean;
  icon?: string | null;
  tooltip?: string | null;
  className?: string;
}

export interface ArvoBadgeOptions {
  variant?: ArvoBadgeVariant;
  size?: ArvoBadgeSize;
  appearance?: ArvoBadgeAppearance;
  colorMode?: ArvoBadgeColorMode;
  semanticType?: ArvoBadgeSemanticType;
  customColor?: ArvoBadgeCustomColor;
  message?: string;
  counterMode?: ArvoBadgeCounterMode;
  count?: number;
  total?: number | null;
  overflowCount?: number;
  hideWhenZero?: boolean;
  autoFormat?: boolean;
  localeAware?: boolean;
  hasBadgeIcon?: boolean;
  icon?: string | null;
  placement?: ArvoBadgePlacement;
  hasStatus?: boolean;
  statusType?: ArvoStatusType;
  statusPosition?: 'top-right';
  tooltip?: string | null;
  role?: 'status' | 'alert';
}

export const ARVO_BADGE_PLACEMENTS: readonly ArvoBadgePlacement[] = [
  'inline',
  'top-right',
];

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  variant: ArvoBadgeVariant;
  size: ArvoBadgeSize;
  appearance: ArvoBadgeAppearance;
  colorMode: ArvoBadgeColorMode;
  semanticType: ArvoBadgeSemanticType;
  customColor: ArvoBadgeCustomColor;
  message: string;
  counterMode: ArvoBadgeCounterMode;
  count: number;
  total: number | null;
  overflowCount: number;
  hideWhenZero: boolean;
  autoFormat: boolean;
  localeAware: boolean;
  hasBadgeIcon: boolean;
  icon: string | null;
  placement: ArvoBadgePlacement;
  hasStatus: boolean;
  statusType: ArvoStatusType;
  statusPosition: 'top-right';
  tooltip: string | null;
  role: 'status' | 'alert';
}

// ---------------------------------------------------------------------------
// Icon registry (mirrors React twin)
// ---------------------------------------------------------------------------

const SEMANTIC_ICON_MAP: Record<ArvoBadgeSemanticType, string | null> = {
  positive: 'check-circle',
  info: 'info-circle-filled',
  neutral: 'speaker',
  warning: 'exclamation-triangle-filled',
  negative: 'exclamation-circle-filled',
  block: 'blocker-action-filled',
  none: null,
};

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const VALID_VARIANTS: readonly ArvoBadgeVariant[] = ['label', 'counter'];
const VALID_SIZES: readonly ArvoBadgeSize[] = ['sm', 'md', 'lg'];
const VALID_APPEARANCES: readonly ArvoBadgeAppearance[] = ['primary', 'outline', 'filled'];
const VALID_COLOR_MODES: readonly ArvoBadgeColorMode[] = ['semantic', 'custom'];
const VALID_SEMANTIC_TYPES: readonly ArvoBadgeSemanticType[] = ['positive', 'info', 'neutral', 'warning', 'negative', 'block', 'none'];
const VALID_CUSTOM_COLORS: readonly ArvoBadgeCustomColor[] = ['purple', 'pink', 'glacier', 'amber', 'greenish', 'bluish'];
const VALID_COUNTER_MODES: readonly ArvoBadgeCounterMode[] = ['single', 'ratio'];

const DEFAULTS: ResolvedOptions = {
  variant: 'label',
  size: 'md',
  appearance: 'primary',
  colorMode: 'semantic',
  semanticType: 'neutral',
  customColor: 'purple',
  message: 'Status Message',
  counterMode: 'single',
  count: 0,
  total: null,
  overflowCount: 99,
  hideWhenZero: true,
  autoFormat: false,
  localeAware: false,
  hasBadgeIcon: true,
  icon: null,
  placement: 'inline',
  hasStatus: false,
  statusType: 'available',
  statusPosition: 'top-right',
  tooltip: null,
  role: 'status',
};

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoBadge {
  readonly el: HTMLElement;

  private _opts: ResolvedOptions;
  private _icoEl: HTMLElement | null = null;
  private _msgEl: HTMLElement | null = null;
  private _countEl: HTMLElement | null = null;
  private _sepEl: HTMLElement | null = null;
  private _totalEl: HTMLElement | null = null;
  private _statusSpan: HTMLSpanElement | null = null;
  private _statusInstance: ArvoStatus | null = null;
  private _animEndHandler: (() => void) | null = null;
  private _destroyed = false;

  static initialize(element: HTMLElement, options?: ArvoBadgeOptions): ArvoBadge {
    return new ArvoBadge(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoBadgeOptions) {
    this.el = element;
    this._opts = {
      variant: options?.variant && VALID_VARIANTS.includes(options.variant) ? options.variant : DEFAULTS.variant,
      size: options?.size && VALID_SIZES.includes(options.size) ? options.size : DEFAULTS.size,
      appearance: options?.appearance && VALID_APPEARANCES.includes(options.appearance) ? options.appearance : DEFAULTS.appearance,
      colorMode: options?.colorMode && VALID_COLOR_MODES.includes(options.colorMode) ? options.colorMode : DEFAULTS.colorMode,
      semanticType: options?.semanticType && VALID_SEMANTIC_TYPES.includes(options.semanticType) ? options.semanticType : DEFAULTS.semanticType,
      customColor: options?.customColor && VALID_CUSTOM_COLORS.includes(options.customColor) ? options.customColor : DEFAULTS.customColor,
      message: options?.message ?? DEFAULTS.message,
      counterMode: options?.counterMode && VALID_COUNTER_MODES.includes(options.counterMode) ? options.counterMode : DEFAULTS.counterMode,
      count: typeof options?.count === 'number' ? options.count : DEFAULTS.count,
      total: options?.total ?? DEFAULTS.total,
      overflowCount: typeof options?.overflowCount === 'number' ? options.overflowCount : DEFAULTS.overflowCount,
      hideWhenZero: options?.hideWhenZero ?? DEFAULTS.hideWhenZero,
      autoFormat: options?.autoFormat ?? DEFAULTS.autoFormat,
      localeAware: options?.localeAware ?? DEFAULTS.localeAware,
      hasBadgeIcon: options?.hasBadgeIcon ?? DEFAULTS.hasBadgeIcon,
      icon: options?.icon ?? DEFAULTS.icon,
      placement: options?.placement && ARVO_BADGE_PLACEMENTS.includes(options.placement) ? options.placement : DEFAULTS.placement,
      hasStatus: options?.hasStatus ?? DEFAULTS.hasStatus,
      statusType: options?.statusType ?? DEFAULTS.statusType,
      statusPosition: options?.statusPosition ?? DEFAULTS.statusPosition,
      tooltip: options?.tooltip ?? DEFAULTS.tooltip,
      role: options?.role ?? DEFAULTS.role,
    };
    this._render();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private _render(): void {
    this.el.textContent = '';
    this._icoEl = null;
    this._msgEl = null;
    this._countEl = null;
    this._sepEl = null;
    this._totalEl = null;
    this._animEndHandler = null;
    this._statusSpan = null;
    this._statusInstance = null;

    this.el.className = this._buildRootClasses();
    this.el.setAttribute('role', this._opts.role);
    this._applyAccessibleName();
    this._applyTitle();
    this._applyHidden();
    this._renderContentDOM();
    if (this._opts.hasStatus) {
      this._renderStatus();
    }
  }

  private _buildRootClasses(): string {
    const { variant, size, appearance, counterMode, placement } = this._opts;
    const parts = [
      'arvo-bdg',
      `arvo-bdg--${variant}`,
      `arvo-bdg--${size}`,
      `arvo-bdg--${appearance}`,
      this._resolveColorClass(),
    ];
    if (variant === 'counter') parts.push(`arvo-bdg--${counterMode}`);
    parts.push(`arvo-bdg--${placement}`);
    return parts.join(' ');
  }

  private _resolveColorClass(): string {
    const { colorMode, semanticType, customColor } = this._opts;
    if (colorMode === 'custom' || semanticType === 'none') return `arvo-bdg--${customColor}`;
    return `arvo-bdg--${semanticType}`;
  }

  private _resolveIcon(): string | null {
    const { hasBadgeIcon, icon, colorMode, semanticType } = this._opts;
    if (!hasBadgeIcon) return null;
    if (icon) return icon;
    if (colorMode === 'semantic' && semanticType !== 'none') return SEMANTIC_ICON_MAP[semanticType];
    return null;
  }

  private _resolveAccessibleName(): string | undefined {
    const { tooltip, variant, counterMode, count, overflowCount, total } = this._opts;
    if (tooltip) return tooltip;
    if (variant === 'counter') {
      if (counterMode === 'single') {
        return count > overflowCount ? `${overflowCount} or more` : String(count);
      }
      return `${count} out of ${total ?? 0}`;
    }
    return undefined;
  }

  private _applyAccessibleName(): void {
    const name = this._resolveAccessibleName();
    if (name !== undefined) {
      this.el.setAttribute('aria-label', name);
    } else {
      this.el.removeAttribute('aria-label');
    }
  }

  private _applyTitle(): void {
    if (this._opts.tooltip) {
      this.el.setAttribute('title', this._opts.tooltip);
    } else {
      this.el.removeAttribute('title');
    }
  }

  private _applyHidden(): void {
    const { variant, counterMode, hideWhenZero, count } = this._opts;
    this.el.hidden = variant === 'counter' && counterMode === 'single' && hideWhenZero && count === 0;
  }

  private _renderContentDOM(): void {
    const { variant, counterMode, message, count, total, autoFormat, overflowCount, localeAware } = this._opts;
    const resolvedIcon = this._resolveIcon();

    if (resolvedIcon) {
      this._icoEl = document.createElement('i');
      this._icoEl.className = `arvo-bdg__ico o9con o9con-${resolvedIcon}`;
      this._icoEl.setAttribute('aria-hidden', 'true');
      this.el.appendChild(this._icoEl);
    }

    if (variant === 'label') {
      this._msgEl = document.createElement('span');
      this._msgEl.className = 'arvo-bdg__msg';
      this._msgEl.textContent = message;
      this.el.appendChild(this._msgEl);
    } else if (counterMode === 'single') {
      this._countEl = document.createElement('span');
      this._countEl.className = 'arvo-bdg__count';
      this._countEl.textContent = formatBadgeCount(count, { autoFormat, overflowCount, localeAware });
      this._attachAnimEndHandler();
      this.el.appendChild(this._countEl);
    } else {
      this._countEl = document.createElement('span');
      this._countEl.className = 'arvo-bdg__count';
      this._countEl.textContent = formatBadgeCount(count, { autoFormat, localeAware, isRatioPart: true });
      this._attachAnimEndHandler();
      this.el.appendChild(this._countEl);

      this._sepEl = document.createElement('span');
      this._sepEl.className = 'arvo-bdg__sep';
      this._sepEl.setAttribute('aria-hidden', 'true');
      this._sepEl.textContent = '/';
      this.el.appendChild(this._sepEl);

      this._totalEl = document.createElement('span');
      this._totalEl.className = 'arvo-bdg__total';
      this._totalEl.textContent = formatBadgeCount(total ?? 0, { autoFormat, localeAware, isRatioPart: true });
      this.el.appendChild(this._totalEl);
    }
  }

  private _attachAnimEndHandler(): void {
    if (!this._countEl) return;
    this._animEndHandler = () => {
      this._countEl?.classList.remove('is-increasing', 'is-decreasing');
    };
    this._countEl.addEventListener('animationend', this._animEndHandler);
  }

  private _removeContentDOM(): void {
    if (this._animEndHandler && this._countEl) {
      this._countEl.removeEventListener('animationend', this._animEndHandler);
    }
    this._icoEl?.remove();
    this._msgEl?.remove();
    this._countEl?.remove();
    this._sepEl?.remove();
    this._totalEl?.remove();
    this._icoEl = null;
    this._msgEl = null;
    this._countEl = null;
    this._sepEl = null;
    this._totalEl = null;
    this._animEndHandler = null;
  }

  private _renderStatus(): void {
    this._statusSpan = document.createElement('span');
    this._statusInstance = ArvoStatus.initialize(this._statusSpan, {
      type: this._opts.statusType,
      placement: this._opts.statusPosition,
      size: 'sm',
    });
    this.el.appendChild(this._statusSpan);
  }

  private _removeStatusDOM(): void {
    this._statusInstance?.destroy();
    this._statusInstance = null;
    this._statusSpan?.remove();
    this._statusSpan = null;
  }

  private _applyColorClass(): void {
    ([...VALID_SEMANTIC_TYPES, ...VALID_CUSTOM_COLORS] as string[]).forEach(v => {
      this.el.classList.remove(`arvo-bdg--${v}`);
    });
    this.el.classList.add(this._resolveColorClass());
  }

  private _updateIcon(): void {
    const resolvedIcon = this._resolveIcon();
    if (resolvedIcon) {
      if (this._icoEl) {
        this._icoEl.className = `arvo-bdg__ico o9con o9con-${resolvedIcon}`;
      } else {
        this._icoEl = document.createElement('i');
        this._icoEl.className = `arvo-bdg__ico o9con o9con-${resolvedIcon}`;
        this._icoEl.setAttribute('aria-hidden', 'true');
        this.el.insertBefore(this._icoEl, this.el.firstChild);
      }
    } else if (this._icoEl) {
      this._icoEl.remove();
      this._icoEl = null;
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Getter: returns current count. Setter: updates count, animates, applies hideWhenZero. */
  count(): number;
  count(value: number): void;
  count(value?: number): number | void {
    if (value === undefined) return this._opts.count;
    const prev = this._opts.count;
    this._opts.count = value;
    this._applyHidden();
    this._applyAccessibleName();
    if (this._countEl && this._opts.variant === 'counter') {
      const { autoFormat, overflowCount, localeAware, counterMode } = this._opts;
      if (counterMode === 'single') {
        this._countEl.textContent = formatBadgeCount(value, { autoFormat, overflowCount, localeAware });
      } else {
        this._countEl.textContent = formatBadgeCount(value, { autoFormat, localeAware, isRatioPart: true });
      }
      if (value > prev) {
        this._countEl.classList.remove('is-decreasing');
        this._countEl.classList.add('is-increasing');
      } else if (value < prev) {
        this._countEl.classList.remove('is-increasing');
        this._countEl.classList.add('is-decreasing');
      }
    }
  }

  increment(by = 1): void {
    this.count(this._opts.count + by);
  }

  decrement(by = 1): void {
    this.count(this._opts.count - by);
  }

  setMessage(text: string): void {
    this._opts.message = text;
    if (this._msgEl) this._msgEl.textContent = text;
  }

  setTotal(total: number | null): void {
    this._opts.total = total;
    if (this._totalEl) {
      const { autoFormat, localeAware } = this._opts;
      this._totalEl.textContent = formatBadgeCount(total ?? 0, { autoFormat, localeAware, isRatioPart: true });
    }
    this._applyAccessibleName();
  }

  setOverflowCount(max: number): void {
    this._opts.overflowCount = max;
    if (this._countEl && this._opts.variant === 'counter' && this._opts.counterMode === 'single') {
      const { count, autoFormat, localeAware } = this._opts;
      this._countEl.textContent = formatBadgeCount(count, { autoFormat, overflowCount: max, localeAware });
    }
    this._applyAccessibleName();
  }

  setVariant(variant: ArvoBadgeVariant): void {
    if (!VALID_VARIANTS.includes(variant)) return;
    if (this._opts.variant === variant) return;
    VALID_VARIANTS.forEach(v => this.el.classList.remove(`arvo-bdg--${v}`));
    this.el.classList.add(`arvo-bdg--${variant}`);
    if (variant === 'counter') {
      this.el.classList.add(`arvo-bdg--${this._opts.counterMode}`);
    } else {
      VALID_COUNTER_MODES.forEach(m => this.el.classList.remove(`arvo-bdg--${m}`));
    }
    this._opts.variant = variant;
    this._removeContentDOM();
    this._renderContentDOM();
    if (this._statusSpan) this.el.appendChild(this._statusSpan);
    this._applyHidden();
    this._applyAccessibleName();
  }

  setSize(size: ArvoBadgeSize): void {
    if (!VALID_SIZES.includes(size)) return;
    VALID_SIZES.forEach(s => this.el.classList.remove(`arvo-bdg--${s}`));
    this.el.classList.add(`arvo-bdg--${size}`);
    this._opts.size = size;
  }

  /** Dual-purpose getter/setter for the placement modifier. */
  placement(): ArvoBadgePlacement;
  placement(value: ArvoBadgePlacement): void;
  placement(value?: ArvoBadgePlacement): ArvoBadgePlacement | void {
    if (value === undefined) return this._opts.placement;
    if (!ARVO_BADGE_PLACEMENTS.includes(value)) return;
    ARVO_BADGE_PLACEMENTS.forEach(p => this.el.classList.remove(`arvo-bdg--${p}`));
    this.el.classList.add(`arvo-bdg--${value}`);
    this._opts.placement = value;
  }

  setAppearance(appearance: ArvoBadgeAppearance): void {
    if (!VALID_APPEARANCES.includes(appearance)) return;
    VALID_APPEARANCES.forEach(a => this.el.classList.remove(`arvo-bdg--${a}`));
    this.el.classList.add(`arvo-bdg--${appearance}`);
    this._opts.appearance = appearance;
  }

  setColorMode(mode: ArvoBadgeColorMode): void {
    if (!VALID_COLOR_MODES.includes(mode)) return;
    this._opts.colorMode = mode;
    this._applyColorClass();
    this._updateIcon();
  }

  setSemanticType(type: ArvoBadgeSemanticType): void {
    if (!VALID_SEMANTIC_TYPES.includes(type)) return;
    this._opts.semanticType = type;
    this._applyColorClass();
    this._updateIcon();
  }

  setCustomColor(color: ArvoBadgeCustomColor): void {
    if (!VALID_CUSTOM_COLORS.includes(color)) return;
    this._opts.customColor = color;
    this._applyColorClass();
  }

  setTooltip(text: string | null): void {
    this._opts.tooltip = text;
    this._applyTitle();
    this._applyAccessibleName();
  }

  setStatus(config: { type: ArvoStatusType; position?: 'top-right' } | false): void {
    if (config === false) {
      this._opts.hasStatus = false;
      this._removeStatusDOM();
    } else {
      this._opts.statusType = config.type;
      if (config.position) this._opts.statusPosition = config.position;
      if (this._statusInstance) {
        this._statusInstance.setType(config.type);
        if (config.position) this._statusInstance.placement(config.position);
      } else {
        this._opts.hasStatus = true;
        this._renderStatus();
      }
    }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._removeContentDOM();
    this._removeStatusDOM();
    this.el.className = '';
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-label');
    this.el.removeAttribute('title');
    this.el.hidden = false;
  }
}
