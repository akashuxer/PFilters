import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ArvoTextarea } from './Textarea';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createTextareaElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// jsdom does not provide ResizeObserver. The Textarea wires one to the
// `__actions` overlay (form-input-actions-overlay shared pattern) so we
// stub it here just like the Textbox test does.
beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('Textarea - initialization', () => {
  it('static initialize() returns an ArvoTextarea instance', () => {
    const el = createTextareaElement();
    const ta = ArvoTextarea.initialize(el);
    expect(ta).toBeInstanceOf(ArvoTextarea);
  });

  it('constructor returns an ArvoTextarea instance', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    expect(ta).toBeInstanceOf(ArvoTextarea);
  });

  it('adds arvo-textarea base class', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.classList.contains('arvo-textarea')).toBe(true);
  });

  it('adds default sm size class', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.classList.contains('arvo-textarea--sm')).toBe(true);
  });

  it('adds sm size class when specified', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { size: 'sm' });
    expect(el.classList.contains('arvo-textarea--sm')).toBe(true);
  });

  it('adds lg size class when specified', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { size: 'lg' });
    expect(el.classList.contains('arvo-textarea--lg')).toBe(true);
  });

  it('creates textarea element with default rows=3', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    const textarea = el.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea!.rows).toBe(3);
  });

  it('creates field container', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.querySelector('.arvo-textarea__field')).not.toBeNull();
  });

  it('creates border element', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.querySelector('.arvo-textarea__border')).not.toBeNull();
  });

  it('sets textarea value from value option', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { value: 'prefilled' });
    expect(el.querySelector('textarea')!.value).toBe('prefilled');
  });

  it('falls back to sm for an invalid size', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { size: 'xl' as never });
    expect(el.classList.contains('arvo-textarea--sm')).toBe(true);
    expect(el.classList.contains('arvo-textarea--xl')).toBe(false);
  });

  it('sets placeholder on textarea when provided', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { placeholder: 'Enter text' });
    expect(el.querySelector('textarea')!.placeholder).toBe('Enter text');
  });

  it('sets rows from options', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { rows: 5 });
    expect(el.querySelector('textarea')!.rows).toBe(5);
  });

  it('adds auto-resize class when autoResize is true', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { autoResize: true });
    expect(el.classList.contains('arvo-textarea--auto-resize')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------
describe('Textarea - label', () => {
  it('creates label when label option is provided', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { label: 'Description' });
    expect(el.querySelector('label')).not.toBeNull();
  });

  it('label has for attribute matching textarea id', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { label: 'Description' });
    const label = el.querySelector('label')!;
    const textarea = el.querySelector('textarea')!;
    expect(label.getAttribute('for')).toBe(textarea.id);
  });

  it('shows required asterisk when required', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { label: 'Description', isRequired: true });
    expect(el.querySelector('.arvo-form-lbl__req')).not.toBeNull();
  });

  it('does NOT create label when option is omitted', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.querySelector('label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// value()
// ---------------------------------------------------------------------------
describe('Textarea - value()', () => {
  it('value(str) sets the textarea value', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.value('hello');
    expect(el.querySelector('textarea')!.value).toBe('hello');
  });

  it('value() returns current textarea value', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'initial' });
    expect(ta.value()).toBe('initial');
  });

  it('value() reflects value(str)', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.value('updated');
    expect(ta.value()).toBe('updated');
  });

  it('value(str) fires textarea:change event with value and previousValue', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'old' });
    const handler = vi.fn();
    el.addEventListener('textarea:change', handler);
    ta.value('new');
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ value: 'new', previousValue: 'old' });
  });

  it('rapid value() calls update previousValue correctly', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'a' });
    const events: Array<{ value: string; previousValue: string }> = [];
    el.addEventListener('textarea:change', (e) => { events.push((e as CustomEvent).detail); });
    ta.value('b');
    ta.value('c');
    expect(events[0]).toEqual({ value: 'b', previousValue: 'a' });
    expect(events[1]).toEqual({ value: 'c', previousValue: 'b' });
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------
describe('Textarea - clear', () => {
  it('clear() sets textarea value to empty string', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'hello' });
    ta.clear();
    expect(el.querySelector('textarea')!.value).toBe('');
  });

  it('clear() fires textarea:change with empty value', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'hello' });
    const handler = vi.fn();
    el.addEventListener('textarea:change', handler);
    ta.clear();
    expect((handler.mock.calls[0][0] as CustomEvent).detail.value).toBe('');
  });

  it('clear() fires textarea:clear before textarea:change', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'hello' });
    const order: string[] = [];
    el.addEventListener('textarea:clear', () => order.push('clear'));
    el.addEventListener('textarea:change', () => order.push('change'));
    ta.clear();
    expect(order).toEqual(['clear', 'change']);
  });
});

