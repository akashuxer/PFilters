import {
  ArvoTooltipContainer,
  type ArvoTooltipContainerOptions,
} from './tooltip-container';

// ---------------------------------------------------------------------------
// $.fn.arvoTooltipContainer -- jQuery-only delegation adapter for the
// Arvo tooltip system. See ./tooltip-container.ts for rationale.
//
// This module ONLY installs the plugin. The JQuery type augmentation lives
// alongside the mainline component augmentations in `packages/js/src/plugin.ts`
// so `ArvoTooltipContainerOptions` is imported there directly and there is
// only one `declare global { interface JQuery { ... } }` block per package.
// ---------------------------------------------------------------------------

const DATA_KEY = 'arvoTooltipContainer';

/**
 * Installs `$.fn.arvoTooltipContainer` on the provided jQuery instance.
 * Called automatically by `registerArvoPlugins($)`; only invoke directly
 * if a consumer registers plugins manually (mirrors `setupOverlayPlugin`).
 *
 * ```ts
 * import $ from 'jquery';
 * import { setupTooltipContainerPlugin } from '@arvo/js/setup';
 * setupTooltipContainerPlugin($);
 *
 * $('#grid').arvoTooltipContainer({
 *   entries: [
 *     {
 *       filter: '.grid-cell',
 *       truncated: true,
 *       content: (cell) => cell.textContent ?? '',
 *     },
 *     {
 *       filter: '.grid-action-btn',
 *       placement: 'top-center',
 *       content: (btn) => btn.getAttribute('aria-label') ?? '',
 *     },
 *   ],
 * });
 * ```
 */
export function setupTooltipContainerPlugin($: JQueryStatic): void {
  ($.fn as unknown as Record<string, unknown>)[DATA_KEY] = function (
    this: JQuery,
    options?: ArvoTooltipContainerOptions,
  ): JQuery {
    return this.each(function (this: HTMLElement) {
      // Idempotent per-element: subsequent calls with new options should
      // route through the instance's `update()`, not re-init. This matches
      // the semantics of every other `$.fn.arvo*` plugin (see plugin.ts).
      const existing = $.data(this, DATA_KEY) as ArvoTooltipContainer | undefined;
      if (existing) {
        if (options) existing.update(options);
        return;
      }

      // Required-fields guard. Without `entries` (or with an empty array)
      // the adapter silently does nothing, so surface the mistake early.
      // `console.warn` (not `throw`) to match the tolerance level of
      // other Arvo plugins -- a misuse in one place should not tear down
      // the rest of the page's init.
      if (
        !options ||
        !Array.isArray(options.entries) ||
        options.entries.length === 0
      ) {
        console.warn(
          '[arvo] $.fn.arvoTooltipContainer requires a non-empty `entries` array; skipping.',
          this,
        );
        return;
      }

      $.data(
        this,
        DATA_KEY,
        ArvoTooltipContainer.initialize(this, options),
      );
    });
  };
}

// Re-export the option / entry / class types so consumers only need one
// import path (`@arvo/js/setup` or the `@arvo/js` barrel) regardless of
// whether they use the jQuery plugin or the underlying class.
export {
  ArvoTooltipContainer,
  type ArvoTooltipContainerOptions,
  type ArvoTooltipContainerEntry,
  type ArvoTooltipContainerContent,
  type ArvoTooltipContainerShortcut,
} from './tooltip-container';
