export type SortableAxis = 'x' | 'y';

export interface SortableListOptions {
  /** CSS selector to identify draggable items within the container. */
  itemSelector: string;
  /** CSS selector for the drag handle within each item. If null, the whole item is the handle. */
  handleSelector: string | null;
  /**
   * Reorder axis. `'y'` (default) is the vertical-list pattern ArvoList uses;
   * `'x'` is the horizontal-strip pattern ArvoTabstrip uses. The axis drives
   * both the projection used to find the nearest target and the keyboard
   * shortcut bindings (ArrowUp/Down for `'y'`, ArrowLeft/Right for `'x'`).
   */
  axis?: SortableAxis;
  /**
   * Returns the group identifier for an item element.
   * Items with the same group can be reordered within that group.
   * Return null for ungrouped items (flat list).
   */
  getGroupOf?: (item: HTMLElement) => string | null;
  /** Whether items can be dragged across group boundaries. Default: false. */
  allowCrossGroup?: boolean;
  /**
   * Pointer movement threshold (in CSS px along the drag axis) before a
   * drag is actually initiated. A `pointerdown` by itself no longer flips
   * the item into the drag state -- the pointer must travel at least
   * this many pixels along the drag axis (with a small `0.5x` slack on
   * the cross axis) before the ghost class is applied and the floating
   * clone mounts. Used to distinguish a click on the item from a true
   * drag pickup. Default: `0` (legacy behavior -- drag starts immediately
   * on pointerdown so existing consumers like ArvoList stay unchanged).
   */
  dragThreshold?: number;
  /**
   * Fraction of a target item's drag-axis size the dragged source must
   * overlap before sibling displacement happens (sets the swap line at
   * `target.lead + size * overlapThreshold` instead of `target.lead +
   * size / 2`). Lower values feel "looser" -- the source pushes
   * neighbors aside as soon as it has moved into them by `~25%` rather
   * than crossing their midpoint. Clamped to `[0, 0.5]`. Default: `0.5`
   * (the historical midpoint behavior).
   */
  overlapThreshold?: number;
  /**
   * Lock the floating drag clone's cross-axis position to the container
   * instead of pinning it to the source's pickup viewport position.
   * Without this option a `position: fixed` clone keeps its initial
   * viewport position while the page (and container) scrolls underneath,
   * which makes the lifted item appear to drift off the strip on
   * vertical scroll during a horizontal drag. With this option the
   * clone's cross-axis edge is recomputed from the container's current
   * rect on every pointermove + on `scroll` events, so the clone tracks
   * the strip. Default: `false`.
   */
  lockCrossAxisToContainer?: boolean;
  /**
   * Return the drag-axis viewport coordinates the floating clone must
   * stay within for the given source item. The returned `min` / `max`
   * represent the leading and trailing edges (in CSS px from the viewport
   * origin along the active axis) -- the clone's leading edge is clamped
   * to `min` and its trailing edge to `max` so it can never visually
   * escape the source's allowed region. Use this together with
   * `getGroupOf` to keep dragged items inside their group's bounds
   * (e.g. an unpinned tab must not visually overlap pinned tabs nor the
   * trailing right-cluster). Called once on drag pickup and re-evaluated
   * on every pointermove + scroll. Return `null` to disable clamping for
   * the drag.
   */
  getDragBounds?: (item: HTMLElement) =>
    | { min: number; max: number }
    | null;
  /** Called continuously as the dragged item moves, with preview indices. */
  onPreview?: (fromIndex: number, toIndex: number) => void;
  /** Called when a drag completes and item position is committed. */
  onCommit?: (
    fromIndex: number,
    toIndex: number,
    fromGroup: string | null,
    toGroup: string | null,
  ) => void;
  /** Called when a drag is cancelled (Escape, invalid drop, etc.). */
  onCancel?: () => void;
  /** CSS class applied to the source row during drag (the in-list ghost). Default: 'arvo-sortable--ghost'. */
  ghostClass?: string;
  /** CSS class applied to the cloned drag image that follows the pointer. Default: 'arvo-sortable--dragging'. */
  draggingClass?: string;
}

export interface SortableHandle {
  /** Clean up all listeners and DOM artifacts. */
  destroy: () => void;
  /** Whether a drag is currently in progress. */
  isDragging: () => boolean;
}

interface PendingDrag {
  item: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  pointerTarget: HTMLElement | null;
}

