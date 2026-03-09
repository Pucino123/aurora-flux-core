import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2, ChevronDown, FileText, Check, Zap } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { useCRM } from "@/context/CRMContext";
import { useMonetization } from "@/context/MonetizationContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";
import { parseIntent, pushHistory, popHistory } from "@/lib/auraAgent";
import AuraActionCard from "@/components/aura/AuraActionCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  actionCard?: React.ReactNode;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flux-ai`;

const DAY_MAP: Record<string, number> = {
  today: 0, tomorrow: 1, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6, sunday: 7,
};

function resolveDate(day: string): string {
  const offset = DAY_MAP[day.toLowerCase()] ?? 1;
  return format(addDays(new Date(), offset), "yyyy-MM-dd");
}

const AskAura = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insertedIdx, setInsertedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { tasks, goals, workouts, folders, scheduleBlocks, pendingDocumentId, createTask, updateTask, removeTask, createBlock } = useFlux();
  const { deals } = useCRM();
  const { consumeSparks, sparksBalance } = useMonetization();

  // ── Cmd+Shift+A toggle ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setOpen(prev => !prev);
    window.addEventListener("toggle-aura", handler);
    return () => window.removeEventListener("toggle-aura", handler);
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setOpen(true);
      const { content, title, prompt } = e.detail || {};
      if (content) {
        const systemMsg = prompt
          ? `Document "${title}" is open. User asks: ${prompt}`
          : `Document "${title}" is open for context. How can I help?`;
        setMessages([{ role: "assistant", content: systemMsg }]);
      }
    };
    window.addEventListener("aura:summon-with-doc" as any, handler);
    return () => window.removeEventListener("aura:summon-with-doc" as any, handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 120); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Workspace context string ───────────────────────────────────────────────
  const workspaceContext = useCallback(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const pendingTasks = tasks.filter(t => !t.done).slice(0, 10);
    const todayTasks = tasks.filter(t => !t.done && (t.scheduled_date === today || t.due_date === today));
    const recentWorkouts = workouts.slice(0, 5);
    const pinnedGoals = goals.filter(g => g.pinned);
    const topFolders = folders.slice(0, 8).map(f => f.title);
    const crmSummary = deals.slice(0, 5).map(d => `${d.name}(${d.stage})`).join(", ");
    // Today's schedule blocks
    const todayBlocks = scheduleBlocks
      .filter(b => b.scheduled_date === today)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 8);
    const scheduleSummary = todayBlocks.length
      ? todayBlocks.map(b => `${b.time} ${b.title}`).join(", ")
      : "No scheduled blocks today.";
    return [
      `[SYSTEM DATA] Today is ${format(new Date(), "EEEE, MMMM d, yyyy")}.`,
      `User has ${tasks.length} tasks total, ${pendingTasks.length} pending.`,
      todayTasks.length ? `Today's tasks: ${todayTasks.map(t => `"${t.title}"`).join(", ")}.` : "No tasks due today.",
      pendingTasks.length ? `All pending: ${pendingTasks.map(t => `"${t.title}" (${t.priority})`).join(", ")}.` : "",
      `Today's schedule: ${scheduleSummary}`,
      `Sparks balance: ${sparksBalance} Sparks remaining.`,
      pinnedGoals.length ? `Goals: ${pinnedGoals.map(g => `"${g.title}" ${g.current_amount}/${g.target_amount}`).join(", ")}.` : "",
      recentWorkouts.length ? `Recent workouts: ${recentWorkouts.map(w => w.activity).join(", ")}.` : "",
      topFolders.length ? `Projects: ${topFolders.join(", ")}.` : "",
      crmSummary ? `CRM pipeline: ${crmSummary}.` : "",
    ].filter(Boolean).join(" ");
  }, [tasks, goals, workouts, folders, deals, scheduleBlocks, sparksBalance]);

  // ── Agentic action handler ─────────────────────────────────────────────────
  const handleAgentAction = useCallback(async (text: string): Promise<Message | null> => {
    const intent = parseIntent(text);
    if (intent.action === "none") return null;

    const { action, params } = intent;

    // ── UNDO ──────────────────────────────────────────────────────────────────
    if (action === "undo") {
      const entry = popHistory();
      if (!entry) {
        return { role: "assistant", content: "Nothing to undo right now.", actionCard: undefined };
      }
      if (entry.type === "create_task") {
        await removeTask(entry.payload.id);
      } else if (entry.type === "update_task") {
        await updateTask(entry.payload.id, entry.payload.previous);
      }
      return {
        role: "assistant",
        content: "Done. Action reversed.",
        actionCard: (
          <AuraActionCard variant="task_created" title="Undo Successful"
            body={`Reverted: ${entry.type.replace("_", " ")}`} />
        ),
      };
    }

    // ── CREATE TASK ───────────────────────────────────────────────────────────
    if (action === "create_task") {
      const title = params.title || "New task from Aura";
      const priority = (params.priority as any) || "medium";
      const task = await createTask({ title, priority, type: "task" });
      if (task) {
        pushHistory({ type: "create_task", payload: { id: task.id } });
        const card = (
          <AuraActionCard
            variant="task_created"
            title={`Task Created`}
            body={`"${title}" · ${priority.charAt(0).toUpperCase() + priority.slice(1)} priority`}
            onUndo={() => { removeTask(task.id); toast.info("Task removed"); }}
          />
        );
        return { role: "assistant", content: `Done. I've added **"${title}"** to your board.`, actionCard: card };
      }
    }

    // ── COMPLETE TASK ─────────────────────────────────────────────────────────
    if (action === "complete_task") {
      const searchTerm = params.title?.toLowerCase() || "";
      const found = tasks.find(t => t.title.toLowerCase().includes(searchTerm) && !t.done);
      if (found) {
        pushHistory({ type: "update_task", payload: { id: found.id, previous: { done: false } } });
        await updateTask(found.id, { done: true, status: "done" });
        const card = (
          <AuraActionCard
            variant="task_completed"
            title="Task Completed ✓"
            body={`"${found.title}" marked as done.`}
            onUndo={() => { updateTask(found.id, { done: false, status: "todo" }); toast.info("Task restored"); }}
          />
        );
        return { role: "assistant", content: `Done. **"${found.title}"** is now complete.`, actionCard: card };
      }
      return { role: "assistant", content: `I couldn't find a pending task matching "${params.title}". Check the task list?` };
    }

    // ── LIST TASKS ────────────────────────────────────────────────────────────
    if (action === "list_tasks") {
      const filter = params.filter || "today";
      const today = format(new Date(), "yyyy-MM-dd");
      const relevant = filter === "today"
        ? tasks.filter(t => !t.done && (t.scheduled_date === today || t.due_date === today))
        : tasks.filter(t => !t.done);
      const display = relevant.slice(0, 6);
      const card = (
        <AuraActionCard
          variant="task_list"
          title={filter === "today" ? "Today's Tasks" : "Pending Tasks"}
          items={display.map(t => ({ label: t.title, status: t.priority === "high" ? "high" : undefined }))}
          navigateTo="tasks"
        />
      );
      if (display.length === 0) return { role: "assistant", content: "You have no pending tasks right now — clear schedule! 🎯" };
      return {
        role: "assistant",
        content: `You have **${relevant.length}** pending task${relevant.length !== 1 ? "s" : ""}${filter === "today" ? " today" : ""}.`,
        actionCard: card,
      };
    }

    // ── SCHEDULE EVENT ────────────────────────────────────────────────────────
    if (action === "schedule_event") {
      const date = resolveDate(params.day || "tomorrow");
      const eventTitle = params.contact
        ? `Meeting with ${params.contact}`
        : params.title || "Meeting";
      const block = await createBlock({
        title: eventTitle,
        time: params.time?.includes(":") ? params.time : `${params.time}:00`,
        duration: `${params.duration || 30}m`,
        type: "deep",
        scheduled_date: date,
      });
      if (block) {
        const card = (
          <AuraActionCard
            variant="event_created"
            title="Event Scheduled"
            body={`${eventTitle} on ${format(parseISO(date), "EEE, MMM d")} at ${params.time || "14:00"}`}
            navigateTo="calendar"
          />
        );
        return { role: "assistant", content: `Done. I've scheduled **${eventTitle}** for ${format(parseISO(date), "EEEE, MMM d")} at ${params.time || "14:00"}.`, actionCard: card };
      }
    }

    // ── DRAFT EMAIL ───────────────────────────────────────────────────────────
    if (action === "draft_email") {
      const card = (
        <AuraActionCard
          variant="email_draft"
          title={`Draft: ${params.subject}`}
          body={`To: ${params.to}\n\nHi ${params.to},\n\nI wanted to reach out regarding ${params.subject}. [Your content here]\n\nBest,\n[Your name]`}
          actionLabel="Open Inbox"
          onAction={() => { /* navigate to inbox */ }}
        />
      );
      return { role: "assistant", content: `Here's a draft email to **${params.to}** about "${params.subject}".`, actionCard: card };
    }

    // ── INVOICE / FINANCIAL ───────────────────────────────────────────────────
    if (action === "show_unpaid_invoices") {
      const unpaid = deals.flatMap(d => (d.invoices || []).filter(inv => inv.status === "Pending").map(inv => ({
        label: d.name,
        value: `$${inv.amount.toLocaleString()}`,
        status: "Pending" as const,
      })));
      const total = deals.flatMap(d => (d.invoices || []).filter(inv => inv.status === "Pending")).reduce((s, i) => s + i.amount, 0);
      if (unpaid.length === 0) {
        return { role: "assistant", content: "You don't have any outstanding invoices yet. Would you like me to help you create one?", actionCard: (
          <AuraActionCard variant="invoice_list" title="No Pending Invoices" body="All invoices are paid or no invoices exist." navigateTo="crm" actionLabel="Go to CRM" />
        )};
      }
      const card = (
        <AuraActionCard
          variant="invoice_list"
          title={`${unpaid.length} Unpaid Invoice${unpaid.length !== 1 ? "s" : ""}`}
          body={`$${total.toLocaleString()} total outstanding`}
          items={unpaid}
          navigateTo="crm"
        />
      );
      return { role: "assistant", content: `You have **$${total.toLocaleString()}** in outstanding invoices across ${unpaid.length} client${unpaid.length !== 1 ? "s" : ""}.`, actionCard: card };
    }

    if (action === "show_contact_invoices") {
      const contact = deals.find(d => d.name.toLowerCase().includes(params.contact?.toLowerCase() || ""));
      if (!contact) return { role: "assistant", content: `I couldn't find a contact named "${params.contact}" in your CRM.` };
      const paid = (contact.invoices || []).filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
      const pending = (contact.invoices || []).filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
      const card = (
        <AuraActionCard
          variant="contact_financials"
          title={contact.name}
          body={`$${paid.toLocaleString()} paid · $${pending.toLocaleString()} pending`}
          items={(contact.invoices || []).map(i => ({ label: i.id, value: `$${i.amount.toLocaleString()}`, status: i.status }))}
          navigateTo="crm"
        />
      );
      return { role: "assistant", content: `**${contact.name}** has **$${pending.toLocaleString()} pending** and $${paid.toLocaleString()} paid.`, actionCard: card };
    }

    if (action === "send_invoice_reminder") {
      const contact = deals.find(d => d.name.toLowerCase().includes(params.contact?.toLowerCase() || ""));
      if (!contact) return { role: "assistant", content: `Couldn't find "${params.contact}" in your CRM.` };
      const card = (
        <AuraActionCard
          variant="invoice_reminder"
          title={`Reminder to ${contact.name}`}
          body={`Subject: Payment Reminder\n\nHi ${contact.name},\n\nI hope you're doing well. This is a friendly reminder that invoice payment is due. Please let me know if you have any questions.\n\nThank you,\n[Your name]`}
          actionLabel="Send Now"
          onAction={() => toast.success(`Reminder sent to ${contact.email || contact.name}`)}
        />
      );
      return { role: "assistant", content: `Here's a payment reminder draft for **${contact.name}**.`, actionCard: card };
    }

    return null;
  }, [tasks, deals, createTask, updateTask, removeTask, createBlock]);

  // ── Main send handler ─────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!consumeSparks(1, "Aura AI message")) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      // First try agentic path
      const agentResponse = await handleAgentAction(text);
      if (agentResponse) {
        setMessages(prev => [...prev, agentResponse]);
        setLoading(false);
        return;
      }

      // Fallback: streaming AI
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "aura",
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          context: workspaceContext(),
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuf = "";
      let assembled = "";
      let streamDone = false;

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuf.indexOf("\n")) !== -1) {
          let line = textBuf.slice(0, nl);
          textBuf = textBuf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assembled += delta;
              const snap = assembled;
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: snap };
                return copy;
              });
            }
          } catch { /* partial chunk */ }
        }
      }

      if (!assembled) {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant" && !last.content) copy[copy.length - 1] = { ...last, content: "Done ✓" };
          return copy;
        });
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message || "Something went wrong."}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, workspaceContext, consumeSparks, handleAgentAction]);

  const handleInsertIntoDocument = useCallback(async (msgIdx: number, content: string) => {
    if (!pendingDocumentId) { toast.error("No document is currently open."); return; }
    const { data: doc } = await supabase.from("documents").select("content, title").eq("id", pendingDocumentId).maybeSingle();
    if (!doc) { toast.error("Document not found."); return; }
    const existingContent = (doc.content as any) || {};
    const existing = typeof existingContent.text === "string" ? existingContent.text : "";
    const newText = existing ? `${existing}\n\n${content}` : content;
    await supabase.from("documents").update({ content: { ...existingContent, text: newText }, updated_at: new Date().toISOString() }).eq("id", pendingDocumentId);
    setInsertedIdx(msgIdx);
    toast.success("Inserted into document ✓");
    setTimeout(() => setInsertedIdx(null), 2500);
  }, [pendingDocumentId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const hasOpenDoc = !!pendingDocumentId;

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-5 z-[9980] w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl md:bottom-8 md:right-6"
            style={{
              background: "linear-gradient(135deg, hsl(var(--aurora-violet)), hsl(var(--aurora-blue)))",
              boxShadow: "0 8px 24px hsl(var(--aurora-violet)/0.4)",
            }}
            aria-label="Ask Aura (⌘⇧A)"
            title="Ask Aura (⌘⇧A)"
          >
            <Sparkles size={20} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9979] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed bottom-0 right-0 z-[9980] w-full md:bottom-6 md:right-6 md:w-[420px] flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              <div
                className="flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl border border-border/30"
                style={{ background: "hsl(var(--card)/0.95)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", maxHeight: "88vh" }}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/20 shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)/0.12), hsl(var(--aurora-blue)/0.08))" }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)), hsl(var(--aurora-blue)))" }}>
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Ask Aura</p>
                    <p className="text-[11px] text-muted-foreground">
                      {hasOpenDoc ? "Document open — replies can be inserted ↓" : "Agentic AI · Creates tasks, events & more"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-400/80 shrink-0">
                    <Zap size={10} /><span>{sparksBalance} ✨</span>
                  </div>
                  <button onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Minimise">
                    <ChevronDown size={16} />
                  </button>
                  <button onClick={() => { setMessages([]); setOpen(false); }}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Clear and close">
                    <X size={14} />
                  </button>
                </div>

                {hasOpenDoc && (
                  <div className="px-4 py-1.5 border-b border-border/10 flex items-center gap-2"
                    style={{ background: "hsl(var(--aurora-blue)/0.06)" }}>
                    <FileText size={11} className="text-primary/60 shrink-0" />
                    <span className="text-[11px] text-primary/70">Document open — use "Insert into document" on any reply</span>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)/0.15), hsl(var(--aurora-blue)/0.1))" }}>
                        <Sparkles size={22} className="text-primary/60" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Hi, I'm Aura ✨</p>
                        <p className="text-xs text-muted-foreground">I can create tasks, schedule events, check invoices, and more.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {["Add task: finish report", "Schedule meeting tomorrow 14:00", "Who owes me money?", "What are my priorities today?"].map(s => (
                          <button key={s}
                            onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className="px-3 py-1.5 rounded-xl text-xs bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border/30">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "text-primary-foreground rounded-br-sm"
                            : "text-foreground rounded-bl-sm border border-border/20"
                        }`}
                        style={msg.role === "user"
                          ? { background: "linear-gradient(135deg, hsl(var(--aurora-violet)), hsl(var(--aurora-blue)))" }
                          : { background: "hsl(var(--secondary)/0.5)" }
                        }
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : msg.content}
                      </div>

                      {/* Action card rendered below the message bubble */}
                      {msg.role === "assistant" && msg.actionCard && (
                        <div className="mt-2 w-full max-w-[90%]">
                          {msg.actionCard}
                        </div>
                      )}

                      {msg.role === "assistant" && msg.content && hasOpenDoc && (
                        <motion.button
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleInsertIntoDocument(i, msg.content)}
                          className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                            insertedIdx === i
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                              : "border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          {insertedIdx === i ? <><Check size={11} /> Inserted</> : <><FileText size={11} /> Insert into document</>}
                        </motion.button>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-border/20"
                        style={{ background: "hsl(var(--secondary)/0.5)" }}>
                        <Loader2 size={13} className="animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Thinking…</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border/20 shrink-0">
                  <div className="flex items-end gap-2 px-3 py-2 rounded-xl border border-border/30"
                    style={{ background: "hsl(var(--secondary)/0.4)" }}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKey}
                      placeholder="Add task, schedule meeting, check invoices…"
                      rows={1}
                      className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                      style={{ minHeight: "24px", maxHeight: "120px" }}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || loading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40 text-white text-[11px] font-semibold"
                      style={{ background: input.trim() ? "linear-gradient(135deg, hsl(var(--aurora-violet)), hsl(var(--aurora-blue)))" : "hsl(var(--secondary))" }}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">1 ✨ per message</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AskAura;
