import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ArvoMessageAlert,
  ARVO_MSG_ALERT_DEFAULT_ERROR,
  type ArvoMessageAlertType,
} from './MessageAlert';
import { ArvoIconButton } from '../IconButton/IconButton';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_TYPES: [ArvoMessageAlertType, 'alert' | 'status'][] = [
  ['negative', 'alert'],
  ['positive', 'status'],
  ['warning', 'alert'],
  ['info', 'status'],
  ['neutral', 'status'],
  ['block', 'alert'],
];

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initialize / DOM rendering
// ---------------------------------------------------------------------------
describe('MessageAlert - initialize / DOM rendering', () => {
  it('creates a fresh div when element is null', () => {
    const instance = ArvoMessageAlert.initialize(null);
    expect(instance).toBeInstanceOf(ArvoMessageAlert);
    expect(instance.el.tagName).toBe('DIV');
  });

  it('uses the provided element', () => {
    const el = document.createElement('div');
    const instance = ArvoMessageAlert.initialize(el);
    expect(instance.el).toBe(el);
  });

  it('adds arvo-msg-alert base class', () => {
    const instance = ArvoMessageAlert.initialize(null);
    expect(instance.el.classList.contains('arvo-msg-alert')).toBe(true);
  });

  it('applies negative type modifier by default', () => {
    const instance = ArvoMessageAlert.initialize(null);
    expect(instance.el.classList.contains('arvo-msg-alert--negative')).toBe(true);
  });

  it('renders __body > __ico + __msg in full mode', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      message: 'Error text',
    });
    const body = instance.el.querySelector('.arvo-msg-alert__body');
    expect(body).not.toBeNull();
    expect(body!.querySelector('.arvo-msg-alert__ico')).not.toBeNull();
    expect(body!.querySelector('.arvo-msg-alert__msg')).not.toBeNull();
    expect(
      instance.el.querySelector('.arvo-msg-alert__msg')!.textContent,
    ).toBe('Error text');
  });

  it('does not render __close by default', () => {
    const instance = ArvoMessageAlert.initialize(null);
    expect(instance.el.querySelector('.arvo-msg-alert__close')).toBeNull();
  });

  it('sets role from default type', () => {
    const instance = ArvoMessageAlert.initialize(null);
    expect(instance.el.getAttribute('role')).toBe('alert');
  });

  it('sets id when passed in options', () => {
    const instance = ArvoMessageAlert.initialize(null, { id: 'err-1' });
    expect(instance.el.id).toBe('err-1');
  });
});

// ---------------------------------------------------------------------------
// Types + role auto-resolution
// ---------------------------------------------------------------------------
describe('MessageAlert - types + role auto-resolution', () => {
  describe.each(ALL_TYPES)('type=%s', (type, expectedRole) => {
    it(`applies arvo-msg-alert--${type} modifier`, () => {
      const instance = ArvoMessageAlert.initialize(null, { type });
      expect(
        instance.el.classList.contains(`arvo-msg-alert--${type}`),
      ).toBe(true);
    });

    it(`sets role to "${expectedRole}"`, () => {
      const instance = ArvoMessageAlert.initialize(null, { type });
      expect(instance.el.getAttribute('role')).toBe(expectedRole);
    });
  });

  it('honors explicit role="status" on type=error', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'negative',
      role: 'status',
    });
    expect(instance.el.getAttribute('role')).toBe('status');
  });

  it('keeps explicit role when type() setter is called', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'negative',
      role: 'status',
    });
    instance.type('warning');
    expect(instance.el.getAttribute('role')).toBe('status');
  });

  it('re-resolves role when type() setter is called without explicit role', () => {
    const instance = ArvoMessageAlert.initialize(null, { type: 'negative' });
    expect(instance.el.getAttribute('role')).toBe('alert');
    instance.type('info');
    expect(instance.el.getAttribute('role')).toBe('status');
  });
});

