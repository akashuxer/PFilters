import { computePosition } from './compute';
import type {
  PositionWatcherOptions,
  PositionWatcher,
  PositionResult,
  PositionUpdateSource,
} from './types';

/**
 * Resolver returning the live viewport-relative anchor on every compute.
 * Used by the virtual-anchor watcher so a context menu opened at a static
 * page-coord point can track the document as the user scrolls or zooms.
 */
export type VirtualAnchorProvider = () => { x: number; y: number };

/**
 * Manages ResizeObserver, scroll, and window-resize listeners that
 * automatically reposition a floating element relative to an anchor.
 * All reposition calls are deduplicated through `requestAnimationFrame`.
 *
 * Supports two anchor modes:
 *   - HTMLElement anchor -- ResizeObserver + scroll + window resize.
 *   - VirtualAnchorProvider (function) -- scroll + window resize only.
 *     The provider re-derives the live viewport-relative point on every
 *     compute, so consumers that captured a page-coord at open time (e.g.
 *     ArvoContextMenu pinning to the document point of the right-click)
 *     can let the document scroll/zoom underneath without losing the
 *     anchor.
 *
 * The watcher emits a `PositionUpdateSource` flag with every callback so
 * consumers can distinguish "the world changed" (`'full'` -- anchor /
 * container / scroll / resize) from "the float itself resized" (`'float-size'`).
 * Consumers that don't care about the source can simply ignore the second
 * argument; surfaces that want to lock placement on float-size updates
 * (e.g. ArvoActionMenu to prevent filter-induced flip flicker) inspect it.
 */
export function createPositionWatcher(
  anchor: HTMLElement | VirtualAnchorProvider,
  float: HTMLElement,
  options: PositionWatcherOptions,
  onUpdate: (result: PositionResult, source: PositionUpdateSource) => void,
): PositionWatcher {
  let rafId: number | null = null;
  let pendingSource: PositionUpdateSource | null = null;
  const isElementAnchor = typeof anchor !== 'function';

  function currentAnchor(): HTMLElement | { x: number; y: number } {
    return isElementAnchor
      ? (anchor as HTMLElement)
      : (anchor as VirtualAnchorProvider)();
  }

  // Schedule a reposition. If multiple sources fire in the same frame, the
  // strongest (`'full'`) wins -- `'full'` allows placement re-resolution
  // while `'float-size'` may lock placement at the consumer's request, and
  // we want the broader-scope event to drive the next compute when both
  // are pending in the same rAF.
  function schedule(source: PositionUpdateSource): void {
    if (pendingSource === 'full' || (pendingSource == null)) {
      pendingSource = pendingSource === 'full' ? 'full' : source;
    }
    if (source === 'full') pendingSource = 'full';
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const src: PositionUpdateSource = pendingSource ?? 'full';
      pendingSource = null;
      onUpdate(computePosition(currentAnchor(), float, options), src);
    });
  }

  function scheduleFull(): void {
    schedule('full');
  }
  function scheduleFloatSize(): void {
    schedule('float-size');
  }

  // --- ResizeObserver on anchor ---
  // Anchor resizes (trigger expands/contracts) are "world changed" events
  // -- placement may legitimately need to re-resolve.
  let anchorRo: ResizeObserver | null = null;
  if (isElementAnchor) {
    anchorRo = new ResizeObserver(scheduleFull);
    anchorRo.observe(anchor as HTMLElement);
  }

  // --- ResizeObserver on float ---
  // The float observer matters when the floating element's own content
  // drives a size change AND the chosen placement is size-dependent
  // (e.g. `top-*`, `*-end`, `*-center` -- where one or both axes use the
  // float's width or height in the math). Without this, a panel that
  // swaps its content (e.g. an action menu showing an inline popover, or
  // a filter shrinking the item list) would stay anchored to the OLD
  // position, drifting away from its anchored trigger corner. Treated as
  // a `'float-size'` source so opted-in surfaces can lock placement.
  const floatRo = new ResizeObserver(scheduleFloatSize);
  floatRo.observe(float);

  // --- ResizeObserver on container matching selector ---
  let containerRo: ResizeObserver | null = null;
  if (options.observeContainerSelector && isElementAnchor) {
    const container = (anchor as HTMLElement).closest(
      options.observeContainerSelector,
    );
    if (container) {
      containerRo = new ResizeObserver(scheduleFull);
      containerRo.observe(container);
    }
  }

  // --- Scroll (capture phase, filter out scroll within float) ---
  function onScroll(e: Event): void {
    if (e.target instanceof Node && float.contains(e.target)) return;
    scheduleFull();
  }
  window.addEventListener('scroll', onScroll, true);

  // --- Window resize (also fires on pinch/browser zoom) ---
  window.addEventListener('resize', scheduleFull);

  // --- Public API ---

  function update(): void {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // Explicit consumer-driven reposition is treated as a `'full'` event
    // (the consumer is asking for a fresh placement decision).
    pendingSource = null;
    onUpdate(computePosition(currentAnchor(), float, options), 'full');
  }

  function destroy(): void {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    anchorRo?.disconnect();
    floatRo.disconnect();
    containerRo?.disconnect();
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', scheduleFull);
  }

  return { update, destroy };
}
