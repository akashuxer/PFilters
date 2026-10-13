import { describe, it, expect, vi } from 'vitest';
import {
  runItemFilter,
  formatMatchCountMessage,
  validateHeaderAction,
} from '../panel-shell';
import { formatCharCount } from '../form-char-counter';

// ---------------------------------------------------------------------------
// formatMatchCountMessage
// ---------------------------------------------------------------------------

describe('formatMatchCountMessage', () => {
  it('uses default template', () => {
    expect(formatMatchCountMessage(3)).toBe('3 matching results');
  });

  it('uses custom template', () => {
    expect(formatMatchCountMessage(7, '{count} items found')).toBe('7 items found');
  });

  it('handles zero count', () => {
    expect(formatMatchCountMessage(0)).toBe('0 matching results');
  });
});

// ---------------------------------------------------------------------------
// validateHeaderAction
// ---------------------------------------------------------------------------

describe('validateHeaderAction', () => {
  it.each(['btn', 'dropdown', 'split', 'switch', 'checkbox'] as const)(
    'accepts valid type "%s"',
    (type) => {
      expect(validateHeaderAction({ type, id: 'a' })).toBe(true);
    },
  );

  it('rejects unknown type and warns in dev', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(validateHeaderAction({ type: 'invalid', id: 'x' })).toBe(false);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// runItemFilter
// ---------------------------------------------------------------------------

describe('runItemFilter', () => {
  const items = [
    { id: '1', label: 'Apple' },
    { id: '2', label: 'Banana' },
    { id: '3', label: 'Apricot' },
  ];

  it('returns all items when query is empty', () => {
    expect(runItemFilter(items, '')).toBe(items);
  });

  it('filters by label (default key)', () => {
    const result = runItemFilter(items, 'ap');
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('uses custom getItemSearchText', () => {
    const result = runItemFilter(items, 'nana', {
      getItemSearchText: (item) => item.label,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty array when nothing matches', () => {
    expect(runItemFilter(items, 'xyz')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// formatCharCount
// ---------------------------------------------------------------------------

describe('formatCharCount', () => {
  it('formats with zero-padded current value', () => {
    expect(formatCharCount(5, 100)).toBe('005/100');
  });

  it('does not pad when current has same digits as max', () => {
    expect(formatCharCount(12, 50)).toBe('12/50');
  });

  it('handles four-digit max', () => {
    expect(formatCharCount(0, 1000)).toBe('0000/1000');
  });

  it('returns plain number when maxLength is null', () => {
    expect(formatCharCount(7, null)).toBe('7');
  });
});
