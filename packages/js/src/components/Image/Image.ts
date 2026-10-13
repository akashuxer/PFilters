// ArvoImage -- platform image primitive.
//
// Owns responsive source rendering, layout reservation, fit/position,
// loading/error/empty states, optional caption/overlay, decorative semantics,
// and the preview affordance hook used later by ArvoImageView.

import { ArvoEmptyState } from '../EmptyState/EmptyState';

export type ArvoImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type ArvoImageLoading = 'lazy' | 'eager';
export type ArvoImageDecoding = 'async' | 'sync' | 'auto';
export type ArvoImageFetchPriority = 'high' | 'low' | 'auto';
export type ArvoImageState = 'loading' | 'ready' | 'error' | 'empty';
export type ArvoImageControlledState = 'default' | ArvoImageState;
export type ArvoImageAspectRatio =
  | 'auto'
  | '1/1'
  | '1/2'
  | '2/3'
  | '3/4'
  | '9/16'
  | '2/1'
  | '3/2'
  | '4/1'
  | '4/3'
  | '16/9'
  | `${number}/${number}`;

export interface ArvoImageSource {
  media?: string;
  srcSet: string;
  sizes?: string;
  type?: string;
}

export interface ArvoImageOverlay {
  title: string;
  subtitle?: string;
}

export interface ArvoImageOptions {
  src?: string;
  alt?: string;
  sources?: ArvoImageSource[];
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  aspectRatio?: ArvoImageAspectRatio;
  fit?: ArvoImageFit;
  position?: string;
  loading?: ArvoImageLoading;
  decoding?: ArvoImageDecoding;
  fetchPriority?: ArvoImageFetchPriority;
  crossOrigin?: 'anonymous' | 'use-credentials';
  referrerPolicy?: ReferrerPolicy;
  state?: ArvoImageControlledState;
  fallback?: string | HTMLElement | ((state: ArvoImageState) => HTMLElement | string);
  caption?: string | HTMLElement;
  overlay?: ArvoImageOverlay | null;
  overlayTitle?: string;
  overlaySubtitle?: string;
  hasPreview?: boolean;
  isDecorative?: boolean;
  ariaDescribedBy?: string;
  className?: string;
  id?: string;
  onLoad?: (event: Event) => void;
  onError?: (event: Event) => void;
  onPreviewOpen?: () => void;
}

interface ResolvedOptions {
  src: string;
  alt: string;
  sources: ArvoImageSource[];
  srcSet: string | null;
  sizes: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: ArvoImageAspectRatio;
  fit: ArvoImageFit;
  position: string;
  loading: ArvoImageLoading;
  decoding: ArvoImageDecoding;
  fetchPriority: ArvoImageFetchPriority;
  crossOrigin: 'anonymous' | 'use-credentials' | null;
  referrerPolicy: ReferrerPolicy | null;
  state: ArvoImageState | null;
  fallback: ArvoImageOptions['fallback'] | null;
  caption: string | HTMLElement | null;
  overlay: ArvoImageOverlay | null;
  overlayTitle: string | null;
  overlaySubtitle: string | null;
  hasPreview: boolean;
  isDecorative: boolean;
  ariaDescribedBy: string | null;
  className: string | null;
  id: string | null;
  onLoad: ((event: Event) => void) | null;
  onError: ((event: Event) => void) | null;
  onPreviewOpen: (() => void) | null;
}

const VALID_FITS: readonly ArvoImageFit[] = ['cover', 'contain', 'fill', 'none', 'scale-down'];
const VALID_LOADING: readonly ArvoImageLoading[] = ['lazy', 'eager'];
const VALID_DECODING: readonly ArvoImageDecoding[] = ['async', 'sync', 'auto'];
const VALID_FETCH_PRIORITY: readonly ArvoImageFetchPriority[] = ['high', 'low', 'auto'];
const VALID_STATES: readonly ArvoImageState[] = ['loading', 'ready', 'error', 'empty'];

const DEFAULTS: ResolvedOptions = {
  src: '',
  alt: '',
  sources: [],
  srcSet: null,
  sizes: null,
  width: null,
  height: null,
  aspectRatio: 'auto',
  fit: 'cover',
  position: 'center',
  loading: 'lazy',
  decoding: 'async',
  fetchPriority: 'auto',
  crossOrigin: null,
  referrerPolicy: null,
  state: null,
  fallback: null,
  caption: null,
  overlay: null,
  overlayTitle: null,
  overlaySubtitle: null,
  hasPreview: false,
  isDecorative: false,
  ariaDescribedBy: null,
  className: null,
  id: null,
  onLoad: null,
  onError: null,
  onPreviewOpen: null,
};

