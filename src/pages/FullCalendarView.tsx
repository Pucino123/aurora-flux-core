import React, { useState, useMemo, useEffect, useCallback } from "react";
import SEO from "@/components/SEO";
import { useFlux } from "@/context/FluxContext";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, addDays, isSameMonth, getISOWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Plus, CalendarDays, Grip, Calendar, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GoogleCalendarSync from "@/components/focus/GoogleCalendarSync";

type ViewMode = "month" | "week";

const COLOR_MAP: Record<string, string> = {
  deep: "bg-primary/20 border-primary/40 text-primary",
  meeting: "bg-secondary/60 border-border/50 text-foreground",
  personal: "bg-secondary/40 border-border/40 text-foreground/80",
  break: "bg-muted/50 border-border/30 text-muted-foreground",
  workout: "bg-secondary/50 border-border/40 text-foreground/80",
  reading: "bg-primary/15 border-primary/30 text-primary/80",
  google: "bg-primary/10 border-primary/30 text-primary/90",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-secondary/60 text-muted-foreground border-border/30",
  low: "bg-muted/40 text-muted-foreground border-border/30",
};

interface GoogleEvent {
  id: string;
  user_id: string;
  google_event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  scheduled_date: string;
  all_day: boolean;
  source: string;
}

const FullCalendarView = () => {
  const { tasks, scheduleBlocks, createBlock, updateTask, updateBlock } = useFlux();
  const [pageLight, setPageLight] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockTime, setNewBlockTime] = useState("09:00");
  const [newBlockType, setNewBlockType] = useState("deep");
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);

  // Fetch Google Calendar events
  const fetchGoogleEvents = useCallback(async () => {
    const { data } = await (supabase as any).from("google_calendar_events").select("*").order("start_time");
    if (data) setGoogleEvents(data as GoogleEvent[]);
  }, []);

  useEffect(() => { fetchGoogleEvents(); }, [fetchGoogleEvents]);

  // ── Month grid ──
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // ── Week grid ──
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  const dayEvents = useMemo(() => {
    const map = new Map<string, { tasks: typeof tasks; blocks: typeof scheduleBlocks; googleEvents: GoogleEvent[] }>();
    const allDays = viewMode === "month" ? monthDays : weekDays;
    for (const day of allDays) {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, {
        tasks: tasks.filter(t => t.due_date === key || t.scheduled_date === key),
        blocks: scheduleBlocks.filter(b => b.scheduled_date === key),
        googleEvents: googleEvents.filter(e => e.scheduled_date === key),
      });
    }
    return map;
  }, [monthDays, weekDays, tasks, scheduleBlocks, googleEvents, viewMode]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = dayEvents.get(selectedKey) || { tasks: [], blocks: [], googleEvents: [] };

  const handleAddBlock = async () => {
    if (!newBlockTitle.trim()) return;
    await createBlock({
      title: newBlockTitle.trim(),
      time: newBlockTime,
      duration: "60m",
      type: newBlockType,
      scheduled_date: selectedKey,
      task_id: null,
    });
    toast.success("Event added");
    setNewBlockTitle("");
    setShowAddBlock(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("task-id", taskId);
    setDraggingTaskId(taskId);
  };

  const handleBlockDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData("block-id", blockId);
    setDraggingBlockId(blockId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDraggingBlockId(null);
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("task-id");
    const blockId = e.dataTransfer.getData("block-id");
    if (taskId) {
      await updateTask(taskId, { scheduled_date: targetDate, due_date: targetDate });
      toast.success("Task rescheduled");
    } else if (blockId) {
      await updateBlock(blockId, { scheduled_date: targetDate });
      toast.success("Block rescheduled");
    }
    setDragOverDate(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <SEO title="Calendar" description="Smart scheduling and time management with drag-and-drop calendar and Google Calendar sync." url="/" keywords="calendar, scheduling, time blocking, productivity, Google Calendar sync" />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <CalendarDays size={20} className="text-primary" /> Calendar
          </h2>
          <p className="text-sm text-muted-foreground">Plan your time with drag-and-drop</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Google Calendar Sync */}
          <GoogleCalendarSync onSynced={fetchGoogleEvents} />

          {/* View toggle */}
          <div className="flex items-center bg-secondary/50 rounded-lg p-0.5">
            {(["month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  viewMode === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
            Today
          </button>
          <button onClick={() => { viewMode === "month" ? setCurrentDate(subMonths(currentDate, 1)) : setSelectedDate(addDays(selectedDate, -7)); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <button onClick={() => { viewMode === "month" ? setCurrentDate(addMonths(currentDate, 1)) : setSelectedDate(addDays(selectedDate, 7)); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main grid */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-3">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy")
              : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
          </h3>

          {viewMode === "month" ? (
            /* ── Month view ── */
            <div>
              {/* Header row */}
              <div className="flex">
                <div className="w-8 shrink-0" />
                <div className="flex-1 grid grid-cols-7 gap-px bg-border/30 rounded-t-xl overflow-hidden">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="bg-background text-[10px] font-semibold text-muted-foreground text-center py-2">{d}</div>
                  ))}
                </div>
              </div>
              {/* Calendar rows with week numbers */}
              <div className="flex">
                {/* Week number column */}
                <div className="w-8 shrink-0 flex flex-col">
                  {Array.from({ length: Math.ceil(monthDays.length / 7) }, (_, weekIdx) => {
                    const firstDayOfWeek = monthDays[weekIdx * 7];
                    return (
                      <div key={weekIdx} className="flex-1 flex items-start justify-center pt-2 text-[10px] font-medium text-muted-foreground/50">
                        {getISOWeek(firstDayOfWeek)}
                      </div>
                    );
                  })}
                </div>
                {/* Days grid */}
                <div className="flex-1 grid grid-cols-7 gap-px bg-border/20 border border-border/20 rounded-b-xl overflow-hidden">
                  {monthDays.map(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const events = dayEvents.get(key);
                    const totalCount = (events?.tasks.length || 0) + (events?.blocks.length || 0) + (events?.googleEvents.length || 0);
                    const hasEvents = totalCount > 0;
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDragOver = dragOverDate === key;

                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedDate(day)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverDate(key); }}
                        onDragLeave={() => setDragOverDate(null)}
                        onDrop={(e) => handleDrop(e, key)}
                        className={`bg-background min-h-[80px] p-1.5 cursor-pointer transition-all duration-150 ${
                          isSelected ? "ring-inset ring-1 ring-primary/50 bg-primary/[0.02]" : "hover:bg-secondary/30"
                        } ${isDragOver && (draggingTaskId || draggingBlockId) ? "bg-primary/10 ring-inset ring-2 ring-primary/40 scale-[0.99]" : ""}`}
                      >
                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday(day) ? "bg-primary text-primary-foreground" : isSelected ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/30"
                        }`}>
                          {format(day, "d")}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {events?.blocks.slice(0, 1).map(b => (
                            <div
                              key={b.id}
                              draggable
                              onDragStart={(e) => handleBlockDragStart(e, b.id)}
                              onDragEnd={handleDragEnd}
                              className={`text-[9px] px-1 py-0.5 rounded truncate border cursor-grab flex items-center gap-0.5 active:opacity-40 transition-opacity ${COLOR_MAP[b.type] || COLOR_MAP.deep} ${draggingBlockId === b.id ? "opacity-30" : ""}`}
                            >
                              <Grip size={7} className="shrink-0 opacity-50" />
                              {b.time} {b.title}
                            </div>
                          ))}
                          {events?.googleEvents.slice(0, 1).map(e => (
                            <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded truncate border ${COLOR_MAP.google} flex items-center gap-0.5`}>
                              <Calendar size={6} className="shrink-0" />
                              {e.start_time} {e.title}
                            </div>
                          ))}
                          {events?.tasks.slice(0, 1).map(t => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onDragEnd={handleDragEnd}
                              className={`text-[9px] px-1 py-0.5 rounded truncate bg-secondary/60 text-muted-foreground cursor-grab flex items-center gap-0.5 active:opacity-40 transition-opacity ${
                                draggingTaskId === t.id ? "opacity-30" : ""
                              }`}
                            >
                              <Grip size={7} className="shrink-0 opacity-50" />
                              {t.title}
                            </div>
                          ))}
                          {hasEvents && totalCount > 3 && (
                            <div className="text-[9px] text-muted-foreground/50 px-1">+{totalCount - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ── Week view ── */
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-8 gap-px bg-border/20 rounded-t-xl overflow-hidden border border-border/20 border-b-0">
                  <div className="bg-background py-2" />
                  {weekDays.map(day => (
                    <div
                      key={format(day, "yyyy-MM-dd")}
                      onClick={() => setSelectedDate(day)}
                      className={`bg-background text-center py-2 cursor-pointer hover:bg-secondary/30 transition-colors ${
                        isSameDay(day, selectedDate) ? "bg-primary/5" : ""
                      }`}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground">{format(day, "EEE")}</p>
                      <p className={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}>{format(day, "d")}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-border/20 rounded-b-xl overflow-hidden">
                  {hours.map(hour => (
                    <div key={hour} className="grid grid-cols-8 gap-px bg-border/10 min-h-[40px]">
                      <div className="bg-background px-2 py-1 text-[10px] text-muted-foreground/50 text-right">{hour}:00</div>
                      {weekDays.map(day => {
                        const key = format(day, "yyyy-MM-dd");
                        const timeStr = `${String(hour).padStart(2, "0")}:00`;
                        const blocks = (dayEvents.get(key)?.blocks || []).filter(b => b.time === timeStr);
                        const gEvents = (dayEvents.get(key)?.googleEvents || []).filter(e => e.start_time === timeStr || e.start_time.startsWith(`${String(hour).padStart(2, "0")}`));
                        return (
                          <div
                            key={key}
                            className={`bg-background relative p-0.5 hover:bg-secondary/20 transition-colors ${
                              isSameDay(day, selectedDate) ? "bg-primary/5" : ""
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverDate(key); }}
                            onDrop={(e) => handleDrop(e, key)}
                          >
                            {blocks.map(b => (
                              <div
                                key={b.id}
                                draggable
                                onDragStart={(e) => handleBlockDragStart(e, b.id)}
                                onDragEnd={handleDragEnd}
                                className={`text-[9px] px-1 py-0.5 rounded truncate border cursor-grab active:opacity-40 transition-opacity ${COLOR_MAP[b.type] || COLOR_MAP.deep} ${draggingBlockId === b.id ? "opacity-30" : ""}`}
                              >
                                {b.title}
                              </div>
                            ))}
                            {gEvents.map(e => (
                              <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded truncate border ${COLOR_MAP.google} flex items-center gap-0.5`}>
                                <Calendar size={6} className="shrink-0" />
                                {e.title}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — selected day */}
        <div className="xl:w-[280px] shrink-0">
          <div className="flux-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">{format(selectedDate, "EEEE")}</p>
                <p className="font-bold font-display">{format(selectedDate, "MMMM d, yyyy")}</p>
              </div>
              <button
                onClick={() => setShowAddBlock(!showAddBlock)}
                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Add block form */}
            <AnimatePresence>
              {showAddBlock && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="space-y-2 py-2 border-y border-border/30">
                    <input
                      value={newBlockTitle}
                      onChange={(e) => setNewBlockTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
                      placeholder="Event title..."
                      className="w-full px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input type="time" value={newBlockTime} onChange={(e) => setNewBlockTime(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/40 border border-border/30 text-xs outline-none" />
                      <select value={newBlockType} onChange={(e) => setNewBlockType(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/40 border border-border/30 text-xs outline-none">
                        <option value="deep">Deep Work</option>
                        <option value="meeting">Meeting</option>
                        <option value="personal">Personal</option>
                        <option value="break">Break</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddBlock} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Add</button>
                      <button onClick={() => setShowAddBlock(false)} className="py-1.5 px-3 rounded-lg bg-secondary/50 text-muted-foreground text-xs">Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Events list */}
            <div className="space-y-2">
              {selectedEvents.blocks.length === 0 && selectedEvents.tasks.length === 0 && selectedEvents.googleEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events today</p>
              ) : (
                <>
                  {/* Google events */}
                  {selectedEvents.googleEvents.map(e => (
                    <div key={e.id} className={`flex items-start gap-2 p-2 rounded-lg border ${COLOR_MAP.google}`}>
                      <Calendar size={12} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.title}</p>
                        <p className="text-[10px] opacity-70">{e.all_day ? "All day" : `${e.start_time}${e.end_time ? ` – ${e.end_time}` : ""}`}</p>
                      </div>
                      <span className="text-[8px] text-muted-foreground/50 shrink-0 mt-0.5">Google</span>
                    </div>
                  ))}
                  {/* Schedule blocks */}
                  {selectedEvents.blocks.map(b => {
                    const linkedTask = b.task_id ? tasks.find(t => t.id === b.task_id) : null;
                    return (
                      <div key={b.id} className={`flex items-start gap-2 p-2 rounded-lg border ${COLOR_MAP[b.type] || COLOR_MAP.deep}`}>
                        <Clock size={12} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{b.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] opacity-70">{b.time} · {b.duration}</p>
                            {linkedTask?.priority && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${PRIORITY_BADGE[linkedTask.priority] || PRIORITY_BADGE.medium}`}>
                                {linkedTask.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Tasks */}
                  {selectedEvents.tasks.map(t => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-start gap-2 p-2 rounded-lg bg-secondary/40 border border-border/20 cursor-grab hover:bg-secondary/60 transition-all active:opacity-40 ${
                        draggingTaskId === t.id ? "opacity-30 scale-95" : ""
                      }`}
                    >
                      <CheckCircle2 size={12} className={`mt-0.5 shrink-0 ${t.done ? "text-primary" : "text-muted-foreground/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${t.done ? "line-through text-muted-foreground/50" : ""}`}>{t.title}</p>
                        {t.priority && <p className="text-[10px] text-muted-foreground capitalize">{t.priority}</p>}
                      </div>
                      <Grip size={10} className="text-muted-foreground/30 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullCalendarView;
