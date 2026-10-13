// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedMotion, onReducedMotionChange } from '../reduced-motion';

describe('reduced-motion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('prefersReducedMotion', () => {
    it('returns true when reduced motion is preferred', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(prefersReducedMotion()).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith(
        '(prefers-reduced-motion: reduce)',
      );
    });

    it('returns false when reduced motion is not preferred', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(prefersReducedMotion()).toBe(false);
    });

    it('returns false when matchMedia is unavailable', () => {
       
      (window as any).matchMedia = undefined;
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('onReducedMotionChange', () => {
    it('registers a change listener and invokes callback', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      window.matchMedia = vi.fn().mockReturnValue({
        addEventListener,
        removeEventListener,
      });

      const callback = vi.fn();
      onReducedMotionChange(callback);

      expect(addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );

      const handler = addEventListener.mock.calls[0][1];
      handler({ matches: true });
      expect(callback).toHaveBeenCalledWith(true);

      handler({ matches: false });
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('returns a cleanup function that removes the listener', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      window.matchMedia = vi.fn().mockReturnValue({
        addEventListener,
        removeEventListener,
      });

      const cleanup = onReducedMotionChange(vi.fn());
      const handler = addEventListener.mock.calls[0][1];

      cleanup();
      expect(removeEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('returns a no-op cleanup when matchMedia is unavailable', () => {
       
      (window as any).matchMedia = undefined;
      const cleanup = onReducedMotionChange(vi.fn());
      expect(() => cleanup()).not.toThrow();
    });
  });
});
