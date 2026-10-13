import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArvoRadio } from './Radio';
function createRadioElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const defaultOptions = {
  value: 'option-a',
  name: 'group',
  label: 'Option A',
};

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// 1. Initialization
// ---------------------------------------------------------------------------
describe('ArvoRadio -- initialization', () => {
  it('static initialize() returns an ArvoRadio instance', () => {
    const el = createRadioElement();
    const instance = ArvoRadio.initialize(el, defaultOptions);
    expect(instance).toBeInstanceOf(ArvoRadio);
  });

  it('constructor adds arvo-radio class to element', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    expect(el.classList.contains('arvo-radio')).toBe(true);
  });

  it('constructor renders an input element with type="radio"', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.type).toBe('radio');
  });

  it('constructor renders a __field label element', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    const field = el.querySelector('.arvo-radio__field');
    expect(field).not.toBeNull();
    expect(field?.tagName).toBe('LABEL');
  });

  it('constructor renders a __control span with aria-hidden="true"', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    const control = el.querySelector('.arvo-radio__control');
    expect(control).not.toBeNull();
    expect(control?.getAttribute('aria-hidden')).toBe('true');
  });

  it('constructor renders a __text span when label is provided', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    const text = el.querySelector('.arvo-radio__text');
    expect(text).not.toBeNull();
    expect(text?.textContent).toBe('Option A');
  });

  it('does NOT render __text span when label is null', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, label: null });
    expect(el.querySelector('.arvo-radio__text')).toBeNull();
  });

  it('does NOT render __circle or __dot elements', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    expect(el.querySelector('.arvo-radio__circle')).toBeNull();
    expect(el.querySelector('.arvo-radio__dot')).toBeNull();
  });

  it('constructor applies arvo-radio--lg class by default', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    expect(el.classList.contains('arvo-radio--lg')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Options
// ---------------------------------------------------------------------------
describe('ArvoRadio -- options', () => {
  it('sets the correct value on the input', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, value: 'opt-val' });
    expect(el.querySelector<HTMLInputElement>('input')?.value).toBe('opt-val');
  });

  it('sets the correct name on the input', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, name: 'my-group' });
    expect(el.querySelector<HTMLInputElement>('input')?.name).toBe('my-group');
  });

  it('sets __text text content from label', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, label: 'My Label' });
    expect(el.querySelector('.arvo-radio__text')?.textContent).toBe('My Label');
  });

  it('input is checked when checked: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isChecked: true });
    expect(el.querySelector<HTMLInputElement>('input')?.checked).toBe(true);
  });

  it('adds is-disabled class when disabled: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('sets input.disabled when disabled: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    expect(el.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);
  });

  it('adds is-readonly class when readonly: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('sets input.readOnly when readonly: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isReadOnly: true });
    expect(el.querySelector<HTMLInputElement>('input')?.readOnly).toBe(true);
  });

  it('sets tabIndex = -1 on input when readonly: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isReadOnly: true });
    expect(el.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(-1);
  });

  it('adds has-error class when invalid: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('sets aria-invalid="true" on input when invalid: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true });
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets aria-required="true" on input when required: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isRequired: true });
    expect(el.querySelector('input')?.getAttribute('aria-required')).toBe('true');
  });

  it('adds loading class when loading: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('sets aria-busy="true" on root when loading: true', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('does not set aria-busy when not loading', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Size
// ---------------------------------------------------------------------------
describe('ArvoRadio -- size', () => {
  it('applies arvo-radio--sm class when size: "sm"', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, size: 'sm' });
    expect(el.classList.contains('arvo-radio--sm')).toBe(true);
    expect(el.classList.contains('arvo-radio--lg')).toBe(false);
  });

  it('applies arvo-radio--lg class when size: "lg"', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, size: 'lg' });
    expect(el.classList.contains('arvo-radio--lg')).toBe(true);
    expect(el.classList.contains('arvo-radio--sm')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. errorMsg + invalid
// ---------------------------------------------------------------------------
describe('ArvoRadio -- errorMsg + invalid', () => {
  it('renders inline alert when invalid: true and errorMsg is set', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Required' });
    expect(el.querySelector('.arvo-msg-alert')).not.toBeNull();
  });

  it('inline alert has class arvo-msg-alert arvo-msg-alert--negative', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Required' });
    const alert = el.querySelector('.arvo-msg-alert');
    expect(alert?.classList.contains('arvo-msg-alert--negative')).toBe(true);
  });

  it('inline alert has role="alert"', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Required' });
    const alert = el.querySelector('.arvo-msg-alert');
    expect(alert?.getAttribute('role')).toBe('alert');
  });

  it('inline alert displays error message text', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Field required' });
    const msg = el.querySelector('.arvo-msg-alert__msg');
    expect(msg?.textContent).toBe('Field required');
  });

  it('sets aria-describedby on input pointing to alert id', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Required' });
    const input = el.querySelector<HTMLInputElement>('input');
    const alert = el.querySelector('.arvo-msg-alert');
    expect(input?.getAttribute('aria-describedby')).toBe(alert?.id);
  });

  it('does NOT render inline alert when invalid: false even with errorMsg', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: false, errorMsg: 'Required' });
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('does NOT render inline alert when errorMsg is null even with invalid', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: null });
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. select()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- select()', () => {
  it('sets input.checked to true', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.select();
    expect(el.querySelector<HTMLInputElement>('input')?.checked).toBe(true);
  });

  it('dispatches radio:change custom event', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    const listener = vi.fn();
    el.addEventListener('radio:change', listener);
    radio.select();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('calls onChange callback with { value, name }', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, value: 'opt-a', name: 'grp', onChange });
    radio.select();
    expect(onChange).toHaveBeenCalledWith({ value: 'opt-a', name: 'grp' });
  });

  it('is a no-op when already checked', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isChecked: true, onChange });
    radio.select();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is a no-op when disabled', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true, onChange });
    radio.select();
    expect(onChange).not.toHaveBeenCalled();
    expect(radio.checked()).toBe(false);
  });

  it('is a no-op when readonly', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isReadOnly: true, onChange });
    radio.select();
    expect(onChange).not.toHaveBeenCalled();
    expect(radio.checked()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. checked()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- checked()', () => {
  it('returns false initially when not checked', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    expect(radio.checked()).toBe(false);
  });

  it('returns true after select() is called', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.select();
    expect(radio.checked()).toBe(true);
  });

  it('returns true when initialized with checked: true', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isChecked: true });
    expect(radio.checked()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. disabled()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- disabled()', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets input.disabled to true', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.disabled(true);
    expect(el.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    radio.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) sets input.disabled to false', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    radio.disabled(false);
    expect(el.querySelector<HTMLInputElement>('input')?.disabled).toBe(false);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    expect(radio.disabled()).toBe(false);
  });

  it('disabled() returns true when initialized with disabled: true', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    expect(radio.disabled()).toBe(true);
  });

  it('disabled() returns true after disabled(true)', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.disabled(true);
    expect(radio.disabled()).toBe(true);
  });

  it('disabled() returns false after disabled(false)', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    radio.disabled(false);
    expect(radio.disabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. readonly()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- readonly()', () => {
  it('readonly(true) adds is-readonly class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.readonly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('readonly(true) sets tabIndex = -1 on input', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.readonly(true);
    expect(el.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(-1);
  });

  it('readonly(false) removes is-readonly class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isReadOnly: true });
    radio.readonly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('readonly(false) restores tabIndex = 0 on input', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isReadOnly: true });
    radio.readonly(false);
    expect(el.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(0);
  });

  it('readonly() returns false when not readonly', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    expect(radio.readonly()).toBe(false);
  });

  it('readonly() returns true when initialized with readonly: true', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isReadOnly: true });
    expect(radio.readonly()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. setLabel()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- setLabel()', () => {
  it('setLabel("New") creates __text span when none exists', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, label: null });
    expect(el.querySelector('.arvo-radio__text')).toBeNull();
    radio.setLabel('New');
    expect(el.querySelector('.arvo-radio__text')).not.toBeNull();
    expect(el.querySelector('.arvo-radio__text')?.textContent).toBe('New');
  });

  it('setLabel("Updated") updates existing text content', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setLabel('Updated');
    expect(el.querySelector('.arvo-radio__text')?.textContent).toBe('Updated');
  });

  it('setLabel(null) removes __text span', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    expect(el.querySelector('.arvo-radio__text')).not.toBeNull();
    radio.setLabel(null);
    expect(el.querySelector('.arvo-radio__text')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. setError()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- setError()', () => {
  it('setError("Msg") adds has-error class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setError('Msg');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError("Msg") sets aria-invalid="true" on input', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setError('Msg');
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError("Msg") renders inline alert with message', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setError('Msg');
    expect(el.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Msg');
  });

  it('setError("Msg") sets aria-describedby on input', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setError('Msg');
    const input = el.querySelector<HTMLInputElement>('input');
    const alert = el.querySelector('.arvo-msg-alert');
    expect(input?.getAttribute('aria-describedby')).toBe(alert?.id);
  });

  it('setError(false) removes has-error class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Msg' });
    radio.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes inline alert', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Msg' });
    radio.setError(false);
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('setError(false) removes aria-invalid from input', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Msg' });
    radio.setError(false);
    expect(el.querySelector('input')?.hasAttribute('aria-invalid')).toBe(false);
  });

  it('setError(false) removes aria-describedby from input', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Msg' });
    radio.setError(false);
    expect(el.querySelector('input')?.hasAttribute('aria-describedby')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. setLoading()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- setLoading()', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isLoading: true });
    radio.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isLoading: true });
    radio.setLoading(false);
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('setLoading(true) blurs input if it is focused', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.focus();
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true });
    const blurSpy = vi.spyOn(input, 'blur');
    radio.setLoading(true);
    expect(blurSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 12. Custom events
// ---------------------------------------------------------------------------
describe('ArvoRadio -- custom events', () => {
  it('radio:change bubbles from the root element', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    let bubbled = false;
    document.body.addEventListener('radio:change', () => { bubbled = true; });
    radio.select();
    expect(bubbled).toBe(true);
  });

  it('radio:change detail contains correct value and name', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, value: 'v1', name: 'n1' });
    let detail: { value: string; name: string } | null = null;
    el.addEventListener('radio:change', (e) => {
      detail = (e as CustomEvent).detail;
    });
    radio.select();
    expect(detail).toEqual({ value: 'v1', name: 'n1' });
  });
});

