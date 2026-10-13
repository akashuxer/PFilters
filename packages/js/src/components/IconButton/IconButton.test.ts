import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ArvoIconButton,
  resolveIconButtonBadge,
  resolveIconButtonStatus,
  type ArvoIconButtonStatusConfig,
} from './IconButton';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createButtonElement(): HTMLButtonElement {
  const el = document.createElement('button');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('IconButton - initialization', () => {
  it('static initialize() returns an ArvoIconButton instance', () => {
    const el = createButtonElement();
    const btn = ArvoIconButton.initialize(el);
    expect(btn).toBeInstanceOf(ArvoIconButton);
  });

  it('constructor returns an ArvoIconButton instance', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    expect(btn).toBeInstanceOf(ArvoIconButton);
  });

  it('adds arvo-icon-btn base class to the element', () => {
    const el = createButtonElement();
    new ArvoIconButton(el);
    expect(el.classList.contains('arvo-icon-btn')).toBe(true);
  });

  it('adds default primary variant class', () => {
    const el = createButtonElement();
    new ArvoIconButton(el);
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
  });

  it('adds the specified variant class', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'secondary' });
    expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
  });

  it('adds default md size class', () => {
    const el = createButtonElement();
    new ArvoIconButton(el);
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
  });

  it('adds the specified size class', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { size: 'lg' });
    expect(el.classList.contains('arvo-btn--lg')).toBe(true);
  });

  it('adds xs size class (icon button exclusive)', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { size: 'xs' });
    expect(el.classList.contains('arvo-btn--xs')).toBe(true);
  });

  it('sets type attribute to "button" by default', () => {
    const el = createButtonElement();
    new ArvoIconButton(el);
    expect(el.getAttribute('type')).toBe('button');
  });

  it('sets the specified type attribute', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { type: 'submit' });
    expect(el.getAttribute('type')).toBe('submit');
  });

  it('creates icon element with provided icon', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'save' });
    expect(el.querySelector('.arvo-btn__ico')).not.toBeNull();
  });

  it('sets aria-label from tooltip option', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { tooltip: 'Save file' });
    expect(el.getAttribute('aria-label')).toBe('Save file');
  });

  // tooltip is managed by connectTooltip, not native title
  it.skip('sets title from tooltip option', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { tooltip: 'Save file' });
    expect(el.getAttribute('title')).toBe('Save file');
  });

  it('sets aria-label from tooltip option', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { tooltip: 'Delete item' });
    expect(el.getAttribute('aria-label')).toBe('Delete item');
    // tooltip is managed by connectTooltip, not native title
  });

  it('falls back to primary for an invalid variant', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'invalid' as never });
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    expect(el.classList.contains('arvo-btn--invalid')).toBe(false);
  });

  it('falls back to md for an invalid size', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { size: 'xl' as never });
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
    expect(el.classList.contains('arvo-btn--xl')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------
describe('IconButton - icon management', () => {
  it('creates icon element with correct classes (arvo-btn__ico, o9con, o9con-{name})', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'save' });
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con')).toBe(true);
    expect(ico!.classList.contains('o9con-save')).toBe(true);
  });

  it('icon span has aria-hidden="true"', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'save' });
    expect(el.querySelector('.arvo-btn__ico')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('setIcon swaps icon class on existing element', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { icon: 'save' });
    btn.setIcon('edit');
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
    expect(ico!.classList.contains('o9con-save')).toBe(false);
  });

  it('setIcon with empty string is a no-op (icon is never removed)', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { icon: 'save' });
    btn.setIcon('');
    expect(el.querySelector('.arvo-btn__ico')).not.toBeNull();
    expect(el.querySelector('.o9con-save')).not.toBeNull();
  });

  it('setIcon creates icon element if none exists', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.setIcon('edit');
    const ico = el.querySelector('.arvo-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-edit')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tooltip management
// ---------------------------------------------------------------------------
describe('IconButton - tooltip management', () => {
  it('setTooltip updates aria-label', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { tooltip: 'Old tip' });
    btn.setTooltip('New tip');
    expect(el.getAttribute('aria-label')).toBe('New tip');
    // tooltip is managed by connectTooltip, not native title
  });
});

