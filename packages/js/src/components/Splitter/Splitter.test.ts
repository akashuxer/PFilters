import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoSplitter } from './Splitter';

describe('ArvoSplitter -- rendering (resizable, default)', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.removeChild(host);
  });

  it('renders with role=separator, arvo-spl class, and resizable modifier', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize panel',
      minSize: 100,
      maxSize: 500,
      value: 200,
    });
    expect(host.classList.contains('arvo-spl')).toBe(true);
    expect(host.classList.contains('arvo-spl--vertical')).toBe(true);
    expect(host.classList.contains('arvo-spl--resizable')).toBe(true);
    expect(host.getAttribute('role')).toBe('separator');
    expect(host.getAttribute('aria-label')).toBe('Resize panel');
    expect(host.getAttribute('aria-orientation')).toBe('vertical');
    expect(host.getAttribute('aria-valuemin')).toBe('100');
    expect(host.getAttribute('aria-valuemax')).toBe('500');
    expect(host.getAttribute('aria-valuenow')).toBe('200');
    expect(host.tabIndex).toBe(0);
  });

  it('renders __handle decorative span when resizable', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 0,
      maxSize: 100,
    });
    expect(host.querySelector('.arvo-spl__handle')).not.toBeNull();
  });

  it('applies horizontal orientation', () => {
    ArvoSplitter.initialize(host, {
      orientation: 'horizontal',
      ariaLabel: 'Resize',
      minSize: 0,
      maxSize: 100,
    });
    expect(host.classList.contains('arvo-spl--horizontal')).toBe(true);
    expect(host.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('clamps initial value to bounds', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 100,
      maxSize: 200,
      value: 50,
    });
    expect(host.getAttribute('aria-valuenow')).toBe('100');
  });

  it('initial value defaults to minSize when omitted and no target', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 100,
      maxSize: 500,
    });
    expect(host.getAttribute('aria-valuenow')).toBe('100');
  });

  it('throws when maxSize <= minSize (and not null)', () => {
    expect(() =>
      ArvoSplitter.initialize(host, {
        ariaLabel: 'Resize',
        minSize: 100,
        maxSize: 50,
      }),
    ).toThrow();
  });

  it('throws when ariaLabel is missing AND isResizable=true', () => {
    expect(() =>
      ArvoSplitter.initialize(host, {
        minSize: 0,
        maxSize: 100,
      }),
    ).toThrow();
  });

  it('omits aria-valuemax when maxSize is not provided', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      value: 100,
    });
    expect(host.getAttribute('aria-valuemax')).toBeNull();
    expect(host.getAttribute('aria-valuemin')).toBe('0');
  });

  it('sets disabled state initially', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 0,
      maxSize: 100,
      isDisabled: true,
    });
    expect(host.classList.contains('arvo-spl--disabled')).toBe(true);
    expect(host.classList.contains('is-disabled')).toBe(true);
    expect(host.getAttribute('aria-disabled')).toBe('true');
    expect(host.tabIndex).toBe(-1);
  });
});

describe('ArvoSplitter -- rendering (static separator)', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.removeChild(host);
  });

  it('renders a static separator with no handle, no value attrs, no tabindex', () => {
    ArvoSplitter.initialize(host, { isResizable: false });
    expect(host.classList.contains('arvo-spl')).toBe(true);
    expect(host.classList.contains('arvo-spl--vertical')).toBe(true);
    expect(host.classList.contains('arvo-spl--resizable')).toBe(false);
    expect(host.getAttribute('role')).toBe('separator');
    expect(host.getAttribute('aria-orientation')).toBe('vertical');
    // No value attributes for a static separator.
    expect(host.getAttribute('aria-valuemin')).toBeNull();
    expect(host.getAttribute('aria-valuemax')).toBeNull();
    expect(host.getAttribute('aria-valuenow')).toBeNull();
    // Not focusable.
    expect(host.tabIndex).toBe(-1);
    // No handle indicator.
    expect(host.querySelector('.arvo-spl__handle')).toBeNull();
  });

  it('does not require ariaLabel when isResizable=false', () => {
    expect(() =>
      ArvoSplitter.initialize(host, { isResizable: false }),
    ).not.toThrow();
  });

  it('ignores keydown / pointerdown / dblclick when not resizable', () => {
    const onResize = vi.fn();
    ArvoSplitter.initialize(host, {
      isResizable: false,
      onResize,
    });
    host.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    host.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onResize).not.toHaveBeenCalled();
  });
});

