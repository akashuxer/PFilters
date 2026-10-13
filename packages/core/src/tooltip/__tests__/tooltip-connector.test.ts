// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectTooltip } from '../tooltip-connector';
import type { TooltipManager, TooltipShowOptions } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockManager(): TooltipManager & {
  showCalls: TooltipShowOptions[];
  hideCalls: boolean[];
} {
  const showCalls: TooltipShowOptions[] = [];
  const hideCalls: boolean[] = [];
  return {
    configure: vi.fn(),
    getConfig: vi.fn(() => ({
      enabled: true,
      hoverDelay: 400,
      hideDelay: 0,
      gap: 4,
      defaultPlacement: 'bottom-center',
    })),
    show: vi.fn((options: TooltipShowOptions) => {
      showCalls.push(options);
    }),
    hide: vi.fn((immediate?: boolean) => {
      hideCalls.push(!!immediate);
    }),
    isVisible: vi.fn(() => false),
    getElement: vi.fn(() => null),
    destroy: vi.fn(),
    showCalls,
    hideCalls,
  } as unknown as TooltipManager & {
    showCalls: TooltipShowOptions[];
    hideCalls: boolean[];
  };
}

function makeAnchor(text = 'Anchor'): HTMLElement {
  const el = document.createElement('button');
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Show / hide event wiring
// ---------------------------------------------------------------------------

describe('connectTooltip - event wiring', () => {
  it('mouseenter on anchor calls manager.show with the configured content', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const connector = connectTooltip(manager, { anchor, content: 'Tip text' });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));

    expect(manager.showCalls.length).toBe(1);
    expect(manager.showCalls[0]).toMatchObject({
      anchor,
      content: 'Tip text',
      trigger: 'hover',
    });
    connector.destroy();
  });

  it('mouseleave on anchor calls manager.hide()', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const connector = connectTooltip(manager, { anchor, content: 'Tip' });

    anchor.dispatchEvent(new MouseEvent('mouseleave'));
    expect(manager.hideCalls.length).toBe(1);
    expect(manager.hideCalls[0]).toBe(false);
    connector.destroy();
  });

  it('focusout on anchor calls manager.hide(true) (immediate)', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const connector = connectTooltip(manager, { anchor, content: 'Tip' });

    anchor.dispatchEvent(new FocusEvent('focusout'));
    expect(manager.hideCalls.length).toBe(1);
    expect(manager.hideCalls[0]).toBe(true);
    connector.destroy();
  });

  it('content as a function is invoked on each show (dynamic resolution)', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const resolver = vi.fn(() => 'resolved-content');
    const connector = connectTooltip(manager, { anchor, content: resolver });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    anchor.dispatchEvent(new MouseEvent('mouseleave'));
    anchor.dispatchEvent(new MouseEvent('mouseenter'));

    expect(resolver).toHaveBeenCalledTimes(2);
    expect(manager.showCalls.every((c) => c.content === 'resolved-content')).toBe(true);
    connector.destroy();
  });

  it('placement and shortcut pass-through to manager.show', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const connector = connectTooltip(manager, {
      anchor,
      content: 'Tip',
      placement: 'top-center',
      shortcut: 'Ctrl+K',
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls[0]).toMatchObject({
      placement: 'top-center',
      shortcut: 'Ctrl+K',
    });
    connector.destroy();
  });
});

// ---------------------------------------------------------------------------
// Truncation suppression
// ---------------------------------------------------------------------------

describe('connectTooltip - truncation suppression', () => {
  it('suppresses show when autoOnTruncation=true and label is NOT truncated and content matches', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = document.createElement('span');
    label.textContent = 'Tip';
    anchor.appendChild(label);

    // Force the label to report as NOT truncated.
    Object.defineProperty(label, 'scrollWidth', { value: 50, configurable: true });
    Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(label, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(label, 'clientHeight', { value: 20, configurable: true });

    const connector = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'Tip',
      autoOnTruncation: true,
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(0);
    connector.destroy();
  });

  it('shows when autoOnTruncation=true and label IS truncated', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = document.createElement('span');
    label.textContent = 'A long label';
    anchor.appendChild(label);

    Object.defineProperty(label, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(label, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(label, 'clientHeight', { value: 20, configurable: true });

    const connector = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'A long label',
      autoOnTruncation: true,
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(1);
    connector.destroy();
  });

  it('shows when content differs from label even if label is not truncated', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = document.createElement('span');
    label.textContent = 'Short label';
    anchor.appendChild(label);

    Object.defineProperty(label, 'scrollWidth', { value: 50, configurable: true });
    Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(label, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(label, 'clientHeight', { value: 20, configurable: true });

    const connector = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'A different tooltip body',
      autoOnTruncation: true,
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(1);
    connector.destroy();
  });

  it('autoOnTruncation=false always shows regardless of label dimensions', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = document.createElement('span');
    label.textContent = 'Tip';
    anchor.appendChild(label);

    Object.defineProperty(label, 'scrollWidth', { value: 50, configurable: true });
    Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });

    const connector = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'Tip',
      autoOnTruncation: false,
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(1);
    connector.destroy();
  });
});

