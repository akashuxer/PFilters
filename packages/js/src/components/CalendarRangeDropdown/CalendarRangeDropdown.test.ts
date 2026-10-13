// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoCalendarRangeDropdown } from './CalendarRangeDropdown';

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
let instance: ArvoCalendarRangeDropdown | null = null;

function mount(opts?: Record<string, unknown>): ArvoCalendarRangeDropdown {
  trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Pick range';
  document.body.appendChild(trigger);
  instance = ArvoCalendarRangeDropdown.initialize(trigger, opts);
  return instance;
}

afterEach(() => {
  instance?.destroy();
  instance = null;
  trigger?.remove();
  document.querySelectorAll('.arvo-cal-rng-drop').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-cal-rng-drop');
}

describe('ArvoCalendarRangeDropdown (JS)', () => {
  it('initializes without rendering the panel', () => {
    mount();
    expect(getPanel()).toBeNull();
    expect(instance).toBeInstanceOf(ArvoCalendarRangeDropdown);
  });

  it('open() builds the panel with two calendars', () => {
    mount();
    instance!.open();
    const panel = getPanel();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.querySelectorAll('.arvo-cal-rng-drop__cal').length).toBe(2);
  });

  it('range() reads applied range', () => {
    const start = new Date(2024, 0, 5);
    const end = new Date(2024, 0, 20);
    mount({ startValue: start, endValue: end });
    expect(instance!.range().start?.getTime()).toBe(start.getTime());
    expect(instance!.range().end?.getTime()).toBe(end.getTime());
  });

  it('range(v) writes applied range', () => {
    mount();
    const next = { start: new Date(2024, 0, 5), end: new Date(2024, 0, 20) };
    instance!.range(next);
    expect(instance!.range().start?.getTime()).toBe(next.start.getTime());
    expect(instance!.range().end?.getTime()).toBe(next.end.getTime());
  });

  it('dispatches cal-rng-drop:open on the trigger', () => {
    mount();
    const spy = vi.fn();
    trigger.addEventListener('cal-rng-drop:open', spy);
    instance!.open();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('isDisabled prevents opening', () => {
    mount({ isDisabled: true });
    instance!.open();
    expect(instance!.isOpen()).toBe(false);
  });

  it('setActiveSide updates the internal cursor without throwing', () => {
    mount();
    expect(() => instance!.setActiveSide('end')).not.toThrow();
  });

  it('destroy() removes the panel', () => {
    mount();
    instance!.open();
    expect(getPanel()).not.toBeNull();
    instance!.destroy();
    expect(getPanel()).toBeNull();
  });

  // A bounded dropdown with no committed range must not anchor onto
  // today's month when today is out of [minDate, maxDate] -- that would
  // produce two fully-disabled calendars AND disabled Prev/Next, leaving
  // no way to navigate to a selectable cell. pickAnchorDate anchors onto
  // minDate (or maxDate) instead.
  describe('initial visible period when today is out of range', () => {
    it('anchors the LEFT calendar onto minDate when today is after the allowed window', () => {
      mount({
        minDate: new Date(2024, 0, 1),
        maxDate: new Date(2024, 0, 31),
      });
      instance!.open();
      const panel = getPanel()!;
      // Shared header (variant="range"): the LEFT pair of month/year
      // buttons shows the left calendar's period -- January 2024.
      const header = panel.querySelector('.arvo-cal-rng-drop__header')!;
      const monthBtns = header.querySelectorAll('.arvo-cal-nav__month-btn');
      const yearBtns = header.querySelectorAll('.arvo-cal-nav__year-btn');
      expect(monthBtns[0]?.textContent).toBe('January');
      expect(yearBtns[0]?.textContent).toBe('2024');
      // The Jan 15 day cell should exist and NOT be disabled.
      const jan15 = panel.querySelector('.arvo-cal__cell[data-arvo-key="2024-01-15"]') as
        | HTMLElement
        | null;
      expect(jan15).not.toBeNull();
      expect(jan15?.classList.contains('is-disabled')).toBe(false);
    });

    it('keeps the committed start as the anchor when one is supplied', () => {
      // When start exists, it wins -- pickAnchorDate never overrides a value.
      mount({
        startValue: new Date(2024, 5, 10), // June 10, 2024
        minDate: new Date(2024, 0, 1),
        maxDate: new Date(2024, 11, 31),
      });
      instance!.open();
      const panel = getPanel()!;
      const header = panel.querySelector('.arvo-cal-rng-drop__header')!;
      const monthBtns = header.querySelectorAll('.arvo-cal-nav__month-btn');
      const yearBtns = header.querySelectorAll('.arvo-cal-nav__year-btn');
      expect(monthBtns[0]?.textContent).toBe('June');
      expect(yearBtns[0]?.textContent).toBe('2024');
    });
  });

  // The dropdown renders a single shared header (not two per-column
  // CalendarNav strips with split nav) so Prev/Next and the month/year
  // zoom buttons are available and step both calendars together. This
  // block locks in the shared-header behavior that mirrors
  // ArvoDateRangePicker.
  describe('shared header (variant="range") matches the DateRangePicker', () => {
    function getHeader(): HTMLElement {
      return getPanel()!.querySelector('.arvo-cal-rng-drop__header')!;
    }

    it('renders exactly ONE shared header with dual month/year labels joined by an em-dash', () => {
      mount({ startValue: new Date(2026, 5, 15) }); // June 15, 2026
      instance!.open();
      const panel = getPanel()!;
      // Exactly one header element.
      expect(panel.querySelectorAll('.arvo-cal-rng-drop__header').length).toBe(1);
      // Per-column navs from the old design must NOT be in the DOM.
      expect(panel.querySelectorAll('.arvo-cal-rng-drop__cal-nav').length).toBe(0);
      // Dual labels: "June 2026 - July 2026" (em-dash u2014 separates them).
      const header = panel.querySelector('.arvo-cal-rng-drop__header')!;
      const monthBtns = header.querySelectorAll('.arvo-cal-nav__month-btn');
      const yearBtns = header.querySelectorAll('.arvo-cal-nav__year-btn');
      expect(monthBtns.length).toBe(2);
      expect(yearBtns.length).toBe(2);
      expect(monthBtns[0]?.textContent).toBe('June');
      expect(yearBtns[0]?.textContent).toBe('2026');
      expect(monthBtns[1]?.textContent).toBe('July');
      expect(yearBtns[1]?.textContent).toBe('2026');
      expect(header.querySelector('.arvo-cal-nav__range-sep')?.textContent).toBe('\u2014');
    });

    it('renders a single Prev / Next / Today cluster (not one per calendar)', () => {
      mount();
      instance!.open();
      const header = getHeader();
      expect(header.querySelectorAll('.arvo-cal-nav__prev').length).toBe(1);
      expect(header.querySelectorAll('.arvo-cal-nav__next').length).toBe(1);
      expect(header.querySelectorAll('.arvo-cal-nav__today').length).toBe(1);
    });

    it('shared Prev steps BOTH calendars back one month (days view)', () => {
      mount({ startValue: new Date(2026, 5, 15) });
      instance!.open();
      const header = getHeader();
      const prev = header.querySelector<HTMLButtonElement>(
        'button.arvo-cal-nav__prev',
      )!;
      prev.click();
      // After one step back: left = May 2026, right = June 2026.
      const monthBtns = header.querySelectorAll('.arvo-cal-nav__month-btn');
      expect(monthBtns[0]?.textContent).toBe('May');
      expect(monthBtns[1]?.textContent).toBe('June');
    });

    it('shared Next steps BOTH calendars forward one month (days view)', () => {
      mount({ startValue: new Date(2026, 5, 15) });
      instance!.open();
      const header = getHeader();
      const next = header.querySelector<HTMLButtonElement>(
        'button.arvo-cal-nav__next',
      )!;
      next.click();
      // After one step forward: left = July 2026, right = August 2026.
      const monthBtns = header.querySelectorAll('.arvo-cal-nav__month-btn');
      expect(monthBtns[0]?.textContent).toBe('July');
      expect(monthBtns[1]?.textContent).toBe('August');
    });

    it('clicking the LEFT month button drills BOTH calendars into months view', () => {
      mount({ startValue: new Date(2026, 5, 15) });
      instance!.open();
      const header = getHeader();
      const monthBtn = header.querySelector<HTMLButtonElement>(
        'button.arvo-cal-nav__month-btn',
      )!;
      monthBtn.click();
      // Months view: month buttons disappear, year buttons remain (the
      // year-only range label "2026 - 2027").
      const headerAfter = getHeader();
      expect(headerAfter.querySelectorAll('.arvo-cal-nav__month-btn').length).toBe(0);
      const yearBtns = headerAfter.querySelectorAll('.arvo-cal-nav__year-btn');
      expect(yearBtns.length).toBe(2);
      expect(yearBtns[0]?.textContent).toBe('2026');
      expect(yearBtns[1]?.textContent).toBe('2027');
      // Both calendars should be in months view -- spot-check the month
      // tiles for 2026 are present in the left calendar's grid.
      const panel = getPanel()!;
      const jan2026 = panel.querySelector('.arvo-cal__cell[data-arvo-key="2026-0"]');
      expect(jan2026).not.toBeNull();
    });

    it('clicking the LEFT year button drills BOTH calendars into years view (continuous decade label)', () => {
      mount({ startValue: new Date(2026, 5, 15) });
      instance!.open();
      const header = getHeader();
      const yearBtn = header.querySelector<HTMLButtonElement>(
        'button.arvo-cal-nav__year-btn',
      )!;
      yearBtn.click();
      // Years view: a single continuous decade label spans both decades
      // (2020-2029 on left + 2030-2039 on right -> "2020 - 2039").
      const headerAfter = getHeader();
      expect(headerAfter.querySelectorAll('.arvo-cal-nav__year-btn').length).toBe(0);
      expect(headerAfter.querySelectorAll('.arvo-cal-nav__month-btn').length).toBe(0);
      const decade = headerAfter.querySelector('.arvo-cal-nav__decade-lbl');
      expect(decade?.textContent).toBe('2020 - 2039');
      // Year cells from 2020-2029 should be in the left calendar grid.
      const panel = getPanel()!;
      expect(panel.querySelector('.arvo-cal__cell[data-arvo-key="y-2020"]')).not.toBeNull();
      expect(panel.querySelector('.arvo-cal__cell[data-arvo-key="y-2029"]')).not.toBeNull();
    });

    it('clicking a month tile drills back down to days view on that month', () => {
      mount({ startValue: new Date(2026, 5, 15) });
      instance!.open();
      // Enter months view.
      getHeader()
        .querySelector<HTMLButtonElement>('button.arvo-cal-nav__month-btn')!
        .click();
      // Click the Jan 2026 tile in the LEFT calendar.
      const panel = getPanel()!;
      const jan2026 = panel.querySelector<HTMLElement>(
        '.arvo-cal__cell[data-arvo-key="2026-0"]',
      )!;
      jan2026.click();
      // Now in days view; left should show "January 2026".
      const headerAfter = getHeader();
      const monthBtns = headerAfter.querySelectorAll('.arvo-cal-nav__month-btn');
      const yearBtns = headerAfter.querySelectorAll('.arvo-cal-nav__year-btn');
      expect(monthBtns[0]?.textContent).toBe('January');
      expect(yearBtns[0]?.textContent).toBe('2026');
      // And the Jan day cells are rendered.
      expect(panel.querySelector('.arvo-cal__cell[data-arvo-key="2026-01-15"]')).not.toBeNull();
    });

    it('shared Today snaps BOTH calendars onto today\'s month', () => {
      mount({ startValue: new Date(2024, 0, 15) }); // Open on Jan 2024.
      instance!.open();
      const header = getHeader();
      // Sanity: left starts at January 2024.
      const monthBtnsBefore = header.querySelectorAll('.arvo-cal-nav__month-btn');
      expect(monthBtnsBefore[0]?.textContent).toBe('January');
      // Click Today.
      header
        .querySelector<HTMLButtonElement>('button.arvo-cal-nav__today')!
        .click();
      // After click: left should be today's month/year.
      const today = new Date();
      const todayMonthName = today.toLocaleString('en-US', { month: 'long' });
      const monthBtnsAfter = getHeader().querySelectorAll('.arvo-cal-nav__month-btn');
      const yearBtnsAfter = getHeader().querySelectorAll('.arvo-cal-nav__year-btn');
      expect(monthBtnsAfter[0]?.textContent).toBe(todayMonthName);
      expect(yearBtnsAfter[0]?.textContent).toBe(String(today.getFullYear()));
    });
  });
});
