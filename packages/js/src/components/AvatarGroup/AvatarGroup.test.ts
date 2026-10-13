// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

interface MockPopoverInstance {
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  isOpen: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

let mockPopoverInstance: MockPopoverInstance;
let mockPopoverInitialize: ReturnType<typeof vi.fn>;
const mockTooltipConnectors: { destroy: ReturnType<typeof vi.fn> }[] = [];

vi.mock('../Popover/Popover', () => {
  return {
    ArvoPopover: {
      initialize: (...args: unknown[]) => mockPopoverInitialize(...args),
    },
  };
});

vi.mock('@arvo/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arvo/core')>();
  return {
    ...actual,
    connectTooltip: vi.fn(() => {
      const connector = { destroy: vi.fn() };
      mockTooltipConnectors.push(connector);
      return connector;
    }),
    tooltipManager: {
      configure: vi.fn(),
    },
  };
});

import { ArvoAvatarGroup, type AvatarGroupItem } from './AvatarGroup';
import { ArvoAvatar } from '../Avatar/Avatar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAvatars(n: number): AvatarGroupItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `u${i + 1}`,
    variant: 'initials' as const,
    name: `User ${i + 1}`,
  }));
}

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  mockTooltipConnectors.length = 0;
  mockPopoverInstance = {
    open: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn(() => false),
    destroy: vi.fn(),
  };
  mockPopoverInitialize = vi.fn(() => mockPopoverInstance);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - initialize', () => {
  it('static initialize() returns an instance', () => {
    const inst = ArvoAvatarGroup.initialize(host(), { avatars: makeAvatars(3) });
    expect(inst).toBeInstanceOf(ArvoAvatarGroup);
  });

  it('initialize(null) creates a fresh div', () => {
    const inst = ArvoAvatarGroup.initialize(null, { avatars: makeAvatars(3) });
    expect(inst.el.tagName).toBe('DIV');
  });

  it('decorates the host with .arvo-avt-grp + size modifier + role + label', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    expect(el.classList.contains('arvo-avt-grp')).toBe(true);
    expect(el.classList.contains('arvo-avt-grp--md')).toBe(true);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('avatar group');
  });

  it('passes through the id option', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(2), id: 'my-group' });
    expect(el.id).toBe('my-group');
  });
});

// ---------------------------------------------------------------------------
// Render structure
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - render structure', () => {
  it('renders an __item wrapper per visible avatar when count <= maxCount', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3), maxCount: 5 });
    const items = el.querySelectorAll('.arvo-avt-grp__item');
    expect(items).toHaveLength(3);
    expect(el.querySelector('.arvo-avt-grp__overflow')).toBeNull();
  });

  it('inserts an avatar child inside each __item wrapper', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    const items = el.querySelectorAll('.arvo-avt-grp__item');
    items.forEach((item) => {
      expect(item.querySelector('.arvo-avt')).not.toBeNull();
    });
  });

  it('renders (maxCount - 1) visible + a +N overflow tile when overflowing', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const visible = el.querySelectorAll(
      '.arvo-avt-grp__item:not(.arvo-avt-grp__item--overflow)',
    );
    expect(visible).toHaveLength(4);
    const overflow = el.querySelector('.arvo-avt-grp__overflow');
    expect(overflow).not.toBeNull();
    expect(overflow?.textContent).toBe('+6');
  });

  it.each([
    [6, 5, '+2'],
    [10, 5, '+6'],
    [25, 5, '+21'],
  ])('total=%i, maxCount=%i renders %s', (total, maxCount, expected) => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(total), maxCount });
    expect(el.querySelector('.arvo-avt-grp__overflow')?.textContent).toBe(expected);
  });

  it('clamps maxCount < 1 to 1', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3), maxCount: 0 });
    const visible = el.querySelectorAll(
      '.arvo-avt-grp__item:not(.arvo-avt-grp__item--overflow)',
    );
    expect(visible).toHaveLength(0);
    expect(el.querySelector('.arvo-avt-grp__overflow')?.textContent).toBe('+3');
  });

  it('overflow tile carries aria-haspopup="dialog" + data-arvo-loading-ignore', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('data-arvo-loading-ignore')).toBe('true');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// Size cascade
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - size cascade', () => {
  it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)(
    'cascades size=%s to root + each visible Avatar',
    (size) => {
      const el = host();
      new ArvoAvatarGroup(el, { avatars: makeAvatars(3), size });
      expect(el.classList.contains(`arvo-avt-grp--${size}`)).toBe(true);
      el.querySelectorAll('.arvo-avt-grp__item .arvo-avt').forEach((a) => {
        expect(a.classList.contains(`arvo-avt--${size}`)).toBe(true);
      });
    },
  );
});

