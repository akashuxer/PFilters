import type {
  ContentProfile,
  InlineContent,
  InlineNode,
  NormalizedLink,
} from './types';
import { normalizeInlineContent } from './normalize';

/**
 * Renderer abstraction for inline content. Implemented once per platform:
 * a DOM adapter for vanilla JS, and a React adapter that emits `ReactNode`s.
 *
 * Each method receives already-validated inputs. For node-shaped types
 * (em, strong) the children are pre-rendered.
 */
export interface InlineContentAdapter<TNode> {
  fragment(children: TNode[]): TNode;
  text(value: string): TNode;
  em(children: TNode[]): TNode;
  strong(children: TNode[]): TNode;
  link(props: NormalizedLink, label: string): TNode;
  code(value: string): TNode;
  kbd(value: string): TNode;
  abbr(value: string, title: string): TNode;
  time(value: string, dateTime: string): TNode;
  sup(value: string): TNode;
  sub(value: string): TNode;
  br(): TNode;
}

export interface RenderInlineContentOptions {
  profile?: ContentProfile;
  mode?: 'throw' | 'warn' | 'strip';
}

/**
 * Walks an `InlineContent` and produces a single platform node by delegating
 * to the supplied adapter. The output is wrapped in `adapter.fragment` so
 * callers always receive a single node (or fragment-equivalent).
 */
export function renderInlineContent<TNode>(
  content: InlineContent,
  adapter: InlineContentAdapter<TNode>,
  options: RenderInlineContentOptions = {},
): TNode {
  const profile = options.profile ?? 'basic-inline';
  const nodes = normalizeInlineContent(content, profile, options.mode);
  return adapter.fragment(nodes.map(n => renderNode(n, adapter)));
}

function renderNode<TNode>(
  node: InlineNode,
  adapter: InlineContentAdapter<TNode>,
): TNode {
  switch (node.type) {
    case 'text':
      return adapter.text(node.value);
    case 'em':
      return adapter.em(renderChildren(node.children, adapter));
    case 'strong':
      return adapter.strong(renderChildren(node.children, adapter));
    case 'link': {
      const link: NormalizedLink = {
        href: node.href,
        target: node.target ?? '_self',
        rel: node.rel,
        ariaLabel: node.ariaLabel,
      };
      return adapter.link(link, node.label);
    }
    case 'code':
      return adapter.code(node.value);
    case 'kbd':
      return adapter.kbd(node.value);
    case 'abbr':
      return adapter.abbr(node.value, node.title);
    case 'time':
      return adapter.time(node.value, node.dateTime);
    case 'sup':
      return adapter.sup(node.value);
    case 'sub':
      return adapter.sub(node.value);
    case 'br':
      return adapter.br();
  }
}

function renderChildren<TNode>(
  children: InlineContent,
  adapter: InlineContentAdapter<TNode>,
): TNode[] {
  if (typeof children === 'string') {
    return children.length > 0 ? [adapter.text(children)] : [];
  }
  return children.map(c => renderNode(c, adapter));
}
