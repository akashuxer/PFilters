// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enter, exit } from '../transition';

function mockMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

function fireTransitionEnd(el: HTMLElement): void {
  el.dispatchEvent(new Event('transitionend'));
}

describe('transition', () => {
  let element: HTMLDivElement;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    mockMatchMedia(false);
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe('enter', () => {
    it('applies enter classes in the correct sequence', async () => {
      const promise = enter({ element, type: 'fade' });

      expect(element.classList.contains('arvo-fade')).toBe(true);
      expect(element.classList.contains('arvo-enter-active')).toBe(true);
      expect(element.classList.contains('arvo-enter-to')).toBe(true);
      expect(element.classList.contains('arvo-enter-from')).toBe(false);

      fireTransitionEnd(element);
      await promise;

      expect(element.classList.contains('arvo-fade')).toBe(false);
      expect(element.classList.contains('arvo-enter-active')).toBe(false);
      expect(element.classList.contains('arvo-enter-to')).toBe(false);
    });

    it('works with all transition types', async () => {
      const types = [
        'fade',
        'scale',
        'slide-up',
        'slide-down',
        'slide-left',
        'slide-right',
      ] as const;

      for (const type of types) {
        const promise = enter({ element, type });
        expect(element.classList.contains(`arvo-${type}`)).toBe(true);
        fireTransitionEnd(element);
        await promise;
        expect(element.classList.contains(`arvo-${type}`)).toBe(false);
      }
    });

    it('calls onComplete after transition', async () => {
      const onComplete = vi.fn();
      const promise = enter({ element, type: 'scale', onComplete });

      expect(onComplete).not.toHaveBeenCalled();
      fireTransitionEnd(element);
      await promise;
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('sets inline transitionDuration when duration is provided', async () => {
      const promise = enter({ element, type: 'fade', duration: 200 });
      expect(element.style.transitionDuration).toBe('200ms');

      fireTransitionEnd(element);
      await promise;
      expect(element.style.transitionDuration).toBe('');
    });

    it('sets inline transitionTimingFunction when easing is provided', async () => {
      const promise = enter({ element, type: 'fade', easing: 'linear' });
      expect(element.style.transitionTimingFunction).toBe('linear');

      fireTransitionEnd(element);
      await promise;
      expect(element.style.transitionTimingFunction).toBe('');
    });

    it('ignores transitionend from child elements', async () => {
      const child = document.createElement('span');
      element.appendChild(child);

      const promise = enter({ element, type: 'fade', duration: 100 });

      child.dispatchEvent(new Event('transitionend', { bubbles: true }));
      expect(element.classList.contains('arvo-enter-active')).toBe(true);

      fireTransitionEnd(element);
      await promise;
      expect(element.classList.contains('arvo-enter-active')).toBe(false);
    });

    it('only responds to the first transitionend event', async () => {
      const onComplete = vi.fn();
      const promise = enter({ element, type: 'fade', onComplete });

      fireTransitionEnd(element);
      fireTransitionEnd(element);
      await promise;

      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('exit', () => {
    it('applies exit classes in the correct sequence and persists toClass + typeClass past completion', async () => {
      const promise = exit({ element, type: 'scale' });

      expect(element.classList.contains('arvo-scale')).toBe(true);
      expect(element.classList.contains('arvo-exit-active')).toBe(true);
      expect(element.classList.contains('arvo-exit-to')).toBe(true);
      expect(element.classList.contains('arvo-exit-from')).toBe(false);

      fireTransitionEnd(element);
      await promise;

      // Exit transitions intentionally PERSIST the final-state classes
      // (`toClass` + `typeClass`) past cleanup so the element stays at the
      // hidden end-state (opacity:0, transform:scale(0.96), etc.) until the
      // consumer unmounts/removes it via `onComplete`. Without this the
      // element would snap back to its component-default visual state for
      // a single frame (an "exit flicker"). `activeClass` is still removed
      // so a subsequent enter cycle isn't stuck on a stale transition
      // descriptor.
      expect(element.classList.contains('arvo-scale')).toBe(true);
      expect(element.classList.contains('arvo-exit-to')).toBe(true);
      expect(element.classList.contains('arvo-exit-active')).toBe(false);
    });

    it('clears persisted exit classes when the element is re-used for a new transition', async () => {
      // Exercise the open -> close -> open round-trip. A re-entered element
      // must start from a clean transition slate so the persisted exit-to
      // state from the previous close doesn't poison the new enter.
      const exitP = exit({ element, type: 'scale' });
      fireTransitionEnd(element);
      await exitP;
      expect(element.classList.contains('arvo-exit-to')).toBe(true);
      expect(element.classList.contains('arvo-scale')).toBe(true);

      const enterP = enter({ element, type: 'fade' });
      // The stale exit classes were stripped before the new enter cycle.
      expect(element.classList.contains('arvo-exit-to')).toBe(false);
      expect(element.classList.contains('arvo-scale')).toBe(false);
      expect(element.classList.contains('arvo-fade')).toBe(true);
      expect(element.classList.contains('arvo-enter-active')).toBe(true);
      expect(element.classList.contains('arvo-enter-to')).toBe(true);

      fireTransitionEnd(element);
      await enterP;
    });

    it('calls onComplete after exit transition', async () => {
      const onComplete = vi.fn();
      const promise = exit({ element, type: 'fade', onComplete });

      fireTransitionEnd(element);
      await promise;
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('reduced motion', () => {
    it('resolves immediately when reduced motion is preferred', async () => {
      mockMatchMedia(true);

      const onComplete = vi.fn();
      await enter({ element, type: 'fade', onComplete });

      expect(onComplete).toHaveBeenCalledOnce();
      expect(element.className).toBe('');
    });

    it('skips exit animation with reduced motion but leaves the element in the hidden end-state', async () => {
      mockMatchMedia(true);

      const onComplete = vi.fn();
      await exit({ element, type: 'scale', onComplete });

      expect(onComplete).toHaveBeenCalledOnce();
      // Reduced-motion exit still applies the `toClass` + `typeClass` so
      // the element renders at its hidden final state -- otherwise the
      // consumer's `onComplete` (typically an unmount) would briefly see
      // the element back at default visibility. Same anti-flicker contract
      // as the full-animation path.
      expect(element.classList.contains('arvo-scale')).toBe(true);
      expect(element.classList.contains('arvo-exit-to')).toBe(true);
      expect(element.classList.contains('arvo-exit-active')).toBe(false);
      expect(element.classList.contains('arvo-exit-from')).toBe(false);
    });
  });

  describe('fallback timeout', () => {
    it('resolves when transitionend never fires', async () => {
      vi.useFakeTimers();

      const onComplete = vi.fn();
      const promise = enter({
        element,
        type: 'fade',
        duration: 100,
        onComplete,
      });

      vi.advanceTimersByTime(200);
      await promise;

      expect(onComplete).toHaveBeenCalledOnce();
      expect(element.className).toBe('');

      vi.useRealTimers();
    });

    it('does not double-resolve when transitionend fires after timeout', async () => {
      vi.useFakeTimers();

      const onComplete = vi.fn();
      const promise = enter({
        element,
        type: 'fade',
        duration: 100,
        onComplete,
      });

      vi.advanceTimersByTime(200);
      await promise;

      fireTransitionEnd(element);

      expect(onComplete).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });
  });
});
