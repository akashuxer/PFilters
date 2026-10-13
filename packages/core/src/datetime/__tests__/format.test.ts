import { describe, it, expect, afterEach } from 'vitest';
import { formatDate, formatTime, formatDateTime } from '../format/format';
import { parseDate, parseTime, parseDateTime, splitDateTimeFormat } from '../format/parse';
import { resetDateTimeConfig, configureDateTime } from '../config';

const REF = new Date(2025, 10, 20, 16, 5, 9, 123); // Thu Nov 20 2025 16:05:09.123

afterEach(() => resetDateTimeConfig());

describe('formatDate - date-only matrix (en-US, 02 spec B1)', () => {
  const cases: Array<[string, string]> = [
    ['MMM/dd/yyyy', 'Nov/20/2025'],
    ['MM/dd/yyyy', '11/20/2025'],
    ['MM/dd/yy', '11/20/25'],
    ['MM.dd.yyyy', '11.20.2025'],
    ['yyyy/MM/dd', '2025/11/20'],
    ['dd/MMM/yyyy', '20/Nov/2025'],
    ['dd/MM/yyyy', '20/11/2025'],
    ['dd/MM/yy', '20/11/25'],
    ['dd-MM-yyyy', '20-11-2025'],
    ['MMM-dd-yyyy', 'Nov-20-2025'],
    ['dd-MMM-yyyy', '20-Nov-2025'],
    ['dd-MMM-yy', '20-Nov-25'],
    ['yyyy-MM-dd', '2025-11-20'],
    ['MMM-yy', 'Nov-25'],
  ];

  it.each(cases)('formats %s -> %s', (format, expected) => {
    expect(formatDate(REF, format, 'en-US')).toBe(expected);
  });

  it.each(cases)('round-trips %s', (format) => {
    const text = formatDate(REF, format, 'en-US');
    const parsed = parseDate(text, format, 'en-US');
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2025);
    expect(parsed!.getMonth()).toBe(10);
    // "MMM-yy" omits the day, which defaults to 1 on parse.
    if (format.includes('d')) expect(parsed!.getDate()).toBe(20);
  });
});

describe('formatDateTime - datetime matrix (en-US, 02 spec B2)', () => {
  const cases: Array<[string, string]> = [
    ['yyyy/MM/dd HH:mm:ss', '2025/11/20 16:05:09'],
    ['yyyy/MM/dd HH:mm', '2025/11/20 16:05'],
    ['dd-MM-yyyyTHH:mm:ss', '20-11-2025T16:05:09'],
    ['dd-MMM-yyyyTHH:mm:ss', '20-Nov-2025T16:05:09'],
    ['dd-MMM-yyyy HH:mm:ss', '20-Nov-2025 16:05:09'],
    ['dd-MMM-yyyy HH:mm', '20-Nov-2025 16:05'],
    ['ddd MMM dd yyyy HH:mm:ss', 'Thu Nov 20 2025 16:05:09'],
    ['yyyy-MM-ddTHH:mm:ss.fffffff', '2025-11-20T16:05:09.1230000'],
    ['yyyy-MM-ddTHH:mm:ss.fff', '2025-11-20T16:05:09.123'],
    ['yyyy-MM-ddTHH:mm:ss', '2025-11-20T16:05:09'],
    ['yyyy-MM-ddTHH:mm', '2025-11-20T16:05'],
    ['yyyy-MM-dd HH:mm:ss', '2025-11-20 16:05:09'],
    ['yyyy-MM-dd HH:mm', '2025-11-20 16:05'],
    ['HH:mm:ss', '16:05:09'],
    ['HH:mm', '16:05'],
  ];

  it.each(cases)('formats %s -> %s', (format, expected) => {
    expect(formatDateTime(REF, format, 'en-US')).toBe(expected);
  });

  it.each(cases)('round-trips %s', (format) => {
    const text = formatDateTime(REF, format, 'en-US');
    const parsed = parseDateTime(text, format, 'en-US');
    expect(parsed).not.toBeNull();
    expect(parsed!.getHours()).toBe(16);
    expect(parsed!.getMinutes()).toBe(5);
    if (format.includes('ss')) expect(parsed!.getSeconds()).toBe(9);
  });
});

