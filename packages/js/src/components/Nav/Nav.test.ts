// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoNav } from './Nav';
import type { ArvoNavItemData } from './Nav';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const ITEMS: ArvoNavItemData[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/home' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart' },
  { id: 'archive', label: 'Archive', icon: 'archive', isDisabled: true },
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

describe('ArvoNav -- initialization', () => {
  it('static initialize() returns an ArvoNav instance', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    expect(inst).toBeInstanceOf(ArvoNav);
  });

  it('adds arvo-nav class to root element', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    expect(el.classList.contains('arvo-nav')).toBe(true);
  });

  it('applies size modifier class (md by default)', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    expect(el.classList.contains('arvo-nav--md')).toBe(true);
  });

  it('applies size=sm class', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, size: 'sm' });
    expect(el.classList.contains('arvo-nav--sm')).toBe(true);
  });

  it('applies size=lg class', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, size: 'lg' });
    expect(el.classList.contains('arvo-nav--lg')).toBe(true);
  });

  it('applies arvo-nav--actions-always when actionsVisibility=always', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, actionsVisibility: 'always' });
    expect(el.classList.contains('arvo-nav--actions-always')).toBe(true);
  });

  it('aria-label defaults to "Navigation"', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    expect(el.getAttribute('aria-label')).toBe('Navigation');
  });

  it('honors a custom ariaLabel', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, ariaLabel: 'Workspaces' });
    expect(el.getAttribute('aria-label')).toBe('Workspaces');
  });
});

// ---------------------------------------------------------------------------
// DOM structure
// ---------------------------------------------------------------------------