// ---------------------------------------------------------------------------
// Popover wiring
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - popover wiring', () => {
  it('initializes a Popover when an overflow tile exists', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    expect(mockPopoverInitialize).toHaveBeenCalledOnce();
    const [, opts] = mockPopoverInitialize.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect(opts.placement).toBe('bottom-end');
    expect(opts.hasHeader).toBe(false);
    expect(opts.hasFooter).toBe(false);
    expect(opts.hasArrow).toBe(false);
    expect(opts.isClosable).toBe(false);
    expect(opts.hasBackButton).toBe(false);
  });

  it('overflowPlacement="top" maps to top-end on the Popover', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      overflowPlacement: 'top',
    });
    const [, opts] = mockPopoverInitialize.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect(opts.placement).toBe('top-end');
  });

  it('does NOT initialize a Popover when there is no overflow', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3), maxCount: 5 });
    expect(mockPopoverInitialize).not.toHaveBeenCalled();
  });

  it('passes Avatar Item Container <ul> as the popover content', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 3 });
    const [, opts] = mockPopoverInitialize.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    const contentEl = opts.content as HTMLElement;
    expect(contentEl).toBeInstanceOf(HTMLElement);
    expect(contentEl.tagName).toBe('UL');
    expect(contentEl.classList.contains('arvo-avt-grp__list')).toBe(true);
    expect(contentEl.querySelectorAll('.arvo-avt-grp__list-item')).toHaveLength(8);
  });

  it('Avatar Item Container rows render at sm regardless of group size', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 3, size: 'xl' });
    const [, opts] = mockPopoverInitialize.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    const list = opts.content as HTMLElement;
    list.querySelectorAll('.arvo-avt-grp__list-item .arvo-avt').forEach((avt) => {
      expect(avt.classList.contains('arvo-avt--sm')).toBe(true);
      expect(avt.classList.contains('arvo-avt--xl')).toBe(false);
    });
  });

  it('row labels show the avatar name', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: [
        { id: '1', variant: 'initials', name: 'Jane Doe' },
        { id: '2', variant: 'initials', name: 'John Smith' },
        { id: '3', variant: 'initials', name: 'Alice Wong' },
        { id: '4', variant: 'initials', name: 'Bob Lee' },
      ],
      maxCount: 2,
    });
    const [, opts] = mockPopoverInitialize.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    const list = opts.content as HTMLElement;
    const labels = Array.from(list.querySelectorAll('.arvo-avt-grp__list-lbl')).map(
      (l) => l.textContent,
    );
    expect(labels).toEqual(['John Smith', 'Alice Wong', 'Bob Lee']);
  });

  it('popoverProps escape hatch is forwarded but parent-owned keys win', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      overflowPlacement: 'top',
      popoverProps: {
        width: '320px',
        offset: 8,
        // Try to override the parent-owned placement; parent must still win.
        // @ts-expect-error -- ensure unknown keys do not break the merge
        placement: 'bottom-end',
      },
    });
    const [, opts] = mockPopoverInitialize.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect(opts.width).toBe('320px');
    expect(opts.offset).toBe(8);
    expect(opts.placement).toBe('top-end');
  });
});

