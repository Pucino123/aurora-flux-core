import React, { useState, useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { format } from "date-fns";
import { Check, Plus, Trash2, ArrowUpRight, Sparkles, Loader2, ChevronDown, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-green-400 bg-green-500/10 border-green-500/20",
};

/* ── Sortable Task Row ── */
function SortableTaskRow({
  task,
  editingId,
  editValue,
  expandedId,
  setEditingId,
  setEditValue,
  setExpandedId,
  onToggle,
  onRemove,
  onUpdate,
}: {
  task: any;
  editingId: string | null;
  editValue: string;
  expandedId: string | null;
  setEditingId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  setExpandedId: (id: string | null) => void;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  const isEditing = editingId === task.id;
  const isExpanded = expandedId === task.id;

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="group"
      >
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors ${task.done ? "opacity-50" : ""}`}>
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab p-0.5 text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical size={14} />
          </div>

          <button
            onClick={() => onToggle(task.id, task.done)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              task.done ? "bg-primary border-primary" : "border-border hover:border-primary/60"
            }`}
          >
            {task.done && <Check size={10} className="text-primary-foreground" />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim()) onUpdate(task.id, { title: editValue.trim() }); setEditingId(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { if (editValue.trim()) onUpdate(task.id, { title: editValue.trim() }); setEditingId(null); }
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-full bg-transparent border-b border-primary/40 outline-none text-sm py-0.5"
                autoFocus
              />
            ) : (
              <p
                onClick={() => { setEditingId(task.id); setEditValue(task.title); }}
                className={`text-sm cursor-text truncate ${task.done ? "line-through text-muted-foreground/50" : ""}`}
              >
                {task.title}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {task.priority && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                {task.priority}
              </span>
            )}
            <button onClick={() => setExpandedId(isExpanded ? null : task.id)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
            <button onClick={() => onRemove(task.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-10 pb-2">
              <select
                value={task.priority || "medium"}
                onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
                className="text-xs bg-secondary/40 border border-border/30 rounded-lg px-2 py-1 outline-none mr-2"
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
              <input
                type="date"
                defaultValue={task.due_date || ""}
                onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
                className="text-xs bg-secondary/40 border border-border/30 rounded-lg px-2 py-1 outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Main View ── */
const AITaskManager = () => {
  const { tasks, updateTask, createTask, removeTask } = useFlux();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [prioritizing, setPrioritizing] = useState(false);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const todayTasks = useMemo(() => tasks.filter(t => !t.done && (t.scheduled_date === today || t.due_date === today)), [tasks, today]);
  const upcomingTasks = useMemo(() => tasks.filter(t => !t.done && t.scheduled_date !== today && t.due_date !== today && t.type === "task"), [tasks, today]);
  const doneTasks = useMemo(() => tasks.filter(t => t.done).slice(0, 8), [tasks]);

  // Apply manual order if set, otherwise sort by priority
  const displayOrder = useMemo(() => {
    const base = [...todayTasks];
    if (manualOrder) {
      return base.sort((a, b) => (manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id)));
    }
    const pMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return base.sort((a, b) => (pMap[a.priority || "medium"] ?? 1) - (pMap[b.priority || "medium"] ?? 1));
  }, [todayTasks, manualOrder]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = displayOrder.map(t => t.id);
    const oldIdx = oldOrder.indexOf(active.id as string);
    const newIdx = oldOrder.indexOf(over.id as string);
    setManualOrder(arrayMove(oldOrder, oldIdx, newIdx));
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), scheduled_date: today, priority: "medium" });
    setNewTitle("");
  };

  const handleToggle = async (id: string, done: boolean) => {
    await updateTask(id, { done: !done, status: !done ? "done" : "todo" });
  };

  const handleAIPrioritize = async () => {
    if (todayTasks.length < 2) { toast.info("Add more tasks to prioritize"); return; }
    setPrioritizing(true);
    try {
      const taskList = todayTasks.map((t, i) => `${i + 1}. [${t.id}] ${t.title} (priority: ${t.priority || "medium"})`).join("\n");
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "chat",
          messages: [{
            role: "user",
            content: `Re-order these tasks by importance and urgency. Return ONLY a JSON array of task IDs in the optimal order, nothing else:\n${taskList}`,
          }],
        },
      });
      if (error) throw error;
      let raw = typeof data === "string" ? data : JSON.stringify(data);
      const match = raw.match(/\[[\s\S]*?\]/);
      if (match) {
        const ids: string[] = JSON.parse(match[0]);
        setManualOrder(ids);
        toast.success("Tasks AI-prioritized! 🤖");
      }
    } catch {
      toast.error("Couldn't prioritize right now");
    } finally {
      setPrioritizing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display">Task Manager</h2>
          <p className="text-sm text-muted-foreground">AI-prioritized · drag to reorder · {format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <button
          onClick={handleAIPrioritize}
          disabled={prioritizing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium disabled:opacity-50"
        >
          {prioritizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          AI Prioritize
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Today */}
        <div className="flex-1">
          <div className="flux-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold font-display text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Today <span className="text-muted-foreground font-normal">({displayOrder.length})</span>
              </h3>
              {manualOrder && (
                <button onClick={() => setManualOrder(null)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Reset order
                </button>
              )}
            </div>

            {/* Add task */}
            <div className="flex gap-2 mb-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Add a task for today..."
                className="flex-1 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
              />
              <button onClick={handleAdd} disabled={!newTitle.trim()} className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-opacity">
                <Plus size={16} />
              </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayOrder.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence>
                  {displayOrder.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No tasks today — add one above 🎯</p>
                  ) : (
                    <div className="space-y-0.5">
                      {displayOrder.map(task => (
                        <SortableTaskRow
                          key={task.id}
                          task={task}
                          editingId={editingId}
                          editValue={editValue}
                          expandedId={expandedId}
                          setEditingId={setEditingId}
                          setEditValue={setEditValue}
                          setExpandedId={setExpandedId}
                          onToggle={handleToggle}
                          onRemove={removeTask}
                          onUpdate={updateTask}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          </div>

          {/* Done */}
          {doneTasks.length > 0 && (
            <div className="flux-card p-4">
              <h3 className="font-semibold font-display text-sm flex items-center gap-1.5 mb-3 text-muted-foreground">
                <Check size={14} className="text-primary" /> Completed ({doneTasks.length})
              </h3>
              <div className="space-y-0.5 opacity-60">
                {doneTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${task.done ? "opacity-60" : ""}`}>
                    <div className="w-5 h-5 rounded-full bg-primary border-primary border-2 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-primary-foreground" />
                    </div>
                    <p className="text-sm line-through text-muted-foreground/50 truncate flex-1">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="lg:w-[280px] shrink-0">
          <div className="flux-card p-4">
            <h3 className="font-semibold font-display text-sm flex items-center gap-1.5 mb-3">
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full" />
              Upcoming <span className="text-muted-foreground font-normal">({upcomingTasks.length})</span>
            </h3>
            <div className="space-y-0.5">
              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming tasks</p>
              ) : (
                upcomingTasks.slice(0, 20).map(t => (
                  <div key={t.id} className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-400" : t.priority === "medium" ? "bg-yellow-400" : "bg-green-400"}`} />
                    <p className="text-xs text-muted-foreground truncate flex-1">{t.title}</p>
                    <button
                      onClick={() => updateTask(t.id, { scheduled_date: today })}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-primary transition-all"
                      title="Move to today"
                    >
                      <ArrowUpRight size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITaskManager;
