// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoOptionList } from './OptionList';
import type { OptionListItemData } from './OptionList';
import type { ListGroup } from '@arvo/core';

// jsdom lacks ResizeObserver (used by the position watcher + ArvoSearch).
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  // jsdom does not implement scrollIntoView; the keyboard-nav tests below
  // dispatch ArrowDown which calls _highlightOption -> el.scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

const items: OptionListItemData[] = [
  { id: 'opt-1', label: 'Apple', value: 'apple' },
  { id: 'opt-2', label: 'Banana', value: 'banana' },
  { id: 'opt-3', label: 'Cherry', value: 'cherry', isDisabled: true },
];

const grouped: ListGroup<OptionListItemData>[] = [
  { id: 'g1', label: 'Fruit', items: [{ id: 'a', label: 'Apple', value: 'apple' }] },
  { id: 'g2', label: 'Veg', items: [{ id: 'b', label: 'Carrot', value: 'carrot' }] },
];

function makeTrigger(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('role', 'combobox');
  btn.setAttribute('aria-label', 'Trigger');
  btn.textContent = 'Trigger';
  document.body.appendChild(btn);
  return btn;
}

let instances: ArvoOptionList[] = [];
let triggers: HTMLElement[] = [];

function create(opts: Partial<Parameters<typeof ArvoOptionList.initialize>[1]> = {}): {
  inst: ArvoOptionList;
  trigger: HTMLButtonElement;
} {
  const trigger = makeTrigger();
  const inst = ArvoOptionList.initialize(trigger, { items, ...opts });
  instances.push(inst);
  triggers.push(trigger);
  return { inst, trigger };
}

afterEach(() => {
  for (const i of instances) i.destroy();
  instances = [];
  for (const t of triggers) t.remove();
  triggers = [];
  document.body.innerHTML = '';
});

describe('ArvoOptionList -- lifecycle', () => {
  it('wires trigger ARIA on init', () => {
    const { trigger } = create();
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
  });

  it('opens and renders a listbox with options', () => {
    const { inst } = create();
    inst.open();
    expect(inst.isOpen()).toBe(true);
    const listbox = document.querySelector('[role="listbox"]')!;
    expect(listbox).toBeTruthy();
    expect(document.querySelectorAll('.arvo-opt-list__opt')).toHaveLength(3);
  });

  it('toggles open via the trigger click', () => {
    const { inst, trigger } = create();
    trigger.click();
    expect(inst.isOpen()).toBe(true);
    trigger.click();
    expect(inst.isOpen()).toBe(false);
  });

  it('reflects aria-expanded on open/close', () => {
    const { inst, trigger } = create();
    inst.open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    inst.close();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('ArvoOptionList -- selection', () => {
  it('selects on click and fires option-list:change (single)', () => {
    const onChange = vi.fn();
    const { inst, trigger } = create({ onChange });
    const evt = vi.fn();
    trigger.addEventListener('option-list:change', evt);
    inst.open();
    const banana = Array.from(document.querySelectorAll('.arvo-opt-list__opt')).find(
      (el) => el.textContent === 'Banana',
    ) as HTMLElement;
    banana.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'banana', isSelected: true }),
    );
    expect(evt).toHaveBeenCalled();
  });

  it('does not select a disabled option', () => {
    const onChange = vi.fn();
    const { inst } = create({ onChange });
    inst.open();
    const cherry = Array.from(document.querySelectorAll('.arvo-opt-list__opt')).find(
      (el) => el.textContent === 'Cherry',
    ) as HTMLElement;
    cherry.click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('multi-select toggles and stays open', () => {
    const onChange = vi.fn();
    const { inst } = create({ isMultiple: true, onChange });
    inst.open();
    const apple = Array.from(document.querySelectorAll('.arvo-opt-list__opt')).find(
      (el) =>
        el.querySelector('.arvo-opt-list__opt__lbl')?.textContent === 'Apple',
    ) as HTMLElement;
    apple.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: ['apple'], isSelected: true }),
    );
    expect(inst.isOpen()).toBe(true);
  });

  it('value() getter/setter works', () => {
    const { inst } = create({ defaultValue: 'apple' });
    expect(inst.value()).toBe('apple');
    inst.value('banana');
    expect(inst.value()).toBe('banana');
  });
});

