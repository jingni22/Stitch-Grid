import { useState, useRef, useEffect } from "react";
import { CELL_SIZE } from "../utils/constants";
import { svgToDataUrl, cellKey, parseKey } from "../utils/cellUtils";
import { getOccupiedBounds } from "../utils/exportUtils";

export default function KnittingCanvas({ cells, symbols, onExit }) {
  const containerRef = useRef(null);
  const [slashedCount, setSlashedCount] = useState(0);

  // Compute bounds and occupied rows
  const bounds = getOccupiedBounds(cells);
  const occupiedRows = [];
  if (bounds) {
    const rowSet = new Set();
    for (const [key] of cells) {
      const { r } = parseKey(key);
      rowSet.add(r);
    }
    occupiedRows.push(...[...rowSet].sort((a, b) => b - a));
  }

  // Compute viewport to fit all symbols
  const [dims, setDims] = useState({ w: 800, h: 600 });
  useEffect(() => {
    if (containerRef.current) {
      setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    }
    const onResize = () => {
      if (containerRef.current) setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!bounds) {
    return (
      <div ref={containerRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", color: "#7070b0", fontSize: 14 }}>
        No symbols to display.
        <button onClick={onExit} style={{ marginLeft: 16, padding: "6px 16px", background: "#e94560", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>EXIT</button>
      </div>
    );
  }

  const { minR, maxR, minC, maxC } = bounds;
  const gridCols = maxC - minC + 1;
  const gridRows = maxR - minR + 1;
  const cs_base = CELL_SIZE;

  const PAD = 20;
  const availW = dims.w - PAD * 2;
  const availH = dims.h - PAD * 2 - 60;
  const scaleX = availW / (gridCols * cs_base);
  const scaleY = availH / (gridRows * cs_base);
  const scale = Math.min(scaleX, scaleY, 3);
  const cs = cs_base * scale;

  const totalW = gridCols * cs;
  const totalH = gridRows * cs;

  const offsetX = PAD + Math.max(0, (availW - totalW) / 2);
  const offsetY = PAD + 60 + availH - totalH;

  const knittingCells = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const key = cellKey(r, c);
      const cell = cells.get(key);
      knittingCells.push({ r, c, key, cell });
    }
  }

  const slashedRows = new Set(occupiedRows.slice(0, slashedCount));

  const nextRow = () => {
    if (slashedCount < occupiedRows.length) setSlashedCount((c) => c + 1);
  };
  const prevRow = () => {
    if (slashedCount > 0) setSlashedCount((c) => c - 1);
  };

  return (
    <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", background: "#1a1a2e" }}>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 50, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        background: "rgba(22,33,62,0.95)", borderBottom: "1px solid #0f3460",
      }}>
        <button onClick={prevRow} disabled={slashedCount === 0}
          style={{
            padding: "8px 18px", borderRadius: 6, cursor: slashedCount === 0 ? "default" : "pointer",
            background: "#1a2a3a", border: "1px solid #3a5a7a", color: slashedCount === 0 ? "#334" : "#80c0ff",
            fontSize: 12, fontWeight: 700, fontFamily: "inherit", opacity: slashedCount === 0 ? 0.4 : 1,
          }}>↑ PREV ROW</button>
        <div style={{ color: "#f0c060", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>KNITTING MODE</div>
        <button onClick={nextRow} disabled={slashedCount >= occupiedRows.length}
          style={{
            padding: "8px 18px", borderRadius: 6, cursor: slashedCount >= occupiedRows.length ? "default" : "pointer",
            background: "#1a2a3a", border: "1px solid #3a5a7a", color: slashedCount >= occupiedRows.length ? "#334" : "#80c0ff",
            fontSize: 12, fontWeight: 700, fontFamily: "inherit", opacity: slashedCount >= occupiedRows.length ? 0.4 : 1,
          }}>↓ NEXT ROW</button>
        <button onClick={onExit}
          style={{ padding: "8px 18px", borderRadius: 6, background: "#3a1a1a", border: "1px solid #7a3a3a", color: "#e94560", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>EXIT</button>
        <div style={{ color: "#5a7a9a", fontSize: 10, marginLeft: 8 }}>{slashedCount} / {occupiedRows.length} rows</div>
      </div>

      {/* White cell backgrounds */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        {knittingCells.map(({ r, c, key, cell }) => {
          if (!cell) return null;
          const isSlashed = slashedRows.has(r);
          const x = offsetX + (c - minC) * cs;
          const y = offsetY + (r - minR) * cs;
          return (
            <div key={`kbg-${key}`} style={{
              position: "absolute", left: x + 0.5, top: y + 0.5, width: cs - 1, height: cs - 1,
              background: isSlashed ? "#888888" : "#ffffff", boxSizing: "border-box",
            }} />
          );
        })}
      </div>

      {/* Grid lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }}>
        {knittingCells.map(({ r, c, key, cell }) => {
          if (!cell) return null;
          const x = offsetX + (c - minC) * cs;
          const y = offsetY + (r - minR) * cs;
          return (
            <g key={`kgl-${key}`}>
              <line x1={x} y1={y} x2={x + cs} y2={y} stroke="#c0c0c0" strokeWidth="0.5" />
              <line x1={x} y1={y} x2={x} y2={y + cs} stroke="#c0c0c0" strokeWidth="0.5" />
              <line x1={x + cs} y1={y} x2={x + cs} y2={y + cs} stroke="#c0c0c0" strokeWidth="0.5" />
              <line x1={x} y1={y + cs} x2={x + cs} y2={y + cs} stroke="#c0c0c0" strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>

      {/* Symbol images */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}>
        {knittingCells.map(({ r, c, key, cell }) => {
          if (!cell || cell.spanWidth === 0) return null;
          const isSlashed = slashedRows.has(r);
          const x = offsetX + (c - minC) * cs;
          const y = offsetY + (r - minR) * cs;
          const w = cell.spanWidth * cs;
          const sym = symbols.find((s) => s.id === cell.symbolId);
          return (
            <div key={`ksim-${key}`} style={{
              position: "absolute", left: x, top: y, width: w, height: cs,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", boxSizing: "border-box", opacity: isSlashed ? 0.3 : 1,
            }}>
              {sym?.svgContent && (
                <img src={svgToDataUrl(sym.svgContent)} style={{ width: w - 4, height: cs - 4, objectFit: "fill", display: "block" }} alt="" draggable={false} />
              )}
            </div>
          );
        })}
      </div>

      {/* Slash-through lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
        {occupiedRows.slice(0, slashedCount).map((row) => {
          let rowMinC = Infinity, rowMaxC = -Infinity;
          for (const [key, cell] of cells) {
            const { r, c } = parseKey(key);
            if (r !== row) continue;
            if (c < rowMinC) rowMinC = c;
            const cellEnd = (cell.spanWidth >= 1) ? c + cell.spanWidth - 1 : c;
            if (cellEnd > rowMaxC) rowMaxC = cellEnd;
          }
          if (rowMinC === Infinity) return null;
          const x1 = offsetX + (rowMinC - minC) * cs;
          const x2 = offsetX + (rowMaxC - minC + 1) * cs;
          const y = offsetY + (row - minR) * cs + cs / 2;
          return (
            <line key={`slash-${row}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke="#e94560" strokeWidth={Math.max(2, cs * 0.06)} strokeLinecap="round" opacity="0.8" />
          );
        })}
      </svg>
    </div>
  );
}
