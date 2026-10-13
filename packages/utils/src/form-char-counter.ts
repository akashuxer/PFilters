export interface CharCounterOptions {
  maxLength?: number | null;
}

/**
 * Formats a character count string with zero-padded current value.
 * Padding width is determined by the number of digits in maxLength.
 *
 * Examples:
 *   formatCharCount(5, 100)  -> "005/100"
 *   formatCharCount(12, 50)  -> "12/50"
 *   formatCharCount(0, 1000) -> "0000/1000"
 *   formatCharCount(7, null) -> "7"
 */
export function formatCharCount(current: number, maxLength: number | null): string {
  if (maxLength == null) {
    return String(current);
  }
  const maxStr = String(maxLength);
  const currentStr = String(current).padStart(maxStr.length, '0');
  return `${currentStr}/${maxLength}`;
}

/**
 * Creates a character counter DOM element.
 * The consuming component appends this after the input/border area.
 */
export function createCharCounter(options: CharCounterOptions = {}): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = 'arvo-char-counter';
  el.textContent = formatCharCount(0, options.maxLength ?? null);
  return el;
}

/**
 * Updates the counter text. Call this on every input event.
 */
export function updateCharCounter(
  el: HTMLSpanElement,
  current: number,
  maxLength: number | null
): void {
  el.textContent = formatCharCount(current, maxLength);
}
