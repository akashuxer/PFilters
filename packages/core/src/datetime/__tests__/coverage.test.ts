// Targeted tests for remaining branches across the engine modules.
import { describe, it, expect, afterEach } from 'vitest';
import * as datetime from '../index';
import { configureDateTime, resetDateTimeConfig } from '../config';
import { tokenizeFormat } from '../format/tokenize';
import { formatTime } from '../format/format';
import { parseDate } from '../format/parse';
import { getWeekNumber } from '../calendar/week-number';
import { getMonthMatrix } from '../calendar/month-matrix';
import { isBeforeDay, isAfterDay } from '../calendar/compare';
import { buildMemberIndex, parseMemberKey, findMemberByIndex } from '../member/index';
import { getAdjacentMember, detectFrequency } from '../member/frequency';
import { rangeIncludedMessage } from '../member/rolling';
import { getSegmentBounds } from '../segment/bounds';

afterEach(() => resetDateTimeConfig());

describe('public barrel', () => {
  it('re-exports the engine surface from datetime/index', () => {
    const expected = [
      'tokenizeFormat',
      'parseDate',
      'formatDate',
      'parseTime',
      'formatTime',
      'parseDateTime',
      'formatDateTime',
      'splitDateTimeFormat',
      'getUserLocale',
      'shouldUse12Hour',
      'getMonthMatrix',
      'getWeekNumber',
      'buildMemberIndex',
      'findMemberForDate',
      'rollingRangeToMembers',
      'rangeIncludedMessage',
      'createSegmentController',
      'configureDateTime',
    ] as const;
    for (const name of expected) {
      expect(typeof (datetime as Record<string, unknown>)[name]).toBe('function');
    }
  });
});

describe('config', () => {
  it('throws for unsupported (IANA) timezones', () => {
    expect(() => configureDateTime({ timezone: 'America/Chicago' as never })).toThrow(RangeError);
  });

  it('accepts local and utc', () => {
    expect(() => configureDateTime({ timezone: 'utc' })).not.toThrow();
    expect(() => configureDateTime({ timezone: 'local' })).not.toThrow();
  });
});

describe('tokenizer cache eviction', () => {
  it('evicts old entries beyond the cache limit without error', () => {
    for (let i = 0; i < 80; i += 1) {
      tokenizeFormat(`yyyy${'-'.repeat(i + 1)}MM`);
    }
    expect(tokenizeFormat('yyyy-MM-dd').map((t) => t.kind)).toEqual([
      'year',
      'literal',
      'month',
      'literal',
      'day',
    ]);
  });
});

describe('week-number leap-year and Sunday branches', () => {
  it('handles a Sunday date (isoDay 7)', () => {
    expect(getWeekNumber(new Date(2023, 0, 1))).toBe(52); // Sun -> W52 of 2022
  });

  it('exercises leap-year branches (div-4, div-400, div-100-not-400)', () => {
    for (const date of [
      new Date(2024, 5, 15), // 2024 leap (div 4)
      new Date(2000, 5, 15), // 2000 leap (div 400)
      new Date(1900, 5, 15), // 1900 not leap (div 100, not 400)
      new Date(2025, 5, 15), // 2025 not leap
    ]) {
      const week = getWeekNumber(date);
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    }
    expect(getWeekNumber(new Date(2024, 5, 15))).toBe(24);
  });
});

describe('compare cross-month / cross-year branches', () => {
  it('compares across month and year boundaries', () => {
    expect(isBeforeDay(new Date(2025, 0, 31), new Date(2025, 1, 1))).toBe(true); // month
    expect(isBeforeDay(new Date(2025, 11, 31), new Date(2026, 0, 1))).toBe(true); // year
    expect(isAfterDay(new Date(2026, 0, 1), new Date(2025, 11, 31))).toBe(true); // year
  });
});

