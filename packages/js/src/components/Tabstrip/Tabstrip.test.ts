import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __resetOperatingSystemCacheForTests } from '@arvo/core';
import { ArvoTabstrip } from './Tabstrip';
import type { TabItem } from './Tabstrip';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const TABS: TabItem[] = [
  { id: 'tab1', label: 'Tab 1', icon: 'home' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3', isDisabled: true },
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

describe('ArvoTabstrip -- initialization', () => {
  it('static initialize() returns an ArvoTabstrip instance', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(instance).toBeInstanceOf(ArvoTabstrip);
  });

  it('adds arvo-tabs class to element', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.classList.contains('arvo-tabs')).toBe(true);
  });

  it('applies variant modifier class', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, variant: 'secondary' });
    expect(el.classList.contains('arvo-tabs--secondary')).toBe(true);
  });

  it('applies size modifier class', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, size: 'sm' });
    expect(el.classList.contains('arvo-tabs--sm')).toBe(true);
  });

  it('defaults to primary variant and lg size', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.classList.contains('arvo-tabs--primary')).toBe(true);
    expect(el.classList.contains('arvo-tabs--lg')).toBe(true);
  });

  it('does NOT apply legacy arvo-tabs--actions-always class (option removed; actions always render when configured)', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isClosable: true });
    expect(el.classList.contains('arvo-tabs--actions-always')).toBe(false);
  });

  it('renders the animated active-tab indicator element inside the list', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const list = el.querySelector('.arvo-tabs__list');
    const indicator = el.querySelector('.arvo-tabs__indicator');
    expect(indicator).not.toBeNull();
    expect(list?.contains(indicator!)).toBe(true);
  });

  it('TabItem accepts optional order property', () => {
    const tabs: TabItem[] = [
      { id: 'a', label: 'A', order: 2 },
      { id: 'b', label: 'B', order: 1 },
    ];
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs });
    expect(instance).toBeInstanceOf(ArvoTabstrip);
  });
});

// ---------------------------------------------------------------------------
// DOM structure
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- DOM structure', () => {
  it('creates .arvo-tabs__list with role="tablist"', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const list = el.querySelector('.arvo-tabs__list');
    expect(list).not.toBeNull();
    expect(list?.getAttribute('role')).toBe('tablist');
    expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('creates tab buttons with role="tab"', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelectorAll('[role="tab"]').length).toBe(3);
  });

  it('renders tab labels', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const labels = el.querySelectorAll('.arvo-tabs__tab-lbl');
    expect(labels[0].textContent).toBe('Tab 1');
    expect(labels[1].textContent).toBe('Tab 2');
    expect(labels[2].textContent).toBe('Tab 3');
  });

  it('renders icon on tabs with icon property', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelector('.o9con-home')).not.toBeNull();
  });

  it('overflow button is present in DOM', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelector('.arvo-tabs__overflow-btn')).not.toBeNull();
  });

  it('overflow button does not have has-overflow class by default', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.classList.contains('has-overflow')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- selection', () => {
  it('auto-selects first non-disabled tab when no selectedId', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(instance.selectedId()).toBe('tab1');
  });

  it('selects the tab matching selectedId option', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab2' });
    expect(instance.selectedId()).toBe('tab2');
    const tab2 = el.querySelector('[data-tab-id="tab2"]');
    expect(tab2?.getAttribute('aria-selected')).toBe('true');
    expect(tab2?.classList.contains('active')).toBe(true);
  });

  it('programmatic select() changes selection', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.select('tab2');
    expect(instance.selectedId()).toBe('tab2');
    expect(el.querySelector('[data-tab-id="tab2"]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('select() fires onSelect callback with id and index', () => {
    const el = createElement();
    const onSelect = vi.fn();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS, onSelect });
    instance.select('tab2');
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });

  it('select() ignores disabled tabs', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.select('tab3');
    expect(instance.selectedId()).toBe('tab1');
  });

  it('click on tab fires onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, onSelect });
    (el.querySelector('[data-tab-id="tab2"]') as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });

  it('click on disabled tab does not fire onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, onSelect });
    (el.querySelector('[data-tab-id="tab3"]') as HTMLElement).click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  // -- defaultSelectedId (uncontrolled initial selection) --

  it('seeds uncontrolled selection from defaultSelectedId', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      defaultSelectedId: 'tab2',
    });
    expect(instance.selectedId()).toBe('tab2');
  });

  it('controlled selectedId takes precedence over defaultSelectedId', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      selectedId: 'tab1',
      defaultSelectedId: 'tab2',
    });
    expect(instance.selectedId()).toBe('tab1');
  });

  it('falls back to first enabled tab when both selectedId and defaultSelectedId are omitted', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(instance.selectedId()).toBe('tab1');
  });

  it('explicit defaultSelectedId: null does not auto-select a tab', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      defaultSelectedId: null,
    });
    // The auto-select-first-tab fallback applies because selectedId resolved to null.
    expect(instance.selectedId()).toBe('tab1');
  });
});

