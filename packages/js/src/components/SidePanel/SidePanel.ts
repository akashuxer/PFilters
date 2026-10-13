/**
 * ArvoSidePanel -- vanilla JS implementation.
 *
 * @deprecated Use `ArvoPanel` (`displayMode: 'overlay' | 'docked'`,
 * `placement: 'left' | 'right'`) instead. ArvoSidePanel will be removed in
 * the next major release. See apps/docs/docs/migration/panel.mdx.
 *
 * Content-area-scoped pane that docks at the layout level (default) or
 * overlays sibling content via slide-in animation. Composes the
 * `panel-shell` shared pattern for its inner anatomy (header, sticky
 * region, custom-content body, footer) and adds SidePanel-only
 * positional concerns: layout vs in-content
 * overlay mounting, the pin button (`__pin`), the side-aware splitter
 * slot, and the layout/overlay variant flip.
 *
 * Pin/unpin flips the active variant WITHOUT remounting the DOM -- the
 * `__pane` HTMLElement reference and the panel-shell instance are
 * preserved across the flip.
 *
 * Built on the OverlaySurface engine. Uses the notify-but-no-veto
 * dismissal pattern: programmatic paths (close button, imperative close)
 * are cancellable via the user `onClose` veto; engine paths (Escape,
 * outside-click) call `onClose` for notification but ignore the veto.
 *
 * See descriptors/side-panel.json.
 */

import {
  createOverlaySurface,
  warnDeprecated,
  type OverlaySurface,
} from '@arvo/core';
import {
  type PanelShellInstance,
  type PanelShellOptions,
  type PanelContent,
  type ArvoPanelHeaderAction,
  type ArvoPanelStickyHeaderConfig,
  type ArvoPanelBannerConfig,
  type ArvoPanelInfoConfig,
  type ArvoPanelAction,
} from '@arvo/utils';
import { createPanelShell } from '../PanelShell/PanelShell';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoSplitter } from '../Splitter/Splitter';
// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoSidePanelVariant = 'layout' | 'overlay';
export type ArvoSidePanelSide = 'left' | 'right';

/**
 * @deprecated Use `ArvoPanelOptions`. ArvoSidePanel will be removed in the
 * next major release.
 */
export interface ArvoSidePanelOptions {
  // -- Positional / variant ------------------------------------------------
  variant?: ArvoSidePanelVariant;
  side?: ArvoSidePanelSide;

  // -- Pin ----------------------------------------------------------------
  isPinnable?: boolean;
  isPinned?: boolean;
  defaultPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;

  // -- Splitter -----------------------------------------------------------
  hasSplitter?: boolean | 'auto';

  // -- Sizing -------------------------------------------------------------
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number | null;

  // -- Overlay open/close -------------------------------------------------
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;

  // -- State --------------------------------------------------------------
  isDisabled?: boolean;
  isLoading?: boolean;

  // -- A11y / styling -----------------------------------------------------
  ariaLabel?: string;
  className?: string;

