// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoCalendarDropdown } from './CalendarDropdown';
import type {
  ArvoCalendarDropdownOptions,
} from './CalendarDropdown';

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
let instance: ArvoCalendarDropdown | null = null;

function mount(opts?: Partial<ArvoCalendarDropdownOptions>): ArvoCalendarDropdown {
  trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Pick date';
  document.body.appendChild(trigger);
  instance = ArvoCalendarDropdown.initialize(trigger, opts);
  return instance;
}

afterEach(() => {
  instance?.destroy();
  instance = null;
  trigger?.remove();
  document.querySelectorAll('.arvo-cal-drop').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-cal-drop');
}

describe('ArvoCalendarDropdown (JS) -- initialization', () => {
  it('static initialize() returns an instance', () => {
    mount();
    expect(instance).toBeInstanceOf(ArvoCalendarDropdown);
  });

  it('does not render the panel until opened', () => {
    mount();
    expect(getPanel()).toBeNull();
  });

  it('defaultOpen mounts the panel asynchronously', async () => {
    mount({ defaultOpen: true });
    await Promise.resolve();
    expect(getPanel()).not.toBeNull();
  });

  it('isOpen() reflects initial state', () => {
    mount();
    expect(instance!.isOpen()).toBe(false);
  });
});

describe('ArvoCalendarDropdown (JS) -- open/close/toggle', () => {
  it('open() builds and shows the panel with role="dialog"', () => {
    mount();
    instance!.open();
    expect(getPanel()).not.toBeNull();
    expect(getPanel()?.getAttribute('role')).toBe('dialog');
  });

  it('open() wires aria-haspopup and aria-expanded on the trigger', () => {
    mount();
    instance!.open();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('close() resets state', () => {
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

  it('open() is a no-op when isDisabled', () => {
    mount({ isDisabled: true });
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('open() respects onOpen returning false', () => {
    const onOpen = vi.fn(() => false);
    mount({ onOpen });
    instance!.open();
    expect(onOpen).toHaveBeenCalled();
    expect(instance!.isOpen()).toBe(false);
  });

  it('close() respects onClose returning false', () => {
    const onClose = vi.fn(() => false);
    mount({ onClose });
    instance!.open();
    instance!.close();
    expect(onClose).toHaveBeenCalled();
    expect(instance!.isOpen()).toBe(true);
  });
});

describe('ArvoCalendarDropdown (JS) -- events', () => {
  it('open() dispatches cal-drop:open on the trigger', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('cal-drop:open', spy);
    instance!.open();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cancelling cal-drop:open via preventDefault prevents opening', () => {
    mount();
    trigger.addEventListener('cal-drop:open', (e) => e.preventDefault());
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('close() dispatches cal-drop:close', () => {
    mount();
    instance!.open();
    const spy = vi.fn();
    trigger.addEventListener('cal-drop:close', spy);
    instance!.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('ArvoCalendarDropdown (JS) -- value', () => {
  it('initial value returns null with no defaultValue', () => {
    mount();
    expect(instance!.value()).toBeNull();
  });

  it('uses defaultValue when value is undefined', () => {
    mount({ defaultValue: new Date(2024, 0, 15) });
    const v = instance!.value();
    expect(v).not.toBeNull();
    expect(v!.getFullYear()).toBe(2024);
    expect(v!.getMonth()).toBe(0);
    expect(v!.getDate()).toBe(15);
  });

  it('value(v) updates the committed value', () => {
    mount();
    instance!.value(new Date(2024, 5, 10));
    expect(instance!.value()?.getMonth()).toBe(5);
  });

  it('value(v) clamps to minDate / maxDate', () => {
    mount({ minDate: new Date(2024, 0, 5), maxDate: new Date(2024, 0, 20) });
    instance!.value(new Date(2024, 0, 1));
    expect(instance!.value()?.getDate()).toBe(5);
    instance!.value(new Date(2024, 0, 31));
    expect(instance!.value()?.getDate()).toBe(20);
  });

  it('formattedValue() formats with the configured format', () => {
    mount({ format: 'yyyy-MM-dd', defaultValue: new Date(2024, 0, 15) });
    expect(instance!.formattedValue()).toBe('2024-01-15');
  });

  it('formattedValue() returns empty string when value is null', () => {
    mount();
    expect(instance!.formattedValue()).toBe('');
  });

  it('setter does not emit cal-drop:change', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('cal-drop:change', spy);
    instance!.value(new Date(2024, 0, 1));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('ArvoCalendarDropdown (JS) -- disabled', () => {
  it('disabled() returns current state', () => {
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

describe('ArvoCalendarDropdown (JS) -- drill-down sync', () => {
  // `_setViewMode` must push both the new `viewMode` AND the new visible
  // period to the calendar/nav together. Otherwise clicking January in
  // months view (or 2020 in years view) would update internal state but
  // leave the rendered calendar and header stuck on the previous
  // month/decade, and Prev/Next would then step from the correct internal
  // state while the header label stays out of sync with what the user
  // clicked.
  it('clicking a month tile drills down to that month (not the previously visible one)', () => {
    // Anchor the visible period on June 2026, then drill into months -> Jan.
    mount({ defaultValue: new Date(2026, 5, 15) });
    instance!.open();
    const panel = getPanel()!;
    expect(panel.querySelector('.arvo-cal-nav__month-btn')?.textContent).toBe('June');

    // Enter months view via the header month button.
    panel.querySelector<HTMLButtonElement>('.arvo-cal-nav__month-btn')!.click();
    // Now in months view -- nav only shows the year button.
    expect(panel.querySelector('.arvo-cal-nav__month-btn')).toBeNull();
    expect(panel.querySelector('.arvo-cal-nav__year-btn')?.textContent).toBe('2026');
    // The Jan cell carries the data-arvo-key '2026-0' set by Calendar.
    const janCell = panel.querySelector<HTMLElement>(
      '.arvo-cal__cell[data-arvo-key="2026-0"]',
    );
    expect(janCell).not.toBeNull();
    janCell!.click();

    // Calendar should now show January 2026 days view, NOT June still.
    expect(panel.querySelector('.arvo-cal-nav__month-btn')?.textContent).toBe('January');
    expect(panel.querySelector('.arvo-cal-nav__year-btn')?.textContent).toBe('2026');
    // The day grid should render January days -- spot-check Jan 1 by aria-label.
    const jan1 = panel.querySelector<HTMLElement>(
      '.arvo-cal__cell[aria-label*="January 1"]',
    );
    expect(jan1).not.toBeNull();
    // And there should be no June day cells visible.
    const juneCells = panel.querySelectorAll<HTMLElement>(
      '.arvo-cal__cell[aria-label*="June"]',
    );
    expect(juneCells.length).toBe(0);
  });

  it('clicking a year tile drills down to that year (not the previously visible decade)', () => {
    // Anchor the visible period on June 2026, then drill into years -> 2020.
    mount({ defaultValue: new Date(2026, 5, 15) });
    instance!.open();
    const panel = getPanel()!;

    // Enter years view via the header year button.
    panel.querySelector<HTMLButtonElement>('.arvo-cal-nav__year-btn')!.click();
    expect(panel.querySelector('.arvo-cal-nav__decade-lbl')?.textContent).toBe('2020 - 2029');
    // Click 2020 (key 'y-2020' per Calendar.buildYearsCells).
    const y2020 = panel.querySelector<HTMLElement>('.arvo-cal__cell[data-arvo-key="y-2020"]');
    expect(y2020).not.toBeNull();
    y2020!.click();

    // We're now in months view for 2020 -- not still in years view for the
    // 2020-2029 decade, and NOT in months view for 2026.
    expect(panel.querySelector('.arvo-cal-nav__decade-lbl')).toBeNull();
    expect(panel.querySelector('.arvo-cal-nav__year-btn')?.textContent).toBe('2020');
    // The month grid should be built for 2020 (one cell per month).
    const monthCells = panel.querySelectorAll<HTMLElement>('.arvo-cal__cell[data-arvo-key^="2020-"]');
    expect(monthCells.length).toBe(12);
    const cells2026 = panel.querySelectorAll<HTMLElement>('.arvo-cal__cell[data-arvo-key^="2026-"]');
    expect(cells2026.length).toBe(0);
  });
});

describe('ArvoCalendarDropdown (JS) -- destroy', () => {
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
