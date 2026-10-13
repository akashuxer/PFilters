// Vanilla JS ArvoDateTimePicker.
//
// Combined date+time picker. Form-input-styled trigger plus a composed overlay
// holding ArvoCalendar (344w) + ArvoTimeDropdown (144w) side by side with a
// 2px gap (490px popover total). Single <input> trigger resolves the legacy
// input-vs-div ambiguity. Constraint props: min/max are full datetime;
// startTime/endTime are time-only across all dates.
//
// Descriptor: descriptors/datetime-picker.json
//
// Behavioral parity target:
//   packages/react/src/components/DateTimePicker/DateTimePicker.tsx
// Same BEM classes, ARIA attributes, keyboard map, and event payloads.
//
// Loading Pattern: C -- spinner replaces trigger-btn; popover cannot open.
//
// Events dispatched on the host element:
//   dtp:change -- { value: Date | null, formattedValue: string } -- committed
//   dtp:open   -- {} -- popover opening (cancelable)
//   dtp:close  -- {} -- popover closing (cancelable)

import {
  addMonths,
  applyPositionToSurface,
  createOverlaySurface,
  createSegmentController,
  formatDateTime,
  getLocaleDateFormat,
  getLocaleTimeFormat,
  getUserLocale,
  isSameDay,
  parseDateTime,
  parseTime,
  pickAnchorDate,
  splitDateTimeFormat,
} from '@arvo/core';
import type {
  OverlaySurface,
  PositionResult,
  SegmentController,
  TimeObject,
} from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import ArvoCalendar, { type ArvoCalendarOptions, type ArvoCalendarViewMode } from '../Calendar/Calendar';
import { ArvoTimeDropdown } from '../TimeDropdown/TimeDropdown';
import { CalendarNav } from '../CalendarNav/CalendarNav';
// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Scoped escape-hatch bag for inner `ArvoCalendar` options. Mirrors the
 * React twin. Drift checker enforces parity.
 */
export type DateTimePickerCalendarProps = Pick<
  ArvoCalendarOptions,
  'hasOutsideDays' | 'isKeyboardEnabled' | 'size'
>;

/**
 * Scoped escape-hatch bag for popover surface options. Custom portal,
 * not `ArvoPopover`.
 */
export interface DateTimePickerPopoverProps {
  width?: string;
  offset?: number;
}

export interface ArvoDateTimePickerOptions {
  // -- Value -----------------------------------------------------------------
  /** Current datetime value. Parsed via parseDateTime(value, format, locale). */
  value?: Date | string | null;
  /** Initial value for uncontrolled mode. */
  defaultValue?: Date | string | null;

  // -- Format / Locale -------------------------------------------------------
  /** .NET / Kendo combined date+time format. Empty resolves to locale default. */
  format?: string | null;
  /** BCP-47 locale. */
  locale?: string | null;

  // -- Calendar options ------------------------------------------------------
  /** First day of week. 0=Sunday, 1=Monday, ... 6=Saturday. */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Show weeks column in the calendar. Adds arvo-dtp--show-weeks modifier. */
  hasWeeks?: boolean;

  // -- Time options ----------------------------------------------------------
  /** TimeDropdown interval in minutes. Default 15. */
  interval?: number;

  // -- Constraints -----------------------------------------------------------
  /**
   * Full datetime min (inclusive). The time portion is enforced ONLY on the
   * boundary date; other dates accept any time.
   */
  min?: Date | string | null;
  /** Full datetime max (inclusive). Same boundary semantics as `min`. */
  max?: Date | string | null;
  /** Time-only floor applied across ALL dates (e.g. business hours start). */
  startTime?: TimeObject | string | null;
  /** Time-only ceiling applied across ALL dates (e.g. business hours end). */
  endTime?: TimeObject | string | null;

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
  /** Trigger size. Applies arvo-dtp--sm or arvo-dtp--lg modifier. */
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
  /** Shorthand for width="100%". Applies arvo-dtp--full-width modifier. */
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
  /** Opt-in clear button (default `false`). */
  isClearable?: boolean;

  // -- Behavior --------------------------------------------------------------
  /**
   * Auto-close on selection. Defaults FALSE for DateTimePicker (different
   * from Date/Time Picker) so users can set both portions before closing.
   * When true, closes ONLY when BOTH date AND time have been touched since
   * the last open.
   */
  isAutoClose?: boolean;
  /** Reject partial format parses. */
  isStrictParsing?: boolean;
  /** Use combined isSegmented input editing in the trigger. */
  isSegmented?: boolean;
  /**
   * Overlay-only mode. Pass a host element / CSS selector to bind without
   * rendering an input. Applies arvo-dtp--anchor-mode modifier.
   */
  anchor?: false | true | HTMLElement | string;
  /** Popover placement relative to the trigger. */
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';

  // -- Scoped escape-hatch bags ---------------------------------------------
  /** Inner ArvoCalendar config; flat options win on overlap. */
  calendarProps?: DateTimePickerCalendarProps;
  /** Popover surface options (custom portal). Flat opts win on overlap. */
  popoverProps?: DateTimePickerPopoverProps;

