// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import $ from 'jquery';
import { createOverlayHub } from '@arvo/core';
import { setupOverlayPlugin } from '../overlay-setup';
import type { OverlayHub } from '../overlay-setup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHub(): OverlayHub {
  return createOverlayHub();
}

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('setupOverlayPlugin', () => {
  let hub: OverlayHub;

  beforeEach(() => {
    hub = makeHub();
    setupOverlayPlugin($, hub);
  });

  afterEach(() => {
    hub.closeAll();
  });

  // -----------------------------------------------------------------------
  // $.setupOverlays
  // -----------------------------------------------------------------------

  describe('$.setupOverlays', () => {
    it('configures the hub', () => {
      $.setupOverlays({ zIndexBase: 3000 });
      expect(hub.getConfig().zIndexBase).toBe(3000);
    });

    it('merges partial config', () => {
      $.setupOverlays({ zIndexBase: 2000 });
      $.setupOverlays({ maxStack: 5 });
      expect(hub.getConfig().zIndexBase).toBe(2000);
      expect(hub.getConfig().maxStack).toBe(5);
    });

    it('applies containerSelector', () => {
      $.setupOverlays({ containerSelector: '#app' });
      expect(hub.getConfig().containerSelector).toBe('#app');
    });
  });

  // -----------------------------------------------------------------------
  // $.isOverlayOpen
  // -----------------------------------------------------------------------

  describe('$.isOverlayOpen', () => {
    it('returns false when overlay is not open', () => {
      expect($.isOverlayOpen('nonexistent')).toBe(false);
    });

    it('returns true after opening an overlay', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'check', type: 'dropdown' });
      expect($.isOverlayOpen('check')).toBe(true);
      el.remove();
    });

    it('returns false after closing', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'chk2', type: 'dropdown' });
      $(el).closeOverlay();
      expect($.isOverlayOpen('chk2')).toBe(false);
      el.remove();
    });
  });

  // -----------------------------------------------------------------------
  // $.closeAllOverlays
  // -----------------------------------------------------------------------

  describe('$.closeAllOverlays', () => {
    it('closes all open overlays', () => {
      const a = makeEl();
      const b = makeEl();
      $(a).openOverlay({ id: 'a', type: 'dropdown' });
      $(b).openOverlay({ id: 'b', type: 'popover' });

      $.closeAllOverlays();

      expect($.isOverlayOpen('a')).toBe(false);
      expect($.isOverlayOpen('b')).toBe(false);

      a.remove();
      b.remove();
    });

    it('respects except list', () => {
      const a = makeEl();
      const b = makeEl();
      const c = makeEl();
      $(a).openOverlay({ id: 'a', type: 'dropdown' });
      $(b).openOverlay({ id: 'b', type: 'popover' });
      $(c).openOverlay({ id: 'c', type: 'tooltip' });

      $.closeAllOverlays({ except: ['b'] });

      expect($.isOverlayOpen('a')).toBe(false);
      expect($.isOverlayOpen('b')).toBe(true);
      expect($.isOverlayOpen('c')).toBe(false);

      $(b).closeOverlay();
      a.remove();
      b.remove();
      c.remove();
    });

    it('is safe to call when nothing is open', () => {
      expect(() => $.closeAllOverlays()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // $.fn.openOverlay
  // -----------------------------------------------------------------------

  describe('$.fn.openOverlay', () => {
    it('registers the element with the hub', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'od1', type: 'dropdown' });

      expect(hub.isOpen('od1')).toBe(true);
      expect(hub.getActive()[0].element).toBe(el);

      el.remove();
    });

    it('uses the first element in the jQuery collection', () => {
      const el = makeEl();
      const $el = $(el);
      $el.openOverlay({ id: 'first-el', type: 'dropdown' });

      expect(hub.getActive()[0].element).toBe(el);
      el.remove();
    });

    it('auto-generates an id when none provided', () => {
      const el = makeEl();
      $(el).openOverlay({ type: 'tooltip' });

      expect(hub.getActive()).toHaveLength(1);
      expect(hub.getActive()[0].id).toMatch(/^arvo-overlay-/);

      el.remove();
    });

    it('defaults type to dropdown', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'default-type' });

      expect(hub.getActive()[0].type).toBe('dropdown');
      el.remove();
    });

    it('stores the triggerElement on the entry', () => {
      const el = makeEl();
      const trigger = makeEl();
      $(el).openOverlay({
        id: 'with-trigger',
        type: 'popover',
        triggerElement: trigger,
      });

      expect(hub.getActive()[0].triggerElement).toBe(trigger);

      el.remove();
      trigger.remove();
    });

    it('returns the jQuery object for chaining', () => {
      const el = makeEl();
      const $el = $(el);
      const result = $el.openOverlay({ id: 'chain', type: 'dropdown' });

      expect(result).toBe($el);
      el.remove();
    });

    it('closes a previous overlay on the same element before re-opening', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'first', type: 'dropdown' });
      expect(hub.isOpen('first')).toBe(true);

      $(el).openOverlay({ id: 'second', type: 'popover' });
      expect(hub.isOpen('first')).toBe(false);
      expect(hub.isOpen('second')).toBe(true);

      el.remove();
    });

    it('respects the priority field', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'prio', type: 'modal', priority: 50 });

      expect(hub.getActive()[0].priority).toBe(50);
      el.remove();
    });

    it('forwards onClose callback to the hub entry', () => {
      const onClose = vi.fn();
      const el = makeEl();
      $(el).openOverlay({ id: 'cb', type: 'dropdown', onClose });

      hub.close('cb');
      expect(onClose).toHaveBeenCalledOnce();

      el.remove();
    });

    it('handles an empty jQuery collection gracefully', () => {
      expect(() => $().openOverlay({ id: 'empty' })).not.toThrow();
    });

    it('opens overlays for each element in a multi-element collection', () => {
      const a = makeEl();
      const b = makeEl();
      $(a).add(b).openOverlay({ type: 'tooltip' });

      expect(hub.getActive()).toHaveLength(2);

      a.remove();
      b.remove();
    });
  });

  // -----------------------------------------------------------------------
  // $.fn.closeOverlay
  // -----------------------------------------------------------------------

  describe('$.fn.closeOverlay', () => {
    it('closes the overlay registered on the element', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'to-close', type: 'dropdown' });
      expect(hub.isOpen('to-close')).toBe(true);

      $(el).closeOverlay();
      expect(hub.isOpen('to-close')).toBe(false);

      el.remove();
    });

    it('returns the jQuery object for chaining', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'chain-close', type: 'dropdown' });
      const $el = $(el);
      const result = $el.closeOverlay();

      expect(result).toBe($el);
      el.remove();
    });

    it('is safe to call on an element that has no open overlay', () => {
      const el = makeEl();
      expect(() => $(el).closeOverlay()).not.toThrow();
      el.remove();
    });

    it('is safe to call on an empty jQuery collection', () => {
      expect(() => $().closeOverlay()).not.toThrow();
    });

    it('closes each overlay in a multi-element collection', () => {
      const a = makeEl();
      const b = makeEl();
      $(a).openOverlay({ id: 'ma', type: 'dropdown' });
      $(b).openOverlay({ id: 'mb', type: 'popover' });

      $(a).add(b).closeOverlay();

      expect(hub.isOpen('ma')).toBe(false);
      expect(hub.isOpen('mb')).toBe(false);

      a.remove();
      b.remove();
    });

    it('does not affect other open overlays', () => {
      const a = makeEl();
      const b = makeEl();
      $(a).openOverlay({ id: 'keep', type: 'dropdown' });
      $(b).openOverlay({ id: 'close-me', type: 'popover' });

      $(b).closeOverlay();

      expect(hub.isOpen('keep')).toBe(true);
      expect(hub.isOpen('close-me')).toBe(false);

      $(a).closeOverlay();
      a.remove();
      b.remove();
    });

    it('removes the element from internal tracking after close', () => {
      const el = makeEl();
      $(el).openOverlay({ id: 'tracked', type: 'dropdown' });
      $(el).closeOverlay();

      // Re-opening should not attempt to close a stale id.
      expect(() =>
        $(el).openOverlay({ id: 'new-id', type: 'dropdown' }),
      ).not.toThrow();
      expect(hub.isOpen('new-id')).toBe(true);

      $(el).closeOverlay();
      el.remove();
    });
  });

  // -----------------------------------------------------------------------
  // Integration: hub callbacks through jQuery API
  // -----------------------------------------------------------------------

  describe('hub callbacks', () => {
    it('fires onOpen callback configured via $.setupOverlays', () => {
      const onOpen = vi.fn();
      $.setupOverlays({ onOpen });

      const el = makeEl();
      $(el).openOverlay({ id: 'evt', type: 'dropdown' });
      expect(onOpen).toHaveBeenCalledWith('evt');

      el.remove();
    });

    it('fires onClose callback configured via $.setupOverlays', () => {
      const onClose = vi.fn();
      $.setupOverlays({ onClose });

      const el = makeEl();
      $(el).openOverlay({ id: 'evtc', type: 'dropdown' });
      $(el).closeOverlay();
      expect(onClose).toHaveBeenCalledWith('evtc');

      el.remove();
    });
  });

  // -----------------------------------------------------------------------
  // Multiple plugin installs (idempotency)
  // -----------------------------------------------------------------------

  it('re-installing the plugin overwrites the methods safely', () => {
    const hub2 = makeHub();
    setupOverlayPlugin($, hub2);

    const el = makeEl();
    $(el).openOverlay({ id: 'h2', type: 'dropdown' });

    expect(hub2.isOpen('h2')).toBe(true);
    expect(hub.isOpen('h2')).toBe(false);

    hub2.closeAll();
    el.remove();
  });
});