function asEnum<T extends string>(value: unknown, valid: readonly T[], fallback: T): T {
  return valid.includes(value as T) ? value as T : fallback;
}

function asOptionalState(value: unknown): ArvoImageState | null {
  if (value === 'default') return null;
  return VALID_STATES.includes(value as ArvoImageState) ? value as ArvoImageState : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeSources(value: unknown): ArvoImageSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((source): source is ArvoImageSource => Boolean(source) && typeof source.srcSet === 'string' && source.srcSet.trim().length > 0)
    .map((source) => ({
      srcSet: source.srcSet.trim(),
      media: typeof source.media === 'string' && source.media.trim() ? source.media.trim() : undefined,
      sizes: typeof source.sizes === 'string' && source.sizes.trim() ? source.sizes.trim() : undefined,
      type: typeof source.type === 'string' && source.type.trim() ? source.type.trim() : undefined,
    }));
}

function normalizeAspectRatio(value: unknown): ArvoImageAspectRatio {
  if (typeof value !== 'string') return DEFAULTS.aspectRatio;
  if (value === 'auto') return value;
  return /^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(value) ? value as ArvoImageAspectRatio : DEFAULTS.aspectRatio;
}

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOverlay(options: ArvoImageOptions): ArvoImageOverlay | null {
  const title = normalizeOptionalText(options.overlayTitle);
  const subtitle = normalizeOptionalText(options.overlaySubtitle);
  if (title) return subtitle ? { title, subtitle } : { title };
  return options.overlay && typeof options.overlay.title === 'string' ? options.overlay : null;
}

function resolveOptions(options: ArvoImageOptions): ResolvedOptions {
  return {
    src: typeof options.src === 'string' ? options.src.trim() : DEFAULTS.src,
    alt: typeof options.alt === 'string' ? options.alt : DEFAULTS.alt,
    sources: normalizeSources(options.sources),
    srcSet: typeof options.srcSet === 'string' && options.srcSet.trim() ? options.srcSet.trim() : null,
    sizes: typeof options.sizes === 'string' && options.sizes.trim() ? options.sizes.trim() : null,
    width: asNumber(options.width),
    height: asNumber(options.height),
    aspectRatio: normalizeAspectRatio(options.aspectRatio),
    fit: asEnum(options.fit, VALID_FITS, DEFAULTS.fit),
    position: typeof options.position === 'string' && options.position.trim() ? options.position.trim() : DEFAULTS.position,
    loading: asEnum(options.loading, VALID_LOADING, DEFAULTS.loading),
    decoding: asEnum(options.decoding, VALID_DECODING, DEFAULTS.decoding),
    fetchPriority: asEnum(options.fetchPriority, VALID_FETCH_PRIORITY, DEFAULTS.fetchPriority),
    crossOrigin: options.crossOrigin === 'anonymous' || options.crossOrigin === 'use-credentials' ? options.crossOrigin : null,
    referrerPolicy: typeof options.referrerPolicy === 'string' ? options.referrerPolicy : null,
    state: asOptionalState(options.state),
    fallback: options.fallback ?? null,
    caption: options.caption ?? null,
    overlay: normalizeOverlay(options),
    overlayTitle: normalizeOptionalText(options.overlayTitle),
    overlaySubtitle: normalizeOptionalText(options.overlaySubtitle),
    hasPreview: Boolean(options.hasPreview),
    isDecorative: Boolean(options.isDecorative),
    ariaDescribedBy: typeof options.ariaDescribedBy === 'string' && options.ariaDescribedBy.trim() ? options.ariaDescribedBy.trim() : null,
    className: typeof options.className === 'string' && options.className.trim() ? options.className.trim() : null,
    id: typeof options.id === 'string' && options.id.trim() ? options.id.trim() : null,
    onLoad: typeof options.onLoad === 'function' ? options.onLoad : null,
    onError: typeof options.onError === 'function' ? options.onError : null,
    onPreviewOpen: typeof options.onPreviewOpen === 'function' ? options.onPreviewOpen : null,
  };
}

function ratioToCss(o: ResolvedOptions): string | null {
  if (o.aspectRatio !== 'auto') return o.aspectRatio;
  if (o.width && o.height) return `${o.width} / ${o.height}`;
  return null;
}

