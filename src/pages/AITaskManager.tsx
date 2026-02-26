import React, { useState, useMemo, useCallback } from "react";
import { useFlux } from "@/context/FluxContext";
import { format, isToday, isTomorrow, isPast, parseISO, addDays } from "date-fns";
import {
  Check, Plus, Trash2, ArrowUpRight, Sparkles, Loader2,
  GripVertical, Calendar, Flag, ChevronDown, Circle,
  MoreHorizontal, AlignLeft, Tag, User, Clock, Filter,
  SortAsc, Search, X, CheckCircle2, AlertCircle, Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, closestCenter, PointerSensor, useSensor,
  useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ── Priority config ── */
const PRIORITIES = [
  { value: "critical", label: "Critical", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", dot: "bg-red-400", icon: AlertCircle },
  { value: "high",     label: "High",     color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", dot: "bg-orange-400", icon: ArrowUpRight },
  { value: "medium",   label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", dot: "bg-yellow-400", icon: Minus },
  { value: "low",      label: "Low",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/25",  dot: "bg-green-400",  icon: Circle },
];
const getPriority = (p: string | null) => PRIORITIES.find(x => x.value === p) || PRIORITIES[2];

/* ── Status ── */
const STATUSES = [
  { value: "todo",        label: "To Do",       color: "bg-muted text-muted-foreground" },
  { value: "in_progress", label: "In Progress",  color: "bg-blue-500/15 text-blue-400" },
  { value: "done",        label: "Done",         color: "bg-green-500/15 text-green-400" },
  { value: "blocked",     label: "Blocked",      color: "bg-red-500/15 text-red-400" },
];
const getStatus = (s: string) => STATUSES.find(x => x.value === s) || STATUSES[0];

function formatDue(date: string | null): { label: string; urgent: boolean } | null {
  if (!date) return null;
  try {
    const d = parseISO(date);
    if (isToday(d)) return { label: "Today", urgent: true };
    if (isTomorrow(d)) return { label: "Tomorrow", urgent: false };
    if (isPast(d)) return { label: "Overdue", urgent: true };
    return { label: format(d, "MMM d"), urgent: false };
  } catch { return null; }
}

/* ── Task Row ── */
const SortableTaskRow = React.memo(({
  task, editingId, editValue, setEditingId, setEditValue,
  expandedId, setExpandedId, onToggle, onRemove, onUpdate,
}: {
  task: any; editingId: string | null; editValue: string;
  expandedId: string | null;
  setEditingId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  setExpandedId: (id: string | null) => void;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 100 : "auto" };

  const isEditing = editingId === task.id;
  const isExpanded = expandedId === task.id;
  const prio = getPriority(task.priority);
  const status = getStatus(task.status || "todo");
  const due = formatDue(task.due_date);

  return (
    <div ref={setNodeRef} style={style as any}>
      <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
        <div
          className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 border border-transparent hover:border-border/40 hover:bg-secondary/30 ${task.done ? "opacity-50" : ""}`}
        >
          {/* Drag handle */}
          <div {...attributes} {...listeners}
            className="cursor-grab mt-0.5 text-muted-foreground/25 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 touch-none select-none">
            <GripVertical size={13} />
          </div>

          {/* Checkbox */}
          <button
            onClick={() => onToggle(task.id, task.done)}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
              task.done ? "bg-primary border-primary scale-95" : "border-border hover:border-primary/70 hover:scale-105"
            }`}
          >
            {task.done && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start gap-2 flex-wrap">
              {isEditing ? (
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => { if (editValue.trim()) onUpdate(task.id, { title: editValue.trim() }); setEditingId(null); }}
                  onKeyDown={e => {
                    if (e.key === "Enter") { if (editValue.trim()) onUpdate(task.id, { title: editValue.trim() }); setEditingId(null); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-transparent border-b-2 border-primary/50 outline-none text-sm py-0.5 min-w-0"
                  autoFocus
                />
              ) : (
                <p
                  onClick={() => { setEditingId(task.id); setEditValue(task.title); }}
                  className={`text-sm cursor-text ${task.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}
                >
                  {task.title}
                </p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status badge */}
              <button
                onClick={() => {
                  const idx = STATUSES.findIndex(s => s.value === (task.status || "todo"));
                  const next = STATUSES[(idx + 1) % STATUSES.length];
                  onUpdate(task.id, { status: next.value, done: next.value === "done" });
                }}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${status.color} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                {status.label}
              </button>

              {/* Priority dot */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${prio.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                {prio.label}
              </span>

              {/* Due date */}
              {due && (
                <span className={`inline-flex items-center gap-1 text-[10px] ${due.urgent ? "text-red-400" : "text-muted-foreground"}`}>
                  <Calendar size={10} />
                  {due.label}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
            <button onClick={() => setExpandedId(isExpanded ? null : task.id)}
              className="p-1 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal size={13} />
            </button>
            <button onClick={() => onRemove(task.id)}
              className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Expanded panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-9 mr-3 mb-2 px-3 py-3 rounded-xl bg-secondary/20 border border-border/30 grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Priority */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Priority</label>
                  <div className="flex flex-wrap gap-1">
                    {PRIORITIES.map(p => (
                      <button key={p.value} onClick={() => onUpdate(task.id, { priority: p.value })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${task.priority === p.value ? `${p.bg} ${p.border} ${p.color}` : "border-border/30 text-muted-foreground hover:border-border"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                  <div className="flex flex-wrap gap-1">
                    {STATUSES.map(s => (
                      <button key={s.value} onClick={() => onUpdate(task.id, { status: s.value, done: s.value === "done" })}
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${(task.status || "todo") === s.value ? s.color : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Due date</label>
                  <input
                    type="date"
                    defaultValue={task.due_date || ""}
                    onChange={e => onUpdate(task.id, { due_date: e.target.value || null })}
                    className="text-xs bg-background/60 border border-border/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30 w-full"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes</label>
                  <input
                    defaultValue={task.content || ""}
                    onBlur={e => onUpdate(task.id, { content: e.target.value })}
                    placeholder="Add notes..."
                    className="text-xs bg-background/60 border border-border/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30 w-full placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

SortableTaskRow.displayName = "SortableTaskRow";

/* ── Column ── */
const TaskColumn = ({
  title, accent, tasks, empty, manualOrder, onDragEnd,
  editingId, editValue, expandedId, setEditingId, setEditValue, setExpandedId,
  onToggle, onRemove, onUpdate, footer,
}: any) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = tasks.map((t: any) => t.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    onDragEnd(arrayMove(ids, oldIdx, newIdx));
  };

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: accent }} />
        <span className="font-semibold text-sm text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-secondary/60 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>

      <div className="flux-card flex-1 p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">{empty}</p>
              ) : (
                tasks.map((task: any) => (
                  <SortableTaskRow
                    key={task.id} task={task}
                    editingId={editingId} editValue={editValue}
                    expandedId={expandedId}
                    setEditingId={setEditingId} setEditValue={setEditValue}
                    setExpandedId={setExpandedId}
                    onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate}
                  />
                ))
              )}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
        {footer}
      </div>
    </div>
  );
};

/* ── Main ── */
const AITaskManager = () => {
  const { tasks, updateTask, createTask, removeTask } = useFlux();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prioritizing, setPrioritizing] = useState(false);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (search.trim()) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    return list;
  }, [tasks, search, filterPriority]);

  const todayTasks = useMemo(() => {
    const base = filteredTasks.filter(t => !t.done && (t.scheduled_date === today || t.due_date === today));
    if (manualOrder) return [...base].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id));
    const pMap: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...base].sort((a, b) => (pMap[a.priority ?? "medium"] ?? 2) - (pMap[b.priority ?? "medium"] ?? 2));
  }, [filteredTasks, today, manualOrder]);

  const upcomingTasks = useMemo(() =>
    filteredTasks.filter(t => !t.done && t.scheduled_date !== today && t.due_date !== today && t.type === "task"),
    [filteredTasks, today]);

  const inProgressTasks = useMemo(() =>
    filteredTasks.filter(t => !t.done && (t.status === "in_progress" || t.status === "blocked")),
    [filteredTasks]);

  const doneTasks = useMemo(() => filteredTasks.filter(t => t.done).slice(0, 10), [filteredTasks]);

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), scheduled_date: today, priority: "medium", status: "todo" });
    setNewTitle("");
  }, [newTitle, today, createTask]);

  const handleToggle = useCallback(async (id: string, done: boolean) => {
    await updateTask(id, { done: !done, status: !done ? "done" : "todo" });
  }, [updateTask]);

  const handleAIPrioritize = async () => {
    if (todayTasks.length < 2) { toast.info("Add more tasks to prioritize"); return; }
    setPrioritizing(true);
    try {
      const taskList = todayTasks.map((t, i) => `${i + 1}. [${t.id}] ${t.title} (priority: ${t.priority || "medium"})`).join("\n");
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "chat",
          messages: [{ role: "user", content: `Re-order these tasks by importance and urgency for today. Return ONLY a JSON array of task IDs in optimal order:\n${taskList}` }],
        },
      });
      if (error) throw error;
      const raw = typeof data === "string" ? data : JSON.stringify(data);
      const match = raw.match(/\[[\s\S]*?\]/);
      if (match) { setManualOrder(JSON.parse(match[0])); toast.success("Tasks AI-prioritized ✨"); }
    } catch { toast.error("Couldn't prioritize right now"); }
    finally { setPrioritizing(false); }
  };

  const sharedProps = { editingId, editValue, expandedId, setEditingId, setEditValue, setExpandedId, onToggle: handleToggle, onRemove: removeTask, onUpdate: updateTask };

  const completionPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display">Task Manager</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, MMMM d")} · {tasks.filter(t => !t.done).length} remaining
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-1.5 text-sm rounded-xl bg-secondary/50 border border-border/30 outline-none focus:ring-1 focus:ring-primary/30 w-44"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <select
            value={filterPriority || ""}
            onChange={e => setFilterPriority(e.target.value || null)}
            className="text-sm rounded-xl bg-secondary/50 border border-border/30 px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {/* AI Prioritize */}
          <button
            onClick={handleAIPrioritize} disabled={prioritizing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium disabled:opacity-50"
          >
            {prioritizing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            AI Prioritize
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flux-card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Overall progress</span>
          <span className="text-muted-foreground">{tasks.filter(t => t.done).length} / {tasks.length} tasks</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex gap-4 mt-3">
          {PRIORITIES.map(p => {
            const count = tasks.filter(t => !t.done && t.priority === p.value).length;
            if (count === 0) return null;
            return (
              <button key={p.value} onClick={() => setFilterPriority(filterPriority === p.value ? null : p.value)}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${filterPriority && filterPriority !== p.value ? "opacity-30" : ""}`}>
                <div className={`w-2 h-2 rounded-full ${p.dot}`} />
                <span className={p.color}>{count} {p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add task */}
      <div className="flex gap-2">
        <input
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Add a task for today... (Press Enter)"
          className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
        />
        <button onClick={handleAdd} disabled={!newTitle.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:bg-primary/90 text-sm font-medium">
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Board columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <TaskColumn
          title="Today"
          accent="hsl(var(--primary))"
          tasks={todayTasks}
          empty="No tasks for today — you're crushing it 🎯"
          onDragEnd={(newOrder: string[]) => setManualOrder(newOrder)}
          {...sharedProps}
          footer={
            manualOrder ? (
              <button onClick={() => setManualOrder(null)} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1.5 transition-colors mt-1">
                Reset manual order
              </button>
            ) : null
          }
        />
        <TaskColumn
          title="In Progress / Blocked"
          accent="hsl(217 90% 62%)"
          tasks={inProgressTasks}
          empty="Nothing in progress right now"
          onDragEnd={() => {}}
          {...sharedProps}
        />
        <TaskColumn
          title="Upcoming"
          accent="hsl(240 2% 45%)"
          tasks={upcomingTasks.slice(0, 20)}
          empty="No upcoming tasks"
          onDragEnd={() => {}}
          {...sharedProps}
          footer={
            upcomingTasks.length > 0 ? (
              <button
                onClick={() => {
                  const first = upcomingTasks[0];
                  if (first) updateTask(first.id, { scheduled_date: today });
                }}
                className="w-full text-[11px] text-muted-foreground hover:text-primary py-1.5 transition-colors mt-1 flex items-center justify-center gap-1"
              >
                <ArrowUpRight size={11} /> Move top task to today
              </button>
            ) : null
          }
        />
      </div>

      {/* Done */}
      {doneTasks.length > 0 && (
        <div className="flux-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="font-semibold text-sm">Completed</span>
            <span className="text-xs text-muted-foreground">({doneTasks.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {doneTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg opacity-50">
                <div className="w-4 h-4 rounded-full bg-green-500/30 border border-green-500/40 flex items-center justify-center shrink-0">
                  <Check size={9} className="text-green-400" strokeWidth={3} />
                </div>
                <p className="text-xs line-through text-muted-foreground/60 truncate">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITaskManager;
