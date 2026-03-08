import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronRight, Star, Trash2, BookOpen,
  Search, SlidersHorizontal, X, RotateCcw, Calendar, Tag, Play,
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
  tags: string[];
  responses: { persona_key: string; vote_score: number | null; analysis: string | null }[];
}

interface Props {
  userId: string;
  onRestoreIdea: (idea: BoardroomIdea, replay?: boolean) => void;
}

// ── Filter bar ──

interface FilterState {
  search: string;
  starredOnly: boolean;
  dateRange: "all" | "week" | "month" | "3months";
  advisorFilter: Record<string, { min: number; max: number } | null>;
  tagFilter: string | null;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  starredOnly: false,
  dateRange: "all",
  advisorFilter: { elena: null, helen: null, anton: null, margot: null },
  tagFilter: null,
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

// Tag chip colors cycling
const TAG_PALETTE = ["#a78bfa", "#34d399", "#fbbf24", "#f87171", "#22d3ee", "#fb7185", "#a3e635"];
const tagColor = (tag: string) => TAG_PALETTE[Math.abs(tag.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_PALETTE.length];

const BoardroomIdeasHistory: React.FC<Props> = ({ userId, onRestoreIdea }) => {
  const [ideas, setIdeas] = useState<BoardroomIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // tag editing state per idea
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBoardroomIdeas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadBoardroomIdeas = async () => {
    setLoading(true);
    try {
      const { data: ideaData } = await supabase
        .from("council_ideas")
        .select("id, content, consensus_score, starred, created_at, tags")
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
          tags: Array.isArray(i.tags) ? (i.tags as string[]) : [],
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

  // ── Tag management ──
  const handleAddTag = async (ideaId: string, tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!trimmed) return;
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea || idea.tags.includes(trimmed)) return;
    const newTags = [...idea.tags, trimmed];
    await supabase.from("council_ideas").update({ tags: newTags }).eq("id", ideaId);
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, tags: newTags } : i));
  };

  const handleRemoveTag = async (ideaId: string, tag: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    const newTags = idea.tags.filter(t => t !== tag);
    await supabase.from("council_ideas").update({ tags: newTags }).eq("id", ideaId);
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, tags: newTags } : i));
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

  // All unique tags across all sessions, with usage counts
  const allTagsWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    ideas.forEach(i => i.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [ideas]);

  const allTags = allTagsWithCount;

  // ── Filtering logic ──
  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      if (filters.search && !idea.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.starredOnly && !idea.starred) return false;
      if (filters.dateRange !== "all") {
        const now = Date.now();
        const created = new Date(idea.created_at).getTime();
        const diffMs = now - created;
        const day = 86_400_000;
        if (filters.dateRange === "week"    && diffMs > 7  * day) return false;
        if (filters.dateRange === "month"   && diffMs > 30 * day) return false;
        if (filters.dateRange === "3months" && diffMs > 90 * day) return false;
      }
      for (const [key, bracket] of Object.entries(filters.advisorFilter)) {
        if (!bracket) continue;
        const r = idea.responses.find(r => r.persona_key === key);
        if (!r || r.vote_score === null) return false;
        if (r.vote_score < bracket.min || r.vote_score > bracket.max) return false;
      }
      if (filters.tagFilter && !idea.tags.includes(filters.tagFilter)) return false;
      return true;
    });
  }, [ideas, filters]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.starredOnly ||
    filters.dateRange !== "all" ||
    Object.values(filters.advisorFilter).some(v => v !== null) ||
    filters.tagFilter !== null;

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

      {/* Tag filter chips (if any tags exist) */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(tag => {
            const color = tagColor(tag);
            const active = filters.tagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => setFilters(f => ({ ...f, tagFilter: active ? null : tag }))}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all"
                style={{
                  background: active ? `${color}25` : `${color}0a`,
                  border: `1px solid ${active ? `${color}50` : `${color}20`}`,
                  color: active ? color : `${color}80`,
                }}
              >
                <Tag size={7} />
                {tag}
              </button>
            );
          })}
        </div>
      )}

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
            const isEditingTags = editingTagsFor === idea.id;

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

                  {/* Idea text + tags inline */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/70 truncate leading-snug">{idea.content}</p>
                    {idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {idea.tags.map(tag => {
                          const color = tagColor(tag);
                          return (
                            <span
                              key={tag}
                              className="text-[8px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: `${color}18`, color, border: `1px solid ${color}25` }}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

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

                        {/* Tags editor */}
                        <div className="rounded-xl p-2.5 border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Tag size={9} className="text-white/30" />
                            <span className="text-[9px] text-white/30 uppercase tracking-widest">Tags</span>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingTagsFor(isEditingTags ? null : idea.id); setTagInput(""); }}
                              className="ml-auto text-[8px] text-white/25 hover:text-white/50 transition-colors"
                            >
                              {isEditingTags ? "Done" : "+ Add"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {idea.tags.map(tag => {
                              const color = tagColor(tag);
                              return (
                                <span
                                  key={tag}
                                  className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
                                >
                                  {tag}
                                  {isEditingTags && (
                                    <button
                                      onClick={e => { e.stopPropagation(); handleRemoveTag(idea.id, tag); }}
                                      className="opacity-50 hover:opacity-100 transition-opacity"
                                    >
                                      <X size={7} />
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                            {idea.tags.length === 0 && !isEditingTags && (
                              <span className="text-[9px] text-white/20">No tags yet</span>
                            )}
                          </div>
                          {isEditingTags && (
                            <div className="relative mt-2" onClick={e => e.stopPropagation()}>
                              <div className="flex gap-1.5">
                                <input
                                  ref={tagInputRef}
                                  value={tagInput}
                                  onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                                  onFocus={() => setShowTagSuggestions(true)}
                                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 120)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter" || e.key === ",") {
                                      e.preventDefault();
                                      handleAddTag(idea.id, tagInput);
                                      setTagInput("");
                                      setShowTagSuggestions(false);
                                    }
                                    if (e.key === "Escape") setShowTagSuggestions(false);
                                  }}
                                  placeholder="startup, product, pivot…"
                                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-[10px] text-white/70 placeholder:text-white/20 outline-none focus:border-white/15 transition-colors"
                                />
                                <button
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { handleAddTag(idea.id, tagInput); setTagInput(""); setShowTagSuggestions(false); }}
                                  className="px-2 py-1 rounded-lg text-[9px] font-semibold text-purple-300 transition-colors"
                                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
                                >
                                  Add
                                </button>
                              </div>
                              {/* Suggestions dropdown */}
                              <AnimatePresence>
                                {showTagSuggestions && (() => {
                                  const suggestions = allTagsWithCount.filter(
                                    t => !idea.tags.includes(t) &&
                                    (tagInput === "" || t.includes(tagInput.toLowerCase()))
                                  ).slice(0, 6);
                                  if (suggestions.length === 0) return null;
                                  return (
                                    <motion.div
                                      initial={{ opacity: 0, y: -4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute top-full left-0 right-8 mt-1 rounded-xl overflow-hidden z-50"
                                      style={{ background: "rgba(14,10,30,0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                                    >
                                      <p className="px-2.5 pt-2 pb-1 text-[8px] text-white/25 uppercase tracking-widest">Suggested tags</p>
                                      {suggestions.map(tag => {
                                        const c = tagColor(tag);
                                        return (
                                          <button
                                            key={tag}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => { handleAddTag(idea.id, tag); setTagInput(""); setShowTagSuggestions(false); }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] hover:bg-white/5 transition-colors text-left"
                                          >
                                            <span
                                              className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold"
                                              style={{ background: `${c}18`, color: c, border: `1px solid ${c}28` }}
                                            >
                                              {tag}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </motion.div>
                                  );
                                })()}
                              </AnimatePresence>
                            </div>
                          )}
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
