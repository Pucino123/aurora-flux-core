import React, { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Check, Calendar, Flag, List, Clock, Pencil, Sparkles, Loader2, MoreHorizontal, X, Timer, FileText, User, Link2 } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isWeekend } from "date-fns";
import { toast } from "sonner";
import ProgressRing from "@/components/ProgressRing";

// ─── Constants ──────────────────────────────────────────────────────────────

const SMART_LISTS = [
  { key: "today",     label: "Today",     icon: Calendar,    color: "text-blue-400",   bg: "bg-blue-400/15"   },
  { key: "scheduled", label: "Scheduled", icon: Clock,       color: "text-rose-400",   bg: "bg-rose-400/15"   },
  { key: "all",       label: "All",       icon: List,        color: "text-white/60",   bg: "bg-white/10"      },
  { key: "flagged",   label: "Flagged",   icon: Flag,        color: "text-orange-400", bg: "bg-orange-400/15" },
];

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-rose-500  shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  medium: "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]",
  low:    "bg-blue-400  shadow-[0_0_5px_rgba(96,165,250,0.6)]",
};

const PRIORITY_SORT: Record<string, number> = { high: 0, medium: 1, low: 2 };
const DURATION_OPTIONS = ["15m", "30m", "1h", "2h", "3h"];

