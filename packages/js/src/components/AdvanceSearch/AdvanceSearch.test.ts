// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoAdvanceSearch, isWildcardQuery } from './AdvanceSearch';
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
  if (!('scrollIntoView' in HTMLElement.prototype)) {
    (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView =
      vi.fn();
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const SCOPE_OPTIONS = [
  { key: 'files', label: 'Files' },
  { key: 'folders', label: 'Folders' },
  { key: 'docs', label: 'Documents' },
];

// ---------------------------------------------------------------------------
// Initialization + rendering
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- initialization', () => {
  it('static initialize() returns an instance', () => {
    const el = createEl();
    const instance = ArvoAdvanceSearch.initialize(el);
    expect(instance).toBeInstanceOf(ArvoAdvanceSearch);
  });

  it('throws when element is not an HTMLElement', () => {
    expect(() =>
      ArvoAdvanceSearch.initialize(null as unknown as HTMLDivElement),
    ).toThrow();
  });

  it('adds the arvo-adv-search base class and role="search"', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el);
    expect(el.classList.contains('arvo-adv-search')).toBe(true);
    expect(el.getAttribute('role')).toBe('search');
  });

  it('defaults to the filterBy variant class', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el);
    expect(el.classList.contains('arvo-adv-search--filter-by')).toBe(true);
  });

  it('applies the scopedSearch variant class and __lead', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el, {
      variant: 'scopedSearch',
      scopeOptions: SCOPE_OPTIONS,
    });
    expect(el.classList.contains('arvo-adv-search--scoped-search')).toBe(true);
    expect(el.querySelector('.arvo-adv-search__lead')).not.toBeNull();
  });

  it('applies the customFilter variant and renders the IconButton trigger', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el, { variant: 'customFilter' });
    expect(el.classList.contains('arvo-adv-search--custom-filter')).toBe(true);
    const actions = el.querySelector('.arvo-adv-search__actions');
    const trigger = actions?.querySelector('.arvo-adv-search__trigger');
    expect(trigger).not.toBeNull();
    expect(trigger?.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('renders the 20px o9con-search leading icon (decorative)', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el);
    const ico = el.querySelector('.arvo-adv-search__ico');
    expect(ico).not.toBeNull();
    expect(ico?.getAttribute('aria-hidden')).toBe('true');
    expect(ico?.classList.contains('o9con-search')).toBe(true);
  });

  it('creates a native <input type="search"> with aria-label', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el);
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('search');
    expect(input!.getAttribute('aria-label')).toBe('Search');
  });

  it('renders the underline element', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el);
    expect(el.querySelector('.arvo-adv-search__underline')).not.toBeNull();
  });

  it('writes --arvo-form-input-width when width option is provided', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el, { width: '480px' });
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('480px');
  });

  it('toggles the full-width modifier on fullWidth(true)', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el);
    instance.fullWidth(true);
    expect(el.classList.contains('arvo-adv-search--full-width')).toBe(true);
    expect(instance.fullWidth()).toBe(true);
    instance.fullWidth(false);
    expect(el.classList.contains('arvo-adv-search--full-width')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Search controller
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- search controller', () => {
  it('does not fire onSearch until minChars is satisfied', () => {
    const el = createEl();
    const onSearch = vi.fn();
    new ArvoAdvanceSearch(el, { onSearch, minChars: 3, debounceMs: 0 });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('debounces onSearch by debounceMs', () => {
    vi.useFakeTimers();
    const el = createEl();
    const onSearch = vi.fn();
    new ArvoAdvanceSearch(el, {
      onSearch,
      minChars: 1,
      debounceMs: 200,
    });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSearch).toHaveBeenCalledWith('a');
  });

  it('does NOT fire onSearch on input event when searchMode="submit"', () => {
    const el = createEl();
    const onSearch = vi.fn();
    new ArvoAdvanceSearch(el, { onSearch, searchMode: 'submit', minChars: 0 });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('fires onSearch on Enter when submit mode', () => {
    const el = createEl();
    const onSearch = vi.fn();
    new ArvoAdvanceSearch(el, {
      onSearch,
      searchMode: 'submit',
      defaultValue: 'hi',
      minChars: 1,
    });
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(onSearch).toHaveBeenCalledWith('hi');
  });

  it('renders submit button in submit mode only', () => {
    const el1 = createEl();
    new ArvoAdvanceSearch(el1);
    expect(el1.querySelector('.arvo-adv-search__submit')).toBeNull();

    const el2 = createEl();
    new ArvoAdvanceSearch(el2, { searchMode: 'submit' });
    expect(el2.querySelector('.arvo-adv-search__submit')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Clear behavior
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- clear', () => {
  it('clear() resets the value, dispatches adv-search:clear, refocuses input', () => {
    const el = createEl();
    const onClear = vi.fn();
    const instance = new ArvoAdvanceSearch(el, {
      defaultValue: 'foo',
      onClear,
    });
    const captured: string[] = [];
    el.addEventListener('adv-search:clear', () => captured.push('clear'));
    instance.clear();
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(captured).toContain('clear');
  });

  it('clear() does NOT dispatch adv-search:change (drift gate)', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { defaultValue: 'foo' });
    const captured: string[] = [];
    el.addEventListener('adv-search:change', () => captured.push('change'));
    instance.clear();
    expect(captured.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// State management methods
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- state methods', () => {
  it('value() getter returns the current input value', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { defaultValue: 'seed' });
    expect(instance.value()).toBe('seed');
  });

  it('value(newValue) updates input and dispatches adv-search:change', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { defaultValue: 'seed' });
    const captured: unknown[] = [];
    el.addEventListener('adv-search:change', (e) =>
      captured.push((e as CustomEvent).detail),
    );
    instance.value('changed');
    expect(instance.value()).toBe('changed');
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('changed');
    expect(captured.length).toBe(1);
  });

  it('disabled() / disabled(true) updates state', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el);
    expect(instance.disabled()).toBe(false);
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('readOnly() / readOnly(true) updates state', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el);
    instance.readOnly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('setError(msg) renders inline message; setError(false) clears it', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el);
    instance.setError('Bad value');
    expect(el.classList.contains('has-error')).toBe(true);
    expect(el.querySelector('.arvo-adv-search__message')).not.toBeNull();
    instance.setError(false);
    expect(el.classList.contains('has-error')).toBe(false);
    expect(el.querySelector('.arvo-adv-search__message')).toBeNull();
  });

  it(
    'setLoading(true) toggles loading state',
    () => {
      const el = createEl();
      const instance = new ArvoAdvanceSearch(el);
      instance.setLoading(true);
      expect(el.classList.contains('loading')).toBe(true);
    },
  );

  it('width() getter/setter mutates --arvo-form-input-width', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el);
    instance.width('320px');
    expect(el.style.getPropertyValue('--arvo-form-input-width')).toBe('320px');
    expect(instance.width()).toBe('320px');
  });
});

