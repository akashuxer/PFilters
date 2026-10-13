// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoBadge } from './Badge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function host(): HTMLElement {
  const el = document.createElement('span');
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoBadge - initialize', () => {
  it('static initialize() returns an ArvoBadge instance', () => {
    const bdg = ArvoBadge.initialize(host());
    expect(bdg).toBeInstanceOf(ArvoBadge);
  });

  it('decorates the host element with the arvo-bdg class', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg')).toBe(true);
  });

  it('sets role="status" on the host', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.getAttribute('role')).toBe('status');
  });
});

// ---------------------------------------------------------------------------
// Default render
// ---------------------------------------------------------------------------

describe('ArvoBadge - default render', () => {
  it('applies arvo-bdg--label by default', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg--label')).toBe(true);
  });

  it('applies arvo-bdg--md by default', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg--md')).toBe(true);
  });

  it('applies arvo-bdg--primary by default', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg--primary')).toBe(true);
  });

  it('applies arvo-bdg--neutral by default (semantic neutral color)', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg--neutral')).toBe(true);
  });

  it('does NOT apply arvo-bdg--none for the default semanticType', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg--none')).toBe(false);
  });

  it('applies arvo-bdg--inline by default (default placement)', () => {
    const el = host();
    new ArvoBadge(el);
    expect(el.classList.contains('arvo-bdg--inline')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

describe('ArvoBadge - placement', () => {
  it.each(['inline', 'top-right'] as const)(
    'always emits arvo-bdg--%s when placement=%s',
    (placement) => {
      const el = host();
      new ArvoBadge(el, { placement });
      expect(el.classList.contains(`arvo-bdg--${placement}`)).toBe(true);
    },
  );

  it('emits exactly one placement modifier (inline)', () => {
    const el = host();
    new ArvoBadge(el, { placement: 'inline' });
    expect(el.classList.contains('arvo-bdg--inline')).toBe(true);
    expect(el.classList.contains('arvo-bdg--top-right')).toBe(false);
  });

  it('emits exactly one placement modifier (top-right)', () => {
    const el = host();
    new ArvoBadge(el, { placement: 'top-right' });
    expect(el.classList.contains('arvo-bdg--top-right')).toBe(true);
    expect(el.classList.contains('arvo-bdg--inline')).toBe(false);
  });

  it('falls back to inline for an invalid placement value (including the removed bottom-right)', () => {
    const el = host();
    new ArvoBadge(el, { placement: 'bottom-right' as never });
    expect(el.classList.contains('arvo-bdg--inline')).toBe(true);
  });

  it('falls back to inline for an invalid placement value', () => {
    const el = host();
    new ArvoBadge(el, { placement: 'middle' as never });
    expect(el.classList.contains('arvo-bdg--inline')).toBe(true);
  });

  it('placement() returns the current value', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { placement: 'top-right' });
    expect(bdg.placement()).toBe('top-right');
  });

  it('placement(value) swaps the placement modifier', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { placement: 'inline' });
    bdg.placement('top-right');
    expect(el.classList.contains('arvo-bdg--top-right')).toBe(true);
    expect(el.classList.contains('arvo-bdg--inline')).toBe(false);
    expect(bdg.placement()).toBe('top-right');
  });

  it('placement(invalid) is a no-op', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { placement: 'top-right' });
    bdg.placement('middle' as never);
    expect(bdg.placement()).toBe('top-right');
    expect(el.classList.contains('arvo-bdg--top-right')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

describe('ArvoBadge - variant=label', () => {
  it('renders a __msg span with the message text', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'label', message: 'Approved' });
    const msg = el.querySelector('.arvo-bdg__msg');
    expect(msg).not.toBeNull();
    expect(msg?.textContent).toBe('Approved');
  });

  it('renders the default message when message is omitted', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'label' });
    expect(el.querySelector('.arvo-bdg__msg')?.textContent).toBe('Status Message');
  });

  it('does NOT render __count for label variant', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'label' });
    expect(el.querySelector('.arvo-bdg__count')).toBeNull();
  });
});

