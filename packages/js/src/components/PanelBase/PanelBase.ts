/**
 * PanelBase -- INTERNAL primitive shared by `ArvoPanel` and the four
 * specialized panels (`ArvoNavPanel`, `ArvoFilterPanel`) on the JS side.
 *
 * NOT exported from `@arvo/js`. Application code MUST NOT import this
 * module directly.
 *
 * Owns everything shared across the panel family: host element + BEM class
 * composition, `displayMode` + placement, overlay engine wiring (mask,
 * focus trap, scroll lock, ARIA), notify-but-no-veto dismissal pattern,
 * container-resolution chain, pin/expand lifecycle, sizing + splitter,
 * rich-header (content + optional `hasClear`), sticky-header composition
 * (via `createPanelShell`), and a subscription hook that lets specialized
 * wrappers imperatively re-filter their inner Arvo component whenever the
 * sticky search query changes.
 */

import {
  createOverlaySurface,
  overlayHub,
  resolveOverlayInitialFocus,
  type ArvoInitialFocusTarget,
  type OverlaySurface,
} from '@arvo/core';
import {
  type PanelShellInstance,
  type PanelShellOptions,
  type PanelContent,
  type ArvoPanelHeaderAction,
  type ArvoPanelStickyHeaderConfig,
  type ArvoPanelAction,
  type ArvoPanelMenuItem,
  type ArvoPanelSearchConfig,
  type ArvoPanelPlacement,
  type ArvoPanelDisplayMode,
  type ArvoPanelExpandMode,
  type ArvoPanelCloseReason,
  type ArvoPanelRichHeaderConfigShape,
} from '@arvo/utils';
import { createPanelShell } from '../PanelShell/PanelShell';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoSplitter } from '../Splitter/Splitter';
import { ArvoFabButton, type ArvoFabButtonOptions } from '../FabButton/FabButton';
import {
  ArvoStatus,
  type ArvoStatusOptions,
  type ArvoStatusConfig,
} from '../Status/Status';
import { ArvoBadge, type ArvoBadgeOptions } from '../Badge/Badge';
// ---------------------------------------------------------------------------
// Public (framework-scoped) types
// ---------------------------------------------------------------------------

/** Rich-header config on the JS path -- consumer-supplied content
 *  (HTMLElement or string) plus an optional single clear action. */
export type ArvoPanelRichHeaderConfig =
  | HTMLElement
  | string
  | ArvoPanelRichHeaderConfigShape<HTMLElement | string>;

export type PanelBaseType =
  | 'custom'
  | 'navigation'
  | 'browser'
  | 'filter'
  | 'tree';

export interface PanelBaseOptions {
  panelType: PanelBaseType;
  extraHostClasses?: string[];

  displayMode?: ArvoPanelDisplayMode;
  placement?: ArvoPanelPlacement;
  isEdge?: boolean;

  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: (reason: ArvoPanelCloseReason) => boolean | void;

  isModal?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  container?: HTMLElement | (() => HTMLElement) | null;

  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;

  isResizable?: boolean;
  onResize?: (size: number) => void;
  onResizeCommit?: (size: number) => void;

  isExpandable?: boolean;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  expandMode?: ArvoPanelExpandMode;
  onExpandChange?: (expanded: boolean) => void;

  hasHeader?: boolean;
  title?: string | null;
  icon?: string;
  status?: Omit<ArvoStatusConfig, 'placement'>;
  badge?: Omit<Partial<ArvoBadgeOptions>, 'placement'>;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPanelHeaderAction[];
  hasOverflowMenu?: boolean;
  overflowMenuItems?: ArvoPanelMenuItem[];

  isPinnable?: boolean;
  isPinned?: boolean;
  defaultPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  isDismissible?: boolean;

  richHeader?: ArvoPanelRichHeaderConfig | false;
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  actions?: ArvoPanelAction[] | false;
  fab?: ArvoFabButtonOptions | false;

  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;
  /**
   * Initial focus target for overlay/modal mode. `'auto'` prefers body,
   * then footer, then header. Pass an HTMLElement/resolver for a custom target.
   */
  initialFocus?: ArvoInitialFocusTarget | null;

  /**
   * Optional element to seed the body slot with at construction time.
   * Specialized wrappers (NavPanel / FilterPanel) pass a
   * pre-built HTMLElement that hosts their inner Arvo component. The
   * ArvoPanel wrapper leaves this undefined and uses `setContent()`
   * imperatively after construction.
   */
  body?: HTMLElement | null;
}

export interface PanelBaseInstance {
  readonly hostEl: HTMLElement;
  readonly paneEl: HTMLElement;
  readonly bodyEl: HTMLElement;
  readonly shell: PanelShellInstance;

  open(): void;
  close(reason?: ArvoPanelCloseReason): void;
  toggle(): void;
  isOpen(): boolean;
  pinned(value?: boolean): boolean | void;
  expanded(value?: boolean): boolean | void;
  size(value?: number): number | void;
  setDisplayMode(mode: ArvoPanelDisplayMode): void;
  setStickyHeader(config: ArvoPanelStickyHeaderConfig | false): void;
  setHeaderActions(actions: ArvoPanelHeaderAction[]): void;
  setActions(actions: ArvoPanelAction[] | false): void;
  setTitle(title: string | null): void;
  setIcon(icon: string | null): void;
  setRichHeader(config: ArvoPanelRichHeaderConfig | false): void;
  /** Replace the entire body-slot element in-place. Detaches the previous
   *  body node, appends `next`, and updates `bodyEl` to point at the new
   *  element (if `next` is a top-level replacement). */
  replaceBody(next: HTMLElement | null): void;
  /** Consumer-friendly custom-body setter -- used by the `ArvoPanel`
   *  wrapper. Accepts an HTMLElement, an HTML string, a callback, or
   *  `null`. */
  setContent(content: PanelContent): void;
  search(query?: string): string | void;
  selectedTab(id?: string): string | null | void;
  loading(state?: boolean): boolean | void;
  disabled(state?: boolean): boolean | void;
  focus(target?: 'first' | 'title' | 'search' | 'list'): void;

