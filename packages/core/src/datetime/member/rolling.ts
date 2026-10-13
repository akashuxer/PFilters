// @arvo/core/datetime - Rolling time helpers
//
// Rolling values are signed integer offsets from the consumer-supplied
// `currentMemberIndex`. The prefix (CW / FY / ...) is a presentation concern.

import type { Frequency, Locale, MemberIndex, NormalizedMember } from '../types';
import { getUserLocale } from '../format/locale';
import { getMembersInRange } from './index';

export interface RollingRange {
  startOffset: number; // integer, may be negative
  endOffset: number;   // integer, must be >= startOffset
}

export type RollingPrefix = string; // e.g. "CW", "FY", "CY"

export type RollingRangeWithPrefix = RollingRange & { prefix: RollingPrefix };

export type RollingValidation =
  | { ok: true }
  | {
      ok: false;
      code: 'start_gt_end' | 'no_current_member' | 'start_below_min' | 'end_above_max';
    };

/** The resolved "current" member, or null when none is configured. */
export function resolveCurrentMember(index: MemberIndex): NormalizedMember | null {
  if (index.currentIndex === null) return null;
  return index.members[index.currentIndex] ?? null;
}

/**
 * Expand a rolling offset range against the current member. Clamps the
 * `included` slice to available bounds; `start`/`end` are null when their exact
 * offset falls outside the index (the consumer decides how to render).
 */
export function rollingRangeToMembers(
  index: MemberIndex,
  range: RollingRange,
): {
  start: NormalizedMember | null;
  end: NormalizedMember | null;
  included: NormalizedMember[];
} {
  const current = resolveCurrentMember(index);
  if (!current || index.currentIndex === null) {
    return { start: null, end: null, included: [] };
  }

  const base = index.currentIndex;
  const count = index.count;
  const startPos = base + range.startOffset;
  const endPos = base + range.endOffset;

  const start = startPos >= 0 && startPos < count ? index.members[startPos] : null;
  const end = endPos >= 0 && endPos < count ? index.members[endPos] : null;

  const lo = Math.max(0, startPos);
  const hi = Math.min(count - 1, endPos);
  const included =
    startPos <= endPos && lo <= hi ? index.members.slice(lo, hi + 1) : [];

  return { start, end, included };
}

/** Validate a rolling range against the index bounds. */
export function validateRollingRange(
  index: MemberIndex,
  range: RollingRange,
): RollingValidation {
  if (range.startOffset > range.endOffset) {
    return { ok: false, code: 'start_gt_end' };
  }
  if (index.currentIndex === null || !index.members[index.currentIndex]) {
    return { ok: false, code: 'no_current_member' };
  }
  const base = index.currentIndex;
  if (base + range.startOffset < 0) return { ok: false, code: 'start_below_min' };
  if (base + range.endOffset > index.count - 1) {
    return { ok: false, code: 'end_above_max' };
  }
  return { ok: true };
}

/** Format a single signed rolling value, e.g. (-2, "CW") -> "CW -2". */
export function formatRollingValue(value: number, prefix: RollingPrefix): string {
  const signed = value > 0 ? `+${value}` : `${value}`;
  return `${prefix} ${signed}`;
}

/** Format a rolling range, e.g. "CW -2 - CW +4". */
export function formatRollingRange(range: RollingRangeWithPrefix): string {
  return `${formatRollingValue(range.startOffset, range.prefix)} - ${formatRollingValue(
    range.endOffset,
    range.prefix,
  )}`;
}

// ---------------------------------------------------------------------------
// Range-count math + messaging
// ---------------------------------------------------------------------------

const FREQ_PLURAL: Record<Frequency, string> = {
  day: 'days',
  week: 'weeks',
  month: 'months',
  quarter: 'quarters',
  year: 'years',
};

function singularize(label: string): string {
  return label.endsWith('s') ? label.slice(0, -1) : label;
}

function pluralLabel(
  frequency: Frequency,
  count: number,
  frequencyLabel?: string,
): string {
  const plural = frequencyLabel ?? FREQ_PLURAL[frequency];
  return count === 1 ? singularize(plural) : plural;
}

function includedMessage(
  count: number,
  frequency: Frequency,
  frequencyLabel: string | undefined,
  locale: Locale | undefined,
): string {
  const resolved = getUserLocale(locale);
  const number = new Intl.NumberFormat(resolved).format(count);
  return `Range includes ${number} ${pluralLabel(frequency, count, frequencyLabel)}`;
}

/**
 * Count members whose `keyDate` (Start) falls inclusively within [start, end].
 * Partial-edge overlaps are excluded.
 */
export function rangeIncludedCount(
  index: MemberIndex,
  start: Date,
  end: Date,
): number {
  return getMembersInRange(index, start, end).length;
}

/** Localized "Range includes N <freq-plural>" for an absolute range. */
export function rangeIncludedMessage(
  index: MemberIndex,
  start: Date,
  end: Date,
  frequencyLabel?: string,
  locale?: Locale,
): string {
  return includedMessage(
    rangeIncludedCount(index, start, end),
    index.frequency,
    frequencyLabel,
    locale,
  );
}

/** Count members included by a rolling offset range. */
export function rollingIncludedCount(
  index: MemberIndex,
  range: RollingRange,
): number {
  return rollingRangeToMembers(index, range).included.length;
}

// Format a rolling endpoint relative to the current member, e.g.
//   0  -> "Current"
//   +N -> "Current +N"   (plus sign tight-joined to the number)
//   -N -> "Current \u2212 N" (true minus sign with a leading space)
function formatRollingAnchor(n: number): string {
  if (n === 0) return 'Current';
  if (n > 0) return `Current +${n}`;
  return `Current \u2212 ${Math.abs(n)}`;
}

/**
 * Localized members-included summary for a rolling range:
 *   "{N} of {total} members included ({startAnchor} to {endAnchor})"
 *
 * Examples:
 *   (0, 0)  -> "1 of 60 members included (Current to Current)"
 *   (-2,4)  -> "7 of 60 members included (Current \u2212 2 to Current +4)"
 *
 * The third positional `frequencyLabel` argument is preserved for backward
 * compatibility with the legacy "Range includes ..." copy. The new wording
 * is frequency-agnostic (always "members"), so the label is ignored here.
 */
export function rollingIncludedMessage(
  index: MemberIndex,
  range: RollingRange,
  frequencyLabel?: string,
  locale?: Locale,
): string {
  void frequencyLabel;
  const resolved = getUserLocale(locale);
  const fmt = new Intl.NumberFormat(resolved);
  const count = fmt.format(rollingIncludedCount(index, range));
  const total = fmt.format(index.count);
  const startAnchor = formatRollingAnchor(range.startOffset);
  const endAnchor = formatRollingAnchor(range.endOffset);
  return `${count} of ${total} members included (${startAnchor} to ${endAnchor})`;
}
