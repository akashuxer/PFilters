// Vanilla JS ArvoToggleButton.
//
// Dedicated two-state toggle. Renders icon (+ optional label) inside a
// native <button type="button"> and flips between selected and
// unselected on click / Enter / Space. `aria-pressed` is always
// emitted, mirroring the React twin. Mirrors the JS Button / IconButton
// patterns (variants, sizes, badge / status slots, Pattern A loading)
// and adds the toggle-grow scale animation via the `.active` class +
// shared `$arvo-motion-toggle` keyframe.

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
  type ArvoBadgePlacement,
  type ArvoBadgeSemanticType,
} from '../Badge/Badge';
import {
  ArvoStatus,
  type ArvoStatusConfig,
  type ArvoStatusOptions,
  type ArvoStatusType,
} from '../Status/Status';

export type ToggleButtonTooltipOption =
  | string
  | {
      content: string;
      placement?: TooltipPlacement;
      shortcut?: string;
    };

// ---------------------------------------------------------------------------
// Public variant + size unions
// ---------------------------------------------------------------------------

export type ArvoToggleButtonVariant = 'secondary' | 'tertiary' | 'outline';
export type ArvoToggleButtonSize = 'sm' | 'md' | 'lg';

// ---------------------------------------------------------------------------
// Slot config types (narrowed Pick<> of the canonical configs)
// ---------------------------------------------------------------------------

export type ArvoToggleButtonBadgePlacement = ArvoBadgePlacement;
export type ArvoToggleButtonStatusPlacement = 'top-right' | 'bottom-right';

/**
 * Narrowed badge slot config for ArvoToggleButton. Mirrors React's
 * `ArvoToggleButtonBadgeConfig` shape (which itself mirrors
 * `ArvoButtonBadgeConfig`). The host resolver fixes `size=sm`,
 * `appearance` (primary inline / filled overlay), `colorMode=semantic`,
 * `hasBadgeIcon=false`.
 */
export type ArvoToggleButtonBadgeConfig = Pick<
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
 * Narrowed status slot config for ArvoToggleButton. Overlay-only.
 * Status size derives from the toggle size (sm/md/lg map 1:1).
 */
export type ArvoToggleButtonStatusConfig = Omit<
  Pick<ArvoStatusConfig, 'type' | 'placement' | 'icon' | 'className'>,
  'placement'
> & {
  placement?: ArvoToggleButtonStatusPlacement;
};

// ---------------------------------------------------------------------------
// Resolvers (mirrors React)
// ---------------------------------------------------------------------------

/**
 * Apply the toggle button matrix's fixed-value contract to a
 * consumer-supplied `ArvoToggleButtonBadgeConfig`. Output is a
 * fully-resolved `ArvoBadgeOptions` ready for `ArvoBadge.initialize`.
 */
export function resolveToggleButtonBadge(
  cfg: ArvoToggleButtonBadgeConfig,
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
  return {
    ...cfg,
    placement,
    variant,
    counterMode,
    semanticType,
    size: 'sm',
    appearance: isPositioned ? 'filled' : 'primary',
    colorMode: 'semantic',
    hasBadgeIcon: false,
  };
}

/**
 * Apply the toggle button matrix's fixed-value contract to a
 * consumer-supplied `ArvoToggleButtonStatusConfig`. Status size is
 * derived from the host toggle size.
 */