function appendContent(target: HTMLElement, value: string | HTMLElement): void {
  if (typeof value === 'string') {
    target.textContent = value;
  } else {
    target.appendChild(value);
  }
}

export class ArvoImage {
  private _host: HTMLElement;
  private _rawOptions: ArvoImageOptions;
  private _options: ResolvedOptions;
  private _img: HTMLImageElement | null = null;
  private _resolvedState: ArvoImageState = 'empty';

  constructor(host: HTMLElement, options: ArvoImageOptions = {}) {
    this._host = host;
    this._rawOptions = { ...options };
    this._options = resolveOptions(this._rawOptions);
    this._render();
  }

  static initialize(host: HTMLElement, options: ArvoImageOptions = {}): ArvoImage {
    return new ArvoImage(host, options);
  }

  update(options: Partial<ArvoImageOptions> = {}): void {
    this._rawOptions = { ...this._rawOptions, ...options };
    this._options = resolveOptions(this._rawOptions);
    this._render();
  }

  destroy(): void {
    this._host.replaceChildren();
    this._host.removeAttribute('class');
    this._host.removeAttribute('style');
    this._img = null;
  }

  state(): ArvoImageState {
    return this._resolvedState;
  }

  openPreview(): void {
    if (!this._options.hasPreview || this._resolvedState !== 'ready') return;
    this._options.onPreviewOpen?.();
    this._host.dispatchEvent(new CustomEvent('img:preview-open', {
      bubbles: true,
      detail: { src: this._options.src, alt: this._options.isDecorative ? '' : this._options.alt },
    }));
  }

  private _effectiveState(): ArvoImageState {
    if (this._options.state) return this._options.state;
    if (!this._options.src) return 'empty';
    return 'loading';
  }

  private _render(): void {
    const o = this._options;
    this._host.replaceChildren();
    this._host.className = [
      'arvo-img',
      `arvo-img--fit-${o.fit}`,
      o.hasPreview ? 'arvo-img--previewable' : '',
      o.overlay ? 'arvo-img--has-overlay' : '',
      o.caption ? 'arvo-img--has-caption' : '',
      o.className ?? '',
    ].filter(Boolean).join(' ');
    if (o.id) this._host.id = o.id;
    this._host.style.setProperty('--arvo-img-fit', o.fit);
    this._host.style.setProperty('--arvo-img-position', o.position);
    const ratio = ratioToCss(o);
    if (ratio) this._host.style.setProperty('--arvo-img-ratio', ratio);
    else this._host.style.removeProperty('--arvo-img-ratio');

    const figure = document.createElement('figure');
    figure.className = 'arvo-img__figure';

    const frame = document.createElement(o.hasPreview ? 'button' : 'div');
    frame.className = 'arvo-img__frame';
    if (o.hasPreview) {
      const button = frame as HTMLButtonElement;
      button.type = 'button';
      button.disabled = this._effectiveState() !== 'ready';
      button.setAttribute('aria-label', o.alt ? `Preview ${o.alt}` : 'Preview image');
      button.addEventListener('click', () => this.openPreview());
    }

    this._resolvedState = this._effectiveState();
    frame.dataset['state'] = this._resolvedState;

    if (o.src && this._resolvedState !== 'empty') {
      frame.appendChild(this._renderPicture());
    }

    if (this._resolvedState !== 'ready') {
      frame.appendChild(this._renderStateLayer(this._resolvedState));
    }

    if (o.overlay && this._resolvedState !== 'empty' && this._resolvedState !== 'error') {
      frame.appendChild(this._renderOverlay(o.overlay));
    }

    if (o.hasPreview && this._resolvedState === 'ready') {
      const affordance = document.createElement('span');
      affordance.className = 'arvo-img__preview';
      affordance.innerHTML = '<i class="o9con o9con-zoom-in" aria-hidden="true"></i>';
      frame.appendChild(affordance);
    }

    figure.appendChild(frame);
    if (o.caption) {
      const caption = document.createElement('figcaption');
      caption.className = 'arvo-img__caption';
      appendContent(caption, o.caption);
      figure.appendChild(caption);
    }
    this._host.appendChild(figure);
  }

