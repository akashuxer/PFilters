/**
 * Diff a newly-parsed icon map against the committed snapshot in
 * `o9con/state/current-icons.json`.
 *
 * The snapshot uses the same shape as the legacy CurrentUnicodesMap.json
 * (decimal codepoints, "o9con-" prefix). We normalize on read.
 *
 * Returns lists of icon names (no prefix), suitable for changelog + summary.
 */
import { existsSync, readFileSync } from "node:fs";

/**
 * @param {string} snapshotPath
 * @returns {Record<string,string>}  name (no prefix) -> hex codepoint
 */
export function loadSnapshot(snapshotPath) {
  if (!existsSync(snapshotPath)) return {};
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch (e) {
    throw new Error(`current-icons.json is not valid JSON: ${e.message}`);
  }
  const out = {};
  for (const [k, v] of Object.entries(parsed)) {
    const name = k.replace(/^o9con-/, "");
    if (typeof v === "number") out[name] = v.toString(16);
    else if (typeof v === "string" && /^[0-9a-fA-F]+$/.test(v)) out[name] = v.toLowerCase();
  }
  return out;
}

/**
 * @param {Record<string,string>} prev   { name: hex }
 * @param {Record<string,string>} next   { name: hex }
 * @returns {{ added: string[], removed: string[], changed: {name:string, from:string, to:string}[], unchanged: number }}
 */
export function diffIconMaps(prev, next) {
  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;

  const names = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const name of names) {
    const before = prev[name];
    const after = next[name];
    if (before === undefined) added.push(name);
    else if (after === undefined) removed.push(name);
    else if (before !== after) changed.push({ name, from: before, to: after });
    else unchanged++;
  }

  added.sort();
  removed.sort();
  changed.sort((a, b) => a.name.localeCompare(b.name));

  return { added, removed, changed, unchanged };
}

/**
 * Convert the parsed icons map ({ name: hex }) into the on-disk
 * current-icons.json shape ({ "o9con-name": <decimal> }) -- sorted by
 * codepoint (ascending) for clean line-by-line diffs.
 */
export function toSnapshotShape(icons) {
  const entries = Object.entries(icons).map(([name, hex]) => [
    `o9con-${name}`,
    parseInt(hex, 16),
  ]);
  entries.sort((a, b) => a[1] - b[1]);
  return Object.fromEntries(entries);
}

export function summarize(diff) {
  const lines = [];
  lines.push("Icon diff vs previous build:");
  lines.push(`  unchanged:  ${diff.unchanged}`);
  lines.push(`  added:      ${diff.added.length}`);
  lines.push(`  removed:    ${diff.removed.length}`);
  lines.push(`  changed:    ${diff.changed.length}   (same name, different codepoint)`);
  if (diff.added.length) {
    lines.push("");
    lines.push(`  + ${diff.added.join("\n  + ")}`);
  }
  if (diff.removed.length) {
    lines.push("");
    lines.push(`  - ${diff.removed.join("\n  - ")}`);
  }
  if (diff.changed.length) {
    lines.push("");
    for (const c of diff.changed) {
      lines.push(`  ~ ${c.name}  ${c.from} -> ${c.to}`);
    }
  }
  return lines.join("\n");
}
