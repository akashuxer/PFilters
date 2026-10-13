// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import $ from 'jquery';
import { createTooltipManager, type TooltipManager } from '@arvo/core';
import {
  ArvoTooltipContainer,
  type ArvoTooltipContainerEntry,
} from '../tooltip-container';
import { setupTooltipContainerPlugin } from '../tooltip-container-setup';

// ---------------------------------------------------------------------------
// Test suite covering the `entries[]`-based container adapter. Focuses on the
// shape a real Kibo/Kendo migration will exercise:
//
//   - multiple entries with per-entry `content`, `placement`, `shortcut`
//   - first-match-wins resolution across entries
//   - truncation gate with optional `textSelector`
//   - :focus-visible gate on focus events
//   - jQuery plugin adapter (registration, idempotency, misuse warn)
//
// The existing 89-test ArvoTooltip class suite (`Tooltip.test.ts`) covers
// the underlying manager behavior (hover / focus delay, ARIA, dismissal,
// all-12-placements, singleton semantics), so this file only exercises the
// container-level dispatch and gating logic.
// ---------------------------------------------------------------------------

function createEnabledManager(): TooltipManager {
  const manager = createTooltipManager();
  manager.configure({ enabled: true });
  return manager;
}

function makeContainer(html = ''): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

async function hover(el: HTMLElement, relatedTarget: EventTarget | null = null): Promise<void> {
  el.dispatchEvent(
    new MouseEvent('mouseover', {
      bubbles: true,
      relatedTarget: relatedTarget as EventTarget,
    }),
  );
  vi.advanceTimersByTime(400);
  await vi.runAllTimersAsync();
}

async function unhover(el: HTMLElement, relatedTarget: EventTarget | null = document.body): Promise<void> {
  el.dispatchEvent(
    new MouseEvent('mouseout', {
      bubbles: true,
      relatedTarget: relatedTarget as EventTarget,
    }),
  );
  await vi.runAllTimersAsync();
}

async function focus(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.runAllTimersAsync();
}

/**
 * Force jsdom-lacking layout metrics. Elements report scrollWidth = 0 /
 * clientWidth = 0 by default, so `isTruncated` returns false for
 * everything unless we override.
 */
function forceTruncated(el: HTMLElement): void {
  Object.defineProperty(el, 'scrollWidth', { value: 200, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: 20, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 20, configurable: true });
}

