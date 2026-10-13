import { getFirstFocusable } from './focusable';

export type ArvoInitialFocusTarget =
  | 'auto'
  | 'first'
  | 'body'
  | 'footer'
  | 'header'
  | 'custom'
  | 'none'
  | HTMLElement
  | (() => HTMLElement | null | undefined);

export interface OverlayInitialFocusRegions {
  root?: HTMLElement | null;
  stickyHeader?: HTMLElement | null;
  body?: HTMLElement | null;
  footer?: HTMLElement | null;
  header?: HTMLElement | null;
}

export interface ResolveInitialFocusOptions extends OverlayInitialFocusRegions {
  initialFocus?: ArvoInitialFocusTarget | null;
}

function resolveExplicitTarget(
  target: ArvoInitialFocusTarget | null | undefined,
): HTMLElement | null | undefined {
  if (!target) return undefined;
  if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) return target;
  if (typeof target === 'function') return target() ?? null;
  return undefined;
}

export function resolveOverlayInitialFocus(
  options: ResolveInitialFocusOptions,
): HTMLElement | null {
  const explicit = resolveExplicitTarget(options.initialFocus);
  if (explicit !== undefined) return explicit;

  switch (options.initialFocus) {
    case 'none':
      return null;
    case 'first':
      return options.root ? getFirstFocusable(options.root) : null;
    case 'body':
      return options.body ? getFirstFocusable(options.body) : null;
    case 'footer':
      return options.footer ? getFirstFocusable(options.footer) : null;
    case 'header':
      return options.header ? getFirstFocusable(options.header) : null;
    case 'custom':
      return (
        (options.stickyHeader ? getFirstFocusable(options.stickyHeader) : null) ??
        (options.body ? getFirstFocusable(options.body) : null) ??
        (options.footer ? getFirstFocusable(options.footer) : null) ??
        (options.header ? getFirstFocusable(options.header) : null) ??
        (options.root ? getFirstFocusable(options.root) : null)
      );
    case 'auto':
    default:
      return (
        (options.stickyHeader ? getFirstFocusable(options.stickyHeader) : null) ??
        (options.body ? getFirstFocusable(options.body) : null) ??
        (options.footer ? getFirstFocusable(options.footer) : null) ??
        (options.header ? getFirstFocusable(options.header) : null) ??
        (options.root ? getFirstFocusable(options.root) : null)
      );
  }
}