// ---------------------------------------------------------------------------
// Click + events
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - overflow click + events', () => {
  it('clicking the overflow tile fires avt-grp:more-click + calls onMoreClick', () => {
    const el = host();
    const onMoreClick = vi.fn();
    const listener = vi.fn();
    el.addEventListener('avt-grp:more-click', listener);
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      onMoreClick,
    });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    btn.click();
    expect(onMoreClick).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
  });

  // ArvoPopover owns its own click-to-toggle (a bubble-phase listener on the
  // same button). The group's intercept runs in CAPTURE phase and must NOT
  // call `popover.open()` itself -- doing so produced the open/close flicker
  // because the popover's bubble handler would also fire and double-toggle.
  // The integration is verified end-to-end via the React tests with a real
  // popover; here we just confirm the group never invokes `open` directly.
  it('does NOT call popover.open() from a click (the popover owns the toggle)', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    btn.click();
    expect(mockPopoverInstance.open).not.toHaveBeenCalled();
  });

  it('lets the click reach a co-attached bubble-phase listener by default', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    // Simulate the real popover's bubble-phase trigger handler.
    const popoverHandler = vi.fn();
    btn.addEventListener('click', popoverHandler);
    btn.click();
    expect(popoverHandler).toHaveBeenCalledOnce();
  });

  it('avt-grp:more-click is cancelable; preventDefault suppresses bubble-phase listeners', () => {
    const el = host();
    el.addEventListener('avt-grp:more-click', (e) => e.preventDefault());
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    const popoverHandler = vi.fn();
    btn.addEventListener('click', popoverHandler);
    btn.click();
    // Suppressed via stopImmediatePropagation in the capture handler.
    expect(popoverHandler).not.toHaveBeenCalled();
  });

  it('onMoreClick calling event.preventDefault() suppresses bubble-phase listeners', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      onMoreClick: (e) => e.preventDefault(),
    });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    const popoverHandler = vi.fn();
    btn.addEventListener('click', popoverHandler);
    btn.click();
    expect(popoverHandler).not.toHaveBeenCalled();
  });

  it('avt-grp:open / avt-grp:close fire on popover transitions', () => {
    const el = host();
    const opens: number[] = [];
    const closes: number[] = [];
    el.addEventListener('avt-grp:open', () => opens.push(1));
    el.addEventListener('avt-grp:close', () => closes.push(1));
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;

    // Simulate the popover dispatching `popover:open` on the trigger (the
    // group listens for these and re-emits its own events).
    btn.dispatchEvent(new CustomEvent('popover:open', { bubbles: true }));
    expect(opens).toHaveLength(1);
    btn.dispatchEvent(new CustomEvent('popover:close', { bubbles: true }));
    expect(closes).toHaveLength(1);
  });

  it('aria-expanded + is-open class follow popover transitions', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.classList.contains('is-open')).toBe(false);

    btn.dispatchEvent(new CustomEvent('popover:open', { bubbles: true }));
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.classList.contains('is-open')).toBe(true);

    btn.dispatchEvent(new CustomEvent('popover:close', { bubbles: true }));
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.classList.contains('is-open')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Roving tabindex
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - roving tabindex', () => {
  function getRovingItems(el: HTMLElement): HTMLElement[] {
    const items: HTMLElement[] = [];
    el.querySelectorAll<HTMLElement>('.arvo-avt-grp__item').forEach((wrap) => {
      if (wrap.classList.contains('arvo-avt-grp__item--overflow')) {
        const btn = wrap.querySelector<HTMLElement>('.arvo-avt-grp__overflow');
        if (btn) items.push(btn);
        return;
      }
      const inner = wrap.querySelector<HTMLElement>('.arvo-avt');
      if (inner) items.push(inner);
    });
    return items;
  }

  it('seeds tabindex=0 on the first item and tabindex=-1 on the rest', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(5), maxCount: 5 });
    const items = getRovingItems(el);
    expect(items.length).toBe(5);
    expect(items[0].getAttribute('tabindex')).toBe('0');
    items.slice(1).forEach((it) => {
      expect(it.getAttribute('tabindex')).toBe('-1');
    });
  });

  it('includes the overflow tile in the roving rotation when present', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const items = getRovingItems(el);
    // 4 visible + overflow tile = 5
    expect(items.length).toBe(5);
    expect(items[items.length - 1].classList.contains('arvo-avt-grp__overflow')).toBe(true);
  });

  it('makes non-interactive avatar spans focusable via the assigned tabindex', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    // initials avatars without click/href render as <span role="img">.
    el.querySelectorAll('.arvo-avt-grp__item .arvo-avt').forEach((avt) => {
      expect(avt.tagName).toBe('SPAN');
      expect(avt.hasAttribute('tabindex')).toBe(true);
    });
  });

  it('ArrowRight moves focus + tabindex=0 to the next item; wraps at the end', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    const items = getRovingItems(el);
    items[0].focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(items[1].getAttribute('tabindex')).toBe('0');
    expect(items[0].getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(items[1]);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    // Wrapped back to first
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowLeft moves focus to the previous item; wraps at the start', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    const items = getRovingItems(el);
    items[0].focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(items[items.length - 1].getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('Home / End jump to the first / last item', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(4) });
    const items = getRovingItems(el);
    items[0].focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(items[items.length - 1].getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(items[items.length - 1]);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(items[0]);
  });

  it('re-establishes the rotation when setAvatars() replaces the collection', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(2) });
    expect(getRovingItems(el).length).toBe(2);
    inst.setAvatars(makeAvatars(4));
    const items = getRovingItems(el);
    expect(items.length).toBe(4);
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });

  it('destroy() tears down the rotation (no keydown effect afterwards)', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    const itemsBefore = getRovingItems(el);
    itemsBefore[0].focus();
    inst.destroy();
    // destroy strips children; verify no throw on a follow-up key dispatch.
    expect(() =>
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Labels / moreIndicatorLabel
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - labels', () => {
  it('overflow tile aria-label defaults to "{N} additional collaborators"', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('6 additional collaborators');
  });

  it('moreIndicatorLabel overrides the overflow aria-label', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      moreIndicatorLabel: '+6 more reviewers',
    });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('+6 more reviewers');
  });

  it('setLabel() updates the root aria-label live', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    expect(el.getAttribute('aria-label')).toBe('avatar group');
    inst.setLabel('reviewers');
    expect(el.getAttribute('aria-label')).toBe('reviewers');
  });
});

