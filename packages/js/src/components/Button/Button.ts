// Vanilla JS ArvoButton.
//
// Tooltip standard: per the design system rule, label-bearing components do
// NOT expose a tooltip option -- consumers wrap the trigger with ArvoTooltip
// when one is needed. ArvoButton therefore intentionally omits the tooltip
// option here. Icon-only siblings (ArvoIconButton, ArvoFabButton, etc.)
// still accept a tooltip because the value also drives aria-label.

import {
  attachTitleTruncationTooltip,
  type TitleTruncationHandle,
} from '@arvo/utils';
import {
  ArvoBadge,
  type ArvoBadgeConfig,
  type ArvoBadgeOptions,
  type ArvoBadgePlacement,
  type ArvoBadgeSemanticType,
} from '../Badge/Badge';
import {
  ArvoStatus,
  type ArvoStatusConfig,
  type ArvoStatusOptions,
  type ArvoStatusType,
} from '../Status/Status';

// ---------------------------------------------------------------------------
// Slot config types (narrowed Pick<> of the canonical configs)
// ---------------------------------------------------------------------------

/**
 * Slot placement allowed on a Button's status slot. The button supports
 * overlay placements ONLY -- inline status is not a Button surface.
 */
export type ArvoButtonStatusPlacement = Exclude<
  ArvoStatusConfig['placement'],
  'inline'
>;

/**
 * Narrowed badge slot config for ArvoButton. Mirrors React's
 * `ArvoButtonBadgeConfig` shape. Surface restrictions vs canonical:
 *   - `size` is fixed to `'sm'`.
 *   - `appearance` is fixed (`'primary'` inline / `'filled'` overlay).
 *   - `colorMode` is fixed to `'semantic'`.
 *   - `customColor`, `hasBadgeIcon`, `icon`, `tooltip` are excluded.
 *   - `semanticType` is honored ONLY on overlay placements.
 */
export type ArvoButtonBadgeConfig = Pick<
  ArvoBadgeConfig,
  | 'placement'
  | 'variant'
  | 'counterMode'
  | 'message'
  | 'count'
  | 'total'
  | 'overflowCount'
  | 'hideWhenZero'
  | 'autoFormat'
  | 'localeAware'
  | 'semanticType'
  | 'className'
>;

/**
 * Narrowed status slot config for ArvoButton. Mirrors React's
 * `ArvoButtonStatusConfig` shape.
 *   - `size` is derived from button size -- not exposed.
 *   - `tooltip` is excluded.
 *   - `placement` accepts ONLY the overlay corners.
 */
export type ArvoButtonStatusConfig = Omit<
  Pick<ArvoStatusConfig, 'type' | 'placement' | 'icon' | 'className'>,
  'placement'
> & {
  placement?: ArvoButtonStatusPlacement;
};

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Apply the Button matrix's fixed-value contract to a consumer-supplied
 * `ArvoButtonBadgeConfig`. Output is a fully-resolved `ArvoBadgeOptions`
 * ready for `ArvoBadge.initialize`. Mirrors React's `resolveButtonBadge`.
 *
 * The host button `variant` is consulted only to flip the inline badge's
 * appearance to `'filled'` when the button is `'secondary'` (so the badge
 * reads against the lighter surface). All other placements use `'filled'`
 * unconditionally; inline on every other variant uses `'primary'`.
 */
export function resolveButtonBadge(
  cfg: ArvoButtonBadgeConfig,
  buttonVariant?: ArvoButtonVariant,
): ArvoBadgeOptions {
  const placement: ArvoBadgePlacement = cfg.placement ?? 'inline';
  const isPositioned = placement !== 'inline';
  const variant: ArvoBadgeOptions['variant'] = isPositioned
    ? 'counter'
    : cfg.variant ?? 'label';
  const counterMode: ArvoBadgeOptions['counterMode'] = isPositioned
    ? 'single'
    : cfg.counterMode;
  const semanticType: ArvoBadgeSemanticType = isPositioned
    ? cfg.semanticType ?? 'neutral'
    : 'neutral';
  const inlineAppearance: ArvoBadgeOptions['appearance'] =
    buttonVariant === 'secondary' ? 'filled' : 'primary';
  return {
    ...cfg,
    placement,
    variant,
    counterMode,
    semanticType,
    size: 'sm',
    appearance: isPositioned ? 'filled' : inlineAppearance,
    colorMode: 'semantic',
    hasBadgeIcon: false,
  };
}

