// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoCombobox } from './Combobox';
import type { ArvoComboboxOptions, ComboboxOptionData } from './Combobox';
import type { ListGroup } from '@arvo/core';
// ---------------------------------------------------------------------------
// Mocks -- the field composes the REAL ArvoOptionList (which builds on the
// OverlaySurface engine), so @arvo/core is NOT mocked; only jsdom gaps are
// polyfilled. MessageAlert is mocked so the inline error alert is assertable.
// ---------------------------------------------------------------------------

vi.mock('../MessageAlert/MessageAlert', () => {
  class ArvoMessageAlert {
    static defaultErrorMessage = 'Form field value is invalid';
    static initialize(element: HTMLElement | null, options: any = {}) {
      const el = element ?? document.createElement('div');
      el.className = `arvo-msg-alert arvo-msg-alert--${options.type ?? 'negative'}`;
      if (options.isInline) el.classList.add('arvo-msg-alert--inline');
      if (options.id) el.id = options.id;
      if (typeof options.message === 'string') el.textContent = options.message;
      el.setAttribute(
        'role',
        ['negative', 'warning', 'block'].includes(options.type ?? 'negative') ? 'alert' : 'status',
      );
      return new ArvoMessageAlert(el, options);
    }
    el: HTMLElement;
    private _opts: any;
    constructor(el: HTMLElement, opts: any) {
      this.el = el;
      this._opts = opts;
    }
    message(next?: any) {
      if (next === undefined) return this._opts.message;
      this._opts.message = next;
      this.el.textContent = next ?? '';
    }
    destroy() {
      /* noop */
    }
  }
  return { ArvoMessageAlert, ARVO_MSG_ALERT_DEFAULT_ERROR: 'Form field value is invalid' };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockItems: ComboboxOptionData[] = [
  { id: 'opt-1', label: 'Apple', value: 'apple' },
  { id: 'opt-2', label: 'Banana', value: 'banana' },
  { id: 'opt-3', label: 'Cherry', value: 'cherry', isDisabled: true },
  { id: 'opt-4', label: 'Date', value: 'date' },
];

const mockGroupedItems: ListGroup<ComboboxOptionData>[] = [
  {
    id: 'grp-fruits',
    label: 'Fruits',
    items: [
      { id: 'g1-1', label: 'Apple', value: 'apple' },
      { id: 'g1-2', label: 'Banana', value: 'banana' },
    ],
  },
  {
    id: 'grp-vegs',
    label: 'Vegetables',
    items: [
      { id: 'g2-1', label: 'Carrot', value: 'carrot' },
      { id: 'g2-2', label: 'Daikon', value: 'daikon' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let rootEl: HTMLDivElement;
let instance: ArvoCombobox;

function createCombobox(options: Partial<ArvoComboboxOptions> = {}): ArvoCombobox {
  instance = ArvoCombobox.initialize(rootEl, { items: mockItems, ...options });
  return instance;
}

function getInput(): HTMLInputElement {
  return rootEl.querySelector('input[role="combobox"]') as HTMLInputElement;
}

function getPanel(): HTMLElement | null {
  return document.body.querySelector('.arvo-opt-list');
}

function getListbox(): HTMLElement | null {
  return document.body.querySelector('[role="listbox"]');
}

function getOptions(): NodeListOf<Element> {
  return document.querySelectorAll('.arvo-opt-list__opt');
}

function getClearButton(): HTMLButtonElement | null {
  return rootEl.querySelector('.arvo-combobox__clear') as HTMLButtonElement | null;
}

function getChevronButton(): HTMLButtonElement {
  return rootEl.querySelector('.arvo-combobox__chevron') as HTMLButtonElement;
}

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
  // jsdom does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();

  rootEl = document.createElement('div');
  document.body.appendChild(rootEl);
});

afterEach(() => {
  try {
    instance?.destroy();
  } catch {
    /* already destroyed */
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- initialization', () => {
  it('static initialize() returns an ArvoCombobox instance', () => {
    expect(createCombobox()).toBeInstanceOf(ArvoCombobox);
  });

  it('root gets arvo-combobox + size class (default lg)', () => {
    createCombobox();
    expect(rootEl.classList.contains('arvo-combobox')).toBe(true);
    expect(rootEl.classList.contains('arvo-combobox--lg')).toBe(true);
  });

  it('root gets arvo-combobox--sm class when size="sm"', () => {
    createCombobox({ size: 'sm' });
    expect(rootEl.classList.contains('arvo-combobox--sm')).toBe(true);
  });

  it('input is created with role="combobox"', () => {
    createCombobox();
    const input = getInput();
    expect(input).not.toBeNull();
    expect(input.getAttribute('role')).toBe('combobox');
  });

  it('input has aria-autocomplete="list"', () => {
    createCombobox();
    expect(getInput().getAttribute('aria-autocomplete')).toBe('list');
  });

  it('the composed listbox panel is appended to document.body', () => {
    createCombobox();
    expect(getPanel()).not.toBeNull();
    expect(getListbox()).not.toBeNull();
  });

  it('creates a label element when label is provided', () => {
    createCombobox({ label: 'Fruit' });
    const label = rootEl.querySelector('label');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe('Fruit');
  });

  it('input has aria-labelledby when label is provided', () => {
    createCombobox({ label: 'Fruit' });
    expect(getInput().getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('input has aria-required when isRequired=true', () => {
    createCombobox({ isRequired: true });
    expect(getInput().getAttribute('aria-required')).toBe('true');
  });

  it('input has aria-invalid when isInvalid=true', () => {
    createCombobox({ isInvalid: true });
    expect(getInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('input has aria-busy when isLoading=true', () => {
    createCombobox({ isLoading: true });
    expect(getInput().getAttribute('aria-busy')).toBe('true');
  });

  it('shows placeholder when placeholder is set and no value', () => {
    createCombobox({ placeholder: 'Pick fruit' });
    expect(getInput().placeholder).toBe('Pick fruit');
  });

  it('displays the selected option label when initial value matches', () => {
    createCombobox({ value: 'apple' });
    expect(getInput().value).toBe('Apple');
  });

  it('inputValue option overrides selected label seed', () => {
    createCombobox({ value: 'apple', inputValue: 'app' });
    expect(getInput().value).toBe('app');
  });

  it('root gets has-value class when initial value is set', () => {
    createCombobox({ value: 'apple' });
    expect(rootEl.classList.contains('has-value')).toBe(true);
  });

  it('creates an inline alert when isInvalid + errorMsg + errorDisplay=inline', () => {
    createCombobox({ isInvalid: true, errorMsg: 'Required field' });
    const alert = rootEl.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('Required field');
  });

  it('root state classes reflect disabled / readonly / has-error / full-width', () => {
    createCombobox({ isDisabled: true, isInvalid: true, isFullWidth: true });
    expect(rootEl.classList.contains('is-disabled')).toBe(true);
    expect(rootEl.classList.contains('has-error')).toBe(true);
    expect(rootEl.classList.contains('arvo-combobox--full-width')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Open / Close
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- icon (__ico)', () => {
  it('renders __ico when icon option is provided', () => {
    createCombobox({ icon: 'search' });
    expect(rootEl.querySelector('.arvo-combobox__ico')).not.toBeNull();
  });

  it('__ico carries the correct o9con class', () => {
    createCombobox({ icon: 'search' });
    expect(rootEl.querySelector('.arvo-combobox__ico')!.classList.contains('o9con-search')).toBe(true);
  });

  it('__ico has aria-hidden="true"', () => {
    createCombobox({ icon: 'search' });
    expect(rootEl.querySelector('.arvo-combobox__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('__ico is the first child of __field', () => {
    createCombobox({ icon: 'search' });
    const field = rootEl.querySelector('.arvo-combobox__field')!;
    expect(field.firstElementChild?.classList.contains('arvo-combobox__ico')).toBe(true);
  });

  it('does NOT render __ico when icon option is omitted', () => {
    createCombobox();
    expect(rootEl.querySelector('.arvo-combobox__ico')).toBeNull();
  });

  it('chevron is rendered on the renamed __chevron slot, not legacy __ico', () => {
    createCombobox();
    expect(rootEl.querySelector('.arvo-combobox__chevron')).not.toBeNull();
    expect(rootEl.querySelector('.arvo-combobox__ico')).toBeNull();
  });

  it('mousedown on __ico focuses the inner input', () => {
    createCombobox({ icon: 'search' });
    const input = getInput();
    const focusSpy = vi.spyOn(input, 'focus');
    rootEl.querySelector('.arvo-combobox__ico')!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('icon() getter / setter / removal cycle', () => {
    const instance = createCombobox();
    expect(instance.icon()).toBeNull();
    instance.icon('search');
    expect(rootEl.querySelector('.arvo-combobox__ico')!.classList.contains('o9con-search')).toBe(true);
    instance.icon('user');
    expect(rootEl.querySelector('.arvo-combobox__ico')!.classList.contains('o9con-user')).toBe(true);
    instance.icon(null);
    expect(rootEl.querySelector('.arvo-combobox__ico')).toBeNull();
  });
});

describe('ArvoCombobox (JS) -- prefix (__prefix / __prefix-sep)', () => {
  it('renders __prefix and __prefix-sep when prefix is set', () => {
    createCombobox({ prefix: 'https://' });
    expect(rootEl.querySelector('.arvo-combobox__prefix')).not.toBeNull();
    expect(rootEl.querySelector('.arvo-combobox__prefix-sep')).not.toBeNull();
  });

  it('__prefix text matches the option value', () => {
    createCombobox({ prefix: '@' });
    expect(rootEl.querySelector('.arvo-combobox__prefix')!.textContent).toBe('@');
  });

  it('__prefix is aria-hidden', () => {
    createCombobox({ prefix: '@' });
    expect(rootEl.querySelector('.arvo-combobox__prefix')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds arvo-combobox--has-prefix marker class', () => {
    createCombobox({ prefix: '@' });
    expect(rootEl.classList.contains('arvo-combobox--has-prefix')).toBe(true);
  });

  it('omits __prefix and the marker class when prefix is empty', () => {
    createCombobox({ prefix: '' });
    expect(rootEl.querySelector('.arvo-combobox__prefix')).toBeNull();
    expect(rootEl.querySelector('.arvo-combobox__prefix-sep')).toBeNull();
    expect(rootEl.classList.contains('arvo-combobox--has-prefix')).toBe(false);
  });

  it('__prefix sits between __ico and __input', () => {
    createCombobox({ icon: 'search', prefix: '@' });
    const field = rootEl.querySelector('.arvo-combobox__field')!;
    const children = Array.from(field.children);
    const icoIdx = children.findIndex(c => c.classList.contains('arvo-combobox__ico'));
    const prefixIdx = children.findIndex(c => c.classList.contains('arvo-combobox__prefix'));
    const sepIdx = children.findIndex(c => c.classList.contains('arvo-combobox__prefix-sep'));
    const inputIdx = children.findIndex(c => c.classList.contains('arvo-combobox__input'));
    expect(icoIdx).toBeLessThan(prefixIdx);
    expect(prefixIdx).toBeLessThan(sepIdx);
    expect(sepIdx).toBeLessThan(inputIdx);
  });

  it('mousedown on __prefix focuses the inner input', () => {
    createCombobox({ prefix: '@' });
    const input = getInput();
    const focusSpy = vi.spyOn(input, 'focus');
    rootEl.querySelector('.arvo-combobox__prefix')!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('connects a tooltip on __prefix when prefixTooltip is set', () => {
    expect(() => createCombobox({ prefix: '@', prefixTooltip: 'Handle' })).not.toThrow();
    expect(rootEl.querySelector('.arvo-combobox__prefix')).not.toBeNull();
  });

  it('prefix() getter / setter / removal cycle', () => {
    const instance = createCombobox();
    expect(instance.prefix()).toBeNull();
    instance.prefix('@');
    expect(rootEl.querySelector('.arvo-combobox__prefix')!.textContent).toBe('@');
    expect(rootEl.classList.contains('arvo-combobox--has-prefix')).toBe(true);
    instance.prefix(null);
    expect(rootEl.querySelector('.arvo-combobox__prefix')).toBeNull();
    expect(rootEl.classList.contains('arvo-combobox--has-prefix')).toBe(false);
  });
});

describe('ArvoCombobox (JS) -- open/close', () => {
  it('open() opens the panel + adds open class', () => {
    createCombobox();
    instance.open();
    expect(instance.isOpen()).toBe(true);
    expect(rootEl.classList.contains('open')).toBe(true);
  });

  it('close() closes the panel + removes open class', () => {
    createCombobox();
    instance.open();
    instance.close();
    expect(instance.isOpen()).toBe(false);
    expect(rootEl.classList.contains('open')).toBe(false);
  });

  it('toggle() flips open state; toggle(force) forces it', () => {
    createCombobox();
    instance.toggle();
    expect(instance.isOpen()).toBe(true);
    instance.toggle();
    expect(instance.isOpen()).toBe(false);
    instance.toggle(true);
    expect(instance.isOpen()).toBe(true);
    instance.toggle(false);
    expect(instance.isOpen()).toBe(false);
  });

  it('chevron click toggles open/close', () => {
    createCombobox();
    getChevronButton().click();
    expect(instance.isOpen()).toBe(true);
    getChevronButton().click();
    expect(instance.isOpen()).toBe(false);
  });

  // Regression: clicking the chevron while open must produce a SINGLE,
  // atomic close. The chevron, clear button, and leading icon are
  // siblings of the inner <input role="combobox"> but live inside the
  // field. The hub uses the field as its trigger (so chevron clicks
  // are correctly "inside" the trigger boundary); without that wiring,
  // the hub's mousedown handler would close the panel between
  // mousedown and click, and the chevron's click handler (computed
  // on the post-close state) would re-open it -- a visible flicker
  // with the caret animation partially reversing.
  it('chevron mousedown-then-click while open closes exactly once (no reopen flicker)', () => {
    const onOpenChange = vi.fn();
    createCombobox({ defaultOpen: true, onOpenChange });
    expect(instance.isOpen()).toBe(true);
    onOpenChange.mockClear();
    const chevron = getChevronButton();
    chevron.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    chevron.click();
    expect(instance.isOpen()).toBe(false);
    // Exactly one open-state transition: false. No spurious true/false
    // pair from a close-then-reopen race.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('typing opens the panel', () => {
    createCombobox();
    const input = getInput();
    input.value = 'A';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(instance.isOpen()).toBe(true);
  });

  it('ArrowDown opens the panel when closed', () => {
    createCombobox();
    getInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(instance.isOpen()).toBe(true);
  });

  it('ArrowUp opens the panel when closed', () => {
    createCombobox();
    getInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(instance.isOpen()).toBe(true);
  });

  it('does not open when disabled', () => {
    createCombobox({ isDisabled: true });
    getChevronButton().click();
    expect(instance.isOpen()).toBe(false);
  });

  it('does not open when readonly', () => {
    createCombobox({ isReadOnly: true });
    getChevronButton().click();
    expect(instance.isOpen()).toBe(false);
  });

  it('does not open when loading', () => {
    createCombobox({ isLoading: true });
    getChevronButton().click();
    expect(instance.isOpen()).toBe(false);
  });

  it('opens on init when defaultOpen=true', () => {
    createCombobox({ defaultOpen: true });
    expect(instance.isOpen()).toBe(true);
  });

  it('opens on init when isOpen=true', () => {
    createCombobox({ isOpen: true });
    expect(instance.isOpen()).toBe(true);
  });

  it('does not fire onOpenChange for the silent initial open', () => {
    const onOpenChange = vi.fn();
    createCombobox({ defaultOpen: true, onOpenChange });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('onOpen fires when opening; returning false prevents opening', () => {
    const onOpen = vi.fn();
    createCombobox({ onOpen });
    instance.open();
    expect(onOpen).toHaveBeenCalledOnce();
    instance.close();

    const veto = vi.fn(() => false as const);
    instance.destroy();
    createCombobox({ onOpen: veto });
    instance.open();
    expect(rootEl.classList.contains('open')).toBe(false);
  });

  it('onClose fires when closing; returning false prevents closing', () => {
    const onClose = vi.fn();
    createCombobox({ onClose });
    instance.open();
    instance.close();
    expect(onClose).toHaveBeenCalledOnce();

    const veto = vi.fn(() => false as const);
    instance.destroy();
    createCombobox({ onClose: veto });
    instance.open();
    instance.close();
    expect(rootEl.classList.contains('open')).toBe(true);
  });

  it('onOpenChange fires with true/false', () => {
    const onOpenChange = vi.fn();
    createCombobox({ onOpenChange });
    instance.open();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    onOpenChange.mockClear();
    instance.close();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Seed options (defaultValue / value / defaultOpen / isOpen)
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- seed options', () => {
  it('seeds value from defaultValue when value is omitted', () => {
    createCombobox({ defaultValue: 'banana' });
    expect(instance.value()).toBe('banana');
    expect(getInput().value).toBe('Banana');
  });

  it('value wins over defaultValue when both provided', () => {
    createCombobox({ value: 'date', defaultValue: 'apple' });
    expect(instance.value()).toBe('date');
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- filtering', () => {
  it('filters options as user types', () => {
    createCombobox();
    const input = getInput();
    input.value = 'ban';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const opts = getOptions();
    expect(opts.length).toBe(1);
    expect(opts[0].textContent).toContain('Banana');
  });

  it('shows the empty state when no matches', () => {
    createCombobox();
    const input = getInput();
    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.arvo-opt-list__empty')).toBeTruthy();
  });

  it('uses a custom filterFn when provided', () => {
    const customFilter = vi.fn(
      (item: ComboboxOptionData, query: string) =>
        item.label.toLowerCase().startsWith(query.toLowerCase()),
    );
    createCombobox({ filterFn: customFilter });
    const input = getInput();
    input.value = 'A';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(customFilter).toHaveBeenCalled();
  });

  it('onInputChange fires per keystroke', () => {
    const onInputChange = vi.fn();
    createCombobox({ onInputChange });
    const input = getInput();
    input.value = 'app';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInputChange).toHaveBeenCalledWith('app');
  });

  it('dispatches combobox:input on typing', () => {
    const handler = vi.fn();
    createCombobox();
    rootEl.addEventListener('combobox:input', handler);
    const input = getInput();
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handler).toHaveBeenCalled();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ value: 'a' });
  });

  it('shows the full list (not a single-option filter) when the panel opens on a pre-selected value', () => {
    // Input text seeded from `value` / `defaultValue` matches the selected
    // option's label, so opening the menu renders the unfiltered list
    // instead of treating that text as a filter query.
    createCombobox({ defaultValue: 'apple', defaultOpen: true });
    expect(getInput().value).toBe('Apple');
    expect(getOptions().length).toBe(mockItems.length);
  });

  it('shows the full list when the menu is reopened after a click selection', () => {
    createCombobox({ defaultOpen: true });
    (getOptions()[0] as HTMLElement).click();
    expect(getInput().value).toBe('Apple');
    instance.open();
    expect(getOptions().length).toBe(mockItems.length);
  });

  it('still filters once the user edits the text away from the selected label', () => {
    createCombobox({ defaultValue: 'apple', defaultOpen: true });
    expect(getOptions().length).toBe(mockItems.length);
    const input = getInput();
    input.value = 'ban';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const opts = getOptions();
    expect(opts.length).toBe(1);
    expect(opts[0].textContent).toContain('Banana');
  });

  it('still filters when controlled `inputValue` differs from the selected label', () => {
    createCombobox({ value: 'apple', inputValue: 'ban', defaultOpen: true });
    const opts = getOptions();
    expect(opts.length).toBe(1);
    expect(opts[0].textContent).toContain('Banana');
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- selection', () => {
  it('selects option on click', () => {
    const onChange = vi.fn();
    createCombobox({ defaultOpen: true, onChange });
    (getOptions()[0] as HTMLElement).click();
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(mockItems[0], 0);
    expect(getInput().value).toBe('Apple');
  });

  it('closes after selection when closeOnSelect=true (default)', () => {
    createCombobox({ defaultOpen: true });
    (getOptions()[0] as HTMLElement).click();
    expect(instance.isOpen()).toBe(false);
  });

  it('keeps panel open when closeOnSelect=false', () => {
    createCombobox({ defaultOpen: true, closeOnSelect: false });
    (getOptions()[0] as HTMLElement).click();
    expect(instance.isOpen()).toBe(true);
  });

  it('onChange returning false keeps the panel open', () => {
    const onChange = vi.fn(() => false as const);
    createCombobox({ defaultOpen: true, onChange, closeOnSelect: true });
    (getOptions()[0] as HTMLElement).click();
    expect(instance.isOpen()).toBe(true);
  });

  it('does not call onChange for disabled options', () => {
    const onChange = vi.fn();
    createCombobox({ defaultOpen: true, onChange });
    (getOptions()[2] as HTMLElement).click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dispatches combobox:change on selection with detail', () => {
    const handler = vi.fn();
    createCombobox({ defaultOpen: true });
    rootEl.addEventListener('combobox:change', handler);
    (getOptions()[0] as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      item: mockItems[0],
      index: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// value() / inputValue() / clear() / updateItems()
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- value()', () => {
  it('value() returns null by default', () => {
    createCombobox();
    expect(instance.value()).toBeNull();
  });

  it('value(newVal) sets the value + updates input text + has-value', () => {
    createCombobox();
    instance.value('banana');
    expect(instance.value()).toBe('banana');
    expect(getInput().value).toBe('Banana');
    expect(rootEl.classList.contains('has-value')).toBe(true);
  });

  it('value(newVal) dispatches combobox:change when item found', () => {
    const handler = vi.fn();
    createCombobox();
    rootEl.addEventListener('combobox:change', handler);
    instance.value('banana');
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      item: mockItems[1],
      index: 1,
    });
  });
});

describe('ArvoCombobox (JS) -- inputValue()', () => {
  it('inputValue() returns current filter text', () => {
    createCombobox({ value: 'apple' });
    expect(instance.inputValue()).toBe('Apple');
  });

  it('inputValue(next) sets the input text', () => {
    createCombobox();
    instance.inputValue('foo');
    expect(getInput().value).toBe('foo');
    expect(instance.inputValue()).toBe('foo');
  });
});

describe('ArvoCombobox (JS) -- clear()', () => {
  it('clear() resets value + input text + dispatches combobox:clear', () => {
    const handler = vi.fn();
    createCombobox({ value: 'apple' });
    rootEl.addEventListener('combobox:clear', handler);
    instance.clear();
    expect(instance.value()).toBeNull();
    expect(getInput().value).toBe('');
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      previousValue: 'apple',
    });
  });

  it('clear button click triggers clear()', () => {
    const onClear = vi.fn();
    createCombobox({ value: 'apple', isClearable: true, onClear });
    const clear = getClearButton();
    expect(clear).not.toBeNull();
    clear!.click();
    expect(instance.value()).toBeNull();
    expect(onClear).toHaveBeenCalledWith({ previousValue: 'apple' });
  });
});

describe('ArvoCombobox (JS) -- updateItems()', () => {
  it('updateItems() replaces the option list', () => {
    createCombobox({ defaultOpen: true });
    const newItems: ComboboxOptionData[] = [
      { id: 'n-1', label: 'Apricot', value: 'apricot' },
      { id: 'n-2', label: 'Blueberry', value: 'blueberry' },
    ];
    instance.updateItems(newItems);
    expect(getOptions().length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// disabled() / setError() / setLoading() / width() / focus()
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- disabled()', () => {
  it('disabled() getter + setter toggles state and ARIA', () => {
    createCombobox();
    expect(instance.disabled()).toBe(false);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
    expect(getInput().disabled).toBe(true);
    expect(getInput().getAttribute('aria-disabled')).toBe('true');
    instance.disabled(false);
    expect(instance.disabled()).toBe(false);
    expect(getInput().disabled).toBe(false);
    expect(getInput().hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabling while open closes the panel', () => {
    createCombobox({ defaultOpen: true });
    expect(instance.isOpen()).toBe(true);
    instance.disabled(true);
    expect(instance.isOpen()).toBe(false);
  });
});

describe('ArvoCombobox (JS) -- setError()', () => {
  it('setError(msg) adds has-error + aria-invalid + inline alert', () => {
    createCombobox();
    instance.setError('Required');
    expect(rootEl.classList.contains('has-error')).toBe(true);
    expect(getInput().getAttribute('aria-invalid')).toBe('true');
    expect(rootEl.querySelector('[role="alert"]')?.textContent).toBe('Required');
  });

  it('setError(false) clears state', () => {
    createCombobox({ isInvalid: true, errorMsg: 'Required' });
    instance.setError(false);
    expect(rootEl.classList.contains('has-error')).toBe(false);
    expect(getInput().hasAttribute('aria-invalid')).toBe(false);
  });
});

describe('ArvoCombobox (JS) -- setLoading()', () => {
  it('setLoading(true) adds loading class + aria-busy', () => {
    createCombobox();
    instance.setLoading(true);
    expect(rootEl.classList.contains('loading')).toBe(true);
    expect(getInput().getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) clears loading state', () => {
    createCombobox();
    instance.setLoading(true);
    instance.setLoading(false);
    expect(rootEl.classList.contains('loading')).toBe(false);
    expect(getInput().hasAttribute('aria-busy')).toBe(false);
  });
});

describe('ArvoCombobox (JS) -- width()', () => {
  it('sets --arvo-form-input-width when width is provided', () => {
    createCombobox({ width: '200px' });
    expect(rootEl.style.getPropertyValue('--arvo-form-input-width')).toBe('200px');
  });

  it('isFullWidth wins over width', () => {
    createCombobox({ width: '200px', isFullWidth: true });
    expect(rootEl.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('width() getter + setter', () => {
    createCombobox({ width: '250px' });
    expect(instance.width()).toBe('250px');
    instance.width('350px');
    expect(rootEl.style.getPropertyValue('--arvo-form-input-width')).toBe('350px');
    expect(instance.width()).toBe('350px');
  });
});

describe('ArvoCombobox (JS) -- focus()', () => {
  it('focus() focuses the input', () => {
    createCombobox();
    instance.focus();
    expect(document.activeElement).toBe(getInput());
  });
});

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- groups', () => {
  it('renders group headers', () => {
    createCombobox({ items: mockGroupedItems, defaultOpen: true });
    const headers = document.querySelectorAll('.arvo-opt-list__grp-hdr');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toBe('Fruits');
    expect(headers[1].textContent).toBe('Vegetables');
  });

  it('renders dividers between groups when hasGroupDividers=true (default)', () => {
    createCombobox({ items: mockGroupedItems, defaultOpen: true });
    expect(document.querySelectorAll('[role="separator"]').length).toBeGreaterThanOrEqual(1);
  });

  it('no dividers when hasGroupDividers=false', () => {
    createCombobox({ items: mockGroupedItems, defaultOpen: true, hasGroupDividers: false });
    expect(document.querySelectorAll('.arvo-opt-list__divider').length).toBe(0);
  });

  it('renders all grouped options', () => {
    createCombobox({ items: mockGroupedItems, defaultOpen: true });
    expect(getOptions().length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- keyboard', () => {
  it('Escape closes the panel when open', () => {
    createCombobox({ defaultOpen: true });
    getInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(instance.isOpen()).toBe(false);
  });

  it('Escape when closed clears the input text', () => {
    createCombobox({ value: 'apple' });
    const input = getInput();
    expect(input.value).toBe('Apple');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(input.value).toBe('');
  });

  it('Enter on the highlighted option selects it', () => {
    const onChange = vi.fn();
    createCombobox({ defaultOpen: true, onChange });
    getInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onChange).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// maxHeight + optionListProps bag
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- optionListProps', () => {
  // The maxHeight option is forwarded to the composed ArvoOptionList. We do
  // NOT assert the --arvo-overlay-max-height CSS variable here because the
  // real engine's positioner overwrites it with a viewport-derived clamp in
  // jsdom (whose layout returns the full document height). The React twin's
  // test (running against a mocked engine) covers the prop-flow guarantee.

  it('forwards optionListProps (emptyConfig) to the composed list', () => {
    createCombobox({
      items: [],
      defaultOpen: true,
      optionListProps: { emptyConfig: { title: 'Nothing here' } },
    });
    expect(document.querySelector('.arvo-opt-list__empty')).toBeTruthy();
    expect(
      document.querySelector('.arvo-opt-list__empty .arvo-empty__title')?.textContent,
    ).toBe('Nothing here');
  });
});

// ---------------------------------------------------------------------------
// ARIA
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- ARIA', () => {
  it('input has aria-haspopup=listbox (written by the engine)', () => {
    createCombobox();
    expect(getInput().getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('aria-expanded reflects the open state', () => {
    createCombobox();
    expect(getInput().getAttribute('aria-expanded')).toBe('false');
    instance.open();
    expect(getInput().getAttribute('aria-expanded')).toBe('true');
  });

  it('aria-controls points to the listbox id', () => {
    createCombobox();
    instance.open();
    const listbox = getListbox()!;
    expect(getInput().getAttribute('aria-controls')).toBe(listbox.id);
  });

  it('aria-activedescendant is set on the input when an option is highlighted', () => {
    createCombobox();
    instance.open();
    expect(getInput().getAttribute('aria-activedescendant')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- destroy()', () => {
  it('destroy() tears down the composed list, removes panel, restores root', () => {
    createCombobox();
    expect(getPanel()).not.toBeNull();
    instance.destroy();
    expect(getPanel()).toBeNull();
    expect(rootEl.children.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe)
// ---------------------------------------------------------------------------

describe('ArvoCombobox (JS) -- accessibility', () => {
  it('default render has zero axe violations', async () => {
    createCombobox({ label: 'Fruit' });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('render with selected value has zero axe violations', async () => {
    createCombobox({ label: 'Fruit', value: 'apple' });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('disabled render has zero axe violations', async () => {
    createCombobox({ label: 'Fruit', isDisabled: true });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('inline error render has zero axe violations', async () => {
    createCombobox({
      label: 'Fruit',
      isInvalid: true,
      errorMsg: 'Required',
      errorDisplay: 'inline',
    });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('open panel render has zero axe violations', async () => {
    createCombobox({ label: 'Fruit', defaultOpen: true });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Surface (filled default | base)
// ---------------------------------------------------------------------------
describe('ArvoCombobox (JS) -- surface', () => {
  it('applies arvo-combobox--surface-filled by default', () => {
    createCombobox();
    expect(rootEl.classList.contains('arvo-combobox--surface-filled')).toBe(true);
  });

  it('applies arvo-combobox--surface-base when surface: "base"', () => {
    createCombobox({ surface: 'base' });
    expect(rootEl.classList.contains('arvo-combobox--surface-base')).toBe(true);
  });

  it('applies arvo-combobox--surface-filled when surface: "filled"', () => {
    createCombobox({ surface: 'filled' });
    expect(rootEl.classList.contains('arvo-combobox--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    createCombobox({ surface: 'base' });
    expect(rootEl.classList.contains('arvo-combobox--surface-base')).toBe(true);
    expect(rootEl.classList.contains('arvo-combobox--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Combobox - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoCombobox(el, { items: [], label: 'City' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoCombobox(el, {
      items: [],
      label: 'City',
      contextHelp: { content: 'Type to filter options.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoCombobox(el, { items: [], contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
