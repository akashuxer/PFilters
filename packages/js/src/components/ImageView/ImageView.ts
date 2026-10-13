import {
  createOverlaySurface,
  resolveOverlayInitialFocus,
  type ArvoInitialFocusTarget,
  type OverlaySurface,
} from '@arvo/core';
import { ArvoEmptyState } from '../EmptyState/EmptyState';
import { ArvoIconButton } from '../IconButton/IconButton';

export interface ArvoImageViewItem {
  id?: string;
  src: string;
  previewSrc?: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

export type ArvoImageViewMode = 'fit' | 'actualPixels';
export type ArvoImageViewState = 'loading' | 'ready' | 'error' | 'empty';

export interface ArvoImageViewOptions {
  items?: ArvoImageViewItem[];
  activeIndex?: number;
  defaultActiveIndex?: number;
  isOpen?: boolean;
  viewMode?: ArvoImageViewMode;
  hasBackdrop?: boolean;
  closeOnBackdropPress?: boolean;
  closeOnEscape?: boolean;
  isDisabled?: boolean;
  isLooping?: boolean;
  zoom?: number;
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  allowUpscale?: boolean;
  hasPositionIndicator?: boolean;
  navigationControls?: 'auto' | 'always' | 'never';
  initialFocus?: ArvoInitialFocusTarget | null;
  onOpenChange?: (isOpen: boolean) => void;
  onActiveIndexChange?: (index: number, item: ArvoImageViewItem | null) => void;
  onZoomChange?: (zoom: number) => void;
}

interface ResolvedOptions {
  items: ArvoImageViewItem[];
  activeIndex: number;
  isOpen: boolean;
  viewMode: ArvoImageViewMode;
  hasBackdrop: boolean;
  closeOnBackdropPress: boolean;
  closeOnEscape: boolean;
  isDisabled: boolean;
  isLooping: boolean;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  allowUpscale: boolean;
  hasPositionIndicator: boolean;
  navigationControls: 'auto' | 'always' | 'never';
  initialFocus: ArvoInitialFocusTarget;
  onOpenChange: ((isOpen: boolean) => void) | null;
  onActiveIndexChange: ((index: number, item: ArvoImageViewItem | null) => void) | null;
  onZoomChange: ((zoom: number) => void) | null;
}

const DEFAULTS: ResolvedOptions = {
  items: [],
  activeIndex: 0,
  isOpen: false,
  viewMode: 'fit',
  hasBackdrop: true,
  closeOnBackdropPress: true,
  closeOnEscape: true,
  isDisabled: false,
  isLooping: false,
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 4,
  zoomStep: 0.25,
  allowUpscale: false,
  hasPositionIndicator: false,
  navigationControls: 'auto',
  initialFocus: 'custom',
  onOpenChange: null,
  onActiveIndexChange: null,
  onZoomChange: null,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeItems(value: unknown): ArvoImageViewItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ArvoImageViewItem => Boolean(item) && typeof item.src === 'string' && item.src.trim().length > 0)
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `img-${index + 1}`,
      src: item.src.trim(),
      previewSrc: typeof item.previewSrc === 'string' && item.previewSrc.trim() ? item.previewSrc.trim() : undefined,
      alt: typeof item.alt === 'string' ? item.alt : '',
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : undefined,
      width: typeof item.width === 'number' && Number.isFinite(item.width) ? item.width : undefined,
      height: typeof item.height === 'number' && Number.isFinite(item.height) ? item.height : undefined,
    }));
}

