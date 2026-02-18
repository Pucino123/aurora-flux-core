import { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, FolderOpen, Folder, Plus, Inbox, Brain, Pencil, Palette, Trash2, GripVertical, Image, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { FOLDER_ICONS } from "./CreateFolderModal";

const FOLDER_COLORS = [
  { name: "Blue", value: "hsl(var(--aurora-blue))" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink", value: "hsl(var(--aurora-pink))" },
  { name: "Green", value: "hsl(150 60% 45%)" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Indigo", value: "hsl(var(--aurora-indigo))" },
  { name: "Teal", value: "hsl(175 60% 42%)" },
  { name: "Red", value: "hsl(0 72% 55%)" },
  { name: "Amber", value: "hsl(45 93% 50%)" },
  { name: "Lime", value: "hsl(85 65% 45%)" },
];

interface ContextMenuState {
  x: number;
  y: number;
  folderId: string;
  subMenu?: "color" | "icon" | "rename" | null;
}

const FolderNodeComponent = ({
  folder,
  depth = 0,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
}: {
  folder: FolderNode;
  depth?: number;
  onContextMenu: (e: React.MouseEvent, folderId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dragOverId: string | null;
}) => {
  const [open, setOpen] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const { activeFolder, setActiveFolder, setActiveView, updateFolder } = useFlux();
  const hasChildren = folder.children.length > 0;
  const isActive = activeFolder === folder.id;
  const isDragOver = dragOverId === folder.id;

  const handleClick = () => {
    setActiveFolder(folder.id);
    setActiveView("canvas");
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(folder.title);
    setRenaming(true);
  };

  const commitRename = () => {
    if (renameValue.trim() && renameValue !== folder.title) {
      updateFolder(folder.id, { title: renameValue.trim() });
    }
    setRenaming(false);
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", folder.id);
          onDragStart(folder.id);
        }}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDrop={(e) => onDrop(e, folder.id)}
        className={`transition-all ${isDragOver ? "ring-2 ring-primary/40 bg-primary/5 rounded-lg" : ""}`}
      >
        <button
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => onContextMenu(e, folder.id)}
          className={`sidebar-item w-full group ${isActive ? "sidebar-item-active" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <GripVertical size={10} className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab shrink-0" />
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
              className="p-0.5 -ml-1"
            >
              <ChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-4" />
          )}
          {(() => {
            const customIcon = folder.icon ? FOLDER_ICONS.find((i) => i.name === folder.icon) : null;
            if (customIcon) {
              const IconComp = customIcon.icon;
              return <IconComp size={16} className="shrink-0" style={folder.color ? { color: folder.color } : undefined} />;
            }
            return open || isActive ? (
              <FolderOpen size={16} className="shrink-0" style={folder.color ? { color: folder.color } : undefined} />
            ) : (
              <Folder size={16} className="shrink-0" style={folder.color ? { color: folder.color } : undefined} />
            );
          })()}
          {renaming ? (
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-left bg-transparent border-b border-primary/40 outline-none text-sm"
              autoFocus
            />
          ) : (
            <span className="truncate flex-1 text-left">{folder.title}</span>
          )}
          <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">
            {folder.tasks.length}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {folder.children.map((child) => (
              <FolderNodeComponent
                key={child.id}
                folder={child}
                depth={depth + 1}
                onContextMenu={onContextMenu}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                dragOverId={dragOverId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BrainTree = ({ onRequestCreateFolder }: { onRequestCreateFolder?: () => void }) => {
  const {
    folderTree, inboxTasks, activeFolder, setActiveFolder, activeView, setActiveView,
    removeFolder, updateFolder, moveFolder, getAllFoldersFlat,
  } = useFlux();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleInboxClick = () => {
    setActiveFolder(null);
    setActiveView("canvas");
  };

  const handleNewFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestCreateFolder?.();
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId, subMenu: null });
    setShowColorPicker(null);
  };

  const openRenameSubMenu = () => {
    if (!contextMenu) return;
    const flat = getAllFoldersFlat();
    const folder = flat.find((f) => f.id === contextMenu.folderId);
    setRenameValue(folder?.title || "");
    setContextMenu({ ...contextMenu, subMenu: "rename" });
  };

  const commitRename = async () => {
    if (!contextMenu) return;
    if (renameValue.trim()) {
      await updateFolder(contextMenu.folderId, { title: renameValue.trim() });
    }
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const folderId = contextMenu.folderId;
    setContextMenu(null);
    await removeFolder(folderId);
    if (activeFolder === folderId) {
      setActiveFolder(null);
      setActiveView("stream");
    }
    toast.success(t("brain.folder_deleted"));
  };

  const handleColorChange = async (color: string) => {
    if (!contextMenu) return;
    await updateFolder(contextMenu.folderId, { color });
    setContextMenu(null);
    setShowColorPicker(null);
  };

  const handleIconChange = async (iconName: string) => {
    if (!contextMenu) return;
    await updateFolder(contextMenu.folderId, { icon: iconName });
    setContextMenu(null);
  };

  const handleMoveInto = async () => {
    if (!contextMenu) return;
    const flat = getAllFoldersFlat().filter((f) => f.id !== contextMenu.folderId);
    const target = prompt(`${t("brain.move_prompt")} (${flat.map((f) => f.title).join(", ")})`);
    if (!target) { setContextMenu(null); return; }
    const found = flat.find((f) => f.title.toLowerCase() === target.toLowerCase());
    if (found) {
      await moveFolder(contextMenu.folderId, found.id);
      toast.success(`${t("brain.folder_moved")} → ${found.title}`);
    } else {
      toast.error(t("brain.folder_not_found"));
    }
    setContextMenu(null);
  };

  const handleDragStart = (id: string) => setDraggingId(id);

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggingId) setDragOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    if (!draggingId || draggingId === targetId) return;
    moveFolder(draggingId, targetId);
    toast.success(t("brain.folder_moved"));
    setDraggingId(null);
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    if (!draggingId) return;
    moveFolder(draggingId, null);
    toast.success(t("brain.folder_moved_root"));
    setDraggingId(null);
  };

  return (
    <div className="space-y-1" onDragOver={(e) => e.preventDefault()} onDrop={handleRootDrop}>
      {/* Inbox */}
      <button
        onClick={handleInboxClick}
        className={`sidebar-item w-full ${
          activeFolder === null && activeView === "canvas" ? "sidebar-item-active" : ""
        }`}
      >
        <Inbox size={20} className="shrink-0" />
        <span className="flex-1 text-left">{t("brain.inbox")}</span>
        {inboxTasks.length > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">
            {inboxTasks.length}
          </span>
        )}
      </button>

      {/* Folders header */}
      <div className="flex items-center justify-between">
        <span className="sidebar-section-label">Folders</span>
        <button onClick={handleNewFolder} className="p-1 rounded hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
          <Plus size={14} />
        </button>
      </div>

      {/* Folder tree — always visible */}
      <div className="pl-1">
        {folderTree.map((folder) => (
          <FolderNodeComponent
            key={folder.id}
            folder={folder}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverId={dragOverId}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setContextMenu(null); setShowColorPicker(null); }} />
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-popover backdrop-blur-xl border border-border rounded-xl shadow-lg py-1.5 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y, maxHeight: '80vh', overflowY: 'auto' }}
          >
            {/* Main menu */}
            {!contextMenu.subMenu && (
              <>
                <button onClick={openRenameSubMenu} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                  <Pencil size={14} /> {t("brain.rename")}
                  <ChevronRight size={12} className="ml-auto opacity-50" />
                </button>
                <button onClick={() => setContextMenu({ ...contextMenu, subMenu: "color" })} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                  <Palette size={14} /> {t("brain.change_color")}
                  <ChevronRight size={12} className="ml-auto opacity-50" />
                </button>
                <button onClick={() => setContextMenu({ ...contextMenu, subMenu: "icon" })} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                  <Image size={14} /> Skift ikon
                  <ChevronRight size={12} className="ml-auto opacity-50" />
                </button>
                <button onClick={handleMoveInto} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                  <FolderOpen size={14} /> {t("brain.move_into")}
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={14} /> {t("brain.delete")}
                </button>
              </>
            )}

            {/* Color sub-menu */}
            {contextMenu.subMenu === "color" && (
              <div className="p-2">
                <button onClick={() => setContextMenu({ ...contextMenu, subMenu: null })} className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                  <ChevronRight size={12} className="rotate-180" /> Tilbage
                </button>
                <div className="grid grid-cols-5 gap-1.5 px-1">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleColorChange(c.value)}
                      className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Icon sub-menu */}
            {contextMenu.subMenu === "icon" && (
              <div className="p-2 w-[240px]">
                <button onClick={() => { setContextMenu({ ...contextMenu, subMenu: null }); setIconSearch(""); }} className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                  <ChevronRight size={12} className="rotate-180" /> Tilbage
                </button>
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Søg ikon..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-secondary/50 border border-border/50 outline-none focus:ring-1 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto">
                  {FOLDER_ICONS
                    .filter((item) => !iconSearch || item.name.toLowerCase().includes(iconSearch.toLowerCase()))
                    .map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.name}
                          onClick={() => { handleIconChange(item.name); setIconSearch(""); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          title={item.name}
                        >
                          <IconComp size={16} />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Rename sub-menu */}
            {contextMenu.subMenu === "rename" && (
              <div className="p-2 w-[200px]">
                <button onClick={() => setContextMenu({ ...contextMenu, subMenu: null })} className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                  <ChevronRight size={12} className="rotate-180" /> Tilbage
                </button>
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setContextMenu(null);
                  }}
                  placeholder="Nyt navn..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/50 border border-border/50 outline-none focus:ring-1 focus:ring-primary/30"
                  autoFocus
                />
                <button onClick={commitRename} className="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  Gem
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default BrainTree;
