import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoCheckbox } from './Checkbox';
function createCheckboxElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ArvoCheckbox -- initialization', () => {
  it('static initialize() returns an ArvoCheckbox instance', () => {
    const el = createCheckboxElement();
    const instance = ArvoCheckbox.initialize(el);
    expect(instance).toBeInstanceOf(ArvoCheckbox);
  });

  it('constructor returns an ArvoCheckbox instance', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    expect(instance).toBeInstanceOf(ArvoCheckbox);
  });

  it('adds arvo-cb class to element', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.classList.contains('arvo-cb')).toBe(true);
  });

  it('renders a label.arvo-cb__field inside root', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    const field = el.querySelector('label.arvo-cb__field');
    expect(field).not.toBeNull();
  });

  it('renders a checkbox input element', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('does not render __lbl when label is null (default)', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.querySelector('.arvo-cb__lbl')).toBeNull();
  });

  it('renders __lbl when label is provided', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'Accept terms' });
    const lbl = el.querySelector('.arvo-cb__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.textContent).toBe('Accept terms');
  });

  it('does not render __box or __checkmark', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.querySelector('.arvo-cb__box')).toBeNull();
    expect(el.querySelector('.arvo-cb__checkmark')).toBeNull();
  });

  it('sets value to "on" by default', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('on');
  });
});

describe('ArvoCheckbox -- size option', () => {
  it('applies arvo-cb--lg by default', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.classList.contains('arvo-cb--lg')).toBe(true);
  });

  it('applies arvo-cb--sm when size is "sm"', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { size: 'sm' });
    expect(el.classList.contains('arvo-cb--sm')).toBe(true);
  });
});

describe('ArvoCheckbox -- checked state', () => {
  it('input is unchecked by default', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect((el.querySelector('input') as HTMLInputElement).checked).toBe(false);
  });

  it('sets input.checked when checked option is true', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isChecked: true });
    expect((el.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('does not set aria-checked on root', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isChecked: true });
    expect(el.getAttribute('aria-checked')).toBeNull();
  });
});

describe('ArvoCheckbox -- indeterminate state', () => {
  it('sets data-indeterminate on root when indeterminate', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isIndeterminate: true });
    expect(el.getAttribute('data-indeterminate')).toBe('true');
  });

  it('sets input.indeterminate when indeterminate option is true', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isIndeterminate: true });
    expect((el.querySelector('input') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('sets data-indeterminate attribute on input', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isIndeterminate: true });
    expect(el.querySelector('input')?.getAttribute('data-indeterminate')).toBe('true');
  });
});

describe('ArvoCheckbox -- disabled state', () => {
  it('adds is-disabled class when disabled', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('sets input.disabled when disabled', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isDisabled: true });
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('ArvoCheckbox -- readonly state', () => {
  it('adds is-readonly class when readonly', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('suppresses change handler when readonly', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isReadOnly: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoCheckbox -- excluded state', () => {
  it('sets data-excluded on root when excluded', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isExcluded: true });
    expect(el.getAttribute('data-excluded')).toBe('true');
  });

  it('does not set data-excluded when not excluded', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.getAttribute('data-excluded')).toBeNull();
  });
});

describe('ArvoCheckbox -- error state & inline alert', () => {
  it('adds has-error class when invalid', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('sets aria-invalid on input when invalid', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isInvalid: true });
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders inline alert when invalid and inlineError (default)', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isInvalid: true });
    const alert = el.querySelector('.arvo-msg-alert');
    expect(alert).not.toBeNull();
    expect(alert?.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Error');
  });

  it('renders custom errorMsg in inline alert', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isInvalid: true, errorMsg: 'Required field' });
    expect(el.querySelector('.arvo-msg-alert__msg')?.textContent).toBe('Required field');
  });

  it('hides inline alert when not invalid (display none)', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { errorDisplay: 'inline' });
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement;
    expect(alert.style.display).toBe('none');
  });

  it('does not create inline alert when errorDisplay is "none"', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isInvalid: true, errorDisplay: 'none' });
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('sets aria-describedby on input to inline alert id', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isInvalid: true });
    const input = el.querySelector('input') as HTMLInputElement;
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement;
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });
});

describe('ArvoCheckbox -- required state', () => {
  it('sets aria-required on input', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isRequired: true });
    expect(el.querySelector('input')?.getAttribute('aria-required')).toBe('true');
  });

  it('sets input.required when required', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isRequired: true });
    expect((el.querySelector('input') as HTMLInputElement).required).toBe(true);
  });
});

