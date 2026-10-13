/**
 * Diagnostics helpers for the Arvo design system.
 *
 * `warnDeprecated()` emits a one-time `console.warn` per unique key during
 * non-production builds, advising consumers to migrate from a deprecated
 * Arvo component (or prop) to its successor. The warning is suppressed in
 * production builds and after the first call for a given key, so it cannot
 * spam the console of a typical Arvo-consuming app.
 *
 * Usage:
 *
 *   warnDeprecated({
 *     component: 'ArvoSidePanel',
 *     successor: 'ArvoPanel',
 *     reason: 'displayMode=\'overlay\'|\'docked\' + placement=\'left\'|\'right\'',
 *   });
 */

const _emitted = new Set<string>();

interface WarnDeprecatedOptions {
  /** Component name that is deprecated (e.g. 'ArvoSidePanel'). */
  component: string;
  /** Successor component name (e.g. 'ArvoPanel'). */
  successor: string;
  /** Optional one-line guidance about the prop/option that should be used. */
  reason?: string;
  /** Optional URL pointing to the migration guide. */
  migrationUrl?: string;
  /**
   * Unique key for the once-per-runtime de-dupe. Defaults to the component
   * name; pass a custom key when warning about a specific prop/option.
   */
  key?: string;
}

function isProduction(): boolean {
  try {
    return (
      typeof process !== 'undefined' &&
      typeof process.env !== 'undefined' &&
      process.env.NODE_ENV === 'production'
    );
  } catch {
    return false;
  }
}

export function warnDeprecated(options: WarnDeprecatedOptions): void {
  if (isProduction()) return;
  const key = options.key ?? options.component;
  if (_emitted.has(key)) return;
  _emitted.add(key);

  const parts: string[] = [];
  parts.push(`[Arvo] ${options.component} is deprecated and will be removed in the next major release.`);
  parts.push(`Use ${options.successor} instead.`);
  if (options.reason) {
    parts.push(options.reason);
  }
  if (options.migrationUrl) {
    parts.push(`See ${options.migrationUrl}.`);
  }
  console.warn(parts.join(' '));
}

/**
 * Test-only helper: clear the de-dupe set so unit tests can re-trigger the
 * warning. Not exported from the public package index; reach into the module
 * via `import { __resetWarnDeprecated } from '@arvo/core/diagnostics/warn-deprecated'`
 * in test files only.
 */
export function __resetWarnDeprecated(): void {
  _emitted.clear();
}
