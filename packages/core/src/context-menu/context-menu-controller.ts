/**
 * Framework-agnostic context-menu gesture controller.
 *
 * Binds `contextmenu`, `keydown` (Shift+F10 and the "ContextMenu"/"Apps"
 * key), and optional touch long-press listeners on a target element, then
 * normalizes each recognized gesture into a `ContextMenuRequest` and hands
 * it to the consumer through the `onRequest` callback.
 *
 * Design notes:
 * - The controller is "request only" -- it does NOT open or render a menu.
 *   The consumer (typically `ArvoContextMenu`) decides whether the request
 *   is actionable (e.g. by checking that the resolved context has
 *   applicable items) and opens its own surface.
 * - `preventDefault()` is only invoked when the consumer confirms the
 *   request (either by returning `true` from `onRequest` or by calling
 *   `helpers.preventDefault()` explicitly). When no menu items apply, the
 *   browser's native menu is preserved. This matches the recommendation in
 *   the WAI-ARIA APG and avoids stomping on native text-selection,
 *   editable-field, link, image, and developer-tooling menus.
 * - Modality detection: pointer events from a `contextmenu` event with a
 *   resolvable client position are reported as `'pointer'`. Keyboard
 *   gestures (`Shift+F10`, `ContextMenu`/"Apps" key) are `'keyboard'` and
 *   anchor to the focused element. Touch long-press is `'touch'` and
 *   anchors to the touch point.
 * - Single-instance-per-surface: a typical consumer creates one controller
 *   per logical surface (one per data grid, one per tree). The
 *   `contextSelector` option then routes every gesture to the nearest
 *   matching descendant via `closest`, which is how virtualized
 *   collections share one controller across many recycled rows.
 *
 * This file MUST stay free of DOM-rendering concerns -- it is consumed by
 * both the React hook (`useContextMenuController`) and the JS class
 * (`ArvoContextMenu`).
 */

import type {
  ContextMenuAnchor,
  ContextMenuController,
  ContextMenuControllerOptions,
  ContextMenuRequest,
} from './types';

const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

function isContextMenuKey(event: KeyboardEvent): boolean {
  if (event.key === 'ContextMenu') return true;
  if (event.shiftKey && event.key === 'F10') return true;
  return false;
}

function resolveInvoker(
  raw: EventTarget | null,
  selector: string | undefined,
  target: HTMLElement,
): HTMLElement | null {
  if (!(raw instanceof Element)) {
    return selector ? null : target;
  }
  if (!selector) {
    // Without delegation, every gesture maps to the bound target.
    return target;
  }
  const match = raw.closest(selector);
  if (!(match instanceof HTMLElement)) return null;
  // Defensive: when the descendant is detached or in a portal that escapes
  // the target subtree, don't claim the gesture.
  if (!target.contains(match)) return null;
  return match;
}

function anchorFromPointerEvent(
  event: MouseEvent,
): ContextMenuAnchor {
  return { kind: 'point', x: event.clientX, y: event.clientY };
}

function anchorFromElement(element: HTMLElement): ContextMenuAnchor {
  return { kind: 'element', element };
}

// Helper kept for the touch long-press path (currently unused by the
// controller body; prefixed with `_` so the no-unused-vars rule allows it).
function _anchorFromTouchPoint(
  touch: Touch,
): ContextMenuAnchor {
  return { kind: 'point', x: touch.clientX, y: touch.clientY };
}

