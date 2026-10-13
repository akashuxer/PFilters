// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoCalendar } from './Calendar';
import type { ArvoCalendarOptions, ArvoCalendarViewMode } from './Calendar';
import { tooltipManager } from '@arvo/core';
import type { MemberIndex, NormalizedMember } from '@arvo/core';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMember(index: number, key: string, displayName: string, keyDate: Date, endDate: Date): NormalizedMember {
  return { key, name: displayName, displayName, index, keyDate, endDate };
}

function makeMemberIndex(members: NormalizedMember[], currentIndex: number | null = null): MemberIndex {
  return {
    members,
    byKey: Object.fromEntries(members.map((m) => [m.key, m])),
    byIndex: Object.fromEntries(members.map((m) => [m.index, m])),
    count: members.length,
    frequency: 'month',
    minDate: members[0]?.keyDate ?? new Date(),
    maxDate: members[members.length - 1]?.endDate ?? new Date(),
    currentIndex,
  };
}

const JAN_2026_MEMBERS: NormalizedMember[] = Array.from({ length: 12 }, (_, i) => {
  const start = new Date(2026, i, 1);
  const end = new Date(2026, i + 1, 0);
  return makeMember(i, `2026-${String(i + 1).padStart(2, '0')}-01`, `Month ${i + 1}`, start, end);
});

const MEMBER_INDEX = makeMemberIndex(JAN_2026_MEMBERS, 0);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let containerEl: HTMLElement;

function createCalendar(opts: Partial<ArvoCalendarOptions> = {}): ArvoCalendar {
  const defaults: ArvoCalendarOptions = {
    visibleYear: 2026,
    visibleMonth: 0,
  };
  return ArvoCalendar.initialize(containerEl, { ...defaults, ...opts });
}

function getAllCells(): HTMLElement[] {
  return Array.from(containerEl.querySelectorAll('[role="gridcell"]'));
}

function getCellByLabel(text: string): HTMLElement | null {
  const cells = getAllCells();
  return cells.find((c) => c.querySelector('.arvo-cal__cell-label')?.textContent === text) ?? null;
}

function getGrid(): HTMLElement {
  return containerEl.querySelector('.arvo-cal__grid')!;
}

function getRows(): HTMLElement[] {
  return Array.from(containerEl.querySelectorAll('.arvo-cal__row'));
}

function fireKeyDown(el: HTMLElement, key: string, opts: Partial<KeyboardEventInit> = {}): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  el.dispatchEvent(event);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  containerEl = document.createElement('div');
  document.body.appendChild(containerEl);
});

afterEach(() => {
  document.body.removeChild(containerEl);
  vi.restoreAllMocks();
});

// ===========================================================================
// A. Lifecycle
// ===========================================================================
describe('Lifecycle', () => {
  it('ArvoCalendar.initialize(el, options) returns an instance and populates DOM', () => {
    const instance = createCalendar();
    expect(instance).toBeInstanceOf(ArvoCalendar);
    expect(containerEl.querySelector('.arvo-cal__grid')).toBeTruthy();
    expect(containerEl.getAttribute('role')).toBe('application');
    instance.destroy();
  });

  it('destroy() removes DOM and listeners; element can be re-initialized', () => {
    const instance = createCalendar();
    instance.destroy();
    expect(containerEl.querySelector('.arvo-cal__grid')).toBeNull();
    expect(containerEl.getAttribute('role')).toBeNull();
    expect(containerEl.classList.contains('arvo-cal')).toBe(false);

    const instance2 = createCalendar();
    expect(containerEl.querySelector('.arvo-cal__grid')).toBeTruthy();
    instance2.destroy();
  });
});

