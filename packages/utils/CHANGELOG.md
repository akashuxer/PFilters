# @arvo/utils

## 2.2.5

### Patch Changes

- Updated dependencies [485bcc3]
  - @arvo/core@2.2.5

## 2.2.4

### Patch Changes

- `panel-shell` and `overlay-footer` utilities updated for the
  three-panel architecture.

  ### Changed
  - **`panel-shell`** — internal API adjusted for the new `PanelBase` primitive that `ArvoPanel`, `ArvoNavPanel`, and `ArvoFilterPanel` all compose. No consumer-facing utility function signature changes.
  - **`overlay-footer`** — minor refinements supporting the panel footer chrome shared across the panel family.

- Updated dependencies
  - @arvo/core@2.2.4

## 2.2.3

### Patch Changes

- @arvo/core@2.2.3

## 2.2.2

### Patch Changes

- `panel-shell` gains two new title slots so higher-level consumers
  (currently `ArvoPanel`) can inject pre-title / post-title chrome
  without teaching the shared shell about component-specific concerns
  like status pips or badge counters.

  ### New: `PanelShellOptions.titleLeading` / `titleTrailing`

  Optional `HTMLElement | null` fields (both default to `null`) that
  are mounted inside `__hdr-lft` at construction time:
  - `titleLeading` -- rendered as the FIRST child of `__hdr-lft`
    (after the back button when present, before `__title`). Used by
    `ArvoPanel` to inject the leading title icon
    (`<i class="arvo-pnl__icon o9con-{name}">`).
  - `titleTrailing` -- rendered as the LAST child of `__hdr-lft`
    (after `__title`). Used by `ArvoPanel` to inject the trailing
    `ArvoStatus` + `ArvoBadge` cluster.

  Both wrappers are always mounted (as `.__title-leading` /
  `.__title-trailing` spans) so the shell can swap their contents
  dynamically without having to know the header's DOM ordering.
  Empty wrappers are hidden by the `panel-shell` mixin
  (`&:empty { display: none }`) so unused slots contribute no layout.

  ### New: `PanelShellInstance.setTitleLeading()` / `setTitleTrailing()`

  ```ts
  panelShell.setTitleLeading(el: HTMLElement | null): void;
  panelShell.setTitleTrailing(el: HTMLElement | null): void;
  ```

  Runtime setters that replace the current leading / trailing element
  in place. Passing `null` clears the slot. Used by `ArvoPanel` to
  support `setIcon()` and future dynamic status / badge swaps.

  No breaking changes -- all new fields are optional and default to
  a no-op.

  ### Patch Changes
  - Updated dependencies
    - @arvo/core@2.2.2

## 2.2.1

### Patch Changes

- No utility changes. Version-locked bump to keep the published
  `@arvo/*` ecosystem aligned with the v2.2.1 release of `@arvo/core`,
  `@arvo/styles`, `@arvo/react`, and `@arvo/js`.

  ### Patch Changes
  - Updated dependencies
    - @arvo/core@2.2.1

## 2.2.0

### Minor Changes

- New overlay-footer fit utility, BREAKING removal of the legacy
  `createIndicator` helper, and a re-export of the `@arvo/core` keyboard
  shortcut helpers for ergonomic consumption.

  ### New: `overlay-footer` fit utility

  `clampFooterActions(actions, maxCount = 3)` and
  `attachOverlayFooterFit(container, options)` implement the shared
  cross-overlay 3-action cap and the equal-column flex sizing used by
  Popover / Hybrid Popover / Side Panel / Drawer / Alert Dialog /
  Window / Date Range Picker footers:
  - `clampFooterActions` runs at the data layer to enforce the 3-action
    contract before render.
  - `attachOverlayFooterFit` watches the rendered footer with a
    `ResizeObserver` and grows the equal-column flex basis when a label
    would otherwise truncate; returns a disposer to detach the observer.

  Paired with the new `overlay-footer-actions` SCSS pattern in
  `@arvo/styles` (see that package's changelog).

  New public exports: `clampFooterActions`, `attachOverlayFooterFit`,
  `ClampFooterActionsOptions`, `OverlayFooterFitOptions`,
  `OverlayFooterFitHandle`.

  ### BREAKING: Indicator helper removed

  The `createIndicator` / `updateIndicator` / `removeIndicator` DOM
  factories (and the `IndicatorOptions` / `IndicatorVariant` /
  `IndicatorSize` types) have been removed. They were the JS surface
  behind the deprecated `ArvoBadgeAlert` component, which was itself
  removed in this release (see the `@arvo/react` and `@arvo/js`
  changelogs).

  Replacements depend on the use case:

  | Old usage                            | v2.2.0 replacement                                                |
  | ------------------------------------ | ----------------------------------------------------------------- |
  | Count / dot pinned to a host element | `ArvoBadge` (React + JS) or the shared `corner-host` SCSS pattern |
  | Status pip pinned to a host element  | `ArvoStatus` (React + JS) or `corner-host`                        |
  | Inline alert text                    | `ArvoMessageAlert` (already shipped in v2.0)                      |

  Both `ArvoBadge` and `ArvoStatus` expose the same canonical slot
  config shape (`ArvoBadgeConfig` / `ArvoStatusConfig`), so consumers
  that previously hand-rolled the indicator API can adopt one of these
  with a single Pick<> on the host component.

  ### Convenience re-exports: keyboard shortcut helpers

  The keyboard shortcut helpers added to `@arvo/core` in this release
  (`getOperatingSystem`, `isMacOS`, `isModKey`, `parseShortcut`,
  `matchesShortcut`, `formatShortcutDisplay`, `ArvoOperatingSystem`,
  `ParsedShortcut`) are now re-exported from `@arvo/utils`. The helpers
  physically live in `@arvo/core` to avoid an `@arvo/utils` ->
  `@arvo/core` circular import via `tooltip-manager`; the re-export lets
  consumers that already import other helpers from `@arvo/utils` keep a
  single import surface.

  ### Existing utilities (unchanged surface)

  `createCharCounter` / `updateCharCounter` / `formatCharCount`,
  `attachTitleTruncationTooltip`, and the `panel-shell` helpers
  (`runItemFilter`, `formatMatchCountMessage`, `validateHeaderAction`,
  plus the `ArvoPanel*` types) carry forward with their v2.1.0 APIs.

  ### Patch Changes
  - Updated dependencies
    - @arvo/core@2.2.0

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

## 1.4.0

### Patch Changes

- Updated dependencies
  - @arvo/core@1.4.0

## 1.3.1

### Patch Changes

- @arvo/core@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [b30c3c8]
  - @arvo/core@1.3.0

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
