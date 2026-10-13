/**
 * Tree navigation -- WAI-ARIA Tree View keyboard pattern.
 *
 * Composes `createArrowNav` and adds tree-specific Right/Left arrow semantics:
 *
 * - Right Arrow: open closed parent | move into first child of open parent | no-op on leaf.
 * - Left Arrow: close open parent | move to parent of leaf or closed child | no-op at root.
 * - Up/Down/Home/End: defer to vertical `createArrowNav` over the *visible* row list.
 * - Enter/Space: select focused row.
 * - Escape: caller-defined.
 * - Type-ahead: caller-defined `getLabel` (defers to `createArrowNav`).
 * - Disabled rows are skipped on all axes.
 *
 * The DOM `items` array represents the currently visible rows in display order.
 * When the consumer expands or collapses a row, it MUST call `setItems()` with
 * the new visible list so vertical navigation reflects the new structure.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
import { createArrowNav, type ArrowNav, type ArrowNavOptions } from './arrow-nav';

export interface TreeNavRowMeta {
  /** True when the row currently has expandable children (parent node). */
  hasChildren: boolean;
  /** True when the row is currently expanded. Ignored when `hasChildren` is false. */
  isExpanded: boolean;
  /** True when the row is disabled. */
  isDisabled: boolean;
  /** Zero-based depth from the root. Root nodes have level 0. */
  level: number;
}

export interface TreeNavOptions {
  /** Currently visible row elements in display order. */
  items: HTMLElement[];
  /**
   * Returns metadata for the row at the given index. Called frequently;
   * implementations should be O(1) lookups against an indexed structure
   * rather than tree walks.
   */
  getRowMeta: (index: number) => TreeNavRowMeta;
  /** Roving focus moved to a row. Index is into the visible list. */
  onNavigate: (item: HTMLElement, index: number) => void;
  /** Selection committed (Enter/Space). */
  onSelect?: (item: HTMLElement, index: number) => void;
  /** Escape pressed. */
  onEscape?: () => void;
  /**
   * Open the parent at the given index. Called on Right Arrow when the focused
   * row `hasChildren && !isExpanded`. Implementations should expand and then
   * call `setItems()` with the new visible list.
   */
  onExpand: (index: number) => void;
  /**
   * Close the parent at the given index. Called on Left Arrow when the focused
   * row `hasChildren && isExpanded`. Implementations should collapse and then
   * call `setItems()`.
   */
  onCollapse: (index: number) => void;
  /**
   * Optional type-ahead support. Same shape as `ArrowNavOptions['typeAhead']`.
   */
  typeAhead?: ArrowNavOptions['typeAhead'];
}

export interface TreeNav {
  /** Drive a keydown event into the tree-nav state machine. */
  handleKeyDown: (event: KeyboardEvent) => void;
  /** Replace the visible-row list (call after expand/collapse). */
  setItems: (items: HTMLElement[]) => void;
  /**
   * Imperatively set the current focused row index. Useful for syncing the
   * state machine when focus moves outside of the keyboard navigation flow
   * (e.g., a row's onFocus handler in React).
   */
  setIndex: (index: number) => void;
  /** Tear down internal resources (timers, listeners). */
  destroy: () => void;
}

/**
 * Build a tree-navigation state machine over the visible rows of a tree.
 *
 * The implementation delegates Up/Down/Home/End/Enter/Space/Escape/type-ahead
 * to `createArrowNav` (vertical, no wrap by tree convention) and intercepts
 * Right/Left arrows to apply the WAI-ARIA Tree pattern.
 */
