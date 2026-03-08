import React, { useState, useEffect, useCallback, useRef } from "react";
import { Flame, TrendingUp, BarChart3, Play, Pause, Square, Pencil, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DraggableWidget from "./DraggableWidget";
import FocusReportModal from "./FocusReportModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Local fallback helpers ─────────────────────────────────────────────────
const STATS_KEY = "flux-focus-stats";

interface FocusStats {
  dailyLog: Record<string, number>;
  streak: number;
  lastDate: string;
  totalSessions: number;
}

const getToday = () => new Date().toISOString().slice(0, 10);

function loadLocalStats(): FocusStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { totalSessions: 0, streak: 0, lastDate: getToday(), dailyLog: {}, ...JSON.parse(raw) };
  } catch {}
  return { dailyLog: {}, streak: 0, lastDate: getToday(), totalSessions: 0 };
}

function saveLocalStats(stats: FocusStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/** Called by timer when a session finishes – writes to localStorage + dispatches event */
export function logFocusMinutes(minutes: number) {
  const stats = loadLocalStats();
  const today = getToday();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
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

// ── Helpers ────────────────────────────────────────────────────────────────
const DAILY_GOAL_MIN = 300; // 5 h
const POMODORO_SECS = 25 * 60;

/** Returns Mon-Sun dates for the week offset from current week (0 = this week, -1 = last, etc.) */
function getWeekDates(weekOffset = 0) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + mondayOffset + i + weekOffset * 7);
    return d.toISOString().slice(0, 10);
  });
}

/** Returns label for week like "Mar 3–9" */
function weekLabel(weekOffset: number): string {
  const dates = getWeekDates(weekOffset);
  const start = new Date(dates[0]);
  const end   = new Date(dates[6]);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (weekOffset === 0) return "This Week";
  if (weekOffset === -1) return "Last Week";
  return `${start.toLocaleDateString("en-US", opts)}–${end.toLocaleDateString("en-US", { day: "numeric" })}`;
}

