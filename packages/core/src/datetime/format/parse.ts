// @arvo/core/datetime - Parsers (date / time / datetime)
//
// A tolerant capture-group regex is compiled from the token stream. Numeric
// fields use loose digit counts; localized month / day / am-pm names use
// alternations built from `Intl`. Timezone tokens are CAPTURED but never used
// to adjust the constructed Date. `dddd` / `ddd` are matched and discarded
// (the day-name is redundant with the date).

import type { Locale, TimeObject, Token, TokenKind } from '../types';
import { tokenizeFormat } from './tokenize';
import { getAmPmStrings, getDayNames, getMonthNames, getUserLocale } from './locale';
import {
  applyYearPivot,
  buildDateFromFields,
  type DateFields,
} from './fields';

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function buildAlternation(names: string[]): string {
  const unique = [...new Set(names)].filter(Boolean);
  unique.sort((a, b) => b.length - a.length);
  return unique.map(escapeRegExp).join('|');
}

function monthLookup(locale: Locale): Map<string, number> {
  const map = new Map<string, number>();
  for (const kind of ['full', 'abbrev'] as const) {
    getMonthNames(locale, kind).forEach((name, index) => {
      map.set(normalizeName(name), index);
    });
  }
  return map;
}

function ampmLookup(locale: Locale): Map<string, 'am' | 'pm'> {
  const { am, pm } = getAmPmStrings(locale);
  const map = new Map<string, 'am' | 'pm'>();
  map.set(normalizeName(am), 'am');
  map.set(normalizeName(pm), 'pm');
  map.set('am', 'am');
  map.set('pm', 'pm');
  return map;
}

interface Slot {
  kind: TokenKind;
  length: number;
}

interface CompiledFormat {
  regex: RegExp;
  slots: Slot[];
}

function fragmentFor(token: Token, locale: Locale, slots: Slot[]): string {
  const len = token.length ?? token.raw.length;
  switch (token.kind) {
    case 'year':
      slots.push({ kind: 'year', length: len });
      return len >= 4 ? '(\\d{1,4})' : '(\\d{1,2})';
    case 'month':
    case 'day':
    case 'hour24':
    case 'hour12':
    case 'minute':
    case 'second':
      slots.push({ kind: token.kind, length: len });
      return '(\\d{1,2})';
    case 'fraction':
      slots.push({ kind: 'fraction', length: len });
      return '(\\d{1,7})';
    case 'monthName': {
      slots.push({ kind: 'monthName', length: len });
      const alt = buildAlternation([
        ...getMonthNames(locale, 'full'),
        ...getMonthNames(locale, 'abbrev'),
      ]);
      return `(${alt})`;
    }
    case 'ampm': {
      slots.push({ kind: 'ampm', length: len });
      const { am, pm } = getAmPmStrings(locale);
      const alt = buildAlternation([am, pm, 'AM', 'PM']);
      return `(${alt})`;
    }
    case 'timezone':
      slots.push({ kind: 'timezone', length: len });
      return '([+-]\\d{2}:?\\d{0,2})';
    case 'dayName': {
      const alt = buildAlternation([
        ...getDayNames(locale, 'full'),
        ...getDayNames(locale, 'abbrev'),
      ]);
      return `(?:${alt})`;
    }
    case 'literal':
    default: {
      const escaped = escapeRegExp(token.raw);
      return escaped.replace(/\s+/g, '\\s*');
    }
  }
}

function compileFormat(format: string, locale: Locale): CompiledFormat {
  const tokens = tokenizeFormat(format);
  const slots: Slot[] = [];
  let source = '^\\s*';
  for (const token of tokens) {
    source += fragmentFor(token, locale, slots);
  }
  source += '\\s*$';
  return { regex: new RegExp(source, 'i'), slots };
}

interface ExtractedFields extends DateFields {
  hour12?: number;
  ampm?: 'am' | 'pm';
  timezone?: string;
  hasTime: boolean;
}

