import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FileText, Table, X, Pencil, FolderPlus, Plus, Minus, PanelRight,
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

const MODAL_W = 620;
const MODAL_MIN_H = 420;

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
  const { openWindow, windows } = useWindowManager();

  const containerRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [draggingOutId, setDraggingOutId] = useState<string | null>(null);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);

  // Modal drag — starts centered via CSS, locks to pixel on first drag
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startMx: number; startMy: number; startPx: number; startPy: number } | null>(null);
  const isDragging = useRef(false);

  const getCenter = () => ({
    x: Math.round(window.innerWidth / 2 - MODAL_W / 2),
    y: Math.round(window.innerHeight / 2 - MODAL_MIN_H / 2),
  });

  // On mount, immediately lock to pixel-based center so it's always centered
  useEffect(() => {
    setPos(getCenter());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,input")) return;
    e.preventDefault();
    const current = pos ?? getCenter();
    dragRef.current = { startMx: e.clientX, startMy: e.clientY, startPx: current.x, startPy: current.y };
    isDragging.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startMx;
    const dy = e.clientY - dragRef.current.startMy;
    if (!isDragging.current && Math.abs(dx) + Math.abs(dy) > 3) {
      isDragging.current = true;
    }
    if (!isDragging.current) return;
    const nx = dragRef.current.startPx + dx;
    const ny = dragRef.current.startPy + dy;
    // clamp to viewport
    const maxX = window.innerWidth - MODAL_W - 16;
    const maxY = window.innerHeight - 80;
    setPos({ x: Math.max(8, Math.min(nx, maxX)), y: Math.max(8, Math.min(ny, maxY)) });
  };

  const handleHeaderPointerUp = () => {
    dragRef.current = null;
    isDragging.current = false;
  };

  const folder = findFolderNode(folderId);
  const { documents, loading, createDocument, updateDocument, refetch } = useDocuments(folderId, moveToTrash);

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

  // Minimize to dock
  const handleMinimize = () => {
    if (!folder) return;
    // Use window manager to create a minimized folder window
    openWindow({
      type: "widget",
      contentId: `folder-${folderId}`,
      title: folder.title,
      layout: "floating",
      minimized: true,
      position: { x: pos?.x ?? getCenter().x, y: pos?.y ?? getCenter().y },
    });
    onClose();
  };

  // Open as side-by-side (split view)
  const handleSplitView = () => {
    if (!folder) return;
    // Open this folder in a floating window (non-minimized)
    openWindow({
      type: "widget",
      contentId: `folder-${folderId}`,
      title: folder.title,
      layout: "split-right",
      minimized: false,
      position: pos ?? getCenter(),
      size: { w: MODAL_W, h: 560 },
    });
    onClose();
  };

  if (!folder) return null;

  const customIcon = folder.icon ? FOLDER_ICONS.find(i => i.name === folder.icon) : null;
  const IconComp = customIcon ? customIcon.icon : Folder;
  const iconColor = folder.color || "hsl(var(--muted-foreground))";

  const modalStyle: React.CSSProperties = pos
    ? {
        position: "fixed",
        top: pos.y,
        left: pos.x,
        width: MODAL_W,
        minHeight: MODAL_MIN_H,
        maxHeight: "82vh",
        zIndex: 8001,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: MODAL_W,
        minHeight: MODAL_MIN_H,
        maxHeight: "82vh",
        zIndex: 8001,
      };

  const portal = createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        key="expanded-folder-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[8000]"
        style={{ background: "rgba(0,0,0,0.22)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Folder window */}
      <motion.div
        key={`expanded-folder-${folderId}`}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.38 }}
        className="flex flex-col"
        style={{
          ...modalStyle,
          background: "rgba(14, 11, 32, 0.93)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        onClick={e => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Header — drag handle */}
        <div
          className="flex items-center gap-3 px-5 pt-4 pb-3.5 select-none rounded-t-[24px]"
          style={{
            cursor: isDragging.current ? "grabbing" : "grab",
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
              title="Minimize to dock"
            >
              <Minus size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(80,40,0,0.75)" }} />
            </button>
            {/* Green split view */}
            <button
              onClick={handleSplitView}
              className="group flex items-center justify-center"
              style={{ width: 13, height: 13, borderRadius: "50%", background: "#27c93f", border: "0.5px solid rgba(0,0,0,0.2)", boxShadow: "0 0.5px 2px rgba(0,0,0,0.25)" }}
              title="Open in split view"
            >
              <PanelRight size={6} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(0,50,0,0.75)" }} />
            </button>
          </div>

          {/* Folder icon */}
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 36, height: 36, background: `${iconColor}18` }}
          >
            <IconComp size={18} style={{ color: iconColor }} strokeWidth={1.5} />
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
              className="flex-1 text-[20px] font-semibold bg-transparent border-b-2 outline-none"
              style={{ color: "rgba(255,255,255,0.92)", borderColor: "rgba(99,102,241,0.6)" }}
              autoFocus
            />
          ) : (
            <h2
              className="flex-1 text-[20px] font-semibold cursor-pointer select-none truncate transition-colors"
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
            Drag items outside to move to desktop
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
            <div className="grid grid-cols-4 gap-4 auto-rows-max">
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
                    dragElastic={0.15}
                    whileDrag={{ scale: 1.08, zIndex: 9999, opacity: 0.9, cursor: "grabbing" }}
                    onDragEnd={(e, info) => handleSubfolderDragEnd(e as any, info, sub)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onDoubleClick={() => onClose()}
                    style={{ opacity: draggingOutId === sub.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                      style={{
                        width: 64,
                        height: 64,
                        background: `${subColor}18`,
                        border: `1px solid ${subColor}28`,
                      }}
                    >
                      <SubIcon size={28} style={{ color: subColor }} strokeWidth={1.5} />
                    </div>
                    <span
                      className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
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
                    dragElastic={0.15}
                    whileDrag={{ scale: 1.08, zIndex: 9999, opacity: 0.9, cursor: "grabbing" }}
                    onDragEnd={(e, info) => handleDocDragEnd(e as any, info, doc)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onDoubleClick={() => { onOpenDocument(doc); onClose(); }}
                    style={{ opacity: draggingOutId === doc.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                      style={{
                        width: 64,
                        height: 64,
                        background: isSheet ? "rgba(52,211,153,0.1)" : "rgba(147,197,253,0.1)",
                        border: isSheet ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(147,197,253,0.2)",
                      }}
                    >
                      {isSheet ? (
                        <Table size={26} style={{ color: "rgba(52,211,153,0.8)" }} strokeWidth={1.5} />
                      ) : (
                        <FileText size={26} style={{ color: "rgba(147,197,253,0.8)" }} strokeWidth={1.5} />
                      )}
                    </div>
                    <span
                      className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
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
          className="px-6 py-3 flex items-center justify-between rounded-b-[24px]"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            {folder.children.length + documents.length} item{folder.children.length + documents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.div>
    </>,
    document.body
  );

  return (
    <>
      {portal}
      {showTemplateChooser && (
        <TemplateChooserModal
          onClose={() => setShowTemplateChooser(false)}
          onCreateDocument={async (title, type, content) => {
            const doc = await createDocument(title, type, folderId, content);
            refetch();
            setShowTemplateChooser(false);
          }}
        />
      )}
    </>
  );
};

export default ExpandedFolderOverlay;
