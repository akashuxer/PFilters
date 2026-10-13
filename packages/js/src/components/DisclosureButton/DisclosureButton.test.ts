import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoDisclosureButton } from './DisclosureButton';

function createButtonElement(text = ''): HTMLButtonElement {
  const el = document.createElement('button');
  if (text) el.textContent = text;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('DisclosureButton - initialization', () => {
  it('static initialize() returns an instance', () => {
    const el = createButtonElement();
    const disc = ArvoDisclosureButton.initialize(el, { label: 'Show more' });
    expect(disc).toBeInstanceOf(ArvoDisclosureButton);
  });

  it('constructor returns an instance', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    expect(disc).toBeInstanceOf(ArvoDisclosureButton);
  });

  it('adds the arvo-disc-btn base class and md size class by default', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    expect(el.classList.contains('arvo-disc-btn')).toBe(true);
    expect(el.classList.contains('arvo-disc-btn--md')).toBe(true);
  });

  it('adds the specified size class', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more', size: 'sm' });
    expect(el.classList.contains('arvo-disc-btn--sm')).toBe(true);
  });

  it('falls back to md for an invalid size', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more', size: 'xl' as never });
    expect(el.classList.contains('arvo-disc-btn--md')).toBe(true);
  });

  it('forces type="button" on the element', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    expect(el.getAttribute('type')).toBe('button');
  });

  it('creates the label span with the provided text', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    const lbl = el.querySelector('.arvo-disc-btn__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl!.textContent).toBe('Show more');
  });

  it('falls back to the existing element text content when no label is provided', () => {
    const el = createButtonElement('Existing');
    new ArvoDisclosureButton(el);
    expect(el.querySelector('.arvo-disc-btn__lbl')!.textContent).toBe('Existing');
  });
});

// ---------------------------------------------------------------------------
// Chevron rendering
// ---------------------------------------------------------------------------
describe('DisclosureButton - chevron', () => {
  it('renders the chevron with angle-down by default (collapsed)', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    const chev = el.querySelector('.arvo-disc-btn__chev');
    expect(chev).not.toBeNull();
    expect(chev!.classList.contains('o9con')).toBe(true);
    expect(chev!.classList.contains('o9con-angle-down')).toBe(true);
    expect(chev!.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the angle-down glyph when initial isExpanded is true (CSS rotates it)', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show less', isExpanded: true });
    const chev = el.querySelector('.arvo-disc-btn__chev');
    expect(chev).not.toBeNull();
    expect(chev!.classList.contains('o9con-angle-down')).toBe(true);
    expect(chev!.classList.contains('o9con-angle-up')).toBe(false);
  });

  it('omits the chevron when hasChevron is false', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: '+4 more', hasChevron: false });
    expect(el.querySelector('.arvo-disc-btn__chev')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ARIA attributes
// ---------------------------------------------------------------------------
describe('DisclosureButton - ARIA attributes', () => {
  it('sets aria-expanded="false" by default', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets aria-expanded="true" when initial isExpanded is true', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show less', isExpanded: true });
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('applies aria-controls when provided', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more', ariaControls: 'region-1' });
    expect(el.getAttribute('aria-controls')).toBe('region-1');
  });

  it('applies aria-label when provided', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, {
      label: '+4 more',
      hasChevron: false,
      ariaLabel: 'Show 4 more selected items',
    });
    expect(el.getAttribute('aria-label')).toBe('Show 4 more selected items');
  });
});

