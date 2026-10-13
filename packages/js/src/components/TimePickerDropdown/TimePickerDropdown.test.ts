// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoTimePickerDropdown } from './TimePickerDropdown';
import type {
  ArvoTimePickerDropdownOptions,
  TimeObject,
} from './TimePickerDropdown';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

Element.prototype.scrollIntoView = vi.fn();

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  // matches:true => engine enter/exit transitions resolve immediately
  // (animation helper short-circuits under prefers-reduced-motion).
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const F24 = 'HH:mm';
const F12 = 'hh:mm tt';

function t(h: number, m: number): TimeObject {
  return { hours: h, minutes: m, seconds: 0, milliseconds: 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let trigger: HTMLButtonElement;
let instance: ArvoTimePickerDropdown | null = null;

function mount(opts?: Partial<ArvoTimePickerDropdownOptions>): ArvoTimePickerDropdown {
  trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Open';
  document.body.appendChild(trigger);
  instance = ArvoTimePickerDropdown.initialize(trigger, { format: F24, ...opts });
  return instance;
}

afterEach(() => {
  instance?.destroy();
  instance = null;
  trigger?.remove();
  // Clean up any orphan portaled panels
  document.querySelectorAll('.arvo-tp-drop').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-tp-drop');
}

function flushRaf(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

// ---------------------------------------------------------------------------
// 1. Initialization
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- initialization', () => {
  it('static initialize() returns an instance', () => {
    mount();
    expect(instance).toBeInstanceOf(ArvoTimePickerDropdown);
  });

  it('does not render the panel until opened', () => {
    mount();
    expect(getPanel()).toBeNull();
  });

  it('defaultOpen mounts the panel on the next microtask', async () => {
    mount({ defaultOpen: true });
    await Promise.resolve();
    expect(getPanel()).not.toBeNull();
  });

  it('isOpen() reflects initial state', () => {
    mount();
    expect(instance?.isOpen()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Open / close / toggle
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- open/close/toggle', () => {
  it('open() builds and shows the panel', () => {
    mount();
    instance!.open();
    const panel = getPanel();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
  });

  it('open() sets aria-haspopup and aria-expanded on the trigger', () => {
    mount();
    instance!.open();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('close() removes aria-expanded=true and isOpen() returns false', () => {
    mount();
    instance!.open();
    instance!.close();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(instance!.isOpen()).toBe(false);
  });

  it('toggle() flips the state', () => {
    mount();
    instance!.toggle();
    expect(instance!.isOpen()).toBe(true);
    instance!.toggle();
    expect(instance!.isOpen()).toBe(false);
  });

  it('toggle(true) opens; toggle(false) closes', () => {
    mount();
    instance!.toggle(true);
    expect(instance!.isOpen()).toBe(true);
    instance!.toggle(false);
    expect(instance!.isOpen()).toBe(false);
  });

  it('open() is a no-op when isDisabled', () => {
    mount({ isDisabled: true });
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('open() respects onOpen returning false', () => {
    const onOpen = vi.fn(() => false);
    mount({ onOpen });
    instance!.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(instance!.isOpen()).toBe(false);
  });

  it('close() respects onClose returning false', () => {
    const onClose = vi.fn(() => false);
    mount({ onClose });
    instance!.open();
    instance!.close();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(instance!.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. DOM events
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- events', () => {
  it('open() dispatches a cancelable tp-drop:open on the trigger', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('tp-drop:open', spy);
    instance!.open();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cancelling tp-drop:open via preventDefault prevents opening', () => {
    mount();
    trigger.addEventListener('tp-drop:open', (e) => e.preventDefault());
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('close() dispatches tp-drop:close', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('tp-drop:close', spy);
    instance!.open();
    instance!.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Value get/set + change emission
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- value', () => {
  it('initial value returns null with no defaultValue', () => {
    mount();
    expect(instance!.value()).toBeNull();
  });

  it('uses defaultValue when value is undefined', () => {
    mount({ defaultValue: t(9, 30) });
    expect(instance!.value()).toEqual(expect.objectContaining({ hours: 9, minutes: 30 }));
  });

  it('value(v) updates the committed value', () => {
    mount();
    instance!.value(t(14, 0));
    expect(instance!.value()).toEqual(expect.objectContaining({ hours: 14, minutes: 0 }));
  });

  it('value(v) clamps to minTime/maxTime', () => {
    mount({ minTime: t(9, 0), maxTime: t(17, 0) });
    instance!.value(t(7, 0));
    expect(instance!.value()).toEqual(expect.objectContaining({ hours: 9, minutes: 0 }));
    instance!.value(t(20, 0));
    expect(instance!.value()).toEqual(expect.objectContaining({ hours: 17, minutes: 0 }));
  });

  it('formattedValue() formats with the configured format', () => {
    mount({ format: F24, defaultValue: t(8, 15) });
    expect(instance!.formattedValue()).toBe('08:15');
  });

  it('formattedValue() returns empty string when value is null', () => {
    mount();
    expect(instance!.formattedValue()).toBe('');
  });

  it('setter does not emit tp-drop:change', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('tp-drop:change', spy);
    instance!.value(t(10, 0));
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Time-option selection
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- selection', () => {
  it('clicking a time option fires onChange + tp-drop:change', async () => {
    const onChange = vi.fn();
    const changeSpy = vi.fn();
    mount({ defaultValue: t(8, 0), onChange });
    trigger.addEventListener('tp-drop:change', changeSpy);
    instance!.open();
    await flushRaf();

    const panel = getPanel()!;
    const firstOption = panel.querySelector<HTMLElement>('[role="option"]:not(.active)');
    expect(firstOption).not.toBeNull();
    firstOption?.click();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ formattedValue: expect.any(String) });
  });

  it('isAutoClose: true closes the dropdown after select (default)', async () => {
    mount();
    instance!.open();
    await flushRaf();
    const opt = getPanel()!.querySelector<HTMLElement>('[role="option"]');
    opt?.click();
    expect(instance!.isOpen()).toBe(false);
  });

  it('isAutoClose: false keeps the dropdown open after select', async () => {
    mount({ isAutoClose: false });
    instance!.open();
    await flushRaf();
    const opt = getPanel()!.querySelector<HTMLElement>('[role="option"]');
    opt?.click();
    expect(instance!.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Disabled
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- disabled', () => {
  it('disabled() returns the current state', () => {
    mount({ isDisabled: true });
    expect(instance!.disabled()).toBe(true);
  });

  it('disabled(true) prevents opening', () => {
    mount();
    instance!.disabled(true);
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('disabled(true) closes an open dropdown', () => {
    mount();
    instance!.open();
    expect(instance!.isOpen()).toBe(true);
    instance!.disabled(true);
    expect(instance!.isOpen()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Destroy
// ---------------------------------------------------------------------------

describe('ArvoTimePickerDropdown (JS) -- destroy', () => {
  it('destroy() removes the panel from the DOM', () => {
    mount();
    instance!.open();
    expect(getPanel()).not.toBeNull();
    instance!.destroy();
    expect(getPanel()).toBeNull();
  });

  it('destroy() strips aria attributes from the trigger', () => {
    mount();
    instance!.open();
    instance!.destroy();
    expect(trigger.getAttribute('aria-haspopup')).toBeNull();
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBeNull();
  });

  it('destroy() is idempotent', () => {
    mount();
    expect(() => {
      instance!.destroy();
      instance!.destroy();
    }).not.toThrow();
  });
});
