// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoAccordion } from './Accordion';
import type { ArvoAccordionItemData } from './Accordion';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const ITEMS: ArvoAccordionItemData[] = [
  { value: 'a', title: 'Section A', content: 'A body' },
  { value: 'b', title: 'Section B', content: 'B body' },
  { value: 'c', title: 'Section C', content: 'C body' },
];

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

describe('ArvoAccordion -- initialization', () => {
  it('static initialize() returns an instance', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    expect(inst).toBeInstanceOf(ArvoAccordion);
  });

  it('applies default class set: arvo-acc + variant=surface + size=lg + align=end', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    expect(el.classList.contains('arvo-acc')).toBe(true);
    expect(el.classList.contains('arvo-acc--surface')).toBe(true);
    expect(el.classList.contains('arvo-acc--lg')).toBe(true);
    expect(el.classList.contains('arvo-acc--align-end')).toBe(true);
  });

  it('applies variant=transparent', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS, variant: 'transparent' });
    expect(el.classList.contains('arvo-acc--transparent')).toBe(true);
  });

  it('applies size=sm and align=start', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS, size: 'sm', align: 'start' });
    expect(el.classList.contains('arvo-acc--sm')).toBe(true);
    expect(el.classList.contains('arvo-acc--align-start')).toBe(true);
  });

  it('renders one .arvo-acc-item per item in items[]', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    expect(el.querySelectorAll('.arvo-acc-item').length).toBe(3);
  });

  it('sets aria-label when ariaLabel is provided', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS, ariaLabel: 'Sections' });
    expect(el.getAttribute('aria-label')).toBe('Sections');
  });
});

// ---------------------------------------------------------------------------
// Trigger + panel ARIA wiring
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- ARIA wiring', () => {
  it('each trigger is a <button type="button"> with aria-expanded', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const trg = el.querySelector('.arvo-acc-item__trg') as HTMLButtonElement;
    expect(trg.tagName).toBe('BUTTON');
    expect(trg.getAttribute('type')).toBe('button');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel role=region linked to trigger via aria-controls / aria-labelledby', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const trg = el.querySelector('.arvo-acc-item__trg') as HTMLButtonElement;
    const panelId = trg.getAttribute('aria-controls')!;
    const panel = el.querySelector(`#${panelId}`) as HTMLElement;
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe(trg.id);
  });

  it('panel is aria-hidden + inert when collapsed (mount-and-animate)', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const panel = el.querySelector('.arvo-acc-item__panel') as HTMLElement;
    // Panel is always mounted so the grid-template-rows height transition
    // can run in both directions. Collapsed state is signalled via
    // `aria-hidden` + `inert` (NOT `[hidden]`).
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Expansion -- single mode
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- single mode expansion', () => {
  it('clicking a trigger expands the item', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    expect(trgs[0].getAttribute('aria-expanded')).toBe('true');
    const panel = el.querySelectorAll('.arvo-acc-item__panel')[0] as HTMLElement;
    expect(panel.hasAttribute('aria-hidden')).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(false);
  });

  it('expanding a new item collapses the previously expanded one', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS, defaultValue: 'a' });
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[1] as HTMLButtonElement).click();
    expect(trgs[0].getAttribute('aria-expanded')).toBe('false');
    expect(trgs[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('isCollapsible=false prevents collapsing the last expanded item', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: ITEMS,
      defaultValue: 'a',
      isCollapsible: false,
    });
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    expect(trgs[0].getAttribute('aria-expanded')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Expansion -- multiple mode
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- multiple mode expansion', () => {
  it('allows multiple items expanded at once', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS, expandMode: 'multiple' });
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    (trgs[1] as HTMLButtonElement).click();
    expect(trgs[0].getAttribute('aria-expanded')).toBe('true');
    expect(trgs[1].getAttribute('aria-expanded')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Cancellable events
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- cancellable events', () => {
  it('acc:expand can be cancelled via preventDefault()', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    el.addEventListener('acc:expand', (e) => e.preventDefault());
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    expect(trgs[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('acc:collapse can be cancelled via preventDefault()', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS, defaultValue: 'a' });
    el.addEventListener('acc:collapse', (e) => e.preventDefault());
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    expect(trgs[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('acc:change fires after expansion with itemValue + isExpanded', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const handler = vi.fn();
    el.addEventListener('acc:change', handler as EventListener);
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail as {
      itemValue: string;
      isExpanded: boolean;
    };
    expect(detail.itemValue).toBe('a');
    expect(detail.isExpanded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// onValueChange callback
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- onValueChange', () => {
  it('fires with scalar value in single mode', () => {
    const el = createElement();
    const handler = vi.fn();
    ArvoAccordion.initialize(el, { items: ITEMS, onValueChange: handler });
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith('a', {
      itemValue: 'a',
      isExpanded: true,
    });
  });

  it('fires with array value in multiple mode', () => {
    const el = createElement();
    const handler = vi.fn();
    ArvoAccordion.initialize(el, {
      items: ITEMS,
      expandMode: 'multiple',
      onValueChange: handler,
    });
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    (trgs[0] as HTMLButtonElement).click();
    (trgs[1] as HTMLButtonElement).click();
    expect(handler.mock.calls[1][0]).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// Public methods (dual-purpose getters/setters)
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- public API', () => {
  it('value() returns the current expanded value(s)', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, {
      items: ITEMS,
      defaultValue: 'b',
    });
    expect(inst.value()).toBe('b');
  });

  it('value(next) sets the expanded value(s) without firing events', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    const handler = vi.fn();
    el.addEventListener('acc:expand', handler as EventListener);
    inst.value('a');
    expect(inst.value()).toBe('a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('expand(value) fires acc:expand and acc:change', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    const expand = vi.fn();
    const change = vi.fn();
    el.addEventListener('acc:expand', expand as EventListener);
    el.addEventListener('acc:change', change as EventListener);
    inst.expand('a');
    expect(expand).toHaveBeenCalled();
    expect(change).toHaveBeenCalled();
  });

  it('collapse(value) fires acc:collapse and acc:change', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, {
      items: ITEMS,
      defaultValue: 'a',
    });
    const collapse = vi.fn();
    el.addEventListener('acc:collapse', collapse as EventListener);
    inst.collapse('a');
    expect(collapse).toHaveBeenCalled();
  });

  it('toggle(value) inverts the expanded state', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    inst.toggle('a');
    expect(inst.value()).toBe('a');
    inst.toggle('a');
    expect(inst.value()).toBe('');
  });

  it('disabled() / disabled(true) dual-purpose getter/setter', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    expect(inst.disabled()).toBe(false);
    inst.disabled(true);
    expect(inst.disabled()).toBe(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('setLoading(true) renders skeleton rows', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    inst.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.querySelectorAll('.arvo-acc__skel-row').length).toBeGreaterThan(0);
  });

  it('setItems replaces the items array and drops invalid expanded values', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, {
      items: ITEMS,
      defaultValue: 'b',
    });
    inst.setItems([{ value: 'x', title: 'X' }]);
    expect(el.querySelectorAll('.arvo-acc-item').length).toBe(1);
    expect(inst.value()).toBe('');
  });

  it('addItem inserts a new item at the given index', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    inst.addItem({ value: 'z', title: 'Z' }, 0);
    const trgs = el.querySelectorAll('.arvo-acc-item__trg');
    expect(trgs[0].textContent).toContain('Z');
  });

  it('removeItem(value) removes the item and clears its expanded state', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, {
      items: ITEMS,
      defaultValue: 'b',
    });
    inst.removeItem('b');
    expect(el.querySelectorAll('.arvo-acc-item').length).toBe(2);
    expect(inst.value()).toBe('');
  });

  it('destroy() clears the DOM and removes class hooks', () => {
    const el = createElement();
    const inst = ArvoAccordion.initialize(el, { items: ITEMS });
    inst.destroy();
    expect(el.classList.contains('arvo-acc')).toBe(false);
    expect(el.children.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- keyboard navigation', () => {
  it('ArrowDown moves focus to the next trigger', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const trgs = el.querySelectorAll<HTMLButtonElement>('.arvo-acc-item__trg');
    trgs[0].focus();
    trgs[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(document.activeElement).toBe(trgs[1]);
  });

  it('Home / End jump to first / last trigger', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, { items: ITEMS });
    const trgs = el.querySelectorAll<HTMLButtonElement>('.arvo-acc-item__trg');
    trgs[1].focus();
    trgs[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    expect(document.activeElement).toBe(trgs[2]);
    trgs[2].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    expect(document.activeElement).toBe(trgs[0]);
  });
});

