import { CELL_SIZE } from "../constants";
import { cellKey, parseKey } from "./cellUtils";
import { svgToDataUrl } from "./svgUtils";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function getOccupiedBounds(cells) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [key, cell] of cells) {
    const { r, c } = parseKey(key);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (cell.spanWidth >= 1) {
      if (c < minC) minC = c;
      if (c + cell.spanWidth - 1 > maxC) maxC = c + cell.spanWidth - 1;
    } else {
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }
  }
  if (minR === Infinity) return null;
  return { minR, maxR, minC, maxC };
}

export async function svgStringToImage(svgStr, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = svgToDataUrl(svgStr);
  });
}

// Helper: save a Blob via File System Access API (file picker) or fallback download
export async function saveBlobWithPicker(blob, suggestedName, description, accept) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description, accept }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // user cancelled
      // Fall through to legacy download
    }
  }
  // Fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAsPng(cells, symbols, cellSize, fileName) {
  const bounds = getOccupiedBounds(cells);
  if (!bounds) return;
  const { minR, maxR, minC, maxC } = bounds;
  const cols = maxC - minC + 1;
  const rows = maxR - minR + 1;
  const cs = cellSize || CELL_SIZE;
  const width = cols * cs;
  const height = rows * cs;

  // Build set of occupied cell keys (relative to bounds origin)
  const occupied = new Set();
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    occupied.add(`${r - minR},${c - minC}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // White background only for occupied cells
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    const x = (c - minC) * cs;
    const y = (r - minR) * cs;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }

  // Grid lines only around occupied cells
  ctx.strokeStyle = "#1e2a4a";
  ctx.lineWidth = 0.5;
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    const lr = r - minR;
    const lc = c - minC;
    const x = lc * cs;
    const y = lr * cs;
    if (!occupied.has(`${lr - 1},${lc}`)) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cs, y); ctx.stroke();
    }
    if (!occupied.has(`${lr + 1},${lc}`)) {
      ctx.beginPath(); ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); ctx.stroke();
    }
    if (!occupied.has(`${lr},${lc - 1}`)) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cs); ctx.stroke();
    }
    if (!occupied.has(`${lr},${lc + 1}`)) {
      ctx.beginPath(); ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); ctx.stroke();
    }
    if (occupied.has(`${lr + 1},${lc}`)) {
      ctx.beginPath(); ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); ctx.stroke();
    }
    if (occupied.has(`${lr},${lc + 1}`)) {
      ctx.beginPath(); ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); ctx.stroke();
    }
  }

  // Draw symbols
  const drawn = new Set();
  for (const [key, cell] of cells) {
    if (cell.spanWidth === 0 || drawn.has(key)) continue;
    drawn.add(key);
    const { r, c } = parseKey(key);
    const sym = symbols.find((s) => s.id === cell.symbolId);
    if (!sym?.svgContent) continue;
    const x = (c - minC) * cs;
    const y = (r - minR) * cs;
    const w = cell.spanWidth * cs;
    try {
      const img = await svgStringToImage(sym.svgContent, w, cs);
      ctx.drawImage(img, x + 2, y + 2, w - 4, cs - 4);
    } catch (e) { /* skip broken SVGs */ }
  }

  // Save via file picker
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) {
    await saveBlobWithPicker(blob, (fileName || "gridmark-export") + ".png", "PNG Image", { "image/png": [".png"] });
  }
}

export async function exportAsSvg(cells, symbols, cellSize) {
  const bounds = getOccupiedBounds(cells);
  if (!bounds) return;
  const { minR, maxR, minC, maxC } = bounds;
  const cols = maxC - minC + 1;
  const rows = maxR - minR + 1;
  const cs = cellSize || CELL_SIZE;
  const width = cols * cs;
  const height = rows * cs;

  // Build set of occupied cell keys (relative to bounds origin)
  const occupied = new Set();
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    occupied.add(`${r - minR},${c - minC}`);
  }

  let svgParts = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  // White backgrounds only for occupied cells
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    const x = (c - minC) * cs;
    const y = (r - minR) * cs;
    svgParts.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${cs - 1}" height="${cs - 1}" fill="#ffffff"/>`);
  }

  // Grid lines only around occupied cells
  svgParts.push(`<g stroke="#1e2a4a" stroke-width="0.5">`);
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    const lr = r - minR;
    const lc = c - minC;
    const x = lc * cs;
    const y = lr * cs;
    if (!occupied.has(`${lr - 1},${lc}`)) {
      svgParts.push(`<line x1="${x}" y1="${y}" x2="${x + cs}" y2="${y}"/>`);
    }
    if (!occupied.has(`${lr + 1},${lc}`)) {
      svgParts.push(`<line x1="${x}" y1="${y + cs}" x2="${x + cs}" y2="${y + cs}"/>`);
    }
    if (!occupied.has(`${lr},${lc - 1}`)) {
      svgParts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cs}"/>`);
    }
    if (!occupied.has(`${lr},${lc + 1}`)) {
      svgParts.push(`<line x1="${x + cs}" y1="${y}" x2="${x + cs}" y2="${y + cs}"/>`);
    }
    if (occupied.has(`${lr + 1},${lc}`)) {
      svgParts.push(`<line x1="${x}" y1="${y + cs}" x2="${x + cs}" y2="${y + cs}"/>`);
    }
    if (occupied.has(`${lr},${lc + 1}`)) {
      svgParts.push(`<line x1="${x + cs}" y1="${y}" x2="${x + cs}" y2="${y + cs}"/>`);
    }
  }
  svgParts.push(`</g>`);

  // Symbols — embed each SVG inline using <image> with data URL
  const drawn = new Set();
  for (const [key, cell] of cells) {
    if (cell.spanWidth === 0 || drawn.has(key)) continue;
    drawn.add(key);
    const { r, c } = parseKey(key);
    const sym = symbols.find((s) => s.id === cell.symbolId);
    if (!sym?.svgContent) continue;
    const x = (c - minC) * cs;
    const y = (r - minR) * cs;
    const w = cell.spanWidth * cs;
    const dataUrl = svgToDataUrl(sym.svgContent);
    svgParts.push(`<image x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${cs - 4}" href="${dataUrl}"/>`);
  }

  svgParts.push(`</svg>`);
  const svgStr = svgParts.join("\n");

  // Save via file picker
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  await saveBlobWithPicker(blob, "gridmark-export.svg", "SVG Image", { "image/svg+xml": [".svg"] });
}

export async function exportGridmarkJson(cells, symbols, gridRows, gridCols) {
  const cellsArr = [];
  for (const [key, cell] of cells) {
    cellsArr.push({ key, ...cell });
  }
  // Only include symbols that are actually used in cells
  const usedIds = new Set();
  for (const [, cell] of cells) {
    if (cell.symbolId) usedIds.add(cell.symbolId);
  }
  const usedSymbols = symbols
    .filter((s) => usedIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, width: s.width, svgContent: s.svgContent }));

  const data = {
    format: "gridmark",
    version: 1,
    gridRows,
    gridCols,
    symbols: usedSymbols,
    cells: cellsArr,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  await saveBlobWithPicker(blob, "gridmark-project.json", "Gridmark JSON", { "application/json": [".json"] });
}
