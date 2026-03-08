import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Star, Trash2, TrendingUp, Lightbulb, AlertTriangle, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BOARDROOM_PERSONA_KEYS = ["elena", "helen", "anton", "margot"];
const PERSONA_CONFIG: Record<string, { name: string; initials: string; color: string }> = {
  elena:  { name: "Elena",  initials: "EV", color: "#34d399" },
  helen:  { name: "Helen",  initials: "HK", color: "#fbbf24" },
  anton:  { name: "Anton",  initials: "AO", color: "#f87171" },
  margot: { name: "Margot", initials: "ML", color: "#22d3ee" },
};

interface BoardroomIdea {
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

const BoardroomIdeasHistory: React.FC<Props> = ({ userId, onRestoreIdea }) => {
  const [ideas, setIdeas] = useState<BoardroomIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadBoardroomIdeas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadBoardroomIdeas = async () => {
    setLoading(true);
    try {
      // Load council_ideas that have boardroom-style responses (persona_key in boardroom set)
      const { data: ideaData } = await supabase
        .from("council_ideas")
        .select("id, content, consensus_score, starred, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!ideaData) { setLoading(false); return; }

      // For each idea, load responses to find boardroom ones
      const ideaIds = ideaData.map(i => i.id);
      const { data: respData } = await supabase
        .from("council_responses")
        .select("idea_id, persona_key, vote_score, analysis")
        .in("idea_id", ideaIds)
        .in("persona_key", BOARDROOM_PERSONA_KEYS);

      // Group responses by idea_id
      const respByIdea = (respData || []).reduce((acc, r) => {
        if (!acc[r.idea_id]) acc[r.idea_id] = [];
        acc[r.idea_id].push(r);
        return acc;
      }, {} as Record<string, typeof respData>);

      // Only keep ideas that have at least one boardroom persona response
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
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={12} className="text-purple-400/60" />
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
          Saved Sessions ({ideas.length})
        </p>
      </div>
      {ideas.map(idea => {
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
                        <TrendingUp size={9} /> Restore Analysis
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
  );
};

export default BoardroomIdeasHistory;