// ---------------------------------------------------------------------------
// Slot rendering (presence-of-prop)
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- slot rendering', () => {
  it('renders status pip when items[].status is set', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: [
        { value: 'a', title: 'A', status: { type: 'positive', label: 'OK' } },
      ],
    });
    expect(el.querySelector('.arvo-acc-item__sts')).not.toBeNull();
  });

  it('renders inline action buttons', () => {
    const el = createElement();
    const onClick = vi.fn();
    ArvoAccordion.initialize(el, {
      items: [
        {
          value: 'a',
          title: 'A',
          actions: [{ id: 'a1', icon: 'edit', tooltip: 'Edit', onClick }],
        },
      ],
    });
    expect(el.querySelectorAll('.arvo-acc-item__act').length).toBe(1);
  });

  it('renders overflow menu when menuItems is non-empty', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: [
        { value: 'a', title: 'A', menuItems: [{ id: 'm1', label: 'One' }] },
      ],
    });
    expect(el.querySelector('.arvo-acc-item__menu')).not.toBeNull();
  });

  it('renders switch when switch config is provided', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: [{ value: 'a', title: 'A', switch: { isChecked: false } }],
    });
    expect(el.querySelector('.arvo-acc-item__switch')).not.toBeNull();
  });

  it('switch click does not toggle expansion', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: [{ value: 'a', title: 'A', switch: { isChecked: false } }],
    });
    const swWrap = el.querySelector('.arvo-acc-item__switch') as HTMLElement;
    const trg = el.querySelector('.arvo-acc-item__trg') as HTMLButtonElement;
    swWrap.click();
    expect(trg.getAttribute('aria-expanded')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// hasDivider / panelPadding
// ---------------------------------------------------------------------------

describe('ArvoAccordion -- hasDivider + panelPadding', () => {
  it('applies no-divider when hasDivider=false', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: [{ value: 'a', title: 'A', hasDivider: false }],
    });
    expect(
      el.querySelector('.arvo-acc-item')?.classList.contains('no-divider'),
    ).toBe(true);
  });

  it('applies arvo-acc-item--pad-{value} class', () => {
    const el = createElement();
    ArvoAccordion.initialize(el, {
      items: [{ value: 'a', title: 'A', panelPadding: 'lg' }],
    });
    expect(
      el
        .querySelector('.arvo-acc-item')
        ?.classList.contains('arvo-acc-item--pad-lg'),
    ).toBe(true);
  });
});
