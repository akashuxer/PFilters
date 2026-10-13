# @arvo/core

## 2.2.5

### Patch Changes

- 485bcc3: Fix anchored overlay surfaces (pickers, popovers, menus, dropdowns, tooltips) overflowing the viewport edge on first open. `computePosition` measured the float via `getBoundingClientRect()`, which reflects CSS transforms; when a reposition landed during the popup enter animation (`arvo-enter-from` applies `scale(0.98)`) the surface measured ~2% narrow, the boundary clamp false-passed, and the panel was parked a few pixels past the viewport edge until the next reposition. The float is now measured with `offsetWidth`/`offsetHeight` (layout size, transform-immune) with a `getBoundingClientRect()` fallback for hosts without offset dimensions.
  - @arvo/tokens@2.2.5

## 2.2.4

### Patch Changes

- Internal cleanups to the datetime engine, overlay hub, overlay surface,
  tooltip manager, keyboard navigation (arrow-nav, shortcut, tree-nav),
  position watcher, sortable-list DnD, and overflow-manager supporting the
  panel family consolidation. No public API additions or removals.

  ### Changed
  - **`tooltip-manager`** — internal refactoring for the new `arvoTooltipContainer` delegation pattern in `@arvo/js`.
  - **`overlay-hub` / `overlay-surface`** — test hardening and minor behavioral refinements around surface stacking during the panel split.
  - **`keyboard/arrow-nav`** — internal adjustments for `ArvoNavPanel` compact mode navigation.

- Updated dependencies
  - @arvo/tokens@2.2.4

## 2.2.3

### Patch Changes

- @arvo/tokens@2.2.3

## 2.2.2

### Patch Changes

- No core changes. Version-locked bump to keep the published
  `@arvo/*` ecosystem aligned with the v2.2.2 release of
  `@arvo/react`, `@arvo/js`, `@arvo/styles`, `@arvo/utils`, and
  `@arvo/assets`. The overlay hub, positioning engine, focus trap,
  keyboard nav helpers, and every other public export are unchanged
  from v2.2.1.

  ### Patch Changes
  - @arvo/tokens@2.2.2

## 2.2.1

### Patch Changes

- Overlay hub gains a wrapper-pinning API so composing overlays whose
  registered surface lives inside a viewport-spanning host (`ArvoWindow`,
  `ArvoAlertDialog`) no longer get visually trapped beneath sibling
  overlays when consumers raise `overlayHub.configure({ zIndexBase })`.

  ### New: `OverlayHub.attachWrapperElement(id, element | null)`
  - `OverlayEntry` gains an optional `wrapperElement` field. When set
    (either directly on registration or via `attachWrapperElement` after
    `open`), the hub keeps `wrapper.style.zIndex` pinned to the same
    hub-assigned value as `entry.element.style.zIndex` on every
    `refreshZIndices` pass. Passing `null` detaches and clears the
    inline z-index so the SCSS fallback (e.g. `--arvo-z-popover: 1000`)
    takes effect again on the next open.
  - Idempotent and no-ops for an unknown id. Wrapper + mask + surface
    all stay in sync as the stack changes (wrapper at `z`, mask at
    `z - 1`).
  - Covered by five new `__tests__/overlay-hub.test.ts` cases (pin on
    attach, follow stack shifts, clear on detach, no-op for unknown
    id, mask + wrapper co-existence).

  ### `createOverlaySurface({ surfaceRoot })`

  `OverlaySurfaceOptions` accepts an optional `surfaceRoot` element.
  When provided, the engine attaches it to the hub via
  `attachWrapperElement` on open and detaches it on close / destroy.
  This is the framework-agnostic surface for the same fix --
  `@arvo/react`'s `useOverlaySurface({ wrapperRef })` and `@arvo/js`'s
  `ArvoWindow` / `ArvoAlertDialog` route through this option.

  ### Why

  Before this change, the panel was hub-managed but the outer
  `.arvo-win` / `.arvo-alert-dlg` host kept its CSS-declared fallback
  `z-index: var(--arvo-z-popover, 1000)`. That established a stacking
  context that trapped the panel inside the 1000 layer even when the
  hub raised the panel's z-index to a much higher consumer-configured
  base. Any sibling overlay above 1000 then visually obscured the
  panel. Pinning the wrapper to the same z as the surface hoists the
  whole stacking context to the hub-assigned layer.

  ### Patch Changes
  - @arvo/tokens@2.2.1

## 2.2.0

### Minor Changes

