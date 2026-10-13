import {
  createContextMenuController,
  createOverlaySurface,
  type ContextMenuAnchor,
  type ContextMenuController,
  type ContextMenuModality,
  type ContextMenuRequest,
  type OverlaySurface,
  type Placement,
} from '@arvo/core';
import {
  createMenuContent,
  type ContextMenuItem,
  type ContextMenuItemGroup,
  type ContextMenuItems,
  type MenuContent,
  type MenuSubmenuController,
} from '../../internal/menu';
import { ArvoEmptyState, type ArvoEmptyStateOptions } from '../EmptyState/EmptyState';

// ---------------------------------------------------------------------------
// ArvoContextMenu (vanilla JS)
//
// Mirror of the React ArvoContextMenu component. Binds the framework-agnostic
// context-menu controller on a target element, opens a menu surface
// (createOverlaySurface, type='action-menu', priority=15) at the request's
// anchor, and renders the lean menu body via the shared `createMenuContent`
// primitive in packages/js/src/internal/menu.
//
// Public surface mirrors the React component's props (without triggerRef /
// className) and exposes the matching imperative methods + custom events
// (context-menu:request, context-menu:open, context-menu:close,
// context-menu:select).
// ---------------------------------------------------------------------------

export type ArvoContextMenuItem<TContext = unknown> = ContextMenuItem<TContext>;
export type ArvoContextMenuItemGroup<TContext = unknown> =
  ContextMenuItemGroup<TContext>;
export type ArvoContextMenuItems<TContext = unknown> = ContextMenuItems<TContext>;
export type ArvoContextMenuAnchor = ContextMenuAnchor;
export type ArvoContextMenuModality = ContextMenuModality;
export type ArvoContextMenuRequest<TContext = unknown> =
  ContextMenuRequest<TContext>;

/**
 * Curated empty-state surface for ArvoContextMenu. When provided AND the
 * resolved items list is empty, the menu opens with an `ArvoEmptyState`
 * block instead of declining the gesture. Without `emptyConfig`, an empty
 * items array preserves the browser's native context menu (per spec
 * section 6.3). Mirrors React's `ArvoContextMenuEmptyConfig`.
 */
export type ArvoContextMenuEmptyConfig = Pick<
  ArvoEmptyStateOptions,
  'illustration' | 'title' | 'message' | 'secondaryAction'
>;

export interface ArvoContextMenuSelectInfo<TContext = unknown> {
  item: ArvoContextMenuItem<TContext>;
  index: number;
  context: TContext;
  closeOnSelect: boolean;
}

export interface ArvoContextMenuOptions<TContext = unknown> {
  items:
    | ArvoContextMenuItems<TContext>
    | ((context: TContext) => ArvoContextMenuItems<TContext>);
  contextSelector?: string;
  resolveContext?: (invoker: HTMLElement) => TContext;
  placement?: Placement;
  submenuTrigger?: 'hover' | 'click';
  closeOnSelect?: boolean;
  isDisabled?: boolean;
  longPressMs?: number;
  keyboard?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /**
   * Curated empty-state config. When set AND the resolved items array is
   * empty, the menu opens with an `ArvoEmptyState` block instead of
   * declining the gesture. Without `emptyConfig`, an empty items array
   * preserves the browser's native context menu.
   */
  emptyConfig?: Partial<ArvoContextMenuEmptyConfig>;
  onContextRequest?: (request: ArvoContextMenuRequest<TContext>) => boolean | void;
  onOpen?: (request: ArvoContextMenuRequest<TContext>) => boolean | void;
  onClose?: () => boolean | void;
  onSelect?: (info: ArvoContextMenuSelectInfo<TContext>) => void;
  onOpenChange?: (open: boolean) => void;
}

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `arvo-context-menu-${_idCounter}`;
}

