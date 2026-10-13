// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createArrowNav } from '../arrow-nav';

function makeKey(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
}

describe('createArrowNav', () => {
  let container: HTMLDivElement;
  let items: HTMLElement[];

  beforeEach(() => {
    container = document.createElement('div');
    items = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.id = `item-${i}`;
      el.textContent = `Item ${i}`;
      container.appendChild(el);
      items.push(el);
    }
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('vertical orientation', () => {
    it('navigates forward on ArrowDown', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      const event = makeKey('ArrowDown');
      nav.handleKeyDown(event);

      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('navigates backward on ArrowUp', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      nav.handleKeyDown(makeKey('ArrowDown'));
      onNavigate.mockClear();

      const event = makeKey('ArrowUp');
      nav.handleKeyDown(event);

      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('ignores ArrowLeft and ArrowRight', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowLeft'));
      nav.handleKeyDown(makeKey('ArrowRight'));

      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });
  });

  describe('horizontal orientation', () => {
    it('navigates forward on ArrowRight', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'horizontal',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowRight'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      nav.destroy();
    });

    it('navigates backward on ArrowLeft', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'horizontal',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowRight'));
      nav.handleKeyDown(makeKey('ArrowRight'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('ArrowLeft'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      nav.destroy();
    });

    it('ignores ArrowUp and ArrowDown', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'horizontal',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowUp'));
      nav.handleKeyDown(makeKey('ArrowDown'));

      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });
  });

  describe('wrapping', () => {
    it('wraps forward from last to first', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: true,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      nav.handleKeyDown(makeKey('ArrowDown'));
      nav.handleKeyDown(makeKey('ArrowDown'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).toHaveBeenCalledWith(items[0], 0);
      nav.destroy();
    });

    it('wraps backward from first to last', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: true,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowUp'));
      expect(onNavigate).toHaveBeenCalledWith(items[3], 3);
      nav.destroy();
    });

    it('clamps at last when wrap is false', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      nav.handleKeyDown(makeKey('ArrowDown'));
      nav.handleKeyDown(makeKey('ArrowDown'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });

    it('clamps at first when wrap is false', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowUp'));
      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });
  });

  describe('Home and End', () => {
    it('jumps to first item on Home', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      nav.handleKeyDown(makeKey('ArrowDown'));
      onNavigate.mockClear();

      const event = makeKey('Home');
      nav.handleKeyDown(event);

      expect(onNavigate).toHaveBeenCalledWith(items[0], 0);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('does not fire onNavigate if already at first', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('Home'));
      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });

    it('jumps to last item on End', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      const event = makeKey('End');
      nav.handleKeyDown(event);

      expect(onNavigate).toHaveBeenCalledWith(items[3], 3);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('does not fire onNavigate if already at last', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('End'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('End'));
      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });
  });

  describe('selection', () => {
    it('calls onSelect with Enter', () => {
      const onNavigate = vi.fn();
      const onSelect = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        onSelect,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      const event = makeKey('Enter');
      nav.handleKeyDown(event);

      expect(onSelect).toHaveBeenCalledWith(items[1], 1);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('calls onSelect with Space', () => {
      const onSelect = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate: vi.fn(),
        onSelect,
      });

      const event = makeKey(' ');
      nav.handleKeyDown(event);

      expect(onSelect).toHaveBeenCalledWith(items[0], 0);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('does not preventDefault when onSelect is not provided', () => {
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate: vi.fn(),
      });

      const event = makeKey('Enter');
      nav.handleKeyDown(event);
      expect(event.defaultPrevented).toBe(false);
      nav.destroy();
    });
  });

  describe('escape', () => {
    it('calls onEscape on Escape key', () => {
      const onEscape = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate: vi.fn(),
        onEscape,
      });

      const event = makeKey('Escape');
      nav.handleKeyDown(event);

      expect(onEscape).toHaveBeenCalledOnce();
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });

    it('does not preventDefault when onEscape is not provided', () => {
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate: vi.fn(),
      });

      const event = makeKey('Escape');
      nav.handleKeyDown(event);
      expect(event.defaultPrevented).toBe(false);
      nav.destroy();
    });
  });

  describe('setItems', () => {
    it('updates the items list', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      const newItems = items.slice(0, 2);
      nav.setItems(newItems);

      nav.handleKeyDown(makeKey('End'));
      expect(onNavigate).toHaveBeenCalledWith(newItems[1], 1);
      nav.destroy();
    });

    it('clamps currentIndex when items shrink', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.handleKeyDown(makeKey('End'));
      onNavigate.mockClear();

      nav.setItems(items.slice(0, 2));

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });
  });

  describe('destroy', () => {
    it('stops responding to key events after destroy', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
      });

      nav.destroy();

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  it('does nothing with empty items', () => {
    const onNavigate = vi.fn();
    const nav = createArrowNav({
      items: [],
      orientation: 'vertical',
      wrap: false,
      onNavigate,
    });

    nav.handleKeyDown(makeKey('ArrowDown'));
    expect(onNavigate).not.toHaveBeenCalled();
    nav.destroy();
  });

  it('does not preventDefault on unrelated keys', () => {
    const nav = createArrowNav({
      items,
      orientation: 'vertical',
      wrap: false,
      onNavigate: vi.fn(),
    });

    const event = makeKey('a');
    nav.handleKeyDown(event);
    expect(event.defaultPrevented).toBe(false);
    nav.destroy();
  });

  // -----------------------------------------------------------------------
  // skipDisabled
  // -----------------------------------------------------------------------

  describe('skipDisabled', () => {
    it('skips disabled items going forward', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        skipDisabled: (i) => i === 1,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
      nav.destroy();
    });

    it('skips disabled items going backward', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        skipDisabled: (i) => i === 2,
      });

      nav.handleKeyDown(makeKey('End'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('ArrowUp'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      nav.destroy();
    });

    it('skips consecutive disabled items', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        skipDisabled: (i) => i === 1 || i === 2,
      });

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).toHaveBeenCalledWith(items[3], 3);
      nav.destroy();
    });

    it('skips disabled items on Home', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        skipDisabled: (i) => i === 0,
      });

      nav.handleKeyDown(makeKey('End'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('Home'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      nav.destroy();
    });

    it('skips disabled items on End', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        skipDisabled: (i) => i === 3,
      });

      nav.handleKeyDown(makeKey('End'));
      expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
      nav.destroy();
    });

    it('wraps past disabled items when wrap is true', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: true,
        onNavigate,
        skipDisabled: (i) => i === 0,
      });

      nav.handleKeyDown(makeKey('End'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('ArrowDown'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      nav.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // typeAhead
  // -----------------------------------------------------------------------

  describe('typeAhead', () => {
    const labels = ['Apple', 'Banana', 'Blueberry', 'Cherry'];

    it('jumps to first matching item on single character', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        typeAhead: { getLabel: (i) => labels[i] },
      });

      nav.handleKeyDown(makeKey('b'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      nav.destroy();
    });

    it('accumulates characters for multi-char matching', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        typeAhead: { getLabel: (i) => labels[i] },
      });

      nav.handleKeyDown(makeKey('b'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('l'));
      expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
      nav.destroy();
    });

    it('resets buffer after debounce timeout', () => {
      vi.useFakeTimers();
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        typeAhead: { getLabel: (i) => labels[i], debounceMs: 200 },
      });

      nav.handleKeyDown(makeKey('b'));
      expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
      onNavigate.mockClear();

      vi.advanceTimersByTime(250);

      nav.handleKeyDown(makeKey('c'));
      expect(onNavigate).toHaveBeenCalledWith(items[3], 3);

      nav.destroy();
      vi.useRealTimers();
    });

    it('searches forward wrapping when wrap is true', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: true,
        onNavigate,
        typeAhead: { getLabel: (i) => labels[i] },
      });

      nav.handleKeyDown(makeKey('End'));
      onNavigate.mockClear();

      nav.handleKeyDown(makeKey('a'));
      expect(onNavigate).toHaveBeenCalledWith(items[0], 0);
      nav.destroy();
    });

    it('is case-insensitive', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        typeAhead: { getLabel: (i) => labels[i] },
      });

      nav.handleKeyDown(makeKey('C'));
      expect(onNavigate).toHaveBeenCalledWith(items[3], 3);
      nav.destroy();
    });

    it('skips disabled items during type-ahead', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        skipDisabled: (i) => i === 1,
        typeAhead: { getLabel: (i) => labels[i] },
      });

      nav.handleKeyDown(makeKey('b'));
      expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
      nav.destroy();
    });

    it('does not trigger on Enter, Space, or Escape', () => {
      const onNavigate = vi.fn();
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate,
        typeAhead: { getLabel: (i) => labels[i] },
      });

      nav.handleKeyDown(makeKey('Enter'));
      nav.handleKeyDown(makeKey(' '));
      nav.handleKeyDown(makeKey('Escape'));
      expect(onNavigate).not.toHaveBeenCalled();
      nav.destroy();
    });

    it('prevents default on printable character', () => {
      const nav = createArrowNav({
        items,
        orientation: 'vertical',
        wrap: false,
        onNavigate: vi.fn(),
        typeAhead: { getLabel: (i) => labels[i] },
      });

      const event = makeKey('a');
      nav.handleKeyDown(event);
      expect(event.defaultPrevented).toBe(true);
      nav.destroy();
    });
  });
});
