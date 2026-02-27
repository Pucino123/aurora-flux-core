import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff } from "lucide-react";
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

const TIPS = [
  "Hi, my name is Aura...",
  "I am Aura, your personal assistant.",
  "You can click me to ask anything...",
  "Need help organizing your day?",
  "Click here to add a task...",
  "I can help you plan your schedule",
];

// --- Helpers ---

function gatherContext(focusStore: any, flux: any): string {
  const parts: string[] = [];
  if (focusStore.focusStickyNotes?.length) {
    const notes = focusStore.focusStickyNotes.map((n: any) => n.text).filter(Boolean);
    if (notes.length) parts.push(`Sticky notes: ${notes.join("; ")}`);
  }
  if (focusStore.goalText) parts.push(`Current goal: ${focusStore.goalText}`);
  if (focusStore.brainDumpTasks?.length) {
    parts.push(`Brain dump: ${focusStore.brainDumpTasks.map((t: any) => t.text).join(", ")}`);
  }
  if (focusStore.activeWidgets?.length) {
    parts.push(`Active widgets: ${focusStore.activeWidgets.join(", ")}`);
  }
  const today = new Date().toISOString().split("T")[0];
  const todayBlocks = flux.scheduleBlocks?.filter((b: any) => b.scheduled_date === today) || [];
  if (todayBlocks.length) {
    parts.push(`Today's schedule: ${todayBlocks.map((b: any) => `${b.time} - ${b.title} (${b.duration})`).join("; ")}`);
  }
  const pendingTasks = flux.tasks?.filter((t: any) => !t.done)?.slice(0, 10) || [];
  if (pendingTasks.length) {
    parts.push(`Pending tasks: ${pendingTasks.map((t: any) => t.title).join(", ")}`);
  }
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
              try { onToolCall(tc.function.name, JSON.parse(tc.function.arguments)); } catch {}
            }
          }
        }
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

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

// --- Pill states ---
type PillMode = "idle" | "hint" | "input" | "processing" | "response";

