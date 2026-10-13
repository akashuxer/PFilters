/**
 * Reference-counted page scroll lock.
 *
 * Multiple overlays (drawer, modal, sheet) can call `lockPageScroll()`
 * concurrently. The page scroll is restored only when every issued
 * unlock function has been called. This avoids the classic "first
 * close releases scroll while a second overlay is still open" bug.
 *
 * Implementation: stores the original `overflow` of `documentElement`
 * (and `body`) on the first lock and writes `hidden`. On the last
 * unlock, restores the original values. Subsequent locks/unlocks are
 * no-ops at the DOM level but still tracked by the counter.
 *
 * SSR-safe: returns a no-op unlocker when `document` is undefined.
 */
export function lockPageScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {
      /* no-op in SSR */
    };
  }

  _lockCount += 1;
  if (_lockCount === 1) {
    const html = document.documentElement;
    const body = document.body;
    _saved.htmlOverflow = html.style.overflow;
    _saved.bodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  }

  let released = false;
  return function unlock(): void {
    if (released) return;
    released = true;
    _lockCount = Math.max(0, _lockCount - 1);
    if (_lockCount === 0) {
      const html = document.documentElement;
      const body = document.body;
      html.style.overflow = _saved.htmlOverflow;
      body.style.overflow = _saved.bodyOverflow;
      _saved.htmlOverflow = '';
      _saved.bodyOverflow = '';
    }
  };
}

/** Returns true if the page scroll is currently locked by anyone. */
export function isPageScrollLocked(): boolean {
  return _lockCount > 0;
}

// ---------------------------------------------------------------------------
// Internal state (module singleton)
// ---------------------------------------------------------------------------

let _lockCount = 0;
const _saved: { htmlOverflow: string; bodyOverflow: string } = {
  htmlOverflow: '',
  bodyOverflow: '',
};
