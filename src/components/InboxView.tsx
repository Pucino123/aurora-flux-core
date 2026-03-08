import { useState } from "react";
import { useFlux } from "@/context/FluxContext";
import { Inbox, Check, Trash2, AlertTriangle, Calendar, ListTodo, CheckCircle2, Circle, Pin, Mail, MessageSquare, Search, Plus, Reply, Forward, Archive, Star, Users, MailPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import CollapsibleSection from "./CollapsibleSection";
import { MOCK_EMAILS } from "./inbox/MockEmailData";
import type { Email } from "./inbox/MockEmailData";
import TeamChatView from "./inbox/TeamChatView";
import SEO from "@/components/SEO";

const priorityColor = (p?: string | null) => {
  if (p === "high") return "hsl(var(--priority-high))";
  if (p === "low") return "hsl(var(--priority-low))";
  return "hsl(var(--priority-medium))";
};

const isOverdue = (item: { due_date?: string | null; done: boolean }) =>
  !!(item.due_date && new Date(item.due_date) < new Date() && !item.done);

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

type TabKey = "chat" | "mail" | "tasks";
type TaskFilter = "today" | "upcoming" | "completed";

/* ─── iOS Segmented Control ─── */
const SegmentedControl = ({ tabs, active, onChange }: {
  tabs: { key: TabKey; label: string; icon: any; badge?: number }[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}) => (
  <div className="flex items-center gap-0.5 p-1 rounded-xl" style={{ background: "hsl(var(--secondary)/0.6)" }}>
    {tabs.map(({ key, label, icon: Icon, badge }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          active === key
            ? "bg-card shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon size={14} />
        {label}
        {badge != null && badge > 0 && (
          <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{badge}</span>
        )}
      </button>
    ))}
  </div>
);

/* ─── CHAT TAB ─── */
const ChatTab = () => (
  <div className="flex flex-1 min-h-0 gap-0">
    {/* Left: team list */}
    <div className="w-[30%] min-w-[200px] border-r border-border/20 flex flex-col">
      <div className="px-3 py-3 border-b border-border/10">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search chats…" className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border/30 outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {[
          { name: "Design Team", last: "Alex: mockups ready 🎨", time: "2m", unread: 3, online: true },
          { name: "Marketing Sync", last: "You: sounds good!", time: "1h", unread: 0, online: false },
          { name: "Engineering", last: "Sarah: PR merged", time: "3h", unread: 1, online: true },
        ].map((chat) => (
          <button key={chat.name} className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-secondary/30 transition-colors text-left group">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {chat.name[0]}
              </div>
              {chat.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">{chat.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{chat.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{chat.last}</p>
            </div>
            {chat.unread > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">
                {chat.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Right: chat thread */}
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <div className="px-4 py-2.5 border-b border-border/10 flex items-center gap-2 shrink-0">
        <Users size={14} className="text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Design Team</span>
        <span className="ml-auto text-[10px] text-muted-foreground">3 members</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TeamChatView />
      </div>
    </div>
  </div>
);

/* ─── MAIL TAB ─── */
const MailTab = () => {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [selected, setSelected] = useState<Email | null>(null);
  const [search, setSearch] = useState("");
  const [connected] = useState(false);

  const filtered = emails.filter(e =>
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    e.from.toLowerCase().includes(search.toLowerCase())
  );

  const unread = emails.filter(e => !e.isRead).length;

  if (!connected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center p-10 rounded-3xl max-w-sm mx-auto" style={{ background: "hsl(var(--card)/0.6)", backdropFilter: "blur(20px)", border: "1.5px solid hsl(var(--border)/0.4)" }}>
          <MailPlus size={32} className="mx-auto mb-4 text-muted-foreground/60" />
          <h3 className="text-lg font-bold text-foreground mb-2">Connect your Inbox</h3>
          <p className="text-sm text-muted-foreground mb-6">Sync your Google or Microsoft inbox to manage emails here.</p>
          <div className="space-y-2">
            <button onClick={() => {}} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary/40 transition-colors">
              <span className="text-base">G</span> Sign in with Google
            </button>
            <button onClick={() => {}} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary/40 transition-colors">
              <span className="text-base">⊞</span> Sign in with Microsoft
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Or browse mock emails below</p>
          <button onClick={() => setEmails(MOCK_EMAILS)} className="mt-2 text-xs text-primary hover:underline">Show demo emails</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 gap-0">
      {/* List pane */}
      <div className="w-[30%] min-w-[220px] border-r border-border/20 flex flex-col">
        <div className="px-3 py-3 border-b border-border/10 space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search mail…" className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border/30 outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Synced with</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground">G</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground">⊞</span>
            {unread > 0 && <span className="ml-auto text-[10px] text-muted-foreground">{unread} unread</span>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(email => (
            <button key={email.id} onClick={() => { setSelected(email); setEmails(p => p.map(e => e.id === email.id ? { ...e, isRead: true } : e)); }}
              className={`w-full px-3 py-2.5 text-left border-b border-border/10 transition-all hover:bg-secondary/20 ${selected?.id === email.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-foreground shrink-0 mt-0.5">
                  {email.from[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className={`text-[11px] truncate ${!email.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{email.from}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0 ml-1">{timeAgo(email.date)}</span>
                  </div>
                  <p className={`text-[10px] truncate ${!email.isRead ? "font-medium text-foreground" : "text-muted-foreground"}`}>{email.subject}</p>
                  <p className="text-[9px] text-muted-foreground/60 truncate">{email.preview}</p>
                </div>
                {!email.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reading pane */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {selected ? (
          <>
            <div className="px-5 py-3 border-b border-border/10 flex items-center gap-2 shrink-0">
              <h3 className="text-sm font-semibold text-foreground flex-1 truncate">{selected.subject}</h3>
              <button className="p-1.5 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground"><Reply size={14} /></button>
              <button className="p-1.5 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground"><Forward size={14} /></button>
              <button className="p-1.5 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground"><Archive size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/20">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{selected.from[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{selected.from}</p>
                  <p className="text-[11px] text-muted-foreground">{selected.fromEmail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{timeAgo(selected.date)}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail size={28} className="mb-2 opacity-30" />
            <p className="text-sm">Select an email to read</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── TASKS TAB ─── */
const TasksTab = () => {
  const { inboxTasks, updateTask, removeTask, createTask } = useFlux();
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const filtered = inboxTasks.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "today") return item.scheduled_date === today || (!item.scheduled_date && !item.done);
    if (filter === "upcoming") return !item.done && item.scheduled_date && item.scheduled_date > today;
    if (filter === "completed") return item.done;
    return true;
  });

  const FILTERS: { key: TaskFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="flex flex-1 min-h-0 gap-0">
      {/* Left: filters */}
      <div className="w-[30%] min-w-[180px] border-r border-border/20 flex flex-col">
        <div className="px-3 py-3 border-b border-border/10">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border/30 outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="p-2 space-y-0.5">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"}`}>
              {f.label}
              <span className="ml-1 text-[10px] opacity-60">
                {f.key === "today" ? inboxTasks.filter(t => t.scheduled_date === today || (!t.scheduled_date && !t.done)).length :
                  f.key === "upcoming" ? inboxTasks.filter(t => !t.done && t.scheduled_date && t.scheduled_date > today).length :
                  inboxTasks.filter(t => t.done).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: task list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 min-w-0">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ListTodo size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">No tasks in this filter</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((item, i) => {
                const overdue = isOverdue(item);
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${overdue ? "border-destructive/20 bg-destructive/5" : "border-border/30 hover:border-border/60 bg-card/30"}`}>
                    <button
                      onClick={() => updateTask(item.id, { done: !item.done })}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${item.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`}
                    >
                      {item.done && <Check size={10} className="text-primary-foreground" />}
                    </button>
                    <span className="priority-dot shrink-0" style={{ backgroundColor: priorityColor(item.priority) }} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${item.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}>{item.title}</span>
                      {item.due_date && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Calendar size={9} className="text-muted-foreground" />
                          <span className={`text-[10px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{new Date(item.due_date).toLocaleDateString()}</span>
                          {overdue && <span className="text-[10px] text-destructive flex items-center gap-0.5"><AlertTriangle size={8} /> Overdue</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground shrink-0">Inbox</span>
                    <button onClick={() => { removeTask(item.id); toast(t("inbox.deleted")); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 size={11} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Main InboxView ─── */
const InboxView = () => {
  const { inboxTasks } = useFlux();
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");

  const TABS = [
    { key: "chat" as TabKey, label: "Chat", icon: MessageSquare },
    { key: "mail" as TabKey, label: "Mail", icon: Mail, badge: 2 },
    { key: "tasks" as TabKey, label: "Tasks", icon: ListTodo, badge: inboxTasks.filter(i => !i.done).length },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
      <SEO title="Inbox" description="Manage your tasks, mail, and team chats in one unified inbox." />
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border/20 shrink-0">
        <h2 className="text-xl font-bold font-display text-foreground mb-3">Inbox</h2>
        <SegmentedControl tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 flex min-h-0 min-w-0"
          >
            {activeTab === "chat" && <ChatTab />}
            {activeTab === "mail" && <MailTab />}
            {activeTab === "tasks" && <TasksTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InboxView;
