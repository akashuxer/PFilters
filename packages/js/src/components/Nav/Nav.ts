import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoToggleButton } from '../ToggleButton/ToggleButton';
import {
  ArvoDropdownIconButton,
  type ArvoDropdownIconButtonOptions,
} from '../DropdownIconButton/DropdownIconButton';
import { ArvoAvatar, type ArvoAvatarOptions } from '../Avatar/Avatar';
import { ArvoStatus, type ArvoStatusOptions, type ArvoStatusType } from '../Status/Status';
import { ArvoBadge, type ArvoBadgeOptions, type ArvoBadgeSemanticType } from '../Badge/Badge';
import type { MenuItemData } from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { ArvoStatusType, ArvoBadgeSemanticType, MenuItemData };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArvoNavSize = 'sm' | 'md' | 'lg';

/** Curated avatar config exposed on a NavItem -- size is parent-owned (xs). */
export interface ArvoNavItemAvatarConfig {
  variant?: ArvoAvatarOptions['variant'];
  name?: string;
  src?: string;
  icon?: string;
  colorMode?: ArvoAvatarOptions['colorMode'];
  semanticType?: ArvoAvatarOptions['semanticType'];
  customColor?: ArvoAvatarOptions['customColor'];
  tooltip?: string;
  alt?: string;
}

export interface NavItemAction {
  id: string;
  icon: string;
  tooltip: string;
  isDisabled?: boolean;
  /**
   * Click handler. The event is undefined when the action fires via
   * the overflow menu (no synthetic event available). Most consumers
   * can ignore the event arg.
   */
  onClick?: (event?: Event) => void;
}

export interface ArvoNavItemData {
  id: string;
  label: string;
  href?: string;
  target?: string;
  rel?: string;
  icon?: string;
  avatar?: ArvoNavItemAvatarConfig;
  status?: { type: ArvoStatusType; label?: string };
  badge?: { message: string; semanticType?: ArvoBadgeSemanticType };
  actions?: NavItemAction[];
  menuItems?: MenuItemData[];
  isPinned?: boolean;
  isPinnable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  tooltip?: string;
  avatarProps?: Pick<ArvoAvatarOptions, 'appearance' | 'isInteractive' | 'alt'>;
  statusProps?: Pick<ArvoStatusOptions, 'icon'>;
  /**
   * Scoped escape-hatch bag for the inner ArvoBadge. The nav badge slot is
   * label-only by design -- `icon` and `hasBadgeIcon` are intentionally
   * excluded so the consumer cannot grow an icon glyph on a nav badge.
   */
  badgeProps?: Pick<ArvoBadgeOptions, 'colorMode' | 'customColor'>;
  menuProps?: NavMenuProps;
}

/**
 * Scoped escape-hatch bag for the per-row overflow trigger
 * `ArvoDropdownIconButton`. `isCompact` is parent-owned and excluded.
 */
export type NavMenuProps = Pick<
  ArvoDropdownIconButtonOptions,
  'placement' | 'maxHeight' | 'hasGroupDividers' | 'search' | 'menuProps'
>;

export const NAV_ITEM_MAX_INLINE_ACTIONS = 3;

