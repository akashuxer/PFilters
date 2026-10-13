import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoCheckboxGroup } from './CheckboxGroup';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGroupElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const ITEMS_TWO = [
  { value: 'a', label: 'Alpha', isChecked: false },
  { value: 'b', label: 'Beta', isChecked: false },
];

const ITEMS_CHECKED = [
  { value: 'a', label: 'Alpha', isChecked: true },
  { value: 'b', label: 'Beta', isChecked: true },
];

const ITEMS_MIXED = [
  { value: 'a', label: 'Alpha', isChecked: true },
  { value: 'b', label: 'Beta', isChecked: false },
];

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- initialization', () => {
  it('static initialize() returns an ArvoCheckboxGroup instance', () => {
    const el = createGroupElement();
    const instance = ArvoCheckboxGroup.initialize(el);
    expect(instance).toBeInstanceOf(ArvoCheckboxGroup);
  });

  it('constructor returns an ArvoCheckboxGroup instance', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    expect(instance).toBeInstanceOf(ArvoCheckboxGroup);
  });

  it('adds arvo-cb-grp class to element', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('arvo-cb-grp')).toBe(true);
  });

  it('sets role="group" on element', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.getAttribute('role')).toBe('group');
  });

  it('renders .arvo-cb-grp__bdy element', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.querySelector('.arvo-cb-grp__bdy')).not.toBeNull();
  });

  it('renders .arvo-cb-grp__items element inside __bdy', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    const bdy = el.querySelector('.arvo-cb-grp__bdy');
    expect(bdy?.querySelector('.arvo-cb-grp__items')).not.toBeNull();
  });

  it('creates child ArvoCheckbox instances from items array', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const checkboxes = el.querySelectorAll('.arvo-cb');
    expect(checkboxes.length).toBe(2);
  });

  it('renders item labels from items array', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const labels = el.querySelectorAll('.arvo-cb__lbl');
    const texts = Array.from(labels).map((l) => l.textContent);
    expect(texts).toContain('Alpha');
    expect(texts).toContain('Beta');
  });
});

// ---------------------------------------------------------------------------
// Size option
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- size option', () => {
  it('applies arvo-cb-grp--lg by default', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('arvo-cb-grp--lg')).toBe(true);
  });

  it('applies arvo-cb-grp--sm when size="sm"', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { size: 'sm' });
    expect(el.classList.contains('arvo-cb-grp--sm')).toBe(true);
  });

  it('applies arvo-cb-grp--lg when size="lg"', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { size: 'lg' });
    expect(el.classList.contains('arvo-cb-grp--lg')).toBe(true);
  });

  it('falls back to lg for invalid size values', () => {
    const el = createGroupElement();
    // @ts-expect-error testing invalid value
    new ArvoCheckboxGroup(el, { size: 'xl' });
    expect(el.classList.contains('arvo-cb-grp--lg')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Orientation / labelPosition
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- orientation option', () => {
  it('does not apply --horizontal by default', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('arvo-cb-grp--horizontal')).toBe(false);
  });

  it('applies arvo-cb-grp--horizontal when orientation="horizontal"', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { orientation: 'horizontal' });
    expect(el.classList.contains('arvo-cb-grp--horizontal')).toBe(true);
  });
});

