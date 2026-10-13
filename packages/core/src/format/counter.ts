// Counter value formatting shared by the Badge component (React + JS) so both
// platforms produce identical output. Pure, dependency-free, DOM-free.

export interface FormatBadgeCountOptions {
  /**
   * Compact "clean" values (4000 -> 4K, 2500000 -> 2.5M) and group "non-clean"
   * values (4234 -> 4,234). When false, the raw integer string is returned.
   */
  autoFormat?: boolean;
  /**
   * Single-mode overflow threshold. When the value exceeds it, the formatted
   * string is `${overflowCount}+`. Applied before compaction/grouping. Ignored
   * when `isRatioPart` is true (ratio counters never overflow).
   */
  overflowCount?: number;
  /**
   * Forward-compatibility flag for locale-aware grouping. Locale support is NOT
   * implemented yet, so this currently routes through the default (en-US)
   * grouping. Defaults to false.
   */
  localeAware?: boolean;
  /**
   * When true the value is one part of a ratio (current or total). Overflow
   * formatting is never applied to ratio parts.
   */
  isRatioPart?: boolean;
}

const DEFAULT_LOCALE = 'en-US';

/** Group thousands using the (currently fixed) default locale. */
function groupThousands(abs: number): string {
  return Math.trunc(abs).toLocaleString(DEFAULT_LOCALE);
}

/** Format a compacted unit value with at most one decimal, dropping `.0`. */
function compact(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Format a numeric counter value for display in an ArvoBadge.
 *
 * Rules:
 * - Overflow first: when `!isRatioPart` and `value > overflowCount`, returns
 *   `"{overflowCount}+"`.
 * - `autoFormat=false`: returns the raw integer string.
 * - `autoFormat=true`, clean value: compacts with K/M and at most one decimal
 *   (4000 -> "4K", 4500 -> "4.5K", 50000 -> "50K", 1000000 -> "1M",
 *   2500000 -> "2.5M"). A value is "clean" when it is a whole multiple of 100
 *   in the thousands range, or 100000 in the millions range.
 * - `autoFormat=true`, non-clean value: groups thousands (4234 -> "4,234").
 */
export function formatBadgeCount(
  value: number,
  options: FormatBadgeCountOptions = {},
): string {
  const { autoFormat = false, overflowCount, localeAware = false, isRatioPart = false } = options;

  // localeAware currently has no dedicated behavior; reference it so the
  // forward-compat flag is part of the contract without changing output.
  void localeAware;

  const safe = Number.isFinite(value) ? value : 0;

  if (
    !isRatioPart &&
    typeof overflowCount === 'number' &&
    Number.isFinite(overflowCount) &&
    safe > overflowCount
  ) {
    return `${overflowCount}+`;
  }

  if (!autoFormat) {
    return String(Math.trunc(safe));
  }

  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(safe));

  if (abs >= 1_000_000) {
    if (abs % 100_000 === 0) return `${sign}${compact(abs / 1_000_000)}M`;
    return `${sign}${groupThousands(abs)}`;
  }

  if (abs >= 1000) {
    if (abs % 100 === 0) return `${sign}${compact(abs / 1000)}K`;
    return `${sign}${groupThousands(abs)}`;
  }

  return `${sign}${abs}`;
}
