import {
  createOverlaySurface,
  prefersReducedMotion,
  renderInlineContentToDOM,
  type BasicInlineContent,
  type OverlayHub,
  type OverlaySurface,
} from '@arvo/core';
import { attachTitleTruncationTooltip, type TitleTruncationHandle } from '@arvo/utils';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoLink } from '../Link/Link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArvoToastType = 'negative' | 'warning' | 'info' | 'positive' | 'block' | 'neutral';
/**
 * Toast container placement. Only right-anchored corners are supported
 * (no `top-left` / `bottom-left`) per the current design.
 */
export type ArvoToastPosition = 'top-right' | 'bottom-right';
export type ArvoToastCloseReason = 'click' | 'escape' | 'fade' | 'programmatic';

/**
 * Structured link action for a toast. The toast renders an internal
 * `ArvoLink` from this data so consumers never construct DOM for the
 * link themselves. Toast curates `size` and `variant` so the link is
 * visually consistent across all toasts; the long tail of `ArvoLink`
 * options is intentionally not exposed here.
 */
export interface ArvoToastLinkAction {
  label: string;
  href: string;
  onClick?: (event: Event) => void;
  icon?: string;
  isExternal?: boolean;
}

export interface ArvoToastOptions {
  type?: ArvoToastType;
  title?: string | null;
  /**
   * Body content. Accepts a plain string OR a `BasicInlineContent` array
   * (`InlineNode[]`) from `@arvo/core/inline-content`. The shared DOM
   * adapter renders inline runs (text, em, strong, link, code, kbd) into
   * the message slot. Raw HTML strings are not representable.
   */
  message: BasicInlineContent;
  fadeAway?: boolean;
  timeout?: number;
  pauseOnHover?: boolean;
  /**
   * Optional o9con icon name override (without the `o9con-` prefix). **Only
   * honored when `type='neutral'`** -- every other type renders its semantic
   * glyph via the SCSS pattern and ignores this option. The neutral type
   * itself has no fixed semantic glyph, so consumers may pass any o9con name
   * (e.g. `'bell-o'`, `'star'`, `'rocket'`) and it renders as a child
   * `<i class="o9con o9con-{name}">` inside `__ico`, with the
   * `has-icon-override` state class on the root.
   */
  icon?: string | null;
  link?: ArvoToastLinkAction;
  onClose?: () => void;
}

export interface ArvoToastManagerOptions {
  position?: ArvoToastPosition;
  timeout?: number;
  pauseOnHover?: boolean;
  /** Custom overlay hub instance. Falls back to the module-level singleton. */
  hub?: OverlayHub;
}

// ---------------------------------------------------------------------------
// Internal per-toast state
// ---------------------------------------------------------------------------

interface ToastState {
  id: string;
  element: HTMLDivElement;
  timer: ReturnType<typeof setTimeout> | null;
  removed: boolean;
  link: ArvoLink | null;
  closeBtn: ArvoIconButton | null;
  titleTooltip: TitleTruncationHandle | null;
  options: Required<Omit<ArvoToastOptions, 'link' | 'onClose'>> & {
    link: ArvoToastLinkAction | null;
    onClose: (() => void) | null;
  };
}

// Only `block` is hard-persistent; `negative` auto-dismisses at the longer
// 8s duration defined by the motion token table.
const NO_AUTO_DISMISS: ReadonlySet<ArvoToastType> = new Set(['block']);
const ALERT_ROLES: ReadonlySet<ArvoToastType> = new Set(['negative', 'block']);

/**
 * Per-type default visibility duration in milliseconds. Mirrors the SCSS
 * tokens `$arvo-toast-duration-{type}` in `packages/tokens/src/scss/_animation.scss`.
 * `null` means "persistent" (no auto-dismiss).
 */
const DEFAULT_TIMEOUT_BY_TYPE: Record<ArvoToastType, number | null> = {
  positive: 4000,
  neutral: 4000,
  info: 5000,
  warning: 6000,
  negative: 8000,
  block: null,
};

// SR-only prefix per toast type. Always read by screen readers so the live
// region announcement carries the type even when no title is supplied.
const TYPE_SR_LABEL: Record<ArvoToastType, string> = {
  negative: 'Error',
  block: 'Blocked',
  warning: 'Warning',
  info: 'Info',
  positive: 'Success',
  neutral: 'Notification',
};

