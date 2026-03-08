import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useFlux } from "@/context/FluxContext";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, getISOWeek, addWeeks, subWeeks,
  addDays, subDays, isSameMonth, parseISO, isBefore, startOfDay,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle2, CalendarDays, Loader2,
  RefreshCw, CheckCheck, Calendar, Globe, Sparkles, Zap, CheckSquare, CalendarOff,
  ChevronRight as Collapse, Sun, Moon,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import TaskDrawer from "@/components/calendar/TaskDrawer";
import { DbTask } from "@/context/FluxContext";

type CalView = "day" | "week" | "month";
type Provider = "dashiii" | "google" | "outlook" | "apple";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: "task" | "block" | "custom";
  color?: string;
  done?: boolean;
  priority?: string;
  dbId?: string;
  provider?: Provider;
  taskId?: string;
  isProposed?: boolean;
  proposedTaskId?: string;
}

interface ProposedSlot {
  taskId: string;
  taskTitle: string;
  date: string;
  startHour: number;
  endHour: number;
}

const EVENT_COLORS = [
  { label: "Meeting", value: "bg-blue-500", hex: "#3b82f6" },
  { label: "Deadline", value: "bg-red-500", hex: "#ef4444" },
  { label: "Task", value: "bg-emerald-500", hex: "#10b981" },
  { label: "Reminder", value: "bg-amber-500", hex: "#f59e0b" },
  { label: "Focus", value: "bg-violet-500", hex: "#8b5cf6" },
];

const hexFor = (color?: string) =>
  EVENT_COLORS.find(c => c.value === color)?.hex ?? "#8b5cf6";

const PROVIDER_COLORS: Record<Provider, { bg: string; label: string; icon: string }> = {
  dashiii: { bg: "#8b5cf6", label: "Dashiii", icon: "D" },
  google: { bg: "#4285f4", label: "Google", icon: "G" },
  outlook: { bg: "#0078d4", label: "Outlook", icon: "O" },
  apple: { bg: "#555555", label: "Apple", icon: "" },
};

// ── Glass Event Pill ──────────────────────────────────────────────────────────
const EventPill: React.FC<{ event: CalEvent; compact?: boolean }> = ({ event, compact }) => {
  const hex = event.isProposed ? "#8b5cf6" : hexFor(event.color);
  const provider = event.provider && event.provider !== "dashiii" ? event.provider : null;

  if (event.isProposed) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate animate-pulse"
        style={{
          background: "rgba(139,92,246,0.1)",
          border: "1.5px dashed rgba(139,92,246,0.55)",
          color: "#a78bfa",
        }}
        title={event.title}
      >
        <Sparkles size={9} className="shrink-0" />
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  // AI-synced task block (has a linked taskId and title starts with "Focus:")
  const isAiSynced = !!(event.taskId && event.title?.startsWith("Focus:"));

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        background: isAiSynced ? "rgba(139,92,246,0.14)" : `${hex}22`,
        border: isAiSynced ? "1px solid rgba(139,92,246,0.45)" : `1px solid ${hex}55`,
        color: isAiSynced ? "#a78bfa" : hex,
        backdropFilter: "blur(4px)",
        boxShadow: isAiSynced ? "0 0 10px rgba(139,92,246,0.2)" : undefined,
      }}
      title={event.title}
    >
      {provider && (
        <span className="shrink-0 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
          style={{ background: PROVIDER_COLORS[provider].bg }}>
          {PROVIDER_COLORS[provider].icon}
        </span>
      )}
      {isAiSynced && <Sparkles size={8} className="shrink-0" />}
      {!isAiSynced && event.taskId && <CheckSquare size={8} className="shrink-0 opacity-70" />}
      {!compact && event.startTime && <span className="opacity-60 shrink-0">{event.startTime}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  );
};

// ── Inline Draft Pill (zero-modal creation) ───────────────────────────────────
interface InlineDraftPillProps {
  hour: number;
  date: string;
  onSave: (title: string, date: string, startTime: string) => void;
  onCancel: () => void;
}
const InlineDraftPill: React.FC<InlineDraftPillProps> = ({ hour, date, onSave, onCancel }) => {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);
  const startTime = `${String(hour).padStart(2, "0")}:00`;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
      style={{
        background: "hsl(var(--primary) / 0.12)",
        border: "1px solid hsl(var(--primary) / 0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Calendar size={10} className="text-primary shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && title.trim()) {
            onSave(title.trim(), date, startTime);
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        placeholder="Event title…"
        className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 min-w-0"
        style={{ fontSize: "11px" }}
      />
      <button onClick={onCancel} className="text-muted-foreground/60 hover:text-foreground shrink-0">
        <X size={9} />
      </button>
    </div>
  );
};

// ── Droppable Slot ─────────────────────────────────────────────────────────────
const DroppableSlot: React.FC<{
  id: string;
  children: React.ReactNode;
  isToday: boolean;
  hour: number;
  onSlotClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}> = ({ id, children, isToday: todaySlot, hour, onSlotClick, style, className }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onSlotClick}
      className={`relative border-t border-border/20 transition-colors cursor-pointer group ${todaySlot ? "bg-primary/[0.02]" : ""} ${isOver ? "bg-primary/10" : "hover:bg-secondary/15"} ${className || ""}`}
      style={style}
    >
      {isOver && (
        <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none z-10 animate-pulse" />
      )}
      {children}
      {/* Hover ghost */}
      <div className="absolute inset-x-0.5 inset-y-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-primary/20 pointer-events-none" />
    </div>
  );
};

