// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMask } from '../mask';

describe('createMask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // -----------------------------------------------------------------------
  // Element creation
  // -----------------------------------------------------------------------

  it('creates a div with the correct base class', () => {
    const mask = createMask();
    expect(mask.element.tagName).toBe('DIV');
    expect(mask.element.classList.contains('arvo-overlay__mask')).toBe(true);
  });

  it('adds --scoped class when container is provided', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mask = createMask({ container });
    expect(mask.element.classList.contains('arvo-overlay__mask--scoped')).toBe(true);
  });

  it('resolves container from CSS selector string', () => {
    const container = document.createElement('div');
    container.id = 'mask-target';
    document.body.appendChild(container);

    const mask = createMask({ container: '#mask-target' });
    expect(mask.element.classList.contains('arvo-overlay__mask--scoped')).toBe(true);

    mask.show();
    vi.advanceTimersByTime(10);
    expect(container.contains(mask.element)).toBe(true);

    mask.destroy();
  });

  it('applies z-index when provided', () => {
    const mask = createMask({ zIndex: 9999 });
    expect(mask.element.style.zIndex).toBe('9999');
  });

  it('does not set z-index when not provided', () => {
    const mask = createMask();
    expect(mask.element.style.zIndex).toBe('');
  });

  it('adds --animated by default', () => {
    const mask = createMask();
    expect(mask.element.classList.contains('arvo-overlay__mask--animated')).toBe(
      true,
    );
  });

  it('does not add --animated when animated is false', () => {
    const mask = createMask({ animated: false });
    expect(mask.element.classList.contains('arvo-overlay__mask--animated')).toBe(
      false,
    );
  });

  it('sets aria-hidden=true by default', () => {
    const mask = createMask();
    expect(mask.element.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not set aria-hidden when ariaHidden is false', () => {
    const mask = createMask({ ariaHidden: false });
    expect(mask.element.getAttribute('aria-hidden')).toBeNull();
  });

  it('appends a custom className', () => {
    const mask = createMask({ className: 'my-app__overlay' });
    expect(mask.element.classList.contains('my-app__overlay')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // show()
  // -----------------------------------------------------------------------

  describe('show()', () => {
    it('appends element to document.body by default', () => {
      const mask = createMask();
      mask.show();
      expect(document.body.contains(mask.element)).toBe(true);
      mask.destroy();
    });

    it('appends element to specified container', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const mask = createMask({ container });
      mask.show();
      expect(container.contains(mask.element)).toBe(true);
      mask.destroy();
    });

    it('adds --visible class after 10ms delay', () => {
      const mask = createMask();
      mask.show();

      expect(mask.element.classList.contains('arvo-overlay__mask--visible')).toBe(false);

      vi.advanceTimersByTime(10);
      expect(mask.element.classList.contains('arvo-overlay__mask--visible')).toBe(true);

      mask.destroy();
    });

    it('cancels pending hide when show is called', () => {
      const mask = createMask();
      mask.show();
      vi.advanceTimersByTime(10);

      mask.hide();
      // Before the 300ms detach timer fires, call show again
      vi.advanceTimersByTime(100);
      mask.show();
      vi.advanceTimersByTime(300);

      // Element should still be in the DOM
      expect(document.body.contains(mask.element)).toBe(true);
      mask.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // hide()
  // -----------------------------------------------------------------------

  describe('hide()', () => {
    it('removes --visible class immediately', () => {
      const mask = createMask();
      mask.show();
      vi.advanceTimersByTime(10);
      expect(mask.element.classList.contains('arvo-overlay__mask--visible')).toBe(true);

      mask.hide();
      expect(mask.element.classList.contains('arvo-overlay__mask--visible')).toBe(false);
    });

    it('detaches element after 300ms transition', () => {
      const mask = createMask();
      mask.show();
      vi.advanceTimersByTime(10);

      mask.hide();
      // Still in DOM during transition
      expect(document.body.contains(mask.element)).toBe(true);

      vi.advanceTimersByTime(300);
      // Removed after transition
      expect(document.body.contains(mask.element)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // destroy()
  // -----------------------------------------------------------------------

  describe('destroy()', () => {
    it('removes element from DOM immediately', () => {
      const mask = createMask();
      mask.show();
      vi.advanceTimersByTime(10);

      mask.destroy();
      expect(document.body.contains(mask.element)).toBe(false);
    });

    it('clears pending hide timer', () => {
      const mask = createMask();
      mask.show();
      vi.advanceTimersByTime(10);

      mask.hide();
      mask.destroy();

      // Advancing past the hide timer shouldn't cause issues
      vi.advanceTimersByTime(300);
    });

    it('removes pointerdown listener', () => {
      const onOutside = vi.fn();
      const mask = createMask({ closeOnClick: true, onOutside });
      mask.show();
      vi.advanceTimersByTime(10);

      mask.destroy();

      mask.element.dispatchEvent(new PointerEvent('pointerdown'));
      expect(onOutside).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // closeOnClick
  // -----------------------------------------------------------------------

  describe('closeOnClick', () => {
    it('fires onOutside callback on pointerdown when closeOnClick is true', () => {
      const onOutside = vi.fn();
      const mask = createMask({ closeOnClick: true, onOutside });
      mask.show();
      vi.advanceTimersByTime(10);

      mask.element.dispatchEvent(new PointerEvent('pointerdown'));
      expect(onOutside).toHaveBeenCalledOnce();

      mask.destroy();
    });

    it('does not fire callback when closeOnClick is false', () => {
      const onOutside = vi.fn();
      const mask = createMask({ closeOnClick: false, onOutside });
      mask.show();
      vi.advanceTimersByTime(10);

      mask.element.dispatchEvent(new PointerEvent('pointerdown'));
      expect(onOutside).not.toHaveBeenCalled();

      mask.destroy();
    });

    it('does not fire callback when onOutside is not provided', () => {
      const mask = createMask({ closeOnClick: true });
      mask.show();
      vi.advanceTimersByTime(10);

      // Should not throw
      expect(() => {
        mask.element.dispatchEvent(new PointerEvent('pointerdown'));
      }).not.toThrow();

      mask.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Multiple instances
  // -----------------------------------------------------------------------

  describe('multiple instances', () => {
    it('can coexist independently', () => {
      const mask1 = createMask({ zIndex: 100 });
      const mask2 = createMask({ zIndex: 200 });

      mask1.show();
      mask2.show();
      vi.advanceTimersByTime(10);

      expect(document.body.contains(mask1.element)).toBe(true);
      expect(document.body.contains(mask2.element)).toBe(true);
      expect(mask1.element).not.toBe(mask2.element);

      mask1.hide();
      vi.advanceTimersByTime(300);

      expect(document.body.contains(mask1.element)).toBe(false);
      expect(document.body.contains(mask2.element)).toBe(true);

      mask2.destroy();
    });
  });

  describe('non-animated mode', () => {
    it('adds --visible synchronously and removes the element synchronously', () => {
      const mask = createMask({ animated: false });
      mask.show();
      expect(mask.element.classList.contains('arvo-overlay__mask--visible')).toBe(
        true,
      );
      expect(document.body.contains(mask.element)).toBe(true);

      mask.hide();
      expect(mask.element.classList.contains('arvo-overlay__mask--visible')).toBe(
        false,
      );
      expect(document.body.contains(mask.element)).toBe(false);
    });
  });
});
