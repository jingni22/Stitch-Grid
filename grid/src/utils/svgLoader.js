// ═══════════════════════════════════════════════════════════════════════════════
// SVG LOADER — imports SVG files from ./svgs/ at build time via Vite glob
// ═══════════════════════════════════════════════════════════════════════════════

const svgModules = import.meta.glob("../svgs/**/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
});

function parseViewBox(svgContent) {
  const match = svgContent.match(/viewBox\s*=\s*["']([^"']+)["']/);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(isNaN)) return null;
  return { width: parts[2], height: parts[3] };
}

function computeDefaultWidth(svgContent) {
  const vb = parseViewBox(svgContent);
  if (!vb || vb.height === 0) return 1;
  return Math.max(1, Math.min(20, Math.round(vb.width / vb.height)));
}

function fileNameToDisplayName(fileName) {
  return fileName
    .replace(/\.svg$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Build flat list and nested tree from the glob results
export const flatSvgList = [];
export const svgTree = { __files: [] };

let _idCounter = 0;
for (const [modulePath, svgContent] of Object.entries(svgModules)) {
  // modulePath looks like "../svgs/basic/dot.svg"
  // Strip the leading "../svgs/" to get "basic/dot.svg"
  const path = modulePath.replace(/^.*?\/svgs\//, "");
  const segments = path.split("/");
  const fileName = segments.pop();
  const folderSegments = segments;
  const defaultWidth = computeDefaultWidth(svgContent);
  const name = fileNameToDisplayName(fileName);
  const id = `dir_${_idCounter++}`;
  const pathLabel =
    folderSegments
      .map((s) =>
        s
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      )
      .join(" / ") || "Root";

  const item = { id, name, svgContent, defaultWidth, pathLabel, fileName };
  flatSvgList.push(item);

  let node = svgTree;
  for (const seg of folderSegments) {
    if (!node[seg]) node[seg] = { __files: [] };
    node = node[seg];
  }
  node.__files.push(item);
}

export const DEFAULT_SYMBOLS = flatSvgList.map((item) => ({
  id: item.id,
  name: item.name,
  width: item.defaultWidth,
  svgContent: item.svgContent,
}));