describe('ArvoOptionList -- content', () => {
  it('renders grouped options with a divider', () => {
    const { inst } = create({ items: grouped });
    inst.open();
    expect(document.querySelectorAll('[role="group"]')).toHaveLength(2);
    expect(document.querySelector('.arvo-opt-list__divider')).toBeTruthy();
  });

  it('setItems replaces options', () => {
    const { inst } = create();
    inst.open();
    inst.setItems([{ id: 'x', label: 'Solo', value: 'solo' }]);
    expect(document.querySelectorAll('.arvo-opt-list__opt')).toHaveLength(1);
    expect(document.querySelector('.arvo-opt-list__opt')!.textContent).toBe('Solo');
  });

  it('renders a search field when enabled', () => {
    create({ search: true });
    expect(document.querySelector('.arvo-opt-list__search')).toBeTruthy();
  });
});

describe('ArvoOptionList -- variant', () => {
  const richItems: OptionListItemData[] = [
    {
      id: 'p-1',
      label: 'Jane Doe',
      secondaryLabel: 'Demand Planning',
      avatar: 'https://example.com/avatar1.png',
      value: 'jane',
    },
    {
      id: 'p-2',
      label: 'John Smith',
      secondaryLabel: 'Supply Planning',
      avatar: 'https://example.com/avatar2.png',
      value: 'john',
    },
  ];

  it('does not apply --rich in standard variant (default)', () => {
    const { inst } = create();
    inst.open();
    expect(document.querySelector('.arvo-opt-list--rich')).toBeNull();
  });

  it('applies --rich + emits __txt + __secondary in rich variant', () => {
    const { inst } = create({ items: richItems, variant: 'rich' });
    inst.open();
    expect(document.querySelector('.arvo-opt-list--rich')).toBeTruthy();
    expect(document.querySelectorAll('.arvo-opt-list__opt__txt').length).toBe(2);
    expect(document.querySelectorAll('.arvo-opt-list__opt__secondary').length).toBe(2);
    const sec = document.querySelector('.arvo-opt-list__opt__secondary');
    expect(sec?.textContent).toBe('Demand Planning');
  });

  it('renders avatar slot in rich variant when item has an avatar', () => {
    const { inst } = create({ items: richItems, variant: 'rich' });
    inst.open();
    expect(document.querySelectorAll('.arvo-opt-list__opt__avatar').length).toBe(2);
  });

  it('omits __txt and __secondary in standard variant even when items carry secondaryLabel', () => {
    const { inst } = create({ items: richItems });
    inst.open();
    expect(document.querySelectorAll('.arvo-opt-list__opt__txt').length).toBe(0);
    expect(document.querySelectorAll('.arvo-opt-list__opt__secondary').length).toBe(0);
  });
});

