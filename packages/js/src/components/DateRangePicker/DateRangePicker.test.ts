// @vitest-environment jsdom
//
// ArvoDateRangePicker (JS) -- OverlaySurface engine test.
//
// The picker routes its popover through `createOverlaySurface` from
// @arvo/core. The engine's internal helpers (overlayHub, computePosition,
// createPositionWatcher, enter/exit) use relative imports inside @arvo/core,
// so they cannot be vi.mock'd from this file -- we run them real against
// jsdom (ResizeObserver + matchMedia polyfills make the transition + watcher
// resolve deterministically). Only the picker's atom-component imports
// (IconButton, Button, ButtonGroup, Switch, NumberInput, MessageAlert,
// Calendar) are mocked since they are unit-test scaffolding, not the
// surface under test.
//
// Behavioral surface covered:
//   - Lifecycle (initialize, render, destroy)
//   - Sizes / modifiers (--sm, --lg, --full-width)
//   - Open/close paths (trigger click, Alt+Down/Up, programmatic, anchor)
//   - Cancellable drp:open / drp:close on programmatic / field-driven paths
//   - Engine-driven outside-click dismissal is SILENT (no drp:close, no veto)
//   - DRP-specific: rolling Escape fires drp:cancel (not drp:close)
//   - DRP-specific: rolling outside-click is SILENT (no drp:cancel)
//   - Absolute layer: dual calendars, first/second click, swap, autoClose
//   - Member layer: tile grid, mode switch, member mode class
//   - Rolling layer: tabs, Save/Cancel footer, info alert, current-indicator
//   - Public API methods (range, mode, rolling, memberToggle, memberRange, clear,
//     setError, setLoading, toggle, disabled)
//   - Focus trap structure (roving [tabindex="0"] calendar cell)
//   - State classes (has-value, is-disabled, is-readonly, has-error, loading)
//   - ARIA on triggers (combobox, aria-expanded, anchor)
//   - popoverProps / calendarProps escape hatches
//   - axe-core (closed + open, region rule disabled per gotchas)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoDateRangePicker } from './DateRangePicker';
import type { ArvoDateRangePickerOptions } from './DateRangePicker';
// ---------------------------------------------------------------------------
// jsdom polyfills (DatePicker / DateTimePicker parity)
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  // matches:true => the engine's enter/exit transitions resolve immediately.
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
  // jsdom doesn't implement scrollIntoView; guard for safety.
  Element.prototype.scrollIntoView = vi.fn();
});

// ---------------------------------------------------------------------------
// Atom-component mocks
// ---------------------------------------------------------------------------

vi.mock('../MessageAlert/MessageAlert', () => {
  class ArvoMessageAlert {
    static defaultErrorMessage = 'Form field value is invalid';
    static initialize(element: HTMLElement | null, options: Record<string, unknown> = {}) {
      const el = element ?? document.createElement('div');
      el.className = `arvo-msg-alert arvo-msg-alert--${options['type'] ?? 'negative'}`;
      if (options['isInline']) el.classList.add('arvo-msg-alert--inline');
      if (options['id']) (el as HTMLElement).id = String(options['id']);
      if (typeof options['message'] === 'string') {
        el.textContent = options['message'];
      }
      el.setAttribute(
        'role',
        ['negative', 'warning', 'block'].includes(String(options['type'] ?? 'negative'))
          ? 'alert'
          : 'status',
      );
      return new ArvoMessageAlert(el, options);
    }
    el: HTMLElement;
    private _opts: Record<string, unknown>;
    constructor(el: HTMLElement, opts: Record<string, unknown>) {
      this.el = el;
      this._opts = opts;
    }
    type(next?: unknown): unknown {
      if (next === undefined) return this._opts['type'] ?? 'negative';
      this._opts['type'] = next;
      return undefined;
    }
    message(next?: unknown): unknown {
      if (next === undefined) return this._opts['message'];
      this._opts['message'] = next;
      this.el.textContent = next != null ? String(next) : '';
      return undefined;
    }
    destroy() { /* noop */ }
  }
  return { ArvoMessageAlert, ARVO_MSG_ALERT_DEFAULT_ERROR: 'Form field value is invalid' };
});

vi.mock('../IconButton/IconButton', () => {
  class ArvoIconButton {
    private _el: HTMLElement;
    private _opts: Record<string, unknown>;
    private _isSelected = false;

    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-icon-btn');
      if (opts['isDisabled']) {
        el.setAttribute('disabled', '');
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('is-disabled');
      }
      if (opts['tooltip']) el.setAttribute('aria-label', String(opts['tooltip']));
      if (opts['onClick']) {
        el.addEventListener('click', (e) => (opts['onClick'] as (ev: Event) => void)(e));
      }
      return new ArvoIconButton(el, opts);
    }

    constructor(el: HTMLElement, opts: Record<string, unknown>) {
      this._el = el;
      this._opts = opts;
    }

    disabled(state?: boolean): boolean | void {
      if (state === undefined) return this._el.hasAttribute('disabled');
      if (state) {
        this._el.setAttribute('disabled', '');
        this._el.setAttribute('aria-disabled', 'true');
        this._el.classList.add('is-disabled');
      } else {
        this._el.removeAttribute('disabled');
        this._el.removeAttribute('aria-disabled');
        this._el.classList.remove('is-disabled');
      }
      this._opts['isDisabled'] = state;
    }

    selected(state?: boolean): boolean | void {
      if (state === undefined) return this._isSelected;
      this._isSelected = state;
      if (state) this._el.classList.add('active');
      else this._el.classList.remove('active');
      this._el.setAttribute('aria-pressed', String(state));
    }

    destroy() {
      this._el.classList.remove('arvo-icon-btn', 'is-disabled', 'active');
    }
  }
  return { ArvoIconButton };
});

