// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoChip } from './Chip';

function spanHost(): HTMLElement {
  const el = document.createElement('span');
  document.body.appendChild(el);
  return el;
}

function buttonHost(): HTMLButtonElement {
  const el = document.createElement('button');
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

// ---------------------------------------------------------------------------
// Initialization + defaults
// ---------------------------------------------------------------------------

describe('ArvoChip - initialize', () => {
  it('static initialize() returns an ArvoChip instance', () => {
    expect(ArvoChip.initialize(spanHost(), { label: 'Tag' })).toBeInstanceOf(ArvoChip);
  });

  it('applies general / md / primary defaults', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'Tag' });
    expect(el.classList.contains('arvo-chip--general')).toBe(true);
    expect(el.classList.contains('arvo-chip--md')).toBe(true);
    expect(el.classList.contains('arvo-chip--primary')).toBe(true);
  });

  it('renders the required label in __lbl', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'Enterprise' });
    expect(el.querySelector('.arvo-chip__lbl')?.textContent).toBe('Enterprise');
  });

  it('sets no role on a static general span', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'Tag' });
    expect(el.getAttribute('role')).toBeNull();
  });

  it('sets role=group on an input chip span', () => {
    const el = spanHost();
    new ArvoChip(el, { variant: 'input', label: 'Austin' });
    expect(el.getAttribute('role')).toBe('group');
  });
});

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

describe('ArvoChip - variants', () => {
  it('filter sets aria-pressed on a button host', () => {
    const el = buttonHost();
    new ArvoChip(el, { variant: 'filter', label: 'Active' });
    expect(el.getAttribute('aria-pressed')).toBe('false');
  });

  it('actionable general on a span host gets role=button + tabindex', () => {
    const el = spanHost();
    new ArvoChip(el, { variant: 'general', label: 'Go', onPress: () => {} });
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it.each(['general', 'filter', 'input'] as const)('applies arvo-chip--%s', (variant) => {
    const el = spanHost();
    new ArvoChip(el, { variant, label: 'X' });
    expect(el.classList.contains(`arvo-chip--${variant}`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sizes / appearances / color modes
// ---------------------------------------------------------------------------

describe('ArvoChip - sizes, appearances, color modes', () => {
  it.each(['sm', 'md', 'lg'] as const)('applies arvo-chip--%s', (size) => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', size });
    expect(el.classList.contains(`arvo-chip--${size}`)).toBe(true);
  });

  it.each(['primary', 'outline', 'utility'] as const)('applies arvo-chip--%s', (appearance) => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', appearance });
    expect(el.classList.contains(`arvo-chip--${appearance}`)).toBe(true);
  });

  it.each(['negative', 'positive', 'info', 'warning', 'block'] as const)(
    'semantic mode applies arvo-chip--%s',
    (type) => {
      const el = spanHost();
      new ArvoChip(el, { label: 'X', colorMode: 'semantic', semanticType: type });
      expect(el.classList.contains(`arvo-chip--${type}`)).toBe(true);
    },
  );

  it.each(['purple', 'pink', 'glacier', 'amber', 'greenish', 'bluish'] as const)(
    'custom mode applies arvo-chip--%s',
    (color) => {
      const el = spanHost();
      new ArvoChip(el, { label: 'X', colorMode: 'custom', customColor: color });
      expect(el.classList.contains(`arvo-chip--${color}`)).toBe(true);
    },
  );

  it('utility appearance defaults to the purple custom class', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', appearance: 'utility' });
    expect(el.classList.contains('arvo-chip--purple')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Configuration guards
// ---------------------------------------------------------------------------

describe('ArvoChip - configuration guards', () => {
  it('custom color mode coerces to the utility appearance', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', appearance: 'primary', colorMode: 'custom', customColor: 'glacier' });
    expect(el.classList.contains('arvo-chip--utility')).toBe(true);
    expect(el.classList.contains('arvo-chip--glacier')).toBe(true);
    expect(el.classList.contains('arvo-chip--primary')).toBe(false);
  });

  it('semantic color mode suppresses avatar, status, and the validation states (but NOT the drag handle anymore)', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      colorMode: 'semantic',
      semanticType: 'negative',
      avatar: 'a.png',
      status: { type: 'available' },
      isInvalid: true,
      isWarning: true,
      isExcluded: true,
      dragHandleProps: { 'aria-label': 'Reorder' },
    });
    expect(el.querySelector('.arvo-chip__avatar')).toBeFalsy();
    expect(el.querySelector('.arvo-chip__status')).toBeFalsy();
    expect(el.querySelector('.arvo-chip__alert')).toBeFalsy();
    expect(el.classList.contains('is-invalid')).toBe(false);
    expect(el.classList.contains('is-warning')).toBe(false);
    expect(el.classList.contains('is-excluded')).toBe(false);
    // The drag handle is rendered in semantic mode so reorderable semantic
    // chip lists keep their handles.
    expect(el.querySelector('.arvo-chip__grip')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// hasDrag (standalone drag-handle render)
// ---------------------------------------------------------------------------

describe('ArvoChip - hasDrag', () => {
  it('renders the __grip ArvoIconButton when hasDrag=true even without dragHandleProps', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', hasDrag: true });
    const grip = el.querySelector('.arvo-chip__grip');
    expect(grip).toBeTruthy();
    expect(grip?.getAttribute('aria-label')).toBe('Drag to reorder');
  });

  it('does NOT render the grip when hasDrag is false and no bag is injected', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X' });
    expect(el.querySelector('.arvo-chip__grip')).toBeFalsy();
  });

  it('the injected dragHandleProps bag wins over hasDrag=true (bag aria-label flows through)', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      hasDrag: true,
      dragHandleProps: { 'aria-label': 'Reorder Apples', role: 'button' },
    });
    const grip = el.querySelector('.arvo-chip__grip') as HTMLButtonElement;
    expect(grip).toBeTruthy();
    expect(grip.getAttribute('aria-label')).toBe('Reorder Apples');
    expect(grip.getAttribute('role')).toBe('button');
  });

  it('hasDrag=true renders the grip in semantic color mode', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      hasDrag: true,
      colorMode: 'semantic',
      semanticType: 'negative',
    });
    expect(el.querySelector('.arvo-chip__grip')).toBeTruthy();
  });

  it('hasDrag=true renders the grip in custom color mode', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      hasDrag: true,
      colorMode: 'custom',
      customColor: 'amber',
    });
    expect(el.querySelector('.arvo-chip__grip')).toBeTruthy();
  });

  it('isDisabled / isReadOnly / isLoading suppress the grip even when hasDrag=true', () => {
    for (const flag of ['isDisabled', 'isReadOnly', 'isLoading'] as const) {
      const el = spanHost();
      new ArvoChip(el, { label: 'X', hasDrag: true, [flag]: true });
      expect(el.querySelector('.arvo-chip__grip')).toBeFalsy();
    }
  });
});

