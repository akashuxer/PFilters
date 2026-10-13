/**
 * Vitest setup for the @arvo/js package.
 *
 * Enables the Arvo tooltip pipeline globally for tests so picker / overlay
 * component tests exercise the real tooltip wiring (aria-describedby, overlay
 * hub registration, show/hide timers). The shared `tooltipManager` ships with
 * `enabled: false` so production consumers explicitly opt in.
 *
 * Hover/hide delays are zeroed so tests do not need fake timers just to
 * assert tooltip visibility.
 */
import { tooltipManager } from '@arvo/core';

tooltipManager.configure({
  enabled: true,
  hoverDelay: 0,
  hideDelay: 0,
});