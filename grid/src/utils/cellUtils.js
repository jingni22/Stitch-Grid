// ═══════════════════════════════════════════════════════════════════════════════
// CELL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function cellKey(r, c) {
  return `${r},${c}`;
}

export function parseKey(key) {
  const [r, c] = key.split(",").map(Number);
  return { r, c };
}

export function cloneCells(map) {
  return new Map(map);
}

export function removeSpanContaining(cellsMap, key) {
  const cell = cellsMap.get(key);
  if (!cell) return;
  if (cell.spanWidth >= 1) {
    const { r, c } = parseKey(key);
    for (let i = 0; i < cell.spanWidth; i++) cellsMap.delete(cellKey(r, c + i));
  } else if (cell.spanWidth === 0 && cell.spanRoot) {
    const rootCell = cellsMap.get(cell.spanRoot);
    if (rootCell) {
      const { r, c: rootC } = parseKey(cell.spanRoot);
      for (let i = 0; i < rootCell.spanWidth; i++) cellsMap.delete(cellKey(r, rootC + i));
    }
  }
}

export function resolveRoot(cellsMap, key) {
  const cell = cellsMap.get(key);
  if (!cell) return null;
  if (cell.spanWidth >= 1) return key;
  if (cell.spanRoot) return cell.spanRoot;
  return null;
}
