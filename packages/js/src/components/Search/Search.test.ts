import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoSearch } from './Search';
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
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('ArvoSearch - initialization', () => {
  it('static initialize() returns an ArvoSearch instance', () => {
    const el = createEl();
    const instance = ArvoSearch.initialize(el);
    expect(instance).toBeInstanceOf(ArvoSearch);
  });

  it('constructor returns an ArvoSearch instance', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance).toBeInstanceOf(ArvoSearch);
  });

  it('adds arvo-search base class', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.classList.contains('arvo-search')).toBe(true);
  });

  it('adds filter variant class by default', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.classList.contains('arvo-search--filter')).toBe(true);
  });

  it('adds find variant class when specified', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find' });
    expect(el.classList.contains('arvo-search--find')).toBe(true);
  });

  it('falls back to filter variant for invalid variant value', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'invalid' as never });
    expect(el.classList.contains('arvo-search--filter')).toBe(true);
    expect(el.classList.contains('arvo-search--invalid')).toBe(false);
  });

  it('sets role="search" on element', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.getAttribute('role')).toBe('search');
  });

  it('creates input element with type="search" by default', () => {
    const el = createEl();
    new ArvoSearch(el);
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('search');
  });

  it('creates textarea when multiLine=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    expect(el.querySelector('textarea')).not.toBeNull();
  });

  it('creates textarea when multiLine.enabled=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: { enabled: true } });
    expect(el.querySelector('textarea')).not.toBeNull();
  });

  it('creates search icon element', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__ico')).not.toBeNull();
    expect(el.querySelector('.o9con-search')).not.toBeNull();
  });

  it('search icon has aria-hidden="true"', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('creates __field container', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__field')).not.toBeNull();
  });

  it('creates __actions container', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__actions')).not.toBeNull();
  });

  it('creates __border div', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__border')).not.toBeNull();
  });

  it('creates prev/next buttons in find variant', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find' });
    expect(el.querySelector('.arvo-search__prev')).not.toBeNull();
    expect(el.querySelector('.arvo-search__next')).not.toBeNull();
  });

  it('does not create prev/next buttons in filter variant', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__prev')).toBeNull();
    expect(el.querySelector('.arvo-search__next')).toBeNull();
  });

  it('creates clear button when clearable=true (default)', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__clear')).not.toBeNull();
  });

  it('does not create clear button when clearable=false', () => {
    const el = createEl();
    new ArvoSearch(el, { isClearable: false });
    expect(el.querySelector('.arvo-search__clear')).toBeNull();
  });

  it('does not create clear button when multiLine=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    expect(el.querySelector('.arvo-search__clear')).toBeNull();
  });

  it('creates shortcut badge when shortcut provided (display-normalized)', () => {
    // Shortcut strings are authored in the developer-canonical
    // `Ctrl+K` form but rendered through `formatShortcutDisplay` so
    // the visible text matches the active OS. The jsdom default
    // platform resolves to non-Mac so the badge renders `Ctrl K`.
    const el = createEl();
    new ArvoSearch(el, { shortcut: 'Ctrl+K' });
    const shortcutEl = el.querySelector('.arvo-search__shortcut');
    expect(shortcutEl).not.toBeNull();
    expect(shortcutEl!.textContent).toBe('Ctrl K');
  });

  it('does not create shortcut badge when shortcut is null', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__shortcut')).toBeNull();
  });

  it('creates counter badge element when counter provided', () => {
    const el = createEl();
    new ArvoSearch(el, { counter: { current: 1, total: 5 } });
    expect(el.querySelector('.arvo-search__counter')).not.toBeNull();
  });

  it('does not create counter badge when counter is null', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__counter')).toBeNull();
  });

  it('counter badge has aria-live="polite"', () => {
    const el = createEl();
    new ArvoSearch(el, { counter: { current: 1, total: 5 } });
    expect(el.querySelector('.arvo-search__counter')!.getAttribute('aria-live')).toBe('polite');
  });

  it('counter badge shows initial counter value', () => {
    const el = createEl();
    new ArvoSearch(el, { counter: { current: 2, total: 8 } });
    expect(el.querySelector('.arvo-search__counter')!.textContent).toBe('2/8');
  });

  it('sets placeholder on input', () => {
    const el = createEl();
    new ArvoSearch(el, { placeholder: 'Find...' });
    expect(el.querySelector('input')!.placeholder).toBe('Find...');
  });

  it('sets initial value on input', () => {
    const el = createEl();
    new ArvoSearch(el, { value: 'hello' });
    expect(el.querySelector('input')!.value).toBe('hello');
  });

  it('adds has-value class when initial value is non-empty', () => {
    const el = createEl();
    new ArvoSearch(el, { value: 'hello' });
    expect(el.classList.contains('has-value')).toBe(true);
  });

  it('does not add has-value class when value is empty', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.classList.contains('has-value')).toBe(false);
  });

  it('sets aria-label on input', () => {
    const el = createEl();
    new ArvoSearch(el, { 'aria-label': 'Find in page' });
    expect(el.querySelector('input')!.getAttribute('aria-label')).toBe('Find in page');
  });

  it('input has default aria-label="Search"', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('input')!.getAttribute('aria-label')).toBe('Search');
  });

  it('adds arvo-search--multi-line class when multiLine=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    expect(el.classList.contains('arvo-search--multi-line')).toBe(true);
  });

  it('creates inline alert element in non-inlineError mode', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-msg-alert')).not.toBeNull();
  });

  it('inline alert is hidden by default when not invalid', () => {
    const el = createEl();
    new ArvoSearch(el);
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).toBe('none');
  });

  it('creates inline error icon when inlineError=true', () => {
    const el = createEl();
    new ArvoSearch(el, { errorDisplay: 'tooltip' });
    expect(el.querySelector('.arvo-search__err-ico')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// State classes on init
// ---------------------------------------------------------------------------
describe('ArvoSearch - initial state classes', () => {
  it('adds is-disabled class when disabled=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('adds has-error class when invalid=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('adds error-tooltip class when invalid + errorDisplay is "tooltip"', () => {
    const el = createEl();
    new ArvoSearch(el, { isInvalid: true, errorDisplay: 'tooltip' });
    expect(el.classList.contains('error-tooltip')).toBe(true);
  });

  it('adds loading class when loading=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('sets aria-busy on root when loading=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('sets aria-invalid on input when invalid=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isInvalid: true });
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets aria-describedby on input when invalid (non-inline)', () => {
    const el = createEl();
    new ArvoSearch(el, { isInvalid: true });
    expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('shows inline alert when initially invalid (non-inline)', () => {
    const el = createEl();
    new ArvoSearch(el, { isInvalid: true });
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).not.toBe('none');
  });

  it('input disabled when disabled=true', () => {
    const el = createEl();
    new ArvoSearch(el, { isDisabled: true });
    expect(el.querySelector('input')!.disabled).toBe(true);
  });

  // -- defaultValue (uncontrolled initial value) --

  it('seeds uncontrolled value from defaultValue', () => {
    const el = createEl();
    const search = new ArvoSearch(el, { defaultValue: 'seed' });
    expect(search.value()).toBe('seed');
    expect(el.querySelector('input')!.value).toBe('seed');
    expect(el.classList.contains('has-value')).toBe(true);
  });

  it('controlled value takes precedence over defaultValue', () => {
    const el = createEl();
    const search = new ArvoSearch(el, { value: 'controlled', defaultValue: 'seed' });
    expect(search.value()).toBe('controlled');
    expect(el.querySelector('input')!.value).toBe('controlled');
  });

  it('value defaults to empty string when both value and defaultValue are omitted', () => {
    const el = createEl();
    const search = new ArvoSearch(el);
    expect(search.value()).toBe('');
    expect(el.classList.contains('has-value')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// value()
// ---------------------------------------------------------------------------
describe('ArvoSearch - value()', () => {
  it('value() returns initial empty string', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.value()).toBe('');
  });

  it('value() returns initial value', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    expect(instance.value()).toBe('hello');
  });

  it('value(newValue) sets value on input element', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.value('world');
    expect(el.querySelector('input')!.value).toBe('world');
  });

  it('value() returns updated value after value(newValue)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.value('world');
    expect(instance.value()).toBe('world');
  });

  it('value(newValue) adds has-value class when non-empty', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.value('abc');
    expect(el.classList.contains('has-value')).toBe(true);
  });

  it('value("") removes has-value class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    instance.value('');
    expect(el.classList.contains('has-value')).toBe(false);
  });

  it('value(newValue) fires search:change event when value differs', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'old' });
    const handler = vi.fn();
    el.addEventListener('search:change', handler);
    instance.value('new');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('value(newValue) search:change detail has correct value and previousValue', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'a' });
    const handler = vi.fn();
    el.addEventListener('search:change', handler);
    instance.value('b');
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toMatchObject({ value: 'b', previousValue: 'a' });
  });

  it('value(same) does not fire search:change when unchanged', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'same' });
    const handler = vi.fn();
    el.addEventListener('search:change', handler);
    instance.value('same');
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------
describe('ArvoSearch - clear()', () => {
  it('clear() empties input value', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    instance.clear();
    expect(el.querySelector('input')!.value).toBe('');
  });

  it('clear() makes value() return empty string', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    instance.clear();
    expect(instance.value()).toBe('');
  });

  it('clear() removes has-value class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    instance.clear();
    expect(el.classList.contains('has-value')).toBe(false);
  });

  it('clear() dispatches search:clear event', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    const handler = vi.fn();
    el.addEventListener('search:clear', handler);
    instance.clear();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clear() calls onClear callback', () => {
    const onClear = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello', onClear });
    instance.clear();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('clear() event bubbles', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    let captured: CustomEvent | null = null;
    document.body.addEventListener('search:clear', (e) => { captured = e as CustomEvent; });
    instance.clear();
    expect(captured).not.toBeNull();
    expect(captured!.bubbles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// search()
// ---------------------------------------------------------------------------
describe('ArvoSearch - search()', () => {
  it('search() dispatches search:search event', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'test' });
    const handler = vi.fn();
    el.addEventListener('search:search', handler);
    instance.search();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('search() event detail has current value', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'query' });
    const handler = vi.fn();
    el.addEventListener('search:search', handler);
    instance.search();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.value).toBe('query');
  });

  it('search() calls onSearch callback', () => {
    const onSearch = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'test', onSearch });
    instance.search();
    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('search() with multiLine passes values array to onSearch', () => {
    const onSearch = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { isMultiLine: true, onSearch });
    instance.value('foo,bar');
    instance.search();
    expect(onSearch).toHaveBeenCalledWith('foo,bar', expect.arrayContaining(['foo', 'bar']));
  });

  it('search() event bubbles', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    let captured: CustomEvent | null = null;
    document.body.addEventListener('search:search', (e) => { captured = e as CustomEvent; });
    instance.search();
    expect(captured).not.toBeNull();
    expect(captured!.bubbles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// next() / previous()
// ---------------------------------------------------------------------------
describe('ArvoSearch - next() / previous()', () => {
  it('next() dispatches search:next event in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    const handler = vi.fn();
    el.addEventListener('search:next', handler);
    instance.next();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('previous() dispatches search:previous event in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    const handler = vi.fn();
    el.addEventListener('search:previous', handler);
    instance.previous();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('next() calls onNext callback', () => {
    const onNext = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', onNext });
    instance.next();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('previous() calls onPrevious callback', () => {
    const onPrevious = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', onPrevious });
    instance.previous();
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('next() does nothing in filter variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'filter' });
    const handler = vi.fn();
    el.addEventListener('search:next', handler);
    instance.next();
    expect(handler).not.toHaveBeenCalled();
  });

  it('previous() does nothing in filter variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'filter' });
    const handler = vi.fn();
    el.addEventListener('search:previous', handler);
    instance.previous();
    expect(handler).not.toHaveBeenCalled();
  });

  it('next() does nothing when disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', isDisabled: true });
    const handler = vi.fn();
    el.addEventListener('search:next', handler);
    instance.next();
    expect(handler).not.toHaveBeenCalled();
  });

  it('next() does nothing when loading', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', isLoading: true });
    const handler = vi.fn();
    el.addEventListener('search:next', handler);
    instance.next();
    expect(handler).not.toHaveBeenCalled();
  });

  it('next() does nothing when counter.total === 0', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', counter: { current: 0, total: 0 } });
    const handler = vi.fn();
    el.addEventListener('search:next', handler);
    instance.next();
    expect(handler).not.toHaveBeenCalled();
  });

  it('next() event bubbles', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    let captured: CustomEvent | null = null;
    document.body.addEventListener('search:next', (e) => { captured = e as CustomEvent; });
    instance.next();
    expect(captured).not.toBeNull();
    expect(captured!.bubbles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------
describe('ArvoSearch - disabled()', () => {
  it('disabled() returns false by default', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.disabled()).toBe(false);
  });

  it('disabled() returns true when initialized with disabled=true', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled(true) adds is-disabled class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets input.disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.disabled(true);
    expect(el.querySelector('input')!.disabled).toBe(true);
  });

  it('disabled(true) sets aria-disabled on root element', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.disabled(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) clears input.disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.querySelector('input')!.disabled).toBe(false);
  });

  it('disabled(false) removes aria-disabled from input', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    instance.disabled(false);
    expect(el.querySelector('input')!.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled() reflects disabled(true)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
  });

  it('disabled() reflects disabled(false)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    instance.disabled(false);
    expect(instance.disabled()).toBe(false);
  });

  it('disabled(true) disables prev/next buttons in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    instance.disabled(true);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setLoading()
// ---------------------------------------------------------------------------
describe('ArvoSearch - setLoading()', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) blurs input if focused', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    const input = el.querySelector('input')!;
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    instance.setLoading(true);
    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it('setLoading(true) disables prev/next in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    instance.setLoading(true);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('setLoading(false) re-enables prev/next when not disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', isLoading: true });
    instance.setLoading(false);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(false);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(false);
  });

  it('setLoading(false) keeps prev/next disabled when parent is disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', isDisabled: true, isLoading: true });
    instance.setLoading(false);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setError()
