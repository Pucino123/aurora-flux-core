import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Sparkles, Loader2, CalendarOff, GripVertical } from "lucide-react";
import { DbTask } from "@/context/FluxContext";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

interface DraggableTaskCardProps {
  task: DbTask;
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 9999 : undefined,
  };

  const priorityColor =
    task.priority === "high" ? "#ef4444" :
    task.priority === "medium" ? "#f59e0b" : "#6b7280";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] cursor-grab active:cursor-grabbing transition-colors group"
    >
      <div
        {...listeners}
        {...attributes}
        className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors touch-none"
      >
        <GripVertical size={14} />
      </div>
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: priorityColor }}
      />
      <span className="text-xs text-foreground/80 flex-1 truncate">{task.title}</span>
      {task.due_date && (
        <span className="text-[10px] text-muted-foreground/50 shrink-0">
          {task.due_date.slice(5)}
        </span>
      )}
    </div>
  );
};

interface TaskDrawerProps {
  tasks: DbTask[];
  onAutoSchedule: () => void;
  isAnalyzing: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TaskDrawer: React.FC<TaskDrawerProps> = ({
  tasks,
  onAutoSchedule,
  isAnalyzing,
  collapsed,
  onToggleCollapse,
}) => {
  const unscheduled = tasks.filter(
    (t) => !t.done && t.status === "todo" && !t.scheduled_date
  );

  return (
    <motion.div
      animate={{ width: collapsed ? 32 : 288 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="shrink-0 border-l border-white/8 flex flex-col overflow-hidden"
      style={{ background: "hsl(var(--card) / 0.4)", backdropFilter: "blur(12px)" }}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center h-10 w-full border-b border-white/8 hover:bg-white/5 transition-colors shrink-0"
      >
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={14} className="text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-3 border-b border-white/8">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Unscheduled · {unscheduled.length}
              </p>
              {/* Aura Auto-Schedule button */}
              <button
                onClick={onAutoSchedule}
                disabled={isAnalyzing || unscheduled.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "hsl(var(--card) / 0.8)",
                  border: "1px solid hsl(265 60% 60% / 0.4)",
                  boxShadow: "0 0 15px hsl(265 60% 60% / 0.2)",
                  color: "hsl(265 60% 75%)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(265 60% 60% / 0.1)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px hsl(265 60% 60% / 0.35)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--card) / 0.8)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px hsl(265 60% 60% / 0.2)";
                }}
              >
                {isAnalyzing ? (
                  <Loader2 size={12} className="animate-spin shrink-0" />
                ) : (
                  <Sparkles size={12} className="shrink-0" />
                )}
                {isAnalyzing ? "Analyzing…" : "✨ Auto-Schedule with Aura"}
              </button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {unscheduled.length === 0 ? (
                <EmptyState
                  icon={CalendarOff}
                  title="All clear!"
                  description="No tasks waiting to be scheduled."
                  actionText={undefined}
                />
              ) : (
                unscheduled.map((task) => (
                  <DraggableTaskCard key={task.id} task={task} />
                ))
              )}
            </div>

            {/* Drag hint */}
            {unscheduled.length > 0 && (
              <div className="px-3 py-2 border-t border-white/5">
                <p className="text-[10px] text-muted-foreground/40 text-center">
                  Drag a task onto a time slot to schedule it
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskDrawer;
