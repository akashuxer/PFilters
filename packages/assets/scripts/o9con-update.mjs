#!/usr/bin/env node
/**
 * o9con update pipeline.
 *
 *   pnpm --filter @arvo/assets run o9con:update            # full pipeline
 *   pnpm --filter @arvo/assets run o9con:diff              # ingest+parse+diff only (no writes)
 *   pnpm --filter @arvo/assets run o9con:cheatsheet:data   # rebuild cheatsheet/data.js from current state
 *
 * Steps (full pipeline):
 *   1. Ingest      -- find the latest UX drop under o9con/source/
 *   2. Parse       -- extract { name: codepointHex } from scss or json
 *   3. Diff        -- against o9con/state/current-icons.json
 *   4. Generate    -- o9con/css/o9con.css from icons + aliases + base.css
 *   5. Copy fonts  -- replace o9con/fonts/*
 *   6. Side effects:
 *        - update state/current-icons.json
 *        - append to state/changelog.json
 *        - update config/icon-sets.json  (new icons folded into ui+new_icons)
 *        - write cheatsheet/data.js
 *        - regenerate tools/o9con-icons.md
 *        - minify dist/o9con.min.css
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findLatestDrop, readPreferredSource } from "./lib/ingest.mjs";
import { parseDropIcons } from "./lib/parse-icons.mjs";
import { loadSnapshot, diffIconMaps, toSnapshotShape, summarize } from "./lib/diff.mjs";
import { generateCss } from "./lib/generate-css.mjs";
import { writeIconsAllowlist } from "./lib/write-icons-md.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");                 // packages/assets
const REPO_ROOT = resolve(PKG_ROOT, "..", "..");           // repo root

const PATHS = {
  source:        join(PKG_ROOT, "o9con", "source"),
  config:        join(PKG_ROOT, "o9con", "config"),
  state:         join(PKG_ROOT, "o9con", "state"),
  fontsOut:      join(PKG_ROOT, "o9con", "fonts"),
  cssOut:        join(PKG_ROOT, "o9con", "css", "o9con.css"),
  cheatsheetData:join(PKG_ROOT, "o9con", "cheatsheet", "data.js"),
  pkgJson:       join(PKG_ROOT, "package.json"),
  iconsMd:       join(REPO_ROOT, "tools", "o9con-icons.md"),
  minify:        join(PKG_ROOT, "scripts", "minify.mjs"),
};

const FONT_FILES = ["eot", "svg", "ttf", "woff", "woff2"];

function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
function writeJson(p, obj) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}
function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

function ingestAndParse() {
  section("[1/6] Ingest");
  const drop = findLatestDrop(PATHS.source);
  console.log(`Drop:    ${drop.root}`);
  console.log(`Fonts:   ${FONT_FILES.map((k) => drop.fonts[k] ? "OK" : "MISS").join(" ")}  (${FONT_FILES.join(", ")})`);
  console.log(`Sources: ${Object.keys(drop.sources).join(", ") || "(none)"}`);

  section("[2/6] Parse icon map");
  const parsed = parseDropIcons(drop.sources);
  console.log(`Format used:    ${parsed.format}`);
  if (parsed.formatsSeen.length > 1) {
    console.log(`Cross-checked:  ${parsed.formatsSeen.join(" == ")}`);
  }
  console.log(`Icon count:     ${Object.keys(parsed.icons).length}`);

  return { drop, parsed };
}

function runDiff(parsed) {
  section("[3/6] Diff vs current");
  const prevPath = join(PATHS.state, "current-icons.json");
  const prevSnap = loadSnapshot(prevPath);
  const diff = diffIconMaps(prevSnap, parsed.icons);
  console.log(summarize(diff));
  return { diff, prevPath };
}

function updateIconSets(diff, iconsMap) {
  const setsPath = join(PATHS.config, "icon-sets.json");
  const sets = readJson(setsPath);
  const inFont = new Set(Object.keys(iconsMap));

  // 1. Prune stale names: anything no longer in the font (renamed, retired,
  //    or pre-existing cruft from the legacy IconsSets.json) is dropped from
  //    every category group.
  for (const g of Object.keys(sets)) {
    if (g === "new_icons" || g === "new_alias" || g === "all") continue;
    sets[g] = (sets[g] ?? []).filter((n) => inFont.has(n));
  }

  // 2. Fold prior new_icons into "ui" so they aren't lost on the next run.
  const carryUi = (sets.new_icons ?? []).filter(
    (n) => inFont.has(n) && !setForGroups(sets).has(n)
  );
  if (carryUi.length) {
    sets.ui = [...new Set([...(sets.ui ?? []), ...carryUi])].sort();
  }

  // 3. Adopt orphan icons (in font, in no category) into "ui" -- the default
  //    bucket. This catches both newly-added icons from this run AND any
  //    legacy orphans that never got categorized.
  const orphans = [...inFont].filter((n) => !setForGroups(sets).has(n));
  if (orphans.length) {
    sets.ui = [...new Set([...(sets.ui ?? []), ...orphans])].sort();
  }

  // 4. new_icons reflects exactly what this drop added.
  sets.new_icons = [...diff.added].filter((n) => inFont.has(n)).sort();
  sets.new_alias = sets.new_alias ?? [];

  // 5. Recompute "all" from the union of category groups (deterministic).
  const all = new Set();
  for (const g of Object.keys(sets)) {
    if (g === "new_icons" || g === "new_alias" || g === "all") continue;
    for (const n of sets[g] ?? []) all.add(n);
  }
  sets.all = [...all].sort();

  writeJson(setsPath, sets);
  return sets;
}

function setForGroups(sets) {
  const s = new Set();
  for (const g of Object.keys(sets)) {
    if (g === "new_icons" || g === "new_alias" || g === "all") continue;
    for (const n of sets[g] ?? []) s.add(n);
  }
  return s;
}

function writeCheatsheetData({ icons, sets, version }) {
  const aliasesPath = join(PATHS.config, "aliases.json");
  const aliases = readJson(aliasesPath);
  const payload = {
    version,
    generatedAt: new Date().toISOString(),
    icons,         // { name: hex }
    groups: sets,  // { directional, ui, ..., all, new_icons, new_alias }
    aliases,       // { canonical: [aliasName, ...] }
  };
  const text =
    "/* GENERATED -- do not edit. Regenerate via `pnpm --filter @arvo/assets run o9con:cheatsheet:data`. */\n" +
    "window.O9CON_DATA = " + JSON.stringify(payload, null, 2) + ";\n";
  mkdirSync(dirname(PATHS.cheatsheetData), { recursive: true });
  writeFileSync(PATHS.cheatsheetData, text, "utf8");
  console.log(`Wrote ${PATHS.cheatsheetData}`);
}