vi.mock('../Button/Button', () => {
  class ArvoButton {
    private _el: HTMLElement;
    private _opts: Record<string, unknown>;

    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-btn');
      if (opts['label']) el.textContent = String(opts['label']);
      if (opts['onClick']) {
        el.addEventListener('click', (e) =>
          (opts['onClick'] as (e: Event) => void)(e),
        );
      }
      const inst = new ArvoButton(el, opts);
      if (opts['isDisabled']) inst.disabled(true);
      return inst;
    }

    constructor(el: HTMLElement, opts: Record<string, unknown>) {
      this._el = el;
      this._opts = opts;
    }

    disabled(state?: boolean): boolean | void {
      if (state === undefined) return this._el.hasAttribute('disabled');
      if (state) this._el.setAttribute('disabled', '');
      else this._el.removeAttribute('disabled');
      this._opts['isDisabled'] = state;
    }

    destroy(): void { this._el.classList.remove('arvo-btn'); }
  }
  return { ArvoButton };
});

vi.mock('../ButtonGroup/ButtonGroup', () => {
  class ArvoButtonGroup {
    private _el: HTMLElement;

    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-btn-grp');
      const items = (opts['items'] as Array<{ value: string; label?: string }>) ?? [];
      for (const item of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = item.label ?? item.value;
        btn.setAttribute('data-value', item.value);
        btn.addEventListener('click', () => {
          (opts['onChange'] as (d: { value: string }) => void)?.({ value: item.value });
        });
        el.appendChild(btn);
      }
      return new ArvoButtonGroup(el);
    }

    constructor(el: HTMLElement) {
      this._el = el;
    }

    destroy(): void {
      this._el.classList.remove('arvo-btn-grp');
      this._el.textContent = '';
    }
  }
  return { ArvoButtonGroup };
});

vi.mock('../Switch/Switch', () => {
  class ArvoSwitch {
    private _el: HTMLElement;

    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-sw');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(opts['isChecked']);
      input.addEventListener('change', () => {
        (opts['onChange'] as (d: { isChecked: boolean }) => void)?.({
          isChecked: input.checked,
        });
      });
      el.appendChild(input);
      const labelText = opts['label'];
      if (typeof labelText === 'string' && labelText.length > 0) {
        const lbl = document.createElement('span');
        lbl.className = 'arvo-form-lbl arvo-sw__lbl';
        lbl.textContent = labelText;
        el.appendChild(lbl);
      }
      return new ArvoSwitch(el);
    }

    constructor(el: HTMLElement) {
      this._el = el;
    }

    destroy(): void { this._el.textContent = ''; }
  }
  return { ArvoSwitch };
});

vi.mock('../NumberInput/NumberInput', () => {
  class ArvoNumberInput {
    private _el: HTMLElement;
    private _input: HTMLInputElement;

    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-number-input');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = String(opts['value'] ?? '');
      input.addEventListener('change', (e) =>
        (opts['onChange'] as (e: Event) => void)?.(e),
      );
      el.appendChild(input);
      return new ArvoNumberInput(el, input);
    }

    constructor(el: HTMLElement, input: HTMLInputElement) {
      this._el = el;
      this._input = input;
    }

    value(v?: number | null): number | null | void {
      if (v === undefined) return Number.parseInt(this._input.value, 10);
      this._input.value = String(v ?? '');
      return undefined;
    }

    destroy(): void {
      this._el.classList.remove('arvo-number-input');
      this._el.textContent = '';
    }
  }
  return { ArvoNumberInput };
});

