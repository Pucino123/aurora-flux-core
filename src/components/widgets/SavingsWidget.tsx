import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Minus, Check, Sparkles, Trash2, Loader2, CalendarDays, ArrowUpDown, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  emoji: string;
  deadline?: string | null;
}

const EMOJI_LIST = ["💰", "🎯", "✈️", "🏠", "⚡", "🛡️", "🗾", "🚀", "🎓", "🌿"];
const pickEmoji = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("car") || lower.includes("ev")) return "⚡";
  if (lower.includes("trip") || lower.includes("travel") || lower.includes("vacation")) return "✈️";
  if (lower.includes("house") || lower.includes("home")) return "🏠";
  if (lower.includes("emergency") || lower.includes("fund")) return "🛡️";
  if (lower.includes("school") || lower.includes("edu")) return "🎓";
  return EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
};

const FALLBACK_GOALS: SavingsGoal[] = [
  { id: "f1", name: "Emergency Fund", current: 8200, target: 10000, emoji: "🛡️" },
  { id: "f2", name: "New EV Car",     current: 4750, target: 35000, emoji: "⚡" },
  { id: "f3", name: "Japan Trip",     current: 2100, target: 2300,  emoji: "🗾" },
];

const getGradient = (pct: number) => {
  if (pct >= 100) return "from-emerald-400 to-teal-300";
  if (pct >= 70)  return "from-blue-400 to-emerald-400";
  if (pct >= 40)  return "from-indigo-400 to-blue-400";
  return "from-violet-400 to-indigo-400";
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function deadlineBadge(deadline: string | null | undefined): { label: string; urgent: boolean } | null {
  if (!deadline) return null;
  const days = differenceInDays(parseISO(deadline), new Date());
  if (days < 0)  return { label: "Overdue",    urgent: true  };
  if (days === 0) return { label: "Due today",  urgent: true  };
  if (days === 1) return { label: "1 day left", urgent: true  };
  return { label: `${days} days left`, urgent: days <= 7 };
}

/** Monthly deposit needed to reach target by deadline */
function savingsForecast(current: number, target: number, deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const remaining = target - current;
  if (remaining <= 0) return null;
  const daysLeft = differenceInDays(parseISO(deadline), new Date());
  if (daysLeft <= 0) return null;
  const monthsLeft = daysLeft / 30.44;
  if (monthsLeft < 0.1) return null;
  const perMonth = remaining / monthsLeft;
  return fmt(Math.ceil(perMonth));
}

/** Sort goals by deadline: soonest first, no-deadline last */
function sortByDeadline(goals: SavingsGoal[]): SavingsGoal[] {
  return [...goals].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}

// ── Milestone definitions ──────────────────────────────────────────────────
const MILESTONES = [
  { pct: 25,  label: "Quarter way",  badge: "🥉", color: "text-amber-300  bg-amber-400/15  border-amber-400/25"  },
  { pct: 50,  label: "Halfway!",     badge: "🥈", color: "text-blue-300   bg-blue-400/15   border-blue-400/25"   },
  { pct: 75,  label: "Almost there", badge: "🥇", color: "text-violet-300 bg-violet-400/15 border-violet-400/25" },
  { pct: 100, label: "Goal reached", badge: "🏆", color: "text-emerald-300 bg-emerald-400/15 border-emerald-400/25" },
];

/** Returns the highest milestone threshold that has been crossed */
function topMilestone(pct: number) {
  const crossed = MILESTONES.filter(m => pct >= m.pct);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}

// ── Inline name editor ──────────────────────────────────────────────────────
function GoalNameEditor({
  goal,
  onSave,
}: {
  goal: SavingsGoal;
  onSave: (id: string, name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(goal.name);
  const inputRef              = useRef<HTMLInputElement>(null);

  const start = () => { setVal(goal.name); setEditing(true); setTimeout(() => inputRef.current?.select(), 20); };
  const commit = async () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== goal.name) await onSave(goal.id, trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className="w-full bg-white/10 border border-violet-400/40 rounded px-1.5 py-0.5 text-[12px] font-semibold text-white/90 outline-none leading-tight"
      />
    );
  }
  return (
    <p
      className="text-[12px] font-semibold text-white/90 leading-tight cursor-text hover:text-white group-hover:underline decoration-white/20 underline-offset-2 transition-colors"
      onDoubleClick={start}
      title="Double-click to rename"
    >
      {goal.name}
    </p>
  );
}

// ── Milestone badges strip ──────────────────────────────────────────────────
function MilestoneBadges({ pct, goalId }: { pct: number; goalId: string }) {
  const seenKey = `flux-milestone-seen-${goalId}`;
  const [seenPct, setSeenPct] = useState<number>(() => {
    try { return Number(localStorage.getItem(seenKey) ?? -1); } catch { return -1; }
  });
  const [justUnlocked, setJustUnlocked] = useState<typeof MILESTONES[0] | null>(null);

  // Detect newly crossed milestone
  useEffect(() => {
    const crossed = MILESTONES.filter(m => pct >= m.pct);
    if (crossed.length === 0) return;
    const highest = crossed[crossed.length - 1];
    if (highest.pct > seenPct) {
      setSeenPct(highest.pct);
      setJustUnlocked(highest);
      localStorage.setItem(seenKey, String(highest.pct));
      setTimeout(() => setJustUnlocked(null), 2500);
    }
  }, [pct, seenPct, seenKey]);

  const crossedMilestones = MILESTONES.filter(m => pct >= m.pct);

  return (
    <>
      {/* Animated "just unlocked" banner */}
      <AnimatePresence>
        {justUnlocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-semibold w-fit mb-1 ${justUnlocked.color}`}
          >
            <span>{justUnlocked.badge}</span>
            <span>{justUnlocked.label}!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static badges row */}
      {crossedMilestones.length > 0 && !justUnlocked && (
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          {crossedMilestones.map((m, i) => (
            <motion.span
              key={m.pct}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.04 }}
              title={m.label}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[8px] font-medium ${m.color}`}
            >
              {m.badge} {m.pct}%
            </motion.span>
          ))}
        </div>
      )}
    </>
  );
}

