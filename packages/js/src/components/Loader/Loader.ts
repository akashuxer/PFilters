// ArvoLoader -- vanilla JS twin of the React component.
//
// Standalone presentational primitive that signals "work in progress".
// Renders one of three animated shape variants (dot / circular / square)
// inside the host element, applies BEM modifier classes for variant /
// size / orientation / tone, and sets role="status" + aria-live="polite"
// + aria-label so assistive tech announces the loader as a polite live
// region.

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoLoaderVariant = 'dot' | 'circular' | 'square';
export type ArvoLoaderSize = 'sm' | 'md' | 'lg';
export type ArvoLoaderOrientation = 'horizontal' | 'vertical';
export type ArvoLoaderTone = 'theme' | 'inverse' | 'subtle';

export interface ArvoLoaderOptions {
  variant?: ArvoLoaderVariant;
  size?: ArvoLoaderSize;
  orientation?: ArvoLoaderOrientation;
  tone?: ArvoLoaderTone;
  /**
   * Visible loading text + accessible name. Pass `null` (or an empty
   * string) to hide the visible label; the loader still announces via
   * `aria-label` so AT users continue to receive the status.
   */
  message?: string | null;
}

interface ResolvedOptions {
  variant: ArvoLoaderVariant;
  size: ArvoLoaderSize;
  orientation: ArvoLoaderOrientation;
  tone: ArvoLoaderTone;
  message: string | null;
}

// ---------------------------------------------------------------------------
// Constants -- mirror the React twin
// ---------------------------------------------------------------------------

const VALID_VARIANTS: readonly ArvoLoaderVariant[] = ['dot', 'circular', 'square'];
const VALID_SIZES: readonly ArvoLoaderSize[] = ['sm', 'md', 'lg'];
const VALID_ORIENTATIONS: readonly ArvoLoaderOrientation[] = ['horizontal', 'vertical'];
const VALID_TONES: readonly ArvoLoaderTone[] = ['theme', 'inverse', 'subtle'];

export const ARVO_LOADER_DEFAULT_MESSAGE = 'Loading';

export const ARVO_LOADER_VARIANTS: readonly ArvoLoaderVariant[] = VALID_VARIANTS;
export const ARVO_LOADER_SIZES: readonly ArvoLoaderSize[] = VALID_SIZES;
export const ARVO_LOADER_ORIENTATIONS: readonly ArvoLoaderOrientation[] = VALID_ORIENTATIONS;
export const ARVO_LOADER_TONES: readonly ArvoLoaderTone[] = VALID_TONES;

const DEFAULTS: ResolvedOptions = {
  variant: 'dot',
  size: 'md',
  orientation: 'horizontal',
  tone: 'theme',
  message: ARVO_LOADER_DEFAULT_MESSAGE,
};