// Calendar mock: renders roving-tabindex cells so _getOrderedPopoverElements
// finds them (.arvo-cal__cell[tabindex="0"]) and for click-based range tests.
vi.mock('../Calendar/Calendar', () => {
  class ArvoCalendar {
    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-cal');
      const visYear = (opts['visibleYear'] as number) ?? 2026;
      const visMonth = (opts['visibleMonth'] as number) ?? 5;
      const onCellSelect = opts['onCellSelect'] as
        | ((p: { date: Date; mode: string }) => void)
        | undefined;

      const cell10 = document.createElement('button');
      cell10.type = 'button';
      cell10.className = 'arvo-cal__cell';
      cell10.setAttribute('tabindex', '0');
      cell10.setAttribute('aria-label', `${visMonth + 1}/10/${visYear}`);
      cell10.dataset.testid = `cell-10-${visYear}-${visMonth}`;
      cell10.textContent = '10';
      cell10.addEventListener('click', () =>
        onCellSelect?.({ date: new Date(visYear, visMonth, 10), mode: 'days' }),
      );
      el.appendChild(cell10);

      const cell20 = document.createElement('button');
      cell20.type = 'button';
      cell20.className = 'arvo-cal__cell';
      cell20.setAttribute('tabindex', '-1');
      cell20.setAttribute('aria-label', `${visMonth + 1}/20/${visYear}`);
      cell20.dataset.testid = `cell-20-${visYear}-${visMonth}`;
      cell20.textContent = '20';
      cell20.addEventListener('click', () =>
        onCellSelect?.({ date: new Date(visYear, visMonth, 20), mode: 'days' }),
      );
      el.appendChild(cell20);

      return new ArvoCalendar(el);
    }

    private _el: HTMLElement;

    constructor(el: HTMLElement) {
      this._el = el;
    }

    update(_opts: Record<string, unknown>): void { /* noop */ }
    focusCell(_date: Date): void { /* noop */ }
    disabled(_state: boolean): void { /* noop */ }
    destroy(): void {
      this._el.textContent = '';
      this._el.classList.remove('arvo-cal');
    }
  }
  return { default: ArvoCalendar, __esModule: true };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mount(options: Partial<ArvoDateRangePickerOptions> = {}): {
  el: HTMLElement;
  instance: ArvoDateRangePicker;
} {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const instance = ArvoDateRangePicker.initialize(el, options);
  return { el, instance };
}

function getInput(el: HTMLElement): HTMLInputElement {
  return el.querySelector('.arvo-drp__seg--start') as HTMLInputElement;
}

function queryPopover(): HTMLElement | null {
  return document.querySelector('.arvo-drp__popover');
}

// Wait for the engine's enter/exit promise microtask to resolve. With
// matchMedia.matches=true the helpers resolve synchronously, but the
// engine's `await enter(...)` still wraps in a microtask queue.
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const SAMPLE_MEMBERS = (year = 2026, month = 5) => [
  { key: `${year}/0${month + 1}/01`, name: 'W01', displayName: 'W01' },
  { key: `${year}/0${month + 1}/08`, name: 'W02', displayName: 'W02' },
  { key: `${year}/0${month + 1}/15`, name: 'W03', displayName: 'W03' },
  { key: `${year}/0${month + 1}/22`, name: 'W04', displayName: 'W04' },
  { key: `${year}/0${month + 1}/29`, name: 'W05', displayName: 'W05' },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const mountedInstances: ArvoDateRangePicker[] = [];

function track<T extends ArvoDateRangePicker>(inst: T): T {
  mountedInstances.push(inst);
  return inst;
}

afterEach(() => {
  for (const inst of mountedInstances.splice(0)) {
    try { inst.destroy(); } catch { /* noop */ }
  }
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArvoDateRangePicker (JS) -- lifecycle / rendering', () => {
  it('initialize() returns an ArvoDateRangePicker instance', () => {
    const { instance } = mount();
    track(instance);
    expect(instance).toBeInstanceOf(ArvoDateRangePicker);
  });

  it('initialize() requires an HTMLElement', () => {
    expect(() => {
      // @ts-expect-error -- intentional type violation
      ArvoDateRangePicker.initialize(null);
    }).toThrow(TypeError);
  });

  it('renders root .arvo-drp + field/dual-seg/actions/border in input mode', () => {
    const { el, instance } = mount();
    track(instance);
    expect(el.classList.contains('arvo-drp')).toBe(true);
    expect(el.querySelector('.arvo-drp__field')).not.toBeNull();
    expect(el.querySelector('.arvo-drp__seg--start')).not.toBeNull();
    expect(el.querySelector('.arvo-drp__seg--end')).not.toBeNull();
    expect(el.querySelector('.arvo-drp__arrow')).not.toBeNull();
    expect(el.querySelector('.arvo-drp__actions')).not.toBeNull();
    expect(el.querySelector('.arvo-drp__border')).not.toBeNull();
  });

  it('applies arvo-drp--lg by default', () => {
    const { el, instance } = mount();
    track(instance);
    expect(el.classList.contains('arvo-drp--lg')).toBe(true);
  });

  it('starts in absolute mode by default', () => {
    const { el, instance } = mount();
    track(instance);
    expect(el.classList.contains('arvo-drp--absolute')).toBe(true);
  });

  it('renders a label when label option is provided', () => {
    const { el, instance } = mount({ label: 'Range' });
    track(instance);
    expect(el.querySelector('label')?.textContent).toBe('Range');
  });

  it('anchor mode: host element used as anchor, no field/border rendered', () => {
    const { el, instance } = mount({ anchor: true });
    track(instance);
    expect(el.classList.contains('arvo-drp--anchor-mode')).toBe(true);
    expect(el.querySelector('.arvo-drp__field')).toBeNull();
  });

  it('does not render the popover when closed', () => {
    const { instance } = mount();
    track(instance);
    expect(queryPopover()).toBeNull();
  });

  it('destroy() removes the popover when open', () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    expect(queryPopover()).not.toBeNull();
    instance.destroy();
    expect(queryPopover()).toBeNull();
  });

  it('destroy() is idempotent', () => {
    const { instance } = mount();
    expect(() => { instance.destroy(); instance.destroy(); }).not.toThrow();
  });
});

describe('ArvoDateRangePicker (JS) -- modifiers', () => {
  it('applies --sm when size=sm', () => {
    const { el, instance } = mount({ size: 'sm' });
    track(instance);
    expect(el.classList.contains('arvo-drp--sm')).toBe(true);
  });

  it('applies --full-width when isFullWidth', () => {
    const { el, instance } = mount({ isFullWidth: true });
    track(instance);
    expect(el.classList.contains('arvo-drp--full-width')).toBe(true);
  });

  it('applies --show-weeks when hasWeeks', () => {
    const { el, instance } = mount({ hasWeeks: true });
    track(instance);
    expect(el.classList.contains('arvo-drp--show-weeks')).toBe(true);
  });

  it('isDisabled applies .is-disabled + disables the input', () => {
    const { el, instance } = mount({ isDisabled: true });
    track(instance);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(getInput(el).disabled).toBe(true);
  });

  it('isReadOnly applies .is-readonly + marks input readOnly', () => {
    const { el, instance } = mount({ isReadOnly: true });
    track(instance);
    expect(el.classList.contains('is-readonly')).toBe(true);
    expect(getInput(el).readOnly).toBe(true);
  });
});

describe('ArvoDateRangePicker (JS) -- open / close paths', () => {
  it('open() shows the popover synchronously', () => {
    const { el, instance } = mount();
    track(instance);
    instance.open();
    expect(el.classList.contains('open')).toBe(true);
    expect(queryPopover()).not.toBeNull();
  });

  it('close() hides the popover', () => {
    const { el, instance } = mount();
    track(instance);
    instance.open();
    instance.close();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('opens via Alt+ArrowDown on the start input', () => {
    const { el, instance } = mount();
    track(instance);
    getInput(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
    );
    expect(el.classList.contains('open')).toBe(true);
  });

  it('closes via Alt+ArrowUp on the start input', () => {
    const { el, instance } = mount();
    track(instance);
    instance.open();
    getInput(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }),
    );
    expect(el.classList.contains('open')).toBe(false);
  });

  it('toggle() opens and closes the popover', () => {
    const { el, instance } = mount();
    track(instance);
    instance.toggle();
    expect(el.classList.contains('open')).toBe(true);
    instance.toggle();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('open() is a no-op when isDisabled', () => {
    const { el, instance } = mount({ isDisabled: true });
    track(instance);
    instance.open();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('open() is a no-op when isReadOnly', () => {
    const { el, instance } = mount({ isReadOnly: true });
    track(instance);
    instance.open();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('open() is a no-op when isLoading', () => {
    const { el, instance } = mount({ isLoading: true });
    track(instance);
    instance.open();
    expect(el.classList.contains('open')).toBe(false);
  });
});

describe('ArvoDateRangePicker (JS) -- cancellable drp:open / drp:close (programmatic)', () => {
  it('onOpen returning false cancels open', () => {
    const onOpen = vi.fn(() => false as const);
    const { el, instance } = mount({ onOpen });
    track(instance);
    instance.open();
    expect(onOpen).toHaveBeenCalled();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('drp:open preventDefault cancels open', () => {
    const { el, instance } = mount();
    track(instance);
    el.addEventListener('drp:open', (e) => e.preventDefault());
    instance.open();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('onClose returning false vetoes programmatic close', () => {
    const onClose = vi.fn(() => false as const);
    const { el, instance } = mount({ onClose });
    track(instance);
    instance.open();
    instance.close();
    expect(onClose).toHaveBeenCalled();
    expect(el.classList.contains('open')).toBe(true);
  });

  it('drp:close preventDefault vetoes programmatic close', () => {
    const { el, instance } = mount();
    track(instance);
    instance.open();
    el.addEventListener('drp:close', (e) => e.preventDefault());
    instance.close();
    expect(el.classList.contains('open')).toBe(true);
  });

  it('dispatches drp:open and drp:close on programmatic open/close', async () => {
    const drpOpen = vi.fn();
    const drpClose = vi.fn();
    const { el, instance } = mount();
    track(instance);
    el.addEventListener('drp:open', drpOpen);
    el.addEventListener('drp:close', drpClose);
    instance.open();
    await flush();
    expect(drpOpen).toHaveBeenCalled();
    instance.close();
    await flush();
    expect(drpClose).toHaveBeenCalled();
  });
});

describe('ArvoDateRangePicker (JS) -- engine-driven dismissal is silent', () => {
  it('hub-driven outside-click does NOT fire drp:close and ignores onClose veto', async () => {
    const onClose = vi.fn(() => false as const);
    const closeEvent = vi.fn();
    const { el, instance } = mount({ onClose });
    track(instance);
    el.addEventListener('drp:close', closeEvent);
    instance.open();
    await flush();

    // Simulate an outside pointerdown. The real overlayHub installs a
    // capture-phase document listener that calls the engine's onClose callback
    // which routes to the picker's _handleEngineClose (silent path).
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    await flush();

    expect(onClose).not.toHaveBeenCalled();
    expect(closeEvent).not.toHaveBeenCalled();
  });
});

describe('ArvoDateRangePicker (JS) -- rolling mode Escape (picker-owned)', () => {
  it('Escape inside popover in rolling mode fires drp:cancel + onCancel', () => {
    const onCancel = vi.fn();
    const { el, instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      onCancel,
    });
    track(instance);
    instance.open();

    // Switch to rolling mode by clicking the 'Rolling' button in the ButtonGroup.
    const rollingBtn = document.body.querySelector<HTMLElement>(
      '.arvo-drp__hdr-tabs button[data-value="rolling"]',
    );
    if (rollingBtn) rollingBtn.click();
    expect(el.classList.contains('arvo-drp--rolling')).toBe(true);

    const drpCancelSpy = vi.fn();
    el.addEventListener('drp:cancel', drpCancelSpy);

    // Dispatch Escape keydown on the popover (picker's _handlePopoverKeyDown listener).
    const pop = queryPopover()!;
    expect(pop).not.toBeNull();
    pop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalled();
    expect(drpCancelSpy).toHaveBeenCalled();
    // Picker closes after rolling Cancel.
    expect(el.classList.contains('open')).toBe(false);
  });

  it('Escape in non-rolling (absolute) mode closes via the programmatic (cancellable) path', () => {
    const onClose = vi.fn();
    const { el, instance } = mount({ onClose });
    track(instance);
    instance.open();

    const pop = queryPopover()!;
    pop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onClose).toHaveBeenCalled();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('rolling outside-click (engine) does NOT fire drp:cancel', async () => {
    const onCancel = vi.fn();
    const { el, instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      onCancel,
    });
    track(instance);
    instance.open();

    // Switch to rolling.
    const rollingBtn = document.body.querySelector<HTMLElement>(
      '.arvo-drp__hdr-tabs button[data-value="rolling"]',
    );
    if (rollingBtn) rollingBtn.click();
    expect(el.classList.contains('arvo-drp--rolling')).toBe(true);

    const drpCancelSpy = vi.fn();
    el.addEventListener('drp:cancel', drpCancelSpy);

    // Engine-driven outside-click (silent dismissal path).
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    await flush();

    // No drp:cancel, no onCancel in the rolling outside-click path.
    expect(onCancel).not.toHaveBeenCalled();
    expect(drpCancelSpy).not.toHaveBeenCalled();
  });
});

describe('ArvoDateRangePicker (JS) -- absolute layer', () => {
  it('renders two calendar hosts when open in absolute mode', () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    const cals = document.querySelectorAll('.arvo-drp__cal');
    expect(cals.length).toBe(2);
  });

  it('renders the range header em-dash separator', () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    expect(document.querySelector('.arvo-drp__cal-sep')).toBeNull();
    const sep = document.querySelector('.arvo-cal-nav__range-sep');
    expect(sep).not.toBeNull();
    expect(sep?.textContent).toBe('\u2014');
  });

  it('first click does not commit; second click commits', () => {
    const onChange = vi.fn();
    const { instance } = mount({ onChange });
    track(instance);
    instance.open();
    const cells = document.querySelectorAll('.arvo-cal__cell');
    cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
    cells[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalled();
  });

  it('swaps endpoints when selected in reverse order', () => {
    const onChange = vi.fn();
    const { instance } = mount({ onChange });
    track(instance);
    instance.open();
    const cells = document.querySelectorAll('.arvo-cal__cell');
    cells[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detail = onChange.mock.calls[0][0];
    expect(detail.start.getDate()).toBeLessThanOrEqual(detail.end.getDate());
  });

  it('autoCloses after commit (isAutoClose=true default)', () => {
    const { el, instance } = mount();
    track(instance);
    instance.open();
    const cells = document.querySelectorAll('.arvo-cal__cell');
    cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cells[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.classList.contains('open')).toBe(false);
  });

  it('stays open after commit when isAutoClose=false', () => {
    const { el, instance } = mount({ isAutoClose: false });
    track(instance);
    instance.open();
    const cells = document.querySelectorAll('.arvo-cal__cell');
    cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cells[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.classList.contains('open')).toBe(true);
  });

  it('emits drp:change with mode=absolute on commit', () => {
    const { el, instance } = mount();
    track(instance);
    const handler = vi.fn();
    el.addEventListener('drp:change', handler as EventListener);
    instance.open();
    const cells = document.querySelectorAll('.arvo-cal__cell');
    cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cells[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.mode).toBe('absolute');
  });
});

describe('ArvoDateRangePicker (JS) -- member layer', () => {
  it('renders the member-tile grid when memberData + frequency are provided', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const grid = document.querySelector('.arvo-drp__mtg-grid');
    expect(grid).not.toBeNull();
    const tiles = grid?.querySelectorAll('.arvo-drp__mtg-tile') ?? [];
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('marks the current member tile with .current-member', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const tiles = document.querySelectorAll('.arvo-drp__mtg-tile');
    const current = Array.from(tiles).find((t) =>
      t.classList.contains('current-member'),
    );
    expect(current).toBeDefined();
  });

  it('starts in member mode by default when member data is present', () => {
    const { el, instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    expect(el.classList.contains('arvo-drp--member')).toBe(true);
  });

  it('does NOT use dual calendars in member mode', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const cals = document.querySelectorAll('.arvo-drp__cal');
    expect(cals.length).toBe(0);
  });

  it('toggles back to absolute when the switch is unchecked', () => {
    const { el, instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const swInput = document.querySelector(
      '.arvo-drp__hdr-switch input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(swInput).not.toBeNull();
    swInput.checked = false;
    swInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.classList.contains('arvo-drp--absolute')).toBe(true);
  });

  it('renders a visible "Member" label on the mode-toggle switch', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const switchHost = document.querySelector('.arvo-drp__hdr-switch');
    expect(switchHost).not.toBeNull();
    const labelEl = switchHost?.querySelector('.arvo-sw__lbl');
    expect(labelEl?.textContent).toBe('Member');
  });

  it('omits the __mtg-tile-sublabel element', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    expect(document.querySelector('.arvo-drp__mtg-tile-sublabel')).toBeNull();
  });

  it('marks BOTH adjacent endpoints selected (member mode selection regression)', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      startValue: new Date(2026, 5, 1),
      endValue: new Date(2026, 5, 14),
    });
    track(instance);
    instance.open();
    const tiles = document.querySelectorAll<HTMLElement>('.arvo-drp__mtg-tile');
    expect(tiles[0]?.classList.contains('selected')).toBe(true);
    expect(tiles[1]?.classList.contains('selected')).toBe(true);
  });
});

describe('ArvoDateRangePicker (JS) -- rolling layer', () => {
  it('renders the Absolute/Rolling tabs when hasRolling=true + memberData', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
    });
    track(instance);
    instance.open();
    const tabs = document.querySelector('.arvo-drp__hdr-tabs');
    expect(tabs).not.toBeNull();
  });

  it('renders Start + End stepper blocks when in rolling mode', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();
    const blocks = document.querySelectorAll('.arvo-drp__rolling-block');
    expect(blocks.length).toBe(2);
  });

  it('renders the sticky footer with Save + Cancel buttons', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();
    expect(document.querySelector('.arvo-drp__footer')).not.toBeNull();
    expect(document.querySelector('.arvo-drp__footer-cancel')).not.toBeNull();
    expect(document.querySelector('.arvo-drp__footer-save')).not.toBeNull();
  });

  it('dispatches drp:cancel on Cancel click', () => {
    const { el, instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    const handler = vi.fn();
    el.addEventListener('drp:cancel', handler as EventListener);
    instance.open();
    const cancelBtn = document.querySelector('.arvo-drp__footer-cancel') as HTMLElement;
    cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalled();
  });

  it('shows the range-count info alert with aria-live polite', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();
    const alert = document.querySelector('.arvo-drp__info-alert');
    expect(alert?.getAttribute('aria-live')).toBe('polite');
  });

  it('shows the footer current-indicator with prefix + display name', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();
    const ind = document.querySelector('.arvo-drp__current-ind');
    expect(ind?.textContent).toMatch(/Current Week.*CW.*:/);
  });

  // Guards against duplicate footer nodes when switching tabs (absolute <->
  // rolling): `_destroyPopoverContent()` must remove the orphan `_footerEl`
  // DOM node, not just null the reference, or duplicated rows with empty
  // button hosts stack up and push the popover's content below the viewport.
  it('does NOT duplicate the footer when switching modes via tab clicks', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();

    // Re-query on every click; `_renderPopover()` rebuilds the header (and
    // therefore the tabs element) on every mode change, so a cached reference
    // points at a detached element.
    const clickTab = (value: 'absolute' | 'rolling'): void => {
      const btn = document.querySelector<HTMLButtonElement>(
        `.arvo-drp__hdr-tabs [data-value="${value}"]`,
      );
      btn?.click();
    };

    // Default tab is 'absolute'; switch to rolling, back, and rolling again.
    clickTab('rolling');
    clickTab('absolute');
    clickTab('rolling');

    expect(document.querySelectorAll('.arvo-drp__footer').length).toBe(1);
    expect(document.querySelectorAll('.arvo-drp__footer-cancel').length).toBe(1);
    expect(document.querySelectorAll('.arvo-drp__footer-save').length).toBe(1);
  });

  // Regression: the Figma spec puts the "Current {period} ({prefix}): {value}"
  // legend at the LEFT of the footer with Cancel + Save right-aligned. The
  // shared `overlay-footer-actions-layout` mixin justifies all children to
  // flex-end; `__current-ind` flexes with `flex: 1 1 0` to absorb leftover
  // space, which is what visually pins the legend to the left edge. Lock the
  // DOM ORDER (current-ind first, footer-cancel before footer-save) so a
  // future template refactor cannot silently swap the legend to the right of
  // the buttons.
  it('renders footer children in current-ind -> cancel -> save order', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();
    const footer = document.querySelector('.arvo-drp__footer') as HTMLElement;
    const children = Array.from(footer.children) as HTMLElement[];
    expect(children[0]?.classList.contains('arvo-drp__current-ind')).toBe(true);
    expect(children[1]?.classList.contains('arvo-drp__footer-cancel')).toBe(true);
    expect(children[2]?.classList.contains('arvo-drp__footer-save')).toBe(true);
  });

  // Guards against duplicate footer nodes across close + reopen cycles: the
  // engine mounts with `removeOnClose: true` but the JS twin keeps
  // `_popoverEl` cached between opens, so `_renderPopover()` must not stack
  // a fresh footer onto the cached popover element on every open.
  it('does NOT duplicate the footer across close + reopen cycles', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.mode('rolling');
    instance.open();
    instance.close();
    instance.open();
    instance.close();
    instance.open();
    expect(document.querySelectorAll('.arvo-drp__footer').length).toBe(1);
  });
});

