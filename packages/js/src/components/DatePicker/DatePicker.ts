// Vanilla JS ArvoDatePicker.
//
// Single-date picker. Form-input-styled trigger plus Calendar popover.
// Standardized .NET/Kendo format tokens, locale-aware month/day names,
// ISO-8601 week numbering by default. Supports anchor mode (overlay-only)
// and isSegmented input editing.
//
// Descriptor: descriptors/date-picker.json
//
// Behavioral parity with packages/react/src/components/DatePicker/DatePicker.tsx --
// same BEM classes, ARIA attributes, keyboard map, and event payloads.
//
// Loading Pattern: C -- spinner replaces trigger-btn; popover cannot open.
//
// Events dispatched on the host element:
//   dp:change  -- { value: Date | null, formattedValue: string } -- committed value changed
//   dp:open    -- {} -- popover opening (cancelable)
//   dp:close   -- {} -- popover closing (cancelable)

import {
  addMonths,
  applyPositionToSurface,
  createOverlaySurface,
  createSegmentController,
  formatDate,
  getLocaleDateFormat,
  getUserLocale,
  isSameDay,
  parseDate,
  pickAnchorDate,
} from '@arvo/core';
import type {
  OverlaySurface,
  PositionResult,
  SegmentController,
} from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import ArvoCalendar, { type ArvoCalendarOptions, type ArvoCalendarViewMode } from '../Calendar/Calendar';
import { CalendarNav } from '../CalendarNav/CalendarNav';
// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Scoped escape-hatch bag for inner `ArvoCalendar` options the parent
 * does not curate as a flat option. Mirrors React `DatePickerCalendarProps`
 * exactly -- drift checker enforces key-set parity.
 */
export type DatePickerCalendarProps = Pick<
  ArvoCalendarOptions,
  'hasOutsideDays' | 'isKeyboardEnabled' | 'size'
>;

/**
 * Scoped escape-hatch bag for popover surface options the parent does
 * not curate as a flat option. DatePicker portals a custom overlay (not
 * `ArvoPopover`); this bag exposes parent-defined visual knobs.
 */
export interface DatePickerPopoverProps {
  /** CSS width override on the popover surface. */
  width?: string;
  /** Pixel offset between the trigger and the popover. Default: 4. */
  offset?: number;
}

export interface ArvoDatePickerOptions {
  // -- Value -----------------------------------------------------------------
  /** Current date value. Parsed via parseDate(value, format, locale). */
  value?: Date | string | null;
  /** Initial value for uncontrolled mode. */
  defaultValue?: Date | string | null;

  // -- Format / Locale -------------------------------------------------------
  /** .NET / Kendo date format. Empty resolves to locale default. */
  format?: string | null;
  /** BCP-47 locale. */
  locale?: string | null;

  // -- Calendar options ------------------------------------------------------
  /** First day of week. 0=Sunday, 1=Monday, ... 6=Saturday. */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Show weeks column in calendar. Adds arvo-dp--show-weeks modifier. */
  hasWeeks?: boolean;
  /** Min selectable date (inclusive). */
  minDate?: Date | string | null;
  /** Max selectable date (inclusive). */
  maxDate?: Date | string | null;

  // -- Trigger field ---------------------------------------------------------
  /** Placeholder text shown when value is null. */
  placeholder?: string | null;
  /** Form label text. Uses form-label shared pattern. */
  label?: string | null;
  /**
   * Optional contextual-help icon attached to the field label. When provided,
   * embeds an `ArvoContextHelp` at `size: 'sm'` (14px) absolutely positioned
   * to the right of the label. Has no effect when `label` is omitted.
   */
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  /** Trigger size. Applies arvo-dp--sm or arvo-dp--lg modifier. */
  size?: 'sm' | 'lg';
  /**
   * Visual fill of the trigger field. `'filled'` (default) renders the
   * tinted field background. `'base'` swaps to the host surface color so
   * the trigger reads as a flat extension of its parent (toolbars, side
   * panels, table cells, inline-edit rows). Only the at-rest trigger
   * background changes; hover, focus, disabled, readonly, error, text,
   * border, and icon colors are identical across both surfaces.
   */
  surface?: 'filled' | 'base';
  /** CSS width on the trigger (e.g. "200px", "50%"). Defaults to 300px. */
  width?: string | null;
  /** Shorthand for width="100%". Applies arvo-dp--full-width modifier. */
  isFullWidth?: boolean;

  // -- State -----------------------------------------------------------------
  /** Disabled state. Applies is-disabled class and aria-disabled. */
  isDisabled?: boolean;
  /** Read-only. Applies is-readonly class. */
  isReadOnly?: boolean;
  /** Required for forms. Applies aria-required. */
  isRequired?: boolean;
  /** Validation invalid. Applies has-error class and aria-invalid. */
  isInvalid?: boolean;
  /** Error message text. Used by msg-alert shared pattern. */
  errorMsg?: string | null;
  /** How to render error feedback. */
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  /** Loading state (Pattern C). Applies loading class and aria-busy. */
  isLoading?: boolean;
  /**
   * When true and a value is set, renders a clear icon button in the action
   * overlay. Defaults to `false` (mirrors the React API).
   */
  isClearable?: boolean;

  // -- Behavior --------------------------------------------------------------
  /** Close popover on day select. */
  isAutoClose?: boolean;
  /** Reject partial format parses. */
  isStrictParsing?: boolean;
  /** Use isSegmented input editing in the trigger. */
  isSegmented?: boolean;
  /**
   * Overlay-only mode. Pass a host element / CSS selector to bind without
   * rendering an input. Applies arvo-dp--anchor-mode modifier.
   */
  anchor?: false | true | HTMLElement | string;
  /** Popover placement relative to the trigger. */
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';

