import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import DraggableWidget from "./DraggableWidget";
import AuraOrb, { type AuraState } from "./AuraOrb";
import { useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const TIPS = [
  "Hi, I'm Aura...",
  "Did you know I can see your screen?",
  "Press ⌘/Ctrl to talk to me",
  "I can help you plan your schedule",
  "Ask me to add or remove tasks",
  "I can book meetings for you",
  "Need feedback on your progress?",
  "Press ⌘/Ctrl again to send",
];

function gatherContext(focusStore: any, flux: any): string {
  const parts: string[] = [];

  // Current date — critical for scheduling relative dates like "tomorrow"
  parts.push(`Today: ${new Date().toLocaleDateString("en-CA")} (${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })})`);

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
  const pendingTasks = flux.tasks?.filter((t: any) => !t.done)?.slice(0, 15) || [];
  if (pendingTasks.length) {
    parts.push(`Pending tasks (with IDs): ${pendingTasks.map((t: any) => `[${t.id}] "${t.title}" (priority: ${t.priority || 'medium'}, status: ${t.status}${t.due_date ? `, due: ${t.due_date}` : ""}${t.folder_id ? `, folder: ${t.folder_id}` : ""})`).join("; ")}`);
  }
  const doneTasks = flux.tasks?.filter((t: any) => t.done)?.slice(0, 5) || [];
  if (doneTasks.length) {
    parts.push(`Recently completed: ${doneTasks.map((t: any) => t.title).join(", ")}`);
  }
  if (flux.goals?.length) {
    parts.push(`Goals: ${flux.goals.map((g: any) => `${g.title} (${g.current_amount}/${g.target_amount}${g.deadline ? `, deadline: ${g.deadline}` : ""})`).join(", ")}`);
  }
  // Folders — so Aura can assign tasks to the right folder
  if (flux.folders?.length) {
    parts.push(`Available folders: ${flux.folders.map((f: any) => `[${f.id}] "${f.title}" (type: ${f.type})`).join("; ")}`);
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
  // Accumulate tool call arguments across multiple chunks
  const toolCallAccum: Record<number, { name: string; args: string }> = {};

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
            const tcIdx = tc.index ?? 0;
            if (!toolCallAccum[tcIdx]) {
              toolCallAccum[tcIdx] = { name: tc.function?.name || "", args: "" };
            }
            if (tc.function?.name) toolCallAccum[tcIdx].name = tc.function.name;
            if (tc.function?.arguments) toolCallAccum[tcIdx].args += tc.function.arguments;
          }
        }
        // Check finish_reason for tool_calls
        if (parsed.choices?.[0]?.finish_reason === "tool_calls" || parsed.choices?.[0]?.finish_reason === "stop") {
          for (const key of Object.keys(toolCallAccum)) {
            const tc = toolCallAccum[Number(key)];
            if (tc.name && tc.args) {
              try { onToolCall(tc.name, JSON.parse(tc.args)); } catch {}
            }
          }
        }
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  // Final flush - process any remaining tool calls
  for (const key of Object.keys(toolCallAccum)) {
    const tc = toolCallAccum[Number(key)];
    if (tc.name && tc.args) {
      try { onToolCall(tc.name, JSON.parse(tc.args)); } catch {}
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

function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const levelRafRef = useRef<number>(0);

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(levelRafRef.current);
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setAudioLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.onend = null;
      try { recRef.current.stop(); } catch {}
      recRef.current = null;
    }
    stopAnalyser();
    setListening(false);
  }, [stopAnalyser]);

  // Start real-time amplitude tracking via Web Audio API
  const startAnalyser = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        // Use full spectrum RMS for better sensitivity
        let sumSq = 0;
        for (let i = 1; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        setAudioLevel(Math.min(rms / 30, 1)); // 30 = loud talking ≈ 1.0
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    }).catch(() => {
      // Graceful fallback — orb still animates but without mic data
    });
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported"); return; }
    stop();
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      if (last?.isFinal) {
        const text = last[0]?.transcript;
        if (text?.trim()) onResult(text.trim());
      }
    };
    rec.onerror = (e: any) => {
      if (e.error !== "no-speech") stop();
    };
    rec.onend = () => {
      if (recRef.current === rec) {
        try { rec.start(); } catch { stop(); }
      }
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    // Start amplitude analyser in parallel — independent of SpeechRecognition
    startAnalyser();
  }, [onResult, stop, startAnalyser]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, toggle, stop, start, audioLevel };
}




type PillMode = "idle" | "hint" | "input" | "processing" | "response";

const AuraWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [auraState, setAuraState] = useState<AuraState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [pillMode, setPillMode] = useState<PillMode>("idle");
  const [currentTip, setCurrentTip] = useState("");
  const [responseText, setResponseText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const historyEndRef = useRef<HTMLDivElement>(null);
  const focusStore = useFocusStore();
  const flux = useFlux();
  const { user } = useAuth();

  // No forced opacity override — let the style editor control it like all other widgets

  // --- Intermittent random hints ---
  useEffect(() => {
    if (pillMode !== "idle") return;
    const scheduleHint = () => {
      const silence = 10000 + Math.random() * 15000;
      hintTimerRef.current = setTimeout(() => {
        if (pillMode !== "idle") return;
        setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
        setPillMode("hint");
        hintTimerRef.current = setTimeout(() => {
          setPillMode((prev) => prev === "hint" ? "idle" : prev);
          setCurrentTip("");
          scheduleHint();
        }, 4000);
      }, silence);
    };
    hintTimerRef.current = setTimeout(() => {
      setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
      setPillMode("hint");
      hintTimerRef.current = setTimeout(() => {
        setPillMode((prev) => prev === "hint" ? "idle" : prev);
        setCurrentTip("");
        scheduleHint();
      }, 4000);
    }, 3000);
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, [pillMode === "idle"]);

  useEffect(() => {
    if (pillMode === "idle" || pillMode === "hint") return;
    const handler = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        if (pillMode === "input" && !input.trim() && messages.length === 0) {
          revertToIdle();
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pillMode, input, messages.length]);

  useEffect(() => {
    if (showHistory) {
      setTimeout(() => historyEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [showHistory, messages.length, responseText]);

  useEffect(() => {
    if (pillMode === "input") setTimeout(() => inputRef.current?.focus(), 100);
  }, [pillMode]);

  useEffect(() => {
    if (messages.length > 0 || responseText) setShowHistory(true);
  }, [messages.length, responseText]);

  const revertToIdle = useCallback(() => {
    setPillMode("idle");
    setInput("");
    setResponseText("");
    setAuraState("idle");
    setShowHistory(false);
    setMessages([]);
    stopVoice();
  }, []);

  const wake = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setPillMode("input");
    setCurrentTip("");
  }, []);



  const handleToolCall = useCallback((name: string, args: any) => {
    if (name === "add_task") {
      const title = args.title || args.text || "New task";
      flux.createTask({ title, priority: args.priority || "medium", folder_id: args.folder_id || null });
      toast.success(`Task added: ${title}`);
    } else if (name === "remove_task") {
      const taskId = args.task_id;
      if (taskId) {
        flux.removeTask(taskId);
        toast.success("Task removed");
      }
    } else if (name === "complete_task") {
      const taskId = args.task_id;
      if (taskId) {
        flux.updateTask(taskId, { done: true, status: "done" });
        toast.success("Task completed ✓");
      }
    } else if (name === "update_task") {
      const taskId = args.task_id;
      if (taskId) {
        const updates: any = {};
        if (args.title) updates.title = args.title;
        if (args.priority) updates.priority = args.priority;
        if (args.due_date) updates.due_date = args.due_date;
        flux.updateTask(taskId, updates);
        toast.success("Task updated");
      }
    } else if (name === "add_to_plan" || name === "book_meeting") {
      const today = new Date().toISOString().split("T")[0];
      flux.createBlock({
        title: args.title || "Meeting",
        time: args.time || "09:00",
        duration: args.duration || "30m",
        type: name === "book_meeting" ? "meeting" : (args.type || "custom"),
        scheduled_date: args.date || today,
      });
      toast.success(`${name === "book_meeting" ? "Meeting booked" : "Added to plan"}: ${args.title}`);
    } else if (name === "clear_schedule") {
      const date = args.date || new Date().toISOString().split("T")[0];
      const blocks = flux.scheduleBlocks.filter((b) => b.scheduled_date === date);
      blocks.forEach((b) => flux.removeBlock(b.id));
      toast.success(`Cleared ${blocks.length} blocks for ${date}`);
    } else if (name === "create_note") {
      if (user) {
        (supabase as any).from("documents").insert({
          user_id: user.id,
          title: args.title || "Note",
          type: "text",
          folder_id: args.folder_id || null,
          content: args.content ? { html: `<p>${args.content}</p>` } : { html: "" },
        }).then(({ error }: { error: any }) => {
          if (error) toast.error("Failed to create note");
          else toast.success(`Note created: ${args.title}`);
        });
      } else {
        toast.error("Sign in to create notes");
      }
    }
  }, [flux, user]);

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
          if (assistantText) {
            setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
            setResponseText("");
          }
          setPillMode("input");
          setAuraState("idle");
          setTimeout(() => inputRef.current?.focus(), 100);
        },
      );
    } catch {
      setIsLoading(false);
      setPillMode("input");
      setAuraState("idle");
      toast.error("Failed to reach Aura");
    }
  }, [messages, isLoading, focusStore, flux, handleToolCall]);

  const { listening, toggle: toggleVoice, stop: stopVoice, start: startVoice, audioLevel } = useVoiceInput((text) => {
    send(text);
  });

  // Global Cmd/Ctrl shortcut for voice (Meta = ⌘ on Mac, Control on Windows)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Meta" && e.key !== "Control") return;
      // Don't intercept if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable = tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      e.preventDefault();
      if (listening) {
        stopVoice();
      } else {
        if (pillMode === "idle" || pillMode === "hint") wake();
        startVoice();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [listening, pillMode, wake, startVoice, stopVoice]);

  useEffect(() => {
    if (listening) setAuraState("listening");
    else if (!isLoading && pillMode !== "processing" && pillMode !== "response") setAuraState("idle");
  }, [listening, isLoading, pillMode]);

  const defaultPos = {
    x: Math.round(window.innerWidth * 0.62),
    y: Math.round(window.innerHeight * 0.08),
  };

  const orbSize = 110;

  return (
    <DraggableWidget
      id="aura"
      title="Aura"
      defaultPosition={defaultPos}
      defaultSize={{ w: 320, h: 300 }}
      className="aura-widget"
      autoHeight
    >
      <div ref={widgetRef} className="flex flex-col items-center relative" style={{ minHeight: 160 }}>
        {/* Orb */}
        <div className="flex items-center justify-center pt-2 pb-1" onClick={wake}>
          <AuraOrb state={auraState} size={orbSize} onClick={wake} audioLevel={audioLevel} />
        </div>

        {/* Dynamic Pill */}
        <div className="relative w-full flex justify-center mt-2" style={{ minHeight: 36 }}>
          <AnimatePresence mode="wait">
            {pillMode === "hint" && (
              <motion.div
                key="hint-pill"
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -4 }}
                transition={{ duration: 0.4 }}
                className="absolute cursor-pointer"
                onClick={wake}
              >
                <div className="rounded-full px-5 py-2 border border-white/[0.08]" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
                  <p className="text-[11px] text-white/50 text-center whitespace-nowrap select-none">{currentTip}</p>
                </div>
              </motion.div>
            )}

            {(pillMode === "input" || pillMode === "processing" || pillMode === "response") && (
              <motion.div
                key="active-pill"
                initial={{ opacity: 0, scale: 0.85, width: 160 }}
                animate={{ opacity: 1, scale: 1, width: 300 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="absolute"
              >
                {pillMode === "processing" ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 border border-white/[0.08]" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                ) : pillMode === "response" && responseText ? (
                  <div className="relative rounded-2xl px-4 py-3 border border-white/[0.08] max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
                    <div className="prose prose-invert prose-sm max-w-none [&>*]:my-0.5 [&_p]:text-[12px] [&_p]:leading-relaxed [&_li]:text-[12px] [&_p]:text-white/70">
                      <ReactMarkdown>{responseText}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-2 border border-white/[0.08] relative" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" }}>
                    <button
                      onClick={toggleVoice}
                      className={`p-1 rounded-full transition-all shrink-0 ${listening ? "bg-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "text-white/40 hover:text-white/70"}`}
                      title={listening ? "Stop listening (Alt)" : "Start voice (Alt)"}
                    >
                      {listening ? <MicOff size={13} /> : <Mic size={13} />}
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && send(input)}
                      placeholder={listening ? "Listening..." : "Ask Aura anything..."}
                      className="flex-1 bg-transparent text-xs text-white/90 placeholder:text-white/30 outline-none min-w-0"
                    />
                    {messages.length > 0 ? (
                      <button
                        onClick={revertToIdle}
                        className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-white/10 transition-all shrink-0"
                        title="End conversation"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => send(input)}
                        disabled={isLoading || !input.trim()}
                        className="p-1 rounded-full text-white/40 hover:text-white/70 disabled:opacity-30 transition-all shrink-0"
                      >
                        <Send size={13} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat history box — NO close button here, only in pill */}
        <AnimatePresence>
          {showHistory && messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full overflow-hidden"
            >
              <div
                className="rounded-2xl border border-white/[0.08] max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
              >
                <div className="px-3 py-3 space-y-2.5">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`text-[12px] leading-relaxed ${
                        msg.role === "user"
                          ? "text-white/80 bg-white/[0.08] rounded-2xl rounded-br-md px-3 py-2 ml-6"
                          : "text-white/60 px-1"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none [&>*]:my-0.5 [&_p]:text-[12px] [&_p]:leading-relaxed [&_li]:text-[12px] [&_p]:text-white/60">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  ))}
                  <div ref={historyEndRef} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DraggableWidget>
  );
};

export default AuraWidget;
