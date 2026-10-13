// @vitest-environment jsdom
//
// ArvoTimePicker (JS) -- OverlaySurface engine migration.
//
// The picker now routes its popover through `createOverlaySurface` from
// @arvo/core. The engine's internal helpers (overlayHub, computePosition,
// createPositionWatcher, enter/exit) use relative imports inside @arvo/core,
// so they cannot be vi.mock'd from this file -- we run them real against
// jsdom (ResizeObserver + matchMedia polyfills make the transition + watcher
// resolve deterministically). Only the picker's atom-component imports
// (IconButton, MessageAlert, TimeDropdown) are mocked since they are
// unit-test scaffolding, not the surface under test.
//
// Behavioral surface covered:
//   - Lifecycle (initialize, render, destroy)
//   - Sizes / modifiers
//   - Open/close (icon click, Alt+Down/Up, public methods, anchor)
//   - Cancellable tp:open / tp:close on programmatic / field-driven paths
//   - Engine-driven outside-click dismissal is SILENT (no tp:close, no veto)
//   - Time selection via TimeDropdown onChange + isAutoClose
//   - value() getter/setter, formattedValue, clear
//   - Error / loading overrides
//   - ARIA on input / trigger button / anchor
//   - Focus trap structure (roving [tabindex="0"] time item)
//   - axe-core (closed + open, region rule disabled per gotchas)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoTimePicker } from './TimePicker';
import type { ArvoTimePickerOptions } from './TimePicker';
// ---------------------------------------------------------------------------
// jsdom polyfills (DatePicker / OptionList parity)
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  // matches:true => the engine's enter/exit transitions resolve immediately
  // (the animation helper short-circuits when matchMedia reports reduced
  // motion is preferred).
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
    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      el.classList.add('arvo-icon-btn');
      if (opts['isDisabled']) {
        el.setAttribute('disabled', '');
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('is-disabled');
      }
      if (opts['tooltip']) {
        el.setAttribute('aria-label', String(opts['tooltip']));
      }
      if (opts['onClick']) {
        el.addEventListener('click', (e) => (opts['onClick'] as (ev: Event) => void)(e));
      }
      return new ArvoIconButton(el, opts);
    }
    private _el: HTMLElement;
    private _opts: Record<string, unknown>;
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
      if (state === undefined) return this._opts['isSelected'] === true;
      this._opts['isSelected'] = state;
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

