import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronRight, Star, Trash2, TrendingUp, BookOpen,
  Search, SlidersHorizontal, X, RotateCcw, Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BOARDROOM_PERSONA_KEYS = ["elena", "helen", "anton", "margot"];
const PERSONA_CONFIG: Record<string, { name: string; initials: string; color: string }> = {
  elena:  { name: "Elena",  initials: "EV", color: "#34d399" },
  helen:  { name: "Helen",  initials: "HK", color: "#fbbf24" },
  anton:  { name: "Anton",  initials: "AO", color: "#f87171" },
  margot: { name: "Margot", initials: "ML", color: "#22d3ee" },
};

export interface BoardroomIdea {
  id: string;
  content: string;
  consensus_score: number | null;
  starred: boolean | null;
  created_at: string;
  responses: { persona_key: string; vote_score: number | null; analysis: string | null }[];
}

interface Props {
  userId: string;
  onRestoreIdea: (idea: BoardroomIdea) => void;
}

// ── Filter bar ──

interface FilterState {
  search: string;
  starredOnly: boolean;
  dateRange: "all" | "week" | "month" | "3months";
  advisorFilter: Record<string, { min: number; max: number } | null>;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  starredOnly: false,
  dateRange: "all",
  advisorFilter: { elena: null, helen: null, anton: null, margot: null },
};

const DATE_RANGE_OPTIONS = [
  { value: "all",    label: "All time" },
  { value: "week",   label: "This week" },
  { value: "month",  label: "This month" },
  { value: "3months",label: "3 months" },
];

const CONFIDENCE_BRACKETS = [
  { label: "Any",    min: 0,  max: 100 },
  { label: "High",   min: 70, max: 100 },
  { label: "Mid",    min: 40, max: 69 },
  { label: "Low",    min: 0,  max: 39 },
];

