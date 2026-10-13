import {
  overlayHub as defaultHub,
  type OverlayConfig,
  type OverlayEntry,
  type OverlayHub,
} from '@arvo/core';

// ---------------------------------------------------------------------------
// jQuery type augmentation
// ---------------------------------------------------------------------------

declare global {
  interface JQuery {
    openOverlay(
      entry?: Partial<Omit<OverlayEntry, 'element'>>,
    ): JQuery;
    closeOverlay(): JQuery;
  }

  interface JQueryStatic {
    setupOverlays(config: Partial<OverlayConfig>): void;
    closeAllOverlays(options?: { except?: string[] }): void;
    isOverlayOpen(id: string): boolean;
  }
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

// Maps each overlay element to the id registered with the hub, so that
// $.fn.closeOverlay() can close it without requiring the caller to track ids.
const overlayIds = new WeakMap<HTMLElement, string>();

let _idCounter = 0;

function generateId(): string {
  return `arvo-overlay-${++_idCounter}`;
}

// ---------------------------------------------------------------------------
// Plugin installer
// ---------------------------------------------------------------------------

/**
 * Installs overlay methods on the provided jQuery instance.
 * Call once at application startup:
 *
 *   import $ from 'jquery';
 *   import { setupOverlayPlugin } from '@arvo/js/setup';
 *   setupOverlayPlugin($);
 *
 * An alternative hub instance can be supplied for testing.
 */
export function setupOverlayPlugin(
  jq: JQueryStatic,
  hub: OverlayHub = defaultHub,
): void {
  // ------ static methods ------

  jq.setupOverlays = function (config: Partial<OverlayConfig>): void {
    hub.configure(config);
  };

  jq.closeAllOverlays = function (
    options?: { except?: string[] },
  ): void {
    hub.closeAll(options);
  };

  jq.isOverlayOpen = function (id: string): boolean {
    return hub.isOpen(id);
  };

  // ------ instance methods ------

  jq.fn.openOverlay = function (
    entry: Partial<Omit<OverlayEntry, 'element'>> = {},
  ): JQuery {
    this.each(function (this: HTMLElement) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- jQuery .each() callback uses `this` as DOM element
      const el = this;
      const id = entry.id ?? generateId();

      // Close any previously registered overlay on this element first.
      const prev = overlayIds.get(el);
      if (prev) hub.close(prev);

      hub.open({
        id,
        type: entry.type ?? 'dropdown',
        element: el,
        triggerElement: entry.triggerElement,
        priority: entry.priority ?? 0,
        config: entry.config ?? {},
        onClose: entry.onClose,
      });

      overlayIds.set(el, id);
    });

    return this;
  };

  jq.fn.closeOverlay = function (): JQuery {
    this.each(function (this: HTMLElement) {
      const id = overlayIds.get(this);
      if (id) {
        hub.close(id);
        overlayIds.delete(this);
      }
    });

    return this;
  };
}

// ---------------------------------------------------------------------------
// Convenience re-exports
// ---------------------------------------------------------------------------

export type { OverlayConfig, OverlayEntry, OverlayHub };