describe('ArvoSplitter -- target', () => {
  let parent: HTMLElement;
  let pane: HTMLElement;
  let host: HTMLElement;

  beforeEach(() => {
    parent = document.createElement('div');
    parent.style.display = 'flex';
    pane = document.createElement('div');
    pane.id = 'my-pane';
    Object.defineProperty(pane, 'getBoundingClientRect', {
      value: () => ({ width: 240, height: 150 }),
      configurable: true,
    });
    host = document.createElement('div');
    parent.appendChild(pane);
    parent.appendChild(host);
    document.body.appendChild(parent);
  });

  afterEach(() => {
    document.body.removeChild(parent);
  });

  it('applies width to target when orientation=vertical', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      value: 320,
    });
    expect(pane.style.width).toBe('320px');
  });

  it('applies height to target when orientation=horizontal', () => {
    Object.defineProperty(pane, 'getBoundingClientRect', {
      value: () => ({ width: 0, height: 180 }),
      configurable: true,
    });
    ArvoSplitter.initialize(host, {
      orientation: 'horizontal',
      ariaLabel: 'Resize',
      target: pane,
      value: 220,
    });
    expect(pane.style.height).toBe('220px');
  });

  it('auto-derives aria-controls from target.id when ariaControls omitted', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      value: 200,
    });
    expect(host.getAttribute('aria-controls')).toBe('my-pane');
  });

  it('explicit ariaControls wins over target.id', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      ariaControls: 'explicit-id',
      value: 200,
    });
    expect(host.getAttribute('aria-controls')).toBe('explicit-id');
  });

  it('resolves target from a CSS selector', () => {
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: '#my-pane',
      value: 250,
    });
    expect(pane.style.width).toBe('250px');
  });

  it('auto-detects inverse=false when target precedes splitter', () => {
    // target (pane) is before host; dragging right should grow target.
    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      value: 200,
    });
    expect(host.classList.contains('arvo-spl--inverse')).toBe(false);
  });

  it('auto-detects inverse=true when target follows splitter', () => {
    // Swap order so host comes first, then pane.
    parent.innerHTML = '';
    parent.appendChild(host);
    parent.appendChild(pane);

    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      value: 200,
    });
    expect(host.classList.contains('arvo-spl--inverse')).toBe(true);
  });

  it('explicit inverse=false overrides auto-detection', () => {
    parent.innerHTML = '';
    parent.appendChild(host);
    parent.appendChild(pane);

    ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      inverse: false,
      value: 200,
    });
    expect(host.classList.contains('arvo-spl--inverse')).toBe(false);
  });

  it('measures target as initial value when value+defaultValue omitted', () => {
    const inst = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
    });
    expect(inst.value()).toBe(240); // measured width
  });

  it('setTarget(null) clears target and removes aria-controls', () => {
    const inst = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      target: pane,
      value: 200,
    });
    expect(host.getAttribute('aria-controls')).toBe('my-pane');
    inst.setTarget(null);
    expect(host.getAttribute('aria-controls')).toBeNull();
  });
});

describe('ArvoSplitter -- keyboard', () => {
  let host: HTMLElement;
  let onResize: ReturnType<typeof vi.fn>;
  let splitter: ArvoSplitter;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    onResize = vi.fn();
    splitter = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 0,
      maxSize: 500,
      value: 200,
      step: 10,
      pageStep: 50,
      onResize,
    });
  });

  afterEach(() => {
    splitter.destroy();
    document.body.removeChild(host);
  });

  function key(k: string) {
    host.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  }

  it('ArrowRight increases by step', () => {
    key('ArrowRight');
    expect(splitter.value()).toBe(210);
    expect(onResize).toHaveBeenCalledWith({ value: 210, reason: 'keyboard' });
  });

  it('ArrowLeft decreases by step', () => {
    key('ArrowLeft');
    expect(splitter.value()).toBe(190);
  });

  it('PageDown increases by pageStep', () => {
    key('PageDown');
    expect(splitter.value()).toBe(250);
  });

  it('PageUp decreases by pageStep', () => {
    key('PageUp');
    expect(splitter.value()).toBe(150);
  });

  it('Home snaps to minSize', () => {
    key('Home');
    expect(splitter.value()).toBe(0);
  });

  it('End snaps to maxSize', () => {
    key('End');
    expect(splitter.value()).toBe(500);
  });

  it('End is a no-op when maxSize is unbounded', () => {
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const inst = ArvoSplitter.initialize(localHost, {
      ariaLabel: 'Resize',
      value: 100,
      step: 10,
    });
    localHost.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    expect(inst.value()).toBe(100);
    inst.destroy();
    document.body.removeChild(localHost);
  });

  it('clamps at bounds', () => {
    splitter.value(495);
    key('ArrowRight');
    expect(splitter.value()).toBe(500);
    splitter.value(5);
    key('ArrowLeft');
    expect(splitter.value()).toBe(0);
  });

  it('ignores non-handled keys', () => {
    onResize.mockClear();
    key('Enter');
    key(' ');
    expect(onResize).not.toHaveBeenCalled();
  });
});

