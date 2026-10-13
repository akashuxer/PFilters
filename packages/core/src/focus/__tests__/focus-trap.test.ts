// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFocusTrap } from '../focus-trap';

function pressKey(
  target: EventTarget,
  key: string,
  opts: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  target.dispatchEvent(event);
  return event;
}

describe('focus-trap', () => {
  let container: HTMLDivElement;
  let btn1: HTMLButtonElement;
  let btn2: HTMLButtonElement;
  let btn3: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    btn1 = document.createElement('button');
    btn1.id = 'btn1';
    btn2 = document.createElement('button');
    btn2.id = 'btn2';
    btn3 = document.createElement('button');
    btn3.id = 'btn3';

    container.appendChild(btn1);
    container.appendChild(btn2);
    container.appendChild(btn3);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('focuses the first focusable element on activate', () => {
    const trap = createFocusTrap();
    trap.activate({
      container,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    expect(document.activeElement).toBe(btn1);
    trap.deactivate();
  });

  it('focuses a specific element when initialFocus is an HTMLElement', () => {
    const trap = createFocusTrap();
    trap.activate({
      container,
      initialFocus: btn2,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    expect(document.activeElement).toBe(btn2);
    trap.deactivate();
  });

  it('does not move focus when initialFocus is "none"', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const trap = createFocusTrap();
    trap.activate({
      container,
      initialFocus: 'none',
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    expect(document.activeElement).toBe(outside);
    trap.deactivate();
    document.body.removeChild(outside);
  });

  it('reports active state correctly', () => {
    const trap = createFocusTrap();
    expect(trap.isActive()).toBe(false);

    trap.activate({
      container,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });
    expect(trap.isActive()).toBe(true);

    trap.deactivate();
    expect(trap.isActive()).toBe(false);
  });

  describe('Tab wrapping', () => {
    it('wraps Tab from last to first focusable', () => {
      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      btn3.focus();
      expect(document.activeElement).toBe(btn3);

      const event = pressKey(btn3, 'Tab');
      expect(document.activeElement).toBe(btn1);
      expect(event.defaultPrevented).toBe(true);

      trap.deactivate();
    });

    it('wraps Shift+Tab from first to last focusable', () => {
      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      btn1.focus();
      const event = pressKey(btn1, 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(btn3);
      expect(event.defaultPrevented).toBe(true);

      trap.deactivate();
    });

    it('does not wrap Tab when not at the boundary', () => {
      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      btn1.focus();
      const event = pressKey(btn1, 'Tab');
      expect(event.defaultPrevented).toBe(false);

      trap.deactivate();
    });

    it('redirects Tab focus back when focus is outside the container', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const trap = createFocusTrap();
      trap.activate({
        container,
        initialFocus: 'none',
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: true,
      });

      outside.focus();
      pressKey(outside, 'Tab');
      expect(document.activeElement).toBe(btn1);

      trap.deactivate();
      document.body.removeChild(outside);
    });

    it('handles container with no focusable elements', () => {
      const emptyContainer = document.createElement('div');
      emptyContainer.innerHTML = '<div>no focusable</div>';
      document.body.appendChild(emptyContainer);

      const trap = createFocusTrap();
      trap.activate({
        container: emptyContainer,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      const event = pressKey(emptyContainer, 'Tab');
      expect(event.defaultPrevented).toBe(true);

      trap.deactivate();
      document.body.removeChild(emptyContainer);
    });
  });

  describe('Escape key', () => {
    it('deactivates on Escape when escapeDeactivates is true', () => {
      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: true,
        allowOutsideClick: false,
      });

      expect(trap.isActive()).toBe(true);
      pressKey(btn1, 'Escape');
      expect(trap.isActive()).toBe(false);
    });

    it('does not deactivate on Escape when escapeDeactivates is false', () => {
      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      pressKey(btn1, 'Escape');
      expect(trap.isActive()).toBe(true);
      trap.deactivate();
    });
  });

  describe('focus restoration', () => {
    it('restores focus to previously focused element on deactivate', () => {
      const outside = document.createElement('button');
      outside.id = 'outside';
      document.body.appendChild(outside);
      outside.focus();

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: true,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      expect(document.activeElement).toBe(btn1);
      trap.deactivate();
      expect(document.activeElement).toBe(outside);

      document.body.removeChild(outside);
    });

    it('does not restore focus when returnFocusOnDeactivate is false', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      expect(document.activeElement).toBe(btn1);
      trap.deactivate();
      expect(document.activeElement).toBe(btn1);

      document.body.removeChild(outside);
    });

    it('uses returnFocusTo (HTMLElement) on deactivate over saveFocus', () => {
      // Two outside buttons: one is the active element at trap activation
      // time (captured by saveFocus); the other is the explicit return
      // target passed via returnFocusTo. The explicit target must win.
      const activeAtActivation = document.createElement('button');
      activeAtActivation.id = 'active-at-activation';
      document.body.appendChild(activeAtActivation);
      activeAtActivation.focus();

      const explicitTarget = document.createElement('button');
      explicitTarget.id = 'explicit-target';
      document.body.appendChild(explicitTarget);

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: true,
        escapeDeactivates: false,
        allowOutsideClick: false,
        returnFocusTo: explicitTarget,
      });

      // Trap moved focus into the container (initialFocus defaults to first).
      expect(document.activeElement).toBe(btn1);
      trap.deactivate();
      // Explicit target wins over saveFocus's captured element.
      expect(document.activeElement).toBe(explicitTarget);

      document.body.removeChild(activeAtActivation);
      document.body.removeChild(explicitTarget);
    });

    it('uses returnFocusTo (function getter) lazily on deactivate', () => {
      // Function-form `returnFocusTo` is resolved at deactivation time,
      // not activation time. This matches the consumer pattern where the
      // trigger ref may be reassigned between activate() and deactivate()
      // -- e.g. ActionMenu's filter search input gaining focus after
      // trap activation via requestAnimationFrame.
      const triggerInitial = document.createElement('button');
      triggerInitial.id = 'trigger-initial';
      document.body.appendChild(triggerInitial);

      const triggerLater = document.createElement('button');
      triggerLater.id = 'trigger-later';
      document.body.appendChild(triggerLater);

      let triggerRef: HTMLElement = triggerInitial;

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: true,
        escapeDeactivates: false,
        allowOutsideClick: false,
        returnFocusTo: () => triggerRef,
      });

      // Mutate triggerRef AFTER activation -- a fixed-element returnFocusTo
      // would miss this update; the getter form picks it up.
      triggerRef = triggerLater;

      trap.deactivate();
      expect(document.activeElement).toBe(triggerLater);

      document.body.removeChild(triggerInitial);
      document.body.removeChild(triggerLater);
    });

    it('returnFocusTo getter that returns null falls back to saveFocus', () => {
      const outside = document.createElement('button');
      outside.id = 'fallback';
      document.body.appendChild(outside);
      outside.focus();

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: true,
        escapeDeactivates: false,
        allowOutsideClick: false,
        returnFocusTo: () => null,
      });

      expect(document.activeElement).toBe(btn1);
      trap.deactivate();
      // Explicit target resolved to null -> fall back to saveFocus, which
      // captured the outside element.
      expect(document.activeElement).toBe(outside);

      document.body.removeChild(outside);
    });
  });

  describe('outside focus', () => {
    it('pulls focus back when allowOutsideClick is false', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: false,
      });

      outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(document.activeElement).toBe(btn1);

      trap.deactivate();
      document.body.removeChild(outside);
    });

    it('allows outside focus when allowOutsideClick is true', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const trap = createFocusTrap();
      trap.activate({
        container,
        returnFocusOnDeactivate: false,
        escapeDeactivates: false,
        allowOutsideClick: true,
      });

      outside.focus();
      outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(document.activeElement).toBe(outside);

      trap.deactivate();
      document.body.removeChild(outside);
    });
  });

  it('deactivates the previous trap before reactivating', () => {
    const trap = createFocusTrap();
    trap.activate({
      container,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    const container2 = document.createElement('div');
    const btn = document.createElement('button');
    btn.id = 'btn-c2';
    container2.appendChild(btn);
    document.body.appendChild(container2);

    trap.activate({
      container: container2,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    expect(document.activeElement).toBe(btn);
    expect(trap.isActive()).toBe(true);

    trap.deactivate();
    document.body.removeChild(container2);
  });

  it('updateContainerElements can be called without error', () => {
    const trap = createFocusTrap();
    trap.activate({
      container,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    expect(() => trap.updateContainerElements()).not.toThrow();
    trap.deactivate();
  });

  it('handles dynamically added elements', () => {
    const trap = createFocusTrap();
    trap.activate({
      container,
      returnFocusOnDeactivate: false,
      escapeDeactivates: false,
      allowOutsideClick: false,
    });

    const btn4 = document.createElement('button');
    btn4.id = 'btn4';
    container.appendChild(btn4);

    btn4.focus();
    const event = pressKey(btn4, 'Tab');
    expect(document.activeElement).toBe(btn1);
    expect(event.defaultPrevented).toBe(true);

    trap.deactivate();
  });
});
