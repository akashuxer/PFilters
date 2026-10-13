// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoChipList, type ArvoChipListItem } from './ChipList';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createListEl(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function chipEls(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(':scope > .arvo-chip'));
}

const ITEMS_TWO: ArvoChipListItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
];

const ITEMS_THREE: ArvoChipListItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
];

const ITEMS_FOUR: ArvoChipListItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
  { key: 'd', label: 'Delta' },
];

// A capturing ResizeObserver mock used only by the geometry-based overflow
// tests. jsdom ships no ResizeObserver, so installing one lets us drive a
// re-measure after stubbing element geometry.
class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    ResizeObserverMock.instances.push(this);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  trigger(): void {
    this.cb([], this as unknown as ResizeObserver);
  }
}

function rectWithRight(right: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right,
    width: right,
    height: 0,
    toJSON() {},
  } as DOMRect;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization + rendering
// ---------------------------------------------------------------------------

describe('ArvoChipList -- initialization', () => {
  it('static initialize() returns an ArvoChipList instance', () => {
    const el = createListEl();
    expect(ArvoChipList.initialize(el)).toBeInstanceOf(ArvoChipList);
  });

  it('constructor returns an ArvoChipList instance', () => {
    const el = createListEl();
    expect(new ArvoChipList(el)).toBeInstanceOf(ArvoChipList);
  });

  it('adds arvo-chip-list class and role="group"', () => {
    const el = createListEl();
    new ArvoChipList(el);
    expect(el.classList.contains('arvo-chip-list')).toBe(true);
    expect(el.getAttribute('role')).toBe('group');
  });

  it('sets aria-label from option', () => {
    const el = createListEl();
    new ArvoChipList(el, { ariaLabel: 'Active filters' });
    expect(el.getAttribute('aria-label')).toBe('Active filters');
  });

  it('sets aria-labelledby from option', () => {
    const el = createListEl();
    new ArvoChipList(el, { ariaLabelledBy: 'lbl-1' });
    expect(el.getAttribute('aria-labelledby')).toBe('lbl-1');
  });

  it('builds one ArvoChip per item', () => {
    const el = createListEl();
    new ArvoChipList(el, { items: ITEMS_THREE });
    expect(chipEls(el).length).toBe(3);
  });

  it('renders item labels', () => {
    const el = createListEl();
    new ArvoChipList(el, { items: ITEMS_TWO });
    const labels = Array.from(el.querySelectorAll('.arvo-chip__lbl')).map((l) => l.textContent);
    expect(labels).toContain('Alpha');
    expect(labels).toContain('Beta');
  });
});

// ---------------------------------------------------------------------------
// Variant / appearance / size / overflow-mode classes
// ---------------------------------------------------------------------------

describe('ArvoChipList -- variant', () => {
  it('applies arvo-chip-list--general by default', () => {
    const el = createListEl();
    new ArvoChipList(el);
    expect(el.classList.contains('arvo-chip-list--general')).toBe(true);
  });

  it.each(['general', 'filter', 'input'] as const)('applies arvo-chip-list--%s', (variant) => {
    const el = createListEl();
    new ArvoChipList(el, { variant });
    expect(el.classList.contains(`arvo-chip-list--${variant}`)).toBe(true);
  });
});

describe('ArvoChipList -- appearance', () => {
  it.each(['primary', 'outline', 'utility'] as const)('applies arvo-chip-list--%s', (appearance) => {
    const el = createListEl();
    new ArvoChipList(el, { appearance });
    expect(el.classList.contains(`arvo-chip-list--${appearance}`)).toBe(true);
  });

  it('custom colorMode coerces to the utility appearance class', () => {
    const el = createListEl();
    new ArvoChipList(el, { appearance: 'primary', colorMode: 'custom' });
    expect(el.classList.contains('arvo-chip-list--utility')).toBe(true);
    expect(el.classList.contains('arvo-chip-list--primary')).toBe(false);
  });
});

describe('ArvoChipList -- size', () => {
  it.each(['sm', 'md', 'lg'] as const)('applies arvo-chip-list--%s', (size) => {
    const el = createListEl();
    new ArvoChipList(el, { size });
    expect(el.classList.contains(`arvo-chip-list--${size}`)).toBe(true);
  });
});

