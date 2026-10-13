import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';

export interface ArvoCheckboxOptions {
  label?: string | null;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isChecked?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  isExcluded?: boolean;
  size?: 'sm' | 'lg';
  value?: string;
  name?: string;
  /**
   * When true, renders a secondary `__desc` line below the label (gated on a
   * non-empty `description` option). Off by default so the standalone control
   * stays single-line; consumers opt into the two-line treatment per-checkbox.
   */
  hasDescription?: boolean;
  /** Description text rendered below the label when `hasDescription` is true. */
  description?: string | null;
  errorMsg?: string | null;
  errorDisplay?: 'inline' | 'none';
  isLoading?: boolean;
  onChange?: (detail: { isChecked: boolean; value: string }) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
}

type RequiredCheckboxOptions = Required<
  Omit<
    ArvoCheckboxOptions,
    'onChange' | 'onFocus' | 'onBlur' | 'name' | 'label' | 'contextHelp' | 'errorMsg' | 'description'
  >
> & {
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  description: string | null;
  errorMsg: string | null;
  name: string | undefined;
  onChange: ((detail: { isChecked: boolean; value: string }) => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
};

let _idCounter = 0;

const CHECK_SVG_PATH = 'M3.5 8.5L6.5 11.5L12.5 4.5';
const DASH_SVG_PATH = 'M4 8H12';
const SVG_NS = 'http://www.w3.org/2000/svg';

function createCheckboxIcon(kind: 'check' | 'dash'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `arvo-cb__icon arvo-cb__icon--${kind}`);
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', kind === 'check' ? CHECK_SVG_PATH : DASH_SVG_PATH);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  if (kind === 'check') {
    path.setAttribute('stroke-linejoin', 'round');
  }
  svg.appendChild(path);
  return svg;
}

export class ArvoCheckbox {
  private _element: HTMLElement | null;
  private _options: RequiredCheckboxOptions;
  private _inputEl: HTMLInputElement | null = null;
  private _inputWrapperEl: HTMLSpanElement | null = null;
  private _fieldEl: HTMLLabelElement | null = null;
  private _textContainerEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _descEl: HTMLSpanElement | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _inputId: string = '';
  private _errorId: string = '';

