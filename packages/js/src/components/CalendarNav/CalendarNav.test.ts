// @vitest-environment jsdom
//
// JS CalendarNav unit tests.
//
// CalendarNav is internal to the date-time pickers and dropdowns. The full
// behavioral surface (rendering, callbacks, range/member variants, etc.) is
// covered indirectly through the consumer tests (DatePicker / DateRangePicker
// / DateTimePicker). This file focuses on the parts of CalendarNav that are
// purely internal-state-driven and need direct assertions:
//
//   - canGoPrev / canGoNext disabled state (mirrors React CalendarNav test)
//   - canGoToday disabled state when today is out of [minDate, maxDate]
//
// Inner button atoms (ArvoButton, ArvoIconButton) are real here because they
// are tiny vanilla classes and we want CalendarNav's wiring to exercise the
// real disabled() / setLabel() surface.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CalendarNav } from './CalendarNav';
import type { CalendarNavOptions } from './CalendarNav';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mount(
  options: Partial<CalendarNavOptions> = {},
): { el: HTMLElement; instance: CalendarNav } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const instance = CalendarNav.initialize(el, {
    visibleYear: 2026,
    visibleMonth: 5, // June (0-based)
    viewMode: 'days',
    locale: 'en-US',
    onPrev: () => {},
    onNext: () => {},
    onToday: () => {},
    onMonthButtonClick: () => {},
    onYearButtonClick: () => {},
    ...options,
  });
  return { el, instance };
}

function isDisabledButton(el: HTMLElement, selector: string): boolean {
  const btn = el.querySelector<HTMLButtonElement>(selector);
  if (!btn) return false;
  return (
    btn.disabled ||
    btn.getAttribute('aria-disabled') === 'true' ||
    btn.classList.contains('is-disabled')
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const mountedInstances: CalendarNav[] = [];

function track(inst: CalendarNav): CalendarNav {
  mountedInstances.push(inst);
  return inst;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  for (const inst of mountedInstances.splice(0)) {
    try { inst.destroy(); } catch { /* noop */ }
  }
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// canGoPrev / canGoNext (sanity)
// ---------------------------------------------------------------------------

describe('CalendarNav -- canGoPrev / canGoNext', () => {
  it('prev button is disabled when minDate puts previous month out of range', () => {
    const { el, instance } = mount({
      minDate: new Date('2026-06-01T00:00:00'),
    });
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__prev')).toBe(true);
  });

  it('next button is disabled when maxDate puts next month out of range', () => {
    const { el, instance } = mount({
      maxDate: new Date('2026-06-30T00:00:00'),
    });
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__next')).toBe(true);
  });

  it('prev / next are enabled when no bounds are set', () => {
    const { el, instance } = mount();
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__prev')).toBe(false);
    expect(isDisabledButton(el, '.arvo-cal-nav__next')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canGoToday
//
// Today must be disabled when today's date is outside [minDate, maxDate].
// Otherwise the Today action would jump the calendar to a period whose
// tiles AND adjacent Prev/Next periods are all out-of-range, stranding
// the user on a dead view with no escape.
// ---------------------------------------------------------------------------

describe('CalendarNav -- canGoToday', () => {
  it('today button is disabled when today is before minDate', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { el, instance } = mount({ minDate: tomorrow });
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__today')).toBe(true);
  });

  it('today button is disabled when today is after maxDate', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { el, instance } = mount({ maxDate: yesterday });
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__today')).toBe(true);
  });

  it('today button is enabled when today is within [minDate, maxDate]', () => {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const { el, instance } = mount({ minDate: past, maxDate: future });
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__today')).toBe(false);
  });

  it('today button is enabled when no bounds are set', () => {
    const { el, instance } = mount();
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__today')).toBe(false);
  });

  it('today button stays disabled while isDisabled=true regardless of range', () => {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const { el, instance } = mount({
      isDisabled: true,
      minDate: past,
      maxDate: future,
    });
    track(instance);
    expect(isDisabledButton(el, '.arvo-cal-nav__today')).toBe(true);
  });
});
