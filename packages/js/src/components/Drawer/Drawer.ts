/**
 * ArvoDrawer -- vanilla JS implementation.
 *
 * @deprecated Use `ArvoPanel` (`displayMode: 'overlay'`,
 * `placement: 'left' | 'right'`, `isModal: hasMask`) instead. ArvoDrawer will
 * be removed in the next major release. See
 * apps/docs/docs/migration/panel.mdx.
 *
 * Viewport-anchored slide-in overlay panel. Always portaled (default
 * `document.body`, configurable container) and always overlay -- there
 * is no layout/pinned mode (use `ArvoSidePanel` when pinning into the
 * layout is meaningful). Composes the same content shell as
 * `ArvoSidePanel` (header, sticky pre-body region, scrollable
 * custom-content body, footer) via the shared `panel-shell`
 * pattern, and adds Drawer-only positional concerns: portal mounting,
 * optional backdrop, scroll lock, focus trap, slide-in animation, and
 * Escape / mask-click dismissal.
 *
 * The `element` arg passed to `initialize()` is a marker / cleanup anchor.
 * The visual root (`.arvo-drw` host) is portaled to
 * `options.container || document.body`.
 *
 * Built on the OverlaySurface engine. Uses the notify-but-no-veto
 * dismissal pattern: programmatic paths (close button, imperative close)
 * are cancellable via the user `onClose` veto; engine paths (Escape,
 * mask-click, outside-click) call `onClose` for notification but ignore
 * the veto.
 *
 * See React parity reference at packages/react/src/components/Drawer/Drawer.tsx.
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
// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Drawer side. Run 5 of the feedback/overlays refactor dropped `top` and
 * `bottom` to align Drawer with the design system's left/right-only spec;
 * passing either falls back to `right` with a one-shot dev warning.
 */
export type ArvoDrawerSide = 'left' | 'right';
export type ArvoDrawerCloseReason =
  | 'escape'
  | 'mask-click'
  | 'close-button'
  | 'programmatic';

/**
 * Mask config for the Drawer scrim. The shared `@arvo/core/mask` overlay
 * primitive paints a single canonical scrim with a fixed background color
 * and `backdrop-filter: blur(4px)`. Pass `true` for defaults or an object
 * to control dismiss behavior.
 */
export interface ArvoDrawerMaskConfig {
  /**
   * When true, clicking the mask closes the drawer (default true). This is
   * an alias of the parent `closeOnOutsideClick` / `closeOnMaskClick` and
   * applies regardless of whether a mask is rendered.
   */
  closeOnClick?: boolean;
}

/**
 * @deprecated Use `ArvoPanelOptions`. ArvoDrawer will be removed in the next
 * major release.
 */
export interface ArvoDrawerOptions {
  // -- Positional / portal -------------------------------------------------
  side?: ArvoDrawerSide;
  container?: HTMLElement | (() => HTMLElement) | null;

  // -- Open / close --------------------------------------------------------
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: (reason: ArvoDrawerCloseReason) => boolean | void;

  // -- Mask / dismissal ----------------------------------------------------
  hasMask?: boolean | ArvoDrawerMaskConfig;
  closeOnEscape?: boolean;
  /**
   * Whether clicking outside the drawer pane closes it. Defaults to `true`
   * and applies in BOTH masked and mask-less configurations -- the prop
   * controls dismissal behavior, not whether a scrim is painted. The
   * legacy `closeOnMaskClick` name is preserved for source compatibility;
   * `closeOnOutsideClick` is the new canonical name.
   */
  closeOnOutsideClick?: boolean;
  /** @deprecated Use `closeOnOutsideClick`; both are honored, this is the older name. */
  closeOnMaskClick?: boolean;
  lockScroll?: boolean | 'auto';

  // -- Sizing --------------------------------------------------------------
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  height?: string | number | null;

  // -- Animation -----------------------------------------------------------
  animationDuration?: number;

  // -- A11y / styling ------------------------------------------------------
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;

  // -- State ---------------------------------------------------------------
  isClosable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;