describe('multi-locale round-trips', () => {
  const locales = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'ar-EG'];

  it.each(locales)('numeric format round-trips in %s', (locale) => {
    const text = formatDate(REF, 'dd/MM/yyyy', locale);
    const parsed = parseDate(text, 'dd/MM/yyyy', locale);
    expect(parsed!.getFullYear()).toBe(2025);
    expect(parsed!.getMonth()).toBe(10);
    expect(parsed!.getDate()).toBe(20);
  });

  it.each(locales)('localized month-name format round-trips in %s', (locale) => {
    const text = formatDate(REF, 'dd MMMM yyyy', locale);
    const parsed = parseDate(text, 'dd MMMM yyyy', locale);
    expect(parsed).not.toBeNull();
    expect(parsed!.getMonth()).toBe(10);
    expect(parsed!.getFullYear()).toBe(2025);
    expect(parsed!.getDate()).toBe(20);
  });

  it('parses German full month names', () => {
    const parsed = parseDate('20. November 2025', 'dd. MMMM yyyy', 'de-DE');
    expect(parsed!.getMonth()).toBe(10);
  });

  it('parses Japanese month names', () => {
    const text = formatDate(REF, 'yyyy MMMM', 'ja-JP');
    const parsed = parseDate(text, 'yyyy MMMM', 'ja-JP');
    expect(parsed!.getMonth()).toBe(10);
  });
});

describe('yy pivot', () => {
  it('pivots <50 to 2000+', () => {
    expect(parseDate('12/31/49', 'MM/dd/yy')!.getFullYear()).toBe(2049);
    expect(parseDate('01/01/00', 'MM/dd/yy')!.getFullYear()).toBe(2000);
  });

  it('pivots >=50 to 1900+', () => {
    expect(parseDate('12/31/50', 'MM/dd/yy')!.getFullYear()).toBe(1950);
    expect(parseDate('06/15/99', 'MM/dd/yy')!.getFullYear()).toBe(1999);
  });
});

describe('parser validation', () => {
  it('rejects impossible dates', () => {
    expect(parseDate('2025-02-31', 'yyyy-MM-dd')).toBeNull();
    expect(parseDate('2025-04-31', 'yyyy-MM-dd')).toBeNull();
    expect(parseDate('2025-02-29', 'yyyy-MM-dd')).toBeNull(); // 2025 not leap
    expect(parseDate('2025-13-01', 'yyyy-MM-dd')).toBeNull();
  });

  it('accepts Feb 29 in a leap year', () => {
    const d = parseDate('2024-02-29', 'yyyy-MM-dd');
    expect(d).not.toBeNull();
    expect(d!.getMonth()).toBe(1);
    expect(d!.getDate()).toBe(29);
  });

  it('returns null for empty / unparseable input', () => {
    expect(parseDate('', 'yyyy-MM-dd')).toBeNull();
    expect(parseDate('not a date', 'yyyy-MM-dd')).toBeNull();
    expect(parseDate('   ', 'yyyy-MM-dd')).toBeNull();
  });

  it('disambiguates MMM vs MM', () => {
    expect(parseDate('Nov/20/2025', 'MMM/dd/yyyy')!.getMonth()).toBe(10);
    expect(parseDate('11/20/2025', 'MM/dd/yyyy')!.getMonth()).toBe(10);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDate('  2025-11-20  ', 'yyyy-MM-dd')!.getDate()).toBe(20);
  });
});