describe('ArvoBadge - variant=counter', () => {
  it('applies arvo-bdg--counter class', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', count: 5 });
    expect(el.classList.contains('arvo-bdg--counter')).toBe(true);
  });

  it('applies arvo-bdg--single for counterMode=single', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5 });
    expect(el.classList.contains('arvo-bdg--single')).toBe(true);
  });

  it('applies arvo-bdg--ratio for counterMode=ratio', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 5, total: 100 });
    expect(el.classList.contains('arvo-bdg--ratio')).toBe(true);
  });

  it('renders __count element', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', count: 7 });
    expect(el.querySelector('.arvo-bdg__count')).not.toBeNull();
  });

  it('does NOT render __msg for counter variant', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', count: 5 });
    expect(el.querySelector('.arvo-bdg__msg')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

describe('ArvoBadge - sizes', () => {
  it.each(['sm', 'md', 'lg'] as const)('applies arvo-bdg--%s', (size) => {
    const el = host();
    new ArvoBadge(el, { size });
    expect(el.classList.contains(`arvo-bdg--${size}`)).toBe(true);
  });

  it('does not apply multiple size classes simultaneously', () => {
    const el = host();
    new ArvoBadge(el, { size: 'sm' });
    expect(el.classList.contains('arvo-bdg--md')).toBe(false);
    expect(el.classList.contains('arvo-bdg--lg')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Appearances
// ---------------------------------------------------------------------------

describe('ArvoBadge - appearances', () => {
  it.each(['primary', 'outline', 'filled'] as const)('applies arvo-bdg--%s', (appearance) => {
    const el = host();
    new ArvoBadge(el, { appearance });
    expect(el.classList.contains(`arvo-bdg--${appearance}`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Color modes and semantic types
// ---------------------------------------------------------------------------

describe('ArvoBadge - colorMode=semantic', () => {
  const semanticTypes = ['positive', 'info', 'neutral', 'warning', 'negative', 'block'] as const;

  it.each(semanticTypes)('applies arvo-bdg--%s for semanticType=%s', (type) => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'semantic', semanticType: type });
    expect(el.classList.contains(`arvo-bdg--${type}`)).toBe(true);
  });

  it('semanticType=none applies arvo-bdg--purple (customColor default) not arvo-bdg--none', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'none', customColor: 'purple' });
    expect(el.classList.contains('arvo-bdg--purple')).toBe(true);
    expect(el.classList.contains('arvo-bdg--none')).toBe(false);
  });

  it('semanticType=none with customColor=pink applies arvo-bdg--pink', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'none', customColor: 'pink' });
    expect(el.classList.contains('arvo-bdg--pink')).toBe(true);
  });
});

describe('ArvoBadge - colorMode=custom', () => {
  const customColors = ['purple', 'pink', 'glacier', 'amber', 'greenish', 'bluish'] as const;

  it.each(customColors)('applies arvo-bdg--%s for customColor=%s', (color) => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'custom', customColor: color });
    expect(el.classList.contains(`arvo-bdg--${color}`)).toBe(true);
  });

  it('does NOT apply a semantic type class when colorMode=custom', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'custom', customColor: 'pink', semanticType: 'positive' });
    expect(el.classList.contains('arvo-bdg--positive')).toBe(false);
    expect(el.classList.contains('arvo-bdg--pink')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Leading icon resolution
// ---------------------------------------------------------------------------

describe('ArvoBadge - icon rendering', () => {
  const semanticIconPairs: Array<[string, string]> = [
    ['positive', 'check-circle'],
    ['info', 'info-circle-filled'],
    ['neutral', 'speaker'],
    ['warning', 'exclamation-triangle-filled'],
    ['negative', 'exclamation-circle-filled'],
    ['block', 'blocker-action-filled'],
  ];

  it.each(semanticIconPairs)(
    'semantic mode %s renders __ico with o9con-%s',
    (type, iconName) => {
      const el = host();
      new ArvoBadge(el, { colorMode: 'semantic', semanticType: type as never, hasBadgeIcon: true });
      const ico = el.querySelector('.arvo-bdg__ico');
      expect(ico).not.toBeNull();
      expect(ico?.classList.contains('o9con')).toBe(true);
      expect(ico?.classList.contains(`o9con-${iconName}`)).toBe(true);
      expect(ico?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('icon option overrides the semantic default', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'positive', icon: 'cart', hasBadgeIcon: true });
    const ico = el.querySelector('.arvo-bdg__ico');
    expect(ico?.classList.contains('o9con-cart')).toBe(true);
    expect(ico?.classList.contains('o9con-check-circle')).toBe(false);
  });

  it('hasBadgeIcon=false suppresses the __ico element', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'positive', hasBadgeIcon: false });
    expect(el.querySelector('.arvo-bdg__ico')).toBeNull();
  });

  it('semanticType=none in semantic mode renders no __ico by default', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'none', hasBadgeIcon: true });
    expect(el.querySelector('.arvo-bdg__ico')).toBeNull();
  });

  it('colorMode=custom with no icon renders no __ico', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'custom', customColor: 'pink', hasBadgeIcon: true });
    expect(el.querySelector('.arvo-bdg__ico')).toBeNull();
  });

  it('colorMode=custom with icon renders the __ico', () => {
    const el = host();
    new ArvoBadge(el, { colorMode: 'custom', customColor: 'pink', icon: 'bell', hasBadgeIcon: true });
    const ico = el.querySelector('.arvo-bdg__ico');
    expect(ico).not.toBeNull();
    expect(ico?.classList.contains('o9con-bell')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Counter single - formatting and overflow
// ---------------------------------------------------------------------------

describe('ArvoBadge - counter single formatting', () => {
  it('renders the raw count as text', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 42, overflowCount: 99 });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('42');
  });

  it('renders {overflowCount}+ when count > overflowCount', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 150, overflowCount: 99 });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('99+');
  });

  it('compacts 4000 to 4K with autoFormat=true', () => {
    const el = host();
    new ArvoBadge(el, {
      variant: 'counter',
      counterMode: 'single',
      count: 4000,
      overflowCount: 100000,
      autoFormat: true,
    });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('4K');
  });

  it('groups 4234 to 4,234 with autoFormat=true (non-clean value)', () => {
    const el = host();
    new ArvoBadge(el, {
      variant: 'counter',
      counterMode: 'single',
      count: 4234,
      overflowCount: 100000,
      autoFormat: true,
    });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('4,234');
  });
});

