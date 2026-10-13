import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ArvoButtonGroup } from './ButtonGroup';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const ITEMS_THREE = [
  { value: 'bold', label: 'Bold', icon: 'bold' },
  { value: 'italic', label: 'Italic', icon: 'italic' },
  { value: 'underline', label: 'Underline', icon: 'underline' },
];

const ITEMS_ICON_ONLY = [
  { value: 'left', icon: 'align-left' },
  { value: 'center', icon: 'align-center' },
  { value: 'right', icon: 'align-right' },
];

beforeEach(() => {
  // jsdom does not ship ResizeObserver; ButtonGroup hooks it up only when
  // `hasOverflow` is true. The overflow tests below need a no-op shim.
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- initialization', () => {
  it('static initialize() returns an ArvoButtonGroup instance', () => {
    const el = createElement();
    const instance = ArvoButtonGroup.initialize(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(instance).toBeInstanceOf(ArvoButtonGroup);
  });

  it('constructor returns an ArvoButtonGroup instance', () => {
    const el = createElement();
    const instance = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(instance).toBeInstanceOf(ArvoButtonGroup);
  });

  it('adds arvo-btn-grp class to element', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(el.classList.contains('arvo-btn-grp')).toBe(true);
  });

  it('sets role="toolbar" on element', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(el.getAttribute('role')).toBe('toolbar');
  });

  it('sets aria-orientation="horizontal"', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(el.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('sets aria-label from ariaLabel option', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Text formatting', items: ITEMS_THREE });
    expect(el.getAttribute('aria-label')).toBe('Text formatting');
  });

  it('creates child button elements for each item', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    const buttons = el.querySelectorAll('button[data-value]');
    expect(buttons.length).toBe(3);
  });

  it('creates buttons with data-value attributes', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    const values = Array.from(el.querySelectorAll('button[data-value]'))
      .map(btn => btn.getAttribute('data-value'));
    expect(values).toEqual(['bold', 'italic', 'underline']);
  });
});

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- variant', () => {
  it('applies primary variant class by default', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(el.classList.contains('arvo-btn-grp--primary')).toBe(true);
  });

  it('applies secondary variant class when specified', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, variant: 'secondary' });
    expect(el.classList.contains('arvo-btn-grp--secondary')).toBe(true);
  });

  it('applies outline variant class when specified', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, variant: 'outline' });
    expect(el.classList.contains('arvo-btn-grp--outline')).toBe(true);
  });

  it('exposes outline in static VARIANTS', () => {
    expect(ArvoButtonGroup.VARIANTS).toContain('outline');
  });
});

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- size', () => {
  it('applies lg size class by default', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(el.classList.contains('arvo-btn-grp--lg')).toBe(true);
  });

  it('applies sm size class when specified', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, size: 'sm' });
    expect(el.classList.contains('arvo-btn-grp--sm')).toBe(true);
  });

  it('maps group size lg to child button size md', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, size: 'lg' });
    const btn = el.querySelector('button[data-value]');
    expect(btn?.classList.contains('arvo-btn--md')).toBe(true);
  });

  it('maps group size sm to child button size sm', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, size: 'sm' });
    const btn = el.querySelector('button[data-value]');
    expect(btn?.classList.contains('arvo-btn--sm')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Single-select
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- single-select', () => {
  it('marks the initially selected item with .active', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold' });
    const btn = el.querySelector('button[data-value="bold"]');
    expect(btn?.classList.contains('active')).toBe(true);
  });

  it('sets aria-pressed="true" on selected item', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold' });
    const btn = el.querySelector('button[data-value="bold"]');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('sets aria-pressed="false" on unselected items', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold' });
    const btn = el.querySelector('button[data-value="italic"]');
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking an unselected item fires onChange and btn-grp:change', () => {
    const el = createElement();
    const onChange = vi.fn();
    const eventHandler = vi.fn();
    el.addEventListener('btn-grp:change', eventHandler);

    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold', onChange });

    const italicBtn = el.querySelector('button[data-value="italic"]') as HTMLButtonElement;
    italicBtn.click();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'italic', previousValue: 'bold' })
    );
    expect(eventHandler).toHaveBeenCalled();
  });

  it('clicking the already-selected item is a no-op', () => {
    const el = createElement();
    const onChange = vi.fn();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold', onChange });

    const boldBtn = el.querySelector('button[data-value="bold"]') as HTMLButtonElement;
    boldBtn.click();

    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Multi-select
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- multi-select', () => {
  it('applies arvo-btn-grp--multi class', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, isMultiSelect: true });
    expect(el.classList.contains('arvo-btn-grp--multi')).toBe(true);
  });

  it('clicking an item toggles its selection', () => {
    const el = createElement();
    const onChange = vi.fn();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, isMultiSelect: true, value: [], onChange });

    const boldBtn = el.querySelector('button[data-value="bold"]') as HTMLButtonElement;
    boldBtn.click();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ changedValue: 'bold', isSelected: true })
    );
  });

  it('clicking an already-selected item removes it', () => {
    const el = createElement();
    const onChange = vi.fn();
    new ArvoButtonGroup(el, {
      ariaLabel: 'Test', items: ITEMS_THREE, isMultiSelect: true, value: ['bold'], onChange,
    });

    const boldBtn = el.querySelector('button[data-value="bold"]') as HTMLButtonElement;
    boldBtn.click();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ changedValue: 'bold', isSelected: false })
    );
  });

  it('forces expandOnSelect to false when multiSelect is true', () => {
    const el = createElement();
    new ArvoButtonGroup(el, {
      ariaLabel: 'Test', items: ITEMS_THREE, isMultiSelect: true, expandOnSelect: true,
    });
    expect(el.classList.contains('arvo-btn-grp--expand-lbl')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// value() getter/setter
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- value()', () => {
  it('returns current value as getter', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold' });
    expect(grp.value()).toBe('bold');
  });

  it('sets value as setter and updates DOM', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold' });

    grp.value('italic');

    expect(grp.value()).toBe('italic');
    const boldBtn = el.querySelector('button[data-value="bold"]');
    const italicBtn = el.querySelector('button[data-value="italic"]');
    expect(boldBtn?.classList.contains('active')).toBe(false);
    expect(italicBtn?.classList.contains('active')).toBe(true);
  });

  it('returns null when nothing selected', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    expect(grp.value()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// disabled()
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- disabled()', () => {
  it('returns disabled state as getter', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, isDisabled: true });
    expect(grp.disabled()).toBe(true);
  });

  it('toggles disabled state on group and children', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });

    grp.disabled(true);

    expect(grp.disabled()).toBe(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('prevents click interaction when disabled', () => {
    const el = createElement();
    const onChange = vi.fn();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, isDisabled: true, onChange });

    const btn = el.querySelector('button[data-value="bold"]') as HTMLButtonElement;
    btn.click();

    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setVariant()
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- setVariant()', () => {
  it('changes the variant class on root', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });

    grp.setVariant('secondary');

    expect(el.classList.contains('arvo-btn-grp--secondary')).toBe(true);
    expect(el.classList.contains('arvo-btn-grp--primary')).toBe(false);
  });

  it('ignores invalid variant strings', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    grp.setVariant('invalid');
    expect(el.classList.contains('arvo-btn-grp--primary')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setLoading()
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- setLoading()', () => {
  it('adds .loading class and aria-busy', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });

    grp.setLoading(true);

    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('removes .loading class and aria-busy when set to false', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, isLoading: true });

    grp.setLoading(false);

    expect(el.classList.contains('loading')).toBe(false);
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('skips excluded items', () => {
    const el = createElement();
    const itemsWithExcluded = [
      { value: 'a', label: 'A', isExcluded: true },
      { value: 'b', label: 'B' },
    ];
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: itemsWithExcluded });

    grp.setLoading(true);

    const btnA = el.querySelector('button[data-value="a"]');
    const btnB = el.querySelector('button[data-value="b"]');
    expect(btnA?.classList.contains('loading')).toBe(false);
    expect(btnB?.classList.contains('loading')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setItems()
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- setItems()', () => {
  it('replaces items and resets selection', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'bold' });

    const newItems = [
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
    ];
    grp.setItems(newItems);

    expect(grp.value()).toBeNull();
    expect(el.querySelectorAll('button[data-value]').length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// icon-only
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- iconOnly', () => {
  it('applies arvo-btn-grp--icon-only class', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_ICON_ONLY, isIconOnly: true });
    expect(el.classList.contains('arvo-btn-grp--icon-only')).toBe(true);
  });

  it('renders ArvoIconButton instances (arvo-icon-btn class)', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_ICON_ONLY, isIconOnly: true });
    const iconBtns = el.querySelectorAll('.arvo-icon-btn');
    expect(iconBtns.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Roving tabindex
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- roving tabindex', () => {
  it('first non-disabled item has tabIndex=0 when no selection', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    const first = el.querySelector('button[data-value="bold"]') as HTMLButtonElement;
    const second = el.querySelector('button[data-value="italic"]') as HTMLButtonElement;
    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);
  });

  it('selected item has tabIndex=0', () => {
    const el = createElement();
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'italic' });
    const first = el.querySelector('button[data-value="bold"]') as HTMLButtonElement;
    const second = el.querySelector('button[data-value="italic"]') as HTMLButtonElement;
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// focus()
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- focus()', () => {
  it('focuses the tabindex=0 item', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE, value: 'italic' });

    grp.focus();

    expect(document.activeElement?.getAttribute('data-value')).toBe('italic');
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- destroy()', () => {
  it('removes all classes and attributes from root', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });

    grp.destroy();

    expect(el.className).toBe('');
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-orientation')).toBe(false);
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.children.length).toBe(0);
  });

  it('empties the container', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, { ariaLabel: 'Test', items: ITEMS_THREE });
    grp.destroy();
    expect(el.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Individual item disabled
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- individual item disabled', () => {
  it('disables individual items via item config', () => {
    const el = createElement();
    const items = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', isDisabled: true },
    ];
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items });

    const btnB = el.querySelector('button[data-value="b"]') as HTMLButtonElement;
    expect(btnB.disabled).toBe(true);
  });

  it('clicking a disabled item fires no onChange', () => {
    const el = createElement();
    const onChange = vi.fn();
    const items = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', isDisabled: true },
    ];
    new ArvoButtonGroup(el, { ariaLabel: 'Test', items, onChange });

    const btnB = el.querySelector('button[data-value="b"]') as HTMLButtonElement;
    btnB.click();

    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// hasOverflow trigger click handler attachment
//
// The overflow trigger routes through ArvoActionMenu, which writes
// aria-haspopup/aria-expanded on the trigger itself and renders the menu
// panel into document.body via the overlay hub. These tests cover that
// wiring contract.
// ---------------------------------------------------------------------------

describe('ArvoButtonGroup -- hasOverflow trigger (W1-BTN-GRP-REV-001)', () => {
  it('renders the overflow trigger element when hasOverflow=true', () => {
    const el = createElement();
    new ArvoButtonGroup(el, {
      ariaLabel: 'Test',
      items: ITEMS_THREE,
      hasOverflow: true,
    });
    const trigger = el.querySelector('.arvo-btn-grp__overflow');
    expect(trigger).not.toBeNull();
    expect(trigger!.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger!.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking the overflow trigger opens an ActionMenu when items are hidden', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, {
      ariaLabel: 'Test',
      items: ITEMS_THREE,
      hasOverflow: true,
    });
    // jsdom has no layout, so the ResizeObserver-driven overflow detection
    // never fires. Seed `_hiddenValues` directly + rebuild the menu items
    // so the menu has something to render. The test focuses on the wiring
    // (ActionMenu opens when the trigger is clicked), not the width-
    // measurement code path.
    const grpInternal = grp as unknown as {
      _hiddenValues: Set<string>;
      _updateOverflowMenuItems(): void;
    };
    grpInternal._hiddenValues = new Set(['underline']);
    grpInternal._updateOverflowMenuItems();
    const trigger = el.querySelector('.arvo-btn-grp__overflow') as HTMLElement;
    trigger.style.display = '';

    expect(document.querySelector('.arvo-action-menu.open')).toBeNull();
    trigger.click();
    expect(document.querySelector('.arvo-action-menu.open')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking the overflow trigger a second time closes the ActionMenu', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, {
      ariaLabel: 'Test',
      items: ITEMS_THREE,
      hasOverflow: true,
    });
    const grpInternal = grp as unknown as {
      _hiddenValues: Set<string>;
      _updateOverflowMenuItems(): void;
      _overflowMenu: { isOpen(): boolean };
    };
    grpInternal._hiddenValues = new Set(['underline']);
    grpInternal._updateOverflowMenuItems();
    const trigger = el.querySelector('.arvo-btn-grp__overflow') as HTMLElement;
    trigger.style.display = '';

    trigger.click();
    expect(grpInternal._overflowMenu.isOpen()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    trigger.click();
    // The overlay surface's open class lingers across the exit transition
    // (async), so probe the engine state directly + the trigger's aria-
    // expanded (written synchronously by createOverlaySurface).
    expect(grpInternal._overflowMenu.isOpen()).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('destroy() tears down the overflow trigger and menu', () => {
    const el = createElement();
    const grp = new ArvoButtonGroup(el, {
      ariaLabel: 'Test',
      items: ITEMS_THREE,
      hasOverflow: true,
    });
    expect(el.querySelector('.arvo-btn-grp__overflow')).not.toBeNull();
    grp.destroy();
    // After destroy, the container is wiped and there is no menu in the
    // document anymore.
    expect(el.querySelector('.arvo-btn-grp__overflow')).toBeNull();
    expect(document.body.querySelector('.arvo-action-menu.open')).toBeNull();
  });
});