// ---------------------------------------------------------------------------
describe('ArvoSearch - setError()', () => {
  it('setError(msg) adds has-error class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setError('Required');
    expect(el.classList.contains('has-error')).toBe(true);
  });

  it('setError(msg) sets aria-invalid on input', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setError('Required');
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('setError(msg) sets aria-describedby on input when non-inlineError', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setError('Error');
    expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('setError(msg) shows inline alert', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setError('Error');
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).not.toBe('none');
  });

  it('setError(false) removes has-error class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isInvalid: true });
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('setError(false) removes aria-invalid', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isInvalid: true });
    instance.setError(false);
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBeNull();
  });

  it('setError(false) removes aria-describedby', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setError('err');
    instance.setError(false);
    expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBeNull();
  });

  it('setError(false) hides the inline alert', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.setError('err');
    instance.setError(false);
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).toBe('none');
  });

  it('setError(false) removes error-tooltip class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { errorDisplay: 'tooltip' });
    instance.setError('Error');
    instance.setError(false);
    expect(el.classList.contains('error-tooltip')).toBe(false);
  });

  it('initial invalid shows inline alert', () => {
    const el = createEl();
    new ArvoSearch(el, { isInvalid: true });
    const alert = el.querySelector('.arvo-msg-alert') as HTMLElement | null;
    expect(alert!.style.display).not.toBe('none');
  });

  it('tooltip error mode adds error-tooltip class when setError called', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { errorDisplay: 'tooltip' });
    instance.setError('Error');
    expect(el.classList.contains('error-tooltip')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shortcut()
// ---------------------------------------------------------------------------
describe('ArvoSearch - shortcut()', () => {
  it('shortcut() returns null when no shortcut set', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.shortcut()).toBeNull();
  });

  it('shortcut() returns initial shortcut value', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: 'Ctrl+K' });
    expect(instance.shortcut()).toBe('Ctrl+K');
  });

  it('shortcut(newValue) updates shortcut badge text', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: 'Ctrl+K' });
    instance.shortcut('/');
    expect(el.querySelector('.arvo-search__shortcut')!.textContent).toBe('/');
  });

  it('shortcut() returns updated value after shortcut(newValue)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: 'Ctrl+K' });
    instance.shortcut('/');
    expect(instance.shortcut()).toBe('/');
  });

  it('shortcut(null) removes global listener', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: '/' });
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');
    instance.shortcut(null);
    expect(removeListenerSpy).toHaveBeenCalled();
  });

  it('shortcut key press focuses and selects input', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: '/' });
    const input = el.querySelector('input')! as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    const selectSpy = vi.spyOn(input, 'select');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
    instance.destroy();
  });

  it('shortcut does not fire when disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: '/', isDisabled: true });
    const input = el.querySelector('input')! as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(focusSpy).not.toHaveBeenCalled();
    instance.destroy();
  });

  it('shortcut does not fire when loading', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: '/', isLoading: true });
    const input = el.querySelector('input')! as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(focusSpy).not.toHaveBeenCalled();
    instance.destroy();
  });
});

