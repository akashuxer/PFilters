// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInlinePanelStack } from '../inline-panel-stack';

describe('createInlinePanelStack', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  function makeLayer(label: string): HTMLDivElement {
    const el = document.createElement('div');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    el.appendChild(btn);
    return el;
  }

  it('creates a hidden container and reveals it on first push', () => {
    const stack = createInlinePanelStack({ host });
    expect(stack.getDepth()).toBe(0);
    expect(stack.container.hidden).toBe(true);

    stack.push({ kind: 'popover', element: makeLayer('a') });
    expect(stack.getDepth()).toBe(1);
    expect(stack.container.hidden).toBe(false);
    expect(stack.container.classList.contains('open')).toBe(true);
    stack.destroy();
  });

  it('rejects push beyond maxDepth with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stack = createInlinePanelStack({ host, maxDepth: 2 });

    expect(stack.push({ kind: 'popover', element: makeLayer('1') })).toBe(true);
    expect(stack.push({ kind: 'popover', element: makeLayer('2') })).toBe(true);
    expect(stack.push({ kind: 'popover', element: makeLayer('3') })).toBe(false);
    expect(stack.getDepth()).toBe(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    stack.destroy();
  });

  it('honors onOpen veto before push', () => {
    const stack = createInlinePanelStack({ host });
    const onOpen = vi.fn(() => false as const);

    expect(
      stack.push({
        kind: 'popover',
        element: makeLayer('a'),
        onOpen,
      }),
    ).toBe(false);
    expect(stack.getDepth()).toBe(0);
    expect(onOpen).toHaveBeenCalled();
    stack.destroy();
  });

  it('honors onClose veto on pop', () => {
    const stack = createInlinePanelStack({ host });
    const onClose = vi.fn(() => false as const);

    stack.push({
      kind: 'popover',
      element: makeLayer('a'),
      onClose,
    });
    expect(stack.pop()).toBe(false);
    expect(stack.getDepth()).toBe(1);
    expect(onClose).toHaveBeenCalled();
    stack.destroy();
  });

  it('notifies onBack only for back pops', () => {
    const stack = createInlinePanelStack({ host });
    const onBack = vi.fn();

    stack.push({
      kind: 'popover',
      element: makeLayer('a'),
      onBack,
    });

    stack.pop({ via: 'back' });
    expect(onBack).toHaveBeenCalled();
    expect(stack.getDepth()).toBe(0);
    stack.destroy();
  });

  it('pops all layers and hides the container', () => {
    const stack = createInlinePanelStack({ host });
    stack.push({ kind: 'popover', element: makeLayer('1') });
    stack.push({ kind: 'hybrid', element: makeLayer('2') });

    stack.popAll();
    expect(stack.getDepth()).toBe(0);
    expect(stack.container.hidden).toBe(true);
    stack.destroy();
  });

  it('handleEscape pops the top layer', () => {
    const stack = createInlinePanelStack({ host });
    stack.push({ kind: 'popover', element: makeLayer('1') });
    stack.push({ kind: 'popover', element: makeLayer('2') });

    expect(stack.handleEscape()).toBe(true);
    expect(stack.getDepth()).toBe(1);
    stack.destroy();
  });
});