interface DragState {
  sourceItem: HTMLElement;
  sourceIndex: number;
  sourceGroup: string | null;
  /** Original parent element so cancel can restore exactly where it picked up. */
  sourceParent: HTMLElement | null;
  /** Original next-sibling reference so cancel can re-insert at the same slot. */
  sourceNextSibling: Element | null;
  clone: HTMLElement;
  /** Source's clientWidth/clientHeight at pickup -- used by displacement math. */
  sourceWidth: number;
  sourceHeight: number;
  currentIndex: number;
  currentGroup: string | null;
  /** Pointer-to-source-rect offsets captured on pickup; the drag axis uses
   *  its offset to position the clone, the cross-axis offset is unused but
   *  recorded for symmetry. */
  offsetX: number;
  offsetY: number;
  /** Source's cross-axis offset relative to the container at pickup. Used
   *  by `lockCrossAxisToContainer` to recompute the clone's cross-axis
   *  position as the container moves (scroll). */
  crossAxisOffsetInContainer: number;
  liveRegion: HTMLElement;
}

const FLIP_DURATION_MS = 180;

function getItemIndex(items: HTMLElement[], el: HTMLElement): number {
  return items.indexOf(el);
}

/**
 * Find the target item whose swap line the pointer has crossed. The swap
 * line sits at `lead + size * threshold` from the target's leading edge
 * (along the drag axis); a `threshold` of 0.5 reproduces the historical
 * midpoint behavior, while smaller values (e.g. 0.25) make displacement
 * feel "looser" -- siblings shift aside as soon as the source has
 * overlapped them by `threshold * size` instead of crossing their
 * midpoint. `'before'` means the source should slot ahead of the target;
 * `'after'` means past the last item.
 */
function findClosestItem(
  items: HTMLElement[],
  pointer: number,
  axis: SortableAxis,
  threshold: number,
): { index: number; position: 'before' | 'after' } | null {
  const t = Math.min(Math.max(threshold, 0), 0.5);
  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect();
    const lead = axis === 'y' ? rect.top : rect.left;
    const size = axis === 'y' ? rect.height : rect.width;
    // Swap line sits `t * size` past the leading edge, so the dragged
    // source displaces the target as soon as the pointer has entered
    // its first `t` fraction.
    const swap = lead + size * t;
    if (pointer < swap) return { index: i, position: 'before' };
  }
  if (items.length > 0) {
    return { index: items.length - 1, position: 'after' };
  }
  return null;
}

function getOrCreateLiveRegion(): HTMLElement {
  let region = document.getElementById('arvo-sortable-live');
  if (!region) {
    region = document.createElement('div');
    region.id = 'arvo-sortable-live';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(region);
  }
  return region;
}

