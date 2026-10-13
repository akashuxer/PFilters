import { connectTooltip, tooltipManager } from '@arvo/core';
import type { TooltipConnector } from '@arvo/core';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert, ARVO_MSG_ALERT_DEFAULT_ERROR } from '../MessageAlert/MessageAlert';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';

/**
 * Payload passed to `ArvoNumberInputOptions.onChange`.
 *
 * Target-independent by design: value changes can originate from stepper
 * buttons, blur clamp, paste, or programmatic `value()` calls, none of which
 * have a real DOM event with a populated `target`. The raw event is still
 * surfaced as the second argument when a DOM event drove the change; it is
 * `null` for programmatic / stepper-driven mutations.
 */
export interface ArvoNumberInputChangePayload {
  /** Resolved numeric value (clamped + step-rounded). Null when input is empty. */
  value: number | null;
  /** Previous value before this change. */
  previousValue: number | null;
  /**
   * What triggered the change.
   * - `'input'`  -- a native `change` event on the inner <input> (user typed + commit / native step).
   * - `'step'`   -- one of the +/- stepper buttons (long-press counts as repeated `'step'`s).
   * - `'blur'`   -- blur clamp normalized an out-of-range value.
   * - `'paste'`  -- paste handler accepted a numeric value.
   * - `'set'`    -- programmatic `instance.value(v)` or other API-driven mutation.
   */
  source: 'input' | 'step' | 'blur' | 'paste' | 'set';
}

export interface ArvoNumberInputOptions {
  value?: number | null;
  min?: number | null;
  max?: number | null;
  step?: number;
  placeholder?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  label?: string | null;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isRequired?: boolean;
  isInvalid?: boolean;
  size?: 'sm' | 'lg';
  surface?: 'filled' | 'base';
  errorMsg?: string | null;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  isLoading?: boolean;
  isFullWidth?: boolean;
  width?: string | null;
  /**
   * Optional static text rendered inside the field at the leading edge
   * (e.g. `"Wk"`, `"Mo"`, `"px"`, `"$"`). Purely cosmetic -- never parsed,
   * never part of the numeric value, never emitted in `number-input:change`.
   * When set, the block gains the `--has-prefix` modifier and a vertical
   * separator (`__prefix-sep`) is rendered between the prefix and the
   * input. Wired through the shared `form-input-affix` pattern (inline
   * flex sibling of `__input`). `aria-hidden`; pointer clicks forward
   * focus to the inner input.
   */
  prefix?: string | null;
  /**
   * Optional tooltip text shown when hovering the prefix element
   * (e.g. show `"Weeks"` when prefix is `"Wk"`). No tooltip when null.
   * Only effective when the `prefix` option is also set.
   */
  prefixTooltip?: string | null;
  /**
   * Optional static text rendered inside the field at the trailing edge
   * after the numeric value and before the stepper cluster (e.g. `"kg"`,
   * `"%"`, `"USD"`). Purely cosmetic -- never parsed, never part of the
   * numeric value, never emitted in events. `aria-hidden`; pointer clicks
   * forward focus to the inner input.
   */
  suffix?: string | null;
  /**
   * Optional tooltip text shown when hovering the suffix element. No
   * tooltip when null. Only effective when the `suffix` option is also set.
   */
  suffixTooltip?: string | null;
  onInput?: ((event: Event) => void) | null;
  /**
   * Fired whenever the resolved numeric value changes (typed input,
   * stepper, blur clamp, paste, programmatic set). The first argument is a
   * typed payload (`ArvoNumberInputChangePayload`); the second argument is
   * the originating DOM event when one exists (`null` for stepper /
   * programmatic / blur-clamp paths).
   */
  onChange?: ((payload: ArvoNumberInputChangePayload, event: Event | null) => void) | null;
  onFocus?: ((event: Event) => void) | null;
  onBlur?: ((event: Event) => void) | null;
}

type RequiredNumberInputOptions = Required<
  Omit<
    ArvoNumberInputOptions,
    | 'onInput'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'label'
    | 'contextHelp'
    | 'errorMsg'
    | 'value'
    | 'min'
    | 'max'
    | 'width'
    | 'prefix'
    | 'prefixTooltip'
    | 'suffix'
    | 'suffixTooltip'
  >
