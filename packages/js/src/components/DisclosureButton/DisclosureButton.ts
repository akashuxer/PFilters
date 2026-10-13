export interface ArvoDisclosureButtonOptions {
  /** Visible button text. Examples: `Show more`, `Show less`, `+4 more`. */
  label?: string;
  /** Selects font, chevron container, and gap tokens. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Initial expanded/collapsed state. After construction the state is mutated
   *  via `expanded(state)` / `toggle(force?)`. Defaults to `false`. */
  isExpanded?: boolean;
  /** Show or hide the built-in trailing chevron. Defaults to `true`. The
   *  glyph is not configurable -- it always renders as `angle-down` and
   *  rotates 180deg via CSS when `isExpanded` is true. */
  hasChevron?: boolean;
  /** Maps to the `aria-controls` HTML attribute. ID of the controlled
   *  content region. */
  ariaControls?: string;
  /** Maps to the `aria-label` HTML attribute. Use when the visible label is a
   *  count shorthand (`+4 more`) and surrounding context does not name the
   *  disclosed content. */
  ariaLabel?: string;
  /** Fired when the user requests a state change via mouse click or
   *  Enter/Space (native button activation). Receives the next `isExpanded`
   *  value. Programmatic mutations via `expanded(state)` do NOT invoke this
   *  callback -- they only emit the `disc-btn:toggle` DOM event. */
  onExpandedChange?: (isExpanded: boolean) => void;
}

type RequiredDisclosureButtonOptions = Required<
  Omit<ArvoDisclosureButtonOptions, 'onExpandedChange' | 'ariaControls' | 'ariaLabel'>
> & {
  ariaControls: string | null;
  ariaLabel: string | null;
  onExpandedChange: ((isExpanded: boolean) => void) | null;
};

export class ArvoDisclosureButton {
  private _element: HTMLButtonElement | null;
  private _options: RequiredDisclosureButtonOptions;
  private _labelEl: HTMLSpanElement | null = null;
  private _chevEl: HTMLSpanElement | null = null;
  private _originalContent: string;
  private _originalType: string | null;
  private _boundHandleClick: (event: Event) => void;

  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredDisclosureButtonOptions = {
    label: '',
    size: 'md',
    isExpanded: false,
    hasChevron: true,
    ariaControls: null,
    ariaLabel: null,
    onExpandedChange: null,
  };

  static initialize(
    element: HTMLButtonElement,
    options?: ArvoDisclosureButtonOptions,
  ): ArvoDisclosureButton {
    return new ArvoDisclosureButton(element, options);
  }

  constructor(element: HTMLButtonElement, options?: ArvoDisclosureButtonOptions) {
    this._element = element;
    this._originalContent = element.textContent ?? '';
    this._originalType = element.getAttribute('type');

    const size =
      options?.size && (ArvoDisclosureButton.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoDisclosureButton.DEFAULTS.size;

    this._options = {
      ...ArvoDisclosureButton.DEFAULTS,
      ...options,
      size,
      label: options?.label ?? this._originalContent.trim(),
      isExpanded: options?.isExpanded ?? ArvoDisclosureButton.DEFAULTS.isExpanded,
      hasChevron: options?.hasChevron ?? ArvoDisclosureButton.DEFAULTS.hasChevron,
      ariaControls: options?.ariaControls ?? null,
      ariaLabel: options?.ariaLabel ?? null,
      onExpandedChange: options?.onExpandedChange ?? null,
    };

    this._boundHandleClick = this._handleClick.bind(this);

    this._render();
    this._bindEvents();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    el.setAttribute('type', 'button');

    el.classList.add('arvo-disc-btn');
    el.classList.add(`arvo-disc-btn--${this._options.size}`);

    el.setAttribute('aria-expanded', this._options.isExpanded ? 'true' : 'false');

    if (this._options.ariaControls) {
      el.setAttribute('aria-controls', this._options.ariaControls);
    }
    if (this._options.ariaLabel) {
      el.setAttribute('aria-label', this._options.ariaLabel);
    }

    this._labelEl = document.createElement('span');
    this._labelEl.className = 'arvo-disc-btn__lbl';
    this._labelEl.textContent = this._options.label;
    el.appendChild(this._labelEl);

    if (this._options.hasChevron) {
      this._chevEl = this._createChevronEl();
      el.appendChild(this._chevEl);
    }
  }

  private _createChevronEl(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'arvo-disc-btn__chev o9con o9con-angle-down';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  private _bindEvents(): void {
    this._element?.addEventListener('click', this._boundHandleClick);
  }

  private _handleClick(_event: Event): void {
    const next = !this._options.isExpanded;
    this._applyExpanded(next);
    this._options.onExpandedChange?.(next);
    this._dispatchEvent('disc-btn:toggle', { isExpanded: next });
  }

  private _applyExpanded(isExpanded: boolean): void {
    this._options.isExpanded = isExpanded;
    this._element?.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
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
   * Dual-purpose getter/setter for the expanded state. Omit `state` to read,
   * pass a boolean to write. Programmatic writes do NOT invoke the
   * `onExpandedChange` consumer callback (they are not user-driven), but the
   * `disc-btn:toggle` DOM event still fires so external listeners stay in sync.
   */
  expanded(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isExpanded;
    }
    if (state === this._options.isExpanded) return;
    this._applyExpanded(state);
    this._dispatchEvent('disc-btn:toggle', { isExpanded: state });
  }

  /**
   * Flip the expanded state, or force it to a target value. Mirrors the
   * user-interaction code path: emits the `disc-btn:toggle` DOM event. Does
   * NOT invoke `onExpandedChange` because it is not user-driven.
   */
  toggle(force?: boolean): void {
    const next = force === undefined ? !this._options.isExpanded : force;
    if (next === this._options.isExpanded) return;
    this._applyExpanded(next);
    this._dispatchEvent('disc-btn:toggle', { isExpanded: next });
  }

  /** Update the visible label text. */
  setLabel(text: string): void {
    this._options.label = text;
    if (this._labelEl) {
      this._labelEl.textContent = text;
    }
  }

  /** Programmatically focus the button. */
  focus(): void {
    this._element?.focus();
  }

  /**
   * Remove the click listener, strip BEM classes and ARIA attributes added
   * during initialize, and restore the element's original text content.
   */
  destroy(): void {
    const el = this._element;
    if (!el) return;

    el.removeEventListener('click', this._boundHandleClick);

    el.classList.remove('arvo-disc-btn');
    ArvoDisclosureButton.SIZES.forEach((s) =>
      el.classList.remove(`arvo-disc-btn--${s}`),
    );

    el.removeAttribute('aria-expanded');
    el.removeAttribute('aria-controls');
    el.removeAttribute('aria-label');

    if (this._originalType === null) {
      el.removeAttribute('type');
    } else {
      el.setAttribute('type', this._originalType);
    }

    this._labelEl?.remove();
    this._chevEl?.remove();

    el.textContent = this._originalContent;

    this._element = null;
    this._labelEl = null;
    this._chevEl = null;
  }
}
