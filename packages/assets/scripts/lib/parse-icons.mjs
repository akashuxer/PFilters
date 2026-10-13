/**
 * Parse the icon name <-> codepoint map from any of three formats the Nucleo
 * exporter has used over time. Returns `{ name: codepointHexLowercase }`
 * sorted alphabetically by name.
 *
 *   Format A (legacy SCSS variables):
 *       $o9con-arrow-up: unicode(ea27);
 *
 *   Format B (current SCSS map + @each loop):
 *       $icons: (
 *         "arrow-up": "ea27",
 *         ...
 *       );
 *
 *   Format C (JSON, decimal codepoints, "o9con-" prefix):
 *       { "o9con-arrow-up": 59943, ... }
 *
 * If multiple sources are available, they are cross-validated against each
 * other. Any mismatch aborts the build.
 */
import { readFileSync } from "node:fs";

const VAR_RE = /\$o9con-([\w-]+)\s*:\s*unicode\(\s*([0-9a-fA-F]+)\s*\)/g;
const MAP_BLOCK_RE = /\$icons\s*:\s*\(([\s\S]*?)\)\s*;/;
const MAP_PAIR_RE = /['"]([A-Za-z0-9_-]+)['"]\s*:\s*['"]([0-9a-fA-F]+)['"]/g;

function normalizeHex(s) {
  return s.toLowerCase();
}

/** @returns {Record<string,string> | null} */
export function parseLegacyScss(text) {
  const out = {};
  let m;
  let count = 0;
  while ((m = VAR_RE.exec(text))) {
    out[m[1]] = normalizeHex(m[2]);
    count++;
  }
  return count > 0 ? out : null;
}

/** @returns {Record<string,string> | null} */
export function parseMapScss(text) {
  const block = text.match(MAP_BLOCK_RE);
  if (!block) return null;
  const inner = block[1];
  const out = {};
  let m;
  let count = 0;
  while ((m = MAP_PAIR_RE.exec(inner))) {
    out[m[1]] = normalizeHex(m[2]);
    count++;
  }
  return count > 0 ? out : null;
}

/** @returns {Record<string,string> | null} */
export function parseUnicodesJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`unicodesMap.json is not valid JSON: ${e.message}`);
  }
  if (!parsed || typeof parsed !== "object") return null;

  const out = {};
  let count = 0;
  for (const [rawName, rawCp] of Object.entries(parsed)) {
    const name = rawName.replace(/^o9con-/, "");
    if (!name) continue;
    let cp;
    if (typeof rawCp === "number") {
      cp = rawCp.toString(16);
    } else if (typeof rawCp === "string" && /^[0-9a-fA-F]+$/.test(rawCp)) {
      cp = rawCp;
    } else {
      throw new Error(
        `unicodesMap.json entry "${rawName}" has non-codepoint value: ${rawCp}`
      );
    }
    out[name] = normalizeHex(cp);
    count++;
  }
  return count > 0 ? out : null;
}

function sortKeys(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

function diffShallow(a, b, labelA, labelB) {
  const onlyA = [];
  const onlyB = [];
  const mismatched = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    if (!(k in a)) onlyB.push(k);
    else if (!(k in b)) onlyA.push(k);
    else if (a[k] !== b[k]) mismatched.push({ name: k, a: a[k], b: b[k] });
  }
  if (onlyA.length || onlyB.length || mismatched.length) {
    const parts = [
      `${labelA} and ${labelB} disagree on the icon map:`,
    ];
    if (onlyA.length)
      parts.push(`  only in ${labelA} (${onlyA.length}): ${onlyA.slice(0, 5).join(", ")}${onlyA.length > 5 ? ", ..." : ""}`);
    if (onlyB.length)
      parts.push(`  only in ${labelB} (${onlyB.length}): ${onlyB.slice(0, 5).join(", ")}${onlyB.length > 5 ? ", ..." : ""}`);
    if (mismatched.length) {
      parts.push(`  codepoint mismatches (${mismatched.length}):`);
      for (const x of mismatched.slice(0, 5)) {
        parts.push(`    ${x.name}: ${labelA}=${x.a}  ${labelB}=${x.b}`);
      }
      if (mismatched.length > 5) parts.push("    ...");
    }
    throw new Error(parts.join("\n"));
  }
}

/**
 * @param {{scss?:string, unicodesJson?:string, css?:string}} sources
 *        Absolute paths to whatever is present in the drop.
 * @returns {{ icons: Record<string,string>, format: string, formatsSeen: string[] }}
 *          Icons map name -> hex codepoint, lowercased & alphabetized.
 */
export function parseDropIcons(sources) {
  const results = [];

  if (sources.scss) {
    const text = readFileSync(sources.scss, "utf8");
    // Try both formats on the same file -- some Nucleo exports include both.
    const legacy = parseLegacyScss(text);
    const map = parseMapScss(text);
    if (legacy && map) {
      diffShallow(legacy, map, "scss vars", "scss map");
      results.push({ label: "scss (legacy vars)", icons: legacy });
    } else if (legacy) {
      results.push({ label: "scss (legacy vars)", icons: legacy });
    } else if (map) {
      results.push({ label: "scss ($icons map)", icons: map });
    }
  }

  if (sources.unicodesJson) {
    const text = readFileSync(sources.unicodesJson, "utf8");
    const icons = parseUnicodesJson(text);
    if (icons) results.push({ label: "unicodesMap.json", icons });
  }

  // css/icons.css is intentionally NOT used as a primary source -- it's the
  // generated CSS that the SCSS or JSON already describes. Reserved as a
  // future fallback only.

  if (results.length === 0) {
    throw new Error(
      "Could not parse an icon map from any source file. Expected one of:\n" +
        "  scss/icons.scss   ($o9con-NAME: unicode(XXXX);  OR  $icons: (NAME: 'XXXX', ...))\n" +
        "  unicodesMap.json  ({ \"o9con-NAME\": <decimal-codepoint> })"
    );
  }

  // Cross-validate every pair.
  for (let i = 1; i < results.length; i++) {
    diffShallow(results[0].icons, results[i].icons, results[0].label, results[i].label);
  }

  return {
    icons: sortKeys(results[0].icons),
    format: results[0].label,
    formatsSeen: results.map((r) => r.label),
  };
}
