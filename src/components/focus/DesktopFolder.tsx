import React, { useRef, useState, useCallback, useEffect, memo, useMemo } from "react";
import { Folder, FolderOpen, Pencil, Trash2, Copy, FolderInput, CalendarPlus, LayoutDashboard, Share2, FileEdit, Type, Upload, Palette, Search, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useFocusStore } from "@/context/FocusContext";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const { setActiveFolder, setActiveView, updateFolder, removeFolder, createFolder, createBlock, moveFolder, getAllFoldersFlat, folderTree } = useFlux();
  const { user } = useAuth();
  const focusStore = useFocusStore();
  const desktopFolderPositions = focusStore.desktopFolderPositions ?? {};
  const updateDesktopFolderPosition = focusStore.updateDesktopFolderPosition;
  const desktopFolderOpacities = focusStore.desktopFolderOpacities ?? {};
  const updateDesktopFolderOpacity = focusStore.updateDesktopFolderOpacity;
  const desktopFolderTitleSizes = focusStore.desktopFolderTitleSizes ?? {};
  const updateDesktopFolderTitleSize = focusStore.updateDesktopFolderTitleSize;
  const iconFillOpacities = focusStore.desktopFolderIconFillOpacities ?? {};
  const updateIconFillOpacity = focusStore.updateDesktopFolderIconFillOpacity;
  const iconStrokeOpacities = focusStore.desktopFolderIconStrokeOpacities ?? {};
  const updateIconStrokeOpacity = focusStore.updateDesktopFolderIconStrokeOpacity;
  const customIcons = focusStore.desktopFolderCustomIcons ?? {};
  const updateCustomIcon = focusStore.updateDesktopFolderCustomIcon;
  const bgColors = focusStore.desktopFolderBgColors ?? {};
  const updateBgColor = focusStore.updateDesktopFolderBgColor;
  const systemMode = focusStore.systemMode ?? "focus";

  const pos = desktopFolderPositions[folder.id] ?? { x: 40, y: 40 };
  const folderOpacity = desktopFolderOpacities[folder.id] ?? 1;
  const titleSize = desktopFolderTitleSizes[folder.id] ?? 11;
  const iconFillOp = iconFillOpacities[folder.id] ?? 0.75;
  const iconStrokeOp = iconStrokeOpacities[folder.id] ?? 1;
  const customIconUrl = customIcons[folder.id] ?? null;
  const folderBgColor = bgColors[folder.id] ?? "";
  const [selected, setSelected] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [calendarTime, setCalendarTime] = useState("09:00");
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.title);
  const [justAbsorbed, setJustAbsorbed] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const folderRef = useRef<HTMLDivElement>(null);

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return FOLDER_ICONS;
    const q = iconSearch.toLowerCase();
    return FOLDER_ICONS.filter((i) => i.name.toLowerCase().includes(q));
  }, [iconSearch]);

  const displayedIcons = showAllIcons ? filteredIcons : filteredIcons.slice(0, 12);

  useEffect(() => {
    if (!dragState || dragState.id === folder.id) { setIsDropTarget(false); return; }
    const rect = folderRef.current?.getBoundingClientRect();
    if (!rect) { setIsDropTarget(false); return; }
    const over = dragState.x > rect.left && dragState.x < rect.right && dragState.y > rect.top && dragState.y < rect.bottom;
    setIsDropTarget(over);
  }, [dragState, folder.id]);

  const triggerAbsorb = useCallback(() => {
    setJustAbsorbed(true);
    setTimeout(() => setJustAbsorbed(false), 400);
  }, []);

  useEffect(() => {
    if (folderRef.current) { (folderRef.current as any).__triggerAbsorb = triggerAbsorb; }
  }, [triggerAbsorb]);

  const handleDoubleClick = () => {
    if (onOpenModal) { onOpenModal(folder.id); } else { setActiveFolder(folder.id); setActiveView("canvas"); }
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
      if (didDrag.current && onDragStateChange) { onDragStateChange(null); }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [folder.id, updateDesktopFolderPosition, onDragStateChange]);

  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }); };

  const commitRename = () => {
    if (renameValue.trim() && renameValue !== folder.title) { updateFolder(folder.id, { title: renameValue.trim() }); }
    setRenaming(false);
  };

  const handleDelete = async () => { setContextMenu(null); await removeFolder(folder.id); toast.success("Folder deleted"); };

  const handleDuplicate = async () => {
    setContextMenu(null);
    const newFolder = await createFolder({ parent_id: folder.parent_id, title: `${folder.title} (copy)`, type: folder.type, color: folder.color ?? undefined, icon: folder.icon ?? undefined });
    if (newFolder) {
      const srcPos = desktopFolderPositions[folder.id] ?? { x: 40, y: 40 };
      updateDesktopFolderPosition(newFolder.id, { x: srcPos.x + 30, y: srcPos.y + 30 });
      if (folderOpacity !== 1) updateDesktopFolderOpacity(newFolder.id, folderOpacity);
      if (titleSize !== 11) updateDesktopFolderTitleSize(newFolder.id, titleSize);
      toast.success("Folder duplicated");
    }
  };

  const handleMoveTo = async (targetParentId: string | null) => {
    setContextMenu(null); setShowMoveMenu(false);
    await moveFolder(folder.id, targetParentId);
    toast.success(targetParentId ? "Folder moved" : "Moved to root");
  };

  const handleAddToCalendar = async (time: string) => {
    setContextMenu(null); setShowCalendarPicker(false);
    const today = new Date().toISOString().split("T")[0];
    await createBlock({ title: folder.title, time, duration: "60m", type: "folder", scheduled_date: today });
    toast.success(`Added to calendar at ${time}`);
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder.id}.${ext}`;
    const { error } = await supabase.storage.from("folder-icons").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("folder-icons").getPublicUrl(path);
    updateCustomIcon(folder.id, data.publicUrl);
    toast.success("Custom icon uploaded");
  };

  const handleAddToDashboard = () => { setContextMenu(null); setActiveFolder(folder.id); setActiveView("canvas"); toast.success("Opened in dashboard"); };

  const handleShare = async () => {
    setContextMenu(null);
    const shareUrl = `${window.location.origin}/?folder=${folder.id}`;
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Share link copied to clipboard"); }
    catch { toast.info("Share link: " + shareUrl); }
  };

  const getMoveTargets = useCallback(() => {
    const allFlat = getAllFoldersFlat();
    const selfAndDescendants = new Set<string>([folder.id]);
    const collectDescendants = (nodes: typeof folderTree, parentId: string) => {
      for (const n of nodes) { if (n.parent_id === parentId) { selfAndDescendants.add(n.id); collectDescendants(allFlat, n.id); } }
    };
    collectDescendants(allFlat, folder.id);
    return allFlat.filter((f) => !selfAndDescendants.has(f.id));
  }, [folder.id, getAllFoldersFlat, folderTree]);

  const iconSize = systemMode === "focus" ? 40 : 44;
  const customIcon = folder.icon ? FOLDER_ICONS.find((i) => i.name === folder.icon) : null;
  const IconComp = isDropTarget ? FolderOpen : (customIcon ? customIcon.icon : Folder);
  const isDragging = dragState?.id === folder.id;
  const iconFill = folder.color || "hsl(var(--muted-foreground))";

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
        className={`desktop-folder absolute flex flex-col items-center justify-center gap-0 p-2 pb-1 cursor-pointer select-none rounded-2xl ${
          isDropTarget ? "ring-2 ring-blue-400/60 shadow-[0_0_28px_rgba(59,130,246,0.35)]" : ""
        }`}
        style={{
          left: pos.x, top: pos.y, width: 90, minHeight: 90,
          zIndex: isDragging ? 999 : selected ? 55 : 45,
          background: "transparent",
          backdropFilter: folderOpacity <= 0.06 ? "none" : undefined,
          WebkitBackdropFilter: folderOpacity <= 0.06 ? "none" : undefined,
          boxShadow: folderOpacity <= 0.06 ? "none" : undefined,
          border: folderOpacity <= 0.06 ? "none" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => { e.stopPropagation(); if (!didDrag.current) setSelected(true); }}
        onContextMenu={handleContextMenu}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("desktop-doc-id")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDropTarget(true);
          }
        }}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={async (e) => {
          const docId = e.dataTransfer.getData("desktop-doc-id");
          if (docId) {
            e.preventDefault();
            e.stopPropagation();
            setIsDropTarget(false);
            await (supabase as any).from("documents").update({ folder_id: folder.id }).eq("id", docId);
            triggerAbsorb();
            toast.success(`Moved to ${folder.title}`);
          }
        }}
      >
        {/* Background layer */}
        {folderOpacity > 0.06 ? (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: (() => {
                if (!folderBgColor) return `rgba(22,22,26,${0.65 * folderOpacity})`;
                if (folderBgColor.startsWith('#')) {
                  const hex = folderBgColor.replace('#', '');
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  return `rgba(${r},${g},${b},${folderOpacity})`;
                }
                return `color-mix(in srgb, ${folderBgColor} ${Math.round(folderOpacity * 100)}%, transparent)`;
              })(),
              backdropFilter: `blur(${Math.round(16 * folderOpacity)}px)`,
              WebkitBackdropFilter: `blur(${Math.round(16 * folderOpacity)}px)`,
              boxShadow: `0 4px 20px rgba(0,0,0,${0.22 * folderOpacity})`,
              pointerEvents: "none",
              willChange: "backdrop-filter, opacity",
            }}
          />
        ) : null}

        {/* Icon */}
        <div className="relative z-10" style={{ opacity: isDragging ? 0.5 : 1 }}>
          {customIconUrl ? (
            <img src={customIconUrl} alt="" className="rounded-lg object-cover" style={{ width: iconSize, height: iconSize, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
          ) : (
            <IconComp size={iconSize} style={{ color: iconFill, fill: iconFill, fillOpacity: iconFillOp, strokeOpacity: iconStrokeOp, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} strokeWidth={2.2} />
          )}
        </div>

        {/* Title */}
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
            <span className="font-medium text-foreground/90 text-center leading-tight truncate w-full block" style={{ fontSize: `${titleSize}px` }}>
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
            className="fixed z-[9999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ left: Math.min(contextMenu.x + 100, window.innerWidth - 560), top: Math.min(contextMenu.y, window.innerHeight - 500), width: 540 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Title slider — top bar */}
            <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-3">
              <p className="text-[10px] text-muted-foreground uppercase shrink-0 flex items-center gap-1"><Type size={10} /> Title</p>
              <input type="range" min="9" max="20" step="1" value={titleSize}
                onChange={(e) => { e.stopPropagation(); updateDesktopFolderTitleSize(folder.id, parseInt(e.target.value)); }}
                onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary"
              />
              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{titleSize}px</span>
            </div>

            <div className="flex gap-0">
              {/* Column 1 — Actions */}
              <div className="flex-1 border-r border-border/30 py-2">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">Actions</p>
                <button onClick={() => { setContextMenu(null); handleDoubleClick(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <FileEdit size={13} className="text-muted-foreground" /> Edit
                </button>
                <button onClick={() => { setContextMenu(null); setRenameValue(folder.title); setRenaming(true); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <Pencil size={13} className="text-muted-foreground" /> Rename
                </button>
                <button onClick={handleDuplicate} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <Copy size={13} className="text-muted-foreground" /> Duplicate
                </button>
                <div className="relative">
                  <button onClick={() => setShowMoveMenu(!showMoveMenu)} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                    <FolderInput size={13} className="text-muted-foreground" /> Move to…
                  </button>
                  {showMoveMenu && (
                    <div className="bg-popover border border-border rounded-lg shadow-xl py-1 ml-2 mt-1 max-h-32 overflow-y-auto">
                      <button onClick={() => handleMoveTo(null)} className="w-full text-left px-3 py-1 text-xs text-foreground hover:bg-secondary transition-colors">📁 Root</button>
                      {getMoveTargets().map((f) => (
                        <button key={f.id} onClick={() => handleMoveTo(f.id)} className="w-full text-left px-3 py-1 text-xs text-foreground hover:bg-secondary transition-colors truncate">📂 {f.title}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => setShowCalendarPicker(!showCalendarPicker)} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                    <CalendarPlus size={13} className="text-muted-foreground" /> Calendar
                  </button>
                  {showCalendarPicker && (
                    <div className="bg-popover border border-border rounded-lg shadow-xl p-2 ml-2 mt-1">
                      <div className="flex items-center gap-2">
                        <input type="time" value={calendarTime} onChange={(e) => setCalendarTime(e.target.value)}
                          className="bg-secondary text-foreground text-xs rounded px-2 py-1 border border-border outline-none"
                          onPointerDown={(e) => e.stopPropagation()} />
                        <button onClick={() => handleAddToCalendar(calendarTime)}
                          className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90">Add</button>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={handleAddToDashboard} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <LayoutDashboard size={13} className="text-muted-foreground" /> Dashboard
                </button>
                <button onClick={handleShare} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <Share2 size={13} className="text-muted-foreground" /> Share
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              {/* Column 2 — Icon */}
              <div className="flex-1 border-r border-border/30 py-3 overflow-hidden">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2">Icon</p>

                {/* Icon search */}
                <div className="px-4 pb-2">
                  <div className="relative">
                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="text" value={iconSearch}
                      onChange={(e) => { e.stopPropagation(); setIconSearch(e.target.value); if (e.target.value) setShowAllIcons(true); }}
                      placeholder="Search icons..."
                      className="w-full h-6 pl-6 pr-2 rounded-md bg-secondary/40 border border-border/30 text-[10px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/20"
                      onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <div className={`grid grid-cols-6 gap-1.5 ${showAllIcons ? 'max-h-[140px] overflow-y-auto' : ''}`}>
                    {displayedIcons.map((item) => {
                      const IC = item.icon;
                      const isActive = folder.icon === item.name && !customIconUrl;
                      return (
                        <button key={item.name} onClick={() => { updateFolder(folder.id, { icon: item.name }); updateCustomIcon(folder.id, ""); }}
                          className={`p-1.5 rounded-md transition-all hover:scale-110 ${isActive ? "bg-primary/15" : "hover:bg-secondary/60"}`} title={item.name}>
                          <IC size={13} className={isActive ? "text-primary" : "text-muted-foreground"} />
                        </button>
                      );
                    })}
                  </div>
                  {!iconSearch && filteredIcons.length > 12 && (
                    <button onClick={() => setShowAllIcons(!showAllIcons)}
                      className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown size={10} className={`transition-transform ${showAllIcons ? 'rotate-180' : ''}`} />
                      {showAllIcons ? 'Show less' : `Show all (${filteredIcons.length})`}
                    </button>
                  )}
                  {iconSearch && filteredIcons.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/50 text-center py-2">No icons found</p>
                  )}
                </div>

                <div className="px-4 pb-1">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-md transition-colors">
                    <Upload size={10} /> Upload
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadIcon} />
                </div>

                <div className="px-4 pb-4">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2.5 flex items-center gap-1"><Palette size={10} /> Color</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {FOLDER_COLORS.map((c) => (
                      <button key={c.name} onClick={(e) => { e.stopPropagation(); updateFolder(folder.id, { color: c.value }); }}
                        className={`rounded-full border-2 transition-all hover:scale-125 ${folder.color === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
                    ))}
                    <label
                      className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                      style={{ width: 18, height: 18 }} title="Custom"
                      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input type="color" value="#8b5cf6"
                        onChange={(e) => { e.stopPropagation(); updateFolder(folder.id, { color: e.target.value }); }}
                        onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </label>
                  </div>
                </div>

                <div className="px-4 py-1.5 flex items-center gap-2 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase w-8 shrink-0">Fill</p>
                  <input type="range" min="0" max="1" step="0.05" value={iconFillOp}
                    onChange={(e) => { e.stopPropagation(); updateIconFillOpacity(folder.id, parseFloat(e.target.value)); }}
                    onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(iconFillOp * 100)}%</span>
                </div>
                <div className="px-4 py-1.5 flex items-center gap-2 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase w-8 shrink-0">Stroke</p>
                  <input type="range" min="0" max="1" step="0.05" value={iconStrokeOp}
                    onChange={(e) => { e.stopPropagation(); updateIconStrokeOpacity(folder.id, parseFloat(e.target.value)); }}
                    onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(iconStrokeOp * 100)}%</span>
                </div>
              </div>

              {/* Column 3 — Background */}
              <div className="flex-1 py-3 min-w-0">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-3">Background</p>
                <div className="px-4 pb-4">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2.5">Color</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); updateBgColor(folder.id, ""); }}
                      className={`rounded-full border-2 transition-all hover:scale-125 ${!folderBgColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                      style={{ background: "rgba(22,22,26,0.65)", width: 18, height: 18 }} title="Default" />
                    {FOLDER_COLORS.map((c) => (
                      <button key={c.name} onClick={(e) => { e.stopPropagation(); updateBgColor(folder.id, c.value); }}
                        className={`rounded-full border-2 transition-all hover:scale-125 ${folderBgColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
                    ))}
                    <label
                      className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                      style={{ width: 18, height: 18 }} title="Custom bg"
                      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input type="color"
                        value={folderBgColor && folderBgColor.startsWith('#') ? folderBgColor : "#16161a"}
                        onChange={(e) => { e.stopPropagation(); updateBgColor(folder.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </label>
                  </div>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase w-10 shrink-0">Opacity</p>
                  <input type="range" min="0" max="1" step="0.05" value={folderOpacity}
                    onChange={(e) => { e.stopPropagation(); updateDesktopFolderOpacity(folder.id, parseFloat(e.target.value)); }}
                    onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(folderOpacity * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default memo(DesktopFolder);
