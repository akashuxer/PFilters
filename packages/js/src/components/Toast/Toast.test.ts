import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { ArvoToast } from './Toast';
import type { ArvoToastType } from './Toast';

describe('ArvoToast (JS)', () => {
  let manager: ArvoToast;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    manager = ArvoToast.initialize(document.body, { position: 'top-right' });
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // -- Rendering ---------------------------------------------------------

  it('renders a toast with correct BEM classes per type', () => {
    const types: ArvoToastType[] = ['negative', 'warning', 'info', 'positive', 'block', 'neutral'];
    for (const type of types) {
      const id = manager.show({ type, message: `${type} msg`, fadeAway: false });
      const toast = document.querySelector(`.arvo-toast--${type}`);
      expect(toast).toBeTruthy();
      manager.close(id);
    }
  });

  // -- Container ---------------------------------------------------------

  it('creates container with correct position modifier', () => {
    const container = document.querySelector('.arvo-toast-container');
    expect(container).toBeTruthy();
    expect(container!.classList.contains('arvo-toast-container--top-right')).toBe(true);
  });

  it('container has role=region and aria-label=Notifications', () => {
    const container = document.querySelector('.arvo-toast-container');
    expect(container!.getAttribute('role')).toBe('region');
    expect(container!.getAttribute('aria-label')).toBe('Notifications');
  });

  // -- Title / Message ---------------------------------------------------

  it('renders title when provided', () => {
    manager.show({ title: 'My Title', message: 'Body text', fadeAway: false });
    expect(document.querySelector('.arvo-toast__title')!.textContent).toBe('My Title');
  });

  it('omits title when not provided', () => {
    manager.show({ message: 'No title', fadeAway: false });
    expect(document.querySelector('.arvo-toast__title')).toBeNull();
  });

  it('renders message text', () => {
    manager.show({ message: 'Hello world', fadeAway: false });
    expect(document.querySelector('.arvo-toast__msg')!.textContent).toBe('Hello world');
  });

  // -- Link --------------------------------------------------------------

  it('renders an internal ArvoLink from the structured link action', () => {
    manager.show({
      message: 'With link',
      link: { label: 'Details', href: '/details' },
      fadeAway: false,
    });
    const anchor = document.querySelector('.arvo-toast__content > a.arvo-lnk') as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe('/details');
    expect(anchor!.classList.contains('arvo-lnk--primary')).toBe(true);
    expect(anchor!.classList.contains('arvo-lnk--sm')).toBe(true);
    expect(anchor!.textContent).toContain('Details');
  });

  it('passes link icon and isExternal through to the inner ArvoLink', () => {
    manager.show({
      message: 'With external link',
      link: { label: 'Open', href: '/x', icon: 'rocket', isExternal: true },
      fadeAway: false,
    });
    const anchor = document.querySelector('.arvo-toast__content > a.arvo-lnk') as HTMLAnchorElement;
    expect(anchor.querySelector('.arvo-lnk__ico.o9con-rocket')).toBeTruthy();
    expect(anchor.getAttribute('target')).toBe('_blank');
  });

  it('forwards link onClick to the consumer when the inner link is activated', () => {
    const onClick = vi.fn();
    manager.show({
      message: 'With handler',
      link: { label: 'Click', href: '#', onClick },
      fadeAway: false,
    });
    const anchor = document.querySelector('.arvo-toast__content > a.arvo-lnk') as HTMLAnchorElement;
    anchor.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('destroys the inner ArvoLink when the toast closes', () => {
    const id = manager.show({
      message: 'Cleanup link',
      link: { label: 'Go', href: '/go' },
      fadeAway: false,
    });
    expect(document.querySelector('.arvo-toast__content > a.arvo-lnk')).toBeTruthy();
    manager.close(id);
    expect(document.querySelector('a.arvo-lnk')).toBeNull();
  });

  it('omits the inline ArvoLink when not provided', () => {
    manager.show({ message: 'No link', fadeAway: false });
    expect(document.querySelector('.arvo-toast__content > a.arvo-lnk')).toBeNull();
  });

  it('wraps title + message in arvo-toast__text and renders the link as a sibling', () => {
    manager.show({
      title: 'Save failed',
      message: 'Check your connection.',
      link: { label: 'Retry', href: '#' },
      fadeAway: false,
    });
    const content = document.querySelector('.arvo-toast__content') as HTMLElement;
    expect(content).toBeTruthy();
    const text = content.querySelector(':scope > .arvo-toast__text') as HTMLElement | null;
    expect(text).toBeTruthy();
    expect(text!.querySelector('.arvo-toast__title')).toBeTruthy();
    expect(text!.querySelector('.arvo-toast__msg')).toBeTruthy();
    // Link is a direct child of `.arvo-toast__content`, with no wrapping element.
    expect(content.querySelector(':scope > a.arvo-lnk')).toBeTruthy();
    expect(document.querySelector('.arvo-toast__link')).toBeNull();
  });

  // -- Close button ------------------------------------------------------

  it('renders the close affordance as an xs / tertiary ArvoIconButton', () => {
    manager.show({ message: 'Close shape', fadeAway: false });
    const closeBtn = document.querySelector('.arvo-toast > button.arvo-icon-btn') as HTMLButtonElement | null;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn!.classList.contains('arvo-btn--xs')).toBe(true);
    expect(closeBtn!.classList.contains('arvo-btn--tertiary')).toBe(true);
    expect(closeBtn!.querySelector('.arvo-btn__ico.o9con-close')).toBeTruthy();
  });

  it('close button click removes toast and fires onClose', () => {
    const onClose = vi.fn();
    manager.show({ message: 'Close me', fadeAway: false, onClose });
    const closeBtn = document.querySelector('.arvo-toast > button.arvo-icon-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(document.querySelector('.arvo-toast')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -- Escape key --------------------------------------------------------

  it('Escape key on toast removes it', () => {
    manager.show({ message: 'Escape me', fadeAway: false });
    const toast = document.querySelector('.arvo-toast') as HTMLDivElement;
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    toast.dispatchEvent(event);
    expect(document.querySelector('.arvo-toast')).toBeNull();
  });

  // -- Fade away ---------------------------------------------------------

  it('toast auto-removes after timeout + exit transition', () => {
    manager.show({ message: 'Fading', fadeAway: true, timeout: 1000 });
    expect(document.querySelector('.arvo-toast')).toBeTruthy();

    vi.advanceTimersByTime(1100);
    const toast = document.querySelector('.arvo-toast');
    if (toast) {
      expect(toast.classList.contains('is-removing')).toBe(true);
      toast.dispatchEvent(new Event('transitionend'));
    }
    expect(document.querySelector('.arvo-toast')).toBeNull();
  });

  // -- Per-type default timeouts (matches $arvo-toast-duration-*) -------

  it('negative type auto-dismisses at the 8000ms default timeout', () => {
    manager.show({ type: 'negative', message: 'Error' });
    expect(document.querySelector('.arvo-toast')).toBeTruthy();

    // Just before 8s: still visible.
    vi.advanceTimersByTime(7999);
    expect(document.querySelector('.arvo-toast.is-removing')).toBeNull();

    // Past 8s: enters exit pose.
    vi.advanceTimersByTime(2);
    const toast = document.querySelector('.arvo-toast');
    expect(toast?.classList.contains('is-removing')).toBe(true);
    toast?.dispatchEvent(new Event('transitionend'));
    expect(document.querySelector('.arvo-toast')).toBeNull();
  });

  it('negative type with fadeAway: false remains persistent', () => {
    manager.show({ type: 'negative', message: 'Error', fadeAway: false });
    vi.advanceTimersByTime(10_000);
    expect(document.querySelector('.arvo-toast')).toBeTruthy();
    expect(document.querySelector('.arvo-toast.is-removing')).toBeNull();
  });

  it('block type is hard-persistent and ignores fadeAway / timeout', () => {
    manager.show({ type: 'block', message: 'Blocked', fadeAway: true, timeout: 500 });
    vi.advanceTimersByTime(10_000);
    expect(document.querySelector('.arvo-toast')).toBeTruthy();
    expect(document.querySelector('.arvo-toast.is-removing')).toBeNull();
  });

  it('uses per-type default timeouts from the motion token table', () => {
    const cases: Array<[ArvoToastType, number]> = [
      ['positive', 4000],
      ['neutral', 4000],
      ['info', 5000],
      ['warning', 6000],
    ];
    for (const [type, expected] of cases) {
      manager.show({ type, message: type });
      vi.advanceTimersByTime(expected - 1);
      expect(document.querySelector('.arvo-toast.is-removing')).toBeNull();
      vi.advanceTimersByTime(2);
      const toast = document.querySelector('.arvo-toast');
      expect(toast?.classList.contains('is-removing')).toBe(true);
      toast?.dispatchEvent(new Event('transitionend'));
      expect(document.querySelector('.arvo-toast')).toBeNull();
    }
  });

  // -- Hover pause -------------------------------------------------------

  it('mouseenter pauses, mouseleave restarts', () => {
    manager.show({ message: 'Hover me', fadeAway: true, timeout: 1000, pauseOnHover: true });
    const toast = document.querySelector('.arvo-toast') as HTMLDivElement;

    vi.advanceTimersByTime(500);
    toast.dispatchEvent(new Event('mouseenter'));
    expect(toast.classList.contains('is-paused')).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(toast.classList.contains('is-removing')).toBe(false);

    toast.dispatchEvent(new Event('mouseleave'));
    expect(toast.classList.contains('is-paused')).toBe(false);

    vi.advanceTimersByTime(1100);
    if (document.querySelector('.arvo-toast')) {
      expect(document.querySelector('.arvo-toast.is-removing')).toBeTruthy();
    }
  });

  // -- Stacking ----------------------------------------------------------

  it('new toasts appear at top', () => {
    manager.show({ message: 'First', fadeAway: false });
    manager.show({ message: 'Second', fadeAway: false });
    const toasts = document.querySelectorAll('.arvo-toast');
    expect(toasts.length).toBe(2);
    expect(toasts[0].querySelector('.arvo-toast__msg')!.textContent).toBe('Second');
  });

  // -- Custom icon (neutral-only override) ------------------------------

  describe('icon override (neutral-only)', () => {
    it('renders an override <i> inside __ico and adds has-icon-override on the root when type="neutral"', () => {
      manager.show({ type: 'neutral', icon: 'star', message: 'Star', fadeAway: false });

      const toast = document.querySelector('.arvo-toast') as HTMLElement;
      expect(toast.classList.contains('has-icon-override')).toBe(true);

      const ico = document.querySelector('.arvo-toast__ico');
      expect(ico).not.toBeNull();
      const override = ico!.querySelector('i') as HTMLElement | null;
      expect(override).not.toBeNull();
      expect(override!.classList.contains('o9con')).toBe(true);
      expect(override!.classList.contains('o9con-star')).toBe(true);
    });

    it('ignores the icon option on non-neutral types', () => {
      const nonNeutral: ArvoToastType[] = ['negative', 'warning', 'info', 'positive', 'block'];
      for (const type of nonNeutral) {
        const id = manager.show({ type, icon: 'star', message: `${type}`, fadeAway: false });
        const toast = document.querySelector('.arvo-toast') as HTMLElement;
        expect(toast.classList.contains('has-icon-override')).toBe(false);
        const ico = document.querySelector('.arvo-toast__ico');
        expect(ico!.querySelector('i')).toBeNull();
        manager.close(id);
      }
    });

    it('omits the override <i> when icon is not provided on a neutral toast', () => {
      manager.show({ type: 'neutral', message: 'No override', fadeAway: false });
      const toast = document.querySelector('.arvo-toast') as HTMLElement;
      expect(toast.classList.contains('has-icon-override')).toBe(false);
      const ico = document.querySelector('.arvo-toast__ico');
      expect(ico!.querySelector('i')).toBeNull();
    });
  });

  // -- Accessibility -----------------------------------------------------

  it('role=status for info/positive/warning/neutral', () => {
    for (const type of ['info', 'positive', 'warning', 'neutral'] as const) {
      const id = manager.show({ type, message: type, fadeAway: false });
      const toast = document.querySelector(`.arvo-toast--${type}`);
      expect(toast!.getAttribute('role')).toBe('status');
      manager.close(id);
    }
  });

  it('role=alert for negative/block', () => {
    for (const type of ['negative', 'block'] as const) {
      const id = manager.show({ type, message: type, fadeAway: false });
      const toast = document.querySelector(`.arvo-toast--${type}`);
      expect(toast!.getAttribute('role')).toBe('alert');
      manager.close(id);
    }
  });

  it('aria-atomic=true', () => {
    manager.show({ message: 'Atomic', fadeAway: false });
    expect(document.querySelector('.arvo-toast')!.getAttribute('aria-atomic')).toBe('true');
  });

  it('close button has aria-label', () => {
    manager.show({ message: 'Label', fadeAway: false });
    const btn = document.querySelector('.arvo-toast > button.arvo-icon-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Close notification');
  });

  // -- Programmatic close ------------------------------------------------

  it('close(id) removes specific toast', () => {
    const id1 = manager.show({ message: 'One', fadeAway: false });
    manager.show({ message: 'Two', fadeAway: false });
    expect(document.querySelectorAll('.arvo-toast').length).toBe(2);
    manager.close(id1);
    expect(document.querySelectorAll('.arvo-toast').length).toBe(1);
  });

  it('closeAll removes all toasts', () => {
    manager.show({ message: 'A', fadeAway: false });
    manager.show({ message: 'B', fadeAway: false });
    manager.closeAll();
    expect(document.querySelectorAll('.arvo-toast').length).toBe(0);
  });

  // -- toast:close event -------------------------------------------------

  it('dispatches toast:close event with id and reason', () => {
    const handler = vi.fn();
    const container = document.querySelector('.arvo-toast-container')!;
    container.addEventListener('toast:close', handler as EventListener);

    const id = manager.show({ message: 'Event test', fadeAway: false });
    manager.close(id);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.id).toBe(id);
    expect(detail.reason).toBe('programmatic');
  });

  // -- Destroy -----------------------------------------------------------

  it('destroy removes container and cleans up', () => {
    manager.show({ message: 'Destroy', fadeAway: false });
    manager.destroy();
    expect(document.querySelector('.arvo-toast-container')).toBeNull();
    expect(document.querySelector('.arvo-toast')).toBeNull();
  });

  // -- Position variants -------------------------------------------------

  it('supports the two right-anchored position variants', () => {
    manager.destroy();
    const positions = ['top-right', 'bottom-right'] as const;
    for (const pos of positions) {
      const m = ArvoToast.initialize(document.body, { position: pos });
      const container = document.querySelector(`.arvo-toast-container--${pos}`);
      expect(container).toBeTruthy();
      m.destroy();
    }
  });

  // -- Tab focus + SR-only prefix ---------------------------------------

  it('toast root is keyboard reachable (tabindex=0)', () => {
    manager.show({ message: 'Tab into me', fadeAway: false });
    const toast = document.querySelector('.arvo-toast') as HTMLDivElement;
    expect(toast.getAttribute('tabindex')).toBe('0');
  });

  it('renders an SR-only prefix per toast type', () => {
    const types = [
      ['negative', 'Error'],
      ['warning', 'Warning'],
      ['info', 'Info'],
      ['positive', 'Success'],
      ['block', 'Blocked'],
      ['neutral', 'Notification'],
    ] as const;
    for (const [type, label] of types) {
      const id = manager.show({ type, message: 'x', fadeAway: false });
      const sr = document.querySelector('.arvo-toast .arvo-sr-only');
      expect(sr).toBeTruthy();
      expect(sr!.textContent?.trim()).toBe(`${label}:`);
      manager.close(id);
    }
  });

  // -- Rich text message (BasicInlineContent) ---------------------------

  it('renders an InlineContent message via the shared DOM adapter', () => {
    manager.show({
      message: [
        { type: 'text', value: 'Press ' },
        { type: 'kbd', value: 'Esc' },
        { type: 'text', value: ' to dismiss. ' },
        { type: 'strong', children: 'Important' },
      ],
      fadeAway: false,
    });
    const msg = document.querySelector('.arvo-toast__msg');
    expect(msg).toBeTruthy();
    expect(msg!.querySelector('kbd.arvo-inline__kbd')?.textContent).toBe('Esc');
    expect(msg!.querySelector('strong.arvo-inline__strong')?.textContent).toBe('Important');
  });

  it('renders an inline link inside the message that forces noopener for _blank', () => {
    manager.show({
      message: [
        { type: 'text', value: 'See ' },
        {
          type: 'link',
          label: 'docs',
          href: 'https://example.com',
          target: '_blank',
        },
      ],
      fadeAway: false,
    });
    const a = document.querySelector('.arvo-toast__msg a.arvo-inline__link') as HTMLAnchorElement;
    expect(a).toBeTruthy();
    expect(a.getAttribute('href')).toBe('https://example.com');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(a.getAttribute('rel')).toContain('noreferrer');
  });

  // -- Block icon glyph fix ---------------------------------------------

  it('block type uses its dedicated icon glyph (descriptor: \\ed75)', () => {
    // Glyph is set via CSS ::before content, which jsdom does not compute.
    // Verify the modifier class is correctly applied so the SCSS selector
    // emits the right glyph in real browsers.
    manager.show({ type: 'block', message: 'Blocked', fadeAway: false });
    expect(document.querySelector('.arvo-toast.arvo-toast--block')).toBeTruthy();
    expect(document.querySelector('.arvo-toast.arvo-toast--negative')).toBeNull();
  });

  // -- Stacking (corner-position aware) ---------------------------------

  it('stacks multiple toasts in bottom-right container with correct modifier', () => {
    manager.destroy();
    const m = ArvoToast.initialize(document.body, { position: 'bottom-right' });
    m.show({ message: 'A', fadeAway: false });
    m.show({ message: 'B', fadeAway: false });
    m.show({ message: 'C', fadeAway: false });
    const container = document.querySelector('.arvo-toast-container--bottom-right');
    expect(container).toBeTruthy();
    expect(container!.querySelectorAll('.arvo-toast').length).toBe(3);
    m.destroy();
    manager = ArvoToast.initialize(document.body, { position: 'top-right' });
  });

  // -- Auto-dismiss (explicit duration coverage) ------------------------

  it('auto-dismisses after an explicitly configured duration', () => {
    manager.show({ message: 'Timed', fadeAway: true, timeout: 2000 });
    expect(document.querySelector('.arvo-toast')).toBeTruthy();

    vi.advanceTimersByTime(1999);
    // Still present just before duration
    expect(document.querySelector('.arvo-toast')).toBeTruthy();

    vi.advanceTimersByTime(200);
    const el = document.querySelector('.arvo-toast');
    if (el) {
      el.dispatchEvent(new Event('transitionend'));
    }
    expect(document.querySelector('.arvo-toast')).toBeNull();
  });

  // -- prefers-reduced-motion -------------------------------------------

  describe('prefers-reduced-motion', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
      delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    });

    it('auto-dismiss removes toast immediately without is-removing when reduced motion active', () => {
      manager.show({ message: 'Reduced motion', fadeAway: true, timeout: 1000 });
      expect(document.querySelector('.arvo-toast')).toBeTruthy();

      vi.advanceTimersByTime(1100);

      // Reduced motion: transition skipped -> toast removed without is-removing.
      expect(document.querySelector('.arvo-toast.is-removing')).toBeNull();
      expect(document.querySelector('.arvo-toast')).toBeNull();
    });

    it('hover-restart removes toast immediately without is-removing when reduced motion active', () => {
      manager.show({ message: 'Hover reduced', fadeAway: true, timeout: 1000, pauseOnHover: true });
      const toast = document.querySelector('.arvo-toast') as HTMLDivElement;

      toast.dispatchEvent(new Event('mouseenter'));
      vi.advanceTimersByTime(500);
      toast.dispatchEvent(new Event('mouseleave'));

      vi.advanceTimersByTime(1100);

      expect(document.querySelector('.arvo-toast.is-removing')).toBeNull();
      expect(document.querySelector('.arvo-toast')).toBeNull();
    });
  });

  // -- accessibility (axe) -----------------------------------------------

  describe('accessibility (axe)', () => {
    it('toast region with multiple toasts has zero axe violations', async () => {
      manager.show({ message: 'First toast', type: 'info', fadeAway: false });
      manager.show({ message: 'Second toast', type: 'negative', fadeAway: false });
      expect(document.querySelectorAll('.arvo-toast').length).toBe(2);

      // `region` is disabled for body-level portaled containers; this is not
      // a WCAG conformance failure (see architecture/19-OVERLAY-MIGRATION-TRACKER 1.4).
      const results = await axe.run(document.body, {
        rules: { region: { enabled: false } },
      });
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
      );
      expect(summary, summary.join('\n')).toHaveLength(0);
    });
  });
});
