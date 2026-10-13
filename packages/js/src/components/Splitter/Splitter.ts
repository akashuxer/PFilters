// ArvoSplitter -- thin separator that visually divides two adjacent regions
// along one axis. With `isResizable=true` (default) it adds pointer + keyboard
// + double-click reset interaction, an optional target it auto-sizes, and ARIA
// value attributes. With `isResizable=false` it renders a static visual
// separator (no interaction, not focusable, no value attrs).
//
// See descriptors/splitter.json for the public contract.

export type ArvoSplitterOrientation = 'vertical' | 'horizontal';
export type ArvoSplitterResizeReason =
  | 'pointer'
  | 'keyboard'
  | 'reset'
  | 'programmatic';

export interface ArvoSplitterOptions {
  orientation?: ArvoSplitterOrientation;
  /**
   * Enables drag/keyboard interaction. When `false`, the splitter is a
   * static visual separator with no indicator, no events, and not focusable.
   * Defaults to `true`.
   */
  isResizable?: boolean;
  /**
   * Primary container the splitter resizes. Accepts an HTMLElement or a CSS
   * selector string. When set, the splitter automatically applies the
   * current size to the target via inline style (`width` for vertical,
   * `height` for horizontal), auto-detects the `inverse` direction by
   * inspecting the target's DOM position relative to the splitter, and
   * (when `ariaControls` is omitted) auto-derives `aria-controls` from
   * `target.id`. When omitted, the splitter is purely callback-driven --
   * the consumer applies the size to their own region in response to the
   * `onResize` callback / `spl:resize` event.
   */
  target?: HTMLElement | string | null;
  /**
   * Pointer-direction inversion. When `true`, dragging the rail in the
   * positive axis direction DECREASES the reported value. Defaults to auto-
   * detection when `target` is set (target after splitter => `true`), and
   * to `false` when `target` is omitted. Keyboard and `value()` setters are
   * direction-agnostic.
   */
  inverse?: boolean;
  /** Initial size in pixels. */
  value?: number;
  /**
   * Uncontrolled initial size in pixels AND the snap-to value used by
   * double-click reset / `reset()`. When omitted but `target` is set, the
   * splitter measures the target's natural size and uses that as the reset
   * target. When omitted with no target, falls back to `minSize`.
   */
  defaultValue?: number;
  /** Lower clamping bound in pixels. Defaults to 0. */
  minSize?: number;
  /** Upper clamping bound in pixels. Defaults to unbounded. */
  maxSize?: number;
  /** Arrow-key step in pixels. */
  step?: number;
  /** PageUp / PageDown step in pixels. */
  pageStep?: number;
  isDisabled?: boolean;
  /** Accessible name. Required when isResizable=true. */
  ariaLabel?: string;
  /** Optional id of the resized region. */
  ariaControls?: string;
  onResizeStart?: (
    detail: { value: number; reason: ArvoSplitterResizeReason },
  ) => void;
  onResize?: (
    detail: { value: number; reason: ArvoSplitterResizeReason },
  ) => void;
  onResizeEnd?: (
    detail: { value: number; reason: ArvoSplitterResizeReason },
  ) => void;
  onChange?: (detail: { value: number }) => void;
  onReset?: (detail: { value: number }) => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoSplitterOptions,
    | 'onResizeStart'
    | 'onResize'
    | 'onResizeEnd'
    | 'onChange'
    | 'onReset'
    | 'value'
    | 'ariaLabel'
    | 'ariaControls'
    | 'target'
    | 'inverse'
    | 'defaultValue'
    | 'maxSize'
  >
> & {
  value: number | null;
  defaultValue: number | null;
  inverse: boolean | null;
  ariaLabel: string | null;
  ariaControls: string | null;
  target: HTMLElement | string | null;
  maxSize: number | null;
  onResizeStart:
    | ((detail: { value: number; reason: ArvoSplitterResizeReason }) => void)
    | null;
  onResize:
    | ((detail: { value: number; reason: ArvoSplitterResizeReason }) => void)
    | null;
  onResizeEnd:
    | ((detail: { value: number; reason: ArvoSplitterResizeReason }) => void)
    | null;
  onChange: ((detail: { value: number }) => void) | null;
  onReset: ((detail: { value: number }) => void) | null;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function resolveTarget(
  target: HTMLElement | string | null,
): HTMLElement | null {
  if (!target) return null;
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }
  return target;
}

function detectInverse(splitter: HTMLElement, target: HTMLElement): boolean {
  // Node.DOCUMENT_POSITION_FOLLOWING = 4. If target follows splitter in DOM
  // order, drag-forward should shrink target => inverse=true.
  const pos = splitter.compareDocumentPosition(target);
  return Boolean(pos & 4);
}

function measureTarget(
  target: HTMLElement,
  orientation: ArvoSplitterOrientation,
): number {
  const rect = target.getBoundingClientRect();
  return orientation === 'vertical' ? rect.width : rect.height;
}

function applyTargetSize(
  target: HTMLElement,
  size: number,
  orientation: ArvoSplitterOrientation,
): void {
  const prop = orientation === 'vertical' ? 'width' : 'height';
  target.style[prop] = `${size}px`;
}

export class ArvoSplitter {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _handleEl: HTMLSpanElement | null = null;
  private _currentValue: number;
  private _resetTarget: number;
  private _resolvedTargetEl: HTMLElement | null = null;
  private _effectiveInverse: boolean;
  private _isDragging = false;

