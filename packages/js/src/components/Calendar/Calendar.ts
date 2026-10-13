// Vanilla JS ArvoCalendar.
//
// Internal calendar grid that renders one view at a time (days / months /
// quarters / years / member tiles). Standalone -- DOES NOT own the header
// chrome (ADR-3). Consumed by ArvoDatePicker, ArvoDateTimePicker, and
// ArvoDateRangePicker. Reusable from @arvo/js for advanced composition.
//
// Behavioral parity with packages/react/src/components/Calendar/Calendar.tsx --
// same BEM classes, ARIA attributes, keyboard map, tooltip wiring, and event
// payloads. Only framework idioms differ.

import {
  addMonths,
  findMemberByIndex,
  findMemberForDate,
  formatDate,
  formatWeekNumber,
  getMembersForDecade,
  getMembersForMonth,
  getMembersForYear,
  getMonthMatrix,
  getMonthNames,
  getUserLocale,
  getWeekNumber,
  getWeekdayHeaders,
  inDateRange,
  isAfterDay,
  isBeforeDay,
  isMemberInRange,
  isSameDay,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  monthOverlapsRange,
  normalizeDate,
  tooltipManager,
  yearOverlapsRange,
  type MemberIndex,
  type NormalizedMember,
} from '@arvo/core';

// Calendar view modes. Drives the active grid layout and the arvo-cal--{mode}
// modifier on the root element. quarters mode is only used when frequency is
// 'quarter'.
export type ArvoCalendarViewMode =
  | 'days'
  | 'months'
  | 'quarters'
  | 'years'
  | 'members';

export interface ArvoCalendarOptions {
  // -- Identity / locale ----------------------------------------------------
  locale?: string;

  // -- Visible period -------------------------------------------------------
  visibleYear: number;
  visibleMonth: number;

  // -- Active view ----------------------------------------------------------
  viewMode?: ArvoCalendarViewMode;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasWeeks?: boolean;
  hasOutsideDays?: boolean;

  // -- Member-aware ---------------------------------------------------------
  frequency?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  memberIndex?: MemberIndex | null;
  currentMemberIndex?: number | null;

  // -- Selection / range / hover --------------------------------------------
  selectedDate?: Date | null;
  selectedMember?: NormalizedMember | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  hoverDate?: Date | null;
  isRangeComplete?: boolean;

  // -- Constraints ----------------------------------------------------------
  minDate?: Date | null;
  maxDate?: Date | null;

  // -- Behavior -------------------------------------------------------------
  isKeyboardEnabled?: boolean;
  size?: 'sm' | 'md' | 'lg';

  // -- Callbacks ------------------------------------------------------------
  onCellSelect?: (payload: {
    date?: Date;
    member?: NormalizedMember;
    mode: ArvoCalendarViewMode;
  }) => void;
  onCellHover?: (payload: {
    date?: Date;
    member?: NormalizedMember;
  }) => void;
  onViewModeChange?: (payload: { mode: ArvoCalendarViewMode }) => void;
  onMonthChange?: (payload: { year: number; month: number }) => void;
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Internal cell shape ------------------------------------------------------
// ---------------------------------------------------------------------------

interface CalendarCell {
  // Stable key (ISO date / `${y}-${m}` / `${y}-Q${q}` / year / member.key).
  key: string;
  // Primary text content.
  label: string;
  // Optional secondary text (e.g. week date-range in member tiles).
  subLabel?: string;
  // Localized aria-label.
  ariaLabel: string;
  // Tooltip text (only attached when present).
  tooltip?: string;
  // Underlying value (one of these is set).
  date?: Date;
  member?: NormalizedMember;
  // Placeholder cells render an empty box (hasOutsideDays=false).
  placeholder?: boolean;
  // Visual state flags.
  isOutside: boolean;
  isToday: boolean;
  isCurrentMember: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isPreview: boolean;
  isDisabled: boolean;
  // True when the cell's date matches a member's keyDate. Days view sets this
  // for any day whose date equals a member.keyDate. Months view sets it only
  // when frequency is quarter or year (any other frequency would key-highlight
  // every visible month, defeating the purpose). All other view modes leave
  // it false.
  isKeyHighlight: boolean;
}

// Days-of-month -> quarter (1..4).
function quarterOf(monthIdx: number): number {
  return Math.floor(monthIdx / 3) + 1;
}

// Decade window helpers: 2026 -> 2020..2029.
function decadeStart(year: number): number {
  return year - ((year % 10) + 10) % 10;
}

// Day-level comparator used for range/hover ordering.
function dayCompare(a: Date, b: Date): number {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() - b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() - b.getMonth();
  return a.getDate() - b.getDate();
}

// Local YYYY-MM-DD key. Avoids toISOString() to keep the key in the LOCAL
// calendar day, since toISOString uses UTC and would shift the key by a day
// for midnight-local dates in non-UTC zones.
function dayKey(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns the [start, end] of a range with the smaller endpoint first.
function orderedRange(a: Date, b: Date): [Date, Date] {
  return dayCompare(a, b) <= 0 ? [a, b] : [b, a];
}

// Number of columns per row for a given view mode (drives Up/Down nav).
function colsForView(mode: ArvoCalendarViewMode): number {
  switch (mode) {
    case 'days':
      return 7;
    case 'months':
    case 'years':
      return 4;
    case 'quarters':
      return 4;
    case 'members':
      return 8;
  }
}

// True when the event represents a typeable letter for type-ahead.
function isTypeaheadKey(e: KeyboardEvent): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey) return false;
  return e.key.length === 1 && /\S/.test(e.key);
}

// ---------------------------------------------------------------------------
// Component ----------------------------------------------------------------
// ---------------------------------------------------------------------------

export class ArvoCalendar {
  private _element: HTMLElement | null;
  private _options: ArvoCalendarOptions;

  // Resolved locale (computed from options.locale via getUserLocale cascade).
  private _locale: string;
  // Reactive "now". Recomputed when the visible period or view mode changes,
  // mirroring the React useMemo deps (visibleYear, visibleMonth, viewMode).
  private _now: Date = new Date();
  private _lastNowKey = '';

  // Grid element.
  private _gridEl: HTMLElement | null = null;
  // Weekday header row (days view only).
  private _weekdayHeaderRowEl: HTMLElement | null = null;
  // Body rows (week rows in days view; period rows otherwise). Reused across
  // renders so cells can be re-parented without recreating row nodes.
  private _rowEls: HTMLElement[] = [];
  // Per-row leading week-number gutter cell (days view + hasWeeks).
  private _rowWeekEls: HTMLElement[] = [];
  // Cells indexed by stable key for diff-based DOM updates.
  private _cellMap: Map<string, HTMLElement> = new Map();
  // Currently-active cells in render order. Used for keyboard navigation.
  private _cellOrder: CalendarCell[] = [];

  // Focused cell key (roving tabindex).
  private _focusedKey: string;
  // Preferred day-of-month captured before a Page navigation so the next
  // render can pick the cell with the same day in the new period instead of
  // falling back to today / first-selectable.
  private _preferredDay: number | null = null;
  // Whether the consumer has ever called focusCell -- guards rAF focus calls.
  private _focusRequested = false;
  // Pending rAF id for focus restoration.
  private _focusRafId: number | null = null;

  // Type-ahead buffer (months view only). Cleared after 500ms idle.
  private _typeAheadBuf = '';
  private _typeAheadTimer: ReturnType<typeof setTimeout> | null = null;

  // Warn once when memberIndex/frequency are missing in members view.
  private _warnedMembersView = false;

