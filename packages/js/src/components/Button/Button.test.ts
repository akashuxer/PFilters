import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { tooltipManager } from '@arvo/core';
import {
  ArvoButton,
  resolveButtonBadge,
  resolveButtonStatus,
  type ArvoButtonBadgeConfig,
  type ArvoButtonStatusConfig,
} from './Button';
import { ArvoTooltip } from '../Tooltip/Tooltip';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
describe('Button - initialization', () => {
  it('static initialize() returns a Button instance', () => {
    const el = createButtonElement();
    const btn = ArvoButton.initialize(el);
    expect(btn).toBeInstanceOf(ArvoButton);
  });

  it('constructor returns a Button instance', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    expect(btn).toBeInstanceOf(ArvoButton);
  });

  it('adds arvo-btn base class to the element', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.classList.contains('arvo-btn')).toBe(true);
  });

  it('adds default primary variant class', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
  });

  it('adds the specified variant class', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'secondary' });
    expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
  });

  it('adds default md size class', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
  });

  it('adds the specified size class', () => {
    const el = createButtonElement();
    new ArvoButton(el, { size: 'lg' });
    expect(el.classList.contains('arvo-btn--lg')).toBe(true);
  });

  it('sets type attribute to "button" by default', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.getAttribute('type')).toBe('button');
  });

  it('sets the specified type attribute', () => {
    const el = createButtonElement();
    new ArvoButton(el, { type: 'submit' });
    expect(el.getAttribute('type')).toBe('submit');
  });

  it('creates label span with the provided label text', () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Click me' });
    const lbl = el.querySelector('.arvo-btn__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl!.textContent).toBe('Click me');
  });

  it('falls back to existing element text content for label', () => {
    const el = createButtonElement('Existing Text');
    new ArvoButton(el);
    const lbl = el.querySelector('.arvo-btn__lbl');
    expect(lbl!.textContent).toBe('Existing Text');
  });

  it('adds arvo-btn--full-width when fullWidth option is true', () => {
    const el = createButtonElement();
    new ArvoButton(el, { isFullWidth: true });
    expect(el.classList.contains('arvo-btn--full-width')).toBe(true);
  });

  it('does not add arvo-btn--full-width by default', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.classList.contains('arvo-btn--full-width')).toBe(false);
  });

  it('falls back to primary for an invalid variant', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'invalid' as never });
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    expect(el.classList.contains('arvo-btn--invalid')).toBe(false);
  });

  it('falls back to md for an invalid size', () => {
    const el = createButtonElement();
    new ArvoButton(el, { size: 'xl' as never });
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
    expect(el.classList.contains('arvo-btn--xl')).toBe(false);
  });

});

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------
describe('Button - icon management', () => {
  it('creates icon element when icon option is provided', () => {
    const el = createButtonElement();
    new ArvoButton(el, { icon: 'save' });
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-save')).toBe(true);
  });

  it('icon span has aria-hidden="true"', () => {
    const el = createButtonElement();
    new ArvoButton(el, { icon: 'save' });
    expect(el.querySelector('.arvo-btn__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not create icon element when icon is omitted', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.querySelector('.arvo-btn__ico')).toBeNull();
  });

  it('setIcon creates icon element when none exists', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.setIcon('edit');
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
  });

  it('setIcon swaps icon class when icon already exists', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { icon: 'save' });
    btn.setIcon('edit');
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
    expect(ico!.classList.contains('o9con-save')).toBe(false);
  });

  it('setIcon(null) removes the icon element', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { icon: 'save' });
    btn.setIcon(null);
    expect(el.querySelector('.arvo-btn__ico')).toBeNull();
  });

  it('setIcon(null) is a no-op when no icon exists', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    expect(() => btn.setIcon(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Label management
// ---------------------------------------------------------------------------
describe('Button - label management', () => {
  it('setLabel updates the label text', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Save' });
    btn.setLabel('Update');
    expect(el.querySelector('.arvo-btn__lbl')!.textContent).toBe('Update');
  });

  it('setLabel creates a label element if one is missing', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Save' });
    el.querySelector('.arvo-btn__lbl')?.remove();
    (btn as unknown as { _labelEl: null })._labelEl = null;
    btn.setLabel('New Label');
    expect(el.querySelector('.arvo-btn__lbl')!.textContent).toBe('New Label');
  });
});

// ---------------------------------------------------------------------------
// Variant management
// ---------------------------------------------------------------------------
describe('Button - variant management', () => {
  it('setVariant removes old variant class and adds new one', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { variant: 'primary' });
    btn.setVariant('secondary');
    expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
    expect(el.classList.contains('arvo-btn--primary')).toBe(false);
  });

  it('setVariant does nothing for an invalid variant', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { variant: 'primary' });
    btn.setVariant('invalid');
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    expect(el.classList.contains('arvo-btn--invalid')).toBe(false);
  });

  it('never has two variant classes simultaneously', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { variant: 'danger' });
    btn.setVariant('outline');
    const variantClasses = ArvoButton.VARIANTS.filter(v => el.classList.contains(`arvo-btn--${v}`));
    expect(variantClasses.length).toBe(1);
    expect(variantClasses[0]).toBe('outline');
  });

  it('supports all valid variants via setVariant', () => {
    ArvoButton.VARIANTS.forEach(v => {
      const el = createButtonElement();
      const btn = new ArvoButton(el);
      btn.setVariant(v);
      expect(el.classList.contains(`arvo-btn--${v}`)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Danger / nova / inline variants.
  // `danger` is kept as a back-compat alias of `danger-primary`; both
  // are accepted at construction time and through `setVariant`. `inline`
  // is Button-only (the JS IconButton variant union omits it).
  // ---------------------------------------------------------------------
  it('accepts danger-primary at construction', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'danger-primary' });
    expect(el.classList.contains('arvo-btn--danger-primary')).toBe(true);
  });

  it('accepts the danger back-compat alias at construction', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'danger' });
    expect(el.classList.contains('arvo-btn--danger')).toBe(true);
  });

  it('accepts danger-tertiary at construction', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'danger-tertiary' });
    expect(el.classList.contains('arvo-btn--danger-tertiary')).toBe(true);
  });

  it('accepts danger-outline at construction', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'danger-outline' });
    expect(el.classList.contains('arvo-btn--danger-outline')).toBe(true);
  });

  it('accepts nova-primary at construction', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'nova-primary' });
    expect(el.classList.contains('arvo-btn--nova-primary')).toBe(true);
  });

  it('accepts inline at construction', () => {
    const el = createButtonElement();
    new ArvoButton(el, { variant: 'inline' });
    expect(el.classList.contains('arvo-btn--inline')).toBe(true);
  });

  it('inline variant works with each size modifier', () => {
    (['sm', 'md', 'lg'] as const).forEach(size => {
      const el = createButtonElement();
      new ArvoButton(el, { variant: 'inline', size });
      expect(el.classList.contains('arvo-btn--inline')).toBe(true);
      expect(el.classList.contains(`arvo-btn--${size}`)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Size management
// ---------------------------------------------------------------------------
describe('Button - size management', () => {
  it('setSize removes old size class and adds new one', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { size: 'md' });
    btn.setSize('lg');
    expect(el.classList.contains('arvo-btn--lg')).toBe(true);
    expect(el.classList.contains('arvo-btn--md')).toBe(false);
  });

  it('setSize does nothing for an invalid size', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { size: 'md' });
    btn.setSize('xl');
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
    expect(el.classList.contains('arvo-btn--xl')).toBe(false);
  });

  it('never has two size classes simultaneously', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { size: 'sm' });
    btn.setSize('lg');
    const sizeClasses = ArvoButton.SIZES.filter(s => el.classList.contains(`arvo-btn--${s}`));
    expect(sizeClasses.length).toBe(1);
    expect(sizeClasses[0]).toBe('lg');
  });

  it('supports all valid sizes via setSize', () => {
    ArvoButton.SIZES.forEach(s => {
      const el = createButtonElement();
      const btn = new ArvoButton(el);
      btn.setSize(s);
      expect(el.classList.contains(`arvo-btn--${s}`)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('Button - loading state', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isLoading: true });
    btn.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isLoading: true });
    btn.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('click is suppressed during loading', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoButton(el, { isLoading: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('dispatches btn:loading event with correct detail on setLoading(true)', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    const handler = vi.fn();
    el.addEventListener('btn:loading', handler);
    btn.setLoading(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ isLoading: true });
  });

  it('dispatches btn:loading event with correct detail on setLoading(false)', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isLoading: true });
    const handler = vi.fn();
    el.addEventListener('btn:loading', handler);
    btn.setLoading(false);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ isLoading: false });
  });

  it('btn:loading event bubbles', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    const handler = vi.fn();
    document.body.addEventListener('btn:loading', handler);
    btn.setLoading(true);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('btn:loading', handler);
  });
});

