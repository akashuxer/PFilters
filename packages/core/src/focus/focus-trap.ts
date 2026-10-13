import { getFocusableElements, getFirstFocusable } from './focusable';
import { saveFocus, restoreFocus, type FocusState } from './focus-restore';

export interface FocusTrapOptions {
  container: HTMLElement;
  initialFocus?:
    | HTMLElement
    | (() => HTMLElement | null | undefined)
    | 'first'
    | 'none';
  returnFocusOnDeactivate: boolean;
  escapeDeactivates: boolean;
  allowOutsideClick: boolean;
  /**
   * Optional provider that returns the explicit forward-tab order. When
   * provided, the trap cycles Tab / Shift+Tab through this array instead of
   * the natural DOM-order focusable list. Elements that are not currently
   * present in the DOM are filtered out, so consumers can return refs that
   * may resolve to `null` between renders without breaking the cycle.
   *
   * The provider runs on every Tab event so the trap stays in sync with
   * dynamically rendered popover content (e.g. CalendarNav month/year
   * buttons appearing or disappearing as the calendar view changes).
   */
  getOrderedElements?: () => Array<HTMLElement | null | undefined>;
  /**
   * Explicit element (or live getter returning one) that focus should
   * return to on deactivate. When provided AND `returnFocusOnDeactivate`
   * is true, this overrides the default `saveFocus()` behaviour. This is
   * the canonical way to guarantee focus return to a trigger element --
   * `saveFocus()` captures whatever was active at activation time, which
   * can be wrong if focus moves AFTER activation (e.g. the ActionMenu
   * filter search input gets focused via a post-render rAF). Falls back
   * to the captured `saveFocus()` element when omitted.
   */
  returnFocusTo?: HTMLElement | (() => HTMLElement | null | undefined);
}

export interface FocusTrap {
  activate(options: FocusTrapOptions): void;
  deactivate(): void;
  isActive(): boolean;
  updateContainerElements(): void;
}

export function createFocusTrap(): FocusTrap {
  let _active = false;
  let _options: FocusTrapOptions | null = null;
  let _savedFocus: FocusState | null = null;

  function resolveOrder(opts: FocusTrapOptions): HTMLElement[] {
    if (!opts.getOrderedElements) {
      return getFocusableElements(opts.container);
    }
    const raw = opts.getOrderedElements();
    return raw.filter(
      (el): el is HTMLElement => el != null && opts.container.contains(el),
    );
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!_active || !_options) return;

    if (event.key === 'Tab') {
      const focusable = resolveOrder(_options);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (_options.getOrderedElements) {
        // Custom tab order: drive Tab explicitly so we cycle through the
        // provided array regardless of DOM order. Find the current index
        // (closest ancestor match for elements that own roving focus
        // children), then advance or wrap.
        const currentIdx = focusable.findIndex(
          (el) => el === activeEl || el.contains(activeEl as Node),
        );

        let nextIdx: number;
        if (currentIdx === -1) {
          nextIdx = event.shiftKey ? focusable.length - 1 : 0;
        } else if (event.shiftKey) {
          nextIdx = currentIdx === 0 ? focusable.length - 1 : currentIdx - 1;
        } else {
          nextIdx = currentIdx === focusable.length - 1 ? 0 : currentIdx + 1;
        }
        event.preventDefault();
        focusable[nextIdx].focus({ preventScroll: true });
        return;
      }

      if (!_options.container.contains(activeEl as Node)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    if (event.key === 'Escape' && _options.escapeDeactivates) {
      event.preventDefault();
      trap.deactivate();
    }
  }

  function handleFocusIn(event: FocusEvent): void {
    if (!_active || !_options || _options.allowOutsideClick) return;

    const target = event.target as Node;
    if (!_options.container.contains(target)) {
      const first = getFirstFocusable(_options.container);
      if (first) first.focus({ preventScroll: true });
    }
  }

  const trap: FocusTrap = {
    activate(options: FocusTrapOptions): void {
      if (_active) {
        trap.deactivate();
      }

      _options = options;
      _active = true;
      _savedFocus = saveFocus();

      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('focusin', handleFocusIn);

      if (options.initialFocus === 'none') {
        return;
      }

      if (typeof options.initialFocus === 'function') {
        const target = options.initialFocus();
        if (target) target.focus({ preventScroll: true });
      } else if (
        options.initialFocus !== undefined &&
        options.initialFocus !== 'first' &&
        options.initialFocus instanceof HTMLElement
      ) {
        options.initialFocus.focus({ preventScroll: true });
      } else if (options.getOrderedElements) {
        const ordered = resolveOrder(options);
        const target = ordered[0] ?? getFirstFocusable(options.container);
        if (target) target.focus({ preventScroll: true });
      } else {
        const first = getFirstFocusable(options.container);
        if (first) first.focus({ preventScroll: true });
      }
    },

    deactivate(): void {
      if (!_active || !_options) return;

      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);

      // Resolve the explicit return target before tearing down state.
      // `returnFocusTo` is the canonical override and always wins when set;
      // it accepts either an element directly or a live getter so consumers
      // can resolve a ref lazily (the trigger element may have re-rendered
      // between activation and deactivation).
      const explicit = _options.returnFocusTo;
      const explicitEl =
        typeof explicit === 'function' ? explicit() : explicit ?? null;
      const shouldRestore = _options.returnFocusOnDeactivate;

      _active = false;
      _options = null;

      if (shouldRestore) {
        if (explicitEl && typeof explicitEl.focus === 'function') {
          explicitEl.focus({ preventScroll: true });
        } else if (_savedFocus) {
          restoreFocus(_savedFocus);
        }
      }
      _savedFocus = null;
    },

    isActive(): boolean {
      return _active;
    },

    updateContainerElements(): void {
      // Focusable elements are queried dynamically on each Tab press,
      // so no cached list needs refreshing. This hook exists for
      // consumers that want to signal a DOM mutation explicitly.
    },
  };

  return trap;
}
