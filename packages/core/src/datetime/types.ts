// @arvo/core/datetime - Public types
//
// All public surfaces use native `Date` (local-time wall clock).

/** BCP 47 locale string, e.g. "en-US". */
export type Locale = string;

/**
 * Structured time value. Hours are ALWAYS 24-hour internally; 12-hour is a
 * presentation concern resolved by the formatter. `timezone` is captured by
 * the parser but never used to adjust a constructed `Date`.
 */
export interface TimeObject {
  hours: number;        // 0..23
  minutes: number;      // 0..59
  seconds?: number;     // 0..59
  milliseconds?: number;// 0..999
  timezone?: string;    // captured (e.g. "+05:30"); display-only
}

/** Token category produced by `tokenizeFormat`. */
export type TokenKind =
  | 'year' | 'month' | 'monthName' | 'day' | 'dayName'
  | 'hour24' | 'hour12' | 'minute' | 'second' | 'fraction'
  | 'ampm' | 'timezone' | 'literal';

/** A single token in a tokenized format string. */
export interface Token {
  kind: TokenKind;
  raw: string;          // exact characters from the format string
  length?: number;      // numeric padding length (2 for "MM", 4 for "yyyy")
  text?: string;        // literal text (literal tokens only)
}

/** Engine configuration set via `configureDateTime`. */
export interface DateTimeConfig {
  /** Default locale; resolved via a fallback cascade (see `getUserLocale`). */
  locale?: Locale;
  /** Display week start (0=Sunday). Affects display only, NOT week numbers. */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** 'local' (default) or 'utc'. IANA strings throw in V1; reserved. */
  timezone?: 'local' | 'utc';
}

/**
 * Platform-agnostic member contract. Consumers map their platform data into
 * this shape. The engine NEVER reads platform-specific fields such as
 * `IsCurrentBucketIndex`.
 */
export interface MemberItem {
  key: string;          // parseable as a date by parseMemberKey
  name: string;
  displayName: string;
  index?: number;
}

/** A member after normalization by `buildMemberIndex`. */
export interface NormalizedMember extends MemberItem {
  keyDate: Date;        // parsed bucket start
  endDate: Date;        // inclusive bucket end
  index: number;        // always populated
}

/** Detected or configured member cadence. */
export type Frequency = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** The output of `buildMemberIndex`. */
export interface MemberIndex {
  members: NormalizedMember[];               // sorted by keyDate
  byKey: Record<string, NormalizedMember>;
  byIndex: Record<number, NormalizedMember>;
  count: number;
  frequency: Frequency;
  minDate: Date;
  maxDate: Date;
  /** Resolved from `currentMemberIndex` option, NOT IsCurrentBucketIndex. */
  currentIndex: number | null;
}