// ===========================================================================
// B. Imperative state update
// ===========================================================================
describe('Imperative state update', () => {
  it('update() re-renders the grid with new options', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    instance.update({ visibleYear: 2026, visibleMonth: 5 });
    const ariaLabel = containerEl.getAttribute('aria-label')!;
    expect(ariaLabel).toContain('June');
    expect(ariaLabel).toContain('2026');
    instance.destroy();
  });

  it('update() reuses cell DOM nodes where keys overlap (diff-based)', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, hasOutsideDays: true });
    const cell15Before = getCellByLabel('15')!;
    const keyBefore = cell15Before.getAttribute('data-arvo-key');
    instance.update({ visibleYear: 2026, visibleMonth: 0, selectedDate: new Date(2026, 0, 20) });
    const cell15After = getCellByLabel('15')!;
    expect(cell15After).toBe(cell15Before);
    expect(cell15After.getAttribute('data-arvo-key')).toBe(keyBefore);
    instance.destroy();
  });

  it('combined update applies all changes in one render pass', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    instance.update({
      rangeStart: new Date(2026, 0, 5),
      rangeEnd: new Date(2026, 0, 10),
      hoverDate: null,
    });
    const cell5 = getCellByLabel('5')!;
    const cell7 = getCellByLabel('7')!;
    const cell10 = getCellByLabel('10')!;
    expect(cell5.classList.contains('range-start')).toBe(true);
    expect(cell10.classList.contains('range-end')).toBe(true);
    expect(cell7.classList.contains('in-range')).toBe(true);
    instance.destroy();
  });
});

// ===========================================================================
// C. Custom events
// ===========================================================================
describe('Custom events', () => {
  it('cal:select fires on cell click with correct detail', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:select', handler);

    const cell15 = getCellByLabel('15')!;
    cell15.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.mode).toBe('days');
    expect(detail.date).toBeInstanceOf(Date);
    expect(detail.date.getDate()).toBe(15);

    containerEl.removeEventListener('cal:select', handler);
    instance.destroy();
  });

  it('cal:hover fires on cell pointer enter in range mode', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      rangeStart: new Date(2026, 0, 5),
      isRangeComplete: false,
    });
    const handler = vi.fn();
    containerEl.addEventListener('cal:hover', handler);

    const cell10 = getCellByLabel('10')!;
    const event = new PointerEvent('pointerenter', { bubbles: true });
    cell10.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.date).toBeInstanceOf(Date);

    containerEl.removeEventListener('cal:hover', handler);
    instance.destroy();
  });

  it('cal:viewmode-change fires on Alt+Down and is cancelable', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn((e: Event) => {
      e.preventDefault();
    });
    containerEl.addEventListener('cal:viewmode-change', handler);

    fireKeyDown(getGrid(), 'ArrowDown', { altKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.mode).toBe('months');

    containerEl.removeEventListener('cal:viewmode-change', handler);
    instance.destroy();
  });

  it('cal:month-change fires on PageDown', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:month-change', handler);

    fireKeyDown(getGrid(), 'PageDown');
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.year).toBe(2026);
    expect(detail.month).toBe(1);

    containerEl.removeEventListener('cal:month-change', handler);
    instance.destroy();
  });

  it('cal:dismiss fires on Escape', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:dismiss', handler);

    fireKeyDown(getGrid(), 'Escape');
    expect(handler).toHaveBeenCalledTimes(1);

    containerEl.removeEventListener('cal:dismiss', handler);
    instance.destroy();
  });
});

// ===========================================================================
// D. Tooltips via tooltipManager
// ===========================================================================
describe('Tooltips via tooltipManager', () => {
  it('pointerover on a cell with data-arvo-tooltip invokes tooltipManager.show', () => {
    const showSpy = vi.spyOn(tooltipManager, 'show');
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
    });

    const cells = getAllCells();
    const cellWithTooltip = cells.find((c) => c.hasAttribute('data-arvo-tooltip'))!;
    const event = new PointerEvent('pointerover', { bubbles: true });
    Object.defineProperty(event, 'target', { value: cellWithTooltip });
    getGrid().dispatchEvent(event);

    expect(showSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: cellWithTooltip,
        content: cellWithTooltip.getAttribute('data-arvo-tooltip'),
        trigger: 'hover',
      }),
    );
    instance.destroy();
  });
});

