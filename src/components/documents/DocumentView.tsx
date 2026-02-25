import React, { useState, useRef, useEffect, useCallback } from "react";
import { DbDocument } from "@/hooks/useDocuments";
import WordsToolbar from "./toolbar/WordsToolbar";
import SheetsToolbar from "./toolbar/SheetsToolbar";
import StatusBar from "./toolbar/StatusBar";
import StudioModeOverlay from "./toolbar/StudioModeToggle";
import { getCellDisplayValue, colIndexToLetter } from "@/lib/formulaEngine";

interface DocumentViewProps {
  document: DbDocument;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
}

const DocumentView = ({ document, onBack, onUpdate, onDelete, lightMode = false, onToggleLightMode }: DocumentViewProps) => {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(document.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitRename = () => {
    if (renameValue.trim() && renameValue.trim() !== document.title) {
      onUpdate(document.id, { title: renameValue.trim() });
    }
    setRenaming(false);
  };

  if (document.type === "spreadsheet") {
    return (
      <SpreadsheetEditor
        document={document} onUpdate={onUpdate} onDelete={onDelete}
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} lightMode={lightMode}
        onToggleLightMode={onToggleLightMode}
      />
    );
  }

  return (
    <TextEditor
      document={document} onUpdate={onUpdate} onDelete={onDelete}
      renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
      commitRename={commitRename} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} lightMode={lightMode}
      onToggleLightMode={onToggleLightMode}
    />
  );
};

/* ─── Shared editor props ─── */
interface EditorProps {
  document: DbDocument;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
}

