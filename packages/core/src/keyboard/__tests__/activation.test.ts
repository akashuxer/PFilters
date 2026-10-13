// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createActivationHandler } from '../activation';

function makeKey(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
}

describe('createActivationHandler', () => {
  it('calls callback on Enter', () => {
    const callback = vi.fn();
    const handler = createActivationHandler(callback);

    const event = makeKey('Enter');
    handler.handleKeyDown(event);

    expect(callback).toHaveBeenCalledWith(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('calls callback on Space', () => {
    const callback = vi.fn();
    const handler = createActivationHandler(callback);

    const event = makeKey(' ');
    handler.handleKeyDown(event);

    expect(callback).toHaveBeenCalledWith(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not call callback on other keys', () => {
    const callback = vi.fn();
    const handler = createActivationHandler(callback);

    handler.handleKeyDown(makeKey('Tab'));
    handler.handleKeyDown(makeKey('Escape'));
    handler.handleKeyDown(makeKey('ArrowDown'));
    handler.handleKeyDown(makeKey('a'));

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not preventDefault on non-activation keys', () => {
    const handler = createActivationHandler(vi.fn());

    const tab = makeKey('Tab');
    handler.handleKeyDown(tab);
    expect(tab.defaultPrevented).toBe(false);

    const esc = makeKey('Escape');
    handler.handleKeyDown(esc);
    expect(esc.defaultPrevented).toBe(false);
  });

  it('passes the original event to the callback', () => {
    const callback = vi.fn();
    const handler = createActivationHandler(callback);

    const event = makeKey('Enter');
    handler.handleKeyDown(event);

    expect(callback.mock.calls[0][0]).toBe(event);
  });
});
