export function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function onReducedMotionChange(
  callback: (prefers: boolean) => void,
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }

  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

  function handler(event: MediaQueryListEvent): void {
    callback(event.matches);
  }

  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
