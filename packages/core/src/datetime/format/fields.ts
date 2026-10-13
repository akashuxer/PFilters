// @arvo/core/datetime - Numeric date-field assembly and validation
//
// Internal calendar math operates on plain numeric fields, never on getTime /
// toISOString, so a future Temporal migration stays mechanical.

import { getDateTimeConfig } from '../config';

/** Plain numeric fields parsed from a value or held by a segment buffer. */
export interface DateFields {
  year?: number;        // full (already pivoted) year
  month?: number;       // 0..11
  day?: number;         // 1..31
  hour?: number;        // 0..23
  minute?: number;      // 0..59
  second?: number;      // 0..59
  millisecond?: number; // 0..999
}

/** Number of days in a given month (month is 0..11). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Apply the `yy` pivot: <50 -> 2000+, else 1900+. */
export function applyYearPivot(twoDigitYear: number): number {
  return twoDigitYear < 50 ? 2000 + twoDigitYear : 1900 + twoDigitYear;
}

/**
 * Construct a `Date` from numeric fields, honoring the `timezone` config
 * ('local' default, or 'utc'). Returns `null` if the fields do not round-trip
 * (e.g. Feb 31, Feb 29 in a non-leap year), which is how the parser rejects
 * impossible dates without throwing.
 *
 * Time-only inputs (no year/month/day supplied) default to TODAY's calendar
 * date so a string like "16:05" parses against `HH:mm` to today at 4:05 PM
 * instead of January 1 of the current year. Partial date inputs still fall
 * back to the legacy month=0/day=1 defaults so a year-only or month-only
 * value lands on the start of its period.
 */
export function buildDateFromFields(fields: DateFields): Date | null {
  const now = new Date();
  const isTimeOnly =
    fields.year === undefined &&
    fields.month === undefined &&
    fields.day === undefined;
  const year = fields.year ?? now.getFullYear();
  const month = fields.month ?? (isTimeOnly ? now.getMonth() : 0);
  const day = fields.day ?? (isTimeOnly ? now.getDate() : 1);
  const hour = fields.hour ?? 0;
  const minute = fields.minute ?? 0;
  const second = fields.second ?? 0;
  const ms = fields.millisecond ?? 0;

  const utc = getDateTimeConfig().timezone === 'utc';

  let date: Date;
  if (utc) {
    date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
    if (year >= 0 && year < 100) date.setUTCFullYear(year);
  } else {
    date = new Date(year, month, day, hour, minute, second, ms);
    if (year >= 0 && year < 100) date.setFullYear(year);
  }

  /* c8 ignore next -- defensive: valid numeric fields never yield an invalid Date */
  if (Number.isNaN(date.getTime())) return null;

  // Reject overflow (e.g. Feb 31 rolled into March). Compare the requested
  // fields against the realized wall-clock fields.
  const ry = utc ? date.getUTCFullYear() : date.getFullYear();
  const rmo = utc ? date.getUTCMonth() : date.getMonth();
  const rd = utc ? date.getUTCDate() : date.getDate();
  const rh = utc ? date.getUTCHours() : date.getHours();
  const rmi = utc ? date.getUTCMinutes() : date.getMinutes();

  if (ry !== year || rmo !== month || rd !== day) return null;
  // Hour can legitimately differ on a spring-forward wall-clock gap, so only
  // validate the hour/minute when they are unaffected by such shifts. Day/
  // month/year mismatches are the meaningful "impossible date" signal.
  if (fields.hour !== undefined && rh !== hour && !hourGapAllowed(rh, hour))
    return null;
  if (fields.minute !== undefined && rmi !== minute) return null;

  return date;
}

// A spring-forward gap shifts the wall clock forward by (typically) one hour.
// Allow a +1 difference so a non-existent local time still parses to a faithful
// instant instead of being rejected outright. Only the running machine's own
// DST zone can trigger this, so it is not portably tested.
/* c8 ignore next 3 */
function hourGapAllowed(realized: number, requested: number): boolean {
  return realized - requested === 1;
}
