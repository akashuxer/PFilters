/**
 * ArvoBannerAlert -- vanilla JS implementation.
 *
 * Persistent inline alert banner with full parity to the React version at
 * packages/react/src/components/BannerAlert/BannerAlert.tsx.
 *   - Title is 2-line clamped with a tooltip on truncation (shared
 *     `attachTitleTruncationTooltip` util).
 *   - Message accepts the shared `BasicInlineContent` AST from
 *     `@arvo/core/inline-content`.
 *   - Replaces the consumer-supplied `link?: HTMLElement` slot with two
 *     structured config options: `button?: ArvoBannerAlertButton` (renders
 *     an outline `ArvoButton`) and `link?: ArvoBannerAlertLink` (renders an
 *     `ArvoLink`). The component owns those inner instances and destroys
 *     them in `destroy()`.
 *
 * Dismissing the banner (via the close button or `dismiss()`) fires
 * `bnr-alert:dismiss`, calls `onDismiss`, plays a collapse-from-bottom-to-top
 * transition (`is-closing` class drives opacity + transform, an inline
 * `max-height` locked to the host's current pixel height transitions to 0),
 * then tears down the component and removes its host element once
 * `transitionend` fires. The transition is skipped when
 * `prefers-reduced-motion: reduce` is active.
 */

import {
  prefersReducedMotion,
  renderInlineContentToDOM,
  type BasicInlineContent,
} from '@arvo/core';
import {
  attachTitleTruncationTooltip,
  type TitleTruncationHandle,
} from '@arvo/utils';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoButton } from '../Button/Button';
import { ArvoLink } from '../Link/Link';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoBannerAlertType =
  | 'positive'
  | 'info'
  | 'neutral'
  | 'warning'
  | 'negative'
  | 'block';

export type ArvoBannerAlertRole = 'status' | 'alert';

/**
 * Structured config for the optional outline action button. Banner Alert
 * curates `variant: 'outline'` and `size: 'sm'`.
 */
export interface ArvoBannerAlertButton {
  label: string;
  icon?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
}

/**
 * Structured config for the optional inline link action. Banner Alert
 * renders an `ArvoLink`; `target='_blank'` automatically receives
 * `rel='noopener noreferrer'`.
 */
export interface ArvoBannerAlertLink {
  label: string;
  href: string;
  target?: '_self' | '_blank';
  rel?: string;
  icon?: string;
  isExternal?: boolean;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
}