// ===========================================================================
// E. Rendering -- days view (parallel to React)
// ===========================================================================
describe('Rendering -- days view (JS)', () => {
  it('renders role="application" root with arvo-cal arvo-cal--days', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    expect(containerEl.getAttribute('role')).toBe('application');
    expect(containerEl.classList.contains('arvo-cal')).toBe(true);
    expect(containerEl.classList.contains('arvo-cal--days')).toBe(true);
    instance.destroy();
  });

  it('renders correct aria-label with month and year', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const label = containerEl.getAttribute('aria-label')!;
    expect(label).toContain('January');
    expect(label).toContain('2026');
    expect(label).toContain('calendar');
    instance.destroy();
  });

  it('renders weekday header row with 7 column headers', () => {
    const instance = createCalendar();
    const hdrs = containerEl.querySelectorAll('[role="columnheader"]');
    expect(hdrs.length).toBe(7);
    instance.destroy();
  });

  it('renders 6 week rows', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const rows = getRows();
    expect(rows.length).toBe(7); // 1 header + 6 body
    instance.destroy();
  });

  it('Feb 2024 leap year: day 29 is present in-month', () => {
    const instance = createCalendar({ visibleYear: 2024, visibleMonth: 1, weekStart: 0, hasOutsideDays: true });
    const allCells = getAllCells();
    const inMonthCells = allCells.filter((c) => !c.classList.contains('outside-month'));
    const day29InMonth = inMonthCells.find(
      (c) => c.querySelector('.arvo-cal__cell-label')?.textContent === '29'
    );
    expect(day29InMonth).toBeTruthy();
    instance.destroy();
  });

  it('Feb 2025 non-leap: no in-month day 29', () => {
    const instance = createCalendar({ visibleYear: 2025, visibleMonth: 1, weekStart: 0, hasOutsideDays: true });
    const cells = getAllCells();
    const cell29InMonth = cells.find(
      (c) => c.querySelector('.arvo-cal__cell-label')?.textContent === '29'
        && !c.classList.contains('outside-month')
    );
    expect(cell29InMonth).toBeUndefined();
    instance.destroy();
  });

  it('hasOutsideDays=false: placeholders are aria-hidden with no gridcell role', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, hasOutsideDays: false });
    const placeholders = containerEl.querySelectorAll('.arvo-cal__cell[aria-hidden="true"]');
    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((p) => {
      expect(p.getAttribute('role')).toBeNull();
    });
    instance.destroy();
  });

  it('hasWeeks=true: week cells render with arvo-cal__week and --show-weeks modifier', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, hasWeeks: true });
    expect(containerEl.classList.contains('arvo-cal--show-weeks')).toBe(true);
    const weekCells = containerEl.querySelectorAll('.arvo-cal__week');
    expect(weekCells.length).toBeGreaterThan(0);
    instance.destroy();
  });
});

// ===========================================================================
// E2. Rendering -- months / quarters / years / members
// ===========================================================================
describe('Rendering -- months view (JS)', () => {
  it('renders 12 cells in 3 rows with arvo-cal--months', () => {
    const instance = createCalendar({ viewMode: 'months', visibleYear: 2026, visibleMonth: 0 });
    expect(containerEl.classList.contains('arvo-cal--months')).toBe(true);
    expect(getAllCells().length).toBe(12);
    expect(getRows().length).toBe(3);
    instance.destroy();
  });
});

describe('Rendering -- quarters view (JS)', () => {
  it('renders 4 cells Q1..Q4 with arvo-cal--quarters', () => {
    const instance = createCalendar({ viewMode: 'quarters', visibleYear: 2026, visibleMonth: 0 });
    expect(containerEl.classList.contains('arvo-cal--quarters')).toBe(true);
    const cells = getAllCells();
    expect(cells.length).toBe(4);
    const labels = cells.map((c) => c.querySelector('.arvo-cal__cell-label')?.textContent);
    expect(labels).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    instance.destroy();
  });
});

describe('Rendering -- years view (JS)', () => {
  it('renders 10 in-decade selectable cells by default and 2 leading/trailing placeholders', () => {
    const instance = createCalendar({ viewMode: 'years', visibleYear: 2026, visibleMonth: 0 });
    expect(containerEl.classList.contains('arvo-cal--years')).toBe(true);
    expect(getAllCells().length).toBe(10);
    const placeholders = containerEl.querySelectorAll('.arvo-cal__cell[aria-hidden="true"]');
    expect(placeholders.length).toBe(2);
    instance.destroy();
  });

  it('hasOutsideDays=true: renders 12 cells (leading + decade + trailing year)', () => {
    const instance = createCalendar({ viewMode: 'years', visibleYear: 2026, visibleMonth: 0, hasOutsideDays: true });
    expect(getAllCells().length).toBe(12);
    instance.destroy();
  });
});