describe('ArvoOptionList -- multi-select checkbox', () => {
  it('renders a leading __opt__check slot per row in multi mode', () => {
    const { inst } = create({ isMultiple: true });
    inst.open();
    const slots = document.querySelectorAll('.arvo-opt-list__opt__check');
    expect(slots.length).toBe(3);
    slots.forEach((slot) => {
      expect(slot.querySelector('.arvo-cb')).toBeTruthy();
    });
  });

  it('does NOT render the checkbox slot in single-select mode', () => {
    const { inst } = create();
    inst.open();
    expect(document.querySelectorAll('.arvo-opt-list__opt__check').length).toBe(0);
  });

  it('multi-select selected row carries aria-selected but NOT the .active class', () => {
    const { inst } = create({ isMultiple: true, defaultValue: ['apple'] });
    inst.open();
    const apple = Array.from(
      document.querySelectorAll('.arvo-opt-list__opt'),
    ).find(
      (el) =>
        el.querySelector('.arvo-opt-list__opt__lbl')?.textContent === 'Apple',
    ) as HTMLElement;
    expect(apple.getAttribute('aria-selected')).toBe('true');
    expect(apple.classList.contains('active')).toBe(false);
  });

  it('single-select selected row carries the .active class (left-border indicator)', () => {
    const { inst } = create({ defaultValue: 'apple' });
    inst.open();
    const apple = Array.from(
      document.querySelectorAll('.arvo-opt-list__opt'),
    ).find(
      (el) =>
        el.querySelector('.arvo-opt-list__opt__lbl')?.textContent === 'Apple',
    ) as HTMLElement;
    expect(apple.classList.contains('active')).toBe(true);
  });

  it('destroy() tears down the per-row checkbox instances', () => {
    const { inst } = create({ isMultiple: true });
    inst.open();
    expect(document.querySelectorAll('.arvo-cb').length).toBe(3);
    inst.destroy();
    instances = instances.filter((i) => i !== inst);
    // After destroy the panel and all checkboxes are removed.
    expect(document.querySelector('.arvo-opt-list')).toBeNull();
  });

  // Clicking an option in multi mode must flip the visual checkbox state
  // in the matching row, in sync with `aria-selected` and the parent value.
  it('multi-select click toggles the embedded checkbox checked state', () => {
    const { inst } = create({ isMultiple: true });
    inst.open();

    const findRow = (label: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.arvo-opt-list__opt'),
      ).find(
        (el) =>
          el.querySelector('.arvo-opt-list__opt__lbl')?.textContent === label,
      ) as HTMLElement;
    const inputIn = (row: HTMLElement) =>
      row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;

    const apple = findRow('Apple');
    const banana = findRow('Banana');

    // Initial state -- nothing selected.
    expect(inputIn(apple).checked).toBe(false);
    expect(inputIn(banana).checked).toBe(false);

    // Select Apple.
    apple.click();
    expect(apple.getAttribute('aria-selected')).toBe('true');
    expect(inputIn(apple).checked).toBe(true);
    expect(inputIn(banana).checked).toBe(false);

    // Select Banana (Apple stays selected in multi mode).
    banana.click();
    expect(inputIn(apple).checked).toBe(true);
    expect(inputIn(banana).checked).toBe(true);

    // Deselect Apple.
    apple.click();
    expect(apple.getAttribute('aria-selected')).toBe('false');
    expect(inputIn(apple).checked).toBe(false);
    expect(inputIn(banana).checked).toBe(true);
    // The row must stay visually neutral in multi mode -- no `.active`.
    expect(banana.classList.contains('active')).toBe(false);
  });

  // Programmatic value() updates must also re-sync the embedded checkbox
  // visuals, including on disabled rows (whose ArvoCheckbox.toggle is a
  // no-op).
  it('value() setter re-syncs the embedded checkbox checked state', () => {
    const { inst } = create({ isMultiple: true });
    inst.open();

    const findRow = (label: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.arvo-opt-list__opt'),
      ).find(
        (el) =>
          el.querySelector('.arvo-opt-list__opt__lbl')?.textContent === label,
      ) as HTMLElement;
    const inputIn = (row: HTMLElement) =>
      row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;

    inst.value(['apple', 'cherry']);

    const apple = findRow('Apple');
    const cherry = findRow('Cherry');
    expect(inputIn(apple).checked).toBe(true);
    // Cherry is disabled but the visual checkbox must still reflect the
    // programmatic selection.
    expect(inputIn(cherry).checked).toBe(true);

    inst.value([]);
    expect(inputIn(apple).checked).toBe(false);
    expect(inputIn(cherry).checked).toBe(false);
  });
});

