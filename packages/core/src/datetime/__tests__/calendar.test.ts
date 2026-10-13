import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  normalize,
  isSameDay,
  isBeforeDay,
  isAfterDay,
  isSameWeek,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  addDays,
  addMonths,
  inDateRange,
  pickAnchorDate,
} from '../calendar/compare';
import { getWeekNumber, formatWeekNumber } from '../calendar/week-number';
import { getMonthMatrix } from '../calendar/month-matrix';
import {
  getMonthRange,
  getYearRange,
  monthOverlapsRange,
  yearOverlapsRange,
} from '../calendar/range';

describe('compare helpers', () => {
  it('normalizeDate strips the time', () => {
    const d = normalizeDate(new Date(2025, 10, 20, 16, 5, 9, 123));
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(20);
    expect(normalize).toBe(normalizeDate);
  });

  it('isSameDay / isBeforeDay / isAfterDay compare at day level', () => {
    const a = new Date(2025, 10, 20, 1, 0);
    const b = new Date(2025, 10, 20, 23, 0);
    const c = new Date(2025, 10, 21, 0, 0);
    expect(isSameDay(a, b)).toBe(true);
    expect(isBeforeDay(a, c)).toBe(true);
    expect(isAfterDay(c, a)).toBe(true);
    expect(isBeforeDay(a, b)).toBe(false);
  });

  it('isSameWeek follows ISO (Monday-start) weeks', () => {
    const mon = new Date(2025, 10, 17);
    const sun = new Date(2025, 10, 23);
    const nextMon = new Date(2025, 10, 24);
    expect(isSameWeek(mon, sun)).toBe(true);
    expect(isSameWeek(mon, nextMon)).toBe(false);
  });

  it('isSameMonth / isSameQuarter / isSameYear', () => {
    expect(isSameMonth(new Date(2025, 0, 1), new Date(2025, 0, 31))).toBe(true);
    expect(isSameMonth(new Date(2025, 0, 1), new Date(2025, 1, 1))).toBe(false);
    expect(isSameQuarter(new Date(2025, 0, 1), new Date(2025, 2, 31))).toBe(true);
    expect(isSameQuarter(new Date(2025, 2, 1), new Date(2025, 3, 1))).toBe(false);
    expect(isSameQuarter(new Date(2024, 0, 1), new Date(2025, 0, 1))).toBe(false);
    expect(isSameYear(new Date(2025, 0, 1), new Date(2025, 11, 31))).toBe(true);
  });

  it('addDays preserves time and crosses month boundaries', () => {
    const d = addDays(new Date(2025, 10, 30, 10, 30), 5);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(10);
  });

  it('addMonths clamps the day to the target month', () => {
    expect(addMonths(new Date(2025, 0, 31), 1).getDate()).toBe(28); // Feb 2025
    expect(addMonths(new Date(2024, 0, 31), 1).getDate()).toBe(29); // Feb 2024
    const dec = addMonths(new Date(2025, 11, 15), 1);
    expect(dec.getFullYear()).toBe(2026);
    expect(dec.getMonth()).toBe(0);
    expect(addMonths(new Date(2025, 0, 15), -1).getFullYear()).toBe(2024);
  });

  it('inDateRange respects inclusive day bounds and open nulls', () => {
    const d = new Date(2025, 5, 15);
    expect(inDateRange(d, new Date(2025, 5, 1), new Date(2025, 5, 30))).toBe(true);
    expect(inDateRange(d, new Date(2025, 5, 16), null)).toBe(false);
    expect(inDateRange(d, null, new Date(2025, 5, 14))).toBe(false);
    expect(inDateRange(d, null, null)).toBe(true);
    expect(inDateRange(d, new Date(2025, 5, 15), new Date(2025, 5, 15))).toBe(true);
  });

  describe('pickAnchorDate', () => {
    it('returns the preferred date when supplied (assumed clamped)', () => {
      const preferred = new Date(2030, 0, 15);
      // Preferred wins even when it sits outside the bounds -- the helper
      // trusts that callers clamp before passing it through.
      const min = new Date(2024, 0, 1);
      const max = new Date(2024, 0, 31);
      expect(pickAnchorDate(preferred, min, max)).toBe(preferred);
    });

    it('returns today when no preferred AND today is in range', () => {
      // Symmetrical bounds straddling today.
      const today = new Date();
      const min = new Date(today.getFullYear() - 1, 0, 1);
      const max = new Date(today.getFullYear() + 1, 11, 31);
      const result = pickAnchorDate(null, min, max);
      expect(isSameDay(result, today)).toBe(true);
    });

    it('falls back to minDate when today is BEFORE the allowed window', () => {
      // Window starts in a far-future year; today is below min.
      const farFuture = new Date(9999, 0, 15);
      const result = pickAnchorDate(null, farFuture, new Date(9999, 11, 31));
      expect(isSameDay(result, farFuture)).toBe(true);
    });

    it('falls back to maxDate when today is AFTER the allowed window AND min is null', () => {
      // Window ends in a far-past year and min is open. With null min the
      // priority order skips to max as the only remaining fallback. (When
      // BOTH min and max are present, min wins -- see the next test.)
      const farPast = new Date(1900, 5, 20);
      const result = pickAnchorDate(null, null, farPast);
      expect(isSameDay(result, farPast)).toBe(true);
    });

    it('prefers minDate over maxDate when today is out of range', () => {
      // Window entirely in the past. Both bounds are valid; the helper
      // opens onto the START of the window (matches user mental model of
      // "earliest selectable date").
      const min = new Date(1990, 0, 1);
      const max = new Date(1990, 11, 31);
      expect(isSameDay(pickAnchorDate(null, min, max), min)).toBe(true);
    });

    it('falls back to today when no bounds are supplied', () => {
      const today = new Date();
      expect(isSameDay(pickAnchorDate(null, null, null), today)).toBe(true);
    });

    it('strips the time-of-day from minDate / maxDate fallbacks', () => {
      // pickAnchorDate is consumed for visibleYear/visibleMonth so the
      // time-of-day is irrelevant -- but keeping the helper time-stripped
      // means consumers using it directly as a Date never carry over a
      // surprise non-midnight value. Use a far-future min so today is
      // forced out of range and the min-fallback path runs.
      const min = new Date(9999, 0, 15, 23, 59, 59, 999);
      const out = pickAnchorDate(null, min, null);
      expect(out.getHours()).toBe(0);
      expect(out.getMinutes()).toBe(0);
      expect(out.getSeconds()).toBe(0);
      expect(out.getMilliseconds()).toBe(0);
    });

    it('treats undefined preferred the same as null', () => {
      const today = new Date();
      const min = new Date(today.getFullYear() - 1, 0, 1);
      const max = new Date(today.getFullYear() + 1, 11, 31);
      expect(isSameDay(pickAnchorDate(undefined, min, max), today)).toBe(true);
    });
  });
});

