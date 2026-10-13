import type { PositionResult, ResolvedPlacement } from './types';

/**
 * Resolve a `ResolvedPlacement` (e.g. `bottom-start`) to its primary side.
 * Used to write a `data-arvo-side` attribute on the positioned surface so
 * SCSS can apply direction-aware enter/exit animations (popup slides DOWN
 * from above when opening below the trigger, etc.).
 */
export function resolvePositionSide(
  placement: ResolvedPlacement,
): 'top' | 'bottom' | 'left' | 'right' {
  if (placement.startsWith('top')) return 'top';
  if (placement.startsWith('left')) return 'left';
  if (placement.startsWith('right')) return 'right';
  return 'bottom';
}

/**
 * Apply a `PositionResult` to a floating surface element. Uses the
 * standalone `translate` CSS property (NOT `transform: translate(...)`)
 * so per-component SCSS can animate `transform` independently of the
 * engine's positioning writes. Also writes `data-arvo-side` for
 * direction-aware enter/exit animations.
 *
 * Consumers that need additional side effects (e.g. clearing
 * `visibility: hidden` after the first measurement) can wrap this
 * helper inside their own `apply` callback.
 *
 * @param result Position result emitted by `computePosition`.
 * @param surface The floating element to position.
 * @param options Optional knobs.
 *   - `round`: round x/y to integers before writing (default `false`).
 *     Matches tooltip behavior, which rounds to integers to avoid
 *     sub-pixel blur on the small surface.
 *   - `maxHeightVar`: CSS custom property name to write `result.maxHeight`
 *     to (default `--arvo-overlay-max-height`). Pass a per-component name
 *     when the consumer wants its own variable (e.g. Popover uses
 *     `--arvo-popover-max-height`).
 *   - `widthVar`: CSS custom property name to write `result.width` to
 *     (default `--arvo-overlay-width`).
 */
export interface ApplyPositionOptions {
  round?: boolean;
  maxHeightVar?: string;
  widthVar?: string;
}

export function applyPositionToSurface(
  result: PositionResult,
  surface: HTMLElement,
  options: ApplyPositionOptions = {},
): void {
  const {
    round = false,
    maxHeightVar = '--arvo-overlay-max-height',
    widthVar = '--arvo-overlay-width',
  } = options;
  const x = round ? Math.round(result.x) : result.x;
  const y = round ? Math.round(result.y) : result.y;
  surface.style.translate = `${x}px ${y}px`;
  surface.setAttribute('data-arvo-side', resolvePositionSide(result.placement));
  if (result.maxHeight != null) {
    surface.style.setProperty(maxHeightVar, `${result.maxHeight}px`);
  }
  if (result.width != null) {
    surface.style.setProperty(widthVar, result.width);
  }
}
