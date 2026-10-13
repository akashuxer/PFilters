// Vanilla JS ArvoDateTimeDropdown.
//
// Public Layer 4 floating date+time dropdown. Composes the internal
// ArvoCalendar grid + CalendarNav header + ArvoTimeDropdown listbox in a
// side-by-side dialog surface bound to a consumer-provided trigger.
//
// Events dispatched on the trigger element:
//   dt-drop:open         -- {} (cancelable; programmatic paths only)
//   dt-drop:close        -- {} (cancelable; programmatic paths only)
//   dt-drop:change       -- { value: Date | null; formattedValue: string }
//   dt-drop:month-change -- { year: number; month: number }

import {
  addMonths,
  applyPositionToSurface,
  createOverlaySurface,
  formatDate,
  getLocaleDateFormat,
  getLocaleTimeFormat,
  getUserLocale,
  isSameDay,
  parseDate,
  parseTime,
  pickAnchorDate,
  splitDateTimeFormat,
} from '@arvo/core';
import type {
  OverlaySurface,
  PositionResult,
  TimeObject,
} from '@arvo/core';
import { ArvoCalendar } from '../Calendar/Calendar';
import type {
  ArvoCalendarOptions,
  ArvoCalendarViewMode,
} from '../Calendar/Calendar';
import { CalendarNav } from '../CalendarNav/CalendarNav';
import { ArvoTimeDropdown } from '../TimeDropdown/TimeDropdown';

export type { TimeObject } from '@arvo/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateTimeDropdownPopoverProps {
  width?: string;
  offset?: number;
  zIndex?: number;
}

export type DateTimeDropdownCalendarProps = Pick<
  ArvoCalendarOptions,
  'hasOutsideDays' | 'isKeyboardEnabled' | 'size'
>;

export interface ArvoDateTimeDropdownOptions {
  value?: Date | string | null;
  defaultValue?: Date | string | null;
  format?: string | null;
  locale?: string | null;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasWeeks?: boolean;
  interval?: number;
  /** Full datetime min. Time enforced only on the boundary date. */
  min?: Date | string | null;
  /** Full datetime max. Time enforced only on the boundary date. */
  max?: Date | string | null;
  /** Time-only floor applied across ALL dates. */
  startTime?: TimeObject | string | null;
  /** Time-only ceiling applied across ALL dates. */
  endTime?: TimeObject | string | null;
  defaultOpen?: boolean;
  isDisabled?: boolean;
  /** Default false -- users typically need both date and time before close. */
  isAutoClose?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  ariaLabel?: string;
  calendarProps?: DateTimeDropdownCalendarProps | null;
  popoverProps?: DateTimeDropdownPopoverProps | null;
  onChange?: (payload: { value: Date | null; formattedValue: string }) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (open: boolean) => void;
  onMonthChange?: (payload: { year: number; month: number }) => void;
  onViewModeChange?: (payload: { mode: ArvoCalendarViewMode }) => void;
}

interface RequiredOptions {
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
  defaultOpen: boolean;
  isDisabled: boolean;
  isAutoClose: boolean;
  placement: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  ariaLabel: string;
  calendarProps: DateTimeDropdownCalendarProps | null;
  popoverProps: DateTimeDropdownPopoverProps | null;
  onChange: ArvoDateTimeDropdownOptions['onChange'] | null;
  onOpen: ArvoDateTimeDropdownOptions['onOpen'] | null;
  onClose: ArvoDateTimeDropdownOptions['onClose'] | null;
  onOpenChange: ArvoDateTimeDropdownOptions['onOpenChange'] | null;
  onMonthChange: ArvoDateTimeDropdownOptions['onMonthChange'] | null;
  onViewModeChange: ArvoDateTimeDropdownOptions['onViewModeChange'] | null;
}

// ---------------------------------------------------------------------------
// Helpers (mirrored from DateTimePicker)
// ---------------------------------------------------------------------------

function coerceDate(
  v: Date | string | null | undefined,
  format: string,
  locale: string,
): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string')
    return v.length === 0 ? null : parseDate(v, format, locale);
  return null;
}

function asDate(
  v: Date | string | null | undefined,
  format: string,
  locale: string,
): Date | null {
  return coerceDate(v, format, locale);
}

