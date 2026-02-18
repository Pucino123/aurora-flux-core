import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { Pin, PinOff, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import FinanceDashboard from "../FinanceDashboard";
import BudgetTable from "../BudgetTable";
import type { BudgetRow } from "../BudgetTable";

const PinnedItemsSection = () => {
  const { goals, tasks, updateTask, updateGoal, findFolderNode } = useFlux();

  const pinnedGoals = goals.filter((g) => g.pinned);
  const pinnedTasks = tasks.filter((tk) => tk.pinned);
  const hasPinnedContent = pinnedGoals.length > 0 || pinnedTasks.length > 0;

  if (!hasPinnedContent) return null;

  return (
    <div className="mt-4 sm:mt-6 space-y-3">
      <h3 className="text-xs sm:text-sm font-semibold font-display text-muted-foreground flex items-center gap-1.5">
        <Pin size={12} className="fill-current" /> {t("dashboard.pinned_items")}
      </h3>

      {pinnedGoals.map((goal) => (
        <div key={goal.id} className="relative group">
          <FinanceDashboard goal={goal} />
          <button
            onClick={() => { updateGoal(goal.id, { pinned: false }); toast.success(t("home.unpinned")); }}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
          >
            <PinOff size={14} />
          </button>
        </div>
      ))}

      {pinnedTasks.map((item) => {
        if (item.type === "budget") {
          let rows: BudgetRow[] = [];
          try { rows = JSON.parse(item.content || "[]"); } catch { rows = []; }
          return (
            <div key={item.id} className="relative group">
              <BudgetTable taskId={item.id} title={item.title} initialRows={rows} pinned={item.pinned} />
              <button
                onClick={() => { updateTask(item.id, { pinned: false }); toast.success(t("home.unpinned")); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
              >
                <PinOff size={14} />
              </button>
            </div>
          );
        }
        const folderName = item.folder_id ? findFolderNode(item.folder_id)?.title : null;
        return (
          <div key={item.id} className="flux-card relative group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {item.type === "note" ? (
                  <FileText size={16} className="text-muted-foreground" />
                ) : (
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.done ? "bg-primary border-primary" : "border-border"}`}>
                    {item.done && <Check size={10} className="text-primary-foreground" />}
                  </div>
                )}
                <h3 className={`font-semibold text-xs sm:text-sm font-display ${item.done ? "line-through text-muted-foreground/50" : ""}`}>{item.title}</h3>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {folderName && <span className="text-[10px] text-muted-foreground mr-1">{folderName}</span>}
                <button
                  onClick={() => { updateTask(item.id, { pinned: false }); toast.success(t("home.unpinned")); }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <PinOff size={12} />
                </button>
              </div>
            </div>
            {item.content && <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 pl-6">{item.content}</p>}
          </div>
        );
      })}
    </div>
  );
};

export default PinnedItemsSection;