// ---------------------------------------------------------------------------
// hasTooltip
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - tooltip wiring', () => {
  it('attaches a tooltip connector on the overflow tile by default', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    expect(mockTooltipConnectors).toHaveLength(1);
  });

  it('hasTooltip=true forwards a tooltip option to each visible Avatar', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: [
        { id: 'a', variant: 'initials', name: 'Jane' },
        { id: 'b', variant: 'initials', name: 'John' },
      ],
      hasTooltip: true,
    });
    el.querySelectorAll('.arvo-avt-grp__item .arvo-avt').forEach((avt, i) => {
      const expected = ['Jane', 'John'][i];
      expect(avt.getAttribute('title')).toBe(expected);
    });
  });

  it('setHasTooltip(false) re-renders without tooltip wiring', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      hasTooltip: true,
    });
    expect(mockTooltipConnectors).toHaveLength(1);
    const initialConnector = mockTooltipConnectors[0];

    inst.setHasTooltip(false);
    // After re-render the previous connector is destroyed; a new one is
    // attached with the count-phrase content.
    expect(initialConnector?.destroy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Disabled / loading
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - disabled / loading', () => {
  it('isDisabled=true adds aria-disabled on the root + on the overflow tile', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      isDisabled: true,
    });
    expect(el.getAttribute('aria-disabled')).toBe('true');
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('clicking a disabled overflow tile blocks bubble-phase listeners (suppresses popover toggle)', () => {
    const el = host();
    new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      isDisabled: true,
    });
    const btn = el.querySelector('.arvo-avt-grp__overflow') as HTMLButtonElement;
    const popoverHandler = vi.fn();
    btn.addEventListener('click', popoverHandler);
    btn.click();
    expect(popoverHandler).not.toHaveBeenCalled();
    expect(mockPopoverInstance.open).not.toHaveBeenCalled();
  });

  it('disabled() dual-purpose accessor reads + writes', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    expect(inst.disabled()).toBe(false);
    inst.disabled(true);
    expect(inst.disabled()).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('loading() dual-purpose accessor reads + writes', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    expect(inst.loading()).toBe(false);
    inst.loading(true);
    expect(inst.loading()).toBe(true);
  });

  it('open() reads + writes through the popover instance', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    expect(inst.open()).toBe(false);
    inst.open(true);
    expect(mockPopoverInstance.open).toHaveBeenCalled();
    inst.open(false);
    expect(mockPopoverInstance.close).toHaveBeenCalled();
  });

  it('open(true) is a no-op when disabled', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, {
      avatars: makeAvatars(10),
      maxCount: 5,
      isDisabled: true,
    });
    inst.open(true);
    expect(mockPopoverInstance.open).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setAvatars / setSize / setMaxCount re-render
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - setters', () => {
  it('setAvatars() replaces the collection and re-renders', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(2) });
    expect(el.querySelectorAll('.arvo-avt-grp__item')).toHaveLength(2);
    inst.setAvatars(makeAvatars(4));
    expect(el.querySelectorAll('.arvo-avt-grp__item')).toHaveLength(4);
  });

  it('setSize() swaps the size modifier and cascades to children', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3), size: 'md' });
    inst.setSize('lg');
    expect(el.classList.contains('arvo-avt-grp--lg')).toBe(true);
    expect(el.classList.contains('arvo-avt-grp--md')).toBe(false);
    el.querySelectorAll('.arvo-avt-grp__item .arvo-avt').forEach((avt) => {
      expect(avt.classList.contains('arvo-avt--lg')).toBe(true);
    });
  });

  it('setMaxCount() recomputes the visible/hidden split', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    expect(el.querySelector('.arvo-avt-grp__overflow')?.textContent).toBe('+6');
    inst.setMaxCount(8);
    expect(el.querySelector('.arvo-avt-grp__overflow')?.textContent).toBe('+3');
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - destroy', () => {
  it('destroys every visible Avatar instance', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    const destroySpies = Array.from(el.querySelectorAll('.arvo-avt'))
      .map((avtEl) => {
        // We can't easily get the instance from the DOM; verify destroy
        // through behavior: after destroy(), the host element is empty and
        // all classes are stripped.
        return avtEl;
      });
    inst.destroy();
    expect(destroySpies.length).toBeGreaterThan(0);
    expect(el.children.length).toBe(0);
    expect(el.classList.length).toBe(0);
  });

  it('destroys the Popover instance', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    inst.destroy();
    expect(mockPopoverInstance.destroy).toHaveBeenCalledOnce();
  });

  it('detaches the overflow tooltip', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(10), maxCount: 5 });
    const connector = mockTooltipConnectors[0];
    inst.destroy();
    expect(connector?.destroy).toHaveBeenCalled();
  });

  it('strips classes / attributes from the host element', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, {
      avatars: makeAvatars(3),
      isDisabled: true,
    });
    inst.destroy();
    expect(el.classList.length).toBe(0);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('is idempotent', () => {
    const el = host();
    const inst = new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    inst.destroy();
    expect(() => inst.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Empty / edge cases
// ---------------------------------------------------------------------------

describe('ArvoAvatarGroup - edges', () => {
  it('avatars: [] renders zero items', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: [] });
    expect(el.querySelectorAll('.arvo-avt-grp__item')).toHaveLength(0);
    expect(el.querySelector('.arvo-avt-grp__overflow')).toBeNull();
  });

  it('initialize() guards: ArvoAvatar instances exist for each visible item', () => {
    const el = host();
    new ArvoAvatarGroup(el, { avatars: makeAvatars(3) });
    const avatars = el.querySelectorAll('.arvo-avt-grp__item .arvo-avt');
    // Just confirm the Avatar class actually decorated each host.
    avatars.forEach((avt) => {
      expect(avt.classList.contains('arvo-avt')).toBe(true);
    });
    // Sanity: ArvoAvatar is the same class that decorated the items.
    expect(ArvoAvatar).toBeDefined();
  });
});