function forceFits(el: HTMLElement): void {
  Object.defineProperty(el, 'scrollWidth', { value: 50, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: 20, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 20, configurable: true });
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
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Class API -- shape + single-entry behavior
// ---------------------------------------------------------------------------

describe('ArvoTooltipContainer -- class API (shape)', () => {
  it('initialize() returns an instance holding the container', () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="cell">A</button>');
    const c = ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.cell', content: 'x' }] },
      manager,
    );
    expect(c).toBeInstanceOf(ArvoTooltipContainer);
    expect(c.element).toBe(container);
  });

  it('shows a tooltip when the mouse enters a matching descendant', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="cell">A</button>');
    const cell = container.querySelector<HTMLElement>('.cell')!;

    ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.cell', content: 'Static content' }] },
      manager,
    );

    await hover(cell);
    expect(manager.isVisible()).toBe(true);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Static content');
  });

  it('resolves per-anchor content via callback', async () => {
    const manager = createEnabledManager();
    const container = makeContainer(
      '<button class="cell" data-tip="Alpha">A</button><button class="cell" data-tip="Beta">B</button>',
    );
    const cells = container.querySelectorAll<HTMLElement>('.cell');

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [
          { filter: '.cell', content: (el) => el.getAttribute('data-tip') },
        ],
      },
      manager,
    );

    await hover(cells[0]);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Alpha');

    // Direct anchor-to-anchor jump: mouseout on A with relatedTarget = B
    // should NOT hide-then-show (the container short-circuits so B's
    // mouseover switches cleanly).
    await unhover(cells[0], cells[1]);
    await hover(cells[1], cells[0]);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Beta');
  });

  it('suppresses show when the content resolver returns null', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="cell">A</button>');
    const cell = container.querySelector<HTMLElement>('.cell')!;

    ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.cell', content: () => null }] },
      manager,
    );

    await hover(cell);
    expect(manager.isVisible()).toBe(false);
  });

  it('does not show for descendants that do not match any filter', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="other">X</button>');
    const other = container.querySelector<HTMLElement>('.other')!;

    ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.cell', content: 'nope' }] },
      manager,
    );

    await hover(other);
    expect(manager.isVisible()).toBe(false);
  });

  it('update() swaps entries without rebinding listeners', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="v1">A</button><button class="v2">B</button>');
    const v1 = container.querySelector<HTMLElement>('.v1')!;
    const v2 = container.querySelector<HTMLElement>('.v2')!;

    const c = ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.v1', content: 'first' }] },
      manager,
    );

    await hover(v1);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('first');
    await unhover(v1);

    c.update({ entries: [{ filter: '.v2', content: 'second' }] });

    await hover(v2);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('second');
  });

  it('destroy() unbinds listeners and hides any open tooltip', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="cell">A</button>');
    const cell = container.querySelector<HTMLElement>('.cell')!;

    const c = ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.cell', content: 'x' }] },
      manager,
    );

    await hover(cell);
    expect(manager.isVisible()).toBe(true);

    c.destroy();
    await vi.runAllTimersAsync();
    expect(manager.isVisible()).toBe(false);

    // Post-destroy hover must be inert.
    await hover(cell);
    expect(manager.isVisible()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multi-entry behavior
// ---------------------------------------------------------------------------

describe('ArvoTooltipContainer -- multi-entry dispatch', () => {
  it('picks the first entry whose filter matches (first-wins)', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="a b">X</button>');
    const target = container.querySelector<HTMLElement>('.a')!;

    // Both filters match the same element. `.a` is listed first -> wins.
    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [
          { filter: '.a', content: 'from-a' },
          { filter: '.b', content: 'from-b' },
        ],
      },
      manager,
    );

    await hover(target);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('from-a');
  });

  it('applies per-entry placement independently for each anchor', async () => {
    const manager = createEnabledManager();
    const container = makeContainer(
      '<button class="cell">A</button><button class="btn">B</button>',
    );
    const cell = container.querySelector<HTMLElement>('.cell')!;
    const btn = container.querySelector<HTMLElement>('.btn')!;

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [
          { filter: '.cell', content: 'cell tip' },
          { filter: '.btn', content: 'btn tip', placement: 'top-center' },
        ],
      },
      manager,
    );

    await hover(cell);
    const cellTipEl = manager.getElement()!;
    expect(cellTipEl.getAttribute('data-arvo-side')).toBe('bottom'); // manager default

    await unhover(cell);
    await hover(btn);
    const btnTipEl = manager.getElement()!;
    expect(btnTipEl.getAttribute('data-arvo-side')).toBe('top');
  });

  it('per-entry placement overrides the container-level fallback', async () => {
    const manager = createEnabledManager();
    const container = makeContainer(
      '<button class="cell">A</button><button class="btn">B</button>',
    );
    const cell = container.querySelector<HTMLElement>('.cell')!;
    const btn = container.querySelector<HTMLElement>('.btn')!;

    ArvoTooltipContainer.initialize(
      container,
      {
        placement: 'top-center', // container default
        entries: [
          { filter: '.cell', content: 'cell tip' }, // inherits container top-center
          { filter: '.btn', content: 'btn tip', placement: 'bottom-center' }, // overrides
        ],
      },
      manager,
    );

    await hover(cell);
    expect(manager.getElement()!.getAttribute('data-arvo-side')).toBe('top');

    await unhover(cell);
    await hover(btn);
    expect(manager.getElement()!.getAttribute('data-arvo-side')).toBe('bottom');
  });
});

// ---------------------------------------------------------------------------
// Truncation gate
// ---------------------------------------------------------------------------

