import { useState } from "react";
import { svgToDataUrl } from "../utils/cellUtils";

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function folderLabel(name) {
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function countFiles(node) {
  let count = (node.__files || []).length;
  for (const key of Object.keys(node)) {
    if (key === "__files") continue;
    count += countFiles(node[key]);
  }
  return count;
}

function TreeNode({ node, label, depth, defaultOpen, symbols, addFromDirectory, removeFromDirectory, isCustomTree }) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 1);
  const subfolders = Object.keys(node).filter((k) => k !== "__files");
  const files = node.__files || [];
  const hasContent = files.length > 0 || subfolders.length > 0;
  if (!hasContent) return null;
  const indent = depth * 10;

  return (
    <div style={{ marginLeft: indent }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 4, width: "100%", padding: "3px 6px", marginBottom: 1,
          background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left",
          color: depth === 0 ? "#7090c0" : "#6080a0", fontSize: depth === 0 ? 10 : 9,
          fontWeight: 700, fontFamily: "inherit", letterSpacing: depth === 0 ? 0.5 : 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1a2a40")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ display: "inline-block", width: 10, fontSize: 8, color: "#5070a0", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        <span style={{ color: "#5a7ab0", fontSize: 11 }}>📁</span>
        {label}
        <span style={{ color: "#3a5a80", fontSize: 8, fontWeight: 400, marginLeft: 2 }}>({countFiles(node)})</span>
      </button>

      {open && (
        <div>
          {subfolders.sort().map((key) => (
            <TreeNode key={key} node={node[key]} label={folderLabel(key)} depth={depth + 1}
              symbols={symbols} addFromDirectory={addFromDirectory} removeFromDirectory={removeFromDirectory} isCustomTree={isCustomTree} />
          ))}
          {files.map((item) => (
            <DirFileRow key={item.id} item={item} symbols={symbols} addFromDirectory={addFromDirectory}
              removeFromDirectory={removeFromDirectory} isCustom={isCustomTree} depth={depth} />
          ))}
        </div>
      )}
    </div>
  );
}

function DirFileRow({ item, symbols, addFromDirectory, removeFromDirectory, isCustom, depth }) {
  const alreadyAdded = symbols.some((s) => s.svgContent === item.svgContent);
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "3px 6px", marginLeft: (depth + 1) * 10,
      marginBottom: 1, background: "#0f1828", border: "1px solid #1a2840", borderRadius: 4, gap: 5,
    }}>
      <div style={{ width: 20, height: 20, background: "#fff", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 1, boxSizing: "border-box" }}>
        <img src={svgToDataUrl(item.svgContent)} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#c0c0e0", fontSize: 9, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
        <div style={{ color: "#4a5a7a", fontSize: 7 }}>{item.defaultWidth}W</div>
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        {isCustom && (
          <button onClick={() => removeFromDirectory(item.id)}
            style={{ background: "#3a1a1a", border: "1px solid #5a2a2a", borderRadius: 3, color: "#e94560", cursor: "pointer", fontSize: 8, padding: "1px 4px", fontWeight: 700 }}>✕</button>
        )}
        <button onClick={() => addFromDirectory(item)} disabled={alreadyAdded}
          style={{
            background: alreadyAdded ? "#1a2a1a" : "#1a3a2a",
            border: `1px solid ${alreadyAdded ? "#2a3a2a" : "#3a7a5a"}`,
            borderRadius: 3, color: alreadyAdded ? "#3a5a3a" : "#60d090",
            cursor: alreadyAdded ? "default" : "pointer", fontSize: 8, padding: "1px 5px", fontWeight: 700,
          }}>{alreadyAdded ? "✓" : "+"}</button>
      </div>
    </div>
  );
}

