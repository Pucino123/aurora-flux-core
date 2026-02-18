import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PinOff, Sparkles, FileText, Trash2, Check, X, Pencil } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import FinanceDashboard from "./FinanceDashboard";
import BudgetTable from "./BudgetTable";
import type { BudgetRow } from "./BudgetTable";
import { toast } from "sonner";

interface StreamProps {
  initialPrompt?: string;
  newCardText?: string;
}

const Stream = ({ initialPrompt, newCardText }: StreamProps) => {
  const { goals, tasks, updateTask, updateGoal, removeTask, findFolderNode } = useFlux();

  const pinnedGoals = goals.filter((g) => g.pinned);
  const pinnedTasks = tasks.filter((tk) => tk.pinned);

  const hasPinnedContent = pinnedGoals.length > 0 || pinnedTasks.length > 0;

  const handleUnpinTask = (id: string) => {
    updateTask(id, { pinned: false });
    toast.success(t("home.unpinned"));
  };

  const handleUnpinGoal = (id: string) => {
    updateGoal(id, { pinned: false });
    toast.success(t("home.unpinned"));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
      {/* Pinned Goals */}
      {pinnedGoals.map((goal) => (
        <div key={goal.id} className="relative group">
          <FinanceDashboard goal={goal} />
          <button
            onClick={() => handleUnpinGoal(goal.id)}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
            title={t("home.unpin")}
          >
            <PinOff size={14} />
          </button>
        </div>
      ))}

      {/* Pinned Tasks — rendered as cards */}
      <AnimatePresence>
        {pinnedTasks.map((item, i) => {
          // Budget tasks render as tables
          if (item.type === "budget") {
            let rows: BudgetRow[] = [];
            try { rows = JSON.parse(item.content || "[]"); } catch { rows = []; }
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                <BudgetTable taskId={item.id} title={item.title} initialRows={rows} />
                <button
                  onClick={() => handleUnpinTask(item.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  title={t("home.unpin")}
                >
                  <PinOff size={14} />
                </button>
              </motion.div>
            );
          }

          // Regular tasks/notes
          const folderName = item.folder_id ? findFolderNode(item.folder_id)?.title : null;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.05 }}
              className="flux-card relative group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.type === "note" ? (
                    <FileText size={16} className="text-muted-foreground" />
                  ) : (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.done ? "bg-primary border-primary" : "border-border"}`}>
                      {item.done && <Check size={10} className="text-primary-foreground" />}
                    </div>
                  )}
                  <h3 className={`font-semibold text-sm font-display ${item.done ? "line-through text-muted-foreground/50" : ""}`}>{item.title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {folderName && (
                    <span className="text-[10px] text-muted-foreground mr-1">{folderName}</span>
                  )}
                  <button
                    onClick={() => handleUnpinTask(item.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title={t("home.unpin")}
                  >
                    <PinOff size={12} />
                  </button>
                </div>
              </div>
              {item.content && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 pl-6">{item.content}</p>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {!hasPinnedContent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card text-center py-16">
          <Pin size={32} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold font-display mb-2 text-lg">{t("home.empty")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("home.empty_desc")}</p>
        </motion.div>
      )}
    </div>
  );
};

export default Stream;
