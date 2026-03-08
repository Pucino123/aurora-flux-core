import React, { useState, useMemo } from "react";
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
  const { windows, bringToFront, restoreWindow, closeWindow, focusedId } = useWindowManager();
  const { trash } = useTrash();
  const { isFocusModeActive } = useFocusMode();
  const [moreOpen, setMoreOpen]     = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [trashOpen, setTrashOpen]   = useState(false);
  const [hoveredWin, setHoveredWin] = useState<string | null>(null);

  return (
    <>
        <motion.div
        layout
        layoutId="widget-toggle-bar"
        animate={{ opacity: isFocusModeActive ? 0 : 1, y: isFocusModeActive ? 40 : 0 }}
        transition={{ duration: 0.3, layout: { duration: 0.25, ease: "easeInOut" } }}
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

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* ── More overflow menu ── */}
        <div className="relative">
          <button onClick={() => setMoreOpen(!moreOpen)} title="More tools"
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${moreOpen ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
            <Plus size={15} className={`transition-transform ${moreOpen ? "rotate-45" : ""}`} />
            <span className="hidden sm:inline">More</span>
            {windows.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-black/30 sm:hidden">
                {windows.length > 9 ? "9+" : windows.length}
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

        {/* ── Open windows ── */}
        <AnimatePresence initial={false}>
          {windows.length > 0 && (
            <motion.div key="win-section" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1 overflow-hidden">
              <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
              {windows.map((win) => {
                const isMinimized = win.minimized;
                const isFocused   = win.id === focusedId && !isMinimized;
                const isHovered   = hoveredWin === win.id;
                return (
                  <motion.div key={win.id} layoutId={`window-${win.id}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15, layout: { duration: 0.3, ease: "easeInOut" } }}
                    className="relative shrink-0"
                    onMouseEnter={() => setHoveredWin(win.id)}
                    onMouseLeave={() => setHoveredWin(null)}>
                    <button
                      onClick={() => isMinimized ? restoreWindow(win.id) : bringToFront(win.id)}
                      title={win.title}
                      className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full text-xs font-medium transition-all max-w-[120px] ${
                        isMinimized
                          ? "bg-white/5 text-white/35 border border-white/10"
                          : isFocused
                            ? "bg-white/20 text-white border border-white/25 shadow-[0_0_12px_hsl(var(--aurora-violet)/0.35)]"
                            : "bg-white/10 text-white/70 border border-white/15 hover:bg-white/15 hover:text-white"
                      }`}>
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate hidden sm:inline">{win.title}</span>
                      {isMinimized && <span className="w-1.5 h-1.5 rounded-full bg-white/30 ml-0.5 shrink-0" />}
                    </button>

                    {/* Close button on hover */}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Trash ── */}
        <div className="w-px h-5 bg-white/15 mx-1" />
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