// TimeDropdown mock: renders a single roving [tabindex="0"] time item so
// the engine focus trap has an element to latch onto. The item click fires
// the onChange callback so isAutoClose tests can assert close behavior.
vi.mock('../TimeDropdown/TimeDropdown', () => {
  class ArvoTimeDropdown {
    private _el: HTMLElement;
    private _disabled = false;
    private _onChange: ((v: { hours: number; minutes: number }) => void) | null = null;
    private _onDismiss: (() => void) | null = null;

    static initialize(el: HTMLElement, opts: Record<string, unknown> = {}) {
      return new ArvoTimeDropdown(el, opts);
    }

    constructor(el: HTMLElement, opts: Record<string, unknown>) {
      this._el = el;
      this._disabled = !!opts['isDisabled'];
      this._onChange = (opts['onChange'] as ((v: { hours: number; minutes: number }) => void)) ?? null;
      this._onDismiss = (opts['onDismiss'] as (() => void)) ?? null;

      el.classList.add('arvo-tdrop');
      const item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('tabindex', '0');
      item.dataset.testid = 'time-item';
      item.textContent = '09:00';
      item.addEventListener('click', () => {
        if (!this._disabled) {
          this._onChange?.({ hours: 9, minutes: 0 });
        }
      });
      el.appendChild(item);
    }

    value(_v: unknown): void { /* noop -- sync handled by picker */ }

    disabled(state: boolean): void {
      this._disabled = state;
    }

    destroy(): void {
      this._el.textContent = '';
      this._el.classList.remove('arvo-tdrop');
    }
  }
  return { ArvoTimeDropdown };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mount(options: Partial<ArvoTimePickerOptions> = {}): {
  el: HTMLElement;
  instance: ArvoTimePicker;
} {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const instance = ArvoTimePicker.initialize(el, options);
  return { el, instance };
}

function getInput(el: HTMLElement): HTMLInputElement {
  return el.querySelector('.arvo-tp__input') as HTMLInputElement;
}

function getTriggerBtn(el: HTMLElement): HTMLButtonElement {
  return el.querySelector('.arvo-tp__trigger-btn') as HTMLButtonElement;
}

function queryPopover(): HTMLElement | null {
  return document.querySelector('.arvo-tp__popover');
}

// Wait for the engine's enter/exit promise microtask to resolve. With
// matchMedia.matches=true the helpers resolve synchronously, but the
// engine's `await enter(...)` still wraps in a microtask.
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const mountedInstances: ArvoTimePicker[] = [];

function track<T extends ArvoTimePicker>(inst: T): T {
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

describe('ArvoTimePicker (JS) -- lifecycle / rendering', () => {
  it('renders the root .arvo-tp + field/input/actions/border in input mode', () => {
    const { el, instance } = mount();
    track(instance);
    expect(el.classList.contains('arvo-tp')).toBe(true);
    expect(el.querySelector('.arvo-tp__field')).not.toBeNull();
    expect(el.querySelector('.arvo-tp__input')).not.toBeNull();
    expect(el.querySelector('.arvo-tp__actions')).not.toBeNull();
    expect(el.querySelector('.arvo-tp__border')).not.toBeNull();
    expect(el.querySelector('.arvo-tp__trigger-btn')).not.toBeNull();
  });

  it('applies arvo-tp--lg by default', () => {
    const { el, instance } = mount();
    track(instance);
    expect(el.classList.contains('arvo-tp--lg')).toBe(true);
  });

  it('renders __lbl when label option is set', () => {
    const { el, instance } = mount({ label: 'Pick a time' });
    track(instance);
    expect(el.querySelector('.arvo-tp__lbl')).not.toBeNull();
  });

  it('anchor mode: does NOT render field/label/input/border', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const { el, instance } = mount({ anchor });
    track(instance);
    expect(el.querySelector('.arvo-tp__field')).toBeNull();
    expect(el.querySelector('.arvo-tp__input')).toBeNull();
    expect(el.querySelector('.arvo-tp__lbl')).toBeNull();
    expect(el.querySelector('.arvo-tp__border')).toBeNull();
    expect(el.classList.contains('arvo-tp--anchor-mode')).toBe(true);
  });

  it('does not render the popover when closed', () => {
    const { instance } = mount();
    track(instance);
    expect(queryPopover()).toBeNull();
  });

  it('destroy() cleans up the popover and removes ARIA from the anchor', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const { instance } = mount({ anchor });
    instance.destroy();
    expect(anchor.getAttribute('aria-haspopup')).toBeNull();
    expect(queryPopover()).toBeNull();
  });
});

describe('ArvoTimePicker (JS) -- modifiers', () => {
  it('applies --sm', () => {
    const { el, instance } = mount({ size: 'sm' });
    track(instance);
    expect(el.classList.contains('arvo-tp--sm')).toBe(true);
  });

  it('applies --full-width', () => {
    const { el, instance } = mount({ isFullWidth: true });
    track(instance);
    expect(el.classList.contains('arvo-tp--full-width')).toBe(true);
  });

  it('isDisabled emits .is-disabled + disables the input', () => {
    const { el, instance } = mount({ isDisabled: true });
    track(instance);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(getInput(el).disabled).toBe(true);
  });

  it('isReadOnly emits .is-readonly + marks input readOnly', () => {
    const { el, instance } = mount({ isReadOnly: true });
    track(instance);
    expect(el.classList.contains('is-readonly')).toBe(true);
    expect(getInput(el).readOnly).toBe(true);
  });
});

describe('ArvoTimePicker (JS) -- open / close paths', () => {
  it('opens via icon-button click', async () => {
    const { el, instance } = mount();
    track(instance);
    getTriggerBtn(el).click();
    await flush();
    expect(queryPopover()).not.toBeNull();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(true);
    expect(el.classList.contains('open')).toBe(true);
  });

  it('opens via Alt+Down on the input', async () => {
    const { el, instance } = mount();
    track(instance);
    getInput(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
    );
    await flush();
    expect(queryPopover()).not.toBeNull();
  });

  it('open() programmatic + close() programmatic', async () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    await flush();
    expect(queryPopover()).not.toBeNull();
    instance.close();
    await flush();
    // engine keeps the panel until exit animation completes; _isOpen is false
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(false);
  });

  it('toggle() flips open state', async () => {
    const { instance } = mount();
    track(instance);
    instance.toggle();
    await flush();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(true);
    instance.toggle();
    await flush();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(false);
  });

  it('open() is a no-op when isDisabled', async () => {
    const { instance } = mount({ isDisabled: true });
    track(instance);
    instance.open();
    await flush();
    expect(queryPopover()).toBeNull();
  });

  it('open() is a no-op when isReadOnly', async () => {
    const { instance } = mount({ isReadOnly: true });
    track(instance);
    instance.open();
    await flush();
    expect(queryPopover()).toBeNull();
  });
});

