// ArvoStatus -- vanilla JS twin of the React component.
//
// Renders a compact visual status indicator inside the host element. The
// element is decorated with the BEM classes (.arvo-sts + size + type +
// placement) and an inner <i class="o9con o9con-{name}"> glyph;
// aria-label + title are set from the resolved label.
//
// `placement` is a single-axis layout selector:
//   - `'inline'` (default): transparent background, normal-flow
//     inline-flex element. Use when the status sits next to text or
//     other content.
//   - `'top-right'` / `'bottom-right'`: layer-01 separator background +
//     absolute positioning at the matching corner of a `corner-host`
//     parent (the host must have `position: relative`, typically via
//     the shared `corner-host` SCSS mixin).

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoStatusType =
  | 'available'
  | 'notAvailable'
  | 'partialComplete'
  | 'busy'
  | 'failed'
  | 'blocked'
  | 'attention'
  | 'loading'
  | 'paused'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'info'
  | 'neutral';

export type ArvoStatusSize = 'sm' | 'md' | 'lg';

export type ArvoStatusPlacement = 'inline' | 'top-right' | 'bottom-right';

/**
 * Standardized configuration object that consuming components expose
 * via a `status` option to embed ArvoStatus. React and JS share the same
 * shape -- drift reviewer enforced.
 */
export interface ArvoStatusConfig {
  type: ArvoStatusType;
  placement?: ArvoStatusPlacement;
  size?: ArvoStatusSize;
  tooltip?: string;
  icon?: string;
  className?: string;
}

export interface ArvoStatusOptions {
  type?: ArvoStatusType;
  size?: ArvoStatusSize;
  placement?: ArvoStatusPlacement;
  tooltip?: string;
  icon?: string;
}

interface ResolvedOptions {
  type: ArvoStatusType;
  size: ArvoStatusSize;
  placement: ArvoStatusPlacement;
  tooltip: string | null;
  icon: string | null;
}

// ---------------------------------------------------------------------------
// Registry (mirrors the React twin and descriptor)
// ---------------------------------------------------------------------------

interface TypeMeta {
  icon: string | null;
  label: string;
  iconOverridable: boolean;
}

const TYPE_REGISTRY: Record<ArvoStatusType, TypeMeta> = {
  available: { icon: 'basicshape-circle', label: 'Available', iconOverridable: false },
  notAvailable: { icon: 'circle-shape', label: 'Not available', iconOverridable: false },
  partialComplete: { icon: 'adjust', label: 'Partial complete', iconOverridable: false },
  busy: { icon: 'minus-circle', label: 'Busy', iconOverridable: false },
  failed: { icon: 'times-circle', label: 'Failed', iconOverridable: false },
  blocked: { icon: 'blocker-action-filled', label: 'Blocked', iconOverridable: false },
  attention: { icon: 'basicshape-circle', label: 'Attention', iconOverridable: false },
  loading: { icon: 'spinner', label: 'Loading', iconOverridable: false },
  paused: { icon: 'on-hold', label: 'Paused', iconOverridable: false },
  critical: { icon: 'square', label: 'Critical', iconOverridable: false },
  high: { icon: 'chevron-circle-up', label: 'High', iconOverridable: false },
  medium: { icon: 'basicshape-hexagon', label: 'Medium', iconOverridable: false },
  low: { icon: 'chevron-circle-down', label: 'Low', iconOverridable: false },
  unknown: { icon: 'question-circle', label: 'Unknown', iconOverridable: false },
  positive: { icon: 'check-circle', label: 'Positive', iconOverridable: true },
  negative: { icon: 'exclamation-circle-filled', label: 'Negative', iconOverridable: true },
  warning: { icon: 'exclamation-triangle-filled', label: 'Warning', iconOverridable: true },
  info: { icon: 'info-circle-filled', label: 'Info', iconOverridable: true },
  neutral: { icon: null, label: 'Neutral', iconOverridable: true },
};

const NEUTRAL_ICON_FALLBACK = 'camera-retro';

const VALID_TYPES = Object.keys(TYPE_REGISTRY) as ArvoStatusType[];
const VALID_SIZES: readonly ArvoStatusSize[] = ['sm', 'md', 'lg'];
const VALID_PLACEMENTS: readonly ArvoStatusPlacement[] = ['inline', 'top-right', 'bottom-right'];

export const ARVO_STATUS_TYPES: readonly ArvoStatusType[] = VALID_TYPES;
export const ARVO_STATUS_TYPE_REGISTRY = TYPE_REGISTRY;
export const ARVO_STATUS_PLACEMENTS: readonly ArvoStatusPlacement[] = VALID_PLACEMENTS;