// ---------------------------------------------------------------------------
// Selected state
// ---------------------------------------------------------------------------
describe('Button - selected state', () => {
  it('selected(true) adds active class', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.selected(true);
    expect(el.classList.contains('active')).toBe(true);
  });

  it('selected(true) sets aria-pressed="true"', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.selected(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('selected(false) removes active class', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isSelected: true });
    btn.selected(false);
    expect(el.classList.contains('active')).toBe(false);
  });

  it('selected(false) sets aria-pressed="false"', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isSelected: true });
    btn.selected(false);
    expect(el.getAttribute('aria-pressed')).toBe('false');
  });

  it('selected() returns true when selected', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isSelected: true });
    expect(btn.selected()).toBe(true);
  });

  it('selected() returns false when not selected', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    expect(btn.selected()).toBe(false);
  });

  it('initialization with selected=true applies active class and aria-pressed', () => {
    const el = createButtonElement();
    new ArvoButton(el, { isSelected: true });
    expect(el.classList.contains('active')).toBe(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not set aria-pressed when selected is not provided', () => {
    const el = createButtonElement();
    new ArvoButton(el);
    expect(el.getAttribute('aria-pressed')).toBeNull();
  });

  it('sets aria-pressed="false" when selected is explicitly false', () => {
    const el = createButtonElement();
    new ArvoButton(el, { isSelected: false });
    expect(el.getAttribute('aria-pressed')).toBe('false');
    expect(el.classList.contains('active')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('Button - disabled state', () => {
  it('disabled(true) sets element.disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.disabled(true);
    expect(el.disabled).toBe(true);
  });

  it('disabled(true) dispatches btn:disabled with detail { disabled: true }', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    const handler = vi.fn();
    el.addEventListener('btn:disabled', handler);
    btn.disabled(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ isDisabled: true });
  });

  it('disabled(false) clears element.disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isDisabled: true });
    btn.disabled(false);
    expect(el.disabled).toBe(false);
  });

  it('disabled(false) dispatches btn:disabled with detail { disabled: false }', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isDisabled: true });
    const handler = vi.fn();
    el.addEventListener('btn:disabled', handler);
    btn.disabled(false);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ isDisabled: false });
  });

  it('disabled() returns true when disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isDisabled: true });
    expect(btn.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    expect(btn.disabled()).toBe(false);
  });

  it('click is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoButton(el, { isDisabled: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('btn:disabled event bubbles', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    const handler = vi.fn();
    document.body.addEventListener('btn:disabled', handler);
    btn.disabled(true);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('btn:disabled', handler);
  });

  it('initialization with disabled=true sets element.disabled', () => {
    const el = createButtonElement();
    new ArvoButton(el, { isDisabled: true });
    expect(el.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------
describe('Button - focus', () => {
  it('focus() calls element.focus()', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    const spy = vi.spyOn(el, 'focus');
    btn.focus();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('focus() does NOT call element.focus() when loading', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isLoading: true });
    const spy = vi.spyOn(el, 'focus');
    btn.focus();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('Button - destroy', () => {
  it('removes arvo-btn base class', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.destroy();
    expect(el.classList.contains('arvo-btn')).toBe(false);
  });

  it('removes all variant classes', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { variant: 'danger' });
    btn.destroy();
    ArvoButton.VARIANTS.forEach(v => {
      expect(el.classList.contains(`arvo-btn--${v}`)).toBe(false);
    });
  });

  it('removes all size classes', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { size: 'sm' });
    btn.destroy();
    ArvoButton.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-btn--${s}`)).toBe(false);
    });
  });

  it('removes aria-pressed attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isSelected: true });
    btn.destroy();
    expect(el.getAttribute('aria-pressed')).toBeNull();
  });

  it('removes aria-busy attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isLoading: true });
    btn.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('clears disabled state', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { isDisabled: true });
    btn.destroy();
    expect(el.disabled).toBe(false);
  });

  it('restores original text content', () => {
    const el = createButtonElement('Original');
    const btn = new ArvoButton(el, { label: 'Changed' });
    btn.destroy();
    expect(el.textContent).toBe('Original');
  });

  it('removes label element from the DOM', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Save' });
    btn.destroy();
    expect(el.querySelector('.arvo-btn__lbl')).toBeNull();
  });

  it('removes icon element from the DOM', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { icon: 'save' });
    btn.destroy();
    expect(el.querySelector('.arvo-btn__ico')).toBeNull();
  });

  it('removes click event listener (onClick not called after destroy)', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    const btn = new ArvoButton(el, { onClick });
    btn.destroy();
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    btn.destroy();
    expect(() => btn.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('Button - custom events', () => {
  it('btn:loading event has bubbles=true', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    let capturedEvent: CustomEvent | null = null;
    document.body.addEventListener('btn:loading', (e) => { capturedEvent = e as CustomEvent; });
    btn.setLoading(true);
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.bubbles).toBe(true);
    document.body.removeEventListener('btn:loading', () => {});
  });

  it('btn:disabled event has bubbles=true', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el);
    let capturedEvent: CustomEvent | null = null;
    document.body.addEventListener('btn:disabled', (e) => { capturedEvent = e as CustomEvent; });
    btn.disabled(true);
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.bubbles).toBe(true);
    document.body.removeEventListener('btn:disabled', () => {});
  });

  it('onClick callback option is called when button is clicked', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoButton(el, { onClick });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('onClick receives the click Event object', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoButton(el, { onClick });
    el.click();
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(Event);
  });
});

// ---------------------------------------------------------------------------
// Badge slot resolver
// ---------------------------------------------------------------------------

describe('ArvoButton - resolveButtonBadge', () => {
  it('defaults placement to inline when omitted', () => {
    expect(resolveButtonBadge({}).placement).toBe('inline');
  });

  it('inline: fixes size=sm, appearance=primary, colorMode=semantic, semanticType=neutral, hasBadgeIcon=false', () => {
    const r = resolveButtonBadge({ placement: 'inline' });
    expect(r.size).toBe('sm');
    expect(r.appearance).toBe('primary');
    expect(r.colorMode).toBe('semantic');
    expect(r.semanticType).toBe('neutral');
    expect(r.hasBadgeIcon).toBe(false);
  });

  it('inline: ignores consumer semanticType (locks to neutral)', () => {
    expect(
      resolveButtonBadge({ placement: 'inline', semanticType: 'negative' }).semanticType,
    ).toBe('neutral');
  });

  it('top-right: fixes appearance=filled, variant=counter, counterMode=single', () => {
    const r = resolveButtonBadge({ placement: 'top-right' });
    expect(r.appearance).toBe('filled');
    expect(r.variant).toBe('counter');
    expect(r.counterMode).toBe('single');
  });

  it('positioned: honors consumer semanticType override', () => {
    expect(
      resolveButtonBadge({ placement: 'top-right', semanticType: 'negative' }).semanticType,
    ).toBe('negative');
  });

  it('positioned: forces counterMode=single even if consumer requests ratio', () => {
    expect(
      resolveButtonBadge({ placement: 'top-right', counterMode: 'ratio' as never }).counterMode,
    ).toBe('single');
  });
});

describe('ArvoButton - resolveButtonStatus', () => {
  it('derives size from button size for each of sm / md / lg', () => {
    expect(resolveButtonStatus({ type: 'available' }, 'sm').size).toBe('sm');
    expect(resolveButtonStatus({ type: 'available' }, 'md').size).toBe('md');
    expect(resolveButtonStatus({ type: 'available' }, 'lg').size).toBe('lg');
  });

  it('defaults placement to top-right when omitted', () => {
    expect(resolveButtonStatus({ type: 'available' }, 'md').placement).toBe('top-right');
  });

  it('honors top-right and bottom-right placement', () => {
    expect(
      resolveButtonStatus({ type: 'available', placement: 'bottom-right' }, 'md').placement,
    ).toBe('bottom-right');
  });
});

// ---------------------------------------------------------------------------
// Badge slot rendering
// ---------------------------------------------------------------------------

describe('ArvoButton - badge slot rendering', () => {
  it('renders no badge when option is omitted', () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Save' });
    expect(el.querySelector('.arvo-bdg')).toBeNull();
  });

  it('renders an inline badge with the correct classes', () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'Save',
      badge: { placement: 'inline', message: 'NEW' },
    });
    const bdg = el.querySelector('.arvo-bdg');
    expect(bdg).not.toBeNull();
    expect(bdg!.classList.contains('arvo-bdg--inline')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--sm')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--primary')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--neutral')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--label')).toBe(true);
    expect(el.querySelector('.arvo-bdg__msg')?.textContent).toBe('NEW');
  });

  it('renders a positioned top-right counter badge', () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'Alerts',
      badge: { placement: 'top-right', count: 5, semanticType: 'negative' },
    });
    const bdg = el.querySelector('.arvo-bdg');
    expect(bdg!.classList.contains('arvo-bdg--top-right')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--filled')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--negative')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--counter')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--single')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--sm')).toBe(true);
  });

  it('setBadge(config) renders / re-renders the badge', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Save' });
    expect(el.querySelector('.arvo-bdg')).toBeNull();
    btn.setBadge({ placement: 'top-right', count: 1 });
    expect(el.querySelector('.arvo-bdg.arvo-bdg--top-right')).not.toBeNull();
    btn.setBadge({ placement: 'inline', count: 5 });
    expect(el.querySelector('.arvo-bdg.arvo-bdg--inline')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg.arvo-bdg--top-right')).toBeNull();
  });

  it('setBadge(null) removes the badge', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, {
      label: 'Save',
      badge: { placement: 'top-right', count: 1 },
    });
    btn.setBadge(null);
    expect(el.querySelector('.arvo-bdg')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Status slot rendering
// ---------------------------------------------------------------------------

describe('ArvoButton - status slot rendering', () => {
  it('renders no status when option is omitted', () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Save' });
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('renders an overlay status with default top-right placement', () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Profile', status: { type: 'available' } });
    const sts = el.querySelector('.arvo-sts');
    expect(sts).not.toBeNull();
    expect(sts!.classList.contains('arvo-sts--top-right')).toBe(true);
    expect(sts!.classList.contains('arvo-sts--available')).toBe(true);
  });

  it.each(['sm', 'md', 'lg'] as const)(
    'derives status size %s from the button size',
    (size) => {
      const el = createButtonElement();
      new ArvoButton(el, { label: 'Profile', size, status: { type: 'available' } });
      expect(el.querySelector('.arvo-sts')!.classList.contains(`arvo-sts--${size}`)).toBe(true);
    },
  );

  it('setSize re-applies the derived size on the embedded status', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, {
      label: 'Profile',
      size: 'sm',
      status: { type: 'available' },
    });
    btn.setSize('lg');
    expect(el.querySelector('.arvo-sts')!.classList.contains('arvo-sts--lg')).toBe(true);
    expect(el.querySelector('.arvo-sts')!.classList.contains('arvo-sts--sm')).toBe(false);
  });

  it('setStatus(config) renders / re-renders the status', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Profile' });
    btn.setStatus({ type: 'available' });
    expect(el.querySelector('.arvo-sts.arvo-sts--available')).not.toBeNull();
    btn.setStatus({ type: 'busy', placement: 'bottom-right' });
    expect(el.querySelector('.arvo-sts.arvo-sts--busy.arvo-sts--bottom-right')).not.toBeNull();
  });

  it('setStatus(null) removes the status', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Profile', status: { type: 'available' } });
    btn.setStatus(null);
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Combined badge + status slot
// ---------------------------------------------------------------------------

describe('ArvoButton - combined badge + status slot', () => {
  it('renders both slots in the same button without DOM interference', () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'Inbox',
      badge: { placement: 'top-right', count: 5, semanticType: 'negative' },
      status: { type: 'available', placement: 'bottom-right' },
    });
    expect(el.querySelector('.arvo-bdg.arvo-bdg--top-right')).not.toBeNull();
    expect(el.querySelector('.arvo-sts.arvo-sts--bottom-right')).not.toBeNull();
  });

  it('destroy() tears down both slot instances and clears their DOM', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, {
      label: 'Inbox',
      badge: { placement: 'top-right', count: 5 },
      status: { type: 'available' },
    });
    btn.destroy();
    expect(el.querySelector('.arvo-bdg')).toBeNull();
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tertiary inner-anchor
//
// On the tertiary variant the host has no background and no border -- the
// perceived surface IS the inner label text. The DOM shape is invariant
// across variants: the resolved badge / status slot is ALWAYS a direct
// child of the <button> root (so the label keeps its `overflow: hidden`
// for ellipsis truncation untouched). The SCSS layer shifts the
// half-overhang overlay offsets INWARD by the per-size button padding so
// the overlay anchors at the inner-content corner instead of the empty
// button edge. These tests lock the invariant DOM shape; the visual
// offset itself is asserted in the stylesheet (and visually in the
// playground -- jsdom does not apply CSS).
// ---------------------------------------------------------------------------

describe('ArvoButton - tertiary inner-anchor', () => {
  it.each([
    ['primary', 'top-right'],
    ['secondary', 'top-right'],
    ['tertiary', 'top-right'],
    ['outline', 'top-right'],
    ['danger', 'top-right'],
  ] as const)(
    'positioned badge (%s + %s) is a direct child of the button root, NOT nested inside .arvo-btn__lbl',
    (variant, placement) => {
      const el = createButtonElement();
      new ArvoButton(el, {
        label: 'Alerts',
        variant,
        badge: { placement, count: 5 },
      });
      const bdg = el.querySelector(`.arvo-bdg.arvo-bdg--${placement}`)!;
      const lbl = el.querySelector('.arvo-btn__lbl')!;
      expect(lbl.contains(bdg)).toBe(false);
      expect(bdg.parentElement).toBe(el);
    },
  );

  it.each([
    ['primary', 'top-right'],
    ['secondary', 'top-right'],
    ['tertiary', 'top-right'],
    ['outline', 'top-right'],
    ['danger', 'top-right'],
    ['primary', 'bottom-right'],
    ['secondary', 'bottom-right'],
    ['tertiary', 'bottom-right'],
    ['outline', 'bottom-right'],
    ['danger', 'bottom-right'],
  ] as const)(
    'positioned status (%s + %s) is a direct child of the button root, NOT nested inside .arvo-btn__lbl',
    (variant, placement) => {
      const el = createButtonElement();
      new ArvoButton(el, {
        label: 'Profile',
        variant,
        status: { type: 'available', placement },
      });
      const sts = el.querySelector(`.arvo-sts.arvo-sts--${placement}`)!;
      const lbl = el.querySelector('.arvo-btn__lbl')!;
      expect(lbl.contains(sts)).toBe(false);
      expect(sts.parentElement).toBe(el);
    },
  );

  it('tertiary + INLINE badge: inline badge is a sibling of .arvo-btn__lbl, NOT a descendant', () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'Save',
      variant: 'tertiary',
      badge: { placement: 'inline', message: 'NEW' },
    });
    const lbl = el.querySelector('.arvo-btn__lbl')!;
    const inlineBdg = el.querySelector('.arvo-bdg.arvo-bdg--inline')!;
    expect(lbl.contains(inlineBdg)).toBe(false);
    expect(inlineBdg.parentElement).toBe(el);
  });

  it('tertiary + both slots: badge AND status are direct children of the button root', () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'Inbox',
      variant: 'tertiary',
      badge: { placement: 'top-right', count: 5, semanticType: 'negative' },
      status: { type: 'available', placement: 'bottom-right' },
    });
    const bdg = el.querySelector('.arvo-bdg.arvo-bdg--top-right')!;
    const sts = el.querySelector('.arvo-sts.arvo-sts--bottom-right')!;
    expect(bdg.parentElement).toBe(el);
    expect(sts.parentElement).toBe(el);
    const lbl = el.querySelector('.arvo-btn__lbl')!;
    expect(lbl.contains(bdg)).toBe(false);
    expect(lbl.contains(sts)).toBe(false);
  });

  it('setVariant across the tertiary boundary leaves the positioned slot node in place (no DOM thrash, no re-creation)', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, {
      label: 'Alerts',
      variant: 'primary',
      badge: { placement: 'top-right', count: 5 },
    });
    const before = el.querySelector('.arvo-bdg')!;
    expect(before.parentElement).toBe(el);
    btn.setVariant('tertiary');
    const afterToTertiary = el.querySelector('.arvo-bdg')!;
    expect(afterToTertiary).toBe(before);
    expect(afterToTertiary.parentElement).toBe(el);
    btn.setVariant('secondary');
    const afterBackToNonTertiary = el.querySelector('.arvo-bdg')!;
    expect(afterBackToNonTertiary).toBe(before);
    expect(afterBackToNonTertiary.parentElement).toBe(el);
  });

  it('setVariant from tertiary -> tertiary leaves the positioned status node identity stable', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, {
      label: 'Profile',
      variant: 'tertiary',
      status: { type: 'available' },
    });
    const before = el.querySelector('.arvo-sts');
    btn.setVariant('tertiary');
    const after = el.querySelector('.arvo-sts');
    expect(after).toBe(before);
  });

  it('setBadge on a tertiary host mounts the new positioned badge on the button root', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Alerts', variant: 'tertiary' });
    expect(el.querySelector('.arvo-bdg')).toBeNull();
    btn.setBadge({ placement: 'top-right', count: 9 });
    const bdg = el.querySelector('.arvo-bdg.arvo-bdg--top-right')!;
    const lbl = el.querySelector('.arvo-btn__lbl')!;
    expect(bdg.parentElement).toBe(el);
    expect(lbl.contains(bdg)).toBe(false);
  });

  it('setStatus on a tertiary host mounts the new status on the button root', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Profile', variant: 'tertiary' });
    btn.setStatus({ type: 'busy', placement: 'bottom-right' });
    const sts = el.querySelector('.arvo-sts.arvo-sts--busy.arvo-sts--bottom-right')!;
    const lbl = el.querySelector('.arvo-btn__lbl')!;
    expect(sts.parentElement).toBe(el);
    expect(lbl.contains(sts)).toBe(false);
  });

  it('label keeps overflow-driving structure on tertiary so text truncation is preserved', () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'A very long label',
      variant: 'tertiary',
      badge: { placement: 'top-right', count: 5 },
    });
    // The `.arvo-btn__lbl` span remains a leaf text container -- no new
    // wrapper or slot DOM was added beneath it, so the existing SCSS rule
    // that sets `overflow: hidden; white-space: nowrap; text-overflow:
    // ellipsis` on `.arvo-btn__lbl` continues to apply unchanged.
    const lbl = el.querySelector('.arvo-btn__lbl')!;
    expect(lbl).not.toBeNull();
    expect(lbl.textContent).toBe('A very long label');
    expect(lbl.children.length).toBe(0);
  });

  it('destroy() on a tertiary host with positioned slots cleans up cleanly', () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, {
      label: 'Inbox',
      variant: 'tertiary',
      badge: { placement: 'top-right', count: 5 },
      status: { type: 'available', placement: 'bottom-right' },
    });
    expect(() => btn.destroy()).not.toThrow();
    expect(el.querySelector('.arvo-bdg')).toBeNull();
    expect(el.querySelector('.arvo-sts')).toBeNull();
    expect(el.querySelector('.arvo-btn__lbl')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slot-config type narrowing (compile-time checks)
// ---------------------------------------------------------------------------

describe('ArvoButton - slot config type narrowing', () => {
  it('ArvoButtonBadgeConfig rejects size / appearance / colorMode / icon / tooltip', () => {
    const _noSize: ArvoButtonBadgeConfig = {
      // @ts-expect-error -- size is fixed; not exposed on the Button slot
      size: 'md',
    };
    const _noAppearance: ArvoButtonBadgeConfig = {
      // @ts-expect-error -- appearance is fixed; not exposed
      appearance: 'outline',
    };
    const _noColorMode: ArvoButtonBadgeConfig = {
      // @ts-expect-error -- colorMode is fixed to semantic; not exposed
      colorMode: 'custom',
    };
    const _noIcon: ArvoButtonBadgeConfig = {
      // @ts-expect-error -- icon is excluded
      icon: 'star',
    };
    const _noTooltip: ArvoButtonBadgeConfig = {
      // @ts-expect-error -- tooltip is excluded
      tooltip: 'A badge',
    };
    void _noSize;
    void _noAppearance;
    void _noColorMode;
    void _noIcon;
    void _noTooltip;
    expect(true).toBe(true);
  });

  it('ArvoButtonStatusConfig rejects size / tooltip / inline-placement', () => {
    const _noSize: ArvoButtonStatusConfig = {
      type: 'available',
      // @ts-expect-error -- size is derived from the button; not exposed
      size: 'sm',
    };
    const _noTooltip: ArvoButtonStatusConfig = {
      type: 'available',
      // @ts-expect-error -- tooltip is excluded
      tooltip: 'Online',
    };
    const _noInline: ArvoButtonStatusConfig = {
      type: 'available',
      // @ts-expect-error -- inline placement is not a Button surface
      placement: 'inline',
    };
    void _noSize;
    void _noTooltip;
    void _noInline;
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Truncation tooltip
//
// Mirrors the React truncation-tooltip suite. The internal tooltip is a
// recovery affordance: it shows the full label via the shared tooltip
// primitive ONLY when the label is visually clipped at runtime AND no
// explicit `ArvoTooltip.initialize(buttonEl, ...)` is bound to the same
// button. The label dimensions are forced via `Object.defineProperty` so
// the connector's `isTruncated` check returns the desired branch.
// ---------------------------------------------------------------------------
describe('ArvoButton - truncation tooltip', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    // The shared singleton caches its tip element after the first
    // `ensureElement()`. Wiping the DOM between tests would orphan that
    // node; destroy + reconfigure resets the cache.
    tooltipManager.destroy();
    tooltipManager.configure({ enabled: true, hoverDelay: 0, hideDelay: 0 });
  });

  afterEach(() => {
    tooltipManager.destroy();
  });

  function forceTruncatedLabel(el: HTMLButtonElement): HTMLElement {
    const lbl = el.querySelector('.arvo-btn__lbl') as HTMLElement;
    Object.defineProperty(lbl, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(lbl, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(lbl, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(lbl, 'clientHeight', { value: 20, configurable: true });
    return lbl;
  }

  function forceFitLabel(el: HTMLButtonElement): HTMLElement {
    const lbl = el.querySelector('.arvo-btn__lbl') as HTMLElement;
    Object.defineProperty(lbl, 'scrollWidth', { value: 50, configurable: true });
    Object.defineProperty(lbl, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(lbl, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(lbl, 'clientHeight', { value: 20, configurable: true });
    return lbl;
  }

  async function flushTooltip(): Promise<void> {
    // hoverDelay/hideDelay are 0 in test setup, so a microtask flush is
    // enough for the manager's setTimeout(0) and any internal promises.
    await Promise.resolve();
    await Promise.resolve();
  }

  it('shows the full label on hover when the visible label is truncated (default on)', async () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'A very long button label that wraps' });
    forceTruncatedLabel(el);

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    expect(document.querySelector('.arvo-tip__txt')?.textContent).toBe(
      'A very long button label that wraps',
    );
  });

  it('does NOT show the tooltip when the label fits inside the button (default on)', async () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Save' });
    forceFitLabel(el);

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    expect(document.querySelector('.arvo-tip__txt')?.textContent ?? '').toBe('');
  });

  it('hasTruncationTooltip:false disables the recovery affordance', async () => {
    const el = createButtonElement();
    new ArvoButton(el, {
      label: 'A very long button label that wraps',
      hasTruncationTooltip: false,
    });
    forceTruncatedLabel(el);

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    expect(document.querySelector('.arvo-tip__txt')?.textContent ?? '').toBe('');
  });

  it('empty label does not wire a truncation tooltip', async () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: '' });
    // No `.arvo-btn__lbl` content; even forcing truncated metrics, the
    // attach guard requires non-empty label.
    forceTruncatedLabel(el);

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    expect(document.querySelector('.arvo-tip__txt')?.textContent ?? '').toBe('');
  });

  it('setLabel(newText) updates the tooltip content', async () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'Old very long label' });
    forceTruncatedLabel(el);

    btn.setLabel('Replacement very long label');
    forceTruncatedLabel(el);

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    expect(document.querySelector('.arvo-tip__txt')?.textContent).toBe(
      'Replacement very long label',
    );
  });

  it('setLabel("") tears down the truncation tooltip; non-empty re-creates it', async () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'A long label' });
    forceTruncatedLabel(el);

    btn.setLabel('');
    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();
    expect(document.querySelector('.arvo-tip__txt')?.textContent ?? '').toBe('');

    tooltipManager.hide(true);

    btn.setLabel('A long label again');
    forceTruncatedLabel(el);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();
    expect(document.querySelector('.arvo-tip__txt')?.textContent).toBe(
      'A long label again',
    );
  });

  it('destroy() tears down the truncation tooltip', async () => {
    const el = createButtonElement();
    const btn = new ArvoButton(el, { label: 'A long label' });
    forceTruncatedLabel(el);

    btn.destroy();
    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    // No tip should be rendered after destroy() because the connector is
    // unbound (and the manager was forced to hide(true) by destroy()).
    expect(document.querySelector('.arvo-tip__txt')?.textContent ?? '').toBe('');
  });

  it('does not set aria-describedby for the automatic truncation tooltip', async () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'A very long button label that wraps' });
    forceTruncatedLabel(el);

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    // Full label is already part of the accessible name; the truncation
    // tooltip MUST NOT add aria-describedby.
    expect(el.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('ArvoButton - truncation tooltip collision with ArvoTooltip', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    tooltipManager.destroy();
    tooltipManager.configure({ enabled: true, hoverDelay: 0, hideDelay: 0 });
  });

  afterEach(() => {
    tooltipManager.destroy();
  });

  function forceTruncatedLabel(el: HTMLButtonElement) {
    const lbl = el.querySelector('.arvo-btn__lbl') as HTMLElement;
    Object.defineProperty(lbl, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(lbl, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(lbl, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(lbl, 'clientHeight', { value: 20, configurable: true });
  }

  async function flushTooltip(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('explicit ArvoTooltip.initialize on the same button wins over the truncation tooltip', async () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Publish a really long article title now' });
    forceTruncatedLabel(el);
    const tip = ArvoTooltip.initialize(el, { content: 'Requires admin access' });

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();

    expect(document.querySelector('.arvo-tip__txt')?.textContent).toBe(
      'Requires admin access',
    );

    tip.destroy();
  });

  it('destroying the explicit tooltip resumes the internal truncation tooltip', async () => {
    const el = createButtonElement();
    new ArvoButton(el, { label: 'Publish a really long article title now' });
    forceTruncatedLabel(el);
    const tip = ArvoTooltip.initialize(el, { content: 'Requires admin access' });

    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();
    expect(document.querySelector('.arvo-tip__txt')?.textContent).toBe(
      'Requires admin access',
    );

    el.dispatchEvent(new MouseEvent('mouseleave'));
    tooltipManager.hide(true);
    tip.destroy();

    // After destroying the explicit owner the WeakMap marker is cleared
    // and the next hover lets the truncation connector show.
    forceTruncatedLabel(el);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    await flushTooltip();
    expect(document.querySelector('.arvo-tip__txt')?.textContent).toBe(
      'Publish a really long article title now',
    );
  });
});
