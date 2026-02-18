import { useState, useCallback, useRef } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Plus, X, GripVertical, Pin, StickyNote, Pencil } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { t } from "@/lib/i18n";
import { BudgetPreviewWidget, SavingsRingWidget, TotalBalanceWidget } from "./widgets/FinanceWidget";
import { WeeklyWorkoutWidget, NextWorkoutWidget } from "./widgets/FitnessWidget";
import { Top5TasksWidget, ProjectStatusWidget } from "./widgets/ProductivityWidget";
import { RecentNotesWidget, PinnedNoteWidget } from "./widgets/NotesWidget";
import SmartPlanWidget from "./widgets/SmartPlanWidget";
import GamificationCard from "./GamificationCard";
import FinanceDashboard from "./FinanceDashboard";
import BudgetTable from "./BudgetTable";
import type { BudgetRow } from "./BudgetTable";
import { PinOff, FileText, Check } from "lucide-react";
import { toast } from "sonner";

interface WidgetConfig {
  id: string;
  type: string;
  label: string;
  category: string;
}

const WIDGET_REGISTRY: WidgetConfig[] = [
  { id: "smart-plan", type: "smart-plan", label: "Smart Plan", category: "productivity" },
  { id: "top-tasks", type: "top-tasks", label: "widget.top_tasks", category: "productivity" },
  { id: "project-status", type: "project-status", label: "widget.project_status", category: "productivity" },
  { id: "gamification", type: "gamification", label: "Streaks", category: "productivity" },
  { id: "budget-preview", type: "budget-preview", label: "widget.budget_preview", category: "finance" },
  { id: "savings-ring", type: "savings-ring", label: "widget.savings_ring", category: "finance" },
  { id: "total-balance", type: "total-balance", label: "widget.total_balance", category: "finance" },
  { id: "weekly-workout", type: "weekly-workout", label: "widget.weekly_workout", category: "fitness" },
  { id: "next-workout", type: "next-workout", label: "widget.next_workout", category: "fitness" },
  { id: "recent-notes", type: "recent-notes", label: "widget.recent_notes", category: "notes" },
  { id: "pinned-note", type: "pinned-note", label: "widget.pinned_note", category: "notes" },
];

const renderWidget = (type: string) => {
  switch (type) {
    case "smart-plan": return <SmartPlanWidget />;
    case "gamification": return <GamificationCard />;
    case "budget-preview": return <BudgetPreviewWidget />;
    case "savings-ring": return <SavingsRingWidget />;
    case "total-balance": return <TotalBalanceWidget />;
    case "weekly-workout": return <WeeklyWorkoutWidget />;
    case "next-workout": return <NextWorkoutWidget />;
    case "top-tasks": return <Top5TasksWidget />;
    case "project-status": return <ProjectStatusWidget />;
    case "recent-notes": return <RecentNotesWidget />;
    case "pinned-note": return <PinnedNoteWidget />;
    default: return null;
  }
};

const makeLayouts = (widgets: string[]) => {
  const lg = widgets.map((id, idx) => ({
    i: id, x: (idx % 3) * 4, y: Math.floor(idx / 3) * 3, w: 4, h: 3,
  }));
  const md = widgets.map((id, idx) => ({
    i: id, x: (idx % 2) * 2, y: Math.floor(idx / 2) * 3, w: 2, h: 3,
  }));
  const sm = widgets.map((id, idx) => ({
    i: id, x: 0, y: idx * 3, w: 1, h: 3,
  }));
  return { lg, md, sm };
};

/* ── Sticky Notes ── */
const STICKY_COLORS = [
  { key: "yellow", bg: "bg-yellow-100", text: "text-yellow-900" },
  { key: "blue", bg: "bg-blue-100", text: "text-blue-900" },
  { key: "green", bg: "bg-green-100", text: "text-green-900" },
  { key: "pink", bg: "bg-pink-100", text: "text-pink-900" },
  { key: "purple", bg: "bg-purple-100", text: "text-purple-900" },
];