export interface ArvoBannerAlertOptions {
  /** Body content. Plain string OR a `BasicInlineContent` array. */
  message: BasicInlineContent;
  /** Semantic alert type. Defaults to "info". */
  type?: ArvoBannerAlertType;
  /** Optional title rendered above the message. Ignored in compact mode. */
  title?: string | null;
  /** Layout mode. When true, renders only the message with tighter padding. */
  isCompact?: boolean;
  /** Whether to render the close button on the right. Defaults to true. */
  isDismissible?: boolean;
  /** Optional outline action button rendered in the action row. Ignored in compact mode. */
  button?: ArvoBannerAlertButton | null;
  /** Optional inline link rendered in the action row. Ignored in compact mode. */
  link?: ArvoBannerAlertLink | null;
  /**
   * Optional o9con icon name override (without the `o9con-` prefix). **Only
   * honored when `type='neutral'`** -- every other type renders its semantic
   * glyph via the SCSS pattern and ignores this option. The neutral type
   * itself has no fixed semantic glyph, so consumers may pass any o9con name
   * (e.g. `'bell-o'`, `'star'`) and it renders as a child
   * `<i class="o9con o9con-{name}">` inside `__ico`, with the
   * `has-icon-override` state class on the root.
   */
  icon?: string | null;
  /** Pattern A shimmer loading state. */
  isLoading?: boolean;
  /** Explicit ARIA role override. Defaults to type-derived role. */
  role?: ArvoBannerAlertRole;
  /** Fired when the close button is clicked or dismiss() is called. */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const TYPES: readonly ArvoBannerAlertType[] = [
  'positive',
  'info',
  'neutral',
  'warning',
  'negative',
  'block',
];

const ASSERTIVE_TYPES: ReadonlySet<ArvoBannerAlertType> = new Set([
  'negative',
  'block',
]);

function resolveRole(
  type: ArvoBannerAlertType,
  roleOverride: ArvoBannerAlertRole | undefined,
): ArvoBannerAlertRole {
  if (roleOverride) return roleOverride;
  return ASSERTIVE_TYPES.has(type) ? 'alert' : 'status';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoBannerAlert {
  // -- DOM references -----------------------------------------------------
  private _root: HTMLElement | null;
  private _iconEl: HTMLSpanElement | null = null;
  private _iconOverrideEl: HTMLElement | null = null;
  private _contentEl: HTMLDivElement | null = null;
  private _copyEl: HTMLDivElement | null = null;
  private _titleEl: HTMLParagraphElement | null = null;
  private _msgEl: HTMLParagraphElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _btnEl: HTMLButtonElement | null = null;
  private _btnInstance: ArvoButton | null = null;
  private _linkEl: HTMLAnchorElement | null = null;
  private _linkInstance: ArvoLink | null = null;
  private _closeEl: HTMLButtonElement | null = null;
  private _closeBtnInstance: ArvoIconButton | null = null;
  private _titleTooltip: TitleTruncationHandle | null = null;

  // -- Resolved state -----------------------------------------------------
  private _options: ArvoBannerAlertOptions;
  private _currentType: ArvoBannerAlertType;
  private _icon: string | null;
  private _isCompact: boolean;
  private _isDismissible: boolean;
  private _isLoading: boolean;
  private _userRoleOverride: boolean;
  private _addedRole: boolean = false;
  private _addedAriaBusy: boolean = false;
  private _destroyed: boolean = false;
  private _isClosing: boolean = false;

  // Custom icon override is gated on `type === 'neutral'` -- every other
  // type renders its semantic glyph via the SCSS pattern and ignores `_icon`.
  private get _iconOverrideActive(): boolean {
    return (
      this._currentType === 'neutral' &&
      this._icon !== null &&
      this._icon !== ''
    );
  }

  static initialize(
    element: HTMLElement,
    options: ArvoBannerAlertOptions,
  ): ArvoBannerAlert {
    return new ArvoBannerAlert(element, options);
  }

  constructor(element: HTMLElement, options: ArvoBannerAlertOptions) {
    this._root = element;
    this._options = { ...options };

    const rawType = options?.type;
    this._currentType =
      rawType && (TYPES as readonly string[]).includes(rawType)
        ? rawType
        : 'info';
    this._isCompact = options?.isCompact === true;
    this._isDismissible = options?.isDismissible !== false; // default true
    this._icon = options?.icon ?? null;
    this._isLoading = options?.isLoading === true;
    this._userRoleOverride = options?.role !== undefined;

    // Compact mode + title: warn in dev. Title is dropped from rendering.
    if (
      this._isCompact &&
      options?.title != null &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production' &&
      typeof console !== 'undefined' &&
      typeof console.warn === 'function'
    ) {
      console.warn(
        '[ArvoBannerAlert] `title` is ignored when `isCompact` is true. The title will not be rendered in compact mode.',
      );
    }

    this._render();
  }

  // -- Render -------------------------------------------------------------

  private _render(): void {
    const root = this._root;
    if (!root) return;

    root.classList.add('arvo-bnr-alert');
    root.classList.add(`arvo-bnr-alert--${this._currentType}`);
    if (this._isCompact) root.classList.add('arvo-bnr-alert--compact');
    if (this._isCompact || this._options.title == null) {
      root.classList.add('arvo-bnr-alert--no-title');
    }
    if (this._isLoading) root.classList.add('loading');
    if (this._iconOverrideActive) root.classList.add('has-icon-override');

    const resolvedRole = resolveRole(this._currentType, this._options.role);
    root.setAttribute('role', resolvedRole);
    this._addedRole = true;

    if (this._isLoading) {
      root.setAttribute('aria-busy', 'true');
      this._addedAriaBusy = true;
    }

    // -- Icon ------------------------------------------------------------
    const ico = document.createElement('span');
    ico.className = 'arvo-bnr-alert__ico o9con';
    ico.setAttribute('aria-hidden', 'true');
    this._iconEl = ico;
    if (this._iconOverrideActive) {
      this._iconOverrideEl = document.createElement('i');
      this._iconOverrideEl.className = `o9con o9con-${this._icon}`;
      ico.appendChild(this._iconOverrideEl);
    }
    root.appendChild(ico);

    // -- Content wrapper ------------------------------------------------
    const content = document.createElement('div');
    content.className = 'arvo-bnr-alert__content';
    this._contentEl = content;

    if (this._isCompact) {
      const msg = document.createElement('p');
      msg.className = 'arvo-bnr-alert__msg';
      this._writeMessageInto(msg, this._options.message);
      this._msgEl = msg;
      content.appendChild(msg);
    } else {
      const copy = document.createElement('div');
      copy.className = 'arvo-bnr-alert__copy';
      this._copyEl = copy;

      if (this._options.title != null) {
        const titleEl = document.createElement('p');
        titleEl.className = 'arvo-bnr-alert__title';
        titleEl.textContent = this._options.title;
        this._titleEl = titleEl;
        copy.appendChild(titleEl);
      }

      const msg = document.createElement('p');
      msg.className = 'arvo-bnr-alert__msg';
      this._writeMessageInto(msg, this._options.message);
      this._msgEl = msg;
      copy.appendChild(msg);

      content.appendChild(copy);

      // Action row (button + link). Only rendered when at least one is set.
      if (this._options.button || this._options.link) {
        const actions = document.createElement('div');
        actions.className = 'arvo-bnr-alert__actions';
        this._actionsEl = actions;

        if (this._options.button) {
          const btnEl = document.createElement('button');
          btnEl.className = 'arvo-bnr-alert__btn';
          this._btnEl = btnEl;
          this._btnInstance = ArvoButton.initialize(btnEl, {
            variant: 'outline',
            size: 'sm',
            label: this._options.button.label,
            icon: this._options.button.icon ?? null,
            isDisabled: this._options.button.isDisabled,
            isLoading: this._options.button.isLoading,
            onClick: this._options.button.onClick,
          });
          if (this._options.button.ariaLabel) {
            btnEl.setAttribute('aria-label', this._options.button.ariaLabel);
          }
          actions.appendChild(btnEl);
        }

        if (this._options.link) {
          const aEl = document.createElement('a');
          aEl.className = 'arvo-bnr-alert__link';
          this._linkEl = aEl;
          this._linkInstance = ArvoLink.initialize(aEl, {
            size: 'sm',
            variant: 'primary',
            label: this._options.link.label,
            href: this._options.link.href,
            target: this._options.link.target,
            icon: this._options.link.icon ?? null,
            isExternal: this._options.link.isExternal ?? false,
            onClick: this._options.link.onClick,
          });
          // ArvoLink auto-applies rel='noopener noreferrer' when target=_blank;
          // explicit rel passthrough for callers that need a custom rel string.
          if (this._options.link.rel && aEl.getAttribute('target') !== '_blank') {
            aEl.setAttribute('rel', this._options.link.rel);
          }
          if (this._options.link.ariaLabel) {
            aEl.setAttribute('aria-label', this._options.link.ariaLabel);
          }
          actions.appendChild(aEl);
        }

        content.appendChild(actions);
      }
    }

    root.appendChild(content);

    // -- Title-truncation tooltip ---------------------------------------
    if (!this._isCompact && this._titleEl && this._options.title) {
      this._titleTooltip = attachTitleTruncationTooltip({
        element: this._titleEl,
        content: this._options.title,
        placement: 'bottom-center',
      });
    }

    // -- Close button ---------------------------------------------------
    if (this._isDismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'arvo-bnr-alert__close';
      this._closeBtnInstance = ArvoIconButton.initialize(closeBtn, {
        variant: 'tertiary',
        size: 'xs',
        icon: 'close',
        tooltip: 'Dismiss alert',
        onClick: () => this.dismiss(),
      });
      closeBtn.setAttribute('aria-label', 'Dismiss alert');

      this._closeEl = closeBtn;
      root.appendChild(closeBtn);
    }
  }

  private _writeMessageInto(target: HTMLElement, message: BasicInlineContent): void {
    while (target.firstChild) target.removeChild(target.firstChild);
    if (typeof message === 'string') {
      target.textContent = message;
      return;
    }
    target.appendChild(
      renderInlineContentToDOM(message, { profile: 'basic-inline' }),
    );
  }

  // -- Public methods (dual-purpose getter/setter) ------------------------

  type(): ArvoBannerAlertType;
  type(newType: ArvoBannerAlertType): void;
  type(newType?: ArvoBannerAlertType): ArvoBannerAlertType | void {
    if (newType === undefined) return this._currentType;
    if (this._destroyed) return;
    if (!(TYPES as readonly string[]).includes(newType)) return;
    if (newType === this._currentType) return;

    const root = this._root;
    if (!root) return;

    root.classList.remove(`arvo-bnr-alert--${this._currentType}`);
    root.classList.add(`arvo-bnr-alert--${newType}`);
    this._currentType = newType;
    this._options.type = newType;

    if (!this._userRoleOverride) {
      const resolved = resolveRole(newType, undefined);
      root.setAttribute('role', resolved);
      this._addedRole = true;
    }

    // Re-evaluate the icon-override gating: only `neutral` honors a custom
    // `icon`. Switching type may suppress or restore the override element
    // and its `has-icon-override` state class.
    this._syncIconOverride();
  }

  icon(): string | null;
  icon(next: string | null): void;
  icon(next?: string | null): string | null | void {
    if (next === undefined) return this._icon;
    if (this._destroyed) return;

    this._icon = next ?? null;
    this._options.icon = this._icon;

    this._syncIconOverride();
  }

  // Re-render (or tear down) the override `<i>` glyph inside `__ico` and
  // toggle the `has-icon-override` state class to match the current
  // (`type`, `_icon`) pair. Idempotent: safe to call from `type()` and
  // `icon()` setters AND from `_render()` for the initial mount path.
  private _syncIconOverride(): void {
    const root = this._root;
    if (!root) return;

    root.classList.toggle('has-icon-override', this._iconOverrideActive);

    if (this._iconOverrideEl) {
      this._iconOverrideEl.remove();
      this._iconOverrideEl = null;
    }

    if (this._iconEl && this._iconOverrideActive) {
      this._iconOverrideEl = document.createElement('i');
      this._iconOverrideEl.className = `o9con o9con-${this._icon}`;
      this._iconEl.appendChild(this._iconOverrideEl);
    }
  }

  message(): BasicInlineContent;
  message(content: BasicInlineContent): void;
  message(content?: BasicInlineContent): BasicInlineContent | void {
    if (content === undefined) return this._options.message ?? '';
    if (this._destroyed) return;
    this._options.message = content;
    if (this._msgEl) {
      this._writeMessageInto(this._msgEl, content);
    }
  }

  title(): string | null;
  title(text: string | null): void;
  title(text?: string | null): string | null | void {
    if (arguments.length === 0) {
      return this._options.title ?? null;
    }
    if (this._destroyed) return;

    if (this._isCompact) {
      this._options.title = text ?? null;
      return;
    }

    const copy = this._copyEl;
    if (!copy) return;

    if (text == null) {
      if (this._titleTooltip) {
        this._titleTooltip.destroy();
        this._titleTooltip = null;
      }
      if (this._titleEl) {
        this._titleEl.remove();
        this._titleEl = null;
      }
      this._options.title = null;
      this._root?.classList.add('arvo-bnr-alert--no-title');
      return;
    }

    if (this._titleEl) {
      this._titleEl.textContent = text;
      this._titleTooltip?.update(text);
    } else {
      const titleEl = document.createElement('p');
      titleEl.className = 'arvo-bnr-alert__title';
      titleEl.textContent = text;
      this._titleEl = titleEl;
      copy.insertBefore(titleEl, copy.firstChild);
      this._titleTooltip = attachTitleTruncationTooltip({
        element: titleEl,
        content: text,
        placement: 'bottom-center',
      });
    }
    this._options.title = text;
    this._root?.classList.remove('arvo-bnr-alert--no-title');
  }

  loading(): boolean;
  loading(state: boolean): void;
  loading(state?: boolean): boolean | void {
    if (state === undefined) return this._isLoading;
    if (this._destroyed) return;

    const root = this._root;
    if (!root) return;

    const next = state === true;
    if (next === this._isLoading) return;

    this._isLoading = next;
    this._options.isLoading = next;

    if (next) {
      root.classList.add('loading');
      root.setAttribute('aria-busy', 'true');
      this._addedAriaBusy = true;
    } else {
      root.classList.remove('loading');
      root.removeAttribute('aria-busy');
      this._addedAriaBusy = false;
    }
  }

  // -- dismiss / destroy --------------------------------------------------

  dismiss(): void {
    if (this._destroyed || this._isClosing) return;
    const root = this._root;
    if (!root) return;

    this._isClosing = true;

    root.dispatchEvent(
      new CustomEvent('bnr-alert:dismiss', {
        bubbles: false,
        cancelable: false,
      }),
    );

    this._options.onDismiss?.();

    // Reduced motion: skip the collapse transition and detach immediately.
    if (prefersReducedMotion()) {
      this.destroy();
      root.remove();
      return;
    }

    // Lock the host's current pixel height so `max-height` can transition
    // smoothly to 0. Force a reflow so the locked value is committed before
    // the closing class + collapsed max-height are applied.
    root.style.maxHeight = `${root.offsetHeight}px`;
    void root.offsetHeight;

    root.classList.add('is-closing');
    root.style.maxHeight = '0';

    const onEnd = (event: Event) => {
      // `transitionend` fires once per animated property -- gate on
      // `opacity` so we tear the banner down exactly once even when
      // opacity + transform + max-height all complete in parallel.
      if ((event as TransitionEvent).propertyName !== 'opacity') return;
      root.removeEventListener('transitionend', onEnd);
      // Tear down inner component instances and listeners, then detach
      // the host element from the DOM.
      this.destroy();
      root.remove();
    };
    root.addEventListener('transitionend', onEnd);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    const root = this._root;

    if (this._titleTooltip) {
      this._titleTooltip.destroy();
      this._titleTooltip = null;
    }

    if (this._btnInstance) {
      this._btnInstance.destroy();
      this._btnInstance = null;
    }
    if (this._linkInstance) {
      this._linkInstance.destroy();
      this._linkInstance = null;
    }
    if (this._closeBtnInstance) {
      this._closeBtnInstance.destroy();
      this._closeBtnInstance = null;
    }

    if (root) {
      root.innerHTML = '';

      const toRemove: string[] = [];
      for (const cls of Array.from(root.classList)) {
        if (
          cls === 'loading' ||
          cls === 'has-icon-override' ||
          cls.startsWith('arvo-bnr-alert')
        ) {
          toRemove.push(cls);
        }
      }
      for (const cls of toRemove) {
        root.classList.remove(cls);
      }

      if (this._addedRole) {
        root.removeAttribute('role');
      }
      if (this._addedAriaBusy) {
        root.removeAttribute('aria-busy');
      }
    }

    this._root = null;
    this._iconEl = null;
    this._iconOverrideEl = null;
    this._contentEl = null;
    this._copyEl = null;
    this._titleEl = null;
    this._msgEl = null;
    this._actionsEl = null;
    this._btnEl = null;
    this._linkEl = null;
    this._closeEl = null;
  }
}