> & {
  value: number | null;
  min: number | null;
  max: number | null;
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  errorMsg: string | null;
  width: string | null;
  prefix: string | null;
  prefixTooltip: string | null;
  suffix: string | null;
  suffixTooltip: string | null;
  onInput: ((event: Event) => void) | null;
  onChange: ((payload: ArvoNumberInputChangePayload, event: Event | null) => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
};

let _idCounter = 0;

function getStepPrecision(step: number): number {
  const str = String(step);
  const dotIndex = str.indexOf('.');
  return dotIndex === -1 ? 0 : str.length - dotIndex - 1;
}

export class ArvoNumberInput {
  private _element: HTMLDivElement | null;
  private _options: RequiredNumberInputOptions;
  private _inputEl: HTMLInputElement | null = null;
  private _fieldEl: HTMLDivElement | null = null;
  private _borderEl: HTMLDivElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _steppersEl: HTMLDivElement | null = null;
  private _incrementBtn: HTMLButtonElement | null = null;
  private _decrementBtn: HTMLButtonElement | null = null;
  private _stepperSepEl: HTMLSpanElement | null = null;
  private _incrementBtnInstance: ArvoIconButton | null = null;
  private _decrementBtnInstance: ArvoIconButton | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _prefixEl: HTMLSpanElement | null = null;
  private _prefixSepEl: HTMLSpanElement | null = null;
  private _prefixConnector: TooltipConnector | null = null;
  private _suffixEl: HTMLSpanElement | null = null;
  private _suffixConnector: TooltipConnector | null = null;
  private _boundHandleAffixMouseDown: (event: MouseEvent) => void;
  private _errIcoEl: HTMLSpanElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _previousValue: number | null = null;
  private _inputId: string = '';
  private _errorId: string = '';

  // Bound handlers
  private _boundHandleInput: (event: Event) => void;
  private _boundHandleChange: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;
  private _boundHandleKeyDown: (event: KeyboardEvent) => void;
  private _boundHandlePaste: (event: ClipboardEvent) => void;
  private _boundHandleIncrementMouseDown: (event: MouseEvent) => void;
  private _boundHandleDecrementMouseDown: (event: MouseEvent) => void;
  private _boundHandleMouseUp: () => void;
  private _boundHandleMouseLeave: () => void;
  private _boundHandleIncrementTouchStart: (event: TouchEvent) => void;
  private _boundHandleDecrementTouchStart: (event: TouchEvent) => void;
  private _boundHandleTouchEnd: () => void;

  // Long-press state
  private _repeatInterval: ReturnType<typeof setInterval> | null = null;
  private _repeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private _repeatAccelTimeout: ReturnType<typeof setTimeout> | null = null;

  static readonly SIZES = ['sm', 'lg'] as const;
  static readonly SURFACES = ['filled', 'base'] as const;

  static readonly DEFAULTS: RequiredNumberInputOptions = {
    value: null,
    min: null,
    max: null,
    step: 1,
    placeholder: '',
    isDisabled: false,
    isReadOnly: false,
    label: null,
    contextHelp: null,
    isRequired: false,
    isInvalid: false,
    size: 'lg',
    surface: 'filled',
    errorMsg: null,
    errorDisplay: 'inline',
    isLoading: false,
    isFullWidth: false,
    width: null,
    prefix: null,
    prefixTooltip: null,
    suffix: null,
    suffixTooltip: null,
    onInput: null,
    onChange: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(element: HTMLDivElement, options?: ArvoNumberInputOptions): ArvoNumberInput {
    return new ArvoNumberInput(element, options);
  }

  constructor(element: HTMLDivElement, options?: ArvoNumberInputOptions) {
    this._element = element;

    const size =
      options?.size && (ArvoNumberInput.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoNumberInput.DEFAULTS.size;

    const surface =
      options?.surface && (ArvoNumberInput.SURFACES as readonly string[]).includes(options.surface)
        ? options.surface
        : ArvoNumberInput.DEFAULTS.surface;

    this._options = {
      ...ArvoNumberInput.DEFAULTS,
      ...options,
      size,
      surface,
      value: options?.value ?? null,
      min: options?.min ?? null,
      max: options?.max ?? null,
      label: options?.label ?? null,
      contextHelp: options?.contextHelp ?? null,
      errorMsg: options?.errorMsg ?? null,
      width: options?.width ?? null,
      prefix: options?.prefix ?? null,
      prefixTooltip: options?.prefixTooltip ?? null,
      suffix: options?.suffix ?? null,
      suffixTooltip: options?.suffixTooltip ?? null,
      onInput: options?.onInput ?? null,
      onChange: options?.onChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
    };


    this._previousValue = this._options.value;

    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleChange = this._handleChange.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandlePaste = this._handlePaste.bind(this);
    this._boundHandleIncrementMouseDown = this._handleIncrementMouseDown.bind(this);
    this._boundHandleDecrementMouseDown = this._handleDecrementMouseDown.bind(this);
    this._boundHandleMouseUp = this._clearRepeat.bind(this);
    this._boundHandleMouseLeave = this._clearRepeat.bind(this);
    this._boundHandleIncrementTouchStart = this._handleIncrementTouchStart.bind(this);
    this._boundHandleDecrementTouchStart = this._handleDecrementTouchStart.bind(this);
    this._boundHandleTouchEnd = this._clearRepeat.bind(this);
    this._boundHandleAffixMouseDown = this._handleAffixMouseDown.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._inputId = `arvo-number-input-${uid}`;
    this._errorId = `arvo-number-input-err-${uid}`;

    const {
      size, surface, isFullWidth, width, label, contextHelp, isRequired, value, placeholder,
      isDisabled, isReadOnly, errorDisplay, isInvalid, errorMsg, isLoading, min, max, step,
      prefix, prefixTooltip, suffix, suffixTooltip,
    } = this._options;

    const useTooltipError = errorDisplay === 'tooltip';
    const useInlineAlert = errorDisplay === 'inline';
    const hasPrefix = typeof prefix === 'string' && prefix.length > 0;
    const hasSuffix = typeof suffix === 'string' && suffix.length > 0;

    el.classList.add('arvo-number-input', `arvo-number-input--${size}`, `arvo-number-input--surface-${surface}`);
    el.setAttribute('role', 'group');
    if (isFullWidth) el.classList.add('arvo-number-input--full-width');
    if (hasPrefix) el.classList.add('arvo-number-input--has-prefix');
    if (hasSuffix) el.classList.add('arvo-number-input--has-suffix');

    const effectiveWidth = isFullWidth ? '100%' : width;
    if (effectiveWidth) {
      el.style.setProperty('--arvo-form-input-width', effectiveWidth);
    }

    // Label -- atomic ArvoFormLabel (defaults to 12px sm, matching React).
    if (label) {
      const lbl = ArvoFormLabel.initialize(null, {
        text: label,
        isRequired,
        for: this._inputId,
        contextHelp,
      });
      this._labelEl = lbl.el as HTMLLabelElement;
      this._labelEl.classList.add('arvo-number-input__lbl');
      el.appendChild(this._labelEl);
    }

    // Field container
    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-number-input__field';

    // Prefix slot + separator (cosmetic, aria-hidden, leading edge of
    // __field). Inline flex siblings of __input, not an absolute overlay.
    if (hasPrefix) {
      this._prefixEl = document.createElement('span');
      this._prefixEl.className = 'arvo-number-input__prefix';
      this._prefixEl.setAttribute('aria-hidden', 'true');
      this._prefixEl.textContent = prefix as string;
      this._fieldEl.appendChild(this._prefixEl);

      this._prefixSepEl = document.createElement('span');
      this._prefixSepEl.className = 'arvo-number-input__prefix-sep';
      this._prefixSepEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._prefixSepEl);

      if (prefixTooltip) {
        this._prefixConnector = connectTooltip(tooltipManager, {
          anchor: this._prefixEl,
          content: prefixTooltip,
        });
      }
    }

    // Native input
    this._inputEl = document.createElement('input');
    this._inputEl.type = 'number';
    this._inputEl.className = 'arvo-number-input__input';
    this._inputEl.id = this._inputId;
    this._inputEl.setAttribute('role', 'spinbutton');
    if (placeholder) this._inputEl.placeholder = placeholder;
    this._inputEl.disabled = isDisabled;
    this._inputEl.readOnly = isReadOnly;
    this._inputEl.required = isRequired;
    if (min !== null) {
      this._inputEl.min = String(min);
      this._inputEl.setAttribute('aria-valuemin', String(min));
    }
    if (max !== null) {
      this._inputEl.max = String(max);
      this._inputEl.setAttribute('aria-valuemax', String(max));
    }
    this._inputEl.step = String(step);

    if (value !== null) {
      const precision = getStepPrecision(step);
      this._inputEl.value = value.toFixed(precision);
      this._inputEl.setAttribute('aria-valuenow', String(value));
    } else {
      this._inputEl.value = '';
      this._inputEl.removeAttribute('aria-valuenow');
    }

    if (isRequired) this._inputEl.setAttribute('aria-required', 'true');
    if (isInvalid) this._inputEl.setAttribute('aria-invalid', 'true');

    this._fieldEl.appendChild(this._inputEl);

    // Suffix slot (cosmetic, aria-hidden, trailing edge of __field, before
    // the absolute actions overlay / stepper cluster).
    if (hasSuffix) {
      this._suffixEl = document.createElement('span');
      this._suffixEl.className = 'arvo-number-input__suffix';
      this._suffixEl.setAttribute('aria-hidden', 'true');
      this._suffixEl.textContent = suffix as string;
      this._fieldEl.appendChild(this._suffixEl);

      if (suffixTooltip) {
        this._suffixConnector = connectTooltip(tooltipManager, {
          anchor: this._suffixEl,
          content: suffixTooltip,
        });
      }
    }

    // Actions container (absolutely positioned for inline error icon)
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-number-input__actions';

    if (useTooltipError && isInvalid) {
      const tooltip = errorMsg ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: tooltip,
      });
      this._errIcoEl = this._errMsgAlert.el as HTMLSpanElement;
      this._errIcoEl.classList.add('arvo-number-input__err-ico');
      this._errIcoConnector = connectTooltip(tooltipManager, {
        anchor: this._errIcoEl,
        content: tooltip,
      });
      this._actionsEl.appendChild(this._errIcoEl);
    }

    this._fieldEl.appendChild(this._actionsEl);

    // Stepper buttons (hidden when readonly, uses ArvoButton for inner composition)
    if (!isReadOnly) {
      this._steppersEl = document.createElement('div');
      this._steppersEl.className = 'arvo-number-input__steppers';

      this._incrementBtn = document.createElement('button');
      this._incrementBtnInstance = ArvoIconButton.initialize(this._incrementBtn, {
        size: 'sm',
        variant: 'tertiary',
        icon: 'plus',
        isDisabled: isDisabled || isLoading,
      });
      this._incrementBtn.setAttribute('aria-label', 'Increment');
      this._incrementBtn.tabIndex = -1;
      this._incrementBtn.classList.add('arvo-number-input__increment-btn');

      this._stepperSepEl = document.createElement('span');
      this._stepperSepEl.className = 'arvo-number-input__stepper-sep';
      this._stepperSepEl.setAttribute('aria-hidden', 'true');

      this._decrementBtn = document.createElement('button');
      this._decrementBtnInstance = ArvoIconButton.initialize(this._decrementBtn, {
        size: 'sm',
        variant: 'tertiary',
        icon: 'minus',
        isDisabled: isDisabled || isLoading,
      });
      this._decrementBtn.setAttribute('aria-label', 'Decrement');
      this._decrementBtn.tabIndex = -1;
      this._decrementBtn.classList.add('arvo-number-input__decrement-btn');

      this._steppersEl.appendChild(this._incrementBtn);
      this._steppersEl.appendChild(this._stepperSepEl);
      this._steppersEl.appendChild(this._decrementBtn);
      this._fieldEl.appendChild(this._steppersEl);
    }

    // Bottom border (inside field for correct positioning)
    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-number-input__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    // ResizeObserver for dynamic right-padding contract on the trailing
    // actions overlay (inline error icon). The prefix + suffix are inline
    // flex siblings of __input, so no leading-padding ResizeObserver is
    // required.
    this._resizeObserver = new ResizeObserver(() => {
      this._updatePadding();
    });
    this._resizeObserver.observe(this._actionsEl);
    this._updatePadding();

    if (useInlineAlert) {
      const message = errorMsg ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        message,
        id: this._errorId,
      });
      this._inlineAlertEl = this._inlineAlert.el as HTMLDivElement;
      this._inlineAlertEl.style.display = 'none';
      el.appendChild(this._inlineAlertEl);
    }

    if (isDisabled) el.classList.add('is-disabled');
    if (isReadOnly) el.classList.add('is-readonly');
    if (isInvalid) el.classList.add('has-error');
    if (isInvalid && useTooltipError) el.classList.add('error-tooltip');
    if (isLoading) el.classList.add('loading');

    if (isLoading) el.setAttribute('aria-busy', 'true');
    if (isInvalid && useInlineAlert) {
      this._inputEl.setAttribute('aria-describedby', this._errorId);
    }

    if (isInvalid && useInlineAlert && this._inlineAlertEl) {
      this._inlineAlertEl.style.display = '';
    }

    this._updateMinMaxClasses(value);
  }

  private _bindEvents(): void {
    const input = this._inputEl;
    if (!input) return;

    input.addEventListener('input', this._boundHandleInput);
    input.addEventListener('change', this._boundHandleChange);
    input.addEventListener('focus', this._boundHandleFocus);
    input.addEventListener('blur', this._boundHandleBlur);
    input.addEventListener('keydown', this._boundHandleKeyDown as EventListener);
    input.addEventListener('paste', this._boundHandlePaste as EventListener);

    if (this._incrementBtn) {
      this._incrementBtn.addEventListener('mousedown', this._boundHandleIncrementMouseDown);
      this._incrementBtn.addEventListener('mouseup', this._boundHandleMouseUp);
      this._incrementBtn.addEventListener('mouseleave', this._boundHandleMouseLeave);
      this._incrementBtn.addEventListener('touchstart', this._boundHandleIncrementTouchStart as EventListener);
      this._incrementBtn.addEventListener('touchend', this._boundHandleTouchEnd);
    }

    if (this._decrementBtn) {
      this._decrementBtn.addEventListener('mousedown', this._boundHandleDecrementMouseDown);
      this._decrementBtn.addEventListener('mouseup', this._boundHandleMouseUp);
      this._decrementBtn.addEventListener('mouseleave', this._boundHandleMouseLeave);
      this._decrementBtn.addEventListener('touchstart', this._boundHandleDecrementTouchStart as EventListener);
      this._decrementBtn.addEventListener('touchend', this._boundHandleTouchEnd);
    }

    // Affix slots forward pointer focus to the inner input via mousedown
    // (preventDefault avoids selecting the non-editable span).
    if (this._prefixEl) {
      this._prefixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._suffixEl) {
      this._suffixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
  }

  private _handleInput(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const raw = this._inputEl?.value ?? '';
    const parsed = raw === '' ? null : parseFloat(raw);
    this._updateMinMaxClasses(parsed);

    if (parsed !== null) {
      this._inputEl?.setAttribute('aria-valuenow', String(parsed));
    } else {
      this._inputEl?.removeAttribute('aria-valuenow');
    }

    this._options.onInput?.(event);
  }

  private _handleChange(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const previousValue = this._previousValue;
    const newValue = this.value() as number | null;
    this._previousValue = newValue;
    this._options.value = newValue;

    this._dispatchEvent('number-input:change', { value: newValue, previousValue });
    this._options.onChange?.(
      { value: newValue, previousValue, source: 'input' },
      event,
    );
  }

  private _handleFocus(event: Event): void {
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: Event): void {
    if (!this._options.isDisabled && !this._options.isLoading && !this._options.isReadOnly) {
      const raw = this._inputEl?.value ?? '';
      if (raw !== '') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          const clamped = this._clamp(parsed);
          const precision = getStepPrecision(this._options.step);
          const formatted = parseFloat(clamped.toFixed(precision));

          if (formatted !== parsed || raw !== clamped.toFixed(precision)) {
            const previousValue = this._previousValue;
            this._previousValue = formatted;
            this._options.value = formatted;

            if (this._inputEl) {
              this._inputEl.value = clamped.toFixed(precision);
              this._inputEl.setAttribute('aria-valuenow', String(formatted));
            }

            this._updateMinMaxClasses(formatted);
            this._dispatchEvent('number-input:change', { value: formatted, previousValue });
            this._options.onChange?.(
              { value: formatted, previousValue, source: 'blur' },
              null,
            );
          }
        }
      }
    }
    this._options.onBlur?.(event);
  }

  private _handlePaste(event: ClipboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const text = event.clipboardData?.getData('text/plain') ?? '';
    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const clamped = this._clamp(parsed);
    const precision = getStepPrecision(this._options.step);
    const formatted = parseFloat(clamped.toFixed(precision));
    const previousValue = this._previousValue;

    this._previousValue = formatted;
    this._options.value = formatted;

    if (this._inputEl) {
      this._inputEl.value = clamped.toFixed(precision);
      this._inputEl.setAttribute('aria-valuenow', String(formatted));
    }

    this._updateMinMaxClasses(formatted);
    this._dispatchEvent('number-input:change', { value: formatted, previousValue });
    this._options.onChange?.(
      { value: formatted, previousValue, source: 'paste' },
      event,
    );
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const { min, max, step } = this._options;
    let handled = false;

    switch (event.key) {
      case 'ArrowUp': {
        const multiplier = event.shiftKey ? 10 : 1;
        this._stepBy(step * multiplier);
        handled = true;
        break;
      }
      case 'ArrowDown': {
        const multiplier = event.shiftKey ? 10 : 1;
        this._stepBy(-step * multiplier);
        handled = true;
        break;
      }
      case 'Home':
        if (min !== null) {
          this._setValueAndNotify(min);
          handled = true;
        }
        break;
      case 'End':
        if (max !== null) {
          this._setValueAndNotify(max);
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  private _handleIncrementMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    event.preventDefault();
    this._startLongPress(true);
  }

  private _handleDecrementMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    event.preventDefault();
    this._startLongPress(false);
  }

  private _handleIncrementTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    this._startLongPress(true);
  }

  private _handleDecrementTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    this._startLongPress(false);
  }

  private _startLongPress(increment: boolean): void {
    const step = increment ? this._options.step : -this._options.step;

    this._stepBy(step);
    this._inputEl?.focus();

    let intervalMs = 200;

    const startRepeat = () => {
      this._repeatInterval = setInterval(() => {
        this._stepBy(step);
      }, intervalMs);

      // Accelerate to 50ms after 1s
      this._repeatAccelTimeout = setTimeout(() => {
        if (this._repeatInterval !== null) {
          clearInterval(this._repeatInterval);
        }
        intervalMs = 50;
        this._repeatInterval = setInterval(() => {
          this._stepBy(step);
        }, intervalMs);
      }, 1000);
    };

    this._repeatTimeout = setTimeout(startRepeat, 400);
  }

  private _clearRepeat(): void {
    if (this._repeatTimeout !== null) {
      clearTimeout(this._repeatTimeout);
      this._repeatTimeout = null;
    }
    if (this._repeatAccelTimeout !== null) {
      clearTimeout(this._repeatAccelTimeout);
      this._repeatAccelTimeout = null;
    }
    if (this._repeatInterval !== null) {
      clearInterval(this._repeatInterval);
      this._repeatInterval = null;
    }
  }

  private _stepBy(delta: number): void {
    const { min, max } = this._options;
    const current = this.value() as number | null;

    let next: number;
    if (current === null) {
      next = delta > 0 ? (min ?? 0) : (max ?? 0);
    } else {
      next = current + delta;
    }

    if (min !== null) next = Math.max(next, min);
    if (max !== null) next = Math.min(next, max);

    this._setValueAndNotify(next);
  }

  private _setValueAndNotify(newValue: number, source: 'step' | 'set' = 'step'): void {
    const previousValue = this._previousValue;
    const precision = getStepPrecision(this._options.step);
    const clamped = this._clamp(newValue);
    const formatted = parseFloat(clamped.toFixed(precision));

    this._previousValue = formatted;
    this._options.value = formatted;

    if (this._inputEl) {
      this._inputEl.value = clamped.toFixed(precision);
      this._inputEl.setAttribute('aria-valuenow', String(formatted));
    }

    this._updateMinMaxClasses(formatted);
    this._dispatchEvent('number-input:change', { value: formatted, previousValue });
    // Pass `null` for the event rather than a synthetic `new Event('change')`
    // with no target -- consumers that read `e.target.value` would crash.
    // The typed payload already carries `value` / `previousValue` / `source`.
    this._options.onChange?.(
      { value: formatted, previousValue, source },
      null,
    );
  }

  private _clamp(value: number): number {
    const { min, max } = this._options;
    let v = value;
    if (min !== null) v = Math.max(v, min);
    if (max !== null) v = Math.min(v, max);
    return v;
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    const pad = w > 0 ? w + 4 : 0;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${pad}px`);

    const steppersWidth = this._steppersEl?.offsetWidth ?? 0;
    this._actionsEl.style.setProperty('inset-inline-end', `${steppersWidth}px`);
  }

  private _handleAffixMouseDown(event: MouseEvent): void {
    // Forward pointer focus to the inner <input> without dragging selection
    // into the non-editable prefix / suffix span. preventDefault prevents
    // the browser from creating a selection inside the affix.
    event.preventDefault();
    this._inputEl?.focus();
  }

  private _updateMinMaxClasses(value: number | null): void {
    const el = this._element;
    if (!el) return;

    const { min, max } = this._options;

    if (min !== null && value !== null && value <= min) {
      el.classList.add('at-min');
      this._decrementBtn?.setAttribute('aria-disabled', 'true');
    } else {
      el.classList.remove('at-min');
      this._decrementBtn?.removeAttribute('aria-disabled');
    }

    if (max !== null && value !== null && value >= max) {
      el.classList.add('at-max');
      this._incrementBtn?.setAttribute('aria-disabled', 'true');
    } else {
      el.classList.remove('at-max');
      this._incrementBtn?.removeAttribute('aria-disabled');
    }
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail })
    );
  }

  // --- Public Methods ---

  value(): number | null;
  value(newValue: number): void;
  value(newValue?: number): number | null | void {
    if (newValue === undefined) {
      const raw = this._inputEl?.value ?? '';
      if (raw === '') return null;
      const parsed = parseFloat(raw);
      return isNaN(parsed) ? null : parsed;
    }

    if (newValue === null || isNaN(newValue as number)) {
      this.clear();
      return;
    }

    const precision = getStepPrecision(this._options.step);
    const clamped = this._clamp(newValue);
    const formatted = parseFloat(clamped.toFixed(precision));
    const previousValue = this._previousValue;

    this._previousValue = formatted;
    this._options.value = formatted;

    if (this._inputEl) {
      this._inputEl.value = clamped.toFixed(precision);
      this._inputEl.setAttribute('aria-valuenow', String(formatted));
    }

    this._updateMinMaxClasses(formatted);
    this._dispatchEvent('number-input:change', { value: formatted, previousValue });
  }

  clear(): void {
    const previousValue = this._previousValue;
    this._previousValue = null;
    this._options.value = null;

    if (this._inputEl) {
      this._inputEl.value = '';
      this._inputEl.removeAttribute('aria-valuenow');
    }

    this._element?.classList.remove('at-min', 'at-max');
    this._decrementBtn?.removeAttribute('aria-disabled');
    this._incrementBtn?.removeAttribute('aria-disabled');

    this._dispatchEvent('number-input:change', { value: null, previousValue });
  }

  validate(): { valid: boolean; errors: string[] } {
    const value = this.value() as number | null;
    const errors: string[] = [];

    if (this._options.isRequired && value === null) {
      errors.push('This field is required');
    }

    if (value !== null) {
      if (this._options.min !== null && value < this._options.min) {
        errors.push(`Value must be at least ${this._options.min}`);
      }
      if (this._options.max !== null && value > this._options.max) {
        errors.push(`Value must be at most ${this._options.max}`);
      }
      if (this._options.step !== 1) {
        const remainder = (value - (this._options.min ?? 0)) % this._options.step;
        if (Math.abs(remainder) > 1e-10) {
          errors.push(`Value must be a multiple of ${this._options.step}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  setError(message: string | false): void {
    const useTooltipError = this._options.errorDisplay === 'tooltip';
    const useInlineAlert = this._options.errorDisplay === 'inline';

    if (message === false) {
      this._options.isInvalid = false;
      this._options.errorMsg = null;

      this._element?.classList.remove('has-error', 'error-tooltip');

      if (this._inputEl) {
        this._inputEl.removeAttribute('aria-invalid');
        this._inputEl.removeAttribute('aria-describedby');
      }

      if (this._errIcoEl) {
        this._errIcoEl.remove();
        this._errIcoConnector?.destroy();
        this._errIcoConnector = null;
        this._errMsgAlert?.destroy();
        this._errMsgAlert = null;
        this._errIcoEl = null;
        this._updatePadding();
      }

      if (this._inlineAlertEl) {
        this._inlineAlertEl.style.display = 'none';
      }
      return;
    }

    const msg = message || ARVO_MSG_ALERT_DEFAULT_ERROR;
    this._options.isInvalid = true;
    this._options.errorMsg = msg;

    this._element?.classList.add('has-error');

    if (this._inputEl) {
      this._inputEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) {
        this._inputEl.setAttribute('aria-describedby', this._errorId);
      }
    }

    if (useTooltipError) {
      if (!this._errIcoEl && this._actionsEl) {
        this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
          type: 'negative',
          isInline: true,
          message: msg,
        });
        this._errIcoEl = this._errMsgAlert.el as HTMLSpanElement;
        this._errIcoEl.classList.add('arvo-number-input__err-ico');
        this._errIcoConnector = connectTooltip(tooltipManager, {
          anchor: this._errIcoEl,
          content: msg,
        });
        this._actionsEl.appendChild(this._errIcoEl);
        this._updatePadding();
      } else if (this._errIcoEl) {
        this._errMsgAlert?.message(msg);
        if (this._errIcoConnector) {
          this._errIcoConnector.update({ content: msg });
        }
      }
      this._element?.classList.add('error-tooltip');
    }

    if (useInlineAlert && this._inlineAlertEl) {
      this._inlineAlert?.message(msg);
      this._inlineAlertEl.style.display = '';
    }
  }

  focus(): void {
    if (!this._options.isDisabled && !this._options.isLoading) {
      this._inputEl?.focus();
    }
  }

  width(): string | null;
  width(value: string): void;
  width(value?: string): string | null | void {
    if (value === undefined) {
      return this._options.width;
    }
    this._options.width = value;
    this._element?.style.setProperty('--arvo-form-input-width', value);
  }

  // ---------------------------------------------------------------------------
  // Affix slot getters/setters (form-input-affix pattern)
  // ---------------------------------------------------------------------------

  suffix(): string | null;
  suffix(value: string | null): void;
  suffix(value?: string | null): string | null | void {
    if (value === undefined) return this._options.suffix;

    const next = value && value.length > 0 ? value : null;
    this._options.suffix = next;
    const el = this._element;

    if (next) {
      el?.classList.add('arvo-number-input--has-suffix');
      if (this._suffixEl) {
        this._suffixEl.textContent = next;
      } else if (this._fieldEl && this._inputEl) {
        this._suffixEl = document.createElement('span');
        this._suffixEl.className = 'arvo-number-input__suffix';
        this._suffixEl.setAttribute('aria-hidden', 'true');
        this._suffixEl.textContent = next;
        this._suffixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
        // Insert immediately after __input so suffix sits before __actions
        // / __steppers in the inline flex flow.
        this._fieldEl.insertBefore(this._suffixEl, this._inputEl.nextSibling);
      }
      if (this._options.suffixTooltip && !this._suffixConnector && this._suffixEl) {
        this._suffixConnector = connectTooltip(tooltipManager, {
          anchor: this._suffixEl,
          content: this._options.suffixTooltip,
        });
      }
    } else {
      el?.classList.remove('arvo-number-input--has-suffix');
      this._suffixConnector?.destroy();
      this._suffixConnector = null;
      if (this._suffixEl) {
        this._suffixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._suffixEl.remove();
        this._suffixEl = null;
      }
    }
  }

  suffixTooltip(): string | null;
  suffixTooltip(text: string | null): void;
  suffixTooltip(text?: string | null): string | null | void {
    if (text === undefined) return this._options.suffixTooltip;

    this._options.suffixTooltip = text && text.length > 0 ? text : null;
    const next = this._options.suffixTooltip;

    if (next && this._suffixEl) {
      if (this._suffixConnector) {
        this._suffixConnector.update({ content: next });
      } else {
        this._suffixConnector = connectTooltip(tooltipManager, {
          anchor: this._suffixEl,
          content: next,
        });
      }
    } else {
      this._suffixConnector?.destroy();
      this._suffixConnector = null;
    }
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;

    if (state) {
      this._element?.classList.add('is-disabled');
      if (this._inputEl) this._inputEl.disabled = true;
      this._incrementBtnInstance?.disabled(true);
      this._decrementBtnInstance?.disabled(true);
    } else {
      this._element?.classList.remove('is-disabled');
      if (this._inputEl) this._inputEl.disabled = false;
      this._incrementBtnInstance?.disabled(false);
      this._decrementBtnInstance?.disabled(false);
    }
  }

  setLoading(isLoading: boolean): void {
    const wasFocused = document.activeElement === this._inputEl;
    this._options.isLoading = isLoading;

    if (isLoading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
      this._incrementBtnInstance?.disabled(true);
      this._decrementBtnInstance?.disabled(true);
      if (wasFocused) {
        this._inputEl?.blur();
      }
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
      if (!this._options.isDisabled) {
        this._incrementBtnInstance?.disabled(false);
        this._decrementBtnInstance?.disabled(false);
      }
    }
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    this._clearRepeat();

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    this._prefixConnector?.destroy();
    this._prefixConnector = null;
    if (this._prefixEl) {
      this._prefixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    this._suffixConnector?.destroy();
    this._suffixConnector = null;
    if (this._suffixEl) {
      this._suffixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }

    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;

    this._incrementBtnInstance?.destroy();
    this._decrementBtnInstance?.destroy();

    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._boundHandleInput);
      this._inputEl.removeEventListener('change', this._boundHandleChange);
      this._inputEl.removeEventListener('focus', this._boundHandleFocus);
      this._inputEl.removeEventListener('blur', this._boundHandleBlur);
      this._inputEl.removeEventListener('keydown', this._boundHandleKeyDown as EventListener);
      this._inputEl.removeEventListener('paste', this._boundHandlePaste as EventListener);
    }

    if (this._incrementBtn) {
      this._incrementBtn.removeEventListener('mousedown', this._boundHandleIncrementMouseDown);
      this._incrementBtn.removeEventListener('mouseup', this._boundHandleMouseUp);
      this._incrementBtn.removeEventListener('mouseleave', this._boundHandleMouseLeave);
      this._incrementBtn.removeEventListener('touchstart', this._boundHandleIncrementTouchStart as EventListener);
      this._incrementBtn.removeEventListener('touchend', this._boundHandleTouchEnd);
    }

    if (this._decrementBtn) {
      this._decrementBtn.removeEventListener('mousedown', this._boundHandleDecrementMouseDown);
      this._decrementBtn.removeEventListener('mouseup', this._boundHandleMouseUp);
      this._decrementBtn.removeEventListener('mouseleave', this._boundHandleMouseLeave);
      this._decrementBtn.removeEventListener('touchstart', this._boundHandleDecrementTouchStart as EventListener);
      this._decrementBtn.removeEventListener('touchend', this._boundHandleTouchEnd);
    }

    el.classList.remove(
      'arvo-number-input',
      'arvo-number-input--full-width',
      'arvo-number-input--has-prefix',
      'arvo-number-input--has-suffix',
      'is-disabled',
      'is-readonly',
      'has-error',
      'error-tooltip',
      'loading',
      'at-min',
      'at-max'
    );
    ArvoNumberInput.SIZES.forEach(s => el.classList.remove(`arvo-number-input--${s}`));
    ArvoNumberInput.SURFACES.forEach(s => el.classList.remove(`arvo-number-input--surface-${s}`));

    el.removeAttribute('aria-busy');
    el.removeAttribute('role');
    el.style.removeProperty('--arvo-form-input-width');

    this._labelEl?.remove();
    this._inlineAlertEl?.remove();
    this._actionsEl?.remove();
    this._errIcoEl?.remove();
    this._prefixEl?.remove();
    this._prefixSepEl?.remove();
    this._suffixEl?.remove();
    this._fieldEl?.remove();
    this._borderEl?.remove();

    this._element = null;
    this._inputEl = null;
    this._fieldEl = null;
    this._actionsEl = null;
    this._borderEl = null;
    this._labelEl = null;
    this._steppersEl = null;
    this._incrementBtn = null;
    this._decrementBtn = null;
    this._incrementBtnInstance = null;
    this._decrementBtnInstance = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;
    this._errIcoEl = null;
    this._inlineAlertEl = null;
    this._prefixEl = null;
    this._prefixSepEl = null;
    this._suffixEl = null;
  }
}
