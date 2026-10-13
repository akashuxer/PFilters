import {
  createCharCounter,
  updateCharCounter,
} from '@arvo/utils';
import { connectTooltip, tooltipManager } from '@arvo/core';
import type { TooltipConnector } from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert, ARVO_MSG_ALERT_DEFAULT_ERROR } from '../MessageAlert/MessageAlert';
export interface ArvoTextareaOptions {
  value?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  label?: string;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isRequired?: boolean;
  isInvalid?: boolean;
  size?: 'sm' | 'lg';
  surface?: 'filled' | 'base';
  icon?: string;
  rows?: number;
  maxLength?: number | null;
  hasCounter?: boolean;
  autoResize?: boolean;
  resizable?: 'none' | 'vertical' | 'both';
  errorMsg?: string;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  /**
   * Shows a clear button (ArvoIconButton, icon `close`) inside the top-right
   * actions overlay whenever the textarea has a value. Unlike the textbox
   * clear button which only appears on hover/focus, the textarea clear
   * button stays visible while a value is present so the text content never
   * shifts as the pointer enters or leaves the field. Suppressed in
   * disabled, readonly, and loading states, and replaced by the in-field
   * error icon when `errorDisplay='tooltip'` and `isInvalid` are both set.
   */
  isClearable?: boolean;
  isLoading?: boolean;
  width?: string;
  isFullWidth?: boolean;
  onInput?: (event: Event) => void;
  onChange?: (event: Event) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

type RequiredTextareaOptions = Required<
  Omit<
    ArvoTextareaOptions,
    | 'onInput'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'onKeyDown'
    | 'label'
    | 'errorMsg'
    | 'maxLength'
    | 'icon'
    | 'width'
    | 'contextHelp'
  >
> & {
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  errorMsg: string | null;
  maxLength: number | null;
  icon: string | null;
  width: string | null;
  onInput: ((event: Event) => void) | null;
  onChange: ((event: Event) => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
  onKeyDown: ((event: KeyboardEvent) => void) | null;
};

let _idCounter = 0;

export class ArvoTextarea {
  private _element: HTMLDivElement | null;
  private _options: RequiredTextareaOptions;
  private _textareaEl: HTMLTextAreaElement | null = null;
  private _fieldEl: HTMLDivElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _borderEl: HTMLDivElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _counterEl: HTMLSpanElement | null = null;
  private _icoEl: HTMLSpanElement | null = null;
  private _clearEl: HTMLButtonElement | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _errIcoEl: HTMLSpanElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _previousValue: string = '';
  private _inputId: string = '';
  private _errorId: string = '';

  private _boundHandleInput: (event: Event) => void;
  private _boundHandleChange: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _boundHandleClearClick: (event: Event) => void;
  private _boundHandleIcoMouseDown: (event: MouseEvent) => void;

  static readonly SIZES = ['sm', 'lg'] as const;
  static readonly SURFACES = ['filled', 'base'] as const;
  static readonly RESIZABLE = ['none', 'vertical', 'both'] as const;

  static readonly DEFAULTS: RequiredTextareaOptions = {
    value: '',
    placeholder: '',
    isDisabled: false,
    isReadOnly: false,
    label: null,
    contextHelp: null,
    isRequired: false,
    isInvalid: false,
    size: 'sm',
    surface: 'filled',
    rows: 3,
    icon: null,
    maxLength: null,
    hasCounter: false,
    autoResize: false,
    resizable: 'none',
    errorMsg: null,
    errorDisplay: 'inline',
    isClearable: false,
    isLoading: false,
    width: null,
    isFullWidth: false,
    onInput: null,
    onChange: null,
    onFocus: null,
    onBlur: null,
    onKeyDown: null,
  };

  static initialize(element: HTMLDivElement, options?: ArvoTextareaOptions): ArvoTextarea {
    return new ArvoTextarea(element, options);
  }

  constructor(element: HTMLDivElement, options?: ArvoTextareaOptions) {
    this._element = element;

    const size =
      options?.size && (ArvoTextarea.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoTextarea.DEFAULTS.size;

    const surface =
      options?.surface && (ArvoTextarea.SURFACES as readonly string[]).includes(options.surface)
        ? options.surface
        : ArvoTextarea.DEFAULTS.surface;

    const resizable =
      options?.resizable && (ArvoTextarea.RESIZABLE as readonly string[]).includes(options.resizable)
        ? options.resizable
        : ArvoTextarea.DEFAULTS.resizable;

    this._options = {
      ...ArvoTextarea.DEFAULTS,
      ...options,
      size,
      surface,
      resizable,
      label: options?.label ?? null,
      contextHelp: options?.contextHelp ?? null,
      errorMsg: options?.errorMsg ?? null,
      maxLength: options?.maxLength ?? null,
      icon: options?.icon ?? null,
      width: options?.width ?? null,
      onInput: options?.onInput ?? null,
      onChange: options?.onChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
      onKeyDown: options?.onKeyDown ?? null,
    };


    this._previousValue = this._options.value;

    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleChange = this._handleChange.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleClearClick = this._handleClearClick.bind(this);
    this._boundHandleIcoMouseDown = this._handleIcoMouseDown.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._inputId = `arvo-textarea-${uid}`;
    this._errorId = `arvo-textarea-err-${uid}`;

    const {
      size, surface, width, isFullWidth, label, contextHelp, isRequired, value, placeholder,
      isDisabled, isReadOnly, rows, maxLength, hasCounter,
      autoResize, resizable, errorDisplay, isInvalid, errorMsg, isLoading, icon,
    } = this._options;

    const useTooltipError = errorDisplay === 'tooltip';
    const useInlineAlert = errorDisplay === 'inline';

    el.classList.add('arvo-textarea', `arvo-textarea--${size}`, `arvo-textarea--surface-${surface}`);
    el.setAttribute('role', 'group');
    if (isFullWidth) el.classList.add('arvo-textarea--full-width');
    if (autoResize) el.classList.add('arvo-textarea--auto-resize');

    // Width (isFullWidth takes precedence)
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
      this._labelEl.classList.add('arvo-textarea__lbl');
      el.appendChild(this._labelEl);
    }

    // Field container
    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-textarea__field';

    // Leading icon
    if (icon) {
      this._icoEl = document.createElement('span');
      this._icoEl.className = `arvo-textarea__ico o9con o9con-${icon}`;
      this._icoEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._icoEl);
    }

    // Native textarea
    this._textareaEl = document.createElement('textarea');
    this._textareaEl.className = 'arvo-textarea__input';
    this._textareaEl.id = this._inputId;
    this._textareaEl.value = value;
    this._textareaEl.rows = rows;
    if (placeholder) this._textareaEl.placeholder = placeholder;
    this._textareaEl.disabled = isDisabled;
    this._textareaEl.readOnly = isReadOnly;
    this._textareaEl.required = isRequired;
    if (maxLength !== null) this._textareaEl.maxLength = maxLength;
    this._textareaEl.style.resize = autoResize ? 'none' : resizable;
    this._fieldEl.appendChild(this._textareaEl);

    // Actions overlay (absolute, top-right) -- always rendered so the
    // shared `form-input-actions-overlay` ResizeObserver has a stable
    // anchor. Contents (clear / err-ico) are added below.
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-textarea__actions';

    // Clear button (ArvoIconButton). Visibility is value-driven and
    // computed up-front, but the button is constructed lazily so the
    // ArvoIconButton DOM only exists when isClearable is true.
    if (this._options.isClearable) {
      this._clearEl = document.createElement('button');
      this._clearBtn = ArvoIconButton.initialize(this._clearEl, {
        size: 'xs',
        variant: 'tertiary',
        icon: 'close',
        tooltip: 'Clear',
        isDisabled: isDisabled || isLoading,
      });
      this._clearEl.setAttribute('aria-label', 'Clear');
      this._clearEl.classList.add('arvo-textarea__clear');
      this._actionsEl.appendChild(this._clearEl);
    }

    if (useTooltipError) {
      const tooltip = errorMsg ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: tooltip,
      });
      this._errIcoEl = this._errMsgAlert.el as HTMLSpanElement;
      this._errIcoEl.classList.add('arvo-textarea__err-ico');
      this._errIcoConnector = connectTooltip(tooltipManager, {
        anchor: this._errIcoEl,
        content: tooltip,
      });
      this._actionsEl.appendChild(this._errIcoEl);
    }

