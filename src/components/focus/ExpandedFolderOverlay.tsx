import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, FileText, Table, X, Pencil, FolderPlus, Plus, Minus, Maximize2, Square,
  Trash2, ArrowLeft, ChevronDown,
  PanelRight, PanelLeft, Copy, Share2, CalendarPlus, FolderInput,
  Type, Upload, Palette, Search, Clock, BookCopy, Pin, PinOff, Sun, Moon,
  LayoutDashboard, FileEdit,
} from "lucide-react";
import { useResizable } from "@/hooks/useResizable";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useDocuments, DbDocument } from "@/hooks/useDocuments";
import { useTrash } from "@/context/TrashContext";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWindowManager, WindowLayout } from "@/context/WindowManagerContext";
import { useFocusStore } from "@/context/FocusContext";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import TemplateChooserModal from "./TemplateChooserModal";
import DocumentView from "@/components/documents/DocumentView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
const MODAL_MIN_W = 420;

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

// Full customization context menu for documents inside folder — mirrors DesktopDocument
interface DocContextMenuProps {
  doc: DbDocument;
  x: number;
  y: number;
  onOpen: () => void;
  onDelete: () => void;
  onClose: () => void;
}
const DocContextMenu: React.FC<DocContextMenuProps> = ({ doc, x, y, onOpen, onDelete, onClose }) => {
  const store = useFocusStore();
  const { folders, createBlock } = useFlux();
  const { user } = useAuth();

  const isSpreadsheet = doc.type === "spreadsheet";
  const titleSize = store.desktopDocTitleSizes[doc.id] ?? 10;
  const titleGap = store.desktopDocTitleGaps?.[doc.id] ?? 2;
  const bgColor = store.desktopDocBgColors[doc.id] ?? "";
  const iconColor = store.desktopDocIconColors[doc.id] ?? "";
  const storedIconName = store.desktopDocCustomIcons[doc.id] ?? "";
  const docOpacity = store.desktopDocOpacities[doc.id] ?? 1;

  const [showCalendar, setShowCalendar] = useState(false);
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());
  const [calTime, setCalTime] = useState("09:00");
  const [showMoveFolder, setShowMoveFolder] = useState(false);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const rootFolders = folders.filter(f => !f.parent_id);
  const filteredIcons = iconSearch.trim()
    ? FOLDER_ICONS.filter(i => i.name.toLowerCase().includes(iconSearch.toLowerCase()))
    : FOLDER_ICONS;
  const displayedIcons = showAllIcons ? filteredIcons : filteredIcons.slice(0, 12);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

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

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/?doc=${doc.id}`); toast.success("Share link copied"); }
    catch { toast.info("Could not copy link"); }
    onClose();
  };

  const handleDuplicate = async () => {
    const { error } = await supabase.from("documents").insert({ title: `${doc.title} (copy)`, type: doc.type, content: doc.content, user_id: doc.user_id, folder_id: doc.folder_id } as any);
    if (!error) toast.success("Document duplicated");
    onClose();
  };

  const handleRename = async (newTitle: string) => {
    if (newTitle.trim() && newTitle.trim() !== doc.title) {
      await supabase.from("documents").update({ title: newTitle.trim() } as any).eq("id", doc.id);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99997]" onClick={onClose} />
      <div
        ref={ref}
        className="fixed z-[99999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ left: Math.min(x + 100, window.innerWidth - 540), top: Math.min(y, window.innerHeight - 420), width: 520 }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Title size row */}
        <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground uppercase shrink-0 flex items-center gap-1"><Type size={10} /> Title</p>
          <input type="range" min="8" max="18" step="1" value={titleSize}
            onChange={e => store.updateDesktopDocTitleSize(doc.id, parseInt(e.target.value))}
            onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{titleSize}px</span>
        </div>
        {/* Spacing row */}
        <div className="px-4 py-2 border-b border-border/30 flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground uppercase shrink-0">Spacing</p>
          <div className="flex gap-1">
            {([{ label: "Tight", val: 0 }, { label: "Normal", val: 4 }, { label: "Wide", val: 10 }] as const).map(opt => (
              <button key={opt.label}
                onClick={e => { e.stopPropagation(); store.updateDesktopDocTitleGap(doc.id, opt.val); }}
                onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${titleGap === opt.val ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground border-border/30 hover:bg-secondary"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-0">
          {/* Column 1 — Actions */}
          <div className="flex-1 border-r border-border/30 py-2">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">Actions</p>
            <button onClick={() => { onOpen(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
              <FileText size={13} className="text-muted-foreground" /> Open
            </button>
            <button onClick={() => {
              const newTitle = prompt("Rename:", doc.title);
              if (newTitle) handleRename(newTitle);
              onClose();
            }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
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
                  toast.success("Added to calendar"); setShowCalendar(false); onClose();
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
                    toast.success(`Moved to ${f.title}`); onClose();
                  }} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-foreground hover:bg-secondary/60 rounded-md transition-colors">
                    <FolderInput size={11} className="text-muted-foreground" /> {f.title}
                  </button>
                ))}
              </div>
            )}
            <div className="h-px bg-border mx-2 my-1" />
            <button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors">
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
                  onChange={e => { setIconSearch(e.target.value); if (e.target.value) setShowAllIcons(true); }}
                  placeholder="Search icons..."
                  className="w-full h-6 pl-6 pr-2 rounded-md bg-secondary/40 border border-border/30 text-[10px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/20"
                  onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
              </div>
            </div>
            <div className="px-4 pb-2">
              <div className={`grid grid-cols-6 gap-1.5 ${showAllIcons ? 'max-h-[120px] overflow-y-auto' : ''}`}>
                <button onClick={() => store.updateDesktopDocCustomIcon(doc.id, "")}
                  className={`p-1.5 rounded-md transition-all hover:scale-110 ${!storedIconName ? "bg-primary/15" : "hover:bg-secondary/60"}`} title="Default">
                  {isSpreadsheet ? <Table size={13} className={!storedIconName ? "text-primary" : "text-muted-foreground"} /> : <FileText size={13} className={!storedIconName ? "text-primary" : "text-muted-foreground"} />}
                </button>
                {displayedIcons.map(item => {
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
                {ICON_COLORS.map(c => (
                  <button key={c.name} onClick={e => { e.stopPropagation(); store.updateDesktopDocIconColor(doc.id, c.value); }}
                    className={`rounded-full border-2 transition-all hover:scale-125 ${iconColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value, width: 16, height: 16 }} title={c.name} />
                ))}
                <button onClick={e => { e.stopPropagation(); store.updateDesktopDocIconColor(doc.id, ""); }}
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
                <button onClick={e => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, ""); }}
                  className={`rounded-full border-2 transition-all hover:scale-125 ${!bgColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                  style={{ background: "rgba(22,22,26,0.65)", width: 18, height: 18 }} title="Default" />
                {BG_COLORS.map(c => (
                  <button key={c.name} onClick={e => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, c.value); }}
                    className={`rounded-full border-2 transition-all hover:scale-125 ${bgColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
                ))}
                <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                  style={{ width: 18, height: 18 }} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                  <input type="color" value={bgColor?.startsWith('#') ? bgColor : "#16161a"}
                    onChange={e => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, e.target.value); }}
                    onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
              </div>
            </div>
            <div className="px-4 py-2 flex items-center gap-2 overflow-hidden">
              <p className="text-[10px] text-muted-foreground uppercase w-10 shrink-0">Opacity</p>
              <input type="range" min="0" max="1" step="0.05" value={docOpacity}
                onChange={e => { e.stopPropagation(); store.updateDesktopDocOpacity(doc.id, parseFloat(e.target.value)); }}
                onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(docOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

// Full customization context menu for subfolders inside overlay — mirrors DesktopFolder
const SUBFOLDER_BG_COLORS = [
  { name: "Blue", value: "hsl(217 91% 60%)" },
  { name: "Violet", value: "hsl(270 76% 65%)" },
  { name: "Pink", value: "hsl(330 80% 65%)" },
  { name: "Green", value: "hsl(150 60% 45%)" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Teal", value: "hsl(175 60% 42%)" },
  { name: "Red", value: "hsl(0 72% 55%)" },
  { name: "Amber", value: "hsl(45 93% 50%)" },
];

interface SubCtxMenuProps {
  sub: FolderNode;
  x: number;
  y: number;
  onOpen: () => void;
  onClose: () => void;
}
const SubfolderContextMenu: React.FC<SubCtxMenuProps> = ({ sub, x, y, onOpen, onClose }) => {
  const { updateFolder, removeFolder, getAllFoldersFlat, folderTree, createBlock } = useFlux();
  const focusStore = useFocusStore();
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const titleSize = focusStore.desktopFolderTitleSizes?.[sub.id] ?? 11;
  const titleGap = focusStore.desktopFolderTitleGaps?.[sub.id] ?? 2;
  const iconFillOp = focusStore.desktopFolderIconFillOpacities?.[sub.id] ?? 0.75;
  const iconStrokeOp = focusStore.desktopFolderIconStrokeOpacities?.[sub.id] ?? 1;
  const folderBgColor = focusStore.desktopFolderBgColors?.[sub.id] ?? "";
  const folderOpacity = focusStore.desktopFolderOpacities?.[sub.id] ?? 1;
  const customIconUrl = focusStore.desktopFolderCustomIcons?.[sub.id] ?? "";

  const [showAllIcons, setShowAllIcons] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calTime, setCalTime] = useState("09:00");
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(sub.title);

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return FOLDER_ICONS;
    return FOLDER_ICONS.filter(i => i.name.toLowerCase().includes(iconSearch.toLowerCase()));
  }, [iconSearch]);
  const displayedIcons = showAllIcons ? filteredIcons : filteredIcons.slice(0, 12);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${sub.id}.${ext}`;
    const { error } = await supabase.storage.from("folder-icons").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("folder-icons").getPublicUrl(path);
    focusStore.updateDesktopFolderCustomIcon(sub.id, data.publicUrl);
    toast.success("Custom icon uploaded");
  };

  const commitRename = () => {
    if (renameVal.trim() && renameVal.trim() !== sub.title) updateFolder(sub.id, { title: renameVal.trim() });
    setRenaming(false); onClose();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99997]" onClick={onClose} />
      <div
        ref={ref}
        className="fixed z-[99999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ left: Math.min(x + 100, window.innerWidth - 560), top: Math.min(y, window.innerHeight - 520), width: 540 }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Title size */}
        <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground uppercase shrink-0 flex items-center gap-1"><Type size={10} /> Title</p>
          <input type="range" min="9" max="20" step="1" value={titleSize}
            onChange={e => { e.stopPropagation(); focusStore.updateDesktopFolderTitleSize(sub.id, parseInt(e.target.value)); }}
            onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{titleSize}px</span>
        </div>
        {/* Spacing */}
        <div className="px-4 py-2 border-b border-border/30 flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground uppercase shrink-0">Spacing</p>
          <div className="flex gap-1">
            {([{ label: "Tight", val: 0 }, { label: "Normal", val: 4 }, { label: "Wide", val: 10 }] as const).map(opt => (
              <button key={opt.label} onClick={e => { e.stopPropagation(); focusStore.updateDesktopFolderTitleGap(sub.id, opt.val); }}
                onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${titleGap === opt.val ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground border-border/30 hover:bg-secondary"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-0">
          {/* Column 1 — Actions */}
          <div className="flex-1 border-r border-border/30 py-2">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">Actions</p>
            <button onClick={() => { onOpen(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
              <FileEdit size={13} className="text-muted-foreground" /> Open
            </button>
            {renaming ? (
              <div className="px-3 py-1">
                <input value={renameVal} onChange={e => setRenameVal(e.target.value)}
                  onBlur={commitRename} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setRenaming(false); } }}
                  autoFocus className="w-full text-[12px] bg-secondary rounded px-2 py-1 outline-none border border-primary/30"
                  onPointerDown={e => e.stopPropagation()} />
              </div>
            ) : (
              <button onClick={() => setRenaming(true)} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
                <Pencil size={13} className="text-muted-foreground" /> Rename
              </button>
            )}
            <button onClick={async () => {
              const today = new Date().toISOString().split("T")[0];
              await createBlock({ title: sub.title, time: calTime, duration: "60m", type: "folder", scheduled_date: today });
              toast.success(`Added to calendar`); onClose();
            }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors">
              <CalendarPlus size={13} className="text-muted-foreground" /> Add to Calendar
            </button>
            <div className="h-px bg-border mx-2 my-1" />
            <button onClick={async () => { await removeFolder(sub.id); toast.success("Folder deleted"); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors">
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
                  onChange={e => { setIconSearch(e.target.value); if (e.target.value) setShowAllIcons(true); }}
                  placeholder="Search icons..."
                  className="w-full h-6 pl-6 pr-2 rounded-md bg-secondary/40 border border-border/30 text-[10px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/20"
                  onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
              </div>
            </div>
            <div className="px-4 pb-2">
              <div className={`grid grid-cols-6 gap-1.5 ${showAllIcons ? 'max-h-[140px] overflow-y-auto' : ''}`}>
                {displayedIcons.map(item => {
                  const IC = item.icon;
                  const isActive = sub.icon === item.name && !customIconUrl;
                  return (
                    <button key={item.name} onClick={() => { updateFolder(sub.id, { icon: item.name }); focusStore.updateDesktopFolderCustomIcon(sub.id, ""); }}
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
            <div className="px-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase mb-2.5 flex items-center gap-1"><Palette size={10} /> Color</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {SUBFOLDER_BG_COLORS.map(c => (
                  <button key={c.name} onClick={e => { e.stopPropagation(); updateFolder(sub.id, { color: c.value }); }}
                    className={`rounded-full border-2 transition-all hover:scale-125 ${sub.color === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
                ))}
                <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                  style={{ width: 18, height: 18 }} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                  <input type="color" value={sub.color?.startsWith('#') ? sub.color : "#8b5cf6"}
                    onChange={e => { e.stopPropagation(); updateFolder(sub.id, { color: e.target.value }); }}
                    onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
              </div>
            </div>
            <div className="px-4 py-1.5 flex items-center gap-2 overflow-hidden">
              <p className="text-[10px] text-muted-foreground uppercase w-8 shrink-0">Fill</p>
              <input type="range" min="0" max="1" step="0.05" value={iconFillOp}
                onChange={e => { e.stopPropagation(); focusStore.updateDesktopFolderIconFillOpacity(sub.id, parseFloat(e.target.value)); }}
                onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(iconFillOp * 100)}%</span>
            </div>
            <div className="px-4 py-1.5 flex items-center gap-2 overflow-hidden">
              <p className="text-[10px] text-muted-foreground uppercase w-8 shrink-0">Stroke</p>
              <input type="range" min="0" max="1" step="0.05" value={iconStrokeOp}
                onChange={e => { e.stopPropagation(); focusStore.updateDesktopFolderIconStrokeOpacity(sub.id, parseFloat(e.target.value)); }}
                onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
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
                <button onClick={e => { e.stopPropagation(); focusStore.updateDesktopFolderBgColor(sub.id, ""); }}
                  className={`rounded-full border-2 transition-all hover:scale-125 ${!folderBgColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                  style={{ background: "rgba(22,22,26,0.65)", width: 18, height: 18 }} title="Default" />
                {SUBFOLDER_BG_COLORS.map(c => (
                  <button key={c.name} onClick={e => { e.stopPropagation(); focusStore.updateDesktopFolderBgColor(sub.id, c.value); }}
                    className={`rounded-full border-2 transition-all hover:scale-125 ${folderBgColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
                ))}
              </div>
            </div>
            <div className="px-4 py-2 flex items-center gap-2 overflow-hidden">
              <p className="text-[10px] text-muted-foreground uppercase w-10 shrink-0">Opacity</p>
              <input type="range" min="0" max="1" step="0.05" value={folderOpacity}
                onChange={e => { e.stopPropagation(); focusStore.updateDesktopFolderOpacity(sub.id, parseFloat(e.target.value)); }}
                onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(folderOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

const ExpandedFolderOverlay = ({
  folderId: initialFolderId,
  onClose,
  onOpenDocument,
  onMoveDocToDesktop,
  onMoveFolderToDesktop,
}: ExpandedFolderOverlayProps) => {
  const { findFolderNode, updateFolder, createFolder, removeFolder, moveFolder } = useFlux();
  const { moveToTrash } = useTrash();
  const { user } = useAuth();
  const { openWindow } = useWindowManager();
  const store = useFocusStore();

  // ── Folder navigation (supports drilling into subfolders) ──────────────────
  const [folderStack, setFolderStack] = useState<string[]>([initialFolderId]);
  const folderId = folderStack[folderStack.length - 1];
  const canGoBack = folderStack.length > 1;

  const navigateInto = useCallback((subId: string) => {
    setFolderStack(prev => [...prev, subId]);
  }, []);

  const navigateBack = useCallback(() => {
    setFolderStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [draggingOutId, setDraggingOutId] = useState<string | null>(null);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [docCtxMenu, setDocCtxMenu] = useState<{ doc: DbDocument; x: number; y: number } | null>(null);
  const [subCtxMenu, setSubCtxMenu] = useState<{ sub: FolderNode; x: number; y: number } | null>(null);
  const [openDocInOverlay, setOpenDocInOverlay] = useState<DbDocument | null>(null);
  // Subfolder drop targets inside overlay
  const subfolderElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [overlayDropTarget, setOverlayDropTarget] = useState<string | null>(null);
  const overlayDragPosRef = useRef<{ x: number; y: number } | null>(null);

  // ── Per-folder light/dark mode (individual, persisted in localStorage) ─────
  const [lightMode, setLightMode] = useState(() => {
    try { return localStorage.getItem(`flux_folder_light_${initialFolderId}`) === "1"; } catch { return false; }
  });

  const toggleLightMode = useCallback(() => {
    setLightMode(prev => {
      const next = !prev;
      try { localStorage.setItem(`flux_folder_light_${folderId}`, next ? "1" : "0"); } catch {}
      return next;
    });
  }, [folderId]);

  // Reset rename state when navigating to a different folder
  useEffect(() => {
    setRenaming(false);
    setRenameValue("");
    setOpenDocInOverlay(null);
  }, [folderId]);

  // Modal drag/resize state
  const [modalRect, setModalRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = useRef<{ startMx: number; startMy: number; startPx: number; startPy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const preFullscreenRect = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const getCenter = useCallback(() => ({
    x: Math.round(window.innerWidth / 2 - MODAL_W / 2),
    y: Math.round(window.innerHeight / 2 - MODAL_MIN_H / 2),
    w: MODAL_W,
    h: Math.round(window.innerHeight * 0.6),
  }), []);

  // Set centered position on mount
  useEffect(() => {
    setModalRect(getCenter());
  }, [getCenter]);

  const { onPointerDownResize } = useResizable({
    pos: modalRect ?? getCenter(),
    minW: MODAL_MIN_W,
    minH: MODAL_MIN_H,
    onUpdate: (updates) => {
      if (isFullscreen) return;
      setModalRect(prev => ({ ...(prev ?? getCenter()), ...updates }));
    },
    enabled: !isFullscreen,
  });

  // Alias pos for code compatibility
  const pos = modalRect ? { x: modalRect.x, y: modalRect.y } : null;

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
    const maxX = window.innerWidth - (modalRect?.w ?? MODAL_W) - 16;
    const maxY = window.innerHeight - 80;
    setModalRect(prev => prev ? { ...prev, x: Math.max(8, Math.min(nx, maxX)), y: Math.max(8, Math.min(ny, maxY)) } : prev);
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
      size: { w: modalRect?.w ?? MODAL_W, h: modalRect?.h ?? 560 },
    });
    onClose();
  }, [folder, folderId, openWindow, pos, getCenter, onClose, modalRect]);

  // Minimize directly to toolbar (no popup, just close the overlay and open minimized)
  const handleMinimize = useCallback(() => {
    if (!folder) return;
    openWindow({
      type: "widget",
      contentId: `folder-${initialFolderId}`,
      title: folder.title,
      layout: "floating",
      minimized: true,
      position: pos ?? getCenter(),
      size: { w: modalRect?.w ?? MODAL_W, h: modalRect?.h ?? 560 },
    });
    onClose();
  }, [folder, initialFolderId, openWindow, pos, getCenter, onClose, modalRect]);

  // Toggle fullscreen for the overlay itself
  const handleFullscreen = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
      if (preFullscreenRect.current) setModalRect(preFullscreenRect.current);
    } else {
      preFullscreenRect.current = modalRect ?? getCenter();
      setIsFullscreen(true);
    }
  }, [isFullscreen, modalRect, getCenter]);

  const handleDeleteDoc = useCallback(async (doc: DbDocument) => {
    await removeDocument(doc.id);
    refetch();
    toast.success(`"${doc.title}" deleted`);
  }, [removeDocument, refetch]);

  if (!folder) return null;

  const customIcon = folder.icon ? FOLDER_ICONS.find(i => i.name === folder.icon) : null;
  const IconComp = customIcon ? customIcon.icon : Folder;
  const iconColor = folder.color || "hsl(var(--muted-foreground))";

  const rect = modalRect ?? getCenter();
  // Modal style: fullscreen or positioned
  const modalStyle: React.CSSProperties = isFullscreen
    ? { position: "fixed", inset: 0, width: "100vw", height: "100vh", maxHeight: "100vh", zIndex: 8001, borderRadius: 0 }
    : { position: "fixed", top: rect.y, left: rect.x, width: rect.w, height: rect.h, zIndex: 8001 };

  // Resize handle cursor mapping
  const RESIZE_CURSORS: Record<string, string> = {
    n:"ns-resize", s:"ns-resize", e:"ew-resize", w:"ew-resize",
    ne:"nesw-resize", nw:"nwse-resize", se:"nwse-resize", sw:"nesw-resize",
  };

  // Light mode derived styles
  const lm = lightMode;
  const overlayBg = lm ? "rgba(250,249,255,0.97)" : "rgba(14, 11, 32, 0.94)";
  const overlayBorder = lm ? "1px solid rgba(0,0,0,0.1)" : (isFullscreen ? "none" : "1px solid rgba(255,255,255,0.13)");
  const headerBorder = lm ? "border-b border-black/8" : "";
  const titleColor = lm ? "rgba(20,10,40,0.92)" : "rgba(255,255,255,0.92)";
  const subtleColor = lm ? "rgba(60,40,80,0.45)" : "rgba(255,255,255,0.3)";
  const hintColor = lm ? "rgba(60,40,80,0.35)" : "rgba(255,255,255,0.18)";
  const itemNameColor = lm ? "rgba(30,15,50,0.75)" : "rgba(255,255,255,0.7)";
  const emptyColor = lm ? "rgba(60,40,80,0.3)" : "rgba(255,255,255,0.2)";
  const footerBorder = lm ? "border-t border-black/8" : "border-top: 1px solid rgba(255,255,255,0.06)";
  const backdrp = lm ? "blur(56px)" : "blur(56px)";

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[8000]"
        style={{ background: lm ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.28)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Folder window */}
      <motion.div
        key={`expanded-folder-${initialFolderId}`}
        initial={{ opacity: 0, scale: 0.93, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 8 }}
        transition={{ type: "spring", bounce: 0.12, duration: 0.32 }}
        className="flex flex-col overflow-hidden"
        style={{
          ...modalStyle,
          background: overlayBg,
          backdropFilter: backdrp,
          WebkitBackdropFilter: backdrp,
          border: overlayBorder,
          borderRadius: isFullscreen ? 0 : 24,
          boxShadow: isFullscreen ? "none" : lm
            ? "0 40px 120px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)"
            : "0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
          transition: "background 0.25s ease, box-shadow 0.25s ease",
        }}
        onClick={e => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Header — drag handle */}
        <div
          className={`flex items-center gap-3 px-5 pt-4 pb-3.5 select-none ${headerBorder}`}
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

          {/* Layout dropdown — identical to WindowFrame's FLOAT pill */}
          <div className="ml-1" onPointerDown={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ background: "hsl(142 71% 45%)", color: "rgba(0,0,0,0.75)" }}
                  title="Change layout"
                >
                  float
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} style={{ zIndex: 10999 }} className="min-w-[160px]">
                <DropdownMenuItem onClick={() => openAsWindow("floating")} className="flex items-center gap-2.5 text-xs">
                  <Square size={13} /> Float
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAsWindow("fullscreen")} className="flex items-center gap-2.5 text-xs">
                  <Maximize2 size={13} /> Full Screen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAsWindow("split-left")} className="flex items-center gap-2.5 text-xs">
                  <PanelLeft size={13} /> Split Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAsWindow("split-right")} className="flex items-center gap-2.5 text-xs">
                  <PanelRight size={13} /> Split Right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMinimize} className="flex items-center gap-2.5 text-xs">
                  <Minus size={13} /> Minimize <span className="ml-auto text-foreground/30">⌘M</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClose} className="flex items-center gap-2.5 text-xs text-destructive focus:text-destructive">
                  <X size={13} /> Close <span className="ml-auto text-foreground/30">⌘W</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Back button when navigating subfolder or when doc is open */}
          {(canGoBack || openDocInOverlay) && (
            <button
              onClick={() => {
                if (openDocInOverlay) { setOpenDocInOverlay(null); }
                else { navigateBack(); }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all hover:opacity-100 opacity-70"
              style={{ background: lm ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)", color: lm ? "rgba(30,15,50,0.7)" : "rgba(255,255,255,0.75)", border: `1px solid ${lm ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)"}` }}
              title="Back"
              onPointerDown={e => e.stopPropagation()}
            >
              <ArrowLeft size={8} /> Back
            </button>
          )}

          {/* Light/dark mode toggle */}
          <button
            onClick={toggleLightMode}
            className="p-1.5 rounded-lg transition-colors ml-1"
            style={{ color: lm ? "rgba(30,15,50,0.55)" : "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = lm ? "rgba(30,15,50,0.85)" : "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = lm ? "rgba(30,15,50,0.55)" : "rgba(255,255,255,0.4)"; }}
            title={lm ? "Switch to dark mode" : "Switch to light mode"}
            onPointerDown={e => e.stopPropagation()}
          >
            {lm ? <Moon size={14} /> : <Sun size={14} />}
          </button>

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
              style={{ color: titleColor, borderColor: "rgba(99,102,241,0.6)" }}
              autoFocus
            />
          ) : (
            <h2
              className="flex-1 text-[19px] font-semibold cursor-pointer select-none truncate"
              style={{ color: titleColor }}
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
              style={{ color: subtleColor }}
              onMouseEnter={e => (e.currentTarget.style.color = lm ? "rgba(30,15,50,0.8)" : "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = subtleColor)}
              title="Rename folder"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setShowTemplateChooser(true)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: subtleColor }}
              onMouseEnter={e => (e.currentTarget.style.color = lm ? "rgba(30,15,50,0.8)" : "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = subtleColor)}
              title="New document"
            >
              <FileText size={13} />
            </button>
            <button
              onClick={async () => {
                await createFolder({ parent_id: folderId, title: "New Folder", type: "folder" });
              }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: subtleColor }}
              onMouseEnter={e => (e.currentTarget.style.color = lm ? "rgba(30,15,50,0.8)" : "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = subtleColor)}
              title="New subfolder"
            >
              <FolderPlus size={13} />
            </button>
          </div>
        </div>

        {/* Content: either folder grid or inline document view */}
        {openDocInOverlay ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <DocumentView
              document={openDocInOverlay}
              onBack={() => setOpenDocInOverlay(null)}
              onUpdate={(id, updates) => {
                updateDocument(id, updates);
                setOpenDocInOverlay(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
              }}
              onDelete={(id) => {
                removeDocument(id);
                setOpenDocInOverlay(null);
              }}
              lightMode={(() => { try { return localStorage.getItem(`flux_doc_light_${openDocInOverlay.id}`) === "1"; } catch { return false; } })()}
              onToggleLightMode={() => {
                const cur = (() => { try { return localStorage.getItem(`flux_doc_light_${openDocInOverlay.id}`) === "1"; } catch { return false; } })();
                try { localStorage.setItem(`flux_doc_light_${openDocInOverlay.id}`, (!cur) ? "1" : "0"); } catch {}
                // Force re-render by toggling a dummy state
                setOpenDocInOverlay(prev => prev ? { ...prev } : null);
              }}
            />
          </div>
        ) : (
        <>
        {/* Drag-out hint */}
        <div className="px-6 pb-1.5">
          <p className="text-[10px]" style={{ color: hintColor }}>
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
            <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: emptyColor }}>
              <Folder size={40} style={{ color: iconColor, opacity: 0.4 }} />
              <p className="text-sm">This folder is empty</p>
              <button
                onClick={() => setShowTemplateChooser(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: lm ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)", color: lm ? "rgba(30,15,50,0.5)" : "rgba(255,255,255,0.5)", border: `1px solid ${lm ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)"}` }}
              >
                <Plus size={14} /> New Document
              </button>
            </div>
          ) : (
            <div className="grid gap-4 auto-rows-max" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
              {/* Subfolders */}
              {folder.children.map(sub => {
                const subIcon = sub.icon ? FOLDER_ICONS.find(i => i.name === sub.icon) : null;
                const SubIcon = subIcon ? subIcon.icon : (overlayDropTarget === sub.id ? FolderOpen : Folder);
                const subColor = sub.color || "hsl(var(--muted-foreground))";
                const isTarget = overlayDropTarget === sub.id;
                return (
                  <motion.div
                    key={sub.id}
                    ref={(el: HTMLDivElement | null) => { subfolderElRefs.current[sub.id] = el; }}
                    drag
                    dragMomentum={false}
                    dragElastic={0.12}
                    whileDrag={{ scale: 1.08, zIndex: 9999, opacity: 0.9, cursor: "grabbing" }}
                    onDragEnd={(e, info) => handleSubfolderDragEnd(e as any, info, sub)}
                    className={`flex flex-col items-center gap-2 cursor-pointer group transition-all ${isTarget ? "scale-105" : ""}`}
                    onDoubleClick={() => navigateInto(sub.id)}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSubCtxMenu({ sub, x: e.clientX, y: e.clientY }); }}
                    style={{ opacity: draggingOutId === sub.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-all"
                      style={{
                        width: 64, height: 64,
                        background: isTarget ? `${subColor}28` : (lm ? `${subColor}20` : `${subColor}18`),
                        border: isTarget ? `2px solid ${subColor}80` : `1px solid ${lm ? subColor + "30" : subColor + "28"}`,
                        boxShadow: isTarget ? `0 0 18px ${subColor}40` : undefined
                      }}
                    >
                      <SubIcon size={28} style={{ color: subColor }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2" style={{ color: itemNameColor }}>
                      {sub.title}
                    </span>
                  </motion.div>
                );
              })}

              {/* Documents — uses same icon/color as desktop (FocusStore) */}
              {documents.map(doc => {
                const isSheet = doc.type === "spreadsheet";
                const storedIconName = store.desktopDocCustomIcons?.[doc.id] ?? "";
                const customIconColor = store.desktopDocIconColors?.[doc.id] ?? "";
                const customBgColor = store.desktopDocBgColors?.[doc.id] ?? "";
                const docOpacity = store.desktopDocOpacities?.[doc.id] ?? 1;
                const lucideIcon = storedIconName && !storedIconName.startsWith("http")
                  ? FOLDER_ICONS.find(i => i.name === storedIconName)
                  : null;
                const defaultColor = isSheet ? "rgba(52,211,153,0.85)" : "rgba(147,197,253,0.85)";
                const resolvedColor = customIconColor || defaultColor;
                const defaultBg = isSheet ? "rgba(52,211,153,0.1)" : "rgba(147,197,253,0.1)";
                const resolvedBg = customBgColor
                  ? (customBgColor.startsWith('#')
                    ? (() => { const hex = customBgColor.replace('#',''); const r=parseInt(hex.substring(0,2),16); const g=parseInt(hex.substring(2,4),16); const b=parseInt(hex.substring(4,6),16); return `rgba(${r},${g},${b},${docOpacity})`; })()
                    : `color-mix(in srgb, ${customBgColor} ${Math.round(docOpacity*100)}%, transparent)`)
                  : (lm ? (isSheet ? "rgba(52,211,153,0.15)" : "rgba(99,102,241,0.1)") : defaultBg);
                return (
                  <motion.div
                    key={doc.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0.12}
                    whileDrag={{ scale: 1.08, zIndex: 9999, opacity: 0.9, cursor: "grabbing" }}
                    onDrag={(e, info) => {
                      // Track position for subfolder drop detection
                      overlayDragPosRef.current = info.point;
                      const hit = Object.entries(subfolderElRefs.current).find(([, el]) => {
                        if (!el) return false;
                        const r = el.getBoundingClientRect();
                        return info.point.x > r.left && info.point.x < r.right && info.point.y > r.top && info.point.y < r.bottom;
                      });
                      setOverlayDropTarget(hit ? hit[0] : null);
                    }}
                    onDragEnd={(e, info) => {
                      // Check if dropped on a subfolder
                      const hit = Object.entries(subfolderElRefs.current).find(([, el]) => {
                        if (!el) return false;
                        const r = el.getBoundingClientRect();
                        return info.point.x > r.left && info.point.x < r.right && info.point.y > r.top && info.point.y < r.bottom;
                      });
                      setOverlayDropTarget(null);
                      if (hit) {
                        const targetSubId = hit[0];
                        if (user) {
                          (supabase as any).from("documents").update({ folder_id: targetSubId }).eq("id", doc.id).then(() => {
                            refetch(); toast.success("Moved into subfolder");
                          });
                        } else {
                          try {
                            const LS_KEY = "flux_local_documents";
                            const raw = localStorage.getItem(LS_KEY);
                            const docs = raw ? JSON.parse(raw) : [];
                            localStorage.setItem(LS_KEY, JSON.stringify(docs.map((d: any) => d.id === doc.id ? { ...d, folder_id: targetSubId } : d)));
                            refetch();
                            toast.success("Moved into subfolder");
                          } catch {}
                        }
                      } else {
                        handleDocDragEnd(e as any, info, doc);
                      }
                    }}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onDoubleClick={() => setOpenDocInOverlay(doc)}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setDocCtxMenu({ doc, x: e.clientX, y: e.clientY }); }}
                    style={{ opacity: draggingOutId === doc.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                      style={{ width: 64, height: 64, background: resolvedBg }}
                    >
                      {storedIconName && storedIconName.startsWith("http") ? (
                        <img src={storedIconName} alt="" className="rounded-lg object-cover" style={{ width: 32, height: 32 }} />
                      ) : lucideIcon ? (
                        <lucideIcon.icon size={28} style={{ color: resolvedColor }} strokeWidth={1.5} />
                      ) : isSheet ? (
                        <Table size={28} style={{ color: resolvedColor }} strokeWidth={1.5} />
                      ) : (
                        <FileText size={28} style={{ color: resolvedColor }} strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2" style={{ color: itemNameColor }}>
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
          style={{ borderTop: lm ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.06)", borderRadius: isFullscreen ? 0 : "0 0 24px 24px" }}
        >
          <span className="text-[10px]" style={{ color: hintColor }}>
            {folder.children.length + documents.length} item{folder.children.length + documents.length !== 1 ? "s" : ""}
          </span>
        </div>
        </>
        )}

        {/* Resize handles — corners + edges */}
        {!isFullscreen && ([
          { dir: "se" as const, style: { bottom: 0, right: 0, width: 18, height: 18, cursor: RESIZE_CURSORS.se } },
          { dir: "sw" as const, style: { bottom: 0, left: 0, width: 18, height: 18, cursor: RESIZE_CURSORS.sw } },
          { dir: "ne" as const, style: { top: 0, right: 0, width: 18, height: 18, cursor: RESIZE_CURSORS.ne } },
          { dir: "nw" as const, style: { top: 0, left: 0, width: 18, height: 18, cursor: RESIZE_CURSORS.nw } },
          { dir: "e" as const, style: { top: "50%", right: 0, width: 8, height: 40, transform: "translateY(-50%)", cursor: RESIZE_CURSORS.e } },
          { dir: "w" as const, style: { top: "50%", left: 0, width: 8, height: 40, transform: "translateY(-50%)", cursor: RESIZE_CURSORS.w } },
          { dir: "s" as const, style: { bottom: 0, left: "50%", width: 40, height: 8, transform: "translateX(-50%)", cursor: RESIZE_CURSORS.s } },
          { dir: "n" as const, style: { top: 0, left: "50%", width: 40, height: 8, transform: "translateX(-50%)", cursor: RESIZE_CURSORS.n } },
        ]).map(({ dir, style }) => (
          <div
            key={dir}
            className="absolute z-[9999]"
            style={{ ...style, position: "absolute" }}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDownResize(e, dir); }}
          />
        ))}
      </motion.div>

      {/* Document right-click context menu */}
      <AnimatePresence>
        {docCtxMenu && (
          <DocContextMenu
            doc={docCtxMenu.doc}
            x={docCtxMenu.x}
            y={docCtxMenu.y}
            onOpen={() => { setDocCtxMenu(null); setOpenDocInOverlay(docCtxMenu.doc); }}
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