function resolveOptions(options: ArvoImageViewOptions = {}): ResolvedOptions {
  const items = normalizeItems(options.items);
  const minZoom = asPositiveNumber(options.minZoom, DEFAULTS.minZoom);
  const maxZoom = Math.max(minZoom, asPositiveNumber(options.maxZoom, DEFAULTS.maxZoom));
  const defaultIndex = typeof options.defaultActiveIndex === 'number' ? options.defaultActiveIndex : DEFAULTS.activeIndex;
  const activeIndex = typeof options.activeIndex === 'number' ? options.activeIndex : defaultIndex;
  const rawZoom = typeof options.zoom === 'number' ? options.zoom : asPositiveNumber(options.defaultZoom, DEFAULTS.zoom);

  return {
    items,
    activeIndex: items.length ? clamp(activeIndex, 0, items.length - 1) : 0,
    isOpen: Boolean(options.isOpen),
    viewMode: options.viewMode === 'actualPixels' ? 'actualPixels' : 'fit',
    hasBackdrop: options.hasBackdrop ?? DEFAULTS.hasBackdrop,
    closeOnBackdropPress: options.closeOnBackdropPress ?? DEFAULTS.closeOnBackdropPress,
    closeOnEscape: options.closeOnEscape ?? DEFAULTS.closeOnEscape,
    isDisabled: Boolean(options.isDisabled),
    isLooping: Boolean(options.isLooping),
    zoom: clamp(rawZoom, minZoom, maxZoom),
    minZoom,
    maxZoom,
    zoomStep: asPositiveNumber(options.zoomStep, DEFAULTS.zoomStep),
    allowUpscale: Boolean(options.allowUpscale),
    hasPositionIndicator: Boolean(options.hasPositionIndicator),
    navigationControls:
      options.navigationControls === 'always' || options.navigationControls === 'never'
        ? options.navigationControls
        : DEFAULTS.navigationControls,
    initialFocus: options.initialFocus ?? DEFAULTS.initialFocus,
    onOpenChange: typeof options.onOpenChange === 'function' ? options.onOpenChange : null,
    onActiveIndexChange: typeof options.onActiveIndexChange === 'function' ? options.onActiveIndexChange : null,
    onZoomChange: typeof options.onZoomChange === 'function' ? options.onZoomChange : null,
  };
}

function announce(node: HTMLElement | null, text: string): void {
  if (!node) return;
  node.textContent = '';
  window.requestAnimationFrame(() => {
    node.textContent = text;
  });
}

export class ArvoImageView {
  private _rawOptions: ArvoImageViewOptions;
  private _options: ResolvedOptions;
  private _mountTarget: HTMLElement;
  private _state: ArvoImageViewState = 'empty';
  private _activeIndex = 0;
  private _zoom = 1;
  private _mode: ArvoImageViewMode = 'fit';
  private _panX = 0;
  private _panY = 0;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragOriginX = 0;
  private _dragOriginY = 0;
  private _isPointerDragging = false;
  private _surface: OverlaySurface | null = null;
  private _root: HTMLElement;
  private _panel: HTMLElement;
  private _body: HTMLElement;
  private _stage: HTMLElement;
  private _viewport: HTMLElement;
  private _asset: HTMLImageElement;
  private _title: HTMLElement;
  private _position: HTMLElement;
  private _zoomLabel: HTMLElement;
  private _live: HTMLElement;
  private _toolbar: HTMLElement;
  private _footer: HTMLElement;
  private _controls: HTMLElement;
  private _closeBtn: HTMLButtonElement;
  private _prevBtn: HTMLButtonElement;
  private _nextBtn: HTMLButtonElement;
  private _fitBtn: HTMLButtonElement;
  private _actualBtn: HTMLButtonElement;
  private _zoomOutBtn: HTMLButtonElement;
  private _zoomInBtn: HTMLButtonElement;
  private _closeBtnInst: ArvoIconButton | null = null;
  private _prevBtnInst: ArvoIconButton | null = null;
  private _nextBtnInst: ArvoIconButton | null = null;
  private _fitBtnInst: ArvoIconButton | null = null;
  private _actualBtnInst: ArvoIconButton | null = null;
  private _zoomOutBtnInst: ArvoIconButton | null = null;
  private _zoomInBtnInst: ArvoIconButton | null = null;

