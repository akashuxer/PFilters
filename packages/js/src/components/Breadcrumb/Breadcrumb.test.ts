import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ArvoBreadcrumb } from './Breadcrumb';
import type { ArvoBreadcrumbItem } from './Breadcrumb';
import type { MenuItemData } from '../ActionMenu/ActionMenu';
// jsdom polyfills required by the OverlaySurface engine when per-item or
// overflow ActionMenus open. Defined at module load so all tests inherit.
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
if (typeof window.matchMedia !== 'function') {
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
}
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn();
}

function createElement(tag = 'nav'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

const defaultItems: ArvoBreadcrumbItem[] = [
  { label: '', icon: 'home', href: '/' },
  { label: 'Section', href: '/section' },
  { label: 'Page', href: '/section/page' },
  { label: 'Current Page' },
];

const menuItems: MenuItemData[] = [
  { id: 'a', label: 'Option A' },
  { id: 'b', label: 'Option B' },
];

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('Breadcrumb - initialization', () => {
  it('static initialize() returns an ArvoBreadcrumb instance', () => {
    const el = createElement();
    const bc = ArvoBreadcrumb.initialize(el, { items: defaultItems });
    expect(bc).toBeInstanceOf(ArvoBreadcrumb);
  });

  it('constructor returns an ArvoBreadcrumb instance', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    expect(bc).toBeInstanceOf(ArvoBreadcrumb);
  });

  it('adds arvo-bc base class', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    expect(el.classList.contains('arvo-bc')).toBe(true);
  });

  it('sets aria-label on the root element', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('uses custom ariaLabel', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems, ariaLabel: 'Navigation' });
    expect(el.getAttribute('aria-label')).toBe('Navigation');
  });

  it('creates an ordered list element', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const list = el.querySelector('ol.arvo-bc__list');
    expect(list).not.toBeNull();
  });

  it('creates correct number of list items', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const items = el.querySelectorAll('.arvo-bc__item');
    expect(items.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Item rendering
// ---------------------------------------------------------------------------
describe('Breadcrumb - item rendering', () => {
  it('renders home icon-only link with aria-label for first item', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const firstLink = el.querySelector('.arvo-bc__lnk');
    expect(firstLink).not.toBeNull();
    expect(firstLink!.getAttribute('aria-label')).toBe('Home');
    const ico = firstLink!.querySelector('.arvo-bc__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-home')).toBe(true);
    expect(ico!.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders intermediate items as links with text', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const links = el.querySelectorAll('.arvo-bc__lnk');
    expect(links[1].textContent).toBe('Section');
    expect(links[1].getAttribute('href')).toBe('/section');
  });

  it('renders last item as current page span', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const lbl = el.querySelector('.arvo-bc__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl!.textContent).toBe('Current Page');
    expect(lbl!.getAttribute('aria-current')).toBe('page');
    expect(lbl!.tagName).toBe('SPAN');
  });

  it('renders link hrefs correctly', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const links = el.querySelectorAll('.arvo-bc__lnk');
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[1].getAttribute('href')).toBe('/section');
    expect(links[2].getAttribute('href')).toBe('/section/page');
  });
});

