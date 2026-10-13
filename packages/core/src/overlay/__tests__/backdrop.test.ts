// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createBackdropManager } from '../backdrop';

describe('BackdropManager', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('starts with no visible backdrop', () => {
    const mgr = createBackdropManager();
    expect(mgr.isVisible()).toBe(false);
    expect(mgr.getElement()).toBeNull();
  });

  describe('show', () => {
    it('creates a backdrop element in the container', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: true,
        animated: false,
        container,
      });

      expect(el).toBeInstanceOf(HTMLElement);
      expect(container.contains(el)).toBe(true);
      expect(mgr.isVisible()).toBe(true);
      expect(mgr.getElement()).toBe(el);
      mgr.hide();
    });

    it('applies the requested opacity', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.7,
        closeOnClick: true,
        animated: false,
        container,
      });

      expect(el.style.backgroundColor).toBe('rgba(0, 0, 0, 0.7)');
      mgr.hide();
    });

    it('sets fixed positioning covering the viewport', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: true,
        animated: false,
        container,
      });

      expect(el.style.position).toBe('fixed');
      expect(el.style.top).toBe('0px');
      expect(el.style.left).toBe('0px');
      expect(el.style.width).toBe('100%');
      expect(el.style.height).toBe('100%');
      mgr.hide();
    });

    it('has the arvo-backdrop class', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: true,
        animated: false,
        container,
      });

      expect(el.classList.contains('arvo-backdrop')).toBe(true);
      mgr.hide();
    });

    it('adds animated class when animated is true', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: true,
        animated: true,
        container,
      });

      expect(el.classList.contains('arvo-backdrop--animated')).toBe(true);
      mgr.hide();
    });

    it('replaces the previous backdrop on re-show', () => {
      const mgr = createBackdropManager();
      const el1 = mgr.show({
        opacity: 0.3,
        closeOnClick: true,
        animated: false,
        container,
      });

      const el2 = mgr.show({
        opacity: 0.8,
        closeOnClick: true,
        animated: false,
        container,
      });

      expect(el2).not.toBe(el1);
      expect(container.contains(el1)).toBe(false);
      expect(container.contains(el2)).toBe(true);
      mgr.hide();
    });
  });

  describe('hide', () => {
    it('removes the backdrop from the DOM', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: true,
        animated: false,
        container,
      });

      mgr.hide();
      expect(container.contains(el)).toBe(false);
      expect(mgr.isVisible()).toBe(false);
      expect(mgr.getElement()).toBeNull();
    });

    it('is safe to call when not visible', () => {
      const mgr = createBackdropManager();
      expect(() => mgr.hide()).not.toThrow();
    });
  });

  describe('closeOnClick', () => {
    it('allows mousedown propagation when closeOnClick is true', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: true,
        animated: false,
        container,
      });

      let propagated = false;
      container.addEventListener(
        'mousedown',
        () => {
          propagated = true;
        },
        { once: true },
      );

      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(propagated).toBe(true);
      mgr.hide();
    });

    it('blocks mousedown propagation when closeOnClick is false', () => {
      const mgr = createBackdropManager();
      const el = mgr.show({
        opacity: 0.5,
        closeOnClick: false,
        animated: false,
        container,
      });

      let propagated = false;
      container.addEventListener(
        'mousedown',
        () => {
          propagated = true;
        },
        { once: true },
      );

      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(propagated).toBe(false);
      mgr.hide();
    });
  });
});
