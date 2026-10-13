// @arvo/core/datetime - Engine configuration
//
// App shells / Storybook call `configureDateTime` once to set defaults.
// Components still override per call (locale argument, weekStart prop, etc.).

import type { DateTimeConfig } from './types';

const DEFAULT_CONFIG: Required<Pick<DateTimeConfig, 'weekStart' | 'timezone'>> &
  DateTimeConfig = {
  weekStart: 0,
  timezone: 'local',
};

let current: DateTimeConfig = { ...DEFAULT_CONFIG };

/**
 * Merge the supplied partial config into the engine-level defaults.
 *
 * `timezone` accepts only `'local'` or `'utc'` in V1. IANA timezone strings
 * (e.g. `'America/Chicago'`) are a reserved future surface and throw a
 * `RangeError`.
 */
export function configureDateTime(config: Partial<DateTimeConfig>): void {
  if (
    config.timezone !== undefined &&
    config.timezone !== 'local' &&
    config.timezone !== 'utc'
  ) {
    throw new RangeError('Unsupported timezone');
  }
  current = { ...current, ...config };
}

/** Read the current engine config (a defensive copy). */
export function getDateTimeConfig(): DateTimeConfig {
  return { ...current };
}

/**
 * Restore the engine defaults. Primarily for test isolation and app teardown.
 * Not part of the picker-facing surface but safe to call.
 */
export function resetDateTimeConfig(): void {
  current = { ...DEFAULT_CONFIG };
}