  /**
   * Subscribe to sticky-search query changes. The listener is called
   * immediately with the current query and then again after every change.
   * Returns an unsubscribe function the wrapper calls from its own
   * `destroy()`.
   */
  onSearchQueryChange(listener: (query: string) => void): () => void;

  destroy(): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCssLength(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === 'number' ? `${value}px` : String(value);
}

function toNumericPx(
  value: string | number | null | undefined,
  fallback: number,
): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolveExplicitContainer(
  container: PanelBaseOptions['container'],
): HTMLElement | null {
  if (container === undefined) return null;
  if (container === null) return document.body;
  if (typeof container === 'function') return container();
  return container;
}

function resolveEffectiveContainer(
  opts: PanelBaseOptions,
  effectiveMode: ArvoPanelDisplayMode,
): HTMLElement | null {
  const explicit = resolveExplicitContainer(opts.container);
  if (explicit) return explicit;
  if (effectiveMode === 'overlay') return overlayHub.getContainer();
  return null;
}

/**
 * Render arbitrary custom content into a container -- mirrors the
 * `ArvoPopover` content contract (element / HTML string / callback / null).
 * Exported so the ArvoPanel wrapper can reuse it when consumers pass a
 * `content` option directly.
 */
export function renderContentToElement(
  container: HTMLElement,
  content: PanelContent,
): void {
  container.textContent = '';
  if (content == null) return;
  if (typeof content === 'string') {
    container.innerHTML = content;
  } else if (typeof content === 'function') {
    content(container);
  } else if (content instanceof Node) {
    container.appendChild(content);
  }
}

function isRichHeaderShape(
  value: ArvoPanelRichHeaderConfig,
): value is ArvoPanelRichHeaderConfigShape<HTMLElement | string> {
  if (value == null) return false;
  if (typeof value === 'string') return false;
  if (value instanceof HTMLElement) return false;
  return typeof value === 'object' && 'content' in (value as object);
}

let _panelBaseIdCounter = 0;

// ---------------------------------------------------------------------------
// createPanelBase
// ---------------------------------------------------------------------------

export function createPanelBase(
  element: HTMLElement,
  options: PanelBaseOptions,
): PanelBaseInstance {
  const overlayId = `arvo-pnl-${++_panelBaseIdCounter}`;
  const host = element;
  host.classList.add('arvo-pnl');

  let _opts: PanelBaseOptions = { ...options };
  const _panelType = options.panelType;
  let _displayMode: ArvoPanelDisplayMode = options.displayMode ?? 'overlay';
  const _placement: ArvoPanelPlacement = options.placement ?? 'left';

  let _isPinnedState = options.isPinned ?? options.defaultPinned ?? false;
  let _isOpenState = options.isOpen ?? options.defaultOpen ?? false;
  let _isExpandedState = options.isExpanded ?? options.defaultExpanded ?? false;
  let _isDisabled = !!options.isDisabled;
  let _isLoading = (!!options.isLoading) === true;

  const resolveEffectiveDisplayMode = (): ArvoPanelDisplayMode => {
    if (_opts.isPinnable) return _isPinnedState ? 'docked' : 'overlay';
    return _displayMode;
  };
  let _effectiveDisplayMode = resolveEffectiveDisplayMode();
  if (_effectiveDisplayMode === 'docked') _isOpenState = true;

  const isVertical = _placement === 'left' || _placement === 'right';
  const _numericDefaultSize = toNumericPx(options.defaultSize, 400);
  const _numericMinSize = toNumericPx(options.minSize, isVertical ? 160 : 240);
  const _numericMaxSize = toNumericPx(options.maxSize, 800);
  let _resizedSize: number | null = null;

  // -- Pane element ------------------------------------------------------
  const paneEl = document.createElement('div');
  paneEl.className = 'arvo-pnl__pane';
  paneEl.id = `arvo-pnl-pane-${overlayId}`;
  host.appendChild(paneEl);

  // -- Sticky-search subscription ---------------------------------------
  // PanelShell dispatches a bubbling `search` CustomEvent on its parent
  // (our `paneEl`) whenever the mounted `ArvoSearch` / `ArvoAdvanceSearch`
  // fires `onChange` / `onClear`. We listen for it, mirror the value
  // locally, fan out to `_searchListeners` (for the wrapper subscription
  // hook), invoke the consumer's `stickyHeader.search.onChange` /
  // `onClear`, and re-emit as `pnl:search`.
  let _searchQuery = '';
  const _searchListeners = new Set<(q: string) => void>();

  // -- Icon override state ---------------------------------------------
  let _iconOverride: string | undefined = options.icon;

  // -- Rich-header instances -------------------------------------------
  let _richHdrEl: HTMLElement | null = null;
  let _richHdrClearBtn: ArvoIconButton | null = null;

  const resolveSearchCfgFromCurrentOpts = (): ArvoPanelSearchConfig | null => {
    const cfg =
      _opts.stickyHeader && typeof _opts.stickyHeader === 'object'
        ? _opts.stickyHeader.search
        : undefined;
    if (!cfg) return null;
    return cfg === true ? {} : cfg;
  };

  const handleShellSearchEvent = (e: Event): void => {
    const ce = e as CustomEvent<{ value: string; matchedCount: number | null }>;
    // Stop the internal `search` from bubbling further -- we re-emit it as
    // `pnl:search` below with the framework-specific detail shape.
    e.stopPropagation();
    const value = ce.detail.value;
    const previous = _searchQuery;
    _searchQuery = value;
    for (const l of _searchListeners) l(value);
    const searchCfg = resolveSearchCfgFromCurrentOpts();
    searchCfg?.onChange?.(value);
    if (value === '' && previous !== '') searchCfg?.onClear?.();
    paneEl.dispatchEvent(
      new CustomEvent('pnl:search', {
        bubbles: true,
        detail: { value },
      }),
    );
  };
  paneEl.addEventListener('search', handleShellSearchEvent);

  // -- Composed header actions -----------------------------------------
  const buildComposedHeaderActions = (): ArvoPanelHeaderAction[] => {
    const list = [...(_opts.headerActions ?? [])];
    if (
      _opts.hasOverflowMenu &&
      _opts.overflowMenuItems &&
      _opts.overflowMenuItems.length > 0
    ) {
      list.push({
        id: '__overflow__',
        type: 'dropdown',
        icon: 'ellipsis-v',
        items: _opts.overflowMenuItems,
        isCompact: true,
      } as unknown as ArvoPanelHeaderAction);
    }
    if (_opts.isExpandable) {
      list.push({
        id: '__expand__',
        type: 'btn',
        icon: _isExpandedState ? 'priority-edge' : 'expand',
        tooltip: _isExpandedState ? 'Restore panel size' : 'Expand panel',
        onClick: () => handleExpandClick(),
        isDisabled: _isDisabled,
      } as ArvoPanelHeaderAction);
    }
    return list;
  };

  // -- Compose PanelShell ----------------------------------------------
  const shellOpts: PanelShellOptions = {
    title: options.title ?? null,
    hasHeader: options.hasHeader,
    hasBackButton: options.hasBackButton,
    onBack: options.onBack,
    headerActions: buildComposedHeaderActions(),
    stickyHeader: options.stickyHeader,
    content: null,
    actions: options.actions,
    isClosable: options.isDismissible ?? true,
    onClose: () => handleProgrammaticClose('close-button'),
    isPinnableCount: options.isPinnable ? 1 : 0,
    isClosableCount: (options.isDismissible ?? true) ? 1 : 0,
  };
  const shell = createPanelShell({
    parentBlock: 'arvo-pnl',
    parent: paneEl,
    options: shellOpts,
  });

  const bodyEl = shell.bodyEl as HTMLElement;

  // -- Body seeding -----------------------------------------------------
  if (options.body instanceof HTMLElement) {
    bodyEl.appendChild(options.body);
  }
  let _seededBodyEl: HTMLElement | null = options.body ?? null;

  // -- Pin button ------------------------------------------------------
  let _pinBtn: ArvoIconButton | null = null;
  let _pinBtnEl: HTMLButtonElement | null = null;
  if (options.isPinnable) {
    _pinBtnEl = document.createElement('button');
    _pinBtnEl.type = 'button';
    _pinBtn = ArvoIconButton.initialize(_pinBtnEl, {
      size: 'sm',
      variant: 'tertiary',
      icon: 'push-pin',
      tooltip: _isPinnedState ? 'Unpin panel' : 'Pin panel',
      isDisabled: _isDisabled,
      isSelected: _isPinnedState,
      onClick: () => handlePinClick(),
    });
    _pinBtnEl.classList.add('arvo-pnl__pin');
    shell.setPinSlot(_pinBtnEl);
  }

  // -- Leading title icon ---------------------------------------------
  let _titleLeadingEl: HTMLElement | null = null;
  const buildTitleLeading = (icon: string): void => {
    _titleLeadingEl = document.createElement('i');
    _titleLeadingEl.className = `arvo-pnl__icon o9con o9con-${icon}`;
    _titleLeadingEl.setAttribute('aria-hidden', 'true');
    shell.setTitleLeading(_titleLeadingEl);
  };
  const updateTitleLeading = (icon: string | null | undefined): void => {
    const nextIcon = icon && typeof icon === 'string' ? icon : null;
    if (!nextIcon) {
      destroyTitleLeading();
      return;
    }
    if (!_titleLeadingEl) {
      buildTitleLeading(nextIcon);
      return;
    }
    _titleLeadingEl.className = `arvo-pnl__icon o9con o9con-${nextIcon}`;
  };
  const destroyTitleLeading = (): void => {
    if (_titleLeadingEl) {
      try {
        shell.setTitleLeading(null);
      } catch {
        _titleLeadingEl.remove();
      }
    }
    _titleLeadingEl = null;
  };
  if (options.icon) buildTitleLeading(options.icon);

  // -- Trailing title cluster (status + badge) -----------------------
  let _titleTrailingEl: HTMLElement | null = null;
  let _statusInstance: ArvoStatus | null = null;
  let _badgeInstance: ArvoBadge | null = null;
  const buildTitleTrailing = (
    statusCfg: Omit<ArvoStatusConfig, 'placement'> | undefined,
    badgeCfg: Omit<Partial<ArvoBadgeOptions>, 'placement'> | undefined,
  ): void => {
    _titleTrailingEl = document.createElement('span');
    _titleTrailingEl.className = 'arvo-pnl__title-cluster';

    if (statusCfg) {
      const statusHost = document.createElement('span');
      statusHost.className = 'arvo-pnl__status';
      const statusInner = document.createElement('span');
      statusHost.appendChild(statusInner);
      _titleTrailingEl.appendChild(statusHost);
      _statusInstance = ArvoStatus.initialize(statusInner, {
        type: statusCfg.type,
        size: statusCfg.size ?? 'sm',
        icon: statusCfg.icon,
        tooltip: statusCfg.tooltip,
      } as ArvoStatusOptions);
    }

    if (badgeCfg) {
      const badgeHost = document.createElement('span');
      badgeHost.className = 'arvo-pnl__badge';
      const badgeInner = document.createElement('span');
      badgeHost.appendChild(badgeInner);
      _titleTrailingEl.appendChild(badgeHost);
      // Strip `placement` unconditionally -- the header row is not a
      // corner-host so only inline is supported (see descriptor). We
      // apply defaults FIRST then spread badgeCfg WITHOUT its placement
      // key, then force placement=inline last so any consumer override
      // is discarded.
      const { placement: _stripPlacement, ...badgeCfgNoPlacement } = badgeCfg as {
        placement?: unknown;
      } & Partial<ArvoBadgeOptions>;
      void _stripPlacement;
      _badgeInstance = ArvoBadge.initialize(badgeInner, {
        variant: 'label',
        size: 'sm',
        appearance: 'outline',
        ...badgeCfgNoPlacement,
        placement: 'inline',
      } as ArvoBadgeOptions);
    }

    shell.setTitleTrailing(_titleTrailingEl);
  };
  const destroyTitleTrailing = (): void => {
    _statusInstance?.destroy();
    _statusInstance = null;
    _badgeInstance?.destroy();
    _badgeInstance = null;
    if (_titleTrailingEl) {
      try {
        shell.setTitleTrailing(null);
      } catch {
        _titleTrailingEl.remove();
      }
    }
    _titleTrailingEl = null;
  };
  if (options.status || options.badge) {
    buildTitleTrailing(options.status, options.badge);
  }

  // -- Rich header -----------------------------------------------------
  let _richHdrBackBtn: ArvoIconButton | null = null;
  let _richHdrCloseBtn: ArvoIconButton | null = null;
  const destroyRichHeader = (): void => {
    _richHdrBackBtn?.destroy();
    _richHdrBackBtn = null;
    _richHdrClearBtn?.destroy();
    _richHdrClearBtn = null;
    _richHdrCloseBtn?.destroy();
    _richHdrCloseBtn = null;
    _richHdrEl?.remove();
    _richHdrEl = null;
  };
  const buildRichHeader = (config: ArvoPanelRichHeaderConfig): void => {
    _richHdrEl = document.createElement('div');
    _richHdrEl.className = 'arvo-pnl__rich-hdr';

    let contentValue: HTMLElement | string;
    let hasBack = false;
    let hasClose = false;
    let hasClear = false;
    let onBackCb: (() => void) | undefined;
    let onCloseCb: (() => void) | undefined;
    let onClearCb: (() => void) | undefined;

    if (isRichHeaderShape(config)) {
      contentValue = config.content;
      hasBack = config.hasBack === true;
      hasClose = config.hasClose === true;
      hasClear = config.hasClear === true;
      onBackCb = config.onBack;
      onCloseCb = config.onClose;
      onClearCb = config.onClear;
      // `hasClose` and `hasClear` are mutually exclusive; `hasClose`
      // wins so the trailing slot renders exactly one affordance.
      if (hasClose) hasClear = false;
    } else {
      contentValue = config;
    }

    // Leading back button -- rendered BEFORE the content so it hugs the
    // start edge of the rich-header row.
    if (hasBack) {
      const backEl = document.createElement('button');
      backEl.type = 'button';
      _richHdrBackBtn = ArvoIconButton.initialize(backEl, {
        size: 'xs',
        variant: 'tertiary',
        icon: 'arrow-left',
        tooltip: 'Back',
        isDisabled: _isDisabled,
        onClick: () => {
          if (_isDisabled) return;
          onBackCb?.();
          paneEl.dispatchEvent(
            new CustomEvent('pnl:rich-hdr-back', { bubbles: true }),
          );
        },
      });
      backEl.classList.add('arvo-pnl__rich-hdr-back');
      backEl.setAttribute('aria-label', 'Back');
      _richHdrEl.appendChild(backEl);
    }

    const contentEl = document.createElement('div');
    contentEl.className = 'arvo-pnl__rich-hdr-content';
    if (typeof contentValue === 'string') {
      contentEl.innerHTML = contentValue;
    } else if (contentValue instanceof HTMLElement) {
      contentEl.appendChild(contentValue);
    }
    _richHdrEl.appendChild(contentEl);

    if (hasClose) {
      const closeEl = document.createElement('button');
      closeEl.type = 'button';
      _richHdrCloseBtn = ArvoIconButton.initialize(closeEl, {
        size: 'xs',
        variant: 'tertiary',
        icon: 'close',
        tooltip: 'Close',
        isDisabled: _isDisabled,
        onClick: () => {
          if (_isDisabled) return;
          onCloseCb?.();
          paneEl.dispatchEvent(
            new CustomEvent('pnl:rich-hdr-close', { bubbles: true }),
          );
        },
      });
      closeEl.classList.add('arvo-pnl__rich-hdr-close');
      closeEl.setAttribute('aria-label', 'Close');
      _richHdrEl.appendChild(closeEl);
    } else if (hasClear) {
      const clearEl = document.createElement('button');
      clearEl.type = 'button';
      _richHdrClearBtn = ArvoIconButton.initialize(clearEl, {
        size: 'xs',
        variant: 'tertiary',
        icon: 'close',
        tooltip: 'Clear',
        isDisabled: _isDisabled,
        onClick: () => {
          destroyRichHeader();
          applyClasses();
          onClearCb?.();
        },
      });
      clearEl.classList.add('arvo-pnl__rich-hdr-clear');
      clearEl.setAttribute('aria-label', 'Clear rich header');
      _richHdrEl.appendChild(clearEl);
    }

    // Rich header renders BELOW the standard 40px header (see descriptor
    // + panel-ux-guidelines.md "Rich header"). Insert AFTER `.arvo-pnl__hdr`
    // so the DOM order is `__hdr -> __rich-hdr -> __sticky -> __body ->
    // __footer`. When there is no `__hdr` (e.g. `hasHeader=false`), place
    // it as the FIRST child of the pane so it still leads the content.
    const hdrEl = shell.hdrEl;
    if (hdrEl && hdrEl.parentElement === paneEl) {
      const afterHdr = hdrEl.nextSibling;
      if (afterHdr) {
        paneEl.insertBefore(_richHdrEl, afterHdr);
      } else {
        paneEl.appendChild(_richHdrEl);
      }
    } else {
      const shellFirstChild = paneEl.firstChild;
      if (shellFirstChild) {
        paneEl.insertBefore(_richHdrEl, shellFirstChild);
      } else {
        paneEl.appendChild(_richHdrEl);
      }
    }
  };
  if (options.richHeader) {
    buildRichHeader(options.richHeader as ArvoPanelRichHeaderConfig);
  }

  // -- FAB -------------------------------------------------------------
  let _fabEl: HTMLElement | null = null;
  let _fabInstance: ArvoFabButton | null = null;
  const buildFab = (config: ArvoFabButtonOptions): void => {
    _fabEl = document.createElement('div');
    _fabEl.className = 'arvo-pnl__fab';
    _fabInstance = ArvoFabButton.initialize(_fabEl, config);
    paneEl.appendChild(_fabEl);
  };
  if (options.fab) buildFab(options.fab as ArvoFabButtonOptions);

  // -- Splitter --------------------------------------------------------
  let _splitterEl: HTMLElement | null = null;
  let _splitterInstance: ArvoSplitter | null = null;
  const buildSplitter = (): void => {
    const el = document.createElement('div');
    el.className = 'arvo-pnl__splitter';
    _splitterEl = el;

    const inverse = _placement === 'right' || _placement === 'bottom';
    const currentSize = Math.min(
      Math.max(_resizedSize ?? _numericDefaultSize, _numericMinSize),
      _numericMaxSize,
    );

    _splitterInstance = ArvoSplitter.initialize(el, {
      orientation: isVertical ? 'vertical' : 'horizontal',
      inverse,
      minSize: _numericMinSize,
      maxSize: _numericMaxSize,
      value: currentSize,
      ariaLabel: 'Resize panel',
      isDisabled: _isDisabled,
      onResize: ({ value }) => {
        _resizedSize = value;
        applySizeVars();
        _opts.onResize?.(value);
        paneEl.dispatchEvent(
          new CustomEvent('pnl:resize', {
            bubbles: true,
            detail: { size: value },
          }),
        );
      },
      onResizeEnd: ({ value }) => {
        _opts.onResizeCommit?.(value);
        paneEl.dispatchEvent(
          new CustomEvent('pnl:resize-end', {
            bubbles: true,
            detail: { size: value },
          }),
        );
      },
    });

    host.appendChild(el);
  };
  if (options.isResizable && !_isExpandedState) buildSplitter();

  // -- Class / ARIA / size application --------------------------------
  const resolveIsModal = (): boolean => {
    if (_effectiveDisplayMode === 'docked') return false;
    return _opts.isModal ?? true;
  };
  const resolveCloseOnOutsideClick = (): boolean =>
    _opts.closeOnOutsideClick ?? true;
  const resolveExpandMode = (): ArvoPanelExpandMode =>
    _opts.expandMode ??
    (_effectiveDisplayMode === 'overlay' ? 'fullscreen' : 'maxSize');

  let _isAnimatingExpand = false;
  let _expandAnimTimer: ReturnType<typeof setTimeout> | null = null;

  const applyClasses = (): void => {
    const isModal = resolveIsModal();
    const expandMode = resolveExpandMode();
    const isDismissible = _opts.isDismissible ?? true;

    const classes = [
      'arvo-pnl',
      `arvo-pnl--mode-${_effectiveDisplayMode}`,
      `arvo-pnl--placement-${_placement}`,
      `arvo-pnl--type-${_panelType}`,
    ];

    classes.push(isModal ? 'arvo-pnl--modal' : 'arvo-pnl--non-modal');

    if (_isExpandedState) {
      classes.push('arvo-pnl--expanded');
      classes.push(`arvo-pnl--expand-${expandMode}`);
      classes.push('is-expanded');
    }
    if (_isAnimatingExpand) classes.push('arvo-pnl--animating-expand');
    if (_opts.isResizable) {
      classes.push('arvo-pnl--resizable');
      classes.push('arvo-pnl--with-splitter');
    }
    if (_opts.isPinnable) {
      classes.push('arvo-pnl--pinnable');
      classes.push(_isPinnedState ? 'is-pinned' : 'is-unpinned');
    }
    if (isDismissible) classes.push('arvo-pnl--dismissible');
    if (_richHdrEl) classes.push('arvo-pnl--with-rich-hdr');
    if (_opts.fab) classes.push('arvo-pnl--with-fab');
    if (_opts.isEdge) classes.push('arvo-pnl--edge');
    if (
      _effectiveDisplayMode === 'overlay' &&
      _container &&
      _container !== document.body
    ) {
      classes.push('arvo-pnl--scoped');
    }
    if (_effectiveDisplayMode === 'overlay' && _isOpenState) {
      classes.push('open');
    }
    if (_isLoading) classes.push('loading');
    if (_isDisabled) classes.push('is-disabled');
    if (_opts.extraHostClasses) classes.push(..._opts.extraHostClasses);
    if (_opts.className) classes.push(_opts.className);

    host.className = classes.join(' ');
  };

  const applyAria = (): void => {
    const computedRole =
      _effectiveDisplayMode === 'overlay'
        ? 'dialog'
        : _panelType === 'navigation'
          ? 'navigation'
          : 'region';

    paneEl.setAttribute('role', computedRole);

    if (_effectiveDisplayMode === 'overlay') {
      const isModal = resolveIsModal();
      paneEl.setAttribute('aria-modal', isModal ? 'true' : 'false');
    } else {
      paneEl.removeAttribute('aria-modal');
    }

    if (_isLoading) paneEl.setAttribute('aria-busy', 'true');
    else paneEl.removeAttribute('aria-busy');
    if (_isDisabled) paneEl.setAttribute('aria-disabled', 'true');
    else paneEl.removeAttribute('aria-disabled');

    if (_opts.ariaLabelledBy) {
      paneEl.setAttribute('aria-labelledby', _opts.ariaLabelledBy);
      paneEl.removeAttribute('aria-label');
    } else {
      const label = _opts.ariaLabel ?? _opts.title ?? undefined;
      if (label) paneEl.setAttribute('aria-label', label);
      else paneEl.removeAttribute('aria-label');
      paneEl.removeAttribute('aria-labelledby');
    }

    if (_opts.ariaDescribedBy) {
      paneEl.setAttribute('aria-describedby', _opts.ariaDescribedBy);
    } else {
      paneEl.removeAttribute('aria-describedby');
    }
  };

  const applySizeVars = (): void => {
    const size = _resizedSize ?? _numericDefaultSize;
    const sizeCss = toCssLength(size);
    const minCss = toCssLength(_numericMinSize);
    const maxCss = toCssLength(_numericMaxSize);
    if (sizeCss) host.style.setProperty('--arvo-pnl-size', sizeCss);
    if (minCss) host.style.setProperty('--arvo-pnl-min-size', minCss);
    if (maxCss) host.style.setProperty('--arvo-pnl-max-size', maxCss);
  };

  // -- Overlay engine + Escape / outside handlers ----------------------
  let _surface: OverlaySurface | null = null;
  let _closingProgrammatically = false;
  let _closingReason: ArvoPanelCloseReason = 'programmatic';
  let _escapeListener: ((e: KeyboardEvent) => void) | null = null;
  let _outsideListener: ((e: MouseEvent) => void) | null = null;

  const dispatchCloseEvent = (
    reason: ArvoPanelCloseReason,
    cancelable: boolean,
  ): void => {
    paneEl.dispatchEvent(
      new CustomEvent('pnl:close', {
        bubbles: true,
        cancelable,
        detail: { reason },
      }),
    );
  };

  const handleProgrammaticClose = (reason: ArvoPanelCloseReason): void => {
    if (_effectiveDisplayMode === 'overlay' && !_isOpenState) return;
    const veto = _opts.onClose?.(reason) === false;
    if (veto) return;
    dispatchCloseEvent(reason, true);
    _isOpenState = false;
    if (_effectiveDisplayMode === 'overlay' && _surface) {
      _closingProgrammatically = true;
      _closingReason = reason;
      void _surface.close();
      _closingProgrammatically = false;
    }
    applyClasses();
    applyAria();
    _opts.onOpenChange?.(false);
  };

  const handleEngineClose = (): void => {
    if (_closingProgrammatically) return;
    const reason: ArvoPanelCloseReason = resolveIsModal()
      ? 'mask-click'
      : 'outside-click';
    _opts.onClose?.(reason);
    dispatchCloseEvent(reason, false);
    _isOpenState = false;
    applyClasses();
    applyAria();
    _opts.onOpenChange?.(false);
  };

  const setupOverlayListeners = (): void => {
    if (_escapeListener || _outsideListener) return;
    const isDismissible = _opts.isDismissible ?? true;
    const closeOnEscape = _opts.closeOnEscape ?? true;

    if (isDismissible && closeOnEscape) {
      _escapeListener = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        if (!_isOpenState) return;
        if (_effectiveDisplayMode !== 'overlay') return;
        _opts.onClose?.('escape');
        dispatchCloseEvent('escape', false);
        _isOpenState = false;
        // Escape + outside-click paths dismiss the pane but the overlay
        // engine still owns the mask + focus trap. Close the surface so
        // its mask element is removed and focus is released; otherwise
        // the backdrop persists on top of the workspace even though the
        // pane has slid out. Guard with `_closingProgrammatically` so we
        // don't loop through the engine's own close notification.
        if (_surface) {
          _closingProgrammatically = true;
          _closingReason = 'escape';
          void _surface.close();
          _closingProgrammatically = false;
        }
        applyClasses();
        applyAria();
        _opts.onOpenChange?.(false);
      };
      document.addEventListener('keydown', _escapeListener);
    }

    const isModal = resolveIsModal();
    const closeOnOutside = resolveCloseOnOutsideClick();
    if (isDismissible && closeOnOutside && !isModal) {
      _outsideListener = (e: MouseEvent) => {
        if (!_isOpenState) return;
        if (_effectiveDisplayMode !== 'overlay') return;
        const target = e.target as Node | null;
        if (!target) return;
        if (paneEl.contains(target)) return;
        _opts.onClose?.('outside-click');
        dispatchCloseEvent('outside-click', false);
        _isOpenState = false;
        if (_surface) {
          _closingProgrammatically = true;
          _closingReason = 'outside-click';
          void _surface.close();
          _closingProgrammatically = false;
        }
        applyClasses();
        applyAria();
        _opts.onOpenChange?.(false);
      };
      document.addEventListener('mousedown', _outsideListener, true);
    }
  };

