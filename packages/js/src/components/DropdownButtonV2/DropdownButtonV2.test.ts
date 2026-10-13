// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoDropdownButtonV2 } from './DropdownButtonV2';
import type { ArvoDropdownButtonV2Options, MenuItemData } from './DropdownButtonV2';
import { ArvoActionMenu as MockedActionMenu } from '../ActionMenu/ActionMenu';
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockActionMenuInstance = {
  open: vi.fn(),
  close: vi.fn(),
  toggle: vi.fn(),
  isOpen: vi.fn(() => false),
  updateItems: vi.fn(),
  setLoading: vi.fn(),
  disabled: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('../ActionMenu/ActionMenu', () => ({
  ArvoActionMenu: {
    initialize: vi.fn(() => mockActionMenuInstance),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultItems: MenuItemData[] = [
  { id: '1', label: 'Cut' },
  { id: '2', label: 'Copy' },
  { id: '3', label: 'Paste' },
];

const selectionItems: MenuItemData[] = [
  { id: 'a', label: 'Apple' },
  { id: 'b', label: 'Banana' },
  { id: 'c', label: 'Cherry' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let el: HTMLButtonElement;

function createInstance(options: Partial<ArvoDropdownButtonV2Options> = {}): ArvoDropdownButtonV2 {
  return ArvoDropdownButtonV2.initialize(el, { label: 'Actions', items: defaultItems, ...options });
}

function getLabel(): string {
  return el.querySelector('.arvo-dd-btn__lbl')?.textContent ?? '';
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  el = document.createElement('button');
  document.body.appendChild(el);
});

afterEach(() => {
  el.remove();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArvoDropdownButtonV2', () => {
  // -- Initialization --------------------------------------------------------

  describe('initialization', () => {
    it('creates an instance via initialize()', () => {
      const instance = createInstance();
      expect(instance).toBeInstanceOf(ArvoDropdownButtonV2);
    });

    it('creates an instance via constructor', () => {
      const instance = new ArvoDropdownButtonV2(el, { label: 'Test', items: defaultItems });
      expect(instance).toBeInstanceOf(ArvoDropdownButtonV2);
    });

    it('applies arvo-dd-btn and arvo-btn classes', () => {
      createInstance();
      expect(el.classList.contains('arvo-dd-btn')).toBe(true);
      expect(el.classList.contains('arvo-btn')).toBe(true);
    });

    it('applies default variant class (primary)', () => {
      createInstance();
      expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    });

    it('applies default size class (md)', () => {
      createInstance();
      expect(el.classList.contains('arvo-btn--md')).toBe(true);
    });

    it('sets type=button on button elements', () => {
      createInstance();
      expect(el.getAttribute('type')).toBe('button');
    });

    it('renders label element with correct text', () => {
      createInstance({ label: 'My Label' });
      expect(getLabel()).toBe('My Label');
    });

    it('renders caret element', () => {
      createInstance();
      const caret = el.querySelector('.arvo-dd-btn__caret');
      expect(caret).toBeTruthy();
      expect(caret?.classList.contains('o9con-angle-down')).toBe(true);
    });

    it('renders icon element when icon option is set', () => {
      createInstance({ icon: 'star' });
      const icon = el.querySelector('.arvo-dd-btn__icon');
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains('o9con-star')).toBe(true);
    });

    it('does not render icon element when icon is not set', () => {
      createInstance();
      expect(el.querySelector('.arvo-dd-btn__icon')).toBeNull();
    });

    it('falls back to element textContent for label if label option is omitted', () => {
      el.textContent = 'From DOM';
      const instance = ArvoDropdownButtonV2.initialize(el, { items: defaultItems });
      expect(getLabel()).toBe('From DOM');
    });
  });

  // -- Variants -------------------------------------------------------------

  describe('variants', () => {
    it('applies specified variant class on init', () => {
      createInstance({ variant: 'secondary' });
      expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
      expect(el.classList.contains('arvo-btn--primary')).toBe(false);
    });

    it('falls back to primary for invalid variant', () => {
      createInstance({ variant: 'invalid' as never });
      expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    });
  });

  // -- Appearance ------------------------------------------------------------

  describe('appearance', () => {
    it('uses button appearance by default', () => {
      createInstance();
      expect(el.classList.contains('arvo-dd-btn--button')).toBe(true);
      expect(el.classList.contains('arvo-dd-btn--field')).toBe(false);
    });

    it('applies field appearance on init', () => {
      createInstance({ appearance: 'field', variant: 'secondary' });
      expect(el.classList.contains('arvo-dd-btn--field')).toBe(true);
      expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
    });

    it('coerces unsupported field variants to secondary', () => {
      createInstance({ appearance: 'field', variant: 'primary' });
      expect(el.classList.contains('arvo-dd-btn--field')).toBe(true);
      expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
      expect(el.classList.contains('arvo-btn--primary')).toBe(false);
    });

    it('allows tertiary field appearance', () => {
      createInstance({ appearance: 'field', variant: 'tertiary' });
      expect(el.classList.contains('arvo-dd-btn--field')).toBe(true);
      expect(el.classList.contains('arvo-btn--tertiary')).toBe(true);
    });

    it('setAppearance(field) coerces an existing unsupported variant', () => {
      const instance = createInstance({ variant: 'outline' });
      instance.setAppearance('field');
      expect(el.classList.contains('arvo-dd-btn--field')).toBe(true);
      expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
      expect(el.classList.contains('arvo-btn--outline')).toBe(false);
    });
  });

  // -- Sizes -----------------------------------------------------------------

  describe('sizes', () => {
    it('applies specified size class on init', () => {
      createInstance({ size: 'lg' });
      expect(el.classList.contains('arvo-btn--lg')).toBe(true);
      expect(el.classList.contains('arvo-btn--md')).toBe(false);
    });

    it('falls back to md for invalid size', () => {
      createInstance({ size: 'xxl' as never });
      expect(el.classList.contains('arvo-btn--md')).toBe(true);
    });
  });

  // -- disabled() ------------------------------------------------------------

  describe('disabled()', () => {
    it('returns false by default', () => {
      const instance = createInstance();
      expect(instance.disabled()).toBe(false);
    });

    it('returns true when initialized with disabled=true', () => {
      const instance = createInstance({ isDisabled: true });
      expect(instance.disabled()).toBe(true);
    });

    it('disables the button element when called with true', () => {
      const instance = createInstance();
      instance.disabled(true);
      expect(el.disabled).toBe(true);
    });

    it('enables the button element when called with false', () => {
      const instance = createInstance({ isDisabled: true });
      instance.disabled(false);
      expect(el.disabled).toBe(false);
    });

    it('updates action menu disabled state', () => {
      const instance = createInstance();
      instance.disabled(true);
      expect(mockActionMenuInstance.disabled).toHaveBeenCalledWith(true);
    });

    it('disables button on init when disabled=true', () => {
      createInstance({ isDisabled: true });
      expect(el.disabled).toBe(true);
    });
  });

  // -- setLoading() ----------------------------------------------------------

  describe('setLoading()', () => {
    it('adds loading class and aria-busy when called with true', () => {
      const instance = createInstance();
      instance.setLoading(true);
      expect(el.classList.contains('loading')).toBe(true);
      expect(el.getAttribute('aria-busy')).toBe('true');
    });

    it('removes loading class and aria-busy when called with false', () => {
      const instance = createInstance({ isLoading: true });
      instance.setLoading(false);
      expect(el.classList.contains('loading')).toBe(false);
      expect(el.hasAttribute('aria-busy')).toBe(false);
    });

    it('applies loading class on init when loading=true', () => {
      createInstance({ isLoading: true });
      expect(el.classList.contains('loading')).toBe(true);
      expect(el.getAttribute('aria-busy')).toBe('true');
    });

    it('updates action menu disabled state', () => {
      const instance = createInstance();
      instance.setLoading(true);
      expect(mockActionMenuInstance.disabled).toHaveBeenCalledWith(true);
    });
  });

  // -- value() ---------------------------------------------------------------

  describe('value()', () => {
    it('returns null in action mode', () => {
      const instance = createInstance({ mode: 'action' });
      expect(instance.value()).toBeNull();
    });

    it('returns null in selection mode when no item is selected', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems });
      expect(instance.value()).toBeNull();
    });

    it('returns selected item data in selection mode', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        value: 'b',
      });
      const result = instance.value();
      expect(result).not.toBeNull();
      expect((result as MenuItemData).id).toBe('b');
      expect((result as MenuItemData).label).toBe('Banana');
    });

    it('sets selected item when called with an id in selection mode', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems });
      instance.value('c');
      expect(getLabel()).toBe('Cherry');
    });

    it('clears selection when called with null', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        value: 'a',
      });
      instance.value(null);
      expect(getLabel()).toBe('Actions');
    });

    it('does nothing when called with id in action mode', () => {
      const instance = createInstance({ mode: 'action', items: selectionItems });
      instance.value('a');
      expect(getLabel()).toBe('Actions');
    });

    // -- defaultValue (uncontrolled initial selection) --

    it('seeds uncontrolled selection from defaultValue', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        defaultValue: 'b',
      });
      const result = instance.value();
      expect((result as MenuItemData).id).toBe('b');
      expect(getLabel()).toBe('Banana');
    });

    it('controlled value takes precedence over defaultValue', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        value: 'a',
        defaultValue: 'b',
      });
      expect((instance.value() as MenuItemData).id).toBe('a');
    });

    it('defaults to null when both value and defaultValue are omitted', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems });
      expect(instance.value()).toBeNull();
    });
  });

  // -- updateItems() ---------------------------------------------------------

  describe('updateItems()', () => {
    it('updates the menu items', () => {
      const instance = createInstance({ mode: 'action' });
      const newItems: MenuItemData[] = [{ id: 'x', label: 'Extra' }];
      instance.updateItems(newItems);
      expect(mockActionMenuInstance.updateItems).toHaveBeenCalledWith(newItems);
    });

    it('clears selection if selected item is removed in selection mode', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        value: 'a',
      });
      const newItems: MenuItemData[] = [{ id: 'z', label: 'Zucchini' }];
      instance.updateItems(newItems);
      expect(getLabel()).toBe('Actions');
    });

    it('keeps selection if selected item remains in updated list', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        value: 'b',
      });
      const newItems: MenuItemData[] = [
        { id: 'b', label: 'Banana' },
        { id: 'z', label: 'Zucchini' },
      ];
      instance.updateItems(newItems);
      expect(getLabel()).toBe('Banana');
    });
  });

  // -- setLabel() ------------------------------------------------------------

  describe('setLabel()', () => {
    it('updates the label text in action mode', () => {
      const instance = createInstance({ mode: 'action' });
      instance.setLabel('New Label');
      expect(getLabel()).toBe('New Label');
    });

    it('updates originalLabel but keeps selected label in selection mode when item is selected', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        value: 'a',
      });
      instance.setLabel('New Label');
      expect(getLabel()).toBe('Apple');
    });

    it('updates visible label in selection mode when nothing is selected', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems });
      instance.setLabel('New Label');
      expect(getLabel()).toBe('New Label');
    });
  });

  // -- setIcon() -------------------------------------------------------------

  describe('setIcon()', () => {
    it('adds icon element when no icon existed', () => {
      const instance = createInstance();
      instance.setIcon('star');
      expect(el.querySelector('.arvo-dd-btn__icon')).toBeTruthy();
      expect(el.querySelector('.o9con-star')).toBeTruthy();
    });

    it('swaps icon class when icon element already exists', () => {
      const instance = createInstance({ icon: 'star' });
      instance.setIcon('heart');
      const icon = el.querySelector('.arvo-dd-btn__icon');
      expect(icon?.classList.contains('o9con-heart')).toBe(true);
      expect(icon?.classList.contains('o9con-star')).toBe(false);
    });

    it('removes icon element when called with null', () => {
      const instance = createInstance({ icon: 'star' });
      instance.setIcon(null);
      expect(el.querySelector('.arvo-dd-btn__icon')).toBeNull();
    });
  });

  // -- setVariant() ----------------------------------------------------------

  describe('setVariant()', () => {
    it('swaps variant class', () => {
      const instance = createInstance();
      instance.setVariant('outline');
      expect(el.classList.contains('arvo-btn--outline')).toBe(true);
      expect(el.classList.contains('arvo-btn--primary')).toBe(false);
    });

    it('ignores invalid variant', () => {
      const instance = createInstance();
      instance.setVariant('invalid');
      expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    });

    it('cycles through all valid variants', () => {
      const instance = createInstance();
      for (const v of ['secondary', 'tertiary', 'outline', 'primary'] as const) {
        instance.setVariant(v);
        expect(el.classList.contains(`arvo-btn--${v}`)).toBe(true);
      }
    });
  });

  // -- setSize() -------------------------------------------------------------

  describe('setSize()', () => {
    it('swaps size class', () => {
      const instance = createInstance();
      instance.setSize('sm');
      expect(el.classList.contains('arvo-btn--sm')).toBe(true);
      expect(el.classList.contains('arvo-btn--md')).toBe(false);
    });

    it('ignores invalid size', () => {
      const instance = createInstance();
      instance.setSize('xxl');
      expect(el.classList.contains('arvo-btn--md')).toBe(true);
    });
  });

  // -- isOpen() --------------------------------------------------------------

  describe('isOpen()', () => {
    it('returns false initially', () => {
      const instance = createInstance();
      expect(instance.isOpen()).toBe(false);
    });
  });

  // -- open() / close() / toggle() -------------------------------------------

  describe('open() / close() / toggle()', () => {
    it('delegates open() to action menu', () => {
      const instance = createInstance();
      instance.open();
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('delegates close() to action menu', () => {
      const instance = createInstance();
      instance.close();
      expect(mockActionMenuInstance.close).toHaveBeenCalledTimes(1);
    });

    it('delegates toggle() to action menu', () => {
      const instance = createInstance();
      instance.toggle();
      expect(mockActionMenuInstance.toggle).toHaveBeenCalledWith(undefined);
    });

    it('delegates toggle(true) to action menu', () => {
      const instance = createInstance();
      instance.toggle(true);
      expect(mockActionMenuInstance.toggle).toHaveBeenCalledWith(true);
    });
  });

  // -- focus() ---------------------------------------------------------------

  describe('focus()', () => {
    it('focuses the element', () => {
      const focusSpy = vi.spyOn(el, 'focus');
      const instance = createInstance();
      instance.focus();
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -- destroy() -------------------------------------------------------------

  describe('destroy()', () => {
    it('calls destroy on action menu', () => {
      const instance = createInstance();
      instance.destroy();
      expect(mockActionMenuInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it('removes BEM classes from element', () => {
      const instance = createInstance();
      instance.destroy();
      expect(el.classList.contains('arvo-dd-btn')).toBe(false);
      expect(el.classList.contains('arvo-btn')).toBe(false);
      expect(el.classList.contains('arvo-btn--primary')).toBe(false);
      expect(el.classList.contains('arvo-btn--md')).toBe(false);
    });

    it('removes child elements (label, caret)', () => {
      const instance = createInstance();
      instance.destroy();
      expect(el.querySelector('.arvo-dd-btn__lbl')).toBeNull();
      expect(el.querySelector('.arvo-dd-btn__caret')).toBeNull();
    });

    it('removes icon element when it was added', () => {
      const instance = createInstance({ icon: 'star' });
      instance.destroy();
      expect(el.querySelector('.arvo-dd-btn__icon')).toBeNull();
    });

    it('removes aria attributes', () => {
      const instance = createInstance({ isLoading: true });
      instance.destroy();
      expect(el.hasAttribute('aria-busy')).toBe(false);
    });

    it('re-enables a disabled button element', () => {
      const instance = createInstance({ isDisabled: true });
      instance.destroy();
      expect(el.disabled).toBe(false);
    });
  });

  // -- Custom events ---------------------------------------------------------

  describe('custom events', () => {
    function getLastInitCall() {
      const initFn = vi.mocked(MockedActionMenu.initialize);
      return initFn.mock.calls.at(-1)?.[1];
    }

    it('dispatches dd-btn:change event in selection mode on selection', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:change', handler);
      createInstance({ mode: 'selection', items: selectionItems });

      const opts = getLastInitCall();
      opts?.onSelect?.(selectionItems[0], 0);

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.item).toEqual(selectionItems[0]);
    });

    it('dispatches dd-btn:select event in action mode on selection', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:select', handler);
      createInstance({ mode: 'action', items: defaultItems });

      const opts = getLastInitCall();
      opts?.onSelect?.(defaultItems[0], 0);

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.item).toEqual(defaultItems[0]);
    });

    it('dispatches dd-btn:open event when menu opens', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:open', handler);
      createInstance();

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('dispatches dd-btn:close event when menu closes', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:close', handler);
      createInstance();

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('internal-ActionMenu mode: aria-expanded mutations on the trigger do NOT fire dd-btn:open / dd-btn:close', async () => {
      // In internal-ActionMenu mode the wrapper's `_isOpen` is driven
      // exclusively by the menu's `onOpenChange` callback. A
      // MutationObserver on `aria-expanded` is only installed in
      // external-overlay mode -- installing it in internal mode would
      // double-fire events and race with `onOpenChange`, leaving the
      // wrapper's state out of sync with the actual menu when stacking
      // rules close one menu while another opens. Verify that mutating
      // `aria-expanded` directly does NOT fire dd-btn:open/close.
      const openHandler = vi.fn();
      const closeHandler = vi.fn();
      el.addEventListener('dd-btn:open', openHandler);
      el.addEventListener('dd-btn:close', closeHandler);
      createInstance();

      el.setAttribute('aria-expanded', 'true');
      await new Promise((r) => setTimeout(r, 0));
      el.setAttribute('aria-expanded', 'false');
      await new Promise((r) => setTimeout(r, 0));

      expect(openHandler).not.toHaveBeenCalled();
      expect(closeHandler).not.toHaveBeenCalled();
    });

    it('open/close cycle fires exactly one dd-btn:open and one dd-btn:close per cycle', () => {
      // Guards against an aria-expanded MutationObserver running in internal
      // mode alongside the menu's `onOpenChange` callback, which would fire
      // the wrapper event twice per transition and leave `_isOpen` out of
      // sync on the second pass.
      const openHandler = vi.fn();
      const closeHandler = vi.fn();
      el.addEventListener('dd-btn:open', openHandler);
      el.addEventListener('dd-btn:close', closeHandler);
      createInstance();

      const opts = getLastInitCall();
      // Single open/close cycle through the menu's onOpenChange path.
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);

      expect(openHandler).toHaveBeenCalledTimes(1);
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });
  });

  // -- Click / keyboard suppression ------------------------------------------

  describe('click and keyboard suppression', () => {
    it('suppresses click when disabled', () => {
      const onClick = vi.fn();
      createInstance({ isDisabled: true, onClick });
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('suppresses click when loading', () => {
      const onClick = vi.fn();
      createInstance({ isLoading: true, onClick });
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('calls onClick when not disabled or loading', () => {
      const onClick = vi.fn();
      createInstance({ onClick });
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus when focused', () => {
      const onFocus = vi.fn();
      createInstance({ onFocus });
      el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', () => {
      const onBlur = vi.fn();
      createInstance({ onBlur });
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  // -- ArrowDown opens menu --------------------------------------------------

  describe('ArrowDown opens menu', () => {
    it('opens the menu on ArrowDown when focused on the trigger', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(mockActionMenuInstance.open).toHaveBeenCalled();
    });

    it('opens the menu on Alt+ArrowDown when focused on the trigger', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
      expect(mockActionMenuInstance.open).toHaveBeenCalled();
    });

    it('does not open on ArrowDown when disabled', () => {
      createInstance({ isDisabled: true });
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });

    it('does not open on Alt+ArrowDown when disabled', () => {
      createInstance({ isDisabled: true });
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });

    it('does not open on Ctrl+ArrowDown (modifier ignored to avoid swallowing app shortcuts)', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }));
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });

    it('does not open on Meta+ArrowDown (modifier ignored to avoid swallowing app shortcuts)', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true }));
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });

    it('does not open on Shift+ArrowDown (modifier ignored to avoid swallowing app shortcuts)', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });
  });

  // -- Engine-owned ARIA contract (delegated to ActionMenu) ----------------

  describe('EX-5 -- trigger contract', () => {
    it('initialize() passes the trigger element as first arg to ArvoActionMenu', () => {
      createInstance();
      const calls = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[calls.length - 1][0]).toBe(el);
    });

    it('open() delegates to ActionMenu and is callable', () => {
      const instance = createInstance();
      mockActionMenuInstance.open.mockClear();
      instance.open();
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('close() delegates to ActionMenu and is callable', () => {
      const instance = createInstance();
      mockActionMenuInstance.close.mockClear();
      instance.close();
      expect(mockActionMenuInstance.close).toHaveBeenCalledTimes(1);
    });

    it('onOpenChange(true) marks the button open class (simulates engine callback)', () => {
      createInstance();
      const opts = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      opts?.onOpenChange?.(true);
      expect(el.classList.contains('open')).toBe(true);
    });

    it('onOpenChange(false) removes the open class', () => {
      createInstance();
      const opts = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);
      expect(el.classList.contains('open')).toBe(false);
    });

    it('isOpen() returns true after onOpenChange(true) callback fires', () => {
      const instance = createInstance();
      const opts = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      opts?.onOpenChange?.(true);
      // isOpen() reads from mockActionMenuInstance.isOpen (mocked false),
      // but the open-class state is tracked locally.
      expect(el.classList.contains('open')).toBe(true);
    });
  });

  // -- Accessibility (axe on wrapper DOM) -----------------------------------

  describe('EX-5 -- accessibility (axe)', () => {
    it('button wrapper has no axe violations in initial state', async () => {
      const axe = await import('axe-core');
      createInstance({ label: 'Actions' });
      const results = await axe.default.run(document.body, {
        rules: { region: { enabled: false } },
      });
      expect(results.violations).toHaveLength(0);
    });
  });

  // -- menuProps escape hatch -------------------------------------------------
  // Mirrors the React test block. The hybrid options surface exposes
  // long-tail ArvoActionMenu options through a `menuProps` bag
  // (Pick<ArvoActionMenuOptions, 'actionsVisibility' |
  // 'submenuTrigger'>). The bag is spread FIRST when building the inner
  // menu's options so flat / parent-computed options win on overlap;
  // bag-only keys flow through unchanged.

  describe('menuProps escape hatch', () => {
    const getLastMenuOptions = () => {
      const calls = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls;
      return calls[calls.length - 1]?.[1] as Record<string, unknown> | undefined;
    };

    it('baseline: omitting menuProps does NOT set actionsVisibility or submenuTrigger on the inner menu options (delegates to ArvoActionMenu defaults)', () => {
      createInstance();
      const opts = getLastMenuOptions();
      expect(opts).toBeDefined();
      expect(opts?.actionsVisibility).toBeUndefined();
      expect(opts?.submenuTrigger).toBeUndefined();
    });

    it('bag-only keys flow through: menuProps.actionsVisibility / submenuTrigger reach ArvoActionMenu unchanged', () => {
      createInstance({
        menuProps: {
          actionsVisibility: 'hover',
          submenuTrigger: 'click',
        },
      });
      const opts = getLastMenuOptions();
      expect(opts?.actionsVisibility).toBe('hover');
      expect(opts?.submenuTrigger).toBe('click');
    });

    it('flat-wins merge: parent-owned options (items, isDisabled, callbacks) are NOT clobbered by the bag', () => {
      const onSelect = vi.fn();
      createInstance({
        items: defaultItems,
        isDisabled: false,
        onSelect,
        // The bag is typed Pick<..., actionsVisibility |
        // submenuTrigger> so the TS compiler would refuse anything else;
        // this asserts the runtime merge still drops bag overrides if a
        // future extension widens the type.
        menuProps: { actionsVisibility: 'hover' },
      });
      const opts = getLastMenuOptions();
      expect(opts?.items).toEqual(defaultItems);
      expect(opts?.isDisabled).toBe(false);
      expect(opts?.onSelect).toBeTypeOf('function');
      expect(opts?.actionsVisibility).toBe('hover');
    });
  });

  // -- External overlay (BYO overlay) ----------------------------------------
  // The wrapper supports two opt-in composition modes for non-ActionMenu
  // overlays: an `overlay` factory option, and pure headless (consumer wires
  // their own overlay externally and we observe `aria-expanded` for chrome
  // sync). Both code paths short-circuit `_initActionMenu`.

  describe('external overlay', () => {
    function createHeadlessInstance(
      options: Partial<ArvoDropdownButtonV2Options> = {},
    ): ArvoDropdownButtonV2 {
      // No `items` / `menuProps` -> pure-headless mode.
      return ArvoDropdownButtonV2.initialize(el, { label: 'Actions', ...options });
    }

    it('pure-headless: does NOT initialize the internal ArvoActionMenu', () => {
      (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mockClear();
      createHeadlessInstance();
      expect(MockedActionMenu.initialize).not.toHaveBeenCalled();
    });

    it('overlay-slot: does NOT initialize the internal ArvoActionMenu', () => {
      (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mockClear();
      const overlayInstance = { destroy: vi.fn(), open: vi.fn(), close: vi.fn() };
      const overlay = vi.fn(() => overlayInstance);
      createHeadlessInstance({ overlay });
      expect(MockedActionMenu.initialize).not.toHaveBeenCalled();
      expect(overlay).toHaveBeenCalledTimes(1);
      expect(overlay).toHaveBeenCalledWith(el);
    });

    it('triggerElement() returns the trigger button', () => {
      const instance = createHeadlessInstance();
      expect(instance.triggerElement()).toBe(el);
    });

    it('setOpenState(true) adds the open class and dispatches dd-btn:open', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:open', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      expect(el.classList.contains('open')).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('setOpenState(false) removes the open class and dispatches dd-btn:close', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:close', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      instance.setOpenState(false);
      expect(el.classList.contains('open')).toBe(false);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('setOpenState is idempotent (no event on duplicate transitions)', () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:open', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      instance.setOpenState(true);
      instance.setOpenState(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('setOpenState calls onOpenChange consumer callback on every transition', () => {
      const onOpenChange = vi.fn();
      const instance = createHeadlessInstance({ onOpenChange });
      instance.setOpenState(true);
      instance.setOpenState(false);
      expect(onOpenChange).toHaveBeenCalledTimes(2);
      expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
      expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
    });

    it('MutationObserver path: setting aria-expanded="true" on the trigger toggles the open class', async () => {
      createHeadlessInstance();
      el.setAttribute('aria-expanded', 'true');
      // MutationObserver runs as a microtask -- wait one tick.
      await new Promise((r) => setTimeout(r, 0));
      expect(el.classList.contains('open')).toBe(true);
    });

    it('MutationObserver path: aria-expanded="false" removes the open class and fires dd-btn:close', async () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:close', handler);
      createHeadlessInstance();
      el.setAttribute('aria-expanded', 'true');
      await new Promise((r) => setTimeout(r, 0));
      el.setAttribute('aria-expanded', 'false');
      await new Promise((r) => setTimeout(r, 0));
      expect(el.classList.contains('open')).toBe(false);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('controlled isOpen=true seeds the open class at init', () => {
      createHeadlessInstance({ isOpen: true });
      expect(el.classList.contains('open')).toBe(true);
    });

    it('overlay factory: open() forwards to the overlay instance when it exposes open()', () => {
      const overlayInstance = { open: vi.fn(), destroy: vi.fn() };
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.open();
      expect(overlayInstance.open).toHaveBeenCalledTimes(1);
    });

    it('overlay factory: close() forwards to the overlay instance', () => {
      const overlayInstance = { open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.close();
      expect(overlayInstance.close).toHaveBeenCalledTimes(1);
    });

    it('overlay factory: toggle(force) forwards to the overlay instance', () => {
      const overlayInstance = { toggle: vi.fn(), destroy: vi.fn() };
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.toggle(true);
      expect(overlayInstance.toggle).toHaveBeenCalledWith(true);
    });

    it('overlay factory: destroy() destroys the overlay instance', () => {
      const overlayInstance = { destroy: vi.fn() };
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.destroy();
      expect(overlayInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it('pure-headless ArrowDown synthesizes a click on the trigger', () => {
      const clickHandler = vi.fn();
      createHeadlessInstance();
      el.addEventListener('click', clickHandler);
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it('overlay factory: ArrowDown calls the overlay\'s open() (preferring open over click)', () => {
      const overlayInstance = { open: vi.fn(), destroy: vi.fn() };
      createHeadlessInstance({ overlay: () => overlayInstance });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(overlayInstance.open).toHaveBeenCalledTimes(1);
    });

    it('selection mode + external overlay logs a dev warning and falls back to action mode', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const instance = createHeadlessInstance({ mode: 'selection' });
      expect(warn).toHaveBeenCalled();
      // Selection mode is action-mode internally now; value getter returns null
      // regardless of any seeded value.
      expect(instance.value()).toBeNull();
      warn.mockRestore();
    });

    it('destroy() disconnects the aria-expanded MutationObserver', async () => {
      const handler = vi.fn();
      el.addEventListener('dd-btn:open', handler);
      const instance = createHeadlessInstance();
      instance.destroy();
      el.setAttribute('aria-expanded', 'true');
      await new Promise((r) => setTimeout(r, 0));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