export class ArvoContextMenu<TContext = unknown> {
  private _target: HTMLElement;
  private _options: ArvoContextMenuOptions<TContext>;
  private _controller: ContextMenuController | null = null;
  private _surface: OverlaySurface | null = null;
  private _menuContent: MenuContent | null = null;
  private _emptyStateInstance: ArvoEmptyState | null = null;
  private _scrollEl: HTMLDivElement | null = null;
  private _panelEl: HTMLDivElement | null = null;
  private _panelId: string;
  private _activeRequest: ArvoContextMenuRequest<TContext> | null = null;
  private _resolvedItems: ArvoContextMenuItems<TContext> | null = null;
  /**
   * Used to differentiate programmatic close paths (which fire the
   * cancellable `context-menu:close` event + onClose callback) from
   * engine-driven dismissal (outside-click, hub Escape) which is silent.
   * Mirrors ArvoActionMenu's dismissal-source pattern.
   */
  private _closeSource: 'programmatic' | null = null;
  private _disabledLocal: boolean;
  /**
   * Window-capture pointerdown / mousedown listener that swallows
   * right-clicks inside the target while the menu is open. See
   * `_bindReanchorSuppressor` for the full rationale.
   */
  private _reanchorSuppressor:
    | ((e: MouseEvent | PointerEvent) => void)
    | null = null;

  static initialize<TCtx = unknown>(
    element: HTMLElement,
    options: ArvoContextMenuOptions<TCtx>,
  ): ArvoContextMenu<TCtx> {
    return new ArvoContextMenu<TCtx>(element, options);
  }

  constructor(target: HTMLElement, options: ArvoContextMenuOptions<TContext>) {
    if (!target) throw new Error('ArvoContextMenu: target element is required');
    if (options == null || options.items == null) {
      throw new Error('ArvoContextMenu: `items` option is required');
    }
    this._target = target;
    this._options = options;
    this._panelId = nextId();
    this._disabledLocal = options.isDisabled === true;

    this._bindController();
  }

  // -- Public API --------------------------------------------------------

  open(
    init?:
      | ArvoContextMenuRequest<TContext>
      | {
          anchor: ArvoContextMenuAnchor;
          invoker?: HTMLElement;
          context?: TContext;
          modality?: ArvoContextMenuModality;
          originalEvent?: MouseEvent | KeyboardEvent | TouchEvent;
        },
  ): void {
    if (this._disabledLocal) return;
    const request = this._normalizeRequest(init);
    this._openWithRequest(request);
  }

  close(): void {
    if (!this._surface || !this._surface.isOpen()) return;
    this._closeSource = 'programmatic';
    if (this._options.onClose?.() === false) {
      this._closeSource = null;
      return;
    }
    if (!this._dispatch('context-menu:close', {}, true)) {
      this._closeSource = null;
      return;
    }
    void this._surface.close();
  }

  isOpen(): boolean {
    return !!this._surface?.isOpen();
  }

  updateItems(
    items:
      | ArvoContextMenuItems<TContext>
      | ((context: TContext) => ArvoContextMenuItems<TContext>),
  ): void {
    this._options = { ...this._options, items };
    if (this.isOpen() && this._activeRequest) {
      const resolved = this._resolveItems(this._activeRequest.context);
      this._resolvedItems = resolved;
      const isEmpty = Array.isArray(resolved) && resolved.length === 0;
      const wasEmpty = !this._menuContent;
      // When transitioning between empty-state mode and items mode we
      // need to rebuild the panel contents from scratch. When we stay in
      // items mode, just hand the new items to the existing MenuContent.
      if (isEmpty !== wasEmpty || isEmpty) {
        this._openSurface(this._activeRequest, resolved);
      } else {
        this._menuContent?.update({
          items: resolved as ContextMenuItems<unknown>,
          context: this._activeRequest.context,
        });
      }
    }
  }