  private _renderPicture(): HTMLElement {
    const o = this._options;
    const picture = document.createElement('picture');
    picture.className = 'arvo-img__picture';
    for (const source of o.sources) {
      const el = document.createElement('source');
      el.srcset = source.srcSet;
      if (source.media) el.media = source.media;
      if (source.sizes) el.sizes = source.sizes;
      if (source.type) el.type = source.type;
      picture.appendChild(el);
    }
    const img = document.createElement('img');
    img.className = 'arvo-img__asset';
    img.src = o.src;
    img.alt = o.isDecorative ? '' : o.alt;
    if (o.isDecorative) img.setAttribute('role', 'presentation');
    if (o.ariaDescribedBy && !o.isDecorative) img.setAttribute('aria-describedby', o.ariaDescribedBy);
    if (o.srcSet) img.srcset = o.srcSet;
    if (o.sizes) img.sizes = o.sizes;
    if (o.width) img.width = o.width;
    if (o.height) img.height = o.height;
    img.loading = o.loading;
    img.decoding = o.decoding;
    img.fetchPriority = o.fetchPriority;
    if (o.crossOrigin) img.crossOrigin = o.crossOrigin;
    if (o.referrerPolicy) img.referrerPolicy = o.referrerPolicy;
    img.addEventListener('load', (event) => this._handleLoad(event));
    img.addEventListener('error', (event) => this._handleError(event));
    picture.appendChild(img);
    this._img = img;
    return picture;
  }

  private _renderStateLayer(state: ArvoImageState): HTMLElement {
    const layer = document.createElement('div');
    layer.className = `arvo-img__state arvo-img__state--${state}`;
    layer.setAttribute('aria-live', state === 'error' ? 'polite' : 'off');
    const custom = this._options.fallback;
    if ((state === 'error' || state === 'empty') && custom) {
      const value = typeof custom === 'function' ? custom(state) : custom;
      appendContent(layer, value);
      return layer;
    }
    if (state === 'loading') {
      layer.innerHTML = '<span class="arvo-img__skeleton" aria-hidden="true"></span><span class="arvo-sr-only">Loading image</span>';
    } else if (state === 'error') {
      const empty = ArvoEmptyState.create({
        size: 'sm',
        illustration: 'no-data',
        title: 'Image could not be loaded',
        message: 'Check the source URL or try again.',
        isAnimated: false,
      });
      layer.appendChild(empty.el);
    } else if (state === 'empty') {
      const empty = ArvoEmptyState.create({
        size: 'sm',
        illustration: 'no-data',
        title: 'No image available',
        message: 'Add an image source to preview it here.',
        isAnimated: false,
      });
      layer.appendChild(empty.el);
    }
    return layer;
  }

  private _renderOverlay(overlay: ArvoImageOverlay): HTMLElement {
    const el = document.createElement('div');
    el.className = 'arvo-img__overlay';
    const title = document.createElement('div');
    title.className = 'arvo-img__overlay-title';
    title.textContent = overlay.title;
    el.appendChild(title);
    if (overlay.subtitle) {
      const subtitle = document.createElement('div');
      subtitle.className = 'arvo-img__overlay-subtitle';
      subtitle.textContent = overlay.subtitle;
      el.appendChild(subtitle);
    }
    return el;
  }

  private _handleLoad(event: Event): void {
    if (this._options.state) {
      this._options.onLoad?.(event);
      return;
    }
    this._resolvedState = 'ready';
    this._host.querySelector('.arvo-img__state')?.remove();
    const frame = this._host.querySelector<HTMLElement>('.arvo-img__frame');
    if (frame) {
      frame.dataset['state'] = 'ready';
      if (frame instanceof HTMLButtonElement) frame.disabled = false;
    }
    this._options.onLoad?.(event);
    this._host.dispatchEvent(new CustomEvent('img:load', { bubbles: true, detail: { src: this._options.src } }));
  }

  private _handleError(event: Event): void {
    if (this._options.state) {
      this._options.onError?.(event);
      return;
    }
    this._resolvedState = 'error';
    const frame = this._host.querySelector<HTMLElement>('.arvo-img__frame');
    if (frame) {
      frame.dataset['state'] = 'error';
      if (frame instanceof HTMLButtonElement) frame.disabled = true;
      frame.querySelector('.arvo-img__state')?.remove();
      frame.appendChild(this._renderStateLayer('error'));
    }
    this._options.onError?.(event);
    this._host.dispatchEvent(new CustomEvent('img:error', { bubbles: true, detail: { src: this._options.src } }));
  }
}