function asTime(
  v: TimeObject | string | null | undefined,
  timeFormat: string,
): TimeObject | null {
  if (v == null) return null;
  if (typeof v === 'string')
    return v.length === 0 ? null : parseTime(v, timeFormat);
  return v;
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

function totalMs(t: TimeObject): number {
  return (((t.hours * 60 + t.minutes) * 60 + (t.seconds ?? 0)) * 1000) +
    (t.milliseconds ?? 0);
}

function laterTime(
  a: TimeObject | null,
  b: TimeObject | null,
): TimeObject | null {
  if (!a) return b;
  if (!b) return a;
  return totalMs(a) >= totalMs(b) ? a : b;
}

function earlierTime(
  a: TimeObject | null,
  b: TimeObject | null,
): TimeObject | null {
  if (!a) return b;
  if (!b) return a;
  return totalMs(a) <= totalMs(b) ? a : b;
}

function getEffectiveMinTimeForDate(
  date: Date | null,
  min: Date | null,
  startTime: TimeObject | null,
): TimeObject | null {
  const onMinDay = date && min && isSameDay(date, min);
  const minPart = onMinDay ? getTimePart(min) : null;
  return laterTime(minPart, startTime);
}

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
  if (effMin && tPart && totalMs(tPart) < totalMs(effMin)) {
    result = mergeDateAndTime(result, effMin);
  }
  if (effMax && tPart && totalMs(tPart) > totalMs(effMax)) {
    result = mergeDateAndTime(result, effMax);
  }
  if (min && result.getTime() < min.getTime()) result = new Date(min.getTime());
  if (max && result.getTime() > max.getTime()) result = new Date(max.getTime());
  return result;
}

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoDateTimeDropdown {
  private _trigger: HTMLElement | null;
  private _opts: RequiredOptions;
  private _id: string;
  private _popoverEl: HTMLDivElement | null = null;
  private _calColEl: HTMLDivElement | null = null;
  private _headerEl: HTMLDivElement | null = null;
  private _calGridEl: HTMLDivElement | null = null;
  private _timeColEl: HTMLDivElement | null = null;
  private _sepEl: HTMLDivElement | null = null;
  private _calendar: ArvoCalendar | null = null;
  private _calNav: CalendarNav | null = null;
  private _timeDropdown: ArvoTimeDropdown | null = null;
  private _surface: OverlaySurface | null = null;
  private _committedValue: Date | null = null;
  /** Preview value updated via setPreview() while a parent edits an input. */
  private _previewValue: Date | null = null;
  private _visibleYear: number;
  private _visibleMonth: number;
  private _viewMode: ArvoCalendarViewMode = 'days';
  private _isOpen = false;
  private _destroyed = false;
  private _closingProgrammatically = false;
  private _effLocale: string;
  private _effFormat: string;
  private _effTimeFormat: string;

  static readonly PLACEMENTS = [
    'top-start',
    'top-end',
    'bottom-start',
    'bottom-end',
    'auto',
  ] as const;

  static readonly DEFAULTS: RequiredOptions = {
    value: undefined,
    defaultValue: null,
    format: null,
    locale: null,
    weekStart: 0,
    hasWeeks: false,
    interval: 15,
    min: null,
    max: null,
    startTime: null,
    endTime: null,
    defaultOpen: false,
    isDisabled: false,
    isAutoClose: false, // dt defaults to false (date AND time)
    placement: 'bottom-end',
    ariaLabel: 'Choose a date and time',
    calendarProps: null,
    popoverProps: null,
    onChange: null,
    onOpen: null,
    onClose: null,
    onOpenChange: null,
    onMonthChange: null,
    onViewModeChange: null,
  };

  static initialize(
    trigger: HTMLElement,
    options?: ArvoDateTimeDropdownOptions,
  ): ArvoDateTimeDropdown {
    return new ArvoDateTimeDropdown(trigger, options);
  }

  constructor(trigger: HTMLElement, options?: ArvoDateTimeDropdownOptions) {
    this._trigger = trigger;
    this._id = `arvo-dt-drop-${++_idCounter}`;

    const placement =
      options?.placement &&
      (ArvoDateTimeDropdown.PLACEMENTS as readonly string[]).includes(options.placement)
        ? options.placement
        : ArvoDateTimeDropdown.DEFAULTS.placement;

    this._opts = {
      ...ArvoDateTimeDropdown.DEFAULTS,
      ...options,
      placement,
      value: options?.value,
      defaultValue: options?.defaultValue ?? null,
      calendarProps: options?.calendarProps ?? null,
      popoverProps: options?.popoverProps ?? null,
      onChange: options?.onChange ?? null,
      onOpen: options?.onOpen ?? null,
      onClose: options?.onClose ?? null,
      onOpenChange: options?.onOpenChange ?? null,
      onMonthChange: options?.onMonthChange ?? null,
      onViewModeChange: options?.onViewModeChange ?? null,
    };

    this._effLocale = this._opts.locale ?? getUserLocale();
    this._effFormat = this._opts.format ?? this._localeDefaultDateTimeFormat();
    this._effTimeFormat = this._splitTimeFormat();

    const initialRaw =
      this._opts.value !== undefined ? this._opts.value : this._opts.defaultValue;
    this._committedValue = clampToBounds(
      coerceDate(initialRaw, this._effFormat, this._effLocale),
      asDate(this._opts.min, this._effFormat, this._effLocale),
      asDate(this._opts.max, this._effFormat, this._effLocale),
      asTime(this._opts.startTime, this._effTimeFormat),
      asTime(this._opts.endTime, this._effTimeFormat),
    );

    // Anchor onto a date inside [min, max] when there's no committed value
    // so a bounded dropdown doesn't open onto a fully-disabled today view.
    const anchor = pickAnchorDate(
      this._committedValue,
      asDate(this._opts.min, this._effFormat, this._effLocale),
      asDate(this._opts.max, this._effFormat, this._effLocale),
    );
    this._visibleYear = anchor.getFullYear();
    this._visibleMonth = anchor.getMonth();

    this._bindTrigger();

    if (this._opts.defaultOpen && !this._opts.isDisabled) {
      queueMicrotask(() => this.open());
    }
  }

  // -------------------------------------------------------------------------
  // Trigger binding
  // -------------------------------------------------------------------------

  private _handleTriggerClick = (e: MouseEvent): void => {
    if (e.defaultPrevented) return;
    this.toggle();
  };

  private _handleTriggerKeyDown = (e: KeyboardEvent): void => {
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
  };

  private _bindTrigger(): void {
    if (!this._trigger) return;
    this._trigger.addEventListener('click', this._handleTriggerClick);
    this._trigger.addEventListener('keydown', this._handleTriggerKeyDown);
  }

  private _unbindTrigger(): void {
    if (!this._trigger) return;
    this._trigger.removeEventListener('click', this._handleTriggerClick);
    this._trigger.removeEventListener('keydown', this._handleTriggerKeyDown);
  }

  // -------------------------------------------------------------------------
  // Format helpers
  // -------------------------------------------------------------------------

  private _localeDefaultDateTimeFormat(): string {
    const date = getLocaleDateFormat(this._effLocale);
    const time = getLocaleTimeFormat(this._effLocale);
    return `${date} ${time}`;
  }

  private _splitTimeFormat(): string {
    const split = splitDateTimeFormat(this._effFormat);
    return split.timePart || getLocaleTimeFormat(this._effLocale);
  }

  // -------------------------------------------------------------------------
  // Popover
  // -------------------------------------------------------------------------

  private _liveValue(): Date | null {
    return this._previewValue ?? this._committedValue;
  }

  private _buildPopover(): void {
    if (this._popoverEl) return;

    this._popoverEl = document.createElement('div');
    this._popoverEl.className = this._opts.hasWeeks
      ? 'arvo-dt-drop arvo-dt-drop--show-weeks'
      : 'arvo-dt-drop';
    this._popoverEl.id = this._id;
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute('aria-label', this._opts.ariaLabel);
    this._popoverEl.setAttribute('aria-modal', 'false');
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = '0';
    this._popoverEl.style.left = '0';
    this._popoverEl.style.margin = '0';
    if (this._opts.popoverProps?.width) {
      this._popoverEl.style.width = this._opts.popoverProps.width;
    }

    // Calendar column.
    this._calColEl = document.createElement('div');
    this._calColEl.className = 'arvo-dt-drop__cal';
    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-dt-drop__header';
    this._calGridEl = document.createElement('div');
    this._calGridEl.className = 'arvo-dt-drop__cal-grid';
    this._calColEl.appendChild(this._headerEl);
    this._calColEl.appendChild(this._calGridEl);

    // Separator (visual divider via background gap).
    this._sepEl = document.createElement('div');
    this._sepEl.className = 'arvo-dt-drop__sep';

    // Time column.
    this._timeColEl = document.createElement('div');
    this._timeColEl.className = 'arvo-dt-drop__time';
    const timeHost = document.createElement('div');
    this._timeColEl.appendChild(timeHost);

    this._popoverEl.appendChild(this._calColEl);
    this._popoverEl.appendChild(this._sepEl);
    this._popoverEl.appendChild(this._timeColEl);

    const minDateResolved = asDate(this._opts.min, this._effFormat, this._effLocale);
    const maxDateResolved = asDate(this._opts.max, this._effFormat, this._effLocale);

    this._calNav = CalendarNav.initialize(this._headerEl, {
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode:
        this._viewMode === 'days' || this._viewMode === 'months' || this._viewMode === 'years'
          ? this._viewMode
          : 'days',
      locale: this._effLocale,
      minDate: minDateResolved,
      maxDate: maxDateResolved,
      isDisabled: this._opts.isDisabled,
      onPrev: () => this._handleHeaderPrev(),
      onNext: () => this._handleHeaderNext(),
      onToday: () => this._handleHeaderToday(),
      onMonthButtonClick: () =>
        this._setViewMode(this._viewMode === 'months' ? 'days' : 'months'),
      onYearButtonClick: () =>
        this._setViewMode(this._viewMode === 'years' ? 'days' : 'years'),
    });

    const live = this._liveValue();
    this._calendar = ArvoCalendar.initialize(this._calGridEl, {
      ...(this._opts.calendarProps ?? undefined),
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode: this._viewMode,
      locale: this._effLocale,
      weekStart: this._opts.weekStart,
      hasWeeks: this._opts.hasWeeks,
      selectedDate: live,
      minDate: minDateResolved,
      maxDate: maxDateResolved,
    });

    this._calGridEl.addEventListener('cal:select', this._handleCalSelect);
    this._calGridEl.addEventListener('cal:month-change', this._handleCalMonthChange);
    this._calGridEl.addEventListener('cal:viewmode-change', this._handleCalViewModeChange);
    this._calGridEl.addEventListener('cal:dismiss', this._handleCalDismiss);

    this._timeDropdown = this._createTimeDropdown(timeHost);
  }

  private _createTimeDropdown(host: HTMLElement): ArvoTimeDropdown {
    const live = this._liveValue();
    const minDate = asDate(this._opts.min, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.max, this._effFormat, this._effLocale);
    const startTime = asTime(this._opts.startTime, this._effTimeFormat);
    const endTime = asTime(this._opts.endTime, this._effTimeFormat);
    return ArvoTimeDropdown.initialize(host, {
      value: live ? getTimePart(live) : null,
      format: this._effTimeFormat,
      locale: this._effLocale,
      interval: this._opts.interval,
      minTime: getEffectiveMinTimeForDate(live, minDate, startTime),
      maxTime: getEffectiveMaxTimeForDate(live, maxDate, endTime),
      isDisabled: this._opts.isDisabled,
      onChange: (time) => this._handleTimeChange(time),
      onDismiss: () => this.close(),
    });
  }

  private _handleTimeChange(time: TimeObject): void {
    const base = this._liveValue() ?? new Date();
    const next = mergeDateAndTime(base, time);
    this._handleCommit(next);
    if (this._opts.isAutoClose) this.close();
  }

  private _handleCalSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail as {
      date?: Date;
      mode: ArvoCalendarViewMode;
    };
    if (!detail || !detail.date) return;
    if (detail.mode === 'days') {
      // Merge new date with the existing time portion so a date click does
      // not wipe the time selection.
      const current = this._liveValue();
      const tPart = getTimePart(current);
      const next = tPart ? mergeDateAndTime(detail.date, tPart) : detail.date;
      this._handleCommit(next);
      return;
    }
    this._visibleYear = detail.date.getFullYear();
    this._visibleMonth = detail.date.getMonth();
    if (detail.mode === 'months') this._setViewMode('days');
    else if (detail.mode === 'years') this._setViewMode('months');
    else this._syncCalendarVisible();
  };

  private _handleCalMonthChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { year: number; month: number };
    if (!detail) return;
    this._visibleYear = detail.year;
    this._visibleMonth = detail.month;
    this._syncCalendarVisible();
    this._opts.onMonthChange?.({ year: detail.year, month: detail.month });
    this._dispatch('dt-drop:month-change', { year: detail.year, month: detail.month });
  };

  private _handleCalViewModeChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { mode: ArvoCalendarViewMode };
    if (!detail) return;
    this._setViewMode(detail.mode);
  };

  private _handleCalDismiss = (): void => {
    this.close();
  };

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
    this._opts.onViewModeChange?.({ mode });
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

  private _handleCommit(next: Date | null): boolean {
    const minDate = asDate(this._opts.min, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.max, this._effFormat, this._effLocale);
    const startTime = asTime(this._opts.startTime, this._effTimeFormat);
    const endTime = asTime(this._opts.endTime, this._effTimeFormat);
    const clamped = clampToBounds(next, minDate, maxDate, startTime, endTime);
    if (sameDateTime(clamped, this._committedValue)) return false;
    this._committedValue = clamped;
    this._previewValue = null;
    if (clamped) {
      this._visibleYear = clamped.getFullYear();
      this._visibleMonth = clamped.getMonth();
      this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
      this._calendar?.update({
        visibleYear: this._visibleYear,
        visibleMonth: this._visibleMonth,
        selectedDate: clamped,
      });
      const tPart = getTimePart(clamped);
      if (this._timeDropdown && tPart) this._timeDropdown.value(tPart);
    } else {
      this._calendar?.update({ selectedDate: null });
    }
    const formatted = clamped
      ? formatDate(clamped, this._effFormat, this._effLocale)
      : '';
    this._opts.onChange?.({ value: clamped, formattedValue: formatted });
    this._dispatch('dt-drop:change', { value: clamped, formattedValue: formatted });
    return true;
  }

  private _dispatch(name: string, detail: Record<string, unknown> = {}): boolean {
    if (!this._trigger) return true;
    const ev = new CustomEvent(name, { bubbles: true, cancelable: true, detail });
    return this._trigger.dispatchEvent(ev);
  }

  private _handleEngineClose = (): void => {
    if (this._closingProgrammatically) return;
    if (!this._isOpen) return;
    this._isOpen = false;
    if (this._trigger) this._trigger.setAttribute('aria-expanded', 'false');
    this._opts.onOpenChange?.(false);
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  open(): void {
    if (this._destroyed) return;
    if (this._isOpen) return;
    if (this._opts.isDisabled) return;
    if (this._opts.onOpen?.() === false) return;
    if (!this._dispatch('dt-drop:open')) return;

    this._isOpen = true;
    this._buildPopover();

    if (this._popoverEl) this._popoverEl.style.visibility = 'hidden';

    if (!this._surface && this._popoverEl) {
      this._surface = createOverlaySurface({
        id: this._id,
        surface: this._popoverEl,
        type: 'dropdown',
        priority: 20,
        trigger: this._trigger,
        zIndex: this._opts.popoverProps?.zIndex,
        mount: {
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
          initialFocus: 'none',
          returnFocus: false,
          getOrderedElements: () => this._getOrderedPopoverElements(),
        },
        transition: 'fade',
        transitionDuration: 150,
        triggerAria: { haspopup: 'dialog' },
        onClose: this._handleEngineClose,
      });
    } else if (this._surface) {
      this._surface.setTrigger(this._trigger);
    }

    void this._surface?.open();

    if (this._trigger) this._trigger.setAttribute('aria-expanded', 'true');
    this._opts.onOpenChange?.(true);

    requestAnimationFrame(() => {
      const target = pickAnchorDate(
        this._liveValue(),
        asDate(this._opts.min, this._effFormat, this._effLocale),
        asDate(this._opts.max, this._effFormat, this._effLocale),
      );
      this._calendar?.focusCell(target);
    });
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;
    if (this._opts.onClose?.() === false) return;
    if (!this._dispatch('dt-drop:close')) return;

    this._isOpen = false;
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    if (this._trigger) {
      this._trigger.setAttribute('aria-expanded', 'false');
      this._trigger.focus({ preventScroll: true });
    }

    this._opts.onOpenChange?.(false);
  }

  toggle(force?: boolean): void {
    const next = force === undefined ? !this._isOpen : force;
    if (next) this.open();
    else this.close();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  value(): Date | null;
  value(v: Date | string | null): void;
  value(v?: Date | string | null): Date | null | void {
    if (v === undefined) return this._committedValue;
    const minDate = asDate(this._opts.min, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.max, this._effFormat, this._effLocale);
    const startTime = asTime(this._opts.startTime, this._effTimeFormat);
    const endTime = asTime(this._opts.endTime, this._effTimeFormat);
    const coerced = clampToBounds(
      coerceDate(v, this._effFormat, this._effLocale),
      minDate,
      maxDate,
      startTime,
      endTime,
    );
    this._committedValue = coerced;
    this._previewValue = null;
    if (coerced) {
      this._visibleYear = coerced.getFullYear();
      this._visibleMonth = coerced.getMonth();
    }
    if (this._isOpen) {
      this._calNav?.setVisibleMonth(this._visibleYear, this._visibleMonth);
      this._calendar?.update({
        visibleYear: this._visibleYear,
        visibleMonth: this._visibleMonth,
        selectedDate: coerced,
      });
      const tPart = getTimePart(coerced);
      if (this._timeDropdown && tPart) this._timeDropdown.value(tPart);
    }
  }

  /**
   * Imperative live-preview setter for the parent picker's segmented input.
   * Updates the highlighted calendar cell + time option without committing
   * or emitting dt-drop:change.
   */
  setPreview(v: Date | null): void {
    this._previewValue = v;
    if (!this._isOpen) return;
    this._calendar?.update({ selectedDate: this._liveValue() });
    const tPart = getTimePart(v);
    if (this._timeDropdown && tPart) this._timeDropdown.value(tPart);
  }

  formattedValue(): string {
    return this._committedValue
      ? formatDate(this._committedValue, this._effFormat, this._effLocale)
      : '';
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    if (this._opts.isDisabled === state) return;
    this._opts.isDisabled = state;
    this._timeDropdown?.disabled(state);
    if (state && this._isOpen) this.close();
  }

  focus(): void {
    if (!this._isOpen) return;
    const target = pickAnchorDate(
      this._liveValue(),
      asDate(this._opts.min, this._effFormat, this._effLocale),
      asDate(this._opts.max, this._effFormat, this._effLocale),
    );
    this._calendar?.focusCell(target);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._unbindTrigger();
    if (this._isOpen) {
      this._isOpen = false;
      void this._surface?.close();
    }
    this._surface?.destroy();
    this._surface = null;
    this._calendar?.destroy();
    this._calendar = null;
    this._calNav?.destroy();
    this._calNav = null;
    this._timeDropdown?.destroy();
    this._timeDropdown = null;
    this._popoverEl?.remove();
    this._popoverEl = null;
    this._calColEl = null;
    this._headerEl = null;
    this._calGridEl = null;
    this._timeColEl = null;
    this._sepEl = null;
    if (this._trigger) {
      this._trigger.removeAttribute('aria-haspopup');
      this._trigger.removeAttribute('aria-controls');
      this._trigger.removeAttribute('aria-expanded');
    }
    this._trigger = null;
  }

  private _getOrderedPopoverElements(): Array<HTMLElement | null> {
    const root = this._popoverEl;
    if (!root) return [];
    const cell = root.querySelector<HTMLElement>('.arvo-cal__cell[tabindex="0"]');
    const timeItem = root.querySelector<HTMLElement>('.arvo-tdrop [tabindex="0"]');
    const prev = root.querySelector<HTMLElement>('.arvo-cal-nav__prev');
    const month = root.querySelector<HTMLElement>('.arvo-cal-nav__month-btn');
    const year = root.querySelector<HTMLElement>('.arvo-cal-nav__year-btn');
    const next = root.querySelector<HTMLElement>('.arvo-cal-nav__next');
    const today = root.querySelector<HTMLElement>('.arvo-cal-nav__today');
    return [cell, timeItem, prev, month, year, next, today];
  }
}

function sameDateTime(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.getTime() === b.getTime();
}