// ---------------------------------------------------------------------------
// setItems
// ---------------------------------------------------------------------------
describe('Breadcrumb - setItems', () => {
  it('replaces all items', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.setItems([
      { label: 'New Home', href: '/' },
      { label: 'New Current' },
    ]);
    const items = el.querySelectorAll('.arvo-bc__item');
    expect(items.length).toBe(2);
    expect(el.querySelector('.arvo-bc__lbl')!.textContent).toBe('New Current');
  });

  it('preserves disabled state after setItems', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems, isDisabled: true });
    bc.setItems([
      { label: 'Home', href: '/' },
      { label: 'Current' },
    ]);
    const link = el.querySelector('.arvo-bc__lnk');
    expect(link!.getAttribute('aria-disabled')).toBe('true');
    expect(link!.getAttribute('href')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('Breadcrumb - disabled state', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets aria-disabled on all links', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.disabled(true);
    el.querySelectorAll('.arvo-bc__lnk').forEach(link => {
      expect(link.getAttribute('aria-disabled')).toBe('true');
    });
  });

  it('disabled(true) removes href from links', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.disabled(true);
    el.querySelectorAll('.arvo-bc__lnk').forEach(link => {
      expect(link.getAttribute('href')).toBeNull();
    });
  });

  it('disabled(true) adds tabindex="0" on links', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.disabled(true);
    el.querySelectorAll('.arvo-bc__lnk').forEach(link => {
      expect(link.getAttribute('tabindex')).toBe('0');
    });
  });

  it('disabled(false) restores href and removes aria-disabled', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems, isDisabled: true });
    bc.disabled(false);
    expect(el.classList.contains('is-disabled')).toBe(false);
    const links = el.querySelectorAll('.arvo-bc__lnk');
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[1].getAttribute('href')).toBe('/section');
    expect(links[0].getAttribute('aria-disabled')).toBeNull();
    expect(links[0].getAttribute('tabindex')).toBeNull();
  });

  it('disabled() returns current state', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems, isDisabled: true });
    expect(bc.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    expect(bc.disabled()).toBe(false);
  });

  it('click is suppressed when disabled', () => {
    const onNavigate = vi.fn();
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems, isDisabled: true, onNavigate });
    const link = el.querySelector('.arvo-bc__lnk')!;
    (link as HTMLElement).click();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('initialization with disabled=true applies disabled state', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems, isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
    el.querySelectorAll('.arvo-bc__lnk').forEach(link => {
      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.getAttribute('href')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('Breadcrumb - loading state', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class and aria-busy', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems, isLoading: true });
    bc.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('does not render clickable links while loading (skeleton takes over)', () => {
    const onNavigate = vi.fn();
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems, isLoading: true, onNavigate });
    expect(el.querySelector('.arvo-bc__lnk')).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('Breadcrumb - custom events', () => {
  it('dispatches bc:navigate event on link click', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const handler = vi.fn();
    el.addEventListener('bc:navigate', handler);
    const link = el.querySelectorAll('.arvo-bc__lnk')[1] as HTMLElement;
    link.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      href: '/section',
      index: 1,
      label: 'Section',
    });
  });

  it('bc:navigate event bubbles', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const handler = vi.fn();
    document.body.addEventListener('bc:navigate', handler);
    const link = el.querySelectorAll('.arvo-bc__lnk')[1] as HTMLElement;
    link.click();
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('bc:navigate', handler);
  });

  it('onNavigate callback is called on link click', () => {
    const onNavigate = vi.fn();
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems, onNavigate });
    const link = el.querySelectorAll('.arvo-bc__lnk')[1] as HTMLElement;
    link.click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith({
      href: '/section',
      index: 1,
      label: 'Section',
    });
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('Breadcrumb - destroy', () => {
  it('removes arvo-bc base class', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.destroy();
    expect(el.classList.contains('arvo-bc')).toBe(false);
  });

  it('removes aria-label', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.destroy();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('restores original content', () => {
    const el = createElement();
    el.innerHTML = '<span>original</span>';
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.destroy();
    expect(el.innerHTML).toBe('<span>original</span>');
  });

  it('removes click event listener', () => {
    const onNavigate = vi.fn();
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems, onNavigate });
    bc.destroy();
    el.querySelector('.arvo-bc__lnk')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: defaultItems });
    bc.destroy();
    expect(() => bc.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Auto-classification parity (hasExplicitCurrent rule)
// ---------------------------------------------------------------------------
describe('Breadcrumb - auto-classification parity with React', () => {
  it('respects explicit type=current on a non-last item (single aria-current only)', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Pinned', type: 'current' },
        { label: 'Tail', href: '/tail' },
      ],
    });
    const currents = el.querySelectorAll('[aria-current="page"]');
    expect(currents.length).toBe(1);
    expect(currents[0].textContent).toBe('Pinned');
    // The last item should fall back to a regular link.
    const links = el.querySelectorAll('.arvo-bc__lnk');
    expect(links[links.length - 1].textContent).toBe('Tail');
  });

  it('respects explicit type=link on the last item (no auto-current span)', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Last', href: '/last', type: 'link' },
      ],
    });
    expect(el.querySelector('.arvo-bc__lbl')).toBeNull();
    const links = el.querySelectorAll('.arvo-bc__lnk');
    expect(links.length).toBe(2);
    expect(links[1].textContent).toBe('Last');
  });
});

// ---------------------------------------------------------------------------
// Truncation tooltip
// ---------------------------------------------------------------------------
describe('Breadcrumb - truncation tooltip', () => {
  it('sets title on plain links equal to the label', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const links = el.querySelectorAll('.arvo-bc__lnk');
    expect(links[1].getAttribute('title')).toBe('Section');
    expect(links[2].getAttribute('title')).toBe('Page');
  });

  it('sets title on the current-page span equal to the label', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    expect(
      el.querySelector('.arvo-bc__lbl')!.getAttribute('title'),
    ).toBe('Current Page');
  });

  it('omits title on the icon-only home link (aria-label carries the name)', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: defaultItems });
    const home = el.querySelectorAll('.arvo-bc__lnk')[0];
    expect(home.getAttribute('title')).toBeNull();
    expect(home.getAttribute('aria-label')).toBe('Home');
  });
});