// ---------------------------------------------------------------------------
// Inline mode
// ---------------------------------------------------------------------------
describe('MessageAlert - inline mode', () => {
  it('applies --inline modifier and renders only __ico', () => {
    const instance = ArvoMessageAlert.initialize(null, { isInline: true });
    expect(
      instance.el.classList.contains('arvo-msg-alert--inline'),
    ).toBe(true);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico'),
    ).not.toBeNull();
    expect(instance.el.querySelector('.arvo-msg-alert__body')).toBeNull();
    expect(instance.el.querySelector('.arvo-msg-alert__msg')).toBeNull();
    expect(
      instance.el.querySelector('.arvo-msg-alert__close'),
    ).toBeNull();
  });

  it('sets aria-label to message string in inline mode', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isInline: true,
      message: 'bad',
    });
    expect(instance.el.getAttribute('aria-label')).toBe('bad');
  });

  it('falls back to type-default label when message is omitted', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isInline: true,
      type: 'negative',
    });
    expect(instance.el.getAttribute('aria-label')).toBe('Error');
  });

  it('inline(true) setter rebuilds DOM to inline structure', () => {
    const instance = ArvoMessageAlert.initialize(null, { message: 'text' });
    expect(
      instance.el.querySelector('.arvo-msg-alert__body'),
    ).not.toBeNull();
    instance.inline(true);
    expect(
      instance.el.classList.contains('arvo-msg-alert--inline'),
    ).toBe(true);
    expect(instance.el.querySelector('.arvo-msg-alert__body')).toBeNull();
    expect(instance.el.querySelector('.arvo-msg-alert__msg')).toBeNull();
  });

  it('inline(false) setter restores full structure and removes aria-label', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isInline: true,
      message: 'text',
    });
    expect(instance.el.getAttribute('aria-label')).toBe('text');
    instance.inline(false);
    expect(
      instance.el.querySelector('.arvo-msg-alert__body'),
    ).not.toBeNull();
    expect(
      instance.el.querySelector('.arvo-msg-alert__msg'),
    ).not.toBeNull();
    expect(instance.el.getAttribute('aria-label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dismissable + dismiss event
// ---------------------------------------------------------------------------
describe('MessageAlert - dismissable + dismiss event', () => {
  it('renders __close child when isDismissable=true', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    expect(
      instance.el.querySelector('.arvo-msg-alert__close'),
    ).not.toBeNull();
  });

  it('initializes close button via ArvoIconButton.initialize with size=xs, icon=close, tooltip=Dismiss', () => {
    const spy = vi.spyOn(ArvoIconButton, 'initialize');
    ArvoMessageAlert.initialize(null, { isDismissable: true });
    expect(spy).toHaveBeenCalledWith(
      expect.any(HTMLButtonElement),
      expect.objectContaining({
        size: 'xs',
        icon: 'close',
        tooltip: 'Dismiss',
      }),
    );
  });

  it('close icon button renders with arvo-icon-btn + xs class and aria-label="Dismiss"', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    const closeBtn = instance.el.querySelector(
      '.arvo-msg-alert__close',
    ) as HTMLElement;
    expect(closeBtn.classList.contains('arvo-icon-btn')).toBe(true);
    expect(closeBtn.classList.contains('arvo-btn--xs')).toBe(true);
    expect(closeBtn.querySelector('.o9con-close')).not.toBeNull();
    expect(closeBtn.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('clicking close fires msg-alert:dismiss CustomEvent', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    const handler = vi.fn();
    instance.el.addEventListener('msg-alert:dismiss', handler);
    const closeBtn = instance.el.querySelector(
      '.arvo-msg-alert__close',
    ) as HTMLElement;
    closeBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dismiss event has bubbles=true', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    let captured: Event | null = null;
    instance.el.addEventListener('msg-alert:dismiss', (e) => {
      captured = e;
    });
    const closeBtn = instance.el.querySelector(
      '.arvo-msg-alert__close',
    ) as HTMLElement;
    closeBtn.click();
    expect(captured).not.toBeNull();
    expect((captured as unknown as CustomEvent).bubbles).toBe(true);
  });

  it('clicking close calls onDismiss callback', () => {
    const onDismiss = vi.fn();
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
      onDismiss,
    });
    const closeBtn = instance.el.querySelector(
      '.arvo-msg-alert__close',
    ) as HTMLElement;
    closeBtn.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss() fires event and calls onDismiss programmatically', () => {
    const onDismiss = vi.fn();
    const instance = ArvoMessageAlert.initialize(null, { onDismiss });
    const handler = vi.fn();
    instance.el.addEventListener('msg-alert:dismiss', handler);
    instance.dismiss();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss() enters the closing state and removes el from the DOM after the collapse transition completes', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    document.body.appendChild(instance.el);
    const el = instance.el;
    instance.dismiss();
    // The alert stays mounted while the collapse transition runs and
    // carries the `is-closing` class so the SCSS drives the opacity /
    // transform / max-height collapse.
    expect(el.parentElement).toBe(document.body);
    expect(el.classList.contains('is-closing')).toBe(true);
    el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
    expect(el.parentElement).toBeNull();
  });

  it('clicking close removes el from the DOM after the collapse transition completes', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    document.body.appendChild(instance.el);
    const el = instance.el;
    const closeBtn = el.querySelector('.arvo-msg-alert__close') as HTMLElement;
    closeBtn.click();
    expect(el.parentElement).toBe(document.body);
    expect(el.classList.contains('is-closing')).toBe(true);
    el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
    expect(el.parentElement).toBeNull();
  });

  it('ignores transitionend for non-opacity properties during dismiss', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    document.body.appendChild(instance.el);
    const el = instance.el;
    instance.dismiss();
    el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }));
    el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'max-height' }));
    expect(el.parentElement).toBe(document.body);
    el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
    expect(el.parentElement).toBeNull();
  });

  it('calling dismiss() twice only fires onDismiss + msg-alert:dismiss once', () => {
    const onDismiss = vi.fn();
    const handler = vi.fn();
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
      onDismiss,
    });
    instance.el.addEventListener('msg-alert:dismiss', handler);
    instance.dismiss();
    instance.dismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Dynamic getter/setter methods
