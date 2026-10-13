// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoSelect } from './Select';
import type { ArvoSelectOptions, SelectOptionData } from './Select';
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

const mockItems: SelectOptionData[] = [
  { id: 'opt-1', label: 'Option 1', value: 'val-1' },
  { id: 'opt-2', label: 'Option 2', value: 'val-2' },
  { id: 'opt-3', label: 'Option 3', value: 'val-3', isDisabled: true },
];

const mockGroupedItems: ListGroup<SelectOptionData>[] = [
  {
    id: 'group-1',
    label: 'Group A',
    items: [
      { id: 'g1-1', label: 'Item A1', value: 'a1' },
      { id: 'g1-2', label: 'Item A2', value: 'a2' },
    ],
  },
  {
    id: 'group-2',
    label: 'Group B',
    items: [
      { id: 'g2-1', label: 'Item B1', value: 'b1' },
      { id: 'g2-2', label: 'Item B2', value: 'b2', isDisabled: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let rootEl: HTMLDivElement;
let instance: ArvoSelect;

function createSelect(options: Partial<ArvoSelectOptions> = {}): ArvoSelect {
  instance = ArvoSelect.initialize(rootEl, { items: mockItems, ...options });
  return instance;
}

function getTrigger(): HTMLElement {
  return rootEl.querySelector('[role="combobox"]') as HTMLElement;
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

describe('ArvoSelect (JS) -- initialization', () => {
  it('static initialize() returns an ArvoSelect instance', () => {
    expect(createSelect()).toBeInstanceOf(ArvoSelect);
  });

  it('root element gets arvo-sel + size class (default lg)', () => {
    createSelect();
    expect(rootEl.classList.contains('arvo-sel')).toBe(true);
    expect(rootEl.classList.contains('arvo-sel--lg')).toBe(true);
  });

  it('root element gets sm size class when size="sm"', () => {
    createSelect({ size: 'sm' });
    expect(rootEl.classList.contains('arvo-sel--sm')).toBe(true);
  });

  it('trigger (__field) has role="combobox"', () => {
    createSelect();
    expect(getTrigger().classList.contains('arvo-sel__field')).toBe(true);
    expect(getTrigger().getAttribute('role')).toBe('combobox');
  });

  it('trigger has aria-haspopup="listbox" (wired by the composed list)', () => {
    createSelect();
    expect(getTrigger().getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('trigger has aria-expanded="false" on init', () => {
    createSelect();
    expect(getTrigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('the composed listbox panel is appended to document.body', () => {
    createSelect();
    expect(getPanel()).not.toBeNull();
    expect(getListbox()).not.toBeNull();
  });

  it('hidden input is created inside the root element', () => {
    createSelect();
    expect(rootEl.querySelector('input[type="hidden"]')).not.toBeNull();
  });

  it('chevron renders on the renamed __chevron slot (post form-input-affix migration)', () => {
    createSelect();
    expect(rootEl.querySelector('.arvo-sel__chevron')).not.toBeNull();
    // __ico is reserved for the new leading-icon slot and must NOT be
    // rendered when no `icon` option is passed.
    expect(rootEl.querySelector('.arvo-sel__ico')).toBeNull();
  });

  it('creates a label element when label is provided', () => {
    createSelect({ label: 'My Label' });
    const label = rootEl.querySelector('label');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe('My Label');
  });

  it('trigger has aria-labelledby when label is provided', () => {
    createSelect({ label: 'My Label' });
    expect(getTrigger().getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('trigger has aria-required when isRequired=true', () => {
    createSelect({ isRequired: true });
    expect(getTrigger().getAttribute('aria-required')).toBe('true');
  });

  it('trigger has aria-invalid when isInvalid=true', () => {
    createSelect({ isInvalid: true });
    expect(getTrigger().getAttribute('aria-invalid')).toBe('true');
  });

  it('trigger has aria-busy when isLoading=true', () => {
    createSelect({ isLoading: true });
    expect(getTrigger().getAttribute('aria-busy')).toBe('true');
  });

  it('shows placeholder span when placeholder is set and no value', () => {
    createSelect({ placeholder: 'Pick one' });
    const placeholder = getTrigger().querySelector('.arvo-sel__placeholder');
    expect(placeholder?.textContent).toBe('Pick one');
  });

  it('displays the selected label when initial value matches an item', () => {
    createSelect({ value: 'val-1' });
    expect(getTrigger().textContent).toContain('Option 1');
  });

  it('root gets has-value class when initial value is set', () => {
    createSelect({ value: 'val-1' });
    expect(rootEl.classList.contains('has-value')).toBe(true);
  });

  it('creates an inline alert when isInvalid + errorMsg', () => {
    createSelect({ isInvalid: true, errorMsg: 'Required field' });
    const alert = rootEl.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('Required field');
  });

  it('root state classes reflect disabled / readonly / has-error / filterable / full-width', () => {
    createSelect({ isDisabled: true, isReadOnly: false, isInvalid: true, search: true, isFullWidth: true });
    expect(rootEl.classList.contains('is-disabled')).toBe(true);
    expect(rootEl.classList.contains('has-error')).toBe(true);
    expect(rootEl.classList.contains('arvo-sel--filterable')).toBe(true);
    expect(rootEl.classList.contains('arvo-sel--full-width')).toBe(true);
  });

  it('trigger tabindex is -1 when disabled, 0 otherwise', () => {
    createSelect({ isDisabled: true });
    expect(getTrigger().getAttribute('tabindex')).toBe('-1');
    instance.destroy();
    createSelect();
    expect(getTrigger().getAttribute('tabindex')).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// Open / Close
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- icon (__ico)', () => {
  it('renders __ico when icon option is provided', () => {
    createSelect({ icon: 'search' });
    expect(rootEl.querySelector('.arvo-sel__ico')).not.toBeNull();
  });

  it('__ico carries the correct o9con class', () => {
    createSelect({ icon: 'search' });
    expect(rootEl.querySelector('.arvo-sel__ico')!.classList.contains('o9con-search')).toBe(true);
  });

  it('__ico has aria-hidden="true"', () => {
    createSelect({ icon: 'search' });
    expect(rootEl.querySelector('.arvo-sel__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('__ico is the first child of __field', () => {
    createSelect({ icon: 'search' });
    const field = getTrigger();
    expect(field.firstElementChild?.classList.contains('arvo-sel__ico')).toBe(true);
  });

  it('does NOT render __ico when icon option is omitted', () => {
    createSelect();
    expect(rootEl.querySelector('.arvo-sel__ico')).toBeNull();
  });

  it('icon() getter / setter / removal cycle', () => {
    const instance = createSelect();
    expect(instance.icon()).toBeNull();
    instance.icon('search');
    expect(rootEl.querySelector('.arvo-sel__ico')!.classList.contains('o9con-search')).toBe(true);
    instance.icon('user');
    expect(rootEl.querySelector('.arvo-sel__ico')!.classList.contains('o9con-user')).toBe(true);
    instance.icon(null);
    expect(rootEl.querySelector('.arvo-sel__ico')).toBeNull();
    expect(instance.icon()).toBeNull();
  });
});

describe('ArvoSelect (JS) -- open/close', () => {
  it('open() adds the open class + sets aria-expanded', () => {
    createSelect();
    instance.open();
    expect(instance.isOpen()).toBe(true);
    expect(rootEl.classList.contains('open')).toBe(true);
    expect(getTrigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('close() removes the open class + resets aria-expanded', () => {
    createSelect();
    instance.open();
    instance.close();
    expect(instance.isOpen()).toBe(false);
    expect(rootEl.classList.contains('open')).toBe(false);
    expect(getTrigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('open() does nothing when already open', () => {
    createSelect();
    instance.open();
    expect(() => instance.open()).not.toThrow();
    expect(rootEl.classList.contains('open')).toBe(true);
  });

  it('close() does nothing when already closed', () => {
    createSelect();
    expect(() => instance.close()).not.toThrow();
  });

  it('toggle() flips open state; toggle(force) forces it', () => {
    createSelect();
    instance.toggle();
    expect(instance.isOpen()).toBe(true);
    instance.toggle();
    expect(instance.isOpen()).toBe(false);
    instance.toggle(true);
    expect(instance.isOpen()).toBe(true);
    instance.toggle(false);
    expect(instance.isOpen()).toBe(false);
  });

  it('field click toggles open/close', () => {
    createSelect();
    getTrigger().click();
    expect(instance.isOpen()).toBe(true);
    getTrigger().click();
    expect(instance.isOpen()).toBe(false);
  });

  it('onOpen fires when opening; returning false prevents opening', () => {
    const onOpen = vi.fn();
    createSelect({ onOpen });
    instance.open();
    expect(onOpen).toHaveBeenCalledOnce();
    instance.close();

    const veto = vi.fn(() => false as const);
    instance.destroy();
    createSelect({ onOpen: veto });
    instance.open();
    expect(rootEl.classList.contains('open')).toBe(false);
  });

  it('onClose fires when closing; returning false prevents closing', () => {
    const onClose = vi.fn();
    createSelect({ onClose });
    instance.open();
    instance.close();
    expect(onClose).toHaveBeenCalledOnce();

    const veto = vi.fn(() => false as const);
    instance.destroy();
    createSelect({ onClose: veto });
    instance.open();
    instance.close();
    expect(rootEl.classList.contains('open')).toBe(true);
  });

  it('onOpenChange fires with true/false', () => {
    const onOpenChange = vi.fn();
    createSelect({ onOpenChange });
    instance.open();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    onOpenChange.mockClear();
    instance.close();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Uncontrolled / controlled seed options (parity with React)
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- seed options', () => {
  it('seeds value from defaultValue when value is omitted', () => {
    createSelect({ defaultValue: 'val-1' });
    expect(instance.value()).toBe('val-1');
  });

  it('value wins over defaultValue when both provided', () => {
    createSelect({ value: 'val-2', defaultValue: 'val-1' });
    expect(instance.value()).toBe('val-2');
  });

  it('stays closed by default', () => {
    createSelect();
    expect(instance.isOpen()).toBe(false);
  });

  it('opens on init when defaultOpen is true', () => {
    createSelect({ defaultOpen: true });
    expect(instance.isOpen()).toBe(true);
    expect(rootEl.classList.contains('open')).toBe(true);
  });

  it('opens on init when isOpen is true', () => {
    createSelect({ isOpen: true });
    expect(instance.isOpen()).toBe(true);
  });

  it('does not fire onOpenChange for the silent initial open', () => {
    const onOpenChange = vi.fn();
    createSelect({ defaultOpen: true, onOpenChange });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// value() getter / setter
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- value()', () => {
  it('value() returns null by default', () => {
    createSelect();
    expect(instance.value()).toBeNull();
  });

  it('value(newVal) sets the value + updates display + has-value', () => {
    createSelect();
    instance.value('val-2');
    expect(instance.value()).toBe('val-2');
    expect(getTrigger().textContent).toContain('Option 2');
    expect(rootEl.classList.contains('has-value')).toBe(true);
  });

  it('value(newVal) dispatches sel:change when item found', () => {
    const handler = vi.fn();
    createSelect();
    rootEl.addEventListener('sel:change', handler);
    instance.value('val-2');
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      item: mockItems[1],
      index: 1,
    });
  });

  it('value(null) clears selection, removes has-value, dispatches null change', () => {
    const handler = vi.fn();
    createSelect({ value: 'val-1', placeholder: 'Pick one' });
    rootEl.addEventListener('sel:change', handler);
    instance.value(null);
    expect(rootEl.classList.contains('has-value')).toBe(false);
    expect(getTrigger().querySelector('.arvo-sel__placeholder')?.textContent).toBe('Pick one');
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.item).toBeNull();
    expect(detail.index).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Width
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- width', () => {
  it('sets --arvo-form-input-width when width is provided', () => {
    createSelect({ width: '200px' });
    expect(rootEl.style.getPropertyValue('--arvo-form-input-width')).toBe('200px');
  });

  it('isFullWidth wins over width', () => {
    createSelect({ width: '200px', isFullWidth: true });
    expect(rootEl.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('width() getter + setter', () => {
    createSelect({ width: '250px' });
    expect(instance.width()).toBe('250px');
    instance.width('350px');
    expect(rootEl.style.getPropertyValue('--arvo-form-input-width')).toBe('350px');
    expect(instance.width()).toBe('350px');
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- disabled()', () => {
  it('disabled() getter + setter toggles state and ARIA', () => {
    createSelect();
    expect(instance.disabled()).toBe(false);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
    expect(rootEl.classList.contains('is-disabled')).toBe(true);
    expect(getTrigger().getAttribute('aria-disabled')).toBe('true');
    expect(getTrigger().getAttribute('tabindex')).toBe('-1');
    instance.disabled(false);
    expect(getTrigger().getAttribute('aria-disabled')).toBeNull();
    expect(getTrigger().getAttribute('tabindex')).toBe('0');
  });

  it('open() does nothing when disabled; disabling while open closes', () => {
    createSelect();
    instance.disabled(true);
    instance.open();
    expect(rootEl.classList.contains('open')).toBe(false);

    instance.disabled(false);
    instance.open();
    instance.disabled(true);
    expect(rootEl.classList.contains('open')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setError()
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- setError()', () => {
  it('setError("msg") sets has-error + aria-invalid + inline alert', () => {
    createSelect();
    instance.setError('Field is required');
    expect(rootEl.classList.contains('has-error')).toBe(true);
    expect(getTrigger().getAttribute('aria-invalid')).toBe('true');
    expect(rootEl.querySelector('[role="alert"]')?.textContent).toBe('Field is required');
  });

  it('setError(false) clears has-error + aria-invalid + alert', () => {
    createSelect({ isInvalid: true, errorMsg: 'Error' });
    instance.setError(false);
    expect(rootEl.classList.contains('has-error')).toBe(false);
    expect(getTrigger().getAttribute('aria-invalid')).toBeNull();
    expect(rootEl.querySelector('[role="alert"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setLoading()
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- setLoading()', () => {
  it('setLoading(true/false) toggles loading class + aria-busy', () => {
    createSelect();
    instance.setLoading(true);
    expect(rootEl.classList.contains('loading')).toBe(true);
    expect(getTrigger().getAttribute('aria-busy')).toBe('true');
    instance.setLoading(false);
    expect(rootEl.classList.contains('loading')).toBe(false);
    expect(getTrigger().getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) closes an open select', () => {
    createSelect();
    instance.open();
    instance.setLoading(true);
    expect(rootEl.classList.contains('open')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// focus()
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- focus()', () => {
  it('focus() focuses the trigger', () => {
    createSelect();
    const spy = vi.spyOn(getTrigger(), 'focus');
    instance.focus();
    expect(spy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Item rendering + selection
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- item rendering + selection', () => {
  it('renders options with role="option" + labels', () => {
    createSelect();
    instance.open();
    const opts = getOptions();
    expect(opts.length).toBe(3);
    expect(opts[0].textContent).toContain('Option 1');
    opts.forEach((o) => expect(o.getAttribute('role')).toBe('option'));
  });

  it('selected option has aria-selected="true"', () => {
    createSelect({ value: 'val-1' });
    instance.open();
    expect(getOptions()[0].getAttribute('aria-selected')).toBe('true');
    expect(getOptions()[1].getAttribute('aria-selected')).toBe('false');
  });

  it('disabled option has aria-disabled="true"', () => {
    createSelect();
    instance.open();
    expect(getOptions()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('clicking an option calls onChange(item, index) + updates value', () => {
    const onChange = vi.fn();
    createSelect({ onChange });
    instance.open();
    (getOptions()[1] as HTMLElement).click();
    expect(onChange).toHaveBeenCalledWith(mockItems[1], 1);
    expect(instance.value()).toBe('val-2');
    expect(getTrigger().textContent).toContain('Option 2');
  });

  it('clicking a disabled option does not call onChange', () => {
    const onChange = vi.fn();
    createSelect({ onChange });
    instance.open();
    (getOptions()[2] as HTMLElement).click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closeOnSelect=true (default) closes after selection', () => {
    createSelect({ closeOnSelect: true });
    instance.open();
    (getOptions()[0] as HTMLElement).click();
    expect(instance.isOpen()).toBe(false);
  });

  it('closeOnSelect=false keeps the select open after selection', () => {
    createSelect({ closeOnSelect: false });
    instance.open();
    (getOptions()[0] as HTMLElement).click();
    expect(instance.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- custom events', () => {
  it('sel:open + sel:close + sel:change dispatch on the root', () => {
    const open = vi.fn();
    const close = vi.fn();
    const change = vi.fn();
    createSelect();
    rootEl.addEventListener('sel:open', open);
    rootEl.addEventListener('sel:close', close);
    rootEl.addEventListener('sel:change', change);
    instance.open();
    expect(open).toHaveBeenCalledOnce();
    (getOptions()[0] as HTMLElement).click();
    expect(change).toHaveBeenCalledOnce();
    expect((change.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      item: mockItems[0],
      index: 0,
    });
    // selection (closeOnSelect default) already closed the panel
    expect(close).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Picker-silent contract
//
// Engine-driven dismissal (outside-click / Escape) MUST be silent: no
// `sel:close` event, no `onClose` invocation, no `onClose` veto. Only
// programmatic / field-driven closes route through the cancellable
// `_doClose` path. Combobox is the reference implementation.
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- picker-silent engine dismissal (W2-SEL-REV-SEL-01)', () => {
  // Reach into the private `_handleListOpenChange` to simulate the engine
  // reporting a hub-driven dismissal (outside-click / Escape). The
  // composed real ArvoOptionList is what would normally invoke this, but
  // calling it directly is the most reliable way to lock the contract in
  // a jsdom test that has no real layout.
  function triggerEngineClose() {
    (instance as unknown as { _handleListOpenChange: (open: boolean) => void })
      ._handleListOpenChange(false);
  }

  it('engine dismissal does NOT dispatch sel:close', () => {
    const handler = vi.fn();
    createSelect();
    rootEl.addEventListener('sel:close', handler);
    instance.open();
    triggerEngineClose();
    expect(handler).not.toHaveBeenCalled();
  });

  it('engine dismissal does NOT invoke onClose', () => {
    const onClose = vi.fn();
    createSelect({ onClose });
    instance.open();
    triggerEngineClose();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('onClose returning false does NOT veto an engine dismissal', () => {
    createSelect({ onClose: () => false });
    instance.open();
    expect(instance.isOpen()).toBe(true);
    triggerEngineClose();
    expect(instance.isOpen()).toBe(false);
    expect(rootEl.classList.contains('open')).toBe(false);
  });

  it('engine dismissal still fires onOpenChange(false) to keep external state in sync', () => {
    const onOpenChange = vi.fn();
    createSelect({ onOpenChange });
    instance.open();
    onOpenChange.mockClear();
    triggerEngineClose();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('programmatic close still fires sel:close + invokes onClose', () => {
    const onClose = vi.fn();
    const handler = vi.fn();
    createSelect({ onClose });
    rootEl.addEventListener('sel:close', handler);
    instance.open();
    instance.close();
    expect(handler).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('programmatic close still honors onClose vetoing', () => {
    createSelect({ onClose: () => false });
    instance.open();
    instance.close();
    expect(instance.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Grouped items
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- grouped items', () => {
  it('renders group headers + dividers + all options', () => {
    createSelect({ items: mockGroupedItems });
    instance.open();
    const headers = document.querySelectorAll('.arvo-opt-list__grp-hdr');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toBe('Group A');
    expect(document.querySelectorAll('[role="separator"]').length).toBeGreaterThanOrEqual(1);
    expect(getOptions().length).toBe(4);
  });

  it('no dividers when hasGroupDividers=false', () => {
    createSelect({ items: mockGroupedItems, hasGroupDividers: false });
    instance.open();
    expect(document.querySelectorAll('.arvo-opt-list__divider').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- search', () => {
  it('renders search input when search=true', () => {
    createSelect({ search: true });
    expect(document.querySelector('.arvo-search__input')).not.toBeNull();
  });

  it('does not render search input when search=false (default)', () => {
    createSelect({ search: false });
    expect(document.querySelector('.arvo-search__input')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateItems() + optionListProps
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- updateItems() + optionListProps', () => {
  it('updateItems() replaces the options', () => {
    createSelect();
    instance.open();
    instance.updateItems([
      { id: 'n1', label: 'New A', value: 'na' },
      { id: 'n2', label: 'New B', value: 'nb' },
    ]);
    const opts = getOptions();
    expect(opts.length).toBe(2);
    expect(opts[0].textContent).toContain('New A');
  });

  it('forwards optionListProps (emptyConfig) to the composed list', () => {
    createSelect({
      items: [],
      optionListProps: { emptyConfig: { title: 'Nothing here' } },
    });
    instance.open();
    expect(document.querySelector('.arvo-opt-list__empty')).toBeTruthy();
    expect(
      document.querySelector('.arvo-opt-list__empty .arvo-empty__title')?.textContent,
    ).toBe('Nothing here');
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- accessibility', () => {
  it('aria-controls references the listbox id', () => {
    createSelect();
    expect(getTrigger().getAttribute('aria-controls')).toBe(getListbox()?.id);
  });

  it('open select has zero axe violations', async () => {
    createSelect({ label: 'Fruit' });
    instance.open();
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
// Destroy
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- destroy()', () => {
  it('destroy() removes the panel + clears root', () => {
    createSelect();
    instance.destroy();
    expect(getPanel()).toBeNull();
    expect(rootEl.textContent).toBe('');
    expect(rootEl.className).toBe('');
  });

  it('destroy() can be called while open without throwing', () => {
    createSelect();
    instance.open();
    expect(() => instance.destroy()).not.toThrow();
  });

  it('destroy() removes the trigger ARIA wiring', () => {
    createSelect();
    const trigger = getTrigger();
    instance.open();
    instance.destroy();
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readonly
// ---------------------------------------------------------------------------

describe('ArvoSelect (JS) -- readonly', () => {
  it('field click does not open when readonly', () => {
    createSelect({ isReadOnly: true });
    getTrigger().click();
    expect(instance.isOpen()).toBe(false);
  });

  it('open() does nothing when readonly', () => {
    createSelect({ isReadOnly: true });
    instance.open();
    expect(instance.isOpen()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Surface (filled default | base)
// ---------------------------------------------------------------------------
describe('ArvoSelect (JS) -- surface', () => {
  it('applies arvo-sel--surface-filled by default', () => {
    createSelect();
    expect(rootEl.classList.contains('arvo-sel--surface-filled')).toBe(true);
  });

  it('applies arvo-sel--surface-base when surface: "base"', () => {
    createSelect({ surface: 'base' });
    expect(rootEl.classList.contains('arvo-sel--surface-base')).toBe(true);
  });

  it('applies arvo-sel--surface-filled when surface: "filled"', () => {
    createSelect({ surface: 'filled' });
    expect(rootEl.classList.contains('arvo-sel--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    createSelect({ surface: 'base' });
    expect(rootEl.classList.contains('arvo-sel--surface-base')).toBe(true);
    expect(rootEl.classList.contains('arvo-sel--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Select - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoSelect(el, { items: [], label: 'Country' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoSelect(el, {
      items: [],
      label: 'Country',
      contextHelp: { content: 'Used for tax calculations.' },
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
    new ArvoSelect(el, { items: [], contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
