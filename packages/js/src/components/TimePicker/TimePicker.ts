// Vanilla JS ArvoTimePicker.
//
// Time-only picker. Form-input-styled trigger plus TimeDropdown popover.
// Behavioral parity with packages/react/src/components/TimePicker/TimePicker.tsx.
//
// Loading Pattern: C -- spinner replaces trigger-btn; popover cannot open.
//
// Events dispatched on the host element:
//   tp:change  -- { value: TimeObject | null, formattedValue: string } -- committed value changed
//   tp:open    -- {} -- popover opening (cancelable)
//   tp:close   -- {} -- popover closing (cancelable)

import {
  applyPositionToSurface,
  connectTooltip,
  createOverlaySurface,
  createSegmentController,
  formatTime,
  getLocaleTimeFormat,
  getUserLocale,
  parseTime,
  tooltipManager,
} from '@arvo/core';
import type {
  OverlaySurface,
  PositionResult,
  SegmentController,
  TooltipConnector,
  TimeObject,
} from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import { ArvoTimeDropdown } from '../TimeDropdown/TimeDropdown';
export type { TimeObject } from '@arvo/core';

/**
 * Scoped escape-hatch bag for popover surface options. TimePicker portals
 * a custom overlay (not `ArvoPopover`). Mirrors the React twin.
 *
 * A `timeProps` bag is intentionally omitted in this pass -- the inner
 * `ArvoTimeDropdown` has no parity-safe long-tail option today.
 */
export interface TimePickerPopoverProps {
  /** CSS width override on the popover surface. */
  width?: string;
  /** Pixel offset between the trigger and the popover. Default: 4. */
  offset?: number;
}

export interface ArvoTimePickerOptions {
  value?: TimeObject | Date | string | null;
  defaultValue?: TimeObject | Date | string | null;
  format?: string | null;
  locale?: string | null;
  interval?: number;
  minTime?: TimeObject | string | null;
  maxTime?: TimeObject | string | null;
  placeholder?: string | null;
  label?: string | null;
  /**
   * Optional contextual-help icon attached to the field label. When provided,
   * embeds an `ArvoContextHelp` at `size: 'sm'` (14px) absolutely positioned
   * to the right of the label. Has no effect when `label` is omitted.
   */
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  variant?: 'default';
  size?: 'sm' | 'lg';
  surface?: 'filled' | 'base';
  width?: string | null;
  isFullWidth?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMsg?: string | null;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  isLoading?: boolean;
  /** Opt-in clear button (default `false`). */
  isClearable?: boolean;
  isAutoClose?: boolean;
  isStrictParsing?: boolean;
  isSegmented?: boolean;
  anchor?: false | true | HTMLElement | string;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  /**
   * Scoped escape-hatch bag for popover surface options. Bag-only keys
   * (`width`, `offset`) flow through; flat options (`placement`) always
   * win on overlap. Z-index is owned by the overlay hub.
   */
  popoverProps?: TimePickerPopoverProps;
  onChange?: (payload: { value: TimeObject | null; formattedValue: string }) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onBlur?: () => void;
}

type ResolvedAnchor = false | true | HTMLElement | string;

