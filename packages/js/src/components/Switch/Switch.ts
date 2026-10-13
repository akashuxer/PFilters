import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';

export interface ArvoSwitchOptions {
  label?: string | null;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isChecked?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  value?: string;
  name?: string;
  labelPosition?: 'end' | 'start';
  /**
   * Visual size. `lg` (default) is the canonical 28x16 track + 12px thumb;
   * `sm` is a denser 24x14 track + 10px thumb.
   */
  size?: 'sm' | 'lg';
  isLoading?: boolean;
  onChange?: (detail: { isChecked: boolean; value: string }) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
}

type RequiredSwitchOptions = Required<
  Omit<ArvoSwitchOptions, 'onChange' | 'onFocus' | 'onBlur' | 'name' | 'label' | 'contextHelp'>
> & {
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  name: string | undefined;
  onChange: ((detail: { isChecked: boolean; value: string }) => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
};

let _idCounter = 0;

export class ArvoSwitch {
  private _element: HTMLElement | null;
  private _options: RequiredSwitchOptions;
  private _inputEl: HTMLInputElement | null = null;
  private _fieldEl: HTMLLabelElement | null = null;
  private _trackEl: HTMLSpanElement | null = null;
  private _labelEl: HTMLSpanElement | null = null;
  private _labelId: string = '';

  private _boundHandleChange: (event: Event) => void;
  private _boundHandleKeyDown: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;

  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredSwitchOptions = {
    label: null,
    contextHelp: null,
    isChecked: false,
    isDisabled: false,
    isReadOnly: false,
    isRequired: false,
    value: 'on',
    name: undefined,
    labelPosition: 'end',
    size: 'lg',
    isLoading: false,
    onChange: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(element: HTMLElement, options?: ArvoSwitchOptions): ArvoSwitch {
    return new ArvoSwitch(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoSwitchOptions) {
    this._element = element;

    const size = options?.size && (ArvoSwitch.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoSwitch.DEFAULTS.size;

    this._options = {
      ...ArvoSwitch.DEFAULTS,
      ...options,
      size,
      label: options?.label ?? null,
      contextHelp: options?.contextHelp ?? null,
      name: options?.name,
      onChange: options?.onChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
    };


    this._boundHandleChange = this._handleChange.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
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
    const inputId = `arvo-sw-${uid}`;
    this._labelId = `arvo-sw-lbl-${uid}`;

    const {
      label, isChecked, isDisabled, isReadOnly: isReadonly,
      isRequired, value, name, labelPosition, size, isLoading,
    } = this._options;

    el.classList.add('arvo-sw');
    el.classList.add(`arvo-sw--${size}`);

    if (labelPosition === 'start') el.classList.add('arvo-sw--label-start');
    if (isLoading) el.classList.add('loading');
    if (isDisabled) el.classList.add('is-disabled');
    if (isReadonly) el.classList.add('is-readonly');
    if (isLoading) el.setAttribute('aria-busy', 'true');

    // __field
    this._fieldEl = document.createElement('label');
    this._fieldEl.className = 'arvo-sw__field';

    // __input
    this._inputEl = document.createElement('input');
    this._inputEl.className = 'arvo-sw__input';
    this._inputEl.type = 'checkbox';
    this._inputEl.setAttribute('role', 'switch');
    this._inputEl.id = inputId;
    if (name) this._inputEl.name = name;
    this._inputEl.value = value;
    this._inputEl.checked = isChecked;
    this._inputEl.disabled = isDisabled;
    this._inputEl.required = isRequired;
    this._inputEl.setAttribute('aria-checked', String(isChecked));
    if (isRequired) this._inputEl.setAttribute('aria-required', 'true');
    if (label) this._inputEl.setAttribute('aria-labelledby', this._labelId);

    this._fieldEl.appendChild(this._inputEl);

    // __track > __thumb
    this._trackEl = document.createElement('span');
    this._trackEl.className = 'arvo-sw__track';
    this._trackEl.setAttribute('aria-hidden', 'true');

    const thumbEl = document.createElement('span');
    thumbEl.className = 'arvo-sw__thumb';
    this._trackEl.appendChild(thumbEl);

    this._fieldEl.appendChild(this._trackEl);

    // __lbl (optional)
    if (label) {
      this._labelEl = this._createLabelEl(label, isRequired);
      this._fieldEl.appendChild(this._labelEl);
    }

    el.appendChild(this._fieldEl);
  }

  private _createLabelEl(text: string, isRequired: boolean): HTMLSpanElement {
    const { isDisabled, contextHelp } = this._options;
    const lbl = ArvoFormLabel.initialize(null, {
      text,
      as: 'span',
      isRequired,
      isDisabled,
      contextHelp,
    }).el as HTMLSpanElement;
    lbl.classList.add('arvo-sw__lbl');
    lbl.id = this._labelId;
    return lbl;
  }

  private _bindEvents(): void {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('change', this._boundHandleChange);
    this._inputEl.addEventListener('keydown', this._boundHandleKeyDown);
    this._inputEl.addEventListener('focus', this._boundHandleFocus);
    this._inputEl.addEventListener('blur', this._boundHandleBlur);
  }

  private _handleChange(_event: Event): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const newChecked = !this._options.isChecked;
    this._syncCheckedState(newChecked);
    const { value } = this._options;
    this._dispatchEvent('sw:change', { isChecked: newChecked, value });
    this._options.onChange?.({ isChecked: newChecked, value });
  }

  private _handleKeyDown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const newChecked = !this._options.isChecked;
    this._syncCheckedState(newChecked);
    const { value } = this._options;
    this._dispatchEvent('sw:change', { isChecked: newChecked, value });
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
    if (this._inputEl) {
      this._inputEl.checked = isChecked;
      this._inputEl.setAttribute('aria-checked', String(isChecked));
    }
  }

  private _dispatchEvent(eventName: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, cancelable: true, detail })
    );
  }

  // --- Public Methods ---

  toggle(force?: boolean): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const newChecked = force ?? !this._options.isChecked;
    if (newChecked === this._options.isChecked) return;

    this._syncCheckedState(newChecked);
    const { value } = this._options;
    this._dispatchEvent('sw:change', { isChecked: newChecked, value });
    this._options.onChange?.({ isChecked: newChecked, value });
  }

  checked(): boolean {
    return this._inputEl?.checked ?? this._options.isChecked;
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

  setLabel(label: string | null): void {
    this._options.label = label;
    if (label) {
      if (this._labelEl) {
        this._labelEl.remove();
      }
      this._labelEl = this._createLabelEl(label, this._options.isRequired);
      this._fieldEl?.appendChild(this._labelEl);
      this._inputEl?.setAttribute('aria-labelledby', this._labelId);
    } else {
      this._labelEl?.remove();
      this._labelEl = null;
      this._inputEl?.removeAttribute('aria-labelledby');
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

  focus(): void {
    this._inputEl?.focus();
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    if (this._inputEl) {
      this._inputEl.removeEventListener('change', this._boundHandleChange);
      this._inputEl.removeEventListener('keydown', this._boundHandleKeyDown);
      this._inputEl.removeEventListener('focus', this._boundHandleFocus);
      this._inputEl.removeEventListener('blur', this._boundHandleBlur);
    }

    el.classList.remove(
      'arvo-sw',
      'arvo-sw--label-start',
      'is-disabled',
      'is-readonly',
      'loading'
    );
    ArvoSwitch.SIZES.forEach(s => el.classList.remove(`arvo-sw--${s}`));

    el.removeAttribute('aria-busy');

    this._fieldEl?.remove();

    this._element = null;
    this._inputEl = null;
    this._fieldEl = null;
    this._trackEl = null;
    this._labelEl = null;
  }
}
