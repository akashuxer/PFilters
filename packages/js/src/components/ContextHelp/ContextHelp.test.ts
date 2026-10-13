import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArvoContextHelp } from './ContextHelp';
// ---------------------------------------------------------------------------
// Mock the @arvo/core tooltip system
// ---------------------------------------------------------------------------
const { mockConnectTooltip, mockConnectorUpdate, mockConnectorDestroy } = vi.hoisted(() => {
  const mockConnectorUpdate = vi.fn();
  const mockConnectorDestroy = vi.fn();
  const mockConnectTooltip = vi.fn(() => ({
    update: mockConnectorUpdate,
    destroy: mockConnectorDestroy,
  }));
  return { mockConnectTooltip, mockConnectorUpdate, mockConnectorDestroy };
});

vi.mock('@arvo/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arvo/core')>();
  return {
    ...actual,
    connectTooltip: mockConnectTooltip,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createButtonElement(): HTMLButtonElement {
  const el = document.createElement('button');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  mockConnectTooltip.mockClear();
  mockConnectorUpdate.mockClear();
  mockConnectorDestroy.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization / destroy
// ---------------------------------------------------------------------------
describe('ContextHelp - initialization', () => {
  it('static initialize() returns an ArvoContextHelp instance', () => {
    const el = createButtonElement();
    const instance = ArvoContextHelp.initialize(el, { content: 'Help text' });
    expect(instance).toBeInstanceOf(ArvoContextHelp);
  });

  it('constructor returns an ArvoContextHelp instance', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    expect(instance).toBeInstanceOf(ArvoContextHelp);
  });

  it('adds arvo-ctx-help base class', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    expect(el.classList.contains('arvo-ctx-help')).toBe(true);
  });

  it('adds default info variant modifier class', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    expect(el.classList.contains('arvo-ctx-help--info')).toBe(true);
  });

  it('adds default sm size modifier class', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    expect(el.classList.contains('arvo-ctx-help--sm')).toBe(true);
  });

  it('sets type="button"', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    expect(el.getAttribute('type')).toBe('button');
  });

  it('sets aria-label to the content value by default', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help for Safety Stock' });
    expect(el.getAttribute('aria-label')).toBe('Help for Safety Stock');
  });

  it('sets aria-label to ariaLabel when provided', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'tooltip text', ariaLabel: 'Help for Safety Stock' });
    expect(el.getAttribute('aria-label')).toBe('Help for Safety Stock');
  });

  it('inserts icon span with arvo-ctx-help__ico and o9con classes', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico).not.toBeNull();
    expect(ico!.classList.contains('o9con')).toBe(true);
  });

  it('icon span has aria-hidden="true"', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.getAttribute('aria-hidden')).toBe('true');
  });

  it('info variant icon starts with o9con-info-circle glyph', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });

  it('question variant icon starts with o9con-question-circle glyph', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-question-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-question')).toBe(false);
  });

  it('sets disabled when isDisabled is true', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isDisabled: true });
    expect(el.disabled).toBe(true);
  });

  it('falls back to info for an invalid variant', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'invalid' as never });
    expect(el.classList.contains('arvo-ctx-help--info')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--invalid')).toBe(false);
  });

  it('falls back to sm for an invalid size', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', size: 'xl' as never });
    expect(el.classList.contains('arvo-ctx-help--sm')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--xl')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tooltip connection
// ---------------------------------------------------------------------------
describe('ContextHelp - tooltip connection', () => {
  it('connectTooltip is called with the correct anchor and content', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text' });
    expect(mockConnectTooltip).toHaveBeenCalledTimes(1);
    // Cast through unknown because the hoisted vi.fn() loses its parameter
    // typing (the second arg is the connectTooltip config object).
    const args = (mockConnectTooltip.mock.calls[0] as unknown as [unknown, { anchor: HTMLElement; content: string }])[1];
    expect(args.anchor).toBe(el);
    expect(args.content).toBe('Help text');
  });

  it('connectTooltip is NOT called when isDisabled', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isDisabled: true });
    expect(mockConnectTooltip).not.toHaveBeenCalled();
  });

  it('connectTooltip is NOT called when isLoading', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    expect(mockConnectTooltip).not.toHaveBeenCalled();
  });

  it('connector.destroy is called on destroy()', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(mockConnectorDestroy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------
describe('ContextHelp - variant management', () => {
  it('setVariant("question") swaps the modifier class', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    instance.setVariant('question');
    expect(el.classList.contains('arvo-ctx-help--question')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--info')).toBe(false);
  });

  it('setVariant("info") swaps back to info', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    instance.setVariant('info');
    expect(el.classList.contains('arvo-ctx-help--info')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--question')).toBe(false);
  });

  it('setVariant("question") refreshes glyph to o9con-question-circle at rest', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    instance.setVariant('question');
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-question-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle')).toBe(false);
  });

  it('setVariant ignores an invalid value', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    instance.setVariant('invalid');
    expect(el.classList.contains('arvo-ctx-help--info')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--invalid')).toBe(false);
  });

  it('never has two variant classes simultaneously', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    instance.setVariant('question');
    const variantClasses = ArvoContextHelp.VARIANTS.filter(v => el.classList.contains(`arvo-ctx-help--${v}`));
    expect(variantClasses.length).toBe(1);
    expect(variantClasses[0]).toBe('question');
  });
});

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------
describe('ContextHelp - size management', () => {
  it('setSize("lg") swaps the size modifier class', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', size: 'sm' });
    instance.setSize('lg');
    expect(el.classList.contains('arvo-ctx-help--lg')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--sm')).toBe(false);
  });

  it('setSize("sm") swaps back to sm', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', size: 'lg' });
    instance.setSize('sm');
    expect(el.classList.contains('arvo-ctx-help--sm')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--lg')).toBe(false);
  });

  it('setSize ignores an invalid value', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', size: 'sm' });
    instance.setSize('xl');
    expect(el.classList.contains('arvo-ctx-help--sm')).toBe(true);
    expect(el.classList.contains('arvo-ctx-help--xl')).toBe(false);
  });

  it('never has two size classes simultaneously', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', size: 'sm' });
    instance.setSize('lg');
    const sizeClasses = ArvoContextHelp.SIZES.filter(s => el.classList.contains(`arvo-ctx-help--${s}`));
    expect(sizeClasses.length).toBe(1);
    expect(sizeClasses[0]).toBe('lg');
  });
});