  // -- Forwarded to PanelShell ---------------------------------------------
  title?: string | null;
  hasHeader?: boolean;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPanelHeaderAction[];
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  /**
   * Custom body content -- an element to append, an HTML string, or a
   * callback that populates the body container. This is the generic content
   * seam (the drawer does NOT ship a built-in item/list schema): build your
   * own markup and filter it yourself from the `drw:search` / `onSearchChange`
   * events. Mirrors `ArvoPopover`'s `content` option.
   */
  content?: PanelContent;
  /**
   * Fired when the search query changes. `matchedCount` is `null` (the drawer
   * does not own the content); compute and surface your own filtered count via
   * `setInfo()`.
   */
  onSearchChange?: (query: string, matchedCount: number | null) => void;
  /** Fired when a tab is selected. */
  onTabSelect?: (id: string) => void;
  actions?: ArvoPanelAction[] | false;
  hasFooter?: boolean;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCssLength(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? `${value}px` : value;
}

interface ResolvedMask {
  hasMask: boolean;
  closeOnClick: boolean;
}

function resolveMask(
  hasMask: boolean | ArvoDrawerMaskConfig | undefined,
  closeOnOutsideClickProp: boolean,
): ResolvedMask {
  if (hasMask === undefined || hasMask === false) {
    return {
      hasMask: false,
      closeOnClick: closeOnOutsideClickProp,
    };
  }
  if (hasMask === true) {
    return {
      hasMask: true,
      closeOnClick: closeOnOutsideClickProp,
    };
  }
  return {
    hasMask: true,
    closeOnClick: hasMask.closeOnClick ?? closeOnOutsideClickProp,
  };
}

function resolveSide(
  side: 'left' | 'right' | 'top' | 'bottom' | undefined,
): ArvoDrawerSide {
  const s = side ?? 'right';
  if (s === 'top' || s === 'bottom') {
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production' &&
      typeof console !== 'undefined' &&
      typeof console.warn === 'function'
    ) {
      console.warn(
        `[ArvoDrawer] side="${s}" is not supported; the design system only allows "left" and "right". Falling back to "right".`,
      );
    }
    return 'right';
  }
  return s;
}

function resolveContainer(
  container: HTMLElement | (() => HTMLElement) | null | undefined,
): HTMLElement {
  if (container == null) return document.body;
  if (typeof container === 'function') return container();
  return container;
}

const HOST_CLASSES = [
  'arvo-drw',
  'arvo-drw--side-left',
  'arvo-drw--side-right',
  'arvo-drw--with-mask',
  'loading',
  'is-disabled',
];

