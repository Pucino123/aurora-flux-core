import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Sparkles, Zap, GripVertical, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useFlux } from "@/context/FluxContext";
import { useTrash } from "@/context/TrashContext";
import { toast } from "sonner";

const COLUMNS = [
  { key: "todo",        label: "To Do",      color: "#3b82f6", glow: "rgba(59,130,246,0.3)"  },
  { key: "in-progress", label: "In Progress", color: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  { key: "done",        label: "Done",        color: "#10b981", glow: "rgba(16,185,129,0.3)" },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

const PRIORITY_GLOW: Record<string, string> = {
  high:   "rgba(239,68,68,0.55)",
  medium: "rgba(251,191,36,0.45)",
  low:    "rgba(96,165,250,0.45)",
};

const PRIORITY_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
  high:   { dot: "#ef4444", badge: "rgba(239,68,68,0.12)",  text: "#fca5a5" },
  medium: { dot: "#f59e0b", badge: "rgba(245,158,11,0.12)", text: "#fcd34d" },
  low:    { dot: "#3b82f6", badge: "rgba(59,130,246,0.12)", text: "#93c5fd" },
};

interface KanbanBoardProps {
  folderId?: string;
  tasks?: any[];
}

const KanbanBoard = ({ folderId, tasks: propTasks }: KanbanBoardProps) => {
  const { tasks: allTasks, createTask, updateTask, removeTask } = useFlux();
  const { moveToTrash } = useTrash();
  const tasks = propTasks || allTasks;

  const [newTaskCol, setNewTaskCol]       = useState<string | null>(null);
  const [newTitle, setNewTitle]           = useState("");
  const [isAIPrioritizing, setIsAI]       = useState(false);
  const [scanLine, setScanLine]           = useState(false);
  const [draggedId, setDraggedId]         = useState<string | null>(null);
  const [overColumn, setOverColumn]       = useState<ColKey | null>(null);

  const tasksByStatus = useMemo(() => ({
    "todo":        tasks.filter((t) => t.status === "todo" && !t.done),
    "in-progress": tasks.filter((t) => t.status === "in-progress" && !t.done),
    "done":        tasks.filter((t) => t.done || t.status === "done"),
  }), [tasks]);

  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter(t => t.done).length;
  const progressPct    = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleAdd = async (status: string) => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), status, type: "task" });
    setNewTitle("");
    setNewTaskCol(null);
  };

  const moveTask = (taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus, done: newStatus === "done" });
  };

  const handleColumnDragOver = (e: React.DragEvent, colKey: ColKey) => {
    e.preventDefault();
    setOverColumn(colKey);
  };
  const handleColumnDrop = (e: React.DragEvent, colKey: ColKey) => {
    e.preventDefault();
    if (draggedId) moveTask(draggedId, colKey);
    setDraggedId(null);
    setOverColumn(null);
  };

  const handleAIPrioritize = useCallback(async () => {
    if (isAIPrioritizing) return;
    setIsAI(true);
    setScanLine(true);
    await new Promise(r => setTimeout(r, 900));
    setScanLine(false);
    const priorityScore: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (priorityScore[a.priority ?? "low"] ?? 2) - (priorityScore[b.priority ?? "low"] ?? 2);
    });
    sorted.forEach((t, i) => {
      const ns = t.done ? "done" : i < Math.ceil(sorted.length * 0.4) ? "todo" : "in-progress";
      if (t.status !== ns) updateTask(t.id, { status: ns, done: ns === "done" });
    });
    await new Promise(r => setTimeout(r, 300));
    setIsAI(false);
    toast("✨ Aura has reorganized your day for maximum focus.", {
      duration: 4000,
      style: {
        background: "rgba(15,10,40,.95)",
        border: "1px solid rgba(139,92,246,.5)",
        backdropFilter: "blur(20px)",
        color: "#e2e8f0",
        boxShadow: "0 8px 32px rgba(139,92,246,.35)",
      },
    });
  }, [isAIPrioritizing, tasks, updateTask]);

  return (
    <div
      className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative"
      style={{ background: "radial-gradient(ellipse at top, rgba(139,92,246,0.04) 0%, transparent 60%)" }}
    >
      {/* Scan line */}
      <AnimatePresence>
        {scanLine && (
          <motion.div
            key="scan"
            initial={{ top: 0, opacity: 0.9 }}
            animate={{ top: "100%", opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute inset-x-0 z-50 pointer-events-none"
            style={{
              height: 2,
              background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.9), rgba(99,102,241,0.9), transparent)",
              boxShadow: "0 0 20px 6px rgba(139,92,246,0.5)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h2 className="text-base font-bold font-display text-foreground/90">Task Board</h2>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">{completedTasks} of {totalTasks} completed</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-28 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#3b82f6,#6366f1,#8b5cf6)", boxShadow: "0 0 10px rgba(99,102,241,0.5)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/40 font-medium w-7">{progressPct}%</span>

          {/* AI Prioritize button */}
          <motion.button
            onClick={handleAIPrioritize}
            disabled={isAIPrioritizing}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
            style={{
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "rgba(196,181,253,0.9)",
              animation: isAIPrioritizing ? "none" : "breathe 2.2s ease-in-out infinite",
            }}
          >
            {isAIPrioritizing
              ? <Zap size={11} className="text-violet-400 animate-pulse" />
              : <Sparkles size={11} className="text-violet-400" />}
            AI Prioritize
          </motion.button>
        </div>
      </div>

      {/* Columns */}
      <div className="flex gap-4 min-w-[720px] overflow-x-auto flex-1">
        {COLUMNS.map((col) => {
          const isOver = overColumn === col.key;
          return (
            <div
              key={col.key}
              className="flex-1 min-w-[220px] flex flex-col"
              onDragOver={(e: React.DragEvent) => handleColumnDragOver(e, col.key)}
              onDragLeave={() => setOverColumn(null)}
              onDrop={(e: React.DragEvent) => handleColumnDrop(e, col.key)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color, boxShadow: `0 0 8px ${col.glow}` }} />
                <span className="text-xs font-bold text-foreground/80">{col.label}</span>
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${col.color}20`, color: col.color }}>
                  {tasksByStatus[col.key]?.length || 0}
                </span>
              </div>

              {/* Column body */}
              <div
                className="flex-1 space-y-2 min-h-[120px] p-2 rounded-2xl border transition-all duration-150"
                style={{
                  background: isOver ? `${col.color}0d` : "rgba(255,255,255,0.015)",
                  borderColor: isOver ? `${col.color}40` : "rgba(255,255,255,0.05)",
                }}
              >
                <AnimatePresence initial={false}>
                  {tasksByStatus[col.key]?.map((task, i) => {
                    const pc = PRIORITY_COLORS[task.priority ?? "low"];
                    const isDragging = draggedId === task.id;
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: isDragging ? 0.45 : 1, y: 0, scale: isDragging ? 1.04 : 1, rotate: isDragging ? 1 : 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.18 } }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 380, damping: 30 }}
                        className="group relative rounded-xl border transition-all duration-150"
                        style={{
                          background: isDragging ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                          borderColor: isDragging ? `${col.color}50` : "rgba(255,255,255,0.06)",
                          boxShadow: isDragging ? `0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px ${col.color}30` : "0 1px 4px rgba(0,0,0,0.2)",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget;
                          if (!isDragging) { el.style.background = "rgba(255,255,255,0.07)"; el.style.borderColor = "rgba(255,255,255,0.1)"; }
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget;
                          if (!isDragging) { el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.06)"; }
                        }}
                      >
                        {/* Native drag wrapper */}
                        <div
                          className="p-3 cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                            setDraggedId(task.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => { setDraggedId(null); setOverColumn(null); }}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical size={12} className="text-muted-foreground/20 mt-0.5 shrink-0 group-hover:text-muted-foreground/50 transition-colors" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-[12px] font-medium leading-snug ${task.done ? "line-through text-muted-foreground/30" : "text-foreground/85"}`}>
                                {task.title}
                              </p>
                              {task.priority && pc && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                                  style={{ background: pc.badge, color: pc.text }}>
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ background: pc.dot, boxShadow: `0 0 5px ${PRIORITY_GLOW[task.priority]}` }} />
                                  {task.priority}
                                </span>
                              )}
                            </div>
                            {/* Hover actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 flex gap-0.5 shrink-0">
                              {col.key !== "done" && (
                                <button
                                  onClick={e => { e.stopPropagation(); moveTask(task.id, col.key === "todo" ? "in-progress" : "done"); }}
                                  className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors"
                                  style={{ background: `${col.color}20`, color: col.color }}
                                  title="Move forward"
                                >→</button>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); moveToTrash({ id: task.id, type: "task", title: task.title, originalData: task }); removeTask(task.id); }}
                                className="w-5 h-5 rounded-lg flex items-center justify-center transition-colors hover:bg-rose-500/20 text-muted-foreground/40 hover:text-rose-400"
                              ><Trash2 size={9} /></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add task */}
                <AnimatePresence>
                  {newTaskCol === col.key ? (
                    <motion.div key="input" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-1">
                      <input
                        autoFocus
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleAdd(col.key);
                          if (e.key === "Escape") { setNewTaskCol(null); setNewTitle(""); }
                        }}
                        onBlur={() => { if (!newTitle.trim()) { setNewTaskCol(null); setNewTitle(""); } }}
                        placeholder="Task title…"
                        className="w-full px-2.5 py-1.5 rounded-xl text-[11px] outline-none"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${col.color}50`,
                          color: "rgba(255,255,255,0.8)",
                          boxShadow: `0 0 0 2px ${col.color}18`,
                        }}
                      />
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setNewTaskCol(col.key)}
                      className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] text-muted-foreground/25 hover:text-muted-foreground/60 hover:bg-white/[0.04] transition-all"
                    >
                      <Plus size={11} /> Add task
                    </button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
