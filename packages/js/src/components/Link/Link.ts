export interface ArvoLinkOptions {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'lg';
  label?: string;
  href?: string;
  target?: string;
  icon?: string | null;
  isExternal?: boolean;
  isDisabled?: boolean;
  isVisited?: boolean;
  isLoading?: boolean;
  onClick?: (event: Event) => void;
}

type RequiredLinkOptions = Required<Omit<ArvoLinkOptions, 'onClick' | 'icon' | 'target'>> & {
  icon: string | null;
  target: string | null;
  onClick: ((event: Event) => void) | null;
};

export class ArvoLink {
  private _element: HTMLAnchorElement | null;
  private _options: RequiredLinkOptions;
  private _iconEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _extEl: HTMLSpanElement | null = null;
  private _originalHref: string;
  private _originalContent: string;
  private _boundHandleClick: (event: Event) => void;
  private _boundHandleKeyDown: (event: KeyboardEvent) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'tertiary'] as const;
  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredLinkOptions = {
    variant: 'primary',
    size: 'lg',
    label: '',
    href: '',
    target: null,
    icon: null,
    isExternal: false,
    isDisabled: false,
    isVisited: true,
    isLoading: false,
    onClick: null,
  };

  static initialize(element: HTMLAnchorElement, options?: ArvoLinkOptions): ArvoLink {
    return new ArvoLink(element, options);
  }

  constructor(element: HTMLAnchorElement, options?: ArvoLinkOptions) {
    this._element = element;
    this._originalHref = element.getAttribute('href') ?? '';
    this._originalContent = element.textContent?.trim() ?? '';

    const variant = options?.variant && (ArvoLink.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoLink.DEFAULTS.variant;

    const size = options?.size && (ArvoLink.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoLink.DEFAULTS.size;

    this._options = {
      ...ArvoLink.DEFAULTS,
      ...options,
      variant,
      size,
      label: options?.label ?? this._originalContent,
      href: options?.href ?? this._originalHref,
      target: options?.target ?? null,
      icon: options?.icon ?? null,
      onClick: options?.onClick ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    el.classList.add('arvo-lnk');
    el.classList.add(`arvo-lnk--${this._options.variant}`);
    el.classList.add(`arvo-lnk--${this._options.size}`);

    if (this._options.icon) {
      this._iconEl = this._createIconEl(this._options.icon);
      el.appendChild(this._iconEl);
    }

    this._labelEl = document.createElement('span');
    this._labelEl.className = 'arvo-lnk__lbl';
    this._labelEl.textContent = this._options.label;
    el.appendChild(this._labelEl);

    if (this._options.isExternal) {
      this._extEl = this._createExtEl();
      el.appendChild(this._extEl);
    }

    this._applyHref();
    this._applyTarget();

    if (this._options.isVisited) {
      el.classList.add('visited');
    }

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
    span.className = `arvo-lnk__ico o9con o9con-${iconName}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  private _createExtEl(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'arvo-lnk__ext o9con o9con-external-link';
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

    const effectiveTarget = this._options.isExternal && !this._options.target
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
    this._element?.addEventListener('keydown', this._boundHandleKeyDown);
  }

  private _handleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this._dispatchEvent('lnk:click', {
      href: this._options.href,
      isExternal: this._options.isExternal,
    });

    if (this._options.onClick) {
      this._options.onClick(event);
    }
  }

  // Anchors normally activate on Enter via a browser-synthesized click, but
  // some embedding environments swallow that synthetic event. Activate
  // explicitly so onClick / lnk:click / navigation always fire, and suppress
  // activation when blocked. preventDefault prevents a double-fire when the
  // browser would have synthesized its own click.
  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.defaultPrevented) return;

    event.preventDefault();
    this._element?.click();
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

  setExternal(isExternal: boolean): void {
    this._options.isExternal = isExternal;

    if (isExternal && !this._extEl) {
      this._extEl = this._createExtEl();
      this._element?.appendChild(this._extEl);
    } else if (!isExternal && this._extEl) {
      this._extEl.remove();
      this._extEl = null;
    }

    this._applyTarget();
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
    el.removeEventListener('keydown', this._boundHandleKeyDown);

    el.classList.remove('arvo-lnk', 'visited', 'is-disabled', 'loading');
    ArvoLink.VARIANTS.forEach(v => el.classList.remove(`arvo-lnk--${v}`));
    ArvoLink.SIZES.forEach(s => el.classList.remove(`arvo-lnk--${s}`));

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
    this._extEl?.remove();

    el.textContent = this._originalContent;

    this._element = null;
    this._iconEl = null;
    this._labelEl = null;
    this._extEl = null;
  }
}
