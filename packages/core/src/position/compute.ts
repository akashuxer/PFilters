import type {
  PlacementFlip,
  ResolvedPlacement,
  PositionOptions,
  PositionResult,
} from './types';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'center' | 'end';

const AUTO_ORDER: ResolvedPlacement[] = [
  'bottom-start',
  'bottom-center',
  'top-start',
  'top-center',
  'right-start',
  'right-center',
  'left-start',
  'left-center',
  'bottom-end',
  'top-end',
  'right-end',
  'left-end',
];

const OPPOSITE: Record<ResolvedPlacement, ResolvedPlacement> = {
  'bottom-start': 'top-start',
  'bottom-center': 'top-center',
  'bottom-end': 'top-end',
  'top-start': 'bottom-start',
  'top-center': 'bottom-center',
  'top-end': 'bottom-end',
  'right-start': 'left-start',
  'right-center': 'left-center',
  'right-end': 'left-end',
  'left-start': 'right-start',
  'left-center': 'right-center',
  'left-end': 'right-end',
};

// Adjacent sides that share an axis perpendicular to the requested side.
// Used as a flip cascade when neither the requested nor its opposite fit
// (e.g. a bottom tooltip that can't flip to top tries right then left).
const ADJACENT: Record<ResolvedPlacement, ResolvedPlacement[]> = {
  'bottom-start': ['right-start', 'left-start'],
  'bottom-center': ['right-center', 'left-center'],
  'bottom-end': ['right-end', 'left-end'],
  'top-start': ['right-start', 'left-start'],
  'top-center': ['right-center', 'left-center'],
  'top-end': ['right-end', 'left-end'],
  'right-start': ['bottom-start', 'top-start'],
  'right-center': ['bottom-center', 'top-center'],
  'right-end': ['bottom-end', 'top-end'],
  'left-start': ['bottom-start', 'top-start'],
  'left-center': ['bottom-center', 'top-center'],
  'left-end': ['bottom-end', 'top-end'],
};

// Minimum useful panel height. Used as a floor for `maxHeight` so the panel
// is always at least readable even when the boundary is severely
// constrained (extreme zoom, tiny viewport).
const MIN_PANEL_HEIGHT = 50;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function isVirtualAnchor(
  anchor: HTMLElement | { x: number; y: number },
): anchor is { x: number; y: number } {
  return typeof (anchor as HTMLElement).getBoundingClientRect !== 'function';
}

