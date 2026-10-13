import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoLink } from './Link';
function createAnchorElement(text = '', href = ''): HTMLAnchorElement {
  const el = document.createElement('a');
  if (text) el.textContent = text;
  if (href) el.setAttribute('href', href);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('Link - initialization', () => {
  it('static initialize() returns a Link instance', () => {
    const el = createAnchorElement();
    const lnk = ArvoLink.initialize(el, { href: '/page' });
    expect(lnk).toBeInstanceOf(ArvoLink);
  });

  it('constructor returns a Link instance', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/page' });
    expect(lnk).toBeInstanceOf(ArvoLink);
  });

  it('adds arvo-lnk base class', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    expect(el.classList.contains('arvo-lnk')).toBe(true);
  });

  it('adds default primary variant class', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    expect(el.classList.contains('arvo-lnk--primary')).toBe(true);
  });

  it('adds the specified variant class', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page', variant: 'secondary' });
    expect(el.classList.contains('arvo-lnk--secondary')).toBe(true);
  });

  it('adds default lg size class', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    expect(el.classList.contains('arvo-lnk--lg')).toBe(true);
  });

  it('adds the specified size class', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page', size: 'sm' });
    expect(el.classList.contains('arvo-lnk--sm')).toBe(true);
  });

  it('creates label span with the provided label text', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page', label: 'Click me' });
    const lbl = el.querySelector('.arvo-lnk__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl!.textContent).toBe('Click me');
  });

  it('falls back to existing element text for label', () => {
    const el = createAnchorElement('Existing');
    new ArvoLink(el, { href: '/page' });
    expect(el.querySelector('.arvo-lnk__lbl')!.textContent).toBe('Existing');
  });

  it('sets href attribute', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    expect(el.getAttribute('href')).toBe('/page');
  });

  it('falls back to primary for an invalid variant', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', variant: 'invalid' as never });
    expect(el.classList.contains('arvo-lnk--primary')).toBe(true);
  });

  it('falls back to lg for an invalid size', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', size: 'xl' as never });
    expect(el.classList.contains('arvo-lnk--lg')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------
describe('Link - icon management', () => {
  it('creates icon element when icon option is provided', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', icon: 'arrow-right' });
    const ico = el.querySelector('.arvo-lnk__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-arrow-right')).toBe(true);
  });

  it('icon span has aria-hidden="true"', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', icon: 'arrow-right' });
    expect(el.querySelector('.arvo-lnk__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not create icon element when icon is omitted', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/' });
    expect(el.querySelector('.arvo-lnk__ico')).toBeNull();
  });

  it('setIcon creates icon element when none exists', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.setIcon('edit');
    const ico = el.querySelector('.arvo-lnk__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
  });

  it('setIcon swaps icon class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', icon: 'save' });
    lnk.setIcon('edit');
    const ico = el.querySelector('.arvo-lnk__ico');
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
    expect(ico!.classList.contains('o9con-save')).toBe(false);
  });

  it('setIcon(null) removes the icon element', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', icon: 'save' });
    lnk.setIcon(null);
    expect(el.querySelector('.arvo-lnk__ico')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// External link
// ---------------------------------------------------------------------------
describe('Link - external', () => {
  it('shows trailing external icon when external=true', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isExternal: true });
    expect(el.querySelector('.arvo-lnk__ext')).not.toBeNull();
  });

  it('sets target="_blank" automatically when external=true', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isExternal: true });
    expect(el.getAttribute('target')).toBe('_blank');
  });

  it('sets rel="noopener noreferrer" when target is _blank', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isExternal: true });
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not show external icon by default', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/' });
    expect(el.querySelector('.arvo-lnk__ext')).toBeNull();
  });

  it('setExternal(true) adds external icon and target', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.setExternal(true);
    expect(el.querySelector('.arvo-lnk__ext')).not.toBeNull();
    expect(el.getAttribute('target')).toBe('_blank');
  });

  it('setExternal(false) removes external icon', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', isExternal: true });
    lnk.setExternal(false);
    expect(el.querySelector('.arvo-lnk__ext')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Label management
// ---------------------------------------------------------------------------
describe('Link - label management', () => {
  it('setLabel updates the label text', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', label: 'Old' });
    lnk.setLabel('New');
    expect(el.querySelector('.arvo-lnk__lbl')!.textContent).toBe('New');
  });
});

// ---------------------------------------------------------------------------
// Href management
// ---------------------------------------------------------------------------
describe('Link - href management', () => {
  it('setHref updates the href attribute', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/old' });
    lnk.setHref('/new');
    expect(el.getAttribute('href')).toBe('/new');
  });

  it('setHref does not set href when disabled', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/old', isDisabled: true });
    lnk.setHref('/new');
    expect(el.getAttribute('href')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Visited state
// ---------------------------------------------------------------------------
describe('Link - visited state', () => {
  it('adds visited class when visited=true', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isVisited: true });
    expect(el.classList.contains('visited')).toBe(true);
  });

  it('adds visited class by default (isVisited defaults to true)', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/' });
    expect(el.classList.contains('visited')).toBe(true);
  });

  it('does not add visited class when explicitly opted out', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isVisited: false });
    expect(el.classList.contains('visited')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('Link - loading state', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class and aria-busy', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', isLoading: true });
    lnk.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('click is suppressed during loading', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isLoading: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('Link - disabled state', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets aria-disabled="true"', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.disabled(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled(true) removes href attribute', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/page' });
    lnk.disabled(true);
    expect(el.getAttribute('href')).toBeNull();
  });

  it('disabled(true) adds tabindex="0" for focusability', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.disabled(true);
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('disabled(false) restores href and removes aria-disabled', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/page', isDisabled: true });
    lnk.disabled(false);
    expect(el.getAttribute('href')).toBe('/page');
    expect(el.getAttribute('aria-disabled')).toBeNull();
    expect(el.getAttribute('tabindex')).toBeNull();
  });

  it('disabled() returns current state', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', isDisabled: true });
    expect(lnk.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    expect(lnk.disabled()).toBe(false);
  });

  it('click is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isDisabled: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('initialization with disabled=true applies disabled state', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page', isDisabled: true });
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('href')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------
describe('Link - focus', () => {
  it('focus() calls element.focus()', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    const spy = vi.spyOn(el, 'focus');
    lnk.focus();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('focus() does NOT call element.focus() when loading', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', isLoading: true });
    const spy = vi.spyOn(el, 'focus');
    lnk.focus();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Keyboard activation
// ---------------------------------------------------------------------------
describe('Link - keyboard activation', () => {
  it('activates the link on Enter when not blocked', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', onClick });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('dispatches lnk:click on Enter when not blocked', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    const handler = vi.fn();
    el.addEventListener('lnk:click', handler);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('preventDefaults the Enter keydown so the browser does not double-fire', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/' });
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not activate on Enter when disabled', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isDisabled: true, onClick });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not activate on Enter when loading', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', isLoading: true, onClick });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores non-Enter keys', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', onClick });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('removes keydown listener on destroy', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', onClick });
    lnk.destroy();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('Link - custom events', () => {
  it('dispatches lnk:click event on click', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    const handler = vi.fn();
    el.addEventListener('lnk:click', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      href: '/page',
      isExternal: false,
    });
  });

  it('lnk:click event bubbles', () => {
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/page' });
    const handler = vi.fn();
    document.body.addEventListener('lnk:click', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('lnk:click', handler);
  });

  it('onClick callback is called on click', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoLink(el, { href: '/', onClick });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('Link - destroy', () => {
  it('removes arvo-lnk base class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.destroy();
    expect(el.classList.contains('arvo-lnk')).toBe(false);
  });

  it('removes all variant classes', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', variant: 'secondary' });
    lnk.destroy();
    ArvoLink.VARIANTS.forEach(v => {
      expect(el.classList.contains(`arvo-lnk--${v}`)).toBe(false);
    });
  });

  it('removes all size classes', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', size: 'sm' });
    lnk.destroy();
    ArvoLink.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-lnk--${s}`)).toBe(false);
    });
  });

  it('restores original href', () => {
    const el = createAnchorElement('', '/original');
    const lnk = new ArvoLink(el, { href: '/changed' });
    lnk.destroy();
    expect(el.getAttribute('href')).toBe('/original');
  });

  it('restores original text content', () => {
    const el = createAnchorElement('Original');
    const lnk = new ArvoLink(el, { href: '/', label: 'Changed' });
    lnk.destroy();
    expect(el.textContent).toBe('Original');
  });

  it('removes icon, label, and external elements', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', icon: 'save', isExternal: true });
    lnk.destroy();
    expect(el.querySelector('.arvo-lnk__ico')).toBeNull();
    expect(el.querySelector('.arvo-lnk__lbl')).toBeNull();
    expect(el.querySelector('.arvo-lnk__ext')).toBeNull();
  });

  it('removes click event listener', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/', onClick });
    lnk.destroy();
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createAnchorElement();
    const lnk = new ArvoLink(el, { href: '/' });
    lnk.destroy();
    expect(() => lnk.destroy()).not.toThrow();
  });
});