// ---------------------------------------------------------------------------
// counter()
// ---------------------------------------------------------------------------
describe('ArvoSearch - counter()', () => {
  it('counter() returns null when not set', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.counter()).toBeNull();
  });

  it('counter() returns initial counter value', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { counter: { current: 3, total: 10 } });
    expect(instance.counter()).toEqual({ current: 3, total: 10 });
  });

  it('counter(current, total) updates badge text', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.counter(4, 20);
    expect(el.querySelector('.arvo-search__counter')!.textContent).toBe('4/20');
  });

  it('counter() returns updated value after counter(current, total)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.counter(1, 5);
    expect(instance.counter()).toEqual({ current: 1, total: 5 });
  });

  it('counter(0, 0) disables nav buttons in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', counter: { current: 1, total: 5 } });
    instance.counter(0, 0);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('counter(1, 5) re-enables nav buttons in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', counter: { current: 0, total: 0 } });
    instance.counter(1, 5);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(false);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// focus()
// ---------------------------------------------------------------------------
describe('ArvoSearch - focus()', () => {
  it('focus() focuses the native input', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.focus();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('focus() does nothing when disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.focus();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('focus() does nothing when loading', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isLoading: true });
    const input = el.querySelector('input')!;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.focus();
    expect(focusSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Keyboard interactions
// ---------------------------------------------------------------------------
describe('ArvoSearch - keyboard interactions', () => {
  it('Enter key fires search:search in filter variant (searchMode=submit)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { searchMode: 'submit', value: 'abc' });
    const handler = vi.fn();
    el.addEventListener('search:search', handler);
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    instance.destroy();
  });

  it('Enter key fires search:next in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    const handler = vi.fn();
    el.addEventListener('search:next', handler);
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    instance.destroy();
  });

  it('Shift+Enter fires search:previous in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    const handler = vi.fn();
    el.addEventListener('search:previous', handler);
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    instance.destroy();
  });

  it('Escape clears input when clearable and has value', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello', isClearable: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe('');
    instance.destroy();
  });

  it('Escape does not clear when clearable=false', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello', isClearable: false });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe('hello');
    instance.destroy();
  });

  it('keydown suppressed when disabled', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true, value: 'hello', isClearable: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe('hello');
    instance.destroy();
  });

  it('keydown suppressed when loading', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isLoading: true, value: 'hello', isClearable: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(instance.value()).toBe('hello');
    instance.destroy();
  });

  it('input event fires search:input event', () => {
    const el = createEl();
    new ArvoSearch(el);
    const handler = vi.fn();
    el.addEventListener('search:input', handler);
    const input = el.querySelector('input')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('input event calls onInput callback', () => {
    const onInput = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { onInput });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('input event suppressed when disabled', () => {
    const onInput = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { onInput, isDisabled: true });
    const input = el.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).not.toHaveBeenCalled();
  });

  it('searchMode=input fires onSearch on input event', () => {
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'input', onSearch, debounceMs: 0 });
    const input = el.querySelector('input')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('searchMode=input respects minChars', () => {
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'input', onSearch, minChars: 3, debounceMs: 0 });
    const input = el.querySelector('input')!;
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('searchMode=submit does not fire onSearch on input', () => {
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit', onSearch });
    const input = el.querySelector('input')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('ArvoSearch - custom events', () => {
  it('search:search event is cancelable', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    let captured: CustomEvent | null = null;
    el.addEventListener('search:search', (e) => { captured = e as CustomEvent; });
    instance.search();
    expect(captured!.cancelable).toBe(true);
  });

  it('search:clear event is cancelable', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    let captured: CustomEvent | null = null;
    el.addEventListener('search:clear', (e) => { captured = e as CustomEvent; });
    instance.clear();
    expect(captured!.cancelable).toBe(true);
  });

  it('search:next event is cancelable', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    let captured: CustomEvent | null = null;
    el.addEventListener('search:next', (e) => { captured = e as CustomEvent; });
    instance.next();
    expect(captured!.cancelable).toBe(true);
  });

  it('search:previous event is cancelable', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    let captured: CustomEvent | null = null;
    el.addEventListener('search:previous', (e) => { captured = e as CustomEvent; });
    instance.previous();
    expect(captured!.cancelable).toBe(true);
  });

  it('search:change fires on blur when value changed', () => {
    const el = createEl();
    new ArvoSearch(el);
    const handler = vi.fn();
    el.addEventListener('search:change', handler);
    const input = el.querySelector('input')!;
    input.value = 'typed';
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    input.value = 'changed';
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.value).toBe('changed');
  });
});

