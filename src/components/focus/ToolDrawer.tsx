import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Timer, Music, CalendarClock, StickyNote, Clock, BarChart3, FileText, MessageSquareQuote, Wind, Users, DollarSign, PieChart, Dumbbell, ListTodo, Briefcase, Sparkles, Award, Brain, X, ChevronUp, Focus, Hammer, MessageCircle, Lightbulb, RotateCcw, Orbit, Users2, GripHorizontal } from "lucide-react";
import { useFocusStore, SystemMode } from "@/context/FocusContext";
import { AnimatePresence, motion } from "framer-motion";
import FocusReportModal from "./FocusReportModal";
import CollabMessagesModal from "./CollabMessagesModal";
import { getSuggestedWidgets } from "@/hooks/useWidgetIntelligence";
import { useTeamChat } from "@/hooks/useTeamChat";

const TOOL_CATEGORIES = [
  {
    label: "Core",
    tools: [
      { id: "clock", label: "Clock", icon: Clock },
      { id: "timer", label: "Timer", icon: Timer },
      { id: "notes", label: "Notes", icon: StickyNote },
      { id: "scratchpad", label: "Scratchpad", icon: FileText },
      { id: "chat", label: "Chat", icon: Users },
      { id: "crm", label: "CRM", icon: Users2 },
    ],
  },
  {
    label: "Insight",
    tools: [
      { id: "budget-preview", label: "Budget", icon: DollarSign },
      { id: "savings-ring", label: "Savings", icon: PieChart },
      { id: "weekly-workout", label: "Workout", icon: Dumbbell },
      { id: "project-status", label: "Projects", icon: Briefcase },
      { id: "stats", label: "Focus Stats", icon: BarChart3 },
    ],
  },
  {
    label: "Smart",
    tools: [
      { id: "aura", label: "Aura", icon: Orbit },
      { id: "council", label: "Council", icon: Brain },
      { id: "smart-plan", label: "Smart Plan", icon: Sparkles },
      { id: "gamification", label: "Streaks", icon: Award },
      { id: "top-tasks", label: "Tasks", icon: ListTodo },
    ],
  },
  {
    label: "Integration",
    tools: [
      { id: "planner", label: "Planner", icon: CalendarClock },
      { id: "music", label: "Music", icon: Music },
      { id: "quote", label: "Quote", icon: MessageSquareQuote },
      { id: "breathing", label: "Breathe", icon: Wind },
    ],
  },
];

const MODES: { key: SystemMode; label: string; icon: any; desc: string }[] = [
  { key: "focus", label: "Focus", icon: Focus, desc: "Clock + primary tool" },
  { key: "build", label: "Build", icon: Hammer, desc: "Customize layout" },
];

const TOOLBAR_POS_KEY = "flux-toolbar-pos";

function loadToolbarPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(TOOLBAR_POS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveToolbarPos(pos: { x: number; y: number }) {
  localStorage.setItem(TOOLBAR_POS_KEY, JSON.stringify(pos));
}

interface ToolDrawerProps {
  pageActiveWidgets?: string[];
  onTogglePageWidget?: (id: string) => void;
}

const ToolDrawer = ({ pageActiveWidgets, onTogglePageWidget }: ToolDrawerProps = {}) => {
  const { activeWidgets, toggleWidget, systemMode, setSystemMode, resetDashboard } = useFocusStore();

  const effectiveWidgets = pageActiveWidgets ?? activeWidgets;
  const effectiveToggle = (id: string) => {
    if (onTogglePageWidget) onTogglePageWidget(id);
    else toggleWidget(id);
  };

  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const allToolIds = useMemo(() => TOOL_CATEGORIES.flatMap(c => c.tools), []);
  const suggestions = useMemo(() => getSuggestedWidgets(effectiveWidgets as string[]), [effectiveWidgets]);
  const { unreadCount, markAsRead } = useTeamChat();

  // ── Drag position (build mode only) ──────────────────────────────────
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(loadToolbarPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (systemMode !== "build") return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    didDrag.current = false;
    setIsDragging(true);
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    } else if (toolbarPos) {
      offset.current = { x: e.clientX - toolbarPos.x, y: e.clientY - toolbarPos.y };
    } else {
      // default center-bottom position
      const w = barRef.current?.offsetWidth ?? 320;
      offset.current = { x: e.clientX - (window.innerWidth / 2 - w / 2), y: e.clientY - (window.innerHeight - 48) };
    }
  }, [systemMode, toolbarPos]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      didDrag.current = true;
      const nx = e.clientX - offset.current.x;
      const ny = e.clientY - offset.current.y;
      // Clamp inside viewport
      const w = barRef.current?.offsetWidth ?? 320;
      const h = barRef.current?.offsetHeight ?? 48;
      const cx = Math.max(0, Math.min(nx, window.innerWidth - w));
      const cy = Math.max(0, Math.min(ny, window.innerHeight - h));
      setToolbarPos({ x: cx, y: cy });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDragging(false);
      if (didDrag.current && toolbarPos) {
        saveToolbarPos(toolbarPos);
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [toolbarPos]);

  // Reset to center-bottom when switching away from build mode (optional UX clarity)
  // Keep position sticky across modes so it stays where user placed it

  const posStyle: React.CSSProperties = toolbarPos
    ? { left: toolbarPos.x, top: toolbarPos.y, bottom: "auto", transform: "none" }
    : { left: "50%", bottom: "24px", top: "auto", transform: "translateX(-50%)" };

  const isBuild = systemMode === "build";

  return (
    <>
      {/* Bottom bar */}
      <motion.div
        ref={barRef}
        className="fixed z-[10100] flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/10 backdrop-blur-[16px] border shadow-lg select-none"
        animate={isBouncing ? { scale: [1, 1.06, 0.97, 1.02, 1] } : { scale: 1 }}
        transition={isBouncing ? { duration: 0.45, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 20 }}
        style={{
          ...posStyle,
          cursor: isBuild ? (isDragging ? "grabbing" : "grab") : "default",
          borderColor: isBuild ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.20)",
          boxShadow: isDragging
            ? "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.3)"
            : "0 8px 32px rgba(0,0,0,0.55)",
        }}
        onPointerDown={isBuild ? handlePointerDown : undefined}
      >
        {/* Grip indicator in build mode */}
        <AnimatePresence>
          {isBuild && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <GripHorizontal size={12} className="text-white/30 mr-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode buttons */}
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setSystemMode(key)}
            title={label}
            className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[10px] font-medium transition-all ${
              systemMode === key
                ? "bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                : "text-white/30 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

        {/* Collab button */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => { setCollabOpen(true); markAsRead(); }}
          title="Collab"
          className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[10px] font-medium transition-all text-white/30 hover:text-white/60 hover:bg-white/5"
        >
          <MessageCircle size={14} />
          <span className="hidden sm:inline">Collab</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-lg">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Tools trigger */}
        <motion.button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-medium transition-all ${
            open ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
          }`}
          whileTap={{ scale: 0.96 }}
        >
          <ChevronUp size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          <span className="hidden sm:inline">Tools</span>
          <span className="text-[10px] text-white/25 tabular-nums">{effectiveWidgets.length}</span>
        </motion.button>
      </motion.div>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10050] bg-black/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel — anchored above the bar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scaleX: 0.92, scaleY: 0.88 }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, y: 18, scaleX: 0.94, scaleY: 0.90 }}
            transition={{ type: "spring", stiffness: 500, damping: 36, mass: 0.8 }}
            style={{
              transformOrigin: "50% 100%",
              ...(toolbarPos
                ? { left: toolbarPos.x, bottom: `calc(100vh - ${toolbarPos.y}px + 8px)`, top: "auto", transform: "none" }
                : { left: "50%", bottom: "88px", top: "auto", transform: "translateX(-50%)" }),
            }}
            className="fixed z-[10100] w-[92vw] max-w-[520px] p-4 rounded-2xl bg-black/60 backdrop-blur-[24px] border border-white/15 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Tool Ecosystem</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { resetDashboard(); setOpen(false); }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 flex items-center gap-1"
                  title="Reset all widget positions to defaults"
                >
                  <RotateCcw size={10} />
                  Reset Layout
                </button>
                <button
                  onClick={() => { setReportOpen(true); setOpen(false); }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  Focus Report
                </button>
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto council-hidden-scrollbar">
              {suggestions.length > 0 && (
                <div>
                  <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Lightbulb size={10} /> Suggested for you
                  </span>
                  <div className="flex gap-1.5">
                    {suggestions.map((id) => {
                      const tool = allToolIds.find(t => t.id === id);
                      if (!tool) return null;
                      const Icon = tool.icon;
                      return (
                        <button
                          key={id}
                          onClick={() => effectiveToggle(id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
                        >
                          <Icon size={14} />
                          <span>{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {TOOL_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-1.5 block">{cat.label}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {cat.tools.map(({ id, label, icon: Icon }) => {
                      const active = effectiveWidgets.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => effectiveToggle(id)}
                          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-medium transition-all ${
                            active
                              ? "bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                              : "text-white/35 hover:text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <Icon size={16} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FocusReportModal open={reportOpen} onOpenChange={setReportOpen} />
      <CollabMessagesModal open={collabOpen} onOpenChange={setCollabOpen} />
    </>
  );
};

export default ToolDrawer;
