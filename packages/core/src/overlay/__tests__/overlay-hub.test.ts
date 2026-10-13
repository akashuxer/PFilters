// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOverlayHub } from '../overlay-hub';
import type { OverlayEntry, OverlayHub } from '../overlay-hub';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<OverlayEntry> & { id: string },
): OverlayEntry {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return {
    type: 'dropdown',
    element: el,
    priority: 0,
    config: {},
    ...overrides,
  };
}

function ids(hub: OverlayHub): string[] {
  return hub.getActive().map((e) => e.id);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OverlayHub', () => {
  let hub: OverlayHub;
  const created: HTMLElement[] = [];

  function tracked(
    overrides: Partial<OverlayEntry> & { id: string },
  ): OverlayEntry {
    const entry = makeEntry(overrides);
    created.push(entry.element);
    return entry;
  }

  beforeEach(() => {
    hub = createOverlayHub();
  });

  afterEach(() => {
    // Close anything still open to detach listeners
    hub.closeAll();
    for (const el of created) el.remove();
    created.length = 0;
  });

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  describe('configure / getConfig', () => {
    it('returns default config initially', () => {
      const c = hub.getConfig();
      expect(c.containerSelector).toBe('body');
      expect(c.zIndexBase).toBe(1000);
      expect(c.autoCloseOnRouteChange).toBe(true);
      expect(c.autoCloseOnOutsideClick).toBe(true);
      expect(c.maxStack).toBe(0);
    });

    it('merges partial config', () => {
      hub.configure({ zIndexBase: 2000, maxStack: 3 });
      const c = hub.getConfig();
      expect(c.zIndexBase).toBe(2000);
      expect(c.maxStack).toBe(3);
      expect(c.containerSelector).toBe('body');
    });
  });

  // -----------------------------------------------------------------------
  // Open / Close / isOpen
  // -----------------------------------------------------------------------

  describe('open / close', () => {
    it('opens an overlay and reports it open', () => {
      const entry = tracked({ id: 'a' });
      hub.open(entry);
      expect(hub.isOpen('a')).toBe(true);
    });

    it('closes an overlay and reports it closed', () => {
      const entry = tracked({ id: 'a' });
      hub.open(entry);
      hub.close('a');
      expect(hub.isOpen('a')).toBe(false);
    });

    it('close is safe for unknown ids', () => {
      expect(() => hub.close('nonexistent')).not.toThrow();
    });

    it('replaces overlay with same id', () => {
      const e1 = tracked({ id: 'a' });
      const e2 = tracked({ id: 'a' });
      hub.open(e1);
      hub.open(e2);
      expect(hub.getActive()).toHaveLength(1);
      expect(hub.getActive()[0].element).toBe(e2.element);
    });
  });

  // -----------------------------------------------------------------------
  // Stack accessors
  // -----------------------------------------------------------------------

  describe('getActive / getTopmost', () => {
    it('getActive returns entries in open order', () => {
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      hub.open(tracked({ id: 'c' }));
      expect(ids(hub)).toEqual(['a', 'b', 'c']);
    });

    it('getTopmost returns the last opened entry', () => {
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      expect(hub.getTopmost()?.id).toBe('b');
    });

    it('getTopmost returns null when stack is empty', () => {
      expect(hub.getTopmost()).toBeNull();
    });

    it('getActive returns a copy', () => {
      hub.open(tracked({ id: 'a' }));
      const snap = hub.getActive();
      hub.close('a');
      expect(snap).toHaveLength(1);
      expect(hub.getActive()).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Z-index
  // -----------------------------------------------------------------------

  describe('z-index', () => {
    it('assigns z-index based on stack position', () => {
      hub.configure({ zIndexBase: 1000 });
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      hub.open(tracked({ id: 'c' }));

      expect(hub.getZIndex('a')).toBe(1000);
      expect(hub.getZIndex('b')).toBe(1010);
      expect(hub.getZIndex('c')).toBe(1020);
    });

    it('sets z-index on the overlay element', () => {
      hub.configure({ zIndexBase: 500 });
      const entry = tracked({ id: 'x' });
      hub.open(entry);
      expect(entry.element.style.zIndex).toBe('500');
    });

    it('recalculates z-indices when an overlay in the middle closes', () => {
      hub.open(tracked({ id: 'a' }));
      const b = tracked({ id: 'b' });
      hub.open(b);
      const c = tracked({ id: 'c' });
      hub.open(c);

      hub.close('b');
      expect(hub.getZIndex('a')).toBe(1000);
      expect(hub.getZIndex('c')).toBe(1010);
      expect(c.element.style.zIndex).toBe('1010');
    });

    it('returns base z-index for unknown id', () => {
      expect(hub.getZIndex('unknown')).toBe(1000);
    });
  });

  // -----------------------------------------------------------------------
  // attachWrapperElement -- composing overlays (ArvoWindow / ArvoAlertDialog)
  // -- whose panel is the registered surface need their outer host wrapper
  // pinned to the surface's hub-assigned z-index so the wrapper's stacking
  // context floats up with the consumer-configured layer.
  // -----------------------------------------------------------------------

  describe('attachWrapperElement', () => {
    it('pins wrapper z-index to surface z on attach', () => {
      hub.configure({ zIndexBase: 10000 });
      const entry = tracked({ id: 'win' });
      hub.open(entry);
      const wrapper = document.createElement('div');
      hub.attachWrapperElement('win', wrapper);
      // Surface and wrapper share the same hub-assigned z-index (10000).
      expect(entry.element.style.zIndex).toBe('10000');
      expect(wrapper.style.zIndex).toBe('10000');
    });

    it('keeps wrapper z-index in sync as siblings open and shift the stack', () => {
      hub.configure({ zIndexBase: 10000 });
      const win = tracked({ id: 'win' });
      hub.open(win);
      const wrapper = document.createElement('div');
      hub.attachWrapperElement('win', wrapper);
      expect(wrapper.style.zIndex).toBe('10000');

      // Opening a second overlay BEFORE the window in priority order would
      // push the window forward; here a sibling opened after the window
      // raises ITS own z-index above the window. Either way, the wrapper
      // must continue to mirror the window surface's z-index across the
      // refresh. We test the simple "open after" case which advances the
      // window stack index by 0 (window stays at index 0) and assigns the
      // sibling to index 1 -- wrapper unchanged at 10000.
      hub.open(tracked({ id: 'sibling' }));
      expect(win.element.style.zIndex).toBe('10000');
      expect(wrapper.style.zIndex).toBe('10000');

      // Now reverse: closing the older sibling and opening another should
      // not strand the wrapper at a stale value. Close + open re-runs
      // refreshZIndices and the wrapper must follow.
      hub.close('sibling');
      hub.open(tracked({ id: 'sibling2' }));
      expect(wrapper.style.zIndex).toBe(win.element.style.zIndex);
    });

    it('removes the inline z-index from the wrapper on detach', () => {
      hub.configure({ zIndexBase: 5000 });
      const entry = tracked({ id: 'dlg' });
      hub.open(entry);
      const wrapper = document.createElement('div');
      hub.attachWrapperElement('dlg', wrapper);
      expect(wrapper.style.zIndex).toBe('5000');

      hub.attachWrapperElement('dlg', null);
      expect(wrapper.style.zIndex).toBe('');
      // Subsequent stack changes must NOT touch the detached wrapper.
      hub.open(tracked({ id: 'other' }));
      expect(wrapper.style.zIndex).toBe('');
    });

    it('no-ops for an unknown id', () => {
      const wrapper = document.createElement('div');
      hub.attachWrapperElement('missing', wrapper);
      expect(wrapper.style.zIndex).toBe('');
    });

    it('keeps mask at z-1 and wrapper at z when both are attached', () => {
      hub.configure({ zIndexBase: 10000 });
      const entry = tracked({ id: 'win' });
      hub.open(entry);
      const wrapper = document.createElement('div');
      const mask = document.createElement('div');
      hub.attachWrapperElement('win', wrapper);
      hub.attachMaskElement('win', mask);
      expect(entry.element.style.zIndex).toBe('10000');
      expect(wrapper.style.zIndex).toBe('10000');
      expect(mask.style.zIndex).toBe('9999');
    });
  });

  // -----------------------------------------------------------------------
  // Stacking rules
  // -----------------------------------------------------------------------

  describe('stacking rules', () => {
    it('modal displaces dropdowns and popovers', () => {
      hub.open(tracked({ id: 'dd', type: 'dropdown' }));
      hub.open(tracked({ id: 'pop', type: 'popover' }));
      hub.open(tracked({ id: 'modal', type: 'modal' }));

      expect(hub.isOpen('dd')).toBe(false);
      expect(hub.isOpen('pop')).toBe(false);
      expect(hub.isOpen('modal')).toBe(true);
    });

    it('side-panel displaces dropdowns and action menus', () => {
      hub.open(tracked({ id: 'dd', type: 'dropdown' }));
      hub.open(tracked({ id: 'am', type: 'action-menu' }));
      hub.open(tracked({ id: 'sp', type: 'side-panel' }));

      expect(hub.isOpen('dd')).toBe(false);
      expect(hub.isOpen('am')).toBe(false);
      expect(hub.isOpen('sp')).toBe(true);
    });

    it('modal does not displace other modals', () => {
      hub.open(tracked({ id: 'm1', type: 'modal' }));
      hub.open(tracked({ id: 'm2', type: 'modal' }));
      expect(hub.isOpen('m1')).toBe(true);
      expect(hub.isOpen('m2')).toBe(true);
    });

    it('action menu closes other action menus', () => {
      hub.open(tracked({ id: 'am1', type: 'action-menu' }));
      hub.open(tracked({ id: 'am2', type: 'action-menu' }));
      expect(hub.isOpen('am1')).toBe(false);
      expect(hub.isOpen('am2')).toBe(true);
    });

    it('tooltips are not displaced by modals', () => {
      hub.open(tracked({ id: 'tip', type: 'tooltip' }));
      hub.open(tracked({ id: 'modal', type: 'modal' }));
      expect(hub.isOpen('tip')).toBe(true);
    });

    it('toasts always stack above modals regardless of open order', () => {
      hub.configure({ zIndexBase: 1000 });
      hub.open(tracked({ id: 'toast', type: 'toast' }));
      hub.open(tracked({ id: 'modal', type: 'modal' }));

      expect(hub.getZIndex('toast')).toBeGreaterThan(hub.getZIndex('modal'));
    });

    it('toasts stack above backdrop when modal opens after toast', () => {
      hub.configure({ zIndexBase: 1000 });
      hub.open(tracked({ id: 'toast', type: 'toast' }));

      const modalEl = document.createElement('div');
      modalEl.appendChild(document.createElement('button'));
      document.body.appendChild(modalEl);
      created.push(modalEl);
      hub.open({
        id: 'modal',
        type: 'modal',
        element: modalEl,
        priority: 0,
        config: {},
      });

      const backdrop = document.body.querySelector(
        '.arvo-backdrop',
      ) as HTMLElement;
      expect(hub.getZIndex('toast')).toBeGreaterThan(
        Number(backdrop.style.zIndex),
      );
    });
  });

  // -----------------------------------------------------------------------
  // closeAll / closeByType
  // -----------------------------------------------------------------------

  describe('closeAll', () => {
    it('closes all overlays', () => {
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      hub.closeAll();
      expect(hub.getActive()).toHaveLength(0);
    });

    it('respects except list', () => {
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      hub.open(tracked({ id: 'c' }));
      hub.closeAll({ except: ['b'] });
      expect(ids(hub)).toEqual(['b']);
    });
  });

  describe('closeByType', () => {
    it('closes all overlays of a specific type', () => {
      hub.open(tracked({ id: 'd1', type: 'dropdown' }));
      hub.open(tracked({ id: 'd2', type: 'dropdown' }));
      hub.open(tracked({ id: 'p1', type: 'popover' }));
      hub.closeByType('dropdown');
      expect(ids(hub)).toEqual(['p1']);
    });
  });

  // -----------------------------------------------------------------------
  // maxStack
  // -----------------------------------------------------------------------

  describe('maxStack', () => {
    it('evicts oldest overlay when maxStack is exceeded', () => {
      hub.configure({ maxStack: 2 });
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      hub.open(tracked({ id: 'c' }));
      expect(ids(hub)).toEqual(['b', 'c']);
    });

    it('does not evict when maxStack is 0 (unlimited)', () => {
      hub.configure({ maxStack: 0 });
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));
      hub.open(tracked({ id: 'c' }));
      expect(hub.getActive()).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // getContainer
  // -----------------------------------------------------------------------

  describe('getContainer', () => {
    it('returns body by default', () => {
      expect(hub.getContainer()).toBe(document.body);
    });

    it('returns element matching containerSelector', () => {
      const div = document.createElement('div');
      div.id = 'overlay-root';
      document.body.appendChild(div);
      hub.configure({ containerSelector: '#overlay-root' });
      expect(hub.getContainer()).toBe(div);
      div.remove();
    });

    it('falls back to body when selector does not match', () => {
      hub.configure({ containerSelector: '#nonexistent' });
      expect(hub.getContainer()).toBe(document.body);
    });
  });

  // -----------------------------------------------------------------------
  // Outside click
  // -----------------------------------------------------------------------

  describe('outside click', () => {
    it('closes ALL consecutive top dismissable overlays on outside click', () => {
      // A single outside-click gesture must close the entire dismissable
      // run, not just the topmost overlay -- otherwise an open ActionMenu
      // stays visible after clicking outside its open submenu. The hub
      // walks down the stack and closes every consecutive dismissable
      // entry whose element + trigger don't contain the click target.
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));

      document.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      expect(hub.isOpen('b')).toBe(false);
      expect(hub.isOpen('a')).toBe(false);
    });

    it('stops cascading when an overlay element contains the click', () => {
      const a = tracked({ id: 'a' });
      const b = tracked({ id: 'b' });
      hub.open(a);
      hub.open(b);

      // Click target is inside `a`'s element but outside `b`'s.
      // The top entry (`b`) closes; `a` is preserved because the click
      // landed inside it.
      a.element.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      expect(hub.isOpen('b')).toBe(false);
      expect(hub.isOpen('a')).toBe(true);
    });

    it('stops cascading when an overlay trigger contains the click', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      created.push(trigger);

      hub.open(tracked({ id: 'a', triggerElement: trigger }));
      hub.open(tracked({ id: 'b' }));

      // Click target is the trigger of `a`. The top entry `b` closes,
      // but `a` is preserved (its trigger contained the click).
      trigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      expect(hub.isOpen('b')).toBe(false);
      expect(hub.isOpen('a')).toBe(true);
    });

    it('does not close when click is inside the overlay', () => {
      const entry = tracked({ id: 'a' });
      hub.open(entry);

      entry.element.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      expect(hub.isOpen('a')).toBe(true);
    });

    it('does not close when click is on the trigger element', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      created.push(trigger);

      hub.open(tracked({ id: 'a', triggerElement: trigger }));
      trigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      expect(hub.isOpen('a')).toBe(true);
    });

    it('respects autoCloseOnOutsideClick: false on entry config', () => {
      hub.open(
        tracked({
          id: 'a',
          config: { autoCloseOnOutsideClick: false },
        }),
      );

      document.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      expect(hub.isOpen('a')).toBe(true);
    });

    it('non-dismissable overlay blocks dismissal of overlays below', () => {
      hub.open(tracked({ id: 'a' }));
      hub.open(
        tracked({
          id: 'b',
          config: { autoCloseOnOutsideClick: false },
        }),
      );

      document.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      // b blocks dismissal, a is untouched
      expect(hub.isOpen('a')).toBe(true);
      expect(hub.isOpen('b')).toBe(true);
    });

    it('does not close parent overlay when click lands in a portaled child overlay panel', () => {
      // Parent (e.g. a popover) hosts an inner trigger that opens a
      // child overlay (e.g. a dropdown menu) whose panel is portaled
      // to <body>. A click on a menu item should NOT close the parent
      // even though the menu element is not a DOM descendant of the
      // parent's panel.
      const parent = tracked({ id: 'parent' });
      const childTrigger = document.createElement('button');
      parent.element.appendChild(childTrigger);
      const child = tracked({ id: 'child', triggerElement: childTrigger });

      hub.open(parent);
      hub.open(child);

      const menuItem = document.createElement('div');
      child.element.appendChild(menuItem);

      menuItem.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );

      // Both should remain open: the click is inside the child overlay
      // and the child is nested inside the parent via trigger DOM
      // containment.
      expect(hub.isOpen('child')).toBe(true);
      expect(hub.isOpen('parent')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // isOverlayClickInside helper
  // -----------------------------------------------------------------------

  describe('isOverlayClickInside', () => {
    it('returns false for null/undefined root or target', () => {
      const target = document.createElement('div');
      expect(hub.isOverlayClickInside(null, target)).toBe(false);
      expect(hub.isOverlayClickInside(undefined, target)).toBe(false);
      const root = document.createElement('div');
      expect(hub.isOverlayClickInside(root, null)).toBe(false);
      expect(hub.isOverlayClickInside(root, undefined)).toBe(false);
    });

    it('returns true when target is a DOM descendant of root', () => {
      const root = document.createElement('div');
      const child = document.createElement('span');
      root.appendChild(child);
      expect(hub.isOverlayClickInside(root, child)).toBe(true);
      expect(hub.isOverlayClickInside(root, root)).toBe(true);
    });

    it('returns false when target is completely outside root and no nested overlays exist', () => {
      const root = document.createElement('div');
      const other = document.createElement('div');
      expect(hub.isOverlayClickInside(root, other)).toBe(false);
    });

    it('returns true when target is inside a nested overlay portaled outside root', () => {
      const parent = tracked({ id: 'parent' });
      const childTrigger = document.createElement('button');
      parent.element.appendChild(childTrigger);
      const child = tracked({ id: 'child', triggerElement: childTrigger });
      hub.open(parent);
      hub.open(child);

      const item = document.createElement('div');
      child.element.appendChild(item);

      // Even though `child.element` lives at body level (portaled), the
      // helper recognizes it as a descendant of `parent.element`
      // because the child's trigger sits inside `parent.element`.
      expect(hub.isOverlayClickInside(parent.element, item)).toBe(true);
      // The trigger itself also counts as inside.
      expect(
        hub.isOverlayClickInside(parent.element, childTrigger),
      ).toBe(true);
    });

    it('recurses through grandchild overlays via trigger chain', () => {
      const grand = tracked({ id: 'grand' });
      const childTrigger = document.createElement('button');
      grand.element.appendChild(childTrigger);
      const child = tracked({ id: 'child', triggerElement: childTrigger });
      const grandchildTrigger = document.createElement('button');
      child.element.appendChild(grandchildTrigger);
      const grandchild = tracked({
        id: 'grandchild',
        triggerElement: grandchildTrigger,
      });
      hub.open(grand);
      hub.open(child);
      hub.open(grandchild);

      const deep = document.createElement('div');
      grandchild.element.appendChild(deep);

      expect(hub.isOverlayClickInside(grand.element, deep)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Escape key
  // -----------------------------------------------------------------------

  describe('escape key', () => {
    it('closes topmost dismissable overlay on Escape', () => {
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(hub.isOpen('b')).toBe(false);
      expect(hub.isOpen('a')).toBe(true);
    });

    it('does not close non-dismissable overlays', () => {
      hub.open(
        tracked({
          id: 'a',
          config: { autoCloseOnOutsideClick: false },
        }),
      );

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(hub.isOpen('a')).toBe(true);
    });

    it('does nothing when stack is empty', () => {
      expect(() =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        ),
      ).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Route change
  // -----------------------------------------------------------------------

  describe('route change', () => {
    it('closes all overlays on popstate when enabled', () => {
      hub.configure({ autoCloseOnRouteChange: true });
      hub.open(tracked({ id: 'a' }));
      hub.open(tracked({ id: 'b' }));

      window.dispatchEvent(new Event('popstate'));
      expect(hub.getActive()).toHaveLength(0);
    });

    it('does not close overlays when autoCloseOnRouteChange is false', () => {
      hub.configure({ autoCloseOnRouteChange: false });
      hub.open(tracked({ id: 'a' }));

      window.dispatchEvent(new Event('popstate'));
      expect(hub.isOpen('a')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Focus trap integration
  // -----------------------------------------------------------------------

  describe('focus trap', () => {
    it('activates focus trap for modal overlays', () => {
      const el = document.createElement('div');
      const btn = document.createElement('button');
      el.appendChild(btn);
      document.body.appendChild(el);
      created.push(el);

      hub.open({
        id: 'modal',
        type: 'modal',
        element: el,
        priority: 0,
        config: {},
      });

      expect(document.activeElement).toBe(btn);
    });

    it('restores focus when modal closes', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      created.push(outside);
      outside.focus();

      const el = document.createElement('div');
      const inner = document.createElement('button');
      el.appendChild(inner);
      document.body.appendChild(el);
      created.push(el);

      hub.open({
        id: 'modal',
        type: 'modal',
        element: el,
        priority: 0,
        config: {},
      });
      expect(document.activeElement).toBe(inner);

      hub.close('modal');
      expect(document.activeElement).toBe(outside);
    });

    it('activates focus trap for side-panel overlays', () => {
      const el = document.createElement('div');
      const btn = document.createElement('button');
      el.appendChild(btn);
      document.body.appendChild(el);
      created.push(el);

      hub.open({
        id: 'sp',
        type: 'side-panel',
        element: el,
        priority: 0,
        config: {},
      });

      expect(document.activeElement).toBe(btn);
      hub.close('sp');
    });

    it('does not activate focus trap for dropdowns', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      created.push(outside);
      outside.focus();

      hub.open(tracked({ id: 'dd', type: 'dropdown' }));
      expect(document.activeElement).toBe(outside);
    });
  });

  // -----------------------------------------------------------------------
  // Backdrop integration
  // -----------------------------------------------------------------------

  describe('backdrop', () => {
    it('shows backdrop when a modal opens', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('button'));
      document.body.appendChild(el);
      created.push(el);

      hub.open({
        id: 'modal',
        type: 'modal',
        element: el,
        priority: 0,
        config: {},
      });

      expect(
        document.body.querySelector('.arvo-backdrop'),
      ).not.toBeNull();
    });

    it('removes backdrop when the last modal closes', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('button'));
      document.body.appendChild(el);
      created.push(el);

      hub.open({
        id: 'modal',
        type: 'modal',
        element: el,
        priority: 0,
        config: {},
      });
      hub.close('modal');

      expect(document.body.querySelector('.arvo-backdrop')).toBeNull();
    });

    it('keeps backdrop when a stacked modal remains', () => {
      const el1 = document.createElement('div');
      el1.appendChild(document.createElement('button'));
      document.body.appendChild(el1);
      created.push(el1);

      const el2 = document.createElement('div');
      el2.appendChild(document.createElement('button'));
      document.body.appendChild(el2);
      created.push(el2);

      hub.open({
        id: 'm1',
        type: 'modal',
        element: el1,
        priority: 0,
        config: {},
      });
      hub.open({
        id: 'm2',
        type: 'modal',
        element: el2,
        priority: 0,
        config: {},
      });
      hub.close('m2');

      expect(
        document.body.querySelector('.arvo-backdrop'),
      ).not.toBeNull();
    });

    it('backdrop z-index is one below the topmost modal', () => {
      hub.configure({ zIndexBase: 1000 });
      const el = document.createElement('div');
      el.appendChild(document.createElement('button'));
      document.body.appendChild(el);
      created.push(el);

      hub.open({
        id: 'modal',
        type: 'modal',
        element: el,
        priority: 0,
        config: {},
      });

      const backdrop = document.body.querySelector(
        '.arvo-backdrop',
      ) as HTMLElement;
      const modalZ = hub.getZIndex('modal');
      expect(backdrop.style.zIndex).toBe(String(modalZ - 1));
    });
  });

  // -----------------------------------------------------------------------
  // Callbacks
  // -----------------------------------------------------------------------

  describe('callbacks', () => {
    it('fires onOpen when an overlay opens', () => {
      const onOpen = vi.fn();
      hub.configure({ onOpen });
      hub.open(tracked({ id: 'a' }));
      expect(onOpen).toHaveBeenCalledWith('a');
    });

    it('fires onClose when an overlay closes', () => {
      const onClose = vi.fn();
      hub.configure({ onClose });
      hub.open(tracked({ id: 'a' }));
      hub.close('a');
      expect(onClose).toHaveBeenCalledWith('a');
    });

    it('fires onStackChange on open and close', () => {
      const onStackChange = vi.fn();
      hub.configure({ onStackChange });

      hub.open(tracked({ id: 'a' }));
      expect(onStackChange).toHaveBeenCalledWith(['a']);

      hub.open(tracked({ id: 'b' }));
      expect(onStackChange).toHaveBeenCalledWith(['a', 'b']);

      hub.close('a');
      expect(onStackChange).toHaveBeenCalledWith(['b']);
    });

    it('fires entry onClose callback', () => {
      const onClose = vi.fn();
      const entry = tracked({ id: 'a' });
      entry.onClose = onClose;
      hub.open(entry);
      hub.close('a');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // Nested action-menu stacking
  // -----------------------------------------------------------------------

  describe('nested action-menu stacking', () => {
    it('keeps parent and child action-menus when a submenu opens', () => {
      hub.open(
        tracked({ id: 'root', type: 'action-menu' }),
      );
      hub.open(
        tracked({
          id: 'sub',
          type: 'action-menu',
          parentId: 'root',
          relation: 'submenu',
        }),
      );

      expect(ids(hub)).toEqual(['root', 'sub']);
    });

    it('closes unrelated root action-menus when a new root menu opens', () => {
      hub.open(tracked({ id: 'menu-a', type: 'action-menu' }));
      hub.open(tracked({ id: 'menu-b', type: 'action-menu' }));

      expect(ids(hub)).toEqual(['menu-b']);
    });

    it('keeps the full submenu chain when a third level opens', () => {
      hub.open(tracked({ id: 'root', type: 'action-menu' }));
      hub.open(
        tracked({
          id: 'sub-1',
          type: 'action-menu',
          parentId: 'root',
          relation: 'submenu',
        }),
      );
      hub.open(
        tracked({
          id: 'sub-2',
          type: 'action-menu',
          parentId: 'sub-1',
          relation: 'submenu',
        }),
      );

      expect(ids(hub)).toEqual(['root', 'sub-1', 'sub-2']);
    });
  });

  // -----------------------------------------------------------------------
  // Global listener lifecycle
  // -----------------------------------------------------------------------

  describe('listener lifecycle', () => {
    it('does not leak listeners after all overlays close', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      hub.open(tracked({ id: 'a' }));
      const addCount = addSpy.mock.calls.length;

      hub.close('a');
      expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(
        addCount,
      );

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Hub-driven nesting awareness
  // -----------------------------------------------------------------------

  describe('parent inference from trigger DOM ancestry', () => {
    it('infers parentId when triggerElement lives inside an open overlay', () => {
      const parent = tracked({ id: 'parent', type: 'popover' });
      hub.open(parent);

      const childTrigger = document.createElement('button');
      parent.element.appendChild(childTrigger);

      const child = tracked({
        id: 'child',
        type: 'dropdown',
        triggerElement: childTrigger,
      });
      hub.open(child);

      expect(child.parentId).toBe('parent');
      expect(hub.isOpen('parent')).toBe(true);
      expect(hub.isOpen('child')).toBe(true);
    });

    it('does not infer parentId when triggerElement is outside every open overlay', () => {
      const parent = tracked({ id: 'parent', type: 'popover' });
      hub.open(parent);

      const outsideTrigger = document.createElement('button');
      document.body.appendChild(outsideTrigger);
      created.push(outsideTrigger);

      const sibling = tracked({
        id: 'sibling',
        type: 'popover',
        triggerElement: outsideTrigger,
      });
      hub.open(sibling);

      expect(sibling.parentId).toBeUndefined();
    });

    it('respects explicit parentId over auto-detection', () => {
      const a = tracked({ id: 'a', type: 'popover' });
      const b = tracked({ id: 'b', type: 'popover' });
      hub.open(a);
      hub.open(b);

      const trigger = document.createElement('button');
      a.element.appendChild(trigger);
      const c = tracked({
        id: 'c',
        type: 'popover',
        triggerElement: trigger,
        parentId: 'b',
      });
      hub.open(c);

      expect(c.parentId).toBe('b');
    });

    it('keeps parent action-menu open when an inner action-menu opens via auto-detect (overflow DropdownIconButton scenario)', () => {
      const root = tracked({ id: 'root', type: 'action-menu' });
      hub.open(root);

      const innerTrigger = document.createElement('button');
      root.element.appendChild(innerTrigger);

      const inner = tracked({
        id: 'inner',
        type: 'action-menu',
        triggerElement: innerTrigger,
      });
      hub.open(inner);

      expect(inner.parentId).toBe('root');
      expect(hub.isOpen('root')).toBe(true);
      expect(hub.isOpen('inner')).toBe(true);
    });

    it('keeps an outer action-menu open across a popover sandwich (menu -> popover -> menu)', () => {
      const outerMenu = tracked({ id: 'menu-outer', type: 'action-menu' });
      hub.open(outerMenu);

      const popoverTrigger = document.createElement('button');
      outerMenu.element.appendChild(popoverTrigger);
      const popover = tracked({
        id: 'pop',
        type: 'popover',
        triggerElement: popoverTrigger,
      });
      hub.open(popover);

      const innerMenuTrigger = document.createElement('button');
      popover.element.appendChild(innerMenuTrigger);
      const innerMenu = tracked({
        id: 'menu-inner',
        type: 'action-menu',
        triggerElement: innerMenuTrigger,
      });
      hub.open(innerMenu);

      expect(hub.isOpen('menu-outer')).toBe(true);
      expect(hub.isOpen('pop')).toBe(true);
      expect(hub.isOpen('menu-inner')).toBe(true);
    });

    it('still closes unrelated root action-menus when the new menu has no DOM relation to them', () => {
      hub.open(tracked({ id: 'menu-a', type: 'action-menu' }));

      const standaloneTrigger = document.createElement('button');
      document.body.appendChild(standaloneTrigger);
      created.push(standaloneTrigger);

      hub.open(
        tracked({
          id: 'menu-b',
          type: 'action-menu',
          triggerElement: standaloneTrigger,
        }),
      );

      expect(hub.isOpen('menu-a')).toBe(false);
      expect(hub.isOpen('menu-b')).toBe(true);
    });
  });

  describe('tree-aware z-index ordering', () => {
    it('children always receive a higher z-index than their parent', () => {
      hub.configure({ zIndexBase: 1000 });

      const parent = tracked({ id: 'p', type: 'popover' });
      hub.open(parent);

      const innerTrigger = document.createElement('button');
      parent.element.appendChild(innerTrigger);
      const child = tracked({
        id: 'c',
        type: 'dropdown',
        triggerElement: innerTrigger,
      });
      hub.open(child);

      expect(hub.getZIndex('c')).toBeGreaterThan(hub.getZIndex('p'));
    });

    it('a tooltip nested in a toast stacks above the toast (toast title truncation tooltip scenario)', () => {
      hub.configure({ zIndexBase: 1000 });

      const toast = tracked({ id: 'toast', type: 'toast' });
      hub.open(toast);

      const titleEl = document.createElement('p');
      toast.element.appendChild(titleEl);
      const tip = tracked({
        id: 'tip',
        type: 'tooltip',
        triggerElement: titleEl,
      });
      hub.open(tip);

      expect(tip.parentId).toBe('toast');
      expect(hub.getZIndex('tip')).toBeGreaterThan(hub.getZIndex('toast'));
    });

    it('an unrelated tooltip stacks above an unrelated toast regardless of open order', () => {
      hub.configure({ zIndexBase: 1000 });

      hub.open(tracked({ id: 'toast', type: 'toast' }));
      hub.open(tracked({ id: 'tip', type: 'tooltip' }));
      expect(hub.getZIndex('tip')).toBeGreaterThan(hub.getZIndex('toast'));

      hub.close('tip');
      hub.close('toast');

      hub.open(tracked({ id: 'tip-2', type: 'tooltip' }));
      hub.open(tracked({ id: 'toast-2', type: 'toast' }));
      expect(hub.getZIndex('tip-2')).toBeGreaterThan(
        hub.getZIndex('toast-2'),
      );
    });

    it('uses zIndexBase + index*10 over the tree-flattened ordering', () => {
      hub.configure({ zIndexBase: 2000 });

      const a = tracked({ id: 'a', type: 'popover' });
      hub.open(a);

      const innerTrigger = document.createElement('button');
      a.element.appendChild(innerTrigger);
      const b = tracked({
        id: 'b',
        type: 'dropdown',
        triggerElement: innerTrigger,
      });
      hub.open(b);

      const c = tracked({ id: 'c', type: 'toast' });
      hub.open(c);

      // Roots: a (popover, prio 0), c (toast, prio 1) -> [a, c].
      // Children of a: [b]. Flattened: [a, b, c].
      expect(hub.getZIndex('a')).toBe(2000);
      expect(hub.getZIndex('b')).toBe(2010);
      expect(hub.getZIndex('c')).toBe(2020);
    });

    it('preserves modal-displaces-popover behavior even when popover is the modal trigger ancestor', () => {
      const popover = tracked({ id: 'pop', type: 'popover' });
      hub.open(popover);

      const modalTrigger = document.createElement('button');
      popover.element.appendChild(modalTrigger);

      const modalEl = document.createElement('div');
      modalEl.appendChild(document.createElement('button'));
      document.body.appendChild(modalEl);
      created.push(modalEl);

      hub.open({
        id: 'modal',
        type: 'modal',
        element: modalEl,
        triggerElement: modalTrigger,
        priority: 0,
        config: {},
      });

      expect(hub.isOpen('pop')).toBe(false);
      expect(hub.isOpen('modal')).toBe(true);
    });
  });
});