describe('ArvoCheckbox -- loading state', () => {
  it('adds loading class when loading', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('sets aria-busy on root when loading', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('does not set aria-busy when not loading', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });
});

describe('ArvoCheckbox -- toggle(true)', () => {
  it('sets input.checked to true', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.toggle(true);
    expect((el.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('dispatches checkbox:change custom event', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    const handler = vi.fn();
    el.addEventListener('checkbox:change', handler);
    instance.toggle(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls onChange callback with { checked: true, value }', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { value: 'v1', onChange });
    instance.toggle(true);
    expect(onChange).toHaveBeenCalledWith({ isChecked: true, value: 'v1' });
  });

  it('is a no-op when already checked and not indeterminate', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true, onChange });
    instance.toggle(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears indeterminate state', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isIndeterminate: true });
    instance.toggle(true);
    expect((el.querySelector('input') as HTMLInputElement).indeterminate).toBe(false);
    expect(el.getAttribute('data-indeterminate')).toBeNull();
  });

  it('is a no-op when readonly', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isReadOnly: true, onChange });
    instance.toggle(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoCheckbox -- toggle(false)', () => {
  it('sets input.checked to false', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true });
    instance.toggle(false);
    expect((el.querySelector('input') as HTMLInputElement).checked).toBe(false);
  });

  it('dispatches checkbox:change custom event', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true });
    const handler = vi.fn();
    el.addEventListener('checkbox:change', handler);
    instance.toggle(false);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls onChange callback with { checked: false, value }', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true, value: 'v2', onChange });
    instance.toggle(false);
    expect(onChange).toHaveBeenCalledWith({ isChecked: false, value: 'v2' });
  });

  it('is a no-op when already unchecked and not indeterminate', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: false, onChange });
    instance.toggle(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears indeterminate state', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isIndeterminate: true });
    instance.toggle(false);
    expect((el.querySelector('input') as HTMLInputElement).indeterminate).toBe(false);
    expect(el.getAttribute('data-indeterminate')).toBeNull();
  });

  it('is a no-op when readonly', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true, isReadOnly: true, onChange });
    instance.toggle(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoCheckbox -- toggle()', () => {
  it('toggles from unchecked to checked', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: false });
    instance.toggle();
    expect(instance.checked()).toBe(true);
  });

  it('toggles from checked to unchecked', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true });
    instance.toggle();
    expect(instance.checked()).toBe(false);
  });

  it('resolves indeterminate to checked when toggled', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isIndeterminate: true });
    instance.toggle();
    expect(instance.checked()).toBe(true);
    expect(el.getAttribute('data-indeterminate')).toBeNull();
  });

  it('is a no-op when disabled', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isDisabled: true, onChange });
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is a no-op when loading', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isLoading: true, onChange });
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is a no-op when readonly', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isReadOnly: true, onChange });
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoCheckbox -- checked()', () => {
  it('returns false initially when not checked', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    expect(instance.checked()).toBe(false);
  });

  it('returns true when initialized with checked: true', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true });
    expect(instance.checked()).toBe(true);
  });

  it('returns true after toggle(true) is called', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.toggle(true);
    expect(instance.checked()).toBe(true);
  });

  it('returns false after toggle(false) is called', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true });
    instance.toggle(false);
    expect(instance.checked()).toBe(false);
  });
});

describe('ArvoCheckbox -- indeterminate()', () => {
  it('returns false when not indeterminate', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    expect(instance.indeterminate()).toBe(false);
  });

  it('returns true when initialized with indeterminate: true', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isIndeterminate: true });
    expect(instance.indeterminate()).toBe(true);
  });
});

describe('ArvoCheckbox -- indeterminate(state)', () => {
  it('indeterminate(true) sets input.indeterminate to true', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.indeterminate(true);
    expect((el.querySelector('input') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('indeterminate(true) sets data-indeterminate on root', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.indeterminate(true);
    expect(el.getAttribute('data-indeterminate')).toBe('true');
  });

  it('indeterminate(true) sets data-indeterminate on input', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.indeterminate(true);
    expect(el.querySelector('input')?.getAttribute('data-indeterminate')).toBe('true');
  });

  it('indeterminate(false) removes indeterminate', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isIndeterminate: true });
    instance.indeterminate(false);
    expect((el.querySelector('input') as HTMLInputElement).indeterminate).toBe(false);
    expect(el.getAttribute('data-indeterminate')).toBeNull();
  });
});

describe('ArvoCheckbox -- excluded(state)', () => {
  it('excluded(true) sets data-excluded on root', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.excluded(true);
    expect(el.getAttribute('data-excluded')).toBe('true');
  });

  it('excluded(false) removes data-excluded from root', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isExcluded: true });
    instance.excluded(false);
    expect(el.getAttribute('data-excluded')).toBeNull();
  });
});