describe('ArvoOptionList -- empty states', () => {
  it('renders the noData empty figure when items is empty', () => {
    const { inst } = create({ items: [] });
    inst.open();
    const empty = document.querySelector('.arvo-opt-list__empty');
    expect(empty).toBeTruthy();
    expect(empty?.querySelector('.arvo-empty')).toBeTruthy();
    expect(empty?.querySelector('.arvo-empty__title')?.textContent).toBe(
      'No data available yet',
    );
  });

  it('renders the noResults empty figure with a Clear search action when filter has zero matches', () => {
    const { inst } = create({ search: true });
    inst.open();
    const input = document.querySelector(
      '.arvo-opt-list__search input',
    ) as HTMLInputElement;
    input.value = 'xxxxxxx';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const empty = document.querySelector('.arvo-opt-list__empty');
    expect(empty).toBeTruthy();
    expect(empty?.querySelector('.arvo-empty__title')?.textContent).toBe(
      'No results found',
    );
    const clearBtn = Array.from(empty?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Clear search'),
    ) as HTMLButtonElement | undefined;
    expect(clearBtn).toBeTruthy();
    clearBtn!.click();
    // After clearing the filter the original options reappear.
    expect(document.querySelectorAll('.arvo-opt-list__opt').length).toBe(3);
  });

  it('isCreatable: noResults figure shows a Create action and fires onCreate(query)', () => {
    const onCreate = vi.fn();
    const { inst, trigger } = create({ search: true, isCreatable: true, onCreate });
    inst.open();
    const evt = vi.fn();
    trigger.addEventListener('option-list:create', evt);
    const input = document.querySelector(
      '.arvo-opt-list__search input',
    ) as HTMLInputElement;
    input.value = 'admin';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const empty = document.querySelector('.arvo-opt-list__empty');
    expect(empty?.querySelector('.arvo-empty__message')?.textContent).toContain(
      'admin',
    );
    const createBtn = Array.from(empty?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Create'),
    ) as HTMLButtonElement | undefined;
    expect(createBtn).toBeTruthy();
    createBtn!.click();
    expect(onCreate).toHaveBeenCalledWith('admin');
    expect(evt).toHaveBeenCalled();
  });

  it('emptyConfig overrides title/message on the embedded figure', () => {
    const { inst } = create({
      items: [],
      emptyConfig: { title: 'Custom title', message: 'Custom message' },
    });
    inst.open();
    const empty = document.querySelector('.arvo-opt-list__empty');
    expect(empty?.querySelector('.arvo-empty__title')?.textContent).toBe(
      'Custom title',
    );
    expect(empty?.querySelector('.arvo-empty__message')?.textContent).toBe(
      'Custom message',
    );
  });
});

describe('ArvoOptionList -- keyboard handling', () => {
  // Type-ahead is desirable when the trigger itself receives keystrokes
  // (e.g. ArvoSelect's role="combobox" div), but composed fields like
  // ArvoMultiSelect / ArvoCombobox host a separate editable input as the
  // active-descendant target. In that mode the option list MUST NOT
  // preventDefault printable characters, otherwise typing into the input is
  // silently blocked by the type-ahead branch in createArrowNav.
  it('does NOT preventDefault printable keys when activeDescendantElement is set', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    const { inst, trigger } = create({ activeDescendantElement: input });
    inst.open();

    const ev = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(false);
    input.remove();
  });

  it('still preventDefaults ArrowDown / ArrowUp when activeDescendantElement is set', () => {
    // Arrow nav must remain active even with an external input so the field
    // can drive option highlight via aria-activedescendant.
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    const { inst, trigger } = create({ activeDescendantElement: input });
    inst.open();

    const down = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);

    const up = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);

    input.remove();
  });

  it('preventDefaults printable keys (type-ahead) when activeDescendantElement is NOT set', () => {
    // Default ArvoSelect-style usage: the trigger itself takes keystrokes and
    // type-ahead jumps to the option whose label starts with that letter.
    const { inst, trigger } = create();
    inst.open();

    const ev = new KeyboardEvent('keydown', {
      key: 'b',
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
  });

  it('moves the highlighted option on ArrowDown via the .highlighted class', () => {
    // The active option must carry `.highlighted` so _arvo-option-list.scss
    // can paint the keyboard navigation outline.
    const { inst, trigger } = create();
    inst.open();
    const optEls = Array.from(
      document.querySelectorAll<HTMLElement>('.arvo-opt-list__opt'),
    );
    expect(optEls[0].classList.contains('highlighted')).toBe(true);

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );

    expect(optEls[0].classList.contains('highlighted')).toBe(false);
    expect(optEls[1].classList.contains('highlighted')).toBe(true);
  });
});

