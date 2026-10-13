// Vanilla JS ArvoTimePickerDropdown.
//
// Public Layer 4 floating time dropdown. Wraps the internal
// ArvoTimeDropdown listbox in a portaled dialog surface and binds it to any
// consumer-provided trigger element. Mirrors the React twin.
//
// Events dispatched on the trigger element:
//   tp-drop:open    -- {} (cancelable; programmatic paths only)
//   tp-drop:close   -- {} (cancelable; programmatic paths only)
//   tp-drop:change  -- { value: TimeObject | null; formattedValue: string }
//
// Engine-driven dismissal (outside-click + Escape via the overlay hub) is
// silent: it does NOT dispatch tp-drop:close and does NOT call onClose.

import {
  applyPositionToSurface,
  createOverlaySurface,
  formatTime,
  getLocaleTimeFormat,
  getUserLocale,
  parseTime,
} from '@arvo/core';
import type {
  OverlaySurface,
  PositionResult,
  TimeObject,
} from '@arvo/core';
import { ArvoTimeDropdown } from '../TimeDropdown/TimeDropdown';

export type { TimeObject } from '@arvo/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Scoped escape-hatch bag for popover surface options. Bag-only keys
 * (`width`, `offset`, `zIndex`) flow through; flat options (`placement`)
 * always win on overlap.
 *
 * `zIndex` is a per-overlay override -- the overlay hub honors it via
 * `OverlaySurfaceOptions.zIndex` while still clamping to `parent.z + 10`
 * for any nested overlays. Prefer `overlayHub.configure({ zIndexBase })`
 * for app-wide tuning; use this when a specific surface must escape a
 * higher stacking context in the consumer app.
 */
export interface TimePickerDropdownPopoverProps {
  width?: string;
  offset?: number;
  zIndex?: number;
}

export interface ArvoTimePickerDropdownOptions {
  value?: TimeObject | Date | string | null;
  defaultValue?: TimeObject | Date | string | null;
  format?: string | null;
  locale?: string | null;
  interval?: number;
  minTime?: TimeObject | string | null;
  maxTime?: TimeObject | string | null;
  /** Initial open state (uncontrolled mode). */
  defaultOpen?: boolean;
  isDisabled?: boolean;
  /** Close the dropdown when an option is selected. Default true. */
  isAutoClose?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  /** Accessible name for the dialog panel. Defaults to 'Choose a time'. */
  ariaLabel?: string;
  popoverProps?: TimePickerDropdownPopoverProps;
  onChange?: (payload: { value: TimeObject | null; formattedValue: string }) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (open: boolean) => void;
}

interface RequiredOptions {
  value: TimeObject | Date | string | null | undefined;
  defaultValue: TimeObject | Date | string | null;
  format: string | null;
  locale: string | null;
  interval: number;
  minTime: TimeObject | string | null;
  maxTime: TimeObject | string | null;
  defaultOpen: boolean;
  isDisabled: boolean;
  isAutoClose: boolean;
  placement: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  ariaLabel: string;
  popoverProps: TimePickerDropdownPopoverProps | null;
  onChange: ArvoTimePickerDropdownOptions['onChange'] | null;
  onOpen: ArvoTimePickerDropdownOptions['onOpen'] | null;
  onClose: ArvoTimePickerDropdownOptions['onClose'] | null;
  onOpenChange: ArvoTimePickerDropdownOptions['onOpenChange'] | null;
}

// ---------------------------------------------------------------------------
// Helpers (mirror TimePicker)
// ---------------------------------------------------------------------------

function normalizeTime(v: TimeObject): TimeObject | null {
  const hours = Math.trunc(v.hours);
  const minutes = Math.trunc(v.minutes);
  const seconds = v.seconds == null ? undefined : Math.trunc(v.seconds);
  const milliseconds = v.milliseconds == null ? undefined : Math.trunc(v.milliseconds);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (seconds != null && (seconds < 0 || seconds > 59)) return null;
  if (milliseconds != null && (milliseconds < 0 || milliseconds > 999)) return null;
  const out: TimeObject = { hours, minutes };
  if (seconds != null) out.seconds = seconds;
  if (milliseconds != null) out.milliseconds = milliseconds;
  if (v.timezone != null) out.timezone = v.timezone;
  return out;
}

