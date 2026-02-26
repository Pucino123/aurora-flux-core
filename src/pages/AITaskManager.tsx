import React, { useState, useMemo, useCallback, useRef } from "react";
import { useFlux } from "@/context/FluxContext";
import { format, isToday, isTomorrow, isPast, parseISO, addDays } from "date-fns";
import {
  Check, Plus, Trash2, ArrowUpRight, Sparkles, Loader2,
  GripVertical, Calendar, Flag, ChevronDown, Circle,
  MoreHorizontal, AlignLeft, Tag, User, Clock, Filter,
  SortAsc, Search, X, CheckCircle2, AlertCircle, Minus, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, closestCorners, PointerSensor, useSensor,
  useSensors, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ── Priority config ── */
const PRIORITIES = [
  { value: "critical", label: "Critical", color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/25",    dot: "bg-red-400",    icon: AlertCircle },
  { value: "high",     label: "High",     color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", dot: "bg-orange-400", icon: ArrowUpRight },
  { value: "medium",   label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", dot: "bg-yellow-400", icon: Minus },
  { value: "low",      label: "Low",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/25",  dot: "bg-green-400",  icon: Circle },
];
const getPriority = (p: string | null) => PRIORITIES.find(x => x.value === p) || PRIORITIES[2];

/* ── Column definitions ── */
const COLUMNS = [
  { id: "today",       title: "Today",               accent: "hsl(var(--primary))",  emptyMsg: "No tasks for today — you're crushing it 🎯" },
  { id: "in_progress", title: "In Progress",          accent: "hsl(217 90% 62%)",    emptyMsg: "Nothing in progress right now" },
  { id: "upcoming",    title: "Upcoming",             accent: "hsl(240 2% 45%)",     emptyMsg: "No upcoming tasks scheduled" },
] as const;
type ColumnId = typeof COLUMNS[number]["id"];

/* ── Status ── */
const STATUSES = [
  { value: "todo",        label: "To Do",      color: "bg-muted text-muted-foreground" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500/15 text-blue-400" },
  { value: "done",        label: "Done",        color: "bg-green-500/15 text-green-400" },
  { value: "blocked",     label: "Blocked",     color: "bg-red-500/15 text-red-400" },
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

function getTaskColumn(task: any, today: string): ColumnId {
  if (task.done) return "today";
  if (task.status === "in_progress" || task.status === "blocked") return "in_progress";
  if (task.scheduled_date === today || task.due_date === today) return "today";
  return "upcoming";
}

/* ── Task Row ── */
const SortableTaskRow = React.memo(({
  task, editingId, editValue, setEditingId, setEditValue,
  expandedId, setExpandedId, onToggle, onRemove, onUpdate, onUndone,
}: {
  task: any; editingId: string | null; editValue: string;
  expandedId: string | null;
  setEditingId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  setExpandedId: (id: string | null) => void;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  onUndone?: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  const isEditing = editingId === task.id;
  const isExpanded = expandedId === task.id;
  const prio = getPriority(task.priority);
  const status = getStatus(task.status || "todo");
  const due = formatDue(task.due_date);

  return (
    <div ref={setNodeRef} style={style as any} className="touch-none">
      <div className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors duration-100 border border-transparent hover:border-border/40 hover:bg-secondary/30 ${task.done ? "opacity-50" : ""}`}>
        {/* Drag handle */}
        <div {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground/25 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none">
          <GripVertical size={13} />
        </div>

        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id, task.done)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
            task.done ? "bg-primary border-primary" : "border-border hover:border-primary/70 hover:scale-105"
          }`}
        >
          {task.done && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2">
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
                onDoubleClick={() => { setEditingId(task.id); setEditValue(task.title); }}
                className={`text-sm cursor-default ${task.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}
              >
                {task.title}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${prio.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
              {prio.label}
            </span>
            {due && (
              <span className={`inline-flex items-center gap-1 text-[10px] ${due.urgent ? "text-red-400" : "text-muted-foreground"}`}>
                <Calendar size={10} /> {due.label}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          {task.done && onUndone && (
            <button onClick={() => onUndone(task.id)} title="Undo complete"
              className="p-1 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={11} />
            </button>
          )}
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
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ml-9 mr-3 mb-2 px-3 py-3 rounded-xl bg-secondary/20 border border-border/30 grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Due date</label>
                <input
                  type="date"
                  defaultValue={task.due_date || ""}
                  onChange={e => onUpdate(task.id, { due_date: e.target.value || null })}
                  className="text-xs bg-background/60 border border-border/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30 w-full"
                />
              </div>
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
    </div>
  );
});
SortableTaskRow.displayName = "SortableTaskRow";

/* ── Column drop zone ── */
const DroppableColumn = ({
  col, tasks, isOver, editingId, editValue, expandedId,
  setEditingId, setEditValue, setExpandedId,
  onToggle, onRemove, onUpdate, onUndone, footer,
}: any) => {
  return (
    <div className={`flex flex-col min-w-0 flex-1 transition-all duration-150 ${isOver ? "scale-[1.01]" : ""}`}>
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: col.accent }} />
        <span className="font-semibold text-sm text-foreground">{col.title}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-secondary/60 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>

      <div className={`flux-card flex-1 p-2 min-h-[120px] transition-all duration-150 ${isOver ? "ring-2 ring-primary/30 bg-primary/[0.03]" : ""}`}>
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">{col.emptyMsg}</p>
          ) : (
            tasks.map((task: any) => (
              <SortableTaskRow
                key={task.id} task={task}
                editingId={editingId} editValue={editValue}
                expandedId={expandedId}
                setEditingId={setEditingId} setEditValue={setEditValue}
                setExpandedId={setExpandedId}
                onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} onUndone={onUndone}
              />
            ))
          )}
        </SortableContext>
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
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);
  // columnOrder[colId] = ordered list of task ids in that column
  const [columnOrder, setColumnOrder] = useState<Record<ColumnId, string[]>>({ today: [], in_progress: [], upcoming: [] });
  const initialized = useRef(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => !t.done);
    if (search.trim()) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    return list;
  }, [tasks, search, filterPriority]);

  const doneTasks = useMemo(() => tasks.filter(t => t.done).slice(0, 10), [tasks]);

  // Build column task maps from filteredTasks + columnOrder for stable ordering
  const { todayTasks, inProgressTasks, upcomingTasks } = useMemo(() => {
    const byCol: Record<ColumnId, any[]> = { today: [], in_progress: [], upcoming: [] };
    const taskMap = new Map(filteredTasks.map(t => [t.id, t]));

    filteredTasks.forEach(t => {
      const col = getTaskColumn(t, today);
      byCol[col].push(t);
    });

    // Sort each column by columnOrder if available, else by sort_order
    const sortCol = (colId: ColumnId) => {
      const order = columnOrder[colId];
      if (!order.length) return byCol[colId].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const ordered: any[] = [];
      order.forEach(id => { const t = taskMap.get(id); if (t) ordered.push(t); });
      byCol[colId].forEach(t => { if (!order.includes(t.id)) ordered.push(t); });
      return ordered;
    };

    return {
      todayTasks: sortCol("today"),
      inProgressTasks: sortCol("in_progress"),
      upcomingTasks: sortCol("upcoming"),
    };
  }, [filteredTasks, columnOrder, today]);

  // Initialise column order from tasks on first load
  React.useEffect(() => {
    if (!initialized.current && tasks.length > 0) {
      initialized.current = true;
      const byCol: Record<ColumnId, string[]> = { today: [], in_progress: [], upcoming: [] };
      tasks.filter(t => !t.done).forEach(t => {
        const col = getTaskColumn(t, today);
        byCol[col].push(t.id);
      });
      setColumnOrder(byCol);
    }
  }, [tasks, today]);

  const getColumnForTask = useCallback((taskId: string): ColumnId | null => {
    for (const col of COLUMNS) {
      if (columnOrder[col.id].includes(taskId)) return col.id;
    }
    // Fallback: derive from task data
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    return getTaskColumn(task, today);
  }, [columnOrder, tasks, today]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }
    // Check if hovering over a column directly
    const colId = COLUMNS.find(c => c.id === over.id)?.id;
    if (colId) { setOverColumn(colId); return; }
    // Hovering over a task — find its column
    const task = tasks.find(t => t.id === over.id);
    if (task) setOverColumn(getTaskColumn(task, today) as ColumnId);
  }, [tasks, today]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const sourceCol = getColumnForTask(activeTaskId);
    let destCol: ColumnId | null = null;

    // Check if dropped on a column
    const colMatch = COLUMNS.find(c => c.id === overId);
    if (colMatch) {
      destCol = colMatch.id;
    } else {
      // Dropped on a task — find that task's column
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) destCol = getTaskColumn(overTask, today) as ColumnId;
    }

    if (!sourceCol || !destCol) return;

    if (sourceCol === destCol) {
      // Reorder within same column
      const colItems = [...(columnOrder[sourceCol] || [])];
      const oldIdx = colItems.indexOf(activeTaskId);
      const newIdx = colItems.indexOf(overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(colItems, oldIdx, newIdx);
      setColumnOrder(prev => ({ ...prev, [sourceCol]: reordered }));
    } else {
      // Move to different column — update task in DB
      const updates: Record<ColumnId, any> = {
        today: { scheduled_date: today, status: "todo", done: false },
        in_progress: { status: "in_progress", done: false, scheduled_date: null },
        upcoming: { status: "todo", done: false, scheduled_date: null },
      };
      await updateTask(activeTaskId, updates[destCol]);

      // Update column order state
      setColumnOrder(prev => {
        const src = prev[sourceCol].filter(id => id !== activeTaskId);
        const dstItems = [...prev[destCol]];
        const overIdx = dstItems.indexOf(overId);
        if (overIdx !== -1) {
          dstItems.splice(overIdx, 0, activeTaskId);
        } else {
          dstItems.push(activeTaskId);
        }
        return { ...prev, [sourceCol]: src, [destCol]: dstItems };
      });
    }
  }, [getColumnForTask, columnOrder, tasks, today, updateTask]);

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    const task = await createTask({ title: newTitle.trim(), scheduled_date: today, priority: "medium", status: "todo" });
    setNewTitle("");
    if (task) {
      setColumnOrder(prev => ({ ...prev, today: [task.id, ...prev.today] }));
    }
  }, [newTitle, today, createTask]);

  const handleToggle = useCallback(async (id: string, done: boolean) => {
    await updateTask(id, { done: !done, status: !done ? "done" : "todo" });
    if (!done) toast.success("Task completed!", {
      action: { label: "Undo", onClick: () => updateTask(id, { done: false, status: "todo" }) },
      duration: 4000,
    });
  }, [updateTask]);

  const handleUndone = useCallback(async (id: string) => {
    await updateTask(id, { done: false, status: "todo" });
    toast.success("Task restored");
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
      if (match) {
        const ordered: string[] = JSON.parse(match[0]);
        setColumnOrder(prev => ({ ...prev, today: ordered }));
        toast.success("Tasks AI-prioritized ✨");
      }
    } catch { toast.error("Couldn't prioritize right now"); }
    finally { setPrioritizing(false); }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const completionPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

  const sharedProps = {
    editingId, editValue, expandedId, setEditingId, setEditValue, setExpandedId,
    onToggle: handleToggle, onRemove: removeTask, onUpdate: updateTask, onUndone: handleUndone,
  };

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
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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

          <select
            value={filterPriority || ""}
            onChange={e => setFilterPriority(e.target.value || null)}
            className="text-sm rounded-xl bg-secondary/50 border border-border/30 px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

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
            transition={{ duration: 0.5, ease: "easeOut" }}
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

      {/* Board columns with single DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {COLUMNS.map(col => {
            const colTasks = col.id === "today" ? todayTasks : col.id === "in_progress" ? inProgressTasks : upcomingTasks;
            return (
              <DroppableColumn
                key={col.id}
                col={col}
                tasks={colTasks}
                isOver={overColumn === col.id}
                {...sharedProps}
                footer={
                  col.id === "upcoming" && upcomingTasks.length > 0 ? (
                    <button
                      onClick={() => {
                        const first = upcomingTasks[0];
                        if (first) {
                          updateTask(first.id, { scheduled_date: today });
                          setColumnOrder(prev => ({
                            ...prev,
                            today: [first.id, ...prev.today],
                            upcoming: prev.upcoming.filter(id => id !== first.id),
                          }));
                        }
                      }}
                      className="w-full text-[11px] text-muted-foreground hover:text-primary py-1.5 transition-colors mt-1 flex items-center justify-center gap-1"
                    >
                      <ArrowUpRight size={11} /> Move top task to today
                    </button>
                  ) : null
                }
              />
            );
          })}
        </div>

        {/* Drag overlay for ghost card */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeTask ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-primary/30 shadow-2xl text-sm font-medium opacity-95 w-64">
              <GripVertical size={13} className="text-muted-foreground" />
              <Check size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
              <div key={task.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg opacity-50 hover:opacity-80 transition-opacity">
                <div className="w-4 h-4 rounded-full bg-green-500/30 border border-green-500/40 flex items-center justify-center shrink-0">
                  <Check size={9} className="text-green-400" strokeWidth={3} />
                </div>
                <p className="text-xs line-through text-muted-foreground/60 truncate flex-1">{task.title}</p>
                <button onClick={() => handleUndone(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity text-muted-foreground hover:text-foreground">
                  <RotateCcw size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITaskManager;
