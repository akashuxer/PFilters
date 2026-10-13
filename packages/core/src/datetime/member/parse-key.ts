// @arvo/core/datetime - Member key parsing
//
// Member keys are platform date strings (e.g. "2015/01/04 00:00:00"). We try a
// set of known .NET / ISO formats (year-first first to disambiguate), then fall
// back to native Date parsing.

import { parseDateTime } from '../format/parse';

const KEY_FORMATS = [
  'yyyy-MM-ddTHH:mm:ss',
  'yyyy-MM-dd HH:mm:ss',
  'yyyy/MM/dd HH:mm:ss',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'yyyy.MM.dd',
  'MM/dd/yyyy HH:mm:ss',
  'MM/dd/yyyy',
  'dd-MMM-yyyy',
  'dd/MM/yyyy',
  'dd-MM-yyyy',
];

/**
 * Parse a member key into a `Date`. Returns `null` when no strategy succeeds.
 * The day-name and timezone tokens, if present in the input, are ignored.
 */
export function parseMemberKey(key: string): Date | null {
  if (typeof key !== 'string' || key.trim() === '') return null;
  const value = key.trim();

  for (const format of KEY_FORMATS) {
    const parsed = parseDateTime(value, format, 'en-US');
    if (parsed) return parsed;
  }

  const native = Date.parse(value);
  if (!Number.isNaN(native)) return new Date(native);

  return null;
}
