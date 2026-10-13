// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoSplitButton } from './SplitButton';
import type { ArvoSplitButtonOptions, MenuItemData } from './SplitButton';
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

vi.mock('@arvo/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arvo/core')>();
  return {
    ...actual,
    connectTooltip: vi.fn(() => ({ destroy: vi.fn() })),
    tooltipManager: {},
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultItems: MenuItemData[] = [
  { id: '1', label: 'Cut' },
  { id: '2', label: 'Copy' },
  { id: '3', label: 'Paste' },
];

const selectionItems: MenuItemData[] = [
  { id: 'a', label: 'Apple', icon: 'apple' },
  { id: 'b', label: 'Banana' },
  { id: 'c', label: 'Cherry' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let el: HTMLDivElement;

function createInstance(options: Partial<ArvoSplitButtonOptions> = {}): ArvoSplitButton {
  return ArvoSplitButton.initialize(el, { label: 'Save', items: defaultItems, ...options });
}

function getActionEl(): HTMLButtonElement {
  return el.querySelector('.arvo-split-btn__action') as HTMLButtonElement;
}

function getTriggerEl(): HTMLButtonElement {
  return el.querySelector('.arvo-split-btn__trigger') as HTMLButtonElement;
}

function getLabel(): string {
  return el.querySelector('.arvo-split-btn__lbl')?.textContent ?? '';
}

function getLastInitCall() {
  const initFn = vi.mocked(MockedActionMenu.initialize);
  return initFn.mock.calls.at(-1)?.[1];
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  el = document.createElement('div');
  document.body.appendChild(el);
});

afterEach(() => {
  el.remove();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArvoSplitButton', () => {
  // -- Initialization --------------------------------------------------------

  describe('initialization', () => {
    it('creates an instance via initialize()', () => {
      const instance = createInstance();
      expect(instance).toBeInstanceOf(ArvoSplitButton);
    });

    it('creates an instance via constructor', () => {
      const instance = new ArvoSplitButton(el, { label: 'Test', items: defaultItems });
      expect(instance).toBeInstanceOf(ArvoSplitButton);
    });

    it('wrapper gets arvo-split-btn, variant, and size classes', () => {
      createInstance({ variant: 'secondary', size: 'lg' });
      expect(el.classList.contains('arvo-split-btn')).toBe(true);
      expect(el.classList.contains('arvo-split-btn--secondary')).toBe(true);
      expect(el.classList.contains('arvo-split-btn--lg')).toBe(true);
    });

    it('wrapper gets role="group"', () => {
      createInstance();
      expect(el.getAttribute('role')).toBe('group');
    });

    it('action button has correct classes and type', () => {
      createInstance({ variant: 'tertiary', size: 'sm' });
      const action = getActionEl();
      expect(action).toBeTruthy();
      expect(action.type).toBe('button');
      expect(action.classList.contains('arvo-btn')).toBe(true);
      expect(action.classList.contains('arvo-btn--tertiary')).toBe(true);
      expect(action.classList.contains('arvo-btn--sm')).toBe(true);
      expect(action.classList.contains('arvo-split-btn__action')).toBe(true);
    });

    it('trigger button has correct classes, type, and aria-label', () => {
      createInstance({ triggerLabel: 'Save options' });
      const trigger = getTriggerEl();
      expect(trigger).toBeTruthy();
      expect(trigger.type).toBe('button');
      expect(trigger.classList.contains('arvo-btn')).toBe(true);
      expect(trigger.classList.contains('arvo-btn--primary')).toBe(true);
      expect(trigger.classList.contains('arvo-btn--md')).toBe(true);
      expect(trigger.classList.contains('arvo-split-btn__trigger')).toBe(true);
      // aria-label is wrapper-owned; aria-haspopup / aria-expanded are engine-owned
      // (set by createOverlaySurface when the real ArvoActionMenu runs)
      expect(trigger.getAttribute('aria-label')).toBe('Save options');
    });

    it('trigger button defaults aria-label to "Show options"', () => {
      createInstance();
      expect(getTriggerEl().getAttribute('aria-label')).toBe('Show options');
    });

    it('renders label element with correct text', () => {
      createInstance({ label: 'Run' });
      expect(getLabel()).toBe('Run');
    });

    it('renders caret element with o9con-angle-down', () => {
      createInstance();
      const caret = el.querySelector('.arvo-split-btn__caret');
      expect(caret).toBeTruthy();
      expect(caret?.classList.contains('o9con-angle-down')).toBe(true);
    });

    it('renders icon element when icon option is set', () => {
      createInstance({ icon: 'save' });
      const icon = el.querySelector('.arvo-split-btn__icon');
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains('o9con-save')).toBe(true);
    });

    it('does not render icon element when icon is not set', () => {
      createInstance();
      expect(el.querySelector('.arvo-split-btn__icon')).toBeNull();
    });
  });

  // -- Variants -------------------------------------------------------------

  describe('variants', () => {
    it('applies default variant (primary) to wrapper and segments', () => {
      createInstance();
      expect(el.classList.contains('arvo-split-btn--primary')).toBe(true);
      expect(getActionEl().classList.contains('arvo-btn--primary')).toBe(true);
      expect(getTriggerEl().classList.contains('arvo-btn--primary')).toBe(true);
    });

    it('applies secondary variant', () => {
      createInstance({ variant: 'secondary' });
      expect(el.classList.contains('arvo-split-btn--secondary')).toBe(true);
      expect(getActionEl().classList.contains('arvo-btn--secondary')).toBe(true);
    });

    it('applies tertiary variant', () => {
      createInstance({ variant: 'tertiary' });
      expect(el.classList.contains('arvo-split-btn--tertiary')).toBe(true);
      expect(getActionEl().classList.contains('arvo-btn--tertiary')).toBe(true);
    });

    it('falls back to primary for invalid variant', () => {
      createInstance({ variant: 'invalid' as never });
      expect(el.classList.contains('arvo-split-btn--primary')).toBe(true);
    });
  });

  // -- Sizes -----------------------------------------------------------------

  describe('sizes', () => {
    it('applies default size (md)', () => {
      createInstance();
      expect(el.classList.contains('arvo-split-btn--md')).toBe(true);
      expect(getActionEl().classList.contains('arvo-btn--md')).toBe(true);
      expect(getTriggerEl().classList.contains('arvo-btn--md')).toBe(true);
    });

    it('applies sm size', () => {
      createInstance({ size: 'sm' });
      expect(el.classList.contains('arvo-split-btn--sm')).toBe(true);
      expect(getActionEl().classList.contains('arvo-btn--sm')).toBe(true);
    });

    it('applies lg size', () => {
      createInstance({ size: 'lg' });
      expect(el.classList.contains('arvo-split-btn--lg')).toBe(true);
      expect(getActionEl().classList.contains('arvo-btn--lg')).toBe(true);
    });

    it('falls back to md for invalid size', () => {
      createInstance({ size: 'xxl' as never });
      expect(el.classList.contains('arvo-split-btn--md')).toBe(true);
    });
  });

  // -- Disabled propagation --------------------------------------------------

  describe('disabled propagation', () => {
    it('isDisabled=true at init disables both segments and sets wrapper aria-disabled', () => {
      createInstance({ isDisabled: true });
      expect(getActionEl().disabled).toBe(true);
      expect(getTriggerEl().disabled).toBe(true);
      expect(el.getAttribute('aria-disabled')).toBe('true');
    });

    it('isActionDisabled=true at init disables only action', () => {
      createInstance({ isActionDisabled: true });
      expect(getActionEl().disabled).toBe(true);
      expect(getTriggerEl().disabled).toBe(false);
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });

    it('isTriggerDisabled=true at init disables only trigger', () => {
      createInstance({ isTriggerDisabled: true });
      expect(getActionEl().disabled).toBe(false);
      expect(getTriggerEl().disabled).toBe(true);
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });

    it('disabled(true) disables both segments and sets aria-disabled', () => {
      const instance = createInstance();
      instance.disabled(true);
      expect(getActionEl().disabled).toBe(true);
      expect(getTriggerEl().disabled).toBe(true);
      expect(el.getAttribute('aria-disabled')).toBe('true');
    });

    it('disabled(false) enables both segments and removes aria-disabled', () => {
      const instance = createInstance({ isDisabled: true });
      instance.disabled(false);
      expect(getActionEl().disabled).toBe(false);
      expect(getTriggerEl().disabled).toBe(false);
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });

    it('disabled() getter returns current state', () => {
      const instance = createInstance({ isDisabled: true });
      expect(instance.disabled()).toBe(true);
    });

    it('actionDisabled(true) disables only action segment', () => {
      const instance = createInstance();
      instance.actionDisabled(true);
      expect(getActionEl().disabled).toBe(true);
      expect(getTriggerEl().disabled).toBe(false);
    });

    it('actionDisabled() getter returns the option value', () => {
      const instance = createInstance({ isActionDisabled: true });
      expect(instance.actionDisabled()).toBe(true);
    });

    it('triggerDisabled(true) disables only trigger segment', () => {
      const instance = createInstance();
      instance.triggerDisabled(true);
      expect(getActionEl().disabled).toBe(false);
      expect(getTriggerEl().disabled).toBe(true);
    });

    it('triggerDisabled() getter returns the option value', () => {
      const instance = createInstance({ isTriggerDisabled: true });
      expect(instance.triggerDisabled()).toBe(true);
    });
  });

  // -- Loading ---------------------------------------------------------------

  describe('loading', () => {
    it('isLoading=true at init adds loading class and aria-busy', () => {
      createInstance({ isLoading: true });
      expect(el.classList.contains('loading')).toBe(true);
      expect(el.getAttribute('aria-busy')).toBe('true');
    });

    it('setLoading(false) removes loading state and re-evaluates disabled', () => {
      const instance = createInstance({ isLoading: true });
      instance.setLoading(false);
      expect(el.classList.contains('loading')).toBe(false);
      expect(el.hasAttribute('aria-busy')).toBe(false);
      expect(getActionEl().disabled).toBe(false);
      expect(getTriggerEl().disabled).toBe(false);
    });

    it('setLoading(true) disables both segments', () => {
      const instance = createInstance();
      instance.setLoading(true);
      expect(getActionEl().disabled).toBe(true);
      expect(getTriggerEl().disabled).toBe(true);
    });
  });

  // -- Action click + ArrowDown shortcut -------------------------------------

  describe('action click + ArrowDown shortcut', () => {
    it('click on actionEl in action mode calls onAction and dispatches split-btn:action', () => {
      const onAction = vi.fn();
      const handler = vi.fn();
      createInstance({ onAction });
      el.addEventListener('split-btn:action', handler);
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction.mock.calls[0][1]).toBeNull();
      expect(handler).toHaveBeenCalledTimes(1);
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.selectedItem).toBeNull();
    });

    it('click on actionEl when disabled does NOT call onAction', () => {
      const onAction = vi.fn();
      createInstance({ isDisabled: true, onAction });
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).not.toHaveBeenCalled();
    });

    it('click on actionEl when loading does NOT call onAction', () => {
      const onAction = vi.fn();
      createInstance({ isLoading: true, onAction });
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).not.toHaveBeenCalled();
    });

    it('click on actionEl when isActionDisabled does NOT call onAction', () => {
      const onAction = vi.fn();
      createInstance({ isActionDisabled: true, onAction });
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).not.toHaveBeenCalled();
    });

    it('ArrowDown keydown on actionEl opens the menu (wrapper-level handler)', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      getActionEl().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('ArrowDown keydown on triggerEl opens the menu (wrapper-level handler)', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      getTriggerEl().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('Alt+ArrowDown on either segment opens the menu', () => {
      createInstance();
      mockActionMenuInstance.open.mockClear();
      getActionEl().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
        }),
      );
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('ArrowDown does NOT open menu when both segments are disabled', () => {
      createInstance({ isDisabled: true });
      mockActionMenuInstance.open.mockClear();
      getActionEl().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });

    it('ArrowDown on trigger still opens menu when only the action is disabled', () => {
      createInstance({ isActionDisabled: true });
      mockActionMenuInstance.open.mockClear();
      getTriggerEl().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });
  });

  // -- Roving tabindex (composite-widget keyboard model) ---------------------

  describe('roving tabindex', () => {
    function dispatchKey(target: HTMLElement, key: string): void {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    it('initial tabindex: action=0, trigger=-1 (single tab stop)', () => {
      createInstance();
      expect(getActionEl().tabIndex).toBe(0);
      expect(getTriggerEl().tabIndex).toBe(-1);
    });

    it('ArrowRight on action moves the rover to trigger and focuses it', () => {
      createInstance();
      const action = getActionEl();
      const trigger = getTriggerEl();
      action.focus();
      dispatchKey(action, 'ArrowRight');
      expect(trigger.tabIndex).toBe(0);
      expect(action.tabIndex).toBe(-1);
      expect(document.activeElement).toBe(trigger);
    });

    it('ArrowLeft on trigger moves the rover to action and focuses it', () => {
      createInstance();
      const action = getActionEl();
      const trigger = getTriggerEl();
      trigger.focus();
      dispatchKey(trigger, 'ArrowLeft');
      expect(action.tabIndex).toBe(0);
      expect(trigger.tabIndex).toBe(-1);
      expect(document.activeElement).toBe(action);
    });

    it('Home focuses the action segment', () => {
      createInstance();
      const action = getActionEl();
      const trigger = getTriggerEl();
      trigger.focus();
      dispatchKey(trigger, 'Home');
      expect(document.activeElement).toBe(action);
      expect(action.tabIndex).toBe(0);
    });

    it('End focuses the trigger segment', () => {
      createInstance();
      const action = getActionEl();
      const trigger = getTriggerEl();
      action.focus();
      dispatchKey(action, 'End');
      expect(document.activeElement).toBe(trigger);
      expect(trigger.tabIndex).toBe(0);
    });

    it('ArrowRight on action is a no-op when trigger is disabled', () => {
      createInstance({ isTriggerDisabled: true });
      const action = getActionEl();
      action.focus();
      dispatchKey(action, 'ArrowRight');
      expect(document.activeElement).toBe(action);
    });

    it('ArrowLeft on trigger is a no-op when action is disabled', () => {
      createInstance({ isActionDisabled: true });
      const trigger = getTriggerEl();
      trigger.focus();
      dispatchKey(trigger, 'ArrowLeft');
      expect(document.activeElement).toBe(trigger);
    });

    it('focusin on trigger syncs the rover to trigger (e.g. menu-close return)', () => {
      createInstance();
      const action = getActionEl();
      const trigger = getTriggerEl();
      trigger.focus();
      expect(trigger.tabIndex).toBe(0);
      expect(action.tabIndex).toBe(-1);
    });

    it('isActionDisabled routes the tab stop to trigger automatically', () => {
      createInstance({ isActionDisabled: true });
      expect(getActionEl().tabIndex).toBe(-1);
      expect(getTriggerEl().tabIndex).toBe(0);
    });

    it('isTriggerDisabled keeps the tab stop on action', () => {
      createInstance({ isTriggerDisabled: true });
      expect(getActionEl().tabIndex).toBe(0);
      expect(getTriggerEl().tabIndex).toBe(-1);
    });

    it('actionDisabled(true) re-routes the rover to trigger', () => {
      const instance = createInstance();
      instance.actionDisabled(true);
      expect(getActionEl().tabIndex).toBe(-1);
      expect(getTriggerEl().tabIndex).toBe(0);
    });

    it('destroy() removes the wrapper keydown listener', () => {
      const instance = createInstance();
      // Capture the wrapper before destroy() removes its children.
      const wrapper = el;
      mockActionMenuInstance.open.mockClear();
      instance.destroy();
      // Dispatching ArrowDown on the wrapper after destroy must NOT call
      // open() -- the listener should have been removed.
      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });
  });

  // -- Selection mode --------------------------------------------------------

  describe('selection mode', () => {
    it('initial value shows selected item label', () => {
      createInstance({ mode: 'selection', items: selectionItems, value: 'b' });
      expect(getLabel()).toBe('Banana');
    });

    it('value() getter returns resolved MenuItemData', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems, value: 'b' });
      const result = instance.value() as MenuItemData;
      expect(result).not.toBeNull();
      expect(result.id).toBe('b');
      expect(result.label).toBe('Banana');
    });

    it('value(<newId>) setter updates label and calls updateItems on ActionMenu', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems });
      instance.value('c');
      expect(getLabel()).toBe('Cherry');
      expect(mockActionMenuInstance.updateItems).toHaveBeenCalled();
    });

    it('value(null) clears selection', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems, value: 'a' });
      instance.value(null);
      expect(getLabel()).toBe('Save');
    });

    it('_handleSelect dispatches split-btn:change with item and previousItem', () => {
      const handler = vi.fn();
      createInstance({ mode: 'selection', items: selectionItems });
      el.addEventListener('split-btn:change', handler);

      const opts = getLastInitCall();
      opts?.onSelect?.(selectionItems[0], 0);

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.item).toEqual(selectionItems[0]);
      expect(detail.previousItem).toBeNull();
    });

    it('_handleSelect in action mode dispatches split-btn:select and does NOT mutate label', () => {
      const handler = vi.fn();
      createInstance({ mode: 'action', items: defaultItems });
      el.addEventListener('split-btn:select', handler);

      const opts = getLastInitCall();
      opts?.onSelect?.(defaultItems[0], 0);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(getLabel()).toBe('Save');
    });

    it('in selection mode, clicking action button calls onSelect with selectedItem', () => {
      const onSelect = vi.fn();
      createInstance({ mode: 'selection', items: selectionItems, value: 'a', onSelect });
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0].id).toBe('a');
    });

    // -- defaultValue (uncontrolled initial selection) --

    it('seeds uncontrolled selection from defaultValue', () => {
      const instance = createInstance({
        mode: 'selection',
        items: selectionItems,
        defaultValue: 'b',
      });
      expect(getLabel()).toBe('Banana');
      expect((instance.value() as MenuItemData).id).toBe('b');
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

    it('selection is null when both value and defaultValue are omitted', () => {
      const instance = createInstance({ mode: 'selection', items: selectionItems });
      expect(instance.value()).toBeNull();
    });
  });

  // -- Open/close pipeline ---------------------------------------------------

  describe('open/close pipeline', () => {
    it('onOpenChange(true) adds open class and fires split-btn:open', () => {
      const handler = vi.fn();
      createInstance();
      el.addEventListener('split-btn:open', handler);

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);

      expect(el.classList.contains('open')).toBe(true);
      // aria-expanded is engine-owned (set by createOverlaySurface); not tracked here
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('onOpenChange(false) removes open class and fires split-btn:close', () => {
      const handler = vi.fn();
      createInstance();
      el.addEventListener('split-btn:close', handler);

      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);

      expect(el.classList.contains('open')).toBe(false);
      // aria-expanded is engine-owned; not tracked by wrapper
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // -- Public methods --------------------------------------------------------

  describe('public methods', () => {
    it('open() delegates to ActionMenu', () => {
      const instance = createInstance();
      instance.open();
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('close() delegates to ActionMenu', () => {
      const instance = createInstance();
      instance.close();
      expect(mockActionMenuInstance.close).toHaveBeenCalledTimes(1);
    });

    it('toggle(force) delegates to ActionMenu', () => {
      const instance = createInstance();
      instance.toggle(true);
      expect(mockActionMenuInstance.toggle).toHaveBeenCalledWith(true);
    });

    it('toggle() without args delegates to ActionMenu', () => {
      const instance = createInstance();
      instance.toggle();
      expect(mockActionMenuInstance.toggle).toHaveBeenCalledWith(undefined);
    });

    it('isOpen() reflects open state', () => {
      const instance = createInstance();
      expect(instance.isOpen()).toBe(false);
      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      expect(instance.isOpen()).toBe(true);
    });

    it('setLabel() updates action segment label text', () => {
      const instance = createInstance();
      instance.setLabel('New Label');
      expect(getLabel()).toBe('New Label');
    });

    it('setIcon() adds icon element', () => {
      const instance = createInstance();
      instance.setIcon('star');
      const icon = el.querySelector('.arvo-split-btn__icon');
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains('o9con-star')).toBe(true);
    });

    it('setIcon(null) removes icon element', () => {
      const instance = createInstance({ icon: 'star' });
      instance.setIcon(null);
      expect(el.querySelector('.arvo-split-btn__icon')).toBeNull();
    });

    it('setVariant() swaps variant classes on wrapper and segments', () => {
      const instance = createInstance();
      instance.setVariant('tertiary');
      expect(el.classList.contains('arvo-split-btn--tertiary')).toBe(true);
      expect(el.classList.contains('arvo-split-btn--primary')).toBe(false);
      expect(getActionEl().classList.contains('arvo-btn--tertiary')).toBe(true);
      expect(getTriggerEl().classList.contains('arvo-btn--tertiary')).toBe(true);
    });

    it('setVariant() is a no-op for invalid values', () => {
      const instance = createInstance();
      instance.setVariant('invalid');
      expect(el.classList.contains('arvo-split-btn--primary')).toBe(true);
    });

    it('setSize() swaps size classes on wrapper and segments', () => {
      const instance = createInstance();
      instance.setSize('lg');
      expect(el.classList.contains('arvo-split-btn--lg')).toBe(true);
      expect(el.classList.contains('arvo-split-btn--md')).toBe(false);
      expect(getActionEl().classList.contains('arvo-btn--lg')).toBe(true);
      expect(getTriggerEl().classList.contains('arvo-btn--lg')).toBe(true);
    });

    it('setSize() is a no-op for invalid values', () => {
      const instance = createInstance();
      instance.setSize('xxl');
      expect(el.classList.contains('arvo-split-btn--md')).toBe(true);
    });

    it('updateItems() passes items to ActionMenu', () => {
      const instance = createInstance();
      const newItems: MenuItemData[] = [{ id: 'x', label: 'Extra' }];
      instance.updateItems(newItems);
      expect(mockActionMenuInstance.updateItems).toHaveBeenCalled();
    });

    it('focus() targets the action segment', () => {
      const instance = createInstance();
      const focusSpy = vi.spyOn(getActionEl(), 'focus');
      instance.focus();
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -- Destroy ---------------------------------------------------------------

  describe('destroy', () => {
    it('removes listeners (click on action does not call onAction after destroy)', () => {
      const onAction = vi.fn();
      const instance = createInstance({ onAction });
      const action = getActionEl();
      instance.destroy();
      action.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).not.toHaveBeenCalled();
    });

    it('strips wrapper classes', () => {
      const instance = createInstance();
      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      instance.setLoading(true);
      instance.destroy();
      expect(el.classList.contains('arvo-split-btn')).toBe(false);
      expect(el.classList.contains('arvo-split-btn--primary')).toBe(false);
      expect(el.classList.contains('arvo-split-btn--md')).toBe(false);
      expect(el.classList.contains('open')).toBe(false);
      expect(el.classList.contains('loading')).toBe(false);
    });

    it('removes constructed segment children', () => {
      const instance = createInstance({ icon: 'star' });
      instance.destroy();
      expect(el.querySelector('.arvo-split-btn__action')).toBeNull();
      expect(el.querySelector('.arvo-split-btn__trigger')).toBeNull();
      expect(el.querySelector('.arvo-split-btn__lbl')).toBeNull();
      expect(el.querySelector('.arvo-split-btn__caret')).toBeNull();
      expect(el.querySelector('.arvo-split-btn__icon')).toBeNull();
    });

    it('calls ActionMenu destroy', () => {
      const instance = createInstance();
      instance.destroy();
      expect(mockActionMenuInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it('removes aria attributes', () => {
      const instance = createInstance({ isDisabled: true, isLoading: true });
      instance.destroy();
      expect(el.hasAttribute('aria-disabled')).toBe(false);
      expect(el.hasAttribute('aria-busy')).toBe(false);
      expect(el.hasAttribute('role')).toBe(false);
    });
  });

  // -- Custom event payloads -------------------------------------------------

  describe('custom event payloads', () => {
    it('split-btn:action has bubbles=true and cancelable=true', () => {
      const handler = vi.fn();
      createInstance();
      el.addEventListener('split-btn:action', handler);
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });

    it('split-btn:select has bubbles=true and cancelable=true', () => {
      const handler = vi.fn();
      createInstance({ mode: 'action', items: defaultItems });
      el.addEventListener('split-btn:select', handler);
      const opts = getLastInitCall();
      opts?.onSelect?.(defaultItems[0], 0);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });

    it('split-btn:change has bubbles=true and cancelable=false', () => {
      const handler = vi.fn();
      createInstance({ mode: 'selection', items: selectionItems });
      el.addEventListener('split-btn:change', handler);
      const opts = getLastInitCall();
      opts?.onSelect?.(selectionItems[0], 0);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(false);
    });

    it('split-btn:open has bubbles=true and cancelable=true', () => {
      const handler = vi.fn();
      createInstance();
      el.addEventListener('split-btn:open', handler);
      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });

    it('split-btn:close has bubbles=true and cancelable=true', () => {
      const handler = vi.fn();
      createInstance();
      el.addEventListener('split-btn:close', handler);
      const opts = getLastInitCall();
      opts?.onOpenChange?.(true);
      opts?.onOpenChange?.(false);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });
  });

  // -- menuProps escape hatch --------------------------------------------

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

  // -- Engine-owned ARIA + split segment separation --------------------------

  describe('EX-5 -- engine-owned ARIA + split segment separation', () => {
    it('initialize() passes the caret trigger element (not action) to ArvoActionMenu', () => {
      createInstance();
      const calls = (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // The trigger passed to ActionMenu is the caret button, not the wrapper div
      const triggerArg = calls[calls.length - 1][0] as HTMLElement;
      expect(triggerArg.classList.contains('arvo-split-btn__trigger')).toBe(true);
    });

    it('action segment does NOT have aria-haspopup (regression guard: engine sets it on caret only)', () => {
      // The engine will set aria-haspopup on _triggerEl (caret) via createOverlaySurface.
      // The action element must never receive this attribute.
      createInstance();
      expect(getActionEl().getAttribute('aria-haspopup')).toBeNull();
    });

    it('action click calls onAction but does NOT trigger menu open', () => {
      const onAction = vi.fn();
      createInstance({ onAction });
      mockActionMenuInstance.open.mockClear();
      getActionEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(mockActionMenuInstance.open).not.toHaveBeenCalled();
    });

    it('open() delegates to ActionMenu and is callable programmatically', () => {
      const instance = createInstance();
      mockActionMenuInstance.open.mockClear();
      instance.open();
      expect(mockActionMenuInstance.open).toHaveBeenCalledTimes(1);
    });

    it('close() delegates to ActionMenu', () => {
      const instance = createInstance();
      mockActionMenuInstance.close.mockClear();
      instance.close();
      expect(mockActionMenuInstance.close).toHaveBeenCalledTimes(1);
    });
  });

  // -- Accessibility (axe on wrapper DOM) ------------------------------------

  describe('EX-5 -- accessibility (axe)', () => {
    it('wrapper DOM has no axe violations in initial state', async () => {
      const axe = await import('axe-core');
      createInstance({ label: 'Save' });
      const results = await axe.default.run(document.body, {
        rules: { region: { enabled: false } },
      });
      expect(results.violations).toHaveLength(0);
    });
  });

  // -- External overlay (BYO overlay) ----------------------------------------
  // For SplitButton the CARET segment is the overlay anchor -- NOT the action
  // segment. triggerElement() returns the caret. ArrowDown synthesizes a click
  // on the caret. The action segment continues to fire onAction /
  // split-btn:action independently.

  describe('external overlay', () => {
    function createHeadlessInstance(
      options: Partial<ArvoSplitButtonOptions> = {},
    ): ArvoSplitButton {
      // No `items` / `menuProps` -> pure-headless mode (or overlay slot if
      // an overlay option is supplied).
      return ArvoSplitButton.initialize(el, { label: 'Save', ...options });
    }

    it('pure-headless: does NOT initialize the internal ArvoActionMenu', () => {
      (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mockClear();
      createHeadlessInstance();
      expect(MockedActionMenu.initialize).not.toHaveBeenCalled();
    });

    it('overlay-slot: invokes the factory with the CARET segment element', () => {
      (MockedActionMenu.initialize as ReturnType<typeof vi.fn>).mockClear();
      const overlayInstance = { open: vi.fn(), destroy: vi.fn() };
      const overlay = vi.fn(() => overlayInstance);
      createHeadlessInstance({ overlay });
      expect(MockedActionMenu.initialize).not.toHaveBeenCalled();
      expect(overlay).toHaveBeenCalledTimes(1);
      // The first argument is the trigger (caret) segment, NOT the action.
      const triggerEl = getTriggerEl();
      expect(overlay).toHaveBeenCalledWith(triggerEl);
    });

    it('triggerElement() returns the CARET segment, not the action segment', () => {
      const instance = createHeadlessInstance();
      expect(instance.triggerElement()).toBe(getTriggerEl());
      expect(instance.triggerElement()).not.toBe(getActionEl());
    });

    it('setOpenState(true) flips chrome on the wrapper and dispatches split-btn:open', () => {
      const handler = vi.fn();
      el.addEventListener('split-btn:open', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      expect(el.classList.contains('open')).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('setOpenState(false) dispatches split-btn:close', () => {
      const handler = vi.fn();
      el.addEventListener('split-btn:close', handler);
      const instance = createHeadlessInstance();
      instance.setOpenState(true);
      instance.setOpenState(false);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('MutationObserver: aria-expanded="true" on the CARET segment flips chrome', async () => {
      createHeadlessInstance();
      const triggerEl = getTriggerEl();
      triggerEl.setAttribute('aria-expanded', 'true');
      await new Promise((r) => setTimeout(r, 0));
      expect(el.classList.contains('open')).toBe(true);
    });

    it('action segment still fires onAction in headless mode', () => {
      const onAction = vi.fn();
      const handler = vi.fn();
      el.addEventListener('split-btn:action', handler);
      createHeadlessInstance({ onAction });
      const actionEl = getActionEl();
      actionEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
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

    it('overlay factory: ArrowDown forwards to overlay.open() (preferred over click)', () => {
      const overlayInstance = { open: vi.fn(), destroy: vi.fn() };
      createHeadlessInstance({ overlay: () => overlayInstance });
      const actionEl = getActionEl();
      actionEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(overlayInstance.open).toHaveBeenCalledTimes(1);
    });

    it('destroy() destroys the overlay instance and disconnects the observer', async () => {
      const overlayInstance = { destroy: vi.fn() };
      const openHandler = vi.fn();
      el.addEventListener('split-btn:open', openHandler);
      const instance = createHeadlessInstance({ overlay: () => overlayInstance });
      instance.destroy();
      expect(overlayInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it('selection mode + external overlay logs a dev warning and falls back to action mode', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const onAction = vi.fn();
      const instance = createHeadlessInstance({
        mode: 'selection',
        value: 'a',
        defaultValue: 'a',
        onAction,
      });
      expect(warn).toHaveBeenCalled();
      // Action segment click should fire onAction (action mode), not onSelect.
      const actionEl = getActionEl();
      actionEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onAction).toHaveBeenCalledTimes(1);
      // value() returns null because selection mode was downgraded.
      expect(instance.value()).toBeNull();
      warn.mockRestore();
    });

    it('controlled isOpen=true seeds the open class at init', () => {
      createHeadlessInstance({ isOpen: true });
      expect(el.classList.contains('open')).toBe(true);
    });
  });
});