/** Compute consecutive-day streak backwards from today */
function computeStreak(dailyLog: Record<string, number>): number {
  const today = getToday();
  let streak = 0;
  const d = new Date(today);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if ((dailyLog[key] ?? 0) > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Lightweight CSS confetti — no external library needed
function ConfettiBurst() {
  const COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#f59e0b", "#f472b6"];
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    x: (Math.random() - 0.5) * 160,
    y: -(40 + Math.random() * 80),
    rotate: Math.random() * 720,
    size: 4 + Math.random() * 5,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-10">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, background: p.color, top: "50%", left: "50%" }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.4 }}
          transition={{ duration: 0.9 + Math.random() * 0.4, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── 4-week sparkline ───────────────────────────────────────────────────────
function WeeklyHistorySparkline({ dailyLog }: { dailyLog: Record<string, number> }) {
  const weeks = [-3, -2, -1, 0].map(offset => {
    const dates = getWeekDates(offset);
    const total = dates.reduce((sum, d) => sum + (dailyLog[d] ?? 0), 0);
    const hrs   = +(total / 60).toFixed(1);
    return { label: weekLabel(offset), hrs, offset };
  });
  const maxHrs = Math.max(...weeks.map(w => w.hrs), 0.1);
  const SPARKLINE_H = 28;
  return (
    <div className="shrink-0">
      <p className="text-[7px] text-white/15 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <History size={7} className="text-white/20" /> 4-Week History
      </p>
      <div className="flex items-end gap-1.5">
        {weeks.map((w, i) => {
          const barH = Math.max((w.hrs / maxHrs) * SPARKLINE_H, w.hrs > 0 ? 3 : 1);
          const isCurrent = w.offset === 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={`text-[7px] font-medium leading-none ${isCurrent ? "text-violet-300" : "text-white/35"}`}>
                {w.hrs > 0 ? `${w.hrs}h` : ""}
              </span>
              <motion.div
                className={`w-full rounded-t-sm ${isCurrent ? "bg-violet-400/80" : "bg-white/20"}`}
                title={`${w.label}: ${w.hrs}h`}
                initial={{ height: 0 }}
                animate={{ height: `${barH}px` }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
              />
              <span className={`leading-none text-center ${isCurrent ? "text-violet-300" : "text-white/20"}`} style={{ fontSize: "6px" }}>
                {i === 3 ? "Now" : i === 2 ? "-1w" : i === 1 ? "-2w" : "-3w"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 3-month streak heatmap ─────────────────────────────────────────────────
function StreakHeatmap({ dailyLog }: { dailyLog: Record<string, number> }) {
  // Build last 91 days (13 weeks)
  const days = Array.from({ length: 91 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (90 - i));
    return d.toISOString().slice(0, 10);
  });

  // Group into weeks of 7 (oldest first, pad start to align Mon)
  const firstDay = new Date(days[0]);
  const startPad = (firstDay.getDay() + 6) % 7; // Mon=0
  const padded: (string | null)[] = [...Array(startPad).fill(null), ...days];
  // chunk into weeks
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const today = getToday();

  const cellColor = (dateStr: string | null) => {
    if (!dateStr) return "bg-transparent";
    const mins = dailyLog[dateStr] ?? 0;
    if (dateStr === today) {
      if (mins === 0) return "bg-violet-500/20 ring-1 ring-violet-400/40";
      return "bg-violet-400 ring-1 ring-violet-300/50";
    }
    if (mins === 0)   return "bg-white/[0.04]";
    if (mins < 30)    return "bg-violet-400/25";
    if (mins < 120)   return "bg-violet-400/55";
    return "bg-violet-400/90";
  };

  // Month labels – find first occurrence of each new month in the day list
  const monthLabels: { col: number; label: string }[] = [];
  weeks.forEach((week, wi) => {
    week.forEach((d, di) => {
      if (!d) return;
      const date = new Date(d);
      if (date.getDate() <= 7) {
        const label = date.toLocaleDateString("en-US", { month: "short" });
        if (!monthLabels.find(m => m.label === label)) {
          monthLabels.push({ col: wi, label });
        }
      }
    });
  });

  return (
    <div className="shrink-0">
      <p className="text-[7px] text-white/15 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <History size={7} className="text-white/20" /> 3-Month Activity
      </p>
      {/* Month row */}
      <div className="relative flex gap-[2px] mb-0.5 h-3">
        {weeks.map((_, wi) => {
          const ml = monthLabels.find(m => m.col === wi);
          return (
            <div key={wi} className="flex-none" style={{ width: 8 }}>
              {ml && <span className="text-white/20 absolute" style={{ fontSize: "6px" }}>{ml.label}</span>}
            </div>
          );
        })}
      </div>
      {/* Grid: columns = weeks, rows = days Mon–Sun */}
      <div className="flex gap-[2px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((d, di) => (
              <motion.div
                key={di}
                className={`rounded-[1px] ${cellColor(d)}`}
                style={{ width: 8, height: 8 }}
                title={d ? `${d}: ${dailyLog[d] ?? 0} min` : undefined}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (wi * 7 + di) * 0.002, duration: 0.15 }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-white/15" style={{ fontSize: "6px" }}>Less</span>
        {["bg-white/[0.04]", "bg-violet-400/25", "bg-violet-400/55", "bg-violet-400/90"].map((c, i) => (
          <div key={i} className={`rounded-[1px] ${c}`} style={{ width: 8, height: 8 }} />
        ))}
        <span className="text-white/15" style={{ fontSize: "6px" }}>More</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
const FocusStatsWidget = () => {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [timerSecs, setTimerSecs] = useState(POMODORO_SECS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [ringAnim, setRingAnim] = useState(false);
  const [goalReached, setGoalReached] = useState(false);
  const prevDailyPctRef = useRef(0);

  // DB-driven state
  const [dailyLog, setDailyLog] = useState<Record<string, number>>({});
  const [totalSessions, setTotalSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBump, setStreakBump] = useState(false);

  // Weekly goal state (persisted in localStorage)
  const [weeklyGoalHrs, setWeeklyGoalHrs] = useState<number>(() => {
    try { return Number(localStorage.getItem("flux-weekly-goal-hrs") ?? 20); } catch { return 20; }
  });
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState(false);
  const [weeklyGoalInput, setWeeklyGoalInput] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load all sessions from DB ────────────────────────────────────────────
  const loadDbSessions = useCallback(async () => {
    if (!user) {
      const local = loadLocalStats();
      setDailyLog(local.dailyLog);
      setTotalSessions(local.totalSessions);
      setStreak(local.streak);
      return;
    }
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("minutes, session_date")
      .eq("user_id", user.id);

    if (error || !data) return;

    const log: Record<string, number> = {};
    data.forEach(r => {
      log[r.session_date] = (log[r.session_date] || 0) + (r.minutes ?? 0);
    });

    const newStreak = computeStreak(log);
    setDailyLog(log);
    setTotalSessions(data.length);
    setStreak(prev => {
      if (newStreak > prev) {
        setStreakBump(true);
        setTimeout(() => setStreakBump(false), 1200);
      }
      return newStreak;
    });
  }, [user]);

  useEffect(() => {
    loadDbSessions();
    setTimeout(() => setRingAnim(true), 300);
  }, [loadDbSessions]);

  useEffect(() => {
    const handler = () => loadDbSessions();
    window.addEventListener("focus-stats-updated", handler);
    return () => window.removeEventListener("focus-stats-updated", handler);
  }, [loadDbSessions]);

  // ── Persist a session to DB + check goal reached ────────────────────────
  const persistSession = useCallback(async (minutes: number) => {
    if (!user) return;
    await supabase.from("focus_sessions").insert({
      user_id: user.id,
      session_date: getToday(),
      minutes,
    });
    const currentMin = (dailyLog[getToday()] ?? 0) + minutes;
    const newPct = Math.min((currentMin / DAILY_GOAL_MIN) * 100, 100);
    if (newPct >= 100 && prevDailyPctRef.current < 100) {
      setGoalReached(true);
      setTimeout(() => setGoalReached(false), 2800);
    }
    prevDailyPctRef.current = newPct;
    loadDbSessions();
  }, [user, loadDbSessions, dailyLog]);

  // ── Pomodoro logic ───────────────────────────────────────────────────────
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

  // ── Derived display values ───────────────────────────────────────────────
  const today = getToday();
  const todayMin = dailyLog[today] ?? 0;
  const dailyPct = Math.min((todayMin / DAILY_GOAL_MIN) * 100, 100);

  // Weekly bar chart – real DB data
  const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
  const weekDates = getWeekDates(0);
  const weekData = weekDates.map((date, i) => ({
    label: WEEK_LABELS[i],
    minutes: dailyLog[date] ?? 0,
    isToday: date === today,
  }));
  const maxWeek = Math.max(...weekData.map(d => d.minutes), 1);

  // Weekly goal derived
  const weeklyGoalMin  = weeklyGoalHrs * 60;
  const weeklyTotalMin = weekData.reduce((s, d) => s + d.minutes, 0);
  const weeklyPct      = weeklyGoalMin > 0 ? Math.min((weeklyTotalMin / weeklyGoalMin) * 100, 100) : 0;
  const weeklyHrs      = Math.floor(weeklyTotalMin / 60);
  const weeklyRem      = weeklyTotalMin % 60;
  const weeklyGoalMet  = weeklyPct >= 100;

  const saveWeeklyGoal = () => {
    const v = parseFloat(weeklyGoalInput);
    if (!isNaN(v) && v > 0) {
      setWeeklyGoalHrs(v);
      localStorage.setItem("flux-weekly-goal-hrs", String(v));
    }
    setEditingWeeklyGoal(false);
  };

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
      <DraggableWidget id="stats" title="Focus Stats" defaultPosition={{ x: 60, y: 320 }} defaultSize={{ w: 340, h: 520 }}>
        <div className="h-full flex flex-col gap-2.5 overflow-y-auto council-hidden-scrollbar">

          {/* Header */}
          <div className="shrink-0 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{todayDate}</p>
            <p className="text-[13px] text-white/60 font-medium mt-0.5">Stay Focused</p>
          </div>

          {/* Circular progress ring */}
          <div className="shrink-0 flex flex-col items-center relative">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r={RING_R} fill="none"
                  stroke={goalReached ? "url(#focusGradGreen)" : "url(#focusGrad)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{
                    strokeDashoffset: ringAnim ? RING_C * (1 - dailyPct / 100) : RING_C,
                    filter: goalReached ? "drop-shadow(0 0 8px #34d399)" : "none",
                  }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(250 80% 70%)" />
                    <stop offset="100%" stopColor="hsl(200 90% 65%)" />
                  </linearGradient>
                  <linearGradient id="focusGradGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {goalReached ? (
                    <motion.p
                      key="reached"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="text-[11px] font-bold text-emerald-300 leading-none text-center"
                    >
                      🎉 Goal!
                    </motion.p>
                  ) : (
                    <motion.p
                      key="time"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[15px] font-bold text-white/90 leading-none"
                    >
                      {Math.floor(todayMin / 60)}h {todayMin % 60}m
                    </motion.p>
                  )}
                </AnimatePresence>
                <p className="text-[8px] text-white/30 mt-0.5">/ 5h goal</p>
              </div>
              <AnimatePresence>
                {goalReached && <ConfettiBurst />}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {goalReached && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mt-2 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold"
                >
                  🏆 Daily Goal Reached!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats badges */}
          <div className="flex gap-2 shrink-0">
            <div className="flex-1 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/8 overflow-hidden relative">
              <div className="w-6 h-6 rounded-lg bg-orange-400/20 flex items-center justify-center shrink-0">
                <Flame size={12} className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <div className="relative h-5 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    <motion.p
                      key={streak}
                      initial={{ y: streakBump ? 16 : 0, opacity: streakBump ? 0 : 1 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -16, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="text-[14px] font-bold text-white/90 leading-5 absolute"
                    >
                      {streak}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <p className="text-[8px] text-white/30">Day Streak</p>
              </div>
              {streakBump && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-2 top-2 text-[9px] text-orange-300 font-bold"
                >
                  +1 🔥
                </motion.span>
              )}
            </div>

            <div className="flex-1 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/8">
              <div className="w-6 h-6 rounded-lg bg-violet-400/20 flex items-center justify-center shrink-0">
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Pomodoro</p>
                <p className="text-[22px] font-bold text-white/90 leading-none tabular-nums font-mono">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </p>
              </div>
              <svg className="w-10 h-10 -rotate-90 shrink-0" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <motion.circle
                  cx="20" cy="20" r="16" fill="none"
                  stroke="hsl(250 80% 70%)"
                  strokeWidth="3" strokeLinecap="round"
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

          {/* Weekly goal section */}
          <div className="shrink-0 flex flex-col gap-1.5">
            {/* Weekly goal header + ring */}
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                  <motion.circle
                    cx="20" cy="20" r="16" fill="none"
                    stroke={weeklyGoalMet ? "#34d399" : "hsl(270 70% 65%)"}
                    strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 16}
                    initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - weeklyPct / 100) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[8px] font-bold ${weeklyGoalMet ? "text-emerald-300" : "text-white/60"}`}>
                    {Math.round(weeklyPct)}%
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[8px] text-white/20 uppercase tracking-wider">This Week</span>
                  {weeklyGoalMet && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[8px] text-emerald-300">
                      🎯
                    </motion.span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[13px] font-bold text-white/80 leading-none">
                    {weeklyHrs}h {weeklyRem}m
                  </span>
                  {editingWeeklyGoal ? (
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        autoFocus
                        type="number"
                        value={weeklyGoalInput}
                        onChange={e => setWeeklyGoalInput(e.target.value)}
                        onBlur={saveWeeklyGoal}
                        onKeyDown={e => { if (e.key === "Enter") saveWeeklyGoal(); if (e.key === "Escape") setEditingWeeklyGoal(false); }}
                        className="w-10 bg-white/10 border border-violet-400/40 rounded px-1 text-[9px] text-white/80 outline-none text-center"
                        placeholder={String(weeklyGoalHrs)}
                      />
                      <span className="text-[8px] text-white/30">h goal</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setWeeklyGoalInput(String(weeklyGoalHrs)); setEditingWeeklyGoal(true); }}
                      className="flex items-center gap-0.5 text-[8px] text-white/25 hover:text-violet-300 transition-colors ml-1"
                      title="Edit weekly goal"
                    >
                      / {weeklyGoalHrs}h goal <Pencil size={7} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* This-week daily bar chart */}
            <p className="text-[7px] text-white/15 uppercase tracking-wider">Daily breakdown</p>
            <div className="flex items-end justify-between gap-1 h-10">
              {weekData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className={`w-full rounded-t-sm ${d.isToday ? "bg-violet-400" : d.minutes > 0 ? "bg-white/30" : "bg-white/8"}`}
                    title={`${d.minutes} min`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.minutes / maxWeek) * 36, d.minutes > 0 ? 4 : 2)}px` }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                  />
                  <span className={`text-[7px] ${d.isToday ? "text-violet-300" : "text-white/20"}`}>{d.label}</span>
                </div>
              ))}
            </div>

            {/* 4-week history sparkline */}
            <WeeklyHistorySparkline dailyLog={dailyLog} />

            {/* 3-month heatmap */}
            <StreakHeatmap dailyLog={dailyLog} />
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