  private _boundHandleChange: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;

  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredCheckboxOptions = {
    label: null,
    contextHelp: null,
    isChecked: false,
    isIndeterminate: false,
    isDisabled: false,
    isReadOnly: false,
    isRequired: false,
    isInvalid: false,
    isExcluded: false,
    size: 'lg',
    value: 'on',
    name: undefined,
    hasDescription: false,
    description: null,
    errorMsg: null,
    errorDisplay: 'inline',
    isLoading: false,
    onChange: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(element: HTMLElement, options?: ArvoCheckboxOptions): ArvoCheckbox {
    return new ArvoCheckbox(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoCheckboxOptions) {
    this._element = element;

    const size =
      options?.size && (ArvoCheckbox.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoCheckbox.DEFAULTS.size;

    this._options = {
      ...ArvoCheckbox.DEFAULTS,
      ...options,
      size,
      label: options?.label ?? null,
      contextHelp: options?.contextHelp ?? null,
      description: options?.description ?? null,
      errorMsg: options?.errorMsg ?? null,
      name: options?.name,
      onChange: options?.onChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
    };


    this._boundHandleChange = this._handleChange.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._inputId = `arvo-cb-${uid}`;
    this._errorId = `arvo-cb-err-${uid}`;

    const {
      label, isChecked, isIndeterminate, isDisabled, isReadOnly: isReadonly,
      isRequired, isInvalid, isExcluded, size, value, name, hasDescription, description,
      errorMsg, errorDisplay, isLoading,
    } = this._options;
    const useInlineAlert = errorDisplay === 'inline';

    // Root classes
    el.classList.add('arvo-cb', `arvo-cb--${size}`);

    if (isLoading) el.classList.add('loading');
    if (isDisabled) el.classList.add('is-disabled');
    if (isReadonly) el.classList.add('is-readonly');
    if (isInvalid) el.classList.add('has-error');
    if (isExcluded) el.setAttribute('data-excluded', 'true');
    if (isIndeterminate) el.setAttribute('data-indeterminate', 'true');
    if (isLoading) el.setAttribute('aria-busy', 'true');

    // Field (label element wrapping input-wrapper + text-container)
    this._fieldEl = document.createElement('label');
    this._fieldEl.className = 'arvo-cb__field';

    // Input wrapper (control container, top-aligned with first text line)
    this._inputWrapperEl = document.createElement('span');
    this._inputWrapperEl.className = 'arvo-cb__input-wrapper';

    this._inputEl = document.createElement('input');
    this._inputEl.className = 'arvo-cb__input';
    this._inputEl.type = 'checkbox';
    this._inputEl.id = this._inputId;
    if (name) this._inputEl.name = name;
    this._inputEl.value = value;
    this._inputEl.checked = isChecked;
    this._inputEl.indeterminate = isIndeterminate;
    this._inputEl.disabled = isDisabled;
    this._inputEl.required = isRequired;
    if (isIndeterminate) this._inputEl.setAttribute('data-indeterminate', 'true');
    if (isInvalid) this._inputEl.setAttribute('aria-invalid', 'true');
    if (isRequired) this._inputEl.setAttribute('aria-required', 'true');

    const showAlert = isInvalid && useInlineAlert;
    if (showAlert) {
      this._inputEl.setAttribute('aria-describedby', this._errorId);
    }

    this._inputWrapperEl.appendChild(this._inputEl);
    this._inputWrapperEl.appendChild(createCheckboxIcon('check'));
    this._inputWrapperEl.appendChild(createCheckboxIcon('dash'));

    this._fieldEl.appendChild(this._inputWrapperEl);

    // Text container (label + description). Created lazily so the JSON DOM
    // matches React exactly when neither is set.
    const showDescription = hasDescription && !!description;
    if (label || showDescription) {
      this._textContainerEl = document.createElement('span');
      this._textContainerEl.className = 'arvo-cb__text-container';

      if (label) {
        this._labelEl = ArvoFormLabel.initialize(null, {
          text: label,
          as: 'span',
          size: this._options.size ?? 'lg',
          isDisabled,
          isInvalid,
          isRequired,
          contextHelp: this._options.contextHelp,
        }).el as HTMLSpanElement;
        this._labelEl.classList.add('arvo-cb__lbl');
        this._textContainerEl.appendChild(this._labelEl);
      }

      if (showDescription) {
        this._descEl = document.createElement('span');
        this._descEl.className = 'arvo-cb__desc';
        this._descEl.textContent = description as string;
        this._textContainerEl.appendChild(this._descEl);
      }

      this._fieldEl.appendChild(this._textContainerEl);
    }

    el.appendChild(this._fieldEl);

    if (useInlineAlert) {
      const message = errorMsg || 'Error';
      this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        message,
        id: this._errorId,
      });
      this._inlineAlertEl = this._inlineAlert.el as HTMLDivElement;
      if (!isInvalid) {
        this._inlineAlertEl.style.display = 'none';
      }
      el.appendChild(this._inlineAlertEl);
    }
  }

  private _bindEvents(): void {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('change', this._boundHandleChange);
    this._inputEl.addEventListener('focus', this._boundHandleFocus);
    this._inputEl.addEventListener('blur', this._boundHandleBlur);
  }

  private _handleChange(_event: Event): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    let newChecked: boolean;
    if (this._options.isIndeterminate) {
      newChecked = true;
      this._options.isIndeterminate = false;
      if (this._inputEl) {
        this._inputEl.indeterminate = false;
        this._inputEl.removeAttribute('data-indeterminate');
      }
      this._element?.removeAttribute('data-indeterminate');
    } else {
      newChecked = !this._options.isChecked;
    }

    this._syncCheckedState(newChecked);
    const { value } = this._options;
    this._dispatchEvent('checkbox:change', { isChecked: newChecked, value });
    this._options.onChange?.({ isChecked: newChecked, value });
  }

  private _handleFocus(event: Event): void {
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: Event): void {
    this._options.onBlur?.(event);
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

  private _ensureTextContainer(): HTMLSpanElement {
    if (!this._fieldEl) {
      throw new Error('ArvoCheckbox: cannot manage label/description before render');
    }
    if (!this._textContainerEl) {
      this._textContainerEl = document.createElement('span');
      this._textContainerEl.className = 'arvo-cb__text-container';
      this._fieldEl.appendChild(this._textContainerEl);
    }
    return this._textContainerEl;
  }

  private _removeTextContainerIfEmpty(): void {
    if (!this._textContainerEl) return;
    if (!this._labelEl && !this._descEl) {
      this._textContainerEl.remove();
      this._textContainerEl = null;
    }
  }

  // --- Public Methods ---

  toggle(force?: boolean): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const newChecked = force ?? (this._options.isIndeterminate ? true : !this._options.isChecked);

    if (newChecked === this._options.isChecked && !this._options.isIndeterminate) return;

    if (this._options.isIndeterminate) {
      this._options.isIndeterminate = false;
      if (this._inputEl) {
        this._inputEl.indeterminate = false;
        this._inputEl.removeAttribute('data-indeterminate');
      }
      this._element?.removeAttribute('data-indeterminate');
    }

    this._syncCheckedState(newChecked);
    const { value } = this._options;
    this._dispatchEvent('checkbox:change', { isChecked: newChecked, value });
    this._options.onChange?.({ isChecked: newChecked, value });
  }

