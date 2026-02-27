import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import DraggableWidget from "./DraggableWidget";
import AuraOrb, { type AuraState } from "./AuraOrb";
import { useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function gatherContext(focusStore: any, flux: any): string {
  const parts: string[] = [];

  // Sticky notes
  if (focusStore.focusStickyNotes?.length) {
    const notes = focusStore.focusStickyNotes.map((n: any) => n.text).filter(Boolean);
    if (notes.length) parts.push(`Sticky notes: ${notes.join("; ")}`);
  }

  // Goal
  if (focusStore.goalText) parts.push(`Current goal: ${focusStore.goalText}`);

  // Brain dump tasks
  if (focusStore.brainDumpTasks?.length) {
    parts.push(`Brain dump: ${focusStore.brainDumpTasks.map((t: any) => t.text).join(", ")}`);
  }

  // Active widgets
  if (focusStore.activeWidgets?.length) {
    parts.push(`Active widgets: ${focusStore.activeWidgets.join(", ")}`);
  }

  // Today's schedule blocks
  const today = new Date().toISOString().split("T")[0];
  const todayBlocks = flux.scheduleBlocks?.filter((b: any) => b.scheduled_date === today) || [];
  if (todayBlocks.length) {
    parts.push(`Today's schedule: ${todayBlocks.map((b: any) => `${b.time} - ${b.title} (${b.duration})`).join("; ")}`);
  }

  // Tasks
  const pendingTasks = flux.tasks?.filter((t: any) => !t.done)?.slice(0, 10) || [];
  if (pendingTasks.length) {
    parts.push(`Pending tasks: ${pendingTasks.map((t: any) => t.title).join(", ")}`);
  }

  // Goals
  if (flux.goals?.length) {
    parts.push(`Goals: ${flux.goals.map((g: any) => `${g.title} (${g.current_amount}/${g.target_amount})`).join(", ")}`);
  }

  return parts.join("\n");
}

async function streamAura(
  messages: ChatMessage[],
  context: string,
  onDelta: (text: string) => void,
  onToolCall: (name: string, args: any) => void,
  onDone: () => void,
) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/flux-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ type: "aura", messages, context }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    if (resp.status === 429) toast.error("Rate limit exceeded. Try again shortly.");
    else if (resp.status === 402) toast.error("AI credits exhausted.");
    else toast.error(err.error || "AI error");
    onDone();
    return;
  }

  if (!resp.body) { onDone(); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) onDelta(delta.content);
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name && tc.function?.arguments) {
              try {
                onToolCall(tc.function.name, JSON.parse(tc.function.arguments));
              } catch {}
            }
          }
        }
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  // Flush
  for (const raw of buf.split("\n")) {
    if (!raw.startsWith("data: ")) continue;
    const json = raw.slice(6).trim();
    if (json === "[DONE]") continue;
    try {
      const p = JSON.parse(json);
      if (p.choices?.[0]?.delta?.content) onDelta(p.choices[0].delta.content);
    } catch {}
  }

  onDone();
}

// Voice recognition hook
function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported in this browser"); return; }

    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) onResult(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, onResult]);

  return { listening, toggle };
}

const AuraWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [auraState, setAuraState] = useState<AuraState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const focusStore = useFocusStore();
  const flux = useFlux();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Handle tool calls from AI
  const handleToolCall = useCallback((name: string, args: any) => {
    if (name === "add_task") {
      const title = args.title || args.text || "New task";
      focusStore.setBrainDumpTasks([
        ...focusStore.brainDumpTasks,
        { id: `bd-${Date.now()}`, text: title },
      ]);
      toast.success(`Task added: ${title}`);
    } else if (name === "add_to_plan") {
      const today = new Date().toISOString().split("T")[0];
      flux.createBlock({
        title: args.title || "New block",
        time: args.time || "09:00",
        duration: args.duration || "30m",
        type: args.type || "custom",
        scheduled_date: args.date || today,
      });
      toast.success(`Added to plan: ${args.title}`);
    } else if (name === "clear_schedule") {
      const date = args.date || new Date().toISOString().split("T")[0];
      const blocks = flux.scheduleBlocks.filter((b) => b.scheduled_date === date);
      blocks.forEach((b) => flux.removeBlock(b.id));
      toast.success(`Cleared ${blocks.length} blocks for ${date}`);
    }
  }, [focusStore, flux]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setAuraState("processing");
    scrollToBottom();

    let assistantText = "";
    const context = gatherContext(focusStore, flux);

    const upsert = (chunk: string) => {
      assistantText += chunk;
      setAuraState("speaking");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
      scrollToBottom();
    };

    try {
      await streamAura(
        [...messages, userMsg],
        context,
        upsert,
        handleToolCall,
        () => {
          setIsLoading(false);
          setAuraState("idle");
        },
      );
    } catch {
      setIsLoading(false);
      setAuraState("idle");
      toast.error("Failed to reach Aura");
    }
  }, [messages, isLoading, focusStore, flux, scrollToBottom, handleToolCall]);

  const { listening, toggle: toggleVoice } = useVoiceInput((text) => {
    setInput(text);
    send(text);
  });

  useEffect(() => {
    if (listening) setAuraState("listening");
    else if (!isLoading) setAuraState("idle");
  }, [listening, isLoading]);

  const defaultPos = {
    x: Math.round(window.innerWidth * 0.62),
    y: Math.round(window.innerHeight * 0.08),
  };

  return (
    <DraggableWidget
      id="aura"
      title="Aura"
      defaultPosition={defaultPos}
      defaultSize={{ w: 380, h: 500 }}
      hideHeader
      className="aura-widget"
    >
      <div className="flex flex-col h-full">
        {/* Orb area */}
        <div className="flex items-center justify-center pt-4 pb-2 shrink-0">
          <AuraOrb state={auraState} size={messages.length > 0 ? 80 : 120} />
        </div>

        {/* Title when no messages */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center px-4 pb-2"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles size={14} className="text-purple-400" />
              <span className="text-sm font-semibold text-white/80">Aura</span>
            </div>
            <p className="text-[11px] text-white/40">Your AI assistant. I can see your dashboard.</p>
          </motion.div>
        )}

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-3 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "text-white/90 bg-white/10 rounded-2xl rounded-br-md px-3 py-2 ml-8"
                    : "text-white/75 px-1 py-1"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-xs max-w-none [&>*]:my-1 [&_p]:text-xs [&_li]:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 p-2.5">
          <div className="flex items-center gap-1.5 bg-white/8 rounded-full px-3 py-1.5 border border-white/10">
            <button
              onClick={toggleVoice}
              className={`p-1.5 rounded-full transition-all ${
                listening
                  ? "bg-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                  : "text-white/40 hover:text-white/70"
              }`}
              title={listening ? "Stop listening" : "Voice input"}
            >
              {listening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask Aura anything..."
              className="flex-1 bg-transparent text-xs text-white/90 placeholder:text-white/30 outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={isLoading || !input.trim()}
              className="p-1.5 rounded-full text-white/40 hover:text-white/70 disabled:opacity-30 transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default AuraWidget;
