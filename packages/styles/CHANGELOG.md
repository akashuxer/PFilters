# @arvo/styles

## 2.2.5

### Patch Changes

- @arvo/tokens@2.2.5

## 2.2.4

### Patch Changes

- SCSS updates supporting the panel family consolidation and broad
  component maintenance.

  ### Changed
  - **`_panel-shell.scss` mixin** — updated for the three-panel architecture (`ArvoPanel`, `ArvoNavPanel`, `ArvoFilterPanel`); shared header/footer/sticky chrome is now driven by `PanelBase` with panel-type-specific body partials.
  - **`_arvo-nav.scss`** — new compact icon-rail mode (`.arvo-nav--compact`) consumed by `ArvoNavPanel`. Label collapses; icon-only items receive `title` for hover identification.
  - **`_arvo-pnl.scss`** — trimmed to the reduced general-purpose shell; navigation and filter body-template rules moved to the new `ArvoNavPanel` / `ArvoFilterPanel` partials.
  - **`_arvo-btn.scss` / `_arvo-btn-grp.scss` / `_arvo-fab-btn.scss`** — minor token alignments and split-button surface refinements.
  - **`_form-input.scss`** — internal cleanup to the actions-overlay pattern; no consumer-facing class or variable changes.
  - Various date-time, overlay, feedback, and input component partials refreshed for consistency with the panel rework. No new public BEM classes or CSS variables removed.

- Updated dependencies
  - @arvo/tokens@2.2.4

## 2.2.3

### Patch Changes

- @arvo/tokens@2.2.3

## 2.2.2

### Patch Changes

- Targeted polish across three SCSS partials. No new mixins, no
  breaking changes; existing class names and CSS variables are
  unchanged.

  ### Panel Shell (`_panel-shell.scss`)

  New title slot rules to back the header icon + status + badge wiring
  that just landed in `@arvo/react` and `@arvo/js` v2.2.2:
  - `.#{$block}__title-leading` / `.#{$block}__title-trailing` --
    always-mounted `inline-flex` wrapper hosts for the leading icon
    and the trailing status + badge cluster. `:empty` collapses them
    to `display: none` so unused slots contribute no layout to the
    parent `__hdr-lft` gap.
  - `.#{$block}__title-trailing { gap: $arvo-space-4 }` -- consistent
    spacing between a status and badge when both are present.
  - `.#{$block}__icon` -- the leading 20x20 o9con glyph rendered
    before the title. Uses the secondary icon color token so the
    glyph reads as chrome rather than an active control.

  Any consumer of the `arvo-panel-shell` mixin (currently
  `arvo-pnl`) automatically picks these slots up. Consumers who do
  not populate the slots see zero layout impact.

  ### Avatar (`_arvo-avt.scss`) -- logo background fix

  The `--logo--filled` and `--logo--svg` modifier rules no longer
  force `--arvo-avt-bg: transparent` (and, for `--svg`,
  `--arvo-avt-border-width: 0`). Those overrides were preventing
  consumers from theming the surface of a logo-mode avatar
  (background color, border, contrast fill on light-on-dark
  arrangements). The transparency / borderless defaults are still
  the norm because `--arvo-avt-bg` is unset by default; consumers
  who want the earlier behavior can set the variables explicitly
  from the calling context. No visual change on the default theme.

  ### Breadcrumb (`_arvo-bc.scss`) -- current item cursor

  The current-page inner wrapper now declares `cursor: default` so
  hovering the trailing (non-link) breadcrumb segment shows the
  default arrow instead of the text I-beam that leaked through from
  the parent list. Purely a cursor tweak; no color or spacing
  change.

  ### Patch Changes
  - @arvo/tokens@2.2.2

## 2.2.1

### Patch Changes