  const teardownOverlayListeners = (): void => {
    if (_escapeListener) {
      document.removeEventListener('keydown', _escapeListener);
      _escapeListener = null;
    }
    if (_outsideListener) {
      document.removeEventListener('mousedown', _outsideListener, true);
      _outsideListener = null;
    }
  };

  const createSurface = (): void => {
    const isModal = resolveIsModal();
    const closeOnOutside = resolveCloseOnOutsideClick();
    const maskContainer =
      _container && _container !== document.body ? _container : undefined;
    _surface = createOverlaySurface({
      id: overlayId,
      surface: host,
      type: 'side-panel',
      priority: 0,
      trigger: null,
      position: false,
      focus: {
        mode: isModal ? 'trap' : 'none',
        initialFocus: options.initialFocus === 'none'
          ? 'none'
          : () => resolveOverlayInitialFocus({
            initialFocus: options.initialFocus ?? 'auto',
            root: host,
            body: shell.bodyEl,
            footer: shell.footerEl,
            header: shell.hdrEl,
          }),
        returnFocus: true,
        activateAfterTransition: true,
      },
      mask: isModal
        ? {
            closeOnClick: closeOnOutside,
            className: 'arvo-pnl__overlay-mask',
            container: maskContainer,
          }
        : undefined,
      transition: null,
      transitionDuration: 200,
      closeOnOutside: false,
      triggerAria: false,
      managesOwnFocus: true,
      managesOwnBackdrop: true,
      onClose: () => handleEngineClose(),
    });
  };

