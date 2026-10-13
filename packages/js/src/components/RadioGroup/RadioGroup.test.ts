import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoRadioGroup } from './RadioGroup';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGroupElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const ITEMS_TWO = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- initialization', () => {
  it('static initialize() returns an ArvoRadioGroup instance', () => {
    const el = createGroupElement();
    const instance = ArvoRadioGroup.initialize(el, { name: 'grp' });
    expect(instance).toBeInstanceOf(ArvoRadioGroup);
  });

  it('constructor returns an ArvoRadioGroup instance', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    expect(instance).toBeInstanceOf(ArvoRadioGroup);
  });

  it('adds arvo-rb-grp class to element', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('arvo-rb-grp')).toBe(true);
  });

  it('sets role="radiogroup" on element', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.getAttribute('role')).toBe('radiogroup');
  });

  it('renders .arvo-rb-grp__bdy element', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.querySelector('.arvo-rb-grp__bdy')).not.toBeNull();
  });

  it('renders .arvo-rb-grp__items element inside __bdy', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    const bdy = el.querySelector('.arvo-rb-grp__bdy');
    expect(bdy?.querySelector('.arvo-rb-grp__items')).not.toBeNull();
  });

  it('creates child ArvoRadio instances from items array', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    const radios = el.querySelectorAll('.arvo-radio');
    expect(radios.length).toBe(2);
  });

  it('renders item labels from items array', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    const texts = el.querySelectorAll('.arvo-radio__text');
    const textArr = Array.from(texts).map((t) => t.textContent);
    expect(textArr).toContain('Alpha');
    expect(textArr).toContain('Beta');
  });
});

// ---------------------------------------------------------------------------
// Size option
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- size option', () => {
  it('applies arvo-rb-grp--lg by default', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('arvo-rb-grp--lg')).toBe(true);
  });

  it('applies arvo-rb-grp--sm when size="sm"', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', size: 'sm' });
    expect(el.classList.contains('arvo-rb-grp--sm')).toBe(true);
  });

  it('falls back to lg for invalid size values', () => {
    const el = createGroupElement();
    // @ts-expect-error testing invalid value
    new ArvoRadioGroup(el, { name: 'grp', size: 'xl' });
    expect(el.classList.contains('arvo-rb-grp--lg')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Orientation / labelPosition
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- orientation option', () => {
  it('does not apply --horizontal by default', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('arvo-rb-grp--horizontal')).toBe(false);
  });

  it('applies arvo-rb-grp--horizontal when orientation="horizontal"', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', orientation: 'horizontal' });
    expect(el.classList.contains('arvo-rb-grp--horizontal')).toBe(true);
  });
});