// ---------------------------------------------------------------------------
// Variant management
// ---------------------------------------------------------------------------
describe('IconButton - variant management', () => {
  it('setVariant removes old variant class and adds new one', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { variant: 'primary' });
    btn.setVariant('secondary');
    expect(el.classList.contains('arvo-btn--secondary')).toBe(true);
    expect(el.classList.contains('arvo-btn--primary')).toBe(false);
  });

  it('setVariant does nothing for an invalid variant', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { variant: 'primary' });
    btn.setVariant('invalid');
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
    expect(el.classList.contains('arvo-btn--invalid')).toBe(false);
  });

  it('never has two variant classes simultaneously', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { variant: 'danger' });
    btn.setVariant('outline');
    const variantClasses = ArvoIconButton.VARIANTS.filter(v => el.classList.contains(`arvo-btn--${v}`));
    expect(variantClasses.length).toBe(1);
    expect(variantClasses[0]).toBe('outline');
  });

  it('supports all valid variants via setVariant', () => {
    ArvoIconButton.VARIANTS.forEach(v => {
      const el = createButtonElement();
      const btn = new ArvoIconButton(el);
      btn.setVariant(v);
      expect(el.classList.contains(`arvo-btn--${v}`)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // `danger` remains a back-compat alias for `danger-primary`. `inline` is
  // intentionally NOT in the IconButton variant union -- the JS twin
  // mirrors the React twin's restriction.
  // ---------------------------------------------------------------------
  it('accepts danger-primary at construction', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'danger-primary' });
    expect(el.classList.contains('arvo-btn--danger-primary')).toBe(true);
  });

  it('accepts the danger back-compat alias at construction', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'danger' });
    expect(el.classList.contains('arvo-btn--danger')).toBe(true);
  });

  it('accepts danger-tertiary at construction', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'danger-tertiary' });
    expect(el.classList.contains('arvo-btn--danger-tertiary')).toBe(true);
  });

  it('accepts danger-outline at construction', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'danger-outline' });
    expect(el.classList.contains('arvo-btn--danger-outline')).toBe(true);
  });

  it('accepts nova-primary at construction', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { variant: 'nova-primary' });
    expect(el.classList.contains('arvo-btn--nova-primary')).toBe(true);
  });

  it('does NOT accept inline as a variant (falls back to default)', () => {
    const el = createButtonElement();
    // Cast through `never` -- `inline` is rejected at the type layer.
    new ArvoIconButton(el, { variant: 'inline' as never });
    expect(el.classList.contains('arvo-btn--inline')).toBe(false);
    expect(el.classList.contains('arvo-btn--primary')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Size management
// ---------------------------------------------------------------------------
describe('IconButton - size management', () => {
  it('setSize removes old size class and adds new one', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { size: 'md' });
    btn.setSize('lg');
    expect(el.classList.contains('arvo-btn--lg')).toBe(true);
    expect(el.classList.contains('arvo-btn--md')).toBe(false);
  });

  it('setSize does nothing for an invalid size', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { size: 'md' });
    btn.setSize('xl');
    expect(el.classList.contains('arvo-btn--md')).toBe(true);
    expect(el.classList.contains('arvo-btn--xl')).toBe(false);
  });

  it('never has two size classes simultaneously', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { size: 'sm' });
    btn.setSize('lg');
    const sizeClasses = ArvoIconButton.SIZES.filter(s => el.classList.contains(`arvo-btn--${s}`));
    expect(sizeClasses.length).toBe(1);
    expect(sizeClasses[0]).toBe('lg');
  });

  it('supports all valid sizes via setSize (including xs)', () => {
    ArvoIconButton.SIZES.forEach(s => {
      const el = createButtonElement();
      const btn = new ArvoIconButton(el);
      btn.setSize(s);
      expect(el.classList.contains(`arvo-btn--${s}`)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('IconButton - loading state', () => {
  it('setLoading(true) adds loading class', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isLoading: true });
    btn.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isLoading: true });
    btn.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('click is suppressed during loading', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { isLoading: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('dispatches btn:loading event with correct detail on setLoading(true)', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    const handler = vi.fn();
    el.addEventListener('btn:loading', handler);
    btn.setLoading(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ isLoading: true });
  });

  it('dispatches btn:loading event with correct detail on setLoading(false)', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isLoading: true });
    const handler = vi.fn();
    el.addEventListener('btn:loading', handler);
    btn.setLoading(false);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ isLoading: false });
  });

  it('btn:loading event bubbles', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
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
describe('IconButton - selected state', () => {
  it('selected(true) adds active class', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.selected(true);
    expect(el.classList.contains('active')).toBe(true);
  });

  it('selected(true) sets aria-pressed="true"', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.selected(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('selected(false) removes active class', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isSelected: true });
    btn.selected(false);
    expect(el.classList.contains('active')).toBe(false);
  });

  it('selected(false) sets aria-pressed="false"', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isSelected: true });
    btn.selected(false);
    expect(el.getAttribute('aria-pressed')).toBe('false');
  });

  it('selected() returns true when selected', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isSelected: true });
    expect(btn.selected()).toBe(true);
  });

  it('selected() returns false when not selected', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    expect(btn.selected()).toBe(false);
  });

  it('initialization with selected=true applies active class and aria-pressed', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { isSelected: true });
    expect(el.classList.contains('active')).toBe(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not set aria-pressed when selected is not provided', () => {
    const el = createButtonElement();
    new ArvoIconButton(el);
    expect(el.getAttribute('aria-pressed')).toBeNull();
  });

  it('sets aria-pressed="false" when selected is explicitly false', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { isSelected: false });
    expect(el.getAttribute('aria-pressed')).toBe('false');
    expect(el.classList.contains('active')).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('IconButton - disabled state', () => {
  it('disabled(true) sets element.disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.disabled(true);
    expect(el.disabled).toBe(true);
  });

  it('disabled(false) clears element.disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isDisabled: true });
    btn.disabled(false);
    expect(el.disabled).toBe(false);
  });

  it('disabled() returns true when disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isDisabled: true });
    expect(btn.disabled()).toBe(true);
  });

  it('disabled() returns false when not disabled', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    expect(btn.disabled()).toBe(false);
  });

  it('click is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { isDisabled: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('initialization with disabled=true sets element.disabled', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { isDisabled: true });
    expect(el.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------
describe('IconButton - focus', () => {
  it('focus() calls element.focus()', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    const spy = vi.spyOn(el, 'focus');
    btn.focus();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('focus() does NOT call element.focus() when loading', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isLoading: true });
    const spy = vi.spyOn(el, 'focus');
    btn.focus();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('IconButton - destroy', () => {
  it('removes arvo-icon-btn base class', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.destroy();
    expect(el.classList.contains('arvo-icon-btn')).toBe(false);
  });

  it('removes all variant classes', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { variant: 'danger' });
    btn.destroy();
    ArvoIconButton.VARIANTS.forEach(v => {
      expect(el.classList.contains(`arvo-btn--${v}`)).toBe(false);
    });
  });

  it('removes all size classes', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { size: 'sm' });
    btn.destroy();
    ArvoIconButton.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-btn--${s}`)).toBe(false);
    });
  });

  it('removes aria-label attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { tooltip: 'Tip' });
    btn.destroy();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('removes aria-pressed attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isSelected: true });
    btn.destroy();
    expect(el.getAttribute('aria-pressed')).toBeNull();
  });

  it('removes aria-busy attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isLoading: true });
    btn.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  // tooltip is managed by connectTooltip, not native title
  it.skip('removes title attribute', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { tooltip: 'Tip' });
    btn.destroy();
    expect(el.getAttribute('title')).toBeNull();
  });

  it('clears disabled state', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { isDisabled: true });
    btn.destroy();
    expect(el.disabled).toBe(false);
  });

  it('removes icon element from DOM', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { icon: 'save' });
    btn.destroy();
    expect(el.querySelector('.arvo-btn__ico')).toBeNull();
  });

  it('removes click event listener (onClick not called after destroy)', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { onClick });
    btn.destroy();
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    btn.destroy();
    expect(() => btn.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Custom events
// ---------------------------------------------------------------------------
describe('IconButton - custom events', () => {
  it('btn:loading event has bubbles=true', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el);
    let capturedEvent: CustomEvent | null = null;
    document.body.addEventListener('btn:loading', (e) => { capturedEvent = e as CustomEvent; });
    btn.setLoading(true);
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.bubbles).toBe(true);
    document.body.removeEventListener('btn:loading', () => {});
  });

  it('onClick callback is called when clicked', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { onClick });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('onClick receives the Event object', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { onClick });
    el.click();
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(Event);
  });

  it('onKeyDown callback is called for non-blocked keys', () => {
    const onKeyDown = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { onKeyDown });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('onKeyDown is suppressed for Enter when disabled', () => {
    const onKeyDown = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { isDisabled: true, onKeyDown });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('onKeyDown is suppressed for Space when disabled', () => {
    const onKeyDown = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { isDisabled: true, onKeyDown });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('onKeyDown is suppressed for Enter when loading', () => {
    const onKeyDown = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { isLoading: true, onKeyDown });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('onKeyDown is suppressed for Space when loading', () => {
    const onKeyDown = vi.fn();
    const el = createButtonElement();
    new ArvoIconButton(el, { isLoading: true, onKeyDown });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onKeyDown).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Badge slot resolver
// ---------------------------------------------------------------------------

describe('ArvoIconButton - resolveIconButtonBadge', () => {
  it('defaults placement to top-right when omitted', () => {
    expect(resolveIconButtonBadge({}).placement).toBe('top-right');
  });

  it('fixes size=sm, appearance=filled, colorMode=semantic, variant=counter, counterMode=single, hasBadgeIcon=false', () => {
    const r = resolveIconButtonBadge({ placement: 'top-right' });
    expect(r.size).toBe('sm');
    expect(r.appearance).toBe('filled');
    expect(r.colorMode).toBe('semantic');
    expect(r.variant).toBe('counter');
    expect(r.counterMode).toBe('single');
    expect(r.hasBadgeIcon).toBe(false);
  });

  it('defaults semanticType to neutral but honors consumer override', () => {
    expect(resolveIconButtonBadge({}).semanticType).toBe('neutral');
    expect(
      resolveIconButtonBadge({ semanticType: 'negative' }).semanticType,
    ).toBe('negative');
  });

  it('honors top-right placement (only overlay corner supported)', () => {
    expect(resolveIconButtonBadge({ placement: 'top-right' }).placement).toBe('top-right');
  });

  it('forwards count, overflowCount, hideWhenZero, autoFormat unchanged', () => {
    const r = resolveIconButtonBadge({
      count: 12,
      overflowCount: 99,
      hideWhenZero: true,
      autoFormat: true,
    });
    expect(r.count).toBe(12);
    expect(r.overflowCount).toBe(99);
    expect(r.hideWhenZero).toBe(true);
    expect(r.autoFormat).toBe(true);
  });
});

describe('ArvoIconButton - resolveIconButtonStatus', () => {
  it('derives status size from icon button size (xs -> sm, sm/md/lg map 1:1)', () => {
    const cfg: ArvoIconButtonStatusConfig = { type: 'available' };
    expect(resolveIconButtonStatus(cfg, 'xs').size).toBe('sm');
    expect(resolveIconButtonStatus(cfg, 'sm').size).toBe('sm');
    expect(resolveIconButtonStatus(cfg, 'md').size).toBe('md');
    expect(resolveIconButtonStatus(cfg, 'lg').size).toBe('lg');
  });

  it('defaults placement to top-right when omitted', () => {
    expect(resolveIconButtonStatus({ type: 'available' }, 'md').placement).toBe('top-right');
  });

  it('honors top-right and bottom-right placement', () => {
    expect(
      resolveIconButtonStatus({ type: 'available', placement: 'top-right' }, 'md').placement,
    ).toBe('top-right');
    expect(
      resolveIconButtonStatus({ type: 'available', placement: 'bottom-right' }, 'md').placement,
    ).toBe('bottom-right');
  });

  it('forwards type and icon unchanged', () => {
    const r = resolveIconButtonStatus(
      { type: 'positive', icon: 'star' },
      'md',
    );
    expect(r.type).toBe('positive');
    expect(r.icon).toBe('star');
  });
});

// ---------------------------------------------------------------------------
// Badge slot rendering
// ---------------------------------------------------------------------------

describe('ArvoIconButton - badge slot rendering', () => {
  it('renders no badge when option is omitted', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'add', tooltip: 'Add' });
    expect(el.querySelector('.arvo-bdg')).toBeNull();
  });

  it('renders no badge when option is null', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'add', tooltip: 'Add', badge: null });
    expect(el.querySelector('.arvo-bdg')).toBeNull();
  });

  it('renders a counter badge at top-right by default', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 5 },
    });
    const bdg = el.querySelector('.arvo-bdg');
    expect(bdg).not.toBeNull();
    expect(bdg!.classList.contains('arvo-bdg--top-right')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--filled')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--counter')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--single')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--sm')).toBe(true);
    expect(bdg!.classList.contains('arvo-bdg--neutral')).toBe(true);
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('5');
  });

  it('badge bottom-right is no longer supported and coerces to inline at render', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { placement: 'bottom-right' as never, count: 2 },
    });
    const bdg = el.querySelector('.arvo-bdg')!;
    expect(bdg.classList.contains('arvo-bdg--inline')).toBe(true);
    expect(bdg.classList.contains('arvo-bdg--bottom-right')).toBe(false);
  });

  it('honors consumer-supplied semanticType', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 3, semanticType: 'negative' },
    });
    expect(
      el.querySelector('.arvo-bdg')!.classList.contains('arvo-bdg--negative'),
    ).toBe(true);
  });

  it('badge is a direct child of the button root', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 1 },
    });
    expect(el.querySelector('.arvo-bdg')!.parentElement).toBe(el);
  });

  it('badge never receives a leading icon (hasBadgeIcon=false)', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 5 },
    });
    expect(el.querySelector('.arvo-bdg__ico')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Status slot rendering
// ---------------------------------------------------------------------------

describe('ArvoIconButton - status slot rendering', () => {
  it('renders no status when option is omitted', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'user', tooltip: 'Profile' });
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('renders no status when option is null', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, { icon: 'user', tooltip: 'Profile', status: null });
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('defaults to top-right placement', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      status: { type: 'available' },
    });
    const sts = el.querySelector('.arvo-sts');
    expect(sts).not.toBeNull();
    expect(sts!.classList.contains('arvo-sts--top-right')).toBe(true);
  });

  it('renders at bottom-right when explicitly placed', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      status: { type: 'available', placement: 'bottom-right' },
    });
    expect(
      el.querySelector('.arvo-sts')!.classList.contains('arvo-sts--bottom-right'),
    ).toBe(true);
  });

  it('derives status size from icon button size (xs -> sm)', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      size: 'xs',
      status: { type: 'available' },
    });
    expect(el.querySelector('.arvo-sts')!.classList.contains('arvo-sts--sm')).toBe(true);
  });

  it('derives status size from icon button size (sm/md/lg map 1:1)', () => {
    (['sm', 'md', 'lg'] as const).forEach(size => {
      const el = createButtonElement();
      new ArvoIconButton(el, {
        icon: 'user',
        tooltip: 'Profile',
        size,
        status: { type: 'available' },
      });
      expect(el.querySelector('.arvo-sts')!.classList.contains(`arvo-sts--${size}`)).toBe(true);
    });
  });

  it('forwards icon override to the rendered status', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      status: { type: 'positive', icon: 'star' },
    });
    expect(
      el.querySelector('.arvo-sts__ico')!.classList.contains('o9con-star'),
    ).toBe(true);
  });

  it('status is a direct child of the button root', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      status: { type: 'available' },
    });
    expect(el.querySelector('.arvo-sts')!.parentElement).toBe(el);
  });

  it('setSize re-derives the status slot size', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      size: 'sm',
      status: { type: 'available' },
    });
    expect(el.querySelector('.arvo-sts')!.classList.contains('arvo-sts--sm')).toBe(true);
    btn.setSize('lg');
    expect(el.querySelector('.arvo-sts')!.classList.contains('arvo-sts--lg')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Combined badge + status slot
// ---------------------------------------------------------------------------

describe('ArvoIconButton - combined badge + status slot', () => {
  it('renders both slots on the same icon button without interference', () => {
    const el = createButtonElement();
    new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 3, semanticType: 'negative' },
      status: { type: 'available' },
    });
    const bdg = el.querySelector('.arvo-bdg');
    const sts = el.querySelector('.arvo-sts');
    expect(bdg).not.toBeNull();
    expect(sts).not.toBeNull();
    expect(bdg!.parentElement).toBe(el);
    expect(sts!.parentElement).toBe(el);
  });
});

// ---------------------------------------------------------------------------
// Slot lifecycle (setBadge / setStatus)
// ---------------------------------------------------------------------------

describe('ArvoIconButton - setBadge / setStatus lifecycle', () => {
  it('setBadge mounts a badge when none was previously rendered', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { icon: 'bell', tooltip: 'Notifications' });
    expect(el.querySelector('.arvo-bdg')).toBeNull();
    btn.setBadge({ count: 7 });
    expect(el.querySelector('.arvo-bdg')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('7');
  });

  it('setBadge replaces an existing badge', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 3 },
    });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('3');
    btn.setBadge({ count: 8, semanticType: 'positive' });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('8');
    expect(
      el.querySelector('.arvo-bdg')!.classList.contains('arvo-bdg--positive'),
    ).toBe(true);
  });

  it('setBadge(null) tears down the badge', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 1 },
    });
    expect(el.querySelector('.arvo-bdg')).not.toBeNull();
    btn.setBadge(null);
    expect(el.querySelector('.arvo-bdg')).toBeNull();
  });

  it('setStatus mounts a status when none was previously rendered', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, { icon: 'user', tooltip: 'Profile' });
    expect(el.querySelector('.arvo-sts')).toBeNull();
    btn.setStatus({ type: 'available' });
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
  });

  it('setStatus replaces an existing status', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      status: { type: 'available' },
    });
    btn.setStatus({ type: 'negative', placement: 'bottom-right' });
    const sts = el.querySelector('.arvo-sts')!;
    expect(sts.classList.contains('arvo-sts--bottom-right')).toBe(true);
  });

  it('setStatus(null) tears down the status', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, {
      icon: 'user',
      tooltip: 'Profile',
      status: { type: 'available' },
    });
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
    btn.setStatus(null);
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('destroy tears down both slots cleanly', () => {
    const el = createButtonElement();
    const btn = new ArvoIconButton(el, {
      icon: 'bell',
      tooltip: 'Notifications',
      badge: { count: 1 },
      status: { type: 'available' },
    });
    expect(el.querySelector('.arvo-bdg')).not.toBeNull();
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
    btn.destroy();
    expect(el.querySelector('.arvo-bdg')).toBeNull();
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });
});
