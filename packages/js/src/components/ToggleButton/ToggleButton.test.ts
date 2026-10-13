import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ArvoToggleButton,
  resolveToggleButtonBadge,
  resolveToggleButtonStatus,
  type ArvoToggleButtonStatusConfig,
} from './ToggleButton';
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
describe('ToggleButton - initialization', () => {
  it('static initialize() returns an ArvoToggleButton instance', () => {
    const el = createButtonElement();
    const tg = ArvoToggleButton.initialize(el);
    expect(tg).toBeInstanceOf(ArvoToggleButton);
  });

  it('adds the arvo-toggle-btn base class', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el);
    expect(el.classList.contains('arvo-toggle-btn')).toBe(true);
  });

  it('adds the default secondary variant class', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el);
    expect(el.classList.contains('arvo-toggle-btn--secondary')).toBe(true);
  });

  it.each(['secondary', 'tertiary', 'outline'] as const)(
    'adds the %s variant class',
    (variant) => {
      const el = createButtonElement();
      new ArvoToggleButton(el, { variant });
      expect(el.classList.contains(`arvo-toggle-btn--${variant}`)).toBe(true);
    },
  );

  it('adds the default md size class', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el);
    expect(el.classList.contains('arvo-toggle-btn--md')).toBe(true);
  });

  it.each(['sm', 'md', 'lg'] as const)(
    'adds the %s size class',
    (size) => {
      const el = createButtonElement();
      new ArvoToggleButton(el, { size });
      expect(el.classList.contains(`arvo-toggle-btn--${size}`)).toBe(true);
    },
  );

  it('sets type=button by default', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el);
    expect(el.getAttribute('type')).toBe('button');
  });

  it('renders the icon when icon option is set', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o' });
    const ico = el.querySelector('.arvo-toggle-btn__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con-star-o')).toBe(true);
  });

  it('renders the label when label option is set', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    const lbl = el.querySelector('.arvo-toggle-btn__lbl');
    expect(lbl).not.toBeNull();
    expect(lbl!.textContent).toBe('Favorite');
  });

  it('adds icon-only modifier when label is omitted', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', tooltip: 'Favorite' });
    expect(el.classList.contains('arvo-toggle-btn--icon-only')).toBe(true);
    expect(el.querySelector('.arvo-toggle-btn__lbl')).toBeNull();
  });

  it('does NOT add icon-only modifier when label is supplied', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    expect(el.classList.contains('arvo-toggle-btn--icon-only')).toBe(false);
  });

  it('icon-only sets aria-label from tooltip string', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', tooltip: 'Favorite' });
    expect(el.getAttribute('aria-label')).toBe('Favorite');
  });

  it('icon-only sets aria-label from tooltip config object', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      tooltip: { content: 'Favorite', placement: 'top-center' },
    });
    expect(el.getAttribute('aria-label')).toBe('Favorite');
  });

  it('does NOT set aria-label when label is supplied', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      tooltip: 'Hint',
    });
    expect(el.hasAttribute('aria-label')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// aria-pressed (always emitted)
// ---------------------------------------------------------------------------
describe('ToggleButton - aria-pressed', () => {
  it('always emits aria-pressed="false" by default', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    expect(el.getAttribute('aria-pressed')).toBe('false');
  });

  it('emits aria-pressed="true" when isSelected option is true', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isSelected: true,
    });
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(el.classList.contains('active')).toBe(true);
  });

  it('seeds aria-pressed from defaultSelected when isSelected is omitted', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      defaultSelected: true,
    });
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(el.classList.contains('active')).toBe(true);
  });

  it('isSelected takes precedence over defaultSelected', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isSelected: false,
      defaultSelected: true,
    });
    expect(el.getAttribute('aria-pressed')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// Click flip + onSelectedChange callback
// ---------------------------------------------------------------------------
describe('ToggleButton - click handling', () => {
  it('click flips selected state and fires onSelectedChange', () => {
    const onSelectedChange = vi.fn();
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      onSelectedChange,
    });
    el.click();
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    el.click();
    expect(el.getAttribute('aria-pressed')).toBe('false');
    expect(onSelectedChange).toHaveBeenLastCalledWith(false);
  });

  it('click also fires the toggle-btn:change DOM event', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    const handler = vi.fn();
    el.addEventListener('toggle-btn:change', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      isSelected: true,
    });
  });

  it('click also fires consumer onClick', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite', onClick });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('click is suppressed when disabled', () => {
    const onSelectedChange = vi.fn();
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isDisabled: true,
      onSelectedChange,
    });
    el.click();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// selectedIcon swap