describe('ArvoTimePicker (JS) -- cancellable tp:open / tp:close (programmatic)', () => {
  it('onOpen returning false cancels programmatic open', () => {
    const onOpen = vi.fn(() => false as const);
    const { instance } = mount({ onOpen });
    track(instance);
    instance.open();
    expect(onOpen).toHaveBeenCalled();
    expect(queryPopover()).toBeNull();
  });

  it('tp:open preventDefault cancels programmatic open', () => {
    const { el, instance } = mount();
    track(instance);
    el.addEventListener('tp:open', (e) => e.preventDefault());
    instance.open();
    expect(queryPopover()).toBeNull();
  });

  it('onClose returning false vetoes programmatic close', async () => {
    const onClose = vi.fn(() => false as const);
    const { instance } = mount({ onClose });
    track(instance);
    instance.open();
    await flush();
    instance.close();
    expect(onClose).toHaveBeenCalled();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(true);
  });

  it('dispatches tp:open and tp:close on programmatic open/close', async () => {
    const tpOpen = vi.fn();
    const tpClose = vi.fn();
    const { el, instance } = mount();
    track(instance);
    el.addEventListener('tp:open', tpOpen);
    el.addEventListener('tp:close', tpClose);
    instance.open();
    await flush();
    expect(tpOpen).toHaveBeenCalled();
    instance.close();
    await flush();
    expect(tpClose).toHaveBeenCalled();
  });
});

describe('ArvoTimePicker (JS) -- engine-driven dismissal is silent', () => {
  it('hub-driven outside-click does NOT fire tp:close and ignores onClose veto', async () => {
    const onClose = vi.fn(() => false as const);
    const closeEvent = vi.fn();
    const { el, instance } = mount({ onClose });
    track(instance);
    el.addEventListener('tp:close', closeEvent);
    instance.open();
    await flush();

    // Simulate an outside pointerdown -- the real overlayHub installs a
    // capture-phase document listener that calls our engine's onClose,
    // which routes to the picker's _handleEngineClose (silent path).
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    await flush();

    expect(onClose).not.toHaveBeenCalled();
    expect(closeEvent).not.toHaveBeenCalled();
  });
});

describe('ArvoTimePicker (JS) -- selection', () => {
  it('clicking a time item commits the time and fires tp:change', async () => {
    const onChange = vi.fn();
    const tpChange = vi.fn();
    const { el, instance } = mount({ onChange });
    track(instance);
    el.addEventListener('tp:change', tpChange);
    instance.open();
    await flush();
    const item = document.querySelector('[data-testid="time-item"]') as HTMLElement;
    item.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: expect.objectContaining({ hours: 9, minutes: 0 }) }),
    );
    expect(tpChange).toHaveBeenCalled();
  });

  it('isAutoClose (default true) closes after selection', async () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    await flush();
    const item = document.querySelector('[data-testid="time-item"]') as HTMLElement;
    item.click();
    await flush();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(false);
  });

  it('isAutoClose=false keeps the popover open after selection', async () => {
    const { instance } = mount({ isAutoClose: false });
    track(instance);
    instance.open();
    await flush();
    const item = document.querySelector('[data-testid="time-item"]') as HTMLElement;
    item.click();
    await flush();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(true);
  });
});

describe('ArvoTimePicker (JS) -- value API', () => {
  it('value() returns the committed value', () => {
    const { instance } = mount({
      defaultValue: { hours: 9, minutes: 30 },
    });
    track(instance);
    const v = instance.value();
    expect(v).not.toBeNull();
    expect(v?.hours).toBe(9);
    expect(v?.minutes).toBe(30);
  });

  it('value(v) sets the committed value + dispatches tp:change', () => {
    const onChange = vi.fn();
    const { el, instance } = mount({ onChange });
    track(instance);
    const tpChange = vi.fn();
    el.addEventListener('tp:change', tpChange);
    instance.value({ hours: 14, minutes: 0 });
    const v = instance.value();
    expect(v?.hours).toBe(14);
    expect(onChange).toHaveBeenCalled();
    expect(tpChange).toHaveBeenCalled();
  });

  it('formattedValue() returns the formatted display string', () => {
    const { instance } = mount({
      defaultValue: { hours: 9, minutes: 30 },
    });
    track(instance);
    expect(typeof instance.formattedValue()).toBe('string');
    expect(instance.formattedValue().length).toBeGreaterThan(0);
  });

  it('clear() sets value to null', () => {
    const { instance } = mount({
      defaultValue: { hours: 9, minutes: 30 },
    });
    track(instance);
    instance.clear();
    expect(instance.value()).toBeNull();
  });
});

