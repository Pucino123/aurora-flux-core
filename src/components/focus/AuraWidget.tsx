import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Send, Mic, MicOff, X, Volume2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useTheme } from "next-themes";
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

/* ── Inline Code Block with copy button ── */
function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") || "";
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="relative group my-1.5 rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {lang && (
        <div className="flex items-center justify-between px-3 py-1 border-b border-white/[0.06]">
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">{lang}</span>
          <button onClick={copy} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-colors">
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="px-3 py-2 text-[11px] font-mono text-green-300/80 overflow-x-auto leading-relaxed whitespace-pre">
        <code>{children}</code>
      </pre>
      {!lang && (
        <button onClick={copy} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)" }}>
          {copied ? <Check size={9} /> : <Copy size={9} />}
        </button>
      )}
    </div>
  );
}

const TIPS = [
  "Hi, I'm Aura...",
  "Did you know I can see your screen?",
  "Press ⌘/Ctrl to talk to me",
  "I can help you plan your schedule",
  "Ask me to add or remove tasks",
  "I can book meetings for you",
  "Need feedback on your progress?",
  "Press ⌘/Ctrl again to send",
  "Say 'dark mode' to change theme",
  "I can open any view for you",
  "I remember your preferences",
];

// View name to route/key mapping for open_view tool
const VIEW_MAP: Record<string, string> = {
  focus: "focus",
  canvas: "canvas",
  calendar: "calendar",
  tasks: "tasks",
  analytics: "analytics",
  documents: "documents",
  projects: "projects",
  settings: "settings",
  council: "council",
};