describe('Rendering -- members view (JS)', () => {
  it('renders member cells when memberIndex and frequency provided', () => {
    const instance = createCalendar({
      viewMode: 'members',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
    });
    expect(containerEl.classList.contains('arvo-cal--members')).toBe(true);
    expect(getAllCells().length).toBeGreaterThan(0);
    instance.destroy();
  });

  it('warns when memberIndex is missing in members view', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const instance = createCalendar({ viewMode: 'members', visibleYear: 2026, visibleMonth: 0 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('members view requires memberIndex'),
    );
    expect(getAllCells().length).toBe(0);
    instance.destroy();
  });
});

// ===========================================================================
// E3. Today / current-member highlight
// ===========================================================================
describe('Today / current-member highlight (JS)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('days view: today cell has "today" class and aria-current="date"', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const cell15 = getCellByLabel('15')!;
    expect(cell15.classList.contains('today')).toBe(true);
    expect(cell15.getAttribute('aria-current')).toBe('date');
    instance.destroy();
  });

  it('months view: January has "today" class and aria-current="true"', () => {
    const instance = createCalendar({ viewMode: 'months', visibleYear: 2026, visibleMonth: 0 });
    const cells = getAllCells();
    expect(cells[0].classList.contains('today')).toBe(true);
    expect(cells[0].getAttribute('aria-current')).toBe('true');
    instance.destroy();
  });

  it('quarters view: Q1 has "today" class and aria-current="true"', () => {
    const instance = createCalendar({ viewMode: 'quarters', visibleYear: 2026, visibleMonth: 0 });
    const cells = getAllCells();
    expect(cells[0].classList.contains('today')).toBe(true);
    expect(cells[0].getAttribute('aria-current')).toBe('true');
    instance.destroy();
  });

  it('years view: 2026 has "today" class and aria-current="true"', () => {
    const instance = createCalendar({ viewMode: 'years', visibleYear: 2026, visibleMonth: 0 });
    const cells = getAllCells();
    const y2026 = cells.find((c) => c.querySelector('.arvo-cal__cell-label')?.textContent === '2026')!;
    expect(y2026.classList.contains('today')).toBe(true);
    expect(y2026.getAttribute('aria-current')).toBe('true');
    instance.destroy();
  });

  it('members view: current-member cell has "current-member" class and aria-current="true"', () => {
    const instance = createCalendar({
      viewMode: 'members',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
      currentMemberIndex: 0,
    });
    const cells = getAllCells();
    const currentCell = cells.find((c) => c.classList.contains('current-member'));
    expect(currentCell).toBeTruthy();
    expect(currentCell!.getAttribute('aria-current')).toBe('true');
    instance.destroy();
  });
});

