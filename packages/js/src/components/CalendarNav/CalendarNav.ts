// Internal sub-component -- NOT exported from @arvo/js public barrel.
// Used inside ArvoDatePicker, and in future by ArvoDateTimePicker and
// ArvoDateRangePicker. Import directly from this folder.
//
// Renders the header navigation strip above ArvoCalendar per ADR-3:
//   - Left zone: month-button + year-button (zoom triggers)
//   - Right zone: prev + today + next icon-only buttons
//
// BEM block: arvo-cal-nav
// SCSS: packages/styles/src/components/date-time/_arvo-cal-nav.scss
//
// Events dispatched on the host element:
//   cal-nav:prev      -- {} -- prev-period button activated
//   cal-nav:next      -- {} -- next-period button activated
//   cal-nav:today     -- {} -- today button activated
//   cal-nav:month-btn -- {} -- month label button activated (zoom to months)
//   cal-nav:year-btn  -- {} -- year label button activated (zoom to years)

import {
  addMonths,
  formatDate,
  getUserLocale,
  inDateRange,
  monthOverlapsRange,
  yearOverlapsRange,
} from '@arvo/core';
import { ArvoButton } from '../Button/Button';
import { ArvoIconButton } from '../IconButton/IconButton';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CalendarNavOptions {
  // -- Visible date ----------------------------------------------------------
  /** Year currently shown in the calendar header. */
  visibleYear: number;
  /** Month currently shown (0-based: 0=January, 11=December). */
  visibleMonth: number;

  // -- View mode -------------------------------------------------------------
  /** Current calendar zoom level. Drives which buttons are active/highlighted. */
  viewMode?: 'days' | 'months' | 'years';

  // -- Layout variant --------------------------------------------------------
  /**
   * 'single' renders one month/year label group (DatePicker, DateTimePicker,
   * CalendarDropdown, DateTimeDropdown).
   * 'range' renders two label groups joined by an em-dash for the dual-
   * calendar CalendarRangeDropdown header (e.g. "June 2026 - July 2026").
   * In years view the two decades collapse to a single continuous label
   * (e.g. "2020 - 2039") matching the React CalendarNav range variant.
   */
  variant?: 'single' | 'range';
  /** Range variant: year shown by the right (end) calendar. */
  rangeEndYear?: number;
  /** Range variant: month shown by the right (end) calendar (0-based). */
  rangeEndMonth?: number;

  // -- Locale ----------------------------------------------------------------
  /** BCP-47 locale. Drives month/year label formatting. */
  locale?: string;

  // -- Date bounds -----------------------------------------------------------
  /** Min selectable date; used to compute prev-button disabled state. */
  minDate?: Date | null;
  /** Max selectable date; used to compute next-button disabled state. */
  maxDate?: Date | null;

  // -- State -----------------------------------------------------------------
  /** When true, all interactive elements are non-interactive. */
  isDisabled?: boolean;

  // -- Callbacks -------------------------------------------------------------
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onMonthButtonClick?: () => void;
  onYearButtonClick?: () => void;

  // -- Tooltip overrides (English defaults) ----------------------------------
  /** Tooltip for the prev button. Defaults to 'Previous'. */
  prevTooltip?: string;
  /** Tooltip for the next button. Defaults to 'Next'. */
  nextTooltip?: string;
  /** Tooltip for the today button. Defaults to 'Select today'. */
  todayTooltip?: string;
  /** Tooltip for the month label button. Defaults to 'Choose month'. */
  monthTooltip?: string;
  /** Tooltip for the year label button. Defaults to 'Choose year'. */
  yearTooltip?: string;

  // -- Forwarded HTML props --------------------------------------------------
  className?: string;
  id?: string;
}

type RequiredCalendarNavOptions = Required<
  Omit<
    CalendarNavOptions,
    | 'onPrev'
    | 'onNext'
    | 'onToday'
    | 'onMonthButtonClick'
    | 'onYearButtonClick'
    | 'minDate'
    | 'maxDate'
    | 'locale'
    | 'className'
    | 'id'
    | 'rangeEndYear'
    | 'rangeEndMonth'
  >
