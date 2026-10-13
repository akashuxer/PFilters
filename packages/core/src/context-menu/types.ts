/**
 * Shared types for the framework-agnostic context-menu controller.
 *
 * A context menu is a popup menu opened in response to a "secondary" gesture
 * (pointer right-click, Shift+F10, the ContextMenu key, or an optional touch
 * long-press) rather than from a dedicated, visible trigger button. These
 * types describe the request the controller produces and hands off to the
 * UI layer that owns the actual menu surface.
 */

/** Where the menu should anchor. */
export type ContextMenuAnchor =
  | {
      kind: 'point';
      /** Viewport x coordinate in CSS pixels. */
      x: number;
      /** Viewport y coordinate in CSS pixels. */
      y: number;
    }
  | {
      kind: 'element';
      /** Element to anchor the menu against (typical for keyboard invocation). */
      element: HTMLElement;
    };

/** How the menu request was triggered. */
export type ContextMenuModality = 'pointer' | 'keyboard' | 'touch';

/**
 * A single context-menu invocation. The controller produces one of these per
 * recognized gesture and hands it to the UI layer through `onRequest`.
 *
 * `context` is opaque to the controller -- the consumer supplies a
 * `resolveContext` callback that converts the contextual target element into
 * the entity identity (file id, row id, node id, etc.) that downstream code
 * needs to compute menu items and execute commands.
 */
export interface ContextMenuRequest<TContext = unknown> {
  /** Caller-supplied entity identity for the contextual target. */
  context: TContext;
  /**
   * The contextual target element ("invoker"). For event delegation this is
   * the nearest element matching the selector. For undelegated invocations
   * this is the controller's bound target element.
   */
  invoker: HTMLElement;
  /** Where the menu should anchor (pointer point or focused element). */
  anchor: ContextMenuAnchor;
  /** How the gesture originated. */
  modality: ContextMenuModality;
  /** The original DOM event that produced the request. */
  originalEvent: MouseEvent | KeyboardEvent | TouchEvent;
}

/**
 * The callback the controller hands the consumer for every recognized
 * gesture. The consumer decides whether the request is actionable (e.g. by
 * computing applicable menu items) and confirms it by returning `true` (or
 * a `Promise<boolean>` that resolves true). Only when confirmed will the
 * controller suppress the browser's native context menu via
 * `preventDefault()`.
 *
 * The `confirm()` helper is provided as an alternative to returning a
 * boolean -- some consumers prefer the explicit imperative call (e.g. to
 * call `preventDefault` early on a pointer event before async work).
 */
export type ContextMenuOnRequest<TContext = unknown> = (
  request: ContextMenuRequest<TContext>,
  helpers: ContextMenuRequestHelpers,
) => void | boolean | Promise<void | boolean>;

export interface ContextMenuRequestHelpers {
  /**
   * Call to suppress the browser's native context menu for this gesture.
   * Safe to call multiple times. Has no effect for keyboard / touch
   * modalities (the browser does not show a context menu for those).
   */
  preventDefault: () => void;
}

export interface ContextMenuControllerOptions<TContext = unknown> {
  /**
   * The element the controller binds listeners on. Typically a container
   * that hosts many contextual targets (data grid, tree, file list, canvas).
   */
  target: HTMLElement;

  /**
   * Optional CSS selector used to delegate the gesture to a descendant
   * element. When provided, the controller walks up from the event target
   * to the nearest matching element (via `closest`) and treats THAT element
   * as the invoker. When omitted, the `target` element itself is the
   * invoker for every gesture.
   *
   * Use this for virtualized or recycling collections where you want one
   * controller per surface rather than one controller per row.
   */
  contextSelector?: string;

  /**
   * Convert the resolved invoker element into the consumer's entity
   * context. Defaults to `() => null`.
   */
  resolveContext?: (invoker: HTMLElement) => TContext;

  /**
   * Called whenever the controller recognizes a context-menu gesture.
   * Return `true` (or call `helpers.preventDefault()`) to suppress the
   * native browser menu and own the gesture.
   */
  onRequest: ContextMenuOnRequest<TContext>;

  /**
   * Touch long-press duration in milliseconds. `0` (the default) disables
   * long-press handling -- mobile browsers already synthesize a native
   * `contextmenu` event after a long press, so this is only useful when the
   * consumer wants to handle the gesture earlier or override the native
   * delay.
   */
  longPressMs?: number;

  /**
   * When true, the controller also handles the legacy "Apps" key
   * (`event.key === 'ContextMenu'`) and `Shift+F10`. Default true.
   */
  keyboard?: boolean;
}

export interface ContextMenuController {
  /**
   * Programmatically open the menu at the given anchor. Bypasses event
   * recognition entirely -- callers supply the request payload directly.
   * The consumer's `onRequest` callback is invoked exactly as if the
   * gesture had been recognized.
   */
  request: (init: {
    anchor: ContextMenuAnchor;
    invoker?: HTMLElement;
    context?: unknown;
    modality?: ContextMenuModality;
    originalEvent?: MouseEvent | KeyboardEvent | TouchEvent;
  }) => void;

  /** Tear down all listeners. Safe to call multiple times. */
  destroy: () => void;
}