describe('ArvoNav -- DOM structure', () => {
  it('renders a <ul role="list"> for the list container', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const ul = el.querySelector('ul.arvo-nav__list');
    expect(ul).not.toBeNull();
    expect(ul?.getAttribute('role')).toBe('list');
  });

  it('renders one row per item', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    expect(el.querySelectorAll('.arvo-nav-item').length).toBe(3);
  });

  it('renders item labels', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const labels = Array.from(el.querySelectorAll<HTMLElement>('.arvo-nav-item__lbl')).map(
      (e) => e.textContent,
    );
    expect(labels).toEqual(['Home', 'Reports', 'Archive']);
  });

  it('renders the persistent sliding indicator and highlight inside the list', () => {
    // The indicator and highlight elements must survive `_render()` and be
    // present on first render -- they anchor the active-row chrome.
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const list = el.querySelector('.arvo-nav__list');
    expect(list?.querySelector(':scope > .arvo-nav__indicator')).not.toBeNull();
    expect(list?.querySelector(':scope > .arvo-nav__highlight')).not.toBeNull();
  });

  it('keeps the indicator and highlight after items rerender (setItems)', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    inst.setItems([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
    const list = el.querySelector('.arvo-nav__list');
    expect(list?.querySelector(':scope > .arvo-nav__indicator')).not.toBeNull();
    expect(list?.querySelector(':scope > .arvo-nav__highlight')).not.toBeNull();
  });

  it('keeps the indicator and highlight after selecting an item', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    inst.select('reports');
    const list = el.querySelector('.arvo-nav__list');
    expect(list?.querySelector(':scope > .arvo-nav__indicator')).not.toBeNull();
    expect(list?.querySelector(':scope > .arvo-nav__highlight')).not.toBeNull();
  });

  it('updates --arvo-nav-active-top / -h CSS variables when selection changes', () => {
    // Every path that flips the `.active` class -- row click, `select(id)`,
    // and the dual-purpose `selected(id)` setter -- must also re-run
    // `_updateIndicator()` so the sliding chrome tracks the newly active row.
    const el = createElement();
    const inst = ArvoNav.initialize(el, {
      items: ITEMS,
      defaultSelectedId: 'home',
    });
    const list = el.querySelector('.arvo-nav__list') as HTMLElement;
    // Stub out offset values so JSDOM (which leaves them at 0) yields the
    // expected per-row offsets.
    Object.defineProperties(
      el.querySelector('[data-nav-item-id="home"]') as HTMLElement,
      {
        offsetTop: { value: 0, configurable: true },
        offsetHeight: { value: 40, configurable: true },
      },
    );
    Object.defineProperties(
      el.querySelector('[data-nav-item-id="reports"]') as HTMLElement,
      {
        offsetTop: { value: 40, configurable: true },
        offsetHeight: { value: 40, configurable: true },
      },
    );

    inst.select('reports');
    expect(list.style.getPropertyValue('--arvo-nav-active-top')).toBe('40px');
    expect(list.style.getPropertyValue('--arvo-nav-active-h')).toBe('40px');

    inst.selected('home');
    expect(list.style.getPropertyValue('--arvo-nav-active-top')).toBe('0px');
    expect(list.style.getPropertyValue('--arvo-nav-active-h')).toBe('40px');

    inst.selected(null);
    // null selection collapses the chrome.
    expect(list.style.getPropertyValue('--arvo-nav-active-top')).toBe('0px');
    expect(list.style.getPropertyValue('--arvo-nav-active-h')).toBe('0px');
    expect(el.classList.contains('arvo-nav--no-active')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Polymorphic item rendering
// ---------------------------------------------------------------------------

describe('ArvoNav -- polymorphic item rendering', () => {
  it('renders an <a> when href is set', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const home = el.querySelector('[data-nav-item-id="home"]');
    expect(home?.tagName).toBe('A');
    expect(home?.getAttribute('href')).toBe('/home');
  });

  it('renders a <button type=button> when href is omitted', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const reports = el.querySelector('[data-nav-item-id="reports"]');
    expect(reports?.tagName).toBe('BUTTON');
    expect(reports?.getAttribute('type')).toBe('button');
  });

  it('sets aria-current="page" on selected anchor row', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, defaultSelectedId: 'home' });
    const home = el.querySelector('[data-nav-item-id="home"]');
    expect(home?.getAttribute('aria-current')).toBe('page');
  });

  it('sets aria-pressed="true" on selected button row', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, defaultSelectedId: 'reports' });
    const reports = el.querySelector('[data-nav-item-id="reports"]');
    expect(reports?.getAttribute('aria-pressed')).toBe('true');
  });

  it('strips href from anchor when item is disabled', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [{ id: 'a', label: 'A', href: '/a', isDisabled: true }],
    });
    const a = el.querySelector('[data-nav-item-id="a"]');
    expect(a?.tagName).toBe('A');
    expect(a?.hasAttribute('href')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe('ArvoNav -- selection', () => {
  it('starts with no selection by default', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    expect(el.querySelectorAll('.arvo-nav-item.active').length).toBe(0);
  });

  it('defaultSelectedId selects the matching row', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, defaultSelectedId: 'reports' });
    const reports = el.querySelector('[data-nav-item-id="reports"]');
    expect(reports?.classList.contains('active')).toBe(true);
  });

  it('clicking a row selects it and dispatches nav:select', () => {
    const el = createElement();
    const onSelect = vi.fn();
    const inst = ArvoNav.initialize(el, { items: ITEMS, onSelect });
    const fired: Array<unknown> = [];
    el.addEventListener('nav:select', (e: Event) => {
      fired.push((e as CustomEvent).detail);
    });
    const reports = el.querySelector('[data-nav-item-id="reports"]') as HTMLElement;
    reports.click();
    expect(reports.classList.contains('active')).toBe(true);
    expect(onSelect).toHaveBeenCalled();
    expect(fired[0]).toEqual({ id: 'reports', index: 1 });
    expect(inst.selected()).toBe('reports');
  });

  it('clicking a disabled row does NOT select it or fire onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoNav.initialize(el, { items: ITEMS, onSelect });
    const archive = el.querySelector('[data-nav-item-id="archive"]') as HTMLElement;
    archive.click();
    expect(onSelect).not.toHaveBeenCalled();
    expect(archive.classList.contains('active')).toBe(false);
  });

  it('select(id) programmatically activates and fires nav:select', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    const fired: Array<unknown> = [];
    el.addEventListener('nav:select', (e: Event) =>
      fired.push((e as CustomEvent).detail),
    );
    inst.select('reports');
    expect(inst.selected()).toBe('reports');
    expect(fired[0]).toEqual({ id: 'reports', index: 1 });
  });

  it('selected(id) setter does NOT emit nav:select', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    const fired = vi.fn();
    el.addEventListener('nav:select', fired);
    inst.selected('reports');
    expect(inst.selected()).toBe('reports');
    expect(fired).not.toHaveBeenCalled();
  });

  it('selected(null) clears the selection', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, {
      items: ITEMS,
      defaultSelectedId: 'reports',
    });
    inst.selected(null);
    expect(inst.selected()).toBeNull();
    expect(el.querySelectorAll('.arvo-nav-item.active').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('ArvoNav -- keyboard', () => {
  it('roving tabindex: only one row is the tab stop', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, defaultSelectedId: 'reports' });
    const rows = el.querySelectorAll<HTMLElement>('.arvo-nav-item');
    const tabStops = Array.from(rows).filter((r) => r.tabIndex === 0);
    expect(tabStops).toHaveLength(1);
    expect(tabStops[0].getAttribute('data-nav-item-id')).toBe('reports');
  });

  it('falls back to first enabled item when nothing is selected', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const tabStop = el.querySelector<HTMLElement>('[tabindex="0"]');
    expect(tabStop?.getAttribute('data-nav-item-id')).toBe('home');
  });

  it('ArrowDown moves focus to the next enabled row', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const home = el.querySelector('[data-nav-item-id="home"]') as HTMLElement;
    home.focus();
    home.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(
      (document.activeElement as HTMLElement | null)?.getAttribute('data-nav-item-id'),
    ).toBe('reports');
  });

  it('Enter activates the focused row and emits nav:select', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const fired: Array<unknown> = [];
    el.addEventListener('nav:select', (e: Event) =>
      fired.push((e as CustomEvent).detail),
    );
    const reports = el.querySelector('[data-nav-item-id="reports"]') as HTMLElement;
    reports.focus();
    reports.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(fired[0]).toEqual({ id: 'reports', index: 1 });
  });

  it('Space activates a button row but not an anchor row', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS });
    const fired: Array<unknown> = [];
    el.addEventListener('nav:select', (e: Event) =>
      fired.push((e as CustomEvent).detail),
    );
    // Anchor row first (home): space is ignored.
    const home = el.querySelector('[data-nav-item-id="home"]') as HTMLElement;
    home.focus();
    home.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    expect(fired.length).toBe(0);
    // Button row (reports): space activates.
    const reports = el.querySelector('[data-nav-item-id="reports"]') as HTMLElement;
    reports.focus();
    reports.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    expect(fired[0]).toEqual({ id: 'reports', index: 1 });
  });
});

