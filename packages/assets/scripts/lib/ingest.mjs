/**
 * Ingest the latest o9con UX drop.
 *
 * Scans `packages/assets/o9con/source/` for a folder (or loose files) that
 * looks like a Nucleo export, validates that it contains the required font
 * files plus at least one icon-name source, and returns paths the rest of
 * the pipeline consumes.
 *
 * Drop layouts accepted:
 *
 *   source/<any folder>/
 *     fonts/o9con.{eot,svg,ttf,woff,woff2}
 *     scss/icons.scss          (or)
 *     unicodesMap.json         (or)
 *     css/icons.css
 *
 *   source/
 *     fonts/o9con.{eot,svg,ttf,woff,woff2}    (loose)
 *     scss/icons.scss
 *     ...
 *
 * If multiple candidate drops exist, the most recently modified one wins.
 */
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const FONT_FILES = [
  "o9con.eot",
  "o9con.svg",
  "o9con.ttf",
  "o9con.woff",
  "o9con.woff2",
];

const SOURCE_CANDIDATES = [
  "scss/icons.scss",
  "unicodesMap.json",
  "css/icons.css",
];

/**
 * @typedef {Object} Drop
 * @property {string} root        Absolute path to the drop folder.
 * @property {string} label       Human-readable label (folder basename).
 * @property {Object} fonts       { eot, svg, ttf, woff, woff2 } absolute paths.
 * @property {Object} sources     { scss?, unicodesJson?, css? } absolute paths to whatever is present.
 */

function fileExists(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isValidDrop(root) {
  const fontDir = join(root, "fonts");
  if (!existsSync(fontDir) || !statSync(fontDir).isDirectory()) return false;
  for (const f of FONT_FILES) {
    if (!fileExists(join(fontDir, f))) return false;
  }
  return SOURCE_CANDIDATES.some((rel) => fileExists(join(root, rel)));
}

function asDrop(root) {
  const fonts = Object.fromEntries(
    FONT_FILES.map((f) => [f.split(".")[1], join(root, "fonts", f)])
  );
  const sources = {};
  const scss = join(root, "scss", "icons.scss");
  const uj = join(root, "unicodesMap.json");
  const css = join(root, "css", "icons.css");
  if (fileExists(scss)) sources.scss = scss;
  if (fileExists(uj)) sources.unicodesJson = uj;
  if (fileExists(css)) sources.css = css;
  return {
    root,
    label: basename(root),
    fonts,
    sources,
  };
}

/**
 * @param {string} sourceDir   Absolute path to packages/assets/o9con/source.
 * @returns {Drop}
 */
export function findLatestDrop(sourceDir) {
  if (!existsSync(sourceDir)) {
    throw new Error(`o9con source/ directory not found: ${sourceDir}`);
  }

  // Candidate roots: either subdirectories of source/, or source/ itself
  // when fonts/ are placed loose.
  const entries = readdirSync(sourceDir, { withFileTypes: true });
  const subdirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => join(sourceDir, e.name));

  const candidates = subdirs.filter(isValidDrop);
  if (isValidDrop(sourceDir)) candidates.push(sourceDir);

  if (candidates.length === 0) {
    const looseFiles = entries
      .filter((e) => e.isFile() && e.name !== "README.md")
      .map((e) => e.name);
    const subdirNames = subdirs.map((d) => basename(d));
    throw new Error(
      [
        "No valid o9con drop found in source/.",
        "",
        "A drop is a folder (or the source/ directory itself) containing:",
        "  fonts/o9con.{eot,svg,ttf,woff,woff2}   (all five)",
        "  AND at least one of: scss/icons.scss, unicodesMap.json, css/icons.css",
        "",
        `Scanned: ${sourceDir}`,
        `  subdirs found: ${subdirNames.length ? subdirNames.join(", ") : "(none)"}`,
        `  loose files:   ${looseFiles.length ? looseFiles.join(", ") : "(none)"}`,
        "",
        "See packages/assets/o9con/source/README.md for the expected layout.",
      ].join("\n")
    );
  }

  // Pick the most recently modified candidate.
  const ranked = candidates
    .map((r) => ({ root: r, mtime: statSync(r).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (ranked.length > 1) {
    console.log(
      `Multiple drops found; picking most recent: ${basename(ranked[0].root)}`
    );
    for (let i = 1; i < ranked.length; i++) {
      console.log(`  (skipped) ${basename(ranked[i].root)}`);
    }
  }

  return asDrop(ranked[0].root);
}

/** Convenience: read the picked source descriptor as text, in priority order. */
export function readPreferredSource(drop) {
  if (drop.sources.scss) {
    return { kind: "scss", path: drop.sources.scss, text: readFileSync(drop.sources.scss, "utf8") };
  }
  if (drop.sources.unicodesJson) {
    return {
      kind: "unicodes-json",
      path: drop.sources.unicodesJson,
      text: readFileSync(drop.sources.unicodesJson, "utf8"),
    };
  }
  if (drop.sources.css) {
    return { kind: "css", path: drop.sources.css, text: readFileSync(drop.sources.css, "utf8") };
  }
  throw new Error(`Drop has no parseable icon source: ${drop.root}`);
}
