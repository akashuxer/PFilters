# @arvo/js

## 2.2.5

### Patch Changes

- Updated dependencies [485bcc3]
  - @arvo/core@2.2.5
  - @arvo/utils@2.2.5
  - @arvo/styles@2.2.5
  - @arvo/tokens@2.2.5

## 2.2.4

### Patch Changes

- **Panel family consolidation — `ArvoPanel` split into focused components.**

  ### Added
  - **`ArvoNavPanel`** — dedicated navigation panel replacing `ArvoPanel` with `panelType="navigation"`. Ships with full React + JS parity, tests, and docs. Composes the internal `PanelBase` primitive, and consumes `ArvoNav` / `ArvoNavItem` in compact (icon-rail) or full mode.
  - **`ArvoFilterPanel`** — dedicated flat/grouped filter panel replacing `ArvoPanel` with `panelType="filter"`. Ships with full React + JS parity, tests, and docs. Composes the internal `PanelBase` primitive with filter-specific body templates.
  - **`ArvoNav` / `ArvoNavItem` `isCompact` option** — icon-rail mode that collapses the label (preserved via `aria-label` / `title`) for compact sidebar layouts consumed by `ArvoNavPanel`.
  - **`ArvoTooltip` jQuery plugin registration** — new `$.fn.arvoTooltip` jQuery adapter and `arvoTooltipContainer` delegation helper (`setup/tooltip-container.ts`) for consumer codebases that manage tooltips at container level (Kendo interop). Intentionally not descriptor-driven; no React counterpart.

  ### Changed
  - **`ArvoPanel`** — **BREAKING**: extracted the shared shell chrome (header, sticky region, footer, resize, expand/pin, FAB, rich header) into an internal `PanelBase` primitive. `ArvoPanel` now composes `PanelBase` and keeps only the general-purpose custom body plus the documented `ArvoList` / `ArvoTreeView` compositions.
  - **`ArvoPanel`** — **BREAKING**: removed `panelType` option, all `nav*` / `browser*` / `filter*` / `tree*` body-template options, and `stickyAction` (superseded by `stickyHeader.search`).
  - **`ArvoListPanel` / `ArvoTreePanel`** — **BREAKING**: removed. Use `ArvoPanel` with `ArvoList` / `ArvoTreeView` compositions instead. See `apps/docs/docs/migration/panel.mdx` for the full migration table.

  ### Migration

  ```diff
  - ArvoPanel.initialize(el, { panelType: 'navigation', navItems: [...] })
  + ArvoNavPanel.initialize(el, { items: [...] })

  - ArvoPanel.initialize(el, { panelType: 'filter', filterGroups: [...] })
  + ArvoFilterPanel.initialize(el, { groups: [...] })

  - ArvoListPanel.initialize(el, { items: [...] })
  + ArvoPanel.initialize(el, { /* custom body with ArvoList */ })
  ```

- Updated dependencies
  - @arvo/core@2.2.4
  - @arvo/styles@2.2.4
  - @arvo/tokens@2.2.4
  - @arvo/utils@2.2.4

## 2.2.3

### Patch Changes

- **`ArvoOptionList` graduates from internal composition primitive to a public Overlays component.**

  ### Added
  - **`ArvoOptionList`** -- Field-agnostic floating option-list overlay is now part of the public API. Bind a `role="listbox"` popup to any consumer-owned trigger (pivot / grid cell, toolbar icon, custom launcher) via `triggerRef` (React) or the first argument to `initialize()` (JS). Supports single and multiple selection, grouping, optional in-overlay `search`, `isCreatable` empty-state, `emptyConfig` overrides, and the full listbox keyboard + ARIA contract. Multi-select mode keeps the overlay open on selection so a bespoke cell can toggle several values before dismissing.
    - React: `<ArvoOptionList triggerRef={ref} items={...} isMultiple />` -- see the new [Option List](/components/overlays/option-list) page.
    - JS: `ArvoOptionList.initialize(triggerEl, { items, isMultiple, ... })`.
    - Custom events: `option-list:open` / `close` / `change` / `highlight` / `filter` / `create`.
    - Continues to be composed internally by `ArvoSelect`, `ArvoMultiSelect`, and `ArvoCombobox`; those consumers are unchanged.

  ### Changed
  - **`ArvoSelect` / `ArvoMultiSelect` / `ArvoCombobox` / `ArvoAdvanceSearch`** -- descriptor descriptions no longer call `ArvoOptionList` "internal" now that it is a first-class public overlay. No runtime, prop, event, or method changes.
  - **`@arvo/ai-context`** -- knowledge base regenerated. Public component count 69 -> 70; internal building-block count 5 -> 4. `components/option-list.md` is now the full per-component KB entry (previously a routing-only stub); Overlays bundle gains the OptionList section; foundations bundle drops the four OptionList routing-table rows and adds `ArvoOptionList` to the overlay-setup required-provider list.
  - @arvo/core@2.2.3
  - @arvo/styles@2.2.3
  - @arvo/tokens@2.2.3
  - @arvo/utils@2.2.3

## 2.2.2

### Patch Changes