    this._fieldEl.appendChild(this._actionsEl);

    // Bottom border (inside field for correct positioning)
    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-textarea__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    // ResizeObserver: shared form-input-actions-overlay pattern. Writes the
    // measured actions-cluster width back to --arvo-form-input-pad-r on
    // __field so __input padding-right keeps text clear of the overlay.
    this._resizeObserver = new ResizeObserver(() => this._updatePadding());
    this._resizeObserver.observe(this._actionsEl);
    this._updatePadding();

    // Character counter
    if (hasCounter) {
      this._counterEl = createCharCounter({ maxLength });
      this._counterEl.classList.add('arvo-textarea__counter');
      updateCharCounter(this._counterEl, value.length, maxLength);
      el.appendChild(this._counterEl);
    }

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
    if (value.length > 0) el.classList.add('has-value');

    if (isInvalid) {
      this._textareaEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) this._textareaEl.setAttribute('aria-describedby', this._errorId);
    }
    if (isRequired) this._textareaEl.setAttribute('aria-required', 'true');
    if (isLoading) el.setAttribute('aria-busy', 'true');

    if (isInvalid && useInlineAlert && this._inlineAlertEl) {
      this._inlineAlertEl.style.display = '';
      if (this._counterEl) this._counterEl.style.display = 'none';
    }

    // Initial auto-resize
    if (autoResize) {
      requestAnimationFrame(() => this._recalcAutoResize());
    }

    // Lock the resizable textarea's minimum height to the initial
    // rendered height (driven by `rows`) so the user cannot drag the
    // bottom-right corner above the natural starting size. Without this
    // the native browser handle lets the textarea collapse to ~0px.
    // Skipped when auto-resize is on (the textarea grows with content)
    // and when resizable is 'none'.
    if (!autoResize && resizable !== 'none') {
      requestAnimationFrame(() => this._captureMinHeight());
    }
  }

  // Reads the natural rendered height (from the `rows` attribute) and
  // exposes it as `--arvo-textarea-min-height` on the root so the SCSS
  // rule applies a `min-height` to the native <textarea>. Idempotent.
  private _captureMinHeight(): void {
    const el = this._textareaEl;
    const root = this._element;
    if (!el || !root) return;
    const h = el.offsetHeight;
    if (h <= 0) return;
    root.style.setProperty('--arvo-textarea-min-height', `${h}px`);
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    const pad = w > 0 ? w + 4 : 0;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${pad}px`);
  }

  private _bindEvents(): void {
    const textarea = this._textareaEl;
    if (!textarea) return;

    textarea.addEventListener('input', this._boundHandleInput);
    textarea.addEventListener('change', this._boundHandleChange);
    textarea.addEventListener('focus', this._boundHandleFocus);
    textarea.addEventListener('blur', this._boundHandleBlur);
    textarea.addEventListener('keydown', this._boundHandleKeydown as EventListener);

    if (this._icoEl) {
      this._icoEl.addEventListener('mousedown', this._boundHandleIcoMouseDown);
    }
    if (this._clearEl) {
      this._clearEl.addEventListener('click', this._boundHandleClearClick);
    }
  }

  private _handleIcoMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this._textareaEl?.focus();
  }

  private _handleInput(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const value = this._textareaEl?.value ?? '';
    this._element?.classList.toggle('has-value', value.length > 0);

    if (this._counterEl) {
      updateCharCounter(this._counterEl, value.length, this._options.maxLength);
    }

    if (this._options.autoResize) {
      this._recalcAutoResize();
    }

    this._options.onInput?.(event);
  }

  private _handleChange(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const value = this._textareaEl?.value ?? '';
    const previousValue = this._previousValue;
    this._previousValue = value;

    this._dispatchEvent('textarea:change', { value, previousValue });
    this._options.onChange?.(event);
  }

  private _handleFocus(event: Event): void {
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: Event): void {
    this._options.onBlur?.(event);
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      event.key === 'Escape' &&
      this._options.isClearable &&
      !this._options.isReadOnly
    ) {
      const value = this._textareaEl?.value ?? '';
      if (value.length > 0) {
        this.clear();
        return;
      }
    }

    this._options.onKeyDown?.(event);
  }

  private _handleClearClick(): void {
    this.clear();
    this._textareaEl?.focus();
  }

  private _recalcAutoResize(): void {
    const el = this._textareaEl;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = el.scrollHeight > el.clientHeight ? 'auto' : 'hidden';
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail })
    );
  }

  // --- Public Methods ---

  value(): string;
  value(newValue: string): void;
  value(newValue?: string): string | void {
    if (newValue === undefined) {
      return this._textareaEl?.value ?? this._options.value;
    }

    const previousValue = this._previousValue;
    this._previousValue = newValue;
    this._options.value = newValue;

    if (this._textareaEl) {
      this._textareaEl.value = newValue;
    }

    this._element?.classList.toggle('has-value', newValue.length > 0);

    if (this._counterEl) {
      updateCharCounter(this._counterEl, newValue.length, this._options.maxLength);
    }

    if (this._options.autoResize) {
      requestAnimationFrame(() => this._recalcAutoResize());
    }

    this._dispatchEvent('textarea:change', { value: newValue, previousValue });
  }

  clear(): void {
    // Fire BEFORE the value is reset so listeners can still inspect the
    // prior value via the textarea ref if they choose. Mirrors the
    // textbox:clear contract.
    this._dispatchEvent('textarea:clear', {});
    this.value('');
    if (this._options.autoResize) {
      requestAnimationFrame(() => this._recalcAutoResize());
    }
  }

  validate(): { valid: boolean; errors: string[] } {
    const value = this.value();
    const errors: string[] = [];

    if (this._options.isRequired && value.trim().length === 0) {
      errors.push('This field is required');
    }

    if (this._options.maxLength !== null && value.length > this._options.maxLength) {
      errors.push(`Value must not exceed ${this._options.maxLength} characters`);
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

      if (this._textareaEl) {
        this._textareaEl.removeAttribute('aria-invalid');
        this._textareaEl.removeAttribute('aria-describedby');
      }

      if (this._inlineAlertEl) {
        this._inlineAlertEl.style.display = 'none';
      }

      if (this._counterEl && this._options.hasCounter) {
        this._counterEl.style.display = '';
      }

      return;
    }

    const msg = message || ARVO_MSG_ALERT_DEFAULT_ERROR;
    this._options.isInvalid = true;
    this._options.errorMsg = msg;

    this._element?.classList.add('has-error');

    if (this._textareaEl) {
      this._textareaEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) {
        this._textareaEl.setAttribute('aria-describedby', this._errorId);
      }
    }

    if (useTooltipError && this._errIcoEl) {
      this._errMsgAlert?.message(msg);
      if (this._errIcoConnector) {
        this._errIcoConnector.update({ content: msg });
      }
      this._element?.classList.add('error-tooltip');
    }

    if (useInlineAlert && this._inlineAlertEl) {
      this._inlineAlert?.message(msg);
      this._inlineAlertEl.style.display = '';
      if (this._counterEl) this._counterEl.style.display = 'none';
    }
  }

  focus(): void {
    if (!this._options.isDisabled && !this._options.isLoading) {
      this._textareaEl?.focus();
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

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;
    if (state) {
      this._element?.classList.add('is-disabled');
    } else {
      this._element?.classList.remove('is-disabled');
    }
    if (this._textareaEl) {
      this._textareaEl.disabled = state;
    }
    // Propagate to the clear button so it visually reflects the parent
    // state and stays unclickable when the textarea is disabled.
    this._clearBtn?.disabled(state || this._options.isLoading);
  }

  icon(): string | null;
  icon(name: string | null): void;
  icon(name?: string | null): string | null | void {
    if (name === undefined) {
      return this._options.icon;
    }

    this._options.icon = name;

    if (name) {
      if (this._icoEl) {
        this._icoEl.className = `arvo-textarea__ico o9con o9con-${name}`;
      } else {
        this._icoEl = document.createElement('span');
        this._icoEl.className = `arvo-textarea__ico o9con o9con-${name}`;
        this._icoEl.setAttribute('aria-hidden', 'true');
        this._icoEl.addEventListener('mousedown', this._boundHandleIcoMouseDown);
        if (this._fieldEl) {
          this._fieldEl.insertBefore(this._icoEl, this._fieldEl.firstChild);
        }
      }
    } else if (this._icoEl) {
      this._icoEl.removeEventListener('mousedown', this._boundHandleIcoMouseDown);
      this._icoEl.remove();
      this._icoEl = null;
    }
  }

  setLoading(isLoading: boolean): void {
    const wasFocused = document.activeElement === this._textareaEl;
    this._options.isLoading = isLoading;

    if (isLoading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
      this._clearBtn?.disabled(true);
      if (wasFocused) {
        this._textareaEl?.blur();
      }
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
      if (!this._options.isDisabled) {
        this._clearBtn?.disabled(false);
      }
    }
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;

    if (this._textareaEl) {
      this._textareaEl.removeEventListener('input', this._boundHandleInput);
      this._textareaEl.removeEventListener('change', this._boundHandleChange);
      this._textareaEl.removeEventListener('focus', this._boundHandleFocus);
      this._textareaEl.removeEventListener('blur', this._boundHandleBlur);
      this._textareaEl.removeEventListener('keydown', this._boundHandleKeydown as EventListener);
    }

    if (this._icoEl) {
      this._icoEl.removeEventListener('mousedown', this._boundHandleIcoMouseDown);
    }

    this._clearBtn?.destroy();
    if (this._clearEl) {
      this._clearEl.removeEventListener('click', this._boundHandleClearClick);
    }

    el.classList.remove(
      'arvo-textarea',
      'arvo-textarea--full-width',
      'arvo-textarea--auto-resize',
      'is-disabled',
      'is-readonly',
      'has-error',
      'error-tooltip',
      'loading',
      'has-value'
    );
    ArvoTextarea.SIZES.forEach(s => el.classList.remove(`arvo-textarea--${s}`));
    ArvoTextarea.SURFACES.forEach(s => el.classList.remove(`arvo-textarea--surface-${s}`));

    el.removeAttribute('aria-busy');
    el.removeAttribute('role');
    el.style.removeProperty('--arvo-form-input-width');
    el.style.removeProperty('--arvo-textarea-min-height');

    this._labelEl?.remove();
    this._counterEl?.remove();
    this._inlineAlertEl?.remove();
    this._errIcoEl?.remove();
    this._icoEl?.remove();
    this._clearEl?.remove();
    this._actionsEl?.remove();
    this._fieldEl?.remove();
    this._borderEl?.remove();

    this._element = null;
    this._textareaEl = null;
    this._fieldEl = null;
    this._actionsEl = null;
    this._borderEl = null;
    this._labelEl = null;
    this._counterEl = null;
    this._icoEl = null;
    this._clearEl = null;
    this._clearBtn = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;
    this._errIcoEl = null;
    this._inlineAlertEl = null;
  }
}
