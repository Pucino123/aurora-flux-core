import React, { useState, useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { useCRM } from "@/context/CRMContext";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, getISOWeek, addWeeks, subWeeks,
  eachHourOfInterval, startOfDay, endOfDay, isSameMonth, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle2, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type CalView = "month" | "week" | "agenda";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: "task" | "block" | "custom";
  color?: string; // tailwind bg token
  done?: boolean;
  priority?: string;
}

const EVENT_COLORS = [
  { label: "Blue — Meeting", value: "bg-blue-500", hex: "#3b82f6" },
  { label: "Red — Deadline", value: "bg-red-500", hex: "#ef4444" },
  { label: "Green — Task", value: "bg-emerald-500", hex: "#10b981" },
  { label: "Amber — Reminder", value: "bg-amber-500", hex: "#f59e0b" },
  { label: "Purple — Focus", value: "bg-violet-500", hex: "#8b5cf6" },
];

const hexFor = (color?: string) =>
  EVENT_COLORS.find(c => c.value === color)?.hex ?? "#8b5cf6";

// ── Add Event Modal ─────────────────────────────────────────────────────────

interface AddEventModalProps {
  defaultDate: string;
  onClose: () => void;
  onSave: (e: { title: string; date: string; startTime: string; endTime: string; color: string; crmContact: string }) => void;
  crmContacts: { id: string; name: string; company: string }[];
}

const AddEventModal: React.FC<AddEventModalProps> = ({ defaultDate, onClose, onSave, crmContacts }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState("bg-violet-500");
  const [crmContact, setCrmContact] = useState("");

  const handleSave = () => {
    if (!title.trim()) { toast.error("Please enter an event title"); return; }
    onSave({ title: title.trim(), date, startTime, endTime, color, crmContact });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full md:max-w-md bg-card border border-border rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground">Add Event</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Event Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="e.g. Investor Meeting, Project Deadline…"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 md:col-span-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">End</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Color / Type */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Event Type</label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    color === c.value
                      ? "border-foreground/30 bg-secondary text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/20"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.value}`} />
                  {c.label.split(" — ")[1]}
                </button>
              ))}
            </div>
          </div>

          {/* CRM Contact linker */}
          {crmContacts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Link CRM Contact (optional)</label>
              <select
                value={crmContact}
                onChange={e => setCrmContact(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
              >
                <option value="">— None —</option>
                {crmContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} · {c.company}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Add Event
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Event Pill ──────────────────────────────────────────────────────────────

const EventPill: React.FC<{ event: CalEvent; compact?: boolean }> = ({ event, compact }) => {
  const hex = hexFor(event.color);
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: `${hex}cc` }}
      title={event.title}
    >
      {!compact && event.startTime && <span className="opacity-70 shrink-0">{event.startTime}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  );
};

// ── Month View ──────────────────────────────────────────────────────────────

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
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-8 gap-px bg-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-card text-[10px] font-semibold text-muted-foreground text-center py-2">Wk</div>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
        <div key={d} className="bg-card text-[10px] font-semibold text-muted-foreground text-center py-2">{d}</div>
      ))}

      {days.map((day, i) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = dayEventMap.get(key) || [];
        const inMonth = isSameMonth(day, currentMonth);
        const isWeekStart = i % 7 === 0;

        return (
          <React.Fragment key={key}>
            {isWeekStart && (
              <div className="bg-card text-[9px] text-muted-foreground/40 flex items-start justify-center pt-1.5 font-mono">
                {getISOWeek(day)}
              </div>
            )}
            <button
              onClick={() => onDayClick(day)}
              className={`bg-card min-h-[80px] p-1 text-left relative group transition-colors hover:bg-secondary/30 ${!inMonth ? "opacity-30" : ""}`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 transition-colors ${
                isToday(day) ? "bg-primary text-primary-foreground font-bold" : "text-foreground/70"
              }`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(e => <EventPill key={e.id} event={e} compact />)}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-start justify-end p-1 pointer-events-none">
                <Plus size={10} className="text-primary/50" />
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Week View ───────────────────────────────────────────────────────────────