function normalizeMessage(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.length > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoLoader {
  /** The host element passed to initialize. Decorated in place. */
  readonly el: HTMLElement;

  private _opts: ResolvedOptions;
  private _shapeEl: HTMLElement | null = null;
  private _msgEl: HTMLElement | null = null;
  private _destroyed = false;

  static readonly VARIANTS = VALID_VARIANTS;
  static readonly SIZES = VALID_SIZES;
  static readonly ORIENTATIONS = VALID_ORIENTATIONS;
  static readonly TONES = VALID_TONES;
  static readonly DEFAULT_MESSAGE = ARVO_LOADER_DEFAULT_MESSAGE;

  /** Factory matching the rest of the @arvo/js components. */
  static initialize(
    element: HTMLElement | null,
    options?: ArvoLoaderOptions,
  ): ArvoLoader {
    const host = element ?? document.createElement('div');
    return new ArvoLoader(host, options);
  }

  constructor(element: HTMLElement, options?: ArvoLoaderOptions) {
    this.el = element;

    const safeVariant =
      options?.variant && VALID_VARIANTS.includes(options.variant)
        ? options.variant
        : DEFAULTS.variant;
    const safeSize =
      options?.size && VALID_SIZES.includes(options.size) ? options.size : DEFAULTS.size;
    const safeOrientation =
      options?.orientation && VALID_ORIENTATIONS.includes(options.orientation)
        ? options.orientation
        : DEFAULTS.orientation;
    const safeTone =
      options?.tone && VALID_TONES.includes(options.tone) ? options.tone : DEFAULTS.tone;

    this._opts = {
      variant: safeVariant,
      size: safeSize,
      orientation: safeOrientation,
      tone: safeTone,
      message:
        options && 'message' in options
          ? normalizeMessage(options.message)
          : ARVO_LOADER_DEFAULT_MESSAGE,
    };

    this._render();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private _render(): void {
    this.el.textContent = '';

    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');

    this._shapeEl = document.createElement('span');
    this._shapeEl.className = 'arvo-loader__shape';
    this._shapeEl.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this._shapeEl);

    this._renderShape();

    this._msgEl = null;
    this._applyMessage();
    this._applyClasses();
  }

  /** Rebuild the inner shape DOM for the current variant. */
  private _renderShape(): void {
    if (!this._shapeEl) return;
    this._shapeEl.textContent = '';

    const variant = this._opts.variant;
    if (variant === 'dot') {
      for (let i = 0; i < 3; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'arvo-loader__dot';
        this._shapeEl.appendChild(dot);
      }
    } else if (variant === 'circular') {
      const circle = document.createElement('span');
      circle.className = 'arvo-loader__circle';
      this._shapeEl.appendChild(circle);
    } else {
      const square = document.createElement('span');
      square.className = 'arvo-loader__square';
      this._shapeEl.appendChild(square);
    }
  }

  private _applyClasses(): void {
    const { variant, size, orientation, tone } = this._opts;
    this.el.className = [
      'arvo-loader',
      `arvo-loader--${variant}`,
      `arvo-loader--${size}`,
      `arvo-loader--${orientation}`,
      `arvo-loader--${tone}`,
    ].join(' ');
  }

  private _applyMessage(): void {
    const visible = this._opts.message;
    const aria = visible ?? ARVO_LOADER_DEFAULT_MESSAGE;
    this.el.setAttribute('aria-label', aria);

    if (visible === null) {
      if (this._msgEl) {
        this._msgEl.remove();
        this._msgEl = null;
      }
      return;
    }

    if (!this._msgEl) {
      this._msgEl = document.createElement('span');
      this._msgEl.className = 'arvo-loader__msg';
      this.el.appendChild(this._msgEl);
    }
    this._msgEl.textContent = visible;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  setVariant(variant: ArvoLoaderVariant): void {
    if (!VALID_VARIANTS.includes(variant)) return;
    if (this._opts.variant === variant) return;
    this._opts.variant = variant;
    this._renderShape();
    this._applyClasses();
  }

  setSize(size: ArvoLoaderSize): void {
    if (!VALID_SIZES.includes(size)) return;
    this._opts.size = size;
    this._applyClasses();
  }

  setOrientation(orientation: ArvoLoaderOrientation): void {
    if (!VALID_ORIENTATIONS.includes(orientation)) return;
    this._opts.orientation = orientation;
    this._applyClasses();
  }

  setTone(tone: ArvoLoaderTone): void {
    if (!VALID_TONES.includes(tone)) return;
    this._opts.tone = tone;
    this._applyClasses();
  }

  setMessage(message: string | null): void {
    this._opts.message = normalizeMessage(message);
    this._applyMessage();
  }

  /** Read-only accessors mirroring the React props (for tests / introspection). */
  variant(): ArvoLoaderVariant { return this._opts.variant; }
  size(): ArvoLoaderSize { return this._opts.size; }
  orientation(): ArvoLoaderOrientation { return this._opts.orientation; }
  tone(): ArvoLoaderTone { return this._opts.tone; }
  message(): string | null { return this._opts.message; }

  /** Tear down inner DOM + decorations. The host element is preserved. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.el.textContent = '';
    this._shapeEl = null;
    this._msgEl = null;
    this.el.removeAttribute('class');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-live');
    this.el.removeAttribute('aria-label');
  }
}