describe('ArvoCheckboxGroup -- labelPosition option', () => {
  it('does not apply --label-start by default', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('arvo-cb-grp--label-start')).toBe(false);
  });

  it('applies arvo-cb-grp--label-start when labelPosition="start"', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { labelPosition: 'start' });
    expect(el.classList.contains('arvo-cb-grp--label-start')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Label option
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- label option', () => {
  it('does not render label span when label is null (default)', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.querySelector('.arvo-cb-grp__lbl')).toBeNull();
  });

  it('renders label span when label is set', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Options' });
    const lbl = el.querySelector('.arvo-cb-grp__lbl');
    expect(lbl).not.toBeNull();
  });

  it('renders label text in span', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Options' });
    const lbl = el.querySelector('.arvo-cb-grp__lbl');
    expect(lbl?.textContent).toContain('Options');
  });

  it('sets aria-labelledby on root when label is provided', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Options' });
    expect(el.getAttribute('aria-labelledby')).not.toBeNull();
  });

  it('label id matches aria-labelledby value', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Options' });
    const lbl = el.querySelector('.arvo-cb-grp__lbl') as HTMLElement;
    expect(el.getAttribute('aria-labelledby')).toBe(lbl.id);
  });

  it('does not set aria-labelledby when label is null', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.getAttribute('aria-labelledby')).toBeNull();
  });

  it('emits the form label at sm by default (no --lg modifier)', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Pick', size: 'sm' });
    const lbl = el.querySelector('.arvo-cb-grp__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.classList.contains('arvo-form-lbl--lg')).toBe(false);
  });

  it('applies arvo-form-lbl--lg class on label when size="lg"', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Pick', size: 'lg' });
    expect(el.querySelector('.arvo-form-lbl--lg')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Required option
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- required option', () => {
  it('sets aria-required="true" on root when required', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isRequired: true });
    expect(el.getAttribute('aria-required')).toBe('true');
  });

  it('does not set aria-required when not required', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.getAttribute('aria-required')).toBeNull();
  });

  it('shows asterisk (*) in label when required and label is set', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Pick one', isRequired: true });
    const req = el.querySelector('.arvo-form-lbl__req');
    expect(req).not.toBeNull();
    expect(req?.textContent).toBe('*');
    expect(req?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies arvo-form-lbl--required class on label when required', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Pick one', isRequired: true });
    expect(el.querySelector('.arvo-form-lbl--required')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- disabled option', () => {
  it('adds is-disabled class when disabled', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('does not add is-disabled when not disabled', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disables child checkbox inputs when disabled', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isDisabled: true, items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      expect(input.disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Readonly state
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- readonly option', () => {
  it('adds is-readonly class when readonly', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('does not add is-readonly when not readonly', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- error state', () => {
  it('adds has-error class when invalid', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('sets aria-invalid="true" when invalid', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true });
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows inline-alert when invalid and errorMsg is provided', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Select at least one' });
    expect(el.querySelector('.arvo-msg-alert')).not.toBeNull();
  });

  it('shows correct error message text in inline-alert', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Required' });
    expect(el.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Required');
  });

  it('does not show inline-alert when invalid but no errorMsg', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true });
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('sets aria-describedby when inline-alert is shown', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Error' });
    expect(el.getAttribute('aria-describedby')).not.toBeNull();
  });

  it('aria-describedby matches inline-alert id', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Error' });
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement;
    expect(el.getAttribute('aria-describedby')).toBe(alert.id);
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- loading option', () => {
  it('adds loading class when loading', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('does not add loading class when not loading', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('sets aria-busy="true" when loading', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('does not set aria-busy when not loading', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('sets data-arvo-loading="true" on __items when loading', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { isLoading: true });
    expect(el.querySelector('.arvo-cb-grp__items')?.getAttribute('data-arvo-loading')).toBe('true');
  });

  it('does not set data-arvo-loading on __items when not loading', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el);
    expect(el.querySelector('.arvo-cb-grp__items')?.getAttribute('data-arvo-loading')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Select All
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- selectAll option', () => {
  it('renders Select All checkbox when selectAll=true', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { hasSelectAll: true, items: ITEMS_TWO });
    const labels = el.querySelectorAll('.arvo-cb__lbl');
    const texts = Array.from(labels).map((l) => l.textContent);
    expect(texts).toContain('Select All');
  });

  it('does not render Select All when selectAll=false (default)', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const labels = el.querySelectorAll('.arvo-cb__lbl');
    const texts = Array.from(labels).map((l) => l.textContent);
    expect(texts).not.toContain('Select All');
  });

  it('Select All checkbox is checked when all items are initially checked', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { hasSelectAll: true, items: ITEMS_CHECKED });
    const items = el.querySelector('.arvo-cb-grp__items');
    const selectAllInput = items?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(selectAllInput.checked).toBe(true);
  });

  it('Select All checkbox is indeterminate when some items are checked', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { hasSelectAll: true, items: ITEMS_MIXED });
    const items = el.querySelector('.arvo-cb-grp__items');
    const selectAllInput = items?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(selectAllInput.indeterminate).toBe(true);
  });

  it('Select All checkbox is unchecked when no items are checked', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { hasSelectAll: true, items: ITEMS_TWO });
    const items = el.querySelector('.arvo-cb-grp__items');
    const selectAllInput = items?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(selectAllInput.checked).toBe(false);
    expect(selectAllInput.indeterminate).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// values() -- getter
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- values() getter', () => {
  it('returns empty array when no items are checked', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    expect(instance.values()).toEqual([]);
  });

  it('returns checked item values', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, {
      items: [
        { value: 'a', label: 'Alpha', isChecked: true },
        { value: 'b', label: 'Beta', isChecked: false },
      ],
    });
    expect(instance.values()).toEqual(['a']);
  });

  it('returns all values when all items are checked', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    const values = instance.values();
    expect(values).toContain('a');
    expect(values).toContain('b');
    expect(values.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// values() -- setter
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- values() setter', () => {
  it('sets checked state on specified items', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.values(['a']);
    expect(instance.values()).toEqual(['a']);
  });

  it('unchecks items not in the provided array', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    instance.values(['b']);
    expect(instance.values()).toEqual(['b']);
  });

  it('passing empty array unchecks all items', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    instance.values([]);
    expect(instance.values()).toEqual([]);
  });

  it('fires cb-grp:change after values(arr)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('cb-grp:change', handler);
    instance.values(['a']);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('updates the native checkbox inputs to reflect new checked state', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.values(['b']);
    const inputs = el.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    const checkedInputs = Array.from(inputs).filter((i) => i.checked);
    expect(checkedInputs.length).toBe(1);
    expect(checkedInputs[0].value).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// toggleAll()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- toggleAll(true)', () => {
  it('checks all items', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.toggleAll(true);
    const values = instance.values();
    expect(values).toContain('a');
    expect(values).toContain('b');
  });

  it('fires cb-grp:change after toggleAll(true)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('cb-grp:change', handler);
    instance.toggleAll(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cb-grp:change detail has allChecked=true after toggleAll(true)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    let detail: { values: string[]; allChecked: boolean } | null = null;
    el.addEventListener('cb-grp:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    instance.toggleAll(true);
    expect(detail).not.toBeNull();
    expect(detail!.allChecked).toBe(true);
  });
});