  constructor(hostOrOptions?: HTMLElement | ArvoImageViewOptions, maybeOptions: ArvoImageViewOptions = {}) {
    const hasHost = typeof HTMLElement !== 'undefined' && hostOrOptions instanceof HTMLElement;
    const options = hasHost ? maybeOptions : (hostOrOptions as ArvoImageViewOptions | undefined) ?? {};

    this._mountTarget = hasHost ? hostOrOptions as HTMLElement : document.body;
    this._rawOptions = { ...options };
    this._options = resolveOptions(this._rawOptions);
    this._activeIndex = this._options.activeIndex;
    this._zoom = this._options.zoom;
    this._mode = this._options.viewMode;

    this._root = document.createElement('div');
    this._root.className = 'arvo-img-view';
    if (hasHost) {
      this._root.classList.add('arvo-img-view--embedded');
      this._mountTarget.style.position ||= 'relative';
      this._mountTarget.style.minHeight ||= '560px';
      this._mountTarget.style.width ||= '100%';
    }

    this._panel = document.createElement('section');
    this._panel.className = 'arvo-img-view__panel';
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');
    this._panel.tabIndex = -1;
    this._panel.addEventListener('keydown', this._handleKeydown);
    this._root.appendChild(this._panel);

    this._toolbar = document.createElement('div');
    this._toolbar.className = 'arvo-img-view__toolbar';

    this._title = document.createElement('div');
    this._title.className = 'arvo-img-view__title';
    this._toolbar.appendChild(this._title);

    this._controls = document.createElement('div');
    this._controls.className = 'arvo-img-view__controls';

    this._fitBtn = this._createButton(() => this.viewMode('fit'));
    this._fitBtnInst = ArvoIconButton.initialize(this._fitBtn, {
      icon: 'compress',
      tooltip: 'Fit',
      variant: 'tertiary',
      size: 'md',
    });
    this._actualBtn = this._createButton(() => this.viewMode('actualPixels'));
    this._actualBtnInst = ArvoIconButton.initialize(this._actualBtn, {
      icon: 'expand',
      tooltip: 'Actual size',
      variant: 'tertiary',
      size: 'md',
    });
    this._zoomOutBtn = this._createButton(() => this.zoom(this._zoom - this._options.zoomStep));
    this._zoomOutBtnInst = ArvoIconButton.initialize(this._zoomOutBtn, {
      icon: 'minus',
      tooltip: 'Zoom out',
      variant: 'tertiary',
      size: 'md',
    });
    this._zoomLabel = document.createElement('span');
    this._zoomLabel.className = 'arvo-img-view__zoom-label';
    this._zoomLabel.textContent = '100%';
    this._zoomInBtn = this._createButton(() => this.zoom(this._zoom + this._options.zoomStep));
    this._zoomInBtnInst = ArvoIconButton.initialize(this._zoomInBtn, {
      icon: 'plus',
      tooltip: 'Zoom in',
      variant: 'tertiary',
      size: 'md',
    });
    this._closeBtn = this._createButton(() => {
      void this.close();
    });
    this._closeBtnInst = ArvoIconButton.initialize(this._closeBtn, {
      icon: 'close',
      tooltip: 'Close',
      variant: 'tertiary',
      size: 'md',
    });

    this._controls.append(this._fitBtn, this._zoomOutBtn, this._zoomLabel, this._zoomInBtn, this._closeBtn);
    this._panel.appendChild(this._toolbar);

    this._body = document.createElement('div');
    this._body.className = 'arvo-img-view__body';
    this._panel.appendChild(this._body);

    this._prevBtn = this._createButton(() => this.previous());
    this._prevBtnInst = ArvoIconButton.initialize(this._prevBtn, {
      icon: 'angle-left',
      tooltip: 'Previous image',
      variant: 'secondary',
      size: 'lg',
    });
    this._prevBtn.classList.add('arvo-img-view__nav', 'arvo-img-view__nav--prev');
    this._nextBtn = this._createButton(() => this.next());
    this._nextBtnInst = ArvoIconButton.initialize(this._nextBtn, {
      icon: 'angle-right',
      tooltip: 'Next image',
      variant: 'secondary',
      size: 'lg',
    });
    this._nextBtn.classList.add('arvo-img-view__nav', 'arvo-img-view__nav--next');
    this._body.append(this._prevBtn);

    this._stage = document.createElement('div');
    this._stage.className = 'arvo-img-view__stage';
    this._stage.addEventListener('click', this._handleStageClick);
    this._stage.addEventListener('wheel', this._handleStageWheel, { passive: false });
    this._stage.addEventListener('pointerdown', this._handlePointerDown);
    this._body.appendChild(this._stage);

    this._viewport = document.createElement('div');
    this._viewport.className = 'arvo-img-view__viewport';
    this._stage.appendChild(this._viewport);

    this._asset = document.createElement('img');
    this._asset.className = 'arvo-img-view__asset';
    this._asset.addEventListener('load', this._handleImageLoad);
    this._asset.addEventListener('error', this._handleImageError);
    this._viewport.appendChild(this._asset);
    this._body.append(this._nextBtn);

    this._footer = document.createElement('div');
    this._footer.className = 'arvo-img-view__footer';
    this._position = document.createElement('div');
    this._position.className = 'arvo-img-view__position';
    this._footer.append(
      this._fitBtn,
      this._actualBtn,
      this._zoomOutBtn,
      this._zoomLabel,
      this._zoomInBtn,
      this._position,
      this._closeBtn,
    );
    this._panel.appendChild(this._footer);

    this._live = document.createElement('div');
    this._live.className = 'arvo-sr-only';
    this._live.setAttribute('aria-live', 'polite');
    this._panel.appendChild(this._live);

    this._surface = createOverlaySurface({
      surface: this._panel,
      surfaceRoot: this._root,
      type: 'modal',
      priority: 30,
      position: false,
      focus: {
        mode: 'trap',
        initialFocus:
          this._options.initialFocus === 'custom'
            ? () => this._closeBtn
            : () => resolveOverlayInitialFocus({
                root: this._panel,
                body: this._body,
                header: this._toolbar,
                footer: this._footer,
                initialFocus: this._options.initialFocus,
              }),
      },
      mask: this._options.hasBackdrop
        ? {
            className: 'arvo-img-view__overlay-mask',
            closeOnClick: this._options.closeOnBackdropPress,
            onOutside: () => {
              void this.close();
            },
          }
        : false,
      lockScroll: true,
      closeOnOutside: this._options.closeOnBackdropPress,
      transition: 'fade',
      onClose: () => {
        this._options.onOpenChange?.(false);
        this._emit('img-view:close', { activeIndex: this._activeIndex });
      },
      onOpen: () => {
        this._options.onOpenChange?.(true);
        this._emit('img-view:open', { activeIndex: this._activeIndex });
      },
    });

    this._render();
    if (this._options.isOpen) {
      void this.open();
    }
  }

