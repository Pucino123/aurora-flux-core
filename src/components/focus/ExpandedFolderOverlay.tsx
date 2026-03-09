import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FileText, Table, X, Pencil, FolderPlus, Plus, Minus, Maximize2, Square,
  Trash2, ExternalLink, ArrowLeft, ChevronDown,
  PanelRight, PanelLeft, Monitor,
} from "lucide-react";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useDocuments, DbDocument } from "@/hooks/useDocuments";
import { useTrash } from "@/context/TrashContext";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWindowManager } from "@/context/WindowManagerContext";
import { toast } from "sonner";
import TemplateChooserModal from "./TemplateChooserModal";
import DocumentView from "@/components/documents/DocumentView";

interface ExpandedFolderOverlayProps {
  folderId: string;
  onClose: () => void;
  onOpenDocument: (doc: DbDocument) => void;
  onMoveDocToDesktop: (docId: string, x: number, y: number) => void;
  onMoveFolderToDesktop: (folderId: string, x: number, y: number) => void;
}

function isOutsideRect(rect: DOMRect, x: number, y: number, margin = 40): boolean {
  return x < rect.left - margin || x > rect.right + margin || y < rect.top - margin || y > rect.bottom + margin;
}

const MODAL_W = 640;
const MODAL_MIN_H = 440;