// ---------------------------------------------------------------------------
// Per-item dropdown menus
// ---------------------------------------------------------------------------
describe('Breadcrumb - per-item dropdown menus', () => {
  const trailWithItemMenu: ArvoBreadcrumbItem[] = [
    { label: '', icon: 'home', href: '/' },
    { label: 'Section', href: '/section', menuItems },
    { label: 'Current Page' },
  ];

  it('renders a dropdown link trigger as a <button> with chevron + aria-haspopup', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger!.tagName).toBe('BUTTON');
    expect(trigger!.classList.contains('arvo-bc__lnk')).toBe(true);
    expect(trigger!.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger!.querySelector('.arvo-bc__lnk-inner')).not.toBeNull();
    const chev = trigger!.querySelector('.arvo-bc__chev');
    expect(chev).not.toBeNull();
    expect(chev!.classList.contains('o9con-angle-down')).toBe(true);
  });

  it('renders a dropdown current trigger as a <button> with aria-current=page', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Q4 2025', menuItems },
      ],
    });
    const trigger = el.querySelector('.arvo-bc__lbl--dd') as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger!.tagName).toBe('BUTTON');
    expect(trigger!.getAttribute('aria-current')).toBe('page');
    expect(trigger!.getAttribute('aria-haspopup')).toBe('menu');
    // The plain non-dropdown <span class="arvo-bc__lbl"> should be replaced.
    expect(el.querySelectorAll('span.arvo-bc__lbl').length).toBe(0);
  });

  it('keeps the chevron glyph as angle-down when the menu opens (CSS rotates it)', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    expect(trigger.querySelector('.o9con-angle-down')).not.toBeNull();
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Glyph stays the same; SCSS rotates 180deg on aria-expanded='true'.
    expect(trigger.querySelector('.o9con-angle-down')).not.toBeNull();
    expect(trigger.querySelector('.o9con-angle-up')).toBeNull();
  });

  it('fires onItemMenuOpen with the original index when the menu opens', () => {
    const onItemMenuOpen = vi.fn();
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu, onItemMenuOpen });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    trigger.click();
    expect(onItemMenuOpen).toHaveBeenCalledTimes(1);
    expect(onItemMenuOpen).toHaveBeenCalledWith({ index: 1 });
  });

  it('fires onItemMenuClose with the original index when the menu closes', () => {
    const onItemMenuClose = vi.fn();
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu, onItemMenuClose });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    trigger.click();
    trigger.click();
    expect(onItemMenuClose).toHaveBeenCalledWith({ index: 1 });
  });

  it('menuItems wins over href -- trigger is a <button>, no href', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('href')).toBeNull();
  });

  it('does NOT fire onNavigate when a dropdown link trigger is clicked', () => {
    const onNavigate = vi.fn();
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu, onNavigate });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    trigger.click();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('sets title on the dropdown trigger equal to the item label', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    expect(trigger.getAttribute('title')).toBe('Section');
  });

  it('does not auto-classify an icon-only first item as home when it has menuItems', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, {
      items: [
        { label: '', icon: 'home', menuItems },
        { label: 'Current' },
      ],
    });
    const firstSlot = el.querySelectorAll('.arvo-bc__item')[0];
    const dd = firstSlot.querySelector('.arvo-bc__lnk--dd');
    expect(dd).not.toBeNull();
    expect(dd!.getAttribute('aria-label')).toBeNull();
  });

  it('disables per-item dropdown triggers when the breadcrumb is disabled', () => {
    const el = createElement();
    new ArvoBreadcrumb(el, { items: trailWithItemMenu, isDisabled: true });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
  });

  it('destroys per-item menus when destroy() is called', () => {
    const el = createElement();
    const bc = new ArvoBreadcrumb(el, { items: trailWithItemMenu });
    const trigger = el.querySelector('.arvo-bc__lnk--dd') as HTMLButtonElement;
    // ActionMenu writes aria-haspopup onto the trigger; destroy() removes it.
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    bc.destroy();
    // After destroy the original DOM is restored, so the trigger is gone too.
    expect(el.querySelector('.arvo-bc__lnk--dd')).toBeNull();
  });
});
