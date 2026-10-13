// Panel-shell shared pattern -- TYPE definitions and pure helpers.
//
// The JS factory (`createPanelShell`) that composes Arvo* primitives lives at
// `@arvo/js/components/PanelShell/PanelShell.ts`. It cannot live here because
// `@arvo/js` already depends on `@arvo/utils`; pulling JS primitives into this
// module would create a circular dependency.
//
// What lives here:
//   * Framework-agnostic type definitions used by both React + JS shells.
//   * Pure functions (filter / format / validation) shared by both shells.
//
// Used by:
//   * @arvo/react/PanelShell.tsx (React shell)
//   * @arvo/js/components/PanelShell/PanelShell.ts (JS factory)

import {
  filterItems,
  type ListItemBase,
  type ListFilterOptions,
} from '@arvo/core';
type PanelInfoAlertType = 'negative' | 'positive' | 'warning' | 'info' | 'neutral' | 'block';

// ---------------------------------------------------------------------------
// Header-action configs (passthrough props for the underlying Arvo primitive)
// ---------------------------------------------------------------------------

/** Closed whitelist of header-action component types. */
export type ArvoPanelHeaderActionType =
  | 'btn'
  | 'dropdown'
  | 'split'
  | 'switch'
  | 'checkbox';

/**
 * Compact menu-item shape used by `dropdown` and `split` header actions. This
 * mirrors the underlying primitives' menu-item structure but stays
 * framework-agnostic so the type can live in `@arvo/utils`. Consumers cast to
 * the underlying primitive's stricter type at the boundary.
 */
export interface ArvoPanelMenuItem {
  id: string;
  label: string;
  icon?: string;
  isDisabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
}

interface ArvoPanelHeaderActionBase {
  id: string;
  /** Visible label (switches/checkboxes) or aria-label (icon variants). */
  label?: string;
}

export interface ArvoPanelHeaderActionBtn extends ArvoPanelHeaderActionBase {
  type: 'btn';
  /** o9con icon name (without the `o9con-` prefix). Required. */
  icon: string;
  tooltip?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
  onClick?: (event?: Event) => void;
}

export interface ArvoPanelHeaderActionDropdown extends ArvoPanelHeaderActionBase {
  type: 'dropdown';
  icon: string;
  tooltip?: string;
  items: ArvoPanelMenuItem[];
  isDisabled?: boolean;
  isLoading?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  onSelect?: (id: string) => void;
}

export interface ArvoPanelHeaderActionSplit extends ArvoPanelHeaderActionBase {
  type: 'split';
  icon: string;
  tooltip?: string;
  triggerLabel?: string;
  items: ArvoPanelMenuItem[];
  isDisabled?: boolean;
  isActionDisabled?: boolean;
  isTriggerDisabled?: boolean;
  isLoading?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  onClick?: (event?: Event) => void;
  onSelect?: (id: string) => void;
}

export interface ArvoPanelHeaderActionSwitch extends ArvoPanelHeaderActionBase {
  type: 'switch';
  isChecked?: boolean;
  defaultChecked?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isLoading?: boolean;
  onChange?: (isChecked: boolean) => void;
}

export interface ArvoPanelHeaderActionCheckbox extends ArvoPanelHeaderActionBase {
  type: 'checkbox';
  isChecked?: boolean;
  defaultChecked?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isLoading?: boolean;
  onChange?: (isChecked: boolean) => void;
}

export type ArvoPanelHeaderAction =
  | ArvoPanelHeaderActionBtn
  | ArvoPanelHeaderActionDropdown
  | ArvoPanelHeaderActionSplit
  | ArvoPanelHeaderActionSwitch
  | ArvoPanelHeaderActionCheckbox;

// ---------------------------------------------------------------------------
// Sticky-region configs
// ---------------------------------------------------------------------------

/**
 * Structured outline action button passed through to the BannerAlert
 * `button` slot. Mirrors `ArvoBannerAlertButton` from `@arvo/js`. Defined
 * locally so this framework-agnostic config does not depend on `@arvo/js`.
 */
export interface ArvoPanelBannerButton {
  label: string;
  icon?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
}

/**
 * Structured inline link passed through to the BannerAlert `link` slot.
 * Mirrors `ArvoBannerAlertLink` from `@arvo/js`.
 */
export interface ArvoPanelBannerLink {
  label: string;
  href: string;
  target?: '_self' | '_blank';
  rel?: string;
  icon?: string;
  isExternal?: boolean;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
}

