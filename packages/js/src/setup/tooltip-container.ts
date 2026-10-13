import {
  isTruncated,
  tooltipManager as defaultManager,
  type TooltipManager,
  type TooltipPlacement,
} from '@arvo/core';

// ---------------------------------------------------------------------------
// ArvoTooltipContainer
//
// Delegated tooltip adapter. Attaches ONE set of listeners to a container
// element and drives the shared singleton `tooltipManager` on behalf of any
// descendant matching one of the configured entry `filter` selectors. Each
// entry can carry its own `placement`, `truncated` gate, and `textSelector`
// so a single container instance can host many kinds of tooltips
// (translated button labels, dynamic counter text, truncation-only cell
// labels) the way Kendo Tooltip's per-selector config allows.
//
// Designed as a jQuery-first escape hatch for codebases migrating from
// Kendo Tooltip. It is INTENTIONALLY not descriptor-driven and has no
// React counterpart. React consumers already delegate via JSX composition;
// a container-mode API would not mean anything on that side. See
// `descriptors/tooltip.json` (unchanged) -- the tooltip public API remains
// `content`, `placement`, `shortcut` and is mirrored 1:1 in React / JS
// class / `$.fn.arvoTooltip`. This class extends nothing in that contract.
//
// Under the hood it reuses the same singleton tooltip DOM element and
// overlay-hub registration as `ArvoTooltip` -- so ~1000 delegated triggers
// still cost O(1) DOM nodes and O(1) document-level listeners; only the
// per-container event pair (`mouseover`/`mouseout` + `focusin`/`focusout`)
// is added.
// ---------------------------------------------------------------------------

// Compute :focus-visible support once, module-scoped, matching the pattern
// used in `packages/core/src/tooltip/tooltip-connector.ts` so container and
// per-anchor connectors agree on focus semantics.
const _focusVisibleSupported = /* @__PURE__ */ (() => {
  try {
    return (
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('selector(:focus-visible)')
    );
  } catch {
    return false;
  }
})();

/**
 * Resolver for the visible tooltip content. A string is applied to every
 * matched anchor; a callback receives the specific anchor and can look up
 * per-row / per-cell text. Return `null` / `undefined` / `''` to suppress
 * the tooltip for that anchor (useful when the anchor has no descriptive
 * text and the caller doesn't want the default suppression logic).
 */
export type ArvoTooltipContainerContent =
  | string
  | ((anchor: HTMLElement) => string | null | undefined);

/**
 * Resolver for the optional keyboard-shortcut hint. Same semantics as
 * {@link ArvoTooltipContainerContent}.
 */
export type ArvoTooltipContainerShortcut =
  | string
  | ((anchor: HTMLElement) => string | null | undefined);

/**
 * One rule inside an {@link ArvoTooltipContainerOptions.entries} array. The
 * first entry whose `filter` matches (an ancestor of) the event target
 * wins.
 */
export interface ArvoTooltipContainerEntry {
  /**
   * CSS selector matched against descendants of the container. `closest()`
   * is used, so hovering / focusing a child of a matching ancestor
   * triggers the entry.
   */
  filter: string;
  /** Static string or per-anchor resolver. */
  content: ArvoTooltipContainerContent;
  /**
   * Preferred placement for this entry. Falls back to the container-level
   * `placement`, then the manager's `defaultPlacement`.
   */
  placement?: TooltipPlacement;
  /** Static string or per-anchor resolver for the optional shortcut hint. */
  shortcut?: ArvoTooltipContainerShortcut;
  /**
   * If `true`, the tooltip is suppressed unless the anchor's text is
   * visually truncated (i.e. `scrollWidth > clientWidth`). Use for
   * truncation-only affordances such as grid cells that only need a
   * tooltip when their text is clipped.
   */
  truncated?: boolean;
  /**
   * CSS selector run relative to the matched anchor to find the element
   * whose overflow is checked. Only used when `truncated` is `true`.
   * Defaults to the anchor itself. If provided and no descendant matches,
   * the tooltip is suppressed (mirroring the Kendo `textSelector`
   * behavior).
   */
  textSelector?: string;
}

export interface ArvoTooltipContainerOptions {
  /**
   * One or more rules that determine which descendants show a tooltip
   * and how. Rules are evaluated in the array order supplied; the FIRST
   * matching rule wins (same semantics as Kendo's `getConfigForTooltip`
   * iteration order). Must contain at least one entry.
   */
  entries: ArvoTooltipContainerEntry[];
  /**
   * Fallback placement applied when an entry doesn't specify its own.
   * If neither is set, the manager's `defaultPlacement` is used.
   */
  placement?: TooltipPlacement;
}

function resolveContent(
  anchor: HTMLElement,
  source: ArvoTooltipContainerContent,
): string | null {
  const value = typeof source === 'function' ? source(anchor) : source;
  if (value == null || value === '') return null;
  return value;
}

