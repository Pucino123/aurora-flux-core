import React, { useState } from "react";
import { Sparkles, Clock, GripVertical, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface ScheduleBlock {
  id: string;
  time: string;
  endTime: string;
  title: string;
  type: "work" | "meeting" | "break" | "ai";
  isAI?: boolean;
}

const INITIAL_BLOCKS: ScheduleBlock[] = [
  { id: "1", time: "08:00", endTime: "08:30", title: "Morning Review", type: "work", isAI: true },
  { id: "2", time: "09:00", endTime: "10:30", title: "Deep Work: Product Roadmap", type: "work" },
  { id: "3", time: "10:30", endTime: "10:45", title: "Break — Stretch & Water", type: "break", isAI: true },
  { id: "4", time: "11:00", endTime: "12:00", title: "Team Standup + Planning", type: "meeting" },
  { id: "5", time: "13:00", endTime: "14:30", title: "Focus: Feature Development", type: "work" },
  { id: "6", time: "15:00", endTime: "15:30", title: "Email & Async Comms", type: "work" },
  { id: "7", time: "16:00", endTime: "17:00", title: "Weekly Review", type: "work", isAI: true },
];

const TYPE_STYLE = {
  work: { bg: "bg-blue-400/10 border-blue-400/20", dot: "bg-blue-400", text: "text-blue-300" },
  meeting: { bg: "bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400", text: "text-amber-300" },
  break: { bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400", text: "text-emerald-300" },
  ai: { bg: "bg-violet-400/10 border-violet-400/30", dot: "bg-violet-400", text: "text-violet-300" },
};

const SmartPlanWidget = () => {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(INITIAL_BLOCKS);
  const [input, setInput] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  const today = format(new Date(), "EEEE, MMM d");

  const optimize = () => {
    setOptimizing(true);
    setTimeout(() => {
      setBlocks(prev => {
        const withBreak: ScheduleBlock = {
          id: "ai-break-" + Date.now(),
          time: "14:30", endTime: "14:45",
          title: "AI Suggested: Mindful Break",
          type: "break", isAI: true,
        };
        const sorted = [...prev, withBreak].sort((a, b) => a.time.localeCompare(b.time));
        return sorted;
      });
      setOptimizing(false);
    }, 900);
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* AI input */}
      <div className="shrink-0 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && optimize()}
          placeholder="What do you need to achieve today?"
          className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/25 outline-none"
        />
        <button
          onClick={optimize}
          disabled={optimizing}
          className="w-6 h-6 rounded-full bg-violet-500/30 hover:bg-violet-500/50 flex items-center justify-center text-violet-300 transition-all shrink-0"
        >
          {optimizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-1.5 shrink-0 flex-wrap">
        {["✨ Optimize Schedule", "✨ Find Focus Time", "+ Add Break"].map(chip => (
          <button
            key={chip}
            onClick={() => chip.startsWith("✨ Opt") && optimize()}
            className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40 hover:bg-violet-500/15 hover:text-violet-300 hover:border-violet-400/25 transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Date header */}
      <div className="flex items-center gap-2 shrink-0">
        <Clock size={11} className="text-white/30" />
        <span className="text-[10px] text-white/30">{today}</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
        <AnimatePresence mode="popLayout">
          {optimizing ? (
            // Skeleton loader
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 rounded-xl bg-white/5 border border-white/8 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="blocks" className="space-y-1.5">
              {blocks.map((block, idx) => {
                const style = TYPE_STYLE[block.isAI ? "ai" : block.type];
                return (
                  <motion.div
                    key={block.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center gap-2 p-2 rounded-xl border ${style.bg} group`}
                  >
                    <GripVertical size={12} className="text-white/15 cursor-grab shrink-0" />
                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/80 leading-tight truncate">{block.title}</p>
                      <p className={`text-[9px] ${style.text}`}>{block.time} — {block.endTime}</p>
                    </div>
                    {block.isAI && (
                      <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[8px]">
                        <Sparkles size={7} /> AI
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add block */}
        <button className="mt-2 flex items-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-white/10 text-white/20 hover:text-white/40 hover:border-white/20 transition-all text-[10px] justify-center">
          <Plus size={11} /> Add time block
        </button>
      </div>
    </div>
  );
};

export default SmartPlanWidget;
