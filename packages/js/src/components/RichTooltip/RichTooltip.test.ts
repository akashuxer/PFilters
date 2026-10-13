// @vitest-environment jsdom
//
// ArvoRichTooltip (vanilla JS) -- tests
//
// Mirrors the React suite. Uses the real @arvo/core overlay hub so the
// surface engine round-trips the way HybridPopover would observe at runtime.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import axe from 'axe-core';
import { overlayHub } from '@arvo/core';
import { ArvoRichTooltip } from './RichTooltip';

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTrigger(): HTMLButtonElement {
  const btn = document.createElement('button');
  document.body.appendChild(btn);
  return btn;
}

function getPanel(): HTMLElement | null {
  return document.querySelector('.arvo-rtip');
}

afterEach(() => {
  overlayHub.closeAll();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- initialization', () => {
  it('static initialize returns an ArvoRichTooltip instance', () => {
    const btn = createTrigger();
    const inst = ArvoRichTooltip.initialize(btn);
    expect(inst).toBeInstanceOf(ArvoRichTooltip);
    inst.destroy();
  });

  it('creates the panel under document.body', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(document.body.contains(getPanel())).toBe(true);
    inst.destroy();
  });

  it('panel has role="tooltip"', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(getPanel()?.getAttribute('role')).toBe('tooltip');
    inst.destroy();
  });

  it('panel is closed by default (no open class)', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(getPanel()?.classList.contains('open')).toBe(false);
    inst.destroy();
  });

  it('writes aria-describedby on the trigger pointing at the panel id', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(btn.getAttribute('aria-describedby')).toBe(inst.triggerId);
    inst.destroy();
  });

  it('removes aria-describedby on destroy', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(btn.getAttribute('aria-describedby')).not.toBeNull();
    inst.destroy();
    expect(btn.getAttribute('aria-describedby')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slot composition
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- slot composition', () => {
  it('renders the header when title is provided', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { title: 'Header' });
    const hdr = document.querySelector('.arvo-rtip__hdr');
    expect(hdr).not.toBeNull();
    expect(hdr?.querySelector('.arvo-rtip__title')?.textContent).toBe('Header');
    inst.destroy();
  });

  it('renders ArvoStatus and forces size=sm', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      title: 'Header',
      status: { type: 'available' },
    });
    const status = document.querySelector('.arvo-sts');
    expect(status?.classList.contains('arvo-sts--sm')).toBe(true);
    expect(status?.classList.contains('arvo-sts--available')).toBe(true);
    inst.destroy();
  });

  it('renders ArvoBadge and forces size=sm', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      title: 'Header',
      badge: { variant: 'label', semanticType: 'positive', message: 'New' },
    });
    const badge = document.querySelector('.arvo-bdg');
    expect(badge?.classList.contains('arvo-bdg--sm')).toBe(true);
    inst.destroy();
  });

  it('renders ArvoBannerAlert in compact mode regardless of caller config', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      banner: { type: 'warning', message: 'Heads up' },
    });
    const banner = document.querySelector('.arvo-bnr-alert');
    expect(banner?.classList.contains('arvo-bnr-alert--compact')).toBe(true);
    expect(banner?.classList.contains('arvo-bnr-alert--warning')).toBe(true);
    inst.destroy();
  });

  it('renders the message via the inline-content adapter', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { message: 'Hello world' });
    expect(document.querySelector('.arvo-rtip__msg')?.textContent).toBe('Hello world');
    inst.destroy();
  });

  it('renders inline kbd / strong nodes from the AST', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      message: [
        { type: 'text', value: 'Press ' },
        { type: 'kbd', value: 'Ctrl+S' },
        { type: 'text', value: ' to ' },
        { type: 'strong', children: 'save' },
      ],
    });
    expect(document.querySelector('.arvo-inline__kbd')?.textContent).toBe('Ctrl+S');
    expect(document.querySelector('.arvo-inline__strong')?.textContent).toBe('save');
    inst.destroy();
  });

  it('renders the bodyContent escape-hatch slot from a string', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { bodyContent: 'Inline plain text body' });
    expect(document.querySelector('.arvo-rtip__slot')?.textContent).toBe('Inline plain text body');
    inst.destroy();
  });

  it('renders the bodyContent escape-hatch slot from an HTMLElement', () => {
    const btn = createTrigger();
    const node = document.createElement('div');
    node.dataset.testid = 'custom-slot';
    node.textContent = 'Custom DOM';
    const inst = new ArvoRichTooltip(btn, { bodyContent: node });
    expect(
      document.querySelector('.arvo-rtip__slot [data-testid="custom-slot"]')?.textContent,
    ).toBe('Custom DOM');
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Footer actions
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- footer actions', () => {
  it('does not render the footer when actions is empty', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(document.querySelector('.arvo-rtip__ftr')).toBeNull();
    inst.destroy();
  });

  it('renders kind="link" as ArvoLink', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      actions: [
        { kind: 'link', label: 'Read more', href: '/docs', isExternal: true },
      ],
    });
    const link = document.querySelector('.arvo-rtip__ftr .arvo-lnk');
    expect(link).not.toBeNull();
    expect(link?.querySelector('.arvo-lnk__lbl')?.textContent).toBe('Read more');
    expect(link?.querySelector('.arvo-lnk__ext')).not.toBeNull();
    inst.destroy();
  });

  it('renders kind="buttonLink" as outline ArvoButtonLink', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      actions: [
        { kind: 'buttonLink', label: 'Learn more', href: '/learn', isExternal: true },
      ],
    });
    const btnLink = document.querySelector('.arvo-rtip__ftr a.arvo-btn');
    expect(btnLink).not.toBeNull();
    expect(btnLink?.classList.contains('arvo-btn--outline')).toBe(true);
    expect(btnLink?.classList.contains('arvo-btn--sm')).toBe(true);
    inst.destroy();
  });

  it('renders kind="button" as inline ArvoButton and fires onClick', () => {
    const onClick = vi.fn();
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      actions: [{ kind: 'button', label: 'Action', onClick }],
    });
    const innerBtn = document.querySelector(
      '.arvo-rtip__ftr button.arvo-btn',
    ) as HTMLButtonElement | null;
    expect(innerBtn).not.toBeNull();
    expect(innerBtn?.classList.contains('arvo-btn--inline')).toBe(true);
    innerBtn?.click();
    expect(onClick).toHaveBeenCalledOnce();
    inst.destroy();
  });

  it('truncates more than 3 actions and emits a console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      actions: [
        { kind: 'link', label: 'One', href: '#1' },
        { kind: 'link', label: 'Two', href: '#2' },
        { kind: 'link', label: 'Three', href: '#3' },
        { kind: 'link', label: 'Four', href: '#4' },
      ],
    });
    expect(document.querySelectorAll('.arvo-rtip__ftr a.arvo-lnk').length).toBe(3);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    inst.destroy();
  });

  it('setActions replaces the footer at runtime', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn);
    expect(document.querySelector('.arvo-rtip__ftr')).toBeNull();
    inst.setActions([{ kind: 'link', label: 'New', href: '/new' }]);
    expect(document.querySelectorAll('.arvo-rtip__ftr a.arvo-lnk').length).toBe(1);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Trigger modes
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- trigger modes', () => {
  it('click toggles the panel', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'click' });
    expect(inst.isOpen()).toBe(false);
    btn.click();
    expect(inst.isOpen()).toBe(true);
    btn.click();
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('hover opens after a delay and closes after another delay', () => {
    vi.useFakeTimers();
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'hover' });
    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(inst.isOpen()).toBe(false);
    vi.advanceTimersByTime(160);
    expect(inst.isOpen()).toBe(true);
    btn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    vi.advanceTimersByTime(120);
    expect(inst.isOpen()).toBe(false);
    vi.useRealTimers();
    inst.destroy();
  });

  it('focus mode opens on focus', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'focus' });
    btn.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    expect(inst.isOpen()).toBe(true);
    inst.destroy();
  });

  it('manual mode ignores trigger events', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual' });
    btn.click();
    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    btn.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Focus / close loop regression
// ---------------------------------------------------------------------------
//
// The overlay-surface engine restores focus to the trigger by default on
// close. ArvoRichTooltip binds `focus` on the trigger for hover + focus
// modes (WCAG 1.4.13 keyboard parity). Before the fix, the engine's
// programmatic re-focus fired that listener and immediately re-opened the
// tooltip, producing a "flash close, reopen" loop on pointerleave, outside
// click, and Escape. These tests lock in the fix so the loop cannot regress.

describe('ArvoRichTooltip -- focus/close loop regression', () => {
  it('hover: pointerleave close stays closed after a settle window', () => {
    vi.useFakeTimers();
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'hover' });
    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    vi.advanceTimersByTime(160);
    expect(inst.isOpen()).toBe(true);
    btn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    vi.advanceTimersByTime(120);
    expect(inst.isOpen()).toBe(false);
    // Drain any lingering timers / microtasks that could programmatically
    // refocus the trigger and re-open the tooltip.
    vi.advanceTimersByTime(500);
    expect(inst.isOpen()).toBe(false);
    vi.useRealTimers();
    inst.destroy();
  });

  it('hover: programmatic close followed by a genuine focus re-opens', () => {
    vi.useFakeTimers();
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'hover' });
    inst.open();
    expect(inst.isOpen()).toBe(true);
    inst.close();
    // Focus-open suppression is a same-tick fence. Once the tick clears,
    // a genuine user focus event must still open the tooltip (WCAG 1.4.13).
    vi.advanceTimersByTime(10);
    btn.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    expect(inst.isOpen()).toBe(true);
    vi.useRealTimers();
    inst.destroy();
  });

  it('a11y: close with focus inside the panel restores focus to trigger without reopening', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, {
      trigger: 'focus',
      actions: [{ kind: 'button', label: 'Action' }],
    });
    inst.open();
    expect(inst.isOpen()).toBe(true);
    const footerBtn = document.querySelector(
      '.arvo-rtip__ftr button',
    ) as HTMLButtonElement | null;
    expect(footerBtn).not.toBeNull();
    footerBtn!.focus();
    expect(document.activeElement).toBe(footerBtn);
    inst.close();
    // Because focus was inside the panel, we programmatically restored it
    // to the trigger. The trigger has `focus` bound (focus-mode trigger),
    // but our `_suppressFocusOpen` fence prevents the synthetic focus
    // event from immediately re-opening the tooltip.
    expect(document.activeElement).toBe(btn);
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('close does not steal focus back to the trigger from an elsewhere-focused element', () => {
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'click' });
    btn.click();
    expect(inst.isOpen()).toBe(true);
    elsewhere.focus();
    expect(document.activeElement).toBe(elsewhere);
    inst.close();
    // With `focus.returnFocus: false`, the engine must not drag focus
    // back to the trigger after close.
    expect(document.activeElement).toBe(elsewhere);
    inst.destroy();
    elsewhere.remove();
  });
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- public API', () => {
  it('open() / close() / toggle() / isOpen() round-trip', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual' });
    expect(inst.isOpen()).toBe(false);
    inst.open();
    expect(inst.isOpen()).toBe(true);
    inst.close();
    expect(inst.isOpen()).toBe(false);
    inst.toggle();
    expect(inst.isOpen()).toBe(true);
    inst.toggle();
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('disabled() acts as a dual-purpose getter/setter', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual' });
    expect(inst.disabled()).toBe(false);
    inst.disabled(true);
    expect(inst.disabled()).toBe(true);
    inst.open();
    expect(inst.isOpen()).toBe(false);
    inst.disabled(false);
    inst.open();
    expect(inst.isOpen()).toBe(true);
    inst.destroy();
  });

  it('renderMessage replaces the body message', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { message: 'first' });
    expect(document.querySelector('.arvo-rtip__msg')?.textContent).toBe('first');
    inst.renderMessage('second');
    expect(document.querySelector('.arvo-rtip__msg')?.textContent).toBe('second');
    inst.destroy();
  });

  it('destroy() removes the panel and unbinds the trigger', () => {
    const btn = createTrigger();
    const onClick = vi.fn();
    const inst = new ArvoRichTooltip(btn, { trigger: 'click' });
    btn.addEventListener('click', onClick);
    inst.destroy();
    expect(getPanel()).toBeNull();
    btn.click();
    // Native handler still fires but the RichTooltip should NOT be open.
    expect(onClick).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- events', () => {
  it('dispatches rtip:open on the trigger when opening', () => {
    const btn = createTrigger();
    const handler = vi.fn();
    btn.addEventListener('rtip:open', handler);
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual' });
    inst.open();
    expect(handler).toHaveBeenCalled();
    inst.destroy();
  });

  it('dispatches rtip:close on the trigger when closing programmatically', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual' });
    inst.open();
    const handler = vi.fn();
    btn.addEventListener('rtip:close', handler);
    inst.close();
    expect(handler).toHaveBeenCalled();
    inst.destroy();
  });

  it('dispatches rtip:openchange with detail.isOpen', () => {
    const btn = createTrigger();
    const handler = vi.fn();
    btn.addEventListener('rtip:openchange', handler as EventListener);
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual' });
    inst.open();
    inst.close();
    expect(handler.mock.calls.length).toBeGreaterThanOrEqual(2);
    const evt0 = handler.mock.calls[0][0] as CustomEvent;
    const evtLast = handler.mock.calls[handler.mock.calls.length - 1][0] as CustomEvent;
    expect(evt0.detail).toEqual({ isOpen: true });
    expect(evtLast.detail).toEqual({ isOpen: false });
    inst.destroy();
  });

  it('onOpen returning false vetoes opening', () => {
    const btn = createTrigger();
    const onOpen = vi.fn(() => false);
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual', onOpen });
    inst.open();
    expect(inst.isOpen()).toBe(false);
    inst.destroy();
  });

  it('onClose returning false vetoes closing', () => {
    const btn = createTrigger();
    const onClose = vi.fn(() => false);
    const inst = new ArvoRichTooltip(btn, { trigger: 'manual', onClose });
    inst.open();
    inst.close();
    expect(inst.isOpen()).toBe(true);
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Placement classes
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- placement', () => {
  const placements = [
    'top-start', 'top-center', 'top-end',
    'right-start', 'right-center', 'right-end',
    'bottom-start', 'bottom-center', 'bottom-end',
    'left-start', 'left-center', 'left-end',
  ] as const;

  for (const p of placements) {
    it(`applies arvo-rtip--${p}`, () => {
      const btn = createTrigger();
      const inst = new ArvoRichTooltip(btn, { placement: p });
      expect(getPanel()?.classList.contains(`arvo-rtip--${p}`)).toBe(true);
      inst.destroy();
    });
  }

  it('renders the pointer when hasPointer is true', () => {
    const btn = createTrigger();
    const inst = new ArvoRichTooltip(btn, { hasPointer: true });
    expect(getPanel()?.classList.contains('arvo-rtip--with-pointer')).toBe(true);
    expect(document.querySelector('.arvo-rtip__pointer')).not.toBeNull();
    inst.destroy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('ArvoRichTooltip -- accessibility', () => {
  it('passes axe in the default open state', async () => {
    const btn = createTrigger();
    btn.textContent = 'Open';
    const inst = new ArvoRichTooltip(btn, {
      trigger: 'manual',
      title: 'Header',
      message: 'Body content',
    });
    inst.open();
    // Disable the `region` rule because the bare jsdom <body> has no
    // landmark; the surface itself is what we want to validate.
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    inst.destroy();
  });

  it('passes axe when fully populated', async () => {
    const btn = createTrigger();
    btn.textContent = 'Open';
    const inst = new ArvoRichTooltip(btn, {
      trigger: 'manual',
      title: 'Header',
      status: { type: 'available' },
      badge: { variant: 'label', semanticType: 'positive', message: 'New' },
      banner: { type: 'warning', message: 'Heads up', isDismissible: false },
      message: 'Some helpful body content.',
      actions: [
        { kind: 'link', label: 'Docs', href: '/docs' },
        { kind: 'button', label: 'Action', onClick: () => {} },
      ],
    });
    inst.open();
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
    );
    expect(summary, summary.join('\n')).toHaveLength(0);
    inst.destroy();
  });
});