function resolveShortcut(
  anchor: HTMLElement,
  source: ArvoTooltipContainerShortcut | undefined,
): string | undefined {
  if (source == null) return undefined;
  const value = typeof source === 'function' ? source(anchor) : source;
  return value == null || value === '' ? undefined : value;
}

/**
 * Container-level tooltip adapter. Prefer per-element `ArvoTooltip` for
 * new code; use this class when a legacy codebase (Kendo etc.) already
 * expresses tooltip ownership at the container level and rewriting every
 * call site to per-element init is not practical.
 *
 * ```ts
 * const owner = ArvoTooltipContainer.initialize(
 *   document.querySelector('#grid')!,
 *   {
 *     entries: [
 *       {
 *         filter: '.grid-cell',
 *         truncated: true,
 *         content: (cell) => cell.textContent ?? '',
 *       },
 *       {
 *         filter: '.grid-action-btn',
 *         placement: 'top-center',
 *         content: (btn) => btn.getAttribute('aria-label') ?? '',
 *       },
 *     ],
 *   },
 * );
 * ```
 */
export class ArvoTooltipContainer {
  private _container: HTMLElement;
  private _opts: ArvoTooltipContainerOptions;
  private _manager: TooltipManager;

  /** Anchor the tooltip is currently associated with (our bookkeeping). */
  private _currentAnchor: HTMLElement | null = null;

  private _onMouseOver: (e: MouseEvent) => void;
  private _onMouseOut: (e: MouseEvent) => void;
  private _onFocusIn: (e: FocusEvent) => void;
  private _onFocusOut: (e: FocusEvent) => void;

  constructor(
    container: HTMLElement,
    options: ArvoTooltipContainerOptions,
    manager: TooltipManager = defaultManager,
  ) {
    this._container = container;
    this._opts = { ...options, entries: [...options.entries] };
    this._manager = manager;

    this._onMouseOver = (e) => this._handleMouseOver(e);
    this._onMouseOut = (e) => this._handleMouseOut(e);
    this._onFocusIn = (e) => this._handleFocusIn(e);
    this._onFocusOut = (e) => this._handleFocusOut(e);

    this._bind();
  }

  static initialize(
    container: HTMLElement,
    options: ArvoTooltipContainerOptions,
    manager?: TooltipManager,
  ): ArvoTooltipContainer {
    return new ArvoTooltipContainer(container, options, manager ?? defaultManager);
  }

  /**
   * Merge new options into the container. `entries` may be swapped;
   * no listener rebind is required since delegation is scoped to the
   * container element itself.
   */
  update(patch: Partial<ArvoTooltipContainerOptions>): void {
    this._opts = {
      ...this._opts,
      ...patch,
      entries: patch.entries ? [...patch.entries] : this._opts.entries,
    };
  }