// Layout-shift (FLIP) timing -- mirrors `$arvo-motion-layout-shift`
// (220ms with the emphasized easing curve).
const LAYOUT_SHIFT_DURATION_MS = 220;
const LAYOUT_SHIFT_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

let idCounter = 0;

// ---------------------------------------------------------------------------
// ArvoToast -- imperative toast manager
// ---------------------------------------------------------------------------

export class ArvoToast {
  private _container: HTMLDivElement | null = null;
  private _toasts = new Map<string, ToastState>();
  private _defaults: {
    position: ArvoToastPosition;
    /**
     * Manager-level override applied to every toast that does not
     * pass an explicit `timeout`. When unset, the per-type defaults
     * in `DEFAULT_TIMEOUT_BY_TYPE` apply.
     */
    timeout: number | undefined;
    pauseOnHover: boolean;
  };
  private _hub: OverlayHub | undefined;
  private _surface: OverlaySurface | null = null;
  private _destroyed = false;

  static initialize(
    container?: HTMLElement | string | null,
    options?: ArvoToastManagerOptions,
  ): ArvoToast {
    return new ArvoToast(container, options);
  }

  constructor(
    container?: HTMLElement | string | null,
    options?: ArvoToastManagerOptions,
  ) {
    this._defaults = {
      position: options?.position ?? 'top-right',
      timeout: options?.timeout,
      pauseOnHover: options?.pauseOnHover ?? true,
    };

    this._hub = options?.hub;

    const el = document.createElement('div');
    el.className = `arvo-toast-container arvo-toast-container--${this._defaults.position}`;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Notifications');
    this._container = el;

    // Resolve parent
    let parent: HTMLElement = document.body;
    if (typeof container === 'string') {
      parent = document.querySelector(container) as HTMLElement ?? document.body;
    } else if (container instanceof HTMLElement) {
      parent = container;
    }
    parent.appendChild(el);

    // Register the container region with the overlay hub via the shared engine.
    // The region is always "open" while the manager is alive; individual toasts
    // enter/exit inside it independently.
    //   position: false   -- CSS-fixed corner, not anchor-positioned.
    //   focus: none       -- toast region must never trap focus.
    //   transition: null  -- region itself is not animated; per-toast
    //                        enter/exit transitions are managed internally.
    this._surface = createOverlaySurface({
      id: `arvo-toast-container-${++idCounter}`,
      surface: el,
      type: 'toast',
      priority: 0,
      position: false,
      focus: { mode: 'none' },
      transition: null,
      closeOnOutside: false,
      triggerAria: false,
      ...(this._hub ? { hub: this._hub } : {}),
    });
    void this._surface.open();
  }

  // -- show -------------------------------------------------------------

