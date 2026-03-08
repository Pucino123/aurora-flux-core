import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import SEO from "@/components/SEO";
import { useFlux } from "@/context/FluxContext";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import {
  Check, Plus, Trash2, ArrowUpRight, Sparkles, Loader2,
  GripVertical, Calendar, Circle,
  MoreHorizontal, Search, X, CheckCircle2, AlertCircle, Minus, RotateCcw, Pencil, UserCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTeamChat } from "@/hooks/useTeamChat";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

/* ── Priority config ── */
const PRIORITIES = [
  { value: "critical", label: "Critical", color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/25",    dot: "bg-red-400",    icon: AlertCircle },
  { value: "high",     label: "High",     color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", dot: "bg-orange-400", icon: ArrowUpRight },
  { value: "medium",   label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", dot: "bg-yellow-400", icon: Minus },
  { value: "low",      label: "Low",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/25",  dot: "bg-green-400",  icon: Circle },
];
const getPriority = (p: string | null) => PRIORITIES.find(x => x.value === p) || PRIORITIES[2];

/* ── Default columns ── */
const DEFAULT_COLUMNS = [
  { id: "today",       title: "Today",       accent: "hsl(var(--primary))",  emptyMsg: "No tasks for today 🎯" },
  { id: "in_progress", title: "In Progress", accent: "hsl(217 90% 62%)",    emptyMsg: "Nothing in progress" },
  { id: "upcoming",    title: "Upcoming",    accent: "hsl(240 2% 45%)",     emptyMsg: "No upcoming tasks" },
];

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

/* ── Task Row ── */
const SortableTaskRow = React.memo(({
  task, editingId, editValue, setEditingId, setEditValue,
  expandedId, setExpandedId, onToggle, onRemove, onUpdate, onUndone, teamMembers,
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
  teamMembers?: Array<{ user_id: string; display_name: string | null }>;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const isEditing = editingId === task.id;
  const isExpanded = expandedId === task.id;
  const prio = getPriority(task.priority);
  const status = getStatus(task.status || "todo");
  const due = formatDue(task.due_date);

  return (
    <div ref={setNodeRef} style={style as any}>
      <div className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors duration-100 border border-transparent hover:border-border/40 hover:bg-secondary/30 ${task.done ? "opacity-50" : ""}`}>
        <div {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none touch-none">
          <GripVertical size={13} />
        </div>

        <button
          onClick={() => onToggle(task.id, task.done)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
            task.done ? "bg-primary border-primary" : "border-border hover:border-primary/70 hover:scale-105"
          }`}
        >
          {task.done && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
        </button>

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
              <span className={`inline-flex items-center gap-1 text-[10px] ${due.urgent ? "text-destructive" : "text-muted-foreground"}`}>
                <Calendar size={10} /> {due.label}
              </span>
            )}
            {(task as any).assigned_to && teamMembers && (() => {
              const member = teamMembers.find(m => m.user_id === (task as any).assigned_to);
              if (!member) return null;
              const initial = (member.display_name || member.user_id)?.[0]?.toUpperCase() || "?";
              return (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={member.display_name || member.user_id}>
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">{initial}</span>
                  {member.display_name || member.user_id.slice(0, 6)}
                </span>
              );
            })()}
          </div>
        </div>

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

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ml-9 mr-3 mb-2 px-3 py-3 rounded-xl bg-secondary/20 border border-border/30 grid grid-cols-2 md:grid-cols-5 gap-3">
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
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Assign to</label>
                <select
                  value={(task as any).assigned_to || ""}
                  onChange={e => onUpdate(task.id, { assigned_to: e.target.value || null } as any)}
                  className="text-xs bg-background/60 border border-border/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30 w-full"
                >
                  <option value="">Unassigned</option>
                  {teamMembers?.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name || m.user_id.slice(0, 8)}</option>
                  ))}
                </select>
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

/* ── Droppable Column ── */
const DroppableColumn = ({
  col, tasks, editingId, editValue, expandedId, colTitles, onRenameCol, onDeleteCol, isCustom,
  setEditingId, setEditValue, setExpandedId,
  onToggle, onRemove, onUpdate, onUndone, onAddTask, isOver, teamMembers,
}: any) => {
  const { setNodeRef } = useDroppable({ id: col.id });
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingColTitle, setEditingColTitle] = useState(false);
  const [colTitleValue, setColTitleValue] = useState(colTitles[col.id] || col.title);

  const handleAddTask = () => {
    if (!newTitle.trim()) { setAddingTask(false); return; }
    onAddTask(col.id, newTitle.trim());
    setNewTitle("");
    setAddingTask(false);
  };

  const commitColRename = () => {
    if (colTitleValue.trim()) onRenameCol(col.id, colTitleValue.trim());
    setEditingColTitle(false);
  };

  const displayTitle = colTitles[col.id] || col.title;

  return (
    <div className={`flex flex-col min-w-0 transition-all duration-150`}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1 group/colheader">
        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: col.accent }} />
        {editingColTitle ? (
          <input
            value={colTitleValue}
            onChange={e => setColTitleValue(e.target.value)}
            onBlur={commitColRename}
            onKeyDown={e => { if (e.key === "Enter") commitColRename(); if (e.key === "Escape") setEditingColTitle(false); }}
            className="flex-1 bg-transparent border-b-2 border-primary/50 outline-none font-semibold text-sm py-0.5"
            autoFocus
          />
        ) : (
          <span
            className="font-semibold text-sm text-foreground cursor-pointer hover:text-primary transition-colors flex-1"
            onDoubleClick={() => { setEditingColTitle(true); setColTitleValue(displayTitle); }}
            title="Double-click to rename"
          >
            {displayTitle}
          </span>
        )}
        <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full shrink-0">{tasks.length}</span>
        <button
          onClick={() => { setEditingColTitle(true); setColTitleValue(displayTitle); }}
          className="opacity-0 group-hover/colheader:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary"
          title="Rename column"
        >
          <Pencil size={10} />
        </button>
        {isCustom && (
          <button
            onClick={() => onDeleteCol(col.id)}
            className="opacity-0 group-hover/colheader:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-destructive"
            title="Delete column"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flux-card flex-1 p-2 min-h-[120px] transition-all duration-150 ${isOver ? "ring-2 ring-primary/40 bg-primary/[0.04] scale-[1.01]" : ""}`}
      >
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className={`flex items-center justify-center py-8 px-4 rounded-xl border-2 border-dashed transition-colors ${isOver ? "border-primary/40 bg-primary/5" : "border-border/20"}`}>
              <p className="text-xs text-muted-foreground text-center">{col.emptyMsg}</p>
            </div>
          ) : (
            tasks.map((task: any) => (
              <SortableTaskRow
                key={task.id} task={task}
                editingId={editingId} editValue={editValue}
                expandedId={expandedId}
                setEditingId={setEditingId} setEditValue={setEditValue}
                setExpandedId={setExpandedId}
                onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} onUndone={onUndone}
                teamMembers={teamMembers}
              />
            ))
          )}
        </SortableContext>

        {/* Add task inline */}
        {addingTask ? (
          <div className="mt-2 px-1">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddTask(); if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); } }}
              onBlur={handleAddTask}
              placeholder="Task title..."
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-background border border-primary/30 text-xs outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 mt-1 rounded-lg text-xs text-muted-foreground hover:bg-secondary/40 transition-colors"
          >
            <Plus size={11} /> Add task
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Main ── */
const AITaskManager = () => {
  const { tasks, updateTask, createTask, removeTask } = useFlux();
  const { members } = useTeamChat();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prioritizing, setPrioritizing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  // Dynamic columns support
  const [customColumns, setCustomColumns] = useState<Array<{ id: string; title: string; accent: string; emptyMsg: string }>>([]);
  const [colTitles, setColTitles] = useState<Record<string, string>>({});
  // taskColumn: maps task id → column id (source of truth for placement)
  const [taskColumnMap, setTaskColumnMap] = useState<Record<string, string>>({});
  // columnOrder: maps column id → ordered list of task ids
  const [columnOrder, setColumnOrder] = useState<Record<string, string[]>>({});
  const initialized = useRef(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const allColumns = useMemo(() => [...DEFAULT_COLUMNS, ...customColumns], [customColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => !t.done);
    if (search.trim()) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    return list;
  }, [tasks, search, filterPriority]);

  const doneTasks = useMemo(() => tasks.filter(t => t.done).slice(0, 10), [tasks]);

  // Derive column for a task based on its DB state
  const deriveColumn = useCallback((task: any): string => {
    if (task.status === "in_progress" || task.status === "blocked") return "in_progress";
    if (task.scheduled_date === today || task.due_date === today) return "today";
    return "upcoming";
  }, [today]);

  // Initialize column order from tasks
  React.useEffect(() => {
    if (!initialized.current && tasks.length > 0) {
      initialized.current = true;
      const colMap: Record<string, string> = {};
      const order: Record<string, string[]> = { today: [], in_progress: [], upcoming: [] };
      tasks.filter(t => !t.done).forEach(t => {
        const col = deriveColumn(t);
        colMap[t.id] = col;
        if (order[col]) order[col].push(t.id);
      });
      setTaskColumnMap(colMap);
      setColumnOrder(order);
    }
  }, [tasks, deriveColumn]);

  // Keep new tasks added elsewhere in sync
  React.useEffect(() => {
    if (!initialized.current) return;
    setTaskColumnMap(prev => {
      const next = { ...prev };
      tasks.filter(t => !t.done && !next[t.id]).forEach(t => {
        const col = deriveColumn(t);
        next[t.id] = col;
        setColumnOrder(o => ({ ...o, [col]: [t.id, ...(o[col] || [])] }));
      });
      return next;
    });
  }, [tasks, deriveColumn]);

  const getTasksForColumn = useCallback((colId: string) => {
    const order = columnOrder[colId] || [];
    const taskMap = new Map(filteredTasks.map(t => [t.id, t]));
    const result: any[] = [];
    order.forEach(id => { const t = taskMap.get(id); if (t) result.push(t); });
    // append tasks not yet in order
    filteredTasks.forEach(t => {
      const assignedCol = taskColumnMap[t.id] || deriveColumn(t);
      if (assignedCol === colId && !order.includes(t.id)) result.push(t);
    });
    return result;
  }, [columnOrder, filteredTasks, taskColumnMap, deriveColumn]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) { setOverColumn(null); return; }
    // Determine target column
    const overColId = allColumns.find(c => c.id === over.id)?.id;
    if (overColId) { setOverColumn(overColId); return; }
    // over a task: find which column it belongs to
    const overTaskCol = taskColumnMap[over.id as string] || deriveColumn(tasks.find(t => t.id === over.id));
    if (overTaskCol) setOverColumn(overTaskCol);
  }, [allColumns, taskColumnMap, tasks, deriveColumn]);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverColumn(null);
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const sourceCol = taskColumnMap[activeTaskId] || deriveColumn(tasks.find(t => t.id === activeTaskId));
    let destCol = allColumns.find(c => c.id === overId)?.id;
    if (!destCol) {
      destCol = taskColumnMap[overId] || deriveColumn(tasks.find(t => t.id === overId));
    }
    if (!sourceCol || !destCol) return;

    if (sourceCol === destCol) {
      // Reorder within column
      setColumnOrder(prev => {
        const items = [...(prev[sourceCol] || [])];
        const oldIdx = items.indexOf(activeTaskId);
        const newIdx = items.indexOf(overId);
        if (oldIdx === -1) return prev;
        const ni = newIdx === -1 ? items.length - 1 : newIdx;
        return { ...prev, [sourceCol]: arrayMove(items, oldIdx, ni) };
      });
    } else {
      // Move to different column
      const statusMap: Record<string, any> = {
        today:       { scheduled_date: today, status: "todo", done: false },
        in_progress: { status: "in_progress", done: false, scheduled_date: null },
        upcoming:    { status: "todo", done: false, scheduled_date: null },
      };
      const updates = statusMap[destCol] || { status: "todo", done: false };
      await updateTask(activeTaskId, updates);

      setTaskColumnMap(prev => ({ ...prev, [activeTaskId]: destCol! }));
      setColumnOrder(prev => {
        const src = (prev[sourceCol] || []).filter(id => id !== activeTaskId);
        const dst = [...(prev[destCol!] || [])];
        const overIdx = dst.indexOf(overId);
        if (overIdx !== -1) dst.splice(overIdx, 0, activeTaskId);
        else dst.push(activeTaskId);
        return { ...prev, [sourceCol]: src, [destCol!]: dst };
      });
    }
  }, [taskColumnMap, allColumns, tasks, today, updateTask, deriveColumn]);

  const handleAddTaskToColumn = useCallback(async (colId: string, title: string) => {
    const statusMap: Record<string, any> = {
      today:       { scheduled_date: today, status: "todo", priority: "medium" },
      in_progress: { status: "in_progress", priority: "medium" },
    };
    const extra = statusMap[colId] || { status: "todo", priority: "medium" };
    const task = await createTask({ title, ...extra });
    if (task) {
      setTaskColumnMap(prev => ({ ...prev, [task.id]: colId }));
      setColumnOrder(prev => ({ ...prev, [colId]: [task.id, ...(prev[colId] || [])] }));
    }
  }, [today, createTask]);

  const handleAddToday = useCallback(async () => {
    if (!newTitle.trim()) return;
    await handleAddTaskToColumn("today", newTitle.trim());
    setNewTitle("");
  }, [newTitle, handleAddTaskToColumn]);

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
    const todayTasks = getTasksForColumn("today");
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

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const id = `custom_${Date.now()}`;
    setCustomColumns(prev => [...prev, {
      id, title: newColTitle.trim(),
      accent: "hsl(var(--muted-foreground))",
      emptyMsg: "No tasks here yet",
    }]);
    setColumnOrder(prev => ({ ...prev, [id]: [] }));
    setNewColTitle("");
    setAddingColumn(false);
  };

  const handleRenameCol = (colId: string, title: string) => {
    setColTitles(prev => ({ ...prev, [colId]: title }));
    if (customColumns.find(c => c.id === colId)) {
      setCustomColumns(prev => prev.map(c => c.id === colId ? { ...c, title } : c));
    }
  };

  const handleDeleteCol = (colId: string) => {
    setCustomColumns(prev => prev.filter(c => c.id !== colId));
    // Move tasks back to upcoming
    const colTaskIds = columnOrder[colId] || [];
    colTaskIds.forEach(id => {
      setTaskColumnMap(prev => ({ ...prev, [id]: "upcoming" }));
    });
    setColumnOrder(prev => {
      const { [colId]: _, ...rest } = prev;
      return rest;
    });
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const completionPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

  const sharedProps = {
    editingId, editValue, expandedId, colTitles,
    setEditingId, setEditValue, setExpandedId,
    onToggle: handleToggle, onRemove: removeTask, onUpdate: updateTask, onUndone: handleUndone,
    onRenameCol: handleRenameCol, onDeleteCol: handleDeleteCol,
    onAddTask: handleAddTaskToColumn,
    teamMembers: members,
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      <SEO title="Tasks" description="AI-powered task and project management with Kanban boards, priorities and smart scheduling." url="/" keywords="task manager, kanban board, project management, to-do list, productivity" />
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

      {/* Global add task */}
      <div className="flex gap-2">
        <input
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddToday()}
          placeholder="Quick add task for today... (Press Enter)"
          className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
        />
        <button onClick={handleAddToday} disabled={!newTitle.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:bg-primary/90 text-sm font-medium">
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${allColumns.length}, minmax(0, 1fr))` }}>
          {allColumns.map(col => (
            <DroppableColumn
              key={col.id}
              col={col}
              tasks={getTasksForColumn(col.id)}
              isOver={overColumn === col.id}
              isCustom={!!customColumns.find(c => c.id === col.id)}
              {...sharedProps}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeTask ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-primary/30 shadow-2xl text-sm font-medium opacity-95 w-64 rotate-2">
              <GripVertical size={13} className="text-muted-foreground" />
              <span className="truncate">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Column button */}
      <div className="flex items-center gap-2">
        {addingColumn ? (
          <div className="flex gap-2 items-center">
            <input
              value={newColTitle}
              onChange={e => setNewColTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") { setAddingColumn(false); setNewColTitle(""); } }}
              placeholder="Column name..."
              autoFocus
              className="px-3 py-1.5 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:ring-1 focus:ring-primary/30 w-48"
            />
            <button onClick={handleAddColumn} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium">Add</button>
            <button onClick={() => { setAddingColumn(false); setNewColTitle(""); }} className="px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-xs font-medium border border-border/20 border-dashed"
          >
            <Plus size={12} /> Add Column
          </button>
        )}
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
