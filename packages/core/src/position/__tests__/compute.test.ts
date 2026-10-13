// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computePosition } from '../compute';
import type { PositionOptions, ResolvedPlacement } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRect(
  el: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    toJSON: () => ({}),
  } as DOMRect);
}

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, writable: true });
}

function setScroll(x: number, y: number): void {
  Object.defineProperty(window, 'scrollX', { value: x, writable: true });
  Object.defineProperty(window, 'scrollY', { value: y, writable: true });
}

// jsdom's offsetWidth/offsetHeight always report 0 -- stub them per-element
// (configurable, instance-level) to simulate a laid-out float with a real
// layout box, independent of whatever getBoundingClientRect() is mocked to
// return (rects can diverge from layout size under a CSS transform).
function mockOffsetSize(
  el: HTMLElement,
  size: { width: number; height: number },
): void {
  Object.defineProperty(el, 'offsetWidth', { value: size.width, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { value: size.height, configurable: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computePosition', () => {
  let anchor: HTMLElement;
  let float: HTMLElement;

  beforeEach(() => {
    anchor = document.createElement('button');
    float = document.createElement('div');
    document.body.appendChild(anchor);
    document.body.appendChild(float);
    setViewport(1024, 768);
    setScroll(0, 0);
  });

  afterEach(() => {
    document.body.removeChild(anchor);
    document.body.removeChild(float);
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // All 8 placements
  // -----------------------------------------------------------------------

  describe('8 named placements', () => {
    // Anchor 100x40 centered at (400, 350). Float 80x50. Gap 0, margin 0.
    // All 8 placements fit within 1024x768 viewport.
    beforeEach(() => {
      mockRect(anchor, { x: 400, y: 350, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 80, height: 50 });
    });

    it('bottom-start', () => {
      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 0, margin: 0 });
      expect(r.x).toBe(400);
      expect(r.y).toBe(390);
      expect(r.placement).toBe('bottom-start');
    });

    it('bottom-end', () => {
      const r = computePosition(anchor, float, { placement: 'bottom-end', gap: 0, margin: 0 });
      expect(r.x).toBe(400 + 100 - 80); // 420
      expect(r.y).toBe(390);
      expect(r.placement).toBe('bottom-end');
    });

    it('top-start', () => {
      const r = computePosition(anchor, float, { placement: 'top-start', gap: 0, margin: 0 });
      expect(r.x).toBe(400);
      expect(r.y).toBe(350 - 50); // 300
      expect(r.placement).toBe('top-start');
    });

    it('top-end', () => {
      const r = computePosition(anchor, float, { placement: 'top-end', gap: 0, margin: 0 });
      expect(r.x).toBe(420);
      expect(r.y).toBe(300);
      expect(r.placement).toBe('top-end');
    });

    it('right-start', () => {
      const r = computePosition(anchor, float, { placement: 'right-start', gap: 0, margin: 0 });
      expect(r.x).toBe(400 + 100); // 500
      expect(r.y).toBe(350);
      expect(r.placement).toBe('right-start');
    });

    it('right-end', () => {
      const r = computePosition(anchor, float, { placement: 'right-end', gap: 0, margin: 0 });
      expect(r.x).toBe(500);
      expect(r.y).toBe(350 + 40 - 50); // 340
      expect(r.placement).toBe('right-end');
    });

    it('left-start', () => {
      const r = computePosition(anchor, float, { placement: 'left-start', gap: 0, margin: 0 });
      expect(r.x).toBe(400 - 80); // 320
      expect(r.y).toBe(350);
      expect(r.placement).toBe('left-start');
    });

    it('left-end', () => {
      const r = computePosition(anchor, float, { placement: 'left-end', gap: 0, margin: 0 });
      expect(r.x).toBe(320);
      expect(r.y).toBe(340);
      expect(r.placement).toBe('left-end');
    });
  });

  // -----------------------------------------------------------------------
  // Gap
  // -----------------------------------------------------------------------

  describe('gap', () => {
    it('adds gap between anchor and float', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 8, margin: 0 });
      expect(r.y).toBe(200 + 40 + 8);
    });

    it('applies gap for top placement', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'top-start', gap: 8, margin: 0 });
      expect(r.y).toBe(200 - 80 - 8);
    });

    it('applies gap for right placement', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'right-start', gap: 8, margin: 0 });
      expect(r.x).toBe(100 + 200 + 8);
    });

    it('defaults to gap=4 (design-system standard overlay separation)', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', margin: 0 });
      expect(r.y).toBe(200 + 40 + 4);
    });
  });

  // -----------------------------------------------------------------------
  // Flip
  // -----------------------------------------------------------------------

  describe('flip', () => {
    it('flips from bottom to top when no room below', () => {
      mockRect(anchor, { x: 100, y: 680, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 0, margin: 8 });
      expect(r.placement).toBe('top-start');
      expect(r.y).toBe(680 - 80);
    });

    it('flips from top to bottom when no room above', () => {
      mockRect(anchor, { x: 100, y: 20, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'top-start', gap: 0, margin: 8 });
      expect(r.placement).toBe('bottom-start');
      expect(r.y).toBe(20 + 40);
    });

    it('flips from right to left when no room on right', () => {
      mockRect(anchor, { x: 900, y: 300, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'right-start', gap: 0, margin: 8 });
      expect(r.placement).toBe('left-start');
    });

    it('preserves alignment when flipping', () => {
      mockRect(anchor, { x: 100, y: 680, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-end', gap: 0, margin: 8 });
      expect(r.placement).toBe('top-end');
    });

    it('falls back to side with most primary-axis room when nothing fits naturally', () => {
      // Anchor in the upper half of the 768-tall viewport with a 400-tall
      // float: neither bottom nor top has 400px of vertical room. The
      // fallback selector picks whichever side has the most usable space
      // (top has 392, bottom has 320 -- top wins). This is intentional;
      // staying with the requested side when it has materially less room
      // forced the float to oscillate when CSS min-height fought the
      // applied maxHeight, see the regression test below.
      mockRect(anchor, { x: 100, y: 400, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 400 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 0, margin: 8 });
      expect(r.placement).toBe('top-start');
    });

    it('does not flip when there is enough room', () => {
      mockRect(anchor, { x: 100, y: 300, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 0, margin: 8 });
      expect(r.placement).toBe('bottom-start');
    });
  });

  // -----------------------------------------------------------------------
  // Flip mode (main-axis default vs any)
  // -----------------------------------------------------------------------

  describe('flip option (main-axis vs any)', () => {
    it('defaults to main-axis: never escapes to adjacent (perpendicular) sides', () => {
      // Tall float that fits NEITHER below nor above the anchor. Adjacent
      // sides (right/left) have much more vertical room, but `main-axis`
      // is the default so the algorithm stays on the bottom/top axis and
      // picks the side with more primary space.
      mockRect(anchor, { x: 100, y: 380, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 200, height: 720 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
      });
      // Same-axis only: pick whichever of bottom/top has more room. top
      // has 372, bottom has 340 -- top wins by score; right/left are
      // never considered.
      expect(['bottom-start', 'top-start']).toContain(r.placement);
    });

    it("flip: 'any' restores the historical adjacent-side cascade", () => {
      // Same geometry as above, but tooltips opt into the cross-axis flip
      // because the documented contract allows it. The algorithm tries
      // bottom (no fit) -> top (no fit) -> adjacent (right/left); whichever
      // adjacent side has enough room wins. With our anchor at the
      // viewport center horizontally, both fit, so right (first in
      // ADJACENT order) is picked.
      mockRect(anchor, { x: 100, y: 380, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 200, height: 720 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
        flip: 'any',
      });
      expect(['right-start', 'left-start']).toContain(r.placement);
    });

    it("main-axis still falls back to the BEST same-axis candidate when nothing fits", () => {
      // Anchor LOW in the viewport so top has materially more primary-
      // axis room than bottom. Float is taller than either side, so
      // neither fits naturally. Without flip='any' the candidates are
      // only bottom-start + top-start; selectBestByScore returns the one
      // with the most primary space (top-start, 552 vs bottom-start, 28).
      mockRect(anchor, { x: 100, y: 560, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 600 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
      });
      expect(r.placement).toBe('top-start');
    });

    it("main-axis does not affect 'auto' placement (auto enumerates every side by design)", () => {
      // With placement: 'auto', the algorithm considers every side
      // regardless of the flip option. Same case as the previous
      // adjacent-side test should still pick an adjacent side because
      // top/bottom both fail.
      mockRect(anchor, { x: 100, y: 380, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 200, height: 720 });

      const r = computePosition(anchor, float, {
        placement: 'auto',
        gap: 0,
        margin: 8,
        flip: 'main-axis',
      });
      // Auto path enumerates AUTO_ORDER first then selectBestByScore over
      // AUTO_ORDER -- always considers right/left even when caller passed
      // flip: 'main-axis'. The selected side will be the one with the most
      // overall room, which here is right or left.
      expect(['right-start', 'right-center', 'left-start', 'left-center'])
        .toContain(r.placement);
    });
  });

  // -----------------------------------------------------------------------
  // Horizontal clamp
  // -----------------------------------------------------------------------

  describe('horizontal clamping', () => {
    it('clamps float to left boundary', () => {
      // Float wider than viewport: no placement can fit, clamp to left margin.
      mockRect(anchor, { x: 50, y: 200, width: 20, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 1010, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-end', gap: 0, margin: 8 });
      expect(r.x).toBe(8);
    });

    it('clamps float to right boundary', () => {
      // Float nearly as wide as viewport: no flip fits, clamp to right edge.
      // bottom-start x=100, clamp: min(100, 1024-980-8) = min(100, 36) = 36
      mockRect(anchor, { x: 100, y: 200, width: 60, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 980, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 0, margin: 8 });
      expect(r.x).toBe(36);
    });
  });

  // -----------------------------------------------------------------------
  // Layout-size measurement (regression: transform-scaled getBoundingClientRect
  // under-measured the float during the popup enter animation).
  //
  // `arvo-enter-from` (popup-animation SCSS mixin) applies `scale(0.98)`
  // while a popup is opening. getBoundingClientRect() reflects that CSS
  // transform, so a reposition that lands mid-animation measured a 692px
  // surface as 678.16px (692 * 0.98) and the horizontal boundary clamp
  // below false-passed, letting the surface render up to ~14px past the
  // viewport's right edge (real bug: DateRangePicker rolling popover,
  // viewport 1920, anchor-aligned x 1233.84, width 692 -> right edge
  // 1925.84, overflow 5.84px -- corrected only on a later reposition once
  // the animation settled to scale(1) and x recomputed to 1220). The fix
  // measures the float via offsetWidth/offsetHeight (layout size, immune to
  // CSS transforms) with a getBoundingClientRect() fallback for floats that
  // don't report offset dimensions (e.g. SVG hosts).
  // -----------------------------------------------------------------------

  describe('layout-size measurement (transform-immune, regression: scaled float overflow)', () => {
    it('clamps using offsetWidth/offsetHeight, not a transform-scaled bounding rect', () => {
      setViewport(1920, 1080);
      mockRect(anchor, { x: 1233.84, y: 200, width: 100, height: 40 });
      // Real layout size (offsetWidth/offsetHeight): 692x442.
      mockOffsetSize(float, { width: 692, height: 442 });
      // getBoundingClientRect under a CSS scale(0.98) transform: 2% smaller
      // in both dimensions (678.16 = 692 * 0.98, 433.16 = 442 * 0.98).
      mockRect(float, { x: 0, y: 0, width: 678.16, height: 433.16 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 4,
        margin: 8,
      });

      // bottom-start still wins placement selection (828px of primary room
      // below vs 188px above -- see the "flip" describe block's math), so
      // pos.x starts anchor-aligned at 1233.84.
      expect(r.placement).toBe('bottom-start');

      // Horizontal clamp with the FIXED (layout-size) measurement:
      // min(1233.84, boundary.width - fw - margin) = min(1233.84, 1920 - 692 - 8) = 1220.
      // This is the assertion that pins the regression: with the old
      // getBoundingClientRect()-only measurement (fw=678.16), the clamp
      // bound would be 1920 - 678.16 - 8 = 1233.84 -- exactly equal to
      // pos.x, so `Math.min` would leave pos.x UNCLAMPED at 1233.84. The
      // surface would then render at its real 692px width, right edge
      // 1233.84 + 692 = 1925.84, overflowing the 1920px viewport by ~5.84px.
      expect(r.x).toBe(1220);
    });

    it('falls back to getBoundingClientRect() dimensions when offsetWidth/offsetHeight are 0 (e.g. SVG host)', () => {
      // jsdom (and real SVG hosts) report 0/undefined for offsetWidth/offsetHeight;
      // confirm the fallback branch (`float.offsetWidth || rect.width`) is
      // actually exercised here, not just assumed.
      expect(float.offsetWidth).toBe(0);
      expect(float.offsetHeight).toBe(0);

      mockRect(anchor, { x: 100, y: 200, width: 60, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 980, height: 80 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
      });

      // Same clamp as the "clamps float to right boundary" test above:
      // min(100, 1024 - 980 - 8) = 36. If the fallback did NOT engage (fw
      // stayed 0), the clamp bound would instead be 1024 - 0 - 8 = 1016 and
      // pos.x would stay anchor-aligned at 100 -- so this pins the fallback.
      expect(r.x).toBe(36);
    });
  });

  // -----------------------------------------------------------------------
  // Max-height
  // -----------------------------------------------------------------------

  describe('maxHeight', () => {
    it('calculates maxHeight for bottom-start placement', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 2, margin: 8 });
      // floatY = 200 + 40 + 2 = 242
      // maxHeight = 768 - 242 - 8 = 518
      expect(r.maxHeight).toBe(518);
    });

    it('calculates maxHeight for top-start placement (subtracts gap)', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'top-start', gap: 2, margin: 8 });
      // maxHeight = anchorY - boundaryY - margin - gap = 200 - 0 - 8 - 2 = 190.
      // Subtracting gap is required so a float clamped to maxHeight still
      // satisfies fitsInBoundary on the next iteration -- without the gap
      // adjustment the float was always exactly `gap` pixels too tall to
      // fit, which caused the placement to flip back to the requested side
      // on every ResizeObserver callback.
      expect(r.maxHeight).toBe(190);
    });

    it('calculates maxHeight for right-start placement (alignment-aware vertical room)', () => {
      // right-start pins the panel top to the anchor top, so vertical room
      // = boundary.bottom - anchor.y - margin.
      mockRect(anchor, { x: 300, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'right-start', gap: 0, margin: 8 });
      // 768 - 200 - 8 = 560
      expect(r.maxHeight).toBe(560);
    });

    it('calculates maxHeight for right-end placement (alignment-aware vertical room)', () => {
      // right-end pins the panel bottom to the anchor bottom, so vertical
      // room = anchor.bottom - boundary.top - margin.
      mockRect(anchor, { x: 300, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'right-end', gap: 0, margin: 8 });
      // 240 - 0 - 8 = 232
      expect(r.maxHeight).toBe(232);
    });

    it('calculates maxHeight for right-center placement (twice the smaller half)', () => {
      // right-center pins the panel center to the anchor center; vertical
      // room = 2 * min(above-center, below-center).
      mockRect(anchor, { x: 300, y: 100, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, { placement: 'right-center', gap: 0, margin: 8 });
      // center=120; above=120-0-8=112; below=768-8-120=640; 2*112=224
      expect(r.maxHeight).toBe(224);
    });

    it('clamps maxHeight to minimum 50', () => {
      // Use margin=0 so the float position doesn't trigger a flip
      // Anchor near bottom: float y = 740 + 20 + 2 = 762
      // maxHeight = 768 - 762 - 0 = 6 -> clamped to 50
      mockRect(anchor, { x: 100, y: 740, width: 200, height: 20 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 5 });

      const r = computePosition(anchor, float, { placement: 'bottom-start', gap: 2, margin: 0 });
      expect(r.maxHeight).toBe(50);
    });
  });

  // -----------------------------------------------------------------------
  // Point-based positioning
  // -----------------------------------------------------------------------

  describe('point-based positioning', () => {
    it('positions at virtual point', () => {
      mockRect(float, { x: 0, y: 0, width: 100, height: 60 });

      const r = computePosition({ x: 500, y: 400 }, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 0,
      });
      expect(r.x).toBe(500);
      expect(r.y).toBe(400); // zero-size anchor, so bottom = top = 400
    });

    it('flips virtual point positioning', () => {
      mockRect(float, { x: 0, y: 0, width: 100, height: 60 });

      const r = computePosition({ x: 500, y: 740 }, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
      });
      // bottom: y=740, bottom edge=800 > 760 -> flips to top
      expect(r.placement).toBe('top-start');
      expect(r.y).toBe(740 - 60); // 680
    });
  });

  // -----------------------------------------------------------------------
  // Width
  // -----------------------------------------------------------------------

  describe('width', () => {
    beforeEach(() => {
      mockRect(anchor, { x: 100, y: 200, width: 250, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });
    });

    it('width: "anchor" returns anchor width as px string', () => {
      const r = computePosition(anchor, float, { placement: 'bottom-start', width: 'anchor' });
      expect(r.width).toBe('250px');
    });

    it('width: number returns px string', () => {
      const r = computePosition(anchor, float, { placement: 'bottom-start', width: 300 });
      expect(r.width).toBe('300px');
    });

    it('width: string passed through', () => {
      const r = computePosition(anchor, float, { placement: 'bottom-start', width: '50vw' });
      expect(r.width).toBe('50vw');
    });

    it('width: undefined returns null', () => {
      const r = computePosition(anchor, float, { placement: 'bottom-start' });
      expect(r.width).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Scroll offsets
  // -----------------------------------------------------------------------

  describe('scroll offsets', () => {
    it('includes scrollX and scrollY in returned coordinates', () => {
      setScroll(100, 250);
      mockRect(anchor, { x: 200, y: 300, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 80, height: 50 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 0,
      });
      expect(r.x).toBe(200 + 100); // viewport x + scrollX
      expect(r.y).toBe(340 + 250); // viewport y + scrollY
    });
  });

  // -----------------------------------------------------------------------
  // Auto placement
  // -----------------------------------------------------------------------

  describe('auto placement', () => {
    it('selects first placement that fits', () => {
      mockRect(anchor, { x: 400, y: 300, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 120, height: 60 });

      const r = computePosition(anchor, float, { placement: 'auto', margin: 8 });
      // bottom-start is first in order and fits
      expect(r.placement).toBe('bottom-start');
    });

    it('skips placements that do not fit', () => {
      // Anchor near bottom of viewport
      mockRect(anchor, { x: 400, y: 700, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 120, height: 60 });

      const r = computePosition(anchor, float, { placement: 'auto', gap: 0, margin: 8 });
      // bottom-start: y=740, bottom=800 > 760 -> doesn't fit
      // top-start: y=640, fits
      expect(r.placement).toBe('top-start');
    });

    it('falls back to side with most usable room when none fit', () => {
      // Float is huge in both axes -- nothing fits naturally. The fallback
      // selector picks whichever placement leaves the most binding-axis
      // room (alignment-aware vertical room for right/left, primary
      // vertical for top/bottom). This keeps the choice STABLE: even
      // after ResizeObserver fires post-clamp, the geometry-only score
      // returns the same placement.
      mockRect(anchor, { x: 400, y: 400, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 2000, height: 2000 });

      const r = computePosition(anchor, float, { placement: 'auto', margin: 8 });
      // right-center has the most alignment-vertical room here; the exact
      // winner is deterministic from the geometry but isn't the point of
      // the assertion. What matters is that we DON'T fall through to
      // bottom-start when bottom has materially less space.
      expect(r.placement).not.toBe('bottom-start');
      // And we never invent a placement -- the value is one of the
      // documented placements.
      expect([
        'bottom-start', 'bottom-center', 'bottom-end',
        'top-start', 'top-center', 'top-end',
        'right-start', 'right-center', 'right-end',
        'left-start', 'left-center', 'left-end',
      ]).toContain(r.placement);
    });
  });

  // -----------------------------------------------------------------------
  // Boundary element
  // -----------------------------------------------------------------------

  describe('boundary element', () => {
    let boundary: HTMLElement;

    beforeEach(() => {
      boundary = document.createElement('div');
      document.body.appendChild(boundary);
    });

    afterEach(() => {
      document.body.removeChild(boundary);
    });

    it('uses boundary rect for collision detection', () => {
      mockRect(boundary, { x: 50, y: 50, width: 400, height: 300 });
      mockRect(anchor, { x: 200, y: 300, width: 100, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 120, height: 60 });

      // bottom-start: y=340, bottom=400 > boundary bottom (350-margin=342) -> flip
      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
        boundary,
      });
      expect(r.placement).toBe('top-start');
    });

    it('clamps horizontally within boundary', () => {
      // Float width 280 within 300-wide boundary: no flip candidate fits, clamp kicks in.
      mockRect(boundary, { x: 100, y: 0, width: 300, height: 768 });
      mockRect(anchor, { x: 350, y: 200, width: 50, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 280, height: 60 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 0,
        margin: 8,
        boundary,
      });
      expect(r.x).toBe(112);
    });
  });

  // -----------------------------------------------------------------------
  // Vertical clamp for left/right placements
  // -----------------------------------------------------------------------

  describe('vertical clamping for left/right placements', () => {
    it('clamps right-start panel up when anchor is near the bottom edge', () => {
      // Anchor near bottom-left, panel taller than the room below the
      // anchor's top. Panel must be clamped UP so it stays in the boundary
      // rather than extending below and growing the page scroll area.
      // Boundary 800x600, anchor (20, 550, 80x30), float 320x400.
      mockRect(anchor, { x: 20, y: 550, width: 80, height: 30 });
      mockRect(float, { x: 0, y: 0, width: 320, height: 400 });
      setViewport(800, 600);

      const r = computePosition(anchor, float, {
        placement: 'right-end',
        gap: 0,
        margin: 8,
      });
      // Even with the alignment swap from start->end, fh=400 still exceeds
      // the available alignment-vertical room. The vertical clamp keeps
      // the panel inside the boundary (top >= margin, bottom <= viewport).
      // clampedFh = min(400, maxHeight) where maxHeight = anchor.bottom -
      // boundary.top - margin = 580 - 0 - 8 = 572 (right-end). So
      // clampedFh=400. pos.y_raw = anchor.bottom - fh = 580 - 400 = 180.
      // Clamp keeps it within bounds: 180 >= 8 and 180+400=580 <= 600-8=592. OK.
      expect(r.y).toBe(180);
    });

    it('clamps right-start vertical when CSS would push the panel below the viewport', () => {
      // Hypothetical: anchor.y near bottom, fh exceeds even the
      // alignment-aware maxHeight. Verifies pos.y is clamped so the
      // panel's bottom never exceeds boundary.bottom - margin.
      mockRect(anchor, { x: 20, y: 700, width: 80, height: 30 });
      mockRect(float, { x: 0, y: 0, width: 320, height: 200 });
      setViewport(800, 768);

      const r = computePosition(anchor, float, {
        placement: 'right-start',
        gap: 0,
        margin: 8,
      });
      // right-start raw y=700. maxHeight=768-700-8=60. clampedFh=min(200,60)=60.
      // pos.y clamped to <= 768-8-60=700. So y=700 (unchanged).
      // But the panel still renders at fh=200 because fh in clamp uses min(fh, maxHeight).
      // The intent: panel doesn't extend past 768-8.
      expect(r.y).toBeLessThanOrEqual(768 - 8 - 60);
    });

    it('preserves left/right alignment when anchor leaves enough room', () => {
      // Boundary roomy: alignment is honored.
      mockRect(anchor, { x: 100, y: 100, width: 50, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 200, height: 60 });

      const r = computePosition(anchor, float, {
        placement: 'right-start',
        gap: 0,
        margin: 8,
      });
      expect(r.placement).toBe('right-start');
      expect(r.y).toBe(100); // top-aligned with anchor
    });
  });

  // -----------------------------------------------------------------------
  // Vertical clamp for top/bottom placements -- the "over-trigger" fallback.
  // -----------------------------------------------------------------------

  describe('vertical clamping for top/bottom placements (over-trigger fallback)', () => {
    it('does not move the panel when it fits below the anchor', () => {
      // Anchor in the middle of a roomy viewport: maxHeight is the natural
      // primary space, the panel sits at trigger.bottom + gap, and the new
      // top/bottom clamp is a no-op.
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 8,
        margin: 8,
      });
      expect(r.placement).toBe('bottom-start');
      expect(r.y).toBe(200 + 40 + 8); // 248 -- unchanged by the clamp
    });

    it('shifts a clamped bottom panel UP so it overlaps the trigger when room is tight', () => {
      // Tiny viewport where neither bottom nor top has 50 px of room
      // (MIN_PANEL_HEIGHT). The algorithm picks bottom-start (bias toward
      // requested + scores within +/-1 of each other), `maxHeight` floors
      // at MIN_PANEL_HEIGHT, and the new vertical clamp slides the panel
      // up so its bottom edge stays within `boundary.height - margin`.
      // The result intentionally overlaps the trigger -- this is the
      // third leg of the fallback chain (flip -> clamp+scroll -> over-trigger).
      mockRect(anchor, { x: 0, y: 30, width: 80, height: 20 });
      mockRect(float, { x: 0, y: 0, width: 80, height: 100 });
      setViewport(80, 80);

      const r = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 2,
        margin: 8,
      });
      // maxHeight floors at MIN_PANEL_HEIGHT (50). Without the clamp, the
      // panel would render at y = 30 + 20 + 2 = 52 with a clamped height
      // of 50 -- bottom edge at 102, well past the 72 boundary edge.
      // The clamp shifts it up so panel.bottom <= boundary.bottom - margin
      // (80 - 8 = 72), i.e. pos.y = 72 - 50 = 22.
      expect(r.maxHeight).toBe(50);
      expect(r.y).toBe(22);
    });

    it('shifts a clamped top panel DOWN so it stays inside the boundary', () => {
      // Mirror of the bottom case: anchor near the bottom edge, top is
      // chosen because it has more room, but the algorithm still floors
      // maxHeight at MIN_PANEL_HEIGHT. The clamp slides the panel down
      // so its top edge stays >= boundary.top + margin.
      mockRect(anchor, { x: 0, y: 30, width: 80, height: 20 });
      mockRect(float, { x: 0, y: 0, width: 80, height: 100 });
      setViewport(80, 80);

      const r = computePosition(anchor, float, {
        placement: 'top-start',
        gap: 2,
        margin: 8,
      });
      // primary above = 30 - 0 - 8 - 2 = 20. floors at 50. raw y for
      // top-start with clampedFh = 50: 30 - 50 - 2 = -22. The clamp lifts
      // pos.y to >= boundary.top + margin = 8.
      expect(r.maxHeight).toBe(50);
      expect(r.y).toBe(8);
    });
  });

  // -----------------------------------------------------------------------
  // Alignment alternatives for left/right
  // -----------------------------------------------------------------------

  describe('alignment alternatives for left/right placements', () => {
    it('swaps right-start to right-end when anchor is near the bottom', () => {
      // right-start at anchor.y=550 leaves only 218 vertical room. The
      // panel needs 400. right-end (panel bottom pinned to anchor bottom)
      // gives 580 of room -- which fits naturally.
      mockRect(anchor, { x: 20, y: 550, width: 80, height: 30 });
      mockRect(float, { x: 0, y: 0, width: 320, height: 400 });
      setViewport(800, 600);

      const r = computePosition(anchor, float, {
        placement: 'right-start',
        gap: 0,
        margin: 8,
      });
      // Algorithm tries right-start (no fit), then alignment alternatives
      // (right-end has 580 room, fh=400 fits) -> picks right-end.
      expect(r.placement).toBe('right-end');
    });

    it('swaps left-end to left-start when anchor is near the top', () => {
      mockRect(anchor, { x: 600, y: 30, width: 80, height: 30 });
      mockRect(float, { x: 0, y: 0, width: 320, height: 400 });
      setViewport(800, 600);

      const r = computePosition(anchor, float, {
        placement: 'left-end',
        gap: 0,
        margin: 8,
      });
      expect(r.placement).toBe('left-start');
    });
  });

  // -----------------------------------------------------------------------
  // Stability: placement does NOT depend on the float's current rendered
  // height. This is the critical regression target -- the bug was that
  // applying maxHeight clamps the float, ResizeObserver fires, the
  // recomputed placement disagrees with the prior one, and the panel
  // flickered between top and bottom forever (especially with CSS
  // min-height fighting the inline max-height).
  // -----------------------------------------------------------------------

  describe('stable placement across iterations (regression: flip-flop)', () => {
    it('returns the same placement before and after the float is clamped to maxHeight', () => {
      // Tight viewport with anchor in the middle: nothing fits naturally,
      // so the algorithm uses fallback scoring (which is geometry-only).
      setViewport(400, 500);
      mockRect(anchor, { x: 100, y: 350, width: 80, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 320, height: 400 });

      const first = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 2,
        margin: 8,
      });

      // Simulate the clamp: ResizeObserver fires after the consumer
      // applies `style.maxHeight = first.maxHeight`. The float now reports
      // a smaller bounding rect.
      mockRect(float, {
        x: 0,
        y: 0,
        width: 320,
        height: first.maxHeight ?? 400,
      });

      const second = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 2,
        margin: 8,
      });

      // Identical placement -- no oscillation.
      expect(second.placement).toBe(first.placement);
      expect(second.maxHeight).toBe(first.maxHeight);
    });

    it('stays put when CSS min-height prevents the float from shrinking to maxHeight', () => {
      // Models the hpop case: 272px CSS min-height fights a 100px JS
      // maxHeight. After applying maxHeight the float ends up at 272 (CSS
      // min wins). Before this fix the recompute saw a 272-tall float
      // and re-flipped sides on every iteration.
      setViewport(400, 500);
      mockRect(anchor, { x: 100, y: 350, width: 80, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 320, height: 400 });

      const first = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 2,
        margin: 8,
      });

      // Float reports 272 (CSS min-height won the resolution race).
      mockRect(float, { x: 0, y: 0, width: 320, height: 272 });

      const second = computePosition(anchor, float, {
        placement: 'bottom-start',
        gap: 2,
        margin: 8,
      });

      // Same placement either way. Float is taller than the maxHeight
      // returned (it overflows visually), but the placement is STABLE so
      // no infinite reposition loop fires.
      expect(second.placement).toBe(first.placement);
    });
  });

    // -----------------------------------------------------------------------
  // Default options
  // -----------------------------------------------------------------------

  describe('defaults', () => {
    it('defaults to bottom-start, gap=4, margin=8', () => {
      mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
      mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

      const r = computePosition(anchor, float);
      expect(r.placement).toBe('bottom-start');
      expect(r.y).toBe(200 + 40 + 4); // gap=4 (design-system overlay default)
    });
  });

  // -----------------------------------------------------------------------
  // All 8 placements return correct placement value
  // -----------------------------------------------------------------------

  it('all 8 placements return correct placement value when they fit', () => {
    mockRect(anchor, { x: 400, y: 350, width: 100, height: 40 });
    mockRect(float, { x: 0, y: 0, width: 80, height: 50 });

    const placements: ResolvedPlacement[] = [
      'bottom-start', 'bottom-end',
      'top-start', 'top-end',
      'right-start', 'right-end',
      'left-start', 'left-end',
    ];

    for (const p of placements) {
      const r = computePosition(anchor, float, { placement: p, gap: 0, margin: 0 });
      expect(r.placement).toBe(p);
    }
  });
});
