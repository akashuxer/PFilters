// ArvoButtonLink is label-bearing, so per the design system tooltip standard
// it does NOT expose a tooltip option -- consumers wrap with ArvoTooltip when
// one is needed. ArvoIconButtonLink (icon-only sibling) keeps tooltip because
// the value also drives aria-label.
export interface ArvoButtonLinkOptions {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  href?: string;
  target?: string;
  icon?: string | null;
  hasExternalLink?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  isLoading?: boolean;
  ariaLabel?: string | null;
  onClick?: (event: Event) => void;
}

type RequiredButtonLinkOptions = Required<Omit<ArvoButtonLinkOptions, 'onClick' | 'icon' | 'target' | 'ariaLabel'>> & {
  icon: string | null;
  target: string | null;
  ariaLabel: string | null;
  onClick: ((event: Event) => void) | null;
};

export class ArvoButtonLink {
  private _element: HTMLAnchorElement | null;
  private _options: RequiredButtonLinkOptions;
  private _iconEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _externalIconEl: HTMLSpanElement | null = null;
  private _originalHref: string;
  private _originalContent: string;
  private _boundHandleClick: (event: Event) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'tertiary', 'outline'] as const;
  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredButtonLinkOptions = {
    variant: 'primary',
    size: 'md',
    label: '',
    href: '',
    target: null,
    icon: null,
    hasExternalLink: false,
    isDisabled: false,
    isFullWidth: false,
    isLoading: false,
    ariaLabel: null,
    onClick: null,
  };

  static initialize(element: HTMLAnchorElement, options?: ArvoButtonLinkOptions): ArvoButtonLink {
    return new ArvoButtonLink(element, options);
  }

  constructor(element: HTMLAnchorElement, options?: ArvoButtonLinkOptions) {
    this._element = element;
    this._originalHref = element.getAttribute('href') ?? '';
    this._originalContent = element.textContent?.trim() ?? '';

    const variant = options?.variant && (ArvoButtonLink.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoButtonLink.DEFAULTS.variant;

    const size = options?.size && (ArvoButtonLink.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoButtonLink.DEFAULTS.size;

    this._options = {
      ...ArvoButtonLink.DEFAULTS,
      ...options,
      variant,
      size,
      label: options?.label ?? this._originalContent,
      href: options?.href ?? this._originalHref,
      target: options?.target ?? null,
      icon: options?.icon ?? null,
      ariaLabel: options?.ariaLabel ?? null,
      onClick: options?.onClick ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);

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

    if (this._options.hasExternalLink) {
      this._externalIconEl = this._createExternalIconEl();
      el.appendChild(this._externalIconEl);
    }

    if (this._options.ariaLabel) {
      el.setAttribute('aria-label', this._options.ariaLabel);
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

  private _createExternalIconEl(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'arvo-btn__ico o9con o9con-external-link';
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

    if (this._options.target) {
      el.setAttribute('target', this._options.target);
      if (this._options.target === '_blank') {
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

    this._dispatchEvent('btn-lnk:click', {
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

  setLabel(text: string): void {
    this._options.label = text;
    if (this._labelEl) {
      this._labelEl.textContent = text;
    }
  }

  setHref(href: string): void {
    this._options.href = href;
    this._applyHref();
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
    if (!(ArvoButtonLink.VARIANTS as readonly string[]).includes(variant)) return;

    const el = this._element;
    if (!el) return;

    ArvoButtonLink.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    el.classList.add(`arvo-btn--${variant}`);
    this._options.variant = variant as RequiredButtonLinkOptions['variant'];
  }

  setSize(size: string): void {
    if (!(ArvoButtonLink.SIZES as readonly string[]).includes(size)) return;

    const el = this._element;
    if (!el) return;

    ArvoButtonLink.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));
    el.classList.add(`arvo-btn--${size}`);
    this._options.size = size as RequiredButtonLinkOptions['size'];
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

  setExternalLink(hasExternalLink: boolean): void {
    this._options.hasExternalLink = hasExternalLink;
    const el = this._element;
    if (!el) return;

    if (hasExternalLink) {
      if (!this._externalIconEl) {
        this._externalIconEl = this._createExternalIconEl();
        el.appendChild(this._externalIconEl);
      }
    } else if (this._externalIconEl) {
      this._externalIconEl.remove();
      this._externalIconEl = null;
    }
  }

  setAriaLabel(ariaLabel: string | null): void {
    this._options.ariaLabel = ariaLabel;
    const el = this._element;
    if (!el) return;

    if (ariaLabel) {
      el.setAttribute('aria-label', ariaLabel);
    } else {
      el.removeAttribute('aria-label');
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

    el.classList.remove('arvo-btn', 'arvo-btn--full-width', 'is-disabled', 'loading');
    ArvoButtonLink.VARIANTS.forEach(v => el.classList.remove(`arvo-btn--${v}`));
    ArvoButtonLink.SIZES.forEach(s => el.classList.remove(`arvo-btn--${s}`));

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
    this._labelEl?.remove();
    this._externalIconEl?.remove();

    el.textContent = this._originalContent;

    this._element = null;
    this._iconEl = null;
    this._labelEl = null;
    this._externalIconEl = null;
  }
}