describe('ArvoTooltipContainer -- truncation gate', () => {
  it('suppresses show when `truncated: true` and the anchor is not truncated', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="cell">short</button>');
    const cell = container.querySelector<HTMLElement>('.cell')!;
    forceFits(cell);

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [{ filter: '.cell', content: (el) => el.textContent, truncated: true }],
      },
      manager,
    );

    await hover(cell);
    expect(manager.isVisible()).toBe(false);
  });

  it('shows when `truncated: true` and the anchor IS truncated', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="cell">a-long-truncated-label</button>');
    const cell = container.querySelector<HTMLElement>('.cell')!;
    forceTruncated(cell);

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [{ filter: '.cell', content: (el) => el.textContent, truncated: true }],
      },
      manager,
    );

    await hover(cell);
    expect(manager.isVisible()).toBe(true);
  });

  it('uses `textSelector` to select the overflow-check element inside the anchor', async () => {
    const manager = createEnabledManager();
    const container = makeContainer(
      '<div class="tile"><span class="tile__text">a-long-label</span></div>',
    );
    const tile = container.querySelector<HTMLElement>('.tile')!;
    const text = tile.querySelector<HTMLElement>('.tile__text')!;

    // Anchor is NOT truncated, inner text IS. Only the textSelector check
    // should decide the gate.
    forceFits(tile);
    forceTruncated(text);

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [
          {
            filter: '.tile',
            textSelector: '.tile__text',
            truncated: true,
            content: (el) => el.querySelector('.tile__text')?.textContent ?? '',
          },
        ],
      },
      manager,
    );

    await hover(tile);
    expect(manager.isVisible()).toBe(true);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('a-long-label');
  });

  it('suppresses when `textSelector` does not match any descendant (Kendo parity)', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<div class="tile">no inner text</div>');
    const tile = container.querySelector<HTMLElement>('.tile')!;
    forceTruncated(tile);

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [
          {
            filter: '.tile',
            textSelector: '.does-not-exist',
            truncated: true,
            content: 'x',
          },
        ],
      },
      manager,
    );

    await hover(tile);
    expect(manager.isVisible()).toBe(false);
  });

  it('non-truncated entries in the same container still show normally', async () => {
    const manager = createEnabledManager();
    const container = makeContainer(
      '<button class="cell">short</button><button class="btn">action</button>',
    );
    const cell = container.querySelector<HTMLElement>('.cell')!;
    const btn = container.querySelector<HTMLElement>('.btn')!;
    forceFits(cell); // truncation gate should suppress this one

    ArvoTooltipContainer.initialize(
      container,
      {
        entries: [
          { filter: '.cell', content: 'cell tip', truncated: true },
          { filter: '.btn', content: 'btn tip' },
        ],
      },
      manager,
    );

    await hover(cell);
    expect(manager.isVisible()).toBe(false);

    await hover(btn);
    expect(manager.isVisible()).toBe(true);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('btn tip');
  });
});

// ---------------------------------------------------------------------------
// Focus wiring (see the note below re: :focus-visible)
//
// The container adapter's focusin handler copies the :focus-visible gate
// pattern verbatim from `packages/core/src/tooltip/tooltip-connector.ts`,
// which owns the authoritative tests for that gate. Under jsdom,
// `CSS.supports('selector(:focus-visible)')` returns false in current
// builds, so the gate is effectively inert in this test environment and
// the "suppresses when NOT :focus-visible" case cannot be validated here
// without introducing a testability seam that the connector itself
// doesn't ship. This suite therefore only asserts the wiring shape:
// focusin on a matched anchor drives a manager.show. Real-browser gate
// behavior is covered in the connector's suite.
// ---------------------------------------------------------------------------

