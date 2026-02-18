import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PieChart, Sparkles, X, Plus, Trash2, Pin } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { formatCurrency } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

export interface BudgetRow {
  category: string;
  budgeted: number;
  spent: number;
}

interface BudgetTableProps {
  taskId: string;
  title: string;
  initialRows: BudgetRow[];
  pinned?: boolean;
}

const catColors = [
  "hsl(var(--aurora-blue))",
  "hsl(var(--aurora-violet))",
  "hsl(var(--aurora-pink))",
  "hsl(150 60% 45%)",
  "hsl(30 90% 55%)",
  "hsl(200 70% 50%)",
];

const BudgetTable = ({ taskId, title, initialRows, pinned = false }: BudgetTableProps) => {
  const { updateTask } = useFlux();
  const [rows, setRows] = useState<BudgetRow[]>(initialRows);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [isPinned, setIsPinned] = useState(pinned);



  const commitRename = () => {
    if (renameValue.trim() && renameValue !== title) {
      updateTask(taskId, { title: renameValue.trim() });
      toast.success(t("brain.renamed") || "Omdøbt");
    }
    setRenaming(false);
  };

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    updateTask(taskId, { pinned: newPinned });
    toast.success(newPinned ? (t("home.pinned") || "Pinned") : (t("home.unpinned") || "Unpinned"));
  };

  // Persist rows to task content whenever they change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateTask(taskId, { content: JSON.stringify(rows) });
    }, 800);
    return () => clearTimeout(timeout);
  }, [rows, taskId]);

  const addRow = () => setRows([...rows, { category: "", budgeted: 0, spent: 0 }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof BudgetRow, value: any) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === "category" ? value : Number(value) || 0 };
    setRows(next);
  };

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const spentPercent = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flux-card mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-primary" />
          {renaming ? (
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="font-semibold text-sm font-display bg-transparent border-b-2 border-primary/40 outline-none"
              autoFocus
            />
          ) : (
            <h3
              className="font-semibold text-sm font-display cursor-pointer hover:text-primary/80 transition-colors"
              onDoubleClick={() => { setRenameValue(title); setRenaming(true); }}
              title={t("brain.rename")}
            >
              {title}
            </h3>
          )}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Sparkles size={10} /> {t("budget.interactive")}
          </span>
        </div>
        <button
          onClick={togglePin}
          className={`p-1.5 rounded-lg transition-colors ${isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          title={isPinned ? (t("home.unpin") || "Unpin") : (t("home.pin") || "Pin")}
        >
          <Pin size={14} className={isPinned ? "fill-current" : ""} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>{t("budget.spent")}: {formatCurrency(totalSpent)}</span>
          <span>{t("budget.budgeted")}: {formatCurrency(totalBudgeted)}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor:
                spentPercent > 90
                  ? "hsl(var(--destructive))"
                  : spentPercent > 70
                  ? "hsl(30 90% 55%)"
                  : "hsl(var(--primary))",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${spentPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-medium">{t("budget.category")}</th>
              <th className="text-right py-2 font-medium">{t("budget.budgeted")}</th>
              <th className="text-right py-2 font-medium">{t("budget.spent_col")}</th>
              <th className="text-right py-2 font-medium">{t("budget.remaining")}</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const remaining = row.budgeted - row.spent;
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 group">
                  <td className="py-1.5">
                    <input
                      value={row.category}
                      onChange={(e) => updateRow(i, "category", e.target.value)}
                      className="bg-transparent outline-none w-full text-sm"
                      placeholder={t("budget.category_placeholder")}
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      value={row.budgeted || ""}
                      onChange={(e) => updateRow(i, "budgeted", e.target.value)}
                      className="bg-transparent outline-none w-20 text-right text-sm"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      value={row.spent || ""}
                      onChange={(e) => updateRow(i, "spent", e.target.value)}
                      className="bg-transparent outline-none w-20 text-right text-sm"
                      placeholder="0"
                    />
                  </td>
                  <td
                    className={`py-1.5 text-right text-sm font-medium ${
                      remaining < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {formatCurrency(remaining)}
                  </td>
                  <td className="py-1.5">
                    <button
                      onClick={() => removeRow(i)}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                    >
                      <Trash2 size={12} className="text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold border-t border-border">
              <td className="py-2">{t("stream.total")}</td>
              <td className="py-2 text-right">{formatCurrency(totalBudgeted)}</td>
              <td className="py-2 text-right">{formatCurrency(totalSpent)}</td>
              <td className={`py-2 text-right ${totalRemaining < 0 ? "text-destructive" : ""}`}>
                {formatCurrency(totalRemaining)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
      >
        <Plus size={12} /> {t("stream.add_row")}
      </button>

      {/* Category breakdown */}
      {rows.filter((r) => r.category && r.budgeted > 0).length > 1 && (
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {rows
            .filter((r) => r.category && r.budgeted > 0)
            .map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: catColors[i % catColors.length] }}
                />
                {r.category}: {formatCurrency(r.budgeted)}
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
};

export default BudgetTable;
