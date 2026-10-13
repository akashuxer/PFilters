import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ArvoTextbox } from './Textbox';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createTextboxElement(): HTMLDivElement {
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
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('Textbox - initialization', () => {
  it('static initialize() returns an ArvoTextbox instance', () => {
    const el = createTextboxElement();
    const txt = ArvoTextbox.initialize(el);
    expect(txt).toBeInstanceOf(ArvoTextbox);
  });

  it('constructor returns an ArvoTextbox instance', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    expect(txt).toBeInstanceOf(ArvoTextbox);
  });

  it('adds arvo-textbox base class', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.classList.contains('arvo-textbox')).toBe(true);
  });

  it('adds default lg size class', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.classList.contains('arvo-textbox--lg')).toBe(true);
  });

  it('adds sm size class when specified', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { size: 'sm' });
    expect(el.classList.contains('arvo-textbox--sm')).toBe(true);
  });

  it('creates input element with type="text"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('text');
  });

  it('creates field container', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.querySelector('.arvo-textbox__field')).not.toBeNull();
  });

  it('creates border element', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.querySelector('.arvo-textbox__border')).not.toBeNull();
  });

  it('sets input value from value option', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { value: 'prefilled' });
    expect(el.querySelector('input')!.value).toBe('prefilled');
  });

  it('falls back to lg for an invalid size', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { size: 'xl' as never });
    expect(el.classList.contains('arvo-textbox--lg')).toBe(true);
    expect(el.classList.contains('arvo-textbox--xl')).toBe(false);
  });

  it('sets placeholder on input when provided', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { placeholder: 'Enter text' });
    expect(el.querySelector('input')!.placeholder).toBe('Enter text');
  });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------
describe('Textbox - label', () => {
  it('creates label when label option is provided', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { label: 'Email address' });
    expect(el.querySelector('label')).not.toBeNull();
  });

  it('label has for attribute matching input id', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { label: 'Email address' });
    const label = el.querySelector('label')!;
    const input = el.querySelector('input')!;
    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('shows required asterisk when required', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { label: 'Email address', isRequired: true });
    expect(el.querySelector('.arvo-form-lbl__req')).not.toBeNull();
  });

  it('does NOT create label when option is omitted', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.querySelector('label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// value() getter/setter
// ---------------------------------------------------------------------------
describe('Textbox - value()', () => {
  it('value(str) sets the input value', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.value('hello');
    expect(el.querySelector('input')!.value).toBe('hello');
  });

  it('value() returns current input value', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'initial' });
    expect(txt.value()).toBe('initial');
  });

  it('value() reflects value(str)', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.value('updated');
    expect(txt.value()).toBe('updated');
  });

  it('value(str) fires textbox:change event with value and previousValue', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'old' });
    const handler = vi.fn();
    el.addEventListener('textbox:change', handler);
    txt.value('new');
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ value: 'new', previousValue: 'old' });
  });

  it('rapid value() calls update previousValue correctly', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'a' });
    const events: Array<{ value: string; previousValue: string }> = [];
    el.addEventListener('textbox:change', (e) => { events.push((e as CustomEvent).detail); });
    txt.value('b');
    txt.value('c');
    expect(events[0]).toEqual({ value: 'b', previousValue: 'a' });
    expect(events[1]).toEqual({ value: 'c', previousValue: 'b' });
  });

  it('adds has-value class when value() is called with non-empty string', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.value('content');
    expect(el.classList.contains('has-value')).toBe(true);
  });

  it('removes has-value class when value() is called with empty string', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'content' });
    txt.value('');
    expect(el.classList.contains('has-value')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------
describe('Textbox - clear', () => {
  it('clear() fires textbox:clear event', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'hello' });
    const handler = vi.fn();
    el.addEventListener('textbox:clear', handler);
    txt.clear();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clear() fires textbox:change with empty value', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'hello' });
    const handler = vi.fn();
    el.addEventListener('textbox:change', handler);
    txt.clear();
    expect((handler.mock.calls[0][0] as CustomEvent).detail.value).toBe('');
  });

  it('clear() sets input value to empty string', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'hello' });
    txt.clear();
    expect(el.querySelector('input')!.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------
describe('Textbox - validate', () => {
  it('returns valid=true for non-required empty input', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    const result = txt.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid=false for required empty input', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isRequired: true });
    const result = txt.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors array for invalid email type', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'email', value: 'not-an-email' });
    const result = txt.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid=true for valid email', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'email', value: 'user@example.com' });
    const result = txt.validate();
    expect(result.valid).toBe(true);
  });

  it('returns errors array for invalid url type', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'url', value: 'not-a-url' });
    const result = txt.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid=true for valid url', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'url', value: 'https://example.com' });
    const result = txt.validate();
    expect(result.valid).toBe(true);
  });

  it('returns valid=false when value exceeds maxLength', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { maxLength: 5, value: 'toolongvalue' });
    const result = txt.validate();
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setError(message | false)
// ---------------------------------------------------------------------------
describe('Textbox - setError(message | false)', () => {
  it('setError(msg) adds has-error class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.setError('Invalid value');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError(msg) sets aria-invalid on input', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.setError('Invalid value');
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(msg) sets aria-describedby on input', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.setError('Invalid value');
    const input = el.querySelector('input')!;
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('setError(msg) shows the inline alert element', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.setError('Invalid value');
    const alert = el.querySelector('.arvo-msg-alert--negative') as HTMLElement | null;
    expect(alert).not.toBeNull();
    expect(alert!.style.display).not.toBe('none');
  });

  it('setError(false) removes has-error class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isInvalid: true });
    txt.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isInvalid: true });
    txt.setError(false);
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) restores counter visibility when showCounter is true', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { hasCounter: true });
    txt.setError('Error');
    txt.setError(false);
    const counter = el.querySelector('.arvo-textbox__counter') as HTMLElement | null;
    expect(counter).not.toBeNull();
    expect(counter!.style.display).not.toBe('none');
  });
});

