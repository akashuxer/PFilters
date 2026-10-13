import {
  connectTooltip,
  tooltipManager,
  type TooltipPlacement,
  type TooltipConnector,
  type TooltipManager,
} from '@arvo/core';

export interface ArvoTooltipOptions {
  /** Text content displayed in the tooltip */
  content: string;
  /** Preferred placement relative to the trigger element */
  placement?: TooltipPlacement;
  /** Keyboard shortcut hint displayed alongside the content */
  shortcut?: string;
}

/**
 * Vanilla JS tooltip component. Attaches tooltip behavior (hover/focus,
 * ARIA, positioning) to any DOM element.
 *
 * ```ts
 * const tip = ArvoTooltip.initialize(triggerEl, { content: 'Save' });
 * tip.destroy();
 * ```
 */
export class ArvoTooltip {
  private _connector: TooltipConnector;
  private _element: HTMLElement;

  static readonly DEFAULTS: Partial<ArvoTooltipOptions> = {};

  // Public constructor so the jQuery plugin path (`new Class(el, opts)` inside
  // `registerArvoPlugins`) works alongside the canonical
  // `ArvoTooltip.initialize()` factory. DEFAULTS are merged and the manager
  // is defaulted here so both paths behave identically.
  constructor(
    element: HTMLElement,
    options: ArvoTooltipOptions,
    manager: TooltipManager = tooltipManager,
  ) {
    const opts = { ...ArvoTooltip.DEFAULTS, ...options };
    this._element = element;

    this._connector = connectTooltip(manager, {
      anchor: element,
      content: opts.content,
      placement: opts.placement,
      shortcut: opts.shortcut,
    });
  }

  static initialize(
    element: HTMLElement,
    options: ArvoTooltipOptions,
    manager?: TooltipManager,
  ): ArvoTooltip {
    return new ArvoTooltip(element, options, manager ?? tooltipManager);
  }

  update(options: Partial<ArvoTooltipOptions>): void {
    // Forward only keys the caller actually supplied -- spreading every
    // possible key as `undefined` would clobber values the connector
    // currently holds (e.g. `tip.update({ placement: 'top' })` would set
    // `content` to `undefined` and wipe the existing label).
    const patch: Partial<ArvoTooltipOptions> = {};
    if ('content' in options && options.content !== undefined) {
      patch.content = options.content;
    }
    if ('placement' in options && options.placement !== undefined) {
      patch.placement = options.placement;
    }
    if ('shortcut' in options && options.shortcut !== undefined) {
      patch.shortcut = options.shortcut;
    }
    this._connector.update(patch);
  }

  destroy(): void {
    this._connector.destroy();
  }

  get element(): HTMLElement {
    return this._element;
  }
}
