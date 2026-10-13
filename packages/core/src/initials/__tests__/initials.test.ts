import { describe, expect, it } from 'vitest';
import {
  parseInitialsFromEmail,
  parseInitialsFromName,
  resolveInitials,
} from '../initials';

describe('parseInitialsFromName (spec descriptors/ArvoAvatar.md 8.2)', () => {
  it('single word -> first char', () => {
    expect(parseInitialsFromName('John')).toBe('J');
  });

  it('two words -> first + last', () => {
    expect(parseInitialsFromName('John Taylor')).toBe('JT');
  });

  it('three words -> first + last, ignore middle', () => {
    expect(parseInitialsFromName('John Kennedy Taylor')).toBe('JT');
  });

  it('multiple words -> first + last, ignore all middles', () => {
    expect(parseInitialsFromName('John Kennedy David Taylor')).toBe('JT');
  });

  it('hyphenated single name (no space) -> first char only', () => {
    expect(parseInitialsFromName('John-Kennedy')).toBe('J');
  });

  it('hyphenated last name with space -> first of first group + first of last word', () => {
    expect(parseInitialsFromName('John-Kennedy Taylor')).toBe('JT');
  });

  it('dot-separated -> continuous string, first valid char only', () => {
    expect(parseInitialsFromName('John.Kennedy.Taylor')).toBe('J');
  });

  it('single concatenated word -> first char only', () => {
    expect(parseInitialsFromName('JohnKennedyTaylor')).toBe('J');
  });

  it('camelCase -> first char only (no camel splitting)', () => {
    expect(parseInitialsFromName('JohnTaylor')).toBe('J');
  });

  it('punctuation-separated (Hello + Co) -> strip punctuation, build from remaining words', () => {
    expect(parseInitialsFromName('Hello + Co')).toBe('HC');
  });

  it('pipe-separated -> treat pipes as separators', () => {
    expect(parseInitialsFromName('John | Taylor')).toBe('JT');
  });

  it('slash-separated -> treat slashes as separators', () => {
    expect(parseInitialsFromName('John / Taylor')).toBe('JT');
  });

  it('ampersand-separated -> treat & as separator', () => {
    expect(parseInitialsFromName('Rut & Circle')).toBe('RC');
  });

  it('parentheses present -> ignore content in parentheses', () => {
    expect(parseInitialsFromName('Kat (Airbnb)')).toBe('K');
  });

  it('"(via ...)" pattern -> ignore the parenthetical', () => {
    expect(parseInitialsFromName('Sydney Doctor (via Cliniko)')).toBe('SD');
  });

  it('prefix / title (Dr.) -> strip honorific', () => {
    expect(parseInitialsFromName('Dr. John Taylor')).toBe('JT');
  });

  it('suffix (Jr.) -> strip suffix', () => {
    expect(parseInitialsFromName('John Taylor Jr.')).toBe('JT');
  });

  it('stop words / particles (van der) -> ignore particles', () => {
    expect(parseInitialsFromName('John van der Berg')).toBe('JB');
  });

  it('trailing numbers -> ignore when valid words exist', () => {
    expect(parseInitialsFromName('John Taylor 3')).toBe('JT');
  });

  it('leading numbers -> ignore when valid words exist', () => {
    expect(parseInitialsFromName('3 John Taylor')).toBe('JT');
  });

  it('numeric-only name -> empty (caller falls back)', () => {
    expect(parseInitialsFromName('123456')).toBe('');
  });

  it('empty name -> empty', () => {
    expect(parseInitialsFromName('')).toBe('');
  });

  it('symbol-only name -> empty', () => {
    expect(parseInitialsFromName('@@@')).toBe('');
  });

  it('emoji + name -> strip decorative emoji', () => {
    expect(parseInitialsFromName(' John Taylor')).toBe('JT');
  });

  it('emoji-only -> empty', () => {
    expect(parseInitialsFromName('')).toBe('');
  });

  it('lowercase -> uppercase result', () => {
    expect(parseInitialsFromName('john taylor')).toBe('JT');
  });

  it('all-uppercase -> preserve', () => {
    expect(parseInitialsFromName('JOHN TAYLOR')).toBe('JT');
  });

  it('multiple spaces -> normalize whitespace', () => {
    expect(parseInitialsFromName('John   Taylor')).toBe('JT');
  });

  it('single character -> display the character', () => {
    expect(parseInitialsFromName('J')).toBe('J');
  });

  it('accented Latin -> retain accented characters', () => {
    expect(parseInitialsFromName('Jose Lpez')).toBe('JL');
  });

  it('Chinese -> non-Latin: first character only', () => {
    expect(parseInitialsFromName('')).toBe('');
  });

  it('Japanese -> non-Latin: first character only', () => {
    expect(parseInitialsFromName('')).toBe('');
  });

  it('Korean -> non-Latin: first character only', () => {
    expect(parseInitialsFromName('')).toBe('');
  });

  it('Arabic -> non-Latin: first character only', () => {
    expect(parseInitialsFromName(' ')).toBe('');
  });

  it('company name with leading number -> strip leading numbers; first + last of remaining', () => {
    expect(parseInitialsFromName('2nd Perfume Oil Company')).toBe('PC');
  });

  it('mixed valid + invalid -> strip invalid characters/numbers, then build initials', () => {
    expect(parseInitialsFromName('### John Taylor 123')).toBe('JT');
  });
});

