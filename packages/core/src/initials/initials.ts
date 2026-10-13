// Initials resolution shared by the Avatar component (React + JS) so both
// platforms produce identical output. Pure, dependency-free, DOM-free.
//
// Behavioral rules are canonical in descriptors/ArvoAvatar.md sections 8.2
// and 8.3. Every row in those tables is exercised by the test suite.

export interface ResolveInitialsOptions {
  /** Display name to derive initials from. Tried first. */
  name?: string | null;
  /** Email address used as a fallback source. Only the local part is parsed. */
  email?: string | null;
  /**
   * Maximum number of characters in the resolved initials string.
   * The Avatar `xs` size passes `1`; all other sizes pass `2` (the default).
   * For non-Latin scripts the result is always a single character regardless.
   */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 2;

// Honorifics stripped from the START of the token list. Periods optional.
const HONORIFICS = /^(?:mr|mrs|ms|dr|prof|sir|madam|shri|smt|mx)\.?$/i;

// Suffixes stripped from the END of the token list. Periods optional.
const SUFFIXES = /^(?:jr|sr|ii|iii|iv|phd|md|esq)\.?$/i;

// Particles dropped from MIDDLE positions when 3+ tokens remain.
const PARTICLES = new Set([
  'van', 'von', 'de', 'da', 'der', 'di', 'la', 'of', 'the', 'and',
]);

// Whitespace-flanked separators that act as word boundaries inside a name.
// Note: dots and hyphens are NOT separators in names (e.g. "John-Kennedy" and
// "John.Kennedy.Taylor" both render as the single character "J"). They ARE
// separators in email local parts -- handled in parseInitialsFromEmail.
const NAME_SEPARATOR = /\s+[|/&+]\s+/g;

// Email separators: dots, underscores, hyphens are all word boundaries.
const EMAIL_SEPARATOR = /[._-]+/g;

// Bracketed groups stripped from names (Kat (Airbnb) -> Kat).
const PARENS = /\([^)]*\)/g;
const SQUARE_BRACKETS = /\[[^\]]*\]/g;

// Emoji / pictographic characters. The Extended_Pictographic property covers
// emoji, symbols, and most modifier sequences without the false positives that
// a hand-rolled symbol regex produces.
const EMOJI = /\p{Extended_Pictographic}/gu;

// Single-codepoint letter detector.
const LETTER = /\p{Letter}/u;

// Latin script detector (covers ASCII Latin + Latin Extended including accents).
const LATIN_LETTER = /\p{Script=Latin}/u;

/** Resolve initials from a name (preferred) or email fallback. */
export function resolveInitials(options: ResolveInitialsOptions = {}): string {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  if (options.name) {
    const fromName = parseInitialsFromName(options.name, maxChars);
    if (fromName) return fromName;
  }

  if (options.email) {
    const fromEmail = parseInitialsFromEmail(options.email, maxChars);
    if (fromEmail) return fromEmail;
  }

  return '';
}

/**
 * Parse initials from a display name. Returns an empty string when no valid
 * initials can be derived (caller should fall back to an icon avatar).
 */
export function parseInitialsFromName(name: string, maxChars: number = DEFAULT_MAX_CHARS): string {
  if (!name) return '';

  let s = name;
  s = s.replace(EMOJI, ' ');
  s = s.replace(PARENS, ' ');
  s = s.replace(SQUARE_BRACKETS, ' ');
  s = s.replace(NAME_SEPARATOR, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';

  let tokens = s.split(' ');

  // Strip honorifics from the start (only when more than one token remains).
  while (tokens.length > 1 && HONORIFICS.test(tokens[0]!)) tokens.shift();

  // Strip suffixes from the end (only when more than one token remains).
  while (tokens.length > 1 && SUFFIXES.test(tokens[tokens.length - 1]!)) tokens.pop();

  // Drop particles from middle positions when at least 3 tokens remain
  // (e.g. "John van der Berg" -> ["John", "Berg"]).
  if (tokens.length > 2) {
    tokens = tokens.filter((token, i) => {
      if (i === 0 || i === tokens.length - 1) return true;
      return !PARTICLES.has(token.toLowerCase());
    });
  }

  // A valid word token must START with a letter (Latin or non-Latin). Tokens
  // that begin with a digit ("2nd", "3rd", "123") or symbols-only tokens are
  // dropped entirely.
  tokens = tokens.filter(isValidWordToken);
  if (tokens.length === 0) return '';

  // Non-Latin first character -> return the first codepoint only, no uppercase.
  const firstChar = firstCodepoint(tokens[0]!);
  if (firstChar && LETTER.test(firstChar) && !LATIN_LETTER.test(firstChar)) {
    return firstChar;
  }

  // Build Latin initials: 1 token -> first letter; 2+ -> first + last.
  let initials: string;
  if (tokens.length === 1) {
    initials = firstLetter(tokens[0]!);
  } else {
    initials = firstLetter(tokens[0]!) + firstLetter(tokens[tokens.length - 1]!);
  }

  return initials.toUpperCase().slice(0, Math.max(1, maxChars));
}

/**
 * Parse initials from an email address (or just the local part). Dots,
 * underscores, and hyphens act as word separators.
 */
export function parseInitialsFromEmail(
  emailOrLocal: string,
  maxChars: number = DEFAULT_MAX_CHARS,
): string {
  if (!emailOrLocal) return '';

  // Accept "name@domain" or the bare local part.
  const atIndex = emailOrLocal.indexOf('@');
  const local = atIndex === -1 ? emailOrLocal : emailOrLocal.slice(0, atIndex);

  let s = local;
  s = s.replace(EMOJI, ' ');
  s = s.replace(EMAIL_SEPARATOR, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';

  const tokens = s.split(' ').filter(isValidWordToken);
  if (tokens.length === 0) return '';

  const firstChar = firstCodepoint(tokens[0]!);
  if (firstChar && LETTER.test(firstChar) && !LATIN_LETTER.test(firstChar)) {
    return firstChar;
  }

  let initials: string;
  if (tokens.length === 1) {
    initials = firstLetter(tokens[0]!);
  } else {
    initials = firstLetter(tokens[0]!) + firstLetter(tokens[tokens.length - 1]!);
  }

  return initials.toUpperCase().slice(0, Math.max(1, maxChars));
}

// --- helpers ---------------------------------------------------------------

/** True when the FIRST codepoint of the token is a letter. */
function isValidWordToken(token: string): boolean {
  const first = firstCodepoint(token);
  return first !== '' && LETTER.test(first);
}

/** Return the first Unicode codepoint of a string (handles surrogate pairs). */
function firstCodepoint(s: string): string {
  if (!s) return '';
  for (const ch of s) return ch;
  return '';
}

/** Return the first letter codepoint inside a token, skipping leading non-letters. */
function firstLetter(token: string): string {
  for (const ch of token) {
    if (LETTER.test(ch)) return ch;
  }
  return '';
}
