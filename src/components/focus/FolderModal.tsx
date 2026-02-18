import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MoreHorizontal, Pencil, Trash2, Copy, FolderPlus, FileText, Table,
  ChevronRight, LayoutGrid, List, Folder, ArrowLeft, Search, SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useDocuments, DbDocument } from "@/hooks/useDocuments";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import FolderContents from "./FolderContents";
import FolderTemplateSelector from "./FolderTemplateSelector";
import DocumentView from "@/components/documents/DocumentView";
import { toast } from "sonner";

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

type FilterChip = "all" | "folders" | "documents";
type SortMode = "name" | "date" | "type";

interface FolderModalProps {
  folderId: string;
  onClose: () => void;
}

const FolderModal = ({ folderId, onClose }: FolderModalProps) => {
  const { findFolderNode, updateFolder, removeFolder, createFolder, moveFolder } = useFlux();

  const [navStack, setNavStack] = useState<string[]>([folderId]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDocument, setOpenDocument] = useState<DbDocument | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChip, setFilterChip] = useState<FilterChip>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [showSort, setShowSort] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const currentFolderId = navStack[navStack.length - 1];
  const currentFolder = findFolderNode(currentFolderId);

  const { documents, loading: docsLoading, createDocument, updateDocument, removeDocument } = useDocuments(currentFolderId);

  // Filter & sort
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let subs = currentFolder?.children || [];
    let docs = documents;

    if (q) {
      subs = subs.filter((s) => s.title.toLowerCase().includes(q));
      docs = docs.filter((d) => d.title.toLowerCase().includes(q));
    }

    if (filterChip === "folders") docs = [];
    if (filterChip === "documents") subs = [];

    // Sort
    const sortStr = (a: string, b: string) => a.localeCompare(b);
    if (sortMode === "name") {
      subs = [...subs].sort((a, b) => sortStr(a.title, b.title));
      docs = [...docs].sort((a, b) => sortStr(a.title, b.title));
    } else if (sortMode === "date") {
      docs = [...docs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (sortMode === "type") {
      docs = [...docs].sort((a, b) => sortStr(a.type, b.type));
    }

    return { subfolders: subs, documents: docs };
  }, [currentFolder?.children, documents, searchQuery, filterChip, sortMode]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string; title: string }[] = [];
    for (const id of navStack) {
      const node = findFolderNode(id);
      if (node) crumbs.push({ id: node.id, title: node.title });
    }
    return crumbs;
  }, [navStack, findFolderNode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else if (openDocument) {
          setOpenDocument(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, openDocument, searchQuery]);

  // Clear search when navigating
  const drillIn = useCallback((childId: string) => {
    setDirection(1);
    setNavStack((prev) => [...prev, childId]);
    setOpenDocument(null);
    setSearchQuery("");
  }, []);

  const navigateTo = useCallback((index: number) => {
    if (index >= navStack.length - 1) return;
    setDirection(-1);
    setNavStack((prev) => prev.slice(0, index + 1));
    setOpenDocument(null);
    setSearchQuery("");
  }, [navStack.length]);

  const startRename = () => {
    if (!currentFolder) return;
    setRenameValue(currentFolder.title);
    setRenaming(true);
  };
  const commitRename = () => {
    if (renameValue.trim() && currentFolder && renameValue.trim() !== currentFolder.title) {
      updateFolder(currentFolderId, { title: renameValue.trim() });
    }
    setRenaming(false);
  };

  const handleCreateSubfolder = async () => {
    await createFolder({ parent_id: currentFolderId, title: "New Folder", type: "folder" });
  };
  const handleCreateDocument = async (type: "text" | "spreadsheet") => {
    await createDocument(type === "text" ? "Untitled Document" : "Untitled Spreadsheet", type, currentFolderId);
  };
  const handleCreateFromTemplate = async (title: string, type: "text" | "spreadsheet", content?: any) => {
    if (!createDocument) return;
    const doc = await createDocument(title, type, currentFolderId);
    if (doc && content) {
      updateDocument(doc.id, { content });
    }
  };
  const handleDuplicate = async () => {
    if (!currentFolder) return;
    setMenuOpen(false);
    await createFolder({
      parent_id: currentFolder.parent_id,
      title: `${currentFolder.title} (Copy)`,
      type: currentFolder.type,
      color: currentFolder.color || undefined,
      icon: currentFolder.icon || undefined,
    });
    toast.success("Folder duplicated");
  };
  const handleDelete = async () => {
    setMenuOpen(false);
    await removeFolder(currentFolderId);
    toast.success("Folder deleted");
    onClose();
  };
  const handleOpenDocument = (doc: DbDocument) => {
    setOpenDocument(doc);
  };
  const handleMoveFolder = (draggedId: string, targetId: string) => {
    moveFolder(draggedId, targetId);
    toast.success("Folder moved");
  };

  if (!currentFolder) return null;

  const customIcon = currentFolder.icon ? FOLDER_ICONS.find((i) => i.name === currentFolder.icon) : null;
  const IconComp = customIcon ? customIcon.icon : Folder;
  const iconColor = currentFolder.color || "hsl(var(--muted-foreground))";

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="folder-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        key="folder-modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-card/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            {/* Back button for subfolder navigation or document */}
            {(navStack.length > 1 || openDocument) && !renaming && (
              <button
                onClick={() => {
                  if (openDocument) {
                    setOpenDocument(null);
                  } else {
                    navigateTo(navStack.length - 2);
                  }
                }}
                className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            {openDocument ? (
              <>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {openDocument.type === "text" ? (
                    <FileText size={18} className="text-blue-400 shrink-0" />
                  ) : (
                    <Table size={18} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-lg font-semibold text-foreground truncate">{openDocument.title}</span>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${iconColor}15` }}
                >
                  <IconComp size={20} style={{ color: iconColor }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  {renaming ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenaming(false);
                      }}
                      className="w-full text-lg font-semibold bg-transparent border-b-2 border-primary/40 outline-none text-foreground"
                      autoFocus
                    />
                  ) : (
                    <h2
                      className="text-lg font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={startRename}
                      title="Click to rename"
                    >
                      {currentFolder.title}
                    </h2>
                  )}
                </div>
                <button
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                  title={viewMode === "grid" ? "List view" : "Grid view"}
                >
                  {viewMode === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
                </button>
                <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                  <PopoverTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground">
                      <MoreHorizontal size={16} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-1.5 z-[200]" sideOffset={4}>
                    <button
                      onClick={() => { setMenuOpen(false); startRename(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Pencil size={14} className="text-muted-foreground" /> Rename
                    </button>
                    <div className="px-3 py-2">
                      <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Color</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLDER_COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => updateFolder(currentFolderId, { color: c.value })}
                            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 hover:scale-125 ${
                              currentFolder.color === c.value ? "border-foreground/40 scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Icon</p>
                      <div className="grid grid-cols-8 gap-1">
                        {FOLDER_ICONS.slice(0, 24).map((item) => {
                          const IC = item.icon;
                          const isActive = currentFolder.icon === item.name;
                          return (
                            <button
                              key={item.name}
                              onClick={() => updateFolder(currentFolderId, { icon: item.name })}
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
                    <button
                      onClick={handleDuplicate}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Copy size={14} className="text-muted-foreground" /> Duplicate
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </PopoverContent>
                </Popover>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {/* Breadcrumb */}
          {!openDocument && breadcrumbs.length > 1 && (
            <div className="flex items-center gap-1 px-5 pb-2 text-xs text-muted-foreground overflow-x-auto">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.id}>
                  {i > 0 && <ChevronRight size={12} className="shrink-0 opacity-40" />}
                  {i < breadcrumbs.length - 1 ? (
                    <button onClick={() => navigateTo(i)} className="hover:text-foreground transition-colors truncate max-w-[120px]">
                      {crumb.title}
                    </button>
                  ) : (
                    <span className="text-foreground font-medium truncate max-w-[120px]">{crumb.title}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Search bar + filter chips + create actions */}
          {!openDocument && (
            <div className="px-5 pb-3 space-y-2.5">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search folders & documents..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter chips + sort + create actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {(["all", "folders", "documents"] as FilterChip[]).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setFilterChip(chip)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                      filterChip === chip
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    {chip === "all" ? "All" : chip === "folders" ? "Folders" : "Documents"}
                  </button>
                ))}

                <Popover open={showSort} onOpenChange={setShowSort}>
                  <PopoverTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground">
                      <SlidersHorizontal size={13} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-36 p-1.5 z-[200]" sideOffset={4}>
                    {(["name", "date", "type"] as SortMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setSortMode(m); setShowSort(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          sortMode === m ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        Sort by {m}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <div className="flex-1" />

                <button
                  onClick={handleCreateSubfolder}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FolderPlus size={12} /> Folder
                </button>
                <button
                  onClick={() => handleCreateDocument("text")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText size={12} /> Doc
                </button>
                <button
                  onClick={() => handleCreateDocument("spreadsheet")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Table size={12} /> Sheet
                </button>
                <button
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Sparkles size={12} /> Templates
                </button>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0 relative">
            {openDocument ? (
              <div className="h-full min-h-[400px]">
                <DocumentView
                  document={openDocument}
                  onBack={() => setOpenDocument(null)}
                  onUpdate={(id, updates) => {
                    updateDocument(id, updates);
                    setOpenDocument((prev) => prev ? { ...prev, ...updates } : null);
                  }}
                  onDelete={(id) => {
                    removeDocument(id);
                    setOpenDocument(null);
                  }}
                />
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentFolderId}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <FolderContents
                    subfolders={filteredData.subfolders}
                    documents={filteredData.documents}
                    loading={docsLoading}
                    viewMode={viewMode}
                    searchQuery={searchQuery}
                    onOpenSubfolder={drillIn}
                    onOpenDocument={handleOpenDocument}
                    onCreateFolder={handleCreateSubfolder}
                    onCreateDocument={handleCreateDocument}
                    onMoveFolder={handleMoveFolder}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Template selector - full modal overlay */}
          <FolderTemplateSelector
            open={showTemplates}
            onClose={() => setShowTemplates(false)}
            onCreateDocument={handleCreateFromTemplate}
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default FolderModal;
