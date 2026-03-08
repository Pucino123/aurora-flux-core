import React, { useState } from "react";
import { Plus, Flame, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Habit {
  id: string;
  name: string;
  streak: number;
  week: boolean[]; // Mon=0..Sun=6
  checkedToday: boolean;
}

const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const INITIAL_HABITS: Habit[] = [
  { id: "1", name: "Morning Meditation", streak: 14, week: [true, true, true, true, false, false, false], checkedToday: false },
  { id: "2", name: "Read 10 Pages", streak: 7, week: [true, true, false, true, true, false, false], checkedToday: false },
  { id: "3", name: "No Sugar", streak: 3, week: [false, false, true, true, true, false, false], checkedToday: false },
  { id: "4", name: "Exercise 30min", streak: 5, week: [true, true, false, true, true, false, false], checkedToday: false },
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const StreakTrackerWidget = () => {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pulseId, setPulseId] = useState<string | null>(null);

  const checkIn = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id || h.checkedToday) return h;
      const week = [...h.week];
      week[TODAY_IDX] = true;
      return { ...h, streak: h.streak + 1, week, checkedToday: true };
    }));
    setPulseId(id);
    setTimeout(() => setPulseId(null), 800);
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    const week = Array(7).fill(false) as boolean[];
    setHabits(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), streak: 0, week, checkedToday: false }]);
    setNewName(""); setAdding(false);
  };

  const best = habits.reduce((b, h) => h.streak > b.streak ? h : b, habits[0]);

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[11px] text-white/60 font-medium uppercase tracking-wider">Active Streaks</span>
        <button
          onClick={() => setAdding(v => !v)}
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/60 hover:text-white/90"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Best streak hero */}
      {best && (
        <div className="shrink-0 flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-400/20">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame size={22} className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
          </motion.div>
          <div>
            <p className="text-[10px] text-orange-300/70 uppercase tracking-wider">Best Streak</p>
            <p className="text-[13px] font-bold text-white/90">{best.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-orange-400 leading-none">{best.streak}</p>
            <p className="text-[9px] text-white/30">days</p>
          </div>
        </div>
      )}

      {/* Add habit form */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0">
            <div className="flex gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addHabit()}
                autoFocus
                placeholder="New habit name..."
                className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none"
              />
              <button onClick={addHabit} className="text-orange-400 hover:text-orange-300 transition-colors">
                <Check size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habit cards */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar space-y-2">
        {habits.map(h => (
          <motion.div
            key={h.id}
            animate={pulseId === h.id ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.5 }}
            className={`rounded-xl border p-2.5 transition-all ${
              h.checkedToday ? "bg-emerald-500/8 border-emerald-400/20" : "bg-white/5 border-white/8"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[12px] font-semibold text-white/90">{h.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame size={10} className={`${h.checkedToday ? "text-orange-400" : "text-white/30"}`} />
                  <span className={`text-[10px] font-medium ${h.checkedToday ? "text-orange-300" : "text-white/40"}`}>
                    {h.streak} day streak
                  </span>
                </div>
              </div>

              <button
                onClick={() => checkIn(h.id)}
                disabled={h.checkedToday}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  h.checkedToday
                    ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/25"
                    : "bg-white/8 text-white/50 hover:bg-orange-400/15 hover:text-orange-300 hover:border-orange-400/25 border border-transparent"
                }`}
              >
                {h.checkedToday ? <><Check size={9} /> Done</> : "Check In"}
              </button>
            </div>

            {/* 7-day circles */}
            <div className="flex items-center gap-1.5">
              {h.week.map((done, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold transition-all ${
                    idx === TODAY_IDX && done ? "bg-orange-400 text-white shadow-[0_0_6px_rgba(251,146,60,0.5)]"
                    : done ? "bg-orange-400/50 text-orange-200"
                    : idx < TODAY_IDX ? "bg-white/5 text-white/20 border border-white/10"
                    : "bg-white/5 text-white/10 border border-white/5"
                  }`}>
                    {done ? "✓" : ""}
                  </div>
                  <span className="text-[7px] text-white/20">{DAY_LABELS[idx]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StreakTrackerWidget;