describe('ArvoSplitter -- double-click reset', () => {
  let host: HTMLElement;
  let splitter: ArvoSplitter;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    splitter = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 100,
      maxSize: 500,
      defaultValue: 240,
      value: 320,
    });
  });

  afterEach(() => {
    splitter.destroy();
    document.body.removeChild(host);
  });

  it('double-click resets to defaultValue', () => {
    expect(splitter.value()).toBe(320);
    host.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(splitter.value()).toBe(240);
  });

  it('fires onReset and spl:reset on double-click', () => {
    const onReset = vi.fn();
    const onResetEvent = vi.fn();
    splitter.destroy();
    splitter = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      defaultValue: 200,
      value: 320,
      onReset,
    });
    host.addEventListener('spl:reset', (e) =>
      onResetEvent((e as CustomEvent).detail),
    );
    host.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onReset).toHaveBeenCalledWith({ value: 200 });
    expect(onResetEvent).toHaveBeenCalledWith({ value: 200 });
  });

  it('reset() method snaps to defaultValue', () => {
    expect(splitter.value()).toBe(320);
    splitter.reset();
    expect(splitter.value()).toBe(240);
  });

  it('respects event.preventDefault from a capture-phase listener', () => {
    expect(splitter.value()).toBe(320);
    // Capture-phase listener on an ancestor runs BEFORE the splitter's
    // target-phase handler, so preventDefault is already set when the
    // splitter checks defaultPrevented.
    const block = (e: Event) => e.preventDefault();
    document.body.addEventListener('dblclick', block, { capture: true });
    host.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
    );
    document.body.removeEventListener('dblclick', block, { capture: true });
    expect(splitter.value()).toBe(320);
  });

  it('does not reset when disabled', () => {
    splitter.disabled(true);
    host.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(splitter.value()).toBe(320);
  });
});

describe('ArvoSplitter -- events', () => {
  it('dispatches spl:resize / spl:resize-start / spl:resize-end / spl:change', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const splitter = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 0,
      maxSize: 500,
      value: 100,
      step: 10,
    });

    const resizeStart = vi.fn();
    const resize = vi.fn();
    const resizeEnd = vi.fn();
    const change = vi.fn();
    host.addEventListener('spl:resize-start', (e) =>
      resizeStart((e as CustomEvent).detail),
    );
    host.addEventListener('spl:resize', (e) => resize((e as CustomEvent).detail));
    host.addEventListener('spl:resize-end', (e) =>
      resizeEnd((e as CustomEvent).detail),
    );
    host.addEventListener('spl:change', (e) => change((e as CustomEvent).detail));

    host.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );

    expect(resizeStart).toHaveBeenCalledWith({ value: 100, reason: 'keyboard' });
    expect(resize).toHaveBeenCalledWith({ value: 110, reason: 'keyboard' });
    expect(resizeEnd).toHaveBeenCalledWith({ value: 110, reason: 'keyboard' });
    expect(change).toHaveBeenCalledWith({ value: 110 });

    splitter.destroy();
    document.body.removeChild(host);
  });
});

describe('ArvoSplitter -- public API', () => {
  let host: HTMLElement;
  let splitter: ArvoSplitter;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    splitter = ArvoSplitter.initialize(host, {
      ariaLabel: 'Resize',
      minSize: 0,
      maxSize: 500,
      value: 100,
    });
  });

  afterEach(() => {
    try {
      splitter.destroy();
    } catch {
      // already destroyed
    }
    if (host.parentElement) document.body.removeChild(host);
  });

  it('value() returns and sets', () => {
    expect(splitter.value()).toBe(100);
    splitter.value(300);
    expect(splitter.value()).toBe(300);
    expect(host.getAttribute('aria-valuenow')).toBe('300');
  });

  it('value() clamps', () => {
    splitter.value(9999);
    expect(splitter.value()).toBe(500);
    splitter.value(-50);
    expect(splitter.value()).toBe(0);
  });

  it('disabled(true) updates DOM + ARIA + tabindex', () => {
    expect(splitter.disabled()).toBe(false);
    splitter.disabled(true);
    expect(host.classList.contains('arvo-spl--disabled')).toBe(true);
    expect(host.getAttribute('aria-disabled')).toBe('true');
    expect(host.tabIndex).toBe(-1);
    splitter.disabled(false);
    expect(host.classList.contains('arvo-spl--disabled')).toBe(false);
    expect(host.getAttribute('aria-disabled')).toBeNull();
    expect(host.tabIndex).toBe(0);
  });

  it('setMinSize / setMaxSize update bounds + ARIA + re-clamp', () => {
    splitter.value(50);
    splitter.setMinSize(100);
    expect(host.getAttribute('aria-valuemin')).toBe('100');
    expect(splitter.value()).toBe(100); // re-clamped up
    splitter.setMaxSize(400);
    expect(host.getAttribute('aria-valuemax')).toBe('400');
  });

  it('setMaxSize(null) removes aria-valuemax (unbounded)', () => {
    splitter.setMaxSize(null);
    expect(host.getAttribute('aria-valuemax')).toBeNull();
  });

  it('destroy() cleans up listeners + DOM attributes', () => {
    splitter.destroy();
    expect(host.classList.contains('arvo-spl')).toBe(false);
    expect(host.getAttribute('role')).toBeNull();
    expect(host.getAttribute('aria-label')).toBeNull();
  });
});
