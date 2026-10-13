import {
  createOverlaySurface,
  createResizeHandle,
  resolveOverlayInitialFocus,
} from '@arvo/core';
import type {
  ArvoInitialFocusTarget,
  OverlaySurface,
  Placement,
  PositionResult,
  ResizeHandleInstance,
  ResizeRect,
} from '@arvo/core';
import {
  attachOverlayFooterFit,
  clampFooterActions,
  type OverlayFooterFitHandle,
} from '@arvo/utils';
import { ArvoButton } from '../Button/Button';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoDropdownIconButton } from '../DropdownIconButton/DropdownIconButton';
import { ArvoSwitch } from '../Switch/Switch';
import {
  ArvoEmptyState,
  type ArvoEmptyStateOptions,
  type EmptyStateButtonAction,
} from '../EmptyState/EmptyState';
import { ArvoStatus, type ArvoStatusType } from '../Status/Status';
import { ArvoBadge, type ArvoBadgeOptions } from '../Badge/Badge';
import type { MenuItemData } from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArvoPopoverActionConfig {
  id: string;
  label?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  action?: (event: Event) => boolean | void;
  isDisabled?: boolean;
}

interface ArvoPopoverHeaderActionBase {
  id: string;
  isDisabled?: boolean;
}

export interface ArvoPopoverHeaderActionBtn extends ArvoPopoverHeaderActionBase {
  type: 'btn';
  icon: string;
  label?: string;
  onClick?: () => void;
}

/**
 * Inline header action -- rendered as ArvoButton variant='inline', size='sm'.
 * Use for header CTAs like "Apply" or "More" where a text label is desired
 * instead of an icon-only tertiary button.
 */
export interface ArvoPopoverHeaderActionInline extends ArvoPopoverHeaderActionBase {
  type: 'inline';
  label: string;
  icon?: string;
  onClick?: () => void;
}

export interface ArvoPopoverHeaderActionDropdown extends ArvoPopoverHeaderActionBase {
  type: 'dropdown';
  icon: string;
  items: MenuItemData[];
  ariaLabel?: string;
  label?: string;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  onSelect?: (id: string) => void;
}

export interface ArvoPopoverHeaderActionSwitch extends ArvoPopoverHeaderActionBase {
  type: 'switch';
  label?: string;
  isChecked?: boolean;
  defaultChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
}

export type ArvoPopoverHeaderActionConfig =
  | ArvoPopoverHeaderActionBtn
  | ArvoPopoverHeaderActionInline
  | ArvoPopoverHeaderActionDropdown
  | ArvoPopoverHeaderActionSwitch;

/**
 * Alert glyph + color set rendered in the header-left when `hasAlert=true`.
 * See spec section 6.
 */
export type ArvoPopoverAlertType =
  | 'positive'
  | 'warning'
  | 'negative'
  | 'block'
  | 'info';

/**
 * Curated subset of ArvoBadgeOptions exposed via the Popover's header
 * `badge` slot. The wiring layer forces `variant='label'`, `size='sm'`,
 * `placement='inline'`; everything else is consumer-controlled. Pass `null`
 * (default) to hide the badge.
 */
export type ArvoPopoverBadgeConfig = Pick<
  ArvoBadgeOptions,
  | 'message'
  | 'semanticType'
  | 'icon'
  | 'hasBadgeIcon'
  | 'appearance'
  | 'colorMode'
  | 'customColor'
  | 'tooltip'
>;

// Overlay empty state surface: curated subset. The wiring layer always
// renders size='sm', orientation='vertical', and only the secondaryAction
// is exposed (typically a clear-search affordance).
export type ArvoPopoverEmptyContentConfig = Pick<
  ArvoEmptyStateOptions,
  'illustration' | 'title' | 'message' | 'secondaryAction'
> & {
  secondaryAction?: EmptyStateButtonAction;
};

export interface ArvoPopoverOptions {
  variant?: 'space' | 'edge';
  placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
    | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end' | 'auto';
  title?: string;
  hasHeader?: boolean;
  isClosable?: boolean;
  hasBackButton?: boolean;
  /** Optional leading icon in the header-left (slot 3, after back + alert). */
  hasIcon?: boolean;
  /** Glyph name for the leading icon (without o9con- prefix). Required when hasIcon=true. */
  icon?: string | null;
  /** Optional decorative alert icon in the header-left (slot 2). aria-hidden. */
  hasAlert?: boolean;
  /** Semantic for the alert icon -- drives glyph + color. Defaults to 'warning'. */
  alertType?: ArvoPopoverAlertType;
  /** Optional inline ArvoStatus indicator after the title. */
  hasStatusIndicator?: boolean;
  /** Semantic for the status indicator. Forwarded to ArvoStatus. Defaults to 'available'. */
  statusType?: ArvoStatusType;
  /** Optional inline ArvoBadge slot after the status indicator. null hides it. */
  badge?: ArvoPopoverBadgeConfig | null;
  headerActions?: ArvoPopoverHeaderActionConfig[];
  stickyHeader?: HTMLElement | string | ((el: HTMLElement) => void) | null;
  /** Alias for {@link stickyHeader}. */
  stickyBody?: HTMLElement | string | ((el: HTMLElement) => void) | null;
  emptyContent?: ArvoPopoverEmptyContentConfig | null;
  content?: HTMLElement | string | ((el: HTMLElement) => void) | null;
  actions?: ArvoPopoverActionConfig[];
  /** Optional consumer-owned slot rendered on the left of the footer. */
  footerLeftSlot?: HTMLElement | string | ((el: HTMLElement) => void) | null;
  hasFooter?: boolean;
  width?: string | number | 'anchor' | null;
  offset?: number;
  trigger?: 'click' | 'hover' | 'focus';
  closeOnOutside?: boolean;
  hasArrow?: boolean;
  isLoading?: boolean;
  isInteractive?: boolean;
  isInline?: boolean;
  /**
   * Initial focus target when the interactive popover opens. `'auto'` prefers
   * the first focusable body element, then footer, then header. Pass an
   * HTMLElement/resolver to target a specific element.
   */
  initialFocus?: ArvoInitialFocusTarget | null;
  /** When true, renders a corner resize handle. Ignored when isInline=true. */
  isResizable?: boolean;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onBack?: () => void;
  /** Fired continuously while the resize handle is dragged. */
  onResize?: (rect: ResizeRect) => void;
  /** Fired once when the resize drag ends. */
  onResizeCommit?: (rect: ResizeRect) => void;
}

