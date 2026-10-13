// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoTimeDropdown } from './TimeDropdown';
import type { ArvoTimeDropdownOptions, TimeObject } from './TimeDropdown';

// ---------------------------------------------------------------------------
// Global stubs
// ---------------------------------------------------------------------------

// jsdom does not implement scrollIntoView; stub to prevent unhandled errors
// so component event chains can be fully exercised.
Element.prototype.scrollIntoView = vi.fn();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const F24 = 'HH:mm';
const F12 = 'hh:mm tt';

/** Build a minimal TimeObject. */
function t(h: number, m: number): TimeObject {
  return { hours: h, minutes: m, seconds: 0, milliseconds: 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let containerEl: HTMLDivElement;
let instance: ArvoTimeDropdown;

function createTD(opts: Partial<ArvoTimeDropdownOptions> & { format: string }): ArvoTimeDropdown {
  containerEl = document.createElement('div');
  document.body.appendChild(containerEl);
  instance = ArvoTimeDropdown.initialize(containerEl, {
    interval: 15,
    ...opts,
  });
  return instance;
}

afterEach(() => {
  instance?.destroy();
  containerEl?.remove();
  vi.restoreAllMocks();
});

function getListEl(): HTMLElement {
  return containerEl.querySelector('[role="listbox"]') as HTMLElement;
}

function getOptionEls(): HTMLElement[] {
  return Array.from(containerEl.querySelectorAll('[role="option"]'));
}

// AM/PM toggle is rendered by ArvoButtonGroup (primary variant). Each item
// is a regular <button> inside a `.arvo-tdrop__tabs` host that itself wraps
// the group's role="toolbar" container. Helpers query the toggle by the
// container and tagName so the tests stay decoupled from the group's
// internal markup.
function getTabsHost(): HTMLElement | null {
  return containerEl.querySelector('.arvo-tdrop__tabs');
}

function getTabEls(): HTMLButtonElement[] {
  const host = getTabsHost();
  if (!host) return [];
  return Array.from(host.querySelectorAll('button')) as HTMLButtonElement[];
}

function fireKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

// ---------------------------------------------------------------------------
// 1. Initialization
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- initialization', () => {
  it('static initialize() returns an ArvoTimeDropdown instance', () => {
    createTD({ format: F24 });
    expect(instance).toBeInstanceOf(ArvoTimeDropdown);
  });

  it('constructor also returns an ArvoTimeDropdown instance', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const inst = new ArvoTimeDropdown(el, { format: F24 });
    expect(inst).toBeInstanceOf(ArvoTimeDropdown);
    inst.destroy();
    el.remove();
  });

  it('root element has arvo-tdrop class after initialization', () => {
    createTD({ format: F24 });
    expect(containerEl.classList.contains('arvo-tdrop')).toBe(true);
  });

  it('24h mode: root has arvo-tdrop--24hour class', () => {
    createTD({ format: F24 });
    expect(containerEl.classList.contains('arvo-tdrop--24hour')).toBe(true);
  });

  it('24h mode: no AM/PM toggle rendered', () => {
    createTD({ format: F24 });
    expect(getTabsHost()).toBeNull();
  });

  it('12h mode: root has arvo-tdrop--12hour class', () => {
    createTD({ format: F12 });
    expect(containerEl.classList.contains('arvo-tdrop--12hour')).toBe(true);
  });

  it('12h mode: AM/PM toggle rendered with two buttons', () => {
    createTD({ format: F12 });
    expect(getTabsHost()).not.toBeNull();
    expect(getTabEls().length).toBe(2);
  });

  it('root has role="dialog"', () => {
    createTD({ format: F24 });
    expect(containerEl.getAttribute('role')).toBe('dialog');
  });

  it('root has aria-label="Time options"', () => {
    createTD({ format: F24 });
    expect(containerEl.getAttribute('aria-label')).toBe('Time options');
  });

  it('list element has role="listbox"', () => {
    createTD({ format: F24 });
    expect(getListEl()).not.toBeNull();
    expect(getListEl().getAttribute('role')).toBe('listbox');
  });

  it('option elements have role="option"', () => {
    createTD({ format: F24, interval: 60 });
    getOptionEls().forEach(opt => {
      expect(opt.getAttribute('role')).toBe('option');
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Mode derivation
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- mode derivation', () => {
  it('format HH:mm -> arvo-tdrop--24hour class, no AM/PM toggle', () => {
    createTD({ format: F24 });
    expect(containerEl.classList.contains('arvo-tdrop--24hour')).toBe(true);
    expect(getTabsHost()).toBeNull();
  });

  it('format hh:mm tt -> arvo-tdrop--12hour class, AM/PM toggle present', () => {
    createTD({ format: F12 });
    expect(containerEl.classList.contains('arvo-tdrop--12hour')).toBe(true);
    expect(getTabsHost()).not.toBeNull();
  });

  it('empty format + locale en-US -> 12h mode', () => {
    createTD({ format: '', locale: 'en-US' });
    expect(containerEl.classList.contains('arvo-tdrop--12hour')).toBe(true);
  });

  it('empty format + locale de-DE -> 24h mode', () => {
    createTD({ format: '', locale: 'de-DE' });
    expect(containerEl.classList.contains('arvo-tdrop--24hour')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Option generation
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- option generation', () => {
  it('interval 15 -> 96 options in 24h mode', () => {
    createTD({ format: F24, interval: 15 });
    expect(getOptionEls().length).toBe(96);
  });

  it('interval 30 -> 48 options in 24h mode', () => {
    createTD({ format: F24, interval: 30 });
    expect(getOptionEls().length).toBe(48);
  });

  it('interval 60 -> 24 options in 24h mode', () => {
    createTD({ format: F24, interval: 60 });
    expect(getOptionEls().length).toBe(24);
  });

  it('interval 5 -> 288 options in 24h mode', () => {
    createTD({ format: F24, interval: 5 });
    expect(getOptionEls().length).toBe(288);
  });

  it('first option label is "00:00" for HH:mm + interval 15', () => {
    createTD({ format: F24, interval: 15 });
    expect(getOptionEls()[0].textContent).toBe('00:00');
  });

  it('last option label is "23:45" for HH:mm + interval 15', () => {
    createTD({ format: F24, interval: 15 });
    const opts = getOptionEls();
    expect(opts[95].textContent).toBe('23:45');
  });

  it('each option has an arvo-tdrop__label child span', () => {
    createTD({ format: F24, interval: 60 });
    getOptionEls().forEach(opt => {
      expect(opt.querySelector('.arvo-tdrop__label')).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 4. minTime / maxTime
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- minTime / maxTime', () => {
  it('renders only in-range options (09:00..17:00 with interval 15 = 33 options)', () => {
    createTD({ format: F24, interval: 15, minTime: t(9, 0), maxTime: t(17, 0) });
    expect(getOptionEls().length).toBe(33);
  });

  it('options before minTime are NOT in the DOM', () => {
    createTD({ format: F24, interval: 15, minTime: t(9, 0), maxTime: t(17, 0) });
    const labels = getOptionEls().map(o => o.textContent);
    expect(labels).not.toContain('08:45');
    expect(labels).not.toContain('00:00');
  });

  it('options after maxTime are NOT in the DOM', () => {
    createTD({ format: F24, interval: 15, minTime: t(9, 0), maxTime: t(17, 0) });
    const labels = getOptionEls().map(o => o.textContent);
    expect(labels).not.toContain('17:15');
    expect(labels).not.toContain('23:45');
  });

  it('12h mode: all-PM range makes AM toggle button disabled (no AM options)', () => {
    createTD({
      format: F12,
      locale: 'en-US',
      interval: 15,
      minTime: t(13, 0),
      maxTime: t(23, 59),
      value: t(14, 0),
    });
    const amTab = getTabEls()[0];
    expect(amTab.disabled).toBe(true);
  });

  it('12h mode: PM toggle button is enabled when PM options exist', () => {
    createTD({
      format: F12,
      locale: 'en-US',
      interval: 15,
      minTime: t(13, 0),
      maxTime: t(23, 59),
      value: t(14, 0),
    });
    const pmTab = getTabEls()[1];
    expect(pmTab.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Selection and events
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- selection and events', () => {
  it('matching option gets active class and aria-selected="true"', () => {
    createTD({ format: F24, interval: 60, value: t(9, 0) });
    const opts = getOptionEls();
    expect(opts[9].classList.contains('active')).toBe(true);
    expect(opts[9].getAttribute('aria-selected')).toBe('true');
  });

  it('non-matching options have aria-selected="false"', () => {
    createTD({ format: F24, interval: 60, value: t(9, 0) });
    getOptionEls()
      .filter((_, i) => i !== 9)
      .forEach(opt => expect(opt.getAttribute('aria-selected')).toBe('false'));
  });

  it('clicking an option dispatches tdrop:change on host element', () => {
    createTD({ format: F24, interval: 60 });
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    getOptionEls()[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('tdrop:change detail contains { value: TimeObject }', () => {
    createTD({ format: F24, interval: 60 });
    let captured: CustomEvent | null = null;
    containerEl.addEventListener('tdrop:change', (e) => { captured = e as CustomEvent; });
    getOptionEls()[3].dispatchEvent(new MouseEvent('click', { bubbles: true })); // 03:00
    expect(captured).not.toBeNull();
    expect(captured!.detail.value).toEqual(t(3, 0));
  });

  it('clicking an option calls the onChange callback', () => {
    const onChange = vi.fn();
    createTD({ format: F24, interval: 60, onChange });
    getOptionEls()[5].dispatchEvent(new MouseEvent('click', { bubbles: true })); // 05:00
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(t(5, 0));
  });

  it('tdrop:change bubbles to ancestors', () => {
    createTD({ format: F24, interval: 60 });
    const handler = vi.fn();
    document.body.addEventListener('tdrop:change', handler as EventListener);
    getOptionEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('tdrop:change', handler as EventListener);
  });
});

// ---------------------------------------------------------------------------
// 6. AM/PM tabs (12-hour mode)
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- AM/PM toggle', () => {
  // The AM/PM toggle is an ArvoButtonGroup (primary variant). The active
  // button reflects its state via `active` class and `aria-pressed="true"`.
  it('AM button is active when value is morning', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(9, 0) });
    const tabs = getTabEls();
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
  });

  it('PM button is active when value is afternoon', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(14, 0) });
    const tabs = getTabEls();
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
  });

  it('clicking PM button flips the active class to PM', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(9, 0) });
    getTabEls()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getTabEls()[1].classList.contains('active')).toBe(true);
    expect(getTabEls()[0].classList.contains('active')).toBe(false);
  });

  it('switching the AM/PM toggle does NOT dispatch tdrop:change', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(9, 0) });
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    getTabEls()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('ArrowLeft on toggle navigates to the AM button (via ArvoButtonGroup roving tabindex)', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(14, 0) }); // PM active
    // ArvoButtonGroup uses document.activeElement to derive the focused
    // item; focus the source button explicitly before the arrow press.
    getTabEls()[1].focus();
    fireKey(getTabEls()[1], 'ArrowLeft');
    expect(getTabEls()[0].classList.contains('active')).toBe(true);
  });

  it('ArrowRight on toggle navigates to the PM button (via ArvoButtonGroup roving tabindex)', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(9, 0) }); // AM active
    getTabEls()[0].focus();
    fireKey(getTabEls()[0], 'ArrowRight');
    expect(getTabEls()[1].classList.contains('active')).toBe(true);
  });

  it('clicking a disabled toggle button is a no-op', () => {
    createTD({
      format: F12,
      locale: 'en-US',
      interval: 15,
      minTime: t(13, 0),
      maxTime: t(23, 59),
      value: t(14, 0),
    });
    // PM is active; clicking disabled AM tab should not switch
    getTabEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getTabEls()[1].classList.contains('active')).toBe(true);
  });

  it('does NOT duplicate the tab strip across value() and disabled() syncs', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, value: t(9, 0) });
    // A composing parent (DateTimePicker / TimePicker) re-syncs value and
    // disabled state on every change. None of these may stack a second
    // `.arvo-tdrop__tabs` container or move it below the option list.
    instance.value(t(9, 30));
    instance.disabled(true);
    instance.disabled(false);
    instance.value(t(10, 0));

    const tabsContainers = containerEl.querySelectorAll('.arvo-tdrop__tabs');
    expect(tabsContainers.length).toBe(1);

    // The single tab strip must remain the FIRST child (above the list).
    expect(containerEl.firstElementChild).toBe(tabsContainers[0]);
    const listEl = containerEl.querySelector('.arvo-tdrop__list');
    expect(tabsContainers[0].compareDocumentPosition(listEl!) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Keyboard
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- keyboard', () => {
  beforeEach(() => {
    // Initialize with value=0:00 so _focusedKey='0:0' and arrow nav _currentIndex=0
    // are in sync. All navigation starts from index 0.
    createTD({ format: F24, interval: 60, value: t(0, 0) });
  });

  it('ArrowDown moves roving tabIndex to the next option', () => {
    const opts = getOptionEls();
    fireKey(getListEl(), 'ArrowDown');
    expect(opts[1].tabIndex).toBe(0);  // 01:00 now focused
    expect(opts[0].tabIndex).toBe(-1);
  });

  it('ArrowUp moves roving tabIndex to the previous option', () => {
    // Navigate to index 2 first, then go back
    fireKey(getListEl(), 'ArrowDown');
    fireKey(getListEl(), 'ArrowDown'); // now at 02:00
    const opts = getOptionEls();
    fireKey(getListEl(), 'ArrowUp');
    expect(opts[1].tabIndex).toBe(0);  // back to 01:00
  });

  it('ArrowDown clamped at last option (no wrap)', () => {
    const opts = getOptionEls();
    fireKey(getListEl(), 'End');
    fireKey(getListEl(), 'ArrowDown'); // should stay at 23:00
    expect(opts[23].tabIndex).toBe(0);
  });

  it('ArrowUp clamped at first option (no wrap)', () => {
    const opts = getOptionEls();
    fireKey(getListEl(), 'ArrowUp'); // already at index 0 -- no-op
    expect(opts[0].tabIndex).toBe(0);
  });

  it('Home moves roving tabIndex to the first option', () => {
    fireKey(getListEl(), 'ArrowDown');
    fireKey(getListEl(), 'ArrowDown');
    const opts = getOptionEls();
    fireKey(getListEl(), 'Home');
    expect(opts[0].tabIndex).toBe(0);
  });

  it('End moves roving tabIndex to the last option', () => {
    const opts = getOptionEls();
    fireKey(getListEl(), 'End');
    expect(opts[23].tabIndex).toBe(0);
  });

  it('Enter dispatches tdrop:change for the focused option', () => {
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    fireKey(getListEl(), 'Enter');
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.value).toEqual(t(0, 0));
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('Space (" ") dispatches tdrop:change for the focused option', () => {
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    fireKey(getListEl(), ' ');
    expect(handler).toHaveBeenCalledTimes(1);
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('Spacebar (legacy key) dispatches tdrop:change for the focused option', () => {
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    fireKey(getListEl(), 'Spacebar');
    expect(handler).toHaveBeenCalledTimes(1);
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('Escape on list dispatches tdrop:dismiss', () => {
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:dismiss', handler as EventListener);
    fireKey(getListEl(), 'Escape');
    expect(handler).toHaveBeenCalledTimes(1);
    containerEl.removeEventListener('tdrop:dismiss', handler as EventListener);
  });

  it('Escape on list calls onDismiss callback', () => {
    instance.destroy();
    containerEl.remove();
    const onDismiss = vi.fn();
    createTD({ format: F24, interval: 60, value: t(0, 0), onDismiss });
    fireKey(getListEl(), 'Escape');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // NOTE: Escape on the AM/PM toggle is now handled at the picker layer
  // (ArvoTimePicker/ArvoDateTimePicker close the overlay via their root
  // Escape handler). The ArvoButtonGroup toggle itself no longer participates
  // in dismiss because the dropdown is consumed inside a popover that already
  // owns the Escape contract.
});

// ---------------------------------------------------------------------------
// 8. isDisabled
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- isDisabled', () => {
  it('initial isDisabled=true adds is-disabled class to root', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    expect(containerEl.classList.contains('is-disabled')).toBe(true);
  });

  it('initial isDisabled=true sets aria-disabled="true" on root', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    expect(containerEl.getAttribute('aria-disabled')).toBe('true');
  });

  it('initial isDisabled=true sets aria-disabled="true" on list', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    expect(getListEl().getAttribute('aria-disabled')).toBe('true');
  });

  it('initial isDisabled=true disables all tab buttons in 12h mode', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15, isDisabled: true });
    getTabEls().forEach(tab => {
      expect((tab as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('click on option is a no-op when isDisabled (no tdrop:change)', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    getOptionEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('Enter on list is a no-op when isDisabled', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    fireKey(getListEl(), 'Enter');
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('Escape on list is a no-op when isDisabled (no tdrop:dismiss)', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:dismiss', handler as EventListener);
    fireKey(getListEl(), 'Escape');
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('tdrop:dismiss', handler as EventListener);
  });
});

// ---------------------------------------------------------------------------
// 9. Tooltips
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- tooltips', () => {
  it('every rendered option has a title attribute equal to its label text', () => {
    createTD({ format: F24, interval: 60 });
    getOptionEls().forEach(opt => {
      const labelEl = opt.querySelector('.arvo-tdrop__label');
      expect(opt.getAttribute('title')).toBe(labelEl?.textContent ?? '');
      expect(opt.getAttribute('title')).toBeTruthy();
    });
  });

  // AM/PM toggle buttons rely on ArvoButton's visible label for the
  // accessible name (the toggle is small enough that no extra title-attribute
  // tooltip is needed). They therefore render their text content directly
  // without a `title` attribute.
  it('AM/PM toggle buttons show their localized label as visible text', () => {
    createTD({ format: F12, locale: 'en-US', interval: 15 });
    getTabEls().forEach(tab => {
      expect(tab.textContent).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 10. Public API
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- public API', () => {
  it('value() returns null when no initial value', () => {
    createTD({ format: F24, interval: 60 });
    expect(instance.value()).toBeNull();
  });

  it('value() returns the initial value when provided', () => {
    createTD({ format: F24, interval: 60, value: t(9, 0) });
    expect(instance.value()).toEqual(t(9, 0));
  });

  it('value(v) setter updates the active option in the DOM', () => {
    createTD({ format: F24, interval: 60 });
    instance.value(t(3, 0));
    const opts = getOptionEls();
    expect(opts[3].getAttribute('aria-selected')).toBe('true');
    expect(opts[3].classList.contains('active')).toBe(true);
  });

  it('value(v) setter does NOT dispatch tdrop:change', () => {
    createTD({ format: F24, interval: 60 });
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    instance.value(t(5, 0));
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('value(v) setter does NOT call the onChange callback', () => {
    const onChange = vi.fn();
    createTD({ format: F24, interval: 60, onChange });
    instance.value(t(5, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('formattedValue() returns a non-empty string when value is set', () => {
    createTD({ format: F24, interval: 60, value: t(9, 0) });
    const formatted = instance.formattedValue();
    expect(formatted).toBe('09:00');
  });

  it('formattedValue() returns an empty string when value is null', () => {
    createTD({ format: F24, interval: 60 });
    expect(instance.formattedValue()).toBe('');
  });

  it('disabled() getter returns false initially', () => {
    createTD({ format: F24, interval: 60 });
    expect(instance.disabled()).toBe(false);
  });

  it('disabled() getter returns true after initial isDisabled=true', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled(true) adds is-disabled class and aria-disabled to root', () => {
    createTD({ format: F24, interval: 60 });
    instance.disabled(true);
    expect(containerEl.classList.contains('is-disabled')).toBe(true);
    expect(containerEl.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled(true) also sets aria-disabled on list element', () => {
    createTD({ format: F24, interval: 60 });
    instance.disabled(true);
    expect(getListEl().getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled(false) removes is-disabled class and aria-disabled from root', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    instance.disabled(false);
    expect(containerEl.classList.contains('is-disabled')).toBe(false);
    expect(containerEl.getAttribute('aria-disabled')).toBeNull();
  });

  it('disabled() getter reflects state after disabled(true) call', () => {
    createTD({ format: F24, interval: 60 });
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
    instance.disabled(false);
    expect(instance.disabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. Destroy
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- destroy', () => {
  it('destroy() clears the host element of all child content', () => {
    createTD({ format: F24, interval: 60 });
    instance.destroy();
    expect(containerEl.innerHTML).toBe('');
  });

  it('destroy() removes role, aria-label, and aria-disabled from host', () => {
    createTD({ format: F24, interval: 60, isDisabled: true });
    instance.destroy();
    expect(containerEl.getAttribute('role')).toBeNull();
    expect(containerEl.getAttribute('aria-label')).toBeNull();
    expect(containerEl.getAttribute('aria-disabled')).toBeNull();
  });

  it('destroy() removes all arvo-tdrop BEM classes from host', () => {
    createTD({ format: F24, interval: 60 });
    instance.destroy();
    expect(containerEl.classList.contains('arvo-tdrop')).toBe(false);
    expect(containerEl.classList.contains('arvo-tdrop--24hour')).toBe(false);
  });

  it('destroy() does NOT remove the host element itself', () => {
    createTD({ format: F24, interval: 60 });
    instance.destroy();
    expect(document.body.contains(containerEl)).toBe(true);
  });

  it('no tdrop:change dispatched after destroy (stale option click is ignored)', () => {
    createTD({ format: F24, interval: 60 });
    const staleOpt = getOptionEls()[0];
    instance.destroy();
    const handler = vi.fn();
    containerEl.addEventListener('tdrop:change', handler as EventListener);
    // staleOpt is detached from DOM after destroy; event won't bubble to container
    staleOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    containerEl.removeEventListener('tdrop:change', handler as EventListener);
  });

  it('destroy() is idempotent -- calling twice does not throw', () => {
    createTD({ format: F24, interval: 60 });
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 12. Roving tabindex
// ---------------------------------------------------------------------------

describe('ArvoTimeDropdown (JS) -- roving tabindex', () => {
  it('exactly one option has tabIndex=0 on mount', () => {
    createTD({ format: F24, interval: 60, value: t(0, 0) });
    const focused = getOptionEls().filter(o => o.tabIndex === 0);
    expect(focused.length).toBe(1);
  });

  it('the option matching value has tabIndex=0 on mount', () => {
    createTD({ format: F24, interval: 60, value: t(0, 0) });
    expect(getOptionEls()[0].tabIndex).toBe(0);
  });

  it('all other options have tabIndex=-1 on mount', () => {
    createTD({ format: F24, interval: 60, value: t(0, 0) });
    const notFocused = getOptionEls().filter(o => o.tabIndex === -1);
    expect(notFocused.length).toBe(23); // 24 total - 1 focused
  });

  it('after ArrowDown, exactly one option still has tabIndex=0', () => {
    createTD({ format: F24, interval: 60, value: t(0, 0) });
    fireKey(getListEl(), 'ArrowDown');
    const focused = getOptionEls().filter(o => o.tabIndex === 0);
    expect(focused.length).toBe(1);
  });

  it('after selection click, exactly one option still has tabIndex=0', () => {
    createTD({ format: F24, interval: 60, value: t(0, 0) });
    getOptionEls()[5].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const focused = getOptionEls().filter(o => o.tabIndex === 0);
    expect(focused.length).toBe(1);
  });
});