// ---------------------------------------------------------------------------
// Open / close
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- open / close', () => {
  it('open() and close() flip is-open class and dispatch events', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { variant: 'customFilter' });
    const captured: string[] = [];
    el.addEventListener('adv-search:open', () => captured.push('open'));
    el.addEventListener('adv-search:close', () => captured.push('close'));

    instance.open();
    expect(instance.isOpen()).toBe(true);
    expect(el.classList.contains('is-open')).toBe(true);
    expect(captured).toContain('open');

    instance.close();
    expect(instance.isOpen()).toBe(false);
    expect(el.classList.contains('is-open')).toBe(false);
    expect(captured).toContain('close');
  });

  it('toggle() flips state', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { variant: 'customFilter' });
    expect(instance.isOpen()).toBe(false);
    instance.toggle();
    expect(instance.isOpen()).toBe(true);
    instance.toggle();
    expect(instance.isOpen()).toBe(false);
    instance.toggle(true);
    expect(instance.isOpen()).toBe(true);
    instance.toggle(false);
    expect(instance.isOpen()).toBe(false);
  });

  it('updates the trigger .open class and aria-expanded', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { variant: 'filterBy' });
    const trigger = el.querySelector(
      '.arvo-adv-search__trigger',
    ) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    instance.open();
    expect(trigger.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Scope (scopedSearch)
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- scopedSearch selection', () => {
  it('renders the trigger label from selectedScope (single)', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el, {
      variant: 'scopedSearch',
      scopeOptions: SCOPE_OPTIONS,
      selectedScope: 'folders',
    });
    const trigger = el.querySelector('.arvo-adv-search__trigger');
    expect(trigger?.textContent).toContain('Folders');
  });

  it('summarizes multi-selection as "{first} +N"', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el, {
      variant: 'scopedSearch',
      selectionMode: 'multiple',
      scopeOptions: SCOPE_OPTIONS,
      selectedScope: ['folders', 'docs'],
    });
    const trigger = el.querySelector('.arvo-adv-search__trigger');
    expect(trigger?.textContent).toContain('Folders +1');
  });

  it('selectedScope() setter fires adv-search:scope-change and updates label', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, {
      variant: 'scopedSearch',
      scopeOptions: SCOPE_OPTIONS,
    });
    const captured: unknown[] = [];
    el.addEventListener('adv-search:scope-change', (e) =>
      captured.push((e as CustomEvent).detail),
    );
    instance.selectedScope('docs');
    expect(captured.length).toBe(1);
    const trigger = el.querySelector('.arvo-adv-search__trigger');
    expect(trigger?.textContent).toContain('Documents');
  });
});