// ===========================================================================
// E3b. Key-highlight (member.keyDate matches cell)
// ===========================================================================
describe('Key-highlight (JS)', () => {
  it('days view + memberData: only the day equal to a member.keyDate carries "key-highlight"', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
    });
    const allCells = getAllCells();
    const inMonthCells = allCells.filter((c) => !c.classList.contains('outside-month'));
    const highlighted = inMonthCells.filter((c) => c.classList.contains('key-highlight'));
    expect(highlighted.length).toBe(1);
    expect(highlighted[0].querySelector('.arvo-cal__cell-label')?.textContent).toBe('1');
    instance.destroy();
  });

  it('days view without memberData: no cells get key-highlight', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const cells = getAllCells();
    expect(cells.some((c) => c.classList.contains('key-highlight'))).toBe(false);
    instance.destroy();
  });

  it('months view + frequency=quarter: only months whose 1st is a member.keyDate carry key-highlight', () => {
    const quarterMembers: NormalizedMember[] = [
      makeMember(0, '2026-01-01', 'Q1', new Date(2026, 0, 1), new Date(2026, 2, 31)),
      makeMember(1, '2026-04-01', 'Q2', new Date(2026, 3, 1), new Date(2026, 5, 30)),
      makeMember(2, '2026-07-01', 'Q3', new Date(2026, 6, 1), new Date(2026, 8, 30)),
      makeMember(3, '2026-10-01', 'Q4', new Date(2026, 9, 1), new Date(2026, 11, 31)),
    ];
    const idx: MemberIndex = { ...makeMemberIndex(quarterMembers), frequency: 'quarter' };
    const instance = createCalendar({
      viewMode: 'months',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: idx,
      frequency: 'quarter',
    });
    const cells = getAllCells();
    const highlighted = cells
      .map((c, i) => (c.classList.contains('key-highlight') ? i : -1))
      .filter((i) => i >= 0);
    expect(highlighted).toEqual([0, 3, 6, 9]);
    instance.destroy();
  });

  it('months view + frequency=month: NO cells get key-highlight', () => {
    const instance = createCalendar({
      viewMode: 'months',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
    });
    const cells = getAllCells();
    expect(cells.some((c) => c.classList.contains('key-highlight'))).toBe(false);
    instance.destroy();
  });

  it('quarters / years / members views: NO cells get key-highlight', () => {
    const i1 = createCalendar({
      viewMode: 'quarters',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'quarter',
    });
    expect(getAllCells().some((c) => c.classList.contains('key-highlight'))).toBe(false);
    i1.destroy();

    const i2 = createCalendar({
      viewMode: 'years',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'year',
    });
    expect(getAllCells().some((c) => c.classList.contains('key-highlight'))).toBe(false);
    i2.destroy();

    const i3 = createCalendar({
      viewMode: 'members',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
    });
    expect(getAllCells().some((c) => c.classList.contains('key-highlight'))).toBe(false);
    i3.destroy();
  });
});

// ===========================================================================
// E4. Range mode + hover preview
// ===========================================================================
describe('Range mode + hover preview (JS)', () => {
  it('hover preview cells carry "preview" class', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      rangeStart: new Date(2026, 0, 5),
      hoverDate: new Date(2026, 0, 10),
      isRangeComplete: false,
    });
    const cell8 = getCellByLabel('8')!;
    expect(cell8.classList.contains('preview')).toBe(true);
    instance.destroy();
  });

  it('pointerleave on grid fires cal:hover with date=undefined when incomplete', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      rangeStart: new Date(2026, 0, 5),
      hoverDate: new Date(2026, 0, 10),
      isRangeComplete: false,
    });
    const handler = vi.fn();
    containerEl.addEventListener('cal:hover', handler);
    const grid = getGrid();
    grid.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.date).toBeUndefined();
    containerEl.removeEventListener('cal:hover', handler);
    instance.destroy();
  });

  it('pointerleave does NOT fire cal:hover when isRangeComplete=true', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      rangeStart: new Date(2026, 0, 5),
      rangeEnd: new Date(2026, 0, 10),
      isRangeComplete: true,
    });
    const handler = vi.fn();
    containerEl.addEventListener('cal:hover', handler);
    const grid = getGrid();
    grid.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('cal:hover', handler);
    instance.destroy();
  });

  it('range endpoints carry range-start, range-end, selected; in-between carry in-range', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      rangeStart: new Date(2026, 0, 5),
      rangeEnd: new Date(2026, 0, 10),
      isRangeComplete: true,
    });
    const cell5 = getCellByLabel('5')!;
    const cell10 = getCellByLabel('10')!;
    const cell7 = getCellByLabel('7')!;
    expect(cell5.classList.contains('range-start')).toBe(true);
    expect(cell5.classList.contains('selected')).toBe(true);
    expect(cell10.classList.contains('range-end')).toBe(true);
    expect(cell10.classList.contains('selected')).toBe(true);
    expect(cell7.classList.contains('in-range')).toBe(true);
    instance.destroy();
  });
});