describe('ArvoCheckbox -- setLabel()', () => {
  it('creates __lbl span when label set from null', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    expect(el.querySelector('.arvo-cb__lbl')).toBeNull();
    instance.setLabel('New Label');
    const lbl = el.querySelector('.arvo-cb__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.textContent).toBe('New Label');
  });

  it('updates existing label text', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { label: 'Old' });
    instance.setLabel('Updated');
    expect(el.querySelector('.arvo-cb__lbl')?.textContent).toBe('Updated');
  });

  it('removes __lbl when set to null', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { label: 'Temp' });
    instance.setLabel(null);
    expect(el.querySelector('.arvo-cb__lbl')).toBeNull();
  });
});

describe('ArvoCheckbox -- disabled(state)', () => {
  it('disabled(true) adds is-disabled class and disables input', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('disabled(false) removes is-disabled class and enables input', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(false);
  });

  it('returns false when not disabled', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    expect(instance.disabled()).toBe(false);
  });

  it('returns true when initialized with disabled: true', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('returns true after disabled(true) is called', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
  });

  it('returns false after disabled(false) is called', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isDisabled: true });
    instance.disabled(false);
    expect(instance.disabled()).toBe(false);
  });
});

describe('ArvoCheckbox -- readonly(state)', () => {
  it('readonly(true) adds is-readonly class', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.readonly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('readonly(false) removes is-readonly class', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isReadOnly: true });
    instance.readonly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('blocks toggle(true) after readonly(true)', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { onChange });
    instance.readonly(true);
    instance.toggle(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoCheckbox -- setError()', () => {
  it('setError(msg) adds has-error and shows inline alert', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.setError('Bad value');
    expect(el.classList.contains('has-error')).toBe(true);
    const alertMsg = el.querySelector('.arvo-msg-alert__msg');
    expect(alertMsg?.textContent).toBe('Bad value');
  });

  it('setError(\'\') uses default "Error" message', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.setError('');
    const alertMsg = el.querySelector('.arvo-msg-alert__msg');
    expect(alertMsg?.textContent).toBe('Error');
  });

  it('setError(msg) sets aria-invalid on input', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.setError('Error');
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(false) removes has-error class', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isInvalid: true });
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid from input', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isInvalid: true });
    instance.setError(false);
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) hides inline alert', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isInvalid: true });
    instance.setError(false);
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement;
    expect(alert.style.display).toBe('none');
  });
});

describe('ArvoCheckbox -- setLoading()', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) blurs input if it is focused', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    const input = el.querySelector('input') as HTMLInputElement;
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    instance.setLoading(true);
    expect(blurSpy).toHaveBeenCalledOnce();
  });
});

describe('ArvoCheckbox -- custom events', () => {
  it('checkbox:change fires when toggle(true) is called', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    const handler = vi.fn();
    el.addEventListener('checkbox:change', handler);
    instance.toggle(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('checkbox:change fires when toggle(false) is called', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isChecked: true });
    const handler = vi.fn();
    el.addEventListener('checkbox:change', handler);
    instance.toggle(false);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('checkbox:change detail contains correct checked and value', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { value: 'v3' });
    let detail: { isChecked: boolean; value: string } | null = null;
    el.addEventListener('checkbox:change', (e) => {
      detail = (e as CustomEvent<{ isChecked: boolean; value: string }>).detail;
    });
    instance.toggle(true);
    expect(detail).toEqual({ isChecked: true, value: 'v3' });
  });

  it('checkbox:change bubbles from root element', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    let bubbled = false;
    document.body.addEventListener('checkbox:change', () => {
      bubbled = true;
    });
    instance.toggle(true);
    expect(bubbled).toBe(true);
  });

  it('onChange callback is called when state changes', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { onChange });
    instance.toggle(true);
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe('ArvoCheckbox -- change suppression', () => {
  it('onChange is not called when disabled', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isDisabled: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange is not called when loading', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isLoading: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange is not called when readonly', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { isReadOnly: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onFocus callback is called on input focus', () => {
    const onFocus = vi.fn();
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { onFocus });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('onBlur callback is called on input blur', () => {
    const onBlur = vi.fn();
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { onBlur });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    expect(onBlur).toHaveBeenCalledOnce();
  });
});

