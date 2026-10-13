import { createFocusTrap, type FocusTrap } from '../focus';
import { createBackdropManager, type BackdropManager } from './backdrop';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OverlayConfig {
  containerSelector: string;
  positionMode: 'viewport' | 'container';
  zIndexBase: number;
  autoCloseOnRouteChange: boolean;
  autoCloseOnOutsideClick: boolean;
  maxStack: number;
  /**
   * When true the hub does NOT create/activate its own focus trap for a
   * modal-type entry. The component manages its own focus trap (e.g.
   * AlertDialog, Drawer, SidePanel trap their inner pane with bespoke
   * initial-focus / focus-restore behavior). Avoids the double-trap that
   * results when both the hub and the component trap the same surface.
   */
  managesOwnFocus?: boolean;
  /**
   * When true the hub does NOT paint its own `.arvo-backdrop` scrim for a
   * modal-type entry. The component renders its own mask via
   * `@arvo/core/mask` and positions it relative to the hub-assigned
   * z-index. Keeps a single scrim per overlay.
   */
  managesOwnBackdrop?: boolean;
  onOpen?: (id: string) => void;
  onClose?: (id: string) => void;
  onStackChange?: (stack: string[]) => void;
}

export type OverlayType =
  | 'tooltip'
  | 'popover'
  | 'dropdown'
  | 'modal'
  | 'side-panel'
  | 'action-menu'
  | 'toast';

export type OverlayRelation = 'submenu' | 'inline';

export interface OverlayEntry {
  id: string;
  type: OverlayType;
  element: HTMLElement;
  triggerElement?: HTMLElement;
  priority: number;
  config: Partial<OverlayConfig>;
  onClose?: () => void;
  /** Parent overlay id when this entry is a nested submenu or inline child. */
  parentId?: string;
  /** Relationship to the parent overlay entry. */
  relation?: OverlayRelation;
  /**
   * Per-overlay z-index override. When set, the hub uses this value INSTEAD
   * of the computed `zIndexBase + stackIndex * 10`, but still clamps to
   * `parent.z + 10` (when a parent exists) to preserve tree-aware stacking.
   * Use cases: consumer apps with deep stacking contexts (e.g. embedded
   * inside a 3rd-party shell). Prefer `overlayHub.configure({ zIndexBase })`
   * for app-wide tuning; reach for this override only when a specific
   * surface needs to escape a higher stacking context than the rest of the
   * app.
   */
  zIndex?: number;
  /**
   * Optional component-owned mask/backdrop element. When attached (via
   * `attachMaskElement`), the hub keeps the mask's z-index pinned to
   * `surface.z - 1` on every stack change, so opening or closing a sibling
   * overlay never strands the mask at a stale z-index relative to its own
   * pane. Components that mount their own mask (Drawer, AlertDialog, Panel)
   * register the element here after `createMask().show()`.
   */
  maskElement?: HTMLElement;
  /**
   * Optional component-owned wrapper element that visually contains the
   * surface (the `element`) and creates a stacking context around it. When
   * attached (via `attachWrapperElement`), the hub keeps the wrapper's
   * z-index pinned to the SAME value as `entry.element` on every stack
   * change, so the wrapper's stacking context floats up to the hub-assigned
   * layer instead of trapping the surface beneath a default fallback
   * (e.g. `--arvo-z-popover: 1000`) inside its own context.
   *
   * Used by composing overlays that paint a viewport-spanning host wrapper
   * around their dialog/panel: `ArvoWindow`, `ArvoAlertDialog`. Without
   * this, the wrapper's CSS-declared z-index would establish a stacking
   * context that confines the panel even though the hub raised the panel's
   * z-index to a much higher consumer-configured base.
   */
  wrapperElement?: HTMLElement;
}

export interface OverlayHub {
  configure(config: Partial<OverlayConfig>): void;
  getConfig(): OverlayConfig;

