import React, { useState } from "react";
import { Timer, Music, CalendarClock, StickyNote, RotateCcw, Clock, BarChart3, FileText, Plus, MessageSquareQuote, Eye, EyeOff, Wind, Users } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { AnimatePresence, motion } from "framer-motion";
import FocusReportModal from "./FocusReportModal";

const PRIMARY_WIDGETS = [
  { id: "clock", label: "Clock", icon: Clock },
  { id: "timer", label: "Timer", icon: Timer },
  { id: "music", label: "Music", icon: Music },
  { id: "planner", label: "Planner", icon: CalendarClock },
];

const OVERFLOW_WIDGETS = [
  { id: "quote", label: "Quote", icon: MessageSquareQuote },
  { id: "breathing", label: "Breathe", icon: Wind },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "scratchpad", label: "Scratch", icon: FileText },
  { id: "council", label: "Council", icon: Users },
];

const WidgetToggleBar = () => {
  const { activeWidgets, toggleWidget, resetDashboard, widgetMinimalMode, setWidgetMinimalMode } = useFocusStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/20 shadow-lg">
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
        <div className="relative">
          <button onClick={() => setMoreOpen(!moreOpen)} title="More tools"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${moreOpen ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
            <Plus size={15} className={`transition-transform ${moreOpen ? "rotate-45" : ""}`} /><span className="hidden sm:inline">More</span>
          </button>
          <AnimatePresence>
            {moreOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-black/50 backdrop-blur-[20px] border border-white/15 shadow-2xl min-w-[180px]">
                <div className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-2 px-1">Widgets</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {OVERFLOW_WIDGETS.map(({ id, label, icon: Icon }) => {
                    const active = activeWidgets.includes(id);
                    return <button key={id} onClick={() => toggleWidget(id)} className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${active ? "bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}><Icon size={16} /><span className="text-[10px]">{label}</span></button>;
                  })}
                </div>
                <div className="w-full h-px bg-white/10 my-2" />
                <button onClick={() => { setReportOpen(true); setMoreOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"><BarChart3 size={14} /><span>Focus Report</span></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => setWidgetMinimalMode(!widgetMinimalMode)} title={widgetMinimalMode ? "Show widget chrome" : "Hide widget chrome"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${widgetMinimalMode ? "bg-white/15 text-white shadow-[0_0_12px_hsl(var(--aurora-violet)/0.3)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
          {widgetMinimalMode ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button onClick={resetDashboard} title="Reset dashboard" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"><RotateCcw size={15} /></button>
      </div>
      <FocusReportModal open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
};

export default WidgetToggleBar;