- OverlaySurface engine, context-menu controller, drag-handle, mask
  primitive, tooltip manager + connector, sortable-list axis support,
  horizontal-overflow manager, tree-nav keyboard pattern, and broad
  positioning / overlay-hub / focus / DnD improvements that unblock the
  v2.2.0 component wave.

  ### New: OverlaySurface engine

  `createOverlaySurface` is the new low-level engine for every
  overlay-capable component (Action Menu, Popover, Hybrid Popover,
  Alert Dialog, Drawer, Side Panel, Date / Time / DateTime / DateRange
  pickers, Dropdown Button, Split Button, Dropdown Tree, MultiSelect,
  Select, Combobox, Toast, Tooltip, Window, Context Menu).

  The engine owns the end-to-end overlay contract:
  - Trigger / anchor binding -- writes `aria-haspopup`, `aria-controls`,
    and `aria-expanded` onto the consumer-supplied trigger.
  - Positioning -- composes `computePosition` + `createPositionWatcher`
    with consumer-configurable placement, flip, and offset.
  - Focus management -- programmatic open focus, focus-trap (delegating
    to `createFocusTrap`), and return-focus on close.
  - Stacking -- registers with `overlayHub` so nested overlays stack
    correctly and dismiss-on-outside is hub-aware.
  - Lifecycle -- open / close / destroy + cancellable events fired
    through a single `OverlaySurface` handle.

  New public exports: `createOverlaySurface`, `OverlaySurface`,
  `OverlaySurfaceOptions`, `OverlaySurfaceTriggerAria`,
  `OverlaySurfaceFocusOptions`, `OverlaySurfacePositionOptions`.

  ### New: Context-menu controller (`./context-menu`)

  `createContextMenuController` is the framework-agnostic engine for
  right-click / long-press context menus. Provides:
  - Modality-aware activation (`'pointer' | 'keyboard'`).
  - Anchor resolution (point, rect, or element) so the menu opens at
    the cursor for pointer activations and aligned to the focused row
    for keyboard activations.
  - Cancellable `onRequest` hook receiving a `ContextMenuRequest` plus
    helpers (`open(items)`, `preventDefault()`, etc.).
  - Integration with `overlayHub` for stacking + dismiss semantics.

  New public exports: `createContextMenuController`, `ContextMenuAnchor`,
  `ContextMenuController`, `ContextMenuControllerOptions`,
  `ContextMenuModality`, `ContextMenuOnRequest`, `ContextMenuRequest`,
  `ContextMenuRequestHelpers`.

  ### New: Drag-handle primitive (`./drag`)

  `createDragHandle` is the pointer-driven translation primitive used by
  ArvoWindow. The handle source (typically a panel header) translates a
  target element via CSS custom properties (`--arvo-x` / `--arvo-y`),
  clamps the target to a configurable bounds rect, and supports an
  `excludeSelector` so pointerdown on interactive header children
  (buttons, switches, badges, status indicators) does not initiate a
  drag. No keyboard handling -- consumers add their own keyboard
  repositioning where required. Parallel to `createResizeHandle`.

  New public exports: `createDragHandle`, `DragOffset`, `DragBoundsRect`,
  `DragHandleOptions`, `DragHandleInstance`.

  ### New: Horizontal overflow manager (`./overflow`)

  `createOverflowManager` is the framework-agnostic engine for
  `ArvoButtonGroup` and `ArvoTabstrip` overflow rendering. Watches the
  container with a `ResizeObserver`, runs a two-pass measurement that
  reserves space for the overflow trigger, hides the clipped tail with
  inline `visibility: hidden; position: absolute; pointer-events: none`,
  and supports pinned items (never hidden) plus a promoted item (the
  currently selected option, swapped with the last visible non-pinned
  item so the selection stays in view).

  New public exports: `createOverflowManager`, `OverflowManager`,
  `OverflowManagerOptions`, `OverflowItem`.

  ### New: Tree-nav keyboard pattern (`./keyboard/tree-nav`)

  `createTreeNav` extends `createArrowNav` with WAI-ARIA Tree View
  semantics for ArvoTreeView and ArvoDropdownTree:
  - Right opens a closed parent, moves into the first child of an open
    parent, or no-ops on a leaf.
  - Left closes an open parent, moves to the parent of a leaf or
    closed child, or no-ops at the root.
  - Home / End jump to the first / last visible non-disabled row.
  - Type-ahead and disabled-skip behave identically to arrow-nav.

  New public exports: `createTreeNav`, `TreeNav`, `TreeNavOptions`,
  `TreeNavRowMeta`.

  ### New: Keyboard shortcut helpers

  Added a framework-agnostic shortcut surface used by Window header
  actions, FAB button, and richer context-menu items:
  `getOperatingSystem`, `isMacOS`, `isModKey`, `parseShortcut`,
  `matchesShortcut`, `formatShortcutDisplay`,
  `__resetOperatingSystemCacheForTests`, `ArvoOperatingSystem`,
  `ParsedShortcut`.

  ### New: Overlay mask primitive (`./mask`)

  `createMask` is the single overlay scrim primitive for modal-style
  surfaces (Drawer, Alert Dialog). Owns the `.arvo-overlay__mask`
  element, the `--blur` and `--visible` modifiers, click-outside
  dismissal, and the animated show / hide. Replaces the legacy
  `createBackdropManager` (still exported during the deprecation
  window) and the per-component backdrop divs.

  ### New: Counter / initials format helpers
  - `./format`: `formatBadgeCount(value, options)` powers
    `ArvoBadge` / `ArvoChip` counter mode (1, 5, 10, 99+, 1.0K, etc.).
  - `./initials`: `resolveInitials`, `parseInitialsFromName`,
    `parseInitialsFromEmail` power `ArvoAvatar` and `ArvoAvatarGroup`.

  ### Sortable-list axis support (BREAKING for direct consumers)

  `createSortableList` now accepts an `axis` option:
  - `'y'` (default) -- preserves prior vertical-list behavior.
  - `'x'` (new) -- horizontal strips (used by `ArvoTabstrip` reorder
    and `ArvoChipList`).

  The position model was renamed for clarity:
  - `position: 'above' | 'below'` -> `position: 'before' | 'after'`.

  The drop indicator now tracks both `offsetX` and `offsetY` so the
  ghost clone positions correctly in either axis. State classes used
  by consumers were renamed to namespaced equivalents:
  `is-dragging` / `is-drop-target` -> `arvo-sortable--dragging` /
  `arvo-sortable--ghost`. Constrained drag (`bounds`) clamps the lifted
  clone to a parent group rect so pinned / unpinned segments stay
  separated.

  ### Overlay hub: tree-aware stacking
  - `overlayHub` replaces `ensureToastsOnTop` with a full
    tree-aware stacking algorithm: tooltip > toast > other, children
    always above parent. Tooltip is a new priority tier.
  - `OverlayEntry` retains the v1.4-era `parentId` + `relation` fields
    (`'submenu' | 'inline'`) and now drives the stacking comparator end
    to end. Backwards compatible when `parentId` is omitted.
  - Comprehensive overlay-hub tests added.

  ### Positioning improvements
  - New exports: `applyPositionToSurface`, `resolvePositionSide`,
    `ApplyPositionOptions`, `PlacementFlip`, `PositionUpdateSource`,
    `VirtualAnchorProvider`.
  - Watcher reworked: granular update sources (scroll vs resize vs
    anchor-rect vs surface-rect) for more efficient repositioning;
    extended tests.

  ### Tooltip
  - New `createTooltipManager` + `connectTooltip` engine in `./tooltip`
    (`tooltipManager`, `connectTooltip`, `disconnectTooltip`,
    `TooltipManager`, `TooltipManagerOptions`, `TooltipConfig`,
    `TooltipConnectorOptions`, `TooltipConnector`).
  - Centralizes pointer / focus hand-off across overlapping tooltip
    consumers, integrates with the `tooltip` priority in the overlay
    hub, and powers the `title-truncation-tooltip` shared pattern
    consumed by `@arvo/utils`.

  ### List selection helpers
  - New `aggregateSelectionState` and `nextSelectionForRangeShift`
    helpers consumed by ArvoList / ArvoMultiSelect / ArvoChipList for
    Shift-click range selection and tri-state header selection.

  ### Datetime
  - `pickAnchorDate` helper for the layer-4 date-time dropdown
    primitives.
  - Calendar `compare` helpers exposed under `./datetime`.

  ### Transition
  - `runTransition` / `cleanupTransition` now clear stale
    `arvo-enter-*` / `arvo-exit-*` / `arvo-fade` / `arvo-scale` /
    `arvo-slide-*` classes at the start of every cycle so a re-used
    element does not inherit visual state from the previous cycle.
  - Tests added in `animation/__tests__/transition.test.ts`.

  ### Diagnostics
  - New `warnDeprecated(name, replacement)` helper used by overlay
    components to emit a one-shot console warning when a deprecated
    option (e.g. `closeOnMaskClick` -> `closeOnOutsideClick`) is
    supplied.

  ### Migration

  | Concern                 | v2.1.0                           | v2.2.0                                                            |
  | ----------------------- | -------------------------------- | ----------------------------------------------------------------- | --------- | -------- |
  | Sortable position model | `'above'                         | 'below'`                                                          | `'before' | 'after'` |
  | Sortable state classes  | `is-dragging` / `is-drop-target` | `arvo-sortable--dragging` / `arvo-sortable--ghost`                |
  | Backdrop primitive      | `createBackdropManager`          | `createMask` (`createBackdropManager` deprecated; still exported) |
  | Overlay surface         | hand-rolled per component        | `createOverlaySurface`                                            |
  | Toast stacking helper   | `ensureToastsOnTop`              | tree-aware stacking via `OverlayEntry.parentId`                   |

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
