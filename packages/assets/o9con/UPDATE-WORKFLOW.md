# o9con update workflow

This document is the team-facing how-to for taking a UX delivery of the o9con
icon font and propagating it through the Arvo Design System. The pipeline
lives entirely inside `@arvo/assets` and is intentionally a single command.

## TL;DR

```bash
# 1. Drop the UX team folder under packages/assets/o9con/source/
# 2. Run:
pnpm --filter @arvo/assets run o9con:update
# 3. Review the diff summary printed in the terminal.
# 4. Open packages/assets/o9con/cheatsheet/index.html in a browser to eyeball.
# 5. Commit, write a changeset, and you are done.
```

## What the pipeline does

```
source/<UX drop>/    ----> [ingest] ----> [parse]  ----> [diff]  ----> [generate]
                                                                          |
   +----------------------------------------------------------------------+
   |
   +--> o9con/css/o9con.css         (rebuilt; generated header marks it as such)
   +--> o9con/fonts/o9con.*         (5 font files copied)
   +--> o9con/state/current-icons.json
   +--> o9con/state/changelog.json  (append-only summary of the last 25 builds)
   +--> o9con/config/icon-sets.json (added icons folded into ui + new_icons)
   +--> o9con/cheatsheet/data.js    (regenerated)
   +--> tools/o9con-icons.md        (allowlist fenced block regenerated)
   +--> dist/o9con.min.css          (minified)
```

## Detailed walk-through

### 1. Drop the UX folder

The UX team typically delivers a folder named like `Font File 24 Jun 26/`
containing:

- `fonts/o9con.{eot,svg,ttf,woff,woff2}` (five files, all required)
- `scss/icons.scss`, `unicodesMap.json`, or `css/icons.css` (at least one)
- often plus `demo.html`, `less/`, `demo/` -- the pipeline ignores these

Drop the entire folder, as-is, into:

```
packages/assets/o9con/source/
```

That directory is git-ignored except for its README. You do not need to
commit the raw UX files.

If multiple drops accumulate over time, the pipeline picks the most
recently modified one. Old drops can be deleted at any time once the
corresponding change has been committed.

### 2. Run the pipeline

```bash
pnpm --filter @arvo/assets run o9con:update
```

It will print each step (ingest, parse, diff, generate, copy fonts, side
effects) and exit non-zero on any failure. The diff summary lists exactly
which icons were `added`, `removed`, or `changed` (same name, different
codepoint).

There are two read-only escape hatches:

```bash
# Preview the diff only -- no files are written.
pnpm --filter @arvo/assets run o9con:diff

# Regenerate just the cheatsheet payload (e.g. after editing icon-sets.json
# or aliases.json by hand). Does NOT touch o9con.css or the font files.
pnpm --filter @arvo/assets run o9con:cheatsheet:data
```

### 3. Eyeball the cheatsheet

```
packages/assets/o9con/cheatsheet/index.html
```

Open it directly in any browser (double-click, drag-into-tab, or
`file://`). No build, no server. The cheatsheet:

- shows every glyph with its class name and codepoint,
- tags the new icons in green and aliases in grey,
- supports live search (or press `/`),
- copies the full `o9con-<name>` class to the clipboard on click.

### 4. Commit

The pipeline writes to a fixed set of locations. Stage all of them:

```bash
git add \
  packages/assets/o9con/css/o9con.css \
  packages/assets/o9con/fonts/ \
  packages/assets/o9con/state/ \
  packages/assets/o9con/config/icon-sets.json \
  packages/assets/o9con/cheatsheet/data.js \
  packages/assets/dist/o9con.min.css \
  tools/o9con-icons.md
```

If you also added new aliases manually (see "Adding an alias" below), stage
`packages/assets/o9con/config/aliases.json` too.

### 5. Write a changeset

```bash
pnpm changeset
```

Select `@arvo/assets` and describe the icon delta. Example body:

```
Add 4 new o9con icons (foo, bar, baz, qux); remove 1 (legacy-thing).
Promote alias `gear` -> `cog` to canonical (replaces alias entry).
```

The numeric package version bumps when changesets are versioned. The
generated `o9con.css` header and the font `?v=` cache-busting query string
both pick up the new version automatically on the next pipeline run.

