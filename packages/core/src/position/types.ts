export type Placement =
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end'
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'right-start'
  | 'right-center'
  | 'right-end'
  | 'left-start'
  | 'left-center'
  | 'left-end'
  | 'auto';

export type ResolvedPlacement = Exclude<Placement, 'auto'>;

/**
 * Placement-flip strategy when the requested side does not fit the boundary.
 *
 * - `'main-axis'` (default) -- only flip to the OPPOSITE side on the same
 *   axis (top<->bottom or left<->right). The cross-axis cascade is skipped
 *   so a `bottom-start` panel that cannot fit below never jumps to
 *   `right-start`; instead it stays on the bottom (or flips to top) and
 *   relies on `maxHeight` clamping + internal scroll to fit. This is the
 *   correct behavior for anchored panels (popovers, dropdowns, menus,
 *   option-lists, pickers) where moving to the perpendicular axis is
 *   visually surprising for the user.
 * - `'any'` -- the historical behavior. After OPPOSITE, also try ADJACENT
 *   sides (perpendicular axis) before falling back to the best-by-score
 *   candidate. Used by `ArvoTooltip` and `ArvoRichTooltip` where moving to
 *   an adjacent side is explicitly part of the documented contract.
 *
 * `placement: 'auto'` ignores this option and enumerates every side
 * regardless (it is opt-in to any-side selection by design).
 */
export type PlacementFlip = 'main-axis' | 'any';

export interface PositionOptions {
  placement?: Placement;
  gap?: number;
  margin?: number;
  boundary?: HTMLElement;
  width?: 'anchor' | number | string;
  flip?: PlacementFlip;
}

export interface PositionResult {
  x: number;
  y: number;
  placement: ResolvedPlacement;
  maxHeight: number | null;
  width: string | null;
}

export interface PositionWatcherOptions extends PositionOptions {
  observeContainerSelector?: string;
}

/**
 * Trigger source for a `PositionWatcher` reposition.
 *
 * - `'full'` -- anchor resize, container resize, page scroll, or window
 *   resize. The world around the float changed, so placement is allowed
 *   to legitimately re-resolve. `computePosition`'s placement decision is
 *   geometry-only (depends on anchor + boundary, never on the float's
 *   current rendered size), so the result is stable across iterations.
 *
 * - `'float-size'` -- the FLOAT itself resized (e.g. its content swapped
 *   while it was open, like an action menu filter shrinking the item
 *   list). Consumers that opt into placement-locking treat this source
 *   as "do not re-resolve placement" and pin to the previously-resolved
 *   side, eliminating filter-induced flicker.
 *
 * Watchers always emit a single callback shape; consumers that don't
 * care about the source simply ignore the second argument.
 */
export type PositionUpdateSource = 'full' | 'float-size';

export interface PositionWatcher {
  update: () => void;
  destroy: () => void;
}
