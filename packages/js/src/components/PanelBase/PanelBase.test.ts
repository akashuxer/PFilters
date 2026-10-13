import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPanelBase,
  type PanelBaseOptions,
  type PanelBaseInstance,
} from './PanelBase';

// ArvoSearch uses a ResizeObserver for its dynamic-actions padding pattern;
// jsdom doesn't ship the API. Polyfill it before any test that mounts
// a sticky search.
beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

// PanelBase is an INTERNAL primitive. These tests exercise the shell surface
// directly so the public wrappers only need to verify their own body plumbing.

let hostEl: HTMLElement;

function create(options: Partial<PanelBaseOptions> = {}): PanelBaseInstance {
  return createPanelBase(hostEl, {
    panelType: 'custom',
    ariaLabel: 'Test panel',
    displayMode: 'docked',
    ...options,
  });
}

beforeEach(() => {
  hostEl = document.createElement('div');
  document.body.appendChild(hostEl);
});

afterEach(() => {
  hostEl.remove();
});

// ---------------------------------------------------------------------------
// Rendering + panelType marker
// ---------------------------------------------------------------------------

describe('PanelBase JS -- rendering', () => {
  it('writes the panelType modifier to the host', () => {
    const p = create({ panelType: 'filter' });
    expect(hostEl.classList.contains('arvo-pnl--type-filter')).toBe(true);
    p.destroy();
  });

  it('appends extraHostClasses to the host', () => {
    const p = create({
      panelType: 'filter',
      extraHostClasses: [
        'arvo-pnl--filter-flat',
        'arvo-pnl--select-multi',
      ],
    });
    expect(hostEl.classList.contains('arvo-pnl--filter-flat')).toBe(true);
    expect(hostEl.classList.contains('arvo-pnl--select-multi')).toBe(true);
    p.destroy();
  });

  it('renders __pane and __body containers', () => {
    const p = create();
    expect(hostEl.querySelector('.arvo-pnl__pane')).not.toBeNull();
    expect(hostEl.querySelector('.arvo-pnl__body')).not.toBeNull();
    p.destroy();
  });

  it('exposes hostEl / paneEl / bodyEl on the instance', () => {
    const p = create();
    expect(p.hostEl).toBe(hostEl);
    expect(p.paneEl.classList.contains('arvo-pnl__pane')).toBe(true);
    expect(p.bodyEl.classList.contains('arvo-pnl__body')).toBe(true);
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// Body seeding + replaceBody
// ---------------------------------------------------------------------------

describe('PanelBase JS -- body slot', () => {
  it('mounts the body option element into __body at construct time', () => {
    const inner = document.createElement('p');
    inner.setAttribute('data-testid', 'seed');
    const p = create({ body: inner });
    expect(hostEl.querySelector('[data-testid="seed"]')).not.toBeNull();
    p.destroy();
  });

  it('replaceBody swaps the body element in place', () => {
    const first = document.createElement('p');
    first.setAttribute('data-testid', 'first');
    const p = create({ body: first });
    expect(hostEl.querySelector('[data-testid="first"]')).not.toBeNull();

    const second = document.createElement('p');
    second.setAttribute('data-testid', 'second');
    p.replaceBody(second);
    expect(hostEl.querySelector('[data-testid="first"]')).toBeNull();
    expect(hostEl.querySelector('[data-testid="second"]')).not.toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// Sticky search variants
// ---------------------------------------------------------------------------

describe('PanelBase JS -- sticky search variants', () => {
  it('search: true mounts a plain ArvoSearch', () => {
    const p = create({ stickyHeader: { search: true } });
    expect(hostEl.querySelector('.arvo-pnl__search .arvo-search')).not.toBeNull();
    expect(hostEl.querySelector('.arvo-adv-search')).toBeNull();
    p.destroy();
  });

  it('search.variant = "advance-search" mounts ArvoAdvanceSearch (default filterBy)', () => {
    const p = create({
      stickyHeader: { search: { variant: 'advance-search' } },
    });
    expect(hostEl.querySelector('.arvo-pnl__search .arvo-adv-search')).not.toBeNull();
    expect(hostEl.querySelector('.arvo-adv-search--filter-by')).not.toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// Search query subscription
// ---------------------------------------------------------------------------

describe('PanelBase JS -- onSearchQueryChange subscription', () => {
  it('fires immediately with the current query on subscribe', () => {
    const p = create({ stickyHeader: { search: true } });
    const listener = vi.fn();
    const unsubscribe = p.onSearchQueryChange(listener);
    expect(listener).toHaveBeenCalledWith('');
    unsubscribe();
    p.destroy();
  });

  it('emits when the search value commits (blur) and unsubscribe stops emissions', () => {
    // JS ArvoSearch fires `onChange` on blur (matching the native
    // change-event semantics of the underlying input). The PanelBase
    // subscription hook therefore sees the committed value on blur.
    const p = create({ stickyHeader: { search: true } });
    const events: string[] = [];
    const unsubscribe = p.onSearchQueryChange((q) => events.push(q));
    const input = hostEl.querySelector<HTMLInputElement>('.arvo-pnl__search input');
    expect(input).not.toBeNull();
    input!.value = 'x';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(events.at(-1)).toBe('x');
    unsubscribe();
    input!.value = 'y';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new Event('blur', { bubbles: true }));
    // Last received is still 'x' because we unsubscribed before the
    // second blur.
    expect(events.at(-1)).toBe('x');
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// Rich header hasClear
// ---------------------------------------------------------------------------

describe('PanelBase JS -- rich header hasClear', () => {
  it('renders the clear button, fires onClear, and removes the region', () => {
    const onClear = vi.fn();
    const content = document.createElement('span');
    content.textContent = 'Identity';
    const p = create({
      richHeader: {
        content,
        hasClear: true,
        onClear,
      },
    });
    const btn = hostEl.querySelector<HTMLButtonElement>(
      'button.arvo-pnl__rich-hdr-clear',
    );
    expect(btn).not.toBeNull();
    btn!.click();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).toBeNull();
    p.destroy();
  });

  it('omits the clear button when hasClear is falsy', () => {
    const p = create({
      richHeader: { content: 'plain' },
    });
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).not.toBeNull();
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr-clear')).toBeNull();
    p.destroy();
  });

  it('setRichHeader can install a rich header after construct', () => {
    const p = create();
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).toBeNull();
    const content = document.createElement('span');
    content.setAttribute('data-testid', 'late');
    p.setRichHeader(content);
    expect(hostEl.querySelector('.arvo-pnl__rich-hdr')).not.toBeNull();
    expect(hostEl.querySelector('[data-testid="late"]')).not.toBeNull();
    p.destroy();
  });
});

// ---------------------------------------------------------------------------
// Handle surface
// ---------------------------------------------------------------------------

describe('PanelBase JS -- handle surface', () => {
  it('exposes open/close/toggle/isOpen/pinned/expanded/size/etc.', () => {
    const p = create({ isPinnable: true, isExpandable: true });
    expect(typeof p.open).toBe('function');
    expect(typeof p.close).toBe('function');
    expect(typeof p.toggle).toBe('function');
    expect(typeof p.isOpen).toBe('function');
    expect(typeof p.pinned).toBe('function');
    expect(typeof p.expanded).toBe('function');
    expect(typeof p.size).toBe('function');
    expect(typeof p.setDisplayMode).toBe('function');
    expect(typeof p.search).toBe('function');
    expect(typeof p.onSearchQueryChange).toBe('function');
    p.destroy();
  });
});
