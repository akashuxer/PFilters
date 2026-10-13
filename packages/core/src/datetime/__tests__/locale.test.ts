import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUserLocale,
  shouldUse12Hour,
  getLocaleDateFormat,
  getLocaleTimeFormat,
  getLocaleDateTimeFormat,
  getMonthNames,
  getDayNames,
  getWeekdayHeaders,
  getAmPmStrings,
} from '../format/locale';
import { configureDateTime, resetDateTimeConfig } from '../config';

function stubHtmlLang(lang: string): void {
  vi.stubGlobal('document', { documentElement: { lang } });
}

describe('getUserLocale - OQ-12 cascade', () => {
  beforeEach(() => {
    resetDateTimeConfig();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    resetDateTimeConfig();
    vi.unstubAllGlobals();
  });

  it('1. explicit override beats every other layer', () => {
    configureDateTime({ locale: 'de-DE' });
    stubHtmlLang('fr-FR');
    expect(getUserLocale('ja-JP')).toBe('ja-JP');
  });

  it('2. configureDateTime beats <html lang>', () => {
    configureDateTime({ locale: 'de-DE' });
    stubHtmlLang('fr-FR');
    expect(getUserLocale()).toBe('de-DE');
  });

  it('3. <html lang> beats the hardcoded default', () => {
    stubHtmlLang('fr-FR');
    expect(getUserLocale()).toBe('fr-FR');
  });

  it('4. falls back to en-US when nothing else is set', () => {
    stubHtmlLang('');
    expect(getUserLocale()).toBe('en-US');
  });

  it('skips an empty/whitespace <html lang>', () => {
    stubHtmlLang('');
    configureDateTime({ locale: undefined });
    expect(getUserLocale()).toBe('en-US');
  });

  it('NEVER consults navigator.language', () => {
    vi.stubGlobal('navigator', {
      language: 'zz-ZZ',
      languages: ['zz-ZZ', 'qq-QQ'],
    });
    stubHtmlLang('');
    expect(getUserLocale()).toBe('en-US');
    expect(getUserLocale()).not.toBe('zz-ZZ');
  });

  it('navigator is ignored even when present alongside <html lang>', () => {
    vi.stubGlobal('navigator', { language: 'zz-ZZ' });
    stubHtmlLang('fr-FR');
    expect(getUserLocale()).toBe('fr-FR');
  });

  it('works when document is entirely undefined (SSR / node)', () => {
    // No document stub -> typeof document === 'undefined' path.
    expect(getUserLocale()).toBe('en-US');
  });
});

describe('shouldUse12Hour - OQ-3 (format wins, locale fallback)', () => {
  it('format with hh + tt -> 12h regardless of locale', () => {
    expect(shouldUse12Hour({ format: 'hh:mm tt', locale: 'de-DE' })).toBe(true);
  });

  it('format with HH (no tt) -> 24h regardless of locale', () => {
    expect(shouldUse12Hour({ format: 'HH:mm', locale: 'en-US' })).toBe(false);
  });

  it('lone h without tt is still 12h', () => {
    expect(shouldUse12Hour({ format: 'h:mm' })).toBe(true);
  });

  it('lone tt without an hour token -> 12h', () => {
    expect(shouldUse12Hour({ format: 'tt' })).toBe(true);
  });

  it('date-only format falls back to locale (en-US -> 12h)', () => {
    expect(shouldUse12Hour({ format: 'yyyy-MM-dd', locale: 'en-US' })).toBe(true);
  });

  it('date-only format falls back to locale (fr-FR -> 24h)', () => {
    expect(shouldUse12Hour({ format: 'yyyy-MM-dd', locale: 'fr-FR' })).toBe(false);
  });

  it('no format at all falls back to locale', () => {
    expect(shouldUse12Hour({ locale: 'en-US' })).toBe(true);
    expect(shouldUse12Hour({ locale: 'de-DE' })).toBe(false);
  });
});

describe('locale-derived formats', () => {
  it('derives short date formats per locale', () => {
    expect(getLocaleDateFormat('en-US')).toBe('MM/dd/yyyy');
    expect(getLocaleDateFormat('de-DE')).toBe('dd.MM.yyyy');
    expect(getLocaleDateFormat('ja-JP')).toBe('yyyy/MM/dd');
    expect(getLocaleDateFormat('fr-FR')).toBe('dd/MM/yyyy');
  });

  it('derives time formats with and without AM/PM', () => {
    expect(getLocaleTimeFormat('en-US')).toBe('hh:mm tt');
    expect(getLocaleTimeFormat('fr-FR')).toBe('HH:mm');
  });

  it('honors an explicit use24Hour override', () => {
    expect(getLocaleTimeFormat('en-US', true)).toBe('HH:mm');
    expect(getLocaleTimeFormat('de-DE', false)).toBe('hh:mm tt');
  });

  it('combines date + time for datetime formats', () => {
    expect(getLocaleDateTimeFormat('en-US')).toBe('MM/dd/yyyy hh:mm tt');
    expect(getLocaleDateTimeFormat('ja-JP')).toBe('yyyy/MM/dd HH:mm');
  });
});

describe('locale name lookups', () => {
  it('returns localized month names', () => {
    expect(getMonthNames('en-US', 'full')[0]).toBe('January');
    expect(getMonthNames('en-US', 'abbrev')[0]).toBe('Jan');
    expect(getMonthNames('de-DE', 'full')[0]).toBe('Januar');
    expect(getMonthNames('fr-FR', 'full')[8]).toBe('septembre');
  });

  it('returns localized day names indexed Sunday..Saturday', () => {
    expect(getDayNames('en-US', 'full')[0]).toBe('Sunday');
    expect(getDayNames('en-US', 'full')[1]).toBe('Monday');
    expect(getDayNames('en-US', 'full')[6]).toBe('Saturday');
  });

  it('rotates weekday headers by weekStart', () => {
    const sun = getWeekdayHeaders('en-US', 0, 'abbrev');
    const mon = getWeekdayHeaders('en-US', 1, 'abbrev');
    expect(sun[0]).toBe('Sun');
    expect(mon[0]).toBe('Mon');
    expect(mon[6]).toBe('Sun');
  });

  it('supports narrow weekday headers', () => {
    expect(getWeekdayHeaders('en-US', 0, 'narrow')[0]).toBe('S');
  });

  it('returns AM/PM strings for en-US', () => {
    expect(getAmPmStrings('en-US')).toEqual({ am: 'AM', pm: 'PM' });
  });
});