// ---------------------------------------------------------------------------
// disabled() getter/setter
// ---------------------------------------------------------------------------
describe('Textbox - disabled()', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets input.disabled', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.disabled(true);
    expect(el.querySelector('input')!.disabled).toBe(true);
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isDisabled: true });
    txt.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) clears input.disabled', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isDisabled: true });
    txt.disabled(false);
    expect(el.querySelector('input')!.disabled).toBe(false);
  });

  it('disabled() returns true when disabled', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isDisabled: true });
    expect(txt.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    expect(txt.disabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setLoading
// ---------------------------------------------------------------------------
describe('Textbox - setLoading', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isLoading: true });
    txt.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isLoading: true });
    txt.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) blurs input if focused', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    const input = el.querySelector('input')!;
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    txt.setLoading(true);
    expect(blurSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Clearable
// ---------------------------------------------------------------------------
describe('Textbox - clearable', () => {
  it('creates clear button when clearable is true', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    expect(el.querySelector('.arvo-textbox__clear')).not.toBeNull();
  });

  it('clear button has aria-label="Clear"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    expect(clearBtn.getAttribute('aria-label')).toBe('Clear');
  });

  it('clicking clear button clears value', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true, value: 'hello' });
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(txt.value()).toBe('');
  });

  it('clicking clear button focuses input', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true, value: 'hello' });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('does not create clear button when clearable is false', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: false });
    expect(el.querySelector('.arvo-textbox__clear')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Affix: leading icon (`icon` -> __ico)
// ---------------------------------------------------------------------------
describe('Textbox - icon', () => {
  it('creates __ico when icon option is provided', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { icon: 'search' });
    const icon = el.querySelector('.arvo-textbox__ico');
    expect(icon).not.toBeNull();
    expect(icon!.classList.contains('o9con-search')).toBe(true);
  });

  it('__ico has aria-hidden="true"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { icon: 'search' });
    expect(el.querySelector('.arvo-textbox__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('mousedown on __ico focuses the input (forward focus)', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { icon: 'search' });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    const icon = el.querySelector('.arvo-textbox__ico')!;
    icon.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('mousedown on __ico calls preventDefault (no caret in icon)', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { icon: 'search' });
    const icon = el.querySelector('.arvo-textbox__ico')!;
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    icon.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does not create __ico when icon option is omitted', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.querySelector('.arvo-textbox__ico')).toBeNull();
  });

  it('legacy `arvo-textbox__leading-icon` slot is no longer rendered', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { icon: 'search' });
    expect(el.querySelector('.arvo-textbox__leading-icon')).toBeNull();
  });

  it('icon() getter returns current value', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el, { icon: 'search' });
    expect(t.icon()).toBe('search');
  });

  it('icon() setter swaps the icon class', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el, { icon: 'search' });
    t.icon('user');
    expect(el.querySelector('.arvo-textbox__ico')!.classList.contains('o9con-user')).toBe(true);
  });

  it('icon(null) removes the slot', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el, { icon: 'search' });
    t.icon(null);
    expect(el.querySelector('.arvo-textbox__ico')).toBeNull();
    expect(t.icon()).toBeNull();
  });

  it('icon() can add the slot when none was rendered initially', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el);
    t.icon('search');
    const ico = el.querySelector('.arvo-textbox__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-search')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Affix: prefix (`prefix` -> __prefix + __prefix-sep)
