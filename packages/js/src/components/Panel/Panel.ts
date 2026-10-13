/**
 * ArvoPanel -- vanilla JS implementation.
 *
 * Thin wrapper over the internal `PanelBase` primitive. Owns every shell
 * capability (four placements, overlay + docked display modes,
 * `isResizable`, `isExpandable` / `expandMode`, pin/unpin, dismissal
 * reasons, portal, scoped container, sticky search, rich header, header
 * actions, footer, FAB, edge-to-edge body). Body content is the consumer's
 * responsibility -- pass an `HTMLElement`, HTML string, callback, or
 * `null` via `content` (or `setContent()` at runtime).
 *
 * ArvoPanel is also the documented composition surface for
 * `ArvoPanel + ArvoList` (flat browsing) and `ArvoPanel + ArvoTree`
 * (hierarchical content) -- consumers instantiate ArvoList / ArvoTree
 * inside the body element rather than reaching for a dedicated wrapper.
 *
 * See `descriptors/panel.json` for the full spec.
 * Sibling specialized panels (ArvoNavPanel / ArvoFilterPanel) live
 * under their own component folders and share this component's shell
 * surface via `PanelBase`.
 */

import type {
  ArvoInitialFocusTarget,
} from '@arvo/core';
import type {
  PanelContent,
  ArvoPanelHeaderAction,
  ArvoPanelStickyHeaderConfig,
  ArvoPanelAction,
  ArvoPanelMenuItem,
  ArvoPanelSearchConfig,
  ArvoPanelSearchVariant,
  ArvoPanelPlacement,
  ArvoPanelDisplayMode,
  ArvoPanelExpandMode,
  ArvoPanelCloseReason,
} from '@arvo/utils';
import {
  createPanelBase,
  type PanelBaseInstance,
  type ArvoPanelRichHeaderConfig as PanelBaseRichHeaderConfig,
} from '../PanelBase/PanelBase';
import type { ArvoNavOptions, ArvoNavItemData } from '../Nav/Nav';
import type { ArvoListOptions, ArvoListItemData, ArvoListGroup } from '../List/List';
import type { ArvoAccordionOptions } from '../Accordion/Accordion';
import type { ArvoTreeViewOptions, ArvoTreeItem } from '../TreeView/TreeView';
import type { ArvoFabButtonOptions } from '../FabButton/FabButton';
import type { ArvoStatusConfig } from '../Status/Status';
import type { ArvoBadgeOptions } from '../Badge/Badge';

// The wrapper only exports item types the DEV consumer might want when
// building custom body content that reuses the design-system items -- these
// are already exposed by the base components' own barrels and are re-exported
// here as a convenience for `import type` consumers.
export type {
  PanelContent,
  ArvoPanelHeaderAction,
  ArvoPanelStickyHeaderConfig,
  ArvoPanelAction,
  ArvoPanelSearchConfig,
  ArvoPanelSearchVariant,
  ArvoPanelPlacement,
  ArvoPanelDisplayMode,
  ArvoPanelExpandMode,
  ArvoPanelCloseReason,
};

/** Public rich-header config on the JS path. Bare `HTMLElement | string`
 *  shorthand plus the full shape `{ content, hasClear?, onClear? }`. */
export type ArvoPanelRichHeaderConfig = PanelBaseRichHeaderConfig;

// Re-export the shape type for external consumers that want the full
// config surface.
export type {
  ArvoPanelRichHeaderConfigShape,
} from '@arvo/utils';

export interface ArvoPanelOptions {
  displayMode?: ArvoPanelDisplayMode;
  /** Full 4-way placement. The specialized panels narrow this to
   *  `'left' | 'right'`. */
  placement?: ArvoPanelPlacement;

  /** When true, removes the body's inline (left/right) padding so custom
   *  content runs flush to the inline pane edges. */
  isEdge?: boolean;

  // -- Visibility -------------------------------------------------------
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: (reason: ArvoPanelCloseReason) => boolean | void;

  // -- Modal ------------------------------------------------------------
  isModal?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  container?: HTMLElement | (() => HTMLElement) | null;
  initialFocus?: ArvoInitialFocusTarget | null;

  // -- Sizing -----------------------------------------------------------
  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;

  // -- Resize / Expand --------------------------------------------------
  isResizable?: boolean;
  onResize?: (size: number) => void;
  onResizeCommit?: (size: number) => void;

  isExpandable?: boolean;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  expandMode?: ArvoPanelExpandMode;
  onExpandChange?: (expanded: boolean) => void;

