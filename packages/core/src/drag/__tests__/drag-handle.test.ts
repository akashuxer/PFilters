// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDragHandle } from '../drag-handle';

type RectInit = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function mockRect(el: HTMLElement, init: RectInit): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: init.left,
    top: init.top,
    right: init.left + init.width,
    bottom: init.top + init.height,
    width: init.width,
    height: init.height,
    x: init.left,
    y: init.top,
    toJSON: () => ({}),
  });
}

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

function pointer(
  el: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { clientX: number; clientY: number; button?: number; pointerType?: string; target?: EventTarget } = {
    clientX: 0,
    clientY: 0,
  },
): PointerEvent {
  const event = new PointerEvent(type, {
    clientX: init.clientX,
    clientY: init.clientY,
    button: init.button ?? 0,
    pointerType: init.pointerType ?? 'mouse',
    bubbles: true,
    cancelable: true,
  });
  if (init.target) {
    Object.defineProperty(event, 'target', { value: init.target });
  }
  el.dispatchEvent(event);
  return event;
}

describe('createDragHandle', () => {
  let handle: HTMLElement;
  let target: HTMLElement;
  let excludedChild: HTMLElement;

  beforeEach(() => {
    setViewport(1000, 800);
    target = document.createElement('div');
    handle = document.createElement('div');
    excludedChild = document.createElement('button');
    excludedChild.className = 'excluded';
    handle.appendChild(excludedChild);
    target.appendChild(handle);
    document.body.appendChild(target);
    // Default target sits at (100, 100) with size 200x100 so it can move
    // freely inside the 1000x800 viewport without immediately clamping.
    mockRect(target, { left: 100, top: 100, width: 200, height: 100 });
  });

  afterEach(() => {
    target.remove();
    vi.restoreAllMocks();
  });

  it('writes initial offset to CSS variables on creation', () => {
    const instance = createDragHandle({
      handle,
      target,
      initialOffset: { x: 12, y: 24 },
    });
    expect(target.style.getPropertyValue('--arvo-drag-x')).toBe('12px');
    expect(target.style.getPropertyValue('--arvo-drag-y')).toBe('24px');
    expect(instance.offset()).toEqual({ x: 12, y: 24 });
    instance.destroy();
  });

  it('respects custom CSS variable names', () => {
    const instance = createDragHandle({
      handle,
      target,
      cssVar: { x: '--arvo-win-x', y: '--arvo-win-y' },
    });
    expect(target.style.getPropertyValue('--arvo-win-x')).toBe('0px');
    expect(target.style.getPropertyValue('--arvo-win-y')).toBe('0px');
    instance.destroy();
  });

  it('starts a drag on pointerdown and tracks subsequent moves', () => {
    const onDragStart = vi.fn();
    const onDrag = vi.fn();
    const instance = createDragHandle({
      handle,
      target,
      onDragStart,
      onDrag,
    });

    pointer(handle, 'pointerdown', { clientX: 150, clientY: 150 });
    expect(instance.isDragging()).toBe(true);
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(target.classList.contains('dragging')).toBe(true);

    pointer(document, 'pointermove', { clientX: 200, clientY: 180 });
    expect(onDrag).toHaveBeenCalled();
    expect(instance.offset()).toEqual({ x: 50, y: 30 });
    expect(target.style.getPropertyValue('--arvo-drag-x')).toBe('50px');
    expect(target.style.getPropertyValue('--arvo-drag-y')).toBe('30px');

    instance.destroy();
  });

  it('clamps the offset to the viewport bounds on pointer move', () => {
    // Target at (100,100) size 200x100; viewport 1000x800.
    // Max delta-x = right(1000) - target.right(300) = 700.
    // Min delta-x = left(0)    - target.left(100)  = -100.
    const instance = createDragHandle({ handle, target });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });

    // Drag far past the right edge: dx 5000 -> clamped to 700.
    pointer(document, 'pointermove', { clientX: 5000, clientY: 0 });
    expect(instance.offset().x).toBe(700);

    // Drag past the left edge: dx -5000 -> clamped to -100.
    pointer(document, 'pointermove', { clientX: -5000, clientY: 0 });
    expect(instance.offset().x).toBe(-100);

    // Drag past the bottom edge: dy 5000 -> clamped to 800 - 200 = 600.
    pointer(document, 'pointermove', { clientX: 0, clientY: 5000 });
    expect(instance.offset().y).toBe(600);

    pointer(document, 'pointerup', { clientX: 0, clientY: 5000 });
    instance.destroy();
  });

  it('does NOT clamp when bounds is null', () => {
    const instance = createDragHandle({ handle, target, bounds: null });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(document, 'pointermove', { clientX: 5000, clientY: 5000 });
    expect(instance.offset()).toEqual({ x: 5000, y: 5000 });
    pointer(document, 'pointerup', { clientX: 5000, clientY: 5000 });
    instance.destroy();
  });

  it('uses a custom bounds rect when provided', () => {
    const instance = createDragHandle({
      handle,
      target,
      bounds: {
        getRect: () =>
          new DOMRect(50, 50, 400, 400),
      },
    });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(document, 'pointermove', { clientX: 5000, clientY: 5000 });
    // Custom bounds: right=450, bottom=450, target.right=300, target.bottom=200.
    // max delta x = 450 - 300 = 150; max delta y = 450 - 200 = 250.
    expect(instance.offset()).toEqual({ x: 150, y: 250 });
    pointer(document, 'pointerup', { clientX: 5000, clientY: 5000 });
    instance.destroy();
  });

  it('skips drag start when pointerdown originates inside an excluded child', () => {
    const onDragStart = vi.fn();
    const instance = createDragHandle({
      handle,
      target,
      excludeSelector: '.excluded',
      onDragStart,
    });
    // Dispatch via the excluded child so .closest() finds the selector.
    pointer(excludedChild, 'pointerdown', { clientX: 150, clientY: 150 });
    expect(onDragStart).not.toHaveBeenCalled();
    expect(instance.isDragging()).toBe(false);
    expect(target.classList.contains('dragging')).toBe(false);
    instance.destroy();
  });

  it('starts drag when pointerdown originates on the handle itself (no excluded match)', () => {
    const onDragStart = vi.fn();
    const instance = createDragHandle({
      handle,
      target,
      excludeSelector: '.excluded',
      onDragStart,
    });
    pointer(handle, 'pointerdown', { clientX: 150, clientY: 150 });
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(instance.isDragging()).toBe(true);
    pointer(document, 'pointerup', { clientX: 150, clientY: 150 });
    instance.destroy();
  });

  it('ignores secondary-button pointerdown events', () => {
    const instance = createDragHandle({ handle, target });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0, button: 2 });
    expect(instance.isDragging()).toBe(false);
    instance.destroy();
  });

  it('fires onDragEnd with the final offset on pointerup', () => {
    const onDragEnd = vi.fn();
    const instance = createDragHandle({ handle, target, onDragEnd });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(document, 'pointermove', { clientX: 80, clientY: 40 });
    pointer(document, 'pointerup', { clientX: 80, clientY: 40 });
    expect(instance.isDragging()).toBe(false);
    expect(target.classList.contains('dragging')).toBe(false);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 80, y: 40 });
    instance.destroy();
  });

  it('also ends the drag on pointercancel', () => {
    const onDragEnd = vi.fn();
    const instance = createDragHandle({ handle, target, onDragEnd });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(document, 'pointermove', { clientX: 30, clientY: 10 });
    pointer(document, 'pointercancel', { clientX: 30, clientY: 10 });
    expect(instance.isDragging()).toBe(false);
    expect(onDragEnd).toHaveBeenCalled();
    instance.destroy();
  });

  it('setOffset() clamps the value against the current bounds', () => {
    const instance = createDragHandle({ handle, target });
    // Target at (100,100), 200x100, viewport 1000x800.
    // max x = 1000-300 = 700; setting 2000 should clamp to 700.
    instance.setOffset({ x: 2000, y: -5000 });
    expect(instance.offset().x).toBe(700);
    expect(instance.offset().y).toBe(-100);
    instance.destroy();
  });

  it('reset() returns offset to (0, 0)', () => {
    const instance = createDragHandle({
      handle,
      target,
      initialOffset: { x: 40, y: 60 },
    });
    instance.reset();
    expect(instance.offset()).toEqual({ x: 0, y: 0 });
    expect(target.style.getPropertyValue('--arvo-drag-x')).toBe('0px');
    instance.destroy();
  });

  it('destroy() removes listeners but preserves CSS variables', () => {
    const onDragStart = vi.fn();
    const instance = createDragHandle({
      handle,
      target,
      onDragStart,
      initialOffset: { x: 40, y: 20 },
    });
    instance.destroy();
    // Listeners are detached.
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(onDragStart).not.toHaveBeenCalled();
    // But the CSS custom properties REMAIN so the panel doesn't jump
    // if a consumer re-attaches a new handle (or is mid-exit-transition).
    expect(target.style.getPropertyValue('--arvo-drag-x')).toBe('40px');
    expect(target.style.getPropertyValue('--arvo-drag-y')).toBe('20px');
  });

  it('destroy() while a drag is in progress cleans up the dragging class', () => {
    const instance = createDragHandle({ handle, target });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(target.classList.contains('dragging')).toBe(true);
    instance.destroy();
    expect(target.classList.contains('dragging')).toBe(false);
    expect(instance.isDragging()).toBe(false);
  });

  it('supports a custom draggingClass', () => {
    const instance = createDragHandle({
      handle,
      target,
      draggingClass: 'arvo-win__panel--dragging',
    });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(target.classList.contains('arvo-win__panel--dragging')).toBe(true);
    pointer(document, 'pointerup', { clientX: 0, clientY: 0 });
    expect(target.classList.contains('arvo-win__panel--dragging')).toBe(false);
    instance.destroy();
  });

  it('does NOT add a class when draggingClass is empty', () => {
    const instance = createDragHandle({
      handle,
      target,
      draggingClass: '',
    });
    pointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(target.className).toBe('');
    pointer(document, 'pointerup', { clientX: 0, clientY: 0 });
    instance.destroy();
  });
});