describe('ArvoRadioGroup -- labelPosition option', () => {
  it('does not apply --label-start by default', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('arvo-rb-grp--label-start')).toBe(false);
  });

  it('applies arvo-rb-grp--label-start when labelPosition="start"', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', labelPosition: 'start' });
    expect(el.classList.contains('arvo-rb-grp--label-start')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Label option
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- label option', () => {
  it('does not render label span when label is null (default)', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.querySelector('.arvo-rb-grp__lbl')).toBeNull();
  });

  it('renders label span when label is set', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Options' });
    const lbl = el.querySelector('.arvo-rb-grp__lbl');
    expect(lbl).not.toBeNull();
  });

  it('renders label text in span', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Options' });
    const lbl = el.querySelector('.arvo-rb-grp__lbl');
    expect(lbl?.textContent).toContain('Options');
  });

  it('sets aria-labelledby on root when label is provided', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Options' });
    expect(el.getAttribute('aria-labelledby')).not.toBeNull();
  });

  it('label id matches aria-labelledby value', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Options' });
    const lbl = el.querySelector('.arvo-rb-grp__lbl') as HTMLElement;
    expect(el.getAttribute('aria-labelledby')).toBe(lbl.id);
  });

  it('does not set aria-labelledby when label is null', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.getAttribute('aria-labelledby')).toBeNull();
  });

  it('emits the form label at sm by default (no --lg modifier)', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Pick', size: 'sm' });
    const lbl = el.querySelector('.arvo-rb-grp__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.classList.contains('arvo-form-lbl--lg')).toBe(false);
  });

  it('applies arvo-form-lbl--lg class on label when size="lg"', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Pick', size: 'lg' });
    expect(el.querySelector('.arvo-form-lbl--lg')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Required option
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- required option', () => {
  it('sets aria-required="true" on root when required', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isRequired: true });
    expect(el.getAttribute('aria-required')).toBe('true');
  });

  it('does not set aria-required when not required', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.getAttribute('aria-required')).toBeNull();
  });

  it('shows asterisk (*) in label when required and label is set', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Pick one', isRequired: true });
    const req = el.querySelector('.arvo-form-lbl__req');
    expect(req).not.toBeNull();
    expect(req?.textContent).toBe('*');
    expect(req?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies arvo-form-lbl--required class on label when required', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Pick one', isRequired: true });
    expect(el.querySelector('.arvo-form-lbl--required')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- disabled option', () => {
  it('adds is-disabled class when disabled', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('does not add is-disabled when not disabled', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disables child radio inputs when disabled', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isDisabled: true, items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      expect(input.disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Readonly state
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- readonly option', () => {
  it('adds is-readonly class when readonly', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('does not add is-readonly when not readonly', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('is-readonly')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- error state', () => {
  it('adds has-error class when invalid', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('sets aria-invalid="true" when invalid', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true });
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows inline-alert when invalid and errorMsg is provided', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Select one' });
    expect(el.querySelector('.arvo-msg-alert')).not.toBeNull();
  });

  it('shows correct error message text in inline-alert', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Required' });
    expect(el.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Required');
  });

  it('does not show inline-alert when invalid but no errorMsg', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true });
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('sets aria-describedby when inline-alert is shown', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Error' });
    expect(el.getAttribute('aria-describedby')).not.toBeNull();
  });

  it('aria-describedby matches inline-alert id', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Error' });
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement;
    expect(el.getAttribute('aria-describedby')).toBe(alert.id);
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- loading option', () => {
  it('adds loading class when loading', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('does not add loading class when not loading', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('sets aria-busy="true" when loading', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('does not set aria-busy when not loading', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('sets data-arvo-loading="true" on __items when loading (parity with CheckboxGroup)', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isLoading: true });
    const items = el.querySelector('.arvo-rb-grp__items');
    expect(items?.getAttribute('data-arvo-loading')).toBe('true');
  });

  it('does not set data-arvo-loading on __items when not loading', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp' });
    const items = el.querySelector('.arvo-rb-grp__items');
    expect(items?.getAttribute('data-arvo-loading')).toBeNull();
  });

  it('setLoading(true) toggles data-arvo-loading on __items', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    const items = el.querySelector('.arvo-rb-grp__items');
    expect(items?.getAttribute('data-arvo-loading')).toBeNull();
    instance.setLoading(true);
    expect(items?.getAttribute('data-arvo-loading')).toBe('true');
    instance.setLoading(false);
    expect(items?.getAttribute('data-arvo-loading')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Value / selection
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- value option (selection)', () => {
  it('selects the radio matching the value option', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', value: 'b', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].checked).toBe(false);
    expect(inputs[1].checked).toBe(true);
  });

  it('no radio is selected when value is null', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', value: null, items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].checked).toBe(false);
    expect(inputs[1].checked).toBe(false);
  });

  it('sets name attribute on all child radio inputs', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'my-group', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      expect(input.name).toBe('my-group');
    });
  });
});

// ---------------------------------------------------------------------------
// value()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- value()', () => {
  it('returns null when no radio is selected', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    expect(instance.value()).toBeNull();
  });

  it('returns the value of the selected radio', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', value: 'a', items: ITEMS_TWO });
    expect(instance.value()).toBe('a');
  });

  it('selects the radio with the given value', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.value('b');
    expect(instance.value()).toBe('b');
  });

  it('updates native input checked state', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.value('a');
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].checked).toBe(true);
    expect(inputs[1].checked).toBe(false);
  });

  it('fires rb-grp:change after value(newValue)', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('rb-grp:change', handler);
    instance.value('a');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('rb-grp:change detail has value and previousValue', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    let detail: { value: string; previousValue: string | null } | null = null;
    el.addEventListener('rb-grp:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    instance.value('a');
    expect(detail).not.toBeNull();
    expect(detail!.value).toBe('a');
    expect(detail!.previousValue).toBeNull();
  });

  it('does not fire event when value() called with same value', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', value: 'a', items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('rb-grp:change', handler);
    instance.value('a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('is a no-op when disabled', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isDisabled: true, items: ITEMS_TWO });
    instance.value('a');
    expect(instance.value()).toBeNull();
  });

  it('is a no-op when readonly', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isReadOnly: true, items: ITEMS_TWO });
    instance.value('a');
    expect(instance.value()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- disabled()', () => {
  it('disabled() returns false by default', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    expect(instance.disabled()).toBe(false);
  });

  it('disabled() returns true when initialized disabled', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled(true) adds is-disabled class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) propagates disabled to child inputs', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.disabled(true);
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => expect(input.disabled).toBe(true));
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isDisabled: true, items: ITEMS_TWO });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) re-enables child inputs', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isDisabled: true, items: ITEMS_TWO });
    instance.disabled(false);
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => expect(input.disabled).toBe(false));
  });
});