describe('ArvoCheckboxGroup -- toggleAll(false)', () => {
  it('unchecks all items', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    instance.toggleAll(false);
    expect(instance.values()).toEqual([]);
  });

  it('fires cb-grp:change after toggleAll(false)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    const handler = vi.fn();
    el.addEventListener('cb-grp:change', handler);
    instance.toggleAll(false);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cb-grp:change detail has allChecked=false after toggleAll(false)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    let detail: { values: string[]; allChecked: boolean } | null = null;
    el.addEventListener('cb-grp:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    instance.toggleAll(false);
    expect(detail!.allChecked).toBe(false);
  });
});

describe('ArvoCheckboxGroup -- toggleAll() no-arg flip', () => {
  it('checks all when none are checked', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.toggleAll();
    expect(instance.values()).toEqual(['a', 'b']);
  });

  it('unchecks all when all are checked', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    instance.toggleAll();
    expect(instance.values()).toEqual([]);
  });

  it('checks all when some are checked (not all)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_MIXED });
    instance.toggleAll();
    expect(instance.values()).toEqual(['a', 'b']);
  });

  it('is a no-op when disabled', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO, isDisabled: true });
    instance.toggleAll(true);
    expect(instance.values()).toEqual([]);
  });

  it('is a no-op when readonly', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO, isReadOnly: true });
    instance.toggleAll(true);
    expect(instance.values()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- disabled()', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) propagates disabled to child inputs', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.disabled(true);
    const inputs = el.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => expect(input.disabled).toBe(true));
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isDisabled: true, items: ITEMS_TWO });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) re-enables child inputs', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isDisabled: true, items: ITEMS_TWO });
    instance.disabled(false);
    const inputs = el.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => expect(input.disabled).toBe(false));
  });

  it('disabled() returns current disabled state', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    expect(instance.disabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readonly()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- readonly()', () => {
  it('readonly(true) adds is-readonly class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.readonly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('readonly(false) removes is-readonly class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isReadOnly: true });
    instance.readonly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('readonly(true) propagates to child checkboxes', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.readonly(true);
    const childCbs = el.querySelectorAll('.arvo-cb');
    childCbs.forEach((cb) => {
      expect(cb.classList.contains('is-readonly')).toBe(true);
    });
  });

  it('readonly() returns current readonly state', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isReadOnly: true });
    expect(instance.readonly()).toBe(true);
  });

  it('readonly() returns false when not readonly', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    expect(instance.readonly()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setError()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- setError()', () => {
  it('setError(msg) adds has-error class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setError('Required');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError(msg) sets aria-invalid', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setError('Required');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(msg) shows inline-alert with message', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setError('Select one');
    expect(el.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Select one');
  });

  it('setError(false) clears error and removes has-error', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Bad' });
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Err' });
    instance.setError(false);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) removes aria-describedby attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Err' });
    instance.setError(false);
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });

  it('setError(false) removes inline-alert element from DOM', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Err' });
    instance.setError(false);
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setLoading()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- setLoading()', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(true) sets data-arvo-loading on __items', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setLoading(true);
    expect(el.querySelector('.arvo-cb-grp__items')?.getAttribute('data-arvo-loading')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(false) removes data-arvo-loading from __items', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.querySelector('.arvo-cb-grp__items')?.getAttribute('data-arvo-loading')).toBeNull();
  });

  it('setLoading(true) propagates loading to child checkboxes', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.setLoading(true);
    const childCbs = el.querySelectorAll('.arvo-cb');
    childCbs.forEach((cb) => {
      expect(cb.classList.contains('loading')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// setLabel()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- setLabel()', () => {
  it('updates existing label text', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { label: 'Old' });
    instance.setLabel('New Label');
    const lbl = el.querySelector('.arvo-cb-grp__lbl');
    expect(lbl?.textContent).toContain('New Label');
  });

  it('creates label from null when no label existed', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    expect(el.querySelector('.arvo-cb-grp__lbl')).toBeNull();
    instance.setLabel('Created');
    expect(el.querySelector('.arvo-cb-grp__lbl')).not.toBeNull();
  });

  it('sets aria-labelledby after creating label from null', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.setLabel('Created');
    expect(el.getAttribute('aria-labelledby')).not.toBeNull();
  });

  it('removes label when set to null', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { label: 'Temp' });
    instance.setLabel(null);
    expect(el.querySelector('.arvo-cb-grp__lbl')).toBeNull();
  });

  it('removes aria-labelledby when label set to null', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { label: 'Temp' });
    instance.setLabel(null);
    expect(el.getAttribute('aria-labelledby')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- custom events', () => {
  it('cb-grp:change fires when toggleAll(true) is called', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('cb-grp:change', handler);
    instance.toggleAll(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cb-grp:change fires when toggleAll(false) is called', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_CHECKED });
    const handler = vi.fn();
    el.addEventListener('cb-grp:change', handler);
    instance.toggleAll(false);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cb-grp:change fires when values(arr) is called', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('cb-grp:change', handler);
    instance.values(['a']);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cb-grp:change detail contains values array', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    let detail: { values: string[]; allChecked: boolean } | null = null;
    el.addEventListener('cb-grp:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    instance.values(['a']);
    expect(Array.isArray(detail!.values)).toBe(true);
    expect(detail!.values).toEqual(['a']);
  });

  it('cb-grp:change detail contains allChecked boolean', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    let detail: { values: string[]; allChecked: boolean } | null = null;
    el.addEventListener('cb-grp:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    instance.toggleAll(true);
    expect(typeof detail!.allChecked).toBe('boolean');
    expect(detail!.allChecked).toBe(true);
  });

  it('cb-grp:change bubbles from root element', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    let bubbled = false;
    document.body.addEventListener('cb-grp:change', () => {
      bubbled = true;
    });
    instance.toggleAll(true);
    expect(bubbled).toBe(true);
  });

  it('onChange callback is called when state changes', () => {
    const onChange = vi.fn();
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO, onChange });
    instance.values(['a']);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('onChange receives detail with values and allChecked', () => {
    const onChange = vi.fn();
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO, onChange });
    instance.toggleAll(true);
    expect(onChange).toHaveBeenCalledWith({ values: ['a', 'b'], allChecked: true });
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoCheckboxGroup -- destroy()', () => {
  it('removes arvo-cb-grp class from element', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.destroy();
    expect(el.classList.contains('arvo-cb-grp')).toBe(false);
  });

  it('removes role attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.destroy();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('removes aria-labelledby attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { label: 'G' });
    instance.destroy();
    expect(el.getAttribute('aria-labelledby')).toBeNull();
  });

  it('removes aria-required attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isRequired: true });
    instance.destroy();
    expect(el.getAttribute('aria-required')).toBeNull();
  });

  it('removes aria-invalid attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isInvalid: true });
    instance.destroy();
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('removes aria-describedby attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isInvalid: true, errorMsg: 'Err' });
    instance.destroy();
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });

  it('removes aria-busy attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isLoading: true });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('clears element content (DOM children removed)', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.destroy();
    expect(el.children.length).toBe(0);
  });

  it('clears all classes from element', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el, { isDisabled: true, isLoading: true });
    instance.destroy();
    expect(el.className).toBe('');
  });

  it('calling destroy() twice does not throw', () => {
    const el = createGroupElement();
    const instance = new ArvoCheckboxGroup(el);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });

  it('cb-grp:change does not fire after destroy() when values(arr) is called on a destroyed instance', () => {
    const el = createGroupElement();
    const handler = vi.fn();
    const instance = new ArvoCheckboxGroup(el, { items: ITEMS_TWO });
    instance.destroy();
    document.body.addEventListener('cb-grp:change', handler);
    instance.values(['a']);
    expect(handler).not.toHaveBeenCalled();
    document.body.removeEventListener('cb-grp:change', handler);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('CheckboxGroup - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, { label: 'Preferences', items: ITEMS_TWO });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, {
      label: 'Preferences',
      items: ITEMS_TWO,
      contextHelp: { content: 'Pick any that apply.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createGroupElement();
    new ArvoCheckboxGroup(el, {
      items: ITEMS_TWO,
      contextHelp: { content: 'No label' },
    });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
