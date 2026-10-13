import { describe, it, expect } from 'vitest';
import { renderInlineContent, type InlineContentAdapter } from '../adapter';
import type { InlineContent, NormalizedLink } from '../types';

// A string-serializing adapter. It lets us assert the exact walk output of
// `renderInlineContent` without any DOM or React dependency, and documents the
// node -> method routing every real adapter (domInlineAdapter, reactInlineAdapter)
// must honor.
const stringAdapter: InlineContentAdapter<string> = {
  fragment: (children) => children.join(''),
  text: (value) => value,
  em: (children) => `<em>${children.join('')}</em>`,
  strong: (children) => `<strong>${children.join('')}</strong>`,
  link: (props: NormalizedLink, label) =>
    `<a href="${props.href}" target="${props.target}"${props.rel ? ` rel="${props.rel}"` : ''}>${label}</a>`,
  code: (value) => `<code>${value}</code>`,
  kbd: (value) => `<kbd>${value}</kbd>`,
  abbr: (value, title) => `<abbr title="${title}">${value}</abbr>`,
  time: (value, dateTime) => `<time datetime="${dateTime}">${value}</time>`,
  sup: (value) => `<sup>${value}</sup>`,
  sub: (value) => `<sub>${value}</sub>`,
  br: () => '<br>',
};

function render(
  content: InlineContent,
  options?: Parameters<typeof renderInlineContent>[2],
): string {
  return renderInlineContent(content, stringAdapter, options);
}

describe('renderInlineContent (generic walker)', () => {
  it('lifts a plain string to a single text node', () => {
    expect(render('Hello world')).toBe('Hello world');
  });

  it('renders a text node array', () => {
    expect(render([{ type: 'text', value: 'Hi' }])).toBe('Hi');
  });

  it('wraps multiple top-level nodes in a single fragment', () => {
    expect(
      render([
        { type: 'text', value: 'a' },
        { type: 'text', value: 'b' },
      ]),
    ).toBe('ab');
  });

  it('routes strong and pre-renders array children', () => {
    expect(
      render([
        { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
      ]),
    ).toBe('<strong>bold</strong>');
  });

  it('routes em and lifts string children', () => {
    expect(render([{ type: 'em', children: 'italic' }])).toBe('<em>italic</em>');
  });

  it('routes code and kbd nodes', () => {
    expect(
      render([
        { type: 'code', value: 'npm i' },
        { type: 'kbd', value: 'Ctrl' },
      ]),
    ).toBe('<code>npm i</code><kbd>Ctrl</kbd>');
  });

  it('defaults a link target to _self when omitted', () => {
    expect(render([{ type: 'link', href: '/docs', label: 'Docs' }])).toBe(
      '<a href="/docs" target="_self">Docs</a>',
    );
  });

  it('passes through an explicit link target', () => {
    const out = render([
      { type: 'link', href: 'https://example.com', target: '_blank', label: 'Site' },
    ]);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('>Site</a>');
  });

  it('renders extended-profile nodes (abbr, time, sup, sub, br)', () => {
    const out = render(
      [
        { type: 'abbr', value: 'HTML', title: 'HyperText Markup Language' },
        { type: 'time', value: 'noon', dateTime: '12:00' },
        { type: 'sup', value: '2' },
        { type: 'sub', value: 'x' },
        { type: 'br' },
      ],
      { profile: 'extended-inline' },
    );
    expect(out).toBe(
      '<abbr title="HyperText Markup Language">HTML</abbr>' +
        '<time datetime="12:00">noon</time>' +
        '<sup>2</sup><sub>x</sub><br>',
    );
  });
});
