import type { MaskOptions, MaskInstance } from './types';

const BLOCK = 'arvo-overlay__mask';
const HIDE_DELAY_MS = 300;
const SHOW_DELAY_MS = 10;

function resolveContainer(
  container?: HTMLElement | string,
): HTMLElement | null {
  if (!container) return null;
  if (typeof container === 'string') {
    return document.querySelector<HTMLElement>(container);
  }
  return container;
}

/**
 * Factory that creates a mask/backdrop overlay element with show/hide
 * transitions and scoped (container-relative) mode.
 *
 * The mask always renders with `background: var(--arvo-color-s-overlay-static)`
 * and `backdrop-filter: blur(4px)` -- the color and filter are not
 * configurable per-instance.
 *
 * The element is published as `.arvo-overlay__mask` and becomes visible via
 * the `--visible` modifier on a delay so the browser paints the transparent
 * state first (enables the CSS transition). On hide, the modifier is
 * removed and the element is detached after the transition window.
 *
 * Both Alert Dialog and Drawer instantiate one mask per overlay and tie its
 * visibility to the host's open state. The component layer never paints
 * its own scrim.
 */
export function createMask(options: MaskOptions = {}): MaskInstance {
  const {
    container: containerOpt,
    closeOnClick = false,
    zIndex,
    onOutside,
    animated = true,
    ariaHidden = true,
    className,
  } = options;

  const el = document.createElement('div');
  el.className = BLOCK;

  if (animated) {
    el.classList.add(`${BLOCK}--animated`);
  }
  if (className) {
    el.classList.add(className);
  }
  if (ariaHidden) {
    el.setAttribute('aria-hidden', 'true');
  }

  const containerEl = resolveContainer(containerOpt);
  if (containerEl) {
    el.classList.add(`${BLOCK}--scoped`);
  }

  if (zIndex != null) {
    el.style.zIndex = String(zIndex);
  }

  let pointerHandler: ((e: PointerEvent) => void) | null = null;
  if (closeOnClick && onOutside) {
    pointerHandler = (e: PointerEvent) => {
      if (e.target === el) onOutside(e);
    };
    el.addEventListener('pointerdown', pointerHandler);
  }

  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (hideTimer != null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (showTimer != null) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  }

  const mask: MaskInstance = {
    element: el,

    show(): void {
      clearTimers();
      const target = containerEl ?? document.body;
      target.appendChild(el);
      if (animated) {
        showTimer = setTimeout(() => {
          el.classList.add(`${BLOCK}--visible`);
          showTimer = null;
        }, SHOW_DELAY_MS);
      } else {
        el.classList.add(`${BLOCK}--visible`);
      }
    },

    hide(): void {
      clearTimers();
      el.classList.remove(`${BLOCK}--visible`);
      if (animated) {
        hideTimer = setTimeout(() => {
          el.remove();
          hideTimer = null;
        }, HIDE_DELAY_MS);
      } else {
        el.remove();
      }
    },

    destroy(): void {
      clearTimers();
      if (pointerHandler) {
        el.removeEventListener('pointerdown', pointerHandler);
        pointerHandler = null;
      }
      el.remove();
    },
  };

  return mask;
}
