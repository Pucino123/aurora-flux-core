import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, GripVertical, ChevronDown, ChevronRight, Phone, Mail,
  StickyNote, X, Loader2, Building2, DollarSign, User,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import DraggableWidget from "./DraggableWidget";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

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

const INITIAL_DEALS: Omit<Deal, "id">[] = [
  { name: "Alex Turner",    company: "Apex Dynamics",    value: 12500, stage: "leads" },
  { name: "Sofia Martins",  company: "NovaBuild Ltd.",   value: 8200,  stage: "leads" },
  { name: "Jared Kim",      company: "CloudStack Inc.",  value: 21000, stage: "contacted" },
  { name: "Priya Shah",     company: "Meridian Group",   value: 5500,  stage: "contacted" },
  { name: "Lucas Weber",    company: "TechForge GmbH",   value: 33000, stage: "proposal" },
  { name: "Amara Osei",     company: "Greenline Co.",    value: 9800,  stage: "proposal" },
  { name: "Nina Volkova",   company: "Stellar Systems",  value: 47500, stage: "closed" },
];

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const formatValue = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

// ── New Deal Schema ──
const dealSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  company: z.string().trim().min(1, "Company required").max(100),
  value: z.number().min(0, "Value must be ≥ 0").max(99_999_999),
  stage: z.enum(["leads", "contacted", "proposal", "closed"]),
});

// ── New Deal Modal ──
interface NewDealModalProps {
  onSave: (deal: Omit<Deal, "id">) => void;
  onClose: () => void;
}