// Document right-click context menu inside folder
interface DocContextMenuProps {
  doc: DbDocument;
  x: number;
  y: number;
  onOpen: () => void;
  onDelete: () => void;
  onClose: () => void;
}
const DocContextMenu: React.FC<DocContextMenuProps> = ({ doc, x, y, onOpen, onDelete, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    { label: "Open", icon: <ExternalLink size={11} />, action: onOpen },
    { label: "Delete", icon: <Trash2 size={11} />, action: onDelete, danger: true },
  ];

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.88, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[99999] rounded-xl overflow-hidden flex flex-col py-1"
      style={{
        left: Math.min(x, window.innerWidth - 180),
        top: Math.min(y, window.innerHeight - 100),
        minWidth: 160,
        background: "rgba(10,6,28,0.98)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(28px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.8)",
      }}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="px-3 py-1.5 border-b border-white/[0.07]">
        <p className="text-[10px] text-white/40 font-medium truncate max-w-[140px]">{doc.title}</p>
      </div>
      {items.map(item => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose(); }}
          className="flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-colors text-left w-full"
          style={{ color: item.danger ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span className="opacity-70">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </motion.div>,
    document.body
  );
};

const ExpandedFolderOverlay = ({
  folderId,
  onClose,
  onOpenDocument,
  onMoveDocToDesktop,
  onMoveFolderToDesktop,
}: ExpandedFolderOverlayProps) => {
  const { findFolderNode, updateFolder, createFolder, removeFolder, moveFolder } = useFlux();
  const { moveToTrash } = useTrash();
  const { user } = useAuth();
  const { openWindow } = useWindowManager();

  const containerRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [draggingOutId, setDraggingOutId] = useState<string | null>(null);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [docCtxMenu, setDocCtxMenu] = useState<{ doc: DbDocument; x: number; y: number } | null>(null);




  // Modal drag — locked to pixel-based position
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startMx: number; startMy: number; startPx: number; startPy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const preFullscreenPos = useRef<{ x: number; y: number } | null>(null);

  const getCenter = useCallback(() => ({
    x: Math.round(window.innerWidth / 2 - MODAL_W / 2),
    y: Math.round(window.innerHeight / 2 - MODAL_MIN_H / 2),
  }), []);

  // Set centered position on mount
  useEffect(() => {
    setPos(getCenter());
  }, [getCenter]);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,input")) return;
    if (isFullscreen) return;
    e.preventDefault();
    const current = pos ?? getCenter();
    dragRef.current = { startMx: e.clientX, startMy: e.clientY, startPx: current.x, startPy: current.y };
    isDraggingRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startMx;
    const dy = e.clientY - dragRef.current.startMy;
    if (!isDraggingRef.current && Math.abs(dx) + Math.abs(dy) > 3) {
      isDraggingRef.current = true;
    }
    if (!isDraggingRef.current) return;
    const nx = dragRef.current.startPx + dx;
    const ny = dragRef.current.startPy + dy;
    const maxX = window.innerWidth - MODAL_W - 16;
    const maxY = window.innerHeight - 80;
    setPos({ x: Math.max(8, Math.min(nx, maxX)), y: Math.max(8, Math.min(ny, maxY)) });
  };

  const handleHeaderPointerUp = () => {
    dragRef.current = null;
    isDraggingRef.current = false;
  };

  const folder = findFolderNode(folderId);
  const { documents, loading, createDocument, updateDocument, removeDocument, refetch } = useDocuments(folderId, moveToTrash);

  const commitRename = useCallback(() => {
    if (renameValue.trim() && folder && renameValue.trim() !== folder.title) {
      updateFolder(folderId, { title: renameValue.trim() });
    }
    setRenaming(false);
  }, [renameValue, folder, folderId, updateFolder]);

  const handleDocDragEnd = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }, doc: DbDocument) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (isOutsideRect(rect, info.point.x, info.point.y)) {
        setDraggingOutId(doc.id);
        if (user) {
          (supabase as any)
            .from("documents")
            .update({ folder_id: null, updated_at: new Date().toISOString() })
            .eq("id", doc.id)
            .then(() => {
              refetch();
              onMoveDocToDesktop(doc.id, info.point.x, info.point.y);
              toast.success(`"${doc.title}" moved to desktop`);
              setDraggingOutId(null);
            });
        } else {
          const LS_KEY = "flux_local_documents";
          try {
            const raw = localStorage.getItem(LS_KEY);
            const docs = raw ? JSON.parse(raw) : [];
            localStorage.setItem(LS_KEY, JSON.stringify(docs.map((d: any) =>
              d.id === doc.id ? { ...d, folder_id: null } : d
            )));
            refetch();
            onMoveDocToDesktop(doc.id, info.point.x, info.point.y);
            toast.success(`"${doc.title}" moved to desktop`);
            setDraggingOutId(null);
          } catch {}
        }
      }
    },
    [user, refetch, onMoveDocToDesktop]
  );

  const handleSubfolderDragEnd = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }, sub: FolderNode) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (isOutsideRect(rect, info.point.x, info.point.y)) {
        moveFolder(sub.id, null as any);
        onMoveFolderToDesktop(sub.id, info.point.x, info.point.y);
        toast.success(`"${sub.title}" moved to desktop`);
      }
    },
    [moveFolder, onMoveFolderToDesktop]
  );

  // Open as a proper WindowFrame (floating) via WindowManager — then close the overlay
  const openAsWindow = useCallback((layout: "floating" | "fullscreen" | "split-left" | "split-right" = "floating") => {
    if (!folder) return;
    openWindow({
      type: "widget",
      contentId: `folder-${folderId}`,
      title: folder.title,
      layout,
      minimized: false,
      position: pos ?? getCenter(),
      size: { w: MODAL_W, h: 560 },
    });
    onClose();
  }, [folder, folderId, openWindow, pos, getCenter, onClose]);

  // Minimize directly to toolbar (no popup, just close the overlay and open minimized)
  const handleMinimize = useCallback(() => {
    if (!folder) return;
    openWindow({
      type: "widget",
      contentId: `folder-${folderId}`,
      title: folder.title,
      layout: "floating",
      minimized: true,
      position: pos ?? getCenter(),
      size: { w: MODAL_W, h: 560 },
    });
    onClose();
  }, [folder, folderId, openWindow, pos, getCenter, onClose]);

  // Toggle fullscreen for the overlay itself
  const handleFullscreen = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
      if (preFullscreenPos.current) setPos(preFullscreenPos.current);
    } else {
      preFullscreenPos.current = pos ?? getCenter();
      setIsFullscreen(true);
    }
  }, [isFullscreen, pos, getCenter]);

  const handleDeleteDoc = useCallback(async (doc: DbDocument) => {
    await removeDocument(doc.id);
    refetch();
    toast.success(`"${doc.title}" deleted`);
  }, [removeDocument, refetch]);

  if (!folder) return null;

  const customIcon = folder.icon ? FOLDER_ICONS.find(i => i.name === folder.icon) : null;
  const IconComp = customIcon ? customIcon.icon : Folder;
  const iconColor = folder.color || "hsl(var(--muted-foreground))";

  // Modal style: fullscreen or positioned
  const modalStyle: React.CSSProperties = isFullscreen
    ? { position: "fixed", inset: 0, width: "100vw", height: "100vh", maxHeight: "100vh", zIndex: 8001, borderRadius: 0 }
    : pos
      ? { position: "fixed", top: pos.y, left: pos.x, width: MODAL_W, minHeight: MODAL_MIN_H, maxHeight: "82vh", zIndex: 8001 }
      : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: MODAL_W, minHeight: MODAL_MIN_H, maxHeight: "82vh", zIndex: 8001 };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[8000]"
        style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Folder window */}
      <motion.div
        key={`expanded-folder-${folderId}`}
        initial={{ opacity: 0, scale: 0.93, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 8 }}
        transition={{ type: "spring", bounce: 0.12, duration: 0.32 }}
        className="flex flex-col"
        style={{
          ...modalStyle,
          background: "rgba(14, 11, 32, 0.94)",
          backdropFilter: "blur(56px)",
          WebkitBackdropFilter: "blur(56px)",
          border: isFullscreen ? "none" : "1px solid rgba(255,255,255,0.13)",
          borderRadius: isFullscreen ? 0 : 24,
          boxShadow: isFullscreen ? "none" : "0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        onClick={e => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Header — drag handle */}
        <div
          className="flex items-center gap-3 px-5 pt-4 pb-3.5 select-none"
          style={{
            borderRadius: isFullscreen ? 0 : "24px 24px 0 0",
            cursor: isFullscreen ? "default" : "grab",
            userSelect: "none",
          }}
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          onPointerCancel={handleHeaderPointerUp}
        >
          {/* macOS traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
            {/* Red close */}
            <button
              onClick={onClose}
              className="group flex items-center justify-center"
              style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.2)", boxShadow: "0 0.5px 2px rgba(0,0,0,0.25)" }}
            >
              <X size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(80,0,0,0.75)" }} />
            </button>
            {/* Yellow minimize */}
            <button
              onClick={handleMinimize}
              className="group flex items-center justify-center"
              style={{ width: 13, height: 13, borderRadius: "50%", background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.2)", boxShadow: "0 0.5px 2px rgba(0,0,0,0.25)" }}
              title="Minimize to toolbar"
            >
              <Minus size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(80,40,0,0.75)" }} />
            </button>
            {/* Green fullscreen */}
            <button
              onClick={handleFullscreen}
              className="group flex items-center justify-center"
              style={{ width: 13, height: 13, borderRadius: "50%", background: "#27c93f", border: "0.5px solid rgba(0,0,0,0.2)", boxShadow: "0 0.5px 2px rgba(0,0,0,0.25)" }}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 size={6} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(0,50,0,0.75)" }} />
            </button>
          </div>

          {/* Layout pill — matching documents */}
          <div className="flex items-center gap-1 ml-1" onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={() => openAsWindow("floating")}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-100 opacity-80"
              style={{ background: "hsl(142 71% 45%)", color: "rgba(0,0,0,0.75)" }}
              title="Open as floating window"
            >
              <Square size={7} /> float
            </button>
            <button
              onClick={() => openAsWindow("split-right")}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-100 opacity-60 hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
              title="Open side-by-side (split right)"
            >
              split
            </button>
          </div>

          {/* Folder icon */}
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 34, height: 34, background: `${iconColor}18` }}
          >
            <IconComp size={16} style={{ color: iconColor }} strokeWidth={1.5} />
          </div>

          {/* Title */}
          {renaming ? (
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              onPointerDown={e => e.stopPropagation()}
              className="flex-1 text-[19px] font-semibold bg-transparent border-b-2 outline-none"
              style={{ color: "rgba(255,255,255,0.92)", borderColor: "rgba(99,102,241,0.6)" }}
              autoFocus
            />
          ) : (
            <h2
              className="flex-1 text-[19px] font-semibold cursor-pointer select-none truncate"
              style={{ color: "rgba(255,255,255,0.92)" }}
              onClick={e => { e.stopPropagation(); setRenameValue(folder.title); setRenaming(true); }}
              title="Click to rename"
            >
              {folder.title}
            </h2>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1" onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={() => { setRenameValue(folder.title); setRenaming(true); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              title="Rename folder"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setShowTemplateChooser(true)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              title="New document"
            >
              <FileText size={13} />
            </button>
            <button
              onClick={async () => {
                await createFolder({ parent_id: folderId, title: "New Folder", type: "folder" });
              }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              title="New subfolder"
            >
              <FolderPlus size={13} />
            </button>
          </div>
        </div>

        {/* Drag-out hint */}
        <div className="px-6 pb-1.5">
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            Drag items outside to move to desktop · Right-click documents for options
          </p>
        </div>

        {/* Content grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            </div>
          ) : folder.children.length === 0 && documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
              <Folder size={40} style={{ color: iconColor, opacity: 0.4 }} />
              <p className="text-sm">This folder is empty</p>
              <button
                onClick={() => setShowTemplateChooser(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              >
                <Plus size={14} /> New Document
              </button>
            </div>
          ) : (
            <div className="grid gap-4 auto-rows-max" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
              {/* Subfolders */}
              {folder.children.map(sub => {
                const subIcon = sub.icon ? FOLDER_ICONS.find(i => i.name === sub.icon) : null;
                const SubIcon = subIcon ? subIcon.icon : Folder;
                const subColor = sub.color || "hsl(var(--muted-foreground))";
                return (
                  <motion.div
                    key={sub.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0.12}
                    whileDrag={{ scale: 1.08, zIndex: 9999, opacity: 0.9, cursor: "grabbing" }}
                    onDragEnd={(e, info) => handleSubfolderDragEnd(e as any, info, sub)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onDoubleClick={() => onClose()}
                    style={{ opacity: draggingOutId === sub.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                      style={{ width: 64, height: 64, background: `${subColor}18`, border: `1px solid ${subColor}28` }}
                    >
                      <SubIcon size={28} style={{ color: subColor }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {sub.title}
                    </span>
                  </motion.div>
                );
              })}

              {/* Documents */}
              {documents.map(doc => {
                const isSheet = doc.type === "spreadsheet";
                return (
                  <motion.div
                    key={doc.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0.12}
                    whileDrag={{ scale: 1.08, zIndex: 9999, opacity: 0.9, cursor: "grabbing" }}
                    onDragEnd={(e, info) => handleDocDragEnd(e as any, info, doc)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onDoubleClick={() => { onOpenDocument(doc); onClose(); }}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setDocCtxMenu({ doc, x: e.clientX, y: e.clientY }); }}
                    style={{ opacity: draggingOutId === doc.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                      style={{
                        width: 64, height: 64,
                        background: isSheet ? "rgba(52,211,153,0.1)" : "rgba(147,197,253,0.1)",
                        border: isSheet ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(147,197,253,0.2)",
                      }}
                    >
                      {isSheet
                        ? <Table size={26} style={{ color: "rgba(52,211,153,0.8)" }} strokeWidth={1.5} />
                        : <FileText size={26} style={{ color: "rgba(147,197,253,0.8)" }} strokeWidth={1.5} />
                      }
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {doc.title}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderRadius: isFullscreen ? 0 : "0 0 24px 24px" }}
        >
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            {folder.children.length + documents.length} item{folder.children.length + documents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.div>

      {/* Document right-click context menu */}
      <AnimatePresence>
        {docCtxMenu && (
          <DocContextMenu
            doc={docCtxMenu.doc}
            x={docCtxMenu.x}
            y={docCtxMenu.y}
            onOpen={() => { onOpenDocument(docCtxMenu.doc); onClose(); }}
            onDelete={() => handleDeleteDoc(docCtxMenu.doc)}
            onClose={() => setDocCtxMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Template chooser */}
      {showTemplateChooser && (
        <TemplateChooserModal
          onClose={() => setShowTemplateChooser(false)}
          onCreateDocument={async (title, type, content, lightMode) => {
            const doc = await createDocument(title, type, folderId, content);
            if (doc && lightMode) {
              try { localStorage.setItem(`flux_doc_light_${doc.id}`, "1"); } catch {}
            }
            refetch();
            setShowTemplateChooser(false);
          }}
        />
      )}
    </>,
    document.body
  );
};

export default ExpandedFolderOverlay;