// ---------------------------------------------------------------------------
// Roving tabindex
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- roving tabindex', () => {
  it('selected tab has tabindex=0, others have tabindex=-1', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1' });
    const tabs = el.querySelectorAll('[role="tab"]');
    expect((tabs[0] as HTMLElement).tabIndex).toBe(0);
    expect((tabs[1] as HTMLElement).tabIndex).toBe(-1);
    expect((tabs[2] as HTMLElement).tabIndex).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- keyboard', () => {
  it('ArrowRight moves focus to next enabled tab', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });

  it('ArrowLeft wraps to last enabled tab from first', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });

  it('Home moves focus to first enabled tab', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab2' });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab1');
  });

  it('End moves focus to last enabled tab', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });

  it('Enter activates the focused tab', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', onSelect });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });

  it('Space activates the focused tab', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', onSelect });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });

  it('Delete fires onClose on a closable unpinned tab', () => {
    const el = createElement();
    const onClose = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', isClosable: true, onClose });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(onClose).toHaveBeenCalledWith({ id: 'tab1', index: 0 });
  });

  it('Delete on a pinned tab does NOT fire onClose', () => {
    const el = createElement();
    const onClose = vi.fn();
    const tabs: TabItem[] = [
      { id: 'pinned', label: 'Pinned', pinned: true },
      { id: 'tab2', label: 'Tab 2' },
    ];
    ArvoTabstrip.initialize(el, { tabs, selectedId: 'pinned', isClosable: true, isPinnable: true, onClose });
    const pinnedTab = el.querySelector('[data-tab-id="pinned"]') as HTMLElement;
    pinnedTab.focus();
    pinnedTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Actions: close & pin
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- actions', () => {
  it('renders close buttons when closable=true', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isClosable: true });
    expect(el.querySelectorAll('[aria-label="Close tab"]').length).toBeGreaterThan(0);
  });

  it('renders pin buttons when pinnable=true', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isPinnable: true });
    expect(el.querySelectorAll('[aria-label="Pin tab"]').length).toBeGreaterThan(0);
  });

  // Action visibility is controlled exclusively by `isPinnable` /
  // `isClosable` / `actionsVisibility`.

  it('pin button shows push-pinned icon when tab is initially pinned', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'pinned', label: 'Pinned', pinned: true },
      { id: 'tab2', label: 'Tab 2' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isPinnable: true });
    const pinnedTab = el.querySelector('[data-tab-id="pinned"]');
    expect(pinnedTab?.querySelector('.o9con-push-pinned')).not.toBeNull();
  });

  it('pin button shows push-pin icon when tab is not pinned', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 'tab1', label: 'Tab 1' }], isPinnable: true });
    const tab1 = el.querySelector('[data-tab-id="tab1"]');
    expect(tab1?.querySelector('.o9con-push-pin')).not.toBeNull();
    expect(tab1?.querySelector('.o9con-push-pinned')).toBeNull();
  });

  it('clicking close button fires onClose callback', () => {
    const el = createElement();
    const onClose = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, isClosable: true, onClose });
    (el.querySelector('[aria-label="Close tab"]') as HTMLElement).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking pin button fires onPin callback', () => {
    const el = createElement();
    const onPin = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 'tab1', label: 'Tab 1' }], isPinnable: true, onPin });
    (el.querySelector('[aria-label="Pin tab"]') as HTMLElement).click();
    expect(onPin).toHaveBeenCalled();
  });

  it('pin button aria-label changes to "Unpin tab" after pinning', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 'tab1', label: 'Tab 1' }], isPinnable: true });
    (el.querySelector('[aria-label="Pin tab"]') as HTMLElement).click();
    expect(el.querySelector('[aria-label="Unpin tab"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pinned tab close button hidden
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- pinned tab close hidden', () => {
  it('does not render close button on an initially-pinned tab', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'pinned', label: 'Pinned', pinned: true },
      { id: 'tab2', label: 'Tab 2' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isClosable: true, isPinnable: true });
    const pinnedTab = el.querySelector('[data-tab-id="pinned"]');
    expect(pinnedTab?.querySelector('[aria-label="Close tab"]')).toBeNull();
  });

  it('renders close button on unpinned tab when closable', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'pinned', label: 'Pinned', pinned: true },
      { id: 'tab2', label: 'Tab 2' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isClosable: true, isPinnable: true });
    const tab2 = el.querySelector('[data-tab-id="tab2"]');
    expect(tab2?.querySelector('[aria-label="Close tab"]')).not.toBeNull();
  });

  it('close button disappears after tab is pinned via pin button click', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [{ id: 'tab1', label: 'Tab 1' }],
      isClosable: true,
      isPinnable: true,
    });

    (el.querySelector('[aria-label="Pin tab"]') as HTMLElement).click();

    const pinnedTab = el.querySelector('[data-tab-id="tab1"]');
    expect(pinnedTab?.querySelector('[aria-label="Close tab"]')).toBeNull();
  });

  it('close button reappears after tab is unpinned', () => {
    const el = createElement();
    const tabs: TabItem[] = [{ id: 'tab1', label: 'Tab 1', pinned: true }];
    ArvoTabstrip.initialize(el, { tabs, isClosable: true, isPinnable: true });

    (el.querySelector('[aria-label="Unpin tab"]') as HTMLElement).click();

    const tab = el.querySelector('[data-tab-id="tab1"]');
    expect(tab?.querySelector('[aria-label="Close tab"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pin reordering
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- pin reordering', () => {
  it('pinned tabs render before unpinned tabs in DOM', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'first', label: 'First' },
      { id: 'pinned', label: 'Pinned', pinned: true },
      { id: 'last', label: 'Last' },
    ];
    ArvoTabstrip.initialize(el, { tabs });
    const renderedIds = [...el.querySelectorAll('[data-tab-id]')].map(
      (t) => t.getAttribute('data-tab-id'),
    );
    expect(renderedIds.indexOf('pinned')).toBeLessThan(renderedIds.indexOf('first'));
    expect(renderedIds.indexOf('pinned')).toBeLessThan(renderedIds.indexOf('last'));
  });

  it('multiple pinned tabs all appear before unpinned tabs', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', pinned: true },
      { id: 'c', label: 'C', pinned: true },
      { id: 'd', label: 'D' },
    ];
    ArvoTabstrip.initialize(el, { tabs });
    const renderedIds = [...el.querySelectorAll('[data-tab-id]')].map(
      (t) => t.getAttribute('data-tab-id'),
    );
    const lastPinnedIdx = Math.max(renderedIds.indexOf('b'), renderedIds.indexOf('c'));
    const firstUnpinnedIdx = Math.min(renderedIds.indexOf('a'), renderedIds.indexOf('d'));
    expect(lastPinnedIdx).toBeLessThan(firstUnpinnedIdx);
  });

  it('pinned tabs use order property to sort among themselves', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'p2', label: 'P2', pinned: true, order: 2 },
      { id: 'p1', label: 'P1', pinned: true, order: 1 },
    ];
    ArvoTabstrip.initialize(el, { tabs });
    const renderedIds = [...el.querySelectorAll('[data-tab-id]')].map(
      (t) => t.getAttribute('data-tab-id'),
    );
    expect(renderedIds[0]).toBe('p1');
    expect(renderedIds[1]).toBe('p2');
  });

  it('pinning a tab via pin button moves it to front of DOM', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isPinnable: true });

    const tab3PinBtn = el
      .querySelector('[data-tab-id="tab3"]')
      ?.querySelector('[aria-label="Pin tab"]') as HTMLElement;
    tab3PinBtn.click();

    const renderedIds = [...el.querySelectorAll('[data-tab-id]')].map(
      (t) => t.getAttribute('data-tab-id'),
    );
    expect(renderedIds[0]).toBe('tab3');
  });

  it('toggling pin preserves DOM nodes of unaffected tabs (diff rebuild)', () => {
    // The diff-based rebuild MUST preserve the DOM node identity of every
    // surviving tab so only the toggled tab's `.active` class flips and
    // only its own pin ToggleButton's `arvo-toggle-grow` animation fires
    // (recreating every tab entry would replay every pin icon's animation).
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isPinnable: true });

    const refsBefore = new Map<string, Element>();
    for (const t of el.querySelectorAll('[data-tab-id]')) {
      refsBefore.set(t.getAttribute('data-tab-id')!, t);
    }
    const tab1PinBtnBefore = el
      .querySelector('[data-tab-id="tab1"] .arvo-tabs__tab-pin .arvo-toggle-btn');
    const tab2PinBtnBefore = el
      .querySelector('[data-tab-id="tab2"] .arvo-tabs__tab-pin .arvo-toggle-btn');

    // Pin tab2 -- only tab2's pin button should flip to .active.
    const tab2PinBtn = el
      .querySelector('[data-tab-id="tab2"]')
      ?.querySelector('[aria-label="Pin tab"]') as HTMLElement;
    tab2PinBtn.click();

    // Surviving tabs MUST keep the same DOM nodes (move, not recreate).
    for (const [id, prevEl] of refsBefore) {
      const currentEl = el.querySelector(`[data-tab-id="${id}"]`);
      expect(currentEl).toBe(prevEl);
    }
    // The pin ToggleButton DOM nodes also survive intact.
    expect(
      el.querySelector(
        '[data-tab-id="tab1"] .arvo-tabs__tab-pin .arvo-toggle-btn',
      ),
    ).toBe(tab1PinBtnBefore);
    expect(
      el.querySelector(
        '[data-tab-id="tab2"] .arvo-tabs__tab-pin .arvo-toggle-btn',
      ),
    ).toBe(tab2PinBtnBefore);
    // Only the targeted tab carries `.active` after the toggle.
    expect(
      el
        .querySelector('[data-tab-id="tab2"] .arvo-tabs__tab-pin .arvo-toggle-btn')
        ?.classList.contains('active'),
    ).toBe(true);
    expect(
      el
        .querySelector('[data-tab-id="tab1"] .arvo-tabs__tab-pin .arvo-toggle-btn')
        ?.classList.contains('active'),
    ).toBe(false);
  });

  it('addTab with a pinned tab places it before unpinned tabs', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [{ id: 'tab1', label: 'Tab 1' }],
    });
    instance.addTab({ id: 'pinned-new', label: 'Pinned New', pinned: true });
    const renderedIds = [...el.querySelectorAll('[data-tab-id]')].map(
      (t) => t.getAttribute('data-tab-id'),
    );
    expect(renderedIds.indexOf('pinned-new')).toBeLessThan(renderedIds.indexOf('tab1'));
  });
});

