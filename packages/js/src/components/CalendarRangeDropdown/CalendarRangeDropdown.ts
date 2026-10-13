// Vanilla JS ArvoCalendarRangeDropdown.
//
// Public Layer 4 floating range dropdown. Bring-your-own-trigger wrapper
// that owns dual-calendar absolute range selection with explicit
// activeSide tracking so both the start and end value reliably get set.
//
// Status: absolute mode is fully implemented. Member and rolling modes
// share the public API but route to the parent
// ArvoDateRangePicker today; the dropdown stub above accepts the props
// but does not render those bodies yet -- consumers needing all three
// modes should compose ArvoDateRangePicker (which still owns the legacy
// popover code that will be ported into this dropdown in a follow-up).
//
// Events dispatched on the trigger element:
//   cal-rng-drop:open         -- {} (cancelable; programmatic only)
//   cal-rng-drop:close        -- {} (cancelable; programmatic only)
//   cal-rng-drop:change       -- range payload (see descriptor)
//   cal-rng-drop:mode-change  -- { mode }

import {
  addMonths,
  applyPositionToSurface,
  createOverlaySurface,
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
} from '@arvo/core';
import { ArvoCalendar } from '../Calendar/Calendar';
import type { ArvoCalendarOptions, ArvoCalendarViewMode } from '../Calendar/Calendar';
import { CalendarNav } from '../CalendarNav/CalendarNav';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarRangeDropdownMode = 'absolute' | 'member' | 'rolling';

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

export interface RollingRangeValue {
  startOffset: number;
  endOffset: number;
}

export interface CalendarRangeDropdownPopoverProps {
  width?: string;
  offset?: number;
  zIndex?: number;
}

export type CalendarRangeDropdownCalendarProps = Pick<
  ArvoCalendarOptions,
  'hasOutsideDays' | 'isKeyboardEnabled' | 'size'
>;

export interface CalendarRangeMemberItem {
  key: string;
  name: string;
  displayName: string;
  index?: number;
}

export interface ArvoCalendarRangeDropdownOptions {
  startValue?: Date | string | null;
  endValue?: Date | string | null;
  format?: string | null;
  locale?: string | null;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasWeeks?: boolean;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  frequency?: 'day' | 'week' | 'month' | 'quarter' | 'year' | null;
  memberData?: CalendarRangeMemberItem[] | null;
  currentMemberIndex?: number | null;
  hasRolling?: boolean;
  rollingPrefix?: string | null;
  rollingValue?: RollingRangeValue | null;
  hasModeToggle?: boolean;
  mode?: CalendarRangeDropdownMode | null;
  defaultMode?: CalendarRangeDropdownMode | null;
  defaultOpen?: boolean;
  isDisabled?: boolean;
  isAutoClose?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  ariaLabel?: string | null;
  calendarProps?: CalendarRangeDropdownCalendarProps | null;
  popoverProps?: CalendarRangeDropdownPopoverProps | null;
  onChange?: (payload: {
    start: Date | null;
    end: Date | null;
    formatted: { start: string; end: string };
    mode: CalendarRangeDropdownMode;
    memberRange?: unknown;
    rollingValue?: RollingRangeValue;
  }) => void;
  onModeChange?: (payload: { mode: CalendarRangeDropdownMode }) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  onSave?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coerceDate(
  v: Date | string | null | undefined,
  format: string,
  locale: string,
): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') return v.length === 0 ? null : parseDate(v, format, locale);
  return null;
}

