const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

const TABBABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

function isNotInert(el: HTMLElement): boolean {
  if (el.hidden) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.hasAttribute('inert')) return false;
  return true;
}

export function isFocusable(element: HTMLElement): boolean {
  if (!isNotInert(element)) return false;
  if (element.hasAttribute('disabled')) return false;
  return element.matches(FOCUSABLE_SELECTOR);
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
  ).filter((el) => isNotInert(el) && !el.hasAttribute('disabled'));
}

export function getFirstFocusable(
  container: HTMLElement,
): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] ?? null;
}

export function getLastFocusable(
  container: HTMLElement,
): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] ?? null;
}
