import React, { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { BarChart3, CheckCircle2, Folder, Target, TrendingUp, Dumbbell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(150 60% 45%)", "hsl(30 90% 55%)", "hsl(270 70% 65%)"];

const StatCard = ({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string | number; sub?: string }) => (
  <div className="flux-card flex items-center gap-3">
    <div className="p-2 rounded-xl bg-primary/10"><Icon size={18} className="text-primary" /></div>
    <div>
      <p className="text-lg font-bold font-display">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground/60">{sub}</p>}
    </div>
  </div>
);

const AnalyticsView = () => {
  const { tasks, goals, folders, workouts } = useFlux();

  const totalTasks = tasks.filter(t => t.type === "task").length;
  const doneTasks = tasks.filter(t => t.type === "task" && t.done).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const last7Days = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      const completed = tasks.filter(t => t.done && t.updated_at?.startsWith(key)).length;
      return { day: format(d, "EEE"), completed };
    });
  }, [tasks]);

  const folderData = useMemo(() => {
    return folders.filter(f => f.type === "project").slice(0, 5).map(f => {
      const fTasks = tasks.filter(t => t.folder_id === f.id);
      return { name: f.title.slice(0, 12), done: fTasks.filter(t => t.done).length, total: fTasks.length };
    });
  }, [folders, tasks]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display flex items-center gap-2"><BarChart3 size={22} /> Analytics</h2>
        <p className="text-sm text-muted-foreground">Your productivity insights</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CheckCircle2} label="Tasks Done" value={doneTasks} sub={`of ${totalTasks} total`} />
        <StatCard icon={TrendingUp} label="Completion" value={`${completionRate}%`} />
        <StatCard icon={Folder} label="Projects" value={folders.filter(f => f.type === "project").length} />
        <StatCard icon={Dumbbell} label="Workouts" value={workouts.length} sub="logged" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flux-card">
          <h3 className="text-sm font-semibold mb-3">Tasks Completed (7 days)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flux-card">
          <h3 className="text-sm font-semibold mb-3">Project Progress</h3>
          {folderData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No projects yet</p>
          ) : (
            <div className="space-y-3">
              {folderData.map((p, i) => {
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium truncate">{p.name}</span>
                      <span className="text-muted-foreground">{p.done}/{p.total} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