- Targeted polish for the v2.2.1 cut. No new mixins, no breaking
  changes; existing class names and CSS variables are unchanged.

  ### DateRangePicker (`_arvo-drp.scss`)
  - `__field-input` now declares `flex: 1 1 0 !important` so the field
    grows correctly even when a host page applies a global flex reset
    (Bootstrap-style `.row > *`, Kendo-style overrides) that previously
    intermittently collapsed the input. No visual change in isolation;
    the `!important` only takes effect inside hosts that already
    override the value.

  ### AlertDialog (`_arvo-alert-dlg.scss`) + Window (`_arvo-win.scss`)
  - The fallback `z-index: var(--arvo-z-popover, 1000)` on the outer
    root is now documented as a brief pre-registration cover. The
    authoritative value is painted inline by the overlay hub on every
    stack change via the new `attachWrapperElement` API in `@arvo/core`
    -- the root tracks the panel's hub-assigned z so consumer
    `overlayHub.configure({ zIndexBase })` tuning lifts the whole
    stacking context. No SCSS behavior change; comment-only update
    that explains the runtime contract.

  ### Patch Changes
  - @arvo/tokens@2.2.1

## 2.2.0

### Minor Changes

- Massive expansion to back the v2.2.0 component wave: 11 new component
  SCSS partials, 15+ new / promoted shared mixins, the consolidated
  motion token surface, BREAKING removal of the indicator mixin, and
  reconciled overlay / panel-shell / form-input pipelines.

  ### New component SCSS partials

  Each ships under `packages/styles/src/components/<category>/` and is
  imported by the matching consumer in `@arvo/react` / `@arvo/js`:

  | Block                                                                    | Path                                                                                                            | Component                                                |
  | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
  | `arvo-bdg`                                                               | `feedback/_arvo-bdg.scss`                                                                                       | Badge (replaces `arvo-bdg-alert`)                        |
  | `arvo-sts`                                                               | `feedback/_arvo-sts.scss`                                                                                       | Status                                                   |
  | `arvo-loader`                                                            | `feedback/_arvo-loader.scss`                                                                                    | Loader                                                   |
  | `arvo-avt`, `arvo-avt-grp`                                               | `feedback/_arvo-avt.scss`, `_arvo-avt-grp.scss`                                                                 | Avatar / Avatar Group                                    |
  | `arvo-ctx-help`                                                          | `feedback/_arvo-ctx-help.scss`                                                                                  | Context Help                                             |
  | `arvo-chip`, `arvo-chip-list`                                            | `inputs/_arvo-chip.scss`, `_arvo-chip-list.scss`                                                                | Chip / ChipList                                          |
  | `arvo-multi-sel`                                                         | `inputs/_arvo-multi-sel.scss`                                                                                   | Multi-Select                                             |
  | `arvo-option-list`                                                       | `overlays/_arvo-option-list.scss`                                                                               | Option List (internal primitive)                         |
  | `arvo-tree`                                                              | `data-display/_arvo-tree.scss`                                                                                  | Tree View                                                |
  | `arvo-acc`, `arvo-acc-item`                                              | `data-display/_arvo-acc.scss`, `_arvo-acc-item.scss`                                                            | Accordion                                                |
  | `arvo-list`                                                              | `data-display/_arvo-list.scss`                                                                                  | List / ListItem                                          |
  | `arvo-nav`                                                               | `navigation/_arvo-nav.scss`                                                                                     | Nav / NavItem                                            |
  | `arvo-spl`                                                               | `layout/_arvo-spl.scss`                                                                                         | Splitter                                                 |
  | `arvo-toggle-btn`, `arvo-disc-btn`                                       | `actions/_arvo-toggle-btn.scss`, `_arvo-disc-btn.scss`                                                          | Toggle Button / Disclosure Button                        |
  | `arvo-adv-search`                                                        | `inputs/_arvo-adv-search.scss`                                                                                  | Advance Search                                           |
  | `arvo-context-menu`, `arvo-rtip`, `arvo-pnl`, `arvo-win`, `arvo-dd-tree` | `overlays/_arvo-context-menu.scss`, `_arvo-rtip.scss`, `_arvo-pnl.scss`, `_arvo-win.scss`, `_arvo-dd-tree.scss` | Context Menu, Rich Tooltip, Panel, Window, Dropdown Tree |
  | `arvo-cal-drop`, `arvo-dt-drop`, `arvo-cal-rng-drop`, `arvo-tp-drop`     | `overlays/_arvo-cal-drop.scss` etc.                                                                             | Layer-4 date-time dropdown primitives (internal)         |

  ### New / promoted shared SCSS mixins

  Registered in `SHARED-PATTERNS-REGISTRY.json` -- the manifest the
  pipeline checks before allowing a component build.
  - **`corner-host` (NEW; replaces ad hoc `status-host`)** -- one-line
    positioning context (`position: relative;`) for components that
    pin an `ArvoStatus` OR `ArvoBadge` to their top-right or
    bottom-right corner. A `status-host` backwards-compat alias
    forwards to `corner-host` and will be removed in a future minor.
    Consumed by Badge, Button, Toggle Button, Chip.
  - **`form-input-surface` (NEW)** -- `--surface-filled` (default;
    no-op documents the default) and `--surface-base` (swaps the field
    background to `--arvo-color-s-layer-01`) for the new `surface`
    enum prop on Textbox, Textarea, Number Input, Select, Combobox,
    Multi-Select, Date / Time / DateTime / Date Range Pickers.
  - **`form-input-affix` (NEW)** -- inline-flex affix slots
    (`form-input-affix-ico` / `-prefix` / `-prefix-sep` / `-suffix`)
    consumed by Textbox / Textarea / Number Input / Select / Combobox.
    Eliminates the per-component absolute-positioning + ResizeObserver
    padding dance and gives every input one identical BEM contract.
  - **`list-item` (NEW)** -- base layout, single / multi-line, states,
    leading + trailing slots, selection control, drag handle, actions
    cluster, on-hover actions, and search-match highlight. Consumed by
    Action Menu, Option List, List, Listbox, Tree View. Composition
    consumers (Select, Combobox, Multi-Select, Dropdown Button, Time /
    DateTime Picker, Hybrid Popover) are tracked separately in the
    registry.
  - **`list-group` (NEW)** -- section headers, 1px dividers, and the
    8px dashed `list-group-divider-dashed` for grouped lists, menus,
    and dropdown panels.
  - **`panel-shell` (NEW first-class pattern)** -- header / sticky
    pre-body / scrollable body / items + filter pipeline / empty +
    skeleton states / footer actions. Parametrized on parentBlock so
    consumers render their own BEM block (`arvo-sp`, `arvo-drw`,
    `arvo-pnl`). Owns the closed-whitelist header-action types
    (`'btn' | 'dropdown' | 'split' | 'switch' | 'checkbox'`).
  - **`overlay-footer-actions` (NEW)** -- flex layout for action rows
    in overlay-style component footers. Labeled buttons grow with
    `flex: 1 1 0`; icon-only controls (`.arvo-icon-btn`, `.arvo-fab-btn`,
    `.arvo-dd-icon-btn`, `.arvo-split-icon-btn`, `.arvo-btn--icon-only`,
    `[data-icon-only="true"]`) stay at their natural width with
    `flex: 0 0 auto`. Variant-driven order rule keeps primary / danger
    rightmost regardless of source order. Consumers retain ownership
    of padding + gap. Paired with the `@arvo/utils/overlay-footer` fit
    helpers.
  - **`resize-handle` (NEW)** -- visual chrome (corner handles, hover /
    focus-within reveal, `.is-resizing` pin) parametrized on the
    consumer's BEM block. Paired with `@arvo/core/createResizeHandle`.
    Consumed by Hybrid Popover and Popover.
  - **`empty-state` (now standardized 96 / 124 / 224 px)** -- centered
    layout with illustration, title (16 px medium), message (14 px
    regular), and optional outline action button. Consumed by Action
    Menu, Popover, Hybrid Popover via their `emptyConfig` slot and
    `ArvoEmptyState` directly.
  - **`form-input-animated-border`** -- structural primitive
    `form-input-animated-border-base` plus the focus-only consumer
    mixin `form-input-animated-border-focus-only`. The orphan
    `form-input-animated-border-complete` mixin from earlier
    explorations was removed.
  - **`picker-field-actions`** -- wrapper around
    `form-input-actions-overlay` for the picker-specific right-side
    cluster (clear button, inline error icon, trigger icon-button).
  - **`tree-nav`**, **`horizontal-overflow`**, **`drag-handle`**,
    **`overlay-mask`**, **`title-truncation-tooltip`** -- new registry
    entries that point at the matching `@arvo/core` / `@arvo/utils`
    engines (see those packages' changelogs).
  - **`form-label`** -- documented as a true atomic component (React +
    JS class) with the legacy `createFormLabel` util removed. Default
    size is now `sm` (12 px); the 14 px variant is used by Checkbox /
    Radio / Switch / their groups in their `lg` modifier.
  - **`msg-alert`** -- vocabulary refreshed to `negative` /
    `positive` / `warning` / `info` / `neutral` / `block` (previously
    `error` / `success` / ...). Used by Textbox, Textarea, Number
    Input, Search, Select, Combobox, all four pickers, Checkbox /
    Group, Radio / Group, Panel Shell, Side Panel, Drawer.

  ### BREAKING: `_indicator.scss` mixin removed

  The standalone `arvo-indicator` block has been removed alongside the
  BadgeAlert component and the `createIndicator` factory in
  `@arvo/utils`. Replace with one of:
  - `arvo-bdg` (count + dot + status variants) consumed via `ArvoBadge`.
  - `arvo-sts` (status pip) consumed via `ArvoStatus`.
  - The `corner-host` mixin on any custom host block.

  ### Inline-content mixin

  Continues to be emitted ONCE globally from `base/_global.scss` (rules
  are identical for every consumer and use relative `em` sizing). The
  global rule covers Toast, Banner Alert, Alert Dialog, and Message
  Alert message slots.

  ### Inline-panel-stack mixin
  - Adds host styles for Action Menu submenus and Hybrid Popover
    inline panels (depth cap 5, with the active panel slotted at the
    top of the stack).

  ### Tabstrip (overlays + navigation)
  - Animated `__indicator` element shared by both `primary` and
    `secondary` variants (`prefers-reduced-motion` aware) sitting at
    z-index 2; active tab raises to z-index 3.
  - No-layout-shift label slot: `__tab-lbl` wraps a `__tab-lbl-text`
    child; the `data-label` ghost pre-allocates medium-weight width so
    selection no longer shifts layout.
  - Drag clone constrained to the pinned / unpinned group bounds.

  ### Toast / Message Alert / Banner Alert
  - Toast: `__link` wrapper removed; `.arvo-lnk` is a direct child of
    `__content` with SCSS truncation targeting
    `.arvo-toast > .arvo-toast__content > .arvo-lnk`. New `__text`
    wrapper (`flex-column gap-4`) groups title + message. Container
    gap 8 -> 12; shadow token `arvo-shadow-left` -> `arvo-shadow-center`;
    `align-items: flex-start`; icon font-size uses `$arvo-icon-16`.
  - Message Alert: dismiss affordance upgraded to a tertiary xs
    `ArvoIconButton`; `icon` prop is now restricted to `type="neutral"`.
  - Banner Alert: dismiss + close affordances aligned with the new icon
    button surface.

  ### Drawer / Side Panel / Window
  - Drawer drops the unused `side-top` / `side-bottom` modifiers and
    the `--mask-opacity` / `--mask-blur` CSS variables (matching the
    descriptor cleanup). Mask visuals routed through the new
    `createMask` primitive in `@arvo/core`.
  - Side Panel + Drawer wire `closeOnOutsideClick` (canonical) /
    `closeOnMaskClick` (deprecated alias) through the panel-shell mask.
  - Window owns its own resize + drag chrome via the new `resize-handle`
    and `drag-handle` patterns.

  ### Patch Changes
  - Updated dependencies
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
  - @arvo/tokens@2.0.0

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

- @arvo/tokens@1.4.0

## 1.3.1

### Patch Changes

- @arvo/tokens@1.3.1

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
  - @arvo/tokens@1.0.0-dev.2