function gatherContext(focusStore: any, flux: any, memories: Record<string, string>): string {
  const parts: string[] = [];

  // Current date — critical for scheduling relative dates like "tomorrow"
  parts.push(`Today: ${new Date().toLocaleDateString("en-CA")} (${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })})`);

  // Inject persistent memories
  if (Object.keys(memories).length > 0) {
    const memStr = Object.entries(memories).map(([k, v]) => `${k}=${v}`).join(", ");
    parts.push(`Your persistent memories about this user: ${memStr}`);
  }

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
  const audioLevelRef = useRef(0);
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
    audioLevelRef.current = 0;
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
        let sumSq = 0;
        for (let i = 1; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        audioLevelRef.current = Math.min(rms / 30, 1);
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    }).catch(() => {});
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
    startAnalyser();
  }, [onResult, stop, startAnalyser]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, toggle, stop, start, audioLevelRef };
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
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [injectedDocContext, setInjectedDocContext] = useState<string | null>(null);
  const [injectedDocId, setInjectedDocId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const historyEndRef = useRef<HTMLDivElement>(null);
  const focusStore = useFocusStore();
  const flux = useFlux();
  const { user } = useAuth();
  const { setTheme } = useTheme();

  // Load aura_memory on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("aura_memory" as any)
      .select("key, value")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          (data as any[]).forEach((row) => { map[row.key] = row.value; });
          setMemories(map);
        }
      });
  }, [user]);

  // Proactive meeting alert — check every 60 seconds
  useEffect(() => {
    const checkUpcoming = () => {
      if (pillMode !== "idle" && pillMode !== "hint") return;
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const todayBlocks = flux.scheduleBlocks?.filter((b: any) => b.scheduled_date === today) || [];
      for (const block of todayBlocks) {
        const [h, m] = block.time.split(":").map(Number);
        const blockDate = new Date(now);
        blockDate.setHours(h, m, 0, 0);
        const diffMs = blockDate.getTime() - now.getTime();
        const diffMin = diffMs / 60000;
        if (diffMin > 0 && diffMin <= 5) {
          const mins = Math.ceil(diffMin);
          setCurrentTip(`"${block.title}" starts in ${mins} min`);
          setPillMode("hint");
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
          hintTimerRef.current = setTimeout(() => {
            setPillMode((prev) => prev === "hint" ? "idle" : prev);
            setCurrentTip("");
          }, 8000);
          return;
        }
      }
    };
    const interval = setInterval(checkUpcoming, 60000);
    return () => clearInterval(interval);
  }, [flux.scheduleBlocks, pillMode]);

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
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
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

  // Listen for in-document Aura summon events (fired by floating Aura button inside DocumentView)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { content, title, docId, prompt } = e.detail || {};
      if (content) {
        setInjectedDocContext(`[Open document: "${title || "Untitled"}"]\n${content}`);
        setInjectedDocId(docId || null);
      }
      wake();
      if (prompt) setTimeout(() => setInput(prompt), 50);
    };
    window.addEventListener("aura:summon-with-doc" as any, handler);
    return () => window.removeEventListener("aura:summon-with-doc" as any, handler);
  }, [wake]);

  // Listen for aura:toggle — summon or close from document toolbar orb
  const pillModeRef = useRef(pillMode);
  useEffect(() => { pillModeRef.current = pillMode; }, [pillMode]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { content, title, docId, prompt } = e.detail || {};
      const currentMode = pillModeRef.current;
      if (currentMode !== "idle" && currentMode !== "hint") {
        // Already open — close it, do NOT re-open
        revertToIdle();
        return;
      }
      if (content) {
        setInjectedDocContext(`[Open document: "${title || "Untitled"}"]\n${content}`);
        setInjectedDocId(docId || null);
      }
      wake();
      if (prompt) setTimeout(() => setInput(prompt), 50);
    };
    window.addEventListener("aura:toggle" as any, handler);
    return () => window.removeEventListener("aura:toggle" as any, handler);
  }, [wake, revertToIdle]);

  const handleToolCall = useCallback((name: string, args: any) => {
    if (name === "add_task") {
      const title = args.title || args.text || "New task";
      flux.createTask({ title, priority: args.priority || "medium", folder_id: args.folder_id || null });
      toast.success(`Task added: ${title}`);
    } else if (name === "remove_task") {
      const taskId = args.task_id;
      if (taskId) { flux.removeTask(taskId); toast.success("Task removed"); }
    } else if (name === "complete_task") {
      const taskId = args.task_id;
      if (taskId) { flux.updateTask(taskId, { done: true, status: "done" }); toast.success("Task completed ✓"); }
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
        time: args.time || "10:00",
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
        const noteTitle = args.title || "Note";
        const dedupKey = `aura-create-note-${noteTitle}`;
        if ((window as any)[dedupKey]) return;
        (window as any)[dedupKey] = true;
        setTimeout(() => { delete (window as any)[dedupKey]; }, 10000);
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
    } else if (name === "set_theme") {
      const t = args.theme === "dark" ? "dark" : "light";
      setTheme(t);
      // Also apply directly to DOM for immediate effect
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      toast.success(`Theme set to ${t} mode`);
    } else if (name === "create_folder") {
      if (user) {
        const newFolder = {
          title: args.title || "New Folder",
          type: "project",
          icon: args.icon || null,
          color: args.color || null,
          sort_order: (flux.folders?.length || 0) + 1,
        };
        flux.createFolder(newFolder);
        toast.success(`Folder created: ${args.title}`);
      }
    } else if (name === "create_sticky_note") {
      const text = args.text || "Note";
      const color = args.color || "yellow";
      const newNote = {
        id: `aura-note-${Date.now()}`,
        text,
        color,
        x: Math.round(window.innerWidth * 0.1 + Math.random() * 100),
        y: Math.round(window.innerHeight * 0.1 + Math.random() * 60),
        rotation: Math.floor(Math.random() * 7) - 3,
        opacity: 1,
      };
      focusStore.setFocusStickyNotes([...(focusStore.focusStickyNotes || []), newNote]);
      toast.success("Sticky note created");
    } else if (name === "open_view") {
      const view = VIEW_MAP[args.view];
      if (view) {
        flux.setActiveView(view as any);
        toast.success(`Opened ${args.view}`);
      }
    } else if (name === "save_memory") {
      if (user && args.key && args.value) {
        setMemories((prev) => ({ ...prev, [args.key]: args.value }));
        (supabase as any).from("aura_memory").upsert(
          { user_id: user.id, key: args.key, value: args.value },
          { onConflict: "user_id,key" }
        ).then(({ error }: { error: any }) => {
          if (error) console.error("save_memory error:", error);
          else toast.success(`Memory saved: ${args.key}`);
        });
      }
    } else if (name === "read_aloud") {
      if (args.text && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(args.text);
        window.speechSynthesis.speak(utt);
      }
    } else if (name === "create_spreadsheet") {
      if (user) {
        (supabase as any).from("documents").insert({
          user_id: user.id,
          title: args.title || "Spreadsheet",
          type: "spreadsheet",
          folder_id: args.folder_id || null,
          content: { cells: {}, colWidths: {} },
        }).then(({ error }: { error: any }) => {
          if (error) toast.error("Failed to create spreadsheet");
          else { toast.success(`Spreadsheet created: ${args.title}`); flux.setActiveView("documents"); }
        });
      }
    } else if (name === "delete_folder") {
      if (args.folder_id) {
        flux.removeFolder(args.folder_id);
        toast.success("Folder deleted");
      }
    } else if (name === "create_goal") {
      if (user) {
        flux.createGoal({
          title: args.title || "New Goal",
          target_amount: args.target_amount || 0,
          current_amount: args.current_amount || 0,
          deadline: args.deadline || null,
          folder_id: args.folder_id || null,
        });
        toast.success(`Goal created: ${args.title}`);
      }
    } else if (name === "pin_task") {
      if (args.task_id !== undefined) {
        flux.updateTask(args.task_id, { pinned: args.pinned !== false });
        toast.success(args.pinned !== false ? "Task pinned" : "Task unpinned");
      }
    } else if (name === "rename_item") {
      if (args.type === "folder" && args.id) {
        flux.updateFolder(args.id, { title: args.new_title });
        toast.success(`Folder renamed to "${args.new_title}"`);
      } else if (args.type === "task" && args.id) {
        flux.updateTask(args.id, { title: args.new_title });
        toast.success(`Task renamed to "${args.new_title}"`);
      }
    } else if (name === "summarize_context") {
      // No-op — Aura will produce a text response using the context already injected in system prompt
    } else if (name === "generate_image") {
      const prompt = args.prompt || "abstract art";
      const target: "dashboard" | "document" = args.target || "dashboard";
      toast.loading("Generating image…", { id: "aura-img-gen" });
      (async () => {
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/flux-ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ type: "generate-image", prompt }),
          });
          if (!resp.ok) { toast.error("Image generation failed", { id: "aura-img-gen" }); return; }
          const { imageBase64, mimeType } = await resp.json();
          if (!imageBase64) { toast.error("No image returned", { id: "aura-img-gen" }); return; }

          // Convert base64 → blob → upload to document-images bucket
          const byteArr = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
          const blob = new Blob([byteArr], { type: mimeType || "image/png" });
          const ext = (mimeType || "image/png").split("/")[1] || "png";
          const fileName = `aura-${Date.now()}.${ext}`;
          const { data: uploadData, error: uploadErr } = await (supabase.storage as any)
            .from("document-images")
            .upload(fileName, blob, { contentType: mimeType || "image/png", upsert: false });
          if (uploadErr) { toast.error("Image upload failed", { id: "aura-img-gen" }); return; }
          const { data: { publicUrl } } = (supabase.storage as any).from("document-images").getPublicUrl(fileName);
          toast.success("Image generated!", { id: "aura-img-gen" });

          if (target === "document") {
            window.dispatchEvent(new CustomEvent("aura:insert-image", { detail: { url: publicUrl } }));
          } else {
            window.dispatchEvent(new CustomEvent("aura:spawn-image-widget", { detail: { url: publicUrl, prompt, id: `img-${Date.now()}` } }));
          }
        } catch {
          toast.error("Image generation failed", { id: "aura-img-gen" });
        }
      })();
    } else if (name === "write_to_document") {
      const { title, content, target, folder_id } = args;
      if (!content) return;
      if (target === "current") {
        // Stream word-by-word into the currently open document
        window.dispatchEvent(new CustomEvent("aura:stream-to-document", { detail: { text: content, append: true } }));
        toast.success("Aura is writing into the document…");
      } else {
        // Create new empty document, navigate to it, then stream content in
        if (!user) { toast.error("Sign in to create documents"); return; }
        const noteTitle = title || "Document";
        const dedupKey = `aura-create-note-${noteTitle}`;
        if ((window as any)[dedupKey]) return;
        (window as any)[dedupKey] = true;
        setTimeout(() => { delete (window as any)[dedupKey]; }, 10000);
        (supabase as any).from("documents").insert({
          user_id: user.id,
          title: noteTitle,
          type: "text",
          folder_id: folder_id || null,
          content: { html: "" },
        }).select().single().then(({ data, error }: { data: any; error: any }) => {
          if (error) { toast.error("Failed to create document"); return; }
          toast.success(`Aura is writing "${noteTitle}"…`);
          flux.setActiveView("documents");
          // Wait for doc to open, then stream
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("aura:open-document", { detail: { docId: data.id } }));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("aura:stream-to-document", { detail: { text: content, append: false } }));
            }, 400);
          }, 350);
        });
      }
    } else if (name === "inject_formula") {
      const { cell, formula, note } = args;
      if (cell && formula) {
        window.dispatchEvent(new CustomEvent("aura:inject-formula", { detail: { cell, formula } }));
        toast.success(`Formula injected into ${cell}${note ? ` — ${note}` : ""}`);
      }
    }
  }, [flux, user, setTheme, focusStore]);

  const speakText = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utt);
  }, []);

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
    const baseContext = gatherContext(focusStore, flux, memories);
    const context = injectedDocContext
      ? `${baseContext}\n\n═══ CURRENTLY OPEN DOCUMENT (user is asking about this) ═══\n${injectedDocContext}\n═══ END DOCUMENT ═══`
      : baseContext;

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
  }, [messages, isLoading, focusStore, flux, memories, handleToolCall, injectedDocContext]);

  const { listening, toggle: toggleVoice, stop: stopVoice, start: startVoice, audioLevelRef: voiceAudioLevelRef } = useVoiceInput((text) => {
    send(text);
  });

  // Global Cmd/Ctrl shortcut for voice
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Meta" && e.key !== "Control") return;
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

  const isActive = pillMode !== "idle" && pillMode !== "hint";

  const widget = (
    <DraggableWidget
      id="aura"
      title="Aura"
      defaultPosition={defaultPos}
      defaultSize={{ w: 320, h: 300 }}
      className="aura-widget"
      autoHeight
      overflowVisible
      containerStyle={{ zIndex: isActive || injectedDocContext ? 9000 : 200 }}
    >
      <div ref={widgetRef} className="flex flex-col items-center relative" style={{ minHeight: 160 }}>
        {/* Orb */}
        <div className="flex items-center justify-center pt-2 pb-1" onClick={wake}>
          <AuraOrb state={auraState} size={orbSize} onClick={wake} audioLevelRef={voiceAudioLevelRef} />
        </div>

        {/* Dynamic Pill — inner layout wrapper for smooth morphing, isolated from drag */}
        <motion.div
          layout
          className="w-full flex justify-center mt-2"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{ originX: 0.5, originY: 0 }}
        >
          <AnimatePresence mode="wait">
            {pillMode === "hint" && (
              <motion.div
                key="hint-pill"
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -4 }}
                transition={{ duration: 0.4 }}
                className="cursor-pointer"
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
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, width: 300 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="w-full"
              >
                {pillMode === "processing" ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 border border-white/[0.08]" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 w-full">
                    {injectedDocContext && (
                      <div className="flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1 mx-1" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.2)" }}>
                        <span className="text-[10px] text-purple-300/80 truncate">📄 Reading document…</span>
                        <button onClick={() => setInjectedDocContext(null)} className="text-purple-300/50 hover:text-purple-300 text-[10px] shrink-0">✕</button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-2 border border-white/[0.08] relative" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" }}>
                      <button
                        onClick={toggleVoice}
                        className={`p-1 rounded-full transition-all shrink-0 ${listening ? "bg-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "text-white/40 hover:text-white/70"}`}
                        title={listening ? "Stop listening" : "Start voice (⌘/Ctrl)"}
                      >
                        {listening ? <MicOff size={13} /> : <Mic size={13} />}
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && send(input)}
                        placeholder={injectedDocContext ? "Ask about this document..." : listening ? "Listening..." : "Ask Aura anything..."}
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
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Chat history */}
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
                        <div className="group relative">
                          <div className="prose prose-invert prose-sm max-w-none [&>*]:my-0.5 [&_p]:text-[12px] [&_p]:leading-relaxed [&_li]:text-[12px] [&_p]:text-white/60">
                            <ReactMarkdown
                              components={{
                                code({ className, children, ...props }: any) {
                                  const inline = !className && !String(children).includes("\n");
                                  if (inline) return <code className="px-1 py-0.5 rounded text-[11px] font-mono bg-white/10 text-green-300/90" {...props}>{children}</code>;
                                  return <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>;
                                },
                              }}
                            >{msg.content}</ReactMarkdown>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={() => speakText(msg.content)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full text-white/30 hover:text-white/60"
                              title="Read aloud"
                            >
                              <Volume2 size={11} />
                            </button>
                            {msg.content.length > 300 && (
                              <button
                                onClick={() => {
                                  if (injectedDocContext) {
                                    window.dispatchEvent(new CustomEvent("aura:stream-to-document", { detail: { text: msg.content, append: true } }));
                                    toast.success("Streaming into document…");
                                  } else {
                                    toast.info("Open a document first, then use this button to stream text into it.");
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-white/40 hover:text-white/70 hover:bg-white/10"
                                title="Stream into open document"
                              >
                                📄 Insert into document
                              </button>
                            )}
                          </div>
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

  return widget;
};

export default AuraWidget;
