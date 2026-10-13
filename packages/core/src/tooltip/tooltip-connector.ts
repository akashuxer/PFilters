import { isTruncated } from '../dom';
import type {
  TooltipManager,
  TooltipConnectorOptions,
  TooltipConnector,
} from './types';

const _focusVisibleSupported = /* @__PURE__ */ (() => {
  try {
    return typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('selector(:focus-visible)');
  } catch {
    return false;
  }
})();

// ---------------------------------------------------------------------------
// Explicit-tooltip anchor registry
//
// Reference-counted `WeakMap` of anchors that currently host an
// `'explicit'` connector. A `'truncation'` connector consults this map on
// every show attempt and yields when an explicit owner exists on the same
// anchor or any ancestor -- this is how `ArvoButton`'s internal truncation
// tooltip steps aside for a consumer-wired `<ArvoTooltip>` wrapping the
// same button (or a card-level explicit tooltip around a truncated title).
//
// `WeakMap` keeps the entries garbage-collectable when an element is
// removed without an explicit `destroy()` call.
// ---------------------------------------------------------------------------
const _explicitAnchors: WeakMap<HTMLElement, number> = new WeakMap();

function markExplicit(anchor: HTMLElement): void {
  const prev = _explicitAnchors.get(anchor) ?? 0;
  _explicitAnchors.set(anchor, prev + 1);
}

function unmarkExplicit(anchor: HTMLElement): void {
  const prev = _explicitAnchors.get(anchor);
  if (prev === undefined) return;
  if (prev <= 1) {
    _explicitAnchors.delete(anchor);
  } else {
    _explicitAnchors.set(anchor, prev - 1);
  }
}

function hasExplicitInAncestors(anchor: HTMLElement): boolean {
  let node: HTMLElement | null = anchor;
  while (node) {
    if (_explicitAnchors.has(node)) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Wires DOM events (mouseenter, mouseleave, focusin, focusout) on a trigger
 * element to a TooltipManager. Handles truncation-aware suppression and
 * dynamic content evaluation.
 */
export function connectTooltip(
  manager: TooltipManager,
  options: TooltipConnectorOptions,
): TooltipConnector {
  let _opts = { ...options };

  function resolveKind(): 'explicit' | 'truncation' {
    return _opts.kind ?? 'explicit';
  }

  function resolveContent(): string {
    return typeof _opts.content === 'function' ? _opts.content() : _opts.content;
  }

  function shouldSuppress(): boolean {
    // A `'truncation'` connector yields whenever an explicit tooltip owns
    // the same anchor or any ancestor. Evaluated before the
    // content/measurement check so collision wins even when the label is
    // genuinely truncated.
    if (resolveKind() === 'truncation' && hasExplicitInAncestors(_opts.anchor)) {
      return true;
    }
    if (!_opts.autoOnTruncation) return false;
    const labelEl = _opts.labelElement ?? _opts.anchor;
    const content = resolveContent();
    const labelText = labelEl.textContent?.trim() ?? '';
    // Suppress when content matches label and label is not truncated
    return content === labelText && !isTruncated(labelEl);
  }

  function buildShowOptions(trigger: 'hover' | 'focus') {
    return {
      anchor: _opts.anchor,
      content: resolveContent(),
      placement: _opts.placement,
      shortcut: _opts.shortcut,
      trigger,
      suppressAria: resolveKind() === 'truncation',
    } as const;
  }

  function onMouseEnter(): void {
    if (shouldSuppress()) return;
    manager.show(buildShowOptions('hover'));
  }

  function onMouseLeave(): void {
    manager.hide();
  }

  function onFocusIn(e: FocusEvent): void {
    if (shouldSuppress()) return;
    if (_focusVisibleSupported) {
      const target = e.target as HTMLElement | null;
      try {
        const hasVisibleFocus =
          _opts.anchor.matches(':focus-visible') ||
          !!target?.matches(':focus-visible');
        if (!hasVisibleFocus) return;
      } catch {
        // :focus-visible threw unexpectedly; fall through and show
      }
    }
    manager.show(buildShowOptions('focus'));
  }

  function onFocusOut(): void {
    manager.hide(true);
  }

  function bind(): void {
    const el = _opts.anchor;
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    if (resolveKind() === 'explicit') {
      markExplicit(el);
    }
  }

  function unbind(): void {
    const el = _opts.anchor;
    el.removeEventListener('mouseenter', onMouseEnter);
    el.removeEventListener('mouseleave', onMouseLeave);
    el.removeEventListener('focusin', onFocusIn);
    el.removeEventListener('focusout', onFocusOut);
    if (resolveKind() === 'explicit') {
      unmarkExplicit(el);
    }
  }

  bind();

  return {
    update(newOpts: Partial<TooltipConnectorOptions>): void {
      const anchorChanged = !!newOpts.anchor && newOpts.anchor !== _opts.anchor;
      const kindChanged =
        newOpts.kind !== undefined && newOpts.kind !== _opts.kind;
      if (anchorChanged || kindChanged) {
        unbind();
        _opts = { ..._opts, ...newOpts };
        bind();
      } else {
        _opts = { ..._opts, ...newOpts };
      }
    },

    destroy(): void {
      unbind();
      manager.hide(true);
    },
  };
}
