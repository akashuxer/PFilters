// @arvo/core/datetime - Calendar comparison and arithmetic
//
// All operations use numeric `Date` fields (getFullYear/getMonth/getDate/...),
// never getTime/toISOString, keeping the engine zone-naive.

import { daysInMonth } from '../format/fields';

/** Local midnight of the given date. */
export function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Alias for `normalizeDate`. */
export const normalize = normalizeDate;

function dayCompare(a: Date, b: Date): number {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() - b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() - b.getMonth();
  return a.getDate() - b.getDate();
}

/** True when both dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return dayCompare(a, b) === 0;
}

/** True when `a` is an earlier calendar day than `b`. */
export function isBeforeDay(a: Date, b: Date): boolean {
  return dayCompare(a, b) < 0;
}

/** True when `a` is a later calendar day than `b`. */
export function isAfterDay(a: Date, b: Date): boolean {
  return dayCompare(a, b) > 0;
}

/** True when both dates share the same calendar month and year. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** True when both dates share the same calendar year. */
export function isSameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}

/** True when both dates fall in the same calendar quarter and year. */
export function isSameQuarter(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    Math.floor(a.getMonth() / 3) === Math.floor(b.getMonth() / 3)
  );
}

/** Monday (ISO week start) of the date's week, at local midnight. */
function isoMonday(date: Date): Date {
  const isoDay = date.getDay() === 0 ? 7 : date.getDay(); // Mon=1..Sun=7
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - (isoDay - 1),
  );
}

/**
 * True when both dates fall in the same ISO 8601 week (weeks start Monday for
 * the value, independent of any display `weekStart`).
 */
export function isSameWeek(a: Date, b: Date): boolean {
  return isSameDay(isoMonday(a), isoMonday(b));
}

/** Add (or subtract) whole days, preserving the time-of-day. */
export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** Add (or subtract) whole months, clamping the day to the target month. */
export function addMonths(date: Date, months: number): Date {
  const total = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;
  const day = Math.min(date.getDate(), daysInMonth(targetYear, targetMonth));
  return new Date(
    targetYear,
    targetMonth,
    day,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/**
 * Inclusive day-level range test. `null` bounds are open. Time-of-day is
 * ignored (comparison is at the calendar-day level).
 */
export function inDateRange(
  date: Date,
  min: Date | null,
  max: Date | null,
): boolean {
  if (min && dayCompare(date, min) < 0) return false;
  if (max && dayCompare(date, max) > 0) return false;
  return true;
}

/**
 * Returns a date suitable for anchoring a calendar's initial `visibleYear` /
 * `visibleMonth` (and its initial focus target) so the user opens onto a
 * period that contains at least one selectable cell -- not a fully
 * out-of-range dead view.
 *
 * Resolution order:
 *   1. `preferred` when supplied (assumed clamped to `[min, max]` already).
 *   2. Today, when today falls within `[min, max]`.
 *   3. `min` (start of the allowed window).
 *   4. `max` (end of the allowed window).
 *   5. Today, when no bounds are set.
 *
 * Without this helper, calendar dropdowns / pickers that fall through to
 * `new Date()` open onto today's month even when the bounds preclude any
 * selectable day there -- with both Prev and Next also disabled (no
 * adjacent period overlaps the range), the dropdown becomes unusable.
 */
export function pickAnchorDate(
  preferred: Date | null | undefined,
  min: Date | null,
  max: Date | null,
): Date {
  if (preferred) return preferred;
  const today = new Date();
  if (inDateRange(today, min, max)) return today;
  if (min) {
    return new Date(min.getFullYear(), min.getMonth(), min.getDate());
  }
  if (max) {
    return new Date(max.getFullYear(), max.getMonth(), max.getDate());
  }
  return today;
}
