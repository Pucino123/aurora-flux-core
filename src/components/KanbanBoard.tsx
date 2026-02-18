import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { useFlux } from "@/context/FluxContext";

const COLUMNS = [
  { key: "todo", label: "To Do", color: "hsl(var(--aurora-blue))" },
  { key: "in-progress", label: "In Progress", color: "hsl(var(--aurora-violet))" },
  { key: "done", label: "Done", color: "hsl(var(--aurora-pink))" },
] as const;

interface KanbanBoardProps {
  folderId?: string;
  tasks?: any[];
}

const KanbanBoard = ({ folderId, tasks: propTasks }: KanbanBoardProps) => {
  const { tasks: allTasks, createTask, updateTask, removeTask } = useFlux();
  const tasks = propTasks || allTasks;
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const tasksByStatus = {
    "todo": tasks.filter((t) => t.status === "todo" && !t.done),
    "in-progress": tasks.filter((t) => t.status === "in-progress" && !t.done),
    "done": tasks.filter((t) => t.done || t.status === "done"),
  };

  const handleAdd = async (status: string) => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), status, type: "task" });
    setNewTitle("");
    setNewTaskCol(null);
  };

  const moveTask = (taskId: string, newStatus: string) => {
    const isDone = newStatus === "done";
    updateTask(taskId, { status: newStatus, done: isDone });
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-x-auto">
      <h2 className="text-lg font-bold font-display mb-4">Kanban Board</h2>
      <div className="flex gap-4 min-w-[720px]">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex-1 min-w-[220px]">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {tasksByStatus[col.key]?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[100px] p-2 rounded-xl bg-secondary/20 border border-border/30">
              <AnimatePresence>
                {tasksByStatus[col.key]?.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm group"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </p>
                        {task.priority && (
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            task.priority === "high" ? "bg-destructive/10 text-destructive" :
                            task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {col.key !== "done" && (
                          <button
                            onClick={() => moveTask(task.id, col.key === "todo" ? "in-progress" : "done")}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground text-xs"
                            title="Move forward"
                          >
                            →
                          </button>
                        )}
                        <button
                          onClick={() => removeTask(task.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add task */}
              {newTaskCol === col.key ? (
                <div className="p-2">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd(col.key);
                      if (e.key === "Escape") { setNewTaskCol(null); setNewTitle(""); }
                    }}
                    onBlur={() => { if (!newTitle.trim()) { setNewTaskCol(null); setNewTitle(""); } }}
                    placeholder="Task title..."
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setNewTaskCol(col.key)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary/40 transition-colors"
                >
                  <Plus size={12} /> Add task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