// ---------------------------------------------------------------------------
// Click + state mutation
// ---------------------------------------------------------------------------
describe('DisclosureButton - click toggling', () => {
  it('flips aria-expanded on click; chevron glyph stays angle-down (CSS rotation)', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    el.click();
    expect(el.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.arvo-disc-btn__chev')!.classList.contains('o9con-angle-down')).toBe(true);

    el.click();
    expect(el.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.arvo-disc-btn__chev')!.classList.contains('o9con-angle-down')).toBe(true);
  });

  it('invokes onExpandedChange with the next value on click', () => {
    const el = createButtonElement();
    const onExpandedChange = vi.fn();
    new ArvoDisclosureButton(el, { label: 'Show more', onExpandedChange });
    el.click();
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    el.click();
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('fires a disc-btn:toggle CustomEvent with detail.isExpanded on click', () => {
    const el = createButtonElement();
    new ArvoDisclosureButton(el, { label: 'Show more' });
    const handler = vi.fn();
    el.addEventListener('disc-btn:toggle', handler as EventListener);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as CustomEvent<{ isExpanded: boolean }>;
    expect(evt.detail.isExpanded).toBe(true);
    expect(evt.bubbles).toBe(true);
    expect(evt.cancelable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// expanded() getter/setter
// ---------------------------------------------------------------------------
describe('DisclosureButton - expanded() method', () => {
  it('returns the current state when called without an argument', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more', isExpanded: true });
    expect(disc.expanded()).toBe(true);
  });

  it('updates the state when called with a boolean', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    disc.expanded(true);
    expect(disc.expanded()).toBe(true);
    expect(el.getAttribute('aria-expanded')).toBe('true');
    // Glyph never swaps -- rotation handles the visual flip.
    expect(el.querySelector('.arvo-disc-btn__chev')!.classList.contains('o9con-angle-down')).toBe(true);
  });

  it('does not invoke onExpandedChange when programmatically set (not user-driven)', () => {
    const el = createButtonElement();
    const onExpandedChange = vi.fn();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more', onExpandedChange });
    disc.expanded(true);
    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it('still fires the disc-btn:toggle DOM event on programmatic set', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    const handler = vi.fn();
    el.addEventListener('disc-btn:toggle', handler as EventListener);
    disc.expanded(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when the requested state matches the current state', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    const handler = vi.fn();
    el.addEventListener('disc-btn:toggle', handler as EventListener);
    disc.expanded(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// toggle() method
// ---------------------------------------------------------------------------
describe('DisclosureButton - toggle() method', () => {
  it('flips state when called without an argument', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    disc.toggle();
    expect(disc.expanded()).toBe(true);
    disc.toggle();
    expect(disc.expanded()).toBe(false);
  });

  it('forces state when called with a boolean', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more', isExpanded: true });
    disc.toggle(true);
    expect(disc.expanded()).toBe(true);
    disc.toggle(false);
    expect(disc.expanded()).toBe(false);
  });

  it('fires disc-btn:toggle but not onExpandedChange', () => {
    const el = createButtonElement();
    const onExpandedChange = vi.fn();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more', onExpandedChange });
    const handler = vi.fn();
    el.addEventListener('disc-btn:toggle', handler as EventListener);
    disc.toggle();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setLabel() method
// ---------------------------------------------------------------------------
describe('DisclosureButton - setLabel()', () => {
  it('updates the visible label text', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    disc.setLabel('Show less');
    expect(el.querySelector('.arvo-disc-btn__lbl')!.textContent).toBe('Show less');
  });
});

// ---------------------------------------------------------------------------
// focus() method
// ---------------------------------------------------------------------------
describe('DisclosureButton - focus()', () => {
  it('focuses the button element', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    disc.focus();
    expect(document.activeElement).toBe(el);
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------
describe('DisclosureButton - destroy()', () => {
  it('removes the BEM classes and ARIA attributes added during initialize', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, {
      label: 'Show more',
      ariaControls: 'region-1',
      ariaLabel: 'Show details',
    });
    disc.destroy();
    expect(el.classList.contains('arvo-disc-btn')).toBe(false);
    expect(el.classList.contains('arvo-disc-btn--md')).toBe(false);
    expect(el.getAttribute('aria-expanded')).toBeNull();
    expect(el.getAttribute('aria-controls')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('removes the label and chevron child nodes', () => {
    const el = createButtonElement();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    disc.destroy();
    expect(el.querySelector('.arvo-disc-btn__lbl')).toBeNull();
    expect(el.querySelector('.arvo-disc-btn__chev')).toBeNull();
  });

  it('unbinds the click listener', () => {
    const el = createButtonElement();
    const onExpandedChange = vi.fn();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more', onExpandedChange });
    disc.destroy();
    el.click();
    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it('restores the original type attribute when none was present', () => {
    const el = createButtonElement();
    expect(el.getAttribute('type')).toBeNull();
    const disc = new ArvoDisclosureButton(el, { label: 'Show more' });
    expect(el.getAttribute('type')).toBe('button');
    disc.destroy();
    expect(el.getAttribute('type')).toBeNull();
  });
});