  private _boundHandlePointerDown: (event: Event) => void;
  private _boundHandleKeyDown: (event: Event) => void;
  private _boundHandleDoubleClick: (event: Event) => void;
  private _boundHandlePointerMove: (event: PointerEvent) => void;
  private _boundHandlePointerUp: (event: PointerEvent) => void;
  private _dragStartCoord = 0;
  private _dragStartValue = 0;

  static readonly ORIENTATIONS = ['vertical', 'horizontal'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    orientation: 'vertical',
    isResizable: true,
    target: null,
    inverse: null,
    value: null,
    defaultValue: null,
    minSize: 0,
    maxSize: null,
    step: 16,
    pageStep: 64,
    isDisabled: false,
    ariaLabel: null,
    ariaControls: null,
    onResizeStart: null,
    onResize: null,
    onResizeEnd: null,
    onChange: null,
    onReset: null,
  };

  static initialize(
    element: HTMLElement,
    options: ArvoSplitterOptions = {},
  ): ArvoSplitter {
    return new ArvoSplitter(element, options);
  }

  constructor(element: HTMLElement, options: ArvoSplitterOptions = {}) {
    this._element = element;
    this._options = {
      ...ArvoSplitter.DEFAULTS,
      ...options,
      value: typeof options.value === 'number' ? options.value : null,
      defaultValue:
        typeof options.defaultValue === 'number' ? options.defaultValue : null,
      inverse:
        typeof options.inverse === 'boolean' ? options.inverse : null,
      target: options.target ?? null,
      maxSize: typeof options.maxSize === 'number' ? options.maxSize : null,
      ariaLabel: options.ariaLabel ?? null,
      ariaControls: options.ariaControls ?? null,
      onResizeStart: options.onResizeStart ?? null,
      onResize: options.onResize ?? null,
      onResizeEnd: options.onResizeEnd ?? null,
      onChange: options.onChange ?? null,
      onReset: options.onReset ?? null,
    };

    const effectiveMax =
      this._options.maxSize !== null
        ? this._options.maxSize
        : Number.MAX_SAFE_INTEGER;
    if (effectiveMax <= this._options.minSize && this._options.maxSize !== null) {
      throw new Error('[ArvoSplitter] maxSize must be greater than minSize.');
    }
    if (this._options.isResizable && !this._options.ariaLabel) {
      throw new Error(
        '[ArvoSplitter] ariaLabel is required when isResizable=true.',
      );
    }

    // Resolve the target element + auto-config flags.
    this._resolvedTargetEl = resolveTarget(this._options.target);
    if (this._options.inverse !== null) {
      this._effectiveInverse = this._options.inverse;
    } else if (this._resolvedTargetEl) {
      this._effectiveInverse = detectInverse(element, this._resolvedTargetEl);
    } else {
      this._effectiveInverse = false;
    }

    // Initial size + reset target.
    const initial =
      typeof this._options.value === 'number'
        ? this._options.value
        : typeof this._options.defaultValue === 'number'
          ? this._options.defaultValue
          : this._resolvedTargetEl
            ? measureTarget(this._resolvedTargetEl, this._options.orientation)
            : this._options.minSize;

    this._currentValue = clamp(initial, this._options.minSize, effectiveMax);

    if (typeof this._options.defaultValue === 'number') {
      this._resetTarget = clamp(
        this._options.defaultValue,
        this._options.minSize,
        effectiveMax,
      );
    } else if (this._resolvedTargetEl) {
      const measured = measureTarget(
        this._resolvedTargetEl,
        this._options.orientation,
      );
      this._resetTarget = clamp(
        measured > 0 ? measured : this._options.minSize,
        this._options.minSize,
        effectiveMax,
      );
    } else {
      this._resetTarget = this._options.minSize;
    }

    this._boundHandlePointerDown = this._handlePointerDown.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandleDoubleClick = this._handleDoubleClick.bind(this);
    this._boundHandlePointerMove = this._handlePointerMove.bind(this);
    this._boundHandlePointerUp = this._handlePointerUp.bind(this);

    this._render();
    this._bindEvents();
    this._applyTargetSize();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;
    el.textContent = '';

    const { orientation, isResizable, isDisabled, ariaLabel } = this._options;

    el.classList.add('arvo-spl', `arvo-spl--${orientation}`);
    if (isResizable) el.classList.add('arvo-spl--resizable');
    if (this._effectiveInverse) el.classList.add('arvo-spl--inverse');
    if (isResizable && isDisabled) {
      el.classList.add('arvo-spl--disabled', 'is-disabled');
    }

    el.setAttribute('role', 'separator');
    el.setAttribute('aria-orientation', orientation);

    if (isResizable) {
      el.setAttribute('aria-valuemin', String(this._options.minSize));
      if (this._options.maxSize !== null) {
        el.setAttribute('aria-valuemax', String(this._options.maxSize));
      }
      el.setAttribute('aria-valuenow', String(this._currentValue));
      if (ariaLabel) el.setAttribute('aria-label', ariaLabel);

      const ariaControls =
        this._options.ariaControls ?? this._resolvedTargetEl?.id ?? null;
      if (ariaControls) el.setAttribute('aria-controls', ariaControls);

      if (isDisabled) el.setAttribute('aria-disabled', 'true');
      el.tabIndex = isDisabled ? -1 : 0;

      this._handleEl = document.createElement('span');
      this._handleEl.className = 'arvo-spl__handle';
      this._handleEl.setAttribute('aria-hidden', 'true');
      el.appendChild(this._handleEl);
    }
  }

