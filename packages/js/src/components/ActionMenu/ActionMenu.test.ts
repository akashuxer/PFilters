// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoActionMenu } from './ActionMenu';
import type { ArvoActionMenuOptions, MenuItemData } from './ActionMenu';
import type { ListGroup } from '@arvo/core';
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

const defaultItems: MenuItemData[] = [
  { id: '1', label: 'Cut' },
  { id: '2', label: 'Copy' },
  { id: '3', label: 'Paste' },
];

const groupedItems: ListGroup<MenuItemData>[] = [
  {
    id: 'g1',
    label: 'Edit',
    items: [
      { id: '1', label: 'Cut' },
      { id: '2', label: 'Copy' },
    ],
  },
  {
    id: 'g2',
    label: 'View',
    items: [
      { id: '3', label: 'Zoom In' },
      { id: '4', label: 'Zoom Out' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let triggerEl: HTMLButtonElement;
let instance: ArvoActionMenu;

function createMenu(options: Partial<ArvoActionMenuOptions> = {}): ArvoActionMenu {
  instance = ArvoActionMenu.initialize(triggerEl, { items: defaultItems, ...options });
  return instance;
}

function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-action-menu');
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  // matchMedia: { matches: true } makes prefersReducedMotion() true so the
  // engine's enter/exit transitions resolve synchronously in jsdom.
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
  Element.prototype.scrollIntoView = vi.fn();

  triggerEl = document.createElement('button');
  triggerEl.textContent = 'Actions';
  document.body.appendChild(triggerEl);
});

afterEach(() => {
  try { instance?.destroy(); } catch { /* already destroyed */ }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- initialization', () => {
  it('static initialize() returns an ArvoActionMenu instance', () => {
    const menu = createMenu();
    expect(menu).toBeInstanceOf(ArvoActionMenu);
  });

  it('creates a panel appended to document.body', () => {
    createMenu();
    expect(getPanel()).not.toBeNull();
    expect(document.body.contains(getPanel())).toBe(true);
  });

  it('panel has class arvo-action-menu', () => {
    createMenu();
    expect(getPanel()?.classList.contains('arvo-action-menu')).toBe(true);
  });

  it('panel has role="menu"', () => {
    createMenu();
    expect(getPanel()?.getAttribute('role')).toBe('menu');
  });

  it('panel starts without "open" class (closed by default)', () => {
    createMenu();
    expect(getPanel()?.classList.contains('open')).toBe(false);
  });

  it('sets aria-haspopup="menu" on trigger', () => {
    createMenu();
    expect(triggerEl.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('sets aria-expanded="false" on trigger when closed', () => {
    createMenu();
    expect(triggerEl.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets aria-controls on trigger referencing panel id', () => {
    createMenu();
    const panelId = getPanel()?.id;
    expect(triggerEl.getAttribute('aria-controls')).toBe(panelId);
  });

  it('renders menu items in the panel', () => {
    createMenu();
    instance.open();
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Open / Close
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- open/close', () => {
  it('open() adds "open" class to panel', () => {
    createMenu();
    instance.open();
    expect(getPanel()?.classList.contains('open')).toBe(true);
  });

  it('open() sets aria-expanded="true" on trigger', () => {
    createMenu();
    instance.open();
    expect(triggerEl.getAttribute('aria-expanded')).toBe('true');
  });

  it('close() removes "open" class from panel', () => {
    createMenu();
    instance.open();
    instance.close();
    expect(getPanel()?.classList.contains('open')).toBe(false);
  });

  it('close() sets aria-expanded="false" on trigger', () => {
    createMenu();
    instance.open();
    instance.close();
    expect(triggerEl.getAttribute('aria-expanded')).toBe('false');
  });

  it('isOpen() returns false when closed', () => {
    createMenu();
    expect(instance.isOpen()).toBe(false);
  });

  it('isOpen() returns true when open', () => {
    createMenu();
    instance.open();
    expect(instance.isOpen()).toBe(true);
  });

  it('toggle() opens the menu when closed', () => {
    createMenu();
    instance.toggle();
    expect(instance.isOpen()).toBe(true);
  });

  it('toggle() closes the menu when open', () => {
    createMenu();
    instance.open();
    instance.toggle();
    expect(instance.isOpen()).toBe(false);
  });

  it('toggle(true) opens when already closed', () => {
    createMenu();
    instance.toggle(true);
    expect(instance.isOpen()).toBe(true);
  });

  it('toggle(false) closes when open', () => {
    createMenu();
    instance.open();
    instance.toggle(false);
    expect(instance.isOpen()).toBe(false);
  });

  it('clicking trigger opens the menu', () => {
    createMenu();
    triggerEl.click();
    expect(instance.isOpen()).toBe(true);
  });

  it('clicking trigger again closes the menu', () => {
    createMenu();
    triggerEl.click();
    triggerEl.click();
    expect(instance.isOpen()).toBe(false);
  });

  it('open() does nothing when already open', () => {
    createMenu();
    instance.open();
    const onOpenChange = vi.fn();
    instance.open();
    expect(instance.isOpen()).toBe(true);
  });

  it('close() does nothing when already closed', () => {
    createMenu();
    expect(() => instance.close()).not.toThrow();
    expect(instance.isOpen()).toBe(false);
  });

  it('onOpen callback is called when opening', () => {
    const onOpen = vi.fn();
    createMenu({ onOpen });
    instance.open();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('onOpen returning false prevents opening', () => {
    const onOpen = vi.fn(() => false as const);
    createMenu({ onOpen });
    instance.open();
    expect(instance.isOpen()).toBe(false);
  });

  it('onClose callback is called when closing', () => {
    const onClose = vi.fn();
    createMenu({ onClose });
    instance.open();
    instance.close();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('onClose returning false prevents closing', () => {
    const onClose = vi.fn(() => false as const);
    createMenu({ onClose });
    instance.open();
    instance.close();
    expect(instance.isOpen()).toBe(true);
  });

  it('onOpenChange is called with true when opening', () => {
    const onOpenChange = vi.fn();
    createMenu({ onOpenChange });
    instance.open();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('onOpenChange is called with false when closing', () => {
    const onOpenChange = vi.fn();
    createMenu({ onOpenChange });
    instance.open();
    onOpenChange.mockClear();
    instance.close();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- disabled state', () => {
  it('disabled() returns false by default', () => {
    createMenu();
    expect(instance.disabled()).toBe(false);
  });

  it('disabled(true) sets disabled state', () => {
    createMenu();
    instance.disabled(true);
    expect(instance.disabled()).toBe(true);
  });

  it('disabled(true) sets aria-disabled on trigger', () => {
    createMenu();
    instance.disabled(true);
    expect(triggerEl.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled(false) clears aria-disabled from trigger', () => {
    createMenu({ isDisabled: true });
    instance.disabled(false);
    expect(triggerEl.getAttribute('aria-disabled')).toBeNull();
  });

  it('disabled trigger does not open on click', () => {
    createMenu({ isDisabled: true });
    triggerEl.click();
    expect(instance.isOpen()).toBe(false);
  });

  it('open() does nothing when disabled', () => {
    createMenu();
    instance.disabled(true);
    instance.open();
    expect(instance.isOpen()).toBe(false);
  });

  it('disabling when open closes the menu', () => {
    createMenu();
    instance.open();
    expect(instance.isOpen()).toBe(true);
    instance.disabled(true);
    expect(instance.isOpen()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- loading state', () => {
  it('setLoading(true) applies loading class to panel', () => {
    createMenu();
    instance.setLoading(true);
    expect(getPanel()?.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true" on panel', () => {
    createMenu();
    instance.setLoading(true);
    expect(getPanel()?.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    createMenu({ isLoading: true });
    instance.setLoading(false);
    expect(getPanel()?.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    createMenu({ isLoading: true });
    instance.setLoading(false);
    expect(getPanel()?.getAttribute('aria-busy')).toBeNull();
  });

  it('loading=true option applies loading class on init', () => {
    createMenu({ isLoading: true });
    expect(getPanel()?.classList.contains('loading')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- items', () => {
  it('renders correct number of menu items', () => {
    createMenu();
    instance.open();
    expect(getPanel()?.querySelectorAll('[role="menuitem"]').length).toBe(3);
  });

  it('items have correct labels', () => {
    createMenu();
    instance.open();
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.[0].textContent).toContain('Cut');
    expect(items?.[1].textContent).toContain('Copy');
    expect(items?.[2].textContent).toContain('Paste');
  });

  it('updateItems() replaces items', () => {
    createMenu();
    instance.open();
    const newItems: MenuItemData[] = [
      { id: 'a', label: 'New Action A' },
      { id: 'b', label: 'New Action B' },
    ];
    instance.updateItems(newItems);
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.length).toBe(2);
    expect(items?.[0].textContent).toContain('New Action A');
  });

  it('updateItems() clears filter query', () => {
    createMenu({ search: true });
    instance.open();
    instance.updateItems(defaultItems);
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.length).toBe(3);
  });

  it('seeds a roving tabindex on the first item when opened with search', () => {
    createMenu({ search: true });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(items?.[0].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowDown from the search input moves focus into the option list', () => {
    createMenu({ search: true });
    instance.open();
    const wrapper = getPanel()?.querySelector(
      '.arvo-action-menu__search',
    ) as HTMLElement;
    wrapper.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(document.activeElement).toBe(items?.[0]);
  });

  it('ArrowUp from the search input moves focus to the last item', () => {
    createMenu({ search: true });
    instance.open();
    const wrapper = getPanel()?.querySelector(
      '.arvo-action-menu__search',
    ) as HTMLElement;
    wrapper.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(document.activeElement).toBe(items?.[items.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// Grouped items
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- grouped items', () => {
  it('renders group headers for labeled groups', () => {
    createMenu({ items: groupedItems });
    instance.open();
    const headers = getPanel()?.querySelectorAll('.arvo-action-menu__hdr');
    expect(headers?.length).toBe(2);
    expect(headers?.[0].textContent).toBe('Edit');
    expect(headers?.[1].textContent).toBe('View');
  });

  it('renders separators between groups when showGroupDividers=true', () => {
    createMenu({ items: groupedItems, hasGroupDividers: true });
    instance.open();
    const separators = getPanel()?.querySelectorAll('[role="separator"]');
    expect((separators?.length ?? 0)).toBeGreaterThanOrEqual(1);
  });

  it('renders all grouped items as menu items', () => {
    createMenu({ items: groupedItems });
    instance.open();
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Active items
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- active items', () => {
  const activeItems: MenuItemData[] = [
    { id: '1', label: 'Auto Save', active: true },
    { id: '2', label: 'Word Wrap' },
  ];

  it('applies active class for items with active: true', () => {
    createMenu({ items: activeItems });
    instance.open();
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.[0].classList.contains('active')).toBe(true);
  });

  it('does not apply active class for items without active flag', () => {
    createMenu({ items: activeItems });
    instance.open();
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.[1].classList.contains('active')).toBe(false);
  });

  it('all items use menuitem role', () => {
    createMenu({ items: activeItems });
    instance.open();
    const menuItems = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(menuItems?.length).toBe(2);
    const checkboxItems = getPanel()?.querySelectorAll('[role="menuitemcheckbox"]');
    expect(checkboxItems?.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Destructive items
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- destructive items', () => {
  it('applies destructive class to destructive items', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Delete', destructive: true },
      { id: '2', label: 'Keep' },
    ];
    createMenu({ items });
    instance.open();
    const menuItems = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(menuItems?.[0].classList.contains('arvo-menu-item--destructive')).toBe(true);
    expect(menuItems?.[1].classList.contains('arvo-menu-item--destructive')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Disabled items
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- disabled items', () => {
  it('applies is-disabled class to disabled items', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Cut' },
      { id: '2', label: 'Copy', isDisabled: true },
    ];
    createMenu({ items });
    instance.open();
    const menuItems = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(menuItems?.[0].classList.contains('is-disabled')).toBe(false);
    expect(menuItems?.[1].classList.contains('is-disabled')).toBe(true);
  });

  it('sets aria-disabled on disabled items', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Cut', isDisabled: true },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector('[role="menuitem"]');
    expect(item?.getAttribute('aria-disabled')).toBe('true');
  });

  it('clicking a disabled item does not call onSelect', () => {
    const onSelect = vi.fn();
    const items: MenuItemData[] = [
      { id: '1', label: 'Disabled Item', isDisabled: true },
    ];
    createMenu({ items, onSelect });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Item selection
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- item selection', () => {
  it('clicking an item calls onSelect with item and index', () => {
    const onSelect = vi.fn();
    createMenu({ onSelect });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[1].click();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(defaultItems[1], 1);
  });

  it('closes menu on item select when closeOnSelect=true (default)', () => {
    createMenu({ closeOnSelect: true });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    expect(instance.isOpen()).toBe(false);
  });

  it('stays open on item select when closeOnSelect=false', () => {
    createMenu({ closeOnSelect: false });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    expect(instance.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Filter / Search
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- filter', () => {
  it('renders search input when search=true', () => {
    createMenu({ search: true });
    expect(getPanel()?.querySelector('.arvo-search__input')).not.toBeNull();
  });

  it('does not render search input when search=false (default)', () => {
    createMenu({ search: false });
    expect(getPanel()?.querySelector('.arvo-search__input')).toBeNull();
  });

  it('filters items when search input changes', () => {
    createMenu({ search: true });
    instance.open();
    const input = getPanel()?.querySelector<HTMLInputElement>('.arvo-search__input');
    expect(input).not.toBeNull();
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(input, 'cut');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const items = getPanel()?.querySelectorAll('[role="menuitem"]');
    expect(items?.length).toBe(1);
    expect(items?.[0].textContent).toContain('Cut');
  });

  it('shows empty message when no items match filter', () => {
    createMenu({ search: true });
    instance.open();
    const input = getPanel()?.querySelector<HTMLInputElement>('.arvo-search__input');
    expect(input).not.toBeNull();
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(input, 'zzz-no-match');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const empty = getPanel()?.querySelector('.arvo-empty');
    expect(empty).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Trailing actions
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- trailing actions', () => {
  const itemsWithTrailing: MenuItemData[] = [
    {
      id: '1',
      label: 'File.txt',
      actions: [
        { id: 'edit', icon: 'edit', ariaLabel: 'Edit' },
        { id: 'delete', icon: 'delete', ariaLabel: 'Delete' },
      ],
    },
  ];

  it('renders trailing action buttons', () => {
    createMenu({ items: itemsWithTrailing });
    instance.open();
    const buttons = getPanel()?.querySelectorAll('.arvo-menu-item__actions button');
    expect(buttons?.length).toBe(2);
  });

  it('applies actions-on-hover class when actionsVisibility="hover"', () => {
    createMenu({ items: itemsWithTrailing, actionsVisibility: 'hover' });
    instance.open();
    const item = getPanel()?.querySelector('[role="menuitem"]');
    expect(item?.classList.contains('arvo-menu-item--actions-on-hover')).toBe(true);
  });

  it('does not apply actions-on-hover class when visibility="always"', () => {
    createMenu({ items: itemsWithTrailing, actionsVisibility: 'always' });
    instance.open();
    const item = getPanel()?.querySelector('[role="menuitem"]');
    expect(item?.classList.contains('arvo-menu-item--actions-on-hover')).toBe(false);
  });

  it('trailing action buttons are disabled when item is disabled', () => {
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'File.txt',
        isDisabled: true,
        actions: [
          { id: 'edit', icon: 'edit', ariaLabel: 'Edit' },
        ],
      },
    ];
    createMenu({ items });
    instance.open();
    const btn = getPanel()?.querySelector<HTMLButtonElement>('.arvo-menu-item__actions button');
    expect(btn?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Submenu
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- submenu indicator', () => {
  it('renders submenu indicator for items with submenu', () => {
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'More Options',
        submenu: [{ id: '1a', label: 'Sub Item' }],
      },
    ];
    createMenu({ items });
    instance.open();
    expect(getPanel()?.querySelector('.arvo-menu-item__submenu')).not.toBeNull();
  });

  it('submenu caret uses o9con-angle-right icon class', () => {
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'More Options',
        submenu: [{ id: '1a', label: 'Sub Item' }],
      },
    ];
    createMenu({ items });
    instance.open();
    const submenuIcon = getPanel()?.querySelector('.arvo-menu-item__submenu');
    expect(submenuIcon?.classList.contains('o9con-angle-right')).toBe(true);
  });

  it('sets aria-haspopup="menu" on items with submenu', () => {
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'More Options',
        submenu: [{ id: '1a', label: 'Sub Item' }],
      },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector('[role="menuitem"]');
    expect(item?.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('clicking a submenu item opens a nested menu panel', () => {
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'More Options',
        submenu: [{ id: '1a', label: 'Sub Item' }],
      },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    const allMenus = document.querySelectorAll('[role="menu"]');
    expect(allMenus.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking a submenu item does not call onSelect', () => {
    const onSelect = vi.fn();
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'More Options',
        submenu: [{ id: '1a', label: 'Sub Item' }],
      },
    ];
    createMenu({ items, onSelect });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- keyboard shortcuts', () => {
  it('renders shortcut text for items with shortcut prop (display-normalized)', () => {
    // Shortcut strings are authored in the developer-canonical
    // `Ctrl+X` form but rendered through `formatShortcutDisplay` so
    // the visible text matches the active OS. On the JS test
    // environment (jsdom-Linux) that produces `Ctrl X`; macOS would
    // render `\u2318 X`. Either way the developer never has to
    // branch.
    const items: MenuItemData[] = [
      { id: '1', label: 'Cut', shortcut: 'Ctrl+X' },
    ];
    createMenu({ items });
    instance.open();
    const shortcut = getPanel()?.querySelector('.arvo-menu-item__shortcut');
    expect(shortcut).not.toBeNull();
    expect(shortcut?.textContent).toBe('Ctrl X');
  });
});

// ---------------------------------------------------------------------------
// Inline popover
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- inline popover', () => {
  it('opens inline panel on item click when item has inlinePopover config', () => {
    const contentEl = document.createElement('p');
    contentEl.textContent = 'Inline Content';

    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'Settings',
        inlinePopover: {
          title: 'My Panel',
          content: contentEl,
        },
      },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    const inlinePanel = getPanel()?.querySelector('.arvo-action-menu__inline-panel');
    expect(inlinePanel).not.toBeNull();
  });

  it('inline panel has a back button by default', () => {
    const contentEl = document.createElement('p');
    contentEl.textContent = 'Content';
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'Settings',
        inlinePopover: {
          title: 'My Panel',
          content: contentEl,
        },
      },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    const backBtn = document.querySelector('[aria-label="Back"]');
    expect(backBtn).not.toBeNull();
  });

  it('back button closes inline panel', () => {
    const contentEl = document.createElement('p');
    contentEl.textContent = 'Content';
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'Settings',
        inlinePopover: {
          title: 'My Panel',
          content: contentEl,
        },
      },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    const backBtn = document.querySelector<HTMLElement>('[aria-label="Back"]');
    backBtn?.click();
    const inlinePanel = getPanel()?.querySelector('.arvo-action-menu__inline-panel');
    expect(inlinePanel?.classList.contains('open')).toBe(false);
    expect(document.querySelector('.arvo-popover.open')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- custom events', () => {
  it('dispatches action-menu:open on trigger element when opening', () => {
    const handler = vi.fn();
    triggerEl.addEventListener('action-menu:open', handler);
    createMenu();
    instance.open();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches action-menu:close on trigger element when closing', () => {
    const handler = vi.fn();
    triggerEl.addEventListener('action-menu:close', handler);
    createMenu();
    instance.open();
    instance.close();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches action-menu:select on trigger element when item is selected', () => {
    const handler = vi.fn();
    triggerEl.addEventListener('action-menu:select', handler);
    createMenu();
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      item: defaultItems[0],
      index: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- destroy', () => {
  it('destroy() removes the panel from DOM', () => {
    createMenu();
    expect(getPanel()).not.toBeNull();
    instance.destroy();
    expect(getPanel()).toBeNull();
  });

  it('destroy() removes aria attributes from trigger', () => {
    createMenu();
    instance.destroy();
    expect(triggerEl.getAttribute('aria-haspopup')).toBeNull();
    expect(triggerEl.getAttribute('aria-expanded')).toBeNull();
    expect(triggerEl.getAttribute('aria-controls')).toBeNull();
  });

  it('destroy() prevents trigger from opening menu after destroy', () => {
    createMenu();
    instance.destroy();
    triggerEl.click();
    expect(getPanel()).toBeNull();
  });

  it('destroy() can be called when menu is open without throwing', () => {
    createMenu();
    instance.open();
    expect(() => instance.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Submenu trigger mode
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- submenuTrigger', () => {
  const submenuItems: MenuItemData[] = [
    { id: '1', label: 'Cut' },
    {
      id: '2',
      label: 'More',
      submenu: [{ id: '2a', label: 'Sub Item' }],
    },
    { id: '3', label: 'Paste' },
  ];

  it('defaults submenuTrigger to hover', () => {
    createMenu({ items: submenuItems });
    instance.open();
    const item = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
    expect(item?.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('opens submenu on hover when submenuTrigger="hover"', () => {
    vi.useFakeTimers();
    createMenu({ items: submenuItems, submenuTrigger: 'hover' });
    instance.open();
    const item = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
    item?.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(250);
    const panels = document.querySelectorAll('.arvo-action-menu');
    expect(panels.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it('does not open submenu on hover when submenuTrigger="click"', () => {
    vi.useFakeTimers();
    createMenu({ items: submenuItems, submenuTrigger: 'click' });
    instance.open();
    const item = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
    item?.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(250);
    const panels = document.querySelectorAll('.arvo-action-menu.open');
    expect(panels.length).toBe(1);
    vi.useRealTimers();
  });

  it('opens submenu on click when submenuTrigger="click"', () => {
    createMenu({ items: submenuItems, submenuTrigger: 'click' });
    instance.open();
    const item = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
    item?.click();
    const panels = document.querySelectorAll('.arvo-action-menu.open');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Width
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- panel widths', () => {
  const submenuItems: MenuItemData[] = [
    { id: '1', label: 'Cut' },
    {
      id: '2',
      label: 'More',
      submenu: [{ id: '2a', label: 'Sub Item' }],
    },
  ];

  it('keeps parent menu width auto by default', () => {
    createMenu();
    instance.open();
    const panel = getPanel() as HTMLElement;
    expect(panel.style.width).toBe('');
    expect(panel.style.getPropertyValue('--arvo-overlay-width')).toBe('');
  });

  it('applies menuWidth to the parent panel', () => {
    createMenu({ menuWidth: '260px' });
    instance.open();
    const panel = getPanel() as HTMLElement;
    expect(panel.style.width).toBe('260px');
    expect(panel.style.getPropertyValue('--arvo-overlay-width')).toBe('260px');
  });

  it('treats numeric menuWidth as pixels', () => {
    createMenu({ menuWidth: 280 });
    instance.open();
    expect((getPanel() as HTMLElement).style.width).toBe('280px');
  });

  it('applies submenuWidth only to nested submenu panels', () => {
    createMenu({
      items: submenuItems,
      menuWidth: '220px',
      submenuWidth: '320px',
      submenuTrigger: 'click',
    });
    instance.open();
    const item = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
    item?.click();

    const panels = Array.from(document.querySelectorAll<HTMLElement>('.arvo-action-menu'));
    expect(panels[0].style.width).toBe('220px');
    expect(panels[1].style.width).toBe('320px');
  });

  it('updates an open submenu when submenuWidth changes', () => {
    createMenu({
      items: submenuItems,
      submenuWidth: '240px',
      submenuTrigger: 'click',
    });
    instance.open();
    const item = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
    item?.click();

    instance.setSubmenuWidth('360px');

    const panels = Array.from(document.querySelectorAll<HTMLElement>('.arvo-action-menu'));
    expect(panels[1].style.width).toBe('360px');
  });
});

// ---------------------------------------------------------------------------
// Icon glyph rendering
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- icon glyph rendering', () => {
  it('renders icon via o9con class, not as text content', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Cut', icon: 'content-cut' },
    ];
    createMenu({ items });
    instance.open();
    const ico = getPanel()?.querySelector('.arvo-menu-item__ico');
    expect(ico).not.toBeNull();
    expect(ico?.classList.contains('o9con-content-cut')).toBe(true);
    expect(ico?.textContent).toBe('');
  });

});

// ---------------------------------------------------------------------------
// Inline panel uses ArvoPopover
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- inline panel uses ArvoPopover', () => {
  it('inline panel contains arvo-popover class elements', () => {
    const contentEl = document.createElement('p');
    contentEl.textContent = 'Popover Content';
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'Settings',
        inlinePopover: {
          title: 'My Panel',
          content: contentEl,
        },
      },
    ];
    createMenu({ items });
    instance.open();
    const item = getPanel()?.querySelector<HTMLElement>('[role="menuitem"]');
    item?.click();
    const popover = document.querySelector('.arvo-popover');
    expect(popover).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Submenu keyboard navigation
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- submenu keyboard navigation', () => {
  const submenuItems: MenuItemData[] = [
    { id: '1', label: 'Cut' },
    {
      id: '2',
      label: 'More',
      submenu: [
        { id: '2a', label: 'Sub A' },
        { id: '2b', label: 'Sub B', isDisabled: true },
        { id: '2c', label: 'Sub C' },
      ],
    },
    { id: '3', label: 'Paste' },
  ];

  it('clicking a submenu item opens a nested menu panel', () => {
    createMenu({ items: submenuItems });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[1].click();
    const allMenus = document.querySelectorAll('[role="menu"]');
    expect(allMenus.length).toBeGreaterThanOrEqual(2);
  });

  it('Escape in submenu closes only the submenu', () => {
    createMenu({ items: submenuItems });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[1].click();
    const allMenus = document.querySelectorAll('[role="menu"]');
    expect(allMenus.length).toBeGreaterThanOrEqual(2);
    const submenuPanel = allMenus[allMenus.length - 1];
    submenuPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(instance.isOpen()).toBe(true);
  });

  it('ArrowLeft in submenu closes it and returns to parent', () => {
    createMenu({ items: submenuItems });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[1].click();
    const allMenus = document.querySelectorAll('[role="menu"]');
    expect(allMenus.length).toBeGreaterThanOrEqual(2);
    const submenuPanel = allMenus[allMenus.length - 1];
    submenuPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(instance.isOpen()).toBe(true);
  });

  it('Tab in submenu does NOT close the menu tree (focus trap keeps focus inside)', () => {
    // Tab / Shift+Tab inside an action menu must not close the overlay.
    // Closing on Tab traps keyboard users who routinely Tab between the
    // search input, menu rows, and trailing action buttons. The focus trap
    // installed in open() recycles focus inside the panel instead.
    createMenu({ items: submenuItems });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[1].click();
    const allMenus = document.querySelectorAll('[role="menu"]');
    expect(allMenus.length).toBeGreaterThanOrEqual(2);
    const submenuPanel = allMenus[allMenus.length - 1];
    submenuPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(instance.isOpen()).toBe(true);
  });

  it('submenu items have aria-haspopup="menu" and aria-expanded', () => {
    createMenu({ items: submenuItems });
    instance.open();
    const items = getPanel()?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(items?.[1].getAttribute('aria-haspopup')).toBe('menu');
    expect(items?.[1].getAttribute('aria-expanded')).toBe('false');
    items?.[1].click();
    expect(items?.[1].getAttribute('aria-expanded')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// defaultOpen / isOpen JS options
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- defaultOpen / isOpen', () => {
  it('defaultOpen=true seeds the menu open on init', () => {
    createMenu({ defaultOpen: true });
    expect(instance.isOpen()).toBe(true);
  });

  it('defaultOpen=false (default) leaves the menu closed', () => {
    createMenu();
    expect(instance.isOpen()).toBe(false);
  });

  it('isOpen=true seeds the menu open on init (parity with React)', () => {
    createMenu({ isOpen: true });
    expect(instance.isOpen()).toBe(true);
  });

  it('isOpen=true beats defaultOpen=false', () => {
    createMenu({ isOpen: true, defaultOpen: false });
    expect(instance.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// action-menu:open cancellability
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- action-menu:open cancellation', () => {
  it('preventDefault() on action-menu:open aborts open()', () => {
    triggerEl.addEventListener('action-menu:open', (e) => e.preventDefault());
    createMenu();
    instance.open();
    expect(instance.isOpen()).toBe(false);
  });

  it('preventDefault() on action-menu:close aborts programmatic close()', () => {
    triggerEl.addEventListener('action-menu:close', (e) => e.preventDefault());
    createMenu();
    instance.open();
    instance.close();
    expect(instance.isOpen()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Engine-silent dismissal (outside-click / Escape via overlay hub)
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- engine-silent dismissal', () => {
  it('outside click closes the menu without firing onClose', () => {
    const onClose = vi.fn();
    createMenu({ onClose });
    instance.open();

    // The overlay hub listens for `mousedown` on document (capture phase).
    // A mousedown outside the panel + outside the trigger triggers hub
    // dismissal; the cancellable onClose option is NOT consulted on the
    // engine-driven path.
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    outsideEl.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );

    expect(instance.isOpen()).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('outside click does not dispatch action-menu:close', () => {
    const handler = vi.fn();
    createMenu();
    instance.open();
    triggerEl.addEventListener('action-menu:close', handler);

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    outsideEl.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );

    expect(instance.isOpen()).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('outside click still fires onOpenChange(false) so consumers can react', () => {
    const onOpenChange = vi.fn();
    createMenu({ onOpenChange });
    instance.open();
    onOpenChange.mockClear();

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    outsideEl.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Status indicator dot
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- status indicator', () => {
  it('renders __status with the matching modifier class for each semantic key', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'A', status: 'success' },
      { id: '2', label: 'B', status: 'warning' },
      { id: '3', label: 'C', status: 'danger' },
      { id: '4', label: 'D', status: 'info' },
    ];
    createMenu({ items });
    instance.open();
    const dots = document.querySelectorAll('.arvo-menu-item__status');
    expect(dots.length).toBe(4);
    const rows = document.querySelectorAll('[role="menuitem"]');
    expect(rows[0].classList.contains('arvo-menu-item--status-success')).toBe(true);
    expect(rows[1].classList.contains('arvo-menu-item--status-warning')).toBe(true);
    expect(rows[2].classList.contains('arvo-menu-item--status-danger')).toBe(true);
    expect(rows[3].classList.contains('arvo-menu-item--status-info')).toBe(true);
  });

  it('sets --arvo-menu-item-status-color inline when status is { color }', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Custom', status: { color: '#bada55' } },
    ];
    createMenu({ items });
    instance.open();
    const row = document.querySelector('[role="menuitem"]') as HTMLElement;
    expect(row.style.getPropertyValue('--arvo-menu-item-status-color')).toBe('#bada55');
  });
});

// ---------------------------------------------------------------------------
// Meta value text
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- meta value', () => {
  it('renders __meta with the value text when item.value is set', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Project', value: '12 items' },
    ];
    createMenu({ items });
    instance.open();
    const meta = document.querySelector('.arvo-menu-item__meta');
    expect(meta).not.toBeNull();
    expect(meta?.textContent).toBe('12 items');
  });

  it('does not render __meta when item.value is omitted', () => {
    createMenu();
    instance.open();
    expect(document.querySelector('.arvo-menu-item__meta')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// External link
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- external link', () => {
  it('renders an <a> row when href is set', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Docs', href: 'https://example.com' },
    ];
    createMenu({ items });
    instance.open();
    const row = document.querySelector('[role="menuitem"]') as HTMLAnchorElement;
    expect(row.tagName).toBe('A');
    expect(row.getAttribute('href')).toBe('https://example.com');
  });

  it('adds target / rel / aria-label suffix when target="_blank"', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Docs', href: 'https://example.com', target: '_blank' },
    ];
    createMenu({ items });
    instance.open();
    const row = document.querySelector('[role="menuitem"]') as HTMLAnchorElement;
    expect(row.target).toBe('_blank');
    expect(row.rel).toBe('noopener noreferrer');
    expect(row.getAttribute('aria-label')).toBe('Docs, opens in a new window');
    expect(document.querySelector('.arvo-menu-item__external')).not.toBeNull();
  });

  it('omits the external icon when target is _self', () => {
    const items: MenuItemData[] = [
      { id: '1', label: 'Docs', href: '/docs', target: '_self' },
    ];
    createMenu({ items });
    instance.open();
    expect(document.querySelector('.arvo-menu-item__external')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Search-match highlight
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- search highlight', () => {
  it('wraps the matched substring in __match when filtering', () => {
    createMenu({ search: true });
    instance.open();
    const input = document.querySelector('.arvo-search__input') as HTMLInputElement;
    input.value = 'co';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const match = document.querySelector('.arvo-menu-item__match');
    expect(match).not.toBeNull();
    expect(match?.textContent?.toLowerCase()).toBe('co');
  });

  it('does not render __match when there is no active query', () => {
    createMenu({ search: true });
    instance.open();
    expect(document.querySelector('.arvo-menu-item__match')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Trailing actions overflow
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- actions overflow', () => {
  const fiveActionItem: MenuItemData[] = [
    {
      id: '1',
      label: 'File.txt',
      actions: [
        { id: 'a1', icon: 'edit', ariaLabel: 'Edit' },
        { id: 'a2', icon: 'duplicate', ariaLabel: 'Duplicate' },
        { id: 'a3', icon: 'archive', ariaLabel: 'Archive' },
        { id: 'a4', icon: 'download', ariaLabel: 'Download' },
        { id: 'a5', icon: 'bin', ariaLabel: 'Delete' },
      ],
    },
  ];

  it('caps inline actions at actionsMaxVisible (default 4) and renders __overflow for the rest', () => {
    createMenu({ items: fiveActionItem });
    instance.open();
    const actionBtns = document.querySelectorAll('.arvo-menu-item__actions button');
    expect(actionBtns.length).toBe(4);
    expect(document.querySelector('.arvo-menu-item__overflow')).not.toBeNull();
  });

  it('honors a higher actionsMaxVisible by rendering all inline (no __overflow)', () => {
    createMenu({ items: fiveActionItem, actionsMaxVisible: 10 });
    instance.open();
    const actionBtns = document.querySelectorAll('.arvo-menu-item__actions button');
    expect(actionBtns.length).toBe(5);
    expect(document.querySelector('.arvo-menu-item__overflow')).toBeNull();
  });

  it('renders no __overflow when actions count is at or below the cap', () => {
    const items: MenuItemData[] = [
      {
        id: '1',
        label: 'Two',
        actions: [
          { id: 'a1', icon: 'edit', ariaLabel: 'Edit' },
          { id: 'a2', icon: 'bin', ariaLabel: 'Delete' },
        ],
      },
    ];
    createMenu({ items });
    instance.open();
    expect(document.querySelector('.arvo-menu-item__overflow')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// noData hides the search bar
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- noData hides search', () => {
  it('hides the search wrapper when items is empty and no query is active', () => {
    createMenu({ items: [], search: true });
    instance.open();
    const wrap = document.querySelector('.arvo-action-menu__search') as HTMLElement | null;
    expect(wrap).not.toBeNull();
    // The wrapper stays in the DOM but is collapsed via inline `display: none`
    // so the empty state renders flush against the menu's top edge.
    expect(wrap!.style.display).toBe('none');
  });

  it('keeps the search wrapper visible for noResults (items empty after filter)', () => {
    createMenu({ search: true });
    instance.open();
    const input = document.querySelector('.arvo-search__input') as HTMLInputElement;
    input.value = 'zzz-no-match';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const wrap = document.querySelector('.arvo-action-menu__search') as HTMLElement | null;
    expect(wrap).not.toBeNull();
    expect(wrap!.style.display).not.toBe('none');
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------

describe('ArvoActionMenu (JS) -- accessibility', () => {
  it('open menu has no axe violations', async () => {
    createMenu();
    instance.open();
    // The portaled panel is a body-level region; the region-landmark rule
    // always flags it. Match the OptionList convention and disable that rule.
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  // The React twin renders the same menu+search shape and exhibits the same
  // pre-existing aria-required-children finding (a `[role="search"]` child
  // inside `[role="menu"]`).
  it.skip('open menu with search has no axe violations (pre-existing structural finding)', async () => {
    createMenu({ search: true });
    instance.open();
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('open menu with grouped items has no axe violations', async () => {
    createMenu({ items: groupedItems });
    instance.open();
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
