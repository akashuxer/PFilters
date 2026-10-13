// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTabRoving } from '../tab-roving';

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

describe('tab-roving', () => {
  let container: HTMLDivElement;
  let items: HTMLElement[];

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('role', 'tablist');

    items = [];
    for (let i = 0; i < 4; i++) {
      const item = document.createElement('button');
      item.id = `item-${i}`;
      item.textContent = `Item ${i}`;
      container.appendChild(item);
      items.push(item);
    }

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('sets initial tabindex values on activate', () => {
    const roving = createTabRoving();
    roving.activate({
      container,
      items,
      orientation: 'horizontal',
      wrap: true,
    });

    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    expect(items[2].getAttribute('tabindex')).toBe('-1');
    expect(items[3].getAttribute('tabindex')).toBe('-1');

    roving.deactivate();
  });

  it('reports active index and item', () => {
    const roving = createTabRoving();
    roving.activate({
      container,
      items,
      orientation: 'horizontal',
      wrap: true,
    });

    expect(roving.getActiveIndex()).toBe(0);
    expect(roving.getActiveItem()).toBe(items[0]);

    roving.deactivate();
  });

  describe('horizontal orientation', () => {
    it('moves forward on ArrowRight', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      items[0].focus();
      pressKey(container, 'ArrowRight');

      expect(roving.getActiveIndex()).toBe(1);
      expect(document.activeElement).toBe(items[1]);
      expect(items[0].getAttribute('tabindex')).toBe('-1');
      expect(items[1].getAttribute('tabindex')).toBe('0');

      roving.deactivate();
    });

    it('moves backward on ArrowLeft', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.setActiveItem(2);
      pressKey(container, 'ArrowLeft');

      expect(roving.getActiveIndex()).toBe(1);
      expect(document.activeElement).toBe(items[1]);

      roving.deactivate();
    });

    it('does not respond to ArrowUp/ArrowDown', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      items[0].focus();
      pressKey(container, 'ArrowDown');
      expect(roving.getActiveIndex()).toBe(0);

      pressKey(container, 'ArrowUp');
      expect(roving.getActiveIndex()).toBe(0);

      roving.deactivate();
    });
  });

  describe('vertical orientation', () => {
    it('moves forward on ArrowDown', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'vertical',
        wrap: true,
      });

      items[0].focus();
      pressKey(container, 'ArrowDown');

      expect(roving.getActiveIndex()).toBe(1);
      expect(document.activeElement).toBe(items[1]);

      roving.deactivate();
    });

    it('moves backward on ArrowUp', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'vertical',
        wrap: true,
      });

      roving.setActiveItem(2);
      pressKey(container, 'ArrowUp');

      expect(roving.getActiveIndex()).toBe(1);

      roving.deactivate();
    });

    it('does not respond to ArrowLeft/ArrowRight', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'vertical',
        wrap: true,
      });

      items[0].focus();
      pressKey(container, 'ArrowRight');
      expect(roving.getActiveIndex()).toBe(0);

      pressKey(container, 'ArrowLeft');
      expect(roving.getActiveIndex()).toBe(0);

      roving.deactivate();
    });
  });

  describe('both orientations', () => {
    it('responds to all arrow keys', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'both',
        wrap: true,
      });

      items[0].focus();
      pressKey(container, 'ArrowRight');
      expect(roving.getActiveIndex()).toBe(1);

      pressKey(container, 'ArrowDown');
      expect(roving.getActiveIndex()).toBe(2);

      pressKey(container, 'ArrowLeft');
      expect(roving.getActiveIndex()).toBe(1);

      pressKey(container, 'ArrowUp');
      expect(roving.getActiveIndex()).toBe(0);

      roving.deactivate();
    });
  });

  describe('wrapping', () => {
    it('wraps from last to first when wrap is true', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.setActiveItem(3);
      pressKey(container, 'ArrowRight');

      expect(roving.getActiveIndex()).toBe(0);
      expect(document.activeElement).toBe(items[0]);

      roving.deactivate();
    });

    it('wraps from first to last when wrap is true', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      pressKey(container, 'ArrowLeft');
      expect(roving.getActiveIndex()).toBe(3);
      expect(document.activeElement).toBe(items[3]);

      roving.deactivate();
    });

    it('clamps at last when wrap is false', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: false,
      });

      roving.setActiveItem(3);
      pressKey(container, 'ArrowRight');

      expect(roving.getActiveIndex()).toBe(3);

      roving.deactivate();
    });

    it('clamps at first when wrap is false', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: false,
      });

      pressKey(container, 'ArrowLeft');
      expect(roving.getActiveIndex()).toBe(0);

      roving.deactivate();
    });
  });

  describe('Home and End keys', () => {
    it('jumps to first item on Home', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.setActiveItem(3);
      pressKey(container, 'Home');

      expect(roving.getActiveIndex()).toBe(0);
      expect(document.activeElement).toBe(items[0]);

      roving.deactivate();
    });

    it('jumps to last item on End', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      pressKey(container, 'End');
      expect(roving.getActiveIndex()).toBe(3);
      expect(document.activeElement).toBe(items[3]);

      roving.deactivate();
    });
  });

  describe('setActiveItem', () => {
    it('sets active item and updates tabindex', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.setActiveItem(2);

      expect(roving.getActiveIndex()).toBe(2);
      expect(roving.getActiveItem()).toBe(items[2]);
      expect(items[0].getAttribute('tabindex')).toBe('-1');
      expect(items[2].getAttribute('tabindex')).toBe('0');
      expect(document.activeElement).toBe(items[2]);

      roving.deactivate();
    });

    it('ignores out-of-bounds indices', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.setActiveItem(10);
      expect(roving.getActiveIndex()).toBe(0);

      roving.setActiveItem(-1);
      expect(roving.getActiveIndex()).toBe(0);

      roving.deactivate();
    });
  });

  describe('onActivate callback', () => {
    it('calls onActivate when item changes via arrow key', () => {
      const onActivate = vi.fn();
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
        onActivate,
      });

      items[0].focus();
      pressKey(container, 'ArrowRight');

      expect(onActivate).toHaveBeenCalledWith(items[1], 1);

      roving.deactivate();
    });

    it('calls onActivate when item changes via setActiveItem', () => {
      const onActivate = vi.fn();
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
        onActivate,
      });

      roving.setActiveItem(3);
      expect(onActivate).toHaveBeenCalledWith(items[3], 3);

      roving.deactivate();
    });
  });

  describe('deactivation', () => {
    it('removes keydown listener on deactivate', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.deactivate();

      items[0].focus();
      pressKey(container, 'ArrowRight');
      expect(document.activeElement).toBe(items[0]);
    });

    it('returns -1 for activeIndex after deactivate', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.deactivate();
      expect(roving.getActiveIndex()).toBe(-1);
      expect(roving.getActiveItem()).toBeNull();
    });

    it('deactivates previous instance when reactivated', () => {
      const roving = createTabRoving();
      roving.activate({
        container,
        items,
        orientation: 'horizontal',
        wrap: true,
      });

      roving.setActiveItem(2);

      const newItems = items.slice(0, 2);
      roving.activate({
        container,
        items: newItems,
        orientation: 'vertical',
        wrap: false,
      });

      expect(roving.getActiveIndex()).toBe(0);
      expect(newItems[0].getAttribute('tabindex')).toBe('0');
      expect(newItems[1].getAttribute('tabindex')).toBe('-1');

      roving.deactivate();
    });
  });

  it('prevents default on arrow keys', () => {
    const roving = createTabRoving();
    roving.activate({
      container,
      items,
      orientation: 'horizontal',
      wrap: true,
    });

    items[0].focus();
    const event = pressKey(container, 'ArrowRight');
    expect(event.defaultPrevented).toBe(true);

    roving.deactivate();
  });

  it('does not prevent default on unrelated keys', () => {
    const roving = createTabRoving();
    roving.activate({
      container,
      items,
      orientation: 'horizontal',
      wrap: true,
    });

    items[0].focus();
    const event = pressKey(container, 'a');
    expect(event.defaultPrevented).toBe(false);

    roving.deactivate();
  });
});
