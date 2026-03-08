import React, { useState } from "react";
import {
  Timer, Music, CalendarClock, StickyNote, RotateCcw, Clock,
  BarChart3, FileText, Plus, MessageSquareQuote, Eye, EyeOff,
  Wind, Users, Sparkles, Trash2, X,
} from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { AnimatePresence, motion } from "framer-motion";
import FocusReportModal from "./FocusReportModal";
import { useWindowManager } from "@/context/WindowManagerContext";
import { useTrash } from "@/context/TrashContext";
import { useFocusMode } from "@/context/FocusModeContext";
import TrashModal from "@/components/TrashModal";

const PRIMARY_WIDGETS = [
  { id: "clock",   label: "Clock",   icon: Clock },
  { id: "timer",   label: "Timer",   icon: Timer },
  { id: "music",   label: "Music",   icon: Music },
  { id: "planner", label: "Planner", icon: CalendarClock },
];

const OVERFLOW_WIDGETS = [
  { id: "quote",      label: "Quote",   icon: MessageSquareQuote },
  { id: "breathing",  label: "Breathe", icon: Wind },
  { id: "notes",      label: "Notes",   icon: StickyNote },
  { id: "stats",      label: "Stats",   icon: BarChart3 },
  { id: "scratchpad", label: "Scratch", icon: FileText },
  { id: "council",    label: "Council", icon: Users },
  { id: "aura",       label: "Aura",    icon: Sparkles },
];

const WidgetToggleBar = () => {
  const { activeWidgets, toggleWidget, resetDashboard, widgetMinimalMode, setWidgetMinimalMode } = useFocusStore();
  const { windows, restoreWindow, closeWindow } = useWindowManager();
  const { trash } = useTrash();
  const { isFocusModeActive } = useFocusMode();
  const [moreOpen, setMoreOpen]     = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [trashOpen, setTrashOpen]   = useState(false);
  const [hoveredWin, setHoveredWin] = useState<string | null>(null);

  // Only minimized windows appear as chips in the toolbar
  const minimizedWindows = windows.filter(w => w.minimized);
  const totalWindows = windows.length;

  return (
    <>
      <motion.div
        layout
        animate={{ opacity: isFocusModeActive ? 0 : 1, y: isFocusModeActive ? 40 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: isFocusModeActive ? "none" : undefined }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/20 shadow-lg"
      >
        {/* ── Static widget toggles ── */}
        {PRIMARY_WIDGETS.map(({ id, label, icon: Icon }) => {
          const active = activeWidgets.includes(id);
          return (
            <button key={id} onClick={() => toggleWidget(id)} title={label}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${active ? "bg-white/15 text-white shadow-[0_0_12px_hsl(var(--aurora-violet)/0.3)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <Icon size={15} /><span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}

        {/* ── Minimized window chips (appear between widget buttons and separator) ── */}
        <AnimatePresence initial={false}>
          {minimizedWindows.map((win) => {
            const isHovered = hoveredWin === win.id;
            return (
              <motion.div
                key={win.id}
                layoutId={`window-${win.id}`}
                initial={{ opacity: 0, scale: 0.6, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.6, width: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
                className="relative shrink-0 overflow-hidden"
                onMouseEnter={() => setHoveredWin(win.id)}
                onMouseLeave={() => setHoveredWin(null)}
              >
                <button
                  onClick={() => restoreWindow(win.id)}
                  title={`Restore: ${win.title}`}
                  className="flex items-center gap-1.5 pl-2 pr-2 py-1.5 rounded-full text-xs font-medium transition-all bg-white/8 text-white/50 border border-white/12 hover:bg-white/15 hover:text-white/80"
                >
                  <FileText size={12} className="shrink-0 opacity-70" />
                  <span className="truncate hidden sm:inline max-w-[80px] text-[10px]">{win.title}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
                </button>

                {/* ×  close button on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.1 }}
                      onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-white/70 hover:bg-red-500/60 hover:text-white transition-all z-10"
                    >
                      <X size={9} strokeWidth={2.5} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ── Separator ── */}
        <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />

        {/* ── More overflow menu ── */}
        <div className="relative">
          <button onClick={() => setMoreOpen(!moreOpen)} title="More tools"
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${moreOpen ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
            <Plus size={15} className={`transition-transform ${moreOpen ? "rotate-45" : ""}`} />
            <span className="hidden sm:inline">More</span>
            {/* Window count badge — always visible so users know how many windows are open */}
            {totalWindows > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-white/25 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                {totalWindows}
              </span>
            )}
          </button>
          <AnimatePresence>
            {moreOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-black/50 backdrop-blur-[20px] border border-white/15 shadow-2xl min-w-[180px]">
                <div className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-2 px-1">Widgets</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {OVERFLOW_WIDGETS.map(({ id, label, icon: Icon }) => {
                    const active = activeWidgets.includes(id);
                    return (
                      <button key={id} onClick={() => toggleWidget(id)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${active ? "bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                        <Icon size={16} /><span className="text-[10px]">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="w-full h-px bg-white/10 my-2" />
                <button onClick={() => { setReportOpen(true); setMoreOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                  <BarChart3 size={14} /><span>Focus Report</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Minimal / Reset ── */}
        <button onClick={() => setWidgetMinimalMode(!widgetMinimalMode)} title={widgetMinimalMode ? "Show widget chrome" : "Hide widget chrome"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${widgetMinimalMode ? "bg-white/15 text-white shadow-[0_0_12px_hsl(var(--aurora-violet)/0.3)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
          {widgetMinimalMode ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button onClick={resetDashboard} title="Reset dashboard"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
          <RotateCcw size={15} />
        </button>

        {/* ── Trash ── */}
        <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
        <button onClick={() => setTrashOpen(true)} title="Recently Deleted"
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
          <Trash2 size={15} />
          {trash.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[9px] font-bold flex items-center justify-center">
              {trash.length > 9 ? "9+" : trash.length}
            </span>
          )}
        </button>
      </motion.div>

      <FocusReportModal open={reportOpen} onOpenChange={setReportOpen} />
      <TrashModal open={trashOpen} onClose={() => setTrashOpen(false)} />
    </>
  );
};

export default WidgetToggleBar;
