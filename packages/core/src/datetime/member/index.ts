// @arvo/core/datetime - Member index and lookups
//
// A platform-agnostic index over consumer-supplied member data. The engine
// NEVER reads platform fields such as IsCurrentBucketIndex; the consumer
// passes `currentMemberIndex` explicitly.

import type {
  Frequency,
  MemberIndex,
  MemberItem,
  NormalizedMember,
} from '../types';
import { daysInMonth } from '../format/fields';
import { parseMemberKey } from './parse-key';
import { frequencyFromDates } from './frequency';

export interface BuildMemberIndexOptions {
  frequency?: Frequency;             // override auto-detect
  currentMemberIndex?: number | null; // position in the sorted timeline
}

function dayCompare(a: Date, b: Date): number {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() - b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() - b.getMonth();
  return a.getDate() - b.getDate();
}

function compareDateTime(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

/** Inclusive bucket end for a member start, per frequency. */
function computeEndDate(keyDate: Date, frequency: Frequency): Date {
  const y = keyDate.getFullYear();
  const m = keyDate.getMonth();
  const d = keyDate.getDate();
  switch (frequency) {
    case 'day':
      return new Date(y, m, d);
    case 'week':
      return new Date(y, m, d + 6);
    case 'month':
      return new Date(y, m, daysInMonth(y, m));
    case 'quarter': {
      const endMonth = Math.floor(m / 3) * 3 + 2;
      return new Date(y, endMonth, daysInMonth(y, endMonth));
    }
    case 'year':
    default:
      return new Date(y, 11, 31);
  }
}

/** Re-exported for convenience (also exported from the barrel). */
export { parseMemberKey };

/**
 * Normalize, sort, and index a list of members. Frequency is auto-detected
 * unless supplied. `endDate` is derived per the frequency cadence.
 */
export function buildMemberIndex(
  members: MemberItem[],
  options?: BuildMemberIndexOptions,
): MemberIndex {
  const currentIndex = options?.currentMemberIndex ?? null;

  const parsed: Array<{ item: MemberItem; keyDate: Date; original: number }> = [];
  members.forEach((item, i) => {
    const keyDate = parseMemberKey(item.key);
    if (keyDate) parsed.push({ item, keyDate, original: i });
  });

  if (parsed.length === 0) {
    return {
      members: [],
      byKey: {},
      byIndex: {},
      count: 0,
      frequency: options?.frequency ?? 'day',
      minDate: new Date(NaN),
      maxDate: new Date(NaN),
      currentIndex,
    };
  }

  parsed.sort((a, b) => compareDateTime(a.keyDate, b.keyDate));

  const frequency =
    options?.frequency ?? frequencyFromDates(parsed.map((p) => p.keyDate));

  const normalized: NormalizedMember[] = parsed.map((p) => ({
    ...p.item,
    index: p.item.index ?? p.original,
    keyDate: p.keyDate,
    endDate: computeEndDate(p.keyDate, frequency),
  }));

  const byKey: Record<string, NormalizedMember> = {};
  const byIndex: Record<number, NormalizedMember> = {};
  for (const member of normalized) {
    byKey[member.key] = member;
    byIndex[member.index] = member;
  }

  return {
    members: normalized,
    byKey,
    byIndex,
    count: normalized.length,
    frequency,
    minDate: normalized[0].keyDate,
    maxDate: normalized[normalized.length - 1].endDate,
    currentIndex,
  };
}

/** Find the member whose bucket [keyDate, endDate] contains `date`. */
export function findMemberForDate(
  index: MemberIndex,
  date: Date,
): NormalizedMember | null {
  const { members } = index;
  let lo = 0;
  let hi = members.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dayCompare(members[mid].keyDate, date) <= 0) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) return null;
  const candidate = members[found];
  return dayCompare(date, candidate.endDate) <= 0 ? candidate : null;
}

/** Alias for `findMemberForDate`. */
export const findMemberByDate = findMemberForDate;

/** Look up a member by its numeric `index` field. */
export function findMemberByIndex(
  index: MemberIndex,
  i: number,
): NormalizedMember | null {
  return index.byIndex[i] ?? null;
}

/** Members whose start (`keyDate`) falls in the given calendar year. */
export function getMembersForYear(
  index: MemberIndex,
  year: number,
): NormalizedMember[] {
  return index.members.filter((m) => m.keyDate.getFullYear() === year);
}

/** Members whose start falls in the given calendar month (month is 0..11). */
export function getMembersForMonth(
  index: MemberIndex,
  year: number,
  month: number,
): NormalizedMember[] {
  return index.members.filter(
    (m) => m.keyDate.getFullYear() === year && m.keyDate.getMonth() === month,
  );
}

/** Members whose start falls in the decade beginning `decadeStart`. */
export function getMembersForDecade(
  index: MemberIndex,
  decadeStart: number,
): NormalizedMember[] {
  return index.members.filter((m) => {
    const y = m.keyDate.getFullYear();
    return y >= decadeStart && y <= decadeStart + 9;
  });
}

/** Members whose start falls inclusively within [start, end] (day-level). */
export function getMembersInRange(
  index: MemberIndex,
  start: Date,
  end: Date,
): NormalizedMember[] {
  return index.members.filter(
    (m) => dayCompare(m.keyDate, start) >= 0 && dayCompare(m.keyDate, end) <= 0,
  );
}

/** Alias for `getMembersInRange`. */
export const listMembersBetween = getMembersInRange;

/** The absolute date span covered by two members (start.start..end.end). */
export function getMemberRange(
  start: NormalizedMember,
  end: NormalizedMember,
): { start: Date; end: Date } {
  return { start: start.keyDate, end: end.endDate };
}

/** True when a member's bucket overlaps [min, max] (null bounds open). */
export function isMemberInRange(
  member: NormalizedMember,
  min: Date | null,
  max: Date | null,
): boolean {
  if (min && dayCompare(member.endDate, min) < 0) return false;
  if (max && dayCompare(member.keyDate, max) > 0) return false;
  return true;
}
