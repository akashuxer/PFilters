export type ResizeCorner =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right';

export interface ResizeRect {
  width: number;
  height: number;
}

export interface ResizeHandleOptions {
  /** Which corners to enable resize handles on. */
  corners: ResizeCorner[];
  /**
   * Minimum width and height. Enforced via clamp during pointer drag -- the
   * dragged dimension cannot fall below this value even if the user drags
   * past it.
   */
  min: ResizeRect;
  /**
   * Maximum width and height. May be a static rect or a function called on
   * every pointer move. The function form receives the target's current
   * bounding rect so consumers can compute viewport-derived caps such as
   * `viewportWidth - rect.left - viewportPadding`. Returning Infinity for a
   * dimension is allowed.
   */
  max: ResizeRect | ((rect: DOMRect) => ResizeRect);
  /** Called continuously during resize with the current dimensions. */
  onResize?: (rect: ResizeRect) => void;
  /** Called once when resize completes (pointerup). */
  onCommit?: (rect: ResizeRect) => void;
  /**
   * Minimum pixel distance from viewport edge to allow a corner handle.
   * Used by `updateVisibility()` to hide handles that would land too close
   * to (or past) the viewport edge. Default: 16.
   */
  viewportPadding?: number;
  /**
   * BEM block prefix for handle class names. The util writes
   * `${block}__handle` + `${block}__handle--{br|bl|tr|tl}` on each handle
   * so the shared `resize-handle` SCSS mixin (instantiated by the
   * consumer with the same block name) styles them. Defaults to
   * `'arvo-hpop'` for backward compatibility with HybridPopover. New
   * consumers (e.g. ArvoPopover) should pass their own block.
   */
  block?: string;
  /**
   * Optional override for the DOM node that hosts the handle elements.
   * Defaults to `target`. Use to scope handles inside a dedicated
   * positioning wrapper (e.g. `.arvo-popover__resize`).
   */
  host?: HTMLElement;
}

export interface ResizeHandleInstance {
  /** Create and append corner handle elements to the target. Returns the created elements. */
  mount: () => HTMLElement[];
  /** Remove corner handles and unbind all listeners. */
  destroy: () => void;
  /** Re-evaluate which corners are visible based on current viewport position. */
  updateVisibility: () => void;
  /** Whether a resize drag is currently in progress. */
  isResizing: () => boolean;
}

