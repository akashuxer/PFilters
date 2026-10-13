// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import {
  ArvoLoader,
  ARVO_LOADER_VARIANTS,
  ARVO_LOADER_SIZES,
  ARVO_LOADER_ORIENTATIONS,
  ARVO_LOADER_TONES,
  ARVO_LOADER_DEFAULT_MESSAGE,
} from './Loader';

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoLoader - initialize', () => {
  it('static initialize() returns an instance', () => {
    const loader = ArvoLoader.initialize(host());
    expect(loader).toBeInstanceOf(ArvoLoader);
  });

  it('initialize(null) creates a fresh div', () => {
    const loader = ArvoLoader.initialize(null);
    expect(loader.el.tagName).toBe('DIV');
  });

  it('decorates the host element with the .arvo-loader class', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.classList.contains('arvo-loader')).toBe(true);
  });

  it('renders the __shape container with aria-hidden', () => {
    const el = host();
    new ArvoLoader(el);
    const shape = el.querySelector('.arvo-loader__shape');
    expect(shape).not.toBeNull();
    expect(shape?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sets role="status" and aria-live="polite"', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('ArvoLoader - defaults', () => {
  it('defaults variant to dot', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.classList.contains('arvo-loader--dot')).toBe(true);
    expect(el.querySelectorAll('.arvo-loader__dot').length).toBe(3);
  });

  it('defaults size to md', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.classList.contains('arvo-loader--md')).toBe(true);
  });

  it('defaults orientation to horizontal', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.classList.contains('arvo-loader--horizontal')).toBe(true);
  });

  it('defaults tone to theme', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.classList.contains('arvo-loader--theme')).toBe(true);
  });

  it('defaults the visible label + aria-label to "Loading"', () => {
    const el = host();
    new ArvoLoader(el);
    expect(el.querySelector('.arvo-loader__msg')?.textContent).toBe('Loading');
    expect(el.getAttribute('aria-label')).toBe('Loading');
  });
});

// ---------------------------------------------------------------------------
// Variant rendering
// ---------------------------------------------------------------------------