  // Bound listeners (so addEventListener / removeEventListener pair up).
  private _boundHandleKeyDown: (e: KeyboardEvent) => void;
  private _boundHandleGridPointerLeave: () => void;
  private _boundHandlePointerOver: (e: PointerEvent) => void;
  private _boundHandlePointerOut: (e: PointerEvent) => void;
  private _boundHandleFocusIn: (e: FocusEvent) => void;
  private _boundHandleFocusOut: () => void;

  static initialize(
    element: HTMLElement,
    options: ArvoCalendarOptions,
  ): ArvoCalendar {
    return new ArvoCalendar(element, options);
  }

  constructor(element: HTMLElement, options: ArvoCalendarOptions) {
    this._element = element;
    this._options = { ...options };
    this._locale = getUserLocale(this._options.locale);
    this._refreshNow(true);

    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandleGridPointerLeave = this._handleGridPointerLeave.bind(this);
    this._boundHandlePointerOver = this._handlePointerOver.bind(this);
    this._boundHandlePointerOut = this._handlePointerOut.bind(this);
    this._boundHandleFocusIn = this._handleFocusIn.bind(this);
    this._boundHandleFocusOut = this._handleFocusOut.bind(this);

    this._focusedKey = computeInitialFocusKey({
      viewMode: this._options.viewMode ?? 'days',
      visibleYear: this._options.visibleYear,
      visibleMonth: this._options.visibleMonth,
      weekStart: this._options.weekStart ?? 0,
      selectedDate: this._options.selectedDate ?? null,
      selectedMember: this._options.selectedMember ?? null,
      memberIndex: this._options.memberIndex ?? null,
      minDate: this._options.minDate ?? null,
      maxDate: this._options.maxDate ?? null,
      now: this._now,
    });

    this._buildSkeleton();
    this._attachListeners();
    this._render();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  // Move roving focus to the matching cell. The next animation frame focuses
  // the underlying DOM node so the new tabindex=0 is in place first.
  focusCell(target: Date | NormalizedMember): void {
    const viewMode = this._viewMode();
    const key =
      target instanceof Date
        ? keyForDateInView(viewMode, target, this._options.memberIndex ?? null)
        : target.key;
    this._setFocusedKey(key);
    this._focusRequested = true;
    if (this._focusRafId != null) cancelAnimationFrame(this._focusRafId);
    this._focusRafId = requestAnimationFrame(() => {
      this._focusRafId = null;
      const el = this._cellMap.get(this._focusedKey) ?? null;
      el?.focus();
    });
  }

  // Restore focus to the currently-focused cell (e.g. after parent overlay
  // returns focus). No-op if no cell has been focused yet.
  restoreFocus(): void {
    const el = this._cellMap.get(this._focusedKey) ?? null;
    el?.focus();
  }

  // Request a view-mode change. Mirrors React: emits a cancellable event and
  // calls the callback; the parent is expected to apply via update().
  setViewMode(mode: ArvoCalendarViewMode): void {
    this._emitViewModeChange(mode);
  }

  // Advance one period in the current view.
  next(): void {
    const next = stepVisiblePeriod({
      viewMode: this._viewMode(),
      visibleYear: this._options.visibleYear,
      visibleMonth: this._options.visibleMonth,
      direction: 1,
    });
    this._emitMonthChange(next.year, next.month);
  }

  // Back one period in the current view.
  prev(): void {
    const next = stepVisiblePeriod({
      viewMode: this._viewMode(),
      visibleYear: this._options.visibleYear,
      visibleMonth: this._options.visibleMonth,
      direction: -1,
    });
    this._emitMonthChange(next.year, next.month);
  }

  // Snap visible period to today's date.
  today(): void {
    const today = new Date();
    this._emitMonthChange(today.getFullYear(), today.getMonth());
  }

  // Bulk update. Calendar is fully driven by its options (parity with the
  // React component which is fully prop-driven); consumers push a partial
  // and the grid re-renders against the cached cell nodes. This single
  // setter is preferred over a dozen per-option setters because the calendar
  // has 17+ dynamic options and most consumer updates touch several at once.
  update(partial: Partial<ArvoCalendarOptions>): void {
    const prev = this._options;
    this._options = { ...prev, ...partial };

    // Re-resolve locale only if it actually changed.
    if ('locale' in partial && partial.locale !== prev.locale) {
      this._locale = getUserLocale(this._options.locale);
    }

    // The React component recomputes "now" when visibleYear/visibleMonth/
    // viewMode change. Match that to refresh today/current-member highlights.
    this._refreshNow();

    // If the view mode changed under us, the weekday-header row may need to
    // appear/disappear. Toggle it now before render so attribute math (aria
    // row/col counts) is consistent.
    this._render();
  }

  destroy(): void {
    if (this._focusRafId != null) {
      cancelAnimationFrame(this._focusRafId);
      this._focusRafId = null;
    }
    if (this._typeAheadTimer) {
      clearTimeout(this._typeAheadTimer);
      this._typeAheadTimer = null;
    }

    this._detachListeners();
    tooltipManager.hide(true);

    if (this._element) {
      this._element.textContent = '';
      this._element.removeAttribute('role');
      this._element.removeAttribute('aria-label');
      this._element.classList.remove(
        'arvo-cal',
        'arvo-cal--days',
        'arvo-cal--months',
        'arvo-cal--quarters',
        'arvo-cal--years',
        'arvo-cal--members',
        'arvo-cal--show-weeks',
        'arvo-cal--range',
      );
    }

    this._gridEl = null;
    this._weekdayHeaderRowEl = null;
    this._rowEls = [];
    this._rowWeekEls = [];
    this._cellMap.clear();
    this._cellOrder = [];
    this._element = null;
  }

  // -------------------------------------------------------------------------
  // Skeleton: build once on initialize. The grid container and its top-level
  // children persist for the lifetime of the instance; only the cells inside
  // are rebuilt/diff-updated.
  // -------------------------------------------------------------------------

  private _buildSkeleton(): void {
    const el = this._element!;
    el.classList.add('arvo-cal');
    el.setAttribute('role', 'application');

    this._gridEl = document.createElement('div');
    this._gridEl.className = 'arvo-cal__grid';
    this._gridEl.setAttribute('role', 'grid');
    el.appendChild(this._gridEl);
  }

  private _attachListeners(): void {
    if (!this._gridEl) return;
    this._gridEl.addEventListener('keydown', this._boundHandleKeyDown);
    this._gridEl.addEventListener('pointerleave', this._boundHandleGridPointerLeave);
    this._gridEl.addEventListener('pointerover', this._boundHandlePointerOver);
    this._gridEl.addEventListener('pointerout', this._boundHandlePointerOut);
    this._gridEl.addEventListener('focusin', this._boundHandleFocusIn);
    this._gridEl.addEventListener('focusout', this._boundHandleFocusOut);
  }

  private _detachListeners(): void {
    if (!this._gridEl) return;
    this._gridEl.removeEventListener('keydown', this._boundHandleKeyDown);
    this._gridEl.removeEventListener('pointerleave', this._boundHandleGridPointerLeave);
    this._gridEl.removeEventListener('pointerover', this._boundHandlePointerOver);
    this._gridEl.removeEventListener('pointerout', this._boundHandlePointerOut);
    this._gridEl.removeEventListener('focusin', this._boundHandleFocusIn);
    this._gridEl.removeEventListener('focusout', this._boundHandleFocusOut);
  }

  // -------------------------------------------------------------------------
  // Render: classes, aria-label, then the cell grid via row/cell reuse.
  // -------------------------------------------------------------------------

  private _render(): void {
    if (!this._element || !this._gridEl) return;
    this._renderRootClasses();
    this._renderAriaLabel();
    this._renderGrid();
    this._renderRovingTabindex();
  }

  private _renderRootClasses(): void {
    const el = this._element!;
    const viewMode = this._viewMode();
    const rangeMode = this._rangeMode();
    const hasWeeks = !!this._options.hasWeeks;

    el.classList.remove(
      'arvo-cal--days',
      'arvo-cal--months',
      'arvo-cal--quarters',
      'arvo-cal--years',
      'arvo-cal--members',
    );
    el.classList.add(`arvo-cal--${viewMode}`);
    el.classList.toggle('arvo-cal--show-weeks', hasWeeks);
    el.classList.toggle('arvo-cal--range', rangeMode);
  }

  private _renderAriaLabel(): void {
    if (!this._element) return;
    const label = buildRootAriaLabel({
      viewMode: this._viewMode(),
      visibleYear: this._options.visibleYear,
      visibleMonth: this._options.visibleMonth,
      locale: this._locale,
    });
    this._element.setAttribute('aria-label', label);
  }

  private _renderGrid(): void {
    if (!this._gridEl) return;
    const viewMode = this._viewMode();
    const cols = colsForView(viewMode);

    const cells = this._buildCells(viewMode);
    this._cellOrder = cells;

    // Weekday header row -- present in days view only.
    if (viewMode === 'days') {
      this._renderWeekdayHeader();
    } else if (this._weekdayHeaderRowEl) {
      this._weekdayHeaderRowEl.remove();
      this._weekdayHeaderRowEl = null;
    }

    // Build the row-of-cells grid.
    const usedKeys = new Set<string>();
    if (viewMode === 'days') {
      this._renderDayRows(cells, usedKeys);
    } else {
      this._renderPeriodRows(cells, cols, usedKeys);
    }

    // Drop stale cells whose keys are no longer in the rendered set.
    for (const [key, cellEl] of this._cellMap) {
      if (!usedKeys.has(key)) {
        cellEl.remove();
        this._cellMap.delete(key);
      }
    }

    // Aria row/col counts.
    const totalSelectable = cells.filter((c) => !c.placeholder).length;
    const dataRows = totalSelectable === 0 ? 0 : Math.ceil(cells.length / cols);
    const rowCount = viewMode === 'days' ? dataRows + 1 : dataRows; // +1 for header row
    const colCount = viewMode === 'days' && this._options.hasWeeks ? cols + 1 : cols;

    if (rowCount > 0) {
      this._gridEl.setAttribute('aria-rowcount', String(rowCount));
    } else {
      this._gridEl.removeAttribute('aria-rowcount');
    }
    if (colCount > 0) {
      this._gridEl.setAttribute('aria-colcount', String(colCount));
    } else {
      this._gridEl.removeAttribute('aria-colcount');
    }

    // Ensure the focused key still references a real selectable cell. When
    // it doesn't (e.g. after navigation), pick a sensible fallback. Matches
    // the React useEffect that runs after each cells change.
    const selectable = cells.filter((c) => !c.placeholder && !c.isDisabled);
    if (selectable.length > 0) {
      const inList = selectable.some((c) => c.key === this._focusedKey);
      if (!inList) {
        // Prefer a cell that matches the day captured before a Page
        // navigation; this keeps Shift+PageDown / PageDown / PageUp on the
        // same day-of-month across periods (parity with legacy o9ds).
        const preferDay = this._preferredDay;
        this._preferredDay = null;
        let fallback: string | null = null;
        if (preferDay != null) {
          const sameDay = selectable.find(
            (c) => c.date && c.date.getDate() === preferDay,
          );
          if (sameDay) fallback = sameDay.key;
        }
        if (fallback == null) fallback = pickFallbackFocusKey(selectable);
        if (fallback != null) this._focusedKey = fallback;
      }
    }
  }

  private _renderWeekdayHeader(): void {
    if (!this._gridEl) return;
    const headers = getWeekdayHeaders(this._locale, this._options.weekStart ?? 0, 'min');

    let row = this._weekdayHeaderRowEl;
    if (!row) {
      row = document.createElement('div');
      row.setAttribute('role', 'row');
      row.className = 'arvo-cal__row';
      this._weekdayHeaderRowEl = row;
    }

    // Build full child list: optional leading week gutter, then 7 weekday cells.
    const wantedChildren: HTMLElement[] = [];

    if (this._options.hasWeeks) {
      let weekSlot = row.querySelector<HTMLElement>(':scope > .arvo-cal__week');
      if (!weekSlot) {
        weekSlot = document.createElement('div');
        weekSlot.setAttribute('role', 'columnheader');
      }
      weekSlot.className = 'arvo-cal__week arvo-cal__week--hdr';
      weekSlot.removeAttribute('aria-hidden');
      weekSlot.textContent = 'Week';
      wantedChildren.push(weekSlot);
    }

    headers.forEach((label, i) => {
      const existing = row!.querySelectorAll<HTMLElement>(':scope > .arvo-cal__weekday-hdr');
      let hdr: HTMLElement | null = existing[i] ?? null;
      if (!hdr) {
        hdr = document.createElement('div');
        hdr.setAttribute('role', 'columnheader');
        hdr.className = 'arvo-cal__weekday-hdr';
      }
      if (hdr.textContent !== label) hdr.textContent = label;
      wantedChildren.push(hdr);
    });

    // Reconcile row children in order.
    reconcileChildren(row, wantedChildren);

    // Ensure the header row is the first child of the grid.
    if (this._gridEl.firstChild !== row) {
      this._gridEl.insertBefore(row, this._gridEl.firstChild);
    }
  }

  private _renderDayRows(cells: CalendarCell[], usedKeys: Set<string>): void {
    if (!this._gridEl) return;
    const cols = 7;
    const totalRows = 6;

    // Where in the grid the body rows start (after the optional header row).
    const ensureRow = (idx: number): HTMLElement => {
      let row = this._rowEls[idx];
      if (!row) {
        row = document.createElement('div');
        row.setAttribute('role', 'row');
        row.className = 'arvo-cal__row';
        this._rowEls[idx] = row;
      }
      return row;
    };

    const wantedRows: HTMLElement[] = [];
    if (this._weekdayHeaderRowEl) wantedRows.push(this._weekdayHeaderRowEl);

    for (let w = 0; w < totalRows; w += 1) {
      const slice = cells.slice(w * cols, w * cols + cols);
      if (slice.length === 0) break;

      const row = ensureRow(w);
      const rowChildren: HTMLElement[] = [];

      if (this._options.hasWeeks) {
        let weekCell = this._rowWeekEls[w];
        if (!weekCell) {
          weekCell = document.createElement('div');
          weekCell.className = 'arvo-cal__week';
          weekCell.setAttribute('aria-hidden', 'true');
          this._rowWeekEls[w] = weekCell;
        }
        const firstDate = slice.find((c) => c.date)?.date ?? null;
        const text = firstDate ? formatWeekNumber(getWeekNumber(firstDate)) : '';
        if (weekCell.textContent !== text) weekCell.textContent = text;
        rowChildren.push(weekCell);
      }

      for (const cell of slice) {
        const cellEl = this._upsertCell(cell, 'days');
        usedKeys.add(cell.key);
        rowChildren.push(cellEl);
      }

      reconcileChildren(row, rowChildren);
      wantedRows.push(row);
    }

    // Trim row array to the number we just rendered.
    const bodyRowCount = wantedRows.length - (this._weekdayHeaderRowEl ? 1 : 0);
    while (this._rowEls.length > bodyRowCount) {
      const extra = this._rowEls.pop();
      extra?.remove();
    }
    // Also trim week gutter array.
    while (this._rowWeekEls.length > bodyRowCount) {
      const extra = this._rowWeekEls.pop();
      extra?.remove();
    }

    reconcileChildren(this._gridEl, wantedRows);
  }

  private _renderPeriodRows(
    cells: CalendarCell[],
    cols: number,
    usedKeys: Set<string>,
  ): void {
    if (!this._gridEl) return;

    const ensureRow = (idx: number): HTMLElement => {
      let row = this._rowEls[idx];
      if (!row) {
        row = document.createElement('div');
        row.setAttribute('role', 'row');
        row.className = 'arvo-cal__row';
        this._rowEls[idx] = row;
      }
      return row;
    };

    const wantedRows: HTMLElement[] = [];
    const rowCount = cells.length === 0 ? 0 : Math.ceil(cells.length / cols);
    const viewMode = this._viewMode();

    for (let r = 0; r < rowCount; r += 1) {
      const slice = cells.slice(r * cols, r * cols + cols);
      const row = ensureRow(r);
      const rowChildren: HTMLElement[] = [];
      for (const cell of slice) {
        const cellEl = this._upsertCell(cell, viewMode);
        usedKeys.add(cell.key);
        rowChildren.push(cellEl);
      }
      reconcileChildren(row, rowChildren);
      wantedRows.push(row);
    }

    // Drop any rows we no longer need.
    while (this._rowEls.length > rowCount) {
      const extra = this._rowEls.pop();
      extra?.remove();
    }
    // Period views never carry the leading week gutter; drop any cached slots.
    if (this._rowWeekEls.length > 0) {
      for (const slot of this._rowWeekEls) slot.remove();
      this._rowWeekEls = [];
    }

    reconcileChildren(this._gridEl, wantedRows);
  }

  // Create or update the cell element for a given CalendarCell. The key
  // identifies the cell across renders so the focused node persists.
  private _upsertCell(cell: CalendarCell, viewMode: ArvoCalendarViewMode): HTMLElement {
    let el = this._cellMap.get(cell.key) ?? null;

    if (cell.placeholder) {
      if (!el) {
        el = document.createElement('div');
        this._cellMap.set(cell.key, el);
      }
      el.className = 'arvo-cal__cell';
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-selected');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('aria-current');
      el.removeAttribute('aria-label');
      el.removeAttribute('data-arvo-tooltip');
      el.textContent = '';
      // No handlers needed; placeholder cells are inert.
      return el;
    }

    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'gridcell');
      el.addEventListener('click', this._handleCellClick);
      el.addEventListener('pointerenter', this._handleCellPointerEnter);
      this._cellMap.set(cell.key, el);
    } else if (!el.hasAttribute('role')) {
      // Element was previously a placeholder; re-attach handlers and role.
      el.setAttribute('role', 'gridcell');
      el.addEventListener('click', this._handleCellClick);
      el.addEventListener('pointerenter', this._handleCellPointerEnter);
    }