// ---------------------------------------------------------------------------
// :focus-visible gating
// ---------------------------------------------------------------------------

describe('connectTooltip - focus trigger wiring', () => {
  // Note: when CSS.supports('selector(:focus-visible)') is unavailable (as
  // happens in some jsdom builds), the connector intentionally falls back to
  // always-show on focusin. These tests therefore assert the wiring shape --
  // focusin produces a manager.show with trigger='focus' -- rather than the
  // browser-only suppression behavior.
  it('focusin on anchor calls manager.show with trigger="focus"', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    vi.spyOn(anchor, 'matches').mockImplementation((sel: string) =>
      sel === ':focus-visible',
    );

    const connector = connectTooltip(manager, { anchor, content: 'Tip' });
    anchor.dispatchEvent(new FocusEvent('focusin'));

    expect(manager.showCalls.length).toBe(1);
    expect(manager.showCalls[0].trigger).toBe('focus');
    connector.destroy();
  });

  it('truncation suppression applies on focusin the same way it does on mouseenter', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = document.createElement('span');
    label.textContent = 'Tip';
    anchor.appendChild(label);

    Object.defineProperty(label, 'scrollWidth', { value: 50, configurable: true });
    Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(label, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(label, 'clientHeight', { value: 20, configurable: true });

    const connector = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'Tip',
      autoOnTruncation: true,
    });

    anchor.dispatchEvent(new FocusEvent('focusin'));
    expect(manager.showCalls.length).toBe(0);
    connector.destroy();
  });
});

// ---------------------------------------------------------------------------
// update() and destroy()
// ---------------------------------------------------------------------------

describe('connectTooltip - update() and destroy()', () => {
  it('update() with a new anchor re-binds listeners (old anchor stops firing show)', () => {
    const manager = makeMockManager();
    const first = makeAnchor('first');
    const second = makeAnchor('second');
    const connector = connectTooltip(manager, { anchor: first, content: 'Tip' });

    connector.update({ anchor: second });

    first.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(0);

    second.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(1);
    expect(manager.showCalls[0].anchor).toBe(second);

    connector.destroy();
  });

  it('update() without changing anchor keeps the listeners bound and updates options', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const connector = connectTooltip(manager, { anchor, content: 'Old' });

    connector.update({ content: 'New' });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(1);
    expect(manager.showCalls[0].content).toBe('New');
    connector.destroy();
  });

  it('destroy() unbinds listeners and forces an immediate hide', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const connector = connectTooltip(manager, { anchor, content: 'Tip' });

    connector.destroy();

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(0);
    expect(manager.hideCalls).toContain(true);
  });
});

// ---------------------------------------------------------------------------
// Explicit vs truncation collision
// ---------------------------------------------------------------------------

/**
 * Wire a label inside an anchor and force it to report as visually truncated.
 * Returns the label element so the caller can drive truncation tooltips.
 */
function makeTruncatedLabel(anchor: HTMLElement, text: string): HTMLElement {
  const label = document.createElement('span');
  label.textContent = text;
  anchor.appendChild(label);
  Object.defineProperty(label, 'scrollWidth', { value: 200, configurable: true });
  Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });
  Object.defineProperty(label, 'scrollHeight', { value: 20, configurable: true });
  Object.defineProperty(label, 'clientHeight', { value: 20, configurable: true });
  return label;
}

