import React, { useState, useCallback, useRef } from "react";
import { FocusProvider, useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { suggestIcon } from "@/components/CreateFolderModal";
import BackgroundEngine from "./BackgroundEngine";
import FocusTimer from "./FocusTimer";
import DesktopFolder from "./DesktopFolder";
import FolderModal from "./FolderModal";
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
import { FolderPlus, StickyNote } from "lucide-react";
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
  const [clockEditorOpen, setClockEditorOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [dragState, setDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show on canvas background, not on widgets/folders
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
    // Ensure notes widget is active
    if (!activeWidgets.includes("notes")) {
      // Toggle it on via the store if possible
    }
  }, [focusStickyNotes, setFocusStickyNotes, activeWidgets]);

  // Handle drag state changes and nesting on pointer up
  const handleDragStateChange = useCallback((state: { id: string; x: number; y: number } | null) => {
    if (state === null && dragStateRef.current) {
      // Pointer up — check if the dragged folder's center is within another folder's bounding box
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

  // Handle drag-out from modal
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("modal-folder-id")) {
      e.preventDefault();
    }
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    const modalFolderId = e.dataTransfer.getData("modal-folder-id");
    if (modalFolderId) {
      e.preventDefault();
      moveFolder(modalFolderId, null as any);
    }
  }, [moveFolder]);

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
              onDragStateChange={handleDragStateChange}
            />
          ))}

          {/* Folder Modal */}
          {openFolderId && (
            <FolderModal folderId={openFolderId} onClose={() => setOpenFolderId(null)} />
          )}
        </div>
      </div>

      {/* Canvas right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setContextMenu(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[91] bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl py-1.5 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { setContextMenu(null); setShowCreateFolder(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg mx-0"
            >
              <FolderPlus size={14} className="text-muted-foreground" /> New Folder
            </button>
            <button
              onClick={handleAddStickyNote}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-lg mx-0"
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
