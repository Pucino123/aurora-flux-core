import React, { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FocusProvider, useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { suggestIcon } from "@/components/CreateFolderModal";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import BackgroundEngine from "./BackgroundEngine";
import FocusTimer from "./FocusTimer";
import DesktopFolder from "./DesktopFolder";
import DesktopDocument from "./DesktopDocument";
import FolderModal from "./FolderModal";
import DesktopDocumentViewer from "./DesktopDocumentViewer";
import MusicWidget from "./MusicWidget";
import TodaysPlanWidget from "./TodaysPlanWidget";
import FocusStickyNotes from "./FocusStickyNotes";
import ClockWidget from "./ClockWidget";
import FocusStatsWidget from "./FocusStatsWidget";
import ScratchpadWidget from "./ScratchpadWidget";
import QuoteOfDay from "./QuoteOfDay";
import ToolDrawer from "./ToolDrawer";
import BreathingWidget from "./BreathingWidget";
import FocusCouncilWidget from "./FocusCouncilWidget";
import RoutineBuilderWidget from "./RoutineBuilderWidget";
import ClockEditor from "./ClockEditor";
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
} from "./HomeWidgets";
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, StickyNote, FileText, Table } from "lucide-react";
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
  const { activeWidgets, systemMode, setFocusStickyNotes, focusStickyNotes } = useFocusStore();
  const { folderTree, createFolder, moveFolder } = useFlux();
  const { user } = useAuth();
  const { documents: desktopDocs, refetch: refetchDesktopDocs, updateDocument: updateDesktopDoc, removeDocument: removeDesktopDoc, createDocument } = useDocuments(null);
  const [clockEditorOpen, setClockEditorOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [openDesktopDoc, setOpenDesktopDoc] = useState<import("@/hooks/useDocuments").DbDocument | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [dragState, setDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const [docDragState, setDocDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const docDragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const handleCreateDocument = useCallback(async (type: "text" | "spreadsheet") => {
    setShowDocPicker(false);
    setContextMenu(null);
    const title = type === "text" ? "Untitled Document" : "Untitled Spreadsheet";
    await createDocument(title, type, null);
    toast.success(`${type === "text" ? "Document" : "Spreadsheet"} created`);
  }, [createDocument]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.desktop-folder, [data-widget], button, input, textarea')) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleAddStickyNote = useCallback(() => {
    setContextMenu(null);
    const COLORS = [
      { key: "yellow" }, { key: "purple" }, { key: "green" }, { key: "blue" },
      { key: "pink" }, { key: "orange" }, { key: "coral" }, { key: "mint" },
    ];
    const color = COLORS[focusStickyNotes.length % COLORS.length];
    const rotation = Math.round((Math.random() - 0.5) * 8);
    const vw = Math.min(window.innerWidth - 200, 500);
    const vh = Math.min(window.innerHeight - 250, 400);
    const baseX = 40 + Math.random() * Math.max(vw, 60);
    const baseY = 60 + Math.random() * Math.max(vh, 60);
    setFocusStickyNotes([
      ...focusStickyNotes,
      { id: `fn-${Date.now()}`, text: "", color: color.key, x: baseX, y: baseY, rotation, opacity: 1 },
    ]);
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
          // Move document into folder
          const folder = folderTree.find(f => f.id === targetId);
          if (user) {
            (supabase as any).from("documents").update({ folder_id: targetId }).eq("id", docId).then(() => {
              refetchDesktopDocs();
            });
          } else {
            // Local storage update
            const LS_KEY = "flux_local_documents";
            try {
              const raw = localStorage.getItem(LS_KEY);
              const docs = raw ? JSON.parse(raw) : [];
              localStorage.setItem(LS_KEY, JSON.stringify(docs.map((d: any) => d.id === docId ? { ...d, folder_id: targetId } : d)));
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

  return (
    <div
      className="relative w-full h-[100dvh] overflow-hidden bg-black"
      onContextMenu={handleContextMenu}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <BackgroundEngine embedded />
      <AnimatePresence>
        {systemMode === "focus" && (
          <motion.div
            key="vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[15] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)" }}
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

      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="pointer-events-auto w-full h-full">
          <AnimatePresence>
            {activeWidgets.includes("clock") && !clockEditorOpen && <ClockWidget key="clock" onOpenEditor={() => setClockEditorOpen(true)} />}
            {activeWidgets.includes("timer") && <FocusTimer key="timer" />}
            {activeWidgets.includes("music") && <MusicWidget key="music" />}
            {activeWidgets.includes("planner") && <TodaysPlanWidget key="planner" />}
            {activeWidgets.includes("notes") && <FocusStickyNotes key="notes" />}
            {activeWidgets.includes("stats") && <FocusStatsWidget key="stats" />}
            {activeWidgets.includes("scratchpad") && <ScratchpadWidget key="scratchpad" />}
            {activeWidgets.includes("quote") && <QuoteOfDay key="quote" />}
            {activeWidgets.includes("breathing") && <BreathingWidget key="breathing" />}
            {activeWidgets.includes("council") && <FocusCouncilWidget key="council" />}
            {activeWidgets.includes("routine") && <RoutineBuilderWidget key="routine" />}
            {activeWidgets.includes("budget-preview") && <FocusBudgetWidget key="budget-preview" />}
            {activeWidgets.includes("savings-ring") && <FocusSavingsWidget key="savings-ring" />}
            {activeWidgets.includes("weekly-workout") && <FocusWorkoutWidget key="weekly-workout" />}
            {activeWidgets.includes("project-status") && <FocusProjectStatusWidget key="project-status" />}
            {activeWidgets.includes("top-tasks") && <FocusTopTasksWidget key="top-tasks" />}
            {activeWidgets.includes("smart-plan") && <FocusSmartPlanWidget key="smart-plan" />}
            {activeWidgets.includes("gamification") && <FocusGamificationWidget key="gamification" />}
            {activeWidgets.includes("chat") && <FocusChatWidget key="chat" />}
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
            />
          ))}
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

      {/* Create folder modal */}
      {showCreateFolder && (
        <CreateFolderModal
          open={showCreateFolder}
          onClose={() => setShowCreateFolder(false)}
          onCreate={async (data) => {
            const parent = await createFolder({ title: data.title, type: "project", color: data.color, icon: data.icon });
            if (parent && data.subfolders.length > 0) {
              for (const sub of data.subfolders) {
                const subIcon = suggestIcon(sub);
                await createFolder({ title: sub, type: "project", parent_id: parent.id, color: data.color, icon: subIcon });
              }
            }
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

      <ToolDrawer />
    </div>
  );
};

const FocusDashboardView = () => (
  <FocusProvider>
    <FocusContent />
  </FocusProvider>
);

export default FocusDashboardView;
