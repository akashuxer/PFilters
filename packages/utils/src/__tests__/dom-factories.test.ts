// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createCharCounter, updateCharCounter } from '../form-char-counter';

// ---------------------------------------------------------------------------
// createCharCounter
// ---------------------------------------------------------------------------

describe('createCharCounter', () => {
  it('creates a counter with initial text', () => {
    const el = createCharCounter({ maxLength: 100 });
    expect(el.className).toBe('arvo-char-counter');
    expect(el.textContent).toBe('000/100');
  });

  it('updateCharCounter updates display', () => {
    const el = createCharCounter({ maxLength: 50 });
    updateCharCounter(el, 12, 50);
    expect(el.textContent).toBe('12/50');
  });
});
