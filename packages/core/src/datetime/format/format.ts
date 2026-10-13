// @arvo/core/datetime - Formatters (date / time / datetime)
//
// Token walk over a tokenized format. Localized names are fetched lazily.
// Timezone tokens are cosmetic: they reflect the browser's local offset (or
// '+00:00' under the 'utc' config), never an absolute conversion.

import type { Locale, TimeObject, Token } from '../types';
import { getDateTimeConfig } from '../config';
import { tokenizeFormat } from './tokenize';
import {
  getAmPmStrings,
  getDayNames,
  getMonthNames,
  getUserLocale,
} from './locale';

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function formatFraction(milliseconds: number, length: number): string {
  const base = pad(milliseconds, 3);
  if (length <= 3) return base.slice(0, length);
  return base + '0'.repeat(length - 3);
}

function formatOffset(totalMinutes: number, withColon: boolean): string {
  const sign = totalMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(totalMinutes);
  const hh = pad(Math.floor(abs / 60), 2);
  if (!withColon) return `${sign}${hh}`;
  return `${sign}${hh}:${pad(abs % 60, 2)}`;
}

/** Parse an offset string ("+05:30", "-03", "+0000", "Z") to signed minutes. */
function parseOffsetMinutes(tz: string): number {
  const trimmed = tz.trim();
  if (trimmed === 'Z' || trimmed === 'z') return 0;
  const match = /^([+-])(\d{2}):?(\d{2})?$/.exec(trimmed);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;
  return sign * (hours * 60 + minutes);
}

interface Accessors {
  year(): number;
  month(): number;
  day(): number;
  weekday(): number;
  hours(): number;
  minutes(): number;
  seconds(): number;
  ms(): number;
  offsetMinutes(): number;
}

function accessorsFor(date: Date): Accessors {
  const utc = getDateTimeConfig().timezone === 'utc';
  if (utc) {
    return {
      year: () => date.getUTCFullYear(),
      month: () => date.getUTCMonth(),
      day: () => date.getUTCDate(),
      weekday: () => date.getUTCDay(),
      hours: () => date.getUTCHours(),
      minutes: () => date.getUTCMinutes(),
      seconds: () => date.getUTCSeconds(),
      ms: () => date.getUTCMilliseconds(),
      offsetMinutes: () => 0,
    };
  }
  return {
    year: () => date.getFullYear(),
    month: () => date.getMonth(),
    day: () => date.getDate(),
    weekday: () => date.getDay(),
    hours: () => date.getHours(),
    minutes: () => date.getMinutes(),
    seconds: () => date.getSeconds(),
    ms: () => date.getMilliseconds(),
    offsetMinutes: () => -date.getTimezoneOffset(),
  };
}

function renderToken(
  token: Token,
  acc: Accessors,
  locale: Locale,
  tzString: string | undefined,
): string {
  const len = token.length ?? token.raw.length;
  switch (token.kind) {
    case 'year':
      return len >= 4 ? pad(acc.year(), 4) : pad(acc.year() % 100, 2);
    case 'month':
      return len >= 2 ? pad(acc.month() + 1, 2) : String(acc.month() + 1);
    case 'monthName':
      return getMonthNames(locale, len >= 4 ? 'full' : 'abbrev')[acc.month()];
    case 'day':
      return len >= 2 ? pad(acc.day(), 2) : String(acc.day());
    case 'dayName':
      return getDayNames(locale, len >= 4 ? 'full' : 'abbrev')[acc.weekday()];
    case 'hour24':
      return len >= 2 ? pad(acc.hours(), 2) : String(acc.hours());
    case 'hour12': {
      const h12 = ((acc.hours() + 11) % 12) + 1;
      return len >= 2 ? pad(h12, 2) : String(h12);
    }
    case 'minute':
      return len >= 2 ? pad(acc.minutes(), 2) : String(acc.minutes());
    case 'second':
      return len >= 2 ? pad(acc.seconds(), 2) : String(acc.seconds());
    case 'fraction':
      return formatFraction(acc.ms(), len);
    case 'ampm': {
      const { am, pm } = getAmPmStrings(locale);
      return acc.hours() < 12 ? am : pm;
    }
    case 'timezone': {
      const minutes =
        tzString !== undefined ? parseOffsetMinutes(tzString) : acc.offsetMinutes();
      return formatOffset(minutes, len >= 3);
    }
    case 'literal':
    default:
      return token.raw;
  }
}

function walk(
  date: Date,
  format: string,
  locale: Locale,
  tzString?: string,
): string {
  const acc = accessorsFor(date);
  const tokens = tokenizeFormat(format);
  let out = '';
  for (const token of tokens) {
    out += renderToken(token, acc, locale, tzString);
  }
  return out;
}

function assertValid(date: Date): void {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid Date passed to formatter');
  }
}

/** Format a `Date` using a .NET / Kendo format string. */
export function formatDate(date: Date, format: string, locale?: Locale): string {
  assertValid(date);
  return walk(date, format, getUserLocale(locale));
}

/** Format a combined date+time `Date` (identical engine to `formatDate`). */
export function formatDateTime(
  date: Date,
  format: string,
  locale?: Locale,
): string {
  assertValid(date);
  return walk(date, format, getUserLocale(locale));
}

/**
 * Format a structured `TimeObject`. A reference calendar date backs the time
 * fields so any date tokens in `format` render deterministically. The object's
 * captured `timezone` (if any) drives timezone tokens.
 */
export function formatTime(time: TimeObject, format: string): string {
  const utc = getDateTimeConfig().timezone === 'utc';
  const h = time.hours;
  const mi = time.minutes;
  const s = time.seconds ?? 0;
  const ms = time.milliseconds ?? 0;
  const date = utc
    ? new Date(Date.UTC(2000, 0, 1, h, mi, s, ms))
    : new Date(2000, 0, 1, h, mi, s, ms);
  return walk(date, format, getUserLocale(), time.timezone);
}
