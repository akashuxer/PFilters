// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTooltipManager } from '../tooltip-manager';
import { createOverlayHub } from '../../overlay/overlay-hub';
import type { TooltipManager, TooltipPlacement } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnchor(): HTMLElement {
  const el = document.createElement('button');
  el.textContent = 'Anchor';
  document.body.appendChild(el);
  return el;
}

function makeManager(): { manager: TooltipManager; hub: ReturnType<typeof createOverlayHub> } {
  const hub = createOverlayHub();
  const manager = createTooltipManager({ hub });
  manager.configure({ enabled: true, hoverDelay: 400, hideDelay: 0 });
  return { manager, hub };
}

function getTip(manager: TooltipManager): HTMLElement | null {
  return manager.getElement();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe('createTooltipManager - configuration', () => {
  it('is disabled by default and show() is a no-op until configured', () => {
    const hub = createOverlayHub();
    const manager = createTooltipManager({ hub });
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'hover' });
    vi.runAllTimers();

    expect(manager.isVisible()).toBe(false);
    expect(manager.getElement()).toBeNull();
  });

  it('configure() merges partial config over defaults', () => {
    const { manager } = makeManager();
    manager.configure({ hoverDelay: 100 });
    const cfg = manager.getConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.hoverDelay).toBe(100);
    expect(cfg.hideDelay).toBe(0);
  });

  it('getConfig() returns a copy (mutation does not affect manager state)', () => {
    const { manager } = makeManager();
    const cfg = manager.getConfig();
    cfg.hoverDelay = 9999;
    expect(manager.getConfig().hoverDelay).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Show / hide timers
// ---------------------------------------------------------------------------

describe('createTooltipManager - show/hide timers', () => {
  it('hover trigger respects hoverDelay before showing', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'hover' });
    expect(manager.isVisible()).toBe(false);

    vi.advanceTimersByTime(399);
    expect(manager.isVisible()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(manager.isVisible()).toBe(true);
  });

  it('focus trigger bypasses hoverDelay and shows immediately', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    expect(manager.isVisible()).toBe(true);
  });

  it('hide(true) is immediate', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    expect(manager.isVisible()).toBe(true);

    manager.hide(true);
    expect(manager.isVisible()).toBe(false);
  });

  it('hide() without immediate=true schedules a hide via hideDelay', () => {
    const { manager } = makeManager();
    manager.configure({ hideDelay: 50 });
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    manager.hide();
    expect(manager.isVisible()).toBe(true);

    vi.advanceTimersByTime(50);
    expect(manager.isVisible()).toBe(false);
  });

  it('hide() during a pending show cancels the show', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'hover' });
    manager.hide(true);

    vi.runAllTimers();
    expect(manager.isVisible()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Abort-hide race
// ---------------------------------------------------------------------------

describe('createTooltipManager - abort-hide race', () => {
  it('show() while a hide is animating cancels the hide and keeps the tip visible', async () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'First', trigger: 'focus' });
    expect(manager.isVisible()).toBe(true);

    // Trigger hide which kicks off the exit animation (FADE_DURATION = 120ms).
    manager.hide(true);

    // Immediately show again before the exit completes.
    manager.show({ anchor, content: 'Second', trigger: 'focus' });

    // After advancing past the original exit, the tip should still be on
    // screen with the new content, because the second show aborted the hide.
    await vi.advanceTimersByTimeAsync(200);
    expect(manager.isVisible()).toBe(true);

    const tip = getTip(manager);
    expect(tip).not.toBeNull();
    expect(tip!.querySelector('.arvo-tip__txt')?.textContent).toBe('Second');
  });
});

// ---------------------------------------------------------------------------
// Multi-id aria-describedby merge
// ---------------------------------------------------------------------------

describe('createTooltipManager - aria-describedby merge', () => {
  it('appends the tip id when the anchor already has aria-describedby', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();
    anchor.setAttribute('aria-describedby', 'existing-id another-id');

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });

    const value = anchor.getAttribute('aria-describedby');
    expect(value).toBeTruthy();
    const ids = (value || '').split(/\s+/);
    expect(ids).toContain('existing-id');
    expect(ids).toContain('another-id');
    expect(ids.some((id) => id.startsWith('arvo-tip-'))).toBe(true);
  });

  it('does not duplicate the tip id when show() runs twice for the same anchor', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();
    anchor.setAttribute('aria-describedby', 'existing-id');

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    manager.show({ anchor, content: 'Hi again', trigger: 'focus' });

    const ids = (anchor.getAttribute('aria-describedby') || '').split(/\s+/);
    const tipIds = ids.filter((id) => id.startsWith('arvo-tip-'));
    expect(tipIds.length).toBe(1);
  });

  it('restores aria-describedby to the consumer value after hide()', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();
    anchor.setAttribute('aria-describedby', 'existing-id');

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    manager.hide(true);

    expect(anchor.getAttribute('aria-describedby')).toBe('existing-id');
  });

  it('removes aria-describedby entirely when only the tip id was attached', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    manager.hide(true);

    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Escape key handling
// ---------------------------------------------------------------------------

describe('createTooltipManager - Escape handling', () => {
  it('Escape key while visible dismisses the tooltip', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    expect(manager.isVisible()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(manager.isVisible()).toBe(false);
  });

  it('Escape key while hidden is a no-op', () => {
    const { manager } = makeManager();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(manager.isVisible()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invalid placement fallback
// ---------------------------------------------------------------------------

describe('createTooltipManager - placement fallback', () => {
  it('silently falls back to the default placement when a bare side is passed', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager.show({
      anchor,
      content: 'Hi',
      trigger: 'focus',
      placement: 'top' as unknown as TooltipPlacement,
    });

    expect(manager.isVisible()).toBe(true);
    const tip = manager.getElement();
    expect(tip).not.toBeNull();
    expect(tip!.getAttribute('data-arvo-side')).toBe('bottom');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('honors a valid placement string as-is', () => {
    const { manager } = makeManager();
    const anchor = makeAnchor();

    manager.show({
      anchor,
      content: 'Hi',
      trigger: 'focus',
      placement: 'top-center',
    });

    expect(manager.isVisible()).toBe(true);
    const tip = manager.getElement();
    expect(tip).not.toBeNull();
    expect(tip!.getAttribute('data-arvo-side')).toBe('top');
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('createTooltipManager - destroy', () => {
  it('destroy() removes the tooltip element from the DOM and clears state', () => {
    const { manager, hub } = makeManager();
    const anchor = makeAnchor();

    manager.show({ anchor, content: 'Hi', trigger: 'focus' });
    const tip = manager.getElement();
    expect(tip).not.toBeNull();
    expect(document.body.contains(tip!)).toBe(true);

    manager.destroy();
    expect(manager.getElement()).toBeNull();
    expect(manager.isVisible()).toBe(false);
    expect(hub.getActive().some((e) => e.type === 'tooltip')).toBe(false);
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
  });
});
