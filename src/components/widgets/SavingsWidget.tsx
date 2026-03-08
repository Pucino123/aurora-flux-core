import React, { useState } from "react";
import { Plus, Minus, Check, Target, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  emoji: string;
}

const INITIAL_GOALS: SavingsGoal[] = [
  { id: "1", name: "Emergency Fund", current: 8200, target: 10000, emoji: "🛡️" },
  { id: "2", name: "New EV Car", current: 4750, target: 35000, emoji: "⚡" },
  { id: "3", name: "Japan Trip", current: 2100, target: 2300, emoji: "🗾" },
];

const getGradientStyle = (pct: number) => {
  if (pct >= 100) return "from-emerald-400 to-teal-300";
  if (pct >= 70) return "from-blue-400 to-emerald-400";
  if (pct >= 40) return "from-indigo-400 to-blue-400";
  return "from-violet-400 to-indigo-400";
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const SavingsWidget = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>(INITIAL_GOALS);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"deposit" | "withdraw" | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [pulseId, setPulseId] = useState<string | null>(null);

  const openAction = (id: string, mode: "deposit" | "withdraw") => {
    if (activeCard === id && inputMode === mode) {
      setActiveCard(null); setInputMode(null); setInputVal("");
    } else {
      setActiveCard(id); setInputMode(mode); setInputVal("");
    }
  };

  const applyAction = (id: string) => {
    const val = parseFloat(inputVal);
    if (isNaN(val) || val <= 0) return;
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const delta = inputMode === "deposit" ? val : -val;
      return { ...g, current: Math.max(0, g.current + delta) };
    }));
    setPulseId(id);
    setTimeout(() => setPulseId(null), 600);
    setActiveCard(null); setInputMode(null); setInputVal("");
  };

  const addGoal = () => {
    if (!newName.trim() || !newTarget) return;
    const target = parseFloat(newTarget);
    if (isNaN(target) || target <= 0) return;
    setGoals(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), current: 0, target, emoji: "💰" }]);
    setNewName(""); setNewTarget(""); setAdding(false);
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
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Goal name"
                className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none"
              />
              <input
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="Target $"
                type="number"
                className="w-20 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none text-right"
              />
              <button onClick={addGoal} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                <Check size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Cards */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar space-y-2 pr-0.5">
        {goals.map(goal => {
          const pct = Math.min((goal.current / goal.target) * 100, 100);
          const done = pct >= 100;
          const gradClass = getGradientStyle(pct);

          return (
            <motion.div
              key={goal.id}
              animate={pulseId === goal.id ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.4 }}
              className={`rounded-2xl border p-3 transition-all ${
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

                {/* Inline input */}
                <AnimatePresence>
                  {activeCard === goal.id && inputMode && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="flex items-center gap-1 ml-auto"
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
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-white/8 shrink-0">
        <span className="text-[10px] text-white/30">{goals.length} goals active</span>
        <span className="text-[10px] text-white/50 font-medium">
          {fmt(goals.reduce((s, g) => s + g.current, 0))} total saved
        </span>
      </div>
    </div>
  );
};

export default SavingsWidget;