// ---------------------------------------------------------------------------
// Inner component composition
// ---------------------------------------------------------------------------
describe('ArvoSearch - inner component composition', () => {
  it('clear button renders as ArvoIconButton (has arvo-icon-btn class)', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__clear')!.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('clear button has tertiary variant class', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__clear')!.classList.contains('arvo-btn--tertiary')).toBe(true);
  });

  it('clear button has sm size class', () => {
    const el = createEl();
    new ArvoSearch(el);
    expect(el.querySelector('.arvo-search__clear')!.classList.contains('arvo-btn--xs')).toBe(true);
  });

  it('prev button renders as ArvoIconButton (has arvo-icon-btn class)', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find' });
    expect(el.querySelector('.arvo-search__prev')!.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('next button renders as ArvoIconButton (has arvo-icon-btn class)', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find' });
    expect(el.querySelector('.arvo-search__next')!.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('prev button has aria-label="Previous match"', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find' });
    expect(el.querySelector('.arvo-search__prev')!.getAttribute('aria-label')).toBe('Previous match');
  });

  it('next button has aria-label="Next match"', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find' });
    expect(el.querySelector('.arvo-search__next')!.getAttribute('aria-label')).toBe('Next match');
  });

  it('disabled(true) disables clear button', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isClearable: true });
    instance.disabled(true);
    expect((el.querySelector('.arvo-search__clear') as HTMLButtonElement).disabled).toBe(true);
  });

  it('setLoading(true) disables clear button', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isClearable: true });
    instance.setLoading(true);
    expect((el.querySelector('.arvo-search__clear') as HTMLButtonElement).disabled).toBe(true);
  });

  it('counter.total=0 disables prev/next in find variant', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find', counter: { current: 0, total: 0 } });
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('counter.total>0 keeps prev/next enabled in find variant', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find', counter: { current: 1, total: 5 } });
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(false);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------
describe('ArvoSearch - destroy()', () => {
  it('removes arvo-search base class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(el.classList.contains('arvo-search')).toBe(false);
  });

  it('removes variant class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(el.classList.contains('arvo-search--filter')).toBe(false);
  });

  it('removes is-disabled class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    instance.destroy();
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('removes has-error class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isInvalid: true });
    instance.destroy();
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('removes loading class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isLoading: true });
    instance.destroy();
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('removes has-value class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    instance.destroy();
    expect(el.classList.contains('has-value')).toBe(false);
  });

  it('removes role attribute', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('removes aria-busy attribute', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isLoading: true });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes field element from DOM', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(el.querySelector('.arvo-search__field')).toBeNull();
  });

  it('removes inline alert from DOM', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(el.querySelector('.arvo-msg-alert')).toBeNull();
  });

  it('removes global shortcut listener on destroy', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { shortcut: '/' });
    const input = el.querySelector('input')! as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    instance.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('disconnects ResizeObserver on destroy', () => {
    const disconnectSpy = vi.fn();
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: disconnectSpy,
      unobserve: vi.fn(),
    }));
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('does not call onSearch after destroy', () => {
    const onSearch = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { onSearch, searchMode: 'submit' });
    const input = el.querySelector('input')!;
    instance.destroy();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });

  it('does not remove the container element itself', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.destroy();
    expect(document.body.contains(el)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// width()
// ---------------------------------------------------------------------------
describe('ArvoSearch - width()', () => {
  it('width() returns null by default', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.width()).toBeNull();
  });

  it('width(value) sets --arvo-form-input-width on root', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.width('250px');
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('250px');
  });

  it('width() returns updated value after width(value)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.width('300px');
    expect(instance.width()).toBe('300px');
  });

  it('width(null) removes --arvo-form-input-width from root', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { width: '200px' });
    instance.width(null);
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// fullWidth()
// ---------------------------------------------------------------------------
describe('ArvoSearch - fullWidth()', () => {
  it('fullWidth() returns false by default', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.fullWidth()).toBe(false);
  });

  it('fullWidth(true) adds arvo-search--full-width class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.fullWidth(true);
    expect(el.classList.contains('arvo-search--full-width')).toBe(true);
  });

  it('fullWidth(true) sets --arvo-form-input-width to 100%', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.fullWidth(true);
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('fullWidth(false) removes arvo-search--full-width class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isFullWidth: true });
    instance.fullWidth(false);
    expect(el.classList.contains('arvo-search--full-width')).toBe(false);
  });

  it('fullWidth() returns updated value after fullWidth(true)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.fullWidth(true);
    expect(instance.fullWidth()).toBe(true);
  });

  it('initial fullWidth=true adds class on construction', () => {
    const el = createEl();
    new ArvoSearch(el, { isFullWidth: true });
    expect(el.classList.contains('arvo-search--full-width')).toBe(true);
  });

  it('initial width sets --arvo-form-input-width on construction', () => {
    const el = createEl();
    new ArvoSearch(el, { width: '400px' });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('400px');
  });

  it('fullWidth takes precedence over width', () => {
    const el = createEl();
    new ArvoSearch(el, { width: '200px', isFullWidth: true });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('100%');
  });

  it('destroy removes --arvo-form-input-width', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { width: '300px' });
    instance.destroy();
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('');
  });

  it('destroy removes arvo-search--full-width class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isFullWidth: true });
    instance.destroy();
    expect(el.classList.contains('arvo-search--full-width')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readOnly()
// ---------------------------------------------------------------------------
describe('ArvoSearch - readOnly()', () => {
  it('readOnly() returns false by default', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    expect(instance.readOnly()).toBe(false);
  });

  it('readOnly() returns true when initialized with isReadOnly=true', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isReadOnly: true });
    expect(instance.readOnly()).toBe(true);
  });

  it('readOnly(true) adds is-readonly class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.readOnly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
  });

  it('readOnly(true) sets input.readOnly and aria-readonly="true"', () => {
    const el = createEl();
    const instance = new ArvoSearch(el);
    instance.readOnly(true);
    expect((el.querySelector('input') as HTMLInputElement).readOnly).toBe(true);
    expect(el.querySelector('input')!.getAttribute('aria-readonly')).toBe('true');
  });

  it('readOnly(false) removes is-readonly class', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isReadOnly: true });
    instance.readOnly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });

  it('readOnly(false) clears aria-readonly from input', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isReadOnly: true });
    instance.readOnly(false);
    expect(el.querySelector('input')!.hasAttribute('aria-readonly')).toBe(false);
  });

  it('readOnly(true) disables the submit button when searchMode=submit', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { searchMode: 'submit' });
    instance.readOnly(true);
    expect((el.querySelector('.arvo-search__submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('readOnly(true) disables prev/next buttons in find variant', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find' });
    instance.readOnly(true);
    expect((el.querySelector('.arvo-search__prev') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.arvo-search__next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disabled wins: when isDisabled is true, is-readonly is NOT added by readOnly(true)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { isDisabled: true });
    instance.readOnly(true);
    expect(el.classList.contains('is-readonly')).toBe(false);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// debounceMs
// ---------------------------------------------------------------------------
describe('ArvoSearch - debounceMs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('default debounceMs=0 fires onSearch synchronously on input event', () => {
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'input', onSearch });
    const input = el.querySelector('input')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('debounceMs=200 delays onSearch until timer fires', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'input', onSearch, debounceMs: 200 });
    const input = el.querySelector('input')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('multiple rapid inputs collapse to a single onSearch call', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'input', onSearch, debounceMs: 200 });
    const input = el.querySelector('input')!;
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('Enter cancels pending debounce and fires search synchronously', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { searchMode: 'input', onSearch, value: 'abc', debounceMs: 200 });
    const input = el.querySelector('input')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(onSearch).toHaveBeenCalledTimes(1);
    instance.destroy();
  });

  it('clear() cancels pending debounce (does not fire search:change)', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { searchMode: 'input', value: 'hello', debounceMs: 200 });
    el.addEventListener('search:change', onChange);
    const input = el.querySelector('input')!;
    input.value = 'hello2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    instance.clear();
    vi.advanceTimersByTime(200);
    // clear fires search:clear but NOT search:change
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------
describe('ArvoSearch - submit button (JS)', () => {
  it('submit button renders when searchMode=submit', () => {
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit' });
    expect(el.querySelector('.arvo-search__submit')).not.toBeNull();
  });

  it('submit button not rendered when searchMode=input', () => {
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'input' });
    expect(el.querySelector('.arvo-search__submit')).toBeNull();
  });

  it('submit button has arvo-btn--primary and arvo-btn--sm classes', () => {
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit' });
    const btn = el.querySelector('.arvo-search__submit')!;
    expect(btn.classList.contains('arvo-btn--primary')).toBe(true);
    expect(btn.classList.contains('arvo-btn--sm')).toBe(true);
  });

  it('clicking submit button fires onSearch with current value', () => {
    const onSearch = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit', value: 'hello', onSearch });
    (el.querySelector('.arvo-search__submit') as HTMLButtonElement).click();
    expect(onSearch).toHaveBeenCalledWith('hello');
  });

  it('submit button is disabled when isDisabled', () => {
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit', isDisabled: true });
    expect((el.querySelector('.arvo-search__submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('submit button is disabled when isReadOnly', () => {
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit', isReadOnly: true });
    expect((el.querySelector('.arvo-search__submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('submit button dispatches search:search on click', () => {
    const handler = vi.fn();
    const el = createEl();
    new ArvoSearch(el, { searchMode: 'submit', value: 'query' });
    el.addEventListener('search:search', handler);
    (el.querySelector('.arvo-search__submit') as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail as { value: string };
    expect(detail.value).toBe('query');
  });
});

// ---------------------------------------------------------------------------
// Expandable-filter variant
// ---------------------------------------------------------------------------
describe('ArvoSearch - expandable-filter variant (JS)', () => {
  it('renders __expand-trigger container', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    expect(el.querySelector('.arvo-search__expand-trigger')).not.toBeNull();
  });

  it('starts collapsed with arvo-search--collapsed class', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    expect(el.classList.contains('arvo-search--collapsed')).toBe(true);
  });

  it('trigger button has aria-expanded="false" when collapsed', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    const trigger = el.querySelector('.arvo-search__expand-trigger button')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('expanded() getter returns false initially', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter' });
    expect(instance.expanded()).toBe(false);
  });

  it('expanded(true) removes --collapsed class and updates aria-expanded', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter' });
    instance.expanded(true);
    expect(el.classList.contains('arvo-search--collapsed')).toBe(false);
    const trigger = el.querySelector('.arvo-search__expand-trigger button')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('expanded() getter returns true after expanded(true)', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter' });
    instance.expanded(true);
    expect(instance.expanded()).toBe(true);
  });

  it('expanded(false) adds --collapsed class back', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter', defaultExpanded: true });
    instance.expanded(false);
    expect(el.classList.contains('arvo-search--collapsed')).toBe(true);
  });

  it('expandDirection=start adds arvo-search--expand-start class', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', expandDirection: 'start' });
    expect(el.classList.contains('arvo-search--expand-start')).toBe(true);
  });

  it('expanded(true) calls onExpandedChange with true', () => {
    const onExpandedChange = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter', onExpandedChange });
    instance.expanded(true);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// search:expand / search:collapse events
// ---------------------------------------------------------------------------
describe('ArvoSearch - search:expand / search:collapse events', () => {
  it('expanded(true) dispatches search:expand event', () => {
    const handler = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter' });
    el.addEventListener('search:expand', handler);
    instance.expanded(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).bubbles).toBe(true);
  });

  it('expanded(false) dispatches search:collapse event', () => {
    const handler = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter', defaultExpanded: true });
    el.addEventListener('search:collapse', handler);
    instance.expanded(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Polish: animation-friendly layout (field + trigger always rendered),
  // inert-based focus suppression, and collapsed-state invalid suppression.
  // -------------------------------------------------------------------------

  it('field stays in the DOM while collapsed (for width animation)', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    expect(el.classList.contains('arvo-search--collapsed')).toBe(true);
    expect(el.querySelector('.arvo-search__field')).toBeTruthy();
  });

  it('trigger stays in the DOM while expanded (for width animation)', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', defaultExpanded: true });
    expect(el.classList.contains('arvo-search--collapsed')).toBe(false);
    expect(el.querySelector('.arvo-search__expand-trigger')).toBeTruthy();
  });

  it('collapsed: field has inert attribute (removed from tab order + a11y)', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    expect(el.querySelector('.arvo-search__field')?.hasAttribute('inert')).toBe(true);
  });

  it('expanded: field has no inert attribute', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', defaultExpanded: true });
    expect(el.querySelector('.arvo-search__field')?.hasAttribute('inert')).toBe(false);
  });

  it('collapsed: trigger has no inert attribute', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    expect(el.querySelector('.arvo-search__expand-trigger')?.hasAttribute('inert')).toBe(false);
  });

  it('expanded: trigger has inert attribute', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', defaultExpanded: true });
    expect(el.querySelector('.arvo-search__expand-trigger')?.hasAttribute('inert')).toBe(true);
  });

  it('expanded(true) removes inert from field and adds it to trigger', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter' });
    instance.expanded(true);
    expect(el.querySelector('.arvo-search__field')?.hasAttribute('inert')).toBe(false);
    expect(el.querySelector('.arvo-search__expand-trigger')?.hasAttribute('inert')).toBe(true);
  });

  it('expanded(false) re-adds inert on field and removes it from trigger', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter', defaultExpanded: true });
    instance.expanded(false);
    expect(el.querySelector('.arvo-search__field')?.hasAttribute('inert')).toBe(true);
    expect(el.querySelector('.arvo-search__expand-trigger')?.hasAttribute('inert')).toBe(false);
  });

  it('collapsed + isInvalid: does NOT apply has-error class', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(false);
  });

  it('collapsed + isInvalid + errorDisplay=tooltip: does NOT apply error-tooltip class', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', isInvalid: true, errorDisplay: 'tooltip' });
    expect(el.classList.contains('error-tooltip')).toBe(false);
  });

  it('collapsed + isInvalid: does NOT set aria-invalid on input', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', isInvalid: true });
    expect(el.querySelector('input')?.hasAttribute('aria-invalid')).toBe(false);
  });

  it('collapsed + isInvalid: keeps the inline alert hidden', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter', isInvalid: true, errorDisplay: 'inline' });
    const alert = el.querySelector('[class*="arvo-msg-alert"]') as HTMLElement | null;
    // Alert may or may not be in the DOM but, if present, MUST be hidden.
    if (alert) expect(alert.style.display).toBe('none');
  });

  it('expanded + isInvalid: applies has-error and reveals the inline alert', () => {
    const el = createEl();
    new ArvoSearch(el, {
      variant: 'expandable-filter',
      defaultExpanded: true,
      isInvalid: true,
    });
    expect(el.classList.contains('has-error')).toBe(true);
    const alert = el.querySelector('[class*="arvo-msg-alert"]') as HTMLElement | null;
    expect(alert).toBeTruthy();
    if (alert) expect(alert.style.display).not.toBe('none');
  });

  it('expanded(true) re-applies the invalid affordance', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter', isInvalid: true });
    expect(el.classList.contains('has-error')).toBe(false);
    instance.expanded(true);
    expect(el.classList.contains('has-error')).toBe(true);
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('expanded(false) suppresses the invalid affordance again', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, {
      variant: 'expandable-filter',
      defaultExpanded: true,
      isInvalid: true,
    });
    expect(el.classList.contains('has-error')).toBe(true);
    instance.expanded(false);
    expect(el.classList.contains('has-error')).toBe(false);
    expect(el.querySelector('input')?.hasAttribute('aria-invalid')).toBe(false);
  });

  it('setError() while collapsed records the message but suppresses visuals', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'expandable-filter' });
    instance.setError('Too short');
    expect(el.classList.contains('has-error')).toBe(false);
    expect(el.querySelector('input')?.hasAttribute('aria-invalid')).toBe(false);
    // Expanding now should reveal the recorded error.
    instance.expanded(true);
    expect(el.classList.contains('has-error')).toBe(true);
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  // -------------------------------------------------------------------------
  // Trigger size + auto-expand-on-focus + auto-collapse-on-blur (JS parity)
  // -------------------------------------------------------------------------

  it('expand-trigger uses ArvoIconButton size md so it fills the 32x32 collapsed footprint', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    const trigger = el.querySelector('.arvo-search__expand-trigger button')!;
    expect(trigger.classList.contains('arvo-btn--md')).toBe(true);
    expect(trigger.classList.contains('arvo-btn--sm')).toBe(false);
  });

  it('focusing the trigger auto-expands (parity with click path)', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'expandable-filter' });
    const trigger = el.querySelector(
      '.arvo-search__expand-trigger button'
    ) as HTMLButtonElement;
    trigger.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(el.classList.contains('arvo-search--collapsed')).toBe(false);
  });

  it('focusing the trigger fires search:expand and onExpandedChange(true)', () => {
    const expand = vi.fn();
    const onExpandedChange = vi.fn();
    const el = createEl();
    new ArvoSearch(el, {
      variant: 'expandable-filter',
      onExpandedChange,
    });
    el.addEventListener('search:expand', expand);
    const trigger = el.querySelector(
      '.arvo-search__expand-trigger button'
    ) as HTMLButtonElement;
    trigger.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(expand).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it('blurring out of an expanded EMPTY field auto-collapses', () => {
    const el = createEl();
    new ArvoSearch(el, {
      variant: 'expandable-filter',
      defaultExpanded: true,
    });
    const input = el.querySelector('input')!;
    // Simulate focus leaving the entire root.
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })
    );
    expect(el.classList.contains('arvo-search--collapsed')).toBe(true);
  });

  it('blurring out of an expanded NON-empty field keeps the field expanded', () => {
    const el = createEl();
    new ArvoSearch(el, {
      variant: 'expandable-filter',
      defaultExpanded: true,
      value: 'hello',
    });
    const input = el.querySelector('input')!;
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })
    );
    expect(el.classList.contains('arvo-search--collapsed')).toBe(false);
  });

  it('auto-collapse on blur fires search:collapse + onExpandedChange(false)', () => {
    const collapse = vi.fn();
    const onExpandedChange = vi.fn();
    const el = createEl();
    new ArvoSearch(el, {
      variant: 'expandable-filter',
      defaultExpanded: true,
      onExpandedChange,
    });
    el.addEventListener('search:collapse', collapse);
    const input = el.querySelector('input')!;
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })
    );
    expect(collapse).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('focus moving from trigger to input within the root does NOT auto-collapse', () => {
    const el = createEl();
    new ArvoSearch(el, {
      variant: 'expandable-filter',
      defaultExpanded: true,
    });
    const input = el.querySelector('input')!;
    // relatedTarget is INSIDE the root -> focusout handler short-circuits.
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: el })
    );
    expect(el.classList.contains('arvo-search--collapsed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Find variant opt-outs
// ---------------------------------------------------------------------------
describe('ArvoSearch - find variant opt-outs (JS)', () => {
  it('hasPreviousButton=false removes the __prev button', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find', hasPreviousButton: false });
    expect(el.querySelector('.arvo-search__prev')).toBeNull();
  });

  it('hasNextButton=false removes the __next button', () => {
    const el = createEl();
    new ArvoSearch(el, { variant: 'find', hasNextButton: false });
    expect(el.querySelector('.arvo-search__next')).toBeNull();
  });

  it('hasPreviousButton=false: Shift+Enter does not fire search:previous', () => {
    const handler = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', hasPreviousButton: false });
    el.addEventListener('search:previous', handler);
    el.querySelector('input')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
    );
    expect(handler).not.toHaveBeenCalled();
    instance.destroy();
  });

  it('hasNextButton=false: Enter does not fire search:next', () => {
    const handler = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { variant: 'find', hasNextButton: false });
    el.addEventListener('search:next', handler);
    el.querySelector('input')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    expect(handler).not.toHaveBeenCalled();
    instance.destroy();
  });
});

