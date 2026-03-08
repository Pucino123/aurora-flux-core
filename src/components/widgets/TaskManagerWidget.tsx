import React, { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Check, Calendar, Flag, List, Clock, Pencil, Sparkles, Loader2, MoreHorizontal, X, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isWeekend } from "date-fns";
import { toast } from "sonner";

const SMART_LISTS = [
  { key: "today", label: "Today", icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/15" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "text-rose-400", bg: "bg-rose-400/15" },
  { key: "all", label: "All", icon: List, color: "text-white/60", bg: "bg-white/10" },
  { key: "flagged", label: "Flagged", icon: Flag, color: "text-orange-400", bg: "bg-orange-400/15" },
];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  medium: "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]",
  low: "bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.6)]",
};

const PRIORITY_SORT: Record<string, number> = { high: 0, medium: 1, low: 2 };

const DURATION_OPTIONS = ["15m", "30m", "1h", "2h", "3h"];

/** Get next workday date string */
function nextWorkday(): string {
  let d = addDays(new Date(), 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return format(d, "yyyy-MM-dd");
}

const TaskManagerWidget = () => {
  const { tasks: fluxTasks, updateTask, createTask, createBlock } = useFlux();
  const today = format(new Date(), "yyyy-MM-dd");

  const [newTitle, setNewTitle] = useState("");
  const [activeList, setActiveList] = useState("today");
  const [viewTab, setViewTab] = useState<"active" | "completed">("active");
  const [completing, setCompleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [auraLoading, setAuraLoading] = useState(false);
  const [rowAuraLoading, setRowAuraLoading] = useState<string | null>(null);
  const [quickMenuId, setQuickMenuId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Derived task pools ───────────────────────────────────────────────────
  const todayTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && (t.scheduled_date === today || t.due_date === today)), [fluxTasks, today]);
  const scheduledTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && t.due_date && t.due_date !== today), [fluxTasks, today]);
  const allTasks = useMemo(() => fluxTasks.filter(t => t.type === "task"), [fluxTasks]);
  const flaggedTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && (t as any).pinned), [fluxTasks]);

  const poolMap: Record<string, typeof allTasks> = { today: todayTasks, scheduled: scheduledTasks, all: allTasks, flagged: flaggedTasks };
  const pool = poolMap[activeList] || [];

  // Sort: flagged first → high → medium → low → rest
  const sortedPool = useMemo(() => [...pool].sort((a, b) => {
    const aFlag = (a as any).pinned ? 0 : 1;
    const bFlag = (b as any).pinned ? 0 : 1;
    if (aFlag !== bFlag) return aFlag - bFlag;
    const ap = PRIORITY_SORT[a.priority ?? "low"] ?? 3;
    const bp = PRIORITY_SORT[b.priority ?? "low"] ?? 3;
    return ap - bp;
  }), [pool]);

  const activeTasks = sortedPool.filter(t => !t.done);
  const completedTasks = sortedPool.filter(t => t.done);
  const counts = {
    today: todayTasks.filter(t => !t.done).length,
    scheduled: scheduledTasks.filter(t => !t.done).length,
    all: allTasks.filter(t => !t.done).length,
    flagged: flaggedTasks.filter(t => !t.done).length,
  };

  const visibleTasks = viewTab === "active" ? activeTasks : completedTasks;

  // ── Handlers ─────────────────────────────────────────────────────────────
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
    setQuickMenuId(null);
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) updateTask(id, { title: editValue.trim() });
    setEditingId(null);
  };

  const toggleFlag = (id: string, current: boolean) => {
    const task = fluxTasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, { pinned: !current } as any);
    // Aura Auto-Sync: schedule if newly flagged
    if (!current) {
      const nwd = nextWorkday();
      createBlock({
        title: `Focus: ${task.title}`,
        time: "09:00",
        duration: "60m",
        type: "task",
        scheduled_date: nwd,
        task_id: id,
      } as any);
      toast(`✨ Aura scheduled 1 hour for "${task.title}" tomorrow at 09:00 AM`, {
        duration: 4000,
        style: {
          background: "rgba(15, 10, 40, 0.9)",
          border: "1px solid rgba(139,92,246,0.4)",
          backdropFilter: "blur(20px)",
          color: "#e2e8f0",
          boxShadow: "0 8px 32px rgba(139,92,246,0.3)",
        },
      });
    }
  };

  const setPriority = (id: string, priority: string) => {
    updateTask(id, { priority } as any);
    setQuickMenuId(null);
    // Aura Auto-Sync: schedule high-priority tasks
    if (priority === "high") {
      const task = fluxTasks.find(t => t.id === id);
      if (task) {
        const nwd = nextWorkday();
        createBlock({
          title: `Focus: ${task.title}`,
          time: "09:00",
          duration: "60m",
          type: "task",
          scheduled_date: nwd,
          task_id: id,
        } as any);
        toast(`✨ Aura scheduled 1 hour for "${task.title}" tomorrow at 09:00 AM`, {
          duration: 4000,
          style: {
            background: "rgba(15, 10, 40, 0.9)",
            border: "1px solid rgba(139,92,246,0.4)",
            backdropFilter: "blur(20px)",
            color: "#e2e8f0",
            boxShadow: "0 8px 32px rgba(139,92,246,0.3)",
          },
        });
      }
    }
  };

  // ── Shared Aura AI helper ────────────────────────────────────────────────
  const invokeAuraBreakdown = useCallback(async (title: string): Promise<string[]> => {
    const response = await supabase.functions.invoke("flux-ai", {
      body: {
        messages: [{ role: "user", content: `Break this task into 3-5 concrete, actionable subtasks. Reply ONLY with a JSON array of strings. No explanation, no markdown. Task: "${title}"` }],
        action: "chat",
        context: { currentPage: "stream" },
      },
    });
    const raw = response.data?.content || response.data?.message || "";
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]) as string[];
    return [];
  }, []);

  // New task breakdown
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
    <div className="h-full flex flex-col gap-2 overflow-hidden" onClick={() => setQuickMenuId(null)}>
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

      {/* iOS-style segmented control */}
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
            visibleTasks.map(task => {
              const isFlagged = !!(task as any).pinned;
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: viewTab === "completed" ? 0.55 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.28 } }}
                  className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0 group/row relative"
                  onClick={e => e.stopPropagation()}
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
                      <div className="flex items-center gap-1">
                        <input
                          ref={editRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveEdit(task.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={e => {
                            if ((e.relatedTarget as HTMLElement)?.dataset?.auraBtn) return;
                            saveEdit(task.id);
                          }}
                          className="flex-1 bg-white/5 border border-emerald-500/50 rounded px-1.5 py-0.5 outline-none text-white/90 text-[11px]"
                        />
                        {/* Row Aura ✨ button */}
                        <motion.button
                          data-aura-btn="1"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.85 }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handleRowAuraBreakdown(task.id, editValue || task.title)}
                          disabled={rowAuraLoading === task.id}
                          title="Ask Aura to break into subtasks"
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                          style={{
                            background: "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(16,185,129,0.5))",
                            boxShadow: "0 0 8px rgba(139,92,246,0.6)",
                            border: "0.5px solid rgba(139,92,246,0.4)",
                          }}
                        >
                          {rowAuraLoading === task.id
                            ? <Loader2 size={8} className="text-violet-300 animate-spin" />
                            : <Sparkles size={8} className="text-violet-300" />}
                        </motion.button>
                      </div>
                    ) : (
                      <p className={`text-[11px] leading-tight transition-all ${task.done ? "line-through decoration-slate-400/60 text-white/30" : "text-white/80"}`}>
                        {isFlagged && <span className="text-amber-400 mr-1">●</span>}
                        {task.title}
                      </p>
                    )}
                    {task.due_date && editingId !== task.id && (
                      <p className="text-[9px] text-white/30 mt-0.5 flex items-center gap-1">
                        <Clock size={7} /> {task.due_date}
                      </p>
                    )}
                  </div>

                  {/* Priority dot */}
                  {task.priority && PRIORITY_DOT[task.priority] && (
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_DOT[task.priority]}`} />
                  )}

                  {/* Flag toggle */}
                  {!task.done && editingId !== task.id && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleFlag(task.id, isFlagged); }}
                      className={`shrink-0 mt-0.5 transition-all ${
                        isFlagged
                          ? "text-amber-400 opacity-100"
                          : "text-white/20 opacity-0 group-hover/row:opacity-60 hover:!opacity-100"
                      }`}
                      title={isFlagged ? "Unflag" : "Flag (schedules with Aura)"}
                    >
                      <Flag size={9} fill={isFlagged ? "currentColor" : "none"} />
                    </button>
                  )}

                  {/* Edit + quick menu — on hover */}
                  {!task.done && editingId !== task.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(task.id, task.title)}
                        className="mt-0.5 text-white/30 hover:text-white transition-colors"
                      >
                        <Pencil size={9} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setQuickMenuId(prev => prev === task.id ? null : task.id); }}
                        className="mt-0.5 text-white/30 hover:text-white transition-colors"
                      >
                        <MoreHorizontal size={9} />
                      </button>
                    </div>
                  )}

                  {/* Quick priority / duration menu */}
                  <AnimatePresence>
                    {quickMenuId === task.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-7 z-50 rounded-xl p-2 flex flex-col gap-1 min-w-[130px]"
                        style={{
                          background: "rgba(15,10,40,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          backdropFilter: "blur(20px)",
                          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider px-1 mb-0.5">Priority</p>
                        {(["high", "medium", "low"] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setPriority(task.id, p)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] transition-all ${
                              task.priority === p ? "bg-white/10 text-white/90" : "text-white/45 hover:bg-white/8 hover:text-white/70"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[p]}`} />
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                            {task.priority === p && <Check size={7} className="ml-auto" />}
                          </button>
                        ))}
                        <div className="w-full h-px my-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />
                        <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider px-1 mb-0.5">Est. Time</p>
                        <div className="flex flex-wrap gap-1 px-1">
                          {DURATION_OPTIONS.map(d => (
                            <button
                              key={d}
                              onClick={() => { setQuickMenuId(null); }}
                              className="px-1.5 py-0.5 rounded text-[9px] text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
                              style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
                            >
                              <Timer size={7} className="inline mr-0.5" />{d}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setQuickMenuId(null)}
                          className="self-end text-white/20 hover:text-white/50 transition-colors mt-0.5 pr-1"
                        >
                          <X size={8} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Quick add + Aura ✨ */}
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
            : <Sparkles size={9} className="text-violet-300" />}
        </motion.button>
      </div>
    </div>
  );
};

export default TaskManagerWidget;