describe('fields - small year construction', () => {
  it('constructs years < 100 without the 1900 offset bug (local)', () => {
    expect(parseDate('0050-06-15', 'yyyy-MM-dd')!.getFullYear()).toBe(50);
  });

  it('constructs small years under the utc config', () => {
    configureDateTime({ timezone: 'utc' });
    expect(parseDate('0050-06-15', 'yyyy-MM-dd')!.getUTCFullYear()).toBe(50);
  });
});

describe('frequency detection fallbacks', () => {
  it('falls back to week for irregular gaps and empty input', () => {
    expect(
      detectFrequency([
        { key: '2025/01/01 00:00:00', name: 'a', displayName: 'a' },
        { key: '2025/02/15 00:00:00', name: 'b', displayName: 'b' }, // 45-day gap
      ]),
    ).toBe('week');
  });

  it('defaults the frequency to day for an empty index with no options', () => {
    expect(buildMemberIndex([]).frequency).toBe('day');
  });
});

describe('member edge cases', () => {
  it('builds an empty index with options applied', () => {
    const index = buildMemberIndex([], { frequency: 'month', currentMemberIndex: 2 });
    expect(index.count).toBe(0);
    expect(index.frequency).toBe('month');
    expect(index.currentIndex).toBe(2);
  });

  it('findMemberByIndex returns null for an unknown index', () => {
    const index = buildMemberIndex([
      { key: '2025/01/01 00:00:00', name: 'a', displayName: 'A', index: 0 },
    ]);
    expect(findMemberByIndex(index, 999)).toBeNull();
  });

  it('assigns the array position when a member omits its index', () => {
    const index = buildMemberIndex([
      { key: '2025/01/06 00:00:00', name: 'a', displayName: 'A' },
      { key: '2025/01/13 00:00:00', name: 'b', displayName: 'B' },
    ]);
    expect(index.members[0].index).toBe(0);
    expect(index.members[1].index).toBe(1);
  });

  it('parseMemberKey uses the native Date fallback', () => {
    const d = parseMemberKey('January 4, 2015');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2015);
  });

  it('getAdjacentMember returns null for a member not in the index', () => {
    const a = buildMemberIndex([
      { key: '2025/01/01 00:00:00', name: 'a', displayName: 'A', index: 0 },
    ]);
    const other = buildMemberIndex([
      { key: '2030/06/01 00:00:00', name: 'x', displayName: 'X', index: 0 },
    ]);
    expect(getAdjacentMember(a, other.members[0], 'next')).toBeNull();
  });
});

describe('rolling singularization of a label without trailing s', () => {
  it('leaves a non-plural custom label unchanged for count 1', () => {
    const index = buildMemberIndex(
      [
        { key: '2026/03/09 00:00:00', name: 'a', displayName: 'A', index: 0 },
        { key: '2026/03/16 00:00:00', name: 'b', displayName: 'B', index: 1 },
      ],
      { frequency: 'week' },
    );
    const msg = rangeIncludedMessage(
      index,
      new Date(2026, 2, 9),
      new Date(2026, 2, 9),
      'period',
      'en-US',
    );
    expect(msg).toBe('Range includes 1 period');
  });
});

describe('segment bounds year default', () => {
  it('defaults the year to a leap year when only month is supplied', () => {
    expect(getSegmentBounds('day', { month: 1 })).toEqual({ min: 1, max: 29 });
  });
});

describe('formatTime under utc config', () => {
  it('formats time fields via the UTC constructor branch', () => {
    configureDateTime({ timezone: 'utc' });
    expect(formatTime({ hours: 16, minutes: 5 }, 'HH:mm')).toBe('16:05');
  });
});

describe('month matrix weekStart fallback', () => {
  it('falls back to weekStart 0 when neither options nor config define it', () => {
    configureDateTime({ weekStart: undefined });
    const matrix = getMonthMatrix(2025, 0); // no options
    expect(matrix.weekStart).toBe(0);
    expect(matrix.weeks[0].days[0].date.getDay()).toBe(0);
  });
});
