import React, { useState, useCallback, useRef, useEffect } from "react";
import type { DbDocument } from "@/hooks/useDocuments";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { FocusProvider, useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { suggestIcon } from "@/components/CreateFolderModal";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { useWidgetStyle } from "@/hooks/useWidgetStyle";
import { StyleEditorProvider } from "./StyleEditorContext";
import { WidgetCloseProvider } from "@/context/WidgetCloseContext";
import BackgroundEngine, { SpaceSettings, DEFAULT_SPACE_SETTINGS } from "./BackgroundEngine";
import FocusTimer from "./FocusTimer";
import DesktopFolder from "./DesktopFolder";
import DesktopDocument from "./DesktopDocument";
import FolderModal from "./FolderModal";
import DesktopDocumentViewer from "./DesktopDocumentViewer";
import MusicWidget from "./MusicWidget";
import TodaysPlanWidget from "./TodaysPlanWidget";
import FocusStickyNotes from "./FocusStickyNotes";
import NotesWidget from "./NotesWidget";
import CRMWidget from "./CRMWidget";
import ClockWidget from "./ClockWidget";
import FocusStatsWidget from "./FocusStatsWidget";
import ScratchpadWidget from "./ScratchpadWidget";
import QuoteOfDay from "./QuoteOfDay";
import ToolDrawer from "./ToolDrawer";
import BreathingWidget from "./BreathingWidget";
import FocusCouncilWidget from "./FocusCouncilWidget";
import AuraWidget from "./AuraWidget";
import AuraImageWidget from "./AuraImageWidget";
import RoutineBuilderWidget from "./RoutineBuilderWidget";
import ClockEditor from "./ClockEditor";
import WidgetStyleEditor from "./WidgetStyleEditor";
import CreateFolderModal from "@/components/CreateFolderModal";
import TemplateChooserModal from "./TemplateChooserModal";
import ExpandedFolderOverlay from "./ExpandedFolderOverlay";
import {
  FocusBudgetWidget,
  FocusSavingsWidget,
  FocusWorkoutWidget,
  FocusProjectStatusWidget,
  FocusTopTasksWidget,
  FocusSmartPlanWidget,
  FocusGamificationWidget,
  FocusCRMWidget,
} from "./HomeWidgets";
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, StickyNote, FileText, Table, Trash2, CalendarPlus, ListChecks, Plus, LayoutGrid, X, Focus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { WindowManagerProvider, useWindowManager } from "@/context/WindowManagerContext";
import WindowFrame from "@/components/windows/WindowFrame";
import WindowDock from "@/components/windows/WindowDock";
import WindowSwitcher from "@/components/windows/WindowSwitcher";
import DocumentView from "@/components/documents/DocumentView";
import FolderWindowContent from "./FolderWindowContent";
import { useFocusMode } from "@/context/FocusModeContext";
import { useTrash } from "@/context/TrashContext";
import FocusIntentionModal from "./FocusIntentionModal";

const BuildModeGrid = () => (
  <div className="absolute inset-0 z-10 pointer-events-none" style={{
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
  }}>
    <div className="absolute top-4 left-4 w-3 h-3 border-t border-l border-white/10 rounded-tl" />
    <div className="absolute top-4 right-4 w-3 h-3 border-t border-r border-white/10 rounded-tr" />
    <div className="absolute bottom-20 left-4 w-3 h-3 border-b border-l border-white/10 rounded-bl" />
    <div className="absolute bottom-20 right-4 w-3 h-3 border-b border-r border-white/10 rounded-br" />
  </div>
);

type StickyNote = { id: string; text: string; color: string; x: number; y: number; rotation: number; opacity: number };
type DashboardPage = {
  id: string;
  label: string;
  activeWidgets?: string[];
  stickyNotes?: StickyNote[];
  background?: string; // override global bg
  spaceSettings?: SpaceSettings; // per-page brightness/blur/vignette/volume
  folderPositions?: Record<string, { x: number; y: number }>; // per-page folder positions
  docPositions?: Record<string, { x: number; y: number }>;    // per-page doc positions
  visibleFolderIds?: string[];  // which folders are on this page
  visibleDocIds?: string[];     // which docs are on this page
  pinnedFolderIds?: string[];   // pinned to ALL pages (always visible everywhere)
  pinnedDocIds?: string[];      // pinned docs to ALL pages
};

// Screenshot cache for dot hover thumbnails
const PAGE_THUMBNAILS: Record<string, string> = {};
let thumbnailCaptureScheduled = false;

// Pagination settings persisted per-session
const PAGINATION_SETTINGS_KEY = "flux-pagination-settings";
const PILL_STYLE_KEY = "flux-pill-style";
interface PaginationSettings {
  showLabel: boolean;
  pillOpacity: number;
  showPagination: boolean;
  pillPosition: { x: number; y: number } | null; // null = default centered
}
interface PillStyle {
  bgOpacity: number;
  bgColor: string;
  textColor: string;
  blurAmount: number;
  borderOpacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  textOpacity: number;
}
const DEFAULT_PILL_STYLE: PillStyle = {
  bgOpacity: 15,
  bgColor: "#0f0c19",
  textColor: "#ffffff",
  blurAmount: 24,
  borderOpacity: 18,
  borderRadius: 50,
  borderWidth: 1,
  borderColor: "#ffffff",
  textOpacity: 80,
};
function loadPaginationSettings(): PaginationSettings {
  try {
    const r = localStorage.getItem(PAGINATION_SETTINGS_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      // Always force pillPosition to null so pill is centered above the toolbar by default
      return { showLabel: true, pillOpacity: 82, showPagination: true, ...parsed, pillPosition: null };
    }
  } catch {}
  return { showLabel: true, pillOpacity: 82, showPagination: true, pillPosition: null };
}
// Always clear any saved pill position on load so it defaults to centered
if (typeof window !== "undefined") {
  try {
    const r = localStorage.getItem(PAGINATION_SETTINGS_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      if (parsed.pillPosition !== undefined) {
        localStorage.setItem(PAGINATION_SETTINGS_KEY, JSON.stringify({ ...parsed, pillPosition: null }));
      }
    }
  } catch {}
}
function loadPillStyle(): PillStyle {
  try { const r = localStorage.getItem(PILL_STYLE_KEY); if (r) return { ...DEFAULT_PILL_STYLE, ...JSON.parse(r) }; } catch {}
  return DEFAULT_PILL_STYLE;
}
function savePillStyle(s: PillStyle) { localStorage.setItem(PILL_STYLE_KEY, JSON.stringify(s)); }

// ── Pill Style Panel ──────────────────────────────────────────────────────
const PILL_BORDER_RADIUS_PRESETS = [
  { label: "Soft", value: 12 },
  { label: "Round", value: 24 },
  { label: "Pill", value: 50 },
];
const PILL_BORDER_STYLES = [
  { label: "None", value: 0 },
  { label: "Thin", value: 1 },
  { label: "Med", value: 2 },
  { label: "Bold", value: 3 },
];
const PILL_TEXT_SWATCHES = ["#ffffff", "#f0f0f0", "#a5b4fc", "#6ee7b7", "#fde68a", "#f9a8d4", "#7dd3fc"];
const PILL_BG_SWATCHES = ["#0f0c19", "#000000", "#1a1a2e", "#0f172a", "#1e293b", "#0c0c0c", "#14041e"];

const hexToRgbaPill = (hex: string, alpha: number) => {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch { return `rgba(15,12,25,${alpha})`; }
};

const PillStylePanel = ({ style, onUpdate, onReset, onClose, showLabel, onToggleLabel, showPagination, onTogglePagination }: {
  style: PillStyle;
  onUpdate: (patch: Partial<PillStyle>) => void;
  onReset: () => void;
  onClose: () => void;
  showLabel: boolean;
  onToggleLabel: () => void;
  showPagination: boolean;
  onTogglePagination: () => void;
}) => {
  const [colorTab, setColorTab] = React.useState<"text" | "bg">("text");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="absolute bottom-[calc(100%+52px)] left-1/2 -translate-x-1/2 w-72 rounded-2xl p-4 shadow-2xl z-[10200] pointer-events-auto"
      style={{ background: "rgba(10,8,20,0.96)", backdropFilter: "blur(48px)", border: "1px solid rgba(255,255,255,0.1)" }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Pill Style</span>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="text-[9px] text-white/30 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">Reset</button>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={13} /></button>
        </div>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Visibility toggles */}
        <div className="space-y-2">
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider block">Visibility</span>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-[11px] text-white/70">Show page label</span>
            <button onClick={onToggleLabel}
              className={`w-8 h-4 rounded-full transition-colors relative ${showLabel ? "bg-white/30" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showLabel ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-[11px] text-white/70">Show pagination</span>
            <button onClick={onTogglePagination}
              className={`w-8 h-4 rounded-full transition-colors relative ${showPagination ? "bg-white/30" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showPagination ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </label>
        </div>

        {/* Color tabs */}
        <div className="space-y-2">
          <div className="flex gap-1 p-0.5 rounded-xl bg-white/[0.05]">
            {(["text", "bg"] as const).map(m => (
              <button key={m} onClick={() => setColorTab(m)}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${colorTab === m ? "bg-white/15 text-white/90" : "text-white/40 hover:text-white/60"}`}>
                {m === "text" ? "Text / Dot" : "Background"}
              </button>
            ))}
          </div>
          {colorTab === "text" ? (
            <div className="flex gap-1.5 flex-wrap">
              {PILL_TEXT_SWATCHES.map(c => (
                <button key={c} onClick={() => onUpdate({ textColor: c })}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: style.textColor === c ? "rgba(255,255,255,0.9)" : "transparent" }} />
              ))}
              <label className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-white/20 hover:scale-110 transition-transform"
                style={{ background: "conic-gradient(hsl(0 80% 60%),hsl(120 80% 60%),hsl(240 80% 60%),hsl(360 80% 60%))" }}>
                <input type="color" value={style.textColor || "#ffffff"} onChange={e => onUpdate({ textColor: e.target.value })} className="opacity-0 w-full h-full" />
              </label>
            </div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {PILL_BG_SWATCHES.map(c => (
                <button key={c} onClick={() => onUpdate({ bgColor: c })}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: style.bgColor === c ? "rgba(255,255,255,0.9)" : "transparent", outline: c === "#000000" ? "1px solid rgba(255,255,255,0.2)" : undefined }} />
              ))}
              <label className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-white/20 hover:scale-110 transition-transform"
                style={{ background: "conic-gradient(hsl(0 80% 60%),hsl(120 80% 60%),hsl(240 80% 60%),hsl(360 80% 60%))" }}>
                <input type="color" value={style.bgColor || "#0f0c19"} onChange={e => onUpdate({ bgColor: e.target.value })} className="opacity-0 w-full h-full" />
              </label>
            </div>
          )}
        </div>

        {/* BG opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">BG Opacity</span>
            <span className="text-[10px] text-white/30 tabular-nums">{style.bgOpacity}%</span>
          </div>
          <input type="range" min={0} max={80} step={1} value={style.bgOpacity}
            onChange={e => onUpdate({ bgOpacity: Number(e.target.value) })}
            className="w-full accent-white h-1" />
        </div>

        {/* Blur */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Blur</span>
            <span className="text-[10px] text-white/30 tabular-nums">{style.blurAmount}px</span>
          </div>
          <input type="range" min={0} max={40} step={1} value={style.blurAmount}
            onChange={e => onUpdate({ blurAmount: Number(e.target.value) })}
            className="w-full accent-white h-1" />
        </div>

        {/* Text opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Text Opacity</span>
            <span className="text-[10px] text-white/30 tabular-nums">{style.textOpacity}%</span>
          </div>
          <input type="range" min={10} max={100} step={1} value={style.textOpacity}
            onChange={e => onUpdate({ textOpacity: Number(e.target.value) })}
            className="w-full accent-white h-1" />
        </div>

        {/* Shape */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider block">Shape</span>
          <div className="flex gap-1.5">
            {PILL_BORDER_RADIUS_PRESETS.map(p => (
              <button key={p.label} onClick={() => onUpdate({ borderRadius: p.value })}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${style.borderRadius === p.value ? "bg-white/15 text-white" : "text-white/35 hover:bg-white/8 hover:text-white/60 border border-white/8"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Border */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider block">Border</span>
          <div className="flex gap-1.5">
            {PILL_BORDER_STYLES.map(b => (
              <button key={b.label} onClick={() => onUpdate({ borderWidth: b.value })}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${style.borderWidth === b.value ? "bg-white/15 text-white" : "text-white/35 hover:bg-white/8 hover:text-white/60 border border-white/8"}`}>
                {b.label}
              </button>
            ))}
          </div>
          {style.borderWidth > 0 && (
            <div className="space-y-1.5 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Border Opacity</span>
                <span className="text-[10px] text-white/30 tabular-nums">{style.borderOpacity}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={style.borderOpacity}
                onChange={e => onUpdate({ borderOpacity: Number(e.target.value) })}
                className="w-full accent-white h-1" />
              <div className="flex gap-1.5 flex-wrap mt-1">
                {PILL_TEXT_SWATCHES.map(c => (
                  <button key={c} onClick={() => onUpdate({ borderColor: c })}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: style.borderColor === c ? "rgba(255,255,255,0.9)" : "transparent" }} />
                ))}
                <label className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-white/20 hover:scale-110 transition-transform"
                  style={{ background: "conic-gradient(hsl(0 80% 60%), hsl(120 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%))" }}>
                  <input type="color" value={style.borderColor} onChange={e => onUpdate({ borderColor: e.target.value })} className="opacity-0 w-full h-full cursor-pointer" />
                </label>
              </div>
            </div>
          )}
        </div>

        <p className="text-[9px] text-white/30 text-center pt-1">Change page background via the Spaces menu ↙</p>
      </div>
    </motion.div>
  );
};

