// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoDropdownIconButton } from './DropdownIconButton';
import type { ArvoDropdownIconButtonOptions, MenuItemData } from './DropdownIconButton';
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
  { id: '1', label: 'Edit' },
  { id: '2', label: 'Delete' },
  { id: '3', label: 'Share' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let el: HTMLButtonElement;

function createInstance(options: Partial<ArvoDropdownIconButtonOptions> = {}): ArvoDropdownIconButton {
  return ArvoDropdownIconButton.initialize(el, { icon: 'ellipsis-v', items: defaultItems, ...options });
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

describe('ArvoDropdownIconButton', () => {
  // -- Initialization --------------------------------------------------------

  describe('initialization', () => {
    it('creates an instance via initialize()', () => {
      const instance = createInstance();
      expect(instance).toBeInstanceOf(ArvoDropdownIconButton);
    });

    it('creates an instance via constructor', () => {
      const instance = new ArvoDropdownIconButton(el, { items: defaultItems });
      expect(instance).toBeInstanceOf(ArvoDropdownIconButton);
    });

    it('applies arvo-dd-icon-btn and arvo-btn classes', () => {
      createInstance();
      expect(el.classList.contains('arvo-dd-icon-btn')).toBe(true);
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

    it('renders icon element with correct class', () => {
      createInstance({ icon: 'star' });
      const icon = el.querySelector('.arvo-dd-icon-btn__icon');
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains('o9con-star')).toBe(true);
    });

    it('renders caret by default (non-compact)', () => {
      createInstance();
      const caret = el.querySelector('.arvo-dd-icon-btn__caret');
      expect(caret).toBeTruthy();
      expect(caret?.classList.contains('o9con-angle-down')).toBe(true);
    });

    it('does not render caret in compact mode', () => {
      createInstance({ isCompact: true });
      expect(el.querySelector('.arvo-dd-icon-btn__caret')).toBeNull();
    });

    it('applies compact class when compact=true', () => {
      createInstance({ isCompact: true });
      expect(el.classList.contains('arvo-dd-icon-btn--compact')).toBe(true);
    });

    it('sets aria-label from tooltip option', () => {
      createInstance({ tooltip: 'More options' });
      expect(el.getAttribute('aria-label')).toBe('More options');
      // Tooltip is managed by connectTooltip, not a native title attribute.
    });

    it('uses default icon (ellipsis-v) when no icon is provided', () => {
      const instance = ArvoDropdownIconButton.initialize(el, { items: defaultItems });
      expect(el.querySelector('.o9con-ellipsis-v')).toBeTruthy();
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

  // -- Sizes -----------------------------------------------------------------

  describe('sizes', () => {
    it('applies specified size class on init', () => {
      createInstance({ size: 'sm' });
      expect(el.classList.contains('arvo-btn--sm')).toBe(true);
      expect(el.classList.contains('arvo-btn--md')).toBe(false);
    });

    it('falls back to md for invalid size', () => {
      createInstance({ size: 'xl' as never });
      expect(el.classList.contains('arvo-btn--md')).toBe(true);
    });
  });

  // -- compact() -------------------------------------------------------------

  describe('compact()', () => {
    it('returns false by default', () => {
      const instance = createInstance();
      expect(instance.compact()).toBe(false);
    });

    it('returns true when initialized with compact=true', () => {
      const instance = createInstance({ isCompact: true });
      expect(instance.compact()).toBe(true);
    });

    it('adds compact class when called with true', () => {
      const instance = createInstance();
      instance.compact(true);
      expect(el.classList.contains('arvo-dd-icon-btn--compact')).toBe(true);
    });

    it('removes caret when compact is set to true', () => {
      const instance = createInstance();
      expect(el.querySelector('.arvo-dd-icon-btn__caret')).toBeTruthy();
      instance.compact(true);
      expect(el.querySelector('.arvo-dd-icon-btn__caret')).toBeNull();
    });

    it('removes compact class when called with false', () => {
      const instance = createInstance({ isCompact: true });
      instance.compact(false);
      expect(el.classList.contains('arvo-dd-icon-btn--compact')).toBe(false);
    });

    it('adds caret back when compact is set to false', () => {
      const instance = createInstance({ isCompact: true });
      expect(el.querySelector('.arvo-dd-icon-btn__caret')).toBeNull();
      instance.compact(false);
      expect(el.querySelector('.arvo-dd-icon-btn__caret')).toBeTruthy();
    });

    it('does nothing when setting same compact state again', () => {
      const instance = createInstance({ isCompact: false });
      instance.compact(false);
      expect(el.classList.contains('arvo-dd-icon-btn--compact')).toBe(false);
    });
  });

  // -- setIcon() -------------------------------------------------------------

  describe('setIcon()', () => {
    it('swaps icon class to new icon', () => {
      const instance = createInstance({ icon: 'star' });
      instance.setIcon('heart');
      const icon = el.querySelector('.arvo-dd-icon-btn__icon');
      expect(icon?.classList.contains('o9con-heart')).toBe(true);
      expect(icon?.classList.contains('o9con-star')).toBe(false);
    });

    it('does nothing if icon element does not exist', () => {
      const instance = createInstance();
      instance['_iconEl'] = null;
      expect(() => instance.setIcon('heart')).not.toThrow();
    });
  });

  // -- setTooltip() ----------------------------------------------------------

  describe('setTooltip()', () => {
    it('sets aria-label attribute', () => {
      const instance = createInstance();
      instance.setTooltip('New tooltip');
      expect(el.getAttribute('aria-label')).toBe('New tooltip');
      // Tooltip is managed by connectTooltip, not a native title attribute.
    });

    it('removes aria-label when called with null', () => {
      const instance = createInstance({ tooltip: 'My tip' });
      instance.setTooltip(null);
      expect(el.hasAttribute('aria-label')).toBe(false);
      // Tooltip is managed by connectTooltip, not a native title attribute.
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

    it('updates action menu disabled state when loading', () => {
      const instance = createInstance();
      instance.setLoading(true);
      expect(mockActionMenuInstance.disabled).toHaveBeenCalledWith(true);
    });
  });

  // -- setVariant() ----------------------------------------------------------

  describe('setVariant()', () => {
    it('swaps variant class', () => {
      const instance = createInstance();
      instance.setVariant('tertiary');
      expect(el.classList.contains('arvo-btn--tertiary')).toBe(true);
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
      instance.setSize('lg');
      expect(el.classList.contains('arvo-btn--lg')).toBe(true);
      expect(el.classList.contains('arvo-btn--md')).toBe(false);
    });

    it('ignores invalid size', () => {
      const instance = createInstance();
      instance.setSize('xxl');
      expect(el.classList.contains('arvo-btn--md')).toBe(true);
    });
  });

  // -- updateItems() ---------------------------------------------------------

  describe('updateItems()', () => {
    it('updates action menu items', () => {
      const instance = createInstance();
      const newItems: MenuItemData[] = [{ id: 'x', label: 'Extra' }];
      instance.updateItems(newItems);
      expect(mockActionMenuInstance.updateItems).toHaveBeenCalledWith(newItems);
    });
  });

  // -- isOpen() / open() / close() / toggle() --------------------------------

  describe('isOpen() / open() / close() / toggle()', () => {
    it('returns false initially', () => {
      const instance = createInstance();
      expect(instance.isOpen()).toBe(false);
    });

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
      expect(el.classList.contains('arvo-dd-icon-btn')).toBe(false);
      expect(el.classList.contains('arvo-btn')).toBe(false);
      expect(el.classList.contains('arvo-btn--primary')).toBe(false);
      expect(el.classList.contains('arvo-btn--md')).toBe(false);
    });

    it('removes compact class if it was added', () => {
      const instance = createInstance({ isCompact: true });
      instance.destroy();
      expect(el.classList.contains('arvo-dd-icon-btn--compact')).toBe(false);
    });

    it('removes icon and caret child elements', () => {
      const instance = createInstance();
      instance.destroy();
      expect(el.querySelector('.arvo-dd-icon-btn__icon')).toBeNull();
      expect(el.querySelector('.arvo-dd-icon-btn__caret')).toBeNull();
    });

    it('removes aria attributes', () => {
      const instance = createInstance({ tooltip: 'tip', isLoading: true });
      instance.destroy();
      expect(el.hasAttribute('aria-label')).toBe(false);
      expect(el.hasAttribute('aria-busy')).toBe(false);
      expect(el.hasAttribute('title')).toBe(false);
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

    it('dispatches dd-icon-btn:select event when item is selected', () => {
      const handler = vi.fn();
      el.addEventListener('dd-icon-btn:select', handler);
      createInstance();

      const opts = getLastInitCall();
      opts?.onSelect?.(defaultItems[0], 0);

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.item).toEqual(defaultItems[0]);
      expect(event.detail.index).toBe(0);
    });

    it('dispatches dd-icon-btn:open event when menu opens', () => {
      const handler = vi.fn();
      el.addEventListener('dd-icon-btn:open', handler);
      createInstance();

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('dispatches dd-icon-btn:close event when menu closes', () => {
      const handler = vi.fn();
      el.addEventListener('dd-icon-btn:close', handler);
      createInstance();

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('adds open class to element when menu opens', () => {
      createInstance();

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);

      expect(el.classList.contains('open')).toBe(true);
    });

    it('removes open class from element when menu closes', () => {
      createInstance();

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);

      expect(el.classList.contains('open')).toBe(false);
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

    it('onOpenChange(true) adds open class (engine callback simulation)', () => {
      createInstance();
      const opts = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      opts?.onOpenChange?.(true);
      expect(el.classList.contains('open')).toBe(true);
    });

    it('onOpenChange(false) removes open class', () => {
      createInstance();
      const opts = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);
      expect(el.classList.contains('open')).toBe(false);
    });
  });

  // -- Accessibility (axe on wrapper DOM) -----------------------------------

  describe('EX-5 -- accessibility (axe)', () => {
    it('button wrapper has no axe violations in initial state', async () => {
      const axe = await import('axe-core');
      createInstance({ tooltip: 'More actions' });
      const results = await axe.default.run(document.body, {
        rules: { region: { enabled: false } },
      });
      expect(results.violations).toHaveLength(0);
    });
  });

  // -- menuProps escape hatch -------------------------------------------------

  describe('menuProps escape hatch', () => {
    const getLastMenuOptions = () => {
      const calls = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls;
      return calls[calls.length - 1]?.[1] as Record<string, unknown> | undefined;
    };

    it('baseline: omitting menuProps does NOT set bag-only inner options', () => {
      createInstance();
      const opts = getLastMenuOptions();
      expect(opts?.actionsVisibility).toBeUndefined();
      expect(opts?.submenuTrigger).toBeUndefined();
    });

    it('bag-only keys flow through to ArvoActionMenu', () => {
      createInstance({
        menuProps: { actionsVisibility: 'hover', submenuTrigger: 'click' },
      });
      const opts = getLastMenuOptions();
      expect(opts?.actionsVisibility).toBe('hover');
      expect(opts?.submenuTrigger).toBe('click');
    });

    it('flat-wins merge: parent-owned options (items, isDisabled, callbacks) are not clobbered', () => {
      const onSelect = vi.fn();
      createInstance({
        items: defaultItems,
        isDisabled: false,
        onSelect,
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

  describe('external overlay', () => {
    function createHeadlessInstance(
      options: Partial<ArvoDropdownIconButtonOptions> = {},
    ): ArvoDropdownIconButton {
      return ArvoDropdownIconButton.initialize(el, {
        icon: 'ellipsis-v',
        tooltip: 'More',
        ...options,
      });
    }

    it('pure-headless: does NOT initialize the internal ArvoActionMenu', () => {
      (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mockClear();
      createHeadlessInstance();
      expect(MockedActionMenu.initialize).not.toHaveBeenCalled();
    });

    it('overlay-slot: invokes the factory with the trigger element', () => {
      const overlayInstance = { open: vi.fn(), destroy: vi.fn() };
      const overlay = vi.fn(() => overlayInstance);
      createHeadlessInstance({ overlay });
      expect(overlay).toHaveBeenCalledTimes(1);
      expect(overlay).toHaveBeenCalledWith(el);
    });

    it('triggerElement() returns the trigger button', () => {
      const instance = createHeadlessInstance();
      expect(instance.triggerElement()).toBe(el);
    });

    it('setOpenState(true) flips chrome and dispatches dd-icon-btn:open', () => {
      const handler = vi.fn();
      el.addEventListener('dd-icon-btn:open', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      expect(el.classList.contains('open')).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('setOpenState(false) dispatches dd-icon-btn:close', () => {
      const handler = vi.fn();
      el.addEventListener('dd-icon-btn:close', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      instance.setOpenState(false);
      expect(el.classList.contains('open')).toBe(false);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('MutationObserver: aria-expanded="true" on the trigger flips chrome', async () => {
      createHeadlessInstance();
      el.setAttribute('aria-expanded', 'true');
      await new Promise((r) => setTimeout(r, 0));
      expect(el.classList.contains('open')).toBe(true);
    });

    it('overlay factory: open() / close() / toggle() forward to the instance', () => {
      const overlayInstance = {
        open: vi.fn(),
        close: vi.fn(),
        toggle: vi.fn(),
        destroy: vi.fn(),
      };
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.open();
      instance.close();
      instance.toggle(true);
      expect(overlayInstance.open).toHaveBeenCalledTimes(1);
      expect(overlayInstance.close).toHaveBeenCalledTimes(1);
      expect(overlayInstance.toggle).toHaveBeenCalledWith(true);
    });

    it('destroy() destroys the overlay instance and disconnects the observer', async () => {
      const overlayInstance = { destroy: vi.fn() };
      const openHandler = vi.fn();
      el.addEventListener('dd-icon-btn:open', openHandler);
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.destroy();
      expect(overlayInstance.destroy).toHaveBeenCalledTimes(1);
      el.setAttribute('aria-expanded', 'true');
      await new Promise((r) => setTimeout(r, 0));
      expect(openHandler).not.toHaveBeenCalled();
    });

    it('controlled isOpen=true seeds the open class at init', () => {
      createHeadlessInstance({ isOpen: true });
      expect(el.classList.contains('open')).toBe(true);
    });
  });
});