---

## Hand-maintained config files

The pipeline is fully data-driven. The three hand-maintained inputs live
under `packages/assets/o9con/config/`:

### `aliases.json`

Canonical-icon -> list-of-aliases. Adding an alias means a new selector
`.o9con-<alias>::before` that resolves to the canonical glyph's codepoint.

```json
{
  "cog":  ["gear", "settings"],
  "bin":  ["trash", "trash-o"]
}
```

Edit, then run `o9con:update` (or `o9con:cheatsheet:data`) to propagate.

Conflict rules:
- If `alias` clashes with a real icon name in the current font, the real
  icon wins and the alias entry is silently dropped (with a console
  warning). This matches the legacy behavior: Nucleo occasionally
  promotes an alias to a first-class glyph.
- If `canonical` is no longer in the font, every alias under it is
  dropped (also with a warning).

### `icon-sets.json`

Category groupings used by the cheatsheet. Shape:

```json
{
  "directional": [...],
  "ui":          [...],
  "editor":      [...],
  ...
  "all":         [...],   // auto-recomputed
  "new_icons":   [...],   // auto-reset to the latest diff "added"
  "new_alias":   []
}
```

When the pipeline runs:
1. The previous build's `new_icons` are folded back into `ui` (so they
   stop appearing as "new" forever).
2. The latest UX drop's added icons replace `new_icons` and are also
   added to `ui` as the default bucket.
3. Icons removed by the latest UX drop are stripped from every group.
4. `all` is recomputed from the union of all categories.

If you want to move a freshly-added icon out of `ui` into a more specific
group (`data`, `editor`, `files`, ...), edit `icon-sets.json` and re-run
`o9con:cheatsheet:data`.

### `base.css`

The static portion of the published `o9con.css`: base class
(`.o9con`), size modifiers, background helpers, list markers, rotate /
flip transforms, animations, and the icon stack. The pipeline inlines
this file verbatim into the generated CSS between `@font-face` and the
per-icon rules. Edit when the base layer needs a real change; it is not
expected to churn.

---

## Adding an alias

```jsonc
// packages/assets/o9con/config/aliases.json
{
  ...
  "cog": ["gear", "settings", "preferences"]
}
```

Then either re-run the full pipeline or just the cheatsheet step:

```bash
pnpm --filter @arvo/assets run o9con:cheatsheet:data
# OR (also rewrites o9con.css with the new alias selector):
pnpm --filter @arvo/assets run o9con:update
```

Caveat: only `o9con:update` rewrites `o9con.css`. If you just want a
selector to start working, you must run the full pipeline.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `No valid o9con drop found in source/` | Drop folder is missing one of the 5 font files, or none of the source descriptors. | Check the UX zip; re-export from Nucleo if needed. |
| `scss vars and scss map disagree on the icon map` | The Nucleo export contains both formats but they list different codepoints. | Ask the UX team to re-export. The pipeline refuses to guess. |
| `tools/o9con-icons.md is missing the "## Available o9con icon names" heading.` | Someone removed or renamed the heading. | Restore the heading verbatim; the pipeline only rewrites the fenced block below it. |
| Cheatsheet renders empty squares | The CSS loaded but the font did not. | Check that `o9con/fonts/` actually contains the 5 woff/ttf/etc files; rerun `o9con:update`. |
| `WARN: N alias canonical(s) no longer in font` | The UX drop removed an icon that has aliases. | Either re-add the canonical to the font (talk to UX) or remove the alias entry from `aliases.json`. |
| `dropped N alias(es) due to name collision` | A new icon takes a name that used to be an alias. | Normal, expected. Update `aliases.json` to drop that alias if you no longer need it. |

## What the pipeline does NOT touch

- The `o9con-*` BEM class prefix (intentionally NOT renamed in the Arvo
  rebrand, per the @arvo/assets CHANGELOG).
- `packages/styles/`, `packages/react/`, `packages/js/`, etc. -- the new
  icon CSS is consumed as-is; downstream components don't need to know
  the icon list changed.
- Any file outside `packages/assets/` and `tools/o9con-icons.md`.