/**
 * Banner config -- the panel-shell `__banner` slot renders an
 * `ArvoBannerAlert` instance under the hood. Fields are passed through to
 * the underlying component; `type` maps identity to `ArvoBannerAlertType`.
 */
export interface ArvoPanelBannerConfig {
  /** Semantic banner type. Identity maps to `ArvoBannerAlertType`. */
  type: 'info' | 'warning' | 'positive' | 'negative' | 'neutral';
  message: string;
  /** Optional title rendered above the message (ignored in compact mode). */
  title?: string | null;
  /** Optional outline action button rendered in the action row. Ignored in compact mode. */
  button?: ArvoPanelBannerButton;
  /** Optional inline link rendered in the action row. Ignored in compact mode. */
  link?: ArvoPanelBannerLink;
  /** Layout mode. Defaults to `false` (BannerAlert default). */
  isCompact?: boolean;
  isDismissible?: boolean;
  onDismiss?: () => void;
}

export interface ArvoPanelInfoConfig {
  type?: PanelInfoAlertType;
  message?: string;
  /**
   * Visibility gate for the `__info` row.
   *   - `'always'` (default): the row renders whenever a `message` is present.
   *   - `'filtered'`: the row only renders while a search query is active.
   *     Pair this with the `setInfo()` method (or a reactive `stickyHeader`
   *     in React) to surface a "Showing N of M results" message that the
   *     consumer computes against its own custom content as the query changes.
   */
  showWhen?: 'always' | 'filtered';
  /**
   * @deprecated Match-count auto-formatting only applied to the legacy
   * built-in `items` pipeline (no longer exposed on SidePanel / Drawer).
   * Drive the inline message from your own filtered content via `setInfo()`.
   */
  showMatchCount?: boolean;
  /** @deprecated See `showMatchCount`. */
  matchCountTemplate?: string;
}

// ---------------------------------------------------------------------------
// Default item shape -- consumed by the panel-shell default row template
// ---------------------------------------------------------------------------

/**
 * Optional fields the default `__item` template understands when no
 * `renderItem` callback is supplied. Extends `ListItemBase` (`id` + `label`)
 * with leading slot, sub-label, and selection/disabled state.
 *
 * Consumers DO NOT need to widen `PanelShellProps<T>` to use these -- the
 * default render branch reads each field if it happens to be present on the
 * item. Provide this interface as the item type when you want to opt in
 * with stricter typing.
 */
export interface ArvoPanelDefaultItem extends ListItemBase {
  /** Sub-label rendered as `{block}__item__secondary`. */
  secondaryLabel?: string;
  /** Alias for `secondaryLabel`. Back-compat with existing `description`. */
  description?: string;
  /** o9con icon name (no `o9con-` prefix). Renders `{block}__item__ico`. */
  icon?: string;
  /** Image URL. Renders `{block}__item__avatar`; wins over `icon`. */
  avatarUrl?: string;
  /** Adds `.active` (selected). */
  isActive?: boolean;
  /** Adds `.is-disabled` + `aria-disabled="true"`. */
  isDisabled?: boolean;
}

export interface ArvoPanelTabConfig {
  id: string;
  label: string;
  icon?: string;
  isDisabled?: boolean;
}

/**
 * Discriminator for the sticky-area search surface. `'search'` (default)
 * renders `ArvoSearch`; `'advance-search'` renders `ArvoAdvanceSearch`.
 * The two variants share the top-level knobs on `ArvoPanelSearchConfig`;
 * variant-specific knobs live under `advanceSearchProps`.
 */
export type ArvoPanelSearchVariant = 'search' | 'advance-search';

/**
 * Sticky-area search config. Discriminated on `variant` -- `'search'`
 * (default) renders `ArvoSearch`; `'advance-search'` renders
 * `ArvoAdvanceSearch`. Both variants share the top-level knobs;
 * `advanceSearchProps` is consulted only when
 * `variant === 'advance-search'`.
 *
 * When passed as `stickyHeader.search = true`, every knob defaults --
 * a plain `ArvoSearch` with `placeholder: 'Search'` and body filtering
 * on the `label` field (for panels that own item data). The 32x32
 * sliders / custom-filter affordance is provided by
 * `variant: 'advance-search'` + `advanceSearchProps.variant:
 * 'customFilter'`.
 *
 * When `variant === 'advance-search'` and `advanceSearchProps.variant`
 * is omitted, the mounted `ArvoAdvanceSearch` uses its own default
 * variant (`'filterBy'`).
 */
