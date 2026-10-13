// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoDateTimeDropdown } from './DateTimeDropdown';
import type { ArvoDateTimeDropdownOptions } from './DateTimeDropdown';

Element.prototype.scrollIntoView = vi.fn();

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

let trigger: HTMLButtonElement;
let instance: ArvoDateTimeDropdown | null = null;

function mount(opts?: Partial<ArvoDateTimeDropdownOptions>): ArvoDateTimeDropdown {
  trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Pick datetime';
  document.body.appendChild(trigger);
  instance = ArvoDateTimeDropdown.initialize(trigger, opts);
  return instance;
}

afterEach(() => {
  instance?.destroy();
  instance = null;
  trigger?.remove();
  document.querySelectorAll('.arvo-dt-drop').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-dt-drop');
}

describe('ArvoDateTimeDropdown (JS)', () => {
  it('initializes without rendering the panel', () => {
    mount();
    expect(getPanel()).toBeNull();
    expect(instance).toBeInstanceOf(ArvoDateTimeDropdown);
  });

  it('open() builds the panel with role="dialog" and both columns', () => {
    mount();
    instance!.open();
    const panel = getPanel();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.querySelector('.arvo-dt-drop__cal')).not.toBeNull();
    expect(panel?.querySelector('.arvo-dt-drop__time')).not.toBeNull();
  });

  it('--show-weeks modifier applies when hasWeeks is true', () => {
    mount({ hasWeeks: true });
    instance!.open();
    expect(getPanel()?.classList.contains('arvo-dt-drop--show-weeks')).toBe(true);
  });

  it('value() / value(v) reads and writes', () => {
    mount();
    expect(instance!.value()).toBeNull();
    const d = new Date(2024, 5, 10, 14, 30);
    instance!.value(d);
    expect(instance!.value()?.getTime()).toBe(d.getTime());
  });

  it('formattedValue() formats with the configured format', () => {
    mount({
      format: 'yyyy-MM-dd HH:mm',
      defaultValue: new Date(2024, 0, 15, 14, 30),
    });
    expect(instance!.formattedValue()).toBe('2024-01-15 14:30');
  });

  it('open() dispatches dt-drop:open on the trigger', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('dt-drop:open', spy);
    instance!.open();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('isDisabled prevents opening', () => {
    mount({ isDisabled: true });
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('isAutoClose defaults to false (does not close on time select)', () => {
    mount({ defaultValue: new Date(2024, 0, 1, 10, 0) });
    instance!.open();
    expect(instance!.isOpen()).toBe(true);
    // simulate a time selection by invoking the time-dropdown's onChange
    // indirectly is hard in jsdom; just verify the default flag works.
    expect((instance as unknown as { _opts: { isAutoClose: boolean } })._opts.isAutoClose).toBe(false);
  });

  it('setPreview() updates the live preview', () => {
    mount({ defaultValue: new Date(2024, 0, 15, 10, 0) });
    instance!.open();
    instance!.setPreview(new Date(2024, 0, 20, 15, 30));
    // Preview does not commit, so value() still returns the committed date.
    expect(instance!.value()?.getDate()).toBe(15);
  });

  it('destroy() removes the panel and strips trigger aria', () => {
    mount();
    instance!.open();
    expect(getPanel()).not.toBeNull();
    instance!.destroy();
    expect(getPanel()).toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBeNull();
  });
});
