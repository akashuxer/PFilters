import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoSwitch } from './Switch';
function createSwitchElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ArvoSwitch -- initialization', () => {
  it('static initialize() returns an ArvoSwitch instance', () => {
    const el = createSwitchElement();
    const instance = ArvoSwitch.initialize(el);
    expect(instance).toBeInstanceOf(ArvoSwitch);
  });

  it('constructor returns an ArvoSwitch instance', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    expect(instance).toBeInstanceOf(ArvoSwitch);
  });

  it('adds arvo-sw class to element', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    expect(el.classList.contains('arvo-sw')).toBe(true);
  });

  it('renders a label.arvo-sw__field inside root', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    const field = el.querySelector('label.arvo-sw__field');
    expect(field).not.toBeNull();
  });

  it('renders a hidden checkbox input with role="switch"', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('role')).toBe('switch');
  });

  it('renders __track with __thumb inside', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    const track = el.querySelector('.arvo-sw__track');
    expect(track).not.toBeNull();
    expect(track?.querySelector('.arvo-sw__thumb')).not.toBeNull();
  });

  it('does not render __lbl when label is null (default)', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    expect(el.querySelector('.arvo-sw__lbl')).toBeNull();
  });

  it('renders __lbl when label is provided', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { label: 'Enable notifications' });
    const lbl = el.querySelector('.arvo-sw__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.textContent).toBe('Enable notifications');
  });

  it('sets value to "on" by default', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('on');
  });
});

describe('ArvoSwitch -- checked state', () => {
  it('input is unchecked by default', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(false);
    expect(input.getAttribute('aria-checked')).toBe('false');
  });

  it('sets input.checked and aria-checked when checked option is true', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { isChecked: true });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
    expect(input.getAttribute('aria-checked')).toBe('true');
  });
});

describe('ArvoSwitch -- disabled state', () => {
  it('adds is-disabled class when disabled', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('sets input.disabled when disabled', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { isDisabled: true });
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('ArvoSwitch -- readonly state', () => {
  it('adds is-readonly class when readonly', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { isReadOnly: true });
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('suppresses change handler when readonly', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isReadOnly: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoSwitch -- loading state', () => {
  it('adds loading class when loading', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('sets aria-busy on root when loading', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('does not set aria-busy when not loading', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });
});

describe('ArvoSwitch -- labelPosition', () => {
  it('does not add --label-start modifier by default (end)', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { label: 'Test' });
    expect(el.classList.contains('arvo-sw--label-start')).toBe(false);
  });

  it('adds --label-start modifier when labelPosition is "start"', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { label: 'Test', labelPosition: 'start' });
    expect(el.classList.contains('arvo-sw--label-start')).toBe(true);
  });
});

describe('ArvoSwitch -- toggle()', () => {
  it('toggles from unchecked to checked', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isChecked: false });
    instance.toggle();
    expect(instance.checked()).toBe(true);
  });

  it('toggles from checked to unchecked', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isChecked: true });
    instance.toggle();
    expect(instance.checked()).toBe(false);
  });

  it('syncs aria-checked after toggle', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.toggle();
    expect(el.querySelector('input')?.getAttribute('aria-checked')).toBe('true');
  });

  it('is a no-op when disabled', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isDisabled: true, onChange });
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is a no-op when loading', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isLoading: true, onChange });
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is a no-op when readonly', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isReadOnly: true, onChange });
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoSwitch -- toggle(force)', () => {
  it('toggle(true) sets checked to true', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.toggle(true);
    expect(instance.checked()).toBe(true);
  });

  it('toggle(false) sets checked to false', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isChecked: true });
    instance.toggle(false);
    expect(instance.checked()).toBe(false);
  });

  it('toggle(true) is a no-op when already checked', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isChecked: true, onChange });
    instance.toggle(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggle(false) is a no-op when already unchecked', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isChecked: false, onChange });
    instance.toggle(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dispatches sw:change custom event', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    const handler = vi.fn();
    el.addEventListener('sw:change', handler);
    instance.toggle(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls onChange callback with { checked, value }', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { value: 'dark-mode', onChange });
    instance.toggle(true);
    expect(onChange).toHaveBeenCalledWith({ isChecked: true, value: 'dark-mode' });
  });
});

describe('ArvoSwitch -- checked()', () => {
  it('returns false initially', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    expect(instance.checked()).toBe(false);
  });

  it('returns true when initialized with checked: true', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isChecked: true });
    expect(instance.checked()).toBe(true);
  });

  it('returns true after toggle(true)', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.toggle(true);
    expect(instance.checked()).toBe(true);
  });
});