// ---------------------------------------------------------------------------
describe('ToggleButton - selectedIcon swap', () => {
  it('initial render uses the resting icon when not selected', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'bookmark-o',
      selectedIcon: 'bookmark',
      label: 'Bookmark',
    });
    const ico = el.querySelector('.arvo-toggle-btn__ico');
    expect(ico!.classList.contains('o9con-bookmark-o')).toBe(true);
  });

  it('initial render uses the selectedIcon when isSelected=true', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'bookmark-o',
      selectedIcon: 'bookmark',
      label: 'Bookmark',
      isSelected: true,
    });
    const ico = el.querySelector('.arvo-toggle-btn__ico');
    expect(ico!.classList.contains('o9con-bookmark')).toBe(true);
  });

  it('click swaps to the selectedIcon when transitioning to selected', () => {
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'bookmark-o',
      selectedIcon: 'bookmark',
      label: 'Bookmark',
    });
    el.click();
    const icoAfterFirst = el.querySelector('.arvo-toggle-btn__ico');
    expect(icoAfterFirst!.classList.contains('o9con-bookmark')).toBe(true);
    el.click();
    const icoAfterSecond = el.querySelector('.arvo-toggle-btn__ico');
    expect(icoAfterSecond!.classList.contains('o9con-bookmark-o')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selected() getter / setter
// ---------------------------------------------------------------------------
describe('ToggleButton - selected()', () => {
  it('selected() returns the current state', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isSelected: true,
    });
    expect(tg.selected()).toBe(true);
  });

  it('selected(true) flips state and emits toggle-btn:change but NOT onSelectedChange', () => {
    const onSelectedChange = vi.fn();
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      onSelectedChange,
    });
    const handler = vi.fn();
    el.addEventListener('toggle-btn:change', handler);
    tg.selected(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(el.classList.contains('active')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('selected(state) is a no-op when state equals current', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isSelected: false,
    });
    const handler = vi.fn();
    el.addEventListener('toggle-btn:change', handler);
    tg.selected(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// toggle() / toggle(force)
// ---------------------------------------------------------------------------
describe('ToggleButton - toggle()', () => {
  it('toggle() flips and returns the new value', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    expect(tg.toggle()).toBe(true);
    expect(tg.toggle()).toBe(false);
  });

  it('toggle(true) forces on', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.toggle(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggle(false) forces off', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isSelected: true,
    });
    tg.toggle(false);
    expect(el.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggle() does NOT invoke onSelectedChange', () => {
    const onSelectedChange = vi.fn();
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      onSelectedChange,
    });
    tg.toggle();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// disabled() + toggle-btn:disabled event
// ---------------------------------------------------------------------------
describe('ToggleButton - disabled()', () => {
  it('disabled() returns false by default', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    expect(tg.disabled()).toBe(false);
  });

  it('disabled(true) sets element.disabled', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.disabled(true);
    expect(el.disabled).toBe(true);
  });

  it('disabled(true) emits toggle-btn:disabled', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    const handler = vi.fn();
    el.addEventListener('toggle-btn:disabled', handler);
    tg.disabled(true);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      isDisabled: true,
    });
  });
});

// ---------------------------------------------------------------------------
// setLabel toggling shape
// ---------------------------------------------------------------------------
describe('ToggleButton - setLabel', () => {
  it('setLabel adds a label element + removes icon-only modifier', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', tooltip: 'Favorite' });
    expect(el.classList.contains('arvo-toggle-btn--icon-only')).toBe(true);
    tg.setLabel('Favorite');
    expect(el.classList.contains('arvo-toggle-btn--icon-only')).toBe(false);
    expect(el.querySelector('.arvo-toggle-btn__lbl')?.textContent).toBe('Favorite');
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('setLabel(null) removes the label and re-adds icon-only modifier', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      tooltip: 'Favorite',
    });
    tg.setLabel(null);
    expect(el.classList.contains('arvo-toggle-btn--icon-only')).toBe(true);
    expect(el.querySelector('.arvo-toggle-btn__lbl')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Favorite');
  });
});

