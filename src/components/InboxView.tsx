import { useState } from "react";
import { useFlux } from "@/context/FluxContext";
import { Inbox, Check, Trash2, AlertTriangle, Calendar, ListTodo, CheckCircle2, Circle, Pin, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import CollapsibleSection from "./CollapsibleSection";
import EmailListView from "./inbox/EmailListView";
import TeamChatView from "./inbox/TeamChatView";

const priorityColor = (p?: string | null) => {
  if (p === "high") return "hsl(var(--priority-high))";
  if (p === "low") return "hsl(var(--priority-low))";
  return "hsl(var(--priority-medium))";
};

const isOverdue = (item: { due_date?: string | null; done: boolean }) =>
  !!(item.due_date && new Date(item.due_date) < new Date() && !item.done);

const isNewCard = (item: { created_at: string }) =>
  Date.now() - new Date(item.created_at).getTime() < 3000;

type TabKey = "tasks" | "mail" | "chat";

const InboxView = () => {
  const { inboxTasks, updateTask, removeTask, createTask } = useFlux();
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");

  const activeItems = inboxTasks.filter((i) => !i.done);
  const completedItems = inboxTasks.filter((i) => i.done);

  const handleDelete = (item: typeof inboxTasks[0]) => {
    removeTask(item.id);
    toast(t("inbox.deleted"), {
      action: {
        label: t("toast.undo"),
        onClick: () => {
          createTask({ title: item.title, content: item.content || "", type: item.type, folder_id: null });
        },
      },
    });
  };

  const renderItem = (item: typeof inboxTasks[0], i: number) => {
    const overdue = isOverdue(item);
    const newHighlight = isNewCard(item);
    const cardClass = `${overdue ? "flux-card-urgent" : "flux-card"} ${newHighlight ? "flux-card-new" : ""} flex items-start gap-3 group`;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className={cardClass}
      >
        <button
          onClick={() => updateTask(item.id, { done: !item.done })}
          className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
            item.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"
          }`}
        >
          {item.done && <Check size={12} className="text-primary-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="priority-dot" style={{ backgroundColor: priorityColor(item.priority) }} />
            <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground/50" : ""}`}>
              {item.title}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive">
                <AlertTriangle size={10} /> Overdue
              </span>
            )}
          </div>
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.tags.map((tag: string) => (
                <span key={tag} className="flux-tag">{tag}</span>
              ))}
            </div>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
            {item.due_date && (
              <span className="flex items-center gap-0.5">
                <Calendar size={9} /> {new Date(item.due_date).toLocaleDateString()}
              </span>
            )}
            {item.priority && <span className="capitalize">{item.priority}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              updateTask(item.id, { pinned: !item.pinned });
              toast.success(item.pinned ? t("home.unpinned") : t("home.pinned"));
            }}
            className={`p-1 rounded transition-all ${item.pinned ? "text-primary" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"}`}
            title={item.pinned ? t("home.unpin") : t("home.pin")}
          >
            <Pin size={12} className={item.pinned ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-8 py-4 sm:py-6">
      <h2 className="text-lg sm:text-xl font-bold font-display text-foreground mb-1">{t("inbox.title")}</h2>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">{t("inbox.desc")}</p>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5 mb-4 w-fit">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === "tasks" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox size={13} /> Tasks
          {inboxTasks.filter((i) => !i.done).length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 rounded-full">
              {inboxTasks.filter((i) => !i.done).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("mail")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === "mail" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail size={13} /> Mail
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 rounded-full">2</span>
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === "chat" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare size={13} /> Chat
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "chat" ? (
        <TeamChatView />
      ) : activeTab === "mail" ? (
        <EmailListView />
      ) : (
        <>
          {/* Summary Stats */}
          {inboxTasks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="flux-card flex items-center gap-2.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ListTodo size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-base font-bold font-display">{inboxTasks.length}</p>
                </div>
              </div>
              <div className="flux-card flex items-center gap-2.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--aurora-blue))]/10 flex items-center justify-center">
                  <CheckCircle2 size={14} className="text-[hsl(var(--aurora-blue))]" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("board.done_label") || "Done"}</p>
                  <p className="text-base font-bold font-display">{completedItems.length}</p>
                </div>
              </div>
              <div className="flux-card flex items-center gap-2.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--aurora-pink))]/10 flex items-center justify-center">
                  <Circle size={14} className="text-[hsl(var(--aurora-pink))]" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("board.pending_label") || "Pending"}</p>
                  <p className="text-base font-bold font-display">{activeItems.length}</p>
                </div>
              </div>
            </div>
          )}

          {inboxTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("inbox.empty")}</p>
            </div>
          ) : (
            <>
              {activeItems.length > 0 && (
                <div className="space-y-2 mb-4">
                  {activeItems.map((item, i) => renderItem(item, i))}
                </div>
              )}
              {completedItems.length > 0 && (
                <CollapsibleSection title={t("board.completed_label") || "Completed"} count={completedItems.length} defaultOpen={false}>
                  <div className="space-y-2 pt-2">
                    {completedItems.map((item, i) => renderItem(item, i))}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default InboxView;
