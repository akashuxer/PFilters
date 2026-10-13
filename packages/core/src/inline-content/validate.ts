import type {
  InlineContent,
  InlineNode,
  InlineValidationMode,
  InlineValidationOptions,
  LinkNode,
  NormalizedLink,
} from './types';
import { getAllowedNodeTypes } from './profiles';

// ---------------------------------------------------------------------------
// Link sanitization
// ---------------------------------------------------------------------------

/** Protocols that may appear in an `<a href>` produced by inline content. */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'] as const;

/** Protocols that must always be rejected. */
const FORBIDDEN_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'] as const;

const RELATIVE_PREFIXES = ['/', './', '../', '#'] as const;

function looksRelative(href: string): boolean {
  return RELATIVE_PREFIXES.some(p => href.startsWith(p));
}

function hasForbiddenProtocol(href: string): boolean {
  const lower = href.trim().toLowerCase();
  return FORBIDDEN_PROTOCOLS.some(p => lower.startsWith(p));
}

function hasAllowedProtocol(href: string): boolean {
  const lower = href.trim().toLowerCase();
  return ALLOWED_PROTOCOLS.some(p => lower.startsWith(p));
}

/**
 * Validates a `LinkNode` and returns a normalized link. Returns `null` when
 * the href is unsafe; callers decide whether to throw or strip.
 *
 * Rules:
 * - Allows `http:`, `https:`, `mailto:`, `tel:`, and relative URLs that start
 *   with `/`, `./`, `../`, or `#`.
 * - Rejects `javascript:`, `data:`, `vbscript:`, `file:`.
 * - When `target === '_blank'`, forces `rel` to include `noopener noreferrer`.
 * - Requires a non-empty `label`.
 */
export function sanitizeLink(node: LinkNode): NormalizedLink | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.href !== 'string' || node.href.length === 0) return null;
  if (typeof node.label !== 'string' || node.label.length === 0) return null;

  const href = node.href.trim();
  if (hasForbiddenProtocol(href)) return null;
  if (!hasAllowedProtocol(href) && !looksRelative(href)) return null;

  const target: '_self' | '_blank' = node.target === '_blank' ? '_blank' : '_self';

  let rel: string | undefined = node.rel;
  if (target === '_blank') {
    const tokens = new Set(
      (rel ?? '').split(/\s+/).map(t => t.trim()).filter(Boolean),
    );
    tokens.add('noopener');
    tokens.add('noreferrer');
    rel = Array.from(tokens).join(' ');
  }

  return {
    href,
    target,
    rel,
    ariaLabel: node.ariaLabel,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const _warned = new Set<string>();

function warnOnce(message: string): void {
  if (_warned.has(message)) return;
  _warned.add(message);
  if (
    typeof console !== 'undefined' &&
    typeof console.warn === 'function'
  ) {
    console.warn(`[arvo/inline-content] ${message}`);
  }
}

/** For tests: clears the warn-once cache. */
export function _resetInlineWarnCache(): void {
  _warned.clear();
}

function defaultMode(): InlineValidationMode {
  // Hard error in dev/test, soft strip+warn in production.
  // Some bundlers replace process.env.NODE_ENV at build time; guard access.
  try {
    if (
      typeof process !== 'undefined' &&
      process &&
      typeof process.env !== 'undefined'
    ) {
      const env = process.env.NODE_ENV;
      if (env === 'production') return 'strip';
    }
  } catch {
    /* ignore */
  }
  return 'throw';
}

class InlineContentError extends Error {
  constructor(message: string) {
    super(`[arvo/inline-content] ${message}`);
    this.name = 'InlineContentError';
  }
}

function emit(
  message: string,
  mode: InlineValidationMode,
): 'throw' | 'strip' | 'warn' {
  if (mode === 'throw') {
    throw new InlineContentError(message);
  }
  if (mode === 'warn') {
    warnOnce(message);
    return 'warn';
  }
  warnOnce(message);
  return 'strip';
}

/**
 * Validates an `InlineContent` value against a profile. In `throw` mode the
 * function throws on the first violation. In `warn` and `strip` modes it
 * returns a sanitized array (invalid nodes removed in `strip`, kept in
 * `warn`). Strings are always valid.
 *
 * Security-sensitive failures (unsafe href, raw HTML strings, unknown node
 * shapes) always throw or strip. They are never just warned because the
 * resulting render could be incorrect.
 */
export function validateInlineContent(
  content: InlineContent,
  options: InlineValidationOptions,
): InlineContent {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) {
    emit(
      `Expected string or InlineNode[]; received ${typeof content}.`,
      options.mode ?? defaultMode(),
    );
    return [];
  }

  const mode = options.mode ?? defaultMode();
  const allowed = new Set(getAllowedNodeTypes(options.profile));

  const out: InlineNode[] = [];

  for (const node of content) {
    if (node == null || typeof node !== 'object' || Array.isArray(node)) {
      emit(
        `Inline node must be an object; received ${node === null ? 'null' : typeof node}.`,
        mode,
      );
      continue;
    }

    const nodeType = (node as { type?: unknown }).type;
    if (typeof nodeType !== 'string') {
      emit('Inline node is missing a string `type` discriminator.', mode);
      continue;
    }

    if (!allowed.has(nodeType as InlineNode['type'])) {
      emit(
        `Inline node type "${nodeType}" is not allowed in profile "${options.profile}".`,
        mode,
      );
      if (mode === 'strip') continue;
    }

    const validated = validateSingleNode(node as InlineNode, options);
    if (validated) out.push(validated);
  }

  return out;
}

function validateSingleNode(
  node: InlineNode,
  options: InlineValidationOptions,
): InlineNode | null {
  const mode = options.mode ?? defaultMode();

  switch (node.type) {
    case 'text': {
      if (typeof node.value !== 'string') {
        emit('TextNode `value` must be a string.', mode);
        return mode === 'strip' ? null : node;
      }
      return { type: 'text', value: node.value };
    }
    case 'em':
    case 'strong': {
      const children = validateInlineContent(node.children, options);
      return { ...node, children };
    }
    case 'link': {
      const link = sanitizeLink(node);
      if (!link) {
        emit(
          `Unsafe or invalid link href: "${String(node.href)}".`,
          mode,
        );
        if (mode === 'strip') return null;
        return node;
      }
      return {
        type: 'link',
        label: node.label,
        href: link.href,
        target: link.target,
        rel: link.rel,
        ariaLabel: link.ariaLabel,
      };
    }
    case 'code':
    case 'kbd': {
      if (typeof node.value !== 'string') {
        emit(`${node.type} value must be a string.`, mode);
        return mode === 'strip' ? null : node;
      }
      return node;
    }
    case 'abbr': {
      if (typeof node.value !== 'string' || typeof node.title !== 'string') {
        emit('AbbrNode requires string `value` and `title`.', mode);
        return mode === 'strip' ? null : node;
      }
      return node;
    }
    case 'time': {
      if (typeof node.value !== 'string' || typeof node.dateTime !== 'string') {
        emit('TimeNode requires string `value` and `dateTime`.', mode);
        return mode === 'strip' ? null : node;
      }
      return node;
    }
    case 'sup':
    case 'sub': {
      if (typeof node.value !== 'string') {
        emit(`${node.type} value must be a string.`, mode);
        return mode === 'strip' ? null : node;
      }
      return node;
    }
    case 'br': {
      return { type: 'br' };
    }
    default: {
      const exhaustive: never = node;
      emit(
        `Unknown inline node: ${JSON.stringify(exhaustive)}.`,
        mode,
      );
      return null;
    }
  }
}