const WeekView: React.FC<{
  currentWeek: Date;
  events: CalEvent[];
  onDayClick: (date: Date) => void;
}> = ({ currentWeek, events, onDayClick }) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 – 22:00

  const dayEventMap = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach(e => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="overflow-auto rounded-2xl border border-border">
      {/* Day headers */}
      <div className="grid grid-cols-8 bg-secondary/30 border-b border-border">
        <div className="p-2 text-[10px] text-muted-foreground/40 text-center">UTC</div>
        {days.map(d => (
          <button
            key={format(d, "yyyy-MM-dd")}
            onClick={() => onDayClick(d)}
            className={`p-2 text-center hover:bg-secondary/60 transition-colors ${isToday(d) ? "bg-primary/10" : ""}`}
          >
            <p className="text-[10px] text-muted-foreground">{format(d, "EEE")}</p>
            <p className={`text-sm font-bold ${isToday(d) ? "text-primary" : "text-foreground/80"}`}>{format(d, "d")}</p>
          </button>
        ))}
      </div>

      {/* Hour rows */}
      <div className="grid grid-cols-8">
        {hours.map(h => (
          <React.Fragment key={h}>
            <div className="p-1.5 text-[9px] text-muted-foreground/40 text-right font-mono border-t border-border/30">
              {h.toString().padStart(2, "0")}:00
            </div>
            {days.map(d => {
              const key = format(d, "yyyy-MM-dd");
              const slotEvents = (dayEventMap.get(key) || []).filter(e => {
                if (!e.startTime) return false;
                const eH = parseInt(e.startTime.split(":")[0]);
                return eH === h;
              });
              return (
                <button
                  key={key}
                  onClick={() => onDayClick(d)}
                  className={`min-h-[48px] p-0.5 border-t border-border/30 hover:bg-secondary/30 transition-colors ${isToday(d) ? "bg-primary/5" : ""}`}
                >
                  <div className="space-y-0.5">
                    {slotEvents.map(e => <EventPill key={e.id} event={e} />)}
                  </div>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── Agenda View ─────────────────────────────────────────────────────────────

const AgendaView: React.FC<{
  events: CalEvent[];
  onAdd: () => void;
}> = ({ events, onAdd }) => {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = sorted.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <CalendarDays size={32} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No upcoming events</p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Add First Event
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map(dateStr => {
        const d = parseISO(dateStr);
        return (
          <div key={dateStr}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex flex-col items-center w-10 h-10 rounded-xl shrink-0 ${isToday(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                <span className="text-[9px] font-semibold mt-0.5">{format(d, "EEE").toUpperCase()}</span>
                <span className="text-sm font-bold leading-tight">{format(d, "d")}</span>
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-1.5 ml-13 pl-2">
              {byDate[dateStr].map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ background: hexFor(e.color) }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${e.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{e.title}</p>
                    {e.startTime && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {e.startTime}{e.endTime ? ` – ${e.endTime}` : ""}
                      </p>
                    )}
                  </div>
                  {e.type === "task" && (
                    <CheckCircle2 size={14} className={e.done ? "text-emerald-500" : "text-muted-foreground/30"} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Calendar ───────────────────────────────────────────────────────────

const CalendarView = () => {
  const { tasks, scheduleBlocks } = useFlux();
  const { deals } = useCRM();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalView>("month");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEvents, setCustomEvents] = useState<CalEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem("dashiii_cal_events") || "[]"); } catch { return []; }
  });

  const saveCustomEvents = (evts: CalEvent[]) => {
    setCustomEvents(evts);
    localStorage.setItem("dashiii_cal_events", JSON.stringify(evts));
  };

  // Build unified event list from tasks, schedule blocks, and custom events
  const allEvents: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    tasks.forEach(t => {
      const date = t.due_date || t.scheduled_date;
      if (date) out.push({ id: `task-${t.id}`, title: t.title, date, type: "task", color: t.priority === "high" ? "bg-red-500" : "bg-emerald-500", done: t.done, priority: t.priority || undefined });
    });
    scheduleBlocks.forEach(b => {
      if (b.scheduled_date) out.push({ id: `block-${b.id}`, title: b.title, date: b.scheduled_date, startTime: (b as any).time || undefined, endTime: (b as any).end_time || undefined, type: "block", color: "bg-blue-500" });
    });
    customEvents.forEach(e => out.push(e));
    return out;
  }, [tasks, scheduleBlocks, customEvents]);

  const crmContacts = deals.map(d => ({ id: d.id, name: d.name, company: d.company }));

  const handleDayClick = (date: Date) => {
    setAddDefaultDate(format(date, "yyyy-MM-dd"));
    setShowAddModal(true);
  };

  const handleAddEvent = (e: { title: string; date: string; startTime: string; endTime: string; color: string; crmContact: string }) => {
    const crm = e.crmContact ? deals.find(d => d.id === e.crmContact) : null;
    const newEvt: CalEvent = {
      id: `custom-${Date.now()}`,
      title: crm ? `${e.title} · ${crm.name}` : e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      type: "custom",
      color: e.color,
    };
    saveCustomEvents([...customEvents, newEvt]);
    toast.success("Event added!");
  };

  const prevLabel = view === "month" ? "Prev Month" : view === "week" ? "Prev Week" : "";
  const nextLabel = view === "month" ? "Next Month" : view === "week" ? "Next Week" : "";

  const navigate = (dir: 1 | -1) => {
    if (view === "month") setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const headerLabel = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return "Upcoming";
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Calendar</h2>
          <p className="text-sm text-muted-foreground">Your schedule at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl bg-secondary p-0.5 text-xs">
            {(["month", "week", "agenda"] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setAddDefaultDate(format(new Date(), "yyyy-MM-dd")); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={13} /> Add Event
          </button>
        </div>
      </div>

      {/* Navigation */}
      {view !== "agenda" && (
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors" title={prevLabel}>
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">{headerLabel()}</h3>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Today
            </button>
          </div>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-secondary transition-colors" title={nextLabel}>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {view === "month" && (
            <MonthView currentMonth={currentDate} events={allEvents} onDayClick={handleDayClick} />
          )}
          {view === "week" && (
            <WeekView currentWeek={currentDate} events={allEvents} onDayClick={handleDayClick} />
          )}
          {view === "agenda" && (
            <AgendaView events={allEvents} onAdd={() => { setAddDefaultDate(format(new Date(), "yyyy-MM-dd")); setShowAddModal(true); }} />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddEventModal
            defaultDate={addDefaultDate}
            onClose={() => setShowAddModal(false)}
            onSave={handleAddEvent}
            crmContacts={crmContacts}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarView;
