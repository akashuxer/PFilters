import type { ListItemBase, ListGroup, ListFilterOptions } from './types';

const ACCENT_RE = /[\u0300-\u036f]/g;

/** Normalize a search query: optionally lowercase and strip diacritics. */
export function normalizeQuery(
  query: string,
  options?: { caseSensitive?: boolean; accentSensitive?: boolean },
): string {
  let result = query;
  if (!options?.caseSensitive) result = result.toLowerCase();
  if (!options?.accentSensitive) result = result.normalize('NFD').replace(ACCENT_RE, '');
  return result;
}

/** Filter a flat list of items by substring match on configured keys. */
export function filterItems<T extends ListItemBase>(
  items: T[],
  options: ListFilterOptions,
): T[] {
  const { query, keys = ['label'], caseSensitive, accentSensitive } = options;
  if (!query) return items;

  const normalizedQuery = normalizeQuery(query, { caseSensitive, accentSensitive });

  return items.filter((item) =>
    keys.some((key) => {
      const value = item[key];
      if (value == null) return false;
      return normalizeQuery(value, { caseSensitive, accentSensitive }).includes(normalizedQuery);
    }),
  );
}

/**
 * Filter grouped items. Each group's items are filtered independently.
 * Groups with zero matching items are excluded from the result.
 * Group `label` is structural and is not searched.
 */
export function filterGroups<T extends ListItemBase>(
  groups: ListGroup<T>[],
  options: ListFilterOptions,
): ListGroup<T>[] {
  if (!options.query) return groups;

  const result: ListGroup<T>[] = [];

  for (const group of groups) {
    const filtered = filterItems(group.items, options);
    if (filtered.length > 0) {
      result.push({ ...group, items: filtered });
    }
  }

  return result;
}