const NewDealModal: React.FC<NewDealModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [valueStr, setValueStr] = useState("5000");
  const [stage, setStage] = useState<Stage>("leads");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const parsed = dealSchema.safeParse({
      name, company,
      value: parseInt(valueStr.replace(/\D/g, "") || "0"),
      stage,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }
    const d = parsed.data;
    onSave({ name: d.name, company: d.company, value: d.value, stage: d.stage });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/12 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(12,10,25,0.98) 0%, rgba(8,6,18,0.98) 100%)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <p className="text-sm font-bold text-white/90">New Deal</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
              <User size={9} /> Contact Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
              placeholder="Alex Turner"
              className={`w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors ${errors.name ? "border-red-400/50" : "border-white/10"}`}
            />
            {errors.name && <p className="text-[10px] text-red-400">{errors.name}</p>}
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
              <Building2 size={9} /> Company
            </label>
            <input
              value={company}
              onChange={e => { setCompany(e.target.value); setErrors(p => ({ ...p, company: "" })); }}
              placeholder="Acme Corp."
              className={`w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors ${errors.company ? "border-red-400/50" : "border-white/10"}`}
            />
            {errors.company && <p className="text-[10px] text-red-400">{errors.company}</p>}
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
              <DollarSign size={9} /> Deal Value
            </label>
            <input
              value={valueStr}
              onChange={e => { setValueStr(e.target.value); setErrors(p => ({ ...p, value: "" })); }}
              placeholder="5000"
              inputMode="numeric"
              className={`w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors ${errors.value ? "border-red-400/50" : "border-white/10"}`}
            />
            {errors.value && <p className="text-[10px] text-red-400">{errors.value}</p>}
          </div>

          {/* Stage */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Stage</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGE_ORDER.map(s => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all ${stage === s ? "bg-white/12 text-white" : "bg-white/4 text-white/40 hover:bg-white/8 hover:text-white/70"}`}
                  style={stage === s ? { border: `1px solid ${STAGE_CONFIG[s].dot}50` } : { border: "1px solid transparent" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STAGE_CONFIG[s].dot }} />
                  {STAGE_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.7), rgba(59,130,246,0.7))",
              boxShadow: "0 4px 16px rgba(139,92,246,0.25)",
            }}
          >
            Add Deal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Draggable Deal Card ──

interface DealCardCoreProps {
  deal: Deal;
  onStageChange: (id: string, stage: Stage) => void;
  isDragging?: boolean;
  overlay?: boolean;
}

const DealCardCore: React.FC<DealCardCoreProps> = ({ deal, onStageChange, isDragging, overlay }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <motion.div
        layout={!overlay}
        initial={overlay ? undefined : { opacity: 0, y: 6 }}
        animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: overlay ? 1.04 : 1 }}
        className={`flex items-center gap-2 px-2 py-2 rounded-xl border transition-colors group cursor-grab active:cursor-grabbing ${
          overlay
            ? "bg-white/20 border-white/25 shadow-xl"
            : "bg-white/5 border-white/8 hover:bg-white/8"
        }`}
        onClick={overlay ? undefined : () => setPopoverOpen(!popoverOpen)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); }}
      >
        <GripVertical size={10} className="text-white/25 shrink-0" />
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
          {showActions && !overlay && (
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
        {popoverOpen && !overlay && (
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

// ── DnD wrappers ──

const DraggableDeal: React.FC<{ deal: Deal; onStageChange: (id: string, stage: Stage) => void; isDragging: boolean }> = ({ deal, onStageChange, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, position: "relative" } : undefined}
    >
      <DealCardCore deal={deal} onStageChange={onStageChange} isDragging={isDragging} />
    </div>
  );
};

const DroppableStage: React.FC<{
  stage: Stage;
  isOpen: boolean;
  stageDeals: Deal[];
  total: { count: number; value: number };
  isOver: boolean;
  onToggle: () => void;
  onStageChange: (id: string, stage: Stage) => void;
  activeDealId: string | null;
}> = ({ stage, isOpen, stageDeals, total, isOver, onToggle, onStageChange, activeDealId }) => {
  const { setNodeRef } = useDroppable({ id: stage });
  const cfg = STAGE_CONFIG[stage];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border overflow-hidden transition-colors ${isOver ? "border-white/25" : "border-white/8"}`}
      style={isOver ? { boxShadow: `0 0 0 2px ${cfg.dot}40` } : undefined}
    >
      <button
        onClick={onToggle}
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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`p-2 space-y-1.5 min-h-[36px] transition-colors ${isOver ? "bg-white/3" : ""}`}>
              {stageDeals.length === 0 && !isOver ? (
                <p className="text-[9px] text-white/20 text-center py-2">
                  {activeDealId ? "Drop here" : "No deals in this stage"}
                </p>
              ) : (
                stageDeals.map(deal => (
                  <DraggableDeal
                    key={deal.id}
                    deal={deal}
                    onStageChange={onStageChange}
                    isDragging={deal.id === activeDealId}
                  />
                ))
              )}
              {isOver && stageDeals.length === 0 && (
                <div
                  className="h-9 rounded-xl border-2 border-dashed flex items-center justify-center text-[9px] font-medium"
                  style={{ borderColor: `${cfg.dot}50`, color: cfg.textColor }}
                >
                  Drop here
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main CRM content ──

const CRMWidgetContent = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<Stage>>(new Set(["leads", "contacted", "proposal", "closed"]));
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const seededRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ── Load from DB ──
  useEffect(() => {
    if (!user) {
      setDeals(INITIAL_DEALS.map((d, i) => ({ ...d, id: `local-${i}` })));
      return;
    }
    setLoading(true);
    supabase
      .from("crm_deals")
      .select("id, name, company, value, stage")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .then(async ({ data, error }) => {
        setLoading(false);
        if (error || !data || data.length === 0) {
          if (!seededRef.current) {
            seededRef.current = true;
            const inserts = INITIAL_DEALS.map((d, i) => ({ ...d, user_id: user.id, sort_order: i }));
            const { data: inserted } = await supabase
              .from("crm_deals")
              .insert(inserts)
              .select("id, name, company, value, stage");
            if (inserted) {
              setDeals(inserted.map(r => ({
                id: r.id, name: r.name, company: r.company,
                value: Number(r.value), stage: r.stage as Stage,
              })));
            }
          }
          return;
        }
        setDeals(data.map(r => ({
          id: r.id, name: r.name, company: r.company,
          value: Number(r.value), stage: r.stage as Stage,
        })));
      });
  }, [user]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!user) return;
    channelRef.current = supabase
      .channel(`crm-rt-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "crm_deals",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id: string }).id;
          setDeals(prev => prev.filter(d => d.id !== oldId));
        } else if (payload.eventType === "INSERT") {
          const r = payload.new as { id: string; name: string; company: string; value: number; stage: string };
          setDeals(prev => {
            if (prev.find(d => d.id === r.id)) return prev;
            return [...prev, { id: r.id, name: r.name, company: r.company, value: Number(r.value), stage: r.stage as Stage }];
          });
        } else if (payload.eventType === "UPDATE") {
          const r = payload.new as { id: string; name: string; company: string; value: number; stage: string };
          setDeals(prev => prev.map(d => d.id === r.id
            ? { ...d, stage: r.stage as Stage, name: r.name, company: r.company, value: Number(r.value) }
            : d
          ));
        }
      })
      .subscribe();
    return () => { channelRef.current?.unsubscribe(); };
  }, [user]);

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
      [s]: {
        count: filtered.filter(d => d.stage === s).length,
        value: filtered.filter(d => d.stage === s).reduce((a, d) => a + d.value, 0),
      },
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

  const handleStageChange = useCallback(async (id: string, stage: Stage) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d));
    if (user && !id.startsWith("local-")) {
      await supabase.from("crm_deals").update({ stage }).eq("id", id).eq("user_id", user.id);
    }
  }, [user]);

  const handleNewDeal = useCallback(async (dealData: Omit<Deal, "id">) => {
    setShowNewDeal(false);
    if (user) {
      const { data, error } = await supabase
        .from("crm_deals")
        .insert({ ...dealData, user_id: user.id, sort_order: 0 })
        .select("id, name, company, value, stage")
        .single();
      if (!error && data) {
        setDeals(prev => [{ id: data.id, name: data.name, company: data.company, value: Number(data.value), stage: data.stage as Stage }, ...prev]);
        setExpanded(prev => new Set([...prev, dealData.stage]));
        return;
      }
    }
    setDeals(prev => [{ id: `local-${Date.now()}`, ...dealData }, ...prev]);
    setExpanded(prev => new Set([...prev, dealData.stage]));
  }, [user]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(event.active.id as string);
  };

  const handleDragOver = (event: { over: { id: string } | null }) => {
    if (event.over && STAGE_ORDER.includes(event.over.id as Stage)) {
      setOverStage(event.over.id as Stage);
    } else {
      setOverStage(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDealId(null);
    setOverStage(null);
    if (!over) return;
    const targetStage = over.id as Stage;
    if (!STAGE_ORDER.includes(targetStage)) return;
    const deal = deals.find(d => d.id === active.id);
    if (!deal || deal.stage === targetStage) return;
    handleStageChange(active.id as string, targetStage);
    setExpanded(prev => new Set([...prev, targetStage]));
  };

  const activeDeal = activeDealId ? deals.find(d => d.id === activeDealId) : null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver as any} onDragEnd={handleDragEnd}>
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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewDeal(true)}
              className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <Plus size={12} />
            </motion.button>
          </div>

          {/* Pipeline Stages */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-white/20" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto council-hidden-scrollbar px-3 pb-3 space-y-2">
              {STAGE_ORDER.map(stage => (
                <DroppableStage
                  key={stage}
                  stage={stage}
                  isOpen={expanded.has(stage)}
                  stageDeals={filtered.filter(d => d.stage === stage)}
                  total={stageTotals[stage]}
                  isOver={overStage === stage}
                  onToggle={() => toggleStage(stage)}
                  onStageChange={handleStageChange}
                  activeDealId={activeDealId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeDeal && (
            <DealCardCore deal={activeDeal} onStageChange={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>

      {/* New Deal Modal */}
      <AnimatePresence>
        {showNewDeal && (
          <NewDealModal onSave={handleNewDeal} onClose={() => setShowNewDeal(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

const CRMWidget = () => (
  <DraggableWidget id="crm" title="Sales Pipeline" defaultPosition={{ x: 60, y: 80 }} defaultSize={{ w: 340, h: 520 }} scrollable>
    <CRMWidgetContent />
  </DraggableWidget>
);

export default CRMWidget;