  disabled(state?: boolean): boolean {
    if (state === undefined) return this._disabledLocal;
    this._disabledLocal = state;
    if (state) {
      // Drop existing controller so no more gestures are recognized.
      this._controller?.destroy();
      this._controller = null;
      this._unbindReanchorSuppressor();
      if (this.isOpen()) void this._surface?.close();
    } else if (!this._controller) {
      this._bindController();
    }
    return state;
  }

  destroy(): void {
    this._controller?.destroy();
    this._controller = null;
    this._unbindReanchorSuppressor();
    if (this._surface?.isOpen()) {
      void this._surface.close();
    }
    this._surface?.destroy();
    this._surface = null;
    this._destroyPanelContents();
    if (this._panelEl?.parentNode) {
      this._panelEl.parentNode.removeChild(this._panelEl);
    }
    this._panelEl = null;
  }

  // -- Private internals -------------------------------------------------

  private _bindController(): void {
    this._controller = createContextMenuController<TContext>({
      target: this._target,
      contextSelector: this._options.contextSelector,
      resolveContext: this._options.resolveContext,
      longPressMs: this._options.longPressMs,
      keyboard: this._options.keyboard,
      onRequest: (request, helpers) => {
        if (this._options.onContextRequest?.(request) === false) return false;
        if (!this._dispatch('context-menu:request', { request }, true)) return false;
        const items = this._resolveItems(request.context);
        // Empty resolved list: open with the empty-state block when the
        // consumer provided emptyConfig; otherwise decline so the
        // browser's native context menu surfaces (per spec section 6.3).
        if (
          Array.isArray(items) &&
          items.length === 0 &&
          !this._options.emptyConfig
        ) {
          return false;
        }
        if (this._options.onOpen?.(request) === false) return false;
        if (!this._dispatch('context-menu:open', { request }, true)) return false;
        helpers.preventDefault();
        this._openSurface(request, items);
        return true;
      },
    });
  }

  private _resolveItems(context: TContext): ArvoContextMenuItems<TContext> {
    const it = this._options.items;
    return typeof it === 'function' ? it(context) : it;
  }

  private _normalizeRequest(
    init:
      | ArvoContextMenuRequest<TContext>
      | {
          anchor: ArvoContextMenuAnchor;
          invoker?: HTMLElement;
          context?: TContext;
          modality?: ArvoContextMenuModality;
          originalEvent?: MouseEvent | KeyboardEvent | TouchEvent;
        }
      | undefined,
  ): ArvoContextMenuRequest<TContext> {
    if (init && 'modality' in init && 'context' in init && 'originalEvent' in init) {
      return init as ArvoContextMenuRequest<TContext>;
    }
    const invoker = (init as { invoker?: HTMLElement } | undefined)?.invoker ?? this._target;
    const anchor =
      (init as { anchor?: ArvoContextMenuAnchor } | undefined)?.anchor ??
      ({ kind: 'element', element: invoker } as ArvoContextMenuAnchor);
    const context =
      (init as { context?: TContext } | undefined)?.context ??
      (this._options.resolveContext
        ? this._options.resolveContext(invoker)
        : (null as unknown as TContext));
    return {
      invoker,
      anchor,
      context,
      modality:
        (init as { modality?: ArvoContextMenuModality } | undefined)?.modality ??
        'pointer',
      originalEvent:
        (init as { originalEvent?: MouseEvent | KeyboardEvent | TouchEvent } | undefined)
          ?.originalEvent ?? (new MouseEvent('contextmenu') as MouseEvent),
    };
  }

  private _openWithRequest(request: ArvoContextMenuRequest<TContext>): void {
    if (this._options.onContextRequest?.(request) === false) return;
    if (!this._dispatch('context-menu:request', { request }, true)) return;
    const items = this._resolveItems(request.context);
    // Mirror onRequest: only decline an empty list when no
    // emptyConfig is provided.
    if (
      Array.isArray(items) &&
      items.length === 0 &&
      !this._options.emptyConfig
    ) {
      return;
    }
    if (this._options.onOpen?.(request) === false) return;
    if (!this._dispatch('context-menu:open', { request }, true)) return;
    this._openSurface(request, items);
  }

