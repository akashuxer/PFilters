import { describe, it, expect } from 'vitest';
import type { MemberItem } from '../types';
import { buildMemberIndex } from '../member/index';
import {
  resolveCurrentMember,
  rollingRangeToMembers,
  validateRollingRange,
  formatRollingValue,
  formatRollingRange,
  rangeIncludedCount,
  rangeIncludedMessage,
  rollingIncludedCount,
  rollingIncludedMessage,
} from '../member/rolling';

const pad = (n: number) => String(n).padStart(2, '0');

function weeklyMembers(startMonday: Date, count: number): MemberItem[] {
  const out: MemberItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(
      startMonday.getFullYear(),
      startMonday.getMonth(),
      startMonday.getDate() + i * 7,
    );
    const key = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} 00:00:00`;
    out.push({ key, name: `w${i}`, displayName: `W${i}`, index: i });
  }
  return out;
}

function dailyMembers(start: Date, count: number): MemberItem[] {
  const out: MemberItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    out.push({ key, name: `d${i}`, displayName: `D${i}`, index: i });
  }
  return out;
}

// Mondays from 2026-01-05: idx8=Mar2, idx9=Mar9, idx10=Mar16, idx11=Mar23, idx12=Mar30.
const WEEKLY = weeklyMembers(new Date(2026, 0, 5), 20);

describe('resolveCurrentMember', () => {
  it('returns the configured current member', () => {
    const index = buildMemberIndex(WEEKLY, { currentMemberIndex: 10 });
    expect(resolveCurrentMember(index)!.keyDate.getDate()).toBe(16);
    expect(resolveCurrentMember(index)!.keyDate.getMonth()).toBe(2);
  });

  it('returns null when no current member is configured', () => {
    expect(resolveCurrentMember(buildMemberIndex(WEEKLY))).toBeNull();
  });
});

describe('rollingRangeToMembers', () => {
  const index = buildMemberIndex(WEEKLY, { currentMemberIndex: 10 });

  it('expands offsets around the current member', () => {
    const result = rollingRangeToMembers(index, { startOffset: -2, endOffset: 4 });
    expect(result.start!.index).toBe(8);
    expect(result.end!.index).toBe(14);
    expect(result.included).toHaveLength(7);
  });

  it('current-to-current is a single member', () => {
    const result = rollingRangeToMembers(index, { startOffset: 0, endOffset: 0 });
    expect(result.included).toHaveLength(1);
    expect(result.start!.index).toBe(10);
  });

  it('clamps included and nulls out-of-bounds endpoints', () => {
    const result = rollingRangeToMembers(index, { startOffset: -100, endOffset: 2 });
    expect(result.start).toBeNull();
    expect(result.end!.index).toBe(12);
    expect(result.included).toHaveLength(13); // members 0..12
  });

  it('returns empty when no current member', () => {
    const result = rollingRangeToMembers(buildMemberIndex(WEEKLY), {
      startOffset: 0,
      endOffset: 1,
    });
    expect(result).toEqual({ start: null, end: null, included: [] });
  });

  it('nulls the end endpoint when it overshoots the maximum', () => {
    const result = rollingRangeToMembers(index, { startOffset: 0, endOffset: 100 });
    expect(result.start!.index).toBe(10);
    expect(result.end).toBeNull();
    expect(result.included).toHaveLength(10); // members 10..19
  });

  it('yields no included members when start offset exceeds end offset', () => {
    const result = rollingRangeToMembers(index, { startOffset: 2, endOffset: -2 });
    expect(result.included).toHaveLength(0);
  });
});

describe('resolveCurrentMember out-of-bounds index', () => {
  it('returns null when currentIndex is beyond the member list', () => {
    const index = buildMemberIndex(WEEKLY, { currentMemberIndex: 999 });
    expect(resolveCurrentMember(index)).toBeNull();
  });
});

describe('validateRollingRange', () => {
  const index = buildMemberIndex(WEEKLY, { currentMemberIndex: 10 });

  it('accepts valid ranges', () => {
    expect(validateRollingRange(index, { startOffset: 0, endOffset: 0 })).toEqual({ ok: true });
    expect(validateRollingRange(index, { startOffset: -2, endOffset: 4 })).toEqual({ ok: true });
  });

  it('rejects start > end', () => {
    expect(validateRollingRange(index, { startOffset: 1, endOffset: -2 })).toEqual({
      ok: false,
      code: 'start_gt_end',
    });
  });

  it('rejects when no current member', () => {
    expect(
      validateRollingRange(buildMemberIndex(WEEKLY), { startOffset: 0, endOffset: 0 }),
    ).toEqual({ ok: false, code: 'no_current_member' });
  });

  it('rejects start below the index minimum', () => {
    expect(validateRollingRange(index, { startOffset: -20, endOffset: 0 })).toEqual({
      ok: false,
      code: 'start_below_min',
    });
  });

  it('rejects end above the index maximum', () => {
    expect(validateRollingRange(index, { startOffset: 0, endOffset: 20 })).toEqual({
      ok: false,
      code: 'end_above_max',
    });
  });
});

describe('rolling value formatting', () => {
  it('formats a single signed value', () => {
    expect(formatRollingValue(-2, 'CW')).toBe('CW -2');
    expect(formatRollingValue(4, 'CW')).toBe('CW +4');
    expect(formatRollingValue(0, 'CW')).toBe('CW 0');
  });

  it('formats a range', () => {
    expect(formatRollingRange({ startOffset: -2, endOffset: 4, prefix: 'CW' })).toBe(
      'CW -2 - CW +4',
    );
  });
});

describe('rangeIncludedCount - OQ-5 math', () => {
  const index = buildMemberIndex(WEEKLY, { frequency: 'week' });

  it('worked example: Mar 4-24 2026 weekly -> 3 weeks', () => {
    const count = rangeIncludedCount(index, new Date(2026, 2, 4), new Date(2026, 2, 24));
    expect(count).toBe(3);
  });

  it('excludes partial-edge members whose Start is outside the range', () => {
    // Mar 2 (Start before Mar 4) and Mar 30 (Start after Mar 24) are excluded.
    const members = rangeIncludedCount(index, new Date(2026, 2, 3), new Date(2026, 2, 29));
    expect(members).toBe(3);
  });
});

describe('rangeIncludedMessage', () => {
  const index = buildMemberIndex(WEEKLY, { frequency: 'week' });

  it('produces the plural copy', () => {
    expect(
      rangeIncludedMessage(index, new Date(2026, 2, 4), new Date(2026, 2, 24), undefined, 'en-US'),
    ).toBe('Range includes 3 weeks');
  });

  it('uses the singular form for exactly one', () => {
    expect(
      rangeIncludedMessage(index, new Date(2026, 2, 9), new Date(2026, 2, 9), undefined, 'en-US'),
    ).toBe('Range includes 1 week');
  });

  it('uses a custom frequencyLabel (and singularizes it)', () => {
    expect(
      rangeIncludedMessage(
        index,
        new Date(2026, 2, 4),
        new Date(2026, 2, 24),
        'fiscalPeriods',
        'en-US',
      ),
    ).toBe('Range includes 3 fiscalPeriods');
    expect(
      rangeIncludedMessage(
        index,
        new Date(2026, 2, 9),
        new Date(2026, 2, 9),
        'fiscalPeriods',
        'en-US',
      ),
    ).toBe('Range includes 1 fiscalPeriod');
  });

  it('applies locale-specific number grouping for large counts', () => {
    const daily = buildMemberIndex(dailyMembers(new Date(2020, 0, 1), 1234));
    const start = daily.members[0].keyDate;
    const end = daily.members[1233].keyDate;
    expect(rangeIncludedCount(daily, start, end)).toBe(1234);
    expect(rangeIncludedMessage(daily, start, end, undefined, 'en-US')).toBe(
      'Range includes 1,234 days',
    );
    expect(rangeIncludedMessage(daily, start, end, undefined, 'de-DE')).toBe(
      'Range includes 1.234 days',
    );
  });
});

describe('rollingIncludedCount / rollingIncludedMessage', () => {
  const index = buildMemberIndex(WEEKLY, { currentMemberIndex: 10, frequency: 'week' });

  it('counts members across the rolling span', () => {
    expect(rollingIncludedCount(index, { startOffset: -2, endOffset: 4 })).toBe(7);
    expect(rollingIncludedCount(index, { startOffset: 0, endOffset: 0 })).toBe(1);
  });

  it('produces the Figma inline-alert message with current-anchored offsets', () => {
    expect(
      rollingIncludedMessage(index, { startOffset: -2, endOffset: 4 }, undefined, 'en-US'),
    ).toBe('7 of 20 members included (Current \u2212 2 to Current +4)');
    expect(
      rollingIncludedMessage(index, { startOffset: 0, endOffset: 0 }, undefined, 'en-US'),
    ).toBe('1 of 20 members included (Current to Current)');
    expect(
      rollingIncludedMessage(index, { startOffset: 1, endOffset: 3 }, undefined, 'en-US'),
    ).toBe('3 of 20 members included (Current +1 to Current +3)');
  });

  it('applies locale-specific number grouping for large totals', () => {
    const daily = buildMemberIndex(dailyMembers(new Date(2020, 0, 1), 1234), {
      currentMemberIndex: 600,
      frequency: 'day',
    });
    expect(
      rollingIncludedMessage(daily, { startOffset: 0, endOffset: 9 }, undefined, 'en-US'),
    ).toBe('10 of 1,234 members included (Current to Current +9)');
    expect(
      rollingIncludedMessage(daily, { startOffset: 0, endOffset: 9 }, undefined, 'de-DE'),
    ).toBe('10 of 1.234 members included (Current to Current +9)');
  });
});