  static initialize(host: HTMLElement, options?: ArvoImageViewOptions): ArvoImageView;
  static initialize(options?: ArvoImageViewOptions): ArvoImageView;
  static initialize(
    hostOrOptions?: HTMLElement | ArvoImageViewOptions,
    maybeOptions?: ArvoImageViewOptions,
  ): ArvoImageView {
    return new ArvoImageView(hostOrOptions as HTMLElement | ArvoImageViewOptions, maybeOptions);
  }

  update(options: Partial<ArvoImageViewOptions> = {}): void {
    const wasOpen = this.isOpen();
    this._rawOptions = { ...this._rawOptions, ...options };
    this._options = resolveOptions(this._rawOptions);
    this._activeIndex = this._options.items.length ? clamp(this._activeIndex, 0, this._options.items.length - 1) : 0;
    this._zoom = clamp(this._zoom, this._options.minZoom, this._options.maxZoom);
    if (options.activeIndex != null) this._activeIndex = this._options.activeIndex;
    if (options.zoom != null || options.defaultZoom != null) this._zoom = this._options.zoom;
    if (options.viewMode) this._mode = this._options.viewMode;
    if (
      options.activeIndex != null
      || options.defaultActiveIndex != null
      || options.items != null
      || options.viewMode === 'fit'
      || options.zoom != null
      || options.defaultZoom != null
    ) {
      this._resetPan();
    }
    this._render();
    if (this._options.isOpen && !wasOpen) {
      void this.open();
    }
    if (!this._options.isOpen && wasOpen) {
      void this.close();
    }
  }

  async open(): Promise<void> {
    if (this._options.isDisabled || !this._surface) return;
    if (!this._root.isConnected) this._mountTarget.appendChild(this._root);
    this._render();
    await this._surface.open();
  }