// ===========================================================================
// E5. Min/max disable
// ===========================================================================
describe('Min/max disable (JS)', () => {
  it('cells outside min/max carry is-disabled and aria-disabled; click does not fire cal:select', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      minDate: new Date(2026, 0, 10),
      maxDate: new Date(2026, 0, 20),
    });
    const handler = vi.fn();
    containerEl.addEventListener('cal:select', handler);

    const cell5 = getCellByLabel('5')!;
    expect(cell5.classList.contains('is-disabled')).toBe(true);
    expect(cell5.getAttribute('aria-disabled')).toBe('true');
    cell5.click();
    expect(handler).not.toHaveBeenCalled();

    const cell15 = getCellByLabel('15')!;
    expect(cell15.classList.contains('is-disabled')).toBe(false);
    cell15.click();
    expect(handler).toHaveBeenCalledTimes(1);

    containerEl.removeEventListener('cal:select', handler);
    instance.destroy();
  });
});

// ===========================================================================
// E6. Keyboard navigation (days view)
// ===========================================================================
describe('Keyboard navigation -- days view (JS)', () => {
  it('roving tabindex: exactly one gridcell has tabIndex=0', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const cells = getAllCells();
    const focused = cells.filter((c) => c.getAttribute('tabindex') === '0');
    expect(focused.length).toBe(1);
    instance.destroy();
  });

  it('ArrowRight advances focus by 1 day', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, selectedDate: new Date(2026, 0, 10) });
    fireKeyDown(getGrid(), 'ArrowRight');
    const cell11 = getCellByLabel('11')!;
    expect(cell11.getAttribute('tabindex')).toBe('0');
    instance.destroy();
  });

  it('ArrowDown moves focus 7 days forward', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, selectedDate: new Date(2026, 0, 10) });
    fireKeyDown(getGrid(), 'ArrowDown');
    const cell17 = getCellByLabel('17')!;
    expect(cell17.getAttribute('tabindex')).toBe('0');
    instance.destroy();
  });

  it('PageDown fires cal:month-change with next month', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:month-change', handler);
    fireKeyDown(getGrid(), 'PageDown');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ year: 2026, month: 1 });
    containerEl.removeEventListener('cal:month-change', handler);
    instance.destroy();
  });

  it('Shift+PageDown fires cal:month-change with +1 year', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:month-change', handler);
    fireKeyDown(getGrid(), 'PageDown', { shiftKey: true });
    expect(handler.mock.calls[0][0].detail).toEqual({ year: 2027, month: 0 });
    containerEl.removeEventListener('cal:month-change', handler);
    instance.destroy();
  });

  it('Enter selects the focused cell via cal:select', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, selectedDate: new Date(2026, 0, 10) });
    const handler = vi.fn();
    containerEl.addEventListener('cal:select', handler);
    fireKeyDown(getGrid(), 'Enter');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.mode).toBe('days');
    containerEl.removeEventListener('cal:select', handler);
    instance.destroy();
  });

  it('Escape fires cal:dismiss', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:dismiss', handler);
    fireKeyDown(getGrid(), 'Escape');
    expect(handler).toHaveBeenCalledTimes(1);
    containerEl.removeEventListener('cal:dismiss', handler);
    instance.destroy();
  });

  it('isKeyboardEnabled=false: keydown does nothing', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0, isKeyboardEnabled: false });
    const handler = vi.fn();
    containerEl.addEventListener('cal:dismiss', handler);
    fireKeyDown(getGrid(), 'Escape');
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('cal:dismiss', handler);
    instance.destroy();
  });

  it('disabled cells are skipped during keyboard nav', () => {
    const instance = createCalendar({
      visibleYear: 2026,
      visibleMonth: 0,
      minDate: new Date(2026, 0, 10),
      maxDate: new Date(2026, 0, 31),
      selectedDate: new Date(2026, 0, 10),
    });
    fireKeyDown(getGrid(), 'ArrowLeft');
    const cell10 = getCellByLabel('10')!;
    expect(cell10.getAttribute('tabindex')).toBe('0');
    instance.destroy();
  });
});

// ===========================================================================
// E7. Keyboard navigation (non-day views)
// ===========================================================================
describe('Keyboard navigation -- months view (JS)', () => {
  it('ArrowRight moves focus in months view', () => {
    const instance = createCalendar({ viewMode: 'months', visibleYear: 2026, visibleMonth: 0 });
    fireKeyDown(getGrid(), 'ArrowRight');
    const cells = getAllCells();
    const focused = cells.find((c) => c.getAttribute('tabindex') === '0');
    expect(focused).toBeTruthy();
    instance.destroy();
  });

  it('type-ahead "j" focuses January', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    const instance = createCalendar({ viewMode: 'months', visibleYear: 2026, visibleMonth: 0 });
    fireKeyDown(getGrid(), 'j');
    const cells = getAllCells();
    expect(cells[0].getAttribute('tabindex')).toBe('0');
    vi.useRealTimers();
    instance.destroy();
  });
});