interface RequiredArvoTimePickerOptions {
  value: TimeObject | Date | string | null | undefined;
  defaultValue: TimeObject | Date | string | null;
  format: string | null;
  locale: string | null;
  interval: number;
  minTime: TimeObject | string | null;
  maxTime: TimeObject | string | null;
  placeholder: string | null;
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  variant: 'default';
  size: 'sm' | 'lg';
  surface: 'filled' | 'base';
  width: string | null;
  isFullWidth: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isRequired: boolean;
  isInvalid: boolean;
  errorMsg: string | null;
  errorDisplay: 'inline' | 'tooltip' | 'none';
  isLoading: boolean;
  isClearable: boolean;
  isAutoClose: boolean;
  isStrictParsing: boolean;
  isSegmented: boolean;
  anchor: ResolvedAnchor;
  placement: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  popoverProps: TimePickerPopoverProps | null;
  onChange: ((p: { value: TimeObject | null; formattedValue: string }) => void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onBlur: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function timeKey(v: TimeObject | null): string {
  if (!v) return '';
  return `${v.hours}:${v.minutes}:${v.seconds ?? 0}:${v.milliseconds ?? 0}:${v.timezone ?? ''}`;
}

function sameTime(a: TimeObject | null, b: TimeObject | null): boolean {
  return timeKey(a) === timeKey(b);
}

function normalizeTime(v: TimeObject): TimeObject | null {
  const hours = Math.trunc(v.hours);
  const minutes = Math.trunc(v.minutes);
  const seconds = v.seconds == null ? undefined : Math.trunc(v.seconds);
  const milliseconds = v.milliseconds == null ? undefined : Math.trunc(v.milliseconds);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (seconds != null && (seconds < 0 || seconds > 59)) return null;
  if (milliseconds != null && (milliseconds < 0 || milliseconds > 999)) return null;
  const out: TimeObject = { hours, minutes };
  if (seconds != null) out.seconds = seconds;
  if (milliseconds != null) out.milliseconds = milliseconds;
  if (v.timezone != null) out.timezone = v.timezone;
  return out;
}

function timeFromDate(date: Date | null): TimeObject | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return {
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    milliseconds: date.getMilliseconds(),
  };
}

function dateFromTime(v: TimeObject | null): Date | null {
  if (!v) return null;
  return new Date(2000, 0, 1, v.hours, v.minutes, v.seconds ?? 0, v.milliseconds ?? 0);
}

function coerceTime(v: TimeObject | Date | string | null | undefined, format: string): TimeObject | null {
  if (v == null) return null;
  if (v instanceof Date) return timeFromDate(v);
  if (typeof v === 'string') return v.length === 0 ? null : parseTime(v, format);
  return normalizeTime(v);
}

function parseDisplayTime(value: string, format: string, strict: boolean): TimeObject | null {
  const parsed = parseTime(value, format);
  if (!parsed) return null;
  if (strict && formatTime(parsed, format) !== value.trim()) return null;
  return parsed;
}

function totalMilliseconds(v: TimeObject): number {
  return (((v.hours * 60 + v.minutes) * 60 + (v.seconds ?? 0)) * 1000) +
    (v.milliseconds ?? 0);
}

function clampToRange(v: TimeObject | null, min: TimeObject | null, max: TimeObject | null): TimeObject | null {
  if (!v) return null;
  if (min && totalMilliseconds(v) < totalMilliseconds(min)) return { ...min };
  if (max && totalMilliseconds(v) > totalMilliseconds(max)) return { ...max };
  return v;
}

function resolveAnchorElement(anchor: ResolvedAnchor, host: HTMLElement): HTMLElement | null {
  if (anchor === false || anchor == null) return null;
  if (anchor === true) return host;
  if (typeof anchor === 'string') return document.querySelector<HTMLElement>(anchor);
  if (anchor instanceof HTMLElement) return anchor;
  return null;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoTimePicker {
  private _element: HTMLElement | null;
  private _opts: RequiredArvoTimePickerOptions;
  private _effLocale: string;
  private _effFormat: string;
  private readonly _id: string;
  private readonly _inputId: string;
  private readonly _labelId: string;
  private readonly _errorId: string;
  private readonly _popoverId: string;
  private _committedValue: TimeObject | null = null;
  private _isOpen = false;
  private _errorOverride: string | null = null;
  private _loadingOverride: boolean | null = null;
  private _hasTextSelected = false;
  private _preFocusValue: TimeObject | null = null;
  private _inputFocused = false;
  private _useAnchorRender = false;
  private _anchorEl: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _fieldEl: HTMLElement | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _actionsEl: HTMLElement | null = null;
  private _clearBtnEl: HTMLButtonElement | null = null;
  private _triggerBtnEl: HTMLButtonElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _errMsgEl: HTMLElement | null = null;
  private _popoverEl: HTMLElement | null = null;
  private _bodyEl: HTMLElement | null = null;
  private _timeDropdownHostEl: HTMLElement | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _triggerBtn: ArvoIconButton | null = null;
  private _errIco: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _timeDropdown: ArvoTimeDropdown | null = null;
  private _segmentCtrl: SegmentController | null = null;

  // Overlay surface (engine) -- owns portal mounting, hub registration, positioning,
  // focus trap, outside-click + Escape dismissal, and enter/exit fade.
  private _surface: OverlaySurface | null = null;
  // Engine close-routing flag (same pattern as DatePicker).
  // The engine's `onClose` callback fires synchronously both when this.close()
  // drives a programmatic close AND when the engine drives an outside-click /
  // Escape dismissal. We set this flag before calling surface.close() so the
  // `_handleEngineClose` hook becomes a no-op for the programmatic path (we
  // already dispatched tp:close + synced state there). The engine drives the
  // flag=false path only for outside-click / Escape.
  private _closingProgrammatically = false;

  private _resizeObserver: ResizeObserver | null = null;
  private _loadingObserver: MutationObserver | null = null;
  private _boundInputKeyDown: (e: KeyboardEvent) => void;
  private _boundInputFocus: () => void;
  private _boundInputBlur: () => void;
  private _boundInputMouseDown: () => void;
  private _boundInputPaste: (e: ClipboardEvent) => void;
  private _boundInputChange: () => void;
  private _boundAnchorClick: () => void;
  private _boundAnchorKeyDown: (e: KeyboardEvent) => void;
  private _destroyed = false;

  static initialize(element: HTMLElement, options?: ArvoTimePickerOptions): ArvoTimePicker {
    return new ArvoTimePicker(element, options ?? {});
  }

  constructor(element: HTMLElement, options: ArvoTimePickerOptions = {}) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('[ArvoTimePicker] initialize() requires an HTMLElement.');
    }
    this._element = element;
    this._opts = {
      value: options.value,
      defaultValue: options.defaultValue ?? null,
      format: options.format ?? null,
      locale: options.locale ?? null,
      interval: options.interval ?? 15,
      minTime: options.minTime ?? null,
      maxTime: options.maxTime ?? null,
      placeholder: options.placeholder ?? null,
      label: options.label ?? null,
      contextHelp: options.contextHelp ?? null,
      variant: options.variant ?? 'default',
      size: options.size ?? 'lg',
      surface: options.surface ?? 'filled',
      width: options.width ?? null,
      isFullWidth: options.isFullWidth ?? false,
      isDisabled: options.isDisabled ?? false,
      isReadOnly: options.isReadOnly ?? false,
      isRequired: options.isRequired ?? false,
      isInvalid: options.isInvalid ?? false,
      errorMsg: options.errorMsg ?? null,
      errorDisplay: options.errorDisplay ?? 'inline',
      isLoading: options.isLoading ?? false,
      isClearable: options.isClearable ?? false,
      isAutoClose: options.isAutoClose ?? true,
      isStrictParsing: options.isStrictParsing ?? false,
      isSegmented: options.isSegmented ?? true,
      anchor: options.anchor ?? false,
      placement: options.placement ?? 'bottom-end',
      popoverProps: options.popoverProps ?? null,
      onChange: options.onChange ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onBlur: options.onBlur ?? null,
    };
    this._effLocale = getUserLocale(this._opts.locale ?? undefined);
    this._effFormat = this._opts.format || getLocaleTimeFormat(this._effLocale);

    this._committedValue = clampToRange(
      coerceTime(this._opts.value ?? this._opts.defaultValue, this._effFormat),
      this._asTime(this._opts.minTime),
      this._asTime(this._opts.maxTime),
    );

    const idNum = ++_idCounter;
    this._id = `arvo-tp-${idNum}`;
    this._inputId = `${this._id}-input`;
    this._labelId = `${this._id}-lbl`;
    this._errorId = `${this._id}-err`;
    this._popoverId = `${this._id}-popover`;

    const anchorRequested = this._opts.anchor !== false && this._opts.anchor != null;
    if (anchorRequested) {
      const resolved = resolveAnchorElement(this._opts.anchor, element);
      if (resolved) {
        this._useAnchorRender = true;
        this._anchorEl = resolved;
      } else if (typeof console !== 'undefined') {
        console.warn('[ArvoTimePicker] anchor did not resolve to an element; falling back to input mode.');
      }
    }

    this._boundInputKeyDown = this._handleInputKeyDown.bind(this);
    this._boundInputFocus = this._handleInputFocus.bind(this);
    this._boundInputBlur = this._handleInputBlur.bind(this);
    this._boundInputMouseDown = this._handleInputMouseDown.bind(this);
    this._boundInputPaste = this._handleInputPaste.bind(this);
    this._boundInputChange = this._handleInputChange.bind(this);
    this._boundAnchorClick = this._handleAnchorClick.bind(this);
    this._boundAnchorKeyDown = this._handleAnchorKeyDown.bind(this);

    if (this._useAnchorRender) this._renderDomAnchor();
    else {
      this._renderDomInput();
      this._initSegmentController();
      this._observeActions();
    }
    this._observeParentLoading();
    this._applyWidth();
    this._syncRootClasses();
    this._updateInputDisplay();
  }

