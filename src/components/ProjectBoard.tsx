import { useState, useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { Check, Trash2, FileText, Pencil, X, CheckCircle2, Circle, ListTodo, AlertTriangle, Calendar, Pin, Columns3, List, Table, Plus } from "lucide-react";
import KanbanBoard from "./KanbanBoard";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import FinanceDashboard from "./FinanceDashboard";
import FolderWidgetBar from "./dashboard/FolderWidgetBar";
import CollapsibleSection from "./CollapsibleSection";
import BudgetTable from "./BudgetTable";
import type { BudgetRow } from "./BudgetTable";
import NotePrioritySelector, { getNotePriorityStyle, getNotePriorityBadge } from "./NotePrioritySelector";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentView from "./documents/DocumentView";

const MAX_VISIBLE_ACTIVE = 5;

const priorityColor = (p?: string | null) => {
  if (p === "critical") return "hsl(var(--priority-critical))";
  if (p === "high") return "hsl(var(--priority-high))";
  if (p === "low") return "hsl(var(--priority-low))";
  if (p === "none") return "hsl(var(--priority-none))";
  return "hsl(var(--priority-medium))";
};

const isOverdue = (item: { due_date?: string | null; done: boolean }) =>
  !!(item.due_date && new Date(item.due_date) < new Date() && !item.done);

const isNewCard = (item: { created_at: string }) =>
  Date.now() - new Date(item.created_at).getTime() < 3000;

const Confetti = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: `${30 + Math.random() * 40}%`,
              top: `${30 + Math.random() * 40}%`,
              backgroundColor: i % 2 === 0 ? "hsl(var(--aurora-violet))" : "hsl(45, 90%, 55%)",
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.5, 0], opacity: [1, 0.8, 0], x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </div>
    )}
  </AnimatePresence>
);

interface ProjectBoardProps {
  folderId: string;
}

