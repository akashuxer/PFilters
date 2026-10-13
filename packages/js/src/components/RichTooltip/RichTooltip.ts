/**
 * ArvoRichTooltip -- vanilla JS twin of the React RichTooltip component.
 *
 * Mid-weight informational overlay sitting between ArvoTooltip ("what is
 * this?") and ArvoPopover ("let me do something"). Built on the same
 * @arvo/core OverlaySurface engine as ArvoPopover, but with role="tooltip",
 * no focus trap, aria-describedby trigger wiring, and an optional
 * 12-placement nubbin pointer.
 */

import {
  applyPositionToSurface,
  createOverlaySurface,
  renderInlineContentToDOM,
  type BasicInlineContent,
  type OverlaySurface,
  type Placement,
  type PositionResult,
} from '@arvo/core';

import { ArvoStatus, type ArvoStatusType } from '../Status/Status';
import {
  ArvoBadge,
  type ArvoBadgeVariant,
  type ArvoBadgeAppearance,
  type ArvoBadgeColorMode,
  type ArvoBadgeSemanticType,
  type ArvoBadgeCustomColor,
  type ArvoBadgeCounterMode,
} from '../Badge/Badge';
import {
  ArvoBannerAlert,
  type ArvoBannerAlertType,
  type ArvoBannerAlertRole,
} from '../BannerAlert/BannerAlert';
import { ArvoLink } from '../Link/Link';
import { ArvoButtonLink } from '../ButtonLink/ButtonLink';
import { ArvoButton } from '../Button/Button';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoRichTooltipPlacement =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'right-start'
  | 'right-center'
  | 'right-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end'
  | 'left-start'
  | 'left-center'
  | 'left-end';

export type ArvoRichTooltipTrigger = 'hover' | 'focus' | 'click' | 'manual';

export type ArvoRichTooltipCloseBehavior =
  | 'escape'
  | 'outsideClick'
  | 'both'
  | 'manual';

export type ArvoRichTooltipActionKind = 'link' | 'buttonLink' | 'button';

export interface ArvoRichTooltipAction {
  id?: string;
  kind: ArvoRichTooltipActionKind;
  label: string;
  href?: string;
  onClick?: (event: Event) => void;
  icon?: string;
  isExternal?: boolean;
  isDisabled?: boolean;
}

export interface ArvoRichTooltipStatusConfig {
  type: ArvoStatusType;
  tooltip?: string;
  icon?: string;
  className?: string;
}

export interface ArvoRichTooltipBadgeConfig {
  variant?: ArvoBadgeVariant;
  appearance?: ArvoBadgeAppearance;
  colorMode?: ArvoBadgeColorMode;
  semanticType?: ArvoBadgeSemanticType;
  customColor?: ArvoBadgeCustomColor;
  message?: string;
  counterMode?: ArvoBadgeCounterMode;
  count?: number;
  total?: number | null;
  overflowCount?: number;
  hasBadgeIcon?: boolean;
  icon?: string | null;
  tooltip?: string | null;
  className?: string;
}

export interface ArvoRichTooltipBannerConfig {
  message: BasicInlineContent;
  type?: ArvoBannerAlertType;
  isDismissible?: boolean;
  role?: ArvoBannerAlertRole;
  onDismiss?: () => void;
  className?: string;
}

export interface ArvoRichTooltipOptions {
  // Initial state
  isOpen?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;

  // Trigger & placement
  trigger?: ArvoRichTooltipTrigger;
  placement?: ArvoRichTooltipPlacement;
  offset?: number;
  maxWidth?: number | string | null;

  // Pointer
  hasPointer?: boolean;

  // Header
  title?: string | HTMLElement | null;
  status?: ArvoRichTooltipStatusConfig | null;
  badge?: ArvoRichTooltipBadgeConfig | null;

  // Body
  banner?: ArvoRichTooltipBannerConfig | null;
  message?: BasicInlineContent | null;
  bodyContent?: HTMLElement | string | ((slot: HTMLElement) => void) | null;