  // -------------------------------------------------------------------------
  // DOM construction
  // -------------------------------------------------------------------------

  private _renderDomInput(): void {
    const root = this._element!;
    root.id = this._id;
    if (this._opts.label) {
      this._labelEl = ArvoFormLabel.initialize(null, {
        text: this._opts.label,
        for: this._inputId,
        isRequired: this._opts.isRequired,
        contextHelp: this._opts.contextHelp,
        isDisabled: this._opts.isDisabled,
        isInvalid: this._opts.isInvalid,
      }).el as HTMLLabelElement;
      this._labelEl.id = this._labelId;
      this._labelEl.classList.add('arvo-tp__lbl');
      root.appendChild(this._labelEl);
    }

    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-tp__field';
    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.id = this._inputId;
    this._inputEl.className = 'arvo-tp__input';
    this._inputEl.setAttribute('role', 'combobox');
    this._inputEl.setAttribute('autocomplete', 'off');
    this._inputEl.setAttribute('aria-haspopup', 'dialog');
    this._inputEl.setAttribute('aria-expanded', 'false');
    this._inputEl.setAttribute('aria-controls', this._popoverId);
    if (this._opts.placeholder) this._inputEl.placeholder = this._opts.placeholder;
    if (this._opts.isDisabled) {
      this._inputEl.disabled = true;
      this._inputEl.setAttribute('aria-disabled', 'true');
    }
    if (this._opts.isReadOnly || this._opts.isSegmented) this._inputEl.readOnly = true;
    if (this._opts.isRequired) this._inputEl.setAttribute('aria-required', 'true');
    if (this._opts.isInvalid || this._effError() != null) this._inputEl.setAttribute('aria-invalid', 'true');
    if (this._effLoading()) this._inputEl.setAttribute('aria-busy', 'true');
    if (this._labelEl) this._inputEl.setAttribute('aria-labelledby', this._labelId);
    // The input intentionally has NO click handler -- clicking the field
    // should focus the segments, not open the popover. Click-to-segment is
    // wired via mousedown so the picker can map the clicked caret offset to
    // a specific segment. The popover is only opened via the clock icon
    // button or the Alt+ArrowDown shortcut.
    this._inputEl.addEventListener('keydown', this._boundInputKeyDown);
    this._inputEl.addEventListener('focus', this._boundInputFocus);
    this._inputEl.addEventListener('blur', this._boundInputBlur);
    if (this._opts.isSegmented) {
      this._inputEl.addEventListener('mousedown', this._boundInputMouseDown);
      this._inputEl.addEventListener('paste', this._boundInputPaste);
    } else {
      this._inputEl.addEventListener('input', this._boundInputChange);
    }
    this._fieldEl.appendChild(this._inputEl);

    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-tp__actions';
    this._fieldEl.appendChild(this._actionsEl);
    const border = document.createElement('div');
    border.className = 'arvo-tp__border';
    this._fieldEl.appendChild(border);
    root.appendChild(this._fieldEl);
    this._renderActions();
    this._renderInlineError();
  }

  private _renderDomAnchor(): void {
    const root = this._element!;
    root.id = this._id;
    if (!this._anchorEl) return;
    this._anchorEl.setAttribute('aria-haspopup', 'dialog');
    this._anchorEl.setAttribute('aria-expanded', 'false');
    this._anchorEl.setAttribute('aria-controls', this._popoverId);
    this._anchorEl.addEventListener('click', this._boundAnchorClick);
    this._anchorEl.addEventListener('keydown', this._boundAnchorKeyDown);
  }