- `ArvoPanel` now fully wires up the header title chrome that was
  reserved in the v2.2.0 API but only accepted (and silently ignored)
  in the render path. All changes are strictly additive at the option
  layer -- existing call sites that never set `icon` / `status` /
  `badge` continue to render identically.

  ### New: leading title icon

  Passing the `icon` option now renders a leading 20x20 o9con glyph
  before the header title (`<i class="arvo-pnl__icon o9con
o9con-{name}" aria-hidden="true" />`). The base `o9con` class is
  required for the icon font family to resolve; ArvoPanel manages the
  class list internally so consumers only need to provide the glyph
  name. The icon slot is styled by the shared `panel-shell` mixin so
  the vanilla JS twin ships the same DOM contract as `@arvo/react`.

  ### New: `ArvoPanel.setIcon(icon: string | null)` method

  Dedicated setter (mirroring `setTitle` / `setActions`) that swaps
  or clears the leading glyph without a full re-init:
  - `panel.setIcon('filter')` -- swap in place; reuses the existing
    `.arvo-pnl__icon` DOM node so surrounding chrome does not remount.
  - `panel.setIcon(null)` -- remove the icon entirely.
  - `panel.setIcon('folder')` from a panel that started without an
    icon -- builds the glyph on demand.

  ### Inline `status` + `badge` slots

  `status` and `badge` options now render as real `ArvoStatus` /
  `ArvoBadge` instances inline adjacent to the title (status first,
  then badge). The instances are managed by the parent panel: they
  are built during `initialize`, wrapped in a `.arvo-pnl__title-cluster`
  span, and torn down on `destroy` so no children leak. The accepted
  option shapes were tightened to
  `Omit<ArvoStatusConfig, 'placement'>` and
  `Omit<Partial<ArvoBadgeOptions>, 'placement'>` because the 40px
  header row is not a `corner-host` positioning context -- overlay
  placements (`top-right` / `bottom-right`) are silently unsupported
  in this slot and the `placement` key is intentionally excluded from
  the accepted config.

  ### BREAKING (type-level only)

  The `status` and `badge` option types are now the
  `Omit<..., 'placement'>` variants. Existing call sites that never
  set `placement` compile unchanged; call sites that passed
  `placement: 'top-right'` / `placement: 'bottom-right'` will need to
  drop the key (the render path was already ignoring it). No runtime
  behavior change for correct call sites.

  Also in this release:
  - Test coverage: 10 new `ArvoPanel.test.ts` cases cover the leading
    icon (rendered / omitted / setIcon swap / setIcon null / build
    from nothing), the `status` + `badge` inline instances (each
    rendered / order-in-cluster / trailing wrapper omitted when both
    are unset / destroyed on panel destroy), and the expanded public
    API surface assertion (`setIcon` added to the shape check).

  ### Patch Changes
  - Updated dependencies
    - @arvo/core@2.2.2
    - @arvo/styles@2.2.2
    - @arvo/utils@2.2.2
    - @arvo/tokens@2.2.2

## 2.2.1

### Patch Changes

- `ArvoAlertDialog` and `ArvoWindow` stacking fix: the outer host
  (`.arvo-alert-dlg` / `.arvo-win`) now follows the panel's hub-assigned
  z-index so consumer-level `overlayHub.configure({ zIndexBase })` lifts
  the WHOLE dialog / window above sibling overlays. Previously the host
  wrapper was trapped at the SCSS fallback `--arvo-z-popover: 1000`
  stacking context and any sibling overlay above 1000 visually obscured
  the panel even though the panel itself was registered at a higher z.

  Implemented by passing the outer root element as `surfaceRoot` to
  `createOverlaySurface(...)`, which routes through the new
  `OverlayHub.attachWrapperElement` API to keep the wrapper's z-index
  pinned to the surface's z across stack changes.

  No public component API changes -- the fix is behind-the-scenes on
  the affected components.

  ### Patch Changes
  - Updated dependencies
    - @arvo/core@2.2.1
    - @arvo/styles@2.2.1
    - @arvo/utils@2.2.1
    - @arvo/tokens@2.2.1

## 2.2.0

### Minor Changes