const FocusContent = () => {
  const { activeWidgets, systemMode, updateDesktopFolderPosition, updateDesktopDocPosition, desktopFolderPositions, desktopDocPositions, focusStickyNotes } = useFocusStore();
  const { folderTree, createFolder, moveFolder, removeFolder, createBlock } = useFlux();
  const { user } = useAuth();
  const { isFocusModeActive, disableFocusMode, enableFocusMode } = useFocusMode();
  const [intentionModalOpen, setIntentionModalOpen] = useState(false);

  // Listen for the Control Center triggering focus intention modal
  useEffect(() => {
    const handler = () => setIntentionModalOpen(true);
    window.addEventListener("open-focus-intention", handler);
    return () => window.removeEventListener("open-focus-intention", handler);
  }, []);

  // iOS-style dashboard pages state
  const [dashboardPages, setDashboardPages] = useState<DashboardPage[]>(() => {
    try {
      const raw = localStorage.getItem("flux-dashboard-pages");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.map((p: any) => ({
          id: p.id, label: p.label || "Home",
          activeWidgets: p.activeWidgets,
          stickyNotes: p.stickyNotes,
          background: p.background,
          spaceSettings: p.spaceSettings,
          folderPositions: p.folderPositions,
          docPositions: p.docPositions,
          // Keep existing visibility lists — undefined means legacy "show all" for page-1 only
          visibleFolderIds: p.visibleFolderIds,
          visibleDocIds: p.visibleDocIds,
          pinnedFolderIds: p.pinnedFolderIds,
          pinnedDocIds: p.pinnedDocIds,
        }));
      }
    } catch {}
    // First page: undefined = legacy mode (shows all folders). New pages always use explicit lists.
    return [{ id: "page-1", label: "Home", visibleFolderIds: undefined, visibleDocIds: undefined }];
  });
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageDir, setPageDir] = useState<1 | -1>(1);
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);
  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  // Dot context menu (delete / background)
  const [dotMenu, setDotMenu] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  // Drag-to-reorder dots
  const dragDotIdx = useRef<number | null>(null);
  const [draggingDotIdx, setDraggingDotIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Dot hover preview + screenshot thumbnails
  const [hoverDotIdx, setHoverDotIdx] = useState<number | null>(null);
  const [pageThumbnails, setPageThumbnails] = useState<Record<string, string>>({});
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Build-mode pagination settings
  const [paginationSettings, setPaginationSettings] = useState<PaginationSettings>(loadPaginationSettings);
  const [showPillSettings, setShowPillSettings] = useState(false);
  const [pillStyle, setPillStyleState] = useState<PillStyle>(loadPillStyle);
  const updatePillStyle = React.useCallback((patch: Partial<PillStyle>) => {
    setPillStyleState(prev => { const next = { ...prev, ...patch }; savePillStyle(next); return next; });
  }, []);
  const resetPillStyle = React.useCallback(() => { setPillStyleState(DEFAULT_PILL_STYLE); savePillStyle(DEFAULT_PILL_STYLE); }, []);
  // Pill drag-to-reposition — always starts centered by default
  const pillRef = useRef<HTMLDivElement>(null);
  const pillDragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [pillPos, setPillPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPill, setIsDraggingPill] = useState(false);
  const [pillBouncing, setPillBouncing] = useState(false);
  // Cloud sync debounce
  const cloudSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keyboard shortcuts cheat sheet
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Deleted page undo buffer
  const deletedPageBuffer = useRef<{ page: DashboardPage; idx: number } | null>(null);
  // Mission Control overlay (hold arrow key 300ms)
  const [showMissionControl, setShowMissionControl] = useState(false);
  const arrowHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrowHoldKey = useRef<string | null>(null);

  // Persist pages locally
  useEffect(() => {
    localStorage.setItem("flux-dashboard-pages", JSON.stringify(dashboardPages));
  }, [dashboardPages]);

  // Persist pagination settings (including pill position)
  useEffect(() => {
    localStorage.setItem(PAGINATION_SETTINGS_KEY, JSON.stringify({ ...paginationSettings, pillPosition: pillPos }));
  }, [paginationSettings, pillPos]);

  // Load pages from cloud on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from as any)("dashboard_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data?.state) return;
      const s = data.state as any;
      if (Array.isArray(s.dashboardPages) && s.dashboardPages.length > 0) {
        setDashboardPages(s.dashboardPages.map((p: any) => ({
          id: p.id, label: p.label || "Home",
          activeWidgets: p.activeWidgets,
          stickyNotes: p.stickyNotes,
          background: p.background,
          spaceSettings: p.spaceSettings,
          folderPositions: p.folderPositions,
          docPositions: p.docPositions,
          visibleFolderIds: p.visibleFolderIds,
          visibleDocIds: p.visibleDocIds,
          pinnedFolderIds: p.pinnedFolderIds,
          pinnedDocIds: p.pinnedDocIds,
        })));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Sync pages to cloud (debounced)
  const syncPagesToCloud = useCallback((pages: DashboardPage[]) => {
    if (!user) return;
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = setTimeout(async () => {
      const { data: existing } = await (supabase.from as any)("dashboard_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      const prev = (existing?.state as Record<string, unknown>) || {};
      await (supabase.from as any)("dashboard_state").upsert(
        { user_id: user.id, state: { ...prev, dashboardPages: pages }, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }, 1200);
  }, [user]);

  const setPages = useCallback((updater: (prev: DashboardPage[]) => DashboardPage[]) => {
    setDashboardPages(prev => {
      const next = updater(prev);
      syncPagesToCloud(next);
      return next;
    });
  }, [syncPagesToCloud]);

  const goToPage = useCallback((idx: number) => {
    // Capture screenshot of current page before leaving
    if (idx !== activePageIndex) {
      const pageId = dashboardPages[activePageIndex]?.id;
      if (pageId) {
        if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current);
        thumbnailTimerRef.current = setTimeout(() => {
          import("html2canvas").then(({ default: html2canvas }) => {
            const el = document.querySelector("[data-canvas-root]") as HTMLElement;
            if (!el) return;
            html2canvas(el, { scale: 0.15, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#0a0814" })
              .then(canvas => {
                setPageThumbnails(prev => ({ ...prev, [pageId]: canvas.toDataURL("image/jpeg", 0.6) }));
              })
              .catch(() => {});
          });
        }, 200);
      }
    }
    setPageDir(idx > activePageIndex ? 1 : -1);
    setActivePageIndex(idx);
  }, [activePageIndex, dashboardPages]);

  const addPage = useCallback(() => {
    // New pages always start completely empty — strict isolation
    const newPage: DashboardPage = {
      id: `page-${Date.now()}`,
      label: `Page ${dashboardPages.length + 1}`,
      visibleFolderIds: [],
      visibleDocIds: [],
    };
    setPages(prev => [...prev, newPage]);
    setPageDir(1);
    setActivePageIndex(dashboardPages.length);
  }, [dashboardPages.length, setPages]);

  const duplicatePage = useCallback((idx: number) => {
    const source = dashboardPages[idx];
    if (!source) return;
    const newPage: DashboardPage = {
      id: `page-${Date.now()}`,
      label: `${source.label} Copy`,
      activeWidgets: source.activeWidgets ? [...source.activeWidgets] : undefined,
      stickyNotes: source.stickyNotes ? source.stickyNotes.map(n => ({ ...n, id: `fn-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })) : undefined,
      background: source.background,
      spaceSettings: source.spaceSettings ? { ...source.spaceSettings } : undefined,
      folderPositions: source.folderPositions ? { ...source.folderPositions } : undefined,
      docPositions: source.docPositions ? { ...source.docPositions } : undefined,
      // Duplicate carries the same visible items
      visibleFolderIds: source.visibleFolderIds ? [...source.visibleFolderIds] : [],
      visibleDocIds: source.visibleDocIds ? [...source.visibleDocIds] : [],
    };
    const insertAt = idx + 1;
    setPages(prev => { const next = [...prev]; next.splice(insertAt, 0, newPage); return next; });
    setPageDir(1);
    setActivePageIndex(insertAt);
    setDotMenu(null);
    toast.success("Page duplicated");
  }, [dashboardPages, setPages]);

  const deletePage = useCallback((idx: number, skipConfirm = false) => {
    if (dashboardPages.length <= 1) { toast.error("Can't delete the only page"); return; }
    const pageToDelete = dashboardPages[idx];
    deletedPageBuffer.current = { page: pageToDelete, idx };
    setPages(prev => prev.filter((_, i) => i !== idx));
    setActivePageIndex(prev => Math.min(prev, dashboardPages.length - 2));
    setDeleteConfirmIdx(null);
    setDotMenu(null);
    toast.success(`"${pageToDelete.label || `Page ${idx + 1}`}" deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          const buf = deletedPageBuffer.current;
          if (!buf) return;
          setPages(prev => {
            const next = [...prev];
            next.splice(buf.idx, 0, buf.page);
            return next;
          });
          setActivePageIndex(buf.idx);
          deletedPageBuffer.current = null;
          toast.success("Page restored");
        },
      },
    });
  }, [dashboardPages, setPages]);

  const startLabelEdit = useCallback((idx: number) => {
    setEditingLabelIdx(idx);
    setEditingLabelValue(dashboardPages[idx]?.label || "");
    setTimeout(() => labelInputRef.current?.select(), 50);
  }, [dashboardPages]);

  const commitLabelEdit = useCallback(() => {
    if (editingLabelIdx === null) return;
    const trimmed = editingLabelValue.trim() || dashboardPages[editingLabelIdx]?.label || "Page";
    setPages(prev => prev.map((p, i) => i === editingLabelIdx ? { ...p, label: trimmed } : p));
    setEditingLabelIdx(null);
  }, [editingLabelIdx, editingLabelValue, dashboardPages, setPages]);

  // Per-page active widgets
  const currentPage = dashboardPages[activePageIndex];
  const pageActiveWidgets: string[] = currentPage?.activeWidgets ?? [];

  const updatePageWidgets = useCallback((widgets: string[]) => {
    setPages(prev => prev.map((p, i) => i === activePageIndex ? { ...p, activeWidgets: widgets } : p));
  }, [activePageIndex, setPages]);

  // Per-page sticky notes
  const pageStickyNotes: StickyNote[] = currentPage?.stickyNotes ?? focusStickyNotes;
  const setPageStickyNotes = useCallback((notes: StickyNote[]) => {
    setPages(prev => prev.map((p, i) => i === activePageIndex ? { ...p, stickyNotes: notes } : p));
  }, [activePageIndex, setPages]);

  // Per-page space settings
  const pageSpaceSettings = currentPage?.spaceSettings;
  const updatePageSpaceSettings = useCallback((s: SpaceSettings) => {
    setPages(prev => prev.map((p, i) => i === activePageIndex ? { ...p, spaceSettings: s } : p));
  }, [activePageIndex, setPages]);

  // Per-page folder/doc positions — override global context positions for current page
  const pageFolderPositions: Record<string, { x: number; y: number }> = currentPage?.folderPositions ?? desktopFolderPositions;
  const pageDocPositions: Record<string, { x: number; y: number }> = currentPage?.docPositions ?? desktopDocPositions;

  const updatePageFolderPosition = useCallback((id: string, pos: { x: number; y: number }) => {
    updateDesktopFolderPosition(id, pos); // keep global in sync
    setPages(prev => prev.map((p, i) => i === activePageIndex ? {
      ...p,
      folderPositions: { ...(p.folderPositions ?? desktopFolderPositions), [id]: pos },
    } : p));
  }, [activePageIndex, setPages, updateDesktopFolderPosition, desktopFolderPositions]);

  const updatePageDocPosition = useCallback((id: string, pos: { x: number; y: number }) => {
    updateDesktopDocPosition(id, pos); // keep global in sync
    setPages(prev => prev.map((p, i) => i === activePageIndex ? {
      ...p,
      docPositions: { ...(p.docPositions ?? desktopDocPositions), [id]: pos },
    } : p));
  }, [activePageIndex, setPages, updateDesktopDocPosition, desktopDocPositions]);

  // ── Move item to a different page ──────────────────────────────────────────
  const handleMoveToPage = useCallback((itemId: string, type: 'folder' | 'doc', targetPageIndex: number) => {
    setPages(prev => prev.map((p, i) => {
      if (i === activePageIndex) {
        if (type === 'folder') return { ...p, visibleFolderIds: (p.visibleFolderIds ?? []).filter(id => id !== itemId) };
        return { ...p, visibleDocIds: (p.visibleDocIds ?? []).filter(id => id !== itemId) };
      }
      if (i === targetPageIndex) {
        if (type === 'folder') return { ...p, visibleFolderIds: [...(p.visibleFolderIds ?? []), itemId] };
        return { ...p, visibleDocIds: [...(p.visibleDocIds ?? []), itemId] };
      }
      return p;
    }));
    const label = dashboardPages[targetPageIndex]?.label || `Page ${targetPageIndex + 1}`;
    toast.success(`Moved to "${label}"`);
  }, [activePageIndex, setPages, dashboardPages]);

  // ── Toggle "show on all pages" pin ─────────────────────────────────────────
  const handleTogglePin = useCallback((itemId: string, type: 'folder' | 'doc') => {
    setPages(prev => {
      const isCurrentlyPinned = prev.some(p => 
        type === 'folder' ? p.pinnedFolderIds?.includes(itemId) : p.pinnedDocIds?.includes(itemId)
      );
      return prev.map(p => {
        if (type === 'folder') {
          const pinned = p.pinnedFolderIds ?? [];
          const visible = p.visibleFolderIds ?? [];
          if (isCurrentlyPinned) {
            // Unpin: remove from pinnedFolderIds on all pages; keep on current page
            return { ...p, pinnedFolderIds: pinned.filter(id => id !== itemId) };
          } else {
            // Pin: add to pinnedFolderIds and ensure it's in visibleFolderIds for every page
            return {
              ...p,
              pinnedFolderIds: pinned.includes(itemId) ? pinned : [...pinned, itemId],
              visibleFolderIds: visible.includes(itemId) ? visible : [...visible, itemId],
            };
          }
        } else {
          const pinned = p.pinnedDocIds ?? [];
          const visible = p.visibleDocIds ?? [];
          if (isCurrentlyPinned) {
            return { ...p, pinnedDocIds: pinned.filter(id => id !== itemId) };
          } else {
            return {
              ...p,
              pinnedDocIds: pinned.includes(itemId) ? pinned : [...pinned, itemId],
              visibleDocIds: visible.includes(itemId) ? visible : [...visible, itemId],
            };
          }
        }
      });
    });
  }, [setPages]);

  // Touch swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && activePageIndex < dashboardPages.length - 1) goToPage(activePageIndex + 1);
    if (dx > 0 && activePageIndex > 0) goToPage(activePageIndex - 1);
  }, [activePageIndex, dashboardPages.length, goToPage]);

  // Arrow key navigation + Mission Control (hold 300ms) + Cmd shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isEditing = tag === "input" || tag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable;

      // Cmd/Ctrl+? → toggle shortcuts cheat sheet
      if ((e.metaKey || e.ctrlKey) && e.key === "?") {
        e.preventDefault();
        setShowShortcuts(v => !v);
        return;
      }

      // Cmd/Ctrl+T → add new page
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        const newPage = { id: `page-${Date.now()}`, label: `Page ${dashboardPages.length + 1}`, visibleFolderIds: [] as string[], visibleDocIds: [] as string[] };
        setPages(prev => [...prev, newPage]);
        setPageDir(1);
        setActivePageIndex(dashboardPages.length);
        toast.success(`Page ${dashboardPages.length + 1} added`, { description: "⌘T to add more pages" });
        return;
      }

      // Cmd/Ctrl+W → delete current page with undo
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        deletePage(activePageIndex);
        return;
      }

      if (isEditing) return;

      // Arrow keys: hold 300ms → Mission Control; tap → navigate
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.repeat) {
        e.preventDefault();
        // Start hold timer for Mission Control
        if (arrowHoldKey.current !== e.key) {
          arrowHoldKey.current = e.key;
          if (arrowHoldTimer.current) clearTimeout(arrowHoldTimer.current);
          arrowHoldTimer.current = setTimeout(() => {
            setShowMissionControl(true);
            arrowHoldTimer.current = null;
          }, 300);
        }
      }
      if (e.key === "Escape") {
        if (showMissionControl) setShowMissionControl(false);
        else if (isFocusModeActive) disableFocusMode();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (arrowHoldTimer.current) {
          // Timer still pending → it was a tap, not a hold → navigate
          clearTimeout(arrowHoldTimer.current);
          arrowHoldTimer.current = null;
          if (!showMissionControl) {
            if (e.key === "ArrowRight" && activePageIndex < dashboardPages.length - 1) goToPage(activePageIndex + 1);
            if (e.key === "ArrowLeft" && activePageIndex > 0) goToPage(activePageIndex - 1);
          }
        }
        arrowHoldKey.current = null;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [activePageIndex, dashboardPages.length, goToPage, setPages, deletePage, showMissionControl, isFocusModeActive, disableFocusMode]);

  // Dot drag-to-reorder handlers
  const handleDotDragStart = useCallback((i: number) => {
    dragDotIdx.current = i;
    setDraggingDotIdx(i);
  }, []);
  const handleDotDragOver = useCallback((i: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(i);
  }, []);
  const handleDotDrop = useCallback((targetIdx: number) => {
    const fromIdx = dragDotIdx.current;
    if (fromIdx === null || fromIdx === targetIdx) { setDraggingDotIdx(null); setDragOverIdx(null); return; }
    setPages(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(targetIdx, 0, removed);
      return next;
    });
    setActivePageIndex(prev => {
      if (prev === fromIdx) return targetIdx;
      if (fromIdx < prev && targetIdx >= prev) return prev - 1;
      if (fromIdx > prev && targetIdx <= prev) return prev + 1;
      return prev;
    });
    dragDotIdx.current = null;
    setDraggingDotIdx(null);
    setDragOverIdx(null);
    setPageDir(targetIdx > fromIdx ? 1 : -1);
  }, [setPages]);

  // Long-press for mobile delete
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDotTouchStart = useCallback((i: number, e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setDotMenu({ idx: i, x: touch.clientX, y: touch.clientY - 80 });
    }, 600);
  }, []);
  const handleDotTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Pill drag-to-reposition (pointer events so it works on touch too)
  // Only active in Build mode
  const handlePillPointerDown = useCallback((e: React.PointerEvent) => {
    if (systemMode !== "build") return; // drag only in build mode
    if ((e.target as HTMLElement).closest('button, input')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = pillRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentX = rect.left;
    const currentY = rect.top;
    pillDragOrigin.current = { mx: e.clientX, my: e.clientY, px: currentX, py: currentY };
    setPillPos({ x: currentX, y: currentY });
    setIsDraggingPill(true);
    setPillBouncing(false);
  }, [systemMode]);

  const handlePillPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pillDragOrigin.current) return;
    const dx = e.clientX - pillDragOrigin.current.mx;
    const dy = e.clientY - pillDragOrigin.current.my;
    const rect = pillRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 200;
    const h = rect?.height ?? 44;
    const nx = Math.max(8, Math.min(window.innerWidth - w - 8, pillDragOrigin.current.px + dx));
    const ny = Math.max(8, Math.min(window.innerHeight - h - 8, pillDragOrigin.current.py + dy));
    setPillPos({ x: nx, y: ny });
  }, []);

  const handlePillPointerUp = useCallback(() => {
    if (!pillDragOrigin.current) return;
    pillDragOrigin.current = null;
    setIsDraggingPill(false);
    // Trigger spring bounce animation on drop
    setPillBouncing(true);
    setTimeout(() => setPillBouncing(false), 500);
  }, []);
  const { moveToTrash } = useTrash();
  const { documents: desktopDocs, refetch: refetchDesktopDocs, updateDocument: updateDesktopDoc, removeDocument: removeDesktopDoc, createDocument } = useDocuments(null, moveToTrash);
  const { openWindow, closeWindow, windows, updateWindowPosition, focusedId } = useWindowManager();
  // Extra docs opened from folders (not in desktopDocs since folder_id != null)
  const [folderOpenedDocs, setFolderOpenedDocs] = useState<Record<string, DbDocument>>({});

  // Listen for document restore from trash — add its ID back to page 1 visibleDocIds
  useEffect(() => {
    const handler = (e: Event) => {
      const docId = (e as CustomEvent<{ docId: string }>).detail?.docId;
      if (!docId) return;
      setPages(prev => {
        const updated = prev.map((p, i) => {
          if (i !== 0) return p; // restore to first page (Home)
          const visible = p.visibleDocIds ?? [];
          if (visible.includes(docId)) return p;
          return { ...p, visibleDocIds: [...visible, docId] };
        });
        localStorage.setItem("flux-dashboard-pages", JSON.stringify(updated));
        return updated;
      });
      setTimeout(() => refetchDesktopDocs(), 600);
    };
    window.addEventListener("dashboard:restore-doc", handler);
    return () => window.removeEventListener("dashboard:restore-doc", handler);
  }, [refetchDesktopDocs]);
  const [clockEditorOpen, setClockEditorOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  // Intercept folder window restores: when a folder- window becomes non-minimized,
  // close it and open the ExpandedFolderOverlay instead (so it restores as an overlay, not a WindowFrame).
  const prevWindowsRef = useRef<typeof windows>([]);
  useEffect(() => {
    const prev = prevWindowsRef.current;
    for (const win of windows) {
      if (win.type === "widget" && win.contentId.startsWith("folder-") && !win.minimized) {
        const prevWin = prev.find(w => w.id === win.id);
        // Was previously minimized (or didn't exist) and is now restored
        if (prevWin && prevWin.minimized) {
          const folderId = win.contentId.replace(/^folder-/, "");
          closeWindow(win.id);
          setOpenFolderId(folderId);
          break;
        }
      }
    }
    prevWindowsRef.current = windows;
  }, [windows, closeWindow]);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [auraImages, setAuraImages] = useState<{ id: string; url: string; prompt: string }[]>([]);
  const [dragState, setDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const [docDragState, setDocDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const docDragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const selectedIdsRef = useRef<Set<string>>(new Set<string>());
  const marqueeActive = useRef(false);
  // Group drag state
  const groupDraggingRef = useRef(false);
  const groupDragOrigin = useRef<{ x: number; y: number } | null>(null);
  const groupDragStartPositions = useRef<Record<string, { x: number; y: number }>>({});
  // Drag badge state (cursor-following pill)
  const [dragBadge, setDragBadge] = useState<{ x: number; y: number; count: number } | null>(null);

  // Keep refs in sync
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  // Listen for Aura image widget spawn events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { id, url, prompt } = e.detail || {};
      if (id && url) setAuraImages(prev => [...prev, { id, url, prompt: prompt || "Generated image" }]);
    };
    window.addEventListener("aura:spawn-image-widget" as any, handler);
    return () => window.removeEventListener("aura:spawn-image-widget" as any, handler);
  }, []);

  /** Convert viewport clientX/Y to canvas-relative coordinates */
  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // Style editor focus mode state
  const [styleEditorTarget, setStyleEditorTarget] = useState<string | null>(null);
  const [editorPosition, setEditorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleOpenStyleEditor = useCallback((widgetId: string) => {
    const widgetEl = document.querySelector(`[data-widget-id="${widgetId}"]`) as HTMLElement;
    if (widgetEl) {
      const rect = widgetEl.getBoundingClientRect();
      const editorWidth = 340;
      const editorHeight = 420;
      const gap = 24;
      let x: number;
      if (rect.right + gap + editorWidth < window.innerWidth) {
        x = rect.right + gap;
      } else if (rect.left - gap - editorWidth > 0) {
        x = rect.left - gap - editorWidth;
      } else {
        x = Math.min(rect.right + gap, window.innerWidth - editorWidth - 10);
      }
      let y = rect.top;
      y = Math.max(20, Math.min(y, window.innerHeight - editorHeight - 20));
      setEditorPosition({ x, y });
    } else {
      setEditorPosition({ x: window.innerWidth / 2 - 170, y: window.innerHeight / 2 - 210 });
    }
    setStyleEditorTarget(widgetId);
  }, []);

  // Widget style for active editor target
  const activeStyle = useWidgetStyle(styleEditorTarget ?? "__none__");

  // Store context menu position for coordinate-based placement
  const contextMenuPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleCreateDocument = useCallback(async (type: "text" | "spreadsheet") => {
    const pos = contextMenuPosRef.current;
    setContextMenu(null);
    const title = type === "text" ? "Untitled Document" : "Untitled Spreadsheet";
    const doc = await createDocument(title, type, null);
    if (doc) {
      if (pos) updatePageDocPosition(doc.id, pos);
      // Register doc to this page only
      setPages(prev => prev.map((p, i) => i === activePageIndex
        ? { ...p, visibleDocIds: [...(p.visibleDocIds ?? []), doc.id] }
        : p
      ));
    }
    contextMenuPosRef.current = null;
    toast.success(`${type === "text" ? "Document" : "Spreadsheet"} created`);
  }, [createDocument, updatePageDocPosition, activePageIndex, setPages]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.desktop-folder, [data-widget], button, input, textarea')) return;
    e.preventDefault();
    const canvasPos = toCanvasCoords(e.clientX, e.clientY);
    contextMenuPosRef.current = canvasPos;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [toCanvasCoords]);

  const handleAddStickyNote = useCallback(() => {
    const pos = contextMenuPosRef.current;
    setContextMenu(null);
    const COLORS = [
      { key: "yellow" }, { key: "purple" }, { key: "green" }, { key: "blue" },
      { key: "pink" }, { key: "orange" }, { key: "coral" }, { key: "mint" },
    ];
    const color = COLORS[pageStickyNotes.length % COLORS.length];
    const rotation = Math.round((Math.random() - 0.5) * 8);
    const baseX = pos ? pos.x : 40 + Math.random() * Math.min(window.innerWidth - 200, 500);
    const baseY = pos ? pos.y : 60 + Math.random() * Math.min(window.innerHeight - 250, 400);
    setPageStickyNotes([
      ...pageStickyNotes,
      { id: `fn-${Date.now()}`, text: "", color: color.key, x: baseX, y: baseY, rotation, opacity: 1 },
    ]);
    contextMenuPosRef.current = null;
  }, [pageStickyNotes, setPageStickyNotes]);

  const handleDragStateChange = useCallback((state: { id: string; x: number; y: number } | null) => {
    if (state === null && dragStateRef.current) {
      const prev = dragStateRef.current;
      const draggedId = prev.id;
      const allFolderEls = document.querySelectorAll('.desktop-folder[data-folder-id]');
      for (const el of allFolderEls) {
        const targetId = (el as HTMLElement).dataset.folderId;
        if (!targetId || targetId === draggedId) continue;
        const rect = el.getBoundingClientRect();
        if (
          prev.x > rect.left &&
          prev.x < rect.right &&
          prev.y > rect.top &&
          prev.y < rect.bottom
        ) {
          const triggerAbsorb = (el as any).__triggerAbsorb;
          if (triggerAbsorb) triggerAbsorb();
          moveFolder(draggedId, targetId);
          toast.success("Folder moved");
          break;
        }
      }
    }
    dragStateRef.current = state;
    setDragState(state);
  }, [moveFolder]);

  const handleDocDragStateChange = useCallback((state: { id: string; x: number; y: number } | null) => {
    if (state === null && docDragStateRef.current) {
      const prev = docDragStateRef.current;
      const docId = prev.id;
      const allFolderEls = document.querySelectorAll('.desktop-folder[data-folder-id]');
      for (const el of allFolderEls) {
        const targetId = (el as HTMLElement).dataset.folderId;
        if (!targetId) continue;
        const rect = el.getBoundingClientRect();
        if (
          prev.x > rect.left &&
          prev.x < rect.right &&
          prev.y > rect.top &&
          prev.y < rect.bottom
        ) {
          const triggerAbsorb = (el as any).__triggerAbsorb;
          if (triggerAbsorb) triggerAbsorb();
          const folder = folderTree.find(f => f.id === targetId);
          if (user) {
            (supabase as any).from("documents").update({ folder_id: targetId, updated_at: new Date().toISOString() }).eq("id", docId).then(() => {
              refetchDesktopDocs();
            });
          } else {
            const LS_KEY = "flux_local_documents";
            try {
              const raw = localStorage.getItem(LS_KEY);
              const docs = raw ? JSON.parse(raw) : [];
              localStorage.setItem(LS_KEY, JSON.stringify(docs.map((d: any) => d.id === docId ? { ...d, folder_id: targetId, updated_at: new Date().toISOString() } : d)));
              refetchDesktopDocs();
            } catch {}
          }
          toast.success(`Moved to ${folder?.title || "folder"}`);
          break;
        }
      }
    }
    docDragStateRef.current = state;
    setDocDragState(state);
  }, [folderTree, user, refetchDesktopDocs]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("modal-folder-id") || e.dataTransfer.types.includes("modal-doc-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
    const modalFolderId = e.dataTransfer.getData("modal-folder-id");
    if (modalFolderId) {
      e.preventDefault();
      moveFolder(modalFolderId, null as any);
      toast.success("Moved to desktop");
    }
    const modalDocId = e.dataTransfer.getData("modal-doc-id");
    if (modalDocId) {
      e.preventDefault();
      await (supabase as any)
        .from("documents")
        .update({ folder_id: null })
        .eq("id", modalDocId);
      toast.success("Document moved to desktop");
      refetchDesktopDocs();
    }
  }, [moveFolder, refetchDesktopDocs]);

  // Marquee + group drag: single effect with refs to avoid stale closures
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.desktop-folder, .desktop-document, [data-widget], [data-widget-id], [data-no-drag], .focus-sticky-note, button, input, textarea')) return;
    e.preventDefault(); // prevent text selection during marquee
    // Clear selection on empty canvas click
    if (selectedIdsRef.current.size > 0) {
      setSelectedIds(new Set());
      selectedIdsRef.current = new Set();
    }
    const coords = toCanvasCoords(e.clientX, e.clientY);
    marqueeActive.current = true;
    document.body.style.userSelect = "none";
    const m = { startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y };
    marqueeRef.current = m;
    setMarquee(m);
  }, [toCanvasCoords]);

  useEffect(() => {
    const computeIntersectedIds = (m: { startX: number; startY: number; endX: number; endY: number }) => {
      const l = Math.min(m.startX, m.endX);
      const r = Math.max(m.startX, m.endX);
      const t = Math.min(m.startY, m.endY);
      const b = Math.max(m.startY, m.endY);
      if (r - l < 5 && b - t < 5) return new Set<string>();
      const ns = new Set<string>();
      folderTree.forEach(folder => {
        const fPos = pageFolderPositions[folder.id] || { x: 40, y: 40 };
        if (fPos.x < r && fPos.x + 90 > l && fPos.y < b && fPos.y + 90 > t) ns.add(folder.id);
      });
      desktopDocs.forEach(doc => {
        const dPos = pageDocPositions[doc.id] || { x: 0, y: 0 };
        if (dPos.x < r && dPos.x + 90 > l && dPos.y < b && dPos.y + 90 > t) ns.add(doc.id);
      });
      return ns;
    };

    const onMouseMove = (e: MouseEvent) => {
      // Marquee drawing — compute intersections live
      if (marqueeActive.current && marqueeRef.current) {
        const coords = toCanvasCoords(e.clientX, e.clientY);
        const updated = { ...marqueeRef.current, endX: coords.x, endY: coords.y };
        marqueeRef.current = updated;
        setMarquee(updated);
        // Real-time intersection detection
        const live = computeIntersectedIds(updated);
        selectedIdsRef.current = live;
        setSelectedIds(live);
        return;
      }
      // Group drag
      if (groupDraggingRef.current && groupDragOrigin.current) {
        const dx = e.clientX - groupDragOrigin.current.x;
        const dy = e.clientY - groupDragOrigin.current.y;
        const ids = selectedIdsRef.current;
        ids.forEach((id) => {
          const startPos = groupDragStartPositions.current[id];
          if (!startPos) return;
          if (folderTree.some(f => f.id === id)) {
            updatePageFolderPosition(id, { x: Math.max(0, startPos.x + dx), y: Math.max(0, startPos.y + dy) });
          } else {
            updatePageDocPosition(id, { x: Math.max(0, startPos.x + dx), y: Math.max(0, startPos.y + dy) });
          }
        });
        // Update drag badge position
        setDragBadge({ x: e.clientX, y: e.clientY, count: ids.size });
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      // Finalize marquee — selection already applied live, just clean up
      if (marqueeActive.current && marqueeRef.current) {
        marqueeActive.current = false;
        marqueeRef.current = null;
        setMarquee(null);
        document.body.style.userSelect = "";
      }
      // End group drag — check folder dropzone
      if (groupDraggingRef.current) {
        groupDraggingRef.current = false;
        groupDragOrigin.current = null;
        setDragBadge(null);
        // Check if dropped on a folder
        const ids = selectedIdsRef.current;
        if (ids.size > 0) {
          const allFolderEls = document.querySelectorAll('.desktop-folder[data-folder-id]');
          for (const el of allFolderEls) {
            const targetId = (el as HTMLElement).dataset.folderId;
            if (!targetId || ids.has(targetId)) continue; // skip self
            const rect = el.getBoundingClientRect();
            if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
              // Move all selected items into this folder
              const triggerAbsorb = (el as any).__triggerAbsorb;
              if (triggerAbsorb) triggerAbsorb();
              const folderIds = [...ids].filter(id => folderTree.some(f => f.id === id));
              const docIds = [...ids].filter(id => desktopDocs.some(d => d.id === id));
              for (const fid of folderIds) { moveFolder(fid, targetId); }
              for (const did of docIds) {
                if (user) {
                  (supabase as any).from("documents").update({ folder_id: targetId, updated_at: new Date().toISOString() }).eq("id", did).then(() => refetchDesktopDocs());
                } else {
                  const LS_KEY = "flux_local_documents";
                  try {
                    const raw = localStorage.getItem(LS_KEY);
                    const docs = raw ? JSON.parse(raw) : [];
                    localStorage.setItem(LS_KEY, JSON.stringify(docs.map((d: any) => d.id === did ? { ...d, folder_id: targetId } : d)));
                    refetchDesktopDocs();
                  } catch {}
                }
              }
              const targetFolder = folderTree.find(f => f.id === targetId);
              toast.success(`Moved ${ids.size} item${ids.size > 1 ? "s" : ""} to ${targetFolder?.title || "folder"}`);
              setSelectedIds(new Set());
              selectedIdsRef.current = new Set();
              break;
            }
          }
        }
      }
    };
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    return () => { window.removeEventListener("pointermove", onMouseMove); window.removeEventListener("pointerup", onMouseUp); };
  }, [folderTree, desktopDocs, pageFolderPositions, pageDocPositions, toCanvasCoords, updatePageFolderPosition, updatePageDocPosition, moveFolder, user, refetchDesktopDocs]);

  const handleGroupDragStart = useCallback((e: React.PointerEvent, itemId: string) => {
    if (e.button !== 0) return false;
    if (!selectedIdsRef.current.has(itemId) || selectedIdsRef.current.size < 2) return false;
    e.stopPropagation();
    groupDraggingRef.current = true;
    groupDragOrigin.current = { x: e.clientX, y: e.clientY };
    const positions: Record<string, { x: number; y: number }> = {};
    selectedIdsRef.current.forEach((id) => {
      if (folderTree.some(f => f.id === id)) {
        positions[id] = pageFolderPositions[id] || { x: 40, y: 40 };
      } else {
        positions[id] = pageDocPositions[id] || { x: 0, y: 0 };
      }
    });
    groupDragStartPositions.current = positions;
    return true;
  }, [folderTree, pageFolderPositions, pageDocPositions]);

  // Single-click select: selects only this item, clears rest
  const handleSingleSelect = useCallback((id: string) => {
    const ns = new Set<string>([id]);
    setSelectedIds(ns);
    selectedIdsRef.current = ns;
  }, []);

  // Bulk context menu
  const [bulkContextMenu, setBulkContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleBulkContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    setBulkContextMenu(null);
    const ids = selectedIdsRef.current;
    const folderIds = [...ids].filter(id => folderTree.some(f => f.id === id));
    const docIds = [...ids].filter(id => desktopDocs.some(d => d.id === id));
    for (const fid of folderIds) { await removeFolder(fid); }
    for (const did of docIds) { removeDesktopDoc(did); }
    setSelectedIds(new Set());
    selectedIdsRef.current = new Set();
    toast.success(`Deleted ${ids.size} item${ids.size > 1 ? "s" : ""}`);
  }, [folderTree, desktopDocs, removeFolder, removeDesktopDoc]);

  const handleBulkAddToCalendar = useCallback(async () => {
    setBulkContextMenu(null);
    const ids = selectedIdsRef.current;
    const today = new Date().toISOString().split("T")[0];
    let hour = 9;
    for (const id of ids) {
      const folder = folderTree.find(f => f.id === id);
      const doc = desktopDocs.find(d => d.id === id);
      const title = folder?.title || doc?.title || "Untitled";
      const time = `${String(hour).padStart(2, "0")}:00`;
      await createBlock({ title, time, scheduled_date: today, type: "deep", duration: "60m" });
      hour++;
    }
    toast.success(`Added ${ids.size} item${ids.size > 1 ? "s" : ""} to calendar`);
  }, [folderTree, desktopDocs, createBlock]);

  const handleBulkAddToPlan = useCallback(() => {
    setBulkContextMenu(null);
    const ids = selectedIdsRef.current;
    const items: string[] = [];
    for (const id of ids) {
      const folder = folderTree.find(f => f.id === id);
      const doc = desktopDocs.find(d => d.id === id);
      items.push(folder?.title || doc?.title || "Untitled");
    }
    // Add to brain dump / today's plan via localStorage signal
    const LS_PLAN_KEY = "flux-todays-plan-tasks";
    try {
      const raw = localStorage.getItem(LS_PLAN_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const newTasks = items.map(t => ({ id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: t, done: false }));
      localStorage.setItem(LS_PLAN_KEY, JSON.stringify([...existing, ...newTasks]));
    } catch {}
    toast.success(`Added ${ids.size} item${ids.size > 1 ? "s" : ""} to Today's Plan`);
  }, [folderTree, desktopDocs]);

  // Compute marquee rect for rendering
  const marqueeRect = marquee ? {
    left: Math.min(marquee.startX, marquee.endX),
    top: Math.min(marquee.startY, marquee.endY),
    width: Math.abs(marquee.endX - marquee.startX),
    height: Math.abs(marquee.endY - marquee.startY),
  } : null;

  return (
    <StyleEditorProvider value={{ openEditor: handleOpenStyleEditor, activeWidgetId: styleEditorTarget }}>
    <div
      ref={canvasRef}
      data-canvas-root
      className="relative w-full h-[100dvh] overflow-hidden bg-black select-none"
      onContextMenu={handleContextMenu}
      onMouseDown={handleCanvasMouseDown}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background — animate in/out with parallax on page switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${activePageIndex}`}
          initial={{ x: pageDir * 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: pageDir * -40, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
          style={{ zIndex: 0 }}
        >
          <BackgroundEngine
            embedded
            pageBackground={currentPage?.background}
            onPageBackgroundChange={(id) => setPages(prev => prev.map((p, i) => i === activePageIndex ? { ...p, background: id } : p))}
            pageSpaceSettings={pageSpaceSettings}
            onPageSpaceSettingsChange={updatePageSpaceSettings}
          />
        </motion.div>
      </AnimatePresence>
      {/* Vignette always visible */}
      <div
        className="absolute inset-0 z-[15] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)" }}
      />
      {/* Focus Mode: subtle dim overlay over wallpaper */}
      <AnimatePresence>
        {isFocusModeActive && (
          <motion.div
            key="focus-dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-[16] pointer-events-none"
            style={{ background: "rgba(0,0,0,0.28)" }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {systemMode === "build" && (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <BuildModeGrid />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        <div className="pointer-events-auto w-full h-full">
          <AnimatePresence mode="wait" custom={pageDir}>
            <motion.div
              key={activePageIndex}
              custom={pageDir}
              initial={{ x: pageDir * 80, opacity: 0, scale: 0.97 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: pageDir * -80, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.9 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="pointer-events-auto w-full h-full">
            <WidgetCloseProvider closeWidget={(wid) => updatePageWidgets(pageActiveWidgets.filter(w => w !== wid))}>
            <AnimatePresence>
              {pageActiveWidgets.includes("clock") && !clockEditorOpen && <ClockWidget key="clock" onOpenEditor={() => setClockEditorOpen(true)} />}
              {pageActiveWidgets.includes("timer") && <FocusTimer key="timer" />}
              {pageActiveWidgets.includes("music") && <MusicWidget key="music" />}
              {pageActiveWidgets.includes("planner") && <TodaysPlanWidget key="planner" />}
              {pageActiveWidgets.includes("notes") && <NotesWidget key="notes" />}
              {pageActiveWidgets.includes("crm") && <FocusCRMWidget key="crm" />}
              {pageActiveWidgets.includes("stats") && <FocusStatsWidget key="stats" />}
              {pageActiveWidgets.includes("scratchpad") && <ScratchpadWidget key="scratchpad" />}
              {pageActiveWidgets.includes("quote") && <QuoteOfDay key="quote" />}
              {pageActiveWidgets.includes("breathing") && <BreathingWidget key="breathing" />}
              {pageActiveWidgets.includes("council") && <FocusCouncilWidget key="council" />}
              {pageActiveWidgets.includes("aura") && <AuraWidget key="aura" />}
              {pageActiveWidgets.includes("routine") && <RoutineBuilderWidget key="routine" />}
              {/* Aura-spawned image widgets */}
              {auraImages.map(img => (
                <AuraImageWidget
                  key={img.id}
                  id={img.id}
                  url={img.url}
                  prompt={img.prompt}
                  onRemove={(id) => setAuraImages(prev => prev.filter(i => i.id !== id))}
                />
              ))}
              {pageActiveWidgets.includes("budget-preview") && <FocusBudgetWidget key="budget-preview" />}
              {pageActiveWidgets.includes("savings-ring") && <FocusSavingsWidget key="savings-ring" />}
              {pageActiveWidgets.includes("weekly-workout") && <FocusWorkoutWidget key="weekly-workout" />}
              {pageActiveWidgets.includes("project-status") && <FocusProjectStatusWidget key="project-status" />}
              {pageActiveWidgets.includes("top-tasks") && <FocusTopTasksWidget key="top-tasks" />}
              {pageActiveWidgets.includes("smart-plan") && <FocusSmartPlanWidget key="smart-plan" />}
              {pageActiveWidgets.includes("gamification") && <FocusGamificationWidget key="gamification" />}
            </AnimatePresence>
            </WidgetCloseProvider>
              {/* Per-page sticky notes — outside AnimatePresence to avoid forwardRef warning */}
              <FocusStickyNotes
                key={`sticky-${activePageIndex}`}
                notes={pageStickyNotes}
                onNotesChange={setPageStickyNotes}
              />

              {/* Desktop Folders — show if on this page OR globally pinned */}
              {folderTree
                .filter(folder => {
                  const pinned = dashboardPages.some(p => p.pinnedFolderIds?.includes(folder.id));
                  if (pinned) return true;
                  // Legacy migration: first page with undefined visibleFolderIds shows all folders
                  if (currentPage?.visibleFolderIds === undefined && activePageIndex === 0) return true;
                  return (currentPage?.visibleFolderIds ?? []).includes(folder.id);
                })
                .map((folder) => {
                  const isPinned = dashboardPages.some(p => p.pinnedFolderIds?.includes(folder.id));
                  return (
                  <DesktopFolder
                  key={folder.id}
                  folder={folder}
                  onOpenModal={setOpenFolderId}
                  layoutId={`folder-expand-${folder.id}`}
                  dragState={dragState}
                  docDragState={docDragState}
                  onDragStateChange={handleDragStateChange}
                  onDocDropped={refetchDesktopDocs}
                  isMarqueeSelected={selectedIds.has(folder.id)}
                  onGroupDragStart={handleGroupDragStart}
                  onSingleSelect={handleSingleSelect}
                  onBulkContextMenu={handleBulkContextMenu}
                  positionOverride={pageFolderPositions[folder.id]}
                  onPositionChange={updatePageFolderPosition}
                  allPages={dashboardPages.map((p, i) => ({ id: p.id, label: p.label, index: i }))}
                  currentPageIndex={activePageIndex}
                  onMoveToPage={(id, idx) => handleMoveToPage(id, 'folder', idx)}
                  isPinned={isPinned}
                  onTogglePin={(id) => handleTogglePin(id, 'folder')}
                />
                  );
                })}

              {/* Desktop Documents — show if on this page OR globally pinned */}
              {desktopDocs
                .filter(doc => {
                  const pinned = dashboardPages.some(p => p.pinnedDocIds?.includes(doc.id));
                  if (pinned) return true;
                  // Legacy migration: first page with undefined visibleDocIds shows all docs
                  if (currentPage?.visibleDocIds === undefined && activePageIndex === 0) return true;
                  return (currentPage?.visibleDocIds ?? []).includes(doc.id);
                })
                .map((doc) => {
                  const isPinned = dashboardPages.some(p => p.pinnedDocIds?.includes(doc.id));
                  return (
                <DesktopDocument
                  key={doc.id}
                  doc={doc}
                  onOpen={(d) => {
                    // Open document in a WindowFrame instead of the modal overlay
                    openWindow({
                      type: "document",
                      contentId: d.id,
                      title: d.title,
                      layout: "floating",
                      position: { x: Math.max(60, (window.innerWidth / 2) - 410 + Math.random() * 80), y: Math.max(40, (window.innerHeight / 2) - 310 + Math.random() * 60) },
                    });
                  }}
                  onDelete={(id) => { removeDesktopDoc(id); }}
                  onRefetch={refetchDesktopDocs}
                  dragState={docDragState}
                  onDragStateChange={handleDocDragStateChange}
                  isMarqueeSelected={selectedIds.has(doc.id)}
                  onGroupDragStart={handleGroupDragStart}
                  onSingleSelect={handleSingleSelect}
                  onBulkContextMenu={handleBulkContextMenu}
                  positionOverride={pageDocPositions[doc.id]}
                  onPositionChange={updatePageDocPosition}
                  allPages={dashboardPages.map((p, i) => ({ id: p.id, label: p.label, index: i }))}
                  currentPageIndex={activePageIndex}
                  onMoveToPage={(id, idx) => handleMoveToPage(id, 'doc', idx)}
                  isPinned={isPinned}
                  onTogglePin={(id) => handleTogglePin(id, 'doc')}
                />
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Marquee selection rectangle */}
          {marqueeRect && marqueeRect.width > 2 && marqueeRect.height > 2 && (
            <div
              className="absolute pointer-events-none z-[100] rounded-sm"
              style={{ left: marqueeRect.left, top: marqueeRect.top, width: marqueeRect.width, height: marqueeRect.height, border: "2px solid rgba(0,122,255,0.7)", background: "rgba(0,122,255,0.12)" }}
            />
          )}

          {/* Group drag badge — cursor pill */}
          {dragBadge && createPortal(
            <div
              className="fixed pointer-events-none z-[10000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
              style={{
                left: dragBadge.x + 16,
                top: dragBadge.y + 16,
                background: "rgba(0,122,255,0.85)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 20px rgba(0,122,255,0.4), 0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {dragBadge.count} selected
            </div>,
            document.body
          )}
          {openFolderId && (
            <ExpandedFolderOverlay
              folderId={openFolderId}
              onClose={() => { setOpenFolderId(null); refetchDesktopDocs(); }}
              onOpenDocument={(doc) => {
                // Store doc in folderOpenedDocs so window renderer can find it
                setFolderOpenedDocs(prev => ({ ...prev, [doc.id]: doc }));
                openWindow({
                  type: "document",
                  contentId: doc.id,
                  title: doc.title,
                  layout: "floating",
                  position: { x: Math.max(60, (window.innerWidth / 2) - 410 + Math.random() * 80), y: Math.max(40, (window.innerHeight / 2) - 310 + Math.random() * 60) },
                });
              }}
              onMoveDocToDesktop={(docId, clientX, clientY) => {
                const canvasPos = toCanvasCoords(clientX, clientY);
                updatePageDocPosition(docId, canvasPos);
                setPages(prev => prev.map((p, i) => i === activePageIndex
                  ? { ...p, visibleDocIds: [...(p.visibleDocIds ?? []).filter(id => id !== docId), docId] }
                  : p
                ));
                setTimeout(() => refetchDesktopDocs(), 400);
              }}
              onMoveFolderToDesktop={(fid, clientX, clientY) => {
                const canvasPos = toCanvasCoords(clientX, clientY);
                updatePageFolderPosition(fid, canvasPos);
                setPages(prev => prev.map((p, i) => i === activePageIndex
                  ? { ...p, visibleFolderIds: [...(p.visibleFolderIds ?? []).filter(id => id !== fid), fid] }
                  : p
                ));
              }}
            />
          )}


        </div>
      </div>

      {/* ── iPadOS Window Manager Layer — separate stacking context above desktop icons ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 150 }}>
        <div className="pointer-events-none w-full h-full">
          {windows.filter(w => !w.minimized).map((win) => {
              const winDoc = win.type === "document"
                ? (desktopDocs.find(d => d.id === win.contentId) ?? folderOpenedDocs[win.contentId])
                : null;

              // Widget content map
              const WIDGET_MAP: Record<string, React.ReactNode> = {
                clock: <ClockWidget onOpenEditor={() => setClockEditorOpen(true)} />,
                timer: <FocusTimer />,
                music: <MusicWidget />,
                planner: <TodaysPlanWidget />,
                notes: <NotesWidget />,
                crm: <CRMWidget />,
                stats: <FocusStatsWidget />,
                scratchpad: <ScratchpadWidget />,
                quote: <QuoteOfDay />,
                breathing: <BreathingWidget />,
                council: <FocusCouncilWidget />,
                aura: <AuraWidget />,
                "budget-preview": <FocusBudgetWidget />,
                "savings-ring": <FocusSavingsWidget />,
                "weekly-workout": <FocusWorkoutWidget />,
                "project-status": <FocusProjectStatusWidget />,
                "top-tasks": <FocusTopTasksWidget />,
                "smart-plan": <FocusSmartPlanWidget />,
                gamification: <FocusGamificationWidget />,
              };

              // Resolve folder content for widget windows with contentId "folder-{id}"
              const isFolderWindow = win.type === "widget" && win.contentId.startsWith("folder-");
              const folderWindowId = isFolderWindow ? win.contentId.replace(/^folder-/, "") : null;

              return (
                <WindowFrame key={win.id} window={win} focused={focusedId === win.id}>
                  {win.type === "document" && winDoc ? (
                    <DocumentView
                      document={winDoc}
                      onBack={() => closeWindow(win.id)}
                      onUpdate={(id, upd) => updateDesktopDoc(id, upd)}
                      onDelete={(id) => { removeDesktopDoc(id); closeWindow(win.id); }}
                      onToggleLightMode={() => window.dispatchEvent(new CustomEvent("doc:toggle-light", { detail: { windowId: win.id } }))}
                    />
                  ) : folderWindowId ? (
                    <FolderWindowContent folderId={folderWindowId} />
                  ) : win.type === "widget" && WIDGET_MAP[win.contentId] ? (
                    <div className="w-full h-full overflow-auto relative">
                      {WIDGET_MAP[win.contentId]}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Content not found
                    </div>
                  )}
                </WindowFrame>
              );
            })}
        </div>
      </div>

      {/* ── Window Dock (taskbar) ────────────────────────────────────────── */}
      <WindowDock />
      <WindowSwitcher />

      {/* Canvas right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setContextMenu(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[91] bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl py-1.5 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { setContextMenu(null); setShowCreateFolder(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg"
            >
              <FolderPlus size={14} className="text-muted-foreground" /> New Folder
            </button>
            <button
              onClick={() => { setContextMenu(null); setShowTemplateChooser(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg"
            >
              <FileText size={14} className="text-muted-foreground" /> New Document…
            </button>
            <button
              onClick={handleAddStickyNote}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg"
            >
              <StickyNote size={14} className="text-muted-foreground" /> New Sticky Note
            </button>
          </motion.div>
        </>
      )}

      {/* Bulk action context menu for multi-selected items */}
      {bulkContextMenu && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setBulkContextMenu(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[91] bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl py-1.5 min-w-[200px]"
            style={{ left: bulkContextMenu.x, top: bulkContextMenu.y }}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
            </div>
            <div className="h-px bg-border/40 mx-2 my-0.5" />
            <button
              onClick={handleBulkDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
            >
              <Trash2 size={14} /> Delete selected
            </button>
            <button
              onClick={handleBulkAddToCalendar}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg"
            >
              <CalendarPlus size={14} className="text-muted-foreground" /> Add to Calendar
            </button>
            <button
              onClick={handleBulkAddToPlan}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg"
            >
              <ListChecks size={14} className="text-muted-foreground" /> Add to Today's Plan
            </button>
          </motion.div>
        </>
      )}

      {/* Create folder modal */}
      {showCreateFolder && (
        <CreateFolderModal
          open={showCreateFolder}
          onClose={() => setShowCreateFolder(false)}
          onCreate={async (data) => {
            const pos = contextMenuPosRef.current;
            const parent = await createFolder({ title: data.title, type: "project", color: data.color, icon: data.icon });
            if (parent) {
              if (pos) updatePageFolderPosition(parent.id, { x: pos.x, y: pos.y });
              // Register folder to this page only
              setPages(prev => prev.map((p, i) => i === activePageIndex
                ? { ...p, visibleFolderIds: [...(p.visibleFolderIds ?? []), parent.id] }
                : p
              ));
              if (data.subfolders.length > 0) {
                for (const sub of data.subfolders) {
                  const subIcon = suggestIcon(sub);
                  await createFolder({ title: sub, type: "project", parent_id: parent.id, color: data.color, icon: subIcon });
                }
              }
            }
            contextMenuPosRef.current = null;
          }}
        />
      )}

      {/* Template Chooser Modal */}
      {showTemplateChooser && (
        <TemplateChooserModal
          onCreateDocument={async (title, type, content, lightMode) => {
            const pos = contextMenuPosRef.current;
            const doc = await createDocument(title, type, null, content);
            if (doc) {
              if (lightMode) {
                try { localStorage.setItem(`flux_doc_light_${doc.id}`, "1"); } catch {}
              }
              if (pos) updatePageDocPosition(doc.id, pos);
              setPages(prev => prev.map((p, i) => i === activePageIndex
                ? { ...p, visibleDocIds: [...(p.visibleDocIds ?? []), doc.id] }
                : p
              ));
            }
            contextMenuPosRef.current = null;
            toast.success(`${title} created`);
          }}
          onClose={() => setShowTemplateChooser(false)}
        />
      )}

      {/* Clock editor */}
      {clockEditorOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[3px]" onMouseDown={() => setClockEditorOpen(false)} />
          {activeWidgets.includes("clock") && (
            <div className="absolute inset-0 z-[65] pointer-events-none">
              <div className="pointer-events-auto w-full h-full">
                <ClockWidget onOpenEditor={() => setClockEditorOpen(true)} />
              </div>
            </div>
          )}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] w-[92vw] max-w-md">
            <ClockEditor onClose={() => setClockEditorOpen(false)} />
          </div>
        </>
      )}

      {/* Widget Style Editor Focus Mode — portaled to body to escape stacking context */}
      {styleEditorTarget && createPortal(
        <>
          {/* Overlay — dims everything below z-60, click to close */}
          <motion.div
            key="style-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            style={{ zIndex: 60, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setStyleEditorTarget(null)}
          />
          {/* Editor popup */}
          <motion.div
            key="style-editor-popup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed"
            style={{ zIndex: 80, left: editorPosition.x, top: editorPosition.y, pointerEvents: "auto" }}
          >
            <WidgetStyleEditor
              style={activeStyle.style}
              onUpdate={activeStyle.update}
              onReset={activeStyle.reset}
              onClose={() => setStyleEditorTarget(null)}
            />
          </motion.div>
        </>,
        document.body
      )}

      <ToolDrawer
        pageActiveWidgets={pageActiveWidgets}
        onTogglePageWidget={(id) => {
          const updated = pageActiveWidgets.includes(id)
            ? pageActiveWidgets.filter(w => w !== id)
            : [...pageActiveWidgets, id];
          updatePageWidgets(updated);
        }}
      />


      {/* ── Intention Modal — shown before enabling focus mode ── */}
      <FocusIntentionModal
        open={intentionModalOpen}
        onConfirm={(taskTitle, durationSeconds) => {
          setIntentionModalOpen(false);
          enableFocusMode(taskTitle, durationSeconds);
        }}
        onCancel={() => setIntentionModalOpen(false)}
      />

      {/* ── iOS-style Dashboard Pagination ── pill (drag only in build mode) */}

      {/* ── iOS-style Dashboard Pagination ── pill (drag only in build mode) */}





      {/* ── iOS-style Dashboard Pagination ── pill (drag only in build mode) */}
      {/* IMPORTANT: pillRef wraps ONLY the pill row so getBoundingClientRect() always reflects
          the pill's exact visual position regardless of build/focus mode. All floating UI
          (label, build controls, settings panel, hover cards) is positioned absolutely
          above via bottom: calc(100% + Npx) so it never affects the wrapper's own size. */}
      {paginationSettings.showPagination && (() => {
        const pillBg = hexToRgbaPill(pillStyle.bgColor || "#0f0c19", pillStyle.bgOpacity / 100);
        const pillBorder = pillStyle.borderWidth > 0
          ? `${pillStyle.borderWidth}px solid ${hexToRgbaPill(pillStyle.borderColor, pillStyle.borderOpacity / 100)}`
          : "none";
        const pillTextAlpha = pillStyle.textOpacity / 100;
        const pillTextRgba = hexToRgbaPill(pillStyle.textColor || "#ffffff", pillTextAlpha);
        const pillSharedStyle: React.CSSProperties = {
          cursor: systemMode === "build" ? (isDraggingPill ? "grabbing" : "grab") : "default",
          background: pillBg,
          backdropFilter: `blur(${pillStyle.blurAmount}px)`,
          WebkitBackdropFilter: `blur(${pillStyle.blurAmount}px)`,
          border: pillBorder || (systemMode === "build" ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.18)"),
          borderRadius: pillStyle.borderRadius,
          boxShadow: isDraggingPill
            ? "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.3)"
            : "0 8px 32px rgba(0,0,0,0.55)",
        };
        return (
        <motion.div
          ref={pillRef}
          className="fixed z-[9999] group flex items-center gap-2.5 px-4 py-2 select-none"
          animate={
            isFocusModeActive
              ? { opacity: 0, y: 20, pointerEvents: "none" as const }
              : pillBouncing
              ? { scale: [1, 1.06, 0.97, 1.02, 1], opacity: 1, y: 0 }
              : { scale: 1, opacity: 1, y: 0 }
          }
          transition={pillBouncing ? { duration: 0.45, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 20 }}
          style={{
            ...(pillPos
              ? { left: pillPos.x, top: pillPos.y, transform: "none", ...pillSharedStyle }
              : { left: "calc(50% + 130px)", bottom: "96px", transform: "translateX(-50%)", ...pillSharedStyle }),
            pointerEvents: isFocusModeActive ? "none" : undefined,
          }}
          onPointerDown={handlePillPointerDown}
          onPointerMove={handlePillPointerMove}
          onPointerUp={handlePillPointerUp}
          onPointerLeave={handlePillPointerUp}
        >
          {/* ── ALL floating content above the pill — absolutely positioned, never in flow ── */}
          <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none" style={{ width: "max-content" }}>

            {/* Build mode controls */}
            <AnimatePresence>
              {systemMode === "build" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-1.5 pointer-events-auto"
                >
                  <button
                    onClick={() => setShowPillSettings(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                    style={{ background: showPillSettings ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.18)" }}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    🎨 Style
                  </button>
                  <button
                    onClick={() => setPillPos(null)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onPointerDown={e => e.stopPropagation()}
                    title="Reset pill position"
                  >
                    ⌖
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Page label */}
            {paginationSettings.showLabel && (
              <div className="flex items-center h-5 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
                {dashboardPages.map((page, i) => {
                  if (i !== activePageIndex) return null;
                  if (editingLabelIdx === i) {
                    return (
                      <input
                        key={page.id}
                        ref={labelInputRef}
                        value={editingLabelValue}
                        onChange={e => setEditingLabelValue(e.target.value)}
                        onBlur={commitLabelEdit}
                        onKeyDown={e => { if (e.key === "Enter") commitLabelEdit(); if (e.key === "Escape") setEditingLabelIdx(null); }}
                        className="text-[11px] font-medium text-center outline-none bg-transparent border-b border-white/40 w-28"
                        style={{ color: pillTextRgba }}
                        maxLength={20}
                        autoFocus
                      />
                    );
                  }
                  return (
                    <span
                      key={page.id}
                      className="text-[11px] font-medium cursor-default select-none"
                      style={{ color: hexToRgbaPill(pillStyle.textColor || "#ffffff", pillTextAlpha * 0.7) }}
                      onDoubleClick={() => startLabelEdit(i)}
                      title="Double-click to rename"
                    >
                      {page.label || "Home"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Full style panel — build mode only */}
          <AnimatePresence>
            {showPillSettings && systemMode === "build" && (
              <PillStylePanel
                style={pillStyle}
                onUpdate={updatePillStyle}
                onReset={resetPillStyle}
                onClose={() => setShowPillSettings(false)}
                showLabel={paginationSettings.showLabel}
                onToggleLabel={() => setPaginationSettings(s => ({ ...s, showLabel: !s.showLabel }))}
                showPagination={paginationSettings.showPagination}
                onTogglePagination={() => setPaginationSettings(s => ({ ...s, showPagination: !s.showPagination }))}
              />
            )}
          </AnimatePresence>

          {/* ← → keyboard hint — Focus mode only, group-hover */}
          <AnimatePresence>
            {systemMode !== "build" && hoverDotIdx === null && dashboardPages.length > 1 && (
              <motion.div
                key="key-hint"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: "rgba(10,8,20,0.85)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                  <span className="text-[10px] font-mono text-white/50 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">←</span>
                  <span className="text-[9px] text-white/30">navigate</span>
                  <span className="text-[10px] font-mono text-white/50 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">→</span>
                </div>
                <div className="w-2 h-2 mx-auto -mt-1 rotate-45 rounded-sm" style={{ background: "rgba(10,8,20,0.85)", borderRight: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Build mode drag hint — group-hover */}
          <AnimatePresence>
            {systemMode === "build" && !isDraggingPill && hoverDotIdx === null && (
              <motion.div
                key="build-drag-hint"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
              >

                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: "rgba(10,8,20,0.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                  <span className="text-[10px] text-white/40">✥ drag pill</span>
                  <span className="text-[9px] text-white/20">·</span>
                  <span className="text-[10px] text-white/40">grab dot to reorder</span>
                </div>
                <div className="w-2 h-2 mx-auto -mt-1 rotate-45 rounded-sm" style={{ background: "rgba(10,8,20,0.88)", borderRight: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dot hover page thumbnail preview */}
          <AnimatePresence>
            {hoverDotIdx !== null && hoverDotIdx !== activePageIndex && (
              <motion.div
                key={`preview-${hoverDotIdx}`}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 pointer-events-none z-10"
              >
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,8,20,0.92)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 32px rgba(0,0,0,0.65)", width: 160 }}>
                  <div className="relative w-full overflow-hidden" style={{ height: 90 }}>
                    {pageThumbnails[dashboardPages[hoverDotIdx]?.id] ? (
                      <img src={pageThumbnails[dashboardPages[hoverDotIdx].id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0" style={{ background: dashboardPages[hoverDotIdx]?.background ? "rgba(30,20,60,0.8)" : "rgba(20,15,40,0.7)" }} />
                        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
                        {(() => {
                          const widgets = dashboardPages[hoverDotIdx]?.activeWidgets ?? activeWidgets;
                          const WC: Record<string, string> = { clock: "#a78bfa", timer: "#f472b6", music: "#34d399", planner: "#60a5fa", notes: "#fbbf24", crm: "#f87171", stats: "#818cf8", scratchpad: "#fb923c", quote: "#e879f9", breathing: "#22d3ee", council: "#a3e635", aura: "#c084fc", routine: "#4ade80" };
                          const WL: Record<string, string> = { clock: "🕐", timer: "⏱", music: "🎵", planner: "📋", notes: "📝", crm: "👥", stats: "📊", scratchpad: "✏️", quote: "💬", breathing: "🫁", council: "🤝", aura: "✨", routine: "🔄" };
                          return widgets.slice(0, 8).map((w, wi) => {
                            const col = wi % 4; const row = Math.floor(wi / 4);
                            const x = 8 + col * 38; const y = 8 + row * 26;
                            const color = WC[w] || "#6b7280";
                            return <div key={w} className="absolute flex items-center justify-center rounded" style={{ left: x, top: y, width: 34, height: 22, background: `${color}22`, border: `1px solid ${color}44` }}><span style={{ fontSize: 10 }}>{WL[w] || "□"}</span></div>;
                          });
                        })()}
                      </>
                    )}
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-white/85 truncate">{dashboardPages[hoverDotIdx]?.label || `Page ${hoverDotIdx + 1}`}</p>
                    <span className="text-[9px] text-white/35 flex-shrink-0">
                      {(dashboardPages[hoverDotIdx]?.activeWidgets ?? activeWidgets).length}w
                      {(dashboardPages[hoverDotIdx]?.stickyNotes?.length ?? 0) > 0 ? ` · ${dashboardPages[hoverDotIdx].stickyNotes!.length}📌` : ""}
                    </span>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 mx-auto -mt-[1px] rotate-45 rounded-sm" style={{ background: "rgba(10,8,20,0.92)", borderRight: "1px solid rgba(255,255,255,0.14)", borderBottom: "1px solid rgba(255,255,255,0.14)" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dots */}
          {dashboardPages.map((page, i) => (
              <button
                key={page.id}
                onClick={() => { if (draggingDotIdx === null) goToPage(i); }}
                onDoubleClick={() => startLabelEdit(i)}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDotMenu({ idx: i, x: e.clientX, y: e.clientY }); }}
                onTouchStart={(e) => handleDotTouchStart(i, e)}
                onTouchEnd={handleDotTouchEnd}
                onMouseEnter={() => setHoverDotIdx(i)}
                onMouseLeave={() => setHoverDotIdx(null)}
                draggable={systemMode === "build"}
                onDragStart={() => systemMode === "build" && handleDotDragStart(i)}
                onDragOver={(e) => systemMode === "build" && handleDotDragOver(i, e)}
                onDrop={() => systemMode === "build" && handleDotDrop(i)}
                onDragEnd={() => { setDraggingDotIdx(null); setDragOverIdx(null); }}
                onPointerDown={e => e.stopPropagation()}
                className="transition-all duration-300 flex-shrink-0"
                title={systemMode === "build" ? `${page.label || `Page ${i + 1}`} — drag to reorder` : page.label || `Page ${i + 1}`}
                style={{
                  width: i === activePageIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 9999,
                  cursor: systemMode === "build" ? (draggingDotIdx === i ? "grabbing" : "grab") : "pointer",
                  background: draggingDotIdx === i
                    ? "rgba(255,255,255,0.15)"
                    : dragOverIdx === i
                    ? "rgba(255,255,255,0.7)"
                    : i === activePageIndex
                    ? "rgba(255,255,255,1)"
                    : "rgba(255,255,255,0.35)",
                  boxShadow: i === activePageIndex && draggingDotIdx !== i ? "0 0 10px rgba(255,255,255,0.7)" : "none",
                  opacity: draggingDotIdx === i ? 0.4 : 1,
                  transform: dragOverIdx === i && draggingDotIdx !== i ? "scale(1.4)" : "scale(1)",
                }}
              />
            ))}
            {/* Separator between dots and + */}
            <div className="w-px h-3 rounded-full mx-1" style={{ background: "rgba(255,255,255,0.18)" }} />
            {/* Plus */}
            <button
              onClick={addPage}
              onPointerDown={e => e.stopPropagation()}
              className="flex items-center justify-center transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
              title="Add page"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
        </motion.div>
        );
      })()}

      {/* Build mode: show pagination button when hidden */}
      {!paginationSettings.showPagination && systemMode === "build" && (
        <button
          onClick={() => setPaginationSettings(s => ({ ...s, showPagination: true }))}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-3 py-1.5 rounded-full text-[10px] font-medium"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Show pagination
        </button>
      )}

      {/* Dot context menu (right-click / long-press) */}
      {dotMenu && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => { setDotMenu(null); setDeleteConfirmIdx(null); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[10001] rounded-xl py-1.5 overflow-hidden"
            style={{
              left: Math.max(8, Math.min(dotMenu.x, window.innerWidth - 208)),
              bottom: window.innerHeight - dotMenu.y + 8,
              minWidth: 200,
              maxHeight: "70vh",
              overflowY: "auto",
              background: "rgba(10,8,20,0.94)", backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
              transition: "min-width 0.18s ease",
            }}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-white/35 uppercase tracking-wider">
              {dashboardPages[dotMenu.idx]?.label || `Page ${dotMenu.idx + 1}`}
            </div>
            <div className="h-px bg-white/10 mx-2 mb-1" />
            <button
              onClick={() => { startLabelEdit(dotMenu.idx); setDotMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors"
            >✏️ Rename</button>
            <button
              onClick={() => { goToPage(dotMenu.idx); setDotMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors"
            >→ Switch to page</button>
            <button
              onClick={() => duplicatePage(dotMenu.idx)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors"
            >⧉ Duplicate page</button>

            {dashboardPages.length > 1 && (
              <>
                <div className="h-px bg-white/10 mx-2 my-1" />
                {deleteConfirmIdx === dotMenu.idx ? (
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-white/60 mb-2">
                      {(dashboardPages[dotMenu.idx]?.activeWidgets || dashboardPages[dotMenu.idx]?.stickyNotes)
                        ? "This page has custom content. Delete anyway?"
                        : "Delete this page?"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deletePage(dotMenu.idx)}
                        className="flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-red-500/70 hover:bg-red-500/90 transition-colors"
                      >Delete</button>
                      <button
                        onClick={() => setDeleteConfirmIdx(null)}
                        className="flex-1 px-2 py-1 rounded-lg text-[11px] text-white/50 hover:bg-white/8 transition-colors"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmIdx(dotMenu.idx)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
                  >🗑 Delete page</button>
                )}
              </>
            )}
          </motion.div>
        </>
      )}

      {/* ── Keyboard Shortcuts Cheat Sheet (Cmd+?) ── */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10002]"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
              onClick={() => setShowShortcuts(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed z-[10003] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-5 min-w-[300px]"
              style={{ background: "rgba(10,8,20,0.96)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Keyboard Shortcuts</p>
                <button onClick={() => setShowShortcuts(false)} className="text-white/30 hover:text-white/70 text-lg leading-none">×</button>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { keys: ["←", "→"], label: "Navigate pages" },
                  { keys: ["← hold", "→ hold"], label: "Mission Control" },
                  { keys: ["⌘T"], label: "New page" },
                  { keys: ["⌘W"], label: "Close current page (Undo available)" },
                  { keys: ["⌘?"], label: "Toggle this cheat sheet" },
                ].map(({ keys, label }) => (
                  <div key={label} className="flex items-center justify-between gap-6">
                    <span className="text-[12px] text-white/60">{label}</span>
                    <div className="flex items-center gap-1">
                      {keys.map(k => (
                        <kbd key={k} className="px-2 py-0.5 rounded-md text-[11px] font-mono text-white/70" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/20 text-center mt-4">Windows: Ctrl instead of ⌘</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mission Control overlay (hold ←/→ for 300ms) ── */}
      <AnimatePresence>
        {showMissionControl && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[10200]"
              style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
              onClick={() => setShowMissionControl(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed inset-0 z-[10201] flex flex-col items-center justify-center gap-6 pointer-events-none"
            >
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">Mission Control</p>
              <div
                className="flex flex-wrap items-center justify-center gap-4 px-8 pointer-events-auto"
                style={{ maxWidth: Math.min(window.innerWidth - 40, Math.ceil(Math.sqrt(dashboardPages.length)) * 200) }}
              >
                {dashboardPages.map((page, i) => {
                  const isActive = i === activePageIndex;
                  const thumb = pageThumbnails[page.id];
                  const widgets = page.activeWidgets ?? [];
                  const WC: Record<string, string> = { clock: "#a78bfa", timer: "#f472b6", music: "#34d399", planner: "#60a5fa", notes: "#fbbf24", crm: "#f87171", stats: "#818cf8", scratchpad: "#fb923c", quote: "#e879f9", breathing: "#22d3ee", council: "#a3e635", aura: "#c084fc" };
                  const WL: Record<string, string> = { clock: "🕐", timer: "⏱", music: "🎵", planner: "📋", notes: "📝", crm: "👥", stats: "📊", scratchpad: "✏️", quote: "💬", breathing: "🫁", council: "🤝", aura: "✨" };
                  return (
                    <motion.button
                      key={page.id}
                      onClick={() => { goToPage(i); setShowMissionControl(false); }}
                      initial={{ opacity: 0, y: 16, scale: 0.88 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.06, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center gap-2 group"
                    >
                      {/* Thumbnail card */}
                      <div
                        className="relative rounded-2xl overflow-hidden transition-all duration-200"
                        style={{
                          width: 160, height: 100,
                          border: isActive ? "2px solid rgba(255,255,255,0.7)" : "2px solid rgba(255,255,255,0.12)",
                          boxShadow: isActive
                            ? "0 0 0 3px rgba(255,255,255,0.15), 0 16px 48px rgba(0,0,0,0.7)"
                            : "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="absolute inset-0" style={{ background: page.background ? "rgba(30,20,60,0.85)" : "rgba(20,15,40,0.8)" }} />
                            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
                            <div className="absolute inset-0 p-2 grid grid-cols-4 gap-1 content-start">
                              {widgets.slice(0, 8).map((w) => (
                                <div key={w} className="flex items-center justify-center rounded" style={{ height: 20, background: `${WC[w] || "#6b7280"}22`, border: `1px solid ${WC[w] || "#6b7280"}44` }}>
                                  <span style={{ fontSize: 9 }}>{WL[w] || "□"}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/60" />
                        )}
                      </div>
                      {/* Label */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors">{page.label || `Page ${i + 1}`}</span>
                        <span className="text-[10px] text-white/30">{widgets.length} widget{widgets.length !== 1 ? "s" : ""}</span>
                      </div>
                      {/* Active indicator dot */}
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70" />}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/20 pointer-events-none">Click a page to jump · Esc to close</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </StyleEditorProvider>
  );
};

const FocusDashboardView = () => (
  <FocusProvider>
    <WindowManagerProvider>
      <FocusContent />
    </WindowManagerProvider>
  </FocusProvider>
);

export default FocusDashboardView;