// ---------------------------------------------------------------------------
describe('Textbox - prefix', () => {
  it('renders __prefix and __prefix-sep when prefix is set', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { prefix: 'https://' });
    expect(el.querySelector('.arvo-textbox__prefix')).not.toBeNull();
    expect(el.querySelector('.arvo-textbox__prefix-sep')).not.toBeNull();
  });

  it('__prefix text matches the option value', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { prefix: '@' });
    expect(el.querySelector('.arvo-textbox__prefix')!.textContent).toBe('@');
  });

  it('__prefix is aria-hidden', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { prefix: '@' });
    expect(el.querySelector('.arvo-textbox__prefix')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds arvo-textbox--has-prefix marker class', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { prefix: '@' });
    expect(el.classList.contains('arvo-textbox--has-prefix')).toBe(true);
  });

  it('omits __prefix when option is null/empty', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { prefix: '' });
    expect(el.querySelector('.arvo-textbox__prefix')).toBeNull();
    expect(el.querySelector('.arvo-textbox__prefix-sep')).toBeNull();
    expect(el.classList.contains('arvo-textbox--has-prefix')).toBe(false);
  });

  it('mousedown on __prefix focuses the input', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { prefix: '@' });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    el.querySelector('.arvo-textbox__prefix')!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('prefix() getter returns current value', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el, { prefix: 'https://' });
    expect(t.prefix()).toBe('https://');
  });

  it('prefix() setter swaps the prefix text', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el, { prefix: 'https://' });
    t.prefix('@');
    expect(el.querySelector('.arvo-textbox__prefix')!.textContent).toBe('@');
  });

  it('prefix(null) removes the slot and the marker class', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el, { prefix: '@' });
    t.prefix(null);
    expect(el.querySelector('.arvo-textbox__prefix')).toBeNull();
    expect(el.querySelector('.arvo-textbox__prefix-sep')).toBeNull();
    expect(el.classList.contains('arvo-textbox--has-prefix')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Affix: suffix (`suffix` -> __suffix)
// ---------------------------------------------------------------------------
describe('Textbox - suffix', () => {
  it('renders __suffix when suffix is set', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { suffix: '.com' });
    expect(el.querySelector('.arvo-textbox__suffix')).not.toBeNull();
  });

  it('__suffix text matches the option value', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { suffix: 'kg' });
    expect(el.querySelector('.arvo-textbox__suffix')!.textContent).toBe('kg');
  });

  it('__suffix is aria-hidden', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { suffix: 'kg' });
    expect(el.querySelector('.arvo-textbox__suffix')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds arvo-textbox--has-suffix marker class', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { suffix: 'kg' });
    expect(el.classList.contains('arvo-textbox--has-suffix')).toBe(true);
  });

  it('omits __suffix when option is empty', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { suffix: '' });
    expect(el.querySelector('.arvo-textbox__suffix')).toBeNull();
    expect(el.classList.contains('arvo-textbox--has-suffix')).toBe(false);
  });

  it('mousedown on __suffix focuses the input', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { suffix: 'kg' });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    el.querySelector('.arvo-textbox__suffix')!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('suffix() getter / setter / removal cycle', () => {
    const el = createTextboxElement();
    const t = new ArvoTextbox(el);
    expect(t.suffix()).toBeNull();
    t.suffix('kg');
    expect(t.suffix()).toBe('kg');
    expect(el.querySelector('.arvo-textbox__suffix')!.textContent).toBe('kg');
    t.suffix('%');
    expect(el.querySelector('.arvo-textbox__suffix')!.textContent).toBe('%');
    t.suffix(null);
    expect(el.querySelector('.arvo-textbox__suffix')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Character counter
// ---------------------------------------------------------------------------
describe('Textbox - character counter', () => {
  it('creates counter when showCounter is true', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { hasCounter: true });
    expect(el.querySelector('.arvo-textbox__counter')).not.toBeNull();
  });

  it('counter shows "0" for empty value with no maxLength', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { hasCounter: true });
    expect(el.querySelector('.arvo-textbox__counter')!.textContent).toBe('0');
  });

  it('counter shows formatted count with maxLength', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { hasCounter: true, maxLength: 100 });
    expect(el.querySelector('.arvo-textbox__counter')!.textContent).toBe('000/100');
  });

  it('counter updates on value(str)', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { hasCounter: true, maxLength: 10 });
    txt.value('hello');
    expect(el.querySelector('.arvo-textbox__counter')!.textContent).toBe('05/10');
  });

  it('does not create counter when showCounter is false', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.querySelector('.arvo-textbox__counter')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Keyboard interactions
// ---------------------------------------------------------------------------
describe('Textbox - keyboard interactions', () => {
  it('Escape clears value when clearable and has value', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true, value: 'hello' });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(txt.value()).toBe('');
  });

  it('Escape does nothing when clearable and value is empty', () => {
    const el = createTextboxElement();
    const onKeyDown = vi.fn();
    new ArvoTextbox(el, { isClearable: true, onKeyDown });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('keydown is suppressed (preventDefault) when disabled', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isDisabled: true });
    const input = el.querySelector('input')!;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    input.dispatchEvent(event);
    expect(preventSpy).toHaveBeenCalled();
  });

  it('keydown is suppressed when loading', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isLoading: true });
    const input = el.querySelector('input')!;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    input.dispatchEvent(event);
    expect(preventSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('Textbox - custom events', () => {
  it('textbox:change bubbles', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    let capturedEvent: CustomEvent | null = null;
    document.body.addEventListener('textbox:change', (e) => { capturedEvent = e as CustomEvent; });
    txt.value('test');
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.bubbles).toBe(true);
    document.body.removeEventListener('textbox:change', () => {});
  });

  it('textbox:clear bubbles', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'hello' });
    let capturedEvent: CustomEvent | null = null;
    document.body.addEventListener('textbox:clear', (e) => { capturedEvent = e as CustomEvent; });
    txt.clear();
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.bubbles).toBe(true);
    document.body.removeEventListener('textbox:clear', () => {});
  });

  it('textbox:change has correct detail payload', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { value: 'initial' });
    const handler = vi.fn();
    el.addEventListener('textbox:change', handler);
    txt.value('updated');
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('value', 'updated');
    expect(detail).toHaveProperty('previousValue', 'initial');
  });

  it('onChange callback is called when input change event fires', () => {
    const onChange = vi.fn();
    const el = createTextboxElement();
    new ArvoTextbox(el, { onChange });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onInput callback is called when input event fires', () => {
    const onInput = vi.fn();
    const el = createTextboxElement();
    new ArvoTextbox(el, { onInput });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('onFocus callback is called when input is focused', () => {
    const onFocus = vi.fn();
    const el = createTextboxElement();
    new ArvoTextbox(el, { onFocus });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('onBlur callback is called when input loses focus', () => {
    const onBlur = vi.fn();
    const el = createTextboxElement();
    new ArvoTextbox(el, { onBlur });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Width option
// ---------------------------------------------------------------------------
describe('Textbox - width option', () => {
  it('sets --arvo-form-input-width when width is provided', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { width: '200px' });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('200px');
  });

  it('does not set --arvo-form-input-width when width is omitted', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('');
  });

  it('fullWidth takes precedence over width option', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isFullWidth: true, width: '200px' });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('fullWidth sets --arvo-form-input-width to 100%', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isFullWidth: true });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('width() getter returns null by default', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    expect(txt.width()).toBeNull();
  });

  it('width() getter returns the initial width option', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { width: '250px' });
    expect(txt.width()).toBe('250px');
  });

  it('width(value) sets the CSS variable on the root element', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.width('400px');
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('400px');
  });

  it('width(value) updates the getter return value', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.width('300px');
    expect(txt.width()).toBe('300px');
  });
});