  private _bindEvents(): void {
    const el = this._element;
    if (!el) return;
    if (!this._options.isResizable) return;
    el.addEventListener('pointerdown', this._boundHandlePointerDown);
    el.addEventListener('keydown', this._boundHandleKeyDown);
    el.addEventListener('dblclick', this._boundHandleDoubleClick);
  }

  private _applyTargetSize(): void {
    if (!this._resolvedTargetEl) return;
    applyTargetSize(
      this._resolvedTargetEl,
      this._currentValue,
      this._options.orientation,
    );
  }

  private _handlePointerDown(event: Event): void {
    if (this._options.isDisabled) return;
    const e = event as PointerEvent;
    if (e.button !== 0) return;

    e.preventDefault();
    this._element?.focus();

    this._isDragging = true;
    this._element?.classList.add('active');

    const isVertical = this._options.orientation === 'vertical';
    this._dragStartCoord = isVertical ? e.clientX : e.clientY;
    this._dragStartValue = this._currentValue;

    this._fireStart('pointer');

    window.addEventListener('pointermove', this._boundHandlePointerMove);
    window.addEventListener('pointerup', this._boundHandlePointerUp);
    window.addEventListener('pointercancel', this._boundHandlePointerUp);
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (!this._isDragging) return;
    const isVertical = this._options.orientation === 'vertical';
    const coord = isVertical ? event.clientX : event.clientY;
    const rawDelta = coord - this._dragStartCoord;
    const delta = this._effectiveInverse ? -rawDelta : rawDelta;
    this._setValue(this._dragStartValue + delta, 'pointer');
  }

