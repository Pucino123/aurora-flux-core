import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, Plus, Check, X, Trash2, Wallet, Pin } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useFlux, DbGoal } from "@/context/FluxContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/locale";
import { t } from "@/lib/i18n";
import CollapsibleSection from "./CollapsibleSection";
import ProgressRing from "./ProgressRing";

const CHART_COLORS = [
  "hsl(217, 90%, 70%)",
  "hsl(270, 70%, 65%)",
  "hsl(330, 80%, 75%)",
  "hsl(150, 60%, 50%)",
  "hsl(45, 80%, 55%)",
];

interface FinanceDashboardProps {
  goal: DbGoal;
}

const FinanceDashboard = ({ goal }: FinanceDashboardProps) => {
  const { updateGoal, removeGoal } = useFlux();
  const [depositAmount, setDepositAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState(goal.target_amount.toString());
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(goal.title);

  const commitRename = () => {
    if (renameValue.trim() && renameValue !== goal.title) {
      updateGoal(goal.id, { title: renameValue.trim() });
      toast.success(t("brain.renamed") || "Omdøbt");
    }
    setRenaming(false);
  };

  const togglePin = () => {
    const newPinned = !goal.pinned;
    updateGoal(goal.id, { pinned: newPinned });
    toast.success(newPinned ? (t("home.pinned") || "Pinned") : (t("home.unpinned") || "Unpinned"));
  };

  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const remaining = goal.target_amount - goal.current_amount;
  const daysLeft = goal.deadline ? Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)) : null;
  const dailyNeeded = daysLeft && remaining > 0 ? remaining / daysLeft : null;

  const pieData = useMemo(() => [
    { name: t("fin.saved"), value: goal.current_amount },
    { name: t("fin.remaining"), value: Math.max(0, remaining) },
    ...(dailyNeeded && daysLeft ? [{ name: t("fin.projected"), value: Math.min(dailyNeeded * 30, remaining) }] : []),
  ], [goal.current_amount, remaining, dailyNeeded, daysLeft]);

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    updateGoal(goal.id, { current_amount: goal.current_amount + amount });
    setDepositAmount("");
    toast.success(`${t("toast.added")} ${formatCurrency(amount)}!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flux-card p-6 space-y-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ProgressRing value={pct} size={44} strokeWidth={3.5} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target size={20} className="text-primary" />
              {renaming ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                  className="text-lg font-bold font-display bg-transparent border-b-2 border-primary/40 outline-none"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-bold font-display cursor-pointer hover:text-primary/80 transition-colors"
                  onDoubleClick={() => { setRenameValue(goal.title); setRenaming(true); }}
                  title={t("brain.rename")}
                >
                  {goal.title}
                </h2>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)} ({pct.toFixed(1)}%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePin}
            className={`p-1.5 rounded-lg transition-colors ${goal.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title={goal.pinned ? (t("home.unpin") || "Unpin") : (t("home.pin") || "Pin")}
          >
            <Pin size={14} className={goal.pinned ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => { removeGoal(goal.id); toast(t("fin.goal_removed")); }}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="w-full h-4 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--aurora-blue))] to-[hsl(var(--aurora-violet))]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{t("fin.saved")}</p>
          <p className="text-sm font-bold font-display">{formatCurrency(goal.current_amount)}</p>
        </div>
        <div className="glass-panel rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{t("fin.remaining")}</p>
          <p className="text-sm font-bold font-display">{formatCurrency(Math.max(0, remaining))}</p>
        </div>
        <div className="glass-panel rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{t("fin.daily_avg")}</p>
          <p className="text-sm font-bold font-display">
            {dailyNeeded ? formatCurrency(dailyNeeded) : "—"}
          </p>
          {daysLeft && <p className="text-[9px] text-muted-foreground">{daysLeft}{t("fin.days_left")}</p>}
        </div>
      </div>

      <CollapsibleSection title={t("fin.details") || "Details"}>
        <div className="flex gap-6 items-center pt-2">
          <div className="w-[160px] h-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-medium">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <div className="flex gap-2 items-center">
        <input
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          type="number"
          placeholder={t("fin.amount_placeholder")}
          className="flex-1 text-xs bg-transparent border-b border-border outline-none py-1.5"
          onKeyDown={(e) => e.key === "Enter" && handleDeposit()}
        />
        <button
          onClick={handleDeposit}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
        >
          <Wallet size={10} /> {t("fin.deposit")}
        </button>
      </div>

      {editing ? (
        <div className="flex gap-2 items-center">
          <input value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="w-28 text-xs bg-transparent border-b border-border outline-none" placeholder={t("fin.new_target")} />
          <button onClick={() => { updateGoal(goal.id, { target_amount: Number(editTarget) || 0 }); setEditing(false); }} className="p-0.5 text-primary"><Check size={12} /></button>
          <button onClick={() => setEditing(false)} className="p-0.5 text-muted-foreground"><X size={12} /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-[11px] text-primary hover:underline flex items-center gap-1">
          <TrendingUp size={10} /> {t("fin.edit_target")}
        </button>
      )}
    </motion.div>
  );
};

export default FinanceDashboard;
