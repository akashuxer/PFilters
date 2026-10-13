import { getFirstFocusable } from '../focus/focusable';
import { restoreFocus, saveFocus, type FocusState } from '../focus/focus-restore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InlinePanelKind = 'popover' | 'hybrid' | 'custom';

export interface InlinePanelPushOptions {
  id?: string;
  kind: InlinePanelKind;
  element: HTMLElement;
  openedFrom?: HTMLElement | null;
  onBack?: () => void;
  onClose?: () => void | false;
  onOpen?: () => void | false;
}

export interface InlinePanelStackEntry {
  id: string;
  kind: InlinePanelKind;
  element: HTMLElement;
  layerEl: HTMLElement;
  openedFrom: HTMLElement | null;
  onBack?: () => void;
  onClose?: () => void | false;
}

export type InlinePanelPopVia = 'default' | 'back' | 'force';

export interface InlinePanelPopOptions {
  /** How the pop was initiated. `back` notifies onBack; `force` skips veto. */
  via?: InlinePanelPopVia;
}

export interface InlinePanelStackOptions {
  /** Host overlay panel element that owns the stack. */
  host: HTMLElement;
  /** Optional pre-existing container; one is created and appended if omitted. */
  container?: HTMLElement;
  /** CSS class on the auto-created stack container. */
  containerClass?: string;
  maxDepth?: number;
}

