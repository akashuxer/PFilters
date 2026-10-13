// Shared helpers for overlay footer action layout (Popover, HybridPopover,
// SidePanel, Drawer, Window, AlertDialog).
//
// Two responsibilities:
//
//   1. `clampFooterActions` -- enforce the project-wide "max 3 footer
//      actions" rule consistently across the overlay family. Slices the
//      array and emits a single dev-mode warning per call so the issue
//      surfaces during development without crashing prod.
//
//   2. `attachOverlayFooterFit` -- optional measurement helper that
//      grows the equal-column flex basis (via the shared
//      `--arvo-overlay-footer-btn-min` CSS variable) when any labeled
//      button's label would otherwise truncate at 112px. Capped by the
//      available footer width so labels still ellipsize when there is
//      genuinely no room. Pairs with the
//      `overlay-footer-actions-layout` SCSS mixin.

const DEFAULT_BTN_MIN = 112; // px -- matches `$arvo-window-btn-wmin`.

// ---------------------------------------------------------------------------
// clampFooterActions
// ---------------------------------------------------------------------------

export interface ClampFooterActionsOptions {
  /** Hard cap on the number of footer actions. Defaults to 3. */
  max?: number;
  /**
   * Component name used in the dev warning so consumers can find the
   * offending overlay. E.g. `'ArvoPopover'`, `'ArvoSidePanel'`.
   */
  componentName?: string;
}

/**
 * Clamp an action array to at most `max` items (default 3). Returns the
 * original reference when the array already fits, so callers can use the
 * result directly in render output without spurious re-renders. When the
 * array exceeds the cap, emits a single `console.warn` (dev mode only --
 * silenced in production builds by tree-shaking) and returns a new
 * `slice(0, max)`.
 */
export function clampFooterActions<T>(
  actions: readonly T[] | T[] | null | undefined,
  options: ClampFooterActionsOptions = {},
): T[] {
  const max = options.max ?? 3;
  if (!actions || actions.length === 0) return [];
  if (actions.length <= max) {
    return Array.isArray(actions) && !Object.isFrozen(actions)
      ? (actions as T[])
      : Array.from(actions);
  }
  const componentName = options.componentName ?? 'overlay';
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      `[arvo] ${componentName} footer received ${actions.length} actions; ` +
        `max is ${max}. Excess actions are dropped. Re-evaluate the surface ` +
        `or move secondary actions out of the footer.`,
    );
  }
  return Array.from(actions).slice(0, max);
}

// ---------------------------------------------------------------------------
// attachOverlayFooterFit
// ---------------------------------------------------------------------------

export interface OverlayFooterFitOptions {
  /**
   * Default per-button flex basis in pixels. Falls back to 112 (matches
   * the `$arvo-window-btn-wmin` token / SCSS default).
   */
  defaultBtnMin?: number;
  /**
   * CSS gap between buttons in pixels. Must match the consumer's gap
   * (the SCSS default reads `--arvo-overlay-footer-gap` which itself
   * defaults to `$arvo-space-6` = 6px). When omitted, defaults to 6.
   */
  gap?: number;
}

export interface OverlayFooterFitHandle {
  /**
   * Force a fresh measurement pass. Call after dynamic action label
   * changes that don't trigger the `ResizeObserver` (e.g. text content
   * mutated without a layout change on the container).
   */
  measure: () => void;
  destroy: () => void;
}

/**
 * Wire a `ResizeObserver` to the overlay footer action container so the
 * shared `--arvo-overlay-footer-btn-min` CSS variable grows to fit the
 * widest label that would otherwise truncate at the default 112px floor.
 * Capped by the available footer width so labels still fall back to
 * ellipsis when there's genuinely no room. Idempotent destroy.
 *
 * Returns `{ measure, destroy }`. `measure` re-runs the calculation on
 * demand; `destroy` disconnects the observer and clears the CSS
 * variable.
 */
