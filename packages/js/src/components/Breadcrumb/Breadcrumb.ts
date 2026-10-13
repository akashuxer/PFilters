import { type ListGroup } from '@arvo/core';
import {
  ArvoActionMenu,
  type ArvoActionMenuOptions,
  type MenuItemData,
} from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArvoBreadcrumbSize = 'sm' | 'lg';
export type ArvoBreadcrumbItemType = 'home' | 'link' | 'current';

export interface ArvoBreadcrumbItem {
  /**
   * Visible label. Suppressed for `home` items (which are icon-only) but
   * still required for accessibility -- it is forwarded to `aria-label` on
   * the underlying anchor when no visible text is rendered.
   */
  label: string;
  /** Destination URL. Omit for non-navigable items. */
  href?: string;
  /**
   * Optional o9con icon name (without the `o9con-` prefix). For `home`
   * items the icon is shown alone; for `link` / `current` items it sits as
   * a leading icon before the label.
   */
  icon?: string;
  /**
   * Role of the item in the trail. When omitted, the breadcrumb infers it:
   * the last item becomes `current`, an icon-only first item without
   * `menuItems` becomes `home`, and any other item is a `link`.
   */
  type?: ArvoBreadcrumbItemType;
  /**
   * Optional dropdown menu attached to this item. When present and the
   * item is a `link` or `current` role, the wrapper renders that row as
   * an `ArvoActionMenu` trigger (chevron + button) instead of a plain
   * anchor / span. `menuItems` wins over `href` when both are set.
   * Ignored on `home` items.
   */
  menuItems?: MenuItemData[] | ListGroup<MenuItemData>[];
}

/**
 * Scoped escape-hatch bag for the inner overflow `ArvoActionMenu` options the
 * parent does not curate as a flat option. Mirrors the React
 * `BreadcrumbMenuProps` type exactly -- drift checker enforces parity.
 */
export type BreadcrumbMenuProps = Pick<
  ArvoActionMenuOptions,
  'placement' | 'maxHeight' | 'hasGroupDividers' | 'menuWidth' | 'submenuWidth'
>;

export interface ArvoBreadcrumbOptions {
  items?: ArvoBreadcrumbItem[];
  size?: ArvoBreadcrumbSize;
  hasOverflow?: boolean;
  maxVisibleItems?: number;
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  overflowAriaLabel?: string;
  /**
   * Escape hatch for the inner overflow `ArvoActionMenu` options the parent
   * doesn't expose flat. Bag-only keys (`placement`, `maxHeight`,
   * `hasGroupDividers`) flow through. On any conflict with a parent-owned
   * option the parent wins. Also applied to every per-item dropdown that
   * has `menuItems`.
   */
  menuProps?: BreadcrumbMenuProps;
  onNavigate?: (event: { href: string; index: number; label: string }) => void;
  onOverflowOpen?: () => void;
  onOverflowClose?: () => void;
  onItemMenuOpen?: (event: { index: number }) => void;
  onItemMenuClose?: (event: { index: number }) => void;
}

type RequiredOptions = Required<
  Omit<
    ArvoBreadcrumbOptions,
    | 'onNavigate'
    | 'onOverflowOpen'
    | 'onOverflowClose'
    | 'onItemMenuOpen'
    | 'onItemMenuClose'
    | 'menuProps'
  >
