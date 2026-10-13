// Vanilla JS ArvoFormLabel.
//
// Public atomic form-label primitive. Renders either a `<label>` (default,
// sibling-association with a control via `for`) or an inner `<span>` caption
// used inside a wrapping `<label>` on selection controls (Radio, Switch,
// Checkbox). Mirrors the React `<ArvoFormLabel>` / `<ArvoFormLabelText>`
// pair 1:1 in DOM shape, BEM classes, and ARIA semantics.
//
// Default size is sm (12px). Pass `size: 'lg'` for 14px (used by selection
// controls in their lg variant). All other form controls render labels at
// 12px regardless of field size, so they should NOT pass a `size` option.

import type { TooltipPlacement } from '@arvo/core';
import { ArvoContextHelp } from '../ContextHelp/ContextHelp';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOCK = 'arvo-form-lbl';
const M_LG = `${BLOCK}--lg`;
const M_REQUIRED = `${BLOCK}--required`;
const E_REQ = `${BLOCK}__req`;
const E_CTX_HELP = `${BLOCK}__ctx-help`;
const STATE_DISABLED = 'is-disabled';
const STATE_INVALID = 'is-invalid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArvoFormLabelSize = 'sm' | 'lg';
export type ArvoFormLabelAs = 'label' | 'span';

export interface ArvoFormLabelContextHelpConfig {
  content: string;
  variant?: 'info' | 'question';
  ariaLabel?: string;
  placement?: TooltipPlacement;
}

