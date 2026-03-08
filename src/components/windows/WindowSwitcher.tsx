import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Clock, Timer, Music, CalendarClock, StickyNote,
  BarChart3, Wind, Users2, DollarSign, PieChart, Dumbbell,
  ListTodo, Briefcase, Sparkles, Award, Brain, Orbit,
  MessageSquareQuote, LucideIcon,
} from "lucide-react";
import { useWindowManager, AppWindow } from "@/context/WindowManagerContext";

const WIDGET_ICONS: Record<string, LucideIcon> = {
  clock: Clock, timer: Timer, music: Music, planner: CalendarClock,
  notes: StickyNote, crm: Users2, stats: BarChart3, scratchpad: FileText,
  quote: MessageSquareQuote, breathing: Wind, council: Brain, aura: Orbit,
  "budget-preview": DollarSign, "savings-ring": PieChart,
  "weekly-workout": Dumbbell, "project-status": Briefcase,
  "top-tasks": ListTodo, "smart-plan": Sparkles, gamification: Award,
};

function getIcon(win: AppWindow): LucideIcon {
  if (win.type === "document") return FileText;
  return WIDGET_ICONS[win.contentId] ?? FileText;
}

const WindowSwitcher = () => {
  const { windows, switcherOpen, switcherTargetId, closeSwitcher, bringToFront } = useWindowManager();

  const visible = windows
    .filter(w => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex); // most recent first

  return createPortal(
    <AnimatePresence>
      {switcherOpen && visible.length > 0 && (
        <>
          {/* Backdrop */}
          <motion.div
            key="switcher-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[19990] pointer-events-auto"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
            onClick={closeSwitcher}
          />

          {/* Switcher panel */}
          <motion.div
            key="switcher-panel"
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 10 }}
            transition={{ type: "spring", stiffness: 600, damping: 38 }}
            className="fixed z-[19999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{
              background: "rgba(12,10,24,0.90)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
              borderRadius: 20,
              padding: "20px 24px",
              minWidth: 320,
              maxWidth: "80vw",
            }}
          >
            {/* Title */}
            <p className="text-[10px] font-semibold text-foreground/30 uppercase tracking-widest mb-4 text-center select-none">
              ⌘` Switch Window
            </p>

            {/* Window tiles */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {visible.map(win => {
                const Icon = getIcon(win);
                const isTarget = win.id === switcherTargetId;
                return (
                  <motion.button
                    key={win.id}
                    onClick={() => { bringToFront(win.id); closeSwitcher(); }}
                    animate={isTarget
                      ? { scale: 1.08, y: -2 }
                      : { scale: 1, y: 0 }
                    }
                    transition={{ type: "spring", stiffness: 520, damping: 28 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors cursor-pointer"
                    style={{
                      background: isTarget
                        ? "hsl(var(--primary) / 0.18)"
                        : "rgba(255,255,255,0.04)",
                      border: isTarget
                        ? "1.5px solid hsl(var(--primary) / 0.55)"
                        : "1.5px solid rgba(255,255,255,0.07)",
                      minWidth: 80,
                    }}
                  >
                    {/* Mini window chrome */}
                    <div
                      className="flex flex-col rounded-xl overflow-hidden"
                      style={{
                        width: 72, height: 54,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {/* Mini titlebar */}
                      <div className="flex items-center gap-1 px-1.5 py-1 shrink-0"
                        style={{ background: "rgba(0,0,0,0.25)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                      </div>
                      {/* Content placeholder */}
                      <div className="flex-1 flex items-center justify-center">
                        <Icon size={18} className={isTarget ? "text-primary" : "text-foreground/30"} />
                      </div>
                    </div>

                    <span className="text-[10px] font-medium truncate max-w-[80px] text-center leading-tight"
                      style={{ color: isTarget ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)" }}>
                      {win.title}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Layout hint */}
            {switcherTargetId && (() => {
              const target = visible.find(w => w.id === switcherTargetId);
              return target ? (
                <p className="text-[9px] text-foreground/25 text-center mt-4 select-none">
                  {target.layout} · press Enter or release to switch
                </p>
              ) : null;
            })()}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default WindowSwitcher;