  private _openSurface(
    request: ArvoContextMenuRequest<TContext>,
    items: ArvoContextMenuItems<TContext>,
  ): void {
    const reanchor = this._surface?.isOpen() ?? false;

    this._activeRequest = request;
    this._resolvedItems = items;

    this._ensurePanel();
    if (!this._panelEl) return;

    const onSelectHandler = (info: {
      item: ArvoContextMenuItem<TContext>;
      index: number;
      context: TContext;
      closeOnSelect: boolean;
    }) => {
      this._dispatch(
        'context-menu:select',
        { item: info.item, index: info.index, context: info.context },
        true,
      );
      this._options.onSelect?.(info);
      if (info.closeOnSelect && (this._options.closeOnSelect ?? true)) {
        // Silent close after selection (matches React behaviour: the
        // close-on-select path is not user-cancellable through onClose).
        this._closeSource = null;
        void this._surface?.close();
      }
    };

    // Rebuild the menu body. We always destroy + recreate because items
    // (and per-item callbacks) come from the new request's context and
    // are not safe to mutate in place.
    this._destroyPanelContents();

    const itemsEmpty = Array.isArray(items) && items.length === 0;
    if (itemsEmpty && this._options.emptyConfig) {
      // Empty-state mode: render an ArvoEmptyState inside the panel
      // instead of the MenuContent primitive. Mirrors React's policy.
      this._renderEmptyState();
    } else {
      this._menuContent = createMenuContent<TContext>({
        items,
        context: request.context,
        surfaceId: this._panelId,
        parentSurfaceId: this._panelId,
        submenuHoverDelayMs: 200,
        hasGroupDividers: true,
        createSubmenuController: (args) => this._buildSubmenuController(args),
        onSelect: onSelectHandler,
        onRequestClose: () => {
          this.close();
        },
      });
      // Mount the menu content into the panel's scroll container.
      this._panelEl.appendChild(this._menuContent.element);
      this._scrollEl = this._menuContent.element as HTMLDivElement;
    }

    // Build surface lazily on first open; reuse afterwards. The anchor and
    // anchorRect can change every open via setAnchorRect / setTrigger.
    if (!this._surface) {
      this._surface = createOverlaySurface({
        id: this._panelId,
        surface: this._panelEl,
        type: 'action-menu',
        priority: 15,
        trigger:
          request.anchor.kind === 'element' ? request.anchor.element : null,
        anchorRect:
          request.anchor.kind === 'point'
            ? { x: request.anchor.x, y: request.anchor.y }
            : null,
        position: {
          placement: this._options.placement ?? 'bottom-start',
          gap: 0,
        },
        focus: {
          mode: 'trap',
          initialFocus: 'first',
        },
        transition: 'fade',
        closeOnOutside: this._options.closeOnOutside ?? true,
        triggerAria: false,
        onClose: () => this._handleSurfaceClosed(),
      });
    } else {
      this._surface.setTrigger(
        request.anchor.kind === 'element' ? request.anchor.element : null,
      );
      this._surface.setAnchorRect(
        request.anchor.kind === 'point'
          ? { x: request.anchor.x, y: request.anchor.y }
          : null,
      );
    }

    if (reanchor) {
      // Surface was already open -- the setTrigger / setAnchorRect calls
      // above repositioned it in place. Skip the open() call (which would
      // run an enter transition on an already-visible panel) and just
      // reposition + refocus.
      this._surface!.reposition();
      this._menuContent?.focus();
      // Fire onOpenChange only when the open state actually transitions.
      return;
    }

    this._bindReanchorSuppressor();
    void this._surface.open().then(() => {
      this._menuContent?.focus();
    });

    this._options.onOpenChange?.(true);
  }