export interface ArvoFormLabelOptions {
  /** Caption text. Required at construction. */
  text: string;
  /** Rendered tag. Defaults to `'label'`. Use `'span'` for inner-caption use. */
  as?: ArvoFormLabelAs;
  /** id of the associated control. Honored only when `as === 'label'`. */
  for?: string | null;
  /** Label size. Defaults to `'sm'` (12px). */
  size?: ArvoFormLabelSize;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  /**
   * Optional override for the required indicator content. String renders as
   * text inside the `__req` span; HTMLElement is appended as-is.
   */
  requiredIndicator?: string | HTMLElement | null;
  /**
   * Optional contextual-help icon configuration. When provided, an embedded
   * `ArvoContextHelp` is rendered inside an absolutely-positioned wrapper.
   * The inner icon is always created at `size: 'sm'` (14px) regardless of
   * the FormLabel size, per the Figma spec. Set at construction only --
   * there is no setter; consumers can mutate the tooltip via the instance
   * returned by `contextHelp()` (e.g. `lbl.contextHelp()?.setContent(...)`).
   */
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoFormLabel {
  public readonly el: HTMLLabelElement | HTMLSpanElement;

  private _text: string;
  private _as: ArvoFormLabelAs;
  private _for: string | null;
  private _size: ArvoFormLabelSize;
  private _isRequired: boolean;
  private _isDisabled: boolean;
  private _isInvalid: boolean;
  private _requiredIndicator: string | HTMLElement | null;
  private _contextHelpConfig: ArvoFormLabelContextHelpConfig | null;

  private _textNode: Text | null = null;
  private _reqEl: HTMLSpanElement | null = null;
  private _ctxHelpWrapperEl: HTMLSpanElement | null = null;
  private _ctxHelp: ArvoContextHelp | null = null;
  private _destroyed = false;

  /**
   * Factory entry point. If `element` is `null`, a new element of the
   * configured tag is created. If an existing element is passed, the tag is
   * preserved -- the `as` option is ignored and inferred from the element.
   */
  static initialize(
    element: HTMLElement | null,
    options: ArvoFormLabelOptions,
  ): ArvoFormLabel {
    return new ArvoFormLabel(element, options);
  }

  constructor(element: HTMLElement | null, options: ArvoFormLabelOptions) {
    this._text = options.text;
    this._as = options.as ?? (element instanceof HTMLSpanElement ? 'span' : 'label');
    this._for = options.for ?? null;
    this._size = options.size ?? 'sm';
    this._isRequired = options.isRequired ?? false;
    this._isDisabled = options.isDisabled ?? false;
    this._isInvalid = options.isInvalid ?? false;
    this._requiredIndicator = options.requiredIndicator ?? null;
    this._contextHelpConfig = options.contextHelp ?? null;

    if (element) {
      this.el = element as HTMLLabelElement | HTMLSpanElement;
    } else {
      this.el = document.createElement(this._as) as HTMLLabelElement | HTMLSpanElement;
    }

    this._render();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(): void {
    const el = this.el;

    this._unmountContextHelp();
    while (el.firstChild) el.removeChild(el.firstChild);
    this._reqEl = null;

    el.classList.add(BLOCK);
    el.classList.toggle(M_LG, this._size === 'lg');
    el.classList.toggle(M_REQUIRED, this._isRequired);
    el.classList.toggle(STATE_DISABLED, this._isDisabled);
    el.classList.toggle(STATE_INVALID, this._isInvalid);

    if (this._as === 'label' && this._for) {
      el.setAttribute('for', this._for);
    } else {
      el.removeAttribute('for');
    }

    this._textNode = document.createTextNode(this._text);
    el.appendChild(this._textNode);

    if (this._isRequired) {
      this._mountRequiredIndicator();
    }

    if (this._contextHelpConfig) {
      this._mountContextHelp();
    }
  }

  private _mountRequiredIndicator(): void {
    this._reqEl = document.createElement('span');
    this._reqEl.className = E_REQ;
    this._reqEl.setAttribute('aria-hidden', 'true');

    const custom = this._requiredIndicator;
    if (custom instanceof HTMLElement) {
      this._reqEl.appendChild(custom);
    } else if (typeof custom === 'string' && custom.length > 0) {
      this._reqEl.textContent = custom;
    } else {
      this._reqEl.textContent = '*';
    }

    // Insert before the context-help wrapper (when present) so DOM order
    // matches the React JSX (text -> __req -> __ctx-help). Both children are
    // absolutely positioned, so this is purely for source-order consistency.
    if (this._ctxHelpWrapperEl) {
      this.el.insertBefore(this._reqEl, this._ctxHelpWrapperEl);
    } else {
      this.el.appendChild(this._reqEl);
    }
  }

  private _unmountRequiredIndicator(): void {
    if (this._reqEl) {
      this._reqEl.remove();
      this._reqEl = null;
    }
  }

  private _mountContextHelp(): void {
    const cfg = this._contextHelpConfig;
    if (!cfg) return;

    this._ctxHelpWrapperEl = document.createElement('span');
    this._ctxHelpWrapperEl.className = E_CTX_HELP;

    const btn = document.createElement('button');
    btn.type = 'button';
    this._ctxHelpWrapperEl.appendChild(btn);
    this.el.appendChild(this._ctxHelpWrapperEl);

    // size is locked to 'sm' (14px) regardless of label size, per Figma.
    this._ctxHelp = ArvoContextHelp.initialize(btn, {
      content: cfg.content,
      variant: cfg.variant,
      ariaLabel: cfg.ariaLabel,
      placement: cfg.placement,
      size: 'sm',
    });
  }

  private _unmountContextHelp(): void {
    if (this._ctxHelp) {
      this._ctxHelp.destroy();
      this._ctxHelp = null;
    }
    if (this._ctxHelpWrapperEl) {
      this._ctxHelpWrapperEl.remove();
      this._ctxHelpWrapperEl = null;
    }
  }

  // -------------------------------------------------------------------------
  // Public methods (dual-purpose getter/setter pattern)
  // -------------------------------------------------------------------------

  text(): string;
  text(next: string): void;
  text(next?: string): string | void {
    if (next === undefined) return this._text;
    this._text = next;
    if (this._textNode) this._textNode.nodeValue = next;
    else this._render();
  }

  size(): ArvoFormLabelSize;
  size(next: ArvoFormLabelSize): void;
  size(next?: ArvoFormLabelSize): ArvoFormLabelSize | void {
    if (next === undefined) return this._size;
    if (this._size === next) return;
    this._size = next;
    this.el.classList.toggle(M_LG, next === 'lg');
  }

  required(): boolean;
  required(next: boolean): void;
  required(next?: boolean): boolean | void {
    if (next === undefined) return this._isRequired;
    if (this._isRequired === next) return;
    this._isRequired = next;
    this.el.classList.toggle(M_REQUIRED, next);
    if (next) this._mountRequiredIndicator();
    else this._unmountRequiredIndicator();
  }

  disabled(): boolean;
  disabled(next: boolean): void;
  disabled(next?: boolean): boolean | void {
    if (next === undefined) return this._isDisabled;
    if (this._isDisabled === next) return;
    this._isDisabled = next;
    this.el.classList.toggle(STATE_DISABLED, next);
  }

  invalid(): boolean;
  invalid(next: boolean): void;
  invalid(next?: boolean): boolean | void {
    if (next === undefined) return this._isInvalid;
    if (this._isInvalid === next) return;
    this._isInvalid = next;
    this.el.classList.toggle(STATE_INVALID, next);
  }

  /**
   * Gets or sets the `for` attribute. Only meaningful when rendered as a
   * `<label>`; setting on a `<span>` is a no-op.
   */
  for(): string | null;
  for(next: string | null): void;
  for(next?: string | null): string | null | void {
    if (next === undefined) return this._for;
    this._for = next ?? null;
    if (this._as !== 'label') return;
    if (next) this.el.setAttribute('for', next);
    else this.el.removeAttribute('for');
  }

  /** Returns the rendered tag. Set at construction; cannot be changed. */
  as(): ArvoFormLabelAs {
    return this._as;
  }

  /**
   * Returns the embedded ArvoContextHelp instance, or null when no
   * `contextHelp` option was provided. Read-only -- the embedded instance is
   * set at construction. Use the returned instance to mutate the tooltip,
   * e.g. `lbl.contextHelp()?.setContent('...')`.
   */
  contextHelp(): ArvoContextHelp | null {
    return this._ctxHelp;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._unmountContextHelp();
    this._unmountRequiredIndicator();
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    this._textNode = null;
  }
}
