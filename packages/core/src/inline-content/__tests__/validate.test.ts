// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateInlineContent,
  sanitizeLink,
  _resetInlineWarnCache,
  type InlineNode,
} from '../index';

describe('validateInlineContent', () => {
  beforeEach(() => {
    _resetInlineWarnCache();
  });

  describe('strings', () => {
    it('returns the string as-is', () => {
      expect(validateInlineContent('hello', { profile: 'basic-inline' })).toBe(
        'hello',
      );
    });
    it('returns empty string as-is', () => {
      expect(validateInlineContent('', { profile: 'basic-inline' })).toBe('');
    });
  });

  describe('basic profile - allowed nodes', () => {
    it('accepts text/em/strong/link/code/kbd', () => {
      const content: InlineNode[] = [
        { type: 'text', value: 'a ' },
        { type: 'em', children: [{ type: 'text', value: 'b' }] },
        { type: 'strong', children: 'c' },
        {
          type: 'link',
          label: 'd',
          href: 'https://example.com',
          target: '_blank',
        },
        { type: 'code', value: 'e' },
        { type: 'kbd', value: 'Ctrl' },
      ];
      const result = validateInlineContent(content, {
        profile: 'basic-inline',
      });
      expect(Array.isArray(result)).toBe(true);
      expect((result as InlineNode[]).length).toBe(content.length);
    });
  });

  describe('basic profile - forbidden nodes', () => {
    it('throws when given an extended-only node in throw mode', () => {
      const content: InlineNode[] = [
        { type: 'sup', value: '2' },
      ];
      expect(() =>
        validateInlineContent(content, { profile: 'basic-inline', mode: 'throw' }),
      ).toThrow(/sup.*basic-inline/);
    });

    it('strips disallowed nodes in strip mode', () => {
      const content: InlineNode[] = [
        { type: 'text', value: 'before' },
        { type: 'sup', value: '2' },
        { type: 'text', value: 'after' },
      ];
      const result = validateInlineContent(content, {
        profile: 'basic-inline',
        mode: 'strip',
      });
      expect(Array.isArray(result)).toBe(true);
      const arr = result as InlineNode[];
      expect(arr).toEqual([
        { type: 'text', value: 'before' },
        { type: 'text', value: 'after' },
      ]);
    });

    it('warns and keeps disallowed nodes in warn mode', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const content: InlineNode[] = [
        { type: 'text', value: 'a' },
        { type: 'sup', value: '2' },
      ];
      const result = validateInlineContent(content, {
        profile: 'basic-inline',
        mode: 'warn',
      });
      expect((result as InlineNode[]).length).toBe(2);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('extended profile - extra nodes', () => {
    it('accepts abbr/time/sup/sub/br', () => {
      const content: InlineNode[] = [
        { type: 'abbr', value: 'HTML', title: 'Hyper Text Markup Language' },
        { type: 'time', value: 'tomorrow', dateTime: '2026-06-11' },
        { type: 'sup', value: '2' },
        { type: 'sub', value: '1' },
        { type: 'br' },
      ];
      const result = validateInlineContent(content, {
        profile: 'extended-inline',
      });
      expect((result as InlineNode[]).length).toBe(content.length);
    });
  });

  describe('shape validation', () => {
    it('rejects null and non-array non-string in throw mode', () => {
      expect(() =>
        validateInlineContent(
          { foo: 'bar' } as any,
          { profile: 'basic-inline', mode: 'throw' },
        ),
      ).toThrow();
    });

    it('strips object-shaped nodes missing a type', () => {
      const result = validateInlineContent(
        [{ value: 'no-type' } as any, { type: 'text', value: 'ok' }],
        { profile: 'basic-inline', mode: 'strip' },
      );
      expect(result).toEqual([{ type: 'text', value: 'ok' }]);
    });
  });

  describe('link sanitization (within validate)', () => {
    it('throws when href uses javascript:', () => {
      expect(() =>
        validateInlineContent(
          [
            {
              type: 'link',
              label: 'click',
              href: 'javascript:alert(1)',
            },
          ],
          { profile: 'basic-inline', mode: 'throw' },
        ),
      ).toThrow(/Unsafe.*link/);
    });

    it('strips link with empty label', () => {
      const result = validateInlineContent(
        [
          { type: 'link', label: '', href: 'https://example.com' },
          { type: 'text', value: 'after' },
        ],
        { profile: 'basic-inline', mode: 'strip' },
      );
      expect(result).toEqual([{ type: 'text', value: 'after' }]);
    });

    it('forces noopener noreferrer on _blank links', () => {
      const result = validateInlineContent(
        [
          {
            type: 'link',
            label: 'go',
            href: 'https://example.com',
            target: '_blank',
          },
        ],
        { profile: 'basic-inline', mode: 'throw' },
      );
      const link = (result as InlineNode[])[0] as { rel?: string };
      expect(link.rel).toContain('noopener');
      expect(link.rel).toContain('noreferrer');
    });
  });
});

describe('sanitizeLink', () => {
  it('accepts http and https', () => {
    expect(
      sanitizeLink({ type: 'link', label: 'a', href: 'http://example.com' }),
    ).toMatchObject({ href: 'http://example.com', target: '_self' });
    expect(
      sanitizeLink({ type: 'link', label: 'a', href: 'https://example.com' }),
    ).toMatchObject({ href: 'https://example.com', target: '_self' });
  });

  it('accepts mailto and tel', () => {
    expect(
      sanitizeLink({ type: 'link', label: 'm', href: 'mailto:a@b.com' }),
    ).not.toBeNull();
    expect(
      sanitizeLink({ type: 'link', label: 't', href: 'tel:+15551234' }),
    ).not.toBeNull();
  });

  it('accepts relative paths', () => {
    for (const href of ['/foo', './bar', '../baz', '#section']) {
      expect(
        sanitizeLink({ type: 'link', label: 'r', href }),
      ).not.toBeNull();
    }
  });

  it('rejects javascript:, data:, vbscript:, file:', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msg',
      'file:///etc/passwd',
    ]) {
      expect(
        sanitizeLink({ type: 'link', label: 'x', href }),
      ).toBeNull();
    }
  });

  it('rejects empty href and empty label', () => {
    expect(
      sanitizeLink({ type: 'link', label: '', href: 'https://example.com' }),
    ).toBeNull();
    expect(
      sanitizeLink({ type: 'link', label: 'x', href: '' }),
    ).toBeNull();
  });

  it('preserves ariaLabel', () => {
    const out = sanitizeLink({
      type: 'link',
      label: 'go',
      href: 'https://example.com',
      ariaLabel: 'Go to docs',
    });
    expect(out?.ariaLabel).toBe('Go to docs');
  });
});
