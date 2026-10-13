/**
 * Pointer-driven panel translation.
 *
 * `createDragHandle` binds a `handle` element (typically a header) so that
 * pointer-drag gestures translate a `target` element. The current offset is
 * exposed via callbacks AND written to two CSS custom properties on the
 * target (`--arvo-drag-x`, `--arvo-drag-y` by default, overridable via the
 * `cssVar` option) so consumers can compose the translate however they need
 * (e.g. `translate(calc(-50% + var(--arvo-win-x, 0px)), ...)`).
 *
 * Bounds: the resulting offset is clamped so the target's bounding rect
 * stays inside the viewport (or a custom rect returned by
 * `bounds.getRect()`). The clamp accounts for the target's current rect at
 * the start of the drag.
 *
 * Excluded children: when the pointerdown event originates inside an
 * element matching `excludeSelector`, the drag does NOT start. Use this to
 * skip interactive header children (icon buttons, switches, badges).
 *
 * Keyboard: there is no keyboard interaction by design -- the consumer
 * component is responsible for any keyboard repositioning.
 *
 * Parallel to `createResizeHandle` in `../resize/resize-handle.ts`.
 */

export interface DragOffset {
  x: number;
  y: number;
}

export interface DragBoundsRect {
  /** Returns the bounding rect the target must stay inside. Polled on every pointer move. */
  getRect: () => DOMRect;
}

export interface DragHandleOptions {
  /** Element that initiates the drag (e.g. the window header). */
  handle: HTMLElement;
  /**
   * Element that is translated. Its `getBoundingClientRect()` is read on
   * pointerdown AND on every pointer move to keep the clamp accurate when
   * the page scrolls or the target resizes mid-drag.
   */
  target: HTMLElement;
  /**
   * CSS selector matched against the `pointerdown` target. When a match is
   * found (via `.closest()`), the drag does NOT start. Match is scoped to
   * the `handle` subtree.
   */
  excludeSelector?: string;
  /**
   * Bounds rectangle. `'viewport'` uses
   * `{ left:0, top:0, right: innerWidth, bottom: innerHeight }`; pass a
   * custom `{ getRect }` to clamp inside an app shell. Pass `null` to
   * disable clamping (unbounded drag). Default: `'viewport'`.
   */
  bounds?: 'viewport' | DragBoundsRect | null;
  /** Initial offset to seed `--arvo-drag-x` / `--arvo-drag-y`. Default `{ x: 0, y: 0 }`. */
  initialOffset?: DragOffset;
  /**
   * CSS custom property names written on the target during drag. Defaults
   * to `{ x: '--arvo-drag-x', y: '--arvo-drag-y' }`. Override per consumer
   * (e.g. ArvoWindow uses `--arvo-win-x` / `--arvo-win-y`).
   */
  cssVar?: { x: string; y: string };
  /**
   * Class name toggled on the target while a drag is in progress. Default
   * `'dragging'`. Pass an empty string to disable.
   */
  draggingClass?: string;
  /** Called once on pointerdown when a drag begins. */
  onDragStart?: (event: PointerEvent) => void;
  /** Called continuously during drag with the current (clamped) offset. */
  onDrag?: (offset: DragOffset) => void;
  /** Called once on pointerup with the final (clamped) offset. */
  onDragEnd?: (offset: DragOffset) => void;
}

export interface DragHandleInstance {
  /** Whether a drag gesture is currently in progress. */
  isDragging: () => boolean;
  /** Returns the current offset. */
  offset: () => DragOffset;
  /** Programmatically set the offset (clamped against the current bounds and target rect). */
  setOffset: (next: DragOffset) => void;
  /** Reset the offset to `{ x: 0, y: 0 }`. */
  reset: () => void;
  /**
   * Detach the pointer listeners and remove the dragging class. The CSS
   * custom properties ARE preserved on the target so consumers that re-attach
   * (or unmount the target imminently) don't see a position jump. Call
   * `reset()` first if you want to clear the offset.
   */
  destroy: () => void;
}

interface DragState {
  startClientX: number;
  startClientY: number;
  startOffset: DragOffset;
  /** Snapshot of target's bounding rect at drag start (used to compute clamp bounds). */
  startRect: DOMRect;
}