export interface InlinePanelStack {
  readonly container: HTMLElement;
  push(options: InlinePanelPushOptions): boolean;
  pop(options?: InlinePanelPopOptions): boolean;
  popAll(): void;
  getDepth(): number;
  getTop(): InlinePanelStackEntry | null;
  getEntries(): readonly InlinePanelStackEntry[];
  handleEscape(): boolean;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_CONTAINER_CLASS = 'arvo-inline-panel-stack';

let _idCounter = 0;

function nextId(): string {
  _idCounter += 1;
  return `inline-panel-${_idCounter}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInlinePanelStack(
  options: InlinePanelStackOptions,
): InlinePanelStack {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const containerClass = options.containerClass ?? DEFAULT_CONTAINER_CLASS;

  const container = options.container ?? document.createElement('div');
  const createdContainer = !options.container;

  if (createdContainer) {
    container.className = containerClass;
    container.hidden = true;
    options.host.appendChild(container);
  }

  const layerClass = `${containerClass.split(/\s+/)[0]}__layer`;

  const stack: InlinePanelStackEntry[] = [];
  let rootOpenerFocus: FocusState | null = null;
  let escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  function showContainer(): void {
    container.hidden = false;
    container.classList.add('open');
  }

  function hideContainer(): void {
    container.hidden = true;
    container.classList.remove('open');
  }

  function attachEscape(): void {
    if (escapeHandler) return;
    escapeHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || stack.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      stackApi.handleEscape();
    };
    options.host.addEventListener('keydown', escapeHandler, true);
  }

  function detachEscape(): void {
    if (!escapeHandler) return;
    options.host.removeEventListener('keydown', escapeHandler, true);
    escapeHandler = null;
  }

  function focusEntry(entry: InlinePanelStackEntry): void {
    const focusable = getFirstFocusable(entry.element);
    if (focusable) {
      focusable.focus({ preventScroll: true });
      return;
    }
    if (!entry.element.hasAttribute('tabindex')) {
      entry.element.setAttribute('tabindex', '-1');
    }
    entry.element.focus({ preventScroll: true });
  }

  function setLayerActive(entry: InlinePanelStackEntry, active: boolean): void {
    entry.layerEl.classList.toggle('active', active);
    if (active) {
      entry.layerEl.removeAttribute('aria-hidden');
    } else {
      entry.layerEl.setAttribute('aria-hidden', 'true');
    }
  }

  // Animate a layer out via the forward-exit transform (slides off to
  // the left as the new layer slides in from above). The previous layer
  // is kept mounted during the transition; once `transitionend` fires
  // (or a safety timeout expires) we drop the class so the layer is
  // back at its hidden resting state. The next interaction restarts the
  // class lifecycle cleanly.
  function animateForwardExit(entry: InlinePanelStackEntry): void {
    const el = entry.layerEl;
    el.classList.remove('active');
    el.classList.add('is-exiting-forward');
    el.setAttribute('aria-hidden', 'true');
    let settled = false;
    const onEnd = (event: TransitionEvent): void => {
      if (event.target !== el || settled) return;
      if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') {
        return;
      }
      settled = true;
      el.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      el.classList.remove('is-exiting-forward');
    };
    el.addEventListener('transitionend', onEnd);
    // Safety timeout matches the popup transition duration plus a
    // generous buffer for reduced-motion / transitionend skips.
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      el.removeEventListener('transitionend', onEnd);
      el.classList.remove('is-exiting-forward');
    }, 500);
  }

  function removeEntry(entry: InlinePanelStackEntry): void {
    entry.layerEl.remove();
    if (entry.element.parentElement === entry.layerEl) {
      entry.layerEl.removeChild(entry.element);
    }
  }

  function restoreOpenerFocus(entry: InlinePanelStackEntry | null): void {
    if (entry?.openedFrom && document.contains(entry.openedFrom)) {
      entry.openedFrom.focus({ preventScroll: true });
      return;
    }
    if (rootOpenerFocus) {
      restoreFocus(rootOpenerFocus);
      rootOpenerFocus = null;
    }
  }

  const stackApi: InlinePanelStack = {
    get container() {
      return container;
    },

    push(pushOptions: InlinePanelPushOptions): boolean {
      if (pushOptions.onOpen?.() === false) return false;

      if (stack.length >= maxDepth) {
        console.warn(
          `[arvo] Inline panel stack depth cap (${maxDepth}) reached; push rejected.`,
        );
        return false;
      }

      if (stack.length === 0) {
        rootOpenerFocus = saveFocus();
        showContainer();
        attachEscape();
      } else {
        // Forward push -- the previous layer slides out to the left
        // (`.is-exiting-forward`) while the new layer slides in from
        // above. See `_inline-panel-stack.scss` and `animateForwardExit`.
        animateForwardExit(stack[stack.length - 1]);
      }

      // Mount the layer in the resting state (no `.active`) so the SCSS
      // enter transition can animate from the resting opacity/transform
      // to the active state on the next frame. Without this two-phase
      // toggle the layer would snap straight to its open state with no
      // transition.
      const layerEl = document.createElement('div');
      layerEl.className = layerClass;
      layerEl.appendChild(pushOptions.element);
      container.appendChild(layerEl);

      const entry: InlinePanelStackEntry = {
        id: pushOptions.id ?? nextId(),
        kind: pushOptions.kind,
        element: pushOptions.element,
        layerEl,
        openedFrom: pushOptions.openedFrom ?? null,
        onBack: pushOptions.onBack,
        onClose: pushOptions.onClose,
      };

      stack.push(entry);
      // Force a reflow so the resting frame paints first, then add
      // `.active` so the transition runs to the open state.
      void layerEl.offsetHeight;
      setLayerActive(entry, true);
      focusEntry(entry);
      return true;
    },

    pop(popOptions?: InlinePanelPopOptions): boolean {
      if (stack.length === 0) return false;

      const via = popOptions?.via ?? 'default';
      const entry = stack[stack.length - 1];

      if (via === 'default' && entry.onClose?.() === false) {
        return false;
      }

      if (via === 'back') {
        entry.onBack?.();
      }

      stack.pop();
      removeEntry(entry);

      if (stack.length === 0) {
        hideContainer();
        detachEscape();
        restoreOpenerFocus(entry);
        return true;
      }

      const previous = stack[stack.length - 1];
      setLayerActive(previous, true);
      restoreOpenerFocus(entry);
      return true;
    },

    popAll(): void {
      while (stack.length > 0) {
        const entry = stack.pop()!;
        removeEntry(entry);
      }
      hideContainer();
      detachEscape();
      restoreOpenerFocus(null);
    },

    getDepth(): number {
      return stack.length;
    },

    getTop(): InlinePanelStackEntry | null {
      return stack.length > 0 ? stack[stack.length - 1] : null;
    },

    getEntries(): readonly InlinePanelStackEntry[] {
      return [...stack];
    },

    handleEscape(): boolean {
      return stackApi.pop({ via: 'default' });
    },

    destroy(): void {
      stackApi.popAll();
      if (createdContainer) {
        container.remove();
      }
    },
  };

  return stackApi;
}