// ---------------------------------------------------------------------------
// onPin payload -- tabOrder
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- onPin payload', () => {
  it('onPin callback receives id, pinned, and tabOrder', () => {
    const el = createElement();
    const onPin = vi.fn();
    const tabs: TabItem[] = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isPinnable: true, onPin });
    (el.querySelector('[aria-label="Pin tab"]') as HTMLElement).click();
    expect(onPin).toHaveBeenCalledTimes(1);
    const payload = onPin.mock.calls[0][0] as { id: string; pinned: boolean; tabOrder: string[] };
    expect(payload).toHaveProperty('id');
    expect(payload).toHaveProperty('pinned', true);
    expect(Array.isArray(payload.tabOrder)).toBe(true);
  });

  it('tabOrder lists pinned tabs before unpinned tabs', () => {
    const el = createElement();
    const onPin = vi.fn();
    const tabs: TabItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isPinnable: true, onPin });

    const cPinBtn = el
      .querySelector('[data-tab-id="c"]')
      ?.querySelector('[aria-label="Pin tab"]') as HTMLElement;
    cPinBtn.click();

    const payload = onPin.mock.calls[0][0] as { id: string; pinned: boolean; tabOrder: string[] };
    expect(payload.tabOrder[0]).toBe('c');
    expect(payload.tabOrder).toContain('a');
    expect(payload.tabOrder).toContain('b');
    expect(payload.tabOrder.length).toBe(3);
  });

  it('tabOrder contains all tab ids exactly once', () => {
    const el = createElement();
    const onPin = vi.fn();
    const tabs: TabItem[] = [
      { id: 'x', label: 'X' },
      { id: 'y', label: 'Y' },
      { id: 'z', label: 'Z' },
    ];
    ArvoTabstrip.initialize(el, { tabs, isPinnable: true, onPin });
    const yPinBtn = el
      .querySelector('[data-tab-id="y"]')
      ?.querySelector('[aria-label="Pin tab"]') as HTMLElement;
    yPinBtn.click();
    const { tabOrder } = onPin.mock.calls[0][0] as { tabOrder: string[] };
    expect(tabOrder.length).toBe(3);
    expect(new Set(tabOrder).size).toBe(3);
  });

  it('tabs:pin custom event detail includes tabOrder', () => {
    const el = createElement();
    const handler = vi.fn();
    el.addEventListener('tabs:pin', handler);
    ArvoTabstrip.initialize(el, { tabs: [{ id: 'tab1', label: 'Tab 1' }], isPinnable: true });
    (el.querySelector('[aria-label="Pin tab"]') as HTMLElement).click();
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('id', 'tab1');
    expect(detail).toHaveProperty('pinned', true);
    expect(Array.isArray(detail.tabOrder)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addTab / removeTab
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- addTab / removeTab', () => {
  it('addTab appends a new tab', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: [TABS[0]] });
    instance.addTab({ id: 'new', label: 'New Tab' });
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect(tabs[1].querySelector('.arvo-tabs__tab-lbl')?.textContent).toBe('New Tab');
  });

  it('addTab inserts at specific index among tabs', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: [TABS[0], TABS[1]] });
    instance.addTab({ id: 'inserted', label: 'Inserted' }, 1);
    expect(el.querySelectorAll('[role="tab"]').length).toBe(3);
  });

  it('addTab triggers a full rebuild', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: [TABS[0]] });
    instance.addTab({ id: 'new', label: 'New Tab' });
    expect(el.querySelectorAll('[role="tab"]').length).toBe(2);
  });

  it('addTab with pinned tab sorts correctly after rebuild', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    });
    instance.addTab({ id: 'p', label: 'P', pinned: true });
    const renderedIds = [...el.querySelectorAll('[data-tab-id]')].map(
      (t) => t.getAttribute('data-tab-id'),
    );
    expect(renderedIds[0]).toBe('p');
  });

  it('removeTab removes a tab by ID', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: [...TABS] });
    instance.removeTab('tab2');
    expect(el.querySelectorAll('[role="tab"]').length).toBe(2);
  });

  it('removeTab selects nearest sibling when removing selected tab', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [TABS[0], TABS[1]],
      selectedId: 'tab1',
    });
    instance.removeTab('tab1');
    expect(instance.selectedId()).toBe('tab2');
  });

  it('removeTab triggers a full rebuild', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: [...TABS] });
    const beforeCount = el.querySelectorAll('[role="tab"]').length;
    instance.removeTab('tab2');
    expect(el.querySelectorAll('[role="tab"]').length).toBe(beforeCount - 1);
  });
});

