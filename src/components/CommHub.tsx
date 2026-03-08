/**
 * CommHub — Unified Communication Hub
 * Merges TeamChatWidget + AskAura into a single floating panel with tabs.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Send, Loader2, MessageSquare } from "lucide-react";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import AuraOrb from "@/components/focus/AuraOrb";

type Tab = "aura" | "team";

interface AuraMsg { role: "user" | "assistant"; content: string }
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flux-ai`;

// ── Aura tab ────────────────────────────────────────────────────────────────
const AuraTab = () => {
  const [messages, setMessages] = useState<AuraMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { tasks, goals, folders } = useFlux();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ctx = useCallback(() => {
    const pending = tasks.filter(t => !t.done).slice(0, 8);
    return [
      pending.length ? `Pending tasks: ${pending.map(t => `"${t.title}"`).join(", ")}.` : "",
      goals.filter(g => g.pinned).length ? `Goals: ${goals.filter(g => g.pinned).map(g => g.title).join(", ")}.` : "",
      folders.length ? `Projects: ${folders.slice(0, 6).map(f => f.title).join(", ")}.` : "",
    ].filter(Boolean).join(" ");
  }, [tasks, goals, folders]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs: AuraMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const sysPrompt = `You are Aura, a premium AI assistant for the Dashiii productivity platform. ${ctx()} Be concise, insightful, and direct.`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "chat",
          systemPrompt: sysPrompt,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await resp.json();
      const reply = data?.choices?.[0]?.message?.content || data?.content || "I'm here — how can I help?";
      setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, ctx]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <AuraOrb state="idle" size={52} />
            <p className="text-sm font-semibold text-foreground">Ask Aura anything</p>
            <p className="text-xs text-muted-foreground">Your AI assistant knows your tasks, goals & projects.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-secondary text-foreground rounded-bl-sm border border-border/40"
            }`}>
              {m.role === "assistant"
                ? <ReactMarkdown>{m.content}</ReactMarkdown>
                : m.content
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary border border-border/40 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
              <div className="w-1 h-1 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1 h-1 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1 h-1 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Aura… (↵ send)"
            rows={1}
            className="flex-1 resize-none bg-secondary/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-1 focus:ring-emerald-500/30 transition-all max-h-24 overflow-y-auto"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-white text-[11px] font-semibold disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet,270 70% 55%)), hsl(var(--aurora-blue,220 80% 55%)))" }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <><Send size={11} /><span>−1 ✨</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Team tab ─────────────────────────────────────────────────────────────────
const TeamTab = () => {
  const [open, setOpen] = useState(true);
  // Re-use the CollabMessagesModal inline by importing it
  const { hasTeams } = useTeamChat();
  if (!hasTeams) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-6 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
          <Users size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">No teams yet</p>
        <p className="text-xs text-muted-foreground">Create or join a team to start collaborating.</p>
      </div>
    );
  }
  // Render CollabMessagesModal content inline
  return <TeamChatInline />;
};

// Inline compact team chat
const TeamChatInline = () => {
  const { messages, sendMessage, teams, activeTeamId, setActiveTeamId, loading } = useTeamChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Team selector */}
      {teams.length > 1 && (
        <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap border-b border-border/30">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTeamId(t.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                activeTeamId === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading && <p className="text-xs text-muted-foreground text-center">Loading…</p>}
        {messages.slice(-40).map(m => (
          <div key={m.id} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0 mt-0.5">
              {(m.sender_name || m.user_id)?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">{m.sender_name || m.user_id.slice(0, 8)}</p>
              <div className="bg-secondary text-foreground text-xs px-2.5 py-1.5 rounded-2xl rounded-tl-sm max-w-[180px] break-words">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div className="p-3 border-t border-border/30 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Message team…"
          className="flex-1 bg-secondary/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};

// ── Main CommHub ─────────────────────────────────────────────────────────────
const CommHub = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("aura");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Listen for global toggle-aura event
  useEffect(() => {
    const h = () => { setOpen(p => !p); setTab("aura"); };
    window.addEventListener("toggle-aura", h);
    return () => window.removeEventListener("toggle-aura", h);
  }, []);

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="w-80 md:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              height: 500,
              background: "hsl(var(--card)/0.92)",
              border: "1px solid hsl(var(--border)/0.5)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
              {/* Pill tabs */}
              <div className="flex gap-1 bg-secondary/60 rounded-xl p-0.5 relative">
                {(["aura", "team"] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === t && (
                      <motion.div
                        layoutId="commhub-tab-bg"
                        className="absolute inset-0 bg-card rounded-lg shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {t === "aura" ? <Sparkles size={12} /> : <Users size={12} />}
                      {t === "aura" ? "Aura AI" : "Team"}
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                <X size={13} />
              </button>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === "aura" ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === "aura" ? 12 : -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col flex-1 min-h-0"
              >
                {tab === "aura" ? <AuraTab /> : <TeamTab />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(p => !p)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-shadow"
        style={{
          background: open
            ? "hsl(var(--card)/0.95)"
            : "linear-gradient(135deg, hsl(var(--primary)), hsl(270 70% 55%))",
          border: "1.5px solid hsl(var(--border)/0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        {open
          ? <X size={20} className="text-foreground" />
          : <MessageSquare size={20} className="text-primary-foreground" />
        }
      </motion.button>
    </div>
  );
};

export default CommHub;
