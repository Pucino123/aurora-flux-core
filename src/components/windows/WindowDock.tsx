import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  X, FileText, Clock, Timer, Music, CalendarClock, StickyNote,
  BarChart3, Wind, Users2, DollarSign, PieChart, Dumbbell,
  ListTodo, Briefcase, Sparkles, Award, Brain, Orbit,
  MessageSquareQuote, LucideIcon,
  Home, CalendarDays, CheckSquare, Trash2,
} from "lucide-react";
import { useWindowManager, AppWindow } from "@/context/WindowManagerContext";
import { useFlux } from "@/context/FluxContext";
import { useTrash } from "@/context/TrashContext";
import { useFocusMode } from "@/context/FocusModeContext";
import TrashModal from "@/components/TrashModal";

const WIDGET_ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  timer: Timer,
  music: Music,
  planner: CalendarClock,
  notes: StickyNote,
  crm: Users2,
  stats: BarChart3,
  scratchpad: FileText,
  quote: MessageSquareQuote,
  breathing: Wind,
  council: Brain,
  aura: Orbit,
  "budget-preview": DollarSign,
  "savings-ring": PieChart,
  "weekly-workout": Dumbbell,
  "project-status": Briefcase,
  "top-tasks": ListTodo,
  "smart-plan": Sparkles,
  gamification: Award,
};

// ── Hover preview popup ───────────────────────────────────────────────────────
function TilePreview({ win, anchorRef }: { win: AppWindow; anchorRef: React.RefObject<HTMLDivElement> }) {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const previewW = 200, previewH = 120;
  const left = rect.left + rect.width / 2 - previewW / 2;
  const bottom = window.innerHeight - rect.top + 14;
  const Icon: LucideIcon = win.type === "widget" ? (WIDGET_ICONS[win.contentId] ?? FileText) : FileText;
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.93 }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      className="fixed pointer-events-none z-[10095] rounded-xl overflow-hidden"
      style={{
        left, bottom, width: previewW, height: previewH,
        background: "rgba(12,10,24,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <span className="w-2 h-2 rounded-full bg-red-500/50" /><span className="w-2 h-2 rounded-full bg-amber-400/50" /><span className="w-2 h-2 rounded-full bg-emerald-500/50" />
        <span className="flex-1 text-[9px] font-semibold truncate text-center" style={{ color: "rgba(255,255,255,0.5)" }}>{win.title}</span>
      </div>
      <div className="flex items-center justify-center h-[calc(100%-28px)]">
        <div className="flex flex-col items-center gap-1.5 opacity-40">
          <Icon size={28} className="text-white" />
          <span className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{win.title}</span>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}

// ── Window tile (minimized/open windows) ─────────────────────────────────────
function WindowTile({ win }: { win: AppWindow }) {
  const { restoreWindow, bringToFront, closeWindow } = useWindowManager();
  const Icon: LucideIcon = win.type === "widget" ? (WIDGET_ICONS[win.contentId] ?? FileText) : FileText;
  const isMinimized = !!win.minimized;
  const [hovered, setHovered] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);

  const handleClick = () => { if (isMinimized) restoreWindow(win.id); else bringToFront(win.id); };

  return (
    <motion.div
      ref={tileRef} layout layoutId={`dock-tile-${win.id}`}
      initial={{ opacity: 0, scale: 0.65, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.55, y: 10 }}
      transition={{ type: "spring", stiffness: 440, damping: 28 }}
      className="group relative flex flex-col items-center gap-1"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && !isMinimized && <TilePreview win={win} anchorRef={tileRef as React.RefObject<HTMLDivElement>} />}
      </AnimatePresence>
      <motion.button
        onClick={handleClick} title={win.title}
        whileHover={{ scale: 1.14, y: -4 }} whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 520, damping: 26 }}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl border ${
          isMinimized
            ? "bg-card/40 border-border/20"
            : "bg-primary/20 border-primary/40 shadow-[0_0_14px_hsl(var(--primary)/0.22)]"
        }`}
      >
        <Icon size={16} className={isMinimized ? "text-foreground/50" : "text-primary"} />
        {!isMinimized && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        {isMinimized && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-muted-foreground/50 border border-background" />}
      </motion.button>
      <button
        onClick={e => { e.stopPropagation(); closeWindow(win.id); }}
        title="Close"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
      >
        <X size={8} />
      </button>
      <span className="text-[9px] text-foreground/40 max-w-[44px] truncate text-center leading-tight select-none">{win.title}</span>
    </motion.div>
  );
}

// ── Static app button ─────────────────────────────────────────────────────────
function AppButton({
  icon: Icon, label, view, active, onClick,
}: {
  icon: LucideIcon;
  label: string;
  view?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      title={label}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      className={`relative flex flex-col items-center gap-1 group`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 ${
          active
            ? "bg-primary/20 border-primary/40 shadow-[0_0_14px_hsl(var(--primary)/0.25)]"
            : "bg-foreground/8 border-border/20 hover:bg-foreground/15 hover:border-border/40"
        }`}
      >
        <Icon size={17} className={active ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors"} />
      </div>
      {active && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
      <span className="text-[9px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors select-none">{label}</span>
    </motion.button>
  );
}