export function resolveToggleButtonStatus(
  cfg: ArvoToggleButtonStatusConfig,
  toggleSize: ArvoToggleButtonSize,
): ArvoStatusOptions {
  return {
    ...cfg,
    size: toggleSize,
    placement: cfg.placement ?? 'top-right',
  };
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface ArvoToggleButtonOptions {
  variant?: ArvoToggleButtonVariant;
  size?: ArvoToggleButtonSize;
  type?: 'button' | 'submit' | 'reset';
  /** Icon name without `o9con-` prefix. Required. */
  icon?: string;
  /** Optional alternate icon shown when the toggle is selected. */
  selectedIcon?: string;
  /** Optional label. Omit for icon-only. */
  label?: string;
  /** Tooltip content + accessible-name source. Required when `label` is omitted. */
  tooltip?: ToggleButtonTooltipOption;
  isDisabled?: boolean;
  /** Controlled toggle state. Omit to fall back to `defaultSelected`. */
  isSelected?: boolean;
  /** Uncontrolled initial selected state. */
  defaultSelected?: boolean;
  isLoading?: boolean;
  onClick?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Fires on every user-driven flip (click, Enter, Space). */
  onSelectedChange?: (isSelected: boolean) => void;
  badge?: ArvoToggleButtonBadgeConfig | null;
  status?: ArvoToggleButtonStatusConfig | null;
}

type RequiredToggleButtonOptions = Required<
  Omit<
    ArvoToggleButtonOptions,
    | 'onClick'
    | 'onKeyDown'
    | 'onSelectedChange'
    | 'selectedIcon'
    | 'label'
    | 'badge'
    | 'status'
  >
> & {
  selectedIcon: string | null;
  label: string | null;
  onClick: ((event: Event) => void) | null;
  onKeyDown: ((event: KeyboardEvent) => void) | null;
  onSelectedChange: ((isSelected: boolean) => void) | null;
  badge: ArvoToggleButtonBadgeConfig | null;
  status: ArvoToggleButtonStatusConfig | null;
};

export class ArvoToggleButton {
  private _element: HTMLButtonElement | null;
  private _options: RequiredToggleButtonOptions;
  private _innerEl: HTMLSpanElement | null = null;
  private _iconEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _badgeEl: HTMLSpanElement | null = null;
  private _badgeInstance: ArvoBadge | null = null;
  private _statusEl: HTMLSpanElement | null = null;
  private _statusInstance: ArvoStatus | null = null;
  private _originalContent: string;
  private _originalType: string | null;
  private _boundHandleClick: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _tooltipConnector: TooltipConnector | null = null;

  static readonly VARIANTS = ['secondary', 'tertiary', 'outline'] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredToggleButtonOptions = {
    variant: 'secondary',
    size: 'md',
    type: 'button',
    icon: '',
    selectedIcon: null,
    label: null,
    tooltip: '',
    isDisabled: false,
    isSelected: false,
    defaultSelected: false,
    isLoading: false,
    onClick: null,
    onKeyDown: null,
    onSelectedChange: null,
    badge: null,
    status: null,
  };

  static initialize(
    element: HTMLButtonElement,
    options?: ArvoToggleButtonOptions,
  ): ArvoToggleButton {
    return new ArvoToggleButton(element, options);
  }

  constructor(element: HTMLButtonElement, options?: ArvoToggleButtonOptions) {
    this._element = element;
    this._originalContent = element.textContent ?? '';
    this._originalType = element.getAttribute('type');

    const variant =
      options?.variant &&
      (ArvoToggleButton.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoToggleButton.DEFAULTS.variant;

    const size =
      options?.size &&
      (ArvoToggleButton.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoToggleButton.DEFAULTS.size;

    this._options = {
      ...ArvoToggleButton.DEFAULTS,
      ...options,
      variant,
      size,
      icon: options?.icon ?? ArvoToggleButton.DEFAULTS.icon,
      selectedIcon: options?.selectedIcon ?? null,
      label: options?.label ?? null,
      tooltip: options?.tooltip ?? ArvoToggleButton.DEFAULTS.tooltip,
      onClick: options?.onClick ?? null,
      onKeyDown: options?.onKeyDown ?? null,
      onSelectedChange: options?.onSelectedChange ?? null,
      badge: options?.badge ?? null,
      status: options?.status ?? null,
    };

    // Seed the controlled / uncontrolled selected state. When the
    // consumer omits `isSelected`, fall back to `defaultSelected`.
    if (options?.isSelected === undefined) {
      this._options.isSelected = options?.defaultSelected ?? false;
    }


    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);

    this._render();
    this._bindEvents();
    this._connectTooltip();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _connectTooltip(): void {
    if (!this._element || !this._options.tooltip) return;
    const tip = this._options.tooltip;
    const config = typeof tip === 'string' ? { content: tip } : tip;
    if (!config.content) return;
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
    el.setAttribute('type', this._options.type);

    el.classList.add('arvo-toggle-btn');
    el.classList.add(`arvo-toggle-btn--${this._options.variant}`);
    el.classList.add(`arvo-toggle-btn--${this._options.size}`);

    const hasLabel = typeof this._options.label === 'string' && this._options.label.length > 0;
    if (!hasLabel) {
      el.classList.add('arvo-toggle-btn--icon-only');
    }

    // Always emit aria-pressed -- this is the toggle contract.
    el.setAttribute('aria-pressed', this._options.isSelected ? 'true' : 'false');
    if (this._options.isSelected) {
      el.classList.add('active');
    }

    // Accessible name: when icon-only the tooltip drives aria-label;
    // when the label is present, the visible label wins.
    if (!hasLabel) {
      const tip = this._options.tooltip;
      const tipContent = typeof tip === 'string' ? tip : tip?.content ?? '';
      if (tipContent) {
        el.setAttribute('aria-label', tipContent);
      }
    }

    // Inner wrapper: groups icon + label as a single animation target.
    const innerEl = document.createElement('span');
    innerEl.className = 'arvo-toggle-btn__inner';
    this._innerEl = innerEl;
    el.appendChild(innerEl);

    // Icon (always rendered)
    const renderedIcon = this._resolveDisplayedIcon();
    if (renderedIcon) {
      this._iconEl = this._createIconEl(renderedIcon);
      innerEl.appendChild(this._iconEl);
    }

    // Optional label
    if (hasLabel) {
      this._labelEl = document.createElement('span');
      this._labelEl.className = 'arvo-toggle-btn__lbl';
      this._labelEl.textContent = this._options.label as string;
      innerEl.appendChild(this._labelEl);
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

    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    }
  }

  private _resolveDisplayedIcon(): string {
    if (this._options.isSelected && this._options.selectedIcon) {
      return this._options.selectedIcon;
    }
    return this._options.icon;
  }

  private _createIconEl(iconName: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = `arvo-toggle-btn__ico o9con o9con-${iconName}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  private _renderBadge(cfg: ArvoToggleButtonBadgeConfig): void {
    if (!this._element) return;
    const resolved = resolveToggleButtonBadge(cfg);
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

  private _renderStatus(cfg: ArvoToggleButtonStatusConfig): void {
    if (!this._element) return;
    const resolved = resolveToggleButtonStatus(cfg, this._options.size);
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

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

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

    const next = !this._options.isSelected;
    this._applySelected(next);
    this._options.onSelectedChange?.(next);
    this._dispatchEvent('toggle-btn:change', { isSelected: next });

    if (this._options.onClick) {
      this._options.onClick(event);
    }
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
    if (this._options.onKeyDown) {
      this._options.onKeyDown(event);
    }
  }

  private _applySelected(next: boolean): void {
    const previous = this._options.isSelected;
    this._options.isSelected = next;

    const el = this._element;
    if (!el) return;

    el.setAttribute('aria-pressed', String(next));
    if (next) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }

    // Swap to the alternate icon when the consumer has provided one and
    // the state actually flipped.
    if (this._iconEl && this._options.selectedIcon && next !== previous) {
      const upcoming = next ? this._options.selectedIcon : this._options.icon;
      const removeName = next ? this._options.icon : this._options.selectedIcon;
      if (removeName) this._iconEl.classList.remove(`o9con-${removeName}`);
      if (upcoming) this._iconEl.classList.add(`o9con-${upcoming}`);
    }
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        cancelable: true,
        detail,
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Add, update, or remove the visible label. Adds / removes the
   * `arvo-toggle-btn--icon-only` modifier as the shape changes.
   */
  setLabel(text: string | null): void {
    const el = this._element;
    if (!el) return;

    const hadLabel =
      typeof this._options.label === 'string' && this._options.label.length > 0;
    const hasLabel = typeof text === 'string' && text.length > 0;
    this._options.label = hasLabel ? text : null;

    if (hasLabel) {
      if (this._labelEl) {
        this._labelEl.textContent = text!;
      } else {
        this._labelEl = document.createElement('span');
        this._labelEl.className = 'arvo-toggle-btn__lbl';
        this._labelEl.textContent = text!;
        // Insert after the icon (icon-first DOM order).
        if (this._iconEl) {
          this._iconEl.insertAdjacentElement('afterend', this._labelEl);
        } else {
          this._innerEl?.appendChild(this._labelEl);
        }
      }
      el.classList.remove('arvo-toggle-btn--icon-only');
      // Visible label wins: drop aria-label so the accessible name is
      // sourced from the label text.
      el.removeAttribute('aria-label');
    } else {
      this._labelEl?.remove();
      this._labelEl = null;
      el.classList.add('arvo-toggle-btn--icon-only');
      const tip = this._options.tooltip;
      const tipContent = typeof tip === 'string' ? tip : tip?.content ?? '';
      if (tipContent) {
        el.setAttribute('aria-label', tipContent);
      }
    }

    // Use hadLabel to signal a transition occurred (kept for symmetry /
    // future debugging hooks). Currently a no-op.
    void hadLabel;
  }

  /** Swap the resting icon glyph. */
  setIcon(iconName: string): void {
    if (!iconName) return;
    if (!this._iconEl && this._innerEl) {
      this._iconEl = this._createIconEl(iconName);
      this._innerEl.insertBefore(this._iconEl, this._innerEl.firstChild);
    } else if (this._iconEl) {
      const previous = this._options.icon;
      if (previous) this._iconEl.classList.remove(`o9con-${previous}`);
      this._iconEl.classList.add(`o9con-${iconName}`);
    }
    this._options.icon = iconName;

    // If the toggle is currently OFF (resting icon is displayed) or has
    // no selectedIcon, refresh the displayed glyph to match the new
    // resting icon. If the toggle is currently ON and selectedIcon is
    // set, the displayed glyph remains the selectedIcon -- swap only
    // takes effect on the next flip.
    if (!this._options.isSelected || !this._options.selectedIcon) {
      this._syncDisplayedIcon();
    }
  }

  /** Set or clear the alternate icon shown when the toggle is on. */
  setSelectedIcon(iconName: string | null): void {
    this._options.selectedIcon = iconName ?? null;
    // Refresh the displayed glyph immediately when the toggle is ON.
    if (this._options.isSelected) {
      this._syncDisplayedIcon();
    }
  }

  /**
   * Internal helper to (re)apply the resolved displayed icon based on
   * current `isSelected` + `selectedIcon`. Used by setIcon /
   * setSelectedIcon when the resolved glyph must change without a flip.
   */
  private _syncDisplayedIcon(): void {
    if (!this._iconEl) return;
    const desired = this._resolveDisplayedIcon();
    if (!desired) return;
    // Strip every o9con-* class then add the desired one.
    const toRemove: string[] = [];
    this._iconEl.classList.forEach((cls) => {
      if (cls.startsWith('o9con-')) toRemove.push(cls);
    });
    toRemove.forEach((cls) => this._iconEl?.classList.remove(cls));
    this._iconEl.classList.add(`o9con-${desired}`);
  }

  /**
   * Update the tooltip content (and aria-label when the toggle is
   * icon-only).
   */
  setTooltip(text: string): void {
    this._options.tooltip = text;
    const el = this._element;
    if (!el) return;
    const hasLabel =
      typeof this._options.label === 'string' && this._options.label.length > 0;
    if (!hasLabel && text) {
      el.setAttribute('aria-label', text);
    }
    this._tooltipConnector?.update({ content: text });
  }

  setVariant(variant: string): void {
    if (!(ArvoToggleButton.VARIANTS as readonly string[]).includes(variant)) return;
    const el = this._element;
    if (!el) return;
    ArvoToggleButton.VARIANTS.forEach((v) =>
      el.classList.remove(`arvo-toggle-btn--${v}`),
    );
    el.classList.add(`arvo-toggle-btn--${variant}`);
    this._options.variant = variant as RequiredToggleButtonOptions['variant'];
  }

  setSize(size: string): void {
    if (!(ArvoToggleButton.SIZES as readonly string[]).includes(size)) return;
    const el = this._element;
    if (!el) return;
    ArvoToggleButton.SIZES.forEach((s) =>
      el.classList.remove(`arvo-toggle-btn--${s}`),
    );
    el.classList.add(`arvo-toggle-btn--${size}`);
    this._options.size = size as RequiredToggleButtonOptions['size'];

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
    this._dispatchEvent('toggle-btn:loading', { isLoading });
  }

  /**
   * Dual-purpose getter/setter for the selected state. Omit `state` to
   * read; pass a boolean to write. Programmatic writes do NOT invoke
   * the consumer `onSelectedChange` callback, but the
   * `toggle-btn:change` DOM event still fires so external listeners
   * stay in sync.
   */
  selected(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isSelected === true;
    }
    if (state === this._options.isSelected) return;
    this._applySelected(state);
    this._dispatchEvent('toggle-btn:change', { isSelected: state });
  }

  /**
   * Flip the selected state, or force a target value. Returns the new
   * `isSelected` value. Fires the `toggle-btn:change` DOM event but does
   * NOT invoke `onSelectedChange` (programmatic, not user-driven).
   */
  toggle(force?: boolean): boolean {
    const current = this._options.isSelected === true;
    const next = typeof force === 'boolean' ? force : !current;
    if (next === current) return current;
    this._applySelected(next);
    this._dispatchEvent('toggle-btn:change', { isSelected: next });
    return next;
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }
    this._options.isDisabled = state;
    if (this._element) {
      this._element.disabled = state;
    }
    this._dispatchEvent('toggle-btn:disabled', { isDisabled: state });
  }

  /** Add, update, or remove the embedded ArvoBadge slot. */
  setBadge(config: ArvoToggleButtonBadgeConfig | null): void {
    this._options.badge = config;
    if (!config) {
      this._removeBadge();
      return;
    }
    this._removeBadge();
    this._renderBadge(config);
  }

  /** Add, update, or remove the embedded ArvoStatus slot. */
  setStatus(config: ArvoToggleButtonStatusConfig | null): void {
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

    el.classList.remove(
      'arvo-toggle-btn',
      'arvo-toggle-btn--icon-only',
      'active',
      'loading',
      'focus-border',
    );
    ArvoToggleButton.VARIANTS.forEach((v) =>
      el.classList.remove(`arvo-toggle-btn--${v}`),
    );
    ArvoToggleButton.SIZES.forEach((s) =>
      el.classList.remove(`arvo-toggle-btn--${s}`),
    );

    el.removeAttribute('aria-pressed');
    el.removeAttribute('aria-busy');
    el.removeAttribute('aria-label');

    if (this._originalType === null) {
      el.removeAttribute('type');
    } else {
      el.setAttribute('type', this._originalType);
    }

    el.disabled = false;

    this._innerEl?.remove();
    this._removeBadge();
    this._removeStatus();

    this._tooltipConnector?.destroy();
    this._tooltipConnector = null;

    el.textContent = this._originalContent;

    this._element = null;
    this._innerEl = null;
    this._iconEl = null;
    this._labelEl = null;
  }
}

// Re-export canonical config types so consumers can import from the
// ToggleButton entry point.
export type {
  ArvoBadgeConfig,
  ArvoStatusConfig,
  ArvoStatusType,
};