/**
 * Alert glyph map -- mirrors spec section 6 / React `ALERT_ICON_GLYPH`.
 */
const ALERT_ICON_GLYPH: Record<ArvoPopoverAlertType, string> = {
  positive: 'status-success-filled',
  warning: 'exclamation-triangle-filled',
  negative: 'status-error-filled',
  block: 'prohibit',
  info: 'info-circle-filled',
};

type RequiredPopoverOptions = Required<
  Omit<
    ArvoPopoverOptions,
    | 'onOpen'
    | 'onClose'
    | 'onBack'
    | 'onResize'
    | 'onResizeCommit'
    | 'stickyHeader'
    | 'stickyBody'
    | 'content'
    | 'emptyContent'
    | 'footerLeftSlot'
    | 'width'
    | 'icon'
    | 'badge'
    | 'initialFocus'
  >
> & {
  stickyHeader: HTMLElement | string | ((el: HTMLElement) => void) | null;
  content: HTMLElement | string | ((el: HTMLElement) => void) | null;
  emptyContent: ArvoPopoverEmptyContentConfig | null;
  footerLeftSlot: HTMLElement | string | ((el: HTMLElement) => void) | null;
  width: string | number | 'anchor' | null;
  icon: string | null;
  badge: ArvoPopoverBadgeConfig | null;
  initialFocus: ArvoInitialFocusTarget;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onBack: (() => void) | null;
  onResize: ((rect: ResizeRect) => void) | null;
  onResizeCommit: ((rect: ResizeRect) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function mapPlacement(p: string): Placement {
  switch (p) {
    case 'top': return 'top-start';
    case 'bottom': return 'bottom-start';
    case 'left': return 'left-start';
    case 'right': return 'right-start';
    default: return p as Placement;
  }
}

function renderContent(
  container: HTMLElement,
  content: HTMLElement | string | ((el: HTMLElement) => void),
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoPopover {
  private _element: HTMLElement | null;
  private _options: RequiredPopoverOptions;

  private _panelEl: HTMLElement | null = null;
  private _arrowEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _bodyEl: HTMLElement | null = null;
  private _footerEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _stickyHeaderEl: HTMLElement | null = null;

  private _closeBtnInstance: ArvoIconButton | null = null;
  private _backBtnInstance: ArvoIconButton | null = null;
  private _headerActionInstances: Array<
    ArvoIconButton | ArvoDropdownIconButton | ArvoSwitch | ArvoButton
  > = [];
  private _statusInstance: ArvoStatus | null = null;
  private _badgeInstance: ArvoBadge | null = null;
  private _emptyStateInstance: ArvoEmptyState | null = null;
  private _footerBtnInstances: (ArvoButton | ArvoIconButton)[] = [];
  private _footerLeftEl: HTMLElement | null = null;
  private _footerActionsEl: HTMLElement | null = null;
  private _footerFit: OverlayFooterFitHandle | null = null;
  private _resizeHostEl: HTMLElement | null = null;
  private _resizeHandle: ResizeHandleInstance | null = null;
  private _footerVisible = true;

  private _surface: OverlaySurface | null = null;
  private _panelId: string;

  private _isOpen = false;

  // Two-path close split flag: when true the programmatic path already
  // dispatched `popover:close` (cancelable). The engine's `onClose`
  // callback early-returns to avoid double-dispatch.
  private _closingProgrammatically = false;

  private _hoverOpenTimer: ReturnType<typeof setTimeout> | null = null;
  private _hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  private _boundHandleTriggerClick: (e: Event) => void;
  private _boundHandleTriggerPointerEnter: (e: Event) => void;
  private _boundHandleTriggerPointerLeave: (e: Event) => void;
  private _boundHandleTriggerFocus: (e: Event) => void;
  private _boundHandleTriggerBlur: (e: Event) => void;
  private _boundHandlePanelPointerEnter: (e: Event) => void;
  private _boundHandlePanelPointerLeave: (e: Event) => void;

  static readonly DEFAULTS: RequiredPopoverOptions = {
    variant: 'space',
    placement: 'auto',
    title: '',
    hasHeader: true,
    isClosable: true,
    hasBackButton: false,
    hasIcon: false,
    icon: null,
    hasAlert: false,
    alertType: 'warning',
    hasStatusIndicator: false,
    statusType: 'available',
    badge: null,
    headerActions: [],
    stickyHeader: null,
    content: null,
    emptyContent: null,
    actions: [],
    footerLeftSlot: null,
    hasFooter: true,
    width: null,
    offset: 4,
    trigger: 'click',
    closeOnOutside: true,
    hasArrow: false,
    isLoading: false,
    isInteractive: true,
    isInline: false,
    initialFocus: 'auto',
    isResizable: false,
    onOpen: null,
    onClose: null,
    onBack: null,
    onResize: null,
    onResizeCommit: null,
  };

  static initialize(element: HTMLElement, options?: ArvoPopoverOptions): ArvoPopover {
    return new ArvoPopover(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoPopoverOptions) {
    this._element = element;
    this._panelId = `arvo-popover-${++_idCounter}`;

    this._options = {
      ...ArvoPopover.DEFAULTS,
      ...options,
      headerActions: options?.headerActions ?? [],
      actions: options?.actions ?? [],
      stickyHeader: options?.stickyBody ?? options?.stickyHeader ?? null,
      content: options?.content ?? null,
      emptyContent: options?.emptyContent ?? null,
      footerLeftSlot: options?.footerLeftSlot ?? null,
      width: options?.width ?? null,
      icon: options?.icon ?? null,
      badge: options?.badge ?? null,
      initialFocus: options?.initialFocus ?? 'auto',
      onOpen: options?.onOpen ?? null,
      onClose: options?.onClose ?? null,
      onBack: options?.onBack ?? null,
      onResize: options?.onResize ?? null,
      onResizeCommit: options?.onResizeCommit ?? null,
    };


    this._boundHandleTriggerClick = this._handleTriggerClick.bind(this);
    this._boundHandleTriggerPointerEnter = this._handleTriggerPointerEnter.bind(this);
    this._boundHandleTriggerPointerLeave = this._handleTriggerPointerLeave.bind(this);
    this._boundHandleTriggerFocus = this._handleTriggerFocus.bind(this);
    this._boundHandleTriggerBlur = this._handleTriggerBlur.bind(this);
    this._boundHandlePanelPointerEnter = this._handlePanelPointerEnter.bind(this);
    this._boundHandlePanelPointerLeave = this._handlePanelPointerLeave.bind(this);

    // Build panel synchronously -- HybridPopover reads aria-controls
    // immediately after `new ArvoPopover()`.
    this._render();
    this._bindEvents();

    // Build the OverlaySurface IN THE CONSTRUCTOR so that `triggerAria` is
    // wired synchronously -- HybridPopover's constructor resolves the panel
    // id from `element.getAttribute('aria-controls')` right after this call.
    this._surface = createOverlaySurface({
      id: this._panelId,
      surface: this._panelEl!,
      type: 'popover',
      priority: 10,
      trigger: element,
      position: this._options.isInline
        ? false
        : {
            placement: mapPlacement(this._options.placement),
            gap: this._options.offset,
            width: this._options.width === 'anchor' ? 'anchor' : undefined,
            apply: (result: PositionResult, surface: HTMLElement) => {
              this._applyPosition(result, surface);
            },
          },
      focus: {
        mode: this._options.isInteractive ? 'trap' : 'none',
        initialFocus: this._options.initialFocus === 'none'
          ? 'none'
          : () => this._resolveInitialFocus(),
      },
      transition: 'fade',
      transitionDuration: 150,
      closeOnOutside: this._options.closeOnOutside,
      triggerAria: { haspopup: 'dialog', controls: this._panelId },
      onClose: () => this._handleEngineClose(),
    });

    if (
      this._options.isResizable &&
      !this._options.isInline &&
      this._panelEl &&
      this._resizeHostEl
    ) {
      this._mountResizeHandle();
    }
  }

  // ---------------------------------------------------------------------------
  // Resize handle (isResizable=true). Same affordance as HybridPopover --
  // single bottom-right corner grip rendered into __resize. Width/height
  // bounds match $arvo-popover-wmin / wmax / hmax (270 / 700 / 700) clamped
  // by remaining viewport space. The shared `resize-handle` SCSS mixin
  // styles the chrome; createResizeHandle from @arvo/core writes
  // `arvo-popover__handle` class via the `block` option.
  // ---------------------------------------------------------------------------

  private _mountResizeHandle(): void {
    if (!this._panelEl || !this._resizeHostEl) return;

    const POPOVER_MIN_WIDTH = 270;
    const POPOVER_MAX_WIDTH = 700;
    const POPOVER_MIN_HEIGHT = 80;
    const POPOVER_MAX_HEIGHT = 700;
    const VIEWPORT_PADDING = 16;

    const panel = this._panelEl;
    const host = this._resizeHostEl;

    this._resizeHandle = createResizeHandle(panel, {
      corners: ['bottom-right'],
      min: { width: POPOVER_MIN_WIDTH, height: POPOVER_MIN_HEIGHT },
      max: (rect: DOMRect) => ({
        width: Math.max(
          POPOVER_MIN_WIDTH,
          Math.min(
            POPOVER_MAX_WIDTH,
            window.innerWidth - rect.left - VIEWPORT_PADDING,
          ),
        ),
        height: Math.max(
          POPOVER_MIN_HEIGHT,
          Math.min(
            POPOVER_MAX_HEIGHT,
            window.innerHeight - rect.top - VIEWPORT_PADDING,
          ),
        ),
      }),
      viewportPadding: VIEWPORT_PADDING,
      block: 'arvo-popover',
      host,
      onResize: (rect: ResizeRect) => {
        this._options.onResize?.(rect);
      },
      onCommit: (rect: ResizeRect) => {
        this._options.onResizeCommit?.(rect);
      },
    });
    this._resizeHandle.mount();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(): void {
    this._panelEl = document.createElement('div');
    this._panelEl.id = this._panelId;
    this._panelEl.className = this._buildPanelClasses();
    this._panelEl.setAttribute(
      'role',
      this._options.isInteractive ? 'dialog' : 'tooltip',
    );

    if (this._options.isLoading) {
      this._panelEl.setAttribute('aria-busy', 'true');
    }

    if (this._options.isInteractive) {
      this._panelEl.tabIndex = -1;
    }

    const titleId = `${this._panelId}-title`;
    if (this._options.title) {
      this._panelEl.setAttribute('aria-labelledby', titleId);
    }

    if (this._options.hasArrow) {
      this._arrowEl = document.createElement('div');
      this._arrowEl.className = 'arvo-popover__arrow';
      this._arrowEl.setAttribute('aria-hidden', 'true');
      this._panelEl.appendChild(this._arrowEl);
    }

    if (this._options.hasHeader && this._shouldRenderHeader()) {
      this._renderHeader(titleId);
    }

    if (this._options.stickyHeader) {
      this._stickyHeaderEl = document.createElement('div');
      this._stickyHeaderEl.className = 'arvo-popover__sticky-header';
      renderContent(this._stickyHeaderEl, this._options.stickyHeader);
      this._panelEl.appendChild(this._stickyHeaderEl);
    }

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-popover__body';
    this._renderBodyContent();
    this._panelEl.appendChild(this._bodyEl);

    if (this._shouldShowFooter()) {
      this._renderFooter();
    }

    // Resize handle host -- the corner grip(s) are mounted into __resize
    // (which is `pointer-events: none; inset: 0`) so they don't catch
    // pointer events on the body. Created lazily once on render; the
    // createResizeHandle util is mounted in the constructor right after.
    if (this._options.isResizable && !this._options.isInline) {
      this._resizeHostEl = document.createElement('div');
      this._resizeHostEl.className = 'arvo-popover__resize';
      this._resizeHostEl.setAttribute('aria-hidden', 'true');
      this._panelEl.appendChild(this._resizeHostEl);
    }

    this._panelEl.addEventListener('pointerenter', this._boundHandlePanelPointerEnter);
    this._panelEl.addEventListener('pointerleave', this._boundHandlePanelPointerLeave);

    // Inline panels are inserted inside their host element by the inline
    // panel stack (action-menu / hybrid-popover); the host is `position:
    // absolute; inset: 0` and the inline modifier CSS makes the panel fill
    // it. Non-inline panels are portaled to <body> as floating overlays.
    if (this._options.isInline && this._element) {
      this._element.appendChild(this._panelEl);
    } else {
      document.body.appendChild(this._panelEl);
    }
  }

  private _shouldRenderHeader(): boolean {
    const o = this._options;
    return (
      o.isClosable ||
      !!o.title ||
      o.hasBackButton ||
      o.hasIcon ||
      o.hasAlert ||
      o.hasStatusIndicator ||
      o.badge != null ||
      o.headerActions.length > 0
    );
  }

  private _renderHeader(titleId: string): void {
    if (!this._panelEl) return;

    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-popover__header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'arvo-popover__header-left';

    // Slot 1: back button (Secondary IconButton -- matches HybridPopover /
    // Arvo Panel).
    if (this._options.hasBackButton) {
      const backBtnWrap = document.createElement('span');
      backBtnWrap.className = 'arvo-popover__back-btn';
      const backBtnEl = document.createElement('button') as HTMLButtonElement;
      backBtnWrap.appendChild(backBtnEl);
      this._backBtnInstance = ArvoIconButton.initialize(backBtnEl, {
        variant: 'secondary',
        size: 'sm',
        icon: 'arrow-left',
        tooltip: 'Back',
        isDisabled: this._options.isLoading,
        onClick: () => this._options.onBack?.(),
      });
      backBtnEl.setAttribute('aria-label', 'Back');
      headerLeft.appendChild(backBtnWrap);
    }

    // Slot 2: alert icon (decorative, aria-hidden). Color follows alertType.
    if (this._options.hasAlert) {
      const alertGlyph = ALERT_ICON_GLYPH[this._options.alertType];
      const alertEl = document.createElement('i');
      alertEl.className =
        `arvo-popover__alert-ico arvo-popover__alert-ico--${this._options.alertType} ` +
        `o9con o9con-${alertGlyph}`;
      alertEl.setAttribute('aria-hidden', 'true');
      headerLeft.appendChild(alertEl);
    }

    // Slot 3: optional leading icon (decorative, aria-hidden).
    if (this._options.hasIcon && this._options.icon) {
      const leadEl = document.createElement('i');
      leadEl.className = `arvo-popover__lead-ico o9con o9con-${this._options.icon}`;
      leadEl.setAttribute('aria-hidden', 'true');
      headerLeft.appendChild(leadEl);
    }

    // Slot 4: title.
    if (this._options.title) {
      this._titleEl = document.createElement('span');
      this._titleEl.id = titleId;
      this._titleEl.className = 'arvo-popover__title';
      this._titleEl.textContent = this._options.title;
      headerLeft.appendChild(this._titleEl);
    }

    // Slot 5: status indicator (inline ArvoStatus).
    if (this._options.hasStatusIndicator) {
      const statusWrap = document.createElement('span');
      statusWrap.className = 'arvo-popover__status';
      this._statusInstance = ArvoStatus.initialize(statusWrap, {
        type: this._options.statusType,
        size: 'sm',
        placement: 'inline',
      });
      headerLeft.appendChild(statusWrap);
    }

    // Slot 6: badge (inline ArvoBadge -- forces variant='label', size='sm',
    // placement='inline'; the rest comes from the consumer-supplied bag).
    if (this._options.badge) {
      const badgeWrap = document.createElement('span');
      badgeWrap.className = 'arvo-popover__badge';
      this._badgeInstance = ArvoBadge.initialize(badgeWrap, {
        ...this._options.badge,
        variant: 'label',
        size: 'sm',
        placement: 'inline',
      });
      headerLeft.appendChild(badgeWrap);
    }

    const headerActions = document.createElement('div');
    headerActions.className = 'arvo-popover__header-actions';

    for (const ha of this._options.headerActions) {
      const actionWrap = document.createElement('span');
      actionWrap.className = 'arvo-popover__header-action';
      actionWrap.dataset.actionId = ha.id;
      actionWrap.dataset.actionType = ha.type;

      if (ha.type === 'btn') {
        const actionBtnEl = document.createElement('button') as HTMLButtonElement;
        actionWrap.appendChild(actionBtnEl);
        const inst = ArvoIconButton.initialize(actionBtnEl, {
          variant: 'tertiary',
          size: 'sm',
          icon: ha.icon,
          tooltip: ha.label ?? ha.id,
          isDisabled: this._options.isLoading || ha.isDisabled,
          onClick: ha.onClick ? () => ha.onClick!() : undefined,
        });
        this._headerActionInstances.push(inst);
        headerActions.appendChild(actionWrap);
        continue;
      }

      if (ha.type === 'inline') {
        const actionBtnEl = document.createElement('button') as HTMLButtonElement;
        actionWrap.appendChild(actionBtnEl);
        const inst = ArvoButton.initialize(actionBtnEl, {
          variant: 'inline',
          size: 'sm',
          label: ha.label,
          icon: ha.icon ?? undefined,
          isDisabled: this._options.isLoading || ha.isDisabled,
          onClick: ha.onClick ? () => ha.onClick!() : undefined,
        });
        this._headerActionInstances.push(inst);
        headerActions.appendChild(actionWrap);
        continue;
      }

      if (ha.type === 'switch') {
        const switchEl = document.createElement('div');
        actionWrap.appendChild(switchEl);
        const inst = ArvoSwitch.initialize(switchEl, {
          isChecked: ha.isChecked ?? ha.defaultChecked ?? false,
          isDisabled: this._options.isLoading || ha.isDisabled,
          isLoading: this._options.isLoading,
          onChange: (detail) => {
            if (this._options.isLoading || ha.isDisabled) return;
            ha.onChange?.(detail.isChecked);
          },
        });
        switchEl.setAttribute('aria-label', ha.label ?? ha.id);
        this._headerActionInstances.push(inst);
        headerActions.appendChild(actionWrap);
        continue;
      }

      const triggerWrap = document.createElement('span');
      triggerWrap.className = 'arvo-popover__header-action-trigger';
      const actionBtnEl = document.createElement('button') as HTMLButtonElement;
      triggerWrap.appendChild(actionBtnEl);
      actionWrap.appendChild(triggerWrap);
      const tooltip = ha.ariaLabel ?? ha.label ?? ha.id;
      const inst = ArvoDropdownIconButton.initialize(actionBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: ha.icon,
        tooltip,
        items: ha.items,
        placement: ha.placement ?? 'bottom-end',
        isDisabled: this._options.isLoading || ha.isDisabled,
        isLoading: this._options.isLoading,
        onSelect: (item) => {
          if (this._options.isLoading || ha.isDisabled) return;
          ha.onSelect?.(item.id);
        },
      });
      this._headerActionInstances.push(inst);
      headerActions.appendChild(actionWrap);
    }

    if (this._options.isClosable) {
      const closeBtnWrap = document.createElement('span');
      closeBtnWrap.className = 'arvo-popover__close-btn';
      const closeBtnEl = document.createElement('button') as HTMLButtonElement;
      closeBtnWrap.appendChild(closeBtnEl);
      this._closeBtnInstance = ArvoIconButton.initialize(closeBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'close',
        tooltip: 'Close',
        isDisabled: this._options.isLoading,
        onClick: () => this.close(),
      });
      closeBtnEl.setAttribute('aria-label', 'Close');
      headerActions.appendChild(closeBtnWrap);
    }

    this._headerEl.appendChild(headerLeft);
    this._headerEl.appendChild(headerActions);
    this._panelEl.appendChild(this._headerEl);
  }

  private _renderFooter(): void {
    if (!this._panelEl) return;

    this._footerEl = document.createElement('div');
    this._footerEl.className = 'arvo-popover__footer';

    // Optional left slot -- rendered FIRST so the right action cluster
    // (which uses margin-inline-start: auto in SCSS) pins to the trailing
    // edge. The left slot accepts a string, HTMLElement, or render
    // callback (same shape as `content` / `stickyHeader`).
    if (this._options.footerLeftSlot) {
      this._footerLeftEl = document.createElement('div');
      this._footerLeftEl.className = 'arvo-popover__footer-left';
      renderContent(this._footerLeftEl, this._options.footerLeftSlot);
      this._footerEl.appendChild(this._footerLeftEl);
    }

    // Right action cluster -- wraps the buttons rendered from actions[].
    // Only created when actions[] is non-empty; otherwise the left slot
    // takes the full row. Clamp to the overlay-family shared max (3) via
    // the shared helper in `@arvo/utils`.
    const footerActions = clampFooterActions(this._options.actions, {
      componentName: 'ArvoPopover',
    });
    if (footerActions.length > 0) {
      this._footerActionsEl = document.createElement('div');
      this._footerActionsEl.className = 'arvo-popover__footer-actions';

      for (const action of footerActions) {
        if (action.icon && !action.label) {
          const btnEl = document.createElement('button') as HTMLButtonElement;
          const inst = ArvoIconButton.initialize(btnEl, {
            variant: (action.variant ?? 'tertiary') as 'tertiary',
            size: 'md',
            icon: action.icon,
            tooltip: action.label ?? action.id,
            isDisabled: this._options.isLoading || action.isDisabled,
            onClick: (e: Event) => this._handleFooterAction(action, e),
          });
          this._footerBtnInstances.push(inst);
          btnEl.setAttribute('data-action-id', action.id);
          this._footerActionsEl.appendChild(btnEl);
        } else {
          const btnEl = document.createElement('button') as HTMLButtonElement;
          const inst = ArvoButton.initialize(btnEl, {
            variant: action.variant ?? 'secondary',
            size: 'md',
            label: action.label,
            icon: action.icon ?? undefined,
            isDisabled: this._options.isLoading || action.isDisabled,
            onClick: (e: Event) => this._handleFooterAction(action, e),
          });
          this._footerBtnInstances.push(inst);
          btnEl.setAttribute('data-action-id', action.id);
          this._footerActionsEl.appendChild(btnEl);
        }
      }

      this._footerEl.appendChild(this._footerActionsEl);

      // Overlay-family shared rule: grow the equal-column flex basis
      // (--arvo-overlay-footer-btn-min) when labels would otherwise
      // truncate at the 112px floor. Paired with the
      // `overlay-footer-actions-layout` SCSS mixin.
      this._footerFit = attachOverlayFooterFit(this._footerActionsEl, {
        gap: 6,
      });
    }

    this._panelEl.appendChild(this._footerEl);
  }

  private _shouldShowFooter(): boolean {
    return (
      this._options.hasFooter &&
      this._footerVisible &&
      !this._options.emptyContent &&
      (this._options.actions.length > 0 || this._options.footerLeftSlot != null)
    );
  }

  private _renderBodyContent(): void {
    if (!this._bodyEl) return;

    this._emptyStateInstance?.destroy();
    this._emptyStateInstance = null;
    this._bodyEl.textContent = '';

    if (this._options.emptyContent) {
      const empty = ArvoEmptyState.create({
        ...this._options.emptyContent,
        size: 'sm',
        orientation: 'vertical',
      });
      this._emptyStateInstance = empty;
      this._bodyEl.appendChild(empty.el);
      return;
    }

    if (this._options.content) {
      renderContent(this._bodyEl, this._options.content);
    }
  }

  private _buildPanelClasses(): string {
    const {
      variant,
      hasArrow,
      isClosable,
      isLoading,
      isInline,
      isResizable,
      footerLeftSlot,
    } = this._options;
    return [
      'arvo-popover',
      variant === 'edge' && 'arvo-popover--edge',
      hasArrow && 'arvo-popover--with-arrow',
      this._shouldShowFooter() && 'arvo-popover--with-footer',
      footerLeftSlot != null && 'arvo-popover--with-footer-left',
      isClosable && 'arvo-popover--closable',
      isResizable && !isInline && 'arvo-popover--with-resize',
      isInline && 'arvo-popover--inline',
      isLoading && 'loading',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private _resolveInitialFocus(): HTMLElement | null {
    return resolveOverlayInitialFocus({
      initialFocus: this._options.initialFocus,
      root: this._panelEl,
      stickyHeader: this._stickyHeaderEl,
      body: this._bodyEl,
      footer: this._footerEl,
      header: this._headerEl,
    });
  }

  private _handleFooterAction(action: ArvoPopoverActionConfig, event: Event): void {
    const result = action.action?.(event);
    if (result !== false) this.close();
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private _bindEvents(): void {
    const el = this._element;
    if (!el) return;

    // Inline popovers have no trigger semantics: the host element is just a
    // wrapper that holds the panel inside the parent overlay's inline-panel
    // stack. Binding click/hover/focus to it is actively wrong because the
    // panel is a DOM descendant of `el`, so clicks ANYWHERE inside the panel
    // bubble up to `el` and would fire toggle/open/close. The inline popover
    // is opened and closed exclusively by its host (ActionMenu /
    // HybridPopover) via the inline-panel-stack lifecycle and by its own
    // header/footer/back controls -- never by interaction with the wrapper.
    if (this._options.isInline) return;

    const { trigger } = this._options;

    if (trigger === 'click') {
      el.addEventListener('click', this._boundHandleTriggerClick);
    } else if (trigger === 'hover') {
      el.addEventListener('pointerenter', this._boundHandleTriggerPointerEnter);
      el.addEventListener('pointerleave', this._boundHandleTriggerPointerLeave);
    } else if (trigger === 'focus') {
      el.addEventListener('focus', this._boundHandleTriggerFocus);
      el.addEventListener('blur', this._boundHandleTriggerBlur);
    }
  }

  private _handleTriggerClick(): void {
    this.toggle();
  }

  private _handleTriggerPointerEnter(): void {
    this._clearHoverTimers();
    this._hoverOpenTimer = setTimeout(() => this.open(), 150);
  }

  private _handleTriggerPointerLeave(): void {
    this._clearHoverTimers();
    this._hoverCloseTimer = setTimeout(() => this.close(), 100);
  }

  private _handleTriggerFocus(): void {
    this.open();
  }

  private _handleTriggerBlur(): void {
    setTimeout(() => {
      if (this._panelEl && !this._panelEl.contains(document.activeElement)) {
        this.close();
      }
    }, 0);
  }

  private _handlePanelPointerEnter(): void {
    if (this._options.trigger !== 'hover') return;
    this._clearHoverTimers();
  }

  private _handlePanelPointerLeave(): void {
    if (this._options.trigger !== 'hover') return;
    this._hoverCloseTimer = setTimeout(() => this.close(), 100);
  }

  private _clearHoverTimers(): void {
    if (this._hoverOpenTimer) {
      clearTimeout(this._hoverOpenTimer);
      this._hoverOpenTimer = null;
    }
    if (this._hoverCloseTimer) {
      clearTimeout(this._hoverCloseTimer);
      this._hoverCloseTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Two-path close: engine callback
  // ---------------------------------------------------------------------------

  private _handleEngineClose(): void {
    if (this._closingProgrammatically) {
      // Programmatic close already dispatched `popover:close` and handled
      // state; the engine confirms by calling onClose -- nothing else needed.
      return;
    }
    // Engine-driven path (outside-click / Escape via hub): dispatch
    // uncancelable `popover:close` on trigger, notify user callback (ignore
    // its return value -- veto is not supported on engine-driven paths).
    this._isOpen = false;
    this._clearHoverTimers();

    this._element?.dispatchEvent(
      new CustomEvent('popover:close', { bubbles: true, cancelable: false }),
    );
    this._options.onClose?.();
  }

  // ---------------------------------------------------------------------------
  // Width (kept for the `width` option: anchor / number / string)
  // ---------------------------------------------------------------------------

  private _applyWidth(): void {
    if (!this._panelEl) return;
    const w = this._options.width;
    if (w == null) {
      this._panelEl.style.removeProperty('--arvo-popover-width');
    } else if (w === 'anchor' && this._element) {
      this._panelEl.style.setProperty('--arvo-popover-width', `${this._element.offsetWidth}px`);
    } else if (typeof w === 'number') {
      this._panelEl.style.setProperty('--arvo-popover-width', `${w}px`);
    } else if (typeof w === 'string') {
      this._panelEl.style.setProperty('--arvo-popover-width', w);
    }
  }

  // ---------------------------------------------------------------------------
  // Positioning -- bespoke CSS vars
  // ---------------------------------------------------------------------------

  private _applyPosition(result: PositionResult, surface: HTMLElement): void {
    // Use the standalone `translate` CSS property (NOT `transform`) for
    // positioning so the SCSS can animate `transform` independently. Also
    // write `data-arvo-side` for direction-aware enter/exit animation.
    surface.style.translate = `${result.x}px ${result.y}px`;
    surface.setAttribute(
      'data-arvo-side',
      result.placement.startsWith('top')
        ? 'top'
        : result.placement.startsWith('left')
          ? 'left'
          : result.placement.startsWith('right')
            ? 'right'
            : 'bottom',
    );
    if (result.maxHeight != null) {
      surface.style.setProperty('--arvo-popover-max-height', `${result.maxHeight}px`);
    }
    if (result.width != null) {
      surface.style.setProperty('--arvo-popover-width', result.width);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    if (this._isOpen) return;
    if (this._options.onOpen?.() === false) return;

    this._isOpen = true;
    this._applyWidth();

    this._element?.dispatchEvent(
      new CustomEvent('popover:open', { bubbles: true }),
    );

    if (this._options.isInline) {
      // Inline panels skip the engine lifecycle (no hub, no positioning,
      // no focus trap, no Escape). Just toggle visibility.
      this._panelEl?.classList.add('open');
    } else {
      void this._surface?.open();
    }
  }

  close(): void {
    if (!this._isOpen) return;
    if (this._options.onClose?.() === false) return;

    const evt = new CustomEvent('popover:close', {
      bubbles: true,
      cancelable: true,
    });
    this._element?.dispatchEvent(evt);
    if (evt.defaultPrevented) return;

    this._isOpen = false;
    this._clearHoverTimers();

    if (this._options.isInline) {
      this._panelEl?.classList.remove('open');
    } else {
      this._closingProgrammatically = true;
      void this._surface?.close();
      this._closingProgrammatically = false;
    }
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  renderBody(content: string | HTMLElement | ((el: HTMLElement) => void)): void {
    this._options.content = content;
    this._options.emptyContent = null;
    this._renderBodyContent();
    if (this._panelEl) {
      this._panelEl.className = this._buildPanelClasses();
    }
    if (this._isOpen) this._surface?.reposition();
  }

  setLoading(isLoading: boolean): void {
    this._options.isLoading = isLoading;
    if (!this._panelEl) return;
    this._panelEl.classList.toggle('loading', isLoading);
    if (isLoading) {
      this._panelEl.setAttribute('aria-busy', 'true');
    } else {
      this._panelEl.removeAttribute('aria-busy');
    }
    this._closeBtnInstance?.disabled(isLoading);
    this._backBtnInstance?.disabled(isLoading);
    for (const inst of this._headerActionInstances) {
      inst.disabled(isLoading);
      if (inst instanceof ArvoSwitch) {
        inst.setLoading(isLoading);
      }
    }
  }

  setFooterVisible(visible: boolean): void {
    this._footerVisible = visible;
    if (!this._footerEl) return;
    this._footerEl.style.display = visible ? '' : 'none';
    if (this._panelEl) {
      this._panelEl.classList.toggle(
        'arvo-popover--with-footer',
        this._shouldShowFooter(),
      );
    }
  }

  updateFooterAction(actionId: string, props: { isDisabled?: boolean; icon?: string; label?: string }): void {
    const idx = this._options.actions.findIndex((a) => a.id === actionId);
    if (idx === -1) return;
    const action = this._options.actions[idx];
    if (props.isDisabled !== undefined) action.isDisabled = props.isDisabled;
    if (props.label !== undefined) action.label = props.label;
    if (props.icon !== undefined) action.icon = props.icon;
    const inst = this._footerBtnInstances[idx];
    if (inst && props.isDisabled !== undefined) inst.disabled(props.isDisabled);
    // Label/icon mutations can change a button's intrinsic width; remeasure
    // so the equal-column basis tracks the widest label.
    if (props.label !== undefined || props.icon !== undefined) {
      this._footerFit?.measure();
    }
  }

  reposition(): void {
    this._surface?.reposition();
  }

  destroy(): void {
    // Destroy surface first (deactivates trap, hub, positioning).
    this._surface?.destroy();
    this._surface = null;

    // Destroy resize handle (pointer listeners + handle elements + window
    // resize/scroll listeners). Must happen before the panel is removed
    // from the DOM so the util's internal cleanup runs cleanly.
    this._resizeHandle?.destroy();
    this._resizeHandle = null;

    // Disconnect the footer-fit ResizeObserver and clear the CSS variable
    // before the panel detaches.
    this._footerFit?.destroy();
    this._footerFit = null;

    this._isOpen = false;
    this._clearHoverTimers();

    const el = this._element;
    if (el) {
      el.removeEventListener('click', this._boundHandleTriggerClick);
      el.removeEventListener('pointerenter', this._boundHandleTriggerPointerEnter);
      el.removeEventListener('pointerleave', this._boundHandleTriggerPointerLeave);
      el.removeEventListener('focus', this._boundHandleTriggerFocus);
      el.removeEventListener('blur', this._boundHandleTriggerBlur);
    }

    this._closeBtnInstance?.destroy();
    this._backBtnInstance?.destroy();
    this._headerActionInstances.forEach((i) => i.destroy());
    this._statusInstance?.destroy();
    this._badgeInstance?.destroy();
    this._emptyStateInstance?.destroy();
    this._footerBtnInstances.forEach((i) => i.destroy());

    if (this._panelEl) {
      this._panelEl.removeEventListener('pointerenter', this._boundHandlePanelPointerEnter);
      this._panelEl.removeEventListener('pointerleave', this._boundHandlePanelPointerLeave);
      this._panelEl.remove();
    }

    this._element = null;
    this._panelEl = null;
    this._arrowEl = null;
    this._headerEl = null;
    this._bodyEl = null;
    this._footerEl = null;
    this._footerLeftEl = null;
    this._footerActionsEl = null;
    this._titleEl = null;
    this._stickyHeaderEl = null;
    this._resizeHostEl = null;
    this._closeBtnInstance = null;
    this._backBtnInstance = null;
    this._headerActionInstances = [];
    this._statusInstance = null;
    this._badgeInstance = null;
    this._emptyStateInstance = null;
    this._footerBtnInstances = [];
  }
}