  /**
   * Remove all listeners and hide the tooltip if it is currently
   * associated with this container's anchor. The shared tooltip DOM
   * element and singleton manager stay alive for other consumers.
   */
  destroy(): void {
    this._unbind();
    if (this._currentAnchor) {
      this._manager.hide(true);
      this._currentAnchor = null;
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private _bind(): void {
    // mouseenter/mouseleave don't bubble, so delegation uses
    // mouseover/mouseout + relatedTarget filtering to distinguish
    // "moving over descendants of the same anchor" from "leaving the
    // anchor entirely".
    this._container.addEventListener('mouseover', this._onMouseOver);
    this._container.addEventListener('mouseout', this._onMouseOut);
    this._container.addEventListener('focusin', this._onFocusIn);
    this._container.addEventListener('focusout', this._onFocusOut);
  }

  private _unbind(): void {
    this._container.removeEventListener('mouseover', this._onMouseOver);
    this._container.removeEventListener('mouseout', this._onMouseOut);
    this._container.removeEventListener('focusin', this._onFocusIn);
    this._container.removeEventListener('focusout', this._onFocusOut);
  }

  /**
   * Resolve the first entry whose `filter` selector matches an ancestor
   * of `target` inside this container. First-wins mirrors Kendo's
   * `getConfigForTooltip` iteration order and is documented as the
   * public semantic contract.
   */
  private _resolveEntry(
    target: EventTarget | null,
  ): { entry: ArvoTooltipContainerEntry; anchor: HTMLElement } | null {
    if (!(target instanceof Element)) return null;
    for (const entry of this._opts.entries) {
      const anchor = target.closest<HTMLElement>(entry.filter);
      if (anchor && this._container.contains(anchor)) {
        return { entry, anchor };
      }
    }
    return null;
  }

  /**
   * Truncation gate. Returns true when the entry opts into truncation
   * but the resolved text element isn't actually clipped -- caller
   * should skip the show.
   */
  private _isTruncationSuppressed(
    entry: ArvoTooltipContainerEntry,
    anchor: HTMLElement,
  ): boolean {
    if (!entry.truncated) return false;
    const textEl = entry.textSelector
      ? anchor.querySelector<HTMLElement>(entry.textSelector)
      : anchor;
    // Missing textSelector match => suppress (matches Kendo's guard on
    // `!$textEl.length` in `_isTextTruncated`).
    if (!textEl) return true;
    return !isTruncated(textEl);
  }

  private _showFor(
    anchor: HTMLElement,
    entry: ArvoTooltipContainerEntry,
    trigger: 'hover' | 'focus',
  ): void {
    if (this._isTruncationSuppressed(entry, anchor)) return;
    const content = resolveContent(anchor, entry.content);
    if (content == null) return;
    const shortcut = resolveShortcut(anchor, entry.shortcut);
    const placement = entry.placement ?? this._opts.placement;

    this._currentAnchor = anchor;
    this._manager.show({
      anchor,
      content,
      placement,
      shortcut,
      trigger,
    });
  }

  private _handleMouseOver(e: MouseEvent): void {
    const match = this._resolveEntry(e.target);
    if (!match) return;

    // Ignore moves between descendants of the anchor we're already
    // showing for. The manager also has this short-circuit, but bailing
    // early avoids re-resolving content each time the cursor crosses a
    // child element.
    const related = e.relatedTarget as Node | null;
    if (
      this._currentAnchor === match.anchor &&
      related &&
      match.anchor.contains(related)
    ) {
      return;
    }

    this._showFor(match.anchor, match.entry, 'hover');
  }

  private _handleMouseOut(e: MouseEvent): void {
    if (!this._currentAnchor) return;
    const anchor = this._currentAnchor;

    // Only mouseout events that leave the current anchor matter. Sibling
    // mouseouts bubble through the container and should be ignored.
    const target = e.target as Node | null;
    if (!target || !anchor.contains(target)) return;

    const related = e.relatedTarget as Node | null;

    // Still inside the current anchor -- keep the tooltip up.
    if (related && anchor.contains(related)) return;

    // Moving directly to another filtered anchor within the same
    // container: let that anchor's `mouseover` drive the switch. Calling
    // `hide()` here would bounce `aria-describedby` in a way that
    // assistive tech could double-announce.
    if (related instanceof Element) {
      const nextMatch = this._resolveEntry(related);
      if (
        nextMatch &&
        nextMatch.anchor !== anchor &&
        this._container.contains(nextMatch.anchor)
      ) {
        return;
      }
    }

    this._currentAnchor = null;
    this._manager.hide();
  }

  private _handleFocusIn(e: FocusEvent): void {
    const match = this._resolveEntry(e.target);
    if (!match) return;

    // :focus-visible gate -- mirrors `tooltip-connector.ts` semantics so
    // pointer-driven focus (mouse click on a button) doesn't fire a
    // tooltip. Checks both the resolved anchor and the actual focus
    // target: the anchor is the tooltip owner, but the DOM-focused
    // element may be a nested interactive descendant.
    if (_focusVisibleSupported) {
      const target = e.target as HTMLElement | null;
      try {
        const hasVisibleFocus =
          match.anchor.matches(':focus-visible') ||
          !!target?.matches(':focus-visible');
        if (!hasVisibleFocus) return;
      } catch {
        // :focus-visible may throw in rare edge cases; fall through and show.
      }
    }

    this._showFor(match.anchor, match.entry, 'focus');
  }

  private _handleFocusOut(e: FocusEvent): void {
    if (!this._currentAnchor) return;

    const target = e.target as Node | null;
    if (!target || !this._currentAnchor.contains(target)) return;

    // Focus can only be on one element at a time -- no "moving between
    // filtered anchors" fast path is needed; the focusin on the next
    // anchor will replace the current show cleanly.
    this._currentAnchor = null;
    this._manager.hide(true);
  }

  // -----------------------------------------------------------------------
  // Debug / introspection helpers -- intentionally minimal.
  // -----------------------------------------------------------------------

  /** The container element this adapter is attached to. */
  get element(): HTMLElement {
    return this._container;
  }
}

// ---------------------------------------------------------------------------
// Known-limitations note (v0 scaffolding)
//
// TODO(tooltip-container): a truncation-mode `TooltipConnector` living on a
// descendant of an `ArvoTooltipContainer` will not currently see the
// container as an "explicit" owner, so both may attempt to show. The
// existing collision registry in `packages/core/src/tooltip/tooltip-connector.ts`
// is per-anchor and populated only by explicit connectors. Options for
// the fuller pass:
//   1. Export `markExplicit` / `hasExplicitInAncestors` and have the
//      container mark each matched anchor on show / unmark on hide.
//   2. Add a parallel `_explicitContainers` WeakSet + `hasExplicitContainer`
//      ancestor check inside `shouldSuppress()`.
// Pick (2) if we want the container to "own" the whole subtree at all
// times (recommended); pick (1) for lazy per-anchor ownership. Deferring
// until we have a real Kibo repro that hits the collision.
// ---------------------------------------------------------------------------
