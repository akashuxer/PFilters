/**
 * ArvoWindow -- vanilla JS implementation.
 *
 * Centered, draggable floating workspace. Unlike Popover, ArvoWindow is NOT
 * anchored to a trigger -- it builds its own DOM, appends to a container on
 * open(), and removes itself on close(). Composes ArvoIconButton, ArvoButton,
 * ArvoDropdownButton, ArvoSplitButton, ArvoDropdownIconButton,
 * ArvoSplitIconButton, ArvoSwitch, ArvoBadge, ArvoStatus, and ArvoEmptyState.
 *
 * Mirrors the React implementation at
 * packages/react/src/components/Window/Window.tsx (descriptor source of truth:
 * descriptors/window.json).
 *
 * Built on the OverlaySurface engine in modal mode with picker-silent
 * dismissal pattern + a new createDragHandle utility for header drag.
 */

import {
  createOverlaySurface,
  createDragHandle,
  resolveOverlayInitialFocus,
  type ArvoInitialFocusTarget,
  type DragHandleInstance,
  type DragOffset,
  type OverlaySurface,
} from '@arvo/core';
import {
  attachOverlayFooterFit,
  type OverlayFooterFitHandle,
} from '@arvo/utils';
import { ArvoButton, type ArvoButtonVariant } from '../Button/Button';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoDropdownButton } from '../DropdownButton/DropdownButton';
import { ArvoSplitButton } from '../SplitButton/SplitButton';
import { ArvoDropdownIconButton } from '../DropdownIconButton/DropdownIconButton';
import { ArvoSplitIconButton } from '../SplitIconButton/SplitIconButton';
import { ArvoSwitch, type ArvoSwitchOptions } from '../Switch/Switch';
import { ArvoBadge, type ArvoBadgeOptions } from '../Badge/Badge';
import { ArvoStatus, type ArvoStatusType } from '../Status/Status';
import {
  ArvoEmptyState,
  type ArvoEmptyStateOptions,
} from '../EmptyState/EmptyState';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoWindowSize = 'sm' | 'md' | 'lg' | 'xl';

export type ArvoWindowCloseReason =
  | 'close-button'
  | 'primary'
  | 'secondary'
  | 'back'
  | 'programmatic';

export type ArvoWindowHeaderActionType =
  | 'icon-button'
  | 'button'
  | 'dropdown-button'
  | 'dropdown-icon-button'
  | 'split-button'
  | 'split-icon-button'
  | 'switch';

export type ArvoWindowHeaderActionVariant = 'tertiary' | 'outline' | 'inline';

interface HeaderActionBase {
  id?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  tooltip?: string;
}

export interface ArvoWindowHeaderIconButtonAction extends HeaderActionBase {
  type: 'icon-button';
  icon: string;
  variant?: 'tertiary' | 'outline';
  onClick?: (e: Event) => void;
}

export interface ArvoWindowHeaderButtonAction extends HeaderActionBase {
  type: 'button';
  label: string;
  icon?: string;
  variant?: ArvoWindowHeaderActionVariant;
  onClick?: (e: Event) => void;
}

export interface ArvoWindowHeaderDropdownButtonAction
  extends HeaderActionBase {
  type: 'dropdown-button';
  label: string;
  icon?: string;
  variant?: 'tertiary' | 'outline';
  // items typed loose here to avoid pulling in the menu type union; the
  // inner component validates.
  items: unknown[];
  onSelect?: (item: unknown, index: number) => boolean | void;
}

export interface ArvoWindowHeaderDropdownIconButtonAction
  extends HeaderActionBase {
  type: 'dropdown-icon-button';
  icon?: string;
  variant?: 'tertiary' | 'outline';
  items: unknown[];
  onSelect?: (item: unknown, index: number) => boolean | void;
}

export interface ArvoWindowHeaderSplitButtonAction extends HeaderActionBase {
  type: 'split-button';
  label: string;
  icon?: string;
  variant?: 'tertiary' | 'outline';
  items: unknown[];
  onPrimaryClick?: (e: Event) => void;
  onSelect?: (item: unknown, index: number) => boolean | void;
}

export interface ArvoWindowHeaderSplitIconButtonAction
  extends HeaderActionBase {
  type: 'split-icon-button';
  icon: string;
  variant?: 'tertiary' | 'outline';
  items: unknown[];
  onPrimaryClick?: (e: Event) => void;
  onSelect?: (item: unknown, index: number) => boolean | void;
}

export interface ArvoWindowHeaderSwitchAction extends HeaderActionBase {
  type: 'switch';
  label?: string;
  isChecked?: boolean;
  defaultChecked?: boolean;
  onChange?: ArvoSwitchOptions['onChange'];
}

export type ArvoWindowHeaderAction =
  | ArvoWindowHeaderIconButtonAction
  | ArvoWindowHeaderButtonAction
  | ArvoWindowHeaderDropdownButtonAction
  | ArvoWindowHeaderDropdownIconButtonAction
  | ArvoWindowHeaderSplitButtonAction
  | ArvoWindowHeaderSplitIconButtonAction
  | ArvoWindowHeaderSwitchAction;

export type ArvoWindowFooterActionType =
  | 'button'
  | 'dropdown-button'
  | 'split-button';

export type ArvoWindowFooterActionSemantic = 'primary' | 'danger-primary';

export interface ArvoWindowFooterAction {
  id?: string;
  type?: ArvoWindowFooterActionType;
  semantic?: ArvoWindowFooterActionSemantic;
  label: string;
  icon?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  /** Default true; return false from onClick to veto the close. */
  closeOnClick?: boolean;
  items?: unknown[];
  onPrimaryClick?: (e: Event) => void | false;
  onClick?: (e: Event) => void | false;
  onSelect?: (item: unknown, index: number) => boolean | void;
}

