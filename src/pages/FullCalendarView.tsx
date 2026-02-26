import React, { useState, useMemo, useCallback } from "react";
import { useFlux } from "@/context/FluxContext";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, addDays, isSameMonth,
  parseISO, startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Plus, CalendarDays, Grip, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type ViewMode = "month" | "week";

const COLOR_MAP: Record<string, string> = {
  deep: "bg-primary/20 border-primary/40 text-primary",
  meeting: "bg-blue-500/20 border-blue-500/40 text-blue-400",
  personal: "bg-green-500/20 border-green-500/40 text-green-400",
  break: "bg-orange-500/20 border-orange-500/40 text-orange-400",
};

const FullCalendarView = () => {
  const { tasks, scheduleBlocks, createBlock, updateTask } = useFlux();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockTime, setNewBlockTime] = useState("09:00");
  const [newBlockType, setNewBlockType] = useState("deep");
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // ── Month grid ──
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // ── Week grid ──
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm

  const dayEvents = useMemo(() => {
    const map = new Map<string, { tasks: typeof tasks; blocks: typeof scheduleBlocks }>();
    const allDays = viewMode === "month" ? monthDays : weekDays;
    for (const day of allDays) {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, {
        tasks: tasks.filter(t => t.due_date === key || t.scheduled_date === key),
        blocks: scheduleBlocks.filter(b => b.scheduled_date === key),
      });
    }
    return map;
  }, [monthDays, weekDays, tasks, scheduleBlocks, viewMode]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = dayEvents.get(selectedKey) || { tasks: [], blocks: [] };

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

  // Drag to reschedule task
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("task-id", taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("task-id");
    if (taskId) {
      await updateTask(taskId, { scheduled_date: targetDate, due_date: targetDate });
      toast.success("Task rescheduled");
    }
    setDragOverDate(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <CalendarDays size={20} className="text-primary" /> Calendar
          </h2>
          <p className="text-sm text-muted-foreground">Plan your time with drag-and-drop</p>
        </div>
        <div className="flex items-center gap-2">
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
              <div className="grid grid-cols-7 gap-px bg-border/30 rounded-t-xl overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="bg-background text-[10px] font-semibold text-muted-foreground text-center py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/20 rounded-b-xl overflow-hidden">
                {monthDays.map(day => {
                  const key = format(day, "yyyy-MM-dd");
                  const events = dayEvents.get(key);
                  const hasEvents = (events?.tasks.length || 0) + (events?.blocks.length || 0) > 0;
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
                      } ${isDragOver && draggingTaskId ? "bg-primary/10 ring-inset ring-2 ring-primary/40 scale-[0.99]" : ""}`}
                    >
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(day) ? "bg-primary text-primary-foreground" : isSelected ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/30"
                      }`}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {events?.blocks.slice(0, 2).map(b => (
                          <div key={b.id} className={`text-[9px] px-1 py-0.5 rounded truncate border ${COLOR_MAP[b.type] || COLOR_MAP.deep}`}>
                            {b.time} {b.title}
                          </div>
                        ))}
                        {events?.tasks.slice(0, 2).map(t => (
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
                        {hasEvents && (events?.tasks.length || 0) + (events?.blocks.length || 0) > 4 && (
                          <div className="text-[9px] text-muted-foreground/50 px-1">+{((events?.tasks.length || 0) + (events?.blocks.length || 0)) - 4} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Week view ── */
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Day headers */}
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
                {/* Time slots */}
                <div className="border border-border/20 rounded-b-xl overflow-hidden">
                  {hours.map(hour => (
                    <div key={hour} className="grid grid-cols-8 gap-px bg-border/10 min-h-[40px]">
                      <div className="bg-background px-2 py-1 text-[10px] text-muted-foreground/50 text-right">{hour}:00</div>
                      {weekDays.map(day => {
                        const key = format(day, "yyyy-MM-dd");
                        const timeStr = `${String(hour).padStart(2, "0")}:00`;
                        const blocks = (dayEvents.get(key)?.blocks || []).filter(b => b.time === timeStr);
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
                              <div key={b.id} className={`text-[9px] px-1 py-0.5 rounded truncate border ${COLOR_MAP[b.type] || COLOR_MAP.deep}`}>
                                {b.title}
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
              {selectedEvents.blocks.length === 0 && selectedEvents.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events today</p>
              ) : (
                <>
                  {selectedEvents.blocks.map(b => (
                    <div key={b.id} className={`flex items-start gap-2 p-2 rounded-lg border ${COLOR_MAP[b.type] || COLOR_MAP.deep}`}>
                      <Clock size={12} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{b.title}</p>
                        <p className="text-[10px] opacity-70">{b.time} · {b.duration}</p>
                      </div>
                    </div>
                  ))}
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
