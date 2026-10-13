import { describe, it, expect } from 'vitest';
import type { MemberItem } from '../types';
import {
  parseMemberKey,
  buildMemberIndex,
  findMemberForDate,
  findMemberByDate,
  findMemberByIndex,
  getMembersForYear,
  getMembersForMonth,
  getMembersForDecade,
  getMembersInRange,
  listMembersBetween,
  getMemberRange,
  isMemberInRange,
} from '../member/index';
import {
  detectFrequency,
  getFrequencyViewConfig,
  getAdjacentMember,
} from '../member/frequency';

const pad = (n: number) => String(n).padStart(2, '0');

function makeMembers(
  start: Date,
  count: number,
  stepDays: number,
  label: (i: number) => string,
): MemberItem[] {
  const out: MemberItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * stepDays);
    const key = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} 00:00:00`;
    out.push({ key, name: label(i), displayName: label(i), index: i });
  }
  return out;
}

describe('parseMemberKey', () => {
  it('parses the platform "yyyy/MM/dd HH:mm:ss" shape', () => {
    const d = parseMemberKey('2015/01/04 00:00:00');
    expect(d!.getFullYear()).toBe(2015);
    expect(d!.getMonth()).toBe(0);
    expect(d!.getDate()).toBe(4);
  });

  it('parses ISO and year-first variants', () => {
    expect(parseMemberKey('2026-03-09T00:00:00')!.getDate()).toBe(9);
    expect(parseMemberKey('2026-03-09')!.getMonth()).toBe(2);
  });

  it('returns null for unparseable keys', () => {
    expect(parseMemberKey('')).toBeNull();
    expect(parseMemberKey('nonsense')).toBeNull();
  });
});

describe('buildMemberIndex', () => {
  const weekly = makeMembers(new Date(2026, 0, 5), 8, 7, (i) => `W${pad(i + 2)}`);

  it('sorts, indexes, and detects weekly frequency', () => {
    const index = buildMemberIndex(weekly);
    expect(index.count).toBe(8);
    expect(index.frequency).toBe('week');
    expect(index.members[0].keyDate.getTime()).toBeLessThan(
      index.members[1].keyDate.getTime(),
    );
  });

  it('computes weekly endDate as keyDate + 6 days', () => {
    const index = buildMemberIndex(weekly);
    const m = index.members[0];
    expect(m.endDate.getDate()).toBe(m.keyDate.getDate() + 6);
  });

  it('builds byKey and byIndex maps', () => {
    const index = buildMemberIndex(weekly);
    expect(index.byKey[weekly[0].key]).toBeDefined();
    expect(index.byIndex[0]).toBeDefined();
    expect(findMemberByIndex(index, 3)).toBe(index.byIndex[3]);
  });

  it('exposes min/max dates spanning the buckets', () => {
    const index = buildMemberIndex(weekly);
    expect(index.minDate.getTime()).toBe(index.members[0].keyDate.getTime());
    expect(index.maxDate.getTime()).toBe(index.members[7].endDate.getTime());
  });

  it('stores currentIndex from options (never IsCurrentBucketIndex)', () => {
    const index = buildMemberIndex(weekly, { currentMemberIndex: 3 });
    expect(index.currentIndex).toBe(3);
    expect(buildMemberIndex(weekly).currentIndex).toBeNull();
  });

  it('honors an explicit frequency override', () => {
    const index = buildMemberIndex(weekly, { frequency: 'day' });
    expect(index.frequency).toBe('day');
    expect(index.members[0].endDate.getDate()).toBe(index.members[0].keyDate.getDate());
  });

  it('handles empty input', () => {
    const index = buildMemberIndex([]);
    expect(index.count).toBe(0);
    expect(index.members).toEqual([]);
    expect(findMemberForDate(index, new Date())).toBeNull();
  });

  it('computes month / quarter / year endDates', () => {
    const monthly = [
      { key: '2025/01/01 00:00:00', name: 'M01', displayName: 'M01', index: 0 },
      { key: '2025/02/01 00:00:00', name: 'M02', displayName: 'M02', index: 1 },
    ];
    const mi = buildMemberIndex(monthly, { frequency: 'month' });
    expect(mi.members[0].endDate.getDate()).toBe(31); // Jan
    expect(mi.members[1].endDate.getDate()).toBe(28); // Feb 2025

    const qi = buildMemberIndex(monthly, { frequency: 'quarter' });
    expect(qi.members[0].endDate.getMonth()).toBe(2); // Q1 ends in March
    expect(qi.members[0].endDate.getDate()).toBe(31);

    const yi = buildMemberIndex(monthly, { frequency: 'year' });
    expect(yi.members[0].endDate.getMonth()).toBe(11);
    expect(yi.members[0].endDate.getDate()).toBe(31);
  });
});

describe('detectFrequency', () => {
  it('detects each cadence from consecutive deltas', () => {
    expect(detectFrequency(makeMembers(new Date(2025, 0, 1), 6, 1, () => 'd'))).toBe('day');
    expect(detectFrequency(makeMembers(new Date(2025, 0, 6), 6, 7, () => 'w'))).toBe('week');
    expect(
      detectFrequency([
        { key: '2025/01/01 00:00:00', name: 'a', displayName: 'a' },
        { key: '2025/02/01 00:00:00', name: 'b', displayName: 'b' },
        { key: '2025/03/01 00:00:00', name: 'c', displayName: 'c' },
      ]),
    ).toBe('month');
    expect(
      detectFrequency([
        { key: '2025/01/01 00:00:00', name: 'a', displayName: 'a' },
        { key: '2025/04/01 00:00:00', name: 'b', displayName: 'b' },
        { key: '2025/07/01 00:00:00', name: 'c', displayName: 'c' },
      ]),
    ).toBe('quarter');
    expect(
      detectFrequency([
        { key: '2023/01/01 00:00:00', name: 'a', displayName: 'a' },
        { key: '2024/01/01 00:00:00', name: 'b', displayName: 'b' },
        { key: '2025/01/01 00:00:00', name: 'c', displayName: 'c' },
      ]),
    ).toBe('year');
  });

  it('falls back to week when ambiguous or sparse', () => {
    expect(detectFrequency([{ key: '2025/01/01 00:00:00', name: 'a', displayName: 'a' }])).toBe(
      'week',
    );
  });
});

describe('lookups', () => {
  const weekly = makeMembers(new Date(2026, 0, 5), 8, 7, (i) => `W${pad(i + 2)}`);
  const index = buildMemberIndex(weekly);

  it('findMemberForDate locates the containing bucket (binary search)', () => {
    const m = findMemberForDate(index, new Date(2026, 0, 7)); // within first week
    expect(m).not.toBeNull();
    expect(m!.keyDate.getDate()).toBe(5);
    expect(findMemberByDate).toBe(findMemberForDate);
  });

  it('findMemberForDate returns null outside all buckets', () => {
    expect(findMemberForDate(index, new Date(2025, 0, 1))).toBeNull();
    expect(findMemberForDate(index, new Date(2030, 0, 1))).toBeNull();
  });

  it('findMemberForDate returns null inside a gap', () => {
    const gapped = buildMemberIndex(
      [
        { key: '2026/03/02 00:00:00', name: 'a', displayName: 'W10', index: 0 },
        { key: '2026/03/16 00:00:00', name: 'b', displayName: 'W12', index: 1 },
      ],
      { frequency: 'week' },
    );
    expect(findMemberForDate(gapped, new Date(2026, 2, 10))).toBeNull();
  });

  it('getMembersForYear / Month / Decade', () => {
    expect(getMembersForYear(index, 2026).length).toBeGreaterThan(0);
    expect(getMembersForYear(index, 1999)).toHaveLength(0);
    expect(getMembersForMonth(index, 2026, 0).length).toBeGreaterThan(0);
    expect(getMembersForDecade(index, 2020).length).toBe(8);
    expect(getMembersForDecade(index, 2030)).toHaveLength(0);
  });

  it('getMembersInRange / listMembersBetween', () => {
    const result = getMembersInRange(index, new Date(2026, 0, 5), new Date(2026, 0, 19));
    expect(result).toHaveLength(3);
    expect(listMembersBetween).toBe(getMembersInRange);
  });

  it('getMemberRange spans start.start to end.end', () => {
    const r = getMemberRange(index.members[0], index.members[2]);
    expect(r.start.getTime()).toBe(index.members[0].keyDate.getTime());
    expect(r.end.getTime()).toBe(index.members[2].endDate.getTime());
  });

  it('isMemberInRange checks bucket overlap', () => {
    const m = index.members[2];
    expect(isMemberInRange(m, null, null)).toBe(true);
    expect(isMemberInRange(m, m.keyDate, m.endDate)).toBe(true);
    expect(isMemberInRange(m, new Date(2030, 0, 1), null)).toBe(false);
    expect(isMemberInRange(m, null, new Date(2020, 0, 1))).toBe(false);
  });

  it('getAdjacentMember walks prev/next', () => {
    const m = index.members[3];
    expect(getAdjacentMember(index, m, 'prev')!.index).toBe(2);
    expect(getAdjacentMember(index, m, 'next')!.index).toBe(4);
    expect(getAdjacentMember(index, index.members[0], 'prev')).toBeNull();
    expect(getAdjacentMember(index, index.members[7], 'next')).toBeNull();
  });
});

describe('getFrequencyViewConfig', () => {
  it('maps frequency to navigation unit and per-view count', () => {
    expect(getFrequencyViewConfig('day')).toEqual({
      navigationUnit: 'month',
      membersPerView: null,
    });
    expect(getFrequencyViewConfig('week')).toEqual({
      navigationUnit: 'month',
      membersPerView: null,
    });
    expect(getFrequencyViewConfig('month')).toEqual({
      navigationUnit: 'year',
      membersPerView: 12,
    });
    expect(getFrequencyViewConfig('quarter')).toEqual({
      navigationUnit: 'year',
      membersPerView: 4,
    });
    expect(getFrequencyViewConfig('year')).toEqual({
      navigationUnit: 'decade',
      membersPerView: 10,
    });
  });
});
