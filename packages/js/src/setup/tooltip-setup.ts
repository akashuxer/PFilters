import {
  tooltipManager,
  type TooltipManagerConfig,
} from '@arvo/core';

/**
 * Configures global tooltip behavior for the application.
 * Call once at startup alongside `setupOverlayPlugin`.
 *
 * ```ts
 * import { setupTooltips } from '@arvo/js';
 * setupTooltips({ hoverDelay: 500, gap: 4 });
 * ```
 */
export function setupTooltips(config: Partial<TooltipManagerConfig>): void {
  tooltipManager.configure(config);
}