describe('connectTooltip - explicit vs truncation collision', () => {
  it('truncation connector yields when an explicit connector is bound to the same anchor', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = makeTruncatedLabel(anchor, 'A long label');

    const explicit = connectTooltip(manager, {
      anchor,
      content: 'Explicit body',
      kind: 'explicit',
    });
    const truncation = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'A long label',
      autoOnTruncation: true,
      kind: 'truncation',
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));

    // Only the explicit connector should call show. Both listeners fire,
    // but the truncation connector returns early in shouldSuppress().
    expect(manager.showCalls.length).toBe(1);
    expect(manager.showCalls[0].content).toBe('Explicit body');

    truncation.destroy();
    explicit.destroy();
  });

  it('truncation connector yields when an explicit connector is bound to an ANCESTOR of the anchor', () => {
    const manager = makeMockManager();
    const card = document.createElement('div');
    document.body.appendChild(card);
    const titleEl = document.createElement('span');
    titleEl.textContent = 'A long card title';
    card.appendChild(titleEl);
    Object.defineProperty(titleEl, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(titleEl, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(titleEl, 'scrollHeight', { value: 20, configurable: true });
    Object.defineProperty(titleEl, 'clientHeight', { value: 20, configurable: true });

    const explicit = connectTooltip(manager, {
      anchor: card,
      content: 'Card explanation',
      kind: 'explicit',
    });
    const truncation = connectTooltip(manager, {
      anchor: titleEl,
      labelElement: titleEl,
      content: 'A long card title',
      autoOnTruncation: true,
      kind: 'truncation',
    });

    titleEl.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(0);

    truncation.destroy();
    explicit.destroy();
  });

  it('destroying the explicit connector re-enables the truncation tooltip', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = makeTruncatedLabel(anchor, 'A long label');

    const explicit = connectTooltip(manager, {
      anchor,
      content: 'Explicit body',
      kind: 'explicit',
    });
    const truncation = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'A long label',
      autoOnTruncation: true,
      kind: 'truncation',
    });

    explicit.destroy();
    // After tearing down the explicit owner the truncation connector
    // (and only it) should fire.
    manager.showCalls.length = 0;
    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(manager.showCalls.length).toBe(1);
    expect(manager.showCalls[0].content).toBe('A long label');

    truncation.destroy();
  });

  it('two explicit connectors on the same anchor refcount correctly', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = makeTruncatedLabel(anchor, 'A long label');

    const explicitA = connectTooltip(manager, {
      anchor,
      content: 'A',
      kind: 'explicit',
    });
    const explicitB = connectTooltip(manager, {
      anchor,
      content: 'B',
      kind: 'explicit',
    });
    const truncation = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'A long label',
      autoOnTruncation: true,
      kind: 'truncation',
    });

    // Drop one explicit owner; the marker must still be active.
    explicitA.destroy();
    manager.showCalls.length = 0;
    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    const truncationContent = 'A long label';
    expect(
      manager.showCalls.some((c) => c.content === truncationContent),
    ).toBe(false);

    // Drop the second explicit owner; truncation tooltip resumes.
    explicitB.destroy();
    manager.showCalls.length = 0;
    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(
      manager.showCalls.some((c) => c.content === truncationContent),
    ).toBe(true);

    truncation.destroy();
  });

  it('default kind is "explicit" -- existing callers without `kind` still mark the anchor', () => {
    const manager = makeMockManager();
    const anchor = makeAnchor();
    const label = makeTruncatedLabel(anchor, 'A long label');

    // Note: no `kind` specified -- should default to 'explicit'.
    const explicit = connectTooltip(manager, {
      anchor,
      content: 'Explicit body',
    });
    const truncation = connectTooltip(manager, {
      anchor,
      labelElement: label,
      content: 'A long label',
      autoOnTruncation: true,
      kind: 'truncation',
    });

    anchor.dispatchEvent(new MouseEvent('mouseenter'));
    expect(
      manager.showCalls.some((c) => c.content === 'A long label'),
    ).toBe(false);
    expect(
      manager.showCalls.some((c) => c.content === 'Explicit body'),
    ).toBe(true);

    truncation.destroy();
    explicit.destroy();
  });

  it('truncation connector requests suppressAria=true; explicit connector does not', () => {
    const manager = makeMockManager();
    const explicitAnchor = makeAnchor('explicit');
    const truncationAnchor = makeAnchor('trunc');
    const label = makeTruncatedLabel(truncationAnchor, 'A long label');

    const explicit = connectTooltip(manager, {
      anchor: explicitAnchor,
      content: 'Explicit body',
      kind: 'explicit',
    });
    const truncation = connectTooltip(manager, {
      anchor: truncationAnchor,
      labelElement: label,
      content: 'A long label',
      autoOnTruncation: true,
      kind: 'truncation',
    });

    explicitAnchor.dispatchEvent(new MouseEvent('mouseenter'));
    truncationAnchor.dispatchEvent(new MouseEvent('mouseenter'));

    const explicitCall = manager.showCalls.find(
      (c) => c.content === 'Explicit body',
    );
    const truncationCall = manager.showCalls.find(
      (c) => c.content === 'A long label',
    );

    expect(explicitCall?.suppressAria).toBeFalsy();
    expect(truncationCall?.suppressAria).toBe(true);

    truncation.destroy();
    explicit.destroy();
  });
});