// ---------------------------------------------------------------------------
// Actions overlay container
// ---------------------------------------------------------------------------
describe('Textbox - actions overlay', () => {
  it('creates __actions container inside __field', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    const field = el.querySelector('.arvo-textbox__field');
    const actions = el.querySelector('.arvo-textbox__actions');
    expect(actions).not.toBeNull();
    expect(field?.contains(actions)).toBe(true);
  });

  it('__actions contains clear button when clearable', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const actions = el.querySelector('.arvo-textbox__actions');
    const clear = el.querySelector('.arvo-textbox__clear');
    expect(actions?.contains(clear)).toBe(true);
  });

  it('__actions contains error icon when errorDisplay is "tooltip"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { errorDisplay: 'tooltip', isInvalid: true });
    const actions = el.querySelector('.arvo-textbox__actions');
    const errIco = el.querySelector('.arvo-textbox__err-ico');
    expect(actions?.contains(errIco)).toBe(true);
  });

  it('__actions is empty when no clearable and not in tooltip error mode', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    const actions = el.querySelector('.arvo-textbox__actions');
    expect(actions?.children.length).toBe(0);
  });

  it('leading icon is NOT inside __actions', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { icon: 'search' });
    const actions = el.querySelector('.arvo-textbox__actions');
    const icon = el.querySelector('.arvo-textbox__ico');
    expect(actions?.contains(icon)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Inner component composition (ArvoButton)
// ---------------------------------------------------------------------------
describe('Textbox - inner component composition', () => {
  it('clear button renders as an ArvoButton (has arvo-btn class)', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    expect(clearBtn.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('clear button is a <button> element', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    expect(clearBtn.tagName).toBe('BUTTON');
  });

  it('clear button has tertiary variant class', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    expect(clearBtn.classList.contains('arvo-btn--tertiary')).toBe(true);
  });

  it('clear button has sm size class', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const clearBtn = el.querySelector('.arvo-textbox__clear')!;
    expect(clearBtn.classList.contains('arvo-btn--xs')).toBe(true);
  });

  it('clear button is in the natural tab order', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { isClearable: true });
    const clearBtn = el.querySelector('.arvo-textbox__clear') as HTMLButtonElement;
    // Default tabIndex for a <button> is 0 (focusable). The clear button must
    // not opt out of the tab order so keyboard users can Tab from the input
    // to clear and trigger it with Enter / Space.
    expect(clearBtn.tabIndex).toBe(0);
  });

  it('disabled(true) disables the clear button', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true });
    txt.disabled(true);
    const clearBtn = el.querySelector('.arvo-textbox__clear') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);
  });

  it('disabled(false) re-enables the clear button', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true, isDisabled: true });
    txt.disabled(false);
    const clearBtn = el.querySelector('.arvo-textbox__clear') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(false);
  });

  it('setLoading(true) disables the clear button', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true });
    txt.setLoading(true);
    const clearBtn = el.querySelector('.arvo-textbox__clear') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);
  });

  it('setLoading(false) re-enables the clear button when not disabled', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true, isLoading: true });
    txt.setLoading(false);
    const clearBtn = el.querySelector('.arvo-textbox__clear') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(false);
  });

  it('setLoading(false) keeps clear button disabled when parent is disabled', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isClearable: true, isDisabled: true, isLoading: true });
    txt.setLoading(false);
    const clearBtn = el.querySelector('.arvo-textbox__clear') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('Textbox - destroy', () => {
  it('removes base class', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.destroy();
    expect(el.classList.contains('arvo-textbox')).toBe(false);
  });

  it('removes size classes', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.destroy();
    ArvoTextbox.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-textbox--${s}`)).toBe(false);
    });
  });

  it('removes aria-busy attribute', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { isLoading: true });
    txt.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes field element from DOM', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.destroy();
    expect(el.querySelector('.arvo-textbox__field')).toBeNull();
  });

  it('removes border element from DOM', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.destroy();
    expect(el.querySelector('.arvo-textbox__border')).toBeNull();
  });

  it('removes label element from DOM', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { label: 'Email' });
    txt.destroy();
    expect(el.querySelector('label')).toBeNull();
  });

  it('removes counter element from DOM', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { hasCounter: true });
    txt.destroy();
    expect(el.querySelector('.arvo-textbox__counter')).toBeNull();
  });

  it('removes __actions element from DOM', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.destroy();
    expect(el.querySelector('.arvo-textbox__actions')).toBeNull();
  });

  it('removes --arvo-form-input-width CSS variable', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { width: '200px' });
    txt.destroy();
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('');
  });

  it('removes event listeners (onChange not called after destroy)', () => {
    const onChange = vi.fn();
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { onChange });
    const input = el.querySelector('input')!;
    txt.destroy();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes event listeners (onInput not called after destroy)', () => {
    const onInput = vi.fn();
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { onInput });
    const input = el.querySelector('input')!;
    txt.destroy();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el);
    txt.destroy();
    expect(() => txt.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Surface (filled default | base)
// ---------------------------------------------------------------------------
describe('Textbox - surface', () => {
  it('applies arvo-textbox--surface-filled by default', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el);
    expect(el.classList.contains('arvo-textbox--surface-filled')).toBe(true);
  });

  it('applies arvo-textbox--surface-base when surface: "base"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { surface: 'base' });
    expect(el.classList.contains('arvo-textbox--surface-base')).toBe(true);
  });

  it('applies arvo-textbox--surface-filled when surface: "filled"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { surface: 'filled' });
    expect(el.classList.contains('arvo-textbox--surface-filled')).toBe(true);
  });

  it('only one --surface-* class is present at a time', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { surface: 'base' });
    expect(el.classList.contains('arvo-textbox--surface-base')).toBe(true);
    expect(el.classList.contains('arvo-textbox--surface-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Textbox - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { label: 'Email' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, {
      label: 'Email',
      contextHelp: { content: 'Use your work email address.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// type-driven behavior: locked icons, password toggle, dev warnings
// ---------------------------------------------------------------------------
describe('Textbox - type=url', () => {
  it('sets native input type to "url"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'url' });
    expect(el.querySelector('input')!.type).toBe('url');
  });

  it('forces the leading icon to o9con-desktop', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'url' });
    const ico = el.querySelector('.arvo-textbox__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-desktop')).toBe(true);
  });

  it('ignores a consumer-supplied icon option (warn + override)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'url', icon: 'search' });
    expect(el.querySelector('.arvo-textbox__ico')!.classList.contains('o9con-desktop')).toBe(true);
    expect(el.querySelector('.arvo-textbox__ico')!.classList.contains('o9con-search')).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('renders a configurable prefix on type=url', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'url', prefix: 'https://' });
    expect(el.querySelector('.arvo-textbox__prefix')!.textContent).toBe('https://');
  });
});

describe('Textbox - type=email', () => {
  it('sets native input type to "email"', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'email' });
    expect(el.querySelector('input')!.type).toBe('email');
  });

  it('forces the leading icon to o9con-envelope-o', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'email' });
    const ico = el.querySelector('.arvo-textbox__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-envelope-o')).toBe(true);
  });

  it('ignores a consumer-supplied icon option (warn + override)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'email', icon: 'search' });
    expect(el.querySelector('.arvo-textbox__ico')!.classList.contains('o9con-envelope-o')).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('Textbox - type=password', () => {
  it('sets native input type to "password" by default', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password' });
    expect(el.querySelector('input')!.type).toBe('password');
  });

  it('renders no leading icon for password', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password' });
    expect(el.querySelector('.arvo-textbox__ico')).toBeNull();
  });

  it('renders __pw-toggle inside __actions', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password' });
    const actions = el.querySelector('.arvo-textbox__actions')!;
    const toggle = el.querySelector('.arvo-textbox__pw-toggle');
    expect(toggle).not.toBeNull();
    expect(actions.contains(toggle)).toBe(true);
  });

  it('toggle has o9con-eye icon when value is hidden', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password' });
    const ico = el.querySelector('.arvo-textbox__pw-toggle .arvo-btn__ico');
    expect(ico!.classList.contains('o9con-eye')).toBe(true);
  });

  it('toggle has aria-pressed="false" by default', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password' });
    const toggle = el.querySelector('.arvo-textbox__pw-toggle')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggle has aria-label "Show password" by default', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password' });
    const toggle = el.querySelector('.arvo-textbox__pw-toggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
  });

  it('clicking the toggle reveals the value (input.type=text) and swaps icon to o9con-eye-slash', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password', value: 'secret' });
    const toggle = el.querySelector('.arvo-textbox__pw-toggle') as HTMLButtonElement;
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.querySelector('input')!.type).toBe('text');
    const ico = el.querySelector('.arvo-textbox__pw-toggle .arvo-btn__ico')!;
    expect(ico.classList.contains('o9con-eye-slash')).toBe(true);
    expect(ico.classList.contains('o9con-eye')).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('clicking the toggle a second time hides the value again', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password', value: 'secret' });
    const toggle = el.querySelector('.arvo-textbox__pw-toggle') as HTMLButtonElement;
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.querySelector('input')!.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('honors initial isPasswordVisible=true', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'password', isPasswordVisible: true, value: 'secret' });
    expect(el.querySelector('input')!.type).toBe('text');
    const toggle = el.querySelector('.arvo-textbox__pw-toggle')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('does NOT render __clear, __ico, __prefix, or __suffix for type=password', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createTextboxElement();
    new ArvoTextbox(el, {
      type: 'password',
      value: 'secret',
      isClearable: true,
      icon: 'search',
      prefix: 'pre',
      suffix: 'suf',
    });
    expect(el.querySelector('.arvo-textbox__clear')).toBeNull();
    expect(el.querySelector('.arvo-textbox__ico')).toBeNull();
    expect(el.querySelector('.arvo-textbox__prefix')).toBeNull();
    expect(el.querySelector('.arvo-textbox__suffix')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('passwordVisible() getter returns false by default', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    expect(txt.passwordVisible()).toBe(false);
  });

  it('passwordVisible(true) flips state and fires textbox:password-visibility', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    const handler = vi.fn();
    el.addEventListener('textbox:password-visibility', handler);
    txt.passwordVisible(true);
    expect(txt.passwordVisible()).toBe(true);
    expect(el.querySelector('input')!.type).toBe('text');
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ visible: true });
  });

  it('passwordVisible() is a no-op when type is not password', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'text' });
    const handler = vi.fn();
    el.addEventListener('textbox:password-visibility', handler);
    txt.passwordVisible(true);
    expect(txt.passwordVisible()).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('textbox:password-visibility bubbles and is cancelable', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    let captured: CustomEvent | null = null;
    document.body.addEventListener('textbox:password-visibility', (e) => {
      captured = e as CustomEvent;
    });
    txt.passwordVisible(true);
    expect(captured).not.toBeNull();
    expect(captured!.bubbles).toBe(true);
    expect(captured!.cancelable).toBe(true);
  });

  it('disabled(true) disables the password toggle button', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    txt.disabled(true);
    const toggle = el.querySelector('.arvo-textbox__pw-toggle') as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
  });

  it('destroy() removes the password toggle from the DOM', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    txt.destroy();
    expect(el.querySelector('.arvo-textbox__pw-toggle')).toBeNull();
  });

  it('runtime icon() setter is a no-op when type=password', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    txt.icon('search');
    expect(el.querySelector('.arvo-textbox__ico')).toBeNull();
  });

  it('runtime prefix() setter is a no-op when type=password', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    txt.prefix('@');
    expect(el.querySelector('.arvo-textbox__prefix')).toBeNull();
  });

  it('runtime suffix() setter is a no-op when type=password', () => {
    const el = createTextboxElement();
    const txt = new ArvoTextbox(el, { type: 'password' });
    txt.suffix('kg');
    expect(el.querySelector('.arvo-textbox__suffix')).toBeNull();
  });
});

describe('Textbox - TYPES allowlist', () => {
  it('TYPES is exactly text, url, password, email', () => {
    expect([...ArvoTextbox.TYPES]).toEqual(['text', 'url', 'password', 'email']);
  });

  it('falls back to "text" for an invalid type', () => {
    const el = createTextboxElement();
    new ArvoTextbox(el, { type: 'tel' as never });
    expect(el.querySelector('input')!.type).toBe('text');
  });
});