// ---------------------------------------------------------------------------
// Counter single - hideWhenZero
// ---------------------------------------------------------------------------

describe('ArvoBadge - hideWhenZero', () => {
  it('sets host.hidden=true when count=0 and hideWhenZero=true (default)', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 0, hideWhenZero: true });
    expect(el.hidden).toBe(true);
  });

  it('host.hidden=false when count>0 and hideWhenZero=true', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 1, hideWhenZero: true });
    expect(el.hidden).toBe(false);
  });

  it('host.hidden=false when count=0 and hideWhenZero=false', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 0, hideWhenZero: false });
    expect(el.hidden).toBe(false);
  });

  it('hideWhenZero does not apply in ratio mode', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 0, total: 100, hideWhenZero: true });
    expect(el.hidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Counter ratio
// ---------------------------------------------------------------------------

describe('ArvoBadge - counter ratio', () => {
  it('renders __count, __sep (/), and __total', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 2, total: 100 });
    expect(el.querySelector('.arvo-bdg__count')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg__sep')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg__total')).not.toBeNull();
  });

  it('__sep renders "/" and is aria-hidden', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 2, total: 100 });
    const sep = el.querySelector('.arvo-bdg__sep');
    expect(sep?.textContent).toBe('/');
    expect(sep?.getAttribute('aria-hidden')).toBe('true');
  });

  it('__count displays the count value', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 50, total: 1000 });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('50');
  });

  it('__total displays the total value (no autoFormat -> raw integer)', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 50, total: 1000 });
    expect(el.querySelector('.arvo-bdg__total')?.textContent).toBe('1000');
  });

  it('compacts ratio parts with autoFormat=true', () => {
    const el = host();
    new ArvoBadge(el, {
      variant: 'counter',
      counterMode: 'ratio',
      count: 50000,
      total: 1000000,
      autoFormat: true,
    });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('50K');
    expect(el.querySelector('.arvo-bdg__total')?.textContent).toBe('1M');
  });

  it('overflow is NOT applied in ratio mode', () => {
    const el = host();
    new ArvoBadge(el, {
      variant: 'counter',
      counterMode: 'ratio',
      count: 200,
      total: 1000,
      overflowCount: 99,
    });
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('200');
  });
});