// ---------------------------------------------------------------------------
// Multiline parity (enhanced) - JS
// ---------------------------------------------------------------------------
describe('ArvoSearch - multiline parity (enhanced) (JS)', () => {
  it('delimiterBehavior=none: comma is literal (not replaced)', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: { enabled: true, delimiterBehavior: 'none' } });
    const ta = el.querySelector('textarea')!;
    ta.value = 'foo,bar';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('foo,bar');
  });

  it('delimiterBehavior=comma-to-new-row (default): comma is replaced with newline', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    const ta = el.querySelector('textarea')!;
    ta.value = 'foo,bar';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('foo\nbar');
  });

  it('delimiterBehavior=shift+enter: comma is literal', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: { enabled: true, delimiterBehavior: 'shift+enter' } });
    const ta = el.querySelector('textarea')!;
    ta.value = 'foo,bar';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('foo,bar');
  });

  it('backward compat: { enabled: true, delimiter: ";" } replaces ";" with newline', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: { enabled: true, delimiter: ';' } });
    const ta = el.querySelector('textarea')!;
    ta.value = 'foo;bar';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('foo\nbar');
  });

  it('collapseBehavior=summary: blur with >1 value adds --summary class', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: { enabled: true, collapseBehavior: 'summary' } });
    const ta = el.querySelector('textarea')!;
    ta.value = 'alpha\nbeta\ngamma';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(el.classList.contains('arvo-search--summary')).toBe(true);
    expect(ta.value).toBe('alpha, +2 more');
  });

  it('collapseBehavior=summary: re-focus restores real value', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: { enabled: true, collapseBehavior: 'summary' } });
    const ta = el.querySelector('textarea')!;
    ta.value = 'alpha\nbeta';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    ta.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(ta.value).toBe('alpha\nbeta');
    expect(el.classList.contains('arvo-search--summary')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Initial summary collapse on mount + empty-row prevention (JS parity)
  // -------------------------------------------------------------------------

  it('collapseBehavior=summary: enters summary mode on initial render when seeded value has > 1 parsed entry', () => {
    const el = createEl();
    new ArvoSearch(el, {
      isMultiLine: { enabled: true, collapseBehavior: 'summary' },
      value: 'alpha\nbeta\ngamma\ndelta',
    });
    expect(el.classList.contains('arvo-search--summary')).toBe(true);
    expect(el.querySelector('textarea')!.value).toBe('alpha, +3 more');
  });

  it('collapseBehavior=summary: defaultValue is honoured for the initial summary', () => {
    const el = createEl();
    new ArvoSearch(el, {
      isMultiLine: { enabled: true, collapseBehavior: 'summary' },
      defaultValue: 'one\ntwo',
    });
    expect(el.classList.contains('arvo-search--summary')).toBe(true);
    expect(el.querySelector('textarea')!.value).toBe('one, +1 more');
  });

  it('collapseBehavior=summary: single-entry seed does NOT enter summary mode', () => {
    const el = createEl();
    new ArvoSearch(el, {
      isMultiLine: { enabled: true, collapseBehavior: 'summary' },
      value: 'alpha',
    });
    expect(el.classList.contains('arvo-search--summary')).toBe(false);
    expect(el.querySelector('textarea')!.value).toBe('alpha');
  });

  it('comma-to-new-row: repeated commas collapse to a single newline (no empty rows)', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    const ta = el.querySelector('textarea')!;
    ta.value = 'alpha,,,,beta';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('alpha\nbeta');
  });

  it('comma-to-new-row: leading comma is stripped (no empty leading row)', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    const ta = el.querySelector('textarea')!;
    ta.value = ',alpha';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('alpha');
  });

  it('comma-to-new-row: trailing comma is preserved as the "next row" cursor position', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    const ta = el.querySelector('textarea')!;
    ta.value = 'alpha,';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('alpha\n');
  });

  it('shift+enter on an empty line is prevented (no empty row inserted)', () => {
    const el = createEl();
    new ArvoSearch(el, { isMultiLine: true });
    const ta = el.querySelector('textarea')!;
    ta.value = 'alpha,';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ta.value).toBe('alpha\n');
    ta.setSelectionRange(ta.value.length, ta.value.length);
    const evt = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const prevented = !ta.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });

  it('comma-and-linebreak: plain Enter on an empty line is prevented', () => {
    const el = createEl();
    new ArvoSearch(el, {
      isMultiLine: { enabled: true, delimiterBehavior: 'comma-and-linebreak' },
      defaultValue: 'alpha\n',
    });
    const ta = el.querySelector('textarea')!;
    ta.setSelectionRange(ta.value.length, ta.value.length);
    const evt = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    const prevented = !ta.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Counter: ArvoBadge instance aria-live + cleanup
// ---------------------------------------------------------------------------
describe('ArvoSearch - counter ArvoBadge cleanup', () => {
  it('counter host has aria-live="polite"', () => {
    const el = createEl();
    new ArvoSearch(el, { counter: { current: 1, total: 5 } });
    expect(el.querySelector('.arvo-search__counter')!.getAttribute('aria-live')).toBe('polite');
  });

  it('destroy() removes the counter host element', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { counter: { current: 1, total: 5 } });
    instance.destroy();
    expect(el.querySelector('.arvo-search__counter')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Submit button cleanup on destroy
// ---------------------------------------------------------------------------
describe('ArvoSearch - submit button cleanup on destroy', () => {
  it('destroy() removes the submit button element', () => {
    const el = createEl();
    const instance = new ArvoSearch(el, { searchMode: 'submit' });
    instance.destroy();
    expect(el.querySelector('.arvo-search__submit')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Drift-gate: clear() does NOT dispatch search:change
// ---------------------------------------------------------------------------
describe('ArvoSearch - clear() does not dispatch search:change', () => {
  it('clear() fires search:clear but NOT search:change', () => {
    const changeHandler = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    el.addEventListener('search:change', changeHandler);
    instance.clear();
    expect(changeHandler).not.toHaveBeenCalled();
  });

  it('clear() does fire search:clear', () => {
    const clearHandler = vi.fn();
    const el = createEl();
    const instance = new ArvoSearch(el, { value: 'hello' });
    el.addEventListener('search:clear', clearHandler);
    instance.clear();
    expect(clearHandler).toHaveBeenCalledTimes(1);
  });
});
