// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

import { CELL_SIZE } from "./constants";
import { svgToDataUrl, parseKey } from "./cellUtils";

export function getOccupiedBounds(cells) {
  let minR = Infinity,
    maxR = -Infinity,
    minC = Infinity,
    maxC = -Infinity;
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

async function svgStringToImage(svgStr, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = svgToDataUrl(svgStr);
  });
}

export async function exportAsPng(cells, symbols, cellSize) {
  const bounds = getOccupiedBounds(cells);
  if (!bounds) return;
  const { minR, maxR, minC, maxC } = bounds;
  const cols = maxC - minC + 1;
  const rows = maxR - minR + 1;
  const cs = cellSize || CELL_SIZE;
  const width = cols * cs;
  const height = rows * cs;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // White background for occupied cells
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    const x = (c - minC) * cs;
    const y = (r - minR) * cs;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }

  // Grid lines over all occupied area
  ctx.strokeStyle = "#1e2a4a";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cs, 0);
    ctx.lineTo(c * cs, height);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cs);
    ctx.lineTo(width, r * cs);
    ctx.stroke();
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
    } catch (e) {
      /* skip broken SVGs */
    }
  }

  // Trigger download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gridmark-export.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function exportAsSvg(cells, symbols, cellSize) {
  const bounds = getOccupiedBounds(cells);
  if (!bounds) return;
  const { minR, maxR, minC, maxC } = bounds;
  const cols = maxC - minC + 1;
  const rows = maxR - minR + 1;
  const cs = cellSize || CELL_SIZE;
  const width = cols * cs;
  const height = rows * cs;

  let svgParts = [];
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );

  // White backgrounds for occupied cells
  for (const [key] of cells) {
    const { r, c } = parseKey(key);
    const x = (c - minC) * cs;
    const y = (r - minR) * cs;
    svgParts.push(
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${cs - 1}" height="${cs - 1}" fill="#ffffff"/>`
    );
  }

  // Grid lines
  svgParts.push(`<g stroke="#1e2a4a" stroke-width="0.5">`);
  for (let c = 0; c <= cols; c++) {
    svgParts.push(
      `<line x1="${c * cs}" y1="0" x2="${c * cs}" y2="${height}"/>`
    );
  }
  for (let r = 0; r <= rows; r++) {
    svgParts.push(
      `<line x1="0" y1="${r * cs}" x2="${width}" y2="${r * cs}"/>`
    );
  }
  svgParts.push(`</g>`);

  // Symbols
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
    svgParts.push(
      `<image x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${cs - 4}" href="${dataUrl}"/>`
    );
  }

  svgParts.push(`</svg>`);
  const svgStr = svgParts.join("\n");

  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gridmark-export.svg";
  a.click();
  URL.revokeObjectURL(url);
}