async function runMinify() {
  // Re-run the existing minify.mjs as a child step. Dynamic import on Windows
  // requires a file:// URL, not a raw absolute path.
  await import(pathToFileURL(PATHS.minify).href);
}

function appendChangelog(diff, version) {
  const p = join(PATHS.state, "changelog.json");
  let log = [];
  if (existsSync(p)) {
    try { log = readJson(p); } catch { log = []; }
  }
  log.unshift({
    date: new Date().toISOString().slice(0, 10),
    version,
    added: diff.added,
    removed: diff.removed,
    changed: diff.changed.map((c) => `${c.name}: ${c.from} -> ${c.to}`),
  });
  log = log.slice(0, 25);
  writeJson(p, log);
}

async function runFull() {
  const { drop, parsed } = ingestAndParse();
  const { diff, prevPath } = runDiff(parsed);

  const pkg = readJson(PATHS.pkgJson);
  const version = pkg.version;

  section("[4/6] Generate o9con/css/o9con.css");
  const gen = generateCss({
    icons: parsed.icons,
    aliasesPath: join(PATHS.config, "aliases.json"),
    basePath: join(PATHS.config, "base.css"),
    version,
    outPath: PATHS.cssOut,
  });
  console.log(`Wrote ${gen.written}`);
  console.log(`  ${gen.iconCount} icon glyphs + ${gen.aliasCount} alias selectors`);
  if (gen.droppedAliases.length) {
    console.log(`  dropped ${gen.droppedAliases.length} alias(es) due to name collision:`);
    for (const a of gen.droppedAliases) console.log(`    - ${a}`);
  }
  if (gen.missingCanonicals.length) {
    console.log(`  WARN: ${gen.missingCanonicals.length} alias canonical(s) no longer in font:`);
    for (const c of gen.missingCanonicals) console.log(`    - ${c}`);
  }

  section("[5/6] Copy fonts");
  mkdirSync(PATHS.fontsOut, { recursive: true });
  for (const ext of FONT_FILES) {
    const src = drop.fonts[ext];
    const dst = join(PATHS.fontsOut, `o9con.${ext}`);
    copyFileSync(src, dst);
    console.log(`  ${src} -> ${dst}`);
  }

  section("[6/6] Side effects");

  // state/current-icons.json
  writeJson(prevPath, toSnapshotShape(parsed.icons));
  console.log(`Wrote ${prevPath}`);

  // state/changelog.json
  appendChangelog(diff, version);
  console.log(`Updated state/changelog.json`);

  // config/icon-sets.json
  const sets = updateIconSets(diff, parsed.icons);
  console.log(`Updated config/icon-sets.json  (ui=${sets.ui.length}, all=${sets.all.length}, new_icons=${sets.new_icons.length})`);

  // cheatsheet/data.js
  writeCheatsheetData({ icons: parsed.icons, sets, version });

  // tools/o9con-icons.md
  const mdRes = writeIconsAllowlist({
    icons: parsed.icons,
    aliasesPath: join(PATHS.config, "aliases.json"),
    targetPath: PATHS.iconsMd,
  });
  console.log(`Updated ${mdRes.written}  (${mdRes.totalNames} names = ${mdRes.fromIcons} icons + ${mdRes.fromAliases} aliases)`);

  // dist/o9con.min.css (and friends)
  console.log("\nRunning minify.mjs ...");
  await runMinify();

  section("Done");
  console.log(`o9con updated from drop: ${drop.label}`);
  console.log(`@arvo/assets@${version}`);
}

async function runDiffOnly() {
  const { parsed } = ingestAndParse();
  runDiff(parsed);
  console.log("\n(diff mode -- no files written)");
}

async function runCheatsheetDataOnly() {
  section("Regenerate cheatsheet/data.js from current state");
  const prevPath = join(PATHS.state, "current-icons.json");
  if (!existsSync(prevPath)) {
    throw new Error(`state/current-icons.json missing -- run o9con:update at least once first.`);
  }
  const snap = readJson(prevPath);
  const icons = {};
  for (const [k, v] of Object.entries(snap)) {
    icons[k.replace(/^o9con-/, "")] = (typeof v === "number" ? v.toString(16) : v).toLowerCase();
  }
  const sets = readJson(join(PATHS.config, "icon-sets.json"));
  const pkg = readJson(PATHS.pkgJson);
  writeCheatsheetData({ icons, sets, version: pkg.version });
}

const mode = process.argv[2] ?? "--full";
try {
  if (mode === "--diff") await runDiffOnly();
  else if (mode === "--cheatsheet-data") await runCheatsheetDataOnly();
  else await runFull();
} catch (e) {
  console.error("\nERROR: " + (e && e.message ? e.message : e));
  process.exit(1);
}
