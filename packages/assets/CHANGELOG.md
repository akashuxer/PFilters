# @arvo/assets

## 2.2.5

## 2.2.4

### Patch Changes

- No asset changes. Version-locked bump to keep the published
  `@arvo/*` ecosystem aligned with the v2.2.4 release of
  `@arvo/react`, `@arvo/js`, `@arvo/styles`, `@arvo/core`,
  `@arvo/utils`, and `@arvo/tokens`.

## 2.2.3

## 2.2.2

### Patch Changes

- Targeted fix to the base o9con icon CSS. No new icons, no removals,
  no changes to the icon font files themselves; the glyph inventory
  is unchanged from v2.2.1.

  ### `.o9con` no longer uses the `font` shorthand

  The base `.o9con` rule in `o9con/config/base.css` and the generated
  `o9con/css/o9con.css` was declaring the icon font using the CSS
  `font` shorthand:

  ```css
  .o9con {
    font: normal normal normal 1em/1 'o9con';
  }
  ```

  The `font` shorthand always sets `font-size`, and when combined
  with the CSS cascade this was quietly winning over component-level
  `__ico { font-size: <token> }` rules that expected `.o9con` to
  contribute only the font-family + weight + style. The result was
  icons that ignored per-component sizing tokens in some overlay /
  panel-header contexts.

  The declaration is now expanded so `font-size` is never set by the
  base rule:

  ```css
  .o9con {
    font-family: 'o9con';
    font-weight: normal;
    font-style: normal;
    font-variant: normal;
    line-height: 1;
  }
  ```

  This is a fix for a subtle rendering bug -- consumers who were
  seeing per-component icon-size overrides silently ignored will see
  their tokens take effect after upgrading. Consumers who were not
  relying on component-level overrides see no visual change.

  ### Regenerated distribution files

  `o9con/css/o9con.css` and the minified `dist/*.min.css` were
  regenerated so the fix ships in every consumption path (`@arvo/assets/o9con/css`,
  `@arvo/assets/dist/o9con.min.css`, and the raw font URL query
  parameters bumped to `?v=2.2.1`). Cheatsheet data
  (`o9con/cheatsheet/data.js`) and the o9con state changelog
  regenerated alongside; the icon-sets manifest's `new_icons` array
  is now empty (no icons were added or removed since v2.2.1).

## 2.2.1

### Patch Changes

- No asset changes. Version-locked bump to keep the published
  `@arvo/*` ecosystem aligned with the v2.2.1 release of `@arvo/core`,
  `@arvo/styles`, `@arvo/react`, and `@arvo/js`. The icon font (o9con),
  illustration font (o9illus), web fonts, file-type symbols, and
  brand/integration logo library are unchanged from v2.2.0.

## 2.2.0

### Minor Changes