export function createContextMenuController<TContext = unknown>(
  options: ContextMenuControllerOptions<TContext>,
): ContextMenuController {
  const {
    target,
    contextSelector,
    resolveContext,
    onRequest,
    longPressMs = 0,
    keyboard = true,
  } = options;

  let destroyed = false;

  // -- Touch long-press scratch state -----------------------------------
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressStartX = 0;
  let longPressStartY = 0;
  let longPressInvoker: HTMLElement | null = null;
  let longPressTouchId: number | null = null;

  function dispatch(
    request: ContextMenuRequest<TContext>,
    nativeEvent: { preventDefault: () => void } | null,
  ): void {
    if (destroyed) return;
    let prevented = false;
    const helpers = {
      preventDefault: () => {
        if (prevented) return;
        prevented = true;
        nativeEvent?.preventDefault();
      },
    };
    const ret = onRequest(request, helpers);
    const finalize = (decision: void | boolean): void => {
      if (decision === true) helpers.preventDefault();
    };
    if (ret && typeof (ret as Promise<unknown>).then === 'function') {
      (ret as Promise<void | boolean>).then(finalize, () => {});
    } else {
      finalize(ret as void | boolean);
    }
  }

  function buildRequest(
    invoker: HTMLElement,
    anchor: ContextMenuAnchor,
    modality: ContextMenuRequest<TContext>['modality'],
    originalEvent: MouseEvent | KeyboardEvent | TouchEvent,
  ): ContextMenuRequest<TContext> {
    const context = resolveContext
      ? resolveContext(invoker)
      : (null as unknown as TContext);
    return { context, invoker, anchor, modality, originalEvent };
  }

  // -- Native contextmenu ------------------------------------------------
  function handleContextMenu(event: MouseEvent): void {
    if (destroyed) return;
    const invoker = resolveInvoker(event.target, contextSelector, target);
    if (!invoker) return;
    // Pointer events with no usable coordinates (e.g. some synthetic
    // events) fall back to anchoring at the invoker element.
    const hasPoint = Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
    const anchor = hasPoint
      ? anchorFromPointerEvent(event)
      : anchorFromElement(invoker);
    dispatch(buildRequest(invoker, anchor, 'pointer', event), event);
  }

  // -- Keyboard (Shift+F10, ContextMenu/Apps key) ------------------------
  function handleKeyDown(event: KeyboardEvent): void {
    if (destroyed || !keyboard) return;
    if (!isContextMenuKey(event)) return;
    // Prefer the currently focused element (when it is inside our subtree
    // and matches the selector). Fall back to the event target.
    const active =
      target.ownerDocument.activeElement instanceof HTMLElement
        ? target.ownerDocument.activeElement
        : null;
    const candidate = active && target.contains(active) ? active : event.target;
    const invoker = resolveInvoker(candidate, contextSelector, target);
    if (!invoker) return;
    dispatch(
      buildRequest(invoker, anchorFromElement(invoker), 'keyboard', event),
      event,
    );
  }

  // -- Touch long-press --------------------------------------------------
  function clearLongPress(): void {
    if (longPressTimer !== undefined) {
      clearTimeout(longPressTimer);
      longPressTimer = undefined;
    }
    longPressInvoker = null;
    longPressTouchId = null;
  }

  function handleTouchStart(event: TouchEvent): void {
    if (destroyed || longPressMs <= 0) return;
    if (event.touches.length !== 1) {
      clearLongPress();
      return;
    }
    const touch = event.touches[0];
    const invoker = resolveInvoker(event.target, contextSelector, target);
    if (!invoker) return;
    longPressInvoker = invoker;
    longPressStartX = touch.clientX;
    longPressStartY = touch.clientY;
    longPressTouchId = touch.identifier;
    longPressTimer = setTimeout(() => {
      longPressTimer = undefined;
      const inv = longPressInvoker;
      if (!inv) return;
      dispatch(
        buildRequest(
          inv,
          { kind: 'point', x: longPressStartX, y: longPressStartY },
          'touch',
          event,
        ),
        event,
      );
      clearLongPress();
    }, longPressMs);
  }

  function handleTouchMove(event: TouchEvent): void {
    if (destroyed || longPressTimer === undefined) return;
    let touch: Touch | null = null;
    for (let i = 0; i < event.changedTouches.length; i++) {
      if (event.changedTouches[i].identifier === longPressTouchId) {
        touch = event.changedTouches[i];
        break;
      }
    }
    if (!touch) return;
    const dx = touch.clientX - longPressStartX;
    const dy = touch.clientY - longPressStartY;
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_TOLERANCE_PX * LONG_PRESS_MOVE_TOLERANCE_PX) {
      clearLongPress();
    }
  }

  function handleTouchEndOrCancel(): void {
    clearLongPress();
  }

  target.addEventListener('contextmenu', handleContextMenu as EventListener);
  if (keyboard) {
    target.addEventListener('keydown', handleKeyDown as EventListener);
  }
  if (longPressMs > 0) {
    target.addEventListener('touchstart', handleTouchStart as EventListener, {
      passive: true,
    } as AddEventListenerOptions);
    target.addEventListener('touchmove', handleTouchMove as EventListener, {
      passive: true,
    } as AddEventListenerOptions);
    target.addEventListener('touchend', handleTouchEndOrCancel as EventListener);
    target.addEventListener('touchcancel', handleTouchEndOrCancel as EventListener);
  }

  return {
    request(init): void {
      if (destroyed) return;
      const invoker = init.invoker ?? target;
      const modality = init.modality ?? 'pointer';
      const fakeEvent =
        init.originalEvent ??
        ({
          preventDefault: () => {},
        } as unknown as MouseEvent);
      dispatch(
        {
          context: (init.context ?? (resolveContext ? resolveContext(invoker) : null)) as TContext,
          invoker,
          anchor: init.anchor,
          modality,
          originalEvent: fakeEvent,
        },
        fakeEvent,
      );
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      clearLongPress();
      target.removeEventListener('contextmenu', handleContextMenu as EventListener);
      if (keyboard) {
        target.removeEventListener('keydown', handleKeyDown as EventListener);
      }
      if (longPressMs > 0) {
        target.removeEventListener('touchstart', handleTouchStart as EventListener);
        target.removeEventListener('touchmove', handleTouchMove as EventListener);
        target.removeEventListener('touchend', handleTouchEndOrCancel as EventListener);
        target.removeEventListener('touchcancel', handleTouchEndOrCancel as EventListener);
      }
    },
  };
}
