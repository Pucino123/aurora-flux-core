import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, FolderOpen, Folder, Plus, Inbox, Brain, Pencil, Palette, Trash2, GripVertical, Image, Search, FileText, Table } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { useWorkspace } from "@/context/WorkspaceContext";
import { FOLDER_ICONS } from "./CreateFolderModal";
import { MOCK_EMAILS } from "./inbox/MockEmailData";
import { isToday, parseISO } from "date-fns";

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

interface FolderDoc {
  id: string;
  title: string;
  type: string;
  folder_id: string | null;
}

const FolderNodeComponent = ({
  folder,
  depth = 0,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
  allDocs,
  onDocClick,
}: {
  folder: FolderNode;
  depth?: number;
  onContextMenu: (e: React.MouseEvent, folderId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dragOverId: string | null;
  allDocs: FolderDoc[];
  onDocClick?: (docId: string) => void;
}) => {
  const [open, setOpen] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const { activeFolder, setActiveFolder, setActiveView, updateFolder } = useFlux();
  const hasChildren = folder.children.length > 0;
  const folderDocs = allDocs.filter(d => d.folder_id === folder.id);
  const hasContent = hasChildren || folderDocs.length > 0;
  const isActive = activeFolder === folder.id;
  const isDragOver = dragOverId === folder.id;

  const handleClick = () => {
    setOpen(!open);
    setActiveFolder(folder.id);
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
          {hasContent ? (
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
          {(folderDocs.length > 0 || hasChildren) && (
            <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">
              {folderDocs.length + folder.children.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && hasContent && (
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
                allDocs={allDocs}
                onDocClick={onDocClick}
              />
            ))}
            {/* Documents inside this folder */}
            {folderDocs.map((doc) => (
              <button
                key={doc.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData("application/flux-doc", JSON.stringify(doc));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onDocClick?.(doc.id)}
                className="sidebar-item w-full group text-muted-foreground hover:text-foreground"
                style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
              >
                <span className="w-4" />
                {doc.type === "spreadsheet" ? (
                  <Table size={14} className="shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
                ) : (
                  <FileText size={14} className="shrink-0" style={{ color: "hsl(217 91% 65%)" }} />
                )}
                <span className="truncate flex-1 text-left text-[12px]">{doc.title}</span>
              </button>
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
    removeFolder, updateFolder, moveFolder, getAllFoldersFlat, setPendingDocumentId,
  } = useFlux();
  const { user } = useAuth();
  const { openInWorkspace } = useWorkspace();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [allDocs, setAllDocs] = useState<(FolderDoc & { folder_id: string | null })[]>([]);

  // Fetch all documents for sidebar tree
  useEffect(() => {
    const fetchDocs = async () => {
      if (!user) {
        try {
          const raw = localStorage.getItem("flux_local_documents");
          const docs = raw ? JSON.parse(raw) : [];
          setAllDocs(docs.map((d: any) => ({ id: d.id, title: d.title, type: d.type, folder_id: d.folder_id })));
        } catch {}
        return;
      }
      const { data } = await (supabase as any).from("documents").select("id, title, type, folder_id").eq("user_id", user.id);
      if (data) setAllDocs(data);
    };
    fetchDocs();
  }, [user, folderTree]);


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
      setActiveView("focus");
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
        onClick={() => { setActiveFolder(null); setActiveView("inbox" as any); }}
        className={`sidebar-item w-full ${activeView === ("inbox" as any) && activeFolder === null ? "sidebar-item-active" : ""}`}
      >
        <Inbox size={16} className="shrink-0" />
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
            allDocs={allDocs}
            onDocClick={async (docId) => {
              // Fetch the full doc and open it directly in workspace
              if (user) {
                const { data } = await (supabase as any).from("documents").select("*").eq("id", docId).maybeSingle();
                if (data) { openInWorkspace(data); setActiveView("multitask" as any); return; }
              } else {
                try {
                  const raw = localStorage.getItem("flux_local_documents");
                  const docs = raw ? JSON.parse(raw) : [];
                  const found = docs.find((d: any) => d.id === docId);
                  if (found) { openInWorkspace(found); setActiveView("multitask" as any); return; }
                } catch {}
              }
              // Fallback
              setPendingDocumentId(docId);
              setActiveView("documents");
            }}
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
