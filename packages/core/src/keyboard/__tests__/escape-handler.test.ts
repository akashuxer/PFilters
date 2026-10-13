// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEscapeHandler } from '../escape-handler';

describe('createEscapeHandler', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('calls callback on Escape keydown', () => {
    const callback = vi.fn();
    const handler = createEscapeHandler(callback);
    handler.attach(element);

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);

    expect(callback).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    handler.detach();
  });

  it('does not call callback on other keys', () => {
    const callback = vi.fn();
    const handler = createEscapeHandler(callback);
    handler.attach(element);

    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );

    expect(callback).not.toHaveBeenCalled();
    handler.detach();
  });

  it('does not call callback after detach', () => {
    const callback = vi.fn();
    const handler = createEscapeHandler(callback);
    handler.attach(element);
    handler.detach();

    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it('reattaches to a new element', () => {
    const callback = vi.fn();
    const handler = createEscapeHandler(callback);

    handler.attach(element);

    const element2 = document.createElement('div');
    document.body.appendChild(element2);
    handler.attach(element2);

    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(callback).not.toHaveBeenCalled();

    element2.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(callback).toHaveBeenCalledOnce();

    handler.detach();
    document.body.removeChild(element2);
  });

  it('detach is safe to call when not attached', () => {
    const callback = vi.fn();
    const handler = createEscapeHandler(callback);
    expect(() => handler.detach()).not.toThrow();
  });

  it('responds to Escape from child elements via bubbling', () => {
    const callback = vi.fn();
    const handler = createEscapeHandler(callback);
    handler.attach(element);

    const child = document.createElement('button');
    element.appendChild(child);

    child.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(callback).toHaveBeenCalledOnce();
    handler.detach();
  });
});
