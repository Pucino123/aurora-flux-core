import { useState, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/locale";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface BudgetEntry {
  id: string;
  description: string;
  amount: number;
}

interface BudgetTab {
  id: string;
  name: string;
  income: BudgetEntry[];
  expenses: BudgetEntry[];
}

/* ─────────────────────────────────────────────
   Mock data
───────────────────────────────────────────── */
const INITIAL_TABS: BudgetTab[] = [
  {
    id: "march",
    name: "March Budget",
    income: [
      { id: "i1", description: "Monthly Salary", amount: 4800 },
      { id: "i2", description: "Freelance Project", amount: 650 },
      { id: "i3", description: "Investment Returns", amount: 210 },
    ],
    expenses: [
      { id: "e1", description: "Rent", amount: 1400 },
      { id: "e2", description: "Groceries", amount: 320 },
      { id: "e3", description: "Utilities", amount: 95 },
      { id: "e4", description: "Subscriptions", amount: 48 },
      { id: "e5", description: "Transport", amount: 130 },
    ],
  },
  {
    id: "vacation",
    name: "Vacation",
    income: [
      { id: "i4", description: "Vacation Fund", amount: 2000 },
      { id: "i5", description: "Bonus Contribution", amount: 500 },
    ],
    expenses: [
      { id: "e6", description: "Flights", amount: 780 },
      { id: "e7", description: "Hotel (7 nights)", amount: 630 },
      { id: "e8", description: "Activities", amount: 200 },
      { id: "e9", description: "Food & Dining", amount: 300 },
    ],
  },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
let _counter = 0;
function uid() {
  return `entry-${Date.now()}-${++_counter}`;
}

/* ─────────────────────────────────────────────
   Inline-editable cell
───────────────────────────────────────────── */
function EditableCell({
  value,
  onCommit,
  numeric = false,
  placeholder = "",
  className = "",
}: {
  value: string | number;
  onCommit: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    onCommit(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={numeric ? "number" : "text"}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className={`bg-transparent outline-none border-b border-primary/50 w-full text-sm ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      title="Click to edit"
      className={`cursor-text hover:text-primary transition-colors ${className}`}
    >
      {numeric ? formatCurrency(Number(value)) : (value || <span className="text-muted-foreground/40 italic">{placeholder}</span>)}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Entry table (income or expenses)
───────────────────────────────────────────── */
function EntryTable({
  entries,
  accentColor,
  label,
  onUpdate,
  onDelete,
  onAdd,
}: {
  entries: BudgetEntry[];
  accentColor: string;
  label: string;
  onUpdate: (id: string, field: "description" | "amount", value: string) => void;
  onDelete: (id: string) => void;
  onAdd: (description: string, amount: number) => void;
}) {
  const [newDesc, setNewDesc] = useState("");
  const [newAmt, setNewAmt] = useState("");

  const handleAdd = () => {
    const amt = parseFloat(newAmt);
    if (!newDesc.trim() || isNaN(amt) || amt <= 0) return;
    onAdd(newDesc.trim(), amt);
    setNewDesc("");
    setNewAmt("");
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${accentColor}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <EditableCell
                value={entry.description}
                placeholder="Description"
                onCommit={(v) => onUpdate(entry.id, "description", v)}
                className="block w-full text-sm"
              />
            </div>
            <div className="w-24 text-right shrink-0">
              <EditableCell
                value={entry.amount}
                numeric
                placeholder="0"
                onCommit={(v) => onUpdate(entry.id, "amount", v)}
                className="text-sm font-medium text-right"
              />
            </div>
            <button
              onClick={() => onDelete(entry.id)}
              className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add row */}
      <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 transition-colors">
        <input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New item..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
        />
        <input
          value={newAmt}
          onChange={(e) => setNewAmt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          type="number"
          placeholder="Amount"
          className="w-20 bg-transparent text-xs outline-none text-right placeholder:text-muted-foreground/40"
        />
        <button
          onClick={handleAdd}
          className="shrink-0 p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Summary card
───────────────────────────────────────────── */
function SummaryCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-secondary/40 border border-border/60 px-4 py-3 flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={colorClass} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</span>
      </div>
      <span className={`text-base font-bold font-display truncate ${colorClass}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main BudgetWidget
───────────────────────────────────────────── */
interface BudgetWidgetProps {
  /** forwarded from DraggableWidget / Eco Tools usage */
  className?: string;
}

const BudgetWidget = ({ className = "" }: BudgetWidgetProps) => {
  const [tabs, setTabs] = useState<BudgetTab[]>(INITIAL_TABS);
  const [activeId, setActiveId] = useState<string>(INITIAL_TABS[0].id);
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  /* ── derived ── */
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const totalIncome = activeTab.income.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = activeTab.expenses.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  /* ── tab helpers ── */
  const createTab = () => {
    if (!newTabName.trim()) return;
    const id = uid();
    setTabs((prev) => [...prev, { id, name: newTabName.trim(), income: [], expenses: [] }]);
    setActiveId(id);
    setNewTabName("");
    setAddingTab(false);
  };

  /* ── entry helpers ── */
  const updateEntry = useCallback(
    (section: "income" | "expenses", id: string, field: "description" | "amount", value: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id !== activeId
            ? tab
            : {
                ...tab,
                [section]: tab[section].map((e) =>
                  e.id !== id
                    ? e
                    : { ...e, [field]: field === "amount" ? parseFloat(value) || 0 : value }
                ),
              }
        )
      );
    },
    [activeId]
  );

  const deleteEntry = useCallback(
    (section: "income" | "expenses", id: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id !== activeId
            ? tab
            : { ...tab, [section]: tab[section].filter((e) => e.id !== id) }
        )
      );
    },
    [activeId]
  );

  const addEntry = useCallback(
    (section: "income" | "expenses", description: string, amount: number) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id !== activeId
            ? tab
            : { ...tab, [section]: [...tab[section], { id: uid(), description, amount }] }
        )
      );
    },
    [activeId]
  );

  return (
    <div className={`flex flex-col h-full gap-3 ${className}`}>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab.id === activeId
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {tab.name}
          </button>
        ))}

        {/* Add tab */}
        {addingTab ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTab();
                if (e.key === "Escape") { setAddingTab(false); setNewTabName(""); }
              }}
              placeholder="Budget name..."
              className="px-2 py-1 text-xs bg-secondary/60 rounded-lg border border-primary/40 outline-none w-28"
            />
            <button onClick={createTab} className="p-1 text-primary hover:bg-primary/10 rounded">
              <Check size={13} />
            </button>
            <button onClick={() => { setAddingTab(false); setNewTabName(""); }} className="p-1 text-muted-foreground hover:bg-secondary rounded">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTab(true)}
            className="p-1.5 rounded-lg bg-secondary/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="New budget"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId + "-cards"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="flex gap-2"
        >
          <SummaryCard
            label="Total Income"
            value={totalIncome}
            icon={TrendingUp}
            colorClass="text-emerald-500"
          />
          <SummaryCard
            label="Total Expenses"
            value={totalExpenses}
            icon={TrendingDown}
            colorClass="text-rose-500"
          />
          <SummaryCard
            label="Net Balance"
            value={netBalance}
            icon={Wallet}
            colorClass={netBalance >= 0 ? "text-emerald-500" : "text-rose-500"}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Tables ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId + "-tables"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto space-y-5 min-h-0"
        >
          {/* Divider with totals */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <EntryTable
              entries={activeTab.income}
              accentColor="bg-emerald-500"
              label="Income"
              onUpdate={(id, field, value) => updateEntry("income", id, field, value)}
              onDelete={(id) => deleteEntry("income", id)}
              onAdd={(desc, amt) => addEntry("income", desc, amt)}
            />
            <div className="flex justify-between text-xs font-semibold mt-3 pt-3 border-t border-border/50">
              <span className="text-muted-foreground">Total Income</span>
              <span className="text-emerald-500">{formatCurrency(totalIncome)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <EntryTable
              entries={activeTab.expenses}
              accentColor="bg-rose-500"
              label="Expenses"
              onUpdate={(id, field, value) => updateEntry("expenses", id, field, value)}
              onDelete={(id) => deleteEntry("expenses", id)}
              onAdd={(desc, amt) => addEntry("expenses", desc, amt)}
            />
            <div className="flex justify-between text-xs font-semibold mt-3 pt-3 border-t border-border/50">
              <span className="text-muted-foreground">Total Expenses</span>
              <span className="text-rose-500">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BudgetWidget;
