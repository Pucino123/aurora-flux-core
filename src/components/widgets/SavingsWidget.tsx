import React, { useState, useEffect, useCallback } from "react";
import { Plus, Minus, Check, Sparkles, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  emoji: string;
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

const SavingsWidget = () => {
  const { user } = useAuth();
  const [goals, setGoals]         = useState<SavingsGoal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [inputMode, setInputMode]   = useState<"deposit" | "withdraw" | null>(null);
  const [inputVal, setInputVal]     = useState("");
  const [adding, setAdding]         = useState(false);
  const [newName, setNewName]       = useState("");
  const [newTarget, setNewTarget]   = useState("");
  const [pulseId, setPulseId]       = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  const loadGoals = useCallback(async () => {
    if (!user) { setGoals(FALLBACK_GOALS); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("id, title, current_amount, target_amount")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      // Seed defaults
      const inserts = FALLBACK_GOALS.map(g => ({
        user_id: user.id,
        title: g.name,
        current_amount: g.current,
        target_amount: g.target,
        pinned: false,
      }));
      const { data: seeded } = await supabase.from("goals").insert(inserts).select();
      setGoals((seeded ?? []).map(r => ({
        id: r.id,
        name: r.title,
        current: Number(r.current_amount ?? 0),
        target: Number(r.target_amount ?? 0),
        emoji: pickEmoji(r.title),
      })));
    } else {
      setGoals(data.map(r => ({
        id: r.id,
        name: r.title,
        current: Number(r.current_amount ?? 0),
        target: Number(r.target_amount ?? 0),
        emoji: pickEmoji(r.title),
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  // ── Deposit / Withdraw ──────────────────────────────────────────────────
  const openAction = (id: string, mode: "deposit" | "withdraw") => {
    if (activeCard === id && inputMode === mode) {
      setActiveCard(null); setInputMode(null); setInputVal("");
    } else {
      setActiveCard(id); setInputMode(mode); setInputVal("");
    }
  };

  const applyAction = async (goalId: string) => {
    const val = parseFloat(inputVal);
    if (isNaN(val) || val <= 0) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const delta = inputMode === "deposit" ? val : -val;
    const newAmount = Math.max(0, goal.current + delta);

    // Optimistic update
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, current: newAmount } : g));
    setPulseId(goalId);
    setTimeout(() => setPulseId(null), 600);
    setActiveCard(null); setInputMode(null); setInputVal("");

    // Persist
    if (user) {
      await supabase.from("goals").update({ current_amount: newAmount }).eq("id", goalId).eq("user_id", user.id);
    }
  };

  // ── Add goal ────────────────────────────────────────────────────────────
  const addGoal = async () => {
    if (!newName.trim() || !newTarget) return;
    const target = parseFloat(newTarget);
    if (isNaN(target) || target <= 0) return;
    setSaving(true);
    const emoji = pickEmoji(newName);

    if (user) {
      const { data } = await supabase.from("goals").insert({
        user_id: user.id,
        title: newName.trim(),
        current_amount: 0,
        target_amount: target,
        pinned: false,
      }).select().single();
      if (data) {
        setGoals(prev => [...prev, { id: data.id, name: data.title, current: 0, target, emoji }]);
      }
    } else {
      setGoals(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), current: 0, target, emoji }]);
    }
    setNewName(""); setNewTarget(""); setAdding(false); setSaving(false);
  };

  // ── Delete goal ─────────────────────────────────────────────────────────
  const deleteGoal = async (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    if (user) {
      await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-white/50" />
          <span className="text-[11px] text-white/60 font-medium uppercase tracking-wider">Savings Goals</span>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/60 hover:text-white/90"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Add goal form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
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
              <button
                onClick={addGoal}
                disabled={saving}
                className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        /* Goal Cards */
        <div className="flex-1 overflow-y-auto council-hidden-scrollbar space-y-2 pr-0.5">
          <AnimatePresence mode="popLayout">
            {goals.map(goal => {
              const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
              const done = pct >= 100;
              const gradClass = getGradient(pct);

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={pulseId === goal.id
                    ? { scale: [1, 1.02, 1], opacity: 1, y: 0 }
                    : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4 }}
                  className={`rounded-2xl border p-3 transition-all group ${
                    done
                      ? "bg-emerald-500/10 border-emerald-400/25 shadow-[0_0_16px_rgba(52,211,153,0.12)]"
                      : "bg-white/5 border-white/8 hover:bg-white/8"
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{goal.emoji}</span>
                      <div>
                        <p className="text-[12px] font-semibold text-white/90 leading-tight">{goal.name}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {fmt(goal.current)} <span className="text-white/20">/ {fmt(goal.target)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
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
            {fmt(goals.reduce((s, g) => s + g.current, 0))} total saved
          </span>
        </div>
      )}
    </div>
  );
};

export default SavingsWidget;