  // -- Callbacks -------------------------------------------------------------
  /** Called when the committed datetime value changes. */
  onChange?: (payload: { value: Date | null; formattedValue: string }) => void;
  /** Called when popover is about to open. Return false to cancel. */
  onOpen?: () => boolean | void;
  /** Called when popover is about to close. Return false to cancel. */
  onClose?: () => boolean | void;
  /** Called on trigger blur. */
  onBlur?: () => void;
}

type ResolvedAnchor = false | true | HTMLElement | string;

interface RequiredArvoDateTimePickerOptions {
  value: Date | string | null | undefined;
  defaultValue: Date | string | null;
  format: string | null;
  locale: string | null;
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasWeeks: boolean;
  interval: number;
  min: Date | string | null;
  max: Date | string | null;
  startTime: TimeObject | string | null;
  endTime: TimeObject | string | null;
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
  calendarProps: DateTimePickerCalendarProps | null;
  popoverProps: DateTimePickerPopoverProps | null;
  onChange: ((p: { value: Date | null; formattedValue: string }) => void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onBlur: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

const ZERO_TIME: TimeObject = { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };

function coerceDateTime(
  v: Date | string | null | undefined,
  format: string,
  locale: string,
): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    if (v.length === 0) return null;
    return parseDateTime(v, format, locale);
  }
  return null;
}

function normalizeTime(v: TimeObject): TimeObject | null {
  const hours = Math.trunc(v.hours);
  const minutes = Math.trunc(v.minutes);
  const seconds = v.seconds == null ? 0 : Math.trunc(v.seconds);
  const milliseconds = v.milliseconds == null ? 0 : Math.trunc(v.milliseconds);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (seconds < 0 || seconds > 59) return null;
  if (milliseconds < 0 || milliseconds > 999) return null;
  return { hours, minutes, seconds, milliseconds };
}

function coerceTime(
  v: TimeObject | string | null | undefined,
  timeFormat: string,
): TimeObject | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    if (v.length === 0) return null;
    return parseTime(v, timeFormat);
  }
  return normalizeTime(v);
}

function sameInstant(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.getTime() === b.getTime();
}

function getTimePart(d: Date | null): TimeObject | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return {
    hours: d.getHours(),
    minutes: d.getMinutes(),
    seconds: d.getSeconds(),
    milliseconds: d.getMilliseconds(),
  };
}

function mergeDateAndTime(d: Date, t: TimeObject): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    t.hours,
    t.minutes,
    t.seconds ?? 0,
    t.milliseconds ?? 0,
  );
}