const DashboardStickyNotes = ({ notes, onUpdate }: {
  notes: Array<{ id: string; text: string; color: string }>;
  onUpdate: (notes: Array<{ id: string; text: string; color: string }>) => void;
}) => {
  const updateNote = (id: string, text: string) => {
    onUpdate(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const removeNote = (id: string) => {
    onUpdate(notes.filter(n => n.id !== id));
  };

  if (notes.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <StickyNote size={12} /> Sticky Notes
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {notes.map(note => {
          const colorCfg = STICKY_COLORS.find(c => c.key === note.color) || STICKY_COLORS[0];
          return (
            <div key={note.id} className={`relative w-[160px] min-h-[100px] p-3 rounded-xl shadow-sm ${colorCfg.bg} group`}>
              <textarea
                value={note.text}
                onChange={e => updateNote(note.id, e.target.value)}
                placeholder="Write something..."
                className={`w-full h-full bg-transparent border-none outline-none resize-none text-xs ${colorCfg.text}`}
              />
              <button
                onClick={() => removeNote(note.id)}
                className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
              >
                <X size={10} className={colorCfg.text} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GridDashboard = () => {
  const { config, updateConfig } = useDashboardConfig();
  const [editMode, setEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [renamingWidget, setRenamingWidget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  const { goals, tasks, updateTask, updateGoal, findFolderNode } = useFlux();

  const activeWidgets = config.activeWidgets;
  const layouts = config.layouts || makeLayouts(activeWidgets);
  const stickyNotes = config.stickyNotes;

  const pinnedGoals = goals.filter((g) => g.pinned);
  const pinnedTasks = tasks.filter((tk) => tk.pinned);
  const hasPinnedContent = pinnedGoals.length > 0 || pinnedTasks.length > 0;

  const handleLayoutChange = useCallback((_layout: any, allLayouts: any) => {
    updateConfig({ layouts: allLayouts });
  }, [updateConfig]);

  const removeWidget = (id: string) => {
    updateConfig({ activeWidgets: activeWidgets.filter(w => w !== id) });
  };

  const addWidget = (id: string) => {
    if (activeWidgets.includes(id)) return;
    const next = [...activeWidgets, id];
    updateConfig({ activeWidgets: next, layouts: makeLayouts(next) });
    setShowWidgetPicker(false);
  };

  const getWidgetLabel = (widgetId: string) => {
    if (config.widgetNames[widgetId]) return config.widgetNames[widgetId];
    const cfg = WIDGET_REGISTRY.find(w => w.id === widgetId);
    if (!cfg) return widgetId;
    return cfg.label.includes(".") ? t(cfg.label) : cfg.label;
  };

  const startRename = (widgetId: string) => {
    setRenamingWidget(widgetId);
    setRenameValue(getWidgetLabel(widgetId));
  };

  const commitRename = () => {
    if (renamingWidget && renameValue.trim()) {
      updateConfig({ widgetNames: { ...config.widgetNames, [renamingWidget]: renameValue.trim() } });
    }
    setRenamingWidget(null);
  };

  const addStickyNote = () => {
    const color = STICKY_COLORS[stickyNotes.length % STICKY_COLORS.length].key;
    updateConfig({ stickyNotes: [...stickyNotes, { id: `sn-${Date.now()}`, text: "", color }] });
  };

  const availableToAdd = WIDGET_REGISTRY.filter((w) => !activeWidgets.includes(w.id));

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-display">{t("dashboard.title")}</h2>
        <div className="flex items-center gap-2">
          {editMode && (
            <button onClick={addStickyNote} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
              <StickyNote size={12} /> Note
            </button>
          )}
          <button
            onClick={() => { setEditMode(!editMode); setShowWidgetPicker(false); setRenamingWidget(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              editMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Settings2 size={14} />
            {editMode ? t("dashboard.done") : t("dashboard.customize")}
          </button>
        </div>
      </div>

      {/* Widget picker */}
      <AnimatePresence>
        {editMode && showWidgetPicker && availableToAdd.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
            <p className="text-xs font-semibold mb-2">{t("dashboard.add_widget")}</p>
            <div className="flex flex-wrap gap-2">
              {availableToAdd.map((w) => (
                <button key={w.id} onClick={() => addWidget(w.id)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-card border border-border hover:border-primary/40 transition-colors">
                  {w.label.includes(".") ? t(w.label) : w.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editMode && (
        <button onClick={() => setShowWidgetPicker(!showWidgetPicker)}
          className="mb-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
          <Plus size={14} /> {t("dashboard.add_widget")}
        </button>
      )}

      {/* Sticky Notes */}
      <DashboardStickyNotes notes={stickyNotes} onUpdate={(notes) => updateConfig({ stickyNotes: notes })} />

      {/* Grid */}
      {activeWidgets.length > 0 && (
        <div className={editMode ? "ring-1 ring-dashed ring-border/50 rounded-xl p-2 bg-secondary/20" : ""}>
          <ResponsiveGridLayout
            layouts={layouts}
            breakpoints={{ lg: 1024, md: 768, sm: 0 }}
            cols={{ lg: 12, md: 4, sm: 1 }}
            rowHeight={60}
            width={width}
            margin={[12, 12] as [number, number]}
            dragConfig={{ enabled: editMode, handle: ".widget-drag-handle" }}
            resizeConfig={{ enabled: editMode }}
            onLayoutChange={handleLayoutChange}
          >
            {activeWidgets.map((widgetId) => {
              const cfg = WIDGET_REGISTRY.find((w) => w.id === widgetId);
              if (!cfg) return null;
              return (
                <div key={widgetId} className={`flux-card relative overflow-hidden ${editMode ? "ring-1 ring-primary/20" : ""}`}>
                  {editMode && (
                    <div className="absolute top-1 left-1 right-1 z-10 flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <div className="widget-drag-handle p-1 cursor-grab text-muted-foreground hover:text-foreground">
                          <GripVertical size={12} />
                        </div>
                        {renamingWidget === widgetId ? (
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                            onBlur={commitRename} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingWidget(null); }}
                            className="text-[10px] font-medium bg-transparent border-b border-primary/40 outline-none w-20" autoFocus />
                        ) : (
                          <button onClick={() => startRename(widgetId)} className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                            {getWidgetLabel(widgetId)} <Pencil size={8} />
                          </button>
                        )}
                      </div>
                      <button onClick={() => removeWidget(widgetId)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {renderWidget(cfg.type)}
                </div>
              );
            })}
          </ResponsiveGridLayout>
        </div>
      )}

      {/* Pinned items */}
      {hasPinnedContent && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold font-display text-muted-foreground flex items-center gap-1.5">
            <Pin size={12} className="fill-current" /> {t("dashboard.pinned_items")}
          </h3>
          
          {pinnedGoals.map((goal) => (
            <div key={goal.id} className="relative group">
              <FinanceDashboard goal={goal} />
              <button onClick={() => { updateGoal(goal.id, { pinned: false }); toast.success(t("home.unpinned")); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive">
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
                  <button onClick={() => { updateTask(item.id, { pinned: false }); toast.success(t("home.unpinned")); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive">
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
                    <h3 className={`font-semibold text-sm font-display ${item.done ? "line-through text-muted-foreground/50" : ""}`}>{item.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {folderName && <span className="text-[10px] text-muted-foreground mr-1">{folderName}</span>}
                    <button onClick={() => { updateTask(item.id, { pinned: false }); toast.success(t("home.unpinned")); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <PinOff size={12} />
                    </button>
                  </div>
                </div>
                {item.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 pl-6">{item.content}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {activeWidgets.length === 0 && !hasPinnedContent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card text-center py-16">
          <Pin size={32} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold font-display mb-2 text-lg">{t("home.empty")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("home.empty_desc")}</p>
        </motion.div>
      )}
    </div>
  );
};

export default GridDashboard;