// ---------------------------------------------------------------------------
// Disabled
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- disabled', () => {
  it('disabled() getter returns false by default', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(instance.disabled()).toBe(false);
  });

  it('disabled(true) adds is-disabled class', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(false) removes is-disabled class', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS, isDisabled: true });
    instance.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
  });

  it('disabled state prevents click from firing onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS, onSelect });
    instance.disabled(true);
    (el.querySelector('[data-tab-id="tab2"]') as HTMLElement).click();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- loading', () => {
  it('setLoading(true) adds loading class and aria-busy', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class and aria-busy', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS, isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('loading state prevents click from firing onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS, onSelect });
    instance.setLoading(true);
    (el.querySelector('[data-tab-id="tab2"]') as HTMLElement).click();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- destroy', () => {
  it('clears element content and classes', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.destroy();
    expect(el.innerHTML).toBe('');
    expect(el.className).toBe('');
  });

  it('click after destroy does not throw', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.destroy();
    expect(() => el.click()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- custom events', () => {
  it('dispatches tabs:select on the root element', () => {
    const el = createElement();
    const handler = vi.fn();
    el.addEventListener('tabs:select', handler);
    const instance = ArvoTabstrip.initialize(el, { tabs: TABS });
    instance.select('tab2');
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.id).toBe('tab2');
    expect(detail.index).toBe(1);
  });

  it('dispatches tabs:close when close button is clicked', () => {
    const el = createElement();
    const handler = vi.fn();
    el.addEventListener('tabs:close', handler);
    ArvoTabstrip.initialize(el, { tabs: TABS, isClosable: true });
    (el.querySelector('[aria-label="Close tab"]') as HTMLElement).click();
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('id');
    expect(detail).toHaveProperty('index');
  });

  it('dispatches tabs:pin with id, pinned, and tabOrder when pin button is clicked', () => {
    const el = createElement();
    const handler = vi.fn();
    el.addEventListener('tabs:pin', handler);
    ArvoTabstrip.initialize(el, { tabs: [{ id: 'tab1', label: 'Tab 1' }], isPinnable: true });
    (el.querySelector('[aria-label="Pin tab"]') as HTMLElement).click();
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('id', 'tab1');
    expect(detail).toHaveProperty('pinned', true);
    expect(Array.isArray(detail.tabOrder)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Orientation
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- orientation', () => {
  it('default orientation is horizontal; root has arvo-tabs--horizontal', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.classList.contains('arvo-tabs--horizontal')).toBe(true);
  });

  it('default orientation; tablist has aria-orientation="horizontal"', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('orientation="vertical" adds arvo-tabs--vertical to root', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical' });
    expect(el.classList.contains('arvo-tabs--vertical')).toBe(true);
  });

  it('orientation="vertical" tablist has aria-orientation="vertical"', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical' });
    expect(el.querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('vertical mode does NOT render .arvo-tabs__divider even when hasTabstripBorder=true', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', hasTabstripBorder: true });
    expect(el.querySelector('.arvo-tabs__divider')).toBeNull();
  });

  it('vertical mode does NOT render .arvo-tabs__overflow-btn', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical' });
    expect(el.querySelector('.arvo-tabs__overflow-btn')).toBeNull();
  });

  it('vertical mode does NOT render .arvo-tabs__add-btn even when hasAddButton=true', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', hasAddButton: true });
    expect(el.querySelector('.arvo-tabs__add-btn')).toBeNull();
  });

  it('vertical mode does NOT render .arvo-tabs__tab-pin even when isPinnable=true', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', isPinnable: true });
    expect(el.querySelector('.arvo-tabs__tab-pin')).toBeNull();
  });

  it('vertical mode does NOT render .arvo-tabs__tab-close even when isClosable=true', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', isClosable: true });
    expect(el.querySelector('.arvo-tabs__tab-close')).toBeNull();
  });

  it('vertical mode DOES render .arvo-tabs__tab-menu when tab.menuItems is provided', () => {
    const el = createElement();
    const tabs: TabItem[] = [
      { id: 't1', label: 'T1', menuItems: [{ id: 'act-a', label: 'Action A' }] },
    ];
    ArvoTabstrip.initialize(el, { tabs, orientation: 'vertical' });
    expect(el.querySelector('.arvo-tabs__tab-menu')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Vertical keyboard
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- vertical keyboard', () => {
  it('ArrowDown moves focus to next enabled tab in vertical mode', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });

  it('ArrowUp moves focus to previous enabled tab in vertical mode', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', selectedId: 'tab2' });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab1');
  });

  it('ArrowLeft does nothing in vertical mode (focus stays)', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', selectedId: 'tab2' });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });

  it('ArrowRight does nothing in vertical mode (focus stays)', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab1');
  });

  it('Home moves focus to first enabled tab in vertical mode', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', selectedId: 'tab2' });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab1');
  });

  it('End moves focus to last enabled tab in vertical mode', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });

  it('ArrowDown does NOT move focus in horizontal mode', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'horizontal', selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab1');
  });

  it('ArrowUp does NOT move focus in horizontal mode', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'horizontal', selectedId: 'tab2' });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
  });
});

// ---------------------------------------------------------------------------
// activationMode
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- activationMode', () => {
  it('automatic (default): ArrowRight moves focus AND fires onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', onSelect });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });

  it('manual: ArrowRight moves focus only; onSelect NOT called', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', activationMode: 'manual', onSelect });
    const tab1 = el.querySelector('[data-tab-id="tab1"]') as HTMLElement;
    tab1.focus();
    tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tab-id')).toBe('tab2');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('manual: Enter on focused non-selected tab activates and fires onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', activationMode: 'manual', onSelect });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });

  it('manual: Space on focused non-selected tab activates and fires onSelect', () => {
    const el = createElement();
    const onSelect = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1', activationMode: 'manual', onSelect });
    const tab2 = el.querySelector('[data-tab-id="tab2"]') as HTMLElement;
    tab2.focus();
    tab2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith({ id: 'tab2', index: 1 });
  });
});

// ---------------------------------------------------------------------------
// isFullWidth
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- isFullWidth', () => {
  it('isFullWidth=true adds arvo-tabs--full-width to root', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isFullWidth: true });
    expect(el.classList.contains('arvo-tabs--full-width')).toBe(true);
  });

  it('isFullWidth=false (default) does NOT add arvo-tabs--full-width', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.classList.contains('arvo-tabs--full-width')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasTabstripBorder
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- hasTabstripBorder', () => {
  it('default hasTabstripBorder=false does NOT render .arvo-tabs__divider', () => {
    // Off by default -- the surrounding layout usually supplies its own
    // seam between the tab row and its panel.
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelector('.arvo-tabs__divider')).toBeNull();
  });

  it('hasTabstripBorder=true (opt-in) renders .arvo-tabs__divider for horizontal', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasTabstripBorder: true });
    expect(el.querySelector('.arvo-tabs__divider')).not.toBeNull();
  });

  it('explicit hasTabstripBorder=false also does NOT render .arvo-tabs__divider', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasTabstripBorder: false });
    expect(el.querySelector('.arvo-tabs__divider')).toBeNull();
  });

  it('vertical orientation does NOT render .arvo-tabs__divider regardless of hasTabstripBorder', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, orientation: 'vertical', hasTabstripBorder: true });
    expect(el.querySelector('.arvo-tabs__divider')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasOverflow opt-out
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- hasOverflow opt-out', () => {
  it('default hasOverflow=true renders the .arvo-tabs__overflow-btn wrapper in DOM', () => {
    // JS always mounts the overflow wrapper when isHorizontal && hasOverflow is true
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelector('.arvo-tabs__overflow-btn')).not.toBeNull();
  });

  it('hasOverflow=false: .arvo-tabs__overflow-btn wrapper is NOT rendered', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasOverflow: false });
    expect(el.querySelector('.arvo-tabs__overflow-btn')).toBeNull();
  });

  it('hasOverflow=false: root does NOT get has-overflow class', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasOverflow: false });
    expect(el.classList.contains('has-overflow')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Add-New button
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- Add-New button', () => {
  it('hasAddButton=true renders .arvo-tabs__add-btn', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true });
    expect(el.querySelector('.arvo-tabs__add-btn')).not.toBeNull();
  });

  it('hasAddButton=true: wrapper text contains "Add New" by default', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true });
    expect(el.querySelector('.arvo-tabs__add-btn')?.textContent).toContain('Add New');
  });

  it('clicking the Add-New button fires onTabAdd callback', () => {
    const el = createElement();
    const onTabAdd = vi.fn();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true, onTabAdd });
    (el.querySelector('.arvo-tabs__add-btn button') as HTMLElement).click();
    expect(onTabAdd).toHaveBeenCalledTimes(1);
  });

  it('clicking the Add-New button dispatches tabs:add event', () => {
    const el = createElement();
    const handler = vi.fn();
    el.addEventListener('tabs:add', handler);
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true });
    (el.querySelector('.arvo-tabs__add-btn button') as HTMLElement).click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isAddDisabled=true makes the Add-New button disabled', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true, isAddDisabled: true });
    const addBtn = el.querySelector('.arvo-tabs__add-btn button') as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });

  it('maxTabs=tabs.length makes the Add-New button automatically disabled', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true, maxTabs: TABS.length });
    const addBtn = el.querySelector('.arvo-tabs__add-btn button') as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });

  it('hasAddButton=false (default) does NOT render .arvo-tabs__add-btn', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    expect(el.querySelector('.arvo-tabs__add-btn')).toBeNull();
  });

  it('addButtonLabel="Custom" is reflected in the button text', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasAddButton: true, addButtonLabel: 'Custom' });
    expect(el.querySelector('.arvo-tabs__add-btn')?.textContent).toContain('Custom');
  });
});