  private _destroyPanelContents(): void {
    if (this._menuContent) {
      this._menuContent.destroy();
      this._menuContent = null;
    }
    this._emptyStateInstance = null;
    if (this._panelEl) {
      while (this._panelEl.firstChild) {
        this._panelEl.removeChild(this._panelEl.firstChild);
      }
    }
    this._scrollEl = null;
  }

  private _renderEmptyState(): void {
    if (!this._panelEl) return;
    const cfg = this._options.emptyConfig ?? {};

    const scroll = document.createElement('div');
    scroll.className = 'arvo-context-menu__scroll';

    const wrapper = document.createElement('div');
    wrapper.className = 'arvo-context-menu__empty';

    const emptyOpts: ArvoEmptyStateOptions = {
      size: 'sm',
      orientation: 'vertical',
      illustration: cfg.illustration ?? 'no-data',
      title: cfg.title ?? 'No options available',
      message:
        cfg.message ?? 'There are no actions to display for this item.',
      secondaryAction: cfg.secondaryAction,
    };

    this._emptyStateInstance = ArvoEmptyState.create(emptyOpts);
    wrapper.appendChild(this._emptyStateInstance.el);
    scroll.appendChild(wrapper);
    this._panelEl.appendChild(scroll);
    this._scrollEl = scroll;
  }

  // Window-capture pointerdown + mousedown listener that swallows
  // right-clicks INSIDE the controller's target while the menu is open.
  //
  // Without this suppressor, the browser dispatches pointerdown ->
  // mousedown -> contextmenu in sequence on a right-click. The overlay
  // hub's outside-click handler (document, mousedown) removes the menu
  // entry; the engine's exit transition begins; the subsequent
  // contextmenu opens a new state but the in-flight exit transition
  // unmounts the panel anyway. The user sees the menu close with no
  // replacement appearing.
  //
  // Window-capture fires BEFORE document-capture and document-bubble
  // listeners (capture flows window -> document -> ... -> target). Calling
  // stopPropagation here prevents both the hub's mousedown handler and
  // useOverlaySurface's pointerdown handler from firing for this gesture.
  // The subsequent contextmenu event re-anchors the existing surface in
  // place via setTrigger / setAnchorRect, with no close/reopen cycle.
  private _bindReanchorSuppressor(): void {
    if (this._reanchorSuppressor) return;
    this._reanchorSuppressor = (e: MouseEvent | PointerEvent) => {
      if (e.button !== 2) return;
      const t = e.target as Node | null;
      if (!t || !this._target.contains(t)) return;
      if (!this._surface?.isOpen()) return;
      e.stopPropagation();
    };
    window.addEventListener('pointerdown', this._reanchorSuppressor, true);
    window.addEventListener('mousedown', this._reanchorSuppressor, true);
  }

  private _unbindReanchorSuppressor(): void {
    if (!this._reanchorSuppressor) return;
    window.removeEventListener('pointerdown', this._reanchorSuppressor, true);
    window.removeEventListener('mousedown', this._reanchorSuppressor, true);
    this._reanchorSuppressor = null;
  }

  private _ensurePanel(): void {
    if (this._panelEl) return;
    const panel = document.createElement('div');
    panel.id = this._panelId;
    panel.className = 'arvo-context-menu';
    panel.setAttribute('role', 'menu');
    if (this._options.ariaLabelledBy) {
      panel.setAttribute('aria-labelledby', this._options.ariaLabelledBy);
    } else {
      panel.setAttribute('aria-label', this._options.ariaLabel ?? 'Context menu');
    }
    // The panel's inner scroll element is owned by either createMenuContent
    // (which builds its own __scroll element) or the empty-state path
    // (which builds its own __scroll wrapper around __empty). Both are
    // appended fresh on every open by `_openSurface`.
    document.body.appendChild(panel);
    this._panelEl = panel;
  }