describe('ArvoOptionList -- accessibility', () => {
  it('open overlay has zero axe violations', async () => {
    const { inst } = create({ ariaLabel: 'Fruit options' });
    inst.open();
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
  });

  it('destroy removes the panel and trigger ARIA', () => {
    const { inst, trigger } = create();
    inst.open();
    inst.destroy();
    instances = instances.filter((i) => i !== inst);
    expect(document.querySelector('.arvo-opt-list')).toBeNull();
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Standalone / public usage (bring-your-own-trigger, no field wrapper).
// Exercises the public promotion path -- a pivot-cell-style bespoke trigger
// binds a multi-select ArvoOptionList directly via initialize(), without any
// ArvoSelect / ArvoMultiSelect / ArvoCombobox field composing it.
// ---------------------------------------------------------------------------

function makeCellAffordance(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('role', 'combobox');
  btn.setAttribute('aria-label', 'Region filter');
  btn.className = 'cell-affordance';
  btn.textContent = 'Region';
  document.body.appendChild(btn);
  return btn;
}

describe('ArvoOptionList -- standalone public usage (BYOT)', () => {
  it('multi-select bound to a bespoke trigger toggles values without closing and fires option-list:change', () => {
    const trigger = makeCellAffordance();
    triggers.push(trigger);

    const onChange = vi.fn();
    const changeEvt = vi.fn();
    trigger.addEventListener('option-list:change', changeEvt);

    const inst = ArvoOptionList.initialize(trigger, {
      items,
      isMultiple: true,
      ariaLabel: 'Region options',
      onChange,
    });
    instances.push(inst);

    trigger.click();
    expect(inst.isOpen()).toBe(true);
    const listbox = document.querySelector('[role="listbox"]')!;
    expect(listbox).toBeTruthy();
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');

    const findOpt = (label: string) =>
      Array.from(document.querySelectorAll<HTMLElement>('.arvo-opt-list__opt')).find(
        (el) => el.textContent?.includes(label),
      )!;

    findOpt('Apple').click();
    expect(inst.value()).toEqual(['apple']);
    expect(onChange).toHaveBeenCalled();
    // Multi mode: overlay stays open on selection.
    expect(inst.isOpen()).toBe(true);
    expect(document.querySelector('[role="listbox"]')).toBeTruthy();

    findOpt('Banana').click();
    expect(inst.value()).toEqual(['apple', 'banana']);
    expect(inst.isOpen()).toBe(true);

    expect(changeEvt).toHaveBeenCalledTimes(2);
  });

  it('destroy() tears down a standalone multi-select instance cleanly', () => {
    const trigger = makeCellAffordance();
    triggers.push(trigger);
    const inst = ArvoOptionList.initialize(trigger, {
      items,
      isMultiple: true,
      ariaLabel: 'Region options',
    });
    inst.open();
    expect(document.querySelector('.arvo-opt-list')).toBeTruthy();
    inst.destroy();
    expect(document.querySelector('.arvo-opt-list')).toBeNull();
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
  });
});
