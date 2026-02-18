import React, { useState, useMemo } from "react";
import { Timer, Music, CalendarClock, StickyNote, Clock, BarChart3, FileText, MessageSquareQuote, Wind, Users, DollarSign, PieChart, Dumbbell, ListTodo, Briefcase, Sparkles, Award, Brain, X, ChevronUp, Focus, Hammer, MessageCircle, Lightbulb, RotateCcw } from "lucide-react";
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

const ToolDrawer = () => {
  const { activeWidgets, toggleWidget, systemMode, setSystemMode, resetDashboard } = useFocusStore();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const allToolIds = useMemo(() => TOOL_CATEGORIES.flatMap(c => c.tools), []);
  const suggestions = useMemo(() => getSuggestedWidgets(activeWidgets as string[]), [activeWidgets]);
  const { messages, hasTeams } = useTeamChat();

  // Count unread messages (simple heuristic: messages from last 24h not from current user)
  const unreadCount = useMemo(() => {
    if (!hasTeams) return 0;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return messages.filter(m => new Date(m.created_at).getTime() > cutoff).length;
  }, [messages, hasTeams]);
  return (
    <>
      {/* Bottom bar with trigger + mode switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/20 shadow-lg">
        {/* Mode buttons */}
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
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

        {/* Collab button – opens modal without switching mode */}
        <button
          onClick={() => setCollabOpen(true)}
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
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-medium transition-all ${
            open ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
          }`}
          whileTap={{ scale: 0.96 }}
        >
          <ChevronUp size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          <span className="hidden sm:inline">Tools</span>
          <span className="text-[10px] text-white/25 tabular-nums">{activeWidgets.length}</span>
        </motion.button>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-[520px] p-4 rounded-2xl bg-black/60 backdrop-blur-[24px] border border-white/15 shadow-2xl"
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
              {/* Suggested for you */}
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
                          onClick={() => toggleWidget(id)}
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
                      const active = activeWidgets.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleWidget(id)}
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