/* ─── Text Editor ─── */
const TextEditor = ({ document: doc, onUpdate, onDelete, renaming, setRenaming, renameValue, setRenameValue, commitRename, confirmDelete, setConfirmDelete, lightMode = false, onToggleLightMode }: EditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [studioMode, setStudioMode] = useState(false);
  const [zoom, setZoom] = useState(100);
  const lm = lightMode;

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      let html = (doc.content as any)?.html || "";
      html = processCheckboxes(html);
      editorRef.current.innerHTML = html;
      initialized.current = true;
      bindCheckboxes(editorRef.current);
    }
  }, [doc.content]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    }
  }, [doc.id, onUpdate]);

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    window.document.execCommand(cmd, false, value);
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    const shortcuts: Record<string, () => void> = {
      b: () => exec("bold"),
      i: () => exec("italic"),
      u: () => exec("underline"),
      z: () => e.shiftKey ? exec("redo") : exec("undo"),
      y: () => exec("redo"),
      k: () => { const url = prompt("Enter URL:"); if (url) exec("createLink", url); },
      d: () => exec("strikeThrough"),
      e: () => exec("formatBlock", "pre"),
      j: () => exec("justifyFull"),
      l: () => exec("justifyLeft"),
    };
    if (e.shiftKey && key === "7") { e.preventDefault(); exec("insertOrderedList"); return; }
    if (e.shiftKey && key === "8") { e.preventDefault(); exec("insertUnorderedList"); return; }
    if (e.shiftKey && key === "9") { e.preventDefault(); exec("formatBlock", "blockquote"); return; }
    if (e.altKey && ["1", "2", "3"].includes(key)) {
      e.preventDefault();
      exec("formatBlock", `h${key}`);
      return;
    }
    if (shortcuts[key]) {
      e.preventDefault();
      shortcuts[key]();
    }
  }, [exec]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("doc-checkbox")) {
      e.preventDefault();
      const isChecked = target.getAttribute("data-checked") === "true";
      target.setAttribute("data-checked", String(!isChecked));
      target.textContent = !isChecked ? "☑" : "☐";
      const li = target.closest("li");
      if (li) {
        li.style.opacity = !isChecked ? "0.5" : "1";
        li.style.textDecoration = !isChecked ? "line-through" : "none";
      }
      if (editorRef.current) onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    }
  }, [doc.id, onUpdate]);

  const wordCount = editorRef.current?.innerText?.trim().split(/\s+/).filter(Boolean).length || 0;
  const charCount = editorRef.current?.innerText?.length || 0;

  return (
    <div className={`flex flex-col h-full relative ${studioMode ? "z-[150]" : ""}`}>
      <StudioModeOverlay active={studioMode} onClose={() => setStudioMode(false)} />
      <WordsToolbar
        editorRef={editorRef as React.RefObject<HTMLDivElement>}
        onContentChange={handleInput}
        exec={exec}
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} documentTitle={doc.title} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onDelete={() => onDelete(doc.id)}
        studioMode={studioMode} onToggleStudio={() => setStudioMode(!studioMode)}
        zoom={zoom} onZoomChange={setZoom}
        lightMode={lm}
        onToggleLightMode={onToggleLightMode}
      />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{ zoom: `${zoom}%` }}
        className={`flex-1 min-h-[300px] outline-none text-sm leading-relaxed prose max-w-none px-6 py-4 bg-transparent
          ${lm ? "prose-neutral text-gray-800" : "prose-invert text-foreground/90"}
          ${lm
            ? "[&_h1]:text-gray-900 [&_h2]:text-gray-800 [&_h3]:text-gray-700 [&_p]:text-gray-600 [&_li]:text-gray-600 [&_blockquote]:text-gray-500 [&_strong]:text-gray-900 [&_em]:text-gray-500"
            : "[&_h1]:text-foreground [&_h2]:text-foreground/90 [&_h3]:text-foreground/80 [&_p]:text-foreground/75 [&_li]:text-foreground/75 [&_blockquote]:text-foreground/60 [&_strong]:text-foreground [&_em]:text-foreground/60"
          }
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:border-b [&_h1]:pb-2
          ${lm ? "[&_h1]:border-gray-200" : "[&_h1]:border-border/15"}
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3
          [&_p]:mb-2
          [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:space-y-1
          [&_li]:mb-0.5
          [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:rounded-r-lg [&_blockquote]:pr-3
          ${lm ? "[&_blockquote]:border-primary/40 [&_blockquote]:bg-primary/5" : "[&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5"}
          ${lm ? "[&_hr]:border-gray-200" : "[&_hr]:border-border/15"} [&_hr]:my-4
          [&_pre]:bg-secondary/20 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-3 [&_pre]:text-xs [&_pre]:font-mono [&_pre]:overflow-x-auto
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-xs
          ${lm
            ? "[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_th]:text-gray-700"
            : "[&_td]:border [&_td]:border-border/15 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-border/15 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-secondary/30 [&_th]:font-semibold [&_th]:text-foreground/80"
          }
          [&_.doc-checkbox]:cursor-pointer [&_.doc-checkbox]:select-none [&_.doc-checkbox]:text-primary [&_.doc-checkbox]:mr-1.5 [&_.doc-checkbox]:text-base [&_.doc-checkbox]:transition-transform [&_.doc-checkbox]:duration-200 [&_.doc-checkbox]:hover:scale-125
          ${studioMode ? (lm ? "bg-white shadow-xl rounded-xl border border-gray-200" : "bg-card/80 shadow-xl rounded-xl border border-border/20") : ""}
          ${lm ? "selection:bg-primary/20" : "selection:bg-primary/20"}`}
        data-placeholder="Start typing..."
      />
      <StatusBar wordCount={wordCount} charCount={charCount} lightMode={lm} />
    </div>
  );
};

function processCheckboxes(html: string): string {
  return html
    .replace(/\[x\]/gi, '<span class="doc-checkbox" data-checked="true" contenteditable="false">☑</span>')
    .replace(/\[ \]/g, '<span class="doc-checkbox" data-checked="false" contenteditable="false">☐</span>');
}

function bindCheckboxes(el: HTMLElement) {
  el.querySelectorAll(".doc-checkbox").forEach((cb) => {
    (cb as HTMLElement).style.cursor = "pointer";
    const isChecked = cb.getAttribute("data-checked") === "true";
    const li = cb.closest("li");
    if (li && isChecked) {
      li.style.opacity = "0.5";
      li.style.textDecoration = "line-through";
    }
  });
}