// ---------------------------------------------------------------------------
// Counter color-mode propagation
// ---------------------------------------------------------------------------

describe('ArvoChip - counter color-mode propagation', () => {
  it('default colorMode passes neutral semantic to the inner Badge (arvo-bdg--neutral)', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', counter: 5 });
    const bdg = el.querySelector('.arvo-chip__counter .arvo-bdg');
    expect(bdg).toBeTruthy();
    expect(bdg?.classList.contains('arvo-bdg--neutral')).toBe(true);
  });

  it('semantic colorMode propagates semanticType (negative) to the inner Badge', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      counter: 5,
      colorMode: 'semantic',
      semanticType: 'negative',
    });
    const bdg = el.querySelector('.arvo-chip__counter .arvo-bdg');
    expect(bdg?.classList.contains('arvo-bdg--negative')).toBe(true);
  });

  it('semantic colorMode with block passes block to the Badge (Badge remaps to s-negative-strong)', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      counter: 5,
      colorMode: 'semantic',
      semanticType: 'block',
    });
    const bdg = el.querySelector('.arvo-chip__counter .arvo-bdg');
    expect(bdg?.classList.contains('arvo-bdg--block')).toBe(true);
  });

  it('custom colorMode propagates customColor to the inner Badge', () => {
    const el = spanHost();
    new ArvoChip(el, {
      label: 'X',
      counter: 5,
      colorMode: 'custom',
      customColor: 'amber',
    });
    const bdg = el.querySelector('.arvo-chip__counter .arvo-bdg');
    expect(bdg?.classList.contains('arvo-bdg--amber')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Status corner overlay scales with chip size (lg -> md)
// ---------------------------------------------------------------------------

describe('ArvoChip - status sizing per chip size', () => {
  it('sm / md chips default the inner ArvoStatus to size=sm (10px dot)', () => {
    const smEl = spanHost();
    new ArvoChip(smEl, { label: 'X', size: 'sm', status: { type: 'available' } });
    expect(smEl.querySelector('.arvo-chip__status')?.classList.contains('arvo-sts--sm')).toBe(true);

    const mdEl = spanHost();
    new ArvoChip(mdEl, { label: 'X', size: 'md', status: { type: 'available' } });
    expect(mdEl.querySelector('.arvo-chip__status')?.classList.contains('arvo-sts--sm')).toBe(true);
  });

  it('lg chips bump the inner ArvoStatus default to size=md (14px dot)', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', size: 'lg', status: { type: 'available' } });
    expect(el.querySelector('.arvo-chip__status')?.classList.contains('arvo-sts--md')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// States + dual-purpose methods
// ---------------------------------------------------------------------------

describe('ArvoChip - states', () => {
  it('disabled() reads and writes', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    expect(chip.disabled()).toBe(false);
    chip.disabled(true);
    expect(el.classList.contains('is-disabled')).toBe(true);
    expect(chip.disabled()).toBe(true);
  });

  it('readOnly() toggles is-readonly + aria-readonly', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    chip.readOnly(true);
    expect(el.classList.contains('is-readonly')).toBe(true);
    expect(el.getAttribute('aria-readonly')).toBe('true');
  });

  it('invalid() adds the inline negative message alert', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    chip.invalid(true);
    expect(el.classList.contains('is-invalid')).toBe(true);
    expect(el.querySelector('.arvo-chip__alert')?.classList.contains('arvo-msg-alert--negative')).toBe(true);
  });

  it('warning() adds the inline warning message alert', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    chip.warning(true);
    expect(el.classList.contains('is-warning')).toBe(true);
    expect(el.querySelector('.arvo-chip__alert')?.classList.contains('arvo-msg-alert--warning')).toBe(true);
  });

  it('invalid takes precedence over warning at init', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', isInvalid: true, isWarning: true });
    expect(el.classList.contains('is-invalid')).toBe(true);
    expect(el.classList.contains('is-warning')).toBe(false);
    expect(el.querySelector('.arvo-chip__alert')?.classList.contains('arvo-msg-alert--negative')).toBe(true);
  });

  it('excluded() toggles is-excluded and renders the exclude indicator glyph', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    chip.excluded(true);
    expect(el.classList.contains('is-excluded')).toBe(true);
    expect(el.querySelector('.arvo-chip__exclude')?.classList.contains('o9con-exclude')).toBe(true);
  });

  it('setLoading toggles loading + aria-busy and emits chip:loading', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    const handler = vi.fn();
    el.addEventListener('chip:loading', handler);
    chip.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Filter selection
// ---------------------------------------------------------------------------

describe('ArvoChip - filter selection', () => {
  it('defaultSelected applies active + aria-pressed', () => {
    const el = buttonHost();
    new ArvoChip(el, { variant: 'filter', label: 'X', defaultSelected: true });
    expect(el.classList.contains('active')).toBe(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('click toggles selected and fires onSelectedChange + chip:select', () => {
    const el = buttonHost();
    const onSelectedChange = vi.fn();
    const evt = vi.fn();
    el.addEventListener('chip:select', evt);
    new ArvoChip(el, { variant: 'filter', label: 'X', onSelectedChange });
    el.click();
    expect(el.classList.contains('active')).toBe(true);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(evt).toHaveBeenCalledTimes(1);
  });

  it('selected() getter/setter works', () => {
    const el = buttonHost();
    const chip = new ArvoChip(el, { variant: 'filter', label: 'X' });
    expect(chip.selected()).toBe(false);
    chip.selected(true);
    expect(chip.selected()).toBe(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// onPress + dismiss
// ---------------------------------------------------------------------------

describe('ArvoChip - press and dismiss', () => {
  it('fires onPress + chip:press for an actionable general chip', () => {
    const el = spanHost();
    const onPress = vi.fn();
    const evt = vi.fn();
    el.addEventListener('chip:press', evt);
    new ArvoChip(el, { variant: 'general', label: 'Go', onPress });
    el.click();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(evt).toHaveBeenCalledTimes(1);
  });

  it('renders a non-interactive __dismiss span for an input chip with onDismiss', () => {
    const el = spanHost();
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss: () => {} });
    // Single-focus chip model: the X is a plain span (not a button) so it
    // never becomes a separate tab stop.
    const dismiss = el.querySelector('.arvo-chip__dismiss');
    expect(dismiss).toBeTruthy();
    expect(dismiss?.tagName).toBe('SPAN');
    expect(dismiss?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.arvo-chip__dismiss-icon')?.classList.contains('o9con-close')).toBe(true);
  });

  it('input chip carries the keyboard-removal aria-label and is focusable', () => {
    const el = spanHost();
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss: () => {} });
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('aria-label')).toBe(
      'Austin. Press Delete or Backspace to remove.',
    );
  });

  // The chip remove leave animation toggles `.is-removing` and waits for
  // the max-width transition (or the safety timeout) before calling
  // onDismiss + emitting chip:dismiss. Tests dispatch transitionend
  // manually so the assertion stays synchronous -- jsdom does not run CSS
  // transitions so the safety timeout is the only other path.
  const fireMaxWidthTransitionEnd = (el: HTMLElement): void => {
    el.dispatchEvent(
      new TransitionEvent('transitionend', {
        propertyName: 'max-width',
        bubbles: true,
      }),
    );
  };

  it('clicking the __dismiss span fires onDismiss + chip:dismiss (after leave animation)', () => {
    const el = spanHost();
    const onDismiss = vi.fn();
    const evt = vi.fn();
    el.addEventListener('chip:dismiss', evt);
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss });
    (el.querySelector('.arvo-chip__dismiss') as HTMLElement).click();
    expect(el.classList.contains('is-removing')).toBe(true);
    expect(onDismiss).not.toHaveBeenCalled();
    fireMaxWidthTransitionEnd(el);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(evt).toHaveBeenCalledTimes(1);
  });

  it('Delete on a focused input chip fires onDismiss + chip:dismiss (after leave animation)', () => {
    const el = spanHost();
    const onDismiss = vi.fn();
    const evt = vi.fn();
    el.addEventListener('chip:dismiss', evt);
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(el.classList.contains('is-removing')).toBe(true);
    fireMaxWidthTransitionEnd(el);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(evt).toHaveBeenCalledTimes(1);
  });

  it('Backspace on a focused input chip fires onDismiss + chip:dismiss (after leave animation)', () => {
    const el = spanHost();
    const onDismiss = vi.fn();
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(el.classList.contains('is-removing')).toBe(true);
    fireMaxWidthTransitionEnd(el);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss when disabled', () => {
    const el = spanHost();
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss: () => {}, isDisabled: true });
    expect(el.querySelector('.arvo-chip__dismiss')).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Content slots + inner composition
// ---------------------------------------------------------------------------

describe('ArvoChip - content slots', () => {
  it('renders a leading icon', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', icon: 'tag' });
    expect(el.querySelector('.arvo-chip__ico')?.classList.contains('o9con-tag')).toBe(true);
  });

  it('renders the title', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', title: 'Region' });
    expect(el.querySelector('.arvo-chip__title')?.textContent).toBe('Region');
  });

  it('renders an avatar img from a string src', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', avatar: 'a.png' });
    expect(el.querySelector('.arvo-chip__avatar img')).toBeTruthy();
  });

  it('renders ArvoStatus as a corner overlay', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', status: { type: 'available' } });
    const status = el.querySelector('.arvo-chip__status');
    expect(status?.classList.contains('arvo-sts')).toBe(true);
    expect(status?.classList.contains('arvo-sts--top-right')).toBe(true);
  });

  it('renders an ArvoBadge counter', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', counter: 5 });
    const badge = el.querySelector('.arvo-chip__counter .arvo-bdg');
    expect(badge).toBeTruthy();
    expect(badge?.classList.contains('arvo-bdg--counter')).toBe(true);
  });

  it('renders a drag handle ArvoIconButton when dragHandleProps is provided', () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'X', dragHandleProps: { 'aria-label': 'Reorder' } });
    const grip = el.querySelector('.arvo-chip__grip');
    expect(grip).toBeTruthy();
    expect(grip?.classList.contains('arvo-icon-btn')).toBe(true);
    expect(grip?.querySelector('.arvo-btn__ico')?.classList.contains('o9con-drag-handle')).toBe(true);
    expect(grip?.getAttribute('aria-label')).toBe('Reorder');
  });

  it('setCounter adds and removes the counter', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { label: 'X' });
    chip.setCounter(3);
    expect(el.querySelector('.arvo-chip__counter')).toBeTruthy();
    chip.setCounter(null);
    expect(el.querySelector('.arvo-chip__counter')).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ArvoChip - destroy', () => {
  it('removes classes, attributes, and inner content', () => {
    const el = spanHost();
    const chip = new ArvoChip(el, { variant: 'input', label: 'X', counter: 2, status: { type: 'available' }, onDismiss: () => {} });
    chip.destroy();
    expect(el.className).toBe('');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.querySelector('.arvo-chip__lbl')).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('ArvoChip - accessibility', () => {
  // The page-level `region` landmark rule is not relevant to an isolated chip,
  // so it is disabled here (the chip is mounted bare into the test body).
  const axeOptions = { rules: { region: { enabled: false } } } as const;

  it('axe: no violations on a static general chip', async () => {
    const el = spanHost();
    new ArvoChip(el, { label: 'Enterprise', icon: 'tag' });
    const results = await axe.run(el, axeOptions);
    expect(results.violations.map((v) => v.id), JSON.stringify(results.violations)).toHaveLength(0);
  });

  it('axe: no violations on a dismissible input chip', async () => {
    const el = spanHost();
    new ArvoChip(el, { variant: 'input', label: 'Austin', onDismiss: () => {} });
    const results = await axe.run(el, axeOptions);
    expect(results.violations.map((v) => v.id), JSON.stringify(results.violations)).toHaveLength(0);
  });
});