// ── Full-screen goal celebration overlay ──────────────────────────────────
function GoalCelebrationOverlay({ goal, onDone }: { goal: SavingsGoal; onDone: () => void }) {
  const COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#f59e0b", "#f472b6", "#fb923c"];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    x: (Math.random() - 0.5) * (window.innerWidth * 0.9),
    y: -(Math.random() * window.innerHeight * 0.8 + 100),
    rotate: Math.random() * 1080 - 540,
    size: 5 + Math.random() * 7,
    delay: Math.random() * 0.3,
  }));

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dark backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
        {pieces.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm"
            style={{ width: p.size, height: p.size, background: p.color, top: "50%", left: "50%" }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate }}
            transition={{ duration: 1.4 + Math.random() * 0.6, delay: p.delay, ease: "easeOut" }}
          />
        ))}
      </div>
      {/* Card */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4 text-center px-8"
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.1 }}
      >
        <motion.span
          className="text-7xl leading-none"
          animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {goal.emoji}
        </motion.span>
        <div>
          <p className="text-3xl font-bold text-white mb-1">Goal Achieved!</p>
          <p className="text-white/60 text-base">{goal.name}</p>
        </div>
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 font-semibold text-sm"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.5 }}
        >
          🏆 100% Complete
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ── Main widget ─────────────────────────────────────────────────────────────
const SavingsWidget = () => {
  const { user } = useAuth();
  const [goals, setGoals]               = useState<SavingsGoal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeCard, setActiveCard]     = useState<string | null>(null);
  const [inputMode, setInputMode]       = useState<"deposit" | "withdraw" | null>(null);
  const [inputVal, setInputVal]         = useState("");
  const [adding, setAdding]             = useState(false);
  const [newName, setNewName]           = useState("");
  const [newTarget, setNewTarget]       = useState("");
  const [newDeadline, setNewDeadline]   = useState<Date | undefined>(undefined);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [pulseId, setPulseId]           = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [sortedByDeadline, setSortedByDeadline] = useState(false);
  // id of goal to show 100% celebration for
  const [celebratingGoal, setCelebratingGoal] = useState<SavingsGoal | null>(null);
  // track which goals we've already celebrated (persisted per session)
  const celebratedRef = useRef<Set<string>>(new Set());

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadGoals = useCallback(async () => {
    if (!user) { setGoals(FALLBACK_GOALS); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("id, title, current_amount, target_amount, deadline")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      const inserts = FALLBACK_GOALS.map(g => ({
        user_id: user.id, title: g.name, current_amount: g.current, target_amount: g.target, pinned: false,
      }));
      const { data: seeded } = await supabase.from("goals").insert(inserts).select();
      setGoals((seeded ?? []).map(r => ({
        id: r.id, name: r.title,
        current: Number(r.current_amount ?? 0),
        target:  Number(r.target_amount ?? 0),
        emoji: pickEmoji(r.title),
        deadline: (r as any).deadline ?? null,
      })));
    } else {
      setGoals(data.map(r => ({
        id: r.id, name: r.title,
        current: Number(r.current_amount ?? 0),
        target:  Number(r.target_amount ?? 0),
        emoji: pickEmoji(r.title),
        deadline: r.deadline ?? null,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  // ── Deposit / Withdraw ────────────────────────────────────────────────────
  const openAction = (id: string, mode: "deposit" | "withdraw") => {
    if (activeCard === id && inputMode === mode) { setActiveCard(null); setInputMode(null); setInputVal(""); }
    else { setActiveCard(id); setInputMode(mode); setInputVal(""); }
  };

  const applyAction = async (goalId: string) => {
    const val = parseFloat(inputVal);
    if (isNaN(val) || val <= 0) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newAmount = Math.max(0, goal.current + (inputMode === "deposit" ? val : -val));
    const wasComplete = goal.current >= goal.target;
    const nowComplete = newAmount >= goal.target;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, current: newAmount } : g));
    setPulseId(goalId); setTimeout(() => setPulseId(null), 600);
    setActiveCard(null); setInputMode(null); setInputVal("");
    if (user) await supabase.from("goals").update({ current_amount: newAmount }).eq("id", goalId).eq("user_id", user.id);
    // Trigger 100% celebration only on first completion crossing
    if (!wasComplete && nowComplete && !celebratedRef.current.has(goalId)) {
      celebratedRef.current.add(goalId);
      setCelebratingGoal({ ...goal, current: newAmount });
    }
  };

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameGoal = async (goalId: string, newName: string) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, name: newName } : g));
    if (user) await supabase.from("goals").update({ title: newName }).eq("id", goalId).eq("user_id", user.id);
  };

  // ── Add ───────────────────────────────────────────────────────────────────
  const addGoal = async () => {
    if (!newName.trim() || !newTarget) return;
    const target = parseFloat(newTarget);
    if (isNaN(target) || target <= 0) return;
    setSaving(true);
    const emoji = pickEmoji(newName);
    const deadlineStr = newDeadline ? format(newDeadline, "yyyy-MM-dd") : null;
    if (user) {
      const { data } = await supabase.from("goals").insert({
        user_id: user.id, title: newName.trim(), current_amount: 0,
        target_amount: target, pinned: false, deadline: deadlineStr,
      }).select().single();
      if (data) setGoals(prev => [...prev, {
        id: data.id, name: data.title, current: 0, target, emoji,
        deadline: (data as any).deadline ?? null,
      }]);
    } else {
      setGoals(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), current: 0, target, emoji, deadline: deadlineStr }]);
    }
    setNewName(""); setNewTarget(""); setNewDeadline(undefined); setAdding(false); setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteGoal = async (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    if (user) await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayedGoals = sortedByDeadline ? sortByDeadline(goals) : goals;
  const totalCurrent   = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget    = goals.reduce((s, g) => s + g.target, 0);
  const overallPct     = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;
  const isGreat        = overallPct >= 80;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-white/50" />
          <span className="text-[11px] text-white/60 font-medium uppercase tracking-wider">Savings Goals</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortedByDeadline(v => !v)}
            title="Sort by deadline"
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              sortedByDeadline
                ? "bg-violet-500/30 text-violet-300 border border-violet-400/40"
                : "bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60"
            )}
          >
            <ArrowUpDown size={10} />
          </button>
          <button
            onClick={() => setAdding(v => !v)}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/60 hover:text-white/90"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Sort indicator */}
      <AnimatePresence>
        {sortedByDeadline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center gap-1.5 px-1">
              <CalendarDays size={9} className="text-violet-400/60" />
              <span className="text-[9px] text-violet-300/70">Sorted by deadline (soonest first)</span>
              <button onClick={() => setSortedByDeadline(false)} className="ml-auto text-white/20 hover:text-white/50 transition-colors">
                <X size={9} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add goal form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex flex-col gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
              <div className="flex gap-2 items-center">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addGoal()}
                  placeholder="Goal name"
                  className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none"
                />
                <input
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addGoal()}
                  placeholder="Target $"
                  type="number"
                  className="w-20 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none text-right"
                />
                <button onClick={addGoal} disabled={saving} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays size={11} className="text-white/30 shrink-0" />
                <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "text-[10px] transition-colors",
                      newDeadline ? "text-violet-300 hover:text-violet-200" : "text-white/30 hover:text-white/60"
                    )}>
                      {newDeadline ? format(newDeadline, "MMM d, yyyy") : "Set deadline (optional)"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={newDeadline}
                      onSelect={d => { setNewDeadline(d); setDeadlineOpen(false); }}
                      disabled={date => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {newDeadline && (
                  <button onClick={() => setNewDeadline(undefined)} className="text-[9px] text-white/20 hover:text-rose-400 transition-colors ml-auto">
                    clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall progress */}
      {!loading && goals.length > 0 && (
        <div className="shrink-0 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-white/30 uppercase tracking-wider">Overall</span>
            <div className="flex items-center gap-1.5">
              {isGreat && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[9px] text-emerald-300 font-medium"
                >
                  ✨ Great progress!
                </motion.span>
              )}
              <span className="text-[10px] font-bold text-white/60">{Math.round(overallPct)}%</span>
            </div>
          </div>
          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${isGreat ? "from-emerald-400 to-teal-300" : "from-violet-400 to-blue-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex-1 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-white/5 border border-white/8 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/6 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto council-hidden-scrollbar space-y-2 pr-0.5">
          <AnimatePresence mode="popLayout">
            {displayedGoals.map(goal => {
              const pct       = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
              const done      = pct >= 100;
              const gradClass = getGradient(pct);
              const badge     = deadlineBadge(goal.deadline);

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={pulseId === goal.id ? { scale: [1, 1.02, 1], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4 }}
                  className={`rounded-2xl border p-3 transition-all group ${
                    done
                      ? "bg-emerald-500/10 border-emerald-400/25 shadow-[0_0_16px_rgba(52,211,153,0.12)]"
                      : "bg-white/5 border-white/8 hover:bg-white/8"
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className="text-base leading-none shrink-0">{goal.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <GoalNameEditor goal={goal} onSave={renameGoal} />
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {fmt(goal.current)} <span className="text-white/20">/ {fmt(goal.target)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {done ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-semibold">
                          <Check size={8} /> Goal Reached
                        </span>
                      ) : (
                        <span className="text-[12px] font-bold text-white/70">{Math.round(pct)}%</span>
                      )}
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-md bg-rose-400/10 hover:bg-rose-400/25 flex items-center justify-center text-rose-400/60 hover:text-rose-400"
                        title="Delete goal"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </div>

                  {/* Milestone badges */}
                  <MilestoneBadges pct={pct} goalId={goal.id} />

                  {/* Deadline badge */}
                  {badge && (
                    <div className="mb-1.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                        badge.urgent
                          ? "bg-rose-400/15 text-rose-300 border border-rose-400/20"
                          : "bg-white/8 text-white/40 border border-white/10"
                      )}>
                        <CalendarDays size={8} />
                        {badge.label}
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-2">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${gradClass}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openAction(goal.id, "deposit")}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        activeCard === goal.id && inputMode === "deposit"
                          ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80 border border-transparent"
                      }`}
                    >
                      <Plus size={9} /> Deposit
                    </button>
                    <button
                      onClick={() => openAction(goal.id, "withdraw")}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        activeCard === goal.id && inputMode === "withdraw"
                          ? "bg-rose-400/20 text-rose-300 border border-rose-400/30"
                          : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80 border border-transparent"
                      }`}
                    >
                      <Minus size={9} /> Withdraw
                    </button>

                    <AnimatePresence>
                      {activeCard === goal.id && inputMode && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          className="flex items-center gap-1 ml-auto overflow-hidden"
                        >
                          <input
                            autoFocus
                            type="number"
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && applyAction(goal.id)}
                            placeholder="Amount"
                            className="w-20 bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/30"
                          />
                          <button
                            onClick={() => applyAction(goal.id)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              inputMode === "deposit" ? "bg-emerald-400/30 text-emerald-300" : "bg-rose-400/30 text-rose-300"
                            }`}
                          >
                            <Check size={9} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="flex items-center justify-between pt-2 border-t border-white/8 shrink-0">
          <span className="text-[10px] text-white/30">{goals.length} goals active</span>
          <span className="text-[10px] text-white/50 font-medium">
            {fmt(totalCurrent)} total saved
          </span>
        </div>
      )}
    </div>
  );
};

export default SavingsWidget;
