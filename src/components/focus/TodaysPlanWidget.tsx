import React, { useEffect, useState, useCallback } from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";
import { CalendarDays, Sparkles, Loader2 } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, parseISO } from "date-fns";

const TodaysPlanWidget = () => {
  const { setActiveView, tasks } = useFlux();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 360 : 1100,
    y: 20,
  }), []);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayTasks = tasks.filter(t =>
    !t.done && (t.scheduled_date === today || t.due_date === today)
  );

  const syncWithAI = useCallback(async () => {
    if (todayTasks.length === 0) {
      setAiSummary("No tasks scheduled for today — enjoy some free time! ✨");
      return;
    }
    setSyncing(true);
    try {
      const taskList = todayTasks
        .map(t => `- ${t.title} (priority: ${t.priority || "medium"}, status: ${t.status || "todo"})`)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "chat",
          messages: [{
            role: "user",
            content: `Today's tasks:\n${taskList}\n\nGive a 1-2 sentence smart summary of today's priority focus. Be direct and motivating.`,
          }],
        },
      });

      if (!error && data) {
        const text = typeof data === "string"
          ? data
          : (data as any)?.content || (data as any)?.message || JSON.stringify(data);
        setAiSummary(text.trim().slice(0, 200));
      }
    } catch {
      // silent fail
    } finally {
      setSyncing(false);
    }
  }, [todayTasks.length, today]);

  // Auto-sync on mount and when task count changes
  useEffect(() => {
    const timer = setTimeout(syncWithAI, 800);
    return () => clearTimeout(timer);
  }, [todayTasks.length]);

  return (
    <DraggableWidget id="planner" title="Planner" defaultPosition={defaultPlannerPos} defaultSize={{ w: 340, h: 520 }} scrollable>
      <div className="focus-planner-dark -mx-4 -mt-4 -mb-4 h-[calc(100%+2rem)] council-hidden-scrollbar overflow-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Today's Plan</span>
          <div className="flex items-center gap-1">
            <button
              onClick={syncWithAI}
              disabled={syncing}
              title="Sync with AI"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
            >
              {syncing
                ? <Loader2 size={12} className="animate-spin" />
                : <Sparkles size={12} />
              }
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              title="Open full calendar"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
            >
              <CalendarDays size={14} />
            </button>
          </div>
        </div>

        {/* AI summary banner */}
        {aiSummary && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
            <p className="text-[11px] text-white/70 leading-relaxed">{aiSummary}</p>
          </div>
        )}

        <div className="flex-1 min-h-0">
          <Scheduler />
        </div>
      </div>
    </DraggableWidget>
  );
};

export default TodaysPlanWidget;
