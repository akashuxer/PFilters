// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { ArvoFormLabel } from './FormLabel';

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialize / DOM rendering
// ---------------------------------------------------------------------------
describe('FormLabel - initialize / DOM rendering', () => {
  it('creates a fresh <label> when element is null', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    expect(instance).toBeInstanceOf(ArvoFormLabel);
    expect(instance.el.tagName).toBe('LABEL');
  });

  it('creates a <span> when as: "span"', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Caption',
      as: 'span',
    });
    expect(instance.el.tagName).toBe('SPAN');
    expect(instance.as()).toBe('span');
  });

  it('uses the provided element and infers as from its tag', () => {
    const el = document.createElement('span');
    const instance = ArvoFormLabel.initialize(el, { text: 'Caption' });
    expect(instance.el).toBe(el);
    expect(instance.as()).toBe('span');
  });

  it('adds arvo-form-lbl base class', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    expect(instance.el.classList.contains('arvo-form-lbl')).toBe(true);
  });

  it('writes text content', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email address' });
    expect(instance.el.textContent).toBe('Email address');
  });

  it('sets the for attribute on label', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      for: 'email-input',
    });
    expect(instance.el.getAttribute('for')).toBe('email-input');
  });

  it('does not set the for attribute on span', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Caption',
      as: 'span',
      for: 'irrelevant',
    });
    expect(instance.el.hasAttribute('for')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------
describe('FormLabel - size', () => {
  it('defaults to sm (no --lg modifier)', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    expect(instance.el.classList.contains('arvo-form-lbl--lg')).toBe(false);
    expect(instance.size()).toBe('sm');
  });

  it('adds --lg modifier when size: "lg"', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      size: 'lg',
    });
    expect(instance.el.classList.contains('arvo-form-lbl--lg')).toBe(true);
    expect(instance.size()).toBe('lg');
  });

  it('toggles --lg via size setter', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    instance.size('lg');
    expect(instance.el.classList.contains('arvo-form-lbl--lg')).toBe(true);
    instance.size('sm');
    expect(instance.el.classList.contains('arvo-form-lbl--lg')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Required indicator
// ---------------------------------------------------------------------------
describe('FormLabel - required', () => {
  it('omits __req span by default', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    expect(instance.el.querySelector('.arvo-form-lbl__req')).toBeNull();
  });

  it('renders __req with aria-hidden when isRequired: true', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isRequired: true,
    });
    const req = instance.el.querySelector('.arvo-form-lbl__req');
    expect(req).not.toBeNull();
    expect(req!.getAttribute('aria-hidden')).toBe('true');
    expect(req!.textContent).toBe('*');
  });

  it('adds --required modifier when isRequired: true', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isRequired: true,
    });
    expect(
      instance.el.classList.contains('arvo-form-lbl--required'),
    ).toBe(true);
  });

  it('uses string requiredIndicator override', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isRequired: true,
      requiredIndicator: '(required)',
    });
    const req = instance.el.querySelector('.arvo-form-lbl__req');
    expect(req!.textContent).toBe('(required)');
  });

  it('uses HTMLElement requiredIndicator override', () => {
    const custom = document.createElement('i');
    custom.className = 'custom-marker';
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isRequired: true,
      requiredIndicator: custom,
    });
    expect(
      instance.el.querySelector('.arvo-form-lbl__req .custom-marker'),
    ).not.toBeNull();
  });

  it('toggles required via setter', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    instance.required(true);
    expect(instance.el.querySelector('.arvo-form-lbl__req')).not.toBeNull();
    instance.required(false);
    expect(instance.el.querySelector('.arvo-form-lbl__req')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disabled / invalid
// ---------------------------------------------------------------------------
describe('FormLabel - disabled / invalid', () => {
  it('adds is-disabled when isDisabled: true', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isDisabled: true,
    });
    expect(instance.el.classList.contains('is-disabled')).toBe(true);
  });

  it('adds is-invalid when isInvalid: true', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isInvalid: true,
    });
    expect(instance.el.classList.contains('is-invalid')).toBe(true);
  });

  it('toggles is-disabled via setter', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    instance.disabled(true);
    expect(instance.el.classList.contains('is-disabled')).toBe(true);
    instance.disabled(false);
    expect(instance.el.classList.contains('is-disabled')).toBe(false);
  });

  it('toggles is-invalid via setter', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    instance.invalid(true);
    expect(instance.el.classList.contains('is-invalid')).toBe(true);
    instance.invalid(false);
    expect(instance.el.classList.contains('is-invalid')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Text / for setters
// ---------------------------------------------------------------------------
describe('FormLabel - text / for setters', () => {
  it('updates text via setter', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    instance.text('Email address');
    expect(instance.el.textContent).toBe('Email address');
  });

  it('preserves __req when text changes', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isRequired: true,
    });
    instance.text('Email address');
    expect(instance.el.querySelector('.arvo-form-lbl__req')).not.toBeNull();
  });

  it('updates for attribute via setter', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      for: 'a',
    });
    instance.for('b');
    expect(instance.el.getAttribute('for')).toBe('b');
    instance.for(null);
    expect(instance.el.hasAttribute('for')).toBe(false);
  });

  it('for setter is a no-op on span', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Caption',
      as: 'span',
    });
    instance.for('x');
    expect(instance.el.hasAttribute('for')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------
describe('FormLabel - destroy', () => {
  it('clears DOM children', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      isRequired: true,
    });
    instance.destroy();
    expect(instance.el.children.length).toBe(0);
    expect(instance.el.textContent).toBe('');
  });

  it('is idempotent', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// contextHelp - embedded ArvoContextHelp slot (Figma realignment)
// ---------------------------------------------------------------------------
describe('FormLabel - contextHelp', () => {
  it('omits the __ctx-help wrapper by default', () => {
    const instance = ArvoFormLabel.initialize(null, { text: 'Email' });
    expect(instance.el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
    expect(instance.contextHelp()).toBeNull();
  });

  it('renders the __ctx-help wrapper containing an ArvoContextHelp button', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Forecast consumption',
      contextHelp: { content: 'Quantity consumed from forecasted demand.' },
    });
    const wrapper = instance.el.querySelector('.arvo-form-lbl__ctx-help');
    expect(wrapper).not.toBeNull();
    const btn = wrapper!.querySelector('button.arvo-ctx-help');
    expect(btn).not.toBeNull();
    expect(instance.contextHelp()).not.toBeNull();
  });

  it('locks the embedded ContextHelp to size sm regardless of FormLabel size', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Forecast consumption',
      size: 'lg',
      contextHelp: { content: 'Help text.' },
    });
    const btn = instance.el.querySelector('.arvo-form-lbl__ctx-help .arvo-ctx-help');
    expect(btn).not.toBeNull();
    expect(btn!.classList.contains('arvo-ctx-help--sm')).toBe(true);
    expect(btn!.classList.contains('arvo-ctx-help--lg')).toBe(false);
  });

  it('forwards variant=question to the embedded ContextHelp', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Safety stock',
      contextHelp: { content: 'Help.', variant: 'question' },
    });
    const btn = instance.el.querySelector('.arvo-form-lbl__ctx-help .arvo-ctx-help');
    expect(btn!.classList.contains('arvo-ctx-help--question')).toBe(true);
  });

  it('forwards ariaLabel to the embedded ContextHelp button', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Safety stock',
      contextHelp: { content: 'Help.', ariaLabel: 'More information about safety stock' },
    });
    const btn = instance.el.querySelector('.arvo-form-lbl__ctx-help .arvo-ctx-help');
    expect(btn!.getAttribute('aria-label')).toBe('More information about safety stock');
  });

  it('renders __ctx-help alongside __req when both are set', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Safety stock',
      isRequired: true,
      contextHelp: { content: 'Help.' },
    });
    expect(instance.el.querySelector('.arvo-form-lbl__req')).not.toBeNull();
    expect(instance.el.querySelector('.arvo-form-lbl__ctx-help')).not.toBeNull();
  });

  it('orders __req before __ctx-help in DOM when both are present', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Safety stock',
      isRequired: true,
      contextHelp: { content: 'Help.' },
    });
    const req = instance.el.querySelector('.arvo-form-lbl__req');
    const ctx = instance.el.querySelector('.arvo-form-lbl__ctx-help');
    expect(req).not.toBeNull();
    expect(ctx).not.toBeNull();
    expect(req!.compareDocumentPosition(ctx!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('inserts a late-mounted __req before an existing __ctx-help', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Safety stock',
      contextHelp: { content: 'Help.' },
    });
    instance.required(true);
    const req = instance.el.querySelector('.arvo-form-lbl__req');
    const ctx = instance.el.querySelector('.arvo-form-lbl__ctx-help');
    expect(req).not.toBeNull();
    expect(ctx).not.toBeNull();
    expect(req!.compareDocumentPosition(ctx!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('destroy() removes the __ctx-help wrapper and disposes the inner ArvoContextHelp', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      contextHelp: { content: 'Help.' },
    });
    expect(instance.contextHelp()).not.toBeNull();
    instance.destroy();
    expect(instance.el.querySelector('.arvo-form-lbl__ctx-help')).toBeNull();
    expect(instance.contextHelp()).toBeNull();
  });

  it('contextHelp() returns the embedded instance and allows tooltip content updates', () => {
    const instance = ArvoFormLabel.initialize(null, {
      text: 'Email',
      contextHelp: { content: 'Initial help' },
    });
    const ctx = instance.contextHelp();
    expect(ctx).not.toBeNull();
    expect(() => ctx!.setContent('Updated help')).not.toThrow();
  });
});
