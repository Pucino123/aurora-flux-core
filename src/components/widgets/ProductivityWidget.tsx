import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { ListTodo, Kanban, Check } from "lucide-react";

export const Top5TasksWidget = () => {
  const { tasks, updateTask } = useFlux();
  const active = tasks.filter((tk) => !tk.done && tk.type === "task").slice(0, 5);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <ListTodo size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display">{t("widget.top_tasks")}</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {active.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">{t("widget.no_tasks")}</span>
        ) : (
          active.map((tk) => (
            <div key={tk.id} className="flex items-center gap-2 group">
              <button
                onClick={() => updateTask(tk.id, { done: true })}
                className="w-4 h-4 rounded border-2 border-border hover:border-primary/50 shrink-0 flex items-center justify-center transition-colors"
              >
              </button>
              <span className="text-[11px] truncate">{tk.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const ProjectStatusWidget = () => {
  const { folders, tasks } = useFlux();
  const projects = folders.filter((f) => f.type === "project").slice(0, 4);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <Kanban size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display">{t("widget.project_status")}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {projects.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">{t("widget.no_projects")}</span>
        ) : (
          projects.map((p) => {
            const pTasks = tasks.filter((tk) => tk.folder_id === p.id);
            const done = pTasks.filter((tk) => tk.done).length;
            const total = pTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={p.id}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