  private _renderActions(): void {
    if (!this._actionsEl) return;
    this._clearBtn?.destroy();
    this._triggerBtn?.destroy();
    this._errIco?.destroy();
    this._errIcoConnector?.destroy();
    this._clearBtn = null;
    this._triggerBtn = null;
    this._errIco = null;
    this._errIcoConnector = null;
    this._clearBtnEl = null;
    this._triggerBtnEl = null;
    this._errIcoEl = null;
    this._actionsEl.textContent = '';
    const err = this._effError();
    const loading = this._effLoading();
    const showTooltipIcon = err != null && this._opts.errorDisplay === 'tooltip';
    const showClear =
      this._opts.isClearable === true &&
      this._committedValue != null &&
      !this._opts.isDisabled &&
      !this._opts.isReadOnly &&
      !loading &&
      !showTooltipIcon;
    const showSep = !loading && (showClear || showTooltipIcon);

    if (showClear) {
      this._clearBtnEl = document.createElement('button') as HTMLButtonElement;
      this._clearBtnEl.classList.add('arvo-tp__clear-btn');
      this._clearBtnEl.setAttribute('tabindex', '-1');
      this._actionsEl.appendChild(this._clearBtnEl);
      this._clearBtn = ArvoIconButton.initialize(this._clearBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'close',
        tooltip: 'Clear',
        onClick: (e: Event) => { e.stopPropagation(); this.clear(); },
      });
    }
    if (showTooltipIcon) {
      this._errIco = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: err,
      });
      this._errIcoEl = this._errIco.el;
      this._errIcoEl.classList.add('arvo-tp__err-ico');
      this._errIcoConnector = connectTooltip(tooltipManager, {
        anchor: this._errIcoEl,
        content: err!,
      });
      this._actionsEl.appendChild(this._errIcoEl);
    }
    if (showSep) {
      const sep = document.createElement('span');
      sep.className = 'arvo-tp__sep';
      sep.setAttribute('aria-hidden', 'true');
      this._actionsEl.appendChild(sep);
    }
    if (!loading) {
      this._triggerBtnEl = document.createElement('button') as HTMLButtonElement;
      this._triggerBtnEl.classList.add('arvo-tp__trigger-btn');
      this._triggerBtnEl.setAttribute('aria-haspopup', 'dialog');
      this._triggerBtnEl.setAttribute('aria-controls', this._popoverId);
      this._triggerBtnEl.setAttribute('aria-expanded', String(this._isOpen));
      this._actionsEl.appendChild(this._triggerBtnEl);
      this._triggerBtn = ArvoIconButton.initialize(this._triggerBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'clock-o',
        tooltip: 'Select time',
        isDisabled: this._opts.isDisabled || this._opts.isReadOnly,
        isSelected: this._isOpen,
        onClick: () => this._handleTriggerClick(),
      });
    }
    this._updatePadding();
  }

  private _renderInlineError(): void {
    if (!this._element) return;
    const err = this._effError();
    const showInline = err != null && this._opts.errorDisplay === 'inline';
    if (showInline) {
      if (!this._errMsgEl) {
        this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
          type: 'negative',
          message: err,
          id: this._errorId,
        });
        this._errMsgEl = this._inlineAlert.el;
        this._errMsgEl.classList.add('arvo-tp__err-msg');
        this._element.appendChild(this._errMsgEl);
      } else {
        this._inlineAlert?.message(err);
      }
      this._inputEl?.setAttribute('aria-describedby', this._errorId);
    } else if (this._errMsgEl) {
      this._inlineAlert?.destroy();
      this._inlineAlert = null;
      this._errMsgEl.remove();
      this._errMsgEl = null;
      this._inputEl?.removeAttribute('aria-describedby');
    }
  }

  // -------------------------------------------------------------------------
  // Segment controller
  // -------------------------------------------------------------------------

  private _initSegmentController(): void {
    if (!this._opts.isSegmented) return;
    this._segmentCtrl = createSegmentController({
      format: this._effFormat,
      locale: this._effLocale,
      value: dateFromTime(this._committedValue),
      min: dateFromTime(this._asTime(this._opts.minTime)),
      max: dateFromTime(this._asTime(this._opts.maxTime)),
      commit: 'blur',
      minuteInterval: this._opts.interval,
    });
    this._segmentCtrl.on('commit', (payload) => {
      this._handleCommit(timeFromDate((payload as { date: Date | null }).date));
    });
    this._segmentCtrl.on('segment', () => {
      const focused = this._segmentCtrl?.getFocusedSegment() != null;
      if (focused !== this._hasTextSelected) {
        this._hasTextSelected = focused;
        this._syncRootClasses();
      }
    });
    this._segmentCtrl.on('change', () => this._refreshInputFromController());
  }

  // -------------------------------------------------------------------------
  // Resize observer + width
  // -------------------------------------------------------------------------

  private _observeActions(): void {
    if (!this._actionsEl) return;
    this._resizeObserver = new ResizeObserver(() => this._updatePadding());
    this._resizeObserver.observe(this._actionsEl);
    this._updatePadding();
  }

  private _observeParentLoading(): void {
    this._loadingObserver = new MutationObserver(() => this._syncLoadingState());
    this._loadingObserver.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-arvo-loading', 'data-arvo-loading-ignore'],
    });
  }

  private _syncLoadingState(): void {
    const loading = this._effLoading();
    if (loading && this._isOpen) this.close();
    this._timeDropdown?.disabled(this._opts.isDisabled || this._opts.isReadOnly || loading);
    this._renderActions();
    this._syncRootClasses();
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${w > 0 ? w + 4 : 0}px`);
  }

  private _applyWidth(): void {
    if (!this._element) return;
    const w = this._opts.isFullWidth ? '100%' : this._opts.width;
    if (w) this._element.style.setProperty('--arvo-form-input-width', w);
    else this._element.style.removeProperty('--arvo-form-input-width');
  }

  // -------------------------------------------------------------------------
  // Class composition
  // -------------------------------------------------------------------------

  private _syncRootClasses(): void {
    if (!this._element) return;
    const err = this._effError();
    const loading = this._effLoading();
    const classes = [
      'arvo-tp',
      `arvo-tp--${this._opts.variant}`,
      `arvo-tp--${this._opts.size}`,
      `arvo-tp--surface-${this._opts.surface}`,
      this._opts.isFullWidth && 'arvo-tp--full-width',
      this._useAnchorRender && 'arvo-tp--anchor-mode',
      loading && 'loading',
      this._opts.isDisabled && 'is-disabled',
      this._opts.isReadOnly && 'is-readonly',
      err != null && 'has-error',
      err != null && this._opts.errorDisplay === 'tooltip' && 'error-tooltip',
      this._committedValue != null && 'has-value',
      this._hasTextSelected && 'has-text-selected',
      this._isOpen && 'open',
    ].filter(Boolean) as string[];
    this._element.className = classes.join(' ');
    if (this._inputEl) {
      this._inputEl.setAttribute('aria-expanded', String(this._isOpen));
      if (this._opts.isInvalid || err != null) this._inputEl.setAttribute('aria-invalid', 'true');
      else this._inputEl.removeAttribute('aria-invalid');
      if (loading) this._inputEl.setAttribute('aria-busy', 'true');
      else this._inputEl.removeAttribute('aria-busy');
      this._inputEl.disabled = this._opts.isDisabled;
      if (this._opts.isDisabled) this._inputEl.setAttribute('aria-disabled', 'true');
      else this._inputEl.removeAttribute('aria-disabled');
      this._inputEl.readOnly = this._opts.isReadOnly || this._opts.isSegmented;
    }
    this._triggerBtnEl?.setAttribute('aria-expanded', String(this._isOpen));
    if (this._useAnchorRender && this._anchorEl) {
      this._anchorEl.setAttribute('aria-expanded', String(this._isOpen));
    }
  }

  // -------------------------------------------------------------------------
  // Effective state accessors
  // -------------------------------------------------------------------------

  private _effError(): string | null {
    if (this._errorOverride != null) return this._errorOverride;
    if (this._opts.isInvalid) return this._opts.errorMsg;
    return null;
  }

  private _effLoading(): boolean {
    const ownLoading = this._loadingOverride ?? this._opts.isLoading;
    const parentLoading = Boolean(this._element?.closest('[data-arvo-loading="true"]'));
    const loadingIgnored = Boolean(this._element?.closest('[data-arvo-loading-ignore="true"]'));
    return ownLoading || (parentLoading && !loadingIgnored);
  }

  private _asTime(v: TimeObject | Date | string | null | undefined): TimeObject | null {
    return coerceTime(v, this._effFormat);
  }

  // -------------------------------------------------------------------------
  // Input display updates
  // -------------------------------------------------------------------------

  private _updateInputDisplay(): void {
    if (!this._inputEl) return;
    if (this._opts.isSegmented && this._segmentCtrl) {
      this._inputEl.value = this._segmentCtrl.getFormattedDisplay(this._inputFocused);
    } else {
      this._inputEl.value = this._committedValue ? formatTime(this._committedValue, this._effFormat) : '';
    }
  }

  private _refreshInputFromController(): void {
    if (!this._inputEl || !this._segmentCtrl) return;
    this._inputEl.value = this._segmentCtrl.getFormattedDisplay(this._inputFocused);
    const preview = timeFromDate(this._segmentCtrl.getValue().date);
    if (preview && this._timeDropdown) {
      this._timeDropdown.value(clampToRange(
        preview,
        this._asTime(this._opts.minTime),
        this._asTime(this._opts.maxTime),
      ) ?? preview);
    }
    const seg = this._segmentCtrl.getFocusedSegment();
    if (!seg) return;
    try { this._inputEl.setSelectionRange(seg.startOffset, seg.endOffset); } catch { /* noop */ }
  }

  // -------------------------------------------------------------------------
  // Commit / change dispatch
  // -------------------------------------------------------------------------

  private _handleCommit(next: TimeObject | null): boolean {
    const clamped = clampToRange(next, this._asTime(this._opts.minTime), this._asTime(this._opts.maxTime));
    if (sameTime(clamped, this._committedValue)) {
      this._segmentCtrl?.setValue(dateFromTime(clamped), { silent: true });
      this._syncTimeDropdownValue(clamped);
      this._updateInputDisplay();
      return false;
    }
    this._committedValue = clamped;
    this._segmentCtrl?.setValue(dateFromTime(clamped), { silent: true });
    this._syncTimeDropdownValue(clamped);
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();
    const detail = { value: clamped, formattedValue: clamped ? formatTime(clamped, this._effFormat) : '' };
    this._opts.onChange?.(detail);
    this._element?.dispatchEvent(new CustomEvent('tp:change', { bubbles: true, detail }));
    return true;
  }

  // -------------------------------------------------------------------------
  // Trigger / input handlers
  // -------------------------------------------------------------------------

  private _handleTriggerClick(): void {
    if (this._effLoading() || this._opts.isDisabled || this._opts.isReadOnly) return;
    if (this._isOpen) this.close();
    else this.open();
  }

  private _handleInputFocus(): void {
    this._inputFocused = true;
    this._preFocusValue = this._committedValue;
    if (this._opts.isSegmented && this._segmentCtrl) {
      if (this._inputEl) this._inputEl.value = this._segmentCtrl.getFormattedDisplay(true);
      this._segmentCtrl.focusSegment(0);
      this._refreshInputFromController();
    }
  }

  /**
   * Click-to-segment. Mirrors the DatePicker implementation; see that file
   * for the rAF rationale.
   */
  private _handleInputMouseDown(): void {
    if (!this._inputEl || !this._opts.isSegmented) return;
    const input = this._inputEl;
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      const ctrl = this._segmentCtrl;
      if (!ctrl) return;
      const offset = input.selectionStart ?? null;
      if (offset === null) return;
      const idx = ctrl.findSegmentForOffset(offset);
      if (idx !== null) {
        ctrl.focusSegment(idx);
        this._refreshInputFromController();
      }
    });
  }

  private _handleInputBlur(): void {
    this._inputFocused = false;
    if (this._opts.isSegmented && this._segmentCtrl) {
      if (this._inputEl) this._inputEl.value = this._segmentCtrl.getFormattedDisplay(false);
    } else {
      const parsed = parseDisplayTime(
        this._inputEl?.value ?? '',
        this._effFormat,
        this._opts.isStrictParsing,
      );
      if (parsed) this._handleCommit(parsed);
      else this._updateInputDisplay();
    }
    if (this._hasTextSelected) {
      this._hasTextSelected = false;
      this._syncRootClasses();
    }
    this._opts.onBlur?.();
  }

  private _handleInputChange(): void { /* free-text commits on Enter/blur */ }

  private _handleInputKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); if (!this._isOpen) this.open(); return; }
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); if (this._isOpen) this.close(); return; }
    if (this._opts.isSegmented && this._segmentCtrl) {
      const ctrl = this._segmentCtrl;
      const key = e.key;
      if (key === 'Escape') {
        e.preventDefault();
        ctrl.handleKey({ key: 'Escape' });
        if (this._inputFocused) {
          if (this._inputEl) this._inputEl.value = ctrl.getFormattedDisplay(true);
          ctrl.focusSegment(0);
          this._refreshInputFromController();
        } else this._updateInputDisplay();
        if (this._isOpen) this.close();
        return;
      }
      if (key === 'Tab') {
        const res = ctrl.handleKey({ key: 'Tab', shiftKey: e.shiftKey });
        if (res.consumed) { e.preventDefault(); this._refreshInputFromController(); }
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        const before = this._committedValue;
        ctrl.handleKey({ key: 'Enter' });
        this._refreshInputFromController();
        if (this._isOpen && this._opts.isAutoClose && !sameTime(before, this._committedValue)) this.close();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete'].includes(key)) {
        const res = ctrl.handleKey({ key });
        if (res.consumed) { e.preventDefault(); this._refreshInputFromController(); }
        return;
      }
      if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (/^[0-9]$/.test(key)) { const res = ctrl.handleDigit(key); if (res.consumed) { e.preventDefault(); this._refreshInputFromController(); } return; }
        if (/^[A-Za-z]$/.test(key)) { const res = ctrl.handleLetter(key); if (res.consumed) { e.preventDefault(); this._refreshInputFromController(); } }
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseDisplayTime(
        this._inputEl?.value ?? '',
        this._effFormat,
        this._opts.isStrictParsing,
      );
      if (parsed) {
        const changed = this._handleCommit(parsed);
        if (this._isOpen && this._opts.isAutoClose && changed) this.close();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this._committedValue = this._preFocusValue;
      this._syncTimeDropdownValue(this._committedValue);
      this._updateInputDisplay();
      this._renderActions();
      this._syncRootClasses();
      if (this._isOpen) this.close();
    }
  }

  private _handleInputPaste(e: ClipboardEvent): void {
    if (!this._opts.isSegmented || !this._segmentCtrl) return;
    const res = this._segmentCtrl.handlePaste(e.clipboardData?.getData('text') ?? '');
    if (res.consumed) { e.preventDefault(); this._refreshInputFromController(); }
  }

  // -------------------------------------------------------------------------
  // Anchor mode handlers
  // -------------------------------------------------------------------------

  private _handleAnchorClick(): void { this._handleTriggerClick(); }

  private _handleAnchorKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); if (!this._isOpen) this.open(); return; }
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); if (this._isOpen) this.close(); return; }
    if (e.key === 'Escape') { if (this._isOpen) { e.preventDefault(); this.close(); } return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._handleAnchorClick(); }
  }

  // -------------------------------------------------------------------------
  // Popover lifecycle
  // -------------------------------------------------------------------------

  /**
   * Builds the popover DOM once (lazy). Does NOT append to the document --
   * the OverlaySurface engine mounts + unmounts via `mount.target` /
   * `mount.removeOnClose` on each open/close cycle (mirrors the React portal
   * pattern where `isMounted` gates the portal render).
   */
  private _buildPopover(): void {
    if (this._popoverEl) return;

    this._popoverEl = document.createElement('div');
    this._popoverEl.className = 'arvo-tp__popover';
    this._popoverEl.id = this._popoverId;
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute('aria-label', 'Choose a time');
    this._popoverEl.setAttribute('aria-modal', 'false');
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = '0';
    this._popoverEl.style.left = '0';
    this._popoverEl.style.margin = '0';
    // Z-index is assigned by the overlay hub when the surface opens.
    // Hybrid prop surface: popoverProps.width (bag-only) flows through.
    if (this._opts.popoverProps?.width) {
      this._popoverEl.style.width = this._opts.popoverProps.width;
    }

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-tp__body';
    this._popoverEl.appendChild(this._bodyEl);

    this._timeDropdownHostEl = document.createElement('div');
    this._bodyEl.appendChild(this._timeDropdownHostEl);
    this._timeDropdown = this._createTimeDropdown(this._timeDropdownHostEl);
  }

  private _createTimeDropdown(host: HTMLElement): ArvoTimeDropdown {
    return ArvoTimeDropdown.initialize(host, {
      value: this._committedValue,
      format: this._effFormat,
      locale: this._effLocale,
      interval: this._opts.interval,
      minTime: this._asTime(this._opts.minTime),
      maxTime: this._asTime(this._opts.maxTime),
      isDisabled: this._opts.isDisabled || this._opts.isReadOnly || this._effLoading(),
      onChange: (time) => {
        const clamped = clampToRange(time, this._asTime(this._opts.minTime), this._asTime(this._opts.maxTime));
        this._handleCommit(clamped);
        if (this._opts.isAutoClose) this.close();
      },
      onDismiss: () => this.close(),
    });
  }

  private _syncTimeDropdownValue(value: TimeObject | null): void {
    if (!this._timeDropdown) return;
    if (value) {
      this._timeDropdown.value(value);
      return;
    }
    if (!this._timeDropdownHostEl) return;
    this._timeDropdown.destroy();
    this._timeDropdown = this._createTimeDropdown(this._timeDropdownHostEl);
  }

  /**
   * Tab cycle inside the popover (mirrors React's `getOrderedPopoverElements`).
   * ArvoTimeDropdown uses roving tabindex; the single `[tabindex="0"]` element
   * is the current time item. Initial focus is set imperatively after the
   * engine positions the panel -- see open() rAF block.
   */
  private _getOrderedPopoverElements(): Array<HTMLElement | null> {
    const root = this._popoverEl;
    if (!root) return [];
    const timeItem = root.querySelector<HTMLElement>('[tabindex="0"]');
    return [timeItem];
  }

  /**
   * Engine-driven close callback. Fires (synchronously, before the exit
   * animation) for outside-click and Escape via the hub. Per the
   * cross-cutting overlay policy, engine-driven dismissals are
   * unconditional and silent -- no tp:close dispatch, no onClose veto.
   *
   * The `_closingProgrammatically` flag guards against the symmetric case
   * where this.close() calls surface.close() -- in that path the flag is true
   * and we return early since the programmatic path already synced state +
   * classes + focus return.
   */
  private _handleEngineClose = (): void => {
    if (this._closingProgrammatically) {
      // Programmatic close already dispatched tp:close + set state;
      // the engine just confirms by calling onClose. Do nothing extra.
      return;
    }
    // Engine-driven path (outside-click, Escape via hub).
    if (!this._isOpen) return;
    this._isOpen = false;
    this._syncRootClasses();
    this._triggerBtn?.selected(false);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'false');
    if (this._useAnchorRender) {
      this._anchorEl?.focus();
    } else {
      this._inputEl?.focus({ preventScroll: true });
    }
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  open(): void {
    if (this._destroyed) return;
    if (this._isOpen) return;
    if (this._opts.isDisabled || this._opts.isReadOnly || this._effLoading()) {
      if (typeof console !== 'undefined') {
        console.warn('[ArvoTimePicker] open() ignored while disabled / readOnly / loading.');
      }
      return;
    }
    if (this._opts.onOpen?.() === false) return;
    const ev = new CustomEvent('tp:open', { bubbles: true, cancelable: true });
    if (this._element?.dispatchEvent(ev) === false) return;

    this._isOpen = true;
    this._buildPopover();

    // Sync the time dropdown to the latest committed value each time the
    // popover opens (accounts for programmatic value() calls while closed).
    this._syncTimeDropdownValue(this._committedValue);

    // Hide until the engine's first position update lands (avoid flash);
    // the position.apply callback below clears visibility on first run.
    if (this._popoverEl) {
      this._popoverEl.style.visibility = 'hidden';
    }

    // Build the surface lazily on first open; subsequent opens reuse it via
    // surface.open() (the engine re-mounts via mount.target on each open).
    if (!this._surface && this._popoverEl) {
      this._surface = createOverlaySurface({
        id: this._id,
        surface: this._popoverEl,
        type: 'dropdown',
        priority: 20,
        trigger:
          (this._useAnchorRender ? this._anchorEl : this._fieldEl) ?? null,
        mount: {
          // The engine appends to body on open and removes on close, mirroring
          // the React portal's isMounted gate (the popover is only in the DOM
          // while the surface is open; the SCSS display: flex rule applies
          // unconditionally and requires no ancestor .open selector gate).
          target: document.body,
          removeOnClose: true,
        },
        position: {
          placement: this._opts.placement,
          gap: this._opts.popoverProps?.offset ?? 4,
          apply: (pos: PositionResult, surfaceEl: HTMLElement) => {
            applyPositionToSurface(pos, surfaceEl);
            surfaceEl.style.visibility = '';
          },
        },
        focus: {
          mode: 'trap',
          initialFocus: 'none', // initial focus set imperatively via rAF below
          returnFocus: false,   // picker manages focus return manually
          getOrderedElements: () => this._getOrderedPopoverElements(),
        },
        transition: 'fade',
        transitionDuration: 150,
        // The engine writes aria-haspopup / aria-controls / aria-expanded on
        // the trigger element (the field div in input mode, the anchor in
        // anchor mode). axe rejects aria-haspopup on a generic <div>
        // (aria-allowed-attr), and the picker already wires the canonical
        // combobox ARIA on the role="combobox" <input> (input mode) and on
        // the anchor element (anchor mode). Disable the engine writes so
        // there is a single source of truth -- same strategy as DatePicker.
        triggerAria: false,
        onClose: this._handleEngineClose,
      });
    } else if (this._surface) {
      // Refresh the trigger in case the consumer swapped the anchor element
      // between opens (rare but supported).
      this._surface.setTrigger(
        (this._useAnchorRender ? this._anchorEl : this._fieldEl) ?? null,
      );
    }

    void this._surface?.open();

    this._syncRootClasses();
    this._triggerBtn?.selected(true);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'true');

    // Focus the matching time item after the popover is laid out.
    requestAnimationFrame(() => {
      this._popoverEl?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
    });
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;
    if (this._opts.onClose?.() === false) return;

    const ev = new CustomEvent('tp:close', { bubbles: true, cancelable: true });
    if (this._element?.dispatchEvent(ev) === false) return;

    this._isOpen = false;

    // Signal the engine onClose hook to skip its silent-close work -- we own
    // the cancellable path, so we sync state + classes + focus return here.
    // Note: surface.close() calls onClose (= _handleEngineClose) synchronously
    // before yielding to the exit animation await, so the flag is still true
    // when the hook fires.
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    this._syncRootClasses();
    this._triggerBtn?.selected(false);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'false');

    if (this._useAnchorRender) this._anchorEl?.focus();
    else this._inputEl?.focus({ preventScroll: true });
  }

  toggle(force?: boolean): void {
    if (force === undefined) { if (this._isOpen) this.close(); else this.open(); return; }
    if (force && !this._isOpen) this.open();
    else if (!force && this._isOpen) this.close();
  }

  value(): TimeObject | null;
  value(v: TimeObject | Date | string | null): void;
  value(v?: TimeObject | Date | string | null): TimeObject | null | void {
    if (arguments.length === 0) return this._committedValue;
    const coerced = clampToRange(this._asTime(v), this._asTime(this._opts.minTime), this._asTime(this._opts.maxTime));
    this._handleCommit(coerced);
  }

  formattedValue(): string { return this._committedValue ? formatTime(this._committedValue, this._effFormat) : ''; }

  clear(): void { this._segmentCtrl?.setValue(null, { silent: true }); this._handleCommit(null); }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    if (state === this._opts.isDisabled) return;
    this._opts.isDisabled = state;
    if (state && this._isOpen) this.close();
    this._timeDropdown?.disabled(state || this._opts.isReadOnly || this._effLoading());
    this._renderActions();
    this._syncRootClasses();
  }

  setError(message: string | false): void {
    this._errorOverride = message === false ? null : message;
    this._renderActions();
    this._renderInlineError();
    this._syncRootClasses();
  }

  setLoading(loading: boolean): void {
    this._loadingOverride = loading;
    if (loading && this._isOpen) this.close();
    this._timeDropdown?.disabled(this._opts.isDisabled || this._opts.isReadOnly || loading);
    this._renderActions();
    this._syncRootClasses();
  }

  focus(): void { (this._useAnchorRender ? this._anchorEl : this._inputEl)?.focus(); }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    // Tear the surface down first: this drops the hub registration, the
    // focus trap, outside-click + Escape listeners, and the position
    // watcher in one call.
    this._surface?.destroy();
    this._surface = null;
    this._isOpen = false;

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._loadingObserver?.disconnect();
    this._loadingObserver = null;

    this._segmentCtrl?.destroy();
    this._segmentCtrl = null;
    this._clearBtn?.destroy();
    this._clearBtn = null;
    this._triggerBtn?.destroy();
    this._triggerBtn = null;
    this._errIco?.destroy();
    this._errIco = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;
    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._timeDropdown?.destroy();
    this._timeDropdown = null;

    // Remove the popover from DOM in case it wasn't removed by the engine
    // (e.g. destroy() called while open).
    this._popoverEl?.remove();
    this._popoverEl = null;
    this._timeDropdownHostEl = null;

    if (this._inputEl) {
      this._inputEl.removeEventListener('keydown', this._boundInputKeyDown);
      this._inputEl.removeEventListener('focus', this._boundInputFocus);
      this._inputEl.removeEventListener('blur', this._boundInputBlur);
      this._inputEl.removeEventListener('mousedown', this._boundInputMouseDown);
      this._inputEl.removeEventListener('paste', this._boundInputPaste);
      this._inputEl.removeEventListener('input', this._boundInputChange);
    }
    if (this._useAnchorRender && this._anchorEl) {
      this._anchorEl.removeEventListener('click', this._boundAnchorClick);
      this._anchorEl.removeEventListener('keydown', this._boundAnchorKeyDown);
      this._anchorEl.removeAttribute('aria-haspopup');
      this._anchorEl.removeAttribute('aria-expanded');
      this._anchorEl.removeAttribute('aria-controls');
    }
    if (this._element) {
      this._element.textContent = '';
      this._element.className = '';
      this._element.style.removeProperty('--arvo-form-input-width');
      this._element.removeAttribute('id');
    }
    this._element = null;
    this._anchorEl = null;
    this._labelEl = null;
    this._fieldEl = null;
    this._inputEl = null;
    this._actionsEl = null;
    this._clearBtnEl = null;
    this._triggerBtnEl = null;
    this._errIcoEl = null;
    this._errMsgEl = null;
    this._bodyEl = null;
  }
}

export default ArvoTimePicker;