function nextWorkday(): string {
  let d = addDays(new Date(), 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return format(d, "yyyy-MM-dd");
}

// ─── Swipeable Task Card ─────────────────────────────────────────────────────

interface SwipeableTaskCardProps {
  task: any;
  cfg: (typeof SMART_LISTS)[0];
  completing: string | null;
  editingId: string | null;
  editValue: string;
  editRef: React.RefObject<HTMLInputElement>;
  rowAuraLoading: string | null;
  quickMenuId: string | null;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onStartEdit: (id: string, title: string) => void;
  onSaveEdit: (id: string) => void;
  onEditChange: (v: string) => void;
  onCancelEdit: () => void;
  onRowAura: (id: string, title: string) => void;
  onToggleFlag: (id: string, flagged: boolean) => void;
  onSetPriority: (id: string, p: string) => void;
  onSetQuickMenu: (id: string | null) => void;
  onDelete: (id: string) => void;
}

const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task, cfg, completing, editingId, editValue, editRef, rowAuraLoading,
  quickMenuId, onComplete, onUncomplete, onStartEdit, onSaveEdit,
  onEditChange, onCancelEdit, onRowAura, onToggleFlag, onSetPriority,
  onSetQuickMenu, onDelete,
}) => {
  const SWIPE_THRESHOLD = 100;
  const isFlagged = !!(task as any).pinned;

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      onDelete(task.id);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      toast("📅 Reschedule tapped — date picker coming soon!", { duration: 2500 });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-1.5">
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        {/* Right swipe → reschedule (amber) */}
        <div className="flex items-center gap-2 text-amber-300">
          <Calendar size={14} />
          <span className="text-xs font-semibold">Reschedule</span>
        </div>
        {/* Left swipe → delete (rose) */}
        <div className="flex items-center gap-2 text-rose-300">
          <span className="text-xs font-semibold">Delete</span>
          <X size={14} />
        </div>
      </div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 0.98 }}
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: task.done ? 0.5 : 1, x: 0 }}
        exit={{ opacity: 0, x: 24, transition: { duration: 0.24 } }}
        className="flex items-start gap-2 py-2 px-2.5 rounded-xl border border-white/6 bg-[hsl(var(--card)/0.6)] backdrop-blur-sm group/row relative cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        {/* Checkbox */}
        <motion.button
          whileTap={{ scale: 0.6 }}
          onClick={() => task.done ? onUncomplete(task.id) : onComplete(task.id)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            task.done || completing === task.id
              ? `border-0 ${cfg.bg}`
              : "border-white/20 hover:border-white/50"
          }`}
        >
          {(task.done || completing === task.id) && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
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
                onChange={e => onEditChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") onSaveEdit(task.id);
                  if (e.key === "Escape") onCancelEdit();
                }}
                onBlur={e => {
                  if ((e.relatedTarget as HTMLElement)?.dataset?.auraBtn) return;
                  onSaveEdit(task.id);
                }}
                className="flex-1 bg-white/5 border border-emerald-500/50 rounded px-1.5 py-0.5 outline-none text-foreground/90 text-[11px]"
              />
              <motion.button
                data-aura-btn="1"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.85 }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onRowAura(task.id, editValue || task.title)}
                disabled={rowAuraLoading === task.id}
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(139,92,246,.5),rgba(16,185,129,.5))", boxShadow: "0 0 8px rgba(139,92,246,.6)", border: "0.5px solid rgba(139,92,246,.4)" }}
              >
                {rowAuraLoading === task.id
                  ? <Loader2 size={8} className="text-violet-300 animate-spin" />
                  : <Sparkles size={8} className="text-violet-300" />}
              </motion.button>
            </div>
          ) : (
            <p className={`text-[11px] leading-tight ${task.done ? "line-through decoration-muted-foreground/60 text-muted-foreground/50" : "text-foreground/80"}`}>
              {isFlagged && <span className="text-amber-400 mr-1">●</span>}
              {task.title}
            </p>
          )}

          {/* Linked entity pill */}
          {(task as any).linkedEntity && editingId !== task.id && (
            <div className="flex items-center gap-1 mt-0.5">
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] cursor-pointer transition-all hover:opacity-80"
                style={{ background: "rgba(139,92,246,0.15)", border: "0.5px solid rgba(139,92,246,0.35)", color: "rgb(196,181,253)" }}
              >
                {(task as any).linkedEntity.type === "document" ? <FileText size={7} /> : <User size={7} />}
                <span className="truncate max-w-[80px]">{(task as any).linkedEntity.name}</span>
              </div>
            </div>
          )}

          {task.due_date && editingId !== task.id && (
            <p className="text-[9px] text-muted-foreground/40 mt-0.5 flex items-center gap-1">
              <Clock size={7} /> {task.due_date}
            </p>
          )}
        </div>

        {/* Priority dot */}
        {task.priority && PRIORITY_DOT[task.priority] && (
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_DOT[task.priority]}`} />
        )}

        {/* Flag */}
        {!task.done && editingId !== task.id && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFlag(task.id, isFlagged); }}
            className={`shrink-0 mt-0.5 transition-all ${
              isFlagged ? "text-amber-400 opacity-100" : "text-muted-foreground/20 opacity-0 group-hover/row:opacity-60 hover:!opacity-100"
            }`}
          >
            <Flag size={9} fill={isFlagged ? "currentColor" : "none"} />
          </button>
        )}

        {/* Hover actions */}
        {!task.done && editingId !== task.id && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onStartEdit(task.id, task.title)} className="mt-0.5 text-muted-foreground/30 hover:text-foreground transition-colors">
              <Pencil size={9} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onSetQuickMenu(quickMenuId === task.id ? null : task.id); }}
              className="mt-0.5 text-muted-foreground/30 hover:text-foreground transition-colors"
            >
              <MoreHorizontal size={9} />
            </button>
          </div>
        )}

        {/* Quick menu */}
        <AnimatePresence>
          {quickMenuId === task.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-7 z-50 rounded-xl p-2 flex flex-col gap-1 min-w-[130px]"
              style={{ background: "rgba(15,10,40,.95)", border: "1px solid rgba(255,255,255,.1)", backdropFilter: "blur(20px)", boxShadow: "0 12px 40px rgba(0,0,0,.6)" }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider px-1 mb-0.5">Priority</p>
              {(["high", "medium", "low"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => onSetPriority(task.id, p)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] transition-all ${
                    task.priority === p ? "bg-white/10 text-white/90" : "text-white/45 hover:bg-white/8 hover:text-white/70"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[p]}`} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                  {task.priority === p && <Check size={7} className="ml-auto" />}
                </button>
              ))}
              <div className="w-full h-px my-0.5" style={{ background: "rgba(255,255,255,.07)" }} />
              <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider px-1 mb-0.5">Est. Time</p>
              <div className="flex flex-wrap gap-1 px-1">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => onSetQuickMenu(null)}
                    className="px-1.5 py-0.5 rounded text-[9px] text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
                    style={{ border: "0.5px solid rgba(255,255,255,.1)" }}
                  >
                    <Timer size={7} className="inline mr-0.5" />{d}
                  </button>
                ))}
              </div>
              <button onClick={() => onSetQuickMenu(null)} className="self-end text-white/20 hover:text-white/50 transition-colors mt-0.5 pr-1">
                <X size={8} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ─── Main Widget ─────────────────────────────────────────────────────────────

const TaskManagerWidget = () => {
  const { tasks: fluxTasks, updateTask, createTask, createBlock, deleteTask } = useFlux();
  const today = format(new Date(), "yyyy-MM-dd");

  const [newTitle, setNewTitle] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeList, setActiveList] = useState("today");
  const [viewTab, setViewTab] = useState<"active" | "completed">("active");
  const [completing, setCompleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [auraLoading, setAuraLoading] = useState(false);
  const [rowAuraLoading, setRowAuraLoading] = useState<string | null>(null);
  const [quickMenuId, setQuickMenuId] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Derived task pools ───────────────────────────────────────────────────
  const todayTasks     = useMemo(() => fluxTasks.filter(t => t.type === "task" && (t.scheduled_date === today || t.due_date === today)), [fluxTasks, today]);
  const scheduledTasks = useMemo(() => fluxTasks.filter(t => t.type === "task" && t.due_date && t.due_date !== today), [fluxTasks, today]);
  const allTasks       = useMemo(() => fluxTasks.filter(t => t.type === "task"), [fluxTasks]);
  const flaggedTasks   = useMemo(() => fluxTasks.filter(t => t.type === "task" && (t as any).pinned), [fluxTasks]);

  const poolMap: Record<string, typeof allTasks> = { today: todayTasks, scheduled: scheduledTasks, all: allTasks, flagged: flaggedTasks };
  const pool = poolMap[activeList] || [];

  const sortedPool = useMemo(() => [...pool].sort((a, b) => {
    const aFlag = (a as any).pinned ? 0 : 1;
    const bFlag = (b as any).pinned ? 0 : 1;
    if (aFlag !== bFlag) return aFlag - bFlag;
    const ap = PRIORITY_SORT[a.priority ?? "low"] ?? 3;
    const bp = PRIORITY_SORT[b.priority ?? "low"] ?? 3;
    return ap - bp;
  }), [pool]);

  const activeTasks    = sortedPool.filter(t => !t.done);
  const completedTasks = sortedPool.filter(t => t.done);
  const counts = {
    today:     todayTasks.filter(t => !t.done).length,
    scheduled: scheduledTasks.filter(t => !t.done).length,
    all:       allTasks.filter(t => !t.done).length,
    flagged:   flaggedTasks.filter(t => !t.done).length,
  };

  const visibleTasks = viewTab === "active" ? activeTasks : completedTasks;

  // Progress ring stats
  const totalToday     = todayTasks.length;
  const completedToday = todayTasks.filter(t => t.done).length;
  const progressPct    = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const isPerfectDay   = totalToday > 0 && completedToday === totalToday;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleComplete = (id: string) => {
    setCompleting(id);
    setTimeout(() => { updateTask(id, { done: true }); setCompleting(null); }, 480);
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
  const saveEdit  = (id: string) => { if (editValue.trim()) updateTask(id, { title: editValue.trim() }); setEditingId(null); };
  const cancelEdit = () => setEditingId(null);

  const handleDelete = useCallback((id: string) => {
    // Optimistic removal via done = true then delete if deleteTask exists
    updateTask(id, { done: true });
    setTimeout(() => {
      if (typeof (deleteTask as any) === "function") (deleteTask as any)(id);
    }, 300);
    toast("Task removed", { duration: 2000 });
  }, [updateTask, deleteTask]);

  const toggleFlag = (id: string, current: boolean) => {
    const task = fluxTasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, { pinned: !current } as any);
    if (!current) {
      const nwd = nextWorkday();
      createBlock({ title: `Focus: ${task.title}`, time: "09:00", duration: "60m", type: "task", scheduled_date: nwd, task_id: id } as any);
      toast(`✨ Aura scheduled 1 hour for "${task.title}" tomorrow at 09:00 AM`, {
        duration: 4000,
        style: { background: "rgba(15,10,40,.9)", border: "1px solid rgba(139,92,246,.4)", backdropFilter: "blur(20px)", color: "#e2e8f0", boxShadow: "0 8px 32px rgba(139,92,246,.3)" },
      });
    }
  };

  const setPriority = (id: string, priority: string) => {
    updateTask(id, { priority } as any);
    setQuickMenuId(null);
    if (priority === "high") {
      const task = fluxTasks.find(t => t.id === id);
      if (task) {
        const nwd = nextWorkday();
        createBlock({ title: `Focus: ${task.title}`, time: "09:00", duration: "60m", type: "task", scheduled_date: nwd, task_id: id } as any);
        toast(`✨ Aura scheduled 1 hour for "${task.title}" tomorrow at 09:00 AM`, {
          duration: 4000,
          style: { background: "rgba(15,10,40,.9)", border: "1px solid rgba(139,92,246,.4)", backdropFilter: "blur(20px)", color: "#e2e8f0", boxShadow: "0 8px 32px rgba(139,92,246,.3)" },
        });
      }
    }
  };

  // ── Aura AI ───────────────────────────────────────────────────────────────
  const invokeAuraBreakdown = useCallback(async (title: string): Promise<string[]> => {
    const response = await supabase.functions.invoke("flux-ai", {
      body: {
        messages: [{ role: "user", content: `Break this task into 3-5 concrete, actionable subtasks. Reply ONLY with a JSON array of strings. No explanation, no markdown. Task: "${title}"` }],
        action: "chat",
        context: { currentPage: "stream" },
      },
    });
    const raw   = response.data?.content || response.data?.message || "";
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]) as string[];
    return [];
  }, []);

  const handleAuraBreakdown = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || auraLoading) return;
    setAuraLoading(true);
    try {
      const subtasks = await invokeAuraBreakdown(title);
      if (subtasks.length > 0) {
        createTask({ title, type: "task", scheduled_date: today });
        for (const sub of subtasks)
          if (typeof sub === "string" && sub.trim())
            createTask({ title: `↳ ${sub.trim()}`, type: "task", scheduled_date: today });
        setNewTitle("");
      }
    } catch (err) { console.error("Aura breakdown failed:", err); }
    finally { setAuraLoading(false); inputRef.current?.focus(); }
  }, [newTitle, auraLoading, createTask, today, invokeAuraBreakdown]);

  const handleRowAuraBreakdown = useCallback(async (taskId: string, taskTitle: string) => {
    if (rowAuraLoading) return;
    setRowAuraLoading(taskId);
    try {
      const subtasks = await invokeAuraBreakdown(taskTitle);
      if (subtasks.length > 0) {
        for (const sub of subtasks)
          if (typeof sub === "string" && sub.trim())
            createTask({ title: `↳ ${sub.trim()}`, type: "task", scheduled_date: today });
        setEditingId(null);
      }
    } catch (err) { console.error("Row Aura breakdown failed:", err); }
    finally { setRowAuraLoading(null); }
  }, [rowAuraLoading, invokeAuraBreakdown, createTask, today]);

  // ── OS-wide drop target ───────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(true);
  };
  const handleDragLeave = () => setIsDropTarget(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const entity = JSON.parse(raw) as { type: "document" | "contact"; id: string; name: string };
      const title = entity.type === "document" ? `Review ${entity.name}` : `Follow up with ${entity.name}`;
      createTask({ title, type: "task", scheduled_date: today } as any);
      toast(`🔗 Linked task created: "${title}"`, {
        duration: 3000,
        style: { background: "rgba(15,10,40,.9)", border: "1px solid rgba(139,92,246,.4)", backdropFilter: "blur(20px)", color: "#e2e8f0" },
      });
    } catch {}
  };

  const cfg = SMART_LISTS.find(l => l.key === activeList)!;

  return (
    <div
      className={`h-full flex flex-col gap-2 overflow-hidden transition-all duration-200 ${isDropTarget ? "ring-2 ring-violet-400/50 ring-offset-1 ring-offset-transparent rounded-2xl" : ""}`}
      onClick={() => setQuickMenuId(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── PHASE 1: Progress Ring Header ────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0 px-0.5 pb-1 border-b border-white/6">
        {/* SVG Progress Ring */}
        <div className="relative shrink-0">
          <svg width={52} height={52} className="-rotate-90">
            {/* Track */}
            <circle cx={26} cy={26} r={21} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
            {/* Fill */}
            <motion.circle
              cx={26} cy={26} r={21}
              fill="none"
              stroke="url(#taskRingGrad)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 21}
              initial={{ strokeDashoffset: 2 * Math.PI * 21 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 21 * (1 - progressPct / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="taskRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          {/* Percentage label */}
          <div className="absolute inset-0 flex items-center justify-center rotate-0">
            <span className="text-[11px] font-bold text-white/70">{progressPct}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">Daily Focus</p>
          <p className="text-sm font-bold text-foreground/80 leading-tight">
            {completedToday} of {totalToday} done
          </p>
          <AnimatePresence>
            {isPerfectDay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "linear-gradient(135deg,rgba(52,211,153,.25),rgba(34,211,238,.25))", border: "0.5px solid rgba(52,211,153,.5)", color: "rgb(110,231,183)", boxShadow: "0 0 12px rgba(52,211,153,.3)" }}
              >
                ✦ Perfect Day
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drop target hint */}
        {isDropTarget && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-semibold flex items-center gap-1"
            style={{ color: "rgb(196,181,253)" }}
          >
            <Link2 size={10} />
            Link entity
          </motion.div>
        )}
      </div>

      {/* ── Smart list grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 shrink-0">
        {SMART_LISTS.map(sl => (
          <button
            key={sl.key}
            onClick={() => setActiveList(sl.key)}
            className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
              activeList === sl.key ? `${sl.bg} border-white/15` : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.07]"
            }`}
          >
            <div className={`w-6 h-6 rounded-full ${sl.bg} flex items-center justify-center shrink-0`}>
              <sl.icon size={12} className={sl.color} />
            </div>
            <div className="text-left min-w-0">
              <p className={`text-lg font-bold leading-none ${activeList === sl.key ? "text-foreground/90" : "text-foreground/50"}`}>
                {counts[sl.key as keyof typeof counts]}
              </p>
              <p className="text-[9px] text-muted-foreground/40 mt-0.5">{sl.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Segmented control */}
      <div className="flex items-center shrink-0 bg-white/[0.04] rounded-xl p-0.5">
        {(["active", "completed"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all ${
              viewTab === tab ? "bg-white/10 text-foreground/90 shadow-sm" : "text-muted-foreground/40 hover:text-muted-foreground/60"
            }`}
          >
            {tab === "active" ? "Active" : "Completed"}
          </button>
        ))}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between shrink-0 px-0.5">
        <span className={`text-[12px] font-semibold ${cfg.color}`}>{cfg.label}</span>
        <span className="text-[10px] text-muted-foreground/30">{visibleTasks.length} tasks</span>
      </div>

      {/* ── PHASE 2 + 3: Swipeable task list ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
        <AnimatePresence initial={false}>
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-16 gap-1">
              <p className="text-[11px] text-muted-foreground/20">
                {viewTab === "active" ? "All clear ✨" : "Nothing completed yet"}
              </p>
              {isDropTarget && (
                <p className="text-[10px] text-violet-400/60">Drop here to create a linked task</p>
              )}
            </div>
          ) : (
            visibleTasks.map(task => (
              <SwipeableTaskCard
                key={task.id}
                task={task}
                cfg={cfg}
                completing={completing}
                editingId={editingId}
                editValue={editValue}
                editRef={editRef as React.RefObject<HTMLInputElement>}
                rowAuraLoading={rowAuraLoading}
                quickMenuId={quickMenuId}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onEditChange={setEditValue}
                onCancelEdit={cancelEdit}
                onRowAura={handleRowAuraBreakdown}
                onToggleFlag={toggleFlag}
                onSetPriority={setPriority}
                onSetQuickMenu={setQuickMenuId}
                onDelete={handleDelete}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ── PHASE 4: Smart NLP Input ─────────────────────────────────────── */}
      <motion.div
        animate={{
          boxShadow: isInputFocused
            ? "0 0 0 1px rgba(139,92,246,0.5), 0 4px 24px rgba(139,92,246,0.2)"
            : "0 0 0 1px rgba(255,255,255,0.07)",
          background: isInputFocused ? "rgba(139,92,246,0.07)" : "rgba(255,255,255,0.04)",
        }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl shrink-0"
      >
        <motion.button
          whileTap={{ scale: 0.75, rotate: 90 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="text-muted-foreground/40 hover:text-foreground/60 transition-colors"
          onClick={handleAdd}
        >
          <Plus size={13} />
        </motion.button>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Type a task, e.g. 'Call John tomorrow at 3pm'…"
          className="flex-1 bg-transparent text-[11px] text-foreground/70 placeholder:text-muted-foreground/25 outline-none min-w-0"
        />
        <AnimatePresence>
          {newTitle.trim() && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAuraBreakdown}
              disabled={auraLoading}
              title="Aura AI breakdown"
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,.5),rgba(16,185,129,.5))", boxShadow: "0 0 8px rgba(139,92,246,.6)", border: "0.5px solid rgba(139,92,246,.4)" }}
            >
              {auraLoading
                ? <Loader2 size={9} className="text-violet-300 animate-spin" />
                : <Sparkles size={9} className="text-violet-300" />}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default TaskManagerWidget;
