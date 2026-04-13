// ═══════════════════════════════════════════════════════════════════════════════
// SVG UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const _svgDataUrlCache = new Map();

export function svgToDataUrl(svgString) {
  let url = _svgDataUrlCache.get(svgString);
  if (url) return url;
  const encoded = encodeURIComponent(svgString);
  const bytes = encoded.replace(/%([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  url = `data:image/svg+xml;base64,${btoa(bytes)}`;
  _svgDataUrlCache.set(svgString, url);
  return url;
}

export function parseViewBox(svgContent) {
  const match = svgContent.match(/viewBox\s*=\s*["']([^"']+)["']/);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(isNaN)) return null;
  return { width: parts[2], height: parts[3] };
}

export function computeDefaultWidth(svgContent) {
  const vb = parseViewBox(svgContent);
  if (!vb || vb.height === 0) return 1;
  return Math.max(1, Math.min(20, Math.round(vb.width / vb.height)));
}

export function fileNameToDisplayName(fileName) {
  return fileName.replace(/\.svg$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD-TIME SVG DIRECTORY
//
// Vite scans src/assets/svgs/ at build time via import.meta.glob.
// Each .svg is imported as its raw text content (?raw suffix).
// Subfolder structure is preserved in the tree.
//
// To add symbols: drop .svg files into src/assets/svgs/ (or subfolders)
// and rebuild. They will appear in the sidebar directory automatically.
// ═══════════════════════════════════════════════════════════════════════════════

// Eagerly import every .svg under assets/svgs/ as raw text
const svgModules = import.meta.glob("../assets/svgs/**/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
});

// Build the directory tree from the glob results
// Keys look like: "../assets/svgs/basic/dot.svg" → folder "basic", file "dot.svg"
const BASE_PREFIX = "../assets/svgs/";

function buildSvgTree() {
  const tree = { __files: [] };
  let idCounter = 0;

  for (const [path, svgContent] of Object.entries(svgModules)) {
    // Strip the base prefix to get the relative path, e.g. "basic/dot.svg"
    const relative = path.startsWith(BASE_PREFIX)
      ? path.slice(BASE_PREFIX.length)
      : path;

    const segments = relative.split("/");
    const fileName = segments.pop();
    const folderSegments = segments; // everything except the file name

    const defaultWidth = computeDefaultWidth(svgContent);
    const name = fileNameToDisplayName(fileName);
    const id = `dir_${idCounter++}`;
    const pathLabel =
      folderSegments
        .map((s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(" / ") || "Root";

    const item = { id, name, svgContent, defaultWidth, pathLabel, fileName };

    // Walk/create nested folder nodes
    let node = tree;
    for (const seg of folderSegments) {
      if (!node[seg]) node[seg] = { __files: [] };
      node = node[seg];
    }
    node.__files.push(item);
  }

  return tree;
}

export const svgTree = buildSvgTree();