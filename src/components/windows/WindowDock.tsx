import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Clock, Timer, Music, CalendarClock, StickyNote, BarChart3, Wind, Users2, DollarSign, PieChart, Dumbbell, ListTodo, Briefcase, Sparkles, Award, Brain, Orbit, MessageSquareQuote } from "lucide-react";
import { useWindowManager, AppWindow } from "@/context/WindowManagerContext";

// Maps widget contentId → icon component
const WIDGET_ICONS: Record<string, React.ElementType> = {
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

function WindowTile({ win }: { win: AppWindow }) {
  const { restoreWindow, bringToFront, closeWindow } = useWindowManager();
  const Icon = win.type === "widget" ? (WIDGET_ICONS[win.contentId] ?? FileText) : FileText;
  const isMinimized = win.minimized;

  const handleClick = () => {
    if (isMinimized) restoreWindow(win.id);
    else bringToFront(win.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, y: 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className="group relative flex flex-col items-center gap-1"
    >
      <button
        onClick={handleClick}
        title={win.title}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all
          ${isMinimized
            ? "bg-foreground/8 border border-foreground/15 hover:bg-primary/20 hover:border-primary/40"
            : "bg-primary/20 border border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
          }`}
      >
        <Icon size={16} className={isMinimized ? "text-foreground/50" : "text-primary"} />
        {/* Active indicator dot */}
        {!isMinimized && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
        )}
        {/* Minimized badge */}
        {isMinimized && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-muted-foreground/50 border border-background" />
        )}
      </button>

      {/* Close on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
        title="Close"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
      >
        <X size={8} />
      </button>

      {/* Label */}
      <span className="text-[9px] text-foreground/40 max-w-[44px] truncate text-center leading-tight">
        {win.title}
      </span>
    </motion.div>
  );
}

const WindowDock = () => {
  const { windows } = useWindowManager();

  if (windows.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10090] pointer-events-none"
      style={{ maxWidth: "90vw" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="pointer-events-auto flex items-end gap-2 px-3 py-2 rounded-2xl"
        style={{
          background: "rgba(10,8,20,0.72)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
      >
        <AnimatePresence mode="popLayout">
          {windows.map((win) => (
            <WindowTile key={win.id} win={win} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
};

export default WindowDock;