  // Footer
  actions?: ArvoRichTooltipAction[];

  // Dismissal & a11y
  closeBehavior?: ArvoRichTooltipCloseBehavior;
  ariaLabel?: string | null;
  id?: string;

  // Callbacks
  onOpen?: (() => boolean | void) | null;
  onClose?: (() => boolean | void) | null;
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const MAX_ACTIONS = 3;
const VALID_PLACEMENTS: readonly ArvoRichTooltipPlacement[] = [
  'top-start', 'top-center', 'top-end',
  'right-start', 'right-center', 'right-end',
  'bottom-start', 'bottom-center', 'bottom-end',
  'left-start', 'left-center', 'left-end',
];
const VALID_TRIGGERS: readonly ArvoRichTooltipTrigger[] = ['hover', 'focus', 'click', 'manual'];
const VALID_CLOSE_BEHAVIORS: readonly ArvoRichTooltipCloseBehavior[] = ['escape', 'outsideClick', 'both', 'manual'];

let _idCounter = 0;

function truncateActions(
  actions: ArvoRichTooltipAction[] | undefined,
): ArvoRichTooltipAction[] {
  if (!actions || actions.length === 0) return [];
  if (actions.length <= MAX_ACTIONS) return actions;
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      `[ArvoRichTooltip] actions limited to ${MAX_ACTIONS}; received ${actions.length}. Extra actions were dropped.`,
    );
  }
  return actions.slice(0, MAX_ACTIONS);
}