function getAnchorRect(anchor: HTMLElement | { x: number; y: number }): Rect {
  if (isVirtualAnchor(anchor)) {
    return { x: anchor.x, y: anchor.y, width: 0, height: 0 };
  }
  const r = anchor.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function getBoundaryRect(boundary?: HTMLElement): Rect {
  if (boundary) {
    const r = boundary.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }
  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
}

function getSide(p: ResolvedPlacement): Side {
  return p.split('-')[0] as Side;
}

function getAlign(p: ResolvedPlacement): Align {
  return p.split('-')[1] as Align;
}

// ---------------------------------------------------------------------------
// Space helpers (geometry-only -- never depend on the float's rendered size,
// so placement decisions are stable across re-position iterations even when
// applying `maxHeight` triggers a `ResizeObserver` callback).
// ---------------------------------------------------------------------------

interface PrimarySpace {
  bottom: number;
  top: number;
  right: number;
  left: number;
}

function primarySpaceMap(
  a: Rect,
  b: Rect,
  margin: number,
  gap: number,
): PrimarySpace {
  return {
    bottom: Math.max(0, b.y + b.height - margin - (a.y + a.height) - gap),
    top: Math.max(0, a.y - b.y - margin - gap),
    right: Math.max(0, b.x + b.width - margin - (a.x + a.width) - gap),
    left: Math.max(0, a.x - b.x - margin - gap),
  };
}

// Vertical room available for a left/right placement, given the anchor's
// alignment edge stays pinned. For top/bottom placements the alignment is
// horizontal, so vertical room is the full primary space.
function alignmentVerticalRoom(
  p: ResolvedPlacement,
  a: Rect,
  b: Rect,
  margin: number,
): number {
  const side = getSide(p);
  if (side === 'top' || side === 'bottom') {
    // Vertical room for top/bottom is the same as primary space; alignment
    // here means horizontal. Return the full boundary height as a
    // non-binding cap (primary space already enforced by the caller).
    return Math.max(0, b.height - 2 * margin);
  }

  const align = getAlign(p);
  if (align === 'start') {
    // Panel top pinned at anchor.top -- room = anchor.top to boundary.bottom.
    return Math.max(0, b.y + b.height - margin - a.y);
  }
  if (align === 'end') {
    // Panel bottom pinned at anchor.bottom -- room = boundary.top to anchor.bottom.
    return Math.max(0, a.y + a.height - b.y - margin);
  }
  // 'center': panel center pinned at anchor's vertical center. Symmetric room.
  const center = a.y + a.height / 2;
  const above = Math.max(0, center - b.y - margin);
  const below = Math.max(0, b.y + b.height - margin - center);
  return Math.max(0, 2 * Math.min(above, below));
}

// Horizontal room available for a top/bottom placement, given the anchor's
// alignment edge stays pinned. Mirror of alignmentVerticalRoom for the
// horizontal axis, used for natural-fit checks.
function alignmentHorizontalRoom(
  p: ResolvedPlacement,
  a: Rect,
  b: Rect,
  margin: number,
): number {
  const side = getSide(p);
  if (side === 'left' || side === 'right') {
    return Math.max(0, b.width - 2 * margin);
  }
  const align = getAlign(p);
  if (align === 'start') {
    return Math.max(0, b.x + b.width - margin - a.x);
  }
  if (align === 'end') {
    return Math.max(0, a.x + a.width - b.x - margin);
  }
  const center = a.x + a.width / 2;
  const left = Math.max(0, center - b.x - margin);
  const right = Math.max(0, b.x + b.width - margin - center);
  return Math.max(0, 2 * Math.min(left, right));
}

// ---------------------------------------------------------------------------
// Position math
// ---------------------------------------------------------------------------

function rawPosition(
  a: Rect,
  fw: number,
  fh: number,
  p: ResolvedPlacement,
  gap: number,
): { x: number; y: number } {
  switch (p) {
    case 'bottom-start':
      return { x: a.x, y: a.y + a.height + gap };
    case 'bottom-center':
      return { x: a.x + a.width / 2 - fw / 2, y: a.y + a.height + gap };
    case 'bottom-end':
      return { x: a.x + a.width - fw, y: a.y + a.height + gap };
    case 'top-start':
      return { x: a.x, y: a.y - fh - gap };
    case 'top-center':
      return { x: a.x + a.width / 2 - fw / 2, y: a.y - fh - gap };
    case 'top-end':
      return { x: a.x + a.width - fw, y: a.y - fh - gap };
    case 'right-start':
      return { x: a.x + a.width + gap, y: a.y };
    case 'right-center':
      return { x: a.x + a.width + gap, y: a.y + a.height / 2 - fh / 2 };
    case 'right-end':
      return { x: a.x + a.width + gap, y: a.y + a.height - fh };
    case 'left-start':
      return { x: a.x - fw - gap, y: a.y };
    case 'left-center':
      return { x: a.x - fw - gap, y: a.y + a.height / 2 - fh / 2 };
    case 'left-end':
      return { x: a.x - fw - gap, y: a.y + a.height - fh };
  }
}

// True when the float fits naturally (without clamping) at the given
// placement: primary axis has room AND alignment axis has room.
function fitsNatural(
  p: ResolvedPlacement,
  a: Rect,
  b: Rect,
  margin: number,
  gap: number,
  fw: number,
  fh: number,
  prim: PrimarySpace,
): boolean {
  const side = getSide(p);
  if (side === 'top' || side === 'bottom') {
    if (fh > prim[side]) return false;
    return fw <= alignmentHorizontalRoom(p, a, b, margin);
  }
  if (fw > prim[side]) return false;
  return fh <= alignmentVerticalRoom(p, a, b, margin);
}

// Score a placement for "fallback" selection when nothing fits naturally.
// Uses the binding axis: vertical room for left/right (alignment-aware),
// vertical primary space for top/bottom. Higher is better.
function fallbackScore(
  p: ResolvedPlacement,
  a: Rect,
  b: Rect,
  margin: number,
  prim: PrimarySpace,
): number {
  const side = getSide(p);
  if (side === 'top' || side === 'bottom') return prim[side];
  return alignmentVerticalRoom(p, a, b, margin);
}

// Alignment alternatives on the SAME side. Used for left/right when the
// requested alignment doesn't have enough vertical room; e.g. a `right-start`
// next to an anchor near the bottom edge tries `right-end` first (panel
// bottom pinned to anchor bottom -- room grows upward) before flipping
// sides. For top/bottom this returns an empty list because alignment
// alternatives there are handled by the existing horizontal clamp.
function alignmentAlternatives(p: ResolvedPlacement): ResolvedPlacement[] {
  const side = getSide(p);
  if (side === 'top' || side === 'bottom') return [];
  const align = getAlign(p);
  if (align === 'start') return [`${side}-end`, `${side}-center`] as ResolvedPlacement[];
  if (align === 'end') return [`${side}-start`, `${side}-center`] as ResolvedPlacement[];
  return [`${side}-start`, `${side}-end`] as ResolvedPlacement[];
}

// Pick the placement with the most fallback room. Stable across iterations
// because fallbackScore depends only on aRect / boundary / margin -- never
// on the float's current rendered size.
function selectBestByScore(
  candidates: ResolvedPlacement[],
  preferred: ResolvedPlacement,
  a: Rect,
  b: Rect,
  margin: number,
  prim: PrimarySpace,
): ResolvedPlacement {
  let best = preferred;
  let bestScore = fallbackScore(preferred, a, b, margin, prim);
  for (const c of candidates) {
    const s = fallbackScore(c, a, b, margin, prim);
    // Bias toward `preferred`: only switch on a meaningfully larger score.
    if (s > bestScore + 1) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Placement resolution
// ---------------------------------------------------------------------------

function resolvePlacement(
  requested: ResolvedPlacement | 'auto',
  a: Rect,
  b: Rect,
  margin: number,
  gap: number,
  fw: number,
  fh: number,
  flip: PlacementFlip,
): ResolvedPlacement {
  const prim = primarySpaceMap(a, b, margin, gap);
  const fits = (p: ResolvedPlacement): boolean =>
    fitsNatural(p, a, b, margin, gap, fw, fh, prim);

  if (requested === 'auto') {
    for (const c of AUTO_ORDER) {
      if (fits(c)) return c;
    }
    // Nothing fits naturally; pick the side with the most usable room.
    // `auto` opts into any-side selection by design, regardless of `flip`.
    return selectBestByScore(AUTO_ORDER, AUTO_ORDER[0], a, b, margin, prim);
  }

  // 1. Honor the requested placement when it fits.
  if (fits(requested)) return requested;

  // 2. For left/right, try alignment alternatives on the same side first.
  // A `right-start` near the bottom edge prefers `right-end` over flipping
  // to `left-start` -- alignment swap preserves the user's chosen side.
  for (const alt of alignmentAlternatives(requested)) {
    if (fits(alt)) return alt;
  }

  // 3. Try the opposite side (preserves alignment, swaps side on the same axis).
  if (fits(OPPOSITE[requested])) return OPPOSITE[requested];

  // 4. Adjacent (perpendicular-axis) cascade. Only attempted when `flip:
  // 'any'` -- tooltips/rich-tooltips intentionally allow this. Anchored
  // panels (popovers, menus, option-lists, pickers) pass `flip: 'main-axis'`
  // and skip this step so the panel never jumps from `bottom-*` to
  // `right-*` or `left-*`; it stays on the requested axis and lets the
  // `maxHeight` clamp + internal scrolling absorb the overflow.
  if (flip === 'any') {
    for (const adj of ADJACENT[requested]) {
      if (fits(adj)) return adj;
    }
  }

  // 5. Nothing fits naturally. Pick the candidate with the most binding-axis
  // room. For `main-axis` we only consider same-axis candidates so the
  // fallback can never escape the requested axis. Purely geometry-driven
  // (no fh/fw input) so placement is stable across iterations even when CSS
  // min-height prevents the float from shrinking to the chosen maxHeight.
  const candidates: ResolvedPlacement[] =
    flip === 'any'
      ? [
          OPPOSITE[requested],
          ...ADJACENT[requested],
          ...alignmentAlternatives(requested),
        ]
      : [OPPOSITE[requested], ...alignmentAlternatives(requested)];
  return selectBestByScore(candidates, requested, a, b, margin, prim);
}

// ---------------------------------------------------------------------------
// Final positioning + clamping
// ---------------------------------------------------------------------------

function computeMaxHeight(
  p: ResolvedPlacement,
  a: Rect,
  b: Rect,
  margin: number,
  gap: number,
): number {
  const side = getSide(p);
  // For top/bottom, maxHeight = vertical primary space (gap-aware).
  if (side === 'bottom') {
    return Math.max(MIN_PANEL_HEIGHT, b.y + b.height - margin - (a.y + a.height) - gap);
  }
  if (side === 'top') {
    return Math.max(MIN_PANEL_HEIGHT, a.y - b.y - margin - gap);
  }
  // For left/right, maxHeight = vertical room for the chosen alignment.
  // This keeps the alignment edge pinned to the anchor while clamping the
  // height to fit within the boundary; if even this is too small, the
  // shared vertical clamp below repositions the panel within the boundary.
  return Math.max(MIN_PANEL_HEIGHT, alignmentVerticalRoom(p, a, b, margin));
}

function resolveWidth(
  width: 'anchor' | number | string | undefined,
  anchorWidth: number,
): string | null {
  if (width == null) return null;
  if (width === 'anchor') return `${anchorWidth}px`;
  if (typeof width === 'number') return `${width}px`;
  return width;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates the position of a floating element relative to an anchor.
 *
 * Supports 12 named placements and `auto`, and returns:
 *  - `x` / `y` (document-absolute, includes scroll offsets) for `transform: translate()`
 *  - `placement` actually used (after collision-driven flips)
 *  - `maxHeight` so the consumer can clamp the panel into the boundary
 *  - `width` (when `width: 'anchor'` or an explicit value was requested)
 *
 * Placement selection is geometry-driven and STABLE across re-position
 * iterations: the chosen side depends only on the anchor and boundary
 * rects, never on the float's current rendered size. Without that
 * invariant, applying `maxHeight` resizes the float, which fires a
 * `ResizeObserver` callback that re-runs `computePosition` -- and if the
 * placement decision depended on the new (smaller) size, the loop could
 * oscillate forever.
 *
 * The float is also vertically clamped for left/right placements and
 * horizontally clamped for top/bottom, mirroring the existing horizontal
 * clamp so a panel anchored next to a corner of the viewport never extends
 * past the boundary edge (preventing the page's scroll area from growing).
 */
export function computePosition(
  anchor: HTMLElement | { x: number; y: number },
  float: HTMLElement,
  options: PositionOptions = {},
): PositionResult {
  const {
    placement: requested = 'bottom-start',
    // 4px is the design-system standard separation between an anchored
    // overlay (popover, dropdown, menu, picker, option-list) and its
    // trigger. Submenus opt out by passing `gap: 0` since they sit
    // flush against their parent menu item; context menus also pass 0
    // (anchored at the pointer location).
    gap = 4,
    margin = 8,
    boundary: boundaryEl,
    width: widthOpt,
    flip = 'main-axis',
  } = options;

  const aRect = getAnchorRect(anchor);
  // Measure the float's LAYOUT size (offsetWidth/offsetHeight), not
  // getBoundingClientRect(): the bounding rect reflects CSS transforms, so a
  // reposition that lands during the popup enter animation (arvo-enter-from
  // applies scale(0.98)) under-measures the surface by 2% and the boundary
  // clamp below false-passes -- parking the float past the viewport edge
  // until the next reposition. Layout size ignores the float's own
  // transform (valid because overlay surfaces are portaled outside any
  // scaled/zoomed ancestor, so only the enter-animation transform is in
  // play). The `|| rect` fallback covers floats without offset dimensions
  // (e.g. SVG hosts).
  const fw = float.offsetWidth || float.getBoundingClientRect().width;
  const fh = float.offsetHeight || float.getBoundingClientRect().height;
  const boundary = getBoundaryRect(boundaryEl);

  const placement = resolvePlacement(
    requested,
    aRect,
    boundary,
    margin,
    gap,
    fw,
    fh,
    flip,
  );
  const maxHeight = computeMaxHeight(placement, aRect, boundary, margin, gap);

  // For top placement, the float is anchored at its bottom edge (which
  // sits gap pixels above the anchor). When `maxHeight` clamps the float
  // shorter than its current rendered height, position using the clamped
  // height so the BOTTOM stays pinned. Without this, the first frame after
  // an applied clamp would render the panel too high (its top stays put,
  // its bottom rises) and the `ResizeObserver` callback has to schedule
  // a second pass to correct.
  const side = getSide(placement);
  const positioningFh = side === 'top' ? Math.min(fh, maxHeight) : fh;
  const pos = rawPosition(aRect, fw, positioningFh, placement, gap);

  // Horizontal clamp -- prevent float from exceeding boundary edges.
  pos.x = Math.max(
    boundary.x + margin,
    Math.min(pos.x, boundary.x + boundary.width - fw - margin),
  );

  // Vertical clamp for left/right placements -- mirror of horizontal clamp.
  // For an anchor near a vertical viewport edge, this keeps the float
  // visible inside the boundary even if the anchored alignment edge would
  // place it off-screen. Alignment with the anchor is sacrificed only when
  // even `maxHeight` (alignment-aware vertical room) wasn't enough to fit
  // the resolved float height (e.g. CSS `min-height` forced it taller).
  if (side === 'left' || side === 'right') {
    const clampedFh = Math.min(fh, maxHeight);
    pos.y = Math.max(
      boundary.y + margin,
      Math.min(pos.y, boundary.y + boundary.height - clampedFh - margin),
    );
  }

  // Vertical clamp for top/bottom placements -- the "over-trigger" fallback.
  //
  // Default behavior keeps the panel anchored to the chosen side: bottom
  // sits below the trigger, top sits above. The chosen side already has
  // the most primary-axis room (selectBestByScore picks the larger of
  // bottom vs top for `flip: 'main-axis'`), and `maxHeight` is clamped to
  // that room so the panel + internal scroll fit inside the boundary in
  // typical cases.
  //
  // In EXTREME cases the chosen side's primary space can be smaller than
  // `MIN_PANEL_HEIGHT` (50 px) -- e.g. the anchor sits near the very top
  // or very bottom edge of a tight viewport, or a host scroll container
  // is severely constrained. `computeMaxHeight` floors `maxHeight` at 50,
  // but without a positional clamp the panel would still anchor itself
  // below (or above) the trigger and visibly extend past the boundary.
  //
  // Mirroring the left/right clamp here lets the panel slide along the
  // vertical axis to stay inside the boundary, which can mean the panel
  // overlaps the trigger when neither side alone has 50 px of room. This
  // is the third leg of the fallback chain the user expects:
  //   1. Flip on the main axis (handled by `resolvePlacement`).
  //   2. Clamp + internal scroll (handled by `--arvo-overlay-max-height`
  //      + `__scroll` overflow).
  //   3. Position over the trigger when 1 + 2 alone are not enough.
  if (side === 'top' || side === 'bottom') {
    const clampedFh = Math.min(fh, maxHeight);
    pos.y = Math.max(
      boundary.y + margin,
      Math.min(pos.y, boundary.y + boundary.height - clampedFh - margin),
    );
  }

  const width = resolveWidth(widthOpt, aRect.width);

  // Convert viewport coords to document-absolute coords for transform positioning
  pos.x += window.scrollX;
  pos.y += window.scrollY;

  return { x: pos.x, y: pos.y, placement, maxHeight, width };
}