export interface ArvoPanelSearchConfig {
  /** Variant discriminator. Default `'search'`. */
  variant?: ArvoPanelSearchVariant;

  // ---- Shared knobs (both variants) ----
  placeholder?: string;
  shortcut?: string;
  showCounter?: boolean;

  // ---- Controllable query state ----
  /** Controlled query. Panel owns state when both `value` and
   *  `defaultValue` are omitted. */
  value?: string;
  /** Uncontrolled initial query. */
  defaultValue?: string;

  // ---- Built-in body filtering ----
  /** Item fields to match against. Wrapper defaults apply per panel
   *  (`['label']` for NavPanel / FilterPanel; no built-in filter for
   *  ArvoPanel -- consumers filter via the render-prop `children`
   *  form). */
  searchKeys?: string[];
  /** Custom search-text extractor. Wins over `searchKeys` when both
   *  are set. Signature: `(item: <inner item type>) => string`. */
  getItemSearchText?: (item: unknown) => string;

  // ---- Notification callbacks (fire on both variants) ----
  onChange?: (query: string) => void;
  onClear?: () => void;

  /**
   * Whitelisted subset of `ArvoAdvanceSearchProps` (or `Options` on
   * the JS side). Only consulted when `variant === 'advance-search'`.
   *
   * Typed here as `Record<string, unknown>` because `ArvoAdvanceSearch`
   * lives in `@arvo/react` / `@arvo/js` -- `@arvo/utils` cannot import
   * from either without creating a dependency cycle. React and JS
   * aliases narrow this to `Pick<ArvoAdvanceSearchProps | Options,
   * ...>` at the boundary. Do NOT widen `advanceSearchProps` here.
   */
  advanceSearchProps?: Record<string, unknown>;
}

export interface ArvoPanelStickyHeaderConfig {
  banner?: ArvoPanelBannerConfig | false;
  tabs?: ArvoPanelTabConfig[];
  /** Imperative slot (JS only) -- React consumers pass `children` instead. */
  slot?: HTMLElement | null;
  search?: boolean | ArvoPanelSearchConfig;
  info?: ArvoPanelInfoConfig | false;
}

// ---------------------------------------------------------------------------
// Rich header -- content + optional single clear action
// ---------------------------------------------------------------------------

/**
 * Rich-header config shape. Consumer-supplied content plus optional
 * leading `back` and trailing `close` / `clear` icon-button affordances
 * rendered inside `.arvo-pnl__rich-hdr`.
 *
 * The bare content shorthand (`string | ReactNode | HTMLElement`) is
 * captured at the framework layer:
 *
 *   React: `ArvoPanelRichHeaderConfig = ReactNode | ArvoPanelRichHeaderConfigShape<ReactNode>`
 *   JS:    `ArvoPanelRichHeaderConfig = HTMLElement | string | ArvoPanelRichHeaderConfigShape<HTMLElement | string>`
 *
 * `TContent` is parametrized so `@arvo/utils` does not depend on React
 * or on `HTMLElement`-only usage at this layer.
 *
 * ## Affordances
 *
 * - `hasBack: true` renders a 24x24 back `ArvoIconButton`
 *   (icon `arrow-left`, tooltip `Back`, aria-label `Back`) as the
 *   LEADING child of `__rich-hdr` (`.arvo-pnl__rich-hdr-back`).
 *   Activating it fires `onBack`. This is INDEPENDENT of the standard
 *   header's `hasBackButton` / `onBack` control -- consumers can use
 *   either or both (e.g. a drill-down view where the standard header's
 *   back navigates the primary content and the rich-header back
 *   navigates the identity trail).
 * - `hasClose: true` renders a 24x24 close `ArvoIconButton`
 *   (icon `close`, tooltip `Close`, aria-label `Close`) as the
 *   TRAILING child of `__rich-hdr` (`.arvo-pnl__rich-hdr-close`).
 *   Activating it fires `onClose`. This is INDEPENDENT of the panel's
 *   standard header close button (`isDismissible`) -- it can be used
 *   to dismiss the panel itself, exit a nested sub-view, or run a
 *   custom cleanup routine.
 * - `hasClear: true` renders a 24x24 clear `ArvoIconButton` (icon
 *   `close`, tooltip `Clear`, aria-label `Clear rich header`) as the
 *   TRAILING child of `__rich-hdr` (`.arvo-pnl__rich-hdr-clear`).
 *   Clicking it fires `onClear`. React consumers remove the region by
 *   clearing the `richHeader` prop; the JS twin removes the DOM node
 *   in-place when the clear button is clicked and then fires
 *   `onClear`. `hasClose` and `hasClear` are mutually exclusive; when
 *   both are set `hasClose` wins and `hasClear` is silently ignored.
 */
