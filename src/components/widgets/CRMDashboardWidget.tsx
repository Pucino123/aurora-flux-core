import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowUpRight, X, Building2, DollarSign, User } from "lucide-react";
import { useCRM, CRMDeal, Stage } from "@/context/CRMContext";
import { useFlux } from "@/context/FluxContext";
import { toast } from "sonner";

const STAGE_DOT: Record<Stage, string> = {
  leads: "#3b82f6",
  contacted: "#eab308",
  proposal: "#f97316",
  closed: "#22c55e",
};
const STAGE_LABEL: Record<Stage, string> = {
  leads: "Lead", contacted: "Contacted", proposal: "Proposal", closed: "Closed",
};

const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const initials = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

const CRMDashboardWidget: React.FC = () => {
  const { deals, addDeal } = useCRM();
  const { setActiveView } = useFlux();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const recentDeals = deals.slice(0, 5);

  const handleQuickAdd = () => {
    if (!name.trim() || !company.trim()) { toast.error("Name and company required"); return; }
    addDeal({ name: name.trim(), company: company.trim(), value: 0, stage: "leads" });
    toast.success("Lead added!");
    setName(""); setCompany(""); setShowQuickAdd(false);
  };

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-foreground">CRM Pipeline</p>
          <p className="text-[10px] text-muted-foreground">{deals.length} deals · {fmt(deals.reduce((s, d) => s + d.value, 0))}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Quick add lead">
            <Plus size={13} />
          </button>
          <button onClick={() => setActiveView("crm" as any)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="View all">
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* Quick add form */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="bg-secondary/40 rounded-xl p-3 space-y-2 border border-border/30">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name"
                className="w-full bg-background/60 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary/40 transition-colors" />
              <input value={company} onChange={e => setCompany(e.target.value)} onKeyDown={e => e.key === "Enter" && handleQuickAdd()} placeholder="Company"
                className="w-full bg-background/60 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary/40 transition-colors" />
              <div className="flex gap-1.5">
                <button onClick={() => setShowQuickAdd(false)} className="flex-1 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground transition-colors"><X size={10} className="inline mr-1" />Cancel</button>
                <button onClick={handleQuickAdd} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground transition-colors">Add Lead</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deal list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {recentDeals.map((deal, i) => (
          <motion.div key={deal.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-primary/10 text-primary">
              {initials(deal.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate">{deal.name}</p>
              <p className="text-[9px] text-muted-foreground truncate">{deal.company}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STAGE_DOT[deal.stage] }} title={STAGE_LABEL[deal.stage]} />
              <span className="text-[10px] font-bold text-foreground">{fmt(deal.value)}</span>
            </div>
          </motion.div>
        ))}
        {deals.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-4">No deals yet. Add your first lead!</p>
        )}
      </div>

      {/* View all link */}
      {deals.length > 5 && (
        <button onClick={() => setActiveView("crm" as any)}
          className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors text-center">
          View all {deals.length} deals →
        </button>
      )}
    </div>
  );
};

export default CRMDashboardWidget;
