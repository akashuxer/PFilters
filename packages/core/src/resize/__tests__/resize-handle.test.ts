// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createResizeHandle } from '../resize-handle';

function createTarget(): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, { width: '320px', height: '400px' });
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    left: 100,
    bottom: 500,
    right: 420,
    width: 320,
    height: 400,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
  document.body.appendChild(el);
  return el;
}

describe('createResizeHandle', () => {
  let target: HTMLElement;

  afterEach(() => {
    target?.remove();
  });

  it('mounts corner handle elements', () => {
    target = createTarget();
    const handle = createResizeHandle(target, {
      corners: ['bottom-left', 'bottom-right'],
      min: { width: 280, height: 272 },
      max: { width: 500, height: 900 },
    });

    const elements = handle.mount();
    expect(elements).toHaveLength(2);
    expect(
      target.querySelector('.arvo-hpop__handle--bl'),
    ).toBeTruthy();
    expect(
      target.querySelector('.arvo-hpop__handle--br'),
    ).toBeTruthy();

    handle.destroy();
  });

  it('removes handles on destroy', () => {
    target = createTarget();
    const handle = createResizeHandle(target, {
      corners: ['bottom-right'],
      min: { width: 280, height: 272 },
      max: { width: 500, height: 900 },
    });

    handle.mount();
    expect(target.querySelector('.arvo-hpop__handle--br')).toBeTruthy();

    handle.destroy();
    expect(target.querySelector('.arvo-hpop__handle--br')).toBeNull();
  });

  it('starts resize on pointerdown', () => {
    target = createTarget();
    const onResize = vi.fn();
    const handle = createResizeHandle(target, {
      corners: ['bottom-right'],
      min: { width: 280, height: 272 },
      max: { width: 500, height: 900 },
      onResize,
    });

    handle.mount();
    const handleEl = target.querySelector('.arvo-hpop__handle--br')!;

    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 420,
        clientY: 500,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(handle.isResizing()).toBe(true);
    expect(target.classList.contains('is-resizing')).toBe(true);

    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 420,
        clientY: 500,
        bubbles: true,
      }),
    );
    handle.destroy();
  });

  it('clamps width and height to min/max', () => {
    target = createTarget();
    const onCommit = vi.fn();
    const handle = createResizeHandle(target, {
      corners: ['bottom-right'],
      min: { width: 280, height: 272 },
      max: { width: 500, height: 900 },
      onCommit,
    });

    handle.mount();
    const handleEl = target.querySelector('.arvo-hpop__handle--br')!;

    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 420,
        clientY: 500,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 1000,
        clientY: 2000,
        bubbles: true,
      }),
    );

    expect(onCommit).toHaveBeenCalledTimes(1);
    const rect = onCommit.mock.calls[0][0];
    expect(rect.width).toBeLessThanOrEqual(500);
    expect(rect.height).toBeLessThanOrEqual(900);
    expect(rect.width).toBeGreaterThanOrEqual(280);
    expect(rect.height).toBeGreaterThanOrEqual(272);

    handle.destroy();
  });

  it('accepts dynamic max function', () => {
    target = createTarget();
    const maxFn = vi.fn().mockReturnValue({ width: 450, height: 800 });
    const handle = createResizeHandle(target, {
      corners: ['bottom-right'],
      min: { width: 280, height: 272 },
      max: maxFn,
    });

    handle.mount();
    const handleEl = target.querySelector('.arvo-hpop__handle--br')!;

    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 420,
        clientY: 500,
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 500,
        clientY: 600,
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 500,
        clientY: 600,
        bubbles: true,
      }),
    );

    expect(maxFn).toHaveBeenCalled();
    handle.destroy();
  });

  it('hides corner handle when too close to viewport edge', () => {
    target = createTarget();
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 5,
      bottom: 500,
      right: 325,
      width: 320,
      height: 400,
      x: 5,
      y: 100,
      toJSON: () => ({}),
    });

    const handle = createResizeHandle(target, {
      corners: ['bottom-left', 'bottom-right'],
      min: { width: 280, height: 272 },
      max: { width: 500, height: 900 },
      viewportPadding: 16,
    });

    handle.mount();
    const bl = target.querySelector(
      '.arvo-hpop__handle--bl',
    ) as HTMLElement;
    expect(bl.style.display).toBe('none');

    handle.destroy();
  });

  it('isResizing returns false when not dragging', () => {
    target = createTarget();
    const handle = createResizeHandle(target, {
      corners: ['bottom-right'],
      min: { width: 280, height: 272 },
      max: { width: 500, height: 900 },
    });
    handle.mount();
    expect(handle.isResizing()).toBe(false);
    handle.destroy();
  });
});
