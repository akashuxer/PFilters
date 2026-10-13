// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoListbox } from './Listbox';
import type { ArvoListboxOptions, ListboxOptionData } from './Listbox';
import type { ListGroup } from '@arvo/core';
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// FormLabel runs as the real atomic class in tests -- no mock needed.

// jsdom does not implement scrollIntoView -- stub it globally so the component
// can call it without throwing, allowing all event-chain assertions to work.
Element.prototype.scrollIntoView = vi.fn();

// jsdom does not implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;


// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockItems: ListboxOptionData[] = [
  { id: 'opt-1', label: 'Apple', value: 'apple' },
  { id: 'opt-2', label: 'Banana', value: 'banana' },
  { id: 'opt-3', label: 'Cherry', value: 'cherry' },
  { id: 'opt-4', label: 'Date', value: 'date', isDisabled: true },
  { id: 'opt-5', label: 'Elderberry', value: 'elderberry' },
];

const mockGroupedItems: ListGroup<ListboxOptionData>[] = [
  {
    id: 'fruits',
    label: 'Fruits',
    items: [
      { id: 'g1-1', label: 'Apple', value: 'apple' },
      { id: 'g1-2', label: 'Banana', value: 'banana' },
    ],
  },
  {
    id: 'vegetables',
    label: 'Vegetables',
    items: [
      { id: 'g2-1', label: 'Carrot', value: 'carrot' },
      { id: 'g2-2', label: 'Daikon', value: 'daikon', isDisabled: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

let containerEl: HTMLDivElement;
let instance: ArvoListbox;

function createListbox(options: Partial<ArvoListboxOptions> = {}): ArvoListbox {
  containerEl = document.createElement('div');
  document.body.appendChild(containerEl);
  instance = ArvoListbox.initialize(containerEl, {
    items: mockItems,
    ...options,
  });
  return instance;
}

afterEach(() => {
  instance?.destroy();
  containerEl?.remove();
});

function getListEl(): HTMLElement {
  return containerEl.querySelector('[role="listbox"]') as HTMLElement;
}

function getOptionEls(): NodeListOf<HTMLElement> {
  return containerEl.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
}

function fireKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

// ---------------------------------------------------------------------------
// 1. Initialization
// ---------------------------------------------------------------------------

describe('ArvoListbox -- initialization', () => {
  it('static initialize() returns an ArvoListbox instance', () => {
    createListbox();
    expect(instance).toBeInstanceOf(ArvoListbox);
  });

  it('constructor also returns an ArvoListbox instance', () => {
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
    instance = new ArvoListbox(containerEl, { items: mockItems });
    expect(instance).toBeInstanceOf(ArvoListbox);
  });

  it('root element has arvo-listbox class', () => {
    createListbox();
    expect(containerEl.classList.contains('arvo-listbox')).toBe(true);
  });

  it('list container has role="listbox"', () => {
    createListbox();
    expect(getListEl()).not.toBeNull();
  });

  it('options have role="option"', () => {
    createListbox();
    const opts = getOptionEls();
    expect(opts.length).toBeGreaterThan(0);
    opts.forEach(opt => {
      expect(opt.getAttribute('role')).toBe('option');
    });
  });

  it('each option has a unique id', () => {
    createListbox();
    const ids = Array.from(getOptionEls()).map(el => el.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    ids.forEach(id => expect(id).toBeTruthy());
  });

  it('options are rendered from the options array', () => {
    createListbox();
    const opts = getOptionEls();
    expect(opts.length).toBe(mockItems.length);
  });

  it('disabled option has aria-disabled="true"', () => {
    createListbox();
    const disabledOpt = Array.from(getOptionEls()).find(el =>
      el.getAttribute('aria-disabled') === 'true',
    );
    expect(disabledOpt).not.toBeUndefined();
  });

  it('disabled option has is-disabled class', () => {
    createListbox();
    const disabledOpt = Array.from(getOptionEls()).find(el =>
      el.classList.contains('is-disabled'),
    );
    expect(disabledOpt).not.toBeUndefined();
  });

  it('renders label element when label option is provided', () => {
    createListbox({ label: 'Fruit selection' });
    expect(containerEl.querySelector('label')).not.toBeNull();
  });

  it('does not render label when label option is omitted', () => {
    createListbox();
    expect(containerEl.querySelector('label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Single Selection
// ---------------------------------------------------------------------------

describe('ArvoListbox -- single selection', () => {
  it('clicking an option fires listbox:change event', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('listbox:change event detail has correct value', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.value).toBe('apple');
  });

  it('listbox:change event detail has correct option label', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.option.label).toBe('Apple');
  });

  it('listbox:change event detail has selected=true on first click', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.isSelected).toBe(true);
  });

  it('clicking an option updates aria-selected to "true"', () => {
    createListbox();
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstOpt.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking a different option deselects the previous one', () => {
    createListbox();
    const opts = getOptionEls();
    opts[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    opts[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
  });

  it('value() getter returns null before any selection', () => {
    createListbox();
    expect(instance.value()).toBeNull();
  });

  it('value() getter returns selected value after click', () => {
    createListbox();
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(instance.value()).toBe('apple');
  });

  it('value() setter updates selection via aria-selected', () => {
    createListbox();
    instance.value('banana');
    const opts = getOptionEls();
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
  });

  it('value() getter reflects value() setter', () => {
    createListbox();
    instance.value('cherry');
    expect(instance.value()).toBe('cherry');
  });

  it('clicking a disabled option does not fire listbox:change', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    const disabledOpt = Array.from(getOptionEls()).find(el =>
      el.getAttribute('aria-disabled') === 'true',
    )!;
    disabledOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('initial value option pre-selects the correct option', () => {
    createListbox({ value: 'banana' });
    const opts = getOptionEls();
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
  });

  // -- defaultValue (uncontrolled initial value) --

  it('seeds uncontrolled selection from defaultValue (single)', () => {
    createListbox({ defaultValue: 'cherry' });
    expect(instance.value()).toBe('cherry');
    const opts = getOptionEls();
    expect(opts[2].getAttribute('aria-selected')).toBe('true');
  });

  it('seeds uncontrolled selection from defaultValue (multi)', () => {
    createListbox({ isMultiple: true, defaultValue: ['apple', 'cherry'] });
    expect(instance.value()).toEqual(['apple', 'cherry']);
  });

  it('controlled value takes precedence over defaultValue', () => {
    createListbox({ value: 'banana', defaultValue: 'cherry' });
    expect(instance.value()).toBe('banana');
  });

  it('selection is empty when both value and defaultValue are omitted', () => {
    createListbox();
    expect(instance.value()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Multiple Selection
// ---------------------------------------------------------------------------

describe('ArvoListbox -- multiple selection', () => {
  beforeEach(() => {
    createListbox({ isMultiple: true });
  });

  it('root element has arvo-listbox--multiple class', () => {
    expect(containerEl.classList.contains('arvo-listbox--multiple')).toBe(true);
  });

  it('list container has aria-multiselectable="true"', () => {
    expect(getListEl().getAttribute('aria-multiselectable')).toBe('true');
  });

  it('clicking an option toggles it selected', () => {
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstOpt.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking a selected option deselects it', () => {
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstOpt.getAttribute('aria-selected')).toBe('false');
  });

  it('multiple options can be selected simultaneously', () => {
    const opts = getOptionEls();
    opts[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    opts[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(opts[0].getAttribute('aria-selected')).toBe('true');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
  });

  it('value() getter returns an array of selected values', () => {
    const opts = getOptionEls();
    opts[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    opts[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const val = instance.value() as unknown[];
    expect(Array.isArray(val)).toBe(true);
    expect(val).toContain('apple');
    expect(val).toContain('banana');
  });

  it('value() getter returns empty array when nothing selected', () => {
    expect(instance.value()).toEqual([]);
  });

  it('listbox:change detail has selected=false when deselecting', () => {
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.isSelected).toBe(false);
  });

  it('initial multiple value pre-selects multiple options', () => {
    instance.destroy();
    containerEl.remove();
    createListbox({ isMultiple: true, value: ['apple', 'cherry'] });
    const opts = getOptionEls();
    expect(opts[0].getAttribute('aria-selected')).toBe('true');
    expect(opts[2].getAttribute('aria-selected')).toBe('true');
    expect(opts[1].getAttribute('aria-selected')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// 4. Keyboard Navigation
// ---------------------------------------------------------------------------

describe('ArvoListbox -- keyboard navigation', () => {
  it('ArrowDown moves highlight to next option', () => {
    createListbox();
    const listEl = getListEl();
    // Initially highlight is on index 0 (first enabled)
    fireKey(listEl, 'ArrowDown');
    // Highlight should be on index 1 now
    const opts = getOptionEls();
    expect(opts[1].classList.contains('highlighted')).toBe(true);
  });

  it('ArrowUp moves highlight to previous option', () => {
    createListbox();
    const listEl = getListEl();
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowUp');
    const opts = getOptionEls();
    expect(opts[1].classList.contains('highlighted')).toBe(true);
  });

  it('ArrowDown wraps from last to first option', () => {
    createListbox();
    const listEl = getListEl();
    // Navigate to last enabled (index 4 = Elderberry)
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowDown'); // skip disabled at index 3
    fireKey(listEl, 'ArrowDown'); // wrap to 0
    const opts = getOptionEls();
    expect(opts[0].classList.contains('highlighted')).toBe(true);
  });

  it('disabled items are skipped during ArrowDown navigation', () => {
    createListbox();
    const listEl = getListEl();
    // index 0 is highlighted initially; ArrowDown goes to index 1, then 2, then skip 3 (disabled) to 4
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowDown');
    const opts = getOptionEls();
    // Should have skipped index 3 (disabled)
    expect(opts[3].classList.contains('highlighted')).toBe(false);
    expect(opts[4].classList.contains('highlighted')).toBe(true);
  });

  it('Home key moves highlight to first enabled option', () => {
    createListbox();
    const listEl = getListEl();
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'ArrowDown');
    fireKey(listEl, 'Home');
    const opts = getOptionEls();
    expect(opts[0].classList.contains('highlighted')).toBe(true);
  });

  it('End key moves highlight to last enabled option', () => {
    createListbox();
    const listEl = getListEl();
    fireKey(listEl, 'End');
    const opts = getOptionEls();
    expect(opts[4].classList.contains('highlighted')).toBe(true);
  });

  it('Enter key selects the highlighted option', () => {
    createListbox();
    const listEl = getListEl();
    // Highlight is on index 0 initially
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    fireKey(listEl, 'Enter');
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.value).toBe('apple');
  });

  it('Space key selects the highlighted option', () => {
    createListbox({ isMultiple: true });
    const listEl = getListEl();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    fireKey(listEl, ' ');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('aria-activedescendant updates when highlight changes', () => {
    createListbox();
    const listEl = getListEl();
    fireKey(listEl, 'ArrowDown');
    const activeId = listEl.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    const activeEl = document.getElementById(activeId!);
    expect(activeEl?.classList.contains('highlighted')).toBe(true);
  });

  it('keyboard navigation does nothing when disabled', () => {
    createListbox({ isDisabled: true });
    const listEl = getListEl();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    fireKey(listEl, 'Enter');
    expect(handler).not.toHaveBeenCalled();
  });

  it('keyboard navigation does nothing when loading', () => {
    createListbox({ isLoading: true });
    const listEl = getListEl();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    fireKey(listEl, 'Enter');
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Groups
// ---------------------------------------------------------------------------

describe('ArvoListbox -- groups', () => {
  beforeEach(() => {
    createListbox({ items: mockGroupedItems });
  });

  it('group headers render with correct text', () => {
    const headers = containerEl.querySelectorAll('.arvo-listbox__grp-hdr');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toBe('Fruits');
    expect(headers[1].textContent).toBe('Vegetables');
  });

  it('group headers have unique ids', () => {
    const headers = containerEl.querySelectorAll('.arvo-listbox__grp-hdr');
    const ids = Array.from(headers).map(h => h.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    ids.forEach(id => expect(id).toBeTruthy());
  });

  it('groups have role="group"', () => {
    const groups = containerEl.querySelectorAll('[role="group"]');
    expect(groups.length).toBe(2);
  });

  it('groups have aria-labelledby pointing to their header', () => {
    const groups = containerEl.querySelectorAll('[role="group"]');
    groups.forEach(group => {
      const labelledBy = group.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      const header = document.getElementById(labelledBy!);
      expect(header).not.toBeNull();
    });
  });

  it('renders a divider between groups by default', () => {
    const dividers = containerEl.querySelectorAll('.arvo-listbox__divider');
    expect(dividers.length).toBe(1);
  });

  it('no dividers rendered when showGroupDividers is false', () => {
    instance.destroy();
    containerEl.remove();
    createListbox({ items: mockGroupedItems, hasGroupDividers: false });
    const dividers = containerEl.querySelectorAll('.arvo-listbox__divider');
    expect(dividers.length).toBe(0);
  });

  it('all group items render as options', () => {
    const opts = getOptionEls();
    const totalItems = mockGroupedItems.reduce((sum, g) => sum + g.items.length, 0);
    expect(opts.length).toBe(totalItems);
  });
});

// ---------------------------------------------------------------------------
// 6. Filter (search)
// ---------------------------------------------------------------------------

describe('ArvoListbox -- filter (search)', () => {
  it('search input renders when search: true', () => {
    createListbox({ search: true });
    const searchInput = containerEl.querySelector('.arvo-search__input');
    expect(searchInput).not.toBeNull();
  });

  it('search input does not render when search is false', () => {
    createListbox({ search: false });
    expect(containerEl.querySelector('.arvo-search__input')).toBeNull();
  });

  it('filter() method hides non-matching options', () => {
    createListbox({ search: true });
    instance.filter('apple');
    const opts = getOptionEls();
    expect(opts.length).toBe(1);
    expect(opts[0].textContent).toContain('Apple');
  });

  it('filter() is case-insensitive', () => {
    createListbox({ search: true });
    instance.filter('APPLE');
    const opts = getOptionEls();
    expect(opts.length).toBe(1);
  });

  it('clearFilter() restores all options', () => {
    createListbox({ search: true });
    instance.filter('apple');
    instance.clearFilter();
    const opts = getOptionEls();
    expect(opts.length).toBe(mockItems.length);
  });

  it('empty state shows when filter matches nothing', () => {
    createListbox({ search: true });
    instance.filter('zzz-no-match');
    const emptyEl = containerEl.querySelector('.arvo-listbox__empty');
    expect(emptyEl).not.toBeNull();
  });

  it('listbox:filter event fires when filter() is called with a query', () => {
    createListbox({ search: true });
    const handler = vi.fn();
    containerEl.addEventListener('listbox:filter', handler);
    instance.filter('apple');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('listbox:filter event detail has correct query and matchCount', () => {
    createListbox({ search: true });
    const handler = vi.fn();
    containerEl.addEventListener('listbox:filter', handler);
    instance.filter('apple');
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.query).toBe('apple');
    expect(detail.matchCount).toBe(1);
  });

  it('listbox:filter does not fire when clearFilter() is called', () => {
    createListbox({ search: true });
    instance.filter('apple');
    const handler = vi.fn();
    containerEl.addEventListener('listbox:filter', handler);
    instance.clearFilter();
    expect(handler).not.toHaveBeenCalled();
  });

  it('onFilter callback is invoked when filter() is called', () => {
    const onFilter = vi.fn();
    createListbox({ search: true, onFilter });
    instance.filter('cherry');
    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ query: 'cherry' }));
  });

  it('search input dispatches listbox:filter when user types', () => {
    createListbox({ search: true });
    const handler = vi.fn();
    containerEl.addEventListener('listbox:filter', handler);
    const searchInput = containerEl.querySelector('.arvo-search__input') as HTMLInputElement;
    searchInput.value = 'ban';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Loading State
// ---------------------------------------------------------------------------

describe('ArvoListbox -- loading state', () => {
  it('initial loading option adds loading class to root', () => {
    createListbox({ isLoading: true });
    expect(containerEl.classList.contains('loading')).toBe(true);
  });

  it('initial loading sets aria-busy="true" on list element', () => {
    createListbox({ isLoading: true });
    expect(getListEl().getAttribute('aria-busy')).toBe('true');
  });

  it('initial loading renders skeleton element', () => {
    createListbox({ isLoading: true });
    expect(containerEl.querySelector('.arvo-listbox__skeleton')).not.toBeNull();
  });

  it('initial loading hides options', () => {
    createListbox({ isLoading: true });
    expect(getOptionEls().length).toBe(0);
  });

  it('setLoading(true) adds loading class', () => {
    createListbox();
    instance.setLoading(true);
    expect(containerEl.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    createListbox();
    instance.setLoading(true);
    expect(getListEl().getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(true) shows skeleton rows', () => {
    createListbox();
    instance.setLoading(true);
    const rows = containerEl.querySelectorAll('.arvo-listbox__skeleton-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('setLoading(true) hides options', () => {
    createListbox();
    instance.setLoading(true);
    expect(getOptionEls().length).toBe(0);
  });

  it('setLoading(false) removes loading class', () => {
    createListbox({ isLoading: true });
    instance.setLoading(false);
    expect(containerEl.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy', () => {
    createListbox({ isLoading: true });
    instance.setLoading(false);
    expect(getListEl().getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(false) restores options', () => {
    createListbox({ isLoading: true });
    instance.setLoading(false);
    expect(getOptionEls().length).toBe(mockItems.length);
  });
});

// ---------------------------------------------------------------------------
// 8. Empty State
// ---------------------------------------------------------------------------

describe('ArvoListbox -- empty state', () => {
  it('shows default empty message when options is empty array', () => {
    createListbox({ items: [] });
    const emptyEl = containerEl.querySelector('.arvo-listbox__empty');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl!.textContent).toBe('No options');
  });

  it('shows custom emptyMessage when provided', () => {
    createListbox({ items: [], emptyMessage: 'Nothing to display' });
    const emptyEl = containerEl.querySelector('.arvo-listbox__empty');
    expect(emptyEl!.textContent).toBe('Nothing to display');
  });

  it('empty state element has role="status"', () => {
    createListbox({ items: [] });
    const emptyEl = containerEl.querySelector('.arvo-listbox__empty');
    expect(emptyEl?.getAttribute('role')).toBe('status');
  });

  it('no options render when list is empty', () => {
    createListbox({ items: [] });
    expect(getOptionEls().length).toBe(0);
  });

  it('empty state disappears after setOptions() provides items', () => {
    createListbox({ items: [] });
    instance.updateItems(mockItems);
    expect(containerEl.querySelector('.arvo-listbox__empty')).toBeNull();
    expect(getOptionEls().length).toBe(mockItems.length);
  });
});

// ---------------------------------------------------------------------------
// 9. Disabled State
// ---------------------------------------------------------------------------

describe('ArvoListbox -- disabled state', () => {
  it('initial disabled option adds is-disabled class to root', () => {
    createListbox({ isDisabled: true });
    expect(containerEl.classList.contains('is-disabled')).toBe(true);
  });

  it('initial disabled sets aria-disabled="true" on list element', () => {
    createListbox({ isDisabled: true });
    expect(getListEl().getAttribute('aria-disabled')).toBe('true');
  });

  it('initial disabled sets tabindex="-1" on list element', () => {
    createListbox({ isDisabled: true });
    expect(getListEl().getAttribute('tabindex')).toBe('-1');
  });

  it('disabled(true) adds is-disabled class', () => {
    createListbox();
    instance.disabled(true);
    expect(containerEl.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets aria-disabled on list', () => {
    createListbox();
    instance.disabled(true);
    expect(getListEl().getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled() getter returns current disabled state', () => {
    createListbox({ isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled() getter returns false when not disabled', () => {
    createListbox();
    expect(instance.disabled()).toBe(false);
  });

  it('disabled(false) removes is-disabled class', () => {
    createListbox({ isDisabled: true });
    instance.disabled(false);
    expect(containerEl.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled(false) removes aria-disabled', () => {
    createListbox({ isDisabled: true });
    instance.disabled(false);
    expect(getListEl().getAttribute('aria-disabled')).toBeNull();
  });

  it('clicks are blocked when disabled', () => {
    createListbox({ isDisabled: true });
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    const firstOpt = getOptionEls()[0];
    firstOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('disabled(true) disables search input when search', () => {
    createListbox({ search: true });
    instance.disabled(true);
    const searchInput = containerEl.querySelector('.arvo-search__input') as HTMLInputElement;
    expect(searchInput.disabled).toBe(true);
  });

  it('disabled(false) re-enables search input when search', () => {
    createListbox({ search: true, isDisabled: true });
    instance.disabled(false);
    const searchInput = containerEl.querySelector('.arvo-search__input') as HTMLInputElement;
    expect(searchInput.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. Custom Events
// ---------------------------------------------------------------------------

describe('ArvoListbox -- custom events', () => {
  it('listbox:change has bubbles=true', () => {
    createListbox();
    let captured: CustomEvent | null = null;
    document.body.addEventListener('listbox:change', (e) => { captured = e as CustomEvent; });
    getOptionEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(captured).not.toBeNull();
    expect(captured!.bubbles).toBe(true);
    document.body.removeEventListener('listbox:change', () => {});
  });

  it('listbox:change has cancelable=true', () => {
    createListbox();
    let captured: CustomEvent | null = null;
    containerEl.addEventListener('listbox:change', (e) => { captured = e as CustomEvent; });
    getOptionEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(captured!.cancelable).toBe(true);
  });

  it('listbox:highlight fires on keyboard navigation', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:highlight', handler);
    fireKey(getListEl(), 'ArrowDown');
    expect(handler).toHaveBeenCalled();
  });

  it('listbox:highlight event detail has value and option', () => {
    createListbox();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:highlight', handler);
    fireKey(getListEl(), 'ArrowDown');
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('value');
    expect(detail).toHaveProperty('option');
  });

  it('listbox:highlight has bubbles=true', () => {
    createListbox();
    let captured: CustomEvent | null = null;
    document.body.addEventListener('listbox:highlight', (e) => { captured = e as CustomEvent; });
    fireKey(getListEl(), 'ArrowDown');
    expect((captured as CustomEvent | null)?.bubbles).toBe(true);
    document.body.removeEventListener('listbox:highlight', () => {});
  });

  it('listbox:filter has bubbles=true', () => {
    createListbox({ search: true });
    let captured: CustomEvent | null = null;
    document.body.addEventListener('listbox:filter', (e) => { captured = e as CustomEvent; });
    instance.filter('apple');
    expect((captured as CustomEvent | null)?.bubbles).toBe(true);
    document.body.removeEventListener('listbox:filter', () => {});
  });

  it('listbox:filter has cancelable=true', () => {
    createListbox({ search: true });
    let captured: CustomEvent | null = null;
    containerEl.addEventListener('listbox:filter', (e) => { captured = e as CustomEvent; });
    instance.filter('apple');
    expect((captured as CustomEvent | null)?.cancelable).toBe(true);
  });

  it('onChange callback is invoked on selection', () => {
    const onChange = vi.fn();
    createListbox({ onChange });
    getOptionEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'apple', isSelected: true }));
  });

  it('onHighlight callback is invoked on highlight change', () => {
    const onHighlight = vi.fn();
    createListbox({ onHighlight });
    fireKey(getListEl(), 'ArrowDown');
    expect(onHighlight).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 11. Public Methods
// ---------------------------------------------------------------------------

describe('ArvoListbox -- public methods', () => {
  it('setOptions() replaces the option list', () => {
    createListbox();
    const newItems: ListboxOptionData[] = [
      { id: 'n1', label: 'One', value: 'one' },
      { id: 'n2', label: 'Two', value: 'two' },
    ];
    instance.updateItems(newItems);
    const opts = getOptionEls();
    expect(opts.length).toBe(2);
    expect(opts[0].textContent).toContain('One');
  });

  it('setOptions() clears previous filter query', () => {
    createListbox({ search: true });
    instance.filter('apple');
    instance.updateItems(mockItems);
    expect(getOptionEls().length).toBe(mockItems.length);
  });

  it('highlightOption(value) highlights the correct option', () => {
    createListbox();
    instance.highlightOption('banana');
    const opts = getOptionEls();
    expect(opts[1].classList.contains('highlighted')).toBe(true);
  });

  it('highlightOption(value) updates aria-activedescendant', () => {
    createListbox();
    instance.highlightOption('cherry');
    const activeId = getListEl().getAttribute('aria-activedescendant');
    const activeEl = document.getElementById(activeId!);
    expect(activeEl?.textContent).toContain('Cherry');
  });

  it('getHighlightedOption() returns the highlighted option data', () => {
    createListbox();
    instance.highlightOption('banana');
    const highlighted = instance.getHighlightedOption();
    expect(highlighted).not.toBeNull();
    expect(highlighted!.value).toBe('banana');
    expect(highlighted!.label).toBe('Banana');
  });

  it('getHighlightedOption() returns null when nothing is highlighted', () => {
    createListbox({ items: [] });
    expect(instance.getHighlightedOption()).toBeNull();
  });

  it('clearSelection() clears all selections', () => {
    createListbox({ value: 'apple' });
    instance.clear();
    const opts = getOptionEls();
    opts.forEach(opt => {
      expect(opt.getAttribute('aria-selected')).toBe('false');
    });
  });

  it('clearSelection() makes value() return null in single mode', () => {
    createListbox({ value: 'apple' });
    instance.clear();
    expect(instance.value()).toBeNull();
  });

  it('clearSelection() makes value() return empty array in multiple mode', () => {
    createListbox({ isMultiple: true, value: ['apple', 'banana'] });
    instance.clear();
    expect(instance.value()).toEqual([]);
  });

  it('scrollToOption(value) calls scrollIntoView on the option element', () => {
    createListbox();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    instance.scrollToOption('cherry');
    expect(scrollSpy).toHaveBeenCalled();
    scrollSpy.mockRestore();
  });

  it('scrollToOption(value) does nothing for unknown value', () => {
    createListbox();
    expect(() => instance.scrollToOption('nonexistent')).not.toThrow();
  });

  it('filter() method is a no-op without search: true (filtering requires search)', () => {
    createListbox();
    instance.filter('apple');
    expect(getOptionEls().length).toBe(mockItems.length);
  });
});

// ---------------------------------------------------------------------------
// 12. Destroy
// ---------------------------------------------------------------------------

describe('ArvoListbox -- destroy', () => {
  it('destroy() clears DOM content from the root element', () => {
    createListbox();
    instance.destroy();
    expect(containerEl.innerHTML).toBe('');
  });

  it('destroy() removes className from root element', () => {
    createListbox();
    instance.destroy();
    expect(containerEl.className).toBe('');
  });

  it('destroy() does not remove the container element itself', () => {
    createListbox();
    instance.destroy();
    expect(document.body.contains(containerEl)).toBe(true);
  });

  it('destroy() prevents listbox:change from firing after destroy', () => {
    createListbox();
    const optEl = getOptionEls()[0];
    instance.destroy();
    const handler = vi.fn();
    containerEl.addEventListener('listbox:change', handler);
    optEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('destroy() does not throw when called twice', () => {
    createListbox();
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });

  it('destroy() nullifies arrow nav (no errors on further key events)', () => {
    createListbox();
    const listEl = getListEl();
    instance.destroy();
    expect(() => fireKey(listEl, 'ArrowDown')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// contextHelp (FormLabel passthrough)
// ---------------------------------------------------------------------------
describe('Listbox - contextHelp', () => {
  it('does NOT render the context-help slot when contextHelp is omitted', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoListbox(el, { items: [], label: 'Status' });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });

  it('renders the context-help slot when contextHelp is provided alongside a label', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoListbox(el, {
      items: [],
      label: 'Status',
      contextHelp: { content: 'Pick a status.' },
    });
    const wrapper = el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const trigger = wrapper!.querySelector('button.arvo-ctx-help');
    expect(trigger).not.toBeNull();
    expect(trigger!.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('does NOT render the context-help slot when label is omitted', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    new ArvoListbox(el, { items: [], contextHelp: { content: 'No label' } });
    expect(el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
  });
});