describe('ArvoChipList -- overflowMode class', () => {
  it('applies arvo-chip-list--wrap by default', () => {
    const el = createListEl();
    new ArvoChipList(el);
    expect(el.classList.contains('arvo-chip-list--wrap')).toBe(true);
  });

  it.each(['wrap', 'single-line', 'max-rows'] as const)('applies arvo-chip-list--%s', (overflowMode) => {
    const el = createListEl();
    new ArvoChipList(el, { overflowMode });
    expect(el.classList.contains(`arvo-chip-list--${overflowMode}`)).toBe(true);
  });

  it('overflowMode="none" emits no overflow layout modifier class', () => {
    const el = createListEl();
    new ArvoChipList(el, { overflowMode: 'none' });
    expect(el.classList.contains('arvo-chip-list--none')).toBe(false);
    expect(el.classList.contains('arvo-chip-list--wrap')).toBe(false);
  });

  it('sets --arvo-chip-list-max-rows from maxRows when overflowMode="max-rows"', () => {
    const el = createListEl();
    new ArvoChipList(el, { overflowMode: 'max-rows', maxRows: 3 });
    expect(el.style.getPropertyValue('--arvo-chip-list-max-rows')).toBe('3');
  });
});

describe('ArvoChipList -- reorderable class', () => {
  it('applies arvo-chip-list--reorderable when isReorderable', () => {
    const el = createListEl();
    new ArvoChipList(el, { isReorderable: true });
    expect(el.classList.contains('arvo-chip-list--reorderable')).toBe(true);
  });

  it('does not apply reorderable class by default', () => {
    const el = createListEl();
    new ArvoChipList(el);
    expect(el.classList.contains('arvo-chip-list--reorderable')).toBe(false);
  });

  it('suppresses the reorderable class when disabled', () => {
    const el = createListEl();
    new ArvoChipList(el, { isReorderable: true, isDisabled: true });
    expect(el.classList.contains('arvo-chip-list--reorderable')).toBe(false);
  });

  it('suppresses the reorderable class when readonly', () => {
    const el = createListEl();
    new ArvoChipList(el, { isReorderable: true, isReadOnly: true });
    expect(el.classList.contains('arvo-chip-list--reorderable')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Context propagation -> built chips
// ---------------------------------------------------------------------------

describe('ArvoChipList -- context propagation', () => {
  it('propagates size to built chips', () => {
    const el = createListEl();
    new ArvoChipList(el, { size: 'lg', items: ITEMS_TWO });
    expect(chipEls(el)[0].classList.contains('arvo-chip--lg')).toBe(true);
  });

  it('propagates variant to built chips (filter -> button + arvo-chip--filter)', () => {
    const el = createListEl();
    new ArvoChipList(el, { variant: 'filter', items: ITEMS_TWO });
    const chip = chipEls(el)[0];
    expect(chip.classList.contains('arvo-chip--filter')).toBe(true);
    expect(chip.tagName).toBe('BUTTON');
  });

  it('propagates appearance to built chips', () => {
    const el = createListEl();
    new ArvoChipList(el, { appearance: 'outline', items: ITEMS_TWO });
    expect(chipEls(el)[0].classList.contains('arvo-chip--outline')).toBe(true);
  });

  it('propagates colorMode custom to built chips (utility appearance class)', () => {
    const el = createListEl();
    new ArvoChipList(el, { colorMode: 'custom', items: ITEMS_TWO });
    const chip = chipEls(el)[0];
    expect(chip.classList.contains('arvo-chip--utility')).toBe(true);
    expect(chip.classList.contains('arvo-chip--purple')).toBe(true);
  });

  it('propagates isDisabled to built chips', () => {
    const el = createListEl();
    new ArvoChipList(el, { isDisabled: true, items: ITEMS_TWO });
    expect(chipEls(el)[0].classList.contains('is-disabled')).toBe(true);
  });

  it('propagates isReadOnly to built chips', () => {
    const el = createListEl();
    new ArvoChipList(el, { isReadOnly: true, items: ITEMS_TWO });
    expect(chipEls(el)[0].classList.contains('is-readonly')).toBe(true);
  });

  it('a per-item override beats the inherited list default', () => {
    const el = createListEl();
    new ArvoChipList(el, { size: 'lg', items: [{ key: 'a', label: 'Alpha', size: 'sm' }] });
    const chip = chipEls(el)[0];
    expect(chip.classList.contains('arvo-chip--sm')).toBe(true);
    expect(chip.classList.contains('arvo-chip--lg')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Filter selection
// ---------------------------------------------------------------------------

describe('ArvoChipList -- filter selection', () => {
  it('resolves multiple selection from variant=filter (both chips select)', () => {
    const el = createListEl();
    const onSelectionChange = vi.fn();
    new ArvoChipList(el, { variant: 'filter', items: ITEMS_THREE, onSelectionChange });
    const chips = chipEls(el);
    (chips[0] as HTMLButtonElement).click();
    (chips[1] as HTMLButtonElement).click();
    expect(chips[0].classList.contains('active')).toBe(true);
    expect(chips[1].classList.contains('active')).toBe(true);
  });

  it('clicking a filter chip toggles aria-pressed + .active and fires chip-list:selection-change', () => {
    const el = createListEl();
    const handler = vi.fn();
    el.addEventListener('chip-list:selection-change', handler);
    new ArvoChipList(el, { variant: 'filter', items: ITEMS_TWO });
    const chip = chipEls(el)[0] as HTMLButtonElement;
    chip.click();
    expect(chip.classList.contains('active')).toBe(true);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toMatchObject({ key: 'a', isSelected: true });
    expect(detail.keys).toEqual(['a']);
  });

  it('also calls the onSelectionChange callback with the detail', () => {
    const el = createListEl();
    const onSelectionChange = vi.fn();
    new ArvoChipList(el, { variant: 'filter', items: ITEMS_TWO, onSelectionChange });
    (chipEls(el)[0] as HTMLButtonElement).click();
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'a', isSelected: true, keys: ['a'] }),
    );
  });

  it('single selection deselects the previous chip', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'filter',
      selectionMode: 'single',
      defaultSelectedKeys: ['a'],
      items: ITEMS_THREE,
    });
    const chips = chipEls(el);
    (chips[1] as HTMLButtonElement).click();
    expect(chips[0].classList.contains('active')).toBe(false);
    expect(chips[1].classList.contains('active')).toBe(true);
  });

  it('seeds selection from defaultSelectedKeys', () => {
    const el = createListEl();
    new ArvoChipList(el, { variant: 'filter', defaultSelectedKeys: ['b'], items: ITEMS_THREE });
    expect(chipEls(el)[1].classList.contains('active')).toBe(true);
  });

  it('seeds selection from controlled selectedKeys', () => {
    const el = createListEl();
    new ArvoChipList(el, { variant: 'filter', selectedKeys: ['a'], items: ITEMS_THREE });
    expect(chipEls(el)[0].classList.contains('active')).toBe(true);
  });

  it('coerces numeric keys to match the selected set', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'filter',
      selectedKeys: [1],
      items: [
        { key: 1, label: 'One' },
        { key: 2, label: 'Two' },
      ],
    });
    expect(chipEls(el)[0].classList.contains('active')).toBe(true);
    expect(list.selectedKeys()).toEqual(['1']);
  });

  it('selectedKeys() getter returns the current selection', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { variant: 'filter', defaultSelectedKeys: ['a'], items: ITEMS_THREE });
    expect(list.selectedKeys()).toEqual(['a']);
  });

  it('selectedKeys(next) setter updates chips and fires selection-change', () => {
    const el = createListEl();
    const handler = vi.fn();
    el.addEventListener('chip-list:selection-change', handler);
    const list = new ArvoChipList(el, { variant: 'filter', items: ITEMS_THREE });
    list.selectedKeys(['b']);
    expect(chipEls(el)[1].classList.contains('active')).toBe(true);
    expect(list.selectedKeys()).toEqual(['b']);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('selectedKeys(next) is a no-op for a non-filter list', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { variant: 'general', items: ITEMS_THREE });
    list.selectedKeys(['a']);
    expect(list.selectedKeys()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Overflow (deterministic numeric cap)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- overflow (numeric cap)', () => {
  function buildCapped(opts = {}) {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'general',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      ...opts,
    });
    return { el, list };
  }

  it('shows the overflow action with the "+N more" label when chips are clipped', () => {
    const { el } = buildCapped();
    const overflow = el.querySelector('.arvo-chip-list__overflow') as HTMLButtonElement;
    expect(overflow).not.toBeNull();
    expect(overflow.style.display).not.toBe('none');
    expect(overflow.textContent).toBe('+2 more');
  });

  it('exposes the "Show N more chips" aria-label', () => {
    const { el } = buildCapped();
    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.getAttribute('aria-label')).toBe('Show 2 more chips');
  });

  it('hides clipped chips with tabindex=-1 and visibility:hidden', () => {
    const { el } = buildCapped();
    const chips = chipEls(el);
    expect(chips[2].style.visibility).toBe('hidden');
    expect(chips[2].getAttribute('tabindex')).toBe('-1');
    expect(chips[3].style.visibility).toBe('hidden');
  });

  it('keeps the overflow action hidden when nothing overflows', () => {
    const { el } = buildCapped({ maxVisibleChips: 10 });
    const overflow = el.querySelector('.arvo-chip-list__overflow') as HTMLButtonElement;
    expect(overflow.style.display).toBe('none');
  });

  it('builds no overflow action in wrap mode', () => {
    const { el } = buildCapped({ overflowMode: 'wrap', maxVisibleChips: 'auto' });
    expect(el.querySelector('.arvo-chip-list__overflow')).toBeNull();
  });

  it('clicking the overflow action fires chip-list:overflow-press and calls onOverflowPress', () => {
    const onOverflowPress = vi.fn();
    const handler = vi.fn();
    const { el } = buildCapped({ onOverflowPress });
    el.addEventListener('chip-list:overflow-press', handler);
    (el.querySelector('.arvo-chip-list__overflow') as HTMLButtonElement).click();
    expect(onOverflowPress).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.hiddenCount).toBe(2);
  });

  it('honors a custom overflowLabel and overflowAriaLabel', () => {
    const { el } = buildCapped({
      maxVisibleChips: 1,
      overflowLabel: (n: number) => `${n} hidden`,
      overflowAriaLabel: (n: number) => `${n} more available`,
    });
    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.textContent).toBe('3 hidden');
    expect(overflow?.getAttribute('aria-label')).toBe('3 more available');
  });
});

