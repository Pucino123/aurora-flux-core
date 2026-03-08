import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Clock, Timer, Music, CalendarClock, StickyNote, BarChart3, Wind, Users2, DollarSign, PieChart, Dumbbell, ListTodo, Briefcase, Sparkles, Award, Brain, Orbit, MessageSquareQuote, LucideIcon } from "lucide-react";
import { useWindowManager, AppWindow } from "@/context/WindowManagerContext";

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

// ── Hover preview popup ──────────────────────────────────────────────────────
function TilePreview({ win, anchorRef }: { win: AppWindow; anchorRef: React.RefObject<HTMLDivElement> }) {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const previewW = 200;
  const previewH = 120;
  const left = rect.left + rect.width / 2 - previewW / 2;
  const bottom = window.innerHeight - rect.top + 8;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="fixed pointer-events-none z-[10095] rounded-xl overflow-hidden"
      style={{
        left,
        bottom,
        width: previewW,
        height: previewH,
        background: "rgba(12,10,24,0.90)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header bar replica */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/8">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
        <span className="flex-1 text-[9px] font-semibold text-white/50 truncate text-center">{win.title}</span>
      </div>
      {/* Content area — blurred indicator */}
      <div className="flex items-center justify-center h-[calc(100%-28px)]">
        {(() => {
          const Icon: LucideIcon = win.type === "widget" ? (WIDGET_ICONS[win.contentId] ?? FileText) : FileText;
          return (
            <div className="flex flex-col items-center gap-1.5 opacity-40">
              <Icon size={28} className="text-white" />
              <span className="text-[9px] text-white/50 font-medium">{win.title}</span>
            </div>
          );
        })()}
      </div>
    </motion.div>,
    document.body
  );
}

// ── Individual dock tile ─────────────────────────────────────────────────────
function WindowTile({ win }: { win: AppWindow }) {
  const { restoreWindow, bringToFront, closeWindow } = useWindowManager();
  const Icon: LucideIcon = win.type === "widget" ? (WIDGET_ICONS[win.contentId] ?? FileText) : FileText;
  const isMinimized = !!win.minimized;
  const [hovered, setHovered] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (isMinimized) restoreWindow(win.id);
    else bringToFront(win.id);
  };

  return (
    <motion.div
      ref={tileRef}
      layout
      layoutId={`dock-tile-${win.id}`}
      initial={{ opacity: 0, scale: 0.7, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, y: 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className="group relative flex flex-col items-center gap-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover preview for non-minimized windows */}
      <AnimatePresence>
        {hovered && !isMinimized && (
          <TilePreview win={win} anchorRef={tileRef} />
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleClick}
        title={win.title}
        whileHover={{ scale: 1.12, y: -3 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl border ${
          isMinimized
            ? "bg-card/40 border-border/20"
            : "bg-primary/20 border-primary/40 shadow-[0_0_14px_hsl(var(--primary)/0.22)]"
        }`}
      >
        <Icon
          size={16}
          className={isMinimized ? "text-foreground/50" : "text-primary"}
        />
        {/* Active dot */}
        {!isMinimized && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
        )}
        {/* Minimized badge */}
        {isMinimized && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-muted-foreground/50 border border-background" />
        )}
      </motion.button>

      {/* Close on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
        title="Close"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
      >
        <X size={8} />
      </button>

      <span className="text-[9px] text-foreground/40 max-w-[44px] truncate text-center leading-tight select-none">
        {win.title}
      </span>
    </motion.div>
  );
}

// ── Dock container ────────────────────────────────────────────────────────────
const WindowDock = () => {
  const { windows } = useWindowManager();

  if (windows.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10090] pointer-events-none"
      style={{ maxWidth: "90vw" }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="pointer-events-auto flex items-end gap-2 px-3 py-2 rounded-2xl"
        style={{
          background: "rgba(10,8,20,0.75)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
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
