import { describe, it, expect } from 'vitest';
import { tokenizeFormat, hasDateTokens, hasTimeTokens } from '../format/tokenize';
import type { TokenKind } from '../types';

function kinds(format: string): TokenKind[] {
  return tokenizeFormat(format).map((t) => t.kind);
}

function raws(format: string): string[] {
  return tokenizeFormat(format).map((t) => t.raw);
}

describe('tokenizeFormat', () => {
  it('tokenizes every date token spelling', () => {
    expect(kinds('yyyy')).toEqual(['year']);
    expect(kinds('yy')).toEqual(['year']);
    expect(kinds('MMMM')).toEqual(['monthName']);
    expect(kinds('MMM')).toEqual(['monthName']);
    expect(kinds('MM')).toEqual(['month']);
    expect(kinds('M')).toEqual(['month']);
    expect(kinds('dd')).toEqual(['day']);
    expect(kinds('d')).toEqual(['day']);
    expect(kinds('dddd')).toEqual(['dayName']);
    expect(kinds('ddd')).toEqual(['dayName']);
  });

  it('tokenizes every time token spelling', () => {
    expect(kinds('HH')).toEqual(['hour24']);
    expect(kinds('H')).toEqual(['hour24']);
    expect(kinds('hh')).toEqual(['hour12']);
    expect(kinds('h')).toEqual(['hour12']);
    expect(kinds('mm')).toEqual(['minute']);
    expect(kinds('m')).toEqual(['minute']);
    expect(kinds('ss')).toEqual(['second']);
    expect(kinds('s')).toEqual(['second']);
    expect(kinds('tt')).toEqual(['ampm']);
    expect(kinds('zzz')).toEqual(['timezone']);
    expect(kinds('zz')).toEqual(['timezone']);
  });

  it('tokenizes all fraction lengths f..fffffff', () => {
    for (let len = 1; len <= 7; len += 1) {
      const tokens = tokenizeFormat('f'.repeat(len));
      expect(tokens).toHaveLength(1);
      expect(tokens[0].kind).toBe('fraction');
      expect(tokens[0].length).toBe(len);
    }
  });

  it('is case sensitive (mm minutes vs MM month)', () => {
    expect(kinds('mm')).toEqual(['minute']);
    expect(kinds('MM')).toEqual(['month']);
    expect(kinds('HH')).toEqual(['hour24']);
    expect(kinds('hh')).toEqual(['hour12']);
  });

  it('matches longest-first within a category (MMMM > MMM > MM > M)', () => {
    expect(raws('MMMM')).toEqual(['MMMM']);
    expect(raws('MMM')).toEqual(['MMM']);
    expect(raws('MM')).toEqual(['MM']);
    expect(raws('M')).toEqual(['M']);
  });

  it('merges consecutive literals into one token', () => {
    const tokens = tokenizeFormat('yyyy-MM-dd');
    expect(tokens.map((t) => t.raw)).toEqual(['yyyy', '-', 'MM', '-', 'dd']);
    expect(tokens.filter((t) => t.kind === 'literal')).toHaveLength(2);
  });

  it('treats T and Z and punctuation as literals (not tokens)', () => {
    const tokens = tokenizeFormat('yyyy-MM-ddTHH:mm:ssZ');
    const literals = tokens.filter((t) => t.kind === 'literal').map((t) => t.text);
    expect(literals).toContain('T');
    // The trailing literal Z is a literal, not a timezone token.
    expect(literals).toContain('Z');
    expect(tokens.some((t) => t.kind === 'timezone')).toBe(false);
  });

  it('keeps a multi-character literal run of non-token chars together', () => {
    // Spaces, slashes, and punctuation are not tokens, so a run merges.
    const tokens = tokenizeFormat('dd <> MM');
    expect(tokens.map((t) => t.raw)).toEqual(['dd', ' <> ', 'MM']);
    const literal = tokens.find((t) => t.kind === 'literal');
    expect(literal?.text).toBe(' <> ');
  });

  it('merges repeated separator whitespace into a single literal', () => {
    const tokens = tokenizeFormat('HH   mm');
    expect(tokens.map((t) => t.raw)).toEqual(['HH', '   ', 'mm']);
  });

  it('records numeric padding length', () => {
    const tokens = tokenizeFormat('yyyy/MM/dd HH:mm:ss');
    const byKind = (k: TokenKind) => tokens.find((t) => t.kind === k);
    expect(byKind('year')?.length).toBe(4);
    expect(byKind('month')?.length).toBe(2);
    expect(byKind('day')?.length).toBe(2);
    expect(byKind('hour24')?.length).toBe(2);
  });

  it('handles a complex format with timezone and fraction', () => {
    expect(kinds('yyyy-MM-ddTHH:mm:ss.fffffffzzz')).toEqual([
      'year',
      'literal',
      'month',
      'literal',
      'day',
      'literal',
      'hour24',
      'literal',
      'minute',
      'literal',
      'second',
      'literal',
      'fraction',
      'timezone',
    ]);
  });

  it('returns an empty array for an empty format', () => {
    expect(tokenizeFormat('')).toEqual([]);
  });
});

describe('hasDateTokens / hasTimeTokens', () => {
  it('detects date-only formats', () => {
    expect(hasDateTokens('yyyy-MM-dd')).toBe(true);
    expect(hasTimeTokens('yyyy-MM-dd')).toBe(false);
  });

  it('detects time-only formats', () => {
    expect(hasTimeTokens('HH:mm:ss')).toBe(true);
    expect(hasDateTokens('HH:mm:ss')).toBe(false);
  });

  it('detects combined formats', () => {
    expect(hasDateTokens('yyyy-MM-dd HH:mm')).toBe(true);
    expect(hasTimeTokens('yyyy-MM-dd HH:mm')).toBe(true);
  });

  it('treats AM/PM and fraction as time tokens', () => {
    expect(hasTimeTokens('hh:mm tt')).toBe(true);
    expect(hasTimeTokens('ss.fff')).toBe(true);
  });
});
