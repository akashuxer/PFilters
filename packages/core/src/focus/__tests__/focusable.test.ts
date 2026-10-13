// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  isFocusable,
} from '../focusable';

describe('focusable', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('isFocusable', () => {
    it('returns true for a button', () => {
      const btn = document.createElement('button');
      container.appendChild(btn);
      expect(isFocusable(btn)).toBe(true);
    });

    it('returns false for a disabled button', () => {
      const btn = document.createElement('button');
      btn.disabled = true;
      container.appendChild(btn);
      expect(isFocusable(btn)).toBe(false);
    });

    it('returns true for an anchor with href', () => {
      const a = document.createElement('a');
      a.href = '#';
      container.appendChild(a);
      expect(isFocusable(a)).toBe(true);
    });

    it('returns false for an anchor without href', () => {
      const a = document.createElement('a');
      container.appendChild(a);
      expect(isFocusable(a)).toBe(false);
    });

    it('returns true for an input', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      expect(isFocusable(input)).toBe(true);
    });

    it('returns false for a hidden input', () => {
      const input = document.createElement('input');
      input.type = 'hidden';
      container.appendChild(input);
      expect(isFocusable(input)).toBe(false);
    });

    it('returns false for a disabled input', () => {
      const input = document.createElement('input');
      input.disabled = true;
      container.appendChild(input);
      expect(isFocusable(input)).toBe(false);
    });

    it('returns true for textarea', () => {
      const ta = document.createElement('textarea');
      container.appendChild(ta);
      expect(isFocusable(ta)).toBe(true);
    });

    it('returns true for select', () => {
      const sel = document.createElement('select');
      container.appendChild(sel);
      expect(isFocusable(sel)).toBe(true);
    });

    it('returns true for an element with tabindex="0"', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      container.appendChild(div);
      expect(isFocusable(div)).toBe(true);
    });

    it('returns true for an element with tabindex="-1"', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '-1');
      container.appendChild(div);
      expect(isFocusable(div)).toBe(true);
    });

    it('returns false for a plain div', () => {
      const div = document.createElement('div');
      container.appendChild(div);
      expect(isFocusable(div)).toBe(false);
    });

    it('returns true for contenteditable element', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      container.appendChild(div);
      expect(isFocusable(div)).toBe(true);
    });

    it('returns false for contenteditable="false"', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'false');
      container.appendChild(div);
      expect(isFocusable(div)).toBe(false);
    });

    it('returns false for a hidden element', () => {
      const btn = document.createElement('button');
      btn.hidden = true;
      container.appendChild(btn);
      expect(isFocusable(btn)).toBe(false);
    });

    it('returns false for aria-hidden="true"', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-hidden', 'true');
      container.appendChild(btn);
      expect(isFocusable(btn)).toBe(false);
    });

    it('returns false for an inert element', () => {
      const btn = document.createElement('button');
      btn.setAttribute('inert', '');
      container.appendChild(btn);
      expect(isFocusable(btn)).toBe(false);
    });
  });

  describe('getFocusableElements', () => {
    it('returns tabbable elements in DOM order', () => {
      container.innerHTML = `
        <button id="b1">B1</button>
        <div>not focusable</div>
        <input id="i1" />
        <a href="#" id="a1">Link</a>
      `;
      const result = getFocusableElements(container);
      expect(result.map((el) => el.id)).toEqual(['b1', 'i1', 'a1']);
    });

    it('excludes disabled elements', () => {
      container.innerHTML = `
        <button id="b1">B1</button>
        <button id="b2" disabled>B2</button>
        <input id="i1" disabled />
      `;
      const result = getFocusableElements(container);
      expect(result.map((el) => el.id)).toEqual(['b1']);
    });

    it('excludes elements with tabindex="-1"', () => {
      container.innerHTML = `
        <button id="b1">B1</button>
        <div id="d1" tabindex="-1">Div</div>
        <div id="d2" tabindex="0">Div2</div>
      `;
      const result = getFocusableElements(container);
      expect(result.map((el) => el.id)).toEqual(['b1', 'd2']);
    });

    it('excludes hidden and inert elements', () => {
      container.innerHTML = `
        <button id="b1">B1</button>
        <button id="b2" hidden>B2</button>
        <button id="b3" aria-hidden="true">B3</button>
        <button id="b4" inert>B4</button>
      `;
      const result = getFocusableElements(container);
      expect(result.map((el) => el.id)).toEqual(['b1']);
    });

    it('returns empty array for container with no focusable elements', () => {
      container.innerHTML = '<div>nothing</div><p>here</p>';
      expect(getFocusableElements(container)).toEqual([]);
    });
  });

  describe('getFirstFocusable', () => {
    it('returns the first tabbable element', () => {
      container.innerHTML = `
        <div>text</div>
        <button id="b1">B1</button>
        <button id="b2">B2</button>
      `;
      const first = getFirstFocusable(container);
      expect(first?.id).toBe('b1');
    });

    it('returns null when no focusable elements exist', () => {
      container.innerHTML = '<div>nothing</div>';
      expect(getFirstFocusable(container)).toBeNull();
    });
  });

  describe('getLastFocusable', () => {
    it('returns the last tabbable element', () => {
      container.innerHTML = `
        <button id="b1">B1</button>
        <button id="b2">B2</button>
        <input id="i1" />
      `;
      const last = getLastFocusable(container);
      expect(last?.id).toBe('i1');
    });

    it('returns null when no focusable elements exist', () => {
      container.innerHTML = '<div>nothing</div>';
      expect(getLastFocusable(container)).toBeNull();
    });
  });
});
