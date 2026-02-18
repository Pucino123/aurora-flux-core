import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Flame, Clock, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFocusStore } from "@/context/FocusContext";

const STATS_KEY = "flux-focus-stats";

interface FocusStats {
  dailyLog: Record<string, number>;
  streak: number;
  lastDate: string;
}

function loadStats(): FocusStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dailyLog: {}, streak: 0, lastDate: "" };
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FocusReportModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { brainDumpTasks, taskTimeLog } = useFocusStore();
  const [stats, setStats] = useState<FocusStats>(loadStats);

  const refresh = useCallback(() => setStats(loadStats()), []);

  // Listen for real-time stats updates
  useEffect(() => {
    if (!open) return;
    // Refresh on open
    refresh();
    window.addEventListener("focus-stats-updated", refresh);
    return () => window.removeEventListener("focus-stats-updated", refresh);
  }, [open, refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const todayMin = stats.dailyLog[today] || 0;

  // Get week data (Mon-Sun)
  const weekData = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return DAY_LABELS.map((label, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + mondayOffset + i);
      const key = d.toISOString().slice(0, 10);
      return { label, minutes: stats.dailyLog[key] || 0, date: key, isToday: key === today };
    });
  }, [stats.dailyLog, today]);

  const weekTotal = weekData.reduce((s, d) => s + d.minutes, 0);
  const maxMin = Math.max(...weekData.map((d) => d.minutes), 1);

  const topTasks = useMemo(() => {
    return Object.entries(taskTimeLog)
      .filter(([, min]) => min > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, min]) => {
        const task = brainDumpTasks.find((t) => t.id === id);
        return { id, minutes: min, text: task?.text || "Unknown task", tag: task?.tag };
      });
  }, [taskTimeLog, brainDumpTasks]);

  const TAG_COLORS: Record<string, string> = {
    Work: "bg-blue-400/20 text-blue-300",
    Personal: "bg-emerald-400/20 text-emerald-300",
    Urgent: "bg-red-400/20 text-red-300",
    Learning: "bg-purple-400/20 text-purple-300",
  };

  const streakDots = weekData.map((d) => d.minutes > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-[24px] border-white/15 text-white max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-light text-white/90">
            Your Focus Report
          </DialogTitle>
          <p className="text-xs text-white/40">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <Clock size={16} className="mx-auto mb-1 text-white/40" />
            <p className="text-xl font-display font-light tabular-nums">{todayMin}m</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Today</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <TrendingUp size={16} className="mx-auto mb-1 text-white/40" />
            <p className="text-xl font-display font-light tabular-nums">{weekTotal}m</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">This Week</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <Flame size={16} className="mx-auto mb-1 text-orange-400/60" />
            <p className="text-xl font-display font-light tabular-nums">{stats.streak}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Streak</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-3">Weekly Activity</h4>
          <div className="flex items-end gap-2 h-24">
            {weekData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative flex items-end justify-center" style={{ height: "80px" }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${d.isToday ? "bg-gradient-to-t from-purple-500/60 to-purple-400/30" : "bg-white/10"}`}
                    style={{ height: `${Math.max((d.minutes / maxMin) * 100, 4)}%`, minHeight: "3px" }}
                  />
                </div>
                <span className={`text-[9px] ${d.isToday ? "text-white/70 font-medium" : "text-white/30"}`}>{d.label}</span>
                {d.minutes > 0 && (
                  <span className="text-[8px] text-white/25 tabular-nums">{d.minutes}m</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-2">Streak Progress</h4>
          <div className="flex gap-2 justify-center">
            {streakDots.map((active, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-3 h-3 rounded-full border transition-all ${active ? "bg-orange-400/80 border-orange-400/40 shadow-[0_0_8px_hsla(25,90%,55%,0.3)]" : "bg-white/5 border-white/15"}`} />
                <span className="text-[8px] text-white/25">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {topTasks.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-2">Most Worked On</h4>
            <div className="space-y-1.5">
              {topTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  {t.tag && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${TAG_COLORS[t.tag] || ""}`}>
                      {t.tag}
                    </span>
                  )}
                  <span className="flex-1 text-xs text-white/70 truncate">{t.text}</span>
                  <span className="text-xs text-white/40 tabular-nums shrink-0">{t.minutes}m</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FocusReportModal;