describe('fractional seconds precision', () => {
  it('pads / truncates from milliseconds', () => {
    const d = new Date(2025, 0, 1, 0, 0, 0, 123);
    expect(formatDate(d, 'f')).toBe('1');
    expect(formatDate(d, 'fff')).toBe('123');
    expect(formatDate(d, 'fffffff')).toBe('1230000');
  });

  it('left-pads small millisecond values', () => {
    const d = new Date(2025, 0, 1, 0, 0, 0, 5);
    expect(formatDate(d, 'f')).toBe('0');
    expect(formatDate(d, 'fff')).toBe('005');
    expect(formatDate(d, 'fffffff')).toBe('0050000');
  });
});

describe('timezone tokens (OQ-1)', () => {
  it('parse IGNORES a captured offset (no Date adjustment)', () => {
    const d = parseDateTime('2025-11-20T16:05:09-03:00', 'yyyy-MM-ddTHH:mm:sszzz');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(16); // not 19
    expect(d!.getDate()).toBe(20);
  });

  it('utc config emits +00:00 / +00 and constructs via Date.UTC', () => {
    configureDateTime({ timezone: 'utc' });
    const d = parseDate('2025-11-20', 'yyyy-MM-dd');
    expect(d!.getUTCHours()).toBe(0);
    expect(d!.getUTCDate()).toBe(20);
    expect(formatDate(d!, 'zzz')).toBe('+00:00');
    expect(formatDate(d!, 'zz')).toBe('+00');
  });

  it('local zzz reflects the machine offset for the date (round-trips)', () => {
    const text = formatDate(REF, 'zzz');
    expect(text).toMatch(/^[+-]\d{2}:\d{2}$/);
  });
});

describe('DST faithfulness (zone-naive, 02 spec F)', () => {
  it('spring-forward wall clock is formatted faithfully', () => {
    const d = new Date(2025, 2, 9, 2, 30); // US/Central spring-forward gap
    const expected = `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
    expect(formatDate(d, 'HH:mm')).toBe(expected);
  });

  it('fall-back wall clock formats without ambiguity', () => {
    const d = new Date(2025, 9, 26, 2, 30); // Europe/Berlin fall-back
    const expected = `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
    expect(formatDate(d, 'HH:mm')).toBe(expected);
  });

  it('a normal time is unaffected', () => {
    expect(formatDate(new Date(2025, 2, 9, 14, 30), 'HH:mm')).toBe('14:30');
  });
});

describe('formatDate error handling', () => {
  it('throws RangeError for an invalid Date', () => {
    expect(() => formatDate(new Date(NaN), 'yyyy-MM-dd')).toThrow(RangeError);
  });
});

describe('single-character (non-padded) tokens', () => {
  it('formats M / d / H / h / m / s without leading zeros', () => {
    const d = new Date(2025, 0, 5, 9, 7, 3, 0);
    expect(formatDate(d, 'M/d/yyyy', 'en-US')).toBe('1/5/2025');
    expect(formatDateTime(d, 'H:m:s', 'en-US')).toBe('9:7:3');
    expect(formatDateTime(d, 'h:m', 'en-US')).toBe('9:7');
  });

  it('formats the full day name (dddd)', () => {
    expect(formatDate(REF, 'dddd', 'en-US')).toBe('Thursday');
  });

  it('formats the AM dayPeriod and tolerates odd / lowercase tz strings', () => {
    expect(formatTime({ hours: 9, minutes: 0 }, 'hh:mm tt')).toBe('09:00 AM');
    expect(formatTime({ hours: 1, minutes: 0, timezone: 'xyz' }, 'HH:mmzzz')).toBe('01:00+00:00');
    expect(formatTime({ hours: 1, minutes: 0, timezone: 'z' }, 'HH:mmzz')).toBe('01:00+00');
  });
});