// ---------------------------------------------------------------------------
// readonly()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- readonly()', () => {
  it('readonly() returns false by default', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    expect(instance.readonly()).toBe(false);
  });

  it('readonly() returns true when initialized readonly', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isReadOnly: true });
    expect(instance.readonly()).toBe(true);
  });

  it('readonly(true) adds is-readonly class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.readonly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('readonly(false) removes is-readonly class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isReadOnly: true });
    instance.readonly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('readonly(true) propagates to child radios', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.readonly(true);
    const childRadios = el.querySelectorAll('.arvo-radio');
    childRadios.forEach((r) => {
      expect(r.classList.contains('is-readonly')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// setError()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- setError()', () => {
  it('setError(msg) adds has-error class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.setError('Required');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError(msg) sets aria-invalid', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.setError('Required');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(msg) shows inline-alert with message', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.setError('Select one');
    expect(el.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Select one');
  });

  it('setError(false) removes has-error class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Bad' });
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Err' });
    instance.setError(false);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) removes aria-describedby attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Err' });
    instance.setError(false);
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });

  it('setError(false) removes inline-alert element from DOM', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Err' });
    instance.setError(false);
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setLoading()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- setLoading()', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) propagates loading to child radios', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.setLoading(true);
    const childRadios = el.querySelectorAll('.arvo-radio');
    childRadios.forEach((r) => {
      expect(r.classList.contains('loading')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// setLabel()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- setLabel()', () => {
  it('updates existing label text', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', label: 'Old' });
    instance.setLabel('New Label');
    const lbl = el.querySelector('.arvo-rb-grp__lbl');
    expect(lbl?.textContent).toContain('New Label');
  });

  it('creates label from null when no label existed', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    expect(el.querySelector('.arvo-rb-grp__lbl')).toBeNull();
    instance.setLabel('Created');
    expect(el.querySelector('.arvo-rb-grp__lbl')).not.toBeNull();
  });

  it('sets aria-labelledby after creating label from null', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.setLabel('Created');
    expect(el.getAttribute('aria-labelledby')).not.toBeNull();
  });

  it('removes label when set to null', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', label: 'Temp' });
    instance.setLabel(null);
    expect(el.querySelector('.arvo-rb-grp__lbl')).toBeNull();
  });

  it('removes aria-labelledby when label set to null', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', label: 'Temp' });
    instance.setLabel(null);
    expect(el.getAttribute('aria-labelledby')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- custom events', () => {
  it('rb-grp:change fires when value() is called with a new value', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    const handler = vi.fn();
    el.addEventListener('rb-grp:change', handler);
    instance.value('a');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('rb-grp:change detail contains value and previousValue', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    let detail: { value: string; previousValue: string | null } | null = null;
    el.addEventListener('rb-grp:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    instance.value('a');
    expect(detail!.value).toBe('a');
    expect(detail!.previousValue).toBeNull();
  });

  it('rb-grp:change bubbles from root element', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    let bubbled = false;
    document.body.addEventListener('rb-grp:change', () => {
      bubbled = true;
    });
    instance.value('a');
    expect(bubbled).toBe(true);
  });

  it('onChange callback is called when state changes', () => {
    const onChange = vi.fn();
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO, onChange });
    instance.value('a');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('onChange receives detail with value and previousValue', () => {
    const onChange = vi.fn();
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', value: 'a', items: ITEMS_TWO, onChange });
    instance.value('b');
    expect(onChange).toHaveBeenCalledWith({ value: 'b', previousValue: 'a' });
  });
});

