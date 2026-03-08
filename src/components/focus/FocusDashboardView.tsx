import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { FocusProvider, useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { suggestIcon } from "@/components/CreateFolderModal";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { useWidgetStyle } from "@/hooks/useWidgetStyle";
import { StyleEditorProvider } from "./StyleEditorContext";
import BackgroundEngine from "./BackgroundEngine";
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
import {
  FocusBudgetWidget,
  FocusSavingsWidget,
  FocusWorkoutWidget,
  FocusProjectStatusWidget,
  FocusTopTasksWidget,
  FocusSmartPlanWidget,
  FocusGamificationWidget,
  FocusChatWidget,
  FocusCRMWidget,
} from "./HomeWidgets";
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, StickyNote, FileText, Table, Trash2, CalendarPlus, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";

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

const FocusContent = () => {
  const { activeWidgets, systemMode, setFocusStickyNotes, focusStickyNotes, updateDesktopFolderPosition, updateDesktopDocPosition, desktopFolderPositions, desktopDocPositions } = useFocusStore();
  const { folderTree, createFolder, moveFolder, removeFolder, createBlock } = useFlux();
  const { user } = useAuth();

  // iOS-style dashboard pages state
  type DashboardPage = { id: string; label: string; activeWidgets?: string[] };
  const [dashboardPages, setDashboardPages] = useState<DashboardPage[]>(() => {
    try {
      const raw = localStorage.getItem("flux-dashboard-pages");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate old format (just {id}) to new format
        return parsed.map((p: any) => ({ id: p.id, label: p.label || "Home", activeWidgets: p.activeWidgets }));
      }
    } catch {}
    return [{ id: "page-1", label: "Home" }];
  });
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageDir, setPageDir] = useState<1 | -1>(1);
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);
  // Touch swipe state
  const touchStartX = useRef<number | null>(null);

  // Persist pages
  useEffect(() => {
    localStorage.setItem("flux-dashboard-pages", JSON.stringify(dashboardPages));
  }, [dashboardPages]);

  const goToPage = useCallback((idx: number) => {
    setPageDir(idx > activePageIndex ? 1 : -1);
    setActivePageIndex(idx);
  }, [activePageIndex]);

  const addPage = useCallback(() => {
    const newPage: DashboardPage = { id: `page-${Date.now()}`, label: `Page ${dashboardPages.length + 1}` };
    setDashboardPages(prev => {
      const next = [...prev, newPage];
      localStorage.setItem("flux-dashboard-pages", JSON.stringify(next));
      return next;
    });
    setPageDir(1);
    setActivePageIndex(dashboardPages.length);
  }, [dashboardPages.length]);

  const startLabelEdit = useCallback((idx: number) => {
    setEditingLabelIdx(idx);
    setEditingLabelValue(dashboardPages[idx]?.label || "");
    setTimeout(() => labelInputRef.current?.select(), 50);
  }, [dashboardPages]);

  const commitLabelEdit = useCallback(() => {
    if (editingLabelIdx === null) return;
    const trimmed = editingLabelValue.trim() || dashboardPages[editingLabelIdx]?.label || "Page";
    setDashboardPages(prev => prev.map((p, i) => i === editingLabelIdx ? { ...p, label: trimmed } : p));
    setEditingLabelIdx(null);
  }, [editingLabelIdx, editingLabelValue, dashboardPages]);

  // Per-page active widgets — current page overrides global if set
  const currentPage = dashboardPages[activePageIndex];
  const pageActiveWidgets: string[] = currentPage?.activeWidgets ?? activeWidgets;

  const updatePageWidgets = useCallback((widgets: string[]) => {
    setDashboardPages(prev => prev.map((p, i) => i === activePageIndex ? { ...p, activeWidgets: widgets } : p));
  }, [activePageIndex]);

  // Touch swipe handlers
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
  const { documents: desktopDocs, refetch: refetchDesktopDocs, updateDocument: updateDesktopDoc, removeDocument: removeDesktopDoc, createDocument } = useDocuments(null);
  const [clockEditorOpen, setClockEditorOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [openDesktopDoc, setOpenDesktopDoc] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
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
    setShowDocPicker(false);
    setContextMenu(null);
    const title = type === "text" ? "Untitled Document" : "Untitled Spreadsheet";
    const doc = await createDocument(title, type, null);
    if (doc && pos) {
      updateDesktopDocPosition(doc.id, pos);
    }
    contextMenuPosRef.current = null;
    toast.success(`${type === "text" ? "Document" : "Spreadsheet"} created`);
  }, [createDocument, updateDesktopDocPosition]);

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
    const color = COLORS[focusStickyNotes.length % COLORS.length];
    const rotation = Math.round((Math.random() - 0.5) * 8);
    const baseX = pos ? pos.x : 40 + Math.random() * Math.min(window.innerWidth - 200, 500);
    const baseY = pos ? pos.y : 60 + Math.random() * Math.min(window.innerHeight - 250, 400);
    setFocusStickyNotes([
      ...focusStickyNotes,
      { id: `fn-${Date.now()}`, text: "", color: color.key, x: baseX, y: baseY, rotation, opacity: 1 },
    ]);
    contextMenuPosRef.current = null;
    if (!activeWidgets.includes("notes")) {
      // Toggle it on via the store if possible
    }
  }, [focusStickyNotes, setFocusStickyNotes, activeWidgets]);

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
        const fPos = desktopFolderPositions[folder.id] || { x: 40, y: 40 };
        if (fPos.x < r && fPos.x + 90 > l && fPos.y < b && fPos.y + 90 > t) ns.add(folder.id);
      });
      desktopDocs.forEach(doc => {
        const dPos = desktopDocPositions[doc.id] || { x: 0, y: 0 };
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
            updateDesktopFolderPosition(id, { x: Math.max(0, startPos.x + dx), y: Math.max(0, startPos.y + dy) });
          } else {
            updateDesktopDocPosition(id, { x: Math.max(0, startPos.x + dx), y: Math.max(0, startPos.y + dy) });
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
  }, [folderTree, desktopDocs, desktopFolderPositions, desktopDocPositions, toCanvasCoords, updateDesktopFolderPosition, updateDesktopDocPosition, moveFolder, user, refetchDesktopDocs]);

  const handleGroupDragStart = useCallback((e: React.PointerEvent, itemId: string) => {
    if (e.button !== 0) return false;
    if (!selectedIdsRef.current.has(itemId) || selectedIdsRef.current.size < 2) return false;
    e.stopPropagation();
    groupDraggingRef.current = true;
    groupDragOrigin.current = { x: e.clientX, y: e.clientY };
    const positions: Record<string, { x: number; y: number }> = {};
    selectedIdsRef.current.forEach((id) => {
      if (folderTree.some(f => f.id === id)) {
        positions[id] = desktopFolderPositions[id] || { x: 40, y: 40 };
      } else {
        positions[id] = desktopDocPositions[id] || { x: 0, y: 0 };
      }
    });
    groupDragStartPositions.current = positions;
    return true;
  }, [folderTree, desktopFolderPositions, desktopDocPositions]);

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
      className="relative w-full h-[100dvh] overflow-hidden bg-black"
      onContextMenu={handleContextMenu}
      onMouseDown={handleCanvasMouseDown}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <BackgroundEngine embedded />
      {/* Vignette always visible */}
      <div
        className="absolute inset-0 z-[15] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)" }}
      />
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
              initial={{ x: pageDir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: pageDir * -60, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="pointer-events-auto w-full h-full">
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
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Desktop Folders */}
          {folderTree.map((folder) => (
            <DesktopFolder
              key={folder.id}
              folder={folder}
              onOpenModal={setOpenFolderId}
              dragState={dragState}
              docDragState={docDragState}
              onDragStateChange={handleDragStateChange}
              onDocDropped={refetchDesktopDocs}
              isMarqueeSelected={selectedIds.has(folder.id)}
              onGroupDragStart={handleGroupDragStart}
              onSingleSelect={handleSingleSelect}
              onBulkContextMenu={handleBulkContextMenu}
            />
          ))}

          {/* Desktop Documents (unfiled) */}
          {desktopDocs.map((doc) => (
            <DesktopDocument
              key={doc.id}
              doc={doc}
              onOpen={(d) => setOpenDesktopDoc(d)}
              onDelete={(id) => { removeDesktopDoc(id); }}
              onRefetch={refetchDesktopDocs}
              dragState={docDragState}
              onDragStateChange={handleDocDragStateChange}
              isMarqueeSelected={selectedIds.has(doc.id)}
              onGroupDragStart={handleGroupDragStart}
              onSingleSelect={handleSingleSelect}
              onBulkContextMenu={handleBulkContextMenu}
            />
          ))}

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
            <FolderModal folderId={openFolderId} onClose={() => { setOpenFolderId(null); refetchDesktopDocs(); }} />
          )}
          {openDesktopDoc && (
            <DesktopDocumentViewer
              document={openDesktopDoc}
              onClose={() => { setOpenDesktopDoc(null); refetchDesktopDocs(); }}
              onUpdate={(id, updates) => {
                updateDesktopDoc(id, updates);
                setOpenDesktopDoc(prev => prev ? { ...prev, ...updates } : null);
              }}
              onDelete={(id) => {
                removeDesktopDoc(id);
                setOpenDesktopDoc(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Canvas right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => { setContextMenu(null); setShowDocPicker(false); }} />
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
              onClick={() => setShowDocPicker(!showDocPicker)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg"
            >
              <FileText size={14} className="text-muted-foreground" /> New Document
            </button>
            {showDocPicker && (
              <div className="mx-2 mb-1.5 rounded-lg border border-border/40 overflow-hidden">
                <button
                  onClick={() => handleCreateDocument("text")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <FileText size={13} className="text-primary" /> Text Document
                </button>
                <button
                  onClick={() => handleCreateDocument("spreadsheet")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <Table size={13} className="text-accent-foreground" /> Spreadsheet
                </button>
              </div>
            )}
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
              if (pos) {
                updateDesktopFolderPosition(parent.id, { x: pos.x, y: pos.y });
              }
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

      {/* ── iOS-style Dashboard Pagination ── positioned just above ToolDrawer (~60px from bottom) */}
      <div className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-1.5"
        style={{ bottom: "68px" }}
      >
        {/* Page labels row — show only active page label (or inline edit) */}
        <div className="flex items-center gap-3 h-5">
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
                  className="text-[11px] font-medium text-center outline-none bg-transparent border-b border-white/40 text-white w-24"
                  maxLength={20}
                  autoFocus
                />
              );
            }
            return (
              <span
                key={page.id}
                className="text-[11px] font-medium text-white/70 cursor-default select-none"
                onDoubleClick={() => startLabelEdit(i)}
                title="Double-click to rename"
              >
                {page.label || "Home"}
              </span>
            );
          })}
        </div>

        {/* Pill — dots + plus */}
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full"
          style={{
            background: "rgba(15,12,25,0.82)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          {dashboardPages.map((page, i) => (
            <button
              key={page.id}
              onClick={() => goToPage(i)}
              onDoubleClick={() => startLabelEdit(i)}
              className="transition-all duration-300 flex-shrink-0"
              title={page.label || `Page ${i + 1}`}
              style={{
                width: i === activePageIndex ? 24 : 8,
                height: 8,
                borderRadius: 9999,
                background: i === activePageIndex ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.35)",
                boxShadow: i === activePageIndex ? "0 0 10px rgba(255,255,255,0.7)" : "none",
              }}
            />
          ))}
          {/* Divider */}
          <div className="w-px h-4 bg-white/20" />
          {/* Plus */}
          <button
            onClick={addPage}
            className="flex items-center justify-center transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,1)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            title="Add page"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
    </StyleEditorProvider>
  );
};

const FocusDashboardView = () => (
  <FocusProvider>
    <FocusContent />
  </FocusProvider>
);

export default FocusDashboardView;