  private _handlePointerUp(_event: PointerEvent): void {
    if (!this._isDragging) return;
    this._isDragging = false;
    this._element?.classList.remove('active');
    window.removeEventListener('pointermove', this._boundHandlePointerMove);
    window.removeEventListener('pointerup', this._boundHandlePointerUp);
    window.removeEventListener('pointercancel', this._boundHandlePointerUp);
    this._fireEnd('pointer');
  }

  private _handleKeyDown(event: Event): void {
    if (this._options.isDisabled) return;
    const e = event as KeyboardEvent;
    const { orientation, step, pageStep, minSize, maxSize } = this._options;
    const decreaseKey = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp';
    const increaseKey = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';

    let target: number | null = null;
    switch (e.key) {
      case decreaseKey:
        target = this._currentValue - step;
        break;
      case increaseKey:
        target = this._currentValue + step;
        break;
      case 'PageUp':
        target = this._currentValue - pageStep;
        break;
      case 'PageDown':
        target = this._currentValue + pageStep;
        break;
      case 'Home':
        target = minSize;
        break;
      case 'End':
        // No-op when maxSize is unbounded.
        if (maxSize === null) return;
        target = maxSize;
        break;
      default:
        return;
    }

    e.preventDefault();
    this._fireStart('keyboard');
    this._setValue(target, 'keyboard');
    this._fireEnd('keyboard');
  }

  private _handleDoubleClick(event: Event): void {
    if (this._options.isDisabled) return;
    if (event.defaultPrevented) return;
    event.preventDefault();
    this._doReset();
  }

  private _doReset(): number {
    const effectiveMax =
      this._options.maxSize !== null
        ? this._options.maxSize
        : Number.MAX_SAFE_INTEGER;
    const next = clamp(
      this._resetTarget,
      this._options.minSize,
      effectiveMax,
    );
    this._fireStart('reset');
    if (next !== this._currentValue) {
      this._setValue(next, 'reset');
    }
    this._fireEnd('reset');
    const detail = { value: next };
    this._options.onReset?.(detail);
    this._dispatchEvent('spl:reset', detail);
    return next;
  }

  private _setValue(raw: number, reason: ArvoSplitterResizeReason): void {
    const effectiveMax =
      this._options.maxSize !== null
        ? this._options.maxSize
        : Number.MAX_SAFE_INTEGER;
    const clamped = clamp(raw, this._options.minSize, effectiveMax);
    if (clamped === this._currentValue) return;
    this._currentValue = clamped;
    if (this._options.isResizable) {
      this._element?.setAttribute('aria-valuenow', String(clamped));
    }
    this._applyTargetSize();
    this._fireResize(reason);
  }

  private _fireStart(reason: ArvoSplitterResizeReason): void {
    const detail = { value: this._currentValue, reason };
    this._options.onResizeStart?.(detail);
    this._dispatchEvent('spl:resize-start', detail);
  }

  private _fireResize(reason: ArvoSplitterResizeReason): void {
    const detail = { value: this._currentValue, reason };
    this._options.onResize?.(detail);
    this._options.onChange?.({ value: this._currentValue });
    this._dispatchEvent('spl:resize', detail);
    this._dispatchEvent('spl:change', { value: this._currentValue });
  }

  private _fireEnd(reason: ArvoSplitterResizeReason): void {
    const detail = { value: this._currentValue, reason };
    this._options.onResizeEnd?.(detail);
    this._dispatchEvent('spl:resize-end', detail);
  }

