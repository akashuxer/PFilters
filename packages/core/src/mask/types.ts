// ---------------------------------------------------------------------------
// Mask -- shared overlay scrim primitive.
//
// Used by modal-style overlays (Alert Dialog, Drawer) as the canonical
// dimming/click-outside surface. New overlays that need a scrim should reach
// for `createMask` rather than implementing their own backdrop.
// ---------------------------------------------------------------------------

export interface MaskOptions {
  /**
   * Append the mask inside this element instead of `document.body`. When set,
   * the `--scoped` modifier is added so the SCSS can position absolutely
   * within the container instead of fixed.
   */
  container?: HTMLElement | string;

  /** When true and `onOutside` is provided, fire `onOutside` on pointerdown. */
  closeOnClick?: boolean;

  /** Optional z-index override. */
  zIndex?: number;

  /** Pointer-down handler invoked when `closeOnClick` is true. */
  onOutside?: (event: PointerEvent) => void;

  /** Whether the mask animates show/hide (default true). */
  animated?: boolean;

  /** When true (default) sets `aria-hidden="true"` on the mask element. */
  ariaHidden?: boolean;

  /** Additional class appended to the mask element for theming hooks. */
  className?: string;
}

export interface MaskInstance {
  show: () => void;
  hide: () => void;
  destroy: () => void;
  element: HTMLElement;
}