describe('getWeekNumber - ISO 8601 corner cases', () => {
  const cases: Array<[Date, number]> = [
    [new Date(2025, 0, 1), 1], // Wed -> W01
    [new Date(2026, 0, 1), 1], // Thu -> W01
    [new Date(2027, 0, 1), 53], // Fri -> W53 of 2026
    [new Date(2027, 11, 31), 52], // Fri -> W52
    [new Date(2025, 11, 29), 1], // Mon -> W01 of 2026
  ];

  it.each(cases)('week of %s is %i', (date, week) => {
    expect(getWeekNumber(date)).toBe(week);
  });

  it('is independent of weekStart (value identical for 0, 1, 6)', () => {
    for (const [date, week] of cases) {
      // getWeekNumber takes no weekStart; the value must not vary.
      expect(getWeekNumber(date)).toBe(week);
    }
  });

  it('formats with zero padding', () => {
    expect(formatWeekNumber(1)).toBe('W01');
    expect(formatWeekNumber(53)).toBe('W53');
  });
});

describe('getMonthMatrix', () => {
  it('always returns 6 rows of 7 days', () => {
    for (const [y, m] of [
      [2024, 1],
      [2025, 1],
      [2024, 8],
      [2020, 2],
      [2020, 10],
    ] as Array<[number, number]>) {
      const matrix = getMonthMatrix(y, m);
      expect(matrix.weeks).toHaveLength(6);
      matrix.weeks.forEach((w) => expect(w.days).toHaveLength(7));
    }
  });

  it('counts in-month days correctly for leap / non-leap February', () => {
    const feb2024 = getMonthMatrix(2024, 1);
    const feb2025 = getMonthMatrix(2025, 1);
    const count = (m: ReturnType<typeof getMonthMatrix>) =>
      m.weeks.flatMap((w) => w.days).filter((d) => d.inMonth).length;
    expect(count(feb2024)).toBe(29);
    expect(count(feb2025)).toBe(28);
  });

  it('counts 30/31 in-month days for September 2024 / March 2020 (DST)', () => {
    const count = (m: ReturnType<typeof getMonthMatrix>) =>
      m.weeks.flatMap((w) => w.days).filter((d) => d.inMonth).length;
    expect(count(getMonthMatrix(2024, 8))).toBe(30);
    expect(count(getMonthMatrix(2020, 2))).toBe(31); // March 2020 DST start
    expect(count(getMonthMatrix(2020, 10))).toBe(30); // Nov 2020 DST end
  });

  it('rotates the first column to weekStart', () => {
    expect(getMonthMatrix(2025, 10, { weekStart: 0 }).weeks[0].days[0].date.getDay()).toBe(0);
    expect(getMonthMatrix(2025, 10, { weekStart: 1 }).weeks[0].days[0].date.getDay()).toBe(1);
    expect(getMonthMatrix(2025, 10, { weekStart: 6 }).weeks[0].days[0].date.getDay()).toBe(6);
  });

  it('precomputes week numbers only when showWeeks is true', () => {
    expect(getMonthMatrix(2025, 0, { showWeeks: false }).weeks[0].weekNumber).toBeNull();
    expect(typeof getMonthMatrix(2025, 0, { showWeeks: true }).weeks[0].weekNumber).toBe(
      'number',
    );
  });

  it("each row's week number equals the ISO week of that row's Thursday, for all weekStarts", () => {
    for (const weekStart of [0, 1, 6] as const) {
      const matrix = getMonthMatrix(2026, 0, { weekStart, showWeeks: true });
      for (const week of matrix.weeks) {
        const thursday = week.days.find((d) => d.date.getDay() === 4)!;
        expect(week.weekNumber).toBe(getWeekNumber(thursday.date));
      }
    }
  });
});

