// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoContextMenu } from './ContextMenu';
import type {
  ArvoContextMenuItem,
  ArvoContextMenuOptions,
} from './ContextMenu';

// ---------------------------------------------------------------------------
// jsdom polyfills required by the OverlaySurface engine
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultItems: ArvoContextMenuItem[] = [
  { id: 'open', label: 'Open', shortcut: 'Enter' },
  { id: 'rename', label: 'Rename', shortcut: 'F2' },
  { kind: 'separator', id: 'sep' },
  { id: 'delete', label: 'Delete', destructive: true },
];

let targetEl: HTMLDivElement;
let instance: ArvoContextMenu | null;

function createMenu(
  options: Partial<ArvoContextMenuOptions> = {},
): ArvoContextMenu {
  instance = ArvoContextMenu.initialize(targetEl, {
    items: defaultItems,
    ...options,
  });
  return instance;
}

function getPanel(): HTMLElement | null {
  return document.querySelector('[role="menu"]');
}

function getItems(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
    ),
  );
}

function dispatchContextMenu(target: Element, x = 50, y = 80): MouseEvent {
  const e = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(e);
  return e;
}

/**
 * Dispatch the full right-click event sequence the browser emits:
 * `pointerdown` -> `mousedown` -> `contextmenu`. Mirrors the React
 * regression suite -- used to verify that rapid back-to-back right-clicks
 * on the target don't trigger the close/reopen race against the engine's
 * exit transition.
 */
function dispatchRightClick(target: Element, x = 50, y = 80): MouseEvent {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 2,
    }),
  );
  target.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 2,
    }),
  );
  return dispatchContextMenu(target, x, y);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  targetEl = document.createElement('div');
  targetEl.setAttribute('data-testid', 'target');
  document.body.appendChild(targetEl);
});