// ---------------------------------------------------------------------------
// Pinning
// ---------------------------------------------------------------------------

describe('ArvoNav -- pinning', () => {
  const PIN_ITEMS: ArvoNavItemData[] = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta', isPinned: true },
    { id: 'c', label: 'Charlie' },
  ];

  it('pinned items render at the top of the list', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: PIN_ITEMS });
    const labels = Array.from(
      el.querySelectorAll<HTMLElement>('.arvo-nav-item__lbl'),
    ).map((e) => e.textContent);
    expect(labels[0]).toBe('Beta');
    expect(labels[1]).toBe('Alpha');
    expect(labels[2]).toBe('Charlie');
  });

  it('hasPinning auto-renders a pin ToggleButton in __pin on each pinnable row', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: PIN_ITEMS, hasPinning: true });
    const pinSlots = el.querySelectorAll('.arvo-nav-item__pin');
    expect(pinSlots.length).toBe(PIN_ITEMS.length);
    for (const slot of Array.from(pinSlots)) {
      expect(slot.querySelector('.arvo-toggle-btn')).not.toBeNull();
    }
  });

  it('isPinnable=false suppresses the auto pin ToggleButton on a row', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [{ id: 'sys', label: 'System', isPinnable: false }],
      hasPinning: true,
    });
    expect(el.querySelectorAll('.arvo-nav-item__pin').length).toBe(0);
  });

  it('toggling pin preserves DOM nodes of unaffected rows (diff rebuild)', () => {
    // The pin affordance is an ArvoToggleButton that animates its icon when
    // `.active` is added, so a full rebuild on every pin toggle would make
    // EVERY pin button on the nav "animate in". The diff-based rebuild
    // preserves DOM node identity for surviving rows so only the affected
    // row's pin animates.
    const el = createElement();
    const items: ArvoNavItemData[] = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Charlie' },
    ];
    ArvoNav.initialize(el, { items, hasPinning: true });

    const refsBefore = new Map<string, Element>();
    for (const row of el.querySelectorAll('.arvo-nav-item')) {
      refsBefore.set(row.getAttribute('data-nav-item-id')!, row);
    }
    const pinABefore = el.querySelector(
      '.arvo-nav-item[data-nav-item-id="a"] .arvo-nav-item__pin .arvo-toggle-btn',
    );
    const pinBBefore = el.querySelector(
      '.arvo-nav-item[data-nav-item-id="b"] .arvo-nav-item__pin .arvo-toggle-btn',
    );

    // Pin Beta. Only Beta's pin should flip to `.active`.
    (pinBBefore as HTMLElement)?.click();

    // Every surviving row keeps the same DOM node (move, not recreate).
    for (const [id, prevEl] of refsBefore) {
      const currentEl = el.querySelector(
        `.arvo-nav-item[data-nav-item-id="${id}"]`,
      );
      expect(currentEl).toBe(prevEl);
    }
    expect(
      el.querySelector(
        '.arvo-nav-item[data-nav-item-id="a"] .arvo-nav-item__pin .arvo-toggle-btn',
      ),
    ).toBe(pinABefore);
    expect(
      el.querySelector(
        '.arvo-nav-item[data-nav-item-id="b"] .arvo-nav-item__pin .arvo-toggle-btn',
      ),
    ).toBe(pinBBefore);
    expect(pinBBefore?.classList.contains('active')).toBe(true);
    expect(pinABefore?.classList.contains('active')).toBe(false);
  });

  it('pin(id, true) toggles, rerenders, and emits nav:pin-change', () => {
    const el = createElement();
    const onPinChange = vi.fn();
    const inst = ArvoNav.initialize(el, {
      items: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
      onPinChange,
    });
    const fired: Array<unknown> = [];
    el.addEventListener('nav:pin-change', (e: Event) =>
      fired.push((e as CustomEvent).detail),
    );
    inst.pin('b', true);
    expect(inst.pin('b')).toBe(true);
    // Beta moved to the top.
    const labels = Array.from(
      el.querySelectorAll<HTMLElement>('.arvo-nav-item__lbl'),
    ).map((e) => e.textContent);
    expect(labels[0]).toBe('Beta');
    expect(onPinChange).toHaveBeenCalledWith({
      id: 'b',
      pinned: true,
      itemOrder: ['b', 'a'],
    });
    expect(fired[0]).toEqual({
      id: 'b',
      pinned: true,
      itemOrder: ['b', 'a'],
    });
  });
});