export function attachOverlayFooterFit(
  container: HTMLElement,
  options: OverlayFooterFitOptions = {},
): OverlayFooterFitHandle {
  const defaultMin = options.defaultBtnMin ?? DEFAULT_BTN_MIN;
  const gap = options.gap ?? 6;

  if (
    typeof window === 'undefined' ||
    typeof ResizeObserver === 'undefined'
  ) {
    return {
      measure: () => {},
      destroy: () => {},
    };
  }

  let destroyed = false;
  let raf = 0;

  const labeledSelector = [
    ':scope > .arvo-btn:not(.arvo-btn--icon-only)',
    ':scope > .arvo-dd-btn:not(.arvo-dd-btn--icon-only)',
    ':scope > .arvo-split-btn:not(.arvo-split-btn--icon-only)',
  ].join(', ');

  function measureNow(): void {
    if (destroyed) return;
    const labeledBtns = Array.from(
      container.querySelectorAll<HTMLElement>(labeledSelector),
    );
    if (labeledBtns.length === 0) {
      container.style.removeProperty('--arvo-overlay-footer-btn-min');
      container.style.minWidth = '';
      return;
    }

    // Sample each button's TRUE natural width (label + chrome + icon + gap).
    // The shared SCSS mixin uses `flex: 0 1 var(--arvo-overlay-footer-btn-min, 112px)`,
    // so we temporarily set the basis to `auto` so each button collapses to
    // its intrinsic max-content, then pick the widest sample (capped by
    // container width) as the new basis. Sampling `auto` is critical: at
    // any fixed basis a short label gets padded out to that width, which
    // makes `button.offsetWidth - label.offsetWidth` over-report chrome
    // and permanently inflate the basis after the first measurement.
    const previousBasis = container.style.getPropertyValue(
      '--arvo-overlay-footer-btn-min',
    );
    const previousMinWidth = container.style.minWidth;
    // Also clear minWidth during measurement so a previously-set ideal
    // cluster width doesn't pin the container while we read natural
    // button widths.
    container.style.minWidth = '';
    container.style.setProperty('--arvo-overlay-footer-btn-min', 'auto');

    let widestBtn = 0;
    labeledBtns.forEach((btn) => {
      // `offsetWidth` reflects the post-layout box. With basis=auto and
      // flex-grow=0 the button collapses to label + chrome (capped by
      // any per-button max-width such as `arvo-btn`'s 164px).
      const w = btn.offsetWidth;
      if (w > widestBtn) widestBtn = w;
    });

    // Restore the previous variable / min-width BEFORE the early-return
    // so we never leave the auto state visible to a subsequent
    // ResizeObserver pass.
    if (previousBasis) {
      container.style.setProperty('--arvo-overlay-footer-btn-min', previousBasis);
    } else {
      container.style.removeProperty('--arvo-overlay-footer-btn-min');
    }
    container.style.minWidth = previousMinWidth;

    if (widestBtn === 0) return;

    const count = labeledBtns.length;
    const totalGap = Math.max(0, count - 1) * gap;
    // Cap the per-button basis by the PARENT'S available width, not
    // the container's current clientWidth. The container itself may be
    // sized to its children's natural max-content (Window's `__actions`
    // uses `flex: 0 0 auto`), so reading its current width would lock
    // the basis at the natural-widths floor. The parent reflects the
    // real available room.
    const parent = container.parentElement;
    const parentWidth =
      parent && parent.clientWidth > 0 ? parent.clientWidth : container.clientWidth;
    const maxPerBtn =
      count > 0 ? Math.floor((parentWidth - totalGap) / count) : defaultMin;

    const next = Math.max(defaultMin, Math.min(widestBtn, maxPerBtn));

    container.style.setProperty(
      '--arvo-overlay-footer-btn-min',
      `${next}px`,
    );

    // Pin the container to the ideal cluster width so equal-shrink consumers
    // whose container would otherwise collapse to natural max-content
    // (Window's `flex: 0 0 auto` cluster) honor the basis. Capped at the
    // parent's available width to avoid overflowing a sibling slot (e.g.
    // Window's `__footer-left`). Consumers whose container is already
    // full-width (AlertDialog, PanelShell) see no effect since the
    // min-width stays below the natural width.
    const idealCluster = Math.min(count * next + totalGap, parentWidth);
    container.style.minWidth = `${idealCluster}px`;
  }

  function scheduleMeasure(): void {
    if (destroyed) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(measureNow);
  }

  const observer = new ResizeObserver(scheduleMeasure);
  observer.observe(container);

  // Initial pass after the first paint so layout is settled.
  scheduleMeasure();

  return {
    measure: measureNow,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      container.style.removeProperty('--arvo-overlay-footer-btn-min');
      container.style.minWidth = '';
    },
  };
}