  // -- Pin / Expand lifecycles -----------------------------------------
  const setPinned = (next: boolean): void => {
    if (_isPinnedState === next) return;
    _isPinnedState = next;
    _effectiveDisplayMode = resolveEffectiveDisplayMode();
    _pinBtn?.selected(next);
    _pinBtn?.setTooltip(next ? 'Unpin panel' : 'Pin panel');
    reflowDisplayMode();
    _opts.onPinChange?.(next);
    paneEl.dispatchEvent(
      new CustomEvent('pnl:pin', {
        bubbles: true,
        detail: { pinned: next },
      }),
    );
  };

  const handlePinClick = (): void => {
    if (_isDisabled || !_opts.isPinnable) return;
    setPinned(!_isPinnedState);
  };

  const beginExpandAnimation = (): void => {
    _isAnimatingExpand = true;
    if (_expandAnimTimer != null) clearTimeout(_expandAnimTimer);
    _expandAnimTimer = setTimeout(() => endExpandAnimation(), 360);
  };
  const endExpandAnimation = (): void => {
    if (!_isAnimatingExpand) return;
    _isAnimatingExpand = false;
    if (_expandAnimTimer != null) {
      clearTimeout(_expandAnimTimer);
      _expandAnimTimer = null;
    }
    applyClasses();
  };
  const handlePaneTransitionEnd = (e: TransitionEvent): void => {
    if (e.target !== paneEl) return;
    if (e.propertyName !== 'width' && e.propertyName !== 'height') return;
    endExpandAnimation();
  };
  paneEl.addEventListener('transitionend', handlePaneTransitionEnd);