// ---------------------------------------------------------------------------
// Decorations
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- decorations', () => {
  it('renders shortcut badge when empty + unfocused, hides on value', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { shortcut: '/' });
    const sc = el.querySelector(
      '.arvo-adv-search__shortcut',
    ) as HTMLSpanElement;
    expect(sc).not.toBeNull();
    expect(sc.textContent).toBe('/');
    expect(sc.style.display).not.toBe('none');
    instance.value('x');
    expect(sc.style.display).toBe('none');
  });

  it('counter shows only when has-value', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, {
      counter: { current: 3, total: 12 },
    });
    const counter = el.querySelector(
      '.arvo-adv-search__counter',
    ) as HTMLElement;
    expect(counter).not.toBeNull();
    expect(counter.style.display).toBe('none');
    instance.value('q');
    expect(counter.style.display).not.toBe('none');
  });

  it('counter() setter swaps to null to remove the badge', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, {
      counter: { current: 1, total: 1 },
    });
    expect(el.querySelector('.arvo-adv-search__counter')).not.toBeNull();
    instance.counter(null);
    expect(el.querySelector('.arvo-adv-search__counter')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custom event parity
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- custom events', () => {
  it('dispatches adv-search:input on each keystroke', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el);
    const captured: unknown[] = [];
    el.addEventListener('adv-search:input', (e) =>
      captured.push((e as CustomEvent).detail),
    );
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(captured.length).toBe(2);
  });

  it('dispatches adv-search:search in submit mode on Enter', () => {
    const el = createEl();
    new ArvoAdvanceSearch(el, {
      searchMode: 'submit',
      defaultValue: 'x',
      minChars: 1,
    });
    const captured: unknown[] = [];
    el.addEventListener('adv-search:search', (e) =>
      captured.push((e as CustomEvent).detail),
    );
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(captured.length).toBe(1);
  });

  it('dispatches adv-search:open / adv-search:close via open()/close()', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { variant: 'customFilter' });
    const order: string[] = [];
    el.addEventListener('adv-search:open', () => order.push('open'));
    el.addEventListener('adv-search:close', () => order.push('close'));
    instance.open();
    instance.close();
    expect(order).toEqual(['open', 'close']);
  });
});

// ---------------------------------------------------------------------------
// Wildcard helper
// ---------------------------------------------------------------------------
describe('isWildcardQuery', () => {
  it('returns true for queries starting with ":"', () => {
    expect(isWildcardQuery(':A*')).toBe(true);
    expect(isWildcardQuery(':*A')).toBe(true);
  });

  it('returns false for non-wildcard queries', () => {
    expect(isWildcardQuery('A')).toBe(false);
    expect(isWildcardQuery('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('ArvoAdvanceSearch -- destroy', () => {
  it('destroy() removes inner DOM, classes, role, and width style', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el, { defaultValue: 'foo' });
    instance.destroy();
    expect(el.classList.contains('arvo-adv-search')).toBe(false);
    expect(el.getAttribute('role')).toBeNull();
    expect(el.children.length).toBe(0);
  });

  it('destroy() can be called multiple times safely', () => {
    const el = createEl();
    const instance = new ArvoAdvanceSearch(el);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});