describe('ArvoTimePicker (JS) -- error / loading overrides', () => {
  it('setError(msg) shows an inline alert; setError(false) clears it', () => {
    const { el, instance } = mount();
    track(instance);
    instance.setError('Bad');
    expect(el.querySelector('.arvo-tp__err-msg')).not.toBeNull();
    instance.setError(false);
    expect(el.querySelector('.arvo-tp__err-msg')).toBeNull();
  });

  it('setLoading(true) hides the trigger and adds .loading', () => {
    const { el, instance } = mount();
    track(instance);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.querySelector('.arvo-tp__trigger-btn')).toBeNull();
  });
});

describe('ArvoTimePicker (JS) -- ARIA on triggers', () => {
  it('input is role=combobox with aria-haspopup=dialog + aria-controls=popoverId', () => {
    const { el, instance } = mount();
    track(instance);
    const input = getInput(el);
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('dialog');
    expect(input.getAttribute('aria-controls')).toMatch(/-popover$/);
  });

  it('input aria-expanded reflects open state', async () => {
    const { el, instance } = mount();
    track(instance);
    expect(getInput(el).getAttribute('aria-expanded')).toBe('false');
    instance.open();
    await flush();
    expect(getInput(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('trigger button carries aria-haspopup/controls/expanded', async () => {
    const { el, instance } = mount();
    track(instance);
    const btn = getTriggerBtn(el);
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-controls')).toMatch(/-popover$/);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    instance.open();
    await flush();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('anchor element: engine (via _renderDomAnchor) wires haspopup/controls/expanded on init', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const { instance } = mount({ anchor });
    track(instance);
    expect(anchor.getAttribute('aria-haspopup')).toBe('dialog');
    expect(anchor.getAttribute('aria-controls')).toMatch(/-popover$/);
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('ArvoTimePicker (JS) -- anchor interactions', () => {
  it('clicking the anchor opens the popover', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const { instance } = mount({ anchor });
    track(instance);
    anchor.click();
    await flush();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(true);
  });

  it('Alt+Down on the anchor opens the popover', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const { instance } = mount({ anchor });
    track(instance);
    anchor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
    );
    await flush();
    expect(instance['_isOpen' as keyof ArvoTimePicker]).toBe(true);
  });
});

describe('ArvoTimePicker (JS) -- focus trap', () => {
  it('the open popover has a [tabindex="0"] time item for the engine focus trap', async () => {
    const { instance } = mount();
    track(instance);
    instance.open();
    await flush();
    const popover = queryPopover();
    expect(popover).not.toBeNull();
    expect(popover?.querySelector('[tabindex="0"]')).not.toBeNull();
  });
});

describe('ArvoTimePicker (JS) -- popoverProps escape hatch', () => {
  it('baseline: omitting popoverProps does not crash', () => {
    const { instance } = mount({});
    track(instance);
    expect(instance).toBeInstanceOf(ArvoTimePicker);
  });

  it('popoverProps.width sets the popover element width style on open', async () => {
    const { instance } = mount({ popoverProps: { width: '200px' } });
    track(instance);
    instance.open();
    await flush();
    const popover = queryPopover() as HTMLElement;
    expect(popover).not.toBeNull();
    expect(popover.style.width).toBe('200px');
  });

  it('popoverProps.offset is accepted without throwing', () => {
    const { instance } = mount({ popoverProps: { offset: 12 } });
    track(instance);
    expect(instance).toBeInstanceOf(ArvoTimePicker);
  });
});

describe('ArvoTimePicker (JS) -- accessibility (axe-core)', () => {
  it('renders with zero axe violations when closed', async () => {
    const { el, instance } = mount({ label: 'Pick a time' });
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
    const { el, instance } = mount({ label: 'Pick a time' });
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
describe('ArvoTimePicker (JS) -- surface', () => {
  it('applies arvo-tp--surface-filled by default', () => {
    const { el } = mount();
    expect(el.classList.contains('arvo-tp--surface-filled')).toBe(true);
  });

  it('applies arvo-tp--surface-base when surface: "base"', () => {
    const { el } = mount({ surface: 'base' });
    expect(el.classList.contains('arvo-tp--surface-base')).toBe(true);
  });

  it('applies arvo-tp--surface-filled when surface: "filled"', () => {
    const { el } = mount({ surface: 'filled' });
    expect(el.classList.contains('arvo-tp--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    const { el } = mount({ surface: 'base' });
    expect(el.classList.contains('arvo-tp--surface-base')).toBe(true);
    expect(el.classList.contains('arvo-tp--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('TimePicker - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const { el } = mount({ label: 'Meeting time' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const { el } = mount({
      label: 'Meeting time',
      contextHelp: { content: 'Times are local to your browser.' },
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