  const setExpanded = (next: boolean): void => {
    if (_isExpandedState === next) return;
    beginExpandAnimation();
    _isExpandedState = next;
    applyClasses();

    if (next && _splitterInstance) {
      _splitterInstance.destroy();
      _splitterInstance = null;
      _splitterEl?.remove();
      _splitterEl = null;
    } else if (!next && _opts.isResizable && !_splitterInstance) {
      buildSplitter();
    }

    _opts.onExpandChange?.(next);
    paneEl.dispatchEvent(
      new CustomEvent('pnl:expand', {
        bubbles: true,
        detail: { isExpanded: next },
      }),
    );
  };

  const handleExpandClick = (): void => {
    if (_isDisabled || !_opts.isExpandable) return;
    setExpanded(!_isExpandedState);
  };

  // -- Container resolution + portaling --------------------------------
  const _isContainerExplicit = options.container !== undefined;
  const _originalParent = element.parentElement;
  let _container: HTMLElement | null = resolveEffectiveContainer(
    options,
    _effectiveDisplayMode,
  );

  if (
    _container &&
    _container !== element.parentElement &&
    (_effectiveDisplayMode === 'overlay' || _isContainerExplicit)
  ) {
    _container.appendChild(host);
  }

  // Apply initial classes / aria / size now that container is resolved.
  applyClasses();
  applyAria();
  applySizeVars();

