import {
  computePosition,
  createPositionWatcher,
  applyPositionToSurface,
} from '../position';
import type {
  Placement,
  PlacementFlip,
  PositionResult,
  PositionWatcher,
  ResolvedPlacement,
} from '../position';
import { createFocusTrap, type FocusTrap } from '../focus';
import { createMask, type MaskInstance, type MaskOptions } from '../mask';
import { enter, exit, type TransitionType } from '../animation';
import { overlayHub } from './overlay-hub';
import type { OverlayHub, OverlayType, OverlayRelation } from './overlay-hub';
import { lockPageScroll } from './page-scroll-lock';

// ---------------------------------------------------------------------------
// OverlaySurface -- the single, framework-agnostic surfacing engine.
//
// This is the Layer 2 "surface engine" from
// `architecture/17-OVERLAY-COMPOSITION-STRATEGY.md`. It consolidates the
// portal/hub + positioning + focus + dismissal + enter/exit + trigger-ARIA
// recipe shared by every overlay component (Popover, ActionMenu, Select,
// Combobox, the four pickers, AlertDialog, Drawer, SidePanel, Toast).
//
// IMPORTANT: this is mechanics ONLY. It renders no chrome (no header,
// footer, title, arrow) and owns no content. The consumer supplies the
// `surface` element (already built) and, for anchored overlays, the
// `trigger` element it owns. The engine never fabricates a trigger.
//
// It is INTERNAL: it is exported from `@arvo/core` so the React hook and the
// vanilla-JS component classes can build on it, but it is NOT a public
// component and application code does not assemble a bare surface with it.
// ---------------------------------------------------------------------------

/** ARIA wiring the engine writes onto the consumer-provided trigger. */
export interface OverlaySurfaceTriggerAria {
  /** `aria-haspopup` value. `false` omits the attribute. */
  haspopup?: 'menu' | 'listbox' | 'dialog' | 'grid' | 'tree' | true | false;
  /** `aria-controls` target id. Defaults to `surface.id` when present. */
  controls?: string;
  /** When true (default) `aria-expanded` reflects the open state. */
  expanded?: boolean;
  /**
   * Optional element to receive the trigger-ARIA attributes
   * (`aria-haspopup`, `aria-controls`, `aria-expanded`) instead of the
   * `trigger`. Use when a composed field anchors positioning + dismissal
   * to a wrapper element (e.g. a form-input field div) but a nested
   * element (e.g. an editable `<input role="combobox">`) is the canonical
   * ARIA target per the WAI-ARIA pattern. `ArvoCombobox` is the canonical
   * consumer. Falls back to `trigger` when unset.
   */
  element?: HTMLElement | null;
}

/** Focus management for the surface while open. */
export interface OverlaySurfaceFocusOptions {
  /**
   * `'trap'` activates a focus trap inside the surface (modal / interactive
   * popover / picker). `'none'` keeps DOM focus where it is -- used by
   * option-list / combobox surfaces that drive `aria-activedescendant` on
   * the trigger while focus stays on the field.
   */
  mode: 'trap' | 'none';
  initialFocus?:
    | HTMLElement
    | (() => HTMLElement | null | undefined)
    | 'first'
    | 'none';
  /** Return focus to the trigger on close. Defaults to true when a trigger exists. */
  returnFocus?: boolean;
  escapeDeactivates?: boolean;
  allowOutsideClick?: boolean;
  getOrderedElements?: () => Array<HTMLElement | null | undefined>;
  /**
   * Activate the trap only AFTER the enter transition completes (slide-in
   * panels: Drawer / SidePanel). Default false (activate immediately).
   */
  activateAfterTransition?: boolean;
}

