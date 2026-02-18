import React, { useState, useEffect, useCallback } from "react";
import { Flame, Clock, TrendingUp, BarChart3 } from "lucide-react";
import DraggableWidget from "./DraggableWidget";
import FocusReportModal from "./FocusReportModal";

const STATS_KEY = "flux-focus-stats";

interface FocusStats {
  dailyLog: Record<string, number>; // "YYYY-MM-DD" -> minutes
  streak: number;
  lastDate: string;
}

const getToday = () => new Date().toISOString().slice(0, 10);

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const getWeekMinutes = (log: Record<string, number>) => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  // Calculate Monday offset
  const mondayOffset = day === 0 ? -6 : 1 - day;
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + mondayOffset + i);
    const key = d.toISOString().slice(0, 10);
    total += log[key] || 0;
  }
  return total;
};

function loadStats(): FocusStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dailyLog: {}, streak: 0, lastDate: "" };
}

function saveStats(stats: FocusStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function logFocusMinutes(minutes: number) {
  const stats = loadStats();
  const today = getToday();
  const yesterday = getYesterday();

  if (!stats.dailyLog[today]) {
    if (stats.lastDate === yesterday) {
      stats.streak += 1;
    } else if (stats.lastDate !== today) {
      stats.streak = 1;
    }
  }

  stats.dailyLog[today] = (stats.dailyLog[today] || 0) + minutes;
  stats.lastDate = today;
  saveStats(stats);

  window.dispatchEvent(new Event("focus-stats-updated"));
}

const FocusStatsWidget = () => {
  const [stats, setStats] = useState<FocusStats>(loadStats);
  const [reportOpen, setReportOpen] = useState(false);

  const refresh = useCallback(() => setStats(loadStats()), []);

  useEffect(() => {
    window.addEventListener("focus-stats-updated", refresh);
    return () => window.removeEventListener("focus-stats-updated", refresh);
  }, [refresh]);

  // Check streak on mount
  useEffect(() => {
    const s = loadStats();
    const today = getToday();
    const yesterday = getYesterday();
    if (s.lastDate && s.lastDate !== today && s.lastDate !== yesterday) {
      s.streak = 0;
      saveStats(s);
      setStats(s);
    }
  }, []);

  const todayMin = stats.dailyLog[getToday()] || 0;
  const weekMin = getWeekMinutes(stats.dailyLog);

  return (
    <>
      <DraggableWidget
        id="stats"
        title="Focus Stats"
        defaultPosition={{ x: 60, y: 320 }}
        defaultSize={{ w: 300, h: 220 }}
      >
        <div className="flex flex-col gap-4 h-full justify-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/15">
              <Flame size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-display text-white font-light">{stats.streak}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Day Streak</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Clock size={14} className="text-white/30" />
              <div>
                <p className="text-lg text-white/80 font-light tabular-nums">{todayMin}m</p>
                <p className="text-[9px] text-white/30 uppercase">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <TrendingUp size={14} className="text-white/30" />
              <div>
                <p className="text-lg text-white/80 font-light tabular-nums">{weekMin}m</p>
                <p className="text-[9px] text-white/30 uppercase">This Week</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 hover:bg-white/10 transition-all"
          >
            <BarChart3 size={12} /> View Report
          </button>
        </div>
      </DraggableWidget>
      <FocusReportModal open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
};

export default FocusStatsWidget;