  async close(): Promise<void> {
    await this._surface?.close();
    this._root.remove();
  }

  async toggle(): Promise<void> {
    if (this.isOpen()) {
      await this.close();
      return;
    }
    await this.open();
  }

  isOpen(): boolean {
    return this._surface?.isOpen() ?? false;
  }

  activeIndex(value?: number): number {
    if (typeof value === 'number' && this._options.items.length) {
      this._activeIndex = clamp(value, 0, this._options.items.length - 1);
      this._resetPan();
      this._render();
      const item = this._currentItem();
      this._options.onActiveIndexChange?.(this._activeIndex, item);
      this._emit('img-view:index-change', { activeIndex: this._activeIndex, item });
    }
    return this._activeIndex;
  }

  zoom(value?: number): number {
    if (typeof value === 'number') {
      this._zoom = clamp(value, this._options.minZoom, this._options.maxZoom);
      if (this._mode !== 'fit') {
        this._clampPan();
      }
      this._syncZoom();
      this._options.onZoomChange?.(this._zoom);
      this._emit('img-view:zoom-change', { zoom: this._zoom });
    }
    return this._zoom;
  }

  viewMode(value?: ArvoImageViewMode): ArvoImageViewMode {
    if (value === 'fit' || value === 'actualPixels') {
      this._mode = value;
      if (value === 'fit') {
        this._zoom = 1;
        this._resetPan();
      }
      this._render();
    }
    return this._mode;
  }

  previous(): void {
    if (!this._options.items.length) return;
    if (this._activeIndex > 0) {
      this.activeIndex(this._activeIndex - 1);
      return;
    }
    if (this._options.isLooping) this.activeIndex(this._options.items.length - 1);
  }

  next(): void {
    if (!this._options.items.length) return;
    if (this._activeIndex < this._options.items.length - 1) {
      this.activeIndex(this._activeIndex + 1);
      return;
    }
    if (this._options.isLooping) this.activeIndex(0);
  }

  destroy(): void {
    this._panel.removeEventListener('keydown', this._handleKeydown);
    this._stage.removeEventListener('click', this._handleStageClick);
    this._stage.removeEventListener('wheel', this._handleStageWheel);
    this._stage.removeEventListener('pointerdown', this._handlePointerDown);
    window.removeEventListener('pointermove', this._handlePointerMove);
    window.removeEventListener('pointerup', this._handlePointerUp);
    this._asset.removeEventListener('load', this._handleImageLoad);
    this._asset.removeEventListener('error', this._handleImageError);
    this._closeBtnInst?.destroy();
    this._prevBtnInst?.destroy();
    this._nextBtnInst?.destroy();
    this._fitBtnInst?.destroy();
    this._actualBtnInst?.destroy();
    this._zoomOutBtnInst?.destroy();
    this._zoomInBtnInst?.destroy();
    this._surface?.destroy();
    this._root.remove();
  }

  private _createButton(onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arvo-img-view__btn';
    button.addEventListener('click', onClick);
    return button;
  }

  private _currentItem(): ArvoImageViewItem | null {
    return this._options.items[this._activeIndex] ?? null;
  }

  private _render(): void {
    const item = this._currentItem();
    this._state = item ? 'loading' : 'empty';
    this._title.textContent = item?.title ?? item?.alt ?? 'Image preview';
    this._position.textContent =
      this._options.hasPositionIndicator && this._options.items.length > 1
        ? `${this._activeIndex + 1} of ${this._options.items.length}`
        : '';

    const showNav = this._options.navigationControls === 'always'
      || (this._options.navigationControls === 'auto' && this._options.items.length > 1);
    this._prevBtn.hidden = !showNav;
    this._nextBtn.hidden = !showNav;
    this._prevBtn.disabled = !this._options.isLooping && this._activeIndex === 0;
    this._nextBtn.disabled = !this._options.isLooping && this._activeIndex >= this._options.items.length - 1;
    this._position.hidden = !this._position.textContent;

    this._fitBtn.classList.toggle('is-active', this._mode === 'fit');
    this._fitBtnInst?.selected(this._mode === 'fit');
    this._actualBtn.classList.toggle('is-active', this._mode === 'actualPixels');
    this._actualBtnInst?.selected(this._mode === 'actualPixels');
    this._zoomLabel.textContent = `${Math.round(this._zoom * 100)}%`;

    this._stage.querySelectorAll('.arvo-img-view__state').forEach((node) => node.remove());

    if (!item) {
      this._asset.removeAttribute('src');
      this._asset.alt = '';
      this._renderState('empty', 'No image available', 'Add an image to preview it here.');
      return;
    }

    this._renderState('loading', 'Loading image', 'Preparing the selected image for inspection.');
    this._asset.src = item.src;
    this._asset.alt = item.alt ?? '';
    this._asset.dataset.width = item.width ? String(item.width) : '';
    this._asset.dataset.height = item.height ? String(item.height) : '';
    this._syncZoom();
    announce(this._live, `Viewing ${item.title ?? item.alt ?? `image ${this._activeIndex + 1}`}`);
  }

