import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoIconButtonLink } from './IconButtonLink';
function createAnchorElement(href = ''): HTMLAnchorElement {
  const el = document.createElement('a');
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
describe('IconButtonLink - initialization', () => {
  it('static initialize() returns an instance', () => {
    const el = createAnchorElement();
    const lnk = ArvoIconButtonLink.initialize(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    expect(lnk).toBeInstanceOf(ArvoIconButtonLink);
  });

  it('adds arvo-icon-btn base class', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    expect(el.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('adds default tertiary variant class', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    expect(el.classList.contains('arvo-btn--tertiary')).toBe(true);
  });

  it('adds the specified variant class', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', variant: 'outline' });
    expect(el.classList.contains('arvo-btn--outline')).toBe(true);
  });

  it('adds default md size class', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
  });

  it('creates icon element', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-plus')).toBe(true);
  });

  it('sets aria-label from tooltip', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add item' });
    expect(el.getAttribute('aria-label')).toBe('Add item');
  });

  // tooltip is managed by connectTooltip, not native title
  it.skip('sets title from tooltip', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add item' });
    expect(el.getAttribute('title')).toBe('Add item');
  });

  it('sets href attribute', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/page', icon: 'plus', tooltip: 'Add' });
    expect(el.getAttribute('href')).toBe('/page');
  });
});

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------
describe('IconButtonLink - icon management', () => {
  it('setIcon swaps icon class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    lnk.setIcon('edit');
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
    expect(ico!.classList.contains('o9con-plus')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tooltip management
// ---------------------------------------------------------------------------
describe('IconButtonLink - tooltip management', () => {
  it('setTooltip updates aria-label', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    lnk.setTooltip('Edit item');
    expect(el.getAttribute('aria-label')).toBe('Edit item');
    // tooltip is managed by connectTooltip, not native title
  });
});

// ---------------------------------------------------------------------------
// Href management
// ---------------------------------------------------------------------------
describe('IconButtonLink - href management', () => {
  it('setHref updates href attribute', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/old', icon: 'plus', tooltip: 'Add' });
    lnk.setHref('/new');
    expect(el.getAttribute('href')).toBe('/new');
  });
});

// ---------------------------------------------------------------------------
// Target / rel
// ---------------------------------------------------------------------------
describe('IconButtonLink - target/rel', () => {
  it('sets rel when target="_blank"', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', target: '_blank' });
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

// ---------------------------------------------------------------------------
// hasExternalLink
// ---------------------------------------------------------------------------
describe('IconButtonLink - hasExternalLink', () => {
  it('hasExternalLink=true auto-promotes target to "_blank" with rel', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: 'https://example.com', icon: 'external-link', tooltip: 'Open', hasExternalLink: true });
    expect(el.getAttribute('target')).toBe('_blank');
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('hasExternalLink=true does not override an explicit target', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/page', icon: 'external-link', tooltip: 'Open', hasExternalLink: true, target: '_self' });
    expect(el.getAttribute('target')).toBe('_self');
  });

  it('setExternalLink(true) promotes target to "_blank"', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'external-link', tooltip: 'Open' });
    lnk.setExternalLink(true);
    expect(el.getAttribute('target')).toBe('_blank');
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('IconButtonLink - disabled state', () => {
  it('disabled(true) adds is-disabled class and aria-disabled', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    lnk.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('href')).toBeNull();
  });

  it('disabled(false) restores href', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/page', icon: 'plus', tooltip: 'Add', isDisabled: true });
    lnk.disabled(false);
    expect(el.getAttribute('href')).toBe('/page');
    expect(el.getAttribute('aria-disabled')).toBeNull();
  });

  it('disabled() returns current state', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', isDisabled: true });
    expect(lnk.disabled()).toBe(true);
  });

  it('click is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', isDisabled: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('IconButtonLink - loading state', () => {
  it('setLoading(true) adds loading class and aria-busy', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    lnk.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', isLoading: true });
    lnk.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('click is suppressed during loading', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', isLoading: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('IconButtonLink - custom events', () => {
  it('dispatches ico-btn-lnk:click on click', () => {
    const el = createAnchorElement();
    new ArvoIconButtonLink(el, { href: '/page', icon: 'plus', tooltip: 'Add' });
    const handler = vi.fn();
    el.addEventListener('ico-btn-lnk:click', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ href: '/page' });
  });
});

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------
describe('IconButtonLink - focus', () => {
  it('focus() calls element.focus()', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    const spy = vi.spyOn(el, 'focus');
    lnk.focus();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('focus() skips when loading', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', isLoading: true });
    const spy = vi.spyOn(el, 'focus');
    lnk.focus();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('IconButtonLink - destroy', () => {
  it('removes arvo-icon-btn class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    lnk.destroy();
    expect(el.classList.contains('arvo-icon-btn')).toBe(false);
  });

  it('removes all variant/size classes', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', variant: 'outline', size: 'lg' });
    lnk.destroy();
    ArvoIconButtonLink.VARIANTS.forEach(v => expect(el.classList.contains(`arvo-btn--${v}`)).toBe(false));
    ArvoIconButtonLink.SIZES.forEach(s => expect(el.classList.contains(`arvo-btn--${s}`)).toBe(false));
  });

  it('restores original href', () => {
    const el = createAnchorElement('/original');
    const lnk = new ArvoIconButtonLink(el, { href: '/changed', icon: 'plus', tooltip: 'Add' });
    lnk.destroy();
    expect(el.getAttribute('href')).toBe('/original');
  });

  it('removes click event listener', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add', onClick });
    lnk.destroy();
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not throw on double destroy', () => {
    const el = createAnchorElement();
    const lnk = new ArvoIconButtonLink(el, { href: '/', icon: 'plus', tooltip: 'Add' });
    lnk.destroy();
    expect(() => lnk.destroy()).not.toThrow();
  });
});
