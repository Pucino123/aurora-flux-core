import React, { useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { Sparkles, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

type SmartPlanWidgetProps = {
  mood?: string | null;
  energy?: string | null;
};

const SmartPlanWidget = ({ mood, energy }: SmartPlanWidgetProps) => {
  const { tasks, scheduleBlocks } = useFlux();
  const today = format(new Date(), "yyyy-MM-dd");

  const plan = useMemo(() => {
    const overdue = tasks.filter(t => !t.done && t.due_date && t.due_date < today);
    const todayTasks = tasks.filter(t => !t.done && (t.scheduled_date === today || t.due_date === today));
    const todayBlocks = scheduleBlocks.filter(b => b.scheduled_date === today);
    const highPriority = tasks.filter(t => !t.done && t.priority === "high").slice(0, 3);

    const suggestions: string[] = [];
    if (overdue.length > 0) suggestions.push(`You have ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} — tackle those first.`);
    if (todayBlocks.length > 0) suggestions.push(`${todayBlocks.length} scheduled block${todayBlocks.length > 1 ? "s" : ""} today.`);
    if (highPriority.length > 0 && overdue.length === 0) suggestions.push("Focus on your high-priority items first.");
    if (todayTasks.length === 0 && overdue.length === 0) suggestions.push("Light day ahead — great time for deep work!");

    return { overdue, todayTasks, highPriority, suggestions };
  }, [tasks, scheduleBlocks, today]);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display">Smart Plan</span>
      </div>

      {plan.suggestions.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {plan.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <Sparkles size={10} className="text-primary shrink-0 mt-0.5" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {plan.overdue.length > 0 && (
        <div className="mb-2">
          <span className="text-[9px] font-semibold text-destructive flex items-center gap-1 mb-1"><AlertTriangle size={9} /> Overdue</span>
          {plan.overdue.slice(0, 3).map(t => (
            <div key={t.id} className="text-[10px] text-muted-foreground truncate pl-3">• {t.title}</div>
          ))}
        </div>
      )}

      {plan.todayTasks.length > 0 && (
        <div className="mb-2">
          <span className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 mb-1"><Clock size={9} /> Today</span>
          {plan.todayTasks.slice(0, 4).map(t => (
            <div key={t.id} className="text-[10px] text-muted-foreground truncate pl-3 flex items-center gap-1">
              <CheckCircle2 size={8} /> {t.title}
            </div>
          ))}
        </div>
      )}

      {plan.overdue.length === 0 && plan.todayTasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] text-muted-foreground">All clear! ✨</p>
        </div>
      )}
    </div>
  );
};

export default SmartPlanWidget;
