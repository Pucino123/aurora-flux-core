import React, { useRef, useState, useCallback, useEffect } from "react";
import { Folder, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useFocusStore } from "@/context/FocusContext";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { toast } from "sonner";

interface DesktopFolderProps {
  folder: FolderNode;
  onOpenModal?: (folderId: string) => void;
  dragState?: { id: string; x: number; y: number } | null;
  onDragStateChange?: (state: { id: string; x: number; y: number } | null) => void;
}

const FOLDER_COLORS = [
  { name: "Blue", value: "hsl(var(--aurora-blue))" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink", value: "hsl(var(--aurora-pink))" },
  { name: "Green", value: "hsl(150 60% 45%)" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Teal", value: "hsl(175 60% 42%)" },
  { name: "Red", value: "hsl(0 72% 55%)" },
  { name: "Amber", value: "hsl(45 93% 50%)" },
];

const DesktopFolder = ({ folder, onOpenModal, dragState, onDragStateChange }: DesktopFolderProps) => {
  const { setActiveFolder, setActiveView, updateFolder, removeFolder } = useFlux();
  const focusStore = useFocusStore();
  const desktopFolderPositions = focusStore.desktopFolderPositions ?? {};
  const updateDesktopFolderPosition = focusStore.updateDesktopFolderPosition;
  const desktopFolderOpacities = focusStore.desktopFolderOpacities ?? {};
  const updateDesktopFolderOpacity = focusStore.updateDesktopFolderOpacity;
  const systemMode = focusStore.systemMode ?? "focus";

  const pos = desktopFolderPositions[folder.id] ?? { x: 40, y: 40 };
  const folderOpacity = desktopFolderOpacities[folder.id] ?? 1;
  const [selected, setSelected] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.title);
  const [justAbsorbed, setJustAbsorbed] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const folderRef = useRef<HTMLDivElement>(null);

  // Reactively check if another folder is being dragged over this one
  useEffect(() => {
    if (!dragState || dragState.id === folder.id) {
      setIsDropTarget(false);
      return;
    }
    const rect = folderRef.current?.getBoundingClientRect();
    if (!rect) {
      setIsDropTarget(false);
      return;
    }
    const over =
      dragState.x > rect.left &&
      dragState.x < rect.right &&
      dragState.y > rect.top &&
      dragState.y < rect.bottom;
    setIsDropTarget(over);
  }, [dragState, folder.id]);

  // Trigger absorption animation
  const triggerAbsorb = useCallback(() => {
    setJustAbsorbed(true);
    setTimeout(() => setJustAbsorbed(false), 400);
  }, []);

  // Expose absorption trigger so parent can call it
  useEffect(() => {
    if (folderRef.current) {
      (folderRef.current as any).__triggerAbsorb = triggerAbsorb;
    }
  }, [triggerAbsorb]);

  const handleDoubleClick = () => {
    if (onOpenModal) {
      onOpenModal(folder.id);
    } else {
      setActiveFolder(folder.id);
      setActiveView("canvas");
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setSelected(true);
    dragging.current = true;
    didDrag.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos.x, pos.y]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      didDrag.current = true;
      const nx = Math.max(0, e.clientX - offset.current.x);
      const ny = Math.max(0, e.clientY - offset.current.y);
      updateDesktopFolderPosition(folder.id, { x: nx, y: ny });
      onDragStateChange?.({ id: folder.id, x: e.clientX, y: e.clientY });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (didDrag.current && onDragStateChange) {
        onDragStateChange(null);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [folder.id, updateDesktopFolderPosition, onDragStateChange]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const commitRename = () => {
    if (renameValue.trim() && renameValue !== folder.title) {
      updateFolder(folder.id, { title: renameValue.trim() });
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    setContextMenu(null);
    await removeFolder(folder.id);
    toast.success("Folder deleted");
  };

  const iconSize = systemMode === "focus" ? 40 : 44;
  const customIcon = folder.icon ? FOLDER_ICONS.find((i) => i.name === folder.icon) : null;
  const IconComp = isDropTarget ? FolderOpen : (customIcon ? customIcon.icon : Folder);
  const isDragging = dragState?.id === folder.id;

  return (
    <>
      <motion.div
        ref={folderRef}
        data-folder-id={folder.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: justAbsorbed ? [1, 1.15, 0.92, 1.05, 1] : (isDropTarget ? 1.08 : 1),
        }}
        transition={justAbsorbed ? { duration: 0.4, ease: "easeOut" } : { duration: 0.2 }}
        className={`desktop-folder absolute flex flex-col items-center justify-center gap-1.5 p-3 cursor-pointer select-none rounded-2xl transition-shadow duration-200 ${
          isDropTarget
            ? "ring-2 ring-blue-400/60 shadow-[0_0_28px_rgba(59,130,246,0.35)]"
            : selected
              ? "ring-2 ring-primary/30"
              : ""
        }`}
        style={{
          left: pos.x,
          top: pos.y,
          width: 90,
          minHeight: 90,
          zIndex: isDragging ? 999 : selected ? 55 : 45,
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => { e.stopPropagation(); if (!didDrag.current) setSelected(true); }}
        onContextMenu={handleContextMenu}
      >
        {/* Background layer — controlled by opacity slider */}
        <div
          className="absolute inset-0 rounded-2xl backdrop-blur-md"
          style={{
            background: `rgba(255,255,255,0.06)`,
            opacity: folderOpacity,
            pointerEvents: "none",
          }}
        />

        {/* Icon — always fully visible */}
        <div className="relative z-10" style={{ opacity: isDragging ? 0.5 : 1 }}>
          <IconComp size={iconSize} style={{ color: folder.color || "hsl(var(--muted-foreground))" }} strokeWidth={1.5} />
        </div>

        {/* Text — always fully visible */}
        <div className="relative z-10">
          {renaming ? (
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
              className="w-full text-center text-[11px] bg-transparent border-b border-primary/40 outline-none text-foreground"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight truncate w-full">
              {folder.title}
            </span>
          )}
        </div>
      </motion.div>

      {/* Context menu */}
      {contextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[9999] bg-popover backdrop-blur-xl border border-border rounded-xl shadow-lg py-1.5 min-w-[200px] max-h-[70vh] overflow-y-auto"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setContextMenu(null); setRenameValue(folder.title); setRenaming(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <Pencil size={14} /> Rename
            </button>

            <div className="h-px bg-border mx-2 my-1" />

            <div className="px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Color</p>
              <div className="flex flex-wrap gap-1.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => updateFolder(folder.id, { color: c.value })}
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-150 hover:scale-125 ${
                      folder.color === c.value ? "border-foreground/40 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Icon</p>
              <div className="grid grid-cols-8 gap-1">
                {FOLDER_ICONS.slice(0, 24).map((item) => {
                  const IC = item.icon;
                  const isActive = folder.icon === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => updateFolder(folder.id, { icon: item.name })}
                      className={`p-1 rounded-md transition-all hover:scale-110 ${
                        isActive ? "bg-primary/15" : "hover:bg-secondary/60"
                      }`}
                      title={item.name}
                    >
                      <IC size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border mx-2 my-1" />

            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Opacity</p>
                <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(folderOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={folderOpacity}
                onChange={(e) => {
                  e.stopPropagation();
                  updateDesktopFolderOpacity(folder.id, parseFloat(e.target.value));
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary"
              />
            </div>

            <div className="h-px bg-border mx-2 my-1" />

            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default DesktopFolder;
