import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoNumberInput } from './NumberInput';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createEl(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - initialization', () => {
  it('static initialize() returns an ArvoNumberInput instance', () => {
    const el = createEl();
    const instance = ArvoNumberInput.initialize(el);
    expect(instance).toBeInstanceOf(ArvoNumberInput);
  });

  it('constructor returns an ArvoNumberInput instance', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    expect(instance).toBeInstanceOf(ArvoNumberInput);
  });

  it('adds arvo-number-input base class', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.classList.contains('arvo-number-input')).toBe(true);
  });

  it('adds default lg size class', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.classList.contains('arvo-number-input--lg')).toBe(true);
  });

  it('adds sm size class when specified', () => {
    const el = createEl();
    new ArvoNumberInput(el, { size: 'sm' });
    expect(el.classList.contains('arvo-number-input--sm')).toBe(true);
  });

  it('falls back to lg for an invalid size', () => {
    const el = createEl();
    new ArvoNumberInput(el, { size: 'xl' as never });
    expect(el.classList.contains('arvo-number-input--lg')).toBe(true);
    expect(el.classList.contains('arvo-number-input--xl')).toBe(false);
  });

  it('creates input element with type="number"', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('number');
  });

  it('input has role="spinbutton"', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const input = el.querySelector('input');
    expect(input!.getAttribute('role')).toBe('spinbutton');
  });

  it('sets role="group" on root element', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.getAttribute('role')).toBe('group');
  });

  it('creates stepper buttons', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__increment-btn')).not.toBeNull();
    expect(el.querySelector('.arvo-number-input__decrement-btn')).not.toBeNull();
  });

  it('creates steppers wrapper', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__steppers')).not.toBeNull();
  });

  it('creates border element', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__border')).not.toBeNull();
  });

  it('creates field container', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__field')).not.toBeNull();
  });

  it('sets placeholder on input when provided', () => {
    const el = createEl();
    new ArvoNumberInput(el, { placeholder: 'Enter value' });
    expect(el.querySelector('input')!.placeholder).toBe('Enter value');
  });

  it('sets initial numeric value on input', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 42 });
    expect(el.querySelector('input')!.value).toBe('42');
  });

  it('applies full-width modifier class', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isFullWidth: true });
    expect(el.classList.contains('arvo-number-input--full-width')).toBe(true);
  });

  it('does not apply full-width class when option is false', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.classList.contains('arvo-number-input--full-width')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DOM Structure
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - DOM structure', () => {
  it('creates label element when label option is provided', () => {
    const el = createEl();
    new ArvoNumberInput(el, { label: 'Quantity' });
    expect(el.querySelector('label')).not.toBeNull();
  });

  it('label has for attribute matching input id', () => {
    const el = createEl();
    new ArvoNumberInput(el, { label: 'Quantity' });
    const label = el.querySelector('label')!;
    const input = el.querySelector('input')!;
    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('shows required asterisk when required and label given', () => {
    const el = createEl();
    new ArvoNumberInput(el, { label: 'Quantity', isRequired: true });
    expect(el.querySelector('.arvo-form-lbl__req')).not.toBeNull();
  });

  it('does not create label when option is omitted', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('label')).toBeNull();
  });

  it('creates inline alert element when inlineError is false (default)', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-msg-alert')).not.toBeNull();
  });

  it('creates inline error icon when inlineError and invalid are both true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { errorDisplay: 'tooltip', isInvalid: true });
    expect(el.querySelector('.arvo-number-input__err-ico')).not.toBeNull();
  });

  it('does not create steppers when readonly', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isReadOnly: true });
    expect(el.querySelector('.arvo-number-input__steppers')).toBeNull();
    expect(el.querySelector('.arvo-number-input__increment-btn')).toBeNull();
    expect(el.querySelector('.arvo-number-input__decrement-btn')).toBeNull();
  });

  it('increment button has aria-label="Increment"', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const btn = el.querySelector('.arvo-number-input__increment-btn')!;
    expect(btn.getAttribute('aria-label')).toBe('Increment');
  });

  it('decrement button has aria-label="Decrement"', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const btn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(btn.getAttribute('aria-label')).toBe('Decrement');
  });

  it('stepper buttons have tabIndex=-1', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const inc = el.querySelector('.arvo-number-input__increment-btn') as HTMLButtonElement;
    const dec = el.querySelector('.arvo-number-input__decrement-btn') as HTMLButtonElement;
    expect(inc.tabIndex).toBe(-1);
    expect(dec.tabIndex).toBe(-1);
  });

  it('input has class arvo-number-input__input', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__input')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// value()
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - value()', () => {
  it('value() returns null for empty input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    expect(instance.value()).toBeNull();
  });

  it('value() returns initial value', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10 });
    expect(instance.value()).toBe(10);
  });

  it('value(n) sets numeric value on input element', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.value(5);
    expect(el.querySelector('input')!.value).toBe('5');
  });

  it('value() reflects value(n)', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.value(7);
    expect(instance.value()).toBe(7);
  });

  it('value(NaN) clears the input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    instance.value(NaN);
    expect(instance.value()).toBeNull();
  });

  it('value(n) fires number-input:change event', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 1 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.value(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('value(n) event detail has correct value and previousValue', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 3 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.value(9);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ value: 9, previousValue: 3 });
  });

  it('rapid value(n) calls track previousValue correctly', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0 });
    const events: Array<{ value: number | null; previousValue: number | null }> = [];
    el.addEventListener('number-input:change', (e) => {
      events.push((e as CustomEvent).detail);
    });
    instance.value(1);
    instance.value(2);
    expect(events[0]).toEqual({ value: 1, previousValue: 0 });
    expect(events[1]).toEqual({ value: 2, previousValue: 1 });
  });

  it('value(n) updates aria-valuenow', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.value(42);
    expect(el.querySelector('input')!.getAttribute('aria-valuenow')).toBe('42');
  });

  it('clear() removes aria-valuenow', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    instance.clear();
    expect(el.querySelector('input')!.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('value(n) clamps to min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { min: 0 });
    instance.value(-10);
    expect(instance.value()).toBe(0);
  });

  it('value(n) clamps to max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { max: 100 });
    instance.value(200);
    expect(instance.value()).toBe(100);
  });

  it('value(n) respects decimal step precision', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { step: 0.1 });
    instance.value(1.1);
    expect(el.querySelector('input')!.value).toBe('1.1');
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - clear', () => {
  it('clear() sets input value to empty string', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    instance.clear();
    expect(el.querySelector('input')!.value).toBe('');
  });

  it('clear() makes value() return null', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    instance.clear();
    expect(instance.value()).toBeNull();
  });

  it('clear() fires number-input:change event', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.clear();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clear() event detail has value=null and correct previousValue', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 7 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.clear();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ value: null, previousValue: 7 });
  });

  it('clear() removes at-min class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0, min: 0 });
    expect(el.classList.contains('at-min')).toBe(true);
    instance.clear();
    expect(el.classList.contains('at-min')).toBe(false);
  });

  it('clear() removes at-max class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10, max: 10 });
    expect(el.classList.contains('at-max')).toBe(true);
    instance.clear();
    expect(el.classList.contains('at-max')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - disabled()', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets input.disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.disabled(true);
    expect(el.querySelector('input')!.disabled).toBe(true);
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) clears input.disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.querySelector('input')!.disabled).toBe(false);
  });

  it('disabled() returns true when disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    expect(instance.disabled()).toBe(false);
  });

  it('disabled() reflects disabled(true) call', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
  });

  it('disabled() reflects disabled(false) call', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    instance.disabled(false);
    expect(instance.disabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setLoading
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - setLoading', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) blurs input if focused', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    const input = el.querySelector('input')!;
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    instance.setLoading(true);
    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it('initial loading option adds loading class', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('initial loading option sets aria-busy', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// focus
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - focus', () => {
  it('focus() focuses the native input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.focus();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('focus() does nothing when disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.focus();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('focus() does nothing when loading', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isLoading: true });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.focus();
    expect(focusSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setError()
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - setError()', () => {
  it('setError(msg) adds has-error class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setError('Required');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError(msg) sets aria-invalid on input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setError('Required');
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(msg) sets aria-describedby on input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setError('Required');
    expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('setError(msg) shows inline alert when inlineError is false', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setError('Error message');
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert).not.toBeNull();
    expect(alert!.style.display).not.toBe('none');
  });

  it('setError(false) removes has-error class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isInvalid: true });
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isInvalid: true });
    instance.setError(false);
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) removes aria-describedby', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setError('err');
    instance.setError(false);
    expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBeNull();
  });

  it('setError(false) hides the inline alert', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setError('err');
    instance.setError(false);
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).toBe('none');
  });

  it('initial invalid option adds has-error class', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('initial invalid option sets aria-invalid on input', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isInvalid: true });
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('initial invalid option shows inline alert', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isInvalid: true });
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).not.toBe('none');
  });

  it('tooltip error mode adds error-tooltip class when invalid', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isInvalid: true, errorDisplay: 'tooltip' });
    expect(el.classList.contains('error-tooltip')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - validate', () => {
  it('returns valid=true for empty non-required input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    const result = instance.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid=false for required empty input', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isRequired: true });
    const result = instance.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('includes "required" error message when required and empty', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isRequired: true });
    const result = instance.validate();
    expect(result.errors[0]).toContain('required');
  });

  it('returns valid=true for value within range', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, min: 0, max: 10 });
    const result = instance.validate();
    expect(result.valid).toBe(true);
  });

  it('returns errors when value is below min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { min: 5 });
    // Bypass setValue clamping by writing directly to the input
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '2';
    const result = instance.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors when value is above max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { max: 10 });
    // Bypass setValue clamping by writing directly to the input
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '15';
    const result = instance.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors when value does not align with step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { step: 5 });
    instance.value(3);
    const result = instance.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid=true for value aligned with step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { step: 5 });
    instance.value(15);
    const result = instance.validate();
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// State classes
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - state classes', () => {
  it('adds is-disabled class when disabled option is true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('adds is-readonly class when readonly option is true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('adds at-min class when value equals min', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 0, min: 0 });
    expect(el.classList.contains('at-min')).toBe(true);
  });

  it('adds at-max class when value equals max', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 10, max: 10 });
    expect(el.classList.contains('at-max')).toBe(true);
  });

  it('does not add at-min class when value is above min', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 5, min: 0 });
    expect(el.classList.contains('at-min')).toBe(false);
  });

  it('does not add at-max class when value is below max', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 5, max: 10 });
    expect(el.classList.contains('at-max')).toBe(false);
  });

  it('value(n) adds at-min class when value reaches min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { min: 0 });
    instance.value(0);
    expect(el.classList.contains('at-min')).toBe(true);
  });

  it('value(n) adds at-max class when value reaches max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { max: 10 });
    instance.value(10);
    expect(el.classList.contains('at-max')).toBe(true);
  });

  it('value(n) removes at-min class when value moves above min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0, min: 0 });
    instance.value(5);
    expect(el.classList.contains('at-min')).toBe(false);
  });

  it('value(n) removes at-max class when value moves below max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10, max: 10 });
    instance.value(5);
    expect(el.classList.contains('at-max')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ARIA attributes
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - ARIA attributes', () => {
  it('sets aria-valuenow when value is provided', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 5 });
    expect(el.querySelector('input')!.getAttribute('aria-valuenow')).toBe('5');
  });

  it('aria-valuenow absent when no initial value', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('input')!.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('sets aria-valuemin when min is provided', () => {
    const el = createEl();
    new ArvoNumberInput(el, { min: 0 });
    expect(el.querySelector('input')!.getAttribute('aria-valuemin')).toBe('0');
  });

  it('sets aria-valuemax when max is provided', () => {
    const el = createEl();
    new ArvoNumberInput(el, { max: 100 });
    expect(el.querySelector('input')!.getAttribute('aria-valuemax')).toBe('100');
  });

  it('does not set aria-valuemin when min is not provided', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('input')!.getAttribute('aria-valuemin')).toBeNull();
  });

  it('does not set aria-valuemax when max is not provided', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('input')!.getAttribute('aria-valuemax')).toBeNull();
  });

  it('sets aria-required when required is true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isRequired: true });
    expect(el.querySelector('input')!.getAttribute('aria-required')).toBe('true');
  });

  it('sets aria-invalid when invalid is true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isInvalid: true });
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets aria-describedby when invalid (non-inlineError mode)', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isInvalid: true });
    expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('sets aria-busy on root when loading is true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('at-max: increment button has aria-disabled="true"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 10, max: 10 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    expect(incBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('at-min: decrement button has aria-disabled="true"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 0, min: 0 });
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(decBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('removes aria-disabled from increment button when value moves below max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10, max: 10 });
    instance.value(5);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    expect(incBtn.getAttribute('aria-disabled')).toBeNull();
  });

  it('removes aria-disabled from decrement button when value moves above min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0, min: 0 });
    instance.value(5);
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(decBtn.getAttribute('aria-disabled')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stepper buttons
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - stepper buttons', () => {
  it('increment click increases value by step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, step: 1 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(6);
  });

  it('decrement click decreases value by step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, step: 1 });
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    decBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    decBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(4);
  });

  it('increment from empty value sets to min when min is set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { min: 5 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(5);
  });

  it('increment from empty value sets to 0 when no min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(0);
  });

  it('decrement from empty value sets to max when max is set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { max: 10 });
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    decBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    decBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(10);
  });

  it('decrement from empty value sets to 0 when no max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    decBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    decBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(0);
  });

  it('increment respects max constraint', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10, max: 10 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(10);
  });

  it('decrement respects min constraint', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0, min: 0 });
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    decBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    decBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(0);
  });

  it('stepper click fires number-input:change event', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 5 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stepper click does nothing when disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, isDisabled: true });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(5);
  });

  it('stepper click does nothing when loading', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, isLoading: true });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(5);
  });

  it('increment with step=5 increases by 5', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10, step: 5 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Keyboard interactions
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - keyboard interactions', () => {
  it('ArrowUp increments value by step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(6);
  });

  it('ArrowDown decrements value by step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(4);
  });

  it('Shift+ArrowUp increments value by step*10', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, step: 1 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(15);
  });

  it('Shift+ArrowDown decrements value by step*10', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 50, step: 1 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(40);
  });

  it('Home key sets value to min', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 50, min: 0 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(0);
  });

  it('End key sets value to max', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, max: 100 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(100);
  });

  it('Home does nothing when min is not set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(5);
  });

  it('End does nothing when max is not set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(5);
  });

  it('ArrowUp does nothing when disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, isDisabled: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(5);
  });

  it('ArrowUp does nothing when readonly', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, isReadOnly: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(5);
  });

  it('ArrowUp does nothing when loading', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5, isLoading: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe(5);
  });

  it('ArrowUp fires number-input:change event', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 5 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - custom events', () => {
  it('number-input:change bubbles', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    let captured: CustomEvent | null = null;
    document.body.addEventListener('number-input:change', (e) => { captured = e as CustomEvent; });
    instance.value(1);
    expect(captured).not.toBeNull();
    expect(captured!.bubbles).toBe(true);
    document.body.removeEventListener('number-input:change', () => {});
  });

  it('number-input:change has correct detail payload on value(n)', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 1 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.value(5);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('value', 5);
    expect(detail).toHaveProperty('previousValue', 1);
  });

  it('number-input:change fires on stepper click', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 5 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(handler).toHaveBeenCalled();
  });

  it('number-input:change fires on clear', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 5 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.clear();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('number-input:change is cancelable', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    let captured: CustomEvent | null = null;
    el.addEventListener('number-input:change', (e) => { captured = e as CustomEvent; });
    instance.value(1);
    expect(captured!.cancelable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - callbacks', () => {
  it('onInput called on native input event', () => {
    const onInput = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onInput });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('onChange called on native change event', () => {
    const onChange = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onChange });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onFocus called when input is focused', () => {
    const onFocus = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onFocus });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('onBlur called when input loses focus', () => {
    const onBlur = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onBlur });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('onInput suppressed when disabled', () => {
    const onInput = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onInput, isDisabled: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).not.toHaveBeenCalled();
  });

  it('onInput suppressed when loading', () => {
    const onInput = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onInput, isLoading: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).not.toHaveBeenCalled();
  });

  it('onChange suppressed when disabled', () => {
    const onChange = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onChange, isDisabled: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange suppressed when loading', () => {
    const onChange = vi.fn();
    const el = createEl();
    new ArvoNumberInput(el, { onChange, isLoading: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Width
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - width', () => {
  it('sets --arvo-form-input-width on root when width option is provided', () => {
    const el = createEl();
    new ArvoNumberInput(el, { width: '200px' });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('200px');
  });

  it('does not set --arvo-form-input-width when width is not provided', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('');
  });

  it('fullWidth sets --arvo-form-input-width to 100%', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isFullWidth: true });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('fullWidth takes precedence over width option', () => {
    const el = createEl();
    new ArvoNumberInput(el, { isFullWidth: true, width: '200px' });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('width() getter returns current width', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { width: '200px' });
    expect(instance.width()).toBe('200px');
  });

  it('width() getter returns null when not set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    expect(instance.width()).toBeNull();
  });

  it('width(value) setter updates CSS variable', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.width('400px');
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('400px');
  });

  it('width(value) setter updates getter', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.width('50%');
    expect(instance.width()).toBe('50%');
  });
});

