import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Dumbbell, FileText, Lightbulb, Clock } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "task" | "workout" | "document" | "idea";
  label: string;
  detail?: string;
  timestamp: Date;
}

const iconFor = (type: ActivityItem["type"]) => {
  switch (type) {
    case "task": return <CheckSquare size={13} className="text-amber-400" />;
    case "workout": return <Dumbbell size={13} className="text-emerald-400" />;
    case "document": return <FileText size={13} className="text-blue-400" />;
    case "idea": return <Lightbulb size={13} className="text-violet-400" />;
  }
};

const dotColor: Record<ActivityItem["type"], string> = {
  task: "hsl(var(--aurora-pink))",
  workout: "hsl(120 70% 50%)",
  document: "hsl(var(--aurora-blue))",
  idea: "hsl(var(--aurora-violet))",
};

const RecentActivityFeed = () => {
  const { tasks, workouts } = useFlux();

  // We fetch documents + council ideas via localStorage hints (lightweight)
  const councilIdeasRaw = useMemo(() => {
    try {
      const raw = localStorage.getItem("flux_local_council_ideas_v1");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Tasks (created_at)
    for (const t of tasks.slice(0, 30)) {
      items.push({
        id: `task-${t.id}`,
        type: "task",
        label: t.done ? `Completed "${t.title}"` : `Created task "${t.title}"`,
        detail: t.priority,
        timestamp: new Date(t.created_at),
      });
    }

    // Workouts
    for (const w of workouts.slice(0, 15)) {
      items.push({
        id: `workout-${w.id}`,
        type: "workout",
        label: `Logged "${w.activity}"`,
        detail: `Energy ${w.energy}/9`,
        timestamp: new Date(w.created_at),
      });
    }

    // Council ideas (localStorage fallback)
    for (const idea of councilIdeasRaw.slice(0, 10)) {
      if (idea?.content && idea?.created_at) {
        items.push({
          id: `idea-${idea.id || Math.random()}`,
          type: "idea",
          label: `Council idea: "${(idea.content as string).slice(0, 48)}…"`,
          timestamp: new Date(idea.created_at),
        });
      }
    }

    // Sort by newest first, take top 20
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }, [tasks, workouts, councilIdeasRaw]);

  if (activities.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wide">
        <Clock size={12} />
        Recent Activity
      </h3>
      <div className="flux-card p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/40" />

          <div className="space-y-3">
            {activities.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-start gap-3 pl-5 relative"
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${dotColor[item.type]}22`, border: `1.5px solid ${dotColor[item.type]}` }}
                >
                  <div className="w-1 h-1 rounded-full" style={{ background: dotColor[item.type] }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {iconFor(item.type)}
                    <span className="text-xs text-foreground/90 leading-snug">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </span>
                    {item.detail && (
                      <span className="text-[10px] text-muted-foreground/50 bg-secondary/40 px-1.5 py-0.5 rounded-full">
                        {item.detail}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivityFeed;
