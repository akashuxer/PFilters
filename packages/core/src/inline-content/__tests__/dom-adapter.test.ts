// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderInlineContentToDOM,
  replaceInlineContentInElement,
  domInlineAdapter,
} from '../index';
import type { InlineNode } from '../index';

describe('renderInlineContentToDOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a plain string as a single text node inside a fragment', () => {
    const frag = renderInlineContentToDOM('hello world');
    const host = document.createElement('div');
    host.appendChild(frag);
    expect(host.childNodes.length).toBe(1);
    expect(host.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(host.textContent).toBe('hello world');
  });

  it('renders all basic node types with the published BEM classes', () => {
    const content: InlineNode[] = [
      { type: 'text', value: 'pre ' },
      { type: 'em', children: [{ type: 'text', value: 'em' }] },
      { type: 'text', value: ' ' },
      { type: 'strong', children: 'strong' },
      { type: 'text', value: ' ' },
      {
        type: 'link',
        label: 'lnk',
        href: 'https://example.com',
        target: '_blank',
      },
      { type: 'text', value: ' ' },
      { type: 'code', value: 'code' },
      { type: 'text', value: ' ' },
      { type: 'kbd', value: 'Esc' },
    ];

    const frag = renderInlineContentToDOM(content);
    const host = document.createElement('div');
    host.appendChild(frag);
    expect(host.querySelector('em.arvo-inline__em')?.textContent).toBe('em');
    expect(host.querySelector('strong.arvo-inline__strong')?.textContent).toBe(
      'strong',
    );
    const a = host.querySelector('a.arvo-inline__link') as HTMLAnchorElement | null;
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toContain('noopener');
    expect(a?.getAttribute('rel')).toContain('noreferrer');
    expect(host.querySelector('code.arvo-inline__code')?.textContent).toBe('code');
    expect(host.querySelector('kbd.arvo-inline__kbd')?.textContent).toBe('Esc');
  });

  it('renders extended node types when profile = extended-inline', () => {
    const content: InlineNode[] = [
      { type: 'abbr', value: 'HTML', title: 'Hyper Text Markup Language' },
      { type: 'time', value: 'now', dateTime: '2026-06-10T08:00' },
      { type: 'sup', value: '2' },
      { type: 'sub', value: '1' },
      { type: 'br' },
    ];
    const frag = renderInlineContentToDOM(content, {
      profile: 'extended-inline',
    });
    const host = document.createElement('div');
    host.appendChild(frag);
    const abbr = host.querySelector('abbr.arvo-inline__abbr') as HTMLElement | null;
    expect(abbr?.getAttribute('title')).toBe('Hyper Text Markup Language');
    expect(abbr?.textContent).toBe('HTML');
    const time = host.querySelector('time.arvo-inline__time') as HTMLElement | null;
    expect(time?.getAttribute('datetime')).toBe('2026-06-10T08:00');
    expect(host.querySelector('sup.arvo-inline__sup')?.textContent).toBe('2');
    expect(host.querySelector('sub.arvo-inline__sub')?.textContent).toBe('1');
    expect(host.querySelector('br')).not.toBeNull();
  });

  it('does NOT use innerHTML on the rendered tree', () => {
    // Spy on the property accessor for innerHTML on Element to ensure no
    // adapter method writes to it. Use defineProperty to wrap the existing
    // setter without losing functionality.
    const proto = Element.prototype as Element & { innerHTML: string };
    const desc = Object.getOwnPropertyDescriptor(proto, 'innerHTML');
    const setSpy = vi.fn();
    if (desc?.set) {
      Object.defineProperty(proto, 'innerHTML', {
        configurable: true,
        get: desc.get,
        set(value: string) {
          setSpy(value);
          desc.set!.call(this, value);
        },
      });
    }
    try {
      const frag = renderInlineContentToDOM([
        { type: 'text', value: '<script>alert(1)</script>' },
        { type: 'strong', children: '<b>bold</b>' },
      ]);
      const host = document.createElement('div');
      host.appendChild(frag);
      // textContent of the strong contains literal angle brackets
      expect(host.querySelector('strong')?.textContent).toBe('<b>bold</b>');
      // No script element in the fragment because <script> is text, not markup
      expect(host.querySelector('script')).toBeNull();
      expect(setSpy).not.toHaveBeenCalled();
    } finally {
      if (desc) Object.defineProperty(proto, 'innerHTML', desc);
    }
  });

  it('strips disallowed nodes when mode = strip', () => {
    const frag = renderInlineContentToDOM(
      [
        { type: 'text', value: 'ok ' },
        // intentionally unsupported in basic profile
        { type: 'sup', value: '2' },
      ],
      { profile: 'basic-inline', mode: 'strip' },
    );
    const host = document.createElement('div');
    host.appendChild(frag);
    expect(host.textContent).toBe('ok ');
    expect(host.querySelector('sup')).toBeNull();
  });
});

describe('replaceInlineContentInElement', () => {
  it('replaces existing children with new content', () => {
    const el = document.createElement('p');
    el.textContent = 'old';
    replaceInlineContentInElement(el, 'new value');
    expect(el.textContent).toBe('new value');
  });

  it('clears element when given empty string', () => {
    const el = document.createElement('p');
    el.textContent = 'old';
    replaceInlineContentInElement(el, '');
    expect(el.textContent).toBe('');
    expect(el.childNodes.length).toBe(0);
  });
});

describe('domInlineAdapter directly', () => {
  it('exposes all required adapter methods', () => {
    const required: ReadonlyArray<keyof typeof domInlineAdapter> = [
      'fragment',
      'text',
      'em',
      'strong',
      'link',
      'code',
      'kbd',
      'abbr',
      'time',
      'sup',
      'sub',
      'br',
    ];
    for (const m of required) {
      expect(typeof domInlineAdapter[m]).toBe('function');
    }
  });
});