  private _syncZoom(): void {
    this._panel.dataset.mode = this._mode;
    const canPan = this._canPan();
    this._panel.dataset.canPan = canPan ? 'true' : 'false';
    this._panel.dataset.zoomCursor = canPan ? 'none' : (this._zoom >= this._options.maxZoom ? 'out' : 'in');
    this._viewport.style.setProperty('--arvo-img-view-zoom', String(this._zoom));
    const width = Number(this._asset.dataset.width || 0);
    if (this._mode === 'fit') {
      this._asset.style.maxWidth = this._options.allowUpscale || !width ? '100%' : `${width}px`;
      this._asset.style.maxHeight = '100%';
    } else {
      this._asset.style.maxWidth = 'none';
      this._asset.style.maxHeight = 'none';
    }
    this._clampPan();
    this._viewport.style.setProperty('--arvo-img-view-pan-x', `${this._panX}px`);
    this._viewport.style.setProperty('--arvo-img-view-pan-y', `${this._panY}px`);
    this._panel.dataset.isDragging = this._isPointerDragging ? 'true' : 'false';
    this._zoomOutBtn.disabled = this._zoom <= this._options.minZoom;
    this._zoomInBtn.disabled = this._zoom >= this._options.maxZoom;
    this._zoomOutBtnInst?.disabled(this._zoom <= this._options.minZoom);
    this._zoomInBtnInst?.disabled(this._zoom >= this._options.maxZoom);
    this._prevBtnInst?.disabled(this._prevBtn.disabled);
    this._nextBtnInst?.disabled(this._nextBtn.disabled);
  }

  private _renderState(state: Exclude<ArvoImageViewState, 'ready'>, title: string, message: string): void {
    this._state = state;
    const stateEl = document.createElement('div');
    stateEl.className = `arvo-img-view__state arvo-img-view__state--${state}`;
    const host = document.createElement('div');
    stateEl.appendChild(host);
    new ArvoEmptyState(host, {
      size: 'sm',
      illustration: 'no-data',
      title,
      message,
      isAnimated: false,
    });
    this._stage.appendChild(stateEl);
  }

  private _emit(name: string, detail: Record<string, unknown>): void {
    this._root.dispatchEvent(new CustomEvent(name, { detail }));
  }

  private _handleImageLoad = (): void => {
    this._state = 'ready';
    this._stage.querySelectorAll('.arvo-img-view__state').forEach((node) => node.remove());
    this._resetPan();
    this._syncZoom();
    announce(this._live, `${this._title.textContent ?? 'Image'} loaded`);
  };

  private _handleImageError = (): void => {
    this._stage.querySelectorAll('.arvo-img-view__state').forEach((node) => node.remove());
    this._renderState('error', 'Image could not be loaded', 'Check the source URL or try another image.');
    announce(this._live, 'Image could not be loaded');
  };

