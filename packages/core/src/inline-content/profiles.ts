import type { ContentProfile, InlineNode } from './types';

/** Node types allowed in the `basic-inline` profile. */
export const BASIC_INLINE_NODES: ReadonlyArray<InlineNode['type']> = [
  'text',
  'em',
  'strong',
  'link',
  'code',
  'kbd',
];

/** Node types allowed in the `extended-inline` profile. */
export const EXTENDED_INLINE_NODES: ReadonlyArray<InlineNode['type']> = [
  ...BASIC_INLINE_NODES,
  'abbr',
  'time',
  'sup',
  'sub',
  'br',
];

/** Returns the allow-list for a given profile. `text-only` allows none. */
export function getAllowedNodeTypes(
  profile: ContentProfile,
): ReadonlyArray<InlineNode['type']> {
  switch (profile) {
    case 'basic-inline':
      return BASIC_INLINE_NODES;
    case 'extended-inline':
      return EXTENDED_INLINE_NODES;
    case 'text-only':
    case 'slot':
    default:
      return [];
  }
}