function dayOf(d: Date | null): Date | null {
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function totalMillis(t: TimeObject): number {
  return (((t.hours * 60 + t.minutes) * 60 + (t.seconds ?? 0)) * 1000) +
    (t.milliseconds ?? 0);
}

function laterTime(a: TimeObject | null, b: TimeObject | null): TimeObject | null {
  if (!a) return b;
  if (!b) return a;
  return totalMillis(a) >= totalMillis(b) ? a : b;
}

function earlierTime(a: TimeObject | null, b: TimeObject | null): TimeObject | null {
  if (!a) return b;
  if (!b) return a;
  return totalMillis(a) <= totalMillis(b) ? a : b;
}

// Lower-bound time for a given calendar day. min's time is enforced only on
// its own calendar day; startTime always applies. LATER wins (most restrictive).
function getEffectiveMinTimeForDate(
  date: Date | null,
  min: Date | null,
  startTime: TimeObject | null,
): TimeObject | null {
  const onMinDay = date && min && isSameDay(date, min);
  const minPart = onMinDay ? getTimePart(min) : null;
  return laterTime(minPart, startTime);
}

// Upper-bound time for a given calendar day. max's time is enforced only on
// its own calendar day; endTime always applies. EARLIER wins (most restrictive).
function getEffectiveMaxTimeForDate(
  date: Date | null,
  max: Date | null,
  endTime: TimeObject | null,
): TimeObject | null {
  const onMaxDay = date && max && isSameDay(date, max);
  const maxPart = onMaxDay ? getTimePart(max) : null;
  return earlierTime(maxPart, endTime);
}

function clampToBounds(
  v: Date | null,
  min: Date | null,
  max: Date | null,
  startTime: TimeObject | null,
  endTime: TimeObject | null,
): Date | null {
  if (!v) return null;
  let result = new Date(v.getTime());
  if (min && result.getTime() < min.getTime()) result = new Date(min.getTime());
  if (max && result.getTime() > max.getTime()) result = new Date(max.getTime());
  const effMin = getEffectiveMinTimeForDate(result, min, startTime);
  const effMax = getEffectiveMaxTimeForDate(result, max, endTime);
  const tPart = getTimePart(result);
  if (effMin && tPart && totalMillis(tPart) < totalMillis(effMin)) {
    result = mergeDateAndTime(result, effMin);
  }
  if (effMax && tPart && totalMillis(tPart) > totalMillis(effMax)) {
    result = mergeDateAndTime(result, effMax);
  }
  if (min && result.getTime() < min.getTime()) result = new Date(min.getTime());
  if (max && result.getTime() > max.getTime()) result = new Date(max.getTime());
  return result;
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

export class ArvoDateTimePicker {
  private _element: HTMLElement | null;
  private _opts: RequiredArvoDateTimePickerOptions;

  // Resolved locale + formats (recomputed via _resolveFormats()).
  private _effLocale: string;
  private _effFormat: string;
  private _timeFormat: string;

  // Identity / ids
  private readonly _id: string;
  private readonly _inputId: string;
  private readonly _labelId: string;
  private readonly _errorId: string;
  private readonly _popoverId: string;

  // State
  private _committedValue: Date | null = null;
  // Live preview while the user is editing the isSegmented input. When set,
  // Calendar `selectedDate` and TimeDropdown `value` reflect this instead of
  // the committed value, giving bidirectional sync without committing.
  private _previewValue: Date | null = null;
  private _isOpen = false;
  private _visibleYear: number;
  private _visibleMonth: number;
  private _viewMode: ArvoCalendarViewMode = 'days';
  private _errorOverride: string | null = null;
  private _loadingOverride: boolean | null = null;
  private _hasTextSelected = false;
  private _preFocusValue: Date | null = null;
  private _inputFocused = false;

  // isAutoClose touch trackers. Reset on every open(); isAutoClose only fires
  // when BOTH date and time have been touched in the current session.
  private _dateTouched = false;
  private _timeTouched = false;

  // Anchor mode
  private _useAnchorRender = false;
  private _anchorEl: HTMLElement | null = null;

  // DOM refs (root / field / actions)
  private _labelEl: HTMLElement | null = null;
  private _fieldEl: HTMLElement | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _actionsEl: HTMLElement | null = null;
  private _clearBtnEl: HTMLButtonElement | null = null;
  private _triggerBtnEl: HTMLButtonElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errMsgEl: HTMLElement | null = null;

  // Popover
  // _popoverWrapperEl: display:contents div that carries modifier classes
  // (arvo-dtp, --sm/lg, --show-weeks, --full-width, loading) so the SCSS
  // `--arvo-dtp-popover-w` cascade reaches _popoverEl. Mirrors React's
  // `popoverRootClass` wrapper exactly. Mounted once on document.body in
  // _buildPopover(); the engine mounts/unmounts _popoverEl inside it.
  private _popoverWrapperEl: HTMLElement | null = null;
  private _popoverEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _bodyEl: HTMLElement | null = null;
  private _calHostEl: HTMLElement | null = null;
  private _timeHostEl: HTMLElement | null = null;

  // Inner instances
  private _clearBtn: ArvoIconButton | null = null;
  private _triggerBtn: ArvoIconButton | null = null;
  private _errIco: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _calNav: CalendarNav | null = null;
  private _calendar: ArvoCalendar | null = null;
  private _timeDropdown: ArvoTimeDropdown | null = null;
  private _segmentCtrl: SegmentController | null = null;

  // OverlaySurface engine (built lazily on first open; reused for subsequent
  // opens via surface.open()).
  private _surface: OverlaySurface | null = null;
  // Set true during programmatic close() so _handleEngineClose knows not to
  // repeat state sync that close() already did.
  private _closingProgrammatically = false;

  private _resizeObserver: ResizeObserver | null = null;

  // Bound handlers
  private _boundInputKeyDown: (e: KeyboardEvent) => void;
  private _boundInputFocus: () => void;
  private _boundInputBlur: () => void;
  private _boundInputMouseDown: () => void;
  private _boundInputPaste: (e: ClipboardEvent) => void;
  private _boundAnchorClick: () => void;
  private _boundAnchorKeyDown: (e: KeyboardEvent) => void;

  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options?: ArvoDateTimePickerOptions,
  ): ArvoDateTimePicker {
    return new ArvoDateTimePicker(element, options ?? {});
  }

  constructor(element: HTMLElement, options: ArvoDateTimePickerOptions = {}) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError(
        '[ArvoDateTimePicker] initialize() requires an HTMLElement.',
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
      interval: options.interval ?? 15,
      min: options.min ?? null,
      max: options.max ?? null,
      startTime: options.startTime ?? null,
      endTime: options.endTime ?? null,
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
      // DateTimePicker overrides isAutoClose default to FALSE so users can set
      // both date and time portions before the popover closes.
      isAutoClose: options.isAutoClose ?? false,
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
    this._effFormat =
      this._opts.format && this._opts.format.length > 0
        ? this._opts.format
        : `${getLocaleDateFormat(this._effLocale)} ${getLocaleTimeFormat(this._effLocale)}`;
    this._timeFormat = this._resolveTimeFormat(this._effFormat);

    const initialValue = this._opts.value ?? this._opts.defaultValue ?? null;
    this._committedValue = clampToBounds(
      coerceDateTime(initialValue, this._effFormat, this._effLocale),
      this._asDate(this._opts.min),
      this._asDate(this._opts.max),
      this._asTime(this._opts.startTime),
      this._asTime(this._opts.endTime),
    );

    // Anchor onto an in-range date when no committed value, so a bounded
    // picker doesn't open onto a fully-disabled today view.
    const base = pickAnchorDate(
      this._committedValue,
      this._asDate(this._opts.min),
      this._asDate(this._opts.max),
    );
    this._visibleYear = base.getFullYear();
    this._visibleMonth = base.getMonth();

    const idNum = ++_idCounter;
    this._id = `arvo-dtp-${idNum}`;
    this._inputId = `${this._id}-input`;
    this._labelId = `${this._id}-lbl`;
    this._errorId = `${this._id}-err`;
    this._popoverId = `${this._id}-popover`;

    // Anchor mode: a truthy anchor that resolves to an element switches the
    // root into overlay-only rendering. Falls back to input mode with a warn.
    const anchorRequested = this._opts.anchor !== false && this._opts.anchor != null;
    if (anchorRequested) {
      const resolved = resolveAnchorElement(this._opts.anchor, this._element);
      if (resolved) {
        this._useAnchorRender = true;
        this._anchorEl = resolved;
      } else if (typeof console !== 'undefined') {
        console.warn(
          '[ArvoDateTimePicker] anchor did not resolve to an element; falling back to input mode.',
        );
      }
    }

    this._boundInputKeyDown = this._handleInputKeyDown.bind(this);
    this._boundInputFocus = this._handleInputFocus.bind(this);
    this._boundInputBlur = this._handleInputBlur.bind(this);
    this._boundInputMouseDown = this._handleInputMouseDown.bind(this);
    this._boundInputPaste = this._handleInputPaste.bind(this);
    this._boundAnchorClick = this._handleAnchorClick.bind(this);
    this._boundAnchorKeyDown = this._handleAnchorKeyDown.bind(this);

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
      this._labelEl.classList.add('arvo-dtp__lbl');
      root.appendChild(this._labelEl);
    }

    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-dtp__field';

    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.id = this._inputId;
    this._inputEl.className = 'arvo-dtp__input';
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

    // No click handler on the input -- clicking focuses segments, doesn't
    // open the popover. Click-to-segment is wired via mousedown so the
    // picker can map the clicked caret offset to a specific segment. Use
    // the calendar icon or Alt+ArrowDown to open the popover.
    this._inputEl.addEventListener('keydown', this._boundInputKeyDown);
    this._inputEl.addEventListener('focus', this._boundInputFocus);
    this._inputEl.addEventListener('blur', this._boundInputBlur);
    if (this._opts.isSegmented) {
      this._inputEl.addEventListener('mousedown', this._boundInputMouseDown);
      this._inputEl.addEventListener('paste', this._boundInputPaste);
    }
    this._fieldEl.appendChild(this._inputEl);

    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-dtp__actions';
    this._fieldEl.appendChild(this._actionsEl);

    const borderEl = document.createElement('div');
    borderEl.className = 'arvo-dtp__border';
    this._fieldEl.appendChild(borderEl);

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
      this._clearBtnEl.classList.add('arvo-dtp__clear-btn');
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
      this._errIcoEl.classList.add('arvo-dtp__err-ico');
      this._actionsEl.appendChild(this._errIcoEl);
    }

    if (showSep) {
      const sep = document.createElement('span');
      sep.className = 'arvo-dtp__sep';
      sep.setAttribute('aria-hidden', 'true');
      this._actionsEl.appendChild(sep);
    }

    if (!loading) {
      this._triggerBtnEl = document.createElement('button') as HTMLButtonElement;
      this._triggerBtnEl.classList.add('arvo-dtp__trigger-btn');
      this._triggerBtnEl.setAttribute('aria-haspopup', 'dialog');
      this._triggerBtnEl.setAttribute('aria-controls', this._popoverId);
      this._triggerBtnEl.setAttribute('aria-expanded', String(this._isOpen));
      this._actionsEl.appendChild(this._triggerBtnEl);
      this._triggerBtn = ArvoIconButton.initialize(this._triggerBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'calendar-o',
        tooltip: 'Select date and time',
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
        this._errMsgEl.classList.add('arvo-dtp__err-msg');
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
      min: this._asDate(this._opts.min),
      max: this._asDate(this._opts.max),
      commit: 'blur',
      minuteInterval: this._opts.interval,
    });
    this._segmentCtrl.on('commit', (payload) => {
      const next = (payload as { date: Date | null }).date;
      this._previewValue = null;
      this._commitValue(next);
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
      // Bidirectional sync: each segment edit updates a preview value that
      // Calendar's selectedDate and TimeDropdown's value mirror in real time.
      const next = this._segmentCtrl?.getValue().date ?? null;
      if (next) {
        this._previewValue = clampToBounds(
          next,
          this._asDate(this._opts.min),
          this._asDate(this._opts.max),
          this._asTime(this._opts.startTime),
          this._asTime(this._opts.endTime),
        );
      } else {
        this._previewValue = null;
      }
      this._refreshInputFromController();
      this._syncLivePanels();
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
      'arvo-dtp',
      `arvo-dtp--${opts.size}`,
      `arvo-dtp--surface-${opts.surface}`,
      opts.isFullWidth && 'arvo-dtp--full-width',
      opts.hasWeeks && 'arvo-dtp--show-weeks',
      this._useAnchorRender && 'arvo-dtp--anchor-mode',
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
      if (err != null || opts.isInvalid) this._inputEl.setAttribute('aria-invalid', 'true');
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

    this._syncPopoverWrapperClasses();
  }

  /**
   * Keeps the display:contents wrapper's modifier classes in sync so the
   * `--arvo-dtp-popover-w` CSS variable cascade matches React's
   * `popoverRootClass` wrapper (`arvo-dtp`, size, --full-width, --show-weeks,
   * loading). Called from _syncRootClasses() and _buildPopover().
   */
  private _syncPopoverWrapperClasses(): void {
    if (!this._popoverWrapperEl) return;
    const opts = this._opts;
    const loading = this._effLoading();
    const cls = [
      'arvo-dtp',
      `arvo-dtp--${opts.size}`,
      opts.isFullWidth && 'arvo-dtp--full-width',
      opts.hasWeeks && 'arvo-dtp--show-weeks',
      loading && 'loading',
    ].filter(Boolean) as string[];
    this._popoverWrapperEl.className = cls.join(' ');
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
    return coerceDateTime(v, this._effFormat, this._effLocale);
  }

  private _asTime(v: TimeObject | string | null): TimeObject | null {
    return coerceTime(v, this._timeFormat);
  }

  private _resolveTimeFormat(combined: string): string {
    const split = splitDateTimeFormat(combined);
    return split.timePart && split.timePart.length > 0
      ? split.timePart
      : getLocaleTimeFormat(this._effLocale);
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
        ? formatDateTime(this._committedValue, this._effFormat, this._effLocale)
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
  // Live preview / panel sync
  // -------------------------------------------------------------------------

  // The "live" value drives Calendar `selectedDate` and TimeDropdown `value`
  // while the isSegmented input is being edited. previewValue takes precedence
  // so the visualization tracks each digit before commit.
  private _liveValue(): Date | null {
    return this._previewValue ?? this._committedValue;
  }

  // Date used to compute the per-day effective time bounds for TimeDropdown.
  // Falls back to the visible month when nothing is selected so the bounds
  // remain consistent with what the user sees in the calendar.
  private _liveDateForBounds(): Date {
    return this._liveValue() ?? new Date(this._visibleYear, this._visibleMonth, 1);
  }

  // Recenter the visible month + refresh both inner views to match liveValue.
  // Called whenever previewValue / committedValue changes.
  private _syncLivePanels(): void {
    const live = this._liveValue();
    if (live) {
      const y = live.getFullYear();
      const m = live.getMonth();
      if (y !== this._visibleYear || m !== this._visibleMonth) {
        this._visibleYear = y;
        this._visibleMonth = m;
        this._calNav?.setVisibleMonth(y, m);
        this._calendar?.update({ visibleYear: y, visibleMonth: m });
      }
    }
    this._syncCalendarSelected();
    this._syncTimeDropdownValue();
  }

  private _syncCalendarSelected(): void {
    if (!this._calendar) return;
    this._calendar.update({ selectedDate: this._liveValue() });
  }

  // Tracks the last "boundary signature" used to build the TimeDropdown so
  // we can avoid full teardown+recreate when only the time portion changes
  // (boundary day, min/max, interval -- everything that needs a rebuild).
  private _tdSignature = '';

  private _buildTdSignature(
    liveDate: Date,
    effMin: TimeObject | null,
    effMax: TimeObject | null,
  ): string {
    const day = `${liveDate.getFullYear()}-${liveDate.getMonth()}-${liveDate.getDate()}`;
    const min = effMin ? totalMillis(effMin) : 'x';
    const max = effMax ? totalMillis(effMax) : 'x';
    return `${day}|${min}|${max}|${this._opts.interval}|${this._timeFormat}|${this._effLocale}`;
  }

  private _syncTimeDropdownValue(): void {
    if (!this._timeHostEl) return;
    const live = this._liveValue();
    const timePart = getTimePart(live);
    const liveDate = this._liveDateForBounds();
    const effMin = getEffectiveMinTimeForDate(
      liveDate,
      this._asDate(this._opts.min),
      this._asTime(this._opts.startTime),
    );
    const effMax = getEffectiveMaxTimeForDate(
      liveDate,
      this._asDate(this._opts.max),
      this._asTime(this._opts.endTime),
    );
    const disabled = this._opts.isDisabled || this._opts.isReadOnly || this._effLoading();
    const signature = this._buildTdSignature(liveDate, effMin, effMax);

    // Surgical path: same bounds + non-null value -- just update selection.
    // The setter doesn't accept null and there's no bounds setter, so any
    // boundary change or null transition forces a teardown+rebuild.
    if (
      this._timeDropdown &&
      signature === this._tdSignature &&
      timePart != null
    ) {
      this._timeDropdown.value(timePart);
      this._timeDropdown.disabled(disabled);
      return;
    }

    this._timeDropdown?.destroy();
    this._timeDropdown = ArvoTimeDropdown.initialize(this._timeHostEl, {
      value: timePart,
      format: this._timeFormat,
      locale: this._effLocale,
      interval: this._opts.interval,
      minTime: effMin,
      maxTime: effMax,
      isDisabled: disabled,
      onChange: (t) => this._handleTimeChange(t),
      onDismiss: () => this.close(),
    });
    this._tdSignature = signature;
  }

  private _syncCalendarVisible(): void {
    this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
    this._calendar?.update({
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
    });
  }

  // -------------------------------------------------------------------------
  // Commit / change dispatch
  // -------------------------------------------------------------------------

  // Clamps, dedupes against current committed value, then fires onChange +
  // dtp:change. Returns true if the value actually changed.
  private _commitValue(next: Date | null): boolean {
    const clamped = clampToBounds(
      next,
      this._asDate(this._opts.min),
      this._asDate(this._opts.max),
      this._asTime(this._opts.startTime),
      this._asTime(this._opts.endTime),
    );
    this._previewValue = null;
    if (sameInstant(clamped, this._committedValue)) {
      this._segmentCtrl?.setValue(clamped, { silent: true });
      this._syncLivePanels();
      this._updateInputDisplay();
      return false;
    }
    this._committedValue = clamped;
    this._segmentCtrl?.setValue(clamped, { silent: true });
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
    this._syncTimeDropdownValue();
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();

    const detail = {
      value: clamped,
      formattedValue: clamped
        ? formatDateTime(clamped, this._effFormat, this._effLocale)
        : '',
    };
    this._opts.onChange?.(detail);
    this._element?.dispatchEvent(
      new CustomEvent('dtp:change', {
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
        this._restoreCaretToFocusedSegment();
      }
    });
  }

  private _handleInputBlur(): void {
    this._inputFocused = false;
    if (this._opts.isSegmented && this._segmentCtrl) {
      if (this._inputEl) {
        this._inputEl.value = this._segmentCtrl.getFormattedDisplay(false);
      }
      this._previewValue = null;
      this._syncLivePanels();
    } else {
      const parsed = parseDateTime(
        this._inputEl?.value ?? '',
        this._effFormat,
        this._effLocale,
      );
      if (parsed) this._commitValue(parsed);
      else this._updateInputDisplay();
    }
    if (this._hasTextSelected) {
      this._hasTextSelected = false;
      this._syncRootClasses();
    }
    this._opts.onBlur?.();
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
        this._previewValue = null;
        this._syncLivePanels();
        if (this._isOpen) this.close();
        return;
      }
      if (key === 'Tab') {
        // Consumed -> stay inside the input across segments. Not consumed
        // (boundary) -> let the browser advance focus naturally.
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
        const changed = !sameInstant(before, this._committedValue);
        // Mirror React: Enter commit close does NOT gate on bothTouched.
        // Both-touched gating only applies to Calendar/Time click commits.
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

    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseDateTime(
        this._inputEl?.value ?? '',
        this._effFormat,
        this._effLocale,
      );
      if (parsed) {
        const before = this._committedValue;
        const changed = this._commitValue(parsed);
        if (
          this._isOpen &&
          this._opts.isAutoClose &&
          changed &&
          !sameInstant(before, this._committedValue)
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

    // The engine mounts/unmounts the popover via mount.target + removeOnClose
    // on each open/close cycle (mirrors the React portal pattern). We build
    // the DOM once and hand it to the surface; do NOT append to document.body
    // here.
    this._popoverEl = document.createElement('div');
    this._popoverEl.className = 'arvo-dtp__popover';
    this._popoverEl.id = this._popoverId;
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute('aria-label', 'Choose a date and time');
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

    // The popover is a horizontal flex row with two columns:
    //   - arvo-dtp__cal:  header + calendar grid (vertical stack)
    //   - arvo-dtp__time: time dropdown (full height)
    // Per the Figma date-time-dropdown node (30443:1102) the 2px gap between
    // columns shows the s-base surface as the visual divider.
    this._calHostEl = document.createElement('div');
    this._calHostEl.className = 'arvo-dtp__cal';

    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-dtp__header';

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-dtp__cal-grid';

    this._calHostEl.appendChild(this._headerEl);
    this._calHostEl.appendChild(this._bodyEl);

    this._timeHostEl = document.createElement('div');
    this._timeHostEl.className = 'arvo-dtp__time';

    this._popoverEl.appendChild(this._calHostEl);
    this._popoverEl.appendChild(this._timeHostEl);

    // Build the display:contents wrapper that carries modifier classes so the
    // --arvo-dtp-popover-w CSS variable cascades correctly into the popover.
    // Mirrors React's popoverRootClass wrapper. Appended to document.body once
    // and stays permanently (it's invisible with display:contents). The engine
    // mounts/unmounts _popoverEl inside it via mount.target.
    this._popoverWrapperEl = document.createElement('div');
    this._popoverWrapperEl.style.display = 'contents';
    this._syncPopoverWrapperClasses();
    document.body.appendChild(this._popoverWrapperEl);

    this._calNav = CalendarNav.initialize(this._headerEl, {
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode:
        this._viewMode === 'days' || this._viewMode === 'months' || this._viewMode === 'years'
          ? this._viewMode
          : 'days',
      locale: this._effLocale,
      minDate: dayOf(this._asDate(this._opts.min)),
      maxDate: dayOf(this._asDate(this._opts.max)),
      isDisabled: this._opts.isDisabled,
      onPrev: () => this._handleHeaderPrev(),
      onNext: () => this._handleHeaderNext(),
      onToday: () => this._handleHeaderToday(),
      onMonthButtonClick: () =>
        this._setViewMode(this._viewMode === 'months' ? 'days' : 'months'),
      onYearButtonClick: () =>
        this._setViewMode(this._viewMode === 'years' ? 'days' : 'years'),
    });

    // Hybrid prop surface: spread calendarProps first; flat / computed wins.
    this._calendar = ArvoCalendar.initialize(this._bodyEl, {
      ...(this._opts.calendarProps ?? undefined),
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode: this._viewMode,
      locale: this._effLocale,
      weekStart: this._opts.weekStart,
      hasWeeks: this._opts.hasWeeks,
      selectedDate: this._liveValue(),
      minDate: dayOf(this._asDate(this._opts.min)),
      maxDate: dayOf(this._asDate(this._opts.max)),
      onCellSelect: (payload) => this._handleCalCellSelect(payload),
      onMonthChange: (p) => {
        this._visibleYear = p.year;
        this._visibleMonth = p.month;
        this._syncCalendarVisible();
      },
      onViewModeChange: (p) => this._setViewMode(p.mode),
      onDismiss: () => this.close(),
    });

    // Initial TimeDropdown render via _syncTimeDropdownValue. It tears down
    // and rebuilds the dropdown so we can pass a fresh null/non-null value
    // without needing a setter that accepts null.
    this._syncTimeDropdownValue();
  }

  private _handleCalCellSelect(payload: { date?: Date; mode: ArvoCalendarViewMode }): void {
    const { date, mode } = payload;
    if (!date) return;
    if (mode === 'days') {
      const currentTime =
        getTimePart(this._committedValue) ??
        this._asTime(this._opts.startTime) ??
        ZERO_TIME;
      const merged = mergeDateAndTime(date, currentTime);
      const clamped = clampToBounds(
        merged,
        this._asDate(this._opts.min),
        this._asDate(this._opts.max),
        this._asTime(this._opts.startTime),
        this._asTime(this._opts.endTime),
      );
      if (clamped) {
        this._segmentCtrl?.setValue(clamped, { silent: true });
        this._commitValue(clamped);
        this._refreshInputFromController();
      }
      this._dateTouched = true;
      if (this._opts.isAutoClose && this._timeTouched) this.close();
      return;
    }
    this._visibleYear = date.getFullYear();
    this._visibleMonth = date.getMonth();
    if (mode === 'months') this._setViewMode('days');
    else if (mode === 'years') this._setViewMode('months');
    else this._syncCalendarVisible();
  }

  private _handleTimeChange(time: TimeObject): void {
    const baseDate = this._committedValue ?? new Date();
    const merged = mergeDateAndTime(baseDate, time);
    const clamped = clampToBounds(
      merged,
      this._asDate(this._opts.min),
      this._asDate(this._opts.max),
      this._asTime(this._opts.startTime),
      this._asTime(this._opts.endTime),
    );
    if (clamped) {
      this._segmentCtrl?.setValue(clamped, { silent: true });
      this._commitValue(clamped);
      this._refreshInputFromController();
    }
    this._timeTouched = true;
    if (this._opts.isAutoClose && this._dateTouched) this.close();
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
   * Custom order: calendarCell -> timeOption -> prev -> month -> year -> next
   * -> today. Both ArvoCalendar and ArvoTimeDropdown use roving tabindex, so
   * the single `[tabindex="0"]` element in each set is found by selector.
   * Initial focus is set imperatively to the selected (or today) calendar cell
   * after the engine positions the panel -- see open() rAF block.
   */
  private _getOrderedPopoverElements(): Array<HTMLElement | null> {
    const root = this._popoverEl;
    if (!root) return [];
    const calendarCell = root.querySelector<HTMLElement>(
      '.arvo-cal__cell[tabindex="0"]',
    );
    const timeOption = root.querySelector<HTMLElement>(
      '.arvo-tdrop__opt[tabindex="0"]',
    );
    const prev = root.querySelector<HTMLElement>('.arvo-cal-nav__prev');
    const monthBtn = root.querySelector<HTMLElement>('.arvo-cal-nav__month-btn');
    const yearBtn = root.querySelector<HTMLElement>('.arvo-cal-nav__year-btn');
    const next = root.querySelector<HTMLElement>('.arvo-cal-nav__next');
    const today = root.querySelector<HTMLElement>('.arvo-cal-nav__today');
    return [calendarCell, timeOption, prev, monthBtn, yearBtn, next, today];
  }

  /**
   * Engine-driven close callback. Fires for outside-click and Escape (via the
   * hub). Per the cross-cutting overlay policy, engine-driven dismissals are
   * unconditional and silent -- no dtp:close dispatch, no onClose veto.
   *
   * The `_closingProgrammatically` flag guards the symmetric case where
   * this.close() sets the flag before calling surface.close(). In that path
   * the hook fires while the flag is true and we return early, since the
   * programmatic path already synced state + classes + focus return.
   */
  private _handleEngineClose = (): void => {
    if (this._closingProgrammatically) {
      // Programmatic close already dispatched dtp:close + set state;
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
          '[ArvoDateTimePicker] open() ignored while disabled / readOnly / loading.',
        );
      }
      return;
    }

    // Dispatch cancelable event BEFORE mutating state so listeners calling
    // event.preventDefault() (or onOpen returning false) cancel the open.
    if (this._opts.onOpen?.() === false) return;
    const ev = new CustomEvent('dtp:open', { bubbles: true, cancelable: true });
    const proceed = this._element?.dispatchEvent(ev);
    if (proceed === false) return;

    this._isOpen = true;
    this._buildPopover();

    const center = pickAnchorDate(
      this._committedValue,
      this._asDate(this._opts.min),
      this._asDate(this._opts.max),
    );
    this._visibleYear = center.getFullYear();
    this._visibleMonth = center.getMonth();
    this._viewMode = 'days';
    this._calNav?.setViewMode('days');
    this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
    this._calendar?.update({
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode: 'days',
      selectedDate: this._committedValue,
    });
    this._syncTimeDropdownValue();

    // Reset isAutoClose touch trackers for the new session.
    this._dateTouched = false;
    this._timeTouched = false;

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
          // The engine appends _popoverEl to the display:contents wrapper on
          // open and removes it on close. The wrapper itself stays on
          // document.body permanently (invisible) so the modifier-class cascade
          // is always available when the engine re-mounts on the next open.
          target: () => this._popoverWrapperEl ?? document.body,
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
        // the trigger element. axe rejects aria-haspopup on a generic <div>
        // (aria-allowed-attr), and the picker already wires the canonical
        // combobox ARIA on the role="combobox" <input> (input mode) and on the
        // anchor element (anchor mode) in _renderDomInput / _renderDomAnchor /
        // _syncRootClasses. Disable the engine writes so there is a single
        // source of truth -- same strategy as DatePicker + TimePicker.
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

    // Focus the selected (or in-range fallback) calendar cell after layout.
    const focusTarget = pickAnchorDate(
      this._committedValue,
      this._asDate(this._opts.min),
      this._asDate(this._opts.max),
    );
    requestAnimationFrame(() => {
      this._calendar?.focusCell(focusTarget);
    });
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;

    if (this._opts.onClose?.() === false) return;
    const ev = new CustomEvent('dtp:close', { bubbles: true, cancelable: true });
    const proceed = this._element?.dispatchEvent(ev);
    if (proceed === false) return;

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
      coerced = parseDateTime(v, this._effFormat, this._effLocale);
      if (coerced == null && v.length > 0) {
        if (typeof console !== 'undefined') {
          console.warn(
            `[ArvoDateTimePicker] value(): unparseable string "${v}"; value unchanged.`,
          );
        }
        return;
      }
    } else {
      return;
    }
    this._commitValue(coerced);
  }

  formattedValue(): string {
    return this._committedValue
      ? formatDateTime(this._committedValue, this._effFormat, this._effLocale)
      : '';
  }

  clear(): void {
    this._segmentCtrl?.setValue(null, { silent: true });
    this._commitValue(null);
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
    this._timeDropdown?.destroy();
    this._timeDropdown = null;

    // Remove the popover from the DOM in case it wasn't removed by the engine
    // (e.g. destroy() called while open before engine could unmount).
    this._popoverEl?.remove();
    this._popoverEl = null;
    this._headerEl = null;
    this._bodyEl = null;
    this._calHostEl = null;
    this._timeHostEl = null;
    // Remove the display:contents wrapper (always on document.body after first
    // open, regardless of open/closed state).
    this._popoverWrapperEl?.remove();
    this._popoverWrapperEl = null;

    if (this._inputEl) {
      this._inputEl.removeEventListener('keydown', this._boundInputKeyDown);
      this._inputEl.removeEventListener('focus', this._boundInputFocus);
      this._inputEl.removeEventListener('blur', this._boundInputBlur);
      this._inputEl.removeEventListener('mousedown', this._boundInputMouseDown);
      this._inputEl.removeEventListener('paste', this._boundInputPaste);
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
    this._anchorEl = null;
    this._element = null;
  }
}

export default ArvoDateTimePicker;