afterEach(() => {
  if (instance) {
    try {
      instance.destroy();
    } catch {
      // ignore
    }
    instance = null;
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- initialization', () => {
  it('throws when target element is missing', () => {
    expect(() =>
      ArvoContextMenu.initialize(null as unknown as HTMLElement, {
        items: defaultItems,
      }),
    ).toThrow();
  });

  it('throws when items option is missing', () => {
    expect(() =>
      ArvoContextMenu.initialize(targetEl, undefined as unknown as ArvoContextMenuOptions),
    ).toThrow();
  });

  it('does not open the menu on initialization', () => {
    createMenu();
    expect(getPanel()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Gestures
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- gestures', () => {
  it('opens at the cursor point on contextmenu', async () => {
    createMenu();
    dispatchContextMenu(targetEl, 100, 200);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    expect(getItems().length).toBe(3); // 3 non-separator rows
  });

  it('preserves browser menu when items is an empty array', () => {
    createMenu({ items: [] });
    const e = dispatchContextMenu(targetEl);
    expect(getPanel()).toBeNull();
    expect(e.defaultPrevented).toBe(false);
  });

  it('preventDefault is called when items resolve', () => {
    createMenu();
    const e = dispatchContextMenu(targetEl);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Shift+F10 opens the menu anchored to the focused descendant', async () => {
    const row = document.createElement('div');
    row.setAttribute('data-context-id', 'row-1');
    row.tabIndex = 0;
    targetEl.appendChild(row);
    createMenu({
      contextSelector: '[data-context-id]',
      resolveContext: (el) => ({ rowId: el.dataset.contextId! }),
      items: (ctx) => [{ id: 'x', label: `Act on ${(ctx as { rowId: string }).rowId}` }],
    });
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    expect(getItems()[0].textContent).toContain('Act on row-1');
  });

  it('delegates to the nearest matching descendant via contextSelector', async () => {
    const row = document.createElement('div');
    row.setAttribute('data-context-id', 'row-2');
    const inner = document.createElement('span');
    row.appendChild(inner);
    targetEl.appendChild(row);

    const resolve = vi.fn((el: HTMLElement) => ({ rowId: el.dataset.contextId }));
    createMenu({
      contextSelector: '[data-context-id]',
      resolveContext: resolve,
    });
    dispatchContextMenu(inner);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve.mock.calls[0][0]).toBe(row);
  });
});

// ---------------------------------------------------------------------------
// Re-anchor while open (regression: rapid back-to-back right-clicks)
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- re-anchor while open', () => {
  it('keeps the menu mounted when right-clicking again on the target', async () => {
    const onOpenChange = vi.fn();
    createMenu({ onOpenChange });

    dispatchRightClick(targetEl, 100, 100);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    const firstOpenCalls = onOpenChange.mock.calls.length;

    dispatchRightClick(targetEl, 250, 200);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onOpenChange.mock.calls.length).toBe(firstOpenCalls);
  });

  it('does not dispatch context-menu:close on re-anchor', async () => {
    const closeListener = vi.fn();
    targetEl.addEventListener('context-menu:close', closeListener as EventListener);
    createMenu();

    dispatchRightClick(targetEl, 100, 100);
    await new Promise<void>((r) => setTimeout(r, 0));
    dispatchRightClick(targetEl, 200, 200);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(getPanel()).not.toBeNull();
    expect(closeListener).not.toHaveBeenCalled();
  });

  it('re-anchor refreshes items computed from the new context', async () => {
    const row0 = document.createElement('div');
    row0.setAttribute('data-context-id', 'row-0');
    row0.tabIndex = 0;
    targetEl.appendChild(row0);
    const row1 = document.createElement('div');
    row1.setAttribute('data-context-id', 'row-1');
    row1.tabIndex = 0;
    targetEl.appendChild(row1);

    createMenu({
      contextSelector: '[data-context-id]',
      resolveContext: (el) => ({ rowId: el.dataset.contextId! }),
      items: (ctx) => [{ id: 'x', label: `Act on ${(ctx as { rowId: string }).rowId}` }],
    });

    dispatchRightClick(row0, 50, 50);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getItems()[0].textContent).toContain('Act on row-0');

    dispatchRightClick(row1, 150, 50);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    expect(getItems()[0].textContent).toContain('Act on row-1');
  });

  it('left-click outside the target still closes the menu', async () => {
    const menu = createMenu();
    dispatchRightClick(targetEl, 100, 100);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(menu.isOpen()).toBe(true);

    // Outside-click (left-button mousedown on body) should NOT be
    // swallowed by the right-click suppressor.
    document.body.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0 }),
    );
    // The hub's mousedown handler runs synchronously; the surface's
    // close flow may schedule micro/macrotasks.
    await new Promise<void>((r) => setTimeout(r, 50));
    expect(menu.isOpen()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- custom events', () => {
  it('dispatches context-menu:request (cancelable) before opening', () => {
    const listener = vi.fn((_e: Event) => {});
    targetEl.addEventListener('context-menu:request', listener as EventListener);
    createMenu();
    dispatchContextMenu(targetEl);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('preventing context-menu:request veto the gesture', () => {
    targetEl.addEventListener(
      'context-menu:request',
      ((e: CustomEvent) => e.preventDefault()) as EventListener,
    );
    createMenu();
    const e = dispatchContextMenu(targetEl);
    expect(getPanel()).toBeNull();
    expect(e.defaultPrevented).toBe(false);
  });

  it('dispatches context-menu:open before the menu opens', async () => {
    const listener = vi.fn((_e: Event) => {});
    targetEl.addEventListener('context-menu:open', listener as EventListener);
    createMenu();
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispatches context-menu:close on programmatic close', async () => {
    const listener = vi.fn((_e: Event) => {});
    targetEl.addEventListener('context-menu:close', listener as EventListener);
    const menu = createMenu();
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    menu.close();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does NOT dispatch context-menu:close on engine-driven dismissal', async () => {
    const listener = vi.fn((_e: Event) => {});
    targetEl.addEventListener('context-menu:close', listener as EventListener);
    createMenu();
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    // Simulate outside pointer-down by dispatching on document body.
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    await new Promise<void>((r) => setTimeout(r, 50));
    expect(listener).not.toHaveBeenCalled();
  });

  it('dispatches context-menu:select when an item is invoked', async () => {
    const listener = vi.fn((_e: Event) => {});
    targetEl.addEventListener('context-menu:select', listener as EventListener);
    createMenu({ items: [{ id: 'a', label: 'A' }] });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    getItems()[0].click();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- lifecycle hooks', () => {
  it('onContextRequest can veto the gesture', () => {
    const onContextRequest = vi.fn(() => false);
    createMenu({ onContextRequest });
    const e = dispatchContextMenu(targetEl);
    expect(onContextRequest).toHaveBeenCalledTimes(1);
    expect(getPanel()).toBeNull();
    expect(e.defaultPrevented).toBe(false);
  });

  it('onOpen receives the request and can cancel', () => {
    const onOpen = vi.fn(() => false);
    createMenu({ onOpen });
    dispatchContextMenu(targetEl);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(getPanel()).toBeNull();
  });

  it('onSelect fires after item invocation', async () => {
    const onSelect = vi.fn();
    createMenu({ items: [{ id: 'a', label: 'A' }], onSelect });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    getItems()[0].click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({
      closeOnSelect: true,
      item: expect.objectContaining({ id: 'a' }),
    });
  });

  it('onOpenChange fires true then false', async () => {
    const onOpenChange = vi.fn();
    const menu = createMenu({ onOpenChange });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    menu.close();
    await new Promise<void>((r) => setTimeout(r, 50));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Checkbox / radio
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- checkbox / radio', () => {
  it('renders menuitemcheckbox with aria-checked', async () => {
    createMenu({
      items: [
        { kind: 'checkbox', id: 'a', label: 'A', checked: true },
        { kind: 'checkbox', id: 'b', label: 'B', checked: false },
      ],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const checks = document.querySelectorAll('[role="menuitemcheckbox"]');
    expect(checks).toHaveLength(2);
    expect(checks[0].getAttribute('aria-checked')).toBe('true');
    expect(checks[1].getAttribute('aria-checked')).toBe('false');
  });

  it('checked checkbox row carries the .active class (left-border indicator)', async () => {
    createMenu({
      items: [
        { kind: 'checkbox', id: 'a', label: 'A', checked: true },
        { kind: 'checkbox', id: 'b', label: 'B', checked: false },
      ],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const checks = document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]');
    expect(checks[0].className).toContain('active');
    expect(checks[1].className).not.toContain('active');
  });

  it('does NOT render a trailing __indicator glyph for checked rows (spec section 4.5)', async () => {
    createMenu({
      items: [
        { kind: 'checkbox', id: 'a', label: 'A', checked: true },
        { kind: 'radio', id: 'b', label: 'B', radioGroup: 'g', checked: true },
      ],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(document.querySelector('.arvo-menu-item__indicator')).toBeNull();
  });

  it('clicking a checkbox fires onChange and keeps the menu open', async () => {
    const onChange = vi.fn();
    createMenu({
      items: [{ kind: 'checkbox', id: 'a', label: 'A', checked: false, onChange }],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    (document.querySelector('[role="menuitemcheckbox"]') as HTMLElement).click();
    expect(onChange).toHaveBeenCalledWith(true, null);
    expect(getPanel()).not.toBeNull();
  });

  it('renders menuitemradio with aria-checked', async () => {
    createMenu({
      items: [
        { kind: 'radio', id: 'l', label: 'Left', radioGroup: 'a', checked: true },
        { kind: 'radio', id: 'r', label: 'Right', radioGroup: 'a', checked: false },
      ],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const radios = document.querySelectorAll('[role="menuitemradio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Item slots (status, meta value, avatar, isSelected, external link)
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- item slots', () => {
  it('renders the right-aligned meta value via __meta', async () => {
    createMenu({ items: [{ id: 'a', label: 'Recent', value: '12' }] });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const meta = document.querySelector('.arvo-menu-item__meta');
    expect(meta?.textContent).toBe('12');
  });

  it('applies the per-status modifier and renders the __status dot', async () => {
    createMenu({ items: [{ id: 'a', label: 'Warn', status: 'warning' }] });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const row = document.querySelector('[role="menuitem"]')!;
    expect(row.className).toContain('arvo-menu-item--status-warning');
    expect(row.querySelector('.arvo-menu-item__status')).not.toBeNull();
  });

  it('explicit { color } status sets --arvo-menu-item-status-color inline', async () => {
    createMenu({
      items: [{ id: 'a', label: 'Custom', status: { color: '#abcdef' } }],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const row = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    expect(row.style.getPropertyValue('--arvo-menu-item-status-color')).toBe('#abcdef');
  });

  it('renders the leading __avatar slot when avatar URL is set', async () => {
    createMenu({
      items: [{ id: 'a', label: 'Alice', avatar: 'https://example.com/a.png' }],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const avatar = document.querySelector('img.arvo-menu-item__avatar');
    expect(avatar?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('isSelected applies the .active class without changing the role', async () => {
    createMenu({
      items: [{ id: 'a', label: 'Selected option', isSelected: true }],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const row = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    expect(row.className).toContain('active');
    expect(row.getAttribute('aria-checked')).toBeNull();
  });

  it('href + target="_blank" renders an <a> with rel, external glyph, and aria-label suffix', async () => {
    createMenu({
      items: [
        {
          id: 'docs',
          label: 'Open docs',
          href: 'https://example.com/docs',
          target: '_blank',
        },
      ],
    });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const anchor = document.querySelector<HTMLAnchorElement>('a[role="menuitem"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.getAttribute('aria-label')).toBe('Open docs, opens in a new window');
    expect(anchor?.querySelector('.arvo-menu-item__external')).not.toBeNull();
  });

  it('href without target renders a same-tab anchor and no external glyph', async () => {
    createMenu({ items: [{ id: 'docs', label: 'Internal', href: '/docs' }] });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const anchor = document.querySelector<HTMLAnchorElement>('a[role="menuitem"]');
    expect(anchor?.getAttribute('target')).toBe('_self');
    expect(anchor?.getAttribute('rel')).toBeNull();
    expect(anchor?.querySelector('.arvo-menu-item__external')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Empty state (emptyConfig)
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- emptyConfig', () => {
  it('without emptyConfig, an empty resolved list declines the gesture (preserves native menu)', () => {
    createMenu({ items: [] });
    const e = dispatchContextMenu(targetEl);
    expect(getPanel()).toBeNull();
    expect(e.defaultPrevented).toBe(false);
  });

  it('with emptyConfig, an empty resolved list opens the menu with an empty-state block', async () => {
    createMenu({
      items: [],
      emptyConfig: { title: 'Nothing here', message: 'No actions for this item.' },
    });
    const e = dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    expect(e.defaultPrevented).toBe(true);
    const empty = document.querySelector('.arvo-context-menu__empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain('Nothing here');
    expect(empty?.textContent).toContain('No actions for this item.');
    expect(getItems()).toHaveLength(0);
  });

  it('emptyConfig defaults apply when fields are omitted', async () => {
    createMenu({ items: [], emptyConfig: {} });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const empty = document.querySelector('.arvo-context-menu__empty');
    expect(empty?.textContent).toContain('No options available');
  });
});

// ---------------------------------------------------------------------------
// Submenus
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- submenus', () => {
  const items: ArvoContextMenuItem[] = [
    {
      id: 'share',
      label: 'Share',
      submenu: [
        { id: 'link', label: 'Copy link' },
        { id: 'email', label: 'Send email' },
      ],
    },
    { id: 'delete', label: 'Delete' },
  ];

  it('parent row gets aria-haspopup="menu"', async () => {
    createMenu({ items });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const share = Array.from(getItems()).find((el) => el.textContent?.includes('Share'));
    expect(share?.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('renders the submenu chevron glyph', async () => {
    createMenu({ items });
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const chevron = document.querySelector('.arvo-menu-item__submenu');
    expect(chevron).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Imperative API
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- imperative API', () => {
  it('open() at a point anchor', async () => {
    const menu = createMenu();
    menu.open({ anchor: { kind: 'point', x: 10, y: 20 } });
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(menu.isOpen()).toBe(true);
    expect(getPanel()).not.toBeNull();
  });

  it('close() closes the menu', async () => {
    const menu = createMenu();
    menu.open({ anchor: { kind: 'point', x: 10, y: 20 } });
    await new Promise<void>((r) => setTimeout(r, 0));
    menu.close();
    expect(menu.isOpen()).toBe(false);
  });

  it('updateItems re-renders when open', async () => {
    const menu = createMenu({ items: [{ id: 'a', label: 'Original' }] });
    menu.open({ anchor: { kind: 'point', x: 10, y: 20 } });
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getItems()[0].textContent).toContain('Original');
    menu.updateItems([{ id: 'b', label: 'Updated' }]);
    expect(getItems()[0].textContent).toContain('Updated');
  });

  it('disabled() returns and sets state', () => {
    const menu = createMenu();
    expect(menu.disabled()).toBe(false);
    menu.disabled(true);
    expect(menu.disabled()).toBe(true);
    dispatchContextMenu(targetEl);
    expect(getPanel()).toBeNull();
  });

  it('destroy removes the panel', async () => {
    const menu = createMenu();
    menu.open({ anchor: { kind: 'point', x: 10, y: 20 } });
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(getPanel()).not.toBeNull();
    menu.destroy();
    instance = null;
    await new Promise<void>((r) => setTimeout(r, 50));
    expect(getPanel()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('ArvoContextMenu -- accessibility', () => {
  it('open menu has no axe violations', async () => {
    createMenu();
    dispatchContextMenu(targetEl);
    await new Promise<void>((r) => setTimeout(r, 0));
    const menu = getPanel()!;
    const results = await axe.run(menu);
    expect(results.violations).toEqual([]);
  });
});
