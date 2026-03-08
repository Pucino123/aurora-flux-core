import React, { useMemo, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { useCRM } from "@/context/CRMContext";
import { useMonetization } from "@/context/MonetizationContext";
import {
  BarChart3, CheckCircle2, TrendingUp, Users, DollarSign,
  AlertCircle, ArrowUpRight, Receipt, ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { motion } from "framer-motion";

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({
  icon: Icon, label, value, sub, trend, glow,
}: {
  icon: LucideIcon; label: string; value: string | number;
  sub?: string; trend?: string; glow?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-white/8 p-5 flex flex-col gap-3 relative overflow-hidden"
    style={{
      background: "hsl(var(--card)/0.7)",
      backdropFilter: "blur(20px)",
      boxShadow: glow ? `0 0 30px ${glow}` : undefined,
    }}
  >
    <div className="flex items-center justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.1)" }}>
        <Icon size={17} className="text-primary" />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <ArrowUpRight size={12} />{trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2 text-xs shadow-2xl"
      style={{ background: "hsl(var(--card)/0.97)", backdropFilter: "blur(24px)" }}>
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name === "Revenue" ? `$${(p.value || 0).toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Empty State overlay ────────────────────────────────────────────────────────
const EmptyOverlay = ({ onCTA, ctaLabel, ctaView }: { onCTA: () => void; ctaLabel: string; ctaView?: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl z-10"
    style={{ background: "hsl(var(--card)/0.85)", backdropFilter: "blur(8px)" }}>
    <AlertCircle size={28} className="text-muted-foreground/40" />
    <p className="text-xs text-muted-foreground text-center max-w-[180px]">Not enough data yet. Create your first invoice in the CRM to see insights!</p>
    <button onClick={onCTA}
      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
      {ctaLabel} <ArrowRight size={11} />
    </button>
  </div>
);

// ── PIE COLORS ────────────────────────────────────────────────────────────────
const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(160 70% 45%)",
  "hsl(270 70% 65%)",
];

// ── Main component ────────────────────────────────────────────────────────────
const AnalyticsView = () => {
  const { tasks, goals, folders } = useFlux();
  const { deals } = useCRM();
  const { setActiveView } = useMonetization() as any;
  const { setActiveView: navTo } = useFlux();

  // ── Revenue metrics ────────────────────────────────────────────────────────
  const totalRevenue = useMemo(() =>
    deals.flatMap(d => d.invoices || []).filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
    [deals]
  );
  const pendingRevenue = useMemo(() =>
    deals.flatMap(d => d.invoices || []).filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0),
    [deals]
  );

  // ── Task metrics ──────────────────────────────────────────────────────────
  const totalTasks = tasks.filter(t => t.type === "task").length;
  const doneTasks = tasks.filter(t => t.type === "task" && t.done).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ── 6-month revenue chart ─────────────────────────────────────────────────
  const revenueData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const key = format(month, "yyyy-MM");
      const rev = deals.flatMap(d => d.invoices || [])
        .filter(inv => inv.date?.startsWith(key) && inv.status === "Paid")
        .reduce((s, inv) => s + inv.amount, 0);
      return { month: format(month, "MMM"), Revenue: rev };
    });
  }, [deals]);

  const hasRevenueData = revenueData.some(d => d.Revenue > 0);

  // ── Task distribution pie ─────────────────────────────────────────────────
  const taskDistribution = useMemo(() => {
    const todo = tasks.filter(t => t.type === "task" && !t.done && t.status !== "in_progress").length;
    const inProgress = tasks.filter(t => t.type === "task" && t.status === "in_progress").length;
    const done = doneTasks;
    return [
      { name: "To Do",       value: todo },
      { name: "In Progress", value: inProgress },
      { name: "Done",        value: done },
    ].filter(d => d.value > 0);
  }, [tasks, doneTasks]);

  // ── Recent invoices ledger ────────────────────────────────────────────────
  const recentInvoices = useMemo(() => {
    return deals
      .flatMap(d => (d.invoices || []).map(inv => ({ ...inv, contact: d.name })))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
  }, [deals]);

  const navigateToCRM = useCallback(() => navTo("crm" as any), [navTo]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <BarChart3 size={22} /> Analytics & Insights
        </h2>
        <p className="text-sm text-muted-foreground">Live metrics from your workspace</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`}
          trend="+14% MTD" glow="rgba(16,185,129,0.08)"
        />
        <KpiCard
          icon={AlertCircle} label="Outstanding" value={`$${pendingRevenue.toLocaleString()}`}
          sub="Pending invoices" glow="rgba(245,158,11,0.07)"
        />
        <KpiCard
          icon={CheckCircle2} label="Task Completion" value={`${completionRate}%`}
          sub={`${doneTasks} of ${totalTasks} tasks`}
        />
        <KpiCard
          icon={Users} label="Active Contacts" value={deals.length}
          sub={`${folders.filter(f => f.type === "project").length} projects`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue area chart — span 2 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl border border-white/8 p-5 relative"
          style={{ background: "hsl(var(--card)/0.7)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue (Last 6 Months)</h3>
              <p className="text-xs text-muted-foreground">Paid invoices over time</p>
            </div>
            <TrendingUp size={16} className="text-muted-foreground/50" />
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!hasRevenueData && <EmptyOverlay onCTA={navigateToCRM} ctaLabel="Go to CRM" />}
        </motion.div>

        {/* Task pie — span 1 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/8 p-5 relative"
          style={{ background: "hsl(var(--card)/0.7)", backdropFilter: "blur(20px)" }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Task Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Status breakdown</p>
          {taskDistribution.length > 0 ? (
            <>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                      {taskDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {taskDistribution.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyOverlay onCTA={() => navTo("tasks" as any)} ctaLabel="Add Tasks" />
          )}
        </motion.div>
      </div>

      {/* Recent activity ledger */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/8 overflow-hidden"
        style={{ background: "hsl(var(--card)/0.7)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Financial Activity</h3>
          </div>
          <button onClick={navigateToCRM}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            View CRM <ArrowRight size={11} />
          </button>
        </div>
        {recentInvoices.length > 0 ? (
          <div>
            {recentInvoices.map((inv, i) => (
              <div key={i}
                className="flex items-center gap-4 px-5 py-3 border-b border-border/10 last:border-0 hover:bg-secondary/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                  {inv.contact.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.contact}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{inv.id}</p>
                </div>
                <p className="text-xs text-muted-foreground">{inv.date}</p>
                <p className="text-sm font-bold text-foreground">${inv.amount.toLocaleString()}</p>
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                  inv.status === "Paid" ? "bg-emerald-500/15 text-emerald-400" :
                  inv.status === "Pending" ? "bg-amber-500/15 text-amber-400" :
                  "bg-blue-500/15 text-blue-400"
                }`}>{inv.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <DollarSign size={28} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <button onClick={navigateToCRM}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
              Create one in CRM <ArrowRight size={11} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AnalyticsView;
