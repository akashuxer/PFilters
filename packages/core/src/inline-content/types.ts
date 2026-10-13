// ---------------------------------------------------------------------------
// Inline rich-text content - shared AST shared by feedback components
//
// Components that consume an `InlineContent` value: Toast, Banner Alert,
// Alert Dialog, Message Alert.
//
// The contract is intentionally framework-agnostic: a component receives
// either a plain string or a sequence of `InlineNode` objects. A renderer
// adapter (DOM for vanilla JS, React for React) walks the AST and produces
// the right output. Raw HTML strings, event handlers, arbitrary attributes,
// and block-level markup are NOT representable in this contract; that's the
// security and consistency guarantee.
// ---------------------------------------------------------------------------

/** A plain text run. */
export interface TextNode {
  type: 'text';
  value: string;
}

/** Italicized run (rendered as `<em>`). */
export interface EmNode {
  type: 'em';
  children: InlineContent;
}

/** Bold/emphasis run (rendered as `<strong>`). */
export interface StrongNode {
  type: 'strong';
  children: InlineContent;
}

/** Anchor run. Sanitized via `sanitizeLink`. */
export interface LinkNode {
  type: 'link';
  label: string;
  href: string;
  target?: '_self' | '_blank';
  rel?: string;
  ariaLabel?: string;
}

/** Inline code run (rendered as `<code>`). */
export interface CodeNode {
  type: 'code';
  value: string;
}

/** Keyboard input run (rendered as `<kbd>`, e.g. shortcut hints). */
export interface KbdNode {
  type: 'kbd';
  value: string;
}

/** Abbreviation run (rendered as `<abbr title=...>`). Extended profile only. */
export interface AbbrNode {
  type: 'abbr';
  value: string;
  title: string;
}

/** Machine-readable time run (rendered as `<time datetime=...>`). Extended profile only. */
export interface TimeNode {
  type: 'time';
  value: string;
  dateTime: string;
}

/** Superscript run. Extended profile only. */
export interface SupNode {
  type: 'sup';
  value: string;
}

/** Subscript run. Extended profile only. */
export interface SubNode {
  type: 'sub';
  value: string;
}

/** Soft line break (rendered as `<br />`). Extended profile only. */
export interface BreakNode {
  type: 'br';
}

/** Discriminated union of every supported inline node. */
export type InlineNode =
  | TextNode
  | EmNode
  | StrongNode
  | LinkNode
  | CodeNode
  | KbdNode
  | AbbrNode
  | TimeNode
  | SupNode
  | SubNode
  | BreakNode;

/**
 * The shared rich-text type. A consumer always accepts either a plain string
 * (which is treated as a single `TextNode`) or a sequence of nodes. Profiles
 * narrow which node types are permitted.
 */
export type InlineContent = string | InlineNode[];

/** Subset of nodes allowed inside the basic profile (most component messages). */
export type BasicInlineNode =
  | TextNode
  | EmNode
  | StrongNode
  | LinkNode
  | CodeNode
  | KbdNode;

/** Basic profile: plain string OR nodes from the basic allow-list. */
export type BasicInlineContent = string | BasicInlineNode[];

/** Extended profile: plain string OR any inline node. */
export type ExtendedInlineContent = InlineContent;

/**
 * Profile labels accepted by the validator. `slot` is reserved for callers
 * that want to opt out of validation entirely (e.g. component bodies that
 * render arbitrary React/DOM via children/slots), but components must NOT
 * use `slot` for `message`-like config props.
 */
export type ContentProfile = 'text-only' | 'basic-inline' | 'extended-inline' | 'slot';

/**
 * Output of `sanitizeLink`. `href` is guaranteed to use a permitted protocol
 * or relative form, and `rel` is guaranteed to include `noopener noreferrer`
 * when `target === '_blank'`.
 */
export interface NormalizedLink {
  href: string;
  target: '_self' | '_blank';
  rel?: string;
  ariaLabel?: string;
}

/**
 * Validation behavior. In `throw` mode the validator throws on the first
 * invalid input. In `warn` mode it warns once and lets the offending node
 * fall through (useful in production when stripping is unsafe). In `strip`
 * mode it removes invalid nodes from the output and keeps the rest.
 */
export type InlineValidationMode = 'throw' | 'warn' | 'strip';

export interface InlineValidationOptions {
  profile: ContentProfile;
  mode?: InlineValidationMode;
}