  show(options: ArvoToastOptions): string {
    if (this._destroyed || !this._container) return '';

    const type: ArvoToastType = options.type ?? 'info';
    // Resolve the effective auto-dismiss duration:
    //   explicit toast-level `timeout` > manager default > per-type default.
    // The per-type default may be `null` (persistent, e.g. `block`).
    const resolvedTimeout =
      options.timeout !== undefined
        ? options.timeout
        : this._defaults.timeout !== undefined
          ? this._defaults.timeout
          : DEFAULT_TIMEOUT_BY_TYPE[type];
    // `block` is hard-persistent; everything else honours `fadeAway` + a
    // non-null timeout.
    const shouldFade =
      !NO_AUTO_DISMISS.has(type)
      && (options.fadeAway ?? true)
      && resolvedTimeout !== null
      && resolvedTimeout !== undefined;
    const timeout = resolvedTimeout ?? 0;
    const pauseOnHover = options.pauseOnHover ?? this._defaults.pauseOnHover;
    const role = ALERT_ROLES.has(type) ? 'alert' : 'status';

    const id = `arvo-toast-${++idCounter}`;

    const state: ToastState = {
      id,
      element: null!,
      timer: null,
      removed: false,
      link: null,
      closeBtn: null,
      titleTooltip: null,
      options: {
        type,
        title: options.title ?? null,
        message: options.message,
        fadeAway: shouldFade,
        timeout,
        pauseOnHover,
        icon: options.icon ?? null,
        link: options.link ?? null,
        onClose: options.onClose ?? null,
      },
    };

    // Custom icon override is gated on `type === 'neutral'` -- every other
    // type renders its semantic glyph via the SCSS pattern's ::before content
    // and ignores the `icon` option.
    const hasIconOverride = type === 'neutral' && !!state.options.icon;

    // Build DOM
    const toast = document.createElement('div');
    const classes = ['arvo-toast', `arvo-toast--${type}`];
    if (hasIconOverride) classes.push('has-icon-override');
    toast.className = classes.join(' ');
    toast.setAttribute('role', role);
    toast.setAttribute('aria-atomic', 'true');
    toast.setAttribute('tabindex', '0');

    // SR-only type prefix (live-region announcement)
    const srPrefix = document.createElement('span');
    srPrefix.className = 'arvo-sr-only';
    srPrefix.textContent = `${TYPE_SR_LABEL[type]}: `;
    toast.appendChild(srPrefix);

    // Icon: parent span keeps the SCSS pattern (`::before` content driven by
    // type modifier). When `type='neutral'` AND `icon` is provided, the root
    // gets `has-icon-override` (suppressing the SCSS glyph) and a child
    // `<i class="o9con o9con-{name}">` renders the override inside `__ico`.
    const ico = document.createElement('span');
    ico.className = 'arvo-toast__ico o9con';
    ico.setAttribute('aria-hidden', 'true');
    if (hasIconOverride) {
      const overrideEl = document.createElement('i');
      overrideEl.className = `o9con o9con-${state.options.icon}`;
      ico.appendChild(overrideEl);
    }
    toast.appendChild(ico);

    // Content
    const content = document.createElement('div');
    content.className = 'arvo-toast__content';

    const textWrap = document.createElement('div');
    textWrap.className = 'arvo-toast__text';
    let titleEl: HTMLParagraphElement | null = null;
    if (state.options.title) {
      titleEl = document.createElement('p');
      titleEl.className = 'arvo-toast__title';
      titleEl.textContent = state.options.title;
      textWrap.appendChild(titleEl);
    }
    const msgEl = document.createElement('p');
    msgEl.className = 'arvo-toast__msg';
    if (typeof state.options.message === 'string') {
      msgEl.textContent = state.options.message;
    } else {
      msgEl.appendChild(
        renderInlineContentToDOM(state.options.message, { profile: 'basic-inline' }),
      );
    }
    textWrap.appendChild(msgEl);
    content.appendChild(textWrap);

    if (state.options.link) {
      const aEl = document.createElement('a') as HTMLAnchorElement;
      state.link = ArvoLink.initialize(aEl, {
        size: 'sm',
        variant: 'primary',
        label: state.options.link.label,
        href: state.options.link.href,
        icon: state.options.link.icon ?? null,
        isExternal: state.options.link.isExternal ?? false,
        onClick: state.options.link.onClick,
      });
      content.appendChild(aEl);
    }
    toast.appendChild(content);

    // Close button -- rendered as ArvoIconButton (xs / tertiary). The icon
    // button owns its own chrome, hover, focus ring, and aria-label.
    const closeEl = document.createElement('button') as HTMLButtonElement;
    state.closeBtn = ArvoIconButton.initialize(closeEl, {
      icon: 'close',
      size: 'xs',
      variant: 'tertiary',
      tooltip: 'Close notification',
      onClick: () => this._remove(id, 'click'),
    });
    toast.appendChild(closeEl);

    state.element = toast;
    this._toasts.set(id, state);

    // Capture the rects of currently-mounted siblings BEFORE the new
    // toast is inserted so the FLIP step below can compensate the
    // downward shift with a transform animation.
    const playLayoutShift = this._captureLayoutShift();

    // Insert at top (mounts in the "exit" pose per SCSS base rules).
    this._container.insertBefore(toast, this._container.firstChild);

    // Wire title-truncation tooltip if a title is present.
    if (titleEl) {
      state.titleTooltip = attachTitleTruncationTooltip({
        element: titleEl,
        content: state.options.title ?? '',
        placement: 'bottom-center',
      });
    }

    // On the next animation frame: trigger the enter transition
    // (`is-visible`) and animate sibling toasts back to their original
    // positions via the FLIP delta captured above. Skipping rAF would
    // batch the class change with the initial paint and suppress the
    // transition.
    requestAnimationFrame(() => {
      if (state.removed) return;
      playLayoutShift();
      toast.classList.add('is-visible');
    });

    // Event listeners (the close button's click is wired via the
    // ArvoIconButton onClick option above)
    toast.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this._remove(id, 'escape');
      }
    });

    if (shouldFade) {
      this._startFadeTimer(state, timeout);

      if (pauseOnHover) {
        toast.addEventListener('mouseenter', () => {
          if (state.timer) { clearTimeout(state.timer); state.timer = null; }
          toast.classList.add('is-paused');
        });

        toast.addEventListener('mouseleave', () => {
          toast.classList.remove('is-paused');
          this._startFadeTimer(state, timeout);
        });
      }
    }

    return id;
  }

  // -- close ------------------------------------------------------------

  close(id: string): void {
    this._remove(id, 'programmatic');
  }

  // -- closeAll ---------------------------------------------------------

  closeAll(): void {
    const ids = [...this._toasts.keys()];
    for (const id of ids) {
      this._remove(id, 'programmatic');
    }
  }

  // -- destroy ----------------------------------------------------------

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.closeAll();
    this._surface?.destroy();
    this._surface = null;
    this._container?.remove();
    this._container = null;
  }

  // -- internal helpers -------------------------------------------------

  private _startFadeTimer(state: ToastState, timeout: number): void {
    state.timer = setTimeout(() => {
      const el = state.element;
      // Reduced motion: skip the exit transition; remove immediately.
      if (prefersReducedMotion()) {
        this._remove(state.id, 'fade');
        return;
      }
      // Trigger the exit pose. `transitionend` then drives DOM removal
      // (and the FLIP layout-shift on the surviving siblings).
      el.classList.remove('is-paused');
      el.classList.remove('is-visible');
      el.classList.add('is-removing');
      const onEnd = (event: Event) => {
        // `transitionend` fires once per animated property -- gate on
        // opacity so we don't remove the toast twice when both opacity
        // and transform end on the same frame.
        if ((event as TransitionEvent).propertyName && (event as TransitionEvent).propertyName !== 'opacity') {
          return;
        }
        el.removeEventListener('transitionend', onEnd);
        this._remove(state.id, 'fade');
      };
      el.addEventListener('transitionend', onEnd);
    }, timeout);
  }

  private _remove(id: string, reason: ArvoToastCloseReason): void {
    const state = this._toasts.get(id);
    if (!state || state.removed) return;
    state.removed = true;

    if (state.timer) { clearTimeout(state.timer); state.timer = null; }

    state.options.onClose?.();

    state.titleTooltip?.destroy();
    state.titleTooltip = null;

    state.link?.destroy();
    state.link = null;

    state.closeBtn?.destroy();
    state.closeBtn = null;

    // Capture sibling rects BEFORE the toast leaves the DOM so the
    // remaining toasts smoothly slide up into the freed slot.
    const playLayoutShift = this._captureLayoutShift(state.element);

    state.element.remove();
    this._toasts.delete(id);

    requestAnimationFrame(() => playLayoutShift());

    this._container?.dispatchEvent(new CustomEvent('toast:close', {
      bubbles: true,
      cancelable: false,
      detail: { id, reason },
    }));
  }

  /**
   * FLIP layout-shift compensation for the toast stack. Reads the
   * pre-mutation rects of every toast (optionally excluding one that
   * is about to leave the DOM), and returns a callback that -- when
   * invoked after the DOM mutation -- animates each surviving toast
   * from its previous position back to (0, 0) via WAAPI. Matches the
   * `$arvo-motion-layout-shift` token (220ms emphasized easing).
   *
   * No-op on reduced-motion users and on browsers without
   * `Element.animate`.
   */
  private _captureLayoutShift(excludeEl?: HTMLElement): () => void {
    const container = this._container;
    if (!container) return () => {};
    if (prefersReducedMotion()) return () => {};

    const children = Array.from(container.children) as HTMLElement[];
    const firstRects = new Map<HTMLElement, DOMRect>();
    for (const child of children) {
      if (child === excludeEl) continue;
      firstRects.set(child, child.getBoundingClientRect());
    }

    return () => {
      for (const [el, first] of firstRects) {
        if (!el.isConnected) continue;
        const last = el.getBoundingClientRect();
        const deltaY = first.top - last.top;
        if (deltaY === 0) continue;
        if (typeof el.animate !== 'function') continue;
        el.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: 'translateY(0)' },
          ],
          {
            duration: LAYOUT_SHIFT_DURATION_MS,
            easing: LAYOUT_SHIFT_EASING,
          },
        );
      }
    };
  }
}