  private _dispatchEvent(name: string, detail: unknown): void {
    if (!this._element) return;
    this._element.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true }),
    );
  }

  // -- Public API ------------------------------------------------------------

  value(next?: number): number {
    if (typeof next === 'number') {
      this._fireStart('programmatic');
      this._setValue(next, 'programmatic');
      this._fireEnd('programmatic');
    }
    return this._currentValue;
  }

  disabled(state?: boolean): boolean {
    if (typeof state === 'boolean' && state !== this._options.isDisabled) {
      this._options.isDisabled = state;
      const el = this._element;
      if (el && this._options.isResizable) {
        if (state) {
          el.classList.add('arvo-spl--disabled', 'is-disabled');
          el.setAttribute('aria-disabled', 'true');
          el.tabIndex = -1;
        } else {
          el.classList.remove('arvo-spl--disabled', 'is-disabled');
          el.removeAttribute('aria-disabled');
          el.tabIndex = 0;
        }
      }
    }
    return this._options.isDisabled;
  }

  focus(): void {
    if (!this._options.isResizable) return;
    if (this._options.isDisabled) return;
    this._element?.focus();
  }

  reset(): number {
    return this._doReset();
  }

  setTarget(target: HTMLElement | string | null): void {
    this._options.target = target;
    this._resolvedTargetEl = resolveTarget(target);

    // Re-detect inverse when target changes (unless consumer pinned it).
    if (this._options.inverse === null && this._element) {
      const next = this._resolvedTargetEl
        ? detectInverse(this._element, this._resolvedTargetEl)
        : false;
      if (next !== this._effectiveInverse) {
        this._effectiveInverse = next;
        if (next) this._element.classList.add('arvo-spl--inverse');
        else this._element.classList.remove('arvo-spl--inverse');
      }
    }

    // Update auto-derived aria-controls.
    if (this._options.isResizable && !this._options.ariaControls) {
      const ariaControls = this._resolvedTargetEl?.id ?? null;
      if (ariaControls) {
        this._element?.setAttribute('aria-controls', ariaControls);
      } else {
        this._element?.removeAttribute('aria-controls');
      }
    }

    // Apply current size to new target.
    this._applyTargetSize();
  }

  setMinSize(min: number): void {
    this._options.minSize = min;
    if (this._options.isResizable) {
      this._element?.setAttribute('aria-valuemin', String(min));
    }
    // Re-clamp.
    const effectiveMax =
      this._options.maxSize !== null
        ? this._options.maxSize
        : Number.MAX_SAFE_INTEGER;
    const next = clamp(this._currentValue, min, effectiveMax);
    if (next !== this._currentValue) {
      this._setValue(next, 'programmatic');
    }
  }

  setMaxSize(max: number | null): void {
    this._options.maxSize = max;
    if (this._options.isResizable) {
      if (max === null) {
        this._element?.removeAttribute('aria-valuemax');
      } else {
        this._element?.setAttribute('aria-valuemax', String(max));
      }
    }
    // Re-clamp.
    const effectiveMax = max !== null ? max : Number.MAX_SAFE_INTEGER;
    const next = clamp(this._currentValue, this._options.minSize, effectiveMax);
    if (next !== this._currentValue) {
      this._setValue(next, 'programmatic');
    }
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;
    el.removeEventListener('pointerdown', this._boundHandlePointerDown);
    el.removeEventListener('keydown', this._boundHandleKeyDown);
    el.removeEventListener('dblclick', this._boundHandleDoubleClick);
    window.removeEventListener('pointermove', this._boundHandlePointerMove);
    window.removeEventListener('pointerup', this._boundHandlePointerUp);
    window.removeEventListener('pointercancel', this._boundHandlePointerUp);
    el.textContent = '';
    el.classList.remove(
      'arvo-spl',
      'arvo-spl--vertical',
      'arvo-spl--horizontal',
      'arvo-spl--resizable',
      'arvo-spl--inverse',
      'arvo-spl--disabled',
      'is-disabled',
      'active',
    );
    el.removeAttribute('role');
    el.removeAttribute('aria-orientation');
    el.removeAttribute('aria-valuemin');
    el.removeAttribute('aria-valuemax');
    el.removeAttribute('aria-valuenow');
    el.removeAttribute('aria-label');
    el.removeAttribute('aria-controls');
    el.removeAttribute('aria-disabled');
    el.removeAttribute('tabindex');
    this._element = null;
    this._handleEl = null;
    this._resolvedTargetEl = null;
  }
}
