import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flux-ai`;

const AskAura = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { tasks, goals, workouts, folders } = useFlux();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build workspace context summary for system prompt
  const workspaceContext = useCallback(() => {
    const pendingTasks = tasks.filter(t => !t.done).slice(0, 10);
    const recentWorkouts = workouts.slice(0, 5);
    const pinnedGoals = goals.filter(g => g.pinned);
    const topFolders = folders.slice(0, 8).map(f => f.title);
    return [
      `User has ${tasks.length} tasks total, ${pendingTasks.length} pending.`,
      pendingTasks.length ? `Pending: ${pendingTasks.map(t => `"${t.title}" (${t.priority})`).join(", ")}.` : "",
      pinnedGoals.length ? `Goals: ${pinnedGoals.map(g => `"${g.title}" ${g.current_amount}/${g.target_amount}`).join(", ")}.` : "",
      recentWorkouts.length ? `Recent workouts: ${recentWorkouts.map(w => w.activity).join(", ")}.` : "",
      topFolders.length ? `Projects/Folders: ${topFolders.join(", ")}.` : "",
    ].filter(Boolean).join(" ");
  }, [tasks, goals, workouts, folders]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: "aura",
          messages: nextMessages,
          context: workspaceContext(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || data.reply || "I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message || "Something went wrong."}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, workspaceContext]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <>
      {/* Floating trigger button */}
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
            aria-label="Ask Aura"
          >
            <Sparkles size={20} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile) */}
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
              className="fixed bottom-0 right-0 z-[9980] w-full md:bottom-6 md:right-6 md:w-[380px] flex flex-col"
              style={{ maxHeight: "85vh" }}
            >
              <div
                className="flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl border border-border/30"
                style={{
                  background: "hsl(var(--card)/0.95)",
                  backdropFilter: "blur(32px)",
                  WebkitBackdropFilter: "blur(32px)",
                  maxHeight: "85vh",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/20 shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)/0.12), hsl(var(--aurora-blue)/0.08))" }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)), hsl(var(--aurora-blue)))" }}
                  >
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Ask Aura</p>
                    <p className="text-[11px] text-muted-foreground">Your AI workspace assistant</p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => { setMessages([]); setOpen(false); }}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    title="Clear and close"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)/0.15), hsl(var(--aurora-blue)/0.1))" }}
                      >
                        <Sparkles size={22} className="text-primary/60" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Hi, I'm Aura ✨</p>
                        <p className="text-xs text-muted-foreground">Ask me anything about your workspace — tasks, goals, calendar, or get advice.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {["What are my top priorities?", "Summarise my week", "What goals need attention?"].map(s => (
                          <button
                            key={s}
                            onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className="px-3 py-1.5 rounded-xl text-xs bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border/30"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
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
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-border/20"
                        style={{ background: "hsl(var(--secondary)/0.5)" }}
                      >
                        <Loader2 size={13} className="animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Thinking…</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border/20 shrink-0">
                  <div
                    className="flex items-end gap-2 px-3 py-2 rounded-xl border border-border/30"
                    style={{ background: "hsl(var(--secondary)/0.4)" }}
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKey}
                      placeholder="Ask anything…"
                      rows={1}
                      className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                      style={{ minHeight: "24px", maxHeight: "120px" }}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || loading}
                      className="p-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)), hsl(var(--aurora-blue)))" }}
                    >
                      <Send size={13} className="text-white" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">⌘ Enter to send</p>
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
