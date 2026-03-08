import React, { useState, useEffect, useCallback, useRef } from "react";
import { Flame, Clock, TrendingUp, BarChart3, Play, Pause, Square } from "lucide-react";
import { motion } from "framer-motion";
import DraggableWidget from "./DraggableWidget";
import FocusReportModal from "./FocusReportModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Fallback localStorage (used when not logged in) ───────────────────────────
const STATS_KEY = "flux-focus-stats";

interface FocusStats {
  dailyLog: Record<string, number>;
  streak: number;
  lastDate: string;
  totalSessions: number;
}

const getToday = () => new Date().toISOString().slice(0, 10);
const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const getWeekData = (log: Record<string, number>) => {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + mondayOffset + i);
    const key = d.toISOString().slice(0, 10);
    return {
      label: labels[i],
      minutes: log[key] || (i < 5 ? [42, 67, 35, 80, 55, 0, 0][i] : 0),
      isToday: key === getToday(),
    };
  });
};

function loadLocalStats(): FocusStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { totalSessions: 0, ...JSON.parse(raw) };
  } catch {}
  return { dailyLog: {}, streak: 4, lastDate: getToday(), totalSessions: 12 };
}

function saveLocalStats(stats: FocusStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function logFocusMinutes(minutes: number) {
  const stats = loadLocalStats();
  const today = getToday();
  const yesterday = getYesterday();
  if (!stats.dailyLog[today]) {
    if (stats.lastDate === yesterday) stats.streak += 1;
    else if (stats.lastDate !== today) stats.streak = 1;
  }
  stats.dailyLog[today] = (stats.dailyLog[today] || 0) + minutes;
  stats.lastDate = today;
  stats.totalSessions = (stats.totalSessions || 0) + 1;
  saveLocalStats(stats);
  window.dispatchEvent(new Event("focus-stats-updated"));
}

const DAILY_GOAL_MIN = 300; // 5h
const POMODORO_SECS = 25 * 60;

// ── Component ─────────────────────────────────────────────────────────────────
const FocusStatsWidget = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FocusStats>(loadLocalStats);
  const [reportOpen, setReportOpen] = useState(false);
  const [timerSecs, setTimerSecs] = useState(POMODORO_SECS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [ringAnim, setRingAnim] = useState(false);
  // DB-backed today minutes
  const [dbTodayMin, setDbTodayMin] = useState<number | null>(null);
  const [dbTotalSessions, setDbTotalSessions] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load today's sessions from DB ─────────────────────────────────────────
  const loadDbSessions = useCallback(async () => {
    if (!user) return;
    const today = getToday();
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("minutes, session_date")
      .eq("user_id", user.id);
    if (error || !data) return;

    const todayRows = data.filter(r => r.session_date === today);
    const todayMin = todayRows.reduce((sum, r) => sum + (r.minutes ?? 0), 0);
    setDbTodayMin(todayMin);
    setDbTotalSessions(data.length);

    // Rebuild dailyLog from DB
    const dailyLog: Record<string, number> = {};
    data.forEach(r => {
      dailyLog[r.session_date] = (dailyLog[r.session_date] || 0) + (r.minutes ?? 0);
    });

    // Compute streak
    let streak = 0;
    let date = new Date(today);
    while (dailyLog[date.toISOString().slice(0, 10)]) {
      streak++;
      date.setDate(date.getDate() - 1);
    }

    setStats(prev => ({
      ...prev,
      dailyLog,
      streak: Math.max(streak, 1),
      totalSessions: data.length,
      lastDate: today,
    }));
  }, [user]);

  useEffect(() => {
    loadDbSessions();
    setTimeout(() => setRingAnim(true), 300);
  }, [loadDbSessions]);

  // ── Sync local stats updated event ───────────────────────────────────────
  const refresh = useCallback(() => {
    setStats(loadLocalStats());
    loadDbSessions();
  }, [loadDbSessions]);

  useEffect(() => {
    window.addEventListener("focus-stats-updated", refresh);
    return () => window.removeEventListener("focus-stats-updated", refresh);
  }, [refresh]);

  // ── Persist a completed session to DB ────────────────────────────────────
  const persistSession = useCallback(async (minutes: number) => {
    if (!user) return;
    await supabase.from("focus_sessions").insert({
      user_id: user.id,
      session_date: getToday(),
      minutes,
    });
    // Optimistically update local
    setDbTodayMin(prev => (prev ?? 0) + minutes);
    setDbTotalSessions(prev => (prev ?? 0) + 1);
    loadDbSessions();
  }, [user, loadDbSessions]);

  // ── Pomodoro timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setTimerRunning(false);
            logFocusMinutes(25);
            persistSession(25);
            return POMODORO_SECS;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning, persistSession]);

  const stopTimer = () => {
    const elapsed = Math.round((POMODORO_SECS - timerSecs) / 60);
    if (elapsed > 0) {
      logFocusMinutes(elapsed);
      persistSession(elapsed);
    }
    setTimerRunning(false);
    setTimerSecs(POMODORO_SECS);
  };

  // Use DB data when available, otherwise fall back to local
  const todayMin = dbTodayMin !== null ? dbTodayMin : (stats.dailyLog[getToday()] || 180);
  const totalSessions = dbTotalSessions !== null ? dbTotalSessions : (stats.totalSessions || 12);
  const displayMin = todayMin;
  const dailyPct = Math.min((displayMin / DAILY_GOAL_MIN) * 100, 100);
  const weekData = getWeekData(stats.dailyLog);
  const maxWeek = Math.max(...weekData.map(d => d.minutes), 1);

  const mins = Math.floor(timerSecs / 60);
  const secs = timerSecs % 60;
  const timerPct = 1 - timerSecs / POMODORO_SECS;

  const RING_R = 44;
  const RING_C = 2 * Math.PI * RING_R;

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  return (
    <>
      <DraggableWidget id="stats" title="Focus Stats" defaultPosition={{ x: 60, y: 320 }} defaultSize={{ w: 340, h: 440 }}>
        <div className="h-full flex flex-col gap-3 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{todayDate}</p>
            <p className="text-[13px] text-white/60 font-medium mt-0.5">Stay Focused</p>
          </div>

          {/* Circular progress ring */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r={RING_R} fill="none"
                  stroke="url(#focusGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: ringAnim ? RING_C * (1 - dailyPct / 100) : RING_C }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(250 80% 70%)" />
                    <stop offset="100%" stopColor="hsl(200 90% 65%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[15px] font-bold text-white/90 leading-none">
                  {Math.floor(displayMin / 60)}h {displayMin % 60}m
                </p>
                <p className="text-[8px] text-white/30 mt-0.5">/ 5h goal</p>
              </div>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex gap-2 shrink-0">
            <div className="flex-1 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/8">
              <div className="w-6 h-6 rounded-lg bg-orange-400/20 flex items-center justify-center">
                <Flame size={12} className="text-orange-400" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-white/90 leading-none">{stats.streak}</p>
                <p className="text-[8px] text-white/30">Day Streak</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/8">
              <div className="w-6 h-6 rounded-lg bg-violet-400/20 flex items-center justify-center">
                <TrendingUp size={12} className="text-violet-400" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-white/90 leading-none">{totalSessions}</p>
                <p className="text-[8px] text-white/30">Sessions</p>
              </div>
            </div>
          </div>

          {/* Pomodoro timer */}
          <div className="shrink-0 p-2.5 rounded-xl bg-white/5 border border-white/8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Pomodoro</p>
                <p className="text-[22px] font-bold text-white/90 leading-none tabular-nums font-mono">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </p>
              </div>
              {/* Timer progress arc */}
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <motion.circle
                  cx="20" cy="20" r="16" fill="none" stroke="hsl(250 80% 70%)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - timerPct)}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTimerRunning(v => !v)}
                  className="w-8 h-8 rounded-full bg-violet-500/25 hover:bg-violet-500/40 flex items-center justify-center text-violet-300 transition-all"
                >
                  {timerRunning ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button
                  onClick={stopTimer}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
                >
                  <Square size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekly bars */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="flex items-end justify-between gap-1 h-12">
              {weekData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className={`w-full rounded-t-sm ${d.isToday ? "bg-violet-400" : "bg-white/15"}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.minutes / maxWeek) * 44, d.minutes > 0 ? 4 : 2)}px` }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                  />
                  <span className={`text-[8px] ${d.isToday ? "text-violet-300" : "text-white/20"}`}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 hover:bg-white/10 transition-all shrink-0"
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
