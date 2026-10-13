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

export type ArvoTextboxType = 'text' | 'url' | 'password' | 'email';

export interface ArvoTextboxOptions {
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
  /**
   * HTML input type. Drives type-specific behavior beyond the native
   * `<input type>`:
   * - `text` (default): standard textbox.
   * - `url`: locks the leading icon to `desktop`; `prefix` configurable.
   * - `email`: locks the leading icon to `envelope-o`.
   * - `password`: renders an eye visibility toggle in the trailing actions
   *   slot; `icon`, `prefix`, `prefixTooltip`, `suffix`, `suffixTooltip`,
   *   and `isClearable` are silently ignored (a dev-only warning fires
   *   when any are passed).
   */
  type?: ArvoTextboxType;
  maxLength?: number | null;
  hasCounter?: boolean;
  errorMsg?: string;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  isClearable?: boolean;
  isLoading?: boolean;
  isFullWidth?: boolean;
  width?: string;
  /**
   * Initial state of the password visibility toggle. Only effective when
   * `type === 'password'`. Defaults to `false` (value hidden). Use the
   * `passwordVisible()` method to read or change after initialization.
   */
  isPasswordVisible?: boolean;
  /**
   * Optional leading icon name (without the `o9con-` prefix) rendered inside
   * `__field` before the prefix / input. 16px square; recolored by parent
   * state through the shared `form-input-affix` pattern.
   */
  icon?: string | null;
  /**
   * Optional static text rendered inside `__field` at the leading edge after
   * `__ico` (e.g. `"https://"`, `"@"`, `"Order #"`). Cosmetic only -- never
   * part of the input value, never parsed, never emitted in `textbox:change`.
   * When set, a vertical separator (`__prefix-sep`) is rendered between the
   * prefix and the input. `aria-hidden` on the prefix; pointer clicks
   * forward focus to the inner input.
   */
  prefix?: string | null;
  /**
   * Optional tooltip text shown when hovering the prefix element. No
   * tooltip when null. Only effective when `prefix` is also set.
   */
  prefixTooltip?: string | null;
  /**
   * Optional static text rendered inside `__field` at the trailing edge
   * after the input (e.g. `".com"`, `"kg"`). Cosmetic only -- never part of
   * the input value, never parsed, never emitted in events. `aria-hidden`;
   * pointer clicks forward focus to the inner input.
   */
  suffix?: string | null;
  /**
   * Optional tooltip text shown when hovering the suffix element. No
   * tooltip when null. Only effective when `suffix` is also set.
   */
  suffixTooltip?: string | null;
  onInput?: (event: Event) => void;
  onChange?: (event: Event) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

type RequiredTextboxOptions = Required<
  Omit<
    ArvoTextboxOptions,
    | 'onInput'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'onKeyDown'
    | 'label'
    | 'errorMsg'
    | 'icon'
    | 'prefix'
    | 'prefixTooltip'
    | 'suffix'
    | 'suffixTooltip'
    | 'maxLength'
    | 'width'
    | 'contextHelp'
  >
> & {
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  errorMsg: string | null;
  icon: string | null;
  prefix: string | null;
  prefixTooltip: string | null;
  suffix: string | null;
  suffixTooltip: string | null;
  maxLength: number | null;
  width: string | null;
  onInput: ((event: Event) => void) | null;
  onChange: ((event: Event) => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
  onKeyDown: ((event: KeyboardEvent) => void) | null;
};

// Type-driven leading icon. The consumer's `icon` option is silently
// overridden for non-text types so url/email always show their type
// glyph and password never shows a leading icon.
function resolveLeadingIcon(
  type: ArvoTextboxType,
  userIcon: string | null,
): string | null {
  if (type === 'password') return null;
  if (type === 'email') return 'envelope-o';
  if (type === 'url') return 'desktop';
  return userIcon;
}

// Dev-only console warnings for type/prop conflicts. Mirrors the React
// twin so JS consumers get the same feedback when they pass affix props
// alongside a type that ignores them.
function warnTypeConflicts(
  type: ArvoTextboxType,
  options: ArvoTextboxOptions | undefined,
): void {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
  if (!options) return;
  if ((type === 'email' || type === 'url' || type === 'password') && options.icon) {
    const locked =
      type === 'password'
        ? 'Password inputs render no leading icon.'
        : `The leading icon is locked to "${type === 'email' ? 'envelope-o' : 'desktop'}".`;
    console.warn(
      `[ArvoTextbox] The "icon" option is ignored when type="${type}". ${locked}`,
    );
  }
  if (type === 'password') {
    const ignored: string[] = [];
    if (options.prefix) ignored.push('prefix');
    if (options.prefixTooltip) ignored.push('prefixTooltip');
    if (options.suffix) ignored.push('suffix');
    if (options.suffixTooltip) ignored.push('suffixTooltip');
    if (options.isClearable) ignored.push('isClearable');
    if (ignored.length > 0) {
      console.warn(
        `[ArvoTextbox] The following options are ignored when type="password": ${ignored.join(', ')}.`,
      );
    }
  }
}

let _idCounter = 0;

export class ArvoTextbox {
  private _element: HTMLDivElement | null;
  private _options: RequiredTextboxOptions;
  private _inputEl: HTMLInputElement | null = null;
  private _fieldEl: HTMLDivElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _borderEl: HTMLDivElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _counterEl: HTMLSpanElement | null = null;
  private _clearEl: HTMLButtonElement | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _errIcoEl: HTMLSpanElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _icoEl: HTMLElement | null = null;
  private _prefixEl: HTMLSpanElement | null = null;
  private _prefixSepEl: HTMLSpanElement | null = null;
  private _suffixEl: HTMLSpanElement | null = null;
  private _prefixConnector: TooltipConnector | null = null;
  private _suffixConnector: TooltipConnector | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _previousValue: string = '';
  private _inputId: string = '';
  private _errorId: string = '';
  private _pwToggleEl: HTMLButtonElement | null = null;
  private _pwToggleBtn: ArvoIconButton | null = null;
  private _isPasswordVisible: boolean = false;

  private _boundHandleInput: (event: Event) => void;
  private _boundHandleChange: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _boundHandleClearClick: (event: Event) => void;
  private _boundHandleAffixMouseDown: (event: MouseEvent) => void;
  private _boundHandlePwToggleClick: (event: Event) => void;

  static readonly SIZES = ['sm', 'lg'] as const;
  static readonly SURFACES = ['filled', 'base'] as const;
  static readonly TYPES = ['text', 'url', 'password', 'email'] as const;

  static readonly DEFAULTS: RequiredTextboxOptions = {
    value: '',
    placeholder: '',
    isDisabled: false,
    isReadOnly: false,
    label: null,
    contextHelp: null,
    isRequired: false,
    isInvalid: false,
    size: 'lg',
    surface: 'filled',
    type: 'text',
    maxLength: null,
    hasCounter: false,
    errorMsg: null,
    errorDisplay: 'inline',
    isClearable: false,
    isLoading: false,
    isFullWidth: false,
    width: null,
    icon: null,
    prefix: null,
    prefixTooltip: null,
    suffix: null,
    suffixTooltip: null,
    isPasswordVisible: false,
    onInput: null,
    onChange: null,
    onFocus: null,
    onBlur: null,
    onKeyDown: null,
  };

  static initialize(element: HTMLDivElement, options?: ArvoTextboxOptions): ArvoTextbox {
    return new ArvoTextbox(element, options);
  }

  constructor(element: HTMLDivElement, options?: ArvoTextboxOptions) {
    this._element = element;

    const size =
      options?.size && (ArvoTextbox.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoTextbox.DEFAULTS.size;

    const surface =
      options?.surface && (ArvoTextbox.SURFACES as readonly string[]).includes(options.surface)
        ? options.surface
        : ArvoTextbox.DEFAULTS.surface;

    const type =
      options?.type && (ArvoTextbox.TYPES as readonly string[]).includes(options.type)
        ? (options.type as ArvoTextboxType)
        : (ArvoTextbox.DEFAULTS.type as ArvoTextboxType);

    warnTypeConflicts(type, options);

    // Type-driven overrides: lock the leading icon for url/email and strip
    // affix/clear options for password. The user-supplied values are
    // recorded as if the consumer had passed the effective values from the
    // start, so subsequent setters / getters operate on the locked state.
    const isPassword = type === 'password';
    const resolvedIcon = resolveLeadingIcon(type, options?.icon ?? null);
    const resolvedPrefix = isPassword ? null : options?.prefix ?? null;
    const resolvedPrefixTooltip = isPassword ? null : options?.prefixTooltip ?? null;
    const resolvedSuffix = isPassword ? null : options?.suffix ?? null;
    const resolvedSuffixTooltip = isPassword ? null : options?.suffixTooltip ?? null;
    const resolvedClearable = isPassword ? false : options?.isClearable ?? ArvoTextbox.DEFAULTS.isClearable;

    this._options = {
      ...ArvoTextbox.DEFAULTS,
      ...options,
      size,
      surface,
      type,
      isClearable: resolvedClearable,
      label: options?.label ?? null,
      contextHelp: options?.contextHelp ?? null,
      errorMsg: options?.errorMsg ?? null,
      icon: resolvedIcon,
      prefix: resolvedPrefix,
      prefixTooltip: resolvedPrefixTooltip,
      suffix: resolvedSuffix,
      suffixTooltip: resolvedSuffixTooltip,
      maxLength: options?.maxLength ?? null,
      width: options?.width ?? null,
      isPasswordVisible: options?.isPasswordVisible ?? ArvoTextbox.DEFAULTS.isPasswordVisible,
      onInput: options?.onInput ?? null,
      onChange: options?.onChange ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
      onKeyDown: options?.onKeyDown ?? null,
    };


    this._isPasswordVisible = isPassword ? this._options.isPasswordVisible : false;
    this._previousValue = this._options.value;

    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleChange = this._handleChange.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleClearClick = this._handleClear.bind(this);
    this._boundHandleAffixMouseDown = this._handleAffixMouseDown.bind(this);
    this._boundHandlePwToggleClick = this._handlePwToggleClick.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._inputId = `arvo-textbox-${uid}`;
    this._errorId = `arvo-textbox-err-${uid}`;

    const { size, surface, isFullWidth, width, label, contextHelp, isRequired, icon, prefix, prefixTooltip,
            suffix, suffixTooltip, type, value, placeholder,
            isDisabled, isReadOnly, maxLength, isClearable, errorDisplay, hasCounter,
            isInvalid, errorMsg, isLoading } = this._options;

    const useTooltipError = errorDisplay === 'tooltip';
    const useInlineAlert = errorDisplay === 'inline';
    const hasPrefix = typeof prefix === 'string' && prefix.length > 0;
    const hasSuffix = typeof suffix === 'string' && suffix.length > 0;

    el.classList.add('arvo-textbox', `arvo-textbox--${size}`, `arvo-textbox--surface-${surface}`);
    el.setAttribute('role', 'group');
    if (isFullWidth) el.classList.add('arvo-textbox--full-width');
    if (hasPrefix) el.classList.add('arvo-textbox--has-prefix');
    if (hasSuffix) el.classList.add('arvo-textbox--has-suffix');

    // Width (fullWidth takes precedence)
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
      this._labelEl.classList.add('arvo-textbox__lbl');
      el.appendChild(this._labelEl);
    }

    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-textbox__field';

    // Affix slots: leading icon -> prefix -> separator, all before the input.
    if (icon) {
      this._icoEl = document.createElement('i');
      this._icoEl.className = `arvo-textbox__ico o9con o9con-${icon}`;
      this._icoEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._icoEl);
    }

    if (hasPrefix) {
      this._prefixEl = document.createElement('span');
      this._prefixEl.className = 'arvo-textbox__prefix';
      this._prefixEl.setAttribute('aria-hidden', 'true');
      this._prefixEl.textContent = prefix as string;
      this._fieldEl.appendChild(this._prefixEl);

      this._prefixSepEl = document.createElement('span');
      this._prefixSepEl.className = 'arvo-textbox__prefix-sep';
      this._prefixSepEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._prefixSepEl);

      if (prefixTooltip) {
        this._prefixConnector = connectTooltip(tooltipManager, {
          anchor: this._prefixEl,
          content: prefixTooltip,
        });
      }
    }

    // Input. For type='password', the native input swaps to 'text' when the
    // visibility toggle is on so the value is human-readable.
    this._inputEl = document.createElement('input');
    this._inputEl.className = 'arvo-textbox__input';
    this._inputEl.id = this._inputId;
    this._inputEl.type = type === 'password' && this._isPasswordVisible ? 'text' : type;
    this._inputEl.value = value;
    if (placeholder) this._inputEl.placeholder = placeholder;
    this._inputEl.disabled = isDisabled;
    this._inputEl.readOnly = isReadOnly;
    this._inputEl.required = isRequired;
    if (maxLength !== null) this._inputEl.maxLength = maxLength;
    this._fieldEl.appendChild(this._inputEl);

    // Actions container (absolutely positioned for clear + error icon)
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-textbox__actions';

    // Clear button (uses ArvoButton for inner component composition).
    // The clear button is in the natural tab order so keyboard users can
    // Tab from the input to the clear control and trigger it with Enter/Space.
    if (isClearable) {
      this._clearEl = document.createElement('button');
      this._clearBtn = ArvoIconButton.initialize(this._clearEl, {
        size: 'xs',
        variant: 'tertiary',
        icon: 'close',
        tooltip: 'Clear',
        isDisabled: isDisabled || isLoading,
      });
      this._clearEl.setAttribute('aria-label', 'Clear');
      this._clearEl.classList.add('arvo-textbox__clear');
      this._actionsEl.appendChild(this._clearEl);
    }

    // Password visibility toggle. Always present while type='password';
    // clicking flips the native input type between 'password' and 'text' and
    // swaps the icon between o9con-eye (hidden) and o9con-eye-slash (visible).
    if (type === 'password') {
      const visibleLabel = this._isPasswordVisible ? 'Hide password' : 'Show password';
      this._pwToggleEl = document.createElement('button');
      this._pwToggleBtn = ArvoIconButton.initialize(this._pwToggleEl, {
        size: 'sm',
        variant: 'tertiary',
        icon: this._isPasswordVisible ? 'eye-slash' : 'eye',
        tooltip: visibleLabel,
        isDisabled: isDisabled || isLoading,
      });
      this._pwToggleEl.setAttribute('aria-label', visibleLabel);
      this._pwToggleEl.setAttribute('aria-pressed', this._isPasswordVisible ? 'true' : 'false');
      this._pwToggleEl.classList.add('arvo-textbox__pw-toggle');
      this._actionsEl.appendChild(this._pwToggleEl);
    }

    if (useTooltipError) {
      const tooltip = errorMsg ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: tooltip,
      });
      this._errIcoEl = this._errMsgAlert.el as HTMLSpanElement;
      this._errIcoEl.classList.add('arvo-textbox__err-ico');
      this._errIcoConnector = connectTooltip(tooltipManager, {
        anchor: this._errIcoEl,
        content: tooltip,
      });
      this._actionsEl.appendChild(this._errIcoEl);
    }

    this._fieldEl.appendChild(this._actionsEl);

    if (hasSuffix) {
      this._suffixEl = document.createElement('span');
      this._suffixEl.className = 'arvo-textbox__suffix';
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

    // Bottom border (inside field for correct absolute positioning)
    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-textbox__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    this._resizeObserver = new ResizeObserver(() => {
      this._updatePadding();
    });
    this._resizeObserver.observe(this._actionsEl);
    this._updatePadding();

    if (hasCounter) {
      this._counterEl = createCharCounter({ maxLength });
      this._counterEl.classList.add('arvo-textbox__counter');
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
      this._inputEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) this._inputEl.setAttribute('aria-describedby', this._errorId);
    }
    if (isRequired) this._inputEl.setAttribute('aria-required', 'true');
    if (isLoading) el.setAttribute('aria-busy', 'true');

    if (isInvalid && useInlineAlert && this._inlineAlertEl) {
      this._inlineAlertEl.style.display = '';
      if (this._counterEl) this._counterEl.style.display = 'none';
    }
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    const pad = w > 0 ? w + 4 : 0;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${pad}px`);
  }

  private _bindEvents(): void {
    const input = this._inputEl;
    if (!input) return;

    input.addEventListener('input', this._boundHandleInput);
    input.addEventListener('change', this._boundHandleChange);
    input.addEventListener('focus', this._boundHandleFocus);
    input.addEventListener('blur', this._boundHandleBlur);
    input.addEventListener('keydown', this._boundHandleKeydown as EventListener);

    if (this._clearEl) {
      this._clearEl.addEventListener('click', this._boundHandleClearClick);
    }

    if (this._pwToggleEl) {
      this._pwToggleEl.addEventListener('click', this._boundHandlePwToggleClick);
    }

    // Affix slots forward pointer focus to the inner input via mousedown
    // (preventDefault avoids selecting / placing a caret in the non-editable
    // span). Same handler for icon / prefix / suffix.
    if (this._icoEl) {
      this._icoEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._prefixEl) {
      this._prefixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._suffixEl) {
      this._suffixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
  }

  private _handleInput(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const value = this._inputEl?.value ?? '';
    this._element?.classList.toggle('has-value', value.length > 0);

    if (this._counterEl) {
      updateCharCounter(this._counterEl, value.length, this._options.maxLength);
    }

    this._options.onInput?.(event);
  }

  private _handleChange(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const value = this._inputEl?.value ?? '';
    const previousValue = this._previousValue;
    this._previousValue = value;

    this._dispatchEvent('textbox:change', { value, previousValue });
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

    if (event.key === 'Escape' && this._options.isClearable) {
      const value = this._inputEl?.value ?? '';
      if (value.length > 0) {
        this.clear();
        return;
      }
    }

    this._options.onKeyDown?.(event);
  }

  private _handleClear(): void {
    this.clear();
    this._inputEl?.focus();
  }

  private _handlePwToggleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.passwordVisible(!this._isPasswordVisible);
  }

  private _handleAffixMouseDown(event: MouseEvent): void {
    // Forward pointer focus to the inner <input> without letting the
    // browser create a selection inside the non-editable affix span.
    event.preventDefault();
    this._inputEl?.focus();
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
      return this._inputEl?.value ?? this._options.value;
    }

    const previousValue = this._previousValue;
    this._previousValue = newValue;
    this._options.value = newValue;

    if (this._inputEl) {
      this._inputEl.value = newValue;
    }

    this._element?.classList.toggle('has-value', newValue.length > 0);

    if (this._counterEl) {
      updateCharCounter(this._counterEl, newValue.length, this._options.maxLength);
    }

    this._dispatchEvent('textbox:change', { value: newValue, previousValue });
  }

  clear(): void {
    this._dispatchEvent('textbox:clear', {});
    this.value('');
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

    const type = this._options.type;
    if (value.length > 0) {
      if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push('Enter a valid email address');
      } else if (type === 'url' && !/^https?:\/\/.+/.test(value)) {
        errors.push('Enter a valid URL');
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

    if (this._inputEl) {
      this._inputEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) {
        this._inputEl.setAttribute('aria-describedby', this._errorId);
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

  // Dual-purpose getter/setter for the password visibility toggle.
  // Returns the current state when called with no argument. When called
  // with a boolean, flips the underlying input type between 'password' and
  // 'text', updates the eye icon + tooltip + aria-pressed, and fires the
  // documented `textbox:password-visibility` CustomEvent. No-op when
  // `type` is not 'password'.
  passwordVisible(): boolean;
  passwordVisible(value: boolean): void;
  passwordVisible(value?: boolean): boolean | void {
    if (value === undefined) {
      return this._isPasswordVisible;
    }
    if (this._options.type !== 'password') return;

    const next = !!value;
    if (next === this._isPasswordVisible) return;

    this._isPasswordVisible = next;
    this._options.isPasswordVisible = next;

    if (this._inputEl) {
      this._inputEl.type = next ? 'text' : 'password';
    }

    if (this._pwToggleBtn && this._pwToggleEl) {
      const label = next ? 'Hide password' : 'Show password';
      this._pwToggleBtn.setIcon(next ? 'eye-slash' : 'eye');
      this._pwToggleBtn.setTooltip(label);
      this._pwToggleEl.setAttribute('aria-label', label);
      this._pwToggleEl.setAttribute('aria-pressed', next ? 'true' : 'false');
    }

    this._dispatchEvent('textbox:password-visibility', { visible: next });
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
      this._clearBtn?.disabled(true);
      this._pwToggleBtn?.disabled(true);
    } else {
      this._element?.classList.remove('is-disabled');
      if (this._inputEl) this._inputEl.disabled = false;
      this._clearBtn?.disabled(false);
      this._pwToggleBtn?.disabled(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Affix slot getters/setters (form-input-affix pattern)
  //
  // Each method follows the dual-purpose contract: call with no argument to
  // read the current value, or with a string / null to set / remove the
  // slot. Setting to null (or an empty string for prefix/suffix) removes the
  // slot element and any wired tooltip connector.
  // ---------------------------------------------------------------------------

  icon(): string | null;
  icon(name: string | null): void;
  icon(name?: string | null): string | null | void {
    if (name === undefined) return this._options.icon;

    // Locked: url/email/password override any consumer-set icon. The
    // initial render already pinned the right value; we no-op the setter
    // so the contract stays consistent at runtime too.
    if (this._options.type === 'url' || this._options.type === 'email' || this._options.type === 'password') {
      return;
    }

    this._options.icon = name && name.length > 0 ? name : null;
    const next = this._options.icon;

    if (next) {
      if (this._icoEl) {
        this._icoEl.className = `arvo-textbox__ico o9con o9con-${next}`;
      } else if (this._fieldEl) {
        this._icoEl = document.createElement('i');
        this._icoEl.className = `arvo-textbox__ico o9con o9con-${next}`;
        this._icoEl.setAttribute('aria-hidden', 'true');
        this._icoEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._fieldEl.insertBefore(this._icoEl, this._fieldEl.firstChild);
      }
    } else if (this._icoEl) {
      this._icoEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
      this._icoEl.remove();
      this._icoEl = null;
    }
  }

  prefix(): string | null;
  prefix(value: string | null): void;
  prefix(value?: string | null): string | null | void {
    if (value === undefined) return this._options.prefix;

    // Password is strict: no leading prefix allowed. The setter is a no-op
    // so the runtime contract matches the construction-time contract.
    if (this._options.type === 'password') return;

    const next = value && value.length > 0 ? value : null;
    this._options.prefix = next;
    const el = this._element;

    if (next) {
      el?.classList.add('arvo-textbox--has-prefix');
      if (this._prefixEl) {
        this._prefixEl.textContent = next;
      } else if (this._fieldEl) {
        // Insert __prefix + __prefix-sep right after __ico if present,
        // otherwise as the first children of __field.
        const anchor = this._icoEl
          ? this._icoEl.nextSibling
          : this._fieldEl.firstChild;

        this._prefixEl = document.createElement('span');
        this._prefixEl.className = 'arvo-textbox__prefix';
        this._prefixEl.setAttribute('aria-hidden', 'true');
        this._prefixEl.textContent = next;
        this._prefixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._fieldEl.insertBefore(this._prefixEl, anchor);

        this._prefixSepEl = document.createElement('span');
        this._prefixSepEl.className = 'arvo-textbox__prefix-sep';
        this._prefixSepEl.setAttribute('aria-hidden', 'true');
        this._fieldEl.insertBefore(this._prefixSepEl, anchor);
      }
      if (this._options.prefixTooltip && !this._prefixConnector && this._prefixEl) {
        this._prefixConnector = connectTooltip(tooltipManager, {
          anchor: this._prefixEl,
          content: this._options.prefixTooltip,
        });
      }
    } else {
      el?.classList.remove('arvo-textbox--has-prefix');
      this._prefixConnector?.destroy();
      this._prefixConnector = null;
      if (this._prefixEl) {
        this._prefixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._prefixEl.remove();
        this._prefixEl = null;
      }
      this._prefixSepEl?.remove();
      this._prefixSepEl = null;
    }
  }

  suffix(): string | null;
  suffix(value: string | null): void;
  suffix(value?: string | null): string | null | void {
    if (value === undefined) return this._options.suffix;

    // Password is strict: no trailing suffix allowed.
    if (this._options.type === 'password') return;

    const next = value && value.length > 0 ? value : null;
    this._options.suffix = next;
    const el = this._element;

    if (next) {
      el?.classList.add('arvo-textbox--has-suffix');
      if (this._suffixEl) {
        this._suffixEl.textContent = next;
      } else if (this._fieldEl) {
        // Suffix sits after __actions and before __border.
        this._suffixEl = document.createElement('span');
        this._suffixEl.className = 'arvo-textbox__suffix';
        this._suffixEl.setAttribute('aria-hidden', 'true');
        this._suffixEl.textContent = next;
        this._suffixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._fieldEl.insertBefore(this._suffixEl, this._borderEl);
      }
      if (this._options.suffixTooltip && !this._suffixConnector && this._suffixEl) {
        this._suffixConnector = connectTooltip(tooltipManager, {
          anchor: this._suffixEl,
          content: this._options.suffixTooltip,
        });
      }
    } else {
      el?.classList.remove('arvo-textbox--has-suffix');
      this._suffixConnector?.destroy();
      this._suffixConnector = null;
      if (this._suffixEl) {
        this._suffixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._suffixEl.remove();
        this._suffixEl = null;
      }
    }
  }

  setLoading(isLoading: boolean): void {
    const wasFocused = document.activeElement === this._inputEl;
    this._options.isLoading = isLoading;

    if (isLoading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
      this._clearBtn?.disabled(true);
      this._pwToggleBtn?.disabled(true);
      if (wasFocused) {
        this._inputEl?.blur();
      }
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
      if (!this._options.isDisabled) {
        this._clearBtn?.disabled(false);
        this._pwToggleBtn?.disabled(false);
      }
    }
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._boundHandleInput);
      this._inputEl.removeEventListener('change', this._boundHandleChange);
      this._inputEl.removeEventListener('focus', this._boundHandleFocus);
      this._inputEl.removeEventListener('blur', this._boundHandleBlur);
      this._inputEl.removeEventListener('keydown', this._boundHandleKeydown as EventListener);
    }

    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;

    this._clearBtn?.destroy();
    this._pwToggleBtn?.destroy();

    if (this._clearEl) {
      this._clearEl.removeEventListener('click', this._boundHandleClearClick);
    }

    if (this._pwToggleEl) {
      this._pwToggleEl.removeEventListener('click', this._boundHandlePwToggleClick);
    }

    if (this._icoEl) {
      this._icoEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._prefixEl) {
      this._prefixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._suffixEl) {
      this._suffixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    this._prefixConnector?.destroy();
    this._prefixConnector = null;
    this._suffixConnector?.destroy();
    this._suffixConnector = null;

    el.classList.remove(
      'arvo-textbox',
      'arvo-textbox--full-width',
      'arvo-textbox--has-prefix',
      'arvo-textbox--has-suffix',
      'is-disabled',
      'is-readonly',
      'has-error',
      'error-tooltip',
      'loading',
      'has-value'
    );
    ArvoTextbox.SIZES.forEach(s => el.classList.remove(`arvo-textbox--${s}`));
    ArvoTextbox.SURFACES.forEach(s => el.classList.remove(`arvo-textbox--surface-${s}`));

    el.removeAttribute('aria-busy');
    el.removeAttribute('role');
    el.style.removeProperty('--arvo-form-input-width');

    this._labelEl?.remove();
    this._counterEl?.remove();
    this._inlineAlertEl?.remove();
    this._actionsEl?.remove();
    this._fieldEl?.remove();

    this._element = null;
    this._inputEl = null;
    this._fieldEl = null;
    this._actionsEl = null;
    this._borderEl = null;
    this._labelEl = null;
    this._counterEl = null;
    this._clearEl = null;
    this._clearBtn = null;
    this._pwToggleEl = null;
    this._pwToggleBtn = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;
    this._errIcoEl = null;
    this._inlineAlertEl = null;
    this._icoEl = null;
    this._prefixEl = null;
    this._prefixSepEl = null;
    this._suffixEl = null;
  }
}
