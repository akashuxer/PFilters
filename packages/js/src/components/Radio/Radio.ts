import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';

export interface ArvoRadioOptions {
  value: string;
  name: string;
  label?: string | null;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isChecked?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'lg';
  /**
   * When true, renders a secondary `__desc` line below the label (gated on a
   * non-empty `description` option). Off by default so the standalone control
   * stays single-line; consumers opt into the two-line treatment per-radio.
   */
  hasDescription?: boolean;
  /** Description text rendered below the label when `hasDescription` is true. */
  description?: string | null;
  errorMsg?: string | null;
  onChange?: (detail: { value: string; name: string }) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
}

type RequiredRadioOptions = Required<
  Omit<ArvoRadioOptions, 'onChange' | 'onFocus' | 'onBlur' | 'description' | 'contextHelp'>
> & {
  description: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  onChange: ((detail: { value: string; name: string }) => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
};

let _idCounter = 0;

export class ArvoRadio {
  private _element: HTMLElement | null;
  private _options: RequiredRadioOptions;
  private _inputEl: HTMLInputElement | null = null;
  private _inputWrapperEl: HTMLSpanElement | null = null;
  private _fieldEl: HTMLLabelElement | null = null;
  private _controlEl: HTMLSpanElement | null = null;
  private _textContainerEl: HTMLSpanElement | null = null;
  private _textEl: HTMLSpanElement | null = null;
  private _descEl: HTMLSpanElement | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _inputId: string = '';
  private _errorId: string = '';

  private _boundHandleChange: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;
  private _boundHandleKeydown: (event: Event) => void;

  static readonly DEFAULTS: RequiredRadioOptions = {
    value: '',
    name: '',
    label: null,
    contextHelp: null,
    isChecked: false,
    isDisabled: false,
    isRequired: false,
    isReadOnly: false,
    isInvalid: false,
    isLoading: false,
    size: 'lg' as const,
    hasDescription: false,
    description: null,
    errorMsg: null,
    onChange: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(element: HTMLElement, options?: ArvoRadioOptions): ArvoRadio {
    return new ArvoRadio(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoRadioOptions) {
    this._element = element;

    this._options = {
      ...ArvoRadio.DEFAULTS,
      ...options,
      description: options?.description ?? null,
      contextHelp: options?.contextHelp ?? null,
      onChange: options?.onChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
    };


    this._boundHandleChange = this._handleChange.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._inputId = `arvo-radio-${uid}`;
    this._errorId = `arvo-radio-err-${uid}`;

    const {
      value, name, label, isChecked, isDisabled, isRequired, isReadOnly, isInvalid,
      isLoading, size, hasDescription, description, errorMsg,
    } = this._options;

    const classes = [
      'arvo-radio',
      `arvo-radio--${size}`,
      isLoading && 'loading',
      isDisabled && 'is-disabled',
      isReadOnly && 'is-readonly',
      isInvalid && 'has-error',
    ].filter(Boolean) as string[];

    el.className = classes.join(' ');
    if (isLoading) {
      el.setAttribute('aria-busy', 'true');
    }

    this._fieldEl = document.createElement('label');
    this._fieldEl.className = 'arvo-radio__field';
    this._fieldEl.htmlFor = this._inputId;

    // Input wrapper (top-aligned control container)
    this._inputWrapperEl = document.createElement('span');
    this._inputWrapperEl.className = 'arvo-radio__input-wrapper';

    this._inputEl = document.createElement('input');
    this._inputEl.className = 'arvo-radio__input';
    this._inputEl.type = 'radio';
    this._inputEl.id = this._inputId;
    this._inputEl.name = name;
    this._inputEl.value = value;
    this._inputEl.checked = isChecked;
    this._inputEl.disabled = isDisabled;
    this._inputEl.readOnly = isReadOnly;
    this._inputEl.required = isRequired;
    this._inputEl.tabIndex = isReadOnly ? -1 : 0;
    if (isInvalid) this._inputEl.setAttribute('aria-invalid', 'true');
    if (isRequired) this._inputEl.setAttribute('aria-required', 'true');
    if (isInvalid && errorMsg) this._inputEl.setAttribute('aria-describedby', this._errorId);
    this._inputWrapperEl.appendChild(this._inputEl);

    this._controlEl = document.createElement('span');
    this._controlEl.className = 'arvo-radio__control';
    this._controlEl.setAttribute('aria-hidden', 'true');
    this._inputWrapperEl.appendChild(this._controlEl);

    this._fieldEl.appendChild(this._inputWrapperEl);

    // Text container (label + description). Created lazily so the DOM matches
    // React exactly when neither is set.
    const showDescription = hasDescription && !!description;
    if (label || showDescription) {
      this._textContainerEl = document.createElement('span');
      this._textContainerEl.className = 'arvo-radio__text-container';

      if (label) {
        this._textEl = ArvoFormLabel.initialize(null, {
          text: label,
          as: 'span',
          size: this._options.size ?? 'lg',
          isDisabled,
          isInvalid,
          isRequired,
          contextHelp: this._options.contextHelp,
        }).el as HTMLSpanElement;
        this._textEl.classList.add('arvo-radio__text');
        this._textContainerEl.appendChild(this._textEl);
      }

      if (showDescription) {
        this._descEl = document.createElement('span');
        this._descEl.className = 'arvo-radio__desc';
        this._descEl.textContent = description as string;
        this._textContainerEl.appendChild(this._descEl);
      }

      this._fieldEl.appendChild(this._textContainerEl);
    }

    el.appendChild(this._fieldEl);

    if (isInvalid && errorMsg) {
      this._renderInlineAlert(errorMsg);
    }
  }

  private _bindEvents(): void {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('change', this._boundHandleChange);
    this._inputEl.addEventListener('focus', this._boundHandleFocus);
    this._inputEl.addEventListener('blur', this._boundHandleBlur);
    this._inputEl.addEventListener('keydown', this._boundHandleKeydown);
  }

  private _handleChange(_event: Event): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    this._syncCheckedState(true);
    const { value, name } = this._options;
    this._dispatchEvent('radio:change', { value, name });
    this._options.onChange?.({ value, name });
  }

  private _handleFocus(event: Event): void {
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: Event): void {
    this._options.onBlur?.(event);
  }

  private _handleKeydown(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const ke = event as KeyboardEvent;
    const { key } = ke;

    if (key === ' ') {
      if (!this.checked()) {
        ke.preventDefault();
        this.select();
      }
      return;
    }

    const isNext = key === 'ArrowDown' || key === 'ArrowRight';
    const isPrev = key === 'ArrowUp' || key === 'ArrowLeft';
    if (!isNext && !isPrev) return;

    ke.preventDefault();

    const groupInputs = this._getGroupInputs();
    const currentIndex = groupInputs.indexOf(this._inputEl as HTMLInputElement);
    if (currentIndex === -1) return;

    const total = groupInputs.length;
    let nextIndex = currentIndex;

    for (let i = 1; i < total; i++) {
      const candidate = isNext
        ? (currentIndex + i) % total
        : (currentIndex - i + total) % total;
      const candidateInput = groupInputs[candidate];
      if (!candidateInput.disabled) {
        nextIndex = candidate;
        break;
      }
    }

    if (nextIndex === currentIndex) return;

    const targetInput = groupInputs[nextIndex];
    targetInput.focus();
    targetInput.click();
  }

  private _getGroupInputs(): HTMLInputElement[] {
    const name = this._options.name;
    const escaped = typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(name)
      : name.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    return Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${escaped}"]`)
    );
  }

  private _syncCheckedState(isChecked: boolean): void {
    this._options.isChecked = isChecked;
    if (this._inputEl) this._inputEl.checked = isChecked;
  }

  private _dispatchEvent(eventName: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, cancelable: true, detail })
    );
  }

  private _renderInlineAlert(errorMsg: string): void {
    if (!this._element) return;

    if (this._inlineAlert) {
      this._inlineAlert.message(errorMsg);
      return;
    }

    this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
      type: 'negative',
      message: errorMsg,
      id: this._errorId,
    });
    this._inlineAlertEl = this._inlineAlert.el as HTMLDivElement;
    this._element.appendChild(this._inlineAlertEl);
  }

  private _removeInlineAlert(): void {
    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._inlineAlertEl?.remove();
    this._inlineAlertEl = null;
  }

  private _ensureTextContainer(): HTMLSpanElement {
    if (!this._fieldEl) {
      throw new Error('ArvoRadio: cannot manage label/description before render');
    }
    if (!this._textContainerEl) {
      this._textContainerEl = document.createElement('span');
      this._textContainerEl.className = 'arvo-radio__text-container';
      this._fieldEl.appendChild(this._textContainerEl);
    }
    return this._textContainerEl;
  }

  private _removeTextContainerIfEmpty(): void {
    if (!this._textContainerEl) return;
    if (!this._textEl && !this._descEl) {
      this._textContainerEl.remove();
      this._textContainerEl = null;
    }
  }

  value(): string {
    return this._options.value;
  }

  select(): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    if (this.checked()) return;
    this._syncCheckedState(true);
    const { value, name } = this._options;
    this._dispatchEvent('radio:change', { value, name });
    this._options.onChange?.({ value, name });
  }

  deselect(): void {
    this._syncCheckedState(false);
  }

  checked(): boolean {
    return this._inputEl?.checked ?? this._options.isChecked;
  }

  setTabIndex(index: number): void {
    if (this._inputEl) this._inputEl.tabIndex = index;
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;

    this._options.isDisabled = state;
    if (state) {
      this._element?.classList.add('is-disabled');
    } else {
      this._element?.classList.remove('is-disabled');
    }
    if (this._inputEl) this._inputEl.disabled = state;
  }

  readonly(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isReadOnly;

    this._options.isReadOnly = state;
    if (state) {
      this._element?.classList.add('is-readonly');
      if (this._inputEl) this._inputEl.tabIndex = -1;
    } else {
      this._element?.classList.remove('is-readonly');
      if (this._inputEl) this._inputEl.tabIndex = 0;
    }
  }

  setLabel(label: string | null): void {
    this._options.label = label;

    if (label) {
      if (this._textEl) {
        this._textEl.firstChild!.textContent = label;
      } else {
        const container = this._ensureTextContainer();
        this._textEl = ArvoFormLabel.initialize(null, {
          text: label,
          as: 'span',
          size: this._options.size ?? 'lg',
          isDisabled: this._options.isDisabled,
          isInvalid: this._options.isInvalid,
          isRequired: this._options.isRequired,
          contextHelp: this._options.contextHelp,
        }).el as HTMLSpanElement;
        this._textEl.classList.add('arvo-radio__text');
        // Label always renders before description inside __text-container.
        container.insertBefore(this._textEl, container.firstChild);
      }
    } else {
      this._textEl?.remove();
      this._textEl = null;
      this._removeTextContainerIfEmpty();
    }
  }

  setDescription(description: string | null): void {
    this._options.description = description;
    const shouldShow = this._options.hasDescription && !!description;

    if (shouldShow) {
      if (this._descEl) {
        this._descEl.textContent = description as string;
      } else {
        const container = this._ensureTextContainer();
        this._descEl = document.createElement('span');
        this._descEl.className = 'arvo-radio__desc';
        this._descEl.textContent = description as string;
        container.appendChild(this._descEl);
      }
    } else {
      this._descEl?.remove();
      this._descEl = null;
      this._removeTextContainerIfEmpty();
    }
  }

  setError(messageOrFalse: string | false): void {
    const hasError = messageOrFalse !== false;
    this._options.isInvalid = hasError;

    if (hasError) {
      this._element?.classList.add('has-error');
      if (this._inputEl) this._inputEl.setAttribute('aria-invalid', 'true');

      const errorMsg = (typeof messageOrFalse === 'string' ? messageOrFalse : '') || this._options.errorMsg || '';
      if (errorMsg) {
        this._options.errorMsg = errorMsg;
        if (this._inputEl) this._inputEl.setAttribute('aria-describedby', this._errorId);
        this._renderInlineAlert(errorMsg);
      }
    } else {
      this._element?.classList.remove('has-error');
      if (this._inputEl) {
        this._inputEl.removeAttribute('aria-invalid');
        this._inputEl.removeAttribute('aria-describedby');
      }
      this._removeInlineAlert();
    }
  }

  setLoading(isLoading: boolean): void {
    this._options.isLoading = isLoading;
    if (isLoading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
      if (this._inputEl && document.activeElement === this._inputEl) {
        this._inputEl.blur();
      }
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
    }
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    this._inlineAlert?.destroy();
    this._inlineAlert = null;

    if (this._inputEl) {
      this._inputEl.removeEventListener('change', this._boundHandleChange);
      this._inputEl.removeEventListener('focus', this._boundHandleFocus);
      this._inputEl.removeEventListener('blur', this._boundHandleBlur);
      this._inputEl.removeEventListener('keydown', this._boundHandleKeydown);
    }

    el.classList.remove(
      'arvo-radio',
      'arvo-radio--sm',
      'arvo-radio--lg',
      'is-disabled',
      'is-readonly',
      'has-error',
      'loading'
    );
    el.removeAttribute('aria-busy');

    this._fieldEl?.remove();
    this._inlineAlertEl?.remove();

    this._element = null;
    this._inputEl = null;
    this._inputWrapperEl = null;
    this._fieldEl = null;
    this._controlEl = null;
    this._textContainerEl = null;
    this._textEl = null;
    this._descEl = null;
    this._inlineAlertEl = null;
  }
}