interface DragState {
  corner: ResizeCorner;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

function resolveMax(
  max: ResizeRect | ((rect: DOMRect) => ResizeRect),
  rect: DOMRect,
): ResizeRect {
  return typeof max === 'function' ? max(rect) : max;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createResizeHandle(
  target: HTMLElement,
  options: ResizeHandleOptions,
): ResizeHandleInstance {
  const {
    corners,
    min,
    max,
    onResize,
    onCommit,
    viewportPadding = 16,
    block = 'arvo-hpop',
    host = target,
  } = options;

  let dragState: DragState | null = null;
  let destroyed = false;
  const handleElements: HTMLElement[] = [];

  // SVG shipped inside the handle. The two parallel strokes are the bottom-
  // right pattern; SCSS rotates the SVG for the other three corners so we
  // only ship one path geometry. `stroke="currentColor"` lets the panel's
  // CSS choose the color via `var(--arvo-color-b-divider)`.
  const HANDLE_SVG_NS = 'http://www.w3.org/2000/svg';

  function buildHandleSvg(): SVGSVGElement {
    const svg = document.createElementNS(HANDLE_SVG_NS, 'svg') as SVGSVGElement;
    svg.setAttribute('width', '11');
    svg.setAttribute('height', '11');
    svg.setAttribute('viewBox', '0 0 11 11');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const p1 = document.createElementNS(HANDLE_SVG_NS, 'path');
    p1.setAttribute('d', 'M0.706787 10.7068L10.1512 0.706848');
    p1.setAttribute('stroke', 'currentColor');
    p1.setAttribute('stroke-linecap', 'square');
    svg.appendChild(p1);

    const p2 = document.createElementNS(HANDLE_SVG_NS, 'path');
    p2.setAttribute('d', 'M5.15112 10.7064L10.7067 4.82404');
    p2.setAttribute('stroke', 'currentColor');
    p2.setAttribute('stroke-linecap', 'square');
    svg.appendChild(p2);

    return svg;
  }

  function createHandleElement(corner: ResizeCorner): HTMLElement {
    const el = document.createElement('div');
    el.className = `${block}__handle ${block}__handle--${cornerToModifier(corner)}`;
    el.dataset.corner = corner;
    el.setAttribute('aria-hidden', 'true');
    el.appendChild(buildHandleSvg());

    el.addEventListener('pointerdown', onPointerDown);
    return el;
  }

  function cornerToModifier(corner: ResizeCorner): string {
    const map: Record<ResizeCorner, string> = {
      'bottom-left': 'bl',
      'bottom-right': 'br',
      'top-left': 'tl',
      'top-right': 'tr',
    };
    return map[corner];
  }

  function onPointerDown(e: PointerEvent): void {
    if (destroyed || dragState) return;
    e.preventDefault();
    e.stopPropagation();

    const handleEl = e.currentTarget as HTMLElement;
    const corner = handleEl.dataset.corner as ResizeCorner;
    const rect = target.getBoundingClientRect();

    dragState = {
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };

    target.classList.add('is-resizing');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  function computeNewRect(e: PointerEvent): ResizeRect {
    if (!dragState) return { width: 0, height: 0 };

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const maxRect = resolveMax(max, target.getBoundingClientRect());

    let newWidth = dragState.startWidth;
    let newHeight = dragState.startHeight;

    switch (dragState.corner) {
      case 'bottom-right':
        newWidth = dragState.startWidth + dx;
        newHeight = dragState.startHeight + dy;
        break;
      case 'bottom-left':
        newWidth = dragState.startWidth - dx;
        newHeight = dragState.startHeight + dy;
        break;
      case 'top-right':
        newWidth = dragState.startWidth + dx;
        newHeight = dragState.startHeight - dy;
        break;
      case 'top-left':
        newWidth = dragState.startWidth - dx;
        newHeight = dragState.startHeight - dy;
        break;
    }

    return {
      width: clamp(newWidth, min.width, maxRect.width),
      height: clamp(newHeight, min.height, maxRect.height),
    };
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragState) return;
    const rect = computeNewRect(e);
    target.style.width = `${rect.width}px`;
    target.style.height = `${rect.height}px`;
    onResize?.(rect);
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragState) return;
    const rect = computeNewRect(e);
    target.classList.remove('is-resizing');

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    dragState = null;
    onCommit?.(rect);
  }

  function updateVisibility(): void {
    if (destroyed) return;
    const rect = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const el of handleElements) {
      const corner = el.dataset.corner as ResizeCorner;
      let visible = true;

      switch (corner) {
        case 'bottom-right':
        case 'top-right':
          if (vw - rect.right < viewportPadding) visible = false;
          break;
        case 'bottom-left':
        case 'top-left':
          if (rect.left < viewportPadding) visible = false;
          break;
      }

      switch (corner) {
        case 'bottom-left':
        case 'bottom-right':
          if (vh - rect.bottom < viewportPadding) visible = false;
          break;
        case 'top-left':
        case 'top-right':
          if (rect.top < viewportPadding) visible = false;
          break;
      }

      el.style.display = visible ? '' : 'none';
    }
  }

  // Re-evaluate handle visibility on window resize/scroll so handles hide
  // in real time when the panel approaches a viewport edge (e.g. when the
  // popover repositions or the user scrolls a containing element).
  function onViewportChange(): void {
    updateVisibility();
  }

  return {
    mount() {
      for (const corner of corners) {
        const el = createHandleElement(corner);
        handleElements.push(el);
        host.appendChild(el);
      }
      updateVisibility();
      window.addEventListener('resize', onViewportChange);
      window.addEventListener('scroll', onViewportChange, true);
      return [...handleElements];
    },

    destroy() {
      destroyed = true;
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      if (dragState) {
        target.classList.remove('is-resizing');
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        dragState = null;
      }
      for (const el of handleElements) {
        el.removeEventListener('pointerdown', onPointerDown);
        el.remove();
      }
      handleElements.length = 0;
    },

    updateVisibility,

    isResizing() {
      return dragState !== null;
    },
  };
}
