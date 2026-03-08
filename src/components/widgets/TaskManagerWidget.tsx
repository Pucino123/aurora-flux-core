import React, { useState, useMemo } from "react";
import { Plus, Check, Calendar, Flag, List, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFlux } from "@/context/FluxContext";
import { format } from "date-fns";

interface LocalTask {
  id: string;
  title: string;
  subtitle?: string;
  done: boolean;
  flag?: boolean;
  dueToday?: boolean;
}

const SMART_LISTS = [
  { key: "today", label: "Today", icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/15" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "text-rose-400", bg: "bg-rose-400/15" },
  { key: "all", label: "All", icon: List, color: "text-white/60", bg: "bg-white/10" },
  { key: "flagged", label: "Flagged", icon: Flag, color: "text-orange-400", bg: "bg-orange-400/15" },
];

const TaskManagerWidget = () => {
  const { tasks: fluxTasks, updateTask, addTask } = useFlux();
  const today = format(new Date(), "yyyy-MM-dd");

  const [newTitle, setNewTitle] = useState("");
  const [activeList, setActiveList] = useState("today");
  const [completing, setCompleting] = useState<string | null>(null);

  const todayTasks = useMemo(() => fluxTasks.filter(t => !t.done && t.type === "task" && (t.scheduled_date === today || t.due_date === today)), [fluxTasks, today]);
  const scheduledTasks = useMemo(() => fluxTasks.filter(t => !t.done && t.type === "task" && t.due_date && t.due_date !== today), [fluxTasks, today]);
  const allTasks = useMemo(() => fluxTasks.filter(t => !t.done && t.type === "task"), [fluxTasks]);
  const flaggedTasks = useMemo(() => fluxTasks.filter(t => !t.done && t.type === "task" && t.priority === "high"), [fluxTasks]);

  const counts = {
    today: todayTasks.length,
    scheduled: scheduledTasks.length,
    all: allTasks.length,
    flagged: flaggedTasks.length,
  };

  const activeTasks = {
    today: todayTasks,
    scheduled: scheduledTasks,
    all: allTasks,
    flagged: flaggedTasks,
  }[activeList] || [];

  const handleComplete = async (id: string) => {
    setCompleting(id);
    setTimeout(() => {
      updateTask(id, { done: true });
      setCompleting(null);
    }, 500);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      type: "task",
      scheduled_date: today,
    });
    setNewTitle("");
  };

  const cfg = SMART_LISTS.find(l => l.key === activeList)!;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Smart list grid */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {SMART_LISTS.map(sl => (
          <button
            key={sl.key}
            onClick={() => setActiveList(sl.key)}
            className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
              activeList === sl.key ? `${sl.bg} border-white/15` : "bg-white/4 border-white/6 hover:bg-white/8"
            }`}
          >
            <div className={`w-7 h-7 rounded-full ${sl.bg} flex items-center justify-center shrink-0`}>
              <sl.icon size={13} className={sl.color} />
            </div>
            <div className="text-left min-w-0">
              <p className={`text-xl font-bold leading-none ${activeList === sl.key ? "text-white/90" : "text-white/60"}`}>
                {counts[sl.key as keyof typeof counts]}
              </p>
              <p className="text-[9px] text-white/30 mt-0.5">{sl.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between shrink-0 px-0.5">
        <span className={`text-[12px] font-semibold ${cfg.color}`}>{cfg.label}</span>
        <span className="text-[10px] text-white/30">{activeTasks.length} tasks</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
        <AnimatePresence>
          {activeTasks.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-[11px] text-white/20">
              All clear ✨
            </div>
          ) : (
            activeTasks.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0"
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleComplete(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    completing === task.id
                      ? `border-0 ${cfg.bg}`
                      : `border-white/20 hover:border-white/40`
                  }`}
                >
                  {completing === task.id && <Check size={10} className={cfg.color} />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] leading-tight transition-all ${completing === task.id ? "line-through text-white/30" : "text-white/80"}`}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-[9px] text-white/30 mt-0.5 flex items-center gap-1">
                      <Clock size={8} /> {task.due_date}
                    </p>
                  )}
                </div>

                {task.priority === "high" && (
                  <Flag size={10} className="text-orange-400 shrink-0 mt-1" />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Quick add */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/6 shrink-0">
        <button className="text-white/30">
          <Plus size={14} />
        </button>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="New Reminder..."
          className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 outline-none"
        />
      </div>
    </div>
  );
};

export default TaskManagerWidget;