  open(entry: OverlayEntry): void;
  close(id: string): void;
  closeAll(options?: { except?: string[] }): void;
  closeByType(type: OverlayEntry['type']): void;

  isOpen(id: string): boolean;
  getActive(): OverlayEntry[];
  getTopmost(): OverlayEntry | null;

  getContainer(): HTMLElement;
  getZIndex(id: string): number;

  /**
   * Attach a component-owned mask element to an open entry so the hub
   * keeps the mask z-index synced (`surface.z - 1`) across subsequent
   * stack changes. Idempotent. No-ops when the entry is not in the stack.
   * Pass `null` to detach.
   */
  attachMaskElement(id: string, element: HTMLElement | null): void;

  /**
   * Attach a component-owned wrapper element to an open entry so the hub
   * keeps the wrapper's z-index synced (`surface.z`, i.e. the SAME value
   * as `entry.element`) across subsequent stack changes. Idempotent.
   * No-ops when the entry is not in the stack. Pass `null` to detach.
   *
   * Use this when an overlay component paints a viewport-spanning host
   * wrapper around its surface (e.g. `ArvoWindow`, `ArvoAlertDialog`'s
   * `__panel` lives inside an outer flex-centered `.arvo-win` /
   * `.arvo-alert-dlg` root). The wrapper would otherwise establish a
   * stacking context from its SCSS-declared fallback z-index and trap
   * the hub-assigned panel z-index INSIDE that context -- causing the
   * surface to appear visually below sibling overlays that share the
   * document.body stacking context.
   */
  attachWrapperElement(id: string, element: HTMLElement | null): void;