// ---------------------------------------------------------------------------
// Overflow (geometry-based, ResizeObserver mock)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- overflow (geometry)', () => {
  const realRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;

  beforeEach(() => {
    ResizeObserverMock.instances = [];
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = realRO;
  });

  it('single-line hides chips whose right edge exceeds the root width', () => {
    const el = createListEl();
    new ArvoChipList(el, { variant: 'general', overflowMode: 'single-line', items: ITEMS_FOUR });

    el.getBoundingClientRect = () => rectWithRight(100);
    chipEls(el).forEach((chip, i) => {
      chip.getBoundingClientRect = () => rectWithRight((i + 1) * 40); // 40, 80, 120, 160
    });

    ResizeObserverMock.instances.at(-1)?.trigger();

    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.textContent).toBe('+2 more');
    expect(chipEls(el)[2].style.visibility).toBe('hidden');
  });

  it('max-rows collapses chips beyond the row clamp (offsetTop buckets)', () => {
    const el = createListEl();
    new ArvoChipList(el, { variant: 'general', overflowMode: 'max-rows', maxRows: 1, items: ITEMS_FOUR });

    chipEls(el).forEach((chip, i) => {
      Object.defineProperty(chip, 'offsetTop', {
        configurable: true,
        get: () => (i < 2 ? 0 : 50),
      });
    });

    ResizeObserverMock.instances.at(-1)?.trigger();

    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.textContent).toBe('+2 more');
  });
});

