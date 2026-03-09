import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, FileText, Table, X, Pencil, FolderPlus, Plus, Minus, Maximize2, Square,
  Trash2, ExternalLink, ArrowLeft, ChevronDown,
  PanelRight, PanelLeft, Monitor, Copy, Share2, CalendarPlus, FolderInput,
  Type, Upload, Palette, Search, Clock, BookCopy, Pin, PinOff,
} from "lucide-react";
import { useResizable } from "@/hooks/useResizable";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useDocuments, DbDocument } from "@/hooks/useDocuments";
import { useTrash } from "@/context/TrashContext";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWindowManager } from "@/context/WindowManagerContext";
import { useFocusStore } from "@/context/FocusContext";
import { Calendar } from "@/components/ui/calendar";
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
  const store = useFocusStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [draggingOutId, setDraggingOutId] = useState<string | null>(null);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [docCtxMenu, setDocCtxMenu] = useState<{ doc: DbDocument; x: number; y: number } | null>(null);
  const [openDocInOverlay, setOpenDocInOverlay] = useState<DbDocument | null>(null);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  // Subfolder drop targets inside overlay
  const subfolderElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [overlayDropTarget, setOverlayDropTarget] = useState<string | null>(null);
  const overlayDragPosRef = useRef<{ x: number; y: number } | null>(null);

  // Close layout menu when clicking outside
  useEffect(() => {
    if (!showLayoutMenu) return;
    const handler = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showLayoutMenu]);




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

          {/* Single "Float" dropdown — matching document controls */}
          <div className="relative ml-1" ref={layoutMenuRef} onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={() => setShowLayoutMenu(v => !v)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide transition-all hover:opacity-100 opacity-80"
              style={{ background: "hsl(142 71% 45%)", color: "rgba(0,0,0,0.75)" }}
              title="Layout options"
            >
              <Square size={7} /> float <ChevronDown size={7} />
            </button>
            <AnimatePresence>
              {showLayoutMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-[99999] rounded-xl overflow-hidden flex flex-col py-1"
                  style={{ minWidth: 160, background: "rgba(10,6,28,0.98)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }}
                >
                  {[
                    { layout: "floating" as const, icon: <Monitor size={11} />, label: "Float (drag)" },
                    { layout: "split-left" as const, icon: <PanelLeft size={11} />, label: "Side left" },
                    { layout: "split-right" as const, icon: <PanelRight size={11} />, label: "Side right" },
                    { layout: "fullscreen" as const, icon: <Maximize2 size={11} />, label: "Fullscreen" },
                  ].map(opt => (
                    <button
                      key={opt.layout}
                      onClick={() => { openAsWindow(opt.layout); setShowLayoutMenu(false); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-colors text-left w-full"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span className="opacity-70">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Back button when doc is open inside overlay */}
          {openDocInOverlay && (
            <button
              onClick={() => setOpenDocInOverlay(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all hover:opacity-100 opacity-70"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)" }}
              title="Back to folder"
              onPointerDown={e => e.stopPropagation()}
            >
              <ArrowLeft size={8} /> Back
            </button>
          )}

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
            />
          </div>
        ) : (
        <>
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
                    onDoubleClick={() => onClose()}
                    style={{ opacity: draggingOutId === sub.id ? 0.3 : 1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl transition-all"
                      style={{ width: 64, height: 64, background: isTarget ? `${subColor}28` : `${subColor}18`, border: isTarget ? `2px solid ${subColor}80` : `1px solid ${subColor}28`, boxShadow: isTarget ? `0 0 18px ${subColor}40` : undefined }}
                    >
                      <SubIcon size={28} style={{ color: subColor }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2" style={{ color: "rgba(255,255,255,0.7)" }}>
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
                  : defaultBg;
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
        </>
        )}
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
