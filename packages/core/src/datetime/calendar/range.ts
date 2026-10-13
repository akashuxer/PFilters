// @arvo/core/datetime - Period ranges and range-overlap tests
//
// Used by the calendar to disable month/year cells that contain no selectable
// day. Comparisons are day-level and null bounds are open.

import { daysInMonth } from '../format/fields';

/** First and last day (local midnight) of a month (month is 0..11). */
export function getMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month, daysInMonth(year, month)),
  };
}

/** First and last day (local midnight) of a year. */
export function getYearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
}

function overlaps(
  periodStart: Date,
  periodEnd: Date,
  min: Date | null,
  max: Date | null,
): boolean {
  // No overlap if the period ends before min or starts after max.
  if (max && periodStart > endOfDay(max)) return false;
  if (min && periodEnd < startOfDay(min)) return false;
  return true;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

/** True when any day of the given month falls within [min, max]. */
export function monthOverlapsRange(
  year: number,
  month: number,
  min: Date | null,
  max: Date | null,
): boolean {
  const { start, end } = getMonthRange(year, month);
  return overlaps(start, end, min, max);
}

/** True when any day of the given year falls within [min, max]. */
export function yearOverlapsRange(
  year: number,
  min: Date | null,
  max: Date | null,
): boolean {
  const { start, end } = getYearRange(year);
  return overlaps(start, end, min, max);
}
