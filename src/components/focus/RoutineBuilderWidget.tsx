import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Flame, Trash2 } from "lucide-react";
import DraggableWidget from "./DraggableWidget";

interface Routine {
  id: string;
  title: string;
  time: string;
  repeat: "daily" | "weekly" | "custom";
  streak: number;
  completedToday: boolean;
  weeklyLog: boolean[];
}

const DEFAULT_ROUTINES: Routine[] = [];

const RoutineBuilderWidget = () => {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
      const raw = localStorage.getItem("flux-routines");
      return raw ? JSON.parse(raw) : DEFAULT_ROUTINES;
    } catch { return DEFAULT_ROUTINES; }
  });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("07:00");
  const [newRepeat, setNewRepeat] = useState<"daily" | "weekly" | "custom">("daily");

  const save = useCallback((updated: Routine[]) => {
    setRoutines(updated);
    localStorage.setItem("flux-routines", JSON.stringify(updated));
  }, []);

  const addRoutine = useCallback(() => {
    if (!newTitle.trim()) return;
    const routine: Routine = {
      id: `r-${Date.now()}`,
      title: newTitle.trim(),
      time: newTime,
      repeat: newRepeat,
      streak: 0,
      completedToday: false,
      weeklyLog: [false, false, false, false, false, false, false],
    };
    save([...routines, routine]);
    setNewTitle("");
    setAdding(false);
  }, [newTitle, newTime, newRepeat, routines, save]);

  const toggleComplete = useCallback((id: string) => {
    save(routines.map(r => {
      if (r.id !== id) return r;
      const completed = !r.completedToday;
      const newLog = [...r.weeklyLog.slice(1), completed];
      return {
        ...r,
        completedToday: completed,
        streak: completed ? r.streak + 1 : Math.max(0, r.streak - 1),
        weeklyLog: newLog,
      };
    }));
  }, [routines, save]);

  const deleteRoutine = useCallback((id: string) => {
    save(routines.filter(r => r.id !== id));
  }, [routines, save]);

  const totalConsistency = routines.length > 0
    ? Math.round(routines.reduce((acc, r) => acc + r.weeklyLog.filter(Boolean).length, 0) / (routines.length * 7) * 100)
    : 0;

  return (
    <DraggableWidget id="routine" title="Routines" defaultPosition={{ x: 420, y: 360 }} defaultSize={{ w: 340, h: 400 }} scrollable>
      <div className="flex flex-col h-full gap-2">
        {routines.length > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${totalConsistency}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] text-white/40 font-medium tabular-nums">{totalConsistency}%</span>
          </div>
        )}

        <div className="flex-1 space-y-1.5 overflow-y-auto council-hidden-scrollbar">
          <AnimatePresence>
            {routines.map(r => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  r.completedToday
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-white/5 border-white/10 hover:bg-white/8"
                }`}
              >
                <button
                  onClick={() => toggleComplete(r.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                    r.completedToday
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  {r.completedToday && <Check size={12} className="text-black" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-tight ${r.completedToday ? "text-white/50 line-through" : "text-white/80"}`}>
                    {r.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-white/30">{r.time}</span>
                    <span className="text-[9px] text-white/20 capitalize">{r.repeat}</span>
                  </div>
                </div>

                {r.streak > 0 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10">
                    <Flame size={10} className="text-orange-400" />
                    <span className="text-[9px] text-orange-400 font-bold">{r.streak}</span>
                  </div>
                )}

                <div className="flex gap-0.5">
                  {r.weeklyLog.map((done, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-400" : "bg-white/10"}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => deleteRoutine(r.id)}
                  className="p-1 rounded-md text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {adding ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-1"
            >
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRoutine()}
                placeholder="Routine name…"
                autoFocus
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white/80 outline-none focus:border-white/25 placeholder:text-white/20"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-[10px] bg-white/5 border border-white/10 text-white/70 outline-none"
                />
                <div className="flex gap-1">
                  {(["daily", "weekly", "custom"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setNewRepeat(r)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-all capitalize ${
                        newRepeat === r ? "bg-white/15 text-white" : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <button onClick={addRoutine} className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                  Add
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-medium text-white/30 hover:text-white/60 hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 transition-all"
            >
              <Plus size={12} /> Add Routine
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </DraggableWidget>
  );
};

export default RoutineBuilderWidget;