describe('range overlap helpers', () => {
  it('getMonthRange returns first and last day', () => {
    const feb = getMonthRange(2024, 1);
    expect(feb.start.getDate()).toBe(1);
    expect(feb.end.getDate()).toBe(29);
  });

  it('getYearRange spans Jan 1 to Dec 31', () => {
    const y = getYearRange(2025);
    expect(y.start.getMonth()).toBe(0);
    expect(y.end.getMonth()).toBe(11);
    expect(y.end.getDate()).toBe(31);
  });

  it('monthOverlapsRange', () => {
    expect(monthOverlapsRange(2025, 5, new Date(2025, 5, 15), null)).toBe(true);
    expect(monthOverlapsRange(2025, 5, null, new Date(2025, 4, 1))).toBe(false);
    expect(monthOverlapsRange(2025, 5, null, null)).toBe(true);
    expect(monthOverlapsRange(2025, 5, new Date(2025, 6, 1), null)).toBe(false);
  });

  it('yearOverlapsRange', () => {
    expect(yearOverlapsRange(2025, new Date(2025, 11, 31), null)).toBe(true);
    expect(yearOverlapsRange(2025, new Date(2026, 0, 1), null)).toBe(false);
    expect(yearOverlapsRange(2025, null, new Date(2024, 11, 31))).toBe(false);
    expect(yearOverlapsRange(2025, null, null)).toBe(true);
  });
});
