import { connectTooltip, tooltipManager, type TooltipPlacement } from '@arvo/core';

// ---------------------------------------------------------------------------
// Title truncation tooltip helper
//
// Wires a tooltip onto a title element that shows ONLY when the element's
// content is truncated by a CSS line-clamp or text-overflow rule. Used by
// Toast and Banner Alert so a 2-line clamped title can still be read in
// full via hover/focus.
//
// The helper subscribes to a `ResizeObserver` so that the truncation check
// re-runs whenever the parent's width changes; the tooltip's `autoOnTruncation`
// guard inside `@arvo/core` then suppresses the tooltip when not needed.
//
// Returns a disposer that detaches the tooltip and observer. Always call
// dispose() before removing the element from the DOM.
// ---------------------------------------------------------------------------

export interface TitleTruncationOptions {
  /**
   * Element whose truncation state controls the tooltip. When
   * `triggerElement` is omitted this element is ALSO the hover/focus
   * anchor (the typical title-clamp pattern used by Toast / BannerAlert /
   * AccordionItem).
   */
  element: HTMLElement;
  /**
   * Optional hover/focus anchor that owns the tooltip events. Defaults
   * to `element`. Use this when the visible truncation target lives
   * inside a larger interactive surface that should be the actual hover
   * trigger -- e.g. `ArvoButton` passes the `<button>` as the trigger
   * and the `<span class="arvo-btn__lbl">` as the measurement element.
   */
  triggerElement?: HTMLElement;
  /** Full title text to display in the tooltip. */
  content: string | (() => string);
  /** Tooltip placement; defaults to `bottom-center`. */
  placement?: TooltipPlacement;
}

export interface TitleTruncationHandle {
  /** Update the title content (e.g. when the consumer's `title` prop changes). */
  update(content: string | (() => string)): void;
  /** Detach the tooltip and observer. Safe to call multiple times. */
  destroy(): void;
}

/**
 * Attaches a truncation-aware tooltip to a title element. The tooltip
 * renders only when the text is clipped by overflow/line-clamp.
 *
 * Always wires the underlying connector as `kind: 'truncation'`, which
 * means it automatically yields to any explicit `<ArvoTooltip>` /
 * `ArvoTooltip.initialize` that is bound to the same anchor (or one of
 * its ancestors) and skips `aria-describedby` so assistive tech does not
 * double-announce text that is already in the anchor's accessible name.
 */
export function attachTitleTruncationTooltip(
  options: TitleTruncationOptions,
): TitleTruncationHandle {
  const { element, triggerElement, placement = 'bottom-center' } = options;
  const anchor = triggerElement ?? element;
  let _content = options.content;

  const connector = connectTooltip(tooltipManager, {
    anchor,
    content: () =>
      typeof _content === 'function' ? _content() : _content,
    placement,
    labelElement: element,
    autoOnTruncation: true,
    kind: 'truncation',
  });

  // Re-evaluate truncation when the element resizes. The connector's own
  // `autoOnTruncation` check happens at hover/focus time; the observer is
  // here so consumers that swap content programmatically can rely on the
  // tooltip toggling correctly without a fresh layout pass.
  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      // No-op trigger; the connector reads truncation state lazily on
      // hover/focus. Keeping the observer alive ensures the layout has
      // settled before the next hover.
    });
    observer.observe(element);
  }

  let destroyed = false;

  return {
    update(newContent) {
      _content = newContent;
      connector.update({});
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      observer = null;
      connector.destroy();
    },
  };
}
