// Vanilla JS ArvoMessageAlert.
//
// Public atomic message-alert primitive used everywhere a compact icon +
// (optional) message status row needs to render. Two display modes:
//   - full mode (`isInline=false`, default): icon + message + optional
//     dismiss button.
//   - inline mode (`isInline=true`): icon-only, sized 16x16, used as the
//     in-field tooltip-error icon by form inputs.
//
// Mirrors the React `<ArvoMessageAlert>` 1:1 in DOM shape, BEM, ARIA
// attributes, role auto-resolution rules, and the `msg-alert:dismiss`
// custom event.

import {
  prefersReducedMotion,
  renderInlineContentToDOM,
  type BasicInlineContent,
} from '@arvo/core';
import { ArvoIconButton } from '../IconButton/IconButton';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ARVO_MSG_ALERT_DEFAULT_ERROR = 'Form field value is invalid';

const BLOCK = 'arvo-msg-alert';
const E_ICO = `${BLOCK}__ico`;
const E_MSG = `${BLOCK}__msg`;
const E_BODY = `${BLOCK}__body`;
const E_CLOSE = `${BLOCK}__close`;
const M_INLINE = `${BLOCK}--inline`;
const M_DISMISSABLE = `${BLOCK}--dismissable`;
const STATE_ICON_OVERRIDE = 'has-icon-override';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArvoMessageAlertType =
  | 'negative'
  | 'positive'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'block';

export interface ArvoMessageAlertOptions {
  type?: ArvoMessageAlertType;
  isInline?: boolean;
  /**
   * Alert message. Plain string OR a `BasicInlineContent` array (text, em,
   * strong, link, code, kbd) from the shared inline-content contract. In
   * inline mode a string is mirrored to `aria-label`; a rich array falls back
   * to the type-default label.
   */
  message?: BasicInlineContent | null;
  /**
   * Optional o9con icon override. Only honored when `type === 'neutral'` --
   * every other type renders its semantic glyph and ignores this option. The
   * neutral type itself has no fixed semantic glyph, so consumers may pass
   * any o9con name (e.g. `'bell-o'`, `'star'`).
   */
  icon?: string | null;
  isDismissable?: boolean;
  onDismiss?: (() => void) | null;
  id?: string;
  /** When omitted, role is auto-resolved from `type`. */
  role?: 'alert' | 'status';
}

const ASSERTIVE_TYPES: ReadonlyArray<ArvoMessageAlertType> = ['negative', 'warning', 'block'];

const TYPE_DEFAULT_LABEL: Record<ArvoMessageAlertType, string> = {
  negative: 'Error',
  positive: 'Success',
  warning: 'Warning',
  info: 'Information',
  neutral: 'Notice',
  block: 'Blocked',
};

const ALL_TYPES: ReadonlyArray<ArvoMessageAlertType> = [
  'negative',
  'positive',
  'warning',
  'info',
  'neutral',
  'block',
];

