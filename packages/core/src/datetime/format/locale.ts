// @arvo/core/datetime - Locale resolution and locale-derived data
//
// All `Intl` instances and derived name arrays are memoized.

import type { Locale } from '../types';
import { getDateTimeConfig } from '../config';
import { tokenizeFormat } from './tokenize';

/**
 * Resolve the active locale via this cascade (highest to lowest):
 *   1. explicit `override` argument (the React adapter funnels its
 *      `ArvoLocaleProvider` value and the component `locale` prop here)
 *   2. `configureDateTime({ locale })`
 *   3. `document.documentElement.lang` (<html lang>)
 *   4. 'en-US'
 *
 * `navigator.language` / `navigator.languages` are intentionally NEVER consulted.
 */
export function getUserLocale(override?: Locale): Locale {
  if (override) return override;

  const configured = getDateTimeConfig().locale;
  if (configured) return configured;

  if (typeof document !== 'undefined' && document.documentElement) {
    const lang = document.documentElement.lang;
    if (lang) return lang;
  }

  return 'en-US';
}

// ---------------------------------------------------------------------------
// Memoized Intl-derived names
// ---------------------------------------------------------------------------

type NameKind = 'full' | 'abbrev';

const monthNameCache = new Map<string, string[]>();
const dayNameCache = new Map<string, string[]>();
const ampmCache = new Map<string, { am: string; pm: string }>();
const hourCycleCache = new Map<string, boolean>();
const dateFormatCache = new Map<string, string>();

// Reference dates chosen to avoid month/week boundaries and DST edges.
const MONTH_REF_DAY = 15;
const MONTH_REF_YEAR = 2021;
// 2021-08-01 is a Sunday, so successive days map cleanly to getDay() 0..6.
const WEEK_REF = new Date(2021, 7, 1);

function monthFormatter(locale: Locale, kind: NameKind): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    month: kind === 'full' ? 'long' : 'short',
  });
}

/** Localized month names indexed 0..11 (January..December). */
export function getMonthNames(locale: Locale, kind: NameKind): string[] {
  const cacheKey = `${locale}|${kind}`;
  const cached = monthNameCache.get(cacheKey);
  if (cached) return cached;

  const fmt = monthFormatter(locale, kind);
  const names: string[] = [];
  for (let m = 0; m < 12; m += 1) {
    names.push(fmt.format(new Date(MONTH_REF_YEAR, m, MONTH_REF_DAY)));
  }
  monthNameCache.set(cacheKey, names);
  return names;
}

/** Localized weekday names indexed 0..6 (Sunday..Saturday). */
export function getDayNames(locale: Locale, kind: NameKind): string[] {
  const cacheKey = `${locale}|${kind}`;
  const cached = dayNameCache.get(cacheKey);
  if (cached) return cached;

  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: kind === 'full' ? 'long' : 'short',
  });
  const names: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(WEEK_REF.getFullYear(), WEEK_REF.getMonth(), 1 + i);
    names.push(fmt.format(d));
  }
  dayNameCache.set(cacheKey, names);
  return names;
}

/**
 * Weekday header labels rotated by `weekStart` (0=Sunday). The rotation is a
 * DISPLAY concern only; it never changes week numbers.
 */
export function getWeekdayHeaders(
  locale: Locale,
  weekStart: number,
  kind: 'full' | 'abbrev' | 'narrow' | 'min',
): string[] {
  const names =
    kind === 'narrow'
      ? narrowDayNames(locale)
      : kind === 'min'
        ? min2DayNames(locale)
        : getDayNames(locale, kind === 'full' ? 'full' : 'abbrev');
  const start = ((weekStart % 7) + 7) % 7;
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(names[(start + i) % 7]);
  }
  return out;
}

const narrowCache = new Map<string, string[]>();
function narrowDayNames(locale: Locale): string[] {
  const cached = narrowCache.get(locale);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const names: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(WEEK_REF.getFullYear(), WEEK_REF.getMonth(), 1 + i);
    names.push(fmt.format(d));
  }
  narrowCache.set(locale, names);
  return names;
}

// Two-character weekday labels (e.g. "Su", "Mo") used by the calendar grid
// header. Derived by trimming the localized abbreviated names to two
// characters so it degrades gracefully for locales whose short names are
// already one character (e.g. CJK).
const min2Cache = new Map<string, string[]>();
function min2DayNames(locale: Locale): string[] {
  const cached = min2Cache.get(locale);
  if (cached) return cached;
  const names = getDayNames(locale, 'abbrev').map((n) => n.slice(0, 2));
  min2Cache.set(locale, names);
  return names;
}

