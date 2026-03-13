import { useState } from "react";
import { CELL_SIZE } from "../utils/constants";
import { getOccupiedBounds, exportAsPng, exportAsSvg } from "../utils/exportUtils";

export default function ExportModal({ onClose, cells, symbols }) {
  const [exportScale, setExportScale] = useState(1);
  const bounds = getOccupiedBounds(cells);
  const hasCells = bounds !== null;
  const cols = hasCells ? bounds.maxC - bounds.minC + 1 : 0;
  const rows = hasCells ? bounds.maxR - bounds.minR + 1 : 0;
  const pxW = cols * CELL_SIZE * exportScale;
  const pxH = rows * CELL_SIZE * exportScale;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#16213e", border: "1px solid #3a5a8a", borderRadius: 12, padding: 28, maxWidth: 360, width: "90%", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
        <div style={{ color: "#e0e0ff", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Export Grid</div>

        {!hasCells ? (
          <div style={{ color: "#7070b0", fontSize: 12, marginBottom: 20 }}>No symbols placed on the grid yet.</div>
        ) : (
          <>
            <div style={{ color: "#7070b0", fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
              Bounding box: <span style={{ color: "#e0e0ff" }}>{rows} rows × {cols} cols</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <label style={{ color: "#7070b0", fontSize: 11, whiteSpace: "nowrap" }}>Scale:</label>
              {[1, 2, 3, 4].map((s) => (
                <button key={s} onClick={() => setExportScale(s)}
                  style={{
                    padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                    background: exportScale === s ? "#5080e0" : "#0f1e30",
                    border: `1px solid ${exportScale === s ? "#5080e0" : "#2a3a5a"}`,
                    color: exportScale === s ? "#fff" : "#6080a0",
                  }}>
                  {s}x
                </button>
              ))}
              <span style={{ color: "#4a5a7a", fontSize: 9 }}>{pxW}×{pxH}px</span>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <button onClick={() => { exportAsPng(cells, symbols, CELL_SIZE * exportScale); onClose(); }}
                style={{ flex: 1, padding: "10px", background: "#1a3a2a", border: "1px solid #3a7a5a", borderRadius: 8, color: "#80ff80", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a5a3a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1a3a2a")}>
                PNG
              </button>
              <button onClick={() => { exportAsSvg(cells, symbols, CELL_SIZE * exportScale); onClose(); }}
                style={{ flex: 1, padding: "10px", background: "#1a2a3a", border: "1px solid #3a5a7a", borderRadius: 8, color: "#80c0ff", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a3a4a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1a2a3a")}>
                SVG
              </button>
            </div>
          </>
        )}

        <button onClick={onClose}
          style={{ width: "100%", padding: "8px", background: "#0f1e30", border: "1px solid #2a3a5a", borderRadius: 6, color: "#7070b0", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", marginTop: 4 }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