// --- Main Widget ---
const AuraWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [auraState, setAuraState] = useState<AuraState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [pillMode, setPillMode] = useState<PillMode>("idle");
  const [currentTip, setCurrentTip] = useState("");
  const [responseText, setResponseText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const focusStore = useFocusStore();
  const flux = useFlux();

  // --- Intermittent random hints ---
  useEffect(() => {
    if (pillMode !== "idle") return;

    const scheduleHint = () => {
      // Random interval: 6-15 seconds of silence, then show a hint for 4s
      const silenceDuration = 6000 + Math.random() * 9000;
      hintTimerRef.current = setTimeout(() => {
        if (pillMode !== "idle") return;
        const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
        setCurrentTip(tip);
        setPillMode("hint");
        // Hide hint after 4 seconds
        hintTimerRef.current = setTimeout(() => {
          setPillMode((prev) => prev === "hint" ? "idle" : prev);
          setCurrentTip("");
          scheduleHint();
        }, 4000);
      }, silenceDuration);
    };

    // Initial hint after a short delay
    hintTimerRef.current = setTimeout(() => {
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      setCurrentTip(tip);
      setPillMode("hint");
      hintTimerRef.current = setTimeout(() => {
        setPillMode((prev) => prev === "hint" ? "idle" : prev);
        setCurrentTip("");
        scheduleHint();
      }, 4000);
    }, 2000);

    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, [pillMode === "idle"]);

  // Click outside to revert
  useEffect(() => {
    if (pillMode === "idle" || pillMode === "hint") return;
    const handler = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        if (pillMode === "input" && !input.trim()) {
          revertToIdle();
        } else if (pillMode === "response") {
          revertToIdle();
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pillMode, input]);

  // Auto-revert after response displayed
  useEffect(() => {
    if (pillMode === "response" && responseText) {
      responseTimerRef.current = setTimeout(() => {
        revertToIdle();
      }, 8000);
      return () => { if (responseTimerRef.current) clearTimeout(responseTimerRef.current); };
    }
  }, [pillMode, responseText]);

  // Focus input when entering input mode
  useEffect(() => {
    if (pillMode === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [pillMode]);

  const revertToIdle = useCallback(() => {
    setPillMode("idle");
    setInput("");
    setResponseText("");
    setAuraState("idle");
  }, []);

  const wake = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setPillMode("input");
    setCurrentTip("");
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
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setPillMode("processing");
    setAuraState("processing");
    setResponseText("");

    let assistantText = "";
    const context = gatherContext(focusStore, flux);

    try {
      await streamAura(
        newMessages,
        context,
        (chunk) => {
          assistantText += chunk;
          setAuraState("speaking");
          setPillMode("response");
          setResponseText(assistantText);
        },
        handleToolCall,
        () => {
          setIsLoading(false);
          setMessages((prev) => {
            if (assistantText) {
              return [...prev, { role: "assistant", content: assistantText }];
            }
            return prev;
          });
        },
      );
    } catch {
      setIsLoading(false);
      setPillMode("idle");
      setAuraState("idle");
      toast.error("Failed to reach Aura");
    }
  }, [messages, isLoading, focusStore, flux, handleToolCall]);

  const { listening, toggle: toggleVoice } = useVoiceInput((text) => {
    setInput(text);
    send(text);
  });

  useEffect(() => {
    if (listening) setAuraState("listening");
    else if (!isLoading && pillMode !== "processing" && pillMode !== "response") setAuraState("idle");
  }, [listening, isLoading, pillMode]);

  const defaultPos = {
    x: Math.round(window.innerWidth * 0.62),
    y: Math.round(window.innerHeight * 0.08),
  };

  const orbSize = 110;
  const showPill = pillMode !== "idle";

  return (
    <DraggableWidget
      id="aura"
      title=""
      defaultPosition={defaultPos}
      defaultSize={{ w: 300, h: 260 }}
      className="aura-widget"
      hideHeader
      autoHeight
      containerStyle={{ background: "transparent", border: "none", boxShadow: "none" }}
    >
      <div ref={widgetRef} className="flex flex-col items-center" style={{ minHeight: 180 }}>
        {/* Orb — always visible */}
        <div className="flex items-center justify-center pt-2 pb-1" onClick={wake}>
          <AuraOrb state={auraState} size={orbSize} onClick={wake} />
        </div>

        {/* Dynamic Pill — morphs between hint, input, processing, response */}
        <div className="relative w-full flex justify-center mt-2" style={{ minHeight: 36 }}>
          <AnimatePresence mode="wait">
            {/* Hint pill — intermittent tips */}
            {pillMode === "hint" && (
              <motion.div
                key="hint-pill"
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -4 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute cursor-pointer"
                onClick={wake}
              >
                <div
                  className="rounded-full px-5 py-2 border border-white/[0.1]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                  }}
                >
                  <p className="text-[11px] text-white/50 text-center whitespace-nowrap select-none">
                    {currentTip}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Input pill — text field */}
            {pillMode === "input" && (
              <motion.div
                key="input-pill"
                initial={{ opacity: 0, scale: 0.85, width: 160 }}
                animate={{ opacity: 1, scale: 1, width: 260 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute"
              >
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 border border-white/[0.1]"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                  }}
                >
                  <button
                    onClick={toggleVoice}
                    className={`p-1 rounded-full transition-all shrink-0 ${
                      listening
                        ? "bg-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                        : "text-white/40 hover:text-white/70"
                    }`}
                    title={listening ? "Stop listening" : "Voice input"}
                  >
                    {listening ? <MicOff size={13} /> : <Mic size={13} />}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(input)}
                    placeholder="Ask Aura anything..."
                    className="flex-1 bg-transparent text-xs text-white/90 placeholder:text-white/30 outline-none min-w-0"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={isLoading || !input.trim()}
                    className="p-1 rounded-full text-white/40 hover:text-white/70 disabled:opacity-30 transition-all shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Processing pill — loading dots */}
            {pillMode === "processing" && (
              <motion.div
                key="processing-pill"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute"
              >
                <div
                  className="rounded-full px-6 py-2.5 border border-white/[0.1] flex items-center gap-1.5"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/40"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Response pill — AI answer displayed inline, auto-resizing */}
            {pillMode === "response" && responseText && (
              <motion.div
                key="response-pill"
                initial={{ opacity: 0, scale: 0.9, maxHeight: 40 }}
                animate={{ opacity: 1, scale: 1, maxHeight: 300 }}
                exit={{ opacity: 0, scale: 0.9, maxHeight: 40 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute w-full px-2"
                onClick={() => {
                  if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
                  revertToIdle();
                }}
              >
                <div
                  className="rounded-2xl px-4 py-3 border border-white/[0.1] max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                  }}
                >
                  <div className="prose prose-invert prose-xs max-w-none [&>*]:my-0.5 [&_p]:text-[11px] [&_p]:leading-relaxed [&_li]:text-[11px] [&_p]:text-white/70">
                    <ReactMarkdown>{responseText}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default AuraWidget;