// ---------------------------------------------------------------------------
// Reorder (keyboard)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- reorder', () => {
  function buildReorder(opts = {}) {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'general',
      isReorderable: true,
      items: ITEMS_THREE,
      ...opts,
    });
    return { el, list };
  }

  function fireGripKeydown(grip: HTMLElement, key: 'ArrowUp' | 'ArrowDown') {
    grip.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true }));
  }

  it('injects a drag handle (grip) onto each chip when reorder is allowed', () => {
    const { el } = buildReorder();
    expect(chipEls(el).every((c) => c.querySelector('.arvo-chip__grip'))).toBe(true);
  });

  it('Ctrl+ArrowDown reorders the chip DOM and fires chip-list:reorder', () => {
    const onReorder = vi.fn();
    const handler = vi.fn();
    const { el } = buildReorder({ onReorder });
    el.addEventListener('chip-list:reorder', handler);

    const grip = chipEls(el)[0].querySelector('.arvo-chip__grip') as HTMLElement;
    fireGripKeydown(grip, 'ArrowDown');

    expect(onReorder).toHaveBeenCalledWith(
      expect.objectContaining({ keys: ['b', 'a', 'c'], key: 'a', fromIndex: 0, toIndex: 1 }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
    const labels = Array.from(el.querySelectorAll('.arvo-chip__lbl')).map((l) => l.textContent);
    expect(labels).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('preventDefault on chip-list:reorder reverts the DOM move', () => {
    const { el } = buildReorder();
    el.addEventListener('chip-list:reorder', (e) => e.preventDefault());

    const grip = chipEls(el)[0].querySelector('.arvo-chip__grip') as HTMLElement;
    fireGripKeydown(grip, 'ArrowDown');

    const labels = Array.from(el.querySelectorAll('.arvo-chip__lbl')).map((l) => l.textContent);
    expect(labels).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('does not inject grips when isReorderable is false', () => {
    const { el } = buildReorder({ isReorderable: false });
    expect(el.querySelector('.arvo-chip__grip')).toBeNull();
  });

  it('suppresses reorder grips when disabled', () => {
    const { el } = buildReorder({ isDisabled: true });
    expect(el.querySelector('.arvo-chip__grip')).toBeNull();
  });

  it('suppresses reorder grips when readonly', () => {
    const { el } = buildReorder({ isReadOnly: true });
    expect(el.querySelector('.arvo-chip__grip')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dismiss (input chips)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- dismiss', () => {
  function buildInput() {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'input',
      items: [
        { key: 'a', label: 'Austin' },
        { key: 'b', label: 'Bailey' },
      ],
    });
    return { el, list };
  }

  function dismissBtn(el: HTMLElement, index: number): HTMLElement {
    // Single-focus chip model: the dismiss is a non-interactive span on each chip.
    return chipEls(el)[index].querySelector('.arvo-chip__dismiss') as HTMLElement;
  }

  /**
   * The chip remove leave animation defers `chip:dismiss` (and therefore
   * the list's `chip-list:dismiss` re-emit) until the chip's max-width
   * transition completes. Tests dispatch transitionend manually so the
   * assertion stays synchronous in jsdom (which does not run CSS
   * transitions).
   */
  function fireDismissTransitionEnd(el: HTMLElement, index: number): void {
    const chip = chipEls(el)[index] as HTMLElement;
    chip.dispatchEvent(
      new TransitionEvent('transitionend', {
        propertyName: 'max-width',
        bubbles: true,
      }),
    );
  }

  it('re-emits chip-list:dismiss with the chip key and originalEvent', () => {
    const { el } = buildInput();
    const handler = vi.fn();
    el.addEventListener('chip-list:dismiss', handler);
    dismissBtn(el, 0).click();
    fireDismissTransitionEnd(el, 0);
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.key).toBe('a');
    expect(event.detail.originalEvent).toBeTruthy();
  });

  it('chip-list:dismiss is cancelable', () => {
    const { el } = buildInput();
    let cancelable = false;
    el.addEventListener('chip-list:dismiss', (e) => {
      cancelable = e.cancelable;
    });
    dismissBtn(el, 0).click();
    fireDismissTransitionEnd(el, 0);
    expect(cancelable).toBe(true);
  });

  it('does not auto-remove the chip (consumer owns removal)', () => {
    const { el } = buildInput();
    dismissBtn(el, 0).click();
    expect(chipEls(el).length).toBe(2);
  });

  it('preventDefault leaves the chip in place', () => {
    const { el } = buildInput();
    el.addEventListener('chip-list:dismiss', (e) => e.preventDefault());
    dismissBtn(el, 0).click();
    expect(chipEls(el).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// disabled() / readOnly()
// ---------------------------------------------------------------------------

describe('ArvoChipList -- disabled()', () => {
  it('disabled() returns the current state', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { isDisabled: true });
    expect(list.disabled()).toBe(true);
  });

  it('disabled(true) adds is-disabled + aria-disabled and propagates to chips', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { variant: 'filter', items: ITEMS_TWO });
    list.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    chipEls(el).forEach((c) => expect(c.classList.contains('is-disabled')).toBe(true));
  });

  it('disabled(false) clears the disabled state on the list and chips', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { variant: 'filter', isDisabled: true, items: ITEMS_TWO });
    list.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
    chipEls(el).forEach((c) => expect(c.classList.contains('is-disabled')).toBe(false));
  });

  it('disabled(true) non-interactively renders the overflow action (ArvoDisclosureButton)', () => {
    // The overflow button is composed via ArvoDisclosureButton, which has no
    // public `disabled` setter by design. The list propagates its disabled
    // state through tabindex=-1 + aria-hidden + a parent-CSS dim on the
    // disclosure button's color tokens.
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'general',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_THREE,
    });
    list.disabled(true);
    const overflow = el.querySelector('.arvo-chip-list__overflow') as HTMLButtonElement;
    expect(overflow).not.toBeNull();
    expect(overflow.classList.contains('arvo-disc-btn')).toBe(true);
    expect(overflow.getAttribute('tabindex')).toBe('-1');
    expect(overflow.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ArvoChipList -- readOnly()', () => {
  it('readOnly() returns the current state', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { isReadOnly: true });
    expect(list.readOnly()).toBe(true);
  });

  it('readOnly(true) adds is-readonly + aria-readonly and propagates to chips', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { items: ITEMS_TWO });
    list.readOnly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
    expect(el.getAttribute('aria-readonly')).toBe('true');
    chipEls(el).forEach((c) => expect(c.classList.contains('is-readonly')).toBe(true));
  });

  it('readOnly(false) clears the readonly state', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { isReadOnly: true, items: ITEMS_TWO });
    list.readOnly(false);
    expect(el.classList.contains('is-readonly')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setLoading() -- gated behind the master loading switch
// ---------------------------------------------------------------------------

describe('ArvoChipList -- loading (default off)', () => {
  it('does not apply the loading class or aria-busy by default', () => {
    const el = createListEl();
    new ArvoChipList(el);
    expect(el.classList.contains('loading')).toBe(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });
});

describe('ArvoChipList -- setLoading() (enabled)', () => {
  it('setLoading(true) adds loading + aria-busy and fires chip-list:loading', () => {
    const el = createListEl();
    const handler = vi.fn();
    el.addEventListener('chip-list:loading', handler);
    const list = new ArvoChipList(el, { items: ITEMS_TWO });
    list.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('setLoading(true) propagates loading to chips', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { items: ITEMS_TWO });
    list.setLoading(true);
    chipEls(el).forEach((c) => expect(c.classList.contains('loading')).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// setItems()
// ---------------------------------------------------------------------------

describe('ArvoChipList -- setItems()', () => {
  it('rebuilds the chips from the new items array', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { items: ITEMS_THREE });
    list.setItems([{ key: 'x', label: 'X' }]);
    const labels = Array.from(el.querySelectorAll('.arvo-chip__lbl')).map((l) => l.textContent);
    expect(chipEls(el).length).toBe(1);
    expect(labels).toEqual(['X']);
  });
});

// ---------------------------------------------------------------------------
// focus()
// ---------------------------------------------------------------------------

describe('ArvoChipList -- focus()', () => {
  it('focuses the first focusable chip', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { variant: 'filter', items: ITEMS_THREE });
    list.focus();
    expect(document.activeElement).toBe(chipEls(el)[0]);
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoChipList -- destroy()', () => {
  it('clears classes, role, and inner content', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { variant: 'filter', items: ITEMS_THREE });
    list.destroy();
    expect(el.className).toBe('');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.children.length).toBe(0);
  });

  it('removes the aria attributes', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { ariaLabel: 'L', isDisabled: true, isReadOnly: true });
    list.destroy();
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('aria-disabled')).toBeNull();
    expect(el.getAttribute('aria-readonly')).toBeNull();
  });

  it('detaches the chip:dismiss listener so dismiss no longer re-emits', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'input',
      items: [{ key: 'a', label: 'Austin' }],
    });
    list.destroy();
    const handler = vi.fn();
    el.addEventListener('chip-list:dismiss', handler);
    el.dispatchEvent(new CustomEvent('chip:dismiss', { bubbles: true, detail: {} }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, { items: ITEMS_TWO });
    list.destroy();
    expect(() => list.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Expansion contract (persistent disclosure)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- expansion (persistent disclosure)', () => {
  it('disclosure click flips the expanded state when opted in (onExpandedChange)', () => {
    const el = createListEl();
    const onExpandedChange = vi.fn();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      onExpandedChange,
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');

    disclosure.click();

    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
  });

  it('disclosure label flips to "Show less" when defaultExpanded=true', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      defaultExpanded: true,
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    expect(disclosure.textContent).toContain('Show less');
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
  });

  it('disclosure chevron keeps angle-down when expanded (CSS rotates it 180deg)', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      defaultExpanded: true,
    });
    const chev = el.querySelector('.arvo-chip-list__overflow .arvo-disc-btn__chev');
    // ArvoDisclosureButton always renders `o9con-angle-down`; the CSS
    // rotates the glyph 180deg when the host carries
    // `aria-expanded='true'`. The class itself never swaps.
    expect(chev?.classList.contains('o9con-angle-down')).toBe(true);
    expect(chev?.classList.contains('o9con-angle-up')).toBe(false);
  });

  it('honors a custom expandedLabel', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      defaultExpanded: true,
      expandedLabel: () => 'Collapse',
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    expect(disclosure.textContent).toContain('Collapse');
  });

  it('disclosure unhides all chips in the expanded state', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      defaultExpanded: true,
    });
    const chips = chipEls(el);
    for (const chip of chips) {
      expect(chip.style.visibility).not.toBe('hidden');
    }
  });

  it('disclosure click stopsPropagation so a parent click listener does NOT fire', () => {
    const parentClick = vi.fn();
    const wrap = document.createElement('div');
    wrap.addEventListener('click', parentClick);
    const el = createListEl();
    wrap.appendChild(el);
    document.body.appendChild(wrap);
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      onExpandedChange: () => {},
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    disclosure.click();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('legacy onOverflowPress consumers do NOT auto-expand (opt-out preserved)', () => {
    const el = createListEl();
    const onOverflowPress = vi.fn();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      onOverflowPress,
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    disclosure.click();
    expect(onOverflowPress).toHaveBeenCalledTimes(1);
    // No opt-in -> aria-expanded does NOT flip.
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
  });

  it('disclosure stays visible when expanded with 0 hidden chips so the user can collapse', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 10,
      items: ITEMS_THREE,
      defaultExpanded: true,
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    expect(disclosure.style.display).not.toBe('none');
    expect(disclosure.textContent).toContain('Show less');
  });

  it('disclosure is the SAME DOM node across collapse <-> expand (no re-mount)', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      onExpandedChange: () => {},
    });
    const disclosureBefore = el.querySelector('.arvo-chip-list__overflow');
    expect(disclosureBefore).not.toBeNull();
    (disclosureBefore as HTMLButtonElement).click();
    const disclosureAfter = el.querySelector('.arvo-chip-list__overflow');
    expect(disclosureAfter).toBe(disclosureBefore);
    expect(disclosureAfter?.textContent).toContain('Show less');
    list.destroy();
  });

  it('expanded() public method gets / sets the state', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
    });
    expect(list.expanded()).toBe(false);
    list.expanded(true);
    expect(list.expanded()).toBe(true);
    expect(
      (el.querySelector('.arvo-chip-list__overflow') as HTMLButtonElement)?.textContent,
    ).toContain('Show less');
  });

  it('expanded() programmatic write dispatches chip-list:expand-change', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
    });
    let payload: { isExpanded: boolean } | null = null;
    el.addEventListener('chip-list:expand-change', (e) => {
      payload = (e as CustomEvent<{ isExpanded: boolean }>).detail;
    });
    list.expanded(true);
    expect(payload).not.toBeNull();
    expect(payload!.isExpanded).toBe(true);
  });

  it('disclosure click invokes onExpandedChange AND fires chip-list:expand-change', () => {
    const el = createListEl();
    const onExpandedChange = vi.fn();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 2,
      items: ITEMS_FOUR,
      onExpandedChange,
    });
    let payload: { isExpanded: boolean } | null = null;
    el.addEventListener('chip-list:expand-change', (e) => {
      payload = (e as CustomEvent<{ isExpanded: boolean }>).detail;
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    disclosure.click();
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(payload).not.toBeNull();
    expect(payload!.isExpanded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isWithinField (parent token-field hint)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- isWithinField', () => {
  it('sets data-within-field="true" on the root', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      items: ITEMS_TWO,
      isWithinField: true,
    });
    expect(el.getAttribute('data-within-field')).toBe('true');
  });

  it('does NOT set data-within-field by default', () => {
    const el = createListEl();
    new ArvoChipList(el, { items: ITEMS_TWO });
    expect(el.getAttribute('data-within-field')).toBeNull();
  });

  it('disclosure renders at size="md" inside a field', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isWithinField: true,
    });
    const disclosure = el.querySelector('.arvo-chip-list__overflow');
    expect(disclosure?.classList.contains('arvo-disc-btn--md')).toBe(true);
    expect(disclosure?.classList.contains('arvo-disc-btn--sm')).toBe(false);
  });

  it('disclosure renders at size="md" standalone too (Figma rework: always md, the sm-standalone default was retired)', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
    });
    const disclosure = el.querySelector('.arvo-chip-list__overflow');
    expect(disclosure?.classList.contains('arvo-disc-btn--md')).toBe(true);
    expect(disclosure?.classList.contains('arvo-disc-btn--sm')).toBe(false);
  });

  it('disclosure renders with tabIndex=-1 inside a field', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isWithinField: true,
    });
    const disclosure = el.querySelector('.arvo-chip-list__overflow');
    expect(disclosure?.getAttribute('tabindex')).toBe('-1');
  });

  it('isWithinField implies expansion opt-in (disclosure auto-flips on click)', () => {
    const el = createListEl();
    const onExpandedChange = vi.fn();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isWithinField: true,
      onExpandedChange,
    });
    const disclosure = el.querySelector(
      '.arvo-chip-list__overflow',
    ) as HTMLButtonElement;
    disclosure.click();
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// isStaticOverflow (strict overflow indicator)
// ---------------------------------------------------------------------------

