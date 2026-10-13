// ArvoAvatarGroup -- vanilla JS twin of the React component.
//
// Composite parent that stacks ArvoAvatar instances inside background-ring
// wrappers, with a `+N` overflow tile that opens an ArvoPopover hosting an
// Avatar Item Container (a vertical list of avatar + label rows).
//
// Parity contract: option key set, BEM classes, event names, public method
// names + signatures MUST match `@arvo/react` ArvoAvatarGroup.

import {
  connectTooltip,
  createTabRoving,
  tooltipManager,
  type TabRoving,
  type TooltipConnector,
} from '@arvo/core';
import { ArvoAvatar, type ArvoAvatarOptions, type ArvoAvatarSize } from '../Avatar/Avatar';
import { ArvoPopover, type ArvoPopoverOptions } from '../Popover/Popover';

// ---------------------------------------------------------------------------
// Public types (mirror the React props)
// ---------------------------------------------------------------------------

export type ArvoAvatarGroupSize = ArvoAvatarSize;

/** Single item rendered by the group. Inherits the full ArvoAvatar option
 *  surface (variant, name, src, href, etc.) and adds a required `id`. */
export interface AvatarGroupItem
  extends Omit<ArvoAvatarOptions, 'size' | 'isLoading'> {
  id: string;
}

/** Hybrid escape-hatch bag for the underlying ArvoPopover. */
export type ArvoAvatarGroupPopoverOptions = Pick<
  ArvoPopoverOptions,
  | 'width'
  | 'isInline'
  | 'closeOnOutside'
  | 'offset'
  | 'onOpen'
  | 'onClose'
>;

export interface ArvoAvatarGroupOptions {
  avatars?: AvatarGroupItem[];
  size?: ArvoAvatarGroupSize;
  maxCount?: number;
  hasTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom';
  label?: string;
  moreIndicatorLabel?: string;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onMoreClick?: (event: MouseEvent) => void;
  overflowPlacement?: 'top' | 'bottom';
  popoverProps?: ArvoAvatarGroupPopoverOptions | null;
  isDisabled?: boolean;
  isLoading?: boolean;
  id?: string;
}