describe('ArvoLoader - variant rendering', () => {
  it('exposes a registry of all three variants', () => {
    expect(ARVO_LOADER_VARIANTS).toEqual(['dot', 'circular', 'square']);
  });

  it.each(ARVO_LOADER_VARIANTS)('applies arvo-loader--%s', (variant) => {
    const el = host();
    new ArvoLoader(el, { variant });
    expect(el.classList.contains(`arvo-loader--${variant}`)).toBe(true);
  });

  it('renders three __dot children for variant=dot', () => {
    const el = host();
    new ArvoLoader(el, { variant: 'dot' });
    expect(el.querySelectorAll('.arvo-loader__dot').length).toBe(3);
    expect(el.querySelector('.arvo-loader__circle')).toBeNull();
    expect(el.querySelector('.arvo-loader__square')).toBeNull();
  });

  it('renders one __circle child for variant=circular', () => {
    const el = host();
    new ArvoLoader(el, { variant: 'circular' });
    expect(el.querySelectorAll('.arvo-loader__circle').length).toBe(1);
    expect(el.querySelectorAll('.arvo-loader__dot').length).toBe(0);
    expect(el.querySelector('.arvo-loader__square')).toBeNull();
  });

  it('renders one __square child for variant=square', () => {
    const el = host();
    new ArvoLoader(el, { variant: 'square' });
    expect(el.querySelectorAll('.arvo-loader__square').length).toBe(1);
    expect(el.querySelectorAll('.arvo-loader__dot').length).toBe(0);
    expect(el.querySelector('.arvo-loader__circle')).toBeNull();
  });

  it('falls back to dot for an invalid variant', () => {
    const el = host();
    new ArvoLoader(el, { variant: 'spinner' as never });
    expect(el.classList.contains('arvo-loader--dot')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sizes / orientations / tones
// ---------------------------------------------------------------------------

describe('ArvoLoader - sizes', () => {
  it.each(ARVO_LOADER_SIZES)('applies arvo-loader--%s', (size) => {
    const el = host();
    new ArvoLoader(el, { size });
    expect(el.classList.contains(`arvo-loader--${size}`)).toBe(true);
  });

  it('falls back to md for an invalid size', () => {
    const el = host();
    new ArvoLoader(el, { size: 'xl' as never });
    expect(el.classList.contains('arvo-loader--md')).toBe(true);
  });
});

describe('ArvoLoader - orientations', () => {
  it.each(ARVO_LOADER_ORIENTATIONS)('applies arvo-loader--%s', (orientation) => {
    const el = host();
    new ArvoLoader(el, { orientation });
    expect(el.classList.contains(`arvo-loader--${orientation}`)).toBe(true);
  });
});

describe('ArvoLoader - tones', () => {
  it.each(ARVO_LOADER_TONES)('applies arvo-loader--%s', (tone) => {
    const el = host();
    new ArvoLoader(el, { tone });
    expect(el.classList.contains(`arvo-loader--${tone}`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

describe('ArvoLoader - message', () => {
  it('renders the visible label inside __msg', () => {
    const el = host();
    new ArvoLoader(el, { message: 'Loading dashboards' });
    expect(el.querySelector('.arvo-loader__msg')?.textContent).toBe('Loading dashboards');
    expect(el.getAttribute('aria-label')).toBe('Loading dashboards');
  });

  it('hides the __msg when message is null', () => {
    const el = host();
    new ArvoLoader(el, { message: null });
    expect(el.querySelector('.arvo-loader__msg')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe(ARVO_LOADER_DEFAULT_MESSAGE);
  });

  it('hides the __msg when message is empty string', () => {
    const el = host();
    new ArvoLoader(el, { message: '' });
    expect(el.querySelector('.arvo-loader__msg')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe(ARVO_LOADER_DEFAULT_MESSAGE);
  });
});

// ---------------------------------------------------------------------------
// Setter methods
// ---------------------------------------------------------------------------

describe('ArvoLoader - setter methods', () => {
  it('setVariant rebuilds the shape DOM', () => {
    const el = host();
    const loader = new ArvoLoader(el, { variant: 'dot' });
    loader.setVariant('circular');
    expect(el.classList.contains('arvo-loader--circular')).toBe(true);
    expect(el.classList.contains('arvo-loader--dot')).toBe(false);
    expect(el.querySelectorAll('.arvo-loader__circle').length).toBe(1);
    expect(el.querySelectorAll('.arvo-loader__dot').length).toBe(0);
  });

  it('setSize swaps the size modifier', () => {
    const el = host();
    const loader = new ArvoLoader(el, { size: 'sm' });
    loader.setSize('lg');
    expect(el.classList.contains('arvo-loader--lg')).toBe(true);
    expect(el.classList.contains('arvo-loader--sm')).toBe(false);
  });

  it('setOrientation swaps the orientation modifier', () => {
    const el = host();
    const loader = new ArvoLoader(el);
    loader.setOrientation('vertical');
    expect(el.classList.contains('arvo-loader--vertical')).toBe(true);
    expect(el.classList.contains('arvo-loader--horizontal')).toBe(false);
  });

  it('setTone swaps the tone modifier', () => {
    const el = host();
    const loader = new ArvoLoader(el);
    loader.setTone('inverse');
    expect(el.classList.contains('arvo-loader--inverse')).toBe(true);
    expect(el.classList.contains('arvo-loader--theme')).toBe(false);
  });

  it('setMessage updates both the visible label and aria-label', () => {
    const el = host();
    const loader = new ArvoLoader(el);
    loader.setMessage('Submitting');
    expect(el.querySelector('.arvo-loader__msg')?.textContent).toBe('Submitting');
    expect(el.getAttribute('aria-label')).toBe('Submitting');
  });

  it('setMessage(null) hides the visible label but keeps aria-label as Loading', () => {
    const el = host();
    const loader = new ArvoLoader(el);
    loader.setMessage(null);
    expect(el.querySelector('.arvo-loader__msg')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe(ARVO_LOADER_DEFAULT_MESSAGE);
  });

  it('setMessage adds a __msg when previously hidden', () => {
    const el = host();
    const loader = new ArvoLoader(el, { message: null });
    expect(el.querySelector('.arvo-loader__msg')).toBeNull();
    loader.setMessage('Loading');
    expect(el.querySelector('.arvo-loader__msg')?.textContent).toBe('Loading');
  });
});

// ---------------------------------------------------------------------------
// Accessor methods
// ---------------------------------------------------------------------------

describe('ArvoLoader - accessor methods', () => {
  it('variant() returns the current variant', () => {
    const loader = new ArvoLoader(host(), { variant: 'circular' });
    expect(loader.variant()).toBe('circular');
  });

  it('size() returns the current size', () => {
    const loader = new ArvoLoader(host(), { size: 'lg' });
    expect(loader.size()).toBe('lg');
  });

  it('orientation() returns the current orientation', () => {
    const loader = new ArvoLoader(host(), { orientation: 'vertical' });
    expect(loader.orientation()).toBe('vertical');
  });

  it('tone() returns the current tone', () => {
    const loader = new ArvoLoader(host(), { tone: 'subtle' });
    expect(loader.tone()).toBe('subtle');
  });

  it('message() returns the current message (null when hidden)', () => {
    const a = new ArvoLoader(host(), { message: 'Hi' });
    expect(a.message()).toBe('Hi');
    const b = new ArvoLoader(host(), { message: null });
    expect(b.message()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ArvoLoader - destroy', () => {
  it('clears inner DOM and decorations; preserves the host element', () => {
    const el = host();
    const loader = new ArvoLoader(el);
    loader.destroy();
    expect(el.textContent).toBe('');
    expect(el.hasAttribute('class')).toBe(false);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-live')).toBe(false);
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.isConnected).toBe(true);
  });

  it('is idempotent', () => {
    const el = host();
    const loader = new ArvoLoader(el);
    loader.destroy();
    expect(() => loader.destroy()).not.toThrow();
  });
});
