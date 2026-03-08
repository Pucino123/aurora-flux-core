import React, { useState } from "react";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Trash2, Pencil, X, Check, Building2, DollarSign, User, Receipt } from "lucide-react";
import { useCRM, CRMDeal, Stage } from "@/context/CRMContext";
import { toast } from "sonner";
import InvoiceModal from "@/components/crm/InvoiceModal";

const STAGE_CONFIG: Record<Stage, { label: string; dot: string; text: string; bg: string }> = {
  leads:     { label: "New Lead",      dot: "#3b82f6", text: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30" },
  contacted: { label: "Contacted",     dot: "#eab308", text: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  proposal:  { label: "Proposal Sent", dot: "#f97316", text: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  closed:    { label: "Closed / Won",  dot: "#22c55e", text: "text-green-400",  bg: "bg-green-500/15 border-green-500/30" },
};
const STAGES = Object.keys(STAGE_CONFIG) as Stage[];

const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const initials = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

interface DealFormProps {
  initial?: Partial<CRMDeal>;
  onSave: (d: Omit<CRMDeal, "id">) => void;
  onClose: () => void;
}
const DealForm: React.FC<DealFormProps> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [value, setValue] = useState(String(initial?.value || "5000"));
  const [stage, setStage] = useState<Stage>(initial?.stage || "leads");

  const handleSave = () => {
    if (!name.trim() || !company.trim()) { toast.error("Name and company are required"); return; }
    onSave({ name: name.trim(), company: company.trim(), value: parseInt(value.replace(/\D/g, "") || "0"), stage, invoices: [] });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <p className="text-sm font-bold">{initial?.id ? "Edit Deal" : "New Deal"}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {[
            { label: "Contact Name", icon: User, val: name, set: setName, ph: "Alex Turner" },
            { label: "Company", icon: Building2, val: company, set: setCompany, ph: "Acme Corp." },
            { label: "Deal Value ($)", icon: DollarSign, val: value, set: setValue, ph: "5000" },
          ].map(({ label, icon: Icon, val, set, ph }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-1"><Icon size={9} />{label}</label>
              <input value={val} onChange={e => set(e.target.value)} placeholder={ph} autoFocus={label === "Contact Name"}
                className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/40 transition-colors" />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Stage</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGES.map(s => (
                <button key={s} onClick={() => setStage(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium border transition-all ${stage === s ? `${STAGE_CONFIG[s].bg} ${STAGE_CONFIG[s].text}` : "border-transparent bg-secondary/40 text-muted-foreground hover:bg-secondary"}`}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_CONFIG[s].dot }} />
                  {STAGE_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            {initial?.id ? "Save Changes" : "Add Deal"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CRMPage: React.FC = () => {
  const { deals, addDeal, updateDeal, removeDeal } = useCRM();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState<CRMDeal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [invoiceContact, setInvoiceContact] = useState<CRMDeal | null>(null);

  const filtered = deals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.company.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || d.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalValue = filtered.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <SEO title="CRM" description="Manage contacts, deals, sales pipeline and send professional invoices from one place." url="/" keywords="CRM, contacts, sales pipeline, invoice generator, deals management" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-display">CRM</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} deals · {fmt(totalValue)} total pipeline</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={15} /> New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts or companies…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-sm outline-none focus:border-primary/40 transition-colors" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...STAGES] as const).map(s => (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize ${stageFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {s === "all" ? "All" : STAGE_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STAGES.map(s => {
          const count = deals.filter(d => d.stage === s).length;
          const val = deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0);
          return (
            <div key={s} className={`flux-card border ${STAGE_CONFIG[s].bg} p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_CONFIG[s].dot }} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${STAGE_CONFIG[s].text}`}>{STAGE_CONFIG[s].label}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{fmt(val)}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="flux-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                {["Contact", "Company", "Stage", "Value", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((deal, i) => (
                  <motion.tr key={deal.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/10 hover:bg-secondary/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-primary/10 text-primary">
                          {initials(deal.name)}
                        </div>
                        <span className="text-sm font-medium">{deal.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{deal.company}</td>
                    <td className="px-4 py-3">
                      <select value={deal.stage} onChange={e => updateDeal(deal.id, { stage: e.target.value as Stage })}
                        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none transition-colors ${STAGE_CONFIG[deal.stage].bg} ${STAGE_CONFIG[deal.stage].text}`}>
                        {STAGES.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{fmt(deal.value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setInvoiceContact(deal)} title="Create Invoice"
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors">
                          <Receipt size={13} />
                        </button>
                        <button onClick={() => setEditDeal(deal)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(deal.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">No deals match your filters.</div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && <DealForm onSave={d => addDeal(d)} onClose={() => setShowForm(false)} />}
        {editDeal && <DealForm initial={editDeal} onSave={d => updateDeal(editDeal.id, d)} onClose={() => setEditDeal(null)} />}
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl bg-card border border-border/30 p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <p className="font-bold mb-1">Delete Deal?</p>
              <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground bg-secondary/50 transition-colors">Cancel</button>
                <button onClick={() => { removeDeal(confirmDelete); setConfirmDelete(null); toast.success("Deal deleted"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InvoiceModal
        open={!!invoiceContact}
        contact={invoiceContact}
        onClose={() => setInvoiceContact(null)}
      />
    </div>
  );
};

export default CRMPage;