    el.removeAttribute('aria-hidden');

    // Stamp the cell key on the DOM node so click/pointer handlers can look
    // up the CalendarCell without needing a closure per cell.
    el.setAttribute('data-arvo-key', cell.key);

    // Class composition. Order mirrors the React component exactly so any
    // CSS that relies on lexical order produces identical output.
    const classes = ['arvo-cal__cell'];
    if (cell.isSelected) classes.push('selected');
    if (cell.isInRange) classes.push('in-range');
    if (cell.isRangeStart) classes.push('range-start');
    if (cell.isRangeEnd) classes.push('range-end');
    if (cell.isOutside) classes.push('outside-month');
    if (cell.isToday) classes.push('today');
    if (cell.isCurrentMember) classes.push('current-member');
    if (cell.isKeyHighlight) classes.push('key-highlight');
    if (cell.isDisabled) classes.push('is-disabled');
    if (cell.isPreview) classes.push('preview');
    el.className = classes.join(' ');

    // ARIA attributes. aria-current is 'date' on today's cell in days view,
    // 'true' on today's cell in other period views, and 'true' on the
    // current-member tile in members view (matches Calendar.tsx).
    if (cell.isSelected) el.setAttribute('aria-selected', 'true');
    else el.removeAttribute('aria-selected');
    if (cell.isDisabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
    if (cell.isToday) {
      el.setAttribute('aria-current', viewMode === 'days' ? 'date' : 'true');
    } else if (cell.isCurrentMember) {
      el.setAttribute('aria-current', 'true');
    } else {
      el.removeAttribute('aria-current');
    }
    el.setAttribute('aria-label', cell.ariaLabel);

    if (cell.tooltip) el.setAttribute('data-arvo-tooltip', cell.tooltip);
    else el.removeAttribute('data-arvo-tooltip');

    // Content: primary label + optional sublabel. Reuse child spans where
    // they exist to avoid layout churn between renders.
    let labelSpan = el.querySelector<HTMLElement>(':scope > .arvo-cal__cell-label');
    if (!labelSpan) {
      labelSpan = document.createElement('span');
      labelSpan.className = 'arvo-cal__cell-label';
      el.appendChild(labelSpan);
    }
    if (labelSpan.textContent !== cell.label) labelSpan.textContent = cell.label;

    let subSpan = el.querySelector<HTMLElement>(':scope > .arvo-cal__cell-sublabel');
    if (cell.subLabel) {
      if (!subSpan) {
        subSpan = document.createElement('span');
        subSpan.className = 'arvo-cal__cell-sublabel';
        el.appendChild(subSpan);
      }
      if (subSpan.textContent !== cell.subLabel) subSpan.textContent = cell.subLabel;
    } else if (subSpan) {
      subSpan.remove();
    }

    return el;
  }