// ---------------------------------------------------------------------------
// 13. Callback props
// ---------------------------------------------------------------------------
describe('ArvoRadio -- callback props', () => {
  it('onChange is not called when change is suppressed (disabled)', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true, onChange });
    radio.select();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange is not called when change is suppressed (loading)', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isLoading: true, onChange });
    radio.select();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange is not called when change is suppressed (readonly)', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isReadOnly: true, onChange });
    radio.select();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onFocus callback is called on input focus', () => {
    const onFocus = vi.fn();
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, onFocus });
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('onBlur callback is called on input blur', () => {
    const onBlur = vi.fn();
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, onBlur });
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(onBlur).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 14. Keyboard navigation
// ---------------------------------------------------------------------------
function buildGroup(count: number, disabledIndices: number[] = []): ArvoRadio[] {
  return Array.from({ length: count }, (_, i) => {
    const el = createRadioElement();
    return new ArvoRadio(el, {
      value: `opt-${i}`,
      name: 'nav-group',
      label: `Option ${i}`,
      isDisabled: disabledIndices.includes(i),
    });
  });
}

describe('ArvoRadio -- keyboard navigation', () => {
  it('Space key selects the focused radio', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(radio.checked()).toBe(true);
  });

  it('Space key is a no-op when radio is already checked', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, isChecked: true, onChange });
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ArrowDown key moves focus to next radio in group', () => {
    const group = buildGroup(3);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[1], 'focus');
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('ArrowRight key moves focus to next radio in group', () => {
    const group = buildGroup(3);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[1], 'focus');
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('ArrowUp key moves focus to previous radio in group', () => {
    const group = buildGroup(3);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[0], 'focus');
    inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('ArrowLeft key moves focus to previous radio in group', () => {
    const group = buildGroup(3);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[0], 'focus');
    inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('arrow navigation wraps from last to first', () => {
    const group = buildGroup(3);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[0], 'focus');
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('arrow navigation wraps from first to last', () => {
    const group = buildGroup(3);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[2], 'focus');
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('arrow navigation skips disabled radios', () => {
    const group = buildGroup(3, [1]);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy = vi.spyOn(inputs[2], 'focus');
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('arrow navigation is suppressed when radio is disabled', () => {
    const group = buildGroup(3, [0]);
    const inputs = group.map(r => r['_inputEl'] as HTMLInputElement);
    const focusSpy1 = vi.spyOn(inputs[1], 'focus');
    const focusSpy2 = vi.spyOn(inputs[2], 'focus');
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(focusSpy1).not.toHaveBeenCalled();
    expect(focusSpy2).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 15. destroy()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- destroy()', () => {
  it('removes arvo-radio class from element', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.destroy();
    expect(el.classList.contains('arvo-radio')).toBe(false);
  });

  it('removes child elements (__field and inline alert)', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isInvalid: true, errorMsg: 'Err' });
    radio.destroy();
    expect(el.querySelector('.arvo-radio__field')).toBeNull();
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
    expect(el.children.length).toBe(0);
  });

  it('removes size class', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, size: 'sm' });
    radio.destroy();
    expect(el.classList.contains('arvo-radio--sm')).toBe(false);
    expect(el.classList.contains('arvo-radio--lg')).toBe(false);
  });

  it('event listeners do not fire after destroy', () => {
    const onChange = vi.fn();
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, onChange });
    radio.destroy();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.destroy();
    expect(() => radio.destroy()).not.toThrow();
  });

  it('removes aria-busy attribute when loading was active', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isLoading: true });
    radio.destroy();
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('removes is-disabled class when disabled was active', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, isDisabled: true });
    radio.destroy();
    expect(el.classList.contains('is-disabled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DOM structure (input-wrapper + text-container)
// ---------------------------------------------------------------------------
describe('ArvoRadio -- DOM structure (input-wrapper + text-container)', () => {
  it('wraps the input and control in a span.arvo-radio__input-wrapper', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    const wrapper = el.querySelector('span.arvo-radio__input-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('input.arvo-radio__input')).not.toBeNull();
    expect(wrapper?.querySelector('span.arvo-radio__control')).not.toBeNull();
  });

  it('wraps label inside span.arvo-radio__text-container', () => {
    const el = createRadioElement();
    new ArvoRadio(el, defaultOptions);
    const textContainer = el.querySelector('span.arvo-radio__text-container');
    expect(textContainer).not.toBeNull();
    expect(textContainer?.querySelector('.arvo-radio__text')).not.toBeNull();
  });

  it('omits __text-container when no label and no description', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { value: 'v', name: 'n' });
    expect(el.querySelector('.arvo-radio__text-container')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasDescription / description
// ---------------------------------------------------------------------------
describe('ArvoRadio -- hasDescription / description', () => {
  it('does not render __desc by default', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, description: 'hidden' });
    expect(el.querySelector('.arvo-radio__desc')).toBeNull();
  });

  it('does not render __desc when hasDescription is true but description is empty', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, hasDescription: true, description: '' });
    expect(el.querySelector('.arvo-radio__desc')).toBeNull();
  });

  it('renders __desc when hasDescription is true and description is non-empty', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, hasDescription: true, description: 'Helper text' });
    const desc = el.querySelector('.arvo-radio__desc');
    expect(desc).not.toBeNull();
    expect(desc?.textContent).toBe('Helper text');
  });

  it('renders __desc inside __text-container after the label', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { ...defaultOptions, hasDescription: true, description: 'Desc' });
    const textContainer = el.querySelector('.arvo-radio__text-container');
    const children = Array.from(textContainer?.children ?? []);
    expect(children[0]?.classList.contains('arvo-radio__text')).toBe(true);
    expect(children[1]?.classList.contains('arvo-radio__desc')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setDescription()
// ---------------------------------------------------------------------------
describe('ArvoRadio -- setDescription()', () => {
  it('adds __desc after construction when hasDescription is true', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, { ...defaultOptions, hasDescription: true });
    expect(el.querySelector('.arvo-radio__desc')).toBeNull();
    radio.setDescription('Added later');
    expect(el.querySelector('.arvo-radio__desc')?.textContent).toBe('Added later');
  });

  it('removes __desc when description is set to null', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, {
      ...defaultOptions,
      hasDescription: true,
      description: 'Initial',
    });
    expect(el.querySelector('.arvo-radio__desc')).not.toBeNull();
    radio.setDescription(null);
    expect(el.querySelector('.arvo-radio__desc')).toBeNull();
  });

  it('does not render __desc when hasDescription is false', () => {
    const el = createRadioElement();
    const radio = new ArvoRadio(el, defaultOptions);
    radio.setDescription('Ignored');
    expect(el.querySelector('.arvo-radio__desc')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Radio - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createRadioElement();
    new ArvoRadio(el, { value: 'a', name: 'grp', label: 'Option A' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createRadioElement();
    new ArvoRadio(el, {
      value: 'a',
      name: 'grp',
      label: 'Option A',
      contextHelp: { content: 'Choose the recommended setting.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createRadioElement();
    new ArvoRadio(el, {
      value: 'a',
      name: 'grp',
      contextHelp: { content: 'No label' },
    });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