// ---------------------------------------------------------------------------
// isClearable
// ---------------------------------------------------------------------------
describe('Textarea - isClearable', () => {
  it('does NOT render the clear button by default', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { value: 'hello' });
    expect(el.querySelector('.arvo-textarea__clear')).toBeNull();
  });

  it('renders the clear button (always present in DOM) when isClearable is true', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { isClearable: true, value: 'hello' });
    expect(el.querySelector('.arvo-textarea__clear')).not.toBeNull();
  });

  it('clear button is wrapped in the __actions overlay', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { isClearable: true, value: 'hello' });
    const actions = el.querySelector('.arvo-textarea__field .arvo-textarea__actions');
    expect(actions).not.toBeNull();
    expect(actions!.querySelector('.arvo-textarea__clear')).not.toBeNull();
  });

  it('clicking the clear button empties the textarea value', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { isClearable: true, value: 'hello' });
    const btn = el.querySelector('.arvo-textarea__clear') as HTMLButtonElement;
    btn.click();
    expect(el.querySelector('textarea')!.value).toBe('');
  });

  it('clicking the clear button dispatches textarea:clear then textarea:change', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { isClearable: true, value: 'hello' });
    const order: string[] = [];
    el.addEventListener('textarea:clear', () => order.push('clear'));
    el.addEventListener('textarea:change', () => order.push('change'));
    (el.querySelector('.arvo-textarea__clear') as HTMLButtonElement).click();
    expect(order).toEqual(['clear', 'change']);
  });

  it('Escape clears the value when isClearable and value is non-empty', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { isClearable: true, value: 'hello' });
    const ta = el.querySelector('textarea')!;
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(ta.value).toBe('');
  });

  it('Escape is a no-op when isClearable is false', () => {
    const onKeyDown = vi.fn();
    const el = createTextareaElement();
    new ArvoTextarea(el, { value: 'hello', onKeyDown });
    const ta = el.querySelector('textarea')!;
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(ta.value).toBe('hello');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('Escape is a no-op when readOnly even if isClearable', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { isClearable: true, isReadOnly: true, value: 'hello' });
    const ta = el.querySelector('textarea')!;
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(ta.value).toBe('hello');
  });

  it('disabled() propagates to the clear button', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isClearable: true, value: 'hello' });
    ta.disabled(true);
    const btn = el.querySelector('.arvo-textarea__clear') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------