/* ─── Spreadsheet Editor ─── */
const SpreadsheetEditor = ({ document: doc, onUpdate, onDelete, renaming, setRenaming, renameValue, setRenameValue, commitRename, confirmDelete, setConfirmDelete, lightMode = false, onToggleLightMode }: EditorProps) => {
  const lm = lightMode;
  const [studioMode, setStudioMode] = useState(false);

  const getRows = (): string[][] => {
    if ((doc.content as any)?.rows && Array.isArray((doc.content as any).rows)) return (doc.content as any).rows;
    return Array.from({ length: 10 }, () => Array(5).fill(""));
  };

  const [rows, setRows] = useState<string[][]>(getRows);
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);
  const lastFocusedCell = useRef<{ r: number; c: number } | null>(null);
  const colCount = rows[0]?.length || 5;
  const [cellFormats, setCellFormats] = useState<Record<string, any>>(() => (doc.content as any)?.cellFormats || {});

  const [colHeaders, setColHeaders] = useState<string[]>(() => {
    if ((doc.content as any)?.colHeaders) return (doc.content as any).colHeaders;
    return Array.from({ length: colCount }, (_, i) => String.fromCharCode(65 + i));
  });
  const [rowHeaders, setRowHeaders] = useState<string[]>(() => {
    if ((doc.content as any)?.rowHeaders) return (doc.content as any).rowHeaders;
    return Array.from({ length: rows.length }, (_, i) => String(i + 1));
  });

  const [colWidths, setColWidths] = useState<number[]>(() => Array(colCount).fill(120));
  const [rowHeights, setRowHeights] = useState<number[]>(() => Array(rows.length).fill(32));
  const resizingCol = useRef<{ idx: number; startX: number; startW: number } | null>(null);
  const resizingRow = useRef<{ idx: number; startY: number; startH: number } | null>(null);
  const [cellMenu, setCellMenu] = useState<{ x: number; y: number; r: number; c: number } | null>(null);

  React.useEffect(() => {
    const close = () => setCellMenu(null);
    if (cellMenu) { window.addEventListener("click", close); return () => window.removeEventListener("click", close); }
  }, [cellMenu]);

  useEffect(() => {
    setColWidths(prev => {
      const c = rows[0]?.length || 5;
      if (prev.length === c) return prev;
      const next = Array(c).fill(120);
      prev.forEach((w, i) => { if (i < c) next[i] = w; });
      return next;
    });
    setRowHeights(prev => {
      if (prev.length === rows.length) return prev;
      const next = Array(rows.length).fill(32);
      prev.forEach((h, i) => { if (i < rows.length) next[i] = h; });
      return next;
    });
  }, [rows.length, rows[0]?.length]);

  const saveContent = useCallback((newRows: string[][], newFormats?: Record<string, any>, newColH?: string[], newRowH?: string[]) => {
    const fmts = newFormats ?? cellFormats;
    const ch = newColH ?? colHeaders;
    const rh = newRowH ?? rowHeaders;
    onUpdate(doc.id, { content: { rows: newRows, cellFormats: fmts, colHeaders: ch, rowHeaders: rh } });
  }, [doc.id, onUpdate, cellFormats, colHeaders, rowHeaders]);

  const resolveCell = useCallback((col: number, row: number): number => {
    const val = rows[row]?.[col];
    if (!val) return 0;
    if (val.startsWith("=")) {
      const result = getCellDisplayValue(val, resolveCell);
      const n = parseFloat(result);
      return isNaN(n) ? 0 : n;
    }
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }, [rows]);

  const updateCell = (r: number, c: number, val: string) => {
    const updated = rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? val : cell) : row);
    setRows(updated);
    saveContent(updated);
  };

  const focusCellInput = (r: number, c: number) => {
    const tbody = window.document.querySelector("[data-sheet-tbody]");
    if (!tbody) return;
    const row = tbody.querySelectorAll("tr")[r];
    if (!row) return;
    // +1 because first td is row number
    const inputs = row.querySelectorAll("td input");
    (inputs?.[c] as HTMLInputElement)?.focus();
  };

  const addRow = () => { const nr = [...rows, Array(colCount).fill("")]; setRows(nr); saveContent(nr); };
  const addColumn = () => { const nr = rows.map(r => [...r, ""]); setRows(nr); saveContent(nr); };
  const deleteRow = (r: number) => { if (rows.length <= 1) return; const nr = rows.filter((_, i) => i !== r); setRows(nr); saveContent(nr); };
  const deleteColumn = (c: number) => { if (colCount <= 1) return; const nr = rows.map(r => r.filter((_, i) => i !== c)); setRows(nr); saveContent(nr); };
  const insertRowAfter = (r: number) => { const nr = [...rows.slice(0, r + 1), Array(colCount).fill(""), ...rows.slice(r + 1)]; setRows(nr); saveContent(nr); };
  const insertColAfter = (c: number) => { const nr = rows.map(r => [...r.slice(0, c + 1), "", ...r.slice(c + 1)]); setRows(nr); saveContent(nr); };

  const getCellKey = () => {
    const cell = focusedCell || lastFocusedCell.current;
    return cell ? `${cell.r}-${cell.c}` : null;
  };
  const getCellFormat = (key: string) => cellFormats[key] || {};
  const updateCellFormat = (updates: Record<string, any>) => {
    const key = getCellKey();
    if (!key) return;
    const newFormats = { ...cellFormats, [key]: { ...getCellFormat(key), ...updates } };
    setCellFormats(newFormats);
    saveContent(rows, newFormats);
  };

  const exportCsv = () => {
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = window.document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.title}.csv`;
    a.click();
  };

  const onColResizeStart = (e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    resizingCol.current = { idx, startX: e.clientX, startW: colWidths[idx] };
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const d = ev.clientX - resizingCol.current.startX;
      setColWidths(p => p.map((w, i) => i === resizingCol.current!.idx ? Math.max(60, resizingCol.current!.startW + d) : w));
    };
    const onUp = () => { resizingCol.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const onRowResizeStart = (e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    resizingRow.current = { idx, startY: e.clientY, startH: rowHeights[idx] };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRow.current) return;
      const d = ev.clientY - resizingRow.current.startY;
      setRowHeights(p => p.map((h, i) => i === resizingRow.current!.idx ? Math.max(24, resizingRow.current!.startH + d) : h));
    };
    const onUp = () => { resizingRow.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const headerBg = lm ? "bg-[#f8f9fa]" : "bg-secondary/40";
  const headerText = lm ? "text-[#5f6368]" : "text-muted-foreground/70";
  const cellBorder = lm ? "border-[#e0e0e0]" : "border-border/50";
  const rowNumText = lm ? "text-gray-500" : "text-muted-foreground/60";
  const headerRowBg = lm ? "bg-gray-50" : "bg-secondary/30";
  const resizeHandleCol = lm ? "hover:bg-blue-400/20 bg-transparent" : "hover:bg-primary/20 bg-transparent";
  const resizeHandleRow = lm ? "hover:bg-blue-400/20 bg-transparent" : "hover:bg-primary/20 bg-transparent";
  const ctxBg = lm ? "bg-white/95" : "bg-card/95";
  const ctxBorder = lm ? "border-gray-200/60" : "border-border/40";
  const ctxHover = lm ? "hover:bg-gray-100" : "hover:bg-secondary/50";

  return (
    <div className={`flex flex-col h-full relative ${studioMode ? "z-[150]" : ""}`}>
      <StudioModeOverlay active={studioMode} onClose={() => setStudioMode(false)} />
      <SheetsToolbar
        onBoldToggle={() => updateCellFormat({ bold: !getCellFormat(getCellKey() || "").bold })}
        onItalicToggle={() => updateCellFormat({ italic: !getCellFormat(getCellKey() || "").italic })}
        onUnderlineToggle={() => updateCellFormat({ underline: !getCellFormat(getCellKey() || "").underline })}
        onStrikethroughToggle={() => updateCellFormat({ strikethrough: !getCellFormat(getCellKey() || "").strikethrough })}
        onTextColor={c => updateCellFormat({ color: c || undefined })}
        onBgColor={c => updateCellFormat({ bg: c || undefined })}
        onTextAlign={a => updateCellFormat({ align: a })}
        onFontSize={s => updateCellFormat({ fontSize: s })}
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} documentTitle={doc.title} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onDelete={() => onDelete(doc.id)}
        studioMode={studioMode} onToggleStudio={() => setStudioMode(!studioMode)}
        onExportCsv={exportCsv}
        onInsertText={(text) => {
          const cell = focusedCell || lastFocusedCell.current;
          if (cell) {
            const val = rows[cell.r][cell.c] + text;
            updateCell(cell.r, cell.c, val);
          }
        }}
        lightMode={lm}
        onToggleLightMode={onToggleLightMode}
      />
      {/* Formula / Address Bar */}
      {(focusedCell || lastFocusedCell.current) && (() => {
        const cell = focusedCell || lastFocusedCell.current;
        if (!cell) return null;
        const addr = `${colIndexToLetter(cell.c)}${cell.r + 1}`;
        const rawVal = rows[cell.r]?.[cell.c] || "";
        return (
          <div className={`flex items-center gap-2 px-3 py-1 border-b text-xs ${lm ? "border-gray-200 bg-gray-50" : "border-border/30 bg-secondary/20"}`}>
            <span className={`font-mono font-semibold min-w-[40px] ${lm ? "text-gray-600" : "text-foreground/70"}`}>{addr}</span>
            <div className={`w-px h-4 ${lm ? "bg-gray-300" : "bg-border/30"}`} />
            <span className={`font-mono flex-1 truncate ${lm ? "text-gray-700" : "text-foreground/80"}`}>
              {rawVal.startsWith("=") ? rawVal : rawVal}
            </span>
            {rawVal.startsWith("=") && (
              <span className={`font-mono ${lm ? "text-green-600" : "text-green-400"}`}>
                = {getCellDisplayValue(rawVal, resolveCell)}
              </span>
            )}
          </div>
        );
      })()}
      <div className={`flex-1 overflow-auto rounded-xl border ${cellBorder} ${studioMode ? (lm ? "bg-white shadow-xl" : "bg-card/80 shadow-xl") : ""}`}>
        <table className="border-collapse text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 36 }} />
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className={`w-9 ${headerBg} border-b border-r ${cellBorder}`} />
              {colHeaders.map((label, ci) => (
                <th key={ci} className={`relative ${headerBg} border-b border-r ${cellBorder} text-[10px] ${headerText} font-mono py-0 select-none font-semibold`}>
                  <input
                    value={label}
                    onChange={e => {
                      const next = [...colHeaders];
                      next[ci] = e.target.value;
                      setColHeaders(next);
                      saveContent(rows, undefined, next, undefined);
                    }}
                    className={`w-full bg-transparent text-center text-[10px] font-mono font-semibold outline-none py-1.5 ${headerText}`}
                  />
                  <div className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize ${resizeHandleCol} transition-colors z-10`} onMouseDown={e => onColResizeStart(e, ci)} title="Drag to resize column">
                    <div className={`absolute right-0 top-1 bottom-1 w-[2px] rounded-full ${lm ? "bg-gray-300/50" : "bg-muted-foreground/15"}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-sheet-tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? headerRowBg : `${lm ? "hover:bg-gray-50" : "hover:bg-secondary/10"} transition-colors`}>
                <td className={`relative text-center text-[10px] ${rowNumText} border-r border-b ${cellBorder} select-none font-mono font-medium p-0`}
                  style={{ height: rowHeights[ri] }}
                  onContextMenu={e => { e.preventDefault(); setCellMenu({ x: e.clientX, y: e.clientY, r: ri, c: -1 }); }}>
                  <input
                    value={rowHeaders[ri] ?? String(ri + 1)}
                    onChange={e => {
                      const next = [...rowHeaders];
                      next[ri] = e.target.value;
                      setRowHeaders(next);
                      saveContent(rows, undefined, undefined, next);
                    }}
                    className={`w-full bg-transparent text-center text-[10px] font-mono font-medium outline-none ${rowNumText}`}
                    style={{ height: rowHeights[ri] }}
                  />
                  <div className={`absolute left-0 right-0 bottom-0 h-2 cursor-row-resize ${resizeHandleRow} transition-colors z-10`} onMouseDown={e => onRowResizeStart(e, ri)} title="Drag to resize row">
                    <div className={`absolute left-1 right-1 bottom-0 h-[2px] rounded-full ${lm ? "bg-gray-300/50" : "bg-muted-foreground/15"}`} />
                  </div>
                </td>
                {row.map((cell, ci) => {
                  const isFocused = focusedCell?.r === ri && focusedCell?.c === ci;
                  const fmt = getCellFormat(`${ri}-${ci}`);
                  return (
                    <td key={ci}
                      className={`border ${cellBorder} p-0 transition-all duration-150 ${isFocused ? `ring-2 ring-primary/40 ring-inset ${lm ? "bg-blue-50" : "bg-primary/5"}` : ""}`}
                      style={{ backgroundColor: fmt.bg || undefined }}
                      onContextMenu={e => { e.preventDefault(); setCellMenu({ x: e.clientX, y: e.clientY, r: ri, c: ci }); }}>
                      <input value={cell.startsWith("=") ? (isFocused ? cell : getCellDisplayValue(cell, resolveCell)) : cell}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                        onFocus={() => { setFocusedCell({ r: ri, c: ci }); lastFocusedCell.current = { r: ri, c: ci }; }}
                        onBlur={() => setFocusedCell(null)}
                        onKeyDown={e => {
                          if (e.key === "Tab") {
                            e.preventDefault();
                            const nextC = e.shiftKey ? ci - 1 : ci + 1;
                            if (nextC >= 0 && nextC < colCount) {
                              focusCellInput(ri, nextC);
                            } else if (!e.shiftKey && ri + 1 < rows.length) {
                              focusCellInput(ri + 1, 0);
                            }
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (ri + 1 < rows.length) focusCellInput(ri + 1, ci);
                          }
                          // Arrow key navigation
                          if (e.key === "ArrowDown") { e.preventDefault(); if (ri + 1 < rows.length) focusCellInput(ri + 1, ci); }
                          if (e.key === "ArrowUp") { e.preventDefault(); if (ri > 0) focusCellInput(ri - 1, ci); }
                          if (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart === cell.length) {
                            if (ci + 1 < colCount) { e.preventDefault(); focusCellInput(ri, ci + 1); }
                          }
                          if (e.key === "ArrowLeft" && (e.target as HTMLInputElement).selectionStart === 0) {
                            if (ci > 0) { e.preventDefault(); focusCellInput(ri, ci - 1); }
                          }
                          const mod = e.metaKey || e.ctrlKey;
                          if (mod && e.key === "b") { e.preventDefault(); updateCellFormat({ bold: !getCellFormat(`${ri}-${ci}`).bold }); }
                          if (mod && e.key === "i") { e.preventDefault(); updateCellFormat({ italic: !getCellFormat(`${ri}-${ci}`).italic }); }
                          if (mod && e.key === "u") { e.preventDefault(); updateCellFormat({ underline: !getCellFormat(`${ri}-${ci}`).underline }); }
                        }}
                        className={`w-full bg-transparent outline-none px-2.5 ${ri === 0 ? `font-semibold ${lm ? "text-gray-900" : "text-foreground/90"}` : ""} transition-colors`}
                        style={{
                          height: rowHeights[ri],
                          fontWeight: fmt.bold ? "bold" : undefined,
                          fontStyle: fmt.italic ? "italic" : undefined,
                          textDecoration: [fmt.underline && "underline", fmt.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined,
                          color: fmt.color || undefined,
                          textAlign: fmt.align || undefined,
                          fontSize: fmt.fontSize ? `${fmt.fontSize}px` : undefined,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 p-2">
          <button onClick={addRow} className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-200 ${lm ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/30"}`}>+ Row</button>
          <button onClick={addColumn} className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-200 ${lm ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/30"}`}>+ Column</button>
        </div>
      </div>

      {cellMenu && (
        <div className={`fixed z-[300] min-w-[160px] py-1.5 rounded-xl ${ctxBg} backdrop-blur-xl border ${ctxBorder} shadow-2xl shadow-black/30 animate-scale-in`}
          style={{ top: cellMenu.y, left: cellMenu.x }} onClick={() => setCellMenu(null)}>
          <button onClick={() => insertRowAfter(cellMenu.r)} className={`w-full text-left px-3.5 py-1.5 text-[12px] ${lm ? "text-gray-800" : "text-foreground"} ${ctxHover} transition-colors`}>Insert row below</button>
          {cellMenu.c >= 0 && (
            <button onClick={() => insertColAfter(cellMenu.c)} className={`w-full text-left px-3.5 py-1.5 text-[12px] ${lm ? "text-gray-800" : "text-foreground"} ${ctxHover} transition-colors`}>Insert column right</button>
          )}
          <div className={`h-px ${lm ? "bg-gray-200" : "bg-border/20"} mx-2.5 my-1`} />
          <button onClick={() => deleteRow(cellMenu.r)} className={`w-full text-left px-3.5 py-1.5 text-[12px] text-destructive ${lm ? "hover:bg-red-50" : "hover:bg-destructive/10"} transition-colors`}>Delete row</button>
          {cellMenu.c >= 0 && (
            <button onClick={() => deleteColumn(cellMenu.c)} className={`w-full text-left px-3.5 py-1.5 text-[12px] text-destructive ${lm ? "hover:bg-red-50" : "hover:bg-destructive/10"} transition-colors`}>Delete column</button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentView;