// ---------------------------------------------------------------------------
// Hover/focus glyph swap
// ---------------------------------------------------------------------------
describe('ContextHelp - hover/focus glyph swap (info)', () => {
  it('mouseenter swaps info glyph to o9con-info-circle-filled', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle')).toBe(false);
  });

  it('mouseleave reverts info glyph to o9con-info-circle', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });

  it('focus swaps info glyph to o9con-info-circle-filled', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(true);
  });

  it('blur reverts info glyph to o9con-info-circle', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });
});

describe('ContextHelp - hover/focus glyph swap (question)', () => {
  it('mouseenter swaps question glyph to o9con-question', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-question')).toBe(true);
    expect(ico!.classList.contains('o9con-question-circle')).toBe(false);
  });

  it('mouseleave reverts question glyph to o9con-question-circle', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-question-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-question')).toBe(false);
  });

  it('focus swaps question glyph to o9con-question', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-question')).toBe(true);
  });

  it('blur reverts question glyph to o9con-question-circle', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-question-circle')).toBe(true);
  });
});

describe('ContextHelp - glyph swap blocked when disabled or loading', () => {
  it('mouseenter does NOT swap glyph when disabled', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info', isDisabled: true });
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });

  it('focus does NOT swap glyph when disabled', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info', isDisabled: true });
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });

  it('mouseenter does NOT swap glyph when loading', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', variant: 'info', isLoading: true });
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setContent
// ---------------------------------------------------------------------------
describe('ContextHelp - setContent', () => {
  it('setContent updates aria-label when no ariaLabel override', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Old text' });
    instance.setContent('New text');
    expect(el.getAttribute('aria-label')).toBe('New text');
  });

  it('setContent does not change aria-label when ariaLabel override is set', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Old text', ariaLabel: 'Custom label' });
    instance.setContent('New text');
    expect(el.getAttribute('aria-label')).toBe('Custom label');
  });

  it('setContent updates the tooltip connector with the new content', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Old text' });
    instance.setContent('Updated text');
    expect(mockConnectorUpdate).toHaveBeenCalledWith({ content: 'Updated text' });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('ContextHelp - loading state', () => {
  it('constructor with isLoading=true adds loading class', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('constructor with isLoading=true sets aria-busy="true"', () => {
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(true) adds loading class', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.setLoading(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setLoading(true) sets aria-busy="true"', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setLoading(false) removes loading class', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    instance.setLoading(false);
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('setLoading(false) removes aria-busy attribute', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    instance.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('setLoading(true) disconnects the tooltip', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    mockConnectorDestroy.mockClear();
    instance.setLoading(true);
    expect(mockConnectorDestroy).toHaveBeenCalled();
  });

  it('setLoading(false) reconnects the tooltip when not disabled', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    mockConnectTooltip.mockClear();
    instance.setLoading(false);
    expect(mockConnectTooltip).toHaveBeenCalled();
  });

  it('click is suppressed when loading', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isLoading: true, onClick });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// disabled() dual-purpose getter/setter
// ---------------------------------------------------------------------------
describe('ContextHelp - disabled() method', () => {
  it('disabled() returns false when not disabled', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    expect(instance.disabled()).toBe(false);
  });

  it('disabled() returns true when disabled', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isDisabled: true });
    expect(instance.disabled()).toBe(true);
  });

  it('disabled(true) sets element.disabled', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.disabled(true);
    expect(el.disabled).toBe(true);
  });

  it('disabled(false) clears element.disabled', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isDisabled: true });
    instance.disabled(false);
    expect(el.disabled).toBe(false);
  });

  it('disabled(true) disconnects the tooltip', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    mockConnectorDestroy.mockClear();
    instance.disabled(true);
    expect(mockConnectorDestroy).toHaveBeenCalled();
  });

  it('disabled(false) reconnects the tooltip when not loading', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isDisabled: true });
    mockConnectTooltip.mockClear();
    instance.disabled(false);
    expect(mockConnectTooltip).toHaveBeenCalled();
  });

  it('click is suppressed when disabled', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', isDisabled: true, onClick });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disabled(true) blocks glyph swap on hover', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'info' });
    instance.disabled(true);
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const ico = el.querySelector('.arvo-ctx-help__ico');
    expect(ico!.classList.contains('o9con-info-circle')).toBe(true);
    expect(ico!.classList.contains('o9con-info-circle-filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click and keyboard suppression
// ---------------------------------------------------------------------------
describe('ContextHelp - click/keyboard suppression', () => {
  it('onClick callback is called when not blocked', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', onClick });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('onClick receives the Event object', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', onClick });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(Event);
  });

  it('onFocus callback is called when focused', () => {
    const onFocus = vi.fn();
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', onFocus });
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('onBlur callback is called when blurred', () => {
    const onBlur = vi.fn();
    const el = createButtonElement();
    new ArvoContextHelp(el, { content: 'Help text', onBlur });
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// focus()
// ---------------------------------------------------------------------------
describe('ContextHelp - focus() method', () => {
  it('focus() calls element.focus()', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    const spy = vi.spyOn(el, 'focus');
    instance.focus();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('focus() does NOT call element.focus() when loading', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isLoading: true });
    const spy = vi.spyOn(el, 'focus');
    instance.focus();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------
describe('ContextHelp - destroy()', () => {
  it('removes arvo-ctx-help base class', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(el.classList.contains('arvo-ctx-help')).toBe(false);
  });

  it('removes all variant modifier classes', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', variant: 'question' });
    instance.destroy();
    ArvoContextHelp.VARIANTS.forEach(v => {
      expect(el.classList.contains(`arvo-ctx-help--${v}`)).toBe(false);
    });
  });

  it('removes all size modifier classes', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', size: 'lg' });
    instance.destroy();
    ArvoContextHelp.SIZES.forEach(s => {
      expect(el.classList.contains(`arvo-ctx-help--${s}`)).toBe(false);
    });
  });

  it('removes loading class', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(el.classList.contains('loading')).toBe(false);
  });

  it('removes aria-label attribute', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('removes aria-busy attribute', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('removes the icon span from the DOM', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(el.querySelector('.arvo-ctx-help__ico')).toBeNull();
  });

  it('clears disabled state', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', isDisabled: true });
    instance.destroy();
    expect(el.disabled).toBe(false);
  });

  it('calls connector.destroy() to tear down the tooltip', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    mockConnectorDestroy.mockClear();
    instance.destroy();
    expect(mockConnectorDestroy).toHaveBeenCalled();
  });

  it('removes click event listener (onClick not called after destroy)', () => {
    const onClick = vi.fn();
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text', onClick });
    instance.destroy();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not throw when calling destroy() twice', () => {
    const el = createButtonElement();
    const instance = new ArvoContextHelp(el, { content: 'Help text' });
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});