function extract(
  match: RegExpExecArray,
  slots: Slot[],
  locale: Locale,
): ExtractedFields {
  const fields: ExtractedFields = { hasTime: false };
  const months = monthLookup(locale);
  const periods = ampmLookup(locale);

  slots.forEach((slot, i) => {
    const raw = match[i + 1];
    /* c8 ignore next -- required capture groups are always defined post-match */
    if (raw === undefined) return;
    switch (slot.kind) {
      case 'year': {
        let year = Number(raw);
        if (slot.length <= 2 && year < 100) year = applyYearPivot(year);
        fields.year = year;
        break;
      }
      case 'month':
        fields.month = Number(raw) - 1;
        break;
      case 'monthName': {
        const idx = months.get(normalizeName(raw));
        /* c8 ignore next -- the alternation is built from the same name map */
        if (idx === undefined) return;
        fields.month = idx;
        break;
      }
      case 'day':
        fields.day = Number(raw);
        break;
      case 'hour24':
        fields.hour = Number(raw);
        fields.hasTime = true;
        break;
      case 'hour12':
        fields.hour12 = Number(raw);
        fields.hasTime = true;
        break;
      case 'minute':
        fields.minute = Number(raw);
        fields.hasTime = true;
        break;
      case 'second':
        fields.second = Number(raw);
        fields.hasTime = true;
        break;
      case 'fraction':
        fields.millisecond = Number((raw + '000').slice(0, 3));
        fields.hasTime = true;
        break;
      case 'ampm': {
        const period = periods.get(normalizeName(raw));
        if (period) fields.ampm = period;
        break;
      }
      case 'timezone':
        fields.timezone = raw;
        break;
      /* c8 ignore next 2 -- exhaustive: only captured slot kinds reach here */
      default:
        break;
    }
  });

  // Resolve 12-hour into 24-hour.
  if (fields.hour12 !== undefined) {
    let h = fields.hour12 % 12; // 12 -> 0
    if (fields.ampm === 'pm') h += 12;
    fields.hour = h;
  }
  return fields;
}

function parseCore(value: string, format: string, locale: Locale): Date | null {
  const { regex, slots } = compileFormat(format, locale);
  const match = regex.exec(value.trim());
  if (!match) return null;

  const fields = extract(match, slots, locale);
  return buildDateFromFields(fields);
}

/** Parse a date string against a .NET / Kendo format. Returns null on failure. */
export function parseDate(
  value: string,
  format: string,
  locale?: Locale,
): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return parseCore(value, format, getUserLocale(locale));
}

/** Parse a combined date+time string (shares the date parser core). */
export function parseDateTime(
  value: string,
  format: string,
  locale?: Locale,
): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return parseCore(value, format, getUserLocale(locale));
}

/**
 * Parse a time string against a format into a structured `TimeObject`. Unlike
 * the legacy engine, the supplied `format` drives the regex. The captured
 * timezone (if any) is stored but does not adjust anything.
 */
export function parseTime(value: string, format: string): TimeObject | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const locale = getUserLocale();
  const { regex, slots } = compileFormat(format, locale);
  const match = regex.exec(value.trim());
  if (!match) return null;

  const fields = extract(match, slots, locale);
  if (!fields.hasTime) return null;

  const hours = fields.hour ?? 0;
  const minutes = fields.minute ?? 0;
  const seconds = fields.second;
  const ms = fields.millisecond;

  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  if (seconds !== undefined && (seconds < 0 || seconds > 59)) return null;

  const result: TimeObject = { hours, minutes };
  if (seconds !== undefined) result.seconds = seconds;
  if (ms !== undefined) result.milliseconds = ms;
  if (fields.timezone !== undefined) result.timezone = fields.timezone;
  return result;
}

const TIME_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  'hour24',
  'hour12',
  'minute',
  'second',
  'fraction',
  'ampm',
  'timezone',
]);

const DATE_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  'year',
  'month',
  'monthName',
  'day',
  'dayName',
]);

/**
 * Split a combined format into its date and time portions plus the literal
 * separator between them. Either portion may be empty.
 */
export function splitDateTimeFormat(format: string): {
  datePart: string;
  timePart: string;
  separator: string;
} {
  const tokens = tokenizeFormat(format);
  let lastDate = -1;
  let firstTime = -1;
  tokens.forEach((token, i) => {
    if (DATE_KINDS.has(token.kind)) lastDate = i;
    if (firstTime === -1 && TIME_KINDS.has(token.kind)) firstTime = i;
  });

  if (firstTime === -1) {
    return { datePart: format, timePart: '', separator: '' };
  }
  if (lastDate === -1) {
    return { datePart: '', timePart: format, separator: '' };
  }

  const raw = (from: number, to: number): string =>
    tokens
      .slice(from, to)
      .map((t) => t.raw)
      .join('');

  const datePart = raw(0, lastDate + 1);
  const separator = raw(lastDate + 1, firstTime);
  const timePart = raw(firstTime, tokens.length);
  return { datePart, timePart, separator };
}