// ---------------------------------------------------------------------------
// Animation classes
// ---------------------------------------------------------------------------

describe('ArvoBadge - animation classes', () => {
  it('count(n) setter adds is-increasing when n > previous', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.count(10);
    expect(el.querySelector('.arvo-bdg__count')?.classList.contains('is-increasing')).toBe(true);
  });

  it('count(n) setter adds is-decreasing when n < previous', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 10, hideWhenZero: false });
    bdg.count(5);
    expect(el.querySelector('.arvo-bdg__count')?.classList.contains('is-decreasing')).toBe(true);
  });

  it('increment() adds is-increasing', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.increment();
    expect(el.querySelector('.arvo-bdg__count')?.classList.contains('is-increasing')).toBe(true);
  });

  it('decrement() adds is-decreasing', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.decrement();
    expect(el.querySelector('.arvo-bdg__count')?.classList.contains('is-decreasing')).toBe(true);
  });

  it('count(n) does not add animation class when value is unchanged', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.count(5);
    const countEl = el.querySelector('.arvo-bdg__count');
    expect(countEl?.classList.contains('is-increasing')).toBe(false);
    expect(countEl?.classList.contains('is-decreasing')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// JS methods
// ---------------------------------------------------------------------------

describe('ArvoBadge - count() getter/setter', () => {
  it('count() getter returns the current value', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 42, hideWhenZero: false });
    expect(bdg.count()).toBe(42);
  });

  it('count(n) setter updates __count text', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.count(20);
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('20');
  });

  it('count(n) setter updates hidden state based on hideWhenZero', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: true });
    bdg.count(0);
    expect(el.hidden).toBe(true);
  });
});

describe('ArvoBadge - increment/decrement', () => {
  it('increment() increases count by 1 by default', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.increment();
    expect(bdg.count()).toBe(6);
  });

  it('increment(by) increases count by specified amount', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.increment(5);
    expect(bdg.count()).toBe(10);
  });

  it('decrement() decreases count by 1 by default', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, hideWhenZero: false });
    bdg.decrement();
    expect(bdg.count()).toBe(4);
  });

  it('decrement(by) decreases count by specified amount', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 10, hideWhenZero: false });
    bdg.decrement(3);
    expect(bdg.count()).toBe(7);
  });
});

describe('ArvoBadge - setMessage', () => {
  it('setMessage updates the __msg text', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'label', message: 'Old' });
    bdg.setMessage('New');
    expect(el.querySelector('.arvo-bdg__msg')?.textContent).toBe('New');
  });
});

describe('ArvoBadge - setTotal', () => {
  it('setTotal updates __total text', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 2, total: 100 });
    bdg.setTotal(200);
    expect(el.querySelector('.arvo-bdg__total')?.textContent).toBe('200');
  });

  it('setTotal updates aria-label', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 2, total: 100 });
    bdg.setTotal(500);
    expect(el.getAttribute('aria-label')).toBe('2 out of 500');
  });
});

describe('ArvoBadge - setOverflowCount', () => {
  it('setOverflowCount re-renders count text with new threshold', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 50, overflowCount: 99, hideWhenZero: false });
    bdg.setOverflowCount(40);
    expect(el.querySelector('.arvo-bdg__count')?.textContent).toBe('40+');
  });

  it('setOverflowCount updates aria-label when overflow now applies', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 50, overflowCount: 99, hideWhenZero: false });
    bdg.setOverflowCount(40);
    expect(el.getAttribute('aria-label')).toBe('40 or more');
  });
});

