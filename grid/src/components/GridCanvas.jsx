import { svgToDataUrl, cellKey, parseKey, resolveRoot } from "../utils/cellUtils";

export default function GridCanvas({
  containerRef,
  spaceDown,
  moveMode,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  offset,
  cs,
  zoom,
  cells,
  symbols,
  selected,
  dragRect,
  moveOffset,
  getViewport,
  selectionInfo,
  bgImage,
  bgImageEditing,
  bgImageStartDrag,
  gridRows,
  gridCols,
}) {
  const { r0, r1, c0, c1 } = getViewport();

  // Drag highlight rect
  let dragHighlight = null;
  if (dragRect && !moveMode) {
    const sr0 = Math.min(dragRect.start.r, dragRect.end.r);
    const sr1 = Math.max(dragRect.start.r, dragRect.end.r);
    const sc0 = Math.min(dragRect.start.c, dragRect.end.c);
    const sc1 = Math.max(dragRect.start.c, dragRect.end.c);
    dragHighlight = {
      left: offset.x + sc0 * cs,
      top: offset.y + sr0 * cs,
      width: (sc1 - sc0 + 1) * cs,
      height: (sr1 - sr0 + 1) * cs,
    };
  }

  // Build visible cells
  const cellsToRender = [];
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const key = cellKey(r, c);
      cellsToRender.push({ r, c, key, cell: cells.get(key), isSel: selected.has(key) });
    }

  const { dr: mdr, dc: mdc } = moveOffset;
  const selectedRootsForMove = new Set();
  if (moveMode)
    for (const key of selected) {
      const rk = resolveRoot(cells, key);
      if (rk) selectedRootsForMove.add(rk);
    }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        cursor: bgImageEditing ? "grab" : moveMode ? "grab" : spaceDown.current ? "grab" : "crosshair",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid lines — bottom layer, clipped to grid bounds */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
        <defs>
          <pattern id="smallGrid" width={cs} height={cs} patternUnits="userSpaceOnUse" x={offset.x} y={offset.y}>
            <path d={`M ${cs} 0 L 0 0 0 ${cs}`} fill="none" stroke="#1e2a4a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={offset.x} y={offset.y} width={gridCols * cs} height={gridRows * cs} fill="url(#smallGrid)" />
      </svg>

      {/* Background reference image */}
      {bgImage && (
        <img
          src={bgImage.src}
          alt=""
          draggable={false}
          style={{
            position: "absolute", left: 0, top: 0,
            transform: `translate(${offset.x + bgImage.col * cs}px, ${offset.y + bgImage.row * cs}px)`,
            width: bgImage.cellW * cs, height: bgImage.cellH * cs,
            opacity: bgImageEditing ? 0.35 : 0.2,
            pointerEvents: "none", zIndex: 1,
            objectFit: "fill", imageRendering: "auto", willChange: "transform",
          }}
        />
      )}

      {/* Background image editing handles */}
      {bgImage && bgImageEditing && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute", left: 0, top: 0,
              transform: `translate(${offset.x + bgImage.col * cs}px, ${offset.y + bgImage.row * cs}px)`,
              width: bgImage.cellW * cs, height: bgImage.cellH * cs,
              border: "2px dashed #f0a030", borderRadius: 4, cursor: "move",
              pointerEvents: "auto", boxSizing: "border-box", willChange: "transform",
            }}
            onMouseDown={(e) => bgImageStartDrag(e, "move")}
          >
            <div
              style={{
                position: "absolute", right: -6, bottom: -6, width: 14, height: 14,
                background: "#f0a030", border: "2px solid #1a1a2e", borderRadius: 3,
                cursor: "nwse-resize", pointerEvents: "auto",
              }}
              onMouseDown={(e) => { e.stopPropagation(); bgImageStartDrag(e, "resize"); }}
            />
            <div
              style={{
                position: "absolute", left: -6, top: -6, width: 14, height: 14,
                background: "#f0a030", border: "2px solid #1a1a2e", borderRadius: 3,
                cursor: "nwse-resize", pointerEvents: "auto",
              }}
              onMouseDown={(e) => { e.stopPropagation(); bgImageStartDrag(e, "resize"); }}
            />
          </div>
        </div>
      )}

      {/* White cell backgrounds */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        {cellsToRender.map(({ r, c, key, cell }) => {
          if (!cell) return null;
          const isSelRoot = moveMode && (selectedRootsForMove.has(key) || (cell.spanRoot && selectedRootsForMove.has(cell.spanRoot)));
          const x = offset.x + c * cs, y = offset.y + r * cs;
          if (x + cs < 0 || y + cs < 0) return null;
          return (
            <div key={`bg-${key}`} style={{
              position: "absolute", left: x + 0.5, top: y + 0.5, width: cs - 1, height: cs - 1,
              background: "#ffffff", boxSizing: "border-box", opacity: isSelRoot ? 0.2 : 1,
            }} />
          );
        })}
      </div>

      {/* Grid lines overlay */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }}>
        {cellsToRender.map(({ r, c, key, cell }) => {
          const x = offset.x + c * cs;
          const y = offset.y + r * cs;
          const color = cell ? "#c0c0c0" : "#1e2a4a";
          return (
            <g key={`gl-${key}`}>
              <line x1={x} y1={y} x2={x + cs} y2={y} stroke={color} strokeWidth="0.5" />
              <line x1={x} y1={y} x2={x} y2={y + cs} stroke={color} strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>

      {/* Symbol images */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}>
        {cellsToRender.map(({ r, c, key, cell }) => {
          if (!cell || cell.spanWidth === 0) return null;
          const isSelRoot = moveMode && selectedRootsForMove.has(key);
          const x = offset.x + c * cs, y = offset.y + r * cs, w = cell.spanWidth * cs;
          if (x + w < 0 || y + cs < 0) return null;
          const sym = symbols.find((s) => s.id === cell.symbolId);
          return (
            <div key={key} style={{
              position: "absolute", left: x, top: y, width: w, height: cs,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", boxSizing: "border-box", opacity: isSelRoot ? 0.2 : 1,
            }}>
              {sym?.svgContent && (
                <img src={svgToDataUrl(sym.svgContent)} style={{ width: w - 4, height: cs - 4, objectFit: "fill", display: "block" }} alt="" draggable={false} />
              )}
            </div>
          );
        })}
      </div>

      {/* Move ghosts */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12 }}>
        {moveMode && [...selectedRootsForMove].map((rootKey) => {
          const cell = cells.get(rootKey);
          if (!cell) return null;
          const { r, c } = parseKey(rootKey);
          const nr = r + mdr, nc = c + mdc;
          if (nr < 0 || nc < 0) return null;
          const x = offset.x + nc * cs, y = offset.y + nr * cs, w = cell.spanWidth * cs;
          const sym = symbols.find((s) => s.id === cell.symbolId);
          return (
            <div key={`ghost-${rootKey}`} style={{
              position: "absolute", left: x, top: y, width: w - 1, height: cs - 1,
              background: "rgba(64,208,64,0.12)", border: "2px dashed #40d040", borderRadius: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", boxSizing: "border-box", zIndex: 15,
            }}>
              {sym?.svgContent && (
                <img src={svgToDataUrl(sym.svgContent)} style={{ width: w - 5, height: cs - 5, objectFit: "fill", display: "block", opacity: 0.7 }} alt="" draggable={false} />
              )}
            </div>
          );
        })}

        {moveMode && [...selected].map((key) => {
          if (cells.get(key)) return null;
          const { r, c } = parseKey(key);
          const nr = r + mdr, nc = c + mdc;
          if (nr < 0 || nc < 0) return null;
          return (
            <div key={`ghost-e-${key}`} style={{
              position: "absolute", left: offset.x + nc * cs - 1, top: offset.y + nr * cs - 1,
              width: cs, height: cs, border: "2px dashed #40d040", borderRadius: 3, zIndex: 15,
            }} />
          );
        })}
      </div>

      {/* Selection borders */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}>
        {cellsToRender.map(({ r, c, key, isSel }) => {
          if (!isSel) return null;
          const x = offset.x + c * cs,
            y = offset.y + r * cs;
          return (
            <div
              key={`sel-${key}`}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: cs,
                height: cs,
                boxSizing: "border-box",
                border: `1px solid ${moveMode ? "#40d040" : "#e94560"}`,
                borderRadius: 3,
                boxShadow: `0 0 6px ${moveMode ? "rgba(64,208,64,0.5)" : "rgba(233,69,96,0.5)"}`,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>

      {/* Drag rect */}
      {dragHighlight && (
        <div style={{
          position: "absolute", left: dragHighlight.left, top: dragHighlight.top,
          width: dragHighlight.width, height: dragHighlight.height,
          background: "rgba(233,69,96,0.12)", border: "1px dashed #e94560",
          pointerEvents: "none", borderRadius: 2, zIndex: 25,
        }} />
      )}

      {/* Zoom indicator */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, background: "#16213e",
        border: "1px solid #0f3460", borderRadius: 8, padding: "6px 12px",
        color: "#7070b0", fontSize: 11, zIndex: 30,
      }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Selection HUD */}
      {selectionInfo && (
        <div style={{
          position: "absolute", top: 52, right: 16, background: "#16213e",
          border: `1px solid ${moveMode ? "#40d040" : "#ffd700"}`, borderRadius: 8,
          padding: "8px 14px", boxShadow: `0 0 12px ${moveMode ? "rgba(64,208,64,0.15)" : "rgba(255,215,0,0.15)"}`,
          zIndex: 30,
        }}>
          <div style={{ color: moveMode ? "#40d040" : "#ffd700", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            {moveMode ? "Move Mode" : "Selection"}
          </div>
          <div style={{ color: "#e0e0ff", fontSize: 11, lineHeight: 1.7 }}>
            <span style={{ color: "#7070b0" }}>Rows: </span>{selectionInfo.rows}
            {"  "}
            <span style={{ color: "#7070b0" }}>Cols: </span>{selectionInfo.cols}
          </div>
          {moveMode && (mdr !== 0 || mdc !== 0) && (
            <div style={{ color: "#40d040", fontSize: 10, marginTop: 2 }}>Δr={mdr} Δc={mdc}</div>
          )}
          {!moveMode && (
            <div style={{ color: "#6060a0", fontSize: 10, marginTop: 2 }}>
              [{selectionInfo.startR},{selectionInfo.startC}] → [{selectionInfo.endR},{selectionInfo.endC}]
            </div>
          )}
        </div>
      )}

      {/* Move mode banner */}
      {moveMode && (
        <div style={{
          position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
          background: "#1a4a1a", border: "1px solid #40d040", borderRadius: 8,
          padding: "8px 20px", color: "#80ff80", fontSize: 12, fontWeight: 700,
          pointerEvents: "none", boxShadow: "0 0 20px rgba(64,208,64,0.3)", zIndex: 30,
        }}>
          MOVE MODE — Drag to reposition · Click PLACE HERE to commit
        </div>
      )}
    </div>
  );
}