const DEFAULT_CSS_VAR = { x: '--arvo-drag-x', y: '--arvo-drag-y' } as const;
const DEFAULT_DRAGGING_CLASS = 'dragging';

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getViewportRect(): DOMRect {
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

function resolveBoundsRect(
  bounds: DragHandleOptions['bounds'],
): DOMRect | null {
  if (bounds === null) return null;
  if (bounds === undefined || bounds === 'viewport') return getViewportRect();
  return bounds.getRect();
}

/**
 * Clamp a drag delta so the target's rect (at `startRect` + delta) stays
 * inside `boundsRect`. Returns the final, clamped offset (relative to the
 * starting offset, which is already baked into `startRect`).
 */
function clampOffset(
  startRect: DOMRect,
  startOffset: DragOffset,
  deltaX: number,
  deltaY: number,
  boundsRect: DOMRect | null,
): DragOffset {
  if (!boundsRect) {
    return { x: startOffset.x + deltaX, y: startOffset.y + deltaY };
  }
  // The target's left/top at start already reflects startOffset. To clamp
  // the final translated position, work out the maximum delta on each axis.
  const minDeltaX = boundsRect.left - startRect.left;
  const maxDeltaX = boundsRect.right - startRect.right;
  const minDeltaY = boundsRect.top - startRect.top;
  const maxDeltaY = boundsRect.bottom - startRect.bottom;
  return {
    x: startOffset.x + clamp(deltaX, minDeltaX, maxDeltaX),
    y: startOffset.y + clamp(deltaY, minDeltaY, maxDeltaY),
  };
}

export function createDragHandle(
  options: DragHandleOptions,
): DragHandleInstance {
  const {
    handle,
    target,
    excludeSelector,
    bounds = 'viewport',
    initialOffset = { x: 0, y: 0 },
    cssVar = DEFAULT_CSS_VAR,
    draggingClass = DEFAULT_DRAGGING_CLASS,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  let currentOffset: DragOffset = { ...initialOffset };
  let dragState: DragState | null = null;
  let destroyed = false;

  function writeOffset(offset: DragOffset): void {
    target.style.setProperty(cssVar.x, `${offset.x}px`);
    target.style.setProperty(cssVar.y, `${offset.y}px`);
  }

  writeOffset(currentOffset);

  function shouldStart(e: PointerEvent): boolean {
    if (destroyed || dragState) return false;
    // Only primary button (mouse / touch / pen primary contact).
    if (e.button !== 0 && e.pointerType === 'mouse') return false;
    if (!excludeSelector) return true;
    const t = e.target as Element | null;
    if (!t) return true;
    // `.closest()` walks up from the event target, so we catch clicks that
    // originate inside an excluded child even if they bubbled to the handle.
    return !t.closest(excludeSelector);
  }

  function onPointerDown(e: PointerEvent): void {
    if (!shouldStart(e)) return;
    // Don't preventDefault unconditionally -- doing so would block clicks on
    // any header children we did NOT exclude. Stop propagation only after
    // the drag has actually started below.
    const startRect = target.getBoundingClientRect();
    dragState = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffset: { ...currentOffset },
      startRect,
    };

    if (draggingClass) target.classList.add(draggingClass);

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    onDragStart?.(e);
  }

  function computeOffset(e: PointerEvent): DragOffset {
    if (!dragState) return currentOffset;
    const dx = e.clientX - dragState.startClientX;
    const dy = e.clientY - dragState.startClientY;
    const boundsRect = resolveBoundsRect(bounds);
    return clampOffset(
      dragState.startRect,
      dragState.startOffset,
      dx,
      dy,
      boundsRect,
    );
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragState) return;
    e.preventDefault();
    currentOffset = computeOffset(e);
    writeOffset(currentOffset);
    onDrag?.(currentOffset);
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragState) return;
    currentOffset = computeOffset(e);
    writeOffset(currentOffset);
    if (draggingClass) target.classList.remove(draggingClass);

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    dragState = null;
    onDragEnd?.(currentOffset);
  }

  handle.addEventListener('pointerdown', onPointerDown);

  return {
    isDragging() {
      return dragState !== null;
    },
    offset() {
      return { ...currentOffset };
    },
    setOffset(next) {
      // When called while idle we clamp against the current target rect.
      const boundsRect = resolveBoundsRect(bounds);
      if (boundsRect) {
        const rect = target.getBoundingClientRect();
        const startOffset = { ...currentOffset };
        const dx = next.x - startOffset.x;
        const dy = next.y - startOffset.y;
        currentOffset = clampOffset(rect, startOffset, dx, dy, boundsRect);
      } else {
        currentOffset = { ...next };
      }
      writeOffset(currentOffset);
    },
    reset() {
      currentOffset = { x: 0, y: 0 };
      writeOffset(currentOffset);
    },
    destroy() {
      destroyed = true;
      handle.removeEventListener('pointerdown', onPointerDown);
      if (dragState) {
        if (draggingClass) target.classList.remove(draggingClass);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        dragState = null;
      }
      // CSS custom properties intentionally preserved -- see DragHandleInstance.destroy.
    },
  };
}