export type ArvoWindowEmptyContent = Pick<
  ArvoEmptyStateOptions,
  | 'illustration'
  | 'title'
  | 'message'
  | 'primaryAction'
  | 'secondaryAction'
  | 'link'
  | 'isAnimated'
>;

export type ArvoWindowBadgeConfig = Pick<
  ArvoBadgeOptions,
  | 'message'
  | 'semanticType'
  | 'icon'
  | 'hasBadgeIcon'
  | 'appearance'
  | 'tooltip'
>;

export interface ArvoWindowOptions {
  size?: ArvoWindowSize;
  title?: string;
  hasTitle?: boolean;
  hasHeader?: boolean;
  hasFooter?: boolean;
  hasIcon?: boolean;
  icon?: string;
  hasStatusIndicator?: boolean;
  statusType?: ArvoStatusType;
  badge?: ArvoWindowBadgeConfig | null;
  hasBackBtn?: boolean;
  backLabel?: string;
  onBack?: (e: Event) => void;
  closeLabel?: string;
  hasMaximize?: boolean;
  /** Initial maximized state. */
  isMaximized?: boolean;
  onMaximizeChange?: (maximized: boolean) => void;
  isDraggable?: boolean;
  onDragStart?: (e: PointerEvent) => void;
  onDragEnd?: (offset: DragOffset) => void;
  hasBackdrop?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  headerActions?: ArvoWindowHeaderAction[];
  primaryAction?: ArvoWindowFooterAction | null;
  secondaryActions?: ArvoWindowFooterAction[];
  footerLeft?: string | HTMLElement | ((container: HTMLElement) => void);
  stickyHeader?: string | HTMLElement | ((container: HTMLElement) => void);
  isEmptyState?: boolean;
  emptyContent?: ArvoWindowEmptyContent;
  content?: string | HTMLElement | ((container: HTMLElement) => void);
  isLoading?: boolean;
  isDisabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  container?: HTMLElement | string | null;
  /**
   * Initial focus target when the window opens. `'auto'` focuses the first
   * focusable body element, then footer, then header. Pass an HTMLElement or
   * resolver for app-specific focus needs.
   */
  initialFocus?: ArvoInitialFocusTarget | null;
  onOpen?: () => boolean | void;
  onClose?: (detail: { reason: ArvoWindowCloseReason | string }) => boolean | void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_HEADER_ACTIONS = 3;
const MAX_SECONDARY_ACTIONS = 2;

const ALLOWED_HEADER_VARIANTS: ReadonlySet<ArvoWindowHeaderActionVariant> =
  new Set(['tertiary', 'outline', 'inline']);

const HEADER_EXCLUDE_DRAG_SELECTOR = [
  '.arvo-win__back-btn',
  '.arvo-win__max-btn',
  '.arvo-win__close-btn',
  '.arvo-win__header-actions',
  '.arvo-win__status',
  '.arvo-win__badge',
  'button',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const warnedKeys = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (
    typeof process === 'undefined' ||
    process.env?.NODE_ENV === 'production'
  ) {
    return;
  }
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

function clampHeaderActions(
  actions: ArvoWindowHeaderAction[] | undefined,
): ArvoWindowHeaderAction[] {
  if (!actions || actions.length === 0) return [];
  if (actions.length > MAX_HEADER_ACTIONS) {
    warnOnce(
      `win-header-overflow-${actions.length}`,
      `[ArvoWindow] headerActions accepts at most ${MAX_HEADER_ACTIONS} consumer items ` +
        `(Maximize and Close are system-controlled). Extra items are dropped.`,
    );
  }
  return actions.slice(0, MAX_HEADER_ACTIONS);
}

function clampSecondaryActions(
  actions: ArvoWindowFooterAction[] | undefined,
): ArvoWindowFooterAction[] {
  if (!actions || actions.length === 0) return [];
  if (actions.length > MAX_SECONDARY_ACTIONS) {
    warnOnce(
      `win-footer-secondary-overflow-${actions.length}`,
      `[ArvoWindow] secondaryActions accepts at most ${MAX_SECONDARY_ACTIONS} items. Extra items are dropped.`,
    );
  }
  return actions.slice(0, MAX_SECONDARY_ACTIONS);
}

function renderInto(
  container: HTMLElement,
  content: string | HTMLElement | ((el: HTMLElement) => void),
): void {
  container.textContent = '';
  if (typeof content === 'string') {
    container.innerHTML = content;
  } else if (typeof content === 'function') {
    content(container);
  } else if (content instanceof Node) {
    container.appendChild(content);
  }
}

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

interface InnerInstance {
  destroy?: () => void;
}

export class ArvoWindow {
  private _options: ArvoWindowOptions;

  // DOM tree
  private _rootEl: HTMLDivElement | null = null;
  private _panelEl: HTMLDivElement | null = null;
  private _headerEl: HTMLDivElement | null = null;
  private _headerLeftEl: HTMLDivElement | null = null;
  private _headerActionsEl: HTMLDivElement | null = null;
  private _titleEl: HTMLParagraphElement | null = null;
  private _stickyHeaderEl: HTMLDivElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;
  private _footerEl: HTMLDivElement | null = null;
  private _footerLeftEl: HTMLDivElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _footerFit: OverlayFooterFitHandle | null = null;

  // Inner component instances we need to destroy later.
  private _backBtn: ArvoIconButton | null = null;
  private _maxBtn: ArvoIconButton | null = null;
  private _closeBtn: ArvoIconButton | null = null;
  private _badgeInstance: ArvoBadge | null = null;
  private _statusInstance: ArvoStatus | null = null;
  private _headerActionInstances: InnerInstance[] = [];
  private _headerActionWrappers: HTMLElement[] = [];
  private _primaryBtn: InnerInstance | null = null;
  private _secondaryBtns: InnerInstance[] = [];
  private _emptyStateInstance: ArvoEmptyState | null = null;

  // Engine + drag
  private _surface: OverlaySurface | null = null;
  private _drag: DragHandleInstance | null = null;
  private _dragOffset: DragOffset = { x: 0, y: 0 };
  private _preMaximizeOffset: DragOffset | null = null;

  // Lifecycle state
  private _isOpen = false;
  private _isMaximized = false;
  private _isLoading = false;
  private _isDisabled = false;
  private _closingProgrammatically = false;
  private _windowId: string;
  private _titleId: string;
  private _bodyId: string;

  // Escape listener -- bound separately from the engine so we control veto vs
  // silent paths consistently with AlertDialog.
  private _boundHandleKeyDown: (e: KeyboardEvent) => void;

  static initialize(options: ArvoWindowOptions): ArvoWindow {
    return new ArvoWindow(options);
  }

  constructor(options: ArvoWindowOptions) {
    const uid = ++_idCounter;
    this._windowId = `arvo-win-${uid}`;
    this._titleId = `arvo-win-title-${uid}`;
    this._bodyId = `arvo-win-body-${uid}`;

    this._options = this._normalizeOptions(options);
    this._isLoading = (!!this._options.isLoading) === true;
    this._isDisabled = !!this._options.isDisabled;
    this._isMaximized = !!this._options.isMaximized;

    this._boundHandleKeyDown = this._handleKeyDown.bind(this);

    this._validateAccessibleName();
    this._render();
  }

  // -----------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------

  open(): void {
    if (this._isOpen) return;
    if (this._options.onOpen?.() === false) return;
    if (!this._rootEl || !this._panelEl) return;

    this._isOpen = true;
    const container = this._resolveContainer();
    container.appendChild(this._rootEl);
    this._rootEl.classList.add('open');

    if (!this._surface) {
      this._surface = createOverlaySurface({
        id: this._windowId,
        surface: this._panelEl,
        // Pin the outer host's stacking context to the panel's hub-assigned
        // z-index so consumer-level zIndexBase tuning (overlayHub.configure)
        // lifts the WHOLE window above sibling overlays -- not just the
        // inner panel inside a wrapper trapped at the SCSS fallback layer.
        surfaceRoot: this._rootEl,
        type: 'modal',
        priority: 10,
        trigger: null,
        position: false,
        focus: {
          mode: 'trap',
          initialFocus: this._options.initialFocus === 'none'
            ? 'none'
            : () => this._resolveInitialFocus(),
          returnFocus: true,
          activateAfterTransition: true,
        },
        mask: this._options.hasBackdrop !== false
          ? {
              className: 'arvo-win__overlay-mask',
              closeOnClick: this._options.closeOnBackdrop ?? false,
              onOutside: () => this._closeViaEngine(),
            }
          : undefined,
        managesOwnBackdrop: true,
        lockScroll: this._options.hasBackdrop !== false,
        transition: 'scale',
        transitionDuration: 150,
        closeOnOutside: this._options.closeOnBackdrop ?? false,
        triggerAria: false,
        onClose: () => this._handleEngineClose(),
      });
    }

    void this._surface.open();

    if (this._options.closeOnEscape !== false) {
      document.addEventListener('keydown', this._boundHandleKeyDown, true);
    }

    // Attach the drag handle after the panel is mounted. Wait one frame so
    // the engine's enter-from transform doesn't trip the initial rect read.
    window.requestAnimationFrame(() => {
      this._attachDragHandle();
    });

    this._dispatchEvent('win:open', {});
  }

  close(reason: ArvoWindowCloseReason | string = 'programmatic'): void {
    if (!this._isOpen) return;
    if (this._options.onClose?.({ reason }) === false) return;

    this._isOpen = false;
    document.removeEventListener('keydown', this._boundHandleKeyDown, true);
    this._dispatchEvent('win:close', { reason });

    // Drag listeners are detached BEFORE the engine starts the exit transition
    // so pointer events during the fade-out don't reopen the drag state. The
    // drag handle's destroy preserves the `--arvo-win-x/y` CSS variables so
    // the panel doesn't snap to (0, 0) mid-fade.
    this._detachDragHandle();

    // Programmatic path: the engine's options.onClose callback (a.k.a.
    // _handleEngineClose) fires SYNCHRONOUSLY inside surface.close() while
    // this flag is true, so it knows to skip its own engine-driven cleanup
    // -- _finalizeClose is owned by the Promise-chain below.
    this._closingProgrammatically = true;
    const closePromise = this._surface?.close();
    this._closingProgrammatically = false;

    if (closePromise) {
      void closePromise.then(() => this._finalizeClose());
    } else {
      this._finalizeClose();
    }
  }

  /**
   * Picker-silent close path for engine-driven triggers (Escape via this
   * component's own keydown listener, backdrop click via the mask's
   * onOutside). Does NOT call the user's `onClose` and does NOT dispatch
   * `win:close` -- those are reserved for the programmatic path. The root
   * teardown is chained off the engine's close Promise so it lands exactly
   * when the exit transition finishes (no racing setTimeout).
   */
  private _closeViaEngine(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    document.removeEventListener('keydown', this._boundHandleKeyDown, true);
    this._detachDragHandle();
    const closePromise = this._surface?.close();
    if (closePromise) {
      void closePromise.then(() => this._finalizeClose());
    } else {
      this._finalizeClose();
    }
  }

  /**
   * Removes the root wrapper from the DOM after the exit transition has
   * fully resolved. Called exactly once per open/close cycle via the
   * engine's close() Promise -- never via a racing setTimeout.
   */
  private _finalizeClose(): void {
    const root = this._rootEl;
    if (!root) return;
    root.classList.remove('open');
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  title(): string;
  title(value: string): void;
  title(value?: string): string | void {
    if (value === undefined) return this._options.title ?? '';
    this._options.title = value;
    if (this._titleEl) this._titleEl.textContent = value;
  }

  maximized(): boolean;
  maximized(value: boolean): void;
  maximized(value?: boolean): boolean | void {
    if (value === undefined) return this._isMaximized;
    if (value === this._isMaximized) return;
    if (value) {
      this._preMaximizeOffset = { ...this._dragOffset };
      this._detachDragHandle();
      this._isMaximized = true;
      this._rootEl?.classList.add('arvo-win--maximized');
      this._rootEl?.classList.remove('arvo-win--draggable');
      this._dispatchEvent('win:maximize', {});
    } else {
      this._isMaximized = false;
      this._rootEl?.classList.remove('arvo-win--maximized');
      if (this._options.isDraggable !== false && this._options.hasHeader !== false) {
        this._rootEl?.classList.add('arvo-win--draggable');
      }
      if (this._preMaximizeOffset) {
        this._dragOffset = { ...this._preMaximizeOffset };
        this._preMaximizeOffset = null;
        if (this._panelEl) {
          this._panelEl.style.setProperty('--arvo-win-x', `${this._dragOffset.x}px`);
          this._panelEl.style.setProperty('--arvo-win-y', `${this._dragOffset.y}px`);
        }
      }
      if (this._isOpen) this._attachDragHandle();
      this._dispatchEvent('win:restore', {});
    }
    this._options.onMaximizeChange?.(this._isMaximized);
    if (this._maxBtn) {
      this._maxBtn.setIcon(this._isMaximized ? 'priority-edge' : 'expand');
    }
  }

  renderBody(content: string | HTMLElement | ((container: HTMLElement) => void)): void {
    this._options.content = content;
    this._options.isEmptyState = false;
    if (!this._bodyEl) return;
    this._destroyEmptyState();
    renderInto(this._bodyEl, content);
  }

  setSize(size: ArvoWindowSize): void {
    if (size === this._options.size) return;
    if (this._rootEl) {
      this._rootEl.classList.remove(`arvo-win--${this._options.size ?? 'md'}`);
      this._rootEl.classList.add(`arvo-win--${size}`);
    }
    this._options.size = size;
  }

  setLoading(loading: boolean): void {
    if (this._isLoading === loading) return;
    this._isLoading = loading;
    this._rootEl?.classList.toggle('loading', loading);
    if (this._panelEl) {
      if (loading) this._panelEl.setAttribute('aria-busy', 'true');
      else this._panelEl.removeAttribute('aria-busy');
    }
    this._backBtn?.disabled(loading || this._isDisabled);
    this._maxBtn?.disabled(loading || this._isDisabled);
    this._closeBtn?.disabled(loading || this._isDisabled);
  }

  setHeaderActions(actions: ArvoWindowHeaderAction[]): void {
    this._options.headerActions = actions;
    if (!this._headerActionsEl) return;
    // Remove existing consumer-provided actions; max/close wrappers are
    // tracked separately and stay in place.
    this._destroyHeaderActions();
    const clamped = clampHeaderActions(actions);
    // The max + close wrappers are the LAST 1-2 children of header-actions.
    // Insert new consumer actions before the maximize wrapper (if present)
    // or the close wrapper, so order remains [custom..., max, close].
    const maxOrCloseWrapper =
      this._headerActionsEl.querySelector<HTMLElement>(
        '.arvo-win__max-btn, .arvo-win__close-btn',
      );
    clamped.forEach((action, i) => {
      const node = this._buildHeaderAction(action, i);
      if (!node) return;
      if (maxOrCloseWrapper) {
        this._headerActionsEl!.insertBefore(node, maxOrCloseWrapper);
      } else {
        this._headerActionsEl!.appendChild(node);
      }
    });
  }

  setFooterActions(actions: {
    primary?: ArvoWindowFooterAction | null;
    secondary?: ArvoWindowFooterAction[];
  }): void {
    if (actions.primary !== undefined) this._options.primaryAction = actions.primary;
    if (actions.secondary !== undefined)
      this._options.secondaryActions = actions.secondary;
    this._destroyFooterActions();
    this._footerFit?.destroy();
    this._footerFit = null;
    if (this._actionsEl) {
      this._actionsEl.remove();
      this._actionsEl = null;
    }
    this._renderFooterActions();
  }

  setEmptyContent(config: ArvoWindowEmptyContent | null): void {
    this._options.emptyContent = config ?? undefined;
    if (this._options.isEmptyState) {
      this._destroyEmptyState();
      this._renderEmptyStateBody();
    }
  }

  resetPosition(): void {
    this._dragOffset = { x: 0, y: 0 };
    if (this._panelEl) {
      this._panelEl.style.setProperty('--arvo-win-x', '0px');
      this._panelEl.style.setProperty('--arvo-win-y', '0px');
    }
    this._drag?.reset();
  }

  destroy(): void {
    this._drag?.destroy();
    this._drag = null;
    this._surface?.destroy();
    this._surface = null;

    if (this._isOpen) {
      this._isOpen = false;
      document.removeEventListener('keydown', this._boundHandleKeyDown, true);
    }

    this._backBtn?.destroy();
    this._maxBtn?.destroy();
    this._closeBtn?.destroy();
    this._badgeInstance?.destroy();
    this._statusInstance?.destroy();
    this._destroyHeaderActions();
    this._destroyFooterActions();
    this._footerFit?.destroy();
    this._footerFit = null;
    this._destroyEmptyState();

    this._backBtn = null;
    this._maxBtn = null;
    this._closeBtn = null;
    this._badgeInstance = null;
    this._statusInstance = null;

    if (this._rootEl && this._rootEl.parentNode) {
      this._rootEl.parentNode.removeChild(this._rootEl);
    }
    this._rootEl = null;
    this._panelEl = null;
    this._headerEl = null;
    this._headerLeftEl = null;
    this._headerActionsEl = null;
    this._titleEl = null;
    this._stickyHeaderEl = null;
    this._bodyEl = null;
    this._footerEl = null;
    this._footerLeftEl = null;
    this._actionsEl = null;
  }

  // -----------------------------------------------------------------
  // Two-path close (picker-silent)
  // -----------------------------------------------------------------

  /**
   * Engine-driven onClose callback. Called synchronously inside
   * `surface.close()` regardless of who initiated the close.
   *
   * - When `close()` or `_closeViaEngine()` is the initiator, `_isOpen` is
   *   already `false` by the time we get here, so the early-return short-
   *   circuits and the Promise-chained `_finalizeClose` in the caller owns
   *   the teardown.
   * - When the overlay hub forcibly closes us (rare; e.g. a higher-priority
   *   modal opens), `_isOpen` is still `true`. We tear down picker-silent
   *   and schedule `_finalizeClose` to run just after the engine's exit
   *   transition completes (we have no Promise reference in that case).
   */
  private _handleEngineClose(): void {
    if (this._closingProgrammatically) return;
    if (!this._isOpen) return; // Caller already initiated close + chained cleanup.
    this._isOpen = false;
    document.removeEventListener('keydown', this._boundHandleKeyDown, true);
    this._detachDragHandle();
    // Hub-driven close fallback: align with the engine's 150ms exit transition
    // plus a small buffer for cleanup to complete.
    window.setTimeout(() => this._finalizeClose(), 170);
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    if (!this._isOpen) return;
    e.stopPropagation();
    this._closeViaEngine();
  }

  // -----------------------------------------------------------------
  // Drag handle
  // -----------------------------------------------------------------

  private _attachDragHandle(): void {
    if (this._drag) return;
    if (!this._isOpen) return;
    if (this._isMaximized) return;
    if (this._isDisabled || this._isLoading) return;
    if (this._options.isDraggable === false) return;
    if (this._options.hasHeader === false) return;
    if (!this._headerEl || !this._panelEl) return;

    this._drag = createDragHandle({
      handle: this._headerEl,
      target: this._panelEl,
      excludeSelector: HEADER_EXCLUDE_DRAG_SELECTOR,
      bounds: 'viewport',
      initialOffset: this._dragOffset,
      cssVar: { x: '--arvo-win-x', y: '--arvo-win-y' },
      draggingClass: '',
      onDragStart: (e) => {
        this._rootEl?.classList.add('dragging');
        this._options.onDragStart?.(e);
        this._dispatchEvent('win:drag-start', { offset: { ...this._dragOffset } });
      },
      onDrag: (offset) => {
        this._dragOffset = offset;
      },
      onDragEnd: (offset) => {
        this._dragOffset = offset;
        this._rootEl?.classList.remove('dragging');
        this._options.onDragEnd?.(offset);
        this._dispatchEvent('win:drag-end', { offset: { ...offset } });
      },
    });
  }

  private _detachDragHandle(): void {
    this._drag?.destroy();
    this._drag = null;
    this._rootEl?.classList.remove('dragging');
  }

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  private _normalizeOptions(o: ArvoWindowOptions): ArvoWindowOptions {
    return {
      ...o,
      size: o.size ?? 'md',
      icon: o.icon ?? 'desktop',
      statusType: o.statusType ?? 'available',
      backLabel: o.backLabel ?? 'Go back',
      closeLabel: o.closeLabel ?? 'Close window',
      hasTitle: o.hasTitle ?? true,
      hasHeader: o.hasHeader ?? true,
      hasFooter: o.hasFooter ?? true,
      isDraggable: o.isDraggable ?? true,
      hasBackdrop: o.hasBackdrop ?? true,
      closeOnBackdrop: o.closeOnBackdrop ?? false,
      closeOnEscape: o.closeOnEscape ?? true,
      initialFocus: o.initialFocus ?? 'auto',
    };
  }

  private _resolveInitialFocus(): HTMLElement | null {
    return resolveOverlayInitialFocus({
      initialFocus: this._options.initialFocus ?? 'auto',
      root: this._panelEl,
      stickyHeader: this._stickyHeaderEl,
      body: this._bodyEl,
      footer: this._footerEl,
      header: this._headerEl,
    });
  }

  private _validateAccessibleName(): void {
    const o = this._options;
    const hasVisibleTitle = o.hasHeader !== false && o.hasTitle !== false && !!o.title;
    if (!hasVisibleTitle && !o.ariaLabel) {
      warnOnce(
        'win-no-accessible-name-js',
        '[ArvoWindow] Provide either a visible `title` or an `ariaLabel`. ' +
          'Windows must have an accessible name.',
      );
    }
  }

  private _render(): void {
    const o = this._options;

    this._rootEl = document.createElement('div');
    this._rootEl.className = this._buildRootClasses();

    this._panelEl = document.createElement('div');
    this._panelEl.id = this._windowId;
    this._panelEl.className = 'arvo-win__panel';
    this._panelEl.setAttribute('role', 'dialog');
    this._panelEl.setAttribute('aria-modal', o.hasBackdrop !== false ? 'true' : 'false');
    const renderTitle = o.hasHeader !== false && o.hasTitle !== false && !!o.title;
    if (renderTitle) {
      this._panelEl.setAttribute('aria-labelledby', this._titleId);
    } else if (o.ariaLabel) {
      this._panelEl.setAttribute('aria-label', o.ariaLabel);
    }
    if (o.ariaDescribedBy) {
      this._panelEl.setAttribute('aria-describedby', o.ariaDescribedBy);
    }
    if (this._isLoading) this._panelEl.setAttribute('aria-busy', 'true');
    this._panelEl.tabIndex = -1;

    if (o.hasHeader !== false) this._renderHeader();
    if (o.stickyHeader !== null && o.stickyHeader !== undefined) {
      this._renderStickyHeader();
    }
    this._renderBody();
    if (o.hasFooter !== false) this._renderFooter();

    if (this._headerEl) this._panelEl.appendChild(this._headerEl);
    if (this._stickyHeaderEl) this._panelEl.appendChild(this._stickyHeaderEl);
    if (this._bodyEl) this._panelEl.appendChild(this._bodyEl);
    if (this._footerEl) this._panelEl.appendChild(this._footerEl);

    this._rootEl.appendChild(this._panelEl);
  }

  private _buildRootClasses(): string {
    const o = this._options;
    const dragEnabled =
      o.isDraggable !== false &&
      o.hasHeader !== false &&
      !this._isMaximized;
    return [
      'arvo-win',
      `arvo-win--${o.size ?? 'md'}`,
      this._isMaximized && 'arvo-win--maximized',
      dragEnabled && 'arvo-win--draggable',
      o.hasBackdrop === false && 'arvo-win--no-backdrop',
      o.hasIcon && 'arvo-win--has-icon',
      o.hasStatusIndicator && 'arvo-win--has-status',
      o.badge && 'arvo-win--has-badge',
      o.hasBackBtn && 'arvo-win--has-back-btn',
      o.hasMaximize && 'arvo-win--has-maximize',
      o.isEmptyState && 'arvo-win--empty',
      this._isLoading && 'loading',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private _renderHeader(): void {
    const o = this._options;
    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-win__header';

    this._headerLeftEl = document.createElement('div');
    this._headerLeftEl.className = 'arvo-win__header-left';

    if (o.hasBackBtn) {
      const wrap = document.createElement('span');
      wrap.className = 'arvo-win__back-btn';
      const btn = document.createElement('button');
      this._backBtn = ArvoIconButton.initialize(btn, {
        icon: 'arrow-left',
        size: 'sm',
        variant: 'secondary',
        tooltip: o.backLabel ?? 'Go back',
        isDisabled: this._isLoading || this._isDisabled,
        onClick: (e: Event) => {
          if (this._isLoading || this._isDisabled) return;
          o.onBack?.(e);
          this._dispatchEvent('win:back', {});
        },
      });
      btn.setAttribute('aria-label', o.backLabel ?? 'Go back');
      wrap.appendChild(btn);
      this._headerLeftEl.appendChild(wrap);
    }

    if (o.hasIcon) {
      const ico = document.createElement('span');
      ico.className = `arvo-win__ico o9con o9con-${o.icon}`;
      ico.setAttribute('aria-hidden', 'true');
      this._headerLeftEl.appendChild(ico);
    }

    const renderTitle = o.hasTitle !== false && !!o.title;
    if (renderTitle) {
      this._titleEl = document.createElement('p');
      this._titleEl.id = this._titleId;
      this._titleEl.className = 'arvo-win__title';
      this._titleEl.textContent = o.title!;
      this._headerLeftEl.appendChild(this._titleEl);
    }

    if (o.hasStatusIndicator) {
      const wrap = document.createElement('span');
      wrap.className = 'arvo-win__status';
      wrap.setAttribute('aria-hidden', 'true');
      const host = document.createElement('span');
      this._statusInstance = ArvoStatus.initialize(host, {
        type: o.statusType ?? 'available',
        size: 'sm',
      });
      wrap.appendChild(host);
      this._headerLeftEl.appendChild(wrap);
    }

    if (o.badge) {
      const wrap = document.createElement('span');
      wrap.className = 'arvo-win__badge';
      const host = document.createElement('span');
      this._badgeInstance = ArvoBadge.initialize(host, {
        ...o.badge,
        variant: 'label',
        size: 'sm',
        placement: 'inline',
        hasStatus: false,
      });
      wrap.appendChild(host);
      this._headerLeftEl.appendChild(wrap);
    }

    this._headerActionsEl = document.createElement('div');
    this._headerActionsEl.className = 'arvo-win__header-actions';

    const clamped = clampHeaderActions(o.headerActions);
    clamped.forEach((action, i) => {
      const node = this._buildHeaderAction(action, i);
      if (node) this._headerActionsEl!.appendChild(node);
    });

    if (o.hasMaximize) {
      const wrap = document.createElement('span');
      wrap.className = 'arvo-win__max-btn';
      const btn = document.createElement('button');
      this._maxBtn = ArvoIconButton.initialize(btn, {
        icon: this._isMaximized ? 'priority-edge' : 'expand',
        size: 'sm',
        variant: 'tertiary',
        tooltip: this._isMaximized ? 'Restore Exit Full screen' : 'Maximize Full Screen',
        isDisabled: this._isLoading || this._isDisabled,
        onClick: () => {
          if (this._isLoading || this._isDisabled) return;
          this.maximized(!this._isMaximized);
        },
      });
      btn.setAttribute(
        'aria-label',
        this._isMaximized ? 'Restore Exit Full screen' : 'Maximize Full Screen',
      );
      wrap.appendChild(btn);
      this._headerActionsEl.appendChild(wrap);
    }

    // Close is always present when there is a header.
    const closeWrap = document.createElement('span');
    closeWrap.className = 'arvo-win__close-btn';
    const closeBtnEl = document.createElement('button');
    this._closeBtn = ArvoIconButton.initialize(closeBtnEl, {
      icon: 'close',
      size: 'sm',
      variant: 'tertiary',
      tooltip: o.closeLabel ?? 'Close window',
      isDisabled: this._isLoading || this._isDisabled,
      onClick: () => this.close('close-button'),
    });
    closeBtnEl.setAttribute('aria-label', o.closeLabel ?? 'Close window');
    closeWrap.appendChild(closeBtnEl);
    this._headerActionsEl.appendChild(closeWrap);

    this._headerEl.appendChild(this._headerLeftEl);
    this._headerEl.appendChild(this._headerActionsEl);
  }

  private _buildHeaderAction(
    action: ArvoWindowHeaderAction,
    index: number,
  ): HTMLElement | null {
    // Validate variant for label-bearing actions.
    if (action.type !== 'switch') {
      const v = (action as { variant?: string }).variant;
      if (v && !ALLOWED_HEADER_VARIANTS.has(v as ArvoWindowHeaderActionVariant)) {
        warnOnce(
          `win-header-variant-${action.id ?? action.type}-${v}`,
          `[ArvoWindow] Header action variant '${v}' is not allowed. ` +
            `Use one of: ${[...ALLOWED_HEADER_VARIANTS].join(', ')}.`,
        );
      }
    }
    const disabled = this._isLoading || this._isDisabled || !!action.isDisabled;
    const host = document.createElement('span');
    this._headerActionWrappers.push(host);
    switch (action.type) {
      case 'icon-button': {
        const btn = document.createElement('button');
        const variant: 'tertiary' | 'outline' =
          action.variant && ALLOWED_HEADER_VARIANTS.has(action.variant)
            ? (action.variant as 'tertiary' | 'outline')
            : 'tertiary';
        const inst = ArvoIconButton.initialize(btn, {
          icon: action.icon,
          size: 'sm',
          variant,
          tooltip: action.tooltip ?? '',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onClick: action.onClick,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(btn);
        return host;
      }
      case 'button': {
        const btn = document.createElement('button');
        const variant: ArvoButtonVariant =
          action.variant && ALLOWED_HEADER_VARIANTS.has(action.variant)
            ? (action.variant as ArvoButtonVariant)
            : 'inline';
        const inst = ArvoButton.initialize(btn, {
          label: action.label,
          icon: action.icon,
          variant,
          size: 'sm',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onClick: action.onClick,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(btn);
        return host;
      }
      case 'dropdown-button': {
        const btn = document.createElement('button');
        const variant: 'tertiary' | 'outline' =
          action.variant && ALLOWED_HEADER_VARIANTS.has(action.variant)
            ? (action.variant as 'tertiary' | 'outline')
            : 'tertiary';
        const inst = ArvoDropdownButton.initialize(btn, {
          label: action.label,
          icon: action.icon,
          items: action.items as never,
          variant,
          size: 'sm',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onSelect: action.onSelect as never,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(btn);
        return host;
      }
      case 'dropdown-icon-button': {
        const btn = document.createElement('button');
        const variant: 'tertiary' | 'outline' =
          action.variant && ALLOWED_HEADER_VARIANTS.has(action.variant)
            ? (action.variant as 'tertiary' | 'outline')
            : 'tertiary';
        const inst = ArvoDropdownIconButton.initialize(btn, {
          icon: action.icon ?? 'ellipsis-v',
          tooltip: action.tooltip ?? '',
          items: action.items as never,
          variant,
          size: 'sm',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onSelect: action.onSelect as never,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(btn);
        return host;
      }
      case 'split-button': {
        if (action.variant === 'outline') {
          warnOnce(
            `win-split-button-outline-js-${action.id ?? index}`,
            `[ArvoWindow] SplitButton header action does not support variant 'outline'; falling back to 'tertiary'.`,
          );
        }
        const btn = document.createElement('div');
        const inst = ArvoSplitButton.initialize(btn, {
          label: action.label,
          icon: action.icon,
          items: action.items as never,
          variant: 'tertiary',
          size: 'sm',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onAction: action.onPrimaryClick
            ? (e: Event) => action.onPrimaryClick!(e)
            : undefined,
          onSelect: action.onSelect as never,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(btn);
        return host;
      }
      case 'split-icon-button': {
        if (action.variant === 'outline') {
          warnOnce(
            `win-split-icon-button-outline-js-${action.id ?? index}`,
            `[ArvoWindow] SplitIconButton header action does not support variant 'outline'; falling back to 'tertiary'.`,
          );
        }
        const btn = document.createElement('div');
        const inst = ArvoSplitIconButton.initialize(btn, {
          icon: action.icon,
          tooltip: action.tooltip ?? '',
          items: action.items as never,
          variant: 'tertiary',
          size: 'sm',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onAction: action.onPrimaryClick
            ? (e: Event) => action.onPrimaryClick!(e)
            : undefined,
          onSelect: action.onSelect as never,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(btn);
        return host;
      }
      case 'switch': {
        const sw = document.createElement('div');
        const inst = ArvoSwitch.initialize(sw, {
          label: action.label ?? null,
          size: 'sm',
          isChecked: action.isChecked ?? action.defaultChecked,
          isDisabled: disabled,
          isLoading: action.isLoading,
          onChange: action.onChange,
        });
        this._headerActionInstances.push(inst);
        host.appendChild(sw);
        return host;
      }
      default:
        return null;
    }
  }

  private _renderBody(): void {
    const o = this._options;
    this._bodyEl = document.createElement('div');
    this._bodyEl.id = this._bodyId;
    this._bodyEl.className = 'arvo-win__body';

    if (o.isEmptyState) {
      this._renderEmptyStateBody();
    } else if (o.content !== null && o.content !== undefined) {
      renderInto(this._bodyEl, o.content);
    }
  }

  private _renderStickyHeader(): void {
    const stickyHeader = this._options.stickyHeader;
    if (stickyHeader === null || stickyHeader === undefined) return;
    this._stickyHeaderEl = document.createElement('div');
    this._stickyHeaderEl.className = 'arvo-win__sticky-header';
    renderInto(this._stickyHeaderEl, stickyHeader);
  }

  private _renderEmptyStateBody(): void {
    if (!this._bodyEl) return;
    const o = this._options;
    const host = document.createElement('div');
    this._bodyEl.appendChild(host);
    this._emptyStateInstance = ArvoEmptyState.initialize(host, {
      ...(o.emptyContent ?? {}),
      size: this._isMaximized ? 'lg' : 'sm',
      orientation: 'vertical',
    });
  }

  private _destroyEmptyState(): void {
    this._emptyStateInstance?.destroy?.();
    this._emptyStateInstance = null;
    if (this._bodyEl) this._bodyEl.textContent = '';
  }

  private _renderFooter(): void {
    const o = this._options;
    this._footerEl = document.createElement('div');
    this._footerEl.className = 'arvo-win__footer';

    if (o.footerLeft !== undefined && o.footerLeft !== null) {
      this._footerLeftEl = document.createElement('div');
      this._footerLeftEl.className = 'arvo-win__footer-left';
      renderInto(this._footerLeftEl, o.footerLeft);
      this._footerEl.appendChild(this._footerLeftEl);
    }

    this._renderFooterActions();
  }

  private _renderFooterActions(): void {
    if (!this._footerEl) return;
    const primary = this._options.primaryAction;
    const secondaries = clampSecondaryActions(this._options.secondaryActions);
    if (!primary && secondaries.length === 0) return;

    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-win__actions';

    secondaries.forEach((a, i) => {
      const node = this._buildFooterAction(a, 'secondary', 'secondary', i);
      if (node) this._actionsEl!.appendChild(node);
    });
    if (primary) {
      const node = this._buildFooterAction(primary, 'primary', 'primary', 0);
      if (node) this._actionsEl.appendChild(node);
    }

    this._footerEl.appendChild(this._actionsEl);

    // Overlay-family shared rule: grow the equal-column flex basis
    // (--arvo-overlay-footer-btn-min) when labels would otherwise truncate
    // at the 112px floor. Paired with the `overlay-footer-actions-layout`
    // SCSS mixin (6px gap from `arvo-win__footer`).
    this._footerFit?.destroy();
    this._footerFit = attachOverlayFooterFit(this._actionsEl, { gap: 6 });
  }

  private _buildFooterAction(
    action: ArvoWindowFooterAction,
    reason: ArvoWindowCloseReason,
    role: 'primary' | 'secondary',
    index: number,
  ): HTMLElement | null {
    // Reference index in a no-op so TS doesn't flag it unused.
    void index;

    const disabled = this._isLoading || this._isDisabled || !!action.isDisabled;
    const type = action.type ?? 'button';
    const buttonVariant: ArvoButtonVariant =
      role === 'primary'
        ? action.semantic === 'danger-primary'
          ? 'danger-primary'
          : 'primary'
        : 'secondary';
    const ddVariant: 'primary' | 'secondary' =
      role === 'primary' ? 'primary' : 'secondary';

    const runClick = (e: Event) => {
      if (this._isLoading || this._isDisabled || action.isDisabled) return;
      this._dispatchEvent('win:action', { action: role, actionId: action.id ?? null });
      const result = action.onClick?.(e);
      if (result === false) return;
      if (action.closeOnClick !== false) {
        this.close(reason);
      }
    };

    // Footer buttons render as DIRECT children of `.arvo-win__actions` --
    // no `<span>` wrapper -- so the shared `overlay-footer-actions-layout`
    // SCSS mixin matches the real `.arvo-btn`/`.arvo-dd-btn`/`.arvo-split-btn`
    // element and its `flex: 0 1 112px` basis takes effect. The wrapper-less
    // layout also keeps the icon-only exemption selector (which inspects
    // class names on the immediate child) honest, matches the React Window
    // structure, and lets `attachOverlayFooterFit` measure label widths
    // directly without an indirection level.
    switch (type) {
      case 'dropdown-button': {
        const btn = document.createElement('button');
        const inst = ArvoDropdownButton.initialize(btn, {
          label: action.label,
          icon: action.icon,
          items: (action.items ?? []) as never,
          variant: ddVariant,
          size: 'md',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onSelect: action.onSelect as never,
          onClick: runClick,
        });
        if (role === 'primary') this._primaryBtn = inst;
        else this._secondaryBtns.push(inst);
        return btn;
      }
      case 'split-button': {
        const btn = document.createElement('div');
        const inst = ArvoSplitButton.initialize(btn, {
          label: action.label,
          icon: action.icon,
          items: (action.items ?? []) as never,
          variant: ddVariant,
          size: 'md',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onAction: (e: Event) => {
            const r = action.onPrimaryClick?.(e);
            if (r === false) return;
            runClick(e);
          },
          onSelect: action.onSelect as never,
        });
        if (role === 'primary') this._primaryBtn = inst;
        else this._secondaryBtns.push(inst);
        return btn;
      }
      case 'button':
      default: {
        const btn = document.createElement('button');
        const inst = ArvoButton.initialize(btn, {
          label: action.label,
          icon: action.icon,
          variant: buttonVariant,
          size: 'md',
          isDisabled: disabled,
          isLoading: action.isLoading,
          onClick: runClick,
        });
        if (role === 'primary') this._primaryBtn = inst;
        else this._secondaryBtns.push(inst);
        return btn;
      }
    }
  }

  private _destroyHeaderActions(): void {
    for (const inst of this._headerActionInstances) {
      inst.destroy?.();
    }
    this._headerActionInstances = [];
    for (const wrap of this._headerActionWrappers) {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    this._headerActionWrappers = [];
  }

  private _destroyFooterActions(): void {
    this._primaryBtn?.destroy?.();
    this._primaryBtn = null;
    for (const inst of this._secondaryBtns) inst.destroy?.();
    this._secondaryBtns = [];
  }

  private _resolveContainer(): HTMLElement {
    const c = this._options.container;
    if (!c) return document.body;
    if (typeof c === 'string') {
      return document.querySelector<HTMLElement>(c) ?? document.body;
    }
    return c;
  }

  private _dispatchEvent(
    eventName: string,
    detail: Record<string, unknown> = {},
  ): void {
    this._panelEl?.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, cancelable: false, detail }),
    );
  }
}

export default ArvoWindow;
