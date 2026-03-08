import React, { useState, useMemo } from "react";
import { Plus, Zap, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExerciseSet {
  done: boolean;
  weight: number;
  reps: number;
}

interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: ExerciseSet[];
}

type DayStatus = "done" | "rest" | "pending";

const getDayLabel = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
};

const INITIAL_EXERCISES: Exercise[] = [
  { id: "1", name: "Barbell Squat", muscle: "Legs", sets: [{ done: false, weight: 80, reps: 10 }, { done: false, weight: 80, reps: 10 }, { done: false, weight: 80, reps: 8 }] },
  { id: "2", name: "Bench Press", muscle: "Chest", sets: [{ done: false, weight: 70, reps: 10 }, { done: false, weight: 70, reps: 10 }, { done: false, weight: 72.5, reps: 8 }] },
  { id: "3", name: "Pull-Up", muscle: "Back", sets: [{ done: false, weight: 0, reps: 8 }, { done: false, weight: 0, reps: 7 }, { done: false, weight: 0, reps: 6 }] },
  { id: "4", name: "Overhead Press", muscle: "Shoulders", sets: [{ done: false, weight: 50, reps: 8 }, { done: false, weight: 50, reps: 8 }, { done: false, weight: 50, reps: 6 }] },
];

// Mon..today = done, rest is pending
const WEEK: { label: string; status: DayStatus }[] = [
  { label: "Mo", status: "done" },
  { label: "Tu", status: "done" },
  { label: "We", status: "rest" },
  { label: "Th", status: "done" },
  { label: "Fr", status: "pending" },
  { label: "Sa", status: "pending" },
  { label: "Su", status: "pending" },
];

const WorkoutWidget = () => {
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [week, setWeek] = useState(WEEK);
  const [editingSet, setEditingSet] = useState<{ exId: string; setIdx: number; field: "weight" | "reps" } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [complete, setComplete] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const allDone = useMemo(() => exercises.every(e => e.sets.every(s => s.done)), [exercises]);

  const toggleSet = (exId: string, setIdx: number) => {
    setExercises(prev => {
      const next = prev.map(ex => {
        if (ex.id !== exId) return ex;
        const sets = ex.sets.map((s, i) => i === setIdx ? { ...s, done: !s.done } : s);
        return { ...ex, sets };
      });
      const nowAllDone = next.every(e => e.sets.every(s => s.done));
      if (nowAllDone && !complete) {
        setComplete(true);
        setConfetti(true);
        setWeek(w => w.map((d, i) => i === 4 ? { ...d, status: "done" } : d));
        setTimeout(() => setConfetti(false), 2000);
      }
      return next;
    });
  };

  const startEdit = (exId: string, setIdx: number, field: "weight" | "reps", current: number) => {
    setEditingSet({ exId, setIdx, field });
    setEditVal(String(current));
  };

  const commitEdit = () => {
    if (!editingSet) return;
    const val = parseFloat(editVal);
    if (!isNaN(val)) {
      setExercises(prev => prev.map(ex => {
        if (ex.id !== editingSet.exId) return ex;
        const sets = ex.sets.map((s, i) =>
          i === editingSet.setIdx ? { ...s, [editingSet.field]: val } : s
        );
        return { ...ex, sets };
      }));
    }
    setEditingSet(null);
  };

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = exercises.reduce((s, e) => s + e.sets.filter(st => st.done).length, 0);

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Weekly tracker */}
      <div className="flex items-center justify-between shrink-0">
        {week.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
              d.status === "done" ? "bg-emerald-400 text-white shadow-[0_0_8px_rgba(52,211,153,0.5)]"
              : d.status === "rest" ? "bg-white/5 text-white/20 border border-white/10"
              : "bg-white/8 text-white/40 border border-white/8"
            }`}>
              {d.status === "done" ? "✓" : d.status === "rest" ? "—" : "·"}
            </div>
            <span className="text-[8px] text-white/30">{d.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="shrink-0">
        <div className="flex justify-between text-[9px] text-white/40 mb-1">
          <span>Today's Workout</span>
          <span className="text-white/60">{doneSets}/{totalSets} sets</span>
        </div>
        <div className="h-1 rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
            animate={{ width: `${(doneSets / totalSets) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Completion badge */}
      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="shrink-0 flex items-center justify-center gap-2 py-1.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25"
          >
            <Trophy size={12} className="text-amber-400" />
            <span className="text-[11px] text-emerald-300 font-semibold">Workout Complete! 🎉</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar space-y-1.5">
        {exercises.map(ex => {
          const exDone = ex.sets.every(s => s.done);
          return (
            <div key={ex.id} className={`rounded-xl border p-2.5 transition-all ${
              exDone ? "bg-emerald-500/8 border-emerald-400/20" : "bg-white/5 border-white/8"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className={`text-[12px] font-semibold transition-all ${exDone ? "text-white/40 line-through" : "text-white/90"}`}>{ex.name}</p>
                  <p className="text-[9px] text-white/30">{ex.muscle}</p>
                </div>
                {exDone && <Zap size={12} className="text-amber-400" />}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {ex.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-1">
                    {/* Set circle */}
                    <button
                      onClick={() => toggleSet(ex.id, si)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${
                        s.done
                          ? "bg-orange-400 border-orange-400 text-white shadow-[0_0_6px_rgba(251,146,60,0.5)]"
                          : "border-white/20 text-white/30 hover:border-orange-400/50"
                      }`}
                    >
                      {s.done ? "✓" : si + 1}
                    </button>

                    {/* Weight x reps */}
                    <div className="flex items-center gap-0.5 text-[9px] text-white/40">
                      {editingSet?.exId === ex.id && editingSet.setIdx === si && editingSet.field === "weight" ? (
                        <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()}
                          className="w-8 bg-white/10 rounded px-1 text-white/80 outline-none text-[9px]" />
                      ) : (
                        <button onClick={() => startEdit(ex.id, si, "weight", s.weight)} className="hover:text-white/70 transition-colors">
                          {s.weight > 0 ? `${s.weight}kg` : "BW"}
                        </button>
                      )}
                      <span className="text-white/20">×</span>
                      {editingSet?.exId === ex.id && editingSet.setIdx === si && editingSet.field === "reps" ? (
                        <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()}
                          className="w-6 bg-white/10 rounded px-1 text-white/80 outline-none text-[9px]" />
                      ) : (
                        <button onClick={() => startEdit(ex.id, si, "reps", s.reps)} className="hover:text-white/70 transition-colors">
                          {s.reps}
                        </button>
                      )}
                    </div>
                    {si < ex.sets.length - 1 && <span className="text-white/10 text-[8px]">|</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutWidget;