const ProjectBoard = ({ folderId }: ProjectBoardProps) => {
  const { findFolderNode, createTask, updateTask, removeTask, goals, updateFolder, tasks, getDescendantFolderIds } = useFlux();
  const { documents: folderDocs, createDocument, updateDocument, removeDocument } = useDocuments(folderId);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [confettiId, setConfettiId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState<string>("normal");
  const [showAllActive, setShowAllActive] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [folderTitle, setFolderTitle] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    const saved = localStorage.getItem("flux-board-view");
    return saved === "list" ? "list" : "kanban";
  });

  const switchView = (mode: "list" | "kanban") => {
    setViewMode(mode);
    localStorage.setItem("flux-board-view", mode);
  };
  const folder = findFolderNode(folderId);

  // Get descendant folder IDs for parent aggregation
  const descendantIds = useMemo(() => getDescendantFolderIds(folderId), [folderId, getDescendantFolderIds]);
  const isParent = descendantIds.length > 0;

  // Build a map of folder ID -> folder title for origin badges
  const folderNameMap = useMemo(() => {
    const map = new Map<string, { title: string; color: string | null }>();
    for (const did of descendantIds) {
      const f = findFolderNode(did);
      if (f) map.set(did, { title: f.title, color: f.color });
    }
    return map;
  }, [descendantIds, findFolderNode]);

  // Own tasks + children's tasks for parent view
  const allTasks = useMemo(() => {
    if (!folder) return [];
    if (!isParent) return folder.tasks;
    const childTasks = tasks.filter((t) => descendantIds.includes(t.folder_id || ""));
    return [...folder.tasks, ...childTasks];
  }, [folder, isParent, tasks, descendantIds]);

  const folderGoals = useMemo(() => {
    if (!isParent) return goals.filter((g) => g.folder_id === folderId);
    return goals.filter((g) => g.folder_id === folderId || descendantIds.includes(g.folder_id || ""));
  }, [goals, folderId, isParent, descendantIds]);

  if (!folder) return null;

  // If viewing a document, show the document editor
  if (activeDoc) {
    const liveDoc = folderDocs.find((d) => d.id === activeDoc.id) || activeDoc;
    return (
      <div className="h-full">
        <DocumentView
          document={liveDoc}
          onBack={() => setActiveDoc(null)}
          onUpdate={updateDocument}
          onDelete={(id) => { removeDocument(id); setActiveDoc(null); }}
        />
      </div>
    );
  }

  // Separate budget tasks from regular tasks
  const budgetTasks = allTasks.filter((item) => item.type === "budget");
  const regularTasks = allTasks.filter((item) => item.type !== "budget");

  const activeTasks = regularTasks.filter((item) => !item.done);
  const completedTasks = regularTasks.filter((item) => item.done);
  const visibleActive = showAllActive ? activeTasks : activeTasks.slice(0, MAX_VISIBLE_ACTIVE);
  const hasMoreActive = activeTasks.length > MAX_VISIBLE_ACTIVE;

  const handleToggle = async (itemId: string, currentlyDone: boolean) => {
    if (!currentlyDone) setConfettiId(itemId);
    await updateTask(itemId, { done: !currentlyDone });
    setTimeout(() => setConfettiId(null), 700);
  };

  const startEdit = (item: { id: string; title: string; content: string; priority?: string | null }) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content || "");
    setEditPriority(item.priority || "normal");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateTask(editingId, { title: editTitle, content: editContent, priority: editPriority });
    setEditingId(null);
  };

  const renderTaskCard = (item: any, index: number) => {
    const isNote = item.type === "note";
    const overdue = isOverdue(item);
    const newHighlight = isNewCard(item);
    const priorityStyle = isNote ? getNotePriorityStyle(item.priority) : {};
    const priorityBadge = isNote ? getNotePriorityBadge(item.priority) : null;
    const cardClass = `${overdue ? "flux-card-urgent" : "flux-card"} ${newHighlight ? "flux-card-new" : ""} relative group`;
    const originFolder = isParent && item.folder_id !== folderId ? folderNameMap.get(item.folder_id) : null;

    return (
      <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={cardClass} style={priorityStyle}>
        {/* Origin badge for parent aggregation */}
        {originFolder && (
          <div className="absolute top-2 right-2 z-10">
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border border-border/50"
              style={{
                backgroundColor: originFolder.color ? `${originFolder.color}15` : "hsl(var(--secondary))",
                color: originFolder.color || "hsl(var(--muted-foreground))",
              }}
            >
              {originFolder.title}
            </span>
          </div>
        )}
        <Confetti show={confettiId === item.id} />
        {editingId === item.id ? (
          <div className="space-y-2">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              className="w-full px-2 py-1 rounded bg-white/60 border border-border text-sm outline-none focus:border-primary/30"
              autoFocus
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Note..."
              rows={isNote ? 4 : 2}
              className="w-full px-2 py-1 rounded bg-white/60 border border-border text-sm outline-none focus:border-primary/30 resize-none"
            />
            {isNote && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("notes.priority")}</p>
                <NotePrioritySelector value={editPriority} onChange={setEditPriority} compact />
              </div>
            )}
            <div className="flex gap-1">
              <button onClick={saveEdit} className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground">Gem</button>
              <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded text-xs hover:bg-secondary"><X size={12} /></button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3">
              {isNote ? (
                <div className="w-5 h-5 mt-0.5 rounded-md bg-accent/50 flex items-center justify-center shrink-0">
                  <FileText size={12} className="text-muted-foreground" />
                </div>
              ) : (
                <button
                  onClick={() => handleToggle(item.id, item.done)}
                  className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                    item.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  {item.done && <Check size={12} className="text-primary-foreground" />}
                </button>
              )}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEdit(item)}>
                <div className="flex items-center gap-1.5">
                  <span className="priority-dot" style={{ backgroundColor: priorityColor(item.priority) }} />
                  <p className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}>{item.title}</p>
                  {priorityBadge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${priorityBadge.color}22`, color: priorityBadge.color }}>
                      {priorityBadge.emoji} {t(priorityBadge.label)}
                    </span>
                  )}
                  {overdue && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive ml-1">
                      <AlertTriangle size={10} /> Overdue
                    </span>
                  )}
                </div>
                {item.content && (
                  <p className={`text-xs text-muted-foreground mt-1 ${isNote ? "whitespace-pre-wrap line-clamp-3" : "truncate"}`}>
                    {item.content}
                  </p>
                )}
                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((tag: string) => (
                      <span key={tag} className="flux-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => {
                    updateTask(item.id, { pinned: !item.pinned });
                    toast.success(item.pinned ? t("home.unpinned") : t("home.pinned"));
                  }}
                  className={`p-1 rounded hover:bg-secondary ${item.pinned ? "text-primary opacity-100" : "text-muted-foreground hover:text-foreground"}`}
                  title={item.pinned ? t("home.unpin") : t("home.pin")}
                >
                  <Pin size={12} className={item.pinned ? "fill-current" : ""} />
                </button>
                <button onClick={() => startEdit(item)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                  <Pencil size={12} />
                </button>
                <button onClick={() => {
                  removeTask(item.id);
                  toast(t("board.deleted"), {
                    action: {
                      label: t("toast.undo"),
                      onClick: () => createTask({ title: item.title, content: item.content || "", type: item.type, folder_id: folderId }),
                    },
                  });
                }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {/* Hover detail row */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground pl-8">
              {item.due_date && (
                <span className="flex items-center gap-0.5">
                  <Calendar size={9} /> {new Date(item.due_date).toLocaleDateString()}
                </span>
              )}
              {item.priority && <span className="capitalize">{item.priority}</span>}
              {item.tags?.length > 0 && <span>{item.tags.length} tag{item.tags.length > 1 ? "s" : ""}</span>}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div>
      {renamingFolder ? (
        <input
          value={folderTitle}
          onChange={(e) => setFolderTitle(e.target.value)}
          onBlur={() => {
            if (folderTitle.trim() && folderTitle !== folder.title) updateFolder(folderId, { title: folderTitle.trim() });
            setRenamingFolder(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.currentTarget.blur(); }
            if (e.key === "Escape") { setRenamingFolder(false); }
          }}
          className="text-xl font-bold font-display text-foreground mb-1 bg-transparent border-b-2 border-primary/40 outline-none w-full"
          autoFocus
        />
      ) : (
        <h2
          className="text-xl font-bold font-display text-foreground mb-1 cursor-pointer hover:text-primary/80 transition-colors"
          onDoubleClick={() => {
            setFolderTitle(folder.title);
            setRenamingFolder(true);
          }}
          title={t("brain.rename")}
        >
          {folder.title}
        </h2>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {allTasks.length + folderGoals.length} {t("board.items")}
          {folderDocs.length > 0 && <span className="ml-1 text-xs opacity-60">· {folderDocs.length} docs</span>}
          {isParent && <span className="ml-1 text-xs opacity-60">({folder.tasks.length} egne)</span>}
        </p>
        <div className="flex items-center gap-2">
          {/* Document creation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                const doc = await createDocument("Untitled Document", "text", folderId);
                if (doc) setActiveDoc(doc);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="New text document"
            >
              <FileText size={12} /> <Plus size={10} />
            </button>
            <button
              onClick={async () => {
                const doc = await createDocument("Untitled Spreadsheet", "spreadsheet", folderId);
                if (doc) setActiveDoc(doc);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="New spreadsheet"
            >
              <Table size={12} /> <Plus size={10} />
            </button>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button
              onClick={() => switchView("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Liste-visning"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => switchView("kanban")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "kanban" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Kanban-visning"
            >
              <Columns3 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Folder Documents */}
      {folderDocs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {folderDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/40 hover:bg-secondary/60 text-xs font-medium transition-colors"
            >
              {doc.type === "text" ? <FileText size={12} className="text-primary" /> : <Table size={12} className="text-primary" />}
              {doc.title}
            </button>
          ))}
        </div>
      )}

      {/* Folder Widgets */}
      <FolderWidgetBar folderId={folderId} folderType={folder.type} folderTitle={folder.title} />

      {/* Primary Focus: Summary Stats */}
      {allTasks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="flux-card flex items-center gap-2.5 py-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListTodo size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-base font-bold font-display">{allTasks.length}</p>
            </div>
          </div>
          <div className="flux-card flex items-center gap-2.5 py-3">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--aurora-blue))]/10 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-[hsl(var(--aurora-blue))]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{t("board.done_label") || "Done"}</p>
              <p className="text-base font-bold font-display">{completedTasks.length}</p>
            </div>
          </div>
          <div className="flux-card flex items-center gap-2.5 py-3">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--aurora-pink))]/10 flex items-center justify-center">
              <Circle size={14} className="text-[hsl(var(--aurora-pink))]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{t("board.pending_label") || "Pending"}</p>
              <p className="text-base font-bold font-display">{activeTasks.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Tables */}
      {budgetTasks.map((bt) => {
        let rows: BudgetRow[] = [];
        try {
          rows = JSON.parse(bt.content || "[]");
        } catch {
          rows = [{ category: "", budgeted: 0, spent: 0 }];
        }
        return <BudgetTable key={bt.id} taskId={bt.id} title={bt.title} initialRows={rows} pinned={bt.pinned} />;
      })}

      {/* Goals in this folder */}
      {folderGoals.map((goal) => (
        <div key={goal.id} className="mb-4">
          <FinanceDashboard goal={goal} />
        </div>
      ))}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <KanbanBoard folderId={folderId} tasks={allTasks} />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleActive.map((item, index) => renderTaskCard(item, index))}
              </div>
              {hasMoreActive && !showAllActive && (
                <button
                  onClick={() => setShowAllActive(true)}
                  className="mt-3 text-xs text-primary hover:underline font-medium"
                >
                  {t("board.show_more") || `Show ${activeTasks.length - MAX_VISIBLE_ACTIVE} more…`}
                </button>
              )}
              {showAllActive && hasMoreActive && (
                <button
                  onClick={() => setShowAllActive(false)}
                  className="mt-3 text-xs text-muted-foreground hover:underline font-medium"
                >
                  {t("board.show_less") || "Show less"}
                </button>
              )}
            </div>
          )}

          {/* Completed Tasks - Collapsible */}
          {completedTasks.length > 0 && (
            <CollapsibleSection title={t("board.completed_label") || "Completed"} count={completedTasks.length} defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {completedTasks.map((item, index) => renderTaskCard(item, index))}
              </div>
            </CollapsibleSection>
          )}

          {allTasks.length === 0 && folderGoals.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("board.empty")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectBoard;