  // Apply tabindex=0 to the focused cell and tabindex=-1 to all other
  // selectable cells. Placeholder cells stay tabindex-less.
  private _renderRovingTabindex(): void {
    for (const cell of this._cellOrder) {
      if (cell.placeholder) continue;
      const el = this._cellMap.get(cell.key);
      if (!el) continue;
      el.setAttribute('tabindex', cell.key === this._focusedKey ? '0' : '-1');
    }
  }

  // -------------------------------------------------------------------------
  // Cell builders -- mirror React exactly.
  // -------------------------------------------------------------------------

  private _buildCells(viewMode: ArvoCalendarViewMode): CalendarCell[] {
    switch (viewMode) {
      case 'days':
        return buildDaysCells({
          visibleYear: this._options.visibleYear,
          visibleMonth: this._options.visibleMonth,
          weekStart: this._options.weekStart ?? 0,
          hasOutsideDays: this._options.hasOutsideDays ?? false,
          locale: this._locale,
          selectedDate: this._options.selectedDate ?? null,
          rangeStart: this._options.rangeStart ?? null,
          rangeEnd: this._options.rangeEnd ?? null,
          hoverDate: this._options.hoverDate ?? null,
          isRangeComplete: !!this._options.isRangeComplete,
          minDate: this._options.minDate ?? null,
          maxDate: this._options.maxDate ?? null,
          memberIndex: this._options.memberIndex ?? null,
          now: this._now,
        });
      case 'months':
        return buildMonthsCells({
          visibleYear: this._options.visibleYear,
          locale: this._locale,
          selectedDate: this._options.selectedDate ?? null,
          minDate: this._options.minDate ?? null,
          maxDate: this._options.maxDate ?? null,
          memberIndex: this._options.memberIndex ?? null,
          frequency: this._options.frequency,
          now: this._now,
        });
      case 'quarters':
        return buildQuartersCells({
          visibleYear: this._options.visibleYear,
          selectedDate: this._options.selectedDate ?? null,
          minDate: this._options.minDate ?? null,
          maxDate: this._options.maxDate ?? null,
          now: this._now,
        });
      case 'years':
        return buildYearsCells({
          visibleYear: this._options.visibleYear,
          hasOutsideDays: this._options.hasOutsideDays ?? false,
          selectedDate: this._options.selectedDate ?? null,
          minDate: this._options.minDate ?? null,
          maxDate: this._options.maxDate ?? null,
          now: this._now,
        });
      case 'members': {
        const memberIndex = this._options.memberIndex ?? null;
        const frequency = this._options.frequency;
        if (!memberIndex || !frequency) {
          if (!this._warnedMembersView && typeof console !== 'undefined') {
            console.warn(
              '[ArvoCalendar] members view requires memberIndex + frequency options.',
            );
            this._warnedMembersView = true;
          }
          return [];
        }
        return buildMembersCells({
          visibleYear: this._options.visibleYear,
          visibleMonth: this._options.visibleMonth,
          frequency,
          memberIndex,
          currentMemberIndex: this._options.currentMemberIndex ?? null,
          selectedMember: this._options.selectedMember ?? null,
          locale: this._locale,
          minDate: this._options.minDate ?? null,
          maxDate: this._options.maxDate ?? null,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private _handleCellClick = (e: Event): void => {
    const target = e.currentTarget as HTMLElement | null;
    if (!target) return;
    const key = target.getAttribute('data-arvo-key');
    if (!key) return;
    const cell = this._cellOrder.find((c) => c.key === key);
    if (!cell || cell.placeholder || cell.isDisabled) return;
    this._setFocusedKey(cell.key);
    if (cell.member) {
      this._emitCellSelect({ member: cell.member });
    } else if (cell.date) {
      this._emitCellSelect({ date: cell.date });
    }
  };

  private _handleCellPointerEnter = (e: Event): void => {
    if (!this._rangeMode() || this._options.isRangeComplete) return;
    const target = e.currentTarget as HTMLElement | null;
    if (!target) return;
    const key = target.getAttribute('data-arvo-key');
    if (!key) return;
    const cell = this._cellOrder.find((c) => c.key === key);
    if (!cell || cell.placeholder || cell.isDisabled || !cell.date) return;
    this._emitCellHover({ date: cell.date });
  };

  private _handleGridPointerLeave(): void {
    if (!this._rangeMode() || this._options.isRangeComplete) return;
    this._emitCellHover({ date: undefined });
  }

  private _handlePointerOver(e: PointerEvent): void {
    const resolved = this._resolveTooltipAnchor(e.target);
    if (!resolved) return;
    tooltipManager.show({
      anchor: resolved.anchor,
      content: resolved.content,
      trigger: 'hover',
    });
  }

  private _handlePointerOut(e: PointerEvent): void {
    const related = (e.relatedTarget as Element | null) ?? null;
    const cellEl = (e.target as Element | null)?.closest(
      '.arvo-cal__cell[data-arvo-tooltip]',
    );
    if (!cellEl) return;
    if (related && cellEl.contains(related)) return;
    tooltipManager.hide();
  }

  private _handleFocusIn(e: FocusEvent): void {
    const resolved = this._resolveTooltipAnchor(e.target);
    if (!resolved) return;
    tooltipManager.show({
      anchor: resolved.anchor,
      content: resolved.content,
      trigger: 'focus',
    });
  }

  private _handleFocusOut(): void {
    tooltipManager.hide(true);
  }

  private _resolveTooltipAnchor(
    target: EventTarget | null,
  ): { anchor: HTMLElement; content: string } | null {
    if (!(target instanceof Element)) return null;
    const cellEl = target.closest<HTMLElement>(
      '.arvo-cal__cell[data-arvo-tooltip]',
    );
    if (!cellEl) return null;
    const content = cellEl.getAttribute('data-arvo-tooltip');
    if (!content) return null;
    return { anchor: cellEl, content };
  }

  // -------------------------------------------------------------------------
  // Keyboard handling
  // -------------------------------------------------------------------------

  private _handleKeyDown(e: KeyboardEvent): void {
    const isKeyboardEnabled = this._options.isKeyboardEnabled !== false;
    if (!isKeyboardEnabled) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this._emitDismiss();
      return;
    }

    if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const mode = zoomViewMode(this._viewMode(), e.key === 'ArrowDown' ? 'in' : 'out');
      if (mode) {
        e.preventDefault();
        this._emitViewModeChange(mode);
      }
      return;
    }

    const viewMode = this._viewMode();

    if (viewMode === 'months' && isTypeaheadKey(e)) {
      e.preventDefault();
      const ch = e.key.toLowerCase();
      this._typeAheadBuf = `${this._typeAheadBuf}${ch}`;
      if (this._typeAheadTimer) clearTimeout(this._typeAheadTimer);
      this._typeAheadTimer = setTimeout(() => {
        this._typeAheadBuf = '';
        this._typeAheadTimer = null;
      }, 500);

      const names = getMonthNames(this._locale, 'full');
      const match = names.findIndex((n) =>
        n.toLowerCase().startsWith(this._typeAheadBuf),
      );
      if (match >= 0) {
        const target = this._cellOrder.find(
          (c) => c.key === `${this._options.visibleYear}-${match}` && !c.isDisabled,
        );
        if (target) this._setFocusedKey(target.key);
      }
      return;
    }

    const cells = this._cellOrder;
    const currentIdx = cells.findIndex((c) => c.key === this._focusedKey);
    if (currentIdx < 0) return;

    const cols = colsForView(viewMode);

    const findSelectable = (start: number, step: number): number => {
      let i = start;
      while (i >= 0 && i < cells.length) {
        const c = cells[i];
        if (!c.placeholder && !c.isDisabled) return i;
        i += step;
      }
      return -1;
    };

    const moveBy = (offset: number): CalendarCell | null => {
      if (offset === 0 || cells.length === 0) return null;
      const step = offset > 0 ? 1 : -1;
      const target = currentIdx + offset;
      if (target < 0 || target >= cells.length) return null;
      const landed = findSelectable(target, step);
      if (landed < 0) return null;
      const cell = cells[landed];
      this._setFocusedKey(cell.key);
      return cell;
    };

    const extendIfShift = (cell: CalendarCell | null): void => {
      if (!cell || !this._rangeMode() || !e.shiftKey) return;
      if (cell.member) this._emitCellSelect({ member: cell.member });
      else if (cell.date) this._emitCellSelect({ date: cell.date });
    };

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        extendIfShift(moveBy(-1));
        return;
      case 'ArrowRight':
        e.preventDefault();
        extendIfShift(moveBy(1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        extendIfShift(moveBy(-cols));
        return;
      case 'ArrowDown':
        e.preventDefault();
        extendIfShift(moveBy(cols));
        return;
      case 'Home': {
        e.preventDefault();
        const rowStart = Math.floor(currentIdx / cols) * cols;
        const landed = findSelectable(rowStart, 1);
        if (
          landed >= 0 &&
          landed < rowStart + cols &&
          landed < cells.length
        ) {
          this._setFocusedKey(cells[landed].key);
        }
        return;
      }
      case 'End': {
        e.preventDefault();
        const rowStart = Math.floor(currentIdx / cols) * cols;
        const rowEnd = Math.min(rowStart + cols - 1, cells.length - 1);
        const landed = findSelectable(rowEnd, -1);
        if (landed >= rowStart) this._setFocusedKey(cells[landed].key);
        return;
      }
      case 'PageUp':
      case 'PageDown': {
        e.preventDefault();
        const direction = e.key === 'PageDown' ? 1 : -1;
        const useYearStep = viewMode === 'days' && e.shiftKey;
        const next = useYearStep
          ? { year: this._options.visibleYear + direction, month: this._options.visibleMonth }
          : stepVisiblePeriod({
              viewMode,
              visibleYear: this._options.visibleYear,
              visibleMonth: this._options.visibleMonth,
              direction,
            });
        // Capture the day-of-month from the currently-focused cell so the
        // post-render focus restoration prefers the same day in the new
        // period (parity with the legacy o9ds behavior). Force a focus
        // request so the cell receives DOM focus even when document.
        // activeElement has left the grid between renders, as can happen
        // during Shift+PageDown.
        const currentDate = cells[currentIdx]?.date ?? null;
        if (currentDate && viewMode === 'days') {
          this._preferredDay = currentDate.getDate();
        }
        this._focusRequested = true;
        this._emitMonthChange(next.year, next.month);
        return;
      }
      case 'Enter':
      case ' ':
      case 'Spacebar': {
        e.preventDefault();
        const cell = cells[currentIdx];
        if (!cell || cell.placeholder || cell.isDisabled) return;
        if (cell.member) {
          this._emitCellSelect({ member: cell.member });
        } else if (cell.date) {
          this._emitCellSelect({ date: cell.date });
        }
        return;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Focus / state helpers
  // -------------------------------------------------------------------------

  private _setFocusedKey(key: string): void {
    if (key === this._focusedKey) {
      // Even if the key is unchanged, the tabindex may have been wiped by a
      // prior render -- re-apply to guarantee tabindex=0 is on this node.
      this._renderRovingTabindex();
      const target = this._cellMap.get(key);
      if (target && this._focusRequested) {
        target.focus();
      }
      return;
    }
    this._focusedKey = key;
    this._renderRovingTabindex();
    const target = this._cellMap.get(key);
    if (target && this._focusRequested) {
      target.focus();
    } else if (target && this._gridContains(document.activeElement)) {
      // The grid currently holds keyboard focus -- move it to the new cell
      // so arrow-key nav appears responsive.
      target.focus();
    }
  }

  private _gridContains(node: Element | null): boolean {
    if (!node || !this._gridEl) return false;
    return this._gridEl.contains(node);
  }

  // Refresh the cached "now". The React useMemo recomputes when visibleYear,
  // visibleMonth, or viewMode change; we use the same change set as the key.
  private _refreshNow(force?: boolean): void {
    const key = `${this._options.visibleYear}|${this._options.visibleMonth}|${this._viewMode()}`;
    if (force || key !== this._lastNowKey) {
      this._now = new Date();
      this._lastNowKey = key;
    }
  }

  // -------------------------------------------------------------------------
  // Read accessors / convenience
  // -------------------------------------------------------------------------

  private _viewMode(): ArvoCalendarViewMode {
    return this._options.viewMode ?? 'days';
  }

  private _rangeMode(): boolean {
    return (
      this._options.rangeStart != null ||
      this._options.rangeEnd != null ||
      this._options.hoverDate != null
    );
  }

  // -------------------------------------------------------------------------
  // Event dispatch -- mirrors the React callbacks + adds DOM CustomEvents.
  // -------------------------------------------------------------------------

  private _emitCellSelect(payload: { date?: Date; member?: NormalizedMember }): void {
    const detail = { ...payload, mode: this._viewMode() };
    this._options.onCellSelect?.(detail);
    this._element?.dispatchEvent(
      new CustomEvent('cal:select', { bubbles: true, detail }),
    );
  }

  private _emitCellHover(payload: { date?: Date; member?: NormalizedMember }): void {
    this._options.onCellHover?.(payload);
    this._element?.dispatchEvent(
      new CustomEvent('cal:hover', { bubbles: true, detail: payload }),
    );
  }

  // Returns true when the consumer cancelled the event via preventDefault.
  // The internal view does NOT change here -- the parent is expected to
  // call update({ viewMode }) when it accepts the change.
  private _emitViewModeChange(mode: ArvoCalendarViewMode): boolean {
    const detail = { mode };
    this._options.onViewModeChange?.(detail);
    const ev = new CustomEvent('cal:viewmode-change', {
      bubbles: true,
      cancelable: true,
      detail,
    });
    if (this._element) {
      return !this._element.dispatchEvent(ev);
    }
    return false;
  }

  private _emitMonthChange(year: number, month: number): void {
    const detail = { year, month };
    this._options.onMonthChange?.(detail);
    this._element?.dispatchEvent(
      new CustomEvent('cal:month-change', { bubbles: true, detail }),
    );
  }

  private _emitDismiss(): void {
    this._options.onDismiss?.();
    this._element?.dispatchEvent(
      new CustomEvent('cal:dismiss', { bubbles: true }),
    );
  }
}

export default ArvoCalendar;

// ===========================================================================
// Helpers (cell building, focus key) ---------------------------------------
// ===========================================================================

// Reconciles `parent`'s child list to match `wantedChildren` in order while
// preserving existing nodes (so focused cells survive a re-render). Nodes
// already in `parent` but not in `wantedChildren` are removed at the end.
function reconcileChildren(parent: HTMLElement, wantedChildren: HTMLElement[]): void {
  const wantedSet = new Set(wantedChildren);

  // First pass: drop any children not in wantedChildren.
  const existing = Array.from(parent.children);
  for (const node of existing) {
    if (!wantedSet.has(node as HTMLElement)) {
      parent.removeChild(node);
    }
  }

  // Second pass: walk wantedChildren and ensure each is at the right index.
  for (let i = 0; i < wantedChildren.length; i += 1) {
    const want = wantedChildren[i];
    const have = parent.children[i] as HTMLElement | undefined;
    if (have === want) continue;
    if (have) {
      parent.insertBefore(want, have);
    } else {
      parent.appendChild(want);
    }
  }
}

function buildDaysCells(args: {
  visibleYear: number;
  visibleMonth: number;
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasOutsideDays: boolean;
  locale: string;
  selectedDate: Date | null;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  hoverDate: Date | null;
  isRangeComplete: boolean;
  minDate: Date | null;
  maxDate: Date | null;
  memberIndex: MemberIndex | null;
  now: Date;
}): CalendarCell[] {
  const {
    visibleYear,
    visibleMonth,
    weekStart,
    hasOutsideDays,
    locale,
    selectedDate,
    rangeStart,
    rangeEnd,
    hoverDate,
    isRangeComplete,
    minDate,
    maxDate,
    memberIndex,
    now,
  } = args;

  const matrix = getMonthMatrix(visibleYear, visibleMonth, { weekStart });
  const cells: CalendarCell[] = [];

  const previewBounds = (() => {
    if (isRangeComplete) return null;
    if (!rangeStart || !hoverDate) return null;
    return orderedRange(rangeStart, hoverDate);
  })();

  const rangeBounds = (() => {
    if (!rangeStart || !rangeEnd) return null;
    return orderedRange(rangeStart, rangeEnd);
  })();

  for (const week of matrix.weeks) {
    for (const day of week.days) {
      const isOutside = !day.inMonth;

      if (!hasOutsideDays && isOutside) {
        cells.push(makePlaceholder(`p-${dayKey(day.date)}`));
        continue;
      }

      const isDisabled = !inDateRange(day.date, minDate, maxDate);
      const isToday = isSameDay(day.date, now);
      const isSelected =
        (!!selectedDate && isSameDay(day.date, selectedDate)) ||
        (!!rangeStart && isSameDay(day.date, rangeStart)) ||
        (!!rangeEnd && isSameDay(day.date, rangeEnd));
      const isRangeStart =
        !!rangeStart &&
        isSameDay(day.date, rangeBounds ? rangeBounds[0] : rangeStart);
      const isRangeEnd =
        !!rangeEnd &&
        isSameDay(day.date, rangeBounds ? rangeBounds[1] : rangeEnd);
      const isInRange =
        !!rangeBounds &&
        isAfterDay(day.date, rangeBounds[0]) &&
        isBeforeDay(day.date, rangeBounds[1]);
      const isPreview =
        !!previewBounds &&
        isAfterDay(day.date, previewBounds[0]) &&
        !isAfterDay(day.date, previewBounds[1]);

      // Member tooltip text + key-highlight flag (when a member index is
      // supplied). A day is key-highlighted when it equals some member's
      // keyDate. findMemberForDate returns the bucket containing the day,
      // and the bucket starts at member.keyDate -- so we just compare days.
      let tooltip: string | undefined;
      let isKeyHighlight = false;
      if (memberIndex) {
        const member = findMemberForDate(memberIndex, day.date);
        if (member) {
          tooltip = isToday
            ? `${member.displayName} - Today`
            : member.displayName;
          if (isSameDay(day.date, member.keyDate)) {
            isKeyHighlight = true;
          }
        }
      }

      cells.push({
        key: dayKey(day.date),
        label: String(day.date.getDate()),
        ariaLabel: formatDate(day.date, 'dddd, MMMM d, yyyy', locale),
        date: day.date,
        tooltip,
        isOutside,
        isToday,
        isCurrentMember: false,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
        isPreview,
        isDisabled,
        isKeyHighlight,
        placeholder: false,
      });
    }
  }

  return cells;
}

function buildMonthsCells(args: {
  visibleYear: number;
  locale: string;
  selectedDate: Date | null;
  minDate: Date | null;
  maxDate: Date | null;
  memberIndex: MemberIndex | null;
  frequency: 'day' | 'week' | 'month' | 'quarter' | 'year' | undefined;
  now: Date;
}): CalendarCell[] {
  const {
    visibleYear,
    locale,
    selectedDate,
    minDate,
    maxDate,
    memberIndex,
    frequency,
    now,
  } = args;
  const short = getMonthNames(locale, 'abbrev');
  const full = getMonthNames(locale, 'full');
  const cells: CalendarCell[] = [];

  // Months that contain at least one member's keyDate -- only computed when
  // frequency is quarter or year. For week / month frequencies the highlight
  // would land on every visible month (the keyDate cadence is too dense), so
  // the descriptor restricts key-highlight to the quarter/year cases.
  const keyHighlightMonths = new Set<number>();
  if (memberIndex && (frequency === 'quarter' || frequency === 'year')) {
    for (const member of memberIndex.members) {
      if (member.keyDate.getFullYear() === visibleYear) {
        keyHighlightMonths.add(member.keyDate.getMonth());
      }
    }
  }

  for (let m = 0; m < 12; m += 1) {
    const date = new Date(visibleYear, m, 1);
    const isDisabled = !monthOverlapsRange(visibleYear, m, minDate, maxDate);
    const isToday = isSameMonth(date, now);
    const isSelected =
      !!selectedDate &&
      isSameYear(selectedDate, date) &&
      selectedDate.getMonth() === m;

    cells.push({
      key: `${visibleYear}-${m}`,
      label: short[m],
      ariaLabel: `${full[m]} ${visibleYear}`,
      date,
      isOutside: false,
      isToday,
      isCurrentMember: false,
      isSelected,
      isInRange: false,
      isRangeStart: false,
      isRangeEnd: false,
      isPreview: false,
      isDisabled,
      isKeyHighlight: keyHighlightMonths.has(m),
      placeholder: false,
    });
  }
  return cells;
}

function buildQuartersCells(args: {
  visibleYear: number;
  selectedDate: Date | null;
  minDate: Date | null;
  maxDate: Date | null;
  now: Date;
}): CalendarCell[] {
  const { visibleYear, selectedDate, minDate, maxDate, now } = args;
  const cells: CalendarCell[] = [];

  for (let q = 1; q <= 4; q += 1) {
    const startMonth = (q - 1) * 3;
    const date = new Date(visibleYear, startMonth, 1);
    // A quarter is disabled when none of its 3 months overlap [min, max].
    const isDisabled = ![0, 1, 2].some((offset) =>
      monthOverlapsRange(visibleYear, startMonth + offset, minDate, maxDate),
    );
    const isToday = isSameQuarter(now, date);
    const isSelected =
      !!selectedDate &&
      isSameYear(selectedDate, date) &&
      quarterOf(selectedDate.getMonth()) === q;

    cells.push({
      key: `${visibleYear}-Q${q}`,
      label: `Q${q}`,
      ariaLabel: `Q${q} ${visibleYear}`,
      date,
      isOutside: false,
      isToday,
      isCurrentMember: false,
      isSelected,
      isInRange: false,
      isRangeStart: false,
      isRangeEnd: false,
      isPreview: false,
      isDisabled,
      isKeyHighlight: false,
      placeholder: false,
    });
  }
  return cells;
}

function buildYearsCells(args: {
  visibleYear: number;
  hasOutsideDays: boolean;
  selectedDate: Date | null;
  minDate: Date | null;
  maxDate: Date | null;
  now: Date;
}): CalendarCell[] {
  const { visibleYear, hasOutsideDays, selectedDate, minDate, maxDate, now } = args;
  const start = decadeStart(visibleYear);
  // Render a 12-slot grid (4 cols x 3 rows) spanning start-1 .. start+10. The
  // leading (start-1) and trailing (start+10) slots are "outside" the active
  // decade. When hasOutsideDays is false (the default), they render as empty
  // placeholders so the user only ever sees the ten years that actually belong
  // to the visible decade.
  const cells: CalendarCell[] = [];
  for (let i = -1; i <= 10; i += 1) {
    const year = start + i;
    const isOutside = i === -1 || i === 10;
    if (!hasOutsideDays && isOutside) {
      cells.push(makePlaceholder(`p-y-${year}`));
      continue;
    }
    const date = new Date(year, 0, 1);
    const isDisabled = !yearOverlapsRange(year, minDate, maxDate);
    const isToday = year === now.getFullYear();
    const isSelected = !!selectedDate && selectedDate.getFullYear() === year;

    cells.push({
      key: `y-${year}`,
      label: String(year),
      ariaLabel: `${year}`,
      date,
      isOutside,
      isToday,
      isCurrentMember: false,
      isSelected,
      isInRange: false,
      isRangeStart: false,
      isRangeEnd: false,
      isPreview: false,
      isDisabled,
      isKeyHighlight: false,
      placeholder: false,
    });
  }
  return cells;
}

function buildMembersCells(args: {
  visibleYear: number;
  visibleMonth: number;
  frequency: 'day' | 'week' | 'month' | 'quarter' | 'year';
  memberIndex: MemberIndex;
  currentMemberIndex: number | null;
  selectedMember: NormalizedMember | null;
  locale: string;
  minDate: Date | null;
  maxDate: Date | null;
}): CalendarCell[] {
  const {
    visibleYear,
    visibleMonth,
    frequency,
    memberIndex,
    currentMemberIndex,
    selectedMember,
    locale,
    minDate,
    maxDate,
  } = args;

  let members: NormalizedMember[];
  switch (frequency) {
    case 'day':
      members = getMembersForMonth(memberIndex, visibleYear, visibleMonth);
      break;
    case 'year':
      members = getMembersForDecade(memberIndex, decadeStart(visibleYear));
      break;
    default:
      members = getMembersForYear(memberIndex, visibleYear);
      break;
  }

  return members.map((member) => {
    const isDisabled = !isMemberInRange(member, minDate, maxDate);
    const isCurrentMember =
      currentMemberIndex != null && member.index === currentMemberIndex;
    const isSelected =
      !!selectedMember && member.index === selectedMember.index;

    return {
      key: member.key,
      label: member.displayName,
      subLabel: formatMemberRange(member, frequency, locale),
      ariaLabel: member.displayName,
      member,
      tooltip: member.displayName,
      isOutside: false,
      isToday: false,
      isCurrentMember,
      isSelected,
      isInRange: false,
      isRangeStart: false,
      isRangeEnd: false,
      isPreview: false,
      isDisabled,
      isKeyHighlight: false,
      placeholder: false,
    };
  });
}

function makePlaceholder(key: string): CalendarCell {
  return {
    key,
    label: '',
    ariaLabel: '',
    placeholder: true,
    isOutside: false,
    isToday: false,
    isCurrentMember: false,
    isSelected: false,
    isInRange: false,
    isRangeStart: false,
    isRangeEnd: false,
    isPreview: false,
    isDisabled: false,
    isKeyHighlight: false,
  };
}

function buildRootAriaLabel(args: {
  viewMode: ArvoCalendarViewMode;
  visibleYear: number;
  visibleMonth: number;
  locale: string;
}): string {
  const { viewMode, visibleYear, visibleMonth, locale } = args;
  switch (viewMode) {
    case 'days': {
      const label = formatDate(new Date(visibleYear, visibleMonth, 1), 'MMMM yyyy', locale);
      return `${label} calendar`;
    }
    case 'months':
      return `${visibleYear} calendar`;
    case 'quarters':
      return `${visibleYear} calendar`;
    case 'years': {
      const start = decadeStart(visibleYear);
      return `Years ${start}-${start + 9} calendar`;
    }
    case 'members':
      return 'Member calendar';
  }
}

function keyForDateInView(
  mode: ArvoCalendarViewMode,
  date: Date,
  memberIndex: MemberIndex | null,
): string {
  switch (mode) {
    case 'days':
      return dayKey(normalizeDate(date));
    case 'months':
      return `${date.getFullYear()}-${date.getMonth()}`;
    case 'quarters':
      return `${date.getFullYear()}-Q${quarterOf(date.getMonth())}`;
    case 'years':
      return `y-${date.getFullYear()}`;
    case 'members': {
      if (memberIndex) {
        const member = findMemberForDate(memberIndex, date);
        if (member) return member.key;
      }
      return dayKey(normalizeDate(date));
    }
  }
}

function computeInitialFocusKey(args: {
  viewMode: ArvoCalendarViewMode;
  visibleYear: number;
  visibleMonth: number;
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  selectedDate: Date | null;
  selectedMember: NormalizedMember | null;
  memberIndex: MemberIndex | null;
  minDate: Date | null;
  maxDate: Date | null;
  now: Date;
}): string {
  const {
    viewMode,
    visibleYear,
    visibleMonth,
    weekStart,
    selectedDate,
    selectedMember,
    memberIndex,
    minDate,
    maxDate,
    now,
  } = args;

  switch (viewMode) {
    case 'days': {
      if (
        selectedDate &&
        selectedDate.getFullYear() === visibleYear &&
        selectedDate.getMonth() === visibleMonth &&
        inDateRange(selectedDate, minDate, maxDate)
      ) {
        return keyForDateInView('days', selectedDate, memberIndex);
      }
      if (
        now.getFullYear() === visibleYear &&
        now.getMonth() === visibleMonth &&
        inDateRange(now, minDate, maxDate)
      ) {
        return keyForDateInView('days', now, memberIndex);
      }
      const matrix = getMonthMatrix(visibleYear, visibleMonth, { weekStart });
      for (const wk of matrix.weeks) {
        for (const d of wk.days) {
          if (d.inMonth && inDateRange(d.date, minDate, maxDate)) {
            return keyForDateInView('days', d.date, memberIndex);
          }
        }
      }
      return keyForDateInView('days', new Date(visibleYear, visibleMonth, 1), memberIndex);
    }
    case 'months': {
      if (selectedDate && selectedDate.getFullYear() === visibleYear) {
        return `${visibleYear}-${selectedDate.getMonth()}`;
      }
      if (now.getFullYear() === visibleYear) {
        return `${visibleYear}-${now.getMonth()}`;
      }
      return `${visibleYear}-0`;
    }
    case 'quarters': {
      if (selectedDate && selectedDate.getFullYear() === visibleYear) {
        return `${visibleYear}-Q${quarterOf(selectedDate.getMonth())}`;
      }
      if (now.getFullYear() === visibleYear) {
        return `${visibleYear}-Q${quarterOf(now.getMonth())}`;
      }
      return `${visibleYear}-Q1`;
    }
    case 'years': {
      const start = decadeStart(visibleYear);
      if (
        selectedDate &&
        selectedDate.getFullYear() >= start &&
        selectedDate.getFullYear() < start + 10
      ) {
        return `y-${selectedDate.getFullYear()}`;
      }
      if (now.getFullYear() >= start && now.getFullYear() < start + 10) {
        return `y-${now.getFullYear()}`;
      }
      return `y-${start}`;
    }
    case 'members': {
      if (selectedMember) return selectedMember.key;
      if (memberIndex && memberIndex.currentIndex != null) {
        const m = findMemberByIndex(memberIndex, memberIndex.currentIndex);
        if (m) return m.key;
      }
      return memberIndex?.members[0]?.key ?? '';
    }
  }
}

function pickFallbackFocusKey(cells: CalendarCell[]): string | null {
  // Prefer today.
  const todayCell = cells.find((c) => c.isToday);
  if (todayCell) return todayCell.key;
  // Else the first selectable cell in the current view.
  if (cells.length > 0) return cells[0].key;
  return null;
}

function stepVisiblePeriod(args: {
  viewMode: ArvoCalendarViewMode;
  visibleYear: number;
  visibleMonth: number;
  direction: 1 | -1;
}): { year: number; month: number } {
  const { viewMode, visibleYear, visibleMonth, direction } = args;
  switch (viewMode) {
    case 'days': {
      const next = addMonths(new Date(visibleYear, visibleMonth, 1), direction);
      return { year: next.getFullYear(), month: next.getMonth() };
    }
    case 'months':
    case 'quarters':
      return { year: visibleYear + direction, month: visibleMonth };
    case 'years':
      return { year: visibleYear + direction * 10, month: visibleMonth };
    case 'members':
      return { year: visibleYear + direction, month: visibleMonth };
  }
}

function zoomViewMode(
  current: ArvoCalendarViewMode,
  direction: 'in' | 'out',
): ArvoCalendarViewMode | null {
  // Zoom IN goes days -> months -> years per the descriptor.
  // Zoom OUT reverses the chain.
  const chain: ArvoCalendarViewMode[] = ['days', 'months', 'years'];
  const idx = chain.indexOf(current);
  if (idx < 0) return null;
  const next = direction === 'in' ? idx + 1 : idx - 1;
  if (next < 0 || next >= chain.length) return null;
  return chain[next];
}

function formatMemberRange(
  member: NormalizedMember,
  frequency: 'day' | 'week' | 'month' | 'quarter' | 'year',
  locale: string,
): string | undefined {
  if (frequency === 'day') return undefined;
  const start = formatDate(member.keyDate, 'MMM d', locale);
  const end = formatDate(member.endDate, 'MMM d', locale);
  return `${start} - ${end}`;
}