export interface ArvoPanelRichHeaderConfigShape<TContent = unknown> {
  content: TContent;
  /** Renders a leading back button. */
  hasBack?: boolean;
  /** Fires when the leading back button is activated. */
  onBack?: () => void;
  /** Renders a trailing close button. */
  hasClose?: boolean;
  /** Fires when the trailing close button is activated. */
  onClose?: () => void;
  /** Renders a trailing clear button that also removes the region in-place (JS twin). */
  hasClear?: boolean;
  /** Fires when the trailing clear button is activated. */
  onClear?: () => void;
}

// ---------------------------------------------------------------------------
// Shared panel enums + close-reason type
// ---------------------------------------------------------------------------

/** Edge the panel anchors to. */
export type ArvoPanelPlacement = 'left' | 'right' | 'top' | 'bottom';

/** Display mode. `overlay` floats with a shadow; `docked` reflows the layout. */
export type ArvoPanelDisplayMode = 'overlay' | 'docked';

/** Expansion target. `fullscreen` fills the viewport; `maxSize` grows to
 *  the configured maxSize and stops. */
export type ArvoPanelExpandMode = 'fullscreen' | 'maxSize';

/** Reason payload for the `pnl:close` event and `onClose` callback. */
export type ArvoPanelCloseReason =
  | 'escape'
  | 'mask-click'
  | 'outside-click'
  | 'close-button'
  | 'programmatic';

/**
 * Grouped-filter section for `ArvoFilterPanel` (`filterView='grouped'`).
 * Parametrized on the item shape so consumers can narrow to their own
 * item type; defaults to `ArvoPanelDefaultItem` for the panel-shell
 * default row template.
 */
export interface ArvoPanelFilterGroup<TItem = ArvoPanelDefaultItem> {
  id: string;
  title: string;
  icon?: string;
  items: TItem[];
}

// ---------------------------------------------------------------------------
// Footer action config (passthrough props for ArvoButton)
// ---------------------------------------------------------------------------

export interface ArvoPanelAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isLoading?: boolean;
  isIconOnly?: boolean;
  tooltip?: string;
  onClick?: (event?: Event) => void;
}

// ---------------------------------------------------------------------------
// Custom body content (JS shell)
// ---------------------------------------------------------------------------

/**
 * Arbitrary panel body content for the JS shell -- mirrors the
 * `ArvoPopover` `content` contract. Pass an element to append, an HTML
 * string to set as `innerHTML`, or a callback that receives the body
 * container to populate imperatively. React consumers pass `children`
 * instead. This is the generic, non-prescriptive way to fill a panel:
 * the design system does NOT impose a row schema on the body.
 */
export type PanelContent =
  | HTMLElement
  | string
  | ((el: HTMLElement) => void)
  | null;

// ---------------------------------------------------------------------------
// Factory options + instance contract (implemented in @arvo/js)
// ---------------------------------------------------------------------------

export interface PanelShellOptions<T extends ListItemBase = ListItemBase> {
  title?: string | null;
  hasHeader?: boolean;
  hasBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ArvoPanelHeaderAction[];
  stickyHeader?: ArvoPanelStickyHeaderConfig | false;
  /**
   * Custom body content (JS shell). Rendered into `{block}__body`. This is
   * the generic content seam SidePanel / Drawer expose -- the panels do not
   * ship a built-in item/list schema.
   */
  content?: PanelContent;
  /**
   * @internal Built-in item/list pipeline. Retained for the internal shell
   * primitive but NOT exposed by SidePanel / Drawer. New consumers should
   * use `content` (JS) / `children` (React) instead.
   */
  items?: T[];
  /** @internal Part of the built-in item pipeline. Not exposed publicly. */
  getItemId?: (item: T) => string;
  /** @internal Part of the built-in item pipeline. Not exposed publicly. */
  filterKeys?: Array<keyof T & string>;
  /** @internal Part of the built-in item pipeline. Not exposed publicly. */
  getItemSearchText?: (item: T) => string;
  /** @internal Part of the built-in item pipeline. Not exposed publicly. */
  renderItem?: (item: T, el: HTMLElement) => void;
  /** @internal Part of the built-in item pipeline. Not exposed publicly. */
  itemsRole?: 'listbox' | 'list' | 'menu';
  actions?: ArvoPanelAction[] | false;
  hasFooter?: boolean;
  isClosable?: boolean;
  onClose?: () => void;
  pinSlot?: HTMLElement | null;
  /**
   * Optional pre-built element rendered as the FIRST child of `__hdr-lft`
   * (after the back button when present, before `__title`). Used by
   * `ArvoPanel` to inject the leading title icon (`<i class="arvo-pnl__icon
   * o9con-{name}">`). Kept generic so higher-level consumers can render
   * arbitrary pre-title chrome without a schema baked into the shell.
   */
  titleLeading?: HTMLElement | null;
  /**
   * Optional pre-built element rendered as the LAST child of `__hdr-lft`
   * (after `__title`). Used by `ArvoPanel` to inject the trailing
   * `ArvoStatus` + `ArvoBadge` cluster.
   */
  titleTrailing?: HTMLElement | null;
  isPinnableCount?: number;
  isClosableCount?: number;
  selectedTabId?: string | null;
  onTabSelect?: (id: string) => void;
  /** @internal Fired by the built-in item pipeline. Not exposed publicly. */
  onItemActivate?: (id: string, item: T) => void;
  onSearchChange?: (query: string, matchedCount: number | null) => void;
}