- The largest single release since v1.0: 25 new public components,
  4 new internal layer-4 dropdown primitives, the OverlaySurface engine
  migration for every overlay-capable component, and broad rework
  across existing components. All twins are kept at strict parity with
  `@arvo/react` and the descriptors. The descriptor file is the source
  of truth -- see `descriptors/<slug>.json` for the canonical option /
  event / method surface for each component.

  ### New public components

  Selection + feedback:
  - **`ArvoBadge`** -- unified count / dot / status badge replacing
    `ArvoBadgeAlert`. Counter mode supports `1 / 5 / 10 / 99+ / 1.0K`
    formats (via `@arvo/core/formatBadgeCount`). Composes the new
    `corner-host` mixin for pinned placement on Button / Toggle Button /
    Chip / Icon Button / any custom host.
  - **`ArvoStatus`** -- standalone status pip (negative / positive /
    warning / info / neutral / block). Same canonical `ArvoStatusConfig`
    slot config shape as `ArvoBadgeConfig`; hosts use the `corner-host`
    pattern to anchor.
  - **`ArvoLoader`** -- explicit feedback primitive (dot / circular /
    square shapes; sm / md / lg sizes; theme / inverse / subtle tones).
    Not gated by the `ARVO_LOADING_ENABLED` flag; complements the
    component-internal loading patterns (A / B / C).
  - **`ArvoChip`** -- selection chip with clear, icon, avatar, status,
    drag, secondary label, validation message, and tooltip support.
  - **`ArvoChipList`** -- chip group with overflow / wrap / scroll
    management, expand / collapse, persistent `__overflow` button (no
    layout shift), and add / remove API. Powers `ArvoMultiSelect`.
  - **`ArvoMultiSelect`** -- multi-value select built on `ArvoOptionList`
    and `ArvoChipList`. Input is a DOM sibling of the chip area (no
    longer nested) which eliminates the caret-after-disclosure and
    Backspace-wrong-chip bugs from the early prototype.
  - **`ArvoToggleButton`** -- pressable button with toggle semantics
    (replaces the toggle capability previously embedded in
    `ArvoIconButton`). Same variant + status + badge surface as
    `ArvoIconButton`.

  Data display:
  - **`ArvoTreeView`** -- hierarchical multi-level list container.
    Implements the WAI-ARIA Tree View keyboard pattern (via
    `@arvo/core/createTreeNav`), single / multiple selection,
    async children, drag-reorder, search-match highlight,
    actions-on-hover, and cancellable `tree:select` / `tree:expand` /
    `tree:loadchildren` / `tree:reorder` events.
  - **`ArvoDropdownTree`** -- tree picker overlay combining an
    `ArvoPopover` shell with an embedded `ArvoTreeView`. Sticky search
    row + adjacent filter dropdown.
  - **`ArvoAccordion`** + accordion-item options -- single / multiple
    expand modes, item search config, switch config, per-item actions.
  - **`ArvoList`** -- selectable / reorderable list with leading
    avatar / status / badge slots, trailing actions, drag handle, and
    inline empty / loading skeletons. `LIST_MAX_ROW_ACTIONS` constant
    exported for descriptor parity.

  Navigation:
  - **`ArvoNav`** -- vertical / horizontal nav rail with animated active
    indicator (per `_animation.scss` motion tokens),
    `NAV_ITEM_MAX_INLINE_ACTIONS` constant, per-item avatar + status +
    inline action support, nested menu config.

  Layout / overlay:
  - **`ArvoPanel`** -- new general-purpose Panel (push, overlay, embed
    display modes; left / right / top / bottom / center placements;
    filter view, tree view, scope view). Drawer + Side Panel are
    deprecated in favor of Panel (kept exported during the
    deprecation window).
  - **`ArvoWindow`** -- non-modal, draggable, resizable window with
    header + footer actions (button / icon-button / dropdown /
    dropdown-icon / split / split-icon / switch action types), empty
    content slot, and badge config. Composes the new `drag-handle` +
    `resize-handle` primitives.
  - **`ArvoSplitter`** -- horizontal / vertical splitter for resizable
    inline layouts.
  - **`ArvoDisclosureButton`** -- compact reveal trigger (chevron icon
    - label) used by ChipList overflow, list groups, and custom
      expanders.
  - **`ArvoContextMenu`** -- right-click + long-press context menus
    powered by the new `@arvo/core/createContextMenuController`. Items
    accept the same `MenuItemData` shape as `ArvoActionMenu`.
  - **`ArvoRichTooltip`** -- richer tooltip variant with header, body,
    optional actions / status / badge / banner. Distinct from the
    plain `ArvoTooltip`.

  Search + input:
  - **`ArvoAdvanceSearch`** -- advanced search field with wildcard
    detection (`advanceSearchIsWildcardQuery` helper), scope options,
    multi-mode search, popover footer slots, counter, and error
    display modes.
  - **`ArvoContextHelp`** -- info-tip pattern used by form labels and
    field rows.
  - **`ArvoOptionList`** (internal primitive) -- single-select option
    list with `emptyConfig`, `isCreatable` + `onCreate`, multi-select
    checkbox slot, and `'rich'` variant (avatar + secondary label).
    Internal building block consumed by `ArvoSelect`, `ArvoCombobox`,
    `ArvoMultiSelect`, and `ArvoListbox`; application code should not
    initialize it directly.

  People + avatar:
  - **`ArvoAvatar`** + **`ArvoAvatarGroup`** -- person / entity avatars
    with initials resolution (`@arvo/core/resolveInitials`), semantic
    color mode, appearance variants, and a stacked group with overflow
    badge + popover.

  ### New internal date-time dropdown primitives (`internal: true`)

  Layer-4 building blocks composed by the public picker family. Not
  for direct use by application code; route to the supported components
  via `internalRoutes` in their descriptors:
  - **`ArvoCalendarDropdown`** -- composes `ArvoPopover` + `ArvoCalendar`
    for `ArvoDatePicker` and `ArvoDateTimePicker`.
  - **`ArvoDateTimeDropdown`** -- composes calendar + time dropdown for
    `ArvoDateTimePicker`.
  - **`ArvoCalendarRangeDropdown`** -- range / member calendar for
    `ArvoDateRangePicker`.
  - **`ArvoTimePickerDropdown`** -- composes `ArvoTimeDropdown` for
    `ArvoTimePicker` and `ArvoDateTimePicker`.

  ### BREAKING: removed components
  - **`ArvoBadgeAlert`** removed. Replaced by `ArvoBadge` (count + dot)
    and `ArvoStatus` (status pip), both pinned via the `corner-host`
    SCSS pattern. The `Indicator` DOM factory in `@arvo/utils` that
    backed `ArvoBadgeAlert`'s JS surface is also removed.
  - **`ArvoSegmentedControl`** removed. Use `ArvoButtonGroup` with
    `selectionMode: 'single'` or the existing tabs / toggle button
    primitives -- the segmented-control visual is achieved with the
    new ButtonGroup roving keyboard + animated indicator.

  ### OverlaySurface engine migration

  Every overlay-capable component now consumes
  `@arvo/core/createOverlaySurface` directly:
  - Alert Dialog, Drawer, Side Panel, Popover, Hybrid Popover, Action
    Menu, Context Menu, Dropdown Button, Dropdown Icon Button, Split
    Button, Split Icon Button, Date Picker, Date Range Picker, Date
    Time Picker, Time Picker, Toast, Tooltip, Rich Tooltip, Window,
    Panel, Select, Combobox, Multi-Select, Dropdown Tree, and the four
    Layer-4 internal dropdown primitives.
  - Engine owns trigger-anchor binding (writes `aria-haspopup`,
    `aria-controls`, `aria-expanded`), positioning, focus trap, return
    focus, hub-managed stacking, and cancellable open / close events.

  ### Existing-component reworks
  - **`ArvoTabstrip`** (BREAKING DOM): - Animated sliding `__indicator` shared by `primary` and `secondary`
    variants. `__tab-lbl` now wraps a `__tab-lbl-text` child; the
    `data-label` ghost pre-allocates medium-weight width so selection
    no longer shifts layout. - Reorder migrated from a bespoke drag handler to
    `@arvo/core/createSortableList` with `axis: 'x'` and constrained
    drag bounds. - New `TabItem` fields: `ariaLabel`, `pinActionStatus`,
    `closeActionStatus`, `badge`, plus composed accessible name
    (`"<label> tab[, selected][, <badge>][, status: <statusLabel>]
[, pinned]"`). - New `menuProps` + `overflowMenuProps` scoped escape-hatch bags. - Font-size correction: sm and lg both use 14 px (only height /
    padding differ between sizes). - Drag clone constrained to pinned / unpinned group bounds.
  - **`ArvoBreadcrumb`**: new `menuItems` per-item option renders the
    item as an inline action-menu trigger; new `onItemMenuOpen` /
    `onItemMenuClose` events with `{ index }` payload; new BEM
    elements `__lnk--dd`, `__lbl--dd`, `__lnk-inner`, `__chev`, `--dd`.
  - **`ArvoSwitch`**: new `sm` (24 x 14 + 10 px thumb) and `lg`
    (28 x 16 + 12 px thumb) size modifiers (audit W2-TOG-REV-SW-01).
  - **`ArvoDrawer`** (BREAKING):
    - Drops `side-top` / `side-bottom` and `ArvoDrawerMaskConfig.opacity`
      / `.blur` fields from the descriptor.
    - Adds `closeOnOutsideClick` (canonical); deprecates
      `closeOnMaskClick` as a back-compat alias (one-shot console warn).
    - Fixes `toggle()` to route the close branch through `doClose()` so
      `drw:close` fires and `reason='programmatic'` is tagged (silent
      close in v2.1.0).
    - `aria-labelledby` wired through `shellTitleId` from PanelShell.
  - **`ArvoToast`** (BREAKING behavior):
    - `negative` type now auto-dismisses at the 8 s
      `$arvo-toast-duration-negative` token (was hard-persistent in
      v2.1.0). Only `block` remains persistent. Per-type durations
      flow from the new toast-duration token scale.
    - Close button upgraded from a raw `<button>` to `ArvoIconButton`
      (xs, tertiary, tooltip="Close notification"). `__link` wrapper
      removed; `ArvoLink` is now a direct child of `__content`. New
      `__text` wrapper groups title + message.
  - **`ArvoMessageAlert`**: dismiss affordance upgraded to a tertiary
    xs `ArvoIconButton`. `icon` prop now restricted to `type="neutral"`.
  - **`ArvoMultiSelect`** (BREAKING DOM): `__input` is now a sibling of
    `__chip-area` (was nested), and the `+N more` / `Show less`
    disclosure is replaced by a single persistent `__overflow` button
    on the ChipList. Active-descendant cursor now includes the overflow
    button.
  - **`ArvoCombobox` / `ArvoSelect`**: option rendering delegated to
    `ArvoOptionList`; `role="combobox"` moved to `__field`; outside-
    click + Escape dismissal behavior aligned with the engine; new
    `optionListProps` Pick<> bag (`'emptyConfig' | 'variant' |
'isCreatable' | 'onCreate'`).
  - **`ArvoDropdownButton`** / **`ArvoSplitButton`** /
    **`ArvoDropdownIconButton`** / **`ArvoSplitIconButton`**: new
    `overlay` factory option lets consumers swap the default Action
    Menu for any overlay factory (e.g. an `ArvoHybridPopover` filter
    menu); keyboard roving on Split variants.
  - **`ArvoTextbox`**: new `surface` enum (`'filled' | 'base'`),
    `affix` slots (leading icon / prefix / suffix), and password-
    visibility flow.
  - **`ArvoNumberInput`**: prefix / suffix layout migrated to the
    shared `form-input-affix` mixin (no more ResizeObserver-driven
    absolute prefix overlay).
  - **`ArvoSearch`**: new DOM event surface (`search:input`,
    `search:search`, `search:change`, `search:previous`,
    `search:next`); padding CSS variable corrected to
    `--arvo-form-input-pad-r`.
  - **`ArvoFabButton`**: default z-index lowered from 1050 to 900 (below
    the overlay hub layer at 1000); new `--arvo-fab-btn-z-index`
    CSS variable for consumer overrides.
  - **`ArvoRadioGroup`**: WAI-ARIA roving tabindex via
    `_syncRovingTabindex`.

  ### jQuery plugin registry sync

  `packages/js/src/plugin.ts` re-registered every new component for
  the `$.fn.arvo*` plugin surface and the
  `data-arvo-component="arvo<Name>"` declarative path:
  Accordion, Avatar, AvatarGroup, AdvanceSearch, Badge, ButtonGroup,
  ChipList, Chip, CalendarDropdown, CalendarRangeDropdown,
  ContextHelp, ContextMenu, DateTimeDropdown, DisclosureButton,
  DropdownTree, FabButton, List, Loader, MultiSelect, Nav,
  NumberInput, OptionList, Panel, RichTooltip, Splitter, Status,
  Tabstrip (re-register), TimePickerDropdown, ToggleButton, TreeView,
  Window.

  Application code that wires the plugins via `registerArvoPlugins($)`
  or `import '@arvo/js/auto'` continues to work; the
  `JQuery` interface augmentation now declares plugin methods for the
  full v2.2.0 component set.

  ### Patch Changes
  - Updated dependencies
    - @arvo/core@2.2.0
    - @arvo/styles@2.2.0
    - @arvo/utils@2.2.0
    - @arvo/tokens@2.2.0

