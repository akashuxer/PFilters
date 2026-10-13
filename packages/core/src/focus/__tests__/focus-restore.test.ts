// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveFocus, restoreFocus } from '../focus-restore';

describe('focus-restore', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('saves the currently focused element', () => {
    const btn = document.createElement('button');
    container.appendChild(btn);
    btn.focus();

    const state = saveFocus();
    expect(state.element).toBe(btn);
  });

  it('saves null when nothing is focused', () => {
    document.body.focus();
    const state = saveFocus();
    expect(state.element).toBe(document.body);
  });

  it('restores focus to the saved element', () => {
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    container.appendChild(btn1);
    container.appendChild(btn2);

    btn1.focus();
    const state = saveFocus();

    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    restoreFocus(state);
    expect(document.activeElement).toBe(btn1);
  });

  it('handles restoring when saved element is null', () => {
    const state = { element: null };
    expect(() => restoreFocus(state)).not.toThrow();
  });

  it('handles restoring when saved element was removed from DOM', () => {
    const btn = document.createElement('button');
    container.appendChild(btn);
    btn.focus();

    const state = saveFocus();
    container.removeChild(btn);

    expect(() => restoreFocus(state)).not.toThrow();
  });
});