function announce(region: HTMLElement, message: string): void {
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function createSortableList(
  container: HTMLElement,
  options: SortableListOptions,
): SortableHandle {
  const {
    itemSelector,
    handleSelector,
    axis = 'y',
    getGroupOf,
    allowCrossGroup = false,
    dragThreshold = 0,
    overlapThreshold = 0.5,
    lockCrossAxisToContainer = false,
    getDragBounds,
    onPreview,
    onCommit,
    onCancel,
    ghostClass = 'arvo-sortable--ghost',
    draggingClass = 'arvo-sortable--dragging',
  } = options;

  let state: DragState | null = null;
  let pending: PendingDrag | null = null;
  let destroyed = false;

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
  }

  function getGroupItems(
    items: HTMLElement[],
    group: string | null,
  ): HTMLElement[] {
    if (!getGroupOf || group === null) return items;
    return items.filter((item) => getGroupOf(item) === group);
  }

  /**
   * FLIP-style sibling slide:
   * 1. Caller snapshots the bounding rects of every item BEFORE the DOM move.
   * 2. Caller performs the DOM move (insertBefore).
   * 3. We invert: every item that shifted gets an inline transform that puts it
   *    back where it was visually, then on the next frame we clear the
   *    transform and let the CSS transition animate it to its new home.
   */
  function flipSiblings(prevRects: Map<HTMLElement, DOMRect>): void {
    prevRects.forEach((prevRect, el) => {
      if (el === state?.sourceItem) return;
      const nextRect = el.getBoundingClientRect();
      const delta = axis === 'y'
        ? prevRect.top - nextRect.top
        : prevRect.left - nextRect.left;
      if (delta === 0) return;
      el.style.transition = 'none';
      el.style.transform = axis === 'y'
        ? `translateY(${delta}px)`
        : `translateX(${delta}px)`;
      void el.offsetWidth;
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_DURATION_MS}ms var(--arvo-ease-simple, ease)`;
        el.style.transform = '';
        window.setTimeout(() => {
          el.style.transition = '';
          el.style.transform = '';
        }, FLIP_DURATION_MS + 20);
      });
    });
  }

  function startDrag(item: HTMLElement, clientX: number, clientY: number): void {
    if (state) return;

    const items = getItems();
    const index = getItemIndex(items, item);
    if (index === -1) return;

    const group = getGroupOf?.(item) ?? null;
    const rect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const parent = item.parentElement;
    const nextSibling = item.nextElementSibling;

    const clone = item.cloneNode(true) as HTMLElement;
    clone.classList.add(draggingClass);
    clone.removeAttribute('id');
    Object.assign(clone.style, {
      position: 'fixed',
      zIndex: '10000',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      pointerEvents: 'none',
      margin: '0',
    });
    document.body.appendChild(clone);

    item.classList.add(ghostClass);

    const liveRegion = getOrCreateLiveRegion();

    // Cross-axis offset of the source within the container at pickup --
    // used by `lockCrossAxisToContainer` to follow the container's
    // cross-axis position (e.g. on vertical scroll during a horizontal
    // drag).
    const crossAxisOffsetInContainer = axis === 'y'
      ? rect.left - containerRect.left
      : rect.top - containerRect.top;

    state = {
      sourceItem: item,
      sourceIndex: index,
      sourceGroup: group,
      sourceParent: parent,
      sourceNextSibling: nextSibling,
      clone,
      sourceWidth: rect.width,
      sourceHeight: rect.height,
      currentIndex: index,
      currentGroup: group,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      crossAxisOffsetInContainer,
      liveRegion,
    };

    container.classList.add('is-dragging');

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('keydown', onKeydownDuringDrag);
    if (lockCrossAxisToContainer) {
      // Capture-phase listener: scroll events don't bubble, so we listen
      // globally and reposition the clone on every layout shift.
      window.addEventListener('scroll', onScrollDuringDrag, true);
    }
  }

  /**
   * Re-anchor the clone's cross-axis position to the container's current
   * viewport position. Called on every move + on scroll while the option
   * is enabled. Without this the clone is `position: fixed` and would
   * stay glued to the viewport while the strip scrolls away from it.
   */
  function syncCloneCrossAxis(): void {
    if (!state || !lockCrossAxisToContainer) return;
    const containerRect = container.getBoundingClientRect();
    if (axis === 'y') {
      state.clone.style.left = `${containerRect.left + state.crossAxisOffsetInContainer}px`;
    } else {
      state.clone.style.top = `${containerRect.top + state.crossAxisOffsetInContainer}px`;
    }
  }

  function moveDrag(clientX: number, clientY: number): void {
    if (!state) return;

    // Clone tracks the pointer along the drag axis, optionally clamped
    // to the source's `getDragBounds` so the lifted item can never
    // visually escape its allowed region (e.g. an unpinned tab cannot
    // overlap the pinned tabs or the right-edge cluster).
    let primary = axis === 'y'
      ? clientY - state.offsetY
      : clientX - state.offsetX;
    let clampedPointer = axis === 'y' ? clientY : clientX;
    const bounds = getDragBounds?.(state.sourceItem) ?? null;
    if (bounds) {
      const size = axis === 'y' ? state.sourceHeight : state.sourceWidth;
      const minLead = bounds.min;
      const maxLead = bounds.max - size;
      if (maxLead >= minLead) {
        const before = primary;
        primary = Math.max(minLead, Math.min(maxLead, primary));
        if (primary === minLead && before < minLead) {
          // Clamped against the leading edge of the bound. Pin the
          // displacement-detection pointer at `minLead - 1` so
          // `findClosestItem` returns `'before'` the first non-source
          // item in the group regardless of where inside the source
          // the user originally picked it up -- otherwise the source
          // could never reach the leading slot of its group.
          clampedPointer = minLead - 1;
        } else if (primary === maxLead && before > maxLead) {
          // Clamped against the trailing edge -- pin the pointer past
          // the trailing item's swap line so `findClosestItem` falls
          // through to the `'after'` last-item return. Mirrors the
          // leading-edge fix above; together they guarantee both
          // group endpoints are always reachable.
          clampedPointer = maxLead + size + 1;
        } else {
          // Inside the bounds: compensate the displacement-detection
          // pointer by the same amount the clone was clamped so the
          // source doesn't try to displace siblings that are
          // physically outside its group.
          clampedPointer += primary - before;
        }
      }
    }
    if (axis === 'y') {
      state.clone.style.top = `${primary}px`;
    } else {
      state.clone.style.left = `${primary}px`;
    }

    // Cross-axis lock: re-anchor to the container on every move so the
    // clone follows scroll-induced container shifts during the drag.
    syncCloneCrossAxis();

    const items = getItems();
    const pointer = clampedPointer;
    const target = findClosestItem(items, pointer, axis, overlapThreshold);
    if (!target) return;

    const targetItem = items[target.index];
    if (targetItem === state.sourceItem) return;

    const targetGroup = getGroupOf?.(targetItem) ?? null;

    if (!allowCrossGroup && getGroupOf && state.sourceGroup !== null) {
      if (targetGroup !== state.sourceGroup) return;
    }

    const prevRects = new Map<HTMLElement, DOMRect>();
    for (const it of items) {
      prevRects.set(it, it.getBoundingClientRect());
    }

    const targetParent = targetItem.parentElement;
    if (!targetParent) return;

    const insertBefore =
      target.position === 'before' ? targetItem : targetItem.nextSibling;

    const alreadyThere =
      state.sourceItem.parentElement === targetParent &&
      state.sourceItem.nextSibling === insertBefore;
    if (alreadyThere) return;

    targetParent.insertBefore(state.sourceItem, insertBefore);

    flipSiblings(prevRects);

    const newItems = getItems();
    const newIndex = newItems.indexOf(state.sourceItem);
    if (newIndex !== state.currentIndex || targetGroup !== state.currentGroup) {
      state.currentIndex = newIndex;
      state.currentGroup = targetGroup;
      onPreview?.(state.sourceIndex, newIndex);
    }
  }

  function commitDrag(): void {
    if (!state) return;

    const { sourceItem, sourceIndex, sourceGroup } = state;
    const finalItems = getItems();
    const currentIndex = finalItems.indexOf(sourceItem);
    const currentGroup = getGroupOf?.(sourceItem) ?? null;

    cleanupDrag();

    if (sourceIndex !== currentIndex || sourceGroup !== currentGroup) {
      const groupItems = getGroupItems(getItems(), currentGroup);
      const posInGroup = groupItems.indexOf(sourceItem) + 1;
      announce(
        getOrCreateLiveRegion(),
        `Moved item to position ${posInGroup} of ${groupItems.length}`,
      );
      onCommit?.(sourceIndex, currentIndex, sourceGroup, currentGroup);
    }
  }

  function cancelDrag(): void {
    if (!state) return;

    if (state.sourceParent) {
      state.sourceParent.insertBefore(state.sourceItem, state.sourceNextSibling);
    }

    cleanupDrag();
    onCancel?.();
  }

  function cleanupDrag(): void {
    if (!state) return;

    state.sourceItem.classList.remove(ghostClass);
    state.clone.remove();
    const items = getItems();
    for (const it of items) {
      if (it.style.transform) it.style.transform = '';
      if (it.style.transition) it.style.transition = '';
    }
    container.classList.remove('is-dragging');

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    document.removeEventListener('keydown', onKeydownDuringDrag);
    if (lockCrossAxisToContainer) {
      window.removeEventListener('scroll', onScrollDuringDrag, true);
    }

    state = null;
  }

  /**
   * Clear the pre-drag pending state (pointerdown recorded but the
   * pointer hasn't moved far enough yet). Called on a sub-threshold
   * pointerup so the next click on a non-handle area doesn't carry over
   * the previous pickup.
   */
  function cleanupPending(): void {
    if (!pending) return;
    document.removeEventListener('pointermove', onPendingPointerMove);
    document.removeEventListener('pointerup', onPendingPointerUp);
    document.removeEventListener('pointercancel', onPendingPointerCancel);
    pending = null;
  }

  function onPointerDown(e: PointerEvent): void {
    if (destroyed) return;
    const target = e.target as HTMLElement;

    let handleEl: HTMLElement | null = null;
    if (handleSelector) {
      handleEl = target.closest<HTMLElement>(handleSelector);
      if (!handleEl) return;
    }

    const item = target.closest<HTMLElement>(itemSelector);
    if (!item || !container.contains(item)) return;

    if (dragThreshold > 0) {
      // Don't preventDefault or capture the pointer yet -- the user may
      // simply be clicking. The threshold path defers commitment until
      // the pointer actually travels.
      pending = {
        item,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        pointerTarget: target,
      };
      document.addEventListener('pointermove', onPendingPointerMove);
      document.addEventListener('pointerup', onPendingPointerUp);
      document.addEventListener('pointercancel', onPendingPointerCancel);
      return;
    }

    // Legacy path: drag starts immediately on pointerdown. Preserves
    // existing behavior for consumers (ArvoList) that haven't opted in
    // to the threshold.
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startDrag(item, e.clientX, e.clientY);
  }

  function onPendingPointerMove(e: PointerEvent): void {
    if (!pending || e.pointerId !== pending.pointerId) return;
    // Only the drag-axis delta counts toward the threshold so a small
    // sideways jitter doesn't accidentally trip a drag; the cross-axis
    // gets a smaller slack budget so off-axis swipes also can't.
    const primaryDelta = axis === 'y'
      ? Math.abs(e.clientY - pending.startY)
      : Math.abs(e.clientX - pending.startX);
    const crossDelta = axis === 'y'
      ? Math.abs(e.clientX - pending.startX)
      : Math.abs(e.clientY - pending.startY);
    const tripped = primaryDelta >= dragThreshold;
    // If the user is dragging hard sideways (cross-axis dominant) we
    // still don't pick up -- they're probably scrolling.
    if (!tripped) return;
    if (crossDelta > primaryDelta * 1.5) return;

    // Commit to the drag now.
    e.preventDefault();
    const { item } = pending;
    pending.pointerTarget?.setPointerCapture?.(pending.pointerId);
    cleanupPending();
    startDrag(item, e.clientX, e.clientY);
    // Carry the current pointer position into the new drag so the first
    // displacement check uses the real position instead of the pickup.
    moveDrag(e.clientX, e.clientY);
  }

  function onPendingPointerUp(_e: PointerEvent): void {
    // Released before reaching the threshold -- treat as a click and
    // forget the pickup. The host's click handler still fires normally.
    cleanupPending();
  }

  function onPendingPointerCancel(_e: PointerEvent): void {
    cleanupPending();
  }

  function onPointerMove(e: PointerEvent): void {
    moveDrag(e.clientX, e.clientY);
  }

  function onScrollDuringDrag(_e: Event): void {
    syncCloneCrossAxis();
  }

  function onPointerUp(_e: PointerEvent): void {
    commitDrag();
  }

  function onPointerCancel(_e: PointerEvent): void {
    cancelDrag();
  }

  function onKeydownDuringDrag(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelDrag();
    }
  }

  function onKeydownForReorder(e: KeyboardEvent): void {
    if (destroyed || state) return;
    if (!e.ctrlKey && !e.metaKey) return;

    const decKey = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
    const incKey = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
    if (e.key !== decKey && e.key !== incKey) return;

    const target = e.target as HTMLElement;
    const handle = handleSelector
      ? target.closest<HTMLElement>(handleSelector)
      : null;
    if (handleSelector && !handle) return;

    const item = target.closest<HTMLElement>(itemSelector);
    if (!item || !container.contains(item)) return;

    e.preventDefault();
    const items = getItems();
    const index = getItemIndex(items, item);
    if (index === -1) return;

    const group = getGroupOf?.(item) ?? null;
    const direction = e.key === decKey ? -1 : 1;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    const targetItem = items[newIndex];
    const targetGroup = getGroupOf?.(targetItem) ?? null;

    if (!allowCrossGroup && getGroupOf && group !== null) {
      if (targetGroup !== group) return;
    }

    const groupItems = getGroupItems(items, targetGroup ?? group);
    const posInGroup = groupItems.indexOf(targetItem) + 1;
    const directionLabel = axis === 'y'
      ? (direction === -1 ? 'up' : 'down')
      : (direction === -1 ? 'left' : 'right');
    announce(
      getOrCreateLiveRegion(),
      `Moved item ${directionLabel} to position ${posInGroup} of ${groupItems.length}`,
    );

    onCommit?.(index, newIndex, group, targetGroup);
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('keydown', onKeydownForReorder);

  return {
    destroy() {
      destroyed = true;
      cleanupPending();
      if (state) cancelDrag();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('keydown', onKeydownForReorder);
    },
    isDragging() {
      return state !== null;
    },
  };
}