## 2.1.0

### Minor Changes

- Overlay hub stacking, global loading kill-switch, font cleanup & Action Menu inline sizing
  - Drawer and SidePanel (overlay variant) now register with the overlay hub for hub-managed z-index and correct nested overlay stacking. New `managesOwnFocus` / `managesOwnBackdrop` config options let self-trapping overlays opt out of hub focus/backdrop without losing stacking order.
  - Global `ARVO_LOADING_ENABLED` flag (currently off) gates all component loading states — code is preserved but inert until re-enabled.
  - Removed ~23 MB of unused font-weight 300 font files (NotoSans Light, Roboto Light, Helvetica Light, o9Sans full family).
  - Action Menu: `width`/`height` options for inline popover/hybrid-popover panels; removed `MenuItemData.rightLink`.
  - Listbox: removed unused `size` prop.
  - Inline-content mixin emitted once globally; panel-shell footer padding fix; overlay backdrop z-index now set inline by owning component.

### Patch Changes

- Updated dependencies
  - @arvo/core@2.1.0
  - @arvo/styles@2.1.0
  - @arvo/utils@2.1.0
  - @arvo/tokens@2.1.0

## 2.0.0

### Major Changes

- feat!: v2.0 — public API consolidation, Storybook model unification, new inline-content engine and EmptyState

  This release is a platform-wide pass: every publishable package moves
  forward together with refined public APIs, a unified Storybook model
  across the React package, two new headline features, and a full
  @arvo/ai-context regeneration.

  ## Component API consolidation (BREAKING)
  - @arvo/react: type rename `MenuTrailingAction` → `MenuItemAction`.
  - @arvo/react: removed exports `ArvoAlertDialogSize`, `ArvoDrawerMaskVariant`.
    Use the canonical prop types from each component instead.
  - Action Menu, Popover, and Hybrid Popover continue the overlay
    overhaul started in 1.4: refined `emptyConfig`, inline-popover and
    inline-hybrid-popover configs, and item/menu action shapes.
  - Alert Dialog, Drawer, Side Panel, Banner Alert, Toast, Message Alert,
    Badge Alert, and Tabstrip carry descriptor-level prop and method
    refinements. New `ArvoToastLinkAction` type for toast link actions.
  - Core engine refinements in mask, overlay-hub, positioning (compute +
    watcher), resize-handle, and dom/truncation.

  ## Storybook model unification

  Every React component now ships the consolidated two-file model
  (`{Component}.stories.tsx` + `{Component}.mdx`). The legacy
  `{Component}.docs.mdx`, `{Component}.examples.stories.tsx`, and
  `{Component}.features.stories.tsx` triples have been removed across the
  React package (~50 components). Storybook config (`main.ts`,
  `manager.ts`, `preview.ts`, overrides, new `Introduction.mdx`) and the
  JS playground stories were refreshed to match.

  ## New: inline-content engine (@arvo/core)

  Framework-agnostic content model used by alerts, toasts, empty states,
  and other text surfaces:
  - `validateInlineContent`, `sanitizeLink`, `normalizeInlineContent`.
  - `renderInlineContent` + `InlineContentAdapter` /
    `RenderInlineContentOptions` adapter contract.
  - Built-in DOM adapter: `domInlineAdapter`,
    `renderInlineContentToDOM`, `replaceInlineContentInElement`.
  - Profiles: `BASIC_INLINE_NODES`, `EXTENDED_INLINE_NODES`,
    `getAllowedNodeTypes`.
  - Public node types: `TextNode`, `EmNode`, `StrongNode`, `LinkNode`,
    `CodeNode`, `KbdNode`, `AbbrNode`, `TimeNode`, `SupNode`, `SubNode`,
    `BreakNode`, `InlineNode`, `InlineContent`, `BasicInlineNode`,
    `BasicInlineContent`, `ExtendedInlineContent`, `ContentProfile`,
    `NormalizedLink`, `InlineValidationMode`, `InlineValidationOptions`.

  @arvo/react re-exports the contract and adds `reactInlineAdapter` and
  `renderInlineContentReact` for React rendering.

  ## New: ArvoEmptyState component (React + JS)

  Public empty / no-data / no-results component with illustration,
  heading, body, and primary/secondary actions. Configurable size and
  orientation, registered illustrations exposed via
  `ARVO_EMPTY_KNOWN_ILLUSTRATIONS`. Exposes `EmptyStateButtonAction`,
  `EmptyStateLinkAction`, `EmptyStateIllustration`, `EmptyStateSize`,
  `EmptyStateOrientation`. Internally consumed by Action Menu, Popover,
  and Hybrid Popover via their `emptyConfig` slot, and supported
  standalone for page- and list-level empty states.

  ## @arvo/utils additions
  - `attachTitleTruncationTooltip` (+ `TitleTruncationOptions`,
    `TitleTruncationHandle`) for native-tooltip-on-truncation behavior.
  - New panel-shell banner action types `ArvoPanelBannerButton` and
    `ArvoPanelBannerLink` on `ArvoPanelBannerConfig`.

  ## @arvo/styles additions
  - New mixins: `_inline-content.scss`, `_inline-panel-stack.scss`.
  - Expanded `_empty-state.scss`, `_form-input.scss`, `_list-item.scss`,
    `_msg-alert.scss`, `_panel-shell.scss`, plus refreshed component
    SCSS across overlays, feedback, inputs, navigation, and actions.
  - Updated SHARED-PATTERNS-REGISTRY.

  ## @arvo/tokens additions
  - New animation tokens.
  - Widened width-token scale.

  ## @arvo/ai-context

  Fully regenerated knowledge base: every per-component page, every
  category bundle (actions, datetime/display, inputs, navigation +
  feedback, overlays), the foundations bundle, `index.json`, and
  `manifest.md` are rebuilt against the new descriptors and inline-content
  contract.

  ## Tooling, agents, and docs
  - New `pnpm validate:stories` workspace script and expanded
    `tools/validate-stories.mjs`.
  - Refreshed agent prompts (`orchestrator`, `scaffolding`, `reviewer`,
    `doc-generator`, `implementation-js`, `implementation-react`,
    `test-generator`) and Cursor rules (`project-conventions.mdc`,
    `react-components.mdc`).
  - New architecture doc `06-TESTING-AND-DRIFT.md` and revised `01`,
    `05`, `11`, `13`, `14`, `15`, `16`.
  - Docusaurus updates across actions, feedback, navigation, overlays,
    and usage pages, plus `sidebars.ts`.
  - JS playground: new `codegen.ts`, foundations stories, empty-state
    stories.

