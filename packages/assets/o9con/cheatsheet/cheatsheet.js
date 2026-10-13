/* ============================================================================
 * o9con cheatsheet UI logic
 *
 * Reads window.O9CON_DATA (injected by data.js). Renders one group per
 * IconsSets.json bucket plus a synthetic "Aliases" group. Supports live
 * search and click-to-copy.
 * ========================================================================== */

const data = window.O9CON_DATA;

if (!data || !data.icons) {
  document.getElementById("main").innerHTML =
    '<p class="empty">data.js is missing or invalid. Run <code>pnpm --filter @arvo/assets run o9con:update</code>.</p>';
  throw new Error("O9CON_DATA missing");
}

// ---------- header populate ----------
document.getElementById("iconCount").textContent = Object.keys(data.icons).length;
document.getElementById("version").textContent = data.version || "?";

// ---------- group ordering (cosmetic) ----------
const GROUP_ORDER = [
  "new_icons",
  "directional",
  "ui",
  "editor",
  "data",
  "files",
  "chat",
  "media",
  "hand",
  "transport",
  "currency",
  "accessibility",
  "all",
];

const GROUP_LABELS = {
  new_icons:     "New Icons",
  directional:   "Directional",
  ui:            "UI",
  editor:        "Editor",
  data:          "Data",
  files:         "Files",
  chat:          "Chat",
  media:         "Media",
  hand:          "Hand",
  transport:     "Transport",
  currency:      "Currency",
  accessibility: "Accessibility",
  all:           "All Icons",
  aliases:       "Aliases",
};

// ---------- alias group derivation ----------
const aliasNames = [];
const aliasOf = {}; // aliasName -> canonical
for (const [canonical, list] of Object.entries(data.aliases || {})) {
  if (!(canonical in data.icons)) continue;       // dead alias
  for (const a of list) {
    if (a in data.icons) continue;                // alias shadowed by real icon
    aliasNames.push(a);
    aliasOf[a] = canonical;
  }
}
aliasNames.sort();

// ---------- icon -> codepoint helpers ----------
function codepointFor(name) {
  if (name in data.icons) return data.icons[name];
  if (name in aliasOf)    return data.icons[aliasOf[name]];
  return "";
}

const newIconsSet = new Set(data.groups?.new_icons ?? []);

// ---------- tile factory ----------
function buildTile(name, kind) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "tile";
  tile.dataset.name = name;
  tile.dataset.kind = kind;
  tile.dataset.search = name.toLowerCase();
  tile.title = `Click to copy "o9con-${name}"`;

  const icoWrap = document.createElement("span");
  icoWrap.className = "tile__icon";
  const ico = document.createElement("i");
  ico.className = `o9con o9con-${name}`;
  ico.setAttribute("aria-hidden", "true");
  icoWrap.appendChild(ico);
  tile.appendChild(icoWrap);

  const nm = document.createElement("div");
  nm.className = "tile__name";
  nm.textContent = name;
  tile.appendChild(nm);

  const cp = codepointFor(name);
  const code = document.createElement("div");
  code.className = "tile__code";
  code.textContent = cp ? `\\${cp}` : "";
  tile.appendChild(code);

  if (kind === "alias") {
    const tag = document.createElement("span");
    tag.className = "tile__tag tile__tag--alias";
    tag.textContent = "alias";
    tile.appendChild(tag);
  } else if (newIconsSet.has(name)) {
    const tag = document.createElement("span");
    tag.className = "tile__tag tile__tag--new";
    tag.textContent = "new";
    tile.appendChild(tag);
  }
  return tile;
}

// ---------- group rendering ----------
function buildGroup(key, items, kind) {
  if (!items || items.length === 0) return null;
  const g = document.createElement("section");
  g.className = "group";
  g.dataset.group = key;

  const hdr = document.createElement("div");
  hdr.className = "group__header";
  hdr.innerHTML = `
    <span class="group__caret">&#9660;</span>
    <h2 class="group__title">${GROUP_LABELS[key] ?? key}</h2>
    <span class="group__count">${items.length}</span>
  `;
  g.appendChild(hdr);

  const grid = document.createElement("div");
  grid.className = "group__grid";
  for (const n of items) grid.appendChild(buildTile(n, kind));
  g.appendChild(grid);

  hdr.addEventListener("click", () => g.classList.toggle("collapsed"));

  return g;
}

const main = document.getElementById("main");
main.innerHTML = "";

for (const key of GROUP_ORDER) {
  const items = [...(data.groups?.[key] ?? [])].sort();
  const g = buildGroup(key, items, "icon");
  if (g) main.appendChild(g);
  // Collapse "all" by default -- it's huge.
  if (g && key === "all") g.classList.add("collapsed");
}

// Aliases group (toggleable via checkbox).
const aliasesGroup = buildGroup("aliases", aliasNames, "alias");
if (aliasesGroup) {
  aliasesGroup.classList.add("collapsed");
  aliasesGroup.dataset.alias = "1";
  main.appendChild(aliasesGroup);
}

// ---------- search ----------
const searchInput = document.getElementById("search");
const toggleAliases = document.getElementById("toggleAliases");

function applyFilters() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const showAliases = toggleAliases.checked;
  for (const grp of main.querySelectorAll(".group")) {
    const isAlias = grp.dataset.alias === "1";
    if (isAlias && !showAliases && q === "") {
      grp.style.display = "none";
      continue;
    }
    let visibleInGroup = 0;
    for (const t of grp.querySelectorAll(".tile")) {
      const match = q === "" ? true : t.dataset.search.includes(q);
      if (isAlias && !showAliases && q === "") {
        t.style.display = "none";
      } else {
        t.style.display = match ? "" : "none";
        if (match) visibleInGroup++;
      }
    }
    grp.style.display = visibleInGroup > 0 ? "" : "none";
    // Auto-expand a group when the user has typed something.
    if (q !== "" && visibleInGroup > 0) {
      grp.classList.remove("collapsed");
    }
  }
}

searchInput.addEventListener("input", applyFilters);
toggleAliases.addEventListener("change", applyFilters);
applyFilters();

// ---------- click to copy ----------
const toast = document.getElementById("toast");
let toastTimer = 0;
function flashToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

main.addEventListener("click", async (e) => {
  const tile = e.target.closest(".tile");
  if (!tile) return;
  const cls = `o9con-${tile.dataset.name}`;
  try {
    await navigator.clipboard.writeText(cls);
    flashToast(`Copied: ${cls}`);
  } catch {
    // Older browsers / file:// quirks: fall back to a select+copy.
    const ta = document.createElement("textarea");
    ta.value = cls;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); flashToast(`Copied: ${cls}`); }
    catch { flashToast(`Copy failed -- ${cls}`); }
    document.body.removeChild(ta);
  }
});

// Keyboard shortcut: '/' focuses search.
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});
