import { describe, it, expect } from 'vitest';
import { normalizeQuery, filterItems, filterGroups } from '../filter';
import type { ListItemBase, ListGroup } from '../types';

const items: ListItemBase[] = [
  { id: '1', label: 'Cut' },
  { id: '2', label: 'Copy' },
  { id: '3', label: 'Paste' },
  { id: '4', label: 'Select All', secondaryLabel: 'Ctrl+A' },
  { id: '5', label: 'Caf\u00e9', secondaryLabel: 'Coffee shop' },
  { id: '6', label: 'Delete', isDisabled: true },
];

// -------------------------------------------------------------------------
// normalizeQuery
// -------------------------------------------------------------------------

describe('normalizeQuery', () => {
  it('lowercases by default', () => {
    expect(normalizeQuery('Hello')).toBe('hello');
  });

  it('preserves case when caseSensitive is true', () => {
    expect(normalizeQuery('Hello', { caseSensitive: true })).toBe('Hello');
  });

  it('strips accents by default', () => {
    expect(normalizeQuery('Caf\u00e9')).toBe('cafe');
  });

  it('preserves accents when accentSensitive is true', () => {
    const result = normalizeQuery('Caf\u00e9', { accentSensitive: true });
    expect(result).toBe('caf\u00e9');
  });
});

// -------------------------------------------------------------------------
// filterItems
// -------------------------------------------------------------------------

describe('filterItems', () => {
  it('returns all items when query is empty', () => {
    const result = filterItems(items, { query: '' });
    expect(result).toBe(items);
  });

  it('filters by label substring (case-insensitive)', () => {
    const result = filterItems(items, { query: 'co' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('matches case-insensitively by default', () => {
    const result = filterItems(items, { query: 'SELECT' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('respects caseSensitive option', () => {
    const result = filterItems(items, { query: 'select', caseSensitive: true });
    expect(result).toHaveLength(0);
  });

  it('folds accents by default (cafe matches Cafe)', () => {
    const result = filterItems(items, { query: 'cafe' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5');
  });

  it('supports multi-key search (label + secondaryLabel)', () => {
    const result = filterItems(items, {
      query: 'ctrl',
      keys: ['label', 'secondaryLabel'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('skips undefined secondaryLabel without error', () => {
    const result = filterItems(items, {
      query: 'cut',
      keys: ['label', 'secondaryLabel'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('includes disabled items in results', () => {
    const result = filterItems(items, { query: 'delete' });
    expect(result).toHaveLength(1);
    expect(result[0].isDisabled).toBe(true);
  });

  it('preserves extended type information', () => {
    interface MenuItem extends ListItemBase {
      shortcut?: string;
    }
    const menuItems: MenuItem[] = [
      { id: '1', label: 'Undo', shortcut: 'Ctrl+Z' },
      { id: '2', label: 'Redo', shortcut: 'Ctrl+Y' },
    ];
    const result = filterItems(menuItems, { query: 'undo' });
    expect(result).toHaveLength(1);
    expect(result[0].shortcut).toBe('Ctrl+Z');
  });
});

// -------------------------------------------------------------------------
// filterGroups
// -------------------------------------------------------------------------

describe('filterGroups', () => {
  const groups: ListGroup[] = [
    {
      id: 'g1',
      label: 'Edit',
      items: [
        { id: '1', label: 'Cut' },
        { id: '2', label: 'Copy' },
        { id: '3', label: 'Paste' },
      ],
    },
    {
      id: 'g2',
      label: 'View',
      items: [
        { id: '4', label: 'Zoom In' },
        { id: '5', label: 'Zoom Out' },
      ],
    },
    {
      id: 'g3',
      items: [
        { id: '6', label: 'Settings' },
      ],
    },
  ];

  it('returns all groups when query is empty', () => {
    const result = filterGroups(groups, { query: '' });
    expect(result).toBe(groups);
  });

  it('excludes groups with zero matching items', () => {
    const result = filterGroups(groups, { query: 'zoom' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g2');
    expect(result[0].items).toHaveLength(2);
  });

  it('filters items within each group independently', () => {
    const result = filterGroups(groups, { query: 'c' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
    expect(result[0].items.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('handles groups without a label (label is optional)', () => {
    const result = filterGroups(groups, { query: 'settings' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g3');
    expect(result[0].label).toBeUndefined();
    expect(result[0].items).toHaveLength(1);
  });

  it('does not search group label text', () => {
    const result = filterGroups(groups, { query: 'edit' });
    expect(result).toHaveLength(0);
  });

  it('includes disabled items in group filter results', () => {
    const groupsWithDisabled: ListGroup[] = [
      {
        id: 'g1',
        label: 'Actions',
        items: [
          { id: '1', label: 'Delete', isDisabled: true },
          { id: '2', label: 'Archive' },
        ],
      },
    ];
    const result = filterGroups(groupsWithDisabled, { query: 'delete' });
    expect(result).toHaveLength(1);
    expect(result[0].items[0].isDisabled).toBe(true);
  });
});