describe('ArvoSwitch -- disabled(state)', () => {
  it('disabled(true) adds is-disabled class and disables input', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('disabled(false) removes is-disabled class and enables input', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(false);
  });

  it('returns current disabled state when called with no args', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });
});

describe('ArvoSwitch -- readonly(state)', () => {
  it('readonly(true) adds is-readonly class', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.readonly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('readonly(false) removes is-readonly class', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isReadOnly: true });
    instance.readonly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('blocks toggle() after readonly(true)', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { onChange });
    instance.readonly(true);
    instance.toggle();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoSwitch -- setLabel()', () => {
  it('creates __lbl span when label set from null', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    expect(el.querySelector('.arvo-sw__lbl')).toBeNull();
    instance.setLabel('New Label');
    const lbl = el.querySelector('.arvo-sw__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.textContent).toBe('New Label');
  });

  it('updates existing label text', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { label: 'Old' });
    instance.setLabel('Updated');
    expect(el.querySelector('.arvo-sw__lbl')?.textContent).toBe('Updated');
  });

  it('removes __lbl when set to null', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { label: 'Temp' });
    instance.setLabel(null);
    expect(el.querySelector('.arvo-sw__lbl')).toBeNull();
  });

  it('sets aria-labelledby on input when label is set', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.setLabel('Test');
    const input = el.querySelector('input') as HTMLInputElement;
    const lbl = el.querySelector('.arvo-sw__lbl') as HTMLElement;
    expect(input.getAttribute('aria-labelledby')).toBe(lbl.id);
  });

  it('removes aria-labelledby from input when label set to null', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { label: 'Test' });
    instance.setLabel(null);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-labelledby')).toBeNull();
  });
});

describe('ArvoSwitch -- setLoading()', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) blurs input if it is focused', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    const input = el.querySelector('input') as HTMLInputElement;
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    instance.setLoading(true);
    expect(blurSpy).toHaveBeenCalledOnce();
  });
});

describe('ArvoSwitch -- Enter key handling', () => {
  it('Enter key toggles the switch', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ isChecked: true, value: 'on' });
  });

  it('Enter key is blocked when disabled', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isDisabled: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter key is blocked when readonly', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isReadOnly: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter key is blocked when loading', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isLoading: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ArvoSwitch -- custom events', () => {
  it('sw:change fires when toggle(true) is called', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    const handler = vi.fn();
    el.addEventListener('sw:change', handler);
    instance.toggle(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('sw:change detail contains correct checked and value', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { value: 'v3' });
    let detail: { isChecked: boolean; value: string } | null = null;
    el.addEventListener('sw:change', (e) => {
      detail = (e as CustomEvent<{ isChecked: boolean; value: string }>).detail;
    });
    instance.toggle(true);
    expect(detail).toEqual({ isChecked: true, value: 'v3' });
  });

  it('sw:change bubbles from root element', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    let bubbled = false;
    document.body.addEventListener('sw:change', () => {
      bubbled = true;
    });
    instance.toggle(true);
    expect(bubbled).toBe(true);
  });
});

describe('ArvoSwitch -- change suppression', () => {
  it('onChange is not called when disabled', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isDisabled: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange is not called when loading', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isLoading: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onChange is not called when readonly', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { isReadOnly: true, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onFocus callback is called on input focus', () => {
    const onFocus = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { onFocus });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('onBlur callback is called on input blur', () => {
    const onBlur = vi.fn();
    const el = createSwitchElement();
    new ArvoSwitch(el, { onBlur });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    expect(onBlur).toHaveBeenCalledOnce();
  });
});

describe('ArvoSwitch -- destroy()', () => {
  it('removes arvo-sw class from element', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.destroy();
    expect(el.classList.contains('arvo-sw')).toBe(false);
  });

  it('removes aria-busy attribute', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { isLoading: true });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes field child element', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.destroy();
    expect(el.querySelector('.arvo-sw__field')).toBeNull();
  });

  it('removes track and thumb child elements', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.destroy();
    expect(el.querySelector('.arvo-sw__track')).toBeNull();
    expect(el.querySelector('.arvo-sw__thumb')).toBeNull();
  });

  it('onChange is not called after destroy when input dispatches change', () => {
    const onChange = vi.fn();
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el, { onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    instance.destroy();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    const el = createSwitchElement();
    const instance = new ArvoSwitch(el);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Switch - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { label: 'Enable notifications' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, {
      label: 'Enable notifications',
      contextHelp: { content: 'Receive email + in-app alerts.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createSwitchElement();
    new ArvoSwitch(el, { contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
