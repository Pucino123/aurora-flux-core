/**
 * FolderWindowContent — renders folder contents inside a WindowFrame.
 * Same grid/list as ExpandedFolderOverlay but without the backdrop/portal shell.
 */
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, FileText, Table, FolderPlus, Plus, Trash2,
  Copy, Share2, CalendarPlus, FolderInput, Type, Upload, Palette,
  Search, Clock, ChevronDown, Pencil,
} from "lucide-react";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { useDocuments, DbDocument } from "@/hooks/useDocuments";
import { useTrash } from "@/context/TrashContext";
import { useFocusStore } from "@/context/FocusContext";
import { useAuth } from "@/hooks/useAuth";
import { FOLDER_ICONS } from "@/components/CreateFolderModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TemplateChooserModal from "./TemplateChooserModal";
import DocumentView from "@/components/documents/DocumentView";
import { Calendar } from "@/components/ui/calendar";
import { createPortal } from "react-dom";

const ICON_COLORS = [
  { name: "Blue",   value: "hsl(217 91% 60%)" },
  { name: "Emerald",value: "hsl(160 84% 39%)" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink",   value: "hsl(var(--aurora-pink))" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Red",    value: "hsl(0 72% 55%)" },
  { name: "Amber",  value: "hsl(45 93% 50%)" },
  { name: "Teal",   value: "hsl(175 60% 42%)" },
];
const BG_COLORS = [
  { name: "Blue",   value: "hsl(217 91% 60%)" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink",   value: "hsl(var(--aurora-pink))" },
  { name: "Green",  value: "hsl(150 60% 45%)" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Teal",   value: "hsl(175 60% 42%)" },
  { name: "Red",    value: "hsl(0 72% 55%)" },
  { name: "Amber",  value: "hsl(45 93% 50%)" },
];

// ─── Full customization context menu (same as desktop + overlay) ───────────
interface DocCtxMenuProps {
  doc: DbDocument;
  x: number; y: number;
  onOpen: () => void;
  onDelete: () => void;
  onClose: () => void;
}
const DocCtxMenu: React.FC<DocCtxMenuProps> = ({ doc, x, y, onOpen, onDelete, onClose }) => {
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
  const filteredIcons = iconSearch.trim() ? FOLDER_ICONS.filter(i => i.name.toLowerCase().includes(iconSearch.toLowerCase())) : FOLDER_ICONS;
  const displayedIcons = showAllIcons ? filteredIcons : filteredIcons.slice(0, 12);

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

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99997]" onClick={onClose} />
      <div
        ref={ref}
        className="fixed z-[99999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ left: Math.min(x + 100, window.innerWidth - 540), top: Math.min(y, window.innerHeight - 420), width: 520 }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground uppercase shrink-0 flex items-center gap-1"><Type size={10} /> Title</p>
          <input type="range" min="8" max="18" step="1" value={titleSize}
            onChange={e => store.updateDesktopDocTitleSize(doc.id, parseInt(e.target.value))}
            onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{titleSize}px</span>
        </div>
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
          {/* Actions */}
          <div className="flex-1 border-r border-border/30 py-2">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">Actions</p>
            <button onClick={() => { onOpen(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors"><FileText size={13} className="text-muted-foreground" /> Open</button>
            <button onClick={() => { const t = prompt("Rename:", doc.title); if (t) supabase.from("documents").update({ title: t.trim() } as any).eq("id", doc.id); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors"><Pencil size={13} className="text-muted-foreground" /> Rename</button>
            <button onClick={async () => { await supabase.from("documents").insert({ title: `${doc.title} (copy)`, type: doc.type, content: doc.content, user_id: doc.user_id, folder_id: doc.folder_id } as any); toast.success("Duplicated"); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors"><Copy size={13} className="text-muted-foreground" /> Duplicate</button>
            <button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/?doc=${doc.id}`); toast.success("Link copied"); } catch {} onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary transition-colors"><Share2 size={13} className="text-muted-foreground" /> Share</button>
            <div className="h-px bg-border mx-2 my-1" />
            <button onClick={() => { setShowCalendar(!showCalendar); setShowMoveFolder(false); }} className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-secondary transition-colors ${showCalendar ? "text-primary bg-primary/5" : "text-foreground"}`}><CalendarPlus size={13} className="text-muted-foreground" /> Add to Calendar</button>
            {showCalendar && (
              <div className="px-2 pb-2 pt-1" onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                <Calendar mode="single" selected={calDate} onSelect={setCalDate} className="rounded-lg border border-border/30 bg-secondary/20 text-[11px] p-1.5 [&_.rdp-day]:h-7 [&_.rdp-day]:w-7 [&_.rdp-head_cell]:w-7" />
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={12} className="text-muted-foreground" />
                  <input type="time" value={calTime} onChange={e => setCalTime(e.target.value)} className="flex-1 text-[11px] bg-secondary/30 border border-border/30 rounded-md px-2 py-1 text-foreground outline-none" onPointerDown={e => e.stopPropagation()} />
                </div>
                <button onClick={async () => { if (!calDate) return; await createBlock({ title: doc.title, time: calTime, scheduled_date: calDate.toISOString().split("T")[0], type: "deep", duration: "60m" }); toast.success("Added to calendar"); setShowCalendar(false); onClose(); }} className="w-full mt-2 text-[11px] py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Schedule</button>
              </div>
            )}
            <button onClick={() => { setShowMoveFolder(!showMoveFolder); setShowCalendar(false); }} className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-secondary transition-colors ${showMoveFolder ? "text-primary bg-primary/5" : "text-foreground"}`}><FolderInput size={13} className="text-muted-foreground" /> Move to Folder</button>
            {showMoveFolder && (
              <div className="px-2 pb-2 pt-1 max-h-[150px] overflow-y-auto space-y-0.5">
                {rootFolders.length === 0 && <p className="text-[10px] text-muted-foreground px-2 py-1">No folders</p>}
                {rootFolders.map(f => (
                  <button key={f.id} onClick={async () => { await (supabase as any).from("documents").update({ folder_id: f.id }).eq("id", doc.id); toast.success(`Moved to ${f.title}`); onClose(); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-foreground hover:bg-secondary/60 rounded-md transition-colors"><FolderInput size={11} className="text-muted-foreground" /> {f.title}</button>
                ))}
              </div>
            )}
            <div className="h-px bg-border mx-2 my-1" />
            <button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /> Delete</button>
          </div>
          {/* Icon */}
          <div className="flex-1 border-r border-border/30 py-3 overflow-hidden">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2">Icon</p>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input type="text" value={iconSearch} onChange={e => { setIconSearch(e.target.value); if (e.target.value) setShowAllIcons(true); }} placeholder="Search icons..." className="w-full h-6 pl-6 pr-2 rounded-md bg-secondary/40 border border-border/30 text-[10px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/20" onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
              </div>
            </div>
            <div className="px-4 pb-2">
              <div className={`grid grid-cols-6 gap-1.5 ${showAllIcons ? 'max-h-[120px] overflow-y-auto' : ''}`}>
                <button onClick={() => store.updateDesktopDocCustomIcon(doc.id, "")} className={`p-1.5 rounded-md transition-all hover:scale-110 ${!storedIconName ? "bg-primary/15" : "hover:bg-secondary/60"}`} title="Default">
                  {isSpreadsheet ? <Table size={13} className={!storedIconName ? "text-primary" : "text-muted-foreground"} /> : <FileText size={13} className={!storedIconName ? "text-primary" : "text-muted-foreground"} />}
                </button>
                {displayedIcons.map(item => { const IC = item.icon; const isActive = storedIconName === item.name; return (<button key={item.name} onClick={() => store.updateDesktopDocCustomIcon(doc.id, item.name)} className={`p-1.5 rounded-md transition-all hover:scale-110 ${isActive ? "bg-primary/15" : "hover:bg-secondary/60"}`} title={item.name}><IC size={13} className={isActive ? "text-primary" : "text-muted-foreground"} /></button>); })}
              </div>
              {!iconSearch && filteredIcons.length > 12 && (<button onClick={() => setShowAllIcons(!showAllIcons)} className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors"><ChevronDown size={10} className={`transition-transform ${showAllIcons ? 'rotate-180' : ''}`} />{showAllIcons ? 'Show less' : `Show all (${filteredIcons.length})`}</button>)}
            </div>
            <div className="px-4 pb-1">
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-md transition-colors"><Upload size={10} /> Upload</button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadIcon} />
            </div>
            <div className="px-4 pb-2 pt-1">
              <p className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center gap-1"><Palette size={10} /> Color</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {ICON_COLORS.map(c => (<button key={c.name} onClick={e => { e.stopPropagation(); store.updateDesktopDocIconColor(doc.id, c.value); }} className={`rounded-full border-2 transition-all hover:scale-125 ${iconColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`} style={{ backgroundColor: c.value, width: 16, height: 16 }} title={c.name} />))}
                <button onClick={e => { e.stopPropagation(); store.updateDesktopDocIconColor(doc.id, ""); }} className={`text-[8px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded ${!iconColor ? "bg-primary/10" : ""}`}>Reset</button>
              </div>
            </div>
          </div>
          {/* Background */}
          <div className="flex-1 py-3 min-w-0">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-3">Background</p>
            <div className="px-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase mb-2.5">Color</p>
              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={e => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, ""); }} className={`rounded-full border-2 transition-all hover:scale-125 ${!bgColor ? "border-foreground/40 scale-110" : "border-transparent"}`} style={{ background: "rgba(22,22,26,0.65)", width: 18, height: 18 }} title="Default" />
                {BG_COLORS.map(c => (<button key={c.name} onClick={e => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, c.value); }} className={`rounded-full border-2 transition-all hover:scale-125 ${bgColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`} style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />))}
                <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden" style={{ width: 18, height: 18 }} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                  <input type="color" value={bgColor?.startsWith('#') ? bgColor : "#16161a"} onChange={e => { e.stopPropagation(); store.updateDesktopDocBgColor(doc.id, e.target.value); }} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
              </div>
            </div>
            <div className="px-4 py-2 flex items-center gap-2 overflow-hidden">
              <p className="text-[10px] text-muted-foreground uppercase w-10 shrink-0">Opacity</p>
              <input type="range" min="0" max="1" step="0.05" value={docOpacity} onChange={e => { e.stopPropagation(); store.updateDesktopDocOpacity(doc.id, parseFloat(e.target.value)); }} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{Math.round(docOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

// ─── Main component ────────────────────────────────────────────────────────
interface Props { folderId: string; }

const FolderWindowContent: React.FC<Props> = ({ folderId }) => {
  const { findFolderNode, updateFolder, createFolder, moveFolder } = useFlux();
  const { moveToTrash } = useTrash();
  const { user } = useAuth();
  const store = useFocusStore();
  const folder = findFolderNode(folderId);
  const { documents, loading, createDocument, updateDocument, removeDocument, refetch } = useDocuments(folderId, moveToTrash);

  // openDoc persisted so minimize→restore brings back the open document
  const [openDoc, setOpenDoc] = useState<DbDocument | null>(() => {
    try {
      const raw = sessionStorage.getItem(`flux_folder_opendoc_${folderId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const setOpenDocPersisted = useCallback((doc: DbDocument | null) => {
    setOpenDoc(doc);
    try {
      if (doc) sessionStorage.setItem(`flux_folder_opendoc_${folderId}`, JSON.stringify(doc));
      else sessionStorage.removeItem(`flux_folder_opendoc_${folderId}`);
    } catch {}
  }, [folderId]);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [docCtx, setDocCtx] = useState<{ doc: DbDocument; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder?.title ?? "");
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const subfolderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const draggingDocId = useRef<string | null>(null);
  const draggingSubId = useRef<string | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);

  const commitRename = useCallback(() => {
    if (renameValue.trim() && folder && renameValue.trim() !== folder.title)
      updateFolder(folderId, { title: renameValue.trim() });
    setRenaming(false);
  }, [renameValue, folder, folderId, updateFolder]);

  // Pointer-based drag for items inside — detect drop on subfolders
  const handleItemPointerUp = useCallback((itemId: string, isDoc: boolean) => {
    const pos = dragPosRef.current;
    if (!pos) return;
    draggingDocId.current = null;
    draggingSubId.current = null;
    dragPosRef.current = null;
    setDropTargetId(null);
    // Check overlap with any subfolder ref
    for (const [subId, el] of Object.entries(subfolderRefs.current)) {
      if (!el || subId === itemId) continue;
      const rect = el.getBoundingClientRect();
      if (pos.x > rect.left && pos.x < rect.right && pos.y > rect.top && pos.y < rect.bottom) {
        if (isDoc) {
          (supabase as any).from("documents").update({ folder_id: subId }).eq("id", itemId).then(() => {
            refetch(); toast.success("Moved into subfolder");
          });
        } else {
          moveFolder(itemId, subId);
          toast.success("Moved into subfolder");
        }
        return;
      }
    }
  }, [moveFolder, refetch]);

  if (!folder) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Folder not found</div>;

  const iconColor = folder.color || "hsl(var(--muted-foreground))";
  const customIcon = folder.icon ? FOLDER_ICONS.find(i => i.name === folder.icon) : null;
  const IconComp = customIcon ? customIcon.icon : Folder;

  if (openDoc) {
    return (
      <div className="flex flex-col w-full h-full">
        <DocumentView
          document={openDoc}
          onBack={() => setOpenDocPersisted(null)}
          onUpdate={(id, updates) => { updateDocument(id, updates); setOpenDoc(prev => prev?.id === id ? { ...prev, ...updates } : prev); }}
          onDelete={(id) => { removeDocument(id); setOpenDocPersisted(null); }}
          lightMode={(() => { try { return localStorage.getItem(`flux_doc_light_${openDoc.id}`) === "1"; } catch { return false; } })()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Sub-header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 shrink-0">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}18` }}>
          <IconComp size={13} style={{ color: iconColor }} strokeWidth={1.5} />
        </div>
        {renaming ? (
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
            className="flex-1 text-sm font-semibold bg-transparent outline-none border-b border-primary/50"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-foreground cursor-pointer select-none" onDoubleClick={() => { setRenameValue(folder.title); setRenaming(true); }}>{folder.title}</span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setShowTemplateChooser(true)} className="p-1 rounded-md hover:bg-secondary transition-colors" title="New document"><FileText size={13} className="text-muted-foreground" /></button>
          <button onClick={async () => { await createFolder({ parent_id: folderId, title: "New Folder", type: "folder" }); }} className="p-1 rounded-md hover:bg-secondary transition-colors" title="New subfolder"><FolderPlus size={13} className="text-muted-foreground" /></button>
        </div>
      </div>

      {/* Hint */}
      <div className="px-4 pt-2 pb-0">
        <p className="text-[10px] text-muted-foreground/40">Drag items onto a subfolder to move them inside it</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : folder.children.length === 0 && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground/40">
            <Folder size={32} style={{ color: iconColor, opacity: 0.4 }} />
            <p className="text-sm">This folder is empty</p>
            <button onClick={() => setShowTemplateChooser(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"><Plus size={12} /> New Document</button>
          </div>
        ) : (
          <div className="grid gap-3 auto-rows-max" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}>
            {/* Subfolders */}
            {folder.children.map(sub => {
              const subIcon = sub.icon ? FOLDER_ICONS.find(i => i.name === sub.icon) : null;
              const SubIcon = sub.id === dropTargetId ? FolderOpen : (subIcon ? subIcon.icon : Folder);
              const subColor = sub.color || "hsl(var(--muted-foreground))";
              const isTarget = dropTargetId === sub.id;
              return (
                <div
                  key={sub.id}
                  ref={el => { subfolderRefs.current[sub.id] = el; }}
                  data-subfolder-id={sub.id}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl cursor-pointer group select-none transition-all ${isTarget ? "ring-2 ring-blue-400/60 bg-blue-500/8 scale-105" : "hover:bg-secondary/40 hover:scale-[1.03]"}`}
                  onDoubleClick={() => { /* open subfolder - parent handles this */ }}
                  onPointerUp={() => handleItemPointerUp(sub.id, false)}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${subColor}18`, border: `1px solid ${subColor}22` }}>
                    <SubIcon size={24} style={{ color: subColor }} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight max-w-[64px] line-clamp-2">{sub.title}</span>
                </div>
              );
            })}

            {/* Documents */}
            {documents.map(doc => {
              const isSheet = doc.type === "spreadsheet";
              const storedIconName = store.desktopDocCustomIcons?.[doc.id] ?? "";
              const customIconColor = store.desktopDocIconColors?.[doc.id] ?? "";
              const customBgColor = store.desktopDocBgColors?.[doc.id] ?? "";
              const lucideIcon = storedIconName && !storedIconName.startsWith("http") ? FOLDER_ICONS.find(i => i.name === storedIconName) : null;
              const defaultColor = isSheet ? "hsl(160 84% 39%)" : "hsl(217 91% 60%)";
              const resolvedColor = customIconColor || defaultColor;
              const defaultBg = isSheet ? "rgba(52,211,153,0.1)" : "rgba(147,197,253,0.1)";
              const resolvedBg = customBgColor
                ? (customBgColor.startsWith('#')
                  ? (() => { const h = customBgColor.replace('#',''); const r=parseInt(h.substring(0,2),16),g=parseInt(h.substring(2,4),16),b=parseInt(h.substring(4,6),16); return `rgba(${r},${g},${b},0.8)`; })()
                  : customBgColor)
                : defaultBg;

              return (
                <div
                  key={doc.id}
                  draggable
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl cursor-pointer group select-none hover:bg-secondary/40 hover:scale-[1.03] transition-all"
                  onDoubleClick={() => setOpenDocPersisted(doc)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setDocCtx({ doc, x: e.clientX, y: e.clientY }); }}
                  onDragStart={e => { draggingDocId.current = doc.id; e.dataTransfer.effectAllowed = "move"; }}
                  onPointerMove={e => { if (draggingDocId.current === doc.id) { dragPosRef.current = { x: e.clientX, y: e.clientY }; const hit = Object.entries(subfolderRefs.current).find(([sid, el]) => { if (!el) return false; const r = el.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; }); setDropTargetId(hit ? hit[0] : null); } }}
                  onPointerUp={() => handleItemPointerUp(doc.id, true)}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: resolvedBg }}>
                    {storedIconName && storedIconName.startsWith("http") ? (
                      <img src={storedIconName} alt="" className="rounded-lg object-cover" style={{ width: 28, height: 28 }} />
                    ) : lucideIcon ? (
                      <lucideIcon.icon size={24} style={{ color: resolvedColor }} strokeWidth={1.5} />
                    ) : isSheet ? (
                      <Table size={24} style={{ color: resolvedColor }} strokeWidth={1.5} />
                    ) : (
                      <FileText size={24} style={{ color: resolvedColor }} strokeWidth={1.5} />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight max-w-[64px] line-clamp-2">{doc.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {docCtx && (
          <DocCtxMenu
            doc={docCtx.doc}
            x={docCtx.x} y={docCtx.y}
            onOpen={() => { setDocCtx(null); setOpenDoc(docCtx.doc); }}
            onDelete={async () => { await removeDocument(docCtx.doc.id); refetch(); setDocCtx(null); }}
            onClose={() => setDocCtx(null)}
          />
        )}
      </AnimatePresence>

      {showTemplateChooser && (
        <TemplateChooserModal
          onClose={() => setShowTemplateChooser(false)}
          onCreateDocument={async (title, type, content, lightMode) => {
            const doc = await createDocument(title, type, folderId, content);
            if (doc && lightMode) try { localStorage.setItem(`flux_doc_light_${doc.id}`, "1"); } catch {}
            refetch();
            setShowTemplateChooser(false);
          }}
        />
      )}
    </div>
  );
};

export default FolderWindowContent;