export function resolveStatusIcon(
  type: ArvoStatusType,
  override?: string | null,
): string {
  const meta = TYPE_REGISTRY[type];
  if (meta.iconOverridable && override) return override;
  if (meta.icon) return meta.icon;
  return NEUTRAL_ICON_FALLBACK;
}

export function resolveStatusLabel(type: ArvoStatusType): string {
  return TYPE_REGISTRY[type].label;
}

const DEFAULTS: ResolvedOptions = {
  type: 'positive',
  size: 'lg',
  placement: 'inline',
  tooltip: null,
  icon: null,
};

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoStatus {
  /** The host element passed to initialize. Decorated in place. */
  readonly el: HTMLElement;

  private _opts: ResolvedOptions;
  private _iconEl: HTMLElement | null = null;
  private _destroyed = false;

  static readonly TYPES = VALID_TYPES;
  static readonly SIZES = VALID_SIZES;
  static readonly PLACEMENTS = VALID_PLACEMENTS;
  static readonly TYPE_REGISTRY = TYPE_REGISTRY;

  /** Factory matching the rest of the @arvo/js components. */
  static initialize(
    element: HTMLElement | null,
    options?: ArvoStatusOptions,
  ): ArvoStatus {
    const host = element ?? document.createElement('span');
    return new ArvoStatus(host, options);
  }

  constructor(element: HTMLElement, options?: ArvoStatusOptions) {
    this.el = element;

    const safeType = options?.type && VALID_TYPES.includes(options.type)
      ? options.type
      : DEFAULTS.type;
    const safeSize = options?.size && VALID_SIZES.includes(options.size)
      ? options.size
      : DEFAULTS.size;
    const safePlacement =
      options?.placement && VALID_PLACEMENTS.includes(options.placement)
        ? options.placement
        : DEFAULTS.placement;

    this._opts = {
      ...DEFAULTS,
      type: safeType,
      size: safeSize,
      placement: safePlacement,
      tooltip: options?.tooltip ?? null,
      icon: options?.icon ?? null,
    };

    this._render();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private _render(): void {
    this.el.textContent = '';
    this._iconEl = document.createElement('i');
    this._iconEl.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this._iconEl);

    this.el.setAttribute('role', 'img');
    this._applyClasses();
    this._applyIcon();
    this._applyTooltip();
  }

  private _applyClasses(): void {
    const { type, size, placement } = this._opts;
    this.el.className = [
      'arvo-sts',
      `arvo-sts--${size}`,
      `arvo-sts--${type}`,
      `arvo-sts--${placement}`,
    ].join(' ');
  }

  private _applyIcon(): void {
    if (!this._iconEl) return;
    const resolved = resolveStatusIcon(this._opts.type, this._opts.icon);
    this._iconEl.className = `arvo-sts__ico o9con o9con-${resolved}`;
  }

  private _applyTooltip(): void {
    const label = this._opts.tooltip ?? resolveStatusLabel(this._opts.type);
    this.el.setAttribute('aria-label', label);
    this.el.setAttribute('title', label);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Change the semantic type. */
  setType(type: ArvoStatusType): void {
    if (!VALID_TYPES.includes(type)) return;
    this._opts.type = type;
    this._applyClasses();
    this._applyIcon();
    if (this._opts.tooltip === null) {
      this._applyTooltip();
    }
  }

  /** Change the size. */
  setSize(size: ArvoStatusSize): void {
    if (!VALID_SIZES.includes(size)) return;
    this._opts.size = size;
    this._applyClasses();
  }

  /**
   * Dual-purpose getter/setter for the placement.
   *
   *   sts.placement()                 // 'inline' | 'top-right' | 'bottom-right'
   *   sts.placement('top-right')      // set
   */
  placement(): ArvoStatusPlacement;
  placement(value: ArvoStatusPlacement): void;
  placement(value?: ArvoStatusPlacement): ArvoStatusPlacement | void {
    if (value === undefined) return this._opts.placement;
    if (!VALID_PLACEMENTS.includes(value)) return;
    this._opts.placement = value;
    this._applyClasses();
  }

  /**
   * Override the icon glyph. Pass null to revert to the type default.
   * Ignored for locked-icon types.
   */
  setIcon(icon: string | null): void {
    this._opts.icon = icon;
    this._applyIcon();
  }

  /** Update the accessible label + native title. Pass null to revert. */
  setTooltip(tooltip: string | null): void {
    this._opts.tooltip = tooltip;
    this._applyTooltip();
  }

  /** Read-only accessors mirroring the React props for testing. */
  type(): ArvoStatusType { return this._opts.type; }
  size(): ArvoStatusSize { return this._opts.size; }

  /** Tear down inner DOM + decorations. The host element is preserved. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._iconEl) {
      this._iconEl.remove();
      this._iconEl = null;
    }
    this.el.removeAttribute('class');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-label');
    this.el.removeAttribute('title');
  }
}
