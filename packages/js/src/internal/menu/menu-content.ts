/**
 * Vanilla-JS menu-content factory consumed by `ArvoContextMenu` (today) and
 * slated for `ArvoActionMenu` adoption in a follow-up convergence pass.
 *
 * Mirrors the React `MenuContent` component exactly (item DOM, keyboard,
 * submenu management, item invocation) so the React + JS twins stay
 * structurally parallel.
 *
 * The factory builds the inner scroll body of a menu panel -- it does NOT
 * own the surface (positioning / focus trap / mounting / ARIA on the panel
 * element). The caller (`ArvoContextMenu`) wires `createOverlaySurface`
 * around it and passes `parentSurfaceId` + a `requestSubmenuPanel`
 * callback so nested submenus can be built as full menu surfaces.
 */

import {
  createArrowNav,
  type ArrowNav,
} from '@arvo/core';
import {
  attachTitleTruncationTooltip,
  formatShortcutDisplay,
  type TitleTruncationHandle,
} from '@arvo/utils';
import {
  flattenContextMenuItems,
  isContextMenuFocusable,
  isContextMenuGrouped,
  isContextMenuSelected,
  type ContextMenuItem,
  type ContextMenuItemGroup,
  type ContextMenuItems,
  type MenuItemStatus,
} from './types';

export interface MenuContentSelectInfo<TContext = unknown> {
  item: ContextMenuItem<TContext>;
  index: number;
  context: TContext;
  /** `true` for default close-on-select; `false` for checkbox/radio toggles. */
  closeOnSelect: boolean;
}

/**
 * Callback the caller supplies to create a nested submenu surface. The
 * caller is responsible for building the panel DOM, wiring
 * `createOverlaySurface` with `parentId + relation: 'submenu'`, and
 * returning a controller the MenuContent can `open` / `close` / `destroy`.
 *
 * The MenuContent does NOT mount nested surfaces itself because surface
 * mechanics (DOM placement, hub config, ARIA) belong to the host
 * component. This keeps the menu-content primitive purely
 * content-focused and lets the caller (`ArvoContextMenu`) reuse the same
 * surface-construction code for every level.
 */
export interface MenuSubmenuController<_TContext = unknown> {
  /** The panel element the submenu's content lives in. */
  panelEl: HTMLElement;
  /** Open the submenu (positions + activates focus). */
  open(): void;
  /** Close the submenu (does not deinstantiate). */
  close(): void;
  /** Tear down the submenu's surface + content. */
  destroy(): void;
  /** Whether the submenu is currently open. */
  isOpen(): boolean;
}

export interface MenuContentOptions<TContext = unknown> {
  items: ContextMenuItems<TContext>;
  /** Request context passed to per-item callbacks. */
  context: TContext;
  /** The owning surface id (used to namespace row ids). */
  surfaceId: string;
  /** Parent overlay id for nested submenu registration. */
  parentSurfaceId: string;
  /** Submenu open-on-hover delay in ms. Default 200. */
  submenuHoverDelayMs?: number;
  /** Render dividers between non-first groups. Default true. */
  hasGroupDividers?: boolean;
  /**
   * Called when an item is invoked. Checkbox/radio toggles fire with
   * `closeOnSelect: false` after the item's own `onChange` has run.
   */
  onSelect: (info: MenuContentSelectInfo<TContext>) => void;
  /** Called when the menu requests close (Escape on the root level). */
  onRequestClose: () => void;
  /**
   * Factory the menu uses to build a nested submenu for a given parent
   * row. The caller wires `createOverlaySurface` with
   * `parentId: parentSurfaceId`, `relation: 'submenu'`, anchored to the
   * parent row. The MenuContent owns open/close timing.
   */
  createSubmenuController(args: {
    parentItem: ContextMenuItem<TContext> & { submenu: ContextMenuItem<TContext>[] };
    parentRowEl: HTMLElement;
    parentSurfaceId: string;
    context: TContext;
    /** Called when any descendant selects an item (bubbles to root). */
    onSelect: (info: MenuContentSelectInfo<TContext>) => void;
    /** Called when this submenu requests close (Escape / ArrowLeft). */
    onClose: () => void;
  }): MenuSubmenuController<TContext>;
}

