import { useState, useRef, useCallback, useEffect } from "react";
import { ROWS, COLS, CELL_SIZE, MAX_HISTORY } from "../utils/constants";
import { DEFAULT_SYMBOLS, svgTree } from "../utils/svgLoader";
import {
  cellKey,
  parseKey,
  cloneCells,
  removeSpanContaining,
  resolveRoot,
} from "../utils/cellUtils";

export default function useGridState() {
  // ── Symbol management ─────────────────────────────────────────────────────
  const [symbols, setSymbols] = useState([]);
  const [showEditSymbols, setShowEditSymbols] = useState(false);
  const [newSymName, setNewSymName] = useState("");
  const [newSymWidth, setNewSymWidth] = useState(1);
  const [newSymSvg, setNewSymSvg] = useState(null);
  const [addError, setAddError] = useState("");
  const fileInputRef = useRef(null);

  // Edit existing symbol
  const [editingSymbolId, setEditingSymbolId] = useState(null);
  const [editSymName, setEditSymName] = useState("");
  const [editSymWidth, setEditSymWidth] = useState(1);

  // SVG Directory (tree-based)
  const [showDirectory, setShowDirectory] = useState(false);
  const [customDirectoryTree, setCustomDirectoryTree] = useState({
    __files: [],
  });
  const dirFileInputRef = useRef(null);

  // ── Grid dimensions (mutable) ─────────────────────────────────────────────
  const [gridRows, setGridRows] = useState(ROWS);
  const [gridCols, setGridCols] = useState(COLS);

  // ── Viewport / pan / zoom ─────────────────────────────────────────────────
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 40, y: 40 });

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());
  const isDragging = useRef(false);
  const dragStart = useRef(null);
  const dragCurrent = useRef(null);
  const [dragRect, setDragRect] = useState(null);

  // ── Cell data ─────────────────────────────────────────────────────────────
  const [cells, setCells] = useState(new Map());

  // ── History ───────────────────────────────────────────────────────────────
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [historyLen, setHistoryLen] = useState({ undo: 0, redo: 0 });

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState(null);

  // ── Move mode ─────────────────────────────────────────────────────────────
  const [moveMode, setMoveMode] = useState(false);
  const [moveOffset, setMoveOffset] = useState({ dr: 0, dc: 0 });
  const isMoveDragging = useRef(false);
  const moveDragStartCell = useRef(null);

  // ── Background image ──────────────────────────────────────────────────────
  const [bgImage, setBgImage] = useState(null);
  const [bgImageEditing, setBgImageEditing] = useState(false);
  const bgDragState = useRef(null);
  const bgFileInputRef = useRef(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const containerRef = useRef(null);
  const spaceDown = useRef(false);
  const ctrlAtDragStart = useRef(false);

  const cs = CELL_SIZE * zoom;

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const pushHistory = useCallback((prevCells) => {
    undoStack.current.push([...prevCells]);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    setHistoryLen({ undo: undoStack.current.length, redo: 0 });
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop();
    setCells((cur) => {
      redoStack.current.push([...cur]);
      setHistoryLen({
        undo: undoStack.current.length,
        redo: redoStack.current.length,
      });
      return new Map(prev);
    });
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    setCells((cur) => {
      undoStack.current.push([...cur]);
      setHistoryLen({
        undo: undoStack.current.length,
        redo: redoStack.current.length,
      });
      return new Map(next);
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const gridRowsRef = useRef(gridRows);
  gridRowsRef.current = gridRows;
  const gridColsRef = useRef(gridCols);
  gridColsRef.current = gridCols;

  const getViewport = useCallback(() => {
    if (!containerRef.current) return { r0: 0, r1: 30, c0: 0, c1: 50 };
    const { clientWidth, clientHeight } = containerRef.current;
    return {
      c0: Math.max(0, Math.floor(-offset.x / cs)),
      r0: Math.max(0, Math.floor(-offset.y / cs)),
      c1: Math.min(
        gridColsRef.current - 1,
        Math.ceil((clientWidth - offset.x) / cs)
      ),
      r1: Math.min(
        gridRowsRef.current - 1,
        Math.ceil((clientHeight - offset.y) / cs)
      ),
    };
  }, [offset, cs]);

  const mouseToCell = useCallback(
    (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      return {
        r: Math.floor((e.clientY - rect.top - offset.y) / cs),
        c: Math.floor((e.clientX - rect.left - offset.x) / cs),
      };
    },
    [offset, cs]
  );

  const getCellsInDragRect = useCallback((start, end) => {
    const r0 = Math.max(0, Math.min(start.r, end.r));
    const r1 = Math.min(gridRowsRef.current - 1, Math.max(start.r, end.r));
    const c0 = Math.max(0, Math.min(start.c, end.c));
    const c1 = Math.min(gridColsRef.current - 1, Math.max(start.c, end.c));
    const keys = [];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) keys.push(cellKey(r, c));
    return keys;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACE KEY (pan)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const kd = (e) => {
      if (e.code === "Space") {
        spaceDown.current = true;
        e.preventDefault();
      }
    };
    const ku = (e) => {
      if (e.code === "Space") spaceDown.current = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVE MODE
  // ═══════════════════════════════════════════════════════════════════════════

  const enterMoveMode = useCallback(() => {
    if (!selected.size) return;
    setMoveMode(true);
    setMoveOffset({ dr: 0, dc: 0 });
  }, [selected]);

  const commitMove = useCallback(() => {
    const { dr, dc } = moveOffset;
    setCells((prev) => {
      pushHistory(prev);
      const next = cloneCells(prev);
      const movingRoots = new Set();
      for (const key of selected) {
        const rk = resolveRoot(next, key);
        if (rk) movingRoots.add(rk);
      }
      const toPlace = [];
      for (const rk of movingRoots) {
        const cell = next.get(rk);
        if (!cell) continue;
        const { r, c } = parseKey(rk);
        toPlace.push({
          r,
          c,
          symbolId: cell.symbolId,
          spanWidth: cell.spanWidth,
        });
      }
      for (const key of selected) {
        if (!next.get(key)) {
          const { r, c } = parseKey(key);
          toPlace.push({ r, c, symbolId: null, spanWidth: 1 });
        }
      }
      for (const rk of movingRoots) {
        const cell = next.get(rk);
        if (!cell) continue;
        const { r, c } = parseKey(rk);
        for (let i = 0; i < cell.spanWidth; i++)
          next.delete(cellKey(r, c + i));
      }
      const newSel = new Set();
      for (const { r, c, symbolId, spanWidth } of toPlace) {
        const nr = r + dr,
          nc = c + dc;
        if (
          nr < 0 ||
          nr >= gridRowsRef.current ||
          nc < 0 ||
          nc >= gridColsRef.current
        )
          continue;
        if (symbolId) {
          for (let i = 0; i < spanWidth; i++)
            removeSpanContaining(next, cellKey(nr, nc + i));
          for (let i = 0; i < spanWidth; i++) {
            if (nc + i >= gridColsRef.current) continue;
            const nk = cellKey(nr, nc + i);
            if (i === 0) next.set(nk, { symbolId, spanWidth });
            else
              next.set(nk, {
                symbolId,
                spanWidth: 0,
                spanRoot: cellKey(nr, nc),
              });
          }
          for (let i = 0; i < spanWidth; i++)
            newSel.add(cellKey(nr, nc + i));
        } else {
          newSel.add(cellKey(nr, nc));
        }
      }
      setSelected(newSel);
      setMoveMode(false);
      setMoveOffset({ dr: 0, dc: 0 });
      return next;
    });
  }, [moveOffset, selected, pushHistory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  const bgImageEditingRef = useRef(bgImageEditing);
  bgImageEditingRef.current = bgImageEditing;

  const onMouseDown = useCallback(
    (e) => {
      if (e.button === 1 || spaceDown.current) {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panOffset.current = { ...offset };
        e.preventDefault();
        return;
      }
      if (bgImageEditingRef.current) {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panOffset.current = { ...offset };
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;
      const cell = mouseToCell(e);
      if (
        cell.r < 0 ||
        cell.r >= gridRowsRef.current ||
        cell.c < 0 ||
        cell.c >= gridColsRef.current
      )
        return;
      if (moveMode) {
        isMoveDragging.current = true;
        moveDragStartCell.current = cell;
        return;
      }
      ctrlAtDragStart.current = e.ctrlKey || e.metaKey;
      isDragging.current = true;
      dragStart.current = cell;
      dragCurrent.current = cell;
      setDragRect({ start: cell, end: cell });
    },
    [offset, mouseToCell, moveMode]
  );

  const onMouseMove = useCallback(
    (e) => {
      if (isPanning.current) {
        setOffset({
          x: panOffset.current.x + e.clientX - panStart.current.x,
          y: panOffset.current.y + e.clientY - panStart.current.y,
        });
        return;
      }
      if (isMoveDragging.current && moveDragStartCell.current) {
        const cell = mouseToCell(e);
        setMoveOffset({
          dr: cell.r - moveDragStartCell.current.r,
          dc: cell.c - moveDragStartCell.current.c,
        });
        return;
      }
      if (isDragging.current) {
        const cell = mouseToCell(e);
        dragCurrent.current = cell;
        setDragRect({ start: dragStart.current, end: cell });
      }
    },
    [mouseToCell]
  );

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    if (isMoveDragging.current) {
      isMoveDragging.current = false;
      moveDragStartCell.current = null;
      return;
    }
    if (isDragging.current) {
      isDragging.current = false;
      setDragRect(null);
      const keys = getCellsInDragRect(
        dragStart.current,
        dragCurrent.current
      );
      const withCtrl = ctrlAtDragStart.current;

      if (keys.length === 1) {
        const key = keys[0];
        if (withCtrl) {
          setSelected((prev) => {
            const n = new Set(prev);
            n.has(key) ? n.delete(key) : n.add(key);
            return n;
          });
        } else {
          setSelected((prev) => {
            if (prev.size === 1 && prev.has(key)) {
              return new Set();
            }
            return new Set([key]);
          });
        }
      } else {
        if (withCtrl) {
          setSelected((prev) => {
            const n = new Set(prev);
            keys.forEach((k) => n.add(k));
            return n;
          });
        } else {
          setSelected(new Set(keys));
        }
      }
    }
  }, [getCellsInDragRect]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top;
    setZoom((prev) => {
      const next = Math.max(0.2, Math.min(5, prev * factor));
      setOffset((o) => ({
        x: mx - (next / prev) * (mx - o.x),
        y: my - (next / prev) * (my - o.y),
      }));
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PLACE SYMBOL
  // ═══════════════════════════════════════════════════════════════════════════

  const placeSymbol = useCallback(
    (symbol) => {
      if (!selected.size || moveMode || bgImageEditingRef.current) return;
      const byRow = new Map();
      for (const key of selected) {
        const { r, c } = parseKey(key);
        if (!byRow.has(r)) byRow.set(r, []);
        byRow.get(r).push(c);
      }
      if (symbol.width === 1) {
        setCells((prev) => {
          pushHistory(prev);
          const next = cloneCells(prev);
          for (const key of selected) {
            removeSpanContaining(next, key);
            next.set(key, { symbolId: symbol.id, spanWidth: 1 });
          }
          return next;
        });
        setSelected(new Set());
        return;
      }
      const placements = [];
      for (const [r, cols] of byRow) {
        const sorted = [...cols].sort((a, b) => a - b);
        let rs = 0;
        while (rs < sorted.length) {
          let re = rs;
          while (
            re + 1 < sorted.length &&
            sorted[re + 1] === sorted[re] + 1
          )
            re++;
          if (re - rs + 1 >= symbol.width) {
            let i = rs;
            while (i + symbol.width - 1 <= re) {
              placements.push({ r, startC: sorted[i] });
              i += symbol.width;
            }
          }
          rs = re + 1;
        }
      }
      if (!placements.length) {
        setSelected(new Set());
        return;
      }
      setCells((prev) => {
        pushHistory(prev);
        const next = cloneCells(prev);
        for (const { r, startC } of placements) {
          for (let i = 0; i < symbol.width; i++)
            removeSpanContaining(next, cellKey(r, startC + i));
          for (let i = 0; i < symbol.width; i++) {
            const key = cellKey(r, startC + i);
            if (i === 0)
              next.set(key, { symbolId: symbol.id, spanWidth: symbol.width });
            else
              next.set(key, {
                symbolId: symbol.id,
                spanWidth: 0,
                spanRoot: cellKey(r, startC),
              });
          }
        }
        return next;
      });
      setSelected(new Set());
    },
    [selected, moveMode, pushHistory]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR SELECTED
  // ═══════════════════════════════════════════════════════════════════════════

  const clearSelected = useCallback(() => {
    if (moveMode) return;
    setCells((prev) => {
      pushHistory(prev);
      const next = cloneCells(prev);
      for (const key of selected) {
        const cell = next.get(key);
        if (cell && cell.spanWidth > 1) {
          const { r, c } = parseKey(key);
          for (let i = 0; i < cell.spanWidth; i++)
            next.delete(cellKey(r, c + i));
        } else if (cell && cell.spanWidth === 0 && cell.spanRoot) {
          const root = next.get(cell.spanRoot);
          if (root) {
            const { r, c: rc } = parseKey(cell.spanRoot);
            for (let i = 0; i < root.spanWidth; i++)
              next.delete(cellKey(r, rc + i));
          }
        } else {
          next.delete(key);
        }
      }
      return next;
    });
    setSelected(new Set());
  }, [selected, moveMode, pushHistory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  const resetGrid = () => {
    pushHistory(cells);
    setCells(new Map());
    setSelected(new Set());
    setMoveMode(false);
    setMoveOffset({ dr: 0, dc: 0 });
    setShowConfirm(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY / PASTE
  // ═══════════════════════════════════════════════════════════════════════════

  const copySelected = useCallback(() => {
    if (!selected.size) {
      setClipboard(null);
      return;
    }
    let maxR = -Infinity,
      minC = Infinity;
    for (const key of selected) {
      const { r, c } = parseKey(key);
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
    }
    const seenRoots = new Set();
    const entries = [];
    for (const key of selected) {
      const cell = cells.get(key);
      if (!cell) {
        const { r, c } = parseKey(key);
        entries.push({
          dr: r - maxR,
          dc: c - minC,
          symbolId: null,
          spanWidth: 1,
        });
        continue;
      }
      const rk = resolveRoot(cells, key);
      if (!rk || seenRoots.has(rk)) continue;
      seenRoots.add(rk);
      const rc = cells.get(rk);
      const { r: rr, c: rcol } = parseKey(rk);
      entries.push({
        dr: rr - maxR,
        dc: rcol - minC,
        symbolId: rc.symbolId,
        spanWidth: rc.spanWidth,
      });
    }
    setClipboard({ entries });
  }, [selected, cells]);

  const paste = useCallback(() => {
    if (!clipboard || !selected.size) return;
    let maxR = -Infinity,
      minC = Infinity;
    for (const key of selected) {
      const { r, c } = parseKey(key);
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
    }
    setCells((prev) => {
      pushHistory(prev);
      const next = cloneCells(prev);
      for (const { dr, dc, symbolId, spanWidth } of clipboard.entries) {
        if (!symbolId) continue;
        const nr = maxR + dr,
          nc = minC + dc;
        if (
          nr < 0 ||
          nr >= gridRowsRef.current ||
          nc < 0 ||
          nc >= gridColsRef.current
        )
          continue;
        for (let i = 0; i < spanWidth; i++)
          removeSpanContaining(next, cellKey(nr, nc + i));
        for (let i = 0; i < spanWidth; i++) {
          if (nc + i >= gridColsRef.current) continue;
          const nk = cellKey(nr, nc + i);
          if (i === 0) next.set(nk, { symbolId, spanWidth });
          else
            next.set(nk, {
              symbolId,
              spanWidth: 0,
              spanRoot: cellKey(nr, nc),
            });
        }
      }
      return next;
    });
  }, [clipboard, selected, pushHistory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG UPLOAD (add-symbol form)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSvgFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".svg") && file.type !== "image/svg+xml") {
      setAddError("Please upload a .svg file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      setNewSymSvg({ name: file.name.replace(/\.svg$/i, ""), content });
      setNewSymName((prev) => prev || file.name.replace(/\.svg$/i, ""));
      setAddError("");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addSymbol = () => {
    if (!newSymSvg) {
      setAddError("Please upload an SVG file first.");
      return;
    }
    const name = newSymName.trim() || newSymSvg.name || "Symbol";
    const w = parseInt(newSymWidth, 10);
    if (!w || w < 1 || w > 20) {
      setAddError("Width must be 1–20.");
      return;
    }
    const id = `custom_${Date.now()}`;
    setSymbols((prev) => [
      ...prev,
      { id, name, width: w, svgContent: newSymSvg.content },
    ]);
    setNewSymSvg(null);
    setNewSymName("");
    setNewSymWidth(1);
    setAddError("");
  };

  const deleteSymbol = (id) =>
    setSymbols((prev) => prev.filter((s) => s.id !== id));

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT EXISTING SYMBOL
  // ═══════════════════════════════════════════════════════════════════════════

  const startEditSymbol = (sym) => {
    setEditingSymbolId(sym.id);
    setEditSymName(sym.name);
    setEditSymWidth(sym.width);
  };

  const saveEditSymbol = () => {
    if (!editingSymbolId) return;
    const name = editSymName.trim();
    const w = parseInt(editSymWidth, 10);
    if (!name) return;
    if (!w || w < 1 || w > 20) return;
    setSymbols((prev) =>
      prev.map((s) =>
        s.id === editingSymbolId ? { ...s, name, width: w } : s
      )
    );
    setEditingSymbolId(null);
    setEditSymName("");
    setEditSymWidth(1);
  };

  const cancelEditSymbol = () => {
    setEditingSymbolId(null);
    setEditSymName("");
    setEditSymWidth(1);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDirSvgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".svg") && file.type !== "image/svg+xml") return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const name = fileNameToDisplayName(file.name);
      const id = `dirCustom_${Date.now()}`;
      const defaultWidth = computeDefaultWidth(content);
      const item = {
        id,
        name,
        svgContent: content,
        defaultWidth,
        pathLabel: "Uploads",
        fileName: file.name,
      };
      setCustomDirectoryTree((prev) => ({
        ...prev,
        __files: [...prev.__files, item],
      }));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addFromDirectory = (dirItem) => {
    const exists = symbols.some((s) => s.svgContent === dirItem.svgContent);
    if (exists) return;
    const id = `fromDir_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setSymbols((prev) => [
      ...prev,
      {
        id,
        name: dirItem.name,
        width: dirItem.defaultWidth,
        svgContent: dirItem.svgContent,
      },
    ]);
  };

  const removeFromDirectory = (dirId) => {
    const removeFromNode = (node) => {
      const newNode = {
        ...node,
        __files: node.__files.filter((f) => f.id !== dirId),
      };
      for (const key of Object.keys(node)) {
        if (key === "__files") continue;
        newNode[key] = removeFromNode(node[key]);
      }
      return newNode;
    };
    setCustomDirectoryTree((prev) => removeFromNode(prev));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GRID DIMENSION MANIPULATION
  // ═══════════════════════════════════════════════════════════════════════════

  const addColumn = useCallback(() => {
    setGridCols((prev) => prev + 1);
  }, []);

  const addRow = useCallback(() => {
    setGridRows((prev) => prev + 1);
  }, []);

  const removeSelectedColumns = useCallback(() => {
    if (!selected.size) return;
    const colsToRemove = new Set();
    for (const key of selected) {
      const { c } = parseKey(key);
      colsToRemove.add(c);
    }
    const sortedCols = [...colsToRemove].sort((a, b) => b - a);

    setCells((prev) => {
      pushHistory(prev);
      const next = new Map();
      for (const [key, cell] of prev) {
        const { r, c } = parseKey(key);
        if (colsToRemove.has(c)) continue;
        let shift = 0;
        for (const rc of sortedCols) {
          if (rc < c) shift++;
        }
        const newC = c - shift;
        const newKey = cellKey(r, newC);
        if (cell.spanWidth >= 1) {
          let newSpan = 0;
          for (let i = 0; i < cell.spanWidth; i++) {
            if (!colsToRemove.has(c + i)) newSpan++;
          }
          if (newSpan > 0) {
            next.set(newKey, { symbolId: cell.symbolId, spanWidth: newSpan });
            for (let i = 1; i < newSpan; i++) {
              next.set(cellKey(r, newC + i), {
                symbolId: cell.symbolId,
                spanWidth: 0,
                spanRoot: newKey,
              });
            }
          }
        }
      }
      return next;
    });

    setGridCols((prev) => Math.max(1, prev - sortedCols.length));
    setSelected(new Set());
  }, [selected, pushHistory]);

  const removeSelectedRows = useCallback(() => {
    if (!selected.size) return;
    const rowsToRemove = new Set();
    for (const key of selected) {
      const { r } = parseKey(key);
      rowsToRemove.add(r);
    }
    const sortedRows = [...rowsToRemove].sort((a, b) => b - a);

    setCells((prev) => {
      pushHistory(prev);
      const next = new Map();
      for (const [key, cell] of prev) {
        const { r, c } = parseKey(key);
        if (rowsToRemove.has(r)) continue;
        let shift = 0;
        for (const rr of sortedRows) {
          if (rr < r) shift++;
        }
        const newR = r - shift;
        const newKey = cellKey(newR, c);
        if (cell.spanWidth >= 1) {
          next.set(newKey, {
            symbolId: cell.symbolId,
            spanWidth: cell.spanWidth,
          });
          for (let i = 1; i < cell.spanWidth; i++) {
            next.set(cellKey(newR, c + i), {
              symbolId: cell.symbolId,
              spanWidth: 0,
              spanRoot: newKey,
            });
          }
        }
      }
      return next;
    });

    setGridRows((prev) => Math.max(1, prev - sortedRows.length));
    setSelected(new Set());
  }, [selected, pushHistory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKGROUND IMAGE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const cellH = 15;
        const cellW = cellH * (img.width / img.height);
        setBgImage({
          src: ev.target.result,
          col: 2,
          row: 2,
          cellW,
          cellH,
          naturalW: img.width,
          naturalH: img.height,
        });
        setBgImageEditing(true);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const bgImageRef = useRef(bgImage);
  bgImageRef.current = bgImage;
  const csRef = useRef(cs);
  csRef.current = cs;

  const bgImageStartDrag = useCallback((e, type) => {
    e.stopPropagation();
    e.preventDefault();
    const bg = bgImageRef.current;
    const currentCs = csRef.current;
    bgDragState.current = {
      startMx: e.clientX,
      startMy: e.clientY,
      startCol: bg?.col || 0,
      startRow: bg?.row || 0,
      startCellW: bg?.cellW || 10,
      startCellH: bg?.cellH || 10,
      type,
      cs: currentCs,
    };
    const onMove = (me) => {
      if (!bgDragState.current) return;
      const ds = bgDragState.current;
      const dx = me.clientX - ds.startMx;
      const dy = me.clientY - ds.startMy;
      if (ds.type === "move") {
        setBgImage((prev) =>
          prev
            ? {
              ...prev,
              col: ds.startCol + dx / ds.cs,
              row: ds.startRow + dy / ds.cs,
            }
            : prev
        );
      } else if (ds.type === "resize") {
        const aspect = ds.startCellW / ds.startCellH;
        const newCellW = Math.max(1, ds.startCellW + dx / ds.cs);
        const newCellH = newCellW / aspect;
        setBgImage((prev) =>
          prev ? { ...prev, cellW: newCellW, cellH: newCellH } : prev
        );
      }
    };
    const onUp = () => {
      bgDragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const bgImageFix = useCallback(() => {
    setBgImageEditing(false);
  }, []);

  const bgImageEdit = useCallback(() => {
    setBgImageEditing(true);
  }, []);

  const bgImageRemove = useCallback(() => {
    setBgImage(null);
    setBgImageEditing(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════

  const actionsRef = useRef({});
  actionsRef.current = { undo, redo, clearSelected, copySelected, paste };

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (bgImageEditingRef.current) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        actionsRef.current.undo();
      } else if (ctrl && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        actionsRef.current.redo();
      } else if (key === "backspace" || key === "delete") {
        e.preventDefault();
        actionsRef.current.clearSelected();
      } else if (ctrl && key === "c") {
        e.preventDefault();
        actionsRef.current.copySelected();
      } else if (ctrl && key === "v") {
        e.preventDefault();
        actionsRef.current.paste();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    symbols,
    showEditSymbols,
    setShowEditSymbols,
    newSymName,
    setNewSymName,
    newSymWidth,
    setNewSymWidth,
    newSymSvg,
    addError,
    fileInputRef,
    handleSvgFileChange,
    addSymbol,
    deleteSymbol,
    placeSymbol,
    editingSymbolId,
    editSymName,
    setEditSymName,
    editSymWidth,
    setEditSymWidth,
    startEditSymbol,
    saveEditSymbol,
    cancelEditSymbol,
    showDirectory,
    setShowDirectory,
    svgTree,
    customDirectoryTree,
    dirFileInputRef,
    handleDirSvgUpload,
    addFromDirectory,
    removeFromDirectory,
    offset,
    zoom,
    cs,
    containerRef,
    spaceDown,
    getViewport,
    selected,
    setSelected,
    dragRect,
    cells,
    gridRows,
    gridCols,
    addColumn,
    addRow,
    removeSelectedColumns,
    removeSelectedRows,
    historyLen,
    undo,
    redo,
    clipboard,
    copySelected,
    paste,
    moveMode,
    moveOffset,
    enterMoveMode,
    commitMove,
    clearSelected,
    resetGrid,
    showConfirm,
    setShowConfirm,
    bgImage,
    bgImageEditing,
    bgFileInputRef,
    handleBgImageUpload,
    bgImageStartDrag,
    bgImageFix,
    bgImageEdit,
    bgImageRemove,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
  };
}