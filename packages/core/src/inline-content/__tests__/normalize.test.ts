// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { normalizeInlineContent } from '../index';
import type { InlineNode } from '../index';

describe('normalizeInlineContent', () => {
  it('lifts a non-empty string into a single TextNode', () => {
    expect(normalizeInlineContent('hi', 'basic-inline')).toEqual([
      { type: 'text', value: 'hi' },
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(normalizeInlineContent('', 'basic-inline')).toEqual([]);
  });

  it('returns an empty array for an empty input array', () => {
    expect(normalizeInlineContent([], 'basic-inline')).toEqual([]);
  });

  it('returns an array of nodes unchanged when valid', () => {
    const input: InlineNode[] = [
      { type: 'text', value: 'a' },
      { type: 'strong', children: 'b' },
    ];
    expect(normalizeInlineContent(input, 'basic-inline')).toEqual(input);
  });

  it('strips disallowed nodes when mode = strip', () => {
    const input: InlineNode[] = [
      { type: 'text', value: 'ok' },
      { type: 'sup', value: '2' },
    ];
    expect(normalizeInlineContent(input, 'basic-inline', 'strip')).toEqual([
      { type: 'text', value: 'ok' },
    ]);
  });
});