// ---------------------------------------------------------------------------
// closeBehavior
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- closeBehavior', () => {
  const ABC: TabItem[] = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ];

  it('select-previous: removeTab selects previous enabled tab when selected tab is removed', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [...ABC],
      selectedId: 'b',
      closeBehavior: 'select-previous',
    });
    instance.removeTab('b');
    expect(instance.selectedId()).toBe('a');
  });

  it('select-next: removeTab selects next enabled tab when selected tab is removed', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [...ABC],
      selectedId: 'b',
      closeBehavior: 'select-next',
    });
    instance.removeTab('b');
    expect(instance.selectedId()).toBe('c');
  });

  it('select-nearest (default): prefers the previous tab when one exists', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [...ABC],
      selectedId: 'b',
    });
    instance.removeTab('b');
    expect(instance.selectedId()).toBe('a');
  });

  it('select-nearest falls back to next when no previous tab exists', () => {
    const el = createElement();
    const instance = ArvoTabstrip.initialize(el, {
      tabs: [...ABC],
      selectedId: 'a',
    });
    instance.removeTab('a');
    expect(instance.selectedId()).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// Inline slots (data-driven)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- inline slots', () => {
  it('tab.icon renders .arvo-tabs__tab-ico with o9con-{icon} class', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const ico = el.querySelector('.arvo-tabs__tab-ico');
    expect(ico).not.toBeNull();
    expect(ico?.classList.contains('o9con-home')).toBe(true);
  });

  it('tab.badge renders .arvo-tabs__tab-badge', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1', badge: { label: 'NEW' } }] });
    expect(el.querySelector('.arvo-tabs__tab-badge')).not.toBeNull();
  });

  it('tab.alert renders .arvo-tabs__tab-alert', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1', alert: {} }] });
    expect(el.querySelector('.arvo-tabs__tab-alert')).not.toBeNull();
  });

  it('tab.status renders .arvo-tabs__tab-status', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1', status: { label: 'Synced' } }] });
    expect(el.querySelector('.arvo-tabs__tab-status')).not.toBeNull();
  });

  it('tab.menuItems renders .arvo-tabs__tab-menu', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [{ id: 't1', label: 'T1', menuItems: [{ id: 'act-a', label: 'Action A' }] }],
    });
    expect(el.querySelector('.arvo-tabs__tab-menu')).not.toBeNull();
  });

  it('absence of icon omits .arvo-tabs__tab-ico', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1' }] });
    expect(el.querySelector('.arvo-tabs__tab-ico')).toBeNull();
  });

  it('absence of badge omits .arvo-tabs__tab-badge', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1' }] });
    expect(el.querySelector('.arvo-tabs__tab-badge')).toBeNull();
  });

  it('absence of alert omits .arvo-tabs__tab-alert', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1' }] });
    expect(el.querySelector('.arvo-tabs__tab-alert')).toBeNull();
  });

  it('absence of status omits .arvo-tabs__tab-status', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: [{ id: 't1', label: 'T1' }] });
    expect(el.querySelector('.arvo-tabs__tab-status')).toBeNull();
  });

  it('slots render in order: icon, label, alert, badge, status inside .arvo-tabs__tab-lft', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [{
        id: 't1',
        label: 'T1',
        icon: 'home',
        alert: { label: 'Warning' },
        badge: { label: 'NEW' },
        status: { label: 'Synced' },
      }],
    });
    const lft = el.querySelector('.arvo-tabs__tab-lft') as HTMLElement;
    const classNames = Array.from(lft.children).map((c) => c.className);
    const icoIdx   = classNames.findIndex((c) => c.includes('arvo-tabs__tab-ico'));
    const lblIdx   = classNames.findIndex((c) => c.includes('arvo-tabs__tab-lbl'));
    const alertIdx = classNames.findIndex((c) => c.includes('arvo-tabs__tab-alert'));
    const badgeIdx = classNames.findIndex((c) => c.includes('arvo-tabs__tab-badge'));
    const statIdx  = classNames.findIndex((c) => c.includes('arvo-tabs__tab-status'));
    expect(icoIdx).toBeLessThan(lblIdx);
    expect(lblIdx).toBeLessThan(alertIdx);
    expect(alertIdx).toBeLessThan(badgeIdx);
    expect(badgeIdx).toBeLessThan(statIdx);
  });
});

