import { prefersReducedMotion } from './reduced-motion';

export type TransitionType =
  | 'fade'
  | 'scale'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right';

export interface TransitionOptions {
  element: HTMLElement;
  type: TransitionType;
  duration?: number;
  easing?: string;
  onComplete?: () => void;
}

const FALLBACK_MS = 500;

// Every transition cycle starts by clearing any stale enter/exit/typeClass
// state from a prior cycle. Without this, a re-used element (e.g. an open
// + close + open sequence on the same overlay surface) could inherit the
// previous cycle's `arvo-exit-to` class -- which we intentionally keep past
// cleanup for exit transitions (see `cleanup()` below) -- and the new enter
// would start from an unintended visual state.
const STALE_CLASSES: readonly string[] = [
  'arvo-enter-from',
  'arvo-enter-active',
  'arvo-enter-to',
  'arvo-exit-from',
  'arvo-exit-active',
  'arvo-exit-to',
  'arvo-fade',
  'arvo-scale',
  'arvo-slide-up',
  'arvo-slide-down',
  'arvo-slide-left',
  'arvo-slide-right',
];

function clearStaleTransitionClasses(element: HTMLElement): void {
  for (const cls of STALE_CLASSES) element.classList.remove(cls);
}

function runTransition(
  element: HTMLElement,
  phase: 'enter' | 'exit',
  options: TransitionOptions,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (prefersReducedMotion()) {
      // Reduced motion still needs to leave the element in the correct
      // end-state. For exit, that means visually hidden (apply `toClass`)
      // so the consumer's onComplete (typically an unmount or DOM-removal)
      // does not flash the element back to visible for a frame.
      clearStaleTransitionClasses(element);
      if (phase === 'exit') {
        const typeClass = `arvo-${options.type}`;
        const toClass = `arvo-${phase}-to`;
        element.classList.add(typeClass, toClass);
      }
      options.onComplete?.();
      resolve();
      return;
    }

    const typeClass = `arvo-${options.type}`;
    const fromClass = `arvo-${phase}-from`;
    const activeClass = `arvo-${phase}-active`;
    const toClass = `arvo-${phase}-to`;

    // 0. Clear stale transition state from a prior cycle so a reused element
    // (open -> close -> open) starts from a clean slate. Critical now that
    // exit cycles persist `toClass` past cleanup.
    clearStaleTransitionClasses(element);

    // 1. Apply initial "from" state + type class
    element.classList.add(fromClass, typeClass);

    if (options.duration !== undefined) {
      element.style.transitionDuration = `${options.duration}ms`;
    }
    if (options.easing !== undefined) {
      element.style.transitionTimingFunction = options.easing;
    }

    // 2. Force reflow so the browser paints the from-state
    void element.offsetHeight;

    // 3. Swap to active/to classes to trigger the CSS transition
    element.classList.remove(fromClass);
    element.classList.add(activeClass, toClass);

    let settled = false;

    function cleanup(): void {
      if (phase === 'exit') {
        // Persist the exit final state past cleanup so the element stays
        // visually at its end-state (opacity:0, transform:scale(0.96), or
        // slide-out offset) until the consumer unmounts/removes it via
        // `onComplete`. Without this, the element snaps back to its default
        // styling for a frame -- a visible flicker (e.g. an alert dialog
        // briefly reappearing at full opacity right before disappearing).
        // Only the `active` class is removed (so a later reset doesn't pick
        // up a stale transition descriptor); `toClass` + `typeClass` stay
        // until the next `clearStaleTransitionClasses` call (e.g. re-open).
        element.classList.remove(activeClass);
      } else {
        // Enter completes by tearing down all transition classes so the
        // element renders at its component default (no opacity rule
        // imposed by `arvo-enter-to`). The visible state is already what
        // the consumer wants.
        element.classList.remove(activeClass, toClass, typeClass);
      }
      if (options.duration !== undefined) {
        element.style.removeProperty('transition-duration');
      }
      if (options.easing !== undefined) {
        element.style.removeProperty('transition-timing-function');
      }
      options.onComplete?.();
      resolve();
    }

    const onEnd: EventListener = (event) => {
      if (event.target !== element || settled) return;
      settled = true;
      element.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      cleanup();
    };

    element.addEventListener('transitionend', onEnd);

    // 4. Safety net: resolve even if transitionend never fires
    //    (e.g. element hidden, no CSS transition defined, or display:none)
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      element.removeEventListener('transitionend', onEnd);
      cleanup();
    }, (options.duration ?? FALLBACK_MS) + 50);
  });
}

export function enter(options: TransitionOptions): Promise<void> {
  return runTransition(options.element, 'enter', options);
}

export function exit(options: TransitionOptions): Promise<void> {
  return runTransition(options.element, 'exit', options);
}
