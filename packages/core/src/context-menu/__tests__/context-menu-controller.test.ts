// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createContextMenuController } from '../context-menu-controller';
import type {
  ContextMenuOnRequest,
  ContextMenuRequest,
} from '../types';

function makeContextMenuEvent(target: Element, x: number, y: number): MouseEvent {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  return event;
}

function makeKeyEvent(target: Element, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  return event;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createContextMenuController', () => {
  it('emits a pointer request anchored to the cursor', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const requests: ContextMenuRequest[] = [];
    const onRequest: ContextMenuOnRequest = (req, helpers) => {
      requests.push(req);
      helpers.preventDefault();
    };
    const ctl = createContextMenuController({ target, onRequest });

    const evt = makeContextMenuEvent(target, 120, 200);
    target.dispatchEvent(evt);

    expect(requests).toHaveLength(1);
    expect(requests[0].anchor).toEqual({ kind: 'point', x: 120, y: 200 });
    expect(requests[0].modality).toBe('pointer');
    expect(requests[0].invoker).toBe(target);
    expect(evt.defaultPrevented).toBe(true);

    ctl.destroy();
  });

  it('does not call preventDefault when the consumer declines the gesture', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onRequest = vi.fn(() => undefined);
    const ctl = createContextMenuController({ target, onRequest });

    const evt = makeContextMenuEvent(target, 50, 50);
    target.dispatchEvent(evt);

    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(false);

    ctl.destroy();
  });

  it('calls preventDefault when the consumer returns true', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const ctl = createContextMenuController({
      target,
      onRequest: () => true,
    });

    const evt = makeContextMenuEvent(target, 1, 2);
    target.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);

    ctl.destroy();
  });

  it('delegates to the nearest matching descendant when contextSelector is set', () => {
    const target = document.createElement('div');
    const row = document.createElement('div');
    row.setAttribute('data-context-id', 'file-1');
    const inner = document.createElement('span');
    row.appendChild(inner);
    target.appendChild(row);
    document.body.appendChild(target);

    let captured: HTMLElement | null = null;
    const ctl = createContextMenuController<{ id: string }>({
      target,
      contextSelector: '[data-context-id]',
      resolveContext: (el) => ({ id: el.dataset.contextId! }),
      onRequest: (req) => {
        captured = req.invoker;
        expect(req.context).toEqual({ id: 'file-1' });
        return true;
      },
    });

    const evt = makeContextMenuEvent(inner, 5, 6);
    inner.dispatchEvent(evt);

    expect(captured).toBe(row);
    ctl.destroy();
  });

  it('ignores gestures with no matching delegated target', () => {
    const target = document.createElement('div');
    const outside = document.createElement('span');
    target.appendChild(outside);
    document.body.appendChild(target);

    const onRequest = vi.fn();
    const ctl = createContextMenuController({
      target,
      contextSelector: '[data-context-id]',
      onRequest,
    });

    const evt = makeContextMenuEvent(outside, 5, 6);
    outside.dispatchEvent(evt);

    expect(onRequest).not.toHaveBeenCalled();
    expect(evt.defaultPrevented).toBe(false);

    ctl.destroy();
  });

  it('treats Shift+F10 as a keyboard gesture anchored to the focused descendant', () => {
    const target = document.createElement('div');
    const row = document.createElement('div');
    row.setAttribute('data-context-id', 'row-1');
    row.tabIndex = 0;
    target.appendChild(row);
    document.body.appendChild(target);
    row.focus();

    const requests: ContextMenuRequest[] = [];
    const ctl = createContextMenuController({
      target,
      contextSelector: '[data-context-id]',
      onRequest: (req) => {
        requests.push(req);
        return true;
      },
    });

    const evt = makeKeyEvent(row, { key: 'F10', shiftKey: true });
    row.dispatchEvent(evt);

    expect(requests).toHaveLength(1);
    expect(requests[0].modality).toBe('keyboard');
    expect(requests[0].anchor).toEqual({ kind: 'element', element: row });
    expect(evt.defaultPrevented).toBe(true);

    ctl.destroy();
  });

  it('treats the ContextMenu key as a keyboard gesture', () => {
    const target = document.createElement('div');
    target.tabIndex = 0;
    document.body.appendChild(target);
    target.focus();

    const onRequest = vi.fn<ContextMenuOnRequest>(() => true);
    const ctl = createContextMenuController({ target, onRequest });
    const evt = makeKeyEvent(target, { key: 'ContextMenu' });
    target.dispatchEvent(evt);

    expect(onRequest).toHaveBeenCalledTimes(1);
    const req = onRequest.mock.calls[0][0] as ContextMenuRequest;
    expect(req.modality).toBe('keyboard');

    ctl.destroy();
  });

  it('does not bind keyboard listener when keyboard is disabled', () => {
    const target = document.createElement('div');
    target.tabIndex = 0;
    document.body.appendChild(target);
    target.focus();

    const onRequest = vi.fn();
    const ctl = createContextMenuController({
      target,
      keyboard: false,
      onRequest,
    });
    target.dispatchEvent(makeKeyEvent(target, { key: 'ContextMenu' }));

    expect(onRequest).not.toHaveBeenCalled();
    ctl.destroy();
  });

  it('honors a programmatic request() call', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onRequest = vi.fn<ContextMenuOnRequest>(() => undefined);
    const ctl = createContextMenuController({ target, onRequest });

    ctl.request({ anchor: { kind: 'point', x: 10, y: 20 } });

    expect(onRequest).toHaveBeenCalledTimes(1);
    const req = onRequest.mock.calls[0][0] as ContextMenuRequest;
    expect(req.anchor).toEqual({ kind: 'point', x: 10, y: 20 });
    expect(req.invoker).toBe(target);
    expect(req.modality).toBe('pointer');

    ctl.destroy();
  });

  it('stops emitting after destroy', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onRequest = vi.fn(() => true);
    const ctl = createContextMenuController({ target, onRequest });

    ctl.destroy();
    target.dispatchEvent(makeContextMenuEvent(target, 1, 2));
    target.dispatchEvent(makeKeyEvent(target, { key: 'ContextMenu' }));
    ctl.request({ anchor: { kind: 'point', x: 0, y: 0 } });

    expect(onRequest).not.toHaveBeenCalled();
  });

  it('opens a long-press request after the configured delay', async () => {
    vi.useFakeTimers();
    try {
      const target = document.createElement('div');
      document.body.appendChild(target);
      const onRequest = vi.fn<ContextMenuOnRequest>(() => true);
      const ctl = createContextMenuController({
        target,
        onRequest,
        longPressMs: 500,
      });

      const touch = { identifier: 1, clientX: 30, clientY: 40 } as Touch;
      const evt = new Event('touchstart', { bubbles: true, cancelable: true }) as TouchEvent;
      Object.defineProperty(evt, 'touches', { value: [touch], configurable: true });
      Object.defineProperty(evt, 'changedTouches', { value: [touch], configurable: true });
      Object.defineProperty(evt, 'target', { value: target, configurable: true });
      target.dispatchEvent(evt);

      vi.advanceTimersByTime(499);
      expect(onRequest).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2);
      expect(onRequest).toHaveBeenCalledTimes(1);
      const req = onRequest.mock.calls[0][0] as ContextMenuRequest;
      expect(req.modality).toBe('touch');
      expect(req.anchor).toEqual({ kind: 'point', x: 30, y: 40 });

      ctl.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels a pending long-press when the touch moves past tolerance', () => {
    vi.useFakeTimers();
    try {
      const target = document.createElement('div');
      document.body.appendChild(target);
      const onRequest = vi.fn(() => true);
      const ctl = createContextMenuController({
        target,
        onRequest,
        longPressMs: 500,
      });

      const startTouch = { identifier: 1, clientX: 0, clientY: 0 } as Touch;
      const startEvt = new Event('touchstart', { bubbles: true }) as TouchEvent;
      Object.defineProperty(startEvt, 'touches', { value: [startTouch], configurable: true });
      Object.defineProperty(startEvt, 'changedTouches', { value: [startTouch], configurable: true });
      Object.defineProperty(startEvt, 'target', { value: target, configurable: true });
      target.dispatchEvent(startEvt);

      const moveTouch = { identifier: 1, clientX: 100, clientY: 0 } as Touch;
      const moveEvt = new Event('touchmove', { bubbles: true }) as TouchEvent;
      Object.defineProperty(moveEvt, 'changedTouches', { value: [moveTouch], configurable: true });
      Object.defineProperty(moveEvt, 'target', { value: target, configurable: true });
      target.dispatchEvent(moveEvt);

      vi.advanceTimersByTime(600);
      expect(onRequest).not.toHaveBeenCalled();

      ctl.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolveContext returns null when not provided', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onRequest = vi.fn<ContextMenuOnRequest>(() => true);
    const ctl = createContextMenuController({ target, onRequest });

    target.dispatchEvent(makeContextMenuEvent(target, 1, 2));
    const req = onRequest.mock.calls[0][0] as ContextMenuRequest;
    expect(req.context).toBeNull();

    ctl.destroy();
  });
});