describe('ArvoTooltipContainer -- focus wiring', () => {
  it('focusin on a matched descendant triggers a show', async () => {
    const manager = createEnabledManager();
    const container = makeContainer('<button class="btn">A</button>');
    const btn = container.querySelector<HTMLElement>('.btn')!;

    // Report :focus-visible = true so the gate (if it activates in the
    // host environment) does not suppress.
    const originalMatches = btn.matches.bind(btn);
    btn.matches = vi.fn((sel: string) =>
      sel === ':focus-visible' ? true : originalMatches(sel),
    );

    ArvoTooltipContainer.initialize(
      container,
      { entries: [{ filter: '.btn', content: 'btn tip' }] },
      manager,
    );

    await focus(btn);
    expect(manager.isVisible()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// jQuery plugin API
// ---------------------------------------------------------------------------

describe('$.fn.arvoTooltipContainer -- jQuery plugin (shape)', () => {
  beforeEach(() => {
    setupTooltipContainerPlugin($);
  });

  it('registers the plugin method on $.fn', () => {
    expect(typeof $.fn.arvoTooltipContainer).toBe('function');
  });

  it('creates an ArvoTooltipContainer instance and stores it under $.data', () => {
    const container = makeContainer('<button class="cell">A</button>');
    $(container).arvoTooltipContainer({
      entries: [{ filter: '.cell', content: 'x' }],
    });
    const stored = $.data(container, 'arvoTooltipContainer');
    expect(stored).toBeInstanceOf(ArvoTooltipContainer);
  });

  it('second call with new options routes through update() (does not double-init)', () => {
    const container = makeContainer('<button class="cell">A</button>');
    $(container).arvoTooltipContainer({
      entries: [{ filter: '.cell', content: 'first' }],
    });
    const firstInstance = $.data(container, 'arvoTooltipContainer');

    $(container).arvoTooltipContainer({
      entries: [{ filter: '.cell', content: 'second' }],
    });
    const secondInstance = $.data(container, 'arvoTooltipContainer');

    expect(secondInstance).toBe(firstInstance);
  });

  it('warns and skips init when `entries` is missing / empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = makeContainer('<button class="cell">A</button>');

    // @ts-expect-error -- intentionally missing required options
    $(container).arvoTooltipContainer({});
    expect($.data(container, 'arvoTooltipContainer')).toBeUndefined();
    expect(warn).toHaveBeenCalled();

    warn.mockClear();
    $(container).arvoTooltipContainer({ entries: [] });
    expect($.data(container, 'arvoTooltipContainer')).toBeUndefined();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Kendo-shape smoke test -- a stripped-down mirror of the real Kibo config,
// to prove the multi-entry / per-placement / per-truncation shape actually
// covers the real-world migration surface the design decision was made for.
// ---------------------------------------------------------------------------

describe('ArvoTooltipContainer -- Kendo-shape smoke test', () => {
  it('a Kibo-style multi-entry config drives the manager correctly across selectors', async () => {
    const manager = createEnabledManager();
    const container = makeContainer(`
      <div class="member-tile"><span class="member-tile__text">Some long text</span></div>
      <button class="attr-menu-btn" aria-label="Menu">M</button>
      <span class="hf-attr-counter"><span class="o9ds-counter__value">3</span></span>
    `);

    const tile = container.querySelector<HTMLElement>('.member-tile')!;
    const tileText = tile.querySelector<HTMLElement>('.member-tile__text')!;
    const menuBtn = container.querySelector<HTMLElement>('.attr-menu-btn')!;
    const counter = container.querySelector<HTMLElement>('.hf-attr-counter')!;

    forceTruncated(tileText);

    const entries: ArvoTooltipContainerEntry[] = [
      {
        filter: '.member-tile:not(.member-tile--overflow)',
        textSelector: '.member-tile__text',
        truncated: true,
        content: (el) => el.querySelector('.member-tile__text')?.textContent ?? '',
      },
      {
        filter: '.attr-menu-btn',
        placement: 'top-center',
        content: () => 'Attribute menu',
      },
      {
        filter: '.hf-attr-counter',
        content: (el) => {
          const v = el.querySelector('.o9ds-counter__value')?.textContent ?? '';
          return `${v} selected`;
        },
      },
    ];

    ArvoTooltipContainer.initialize(container, { entries }, manager);

    // Truncated member tile shows its inner text; placement is manager default (bottom).
    await hover(tile);
    expect(manager.isVisible()).toBe(true);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Some long text');
    expect(manager.getElement()!.getAttribute('data-arvo-side')).toBe('bottom');

    // Menu button shows its static translated string, placement top.
    await unhover(tile, menuBtn);
    await hover(menuBtn, tile);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('Attribute menu');
    expect(manager.getElement()!.getAttribute('data-arvo-side')).toBe('top');

    // Counter shows dynamic content derived from an inner element.
    await unhover(menuBtn, counter);
    await hover(counter, menuBtn);
    expect(document.querySelector('.arvo-tip__txt')!.textContent).toBe('3 selected');
  });
});