  /**
   * Returns true when `target` should be treated as "inside" the given
   * root element for outside-click / outside-focus dismissal purposes.
   * The check includes:
   *
   *   1. The root element itself (`root.contains(target)`).
   *   2. Any currently-open overlay whose `triggerElement` is a DOM
   *      descendant of `root` -- the overlay is logically nested even
   *      when its panel is portaled elsewhere in the document (e.g. a
   *      dropdown menu opened from a popover header whose menu element
   *      is appended to `<body>`).
   *   3. Transitively, descendants of those nested overlays.
   *
   * Use this in any overlay-like surface's outside-click handler
   * (popover, drawer, side panel, picker, dialog) so that a click in a
   * portaled child overlay does NOT close the parent overlay.
   *
   * Returns `false` when `root` or `target` is null/undefined.
   */
  isOverlayClickInside(
    root: HTMLElement | null | undefined,
    target: Node | null | undefined,
  ): boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: OverlayConfig = {
  containerSelector: 'body',
  positionMode: 'viewport',
  zIndexBase: 1000,
  autoCloseOnRouteChange: true,
  autoCloseOnOutsideClick: true,
  maxStack: 0,
};

const MODAL_TYPES: ReadonlySet<OverlayType> = new Set([
  'modal',
  'side-panel',
]);

// Overlay types that are displaced when a modal/side-panel opens.
const DISPLACED_BY_MODAL: ReadonlySet<OverlayType> = new Set([
  'dropdown',
  'popover',
  'action-menu',
]);

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOverlayHub(): OverlayHub {
  let _config: OverlayConfig = { ...DEFAULT_CONFIG };

  // Stack in open-order (index 0 = oldest, last = topmost).
  const _stack: OverlayEntry[] = [];

  // Per-overlay internal state keyed by id.
  const _traps = new Map<string, FocusTrap>();
  const _zIndices = new Map<string, number>();

  // Backdrop
  const _backdrop: BackdropManager = createBackdropManager();

  // Global listener handles
  let _onMouseDown: ((e: MouseEvent) => void) | null = null;
  let _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  let _onPopState: (() => void) | null = null;

  // ------- helpers -------

  function zIndexFor(stackIndex: number): number {
    return _config.zIndexBase + stackIndex * 10;
  }

  function isDismissable(entry: OverlayEntry): boolean {
    return (
      (entry.config.autoCloseOnOutsideClick ??
        _config.autoCloseOnOutsideClick) !== false
    );
  }

  // Root-level z-index priority by type. Children always sit above their
  // parent regardless of root priority -- this only orders independent
  // overlay trees relative to one another.
  //   tooltip > toast > everything else (open-order).
  // Matches the band guidance in architecture/03-SHARED-CORE-LAYER.md
  // (tooltips topmost; toasts above non-tooltip overlays).
  function rootStackPriority(type: OverlayType): number {
    switch (type) {
      case 'tooltip':
        return 2;
      case 'toast':
        return 1;
      default:
        return 0;
    }
  }

  // Build a flattened ordering of `_stack` where each tree's root is sorted
  // by (rootStackPriority, originalIndex), and within each tree children
  // are emitted parent-before-children in original-open-order. Children
  // therefore always receive a higher z-index than their parent for any
  // type combination (tooltip-on-toast, popover-in-modal, menu-in-popover,
  // etc.). Cycle-safe via a visited set.
  function flattenForStacking(): OverlayEntry[] {
    if (_stack.length === 0) return [];

    const indexById = new Map<string, number>();
    for (let i = 0; i < _stack.length; i++) indexById.set(_stack[i].id, i);

    const childrenByParent = new Map<string, OverlayEntry[]>();
    const roots: OverlayEntry[] = [];
    for (const e of _stack) {
      const parent =
        e.parentId && indexById.has(e.parentId) ? e.parentId : undefined;
      if (parent) {
        const list = childrenByParent.get(parent);
        if (list) list.push(e);
        else childrenByParent.set(parent, [e]);
      } else {
        roots.push(e);
      }
    }

    // Stable sort by rootStackPriority then original open-order.
    roots.sort((a, b) => {
      const pa = rootStackPriority(a.type);
      const pb = rootStackPriority(b.type);
      if (pa !== pb) return pa - pb;
      return (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0);
    });

    const out: OverlayEntry[] = [];
    const visited = new Set<string>();

    function emit(entry: OverlayEntry): void {
      if (visited.has(entry.id)) return;
      visited.add(entry.id);
      out.push(entry);
      const kids = childrenByParent.get(entry.id);
      if (!kids || kids.length === 0) return;
      // Children in original-open-order: later opens stack higher.
      kids.sort(
        (a, b) =>
          (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0),
      );
      for (const child of kids) emit(child);
    }

    for (const root of roots) emit(root);

    // Defensive: any entries that weren't reached (e.g. cyclic parentId
    // chain) get appended in original order so they still receive a
    // z-index.
    if (out.length < _stack.length) {
      for (const e of _stack) if (!visited.has(e.id)) emit(e);
    }

    return out;
  }

  function refreshZIndices(): void {
    const ordered = flattenForStacking();
    // Track each entry's parent z so a per-entry override still clamps to
    // `parent.z + 10` (children always above their parent).
    const idToZ = new Map<string, number>();

    for (let i = 0; i < ordered.length; i++) {
      const entry = ordered[i];
      const computed = zIndexFor(i);
      let z = computed;
      // Per-entry override: prefer the explicit value, but clamp to keep
      // tree-aware stacking intact (a nested submenu must still sit above
      // its parent overlay).
      if (typeof entry.zIndex === 'number') {
        z = entry.zIndex;
        if (entry.parentId) {
          const parentZ = idToZ.get(entry.parentId);
          if (parentZ != null && z <= parentZ) {
            z = parentZ + 10;
          }
        }
      }
      idToZ.set(entry.id, z);
      _zIndices.set(entry.id, z);
      entry.element.style.zIndex = String(z);
      // Keep any attached component-owned wrapper pinned to `z` (the same
      // layer as `entry.element`) so the wrapper's stacking context floats
      // up with the surface as siblings open / close. Without this, a
      // component (e.g. ArvoWindow) whose panel is registered as the
      // surface would have its outer wrapper trapped at its SCSS fallback
      // z-index, hiding the panel underneath sibling overlays.
      if (entry.wrapperElement) {
        entry.wrapperElement.style.zIndex = String(z);
      }
      // Keep any attached component-owned mask pinned to `z - 1` so a
      // sibling overlay opening/closing never strands the mask at a stale
      // z-index relative to its own pane.
      if (entry.maskElement) {
        entry.maskElement.style.zIndex = String(z - 1);
      }
    }
  }

  function stackIds(): string[] {
    return _stack.map((e) => e.id);
  }

  // ------- backdrop -------

  function syncBackdrop(): void {
    const topModal = findTopmostModal();
    if (!topModal) {
      _backdrop.hide();
      return;
    }

    const container = hub.getContainer();
    const z = _zIndices.get(topModal.id) ?? _config.zIndexBase;

    if (!_backdrop.isVisible()) {
      _backdrop.show({
        opacity: 0.5,
        closeOnClick: isDismissable(topModal),
        animated: false,
        container,
      });
    }

    const el = _backdrop.getElement();
    if (el) el.style.zIndex = String(z - 1);
  }

  function findTopmostModal(): OverlayEntry | undefined {
    // Only consider modal-type entries that rely on the hub for their
    // backdrop. Entries that paint their own mask (managesOwnBackdrop) are
    // skipped so the hub doesn't render a duplicate scrim behind them.
    for (let i = _stack.length - 1; i >= 0; i--) {
      const entry = _stack[i];
      if (MODAL_TYPES.has(entry.type) && !entry.config.managesOwnBackdrop) {
        return entry;
      }
    }
    return undefined;
  }

  // ------- global listeners -------

  function attachGlobal(): void {
    if (_onMouseDown) return;

    _onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // Walk from top down, collecting the contiguous run of overlays whose
      // element + trigger don't contain the click and are dismissable. This
      // ensures a click outside the entire ActionMenu tree closes ALL
      // submenus + the root menu in one gesture.
      //
      // Stop at the first entry that:
      //   - contains the click in its element OR trigger (user is interacting
      //     with it; keep it open and anything below it), OR
      //   - has a nested child overlay whose panel contains the click
      //     (e.g. an action menu opened from inside a popover header --
      //     the menu is portaled to <body> so DOM containment alone is
      //     not enough; we treat the click as "inside" the parent),
      //   - is non-dismissable (blocks dismissal of itself and everything
      //     below it).
      const toClose: string[] = [];
      for (let i = _stack.length - 1; i >= 0; i--) {
        const entry = _stack[i];
        if (entry.element.contains(target)) break;
        if (entry.triggerElement?.contains(target)) break;
        if (hub.isOverlayClickInside(entry.element, target)) break;
        if (!isDismissable(entry)) break;
        toClose.push(entry.id);
      }
      for (const id of toClose) hub.close(id);
    };
    document.addEventListener('mousedown', _onMouseDown);

    _onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || _stack.length === 0) return;
      for (let i = _stack.length - 1; i >= 0; i--) {
        const entry = _stack[i];
        if (isDismissable(entry)) {
          event.preventDefault();
          hub.close(entry.id);
          return;
        }
        return;
      }
    };
    document.addEventListener('keydown', _onKeyDown);

    _onPopState = () => {
      if (_config.autoCloseOnRouteChange) {
        hub.closeAll();
      }
    };
    window.addEventListener('popstate', _onPopState);
  }

  function detachGlobal(): void {
    if (_onMouseDown) {
      document.removeEventListener('mousedown', _onMouseDown);
      _onMouseDown = null;
    }
    if (_onKeyDown) {
      document.removeEventListener('keydown', _onKeyDown);
      _onKeyDown = null;
    }
    if (_onPopState) {
      window.removeEventListener('popstate', _onPopState);
      _onPopState = null;
    }
  }

  // ------- stacking rules -------

  function findEntryById(id: string): OverlayEntry | undefined {
    return _stack.find((e) => e.id === id);
  }

  // Walk `descendant`'s parentId chain. Returns true when
  // `potentialAncestor` appears anywhere on that chain (inclusive).
  // Type-agnostic so it handles cross-type sandwiches like
  // menu -> popover -> menu without breaking the chain at the popover.
  // Cycle-safe via a visited set.
  function isAncestorChainOf(
    potentialAncestor: OverlayEntry,
    descendant: OverlayEntry,
  ): boolean {
    let current: OverlayEntry | undefined = descendant;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      if (current.id === potentialAncestor.id) return true;
      seen.add(current.id);
      if (!current.parentId) return false;
      current = findEntryById(current.parentId);
    }
    return false;
  }

  // When a new overlay registers without an explicit `parentId`, infer it
  // from `triggerElement` DOM ancestry: walk up from the trigger and
  // return the id of the innermost open overlay whose `element` contains
  // it. This catches composed overlays where a child component never
  // forwards a parent surface id (e.g. an internal ActionMenu inside
  // DropdownIconButton inside a parent ActionMenu, or a tooltip whose
  // anchor lives inside a Toast).
  function findParentOverlayByTrigger(
    trigger: HTMLElement | undefined,
    excludeId: string,
  ): string | undefined {
    if (!trigger) return undefined;
    let node: HTMLElement | null = trigger;
    // Walk strictly upward. Each level checks every open overlay;
    // because we go innermost-out the first match is the closest
    // ancestor overlay.
    while (node) {
      for (const e of _stack) {
        if (e.id === excludeId) continue;
        if (e.element === node) return e.id;
      }
      node = node.parentElement;
    }
    return undefined;
  }

  function applyStackingRules(entry: OverlayEntry): void {
    if (MODAL_TYPES.has(entry.type)) {
      const ids = _stack
        .filter((e) => DISPLACED_BY_MODAL.has(e.type))
        .map((e) => e.id);
      for (const id of ids) hub.close(id);
    }

    if (entry.type === 'action-menu') {
      // Close OTHER root action-menu trees, but keep any action-menu
      // that is part of the new entry's ancestor chain. Type-agnostic
      // ancestor walk handles "menu inside popover inside menu" too.
      const ids = _stack
        .filter(
          (e) =>
            e.type === 'action-menu' &&
            e.id !== entry.id &&
            !isAncestorChainOf(e, entry),
        )
        .map((e) => e.id);

      for (const id of ids) hub.close(id);
    }
  }

  // ------- hub -------

  const hub: OverlayHub = {
    configure(config: Partial<OverlayConfig>): void {
      _config = { ..._config, ...config };
    },

    getConfig(): OverlayConfig {
      return { ..._config };
    },

    open(entry: OverlayEntry): void {
      if (hub.isOpen(entry.id)) hub.close(entry.id);

      // Infer parent from trigger DOM ancestry when the caller did not
      // pass one explicitly. Explicit `parentId` always wins so existing
      // submenu wiring (action-menu / context-menu) is unaffected.
      if (!entry.parentId) {
        const inferred = findParentOverlayByTrigger(
          entry.triggerElement,
          entry.id,
        );
        if (inferred) entry.parentId = inferred;
      }

      applyStackingRules(entry);

      if (_config.maxStack > 0 && _stack.length >= _config.maxStack) {
        hub.close(_stack[0].id);
      }

      _stack.push(entry);

      if (_stack.length === 1) attachGlobal();

      refreshZIndices();

      // Focus trap for modal-type overlays. Skipped when the entry opts to
      // manage its own focus (component owns the trap with bespoke behavior).
      if (MODAL_TYPES.has(entry.type) && !entry.config.managesOwnFocus) {
        const trap = createFocusTrap();
        trap.activate({
          container: entry.element,
          initialFocus: 'first',
          returnFocusOnDeactivate: true,
          escapeDeactivates: false,
          allowOutsideClick: true,
        });
        _traps.set(entry.id, trap);
      }

      syncBackdrop();

      _config.onOpen?.(entry.id);
      _config.onStackChange?.(stackIds());
    },

    close(id: string): void {
      const idx = _stack.findIndex((e) => e.id === id);
      if (idx === -1) return;

      const entry = _stack[idx];
      _stack.splice(idx, 1);

      // Focus trap cleanup
      const trap = _traps.get(id);
      if (trap) {
        trap.deactivate();
        _traps.delete(id);
      }

      _zIndices.delete(id);
      refreshZIndices();

      if (_stack.length === 0) detachGlobal();

      syncBackdrop();

      entry.onClose?.();
      _config.onClose?.(id);
      _config.onStackChange?.(stackIds());
    },

    closeAll(options?: { except?: string[] }): void {
      const except = new Set(options?.except ?? []);
      const ids = _stack
        .filter((e) => !except.has(e.id))
        .map((e) => e.id)
        .reverse();
      for (const id of ids) hub.close(id);
    },

    closeByType(type: OverlayEntry['type']): void {
      const ids = _stack
        .filter((e) => e.type === type)
        .map((e) => e.id)
        .reverse();
      for (const id of ids) hub.close(id);
    },

    isOpen(id: string): boolean {
      return _stack.some((e) => e.id === id);
    },

    getActive(): OverlayEntry[] {
      return [..._stack];
    },

    getTopmost(): OverlayEntry | null {
      return _stack.length > 0 ? _stack[_stack.length - 1] : null;
    },

    getContainer(): HTMLElement {
      return (
        (document.querySelector(
          _config.containerSelector,
        ) as HTMLElement) ?? document.body
      );
    },

    getZIndex(id: string): number {
      return _zIndices.get(id) ?? _config.zIndexBase;
    },

    attachMaskElement(id: string, element: HTMLElement | null): void {
      const entry = findEntryById(id);
      if (!entry) return;
      if (element) {
        entry.maskElement = element;
        const z = _zIndices.get(id);
        if (z != null) element.style.zIndex = String(z - 1);
      } else {
        delete entry.maskElement;
      }
    },

    attachWrapperElement(id: string, element: HTMLElement | null): void {
      const entry = findEntryById(id);
      if (!entry) return;
      if (element) {
        entry.wrapperElement = element;
        const z = _zIndices.get(id);
        if (z != null) element.style.zIndex = String(z);
      } else {
        // Clear any inline z-index we painted so the SCSS-declared fallback
        // (e.g. `--arvo-z-popover`) takes effect again. The component is
        // free to remove the wrapper from the DOM after this; we leave the
        // attribute clean either way.
        if (entry.wrapperElement) {
          entry.wrapperElement.style.removeProperty('z-index');
        }
        delete entry.wrapperElement;
      }
    },

    isOverlayClickInside(
      root: HTMLElement | null | undefined,
      target: Node | null | undefined,
    ): boolean {
      if (!root || !target) return false;
      if (root.contains(target)) return true;

      // Walk the descendant overlay tree: any open overlay whose trigger
      // element is inside `root` (or inside a previously-visited
      // descendant overlay's element) is treated as nested. A click in
      // its panel or trigger therefore counts as "inside" the parent.
      // Use a Set keyed by element identity so the same node isn't
      // visited twice even if the same element is registered multiple
      // times across replacements.
      const visited = new Set<HTMLElement>();
      const queue: HTMLElement[] = [root];
      visited.add(root);

      while (queue.length > 0) {
        const node = queue.shift() as HTMLElement;
        for (const other of _stack) {
          if (visited.has(other.element)) continue;
          const trig = other.triggerElement;
          if (!trig) continue;
          if (!node.contains(trig)) continue;
          // `other` is a nested overlay of `node`.
          visited.add(other.element);
          if (other.element.contains(target)) return true;
          if (trig.contains(target)) return true;
          queue.push(other.element);
        }
      }
      return false;
    },
  };

  return hub;
}

export const overlayHub: OverlayHub = createOverlayHub();
