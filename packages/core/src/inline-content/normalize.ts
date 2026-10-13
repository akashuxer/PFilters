import type {
  ContentProfile,
  InlineContent,
  InlineNode,
  TextNode,
} from './types';
import { validateInlineContent } from './validate';

/**
 * Returns an `InlineNode[]` for any `InlineContent` value. Strings become
 * a single `TextNode`. Validation runs first; in `strip` mode invalid nodes
 * are removed.
 */
export function normalizeInlineContent(
  content: InlineContent,
  profile: ContentProfile = 'basic-inline',
  mode?: 'throw' | 'warn' | 'strip',
): InlineNode[] {
  const validated = validateInlineContent(content, { profile, mode });

  if (typeof validated === 'string') {
    if (validated.length === 0) return [];
    const textNode: TextNode = { type: 'text', value: validated };
    return [textNode];
  }

  return validated;
}

export { sanitizeLink, validateInlineContent } from './validate';