function DirectoryPanel({ svgTree, customDirectoryTree, dirFileInputRef, handleDirSvgUpload, addFromDirectory, removeFromDirectory, symbols }) {
  return (
    <div style={{ borderBottom: "1px solid #0f3460", background: "#0d1626", flexShrink: 0, maxHeight: 360, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "#5080e0", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>SVG DIRECTORY</div>
        <button onClick={() => dirFileInputRef.current?.click()}
          style={{ background: "#1a3050", border: "1px solid #3a6a9a", borderRadius: 4, color: "#60a0d0", cursor: "pointer", fontSize: 9, fontWeight: 700, padding: "2px 8px" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a4060")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1a3050")}>+ ADD SVG</button>
        <input ref={dirFileInputRef} type="file" accept=".svg,image/svg+xml" style={{ display: "none" }} onChange={handleDirSvgUpload} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 4px 8px" }}>
        <TreeNode node={svgTree} label="Built-in" depth={0} defaultOpen={true} symbols={symbols} addFromDirectory={addFromDirectory} removeFromDirectory={removeFromDirectory} isCustomTree={false} />
        {(customDirectoryTree.__files.length > 0 || Object.keys(customDirectoryTree).filter((k) => k !== "__files").length > 0) && (
          <TreeNode node={customDirectoryTree} label="Custom Uploads" depth={0} defaultOpen={true} symbols={symbols} addFromDirectory={addFromDirectory} removeFromDirectory={removeFromDirectory} isCustomTree={true} />
        )}
      </div>
    </div>
  );
}

function AddSymbolForm({ newSymSvg, newSymName, setNewSymName, newSymWidth, setNewSymWidth, addError, fileInputRef, handleSvgFileChange, addSymbol }) {
  return (
    <div style={{ padding: "8px", borderBottom: "1px solid #0f3460", background: "#101828", flexShrink: 0 }}>
      <div style={{ color: "#7070b0", fontSize: 9, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Upload SVG</div>
      <div onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${newSymSvg ? "#40d040" : "#1a4080"}`, borderRadius: 6, padding: "10px 6px",
          textAlign: "center", cursor: "pointer", marginBottom: 6,
          background: newSymSvg ? "rgba(64,208,64,0.06)" : "transparent", transition: "all 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = newSymSvg ? "#60f060" : "#3a70c0")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = newSymSvg ? "#40d040" : "#1a4080")}
      >
        {newSymSvg ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div dangerouslySetInnerHTML={{ __html: newSymSvg.content }} style={{ width: 36, height: 36 }} />
            <div style={{ color: "#40d040", fontSize: 9 }}>{newSymSvg.name}</div>
          </div>
        ) : (
          <div style={{ color: "#4a6a9a", fontSize: 10 }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>↑</div>
            Click to upload .svg
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".svg,image/svg+xml" style={{ display: "none" }} onChange={handleSvgFileChange} />
      <input value={newSymName} onChange={(e) => setNewSymName(e.target.value)} placeholder="Symbol name"
        style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", marginBottom: 5, background: "#0f1e30", border: "1px solid #1a4080", borderRadius: 5, color: "#e0e0ff", fontSize: 11, fontFamily: "inherit", outline: "none" }} />
      <div style={{ display: "flex", gap: 5, marginBottom: 5, alignItems: "center" }}>
        <label style={{ color: "#7070b0", fontSize: 10, whiteSpace: "nowrap" }}>Width:</label>
        <input type="number" min={1} max={20} value={newSymWidth} onChange={(e) => setNewSymWidth(e.target.value)}
          style={{ flex: 1, padding: "5px 6px", background: "#0f1e30", border: "1px solid #1a4080", borderRadius: 5, color: "#e0e0ff", fontSize: 11, fontFamily: "inherit", outline: "none" }} />
      </div>
      {addError && <div style={{ color: "#e94560", fontSize: 9, marginBottom: 4 }}>{addError}</div>}
      <button onClick={addSymbol}
        style={{ width: "100%", padding: "6px", background: "#0f3460", border: "1px solid #3a7aaa", borderRadius: 5, color: "#60d0ff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1a4480")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#0f3460")}>+ ADD SYMBOL</button>
    </div>
  );
}

function SymbolRow({ sym, isEditMode, isEditing, editSymName, setEditSymName, editSymWidth, setEditSymWidth, startEditSymbol, saveEditSymbol, cancelEditSymbol, deleteSymbol, placeSymbol, moveMode }) {
  const previewDataUrl = sym.svgContent ? svgToDataUrl(sym.svgContent) : null;

  if (!isEditMode) {
    return (
      <button onClick={() => placeSymbol(sym)} disabled={moveMode}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 8px", marginBottom: 3,
          background: "#0f3460", border: "1px solid #1a4080", borderRadius: 6,
          cursor: moveMode ? "default" : "pointer", opacity: moveMode ? 0.4 : 1, textAlign: "left",
        }}
        onMouseEnter={(e) => { if (!moveMode) { e.currentTarget.style.background = "#1a4480"; e.currentTarget.style.borderColor = "#e94560"; } }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#0f3460"; e.currentTarget.style.borderColor = "#1a4080"; }}
      >
        {previewDataUrl && (
          <div style={{ width: 24, height: 24, background: "#fff", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 2, boxSizing: "border-box" }}>
            <img src={previewDataUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, color: "#e0e0ff", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sym.name}</div>
        <div style={{ flexShrink: 0, color: "#5a7aaa", fontSize: 10, fontWeight: 700, background: "#0a1a30", borderRadius: 4, padding: "2px 6px", minWidth: 20, textAlign: "center" }}>{sym.width}</div>
      </button>
    );
  }

  if (isEditing) {
    return (
      <div style={{ padding: "6px 8px", background: "#0a1420", border: "1px solid #5080e0", borderRadius: 6, marginBottom: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          {previewDataUrl && <img src={previewDataUrl} style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} alt="" />}
          <input value={editSymName} onChange={(e) => setEditSymName(e.target.value)} placeholder="Name"
            style={{ flex: 1, padding: "4px 6px", background: "#0f1e30", border: "1px solid #3a6a9a", borderRadius: 4, color: "#e0e0ff", fontSize: 10, fontFamily: "inherit", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 5 }}>
          <label style={{ color: "#7070b0", fontSize: 9, whiteSpace: "nowrap" }}>Width:</label>
          <input type="number" min={1} max={20} value={editSymWidth} onChange={(e) => setEditSymWidth(e.target.value)}
            style={{ width: 50, padding: "3px 5px", background: "#0f1e30", border: "1px solid #3a6a9a", borderRadius: 4, color: "#e0e0ff", fontSize: 10, fontFamily: "inherit", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={saveEditSymbol}
            style={{ flex: 1, padding: "4px", background: "#1a3a2a", border: "1px solid #3a7a5a", borderRadius: 4, color: "#60d090", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>SAVE</button>
          <button onClick={cancelEditSymbol}
            style={{ flex: 1, padding: "4px", background: "#1a2a3a", border: "1px solid #3a5a7a", borderRadius: 4, color: "#80a0c0", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>CANCEL</button>
        </div>
      </div>
    );
  }

  // Edit mode, not editing this one
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "5px 8px", marginBottom: 3,
      background: "#0f1828", border: "1px solid #1a3050", borderRadius: 6, gap: 6,
    }}>
      {previewDataUrl && (
        <div style={{ width: 22, height: 22, background: "#fff", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 1, boxSizing: "border-box" }}>
          <img src={previewDataUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, color: "#e0e0ff", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sym.name}</div>
      <div style={{ flexShrink: 0, color: "#5a7aaa", fontSize: 10, fontWeight: 700, background: "#0a1a30", borderRadius: 4, padding: "2px 6px", minWidth: 20, textAlign: "center" }}>{sym.width}</div>
      <button onClick={() => startEditSymbol(sym)}
        style={{ background: "#1a2a3a", border: "1px solid #3a6a9a", borderRadius: 4, color: "#60a0d0", cursor: "pointer", fontSize: 9, fontWeight: 700, padding: "2px 6px", flexShrink: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#2a3a4a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#1a2a3a")}>✎</button>
      <button onClick={() => deleteSymbol(sym.id)}
        style={{ background: "#3a1a1a", border: "1px solid #7a3a3a", borderRadius: 4, color: "#e94560", cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "2px 6px", flexShrink: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#5a2a2a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#3a1a1a")}>✕</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

export default function Sidebar({
  symbols, showEditSymbols, setShowEditSymbols,
  newSymName, setNewSymName, newSymWidth, setNewSymWidth,
  newSymSvg, addError, fileInputRef, handleSvgFileChange, addSymbol, deleteSymbol, placeSymbol,
  editingSymbolId, editSymName, setEditSymName, editSymWidth, setEditSymWidth,
  startEditSymbol, saveEditSymbol, cancelEditSymbol,
  showDirectory, setShowDirectory, svgTree, customDirectoryTree,
  dirFileInputRef, handleDirSvgUpload, addFromDirectory, removeFromDirectory,
  selected, setSelected, moveMode,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(220);

  const handleResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev) => {
      const newW = Math.max(180, Math.min(500, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div style={{
      width: sidebarWidth, flexShrink: 0, background: "#16213e", borderRight: "1px solid #0f3460",
      display: "flex", flexDirection: "column", zIndex: 10,
      boxShadow: "4px 0 20px rgba(0,0,0,0.5)", overflow: "hidden", position: "relative",
    }}>
      {/* Resize handle */}
      <div onMouseDown={handleResizeStart}
        style={{ position: "absolute", top: 0, right: 0, width: 5, height: "100%", cursor: "col-resize", zIndex: 20, background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,69,96,0.3)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} />

      {/* Header */}
      <div style={{ padding: "14px 12px 8px", borderBottom: "1px solid #0f3460", flexShrink: 0 }}>
        <div style={{ color: "#e94560", fontSize: 11, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase" }}>Gridmark</div>
        <div style={{ color: "#4a4a8a", fontSize: 9, marginTop: 2 }}>SVG Symbol Grid</div>
      </div>

      {/* Symbols header */}
      <div style={{
        padding: "8px 12px 4px", color: "#7070b0", fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span>Symbols</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { setShowDirectory((v) => !v); if (showEditSymbols) setShowEditSymbols(false); }}
            style={{
              background: showDirectory ? "#5080e0" : "#0f3460",
              border: `1px solid ${showDirectory ? "#5080e0" : "#3a5a7a"}`,
              borderRadius: 4, color: showDirectory ? "#fff" : "#60a0d0",
              cursor: "pointer", fontSize: 9, fontWeight: 700, padding: "2px 6px",
            }}>{showDirectory ? "CLOSE" : "DIR"}</button>
          <button onClick={() => { setShowEditSymbols((v) => !v); if (showDirectory) setShowDirectory(false); cancelEditSymbol(); }}
            style={{
              background: showEditSymbols ? "#e94560" : "#0f3460",
              border: `1px solid ${showEditSymbols ? "#e94560" : "#3a5a7a"}`,
              borderRadius: 4, color: showEditSymbols ? "#fff" : "#60a0d0",
              cursor: "pointer", fontSize: 9, fontWeight: 700, padding: "2px 6px",
            }}>{showEditSymbols ? "DONE" : "EDIT"}</button>
        </div>
      </div>

      {/* SVG Directory Panel */}
      {showDirectory && (
        <DirectoryPanel svgTree={svgTree} customDirectoryTree={customDirectoryTree} dirFileInputRef={dirFileInputRef}
          handleDirSvgUpload={handleDirSvgUpload} addFromDirectory={addFromDirectory} removeFromDirectory={removeFromDirectory} symbols={symbols} />
      )}

      {/* Add symbol form */}
      {showEditSymbols && (
        <AddSymbolForm newSymSvg={newSymSvg} newSymName={newSymName} setNewSymName={setNewSymName}
          newSymWidth={newSymWidth} setNewSymWidth={setNewSymWidth} addError={addError}
          fileInputRef={fileInputRef} handleSvgFileChange={handleSvgFileChange} addSymbol={addSymbol} />
      )}

      {/* Symbol list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {symbols.map((sym) => (
          <SymbolRow key={sym.id} sym={sym} isEditMode={showEditSymbols} isEditing={editingSymbolId === sym.id}
            editSymName={editSymName} setEditSymName={setEditSymName} editSymWidth={editSymWidth} setEditSymWidth={setEditSymWidth}
            startEditSymbol={startEditSymbol} saveEditSymbol={saveEditSymbol} cancelEditSymbol={cancelEditSymbol}
            deleteSymbol={deleteSymbol} placeSymbol={placeSymbol} moveMode={moveMode} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "6px 12px 8px", borderTop: "1px solid #0f3460", color: "#4a4a7a", fontSize: 9, lineHeight: 1.7, flexShrink: 0 }}>
        <div>Scroll: zoom · Space+Drag: pan</div>
        <div>Click: select · Ctrl+Click: multi</div>
      </div>
    </div>
  );
}