export interface MenuContent {
  /** The scroll container (caller appends to its panel). */
  element: HTMLElement;
  /** Imperatively focus the first focusable row. */
  focus(): void;
  /** Replace the items + re-render. */
  update(next: { items?: ContextMenuItems<unknown>; context?: unknown }): void;
  /** Whether any nested submenu is currently open. */
  hasOpenSubmenu(): boolean;
  /** Tear down arrow-nav, submenus, and inline event listeners. */
  destroy(): void;
}

const DEFAULT_SUBMENU_HOVER_DELAY = 200;

interface RenderedRow<TContext> {
  item: ContextMenuItem<TContext>;
  el: HTMLElement;
  /** Cached submenu controller (created lazily on first open). */
  submenu?: MenuSubmenuController<TContext>;
}

export function createMenuContent<TContext = unknown>(
  options: MenuContentOptions<TContext>,
): MenuContent {
  const {
    submenuHoverDelayMs = DEFAULT_SUBMENU_HOVER_DELAY,
    hasGroupDividers = true,
    onSelect,
    onRequestClose,
    createSubmenuController,
  } = options;

  let currentItems = options.items;
  let currentContext = options.context;
  const surfaceId = options.surfaceId;
  const parentSurfaceId = options.parentSurfaceId;

  const scrollEl = document.createElement('div');
  scrollEl.className = 'arvo-context-menu__scroll';

  const rows = new Map<string, RenderedRow<TContext>>();
  let flat: ContextMenuItem<TContext>[] = [];
  let activeIndex = 0;
  let openSubmenuId: string | null = null;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let arrow: ArrowNav | null = null;
  // Per-row truncation tooltip handles -- disposed in destroy() AND on
  // every re-render before buildRow() runs again (so swapping items
  // doesn't leak the old handles).
  const truncationHandles: TitleTruncationHandle[] = [];

  function clearHoverTimer(): void {
    if (hoverTimer !== null) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function resolveStatus(status: MenuItemStatus | undefined): {
    modifier: string | null;
    inlineColor: string | null;
  } {
    if (!status) return { modifier: null, inlineColor: null };
    if (typeof status === 'string') {
      return { modifier: `arvo-menu-item--status-${status}`, inlineColor: null };
    }
    return { modifier: null, inlineColor: status.color };
  }

  function buildRow(item: ContextMenuItem<TContext>, index: number): HTMLElement {
    const rowId = `${surfaceId}-row-${index}`;
    if (item.kind === 'separator') {
      const el = document.createElement('div');
      el.id = rowId;
      el.className = 'arvo-menu-item__divider';
      el.setAttribute('role', 'separator');
      el.dataset.index = String(index);
      el.style.pointerEvents = 'none';
      return el;
    }

    const hasSubmenu = 'submenu' in item && !!item.submenu?.length;
    // Anchor rows: render as <a> when href is set and there's no submenu.
    // Submenu items override href because their activation opens the child
    // surface rather than navigating away.
    const useAnchor = !!item.href && !hasSubmenu;
    const isExternal = useAnchor && item.target === '_blank';

    const el = useAnchor
      ? (document.createElement('a') as HTMLAnchorElement)
      : document.createElement('div');
    el.id = rowId;
    el.dataset.index = String(index);
    el.setAttribute('tabindex', '-1');

    const status = resolveStatus(item.status);
    const isSelected = isContextMenuSelected(item);

    const classes = ['arvo-menu-item'];
    if (item.secondaryLabel) classes.push('arvo-menu-item--multi-line');
    if ('destructive' in item && item.destructive) {
      classes.push('arvo-menu-item--destructive');
    }
    if (status.modifier) classes.push(status.modifier);
    if (item.isDisabled) classes.push('is-disabled');
    if (isSelected) classes.push('active');
    el.className = classes.join(' ');

    if (status.inlineColor) {
      el.style.setProperty('--arvo-menu-item-status-color', status.inlineColor);
    }

    if (item.kind === 'checkbox') el.setAttribute('role', 'menuitemcheckbox');
    else if (item.kind === 'radio') el.setAttribute('role', 'menuitemradio');
    else el.setAttribute('role', 'menuitem');

    if (item.isDisabled) el.setAttribute('aria-disabled', 'true');
    if (item.kind === 'checkbox' || item.kind === 'radio') {
      el.setAttribute('aria-checked', item.checked ? 'true' : 'false');
    }
    if (hasSubmenu) {
      el.setAttribute('aria-haspopup', 'menu');
      el.setAttribute('aria-expanded', 'false');
    }

    if (useAnchor) {
      const anchor = el as HTMLAnchorElement;
      anchor.href = item.href!;
      anchor.target = item.target ?? '_self';
      if (item.target === '_blank') {
        anchor.rel = 'noopener noreferrer';
      }
    }

    if (isExternal) {
      el.setAttribute('aria-label', `${item.label}, opens in a new window`);
    }

    if (item.avatar) {
      const avatar = document.createElement('img');
      avatar.className = 'arvo-menu-item__avatar';
      avatar.src = item.avatar;
      avatar.alt = '';
      avatar.setAttribute('aria-hidden', 'true');
      el.appendChild(avatar);
    }

    if (item.icon) {
      const ico = document.createElement('span');
      ico.className = `arvo-menu-item__ico o9con o9con-${item.icon}`;
      ico.setAttribute('aria-hidden', 'true');
      el.appendChild(ico);
    }

    const txt = document.createElement('span');
    txt.className = 'arvo-menu-item__txt';
    const lbl = document.createElement('span');
    lbl.className = 'arvo-menu-item__lbl';
    lbl.textContent = item.label;
    txt.appendChild(lbl);
    if (item.secondaryLabel) {
      const secondary = document.createElement('span');
      secondary.className = 'arvo-menu-item__secondary';
      secondary.textContent = item.secondaryLabel;
      txt.appendChild(secondary);
    }
    el.appendChild(txt);

    const trailingParts: HTMLElement[] = [];

    if (item.status) {
      const statusEl = document.createElement('span');
      statusEl.className = 'arvo-menu-item__status';
      statusEl.setAttribute('aria-hidden', 'true');
      trailingParts.push(statusEl);
    }
    if (item.value) {
      const meta = document.createElement('span');
      meta.className = 'arvo-menu-item__meta';
      meta.textContent = item.value;
      trailingParts.push(meta);
    }
    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'arvo-menu-item__shortcut';
      shortcut.textContent = formatShortcutDisplay(item.shortcut);
      trailingParts.push(shortcut);
    }
    if (hasSubmenu) {
      const submenuIcon = document.createElement('span');
      submenuIcon.className = 'arvo-menu-item__submenu o9con o9con-angle-right';
      submenuIcon.setAttribute('aria-hidden', 'true');
      trailingParts.push(submenuIcon);
    }
    if (isExternal) {
      const externalIcon = document.createElement('span');
      externalIcon.className = 'arvo-menu-item__external o9con o9con-external-link';
      externalIcon.setAttribute('aria-hidden', 'true');
      trailingParts.push(externalIcon);
    }
    if (trailingParts.length > 0) {
      const trailing = document.createElement('span');
      trailing.className = 'arvo-menu-item__trailing';
      for (const part of trailingParts) trailing.appendChild(part);
      el.appendChild(trailing);
    }

    el.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      invokeItem(item, index);
    });

    el.addEventListener('pointerenter', () => {
      if (item.isDisabled) return;
      setActive(index);
      if (hasSubmenu) {
        clearHoverTimer();
        if (submenuHoverDelayMs <= 0) {
          openSubmenuFor(item, el);
        } else {
          hoverTimer = setTimeout(() => openSubmenuFor(item, el), submenuHoverDelayMs);
        }
      } else if (openSubmenuId) {
        clearHoverTimer();
        hoverTimer = setTimeout(() => closeSubmenuChain(), submenuHoverDelayMs);
      }
    });

    // Wire the shared truncation tooltip (visual-only, no
    // `aria-describedby` -- matches Button / Toast / List). The full
    // label is already part of the row's visible accessible name.
    const labelEl = el.querySelector<HTMLElement>('.arvo-menu-item__lbl');
    if (labelEl && item.label) {
      const handle = attachTitleTruncationTooltip({
        triggerElement: el,
        element: labelEl,
        content: item.label,
        placement: 'top-center',
      });
      truncationHandles.push(handle);
    }

    return el;
  }

  function openSubmenuFor(
    item: ContextMenuItem<TContext>,
    parentRowEl: HTMLElement,
  ): void {
    if (item.kind === 'separator' || !('submenu' in item) || !item.submenu) return;
    if (openSubmenuId === item.id) return;
    closeSubmenuChain();

    const row = rows.get(item.id);
    if (!row) return;
    let controller = row.submenu;
    if (!controller) {
      controller = createSubmenuController({
        parentItem: item as ContextMenuItem<TContext> & {
          submenu: ContextMenuItem<TContext>[];
        },
        parentRowEl,
        parentSurfaceId,
        context: currentContext,
        onSelect: (info) => onSelect(info),
        onClose: () => {
          if (openSubmenuId === item.id) {
            openSubmenuId = null;
            parentRowEl.setAttribute('aria-expanded', 'false');
            parentRowEl.focus({ preventScroll: true });
          }
        },
      });
      row.submenu = controller;
    }
    openSubmenuId = item.id;
    parentRowEl.setAttribute('aria-expanded', 'true');
    controller.open();
  }

  function closeSubmenuChain(): void {
    if (!openSubmenuId) return;
    const row = rows.get(openSubmenuId);
    if (row?.submenu) row.submenu.close();
    if (row?.el) row.el.setAttribute('aria-expanded', 'false');
    openSubmenuId = null;
  }

  function setActive(index: number): void {
    if (index < 0 || index >= flat.length) return;
    const item = flat[index];
    if (!item || !isContextMenuFocusable(item)) return;
    activeIndex = index;
    arrow?.setIndex(index);
    rows.get(item.id)?.el.focus({ preventScroll: true });
  }

  function invokeItem(item: ContextMenuItem<TContext>, index: number): void {
    if (item.kind === 'separator' || item.isDisabled) return;
    if ('submenu' in item && item.submenu?.length) {
      const row = rows.get(item.id);
      if (row) openSubmenuFor(item, row.el);
      return;
    }
    if (item.kind === 'checkbox') {
      item.onChange?.(!item.checked, currentContext);
      onSelect({ item, index, context: currentContext, closeOnSelect: false });
      return;
    }
    if (item.kind === 'radio') {
      if (!item.checked) item.onChange?.(currentContext);
      onSelect({ item, index, context: currentContext, closeOnSelect: false });
      return;
    }
    const ret = (item as { onSelect?: (c: TContext) => void | boolean }).onSelect?.(
      currentContext,
    );
    onSelect({
      item,
      index,
      context: currentContext,
      closeOnSelect: ret !== false,
    });
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') {
      const item = flat[activeIndex];
      if (item && item.kind !== 'separator' && 'submenu' in item && item.submenu?.length) {
        e.preventDefault();
        e.stopPropagation();
        const row = rows.get(item.id);
        if (row) openSubmenuFor(item, row.el);
        return;
      }
    }
    if (e.key === 'ArrowLeft' && openSubmenuId) {
      e.preventDefault();
      e.stopPropagation();
      closeSubmenuChain();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (openSubmenuId) {
        closeSubmenuChain();
        return;
      }
      onRequestClose();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const item = flat[activeIndex];
      if (item) {
        e.preventDefault();
        invokeItem(item, activeIndex);
      }
      return;
    }
    arrow?.handleKeyDown(e);
  }

  function teardownArrow(): void {
    arrow?.destroy();
    arrow = null;
  }

  function rebuild(): void {
    clearHoverTimer();
    closeSubmenuChain();
    for (const r of rows.values()) r.submenu?.destroy();
    rows.clear();
    teardownArrow();
    // Tear down any per-row truncation tooltips from the previous render
    // before we wipe the DOM -- the handles' internal ResizeObserver
    // references would otherwise leak to detached label nodes.
    truncationHandles.forEach((h) => h.destroy());
    truncationHandles.length = 0;
    scrollEl.innerHTML = '';

    flat = flattenContextMenuItems(currentItems);
    let idx = 0;

    const appendItem = (item: ContextMenuItem<TContext>) => {
      const el = buildRow(item, idx);
      rows.set(item.id, { item, el });
      scrollEl.appendChild(el);
      idx++;
    };

    if (isContextMenuGrouped(currentItems)) {
      const groups = currentItems as ContextMenuItemGroup<TContext>[];
      groups.forEach((group, gi) => {
        if (gi > 0 && hasGroupDividers) {
          const div = document.createElement('div');
          div.className = 'arvo-context-menu__divider';
          div.setAttribute('role', 'separator');
          scrollEl.appendChild(div);
        }
        if (group.label) {
          const hdr = document.createElement('div');
          hdr.className = 'arvo-context-menu__hdr';
          hdr.textContent = group.label;
          scrollEl.appendChild(hdr);
        }
        const wrap = document.createElement('div');
        wrap.setAttribute('role', 'group');
        if (group.label) wrap.setAttribute('aria-label', group.label);
        scrollEl.appendChild(wrap);
        for (const item of group.items) {
          const el = buildRow(item, idx);
          rows.set(item.id, { item, el });
          wrap.appendChild(el);
          idx++;
        }
      });
    } else {
      for (const item of currentItems as ContextMenuItem<TContext>[]) {
        appendItem(item);
      }
    }

    const focusableEls = flat
      .map((it) => rows.get(it.id)?.el)
      .filter((el): el is HTMLElement => !!el);

    arrow = createArrowNav({
      items: focusableEls,
      orientation: 'vertical',
      wrap: true,
      onNavigate: (_el, index) => {
        const item = flat[index];
        if (!item) return;
        activeIndex = index;
        rows.get(item.id)?.el.focus({ preventScroll: true });
      },
      skipDisabled: (i) => {
        const it = flat[i];
        return !it || !isContextMenuFocusable(it);
      },
      typeAhead: {
        getLabel: (i) => {
          const it = flat[i];
          return it && it.kind !== 'separator' ? it.label : '';
        },
      },
    });

    activeIndex = flat.findIndex((it) => isContextMenuFocusable(it));
    if (activeIndex < 0) activeIndex = 0;
    arrow.setIndex(activeIndex);
  }

  function focus(): void {
    const item = flat[activeIndex];
    if (!item) return;
    rows.get(item.id)?.el.focus({ preventScroll: true });
  }

  function update(next: {
    items?: ContextMenuItems<unknown>;
    context?: unknown;
  }): void {
    let needRebuild = false;
    if (next.items !== undefined && next.items !== currentItems) {
      currentItems = next.items as ContextMenuItems<TContext>;
      needRebuild = true;
    }
    if (next.context !== undefined) {
      currentContext = next.context as TContext;
    }
    if (needRebuild) rebuild();
  }

  function destroy(): void {
    clearHoverTimer();
    closeSubmenuChain();
    for (const r of rows.values()) r.submenu?.destroy();
    rows.clear();
    teardownArrow();
    truncationHandles.forEach((h) => h.destroy());
    truncationHandles.length = 0;
    scrollEl.removeEventListener('keydown', handleKeyDown);
    scrollEl.remove();
  }

  scrollEl.addEventListener('keydown', handleKeyDown);
  rebuild();

  return {
    element: scrollEl,
    focus,
    update,
    hasOpenSubmenu: () => openSubmenuId !== null,
    destroy,
  };
}