> & {
  menuProps: BreadcrumbMenuProps | null;
  onNavigate: ArvoBreadcrumbOptions['onNavigate'] | null;
  onOverflowOpen: ArvoBreadcrumbOptions['onOverflowOpen'] | null;
  onOverflowClose: ArvoBreadcrumbOptions['onOverflowClose'] | null;
  onItemMenuOpen: ArvoBreadcrumbOptions['onItemMenuOpen'] | null;
  onItemMenuClose: ArvoBreadcrumbOptions['onItemMenuClose'] | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasItemMenu(item: ArvoBreadcrumbItem): boolean {
  return Array.isArray(item.menuItems) && item.menuItems.length > 0;
}

/**
 * Resolves the role for a given item in the trail. Mirrors the React rule:
 * an explicit `type` wins; otherwise the last item is `current` unless an
 * earlier item carries an explicit `type: 'current'`; a label-less first
 * item without `menuItems` is `home` (icon is auto-defaulted to
 * `o9con-home` when omitted); everything else is `link`.
 */
function resolveItemType(
  item: ArvoBreadcrumbItem,
  index: number,
  total: number,
  hasExplicitCurrent: boolean,
): ArvoBreadcrumbItemType {
  if (item.type) return item.type;
  if (index === total - 1 && !hasExplicitCurrent) return 'current';
  if (index === 0 && !item.label && !hasItemMenu(item)) return 'home';
  return 'link';
}

/**
 * Default icon name used by `home` items when the consumer does not
 * supply an explicit `icon`. The breadcrumb SCSS swaps this glyph for
 * `o9con-home-filled` on hover / focus.
 */
const DEFAULT_HOME_ICON = 'home';

interface VisibleEntry {
  kind: 'item';
  item: ArvoBreadcrumbItem;
  index: number;
  itemType: ArvoBreadcrumbItemType;
}

interface OverflowEntry {
  kind: 'overflow';
  collapsed: { item: ArvoBreadcrumbItem; index: number; label: string }[];
}

type TrailEntry = VisibleEntry | OverflowEntry;

function buildTrail(
  items: ArvoBreadcrumbItem[],
  maxVisibleItems: number,
  hasOverflow: boolean,
): TrailEntry[] {
  const total = items.length;
  if (total === 0) return [];

  // Mirrors React's hasExplicitCurrent guard so an explicit pinned current
  // does not produce two aria-current='page' nodes (parity fix).
  const hasExplicitCurrent = items.some((it) => it.type === 'current');

  const allEntries: VisibleEntry[] = items.map((item, index) => ({
    kind: 'item',
    item,
    index,
    itemType: resolveItemType(item, index, total, hasExplicitCurrent),
  }));

  if (!hasOverflow || maxVisibleItems < 3 || total <= maxVisibleItems) {
    return allEntries;
  }

  const trailingCount = maxVisibleItems - 2;
  const head = allEntries[0];
  const tail = allEntries.slice(total - trailingCount);
  const collapsedSlice = allEntries.slice(1, total - trailingCount);

  if (collapsedSlice.length === 0) return allEntries;

  const overflow: OverflowEntry = {
    kind: 'overflow',
    collapsed: collapsedSlice.map(({ item, index }) => ({
      item,
      index,
      label: item.label || `Item ${index + 1}`,
    })),
  };

  return [head, overflow, ...tail];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ItemMenuRecord {
  index: number;
  menu: ArvoActionMenu;
  chevron: HTMLElement;
}

export class ArvoBreadcrumb {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _listEl: HTMLOListElement | null = null;
  private _skeletonEl: HTMLElement | null = null;
  private _overflowMenu: ArvoActionMenu | null = null;
  private _itemMenus: ItemMenuRecord[] = [];
  private _originalContent: string;
  private _boundHandleClick: (event: Event) => void;

  static readonly DEFAULTS: RequiredOptions = {
    items: [],
    size: 'sm',
    hasOverflow: true,
    maxVisibleItems: 4,
    isDisabled: false,
    isLoading: false,
    ariaLabel: 'Breadcrumb',
    overflowAriaLabel: 'Options',
    menuProps: null,
    onNavigate: null,
    onOverflowOpen: null,
    onOverflowClose: null,
    onItemMenuOpen: null,
    onItemMenuClose: null,
  };

  static initialize(
    element: HTMLElement,
    options?: ArvoBreadcrumbOptions,
  ): ArvoBreadcrumb {
    return new ArvoBreadcrumb(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoBreadcrumbOptions) {
    this._element = element;
    this._originalContent = element.innerHTML;

    this._options = {
      ...ArvoBreadcrumb.DEFAULTS,
      ...options,
      menuProps: options?.menuProps ?? null,
      onNavigate: options?.onNavigate ?? null,
      onOverflowOpen: options?.onOverflowOpen ?? null,
      onOverflowClose: options?.onOverflowClose ?? null,
      onItemMenuOpen: options?.onItemMenuOpen ?? null,
      onItemMenuClose: options?.onItemMenuClose ?? null,
    };


    this._boundHandleClick = this._handleClick.bind(this);

    this._render();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    this._applyRootClasses();
    el.setAttribute('aria-label', this._options.ariaLabel);

    if (this._options.isLoading) {
      el.setAttribute('aria-busy', 'true');
      this._buildSkeleton();
      return;
    }

    el.removeAttribute('aria-busy');

    this._listEl = document.createElement('ol');
    this._listEl.className = 'arvo-bc__list';
    el.appendChild(this._listEl);

    this._buildItems();
    this._listEl.addEventListener('click', this._boundHandleClick);
  }

  private _applyRootClasses(): void {
    const el = this._element;
    if (!el) return;

    el.classList.add('arvo-bc', `arvo-bc--${this._options.size}`);
    el.classList.toggle('is-disabled', this._options.isDisabled);
    el.classList.toggle('loading', this._options.isLoading);
  }

  private _buildSkeleton(): void {
    const el = this._element;
    if (!el) return;

    const skl = document.createElement('div');
    skl.className = 'arvo-bc__skl';
    skl.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('div');
    icon.className = 'arvo-bc__skl__icon';

    const sep = document.createElement('span');
    sep.className = 'arvo-bc__skl__sep';
    sep.textContent = '/';

    const bar = document.createElement('div');
    bar.className = 'arvo-bc__skl__bar';

    skl.appendChild(icon);
    skl.appendChild(sep);
    skl.appendChild(bar);

    el.appendChild(skl);
    this._skeletonEl = skl;
  }

  private _buildItems(): void {
    const list = this._listEl;
    if (!list) return;

    list.textContent = '';
    this._destroyMenus();

    const trail = buildTrail(
      this._options.items,
      this._options.maxVisibleItems,
      this._options.hasOverflow,
    );

    trail.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'arvo-bc__item';

      if (entry.kind === 'overflow') {
        li.appendChild(this._buildOverflowTrigger(entry.collapsed));
      } else if (
        entry.itemType !== 'home' &&
        hasItemMenu(entry.item)
      ) {
        li.appendChild(this._buildItemMenuTrigger(entry));
      } else {
        li.appendChild(this._buildTrailItem(entry));
      }

      list.appendChild(li);
    });
  }

  private _buildTrailItem(entry: VisibleEntry): HTMLElement {
    const { item, index, itemType } = entry;
    const isHome = itemType === 'home';
    const isCurrent = itemType === 'current';
    const effectiveIcon = isHome ? item.icon ?? DEFAULT_HOME_ICON : item.icon;
    const showIcon = !!effectiveIcon;
    const showLabel = !isHome && !!item.label;

    if (isCurrent) {
      const span = document.createElement('span');
      span.className = 'arvo-bc__lbl';
      span.setAttribute('aria-current', 'page');
      span.title = item.label;
      if (showIcon) {
        span.appendChild(this._buildIcon(effectiveIcon!));
      }
      span.appendChild(document.createTextNode(item.label));
      return span;
    }

    const a = document.createElement('a');
    a.className = isHome ? 'arvo-bc__lnk arvo-bc__lnk--home' : 'arvo-bc__lnk';
    a.dataset.index = String(index);

    if (item.href && !this._options.isDisabled) {
      a.setAttribute('href', item.href);
    }

    if (this._options.isDisabled) {
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '0');
    }

    if (isHome) {
      a.setAttribute('aria-label', item.label || 'Home');
    } else {
      a.title = item.label;
    }

    if (showIcon) {
      a.appendChild(this._buildIcon(effectiveIcon!));
      // Stacked filled sibling for home items; SCSS swaps visibility on
      // hover/focus. Avoids hardcoding an icon-font codepoint.
      if (isHome) {
        a.appendChild(this._buildIcon(`${effectiveIcon}-filled`, true));
      }
    }

    if (showLabel) {
      a.appendChild(document.createTextNode(item.label));
    }

    return a;
  }

  private _buildIcon(icon: string, isFilledSibling = false): HTMLElement {
    const ico = document.createElement('span');
    const cls = isFilledSibling ? 'arvo-bc__ico--filled' : 'arvo-bc__ico';
    ico.className = `${cls} o9con o9con-${icon}`;
    ico.setAttribute('aria-hidden', 'true');
    return ico;
  }

  private _buildItemMenuTrigger(entry: VisibleEntry): HTMLElement {
    const { item, index, itemType } = entry;
    const isCurrent = itemType === 'current';
    const showIcon = !!item.icon;
    const blocked = this._options.isDisabled || this._options.isLoading;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isCurrent
      ? 'arvo-bc__lbl arvo-bc__lbl--dd'
      : 'arvo-bc__lnk arvo-bc__lnk--dd';
    btn.title = item.label;
    btn.dataset.index = String(index);
    if (isCurrent) btn.setAttribute('aria-current', 'page');
    if (blocked) btn.disabled = true;

    const inner = document.createElement('span');
    inner.className = 'arvo-bc__lnk-inner';
    if (showIcon) inner.appendChild(this._buildIcon(item.icon!));
    if (item.label) inner.appendChild(document.createTextNode(item.label));
    btn.appendChild(inner);

    // Chevron always renders `angle-down`; SCSS rotates it 180deg on
    // `aria-expanded='true'` so open/close reads as a smooth rotation
    // rather than a glyph swap.
    const chev = document.createElement('i');
    chev.className = 'arvo-bc__chev o9con o9con-angle-down';
    chev.setAttribute('aria-hidden', 'true');
    btn.appendChild(chev);

    // Hybrid options surface: spread `menuProps` first so flat / parent-
    // computed values win on overlap. Only bag-only keys flow through.
    const menu = new ArvoActionMenu(btn, {
      ...(this._options.menuProps ?? {}),
      placement: this._options.menuProps?.placement ?? 'bottom-start',
      items: item.menuItems!,
      isDisabled: blocked,
      onOpenChange: (open) => {
        if (open) this._options.onItemMenuOpen?.({ index });
        else this._options.onItemMenuClose?.({ index });
      },
    });

    this._itemMenus.push({ index, menu, chevron: chev });

    return btn;
  }

  private _buildOverflowTrigger(
    collapsed: { item: ArvoBreadcrumbItem; index: number; label: string }[],
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arvo-bc__overflow';
    btn.setAttribute('aria-label', this._options.overflowAriaLabel);
    if (this._options.isDisabled || this._options.isLoading) {
      btn.disabled = true;
    }

    const ico = document.createElement('span');
    ico.className = 'o9con o9con-ellipsis-h';
    ico.setAttribute('aria-hidden', 'true');
    btn.appendChild(ico);

    // Wire the ActionMenu to the trigger; ArvoActionMenu writes
    // aria-haspopup / aria-controls / aria-expanded onto `btn` and binds
    // its own click handler.
    const menuItems: MenuItemData[] = collapsed.map((c) => ({
      id: String(c.index),
      label: c.label,
      icon: c.item.icon,
    }));

    // Hybrid options surface: spread `menuProps` first so flat / parent-
    // computed values win on overlap. Only bag-only keys flow through.
    this._overflowMenu = new ArvoActionMenu(btn, {
      ...(this._options.menuProps ?? {}),
      placement: this._options.menuProps?.placement ?? 'bottom-start',
      items: menuItems,
      isDisabled: this._options.isDisabled || this._options.isLoading,
      onSelect: (menuItem) => this._handleOverflowSelect(menuItem),
      onOpenChange: (open) => {
        if (open) this._options.onOverflowOpen?.();
        else this._options.onOverflowClose?.();
      },
    });

    return btn;
  }

  private _destroyMenus(): void {
    if (this._overflowMenu) {
      this._overflowMenu.destroy();
      this._overflowMenu = null;
    }
    if (this._itemMenus.length) {
      this._itemMenus.forEach((rec) => rec.menu.destroy());
      this._itemMenus = [];
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private _handleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const target = (event.target as HTMLElement)?.closest(
      '.arvo-bc__lnk',
    ) as HTMLElement | null;
    // Skip dropdown link triggers -- the ActionMenu engine handles those.
    if (!target || target.classList.contains('arvo-bc__lnk--dd')) return;

    const index = Number(target.dataset.index);
    const item = this._options.items[index];
    if (!item) return;

    this._dispatchEvent('bc:navigate', {
      href: item.href ?? '',
      index,
      label: item.label,
    });

    if (this._options.onNavigate && item.href) {
      this._options.onNavigate({
        href: item.href,
        index,
        label: item.label,
      });
    }
  }

  private _handleOverflowSelect(menuItem: MenuItemData): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    const index = Number(menuItem.id);
    const collapsed = this._options.items[index];
    if (!collapsed) return;

    this._dispatchEvent('bc:navigate', {
      href: collapsed.href ?? '',
      index,
      label: collapsed.label,
    });

    if (this._options.onNavigate && collapsed.href) {
      this._options.onNavigate({
        href: collapsed.href,
        index,
        label: collapsed.label,
      });
    }
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        cancelable: true,
        detail,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setItems(items: ArvoBreadcrumbItem[]): void {
    this._options.items = items;
    this._rebuildTrail();
  }

  /**
   * Set the breadcrumb size at runtime. Updates the size modifier class and
   * re-evaluates skeleton geometry while loading.
   */
  setSize(size: ArvoBreadcrumbSize): void {
    if (this._options.size === size) return;
    const el = this._element;
    if (!el) return;
    el.classList.remove(`arvo-bc--${this._options.size}`);
    this._options.size = size;
    el.classList.add(`arvo-bc--${size}`);
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }
    if (this._options.isDisabled === state) return;
    this._options.isDisabled = state;
    this._element?.classList.toggle('is-disabled', state);
    this._rebuildTrail();
  }

  setLoading(isLoading: boolean): void {
    if (this._options.isLoading === isLoading) return;

    this._options.isLoading = isLoading;
    this._render();
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    this._listEl?.removeEventListener('click', this._boundHandleClick);
    this._destroyMenus();

    el.classList.remove(
      'arvo-bc',
      'arvo-bc--sm',
      'arvo-bc--lg',
      'is-disabled',
      'loading',
    );
    el.removeAttribute('aria-label');
    el.removeAttribute('aria-busy');

    el.innerHTML = this._originalContent;

    this._element = null;
    this._listEl = null;
    this._skeletonEl = null;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Re-renders the trail (loaded state only). Cleans up any existing
   * overflow / per-item menu instances and rebuilds the list.
   */
  private _rebuildTrail(): void {
    if (this._options.isLoading) return;
    if (!this._listEl) {
      // Loaded state was never built (e.g. first render was loading); fall
      // back to a full re-render.
      this._render();
      return;
    }
    this._buildItems();
  }
}