### Patch Changes

- Updated dependencies
  - @arvo/core@2.0.0
  - @arvo/styles@2.0.0
  - @arvo/tokens@2.0.0
  - @arvo/utils@2.0.0

## 1.4.0

### Minor Changes

- Overlay components overhaul: Action Menu, Popover, and Hybrid Popover brought to
  Figma parity with two new shared primitives and reliable nested overlay behavior.
  - **Shared primitives (@arvo/core, @arvo/styles, @arvo/react, @arvo/js)**:
    - New `empty-state` SCSS mixin and internal `ArvoEmptyState` primitive
      (illustration, title, message, optional outline action). Consumed by all
      three overlay components; registered in `SHARED-PATTERNS-REGISTRY.json`.
    - New `createInlinePanelStack` core util for layered inline panels inside host
      overlays (push/pop/popAll, focus return, Escape pop, depth cap of 5).
      Registered as `inline-panel-stack` shared pattern with SCSS mixin.
  - **Overlay hub (@arvo/core)**: `OverlayEntry` gains optional `parentId` and
    `relation: 'submenu' | 'inline'`. `applyStackingRules` now preserves nested
    action-menu chains (floating submenus) while still evicting unrelated root
    menus. Backwards compatible when `parentId` is omitted.
  - **Action Menu (@arvo/react, @arvo/js, @arvo/styles)**: - Item model: add `switch` (replaces docs-only `checked`), `rightLink`
    (multi-line external link affordance), and `emptyConfig`. Expand
    `inlineHybridPopover` to instantiate a real `ArvoHybridPopover` via the
    inline panel stack. - Inline panel stack replaces single-layer inline popover; supports chained
    popover/hybrid panels with back navigation, X-closes-all, and hover-to-open
    (200ms delay). - Shared `ArvoEmptyState` for filter-empty and no-data states. - React parity: enter/exit fade transitions, overlay priority 15, filter keys
    `['label', 'secondaryLabel']`, type-ahead disabled when search is mounted,
    Escape-in-search clears query before closing. - Submenu panels register with overlay hub using `parentId` + `relation:
'submenu'`. - SCSS: structured loading skeleton rows, `__switch`, `__right-link`, inline
    panel stack host styles.
  - **Popover (@arvo/react, @arvo/js, @arvo/styles)**:
    - Header actions: wire `type: 'dropdown'` (`ArvoDropdownIconButton` with
      optional status badge) and `type: 'switch'` (`ArvoSwitch`).
    - Add `stickyBody` alias (forwards to `stickyHeader`) and `emptyContent`
      prop rendering shared `ArvoEmptyState` (footer auto-hides when empty).
    - React: enter/exit fade transitions and imperative handle methods
      (`renderBody`, `setLoading`, `setFooterVisible`, `updateFooterAction`,
      `reposition`). JS: add `danger` footer action variant.
  - **Hybrid Popover (@arvo/react, @arvo/js, @arvo/styles)**:
    - Wire `bannerAlert` into `__banner` slot and `search.messageAlert` (auto
      counter message via `ArvoMessageAlert`).
    - Enable conditional And/Or toggle for single-select variant.
    - Render `item.icon` in filter option rows.
    - Recursive inline nesting via `createInlinePanelStack`; new `item.inline`
      config (`hasInline` deprecated with one-time console warning). Wire `parent`
      prop for chain coordination.
    - Delete local `HybridPopover/EmptyState.tsx`; consume shared `ArvoEmptyState`.
  - **Documentation & playground**:
    - Descriptors, Docusaurus MDX, and `@arvo/ai-context` regenerated for all
      three components.
    - `apps/arvo-js-playground` stories extended with switch items, inline-hybrid
      chains, header dropdown/switch, banner alert, message alert, empty states,
      viewport-edge placements, and keyboard navigation scenarios.

  **Migration notes**:
  - `MenuItemData.checked` removed from the public contract (was documented but
    never implemented). Use `switch` for in-item toggles.
  - `HybridPopoverItem.hasInline` is deprecated; use `item.inline` config object.

