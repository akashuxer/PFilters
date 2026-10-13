import type { InlineContent } from './types';
import type { InlineContentAdapter, RenderInlineContentOptions } from './adapter';
import { renderInlineContent } from './adapter';

// ---------------------------------------------------------------------------
// DOM adapter
//
// Emits real DOM nodes. NEVER uses `innerHTML`. All content is built via
// `document.createElement` / `document.createTextNode`. Attributes and text
// are set through their dedicated APIs so user-supplied strings cannot be
// interpreted as HTML.
//
// The adapter returns a `DocumentFragment` from `fragment` so callers can
// append the result directly. Element classes follow the shared BEM scheme
// `.arvo-inline__*` defined in `@arvo/styles/mixins/_inline-content.scss`.
// ---------------------------------------------------------------------------

type DomNode = Node;

function appendAll(parent: ParentNode, nodes: DomNode[]): void {
  for (const child of nodes) parent.appendChild(child);
}

export const domInlineAdapter: InlineContentAdapter<DomNode> = {
  fragment(children): DomNode {
    const frag = document.createDocumentFragment();
    appendAll(frag, children);
    return frag;
  },

  text(value): DomNode {
    return document.createTextNode(value);
  },

  em(children): DomNode {
    const el = document.createElement('em');
    el.className = 'arvo-inline__em';
    appendAll(el, children);
    return el;
  },

  strong(children): DomNode {
    const el = document.createElement('strong');
    el.className = 'arvo-inline__strong';
    appendAll(el, children);
    return el;
  },

  link(props, label): DomNode {
    const a = document.createElement('a');
    a.className = 'arvo-inline__link';
    a.setAttribute('href', props.href);
    a.setAttribute('target', props.target);
    if (props.rel) a.setAttribute('rel', props.rel);
    if (props.ariaLabel) a.setAttribute('aria-label', props.ariaLabel);
    a.textContent = label;
    return a;
  },

  code(value): DomNode {
    const el = document.createElement('code');
    el.className = 'arvo-inline__code';
    el.textContent = value;
    return el;
  },

  kbd(value): DomNode {
    const el = document.createElement('kbd');
    el.className = 'arvo-inline__kbd';
    el.textContent = value;
    return el;
  },

  abbr(value, title): DomNode {
    const el = document.createElement('abbr');
    el.className = 'arvo-inline__abbr';
    el.setAttribute('title', title);
    el.textContent = value;
    return el;
  },

  time(value, dateTime): DomNode {
    const el = document.createElement('time');
    el.className = 'arvo-inline__time';
    el.setAttribute('datetime', dateTime);
    el.textContent = value;
    return el;
  },

  sup(value): DomNode {
    const el = document.createElement('sup');
    el.className = 'arvo-inline__sup';
    el.textContent = value;
    return el;
  },

  sub(value): DomNode {
    const el = document.createElement('sub');
    el.className = 'arvo-inline__sub';
    el.textContent = value;
    return el;
  },

  br(): DomNode {
    return document.createElement('br');
  },
};

/**
 * Renders an `InlineContent` value into a real `DocumentFragment`. Use this
 * from any vanilla-JS component that accepts an `InlineContent`-shaped prop.
 */
export function renderInlineContentToDOM(
  content: InlineContent,
  options?: RenderInlineContentOptions,
): DocumentFragment {
  return renderInlineContent(content, domInlineAdapter, options) as DocumentFragment;
}

/**
 * Replaces an element's children with the rendered inline content. Used by
 * components that re-render their message slot via setter methods.
 */
export function replaceInlineContentInElement(
  el: Element,
  content: InlineContent,
  options?: RenderInlineContentOptions,
): void {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(renderInlineContentToDOM(content, options));
}
