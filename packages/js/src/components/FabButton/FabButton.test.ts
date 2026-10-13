import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArvoFabButton } from './FabButton';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createContainer(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('FabButton - initialization', () => {
  it('static initialize() returns a FabButton instance', () => {
    const el = createContainer();
    const fab = ArvoFabButton.initialize(el);
    expect(fab).toBeInstanceOf(ArvoFabButton);
  });

  it('creates wrapper div with arvo-fab-btn class', () => {
    const el = createContainer();
    new ArvoFabButton(el);
    expect(el.querySelector('.arvo-fab-btn')).not.toBeNull();
  });

  it('creates a <button> inside the wrapper', () => {
    const el = createContainer();
    new ArvoFabButton(el);
    expect(el.querySelector('button')).not.toBeNull();
  });

  it('defaults to icon-only mode', () => {
    const el = createContainer();
    new ArvoFabButton(el);
    expect(el.querySelector('.arvo-fab-btn--icon-only')).not.toBeNull();
  });

  it('uses with-label mode when label is provided', () => {
    const el = createContainer();
    new ArvoFabButton(el, { label: 'Create' });
    expect(el.querySelector('.arvo-fab-btn--with-label')).not.toBeNull();
  });

  it('inner button is arvo-icon-btn in icon-only mode', () => {
    const el = createContainer();
    new ArvoFabButton(el, { icon: 'plus', tooltip: 'Add' });
    expect(el.querySelector('.arvo-icon-btn')).not.toBeNull();
  });

  it('inner button is arvo-btn in with-label mode', () => {
    const el = createContainer();
    new ArvoFabButton(el, { icon: 'plus', label: 'Create' });
    expect(el.querySelector('.arvo-btn')).not.toBeNull();
  });

  it('icon-only inner button has size lg', () => {
    const el = createContainer();
    new ArvoFabButton(el, { icon: 'plus', tooltip: 'Add' });
    const btn = el.querySelector('button')!;
    expect(btn.classList.contains('arvo-btn--lg')).toBe(true);
  });

  it('with-label inner button has size md', () => {
    const el = createContainer();
    new ArvoFabButton(el, { icon: 'plus', label: 'Create' });
    const btn = el.querySelector('button')!;
    expect(btn.classList.contains('arvo-btn--md')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------
describe('FabButton - variant', () => {
  it('applies primary variant by default', () => {
    const el = createContainer();
    new ArvoFabButton(el);
    expect(el.querySelector('.arvo-fab-btn--primary')).not.toBeNull();
  });

  it('applies secondary variant when specified', () => {
    const el = createContainer();
    new ArvoFabButton(el, { variant: 'secondary' });
    expect(el.querySelector('.arvo-fab-btn--secondary')).not.toBeNull();
  });

  it('inner button has matching variant class', () => {
    const el = createContainer();
    new ArvoFabButton(el, { variant: 'secondary', icon: 'plus' });
    expect(el.querySelector('button')!.classList.contains('arvo-btn--secondary')).toBe(true);
  });

  it('falls back to primary for invalid variant', () => {
    const el = createContainer();
    new ArvoFabButton(el, { variant: 'invalid' as never });
    expect(el.querySelector('.arvo-fab-btn--primary')).not.toBeNull();
  });

  it('setVariant updates wrapper and inner button', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.setVariant('secondary');
    expect(el.querySelector('.arvo-fab-btn--secondary')).not.toBeNull();
    expect(el.querySelector('.arvo-fab-btn--primary')).toBeNull();
    expect(el.querySelector('button')!.classList.contains('arvo-btn--secondary')).toBe(true);
  });

  it('setVariant ignores invalid values', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.setVariant('danger');
    expect(el.querySelector('.arvo-fab-btn--primary')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('FabButton - disabled state', () => {
  it('adds is-disabled class to wrapper when disabled', () => {
    const el = createContainer();
    new ArvoFabButton(el, { isDisabled: true });
    expect(el.querySelector('.arvo-fab-btn.is-disabled')).not.toBeNull();
  });

  it('disables the inner button', () => {
    const el = createContainer();
    new ArvoFabButton(el, { isDisabled: true });
    expect(el.querySelector('button')!.disabled).toBe(true);
  });

  it('disabled() getter returns current state', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { isDisabled: true });
    expect(fab.disabled()).toBe(true);
  });

  it('disabled(true) disables the FAB', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.disabled(true);
    expect(el.querySelector('.is-disabled')).not.toBeNull();
    expect(el.querySelector('button')!.disabled).toBe(true);
  });

  it('disabled(false) enables the FAB', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { isDisabled: true });
    fab.disabled(false);
    expect(el.querySelector('.is-disabled')).toBeNull();
    expect(el.querySelector('button')!.disabled).toBe(false);
  });

  it('click suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createContainer();
    new ArvoFabButton(el, { isDisabled: true, onClick });
    el.querySelector('button')!.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('FabButton - loading state', () => {
  it('adds loading class to wrapper', () => {
    const el = createContainer();
    new ArvoFabButton(el, { isLoading: true });
    expect(el.querySelector('.arvo-fab-btn.loading')).not.toBeNull();
  });

  it('setLoading(true) adds loading class and aria-busy', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.setLoading(true);
    const wrapper = el.querySelector('.arvo-fab-btn')!;
    expect(wrapper.classList.contains('loading')).toBe(true);
    expect(wrapper.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class and aria-busy', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { isLoading: true });
    fab.setLoading(false);
    const wrapper = el.querySelector('.arvo-fab-btn')!;
    expect(wrapper.classList.contains('loading')).toBe(false);
    expect(wrapper.getAttribute('aria-busy')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Z-index
// ---------------------------------------------------------------------------
describe('FabButton - z-index', () => {
  it('sets inline z-index when provided', () => {
    const el = createContainer();
    new ArvoFabButton(el, { zIndex: 2000 });
    const wrapper = el.querySelector('.arvo-fab-btn') as HTMLElement;
    expect(wrapper.style.zIndex).toBe('2000');
  });

  it('does not set inline z-index by default', () => {
    const el = createContainer();
    new ArvoFabButton(el);
    const wrapper = el.querySelector('.arvo-fab-btn') as HTMLElement;
    expect(wrapper.style.zIndex).toBe('');
  });

  it('setZIndex updates inline z-index', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.setZIndex(3000);
    const wrapper = el.querySelector('.arvo-fab-btn') as HTMLElement;
    expect(wrapper.style.zIndex).toBe('3000');
  });

  it('setZIndex(null) removes inline z-index', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { zIndex: 2000 });
    fab.setZIndex(null);
    const wrapper = el.querySelector('.arvo-fab-btn') as HTMLElement;
    expect(wrapper.style.zIndex).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------
describe('FabButton - icon management', () => {
  it('renders the specified icon', () => {
    const el = createContainer();
    new ArvoFabButton(el, { icon: 'edit' });
    expect(el.querySelector('.o9con-edit')).not.toBeNull();
  });

  it('setIcon updates the icon', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { icon: 'edit' });
    fab.setIcon('delete');
    expect(el.querySelector('.o9con-delete')).not.toBeNull();
    expect(el.querySelector('.o9con-edit')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Label / mode switching
// ---------------------------------------------------------------------------
describe('FabButton - label & mode switching', () => {
  it('setLabel switches from icon-only to with-label', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { icon: 'plus' });
    expect(el.querySelector('.arvo-fab-btn--icon-only')).not.toBeNull();

    fab.setLabel('Create');
    expect(el.querySelector('.arvo-fab-btn--with-label')).not.toBeNull();
    expect(el.querySelector('.arvo-fab-btn--icon-only')).toBeNull();
    expect(el.querySelector('.arvo-btn')).not.toBeNull();
    expect(el.querySelector('.arvo-icon-btn')).toBeNull();
  });

  it('setLabel(null) switches from with-label to icon-only', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { icon: 'plus', label: 'Create' });
    expect(el.querySelector('.arvo-fab-btn--with-label')).not.toBeNull();

    fab.setLabel(null);
    expect(el.querySelector('.arvo-fab-btn--icon-only')).not.toBeNull();
    expect(el.querySelector('.arvo-icon-btn')).not.toBeNull();
    expect(el.querySelector('.arvo-btn:not(.arvo-icon-btn)')).toBeNull();
  });

  it('setLabel updates text without mode switch when already with-label', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { icon: 'plus', label: 'Create' });
    fab.setLabel('New Label');
    expect(el.querySelector('.arvo-btn__lbl')!.textContent).toBe('New Label');
  });
});

// ---------------------------------------------------------------------------
// Event handling
// ---------------------------------------------------------------------------
describe('FabButton - event handling', () => {
  it('onClick is called when inner button is clicked', () => {
    const onClick = vi.fn();
    const el = createContainer();
    new ArvoFabButton(el, { onClick });
    el.querySelector('button')!.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('onClick is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createContainer();
    new ArvoFabButton(el, { isDisabled: true, onClick });
    el.querySelector('button')!.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('onClick is suppressed when loading', () => {
    const onClick = vi.fn();
    const el = createContainer();
    new ArvoFabButton(el, { isLoading: true, onClick });
    el.querySelector('button')!.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------
describe('FabButton - focus', () => {
  it('focus() focuses the inner button', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    const btn = el.querySelector('button')!;
    const spy = vi.spyOn(btn, 'focus');
    fab.focus();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('focus() does not focus when loading', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el, { isLoading: true });
    const btn = el.querySelector('button')!;
    const spy = vi.spyOn(btn, 'focus');
    fab.focus();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('FabButton - destroy', () => {
  it('removes wrapper from container', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.destroy();
    expect(el.querySelector('.arvo-fab-btn')).toBeNull();
  });

  it('removes button element', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.destroy();
    expect(el.querySelector('button')).toBeNull();
  });

  it('click is not handled after destroy', () => {
    const onClick = vi.fn();
    const el = createContainer();
    const fab = new ArvoFabButton(el, { onClick });
    fab.destroy();
    expect(el.querySelector('button')).toBeNull();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createContainer();
    const fab = new ArvoFabButton(el);
    fab.destroy();
    expect(() => fab.destroy()).not.toThrow();
  });
});
