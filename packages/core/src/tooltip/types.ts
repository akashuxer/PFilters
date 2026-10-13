import type { OverlayHub } from '../overlay';
import type { ResolvedPlacement } from '../position/types';

export type TooltipPlacement = ResolvedPlacement;

export interface TooltipManagerConfig {
  enabled: boolean;
  hoverDelay: number;
  hideDelay: number;
  gap: number;
  defaultPlacement: TooltipPlacement;
}

export interface TooltipShowOptions {
  anchor: HTMLElement;
  content: string;
  placement?: TooltipPlacement;
  shortcut?: string;
  trigger: 'hover' | 'focus';
  /**
   * When `true`, the manager renders the tooltip element but does NOT
   * attach `aria-describedby` to the anchor. Used by truncation tooltips
   * where the anchor's accessible name already contains the full text and
   * a description would cause assistive tech to double-announce.
   */
  suppressAria?: boolean;
}

export interface TooltipManager {
  configure(config: Partial<TooltipManagerConfig>): void;
  getConfig(): TooltipManagerConfig;
  show(options: TooltipShowOptions): void;
  hide(immediate?: boolean): void;
  isVisible(): boolean;
  getElement(): HTMLElement | null;
  destroy(): void;
}

export interface TooltipManagerDeps {
  hub?: OverlayHub;
}

export interface TooltipConnectorOptions {
  anchor: HTMLElement;
  content: string | (() => string);
  placement?: TooltipPlacement;
  shortcut?: string;
  labelElement?: HTMLElement;
  autoOnTruncation?: boolean;
  /**
   * Ownership kind for collision suppression and ARIA handling.
   *
   * - `'explicit'` (default) -- consumer-wired tooltip (e.g. wrapping
   *   `<ArvoTooltip>` or `ArvoTooltip.initialize`). Registers the anchor
   *   in a module-level marker so any sibling `'truncation'` connector on
   *   the same anchor (or a descendant of it) yields. Uses
   *   `aria-describedby` description semantics on the anchor.
   * - `'truncation'` -- component-internal recovery affordance for a
   *   visually clipped label. Suppressed when an explicit tooltip owns
   *   the same anchor or any ancestor. Skips `aria-describedby`
   *   because the full label is already part of the anchor's accessible
   *   name.
   */
  kind?: 'explicit' | 'truncation';
}

export interface TooltipConnector {
  update(opts: Partial<TooltipConnectorOptions>): void;
  destroy(): void;
}
