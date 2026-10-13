import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoButtonLink } from './ButtonLink';
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
describe('ButtonLink - initialization', () => {
  it('static initialize() returns a ButtonLink instance', () => {
    const el = createAnchorElement();
    const lnk = ArvoButtonLink.initialize(el, { href: '/page' });
    expect(lnk).toBeInstanceOf(ArvoButtonLink);
  });

  it('adds arvo-btn base class', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/page' });
    expect(el.classList.contains('arvo-btn')).toBe(true);
  });

  it('adds default primary variant class', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/' });
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
  });

  it('adds the specified variant class', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', variant: 'outline' });
    expect(el.classList.contains('arvo-btn--outline')).toBe(true);
  });

  it('adds default md size class', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/' });
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
  });

  it('creates label span', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', label: 'Go' });
    expect(el.querySelector('.arvo-btn__lbl')!.textContent).toBe('Go');
  });

  it('sets href attribute', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/page' });
    expect(el.getAttribute('href')).toBe('/page');
  });

  it('adds full-width class when fullWidth=true', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', isFullWidth: true });
    expect(el.classList.contains('arvo-btn--full-width')).toBe(true);
  });

  it('renders as <a> element not <button>', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/' });
    expect(el.tagName).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------
describe('ButtonLink - icon management', () => {
  it('creates icon element when icon option is provided', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', icon: 'add' });
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-add')).toBe(true);
  });

  it('setIcon swaps icon class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', icon: 'add' });
    lnk.setIcon('edit');
    expect(el.querySelector('.arvo-btn__ico')!.classList.contains('o9con-edit')).toBe(true);
    expect(el.querySelector('.arvo-btn__ico')!.classList.contains('o9con-add')).toBe(false);
  });

  it('setIcon(null) removes icon', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', icon: 'add' });
    lnk.setIcon(null);
    expect(el.querySelector('.arvo-btn__ico')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// External link icon
// ---------------------------------------------------------------------------
describe('ButtonLink - external link icon', () => {
  it('does not render external-link icon by default', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/' });
    expect(el.querySelector('.o9con-external-link')).toBeNull();
  });

  it('renders trailing external-link icon when hasExternalLink=true', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', label: 'Go', hasExternalLink: true });
    const ext = el.querySelector('.arvo-btn__ico.o9con-external-link');
    expect(ext).not.toBeNull();
    expect(ext!.getAttribute('aria-hidden')).toBe('true');
  });

  it('places external-link icon as the last direct child after the label', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', label: 'Go', icon: 'book', hasExternalLink: true });
    const children = Array.from(el.children);
    expect(children[0].classList.contains('o9con-book')).toBe(true);
    expect(children[1].classList.contains('arvo-btn__lbl')).toBe(true);
    expect(children[2].classList.contains('o9con-external-link')).toBe(true);
  });

  it('setExternalLink(true) appends the external-link icon', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', label: 'Go' });
    lnk.setExternalLink(true);
    const ext = el.querySelector('.o9con-external-link');
    expect(ext).not.toBeNull();
    expect(el.lastElementChild).toBe(ext);
  });

  it('setExternalLink(false) removes the external-link icon', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', label: 'Go', hasExternalLink: true });
    lnk.setExternalLink(false);
    expect(el.querySelector('.o9con-external-link')).toBeNull();
  });

  it('setExternalLink(true) is idempotent', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', label: 'Go', hasExternalLink: true });
    lnk.setExternalLink(true);
    expect(el.querySelectorAll('.o9con-external-link').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ariaLabel
// ---------------------------------------------------------------------------
describe('ButtonLink - ariaLabel', () => {
  it('does not set aria-label when ariaLabel option is omitted', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', label: 'Go' });
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('sets aria-label from ariaLabel option', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', label: 'Read more', ariaLabel: 'Read more about pricing' });
    expect(el.getAttribute('aria-label')).toBe('Read more about pricing');
  });

  it('setAriaLabel updates aria-label', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', label: 'Read more' });
    lnk.setAriaLabel('Read more about pricing');
    expect(el.getAttribute('aria-label')).toBe('Read more about pricing');
  });

  it('setAriaLabel(null) removes aria-label', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', label: 'Read more', ariaLabel: 'Pricing' });
    lnk.setAriaLabel(null);
    expect(el.getAttribute('aria-label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Variant & size management
// ---------------------------------------------------------------------------
describe('ButtonLink - variant & size management', () => {
  it('setVariant swaps variant class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', variant: 'primary' });
    lnk.setVariant('outline');
    expect(el.classList.contains('arvo-btn--outline')).toBe(true);
    expect(el.classList.contains('arvo-btn--primary')).toBe(false);
  });

  it('setSize swaps size class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', size: 'md' });
    lnk.setSize('lg');
    expect(el.classList.contains('arvo-btn--lg')).toBe(true);
    expect(el.classList.contains('arvo-btn--md')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Target / rel
// ---------------------------------------------------------------------------
describe('ButtonLink - target/rel', () => {
  it('sets rel="noopener noreferrer" when target="_blank"', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', target: '_blank' });
    expect(el.getAttribute('target')).toBe('_blank');
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not set rel for non-blank targets', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', target: '_self' });
    expect(el.getAttribute('rel')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('ButtonLink - disabled state', () => {
  it('disabled(true) adds is-disabled class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/' });
    lnk.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
  });

  it('disabled(true) sets aria-disabled and removes href', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/page' });
    lnk.disabled(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('href')).toBeNull();
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('disabled(false) restores href', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/page', isDisabled: true });
    lnk.disabled(false);
    expect(el.getAttribute('href')).toBe('/page');
    expect(el.getAttribute('aria-disabled')).toBeNull();
  });

  it('disabled() returns current state', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', isDisabled: true });
    expect(lnk.disabled()).toBe(true);
  });

  it('click is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', isDisabled: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('ButtonLink - loading state', () => {
  it('setLoading(true) adds loading class and aria-busy', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/' });
    lnk.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class and aria-busy', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', isLoading: true });
    lnk.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('click is suppressed during loading', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', isLoading: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('ButtonLink - custom events', () => {
  it('dispatches btn-lnk:click event on click', () => {
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/page' });
    const handler = vi.fn();
    el.addEventListener('btn-lnk:click', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ href: '/page' });
  });

  it('onClick callback is called on click', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    new ArvoButtonLink(el, { href: '/', onClick });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('ButtonLink - destroy', () => {
  it('removes arvo-btn base class', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/' });
    lnk.destroy();
    expect(el.classList.contains('arvo-btn')).toBe(false);
  });

  it('restores original href', () => {
    const el = createAnchorElement('', '/original');
    const lnk = new ArvoButtonLink(el, { href: '/changed' });
    lnk.destroy();
    expect(el.getAttribute('href')).toBe('/original');
  });

  it('restores original text content', () => {
    const el = createAnchorElement('Original');
    const lnk = new ArvoButtonLink(el, { href: '/', label: 'Changed' });
    lnk.destroy();
    expect(el.textContent).toBe('Original');
  });

  it('removes click event listener', () => {
    const onClick = vi.fn();
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/', onClick });
    lnk.destroy();
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createAnchorElement();
    const lnk = new ArvoButtonLink(el, { href: '/' });
    lnk.destroy();
    expect(() => lnk.destroy()).not.toThrow();
  });
});