  // Apply loading/disabled state.
  if (_isLoading) {
    shell.loading(true);
    host.classList.add('loading');
  }
  if (_isDisabled) {
    shell.disabled(true);
    host.classList.add('is-disabled');
  }

  const reflowDisplayMode = (): void => {
    if (_effectiveDisplayMode === 'overlay') {
      setupOverlayListeners();
      _isOpenState = true;
      _container = resolveEffectiveContainer(_opts, _effectiveDisplayMode);
      if (_container && host.parentElement !== _container) {
        _container.appendChild(host);
      }
      if (!_surface) createSurface();
      void _surface!.open();
    } else {
      teardownOverlayListeners();
      _surface?.destroy();
      _surface = null;
      host.classList.remove('open');
      if (_isContainerExplicit && _container) {
        if (host.parentElement !== _container) {
          _container.appendChild(host);
        }
      } else if (
        _originalParent &&
        host.parentElement !== _originalParent
      ) {
        _originalParent.appendChild(host);
      }
    }
    applyClasses();
    applyAria();
  };

  // -- Shell event re-emit (back, action, tab-select) ------------------
  // NOTE: `search` is handled by wrapStickyHeader's onChange so we do NOT
  // duplicate-re-emit it here (would cause duplicate `pnl:search` events).
  const shellEventBindings: Array<{ src: string; handler: (e: Event) => void }> = [];
  const wireShellEventReemit = (): void => {
    const map: Record<string, string> = {
      back: 'pnl:back',
      action: 'pnl:action',
      'tab-select': 'pnl:tab-select',
    };
    for (const [src, dest] of Object.entries(map)) {
      const handler = (e: Event) => {
        const ce = e as CustomEvent;
        paneEl.dispatchEvent(
          new CustomEvent(dest, { bubbles: true, detail: ce.detail }),
        );
      };
      paneEl.addEventListener(src, handler);
      shellEventBindings.push({ src, handler });
    }
  };
  const teardownShellEventReemit = (): void => {
    for (const { src, handler } of shellEventBindings) {
      paneEl.removeEventListener(src, handler);
    }
    shellEventBindings.length = 0;
  };
  wireShellEventReemit();