// ── Add Event Modal ───────────────────────────────────────────────────────────
interface AddEventModalProps {
  defaultDate: string;
  defaultTime?: string;
  onClose: () => void;
  onSave: (e: { title: string; date: string; startTime: string; endTime: string; color: string; crmContact: string }) => void;
  crmContacts: { id: string; name: string; company: string }[];
}
const AddEventModal: React.FC<AddEventModalProps> = ({ defaultDate, defaultTime = "09:00", onClose, onSave, crmContacts }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime);
  const [endTime, setEndTime] = useState(() => {
    const h = parseInt(defaultTime.split(":")[0]) + 1;
    return `${String(Math.min(h, 23)).padStart(2, "0")}:00`;
  });
  const [color, setColor] = useState("bg-violet-500");
  const [crmContact, setCrmContact] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const handleSave = () => {
    if (!title.trim()) { toast.error("Please enter an event title"); return; }
    onSave({ title: title.trim(), date, startTime, endTime, color, crmContact });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }} onClick={e => e.stopPropagation()}
        className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "hsl(var(--card) / 0.95)", border: "1px solid hsl(var(--border))", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar size={13} className="text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">New Event</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-4">
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()} placeholder="Event title…"
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors" />
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="col-span-3 md:col-span-1 px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground outline-none focus:border-primary/50" />
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground outline-none focus:border-primary/50" />
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground outline-none focus:border-primary/50" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {EVENT_COLORS.map(c => (
              <button key={c.value} title={c.label} onClick={() => setColor(c.value)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all"
                style={{
                  background: color === c.value ? `${c.hex}20` : "transparent",
                  borderColor: color === c.value ? `${c.hex}60` : "hsl(var(--border))",
                  color: color === c.value ? c.hex : "hsl(var(--muted-foreground))",
                }}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.hex }} />{c.label}
              </button>
            ))}
          </div>
          {crmContacts.length > 0 && (
            <select value={crmContact} onChange={e => setCrmContact(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary/50">
              <option value="">— Link CRM contact (optional) —</option>
              {crmContacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.company}</option>)}
            </select>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Add Event</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Integration Sync Modal ────────────────────────────────────────────────────
type ConnectionState = "idle" | "loading" | "connected";
interface IntegrationModalProps {
  connectedProviders: Provider[];
  onConnect: (provider: Provider) => Promise<void>;
  onClose: () => void;
}
const IntegrationModal: React.FC<IntegrationModalProps> = ({ connectedProviders, onConnect, onClose }) => {
  const [states, setStates] = useState<Record<string, ConnectionState>>({
    google: connectedProviders.includes("google") ? "connected" : "idle",
    outlook: connectedProviders.includes("outlook") ? "connected" : "idle",
    apple: connectedProviders.includes("apple") ? "connected" : "idle",
  });
  const providers = [
    { id: "google" as Provider, name: "Google Calendar", desc: "Sync meetings, events, and reminders", color: "#4285f4",
      icon: <svg viewBox="0 0 48 48" className="w-7 h-7"><path fill="#4285F4" d="M45.5 24.5c0-1.7-.1-3.4-.4-5H24v9.5h12.1c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.6-9.5 6.6-16.4z" /><path fill="#34A853" d="M24 46c6.5 0 11.9-2.1 15.9-5.7l-7.1-5.4c-2.1 1.4-4.8 2.2-8.8 2.2-6.7 0-12.4-4.5-14.4-10.6H2.2v5.6C6.1 41.6 14.5 46 24 46z" /><path fill="#FBBC05" d="M9.6 26.5c-.5-1.4-.8-3-.8-4.5s.3-3.1.8-4.5v-5.6H2.2C.8 14.9 0 19.4 0 24s.8 9.1 2.2 12.1l7.4-5.6z" /><path fill="#EA4335" d="M24 9.5c3.8 0 7.1 1.3 9.8 3.8l7.3-7.3C36.9 2.1 30.9 0 24 0 14.5 0 6.1 4.4 2.2 11.9l7.4 5.6C11.6 14 17.3 9.5 24 9.5z" /></svg> },
    { id: "outlook" as Provider, name: "Microsoft Outlook", desc: "Connect your work calendar", color: "#0078d4",
      icon: <svg viewBox="0 0 48 48" className="w-7 h-7"><rect x="4" y="4" width="19" height="19" fill="#f25022" /><rect x="25" y="4" width="19" height="19" fill="#7fba00" /><rect x="4" y="25" width="19" height="19" fill="#00a4ef" /><rect x="25" y="25" width="19" height="19" fill="#ffb900" /></svg> },
    { id: "apple" as Provider, name: "Apple iCloud", desc: "Import iCal events from Apple devices", color: "#888",
      icon: <svg viewBox="0 0 48 48" className="w-7 h-7" fill="currentColor"><path d="M35.1 26.1c-.1-4.9 4-7.3 4.2-7.4-2.3-3.3-5.8-3.8-7.1-3.9-3-.3-5.9 1.8-7.4 1.8-1.5 0-3.9-1.7-6.4-1.7-3.3.1-6.3 1.9-8 4.9-3.4 5.9-.9 14.6 2.4 19.4 1.6 2.3 3.5 4.9 6.1 4.8 2.4-.1 3.3-1.6 6.3-1.6s3.7 1.6 6.3 1.5c2.6 0 4.3-2.3 5.9-4.7 1.9-2.7 2.6-5.3 2.7-5.4-.1 0-5-1.9-5-7.7z" /></svg> },
  ];
  const handleConnect = async (id: Provider) => {
    setStates(s => ({ ...s, [id]: "loading" }));
    await new Promise(r => setTimeout(r, 1800));
    setStates(s => ({ ...s, [id]: "connected" }));
    await onConnect(id);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border))", backdropFilter: "blur(24px)" }}>
        <div className="p-6 pb-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1"><Globe size={16} className="text-primary" /><h2 className="text-base font-bold text-foreground">Connect Your World</h2></div>
              <p className="text-xs text-muted-foreground">Sync external calendars to see everything in one place</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors text-muted-foreground"><X size={15} /></button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {providers.map(p => {
            const state = states[p.id];
            return (
              <div key={p.id} className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${state === "connected" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 hover:border-border"}`}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.desc}</p>
                </div>
                <div className="shrink-0">
                  {state === "connected" ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"><CheckCheck size={12} /> Connected</div>
                  ) : state === "loading" ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs"><Loader2 size={12} className="animate-spin" /> Syncing…</div>
                  ) : (
                    <button onClick={() => handleConnect(p.id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:scale-105 active:scale-95 transition-all"
                      style={{ background: `${p.color}20`, border: `1px solid ${p.color}40`, color: p.color }}>Connect</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-4"><p className="text-[10px] text-center text-muted-foreground/50">🔒 OAuth-secured · events are read-only imports</p></div>
      </motion.div>
    </motion.div>
  );
};

// ── Aura Daily Briefing ───────────────────────────────────────────────────────
interface AuraDailyBriefingProps {
  todayEvents: CalEvent[];
  overdueTasks: { id: string; title: string; due_date: string | null }[];
  onReschedule: (taskId: string) => void;
  onDismiss: () => void;
}
const AuraDailyBriefing: React.FC<AuraDailyBriefingProps> = ({ todayEvents, overdueTasks, onReschedule, onDismiss }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const overdueTask = overdueTasks[0] || null;
  const meetingCount = todayEvents.length;
  const summaryText = meetingCount > 0
    ? `${greeting}! You have ${meetingCount} event${meetingCount !== 1 ? "s" : ""} today.${overdueTask ? ` "${overdueTask.title}" is overdue.` : " Enjoy your focus time! ✨"}`
    : `${greeting}! Your calendar is clear today. ${overdueTask ? `"${overdueTask.title}" is overdue.` : "Perfect for deep work! 🧘"}`;
  return (
    <motion.div initial={{ opacity: 0, y: 80, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.3 }}
      className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-3xl overflow-hidden"
      style={{ background: "hsl(var(--card) / 0.92)", border: "1px solid hsl(var(--border))", backdropFilter: "blur(24px)", boxShadow: "0 0 20px rgba(139,92,246,0.2), 0 20px 40px rgba(0,0,0,0.3)" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <motion.div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(var(--aurora-violet)) 0%, hsl(var(--aurora-blue)) 100%)" }}
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <Sparkles size={13} className="text-white" />
          </motion.div>
          <div><p className="text-xs font-bold text-foreground">Aura</p><p className="text-[9px] text-muted-foreground">Daily Briefing</p></div>
        </div>
        <button onClick={onDismiss} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground"><X size={12} /></button>
      </div>
      <div className="px-4 pb-2"><p className="text-sm text-foreground leading-relaxed">{summaryText}</p></div>
      {todayEvents.length > 0 && (
        <div className="px-4 pb-2 flex gap-1 flex-wrap">
          {todayEvents.slice(0, 3).map(e => (
            <span key={e.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: `${hexFor(e.color)}20`, color: hexFor(e.color), border: `1px solid ${hexFor(e.color)}40` }}>
              {e.startTime && `${e.startTime} · `}{e.title}
            </span>
          ))}
        </div>
      )}
      <div className="px-4 pb-4 flex gap-2">
        {overdueTask && (
          <button onClick={() => { onReschedule(overdueTask.id); onDismiss(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
            style={{ background: "hsl(var(--aurora-violet) / 0.15)", border: "1px solid hsl(var(--aurora-violet) / 0.35)", color: "hsl(var(--aurora-violet))" }}>
            <Zap size={11} /> Reschedule
          </button>
        )}
        <button onClick={onDismiss} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">Dismiss</button>
      </div>
    </motion.div>
  );
};

// ── Aura Auto-Schedule Algorithm ──────────────────────────────────────────────
function findScheduleGaps(existingEvents: CalEvent[], todayStr: string, workingStart = 9, workingEnd = 17): number[] {
  const occupied = existingEvents
    .filter(e => e.date === todayStr && e.startTime)
    .map(e => parseInt(e.startTime!.split(":")[0]))
    .sort((a, b) => a - b);

  const gaps: number[] = [];
  for (let h = workingStart; h < workingEnd; h++) {
    if (!occupied.includes(h)) gaps.push(h);
  }
  return gaps;
}

// ── Month View ────────────────────────────────────────────────────────────────
const MonthView: React.FC<{
  currentMonth: Date;
  events: CalEvent[];
  onDayClick: (date: Date) => void;
}> = ({ currentMonth, events, onDayClick }) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayEventMap = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-8 rounded-2xl overflow-hidden border border-border/20" style={{ gap: "1px", background: "hsl(var(--border) / 0.1)" }}>
      <div className="bg-card/80 text-[10px] font-semibold text-muted-foreground/40 text-center py-2.5">Wk</div>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
        <div key={d} className="bg-card/80 text-[10px] font-semibold text-muted-foreground text-center py-2.5 tracking-wide">{d}</div>
      ))}
      {days.map((day, i) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = dayEventMap.get(key) || [];
        const inMonth = isSameMonth(day, currentMonth);
        const isWeekStart = i % 7 === 0;
        return (
          <React.Fragment key={key}>
            {isWeekStart && (
              <div className="bg-card/80 text-[9px] text-muted-foreground/30 flex items-start justify-center pt-2 font-mono">{getISOWeek(day)}</div>
            )}
            <button onClick={() => onDayClick(day)}
              className={`bg-card/80 min-h-[72px] p-1.5 text-left relative group transition-colors hover:bg-secondary/20 ${!inMonth ? "opacity-25" : ""} ${isToday(day) ? "bg-primary/5" : ""}`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 font-medium transition-colors ${isToday(day) ? "bg-primary text-primary-foreground font-bold" : "text-foreground/70 group-hover:text-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(e => <EventPill key={e.id} event={e} compact />)}
                {dayEvents.length > 3 && <div className="text-[9px] text-muted-foreground/60 px-1.5">+{dayEvents.length - 3} more</div>}
              </div>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={9} className="text-primary/60" /></div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Week View ─────────────────────────────────────────────────────────────────
const WeekView: React.FC<{
  currentWeek: Date;
  events: CalEvent[];
  onDayClick: (date: Date) => void;
  draftSlot: { date: string; hour: number } | null;
  onSlotClick: (date: string, hour: number) => void;
  onDraftSave: (title: string, date: string, startTime: string) => void;
  onDraftCancel: () => void;
}> = ({ currentWeek, events, onDayClick, draftSlot, onSlotClick, onDraftSave, onDraftCancel }) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentWeek, { weekStartsOn: 1 }) });
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);
  const HOUR_H = 56;

  const [nowMins, setNowMins] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  useEffect(() => {
    const id = setInterval(() => { const n = new Date(); setNowMins(n.getHours() * 60 + n.getMinutes()); }, 60_000);
    return () => clearInterval(id);
  }, []);
  const nowOffsetPx = ((nowMins - 7 * 60) / 60) * HOUR_H;
  const showNow = nowMins >= 7 * 60 && nowMins <= 22 * 60;

  const dayEventMap = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="rounded-2xl border border-border/30 overflow-hidden">
      <div className="grid grid-cols-8 border-b border-border/20" style={{ background: "hsl(var(--card) / 0.8)" }}>
        <div className="p-2 text-[10px] text-muted-foreground/30 text-center font-mono">UTC</div>
        {days.map(d => (
          <button key={format(d, "yyyy-MM-dd")} onClick={() => onDayClick(d)}
            className={`p-2 text-center transition-colors hover:bg-secondary/40 ${isToday(d) ? "bg-primary/8" : ""}`}>
            <p className="text-[10px] font-medium text-muted-foreground">{format(d, "EEE")}</p>
            <p className={`text-sm font-bold ${isToday(d) ? "text-primary" : "text-foreground/80"}`}>{format(d, "d")}</p>
          </button>
        ))}
      </div>
      <div className="overflow-auto max-h-[520px]">
        <div className="relative">
          {showNow && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowOffsetPx }}>
              <div className="ml-10 h-0.5 flex-1 relative">
                <motion.div className="absolute left-0 w-2.5 h-2.5 rounded-full -translate-y-[4px] -translate-x-[5px]"
                  style={{ background: "hsl(0 72% 55%)" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <div className="h-full" style={{ background: "linear-gradient(90deg, hsl(0 72% 55%), transparent)", opacity: 0.6 }} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-8" style={{ background: "hsl(var(--card) / 0.5)" }}>
            {hours.map(h => (
              <React.Fragment key={h}>
                <div className="text-[9px] text-muted-foreground/40 text-right font-mono pr-2 pt-1.5 border-t border-border/20" style={{ height: HOUR_H }}>
                  {h.toString().padStart(2, "0")}:00
                </div>
                {days.map(d => {
                  const key = format(d, "yyyy-MM-dd");
                  const slotId = `slot-${key}-${h}`;
                  const slotEvents = (dayEventMap.get(key) || []).filter(e => e.startTime && parseInt(e.startTime.split(":")[0]) === h);
                  const isDraftHere = draftSlot?.date === key && draftSlot?.hour === h;
                  return (
                    <DroppableSlot
                      key={key}
                      id={slotId}
                      isToday={isToday(d)}
                      hour={h}
                      onSlotClick={() => onSlotClick(key, h)}
                      style={{ height: HOUR_H }}
                    >
                      <div className="p-0.5 space-y-0.5">
                        {slotEvents.map(e => <EventPill key={e.id} event={e} />)}
                        {isDraftHere && (
                          <InlineDraftPill
                            hour={h} date={key}
                            onSave={onDraftSave}
                            onCancel={onDraftCancel}
                          />
                        )}
                      </div>
                    </DroppableSlot>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Day View ──────────────────────────────────────────────────────────────────
const DayView: React.FC<{
  currentDay: Date;
  events: CalEvent[];
  onTimeClick: (date: Date) => void;
  draftSlot: { date: string; hour: number } | null;
  onSlotClick: (date: string, hour: number) => void;
  onDraftSave: (title: string, date: string, startTime: string) => void;
  onDraftCancel: () => void;
}> = ({ currentDay, events, onTimeClick, draftSlot, onSlotClick, onDraftSave, onDraftCancel }) => {
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);
  const HOUR_H = 64;
  const todayKey = format(currentDay, "yyyy-MM-dd");
  const dayEvents = events.filter(e => e.date === todayKey);
  const [nowMins, setNowMins] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  useEffect(() => {
    const id = setInterval(() => { const n = new Date(); setNowMins(n.getHours() * 60 + n.getMinutes()); }, 60_000);
    return () => clearInterval(id);
  }, []);
  const nowOffsetPx = ((nowMins - 7 * 60) / 60) * HOUR_H;
  const showNow = isToday(currentDay) && nowMins >= 7 * 60 && nowMins <= 22 * 60;

  return (
    <div className="rounded-2xl border border-border/30 overflow-hidden">
      <div className="border-b border-border/20 px-4 py-3 flex items-center gap-3" style={{ background: "hsl(var(--card) / 0.8)" }}>
        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${isToday(currentDay) ? "bg-primary" : "bg-secondary"}`}>
          <span className="text-[9px] font-semibold">{format(currentDay, "EEE").toUpperCase()}</span>
          <span className="text-sm font-bold leading-none">{format(currentDay, "d")}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{format(currentDay, "EEEE, MMMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="overflow-auto max-h-[520px]">
        <div className="relative">
          {showNow && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowOffsetPx }}>
              <div className="ml-16 h-0.5 flex-1 relative">
                <motion.div className="absolute left-0 w-3 h-3 rounded-full -translate-y-[5px] -translate-x-[6px]"
                  style={{ background: "hsl(0 72% 55%)" }}
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <div className="h-full" style={{ background: "linear-gradient(90deg, hsl(0 72% 55%), hsl(0 72% 55% / 0.2))" }} />
              </div>
            </div>
          )}
          <div style={{ background: "hsl(var(--card) / 0.5)" }}>
            {hours.map(h => {
              const slotEvents = dayEvents.filter(e => e.startTime && parseInt(e.startTime.split(":")[0]) === h);
              const isDraftHere = draftSlot?.date === todayKey && draftSlot?.hour === h;
              const slotId = `slot-${todayKey}-${h}`;
              return (
                <DroppableSlot
                  key={h}
                  id={slotId}
                  isToday={isToday(currentDay)}
                  hour={h}
                  onSlotClick={() => onSlotClick(todayKey, h)}
                  style={{ display: "grid", gridTemplateColumns: "64px 1fr", height: HOUR_H }}
                >
                  <div className="text-[10px] text-muted-foreground/40 font-mono text-right pr-3 pt-2">
                    {h.toString().padStart(2, "0")}:00
                  </div>
                  <div className="p-1 space-y-1">
                    {slotEvents.map(e => (
                      <div key={e.id} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${e.isProposed ? "animate-pulse" : ""}`}
                        style={e.isProposed ? {
                          background: "rgba(139,92,246,0.08)",
                          border: "1.5px dashed rgba(139,92,246,0.55)",
                          color: "#a78bfa",
                        } : {
                          background: `${hexFor(e.color)}20`,
                          border: `1px solid ${hexFor(e.color)}40`,
                          color: hexFor(e.color),
                        }}>
                        {e.isProposed && <Sparkles size={9} className="inline mr-1" />}
                        <span className="font-semibold">{e.startTime}</span> — {e.title}
                      </div>
                    ))}
                    {isDraftHere && (
                      <InlineDraftPill hour={h} date={todayKey} onSave={onDraftSave} onCancel={onDraftCancel} />
                    )}
                    {!slotEvents.length && !isDraftHere && (
                      <div className="h-full rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-primary/20" />
                    )}
                  </div>
                </DroppableSlot>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Mock provider events ──────────────────────────────────────────────────────
const MOCK_PROVIDER_EVENTS: Record<Provider, Partial<CalEvent>[]> = {
  google: [
    { title: "Team Standup", startTime: "09:00", endTime: "09:30", color: "bg-blue-500", provider: "google" },
    { title: "Product Review", startTime: "14:00", endTime: "15:00", color: "bg-blue-500", provider: "google" },
    { title: "1:1 with Sarah", startTime: "11:30", endTime: "12:00", color: "bg-emerald-500", provider: "google" },
  ],
  outlook: [
    { title: "Sprint Planning", startTime: "10:00", endTime: "11:00", color: "bg-violet-500", provider: "outlook" },
    { title: "Client Call", startTime: "15:30", endTime: "16:30", color: "bg-amber-500", provider: "outlook" },
  ],
  apple: [
    { title: "Gym", startTime: "07:00", endTime: "08:00", color: "bg-emerald-500", provider: "apple" },
    { title: "Family Dinner", startTime: "19:00", endTime: "21:00", color: "bg-amber-500", provider: "apple" },
  ],
  dashiii: [],
};

const BRIEFING_KEY = () => `aura-briefing-${format(new Date(), "yyyy-MM-dd")}`;

// ── Main CalendarView ─────────────────────────────────────────────────────────
const CalendarView = () => {
  const { tasks, scheduleBlocks, updateTask, createTask, scheduleTask } = useFlux();
  const { deals } = useCRM();
  const { user } = useAuth();
  const [pageLight, setPageLight] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalView>("week");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [addDefaultTime, setAddDefaultTime] = useState("09:00");
  const [customEvents, setCustomEvents] = useState<CalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<Provider[]>([]);
  const [providerEvents, setProviderEvents] = useState<CalEvent[]>([]);
  const [showBriefing, setShowBriefing] = useState(false);
  const [selectedMiniDate, setSelectedMiniDate] = useState<Date | undefined>(new Date());

  // Drawer
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);

  // Inline draft
  const [draftSlot, setDraftSlot] = useState<{ date: string; hour: number } | null>(null);

  // Aura auto-schedule
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposedSlots, setProposedSlots] = useState<ProposedSlot[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Active drag task
  const [activeDragTask, setActiveDragTask] = useState<DbTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Briefing
  useEffect(() => {
    const shown = localStorage.getItem(BRIEFING_KEY());
    if (!shown) {
      const t = setTimeout(() => setShowBriefing(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismissBriefing = () => {
    setShowBriefing(false);
    localStorage.setItem(BRIEFING_KEY(), "1");
  };

  // Load DB events
  useEffect(() => {
    if (!user) return;
    setLoadingEvents(true);
    (supabase as any).from("calendar_events").select("*").eq("user_id", user.id).order("date")
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          setCustomEvents(data.map((row: any) => ({
            id: `custom-${row.id}`, dbId: row.id, title: row.title,
            date: row.date, startTime: row.start_time || undefined,
            endTime: row.end_time || undefined, type: "custom" as const,
            color: row.color || "bg-violet-500", provider: "dashiii" as Provider,
          })));
        }
        setLoadingEvents(false);
      });
  }, [user]);

  const saveCustomEvent = useCallback(async (newEvt: CalEvent) => {
    if (!user) { setCustomEvents(prev => [...prev, newEvt]); return; }
    const { data, error } = await (supabase as any).from("calendar_events").insert({
      user_id: user.id, title: newEvt.title, date: newEvt.date,
      start_time: newEvt.startTime || null, end_time: newEvt.endTime || null,
      color: newEvt.color || "bg-violet-500", type: "custom",
    }).select().single();
    if (!error && data) {
      setCustomEvents(prev => [...prev, { ...newEvt, id: `custom-${data.id}`, dbId: data.id }]);
    } else {
      setCustomEvents(prev => [...prev, newEvt]);
    }
  }, [user]);

  const handleConnectProvider = useCallback(async (provider: Provider) => {
    if (connectedProviders.includes(provider)) return;
    setConnectedProviders(p => [...p, provider]);
    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const dates = [yesterday, today, tomorrow];
    const mocks = MOCK_PROVIDER_EVENTS[provider];
    const injected: CalEvent[] = mocks.map((m, i) => ({
      id: `${provider}-${Date.now()}-${i}`, title: m.title!, date: dates[i % dates.length],
      startTime: m.startTime, endTime: m.endTime, type: "custom", color: m.color || "bg-blue-500", provider,
    }));
    setProviderEvents(prev => [...prev, ...injected]);
    toast.success(`${PROVIDER_COLORS[provider].label} synced — ${injected.length} events imported`);
  }, [connectedProviders]);

  // All merged events
  const allEvents: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    tasks.forEach(t => {
      const date = t.due_date || t.scheduled_date;
      if (date) out.push({
        id: `task-${t.id}`, title: t.title, date, type: "task",
        color: t.priority === "high" ? "bg-red-500" : "bg-emerald-500",
        done: t.done, priority: t.priority || undefined, provider: "dashiii", taskId: t.id,
      });
    });
    scheduleBlocks.forEach(b => {
      if (b.scheduled_date) out.push({
        id: `block-${b.id}`, title: b.title, date: b.scheduled_date,
        startTime: (b as any).time || undefined, endTime: (b as any).end_time || undefined,
        type: "block", color: "bg-blue-500", provider: "dashiii",
        taskId: b.task_id || undefined,
      });
    });
    customEvents.forEach(e => out.push(e));
    providerEvents.forEach(e => out.push(e));
    return out;
  }, [tasks, scheduleBlocks, customEvents, providerEvents]);

  // Proposed event overlay
  const proposedEvents: CalEvent[] = useMemo(() =>
    proposedSlots.map(s => ({
      id: `proposed-${s.taskId}`,
      title: `✨ ${s.taskTitle}`,
      date: s.date,
      startTime: `${String(s.startHour).padStart(2, "0")}:00`,
      endTime: `${String(s.endHour).padStart(2, "0")}:00`,
      type: "custom" as const,
      color: "bg-violet-500",
      provider: "dashiii" as Provider,
      isProposed: true,
      proposedTaskId: s.taskId,
    })),
    [proposedSlots]
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayEvents = useMemo(() => allEvents.filter(e => e.date === todayStr), [allEvents, todayStr]);
  const overdueTasks = useMemo(() =>
    tasks.filter(t => !t.done && t.due_date && isBefore(parseISO(t.due_date), startOfDay(new Date()))),
    [tasks]);

  const handleRescheduleTask = useCallback((taskId: string) => {
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    updateTask(taskId, { due_date: tomorrow });
    toast.success("Task rescheduled to tomorrow ✨");
  }, [updateTask]);

  const crmContacts = deals.map(d => ({ id: d.id, name: d.name, company: d.company }));

  const handleDayClick = (date: Date) => {
    setAddDefaultDate(format(date, "yyyy-MM-dd"));
    setAddDefaultTime("09:00");
    setShowAddModal(true);
  };

  const handleSlotClick = (date: string, hour: number) => {
    if (draftSlot?.date === date && draftSlot?.hour === hour) return;
    setDraftSlot({ date, hour });
  };

  const handleDraftSave = async (title: string, date: string, startTime: string) => {
    const h = parseInt(startTime.split(":")[0]);
    const endTime = `${String(h + 1).padStart(2, "0")}:00`;
    await saveCustomEvent({
      id: `custom-${Date.now()}`, title, date, startTime, endTime,
      type: "custom", color: "bg-violet-500", provider: "dashiii",
    });
    setDraftSlot(null);
    toast.success(`"${title}" added!`);
  };

  const handleAddEvent = async (e: { title: string; date: string; startTime: string; endTime: string; color: string; crmContact: string }) => {
    const crm = e.crmContact ? deals.find(d => d.id === e.crmContact) : null;
    await saveCustomEvent({
      id: `custom-${Date.now()}`,
      title: crm ? `${e.title} · ${crm.name}` : e.title,
      date: e.date, startTime: e.startTime, endTime: e.endTime,
      type: "custom", color: e.color, provider: "dashiii",
    });
    toast.success("Event added!");
  };

  // Drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("slot-")) return;
    // slot-{date}-{hour}
    const parts = overId.split("-");
    if (parts.length < 4) return;
    const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const hour = parseInt(parts[4]);
    if (isNaN(hour)) return;
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    scheduleTask(String(active.id), startTime, date);
    toast.success(`Task scheduled at ${startTime}`);
  }, [scheduleTask]);

  // Aura Auto-Schedule
  const handleAutoSchedule = useCallback(async () => {
    const unscheduled = tasks.filter(t => !t.done && t.status === "todo" && !t.scheduled_date);
    if (unscheduled.length === 0) { toast.info("No unscheduled tasks"); return; }

    setIsAnalyzing(true);
    setIsScanning(true);
    toast.info("✨ Aura is analyzing your schedule…");

    await new Promise(r => setTimeout(r, 2000));

    const gaps = findScheduleGaps([...allEvents], todayStr);
    const slots: ProposedSlot[] = unscheduled.slice(0, gaps.length).map((task, i) => ({
      taskId: task.id,
      taskTitle: task.title,
      date: todayStr,
      startHour: gaps[i],
      endHour: gaps[i] + 1,
    }));

    setProposedSlots(slots);
    setIsAnalyzing(false);
    setIsScanning(false);

    if (slots.length === 0) {
      toast.warning("No free slots found today. Try tomorrow!");
    } else {
      toast.success(`Aura found time for ${slots.length} task${slots.length > 1 ? "s" : ""}!`);
    }
  }, [tasks, allEvents, todayStr]);

  const handleApproveProposals = useCallback(async () => {
    for (const slot of proposedSlots) {
      const startTime = `${String(slot.startHour).padStart(2, "0")}:00`;
      await scheduleTask(slot.taskId, startTime, slot.date);
    }
    toast.success(`${proposedSlots.length} task${proposedSlots.length > 1 ? "s" : ""} scheduled! 🎉`);
    setProposedSlots([]);
  }, [proposedSlots, scheduleTask]);

  const handleRejectProposals = () => {
    setProposedSlots([]);
    toast.info("Proposals cleared");
  };

  // Navigate
  const navigate = (dir: 1 | -1) => {
    if (view === "month") setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const headerLabel = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d");
  };

  const calendarLayers = [
    { id: "dashiii" as Provider, label: "My Events", hex: "#8b5cf6" },
    { id: "google" as Provider, label: "Google", hex: "#4285f4" },
    { id: "outlook" as Provider, label: "Outlook", hex: "#0078d4" },
    { id: "apple" as Provider, label: "iCloud", hex: "#888" },
  ];
  const [activeLayers, setActiveLayers] = useState<Provider[]>(["dashiii"]);
  useEffect(() => {
    setActiveLayers(prev => [...new Set([...prev, ...connectedProviders])]);
  }, [connectedProviders]);

  const filteredEvents = useMemo(() => {
    const base = allEvents.filter(e => activeLayers.includes(e.provider || "dashiii"));
    return [...base, ...proposedEvents];
  }, [allEvents, activeLayers, proposedEvents]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`flex h-full overflow-hidden ${pageLight ? "page-light" : ""}`}>
        {/* ── Left Sidebar ── */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border/30 overflow-y-auto p-4 gap-5"
          style={{ background: "hsl(var(--card) / 0.5)" }}>
          <button
            onClick={() => { setAddDefaultDate(format(new Date(), "yyyy-MM-dd")); setAddDefaultTime("09:00"); setShowAddModal(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
            style={{ boxShadow: "0 4px 14px hsl(var(--primary) / 0.3)" }}>
            <Plus size={15} /> New Event
          </button>
          <div>
            <MiniCalendar
              mode="single" selected={selectedMiniDate}
              onSelect={(d) => { setSelectedMiniDate(d); if (d) setCurrentDate(d); }}
              className="rounded-xl p-0 text-xs w-full"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Calendars</p>
            <div className="space-y-1">
              {calendarLayers.map(layer => {
                const active = activeLayers.includes(layer.id);
                const isConnected = layer.id === "dashiii" || connectedProviders.includes(layer.id);
                if (!isConnected) return null;
                return (
                  <button key={layer.id}
                    onClick={() => setActiveLayers(prev => active ? prev.filter(p => p !== layer.id) : [...prev, layer.id])}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-left">
                    <div className="w-3 h-3 rounded-sm shrink-0 transition-opacity" style={{ background: layer.hex, opacity: active ? 1 : 0.3 }} />
                    <span className={`text-xs font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}>{layer.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setShowSyncModal(true)}
            className="w-full flex flex-col gap-2 px-3 py-3 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-2 w-full">
              <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500 text-primary shrink-0" />
              <span className="font-semibold text-foreground/70 group-hover:text-foreground">Sync External Calendars</span>
              {connectedProviders.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-primary">{connectedProviders.length} connected</span>
              )}
            </div>
          {/* Provider pills — each clickable to open sync modal */}
          <div className="flex items-center gap-2 w-full flex-wrap">
            {([
              { id: "google" as Provider, label: "Google", bg: "#4285f4", icon: "G", shape: "rounded-full" },
              { id: "outlook" as Provider, label: "Outlook", bg: "#0078d4", icon: "O", shape: "rounded-sm" },
              { id: "apple" as Provider, label: "iCloud", bg: "#555", icon: "🍎", shape: "rounded-full" },
            ] as const).map(p => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); if (!connectedProviders.includes(p.id)) setShowSyncModal(true); }}
                title={connectedProviders.includes(p.id) ? `${p.label} connected` : `Connect ${p.label}`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all hover:scale-105 ${connectedProviders.includes(p.id) ? "border" : "opacity-50 hover:opacity-80"}`}
                style={connectedProviders.includes(p.id) ? { background: `${p.bg}15`, color: p.bg, border: `1px solid ${p.bg}30` } : { background: "hsl(var(--secondary)/0.6)", color: "hsl(var(--muted-foreground))" }}
              >
                <span className={`w-3 h-3 ${p.shape} text-white text-[6px] font-bold flex items-center justify-center`} style={{ background: p.bg }}>{p.icon}</span>
                {p.label}
                {!connectedProviders.includes(p.id) && <span className="ml-0.5 text-[8px] opacity-60">+</span>}
              </button>
            ))}
          </div>
          </button>
        </div>

        {/* ── Main Area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-4 md:px-5 py-5" onClick={() => setDraftSlot(null)}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5 gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={16} className="text-muted-foreground" /></button>
              <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><ChevronRight size={16} className="text-muted-foreground" /></button>
              <h3 className="text-sm font-bold text-foreground ml-1">{headerLabel()}</h3>
              <button onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 rounded-lg bg-secondary text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-1">Today</button>
            </div>
            <div className="flex items-center gap-2">
              {loadingEvents && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
              <div className="flex rounded-xl bg-secondary p-0.5">
                {(["day", "week", "month"] as CalView[]).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
                ))}
              </div>
              <button
                onClick={() => setPageLight(p => !p)}
                className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title={pageLight ? "Switch to dark mode" : "Switch to light mode"}
              >
                {pageLight ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              <button onClick={() => { setAddDefaultDate(format(new Date(), "yyyy-MM-dd")); setShowAddModal(true); }}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                <Plus size={13} />
              </button>
              <button onClick={() => setShowSyncModal(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"><RefreshCw size={14} /></button>
            </div>
          </div>

          {/* Aura scanning overlay */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ top: 0 }}
                animate={{ top: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="absolute left-0 right-0 h-0.5 pointer-events-none z-30"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)",
                  boxShadow: "0 0 12px 2px rgba(139,92,246,0.4)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Calendar views */}
          <div onClick={e => e.stopPropagation()}>
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {view === "month" && <MonthView currentMonth={currentDate} events={filteredEvents} onDayClick={handleDayClick} />}
                {view === "week" && (
                  <WeekView
                    currentWeek={currentDate}
                    events={filteredEvents}
                    onDayClick={handleDayClick}
                    draftSlot={draftSlot}
                    onSlotClick={handleSlotClick}
                    onDraftSave={handleDraftSave}
                    onDraftCancel={() => setDraftSlot(null)}
                  />
                )}
                {view === "day" && (
                  <DayView
                    currentDay={currentDate}
                    events={filteredEvents}
                    onTimeClick={handleDayClick}
                    draftSlot={draftSlot}
                    onSlotClick={handleSlotClick}
                    onDraftSave={handleDraftSave}
                    onDraftCancel={() => setDraftSlot(null)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right Task Drawer ── */}
        <TaskDrawer
          tasks={tasks}
          onAutoSchedule={handleAutoSchedule}
          isAnalyzing={isAnalyzing}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed(v => !v)}
        />

        {/* ── Drag Overlay ── */}
        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div className="px-3 py-2 rounded-xl border border-white/20 text-xs font-medium text-foreground shadow-2xl cursor-grabbing"
              style={{ background: "hsl(var(--card) / 0.95)", backdropFilter: "blur(12px)", minWidth: 160 }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {activeDragTask.title}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* ── Aura Approval Bar ── */}
      <AnimatePresence>
        {proposedSlots.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-2xl"
            style={{
              background: "hsl(var(--card) / 0.92)",
              border: "1px solid hsl(var(--border))",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 30px rgba(139,92,246,0.2), 0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <Sparkles size={16} className="text-violet-400 shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Aura found time for <span className="text-violet-400 font-bold">{proposedSlots.length}</span> task{proposedSlots.length > 1 ? "s" : ""} today.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={handleRejectProposals}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all border border-border/40">
                Reject
              </button>
              <button onClick={handleApproveProposals}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))", boxShadow: "0 4px 16px hsl(160 84% 39% / 0.4)" }}>
                <CheckCircle2 size={13} /> Approve Plan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddEventModal defaultDate={addDefaultDate} defaultTime={addDefaultTime}
            onClose={() => setShowAddModal(false)} onSave={handleAddEvent} crmContacts={crmContacts} />
        )}
        {showSyncModal && (
          <IntegrationModal connectedProviders={connectedProviders}
            onConnect={handleConnectProvider} onClose={() => setShowSyncModal(false)} />
        )}
        {showBriefing && (
          <AuraDailyBriefing todayEvents={todayEvents} overdueTasks={overdueTasks}
            onReschedule={handleRescheduleTask} onDismiss={dismissBriefing} />
        )}
      </AnimatePresence>
    </DndContext>
  );
};

export default CalendarView;