  private _handleKeydown = (event: KeyboardEvent): void => {
    const panStep = event.shiftKey ? 48 : 24;
    if (this._canPan()) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this._setPan(this._panX + panStep, this._panY);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this._setPan(this._panX - panStep, this._panY);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this._setPan(this._panX, this._panY + panStep);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this._setPan(this._panX, this._panY - panStep);
        return;
      }
    }
    if (event.key === 'Escape' && this._options.closeOnEscape) {
      event.preventDefault();
      void this.close();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoom(this._zoom + this._options.zoomStep);
      return;
    }
    if (event.key === '-') {
      event.preventDefault();
      this.zoom(this._zoom - this._options.zoomStep);
      return;
    }
    if (event.key === '1') {
      event.preventDefault();
      this.viewMode('actualPixels');
      this.zoom(1);
      return;
    }
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.viewMode('fit');
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      this.viewMode('fit');
    }
  };

  private _handleStageClick = (event: MouseEvent): void => {
    if (this._state !== 'ready') return;
    if (this._isPointerDragging) return;
    if ((event.target as HTMLElement | null)?.closest('button')) return;
    if (this._zoom >= this._options.maxZoom) {
      this.zoom(this._zoom - this._options.zoomStep);
      return;
    }
    if (this._mode === 'fit') {
      this._mode = 'actualPixels';
    }
    this.zoom(this._zoom + this._options.zoomStep);
  };

  private _handleStageWheel = (event: WheelEvent): void => {
    if (this._state !== 'ready') return;
    event.preventDefault();
    if (this._mode === 'fit') {
      this._mode = 'actualPixels';
    }
    const delta = event.deltaY < 0 ? this._options.zoomStep : -this._options.zoomStep;
    this.zoom(this._zoom + delta);
  };

  private _handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    if (!this._canPan()) return;
    if ((event.target as HTMLElement | null)?.closest('button')) return;
    this._isPointerDragging = false;
    this._dragStartX = event.clientX;
    this._dragStartY = event.clientY;
    this._dragOriginX = this._panX;
    this._dragOriginY = this._panY;
    this._stage.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this._handlePointerMove);
    window.addEventListener('pointerup', this._handlePointerUp, { once: true });
  };

  private _handlePointerMove = (event: PointerEvent): void => {
    const deltaX = event.clientX - this._dragStartX;
    const deltaY = event.clientY - this._dragStartY;
    if (!this._isPointerDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      this._isPointerDragging = true;
    }
    if (!this._isPointerDragging) return;
    this._setPan(this._dragOriginX + deltaX, this._dragOriginY + deltaY);
  };

  private _handlePointerUp = (): void => {
    window.removeEventListener('pointermove', this._handlePointerMove);
    window.removeEventListener('pointerup', this._handlePointerUp);
    window.setTimeout(() => {
      this._isPointerDragging = false;
      this._panel.dataset.isDragging = 'false';
    }, 0);
  };

  private _setPan(x: number, y: number): void {
    this._panX = x;
    this._panY = y;
    this._clampPan();
    this._viewport.style.setProperty('--arvo-img-view-pan-x', `${this._panX}px`);
    this._viewport.style.setProperty('--arvo-img-view-pan-y', `${this._panY}px`);
    this._panel.dataset.isDragging = this._isPointerDragging ? 'true' : 'false';
  }

  private _resetPan(): void {
    this._panX = 0;
    this._panY = 0;
    this._viewport.style.setProperty('--arvo-img-view-pan-x', '0px');
    this._viewport.style.setProperty('--arvo-img-view-pan-y', '0px');
    this._panel.dataset.isDragging = 'false';
  }

  private _canPan(): boolean {
    if (this._mode === 'fit') return false;
    const bounds = this._getPanBounds();
    return bounds.maxX > 0 || bounds.maxY > 0;
  }

  private _clampPan(): void {
    const bounds = this._getPanBounds();
    this._panX = clamp(this._panX, -bounds.maxX, bounds.maxX);
    this._panY = clamp(this._panY, -bounds.maxY, bounds.maxY);
  }

  private _getPanBounds(): { maxX: number; maxY: number } {
    const stageRect = this._stage.getBoundingClientRect();
    const assetRect = this._asset.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !assetRect.width || !assetRect.height) {
      return { maxX: 0, maxY: 0 };
    }
    const overflowX = Math.max(0, (assetRect.width - stageRect.width) / 2);
    const overflowY = Math.max(0, (assetRect.height - stageRect.height) / 2);
    return { maxX: overflowX, maxY: overflowY };
  }
}
