// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPositionWatcher } from '../watcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRect(
  el: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    toJSON: () => ({}),
  } as DOMRect);
}

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, writable: true });
}

let resizeCallbacks: ResizeObserverCallback[] = [];
let observedElements: Element[][] = [];

class MockResizeObserver {
  private _cb: ResizeObserverCallback;
  private _observed: Element[] = [];

  constructor(cb: ResizeObserverCallback) {
    this._cb = cb;
    resizeCallbacks.push(cb);
    observedElements.push(this._observed);
  }
  observe(target: Element): void {
    this._observed.push(target);
  }
  unobserve(): void { /* noop */ }
  disconnect(): void {
    this._observed.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createPositionWatcher', () => {
  let anchor: HTMLElement;
  let float: HTMLElement;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    anchor = document.createElement('button');
    float = document.createElement('div');
    document.body.appendChild(anchor);
    document.body.appendChild(float);
    setViewport(1024, 768);

    Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

    mockRect(anchor, { x: 100, y: 200, width: 200, height: 40 });
    mockRect(float, { x: 0, y: 0, width: 150, height: 80 });

    resizeCallbacks = [];
    observedElements = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    rafCallbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.removeChild(anchor);
    document.body.removeChild(float);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Helper -- the watcher creates one ResizeObserver per observation target
  // (anchor, float, optional container) so we can route their callbacks
  // to different reposition sources. Tests look up the index by what's
  // being observed rather than hard-coding positions.
  function indexObserving(target: Element): number {
    return observedElements.findIndex((obs) => obs.includes(target));
  }

  it('observes anchor with ResizeObserver', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    expect(indexObserving(anchor)).toBeGreaterThanOrEqual(0);
    watcher.destroy();
  });

  it('observes float with ResizeObserver (so size-dependent placements like top-end stay corner-anchored when the float swaps content)', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'top-end' }, cb);

    expect(indexObserving(float)).toBeGreaterThanOrEqual(0);
    watcher.destroy();
  });

  it('observes anchor and float in SEPARATE observers so anchor/scroll triggers can be distinguished from float-content triggers', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    const anchorIdx = indexObserving(anchor);
    const floatIdx = indexObserving(float);
    expect(anchorIdx).toBeGreaterThanOrEqual(0);
    expect(floatIdx).toBeGreaterThanOrEqual(0);
    expect(anchorIdx).not.toBe(floatIdx);

    watcher.destroy();
  });

  it('observes container matching observeContainerSelector', () => {
    const container = document.createElement('div');
    container.classList.add('my-container');
    document.body.appendChild(container);
    // Move anchor into container so .closest() can find it
    container.appendChild(anchor);

    const cb = vi.fn();
    const watcher = createPositionWatcher(
      anchor,
      float,
      { placement: 'bottom-start', observeContainerSelector: '.my-container' },
      cb,
    );

    // anchor + float + container -> three separate observers
    expect(observedElements.length).toBe(3);
    expect(indexObserving(container)).toBeGreaterThanOrEqual(0);

    watcher.destroy();
    // Move anchor back to body before afterEach cleanup
    document.body.appendChild(anchor);
    document.body.removeChild(container);
  });

  it("emits source: 'full' on scroll / window resize / anchor resize / container resize", () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    // Scroll
    window.dispatchEvent(new Event('scroll'));
    rafCallbacks[rafCallbacks.length - 1](0);
    expect(cb.mock.calls[cb.mock.calls.length - 1]?.[1]).toBe('full');

    // Window resize
    window.dispatchEvent(new Event('resize'));
    rafCallbacks[rafCallbacks.length - 1](0);
    expect(cb.mock.calls[cb.mock.calls.length - 1]?.[1]).toBe('full');

    // Anchor resize via its observer
    const anchorIdx = indexObserving(anchor);
    resizeCallbacks[anchorIdx](
      [] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver,
    );
    rafCallbacks[rafCallbacks.length - 1](0);
    expect(cb.mock.calls[cb.mock.calls.length - 1]?.[1]).toBe('full');

    watcher.destroy();
  });

  it("emits source: 'float-size' when the FLOAT's own ResizeObserver fires", () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'top-end' }, cb);

    const floatIdx = indexObserving(float);
    resizeCallbacks[floatIdx](
      [] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver,
    );

    expect(rafCallbacks.length).toBe(1);
    rafCallbacks[0](0);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][1]).toBe('float-size');

    watcher.destroy();
  });

  it("when a float-size event and a full event coalesce in the same frame, the broader 'full' source wins", () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'top-end' }, cb);

    // Float resize first (would normally emit 'float-size'), then a scroll
    // event in the same frame.
    const floatIdx = indexObserving(float);
    resizeCallbacks[floatIdx](
      [] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver,
    );
    window.dispatchEvent(new Event('scroll'));

    expect(rafCallbacks.length).toBe(1);
    rafCallbacks[0](0);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][1]).toBe('full');

    watcher.destroy();
  });

  it('schedules reposition on scroll via rAF', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    window.dispatchEvent(new Event('scroll'));
    expect(rafCallbacks.length).toBe(1);

    // Flush rAF
    rafCallbacks[0](0);
    expect(cb).toHaveBeenCalledOnce();

    watcher.destroy();
  });

  it('filters out scroll events from within float', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    const inner = document.createElement('div');
    float.appendChild(inner);

    // Scroll event from inside the float should be ignored
    const scrollEvent = new Event('scroll', { bubbles: true });
    Object.defineProperty(scrollEvent, 'target', { value: inner });
    window.dispatchEvent(scrollEvent);

    expect(rafCallbacks.length).toBe(0);
    expect(cb).not.toHaveBeenCalled();

    float.removeChild(inner);
    watcher.destroy();
  });

  it('schedules reposition on window resize via rAF', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    window.dispatchEvent(new Event('resize'));
    expect(rafCallbacks.length).toBe(1);

    rafCallbacks[0](0);
    expect(cb).toHaveBeenCalledOnce();

    watcher.destroy();
  });

  it('deduplicates multiple events into single rAF', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    // Only one rAF should be scheduled
    expect(rafCallbacks.length).toBe(1);

    rafCallbacks[0](0);
    expect(cb).toHaveBeenCalledOnce();

    watcher.destroy();
  });

  it('update() calls onUpdate synchronously', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    watcher.update();
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toHaveProperty('placement', 'bottom-start');

    watcher.destroy();
  });

  it('update() cancels pending rAF', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    window.dispatchEvent(new Event('scroll'));
    expect(rafCallbacks.length).toBe(1);

    watcher.update();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledOnce();

    watcher.destroy();
  });

  it('destroy() cleans up all observers and listeners', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    watcher.destroy();

    // Should have removed scroll and resize listeners
    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('scroll');
    expect(removedEvents).toContain('resize');
  });

  it('destroy() cancels pending rAF', () => {
    const cb = vi.fn();
    const watcher = createPositionWatcher(anchor, float, { placement: 'bottom-start' }, cb);

    window.dispatchEvent(new Event('scroll'));
    watcher.destroy();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