describe('ArvoChipList -- isStaticOverflow', () => {
  it('renders the overflow indicator as a <span> (not a <button>) without a chevron', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
    });
    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow).not.toBeNull();
    expect(overflow!.tagName).toBe('SPAN');
    expect(overflow!.classList.contains('arvo-chip-list__overflow--static')).toBe(true);
    expect(overflow!.classList.contains('arvo-disc-btn')).toBe(false);
    expect(overflow!.querySelector('.arvo-disc-btn__chev')).toBeNull();
  });

  it('the static indicator has no aria-expanded attribute', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
    });
    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.hasAttribute('aria-expanded')).toBe(false);
  });

  it('the static indicator is not focusable (no tabindex set, not a button)', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
    });
    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.getAttribute('tabindex')).toBeNull();
  });

  it('clicking the static indicator does NOT fire onExpandedChange', () => {
    const el = createListEl();
    const onExpandedChange = vi.fn();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
      onExpandedChange,
    });
    const overflow = el.querySelector('.arvo-chip-list__overflow') as HTMLElement;
    overflow.click();
    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it('isExpanded=true seed does NOT cause the list to pivot to wrap (chips stay hidden)', () => {
    // Static-overflow consumers never expand. Even if the seed is
    // `isExpanded: true`, the chip-list keeps overflow measurement active
    // -- surplus chips remain visibility:hidden behind the indicator.
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
      isExpanded: true,
    });
    const chips = el.querySelectorAll<HTMLElement>(':scope > .arvo-chip');
    // maxVisibleChips=1, so chip[1] (Beta) must stay hidden.
    expect(chips[1].style.visibility).toBe('hidden');
  });

  it('the static indicator renders the collapsed overflowLabel (never expandedLabel)', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
      overflowLabel: (n) => `${n} hidden`,
      // expandedLabel must be IGNORED in static mode.
      expandedLabel: () => 'NEVER',
      isExpanded: true,
    });
    const overflow = el.querySelector('.arvo-chip-list__overflow');
    expect(overflow?.textContent).toContain('hidden');
    expect(overflow?.textContent).not.toContain('NEVER');
  });

  it('the static indicator is hidden when no chips overflow', () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 10,
      items: ITEMS_TWO,
      isStaticOverflow: true,
    });
    const overflow = el.querySelector<HTMLElement>('.arvo-chip-list__overflow');
    // The element is created up front and hidden via display:none when there
    // are no hidden chips; the React twin omits it entirely. Either is OK
    // -- assert the user-visible outcome (not rendered visibly).
    expect(overflow === null || overflow.style.display === 'none').toBe(true);
  });

  it('destroy() cleans up the static span (no leftover DOM)', () => {
    const el = createListEl();
    const list = new ArvoChipList(el, {
      variant: 'input',
      overflowMode: 'single-line',
      maxVisibleChips: 1,
      items: ITEMS_TWO,
      isStaticOverflow: true,
    });
    list.destroy();
    expect(el.querySelector('.arvo-chip-list__overflow')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('ArvoChipList -- accessibility', () => {
  // The page-level `region` landmark rule is not relevant to an isolated list.
  const axeOptions = { rules: { region: { enabled: false } } } as const;

  it('axe: no violations on an interactive filter list with selection', async () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'filter',
      ariaLabel: 'Filters',
      defaultSelectedKeys: ['a'],
      items: ITEMS_THREE,
    });
    const results = await axe.run(el, axeOptions);
    expect(results.violations.map((v) => v.id), JSON.stringify(results.violations)).toHaveLength(0);
  });

  it('axe: no violations on a dismissible input list', async () => {
    const el = createListEl();
    new ArvoChipList(el, {
      variant: 'input',
      ariaLabel: 'Recipients',
      items: [
        { key: 'a', label: 'Austin' },
        { key: 'b', label: 'Bailey' },
      ],
    });
    const results = await axe.run(el, axeOptions);
    expect(results.violations.map((v) => v.id), JSON.stringify(results.violations)).toHaveLength(0);
  });
});