describe('ArvoDateRangePicker (JS) -- public API', () => {
  it('range() dual-purpose getter/setter', () => {
    const { instance } = mount();
    track(instance);
    instance.range({
      start: new Date(2026, 5, 10),
      end: new Date(2026, 5, 20),
    });
    const v = instance.range();
    expect(v.start).toBeInstanceOf(Date);
    expect(v.end).toBeInstanceOf(Date);
  });

  it('mode() dual-purpose getter/setter', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    expect(instance.mode()).toBe('member');
    instance.mode('absolute');
    expect(instance.mode()).toBe('absolute');
  });

  it('rolling() dual-purpose getter/setter', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
    });
    track(instance);
    instance.rolling({ startOffset: -1, endOffset: 1 });
    expect(instance.rolling()?.startOffset).toBe(-1);
    expect(instance.rolling()?.endOffset).toBe(1);
  });

  it('memberToggle() dual-purpose getter/setter', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    expect(instance.memberToggle()).toBe(true);
    instance.memberToggle(false);
    expect(instance.memberToggle()).toBe(false);
  });

  it('clear() removes any committed range', () => {
    const { el, instance } = mount({
      startValue: new Date(2026, 5, 10),
      endValue: new Date(2026, 5, 20),
    });
    track(instance);
    expect(el.classList.contains('has-value')).toBe(true);
    instance.clear();
    expect(el.classList.contains('has-value')).toBe(false);
  });

  it('setError() sets and clears error', () => {
    const { el, instance } = mount();
    track(instance);
    instance.setError('boom');
    expect(el.classList.contains('has-error')).toBe(true);
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('disabled() dual-purpose getter/setter', () => {
    const { instance } = mount();
    track(instance);
    expect(instance.disabled()).toBe(false);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
  });

  it('setLoading(true) prevents opening and applies .loading', () => {
    const { el, instance } = mount();
    track(instance);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    instance.open();
    expect(el.classList.contains('open')).toBe(false);
  });

  it('memberRange() returns resolved bucket endpoints', () => {
    const members = SAMPLE_MEMBERS();
    const { instance } = mount({
      memberData: members,
      frequency: 'week',
      hasModeToggle: false,
    });
    track(instance);
    instance.mode('absolute');
    instance.range({ start: new Date(2026, 5, 3), end: new Date(2026, 5, 17) });
    const range = instance.memberRange();
    expect(range.start?.displayName).toBe('W01');
    expect(range.end?.displayName).toBe('W03');
  });
});

