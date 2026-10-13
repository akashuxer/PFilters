// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSortableList } from '../sortable-list';

function createList(count: number, withGroups = false): HTMLElement {
  const container = document.createElement('div');
  if (withGroups) {
    for (const groupId of ['a', 'b']) {
      const group = document.createElement('div');
      group.dataset.group = groupId;
      for (let i = 0; i < count; i++) {
        const item = document.createElement('div');
        item.className = 'item';
        item.dataset.group = groupId;
        item.textContent = `${groupId}-${i}`;
        const handle = document.createElement('button');
        handle.className = 'handle';
        item.appendChild(handle);
        group.appendChild(item);
      }
      container.appendChild(group);
    }
  } else {
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = `item-${i}`;
      const handle = document.createElement('button');
      handle.className = 'handle';
      item.appendChild(handle);
      container.appendChild(item);
    }
  }
  document.body.appendChild(container);
  return container;
}

function mockGetBoundingClientRect(items: HTMLElement[]): void {
  items.forEach((item, i) => {
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: i * 32,
      bottom: (i + 1) * 32,
      left: 0,
      right: 264,
      width: 264,
      height: 32,
      x: 0,
      y: i * 32,
      toJSON: () => ({}),
    });
  });
}

describe('createSortableList', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
    document.getElementById('arvo-sortable-live')?.remove();
  });

  it('creates a sortable list and returns a handle', () => {
    container = createList(3);
    const handle = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
    });
    expect(handle).toBeDefined();
    expect(handle.isDragging()).toBe(false);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('starts drag on pointerdown on handle', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRect(items);

    const onPreview = vi.fn();
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onPreview,
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(sortable.isDragging()).toBe(true);
    expect(items[0].classList.contains('arvo-sortable--ghost')).toBe(true);
    expect(container.classList.contains('is-dragging')).toBe(true);

    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true }),
    );
    sortable.destroy();
  });

  it('does not start drag when clicking non-handle area', () => {
    container = createList(3);
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
    });

    const item = container.querySelector('.item')!;
    item.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(sortable.isDragging()).toBe(false);
    sortable.destroy();
  });

  it('cancels drag on Escape', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRect(items);

    const onCancel = vi.fn();
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onCancel,
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(sortable.isDragging()).toBe(true);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(sortable.isDragging()).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(items[0].classList.contains('arvo-sortable--ghost')).toBe(false);
    sortable.destroy();
  });

  it('cancelDrag restores the source to its original DOM position', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRect(items);

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
    });

    const source = items[0];
    const handleEl = source.querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Move the pointer past the midpoint of items[2] (mid=80) -- the source
    // should physically relocate to the end of the list.
    document.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 88, bubbles: true }),
    );
    const liveItems = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    expect(liveItems[liveItems.length - 1]).toBe(source);

    // Escape should restore the original DOM order.
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    const restored = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    expect(restored[0]).toBe(source);
    sortable.destroy();
  });

  it('commits on pointerup using the live DOM index for toIndex', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRect(items);

    const onCommit = vi.fn();
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onCommit,
    });

    const source = items[0];
    const handleEl = source.querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Pointer at clientY=88 lands past items[2]'s midpoint (64) so the source
    // should slot in below items[2] -- final DOM index 2.
    document.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 88, bubbles: true }),
    );

    document.dispatchEvent(
      new PointerEvent('pointerup', { clientY: 88, bubbles: true }),
    );

    expect(sortable.isDragging()).toBe(false);
    expect(onCommit).toHaveBeenCalled();
    const [from, to] = onCommit.mock.calls[0];
    expect(from).toBe(0);
    expect(to).toBe(2);
    const finalOrder = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    expect(finalOrder[2]).toBe(source);
    sortable.destroy();
  });

  it('keyboard reorder with Ctrl+ArrowDown', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onCommit,
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onCommit).toHaveBeenCalledWith(0, 1, null, null);
    sortable.destroy();
  });

  it('keyboard reorder with Ctrl+ArrowUp', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onCommit,
    });

    const handleEl = items[2].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onCommit).toHaveBeenCalledWith(2, 1, null, null);
    sortable.destroy();
  });

  it('prevents cross-group drag when allowCrossGroup is false', () => {
    container = createList(3, true);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      getGroupOf: (item) => item.dataset.group ?? null,
      allowCrossGroup: false,
      onCommit,
    });

    const handleEl = items[2].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    if (onCommit.mock.calls.length > 0) {
      const [, , fromGroup, toGroup] = onCommit.mock.calls[0];
      expect(fromGroup).toBe(toGroup);
    }

    sortable.destroy();
  });

  it('allowCrossGroup: false leaves DOM untouched when pointer crosses groups', () => {
    container = createList(2, true);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    // a-0, a-1, b-0, b-1 stacked 32px each from y=0.
    mockGetBoundingClientRect(items);

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      getGroupOf: (item) => item.dataset.group ?? null,
      allowCrossGroup: false,
    });

    const source = items[0]; // group "a"
    const handleEl = source.querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Drag past group "b" rows; allowCrossGroup=false should refuse the move.
    document.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 120, bubbles: true }),
    );

    const groupAFirst = container.querySelectorAll<HTMLElement>(
      '[data-group="a"] .item',
    )[0];
    expect(groupAFirst).toBe(source);

    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true }),
    );
    sortable.destroy();
  });

  it('allowCrossGroup: true permits cross-group DOM moves during drag', () => {
    container = createList(2, true);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRect(items);

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      getGroupOf: (item) => item.dataset.group ?? null,
      allowCrossGroup: true,
    });

    const source = items[0]; // group "a"
    const handleEl = source.querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Drag into group "b" -- pointer at 88 lands past b-0's midpoint (80).
    document.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 88, bubbles: true }),
    );

    // Source should now be a child of the group "b" container.
    const groupBContainer = container.querySelector<HTMLElement>(
      '[data-group="b"]',
    );
    expect(groupBContainer?.contains(source)).toBe(true);

    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true }),
    );
    sortable.destroy();
  });

  it('does not start drag after destroy', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRect(items);

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
    });

    sortable.destroy();

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(sortable.isDragging()).toBe(false);
  });

  it('creates live region for announcements', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onCommit: vi.fn(),
    });

    const handleEl = items[1].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    const region = document.getElementById('arvo-sortable-live');
    expect(region).toBeTruthy();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    sortable.destroy();
  });
});

