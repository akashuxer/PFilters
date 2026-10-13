/**
 * Emit packages/assets/o9con/css/o9con.css from:
 *   - the parsed UX icon map ({ name: hex })
 *   - the hand-maintained alias table (config/aliases.json)
 *   - the hand-maintained static base CSS (config/base.css)
 *   - the @arvo/assets package version (for @font-face cache busting)
 *
 * Format conflict handling: if an alias name collides with a real icon in
 * the new map, the real icon wins and the alias entry is silently dropped.
 * (This matches the legacy behavior, where a Nucleo addition would
 * accidentally take over a previously-aliased name -- e.g. `sort` becoming
 * a first-class glyph in the June 2026 drop, overriding the legacy alias
 * `sort -> caret-scroll-v`.)
 *
 * Missing canonicals (alias references an icon that no longer exists) are
 * reported as warnings and skipped.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * @param {{
 *   icons: Record<string,string>,    // name -> hex
 *   aliasesPath: string,             // .../config/aliases.json
 *   basePath: string,                // .../config/base.css
 *   version: string,                 // package version for ?v=
 *   outPath: string,                 // .../o9con/css/o9con.css
 * }} args
 * @returns {{ written: string, iconCount: number, aliasCount: number, droppedAliases: string[], missingCanonicals: string[] }}
 */
export function generateCss({ icons, aliasesPath, basePath, version, outPath }) {
  const aliases = JSON.parse(readFileSync(aliasesPath, "utf8"));
  const base = readFileSync(basePath, "utf8");

  const out = [];
  out.push("/* ============================================================");
  out.push(" * o9con.css");
  out.push(" *");
  out.push(" * GENERATED FILE -- do not edit by hand.");
  out.push(" * Regenerate via:  pnpm --filter @arvo/assets run o9con:update");
  out.push(" *");
  out.push(` * Built from UX icon map (${Object.keys(icons).length} icons) +`);
  out.push(" * config/base.css + config/aliases.json.");
  out.push(" * ========================================================== */");
  out.push("");

  // @font-face
  out.push("@font-face {");
  out.push('  font-family: "o9con";');
  out.push(`  src: url("../fonts/o9con.eot?v=${version}");`);
  out.push(`  src: url("../fonts/o9con.eot?v=${version}") format("embedded-opentype"),`);
  out.push(`       url("../fonts/o9con.woff2?v=${version}") format("woff2"),`);
  out.push(`       url("../fonts/o9con.woff?v=${version}") format("woff"),`);
  out.push(`       url("../fonts/o9con.ttf?v=${version}") format("truetype"),`);
  out.push(`       url("../fonts/o9con.svg?v=${version}") format("svg");`);
  out.push("  font-weight: normal;");
  out.push("  font-style: normal;");
  out.push("}");
  out.push("");

  // Inline the static base CSS verbatim.
  out.push(base.trimEnd());
  out.push("");

  // Per-icon ::before rules, alphabetical for stable diffs.
  out.push("/* ============================================================");
  out.push(" * per-icon glyphs (generated from UX icon map)");
  out.push(" * ========================================================== */");
  const sortedIcons = Object.keys(icons).sort();
  for (const name of sortedIcons) {
    out.push(`.o9con-${name}::before { content: "\\${icons[name]}"; }`);
  }
  out.push("");

  // Aliases. Skip collisions and missing canonicals.
  const droppedAliases = [];
  const missingCanonicals = [];
  const aliasLines = [];
  const canonicalsSorted = Object.keys(aliases).sort();
  for (const canonical of canonicalsSorted) {
    if (!(canonical in icons)) {
      missingCanonicals.push(canonical);
      continue;
    }
    const cp = icons[canonical];
    const list = [...aliases[canonical]].sort();
    for (const alias of list) {
      if (alias in icons) {
        droppedAliases.push(`${alias} (collides with real icon)`);
        continue;
      }
      aliasLines.push(`.o9con-${alias}::before { content: "\\${cp}"; }   /* alias of ${canonical} */`);
    }
  }
  if (aliasLines.length) {
    out.push("/* ============================================================");
    out.push(" * aliases (legacy names mapped to their canonical glyphs)");
    out.push(" * ========================================================== */");
    out.push(...aliasLines);
    out.push("");
  }

  const text = out.join("\n");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text, "utf8");

  return {
    written: outPath,
    iconCount: sortedIcons.length,
    aliasCount: aliasLines.length,
    droppedAliases,
    missingCanonicals,
  };
}