// ---------------------------------------------------------------------------
describe('MessageAlert - dynamic getter/setter methods', () => {
  it('type() returns current type', () => {
    const instance = ArvoMessageAlert.initialize(null, { type: 'warning' });
    expect(instance.type()).toBe('warning');
  });

  it('type(newType) swaps modifier class', () => {
    const instance = ArvoMessageAlert.initialize(null, { type: 'negative' });
    instance.type('warning');
    expect(
      instance.el.classList.contains('arvo-msg-alert--warning'),
    ).toBe(true);
    expect(
      instance.el.classList.contains('arvo-msg-alert--negative'),
    ).toBe(false);
  });

  it('message() returns current message', () => {
    const instance = ArvoMessageAlert.initialize(null, { message: 'Hello' });
    expect(instance.message()).toBe('Hello');
  });

  it('message(newText) updates __msg textContent', () => {
    const instance = ArvoMessageAlert.initialize(null, { message: 'old' });
    instance.message('new text');
    expect(
      instance.el.querySelector('.arvo-msg-alert__msg')!.textContent,
    ).toBe('new text');
  });

  it('message(null) clears __msg textContent', () => {
    const instance = ArvoMessageAlert.initialize(null, { message: 'text' });
    instance.message(null);
    expect(
      instance.el.querySelector('.arvo-msg-alert__msg')!.textContent,
    ).toBe('');
  });

  it('renders a BasicInlineContent array via the inline-content adapter', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      message: [
        { type: 'strong' as const, children: 'Required.' },
        { type: 'text' as const, value: ' See ' },
        { type: 'link' as const, href: '/help', label: 'help' },
      ],
    });
    const msg = instance.el.querySelector('.arvo-msg-alert__msg')!;
    expect(msg.querySelector('.arvo-inline__strong')?.textContent).toBe('Required.');
    expect(msg.querySelector('.arvo-inline__link')?.getAttribute('href')).toBe('/help');
    expect(msg.textContent).toBe('Required. See help');
  });

  it('message(array) swaps in inline content and message() returns it', () => {
    const arr = [{ type: 'em' as const, children: 'updated' }];
    const instance = ArvoMessageAlert.initialize(null, { message: 'plain' });
    instance.message(arr);
    expect(
      instance.el
        .querySelector('.arvo-msg-alert__msg')!
        .querySelector('.arvo-inline__em')?.textContent,
    ).toBe('updated');
    expect(instance.message()).toEqual(arr);
  });

  it('dismissable() returns current isDismissable', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    expect(instance.dismissable()).toBe(true);
  });

  it('dismissable(true) creates close button', () => {
    const instance = ArvoMessageAlert.initialize(null);
    expect(instance.el.querySelector('.arvo-msg-alert__close')).toBeNull();
    instance.dismissable(true);
    expect(
      instance.el.querySelector('.arvo-msg-alert__close'),
    ).not.toBeNull();
  });

  it('dismissable(false) destroys close button', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      isDismissable: true,
    });
    expect(
      instance.el.querySelector('.arvo-msg-alert__close'),
    ).not.toBeNull();
    instance.dismissable(false);
    expect(instance.el.querySelector('.arvo-msg-alert__close')).toBeNull();
  });

  it('icon() returns the stored icon name even when type is non-neutral (the value is retained but suppressed)', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'negative',
      icon: 'bell-o',
    });
    expect(instance.icon()).toBe('bell-o');
  });

  it('icon(name) on type="neutral" adds has-icon-override and renders icon element', () => {
    const instance = ArvoMessageAlert.initialize(null, { type: 'neutral' });
    instance.icon('bell-o');
    expect(instance.el.classList.contains('has-icon-override')).toBe(true);
    const ico = instance.el.querySelector('.arvo-msg-alert__ico');
    expect(ico!.querySelector('i.o9con-bell-o')).not.toBeNull();
  });

  it('icon(null) on type="neutral" removes has-icon-override and icon element', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'neutral',
      icon: 'bell-o',
    });
    instance.icon(null);
    expect(instance.el.classList.contains('has-icon-override')).toBe(false);
    expect(instance.el.querySelector('.arvo-msg-alert__ico i')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Icon override is neutral-only
// ---------------------------------------------------------------------------
describe('MessageAlert - icon override gating (neutral-only)', () => {
  const NON_NEUTRAL: ArvoMessageAlertType[] = [
    'negative',
    'positive',
    'warning',
    'info',
    'block',
  ];

  describe.each(NON_NEUTRAL)('type=%s', (type) => {
    it('ignores `icon` option (no override element, no has-icon-override class)', () => {
      const instance = ArvoMessageAlert.initialize(null, {
        type,
        icon: 'bell-o',
      });
      expect(instance.el.classList.contains('has-icon-override')).toBe(false);
      const ico = instance.el.querySelector('.arvo-msg-alert__ico');
      expect(ico!.querySelector('i')).toBeNull();
    });

    it('ignores `icon()` setter on a non-neutral type', () => {
      const instance = ArvoMessageAlert.initialize(null, { type });
      instance.icon('bell-o');
      expect(instance.el.classList.contains('has-icon-override')).toBe(false);
      expect(
        instance.el.querySelector('.arvo-msg-alert__ico i'),
      ).toBeNull();
    });
  });

  it('switching type away from "neutral" suppresses an existing override', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'neutral',
      icon: 'bell-o',
    });
    expect(instance.el.classList.contains('has-icon-override')).toBe(true);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico i.o9con-bell-o'),
    ).not.toBeNull();

    instance.type('warning');
    expect(instance.el.classList.contains('has-icon-override')).toBe(false);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico i'),
    ).toBeNull();
  });

  it('switching type back to "neutral" restores a previously suppressed override', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'negative',
      icon: 'bell-o',
    });
    expect(instance.el.classList.contains('has-icon-override')).toBe(false);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico i'),
    ).toBeNull();

    instance.type('neutral');
    expect(instance.el.classList.contains('has-icon-override')).toBe(true);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico i.o9con-bell-o'),
    ).not.toBeNull();
  });

  it('honors icon override on neutral in inline mode', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'neutral',
      isInline: true,
      icon: 'bell-o',
      message: 'notice',
    });
    expect(instance.el.classList.contains('has-icon-override')).toBe(true);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico i.o9con-bell-o'),
    ).not.toBeNull();
  });

  it('ignores icon override on non-neutral inline mode', () => {
    const instance = ArvoMessageAlert.initialize(null, {
      type: 'negative',
      isInline: true,
      icon: 'bell-o',
      message: 'bad',
    });
    expect(instance.el.classList.contains('has-icon-override')).toBe(false);
    expect(
      instance.el.querySelector('.arvo-msg-alert__ico i'),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Destroy lifecycle
// ---------------------------------------------------------------------------
describe('MessageAlert - destroy lifecycle', () => {
  it('clears inner DOM', () => {
    const instance = ArvoMessageAlert.initialize(null, { message: 'text' });
    instance.destroy();
    expect(instance.el.children.length).toBe(0);
  });

  it('el stays in the DOM after destroy', () => {
    const instance = ArvoMessageAlert.initialize(null);
    document.body.appendChild(instance.el);
    instance.destroy();
    expect(instance.el.parentElement).toBe(document.body);
  });

  it('is idempotent -- calling destroy twice does not throw', () => {
    const instance = ArvoMessageAlert.initialize(null);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });

  it('destroys internal close icon button when present', () => {
    const destroySpy = vi.spyOn(ArvoIconButton.prototype, 'destroy');
    const instance = ArvoMessageAlert.initialize(null);
    instance.dismissable(true);
    instance.destroy();
    expect(destroySpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Static / named exports
// ---------------------------------------------------------------------------
describe('MessageAlert - static / named exports', () => {
  it('exposes defaultErrorMessage on ArvoMessageAlert', () => {
    expect(ArvoMessageAlert.defaultErrorMessage).toBe(
      'Form field value is invalid',
    );
  });

  it('exposes ARVO_MSG_ALERT_DEFAULT_ERROR named export', () => {
    expect(ARVO_MSG_ALERT_DEFAULT_ERROR).toBe('Form field value is invalid');
  });

  it('static and named export values are equal', () => {
    expect(ARVO_MSG_ALERT_DEFAULT_ERROR).toBe(
      ArvoMessageAlert.defaultErrorMessage,
    );
  });
});
