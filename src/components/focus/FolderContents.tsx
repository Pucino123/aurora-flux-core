import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Folder, FileText, Table, FolderPlus, FolderOpen } from "lucide-react";
import { FolderNode } from "@/context/FluxContext";
import { DbDocument } from "@/hooks/useDocuments";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";

interface FolderContentsProps {
  subfolders: FolderNode[];
  documents: DbDocument[];
  loading: boolean;
  viewMode: "grid" | "list";
  searchQuery?: string;
  onOpenSubfolder: (id: string) => void;
  onOpenDocument?: (doc: DbDocument) => void;
  onCreateFolder: () => void;
  onCreateDocument: (type: "text" | "spreadsheet") => void;
  onMoveFolder?: (draggedId: string, targetId: string) => void;
}

const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const FolderContents = ({
  subfolders,
  documents,
  loading,
  viewMode,
  searchQuery = "",
  onOpenSubfolder,
  onOpenDocument,
  onCreateFolder,
  onCreateDocument,
  onMoveFolder,
}: FolderContentsProps) => {
  const isEmpty = subfolders.length === 0 && documents.length === 0;
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent, folderId: string) => {
    draggedId.current = folderId;
    e.dataTransfer.setData("modal-folder-id", folderId);
    e.dataTransfer.effectAllowed = "move";
    (e.target as HTMLElement).style.opacity = "0.4";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    draggedId.current = null;
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId.current && draggedId.current !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (draggedId.current && draggedId.current !== targetId && onMoveFolder) {
      onMoveFolder(draggedId.current, targetId);
    }
    draggedId.current = null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isEmpty && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
          <Folder size={28} className="text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">This folder is empty</p>
        <div className="flex gap-2">
          <button onClick={onCreateFolder} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <FolderPlus size={14} /> New Folder
          </button>
          <button onClick={() => onCreateDocument("text")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
            <FileText size={14} /> Document
          </button>
          <button onClick={() => onCreateDocument("spreadsheet")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
            <Table size={14} /> Spreadsheet
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center">
          <FileText size={22} className="text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
        <p className="text-xs text-muted-foreground/60">Try a different search term</p>
      </div>
    );
  }

  const renderSubfolderGrid = (sf: FolderNode, i: number) => {
    const customIcon = sf.icon ? FOLDER_ICONS.find((ic) => ic.name === sf.icon) : null;
    const IconComp = customIcon ? customIcon.icon : Folder;
    const isDropTarget = dragOverId === sf.id;
    return (
      <motion.button
        key={sf.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.03 }}
        onClick={() => onOpenSubfolder(sf.id)}
        draggable
        onDragStart={(e) => handleDragStart(e as any, sf.id)}
        onDragEnd={(e) => handleDragEnd(e as any)}
        onDragOver={(e) => handleDragOver(e as any, sf.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e as any, sf.id)}
        className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 group ${
          isDropTarget
            ? "scale-[1.04] ring-2 ring-blue-400/50 bg-blue-500/8 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
            : "hover:bg-secondary/50 hover:scale-[1.03]"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 ${
            isDropTarget ? "scale-110" : ""
          }`}
          style={{ backgroundColor: `${sf.color || "hsl(var(--muted))"}15` }}
        >
          {isDropTarget ? (
            <FolderOpen size={24} style={{ color: sf.color || "hsl(var(--muted-foreground))" }} strokeWidth={1.5} />
          ) : (
            <IconComp size={24} style={{ color: sf.color || "hsl(var(--muted-foreground))" }} strokeWidth={1.5} />
          )}
        </div>
        <span className="text-xs font-medium text-foreground text-center truncate w-full leading-tight">
          {highlightMatch(sf.title, searchQuery)}
        </span>
      </motion.button>
    );
  };

  const renderSubfolderList = (sf: FolderNode, i: number) => {
    const customIcon = sf.icon ? FOLDER_ICONS.find((ic) => ic.name === sf.icon) : null;
    const IconComp = customIcon ? customIcon.icon : Folder;
    const isDropTarget = dragOverId === sf.id;
    return (
      <motion.button
        key={sf.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.02 }}
        onClick={() => onOpenSubfolder(sf.id)}
        draggable
        onDragStart={(e) => handleDragStart(e as any, sf.id)}
        onDragEnd={(e) => handleDragEnd(e as any)}
        onDragOver={(e) => handleDragOver(e as any, sf.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e as any, sf.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
          isDropTarget
            ? "scale-[1.01] ring-2 ring-blue-400/50 bg-blue-500/8 shadow-[0_0_16px_rgba(59,130,246,0.2)]"
            : "hover:bg-secondary/60"
        }`}
      >
        {isDropTarget ? (
          <FolderOpen size={18} style={{ color: sf.color || "hsl(var(--muted-foreground))" }} />
        ) : (
          <IconComp size={18} style={{ color: sf.color || "hsl(var(--muted-foreground))" }} />
        )}
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          {highlightMatch(sf.title, searchQuery)}
        </span>
        <span className="text-[11px] text-muted-foreground">{sf.children.length} folders</span>
      </motion.button>
    );
  };

  if (viewMode === "list") {
    return (
      <div className="space-y-0.5">
        {subfolders.map((sf, i) => renderSubfolderList(sf, i))}
        {documents.map((doc, i) => (
          <motion.button
            key={doc.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (subfolders.length + i) * 0.02 }}
            onClick={() => onOpenDocument?.(doc)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-left group"
          >
            {doc.type === "spreadsheet" ? (
              <Table size={18} className="text-emerald-500" />
            ) : (
              <FileText size={18} className="text-blue-400" />
            )}
            <span className="text-sm font-medium text-foreground flex-1 truncate">
              {highlightMatch(doc.title, searchQuery)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wider">
              {doc.type === "spreadsheet" ? "xlsx" : "doc"}
            </span>
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {subfolders.map((sf, i) => renderSubfolderGrid(sf, i))}
      {documents.map((doc, i) => (
        <motion.button
          key={doc.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (subfolders.length + i) * 0.03 }}
          onClick={() => onOpenDocument?.(doc)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-secondary/50 transition-all duration-200 hover:scale-[1.03] group"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/40 transition-transform duration-200 group-hover:scale-110">
            {doc.type === "spreadsheet" ? (
              <Table size={24} className="text-emerald-500" strokeWidth={1.5} />
            ) : (
              <FileText size={24} className="text-blue-400" strokeWidth={1.5} />
            )}
          </div>
          <span className="text-xs font-medium text-foreground text-center truncate w-full leading-tight">
            {highlightMatch(doc.title, searchQuery)}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default FolderContents;