  // -- Forwarded to PanelShell --------------------------------------------
  title?: string | null;
  hasHeader?: boolean;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPanelHeaderAction[];
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  /**
   * Custom body content -- an element to append, an HTML string, or a
   * callback that populates the body container. This is the generic content
   * seam (the panel does NOT ship a built-in item/list schema): build your
   * own markup and filter it yourself from the `sp:search` / `onSearchChange`
   * events. Mirrors `ArvoPopover`'s `content` option.
   */
  content?: PanelContent;
  actions?: ArvoPanelAction[] | false;
  hasFooter?: boolean;
  isClosable?: boolean;
  /**
   * Fired when the search query changes. `matchedCount` is `null` (the panel
   * does not own the content); compute and surface your own filtered count via
   * `setInfo()`.
   */
  onSearchChange?: (query: string, matchedCount: number | null) => void;
  /** Fired when a tab is selected. */
  onTabSelect?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Re-exports of panel-shell types (consumer convenience)
// ---------------------------------------------------------------------------

export type {
  ArvoPanelHeaderAction,
  ArvoPanelStickyHeaderConfig,
  ArvoPanelBannerConfig,
  ArvoPanelInfoConfig,
  ArvoPanelAction,
};

// Backwards-compat aliases (descriptor.customTypes).
export type ArvoSidePanelHeaderAction = ArvoPanelHeaderAction;
export type ArvoSidePanelStickyHeaderConfig = ArvoPanelStickyHeaderConfig;
export type ArvoSidePanelBannerConfig = ArvoPanelBannerConfig;
export type ArvoSidePanelInfoConfig = ArvoPanelInfoConfig;
export type ArvoSidePanelAction = ArvoPanelAction;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDE_PANEL_HOST_CLASSES = [
  'arvo-sp',
  'arvo-sp--layout',
  'arvo-sp--overlay',
  'arvo-sp--side-left',
  'arvo-sp--side-right',
  'arvo-sp--pinnable',
  'arvo-sp--closable',
  'arvo-sp--with-back',
  'arvo-sp--with-splitter-l',
  'arvo-sp--with-splitter-r',
  'is-pinned',
  'is-unpinned',
  'loading',
  'is-disabled',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCssLength(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? `${value}px` : value;
}

let _sidePanelIdCounter = 0;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoSidePanel {
  private _options: ArvoSidePanelOptions;
  /** Stable id used to register with the overlay hub via the engine. */
  private readonly _overlayId = `arvo-sp-${++_sidePanelIdCounter}`;
  private _host: HTMLElement;
  private _paneEl: HTMLElement;
  private _splitterEl: HTMLElement | null = null;
  private _splitterInstance: ArvoSplitter | null = null;
  private _splitterResolved: boolean;
  private _resizedWidth: number | null = null;

  private _variant: ArvoSidePanelVariant;
  private _side: ArvoSidePanelSide;
  private _isPinnedState: boolean;
  private _isOpenState: boolean;
  private _isDisabled: boolean;
  private _isLoading: boolean;

  /** Public for parity with React's PanelShellHandle delegate access. */
  shell!: PanelShellInstance;

  private _pinBtn: ArvoIconButton | null = null;
  private _pinBtnEl: HTMLButtonElement | null = null;

  private _surface: OverlaySurface | null = null;
  private _closingProgrammatically = false;

  private _escapeListener: ((e: KeyboardEvent) => void) | null = null;
  private _outsideListener: ((e: MouseEvent) => void) | null = null;

  // Bound shell-event re-emit listeners for clean teardown.
  private _shellEventBindings: Array<{
    src: string;
    handler: (e: Event) => void;
  }> = [];

  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options: ArvoSidePanelOptions = {},
  ): ArvoSidePanel {
    return new ArvoSidePanel(element, options);
  }

  constructor(element: HTMLElement, options: ArvoSidePanelOptions = {}) {
    warnDeprecated({
      component: 'ArvoSidePanel',
      successor: 'ArvoPanel',
      reason: "Use displayMode='overlay'|'docked' + placement='left'|'right'.",
    });

    this._options = { ...options };
    this._host = element;
    this._host.classList.add('arvo-sp');

    this._isPinnedState = options.isPinned ?? options.defaultPinned ?? true;
    this._isOpenState = options.isOpen ?? options.defaultOpen ?? true;
    this._side = options.side ?? 'right';

    this._variant = options.isPinnable
      ? this._isPinnedState
        ? 'layout'
        : 'overlay'
      : options.variant ?? 'layout';

    this._isDisabled = !!options.isDisabled;
    this._isLoading = (!!options.isLoading) === true;

    this._splitterResolved = this._resolveSplitter();

    // Build __pane.
    this._paneEl = document.createElement('div');
    this._paneEl.className = 'arvo-sp__pane';

    if (this._splitterResolved && this._side === 'right') {
      this._splitterEl = this._buildSplitter();
      this._host.appendChild(this._splitterEl);
    }
    this._host.appendChild(this._paneEl);
    if (this._splitterResolved && this._side === 'left') {
      this._splitterEl = this._buildSplitter();
      this._host.appendChild(this._splitterEl);
    }

    this._applyWidthVars();
    this._applyClasses();
    this._applyAria();

    // Compose the panel-shell into __pane.
    const contentProps: PanelShellOptions = {
      title: options.title ?? null,
      hasHeader: options.hasHeader,
      hasBackButton: options.hasBackButton,
      onBack: options.onBack,
      headerActions: options.headerActions,
      stickyHeader: options.stickyHeader,
      content: options.content,
      actions: options.actions,
      hasFooter: options.hasFooter,
      isClosable: options.isClosable,
      onSearchChange: options.onSearchChange,
      onTabSelect: options.onTabSelect,
      onClose: () => {
        this._handleClose(false);
      },
      isPinnableCount: options.isPinnable ? 1 : 0,
      isClosableCount: options.isClosable ? 1 : 0,
    };
    this.shell = createPanelShell({
      parentBlock: 'arvo-sp',
      parent: this._paneEl,
      options: contentProps,
    });

    // Build SidePanel-owned __pin button and inject into shell's __hdr-actions.
    if (options.isPinnable) {
      this._pinBtnEl = this._buildPinButtonEl();
      this._pinBtn = ArvoIconButton.initialize(this._pinBtnEl, {
        size: 'sm',
        variant: 'tertiary',
        icon: 'push-pin',
        tooltip: this._isPinnedState ? 'Unpin panel' : 'Pin panel',
        isDisabled: this._isDisabled,
        isSelected: this._isPinnedState,
        onClick: () => this._handlePinClick(),
      });
      this._pinBtnEl.classList.add('arvo-sp__pin');
      this.shell.setPinSlot(this._pinBtnEl);
    }

    if (this._isLoading) {
      this.shell.loading(true);
      this._host.classList.add('loading');
    }
    if (this._isDisabled) {
      this.shell.disabled(true);
      this._host.classList.add('is-disabled');
    }

    this._wireShellEventReemit();

    // For overlay variant: wire Escape + outside-click; create engine surface.
    if (this._variant === 'overlay') {
      this._setupOverlayListeners();
      if (this._isOpenState) {
        this._createSurface();
        void this._surface!.open().then(() => {
          if (this._isOpenState && !this._destroyed) {
            this._paneEl.dispatchEvent(
              new CustomEvent('sp:open', { bubbles: true }),
            );
          }
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API -- overlay lifecycle
  // -------------------------------------------------------------------------

  async open(): Promise<void> {
    if (this._variant !== 'overlay') return;
    if (this._isOpenState) return;
    if (this._options.onOpen?.() === false) return;

    this._isOpenState = true;
    if (!this._surface) this._createSurface();
    this._applyAria();

    await this._surface!.open();

    if (this._isOpenState && !this._destroyed) {
      this._paneEl.dispatchEvent(
        new CustomEvent('sp:open', { bubbles: true }),
      );
    }
    this._options.onOpenChange?.(true);
  }

  close(): void {
    this._handleClose(false);
  }

  isOpen(): boolean {
    if (this._variant === 'layout') return true;
    return this._isOpenState;
  }

  toggle(): void {
    if (this._variant !== 'overlay') return;
    if (this._isOpenState) this.close();
    else void this.open();
  }

  // -------------------------------------------------------------------------
  // Public API -- pin / variant
  // -------------------------------------------------------------------------

  pinned(): boolean;
  pinned(value: boolean): void;
  pinned(value?: boolean): boolean | void {
    if (value === undefined) return this._isPinnedState;
    if (!this._options.isPinnable) return;
    this._setPinned(value);
  }

  setVariant(variant: ArvoSidePanelVariant): void {
    if (this._variant === variant) return;
    if (this._options.isPinnable) {
      this._setPinned(variant === 'layout');
      return;
    }
    this._variant = variant;
    this._reflowSplitter();
    this._applyClasses();
    this._applyAria();
    if (variant === 'overlay') {
      this._setupOverlayListeners();
      if (this._isOpenState) {
        if (!this._surface) this._createSurface();
        void this._surface!.open();
      }
    } else {
      this._teardownOverlayListeners();
      this._surface?.destroy();
      this._surface = null;
      this._host.classList.remove('open');
    }
  }

  // -------------------------------------------------------------------------
  // Public API -- panel-shell delegates
  // -------------------------------------------------------------------------

  /** Replace the custom body content. */
  setContent(content: PanelContent): void {
    this.shell.setContent(content);
  }

  /**
   * Update the sticky `__info` row in place (no sticky-region rebuild, so
   * search focus is preserved). Pass `false` to hide it. Use this to surface
   * a filtered-result message computed against your own custom content.
   */
  setInfo(config: ArvoPanelInfoConfig | false): void {
    this.shell.setInfo(config);
  }

  setStickyHeader(config: ArvoPanelStickyHeaderConfig | false): void {
    this.shell.setStickyHeader(config);
  }

  /**
   * Replace header actions. The shell's `renderHeaderActions` re-positions
   * the pin slot via `insertPinSlot` on every render, so the pin button
   * stays correctly placed (between user actions and __close) without
   * additional work here.
   */
  setHeaderActions(actions: ArvoPanelHeaderAction[]): void {
    this.shell.setHeaderActions(actions);
  }

  setActions(actions: ArvoPanelAction[] | false): void {
    this.shell.setActions(actions);
  }

  updateAction(
    id: string,
    patch: Partial<ArvoPanelHeaderAction | ArvoPanelAction>,
  ): void {
    this.shell.updateAction(id, patch);
  }

  search(): string;
  search(query: string): void;
  search(query?: string): string | void {
    if (query === undefined) return (this.shell.search() as string) ?? '';
    this.shell.search(query);
  }

  selectedTab(): string | null;
  selectedTab(id: string): void;
  selectedTab(id?: string): string | null | void {
    if (id === undefined) return (this.shell.selectedTab() as string | null) ?? null;
    this.shell.selectedTab(id);
  }

  setTitle(title: string | null): void {
    this.shell.setTitle(title);
  }

  loading(): boolean;
  loading(state: boolean): void;
  loading(state?: boolean): boolean | void {
    if (state === undefined) return this._isLoading;
    this._isLoading = state;
    this.shell.loading(state);
    this._host.classList.toggle('loading', state);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._isDisabled;
    this._isDisabled = state;
    this.shell.disabled(state);
    this._host.classList.toggle('is-disabled', state);
    this._pinBtn?.disabled(state);
    this._splitterInstance?.disabled(state);
  }

  focus(target?: 'first' | 'title' | 'search' | 'list'): void {
    this.shell.focus(target);
  }

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._teardownOverlayListeners();
    this._teardownShellEventReemit();

    this._surface?.destroy();
    this._surface = null;

    this._pinBtn?.destroy();
    this._pinBtn = null;
    this._pinBtnEl = null;

    this.shell.destroy();

    this._splitterInstance?.destroy();
    this._splitterInstance = null;
    this._splitterEl?.remove();
    this._splitterEl = null;

    this._paneEl.remove();

    // Leave the consumer-owned host element in place but strip our classes
    // and inline width vars so it can be reused.
    SIDE_PANEL_HOST_CLASSES.forEach((c) => this._host.classList.remove(c));
    if (this._options.className) {
      this._host.classList.remove(this._options.className);
    }
    this._host.style.removeProperty('--arvo-sp-width');
    this._host.style.removeProperty('--arvo-sp-min-width');
    this._host.style.removeProperty('--arvo-sp-max-width');
  }

  // -------------------------------------------------------------------------
  // Private -- OverlaySurface engine
  // -------------------------------------------------------------------------

  private _createSurface(): void {
    this._surface = createOverlaySurface({
      id: this._overlayId,
      surface: this._host,
      type: 'side-panel',
      priority: 0,
      trigger: null,
      position: false,
      focus: {
        mode: 'trap',
        initialFocus: 'first',
        returnFocus: true,
        activateAfterTransition: true,
      },
      transition: 'fade',
      transitionDuration: 200,
      closeOnOutside: false,
      triggerAria: false,
      managesOwnFocus: true,
      managesOwnBackdrop: true,
      onClose: () => this._handleEngineClose(),
    });
  }

  // -------------------------------------------------------------------------
  // Private -- two-path close (notify-but-no-veto pattern)
  // -------------------------------------------------------------------------

  /**
   * Unified close handler.
   * - Programmatic path (`fromEngine: false`): user `onClose` can veto.
   * - Engine path (`fromEngine: true`): user `onClose` notified, veto ignored.
   * - Layout variant: dispatches sp:close but does NOT close the surface
   *   (layout panels are always visible).
   */
  private _handleClose(fromEngine: boolean): void {
    if (this._variant === 'overlay' && !this._isOpenState) return;

    if (!fromEngine) {
      if (this._options.onClose?.() === false) return;
    } else {
      this._options.onClose?.();
    }

    this._paneEl.dispatchEvent(
      new CustomEvent('sp:close', {
        detail: {},
        bubbles: true,
        cancelable: !fromEngine,
      }),
    );

    if (this._variant === 'overlay') {
      this._isOpenState = false;

      this._closingProgrammatically = true;
      void this._surface?.close();
      this._closingProgrammatically = false;

      this._applyAria();
      this._options.onOpenChange?.(false);
    }
  }

  /**
   * Engine's onClose callback. Safety-net path: shouldn't fire under normal
   * operation since the component owns Escape + outside-click via
   * `closeOnEscape: false` + `closeOnOutside: false`.
   */
  private _handleEngineClose(): void {
    if (this._closingProgrammatically) {
      return;
    }
    this._isOpenState = false;
    this._applyAria();
    this._options.onOpenChange?.(false);
  }

  // -------------------------------------------------------------------------
  // Private -- DOM construction
  // -------------------------------------------------------------------------

  private _buildPinButtonEl(): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    return el;
  }

  private _resolveSplitter(): boolean {
    const opt = this._options.hasSplitter ?? false;
    if (opt === 'auto') return this._variant === 'layout';
    return opt === true;
  }

  /**
   * Re-resolves whether the splitter should be present and adds/removes the
   * `__splitter` element + side modifier class accordingly. Called whenever
   * the variant flips (pin/unpin or imperative `setVariant`) so `hasSplitter:'auto'`
   * stays in sync with the active variant.
   */
  private _reflowSplitter(): void {
    const wantSplitter = this._resolveSplitter();
    if (wantSplitter === this._splitterResolved) return;
    this._splitterResolved = wantSplitter;

    if (wantSplitter) {
      if (!this._splitterEl) this._splitterEl = this._buildSplitter();
      if (this._side === 'right') {
        this._host.insertBefore(this._splitterEl, this._paneEl);
      } else {
        if (this._paneEl.nextSibling) {
          this._host.insertBefore(this._splitterEl, this._paneEl.nextSibling);
        } else {
          this._host.appendChild(this._splitterEl);
        }
      }
    } else if (this._splitterEl) {
      this._splitterInstance?.destroy();
      this._splitterInstance = null;
      this._splitterEl.remove();
      this._splitterEl = null;
    }
  }

  private _buildSplitter(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'arvo-sp__splitter';

    // Resolve numeric bounds from the configured width options.
    const numericMin = this._toNumericPx(this._options.minWidth, 100);
    const numericMax = this._toNumericPx(this._options.maxWidth, 2000);
    const numericValue =
      this._resizedWidth ??
      this._toNumericPx(this._options.width, numericMin);
    const clampedValue = Math.min(
      Math.max(numericValue, numericMin),
      numericMax,
    );

    this._splitterInstance = ArvoSplitter.initialize(el, {
      orientation: 'vertical',
      inverse: this._side === 'right',
      minSize: numericMin,
      maxSize: numericMax,
      value: clampedValue,
      ariaLabel: 'Resize side panel',
      isDisabled: this._isDisabled,
      onResize: ({ value }) => {
        this._resizedWidth = value;
        this._applyWidthVars();
      },
    });
    return el;
  }

  private _toNumericPx(
    raw: string | number | null | undefined,
    fallback: number,
  ): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  // -------------------------------------------------------------------------
  // Private -- class / aria / width application
  // -------------------------------------------------------------------------

  private _applyClasses(): void {
    SIDE_PANEL_HOST_CLASSES.forEach((c) => {
      if (c === 'open' || c === 'loading' || c === 'is-disabled') return;
      this._host.classList.remove(c);
    });

    this._host.classList.add('arvo-sp');
    this._host.classList.add(`arvo-sp--${this._variant}`);
    this._host.classList.add(`arvo-sp--side-${this._side}`);

    if (this._options.isPinnable) {
      this._host.classList.add('arvo-sp--pinnable');
      this._host.classList.add(this._isPinnedState ? 'is-pinned' : 'is-unpinned');
    }
    if (this._options.isClosable) this._host.classList.add('arvo-sp--closable');
    if (this._options.hasBackButton) this._host.classList.add('arvo-sp--with-back');

    if (this._splitterResolved) {
      this._host.classList.add(
        this._side === 'right'
          ? 'arvo-sp--with-splitter-l'
          : 'arvo-sp--with-splitter-r',
      );
    }

    if (this._options.className) {
      this._host.classList.add(this._options.className);
    }
  }

  private _applyAria(): void {
    if (this._variant === 'overlay') {
      this._paneEl.setAttribute('role', 'dialog');
      this._paneEl.setAttribute('aria-modal', 'false');
      if (!this._isOpenState) {
        this._paneEl.setAttribute('aria-hidden', 'true');
      } else {
        this._paneEl.removeAttribute('aria-hidden');
      }
    } else {
      this._paneEl.setAttribute('role', 'region');
      this._paneEl.removeAttribute('aria-modal');
      this._paneEl.removeAttribute('aria-hidden');
    }

    if (this._options.ariaLabel) {
      this._paneEl.setAttribute('aria-label', this._options.ariaLabel);
    } else if (this._options.title) {
      this._paneEl.setAttribute('aria-label', this._options.title);
    }
  }

  private _applyWidthVars(): void {
    // Splitter overrides take precedence over the configured `width` option.
    const w =
      this._resizedWidth !== null
        ? `${this._resizedWidth}px`
        : toCssLength(this._options.width ?? 290);
    const minW = toCssLength(this._options.minWidth ?? 320); // matches $arvo-sidepanel-wmin / SCSS default --arvo-sp-min-width
    const maxW = toCssLength(this._options.maxWidth ?? null);
    if (w) this._host.style.setProperty('--arvo-sp-width', w);
    if (minW) this._host.style.setProperty('--arvo-sp-min-width', minW);
    if (maxW) this._host.style.setProperty('--arvo-sp-max-width', maxW);
  }

  // -------------------------------------------------------------------------
  // Private -- pin lifecycle
  // -------------------------------------------------------------------------

  private _handlePinClick(): void {
    if (this._isDisabled || !this._options.isPinnable) return;
    this._setPinned(!this._isPinnedState);
    this._pinBtnEl?.focus({ preventScroll: true });
  }

  private _setPinned(next: boolean): void {
    if (this._isPinnedState === next) return;
    this._isPinnedState = next;
    this._variant = next ? 'layout' : 'overlay';
    this._reflowSplitter();
    this._applyClasses();
    this._applyAria();

    this._pinBtn?.selected(next);
    this._pinBtn?.setTooltip(next ? 'Unpin panel' : 'Pin panel');

    if (this._variant === 'overlay') {
      // Layout -> Overlay: create engine surface, open (panel stays visible).
      this._setupOverlayListeners();
      this._isOpenState = true;
      if (!this._surface) this._createSurface();
      void this._surface!.open();
    } else {
      // Overlay -> Layout: destroy engine surface (JS equivalent of React's
      // `isOpen:false` hook-inert pattern).
      this._teardownOverlayListeners();
      this._surface?.destroy();
      this._surface = null;
      this._host.classList.remove('open');
    }

    this._options.onPinChange?.(next);
    this._paneEl.dispatchEvent(
      new CustomEvent('sp:pin', {
        bubbles: true,
        detail: { pinned: next },
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Private -- component-owned overlay listeners
  // -------------------------------------------------------------------------

  private _setupOverlayListeners(): void {
    if (this._escapeListener || this._outsideListener) return;

    if (this._options.closeOnEscape !== false) {
      this._escapeListener = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        if (!this._isOpenState) return;
        if (this._variant !== 'overlay') return;
        e.stopPropagation();
        this._handleClose(true);
      };
      document.addEventListener('keydown', this._escapeListener, true);
    }

    if (this._options.closeOnOutside) {
      this._outsideListener = (e: MouseEvent) => {
        if (!this._isOpenState) return;
        if (this._variant !== 'overlay') return;
        const target = e.target as Node | null;
        if (!target) return;
        if (this._host.contains(target)) return;
        this._handleClose(true);
      };
      document.addEventListener('mousedown', this._outsideListener, true);
    }
  }

  private _teardownOverlayListeners(): void {
    if (this._escapeListener) {
      document.removeEventListener('keydown', this._escapeListener, true);
      this._escapeListener = null;
    }
    if (this._outsideListener) {
      document.removeEventListener('mousedown', this._outsideListener, true);
      this._outsideListener = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private -- shell event re-emit (prefix sp:*)
  // -------------------------------------------------------------------------

  private _wireShellEventReemit(): void {
    const map: Record<string, string> = {
      back: 'sp:back',
      action: 'sp:action',
      'tab-select': 'sp:tab-select',
      search: 'sp:search',
    };
    for (const [src, dest] of Object.entries(map)) {
      const handler = (e: Event) => {
        const ce = e as CustomEvent;
        this._paneEl.dispatchEvent(
          new CustomEvent(dest, { bubbles: true, detail: ce.detail }),
        );
      };
      this._paneEl.addEventListener(src, handler);
      this._shellEventBindings.push({ src, handler });
    }
  }

  private _teardownShellEventReemit(): void {
    for (const { src, handler } of this._shellEventBindings) {
      this._paneEl.removeEventListener(src, handler);
    }
    this._shellEventBindings = [];
  }
}

export default ArvoSidePanel;