  // -- Scoped escape-hatch bags ---------------------------------------------
  /**
   * Escape hatch for inner `ArvoCalendar` options the parent doesn't
   * expose flat. Bag-only knobs (`hasOutsideDays`, `isKeyboardEnabled`,
   * `size`) flow through. Flat options always win on overlap.
   */
  calendarProps?: DatePickerCalendarProps;
  /**
   * Escape hatch for popover surface options the parent doesn't expose
   * flat. Bag-only knobs (`width`, `offset`) flow through. Flat options
   * (`placement`) always win on overlap. Z-index is owned by the overlay
   * hub (configure via `overlayHub.configure({ zIndexBase })`).
   */
  popoverProps?: DatePickerPopoverProps;

  // -- Callbacks -------------------------------------------------------------
  /** Called when the committed date value changes. */
  onChange?: (payload: { value: Date | null; formattedValue: string }) => void;
  /** Called when popover is about to open. Return false to cancel. */
  onOpen?: () => boolean | void;
  /** Called when popover is about to close. Return false to cancel. */
  onClose?: () => boolean | void;
  /** Called on trigger blur. */
  onBlur?: () => void;
}

type ResolvedAnchor = false | true | HTMLElement | string;

interface RequiredArvoDatePickerOptions {
  value: Date | string | null | undefined;
  defaultValue: Date | string | null;
  format: string | null;
  locale: string | null;
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasWeeks: boolean;
  minDate: Date | string | null;
  maxDate: Date | string | null;
  placeholder: string | null;
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
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
  calendarProps: DatePickerCalendarProps | null;
  popoverProps: DatePickerPopoverProps | null;
  onChange: ((p: { value: Date | null; formattedValue: string }) => void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onBlur: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function coerceDate(
  v: Date | string | null | undefined,
  format: string,
  locale: string,
): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    if (v.length === 0) return null;
    return parseDate(v, format, locale);
  }
  return null;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return isSameDay(a, b);
}

function clampToRange(
  v: Date | null,
  min: Date | null,
  max: Date | null,
): Date | null {
  if (v == null) return null;
  if (min && v.getTime() < min.getTime()) return new Date(min.getTime());
  if (max && v.getTime() > max.getTime()) return new Date(max.getTime());
  return v;
}

