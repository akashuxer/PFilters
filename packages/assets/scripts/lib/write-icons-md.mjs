/**
 * Regenerate `tools/o9con-icons.md` so the canonical o9con allowlist used by
 * `tools/validate-stories.mjs` always matches the current icon font.
 *
 * The file is hybrid: most of it is hand-written (front-matter, rules,
 * alias-mapping table). Only the fenced block under
 *   `## Available o9con icon names`
 * is regenerated. The block is replaced by:
 *
 *   - every icon name from the current icon font, AND
 *   - every alias name from config/aliases.json (only if its canonical
 *     exists in the current font),
 *
 * with kebab segments converted back to spaces (the script's preferred
 * authoring form) and the whole list deduped + alphabetized.
 *
 * If the section heading or the fence cannot be found, an explanatory error
 * is thrown rather than silently writing nothing.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const HEADING = "## Available o9con icon names";

/**
 * @param {{
 *   icons: Record<string,string>,
 *   aliasesPath: string,
 *   targetPath: string,
 * }} args
 * @returns {{ written: string, totalNames: number, fromIcons: number, fromAliases: number }}
 */
export function writeIconsAllowlist({ icons, aliasesPath, targetPath }) {
  if (!existsSync(targetPath)) {
    throw new Error(
      `tools/o9con-icons.md not found at ${targetPath}. The pipeline requires this file to exist with a "${HEADING}" section.`
    );
  }
  const src = readFileSync(targetPath, "utf8");
  const headingIdx = src.indexOf(HEADING);
  if (headingIdx === -1) {
    throw new Error(
      `tools/o9con-icons.md is missing the "${HEADING}" heading. Cannot regenerate safely; restore the heading first.`
    );
  }

  // Locate the fence after the heading.
  const after = src.slice(headingIdx);
  const fenceStartRel = after.indexOf("```");
  if (fenceStartRel === -1) {
    throw new Error(
      `tools/o9con-icons.md has the "${HEADING}" heading but no fenced \`\`\` block after it.`
    );
  }
  const fenceStartAbs = headingIdx + fenceStartRel;
  // Find the matching closing fence.
  const fenceCloseRel = src.slice(fenceStartAbs + 3).indexOf("```");
  if (fenceCloseRel === -1) {
    throw new Error(
      `tools/o9con-icons.md has an opening \`\`\` after "${HEADING}" but no closing fence.`
    );
  }
  const fenceEndAbs = fenceStartAbs + 3 + fenceCloseRel + 3;

  // Build the new name list.
  const aliases = JSON.parse(readFileSync(aliasesPath, "utf8"));
  const aliasNames = [];
  for (const [canonical, list] of Object.entries(aliases)) {
    if (!(canonical in icons)) continue; // canonical retired; alias is dead
    for (const a of list) {
      if (a in icons) continue; // alias name now claimed by a real icon
      aliasNames.push(a);
    }
  }

  const allNames = [
    ...Object.keys(icons),
    ...aliasNames,
  ];
  const spaced = [...new Set(allNames.map((n) => n.replace(/-/g, " ")))].sort();

  const newBlock = "```\n" + spaced.join("\n") + "\n```";
  const next = src.slice(0, fenceStartAbs) + newBlock + src.slice(fenceEndAbs);

  writeFileSync(targetPath, next, "utf8");

  return {
    written: targetPath,
    totalNames: spaced.length,
    fromIcons: Object.keys(icons).length,
    fromAliases: aliasNames.length,
  };
}
