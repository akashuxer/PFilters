import { describe, it, expect, afterEach, vi } from 'vitest';
import { ArvoBannerAlert } from './BannerAlert';
function createElement(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
describe('ArvoBannerAlert', () => {
  describe('initialization', () => {
    it('static initialize() returns an ArvoBannerAlert instance', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Test' });
      expect(instance).toBeInstanceOf(ArvoBannerAlert);
    });

    it('adds arvo-bnr-alert base class to the host', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Test' });
      expect(el.classList.contains('arvo-bnr-alert')).toBe(true);
    });

    it('builds DOM structure inside the host element', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Test' });
      expect(el.querySelector('.arvo-bnr-alert__ico')).not.toBeNull();
      expect(el.querySelector('.arvo-bnr-alert__content')).not.toBeNull();
    });
  });

  // -- Type rendering ----------------------------------------------------
  describe('type rendering', () => {
    const types = [
      'positive',
      'info',
      'neutral',
      'warning',
      'negative',
      'block',
    ] as const;

    types.forEach((type) => {
      it(`applies arvo-bnr-alert--${type} class`, () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Test', type });
        expect(el.classList.contains(`arvo-bnr-alert--${type}`)).toBe(true);
      });
    });

    it('defaults to arvo-bnr-alert--info when type is omitted', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Test' });
      expect(el.classList.contains('arvo-bnr-alert--info')).toBe(true);
    });
  });

  // -- Compact vs default mode -------------------------------------------
  describe('compact vs default mode', () => {
    describe('default mode', () => {
      it('renders __copy in DOM', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg' });
        expect(el.querySelector('.arvo-bnr-alert__copy')).not.toBeNull();
      });

      it('renders __msg inside __copy', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg' });
        const copy = el.querySelector('.arvo-bnr-alert__copy')!;
        const msg = copy.querySelector('.arvo-bnr-alert__msg');
        expect(msg).not.toBeNull();
        expect(msg!.textContent).toBe('Msg');
      });

      it('renders __title when title provided', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg', title: 'Title' });
        const title = el.querySelector('.arvo-bnr-alert__title');
        expect(title).not.toBeNull();
        expect(title!.textContent).toBe('Title');
      });

      it('renders an inline ArvoLink when link prop is provided', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, {
          message: 'Msg',
          link: { label: 'Learn more', href: '/docs' },
        });
        const link = el.querySelector('.arvo-bnr-alert__link');
        expect(link).not.toBeNull();
        expect(link!.tagName).toBe('A');
        expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/docs');
        expect(link!.textContent).toContain('Learn more');
      });

      it('renders an outline ArvoButton when button prop is provided', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, {
          message: 'Msg',
          button: { label: 'Refresh' },
        });
        const btn = el.querySelector('.arvo-bnr-alert__btn');
        expect(btn).not.toBeNull();
        expect(btn!.tagName).toBe('BUTTON');
        expect(btn!.classList.contains('arvo-btn--outline')).toBe(true);
      });
    });

    describe('compact mode', () => {
      it('applies arvo-bnr-alert--compact class', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg', isCompact: true });
        expect(el.classList.contains('arvo-bnr-alert--compact')).toBe(true);
      });

      it('renders __msg as direct child of __content', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg', isCompact: true });
        const content = el.querySelector('.arvo-bnr-alert__content')!;
        const msg = content.querySelector(':scope > .arvo-bnr-alert__msg');
        expect(msg).not.toBeNull();
        expect(msg!.textContent).toBe('Msg');
      });

      it('does NOT render __copy', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg', isCompact: true });
        expect(el.querySelector('.arvo-bnr-alert__copy')).toBeNull();
      });

      it('does NOT render __title even when title is provided', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, {
          message: 'Msg',
          isCompact: true,
          title: 'Ignored',
        });
        expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();
      });

      it('does NOT render __link even when link is provided', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, {
          message: 'Msg',
          isCompact: true,
          link: { label: 'Should not show', href: '#' },
        });
        expect(el.querySelector('.arvo-bnr-alert__link')).toBeNull();
      });

      it('does NOT render __btn even when button is provided', () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, {
          message: 'Msg',
          isCompact: true,
          button: { label: 'Click' },
        });
        expect(el.querySelector('.arvo-bnr-alert__btn')).toBeNull();
      });
    });
  });

  // -- Dismissible -------------------------------------------------------
  describe('dismissible', () => {
    it('renders __close button when isDismissible is true (default)', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      const closeBtn = el.querySelector('.arvo-bnr-alert__close');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn!.getAttribute('aria-label')).toBe('Dismiss alert');
      expect(closeBtn!.getAttribute('type')).toBe('button');
    });

    it('clicking __close fires bnr-alert:dismiss event', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      const handler = vi.fn();
      el.addEventListener('bnr-alert:dismiss', handler);

      const closeBtn = el.querySelector('.arvo-bnr-alert__close') as HTMLElement;
      closeBtn.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('clicking __close calls onDismiss callback', () => {
      const el = createElement();
      const onDismiss = vi.fn();
      ArvoBannerAlert.initialize(el, { message: 'Msg', onDismiss });

      const closeBtn = el.querySelector('.arvo-bnr-alert__close') as HTMLElement;
      closeBtn.click();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('clicking __close enters the closing state and removes the banner after the dismiss transition completes', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(el.isConnected).toBe(true);

      const closeBtn = el.querySelector('.arvo-bnr-alert__close') as HTMLElement;
      closeBtn.click();
      // Banner stays in the DOM while the collapse transition runs and
      // carries the `is-closing` class.
      expect(el.isConnected).toBe(true);
      expect(el.classList.contains('is-closing')).toBe(true);

      el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
      expect(el.isConnected).toBe(false);
      expect(document.body.contains(el)).toBe(false);
    });

    it('ignores transitionend for non-opacity properties during dismiss', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.dismiss();
      el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }));
      el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'max-height' }));
      expect(el.isConnected).toBe(true);
      el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
      expect(el.isConnected).toBe(false);
    });

    it('dismiss() removes the banner from the DOM after the transition completes', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.dismiss();
      expect(el.classList.contains('is-closing')).toBe(true);
      el.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
      expect(document.body.contains(el)).toBe(false);
    });

    it('calling dismiss() twice only fires onDismiss + bnr-alert:dismiss once', () => {
      const el = createElement();
      const onDismiss = vi.fn();
      const handler = vi.fn();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg', onDismiss });
      el.addEventListener('bnr-alert:dismiss', handler);

      instance.dismiss();
      instance.dismiss();
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does NOT render __close when isDismissible is false', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        isDismissible: false,
      });
      expect(el.querySelector('.arvo-bnr-alert__close')).toBeNull();
    });
  });

  // -- Title prop --------------------------------------------------------
  describe('title prop', () => {
    it('renders __title when title is provided in default mode', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg', title: 'My Title' });
      const title = el.querySelector('.arvo-bnr-alert__title')!;
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('My Title');
    });

    it('does NOT render __title when title is undefined', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();
    });

    it('does NOT render __title when title is null', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg', title: null });
      expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();
    });

    it('never renders __title in compact mode', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        isCompact: true,
        title: 'Should not show',
      });
      expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();
    });
  });

  // -- Link prop (structured) --------------------------------------------
  describe('link prop', () => {
    it('renders an inline ArvoLink with the provided label and href', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        link: { label: 'Click', href: '/docs' },
      });
      const link = el.querySelector('.arvo-bnr-alert__link') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/docs');
      expect(link.textContent).toContain('Click');
    });

    it('forces rel=noopener noreferrer when target=_blank', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        link: {
          label: 'External',
          href: 'https://example.com',
          target: '_blank',
        },
      });
      const link = el.querySelector('.arvo-bnr-alert__link') as HTMLAnchorElement;
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    });

    it('forwards onClick to consumer', () => {
      const el = createElement();
      const onClick = vi.fn();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        link: { label: 'Click', href: '#', onClick },
      });
      const link = el.querySelector('.arvo-bnr-alert__link') as HTMLAnchorElement;
      link.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does NOT render __link when link is undefined', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(el.querySelector('.arvo-bnr-alert__link')).toBeNull();
    });

    it('never renders __link in compact mode', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        isCompact: true,
        link: { label: 'No', href: '#' },
      });
      expect(el.querySelector('.arvo-bnr-alert__link')).toBeNull();
    });
  });

  // -- Button prop (structured) ------------------------------------------
  describe('button prop', () => {
    it('renders an outline ArvoButton with the provided label', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        button: { label: 'Refresh' },
      });
      const btn = el.querySelector('.arvo-bnr-alert__btn');
      expect(btn).not.toBeNull();
      expect(btn!.classList.contains('arvo-btn--outline')).toBe(true);
      expect(btn!.querySelector('.arvo-btn__lbl')?.textContent).toBe('Refresh');
    });

    it('fires onClick when button is clicked', () => {
      const el = createElement();
      const onClick = vi.fn();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        button: { label: 'Refresh', onClick },
      });
      const btn = el.querySelector('.arvo-bnr-alert__btn') as HTMLButtonElement;
      btn.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders both button and link in the action row when both provided', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        button: { label: 'Refresh' },
        link: { label: 'Help', href: '/help' },
      });
      const actions = el.querySelector('.arvo-bnr-alert__actions');
      expect(actions).not.toBeNull();
      expect(actions!.querySelector('.arvo-bnr-alert__btn')).not.toBeNull();
      expect(actions!.querySelector('.arvo-bnr-alert__link')).not.toBeNull();
    });
  });

  // -- Rich-text message (BasicInlineContent) ----------------------------
  describe('rich-text message', () => {
    it('renders a string message as plain text', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Plain string' });
      const msg = el.querySelector('.arvo-bnr-alert__msg');
      expect(msg!.textContent).toBe('Plain string');
    });

    it('renders an InlineContent message via the shared DOM adapter', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: [
          { type: 'text', value: 'Press ' },
          { type: 'kbd', value: 'Esc' },
          { type: 'text', value: ' to close. ' },
          { type: 'strong', children: 'Important' },
        ],
      });
      const msg = el.querySelector('.arvo-bnr-alert__msg')!;
      expect(msg.querySelector('kbd.arvo-inline__kbd')?.textContent).toBe('Esc');
      expect(msg.querySelector('strong.arvo-inline__strong')?.textContent).toBe(
        'Important',
      );
    });

    it('message() setter rerenders rich-text content', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Old' });
      instance.message([
        { type: 'text', value: 'See ' },
        {
          type: 'link',
          label: 'docs',
          href: 'https://example.com',
          target: '_blank',
        },
      ]);
      const a = el.querySelector('.arvo-bnr-alert__msg a.arvo-inline__link') as HTMLAnchorElement;
      expect(a).not.toBeNull();
      expect(a.getAttribute('rel')).toContain('noopener');
    });
  });

  // -- ARIA role auto-resolution -----------------------------------------
  describe('ARIA role auto-resolution', () => {
    it('negative type resolves to role="alert"', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg', type: 'negative' });
      expect(el.getAttribute('role')).toBe('alert');
    });

    it('block type resolves to role="alert"', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg', type: 'block' });
      expect(el.getAttribute('role')).toBe('alert');
    });

    (['positive', 'info', 'neutral', 'warning'] as const).forEach((type) => {
      it(`${type} type resolves to role="status"`, () => {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg', type });
        expect(el.getAttribute('role')).toBe('status');
      });
    });

    it('explicit role prop overrides type-based default', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'info',
        role: 'alert',
      });
      expect(el.getAttribute('role')).toBe('alert');
    });

    it('explicit role="status" overrides negative type default', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'negative',
        role: 'status',
      });
      expect(el.getAttribute('role')).toBe('status');
    });
  });

  // -- Loading state -----------------------------------------------------
  describe('loading state', () => {
    it('applies loading class and aria-busy="true" when isLoading is true', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg', isLoading: true });
      expect(el.classList.contains('loading')).toBe(true);
      expect(el.getAttribute('aria-busy')).toBe('true');
    });

    it('does NOT apply loading class or aria-busy when not loading', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(el.classList.contains('loading')).toBe(false);
      expect(el.getAttribute('aria-busy')).toBeNull();
    });
  });

  // -- Dynamic type change -----------------------------------------------
  describe('dynamic type change', () => {
    it('swaps modifier class when type() is called', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'info',
      });
      expect(el.classList.contains('arvo-bnr-alert--info')).toBe(true);

      instance.type('warning');
      expect(el.classList.contains('arvo-bnr-alert--warning')).toBe(true);
      expect(el.classList.contains('arvo-bnr-alert--info')).toBe(false);
    });

    it('re-resolves role when type changes from info to negative', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'info',
      });
      expect(el.getAttribute('role')).toBe('status');

      instance.type('negative');
      expect(el.getAttribute('role')).toBe('alert');
    });

    it('does NOT change role when explicit role was set in options', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'info',
        role: 'alert',
      });
      expect(el.getAttribute('role')).toBe('alert');

      instance.type('positive');
      expect(el.getAttribute('role')).toBe('alert');
    });
  });

  // -- Dynamic message/title change --------------------------------------
  describe('dynamic message/title change', () => {
    it('message() getter returns current message', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Hello' });
      expect(instance.message()).toBe('Hello');
    });

    it('message() setter updates __msg text content', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Old' });
      instance.message('New message');
      const msg = el.querySelector('.arvo-bnr-alert__msg')!;
      expect(msg.textContent).toBe('New message');
    });

    it('title() getter returns current title or null', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        title: 'My Title',
      });
      expect(instance.title()).toBe('My Title');
    });

    it('title() getter returns null when no title set', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(instance.title()).toBeNull();
    });

    it('title() setter updates __title text content', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        title: 'Old',
      });
      instance.title('New title');
      const title = el.querySelector('.arvo-bnr-alert__title')!;
      expect(title.textContent).toBe('New title');
    });

    it('title(null) removes __title from DOM', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        title: 'Remove me',
      });
      expect(el.querySelector('.arvo-bnr-alert__title')).not.toBeNull();

      instance.title(null);
      expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();
    });

    it('title("new") inserts __title as first child of __copy when absent', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();

      instance.title('Inserted');
      const title = el.querySelector('.arvo-bnr-alert__title')!;
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('Inserted');

      const copy = el.querySelector('.arvo-bnr-alert__copy')!;
      expect(copy.firstChild).toBe(title);
    });

    it('title() is a no-op in compact mode', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        isCompact: true,
      });
      instance.title('Should not render');
      expect(el.querySelector('.arvo-bnr-alert__title')).toBeNull();
    });
  });

  // -- loading() getter/setter -------------------------------------------
  describe('loading() getter/setter', () => {
    it('loading() returns false by default', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(instance.loading()).toBe(false);
    });

    it('loading(true) sets loading class and aria-busy', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.loading(true);
      expect(el.classList.contains('loading')).toBe(true);
      expect(el.getAttribute('aria-busy')).toBe('true');
      expect(instance.loading()).toBe(true);
    });

    it('loading(false) removes loading class and aria-busy', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        isLoading: true,
      });
      expect(instance.loading()).toBe(true);

      instance.loading(false);
      expect(el.classList.contains('loading')).toBe(false);
      expect(el.getAttribute('aria-busy')).toBeNull();
      expect(instance.loading()).toBe(false);
    });
  });

  // -- type() getter -----------------------------------------------------
  describe('type() getter', () => {
    it('returns the current type string', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'warning',
      });
      expect(instance.type()).toBe('warning');
    });

    it('returns "info" by default', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      expect(instance.type()).toBe('info');
    });

    it('returns updated type after setter call', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'info',
      });
      instance.type('negative');
      expect(instance.type()).toBe('negative');
    });
  });

  // -- bnr-alert:dismiss event detail ------------------------------------
  describe('bnr-alert:dismiss event', () => {
    it('is a CustomEvent', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      let capturedEvent: Event | null = null;
      el.addEventListener('bnr-alert:dismiss', (e) => {
        capturedEvent = e;
      });

      const closeBtn = el.querySelector('.arvo-bnr-alert__close') as HTMLElement;
      closeBtn.click();
      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent).toBeInstanceOf(CustomEvent);
    });

    it('does not bubble (bubbles: false)', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg' });
      let capturedEvent: CustomEvent | null = null;
      el.addEventListener('bnr-alert:dismiss', (e) => {
        capturedEvent = e as CustomEvent;
      });

      const closeBtn = el.querySelector('.arvo-bnr-alert__close') as HTMLElement;
      closeBtn.click();
      expect(capturedEvent!.bubbles).toBe(false);
    });

    it('fires via dismiss() method', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      const handler = vi.fn();
      el.addEventListener('bnr-alert:dismiss', handler);

      instance.dismiss();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // -- Icon override (neutral-only) --------------------------------------
  describe('icon override (neutral-only)', () => {
    it('renders an override <i> inside __ico and adds has-icon-override on the root when type="neutral"', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
        icon: 'bell-o',
      });

      expect(el.classList.contains('has-icon-override')).toBe(true);

      const ico = el.querySelector('.arvo-bnr-alert__ico');
      expect(ico).not.toBeNull();
      const override = ico!.querySelector('i') as HTMLElement | null;
      expect(override).not.toBeNull();
      expect(override!.classList.contains('o9con')).toBe(true);
      expect(override!.classList.contains('o9con-bell-o')).toBe(true);
    });

    it('ignores the icon option on non-neutral types', () => {
      const nonNeutral = ['positive', 'info', 'warning', 'negative', 'block'] as const;
      for (const type of nonNeutral) {
        const el = createElement();
        ArvoBannerAlert.initialize(el, { message: 'Msg', type, icon: 'star' });
        expect(el.classList.contains('has-icon-override')).toBe(false);
        const ico = el.querySelector('.arvo-bnr-alert__ico');
        expect(ico!.querySelector('i')).toBeNull();
        el.remove();
      }
    });

    it('omits the override <i> when icon is not provided on a neutral banner', () => {
      const el = createElement();
      ArvoBannerAlert.initialize(el, { message: 'Msg', type: 'neutral' });
      expect(el.classList.contains('has-icon-override')).toBe(false);
      const ico = el.querySelector('.arvo-bnr-alert__ico');
      expect(ico!.querySelector('i')).toBeNull();
    });

    it('icon() getter returns current icon or null', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
        icon: 'star',
      });
      expect(instance.icon()).toBe('star');
    });

    it('icon() getter returns null when no icon set', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
      });
      expect(instance.icon()).toBeNull();
    });

    it('icon() setter swaps the override <i> on a neutral banner', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
        icon: 'star',
      });
      instance.icon('bell-o');
      const override = el.querySelector('.arvo-bnr-alert__ico > i') as HTMLElement;
      expect(override).not.toBeNull();
      expect(override.classList.contains('o9con-bell-o')).toBe(true);
      expect(override.classList.contains('o9con-star')).toBe(false);
    });

    it('icon(null) removes the override <i> and the has-icon-override state class', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
        icon: 'star',
      });
      expect(el.classList.contains('has-icon-override')).toBe(true);

      instance.icon(null);
      expect(el.classList.contains('has-icon-override')).toBe(false);
      expect(el.querySelector('.arvo-bnr-alert__ico > i')).toBeNull();
    });

    it('type() change suppresses the override when flipping away from neutral and restores it on flip back', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
        icon: 'star',
      });
      expect(el.classList.contains('has-icon-override')).toBe(true);
      expect(el.querySelector('.arvo-bnr-alert__ico > i')).not.toBeNull();

      instance.type('info');
      expect(el.classList.contains('has-icon-override')).toBe(false);
      expect(el.querySelector('.arvo-bnr-alert__ico > i')).toBeNull();

      instance.type('neutral');
      expect(el.classList.contains('has-icon-override')).toBe(true);
      const restored = el.querySelector('.arvo-bnr-alert__ico > i') as HTMLElement;
      expect(restored).not.toBeNull();
      expect(restored.classList.contains('o9con-star')).toBe(true);
    });

    it('icon() setter stores the value even when type is non-neutral (override stays suppressed)', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'info',
      });
      instance.icon('star');
      expect(instance.icon()).toBe('star');
      expect(el.classList.contains('has-icon-override')).toBe(false);
      expect(el.querySelector('.arvo-bnr-alert__ico > i')).toBeNull();

      // Flip to neutral: the previously-stored icon now activates as the override.
      instance.type('neutral');
      expect(el.classList.contains('has-icon-override')).toBe(true);
      const override = el.querySelector('.arvo-bnr-alert__ico > i') as HTMLElement;
      expect(override).not.toBeNull();
      expect(override.classList.contains('o9con-star')).toBe(true);
    });
  });

  // -- Destroy cleanup ---------------------------------------------------
  describe('destroy cleanup', () => {
    it('removes all arvo-bnr-alert* and loading classes from host', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'negative',
        isLoading: true,
      });
      instance.destroy();

      const hasArvoClass = Array.from(el.classList).some((c) =>
        c.startsWith('arvo-bnr-alert'),
      );
      expect(hasArvoClass).toBe(false);
      expect(el.classList.contains('loading')).toBe(false);
    });

    it('clears innerHTML (no children)', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.destroy();
      expect(el.innerHTML).toBe('');
    });

    it('methods are no-ops after destroy (do not throw)', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.destroy();

      expect(() => instance.message('x')).not.toThrow();
      expect(() => instance.type('warning')).not.toThrow();
      expect(() => instance.title('x')).not.toThrow();
      expect(() => instance.loading(true)).not.toThrow();
      expect(() => instance.icon('star')).not.toThrow();
      expect(() => instance.dismiss()).not.toThrow();
    });

    it('removes has-icon-override class on destroy', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        type: 'neutral',
        icon: 'star',
      });
      expect(el.classList.contains('has-icon-override')).toBe(true);
      instance.destroy();
      expect(el.classList.contains('has-icon-override')).toBe(false);
    });

    it('destroys inner button and link instances', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        button: { label: 'B' },
        link: { label: 'L', href: '#' },
      });
      expect(el.querySelector('.arvo-bnr-alert__btn')).not.toBeNull();
      expect(el.querySelector('.arvo-bnr-alert__link')).not.toBeNull();

      instance.destroy();
      expect(el.querySelector('.arvo-bnr-alert__btn')).toBeNull();
      expect(el.querySelector('.arvo-bnr-alert__link')).toBeNull();
    });

    it('removes role attribute added during init', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.destroy();
      expect(el.getAttribute('role')).toBeNull();
    });

    it('removes aria-busy attribute if it was set', () => {
      const el = createElement();
      const instance = ArvoBannerAlert.initialize(el, {
        message: 'Msg',
        isLoading: true,
      });
      instance.destroy();
      expect(el.getAttribute('aria-busy')).toBeNull();
    });

    it('preserves non-arvo classes on host', () => {
      const el = createElement();
      el.classList.add('my-custom-class');
      const instance = ArvoBannerAlert.initialize(el, { message: 'Msg' });
      instance.destroy();
      expect(el.classList.contains('my-custom-class')).toBe(true);
    });
  });
});