describe('Textarea - validate', () => {
  it('returns valid=true for non-required empty textarea', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    const result = ta.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid=false for required empty textarea', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isRequired: true });
    const result = ta.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid=false when value exceeds maxLength', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { maxLength: 5, value: 'toolongvalue' });
    const result = ta.validate();
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setError
// ---------------------------------------------------------------------------
describe('Textarea - setError', () => {
  it('setError(msg) adds has-error class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.setError('Invalid value');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError(msg) sets aria-invalid on textarea', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.setError('Invalid value');
    expect(el.querySelector('textarea')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(msg) sets aria-describedby on textarea', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.setError('Invalid value');
    const textarea = el.querySelector('textarea')!;
    expect(textarea.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('setError(msg) shows the inline alert element', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.setError('Invalid value');
    const alert = el.querySelector('.arvo-msg-alert--negative') as HTMLElement | null;
    expect(alert).not.toBeNull();
    expect(alert!.style.display).not.toBe('none');
  });

  it('setError(false) removes has-error class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isInvalid: true });
    ta.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isInvalid: true });
    ta.setError(false);
    expect(el.querySelector('textarea')!.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) restores counter visibility when showCounter is true', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { hasCounter: true });
    ta.setError('Error');
    ta.setError(false);
    const counter = el.querySelector('.arvo-textarea__counter') as HTMLElement | null;
    expect(counter).not.toBeNull();
    expect(counter!.style.display).not.toBe('none');
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------
describe('Textarea - disabled()', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets textarea.disabled', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.disabled(true);
    expect(el.querySelector('textarea')!.disabled).toBe(true);
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isDisabled: true });
    ta.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) clears textarea.disabled', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isDisabled: true });
    ta.disabled(false);
    expect(el.querySelector('textarea')!.disabled).toBe(false);
  });

  it('disabled() returns true when disabled', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isDisabled: true });
    expect(ta.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    expect(ta.disabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setLoading
// ---------------------------------------------------------------------------
describe('Textarea - setLoading', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isLoading: true });
    ta.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isLoading: true });
    ta.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) blurs textarea if focused', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    const textarea = el.querySelector('textarea')!;
    textarea.focus();
    const blurSpy = vi.spyOn(textarea, 'blur');
    ta.setLoading(true);
    expect(blurSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Character counter
// ---------------------------------------------------------------------------
describe('Textarea - character counter', () => {
  it('creates counter when showCounter is true', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { hasCounter: true });
    expect(el.querySelector('.arvo-textarea__counter')).not.toBeNull();
  });

  it('counter shows "0" for empty value with no maxLength', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { hasCounter: true });
    expect(el.querySelector('.arvo-textarea__counter')!.textContent).toBe('0');
  });

  it('counter shows formatted count with maxLength', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { hasCounter: true, maxLength: 100 });
    expect(el.querySelector('.arvo-textarea__counter')!.textContent).toBe('000/100');
  });

  it('counter updates on value(str)', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { hasCounter: true, maxLength: 10 });
    ta.value('hello');
    expect(el.querySelector('.arvo-textarea__counter')!.textContent).toBe('05/10');
  });

  it('does not create counter when showCounter is false', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.querySelector('.arvo-textarea__counter')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('Textarea - custom events', () => {
  it('textarea:change bubbles', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    let capturedEvent: CustomEvent | null = null;
    document.body.addEventListener('textarea:change', (e) => { capturedEvent = e as CustomEvent; });
    ta.value('test');
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.bubbles).toBe(true);
    document.body.removeEventListener('textarea:change', () => {});
  });

  it('textarea:change has correct detail payload', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { value: 'initial' });
    const handler = vi.fn();
    el.addEventListener('textarea:change', handler);
    ta.value('updated');
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('value', 'updated');
    expect(detail).toHaveProperty('previousValue', 'initial');
  });

  it('onChange callback is called when change event fires', () => {
    const onChange = vi.fn();
    const el = createTextareaElement();
    new ArvoTextarea(el, { onChange });
    const textarea = el.querySelector('textarea')!;
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onInput callback is called when input event fires', () => {
    const onInput = vi.fn();
    const el = createTextareaElement();
    new ArvoTextarea(el, { onInput });
    const textarea = el.querySelector('textarea')!;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('onFocus callback is called when textarea is focused', () => {
    const onFocus = vi.fn();
    const el = createTextareaElement();
    new ArvoTextarea(el, { onFocus });
    const textarea = el.querySelector('textarea')!;
    textarea.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('onBlur callback is called when textarea loses focus', () => {
    const onBlur = vi.fn();
    const el = createTextareaElement();
    new ArvoTextarea(el, { onBlur });
    const textarea = el.querySelector('textarea')!;
    textarea.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------
describe('Textarea - icon', () => {
  it('creates icon element when icon option is provided', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { icon: 'search' });
    expect(el.querySelector('.arvo-textarea__ico')).not.toBeNull();
  });

  it('icon has correct class names', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { icon: 'calendar' });
    const ico = el.querySelector('.arvo-textarea__ico')!;
    expect(ico.classList.contains('o9con')).toBe(true);
    expect(ico.classList.contains('o9con-calendar')).toBe(true);
  });

  it('icon has aria-hidden="true"', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { icon: 'search' });
    const ico = el.querySelector('.arvo-textarea__ico')!;
    expect(ico.getAttribute('aria-hidden')).toBe('true');
  });

  it('icon is rendered before textarea inside field', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { icon: 'search' });
    const field = el.querySelector('.arvo-textarea__field')!;
    const ico = field.querySelector('.arvo-textarea__ico')!;
    const textarea = field.querySelector('textarea')!;
    const children = Array.from(field.children);
    expect(children.indexOf(ico)).toBeLessThan(children.indexOf(textarea));
  });

  it('does NOT create icon when icon option is omitted', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.querySelector('.arvo-textarea__ico')).toBeNull();
  });

  it('icon() getter returns current icon name', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { icon: 'search' });
    expect(ta.icon()).toBe('search');
  });

  it('icon() getter returns null when no icon set', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    expect(ta.icon()).toBeNull();
  });

  it('icon(name) setter changes the icon class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { icon: 'search' });
    ta.icon('calendar');
    const ico = el.querySelector('.arvo-textarea__ico')!;
    expect(ico.classList.contains('o9con-calendar')).toBe(true);
    expect(ico.classList.contains('o9con-search')).toBe(false);
  });

  it('icon(name) setter creates icon element if none exists', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.icon('search');
    expect(el.querySelector('.arvo-textarea__ico')).not.toBeNull();
  });

  it('icon(null) removes the icon element', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { icon: 'search' });
    ta.icon(null);
    expect(el.querySelector('.arvo-textarea__ico')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('Textarea - destroy', () => {
  it('removes base class', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.destroy();
    expect(el.classList.contains('arvo-textarea')).toBe(false);
  });

  it('removes size classes', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.destroy();
    ArvoTextarea.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-textarea--${s}`)).toBe(false);
    });
  });

  it('removes aria-busy attribute', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { isLoading: true });
    ta.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes field element from DOM', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.destroy();
    expect(el.querySelector('.arvo-textarea__field')).toBeNull();
  });

  it('removes border element from DOM', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.destroy();
    expect(el.querySelector('.arvo-textarea__border')).toBeNull();
  });

  it('removes label element from DOM', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { label: 'Description' });
    ta.destroy();
    expect(el.querySelector('label')).toBeNull();
  });

  it('removes counter element from DOM', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { hasCounter: true });
    ta.destroy();
    expect(el.querySelector('.arvo-textarea__counter')).toBeNull();
  });

  it('removes icon element from DOM', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { icon: 'search' });
    ta.destroy();
    expect(el.querySelector('.arvo-textarea__ico')).toBeNull();
  });

  it('removes event listeners (onChange not called after destroy)', () => {
    const onChange = vi.fn();
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { onChange });
    const textarea = el.querySelector('textarea')!;
    ta.destroy();
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes event listeners (onInput not called after destroy)', () => {
    const onInput = vi.fn();
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el, { onInput });
    const textarea = el.querySelector('textarea')!;
    ta.destroy();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createTextareaElement();
    const ta = new ArvoTextarea(el);
    ta.destroy();
    expect(() => ta.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Surface (filled default | base)
// ---------------------------------------------------------------------------
describe('Textarea - surface', () => {
  it('applies arvo-textarea--surface-filled by default', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el);
    expect(el.classList.contains('arvo-textarea--surface-filled')).toBe(true);
  });

  it('applies arvo-textarea--surface-base when surface: "base"', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { surface: 'base' });
    expect(el.classList.contains('arvo-textarea--surface-base')).toBe(true);
  });

  it('applies arvo-textarea--surface-filled when surface: "filled"', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { surface: 'filled' });
    expect(el.classList.contains('arvo-textarea--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { surface: 'base' });
    expect(el.classList.contains('arvo-textarea--surface-base')).toBe(true);
    expect(el.classList.contains('arvo-textarea--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Textarea - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { label: 'Comments' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, {
      label: 'Comments',
      contextHelp: { content: 'Optional notes for reviewers.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createTextareaElement();
    new ArvoTextarea(el, { contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