export interface ArvoNavOptions {
  size?: ArvoNavSize;
  /**
   * Compact icon-only rail. When true, every NavItem renders only its
   * leading icon; label + metadata + trailing actions are hidden from
   * view but preserved as the accessible name (`aria-label`) and native
   * hover / focus `title` tooltip on the row's polymorphic root. Row
   * height still follows `size`. Consumed by `ArvoNavPanel` when the
   * panel is in compact mode.
   */
  isCompact?: boolean;
  items?: ArvoNavItemData[];
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  hasPinning?: boolean;
  actionsVisibility?: 'hover' | 'always';
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  menuProps?: NavMenuProps;
  onSelect?: (detail: { id: string; item: ArvoNavItemData; index: number }) => void;
  onPinChange?: (detail: { id: string; pinned: boolean; itemOrder: string[] }) => void;
  onAction?: (detail: { actionId: string; itemId: string; item: ArvoNavItemData }) => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoNavOptions,
    | 'items'
    | 'selectedId'
    | 'defaultSelectedId'
    | 'menuProps'
    | 'onSelect'
    | 'onPinChange'
    | 'onAction'
  >
> & {
  items: ArvoNavItemData[];
  selectedId: string | null;
  menuProps: NavMenuProps | null;
  onSelect: ((detail: { id: string; item: ArvoNavItemData; index: number }) => void) | null;
  onPinChange: ((detail: { id: string; pinned: boolean; itemOrder: string[] }) => void) | null;
  onAction: ((detail: { actionId: string; itemId: string; item: ArvoNavItemData }) => void) | null;
};

interface ItemEntry {
  data: ArvoNavItemData;
  rootEl: HTMLElement;
  lftEl: HTMLSpanElement | null;
  actionsEl: HTMLSpanElement | null;
  avatarInstance: ArvoAvatar | null;
  statusInstance: ArvoStatus | null;
  badgeInstance: ArvoBadge | null;
  inlineButtons: ArvoIconButton[];
  /**
   * Pin / unpin affordance rendered when `hasPinning` is true and the row
   * is pinnable + not disabled. Mirrors the Tabstrip pin toggle.
   */
  pinButton: ArvoToggleButton | null;
  overflowButton: ArvoDropdownIconButton | null;
  skelEl: HTMLSpanElement | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortItems(items: ArvoNavItemData[]): ArvoNavItemData[] {
  const pinned: ArvoNavItemData[] = [];
  const unpinned: ArvoNavItemData[] = [];
  for (const item of items) {
    if (item.isPinned) pinned.push(item);
    else unpinned.push(item);
  }
  return [...pinned, ...unpinned];
}

function getItemOrder(items: ArvoNavItemData[]): string[] {
  return sortItems(items).map((i) => i.id);
}

function isBadgeSuppressed(isSelected: boolean, isDisabled: boolean): boolean {
  // Per spec: badge is hidden in disabled / selected-disabled rows.
  return isDisabled;
}

function resolveBadgeAppearance(
  isSelected: boolean,
  isDisabled: boolean,
): 'primary' | 'filled' {
  if (isSelected && !isDisabled) return 'filled';
  return 'primary';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoNav {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;

  private _listEl: HTMLUListElement | null = null;
  private _indicatorEl: HTMLSpanElement | null = null;
  private _highlightEl: HTMLSpanElement | null = null;
  private _hasMeasured = false;
  private _entries: ItemEntry[] = [];
  private _displayOrder: ArvoNavItemData[] = [];
  private _resizeObserver: ResizeObserver | null = null;

  private _boundHandleKeyDown: (e: KeyboardEvent) => void;

  static readonly SIZES = ['sm', 'md', 'lg'] as const;

  static readonly DEFAULTS: RequiredOptions = {
    size: 'md',
    isCompact: false,
    items: [],
    selectedId: null,
    hasPinning: false,
    actionsVisibility: 'hover',
    isDisabled: false,
    isLoading: false,
    ariaLabel: 'Navigation',
    menuProps: null,
    onSelect: null,
    onPinChange: null,
    onAction: null,
  };

  static initialize(element: HTMLElement, options?: ArvoNavOptions): ArvoNav {
    return new ArvoNav(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoNavOptions) {
    this._element = element;

    const size =
      options?.size && (ArvoNav.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoNav.DEFAULTS.size;

    const seededSelectedId =
      options?.selectedId !== undefined
        ? options.selectedId ?? null
        : options?.defaultSelectedId !== undefined
          ? options.defaultSelectedId ?? null
          : null;

    this._options = {
      ...ArvoNav.DEFAULTS,
      ...options,
      size,
      items: options?.items ? options.items.map((i) => ({ ...i })) : [],
      selectedId: seededSelectedId,
      menuProps: options?.menuProps ?? null,
      onSelect: options?.onSelect ?? null,
      onPinChange: options?.onPinChange ?? null,
      onAction: options?.onAction ?? null,
    };


    this._boundHandleKeyDown = this._handleKeyDown.bind(this);

    this._render();
    this._bindEvents();
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  /**
   * Render or re-render the nav. The wrapper classes / aria attributes
   * are always re-applied (they're cheap and reflect the current state)
   * but the inner item list uses a diff-based path: surviving items
   * keep their existing DOM nodes and inner Arvo instances, and only
   * the AFFECTED row's pin ToggleButton flips its `.active` class. This
   * is what stops every pin icon from animating whenever ANY pin
   * toggles -- mirrors the same fix applied to ArvoTabstrip.
   *
   * Focus on a surviving item row is preserved across rebuilds. If the
   * focused row was removed (e.g. removeItem) focus moves to the new
   * tab-stop row instead of being lost to <body>.
   */
  private _render(): void {
    const el = this._element;
    if (!el) return;

    // Capture focus state before any mutation so we can restore it. We
    // walk up from `document.activeElement` to the closest nav-item so
    // a click on an inner action button (pin / close / overflow) still
    // resolves to the OWNING row for restoration.
    const activeBefore = document.activeElement as HTMLElement | null;
    const focusedItemId =
      activeBefore
        ?.closest<HTMLElement>('.arvo-nav-item')
        ?.getAttribute('data-nav-item-id') ?? null;

    // -- Wrapper classes + a11y --------------------------------------------
    // Clear any stale size modifier from a previous size, then re-add
    // the current one. The base block class is idempotent.
    el.classList.remove('arvo-nav--sm', 'arvo-nav--md', 'arvo-nav--lg');
    el.classList.add('arvo-nav', `arvo-nav--${this._options.size}`);
    if (this._options.isCompact) {
      el.classList.add('arvo-nav--compact');
    } else {
      el.classList.remove('arvo-nav--compact');
    }
    if (this._options.actionsVisibility === 'always') {
      el.classList.add('arvo-nav--actions-always');
    } else {
      el.classList.remove('arvo-nav--actions-always');
    }
    if (this._options.isDisabled) el.classList.add('is-disabled');
    else el.classList.remove('is-disabled');
    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    } else {
      el.classList.remove('loading');
      el.removeAttribute('aria-busy');
    }
    el.setAttribute('aria-label', this._options.ariaLabel);

    // -- List container (created once; reused across re-renders) -----------
    // The list also hosts the sliding __indicator and __highlight (created
    // alongside it and never re-created) so their CSS transition state
    // persists across rebuilds. The component writes the active row's
    // offsetTop/offsetHeight into CSS custom properties on the list so the
    // SCSS rules can position them.
    if (!this._listEl) {
      this._listEl = document.createElement('ul');
      this._listEl.className = 'arvo-nav__list';
      this._listEl.setAttribute('role', 'list');
      el.appendChild(this._listEl);

      this._highlightEl = document.createElement('span');
      this._highlightEl.className = 'arvo-nav__highlight';
      this._highlightEl.setAttribute('aria-hidden', 'true');
      this._listEl.appendChild(this._highlightEl);

      this._indicatorEl = document.createElement('span');
      this._indicatorEl.className = 'arvo-nav__indicator';
      this._indicatorEl.setAttribute('aria-hidden', 'true');
      this._listEl.appendChild(this._indicatorEl);

      // Suppress the indicator's slide animation on the very first paint
      // so it appears AT the active row instead of sliding in from y=0.
      // Removed after the first measurement (see _updateIndicator()).
      el.classList.add('arvo-nav--init');

      // Recompute the indicator when the list itself resizes (font load,
      // row content change, container width change, etc.).
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() =>
          this._updateIndicator(),
        );
        this._resizeObserver.observe(this._listEl);
      }
    }

    this._displayOrder = sortItems(this._options.items);
    const tabStopId = this._resolveTabStopId();

    // -- Diff-based item reconciliation ------------------------------------
    // Index existing entries by id so surviving items keep their DOM +
    // inner Arvo instance refs. Brand-new items get a fresh entry. Items
    // that fell out of `_options.items` get torn down at the end.
    const previousEntries = new Map<string, ItemEntry>();
    for (const entry of this._entries) {
      previousEntries.set(entry.data.id, entry);
    }

    const nextEntries: ItemEntry[] = [];
    const usedIds = new Set<string>();

    for (const item of this._displayOrder) {
      const existing = previousEntries.get(item.id);
      const isTabStop = item.id === tabStopId;
      if (existing) {
        // Reuse the existing entry. Patch the parts that can change
        // between rebuilds (pin selected state, .active / .is-pinned /
        // .is-disabled classes, roving tabindex, aria-current, label).
        this._patchItemEntry(existing, item, isTabStop);
        nextEntries.push(existing);
        usedIds.add(item.id);
      } else {
        const entry = this._createItemEntry(item, isTabStop);
        nextEntries.push(entry);
      }
    }

    // Tear down entries for items that no longer exist.
    for (const [id, entry] of previousEntries) {
      if (!usedIds.has(id)) {
        this._destroyItemEntry(entry);
      }
    }

    this._entries = nextEntries;

    // Reorder the DOM: move each entry's <li> (or rootEl wrapper) to its
    // new slot in the list. We rebuild the <li> wrappers each time so
    // we don't have to track them, but the rootEl + its inner Arvo
    // instances are PRESERVED via appendChild moves.
    //
    // IMPORTANT: the persistent indicator + highlight siblings live
    // inside the list (so they can absolutely-position themselves
    // against it). textContent='' would wipe them along with the
    // previous <li> children, breaking the active-row chrome. Remove
    // only the previous list items and explicitly re-append the
    // indicator/highlight afterwards so they survive every re-render.
    const listEl = this._listEl;
    const oldItems = listEl.querySelectorAll(':scope > li');
    oldItems.forEach((li) => li.remove());
    // Re-attach indicator + highlight in case a prior render orphaned
    // them (defensive -- they should already be in place from the
    // one-time list initialization above).
    if (this._highlightEl && this._highlightEl.parentNode !== listEl) {
      listEl.appendChild(this._highlightEl);
    }
    if (this._indicatorEl && this._indicatorEl.parentNode !== listEl) {
      listEl.appendChild(this._indicatorEl);
    }
    for (const entry of this._entries) {
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      // `display: contents` keeps layout flat -- mirrors the React render.
      li.style.display = 'contents';
      li.appendChild(entry.rootEl);
      listEl.appendChild(li);
    }

    // -- Focus restoration -------------------------------------------------
    // Only restore when focus was actually lost (e.g. the focused row's
    // DOM was destroyed). If focus is still inside the nav (e.g. on a
    // surviving pin ToggleButton the user just clicked) we leave it
    // alone so we don't bounce the user to the row root.
    const activeAfter = document.activeElement as HTMLElement | null;
    const focusLost =
      !activeAfter ||
      activeAfter === document.body ||
      !el.contains(activeAfter);
    if (focusedItemId && focusLost) {
      const focusEntry = this._entries.find((e) => e.data.id === focusedItemId);
      if (focusEntry) {
        focusEntry.rootEl.focus({ preventScroll: true });
      } else {
        // Focused row was destroyed -- fall back to the current tab
        // stop row so the user can keep arrow-keying.
        const stop = tabStopId
          ? this._entries.find((e) => e.data.id === tabStopId)
          : undefined;
        stop?.rootEl.focus({ preventScroll: true });
      }
    }

    this._updateIndicator();
  }

  /**
   * Update the sliding active-row indicator + highlight. Writes the
   * active row's offsetTop / offsetHeight onto the list element as CSS
   * variables; the .scss rules use these to position and size the
   * absolute __indicator and __highlight elements. When no row is
   * selected the host gets the `--no-active` modifier (the elements
   * collapse to opacity 0).
   *
   * Called after every render and from a ResizeObserver on the list so
   * row geometry changes (font load, content reflow) keep the slider
   * aligned.
   */
  private _updateIndicator(): void {
    const el = this._element;
    const list = this._listEl;
    if (!el || !list) return;

    const activeId = this._options.selectedId;
    const activeEntry = activeId
      ? this._entries.find((e) => e.data.id === activeId)
      : undefined;
    const activeRow = activeEntry?.rootEl ?? null;

    if (activeRow) {
      list.style.setProperty(
        '--arvo-nav-active-top',
        `${activeRow.offsetTop}px`,
      );
      list.style.setProperty(
        '--arvo-nav-active-h',
        `${activeRow.offsetHeight}px`,
      );
      el.classList.remove('arvo-nav--no-active');
    } else {
      list.style.setProperty('--arvo-nav-active-top', '0px');
      list.style.setProperty('--arvo-nav-active-h', '0px');
      el.classList.add('arvo-nav--no-active');
    }

    // After the first measurement settles on the next frame, drop the
    // `--init` modifier so subsequent selection changes animate. Guarded
    // by `_hasMeasured` so the rAF only fires once per instance.
    if (!this._hasMeasured) {
      this._hasMeasured = true;
      const reqFrame =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 16);
      reqFrame(() => {
        if (!this._element) return;
        this._element.classList.remove('arvo-nav--init');
      });
    }
  }

  /**
   * Patch a surviving entry to match the new item data without
   * destroying its DOM node or inner Arvo instances. Handles:
   *   - `active` / `is-disabled` / `is-pinned` / `is-loading` class flips
   *   - pin ToggleButton selected state + tooltip (no animation replay
   *     unless the pinned state actually changed)
   *   - aria-current / aria-pressed (anchor vs button polymorphism)
   *   - roving tabindex
   *   - label text + anchor href / target / rel
   *
   * For structural changes that can't be patched (e.g. an item gained
   * an avatar slot or transitioned between `actions` shapes) we fall
   * back to a fresh `_createItemEntry` so the entry stays consistent.
   * In practice the only field that flips dynamically across rebuilds
   * is `isPinned`, so the patch path covers the hot case.
   */
  private _patchItemEntry(
    entry: ItemEntry,
    next: ArvoNavItemData,
    isTabStop: boolean,
  ): void {
    const isSelected = next.id === this._options.selectedId;
    const isDisabled = this._options.isDisabled || !!next.isDisabled;
    const isLoading = (this._options.isLoading || !!next.isLoading) === true;
    const rootEl = entry.rootEl;

    // -- Class composition --------------------------------------------------
    rootEl.className = [
      'arvo-nav-item',
      `arvo-nav-item--${this._options.size}`,
      this._options.isCompact ? 'arvo-nav-item--compact' : '',
      isSelected ? 'active' : '',
      isDisabled ? 'is-disabled' : '',
      isLoading ? 'is-loading' : '',
      next.isPinned ? 'is-pinned' : '',
    ]
      .filter(Boolean)
      .join(' ');

    // -- a11y --------------------------------------------------------------
    rootEl.tabIndex = isTabStop ? 0 : -1;
    if (isDisabled) rootEl.setAttribute('aria-disabled', 'true');
    else rootEl.removeAttribute('aria-disabled');
    if (isLoading) rootEl.setAttribute('aria-busy', 'true');
    else rootEl.removeAttribute('aria-busy');

    // -- Compact: force aria-label + native title from label ---------------
    // Compact rows visually hide their label; make sure the polymorphic
    // root still exposes the label to assistive tech and the native
    // hover / focus tooltip.
    const accessibleNamePatch = next.tooltip ?? next.label;
    if (this._options.isCompact) {
      rootEl.setAttribute('aria-label', accessibleNamePatch);
      rootEl.title = accessibleNamePatch;
    } else if (next.tooltip) {
      rootEl.setAttribute('aria-label', accessibleNamePatch);
      rootEl.title = next.tooltip;
    } else {
      rootEl.removeAttribute('aria-label');
      rootEl.removeAttribute('title');
    }

    const isAnchor = !!next.href;
    if (isAnchor) {
      if (isSelected) rootEl.setAttribute('aria-current', 'page');
      else rootEl.removeAttribute('aria-current');
      // Anchors don't carry aria-pressed; clean up if a previous render
      // happened to set it (defensive).
      rootEl.removeAttribute('aria-pressed');
      // Refresh href if the consumer changed it across rebuilds. We
      // also drop href while disabled/loading so the row is truly
      // non-interactive.
      if (!isDisabled && !isLoading) {
        (rootEl as HTMLAnchorElement).href = next.href!;
      } else {
        rootEl.removeAttribute('href');
      }
    } else {
      // Button-mode rows.
      if (isSelected) rootEl.setAttribute('aria-pressed', 'true');
      else rootEl.removeAttribute('aria-pressed');
      rootEl.removeAttribute('aria-current');
      (rootEl as HTMLButtonElement).disabled = isDisabled || isLoading;
    }

    // -- Pin ToggleButton --------------------------------------------------
    if (entry.pinButton) {
      entry.pinButton.selected(!!next.isPinned);
      entry.pinButton.disabled(isDisabled || isLoading);
      entry.pinButton.setTooltip?.(next.isPinned ? 'Unpin' : 'Pin');
    }

    // -- Label --------------------------------------------------------------
    const lblEl = entry.lftEl?.querySelector<HTMLElement>(
      '.arvo-nav-item__lbl',
    );
    if (lblEl && next.label !== entry.data.label) {
      lblEl.textContent = next.label;
    }

    entry.data = next;
  }

  /**
   * Destroy a single item entry (inner Arvo instances + DOM node).
   * Mirrors `_destroyInstances` but scoped to one entry so diff-based
   * rebuilds can tear down only the items that actually went away.
   */
  private _destroyItemEntry(entry: ItemEntry): void {
    entry.avatarInstance?.destroy?.();
    entry.statusInstance?.destroy?.();
    entry.badgeInstance?.destroy?.();
    for (const btn of entry.inlineButtons) btn.destroy?.();
    entry.pinButton?.destroy?.();
    entry.overflowButton?.destroy?.();
    entry.rootEl.remove();
  }

  private _createItemEntry(
    item: ArvoNavItemData,
    isTabStop: boolean,
  ): ItemEntry {
    const isSelected = item.id === this._options.selectedId;
    const isDisabled = this._options.isDisabled || !!item.isDisabled;
    const isLoading = (this._options.isLoading || !!item.isLoading) === true;

    // Polymorphic root: <a href> when href is set, otherwise <button>.
    let rootEl: HTMLElement;
    if (item.href) {
      const a = document.createElement('a');
      if (!isDisabled && !isLoading) a.href = item.href;
      if (item.target) a.target = item.target;
      if (item.rel) a.rel = item.rel;
      if (isSelected) a.setAttribute('aria-current', 'page');
      rootEl = a;
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      if (isDisabled || isLoading) b.disabled = true;
      if (isSelected) b.setAttribute('aria-pressed', 'true');
      rootEl = b;
    }

    rootEl.className = [
      'arvo-nav-item',
      `arvo-nav-item--${this._options.size}`,
      this._options.isCompact ? 'arvo-nav-item--compact' : '',
      isSelected ? 'active' : '',
      isDisabled ? 'is-disabled' : '',
      isLoading ? 'is-loading' : '',
      item.isPinned ? 'is-pinned' : '',
    ]
      .filter(Boolean)
      .join(' ');

    rootEl.setAttribute('data-nav-item-id', item.id);
    rootEl.setAttribute('data-arvo-nav-item-id', item.id);
    rootEl.tabIndex = isTabStop ? 0 : -1;
    if (isDisabled) rootEl.setAttribute('aria-disabled', 'true');
    if (isLoading) rootEl.setAttribute('aria-busy', 'true');

    const accessibleName = item.tooltip ?? item.label;
    if (this._options.isCompact) {
      // Compact rows visually hide their label; force aria-label +
      // native title from `tooltip ?? label` so screen readers and the
      // hover / focus tooltip still convey the destination name.
      rootEl.title = accessibleName;
      rootEl.setAttribute('aria-label', accessibleName);
    } else if (item.tooltip) {
      rootEl.title = item.tooltip;
      if (!item.href) rootEl.setAttribute('aria-label', accessibleName);
      else rootEl.setAttribute('aria-label', accessibleName);
    }

    rootEl.addEventListener('click', (e) => this._handleClick(item, e));

    let lftEl: HTMLSpanElement | null = null;
    let actionsEl: HTMLSpanElement | null = null;
    let avatarInstance: ArvoAvatar | null = null;
    let statusInstance: ArvoStatus | null = null;
    let badgeInstance: ArvoBadge | null = null;
    const inlineButtons: ArvoIconButton[] = [];
    let pinButton: ArvoToggleButton | null = null;
    let overflowButton: ArvoDropdownIconButton | null = null;
    let skelEl: HTMLSpanElement | null = null;

    if (!isLoading) {
      // -- Left content cluster -----------------------------------------------
      lftEl = document.createElement('span');
      lftEl.className = 'arvo-nav-item__lft';

      if (item.icon) {
        const ico = document.createElement('span');
        ico.className = `arvo-nav-item__ico o9con o9con-${item.icon}`;
        ico.setAttribute('aria-hidden', 'true');
        lftEl.appendChild(ico);
      }

      if (item.avatar) {
        const avtWrap = document.createElement('span');
        avtWrap.className = 'arvo-nav-item__avt';
        const avtHost = document.createElement('span');
        avtWrap.appendChild(avtHost);
        avatarInstance = ArvoAvatar.initialize(avtHost, {
          ...(item.avatarProps ?? {}),
          size: 'xs',
          variant: item.avatar.variant,
          name: item.avatar.name,
          src: item.avatar.src,
          icon: item.avatar.icon,
          colorMode: item.avatar.colorMode,
          semanticType: item.avatar.semanticType,
          customColor: item.avatar.customColor,
          tooltip: item.avatar.tooltip,
          alt: item.avatar.alt,
        });
        lftEl.appendChild(avtWrap);
      }

      const lblEl = document.createElement('span');
      lblEl.className = 'arvo-nav-item__lbl';
      lblEl.textContent = item.label;
      if (item.tooltip) lblEl.title = item.tooltip;
      lftEl.appendChild(lblEl);

      rootEl.appendChild(lftEl);

      // -- Action cluster -----------------------------------------------------
      const consumerActions = item.actions ?? [];
      const inlineActions = consumerActions.slice(
        0,
        NAV_ITEM_MAX_INLINE_ACTIONS,
      );
      const promotedActions = consumerActions.slice(
        NAV_ITEM_MAX_INLINE_ACTIONS,
      );

      const promotedAsMenuItems: MenuItemData[] = promotedActions.map((a) => ({
        id: a.id,
        label: a.tooltip,
        icon: a.icon,
        isDisabled: a.isDisabled,
      }));
      const overflowMenuItems: MenuItemData[] = [
        ...(item.menuItems ?? []),
        ...promotedAsMenuItems,
      ];
      const hasOverflowMenu = overflowMenuItems.length > 0;

      // The pin / unpin affordance is rendered in its own slot as an
      // ArvoToggleButton (NOT a synthetic inline action) so the
      // `selectedIcon` / `aria-pressed` flow is driven by the toggle
      // itself. Auto-rendered when hasPinning is on and the row opts in.
      const showPinToggle =
        this._options.hasPinning &&
        item.isPinnable !== false &&
        !item.isDisabled;

      const showActions =
        inlineActions.length > 0 ||
        hasOverflowMenu ||
        !!item.status ||
        !!item.badge ||
        showPinToggle;
      const showBadge =
        !!item.badge && !isBadgeSuppressed(isSelected, isDisabled);

      if (showActions) {
        actionsEl = document.createElement('span');
        actionsEl.className = 'arvo-nav-item__actions';

        if (item.status) {
          const stsWrap = document.createElement('span');
          stsWrap.className = 'arvo-nav-item__sts';
          const stsHost = document.createElement('span');
          stsWrap.appendChild(stsHost);
          statusInstance = ArvoStatus.initialize(stsHost, {
            ...(item.statusProps ?? {}),
            type: item.status.type,
            placement: 'inline',
            size: 'sm',
            tooltip: item.status.label,
          });
          actionsEl.appendChild(stsWrap);
        }

        if (showPinToggle) {
          const pinWrap = document.createElement('span');
          pinWrap.className = 'arvo-nav-item__pin';
          const pinBtnEl = document.createElement('button');
          pinBtnEl.type = 'button';
          pinBtnEl.tabIndex = -1;
          pinWrap.appendChild(pinBtnEl);
          pinButton = ArvoToggleButton.initialize(pinBtnEl, {
            icon: 'push-pin',
            selectedIcon: 'push-pinned',
            variant: 'tertiary',
            size: 'sm',
            tooltip: item.isPinned ? 'Unpin' : 'Pin',
            isDisabled: isDisabled || isLoading,
            isLoading,
            isSelected: !!item.isPinned,
            // The toggle is a child of a polymorphic <a href> root when
            // the row is an anchor. Stop the click bubble so the row's
            // selection handler doesn't run, AND preventDefault so the
            // anchor's native navigation doesn't fire either.
            onClick: (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
            },
            onSelectedChange: () => {
              if (
                isDisabled ||
                isLoading ||
                item.isDisabled ||
                item.isPinnable === false
              ) {
                return;
              }
              this._togglePin(item.id);
            },
          });
          actionsEl.appendChild(pinWrap);
        }

        for (const action of inlineActions) {
          const actWrap = document.createElement('span');
          actWrap.className = 'arvo-nav-item__act';
          const btnEl = document.createElement('button');
          btnEl.type = 'button';
          btnEl.tabIndex = -1;
          actWrap.appendChild(btnEl);
          const inst = ArvoIconButton.initialize(btnEl, {
            icon: action.icon,
            variant: 'tertiary',
            size: 'sm',
            tooltip: action.tooltip,
            isDisabled: isDisabled || !!action.isDisabled,
            isLoading,
            onClick: (e: Event) => {
              e.stopPropagation();
              // Prevent native anchor navigation when the row is rendered as
              // <a href> -- mirrors NavItem.tsx behavior.
              e.preventDefault();
              if (isDisabled || isLoading || action.isDisabled) return;
              action.onClick?.(e);
              this._dispatchEvent('nav-item:action', {
                actionId: action.id,
                itemId: item.id,
              });
              this._dispatchEvent('nav:action', {
                actionId: action.id,
                itemId: item.id,
              });
              this._options.onAction?.({
                actionId: action.id,
                itemId: item.id,
                item,
              });
            },
          });
          inlineButtons.push(inst);
          actionsEl.appendChild(actWrap);
        }

        if (hasOverflowMenu) {
          const overflowWrap = document.createElement('span');
          overflowWrap.className = 'arvo-nav-item__overflow';
          const ddBtnEl = document.createElement('button');
          ddBtnEl.type = 'button';
          ddBtnEl.tabIndex = -1;
          overflowWrap.appendChild(ddBtnEl);
          const promotedIds = new Set(promotedActions.map((a) => a.id));
          overflowButton = ArvoDropdownIconButton.initialize(ddBtnEl, {
            ...(item.menuProps ?? this._options.menuProps ?? {}),
            icon: 'ellipsis-v',
            variant: 'tertiary',
            size: 'sm',
            isCompact: true,
            tooltip: 'More actions',
            items: overflowMenuItems,
            isDisabled: isDisabled || isLoading,
            isLoading,
            closeOnSelect: true,
            // Stop bubbling to the row's selection handler AND prevent
            // the anchor's native navigation -- without preventDefault
            // a polymorphic <a href> row would navigate when the user
            // clicks the overflow trigger.
            onClick: (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
            },
            onSelect: (menuItem: MenuItemData) => {
              if (menuItem.isDisabled) return;
              if (promotedIds.has(menuItem.id)) {
                const original = (item.actions ?? []).find(
                  (a) => a.id === menuItem.id,
                );
                if (original && !original.isDisabled && !isDisabled && !isLoading) {
                  original.onClick?.();
                  this._dispatchEvent('nav-item:action', {
                    actionId: menuItem.id,
                    itemId: item.id,
                  });
                  this._dispatchEvent('nav:action', {
                    actionId: menuItem.id,
                    itemId: item.id,
                  });
                  this._options.onAction?.({
                    actionId: menuItem.id,
                    itemId: item.id,
                    item,
                  });
                }
              }
              return undefined;
            },
          });
          actionsEl.appendChild(overflowWrap);
        }

        if (showBadge) {
          const bdgWrap = document.createElement('span');
          bdgWrap.className = 'arvo-nav-item__bdg';
          const bdgHost = document.createElement('span');
          bdgWrap.appendChild(bdgHost);
          badgeInstance = ArvoBadge.initialize(bdgHost, {
            ...(item.badgeProps ?? {}),
            size: 'sm',
            variant: 'label',
            semanticType: item.badge!.semanticType ?? 'positive',
            appearance: resolveBadgeAppearance(isSelected, isDisabled),
            message: item.badge!.message,
            // Nav badge slot is label-only by spec; never grow an icon
            // glyph even if a consumer tries via badgeProps.
            hasBadgeIcon: false,
          });
          actionsEl.appendChild(bdgWrap);
        }

        rootEl.appendChild(actionsEl);
      }
    } else {
      // Loading row: skeleton bar replaces inner content.
      skelEl = document.createElement('span');
      skelEl.className = 'arvo-nav-item__skel';
      skelEl.setAttribute('aria-hidden', 'true');
      rootEl.appendChild(skelEl);
    }

    return {
      data: item,
      rootEl,
      lftEl,
      actionsEl,
      avatarInstance,
      statusInstance,
      badgeInstance,
      inlineButtons,
      pinButton,
      overflowButton,
      skelEl,
    };
  }

  /**
   * Toggle the pinned state of the given item. Updates the model, fires
   * `nav:pin-change` + `onPinChange`, and re-renders the list so pinned
   * items rise to the top. Shared by the inline pin ToggleButton and the
   * public `pin()` setter.
   */
  private _togglePin(id: string): void {
    const item = this._options.items.find((i) => i.id === id);
    if (!item) return;
    const next = !item.isPinned;
    item.isPinned = next;
    const updated = this._options.items.map((i) =>
      i.id === id ? { ...i, isPinned: next } : i,
    );
    this._options.items = updated;
    this._render();
    this._dispatchEvent('nav:pin-change', {
      id,
      pinned: next,
      itemOrder: getItemOrder(updated),
    });
    this._options.onPinChange?.({
      id,
      pinned: next,
      itemOrder: getItemOrder(updated),
    });
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  private _bindEvents(): void {
    this._element?.addEventListener('keydown', this._boundHandleKeyDown);
  }

  private _unbindEvents(): void {
    this._element?.removeEventListener('keydown', this._boundHandleKeyDown);
  }

  private _handleClick(item: ArvoNavItemData, e: MouseEvent): void {
    if (this._options.isDisabled || this._options.isLoading) {
      e.preventDefault();
      return;
    }
    if (item.isDisabled || item.isLoading) {
      e.preventDefault();
      return;
    }
    if (item.id !== this._options.selectedId) {
      this._options.selectedId = item.id;
      const idx = this._options.items.findIndex((i) => i.id === item.id);
      this._syncSelection();
      this._dispatchEvent('nav:select', { id: item.id, index: idx });
      this._dispatchEvent('nav-item:select', { id: item.id });
      this._options.onSelect?.({ id: item.id, item, index: idx });
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const enabled = this._displayOrder.filter(
      (i) => !(this._options.isDisabled || i.isDisabled),
    );
    if (enabled.length === 0) return;

    const target = document.activeElement as HTMLElement | null;
    const activeId = target?.getAttribute('data-nav-item-id') ?? null;
    const currentIdx = enabled.findIndex((i) => i.id === activeId);

    let nextIdx: number | null = null;
    let activate = false;
    let isAnchor = false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % enabled.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIdx =
          currentIdx < 0
            ? enabled.length - 1
            : (currentIdx - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = enabled.length - 1;
        break;
      case 'Enter': {
        if (currentIdx < 0) return;
        const item = enabled[currentIdx];
        isAnchor = !!item.href;
        // For buttons, prevent the synthetic click since we handle it directly.
        // For anchors, let native navigation happen and just trigger onSelect.
        activate = true;
        if (!isAnchor) e.preventDefault();
        if (item.id !== this._options.selectedId) {
          this._options.selectedId = item.id;
          const idx = this._options.items.findIndex((i) => i.id === item.id);
          this._syncSelection();
          this._dispatchEvent('nav:select', { id: item.id, index: idx });
          this._dispatchEvent('nav-item:select', { id: item.id });
          this._options.onSelect?.({ id: item.id, item, index: idx });
        }
        return;
      }
      case ' ':
      case 'Spacebar': {
        if (currentIdx < 0) return;
        const item = enabled[currentIdx];
        if (item.href) return; // Anchor: space scrolls per APG.
        e.preventDefault();
        if (item.id !== this._options.selectedId) {
          this._options.selectedId = item.id;
          const idx = this._options.items.findIndex((i) => i.id === item.id);
          this._syncSelection();
          this._dispatchEvent('nav:select', { id: item.id, index: idx });
          this._dispatchEvent('nav-item:select', { id: item.id });
          this._options.onSelect?.({ id: item.id, item, index: idx });
        }
        return;
      }
      default:
        return;
    }

    if (nextIdx !== null) {
      const nextItem = enabled[nextIdx];
      const nextEntry = this._entries.find((en) => en.data.id === nextItem.id);
      nextEntry?.rootEl.focus();
    }

    // activate is unused on arrow keys -- silence lint
    void activate;
  }

  private _syncSelection(): void {
    for (const entry of this._entries) {
      const isSelected = entry.data.id === this._options.selectedId;
      entry.rootEl.classList.toggle('active', isSelected);
      const isAnchor = !!entry.data.href;
      if (isAnchor) {
        if (isSelected) entry.rootEl.setAttribute('aria-current', 'page');
        else entry.rootEl.removeAttribute('aria-current');
      } else {
        if (isSelected) entry.rootEl.setAttribute('aria-pressed', 'true');
        else entry.rootEl.removeAttribute('aria-pressed');
      }
      entry.rootEl.tabIndex = isSelected ? 0 : -1;
    }

    // Ensure SOME item is the keyboard tab stop even when nothing is selected.
    const tabStopId = this._resolveTabStopId();
    for (const entry of this._entries) {
      const isStop = entry.data.id === tabStopId;
      // Selected wins; otherwise the first enabled gets tabIndex=0.
      if (entry.data.id !== this._options.selectedId) {
        entry.rootEl.tabIndex = isStop ? 0 : -1;
      }
    }

    // Re-measure the active row so the persistent sliding indicator +
    // highlight transition to the new position. The list element holds
    // both elements absolutely; we just update the CSS variables that
    // drive their translateY + height. Without this call, clicking a
    // row would flip the .active class but leave the sliding chrome
    // stuck on the previous row.
    this._updateIndicator();
  }

  private _resolveTabStopId(): string | null {
    if (this._options.selectedId) {
      const sel = this._options.items.find(
        (i) => i.id === this._options.selectedId && !i.isDisabled,
      );
      if (sel) return sel.id;
    }
    const first = this._displayOrder.find((i) => !i.isDisabled);
    return first?.id ?? null;
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    if (!this._element) return;
    this._element.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true }),
    );
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Dual-purpose getter/setter for the selected item id. Setter does NOT
   * fire nav:select -- use `select(id)` for the user-facing activation.
   */
  selected(): string | null;
  selected(id: string | null): void;
  selected(id?: string | null): string | null | void {
    if (arguments.length === 0) return this._options.selectedId;
    if (id === null) {
      this._options.selectedId = null;
    } else {
      const item = this._options.items.find((i) => i.id === id && !i.isDisabled);
      if (!item) return;
      this._options.selectedId = item.id;
    }
    this._syncSelection();
  }

  /** Activate an item by id. Fires nav:select and onSelect. */
  select(id: string): void {
    const item = this._options.items.find((i) => i.id === id && !i.isDisabled);
    if (!item) return;
    if (this._options.selectedId === id) return;
    this._options.selectedId = id;
    const idx = this._options.items.findIndex((i) => i.id === id);
    this._syncSelection();
    this._dispatchEvent('nav:select', { id, index: idx });
    this._dispatchEvent('nav-item:select', { id });
    this._options.onSelect?.({ id, item, index: idx });
  }

  /**
   * Dual-purpose getter/setter for an item's pin state. Setter rerenders
   * the list so pinned items rise to the top, and emits nav:pin-change.
   */
  pin(id: string): boolean;
  pin(id: string, state: boolean): void;
  pin(id: string, state?: boolean): boolean | void {
    const item = this._options.items.find((i) => i.id === id);
    if (!item) {
      if (state === undefined) return false;
      return;
    }
    if (state === undefined) return !!item.isPinned;
    if (!!item.isPinned === state) return;
    item.isPinned = state;
    const updated = this._options.items.map((i) =>
      i.id === id ? { ...i, isPinned: state } : i,
    );
    this._options.items = updated;
    this._render();
    this._dispatchEvent('nav:pin-change', {
      id,
      pinned: state,
      itemOrder: getItemOrder(updated),
    });
    this._options.onPinChange?.({
      id,
      pinned: state,
      itemOrder: getItemOrder(updated),
    });
  }

  setItems(items: ArvoNavItemData[]): void {
    const next = items.map((i) => ({ ...i }));
    this._options.items = next;
    if (
      this._options.selectedId &&
      !next.some((i) => i.id === this._options.selectedId)
    ) {
      this._options.selectedId = null;
    }
    this._render();
  }

  addItem(item: ArvoNavItemData, index?: number): void {
    const next = [...this._options.items];
    if (typeof index === 'number') next.splice(index, 0, { ...item });
    else next.push({ ...item });
    this._options.items = next;
    this._render();
  }

  removeItem(id: string): void {
    const next = this._options.items.filter((i) => i.id !== id);
    if (this._options.selectedId === id) this._options.selectedId = null;
    this._options.items = next;
    this._render();
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (arguments.length === 0) return this._options.isDisabled;
    this._options.isDisabled = !!state;
    this._render();
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading === true;
    this._render();
  }

  destroy(): void {
    this._unbindEvents();
    this._destroyInstances();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._element) {
      this._element.textContent = '';
      this._element.classList.remove(
        'arvo-nav',
        'arvo-nav--sm',
        'arvo-nav--md',
        'arvo-nav--lg',
        'arvo-nav--compact',
        'arvo-nav--actions-always',
        'arvo-nav--init',
        'arvo-nav--no-active',
        'is-disabled',
        'loading',
      );
      this._element.removeAttribute('aria-busy');
      this._element.removeAttribute('aria-label');
    }
    this._element = null;
    this._listEl = null;
    this._indicatorEl = null;
    this._highlightEl = null;
    this._entries = [];
    this._displayOrder = [];
    this._hasMeasured = false;
  }

  private _destroyInstances(): void {
    for (const entry of this._entries) {
      entry.avatarInstance?.destroy?.();
      entry.statusInstance?.destroy?.();
      entry.badgeInstance?.destroy?.();
      for (const btn of entry.inlineButtons) btn.destroy?.();
      entry.pinButton?.destroy?.();
      entry.overflowButton?.destroy?.();
    }
  }
}

export default ArvoNav;