// ---------------------------------------------------------------------------
// Horizontal axis (`axis: 'x'`) -- ArvoTabstrip pattern
//
// Mirrors the vertical scenarios above with X-axis projection and arrow-key
// bindings. Items are 100px wide, 32px tall, packed left-to-right from x=0
// so the midpoint of items[i] is x = i * 100 + 50.
// ---------------------------------------------------------------------------

function mockGetBoundingClientRectHorizontal(items: HTMLElement[]): void {
  items.forEach((item, i) => {
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 32,
      left: i * 100,
      right: (i + 1) * 100,
      width: 100,
      height: 32,
      x: i * 100,
      y: 0,
      toJSON: () => ({}),
    });
  });
}

describe('createSortableList -- axis: \'x\'', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
    document.getElementById('arvo-sortable-live')?.remove();
  });

  it('starts drag on pointerdown along the X axis', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRectHorizontal(items);

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(sortable.isDragging()).toBe(true);
    expect(items[0].classList.contains('arvo-sortable--ghost')).toBe(true);

    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true }),
    );
    sortable.destroy();
  });

  it('pointermove past a sibling midpoint relocates the source horizontally', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRectHorizontal(items);

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
    });

    const source = items[0];
    const handleEl = source.querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Move the pointer past items[2]'s midpoint (250) -- source should slot
    // to the trailing edge of the strip.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 280,
        clientY: 16,
        bubbles: true,
      }),
    );

    const liveItems = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    expect(liveItems[liveItems.length - 1]).toBe(source);

    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true }),
    );
    sortable.destroy();
  });

  it('commits on pointerup using the live X-axis index for toIndex', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    mockGetBoundingClientRectHorizontal(items);

    const onCommit = vi.fn();
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      onCommit,
    });

    const source = items[0];
    const handleEl = source.querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 280,
        clientY: 16,
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 280, clientY: 16, bubbles: true }),
    );

    expect(onCommit).toHaveBeenCalled();
    const [from, to] = onCommit.mock.calls[0];
    expect(from).toBe(0);
    expect(to).toBe(2);
    sortable.destroy();
  });

  it('keyboard reorder with Ctrl+ArrowRight', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      onCommit,
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onCommit).toHaveBeenCalledWith(0, 1, null, null);
    sortable.destroy();
  });

  it('keyboard reorder with Ctrl+ArrowLeft', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      onCommit,
    });

    const handleEl = items[2].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onCommit).toHaveBeenCalledWith(2, 1, null, null);
    sortable.destroy();
  });

  it('ignores off-axis Ctrl+ArrowUp / Ctrl+ArrowDown when axis is "x"', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      onCommit,
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onCommit).not.toHaveBeenCalled();
    sortable.destroy();
  });

  it('Y-axis default ignores off-axis Ctrl+ArrowLeft / Ctrl+ArrowRight', () => {
    container = createList(3);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    const onCommit = vi.fn();

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      onCommit,
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onCommit).not.toHaveBeenCalled();
    sortable.destroy();
  });

  it('clamps the drag clone\u2019s primary-axis position to the source\u2019s getDragBounds', () => {
    container = document.createElement('div');
    // 3 horizontal items each 100x32 starting at viewport-left 0,
    // arranged side-by-side so item-2 sits at left=200, right=300.
    for (let i = 0; i < 3; i++) {
      const item = document.createElement('div');
      item.className = 'item';
      item.dataset.idx = String(i);
      const handle = document.createElement('button');
      handle.className = 'handle';
      item.appendChild(handle);
      container.appendChild(item);
    }
    document.body.appendChild(container);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    items.forEach((item, i) => {
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 32,
        left: i * 100,
        right: (i + 1) * 100,
        width: 100,
        height: 32,
        x: i * 100,
        y: 0,
        toJSON: () => ({}),
      });
    });

    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      // Clamp the source so its leading edge cannot go below 50 nor its
      // trailing edge above 250. (Effectively pins the clone between
      // x=50 and x=150 since each item is 100px wide.)
      getDragBounds: () => ({ min: 50, max: 250 }),
    });

    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        pointerId: 1,
        bubbles: true,
      }),
    );
    // Drag well past the right bound -- the clone should clamp at 150.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 999,
        clientY: 16,
        pointerId: 1,
      }),
    );

    const clone = document.querySelector<HTMLElement>(
      '.arvo-sortable--dragging',
    );
    expect(clone).not.toBeNull();
    // Left coordinate of the clone should be clamped at maxLead = 250 - 100 = 150.
    expect(clone?.style.left).toBe('150px');

    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: -200,
        clientY: 16,
        pointerId: 1,
      }),
    );
    expect(clone?.style.left).toBe('50px');

    document.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId: 1 }),
    );
    sortable.destroy();
  });

  it('drags a tab to the trailing edge of its group regardless of pickup offset (drag-bounds fix)', () => {
    // Pins the displacement pointer to the bound's edge when the clone is
    // clamped, so a drag can always reach the extreme slot of its group
    // regardless of where within the source the user picked it up.
    container = document.createElement('div');
    for (let i = 0; i < 4; i++) {
      const item = document.createElement('div');
      item.className = 'item';
      item.dataset.idx = String(i);
      const handle = document.createElement('button');
      handle.className = 'handle';
      item.appendChild(handle);
      container.appendChild(item);
    }
    document.body.appendChild(container);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    // 4 horizontal items 100px wide, side-by-side: [0..100][100..200][200..300][300..400]
    items.forEach((item, i) => {
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 32,
        left: i * 100,
        right: (i + 1) * 100,
        width: 100,
        height: 32,
        x: i * 100,
        y: 0,
        toJSON: () => ({}),
      });
    });

    const onCommit = vi.fn();
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      // Bound covers items 0..3 (the whole row in this test). Dragging
      // item-0 rightward should be able to land at item-3's slot, not
      // just item-2's.
      getDragBounds: () => ({ min: 0, max: 400 }),
      onCommit,
    });

    // Pick up item-0 dead center (offsetX = 50) and drag past the
    // trailing edge -- this should land it in the last slot regardless
    // of where within the source the drag started.
    const handleEl = items[0].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 16,
        pointerId: 1,
        bubbles: true,
      }),
    );
    // clientX = 999 drives the clone toward primary = 949 (past
    // maxLead = 300). clampedPointer is forced to maxLead + size + 1 =
    // 401, past every item's swap line, so findClosestItem returns
    // {index: 3, position: 'after'} and item-0 slots in last.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 999,
        clientY: 16,
        pointerId: 1,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 999,
        clientY: 16,
        pointerId: 1,
      }),
    );

    // The first call records from=0 (item-0 was at index 0 at pickup)
    // and to=3 (final position is the last slot).
    expect(onCommit).toHaveBeenCalled();
    const [from, to] = onCommit.mock.calls[onCommit.mock.calls.length - 1] as [number, number];
    expect(from).toBe(0);
    expect(to).toBe(3);

    sortable.destroy();
  });

  it('drags a tab to the leading edge of its group regardless of pickup offset (drag-bounds fix)', () => {
    container = document.createElement('div');
    for (let i = 0; i < 4; i++) {
      const item = document.createElement('div');
      item.className = 'item';
      item.dataset.idx = String(i);
      const handle = document.createElement('button');
      handle.className = 'handle';
      item.appendChild(handle);
      container.appendChild(item);
    }
    document.body.appendChild(container);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('.item'),
    );
    items.forEach((item, i) => {
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 32,
        left: i * 100,
        right: (i + 1) * 100,
        width: 100,
        height: 32,
        x: i * 100,
        y: 0,
        toJSON: () => ({}),
      });
    });

    const onCommit = vi.fn();
    const sortable = createSortableList(container, {
      itemSelector: '.item',
      handleSelector: '.handle',
      axis: 'x',
      getDragBounds: () => ({ min: 0, max: 400 }),
      onCommit,
    });

    // Pick up item-3 with cursor at its trailing edge (offsetX = 99,
    // pickup at clientX = 399 since item-3 is at left=300..400).
    // Dragging far left clamps the clone to primary=0; clampedPointer
    // is forced to minLead - 1 = -1, below every swap line, so
    // findClosestItem returns {index: 0, position: 'before'} and
    // item-3 slots in first.
    const handleEl = items[3].querySelector('.handle')!;
    handleEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 399,
        clientY: 16,
        pointerId: 1,
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: -999,
        clientY: 16,
        pointerId: 1,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: -999,
        clientY: 16,
        pointerId: 1,
      }),
    );

    expect(onCommit).toHaveBeenCalled();
    const [from, to] = onCommit.mock.calls[onCommit.mock.calls.length - 1] as [number, number];
    expect(from).toBe(3);
    expect(to).toBe(0);

    sortable.destroy();
  });
});