// ---------------------------------------------------------------------------
// Roving tabindex
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- roving tabindex', () => {
  it('selected radio has tabindex=0, others have tabindex=-1', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', value: 'a', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].tabIndex).toBe(0);
    expect(inputs[1].tabIndex).toBe(-1);
  });

  it('first non-disabled radio has tabindex=0 when none selected', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].tabIndex).toBe(0);
    expect(inputs[1].tabIndex).toBe(-1);
  });

  it('first non-disabled radio gets tabindex=0 when first item is disabled', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, {
      name: 'grp',
      items: [
        { value: 'a', label: 'Alpha', isDisabled: true },
        { value: 'b', label: 'Beta' },
      ],
    });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].tabIndex).toBe(-1);
    expect(inputs[1].tabIndex).toBe(0);
  });

  it('every radio has tabindex=-1 when initialized with isReadOnly=true', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', isReadOnly: true, value: 'a', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].tabIndex).toBe(-1);
    expect(inputs[1].tabIndex).toBe(-1);
  });

  it('readonly(true) removes the group from the tab order; readonly(false) restores it', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', value: 'a', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;

    // Sanity check the pre-readonly tab order
    expect(inputs[0].tabIndex).toBe(0);
    expect(inputs[1].tabIndex).toBe(-1);

    instance.readonly(true);
    expect(inputs[0].tabIndex).toBe(-1);
    expect(inputs[1].tabIndex).toBe(-1);

    instance.readonly(false);
    // Restore the selected-wins roving tabindex
    expect(inputs[0].tabIndex).toBe(0);
    expect(inputs[1].tabIndex).toBe(-1);
  });

  it('disabled(true) followed by disabled(false) re-computes the roving tab order', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', value: 'b', items: ITEMS_TWO });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;

    expect(inputs[0].tabIndex).toBe(-1);
    expect(inputs[1].tabIndex).toBe(0);

    instance.disabled(true);
    instance.disabled(false);

    // Selected item ('b') should still own the tab stop after the disabled
    // cycle re-runs _syncRovingTabindex.
    expect(inputs[0].tabIndex).toBe(-1);
    expect(inputs[1].tabIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoRadioGroup -- destroy()', () => {
  it('removes arvo-rb-grp class from element', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.destroy();
    expect(el.classList.contains('arvo-rb-grp')).toBe(false);
  });

  it('removes role attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.destroy();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('removes aria-labelledby attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', label: 'G' });
    instance.destroy();
    expect(el.getAttribute('aria-labelledby')).toBeNull();
  });

  it('removes aria-required attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isRequired: true });
    instance.destroy();
    expect(el.getAttribute('aria-required')).toBeNull();
  });

  it('removes aria-invalid attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isInvalid: true });
    instance.destroy();
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('removes aria-describedby attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isInvalid: true, errorMsg: 'Err' });
    instance.destroy();
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });

  it('removes aria-busy attribute', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isLoading: true });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('clears element content (DOM children removed)', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.destroy();
    expect(el.children.length).toBe(0);
  });

  it('clears all classes from element', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp', isDisabled: true, isLoading: true });
    instance.destroy();
    expect(el.className).toBe('');
  });

  it('calling destroy() twice does not throw', () => {
    const el = createGroupElement();
    const instance = new ArvoRadioGroup(el, { name: 'grp' });
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });

  it('rb-grp:change does not fire after destroy()', () => {
    const el = createGroupElement();
    const handler = vi.fn();
    const instance = new ArvoRadioGroup(el, { name: 'grp', items: ITEMS_TWO });
    instance.destroy();
    document.body.addEventListener('rb-grp:change', handler);
    instance.value('a');
    expect(handler).not.toHaveBeenCalled();
    document.body.removeEventListener('rb-grp:change', handler);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('RadioGroup - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, { name: 'grp', label: 'Pick one', items: ITEMS_TWO });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, {
      name: 'grp',
      label: 'Pick one',
      items: ITEMS_TWO,
      contextHelp: { content: 'Only one option is allowed.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createGroupElement();
    new ArvoRadioGroup(el, {
      name: 'grp',
      items: ITEMS_TWO,
      contextHelp: { content: 'No label' },
    });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