export function createTreeNav(options: TreeNavOptions): TreeNav {
  let _items = options.items;
  let _currentIndex = findFirstEnabledIndex(_items, options.getRowMeta);

  const inner: ArrowNav = createArrowNav({
    items: _items,
    orientation: 'vertical',
    // Trees do not wrap (per WAI-ARIA APG): Up at first item is a no-op,
    // Down at last item is a no-op.
    wrap: false,
    onNavigate(el, index) {
      _currentIndex = index;
      options.onNavigate(el, index);
    },
    onSelect: options.onSelect
      ? (el, index) => {
          _currentIndex = index;
          options.onSelect?.(el, index);
        }
      : undefined,
    onEscape: options.onEscape,
    skipDisabled: index => options.getRowMeta(index).isDisabled,
    typeAhead: options.typeAhead,
  });

  function syncCurrentIndexFromFocus(): void {
    const focused = document.activeElement;
    if (!focused) return;
    const idx = _items.indexOf(focused as HTMLElement);
    if (idx !== -1) _currentIndex = idx;
  }

  function findParentIndex(fromIndex: number): number {
    if (fromIndex <= 0) return -1;
    const childMeta = options.getRowMeta(fromIndex);
    const targetLevel = childMeta.level - 1;
    if (targetLevel < 0) return -1;
    for (let i = fromIndex - 1; i >= 0; i--) {
      if (options.getRowMeta(i).level === targetLevel) return i;
    }
    return -1;
  }

  function moveFocusTo(index: number): void {
    if (index < 0 || index >= _items.length) return;
    if (options.getRowMeta(index).isDisabled) return;
    _currentIndex = index;
    options.onNavigate(_items[index], index);
  }

  function handleRightArrow(event: KeyboardEvent): boolean {
    syncCurrentIndexFromFocus();
    if (_currentIndex < 0 || _currentIndex >= _items.length) return false;
    const meta = options.getRowMeta(_currentIndex);
    if (meta.isDisabled) return false;

    if (meta.hasChildren && !meta.isExpanded) {
      event.preventDefault();
      options.onExpand(_currentIndex);
      return true;
    }
    if (meta.hasChildren && meta.isExpanded) {
      // Move to first child = next visible row whose level === meta.level + 1.
      // After expand, the consumer has already called setItems, so the next
      // index in the visible list is the first child.
      event.preventDefault();
      const next = _currentIndex + 1;
      if (
        next < _items.length &&
        options.getRowMeta(next).level === meta.level + 1
      ) {
        moveFocusTo(next);
      }
      return true;
    }
    // Leaf -- no-op (but we still preventDefault to silence default scroll).
    event.preventDefault();
    return true;
  }

  function handleLeftArrow(event: KeyboardEvent): boolean {
    syncCurrentIndexFromFocus();
    if (_currentIndex < 0 || _currentIndex >= _items.length) return false;
    const meta = options.getRowMeta(_currentIndex);
    if (meta.isDisabled) return false;

    if (meta.hasChildren && meta.isExpanded) {
      event.preventDefault();
      options.onCollapse(_currentIndex);
      return true;
    }
    // Leaf or closed parent -- move to parent.
    const parentIndex = findParentIndex(_currentIndex);
    if (parentIndex !== -1) {
      event.preventDefault();
      moveFocusTo(parentIndex);
      return true;
    }
    // Already at root -- no-op.
    event.preventDefault();
    return true;
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (_items.length === 0) return;

    if (event.key === 'ArrowRight') {
      handleRightArrow(event);
      return;
    }
    if (event.key === 'ArrowLeft') {
      handleLeftArrow(event);
      return;
    }
    inner.handleKeyDown(event);
  }

  return {
    handleKeyDown,
    setItems(items: HTMLElement[]): void {
      _items = items;
      inner.setItems(items);
      if (_currentIndex >= items.length) {
        _currentIndex = Math.max(0, items.length - 1);
      }
    },
    setIndex(index: number): void {
      if (index >= 0 && index < _items.length) {
        _currentIndex = index;
        inner.setIndex(index);
      }
    },
    destroy(): void {
      inner.destroy();
      _items = [];
    },
  };
}

function findFirstEnabledIndex(
  items: HTMLElement[],
  getRowMeta: TreeNavOptions['getRowMeta'],
): number {
  for (let i = 0; i < items.length; i++) {
    if (!getRowMeta(i).isDisabled) return i;
  }
  return items.length > 0 ? 0 : -1;
}