describe('ArvoBadge - setVariant', () => {
  it('setVariant switches from label to counter', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'label' });
    bdg.setVariant('counter');
    expect(el.classList.contains('arvo-bdg--counter')).toBe(true);
    expect(el.classList.contains('arvo-bdg--label')).toBe(false);
    expect(el.querySelector('.arvo-bdg__count')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg__msg')).toBeNull();
  });

  it('setVariant switches from counter to label', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', count: 5, hideWhenZero: false });
    bdg.setVariant('label');
    expect(el.classList.contains('arvo-bdg--label')).toBe(true);
    expect(el.classList.contains('arvo-bdg--counter')).toBe(false);
    expect(el.querySelector('.arvo-bdg__msg')).not.toBeNull();
    expect(el.querySelector('.arvo-bdg__count')).toBeNull();
  });
});

describe('ArvoBadge - setSize', () => {
  it('setSize swaps the size modifier', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { size: 'md' });
    bdg.setSize('lg');
    expect(el.classList.contains('arvo-bdg--lg')).toBe(true);
    expect(el.classList.contains('arvo-bdg--md')).toBe(false);
  });
});

describe('ArvoBadge - setAppearance', () => {
  it('setAppearance swaps the appearance modifier', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { appearance: 'primary' });
    bdg.setAppearance('filled');
    expect(el.classList.contains('arvo-bdg--filled')).toBe(true);
    expect(el.classList.contains('arvo-bdg--primary')).toBe(false);
  });
});

describe('ArvoBadge - setColorMode', () => {
  it('setColorMode(custom) applies customColor class and removes semantic class', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'positive' });
    bdg.setColorMode('custom');
    expect(el.classList.contains('arvo-bdg--purple')).toBe(true);
    expect(el.classList.contains('arvo-bdg--positive')).toBe(false);
  });

  it('setColorMode(custom) removes the semantic icon', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'positive', hasBadgeIcon: true });
    bdg.setColorMode('custom');
    expect(el.querySelector('.arvo-bdg__ico')).toBeNull();
  });

  it('setColorMode(semantic) re-applies semantic color class', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { colorMode: 'custom', customColor: 'pink', semanticType: 'positive' });
    bdg.setColorMode('semantic');
    expect(el.classList.contains('arvo-bdg--positive')).toBe(true);
    expect(el.classList.contains('arvo-bdg--pink')).toBe(false);
  });
});

describe('ArvoBadge - setSemanticType', () => {
  it('setSemanticType swaps color class and icon', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { colorMode: 'semantic', semanticType: 'positive', hasBadgeIcon: true });
    bdg.setSemanticType('negative');
    expect(el.classList.contains('arvo-bdg--negative')).toBe(true);
    expect(el.classList.contains('arvo-bdg--positive')).toBe(false);
    expect(el.querySelector('.arvo-bdg__ico')?.classList.contains('o9con-exclamation-circle-filled')).toBe(true);
  });
});

describe('ArvoBadge - setCustomColor', () => {
  it('setCustomColor swaps the color class in custom mode', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { colorMode: 'custom', customColor: 'purple' });
    bdg.setCustomColor('pink');
    expect(el.classList.contains('arvo-bdg--pink')).toBe(true);
    expect(el.classList.contains('arvo-bdg--purple')).toBe(false);
  });
});