/** Localized AM/PM (dayPeriod) strings. */
export function getAmPmStrings(locale: Locale): { am: string; pm: string } {
  const cached = ampmCache.get(locale);
  if (cached) return cached;

  const fmt = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: true,
  });
  const am = dayPeriodOf(fmt, new Date(2020, 0, 1, 9, 0)) || 'AM';
  const pm = dayPeriodOf(fmt, new Date(2020, 0, 1, 21, 0)) || 'PM';
  const result = { am, pm };
  ampmCache.set(locale, result);
  return result;
}

function dayPeriodOf(fmt: Intl.DateTimeFormat, date: Date): string {
  const part = fmt.formatToParts(date).find((p) => p.type === 'dayPeriod');
  return part ? part.value : '';
}

const TWELVE_HOUR_CYCLES: ReadonlySet<string> = new Set(['h11', 'h12']);
const TWENTY_FOUR_HOUR_CYCLES: ReadonlySet<string> = new Set(['h23', 'h24']);

/** True when the locale defaults to a 12-hour clock. */
function localeUses12Hour(locale: Locale): boolean {
  const cached = hourCycleCache.get(locale);
  if (cached !== undefined) return cached;

  let result: boolean;
  const resolved = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
  }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & {
    hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
  };
  /* c8 ignore next -- full-ICU always resolves a concrete hourCycle */
  const hourCycle = resolved.hourCycle ?? '';

  if (TWELVE_HOUR_CYCLES.has(hourCycle)) {
    result = true;
  } else if (TWENTY_FOUR_HOUR_CYCLES.has(hourCycle)) {
    result = false;
  } else {
    /* c8 ignore start -- defensive: full-ICU always resolves hourCycle */
    // Fallback: a 12-hour locale renders a dayPeriod part.
    const parts = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(new Date(2020, 0, 1, 13, 0));
    result = parts.some((p) => p.type === 'dayPeriod');
    /* c8 ignore stop */
  }

  hourCycleCache.set(locale, result);
  return result;
}

/**
 * Format wins; locale is the fallback when the format omits an hour-cycle
 * signal.
 *   1. format has `h`/`hh` -> 12-hour.
 *   2. format has `H`/`HH` -> 24-hour.
 *   3. format has `tt` but no hour token -> 12-hour.
 *   4. otherwise -> locale's resolved hour cycle.
 */
export function shouldUse12Hour(input: {
  format?: string;
  locale?: Locale;
}): boolean {
  if (input.format) {
    const tokens = tokenizeFormat(input.format);
    let hasHour12 = false;
    let hasHour24 = false;
    let hasAmPm = false;
    for (const t of tokens) {
      if (t.kind === 'hour12') hasHour12 = true;
      else if (t.kind === 'hour24') hasHour24 = true;
      else if (t.kind === 'ampm') hasAmPm = true;
    }
    if (hasHour12) return true;
    if (hasHour24) return false;
    if (hasAmPm) return true;
  }
  return localeUses12Hour(getUserLocale(input.locale));
}

// ---------------------------------------------------------------------------
// Locale -> .NET token format derivation
// ---------------------------------------------------------------------------

/**
 * Derive a .NET / Kendo date format from the locale's short date style.
 * Numeric fields are normalized to padded tokens and the year to `yyyy`
 * (the platform canonical formats are 4-digit years); separators are kept.
 */
export function getLocaleDateFormat(locale: Locale): string {
  const cached = dateFormatCache.get(locale);
  if (cached) return cached;

  const parts = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
  }).formatToParts(new Date(2021, 10, 22));

  let out = '';
  for (const part of parts) {
    switch (part.type) {
      case 'year':
        out += 'yyyy';
        break;
      case 'month':
        out += 'MM';
        break;
      case 'day':
        out += 'dd';
        break;
      case 'literal':
        out += part.value;
        break;
      /* c8 ignore next 2 -- short dates only emit year/month/day/literal */
      default:
        break;
    }
  }

  /* c8 ignore next 2 -- defensive: Intl always yields date parts here */
  if (!out) out = 'yyyy-MM-dd';

  dateFormatCache.set(locale, out);
  return out;
}

/** Derive a time format; 12-hour locales get `hh:mm tt`, else `HH:mm`. */
export function getLocaleTimeFormat(locale: Locale, use24Hour?: boolean): string {
  const twelve =
    use24Hour === undefined ? localeUses12Hour(locale) : !use24Hour;
  return twelve ? 'hh:mm tt' : 'HH:mm';
}

/** Derive a combined datetime format (date + space + time). */
export function getLocaleDateTimeFormat(
  locale: Locale,
  use24Hour?: boolean,
): string {
  return `${getLocaleDateFormat(locale)} ${getLocaleTimeFormat(locale, use24Hour)}`;
}