interface ResolvedOptions {
  avatars: AvatarGroupItem[];
  size: ArvoAvatarGroupSize;
  maxCount: number;
  hasTooltip: boolean;
  tooltipPosition: 'top' | 'bottom';
  label: string;
  moreIndicatorLabel: string | null;
  isOpen: boolean | null;
  defaultOpen: boolean;
  onOpenChange: ((isOpen: boolean) => void) | null;
  onMoreClick: ((event: MouseEvent) => void) | null;
  overflowPlacement: 'top' | 'bottom';
  popoverProps: ArvoAvatarGroupPopoverOptions | null;
  isDisabled: boolean;
  isLoading: boolean;
  id: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SIZES: readonly ArvoAvatarGroupSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

const DEFAULTS: ResolvedOptions = {
  avatars: [],
  size: 'md',
  maxCount: 5,
  hasTooltip: true,
  tooltipPosition: 'bottom',
  label: 'avatar group',
  moreIndicatorLabel: null,
  isOpen: null,
  defaultOpen: false,
  onOpenChange: null,
  onMoreClick: null,
  overflowPlacement: 'bottom',
  popoverProps: null,
  isDisabled: false,
  isLoading: false,
  id: null,
};

function clampMaxCount(input: number | undefined): number {
  if (!Number.isFinite(input as number)) return DEFAULTS.maxCount;
  const n = Math.floor(input as number);
  return n < 1 ? 1 : n;
}

function pickEnum<T extends string>(
  value: T | undefined,
  valid: readonly T[],
  fallback: T,
): T {
  return value !== undefined && valid.includes(value) ? value : fallback;
}

function defaultMoreLabel(hiddenCount: number): string {
  return `${hiddenCount} additional collaborators`;
}

function hiddenNamesPhrase(hidden: AvatarGroupItem[], cap = 8): string {
  const names = hidden
    .map((h) => h.name ?? h.alt ?? h.id)
    .filter(Boolean) as string[];
  if (names.length === 0) return '';
  if (names.length <= cap) return names.join(', ');
  return `${names.slice(0, cap).join(', ')}, and ${names.length - cap} more`;
}

function rowLabel(item: AvatarGroupItem): string {
  return item.name ?? item.alt ?? item.id;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoAvatarGroup {
  /** The host element passed to initialize. Decorated in place. */
  readonly el: HTMLElement;

  private _opts: ResolvedOptions;
  private _destroyed = false;
  private _isOpen = false;

  // Children -- visible avatar instances inside `__item` wrappers.
  private _childAvatars: ArvoAvatar[] = [];

  // Overflow tile + popover + popover-row avatar instances.
  private _overflowWrapEl: HTMLElement | null = null;
  private _overflowBtn: HTMLButtonElement | null = null;
  private _popover: ArvoPopover | null = null;
  private _popoverChildAvatars: ArvoAvatar[] = [];
  private _tooltipConnector: TooltipConnector | null = null;

  // Roving tabindex across visible avatars + overflow tile so Tab focuses
  // the first item, ArrowLeft / ArrowRight (Home / End) navigate, and Tab
  // leaves the group entirely (matches the React twin).
  private _tabRoving: TabRoving | null = null;

  private _onMoreClickBound: ((event: MouseEvent) => void) | null = null;
  private _onPopoverOpenBound: ((event: Event) => void) | null = null;
  private _onPopoverCloseBound: ((event: Event) => void) | null = null;

  static readonly SIZES = VALID_SIZES;

  static initialize(
    element: HTMLElement | null,
    options?: ArvoAvatarGroupOptions,
  ): ArvoAvatarGroup {
    const host = element ?? document.createElement('div');
    return new ArvoAvatarGroup(host, options);
  }

  constructor(element: HTMLElement, options?: ArvoAvatarGroupOptions) {
    this.el = element;
    this._opts = this._normalize(options);
    this._isOpen = this._opts.isOpen ?? this._opts.defaultOpen;
    this._render();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  private _normalize(options: ArvoAvatarGroupOptions | undefined): ResolvedOptions {
    const o = options ?? {};
    return {
      avatars: Array.isArray(o.avatars) ? o.avatars : DEFAULTS.avatars,
      size: pickEnum(o.size, VALID_SIZES, DEFAULTS.size),
      maxCount: clampMaxCount(o.maxCount),
      hasTooltip: o.hasTooltip ?? DEFAULTS.hasTooltip,
      tooltipPosition: pickEnum(
        o.tooltipPosition,
        ['top', 'bottom'] as const,
        DEFAULTS.tooltipPosition,
      ),
      label: o.label ?? DEFAULTS.label,
      moreIndicatorLabel: o.moreIndicatorLabel ?? null,
      isOpen: o.isOpen ?? null,
      defaultOpen: o.defaultOpen ?? DEFAULTS.defaultOpen,
      onOpenChange: o.onOpenChange ?? null,
      onMoreClick: o.onMoreClick ?? null,
      overflowPlacement: pickEnum(
        o.overflowPlacement,
        ['top', 'bottom'] as const,
        DEFAULTS.overflowPlacement,
      ),
      popoverProps: o.popoverProps ?? null,
      isDisabled: o.isDisabled ?? DEFAULTS.isDisabled,
      isLoading: o.isLoading ?? DEFAULTS.isLoading,
      id: o.id ?? null,
    };
  }

  private _visibleHiddenSplit(): {
    visible: AvatarGroupItem[];
    hidden: AvatarGroupItem[];
  } {
    const { avatars, maxCount } = this._opts;
    if (avatars.length <= maxCount) {
      return { visible: avatars, hidden: [] };
    }
    const visibleCount = Math.max(0, maxCount - 1);
    return {
      visible: avatars.slice(0, visibleCount),
      hidden: avatars.slice(visibleCount),
    };
  }

  private _render(): void {
    this._teardownChildren();
    this.el.textContent = '';

    if (this._opts.id) this.el.id = this._opts.id;

    this._applyRootClasses();
    this._applyRootAttributes();

    const isLoading = this._opts.isLoading === true;
    const { visible, hidden } = this._visibleHiddenSplit();

    // Visible avatars
    for (const item of visible) {
      const wrap = document.createElement('span');
      wrap.className = 'arvo-avt-grp__item';
      const host = document.createElement('span');
      wrap.appendChild(host);
      this.el.appendChild(wrap);
      this._childAvatars.push(
        ArvoAvatar.initialize(host, {
          ...item,
          size: this._opts.size,
          isDisabled: this._opts.isDisabled || item.isDisabled,
          isLoading,
          tooltip: this._opts.hasTooltip
            ? (item.tooltip ?? item.name ?? item.alt ?? null)
            : null,
        } as ArvoAvatarOptions),
      );
    }

    // Overflow tile + popover
    if (hidden.length > 0) {
      this._renderOverflow(hidden);
    }

    // Roving tabindex across visible avatars + overflow tile.
    this._setupTabRoving();
  }

  // -------------------------------------------------------------------------
  // Roving tabindex
  // -------------------------------------------------------------------------

  /**
   * Collect the focusable elements that participate in the roving rotation:
   * the inner element of every visible avatar (`.arvo-avt` -- a `<button>`,
   * `<a>`, or `<span>` depending on interactivity) and the overflow tile.
   * Returned in left-to-right DOM order.
   */
  private _getRovingItems(): HTMLElement[] {
    const items: HTMLElement[] = [];
    const wrappers = this.el.querySelectorAll<HTMLElement>(
      '.arvo-avt-grp__item',
    );
    wrappers.forEach((wrap) => {
      if (wrap.classList.contains('arvo-avt-grp__item--overflow')) {
        if (this._overflowBtn) items.push(this._overflowBtn);
        return;
      }
      const inner = wrap.querySelector<HTMLElement>('.arvo-avt');
      if (inner) items.push(inner);
    });
    return items;
  }

  private _setupTabRoving(): void {
    this._teardownTabRoving();
    const items = this._getRovingItems();
    if (items.length === 0) return;
    const roving = createTabRoving();
    roving.activate({
      container: this.el,
      items,
      orientation: 'horizontal',
      wrap: true,
    });
    this._tabRoving = roving;
  }

  private _teardownTabRoving(): void {
    if (!this._tabRoving) return;
    this._tabRoving.deactivate();
    this._tabRoving = null;
  }

  private _renderOverflow(hidden: AvatarGroupItem[]): void {
    const wrap = document.createElement('span');
    wrap.className = 'arvo-avt-grp__item arvo-avt-grp__item--overflow';
    this._overflowWrapEl = wrap;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arvo-avt-grp__overflow';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('data-arvo-loading-ignore', 'true');
    btn.textContent = `+${hidden.length}`;
    this._overflowBtn = btn;
    wrap.appendChild(btn);
    this.el.appendChild(wrap);

    this._applyOverflowState();

    // Build the Avatar Item Container body element.
    const listEl = document.createElement('ul');
    listEl.className = 'arvo-avt-grp__list';
    listEl.setAttribute('role', 'list');
    for (const item of hidden) {
      const li = document.createElement('li');
      li.className = 'arvo-avt-grp__list-item';

      const avtHost = document.createElement('span');
      li.appendChild(avtHost);

      const lbl = document.createElement('span');
      lbl.className = 'arvo-avt-grp__list-lbl';
      lbl.textContent = rowLabel(item);
      li.appendChild(lbl);

      listEl.appendChild(li);
      this._popoverChildAvatars.push(
        ArvoAvatar.initialize(avtHost, {
          ...item,
          size: 'sm',
          isInteractive: false,
          isLoading: false,
        } as ArvoAvatarOptions),
      );
    }

    // Initialize Popover. The button is the anchor.
    const placement: ArvoPopoverOptions['placement'] =
      this._opts.overflowPlacement === 'top' ? 'top-end' : 'bottom-end';

    this._popover = ArvoPopover.initialize(btn, {
      ...(this._opts.popoverProps ?? {}),
      content: listEl,
      placement,
      offset: this._opts.popoverProps?.offset ?? 4,
      // Strip all chrome (no header, footer, back, close, arrow).
      hasHeader: false,
      hasFooter: false,
      hasArrow: false,
      isClosable: false,
      hasBackButton: false,
      title: '',
      headerActions: [],
      actions: [],
    });

    // Click interception runs in CAPTURE phase so it always fires BEFORE
    // ArvoPopover's bubble-phase trigger handler. That ordering lets us:
    //
    //   (a) Fire the cancelable `avt-grp:more-click` event + invoke the
    //       consumer's `onMoreClick` BEFORE the popover toggles, so a
    //       `preventDefault()` from either path can suppress the open by
    //       calling `stopImmediatePropagation()` here.
    //   (b) Suppress the popover toggle entirely while the group is
    //       disabled / loading, even though the overflow button is also
    //       marked `disabled` (defense in depth -- the `disabled` attr is
    //       removed during setters before the next paint).
    //
    // We deliberately do NOT call `this._popover.open()` / `.close()` from
    // here: ArvoPopover owns its own click-to-toggle. Doing both produced
    // a flicker where the popover opened (popover's handler) and then
    // immediately closed (our handler reading the just-flipped `_isOpen`
    // via the `popover:open` listener and routing it to `close()`).
    this._onMoreClickBound = (event) => this._handleMoreClick(event);
    btn.addEventListener('click', this._onMoreClickBound, { capture: true });

    // Track popover open/close transitions so we can update aria-expanded,
    // the is-open class, dispatch our own events, and notify onOpenChange.
    this._onPopoverOpenBound = () => this._handlePopoverTransition(true);
    this._onPopoverCloseBound = () => this._handlePopoverTransition(false);
    btn.addEventListener('popover:open', this._onPopoverOpenBound);
    btn.addEventListener('popover:close', this._onPopoverCloseBound);

    // Tooltip on the overflow button.
    this._attachOverflowTooltip(hidden);

    // Sync initial open state (controlled or defaultOpen) -- _isOpen was
    // seeded in the constructor.
    const blocked = this._opts.isDisabled || this._opts.isLoading === true;
    if (this._isOpen && !blocked) {
      this._popover.open();
    }
  }

  private _attachOverflowTooltip(hidden: AvatarGroupItem[]): void {
    if (!this._overflowBtn) return;
    if (this._tooltipConnector) {
      this._tooltipConnector.destroy();
      this._tooltipConnector = null;
    }
    const content =
      this._opts.hasTooltip && hidden.length > 0
        ? hiddenNamesPhrase(hidden)
        : (this._opts.moreIndicatorLabel ?? defaultMoreLabel(hidden.length));
    this._tooltipConnector = connectTooltip(tooltipManager, {
      anchor: this._overflowBtn,
      content,
      placement:
        this._opts.tooltipPosition === 'top' ? 'top-center' : 'bottom-center',
    });
  }

  private _detachOverflowTooltip(): void {
    if (this._tooltipConnector) {
      this._tooltipConnector.destroy();
      this._tooltipConnector = null;
    }
  }

  private _teardownChildren(): void {
    this._teardownTabRoving();

    for (const child of this._childAvatars) child.destroy();
    this._childAvatars = [];
    for (const child of this._popoverChildAvatars) child.destroy();
    this._popoverChildAvatars = [];

    if (this._overflowBtn) {
      if (this._onMoreClickBound) {
        this._overflowBtn.removeEventListener(
          'click',
          this._onMoreClickBound,
          { capture: true },
        );
      }
      if (this._onPopoverOpenBound) {
        this._overflowBtn.removeEventListener('popover:open', this._onPopoverOpenBound);
      }
      if (this._onPopoverCloseBound) {
        this._overflowBtn.removeEventListener('popover:close', this._onPopoverCloseBound);
      }
    }
    this._onMoreClickBound = null;
    this._onPopoverOpenBound = null;
    this._onPopoverCloseBound = null;

    this._detachOverflowTooltip();

    if (this._popover) {
      this._popover.destroy();
      this._popover = null;
    }

    this._overflowWrapEl = null;
    this._overflowBtn = null;
  }

  // -------------------------------------------------------------------------
  // Class / attribute application
  // -------------------------------------------------------------------------

  private _applyRootClasses(): void {
    const isLoading = this._opts.isLoading === true;
    const classes = ['arvo-avt-grp', `arvo-avt-grp--${this._opts.size}`];
    if (isLoading) classes.push('loading');
    this.el.className = classes.join(' ');
  }

  private _applyRootAttributes(): void {
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', this._opts.label);
    const isLoading = this._opts.isLoading === true;
    if (isLoading) {
      this.el.setAttribute('aria-busy', 'true');
      this.el.setAttribute('data-arvo-loading', 'true');
    } else {
      this.el.removeAttribute('aria-busy');
      this.el.removeAttribute('data-arvo-loading');
    }
    if (this._opts.isDisabled) {
      this.el.setAttribute('aria-disabled', 'true');
    } else {
      this.el.removeAttribute('aria-disabled');
    }
  }

  private _applyOverflowState(): void {
    if (!this._overflowBtn) return;
    const blocked = this._opts.isDisabled || this._opts.isLoading === true;
    const { hidden } = this._visibleHiddenSplit();

    const resolvedMoreLabel =
      this._opts.moreIndicatorLabel ?? defaultMoreLabel(hidden.length);
    this._overflowBtn.setAttribute('aria-label', resolvedMoreLabel);
    this._overflowBtn.setAttribute(
      'aria-expanded',
      String(this._isOpen && !blocked),
    );

    this._overflowBtn.classList.toggle(
      'is-open',
      this._isOpen && !blocked,
    );

    if (blocked) {
      this._overflowBtn.setAttribute('aria-disabled', 'true');
      this._overflowBtn.setAttribute('disabled', '');
    } else {
      this._overflowBtn.removeAttribute('aria-disabled');
      this._overflowBtn.removeAttribute('disabled');
    }
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private _handleMoreClick(event: MouseEvent): void {
    const blocked =
      this._opts.isDisabled || this._opts.isLoading === true;
    if (blocked) {
      // Suppress the popover's bubble-phase click handler so it cannot
      // toggle while we are blocked. `stopImmediatePropagation` is the
      // only reliable way to short-circuit a co-attached listener on the
      // same element regardless of registration order.
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    // Fire our custom cancelable event first; if consumer cancels via the
    // event OR via `onMoreClick(event).preventDefault()`, suppress the
    // popover toggle by stopping immediate propagation. Otherwise let the
    // popover's own click handler toggle the panel naturally.
    const customEvt = new CustomEvent('avt-grp:more-click', {
      bubbles: true,
      cancelable: true,
      detail: { originalEvent: event },
    });
    this.el.dispatchEvent(customEvt);
    this._opts.onMoreClick?.(event);

    if (customEvt.defaultPrevented || event.defaultPrevented) {
      event.stopImmediatePropagation();
    }
  }

  private _handlePopoverTransition(opened: boolean): void {
    if (this._isOpen === opened) return;
    // In controlled mode we still update the visual class / aria so the UI
    // reflects the engine's state, but we do NOT mutate internal _isOpen
    // when the consumer is driving it. However our internal state for the
    // class application must follow the engine (which is what actually
    // shows/hides the popover). The onOpenChange callback informs the
    // consumer of the new state.
    this._isOpen = opened;
    this._applyOverflowState();
    this.el.dispatchEvent(
      new CustomEvent(opened ? 'avt-grp:open' : 'avt-grp:close', {
        bubbles: true,
      }),
    );
    this._opts.onOpenChange?.(opened);
  }

  // -------------------------------------------------------------------------
  // Public API (mirrors the React props as setters + dual-purpose accessors)
  // -------------------------------------------------------------------------

  setAvatars(avatars: AvatarGroupItem[]): void {
    this._opts.avatars = Array.isArray(avatars) ? avatars : [];
    this._isOpen = false;
    this._render();
  }

  setSize(size: ArvoAvatarGroupSize): void {
    if (!VALID_SIZES.includes(size)) return;
    this._opts.size = size;
    this._render();
  }

  setMaxCount(count: number): void {
    this._opts.maxCount = clampMaxCount(count);
    this._render();
  }

  setHasTooltip(enabled: boolean): void {
    this._opts.hasTooltip = !!enabled;
    this._render();
  }

  setLabel(label: string): void {
    this._opts.label = label;
    this.el.setAttribute('aria-label', label);
  }

  /** Dual-purpose getter/setter for the disabled state. */
  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    this._opts.isDisabled = !!state;
    for (const child of this._childAvatars) child.disabled(this._opts.isDisabled);
    this._applyRootAttributes();
    this._applyOverflowState();
    if (this._opts.isDisabled && this._isOpen) {
      this._popover?.close();
    }
  }

  /** Dual-purpose getter/setter for the loading state. */
  loading(): boolean;
  loading(state: boolean): void;
  loading(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isLoading;
    this._opts.isLoading = !!state;
    for (const child of this._childAvatars) child.loading(this._opts.isLoading);
    this._applyRootClasses();
    this._applyRootAttributes();
    this._applyOverflowState();
    if (this._opts.isLoading && this._isOpen) {
      this._popover?.close();
    }
  }

  /** Dual-purpose getter/setter for the overflow Popover open state. */
  open(): boolean;
  open(state: boolean): void;
  open(state?: boolean): boolean | void {
    if (state === undefined) return this._isOpen;
    if (!this._popover) return;
    if (this._opts.isDisabled || this._opts.isLoading === true) return;
    if (state) this._popover.open();
    else this._popover.close();
  }

  /** Tear down children + popover + listeners. Host element is preserved. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._teardownChildren();
    this.el.textContent = '';
    this.el.removeAttribute('class');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-label');
    this.el.removeAttribute('aria-busy');
    this.el.removeAttribute('aria-disabled');
    this.el.removeAttribute('data-arvo-loading');
  }
}

export default ArvoAvatarGroup;
