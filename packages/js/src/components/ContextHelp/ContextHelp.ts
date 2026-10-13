import {
  connectTooltip,
  tooltipManager,
  type TooltipPlacement,
  type TooltipConnector,
} from '@arvo/core';
export interface ArvoContextHelpOptions {
  /** Help text displayed in the tooltip on hover/focus. Required. */
  content: string;
  /** Semantic role of the help icon. Drives glyph and hover rendering strategy. */
  variant?: 'info' | 'question';
  /** Icon size. sm = 14px (default); lg = 16px. */
  size?: 'sm' | 'lg';
  /** Preferred tooltip placement. Collision-aware; flips when the preferred side overflows. */
  placement?: TooltipPlacement;
  /** Override for the trigger's aria-label. Defaults to the content text when omitted. */
  ariaLabel?: string;
  /** Prevents interaction and suppresses tooltip activation. */
  isDisabled?: boolean;
  /** Shows Pattern A shimmer overlay and suppresses tooltip activation while loading. */
  isLoading?: boolean;
  onClick?: (event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

type RequiredContextHelpOptions = Required<
  Omit<ArvoContextHelpOptions, 'onClick' | 'onFocus' | 'onBlur' | 'ariaLabel'>
> & {
  ariaLabel: string | null;
  onClick: ((event: Event) => void) | null;
  onFocus: ((event: FocusEvent) => void) | null;
  onBlur: ((event: FocusEvent) => void) | null;
};

export class ArvoContextHelp {
  private _element: HTMLButtonElement | null;
  private _options: RequiredContextHelpOptions;
  private _iconEl: HTMLSpanElement | null = null;
  private _tooltipConnector: TooltipConnector | null = null;
  private _isHover = false;
  private _isFocused = false;

  private _boundHandleClick: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _boundHandleMouseEnter: () => void;
  private _boundHandleMouseLeave: () => void;
  private _boundHandleFocus: (event: FocusEvent) => void;
  private _boundHandleBlur: (event: FocusEvent) => void;

  static readonly VARIANTS = ['info', 'question'] as const;
  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredContextHelpOptions = {
    content: '',
    variant: 'info',
    size: 'sm',
    placement: 'bottom-center',
    ariaLabel: null,
    isDisabled: false,
    isLoading: false,
    onClick: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(element: HTMLElement, options: ArvoContextHelpOptions): ArvoContextHelp {
    return new ArvoContextHelp(element as HTMLButtonElement, options);
  }

  constructor(element: HTMLButtonElement, options: ArvoContextHelpOptions) {
    if (element.tagName.toLowerCase() !== 'button') {
      console.warn(
        '[ArvoContextHelp] Expected a <button> element but received <%s>. Setting type="button".',
        element.tagName.toLowerCase(),
      );
      element.setAttribute('type', 'button');
    }

    this._element = element;

    const variant = options.variant && (ArvoContextHelp.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoContextHelp.DEFAULTS.variant;

    const size = options.size && (ArvoContextHelp.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoContextHelp.DEFAULTS.size;

    this._options = {
      ...ArvoContextHelp.DEFAULTS,
      ...options,
      variant,
      size,
      ariaLabel: options.ariaLabel ?? null,
      onClick: options.onClick ?? null,
      onFocus: options.onFocus ?? null,
      onBlur: options.onBlur ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleMouseEnter = this._handleMouseEnter.bind(this);
    this._boundHandleMouseLeave = this._handleMouseLeave.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);

    this._render();
    this._bindEvents();
    this._connectTooltip();
  }

  private _blocked(): boolean {
    return this._options.isDisabled || this._options.isLoading;
  }

  private _glyphClass(): string {
    const isActive = (this._isHover || this._isFocused) && !this._blocked();
    if (this._options.variant === 'question') {
      return isActive ? 'o9con-question' : 'o9con-question-circle';
    }
    return isActive ? 'o9con-info-circle-filled' : 'o9con-info-circle';
  }

  private _refreshGlyph(): void {
    const icon = this._iconEl;
    if (!icon) return;

    const allGlyphs = ['o9con-info-circle', 'o9con-info-circle-filled', 'o9con-question-circle', 'o9con-question'];
    allGlyphs.forEach(cls => icon.classList.remove(cls));
    icon.classList.add(this._glyphClass());
  }

  private _connectTooltip(): void {
    if (!this._element || this._blocked()) return;

    this._tooltipConnector = connectTooltip(tooltipManager, {
      anchor: this._element,
      content: this._options.content,
      placement: this._options.placement,
    });
  }

  private _disconnectTooltip(): void {
    this._tooltipConnector?.destroy();
    this._tooltipConnector = null;
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    el.classList.add('arvo-ctx-help');
    el.classList.add(`arvo-ctx-help--${this._options.variant}`);
    el.classList.add(`arvo-ctx-help--${this._options.size}`);
    el.setAttribute('type', 'button');
    el.setAttribute('aria-label', this._options.ariaLabel ?? this._options.content);

    if (this._options.isDisabled) {
      el.disabled = true;
    }

    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    }

    this._iconEl = document.createElement('span');
    this._iconEl.className = `arvo-ctx-help__ico o9con ${this._glyphClass()}`;
    this._iconEl.setAttribute('aria-hidden', 'true');
    el.appendChild(this._iconEl);
  }

  private _bindEvents(): void {
    const el = this._element;
    if (!el) return;

    el.addEventListener('click', this._boundHandleClick);
    el.addEventListener('keydown', this._boundHandleKeydown);
    el.addEventListener('mouseenter', this._boundHandleMouseEnter);
    el.addEventListener('mouseleave', this._boundHandleMouseLeave);
    el.addEventListener('focus', this._boundHandleFocus);
    el.addEventListener('blur', this._boundHandleBlur);
  }

  private _handleClick(event: Event): void {
    if (this._blocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this._options.onClick?.(event);
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (this._blocked() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  private _handleMouseEnter(): void {
    this._isHover = true;
    this._refreshGlyph();
  }

  private _handleMouseLeave(): void {
    this._isHover = false;
    this._refreshGlyph();
  }

  private _handleFocus(event: FocusEvent): void {
    this._isFocused = true;
    this._refreshGlyph();
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: FocusEvent): void {
    this._isFocused = false;
    this._refreshGlyph();
    this._options.onBlur?.(event);
  }

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  setContent(content: string): void {
    this._options.content = content;
    if (!this._options.ariaLabel) {
      this._element?.setAttribute('aria-label', content);
    }
    this._tooltipConnector?.update({ content });
  }

  setVariant(variant: string): void {
    if (!(ArvoContextHelp.VARIANTS as readonly string[]).includes(variant)) return;
    const el = this._element;
    if (!el) return;
    ArvoContextHelp.VARIANTS.forEach(v => el.classList.remove(`arvo-ctx-help--${v}`));
    el.classList.add(`arvo-ctx-help--${variant}`);
    this._options.variant = variant as RequiredContextHelpOptions['variant'];
    this._refreshGlyph();
  }

  setSize(size: string): void {
    if (!(ArvoContextHelp.SIZES as readonly string[]).includes(size)) return;
    const el = this._element;
    if (!el) return;
    ArvoContextHelp.SIZES.forEach(s => el.classList.remove(`arvo-ctx-help--${s}`));
    el.classList.add(`arvo-ctx-help--${size}`);
    this._options.size = size as RequiredContextHelpOptions['size'];
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading;

    if (loading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
      this._disconnectTooltip();
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
      if (!this._options.isDisabled) {
        this._connectTooltip();
      }
    }
    this._refreshGlyph();
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }
    this._options.isDisabled = state;
    if (this._element) {
      this._element.disabled = state;
    }
    if (state) {
      this._disconnectTooltip();
    } else if (!this._options.isLoading) {
      this._connectTooltip();
    }
    this._refreshGlyph();
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
    el.removeEventListener('mouseenter', this._boundHandleMouseEnter);
    el.removeEventListener('mouseleave', this._boundHandleMouseLeave);
    el.removeEventListener('focus', this._boundHandleFocus);
    el.removeEventListener('blur', this._boundHandleBlur);

    el.classList.remove('arvo-ctx-help', 'loading');
    ArvoContextHelp.VARIANTS.forEach(v => el.classList.remove(`arvo-ctx-help--${v}`));
    ArvoContextHelp.SIZES.forEach(s => el.classList.remove(`arvo-ctx-help--${s}`));

    el.removeAttribute('aria-label');
    el.removeAttribute('aria-busy');
    el.disabled = false;

    this._iconEl?.remove();

    this._disconnectTooltip();

    this._element = null;
    this._iconEl = null;
  }
}
