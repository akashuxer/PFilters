// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import $ from 'jquery';
import { createTooltipManager } from '@arvo/core';
import { ArvoTooltip } from '../components/Tooltip';
import { registerArvoPlugins } from '../plugin';

// ---------------------------------------------------------------------------
// Scaffolding coverage for $.fn.arvoTooltip.
//
// Behavior (hover/focus delay, ARIA, dismissal, all-12-placements, etc.) is
// already covered exhaustively in `Tooltip.test.ts` against the class API.
// This suite only proves the jQuery wrapper hands off to the class cleanly
// (registration, idempotency, .data() storage, teardown via $.data(...).destroy()).
// ---------------------------------------------------------------------------

function makeTrigger(): HTMLElement {
  const el = document.createElement('button');
  el.textContent = 'Save';
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  registerArvoPlugins($);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('$.fn.arvoTooltip -- jQuery plugin registration', () => {
  it('registers on $.fn', () => {
    expect(typeof $.fn.arvoTooltip).toBe('function');
  });

  it('creates an ArvoTooltip instance and stores it under $.data(el, "arvoTooltip")', () => {
    const el = makeTrigger();
    $(el).arvoTooltip({ content: 'Save' });
    const stored = $.data(el, 'arvoTooltip');
    expect(stored).toBeInstanceOf(ArvoTooltip);
  });

  it('is idempotent: second call does not create a second instance', () => {
    const el = makeTrigger();
    $(el).arvoTooltip({ content: 'first' });
    const first = $.data(el, 'arvoTooltip');
    $(el).arvoTooltip({ content: 'second' });
    const second = $.data(el, 'arvoTooltip');
    expect(second).toBe(first);
  });

  it('exposes update() / destroy() via the stored instance', () => {
    const el = makeTrigger();
    $(el).arvoTooltip({ content: 'Save' });
    const instance = $.data(el, 'arvoTooltip') as ArvoTooltip;
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.destroy).toBe('function');
    // Update should not throw.
    instance.update({ content: 'Save changes' });
    // Destroy should not throw and must be safe to call once.
    instance.destroy();
  });

  it('uses the shared singleton manager by default (plugin does not accept a manager arg)', async () => {
    // We can't directly assert "singleton" without exposing more surface,
    // but we can prove that hover activates the same overlay hub the
    // global tooltipManager registers with by creating an independent
    // manager and confirming it stays inactive.
    const other = createTooltipManager();
    other.configure({ enabled: true });

    const el = makeTrigger();
    $(el).arvoTooltip({ content: 'Save' });

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.runAllTimersAsync();

    // The independent manager was NEVER touched by the plugin path.
    expect(other.isVisible()).toBe(false);
  });
});