- New brand logo SVG library, complete o9con icon font overhaul with
  authoring tooling, and a restructured file-type symbol surface.

  ### Brand logo library (NEW)

  `packages/assets/logos/` ships a curated set of 64 third-party product
  and platform logos in matched light + dark variants (128 SVGs total).
  Each pair shares the same filename across `logos/light/` and
  `logos/dark/` so consumers can pick the variant for the active theme
  with a single path swap. Coverage includes:
  - **AI / productivity**: Adobe, ChatGPT, Claude, Copilot, Cursor,
    Docusign, Figma, Gemini, GitHub, GitHub Copilot, Notion.
  - **Cloud + infra**: Amazon, AmazonAWSCloud, AmazonLambda, AmazonS3Bucket,
    Cloudflare, GoogleCloud, MicrosoftAzureCloud, MongoDB, MySQL, GraphQL,
    Airflow, NiFi, IBMDB2, MicrosoftSQLServer.
  - **Collaboration**: Carta, GitLab, Slack, GoogleChat, GoogleMeet,
    GoogleWorkspace, MicrosoftTeams, MicrosoftWorkspace,
    MicrosoftSharePoint, AzureDevOpsGit.
  - **Office suites**: GoogleCalendar, GoogleDocs, GoogleDrive,
    GoogleGmail, GoogleSheet, GoogleSlides, MicrosoftExcel,
    MicrosoftOutlook, MicrosoftPowerBI, MicrosoftPowerPoint,
    MicrosoftWord.

  Exposed via the new `./logos/files/*` package export:

  ```ts
  import figmaLight from '@arvo/assets/logos/files/light/Figma.svg';
  import figmaDark from '@arvo/assets/logos/files/dark/Figma.svg';
  ```

  ### o9con icon font overhaul (BREAKING for direct font consumers)

  The o9con icon font and supporting tooling were rebuilt end-to-end:
  - All five distributed font files (`o9con.eot`, `o9con.svg`,
    `o9con.ttf`, `o9con.woff`, `o9con.woff2`) regenerated against the
    refreshed source glyph set; ~70 new icons added to cover the new
    component wave (Status / Loader / ChipList / TreeView /
    DropdownTree / RichTooltip / ContextHelp / Window / Splitter / Nav /
    Avatar / Date-time dropdowns) plus broad platform / file-type / nova
    AI glyphs.
  - New authoring pipeline in `packages/assets/o9con/`:
    - `o9con/config/` -- `aliases.json`, `base.css`, `icon-sets.json`
      describe the icon surface declaratively.
    - `o9con/source/` -- source glyph SVGs and authoring README.
    - `o9con/state/` -- generated `changelog.json` + `current-icons.json`
      snapshots so adds / renames / deletes are reproducible.
    - `o9con/cheatsheet/` -- self-contained HTML cheatsheet
      (`index.html`, `cheatsheet.css`, `cheatsheet.js`, `data.js`,
      `favicon.svg`) for browsing the current icon set.
    - `o9con/UPDATE-WORKFLOW.md` -- end-to-end workflow doc for
      adding / renaming icons.
  - New package scripts back the workflow:
    - `pnpm --filter @arvo/assets o9con:update` regenerates the font,
      CSS, and state snapshot from `o9con/source/`.
    - `pnpm --filter @arvo/assets o9con:diff` previews the icon-set
      delta against the last published state.
    - `pnpm --filter @arvo/assets o9con:cheatsheet:data` regenerates
      `cheatsheet/data.js`.
  - `o9con/css/o9con.min.css` was removed; consumers should import
    `@arvo/assets/o9con/css` (still serves the unminified bundle and
    is included in package `files`). The shipped CSS file already
    minifies as part of the @arvo/assets `build` step.

  Icon class names follow the same `o9con-<slug>` BEM-free convention
  and remain stable across the overhaul; existing markup continues to
  work. Run `pnpm --filter @arvo/assets build` after upgrading to
  refresh any pre-built dist output.

  ### File-type symbol restructure (BREAKING for direct symbol consumers)

  The `o9symbol/` folder (16 single-tone file-type SVGs) was replaced
  with `symbol/`, a paired light + dark surface (32 SVGs total) that
  mirrors the new logo library structure:

  ```text
  packages/assets/symbol/light/   <- light-on-dark variants
  packages/assets/symbol/dark/    <- dark-on-light variants
  ```

  Exposed via the new `./symbol/files/*` package export
  (was `./o9symbol/files/*`):

  ```ts
  // before (v2.1.0)
  import csv from '@arvo/assets/o9symbol/files/light/CSV.svg';
  // after (v2.2.0)
  import csvLight from '@arvo/assets/symbol/files/light/CSV.svg';
  import csvDark from '@arvo/assets/symbol/files/dark/CSV.svg';
  ```

  Coverage carried forward: CSV, DOC, DOCX, HTML, IMG, JPEG, JSON, PDF,
  PNG, PPT, RAR, SVG, TXT, XLSX, XML, ZIP -- each in both color modes.

  ### Illustrations (o9illus)
  - All 16 light + dark illustrations regenerated for cleaner export
    geometry and consistent stroke weight; the `o9illus.css` consumer
    stylesheet refreshed accordingly. Slot names and CSS class contracts
    are unchanged -- existing usage works without code changes.

  ### Web fonts
  - `fonts/fonts.css` refreshed to drop the removed font-weight 300 face
    rules introduced in v2.1.0's font cleanup and to align face naming
    with the consolidated set (o9Sans Regular / Medium / Bold + Italic;
    Roboto, Helvetica, Noto Sans CJK).

  ### Migration

  | Concern                 | v2.1.0                      | v2.2.0                                                            |
  | ----------------------- | --------------------------- | ----------------------------------------------------------------- |
  | File-type symbol root   | `packages/assets/o9symbol/` | `packages/assets/symbol/`                                         |
  | File-type symbol export | `./o9symbol/files/*`        | `./symbol/files/*`                                                |
  | File-type variants      | light only                  | light + dark pair                                                 |
  | Brand logo import       | not available               | `./logos/files/{light,dark}/<Name>.svg`                           |
  | o9con minified CSS      | `./o9con/css/o9con.min.css` | removed; use `./o9con/css`                                        |
  | o9con authoring         | source unmanaged            | `o9con/{source,config,state,cheatsheet}/` + `o9con:update` script |

## 2.1.0

### Minor Changes

- Overlay hub stacking, global loading kill-switch, font cleanup & Action Menu inline sizing
  - Drawer and SidePanel (overlay variant) now register with the overlay hub for hub-managed z-index and correct nested overlay stacking. New `managesOwnFocus` / `managesOwnBackdrop` config options let self-trapping overlays opt out of hub focus/backdrop without losing stacking order.
  - Global `ARVO_LOADING_ENABLED` flag (currently off) gates all component loading states — code is preserved but inert until re-enabled.
  - Removed ~23 MB of unused font-weight 300 font files (NotoSans Light, Roboto Light, Helvetica Light, o9Sans full family).
  - Action Menu: `width`/`height` options for inline popover/hybrid-popover panels; removed `MenuItemData.rightLink`.
  - Listbox: removed unused `size` prop.
  - Inline-content mixin emitted once globally; panel-shell footer padding fix; overlay backdrop z-index now set inline by owning component.

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

## 1.2.0

### Minor Changes

- Add 7 new icons to o9con: [ascending-sort, descending-sort, numeric-download, text-download, ascending, descending] and updated [cluster-scaling-transformer -> sort filled, alt-sort-filled -> sort, alt-sort -> cluster-boost]

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