function resolveRole(type: ArvoMessageAlertType): 'alert' | 'status' {
  return ASSERTIVE_TYPES.includes(type) ? 'alert' : 'status';
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoMessageAlert {
  static defaultErrorMessage: string = ARVO_MSG_ALERT_DEFAULT_ERROR;

  public readonly el: HTMLElement;

  private _type: ArvoMessageAlertType;
  private _isInline: boolean;
  private _message: BasicInlineContent | null;
  private _icon: string | null;
  private _isDismissable: boolean;
  private _onDismiss: (() => void) | null;
  private _id: string | undefined;
  private _role: 'alert' | 'status';
  private _roleExplicit: boolean;

  private _bodyEl: HTMLSpanElement | null = null;
  private _icoEl: HTMLSpanElement | null = null;
  private _msgEl: HTMLSpanElement | null = null;
  private _iconOverrideEl: HTMLElement | null = null;
  private _closeBtn: ArvoIconButton | null = null;
  private _closeEl: HTMLButtonElement | null = null;

  private _boundHandleCloseClick: (event: Event) => void;
  private _destroyed = false;
  private _isClosing = false;

  // Custom icon override is gated on `type === 'neutral'` -- every other
  // type renders its semantic glyph via the SCSS pattern and ignores `_icon`.
  private get _iconOverrideActive(): boolean {
    return this._type === 'neutral' && this._icon !== null && this._icon !== '';
  }

  static initialize(
    element: HTMLElement | null,
    options: ArvoMessageAlertOptions = {},
  ): ArvoMessageAlert {
    return new ArvoMessageAlert(element, options);
  }

  constructor(element: HTMLElement | null, options: ArvoMessageAlertOptions = {}) {
    this.el = element ?? document.createElement('div');

    this._type = options.type ?? 'negative';
    this._isInline = options.isInline ?? false;
    this._message = options.message ?? null;
    this._icon = options.icon ?? null;
    this._isDismissable = options.isDismissable ?? false;
    this._onDismiss = options.onDismiss ?? null;
    this._id = options.id;
    this._roleExplicit = options.role !== undefined;
    this._role = options.role ?? resolveRole(this._type);

    this._boundHandleCloseClick = this._handleCloseClick.bind(this);

    this._render();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(): void {
    const el = this.el;

    while (el.firstChild) el.removeChild(el.firstChild);

    el.classList.add(BLOCK);
    ALL_TYPES.forEach(t => el.classList.remove(`${BLOCK}--${t}`));
    el.classList.add(`${BLOCK}--${this._type}`);

    el.classList.toggle(M_INLINE, this._isInline);
    const wantDismiss = this._isDismissable && !this._isInline;
    el.classList.toggle(M_DISMISSABLE, wantDismiss);

    el.classList.toggle(STATE_ICON_OVERRIDE, this._iconOverrideActive);

    el.setAttribute('role', this._role);
    if (this._id) {
      el.id = this._id;
    } else {
      el.removeAttribute('id');
    }

    if (this._isInline) {
      this._applyInlineAriaLabel();
    } else {
      el.removeAttribute('aria-label');
    }

    if (this._isInline) {
      this._icoEl = this._buildIconEl();
      el.appendChild(this._icoEl);
    } else {
      this._bodyEl = document.createElement('span');
      this._bodyEl.className = E_BODY;

      this._icoEl = this._buildIconEl();
      this._bodyEl.appendChild(this._icoEl);

      this._msgEl = document.createElement('span');
      this._msgEl.className = E_MSG;
      this._writeMessage();
      this._bodyEl.appendChild(this._msgEl);

      el.appendChild(this._bodyEl);

      if (wantDismiss) {
        this._mountCloseBtn();
      }
    }
  }

  // Renders the current message into `__msg` using the shared inline-content
  // adapter (basic-inline profile). No-op in inline mode where `__msg` is absent.
  private _writeMessage(): void {
    if (!this._msgEl) return;
    while (this._msgEl.firstChild) this._msgEl.removeChild(this._msgEl.firstChild);
    if (this._message != null && this._message !== '') {
      this._msgEl.appendChild(
        renderInlineContentToDOM(this._message, { profile: 'basic-inline' }),
      );
    }
  }

  private _buildIconEl(): HTMLSpanElement {
    const ico = document.createElement('span');
    ico.className = E_ICO;
    ico.setAttribute('aria-hidden', 'true');
    if (this._iconOverrideActive) {
      this._iconOverrideEl = document.createElement('i');
      this._iconOverrideEl.className = `o9con o9con-${this._icon}`;
      ico.appendChild(this._iconOverrideEl);
    } else {
      this._iconOverrideEl = null;
    }
    return ico;
  }

  private _mountCloseBtn(): void {
    this._closeEl = document.createElement('button');
    this._closeEl.classList.add(E_CLOSE);
    this._closeBtn = ArvoIconButton.initialize(this._closeEl, {
      variant: 'tertiary',
      size: 'xs',
      icon: 'close',
      tooltip: 'Dismiss',
    });
    this._closeEl.addEventListener('click', this._boundHandleCloseClick);
    this.el.appendChild(this._closeEl);
  }

  private _unmountCloseBtn(): void {
    if (this._closeEl) {
      this._closeEl.removeEventListener('click', this._boundHandleCloseClick);
    }
    if (this._closeBtn) {
      this._closeBtn.destroy();
      this._closeBtn = null;
    }
    if (this._closeEl) {
      this._closeEl.remove();
      this._closeEl = null;
    }
  }

  private _applyInlineAriaLabel(): void {
    const label =
      typeof this._message === 'string' && this._message.length > 0
        ? this._message
        : TYPE_DEFAULT_LABEL[this._type];
    this.el.setAttribute('aria-label', label);
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private _handleCloseClick(_event: Event): void {
    this.dismiss();
  }

  // -------------------------------------------------------------------------
  // Public methods (dual-purpose getter/setter pattern)
  // -------------------------------------------------------------------------

  type(): ArvoMessageAlertType;
  type(next: ArvoMessageAlertType): void;
  type(next?: ArvoMessageAlertType): ArvoMessageAlertType | void {
    if (next === undefined) return this._type;

    if (this._type === next) return;
    this._type = next;

    ALL_TYPES.forEach(t => this.el.classList.remove(`${BLOCK}--${t}`));
    this.el.classList.add(`${BLOCK}--${next}`);

    if (!this._roleExplicit) {
      this._role = resolveRole(next);
      this.el.setAttribute('role', this._role);
    }

    // Re-evaluate the icon-override gating: only `neutral` honors a custom
    // `icon`. Switching type may suppress or restore the override element
    // and its `has-icon-override` state class.
    this._syncIconOverride();

    if (this._isInline) {
      this._applyInlineAriaLabel();
    }
  }

  message(): BasicInlineContent;
  message(next: BasicInlineContent | null): void;
  message(next?: BasicInlineContent | null): BasicInlineContent | void {
    if (next === undefined) return this._message ?? '';

    this._message = next;
    this._writeMessage();

    if (this._isInline) {
      this._applyInlineAriaLabel();
    }
  }

  inline(): boolean;
  inline(next: boolean): void;
  inline(next?: boolean): boolean | void {
    if (next === undefined) return this._isInline;
    if (this._isInline === next) return;
    this._isInline = next;

    this._unmountCloseBtn();
    this._render();
  }

  dismissable(): boolean;
  dismissable(next: boolean): void;
  dismissable(next?: boolean): boolean | void {
    if (next === undefined) return this._isDismissable;
    if (this._isDismissable === next) return;
    this._isDismissable = next;

    if (this._isInline) {
      // No-op for the close button in inline mode; only the modifier flag tracks state.
      this.el.classList.toggle(M_DISMISSABLE, false);
      return;
    }

    this.el.classList.toggle(M_DISMISSABLE, next);

    if (next) {
      if (!this._closeBtn) this._mountCloseBtn();
    } else {
      this._unmountCloseBtn();
    }
  }

  icon(): string | null;
  icon(next: string | null): void;
  icon(next?: string | null): string | null | void {
    if (next === undefined) return this._icon;
    this._icon = next ?? null;

    this._syncIconOverride();
  }

  // Re-render (or tear down) the override `<i>` glyph inside `__ico` and
  // toggle the `has-icon-override` state class to match the current
  // (`type`, `_icon`) pair. Idempotent: safe to call from `type()` and
  // `icon()` setters AND from `_render()` for the initial mount path.
  private _syncIconOverride(): void {
    this.el.classList.toggle(STATE_ICON_OVERRIDE, this._iconOverrideActive);

    if (this._iconOverrideEl) {
      this._iconOverrideEl.remove();
      this._iconOverrideEl = null;
    }

    if (this._icoEl && this._iconOverrideActive) {
      this._iconOverrideEl = document.createElement('i');
      this._iconOverrideEl.className = `o9con o9con-${this._icon}`;
      this._icoEl.appendChild(this._iconOverrideEl);
    }
  }

  // Dismissal lifecycle. Mirrors ArvoBannerAlert: fires the
  // `msg-alert:dismiss` event + `onDismiss` callback synchronously, plays a
  // collapse-from-bottom-to-top transition (opacity + transform via the
  // .is-closing class, max-height locked-to-current then transitioned to 0
  // via inline style), then tears down the instance and detaches the host
  // element from the DOM on `transitionend`. Skips the transition when
  // `prefers-reduced-motion: reduce` is active.
  dismiss(): void {
    if (this._destroyed || this._isClosing) return;

    this._isClosing = true;

    this.el.dispatchEvent(new CustomEvent('msg-alert:dismiss', { bubbles: true }));
    this._onDismiss?.();

    // Reduced motion: skip the collapse transition and detach immediately.
    if (prefersReducedMotion()) {
      const root = this.el;
      this.destroy();
      root.remove();
      return;
    }

    const root = this.el;

    // Lock the host's current pixel height so `max-height` can transition
    // smoothly to 0. Force a reflow so the locked value is committed before
    // the closing class + collapsed max-height are applied.
    root.style.maxHeight = `${root.offsetHeight}px`;
    void root.offsetHeight;

    root.classList.add('is-closing');
    root.style.maxHeight = '0';

    const onEnd = (event: Event) => {
      // `transitionend` fires once per animated property -- gate on
      // `opacity` so we tear the alert down exactly once even when
      // opacity + transform + max-height all complete in parallel.
      if ((event as TransitionEvent).propertyName !== 'opacity') return;
      root.removeEventListener('transitionend', onEnd);
      this.destroy();
      root.remove();
    };
    root.addEventListener('transitionend', onEnd);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._unmountCloseBtn();

    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

    this._bodyEl = null;
    this._icoEl = null;
    this._msgEl = null;
    this._iconOverrideEl = null;
  }
}

// ---------------------------------------------------------------------------
// Static field assignment (kept at bottom so it survives the class
// declaration ordering rules).
// ---------------------------------------------------------------------------

ArvoMessageAlert.defaultErrorMessage = ARVO_MSG_ALERT_DEFAULT_ERROR;