  checked(): boolean {
    return this._inputEl?.checked ?? this._options.isChecked;
  }

  indeterminate(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._inputEl?.indeterminate ?? false;
    }
    this._options.isIndeterminate = state;
    if (this._inputEl) {
      this._inputEl.indeterminate = state;
      if (state) {
        this._inputEl.setAttribute('data-indeterminate', 'true');
      } else {
        this._inputEl.removeAttribute('data-indeterminate');
      }
    }
    if (state) {
      this._element?.setAttribute('data-indeterminate', 'true');
    } else {
      this._element?.removeAttribute('data-indeterminate');
    }
  }

  excluded(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isExcluded;
    }
    this._options.isExcluded = state;
    if (state) {
      this._element?.setAttribute('data-excluded', 'true');
    } else {
      this._element?.removeAttribute('data-excluded');
    }
  }

  setLabel(label: string | null): void {
    this._options.label = label;
    if (label) {
      if (this._labelEl) {
        this._labelEl.firstChild!.textContent = label;
      } else {
        const container = this._ensureTextContainer();
        this._labelEl = ArvoFormLabel.initialize(null, {
          text: label,
          as: 'span',
          size: this._options.size ?? 'lg',
          isDisabled: this._options.isDisabled,
          isInvalid: this._options.isInvalid,
          isRequired: this._options.isRequired,
          contextHelp: this._options.contextHelp,
        }).el as HTMLSpanElement;
        this._labelEl.classList.add('arvo-cb__lbl');
        // Label always renders before description inside __text-container.
        container.insertBefore(this._labelEl, container.firstChild);
      }
    } else {
      this._labelEl?.remove();
      this._labelEl = null;
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
        this._descEl.className = 'arvo-cb__desc';
        this._descEl.textContent = description as string;
        container.appendChild(this._descEl);
      }
    } else {
      this._descEl?.remove();
      this._descEl = null;
      this._removeTextContainerIfEmpty();
    }
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }
    this._options.isDisabled = state;
    this._element?.classList.toggle('is-disabled', state);
    if (this._inputEl) this._inputEl.disabled = state;
  }

  readonly(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isReadOnly;
    }
    this._options.isReadOnly = state;
    this._element?.classList.toggle('is-readonly', state);
  }

  setError(messageOrFalse: string | false): void {
    const hasError = messageOrFalse !== false;
    this._options.isInvalid = hasError;

    if (hasError) {
      const msg = messageOrFalse || this._options.errorMsg || 'Error';
      this._options.errorMsg = msg;
      this._element?.classList.add('has-error');

      if (this._inputEl) {
        this._inputEl.setAttribute('aria-invalid', 'true');
      }

      if (this._options.errorDisplay === 'inline') {
        if (this._inlineAlertEl) {
          this._inlineAlert?.message(msg);
          this._inlineAlertEl.style.display = '';
        }
        if (this._inputEl) {
          this._inputEl.setAttribute('aria-describedby', this._errorId);
        }
      }
    } else {
      this._options.errorMsg = null;
      this._element?.classList.remove('has-error');

      if (this._inputEl) {
        this._inputEl.removeAttribute('aria-invalid');
        this._inputEl.removeAttribute('aria-describedby');
      }

      if (this._inlineAlertEl) {
        this._inlineAlertEl.style.display = 'none';
      }
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

  value(): string {
    return this._options.value;
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
    }

    el.classList.remove(
      'arvo-cb',
      'is-disabled',
      'is-readonly',
      'has-error',
      'loading'
    );
    ArvoCheckbox.SIZES.forEach(s => el.classList.remove(`arvo-cb--${s}`));

    el.removeAttribute('aria-busy');
    el.removeAttribute('data-excluded');
    el.removeAttribute('data-indeterminate');

    this._inputEl?.remove();
    this._inputWrapperEl?.remove();
    this._fieldEl?.remove();
    this._textContainerEl?.remove();
    this._labelEl?.remove();
    this._descEl?.remove();
    this._inlineAlertEl?.remove();

    this._element = null;
    this._inputEl = null;
    this._inputWrapperEl = null;
    this._fieldEl = null;
    this._textContainerEl = null;
    this._labelEl = null;
    this._descEl = null;
    this._inlineAlertEl = null;
  }
}
