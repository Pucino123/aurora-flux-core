import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FileText, Table, Pencil, Trash2, Copy, Type, Upload, Palette, Search, ChevronDown, Share2, CalendarPlus, FolderInput, Clock } from "lucide-react";
import { DbDocument } from "@/hooks/useDocuments";
import { useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";

interface DesktopDocumentProps {
  doc: DbDocument;
  onOpen: (doc: DbDocument) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (doc: DbDocument) => void;
  onRefetch?: () => void;
  dragState?: { id: string; x: number; y: number } | null;
  onDragStateChange?: (state: { id: string; x: number; y: number } | null) => void;
}

const ICON_COLORS = [
  { name: "Blue", value: "hsl(217 91% 60%)" },
  { name: "Emerald", value: "hsl(160 84% 39%)" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink", value: "hsl(var(--aurora-pink))" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Red", value: "hsl(0 72% 55%)" },
  { name: "Amber", value: "hsl(45 93% 50%)" },
  { name: "Teal", value: "hsl(175 60% 42%)" },
];

const BG_COLORS = [
  { name: "Blue", value: "hsl(217 91% 60%)" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink", value: "hsl(var(--aurora-pink))" },
  { name: "Green", value: "hsl(150 60% 45%)" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Teal", value: "hsl(175 60% 42%)" },
  { name: "Red", value: "hsl(0 72% 55%)" },
  { name: "Amber", value: "hsl(45 93% 50%)" },
];

const DesktopDocument = ({ doc, onOpen, onDelete, onDuplicate, onRefetch, dragState, onDragStateChange }: DesktopDocumentProps) => {
  const { user } = useAuth();
  const store = useFocusStore();
  const { folders, createBlock } = useFlux();
  const pos = store.desktopDocPositions[doc.id] ?? { x: 0, y: 0 };
  const docOpacity = store.desktopDocOpacities[doc.id] ?? 1;
  const titleSize = store.desktopDocTitleSizes[doc.id] ?? 10;
  const bgColor = store.desktopDocBgColors[doc.id] ?? "";
  const customIconUrl = store.desktopDocCustomIcons[doc.id] ?? "";
  const iconColor = store.desktopDocIconColors[doc.id] ?? "";

  const isSpreadsheet = doc.type === "spreadsheet";
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());
  const [calTime, setCalTime] = useState("09:00");
  const [showMoveFolder, setShowMoveFolder] = useState(false);

  const rootFolders = useMemo(() => folders.filter(f => !f.parent_id), [folders]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return FOLDER_ICONS;
    const q = iconSearch.toLowerCase();
    return FOLDER_ICONS.filter((i) => i.name.toLowerCase().includes(q));
  }, [iconSearch]);
  const displayedIcons = showAllIcons ? filteredIcons : filteredIcons.slice(0, 12);

  const [selected, setSelected] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = true;
    didDrag.current = false;
    setIsDraggingActive(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos.x, pos.y]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      didDrag.current = true;
      const nx = Math.max(0, e.clientX - offset.current.x);
      const ny = Math.max(0, e.clientY - offset.current.y);
      store.updateDesktopDocPosition(doc.id, { x: nx, y: ny });
      onDragStateChange?.({ id: doc.id, x: e.clientX, y: e.clientY });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDraggingActive(false);
      if (didDrag.current && onDragStateChange) { onDragStateChange(null); }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [doc.id, store.updateDesktopDocPosition]);

  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }); };

  const commitRename = async () => {
    if (renameValue.trim() && renameValue.trim() !== doc.title) {
      await supabase.from("documents").update({ title: renameValue.trim() } as any).eq("id", doc.id);
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    setContextMenu(null);
    if (onDelete) onDelete(doc.id);
    else { await supabase.from("documents").delete().eq("id", doc.id); toast.success("Document deleted"); }
  };

  const handleDuplicate = async () => {
    setContextMenu(null);
    if (onDuplicate) { onDuplicate(doc); return; }
    const { error } = await supabase.from("documents").insert({ title: `${doc.title} (copy)`, type: doc.type, content: doc.content, user_id: doc.user_id, folder_id: null } as any);
    if (!error) { toast.success("Document duplicated"); }
  };

  const handleShare = async () => {
    setContextMenu(null);
    try { await navigator.clipboard.writeText(`${window.location.origin}/?doc=${doc.id}`); toast.success("Share link copied"); }
    catch { toast.info("Could not copy link"); }
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/doc-${doc.id}.${ext}`;
    const { error } = await supabase.storage.from("folder-icons").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("folder-icons").getPublicUrl(path);
    store.updateDesktopDocCustomIcon(doc.id, data.publicUrl);
    toast.success("Custom icon uploaded");
  };

  const defaultIconColor = isSpreadsheet ? "hsl(160 84% 39%)" : "hsl(217 91% 60%)";
  const resolvedIconColor = iconColor || defaultIconColor;
  const storedIconName = store.desktopDocCustomIcons[doc.id];
  const lucideIcon = storedIconName && !storedIconName.startsWith("http") ? FOLDER_ICONS.find(i => i.name === storedIconName) : null;
  const iconSize = 40;

  return (
    <>
      <div
        className={`desktop-folder absolute flex flex-col items-center justify-center gap-0 p-2 pb-1 cursor-pointer select-none rounded-2xl group ${selected ? "ring-2 ring-primary/60" : ""}`}
        style={{ left: pos.x, top: pos.y, width: 90, minHeight: 90, zIndex: isDraggingActive ? 9999 : selected ? 55 : 45, background: "transparent", backdropFilter: docOpacity <= 0.06 ? "none" : undefined, WebkitBackdropFilter: docOpacity <= 0.06 ? "none" : undefined, boxShadow: docOpacity <= 0.06 ? "none" : (isDraggingActive ? "0 20px 60px rgba(0,0,0,0.5)" : undefined), border: docOpacity <= 0.06 ? "none" : undefined }}
        onPointerDown={handlePointerDown}
        onClick={(e) => { e.stopPropagation(); if (!didDrag.current) setSelected(s => !s); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (!didDrag.current) { setSelected(false); onOpen(doc); } }}
        onContextMenu={handleContextMenu}
      >
        {docOpacity > 0.06 && (
          <div className="absolute inset-0 rounded-2xl" style={{
            background: (() => {
              if (!bgColor) return `rgba(22,22,26,${0.65 * docOpacity})`;
              if (bgColor.startsWith('#')) {
                const hex = bgColor.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return `rgba(${r},${g},${b},${docOpacity})`;
              }
              return `color-mix(in srgb, ${bgColor} ${Math.round(docOpacity * 100)}%, transparent)`;
            })(),
            backdropFilter: `blur(${Math.round(16 * docOpacity)}px)`,
            WebkitBackdropFilter: `blur(${Math.round(16 * docOpacity)}px)`,
            boxShadow: `0 4px 20px rgba(0,0,0,${0.22 * docOpacity})`,
            pointerEvents: "none" as const,
          }} />
        )}

        <div className="relative z-10 transition-transform group-hover:scale-110">
          {storedIconName && storedIconName.startsWith("http") ? (
            <img src={storedIconName} alt="" className="rounded-lg object-cover" style={{ width: iconSize, height: iconSize, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
          ) : lucideIcon ? (
            <lucideIcon.icon size={iconSize} style={{ color: resolvedIconColor, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} strokeWidth={1.5} />
          ) : isSpreadsheet ? (
            <Table size={iconSize} style={{ color: resolvedIconColor, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} strokeWidth={1.5} />
          ) : (
            <FileText size={iconSize} style={{ color: resolvedIconColor, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} strokeWidth={1.5} />
          )}
        </div>

        <div className="relative z-10">
          {renaming ? (
            <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
              className="w-full text-center bg-transparent border-b border-primary/40 outline-none text-foreground"
              style={{ fontSize: `${titleSize}px` }} autoFocus onClick={(e) => e.stopPropagation()} />
          ) : (
            <span className="font-medium text-foreground/80 text-center leading-tight truncate max-w-[80px] block group-hover:text-foreground transition-colors"
              style={{ fontSize: `${titleSize}px` }}>
              {doc.title}
            </span>
          )}
        </div>
      </div>

      {contextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[9999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ left: Math.min(contextMenu.x + 100, window.innerWidth - 540), top: Math.min(contextMenu.y, window.innerHeight - 420), width: 520 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-3">
              <p className="text-[10px] text-muted-foreground uppercase shrink-0 flex items-center gap-1"><Type size={10} /> Title</p>
              <input type="range" min="8" max="18" step="1" value={titleSize}
                onChange={(e) => { e.stopPropagation(); store.updateDesktopDocTitleSize(doc.id, parseInt(e.target.value)); }}
                onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{titleSize}px</span>
            </div>

            <div className="flex gap-0">
              {/* Column 1 — Actions */}
              <div className="flex-1 border-r border-border/30 py-2">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">Actions</p>
                <button onClick={() => { setContextMenu(null); onOpen(doc); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <FileText size={13} className="text-muted-foreground" /> Open
                </button>
                <button onClick={() => { setContextMenu(null); setRenameValue(doc.title); setRenaming(true); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <Pencil size={13} className="text-muted-foreground" /> Rename
                </button>
                <button onClick={handleDuplicate} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <Copy size={13} className="text-muted-foreground" /> Duplicate
                </button>
                <button onClick={handleShare} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                  <Share2 size={13} className="text-muted-foreground" /> Share
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button onClick={() => { setShowCalendar(!showCalendar); setShowMoveFolder(false); }} className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-secondary transition-colors ${showCalendar ? "text-primary bg-primary/5" : "text-foreground"}`}>
                  <CalendarPlus size={13} className="text-muted-foreground" /> Add to Calendar
                </button>
                {showCalendar && (
                  <div className="px-2 pb-2 pt-1" onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                    <Calendar mode="single" selected={calDate} onSelect={setCalDate}
                      className="rounded-lg border border-border/30 bg-secondary/20 text-[11px] p-1.5 [&_.rdp-day]:h-7 [&_.rdp-day]:w-7 [&_.rdp-head_cell]:w-7" />
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={12} className="text-muted-foreground" />
                      <input type="time" value={calTime} onChange={e => setCalTime(e.target.value)}
                        className="flex-1 text-[11px] bg-secondary/30 border border-border/30 rounded-md px-2 py-1 text-foreground outline-none"
                        onPointerDown={e => e.stopPropagation()} />
                    </div>
                    <button onClick={async () => {
                      if (!calDate) return;
                      const dateStr = calDate.toISOString().split("T")[0];
                      await createBlock({ title: doc.title, time: calTime, scheduled_date: dateStr, type: "deep", duration: "60m" });
                      toast.success("Added to calendar"); setShowCalendar(false); setContextMenu(null);
                    }} className="w-full mt-2 text-[11px] py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                      Schedule
                    </button>
                  </div>
                )}
                <button onClick={() => { setShowMoveFolder(!showMoveFolder); setShowCalendar(false); }} className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-secondary transition-colors ${showMoveFolder ? "text-primary bg-primary/5" : "text-foreground"}`}>
                  <FolderInput size={13} className="text-muted-foreground" /> Move to Folder
                </button>
                {showMoveFolder && (
                  <div className="px-2 pb-2 pt-1 max-h-[150px] overflow-y-auto space-y-0.5">
                    {rootFolders.length === 0 && <p className="text-[10px] text-muted-foreground px-2 py-1">No folders</p>}
                    {rootFolders.map(f => (
                      <button key={f.id} onClick={async () => {
                        await (supabase as any).from("documents").update({ folder_id: f.id }).eq("id", doc.id);
                        toast.success(`Moved to ${f.title}`); setContextMenu(null); if (onRefetch) onRefetch();
                      }} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-foreground hover:bg-secondary/60 rounded-md transition-colors">
                        <FolderInput size={11} className="text-muted-foreground" /> {f.title}
                      </button>
                    ))}
                  </div>
                )}
                <div className="h-px bg-border mx-2 my-1" />
                <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              {/* Column 2 — Icon */}
              <div className="flex-1 border-r border-border/30 py-3 overflow-hidden">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2">Icon</p>
                <div className="px-4 pb-2">
                  <div className="relative">
                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input type="text" value={iconSearch}
                      onChange={(e) => { e.stopPropagation(); setIconSearch(e.target.value); if (e.target.value) setShowAllIcons(true); }}
                      placeholder="Search icons..."
                      className="w-full h-6 pl-6 pr-2 rounded-md bg-secondary/40 border border-border/30 text-[10px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/20"
                      onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
                  </div>
                </div>
                <div className="px-4 pb-2">
                  <div className={`grid grid-cols-6 gap-1.5 ${showAllIcons ? 'max-h-[120px] overflow-y-auto' : ''}`}>
                    <button onClick={() => { store.updateDesktopDocCustomIcon(doc.id, ""); }}
                      className={`p-1.5 rounded-md transition-all hover:scale-110 ${!storedIconName ? "bg-primary/15" : "hover:bg-secondary/60"}`} title="Default">
                      {isSpreadsheet ? <Table size={13} className={!storedIconName ? "text-primary" : "text-muted-foreground"} /> : <FileText size={13} className={!storedIconName ? "text-primary" : "text-muted-foreground"} />}
                    </button>
                    {displayedIcons.map((item) => {
                      const IC = item.icon;
                      const isActive = storedIconName === item.name;
                      return (
                        <button key={item.name} onClick={() => store.updateDesktopDocCustomIcon(doc.id, item.name)}
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
                </div>
                <div className="px-4 pb-1">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-md transition-colors">
                    <Upload size={10} /> Upload
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadIcon} />
                </div>
                <div className="px-4 pb-2 pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center gap-1"><Palette size={10} /> Color</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {ICON_COLORS.map((c) => (
                      <button key={c.name} onClick={(e) => { e.stopPropagation(); store.updateDesktopDocIconColor(doc.id, c.value); }}
                        className={`rounded-full border-2 transition-all hover:scale-125 ${iconColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c.value, width: 16, height: 16 }} title={c.name} />
                    ))}
                    <button onClick={(e) => { e.stopPropagation(); store.updateDesktopDocIconColor(doc.id, ""); }}
                      className={`text-[8px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded ${!iconColor ? "bg-primary/10" : ""}`}>
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 3 — Background */}
              <div className="flex-1 py-3 min-w-0">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-3">Background</p>
                <div className="px-4 pb-4">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2.5">Color</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, ""); }}
                      className={`rounded-full border-2 transition-all hover:scale-125 ${!bgColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                      style={{ background: "rgba(22,22,26,0.65)", width: 18, height: 18 }} title="Default" />
                    {BG_COLORS.map((c) => (
                      <button key={c.name} onClick={(e) => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, c.value); }}
                        className={`rounded-full border-2 transition-all hover:scale-125 ${bgColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
                    ))}
                    <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                      style={{ width: 18, height: 18 }} title="Custom bg"
                      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <input type="color" value={bgColor && bgColor.startsWith('#') ? bgColor : "#16161a"}
                        onChange={(e) => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </label>
                  </div>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase w-10 shrink-0">Opacity</p>
                  <input type="range" min="0" max="1" step="0.05" value={docOpacity}
                    onChange={(e) => { e.stopPropagation(); store.updateDesktopDocOpacity(doc.id, parseFloat(e.target.value)); }}
                    onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(docOpacity * 100)}%</span>
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

export default memo(DesktopDocument);
