// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import {
  ArvoStatus,
  ARVO_STATUS_TYPES,
  ARVO_STATUS_TYPE_REGISTRY,
  ARVO_STATUS_PLACEMENTS,
  resolveStatusIcon,
  resolveStatusLabel,
  type ArvoStatusType,
} from './Status';

function host(): HTMLElement {
  const el = document.createElement('span');
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoStatus - initialize', () => {
  it('static initialize() returns an instance', () => {
    const sts = ArvoStatus.initialize(host());
    expect(sts).toBeInstanceOf(ArvoStatus);
  });

  it('initialize(null) creates a fresh span', () => {
    const sts = ArvoStatus.initialize(null);
    expect(sts.el.tagName).toBe('SPAN');
  });

  it('decorates the host element with the .arvo-sts class', () => {
    const el = host();
    new ArvoStatus(el);
    expect(el.classList.contains('arvo-sts')).toBe(true);
  });

  it('renders an inner __ico with the o9con o9con-{name} classes', () => {
    const el = host();
    new ArvoStatus(el, { type: 'available' });
    const ico = el.querySelector('.arvo-sts__ico');
    expect(ico).not.toBeNull();
    expect(ico?.classList.contains('o9con')).toBe(true);
    expect(ico?.classList.contains('o9con-basicshape-circle')).toBe(true);
    expect(ico?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sets role="img"', () => {
    const el = host();
    new ArvoStatus(el);
    expect(el.getAttribute('role')).toBe('img');
  });
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('ArvoStatus - defaults', () => {
  it('defaults type to positive', () => {
    const el = host();
    new ArvoStatus(el);
    expect(el.classList.contains('arvo-sts--positive')).toBe(true);
  });

  it('defaults size to lg', () => {
    const el = host();
    new ArvoStatus(el);
    expect(el.classList.contains('arvo-sts--lg')).toBe(true);
  });

  it('defaults placement to inline (no overlay positioning)', () => {
    const el = host();
    new ArvoStatus(el);
    expect(el.classList.contains('arvo-sts--inline')).toBe(true);
    expect(el.classList.contains('arvo-sts--top-right')).toBe(false);
    expect(el.classList.contains('arvo-sts--bottom-right')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

describe('ArvoStatus - placement', () => {
  it('exposes a placements registry of all three values', () => {
    expect(ARVO_STATUS_PLACEMENTS).toEqual(['inline', 'top-right', 'bottom-right']);
  });

  it.each(ARVO_STATUS_PLACEMENTS)('always emits arvo-sts--%s when placement=%s', (placement) => {
    const el = host();
    new ArvoStatus(el, { placement });
    expect(el.classList.contains(`arvo-sts--${placement}`)).toBe(true);
  });

  it('emits exactly one placement modifier (inline)', () => {
    const el = host();
    new ArvoStatus(el, { placement: 'inline' });
    expect(el.classList.contains('arvo-sts--inline')).toBe(true);
    expect(el.classList.contains('arvo-sts--top-right')).toBe(false);
    expect(el.classList.contains('arvo-sts--bottom-right')).toBe(false);
  });

  it('emits exactly one placement modifier (top-right)', () => {
    const el = host();
    new ArvoStatus(el, { placement: 'top-right' });
    expect(el.classList.contains('arvo-sts--top-right')).toBe(true);
    expect(el.classList.contains('arvo-sts--inline')).toBe(false);
    expect(el.classList.contains('arvo-sts--bottom-right')).toBe(false);
  });

  it('emits exactly one placement modifier (bottom-right)', () => {
    const el = host();
    new ArvoStatus(el, { placement: 'bottom-right' });
    expect(el.classList.contains('arvo-sts--bottom-right')).toBe(true);
    expect(el.classList.contains('arvo-sts--inline')).toBe(false);
    expect(el.classList.contains('arvo-sts--top-right')).toBe(false);
  });

  it('falls back to inline for an invalid placement value', () => {
    const el = host();
    new ArvoStatus(el, { placement: 'middle' as never });
    expect(el.classList.contains('arvo-sts--inline')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

describe('ArvoStatus - types', () => {
  it('registry exposes all 19 types', () => {
    expect(ARVO_STATUS_TYPES.length).toBe(19);
    expect(Object.keys(ARVO_STATUS_TYPE_REGISTRY).length).toBe(19);
  });

  it.each(ARVO_STATUS_TYPES)('applies arvo-sts--%s modifier', (type) => {
    const el = host();
    new ArvoStatus(el, { type });
    expect(el.classList.contains(`arvo-sts--${type}`)).toBe(true);
  });

  it('falls back to positive for an invalid type', () => {
    const el = host();
    new ArvoStatus(el, { type: 'invalid' as never });
    expect(el.classList.contains('arvo-sts--positive')).toBe(true);
  });

  it('locked-icon types render the correct icon', () => {
    const samples: Array<[ArvoStatusType, string]> = [
      ['available', 'o9con-basicshape-circle'],
      ['notAvailable', 'o9con-circle-shape'],
      ['partialComplete', 'o9con-adjust'],
      ['busy', 'o9con-minus-circle'],
      ['failed', 'o9con-times-circle'],
      ['blocked', 'o9con-blocker-action-filled'],
      ['attention', 'o9con-basicshape-circle'],
      ['loading', 'o9con-spinner'],
      ['paused', 'o9con-on-hold'],
      ['critical', 'o9con-square'],
      ['high', 'o9con-chevron-circle-up'],
      ['medium', 'o9con-basicshape-hexagon'],
      ['low', 'o9con-chevron-circle-down'],
      ['unknown', 'o9con-question-circle'],
    ];
    for (const [type, iconClass] of samples) {
      const el = host();
      new ArvoStatus(el, { type });
      expect(el.querySelector('.arvo-sts__ico')!.classList.contains(iconClass)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Icon override
// ---------------------------------------------------------------------------

describe('ArvoStatus - icon override', () => {
  it.each(['positive', 'negative', 'warning', 'info', 'neutral'] as const)(
    'honors override for overridable type %s',
    (type) => {
      const el = host();
      new ArvoStatus(el, { type, icon: 'star' });
      expect(el.querySelector('.arvo-sts__ico')!.classList.contains('o9con-star')).toBe(true);
    },
  );

  it('ignores override for locked-icon types', () => {
    const el = host();
    new ArvoStatus(el, { type: 'available', icon: 'star' });
    const ico = el.querySelector('.arvo-sts__ico')!;
    expect(ico.classList.contains('o9con-basicshape-circle')).toBe(true);
    expect(ico.classList.contains('o9con-star')).toBe(false);
  });

  it('neutral with no icon falls back to camera-retro', () => {
    const el = host();
    new ArvoStatus(el, { type: 'neutral' });
    expect(el.querySelector('.arvo-sts__ico')!.classList.contains('o9con-camera-retro')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tooltip / aria
// ---------------------------------------------------------------------------

describe('ArvoStatus - tooltip', () => {
  it('defaults aria-label and title to the type label', () => {
    const el = host();
    new ArvoStatus(el, { type: 'failed' });
    expect(el.getAttribute('aria-label')).toBe('Failed');
    expect(el.getAttribute('title')).toBe('Failed');
  });

  it('uses the tooltip when supplied', () => {
    const el = host();
    new ArvoStatus(el, { type: 'failed', tooltip: 'Build broke' });
    expect(el.getAttribute('aria-label')).toBe('Build broke');
    expect(el.getAttribute('title')).toBe('Build broke');
  });
});

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

describe('ArvoStatus - methods', () => {
  it('setType swaps the type modifier and the locked icon', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'available' });
    sts.setType('failed');
    expect(el.classList.contains('arvo-sts--failed')).toBe(true);
    expect(el.classList.contains('arvo-sts--available')).toBe(false);
    expect(el.querySelector('.arvo-sts__ico')!.classList.contains('o9con-times-circle')).toBe(true);
  });

  it('setType updates default label when no tooltip is pinned', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'available' });
    sts.setType('failed');
    expect(el.getAttribute('aria-label')).toBe('Failed');
  });

  it('setType keeps an explicit tooltip intact', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'available', tooltip: 'Custom' });
    sts.setType('failed');
    expect(el.getAttribute('aria-label')).toBe('Custom');
  });

  it('setSize swaps the size modifier', () => {
    const el = host();
    const sts = new ArvoStatus(el);
    sts.setSize('sm');
    expect(el.classList.contains('arvo-sts--sm')).toBe(true);
    expect(el.classList.contains('arvo-sts--lg')).toBe(false);
  });

  it('placement() returns the current value', () => {
    const el = host();
    const sts = new ArvoStatus(el, { placement: 'top-right' });
    expect(sts.placement()).toBe('top-right');
  });

  it('placement(value) swaps the placement modifier', () => {
    const el = host();
    const sts = new ArvoStatus(el, { placement: 'top-right' });
    sts.placement('bottom-right');
    expect(el.classList.contains('arvo-sts--bottom-right')).toBe(true);
    expect(el.classList.contains('arvo-sts--top-right')).toBe(false);
    expect(sts.placement()).toBe('bottom-right');
  });

  it('placement(value) swaps to inline and drops overlay modifiers', () => {
    const el = host();
    const sts = new ArvoStatus(el, { placement: 'bottom-right' });
    sts.placement('inline');
    expect(el.classList.contains('arvo-sts--inline')).toBe(true);
    expect(el.classList.contains('arvo-sts--bottom-right')).toBe(false);
    expect(el.classList.contains('arvo-sts--top-right')).toBe(false);
  });

  it('placement(invalid) is a no-op', () => {
    const el = host();
    const sts = new ArvoStatus(el, { placement: 'top-right' });
    sts.placement('middle' as never);
    expect(sts.placement()).toBe('top-right');
    expect(el.classList.contains('arvo-sts--top-right')).toBe(true);
  });

  it('setIcon updates the icon for overridable types', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'positive' });
    sts.setIcon('star');
    expect(el.querySelector('.arvo-sts__ico')!.classList.contains('o9con-star')).toBe(true);
  });

  it('setIcon(null) reverts to the type default for overridable types', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'positive', icon: 'star' });
    sts.setIcon(null);
    expect(el.querySelector('.arvo-sts__ico')!.classList.contains('o9con-check-circle')).toBe(true);
  });

  it('setTooltip updates aria-label and title', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'available' });
    sts.setTooltip('Online');
    expect(el.getAttribute('aria-label')).toBe('Online');
    expect(el.getAttribute('title')).toBe('Online');
  });

  it('setTooltip(null) reverts to the type default label', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'available', tooltip: 'Online' });
    sts.setTooltip(null);
    expect(el.getAttribute('aria-label')).toBe('Available');
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ArvoStatus - destroy', () => {
  it('removes inner DOM and decorations from the host', () => {
    const el = host();
    const sts = new ArvoStatus(el, { type: 'available' });
    sts.destroy();
    expect(el.querySelector('.arvo-sts__ico')).toBeNull();
    expect(el.className).toBe('');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('title')).toBeNull();
  });

  it('does not throw when destroyed twice', () => {
    const sts = ArvoStatus.initialize(host());
    sts.destroy();
    expect(() => sts.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

describe('ArvoStatus - resolution helpers', () => {
  it('resolveStatusIcon mirrors React semantics', () => {
    expect(resolveStatusIcon('available', 'star')).toBe('basicshape-circle');
    expect(resolveStatusIcon('positive', 'star')).toBe('star');
    expect(resolveStatusIcon('neutral')).toBe('camera-retro');
  });

  it('resolveStatusLabel returns the type label', () => {
    expect(resolveStatusLabel('attention')).toBe('Attention');
    expect(resolveStatusLabel('unknown')).toBe('Unknown');
  });
});