describe('ArvoBadge - setTooltip', () => {
  it('setTooltip updates aria-label and title', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'label' });
    bdg.setTooltip('My label');
    expect(el.getAttribute('aria-label')).toBe('My label');
    expect(el.getAttribute('title')).toBe('My label');
  });

  it('setTooltip(null) removes title and reverts to auto aria-label for counter', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 5, tooltip: 'Custom', hideWhenZero: false });
    bdg.setTooltip(null);
    expect(el.getAttribute('title')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('5');
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('ArvoBadge - accessibility', () => {
  it('tooltip sets both aria-label and title', () => {
    const el = host();
    new ArvoBadge(el, { tooltip: 'Approved status' });
    expect(el.getAttribute('aria-label')).toBe('Approved status');
    expect(el.getAttribute('title')).toBe('Approved status');
  });

  it('counter single overflow auto-generates aria-label as "{overflowCount} or more"', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 150, overflowCount: 99 });
    expect(el.getAttribute('aria-label')).toBe('99 or more');
  });

  it('counter single normal auto-generates aria-label as the count string', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 7, overflowCount: 99 });
    expect(el.getAttribute('aria-label')).toBe('7');
  });

  it('counter ratio auto-generates aria-label as "{count} out of {total}"', () => {
    const el = host();
    new ArvoBadge(el, { variant: 'counter', counterMode: 'ratio', count: 2, total: 100 });
    expect(el.getAttribute('aria-label')).toBe('2 out of 100');
  });

  it('role=alert applies', () => {
    const el = host();
    new ArvoBadge(el, { role: 'alert' });
    expect(el.getAttribute('role')).toBe('alert');
  });

  it('axe: no violations on a representative label badge', async () => {
    const el = host();
    new ArvoBadge(el, { variant: 'label', message: 'Approved', tooltip: 'Approved status' });
    const results = await axe.run(document.body);
    const violations = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  it('axe: no violations on a representative counter badge', async () => {
    const el2 = host();
    new ArvoBadge(el2, { variant: 'counter', counterMode: 'single', count: 5, overflowCount: 99 });
    const results = await axe.run(document.body);
    const violations = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// setStatus
// ---------------------------------------------------------------------------

describe('ArvoBadge - setStatus', () => {
  it('renders an embedded .arvo-sts child when hasStatus=true at init', () => {
    const el = host();
    new ArvoBadge(el, { hasStatus: true, statusType: 'available', statusPosition: 'top-right' });
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
  });

  it('does NOT render .arvo-sts when hasStatus=false', () => {
    const el = host();
    new ArvoBadge(el, { hasStatus: false });
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('setStatus adds an .arvo-sts child', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { hasStatus: false });
    bdg.setStatus({ type: 'available' });
    expect(el.querySelector('.arvo-sts')).not.toBeNull();
  });

  it('setStatus(false) removes the .arvo-sts child', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { hasStatus: true, statusType: 'available' });
    bdg.setStatus(false);
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('embedded status position class defaults to top-right', () => {
    const el = host();
    new ArvoBadge(el, { hasStatus: true, statusType: 'available', statusPosition: 'top-right' });
    expect(el.querySelector('.arvo-sts')?.classList.contains('arvo-sts--top-right')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

describe('ArvoBadge - destroy', () => {
  it('removes inner DOM from the host', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'label', message: 'Hello' });
    bdg.destroy();
    expect(el.querySelector('.arvo-bdg__msg')).toBeNull();
  });

  it('removes BEM classes from the host', () => {
    const el = host();
    const bdg = new ArvoBadge(el);
    bdg.destroy();
    expect(el.className).toBe('');
  });

  it('removes role attribute', () => {
    const el = host();
    const bdg = new ArvoBadge(el);
    bdg.destroy();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('removes aria-label', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', count: 5 });
    bdg.destroy();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('resets hidden to false', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { variant: 'counter', counterMode: 'single', count: 0, hideWhenZero: true });
    bdg.destroy();
    expect(el.hidden).toBe(false);
  });

  it('destroys embedded ArvoStatus', () => {
    const el = host();
    const bdg = new ArvoBadge(el, { hasStatus: true, statusType: 'available' });
    bdg.destroy();
    expect(el.querySelector('.arvo-sts')).toBeNull();
  });

  it('does not throw when destroyed twice', () => {
    const el = host();
    const bdg = new ArvoBadge(el);
    bdg.destroy();
    expect(() => bdg.destroy()).not.toThrow();
  });
});