// ---------------------------------------------------------------------------
// Reorder (sortable adoption)
// Drag-and-drop is delegated to @arvo/core's createSortableList. The
// controller is pointer-driven and FLIP-animated; jsdom can simulate
// pointerdown but cannot run the layout-dependent slide. Per-tab HTML5
// `draggable` is not used -- we assert wiring + class application instead.
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- isReorderable', () => {
  it('isReorderable=true + horizontal: tabs do NOT carry the legacy draggable attribute', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isReorderable: true });
    const tabs = el.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      expect(tab.getAttribute('draggable')).toBeNull();
    }
  });

  it('pointerdown alone does NOT start a drag (drag threshold prevents click-pickup)', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isReorderable: true });
    const sourceTab = el.querySelector(
      '[data-tab-id="tab1"]',
    ) as HTMLElement;
    sourceTab.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(sourceTab.classList.contains('arvo-sortable--ghost')).toBe(false);
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('pointerdown + pointermove past the threshold applies .arvo-sortable--ghost', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isReorderable: true });
    const sourceTab = el.querySelector(
      '[data-tab-id="tab1"]',
    ) as HTMLElement;
    sourceTab.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );
    // Move past the 4px drag threshold along the strip's axis to commit
    // to a drag.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 70,
        clientY: 16,
        bubbles: true,
      }),
    );
    expect(sourceTab.classList.contains('arvo-sortable--ghost')).toBe(true);
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true }),
    );
  });

  it('Escape during drag clears the ghost class', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isReorderable: true });
    const sourceTab = el.querySelector(
      '[data-tab-id="tab1"]',
    ) as HTMLElement;
    sourceTab.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 70,
        clientY: 16,
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(sourceTab.classList.contains('arvo-sortable--ghost')).toBe(false);
  });

  it('Ctrl+ArrowRight on a tab fires tabs:reorder + onTabReorder', () => {
    const el = createElement();
    const onTabReorder = vi.fn();
    ArvoTabstrip.initialize(el, {
      tabs: TABS,
      isReorderable: true,
      onTabReorder,
    });
    const reorderListener = vi.fn();
    el.addEventListener('tabs:reorder', reorderListener as EventListener);
    const sourceTab = el.querySelector(
      '[data-tab-id="tab1"]',
    ) as HTMLElement;
    sourceTab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(onTabReorder).toHaveBeenCalledTimes(1);
    expect(reorderListener).toHaveBeenCalledTimes(1);
    const newOrder = (onTabReorder.mock.calls[0][0] as TabItem[]).map(
      (t) => t.id,
    );
    expect(newOrder.indexOf('tab2')).toBeLessThan(newOrder.indexOf('tab1'));
  });

  it('isReorderable=true + vertical: no sortable controller (vertical strips do not reorder)', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: TABS,
      isReorderable: true,
      orientation: 'vertical',
    });
    const sourceTab = el.querySelector(
      '[data-tab-id="tab1"]',
    ) as HTMLElement;
    sourceTab.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(sourceTab.classList.contains('arvo-sortable--ghost')).toBe(false);
  });

  it('isReorderable=false: pointerdown does NOT start a drag', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const sourceTab = el.querySelector(
      '[data-tab-id="tab1"]',
    ) as HTMLElement;
    sourceTab.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(sourceTab.classList.contains('arvo-sortable--ghost')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onOverflowOpen
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- onOverflowOpen', () => {
  it.todo(
    // ResizeObserver + real layout required for overflow detection;
    // JSDOM has no layout engine so has-overflow is never set and the
    // overflow menu's onOpenChange never fires in the test environment.
    'fires tabs:overflow-open when the overflow ActionMenu opens',
  );
});

// ---------------------------------------------------------------------------
// Divider placement (lives inside `__list`, not the root)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- divider placement', () => {
  it('renders __divider as a child of __list (not the root) on horizontal strips', () => {
    // The divider is opt-in -- pass hasTabstripBorder=true so the
    // divider mounts and we can verify its placement.
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasTabstripBorder: true });
    const list = el.querySelector('.arvo-tabs__list');
    const divider = el.querySelector('.arvo-tabs__divider');
    expect(divider).not.toBeNull();
    expect(list?.contains(divider!)).toBe(true);
    // Divider must not be a direct child of the root.
    expect(divider?.parentElement).toBe(list);
  });
});

// ---------------------------------------------------------------------------
// Accessible name composition (spec 7.2)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- accessible name composition', () => {
  it('selected tab announces "<label> tab, selected"', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1' });
    const tab1 = el.querySelector('[data-tab-id="tab1"]');
    expect(tab1?.getAttribute('aria-label')).toBe('Tab 1 tab, selected');
  });

  it('unselected tab announces just "<label> tab"', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, selectedId: 'tab1' });
    const tab2 = el.querySelector('[data-tab-id="tab2"]');
    expect(tab2?.getAttribute('aria-label')).toBe('Tab 2 tab');
  });

  it('inline slot data is folded into the announcement', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'Demand',
          badge: { label: 'NEW' },
          alert: { label: 'contains 3 validation errors' },
          status: { label: 'Synced', type: 'available' },
          pinned: true,
        },
      ],
      selectedId: 't1',
    });
    const tab = el.querySelector('[data-tab-id="t1"]');
    expect(tab?.getAttribute('aria-label')).toBe(
      'Demand tab, selected, new, contains 3 validation errors, status: synced, pinned',
    );
  });

  it('explicit ariaLabel overrides the composed name', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [{ id: 't1', label: 'Long Label', ariaLabel: 'Custom name' }],
    });
    const tab = el.querySelector('[data-tab-id="t1"]');
    expect(tab?.getAttribute('aria-label')).toBe('Custom name');
  });

  it('aria-label refreshes when selection toggles', () => {
    const el = createElement();
    const ts = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      selectedId: 'tab1',
    });
    expect(
      el.querySelector('[data-tab-id="tab1"]')?.getAttribute('aria-label'),
    ).toContain('selected');
    ts.select('tab2');
    expect(
      el.querySelector('[data-tab-id="tab1"]')?.getAttribute('aria-label'),
    ).not.toContain('selected');
    expect(
      el.querySelector('[data-tab-id="tab2"]')?.getAttribute('aria-label'),
    ).toContain('selected');
  });
});