describe('Keyboard navigation -- members view (JS)', () => {
  it('ArrowRight advances focus to the next member tile', () => {
    const instance = createCalendar({
      viewMode: 'members',
      visibleYear: 2026,
      visibleMonth: 0,
      memberIndex: MEMBER_INDEX,
      frequency: 'month',
      currentMemberIndex: 0,
    });
    const cellsBefore = getAllCells();
    const initialFocused = cellsBefore.find((c) => c.getAttribute('tabindex') === '0');
    expect(initialFocused).toBeTruthy();
    const initialKey = initialFocused!.getAttribute('data-arvo-key');

    fireKeyDown(getGrid(), 'ArrowRight');

    const cellsAfter = getAllCells();
    const nextFocused = cellsAfter.find((c) => c.getAttribute('tabindex') === '0');
    expect(nextFocused).toBeTruthy();
    expect(nextFocused!.getAttribute('data-arvo-key')).not.toBe(initialKey);
    instance.destroy();
  });
});

// ===========================================================================
// E8. Public methods
// ===========================================================================
describe('Public methods (JS)', () => {
  it('focusCell(date) updates roving tabindex', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    instance.focusCell(new Date(2026, 0, 20));
    const cell20 = getCellByLabel('20')!;
    expect(cell20.getAttribute('tabindex')).toBe('0');
    instance.destroy();
  });

  it('restoreFocus() does not throw', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    expect(() => instance.restoreFocus()).not.toThrow();
    instance.destroy();
  });

  it('setViewMode() emits cal:viewmode-change', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:viewmode-change', handler);
    instance.setViewMode('months');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.mode).toBe('months');
    containerEl.removeEventListener('cal:viewmode-change', handler);
    instance.destroy();
  });

  it('next() emits cal:month-change with next period', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:month-change', handler);
    instance.next();
    expect(handler.mock.calls[0][0].detail).toEqual({ year: 2026, month: 1 });
    containerEl.removeEventListener('cal:month-change', handler);
    instance.destroy();
  });

  it('prev() emits cal:month-change with prev period', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 3 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:month-change', handler);
    instance.prev();
    expect(handler.mock.calls[0][0].detail).toEqual({ year: 2026, month: 2 });
    containerEl.removeEventListener('cal:month-change', handler);
    instance.destroy();
  });

  it('today() emits cal:month-change with current year/month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1));
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const handler = vi.fn();
    containerEl.addEventListener('cal:month-change', handler);
    instance.today();
    expect(handler.mock.calls[0][0].detail).toEqual({ year: 2026, month: 5 });
    containerEl.removeEventListener('cal:month-change', handler);
    vi.useRealTimers();
    instance.destroy();
  });
});

// ===========================================================================
// No header
// ===========================================================================
describe('No header (OQ-10) (JS)', () => {
  it('does not render any arvo-cal__header or header element', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    expect(containerEl.querySelector('.arvo-cal__header')).toBeNull();
    expect(containerEl.querySelector('header')).toBeNull();
    instance.destroy();
  });
});

// ===========================================================================
// Accessibility smoke (JS)
// ===========================================================================
describe('Accessibility smoke (JS)', () => {
  it('grid has role="grid" with aria-rowcount and aria-colcount', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const grid = getGrid();
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.hasAttribute('aria-rowcount')).toBe(true);
    expect(grid.hasAttribute('aria-colcount')).toBe(true);
    instance.destroy();
  });

  it('all cells have aria-label', () => {
    const instance = createCalendar({ visibleYear: 2026, visibleMonth: 0 });
    const cells = getAllCells();
    cells.forEach((c) => {
      expect(c.hasAttribute('aria-label')).toBe(true);
      expect(c.getAttribute('aria-label')).not.toBe('');
    });
    instance.destroy();
  });
});