function resolveCloseFlags(behavior: ArvoRichTooltipCloseBehavior): {
  closeOnEscape: boolean;
  closeOnOutside: boolean;
} {
  switch (behavior) {
    case 'escape':
      return { closeOnEscape: true, closeOnOutside: false };
    case 'outsideClick':
      return { closeOnEscape: false, closeOnOutside: true };
    case 'manual':
      return { closeOnEscape: false, closeOnOutside: false };
    case 'both':
    default:
      return { closeOnEscape: true, closeOnOutside: true };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  trigger: ArvoRichTooltipTrigger;
  placement: ArvoRichTooltipPlacement;
  offset: number;
  maxWidth: number | string | null;
  hasPointer: boolean;
  title: string | HTMLElement | null;
  status: ArvoRichTooltipStatusConfig | null;
  badge: ArvoRichTooltipBadgeConfig | null;
  banner: ArvoRichTooltipBannerConfig | null;
  message: BasicInlineContent | null;
  bodyContent: HTMLElement | string | ((slot: HTMLElement) => void) | null;
  actions: ArvoRichTooltipAction[];
  closeBehavior: ArvoRichTooltipCloseBehavior;
  ariaLabel: string | null;
  isOpen: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
}

export class ArvoRichTooltip {
  private _element: HTMLElement | null;
  private _options: ResolvedOptions;

  private _panelEl: HTMLDivElement | null = null;
  private _hdrEl: HTMLDivElement | null = null;
  private _titleEl: HTMLSpanElement | null = null;
  private _hdrMetaEl: HTMLDivElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;
  private _bannerWrapEl: HTMLDivElement | null = null;
  private _msgEl: HTMLDivElement | null = null;
  private _slotEl: HTMLDivElement | null = null;
  private _footerEl: HTMLDivElement | null = null;
  private _pointerEl: HTMLDivElement | null = null;

  private _statusInstance: ArvoStatus | null = null;
  private _badgeInstance: ArvoBadge | null = null;
  private _bannerInstance: ArvoBannerAlert | null = null;
  private _actionInstances: Array<ArvoLink | ArvoButtonLink | ArvoButton> = [];

  private _surface: OverlaySurface | null = null;
  private _panelId: string;
  private _titleId: string;

  private _isOpen = false;
  private _closingProgrammatically = false;
  // Set briefly whenever we programmatically move focus to the trigger
  // during close (a11y: user tabbed into a footer action then hit Escape /
  // outside-click). Our trigger-focus listener for `hover` / `focus`
  // triggers checks this flag so it doesn't re-open the tooltip on the
  // synthetic focus event we just dispatched. Cleared on the next
  // macrotask (setTimeout 0).
  private _suppressFocusOpen = false;
  private _suppressFocusOpenTimer: ReturnType<typeof setTimeout> | null = null;

  private _hoverOpenTimer: ReturnType<typeof setTimeout> | null = null;
  private _hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  private _boundHandleTriggerClick: (e: Event) => void;
  private _boundHandleTriggerPointerEnter: (e: Event) => void;
  private _boundHandleTriggerPointerLeave: (e: Event) => void;
  private _boundHandleTriggerFocus: (e: Event) => void;
  private _boundHandleTriggerBlur: (e: Event) => void;
  private _boundHandlePanelPointerEnter: (e: Event) => void;
  private _boundHandlePanelPointerLeave: (e: Event) => void;

  private _addedAriaDescribedBy = false;
  private _previousAriaDescribedBy: string | null = null;

  static readonly DEFAULTS: ResolvedOptions = {
    trigger: 'hover',
    placement: 'bottom-center',
    offset: 4,
    maxWidth: null,
    hasPointer: false,
    title: null,
    status: null,
    badge: null,
    banner: null,
    message: null,
    bodyContent: null,
    actions: [],
    closeBehavior: 'both',
    ariaLabel: null,
    isOpen: false,
    isDisabled: false,
    isLoading: false,
    onOpen: null,
    onClose: null,
  };

  static initialize(
    element: HTMLElement,
    options?: ArvoRichTooltipOptions,
  ): ArvoRichTooltip {
    return new ArvoRichTooltip(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoRichTooltipOptions) {
    this._element = element;
    this._panelId = options?.id ?? `arvo-rtip-${++_idCounter}`;
    this._titleId = `${this._panelId}-title`;

    const trigger =
      options?.trigger && VALID_TRIGGERS.includes(options.trigger)
        ? options.trigger
        : ArvoRichTooltip.DEFAULTS.trigger;
    const placement =
      options?.placement && VALID_PLACEMENTS.includes(options.placement)
        ? options.placement
        : ArvoRichTooltip.DEFAULTS.placement;
    const closeBehavior =
      options?.closeBehavior && VALID_CLOSE_BEHAVIORS.includes(options.closeBehavior)
        ? options.closeBehavior
        : ArvoRichTooltip.DEFAULTS.closeBehavior;

    this._options = {
      ...ArvoRichTooltip.DEFAULTS,
      ...options,
      trigger,
      placement,
      closeBehavior,
      actions: truncateActions(options?.actions),
      status: options?.status ?? null,
      badge: options?.badge ?? null,
      banner: options?.banner ?? null,
      message: options?.message ?? null,
      bodyContent: options?.bodyContent ?? null,
      title: options?.title ?? null,
      ariaLabel: options?.ariaLabel ?? null,
      maxWidth: options?.maxWidth ?? null,
      onOpen: options?.onOpen ?? null,
      onClose: options?.onClose ?? null,
      isDisabled: options?.isDisabled === true,
      isLoading: (options?.isLoading === true) === true,
      isOpen: options?.isOpen === true,
    };

    this._boundHandleTriggerClick = this._handleTriggerClick.bind(this);
    this._boundHandleTriggerPointerEnter = this._handleTriggerPointerEnter.bind(this);
    this._boundHandleTriggerPointerLeave = this._handleTriggerPointerLeave.bind(this);
    this._boundHandleTriggerFocus = this._handleTriggerFocus.bind(this);
    this._boundHandleTriggerBlur = this._handleTriggerBlur.bind(this);
    this._boundHandlePanelPointerEnter = this._handlePanelPointerEnter.bind(this);
    this._boundHandlePanelPointerLeave = this._handlePanelPointerLeave.bind(this);

    this._render();
    this._writeTriggerAriaDescribedBy();
    this._bindTriggerEvents();

    this._surface = createOverlaySurface({
      id: this._panelId,
      surface: this._panelEl!,
      type: 'tooltip',
      priority: 10,
      trigger: element,
      position: {
        placement: this._options.placement as Placement,
        gap: this._options.offset,
        // Tooltips intentionally cascade to adjacent (perpendicular) sides
        // when neither the requested side nor its opposite fits.
        flip: 'any',
        apply: (result: PositionResult, surface: HTMLElement) => {
          applyPositionToSurface(result, surface);
        },
      },
      // ArvoRichTooltip never owns focus (mode: 'none'), so the engine's
      // default "return focus to trigger on close" belt-and-braces would
      // fight our own trigger listeners. For `trigger: 'hover'` and
      // `trigger: 'focus'` we bind `focus` on the trigger (WCAG 1.4.13
      // keyboard parity). If the engine programmatically re-focuses the
      // trigger after an outside-click / pointerleave / Escape close, that
      // synthetic focus event immediately re-opens the tooltip, producing
      // the "flash close, reopen" loop reported in the playground and
      // consumer apps. Opting out here keeps focus where the user's action
      // landed and breaks the loop. When focus WAS inside the panel (user
      // tabbed into a footer action then closed), `close()` restores focus
      // to the trigger explicitly with `_suppressFocusOpen` set so our own
      // trigger-focus listener doesn't loop.
      focus: { mode: 'none', returnFocus: false },
      transition: 'fade',
      transitionDuration: 150,
      closeOnOutside: resolveCloseFlags(this._options.closeBehavior).closeOnOutside,
      triggerAria: false, // we write aria-describedby ourselves
      onClose: () => this._handleEngineClose(),
    });

    if (this._options.isOpen && !this._options.isDisabled) {
      this.open();
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(): void {
    this._panelEl = document.createElement('div');
    this._panelEl.id = this._panelId;
    this._panelEl.setAttribute('role', 'tooltip');
    this._panelEl.className = this._buildPanelClasses();

    if (this._options.isLoading) {
      this._panelEl.setAttribute('aria-busy', 'true');
    }

    if (this._options.ariaLabel) {
      this._panelEl.setAttribute('aria-label', this._options.ariaLabel);
    } else if (this._options.title) {
      this._panelEl.setAttribute('aria-labelledby', this._titleId);
    }

    if (typeof this._options.maxWidth === 'number') {
      this._panelEl.style.setProperty(
        '--arvo-rtip-max-width',
        `${this._options.maxWidth}px`,
      );
    } else if (typeof this._options.maxWidth === 'string') {
      this._panelEl.style.setProperty(
        '--arvo-rtip-max-width',
        this._options.maxWidth,
      );
    }

    if (this._shouldRenderHeader()) {
      this._renderHeader();
    }

    this._renderBody();

    if (this._shouldShowFooter()) {
      this._renderFooter();
    }

    if (this._options.hasPointer) {
      this._pointerEl = document.createElement('div');
      this._pointerEl.className = 'arvo-rtip__pointer';
      this._pointerEl.setAttribute('aria-hidden', 'true');
      this._panelEl.appendChild(this._pointerEl);
    }

    this._panelEl.addEventListener('pointerenter', this._boundHandlePanelPointerEnter);
    this._panelEl.addEventListener('pointerleave', this._boundHandlePanelPointerLeave);

    document.body.appendChild(this._panelEl);
  }

  private _shouldRenderHeader(): boolean {
    return Boolean(
      this._options.title || this._options.status || this._options.badge,
    );
  }

  private _renderHeader(): void {
    if (!this._panelEl) return;

    this._hdrEl = document.createElement('div');
    this._hdrEl.className = 'arvo-rtip__hdr';

    if (this._options.title) {
      this._titleEl = document.createElement('span');
      this._titleEl.id = this._titleId;
      this._titleEl.className = 'arvo-rtip__title';
      if (typeof this._options.title === 'string') {
        this._titleEl.textContent = this._options.title;
      } else if (this._options.title instanceof Node) {
        this._titleEl.appendChild(this._options.title);
      }
      this._hdrEl.appendChild(this._titleEl);
    }

    if (this._options.status || this._options.badge) {
      this._hdrMetaEl = document.createElement('div');
      this._hdrMetaEl.className = 'arvo-rtip__hdr-meta';

      if (this._options.status) {
        const statusHost = document.createElement('span');
        this._statusInstance = ArvoStatus.initialize(statusHost, {
          ...this._options.status,
          size: 'sm',
          placement: 'inline',
        });
        this._hdrMetaEl.appendChild(statusHost);
      }

      if (this._options.badge) {
        const badgeHost = document.createElement('span');
        this._badgeInstance = ArvoBadge.initialize(badgeHost, {
          ...this._options.badge,
          size: 'sm',
          placement: 'inline',
        });
        this._hdrMetaEl.appendChild(badgeHost);
      }

      this._hdrEl.appendChild(this._hdrMetaEl);
    }

    this._panelEl.appendChild(this._hdrEl);
  }

  private _renderBody(): void {
    if (!this._panelEl) return;

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-rtip__bdy';

    if (this._options.banner) {
      this._bannerWrapEl = document.createElement('div');
      this._bannerWrapEl.className = 'arvo-rtip__banner';
      const bannerHost = document.createElement('div');
      this._bannerInstance = ArvoBannerAlert.initialize(bannerHost, {
        message: this._options.banner.message,
        type: this._options.banner.type ?? 'warning',
        isCompact: true,
        isDismissible: this._options.banner.isDismissible !== false,
        role: this._options.banner.role,
        onDismiss: this._options.banner.onDismiss,
      });
      if (this._options.banner.className) {
        bannerHost.classList.add(...this._options.banner.className.split(/\s+/));
      }
      this._bannerWrapEl.appendChild(bannerHost);
      this._bodyEl.appendChild(this._bannerWrapEl);
    }

    if (this._options.message != null) {
      this._msgEl = document.createElement('div');
      this._msgEl.className = 'arvo-rtip__msg';
      this._writeMessage(this._msgEl, this._options.message);
      this._bodyEl.appendChild(this._msgEl);
    }

    if (this._options.bodyContent != null) {
      this._slotEl = document.createElement('div');
      this._slotEl.className = 'arvo-rtip__slot';
      this._writeBodyContent(this._slotEl, this._options.bodyContent);
      this._bodyEl.appendChild(this._slotEl);
    }

    this._panelEl.appendChild(this._bodyEl);
  }

  private _renderFooter(): void {
    if (!this._panelEl) return;

    this._footerEl = document.createElement('div');
    this._footerEl.className = 'arvo-rtip__ftr';

    for (let i = 0; i < this._options.actions.length; i++) {
      const action = this._options.actions[i];
      const actionId = action.id ?? `rtip-action-${i}`;
      const instance = this._buildAction(action, actionId);
      if (instance) {
        this._actionInstances.push(instance);
      }
    }

    this._panelEl.appendChild(this._footerEl);
  }

  private _buildAction(
    action: ArvoRichTooltipAction,
    dataActionId: string,
  ): ArvoLink | ArvoButtonLink | ArvoButton | null {
    if (!this._footerEl) return null;

    const handle = (e: Event): void => {
      if (action.isDisabled) return;
      action.onClick?.(e);
    };

    if (action.kind === 'link') {
      const a = document.createElement('a');
      a.dataset.actionId = dataActionId;
      this._footerEl.appendChild(a);
      return ArvoLink.initialize(a, {
        variant: 'primary',
        size: 'sm',
        label: action.label,
        href: action.href ?? '#',
        icon: action.icon ?? null,
        isExternal: action.isExternal === true,
        isDisabled: action.isDisabled === true,
        onClick: handle,
      });
    }

    if (action.kind === 'buttonLink') {
      const a = document.createElement('a');
      a.dataset.actionId = dataActionId;
      this._footerEl.appendChild(a);
      return ArvoButtonLink.initialize(a, {
        variant: 'outline',
        size: 'sm',
        label: action.label,
        href: action.href ?? '#',
        icon: action.icon ?? null,
        hasExternalLink: action.isExternal === true,
        isDisabled: action.isDisabled === true,
        onClick: handle,
      });
    }

    // kind === 'button'
    const btn = document.createElement('button');
    btn.dataset.actionId = dataActionId;
    this._footerEl.appendChild(btn);
    return ArvoButton.initialize(btn, {
      variant: 'inline',
      size: 'sm',
      label: action.label,
      icon: action.icon ?? null,
      isDisabled: action.isDisabled === true,
      onClick: handle,
    });
  }

  private _shouldShowFooter(): boolean {
    return this._options.actions.length > 0 && !this._options.isLoading;
  }

  private _writeMessage(target: HTMLElement, content: BasicInlineContent): void {
    while (target.firstChild) target.removeChild(target.firstChild);
    target.appendChild(
      renderInlineContentToDOM(content, { profile: 'basic-inline' }),
    );
  }

  private _writeBodyContent(
    target: HTMLElement,
    content: HTMLElement | string | ((slot: HTMLElement) => void),
  ): void {
    while (target.firstChild) target.removeChild(target.firstChild);
    if (typeof content === 'string') {
      target.textContent = content;
    } else if (typeof content === 'function') {
      content(target);
    } else if (content instanceof Node) {
      target.appendChild(content);
    }
  }

  private _buildPanelClasses(): string {
    return [
      'arvo-rtip',
      `arvo-rtip--${this._options.placement}`,
      this._options.hasPointer && 'arvo-rtip--with-pointer',
      this._shouldShowFooter() && 'arvo-rtip--with-footer',
      this._options.isLoading && 'loading',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // -------------------------------------------------------------------------
  // Trigger ARIA + events
  // -------------------------------------------------------------------------

  private _writeTriggerAriaDescribedBy(): void {
    const el = this._element;
    if (!el) return;
    const existing = el.getAttribute('aria-describedby');
    this._previousAriaDescribedBy = existing;
    const ids = existing ? existing.split(/\s+/).filter(Boolean) : [];
    if (!ids.includes(this._panelId)) {
      ids.push(this._panelId);
      el.setAttribute('aria-describedby', ids.join(' '));
      this._addedAriaDescribedBy = true;
    }
  }

  private _removeTriggerAriaDescribedBy(): void {
    const el = this._element;
    if (!el || !this._addedAriaDescribedBy) return;
    const current = el.getAttribute('aria-describedby');
    if (!current) return;
    const next = current
      .split(/\s+/)
      .filter((token) => token && token !== this._panelId);
    if (next.length > 0) {
      el.setAttribute('aria-describedby', next.join(' '));
    } else {
      el.removeAttribute('aria-describedby');
    }
    this._addedAriaDescribedBy = false;
    this._previousAriaDescribedBy = null;
  }

  private _bindTriggerEvents(): void {
    const el = this._element;
    if (!el || this._options.trigger === 'manual') return;

    if (this._options.trigger === 'click') {
      el.addEventListener('click', this._boundHandleTriggerClick);
      return;
    }

    if (this._options.trigger === 'hover') {
      el.addEventListener('pointerenter', this._boundHandleTriggerPointerEnter);
      el.addEventListener('pointerleave', this._boundHandleTriggerPointerLeave);
      // Keyboard parity per WCAG 1.4.13 -- hover triggers also open on focus.
      el.addEventListener('focus', this._boundHandleTriggerFocus);
      el.addEventListener('blur', this._boundHandleTriggerBlur);
      return;
    }

    if (this._options.trigger === 'focus') {
      el.addEventListener('focus', this._boundHandleTriggerFocus);
      el.addEventListener('blur', this._boundHandleTriggerBlur);
    }
  }

  private _unbindTriggerEvents(): void {
    const el = this._element;
    if (!el) return;
    el.removeEventListener('click', this._boundHandleTriggerClick);
    el.removeEventListener('pointerenter', this._boundHandleTriggerPointerEnter);
    el.removeEventListener('pointerleave', this._boundHandleTriggerPointerLeave);
    el.removeEventListener('focus', this._boundHandleTriggerFocus);
    el.removeEventListener('blur', this._boundHandleTriggerBlur);
  }

  private _handleTriggerClick(): void {
    if (this._options.isDisabled) return;
    this.toggle();
  }

  private _handleTriggerPointerEnter(): void {
    if (this._options.isDisabled) return;
    this._clearHoverTimers();
    this._hoverOpenTimer = setTimeout(() => this.open(), 150);
  }

  private _handleTriggerPointerLeave(): void {
    this._clearHoverTimers();
    this._hoverCloseTimer = setTimeout(() => this.close(), 100);
  }

  private _handleTriggerFocus(): void {
    if (this._options.isDisabled) return;
    // Suppress on our own programmatic focus restore during close so we
    // don't loop close -> refocus -> reopen.
    if (this._suppressFocusOpen) return;
    this.open();
  }

  private _handleTriggerBlur(): void {
    if (this._suppressFocusOpen) return;
    setTimeout(() => {
      if (
        this._panelEl &&
        document.activeElement &&
        !this._panelEl.contains(document.activeElement)
      ) {
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

  /**
   * If focus is currently inside the panel (user tabbed into a footer
   * action), move it back to the trigger before the panel unmounts so
   * keyboard users don't lose their focus context. Suppress our own
   * trigger-focus listener so the synthetic focus event doesn't
   * immediately reopen the tooltip we're trying to close.
   */
  private _restorePanelFocusToTrigger(): void {
    const trigger = this._element;
    const panel = this._panelEl;
    const active = document.activeElement;
    if (!trigger || !panel || !active) return;
    if (!panel.contains(active)) return;
    this._suppressFocusOpen = true;
    (trigger as HTMLElement).focus({ preventScroll: true });
    if (this._suppressFocusOpenTimer) {
      clearTimeout(this._suppressFocusOpenTimer);
    }
    this._suppressFocusOpenTimer = setTimeout(() => {
      this._suppressFocusOpen = false;
      this._suppressFocusOpenTimer = null;
    }, 0);
  }

  // -------------------------------------------------------------------------
  // Engine close (two-path split)
  // -------------------------------------------------------------------------

  private _handleEngineClose(): void {
    if (this._closingProgrammatically) return;
    this._isOpen = false;
    this._clearHoverTimers();
    this._restorePanelFocusToTrigger();
    this._element?.dispatchEvent(
      new CustomEvent('rtip:close', { bubbles: true, cancelable: false }),
    );
    this._dispatchOpenChange(false);
    this._options.onClose?.();
  }

  private _dispatchOpenChange(isOpen: boolean): void {
    this._element?.dispatchEvent(
      new CustomEvent('rtip:openchange', {
        bubbles: true,
        detail: { isOpen },
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  open(): void {
    if (this._isOpen || this._options.isDisabled) return;
    if (this._options.onOpen?.() === false) return;

    const evt = new CustomEvent('rtip:open', {
      bubbles: true,
      cancelable: true,
    });
    this._element?.dispatchEvent(evt);
    if (evt.defaultPrevented) return;

    this._isOpen = true;
    void this._surface?.open();
    this._dispatchOpenChange(true);
  }

  close(): void {
    if (!this._isOpen) return;
    if (this._options.onClose?.() === false) return;

    const evt = new CustomEvent('rtip:close', {
      bubbles: true,
      cancelable: true,
    });
    this._element?.dispatchEvent(evt);
    if (evt.defaultPrevented) return;

    this._isOpen = false;
    this._clearHoverTimers();
    this._restorePanelFocusToTrigger();
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;
    this._dispatchOpenChange(false);
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  disabled(): boolean;
  disabled(value: boolean): void;
  disabled(value?: boolean): boolean | void {
    if (value === undefined) return this._options.isDisabled;
    this._options.isDisabled = value === true;
    if (this._options.isDisabled && this._isOpen) {
      this.close();
    }
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading === true;
    if (!this._panelEl) return;
    this._panelEl.classList.toggle('loading', this._options.isLoading);
    if (this._options.isLoading) {
      this._panelEl.setAttribute('aria-busy', 'true');
    } else {
      this._panelEl.removeAttribute('aria-busy');
    }
  }

  setActions(actions: ArvoRichTooltipAction[]): void {
    this._options.actions = truncateActions(actions);
    this._destroyActionInstances();
    if (this._footerEl) {
      this._footerEl.remove();
      this._footerEl = null;
    }
    if (this._shouldShowFooter() && this._panelEl) {
      this._renderFooter();
    }
    if (this._panelEl) {
      this._panelEl.className = this._buildPanelClasses();
    }
    if (this._isOpen) this._surface?.reposition();
  }

  renderMessage(content: BasicInlineContent): void {
    this._options.message = content;
    if (!this._panelEl || !this._bodyEl) return;
    if (!this._msgEl) {
      this._msgEl = document.createElement('div');
      this._msgEl.className = 'arvo-rtip__msg';
      if (this._slotEl) {
        this._bodyEl.insertBefore(this._msgEl, this._slotEl);
      } else {
        this._bodyEl.appendChild(this._msgEl);
      }
    }
    this._writeMessage(this._msgEl, content);
    if (this._isOpen) this._surface?.reposition();
  }

  reposition(): void {
    this._surface?.reposition();
  }

  get element(): HTMLDivElement | null {
    return this._panelEl;
  }

  get triggerId(): string {
    return this._panelId;
  }

  private _destroyActionInstances(): void {
    for (const inst of this._actionInstances) {
      const candidate = inst as { destroy?: () => void };
      if (typeof candidate.destroy === 'function') candidate.destroy();
    }
    this._actionInstances = [];
  }

  destroy(): void {
    // Destroy surface first (deactivates engine + hub registration).
    this._surface?.destroy();
    this._surface = null;

    this._isOpen = false;
    this._clearHoverTimers();
    if (this._suppressFocusOpenTimer) {
      clearTimeout(this._suppressFocusOpenTimer);
      this._suppressFocusOpenTimer = null;
    }
    this._suppressFocusOpen = false;
    this._unbindTriggerEvents();
    this._removeTriggerAriaDescribedBy();

    this._statusInstance?.destroy();
    this._statusInstance = null;
    this._badgeInstance = null; // ArvoBadge keeps no event listeners outside its host span
    this._bannerInstance?.destroy?.();
    this._bannerInstance = null;
    this._destroyActionInstances();

    if (this._panelEl) {
      this._panelEl.removeEventListener('pointerenter', this._boundHandlePanelPointerEnter);
      this._panelEl.removeEventListener('pointerleave', this._boundHandlePanelPointerLeave);
      this._panelEl.remove();
    }

    this._element = null;
    this._panelEl = null;
    this._hdrEl = null;
    this._titleEl = null;
    this._hdrMetaEl = null;
    this._bodyEl = null;
    this._bannerWrapEl = null;
    this._msgEl = null;
    this._slotEl = null;
    this._footerEl = null;
    this._pointerEl = null;
  }
}