const BoardroomIdeasHistory: React.FC<Props> = ({ userId, onRestoreIdea }) => {
  const [ideas, setIdeas] = useState<BoardroomIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    loadBoardroomIdeas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadBoardroomIdeas = async () => {
    setLoading(true);
    try {
      const { data: ideaData } = await supabase
        .from("council_ideas")
        .select("id, content, consensus_score, starred, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!ideaData) { setLoading(false); return; }

      const ideaIds = ideaData.map(i => i.id);
      const { data: respData } = await supabase
        .from("council_responses")
        .select("idea_id, persona_key, vote_score, analysis")
        .in("idea_id", ideaIds)
        .in("persona_key", BOARDROOM_PERSONA_KEYS);

      const respByIdea = (respData || []).reduce((acc, r) => {
        if (!acc[r.idea_id]) acc[r.idea_id] = [];
        acc[r.idea_id].push(r);
        return acc;
      }, {} as Record<string, typeof respData>);

      const boardroomIdeas: BoardroomIdea[] = ideaData
        .filter(i => (respByIdea[i.id] || []).length > 0)
        .map(i => ({
          id: i.id,
          content: i.content,
          consensus_score: i.consensus_score,
          starred: i.starred,
          created_at: i.created_at,
          responses: (respByIdea[i.id] || []) as { persona_key: string; vote_score: number | null; analysis: string | null }[],
        }));

      setIdeas(boardroomIdeas);
    } catch {
      // silent
    }
    setLoading(false);
  };

  const handleToggleStar = async (ideaId: string, starred: boolean) => {
    await supabase.from("council_ideas").update({ starred }).eq("id", ideaId);
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, starred } : i));
  };

  const handleDelete = async (ideaId: string) => {
    await supabase.from("council_ideas").delete().eq("id", ideaId);
    setIdeas(prev => prev.filter(i => i.id !== ideaId));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  };

  const getConsensusColor = (score: number | null) => {
    if (score === null) return "#ffffff40";
    if (score >= 70) return "#34d399";
    if (score >= 40) return "#fbbf24";
    return "#f87171";
  };

  // ── Filtering logic ──

  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      // Search
      if (filters.search && !idea.content.toLowerCase().includes(filters.search.toLowerCase())) return false;

      // Starred only
      if (filters.starredOnly && !idea.starred) return false;

      // Date range
      if (filters.dateRange !== "all") {
        const now = Date.now();
        const created = new Date(idea.created_at).getTime();
        const diffMs = now - created;
        const day = 86_400_000;
        if (filters.dateRange === "week"    && diffMs > 7  * day) return false;
        if (filters.dateRange === "month"   && diffMs > 30 * day) return false;
        if (filters.dateRange === "3months" && diffMs > 90 * day) return false;
      }

      // Advisor confidence filters
      for (const [key, bracket] of Object.entries(filters.advisorFilter)) {
        if (!bracket) continue;
        const r = idea.responses.find(r => r.persona_key === key);
        if (!r || r.vote_score === null) return false;
        if (r.vote_score < bracket.min || r.vote_score > bracket.max) return false;
      }

      return true;
    });
  }, [ideas, filters]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.starredOnly ||
    filters.dateRange !== "all" ||
    Object.values(filters.advisorFilter).some(v => v !== null);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <BookOpen size={20} className="text-white/25" />
        </div>
        <p className="text-[12px] text-white/30 text-center max-w-xs">
          No saved boardroom sessions yet. Consult the Board and click "Save to Council" to save your first analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header + search row */}
      <div className="flex items-center gap-2">
        <Sparkles size={12} className="text-purple-400/60 shrink-0" />
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold flex-1">
          Saved Sessions ({ideas.length})
        </p>
        <div className="flex items-center gap-1.5">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-orange-300/70 hover:text-orange-300 transition-colors"
              style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}
            >
              <X size={8} /> Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${showFilters ? "text-purple-400 bg-purple-400/10" : "text-white/30 hover:text-white/60"}`}
          >
            <SlidersHorizontal size={12} />
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Search sessions…"
          className="w-full pl-8 pr-3 py-2 bg-white/4 border border-white/8 rounded-xl text-[11px] text-white/70 placeholder:text-white/20 outline-none focus:border-white/15 transition-colors"
        />
      </div>

      {/* Filter panel */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/8 p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              {/* Starred + Date */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilters(f => ({ ...f, starredOnly: !f.starredOnly }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold transition-colors ${
                    filters.starredOnly
                      ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                      : "bg-white/5 text-white/40 border border-white/8 hover:text-white/60"
                  }`}
                >
                  <Star size={8} className={filters.starredOnly ? "fill-yellow-400" : ""} /> Starred only
                </button>
                <div className="flex items-center gap-1">
                  <Calendar size={9} className="text-white/25" />
                  {DATE_RANGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilters(f => ({ ...f, dateRange: opt.value as FilterState["dateRange"] }))}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors ${
                        filters.dateRange === opt.value
                          ? "bg-purple-400/20 text-purple-300 border border-purple-400/30"
                          : "text-white/30 hover:text-white/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advisor confidence filters */}
              <div className="space-y-1.5">
                <p className="text-[9px] text-white/25 uppercase tracking-widest">Advisor Confidence</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BOARDROOM_PERSONA_KEYS.map(key => {
                    const cfg = PERSONA_CONFIG[key];
                    const current = filters.advisorFilter[key];
                    return (
                      <div key={key} className="flex items-center gap-1.5 rounded-xl p-2" style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}12` }}>
                        <span className="text-[9px] font-semibold w-10 shrink-0" style={{ color: cfg.color }}>{cfg.name}</span>
                        <div className="flex gap-0.5">
                          {CONFIDENCE_BRACKETS.map(b => {
                            const isActive = current?.min === b.min && current?.max === b.max;
                            return (
                              <button
                                key={b.label}
                                onClick={() => setFilters(f => ({
                                  ...f,
                                  advisorFilter: {
                                    ...f.advisorFilter,
                                    [key]: isActive || b.label === "Any" ? null : { min: b.min, max: b.max },
                                  },
                                }))}
                                className={`px-1.5 py-0.5 rounded-md text-[8px] font-medium transition-colors ${
                                  (b.label === "Any" && !current) || isActive
                                    ? "text-white/70 border border-white/15"
                                    : "text-white/25 hover:text-white/40"
                                }`}
                                style={isActive ? { background: `${cfg.color}25`, borderColor: `${cfg.color}40`, color: cfg.color } : undefined}
                              >
                                {b.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count when filtering */}
      {hasActiveFilters && (
        <p className="text-[9px] text-white/30">
          Showing {filteredIdeas.length} of {ideas.length} sessions
        </p>
      )}

      {/* Ideas list */}
      {filteredIdeas.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <Search size={18} className="text-white/15" />
          <p className="text-[11px] text-white/25">No sessions match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIdeas.map(idea => {
            const isExpanded = expandedId === idea.id;
            const avgConf = idea.responses.length > 0
              ? Math.round(idea.responses.reduce((a, r) => a + (r.vote_score ?? 0), 0) / idea.responses.length)
              : null;
            const consColor = getConsensusColor(idea.consensus_score ?? avgConf);

            return (
              <motion.div
                key={idea.id}
                layout
                className="rounded-2xl border border-white/8 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/4 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : idea.id)}
                >
                  {/* Star */}
                  <button
                    onClick={e => { e.stopPropagation(); handleToggleStar(idea.id, !idea.starred); }}
                    className="shrink-0 text-white/20 hover:text-yellow-400 transition-colors"
                  >
                    <Star size={11} className={idea.starred ? "fill-yellow-400 text-yellow-400" : ""} />
                  </button>

                  {/* Idea text */}
                  <p className="flex-1 text-[11px] text-white/70 truncate leading-snug">{idea.content}</p>

                  {/* Advisor confidence badges */}
                  <div className="flex items-center gap-1 shrink-0">
                    {BOARDROOM_PERSONA_KEYS.map(key => {
                      const r = idea.responses.find(r => r.persona_key === key);
                      const cfg = PERSONA_CONFIG[key];
                      return r ? (
                        <div
                          key={key}
                          className="flex items-center justify-center w-[22px] h-[22px] rounded-full text-[8px] font-bold"
                          style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
                          title={`${cfg.name}: ${r.vote_score ?? "?"}%`}
                        >
                          {r.vote_score !== null ? r.vote_score : "?"}
                        </div>
                      ) : null;
                    })}
                  </div>

                  {/* Consensus score bar */}
                  {idea.consensus_score !== null && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: consColor, width: `${Math.min(100, Math.max(5, idea.consensus_score))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold" style={{ color: consColor }}>
                        {idea.consensus_score}%
                      </span>
                    </div>
                  )}

                  {/* Date + chevron */}
                  <span className="text-[9px] text-white/20 shrink-0">{formatDate(idea.created_at)}</span>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                    <ChevronRight size={11} className="text-white/20" />
                  </motion.div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-white/6 space-y-3">
                        {/* Advisor analyses */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {BOARDROOM_PERSONA_KEYS.map(key => {
                            const r = idea.responses.find(r => r.persona_key === key);
                            const cfg = PERSONA_CONFIG[key];
                            if (!r) return null;
                            return (
                              <div
                                key={key}
                                className="rounded-xl p-2.5 text-[10px] text-white/55 leading-relaxed"
                                style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}15` }}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="font-bold text-[11px]" style={{ color: cfg.color }}>
                                    {cfg.name}
                                  </span>
                                  {r.vote_score !== null && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                                      {r.vote_score}%
                                    </span>
                                  )}
                                </div>
                                <p className="line-clamp-3">{r.analysis || "No analysis saved."}</p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => onRestoreIdea(idea)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all text-purple-300 hover:text-purple-200"
                            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
                          >
                            <RotateCcw size={9} /> Restore to Boardroom
                          </button>
                          <button
                            onClick={() => handleDelete(idea.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BoardroomIdeasHistory;