/**
 * Apply the Button matrix's fixed-value contract to a consumer-supplied
 * `ArvoButtonStatusConfig`. Output is a fully-resolved
 * `ArvoStatusOptions` ready for `ArvoStatus.initialize`. The status size
 * is derived from the host button size.
 */
export function resolveButtonStatus(
  cfg: ArvoButtonStatusConfig,
  buttonSize: 'sm' | 'md' | 'lg',
): ArvoStatusOptions {
  return {
    ...cfg,
    size: buttonSize,
    placement: cfg.placement ?? 'top-right',
  };
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

/**
 * Visual style variant for `ArvoButton`. Mirrors the React twin's
 * `ArvoButtonVariant` exactly. `danger` is a back-compat alias for
 * `danger-primary`; `inline` is Button-only (not accepted on
 * `ArvoIconButton`).
 */
export type ArvoButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'danger-primary'
  | 'danger'
  | 'danger-tertiary'
  | 'danger-outline'
  | 'nova-primary'
  | 'inline';

export interface ArvoButtonOptions {
  variant?: ArvoButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  label?: string;
  icon?: string | null;
  isDisabled?: boolean;
  /**
   * Parent-controlled active/selected visual. Renders `aria-pressed` and the
   * `.active` class. Use for non-toggle "active trigger" visuals (e.g. an
   * overlay-trigger button showing it has opened a menu / popover, a
   * tab-pinned indicator). Click does NOT toggle this value -- the parent
   * owns it.
   *
   * For a user-driven toggle button, use `ArvoToggleButton`.
   */
  isSelected?: boolean;
  isFullWidth?: boolean;
  isLoading?: boolean;
  onClick?: (event: Event) => void;
  /**
   * Keydown callback. Mirrors React's `onKeyDown` (inherited via
   * `ButtonHTMLAttributes`) and the sibling JS `ArvoIconButton.onKeyDown`
   * option.
   */
  onKeyDown?: (event: KeyboardEvent) => void;
  /**
   * Embedded ArvoBadge slot. Set `placement: 'inline'` for an adjacent
   * badge (label or counter, fixed size sm + appearance primary +
   * semantic neutral + no icon) or `placement: 'top-right'` for an
   * absolutely positioned counter (filled appearance + configurable
   * `semanticType`). Pass `null` / omit to render no badge. Badge
   * bottom-right is intentionally unsupported -- use the `status` slot
   * for a bottom-anchored overlay.
   */
  badge?: ArvoButtonBadgeConfig | null;
  /**
   * Embedded ArvoStatus slot. Overlay-only on Button: placement is
   * restricted to `'top-right'` or `'bottom-right'`. Status size is
   * derived from the button's `size` option.
   */
  status?: ArvoButtonStatusConfig | null;
  /**
   * Show the full label in a tooltip on hover / focus when the visible
   * label is truncated. Recovery affordance only -- appears ONLY when
   * the `.arvo-btn__lbl` span is clipped at runtime and no explicit
   * `ArvoTooltip.initialize(buttonEl, ...)` is wired on the same
   * element. Default `true`.
   *
   * Precedence: an explicit tooltip on the same anchor always wins;
   * this internal tooltip yields automatically and does NOT add
   * `aria-describedby` (the full label is already part of the button's
   * accessible name).
   */
  hasTruncationTooltip?: boolean;
}

type RequiredButtonOptions = Required<
  Omit<
    ArvoButtonOptions,
    'onClick' | 'onKeyDown' | 'icon' | 'isSelected' | 'badge' | 'status'
  >
> & {
  icon: string | null;
  onClick: ((event: Event) => void) | null;
  onKeyDown: ((event: KeyboardEvent) => void) | null;
  isSelected: boolean | undefined;
  badge: ArvoButtonBadgeConfig | null;
  status: ArvoButtonStatusConfig | null;
  hasTruncationTooltip: boolean;
};

export class ArvoButton {
  private _element: HTMLButtonElement | null;
  private _options: RequiredButtonOptions;
  private _iconEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _badgeEl: HTMLSpanElement | null = null;
  private _badgeInstance: ArvoBadge | null = null;
  private _statusEl: HTMLSpanElement | null = null;
  private _statusInstance: ArvoStatus | null = null;
  private _truncationTooltip: TitleTruncationHandle | null = null;
  private _originalContent: string;
  private _boundHandleClick: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;

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
    'inline',
  ] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredButtonOptions = {
    variant: 'primary',
    size: 'md',
    type: 'button',
    label: '',
    icon: null,
    isDisabled: false,
    isSelected: undefined,
    isFullWidth: false,
    isLoading: false,
    badge: null,
    status: null,
    hasTruncationTooltip: true,
    onClick: null,
    onKeyDown: null,
  };

  static initialize(element: HTMLButtonElement, options?: ArvoButtonOptions): ArvoButton {
    return new ArvoButton(element, options);
  }

  constructor(element: HTMLButtonElement, options?: ArvoButtonOptions) {
    this._element = element;
    this._originalContent = element.textContent?.trim() ?? '';

    const variant = options?.variant && (ArvoButton.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoButton.DEFAULTS.variant;

    const size = options?.size && (ArvoButton.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoButton.DEFAULTS.size;

    this._options = {
      ...ArvoButton.DEFAULTS,
      ...options,
      variant,
      size,
      label: options?.label ?? this._originalContent,
      icon: options?.icon ?? null,
      onClick: options?.onClick ?? null,
      onKeyDown: options?.onKeyDown ?? null,
      badge: options?.badge ?? null,
      status: options?.status ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    el.classList.add('arvo-btn');
    el.classList.add(`arvo-btn--${this._options.variant}`);
    el.classList.add(`arvo-btn--${this._options.size}`);
    el.setAttribute('type', this._options.type);

    if (this._options.isFullWidth) {
      el.classList.add('arvo-btn--full-width');
    }

    if (this._options.icon) {
      this._iconEl = this._createIconEl(this._options.icon);
      el.appendChild(this._iconEl);
    }

    this._labelEl = document.createElement('span');
    this._labelEl.className = 'arvo-btn__lbl';
    this._labelEl.textContent = this._options.label;
    el.appendChild(this._labelEl);

    if (this._options.hasTruncationTooltip && this._options.label) {
      this._attachTruncationTooltip();
    }

    if (this._options.badge) {
      this._renderBadge(this._options.badge);
    }
    if (this._options.status) {
      this._renderStatus(this._options.status);
    }

    if (this._options.isDisabled) {
      el.disabled = true;
    }

    // aria-pressed is rendered only when the consumer explicitly passes
    // `isSelected` (controlled active-trigger visual). For a user-driven
    // toggle, use ArvoToggleButton.
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

  /**
   * Wire the internal truncation tooltip onto the live label span. The
   * `triggerElement` is the button itself so hover/focus events fire on
   * the full surface; the connector measures `_labelEl` for clipping
   * and yields automatically to any explicit `ArvoTooltip` attached to
   * the button.
   */
  private _attachTruncationTooltip(): void {
    if (this._truncationTooltip || !this._element || !this._labelEl) return;
    this._truncationTooltip = attachTitleTruncationTooltip({
      triggerElement: this._element,
      element: this._labelEl,
      content: () => this._options.label,
      placement: 'bottom-center',
    });
  }

  private _detachTruncationTooltip(): void {
    this._truncationTooltip?.destroy();
    this._truncationTooltip = null;
  }

  private _renderBadge(cfg: ArvoButtonBadgeConfig): void {
    if (!this._element) return;
    const resolved = resolveButtonBadge(cfg, this._options.variant);
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

  private _renderStatus(cfg: ArvoButtonStatusConfig): void {
    if (!this._element) return;
    const resolved = resolveButtonStatus(cfg, this._options.size);
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

  setLabel(text: string): void {
    this._options.label = text;
    if (this._labelEl) {
      this._labelEl.textContent = text;
    } else if (this._element) {
      this._labelEl = document.createElement('span');
      this._labelEl.className = 'arvo-btn__lbl';
      this._labelEl.textContent = text;
      this._element.appendChild(this._labelEl);
    }

    // Keep the truncation tooltip in sync with the new label. The
    // connector reads `content` via the closure that returns
    // `this._options.label`, so `update()` only needs to flush its
    // internal pointer. When the label transitions from empty to
    // non-empty we lazily attach; when it goes empty we detach.
    if (!this._options.hasTruncationTooltip) {
      this._detachTruncationTooltip();
      return;
    }
    if (text) {
      if (this._truncationTooltip) {
        this._truncationTooltip.update(() => this._options.label);
      } else {
        this._attachTruncationTooltip();
      }
    } else {
      this._detachTruncationTooltip();
    }
  }

  setIcon(iconName: string | null): void {
    if (!iconName) {
      if (this._iconEl) {
        this._iconEl.remove();
        this._iconEl = null;
      }
      this._options.icon = null;
      return;
    }

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

  setVariant(variant: string): void {
    if (!(ArvoButton.VARIANTS as readonly string[]).includes(variant)) return;

    const el = this._element;
    if (!el) return;

    ArvoButton.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    el.classList.add(`arvo-btn--${variant}`);
    this._options.variant = variant as RequiredButtonOptions['variant'];

    // The inline badge's appearance depends on the host variant
    // (`secondary` -> `filled`, everything else -> `primary`). Reconfigure
    // the existing ArvoBadge instance in place so the badge host node
    // (and any positioned slot anchored to it) retains identity across
    // variant changes -- destroying and re-creating the badge node would
    // break references held by callers, animations, and tests that assert
    // slot stability.
    if (this._badgeInstance && this._options.badge) {
      const resolved = resolveButtonBadge(
        this._options.badge,
        this._options.variant,
      );
      this._badgeInstance.setAppearance(resolved.appearance!);
    }
  }

  setSize(size: string): void {
    if (!(ArvoButton.SIZES as readonly string[]).includes(size)) return;

    const el = this._element;
    if (!el) return;

    ArvoButton.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));
    el.classList.add(`arvo-btn--${size}`);
    this._options.size = size as RequiredButtonOptions['size'];

    // The status slot derives its size from the button -- re-resolve and
    // re-apply when the button size changes.
    if (this._statusInstance && this._options.status) {
      this._statusInstance.setSize(this._options.size as 'sm' | 'md' | 'lg');
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
    this._dispatchEvent('btn:disabled', { isDisabled: state });
  }

  /**
   * Add, update, or remove the embedded ArvoBadge slot. Pass `null` to
   * tear the badge down; pass a config object to render or re-render.
   */
  setBadge(config: ArvoButtonBadgeConfig | null): void {
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
   */
  setStatus(config: ArvoButtonStatusConfig | null): void {
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

    el.classList.remove('arvo-btn', 'arvo-btn--full-width', 'active', 'open', 'loading', 'focus-border');
    ArvoButton.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    ArvoButton.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));

    el.removeAttribute('aria-pressed');
    el.removeAttribute('aria-expanded');
    el.removeAttribute('aria-haspopup');
    el.removeAttribute('aria-busy');

    el.disabled = false;

    this._detachTruncationTooltip();

    this._iconEl?.remove();
    this._labelEl?.remove();
    this._removeBadge();
    this._removeStatus();

    el.textContent = this._originalContent;

    this._element = null;
    this._iconEl = null;
    this._labelEl = null;
  }
}

// Re-export the canonical config types so consumers can import from the
// Button entry point.
export type {
  ArvoBadgeConfig,
  ArvoStatusConfig,
  ArvoStatusType,
};
