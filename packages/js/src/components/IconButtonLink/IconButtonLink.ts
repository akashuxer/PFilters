import {
  connectTooltip,
  tooltipManager,
  type TooltipConnector,
} from '@arvo/core';
import type { IconButtonTooltipOption } from '../IconButton/IconButton';

export interface ArvoIconButtonLinkOptions {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  href?: string;
  target?: string;
  /**
   * Tooltip content. Accepts a plain string (used directly as content and
   * `aria-label`) or a config object (`{ content, placement?, shortcut? }`)
   * for richer tooltip presentation. Mirrors `ArvoIconButton`. Tooltip is
   * REQUIRED for IconButtonLink because there is no visible text label;
   * the value also drives `aria-label` so screen readers announce the link.
   */
  tooltip?: IconButtonTooltipOption;
  /**
   * When true, marks the link as outbound: auto-sets `target="_blank"` and
   * `rel="noopener noreferrer"` if `target` is not already provided. No
   * extra glyph is rendered (icon-only square has no room) -- consumers
   * that want a visible affordance should pass `icon: 'external-link'`.
   */
  hasExternalLink?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onClick?: (event: Event) => void;
}

type RequiredIconButtonLinkOptions = Required<Omit<ArvoIconButtonLinkOptions, 'onClick' | 'target' | 'tooltip'>> & {
  target: string | null;
  tooltip: IconButtonTooltipOption;
  onClick: ((event: Event) => void) | null;
};

function tooltipText(t: IconButtonTooltipOption | undefined): string {
  if (!t) return '';
  return typeof t === 'string' ? t : t.content;
}

export class ArvoIconButtonLink {
  private _element: HTMLAnchorElement | null;
  private _options: RequiredIconButtonLinkOptions;
  private _iconEl: HTMLSpanElement | null = null;
  private _originalHref: string;
  private _tooltipConnector: TooltipConnector | null = null;
  private _boundHandleClick: (event: Event) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'tertiary', 'outline'] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredIconButtonLinkOptions = {
    variant: 'tertiary',
    size: 'md',
    icon: '',
    href: '',
    target: null,
    tooltip: '',
    hasExternalLink: false,
    isDisabled: false,
    isLoading: false,
    onClick: null,
  };

  static initialize(element: HTMLAnchorElement, options?: ArvoIconButtonLinkOptions): ArvoIconButtonLink {
    return new ArvoIconButtonLink(element, options);
  }

  constructor(element: HTMLAnchorElement, options?: ArvoIconButtonLinkOptions) {
    this._element = element;
    this._originalHref = element.getAttribute('href') ?? '';

    const variant = options?.variant && (ArvoIconButtonLink.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoIconButtonLink.DEFAULTS.variant;

    const size = options?.size && (ArvoIconButtonLink.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoIconButtonLink.DEFAULTS.size;

    this._options = {
      ...ArvoIconButtonLink.DEFAULTS,
      ...options,
      variant,
      size,
      icon: options?.icon ?? ArvoIconButtonLink.DEFAULTS.icon,
      href: options?.href ?? this._originalHref,
      target: options?.target ?? null,
      tooltip: options?.tooltip ?? ArvoIconButtonLink.DEFAULTS.tooltip,
      onClick: options?.onClick ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);

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

    if (this._options.icon) {
      this._iconEl = this._createIconEl(this._options.icon);
      el.appendChild(this._iconEl);
    }

    const tipText = tooltipText(this._options.tooltip);
    if (tipText) {
      el.setAttribute('aria-label', tipText);
    }

    this._applyHref();
    this._applyTarget();

    if (this._options.isDisabled) {
      this._applyDisabled(true);
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

  private _applyHref(): void {
    const el = this._element;
    if (!el) return;

    if (this._options.isDisabled) {
      el.removeAttribute('href');
    } else {
      el.setAttribute('href', this._options.href);
    }
  }

  private _applyTarget(): void {
    const el = this._element;
    if (!el || this._options.isDisabled) return;

    // hasExternalLink auto-promotes target to "_blank" when no explicit target
    // was provided, so right-click / open-in-new-tab and rel security flags
    // line up with the consumer's intent.
    const effectiveTarget = this._options.hasExternalLink && !this._options.target
      ? '_blank'
      : this._options.target;

    if (effectiveTarget) {
      el.setAttribute('target', effectiveTarget);
      if (effectiveTarget === '_blank') {
        el.setAttribute('rel', 'noopener noreferrer');
      }
    } else {
      el.removeAttribute('target');
      el.removeAttribute('rel');
    }
  }

  private _applyDisabled(state: boolean): void {
    const el = this._element;
    if (!el) return;

    if (state) {
      el.classList.add('is-disabled');
      el.setAttribute('aria-disabled', 'true');
      el.removeAttribute('href');
      el.removeAttribute('target');
      el.removeAttribute('rel');
      el.setAttribute('tabindex', '0');
    } else {
      el.classList.remove('is-disabled');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('tabindex');
      this._applyHref();
      this._applyTarget();
    }
  }

  private _bindEvents(): void {
    this._element?.addEventListener('click', this._boundHandleClick);
  }

  private _handleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this._dispatchEvent('ico-btn-lnk:click', {
      href: this._options.href,
    });

    if (this._options.onClick) {
      this._options.onClick(event);
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

  setHref(href: string): void {
    this._options.href = href;
    this._applyHref();
  }

  setExternalLink(hasExternalLink: boolean): void {
    this._options.hasExternalLink = hasExternalLink;
    this._applyTarget();
  }

  setTooltip(tooltip: IconButtonTooltipOption): void {
    this._options.tooltip = tooltip;
    const tipText = tooltipText(tooltip);
    if (tipText) {
      this._element?.setAttribute('aria-label', tipText);
    } else {
      this._element?.removeAttribute('aria-label');
    }
    if (typeof tooltip === 'string') {
      this._tooltipConnector?.update({ content: tooltip });
    } else {
      this._tooltipConnector?.update({
        content: tooltip.content,
        placement: tooltip.placement,
        shortcut: tooltip.shortcut,
      });
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
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;
    this._applyDisabled(state);
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

    el.classList.remove('arvo-icon-btn', 'is-disabled', 'loading');
    ArvoIconButtonLink.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    ArvoIconButtonLink.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));

    el.removeAttribute('aria-label');
    el.removeAttribute('aria-disabled');
    el.removeAttribute('aria-busy');
    el.removeAttribute('tabindex');
    el.removeAttribute('target');
    el.removeAttribute('rel');

    if (this._originalHref) {
      el.setAttribute('href', this._originalHref);
    }

    this._iconEl?.remove();

    this._tooltipConnector?.destroy();
    this._tooltipConnector = null;

    this._element = null;
    this._iconEl = null;
  }
}