// ---------------------------------------------------------------------------
// Actions overlay
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - actions overlay', () => {
  it('creates __actions container inside __field', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const field = el.querySelector('.arvo-number-input__field');
    const actions = el.querySelector('.arvo-number-input__actions');
    expect(actions).not.toBeNull();
    expect(field!.contains(actions)).toBe(true);
  });

  it('__actions is always rendered even without inline error', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__actions')).not.toBeNull();
  });

  it('inline error icon is inside __actions container', () => {
    const el = createEl();
    new ArvoNumberInput(el, { errorDisplay: 'tooltip', isInvalid: true });
    const actions = el.querySelector('.arvo-number-input__actions');
    const errIco = el.querySelector('.arvo-number-input__err-ico');
    expect(errIco).not.toBeNull();
    expect(actions!.contains(errIco)).toBe(true);
  });

  it('__actions has no children when no inline error', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const actions = el.querySelector('.arvo-number-input__actions')!;
    expect(actions.children.length).toBe(0);
  });

  it('__actions appears before __steppers in DOM order', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const field = el.querySelector('.arvo-number-input__field')!;
    const children = Array.from(field.children);
    const actionsIdx = children.findIndex(c => c.classList.contains('arvo-number-input__actions'));
    const steppersIdx = children.findIndex(c => c.classList.contains('arvo-number-input__steppers'));
    expect(actionsIdx).toBeLessThan(steppersIdx);
  });

  it('destroy removes __actions from DOM', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(el.querySelector('.arvo-number-input__actions')).toBeNull();
  });

  it('destroy removes --arvo-form-input-width CSS variable', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { width: '200px' });
    instance.destroy();
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('');
  });

  it('inline error icon renders as ArvoMessageAlert with role="alert" and aria-label', () => {
    const el = createEl();
    new ArvoNumberInput(el, {
      errorDisplay: 'tooltip',
      isInvalid: true,
      errorMsg: 'Bad value',
    });
    const errIco = el.querySelector('.arvo-number-input__err-ico');
    expect(errIco).not.toBeNull();
    expect(errIco!.classList.contains('arvo-msg-alert')).toBe(true);
    expect(errIco!.classList.contains('arvo-msg-alert--inline')).toBe(true);
    expect(errIco!.getAttribute('role')).toBe('alert');
    expect(errIco!.getAttribute('aria-label')).toBe('Bad value');
  });

  it('error icon only created when both inlineError and invalid are true', () => {
    const el = createEl();
    new ArvoNumberInput(el, { errorDisplay: 'tooltip', isInvalid: false });
    expect(el.querySelector('.arvo-number-input__err-ico')).toBeNull();
  });

  it('setError creates error icon dynamically when inlineError mode', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { errorDisplay: 'tooltip' });
    expect(el.querySelector('.arvo-number-input__err-ico')).toBeNull();
    instance.setError('Error');
    expect(el.querySelector('.arvo-number-input__err-ico')).not.toBeNull();
    const actions = el.querySelector('.arvo-number-input__actions')!;
    expect(actions.contains(el.querySelector('.arvo-number-input__err-ico'))).toBe(true);
  });

  it('setError(false) removes error icon from actions', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { errorDisplay: 'tooltip', isInvalid: true });
    expect(el.querySelector('.arvo-number-input__err-ico')).not.toBeNull();
    instance.setError(false);
    expect(el.querySelector('.arvo-number-input__err-ico')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Floating point precision
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - floating point precision', () => {
  it('step=0.1 produces precise values on increment', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0.1, step: 0.1 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBeCloseTo(0.2, 10);
    expect(el.querySelector('input')!.value).toBe('0.2');
  });

  it('step=0.01 works correctly', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0.01, step: 0.01 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    incBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    incBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(instance.value()).toBeCloseTo(0.02, 10);
    expect(el.querySelector('input')!.value).toBe('0.02');
  });

  it('value() returns null when input is empty with decimal step', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { step: 0.1 });
    expect(instance.value()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Prefix slot (ADR-6 enhancement)
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - prefix slot', () => {
  // (1) Renders prefix string when set; renders no __prefix element when
  //     prefix is null or empty string.
  it('renders __prefix element with the supplied string when prefix is set', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', value: -2 });
    const prefixEl = el.querySelector('.arvo-number-input__prefix');
    expect(prefixEl).not.toBeNull();
    expect(prefixEl!.textContent).toBe('Wk');
  });

  it('does not render __prefix element when prefix option is omitted', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__prefix')).toBeNull();
  });

  it('does not render __prefix element when prefix is null', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: null });
    expect(el.querySelector('.arvo-number-input__prefix')).toBeNull();
  });

  it('does not render __prefix element when prefix is empty string', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: '' });
    expect(el.querySelector('.arvo-number-input__prefix')).toBeNull();
  });

  it('adds --has-prefix block modifier class when prefix is set', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'px' });
    expect(el.classList.contains('arvo-number-input--has-prefix')).toBe(true);
  });

  it('does not add --has-prefix modifier when prefix is null', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.classList.contains('arvo-number-input--has-prefix')).toBe(false);
  });

  it('does not add --has-prefix modifier when prefix is empty string', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: '' });
    expect(el.classList.contains('arvo-number-input--has-prefix')).toBe(false);
  });

  it('__prefix renders inside __field, before __input, followed by __prefix-sep', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Mo' });
    const field = el.querySelector('.arvo-number-input__field')!;
    const prefixEl = el.querySelector('.arvo-number-input__prefix')!;
    const prefixSepEl = el.querySelector('.arvo-number-input__prefix-sep')!;
    const inputEl = el.querySelector('.arvo-number-input__input')!;
    expect(field.contains(prefixEl)).toBe(true);
    expect(field.contains(prefixSepEl)).toBe(true);
    const children = Array.from(field.children);
    const prefixIdx = children.indexOf(prefixEl);
    const sepIdx = children.indexOf(prefixSepEl);
    const inputIdx = children.indexOf(inputEl);
    expect(prefixIdx).toBeLessThan(sepIdx);
    expect(sepIdx).toBeLessThan(inputIdx);
  });

  it('renders __prefix-sep whenever prefix is set', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Mo' });
    expect(el.querySelector('.arvo-number-input__prefix-sep')).not.toBeNull();
  });

  it('does NOT render __prefix-sep when prefix is omitted', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.querySelector('.arvo-number-input__prefix-sep')).toBeNull();
  });

  // (2) number-input:change payload contains only the numeric value (no prefix).
  it('number-input:change payload contains only the numeric value (no prefix)', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { prefix: 'Wk', value: 3 });
    const handler = vi.fn();
    el.addEventListener('number-input:change', handler);
    instance.value(7);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).not.toHaveProperty('prefix');
    expect(typeof detail.value).toBe('number');
    expect(Object.keys(detail).sort()).toEqual(['previousValue', 'value']);
  });

  // (3) Inline-flex contract: the prefix is a flex sibling of __input, not
  //     an absolute overlay, so no left-padding CSS variable is needed.
  it('does NOT write --arvo-form-input-pad-l on __field (legacy overlay removed)', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk' });
    const field = el.querySelector('.arvo-number-input__field') as HTMLElement;
    expect(field.style.getPropertyValue('--arvo-form-input-pad-l')).toBe('');
  });

  it('exposes no legacy _updatePrefixPadding method (cleanup verified)', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { prefix: 'Wk' });
    expect((instance as unknown as { _updatePrefixPadding?: unknown })._updatePrefixPadding).toBeUndefined();
  });

  // (4) Disabled / readonly / invalid states style the prefix appropriately.
  it('disabled adds is-disabled class so SCSS re-points the prefix color token', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(el.querySelector('.arvo-number-input__prefix')).not.toBeNull();
  });

  it('readonly keeps prefix rendered with no disabled color override', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
    expect(el.classList.contains('is-disabled')).toBe(false);
    expect(el.querySelector('.arvo-number-input__prefix')).not.toBeNull();
  });

  it('invalid keeps prefix rendered (error border owns the error feedback)', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
    expect(el.querySelector('.arvo-number-input__prefix')).not.toBeNull();
  });

  // (5) aria-hidden="true" is set on __prefix.
  it('__prefix carries aria-hidden="true"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk' });
    const prefixEl = el.querySelector('.arvo-number-input__prefix')!;
    expect(prefixEl.getAttribute('aria-hidden')).toBe('true');
  });

  // (6) Clicking the prefix focuses the <input> and does not select prefix text.
  it('mousedown on __prefix focuses the inner input', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk' });
    const prefixEl = el.querySelector('.arvo-number-input__prefix')!;
    const input = el.querySelector('input') as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    prefixEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('mousedown on __prefix calls preventDefault (no selection in prefix)', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk' });
    const prefixEl = el.querySelector('.arvo-number-input__prefix')!;
    const downEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    prefixEl.dispatchEvent(downEvent);
    expect(downEvent.defaultPrevented).toBe(true);
  });

  // (7) Backspace at caret position 0 does not affect the prefix.
  // type="number" inputs do not expose setSelectionRange in jsdom (an
  // InvalidStateError is thrown), so we test the structural contract
  // instead: the prefix is a sibling element outside the input, so a
  // Backspace keydown targeted at the input can never mutate the prefix DOM.
  it('backspace targeted at the input leaves the prefix element intact', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', value: 5 });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
    );
    const prefixEl = el.querySelector('.arvo-number-input__prefix');
    expect(prefixEl).not.toBeNull();
    expect(prefixEl!.textContent).toBe('Wk');
    expect(input.parentElement).toBe(prefixEl!.parentElement);
  });

  // (8) Cmd/Ctrl+A selects only the numeric value (prefix lives outside the input).
  it('input value never contains the prefix string (prefix is sibling, not value)', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', value: 42 });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('42');
    expect(input.value).not.toContain('Wk');
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true })
    );
    expect(input.value).toBe('42');
  });

  // (9) Tooltip fires on prefix hover when prefixTooltip is set.
  it('connects a tooltip on __prefix when prefixTooltip is set', () => {
    const el = createEl();
    expect(() => new ArvoNumberInput(el, { prefix: 'Wk', prefixTooltip: 'Weeks' })).not.toThrow();
    expect(el.querySelector('.arvo-number-input__prefix')).not.toBeNull();
  });

  it('does not connect a tooltip when prefixTooltip is null', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', prefixTooltip: null });
    expect(el.querySelector('.arvo-number-input__prefix')).not.toBeNull();
  });

  // (10) RTL: the inline-flex affix slot lays out in DOM order; the browser
  //      flips it automatically under `dir="rtl"`. No JS plumbing required.
  it('RTL: __prefix is still rendered as a flex sibling of __input regardless of dir', () => {
    document.body.setAttribute('dir', 'rtl');
    try {
      const el = createEl();
      new ArvoNumberInput(el, { prefix: 'Wk' });
      const field = el.querySelector('.arvo-number-input__field')!;
      const prefixEl = el.querySelector('.arvo-number-input__prefix')!;
      const inputEl = el.querySelector('.arvo-number-input__input')!;
      expect(field.contains(prefixEl)).toBe(true);
      const children = Array.from(field.children);
      expect(children.indexOf(prefixEl)).toBeLessThan(children.indexOf(inputEl));
    } finally {
      document.body.removeAttribute('dir');
    }
  });

  // (11) Stepper buttons remain on the trailing edge in both LTR and RTL.
  it('__steppers is the last positioned flex child of __field', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk' });
    const field = el.querySelector('.arvo-number-input__field')!;
    const children = Array.from(field.children);
    const steppersIdx = children.findIndex(c =>
      c.classList.contains('arvo-number-input__steppers')
    );
    const prefixIdx = children.findIndex(c =>
      c.classList.contains('arvo-number-input__prefix')
    );
    expect(steppersIdx).toBeGreaterThan(prefixIdx);
  });

  // (12) Loading skeleton (Pattern A) covers prefix + input + steppers.
  it('loading class on the block leaves __prefix inside __field which receives the shimmer', () => {
    const el = createEl();
    new ArvoNumberInput(el, { prefix: 'Wk', isLoading: true });
    const field = el.querySelector('.arvo-number-input__field')!;
    const prefixEl = el.querySelector('.arvo-number-input__prefix')!;
    expect(el.classList.contains('loading')).toBe(true);
    expect(field.contains(prefixEl)).toBe(true);
  });

  // Lifecycle: destroy cleans up the prefix element + observer + connector.
  it('destroy removes __prefix from DOM when prefix was set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { prefix: 'Wk', prefixTooltip: 'Weeks' });
    expect(el.querySelector('.arvo-number-input__prefix')).not.toBeNull();
    instance.destroy();
    expect(el.querySelector('.arvo-number-input__prefix')).toBeNull();
  });

  it('destroy removes --has-prefix modifier class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { prefix: 'Wk' });
    instance.destroy();
    expect(el.classList.contains('arvo-number-input--has-prefix')).toBe(false);
  });

  it('destroy does not throw when prefix was set with a tooltip', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { prefix: 'Wk', prefixTooltip: 'Weeks' });
    expect(() => instance.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suffix slot (form-input-affix pattern)
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - suffix slot', () => {
  it('renders __suffix when suffix is set', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: 'kg', value: 5 });
    const suffixEl = el.querySelector('.arvo-number-input__suffix');
    expect(suffixEl).not.toBeNull();
    expect(suffixEl!.textContent).toBe('kg');
  });

  it('omits __suffix when option is null / empty / undefined', () => {
    const el1 = createEl();
    new ArvoNumberInput(el1);
    expect(el1.querySelector('.arvo-number-input__suffix')).toBeNull();
    const el2 = createEl();
    new ArvoNumberInput(el2, { suffix: null });
    expect(el2.querySelector('.arvo-number-input__suffix')).toBeNull();
    const el3 = createEl();
    new ArvoNumberInput(el3, { suffix: '' });
    expect(el3.querySelector('.arvo-number-input__suffix')).toBeNull();
  });

  it('adds arvo-number-input--has-suffix marker class', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: '%' });
    expect(el.classList.contains('arvo-number-input--has-suffix')).toBe(true);
  });

  it('does not add --has-suffix when suffix is empty', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: '' });
    expect(el.classList.contains('arvo-number-input--has-suffix')).toBe(false);
  });

  it('__suffix sits after __input and before __actions / __steppers', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: 'kg' });
    const field = el.querySelector('.arvo-number-input__field')!;
    const children = Array.from(field.children);
    const inputIdx = children.findIndex(c => c.classList.contains('arvo-number-input__input'));
    const suffixIdx = children.findIndex(c => c.classList.contains('arvo-number-input__suffix'));
    const actionsIdx = children.findIndex(c => c.classList.contains('arvo-number-input__actions'));
    const steppersIdx = children.findIndex(c => c.classList.contains('arvo-number-input__steppers'));
    expect(suffixIdx).toBeGreaterThan(inputIdx);
    expect(suffixIdx).toBeLessThan(actionsIdx);
    if (steppersIdx >= 0) expect(suffixIdx).toBeLessThan(steppersIdx);
  });

  it('__suffix carries aria-hidden="true"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: 'kg' });
    expect(el.querySelector('.arvo-number-input__suffix')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('mousedown on __suffix focuses the inner input', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: 'kg' });
    const suffixEl = el.querySelector('.arvo-number-input__suffix')!;
    const input = el.querySelector('input') as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    suffixEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('mousedown on __suffix calls preventDefault', () => {
    const el = createEl();
    new ArvoNumberInput(el, { suffix: 'kg' });
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.querySelector('.arvo-number-input__suffix')!.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('connects a tooltip on __suffix when suffixTooltip is set', () => {
    const el = createEl();
    expect(() => new ArvoNumberInput(el, { suffix: 'kg', suffixTooltip: 'Kilograms' })).not.toThrow();
    expect(el.querySelector('.arvo-number-input__suffix')).not.toBeNull();
  });

  it('suffix() / suffixTooltip() methods: getter, setter, removal', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    expect(instance.suffix()).toBeNull();
    instance.suffix('kg');
    expect(instance.suffix()).toBe('kg');
    expect(el.querySelector('.arvo-number-input__suffix')!.textContent).toBe('kg');
    instance.suffix('%');
    expect(el.querySelector('.arvo-number-input__suffix')!.textContent).toBe('%');
    instance.suffixTooltip('Percent');
    expect(instance.suffixTooltip()).toBe('Percent');
    instance.suffix(null);
    expect(el.querySelector('.arvo-number-input__suffix')).toBeNull();
    expect(instance.suffix()).toBeNull();
  });

  it('destroy removes __suffix from DOM when suffix was set', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { suffix: 'kg', suffixTooltip: 'Kilograms' });
    expect(el.querySelector('.arvo-number-input__suffix')).not.toBeNull();
    instance.destroy();
    expect(el.querySelector('.arvo-number-input__suffix')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Inner component composition (ArvoButton)
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - inner component composition', () => {
  it('stepper buttons render as ArvoIconButton instances (have arvo-icon-btn class)', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(incBtn.classList.contains('arvo-icon-btn')).toBe(true);
    expect(decBtn.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('stepper buttons have tertiary variant class', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(incBtn.classList.contains('arvo-btn--tertiary')).toBe(true);
    expect(decBtn.classList.contains('arvo-btn--tertiary')).toBe(true);
  });

  it('stepper buttons have sm size class', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(incBtn.classList.contains('arvo-btn--sm')).toBe(true);
    expect(decBtn.classList.contains('arvo-btn--sm')).toBe(true);
  });

  it('disabled(true) disables stepper buttons', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.disabled(true);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn') as HTMLButtonElement;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(true);
    expect(decBtn.disabled).toBe(true);
  });

  it('disabled(false) re-enables stepper buttons', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    instance.disabled(false);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn') as HTMLButtonElement;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(false);
    expect(decBtn.disabled).toBe(false);
  });

  it('setLoading(true) disables stepper buttons', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.setLoading(true);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn') as HTMLButtonElement;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(true);
    expect(decBtn.disabled).toBe(true);
  });

  it('setLoading(false) re-enables stepper buttons when not disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isLoading: true });
    instance.setLoading(false);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn') as HTMLButtonElement;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(false);
    expect(decBtn.disabled).toBe(false);
  });

  it('setLoading(false) keeps stepper buttons disabled when parent is disabled', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true, isLoading: true });
    instance.setLoading(false);
    const incBtn = el.querySelector('.arvo-number-input__increment-btn') as HTMLButtonElement;
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(true);
    expect(decBtn.disabled).toBe(true);
  });

  it('at-max: increment button has aria-disabled="true"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 10, max: 10 });
    const incBtn = el.querySelector('.arvo-number-input__increment-btn')!;
    expect(incBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('at-min: decrement button has aria-disabled="true"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { value: 0, min: 0 });
    const decBtn = el.querySelector('.arvo-number-input__decrement-btn')!;
    expect(decBtn.getAttribute('aria-disabled')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------
describe('ArvoNumberInput - destroy', () => {
  it('removes arvo-number-input base class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(el.classList.contains('arvo-number-input')).toBe(false);
  });

  it('removes size classes', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    ArvoNumberInput.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-number-input--${s}`)).toBe(false);
    });
  });

  it('removes is-disabled class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isDisabled: true });
    instance.destroy();
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('removes is-readonly class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isReadOnly: true });
    instance.destroy();
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('removes has-error class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isInvalid: true });
    instance.destroy();
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('removes loading class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isLoading: true });
    instance.destroy();
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('removes at-min class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 0, min: 0 });
    instance.destroy();
    expect(el.classList.contains('at-min')).toBe(false);
  });

  it('removes at-max class', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { value: 10, max: 10 });
    instance.destroy();
    expect(el.classList.contains('at-max')).toBe(false);
  });

  it('removes aria-busy attribute', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { isLoading: true });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes role attribute', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('removes field element from DOM', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(el.querySelector('.arvo-number-input__field')).toBeNull();
  });

  it('removes border element from DOM', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(el.querySelector('.arvo-number-input__border')).toBeNull();
  });

  it('removes label element from DOM', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { label: 'Qty' });
    instance.destroy();
    expect(el.querySelector('label')).toBeNull();
  });

  it('removes inline alert from DOM', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('removes error icon from DOM when inlineError', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el, { errorDisplay: 'tooltip' });
    instance.destroy();
    expect(el.querySelector('.arvo-number-input__err-ico')).toBeNull();
  });

  it('does not remove the container element itself', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(document.body.contains(el)).toBe(true);
  });

  it('does not call onChange callback after destroy', () => {
    const onChange = vi.fn();
    const el = createEl();
    const instance = new ArvoNumberInput(el, { onChange });
    const input = el.querySelector('input')!;
    instance.destroy();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onInput callback after destroy', () => {
    const onInput = vi.fn();
    const el = createEl();
    const instance = new ArvoNumberInput(el, { onInput });
    const input = el.querySelector('input')!;
    instance.destroy();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createEl();
    const instance = new ArvoNumberInput(el);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Surface (filled default | base)
// ---------------------------------------------------------------------------
describe('NumberInput - surface', () => {
  it('applies arvo-number-input--surface-filled by default', () => {
    const el = createEl();
    new ArvoNumberInput(el);
    expect(el.classList.contains('arvo-number-input--surface-filled')).toBe(true);
  });

  it('applies arvo-number-input--surface-base when surface: "base"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { surface: 'base' });
    expect(el.classList.contains('arvo-number-input--surface-base')).toBe(true);
  });

  it('applies arvo-number-input--surface-filled when surface: "filled"', () => {
    const el = createEl();
    new ArvoNumberInput(el, { surface: 'filled' });
    expect(el.classList.contains('arvo-number-input--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    const el = createEl();
    new ArvoNumberInput(el, { surface: 'base' });
    expect(el.classList.contains('arvo-number-input--surface-base')).toBe(true);
    expect(el.classList.contains('arvo-number-input--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('NumberInput - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createEl();
    new ArvoNumberInput(el, { label: 'Quantity' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createEl();
    new ArvoNumberInput(el, {
      label: 'Quantity',
      contextHelp: { content: 'Whole units only.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createEl();
    new ArvoNumberInput(el, { contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