describe('ArvoCheckbox -- destroy()', () => {
  it('removes arvo-cb class from element', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.destroy();
    expect(el.classList.contains('arvo-cb')).toBe(false);
  });

  it('removes size class from element', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.destroy();
    expect(el.classList.contains('arvo-cb--lg')).toBe(false);
  });

  it('removes aria-busy attribute', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isLoading: true });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes data-excluded attribute', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isExcluded: true });
    instance.destroy();
    expect(el.getAttribute('data-excluded')).toBeNull();
  });

  it('removes data-indeterminate attribute', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isIndeterminate: true });
    instance.destroy();
    expect(el.getAttribute('data-indeterminate')).toBeNull();
  });

  it('removes field child element', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.destroy();
    expect(el.querySelector('.arvo-cb__field')).toBeNull();
  });

  it('removes input child element', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.destroy();
    expect(el.querySelector('.arvo-cb__input')).toBeNull();
  });

  it('removes inline alert child element', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { isInvalid: true });
    instance.destroy();
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('onChange is not called after destroy when input dispatches change', () => {
    const onChange = vi.fn();
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    instance.destroy();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});

describe('ArvoCheckbox -- DOM structure (input-wrapper + svg icons)', () => {
  it('wraps the input in a span.arvo-cb__input-wrapper', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'With wrapper' });
    const wrapper = el.querySelector('span.arvo-cb__input-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('input.arvo-cb__input')).not.toBeNull();
  });

  it('renders both the check and dash SVG icons inside __input-wrapper', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    const wrapper = el.querySelector('.arvo-cb__input-wrapper');
    expect(wrapper?.querySelector('svg.arvo-cb__icon--check')).not.toBeNull();
    expect(wrapper?.querySelector('svg.arvo-cb__icon--dash')).not.toBeNull();
  });

  it('marks both SVG icons aria-hidden so they are ignored by AT', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    el.querySelectorAll('svg.arvo-cb__icon').forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('wraps label inside span.arvo-cb__text-container', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'Top-aligned' });
    const textContainer = el.querySelector('span.arvo-cb__text-container');
    expect(textContainer).not.toBeNull();
    expect(textContainer?.querySelector('.arvo-cb__lbl')).not.toBeNull();
  });

  it('omits __text-container when no label and no description', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el);
    expect(el.querySelector('.arvo-cb__text-container')).toBeNull();
  });
});

describe('ArvoCheckbox -- hasDescription / description', () => {
  it('does not render __desc by default', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'No desc', description: 'hidden' });
    expect(el.querySelector('.arvo-cb__desc')).toBeNull();
  });

  it('does not render __desc when hasDescription is true but description is empty', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'Empty desc', hasDescription: true, description: '' });
    expect(el.querySelector('.arvo-cb__desc')).toBeNull();
  });

  it('renders __desc when hasDescription is true and description is non-empty', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'With desc', hasDescription: true, description: 'Helper text' });
    const desc = el.querySelector('.arvo-cb__desc');
    expect(desc).not.toBeNull();
    expect(desc?.textContent).toBe('Helper text');
  });

  it('renders __desc inside __text-container after the label', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'Lbl', hasDescription: true, description: 'Desc' });
    const textContainer = el.querySelector('.arvo-cb__text-container');
    const children = Array.from(textContainer?.children ?? []);
    expect(children[0]?.classList.contains('arvo-cb__lbl')).toBe(true);
    expect(children[1]?.classList.contains('arvo-cb__desc')).toBe(true);
  });

  it('renders __desc + __text-container even when label is not set', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { hasDescription: true, description: 'Standalone desc' });
    const textContainer = el.querySelector('.arvo-cb__text-container');
    expect(textContainer).not.toBeNull();
    expect(textContainer?.querySelector('.arvo-cb__desc')?.textContent).toBe('Standalone desc');
    expect(el.querySelector('.arvo-cb__lbl')).toBeNull();
  });
});

describe('ArvoCheckbox -- setDescription()', () => {
  it('adds __desc after construction when hasDescription is true', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { label: 'Lbl', hasDescription: true });
    expect(el.querySelector('.arvo-cb__desc')).toBeNull();
    instance.setDescription('Added later');
    expect(el.querySelector('.arvo-cb__desc')?.textContent).toBe('Added later');
  });

  it('removes __desc when description is set to null', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, {
      label: 'Lbl',
      hasDescription: true,
      description: 'Initial',
    });
    expect(el.querySelector('.arvo-cb__desc')).not.toBeNull();
    instance.setDescription(null);
    expect(el.querySelector('.arvo-cb__desc')).toBeNull();
  });

  it('does not render __desc when hasDescription is false', () => {
    const el = createCheckboxElement();
    const instance = new ArvoCheckbox(el, { label: 'Lbl' });
    instance.setDescription('Ignored');
    expect(el.querySelector('.arvo-cb__desc')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Checkbox - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { label: 'Accept terms' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, {
      label: 'Accept terms',
      contextHelp: { content: 'Read our terms before agreeing.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createCheckboxElement();
    new ArvoCheckbox(el, { contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