function timeFromDate(date: Date): TimeObject | null {
  if (Number.isNaN(date.getTime())) return null;
  return {
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    milliseconds: date.getMilliseconds(),
  };
}

function coerceTime(
  v: TimeObject | Date | string | null | undefined,
  format: string,
): TimeObject | null {
  if (v == null) return null;
  if (v instanceof Date) return timeFromDate(v);
  if (typeof v === 'string') return v.length === 0 ? null : parseTime(v, format);
  return normalizeTime(v);
}

function totalMs(v: TimeObject): number {
  return (((v.hours * 60 + v.minutes) * 60 + (v.seconds ?? 0)) * 1000) +
    (v.milliseconds ?? 0);
}

function clampToRange(
  v: TimeObject | null,
  min: TimeObject | null,
  max: TimeObject | null,
): TimeObject | null {
  if (!v) return null;
  if (min && totalMs(v) < totalMs(min)) return { ...min };
  if (max && totalMs(v) > totalMs(max)) return { ...max };
  return v;
}

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoTimePickerDropdown {
  private _trigger: HTMLElement | null;
  private _opts: RequiredOptions;
  private _id: string;
  private _popoverEl: HTMLDivElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;
  private _timeDropdownHostEl: HTMLDivElement | null = null;
  private _timeDropdown: ArvoTimeDropdown | null = null;
  private _surface: OverlaySurface | null = null;
  private _committedValue: TimeObject | null = null;
  private _isOpen = false;
  private _destroyed = false;
  // Guards the symmetric case where `this.close()` calls `surface.close()`
  // and the engine then invokes our onClose callback. The flag short-circuits
  // the second pass so we don't double-fire state sync.
  private _closingProgrammatically = false;
  private _effLocale: string;
  private _effFormat: string;

  static readonly PLACEMENTS = [
    'top-start',
    'top-end',
    'bottom-start',
    'bottom-end',
    'auto',
  ] as const;

  static readonly DEFAULTS: RequiredOptions = {
    value: undefined,
    defaultValue: null,
    format: null,
    locale: null,
    interval: 15,
    minTime: null,
    maxTime: null,
    defaultOpen: false,
    isDisabled: false,
    isAutoClose: true,
    placement: 'bottom-end',
    ariaLabel: 'Choose a time',
    popoverProps: null,
    onChange: null,
    onOpen: null,
    onClose: null,
    onOpenChange: null,
  };

  static initialize(
    trigger: HTMLElement,
    options?: ArvoTimePickerDropdownOptions,
  ): ArvoTimePickerDropdown {
    return new ArvoTimePickerDropdown(trigger, options);
  }

  constructor(trigger: HTMLElement, options?: ArvoTimePickerDropdownOptions) {
    this._trigger = trigger;
    this._id = `arvo-tp-drop-${++_idCounter}`;

    const placement =
      options?.placement &&
      (ArvoTimePickerDropdown.PLACEMENTS as readonly string[]).includes(options.placement)
        ? options.placement
        : ArvoTimePickerDropdown.DEFAULTS.placement;

    this._opts = {
      ...ArvoTimePickerDropdown.DEFAULTS,
      ...options,
      placement,
      value: options?.value,
      defaultValue: options?.defaultValue ?? null,
      popoverProps: options?.popoverProps ?? null,
      onChange: options?.onChange ?? null,
      onOpen: options?.onOpen ?? null,
      onClose: options?.onClose ?? null,
      onOpenChange: options?.onOpenChange ?? null,
    };

    this._effLocale = this._opts.locale ?? getUserLocale();
    this._effFormat = this._opts.format ?? getLocaleTimeFormat(this._effLocale);

    const initialRaw =
      this._opts.value !== undefined
        ? this._opts.value
        : this._opts.defaultValue;
    this._committedValue = clampToRange(
      coerceTime(initialRaw, this._effFormat),
      this._asTime(this._opts.minTime),
      this._asTime(this._opts.maxTime),
    );

    // Auto-bind click + keyboard on the trigger (mirrors ArvoOptionList).
    this._bindTrigger();

    if (this._opts.defaultOpen && !this._opts.isDisabled) {
      // Open in the next microtask so the host element is in the DOM if the
      // consumer constructs the dropdown inline.
      queueMicrotask(() => this.open());
    }
  }

  // -------------------------------------------------------------------------
  // Trigger binding (auto-toggle on click + Alt+Down/Up / Enter / Space)
  // -------------------------------------------------------------------------

  private _handleTriggerClick = (e: MouseEvent): void => {
    if (e.defaultPrevented) return;
    this.toggle();
  };

  private _handleTriggerKeyDown = (e: KeyboardEvent): void => {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this._isOpen) this.open();
      return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._isOpen) this.close();
      return;
    }
    if (e.key === 'Escape') {
      if (this._isOpen) {
        e.preventDefault();
        this.close();
      }
      return;
    }
  };

  private _bindTrigger(): void {
    if (!this._trigger) return;
    this._trigger.addEventListener('click', this._handleTriggerClick);
    this._trigger.addEventListener('keydown', this._handleTriggerKeyDown);
  }

  private _unbindTrigger(): void {
    if (!this._trigger) return;
    this._trigger.removeEventListener('click', this._handleTriggerClick);
    this._trigger.removeEventListener('keydown', this._handleTriggerKeyDown);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private _asTime(
    v: TimeObject | string | null | undefined,
  ): TimeObject | null {
    if (v == null) return null;
    if (typeof v === 'string') return v.length === 0 ? null : parseTime(v, this._effFormat);
    return normalizeTime(v);
  }

  private _buildPopover(): void {
    if (this._popoverEl) return;

    this._popoverEl = document.createElement('div');
    this._popoverEl.className = 'arvo-tp-drop';
    this._popoverEl.id = this._id;
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute('aria-label', this._opts.ariaLabel);
    this._popoverEl.setAttribute('aria-modal', 'false');
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = '0';
    this._popoverEl.style.left = '0';
    this._popoverEl.style.margin = '0';
    if (this._opts.popoverProps?.width) {
      this._popoverEl.style.width = this._opts.popoverProps.width;
    }

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-tp-drop__body';
    this._popoverEl.appendChild(this._bodyEl);

    this._timeDropdownHostEl = document.createElement('div');
    this._bodyEl.appendChild(this._timeDropdownHostEl);
    this._timeDropdown = this._createTimeDropdown(this._timeDropdownHostEl);
  }

  private _createTimeDropdown(host: HTMLElement): ArvoTimeDropdown {
    return ArvoTimeDropdown.initialize(host, {
      value: this._committedValue,
      format: this._effFormat,
      locale: this._effLocale,
      interval: this._opts.interval,
      minTime: this._asTime(this._opts.minTime),
      maxTime: this._asTime(this._opts.maxTime),
      isDisabled: this._opts.isDisabled,
      onChange: (time) => {
        const clamped = clampToRange(
          time,
          this._asTime(this._opts.minTime),
          this._asTime(this._opts.maxTime),
        );
        this._handleCommit(clamped);
        if (this._opts.isAutoClose) this.close();
      },
      onDismiss: () => this.close(),
    });
  }

  private _syncTimeDropdownValue(value: TimeObject | null): void {
    if (!this._timeDropdown) return;
    if (value) {
      this._timeDropdown.value(value);
      return;
    }
    // ArvoTimeDropdown's value() setter does not accept null; the existing
    // pattern from ArvoTimePicker is to destroy and re-create. Mirror it so
    // the visible "active" state is reset.
    if (!this._timeDropdownHostEl) return;
    this._timeDropdown.destroy();
    this._timeDropdown = this._createTimeDropdown(this._timeDropdownHostEl);
  }

  private _handleCommit(next: TimeObject | null): void {
    this._committedValue = next;
    const formatted = next ? formatTime(next, this._effFormat) : '';
    this._opts.onChange?.({ value: next, formattedValue: formatted });
    this._dispatch('tp-drop:change', { value: next, formattedValue: formatted });
  }

  private _dispatch(name: string, detail: Record<string, unknown> = {}): boolean {
    if (!this._trigger) return true;
    const ev = new CustomEvent(name, { bubbles: true, cancelable: true, detail });
    return this._trigger.dispatchEvent(ev);
  }

  /**
   * Engine-driven close callback. Fires for outside-click and Escape via the
   * hub. The cross-cutting overlay policy makes engine-driven dismissals
   * unconditional and silent -- no tp-drop:close event, no onClose veto.
   */
  private _handleEngineClose = (): void => {
    if (this._closingProgrammatically) return;
    if (!this._isOpen) return;
    this._isOpen = false;
    if (this._trigger) {
      this._trigger.setAttribute('aria-expanded', 'false');
    }
    this._opts.onOpenChange?.(false);
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  open(): void {
    if (this._destroyed) return;
    if (this._isOpen) return;
    if (this._opts.isDisabled) return;
    if (this._opts.onOpen?.() === false) return;
    if (!this._dispatch('tp-drop:open')) return;

    this._isOpen = true;
    this._buildPopover();
    this._syncTimeDropdownValue(this._committedValue);

    if (this._popoverEl) {
      this._popoverEl.style.visibility = 'hidden';
    }

    if (!this._surface && this._popoverEl) {
      this._surface = createOverlaySurface({
        id: this._id,
        surface: this._popoverEl,
        type: 'dropdown',
        priority: 20,
        trigger: this._trigger,
        zIndex: this._opts.popoverProps?.zIndex,
        mount: {
          target: document.body,
          removeOnClose: true,
        },
        position: {
          placement: this._opts.placement,
          gap: this._opts.popoverProps?.offset ?? 4,
          apply: (pos: PositionResult, surfaceEl: HTMLElement) => {
            applyPositionToSurface(pos, surfaceEl);
            surfaceEl.style.visibility = '';
          },
        },
        focus: {
          mode: 'trap',
          initialFocus: 'none',
          returnFocus: false,
          getOrderedElements: () => {
            // ArvoTimeDropdown uses roving tabindex; the single
            // `[tabindex="0"]` element is the focused option.
            const root = this._popoverEl;
            if (!root) return [];
            return [root.querySelector<HTMLElement>('[tabindex="0"]')];
          },
        },
        transition: 'fade',
        transitionDuration: 150,
        triggerAria: { haspopup: 'dialog' },
        onClose: this._handleEngineClose,
      });
    } else if (this._surface) {
      this._surface.setTrigger(this._trigger);
    }

    void this._surface?.open();

    if (this._trigger) {
      this._trigger.setAttribute('aria-expanded', 'true');
    }

    this._opts.onOpenChange?.(true);

    requestAnimationFrame(() => {
      this._popoverEl?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({
        preventScroll: true,
      });
    });
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;
    if (this._opts.onClose?.() === false) return;
    if (!this._dispatch('tp-drop:close')) return;

    this._isOpen = false;
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    if (this._trigger) {
      this._trigger.setAttribute('aria-expanded', 'false');
      // Return focus to the trigger (engine's returnFocus is false because we
      // manage focus return manually so the trigger doesn't scroll into view).
      this._trigger.focus({ preventScroll: true });
    }

    this._opts.onOpenChange?.(false);
  }

  toggle(force?: boolean): void {
    const next = force === undefined ? !this._isOpen : force;
    if (next) this.open();
    else this.close();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  value(): TimeObject | null;
  value(v: TimeObject | Date | string | null): void;
  value(v?: TimeObject | Date | string | null): TimeObject | null | void {
    if (v === undefined) return this._committedValue;
    const coerced = clampToRange(
      coerceTime(v, this._effFormat),
      this._asTime(this._opts.minTime),
      this._asTime(this._opts.maxTime),
    );
    this._committedValue = coerced;
    if (this._isOpen) this._syncTimeDropdownValue(coerced);
  }

  formattedValue(): string {
    return this._committedValue ? formatTime(this._committedValue, this._effFormat) : '';
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    if (this._opts.isDisabled === state) return;
    this._opts.isDisabled = state;
    this._timeDropdown?.disabled(state);
    if (state && this._isOpen) this.close();
  }

  /**
   * Focus the active time option (only meaningful when open). No-op when
   * closed -- the consumer's trigger is the visible focus target while the
   * dropdown is hidden.
   */
  focus(): void {
    if (!this._isOpen) return;
    this._popoverEl?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({
      preventScroll: true,
    });
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._unbindTrigger();
    if (this._isOpen) {
      this._isOpen = false;
      void this._surface?.close();
    }
    this._surface?.destroy();
    this._surface = null;
    this._timeDropdown?.destroy();
    this._timeDropdown = null;
    this._popoverEl?.remove();
    this._popoverEl = null;
    this._bodyEl = null;
    this._timeDropdownHostEl = null;
    if (this._trigger) {
      this._trigger.removeAttribute('aria-haspopup');
      this._trigger.removeAttribute('aria-controls');
      this._trigger.removeAttribute('aria-expanded');
    }
    this._trigger = null;
  }
}