function resolveAnchorElement(
  anchor: ResolvedAnchor,
  host: HTMLElement,
): HTMLElement | null {
  if (anchor === false || anchor == null) return null;
  if (anchor === true) return host;
  if (typeof anchor === 'string') {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>(anchor);
  }
  if (anchor instanceof HTMLElement) return anchor;
  return null;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoDatePicker {
  private _element: HTMLElement | null;
  private _opts: RequiredArvoDatePickerOptions;

  // Resolved locale + format (computed once per locale/format change).
  private _effLocale: string;
  private _effFormat: string;

  // Identity / ids
  private readonly _id: string;
  private readonly _inputId: string;
  private readonly _labelId: string;
  private readonly _errorId: string;
  private readonly _popoverId: string;

  // State
  private _committedValue: Date | null = null;
  private _isOpen = false;
  private _visibleYear: number;
  private _visibleMonth: number;
  private _viewMode: ArvoCalendarViewMode = 'days';
  private _errorOverride: string | null = null;
  private _loadingOverride: boolean | null = null;
  private _hasTextSelected = false;
  private _preFocusValue: Date | null = null;
  private _inputFocused = false;

  // Anchor mode
  private _useAnchorRender = false;
  private _anchorEl: HTMLElement | null = null;

  // DOM refs
  private _labelEl: HTMLElement | null = null;
  private _fieldEl: HTMLElement | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _actionsEl: HTMLElement | null = null;
  private _clearBtnEl: HTMLButtonElement | null = null;
  private _triggerBtnEl: HTMLButtonElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errMsgEl: HTMLElement | null = null;
  private _borderEl: HTMLElement | null = null;

  // Popover
  private _popoverEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _bodyEl: HTMLElement | null = null;

  // Inner instances
  private _clearBtn: ArvoIconButton | null = null;
  private _triggerBtn: ArvoIconButton | null = null;
  private _errIco: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _calNav: CalendarNav | null = null;
  private _calendar: ArvoCalendar | null = null;
  private _segmentCtrl: SegmentController | null = null;

  // Overlay surface (engine) -- owns portal, hub registration, positioning,
  // focus trap, outside-click + Escape dismissal, and enter/exit fade.
  private _surface: OverlaySurface | null = null;
  // Engine close-routing flag. The engine's `onClose` callback fires both
  // for programmatic close paths (this.close()) AND for engine-driven
  // dismissal (outside-click, hub Escape). When a programmatic close is in
  // flight we set this flag so the engine's onClose hook becomes a no-op
  // for cancellable-event work (we already dispatched dp:close); when the
  // engine drives the close (outside-click / Escape), the flag is false and
  // the hook owns the silent close-side bookkeeping.
  private _closingProgrammatically = false;

  private _resizeObserver: ResizeObserver | null = null;

  // Bound handlers
  private _boundInputKeyDown: (e: KeyboardEvent) => void;
  private _boundInputFocus: () => void;
  private _boundInputBlur: () => void;
  private _boundInputMouseDown: () => void;
  private _boundInputPaste: (e: ClipboardEvent) => void;
  private _boundInputChange: () => void;
  private _boundAnchorClick: () => void;
  private _boundAnchorKeyDown: (e: KeyboardEvent) => void;
  private _boundCalCellSelect: (e: Event) => void;
  private _boundCalMonthChange: (e: Event) => void;
  private _boundCalViewModeChange: (e: Event) => void;
  private _boundCalDismiss: () => void;

  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options?: ArvoDatePickerOptions,
  ): ArvoDatePicker {
    return new ArvoDatePicker(element, options ?? {});
  }

  constructor(element: HTMLElement, options: ArvoDatePickerOptions = {}) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError(
        '[ArvoDatePicker] initialize() requires an HTMLElement.',
      );
    }
    this._element = element;

    this._opts = {
      value: options.value,
      defaultValue: options.defaultValue ?? null,
      format: options.format ?? null,
      locale: options.locale ?? null,
      weekStart: options.weekStart ?? 0,
      hasWeeks: options.hasWeeks ?? false,
      minDate: options.minDate ?? null,
      maxDate: options.maxDate ?? null,
      placeholder: options.placeholder ?? null,
      label: options.label ?? null,
      contextHelp: options.contextHelp ?? null,
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
      calendarProps: options.calendarProps ?? null,
      popoverProps: options.popoverProps ?? null,
      onChange: options.onChange ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onBlur: options.onBlur ?? null,
    };


    this._effLocale = getUserLocale(this._opts.locale ?? undefined);
    this._effFormat = this._opts.format || getLocaleDateFormat(this._effLocale);

    const initialValue = this._opts.value ?? this._opts.defaultValue ?? null;
    this._committedValue = coerceDate(initialValue, this._effFormat, this._effLocale);

    // Anchor onto a date inside [minDate, maxDate] when there's no committed
    // value so a bounded picker doesn't open onto a fully-disabled today view.
    const base = pickAnchorDate(
      this._committedValue,
      coerceDate(this._opts.minDate, this._effFormat, this._effLocale),
      coerceDate(this._opts.maxDate, this._effFormat, this._effLocale),
    );
    this._visibleYear = base.getFullYear();
    this._visibleMonth = base.getMonth();

    const idNum = ++_idCounter;
    this._id = `arvo-dp-${idNum}`;
    this._inputId = `${this._id}-input`;
    this._labelId = `${this._id}-lbl`;
    this._errorId = `${this._id}-err`;
    this._popoverId = `${this._id}-popover`;

    // Resolve anchor mode (no-arg true requires a host; we treat host element
    // as the anchor for that case, mirroring the JS-friendly interpretation
    // documented in the implementation outline).
    const anchorRequested = this._opts.anchor !== false && this._opts.anchor != null;
    if (anchorRequested) {
      const resolved = resolveAnchorElement(this._opts.anchor, this._element);
      if (resolved) {
        this._useAnchorRender = true;
        this._anchorEl = resolved;
      } else {
        // String selector with no match: fall back to input mode with a warn.
        if (typeof console !== 'undefined') {
          console.warn(
            '[ArvoDatePicker] anchor did not resolve to an element; falling back to input mode.',
          );
        }
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
    this._boundCalCellSelect = this._handleCalCellSelect.bind(this);
    this._boundCalMonthChange = this._handleCalMonthChange.bind(this);
    this._boundCalViewModeChange = this._handleCalViewModeChange.bind(this);
    this._boundCalDismiss = this._handleCalDismiss.bind(this);

    // Build DOM (anchor mode skips field/label/input/border/err-msg).
    if (this._useAnchorRender) {
      this._renderDomAnchor();
    } else {
      this._renderDomInput();
      this._initSegmentController();
      this._observeActions();
    }

    this._applyWidth();
    this._syncRootClasses();
    this._updateInputDisplay();
  }

  // -------------------------------------------------------------------------
  // DOM construction (input mode)
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
      this._labelEl.classList.add('arvo-dp__lbl');
      root.appendChild(this._labelEl);
    }

    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-dp__field';

    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.id = this._inputId;
    this._inputEl.className = 'arvo-dp__input';
    this._inputEl.setAttribute('role', 'combobox');
    this._inputEl.setAttribute('autocomplete', 'off');
    this._inputEl.setAttribute('aria-haspopup', 'dialog');
    this._inputEl.setAttribute('aria-expanded', 'false');
    this._inputEl.setAttribute('aria-controls', this._popoverId);
    if (this._opts.placeholder) {
      this._inputEl.placeholder = this._opts.placeholder;
    }
    if (this._opts.isDisabled) {
      this._inputEl.disabled = true;
      this._inputEl.setAttribute('aria-disabled', 'true');
    }
    // Segmented input is always readonly (typing is intercepted via keydown);
    // free-text mode is editable.
    if (this._opts.isReadOnly || this._opts.isSegmented) {
      this._inputEl.readOnly = true;
    }
    if (this._opts.isRequired) {
      this._inputEl.setAttribute('aria-required', 'true');
    }
    if (this._effError() != null) {
      this._inputEl.setAttribute('aria-invalid', 'true');
    }
    if (this._effLoading()) {
      this._inputEl.setAttribute('aria-busy', 'true');
    }
    if (this._labelEl) {
      this._inputEl.setAttribute('aria-labelledby', this._labelId);
    }

    // The input intentionally has NO click handler -- clicking the field
    // should focus the segments, not open the popover. Click-to-segment is
    // wired via mousedown so the picker can map the clicked caret offset to
    // a specific segment. The popover is only opened via the calendar icon
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
    this._actionsEl.className = 'arvo-dp__actions';
    this._fieldEl.appendChild(this._actionsEl);

    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-dp__border';
    this._fieldEl.appendChild(this._borderEl);

    root.appendChild(this._fieldEl);

    this._renderActions();
    this._renderInlineError();
  }

  private _renderDomAnchor(): void {
    const root = this._element!;
    root.id = this._id;

    if (this._anchorEl) {
      this._anchorEl.setAttribute('aria-haspopup', 'dialog');
      this._anchorEl.setAttribute('aria-expanded', 'false');
      this._anchorEl.setAttribute('aria-controls', this._popoverId);
      this._anchorEl.addEventListener('click', this._boundAnchorClick);
      this._anchorEl.addEventListener('keydown', this._boundAnchorKeyDown);
    }
  }

  // Build the actions overlay (clear + err-ico + trigger-btn). Recomputed
  // whenever value/disabled/readonly/loading/error state changes since the
  // set of visible inner buttons depends on those flags.
  private _renderActions(): void {
    if (!this._actionsEl) return;

    this._clearBtn?.destroy();
    this._clearBtn = null;
    this._triggerBtn?.destroy();
    this._triggerBtn = null;
    this._errIco?.destroy();
    this._errIco = null;
    this._clearBtnEl = null;
    this._triggerBtnEl = null;
    this._errIcoEl = null;
    this._actionsEl.textContent = '';

    const hasValue = this._committedValue != null;
    const disabled = this._opts.isDisabled;
    const readonly = this._opts.isReadOnly;
    const loading = this._effLoading();
    const err = this._effError();
    const showTooltipIcon = err != null && this._opts.errorDisplay === 'tooltip';
    // Action visibility -- mirror the React rules: opt-in clear via
    // isClearable, error icon takes the slot when tooltip mode is on, and
    // the separator only renders when at least one dynamic action is
    // visible (so the trigger sits flush against the field edge otherwise).
    const showClear =
      this._opts.isClearable === true &&
      hasValue &&
      !disabled &&
      !readonly &&
      !loading &&
      !showTooltipIcon;
    const showSep = !loading && (showClear || showTooltipIcon);

    if (showClear) {
      this._clearBtnEl = document.createElement('button') as HTMLButtonElement;
      this._clearBtnEl.classList.add('arvo-dp__clear-btn');
      this._clearBtnEl.setAttribute('tabindex', '-1');
      this._actionsEl.appendChild(this._clearBtnEl);
      this._clearBtn = ArvoIconButton.initialize(this._clearBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'close',
        tooltip: 'Clear',
        onClick: (e: Event) => {
          e.stopPropagation();
          this.clear();
        },
      });
    }

    if (showTooltipIcon) {
      this._errIco = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: err ?? '',
      });
      this._errIcoEl = this._errIco.el;
      this._errIcoEl.classList.add('arvo-dp__err-ico');
      this._actionsEl.appendChild(this._errIcoEl);
    }

    if (showSep) {
      const sep = document.createElement('span');
      sep.className = 'arvo-dp__sep';
      sep.setAttribute('aria-hidden', 'true');
      this._actionsEl.appendChild(sep);
    }

    if (!loading) {
      this._triggerBtnEl = document.createElement('button') as HTMLButtonElement;
      this._triggerBtnEl.classList.add('arvo-dp__trigger-btn');
      this._triggerBtnEl.setAttribute('aria-haspopup', 'dialog');
      this._triggerBtnEl.setAttribute('aria-controls', this._popoverId);
      this._triggerBtnEl.setAttribute('aria-expanded', String(this._isOpen));
      this._actionsEl.appendChild(this._triggerBtnEl);
      this._triggerBtn = ArvoIconButton.initialize(this._triggerBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'calendar-o',
        tooltip: 'Select date',
        isDisabled: disabled || readonly,
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
        this._errMsgEl.classList.add('arvo-dp__err-msg');
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
      value: this._committedValue,
      min: this._asDate(this._opts.minDate),
      max: this._asDate(this._opts.maxDate),
      commit: 'blur',
    });
    this._segmentCtrl.on('commit', (payload) => {
      const next = (payload as { date: Date | null }).date;
      this._handleCommit(next);
    });
    this._segmentCtrl.on('segment', () => {
      const focused = this._segmentCtrl?.getFocusedSegment() ?? null;
      const newFlag = focused != null;
      if (newFlag !== this._hasTextSelected) {
        this._hasTextSelected = newFlag;
        this._syncRootClasses();
      }
    });
    this._segmentCtrl.on('change', () => {
      this._refreshInputFromController();
    });
  }

  // -------------------------------------------------------------------------
  // Resize observer (--arvo-form-input-pad-r)
  // -------------------------------------------------------------------------

  private _observeActions(): void {
    if (!this._actionsEl) return;
    this._resizeObserver = new ResizeObserver(() => this._updatePadding());
    this._resizeObserver.observe(this._actionsEl);
    this._updatePadding();
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    const pad = w > 0 ? w + 4 : 0;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${pad}px`);
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
    const opts = this._opts;
    const err = this._effError();
    const loading = this._effLoading();

    const classes = [
      'arvo-dp',
      `arvo-dp--${opts.size}`,
      `arvo-dp--surface-${opts.surface}`,
      opts.isFullWidth && 'arvo-dp--full-width',
      opts.hasWeeks && 'arvo-dp--show-weeks',
      this._useAnchorRender && 'arvo-dp--anchor-mode',
      loading && 'loading',
      opts.isDisabled && 'is-disabled',
      opts.isReadOnly && 'is-readonly',
      err != null && 'has-error',
      err != null && opts.errorDisplay === 'tooltip' && 'error-tooltip',
      this._committedValue != null && 'has-value',
      this._hasTextSelected && 'has-text-selected',
      this._isOpen && 'open',
    ].filter(Boolean) as string[];

    this._element.className = classes.join(' ');

    if (this._inputEl) {
      this._inputEl.setAttribute('aria-expanded', String(this._isOpen));
      if (err != null) this._inputEl.setAttribute('aria-invalid', 'true');
      else this._inputEl.removeAttribute('aria-invalid');
      if (loading) this._inputEl.setAttribute('aria-busy', 'true');
      else this._inputEl.removeAttribute('aria-busy');
      if (opts.isDisabled) {
        this._inputEl.disabled = true;
        this._inputEl.setAttribute('aria-disabled', 'true');
      } else {
        this._inputEl.disabled = false;
        this._inputEl.removeAttribute('aria-disabled');
      }
      this._inputEl.readOnly = opts.isReadOnly || opts.isSegmented;
    }

    if (this._triggerBtnEl) {
      this._triggerBtnEl.setAttribute('aria-expanded', String(this._isOpen));
    }

    if (this._useAnchorRender && this._anchorEl) {
      this._anchorEl.setAttribute('aria-expanded', String(this._isOpen));
    }
  }

  // -------------------------------------------------------------------------
  // Effective state accessors (merge override flags)
  // -------------------------------------------------------------------------

  private _effError(): string | null {
    if (this._errorOverride != null) return this._errorOverride;
    if (this._opts.isInvalid) return this._opts.errorMsg;
    return null;
  }

  private _effLoading(): boolean {
    return this._loadingOverride ?? this._opts.isLoading;
  }

  private _asDate(v: Date | string | null): Date | null {
    return coerceDate(v, this._effFormat, this._effLocale);
  }

  // -------------------------------------------------------------------------
  // Input display updates
  // -------------------------------------------------------------------------

  private _updateInputDisplay(): void {
    if (!this._inputEl) return;
    if (this._opts.isSegmented && this._segmentCtrl) {
      this._inputEl.value = this._segmentCtrl.getFormattedDisplay(this._inputFocused);
    } else {
      this._inputEl.value = this._committedValue
        ? formatDate(this._committedValue, this._effFormat, this._effLocale)
        : '';
    }
  }

  private _refreshInputFromController(): void {
    if (!this._inputEl || !this._segmentCtrl) return;
    this._inputEl.value = this._segmentCtrl.getFormattedDisplay(this._inputFocused);
    this._restoreCaretToFocusedSegment();
  }

  private _restoreCaretToFocusedSegment(): void {
    if (!this._inputEl || !this._segmentCtrl) return;
    const seg = this._segmentCtrl.getFocusedSegment();
    if (!seg) return;
    try {
      this._inputEl.setSelectionRange(seg.startOffset, seg.endOffset);
    } catch {
      // setSelectionRange can throw on input types that don't support it;
      // safe to ignore -- caret positioning is best-effort.
    }
  }

  // -------------------------------------------------------------------------
  // Commit / change dispatch
  // -------------------------------------------------------------------------

  private _handleCommit(next: Date | null): boolean {
    const clamped = clampToRange(
      next,
      this._asDate(this._opts.minDate),
      this._asDate(this._opts.maxDate),
    );
    if (sameDay(clamped, this._committedValue)) return false;
    this._committedValue = clamped;
    if (clamped) {
      this._visibleYear = clamped.getFullYear();
      this._visibleMonth = clamped.getMonth();
      this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
      this._calendar?.update({
        visibleYear: this._visibleYear,
        visibleMonth: this._visibleMonth,
        selectedDate: clamped,
      });
    } else {
      this._calendar?.update({ selectedDate: null });
    }
    this._segmentCtrl?.setValue(clamped, { silent: true });
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();

    const detail = {
      value: clamped,
      formattedValue: clamped
        ? formatDate(clamped, this._effFormat, this._effLocale)
        : '',
    };
    this._opts.onChange?.(detail);
    this._element?.dispatchEvent(
      new CustomEvent('dp:change', {
        bubbles: true,
        cancelable: false,
        detail,
      }),
    );
    return true;
  }

  // -------------------------------------------------------------------------
  // Trigger / clear / input handlers
  // -------------------------------------------------------------------------

  private _handleTriggerClick(): void {
    if (this._effLoading()) return;
    if (this._opts.isDisabled || this._opts.isReadOnly) return;
    if (this._isOpen) this.close();
    else this.open();
  }

  private _handleInputFocus(): void {
    this._inputFocused = true;
    this._preFocusValue = this._committedValue;
    if (this._opts.isSegmented && this._segmentCtrl) {
      if (this._inputEl) {
        this._inputEl.value = this._segmentCtrl.getFormattedDisplay(true);
      }
      this._segmentCtrl.focusSegment(0);
      this._restoreCaretToFocusedSegment();
    }
  }

  /**
   * Click-to-segment: maps the mousedown caret offset to a segment index so
   * users can click on (for example) the `dd` segment in `MM/dd/yyyy` and
   * land directly on the day instead of the first segment. The browser sets
   * `selectionStart` from the click position even on readOnly inputs; we
   * defer one frame so the value is stable before reading.
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
        this._restoreCaretToFocusedSegment();
      }
    });
  }

  private _handleInputBlur(): void {
    this._inputFocused = false;
    if (this._opts.isSegmented && this._segmentCtrl) {
      // setFocused(false) is signalled implicitly by getFormattedDisplay(false)
      // path; the controller's blur commit (commit: 'blur') triggers its own
      // 'commit' event which routes through _handleCommit().
      if (this._inputEl) {
        this._inputEl.value = this._segmentCtrl.getFormattedDisplay(false);
      }
    } else {
      const parsed = parseDate(
        this._inputEl?.value ?? '',
        this._effFormat,
        this._effLocale,
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

  private _handleInputChange(): void {
    // Free-text mode only -- isSegmented input is intercepted via keydown.
    // We intentionally don't commit on every keystroke; commit happens on
    // Enter or blur.
  }

  private _handleInputKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this._isOpen) this.open();
      return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._isOpen) this.close();
      return;
    }

    if (this._opts.isSegmented && this._segmentCtrl) {
      const ctrl = this._segmentCtrl;
      const key = e.key;

      if (key === 'Escape') {
        e.preventDefault();
        ctrl.handleKey({ key: 'Escape' });
        if (this._inputFocused) {
          if (this._inputEl) {
            this._inputEl.value = ctrl.getFormattedDisplay(true);
          }
          ctrl.focusSegment(0);
          this._restoreCaretToFocusedSegment();
        } else {
          this._updateInputDisplay();
        }
        if (this._isOpen) this.close();
        return;
      }
      if (key === 'Tab') {
        const res = ctrl.handleKey({ key: 'Tab', shiftKey: e.shiftKey });
        if (res.consumed) {
          e.preventDefault();
          this._refreshInputFromController();
        }
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        const before = this._committedValue;
        ctrl.handleKey({ key: 'Enter' });
        this._refreshInputFromController();
        const changed = !sameDay(before, this._committedValue);
        if (this._isOpen && this._opts.isAutoClose && changed) this.close();
        return;
      }
      if (
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'Home' ||
        key === 'End' ||
        key === 'Backspace' ||
        key === 'Delete'
      ) {
        const res = ctrl.handleKey({ key });
        if (res.consumed) {
          e.preventDefault();
          this._refreshInputFromController();
        }
        return;
      }
      if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (/^[0-9]$/.test(key)) {
          const res = ctrl.handleDigit(key);
          if (res.consumed) {
            e.preventDefault();
            this._refreshInputFromController();
          }
          return;
        }
        if (/^[A-Za-z]$/.test(key)) {
          const res = ctrl.handleLetter(key);
          if (res.consumed) {
            e.preventDefault();
            this._refreshInputFromController();
          }
          return;
        }
      }
      return;
    }

    // Free-text mode
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseDate(
        this._inputEl?.value ?? '',
        this._effFormat,
        this._effLocale,
      );
      if (parsed) {
        const before = this._committedValue;
        const changed = this._handleCommit(parsed);
        if (
          this._isOpen &&
          this._opts.isAutoClose &&
          changed &&
          !sameDay(before, this._committedValue)
        ) {
          this.close();
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this._preFocusValue !== this._committedValue) {
        this._committedValue = this._preFocusValue;
      }
      this._updateInputDisplay();
      if (this._isOpen) this.close();
      return;
    }
  }

  private _handleInputPaste(e: ClipboardEvent): void {
    if (!this._opts.isSegmented || !this._segmentCtrl) return;
    const text = e.clipboardData?.getData('text') ?? '';
    const res = this._segmentCtrl.handlePaste(text);
    if (res.consumed) {
      e.preventDefault();
      this._refreshInputFromController();
    }
  }

  // -------------------------------------------------------------------------
  // Anchor mode handlers
  // -------------------------------------------------------------------------

  private _handleAnchorClick(): void {
    if (this._effLoading()) return;
    if (this._opts.isDisabled || this._opts.isReadOnly) return;
    if (this._isOpen) this.close();
    else this.open();
  }

  private _handleAnchorKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this._isOpen) this.open();
      return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._isOpen) this.close();
      return;
    }
    if (e.key === 'Escape') {
      if (this._isOpen) {
        e.preventDefault();
        this.close();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleAnchorClick();
    }
  }

  // -------------------------------------------------------------------------
  // Popover lifecycle
  // -------------------------------------------------------------------------

  private _buildPopover(): void {
    if (this._popoverEl) return;

    this._popoverEl = document.createElement('div');
    this._popoverEl.className = 'arvo-dp__popover';
    this._popoverEl.id = this._popoverId;
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute('aria-label', 'Choose a date');
    this._popoverEl.setAttribute('aria-modal', 'false');
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = '0';
    this._popoverEl.style.left = '0';
    this._popoverEl.style.margin = '0';
    // Z-index is assigned by the overlay hub when the surface opens; no
    // per-component override is exposed (consistent with Popover, ActionMenu,
    // Drawer, etc.).
    // Hybrid prop surface: popoverProps.width (bag-only) flows through.
    if (this._opts.popoverProps?.width) {
      this._popoverEl.style.width = this._opts.popoverProps.width;
    }

    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-dp__header';
    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-dp__body';
    this._popoverEl.appendChild(this._headerEl);
    this._popoverEl.appendChild(this._bodyEl);
    document.body.appendChild(this._popoverEl);

    this._calNav = CalendarNav.initialize(this._headerEl, {
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode: this._viewMode === 'days' || this._viewMode === 'months' || this._viewMode === 'years'
        ? this._viewMode
        : 'days',
      locale: this._effLocale,
      minDate: this._asDate(this._opts.minDate),
      maxDate: this._asDate(this._opts.maxDate),
      isDisabled: this._opts.isDisabled,
      onPrev: () => this._handleHeaderPrev(),
      onNext: () => this._handleHeaderNext(),
      onToday: () => this._handleHeaderToday(),
      onMonthButtonClick: () =>
        this._setViewMode(this._viewMode === 'months' ? 'days' : 'months'),
      onYearButtonClick: () =>
        this._setViewMode(this._viewMode === 'years' ? 'days' : 'years'),
    });

    // Hybrid prop surface: spread calendarProps first so flat /
    // parent-computed values always win on overlap. Bag-only keys
    // (hasOutsideDays, isKeyboardEnabled, size) flow through.
    this._calendar = ArvoCalendar.initialize(this._bodyEl, {
      ...(this._opts.calendarProps ?? undefined),
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode: this._viewMode,
      locale: this._effLocale,
      weekStart: this._opts.weekStart,
      hasWeeks: this._opts.hasWeeks,
      selectedDate: this._committedValue,
      minDate: this._asDate(this._opts.minDate),
      maxDate: this._asDate(this._opts.maxDate),
    });

    this._bodyEl.addEventListener('cal:select', this._boundCalCellSelect);
    this._bodyEl.addEventListener('cal:month-change', this._boundCalMonthChange);
    this._bodyEl.addEventListener('cal:viewmode-change', this._boundCalViewModeChange);
    this._bodyEl.addEventListener('cal:dismiss', this._boundCalDismiss);
  }

  private _handleCalCellSelect(e: Event): void {
    const detail = (e as CustomEvent).detail as {
      date?: Date;
      mode: ArvoCalendarViewMode;
    };
    if (!detail || !detail.date) return;
    if (detail.mode === 'days') {
      this._handleCommit(detail.date);
      if (this._opts.isAutoClose) this.close();
      return;
    }
    this._visibleYear = detail.date.getFullYear();
    this._visibleMonth = detail.date.getMonth();
    if (detail.mode === 'months') this._setViewMode('days');
    else if (detail.mode === 'years') this._setViewMode('months');
    else this._syncCalendarVisible();
  }

  private _handleCalMonthChange(e: Event): void {
    const detail = (e as CustomEvent).detail as { year: number; month: number };
    if (!detail) return;
    this._visibleYear = detail.year;
    this._visibleMonth = detail.month;
    this._syncCalendarVisible();
  }

  private _handleCalViewModeChange(e: Event): void {
    const detail = (e as CustomEvent).detail as { mode: ArvoCalendarViewMode };
    if (!detail) return;
    this._setViewMode(detail.mode);
  }

  private _handleCalDismiss(): void {
    this.close();
  }

  private _setViewMode(mode: ArvoCalendarViewMode): void {
    this._viewMode = mode;
    if (mode === 'days' || mode === 'months' || mode === 'years') {
      // Push the current visible period to the nav BEFORE switching its
      // view mode -- setViewMode rebuilds the nav's left zone and reads
      // its stored visibleYear/visibleMonth when rendering labels, so the
      // nav must see the latest period first or the freshly rebuilt
      // buttons would carry stale labels.
      this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
      this._calNav?.setViewMode(mode);
    }
    // Push viewMode AND visible period together so a drill-down click
    // (e.g. months -> days on January) lands on the requested period
    // rather than the previously-visible one.
    this._calendar?.update({
      viewMode: mode,
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
    });
  }

  private _syncCalendarVisible(): void {
    this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
    this._calendar?.update({
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
    });
  }

  private _handleHeaderPrev(): void {
    if (this._viewMode === 'days') {
      const d = addMonths(new Date(this._visibleYear, this._visibleMonth, 1), -1);
      this._visibleYear = d.getFullYear();
      this._visibleMonth = d.getMonth();
    } else if (this._viewMode === 'months') {
      this._visibleYear -= 1;
    } else if (this._viewMode === 'years') {
      this._visibleYear -= 10;
    }
    this._syncCalendarVisible();
  }

  private _handleHeaderNext(): void {
    if (this._viewMode === 'days') {
      const d = addMonths(new Date(this._visibleYear, this._visibleMonth, 1), 1);
      this._visibleYear = d.getFullYear();
      this._visibleMonth = d.getMonth();
    } else if (this._viewMode === 'months') {
      this._visibleYear += 1;
    } else if (this._viewMode === 'years') {
      this._visibleYear += 10;
    }
    this._syncCalendarVisible();
  }

  private _handleHeaderToday(): void {
    const today = new Date();
    this._visibleYear = today.getFullYear();
    this._visibleMonth = today.getMonth();
    this._syncCalendarVisible();
  }

  // -------------------------------------------------------------------------
  // Focus trap helpers
  // -------------------------------------------------------------------------

  /**
   * Tab cycle inside the popover (mirrors React's getOrderedPopoverElements).
   * Initial focus is set imperatively to the selected (or today) calendar
   * cell after the engine positions the panel -- see open() rAF block.
   */
  private _getOrderedPopoverElements(): Array<HTMLElement | null> {
    const root = this._popoverEl;
    if (!root) return [];
    const calendarCell = root.querySelector<HTMLElement>(
      '.arvo-cal__cell[tabindex="0"]',
    );
    const prev = root.querySelector<HTMLElement>('.arvo-cal-nav__prev');
    const monthBtn = root.querySelector<HTMLElement>('.arvo-cal-nav__month-btn');
    const yearBtn = root.querySelector<HTMLElement>('.arvo-cal-nav__year-btn');
    const next = root.querySelector<HTMLElement>('.arvo-cal-nav__next');
    const today = root.querySelector<HTMLElement>('.arvo-cal-nav__today');
    return [calendarCell, prev, monthBtn, yearBtn, next, today];
  }

  /**
   * Engine-driven close callback. Fires for outside-click and Escape (via
   * the hub). Per the cross-cutting overlay policy, engine-driven
   * dismissals are unconditional and silent -- no dp:close dispatch, no
   * onClose veto. We still manage focus return here because
   * `_buildPopover` already returns the focus trap with
   * returnFocusOnDeactivate: false (we keep manual focus return for parity
   * with anchor mode).
   */
  private _handleEngineClose = (): void => {
    if (this._closingProgrammatically) {
      // Programmatic close already dispatched dp:close + set state;
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
        console.warn(
          '[ArvoDatePicker] open() ignored while disabled / readOnly / loading.',
        );
      }
      return;
    }
    if (this._opts.onOpen?.() === false) return;

    const ev = new CustomEvent('dp:open', { bubbles: true, cancelable: true });
    const proceed = this._element?.dispatchEvent(ev);
    if (proceed === false) return;

    this._isOpen = true;
    this._buildPopover();

    // Re-center the visible period on the committed value (or an in-range
    // fallback) each time the popover opens. pickAnchorDate prevents a
    // bounded picker from re-centering onto today when today is out of range.
    const base = pickAnchorDate(
      this._committedValue,
      coerceDate(this._opts.minDate, this._effFormat, this._effLocale),
      coerceDate(this._opts.maxDate, this._effFormat, this._effLocale),
    );
    this._visibleYear = base.getFullYear();
    this._visibleMonth = base.getMonth();
    this._syncCalendarVisible();
    this._calendar?.update({ selectedDate: this._committedValue });

    // Hide until the engine's first position update lands (avoid flash);
    // the position.apply callback below clears visibility on first run.
    if (this._popoverEl) {
      this._popoverEl.style.visibility = 'hidden';
    }

    // Build the surface lazily on first open; subsequent opens reuse it via
    // surface.open() (the engine resets transform/visibility on each open).
    if (!this._surface && this._popoverEl) {
      this._surface = createOverlaySurface({
        id: this._id,
        surface: this._popoverEl,
        type: 'dropdown',
        priority: 20,
        trigger:
          (this._useAnchorRender ? this._anchorEl : this._fieldEl) ?? null,
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
          initialFocus: 'none',
          returnFocus: false, // picker manages focus return manually
          getOrderedElements: () => this._getOrderedPopoverElements(),
        },
        transition: 'fade',
        transitionDuration: 150,
        // The engine writes aria-haspopup / aria-controls / aria-expanded on
        // the trigger element (the field in input mode, the anchor in
        // anchor mode). axe rejects aria-haspopup on a generic <div>
        // (aria-allowed-attr), and the picker already wires the canonical
        // combobox ARIA on the role="combobox" <input> (input mode) and on
        // the anchor element (anchor mode) in _renderDomInput /
        // _renderDomAnchor / _syncRootClasses. Disable the engine writes so
        // there's a single source of truth.
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

    // Focus the selected (or in-range fallback) calendar cell after the
    // popover is laid out.
    const focusTarget = pickAnchorDate(
      this._committedValue,
      coerceDate(this._opts.minDate, this._effFormat, this._effLocale),
      coerceDate(this._opts.maxDate, this._effFormat, this._effLocale),
    );
    requestAnimationFrame(() => {
      this._calendar?.focusCell(focusTarget);
    });
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;
    if (this._opts.onClose?.() === false) return;

    const ev = new CustomEvent('dp:close', { bubbles: true, cancelable: true });
    const proceed = this._element?.dispatchEvent(ev);
    if (proceed === false) return;

    this._isOpen = false;

    // Signal the engine onClose hook to skip its silent-close work -- we own
    // the cancellable path, so we sync state + classes + focus return here.
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    this._syncRootClasses();
    this._triggerBtn?.selected(false);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'false');

    if (this._useAnchorRender) {
      this._anchorEl?.focus();
    } else {
      this._inputEl?.focus({ preventScroll: true });
    }
  }

  toggle(force?: boolean): void {
    if (force === undefined) {
      if (this._isOpen) this.close();
      else this.open();
      return;
    }
    if (force && !this._isOpen) this.open();
    else if (!force && this._isOpen) this.close();
  }

  value(): Date | null;
  value(v: Date | string | null): void;
  value(v?: Date | string | null): Date | null | void {
    if (arguments.length === 0) {
      return this._committedValue;
    }
    let coerced: Date | null;
    if (v == null) {
      coerced = null;
    } else if (v instanceof Date) {
      coerced = Number.isNaN(v.getTime()) ? null : v;
    } else if (typeof v === 'string') {
      coerced = parseDate(v, this._effFormat, this._effLocale);
      if (coerced == null && v.length > 0) {
        if (typeof console !== 'undefined') {
          console.warn(
            `[ArvoDatePicker] value(): unparseable string "${v}"; value unchanged.`,
          );
        }
        return;
      }
    } else {
      return;
    }
    this._handleCommit(coerced);
  }

  formattedValue(): string {
    return this._committedValue
      ? formatDate(this._committedValue, this._effFormat, this._effLocale)
      : '';
  }

  clear(): void {
    this._segmentCtrl?.setValue(null, { silent: true });
    this._handleCommit(null);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    if (state === this._opts.isDisabled) return;
    this._opts.isDisabled = state;
    if (state && this._isOpen) this.close();
    this._calNav?.disabled(state);
    this._triggerBtn?.disabled(state || this._opts.isReadOnly);
    this._renderActions();
    this._syncRootClasses();
  }

  setError(message: string | false): void {
    this._errorOverride = message === false ? null : message;
    if (message === false && !this._opts.isInvalid) {
      // Pure clear path -- nothing else to update.
    }
    this._renderActions();
    this._renderInlineError();
    this._syncRootClasses();
  }

  setLoading(loading: boolean): void {
    this._loadingOverride = loading;
    if (loading && this._isOpen) this.close();
    this._renderActions();
    this._syncRootClasses();
  }

  focus(): void {
    if (this._useAnchorRender) {
      this._anchorEl?.focus();
    } else {
      this._inputEl?.focus();
    }
  }

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

    this._segmentCtrl?.destroy();
    this._segmentCtrl = null;

    this._clearBtn?.destroy();
    this._clearBtn = null;
    this._triggerBtn?.destroy();
    this._triggerBtn = null;
    this._errIco?.destroy();
    this._errIco = null;
    this._inlineAlert?.destroy();
    this._inlineAlert = null;

    this._calNav?.destroy();
    this._calNav = null;
    this._calendar?.destroy();
    this._calendar = null;

    if (this._bodyEl) {
      this._bodyEl.removeEventListener('cal:select', this._boundCalCellSelect);
      this._bodyEl.removeEventListener('cal:month-change', this._boundCalMonthChange);
      this._bodyEl.removeEventListener('cal:viewmode-change', this._boundCalViewModeChange);
      this._bodyEl.removeEventListener('cal:dismiss', this._boundCalDismiss);
    }

    if (this._popoverEl) {
      this._popoverEl.remove();
      this._popoverEl = null;
    }

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

    this._labelEl = null;
    this._fieldEl = null;
    this._inputEl = null;
    this._actionsEl = null;
    this._clearBtnEl = null;
    this._triggerBtnEl = null;
    this._errIcoEl = null;
    this._errMsgEl = null;
    this._borderEl = null;
    this._headerEl = null;
    this._bodyEl = null;
    this._anchorEl = null;
    this._element = null;
  }
}

export default ArvoDatePicker;