// ---------------------------------------------------------------------------
// setIcon / setSelectedIcon
// ---------------------------------------------------------------------------
describe('ToggleButton - setIcon / setSelectedIcon', () => {
  it('setIcon swaps the resting glyph when toggle is off', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.setIcon('star');
    const ico = el.querySelector('.arvo-toggle-btn__ico');
    expect(ico!.classList.contains('o9con-star')).toBe(true);
  });

  it('setSelectedIcon(null) clears the swap behaviour', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'bookmark-o',
      selectedIcon: 'bookmark',
      label: 'Bookmark',
      isSelected: true,
    });
    const icoBefore = el.querySelector('.arvo-toggle-btn__ico');
    expect(icoBefore!.classList.contains('o9con-bookmark')).toBe(true);
    tg.setSelectedIcon(null);
    const icoAfter = el.querySelector('.arvo-toggle-btn__ico');
    expect(icoAfter!.classList.contains('o9con-bookmark-o')).toBe(true);
  });

  it('setSelectedIcon updates the on-state glyph immediately when toggle is on', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'bookmark-o',
      selectedIcon: 'bookmark',
      label: 'Bookmark',
      isSelected: true,
    });
    tg.setSelectedIcon('star');
    const ico = el.querySelector('.arvo-toggle-btn__ico');
    expect(ico!.classList.contains('o9con-star')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setVariant / setSize
// ---------------------------------------------------------------------------
describe('ToggleButton - setVariant / setSize', () => {
  it('setVariant swaps the variant class', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.setVariant('tertiary');
    expect(el.classList.contains('arvo-toggle-btn--tertiary')).toBe(true);
    expect(el.classList.contains('arvo-toggle-btn--secondary')).toBe(false);
  });

  it('setVariant ignores invalid values', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.setVariant('primary');
    expect(el.classList.contains('arvo-toggle-btn--primary')).toBe(false);
    expect(el.classList.contains('arvo-toggle-btn--secondary')).toBe(true);
  });

  it('setSize swaps the size class', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.setSize('lg');
    expect(el.classList.contains('arvo-toggle-btn--lg')).toBe(true);
    expect(el.classList.contains('arvo-toggle-btn--md')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
describe('ToggleButton - setLoading', () => {
  it('setLoading(true) adds loading class + aria-busy + emits event', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    const handler = vi.fn();
    el.addEventListener('toggle-btn:loading', handler);
    tg.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      isLoading: true,
    });
  });

  it('click is suppressed when loading', () => {
    const onSelectedChange = vi.fn();
    const el = createButtonElement();
    new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isLoading: true,
      onSelectedChange,
    });
    el.click();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------
describe('ToggleButton - resolveToggleButtonBadge', () => {
  it('defaults placement to inline', () => {
    expect(resolveToggleButtonBadge({}).placement).toBe('inline');
  });

  it('inline placement fixes size/appearance/colorMode/semanticType/hasBadgeIcon', () => {
    const resolved = resolveToggleButtonBadge({ placement: 'inline' });
    expect(resolved.size).toBe('sm');
    expect(resolved.appearance).toBe('primary');
    expect(resolved.colorMode).toBe('semantic');
    expect(resolved.semanticType).toBe('neutral');
    expect(resolved.hasBadgeIcon).toBe(false);
  });

  it('overlay placement forces variant=counter / counterMode=single / appearance=filled', () => {
    const resolved = resolveToggleButtonBadge({ placement: 'top-right' });
    expect(resolved.variant).toBe('counter');
    expect(resolved.counterMode).toBe('single');
    expect(resolved.appearance).toBe('filled');
  });
});

describe('ToggleButton - resolveToggleButtonStatus', () => {
  it.each(['sm', 'md', 'lg'] as const)(
    'derives size %s from the toggle size',
    (size) => {
      const cfg: ArvoToggleButtonStatusConfig = { type: 'available' };
      expect(resolveToggleButtonStatus(cfg, size).size).toBe(size);
    },
  );

  it('defaults placement to top-right when omitted', () => {
    expect(
      resolveToggleButtonStatus({ type: 'available' }, 'md').placement,
    ).toBe('top-right');
  });
});

// ---------------------------------------------------------------------------
// setBadge / setStatus slot updates
// ---------------------------------------------------------------------------
describe('ToggleButton - setBadge / setStatus', () => {
  it('setBadge renders the badge slot', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.setBadge({ placement: 'top-right', count: 5 });
    expect(el.querySelector('.arvo-bdg')).not.toBeNull();
  });

  it('setBadge(null) tears the slot down', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      badge: { placement: 'top-right', count: 5 },
    });
    expect(el.querySelector('.arvo-bdg')).not.toBeNull();
    tg.setBadge(null);
    expect(el.querySelector('.arvo-bdg')).toBeNull();
  });

  it('setStatus renders the status slot', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.setStatus({ type: 'available' });
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------
describe('ToggleButton - destroy', () => {
  it('strips all toggle classes', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      variant: 'tertiary',
      size: 'lg',
    });
    tg.destroy();
    expect(el.classList.contains('arvo-toggle-btn')).toBe(false);
    expect(el.classList.contains('arvo-toggle-btn--tertiary')).toBe(false);
    expect(el.classList.contains('arvo-toggle-btn--lg')).toBe(false);
  });

  it('removes aria-pressed / aria-busy / aria-label attributes', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      tooltip: 'Favorite',
      isSelected: true,
    });
    tg.destroy();
    expect(el.hasAttribute('aria-pressed')).toBe(false);
    expect(el.hasAttribute('aria-busy')).toBe(false);
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('removes the click event listener', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      onClick,
    });
    tg.destroy();
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('clears disabled state', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, {
      icon: 'star-o',
      label: 'Favorite',
      isDisabled: true,
    });
    tg.destroy();
    expect(el.disabled).toBe(false);
  });

  it('does not throw when called twice', () => {
    const el = createButtonElement();
    const tg = new ArvoToggleButton(el, { icon: 'star-o', label: 'Favorite' });
    tg.destroy();
    expect(() => tg.destroy()).not.toThrow();
  });
});