// ---------------------------------------------------------------------------
// Action cap (3 inline + 1 overflow)
// ---------------------------------------------------------------------------

describe('ArvoNav -- action cap', () => {
  it('renders up to 3 inline actions when fewer than 4 are provided', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [
        {
          id: 'a',
          label: 'Alpha',
          actions: [
            { id: 'edit', icon: 'pencil', tooltip: 'Edit' },
            { id: 'share', icon: 'share', tooltip: 'Share' },
          ],
        },
      ],
    });
    expect(el.querySelectorAll('.arvo-nav-item__act').length).toBe(2);
    expect(el.querySelector('.arvo-nav-item__overflow')).toBeNull();
  });

  it('promotes the 4th and beyond actions into the overflow menu', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [
        {
          id: 'a',
          label: 'Alpha',
          actions: [
            { id: 'a1', icon: 'pencil', tooltip: 'Edit' },
            { id: 'a2', icon: 'share', tooltip: 'Share' },
            { id: 'a3', icon: 'copy', tooltip: 'Duplicate' },
            { id: 'a4', icon: 'bin', tooltip: 'Delete' },
            { id: 'a5', icon: 'archive', tooltip: 'Archive' },
          ],
        },
      ],
    });
    expect(el.querySelectorAll('.arvo-nav-item__act').length).toBe(3);
    expect(el.querySelector('.arvo-nav-item__overflow')).not.toBeNull();
  });

  it('provided menuItems alone render the overflow trigger', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [
        {
          id: 'a',
          label: 'Alpha',
          menuItems: [{ id: 'm1', label: 'Open in new tab' }],
        },
      ],
    });
    expect(el.querySelector('.arvo-nav-item__overflow')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Indicators (status / badge / avatar)
// ---------------------------------------------------------------------------

describe('ArvoNav -- indicators', () => {
  it('renders the inline status dot when status is set', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [
        {
          id: 'a',
          label: 'Alpha',
          status: { type: 'available', label: 'Online' },
        },
      ],
    });
    expect(el.querySelector('.arvo-nav-item__sts')).not.toBeNull();
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
  });

  it('renders the badge when badge is set', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [{ id: 'a', label: 'Alpha', badge: { message: 'NEW' } }],
    });
    expect(el.querySelector('.arvo-nav-item__bdg')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg')).not.toBeNull();
  });

  it('suppresses the badge on disabled rows', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [
        { id: 'a', label: 'Alpha', badge: { message: 'NEW' }, isDisabled: true },
      ],
    });
    expect(el.querySelector('.arvo-nav-item__bdg')).toBeNull();
  });

  it('renders the avatar when avatar is set', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [
        {
          id: 'a',
          label: 'Alpha',
          avatar: { variant: 'initials', name: 'Demand Plan' },
        },
      ],
    });
    expect(el.querySelector('.arvo-nav-item__avt')).not.toBeNull();
    expect(el.querySelector('.arvo-avt')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

describe('ArvoNav -- public API', () => {
  it('disabled() is a dual-purpose getter/setter', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    expect(inst.disabled()).toBe(false);
    inst.disabled(true);
    expect(inst.disabled()).toBe(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('setItems replaces the items array', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    inst.setItems([{ id: 'x', label: 'X' }]);
    expect(el.querySelectorAll('.arvo-nav-item').length).toBe(1);
    expect(el.querySelector('.arvo-nav-item__lbl')?.textContent).toBe('X');
  });

  it('addItem appends to the end by default', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, {
      items: [{ id: 'a', label: 'A' }],
    });
    inst.addItem({ id: 'b', label: 'B' });
    const labels = Array.from(
      el.querySelectorAll<HTMLElement>('.arvo-nav-item__lbl'),
    ).map((e) => e.textContent);
    expect(labels).toEqual(['A', 'B']);
  });

  it('addItem inserts at the given index', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, {
      items: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    });
    inst.addItem({ id: 'c', label: 'C' }, 1);
    const labels = Array.from(
      el.querySelectorAll<HTMLElement>('.arvo-nav-item__lbl'),
    ).map((e) => e.textContent);
    expect(labels).toEqual(['A', 'C', 'B']);
  });

  it('removeItem removes the row by id', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    inst.removeItem('reports');
    expect(el.querySelector('[data-nav-item-id="reports"]')).toBeNull();
  });

  it('removeItem clears selection when the removed row was selected', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, {
      items: ITEMS,
      defaultSelectedId: 'reports',
    });
    inst.removeItem('reports');
    expect(inst.selected()).toBeNull();
  });

  it('destroy() removes classes and clears the DOM', () => {
    const el = createElement();
    const inst = ArvoNav.initialize(el, { items: ITEMS });
    inst.destroy();
    expect(el.classList.contains('arvo-nav')).toBe(false);
    expect(el.querySelector('.arvo-nav-item')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

describe('ArvoNav -- loading', () => {
  it('whole-nav isLoading adds .loading and aria-busy', () => {
    const el = createElement();
    ArvoNav.initialize(el, { items: ITEMS, isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('per-item isLoading replaces row content with the skeleton bar', () => {
    const el = createElement();
    ArvoNav.initialize(el, {
      items: [{ id: 'a', label: 'Alpha', isLoading: true }],
    });
    expect(el.querySelector('.arvo-nav-item__skel')).not.toBeNull();
    expect(el.querySelector('.arvo-nav-item__lft')).toBeNull();
  });
});