// ── Unified Dynamic Dock ──────────────────────────────────────────────────────
const WindowDock = () => {
  const { windows, restoreWindow } = useWindowManager();
  const { activeView, setActiveView } = useFlux();
  const { trash } = useTrash();
  const { isFocusModeActive } = useFocusMode();
  const [trashOpen, setTrashOpen] = useState(false);

  const minimizedWindows = windows.filter(w => w.minimized);
  const hasMinimized = minimizedWindows.length > 0;

  const staticApps: { icon: LucideIcon; label: string; view: string }[] = [
    { icon: Home,         label: "Home",     view: "stream"    },
    { icon: CalendarDays, label: "Calendar", view: "calendar"  },
    { icon: Users2,       label: "CRM",      view: "crm"       },
    { icon: CheckSquare,  label: "Tasks",    view: "tasks"     },
  ];

  return createPortal(
    <>
      <LayoutGroup id="window-manager">
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ bottom: "16px", maxWidth: "90vw", zIndex: 9000 }}
          animate={{
            opacity: isFocusModeActive ? 0 : 1,
            y: isFocusModeActive ? 24 : 0,
            pointerEvents: isFocusModeActive ? "none" : "auto",
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-end gap-2 px-3 py-2 rounded-2xl"
            style={{
              background: "rgba(10,8,20,0.82)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
            }}
          >
            {/* Static app icons */}
            {staticApps.map(app => (
              <AppButton
                key={app.view}
                icon={app.icon}
                label={app.label}
                view={app.view}
                active={activeView === app.view}
                onClick={() => setActiveView(app.view as any)}
              />
            ))}

            {/* Divider — only shown when windows exist */}
            <AnimatePresence>
              {(hasMinimized || windows.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  className="w-px bg-white/20 self-stretch mx-1"
                  style={{ minHeight: "32px" }}
                />
              )}
            </AnimatePresence>

            {/* Window tiles */}
            <AnimatePresence mode="popLayout">
              {windows.map(win => (
                <WindowTile key={win.id} win={win} />
              ))}
            </AnimatePresence>

            {/* Trash separator + icon */}
            <div className="w-px bg-white/20 self-stretch mx-1" style={{ minHeight: "32px" }} />
            <motion.button
              onClick={() => setTrashOpen(true)}
              title="Recently Deleted"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 520, damping: 28 }}
              className="relative flex flex-col items-center gap-1 group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-foreground/8 border-border/20 hover:bg-foreground/15 hover:border-border/40 transition-all duration-200">
                <Trash2 size={16} className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
              </div>
              {trash.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {trash.length > 9 ? "9+" : trash.length}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors select-none">Trash</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </LayoutGroup>

      <TrashModal open={trashOpen} onClose={() => setTrashOpen(false)} />
    </>,
    document.body
  );
};

export default WindowDock;