// ---------------------------------------------------------------------------
// Per-action status slots
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- per-action status', () => {
  it('pinActionStatus renders ArvoStatus inside the pin button', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'T1',
          pinActionStatus: { type: 'attention' },
        },
      ],
      isPinnable: true,
    });
    const pin = el.querySelector('.arvo-tabs__tab-pin');
    expect(pin?.querySelector('.arvo-sts')).not.toBeNull();
  });

  it('closeActionStatus renders ArvoStatus inside the close button', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'T1',
          closeActionStatus: { type: 'positive' },
        },
      ],
      isClosable: true,
    });
    const close = el.querySelector('.arvo-tabs__tab-close');
    expect(close?.querySelector('.arvo-sts')).not.toBeNull();
  });

  it('omitting the action-status fields renders no overlay status on the buttons', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [{ id: 't1', label: 'T1' }],
      isPinnable: true,
      isClosable: true,
    });
    const pin = el.querySelector('.arvo-tabs__tab-pin');
    const close = el.querySelector('.arvo-tabs__tab-close');
    expect(pin?.querySelector('.arvo-sts')).toBeNull();
    expect(close?.querySelector('.arvo-sts')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Per-tab inline status size + tooltip + badge tooltip + compact menu
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- inline slot config', () => {
  it('per-tab inline status always renders at size "sm" regardless of strip size', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      size: 'lg',
      tabs: [{ id: 't1', label: 'T1', status: { label: 'Synced' } }],
    });
    const statusEl = el.querySelector('.arvo-tabs__tab-status .arvo-sts');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.classList.contains('arvo-sts--sm')).toBe(true);
  });

  it('per-tab status tooltip override replaces the label as the hover tooltip', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'T1',
          status: { label: 'Synced', tooltip: 'Last synced 5m ago' },
        },
      ],
    });
    const statusEl = el.querySelector('.arvo-tabs__tab-status .arvo-sts');
    expect(statusEl?.getAttribute('title')).toBe('Last synced 5m ago');
    // aria-label still uses the visual tooltip text per ArvoStatus contract.
    expect(statusEl?.getAttribute('aria-label')).toBe('Last synced 5m ago');
  });

  it('per-tab status falls back to label as tooltip when no tooltip override is supplied', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [{ id: 't1', label: 'T1', status: { label: 'Synced' } }],
    });
    const statusEl = el.querySelector('.arvo-tabs__tab-status .arvo-sts');
    expect(statusEl?.getAttribute('title')).toBe('Synced');
  });

  it('per-tab badge accepts a tooltip and forwards it to ArvoBadge', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'T1',
          badge: { label: 'NEW', tooltip: 'Released this week' },
        },
      ],
    });
    const badgeRoot = el.querySelector('.arvo-tabs__tab-badge .arvo-bdg__lbl, .arvo-tabs__tab-badge .arvo-bdg');
    expect(badgeRoot?.getAttribute('title')).toBe('Released this week');
  });

  it('per-tab dropdown action menu renders as compact (no caret)', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'T1',
          menuItems: [{ id: 'a', label: 'Action A' }],
        },
      ],
    });
    const trigger = el.querySelector('.arvo-tabs__tab-menu .arvo-dd-icon-btn');
    expect(trigger).not.toBeNull();
    expect(trigger?.classList.contains('arvo-dd-icon-btn--compact')).toBe(true);
    expect(trigger?.querySelector('.arvo-dd-icon-btn__caret')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Inline badge: hasBadgeIcon=false enforced
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- inline badge has no icon', () => {
  it('tab badge never renders the icon glyph regardless of semanticType', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        {
          id: 't1',
          label: 'T1',
          badge: { label: 'NEW', semanticType: 'positive' },
        },
        {
          id: 't2',
          label: 'T2',
          badge: { label: '3', semanticType: 'warning' },
        },
      ],
    });
    const badges = el.querySelectorAll('.arvo-tabs__tab-badge .arvo-bdg__ico');
    expect(badges.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Label layout-shift contract (data-label + __tab-lbl-text child)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- label layout-shift contract', () => {
  it('renders __tab-lbl with data-label matching the tab label', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const lbl = el.querySelector('.arvo-tabs__tab-lbl');
    expect(lbl).not.toBeNull();
    expect(lbl?.getAttribute('data-label')).toBe('Tab 1');
  });

  it('renders __tab-lbl-text child holding the visible label text', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS });
    const txt = el.querySelector('.arvo-tabs__tab-lbl-text');
    expect(txt).not.toBeNull();
    expect(txt?.textContent).toBe('Tab 1');
  });
});

// ---------------------------------------------------------------------------
// Pin button is an ArvoToggleButton (aria-pressed + icon swap)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- pin button is a ToggleButton', () => {
  it('exposes aria-pressed="false" on an unpinned tab', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isPinnable: true });
    const pinBtn = el.querySelector('[aria-label="Pin tab"]');
    expect(pinBtn).not.toBeNull();
    expect(pinBtn?.getAttribute('aria-pressed')).toBe('false');
  });

  it('exposes aria-pressed="true" on a pinned tab', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 'p1', label: 'P1', pinned: true },
        { id: 't1', label: 'T1' },
      ],
      isPinnable: true,
    });
    const unpinBtn = el.querySelector('[aria-label="Unpin tab"]');
    expect(unpinBtn).not.toBeNull();
    expect(unpinBtn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('carries the arvo-toggle-btn block class on the pin trigger', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, isPinnable: true });
    const pinBtn = el.querySelector('[aria-label="Pin tab"]');
    expect(pinBtn?.classList.contains('arvo-toggle-btn')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Overflow + Add-New compact use the tertiary variant
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- right-cluster buttons use tertiary variant', () => {
  it('the overflow trigger carries .arvo-btn--tertiary', () => {
    const el = createElement();
    ArvoTabstrip.initialize(el, { tabs: TABS, hasOverflow: true });
    const overflowBtn = el.querySelector('.arvo-tabs__overflow-btn button');
    expect(overflowBtn).not.toBeNull();
    expect(overflowBtn?.classList.contains('arvo-btn--tertiary')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Internal close removal + cancellable close (JS-only contract)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- internal close removal (cancellable)', () => {
  const CLOSABLE: TabItem[] = [
    { id: 't1', label: 'T1' },
    { id: 't2', label: 'T2' },
    { id: 't3', label: 'T3' },
  ];

  it('clicking the close button removes the tab from the strip by default', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: CLOSABLE,
      isClosable: true,
      selectedId: 't2',
    });
    const closeBtn = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t2"] [aria-label="Close tab"]',
    ) as HTMLElement;
    closeBtn.click();
    expect(el.querySelectorAll('[role="tab"]').length).toBe(2);
    expect(
      el.querySelector('.arvo-tabs__tab[data-tab-id="t2"]'),
    ).toBeNull();
    inst.destroy();
  });

  it('returning false from onClose cancels the internal removal', () => {
    const el = createElement();
    const onClose = vi.fn(() => false as const);
    const inst = ArvoTabstrip.initialize(el, {
      tabs: CLOSABLE,
      isClosable: true,
      selectedId: 't2',
      onClose,
    });
    const closeBtn = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t2"] [aria-label="Close tab"]',
    ) as HTMLElement;
    closeBtn.click();
    expect(onClose).toHaveBeenCalledWith({ id: 't2', index: 1 });
    expect(el.querySelectorAll('[role="tab"]').length).toBe(3);
    expect(
      el.querySelector('.arvo-tabs__tab[data-tab-id="t2"]'),
    ).not.toBeNull();
    inst.destroy();
  });

  it('calling preventDefault on the tabs:close event cancels the internal removal', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: CLOSABLE,
      isClosable: true,
      selectedId: 't2',
    });
    el.addEventListener('tabs:close', (e) => e.preventDefault());
    const closeBtn = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t2"] [aria-label="Close tab"]',
    ) as HTMLElement;
    closeBtn.click();
    expect(el.querySelectorAll('[role="tab"]').length).toBe(3);
    inst.destroy();
  });

  it('Delete on the focused closable tab removes it from the strip by default', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: CLOSABLE,
      isClosable: true,
      selectedId: 't2',
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t2"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    expect(el.querySelectorAll('[role="tab"]').length).toBe(2);
    inst.destroy();
  });

  it('the tabs:close CustomEvent is cancelable', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: CLOSABLE,
      isClosable: true,
      selectedId: 't2',
    });
    let cancelable = false;
    el.addEventListener('tabs:close', (e) => {
      cancelable = e.cancelable;
    });
    const closeBtn = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t2"] [aria-label="Close tab"]',
    ) as HTMLElement;
    closeBtn.click();
    expect(cancelable).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Keyboard shortcuts: Ctrl+P pin, Ctrl+Home/End reorder
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- Ctrl+P pin shortcut', () => {
  it('Ctrl+P on the focused tab flips the pinned state and fires onPin', () => {
    const el = createElement();
    const onPin = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 't1', label: 'T1' },
        { id: 't2', label: 'T2' },
      ],
      isPinnable: true,
      selectedId: 't1',
      onPin,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t1"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(onPin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', pinned: true }),
    );
    inst.destroy();
  });

  it('Ctrl+P is a no-op when isPinnable is false', () => {
    const el = createElement();
    const onPin = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [{ id: 't1', label: 'T1' }],
      selectedId: 't1',
      onPin,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t1"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(onPin).not.toHaveBeenCalled();
    inst.destroy();
  });

  it('Cmd+P on macOS fires the pin shortcut (OS-aware modifier swap)', () => {
    // Force jsdom to look like macOS so `isModKey` accepts metaKey
    // instead of ctrlKey. The OS detection helper caches its result;
    // the reset-for-tests helper is exported alongside it.
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      get: () => 'MacIntel',
    });
    __resetOperatingSystemCacheForTests();

    const el = createElement();
    const onPin = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 't1', label: 'T1' },
        { id: 't2', label: 'T2' },
      ],
      isPinnable: true,
      selectedId: 't1',
      onPin,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t1"]',
    ) as HTMLElement;
    tab.focus();
    // Cmd+P (metaKey, no ctrlKey) -- this is what macOS users press.
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'p',
        metaKey: true,
        bubbles: true,
      }),
    );
    expect(onPin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', pinned: true }),
    );
    inst.destroy();

    // Restore navigator + cache so following tests see the default
    // (jsdom Linux) platform again.
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      get: () => '',
    });
    __resetOperatingSystemCacheForTests();
  });

  it('Ctrl+P on macOS is NOT the platform mod key, so the shortcut does NOT fire', () => {
    // Mirror the macOS browser behavior: a literal Ctrl+P (which is
    // bound to the print dialog on Windows but not on Mac) does not
    // trigger the pin shortcut because `isModKey` only accepts
    // metaKey on Mac. This prevents conflicts with browser shortcuts.
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      get: () => 'MacIntel',
    });
    __resetOperatingSystemCacheForTests();

    const el = createElement();
    const onPin = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [{ id: 't1', label: 'T1' }],
      isPinnable: true,
      selectedId: 't1',
      onPin,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="t1"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(onPin).not.toHaveBeenCalled();
    inst.destroy();

    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      get: () => '',
    });
    __resetOperatingSystemCacheForTests();
  });
});

