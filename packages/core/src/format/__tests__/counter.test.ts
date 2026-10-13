import { describe, it, expect } from 'vitest';
import { formatBadgeCount } from '../counter';

describe('formatBadgeCount', () => {
  describe('raw (autoFormat=false)', () => {
    it('returns the raw integer string', () => {
      expect(formatBadgeCount(0)).toBe('0');
      expect(formatBadgeCount(8)).toBe('8');
      expect(formatBadgeCount(99)).toBe('99');
      expect(formatBadgeCount(1234)).toBe('1234');
      expect(formatBadgeCount(1000000)).toBe('1000000');
    });

    it('truncates non-integers and coerces non-finite to 0', () => {
      expect(formatBadgeCount(4.9)).toBe('4');
      expect(formatBadgeCount(Number.NaN)).toBe('0');
      expect(formatBadgeCount(Number.POSITIVE_INFINITY)).toBe('0');
    });
  });

  describe('overflow (single mode)', () => {
    it('renders {overflowCount}+ when value exceeds the threshold', () => {
      expect(formatBadgeCount(100, { overflowCount: 99 })).toBe('99+');
      expect(formatBadgeCount(500, { overflowCount: 99 })).toBe('99+');
      expect(formatBadgeCount(99, { overflowCount: 99 })).toBe('99');
      expect(formatBadgeCount(8, { overflowCount: 99 })).toBe('8');
    });

    it('honors a custom overflow threshold', () => {
      expect(formatBadgeCount(1000, { overflowCount: 999 })).toBe('999+');
      expect(formatBadgeCount(999, { overflowCount: 999 })).toBe('999');
    });

    it('applies overflow before compaction', () => {
      expect(formatBadgeCount(4000, { overflowCount: 99, autoFormat: true })).toBe('99+');
    });

    it('never overflows ratio parts', () => {
      expect(formatBadgeCount(500, { overflowCount: 99, isRatioPart: true })).toBe('500');
    });
  });

  describe('autoFormat clean values (compaction)', () => {
    it('compacts thousands', () => {
      expect(formatBadgeCount(4000, { autoFormat: true })).toBe('4K');
      expect(formatBadgeCount(4500, { autoFormat: true })).toBe('4.5K');
      expect(formatBadgeCount(50000, { autoFormat: true })).toBe('50K');
      expect(formatBadgeCount(1000, { autoFormat: true })).toBe('1K');
      expect(formatBadgeCount(100000, { autoFormat: true })).toBe('100K');
    });

    it('compacts millions', () => {
      expect(formatBadgeCount(1000000, { autoFormat: true })).toBe('1M');
      expect(formatBadgeCount(2500000, { autoFormat: true })).toBe('2.5M');
    });
  });

  describe('autoFormat non-clean values (grouping)', () => {
    it('groups thousands with separators', () => {
      expect(formatBadgeCount(4234, { autoFormat: true })).toBe('4,234');
      expect(formatBadgeCount(49999, { autoFormat: true })).toBe('49,999');
      expect(formatBadgeCount(1234, { autoFormat: true })).toBe('1,234');
      expect(formatBadgeCount(1234567, { autoFormat: true })).toBe('1,234,567');
    });

    it('leaves sub-thousand values untouched', () => {
      expect(formatBadgeCount(8, { autoFormat: true })).toBe('8');
      expect(formatBadgeCount(999, { autoFormat: true })).toBe('999');
    });
  });

  describe('localeAware (stub)', () => {
    it('does not change output yet (routes through default grouping)', () => {
      expect(formatBadgeCount(1234567, { autoFormat: true, localeAware: true })).toBe('1,234,567');
    });
  });
});
