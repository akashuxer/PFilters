// @arvo/core/datetime - Member frequency detection and navigation
//
// Frequency is auto-detected from consecutive day deltas, with `week` as the
// documented fallback when the cadence is ambiguous.

import type { Frequency, MemberIndex, MemberItem, NormalizedMember } from '../types';
import { parseMemberKey } from './parse-key';

const DAY_MS = 86400000;

/** Detect cadence from an already-parsed, sorted list of bucket-start dates. */
export function frequencyFromDates(dates: Date[]): Frequency {
  if (dates.length < 2) return 'week';

  const tally: Record<Frequency, number> = {
    day: 0,
    week: 0,
    month: 0,
    quarter: 0,
    year: 0,
  };

  for (let i = 1; i < dates.length; i += 1) {
    const delta = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / DAY_MS,
    );
    if (delta === 1) tally.day += 1;
    else if (delta >= 6 && delta <= 8) tally.week += 1;
    else if (delta >= 28 && delta <= 31) tally.month += 1;
    else if (delta >= 89 && delta <= 92) tally.quarter += 1;
    else if (delta >= 360 && delta <= 366) tally.year += 1;
  }

  let best: Frequency = 'week';
  let bestCount = 0;
  (Object.keys(tally) as Frequency[]).forEach((freq) => {
    if (tally[freq] > bestCount) {
      bestCount = tally[freq];
      best = freq;
    }
  });

  return bestCount === 0 ? 'week' : best;
}

/** Detect cadence from raw member items (parses each key). */
export function detectFrequency(members: MemberItem[]): Frequency {
  const dates: Date[] = [];
  for (const member of members) {
    const date = parseMemberKey(member.key);
    if (date) dates.push(date);
  }
  dates.sort((a, b) => a.getTime() - b.getTime());
  return frequencyFromDates(dates);
}

export interface FrequencyViewConfig {
  navigationUnit: 'month' | 'year' | 'decade';
  membersPerView: number | null; // null = "all"
}

/** Navigation unit and per-view member count for a given frequency. */
export function getFrequencyViewConfig(frequency: Frequency): FrequencyViewConfig {
  switch (frequency) {
    case 'day':
    case 'week':
      return { navigationUnit: 'month', membersPerView: null };
    case 'month':
      return { navigationUnit: 'year', membersPerView: 12 };
    case 'quarter':
      return { navigationUnit: 'year', membersPerView: 4 };
    case 'year':
    default:
      return { navigationUnit: 'decade', membersPerView: 10 };
  }
}

/** The member immediately before/after `member` in the sorted timeline. */
export function getAdjacentMember(
  index: MemberIndex,
  member: NormalizedMember,
  direction: 'prev' | 'next',
): NormalizedMember | null {
  const pos = index.members.findIndex((m) => m.key === member.key);
  if (pos === -1) return null;
  const target = direction === 'prev' ? pos - 1 : pos + 1;
  return index.members[target] ?? null;
}