### Patch Changes

- Updated dependencies
  - @arvo/core@1.4.0
  - @arvo/styles@1.4.0
  - @arvo/utils@1.4.0
  - @arvo/tokens@1.4.0

## 1.3.1

### Patch Changes

- fix(js): register `ArvoDatePicker` as a jQuery plugin (`$.fn.arvoDatePicker`)

  `ArvoDatePicker` was exported from `@arvo/js` and worked as a vanilla JS class
  (`ArvoDatePicker.initialize(el, opts)`), but it was missing from the jQuery
  plugin registry in `packages/js/src/plugin.ts`. Sibling pickers
  (`ArvoTimePicker`, `ArvoDateTimePicker`, `ArvoDateRangePicker`) were all
  registered, so this was an oversight from the date-time suite commit, not an
  intentional surface decision.

  After this fix `$('#host').arvoDatePicker({...})` works on the jQuery stack,
  the `JQuery` interface augmentation declares `arvoDatePicker`,
  `registerArvoPlugins($)` and `import '@arvo/js/auto'` install it
  automatically, and `$('#host').data('arvoDatePicker').<method>()` follows
  the same convention as every other Arvo component.

  The `@arvo/ai-context` manual sync list `JQUERY_PLUGIN_COMPONENTS` in
  `packages/ai-context/scripts/generate.mjs` is updated alongside this change
  so the per-component KB bundle stops emitting the "no `$.fn.arvoDatePicker`
  plugin is registered" stub for `ArvoDatePicker`.
  - @arvo/core@1.3.1
  - @arvo/styles@1.3.1
  - @arvo/tokens@1.3.1
  - @arvo/utils@1.3.1