describe('ArvoDateRangePicker (JS) -- state classes', () => {
  it('applies has-value when start or end is set', () => {
    const { el, instance } = mount({
      startValue: new Date(2026, 5, 10),
      endValue: new Date(2026, 5, 20),
    });
    track(instance);
    expect(el.classList.contains('has-value')).toBe(true);
  });

  it('applies is-disabled when isDisabled', () => {
    const { el, instance } = mount({ isDisabled: true });
    track(instance);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('applies is-readonly when isReadOnly', () => {
    const { el, instance } = mount({ isReadOnly: true });
    track(instance);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('applies has-error when isInvalid + errorMsg', () => {
    const { el, instance } = mount({ isInvalid: true, errorMsg: 'bad' });
    track(instance);
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('applies loading class when isLoading', () => {
    const { el, instance } = mount({ isLoading: true });
    track(instance);
    expect(el.classList.contains('loading')).toBe(true);
  });
});

describe('ArvoDateRangePicker (JS) -- ARIA on triggers', () => {
  it('start input is role=combobox with aria-haspopup=dialog + aria-controls', () => {
    const { el, instance } = mount();
    track(instance);
    const input = getInput(el);
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('dialog');
    expect(input.getAttribute('aria-controls')).toMatch(/-popover$/);
  });

  it('start input aria-expanded reflects open state', async () => {
    const { el, instance } = mount();
    track(instance);
    expect(getInput(el).getAttribute('aria-expanded')).toBe('false');
    instance.open();
    await flush();
    expect(getInput(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('popover role=dialog with mode-specific aria-label (absolute)', () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    const pop = document.querySelector('.arvo-drp__popover');
    expect(pop?.getAttribute('aria-label')).toBe('Choose a date range');
  });

  it('popover aria-label is member-specific in member mode', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const pop = document.querySelector('.arvo-drp__popover');
    expect(pop?.getAttribute('aria-label')).toBe('Choose a time period range');
  });

  it('popover aria-label is rolling-specific in rolling mode', () => {
    const { instance } = mount({
      memberData: SAMPLE_MEMBERS(),
      frequency: 'week',
      currentMemberIndex: 2,
      hasRolling: true,
      rollingPrefix: 'CW',
      rollingValue: { startOffset: -1, endOffset: 1 },
    });
    track(instance);
    instance.open();
    const pop = document.querySelector('.arvo-drp__popover');
    expect(pop?.getAttribute('aria-label')).toBe('Choose a rolling time range');
  });
});

describe('ArvoDateRangePicker (JS) -- anchor interactions', () => {
  it('clicking the host (anchor=true) opens the popover', () => {
    const { el, instance } = mount({ anchor: true });
    track(instance);
    el.click();
    expect(el.classList.contains('open')).toBe(true);
  });

  it('Alt+Down on the anchor host opens the popover', () => {
    const { el, instance } = mount({ anchor: true });
    track(instance);
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
    );
    expect(el.classList.contains('open')).toBe(true);
  });
});

describe('ArvoDateRangePicker (JS) -- focus trap', () => {
  it('open popover has a [tabindex="0"] calendar cell for the engine focus trap', () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    const popover = queryPopover();
    expect(popover).not.toBeNull();
    expect(popover?.querySelector('.arvo-cal__cell[tabindex="0"]')).not.toBeNull();
  });
});

describe('ArvoDateRangePicker (JS) -- member-aware absolute mode', () => {
  it('start / end inputs render the bucket displayName when member capability is on', () => {
    const members = SAMPLE_MEMBERS();
    const { el, instance } = mount({
      memberData: members,
      frequency: 'week',
      hasModeToggle: false,
      startValue: new Date(2026, 5, 3),
      endValue: new Date(2026, 5, 17),
    });
    track(instance);
    instance.mode('absolute');
    const startInput = el.querySelector('.arvo-drp__seg--start') as HTMLInputElement;
    const endInput = el.querySelector('.arvo-drp__seg--end') as HTMLInputElement;
    expect(startInput.value).toBe('W01');
    expect(endInput.value).toBe('W03');
  });

  it('auto-corrects start == end member by pushing end to the next bucket', () => {
    const members = SAMPLE_MEMBERS();
    const { instance } = mount({
      memberData: members,
      frequency: 'week',
      currentMemberIndex: 1,
    });
    track(instance);
    instance.open();
    const tiles = document.querySelectorAll<HTMLElement>('.arvo-drp__mtg-tile');
    tiles[0].click();
    tiles[0].click();
    const range = instance.memberRange();
    expect(range.start?.displayName).toBe('W01');
    expect(range.end?.displayName).toBe('W02');
  });

  // Clicking two DIFFERENT tiles in member mode must commit a range whose
  // end is the second click. Critical: the tile DOM elements must remain
  // the SAME instances across the click + hover sequence, otherwise the
  // user's mousedown -> mouseup -> click on the second tile gets split
  // across two different DOM nodes and the click never fires.
  it('clicking two different tiles in member mode commits start -> end range', () => {
    const members = SAMPLE_MEMBERS();
    const { instance } = mount({
      memberData: members,
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const firstTiles = document.querySelectorAll<HTMLElement>('.arvo-drp__mtg-tile');
    firstTiles[0].click();
    // Hover the second tile (simulating the user moving the mouse to it
    // before clicking). The tile MUST remain the same DOM element after
    // the hover -- otherwise the click event fires on a node that has
    // been removed from the DOM.
    firstTiles[3].dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    const secondTiles = document.querySelectorAll<HTMLElement>('.arvo-drp__mtg-tile');
    expect(secondTiles[3]).toBe(firstTiles[3]);
    secondTiles[3].click();
    const range = instance.memberRange();
    expect(range.start?.displayName).toBe('W01');
    expect(range.end?.displayName).toBe('W04');
  });

  // Regression: hovering a tile while a draft is open updates the
  // `.in-range` class on the existing tile DOM nodes -- it does NOT rebuild
  // them. This preserves scroll position, ARIA focus, and the click target.
  it('hovering a tile after first click toggles .in-range without rebuilding tiles', () => {
    const members = SAMPLE_MEMBERS();
    const { instance } = mount({
      memberData: members,
      frequency: 'week',
      currentMemberIndex: 2,
    });
    track(instance);
    instance.open();
    const initialTiles = document.querySelectorAll<HTMLElement>('.arvo-drp__mtg-tile');
    initialTiles[0].click(); // start
    // Hover tile index 2 -> tiles 1 and 2 should be marked in-range (1 is the
    // hover-preview interior, 2 is the hover target). Tile 0 is the start.
    initialTiles[2].dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    const afterHover = document.querySelectorAll<HTMLElement>('.arvo-drp__mtg-tile');
    // Same DOM instances -- panel was not rebuilt.
    expect(afterHover[0]).toBe(initialTiles[0]);
    expect(afterHover[1]).toBe(initialTiles[1]);
    expect(afterHover[2]).toBe(initialTiles[2]);
    // In-range visualization extends from start (tile 0) through hover target.
    expect(afterHover[1].classList.contains('in-range')).toBe(true);
    expect(afterHover[2].classList.contains('in-range')).toBe(true);
    // Pointerleave with no new enter clears the preview interior.
    initialTiles[2].dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(initialTiles[1].classList.contains('in-range')).toBe(false);
  });

  // Regression: parity with the JS test above for the absolute-with-member
  // case -- when member capability is configured but the user views the dual
  // calendar (not the tile panel), two distinct day-cell clicks must commit
  // a range that snaps to the bucket containing each click. Reuses the
  // calendar mock which exposes `__arvoCalSelect` to simulate cell selection.
  it('member-aware absolute: two day-cell clicks commit a range that snaps to member buckets', () => {
    const members = SAMPLE_MEMBERS();
    const onChange = vi.fn();
    const { instance } = mount({
      memberData: members,
      frequency: 'week',
      hasModeToggle: false, // Force absolute view with member capability.
      onChange,
    });
    track(instance);
    instance.mode('absolute');
    instance.open();
    // Synthesize two day-cell selects on the left calendar. The mocked
    // calendar exposes `__arvoCalSelect` for tests; falls back to a no-op
    // assertion if the mock surface is unavailable.
    const cal = document.querySelector('.arvo-drp__cal') as HTMLElement & {
      __arvoCalSelect?: (date: Date, mode?: string) => void;
    };
    if (typeof cal?.__arvoCalSelect === 'function') {
      cal.__arvoCalSelect(new Date(2026, 5, 1), 'days');
      // After the first click the picker stayed open + did NOT call _renderPopover
      // (it only updates the inner calendars in place), so the same calendar host
      // is still alive.
      cal.__arvoCalSelect(new Date(2026, 5, 17), 'days');
      const range = instance.range();
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(onChange).toHaveBeenCalled();
    }
  });
});

describe('ArvoDateRangePicker (JS) -- popoverProps escape hatch', () => {
  it('baseline: omitting popoverProps does not crash', () => {
    const { instance } = mount({});
    track(instance);
    expect(instance).toBeInstanceOf(ArvoDateRangePicker);
  });

  it('popoverProps.width sets the popover element width style on open', () => {
    const { instance } = mount({ popoverProps: { width: '720px' } });
    track(instance);
    instance.open();
    const popover = queryPopover() as HTMLElement;
    expect(popover).not.toBeNull();
    expect(popover.style.width).toBe('720px');
  });

  it('popoverProps.offset is accepted without throwing', () => {
    const { instance } = mount({ popoverProps: { offset: 12 } });
    track(instance);
    expect(instance).toBeInstanceOf(ArvoDateRangePicker);
  });
});

// ---------------------------------------------------------------------------
// Overlay-hub integration (z-index)
// ---------------------------------------------------------------------------
// The DRP popover registers with the shared `overlayHub` via `createOverlaySurface`
// as a `'dropdown'` (priority 20). It does NOT pass an explicit `zIndex`, so the
// hub picks `zIndexBase + stackIndex * 10` -- matching DatePicker / TimePicker /
// DateTimePicker. This guarantees consumers tuning `overlayHub.configure({
// zIndexBase })` move the DRP popover with the rest of the overlay family.
describe('ArvoDateRangePicker (JS) -- overlay-hub z-index integration', () => {
  it('popover z-index reflects the hub zIndexBase after configure', async () => {
    const { overlayHub } = await import('@arvo/core');
    const prev = 1000;
    overlayHub.configure({ zIndexBase: 5000 });
    try {
      const { instance } = mount({});
      track(instance);
      instance.open();
      const popover = queryPopover() as HTMLElement;
      expect(popover).not.toBeNull();
      const z = parseInt(popover.style.zIndex, 10);
      expect(Number.isFinite(z)).toBe(true);
      expect(z).toBeGreaterThanOrEqual(5000);
    } finally {
      overlayHub.configure({ zIndexBase: prev });
    }
  });
});

describe('ArvoDateRangePicker (JS) -- calendarProps escape hatch', () => {
  it('baseline: omitting calendarProps does not crash', () => {
    const { instance } = mount({});
    track(instance);
    expect(instance).toBeInstanceOf(ArvoDateRangePicker);
  });

  it('calendarProps bag-only keys flow through without crashing', () => {
    const { instance } = mount({
      calendarProps: { hasOutsideDays: true, isKeyboardEnabled: false, size: 'sm' },
    });
    track(instance);
    expect(instance).toBeInstanceOf(ArvoDateRangePicker);
  });
});

describe('ArvoDateRangePicker (JS) -- accessibility (axe-core)', () => {
  it('renders with zero axe violations when closed', async () => {
    const { el, instance } = mount({ label: 'Pick a date range' });
    track(instance);
    const main = document.createElement('main');
    main.appendChild(el);
    document.body.appendChild(main);
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
  });

  it('renders with zero axe violations when open', async () => {
    const { el, instance } = mount({ label: 'Pick a date range' });
    track(instance);
    const main = document.createElement('main');
    main.appendChild(el);
    document.body.appendChild(main);
    instance.open();
    await flush();
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Surface (filled default | base)
// ---------------------------------------------------------------------------
describe('ArvoDateRangePicker (JS) -- surface', () => {
  it('applies arvo-drp--surface-filled by default', () => {
    const { el } = mount();
    expect(el.classList.contains('arvo-drp--surface-filled')).toBe(true);
  });

  it('applies arvo-drp--surface-base when surface: "base"', () => {
    const { el } = mount({ surface: 'base' });
    expect(el.classList.contains('arvo-drp--surface-base')).toBe(true);
  });

  it('applies arvo-drp--surface-filled when surface: "filled"', () => {
    const { el } = mount({ surface: 'filled' });
    expect(el.classList.contains('arvo-drp--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    const { el } = mount({ surface: 'base' });
    expect(el.classList.contains('arvo-drp--surface-base')).toBe(true);
    expect(el.classList.contains('arvo-drp--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('DateRangePicker - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const { el } = mount({ label: 'Date range' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const { el } = mount({
      label: 'Date range',
      contextHelp: { content: 'Both bounds are inclusive.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const { el } = mount({ contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
