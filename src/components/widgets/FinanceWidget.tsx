import { useFlux } from "@/context/FluxContext";
import { formatCurrency } from "@/lib/locale";
import { t } from "@/lib/i18n";
import ProgressRing from "../ProgressRing";
import { Wallet, TrendingUp, PiggyBank } from "lucide-react";

export const BudgetPreviewWidget = () => {
  const { tasks } = useFlux();
  const budgets = tasks.filter((tk) => tk.type === "budget");

  if (budgets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        {t("widget.no_budgets")}
      </div>
    );
  }

  const latest = budgets[budgets.length - 1];
  let rows: { category: string; budgeted: number; spent: number }[] = [];
  try { rows = JSON.parse(latest.content || "[]"); } catch { rows = []; }
  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <Wallet size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display truncate">{latest.title}</span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto">
        {rows.slice(0, 4).map((r, i) => (
          <div key={i} className="flex justify-between text-[10px]">
            <span className="truncate text-muted-foreground">{r.category || "—"}</span>
            <span className="font-medium">{formatCurrency(r.spent)}/{formatCurrency(r.budgeted)}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-border mt-auto flex justify-between text-[11px] font-semibold">
        <span>{t("stream.total")}</span>
        <span className={totalSpent > totalBudgeted ? "text-destructive" : ""}>
          {formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
        </span>
      </div>
    </div>
  );
};

export const SavingsRingWidget = () => {
  const { goals } = useFlux();
  const topGoal = goals[0];

  if (!topGoal) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        {t("widget.no_goals")}
      </div>
    );
  }

  const pct = topGoal.target_amount > 0
    ? Math.min((topGoal.current_amount / topGoal.target_amount) * 100, 100)
    : 0;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <PiggyBank size={16} className="text-primary" />
      <ProgressRing value={pct} size={64} strokeWidth={4} />
      <span className="text-xs font-semibold font-display truncate max-w-full px-2">{topGoal.title}</span>
      <span className="text-[10px] text-muted-foreground">
        {formatCurrency(topGoal.current_amount)} / {formatCurrency(topGoal.target_amount)}
      </span>
    </div>
  );
};

export const TotalBalanceWidget = () => {
  const { goals, tasks } = useFlux();
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const budgets = tasks.filter((tk) => tk.type === "budget");
  let totalBudgeted = 0;
  let totalSpent = 0;
  budgets.forEach((b) => {
    try {
      const rows = JSON.parse(b.content || "[]");
      rows.forEach((r: any) => {
        totalBudgeted += r.budgeted || 0;
        totalSpent += r.spent || 0;
      });
    } catch {}
  });

  return (
    <div className="h-full flex flex-col items-center justify-center gap-1">
      <TrendingUp size={20} className="text-primary mb-1" />
      <span className="text-[10px] text-muted-foreground">{t("widget.total_saved")}</span>
      <span className="text-lg font-bold font-display">{formatCurrency(totalSaved)}</span>
      <span className="text-[10px] text-muted-foreground mt-1">{t("widget.budget_remaining")}</span>
      <span className="text-sm font-semibold">{formatCurrency(totalBudgeted - totalSpent)}</span>
    </div>
  );
};