/** Positioning config. Pass `false` for non-anchored surfaces (modal/toast). */
export interface OverlaySurfacePositionOptions {
  placement?: Placement;
  gap?: number;
  margin?: number;
  width?: 'anchor' | number | string;
  boundary?: HTMLElement;
  observeContainerSelector?: string;
  /**
   * Placement-flip strategy when the requested placement does not fit.
   * Defaults to `'main-axis'` so anchored panels stay on the requested axis
   * (top<->bottom or left<->right) and rely on `maxHeight` clamping +
   * internal scroll when overflowing. Pass `'any'` for tooltip-style
   * components that intentionally cascade to adjacent (perpendicular) sides.
   */
  flip?: PlacementFlip;
  /**
   * When `true`, the surface pins its resolved placement on the first open
   * so that subsequent reposition events triggered by the FLOAT's own size
   * changes (e.g. an action menu filter shrinking its item list) cannot
   * re-resolve to a different side. Reposition events from anchor/container
   * resizes, page scroll, and window resize still re-resolve normally
   * (placement may legitimately flip when the world around the surface
   * changes).
   *
   * Default `false` (existing behavior preserved). Anchored panels with
   * dynamic content -- chiefly `ArvoActionMenu` -- opt in to avoid the
   * flip-flicker the user observes while typing in a filter: as items
   * disappear, the float shrinks, the watcher fires, and `bottom-start`
   * (which previously didn't fit before the filter) is suddenly fit again
   * so the panel jumps back to `bottom-start` mid-interaction.
   */
  lockPlacementOnFloatResize?: boolean;
  /**
   * Custom application of the resolved position to the surface. Defaults to
   * `transform: translate(x, y)` + `--arvo-overlay-max-height` +
   * `--arvo-overlay-width`. Existing components migrating onto the engine
   * pass their own to keep their bespoke CSS variable names.
   */
  apply?: (result: PositionResult, surface: HTMLElement) => void;
}

export interface OverlaySurfaceOptions {
  /** Unique hub id. Auto-generated when omitted. */
  id?: string;
  /** The floating panel element the engine manages. Required. */
  surface: HTMLElement;
  /**
   * Optional outer wrapper element that visually contains the surface and
   * creates a stacking context around it (typically a viewport-spanning
   * `position: fixed; inset: 0` host). When provided, the engine attaches
   * it to the hub so its z-index stays pinned to the surface's hub-assigned
   * value across stack changes. Required for composing overlays such as
   * `ArvoWindow` / `ArvoAlertDialog` whose `__panel` is rendered inside an
   * outer flex-centered `.arvo-{abbr}` root -- without this, the wrapper's
   * SCSS-declared fallback (`--arvo-z-popover: 1000`) traps the panel
   * inside its own stacking context and any sibling overlay above 1000
   * visually obscures the surface.
   *
   * The wrapper element is the consumer's responsibility to mount; the
   * engine only manages its z-index synchronization with the hub.
   */
  surfaceRoot?: HTMLElement;
  /** Hub overlay type (drives stacking + dismissal partitioning). */
  type: OverlayType;
  /** Hub stacking priority. */
  priority?: number;
  /**
   * Per-overlay z-index override forwarded to the hub. When set, the hub
   * uses this value INSTEAD of the computed `zIndexBase + stackIndex * 10`,
   * still clamped to `parent.z + 10` for nested overlays. Prefer
   * `overlayHub.configure({ zIndexBase })` for app-wide tuning; reach for
   * this when a specific surface must escape a higher stacking context in
   * the consumer app.
   */
  zIndex?: number;
  /** Element the surface positions against + wires ARIA + returns focus to. */
  trigger?: HTMLElement | null;
  /** Virtual anchor coordinates, when positioning against a point not an element. */
  anchorRect?: { x: number; y: number } | null;

  /** Parent overlay id when this surface is a nested submenu / inline child. */
  parentId?: string;
  relation?: OverlayRelation;
  /** Override hub focus-trap ownership. Auto-set true when focus.mode === 'trap'. */
  managesOwnFocus?: boolean;
  /** Override hub backdrop ownership. Auto-set true when a mask is configured. */
  managesOwnBackdrop?: boolean;

  /**
   * Mount target. When provided, the engine appends `surface` to the target
   * on open. When omitted, the consumer owns DOM placement (the engine only
   * toggles the open class + behavior).
   */
  mount?: {
    target: HTMLElement | (() => HTMLElement | null);
    /** Remove the surface from the DOM after the exit transition. Default false. */
    removeOnClose?: boolean;
  };

  /** Position config. `false` skips positioning (modal/toast). */
  position?: OverlaySurfacePositionOptions | false;

  /** Focus management. Default `{ mode: 'none' }`. */
  focus?: OverlaySurfaceFocusOptions;