  // -- Overlay engine init (overlay mode only) -------------------------
  if (_effectiveDisplayMode === 'overlay') {
    setupOverlayListeners();
    if (_isOpenState) {
      createSurface();
      void _surface!.open();
    }
  }

  // -- Destroy ---------------------------------------------------------
  let _destroyed = false;
  const destroy = (): void => {
    if (_destroyed) return;
    _destroyed = true;

    teardownOverlayListeners();
    teardownShellEventReemit();
    paneEl.removeEventListener('search', handleShellSearchEvent);
    paneEl.removeEventListener('transitionend', handlePaneTransitionEnd);
    if (_expandAnimTimer != null) {
      clearTimeout(_expandAnimTimer);
      _expandAnimTimer = null;
    }

    _surface?.destroy();
    _surface = null;

    _pinBtn?.destroy();
    _pinBtn = null;
    _pinBtnEl = null;

    destroyRichHeader();
    destroyTitleLeading();
    destroyTitleTrailing();
    _fabInstance?.destroy();
    _fabInstance = null;
    _fabEl?.remove();
    _fabEl = null;

    shell.destroy();

    _splitterInstance?.destroy();
    _splitterInstance = null;
    _splitterEl?.remove();
    _splitterEl = null;

    paneEl.remove();

    host.className = '';
    host.style.removeProperty('--arvo-pnl-size');
    host.style.removeProperty('--arvo-pnl-min-size');
    host.style.removeProperty('--arvo-pnl-max-size');

    if (_originalParent && host.parentElement !== _originalParent) {
      _originalParent.appendChild(host);
    }
  };