export interface PanelShellInstance<T extends ListItemBase = ListItemBase> {
  /** @internal Built-in item pipeline. Not exposed by SidePanel / Drawer. */
  setItems(items: T[]): void;
  /** Replace the custom body content (JS shell). */
  setContent(content: PanelContent): void;
  setStickyHeader(config: ArvoPanelStickyHeaderConfig | false): void;
  setHeaderActions(actions: ArvoPanelHeaderAction[]): void;
  setActions(actions: ArvoPanelAction[] | false): void;
  /**
   * Update the sticky `__info` row in place (no sticky-region rebuild, so
   * search focus is preserved). Pass `false` to hide the row.
   */
  setInfo(config: ArvoPanelInfoConfig | false): void;
  updateAction(id: string, patch: Partial<ArvoPanelHeaderAction | ArvoPanelAction>): void;
  search(query?: string): string | void;
  selectedTab(id?: string): string | null | void;
  setTitle(title: string | null): void;
  loading(state?: boolean): boolean | void;
  disabled(state?: boolean): boolean | void;
  focus(target?: 'first' | 'title' | 'search' | 'list'): void;
  setPinSlot(el: HTMLElement | null): void;
  /**
   * Replace the leading element rendered as the first child of `__hdr-lft`
   * (before `__title`). Pass `null` to clear. Used by `ArvoPanel` to
   * swap the leading title icon.
   */
  setTitleLeading(el: HTMLElement | null): void;
  /**
   * Replace the trailing element rendered as the last child of `__hdr-lft`
   * (after `__title`). Pass `null` to clear. Used by `ArvoPanel` to swap
   * the status + badge cluster.
   */
  setTitleTrailing(el: HTMLElement | null): void;
  getElement(): HTMLElement;
  destroy(): void;
  hdrEl: HTMLElement | null;
  bodyEl: HTMLElement | null;
  listEl: HTMLElement | null;
  searchEl: HTMLElement | null;
  stickyEl: HTMLElement | null;
  footerEl: HTMLElement | null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_ACTION_TYPES = new Set<string>(['btn', 'dropdown', 'split', 'switch', 'checkbox']);

export function validateHeaderAction(action: { type: string; id?: string }): boolean {
  if (VALID_ACTION_TYPES.has(action.type)) return true;
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[panel-shell] Unknown header-action type "${action.type}"${action.id ? ` (id: "${action.id}")` : ''}. ` +
      `Allowed types: ${[...VALID_ACTION_TYPES].join(', ')}. This entry will be skipped.`,
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function runItemFilter<T extends ListItemBase>(
  items: T[],
  query: string,
  opts?: {
    keys?: Array<keyof T & string>;
    getItemSearchText?: (item: T) => string;
  },
): T[] {
  if (!query) return items;

  if (opts?.getItemSearchText) {
    const q = query.toLowerCase();
    return items.filter((item) => opts.getItemSearchText!(item).toLowerCase().includes(q));
  }

  const filterOpts: ListFilterOptions = {
    query,
    keys: (opts?.keys as Array<'label' | 'secondaryLabel'>) ?? ['label'],
  };
  return filterItems(items, filterOpts);
}

export function formatMatchCountMessage(
  count: number,
  template?: string,
): string {
  const tmpl = template ?? '{count} matching results';
  return tmpl.replace('{count}', String(count));
}
