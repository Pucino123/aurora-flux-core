import { useState } from "react";
import { Plus, X, Settings2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/i18n";
import { useFolderWidgets } from "@/hooks/useFolderWidgets";
import { BudgetPreviewWidget, SavingsRingWidget, TotalBalanceWidget } from "../widgets/FinanceWidget";
import { WeeklyWorkoutWidget, NextWorkoutWidget } from "../widgets/FitnessWidget";
import { Top5TasksWidget, ProjectStatusWidget } from "../widgets/ProductivityWidget";
import { RecentNotesWidget, PinnedNoteWidget } from "../widgets/NotesWidget";
import SmartPlanWidget from "../widgets/SmartPlanWidget";
import GamificationCard from "../GamificationCard";

interface WidgetDef {
  id: string;
  label: string;
  category: string;
}

const FOLDER_WIDGET_REGISTRY: WidgetDef[] = [
  { id: "smart-plan", label: "widget.smart_plan", category: "productivity" },
  { id: "budget-preview", label: "widget.budget_preview", category: "finance" },
  { id: "savings-ring", label: "widget.savings_ring", category: "finance" },
  { id: "total-balance", label: "widget.total_balance", category: "finance" },
  { id: "weekly-workout", label: "widget.weekly_workout", category: "fitness" },
  { id: "next-workout", label: "widget.next_workout", category: "fitness" },
  { id: "top-tasks", label: "widget.top_tasks", category: "productivity" },
  { id: "project-status", label: "widget.project_status", category: "productivity" },
  { id: "recent-notes", label: "widget.recent_notes", category: "notes" },
  { id: "pinned-note", label: "widget.pinned_note", category: "notes" },
  { id: "gamification", label: "widget.gamification", category: "productivity" },
];

/** Map folder types to relevant widget categories */
const FOLDER_TYPE_CATEGORIES: Record<string, string[]> = {
  finance: ["finance", "productivity"],
  fitness: ["fitness", "productivity"],
  health: ["fitness", "productivity"],
  project: ["productivity", "notes"],
  notes: ["notes", "productivity"],
};

function getRelevantWidgets(folderType?: string, folderTitle?: string): WidgetDef[] {
  const lower = (folderTitle || "").toLowerCase();
  // Detect type from title if folder type is generic
  let effectiveType = folderType || "project";
  if (effectiveType === "project") {
    if (/træning|fitness|workout|gym|health|sundhed/i.test(lower)) effectiveType = "fitness";
    else if (/økonomi|finans|finance|budget|opsparing|savings/i.test(lower)) effectiveType = "finance";
    else if (/noter|notes|notat/i.test(lower)) effectiveType = "notes";
  }
  const categories = FOLDER_TYPE_CATEGORIES[effectiveType] || ["productivity", "notes"];
  return FOLDER_WIDGET_REGISTRY.filter((w) => categories.includes(w.category));
}

const renderWidget = (type: string) => {
  switch (type) {
    case "smart-plan": return <SmartPlanWidget mood={null} energy={null} />;
    case "budget-preview": return <BudgetPreviewWidget />;
    case "savings-ring": return <SavingsRingWidget />;
    case "total-balance": return <TotalBalanceWidget />;
    case "weekly-workout": return <WeeklyWorkoutWidget />;
    case "next-workout": return <NextWorkoutWidget />;
    case "top-tasks": return <Top5TasksWidget />;
    case "project-status": return <ProjectStatusWidget />;
    case "recent-notes": return <RecentNotesWidget />;
    case "pinned-note": return <PinnedNoteWidget />;
    case "gamification": return <GamificationCard />;
    default: return null;
  }
};

interface FolderWidgetBarProps {
  folderId: string;
  folderType?: string;
  folderTitle?: string;
}

const FolderWidgetBar = ({ folderId, folderType, folderTitle }: FolderWidgetBarProps) => {
  const { config, addWidget, removeWidget, loaded } = useFolderWidgets(folderId);
  const [showPicker, setShowPicker] = useState(false);
  const [editMode, setEditMode] = useState(false);

  if (!loaded) return null;

  const relevantWidgets = getRelevantWidgets(folderType, folderTitle);
  const activeWidgets = config.activeWidgets;
  const availableToAdd = relevantWidgets.filter((w) => !activeWidgets.includes(w.id));

  if (activeWidgets.length === 0 && !showPicker) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="mb-4 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 border border-border/40 transition-all"
      >
        <Plus size={14} />
        {t("dashboard.add_widget")}
      </button>
    );
  }

  return (
    <div className="mb-4">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2">
        {activeWidgets.length > 0 && (
          <button
            onClick={() => { setEditMode(!editMode); setShowPicker(false); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
              editMode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 size={12} />
            {editMode ? t("dashboard.done") : t("dashboard.customize")}
          </button>
        )}
        {(editMode || activeWidgets.length === 0) && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={12} /> {t("dashboard.add_widget")}
          </button>
        )}
      </div>

      {/* Widget picker */}
      <AnimatePresence>
        {showPicker && availableToAdd.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 rounded-xl bg-secondary/30 border border-border/40"
          >
            <p className="text-[11px] font-semibold mb-2 text-muted-foreground">{t("dashboard.add_widget")}</p>
            <div className="flex flex-wrap gap-1.5">
              {availableToAdd.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { addWidget(w.id); setShowPicker(false); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-card border border-border/50 hover:border-primary/40 transition-colors"
                >
                  {t(w.label)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active widgets grid */}
      {activeWidgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeWidgets.map((widgetId) => {
            const def = FOLDER_WIDGET_REGISTRY.find((w) => w.id === widgetId);
            if (!def) return null;
            return (
              <motion.div
                key={widgetId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flux-card relative overflow-hidden ${editMode ? "ring-1 ring-primary/20" : ""}`}
              >
                {editMode && (
                  <div className="flex items-center justify-between px-2 pt-1.5 pb-1 border-b border-primary/10 mb-1">
                    <span className="text-[11px] font-semibold truncate">{t(def.label)}</span>
                    <button
                      onClick={() => removeWidget(widgetId)}
                      className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {renderWidget(def.id)}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FolderWidgetBar;
