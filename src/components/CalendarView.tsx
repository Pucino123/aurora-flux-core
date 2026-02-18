import React, { useState, useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CalendarView = () => {
  const { tasks, scheduleBlocks } = useFlux();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayEvents = useMemo(() => {
    const map = new Map<string, { tasks: typeof tasks; blocks: typeof scheduleBlocks }>();
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, {
        tasks: tasks.filter(t => t.due_date === key || t.scheduled_date === key),
        blocks: scheduleBlocks.filter(b => b.scheduled_date === key),
      });
    }
    return map;
  }, [days, tasks, scheduleBlocks]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvents = selectedKey ? dayEvents.get(selectedKey) : null;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display">Calendar</h2>
        <p className="text-sm text-muted-foreground">Your schedule at a glance</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-2">{d}</div>
            ))}
            {days.map(day => {
              const key = format(day, "yyyy-MM-dd");
              const events = dayEvents.get(key);
              const hasEvents = (events?.tasks.length || 0) + (events?.blocks.length || 0) > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const inMonth = day.getMonth() === currentMonth.getMonth();

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`relative p-2 rounded-xl text-xs transition-all ${
                    isSelected ? "bg-primary text-primary-foreground" :
                    isToday(day) ? "bg-primary/10 text-primary font-semibold" :
                    inMonth ? "hover:bg-secondary text-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {format(day, "d")}
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="w-full lg:w-[320px]">
          <AnimatePresence mode="wait">
            {selectedDate && (
              <motion.div key={selectedKey} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flux-card">
                <h3 className="text-sm font-semibold mb-3">{format(selectedDate, "EEEE, MMM d")}</h3>
                {(!selectedEvents || (selectedEvents.tasks.length === 0 && selectedEvents.blocks.length === 0)) ? (
                  <p className="text-xs text-muted-foreground">No events scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents?.blocks.map(b => (
                      <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <Clock size={12} className="text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{b.title}</p>
                          <p className="text-[10px] text-muted-foreground">{b.time} · {b.duration}</p>
                        </div>
                      </div>
                    ))}
                    {selectedEvents?.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <CheckCircle2 size={12} className={t.done ? "text-primary" : "text-muted-foreground"} />
                        <div>
                          <p className={`text-xs font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.priority} priority</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