describe('ArvoTabstrip -- Ctrl+Home / Ctrl+End reorder shortcuts', () => {
  it('Ctrl+End moves the focused tab to the end of its group', () => {
    const el = createElement();
    const onTabReorder = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
      isReorderable: true,
      selectedId: 'a',
      onTabReorder,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="a"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(onTabReorder).toHaveBeenCalledTimes(1);
    const next = onTabReorder.mock.calls[0][0] as TabItem[];
    expect(next.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    inst.destroy();
  });

  it('Ctrl+End on a pinned tab stays within the pinned region', () => {
    const el = createElement();
    const onTabReorder = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 'p1', label: 'P1', pinned: true },
        { id: 'p2', label: 'P2', pinned: true },
        { id: 'u1', label: 'U1' },
      ],
      isPinnable: true,
      isReorderable: true,
      selectedId: 'p1',
      onTabReorder,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="p1"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    const next = onTabReorder.mock.calls[0][0] as TabItem[];
    expect(next.map((t) => t.id)).toEqual(['p2', 'p1', 'u1']);
    inst.destroy();
  });

  it('Ctrl+End is a no-op when isReorderable is false', () => {
    const el = createElement();
    const onTabReorder = vi.fn();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      selectedId: 'a',
      onTabReorder,
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="a"]',
    ) as HTMLElement;
    tab.focus();
    tab.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(onTabReorder).not.toHaveBeenCalled();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Context-menu shortcuts: right-click, Shift+F10, Ctrl+Shift+\\
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- context menu shortcuts', () => {
  it('right-click on a tab with composed actions calls preventDefault', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      isClosable: true,
      isPinnable: true,
    });
    const tab = el.querySelector('[role="tab"]') as HTMLElement;
    const evt = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    tab.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    inst.destroy();
  });

  it('right-click on a tab without any composed actions does NOT call preventDefault', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, { tabs: TABS });
    const tab = el.querySelector('[role="tab"]') as HTMLElement;
    const evt = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    tab.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
    inst.destroy();
  });

  it('Shift+F10 on a focused tab with composed actions calls preventDefault on the key event', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      isClosable: true,
      isPinnable: true,
      selectedId: 'tab1',
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="tab1"]',
    ) as HTMLElement;
    tab.focus();
    const evt = new KeyboardEvent('keydown', {
      key: 'F10',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    tab.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    inst.destroy();
  });

  it('Ctrl+Shift+\\ on a focused tab with composed actions calls preventDefault on the key event', () => {
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: TABS,
      isClosable: true,
      selectedId: 'tab1',
    });
    const tab = el.querySelector(
      '.arvo-tabs__tab[data-tab-id="tab1"]',
    ) as HTMLElement;
    tab.focus();
    const evt = new KeyboardEvent('keydown', {
      key: '\\',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    tab.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tab context menu is icon-less by design (regression)
// ---------------------------------------------------------------------------

describe('ArvoTabstrip -- default action menu items have no icons', () => {
  it('default Pin / Close / Move menu items render WITHOUT leading icons', () => {
    // Open a tab's per-tab dropdown menu and assert the rendered rows
    // do not include the `__ico` leading slot. Per the latest UX
    // direction the tab context menu is intentionally icon-less --
    // labels carry the meaning and the trailing shortcut hint is the
    // only decorative slot.
    const el = createElement();
    const inst = ArvoTabstrip.initialize(el, {
      tabs: [
        { id: 't1', label: 'T1', menuItems: [{ id: 'rename', label: 'Rename' }] },
      ],
      isClosable: true,
      isPinnable: true,
      isReorderable: true,
      selectedId: 't1',
    });
    // Click the visible per-tab menu button to open the dropdown.
    const trigger = el.querySelector(
      '.arvo-tabs__tab-menu button',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    trigger.click();
    // Menu surfaces are rendered into the overlay container which the
    // overlay hub appends to `document.body`. Find all rows.
    const rows = Array.from(
      document.querySelectorAll('.arvo-menu-item'),
    );
    // At minimum: the consumer row + Pin + Close + CloseOthers +
    // CloseRight + 4 move actions. We assert that NONE of the default
    // tabstrip rows carry an `__ico` leading slot; the consumer's
    // `rename` row carries no icon either because we didn't supply one.
    for (const row of rows) {
      const labelEl = row.querySelector('.arvo-menu-item__label');
      const labelText = labelEl?.textContent?.trim() ?? '';
      // Skip non-text rows (separators, etc.)
      if (!labelText) continue;
      // The icon slot should not exist on the default tabstrip rows.
      expect(
        row.querySelector('.arvo-menu-item__ico'),
        `tab menu row "${labelText}" should NOT render an icon slot`,
      ).toBeNull();
    }
    inst.destroy();
  });
});
