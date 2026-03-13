import { useState } from "react";
import useGridState from "../hooks/useGridState";
import { parseKey } from "../utils/cellUtils";
import Sidebar from "./Sidebar";
import GridCanvas from "./GridCanvas";
import TopBar from "./TopBar";
import ResetModal from "./ResetModal";
import KnittingCanvas from "./KnittingCanvas";

export default function App() {
  const state = useGridState();
  const [knittingMode, setKnittingMode] = useState(false);

  let selectionInfo = null;
  if (state.selected.size > 0) {
    let minR = Infinity,
      maxR = -Infinity,
      minC = Infinity,
      maxC = -Infinity;
    for (const key of state.selected) {
      const { r, c } = parseKey(key);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }
    selectionInfo = {
      rows: maxR - minR + 1,
      cols: maxC - minC + 1,
      startR: minR,
      startC: minC,
      endR: maxR,
      endC: maxC,
    };
  }

  if (knittingMode) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          background: "#1a1a2e",
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          overflow: "hidden",
        }}
      >
        <KnittingCanvas
          cells={state.cells}
          symbols={state.symbols}
          onExit={() => setKnittingMode(false)}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#1a1a2e",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        overflow: "hidden",
      }}
    >
      <Sidebar
        symbols={state.symbols}
        showEditSymbols={state.showEditSymbols}
        setShowEditSymbols={state.setShowEditSymbols}
        newSymName={state.newSymName}
        setNewSymName={state.setNewSymName}
        newSymWidth={state.newSymWidth}
        setNewSymWidth={state.setNewSymWidth}
        newSymSvg={state.newSymSvg}
        addError={state.addError}
        fileInputRef={state.fileInputRef}
        handleSvgFileChange={state.handleSvgFileChange}
        addSymbol={state.addSymbol}
        deleteSymbol={state.deleteSymbol}
        placeSymbol={state.placeSymbol}
        editingSymbolId={state.editingSymbolId}
        editSymName={state.editSymName}
        setEditSymName={state.setEditSymName}
        editSymWidth={state.editSymWidth}
        setEditSymWidth={state.setEditSymWidth}
        startEditSymbol={state.startEditSymbol}
        saveEditSymbol={state.saveEditSymbol}
        cancelEditSymbol={state.cancelEditSymbol}
        showDirectory={state.showDirectory}
        setShowDirectory={state.setShowDirectory}
        svgTree={state.svgTree}
        customDirectoryTree={state.customDirectoryTree}
        dirFileInputRef={state.dirFileInputRef}
        handleDirSvgUpload={state.handleDirSvgUpload}
        addFromDirectory={state.addFromDirectory}
        removeFromDirectory={state.removeFromDirectory}
        selected={state.selected}
        setSelected={state.setSelected}
        moveMode={state.moveMode}
      />
      <GridCanvas
        containerRef={state.containerRef}
        spaceDown={state.spaceDown}
        moveMode={state.moveMode}
        onMouseDown={state.onMouseDown}
        onMouseMove={state.onMouseMove}
        onMouseUp={state.onMouseUp}
        onWheel={state.onWheel}
        offset={state.offset}
        cs={state.cs}
        zoom={state.zoom}
        cells={state.cells}
        symbols={state.symbols}
        selected={state.selected}
        dragRect={state.dragRect}
        moveOffset={state.moveOffset}
        getViewport={state.getViewport}
        selectionInfo={selectionInfo}
        bgImage={state.bgImage}
        bgImageEditing={state.bgImageEditing}
        bgImageStartDrag={state.bgImageStartDrag}
        gridRows={state.gridRows}
        gridCols={state.gridCols}
      />
      <TopBar
        selected={state.selected}
        setSelected={state.setSelected}
        moveMode={state.moveMode}
        enterMoveMode={state.enterMoveMode}
        commitMove={state.commitMove}
        historyLen={state.historyLen}
        undo={state.undo}
        redo={state.redo}
        clipboard={state.clipboard}
        copySelected={state.copySelected}
        paste={state.paste}
        clearSelected={state.clearSelected}
        setShowConfirm={state.setShowConfirm}
        cells={state.cells}
        symbols={state.symbols}
        onKnittingMode={() => setKnittingMode(true)}
        bgImage={state.bgImage}
        bgImageEditing={state.bgImageEditing}
        bgFileInputRef={state.bgFileInputRef}
        handleBgImageUpload={state.handleBgImageUpload}
        bgImageFix={state.bgImageFix}
        bgImageEdit={state.bgImageEdit}
        bgImageRemove={state.bgImageRemove}
        addColumn={state.addColumn}
        addRow={state.addRow}
        removeSelectedColumns={state.removeSelectedColumns}
        removeSelectedRows={state.removeSelectedRows}
      />
      {state.showConfirm && (
        <ResetModal
          onCancel={() => state.setShowConfirm(false)}
          onReset={state.resetGrid}
        />
      )}
    </div>
  );
}