  // -- Header chrome ---------------------------------------------------
  hasHeader?: boolean;
  title?: string | null;
  icon?: string;
  status?: Omit<ArvoStatusConfig, 'placement'>;
  badge?: Omit<Partial<ArvoBadgeOptions>, 'placement'>;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPanelHeaderAction[];
  hasOverflowMenu?: boolean;
  overflowMenuItems?: ArvoPanelMenuItem[];

  // -- Pin / dismiss ---------------------------------------------------
  isPinnable?: boolean;
  isPinned?: boolean;
  defaultPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  isDismissible?: boolean;

  // -- Rich header / sticky / footer / fab ----------------------------
  richHeader?: ArvoPanelRichHeaderConfig | false;
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  actions?: ArvoPanelAction[] | false;
  fab?: ArvoFabButtonOptions | false;

  // -- Standard --------------------------------------------------------
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;

  /** Custom body content. HTMLElement, HTML string, callback, or null. */
  content?: PanelContent;
}

// Suppress unused-import warnings for the item types re-exported for
// consumer convenience. These MUST stay imported so `type` consumers can
// import them from `@arvo/js` via the Panel barrel.
export type {
  ArvoNavOptions,
  ArvoNavItemData,
  ArvoListOptions,
  ArvoListItemData,
  ArvoListGroup,
  ArvoAccordionOptions,
  ArvoTreeViewOptions,
  ArvoTreeItem,
};

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoPanel {
  private _base: PanelBaseInstance;
  private _content: PanelContent = null;

  static initialize(
    element: HTMLElement,
    options: ArvoPanelOptions = {},
  ): ArvoPanel {
    return new ArvoPanel(element, options);
  }

  constructor(element: HTMLElement, options: ArvoPanelOptions = {}) {
    this._base = createPanelBase(element, {
      ...options,
      panelType: 'custom',
    });
    if (options.content != null) {
      this._content = options.content;
      this._base.setContent(options.content);
    }
  }

  // -- Public API -----------------------------------------------------

  open(): void {
    this._base.open();
  }

  close(reason: ArvoPanelCloseReason = 'programmatic'): void {
    this._base.close(reason);
  }

  toggle(): void {
    this._base.toggle();
  }

  isOpen(): boolean {
    return this._base.isOpen();
  }

  pinned(): boolean;
  pinned(value: boolean): void;
  pinned(value?: boolean): boolean | void {
    if (value === undefined) return this._base.pinned() as boolean;
    this._base.pinned(value);
  }

  expanded(): boolean;
  expanded(value: boolean): void;
  expanded(value?: boolean): boolean | void {
    if (value === undefined) return this._base.expanded() as boolean;
    this._base.expanded(value);
  }

  size(): number;
  size(value: number): void;
  size(value?: number): number | void {
    if (value === undefined) return this._base.size() as number;
    this._base.size(value);
  }

  setDisplayMode(mode: ArvoPanelDisplayMode): void {
    this._base.setDisplayMode(mode);
  }

  setStickyHeader(config: ArvoPanelStickyHeaderConfig | false): void {
    this._base.setStickyHeader(config);
  }

  setHeaderActions(actions: ArvoPanelHeaderAction[]): void {
    this._base.setHeaderActions(actions);
  }

  setActions(actions: ArvoPanelAction[] | false): void {
    this._base.setActions(actions);
  }

  setTitle(title: string | null): void {
    this._base.setTitle(title);
  }

  setIcon(icon: string | null): void {
    this._base.setIcon(icon);
  }

  setContent(content: PanelContent): void {
    this._content = content;
    this._base.setContent(content);
  }

  search(): string;
  search(query: string): void;
  search(query?: string): string | void {
    if (query === undefined) return this._base.search() as string;
    this._base.search(query);
  }

  selectedTab(): string | null;
  selectedTab(id: string): void;
  selectedTab(id?: string): string | null | void {
    if (id === undefined) return this._base.selectedTab() as string | null;
    this._base.selectedTab(id);
  }

  loading(): boolean;
  loading(state: boolean): void;
  loading(state?: boolean): boolean | void {
    if (state === undefined) return this._base.loading() as boolean;
    this._base.loading(state);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._base.disabled() as boolean;
    this._base.disabled(state);
  }

  focus(target?: 'first' | 'title' | 'search' | 'list'): void {
    this._base.focus(target);
  }

  destroy(): void {
    this._base.destroy();
  }
}

export default ArvoPanel;