  private _handleSurfaceClosed(): void {
    // Engine-driven dismissal is silent (outside-click, hub Escape).
    // Programmatic close paths already fired the cancellable event/callback.
    const wasProgrammatic = this._closeSource === 'programmatic';
    this._closeSource = null;

    this._unbindReanchorSuppressor();

    const targetEl = this._activeRequest?.invoker ?? null;
    this._activeRequest = null;

    this._destroyPanelContents();

    this._options.onOpenChange?.(false);

    // Best-effort focus restore for point-anchored gestures (the engine
    // already handles element-anchored returns through setTrigger).
    if (!wasProgrammatic && targetEl) {
      try {
        targetEl.focus({ preventScroll: true });
      } catch {
        // Target may have been removed; ignore.
      }
    }
  }

  private _buildSubmenuController(args: {
    parentItem: ContextMenuItem<TContext> & { submenu: ContextMenuItem<TContext>[] };
    parentRowEl: HTMLElement;
    parentSurfaceId: string;
    context: TContext;
    onSelect: (info: ArvoContextMenuSelectInfo<TContext>) => void;
    onClose: () => void;
  }): MenuSubmenuController<TContext> {
    const submenuPanel = document.createElement('div');
    submenuPanel.className = 'arvo-context-menu';
    submenuPanel.setAttribute('role', 'menu');
    const parentLabel = 'label' in args.parentItem ? args.parentItem.label : 'Submenu';
    submenuPanel.setAttribute('aria-label', parentLabel ?? 'Submenu');
    const scroll = document.createElement('div');
    scroll.className = 'arvo-context-menu__scroll';
    submenuPanel.appendChild(scroll);
    document.body.appendChild(submenuPanel);

    const submenuId = `${args.parentSurfaceId}-sub-${args.parentItem.id}`;
    let submenuContent: MenuContent | null = null;
    let surface: OverlaySurface | null = null;

    const openSurface = () => {
      submenuContent = createMenuContent<TContext>({
        items: args.parentItem.submenu,
        context: args.context,
        surfaceId: submenuId,
        parentSurfaceId: submenuId,
        submenuHoverDelayMs: 200,
        hasGroupDividers: true,
        createSubmenuController: (next) => this._buildSubmenuController(next),
        onSelect: (info) => args.onSelect(info),
        onRequestClose: () => args.onClose(),
      });
      scroll.appendChild(submenuContent.element);
      surface = createOverlaySurface({
        id: submenuId,
        surface: submenuPanel,
        type: 'action-menu',
        priority: 15,
        parentId: args.parentSurfaceId,
        relation: 'submenu',
        trigger: args.parentRowEl,
        position: { placement: 'right-start', gap: 0 },
        focus: { mode: 'trap', initialFocus: 'first' },
        transition: 'fade',
        triggerAria: false,
        onClose: () => {
          if (submenuContent) {
            submenuContent.destroy();
            submenuContent = null;
          }
          while (scroll.firstChild) scroll.removeChild(scroll.firstChild);
          args.onClose();
        },
      });
      void surface.open().then(() => submenuContent?.focus());
    };

    return {
      panelEl: submenuPanel,
      open: () => {
        if (surface?.isOpen()) return;
        openSurface();
      },
      close: () => {
        if (surface?.isOpen()) void surface.close();
      },
      destroy: () => {
        submenuContent?.destroy();
        submenuContent = null;
        surface?.destroy();
        surface = null;
        if (submenuPanel.parentNode) {
          submenuPanel.parentNode.removeChild(submenuPanel);
        }
      },
      isOpen: () => !!surface?.isOpen(),
    };
  }

  private _dispatch(name: string, detail: Record<string, unknown>, cancelable: boolean): boolean {
    const evt = new CustomEvent(name, { bubbles: true, cancelable, detail });
    return this._target.dispatchEvent(evt);
  }
}

export default ArvoContextMenu;