let _drawerIdCounter = 0;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoDrawer {
  private _options: ArvoDrawerOptions;
  /** Stable id used to register with the overlay hub via the engine. */
  private readonly _overlayId = `arvo-drw-${++_drawerIdCounter}`;
  /** Consumer-provided marker element. NOT used as the visual root. */
  private _markerEl: HTMLElement;
  /** The portaled `.arvo-drw` host (built by this class, appended to container). */
  private _host: HTMLElement;
  private _paneEl: HTMLElement;
  private _container: HTMLElement;

  private _side: ArvoDrawerSide;
  private _mask: ResolvedMask;
  private _closeOnEscape: boolean;
  private _lockScrollResolved: boolean;

  private _isOpenState: boolean;
  private _isDisabled: boolean;
  private _isLoading: boolean;

  /** Public for parity with React's PanelShellHandle delegate access. */
  shell!: PanelShellInstance;

  private _surface: OverlaySurface | null = null;
  private _closingProgrammatically = false;

  private _escapeListener: ((e: KeyboardEvent) => void) | null = null;
  private _outsideClickListener: ((e: PointerEvent) => void) | null = null;
  private _shellEventBindings: Array<{
    src: string;
    handler: (e: Event) => void;
  }> = [];

  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options: ArvoDrawerOptions = {},
  ): ArvoDrawer {
    return new ArvoDrawer(element, options);
  }

  constructor(element: HTMLElement, options: ArvoDrawerOptions = {}) {
    warnDeprecated({
      component: 'ArvoDrawer',
      successor: 'ArvoPanel',
      reason: "Use displayMode='overlay' + placement='left'|'right' + isModal={hasMask}.",
    });

    this._options = { ...options };
    this._markerEl = element;

    this._side = resolveSide(options.side);
    const closeOutside =
      options.closeOnOutsideClick !== undefined
        ? options.closeOnOutsideClick !== false
        : options.closeOnMaskClick !== false;
    this._mask = resolveMask(options.hasMask, closeOutside);
    this._closeOnEscape = options.closeOnEscape !== false;
    this._lockScrollResolved =
      options.lockScroll === undefined || options.lockScroll === 'auto'
        ? this._mask.hasMask
        : options.lockScroll === true;

    this._isOpenState = options.isOpen ?? options.defaultOpen ?? false;
    this._isDisabled = !!options.isDisabled;
    this._isLoading = (!!options.isLoading) === true;

    this._container = resolveContainer(options.container);

    // Build the portaled host + __pane.
    this._host = document.createElement('div');
    this._paneEl = document.createElement('div');
    this._paneEl.className = 'arvo-drw__pane';
    this._host.appendChild(this._paneEl);

    this._applyClasses();
    this._applyStyleVars();

    // Compose the panel-shell into __pane.
    // NOTE: _applyAria() is intentionally invoked AFTER createPanelShell.
    // createPanelShell writes its own aria-labelledby to the parent element
    // (this._paneEl) when a title is present; running our _applyAria() first
    // would let that internal default overwrite a consumer-supplied
    // ariaLabelledBy on first paint.
    const contentProps: PanelShellOptions = {
      title: options.title ?? null,
      hasHeader: options.hasHeader,
      hasBackButton: options.hasBackButton,
      onBack: options.onBack,
      headerActions: options.headerActions,
      stickyHeader: options.stickyHeader,
      content: options.content,
      onSearchChange: options.onSearchChange,
      onTabSelect: options.onTabSelect,
      actions: options.actions,
      hasFooter: options.hasFooter,
      isClosable: options.isClosable !== false,
      onClose: () => {
        this._handleClose('close-button', { fromEngine: false });
      },
      isClosableCount: options.isClosable !== false ? 1 : 0,
    };
    this.shell = createPanelShell({
      parentBlock: 'arvo-drw',
      parent: this._paneEl,
      options: contentProps,
    });

    this._applyAria();

    if (this._isLoading) {
      this.shell.loading(true);
      this._host.classList.add('loading');
    }
    if (this._isDisabled) {
      this.shell.disabled(true);
      this._host.classList.add('is-disabled');
    }

    this._wireShellEventReemit();

    // Mount to container (Drawer is always portaled).
    this._container.appendChild(this._host);

    // Honor initial open state via the engine.
    if (this._isOpenState) {
      this._createSurface();
      void this._surface!.open().then(() => {
        if (this._isOpenState && !this._destroyed) {
          this._paneEl.dispatchEvent(
            new CustomEvent('drw:open', { bubbles: true }),
          );
        }
      });
      if (this._closeOnEscape) this._setupEscapeListener();
      if (!this._mask.hasMask && this._mask.closeOnClick) {
        this._setupOutsideClickListener();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API -- lifecycle
  // -------------------------------------------------------------------------

  async open(): Promise<void> {
    if (this._destroyed) return;
    if (this._isOpenState) return;
    if (this._options.onOpen?.() === false) return;

    this._isOpenState = true;
    this._applyAria();

    if (!this._surface) this._createSurface();
    if (this._closeOnEscape) this._setupEscapeListener();
    if (!this._mask.hasMask && this._mask.closeOnClick) {
      this._setupOutsideClickListener();
    }

    await this._surface!.open();

    if (this._isOpenState && !this._destroyed) {
      this._paneEl.dispatchEvent(
        new CustomEvent('drw:open', { bubbles: true }),
      );
    }
    this._options.onOpenChange?.(true);
  }

  close(reason: ArvoDrawerCloseReason = 'programmatic'): void {
    this._handleClose(reason, { fromEngine: false });
  }

  toggle(): void {
    if (this._isOpenState) this.close('programmatic');
    else void this.open();
  }

  isOpen(): boolean {
    return this._isOpenState;
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

    this._teardownEscapeListener();
    this._teardownOutsideClickListener();
    this._teardownShellEventReemit();

    this._surface?.destroy();
    this._surface = null;

    this.shell.destroy();

    if (this._host.parentNode) {
      this._host.parentNode.removeChild(this._host);
    }

    if (this._options.className) {
      this._markerEl.classList.remove(this._options.className);
    }
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
      mask: this._mask.hasMask
        ? {
            closeOnClick: this._mask.closeOnClick,
            onOutside: () => this._handleMaskOutside(),
            className: 'arvo-drw__overlay-mask',
          }
        : undefined,
      managesOwnFocus: true,
      managesOwnBackdrop: true,
      lockScroll: this._lockScrollResolved,
      transition: 'fade',
      transitionDuration: this._options.animationDuration ?? 200,
      closeOnOutside: false,
      triggerAria: false,
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
   */
  private _handleClose(
    reason: ArvoDrawerCloseReason,
    opts: { fromEngine: boolean },
  ): void {
    if (this._destroyed) return;
    if (!this._isOpenState) return;

    if (!opts.fromEngine) {
      if (this._options.onClose?.(reason) === false) return;
    } else {
      this._options.onClose?.(reason);
    }

    this._isOpenState = false;

    this._paneEl.dispatchEvent(
      new CustomEvent('drw:close', {
        detail: { reason },
        bubbles: true,
        cancelable: !opts.fromEngine,
      }),
    );

    this._teardownEscapeListener();
    this._teardownOutsideClickListener();

    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    this._applyAria();
    this._options.onOpenChange?.(false);
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
    this._teardownEscapeListener();
    this._teardownOutsideClickListener();
    this._applyAria();
    this._options.onOpenChange?.(false);
  }

  /** Mask `onOutside` callback -- dispatches `drw:mask-click` then closes. */
  private _handleMaskOutside(): void {
    this._paneEl.dispatchEvent(
      new CustomEvent('drw:mask-click', { bubbles: true }),
    );
    this._handleClose('mask-click', { fromEngine: true });
  }

  // -------------------------------------------------------------------------
  // Private -- DOM
  // -------------------------------------------------------------------------

  private _applyClasses(): void {
    HOST_CLASSES.forEach((c) => this._host.classList.remove(c));
    this._host.classList.add('arvo-drw');
    this._host.classList.add(`arvo-drw--side-${this._side}`);
    if (this._mask.hasMask) {
      this._host.classList.add('arvo-drw--with-mask');
    }
    if (this._isLoading) this._host.classList.add('loading');
    if (this._isDisabled) this._host.classList.add('is-disabled');
    if (this._options.className) {
      this._host.classList.add(this._options.className);
    }
  }

  private _applyStyleVars(): void {
    const w = toCssLength(this._options.width ?? 320);
    const minW = toCssLength(this._options.minWidth ?? 280);
    const maxW = toCssLength(this._options.maxWidth ?? '80vw');
    const h = toCssLength(this._options.height);
    if (w) this._host.style.setProperty('--arvo-drw-width', w);
    if (minW) this._host.style.setProperty('--arvo-drw-min-width', minW);
    if (maxW) this._host.style.setProperty('--arvo-drw-max-width', maxW);
    if (h) this._host.style.setProperty('--arvo-drw-height', h);
    if (this._options.animationDuration) {
      this._host.style.setProperty(
        '--arvo-drw-slide-duration',
        `${this._options.animationDuration}ms`,
      );
    }
  }

  private _applyAria(): void {
    this._paneEl.setAttribute('role', 'dialog');
    this._paneEl.setAttribute(
      'aria-modal',
      this._mask.hasMask ? 'true' : 'false',
    );
    if (!this._isOpenState) {
      this._paneEl.setAttribute('aria-hidden', 'true');
    } else {
      this._paneEl.removeAttribute('aria-hidden');
    }
    if (this._options.ariaLabel && !this._options.title) {
      this._paneEl.setAttribute('aria-label', this._options.ariaLabel);
    }
    if (this._options.ariaLabelledBy) {
      this._paneEl.setAttribute(
        'aria-labelledby',
        this._options.ariaLabelledBy,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Private -- component-owned Escape listener (capture-phase)
  // -------------------------------------------------------------------------

  private _setupEscapeListener(): void {
    if (this._escapeListener) return;
    this._escapeListener = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!this._isOpenState) return;
      e.stopPropagation();
      this._handleClose('escape', { fromEngine: true });
    };
    document.addEventListener('keydown', this._escapeListener, true);
  }

  private _teardownEscapeListener(): void {
    if (this._escapeListener) {
      document.removeEventListener('keydown', this._escapeListener, true);
      this._escapeListener = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private -- component-owned outside-click listener (mask-less mode)
  // -------------------------------------------------------------------------

  private _setupOutsideClickListener(): void {
    if (this._outsideClickListener) return;
    this._outsideClickListener = (e: PointerEvent) => {
      if (!this._isOpenState) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (this._host.contains(target)) return;
      this._paneEl.dispatchEvent(
        new CustomEvent('drw:mask-click', { bubbles: true }),
      );
      this._handleClose('mask-click', { fromEngine: true });
    };
    document.addEventListener('pointerdown', this._outsideClickListener, true);
  }

  private _teardownOutsideClickListener(): void {
    if (this._outsideClickListener) {
      document.removeEventListener(
        'pointerdown',
        this._outsideClickListener,
        true,
      );
      this._outsideClickListener = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private -- shell event re-emit (prefix drw:*)
  // -------------------------------------------------------------------------

  private _wireShellEventReemit(): void {
    const map: Record<string, string> = {
      back: 'drw:back',
      action: 'drw:action',
      'tab-select': 'drw:tab-select',
      search: 'drw:search',
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

export default ArvoDrawer;
