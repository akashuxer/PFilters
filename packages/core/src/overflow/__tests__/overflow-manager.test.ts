// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOverflowManager } from '../overflow-manager';

// JSDOM does not implement ResizeObserver; we stub it so the manager can
// install/uninstall it. The schedule-on-resize path is exercised by direct
// `refresh()` calls in these tests (we don't simulate browser layout).
class FakeResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: ResizeObserverCallback) {}
}

interface FakeItem {
  id: string;
  el: HTMLElement;
  right: number;
}

function makeItems(ids: string[], widths: number[]): FakeItem[] {
  let cursor = 0;
  return ids.map((id, i) => {
    const el = document.createElement('div');
    el.dataset.id = id;
    const left = cursor;
    const right = cursor + widths[i];
    cursor = right;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left,
      right,
      top: 0,
      bottom: 24,
      width: widths[i],
      height: 24,
      x: left,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    document.body.appendChild(el);
    return { id, el, right };
  });
}

function mockContainerWidth(container: HTMLElement, width: number): void {
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: width,
    top: 0,
    bottom: 24,
    width,
    height: 24,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

beforeEach(() => {
  vi.useFakeTimers();
  global.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('createOverflowManager', () => {
  it('reports no hidden items when everything fits', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 500);

    const items = makeItems(['a', 'b', 'c'], [100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 0,
      onChange,
    });

    mgr.refresh();
    expect(mgr.getHidden().size).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
    mgr.destroy();
  });

  it('hides items that overflow the container width (with trigger reservation)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 250);

    const items = makeItems(['a', 'b', 'c'], [100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      // Trigger not yet rendered; use default estimate (32).
      getTriggerWidth: () => 0,
      onChange,
    });

    mgr.refresh();
    // Pass 1 (no reservation): right of 'c' is 300 > 250, so c is hidden.
    // Pass 2 reserves 32 -> limit = 218. Right of 'b' is 200 (<= 218) but
    // 'c' starts at 200 with right 300 > 218, so b stays visible and c
    // remains hidden.
    expect([...mgr.getHidden()]).toEqual(['c']);
    expect(onChange).toHaveBeenCalledTimes(1);
    mgr.destroy();
  });

  it('hides a contiguous tail (first-overflow detection)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 150);

    const items = makeItems(['a', 'b', 'c', 'd'], [100, 100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      onChange,
    });

    mgr.refresh();
    // limit = 150 - 32 = 118. Right of 'a' = 100 (fits), right of 'b' =
    // 200 (overflow). Items b/c/d hidden.
    expect([...mgr.getHidden()]).toEqual(['b', 'c', 'd']);
  });

  it('never hides pinned items', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 150);

    const items = makeItems(['p', 'a', 'b'], [100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      isPinned: (id) => id === 'p',
      onChange,
    });

    mgr.refresh();
    // First-pass overflow would include the pinned item, but isPinned
    // strips it. Result: only 'a' and 'b' are hidden.
    const hidden = mgr.getHidden();
    expect(hidden.has('p')).toBe(false);
    expect(hidden.has('a')).toBe(true);
    expect(hidden.has('b')).toBe(true);
  });

  it('promotes the selected item by swapping with the last visible', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 150);

    const items = makeItems(['a', 'b', 'c'], [100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      getPromotedId: () => 'c',
      onChange,
    });

    mgr.refresh();
    // limit = 118. Without promotion: hide [b, c]. With promotion of 'c':
    // the manager swaps 'c' (the promoted) with the last visible non-pinned
    // item 'a', leaving hidden = { a, b }.
    const hidden = mgr.getHidden();
    expect(hidden.has('c')).toBe(false);
    expect(hidden.has('a')).toBe(true);
    expect(hidden.has('b')).toBe(true);
  });

  it('only fires onChange when the hidden set actually changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 150);

    const items = makeItems(['a', 'b', 'c'], [100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      onChange,
    });

    mgr.refresh();
    mgr.refresh();
    mgr.refresh();
    expect(onChange).toHaveBeenCalledTimes(1);
    mgr.destroy();
  });

  it('applies and clears inline visibility styles for hidden items', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 150);

    const items = makeItems(['a', 'b'], [100, 100]);
    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      onChange: () => {},
    });

    mgr.refresh();
    expect(items[1].el.style.visibility).toBe('hidden');
    expect(items[1].el.style.position).toBe('absolute');
    expect(items[1].el.style.pointerEvents).toBe('none');

    mgr.destroy();
    expect(items[1].el.style.visibility).toBe('');
    expect(items[1].el.style.position).toBe('');
    expect(items[1].el.style.pointerEvents).toBe('');
  });

  it('uses an explicit boundary element for the clip line', () => {
    // Container is "content-sized" (inline-flex) -- its right edge always
    // reaches the last item. Without a separate boundary, overflow would
    // never engage. With a smaller boundary representing the parent's
    // available width, items get hidden against THAT limit and the
    // container is free to shrink back to fit only its visible children.
    const container = document.createElement('div');
    const boundary = document.createElement('div');
    document.body.appendChild(boundary);
    boundary.appendChild(container);

    // Container reports its content-sized width (large enough for all 3
    // items) -- if the manager used this, no overflow would be detected.
    mockContainerWidth(container, 400);
    // Boundary (parent) is only 200px wide -- this is the real limit.
    mockContainerWidth(boundary, 200);

    const items = makeItems(['a', 'b', 'c'], [100, 100, 100]);
    const onChange = vi.fn();

    const mgr = createOverflowManager({
      container,
      boundary,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      onChange,
    });

    mgr.refresh();
    // limit = boundary.right (200) - trigger (32) = 168. Item 'a' right=100
    // fits; item 'b' right=200 overflows; item 'c' is a contiguous tail.
    const hidden = mgr.getHidden();
    expect(hidden.has('a')).toBe(false);
    expect(hidden.has('b')).toBe(true);
    expect(hidden.has('c')).toBe(true);
    mgr.destroy();
  });

  it('honors a custom setHidden strategy', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerWidth(container, 150);

    const items = makeItems(['a', 'b'], [100, 100]);
    const mgr = createOverflowManager({
      container,
      getItems: () => items.map(({ id, el }) => ({ id, el })),
      getTriggerWidth: () => 32,
      onChange: () => {},
      setHidden: (el, hidden) => {
        el.classList.toggle('is-clipped', hidden);
      },
    });

    mgr.refresh();
    expect(items[1].el.classList.contains('is-clipped')).toBe(true);
    expect(items[0].el.classList.contains('is-clipped')).toBe(false);
    mgr.destroy();
  });
});