function asDate(v: Date | string | null | undefined, format: string, locale: string): Date | null {
  return coerceDate(v, format, locale);
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return isSameDay(a, b);
}

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoCalendarRangeDropdown {
  private _trigger: HTMLElement | null;
  private _opts: Required<
    Pick<
      ArvoCalendarRangeDropdownOptions,
      'weekStart' | 'hasWeeks' | 'isDisabled' | 'isAutoClose' | 'placement'
    >
  > &
    Omit<
      ArvoCalendarRangeDropdownOptions,
      'weekStart' | 'hasWeeks' | 'isDisabled' | 'isAutoClose' | 'placement'
    >;
  private _id: string;
  private _popoverEl: HTMLDivElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;
  private _headerEl: HTMLDivElement | null = null;
  private _calLeftEl: HTMLDivElement | null = null;
  private _calRightEl: HTMLDivElement | null = null;
  private _calLeft: ArvoCalendar | null = null;
  private _calRight: ArvoCalendar | null = null;
  // Single shared header above BOTH calendars (variant="range"). Matches
  // the ArvoDateRangePicker dropdown -- there is intentionally no per-
  // column nav (the previous design had two, which prevented zoom-in and
  // broke Prev/Next).
  private _nav: CalendarNav | null = null;
  private _surface: OverlaySurface | null = null;
  private _effLocale: string;
  private _effFormat: string;

  // Range state
  private _appliedRange: DateRangeValue;
  private _draftRange: DateRangeValue;
  private _draftFirstSet = false;
  private _activeSide: 'start' | 'end' = 'start';
  private _hoverDate: Date | null = null;

  // Visible period (left calendar). Right calendar derives from this +
  // viewMode (days -> +1 month, months -> +1 year, years -> +10 years).
  private _leftYear: number;
  private _leftMonth: number;
  private _viewMode: ArvoCalendarViewMode = 'days';

  private _isOpen = false;
  private _destroyed = false;
  private _closingProgrammatically = false;

  static initialize(
    trigger: HTMLElement,
    options?: ArvoCalendarRangeDropdownOptions,
  ): ArvoCalendarRangeDropdown {
    return new ArvoCalendarRangeDropdown(trigger, options);
  }

  constructor(trigger: HTMLElement, options?: ArvoCalendarRangeDropdownOptions) {
    this._trigger = trigger;
    this._id = `arvo-cal-rng-drop-${++_idCounter}`;

    this._opts = {
      weekStart: 0,
      hasWeeks: true,
      isDisabled: false,
      isAutoClose: true,
      placement: 'bottom-end',
      ...(options ?? {}),
    };

    this._effLocale = this._opts.locale ?? getUserLocale();
    this._effFormat = this._opts.format ?? getLocaleDateFormat(this._effLocale);

    const minDate = asDate(this._opts.minDate, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.maxDate, this._effFormat, this._effLocale);
    const start = clampDate(
      coerceDate(this._opts.startValue, this._effFormat, this._effLocale),
      minDate,
      maxDate,
    );
    const end = clampDate(
      coerceDate(this._opts.endValue, this._effFormat, this._effLocale),
      minDate,
      maxDate,
    );
    this._appliedRange = { start, end };
    this._draftRange = { start, end };
    this._draftFirstSet = !!(start && !end);
    this._activeSide = start && !end ? 'end' : 'start';

    // Anchor onto a date inside [minDate, maxDate] when there's no committed
    // range, so a bounded dropdown (e.g. Jan 1-31, 2024) doesn't open onto
    // today when today is out of range -- which would render both calendars
    // fully disabled with no Prev/Next escape.
    const anchor = pickAnchorDate(start ?? end, minDate, maxDate);
    this._leftYear = anchor.getFullYear();
    this._leftMonth = anchor.getMonth();

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
  // Popover
  // -------------------------------------------------------------------------

  private _buildPopover(): void {
    if (this._popoverEl) return;

    this._popoverEl = document.createElement('div');
    this._popoverEl.className = this._opts.hasWeeks
      ? 'arvo-cal-rng-drop arvo-cal-rng-drop--show-weeks arvo-cal-rng-drop--absolute'
      : 'arvo-cal-rng-drop arvo-cal-rng-drop--absolute';
    this._popoverEl.id = this._id;
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute(
      'aria-label',
      this._opts.ariaLabel ?? 'Choose a date range',
    );
    this._popoverEl.setAttribute('aria-modal', 'false');
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = '0';
    this._popoverEl.style.left = '0';
    this._popoverEl.style.margin = '0';
    if (this._opts.popoverProps?.width) {
      this._popoverEl.style.width = this._opts.popoverProps.width;
    }

    // Single shared CalendarNav (variant="range") above BOTH calendars.
    // Renders the dual month/year labels joined by an em-dash on the left
    // and one Prev / Next / Today cluster on the right -- matches the
    // ArvoDateRangePicker popover and the calendar-range-dropdown
    // descriptor's `header` element contract.
    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-cal-rng-drop__header';
    this._popoverEl.appendChild(this._headerEl);

    const minDateResolved = asDate(this._opts.minDate, this._effFormat, this._effLocale);
    const maxDateResolved = asDate(this._opts.maxDate, this._effFormat, this._effLocale);
    const right = this._visibleFor('right');
    this._nav = CalendarNav.initialize(this._headerEl, {
      variant: 'range',
      visibleYear: this._leftYear,
      visibleMonth: this._leftMonth,
      rangeEndYear: right.year,
      rangeEndMonth: right.month,
      viewMode: this._navViewMode(),
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

    // Body: two side-by-side calendars.
    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-cal-rng-drop__body';
    this._popoverEl.appendChild(this._bodyEl);

    this._calLeftEl = document.createElement('div');
    this._calLeftEl.className = 'arvo-cal-rng-drop__cal';
    this._calRightEl = document.createElement('div');
    this._calRightEl.className = 'arvo-cal-rng-drop__cal';
    this._bodyEl.appendChild(this._calLeftEl);
    this._bodyEl.appendChild(this._calRightEl);

    this._mountCalendarColumn(this._calLeftEl, 'left');
    this._mountCalendarColumn(this._calRightEl, 'right');
    this._refreshCalendars();
  }

  private _mountCalendarColumn(host: HTMLElement, side: 'left' | 'right'): void {
    const minDateResolved = asDate(this._opts.minDate, this._effFormat, this._effLocale);
    const maxDateResolved = asDate(this._opts.maxDate, this._effFormat, this._effLocale);

    const visible = this._visibleFor(side);
    const cal = ArvoCalendar.initialize(host, {
      ...(this._opts.calendarProps ?? undefined),
      visibleYear: visible.year,
      visibleMonth: visible.month,
      viewMode: this._viewMode,
      locale: this._effLocale,
      weekStart: this._opts.weekStart,
      hasWeeks: this._opts.hasWeeks,
      rangeStart: this._draftRange.start,
      rangeEnd: this._draftRange.end,
      hoverDate: this._hoverDate,
      isRangeComplete: !!(this._draftRange.start && this._draftRange.end),
      minDate: minDateResolved,
      maxDate: maxDateResolved,
      onCellSelect: (p) => this._handleCellSelect(p),
      onCellHover: (p) => this._handleCellHover(p),
      // Keyboard navigation inside either grid emits onMonthChange. The
      // LEFT calendar's nav directly drives `_leftYear`/`_leftMonth`; the
      // RIGHT calendar shifts the left period back by one full period so
      // the right column lands on the requested period (same delta as
      // `_visibleFor('right')`, just inverted). Mirrors ArvoDateRangePicker.
      onMonthChange:
        side === 'left'
          ? (p) => {
              this._leftYear = p.year;
              this._leftMonth = p.month;
              this._refreshCalendars();
            }
          : (p) => {
              if (this._viewMode === 'months' || this._viewMode === 'quarters') {
                this._leftYear = p.year - 1;
                this._leftMonth = p.month;
              } else if (this._viewMode === 'years') {
                this._leftYear = p.year - 10;
                this._leftMonth = p.month;
              } else {
                const d = addMonths(new Date(p.year, p.month, 1), -1);
                this._leftYear = d.getFullYear();
                this._leftMonth = d.getMonth();
              }
              this._refreshCalendars();
            },
      onViewModeChange: (p) => this._setViewMode(p.mode),
      onDismiss: () => this.close(),
    });
    if (side === 'left') this._calLeft = cal;
    else this._calRight = cal;
  }

  // CalendarNav only accepts 'days' / 'months' / 'years' (the wider
  // ArvoCalendar viewMode union also includes 'quarters' / 'members').
  // Coerce so unsupported values render the days-style header.
  private _navViewMode(): 'days' | 'months' | 'years' {
    return this._viewMode === 'months' || this._viewMode === 'years'
      ? this._viewMode
      : 'days';
  }

  private _visibleFor(side: 'left' | 'right'): { year: number; month: number } {
    if (side === 'left') return { year: this._leftYear, month: this._leftMonth };
    // The right calendar always shows the next contiguous period so the
    // dual layout never duplicates the left side. The step unit depends
    // on viewMode: days -> next month, months/quarters -> next year,
    // years -> next decade. Mirrors ArvoDateRangePicker.rightVisible.
    if (this._viewMode === 'months' || this._viewMode === 'quarters') {
      return { year: this._leftYear + 1, month: this._leftMonth };
    }
    if (this._viewMode === 'years') {
      return { year: this._leftYear + 10, month: this._leftMonth };
    }
    const next = addMonths(new Date(this._leftYear, this._leftMonth, 1), 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  }

  // Shared header handlers -- single Prev / Next / Today cluster steps
  // BOTH calendars together (rightVisible is derived from leftYear /
  // leftMonth + viewMode). Step unit matches viewMode.
  private _handleHeaderPrev(): void {
    if (this._viewMode === 'days') {
      const d = addMonths(new Date(this._leftYear, this._leftMonth, 1), -1);
      this._leftYear = d.getFullYear();
      this._leftMonth = d.getMonth();
    } else if (this._viewMode === 'months') {
      this._leftYear -= 1;
    } else if (this._viewMode === 'years') {
      this._leftYear -= 10;
    }
    this._refreshCalendars();
  }

  private _handleHeaderNext(): void {
    if (this._viewMode === 'days') {
      const d = addMonths(new Date(this._leftYear, this._leftMonth, 1), 1);
      this._leftYear = d.getFullYear();
      this._leftMonth = d.getMonth();
    } else if (this._viewMode === 'months') {
      this._leftYear += 1;
    } else if (this._viewMode === 'years') {
      this._leftYear += 10;
    }
    this._refreshCalendars();
  }

  private _handleHeaderToday(): void {
    const today = new Date();
    this._leftYear = today.getFullYear();
    this._leftMonth = today.getMonth();
    this._refreshCalendars();
  }

  private _setViewMode(mode: ArvoCalendarViewMode): void {
    if (this._viewMode === mode) return;
    this._viewMode = mode;
    this._refreshCalendars();
  }

  private _refreshCalendars(): void {
    const left = this._visibleFor('left');
    const right = this._visibleFor('right');
    // Update the shared range nav. setViewMode is a no-op when the mode
    // hasn't changed; calling it unconditionally keeps the labels in sync
    // when only the visible period changed AND ensures the left zone is
    // rebuilt for the right mode after a drill-down.
    if (this._nav) {
      this._nav.setRangeEnd(right.year, right.month);
      this._nav.setVisibleMonth(left.year, left.month);
      this._nav.setViewMode(this._navViewMode());
    }
    const sharedPatch = {
      rangeStart: this._draftRange.start,
      rangeEnd: this._draftRange.end,
      hoverDate: this._hoverDate,
      isRangeComplete: !!(this._draftRange.start && this._draftRange.end),
      viewMode: this._viewMode,
    };
    this._calLeft?.update({
      ...sharedPatch,
      visibleYear: left.year,
      visibleMonth: left.month,
    });
    this._calRight?.update({
      ...sharedPatch,
      visibleYear: right.year,
      visibleMonth: right.month,
    });
  }

  private _handleCellSelect(payload: { date?: Date; mode: ArvoCalendarViewMode }): void {
    if (!payload.date) return;
    // Drill-down: clicking a tile in months / years view zooms IN one
    // level and re-centers the LEFT calendar on the clicked period.
    // Both calendars share the same viewMode so they zoom together.
    if (payload.mode !== 'days') {
      this._leftYear = payload.date.getFullYear();
      this._leftMonth = payload.date.getMonth();
      if (payload.mode === 'months') this._setViewMode('days');
      else if (payload.mode === 'years') this._setViewMode('months');
      else this._refreshCalendars();
      return;
    }
    const date = payload.date;
    if (!this._draftFirstSet) {
      // First click in an incomplete range: set start, await end.
      this._draftRange = { start: date, end: null };
      this._draftFirstSet = true;
      this._activeSide = 'end';
      this._refreshCalendars();
      return;
    }
    // Second click: form the range and commit.
    let start: Date;
    let end: Date;
    if (this._draftRange.start && date.getTime() < this._draftRange.start.getTime()) {
      start = date;
      end = this._draftRange.start;
    } else {
      start = this._draftRange.start ?? date;
      end = date;
    }
    this._draftRange = { start, end };
    this._draftFirstSet = false;
    this._activeSide = 'start';
    this._hoverDate = null;
    this._commitRange(start, end);
    this._refreshCalendars();
    if (this._opts.isAutoClose) this.close();
  }

  private _handleCellHover(payload: { date?: Date }): void {
    if (!this._draftFirstSet) return;
    if (!payload.date) {
      this._hoverDate = null;
    } else {
      this._hoverDate = payload.date;
    }
    this._refreshCalendars();
  }

  private _commitRange(start: Date, end: Date): void {
    this._appliedRange = { start, end };
    const formatted = {
      start: formatDate(start, this._effFormat, this._effLocale),
      end: formatDate(end, this._effFormat, this._effLocale),
    };
    this._opts.onChange?.({
      start,
      end,
      formatted,
      mode: 'absolute',
    });
    this._dispatch('cal-rng-drop:change', {
      start,
      end,
      formatted,
      mode: 'absolute',
    });
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
    if (!this._dispatch('cal-rng-drop:open')) return;

    this._isOpen = true;
    this._buildPopover();

    // Reset draft to applied (clears any leftover hover from prior open)
    this._draftRange = { ...this._appliedRange };
    this._draftFirstSet = !!(this._appliedRange.start && !this._appliedRange.end);
    this._activeSide = this._draftFirstSet ? 'end' : 'start';
    this._hoverDate = null;
    const minDate = asDate(this._opts.minDate, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.maxDate, this._effFormat, this._effLocale);
    const center = pickAnchorDate(
      this._appliedRange.start ?? this._appliedRange.end,
      minDate,
      maxDate,
    );
    this._leftYear = center.getFullYear();
    this._leftMonth = center.getMonth();
    this._refreshCalendars();

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
      const minDate = asDate(this._opts.minDate, this._effFormat, this._effLocale);
      const maxDate = asDate(this._opts.maxDate, this._effFormat, this._effLocale);
      const target = pickAnchorDate(this._appliedRange.start, minDate, maxDate);
      this._calLeft?.focusCell(target);
    });
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;
    if (this._opts.onClose?.() === false) return;
    if (!this._dispatch('cal-rng-drop:close')) return;

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

  range(): DateRangeValue;
  range(v: DateRangeValue): void;
  range(v?: DateRangeValue): DateRangeValue | void {
    if (v === undefined) return { ...this._appliedRange };
    const minDate = asDate(this._opts.minDate, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.maxDate, this._effFormat, this._effLocale);
    this._appliedRange = {
      start: clampDate(v.start, minDate, maxDate),
      end: clampDate(v.end, minDate, maxDate),
    };
    this._draftRange = { ...this._appliedRange };
    this._draftFirstSet = false;
    this._activeSide = 'start';
    if (this._isOpen) this._refreshCalendars();
  }

  /**
   * Imperative active-side hint used by parent pickers' segmented inputs to
   * pre-position the cursor on the calendar before the next click.
   */
  setActiveSide(side: 'start' | 'end'): void {
    this._activeSide = side;
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    if (this._opts.isDisabled === state) return;
    this._opts.isDisabled = state;
    if (state && this._isOpen) this.close();
  }

  focus(): void {
    if (!this._isOpen) return;
    const minDate = asDate(this._opts.minDate, this._effFormat, this._effLocale);
    const maxDate = asDate(this._opts.maxDate, this._effFormat, this._effLocale);
    const target = pickAnchorDate(this._appliedRange.start, minDate, maxDate);
    this._calLeft?.focusCell(target);
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
    this._calLeft?.destroy();
    this._calRight?.destroy();
    this._nav?.destroy();
    this._calLeft = null;
    this._calRight = null;
    this._nav = null;
    this._popoverEl?.remove();
    this._popoverEl = null;
    this._bodyEl = null;
    this._headerEl = null;
    this._calLeftEl = null;
    this._calRightEl = null;
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
    const cells = Array.from(root.querySelectorAll<HTMLElement>('.arvo-cal__cell[tabindex="0"]'));
    const navs = Array.from(root.querySelectorAll<HTMLElement>('.arvo-cal-nav__prev, .arvo-cal-nav__next'));
    return [...cells, ...navs];
  }
}

function clampDate(
  v: Date | null,
  min: Date | null,
  max: Date | null,
): Date | null {
  if (v == null) return null;
  if (min && v.getTime() < min.getTime()) return new Date(min.getTime());
  if (max && v.getTime() > max.getTime()) return new Date(max.getTime());
  return v;
}

// Suppress unused-import warning for sameDay -- reserved for future use
// (member/rolling mode equality checks land here in a follow-up).
void sameDay;