> & {
  minDate: Date | null;
  maxDate: Date | null;
  locale: string | null;
  className: string | null;
  id: string | null;
  rangeEndYear: number | null;
  rangeEndMonth: number | null;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onToday: (() => void) | null;
  onMonthButtonClick: (() => void) | null;
  onYearButtonClick: (() => void) | null;
};

// Em-dash joining the start/end label groups in the range header variant.
const EM_DASH = '\u2014';

// ---------------------------------------------------------------------------
// Helpers (pure; mirror React component)
// ---------------------------------------------------------------------------

function previousPeriod(
  viewMode: 'days' | 'months' | 'years',
  year: number,
  month: number,
): { year: number; month: number } {
  if (viewMode === 'days') {
    const d = addMonths(new Date(year, month, 1), -1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }
  if (viewMode === 'months') return { year: year - 1, month };
  return { year: year - 10, month };
}

function nextPeriod(
  viewMode: 'days' | 'months' | 'years',
  year: number,
  month: number,
): { year: number; month: number } {
  if (viewMode === 'days') {
    const d = addMonths(new Date(year, month, 1), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }
  if (viewMode === 'months') return { year: year + 1, month };
  return { year: year + 10, month };
}

function periodOverlapsRange(
  viewMode: 'days' | 'months' | 'years',
  year: number,
  month: number,
  minDate: Date | null,
  maxDate: Date | null,
): boolean {
  if (viewMode === 'days') return monthOverlapsRange(year, month, minDate, maxDate);
  if (viewMode === 'months') {
    for (let m = 0; m < 12; m += 1) {
      if (monthOverlapsRange(year, m, minDate, maxDate)) return true;
    }
    return false;
  }
  const start = year - ((year % 10) + 10) % 10;
  for (let i = 0; i < 10; i += 1) {
    if (yearOverlapsRange(start + i, minDate, maxDate)) return true;
  }
  return false;
}

function canGoPrev(opts: RequiredCalendarNavOptions): boolean {
  if (!opts.minDate && !opts.maxDate) return true;
  const { year, month } = previousPeriod(opts.viewMode, opts.visibleYear, opts.visibleMonth);
  return periodOverlapsRange(opts.viewMode, year, month, opts.minDate, opts.maxDate);
}

function canGoNext(opts: RequiredCalendarNavOptions): boolean {
  if (!opts.minDate && !opts.maxDate) return true;
  const { year, month } = nextPeriod(opts.viewMode, opts.visibleYear, opts.visibleMonth);
  return periodOverlapsRange(opts.viewMode, year, month, opts.minDate, opts.maxDate);
}

// canGoToday: false when today's date is outside [minDate, maxDate]. Without
// this guard the Today action would snap the calendar onto a period whose
// tiles AND adjacent Prev/Next periods are all out-of-range, leaving the user
// stuck on a dead view with no escape. Mirrors the React CalendarNav check.
function canGoToday(opts: RequiredCalendarNavOptions): boolean {
  if (!opts.minDate && !opts.maxDate) return true;
  return inDateRange(new Date(), opts.minDate, opts.maxDate);
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class CalendarNav {
  private _element: HTMLElement | null;
  private _options: RequiredCalendarNavOptions;

  private _leftEl: HTMLElement | null = null;
  private _rightEl: HTMLElement | null = null;
  // Left-zone button refs. In single variant only the *L slots are populated
  // (the left zone has one month/year pair). In range variant both *L and
  // *R slots are populated and joined by an em-dash separator.
  private _monthBtnLEl: HTMLButtonElement | null = null;
  private _yearBtnLEl: HTMLButtonElement | null = null;
  private _monthBtnREl: HTMLButtonElement | null = null;
  private _yearBtnREl: HTMLButtonElement | null = null;
  private _decadeLblEl: HTMLSpanElement | null = null;
  private _rangeSepEl: HTMLSpanElement | null = null;
  private _prevBtnEl: HTMLButtonElement | null = null;
  private _todayBtnEl: HTMLButtonElement | null = null;
  private _nextBtnEl: HTMLButtonElement | null = null;

  private _monthBtnL: ArvoButton | null = null;
  private _yearBtnL: ArvoButton | null = null;
  private _monthBtnR: ArvoButton | null = null;
  private _yearBtnR: ArvoButton | null = null;
  private _prevBtn: ArvoIconButton | null = null;
  private _todayBtn: ArvoIconButton | null = null;
  private _nextBtn: ArvoIconButton | null = null;

  private _destroyed = false;

  static initialize(element: HTMLElement, options: CalendarNavOptions): CalendarNav {
    return new CalendarNav(element, options);
  }

  constructor(element: HTMLElement, options: CalendarNavOptions) {
    this._element = element;
    this._options = {
      visibleYear: options.visibleYear,
      visibleMonth: options.visibleMonth,
      viewMode: options.viewMode ?? 'days',
      variant: options.variant ?? 'single',
      rangeEndYear: options.rangeEndYear ?? null,
      rangeEndMonth: options.rangeEndMonth ?? null,
      locale: options.locale ?? null,
      minDate: options.minDate ?? null,
      maxDate: options.maxDate ?? null,
      isDisabled: options.isDisabled ?? false,
      prevTooltip: options.prevTooltip ?? 'Previous',
      nextTooltip: options.nextTooltip ?? 'Next',
      todayTooltip: options.todayTooltip ?? 'Select today',
      monthTooltip: options.monthTooltip ?? 'Choose month',
      yearTooltip: options.yearTooltip ?? 'Choose year',
      onPrev: options.onPrev ?? null,
      onNext: options.onNext ?? null,
      onToday: options.onToday ?? null,
      onMonthButtonClick: options.onMonthButtonClick ?? null,
      onYearButtonClick: options.onYearButtonClick ?? null,
      className: options.className ?? null,
      id: options.id ?? null,
    };

    this._buildDom();
    this._mountInnerButtons();
    this._syncRootClasses();
    this._syncNavDisabled();
    this._syncPressed();
  }

  // -------------------------------------------------------------------------
  // DOM build
  // -------------------------------------------------------------------------

  private _buildDom(): void {
    const root = this._element!;
    root.classList.add('arvo-cal-nav');
    root.classList.add(`arvo-cal-nav--${this._options.viewMode}`);
    if (this._options.className) {
      for (const cls of this._options.className.split(/\s+/).filter(Boolean)) {
        root.classList.add(cls);
      }
    }
    if (this._options.id) root.id = this._options.id;

    this._leftEl = document.createElement('div');
    this._leftEl.className = 'arvo-cal-nav__left';
    this._renderLeftZone();

    this._rightEl = document.createElement('div');
    this._rightEl.className = 'arvo-cal-nav__right';

    this._prevBtnEl = document.createElement('button') as HTMLButtonElement;
    this._prevBtnEl.classList.add('arvo-cal-nav__prev');
    this._rightEl.appendChild(this._prevBtnEl);

    this._nextBtnEl = document.createElement('button') as HTMLButtonElement;
    this._nextBtnEl.classList.add('arvo-cal-nav__next');
    this._rightEl.appendChild(this._nextBtnEl);

    this._todayBtnEl = document.createElement('button') as HTMLButtonElement;
    this._todayBtnEl.classList.add('arvo-cal-nav__today');
    this._rightEl.appendChild(this._todayBtnEl);

    root.appendChild(this._leftEl);
    root.appendChild(this._rightEl);
  }

  // Composes the left zone based on the current view mode AND variant:
  //   single + days   -> Month button + Year button
  //   single + months -> Year button only (clickable to zoom out to years)
  //   single + years  -> Decade span "YYYY - YYYY", non-interactive
  //   range  + days   -> Month L + Year L + em-dash + Month R + Year R
  //   range  + months -> Year L + em-dash + Year R
  //   range  + years  -> Single continuous decade span ("2020 - 2039")
  private _renderLeftZone(): void {
    if (!this._leftEl) return;

    // Tear down everything in the left zone so we can rebuild it cleanly
    // for the current view-mode / variant combo.
    this._monthBtnL?.destroy();
    this._yearBtnL?.destroy();
    this._monthBtnR?.destroy();
    this._yearBtnR?.destroy();
    this._monthBtnL = null;
    this._yearBtnL = null;
    this._monthBtnR = null;
    this._yearBtnR = null;
    this._monthBtnLEl = null;
    this._yearBtnLEl = null;
    this._monthBtnREl = null;
    this._yearBtnREl = null;
    this._decadeLblEl = null;
    this._rangeSepEl = null;
    this._leftEl.textContent = '';

    const mode = this._options.viewMode;
    const isRange = this._options.variant === 'range';

    if (mode === 'years') {
      const span = document.createElement('span');
      span.className = 'arvo-cal-nav__decade-lbl';
      const label = isRange ? this._continuousDecadeLabel() : this._decadeLabel();
      span.textContent = label;
      span.setAttribute('aria-label', label);
      span.setAttribute('aria-disabled', 'true');
      this._decadeLblEl = span;
      this._leftEl.appendChild(span);
      return;
    }

    // Helper that builds one Month/Year pair (or year-only in months mode)
    // and appends it to the left zone. Used once for single variant and
    // twice for range variant.
    const appendPair = (side: 'L' | 'R'): void => {
      if (mode !== 'months') {
        const monthBtnEl = document.createElement('button') as HTMLButtonElement;
        monthBtnEl.classList.add('arvo-cal-nav__month-btn');
        this._leftEl!.appendChild(monthBtnEl);
        if (side === 'L') this._monthBtnLEl = monthBtnEl;
        else this._monthBtnREl = monthBtnEl;
      }
      const yearBtnEl = document.createElement('button') as HTMLButtonElement;
      yearBtnEl.classList.add('arvo-cal-nav__year-btn');
      this._leftEl!.appendChild(yearBtnEl);
      if (side === 'L') this._yearBtnLEl = yearBtnEl;
      else this._yearBtnREl = yearBtnEl;
    };

    appendPair('L');

    if (isRange) {
      this._rangeSepEl = document.createElement('span');
      this._rangeSepEl.className = 'arvo-cal-nav__range-sep';
      this._rangeSepEl.textContent = EM_DASH;
      this._rangeSepEl.setAttribute('aria-hidden', 'true');
      this._leftEl.appendChild(this._rangeSepEl);
      appendPair('R');
    }
  }

  private _mountInnerButtons(): void {
    this._mountLeftZoneButtons();

    if (!this._prevBtnEl || !this._todayBtnEl || !this._nextBtnEl) return;

    this._prevBtn = ArvoIconButton.initialize(this._prevBtnEl, {
      variant: 'tertiary',
      size: 'md',
      icon: 'angle-up',
      tooltip: this._options.prevTooltip,
      isDisabled: this._options.isDisabled || !canGoPrev(this._options),
      onClick: () => this._emit('cal-nav:prev', this._options.onPrev),
    });

    this._nextBtn = ArvoIconButton.initialize(this._nextBtnEl, {
      variant: 'tertiary',
      size: 'md',
      icon: 'angle-down',
      tooltip: this._options.nextTooltip,
      isDisabled: this._options.isDisabled || !canGoNext(this._options),
      onClick: () => this._emit('cal-nav:next', this._options.onNext),
    });

    this._todayBtn = ArvoIconButton.initialize(this._todayBtnEl, {
      variant: 'tertiary',
      size: 'md',
      icon: 'calendar-date-selected',
      tooltip: this._options.todayTooltip,
      isDisabled: this._options.isDisabled || !canGoToday(this._options),
      onClick: () => this._emit('cal-nav:today', this._options.onToday),
    });
  }

  // Mounts the Month/Year ArvoButton instances onto the left-zone element
  // slots created by _renderLeftZone. Called from the constructor and from
  // setViewMode / setVariant where the left zone is rebuilt.
  private _mountLeftZoneButtons(): void {
    const monthsView = this._options.viewMode === 'months';

    if (this._monthBtnLEl) {
      this._monthBtnL = ArvoButton.initialize(this._monthBtnLEl, {
        variant: 'tertiary',
        size: 'md',
        label: this._monthLabel(this._options.visibleYear, this._options.visibleMonth),
        isDisabled: this._options.isDisabled,
        onClick: () => this._emit('cal-nav:month-btn', this._options.onMonthButtonClick),
      });
      this._monthBtnLEl.setAttribute('aria-label', this._options.monthTooltip);
      this._monthBtnLEl.setAttribute(
        'aria-pressed',
        String(monthsView),
      );
    }

    if (this._yearBtnLEl) {
      this._yearBtnL = ArvoButton.initialize(this._yearBtnLEl, {
        variant: 'tertiary',
        size: 'md',
        label: this._yearLabel(this._options.visibleYear),
        isDisabled: this._options.isDisabled,
        onClick: () => this._emit('cal-nav:year-btn', this._options.onYearButtonClick),
      });
      this._yearBtnLEl.setAttribute('aria-label', this._options.yearTooltip);
      this._yearBtnLEl.setAttribute(
        'aria-pressed',
        String(this._options.viewMode === 'years' || monthsView),
      );
    }

    // Range variant: mount the second (right) pair using rangeEndYear /
    // rangeEndMonth. Clicking either pair's button has the same effect --
    // both calendars zoom together because they share a single viewMode in
    // the parent.
    const endYear = this._options.rangeEndYear ?? this._options.visibleYear;
    const endMonth = this._options.rangeEndMonth ?? this._options.visibleMonth;

    if (this._monthBtnREl) {
      this._monthBtnR = ArvoButton.initialize(this._monthBtnREl, {
        variant: 'tertiary',
        size: 'md',
        label: this._monthLabel(endYear, endMonth),
        isDisabled: this._options.isDisabled,
        onClick: () => this._emit('cal-nav:month-btn', this._options.onMonthButtonClick),
      });
      this._monthBtnREl.setAttribute('aria-label', this._options.monthTooltip);
      this._monthBtnREl.setAttribute('aria-pressed', String(monthsView));
    }

    if (this._yearBtnREl) {
      this._yearBtnR = ArvoButton.initialize(this._yearBtnREl, {
        variant: 'tertiary',
        size: 'md',
        label: this._yearLabel(endYear),
        isDisabled: this._options.isDisabled,
        onClick: () => this._emit('cal-nav:year-btn', this._options.onYearButtonClick),
      });
      this._yearBtnREl.setAttribute('aria-label', this._options.yearTooltip);
      this._yearBtnREl.setAttribute(
        'aria-pressed',
        String(this._options.viewMode === 'years' || monthsView),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  private _effLocale(): string {
    return getUserLocale(this._options.locale ?? undefined);
  }

  private _monthLabel(year: number, month: number): string {
    return formatDate(new Date(year, month, 1), 'MMMM', this._effLocale());
  }

  private _yearLabel(year: number): string {
    return String(year);
  }

  private _decadeLabel(): string {
    const start = this._options.visibleYear -
      ((this._options.visibleYear % 10) + 10) % 10;
    return `${start} - ${start + 9}`;
  }

  // Range variant + years view collapses both decades into a single
  // continuous label spanning the first year of the left decade to the
  // last year of the right decade (e.g. "2020 - 2039"). Mirrors React
  // CalendarNav.renderLeft / variant='range' / years.
  private _continuousDecadeLabel(): string {
    const leftDecade = this._options.visibleYear -
      ((this._options.visibleYear % 10) + 10) % 10;
    const endYear = this._options.rangeEndYear ?? this._options.visibleYear;
    const rightDecade = endYear - ((endYear % 10) + 10) % 10;
    const firstYear = Math.min(leftDecade, rightDecade);
    const lastYear = Math.max(leftDecade, rightDecade) + 9;
    return `${firstYear} - ${lastYear}`;
  }

  private _syncRootClasses(): void {
    if (!this._element) return;
    this._element.classList.toggle('is-disabled', this._options.isDisabled);
    // Sync the view-mode modifier so CSS selectors like
    // `.arvo-cal-nav--years` can scope per-view tweaks.
    for (const mode of ['days', 'months', 'years'] as const) {
      this._element.classList.toggle(
        `arvo-cal-nav--${mode}`,
        this._options.viewMode === mode,
      );
    }
    // Sync the variant modifier so CSS can target range-specific layout.
    this._element.classList.toggle(
      'arvo-cal-nav--range',
      this._options.variant === 'range',
    );
  }

  private _syncNavDisabled(): void {
    const disabled = this._options.isDisabled;
    this._prevBtn?.disabled(disabled || !canGoPrev(this._options));
    this._nextBtn?.disabled(disabled || !canGoNext(this._options));
    this._todayBtn?.disabled(disabled || !canGoToday(this._options));
    this._monthBtnL?.disabled(disabled);
    this._yearBtnL?.disabled(disabled);
    this._monthBtnR?.disabled(disabled);
    this._yearBtnR?.disabled(disabled);
  }

  private _syncPressed(): void {
    const monthsView = this._options.viewMode === 'months';
    const yearsView = this._options.viewMode === 'years';
    if (this._monthBtnLEl) {
      this._monthBtnLEl.setAttribute('aria-pressed', String(monthsView));
    }
    if (this._monthBtnREl) {
      this._monthBtnREl.setAttribute('aria-pressed', String(monthsView));
    }
    if (this._yearBtnLEl) {
      this._yearBtnLEl.setAttribute('aria-pressed', String(yearsView));
    }
    if (this._yearBtnREl) {
      this._yearBtnREl.setAttribute('aria-pressed', String(yearsView));
    }
  }

  private _syncLabels(): void {
    if (this._monthBtnL) {
      this._monthBtnL.setLabel(
        this._monthLabel(this._options.visibleYear, this._options.visibleMonth),
      );
    }
    if (this._yearBtnL) {
      this._yearBtnL.setLabel(this._yearLabel(this._options.visibleYear));
    }
    const endYear = this._options.rangeEndYear ?? this._options.visibleYear;
    const endMonth = this._options.rangeEndMonth ?? this._options.visibleMonth;
    if (this._monthBtnR) {
      this._monthBtnR.setLabel(this._monthLabel(endYear, endMonth));
    }
    if (this._yearBtnR) {
      this._yearBtnR.setLabel(this._yearLabel(endYear));
    }
    if (this._decadeLblEl) {
      const label = this._options.variant === 'range'
        ? this._continuousDecadeLabel()
        : this._decadeLabel();
      this._decadeLblEl.textContent = label;
      this._decadeLblEl.setAttribute('aria-label', label);
    }
  }

  private _emit(name: string, cb: (() => void) | null): void {
    if (this._options.isDisabled) return;
    cb?.();
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true }),
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  setVisibleMonth(year: number, month: number): void {
    this._options.visibleYear = year;
    this._options.visibleMonth = month;
    this._syncLabels();
    this._syncNavDisabled();
  }

  /**
   * Range variant only: update the end (right) calendar's visible period
   * without changing the left period. Triggers re-render of the right
   * label pair (or the continuous decade label in years view).
   */
  setRangeEnd(year: number, month: number): void {
    this._options.rangeEndYear = year;
    this._options.rangeEndMonth = month;
    this._syncLabels();
  }

  setViewMode(mode: 'days' | 'months' | 'years'): void {
    if (this._options.viewMode === mode) return;
    this._options.viewMode = mode;
    // The left zone composition depends on view mode, so we rebuild it
    // from scratch (cheap -- at most 4 buttons + 1 span in range variant)
    // and remount the inner ArvoButton instances. Right-zone icon buttons
    // stay put. Handles both single and range variants uniformly via
    // _mountLeftZoneButtons.
    this._renderLeftZone();
    this._mountLeftZoneButtons();
    this._syncRootClasses();
    this._syncPressed();
    this._syncNavDisabled();
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;
    this._options.isDisabled = state;
    this._syncRootClasses();
    this._syncNavDisabled();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._monthBtnL?.destroy();
    this._yearBtnL?.destroy();
    this._monthBtnR?.destroy();
    this._yearBtnR?.destroy();
    this._prevBtn?.destroy();
    this._todayBtn?.destroy();
    this._nextBtn?.destroy();
    this._monthBtnL = null;
    this._yearBtnL = null;
    this._monthBtnR = null;
    this._yearBtnR = null;
    this._prevBtn = null;
    this._todayBtn = null;
    this._nextBtn = null;

    if (this._element) {
      this._element.classList.remove('arvo-cal-nav', 'is-disabled');
      this._element.textContent = '';
    }

    this._monthBtnLEl = null;
    this._yearBtnLEl = null;
    this._monthBtnREl = null;
    this._yearBtnREl = null;
    this._prevBtnEl = null;
    this._todayBtnEl = null;
    this._nextBtnEl = null;
    this._leftEl = null;
    this._rightEl = null;
    this._element = null;
  }
}

export default CalendarNav;
