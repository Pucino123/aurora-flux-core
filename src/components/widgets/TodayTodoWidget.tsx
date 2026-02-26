import React, { useState } from "react";
import { useFlux } from "@/context/FluxContext";
import { format } from "date-fns";
import { Check, Plus, ArrowUpRight, ListTodo } from "lucide-react";
import { t } from "@/lib/i18n";

export const TodayTodoWidget = () => {
  const { tasks, updateTask, createTask, setActiveView } = useFlux();
  const [newTitle, setNewTitle] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");

  const todayTasks = tasks
    .filter(t => !t.done && (t.scheduled_date === today || t.due_date === today))
    .slice(0, 6);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), scheduled_date: today, priority: "medium" });
    setNewTitle("");
  };

  const handleToggle = (id: string, done: boolean) => {
    updateTask(id, { done: !done, status: !done ? "done" : "todo" });
  };

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ListTodo size={14} className="text-primary" />
          <span className="text-xs font-semibold font-display">Today's Tasks</span>
        </div>
        <button
          onClick={() => setActiveView("tasks")}
          className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Open full task manager"
        >
          <ArrowUpRight size={12} />
        </button>
      </div>

      {/* Add */}
      <div className="flex gap-1.5 mb-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add task..."
          className="flex-1 px-2 py-1 rounded-lg bg-secondary/40 border border-border/20 text-[11px] outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button onClick={handleAdd} disabled={!newTitle.trim()} className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-all">
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {todayTasks.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">No tasks today 🎯</span>
        ) : (
          todayTasks.map(task => (
            <button
              key={task.id}
              onClick={() => handleToggle(task.id, task.done)}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-secondary/40 transition-colors text-left group"
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                task.done ? "bg-primary border-primary" : "border-border group-hover:border-primary/60"
              }`}>
                {task.done && <Check size={8} className="text-primary-foreground" />}
              </div>
              <span className={`text-[11px] truncate flex-1 ${task.done ? "line-through text-muted-foreground/50" : ""}`}>{task.title}</span>
              {task.priority === "high" && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
