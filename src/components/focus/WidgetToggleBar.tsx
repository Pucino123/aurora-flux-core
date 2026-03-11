import React, { useState, useEffect, useRef } from "react";
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

const WINDOW_TYPE_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  widget: Sparkles,
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// macOS-style bounce keyframes: chip bounces up-down 2x then settles
const bounceVariants = {
  idle: { y: 0 },
  bounce: {
    y: [0, -8, 0, -5, 0, -2, 0],
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

// Individual window chip with bounce + tooltip + magnification
const WindowChip = ({
  win,
  focusedId,
  onRestore,
  onBringToFront,
  onClose,
  shouldBounce,
}: {
  win: ReturnType<typeof useWindowManager>["windows"][number];
  focusedId: string | null;
  onRestore: (id: string) => void;
  onBringToFront: (id: string) => void;
  onClose: (id: string) => void;
  shouldBounce: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const prevBounce = useRef(false);

  useEffect(() => {
    if (shouldBounce && !prevBounce.current) {
      setBounceKey(k => k + 1);
    }
    prevBounce.current = shouldBounce;
  }, [shouldBounce]);

  const isMinimized = !!win.minimized;
  const isFocused   = win.id === focusedId && !isMinimized;
  const WinIcon     = WINDOW_TYPE_ICONS[win.type] || FileText;

  return (
    <motion.div
      key={win.id}
      // Only minimized chips own the layoutId — active window's wrapper in FocusDashboardView owns it while open
      layoutId={isMinimized ? `window-${win.id}` : undefined}
      variants={bounceVariants}
      animate={shouldBounce ? "bounce" : "idle"}
      whileHover={{ scale: 1.12 }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      exit={{ opacity: 0, scale: 0.4, y: 16 }}
      transition={{ duration: 0.2, layout: { duration: 0.3, ease: "easeInOut" } }}
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Frosted tooltip ── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 rounded-xl bg-black/65 backdrop-blur-[24px] border border-white/15 shadow-2xl min-w-[150px] max-w-[210px] pointer-events-none z-50"
          >
            <div className="flex items-center gap-2 mb-1">
              <WinIcon size={12} className="text-white/60 shrink-0" />
              <span className="text-[11px] font-semibold text-white truncate">{win.title}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-wider text-white/30 font-medium">{win.type}</span>
              <span className="text-[9px] text-white/30">{timeAgo(win.lastActiveAt)}</span>
            </div>
            {isMinimized && (
              <span className="text-[9px] text-white/40 mt-0.5 block">Click to restore</span>
            )}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => isMinimized ? onRestore(win.id) : onBringToFront(win.id)}
        className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full text-xs font-medium transition-colors max-w-[120px] ${
          isMinimized
            ? "bg-white/5 text-white/40 border border-white/10"
            : isFocused
              ? "bg-white/20 text-white border border-white/25 shadow-[0_0_12px_hsl(var(--aurora-violet)/0.35)]"
              : "bg-white/10 text-white/65 border border-white/15 hover:bg-white/15 hover:text-white"
        }`}
      >
        <WinIcon size={13} className="shrink-0" />
        <span className="truncate hidden sm:inline">{win.title}</span>
        {isMinimized && <span className="w-1.5 h-1.5 rounded-full bg-white/35 ml-0.5 shrink-0" />}
      </button>

      {/* ── Close ×  on hover ── */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-white/70 hover:bg-red-500/70 hover:text-white transition-all z-10"
          >
            <X size={9} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const WidgetToggleBar = () => {
  const { activeWidgets, toggleWidget, resetDashboard, widgetMinimalMode, setWidgetMinimalMode } = useFocusStore();
  const { windows, bringToFront, restoreWindow, closeWindow, focusedId } = useWindowManager();
  const { trash } = useTrash();
  const { isFocusModeActive } = useFocusMode();
  const [moreOpen, setMoreOpen]     = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [trashOpen, setTrashOpen]   = useState(false);

  // Track which background (non-focused) windows should bounce once
  const [bounceIds, setBounceIds] = useState<Set<string>>(new Set());
  const prevFocusedRef = useRef<string | null>(null);

  useEffect(() => {
    if (focusedId && focusedId !== prevFocusedRef.current) {
      // Any previously bouncing window that is now focused → stop bounce
      setBounceIds(prev => {
        const next = new Set(prev);
        next.delete(focusedId);
        return next;
      });
    }
    prevFocusedRef.current = focusedId;
  }, [focusedId]);

  // Trigger a bounce for background open (non-focused) windows
  const triggerBounce = (id: string) => {
    setBounceIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setBounceIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 700);
  };

  // Split: active (non-minimized) go left, minimized go right of separator
  const activeWindows    = windows.filter(w => !w.minimized);
  const minimizedWindows = windows.filter(w => w.minimized);

  const handleBringToFront = (id: string) => {
    bringToFront(id);
    // bounce other open (non-focused) windows briefly
    activeWindows.forEach(w => { if (w.id !== id) triggerBounce(w.id); });
  };

  const handleRestore = (id: string) => {
    restoreWindow(id);
  };

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
        <button onClick={() => { resetDashboard(); window.dispatchEvent(new CustomEvent("reset-pill-pos")); }} title="Reset dashboard"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
          <RotateCcw size={15} />
        </button>

        {/* ── Active (non-minimized) windows — left of separator ── */}
        <AnimatePresence initial={false}>
          {activeWindows.length > 0 && (
            <motion.div key="active-wins" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1 overflow-hidden">
              <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
              {activeWindows.map(win => (
                <WindowChip
                  key={win.id}
                  win={win}
                  focusedId={focusedId}
                  onBringToFront={handleBringToFront}
                  onRestore={handleRestore}
                  onClose={closeWindow}
                  shouldBounce={bounceIds.has(win.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── macOS-style: minimized windows appear RIGHT of the separator ── */}
        <AnimatePresence initial={false}>
          {minimizedWindows.length > 0 && (
            <motion.div key="minimized-wins" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1 overflow-hidden">
              {/* Dashed separator — macOS uses a subtle divider here */}
              <div className="w-px h-5 mx-1 shrink-0" style={{ background: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 3px, transparent 3px, transparent 6px)" }} />
              {minimizedWindows.map(win => (
                <WindowChip
                  key={win.id}
                  win={win}
                  focusedId={focusedId}
                  onBringToFront={handleBringToFront}
                  onRestore={handleRestore}
                  onClose={closeWindow}
                  shouldBounce={false}
                />
              ))}
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
