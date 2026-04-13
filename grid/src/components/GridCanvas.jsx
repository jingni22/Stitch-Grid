import { useRef, useEffect } from "react";
import { cellKey, parseKey, resolveRoot } from "../utils/cellUtils";
import { svgToDataUrl } from "../utils/svgUtils";

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
  guideLineMode,
  guideLines,
  guideLinePreview,
  knittingMode,
  slashedRows,
  onNextRow,
  onPrevRow,
}) {
  const { r0, r1, c0, c1 } = getViewport();

  // Build symbol lookup map once per render (O(1) lookups instead of O(n) find per cell)
  const symMap = useRef(new Map());
  symMap.current.clear();
  for (const s of symbols) symMap.current.set(s.id, s);

  // Drag highlight rect
  let dragHighlight = null;
  let dragSelKeys = null;
  if (dragRect && !moveMode) {
    const sr0 = Math.min(dragRect.start.r, dragRect.end.r);
    const sr1 = Math.max(dragRect.start.r, dragRect.end.r);
    const sc0 = Math.min(dragRect.start.c, dragRect.end.c);
    const sc1 = Math.max(dragRect.start.c, dragRect.end.c);
    dragHighlight = {
      left: sc0 * cs,
      top: sr0 * cs,
      width: (sc1 - sc0 + 1) * cs,
      height: (sr1 - sr0 + 1) * cs,
    };
    dragSelKeys = new Set();
    for (let dr = sr0; dr <= sr1; dr++)
      for (let dc = sc0; dc <= sc1; dc++)
        dragSelKeys.add(cellKey(dr, dc));
  }

  // Build visible cells — only cells in the viewport
  const occupiedCells = [];
  const rootCells = [];
  const selectedCells = [];
  let occupiedPathD = "";
  let emptyPathD = "";

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const key = cellKey(r, c);
      const cell = cells.get(key);
      const x = c * cs;
      const y = r * cs;

      if (cell) {
        occupiedPathD += `M${x},${y}h${cs}M${x},${y}v${cs}`;
        occupiedCells.push({ r, c, key, cell, x, y });
        if (cell.spanWidth >= 1) {
          rootCells.push({ r, c, key, cell, x, y });
        }
      } else {
        emptyPathD += `M${x},${y}h${cs}M${x},${y}v${cs}`;
      }

      const isSel = selected.has(key) || (dragSelKeys !== null && dragSelKeys.has(key));
      if (isSel) {
        selectedCells.push({ r, c, key, x, y });
      }
    }
  }

  const { dr: mdr, dc: mdc } = moveOffset;
  const selectedRootsForMove = new Set();
  if (moveMode)
    for (const key of selected) {
      const rk = resolveRoot(cells, key);
      if (rk) selectedRootsForMove.add(rk);
    }

  const contentTransform = `translate3d(${offset.x}px, ${offset.y}px, 0)`;

  // Register wheel handler as non-passive so preventDefault() works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel, containerRef]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        cursor: knittingMode ? (spaceDown.current ? "grab" : "default") : bgImageEditing ? "grab" : guideLineMode ? "crosshair" : moveMode ? "grab" : spaceDown.current ? "grab" : "crosshair",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid lines — bottom layer, clipped to grid bounds */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
      >
        <defs>
          <pattern id="smallGrid" width={cs} height={cs} patternUnits="userSpaceOnUse" x={offset.x} y={offset.y}>
            <path d={`M ${cs} 0 L 0 0 0 ${cs}`} fill="none" stroke="#1e2a4a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect
          x={offset.x} y={offset.y}
          width={gridCols * cs} height={gridRows * cs}
          fill="url(#smallGrid)"
        />
      </svg>

      {/* Background reference image */}
      {bgImage && (
        <img
          src={bgImage.src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate(${offset.x + bgImage.col * cs}px, ${offset.y + bgImage.row * cs}px)`,
            width: bgImage.cellW * cs,
            height: bgImage.cellH * cs,
            opacity: bgImageEditing ? 0.35 : 0.2,
            pointerEvents: "none",
            zIndex: 1,
            objectFit: "fill",
            imageRendering: "auto",
            willChange: "transform",
          }}
        />
      )}

      {/* Background image editing handles */}
      {bgImage && bgImageEditing && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${offset.x + bgImage.col * cs}px, ${offset.y + bgImage.row * cs}px)`,
              width: bgImage.cellW * cs,
              height: bgImage.cellH * cs,
              border: "2px dashed #f0a030",
              borderRadius: 4,
              cursor: "move",
              pointerEvents: "auto",
              boxSizing: "border-box",
              willChange: "transform",
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

      {/* Translated content layer */}
      <div style={{ position: "absolute", left: 0, top: 0, willChange: "transform", transform: contentTransform }}>

        {/* White cell backgrounds */}
        <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 2 }}>
          {occupiedCells.map(({ key, cell, x, y }) => {
            const isSelRoot =
              moveMode &&
              (selectedRootsForMove.has(key) || (cell.spanRoot && selectedRootsForMove.has(cell.spanRoot)));
            return (
              <div
                key={`bg-${key}`}
                style={{
                  position: "absolute",
                  left: x + 0.5,
                  top: y + 0.5,
                  width: cs - 1,
                  height: cs - 1,
                  background: "#ffffff",
                  boxSizing: "border-box",
                  opacity: isSelRoot ? 0.2 : 1,
                }}
              />
            );
          })}
        </div>

        {/* Grid lines overlay */}
        <svg style={{ position: "absolute", left: 0, top: 0, width: gridCols * cs, height: gridRows * cs, pointerEvents: "none", zIndex: 3, overflow: "visible" }}>
          {emptyPathD && <path d={emptyPathD} fill="none" stroke="#1e2a4a" strokeWidth="0.5" />}
          {occupiedPathD && <path d={occupiedPathD} fill="none" stroke="#c0c0c0" strokeWidth="0.5" />}
        </svg>

        {/* Symbol images */}
        <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 4 }}>
          {rootCells.map(({ key, cell, x, y }) => {
            const isSelRoot = moveMode && selectedRootsForMove.has(key);
            const w = cell.spanWidth * cs;
            const sym = symMap.current.get(cell.symbolId);
            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: w,
                  height: cs,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  opacity: isSelRoot ? 0.2 : 1,
                }}
              >
                {sym?.svgContent && (
                  <img
                    src={svgToDataUrl(sym.svgContent)}
                    style={{ width: w - 4, height: cs - 4, objectFit: "fill", display: "block" }}
                    alt=""
                    draggable={false}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Selection borders */}
        <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 20 }}>
          {moveMode ? (
            selectedCells.map(({ key, x, y, r, c }) => {
              const hasTop = selected.has(cellKey(r - 1, c));
              const hasBottom = selected.has(cellKey(r + 1, c));
              const hasLeft = selected.has(cellKey(r, c - 1));
              const hasRight = selected.has(cellKey(r, c + 1));
              if (hasTop && hasBottom && hasLeft && hasRight) return null;
              return (
                <div
                  key={`sel-${key}`}
                  style={{
                    position: "absolute", left: x, top: y, width: cs, height: cs,
                    boxSizing: "border-box",
                    borderTop: hasTop ? "none" : "2px solid #40d040",
                    borderBottom: hasBottom ? "none" : "2px solid #40d040",
                    borderLeft: hasLeft ? "none" : "2px solid #40d040",
                    borderRight: hasRight ? "none" : "2px solid #40d040",
                    pointerEvents: "none",
                  }}
                />
              );
            })
          ) : (
            selectedCells.map(({ key, x, y }) => (
              <div
                key={`sel-${key}`}
                style={{
                  position: "absolute", left: x, top: y, width: cs, height: cs,
                  boxSizing: "border-box",
                  border: "2px solid #e94560",
                  borderRadius: 3,
                  boxShadow: "0 0 6px rgba(233,69,96,0.5)",
                  pointerEvents: "none",
                }}
              />
            ))
          )}
        </div>

        {/* Drag rect */}
        {dragHighlight && (
          <div
            style={{
              position: "absolute",
              left: dragHighlight.left, top: dragHighlight.top,
              width: dragHighlight.width, height: dragHighlight.height,
              background: "rgba(233,69,96,0.12)",
              border: "1px dashed #e94560",
              pointerEvents: "none",
              borderRadius: 2,
              zIndex: 25,
            }}
          />
        )}

        {/* Guide lines */}
        {(guideLines.length > 0 || guideLinePreview) && (
          <svg style={{ position: "absolute", left: 0, top: 0, width: gridCols * cs, height: gridRows * cs, pointerEvents: "none", zIndex: 30, overflow: "visible" }}>
            {guideLines.map((gl, i) => (
              <line
                key={`guide-${i}`}
                x1={gl.c1 * cs} y1={gl.r1 * cs}
                x2={gl.c2 * cs} y2={gl.r2 * cs}
                stroke="#f0c060"
                strokeWidth={5}
                strokeLinecap="round"
              />
            ))}
            {guideLinePreview && (
              <line
                x1={guideLinePreview.c1 * cs} y1={guideLinePreview.r1 * cs}
                x2={guideLinePreview.c2 * cs} y2={guideLinePreview.r2 * cs}
                stroke="#f0c060"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="4 3"
                opacity={0.8}
              />
            )}
          </svg>
        )}

        {/* Knitting mode overlays */}
        {knittingMode && (
          <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 10 }}>
            {Array.from({ length: gridRows }, (_, r) => {
              const perimNum = gridRows - r;
              const isEven = perimNum % 2 === 0;
              const isSlashed = slashedRows.has(r);
              if (!isEven && !isSlashed) return null;
              return (
                <div
                  key={`knit-row-${r}`}
                  style={{
                    position: "absolute",
                    left: 0, top: r * cs,
                    width: gridCols * cs, height: cs,
                    background: isSlashed ? "rgba(10, 10, 20, 0.7)" : isEven ? "rgba(10, 10, 30, 0.3)" : "none",
                  }}
                />
              );
            })}
            <svg style={{ position: "absolute", left: 0, top: 0, width: gridCols * cs, height: gridRows * cs, overflow: "visible" }}>
              {Array.from(slashedRows).map((r) => (
                <line
                  key={`slash-${r}`}
                  x1={0} y1={r * cs + cs / 2}
                  x2={gridCols * cs} y2={r * cs + cs / 2}
                  stroke="#e94560"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  opacity={0.8}
                />
              ))}
            </svg>
          </div>
        )}

        {/* Row & Column counts along perimeter */}
        <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 6 }}>
          {Array.from({ length: gridCols }, (_, c) => {
            const num = gridCols - c;
            const x = c * cs;
            return (
              <div key={`col-top-${c}`} style={{ position: "absolute", left: x, top: -18, width: cs, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a5580", fontSize: Math.min(9, cs * 0.32), fontFamily: "'JetBrains Mono', monospace", userSelect: "none" }}>
                {num}
              </div>
            );
          })}
          {Array.from({ length: gridCols }, (_, c) => {
            const num = gridCols - c;
            const x = c * cs;
            return (
              <div key={`col-bot-${c}`} style={{ position: "absolute", left: x, top: gridRows * cs + 2, width: cs, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a5580", fontSize: Math.min(9, cs * 0.32), fontFamily: "'JetBrains Mono', monospace", userSelect: "none" }}>
                {num}
              </div>
            );
          })}
          {Array.from({ length: gridRows }, (_, r) => {
            const num = gridRows - r;
            const y = r * cs;
            return (
              <div key={`row-left-${r}`} style={{ position: "absolute", left: -28, top: y, width: 24, height: cs, display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#4a5580", fontSize: Math.min(9, cs * 0.32), fontFamily: "'JetBrains Mono', monospace", userSelect: "none" }}>
                {num}
              </div>
            );
          })}
          {Array.from({ length: gridRows }, (_, r) => {
            const num = gridRows - r;
            const y = r * cs;
            return (
              <div key={`row-right-${r}`} style={{ position: "absolute", left: gridCols * cs + 4, top: y, width: 24, height: cs, display: "flex", alignItems: "center", justifyContent: "flex-start", color: "#4a5580", fontSize: Math.min(9, cs * 0.32), fontFamily: "'JetBrains Mono', monospace", userSelect: "none" }}>
                {num}
              </div>
            );
          })}
        </div>

      </div>{/* end translated content layer */}

      {/* Move ghosts */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12 }}>
        {moveMode &&
          (() => {
            const destKeys = new Set();
            for (const key of selected) {
              const { r, c } = parseKey(key);
              destKeys.add(cellKey(r + mdr, c + mdc));
            }

            const symbolGhosts = [...selectedRootsForMove].map((rootKey) => {
              const cell = cells.get(rootKey);
              if (!cell) return null;
              const { r, c } = parseKey(rootKey);
              const nr = r + mdr, nc = c + mdc;
              if (nr < 0 || nc < 0) return null;
              const x = offset.x + nc * cs, y = offset.y + nr * cs, w = cell.spanWidth * cs;
              const sym = symMap.current.get(cell.symbolId);
              return (
                <div
                  key={`ghost-${rootKey}`}
                  style={{
                    position: "absolute", left: x, top: y,
                    width: w - 1, height: cs - 1,
                    background: "rgba(64,208,64,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", boxSizing: "border-box", zIndex: 15,
                  }}
                >
                  {sym?.svgContent && (
                    <img
                      src={svgToDataUrl(sym.svgContent)}
                      style={{ width: w - 5, height: cs - 5, objectFit: "fill", display: "block", opacity: 0.7 }}
                      alt=""
                      draggable={false}
                    />
                  )}
                </div>
              );
            });

            const perimeterGhosts = [...selected].map((key) => {
              const { r, c } = parseKey(key);
              const nr = r + mdr, nc = c + mdc;
              if (nr < 0 || nc < 0) return null;
              const dk = cellKey(nr, nc);
              const hasTop = destKeys.has(cellKey(nr - 1, nc));
              const hasBottom = destKeys.has(cellKey(nr + 1, nc));
              const hasLeft = destKeys.has(cellKey(nr, nc - 1));
              const hasRight = destKeys.has(cellKey(nr, nc + 1));
              if (hasTop && hasBottom && hasLeft && hasRight) return null;
              return (
                <div
                  key={`ghost-p-${dk}`}
                  style={{
                    position: "absolute",
                    left: offset.x + nc * cs, top: offset.y + nr * cs,
                    width: cs, height: cs,
                    boxSizing: "border-box",
                    borderTop: hasTop ? "none" : "2px dashed #40d040",
                    borderBottom: hasBottom ? "none" : "2px dashed #40d040",
                    borderLeft: hasLeft ? "none" : "2px dashed #40d040",
                    borderRight: hasRight ? "none" : "2px dashed #40d040",
                    zIndex: 15,
                    pointerEvents: "none",
                  }}
                />
              );
            });

            return [...symbolGhosts, ...perimeterGhosts];
          })()}
      </div>

      {/* Zoom indicator */}
      <div
        style={{
          position: "absolute", bottom: 16, right: 16,
          background: "#16213e", border: "1px solid #0f3460",
          borderRadius: 8, padding: "6px 12px",
          color: "#7070b0", fontSize: 11, zIndex: 30,
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* Selection HUD */}
      {selectionInfo && (
        <div
          style={{
            position: "absolute", top: 52, right: 16,
            background: "#16213e",
            border: `1px solid ${moveMode ? "#40d040" : "#ffd700"}`,
            borderRadius: 8, padding: "8px 14px",
            boxShadow: `0 0 12px ${moveMode ? "rgba(64,208,64,0.15)" : "rgba(255,215,0,0.15)"}`,
            zIndex: 30,
          }}
        >
          <div style={{ color: moveMode ? "#40d040" : "#ffd700", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            {moveMode ? "Move Mode" : "Selection"}
          </div>
          <div style={{ color: "#e0e0ff", fontSize: 11, lineHeight: 1.7 }}>
            <span style={{ color: "#7070b0" }}>Rows: </span>
            {selectionInfo.rows}
            {"  "}
            <span style={{ color: "#7070b0" }}>Cols: </span>
            {selectionInfo.cols}
          </div>
          {moveMode && (mdr !== 0 || mdc !== 0) && (
            <div style={{ color: "#40d040", fontSize: 10, marginTop: 2 }}>
              Δr={mdr} Δc={mdc}
            </div>
          )}
          {!moveMode && (
            <div style={{ color: "#6060a0", fontSize: 11, marginTop: 2 }}>
              [{selectionInfo.endR},{selectionInfo.endC}] → [{selectionInfo.startR},{selectionInfo.startC}]
            </div>
          )}
        </div>
      )}

      {/* Move mode banner */}
      {moveMode && (
        <div
          style={{
            position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
            background: "#1a4a1a", border: "1px solid #40d040", borderRadius: 8,
            padding: "8px 20px", color: "#80ff80", fontSize: 12, fontWeight: 700,
            pointerEvents: "none", boxShadow: "0 0 20px rgba(64,208,64,0.3)", zIndex: 30,
          }}
        >
          MOVE MODE — Drag to reposition · Click PLACE HERE to commit
        </div>
      )}

      {/* Knitting mode banner */}
      {knittingMode && (
        <div
          style={{
            position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
            background: "#2a1a2a", border: "1px solid #f0a0d0", borderRadius: 8,
            padding: "8px 20px", color: "#f0a0d0", fontSize: 12, fontWeight: 700,
            pointerEvents: "none", boxShadow: "0 0 20px rgba(240,160,208,0.2)",
            zIndex: 30, whiteSpace: "nowrap",
          }}
        >
          🧶 KNITTING MODE — {slashedRows.size} / {gridRows} rows completed
        </div>
      )}

      {/* Knitting mode bottom buttons */}
      {knittingMode && (
        <div
          style={{
            position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 12, zIndex: 30,
          }}
        >
          {[
            { label: "← Previous Row", onClick: onPrevRow, color: "#f0a030", hoverBg: "#2a2a1a", borderColor: "#f0a030" },
            { label: "Next Row →", onClick: onNextRow, color: "#60d090", hoverBg: "#1a3a2a", borderColor: "#60d090" },
          ].map(({ label, onClick, color, hoverBg, borderColor }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                padding: "10px 24px", borderRadius: 8,
                border: `2px solid ${borderColor}`,
                background: "#16213e", color,
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                cursor: "pointer", boxShadow: `0 0 12px ${borderColor}33`,
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#16213e")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