## 1.3.0

### Minor Changes

- b30c3c8: Drift-audit resolution (phases 9-13): closes every remaining actionable item
  from `DRIFT-AUDIT-RESOLUTION.md` except the v2 scoped-prop-bag refactor.
  - **Toast (@arvo/react)**: `useToast().close(id)` and `closeAll()` now fire each
    toast''s `onClose` callback and dispatch `toast:close` on the container with
    `reason: ''programmatic''`, matching the existing `@arvo/js` `ArvoToast`
    behavior. The `Escape` and fade-completion paths now also route through
    the central `removeToast` so they fire `onClose` consistently. The
    Storybook MDX, descriptor, and site docs are aligned with the real
    instance API (no phantom `setPosition`, `toast:show`, or static-class
    surface).
  - **JS `defaultX` parity (@arvo/js)**: added uncontrolled-mode defaults that
    mirror the React `useControllableState` pattern to six components --
    `ArvoButton.defaultSelected`, `ArvoTabstrip.defaultSelectedId`,
    `ArvoSearch.defaultValue`, `ArvoListbox.defaultValue`,
    `ArvoDropdownButton.defaultValue`, `ArvoSplitButton.defaultValue`. The
    options are additive; existing call sites that pass the controlled
    prop (or none) are unchanged.
  - **Checkbox abbreviation rename (@arvo/styles, @arvo/react, @arvo/js)**:
    the BEM block is now `arvo-cb` (matching the project convention) instead
    of `arvo-checkbox`. CSS custom properties (`--arvo-checkbox-box-size`,
    `--arvo-checkbox-icon-size`) renamed to `--arvo-cb-*`. The SCSS partial
    moved from `_arvo-checkbox.scss` to `_arvo-cb.scss`. Internal-only DOM
    change; no public TypeScript API was renamed.
  - **Documentation (@arvo/docs)**: stale HTML reference snippets in the
    Storybook docs for Tabstrip, ActionMenu, DropdownButton,
    DropdownIconButton, Breadcrumb, and Search rewritten to match the
    actual rendered DOM. New site MDX pages added for Textbox,
    DropdownButton, and DropdownIconButton with sidebar registration.

- b30c3c8: Release polish for the v1.2.0 cut on top of the date-time component suite
  (commit 74d871c) and the drift-audit resolution. No public API removals;
  all changes are additive or behavior-aligning.
  - **Test coverage fill-in (@arvo/js, @arvo/react)**: added `.test.ts(x)`
    cases across the date-time suite (`DatePicker`, `DateRangePicker`,
    `DateTimePicker`, `TimePicker`) and the actions suite (`Button`,
    `DropdownButton`, `DropdownIconButton`, `SplitButton`, `SplitIconButton`,
    `Tabstrip`, `Listbox`, `Search`, `FabButton`, `IconButtonLink`) covering
    loading state, disabled state, value/selection round-trips, and keyboard
    paths that previously had behavior but no assertions.
  - **Component polish (@arvo/js, @arvo/react)**: small additive prop and
    behavior fixes in `DatePicker`, `DateRangePicker`, `DateTimePicker`,
    `TimePicker`, `DropdownButton`, `DropdownIconButton`, `SplitButton`,
    `SplitIconButton`, `Textarea`, `FabButton`, and `IconButtonLink`. No
    breaking renames or removals.
  - **Descriptor + docs alignment**: descriptors for most components
    resynced with the shipped React/JS surfaces (notably `calendar.json`,
    `date-range-picker.json`, `drawer.json`, `message-alert.json`,
    `segmented-control.json`, `button.json`, plus minor touches across the
    rest). Site MDX and Storybook `.docs.mdx` updated to match.
  - **Styles (@arvo/styles)**: minor `_arvo-textarea.scss` polish and
    `_index.scss` re-export update following the `_arvo-checkbox.scss` →
    `_arvo-cb.scss` rename already captured in the drift changeset.