  /** Mask/backdrop. `true` uses defaults; an object customizes it. */
  mask?: boolean | MaskOptions;
  /** Lock page scroll while open (drawer/modal). */
  lockScroll?: boolean;

  /** Close on outside click (hub-driven). Default true. */
  closeOnOutside?: boolean;

  /** Enter/exit transition. `null` disables animation. */
  transition?: TransitionType | null;
  transitionDuration?: number;

  /** Visibility class toggled on the surface. Default `'open'`. */
  openClass?: string;

  /** ARIA written onto the trigger. `false` disables. */
  triggerAria?: OverlaySurfaceTriggerAria | false;

  /** Called after the surface has opened (hub registered, positioned). */
  onOpen?: () => void;
  /** Called after the surface has closed (hub unregistered). */
  onClose?: () => void;
  /** Called on every reposition with the resolved result. */
  onPosition?: (result: PositionResult) => void;

  /** Hub override (React OverlayProvider-scoped hub / tests). Defaults to the singleton. */
  hub?: OverlayHub;
}

export interface OverlaySurface {
  readonly id: string;
  /** Register + position + trap + animate the surface in. Idempotent. */
  open(): Promise<void>;
  /** Unregister + animate out + return focus. Idempotent. */
  close(): Promise<void>;
  isOpen(): boolean;
  /** Re-run positioning immediately. */
  reposition(): void;
  /** Swap the trigger element (re-wires ARIA + return-focus target). */
  setTrigger(trigger: HTMLElement | null): void;
  /**
   * Update the virtual anchor coordinates (for point-anchored surfaces such
   * as context menus). When called while open the surface is repositioned
   * immediately. Pass `null` to clear the virtual anchor.
   */
  setAnchorRect(rect: { x: number; y: number } | null): void;
  /** Tear down all listeners, hub entry, mask, and restore the trigger. */
  destroy(): void;
}

const DEFAULT_TRANSITION_DURATION = 150;

let _idCounter = 0;

function resolveMountTarget(
  target: HTMLElement | (() => HTMLElement | null),
): HTMLElement | null {
  return typeof target === 'function' ? target() : target;
}

// Positioning uses the standalone `translate` CSS property (NOT
// `transform: translate(...)`) so per-component SCSS can animate
// `transform` independently of the engine's positioning writes. We also
// write `data-arvo-side` with the resolved placement's primary side so
// SCSS can apply direction-aware enter/exit animations. Delegated to the
// `applyPositionToSurface` helper in `@arvo/core/position` so the same
// behavior is reusable from per-component `apply` overrides.
function defaultApplyPosition(result: PositionResult, surface: HTMLElement): void {
  applyPositionToSurface(result, surface);
}

// Resolves the position `width` option (the same `'anchor' | number | string`
// shape consumed by `computePosition` / `resolveWidth`) into a CSS length
// string usable as `--arvo-overlay-width`. Mirrors `resolveWidth()` in
// `compute.ts` but takes the trigger ELEMENT (rather than a pre-measured
// width) so callers can pre-paint the var before the first measurement.
function resolveSurfaceWidth(
  width: 'anchor' | number | string | undefined,
  trigger: HTMLElement | null,
): string | null {
  if (width == null) return null;
  if (width === 'anchor') {
    if (!trigger) return null;
    return `${trigger.getBoundingClientRect().width}px`;
  }
  if (typeof width === 'number') return `${width}px`;
  return width;
}

/**
 * Creates an overlay surface controller around a consumer-built panel.
 *
 * The returned controller owns the surfacing lifecycle; the consumer owns
 * the panel's content and the trigger element. See the module header.
 */
