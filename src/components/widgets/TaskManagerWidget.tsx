import React, { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Check, Calendar, Flag, List, Clock, Pencil, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const SMART_LISTS = [
  { key: "today", label: "Today", icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/15" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "text-rose-400", bg: "bg-rose-400/15" },
  { key: "all", label: "All", icon: List, color: "text-white/60", bg: "bg-white/10" },
  { key: "flagged", label: "Flagged", icon: Flag, color: "text-orange-400", bg: "bg-orange-400/15" },
];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.7)]",
  medium: "bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]",
  low: "bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.6)]",
};

const TaskManagerWidget = () => {
  const { tasks: fluxTasks, updateTask, createTask } = useFlux();
  const today = format(new Date(), "yyyy-MM-dd");

  const [newTitle, setNewTitle] = useState("");
  const [activeList, setActiveList] = useState("today");
  const [viewTab, setViewTab] = useState<"active" | "completed">("active");
  const [completing, setCompleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [auraLoading, setAuraLoading] = useState(false);
  const [rowAuraLoading, setRowAuraLoading] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const todayTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && (t.scheduled_date === today || t.due_date === today)), [fluxTasks, today]);
  const scheduledTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && t.due_date && t.due_date !== today), [fluxTasks, today]);
  const allTasks = useMemo(() => fluxTasks.filter(t => t.type === "task"), [fluxTasks]);
  const flaggedTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && t.priority === "high"), [fluxTasks]);

  const poolMap: Record<string, typeof allTasks> = { today: todayTasks, scheduled: scheduledTasks, all: allTasks, flagged: flaggedTasks };
  const pool = poolMap[activeList] || [];

  const activeTasks = pool.filter(t => !t.done);
  const completedTasks = pool.filter(t => t.done);
  const counts = { today: todayTasks.filter(t => !t.done).length, scheduled: scheduledTasks.filter(t => !t.done).length, all: allTasks.filter(t => !t.done).length, flagged: flaggedTasks.filter(t => !t.done).length };

  const visibleTasks = viewTab === "active" ? activeTasks : completedTasks;

  const handleComplete = async (id: string) => {
    setCompleting(id);
    setTimeout(() => {
      updateTask(id, { done: true });
      setCompleting(null);
    }, 480);
  };

  const handleUncomplete = (id: string) => updateTask(id, { done: false });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createTask({ title: newTitle.trim(), type: "task", scheduled_date: today });
    setNewTitle("");
  };

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) updateTask(id, { title: editValue.trim() });
    setEditingId(null);
  };

  // ── Aura AI: shared breakdown helper ─────────────────────────────────────
  const invokeAuraBreakdown = useCallback(async (title: string): Promise<string[]> => {
    const response = await supabase.functions.invoke("flux-ai", {
      body: {
        messages: [
          {
            role: "user",
            content: `Break this task into 3-5 concrete, actionable subtasks. Reply ONLY with a JSON array of strings, each being one subtask. No explanation, no markdown, just the JSON array. Task: "${title}"`,
          },
        ],
        action: "chat",
        context: { currentPage: "stream" },
      },
    });
    const raw = response.data?.content || response.data?.message || "";
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]) as string[];
    return [];
  }, []);

  // ── New task input breakdown ──────────────────────────────────────────────
  const handleAuraBreakdown = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || auraLoading) return;
    setAuraLoading(true);
    try {
      const subtasks = await invokeAuraBreakdown(title);
      if (subtasks.length > 0) {
        createTask({ title, type: "task", scheduled_date: today });
        for (const sub of subtasks) {
          if (typeof sub === "string" && sub.trim())
            createTask({ title: `↳ ${sub.trim()}`, type: "task", scheduled_date: today });
        }
        setNewTitle("");
      }
    } catch (err) {
      console.error("Aura breakdown failed:", err);
    } finally {
      setAuraLoading(false);
      inputRef.current?.focus();
    }
  }, [newTitle, auraLoading, createTask, today, invokeAuraBreakdown]);

  // ── Existing task row breakdown ───────────────────────────────────────────
  const handleRowAuraBreakdown = useCallback(async (taskId: string, taskTitle: string) => {
    if (rowAuraLoading) return;
    setRowAuraLoading(taskId);
    try {
      const subtasks = await invokeAuraBreakdown(taskTitle);
      if (subtasks.length > 0) {
        for (const sub of subtasks) {
          if (typeof sub === "string" && sub.trim())
            createTask({ title: `↳ ${sub.trim()}`, type: "task", scheduled_date: today });
        }
        setEditingId(null);
      }
    } catch (err) {
      console.error("Row Aura breakdown failed:", err);
    } finally {
      setRowAuraLoading(null);
    }
  }, [rowAuraLoading, invokeAuraBreakdown, createTask, today]);

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

      {/* iOS-style Active / Completed segmented control */}
      <div className="flex items-center shrink-0 bg-white/5 rounded-xl p-0.5">
        {(["active", "completed"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all ${
              viewTab === tab ? "bg-white/12 text-white/90 shadow-sm" : "text-white/35 hover:text-white/55"
            }`}
          >
            {tab === "active" ? "Active" : "Completed"}
          </button>
        ))}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between shrink-0 px-0.5">
        <span className={`text-[12px] font-semibold ${cfg.color}`}>{cfg.label}</span>
        <span className="text-[10px] text-white/30">{visibleTasks.length} tasks</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
        <AnimatePresence initial={false}>
          {visibleTasks.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-[11px] text-white/20">
              {viewTab === "active" ? "All clear ✨" : "Nothing completed yet"}
            </div>
          ) : (
            visibleTasks.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: viewTab === "completed" ? 0.55 : 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.28 } }}
                className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0 group/row"
              >
                {/* Checkbox */}
                <motion.button
                  whileTap={{ scale: 0.7 }}
                  onClick={() => task.done ? handleUncomplete(task.id) : handleComplete(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    task.done || completing === task.id
                      ? `border-0 ${cfg.bg}`
                      : `border-white/20 hover:border-white/50`
                  }`}
                >
                  {(task.done || completing === task.id) && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                      <Check size={10} className={cfg.color} />
                    </motion.div>
                  )}
                </motion.button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingId === task.id ? (
                    <input
                      ref={editRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
                      onBlur={() => saveEdit(task.id)}
                      className="w-full bg-white/5 border border-emerald-500/50 rounded px-2 py-0.5 outline-none text-white/90 text-[12px]"
                    />
                  ) : (
                    <p className={`text-[12px] leading-tight transition-all ${task.done ? "line-through decoration-slate-400/60 text-white/30" : "text-white/80"}`}>
                      {task.title}
                    </p>
                  )}
                  {task.due_date && !editingId && (
                    <p className="text-[9px] text-white/30 mt-0.5 flex items-center gap-1">
                      <Clock size={8} /> {task.due_date}
                    </p>
                  )}
                </div>

                {/* Priority dot */}
                {task.priority && PRIORITY_DOT[task.priority] && (
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_DOT[task.priority]}`} />
                )}

                {/* Edit icon — appears on row hover */}
                {!task.done && editingId !== task.id && (
                  <button
                    onClick={() => startEdit(task.id, task.title)}
                    className="opacity-0 group-hover/row:opacity-60 hover:!opacity-100 transition-opacity shrink-0 mt-0.5 text-white/40 hover:text-white"
                  >
                    <Pencil size={10} />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Quick add with Aura AI button */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/6 shrink-0">
        <button className="text-white/30 hover:text-white/60 transition-colors" onClick={handleAdd}>
          <Plus size={14} />
        </button>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="New Reminder..."
          className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAuraBreakdown}
          disabled={!newTitle.trim() || auraLoading}
          title={newTitle.trim() ? "Ask Aura to break down this task" : "Type a task first"}
          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: newTitle.trim()
              ? "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(16,185,129,0.5))"
              : "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(16,185,129,0.2))",
            boxShadow: newTitle.trim() ? "0 0 8px rgba(139,92,246,0.6)" : "none",
            border: "0.5px solid rgba(139,92,246,0.4)",
          }}
        >
          {auraLoading
            ? <Loader2 size={9} className="text-violet-300 animate-spin" />
            : <Sparkles size={9} className="text-violet-300" />
          }
        </motion.button>
      </div>
    </div>
  );
};

export default TaskManagerWidget;
