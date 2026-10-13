/**
 * Checks whether an element's text content is truncated (overflowing).
 *
 * Detects both horizontal truncation (`text-overflow: ellipsis` /
 * `white-space: nowrap; overflow: hidden`) and vertical truncation
 * (`-webkit-line-clamp` / `display: -webkit-box`). Returns true when the
 * element's scrollable content exceeds its visible box in either dimension.
 *
 * Used by the truncation-aware tooltip connector to suppress tooltips when
 * the visible label already shows the full content.
 */
export function isTruncated(el: HTMLElement): boolean {
  return (
    el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
  );
}