export function createOverlaySurface(options: OverlaySurfaceOptions): OverlaySurface {
  const hub = options.hub ?? overlayHub;
  const id = options.id ?? `arvo-surface-${++_idCounter}`;
  const surface = options.surface;
  const openClass = options.openClass ?? 'open';

  let _trigger: HTMLElement | null = options.trigger ?? null;
  // Cached placement from the first `computePosition` call after open. When
  // `position.lockPlacementOnFloatResize` is true, the watcher's
  // `'float-size'` updates reuse this value so float-content resizes never
  // re-resolve placement (eliminates filter-induced flip flicker).
  let _lockedPlacement: ResolvedPlacement | null = null;
  // Virtual point anchor is stored as PAGE coords (document-absolute) so the
  // surface stays pinned to the same point in the document while the user
  // scrolls or zooms. The position engine consumes viewport coords, so on
  // every compute we derive `{ x: pageX - scrollX, y: pageY - scrollY }`.
  // Public API (`setAnchorRect`, options.anchorRect) still accepts viewport
  // coords (matches the contextmenu event's `clientX/clientY`) -- the
  // viewport->page conversion happens internally at the time the value is
  // stored, and the reverse conversion happens on each compute.
  let _anchorPagePoint: { x: number; y: number } | null =
    viewportToPagePoint(options.anchorRect ?? null);
  let _isOpen = false;
  let _watcher: PositionWatcher | null = null;
  let _trap: FocusTrap | null = null;
  let _mask: MaskInstance | null = null;
  let _unlockScroll: (() => void) | null = null;
  // Guards reentrancy when the hub's outside-click / Escape handler invokes
  // our onClose while we are already tearing down.
  let _closing = false;

  function viewportToPagePoint(
    rect: { x: number; y: number } | null,
  ): { x: number; y: number } | null {
    if (!rect) return null;
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY };
  }

  function liveAnchorPoint(): { x: number; y: number } | null {
    if (!_anchorPagePoint) return null;
    return {
      x: _anchorPagePoint.x - window.scrollX,
      y: _anchorPagePoint.y - window.scrollY,
    };
  }

  /**
   * Resolves the element that should receive the trigger-ARIA trio
   * (`aria-haspopup` / `aria-controls` / `aria-expanded`).
   *
   * Returns `triggerAria.element` when set (a composed field can route ARIA
   * onto a nested element distinct from the positioning anchor), otherwise
   * falls back to the trigger. Lazy at call time so consumers that swap
   * the ARIA target after init still resolve correctly.
   */
  function ariaTargetEl(): HTMLElement | null {
    if (options.triggerAria === false) return null;
    const aria = options.triggerAria ?? {};
    return aria.element ?? _trigger;
  }

  function wireTriggerAria(): void {
    if (options.triggerAria === false) return;
    const el = ariaTargetEl();
    if (!el) return;
    const aria = options.triggerAria ?? {};
    if (aria.haspopup !== false) {
      el.setAttribute(
        'aria-haspopup',
        aria.haspopup == null || aria.haspopup === true ? 'true' : aria.haspopup,
      );
    }
    const controls = aria.controls ?? (surface.id || undefined);
    if (controls) el.setAttribute('aria-controls', controls);
    if (aria.expanded !== false) el.setAttribute('aria-expanded', 'false');
  }

  function setExpanded(expanded: boolean): void {
    if (options.triggerAria === false) return;
    if ((options.triggerAria ?? {}).expanded === false) return;
    const el = ariaTargetEl();
    if (!el) return;
    el.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function applyPosition(result: PositionResult): void {
    if (options.position === false) return;
    const apply = options.position?.apply ?? defaultApplyPosition;
    apply(result, surface);
    options.onPosition?.(result);
  }

  function startPositioning(): void {
    if (options.position === false) return;
    const livePoint = liveAnchorPoint();
    const anchor: HTMLElement | { x: number; y: number } | null =
      _trigger ?? livePoint ?? null;
    if (!anchor) return;
    const posOpts = {
      placement: options.position?.placement,
      gap: options.position?.gap,
      margin: options.position?.margin,
      width: options.position?.width,
      boundary: options.position?.boundary,
      flip: options.position?.flip,
    };
    // Pre-paint the resolved width on the surface BEFORE the first
    // `computePosition` call. OptionList SCSS (and any other surface that
    // defaults its width to the overlay var) sizes against
    // `var(--arvo-overlay-width, ...)`; without this, the first measurement
    // sees the unset var fallback (typically 100% of the containing block),
    // `computePosition` then clamps `x` to the boundary edge, and the panel
    // paints at the viewport edge for one frame before the watcher fires
    // and corrects. `defaultApplyPosition` still re-writes this var on
    // every result so post-flip width adjustments stay in sync.
    const resolvedWidth = resolveSurfaceWidth(options.position?.width, _trigger);
    if (resolvedWidth != null) {
      surface.style.setProperty('--arvo-overlay-width', resolvedWidth);
    }

    // First compute -- run with the consumer-requested placement and cache
    // the resolved side for placement-lock surfaces.
    const initial = computePosition(anchor, surface, posOpts);
    _lockedPlacement = initial.placement;
    applyPosition(initial);

    const lockOnFloatSize =
      options.position?.lockPlacementOnFloatResize === true;

    // Watcher callback: when placement-locking is enabled and the trigger
    // source is the float's own ResizeObserver, force `posOpts.placement`
    // to the cached side so float-content resizes (filter shrink/grow,
    // dynamic items, search-empty state, etc.) cannot flip the panel.
    // Full-scope events (anchor / container resize, scroll, window resize)
    // bypass the lock so legitimate world-changes still re-resolve.
    const onWatcherUpdate = (
      _result: PositionResult,
      source: 'full' | 'float-size',
    ): void => {
      if (
        lockOnFloatSize &&
        source === 'float-size' &&
        _lockedPlacement != null
      ) {
        const lockedAnchor: HTMLElement | { x: number; y: number } | null =
          _trigger ?? liveAnchorPoint() ?? null;
        if (!lockedAnchor) return;
        const locked = computePosition(lockedAnchor, surface, {
          ...posOpts,
          placement: _lockedPlacement,
        });
        applyPosition(locked);
        return;
      }
      // Full-source update OR locking disabled: trust the watcher's result
      // (computed with the original options) and refresh the cache so any
      // legitimate flip persists for subsequent float-size updates.
      _lockedPlacement = _result.placement;
      applyPosition(_result);
    };

    if (_trigger) {
      _watcher = createPositionWatcher(
        _trigger,
        surface,
        { ...posOpts, observeContainerSelector: options.position?.observeContainerSelector },
        onWatcherUpdate,
      );
    } else if (_anchorPagePoint) {
      // Virtual point anchor: install a watcher that re-derives the
      // viewport-relative point from the stored page-coords on every
      // compute. This keeps the surface pinned to the same document
      // point as the user scrolls or zooms (window resize / scroll fires
      // the watcher's listeners). Without this, the panel would stay at
      // its open-time viewport position and drift away from the content
      // it was anchored to.
      _watcher = createPositionWatcher(
        () => liveAnchorPoint() ?? { x: 0, y: 0 },
        surface,
        { ...posOpts, observeContainerSelector: options.position?.observeContainerSelector },
        onWatcherUpdate,
      );
    }
  }

  function activateTrap(): void {
    const focus = options.focus;
    if (!focus || focus.mode !== 'trap') return;
    _trap = createFocusTrap();
    _trap.activate({
      container: surface,
      initialFocus: focus.initialFocus ?? 'first',
      returnFocusOnDeactivate: focus.returnFocus ?? Boolean(_trigger),
      escapeDeactivates: focus.escapeDeactivates ?? false,
      allowOutsideClick: focus.allowOutsideClick ?? true,
      getOrderedElements: focus.getOrderedElements,
      // Canonical return target -- always prefer the live trigger element
      // over `saveFocus()`'s "whichever element happened to be focused at
      // activation time" capture. The latter is fragile: if the component
      // moves DOM focus AFTER activation (e.g. ActionMenu's filter search
      // input on rAF), or the trap is re-activated for any reason, the
      // saved focus drifts to the wrong element and restoreFocus targets
      // something that no longer exists on close. The function form re-
      // resolves the trigger lazily so a re-triggered surface still hits
      // the right element.
      returnFocusTo: () => _trigger,
    });
  }

  function setupMask(): void {
    if (!options.mask) return;
    const maskOpts: MaskOptions =
      options.mask === true ? {} : { ...options.mask };
    _mask = createMask(maskOpts);
    _mask.show();
    // Sit the mask directly beneath the surface's hub-assigned z-index.
    const z = hub.getZIndex(id);
    _mask.element.style.zIndex = String(z - 1);
    // Register with the hub so subsequent stack changes (sibling overlays
    // opening / closing) keep the mask z-index pinned to `surface.z - 1`.
    // Without this the mask is set ONCE at open-time and any later refresh
    // of the surface's own z-index leaves the mask at a stale value, which
    // can cause masks to visually drift across an open neighbour overlay.
    hub.attachMaskElement(id, _mask.element);
  }

  const surfaceApi: OverlaySurface = {
    id,

    async open(): Promise<void> {
      if (_isOpen) return;
      _isOpen = true;
      _closing = false;

      if (options.mount) {
        const target = resolveMountTarget(options.mount.target);
        target?.appendChild(surface);
      }

      surface.classList.add(openClass);
      setExpanded(true);

      const focusIsTrap = options.focus?.mode === 'trap';
      hub.open({
        id,
        type: options.type,
        element: surface,
        triggerElement: _trigger ?? undefined,
        priority: options.priority ?? 0,
        parentId: options.parentId,
        relation: options.relation,
        zIndex: options.zIndex,
        config: {
          autoCloseOnOutsideClick: options.closeOnOutside ?? true,
          // Avoid the hub double-trapping/painting when the engine owns it.
          managesOwnFocus: options.managesOwnFocus ?? focusIsTrap,
          managesOwnBackdrop: options.managesOwnBackdrop ?? Boolean(options.mask),
        },
        onClose: () => {
          // Hub-driven dismissal (outside click / Escape / route change).
          void surfaceApi.close();
        },
      });

      // Hoist the outer wrapper's stacking context to the same z-index as
      // the surface so consumer-level zIndexBase tuning reaches the whole
      // host (otherwise the wrapper's CSS fallback creates a stacking
      // context that traps the surface beneath sibling overlays).
      if (options.surfaceRoot) {
        hub.attachWrapperElement(id, options.surfaceRoot);
      }

      startPositioning();
      setupMask();

      if (options.lockScroll) {
        _unlockScroll = lockPageScroll();
      }

      const trapAfter = options.focus?.activateAfterTransition;
      if (!trapAfter) activateTrap();

      options.onOpen?.();

      if (options.transition) {
        await enter({
          element: surface,
          type: options.transition,
          duration: options.transitionDuration ?? DEFAULT_TRANSITION_DURATION,
        });
      }

      if (trapAfter && _isOpen) activateTrap();
    },

    async close(): Promise<void> {
      if (!_isOpen || _closing) return;
      _closing = true;
      _isOpen = false;

      _trap?.deactivate();
      _trap = null;

      _watcher?.destroy();
      _watcher = null;
      // Forget the locked placement so the next open() resolves freshly
      // against whatever world we open into.
      _lockedPlacement = null;

      hub.attachMaskElement(id, null);
      _mask?.hide();
      _mask = null;

      // Detach the outer wrapper (if any) BEFORE we remove the hub entry so
      // the hub can clear the inline z-index it painted onto the wrapper.
      if (options.surfaceRoot) {
        hub.attachWrapperElement(id, null);
      }

      _unlockScroll?.();
      _unlockScroll = null;

      // Unregister from the hub. Idempotent if the hub already removed us.
      hub.close(id);

      setExpanded(false);

      options.onClose?.();

      if (options.transition) {
        await exit({
          element: surface,
          type: options.transition,
          duration: options.transitionDuration ?? DEFAULT_TRANSITION_DURATION,
          onComplete: () => {
            surface.classList.remove(openClass);
            if (options.mount?.removeOnClose) surface.remove();
          },
        });
      } else {
        surface.classList.remove(openClass);
        if (options.mount?.removeOnClose) surface.remove();
      }

      // Return focus to the trigger when the engine owns focus management.
      // Belt-and-braces: we always re-focus the trigger on close (not just
      // the non-trap path), provided the consumer hasn't opted out via
      // `focus.returnFocus: false`. The focus trap's `returnFocusTo`
      // already targets the live trigger, but a second explicit focus
      // here covers the cases where:
      //   - focus shifted out of the surface during the exit transition
      //     (e.g. a click on another element while fading out),
      //   - the trap was deactivated externally before close,
      //   - the consumer manages its own trap (`managesOwnFocus: true`)
      //     and never set `returnFocusTo`.
      //
      // CRITICAL: this fires AFTER `await exit(...)` resolves, so any
      // sibling overlay opened while we were tearing down (e.g. clicking
      // dropdown B while dropdown A was open -- applyStackingRules
      // closes A synchronously and B then activates its own trap +
      // focuses its first item) has already taken focus by the time we
      // run. Without a guard, the belt-and-braces below drags focus
      // BACK to our (now-closed) trigger, leaving the user one
      // ArrowDown away from re-opening this surface and toppling the
      // sibling. Only restore focus when it has been lost (body /
      // documentElement / null) OR is still inside our own surface (the
      // surface is about to be hidden/removed so focus must go
      // somewhere). Focus that has legitimately moved to ANY other
      // element -- a sibling overlay's panel, an arbitrary element a
      // mid-transition click landed on -- is left alone.
      const returnFocus = options.focus?.returnFocus ?? Boolean(_trigger);
      const focused = document.activeElement as Node | null;
      const focusIsLost =
        !focused ||
        focused === document.body ||
        focused === document.documentElement;
      const focusIsInClosingSurface =
        focused != null && surface.contains(focused);
      if (
        returnFocus &&
        _trigger &&
        document.body.contains(_trigger) &&
        document.activeElement !== _trigger &&
        !_trigger.contains(document.activeElement) &&
        (focusIsLost || focusIsInClosingSurface)
      ) {
        _trigger.focus({ preventScroll: true });
      }

      _closing = false;
    },

    isOpen(): boolean {
      return _isOpen;
    },

    reposition(): void {
      if (!_isOpen) return;
      if (_watcher) {
        _watcher.update();
      } else if (_anchorPagePoint && options.position !== false) {
        // Defensive fallback: virtual anchor + watcher missing (e.g. the
        // consumer destroyed the watcher manually). Recompute against the
        // live viewport-derived point.
        const livePoint = liveAnchorPoint();
        if (!livePoint) return;
        const posOpts = {
          placement: options.position?.placement,
          gap: options.position?.gap,
          margin: options.position?.margin,
          width: options.position?.width,
          boundary: options.position?.boundary,
          flip: options.position?.flip,
        };
        applyPosition(computePosition(livePoint, surface, posOpts));
      }
    },

    setTrigger(trigger: HTMLElement | null): void {
      const previousTrigger = _trigger;
      _trigger = trigger;
      wireTriggerAria();
      // The watcher captures the anchor element by identity at creation
      // time. Any change in trigger identity (or in anchor kind, e.g.
      // element <-> point) must reinstall the watcher so it observes the
      // right element and produces correct positions.
      if (_isOpen && previousTrigger !== trigger) {
        _watcher?.destroy();
        _watcher = null;
        startPositioning();
      } else if (_isOpen) {
        surfaceApi.reposition();
      }
    },

    setAnchorRect(rect: { x: number; y: number } | null): void {
      // Convert the viewport-coords value supplied by the caller (matches
      // a contextmenu event's `clientX/clientY`) to PAGE coords so the
      // surface tracks the document point as the user scrolls or zooms.
      const wasPoint = _anchorPagePoint != null;
      _anchorPagePoint = viewportToPagePoint(rect);
      const nowPoint = _anchorPagePoint != null;
      if (_isOpen) {
        // If we transitioned between virtual-anchor and element-only modes,
        // reinstall the watcher so the right kind of provider is bound.
        if (!_trigger && wasPoint !== nowPoint) {
          _watcher?.destroy();
          _watcher = null;
          startPositioning();
        } else {
          // Watcher's `currentAnchor()` reads through to `liveAnchorPoint()`,
          // so the fresh page-coord propagates automatically on update.
          surfaceApi.reposition();
        }
      }
    },

    destroy(): void {
      if (_isOpen) {
        _isOpen = false;
        _trap?.deactivate();
        _trap = null;
        _watcher?.destroy();
        _watcher = null;
        _lockedPlacement = null;
        _mask?.destroy();
        _mask = null;
        if (options.surfaceRoot) {
          hub.attachWrapperElement(id, null);
        }
        _unlockScroll?.();
        _unlockScroll = null;
        hub.close(id);
      }
      if (options.triggerAria !== false) {
        const el = ariaTargetEl();
        if (el) {
          el.removeAttribute('aria-haspopup');
          el.removeAttribute('aria-controls');
          el.removeAttribute('aria-expanded');
        }
      }
    },
  };

  wireTriggerAria();

  return surfaceApi;
}
