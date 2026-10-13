# @arvo/tokens

## 2.2.5

## 2.2.4

### Patch Changes

- Minor token adjustments supporting the panel family consolidation.

  ### Changed
  - **`_animation.scss`** — timing token refinements for panel expand/collapse transitions.
  - **`_root.scss`** — CSS custom property additions for the nav compact-mode width.
  - **`_widths.scss`** — panel-width token range extended for the new `ArvoNavPanel` compact and expanded states.

## 2.2.3

## 2.2.2

### Patch Changes

- No token changes. Version-locked bump to keep the published
  `@arvo/*` ecosystem aligned with the v2.2.2 release of
  `@arvo/react`, `@arvo/js`, `@arvo/styles`, `@arvo/utils`,
  `@arvo/core`, and `@arvo/assets`.

## 2.2.1

### Patch Changes

- No token changes. Version-locked bump to keep the published
  `@arvo/*` ecosystem aligned with the v2.2.1 release of `@arvo/core`,
  `@arvo/styles`, `@arvo/react`, and `@arvo/js`.

## 2.2.0

### Minor Changes

- Motion token system overhaul, width additions for new components, and dynamic
  border/effect/illustration token surface for the v2.2.0 component wave.

  ### Motion tokens (`_animation.scss`)

  The motion surface was rewritten end-to-end to back the new animated
  components and bring naming in line with the rest of the token set. Six
  shared durations now anchor every motion token: `$arvo-duration-instant`
  (120 ms), `$arvo-duration-fast` (150 ms), `$arvo-duration-base` (180 ms),
  `$arvo-duration-medium` (220 ms), `$arvo-duration-moderate` (280 ms, new),
  and `$arvo-duration-slow` (300 ms). Four standard easings ship alongside:
  `$arvo-ease-standard`, `$arvo-ease-emphasized`, `$arvo-ease-simple`, and
  `$arvo-ease-in-out`.

  Existing legacy tokens were renamed to the canonical `transition` / `motion`
  prefixes (BREAKING for direct token consumers):
  - `$arvo-motion-expand` -> `$arvo-motion-transition-expand`
  - `$arvo-motion-popup` -> `$arvo-transition-popup`
  - `$arvo-motion-dialog` -> `$arvo-transition-dialog`
  - `$arvo-motion-dialog-backdrop` -> `$arvo-transition-dialog-backdrop`

  Dozens of motion tokens were added to back the new component wave:
  - **Loader**: `$arvo-motion-loader-dot`, `$arvo-motion-loader-circle`,
    `$arvo-motion-loader-square`, `$arvo-motion-loader-skeleton`.
  - **Tabstrip / Button Group**: `$arvo-motion-tab`,
    `$arvo-motion-segmented-control`, `$arvo-motion-tab-panel`,
    `$arvo-motion-scrollspy`, `$arvo-motion-nav-indicator`,
    `$arvo-motion-nav-item`.
  - **Nested content** (Popover, Window, Drawer): `$arvo-motion-nested-content`,
    `$arvo-motion-nested-footer`, plus `$arvo-transform-nested-*` directional
    transforms.
  - **Status / Counter / Chip**: `$arvo-motion-status-indicator`,
    `$arvo-motion-status-pulse`, `$arvo-motion-counter`,
    `$arvo-motion-chip-remove`, `$arvo-motion-chip-toggle`,
    `$arvo-motion-chip-filter-content`.
  - **Avatar / Card uplift**: `$arvo-motion-avatar-uplift`,
    `$arvo-motion-card-uplift`, with paired `$arvo-transform-*-hover` /
    `-rest` and `$arvo-shadow-avatar-uplift-*` tokens.
  - **Nova AI surface**: `$arvo-motion-nova-fill`, `-breathe`, `-gradient`,
    `-border`, `-toggle`.
  - **Slider / Progress / Stepper / Carousel**: full set including
    determinate + indeterminate timings (`$arvo-motion-progress-linear`,
    `-circular`, `-gauge`, `-linear-indeterminate`,
    `-circular-indeterminate`, `$arvo-motion-stepper-connector`, `-marker`,
    `-label`, `$arvo-motion-carousel-slide`, `-dot`,
    `$arvo-motion-slider`, `-thumb`).
  - **Pane / Launchbar / Split view**: `$arvo-motion-pane`,
    `$arvo-transform-pane-{open,closed-right,closed-left,closed-top,closed-bottom}`,
    `$arvo-motion-launchbar-drawer-open` / `-close`,
    `$arvo-delay-launchbar-{open,switch,close}`,
    `$arvo-motion-split-layout`, `-detail-panel`, `-content`.
  - **Toggle switch**: `$arvo-transition-switch-slide` /
    `$arvo-transition-toggle-slide`.
  - **Toast duration scale**: `$arvo-toast-duration-{positive,neutral,info,
warning,negative,block}` (positive/neutral 4 s, info 5 s, warning 6 s,
    negative 8 s, block persistent) replaces the previous single-duration
    constant.

  The deprecated alias block from v2.1.0 was removed.

  ### Width tokens (`_widths.scss`)
  - `$arvo-opt-list-hmax` (320 px) for the new `ArvoOptionList` primitive
    consumed by Select / Combobox / MultiSelect.
  - `$arvo-switch-track-{lg,sm}` + `$arvo-switch-thumb-size-{lg,sm}` to back
    the new ArvoSwitch `sm` (24 x 14 + 10 px thumb) and `lg` (28 x 16 +
    12 px thumb) size modifiers.

  ### Border, effect, and illustration tokens
  - `_borders.scss`: revisions for the new outlined / nova / inline button
    variants and the new ArvoBadge / ArvoStatus / ArvoChip BEM blocks.
  - `_effects.scss`: new shadow tokens consumed by the Avatar uplift and
    Window drag/resize chrome.
  - `_illustration-size.scss`: explicit 96 / 124 / 224 px scale for the
    consolidated empty-state mixin (previously implicit).
  - `_colors.scss`: color-role refinements consumed by the new feedback
    and selection components (Status, Badge, Chip, ChipList, Loader).
  - `_root.scss`: top-level forward updated to include the new partials.

  ### Migration

  Most consumers reference tokens via CSS custom properties
  (`var(--arvo-*)`) and will not see breakage; only SCSS callers that
  imported the renamed motion variables need to update:

  ```scss
  // before
  transition: $arvo-motion-expand;
  transition: $arvo-motion-popup;
  transition: $arvo-motion-dialog;

  // after
  transition: $arvo-motion-transition-expand;
  transition: $arvo-transition-popup;
  transition: $arvo-transition-dialog;
  ```

## 2.1.0

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

## 1.4.0

## 1.3.1

## 1.3.0

## 1.0.0-rc.3

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
