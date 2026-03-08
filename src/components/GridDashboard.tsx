import { useState, useCallback, useRef, useEffect, TouchEvent } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Plus, X, GripVertical, Pin, StickyNote, Pencil, GripHorizontal } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { t } from "@/lib/i18n";
import { BudgetPreviewWidget, SavingsRingWidget, TotalBalanceWidget } from "./widgets/FinanceWidget";
import { WeeklyWorkoutWidget, NextWorkoutWidget } from "./widgets/FitnessWidget";
import { Top5TasksWidget, ProjectStatusWidget } from "./widgets/ProductivityWidget";
import { RecentNotesWidget, PinnedNoteWidget } from "./widgets/NotesWidget";
import { TodayTodoWidget } from "./widgets/TodayTodoWidget";
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
  { id: "today-todo", type: "today-todo", label: "Today's Tasks", category: "productivity" },
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
    case "today-todo": return <TodayTodoWidget />;
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

/* ─── Sticky Notes ─── */
const STICKY_COLORS = [
  { key: "yellow", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-900 dark:text-yellow-200" },
  { key: "blue", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-900 dark:text-blue-200" },
  { key: "green", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-900 dark:text-green-200" },
  { key: "pink", bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-900 dark:text-pink-200" },
  { key: "purple", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-900 dark:text-purple-200" },
];

const DashboardStickyNotes = ({ notes, onUpdate }: {
  notes: Array<{ id: string; text: string; color: string }>;
  onUpdate: (notes: Array<{ id: string; text: string; color: string }>) => void;
}) => {
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
                onChange={e => onUpdate(notes.map(n => n.id === note.id ? { ...n, text: e.target.value } : n))}
                placeholder="Write something..."
                className={`w-full h-full bg-transparent border-none outline-none resize-none text-xs ${colorCfg.text}`}
              />
              <button
                onClick={() => onUpdate(notes.filter(n => n.id !== note.id))}
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

/* ─── Default pages ─── */
interface Page { id: string; name: string; widgets: string[] }

const DEFAULT_PAGES: Page[] = [
  { id: "page-1", name: "Productivity", widgets: ["smart-plan", "today-todo", "budget-preview", "savings-ring"] },
  { id: "page-2", name: "Analytics", widgets: ["top-tasks", "project-status", "gamification", "recent-notes"] },
];

/* ─── Page Grid (renders one page of widgets) ─── */
const PageGrid = ({ page, editMode, onRemoveWidget, renamingWidget, renameValue, setRenamingWidget, setRenameValue, commitRename, config, onWidgetDragStart, draggingWidgetId }: {
  page: Page;
  editMode: boolean;
  onRemoveWidget: (pageId: string, widgetId: string) => void;
  renamingWidget: string | null;
  renameValue: string;
  setRenamingWidget: (id: string | null) => void;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  config: any;
  onWidgetDragStart: (widgetId: string, fromPageId: string) => void;
  draggingWidgetId: string | null;
}) => {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });
  const layouts = makeLayouts(page.widgets);

  const getLabel = (widgetId: string) => {
    if (config.widgetNames?.[widgetId]) return config.widgetNames[widgetId];
    const cfg = WIDGET_REGISTRY.find(w => w.id === widgetId);
    if (!cfg) return widgetId;
    return cfg.label.includes(".") ? t(cfg.label) : cfg.label;
  };

  return (
    <div ref={containerRef}>
      {page.widgets.length > 0 ? (
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
          >
            {page.widgets.map((widgetId) => {
              const cfg = WIDGET_REGISTRY.find((w) => w.id === widgetId);
              if (!cfg) return null;
              const isDragging = draggingWidgetId === widgetId;
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/flux-widget", widgetId);
                    e.dataTransfer.setData("application/flux-from-page", page.id);
                    e.dataTransfer.effectAllowed = "move";
                    onWidgetDragStart(widgetId, page.id);
                  }}
                  onDragEnd={() => onWidgetDragStart("", "")}
                  className={`flux-card relative overflow-hidden group cursor-grab active:cursor-grabbing transition-all duration-150 ${
                    editMode ? "ring-1 ring-primary/20" : ""
                  } ${isDragging ? "scale-105 shadow-2xl ring-2 ring-primary/40 opacity-80" : ""}`}
                >
                  {!editMode && (
                    <button
                      onClick={() => onRemoveWidget(page.id, widgetId)}
                      className="absolute top-2 right-2 z-20 p-1 rounded-lg bg-background/80 backdrop-blur border border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                    >
                      <X size={11} />
                    </button>
                  )}
                  {/* Cross-page drag hint — shown on hover when not in edit mode */}
                  {!editMode && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <span className="text-[9px] text-muted-foreground/60 bg-background/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        drag to move page
                      </span>
                    </div>
                  )}
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
                          <button onClick={() => { setRenamingWidget(widgetId); setRenameValue(getLabel(widgetId)); }} className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                            {getLabel(widgetId)} <Pencil size={8} />
                          </button>
                        )}
                      </div>
                      <button onClick={() => onRemoveWidget(page.id, widgetId)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
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
      ) : (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flux-card text-center py-16"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            // handled by parent via dot drop
          }}
        >
          <Pin size={32} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold font-display mb-2">Empty page</h3>
          <p className="text-sm text-muted-foreground">Drag a widget here or add one using the controls above.</p>
        </motion.div>
      )}
    </div>
  );
};

/* ─── Main GridDashboard ─── */
const GridDashboard = () => {
  const { config, updateConfig } = useDashboardConfig();
  const [editMode, setEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [renamingWidget, setRenamingWidget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Cross-page drag state
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [draggingFromPageId, setDraggingFromPageId] = useState<string | null>(null);
  const [hoverDotIdx, setHoverDotIdx] = useState<number | null>(null);

  const { goals, tasks, updateTask, updateGoal, findFolderNode } = useFlux();

  // Pages state (persisted via config.pages, falling back to default)
  const pages: Page[] = (config as any).pages || DEFAULT_PAGES;
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0); // -1 left, 1 right
  const hoverDotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stickyNotes = config.stickyNotes;
  const pinnedGoals = goals.filter((g) => g.pinned);
  const pinnedTasks = tasks.filter((tk) => tk.pinned);

  const goToPage = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrentPage(idx);
  }, []);

  /* ─── Touch / Swipe navigation ─── */
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only act on horizontal swipes (dx > dy * 1.5 ensures it's more horizontal)
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && currentPage < pages.length - 1) goToPage(currentPage + 1, 1);
    if (dx > 0 && currentPage > 0) goToPage(currentPage - 1, -1);
  }, [currentPage, pages.length, goToPage]);

  /* Arrow key navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowRight") goToPage(Math.min(currentPage + 1, pages.length - 1), 1);
      if (e.key === "ArrowLeft") goToPage(Math.max(currentPage - 1, 0), -1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, pages.length, goToPage]);

  const updatePages = useCallback((next: Page[]) => {
    updateConfig({ ...config, pages: next } as any);
  }, [config, updateConfig]);

  const addPage = () => {
    const next = [...pages, { id: `page-${Date.now()}`, name: `Page ${pages.length + 1}`, widgets: [] }];
    updatePages(next);
    setDirection(1);
    setCurrentPage(next.length - 1);
  };

  const removeWidgetFromPage = (pageId: string, widgetId: string) => {
    const next = pages.map(p => p.id === pageId ? { ...p, widgets: p.widgets.filter(w => w !== widgetId) } : p);
    updatePages(next);
  };

  const addWidget = (id: string) => {
    const next = pages.map((p, i) => i === currentPage ? { ...p, widgets: [...p.widgets.filter(w => w !== id), id] } : p);
    updatePages(next);
    setShowWidgetPicker(false);
  };

  const commitRename = () => {
    if (renamingWidget && renameValue.trim()) {
      updateConfig({ widgetNames: { ...config.widgetNames, [renamingWidget]: renameValue.trim() } });
    }
    setRenamingWidget(null);
  };

  const handleSetRenamingWidget = useCallback((id: string | null) => setRenamingWidget(id), []);
  const handleSetRenameValue = useCallback((v: string) => setRenameValue(v), []);

  const addStickyNote = () => {
    const color = STICKY_COLORS[stickyNotes.length % STICKY_COLORS.length].key;
    updateConfig({ stickyNotes: [...stickyNotes, { id: `sn-${Date.now()}`, text: "", color }] });
  };

  const currentWidgets = pages[currentPage]?.widgets || [];
  const allActiveWidgets = pages.flatMap(p => p.widgets);
  const availableToAdd = WIDGET_REGISTRY.filter((w) => !currentWidgets.includes(w.id));

  /* Page slide variants */
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col">
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

      <DashboardStickyNotes notes={stickyNotes} onUpdate={(notes) => updateConfig({ stickyNotes: notes })} />

      {/* ─── iOS-style page slide ─── */}
      <div className="relative overflow-hidden flex-1">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
          >
            <PageGrid
              page={pages[currentPage] || DEFAULT_PAGES[0]}
              editMode={editMode}
              onRemoveWidget={removeWidgetFromPage}
              renamingWidget={renamingWidget}
              renameValue={renameValue}
              setRenamingWidget={handleSetRenamingWidget}
              setRenameValue={handleSetRenameValue}
              commitRename={commitRename}
              config={config}
              onWidgetDragStart={(wId, pId) => { setDraggingWidgetId(wId || null); setDraggingFromPageId(pId || null); }}
              draggingWidgetId={draggingWidgetId}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pinned items (always shown, independent of page) */}
      {(pinnedGoals.length > 0 || pinnedTasks.length > 0) && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold font-display text-muted-foreground flex items-center gap-1.5">
            <Pin size={12} className="fill-current" /> {t("dashboard.pinned_items")}
          </h3>
          {pinnedGoals.map((goal) => (
            <div key={goal.id} className="relative group">
              <FinanceDashboard goal={goal} />
              <button onClick={() => { updateGoal(goal.id, { pinned: false }); toast.success(t("home.unpinned")); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive">
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
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive">
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
                    {item.type === "note" ? <FileText size={16} className="text-muted-foreground" /> : (
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

      {/* ─── Pagination Dots + Add Page ─── */}
      <div className="flex items-center justify-center gap-2 mt-5 pb-2" data-tour="pagination-dots">
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-sm"
          style={{ background: "hsl(var(--card)/0.6)", border: "1px solid hsl(var(--border)/0.4)" }}
        >
          {pages.map((p, idx) => (
            <button
              key={idx}
              onClick={() => goToPage(idx, idx > currentPage ? 1 : -1)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setHoverDotIdx(idx);
                if (hoverDotTimer.current) clearTimeout(hoverDotTimer.current);
                hoverDotTimer.current = setTimeout(() => goToPage(idx, idx > currentPage ? 1 : -1), 500);
              }}
              onDragLeave={() => {
                setHoverDotIdx(null);
                if (hoverDotTimer.current) clearTimeout(hoverDotTimer.current);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setHoverDotIdx(null);
                if (hoverDotTimer.current) clearTimeout(hoverDotTimer.current);
                const wId = e.dataTransfer.getData("application/flux-widget");
                const fromPId = e.dataTransfer.getData("application/flux-from-page");
                if (!wId || !fromPId || fromPId === p.id) return;
                // Move widget: remove from source page, add to target page
                const next = pages.map((pg) => {
                  if (pg.id === fromPId) return { ...pg, widgets: pg.widgets.filter(w => w !== wId) };
                  if (pg.id === p.id) return { ...pg, widgets: [...pg.widgets.filter(w => w !== wId), wId] };
                  return pg;
                });
                updatePages(next);
                goToPage(idx, idx > currentPage ? 1 : -1);
                toast.success(`Moved widget to ${p.name}`);
                setDraggingWidgetId(null);
                setDraggingFromPageId(null);
              }}
              aria-label={`Go to page ${idx + 1}`}
              className={`transition-all duration-300 rounded-full ${
                idx === currentPage
                  ? "w-5 h-2 bg-primary"
                  : hoverDotIdx === idx && draggingWidgetId
                    ? "w-4 h-3 bg-primary/60 scale-125"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
        <button
          onClick={addPage}
          aria-label="Add new page"
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* ─── Drag hint bar ─── */}
      <AnimatePresence>
        {draggingWidgetId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium shadow-lg"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <GripHorizontal size={12} />
            Hover a page dot for 0.5s to move here
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GridDashboard;
