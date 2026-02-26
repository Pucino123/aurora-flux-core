import React, { useState, useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { format } from "date-fns";
import { Check, Plus, Trash2, ArrowUpRight, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-green-400 bg-green-500/10 border-green-500/20",
};

const AITaskManager = () => {
  const { tasks, updateTask, createTask, removeTask } = useFlux();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [prioritizing, setPrioritizing] = useState(false);
  const [aiOrder, setAiOrder] = useState<string[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // Group tasks: today + upcoming
  const todayTasks = useMemo(() => tasks.filter(t => !t.done && (t.scheduled_date === today || t.due_date === today)), [tasks, today]);
  const upcomingTasks = useMemo(() => tasks.filter(t => !t.done && t.scheduled_date !== today && t.due_date !== today && t.type === "task"), [tasks, today]);
  const doneTasks = useMemo(() => tasks.filter(t => t.done).slice(0, 8), [tasks]);

  const displayOrder = aiOrder
    ? [...todayTasks].sort((a, b) => (aiOrder.indexOf(a.id) - aiOrder.indexOf(b.id)))
    : [...todayTasks].sort((a, b) => {
        const pMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (pMap[a.priority || "medium"] ?? 1) - (pMap[b.priority || "medium"] ?? 1);
      });

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
          messages: [
            {
              role: "user",
              content: `Re-order these tasks by importance and urgency. Return ONLY a JSON array of task IDs in the optimal order, nothing else:\n${taskList}`,
            },
          ],
        },
      });
      if (error) throw error;
      // Try to parse JSON from streamed response
      let raw = "";
      if (data && typeof data === "object" && data.body) {
        const reader = data.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value);
        }
      } else {
        raw = typeof data === "string" ? data : JSON.stringify(data);
      }
      const match = raw.match(/\[[\s\S]*?\]/);
      if (match) {
        const ids: string[] = JSON.parse(match[0]);
        setAiOrder(ids);
        toast.success("Tasks AI-prioritized! 🤖");
      }
    } catch {
      toast.error("Couldn't prioritize right now");
    } finally {
      setPrioritizing(false);
    }
  };

  const renderTask = (task: typeof tasks[0], onNavigate?: () => void) => {
    const isEditing = editingId === task.id;
    const isExpanded = expandedId === task.id;
    return (
      <motion.div
        key={task.id}
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="group"
      >
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors ${task.done ? "opacity-50" : ""}`}>
          <button
            onClick={() => handleToggle(task.id, task.done)}
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
                onBlur={() => { if (editValue.trim()) updateTask(task.id, { title: editValue.trim() }); setEditingId(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { if (editValue.trim()) updateTask(task.id, { title: editValue.trim() }); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
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
            <button onClick={() => removeTask(task.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-10 pb-2">
              <select
                value={task.priority || "medium"}
                onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                className="text-xs bg-secondary/40 border border-border/30 rounded-lg px-2 py-1 outline-none mr-2"
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
              <input
                type="date"
                defaultValue={task.due_date || ""}
                onChange={(e) => updateTask(task.id, { due_date: e.target.value || null })}
                className="text-xs bg-secondary/40 border border-border/30 rounded-lg px-2 py-1 outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display">Task Manager</h2>
          <p className="text-sm text-muted-foreground">AI-prioritized · {format(new Date(), "EEEE, MMMM d")}</p>
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
              {aiOrder && (
                <button onClick={() => setAiOrder(null)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Clear AI order
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

            <AnimatePresence>
              {displayOrder.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tasks today — add one above 🎯</p>
              ) : (
                <div className="space-y-0.5">
                  {displayOrder.map(t => renderTask(t))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Done */}
          {doneTasks.length > 0 && (
            <div className="flux-card p-4">
              <h3 className="font-semibold font-display text-sm flex items-center gap-1.5 mb-3 text-muted-foreground">
                <Check size={14} className="text-primary" /> Completed ({doneTasks.length})
              </h3>
              <div className="space-y-0.5 opacity-60">
                {doneTasks.map(t => renderTask(t))}
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