  // Silence unused warnings for closure-captured state that participates
  // in the two-path close flow.
  void _closingReason;
  void _seededBodyEl;

  // ---------------------------------------------------------------------
  // Instance surface
  // ---------------------------------------------------------------------

  const instance: PanelBaseInstance = {
    hostEl: host,
    paneEl,
    bodyEl,
    shell,

    open(): void {
      if (_effectiveDisplayMode === 'docked') return;
      if (_isOpenState) return;
      if (_opts.onOpen?.() === false) return;
      _isOpenState = true;
      applyClasses();
      applyAria();
      if (!_surface) createSurface();
      void _surface!.open();
      paneEl.dispatchEvent(
        new CustomEvent('pnl:open', { bubbles: true, detail: {} }),
      );
      _opts.onOpenChange?.(true);
    },

    close(reason: ArvoPanelCloseReason = 'programmatic'): void {
      handleProgrammaticClose(reason);
    },

    toggle(): void {
      if (_effectiveDisplayMode === 'docked') return;
      if (_isOpenState) this.close('programmatic');
      else this.open();
    },

    isOpen(): boolean {
      if (_effectiveDisplayMode === 'docked') return true;
      return _isOpenState;
    },

    pinned(value?: boolean): boolean | void {
      if (value === undefined) return _isPinnedState;
      if (!_opts.isPinnable) return;
      setPinned(value);
    },

    expanded(value?: boolean): boolean | void {
      if (value === undefined) return _isExpandedState;
      setExpanded(value);
    },

    size(value?: number): number | void {
      if (value === undefined) return _resizedSize ?? _numericDefaultSize;
      const clamped = Math.min(
        Math.max(value, _numericMinSize),
        _numericMaxSize,
      );
      _resizedSize = clamped;
      applySizeVars();
    },

    setDisplayMode(mode: ArvoPanelDisplayMode): void {
      if (_opts.isPinnable) {
        setPinned(mode === 'docked');
        return;
      }
      if (_displayMode === mode) return;
      _displayMode = mode;
      _effectiveDisplayMode = resolveEffectiveDisplayMode();
      reflowDisplayMode();
    },

    setStickyHeader(config: ArvoPanelStickyHeaderConfig | false): void {
      _opts = { ..._opts, stickyHeader: config };
      shell.setStickyHeader(config);
    },

    setHeaderActions(actions: ArvoPanelHeaderAction[]): void {
      _opts = { ..._opts, headerActions: actions };
      shell.setHeaderActions(buildComposedHeaderActions());
    },

    setActions(actions: ArvoPanelAction[] | false): void {
      _opts = { ..._opts, actions };
      shell.setActions(actions);
    },

    setTitle(title: string | null): void {
      _opts = { ..._opts, title: title ?? undefined };
      shell.setTitle(title);
    },

    setIcon(icon: string | null): void {
      const nextIcon = icon && typeof icon === 'string' ? icon : null;
      _iconOverride = nextIcon ?? undefined;
      _opts = { ..._opts, icon: _iconOverride };
      updateTitleLeading(_iconOverride ?? null);
    },

    setRichHeader(config: ArvoPanelRichHeaderConfig | false): void {
      destroyRichHeader();
      if (config) buildRichHeader(config as ArvoPanelRichHeaderConfig);
      applyClasses();
    },

    replaceBody(next: HTMLElement | null): void {
      bodyEl.textContent = '';
      _seededBodyEl = next;
      if (next) bodyEl.appendChild(next);
    },

    setContent(content: PanelContent): void {
      renderContentToElement(bodyEl, content);
      _seededBodyEl = null;
    },

    search(query?: string): string | void {
      if (query === undefined) return (shell.search() as string) ?? '';
      shell.search(query);
    },

    selectedTab(id?: string): string | null | void {
      if (id === undefined) return (shell.selectedTab() as string | null) ?? null;
      shell.selectedTab(id);
    },

    loading(state?: boolean): boolean | void {
      if (state === undefined) return _isLoading;
      _isLoading = state;
      shell.loading(state);
      host.classList.toggle('loading', state);
    },

    disabled(state?: boolean): boolean | void {
      if (state === undefined) return _isDisabled;
      _isDisabled = state;
      shell.disabled(state);
      host.classList.toggle('is-disabled', state);
      _pinBtn?.disabled(state);
      _splitterInstance?.disabled(state);
    },

    focus(target?: 'first' | 'title' | 'search' | 'list'): void {
      shell.focus(target);
    },

    onSearchQueryChange(listener: (query: string) => void): () => void {
      _searchListeners.add(listener);
      listener(_searchQuery);
      return () => _searchListeners.delete(listener);
    },

    destroy,
  };

  return instance;
}