describe('parseInitialsFromEmail (spec descriptors/ArvoAvatar.md 8.3)', () => {
  it('simple local part -> first valid alpha char before @', () => {
    expect(parseInitialsFromEmail('john@example.com')).toBe('J');
  });

  it('dot-separated local part -> treat dots as separators', () => {
    expect(parseInitialsFromEmail('john.taylor@example.com')).toBe('JT');
  });

  it('underscore-separated local part -> treat underscores as separators', () => {
    expect(parseInitialsFromEmail('john_taylor@example.com')).toBe('JT');
  });

  it('hyphen-separated local part -> treat hyphens as separators', () => {
    expect(parseInitialsFromEmail('john-taylor@example.com')).toBe('JT');
  });

  it('trailing numbers in local part -> strip numbers, take first valid char', () => {
    expect(parseInitialsFromEmail('john123@example.com')).toBe('J');
  });

  it('numeric-only local part -> empty (fall back to icon)', () => {
    expect(parseInitialsFromEmail('123456@example.com')).toBe('');
  });

  it('accepts bare local part without @', () => {
    expect(parseInitialsFromEmail('jane.smith')).toBe('JS');
  });
});

describe('resolveInitials', () => {
  it('uses name when both name AND email are present', () => {
    expect(
      resolveInitials({ name: 'John Taylor', email: 'jane.smith@example.com' }),
    ).toBe('JT');
  });

  it('falls back to email when name is empty', () => {
    expect(resolveInitials({ name: '', email: 'jane.smith@example.com' })).toBe('JS');
  });

  it('falls back to email when name yields no initials', () => {
    expect(resolveInitials({ name: '', email: 'jane.smith@example.com' })).toBe('JS');
  });

  it('returns empty when neither name nor email resolves', () => {
    expect(resolveInitials({ name: '123', email: '456@x.com' })).toBe('');
  });

  it('returns empty when no inputs are provided', () => {
    expect(resolveInitials()).toBe('');
  });

  it('respects maxChars=1 (xs size constraint)', () => {
    expect(resolveInitials({ name: 'John Taylor', maxChars: 1 })).toBe('J');
  });

  it('maxChars defaults to 2', () => {
    expect(resolveInitials({ name: 'John Kennedy Taylor' })).toBe('JT');
  });

  it('non-Latin scripts return a single character regardless of maxChars', () => {
    expect(resolveInitials({ name: '', maxChars: 2 })).toBe('');
  });
});