describe('parser numeric-field defaults and overflow rejection', () => {
  it('defaults the date to today for a time-only datetime', () => {
    const now = new Date();
    const d = parseDateTime('16:05', 'HH:mm')!;
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getHours()).toBe(16);
    expect(d.getDate()).toBe(now.getDate());
  });

  it('rejects an overflowing hour or minute', () => {
    expect(parseDateTime('2025-11-20 25:00', 'yyyy-MM-dd HH:mm')).toBeNull();
    expect(parseDateTime('2025-11-20 12:75', 'yyyy-MM-dd HH:mm')).toBeNull();
  });

  it('guards against non-string input', () => {
    expect(parseDate(null as unknown as string, 'yyyy-MM-dd')).toBeNull();
    expect(parseDateTime(undefined as unknown as string, 'yyyy-MM-dd')).toBeNull();
    expect(parseTime(null as unknown as string, 'HH:mm')).toBeNull();
  });
});

describe('parseTime / formatTime', () => {
  it('parses 24-hour time with the supplied format', () => {
    expect(parseTime('16:05:09', 'HH:mm:ss')).toEqual({
      hours: 16,
      minutes: 5,
      seconds: 9,
    });
  });

  it('parses 12-hour time with AM/PM', () => {
    expect(parseTime('02:05 PM', 'hh:mm tt')!.hours).toBe(14);
    expect(parseTime('12:00 AM', 'hh:mm tt')!.hours).toBe(0);
    expect(parseTime('12:00 PM', 'hh:mm tt')!.hours).toBe(12);
    expect(parseTime('11:59 PM', 'hh:mm tt')!.hours).toBe(23);
  });

  it('captures a timezone string without adjusting', () => {
    const t = parseTime('16:05:09+05:30', 'HH:mm:sszzz');
    expect(t!.hours).toBe(16);
    expect(t!.timezone).toBe('+05:30');
  });

  it('defaults missing hour/minute to 0 and keeps fractional ms', () => {
    expect(parseTime('05:45', 'mm:ss')).toEqual({ hours: 0, minutes: 5, seconds: 45 });
    expect(parseTime('14', 'HH')).toEqual({ hours: 14, minutes: 0 });
    expect(parseTime('16:05:09.123', 'HH:mm:ss.fff')!.milliseconds).toBe(123);
  });

  it('rejects out-of-range times', () => {
    expect(parseTime('25:00', 'HH:mm')).toBeNull();
    expect(parseTime('12:75', 'HH:mm')).toBeNull();
    expect(parseTime('12:30:75', 'HH:mm:ss')).toBeNull(); // seconds out of range
  });

  it('returns null when the format has no time tokens', () => {
    expect(parseTime('2025-11-20', 'yyyy-MM-dd')).toBeNull();
    expect(parseTime('nope', 'HH:mm')).toBeNull();
  });

  it('formats a TimeObject', () => {
    expect(formatTime({ hours: 14, minutes: 5 }, 'hh:mm tt')).toBe('02:05 PM');
    expect(formatTime({ hours: 0, minutes: 0 }, 'HH:mm')).toBe('00:00');
    expect(formatTime({ hours: 9, minutes: 7, seconds: 3 }, 'HH:mm:ss')).toBe('09:07:03');
  });
});

describe('splitDateTimeFormat', () => {
  it('splits a space-separated datetime', () => {
    expect(splitDateTimeFormat('yyyy-MM-dd HH:mm:ss')).toEqual({
      datePart: 'yyyy-MM-dd',
      timePart: 'HH:mm:ss',
      separator: ' ',
    });
  });

  it('splits a T-separated datetime', () => {
    expect(splitDateTimeFormat('dd-MM-yyyyTHH:mm:ss')).toEqual({
      datePart: 'dd-MM-yyyy',
      timePart: 'HH:mm:ss',
      separator: 'T',
    });
  });

  it('handles date-only formats', () => {
    expect(splitDateTimeFormat('yyyy-MM-dd')).toEqual({
      datePart: 'yyyy-MM-dd',
      timePart: '',
      separator: '',
    });
  });

  it('handles time-only formats', () => {
    expect(splitDateTimeFormat('HH:mm')).toEqual({
      datePart: '',
      timePart: 'HH:mm',
      separator: '',
    });
  });
});
