import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, GripVertical, ChevronDown, ChevronRight, Phone, Mail, StickyNote, X } from "lucide-react";
import DraggableWidget from "./DraggableWidget";

type Stage = "leads" | "contacted" | "proposal" | "closed";

interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: Stage;
}

const STAGE_CONFIG: Record<Stage, { label: string; color: string; dot: string; textColor: string }> = {
  leads:     { label: "New Leads",     color: "rgba(59,130,246,0.15)",  dot: "#3b82f6", textColor: "#93c5fd" },
  contacted: { label: "Contacted",     color: "rgba(234,179,8,0.15)",   dot: "#eab308", textColor: "#fde047" },
  proposal:  { label: "Proposal Sent", color: "rgba(249,115,22,0.15)",  dot: "#f97316", textColor: "#fdba74" },
  closed:    { label: "Closed / Won",  color: "rgba(34,197,94,0.15)",   dot: "#22c55e", textColor: "#86efac" },
};

const STAGE_ORDER: Stage[] = ["leads", "contacted", "proposal", "closed"];

const INITIAL_DEALS: Deal[] = [
  { id: "d1", name: "Alex Turner",    company: "Apex Dynamics",    value: 12500, stage: "leads" },
  { id: "d2", name: "Sofia Martins",  company: "NovaBuild Ltd.",   value: 8200,  stage: "leads" },
  { id: "d3", name: "Jared Kim",      company: "CloudStack Inc.",  value: 21000, stage: "contacted" },
  { id: "d4", name: "Priya Shah",     company: "Meridian Group",   value: 5500,  stage: "contacted" },
  { id: "d5", name: "Lucas Weber",    company: "TechForge GmbH",   value: 33000, stage: "proposal" },
  { id: "d6", name: "Amara Osei",     company: "Greenline Co.",    value: 9800,  stage: "proposal" },
  { id: "d7", name: "Nina Volkova",   company: "Stellar Systems",  value: 47500, stage: "closed" },
];

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const formatValue = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

interface DealCardProps {
  deal: Deal;
  stages: Stage[];
  onStageChange: (id: string, stage: Stage) => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, stages, onStageChange }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors group cursor-pointer"
        onClick={() => setPopoverOpen(!popoverOpen)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); }}
      >
        <GripVertical size={10} className="text-white/15 shrink-0" />
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{ background: `linear-gradient(135deg, ${STAGE_CONFIG[deal.stage].dot}40, ${STAGE_CONFIG[deal.stage].dot}20)`, border: `1px solid ${STAGE_CONFIG[deal.stage].dot}30` }}
        >
          <span style={{ color: STAGE_CONFIG[deal.stage].textColor }}>{getInitials(deal.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/80 truncate">{deal.name}</p>
          <p className="text-[9px] text-white/35 truncate">{deal.company}</p>
        </div>
        <span className="text-[10px] font-bold shrink-0" style={{ color: STAGE_CONFIG[deal.stage].textColor }}>
          {formatValue(deal.value)}
        </span>
        {/* Quick actions on hover */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-0.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-1 py-0.5"
              onClick={e => e.stopPropagation()}
            >
              {[{ icon: Phone, title: "Call" }, { icon: Mail, title: "Email" }, { icon: StickyNote, title: "Note" }].map(({ icon: Icon, title }) => (
                <button key={title} title={title} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                  <Icon size={9} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {/* Stage change popover */}
      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute left-0 right-0 z-50 mt-1 p-2 rounded-xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/40 font-medium">Move to stage</span>
              <button onClick={() => setPopoverOpen(false)}><X size={10} className="text-white/30" /></button>
            </div>
            <div className="space-y-1">
              {STAGE_ORDER.map(s => (
                <button
                  key={s}
                  onClick={() => { onStageChange(deal.id, s); setPopoverOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${deal.stage === s ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/8 hover:text-white/80"}`}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STAGE_CONFIG[s].dot }} />
                  {STAGE_CONFIG[s].label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CRMWidgetContent = () => {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<Stage>>(new Set(["leads", "contacted", "proposal", "closed"]));

  const filtered = useMemo(() =>
    search ? deals.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.company.toLowerCase().includes(search.toLowerCase())
    ) : deals,
    [deals, search]
  );

  const stageTotals = useMemo(() =>
    STAGE_ORDER.reduce((acc, s) => ({
      ...acc,
      [s]: { count: filtered.filter(d => d.stage === s).length, value: filtered.filter(d => d.stage === s).reduce((a, d) => a + d.value, 0) }
    }), {} as Record<Stage, { count: number; value: number }>),
    [filtered]
  );

  const toggleStage = (s: Stage) => {
    setExpanded(prev => {
      const ns = new Set(prev);
      if (ns.has(s)) ns.delete(s); else ns.add(s);
      return ns;
    });
  };

  const handleStageChange = (id: string, stage: Stage) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d));
  };

  const addDeal = () => {
    const name = prompt("Contact name:") || "New Contact";
    const company = prompt("Company:") || "Unknown Co.";
    const valueStr = prompt("Deal value ($):") || "5000";
    const value = parseInt(valueStr.replace(/\D/g, "")) || 5000;
    setDeals(prev => [{ id: `d-${Date.now()}`, name, company, value, stage: "leads" }, ...prev]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/8">
          <Search size={10} className="text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pipeline..."
            className="flex-1 bg-transparent text-[10px] text-white/70 outline-none placeholder:text-white/25"
          />
          {search && <button onClick={() => setSearch("")}><X size={9} className="text-white/30" /></button>}
        </div>
        <button
          onClick={addDeal}
          className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Pipeline Stages */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar px-3 pb-3 space-y-2">
        {STAGE_ORDER.map(stage => {
          const cfg = STAGE_CONFIG[stage];
          const isOpen = expanded.has(stage);
          const stageDeals = filtered.filter(d => d.stage === stage);
          const total = stageTotals[stage];

          return (
            <div key={stage} className="rounded-xl border border-white/8 overflow-hidden">
              {/* Stage header */}
              <button
                onClick={() => toggleStage(stage)}
                className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-white/5"
                style={{ background: cfg.color }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                <span className="text-[11px] font-semibold flex-1 text-left" style={{ color: cfg.textColor }}>
                  {cfg.label}
                </span>
                <span className="text-[10px] font-medium text-white/40 mr-1">
                  {total.count} · {formatValue(total.value)}
                </span>
                {isOpen ? <ChevronDown size={11} className="text-white/30" /> : <ChevronRight size={11} className="text-white/30" />}
              </button>

              {/* Deal cards */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1.5">
                      {stageDeals.length === 0 ? (
                        <p className="text-[9px] text-white/20 text-center py-2">No deals in this stage</p>
                      ) : (
                        stageDeals.map(deal => (
                          <DealCard key={deal.id} deal={deal} stages={STAGE_ORDER} onStageChange={handleStageChange} />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CRMWidget = () => (
  <DraggableWidget id="crm" title="Sales Pipeline" defaultPosition={{ x: 60, y: 80 }} defaultSize={{ w: 340, h: 520 }} scrollable>
    <CRMWidgetContent />
  </DraggableWidget>
);

export default CRMWidget;