### Patch Changes

- Updated dependencies [b30c3c8]
- Updated dependencies [b30c3c8]
  - @arvo/styles@1.3.0
  - @arvo/core@1.3.0
  - @arvo/utils@1.3.0
  - @arvo/tokens@1.3.0

## 1.0.0-rc.3

### Major Changes

- Add five new components and a shared panel-shell pattern.

  ### New components
  - **BannerAlert** (`arvo-bnr-alert`) -- full-width banner-style alert with severity variants, optional icon, dismiss action, and slot for inline actions. Available in both React (`ArvoBannerAlert`) and JS (`ArvoBannerAlert`) packages.
  - **Drawer** (`arvo-drw`) -- top/bottom/left/right edge-mounted overlay panel with backdrop, focus trap, and scroll lock. Composes the new `panel-shell` primitive. Available as `ArvoDrawer` in React and JS.
  - **SidePanel** (`arvo-sp`) -- non-modal, push/overlay side panel for persistent inspectors and detail views. Composes the new `panel-shell` primitive. Available as `ArvoSidePanel` in React and JS.
  - **SplitButton** (`arvo-split-btn`) -- primary action button paired with a dropdown trigger for related actions. Available as `ArvoSplitButton` in React and JS.
  - **SplitIconButton** (`arvo-split-icon-btn`) -- icon-only variant of SplitButton for compact toolbars. Available as `ArvoSplitIconButton` in React and JS.

  ### Shared infrastructure
  - **`@arvo/styles` `panel-shell` mixin** -- shared SCSS pattern for any sliding/edge-mounted panel surface (header, body, footer regions; size tokens; transition timing). Consumed by Drawer and SidePanel.
  - **`@arvo/utils` `panel-shell` helper** -- shared DOM utilities for panel composition (region querying, focusable-content detection).
  - **`@arvo/core` `page-scroll-lock`** -- overlay-hub-aware scroll lock primitive used by Drawer and any future modal surface that needs to suppress page scroll without layout shift.

  All new components follow the standard interactive-component contract: `disabled`, `size`, `variant`, and `loading` props where applicable, BEM-prefixed class names, CSS-variable theming, and the dual-purpose getter/setter method API in the JS package.

### Patch Changes

- Updated dependencies
  - @arvo/core@1.0.0-rc.3
  - @arvo/styles@1.0.0-rc.3
  - @arvo/utils@1.0.0-rc.3
  - @arvo/tokens@1.0.0-rc.3

## 1.0.0-dev.2

### Major Changes

- Rename the design system from **o9ds** to **arvo**. This is a breaking, repo-wide rename of the npm scope, public symbols, CSS classes, custom properties, SCSS variables, data attributes, and jQuery plugin surface.

  ## Migration recipe

  Run a find-and-replace pass across your project (apply in this order to avoid double-replacements):

  ```text
  @o9ds/                -> @arvo/                  # npm scope on every package
  O9{Name}              -> Arvo{Name}              # React components, JS classes, exported symbols
  O9{Name}Props         -> Arvo{Name}Props         # React props types
  O9{Name}Options       -> Arvo{Name}Options       # JS options types (also ...Ref, ...Handle, ...CloseReason)
  $.fn.o9{Name}         -> $.fn.arvo{Name}         # jQuery plugin methods
  $(el).data('o9{Name}')-> $(el).data('arvo{Name}')# jQuery .data() keys
  registerO9Plugins     -> registerArvoPlugins     # plus any setupO9*/...O9... helpers
  o9ds-                 -> arvo-                   # every BEM CSS class
  --o9ds-               -> --arvo-                 # every CSS custom property
  $o9ds-                -> $arvo-                  # every SCSS Sass variable
  data-o9ds-            -> data-arvo-              # every data attribute
  ```

  Distributed stylesheet entry points have also been renamed:

  ```text
  @o9ds/styles/css      -> @arvo/styles/css        # dist/arvo.css     (was dist/o9ds.css)
  @o9ds/tokens/css      -> @arvo/tokens/css        # dist/arvo-tokens.css (was dist/o9ds-tokens.css)
  ```

  ## Unchanged (still o9-branded)

  The following are **not** renamed and should be left as-is in code:
  - `o9con-*` icon font class names (e.g. `o9con-search`, `o9con-chevron-down`).
  - `o9illus*` illustration asset names.
  - `--o9-font-family` and the `o9Sans` font family.
  - Theme names: `o9default`, `o9dark`, `o9black`, `o9white`.
  - Custom event names (`btn:loading`, `hpop:close`, `modal:close`, etc.).
  - Component abbreviations in selectors (`btn`, `cb-grp`, `hpop`, etc.).
  - Folder paths under `packages/` and `apps/` and the repo directory name `o9-design-system`.
  - "o9 Solutions" copyright/footer strings; only the design-system brand string `"o9 Design System"` becomes `"Arvo Design System"`.

  ## Installation

  After updating imports, refresh your lockfile so workspace links resolve to the new scope:

  ```bash
  pnpm install
  # or
  npm install
  # or
  yarn install
  ```

### Patch Changes

- Updated dependencies
  - @arvo/core@1.0.0-dev.2
  - @arvo/styles@1.0.0-dev.2
  - @arvo/tokens@1.0.0-dev.2
  - @arvo/utils@1.0.0-dev.2
