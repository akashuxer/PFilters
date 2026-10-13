// @arvo/core/datetime - Format tokenizer (.NET / Kendo style)
//
// Tokens are CASE SENSITIVE and matched longest-first within each category.
// Unmatched characters are emitted as merged `literal` tokens.

import type { Token, TokenKind } from '../types';

// Alternation ordered longest-first across all token spellings. A sticky regex
// walks the format string; anything that fails to match here is a literal.
const TOKEN_SOURCE =
  'yyyy|yy|' +
  'MMMM|MMM|MM|M|' +
  'dddd|ddd|dd|d|' +
  'HH|H|hh|h|' +
  'mm|m|ss|s|' +
  'fffffff|ffffff|fffff|ffff|fff|ff|f|' +
  'tt|zzz|zz';

// Cache compiled tokenizations per format string (small LRU-ish map).
const cache = new Map<string, Token[]>();
const CACHE_LIMIT = 64;

function kindFor(raw: string): TokenKind {
  switch (raw[0]) {
    case 'y':
      return 'year';
    case 'M':
      return raw.length >= 3 ? 'monthName' : 'month';
    case 'd':
      return raw.length >= 3 ? 'dayName' : 'day';
    case 'H':
      return 'hour24';
    case 'h':
      return 'hour12';
    case 'm':
      return 'minute';
    case 's':
      return 'second';
    case 'f':
      return 'fraction';
    case 't':
      return 'ampm';
    case 'z':
      return 'timezone';
    /* c8 ignore next 2 -- only matched token leads reach kindFor */
    default:
      return 'literal';
  }
}

/**
 * Tokenize a .NET / Kendo style format string into typed tokens. Consecutive
 * literal characters are merged into a single `literal` token.
 */
export function tokenizeFormat(format: string): Token[] {
  const cached = cache.get(format);
  if (cached) return cached;

  const tokens: Token[] = [];
  // Fresh sticky regex per call (lastIndex is stateful).
  const re = new RegExp(TOKEN_SOURCE, 'y');
  let pos = 0;
  let literal = '';

  const flushLiteral = (): void => {
    if (literal) {
      tokens.push({ kind: 'literal', raw: literal, text: literal });
      literal = '';
    }
  };

  while (pos < format.length) {
    re.lastIndex = pos;
    const match = re.exec(format);
    if (match && match.index === pos) {
      flushLiteral();
      const raw = match[0];
      tokens.push({ kind: kindFor(raw), raw, length: raw.length });
      pos += raw.length;
    } else {
      literal += format[pos];
      pos += 1;
    }
  }
  flushLiteral();

  if (cache.size >= CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(format, tokens);
  return tokens;
}

const TIME_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  'hour24',
  'hour12',
  'minute',
  'second',
  'fraction',
  'ampm',
]);

const DATE_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  'year',
  'month',
  'monthName',
  'day',
  'dayName',
]);

/** True when the format contains any time-of-day token. */
export function hasTimeTokens(format: string): boolean {
  return tokenizeFormat(format).some((t) => TIME_KINDS.has(t.kind));
}

/** True when the format contains any calendar-date token. */
export function hasDateTokens(format: string): boolean {
  return tokenizeFormat(format).some((t) => DATE_KINDS.has(t.kind));
}
