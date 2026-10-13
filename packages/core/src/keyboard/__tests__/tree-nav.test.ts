// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTreeNav, type TreeNavRowMeta } from '../tree-nav';

function makeKey(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
}

interface FakeRow {
  id: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isDisabled: boolean;
}

function rows(visible: FakeRow[]): { items: HTMLElement[]; meta: FakeRow[] } {
  const items: HTMLElement[] = visible.map(r => {
    const el = document.createElement('div');
    el.id = r.id;
    el.dataset.level = String(r.level);
    el.tabIndex = -1;
    return el;
  });
  return { items, meta: [...visible] };
}

describe('createTreeNav', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('moves down with ArrowDown and up with ArrowUp', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: true, isExpanded: false, isDisabled: false },
      { id: 'b', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'c', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    nav.handleKeyDown(makeKey('ArrowDown'));
    expect(onNavigate).toHaveBeenCalledWith(items[1], 1);

    onNavigate.mockClear();
    nav.handleKeyDown(makeKey('ArrowDown'));
    expect(onNavigate).toHaveBeenCalledWith(items[2], 2);

    onNavigate.mockClear();
    nav.handleKeyDown(makeKey('ArrowUp'));
    expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
    nav.destroy();
  });

  it('does not wrap (tree convention) -- ArrowDown at last row no-ops', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'b', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    nav.handleKeyDown(makeKey('ArrowDown'));
    onNavigate.mockClear();
    nav.handleKeyDown(makeKey('ArrowDown'));
    expect(onNavigate).not.toHaveBeenCalled();
    nav.destroy();
  });

  it('Right Arrow on closed parent calls onExpand', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: true, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onExpand = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate: vi.fn(),
      onExpand,
      onCollapse: vi.fn(),
    });

    items[0].focus();
    nav.handleKeyDown(makeKey('ArrowRight'));
    expect(onExpand).toHaveBeenCalledWith(0);
    nav.destroy();
  });

  it('Right Arrow on open parent moves into first child', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: true, isExpanded: true, isDisabled: false },
      { id: 'b', level: 1, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'c', level: 1, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    items[0].focus();
    nav.handleKeyDown(makeKey('ArrowRight'));
    expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
    nav.destroy();
  });

  it('Right Arrow on leaf is a no-op (still preventDefault)', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onExpand = vi.fn();
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand,
      onCollapse: vi.fn(),
    });

    items[0].focus();
    const ev = makeKey('ArrowRight');
    nav.handleKeyDown(ev);
    expect(onExpand).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
    nav.destroy();
  });

  it('Left Arrow on open parent calls onCollapse', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: true, isExpanded: true, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onCollapse = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate: vi.fn(),
      onExpand: vi.fn(),
      onCollapse,
    });

    items[0].focus();
    nav.handleKeyDown(makeKey('ArrowLeft'));
    expect(onCollapse).toHaveBeenCalledWith(0);
    nav.destroy();
  });

  it('Left Arrow on a child moves focus to parent', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: true, isExpanded: true, isDisabled: false },
      { id: 'b', level: 1, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    items[1].focus();
    nav.handleKeyDown(makeKey('ArrowLeft'));
    expect(onNavigate).toHaveBeenCalledWith(items[0], 0);
    nav.destroy();
  });

  it('Left Arrow at root leaf is a no-op (preventDefault still fires)', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    items[0].focus();
    const ev = makeKey('ArrowLeft');
    nav.handleKeyDown(ev);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
    nav.destroy();
  });

  it('skips disabled rows on ArrowDown', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'b', level: 0, hasChildren: false, isExpanded: false, isDisabled: true },
      { id: 'c', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    nav.handleKeyDown(makeKey('ArrowDown'));
    expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
    nav.destroy();
  });

  it('Home jumps to first non-disabled row', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: true },
      { id: 'b', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'c', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    items[2].focus();
    nav.handleKeyDown(makeKey('Home'));
    expect(onNavigate).toHaveBeenCalledWith(items[1], 1);
    nav.destroy();
  });

  it('Enter triggers onSelect on focused row', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onSelect = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate: vi.fn(),
      onSelect,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    nav.handleKeyDown(makeKey('Enter'));
    expect(onSelect).toHaveBeenCalledWith(items[0], 0);
    nav.destroy();
  });

  it('type-ahead jumps to a row whose label starts with the typed char', () => {
    const labels = ['Apple', 'Banana', 'Cherry'];
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'b', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
      { id: 'c', level: 0, hasChildren: false, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
      typeAhead: { getLabel: i => labels[i] },
    });

    nav.handleKeyDown(makeKey('c'));
    expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
    nav.destroy();
  });

  it('setItems replaces the visible list (after expand/collapse)', () => {
    const { items, meta } = rows([
      { id: 'a', level: 0, hasChildren: true, isExpanded: false, isDisabled: false },
    ]);
    items.forEach(el => container.appendChild(el));
    const onNavigate = vi.fn();
    const nav = createTreeNav({
      items,
      getRowMeta: i => meta[i] as TreeNavRowMeta,
      onNavigate,
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
    });

    // Simulate expansion: consumer calls setItems with the new visible list.
    const child = document.createElement('div');
    child.id = 'a-child';
    container.appendChild(child);
    const newItems = [items[0], child];
    meta[0]!.isExpanded = true;
    meta.push({
      id: 'a-child',
      level: 1,
      hasChildren: false,
      isExpanded: false,
      isDisabled: false,
    });
    nav.setItems(newItems);

    items[0].focus();
    nav.handleKeyDown(makeKey('ArrowDown'));
    expect(onNavigate).toHaveBeenCalledWith(child, 1);
    nav.destroy();
  });
});
