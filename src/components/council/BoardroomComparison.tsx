import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCompare, X, Check, RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PERSONA_CONFIG: Record<string, { name: string; initials: string; color: string }> = {
  elena:  { name: "Elena",  initials: "EV", color: "#34d399" },
  helen:  { name: "Helen",  initials: "HK", color: "#fbbf24" },
  anton:  { name: "Anton",  initials: "AO", color: "#f87171" },
  margot: { name: "Margot", initials: "ML", color: "#22d3ee" },
};
const PERSONA_KEYS = ["elena", "helen", "anton", "margot"];

interface SessionSummary {
  id: string;
  content: string;
  consensus_score: number | null;
  created_at: string;
  starred: boolean | null;
  responses: { persona_key: string; vote_score: number | null; analysis: string | null }[];
}

interface Props {
  userId: string;
  onRestoreIdea: (idea: SessionSummary) => void;
}

const getConsensusColor = (score: number | null) => {
  if (score === null) return "#ffffff40";
  if (score >= 70) return "#34d399";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
};

const SessionPickerCard: React.FC<{
  session: SessionSummary;
  isSelected: boolean;
  onToggle: () => void;
  selectionIndex: number | null;
}> = ({ session, isSelected, onToggle, selectionIndex }) => {
  const consColor = getConsensusColor(session.consensus_score);
  return (
    <motion.button
      layout
      onClick={onToggle}
      whileHover={{ scale: 1.01 }}
      className="w-full text-left rounded-2xl border transition-all p-3 relative"
      style={{
        background: isSelected ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)",
        borderColor: isSelected ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)",
      }}
    >
      {isSelected && selectionIndex !== null && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{ background: "rgba(139,92,246,0.4)", border: "1px solid rgba(139,92,246,0.5)" }}
        >
          <span className="text-purple-200">{selectionIndex + 1}</span>
        </div>
      )}
      <p className="text-[11px] text-white/70 leading-snug line-clamp-2 pr-6">{session.content}</p>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-0.5">
          {PERSONA_KEYS.map(key => {
            const r = session.responses.find(r => r.persona_key === key);
            const cfg = PERSONA_CONFIG[key];
            return r ? (
              <div
                key={key}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
              >
                {r.vote_score ?? "?"}
              </div>
            ) : null;
          })}
        </div>
        {session.consensus_score !== null && (
          <span className="text-[9px] font-bold ml-auto" style={{ color: consColor }}>
            {session.consensus_score}%
          </span>
        )}
        <span className="text-[8px] text-white/20">
          {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </motion.button>
  );
};

const ComparisonColumn: React.FC<{
  session: SessionSummary;
  label: string;
  accent: string;
  onRestore: () => void;
}> = ({ session, label, accent, onRestore }) => {
  const consColor = getConsensusColor(session.consensus_score);
  const score = session.consensus_score ?? 0;
  return (
    <div className="flex-1 min-w-0 rounded-2xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: `${accent}25` }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ background: `${accent}06`, borderColor: `${accent}15` }}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}
          >
            {label}
          </span>
          <span className="text-[8px] text-white/20 ml-auto">
            {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
          </span>
        </div>
        <p className="text-[11px] text-white/75 leading-snug line-clamp-3">{session.content}</p>
      </div>

      {/* Consensus bar */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-white/30 uppercase tracking-widest">Consensus</span>
          <span className="text-[11px] font-bold" style={{ color: consColor }}>{score}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(2, score))}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${consColor}70, ${consColor})` }}
          />
        </div>
      </div>

      {/* Advisor badges */}
      <div className="px-4 py-3 border-b border-white/5 space-y-2">
        <p className="text-[9px] text-white/25 uppercase tracking-widest">Advisor Confidence</p>
        {PERSONA_KEYS.map(key => {
          const r = session.responses.find(r => r.persona_key === key);
          const cfg = PERSONA_CONFIG[key];
          if (!r) return null;
          const pct = r.vote_score ?? 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
              >
                {cfg.initials}
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: cfg.color }}
                />
              </div>
              <span className="text-[9px] font-semibold w-6 text-right" style={{ color: cfg.color }}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Analyses (collapsed) */}
      <div className="px-4 py-3 space-y-2">
        {PERSONA_KEYS.map(key => {
          const r = session.responses.find(r => r.persona_key === key);
          const cfg = PERSONA_CONFIG[key];
          if (!r?.analysis) return null;
          return (
            <div key={key} className="rounded-xl p-2" style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}12` }}>
              <span className="text-[9px] font-bold mr-1" style={{ color: cfg.color }}>{cfg.name}</span>
              <span className="text-[9px] text-white/40 line-clamp-2">{r.analysis}</span>
            </div>
          );
        })}
      </div>

      {/* Restore CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={onRestore}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-semibold transition-all"
          style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}25` }}
        >
          <RotateCcw size={9} /> Restore to Boardroom
        </button>
      </div>
    </div>
  );
};

const ACCENT_COLORS = ["#a78bfa", "#22d3ee"];

const BoardroomComparison: React.FC<Props> = ({ userId, onRestoreIdea }) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => { loadSessions(); /* eslint-disable-next-line */ }, [userId]);

  const loadSessions = async () => {
    setLoading(true);
    const { data: ideas } = await supabase
      .from("council_ideas")
      .select("id, content, consensus_score, created_at, starred")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!ideas || ideas.length === 0) { setLoading(false); return; }

    const ids = ideas.map(i => i.id);
    const { data: respData } = await supabase
      .from("council_responses")
      .select("idea_id, persona_key, vote_score, analysis")
      .in("idea_id", ids)
      .in("persona_key", PERSONA_KEYS);

    const byIdea: Record<string, SessionSummary["responses"]> = {};
    (respData || []).forEach(r => {
      if (!byIdea[r.idea_id]) byIdea[r.idea_id] = [];
      byIdea[r.idea_id].push(r);
    });

    setSessions(
      ideas
        .filter(i => (byIdea[i.id] || []).length > 0)
        .map(i => ({ ...i, responses: byIdea[i.id] || [] }))
    );
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(prev => prev.filter(s => s !== id));
    } else if (selected.length < 2) {
      setSelected(prev => [...prev, id]);
    }
  };

  const canCompare = selected.length === 2;
  const sessionA = sessions.find(s => s.id === selected[0]);
  const sessionB = sessions.find(s => s.id === selected[1]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
    </div>
  );

  if (sessions.length < 2) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <GitCompare size={20} className="text-white/15" />
      <p className="text-[11px] text-white/25 text-center max-w-xs">Save at least 2 boardroom sessions to compare them side by side.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitCompare size={12} className="text-purple-400/60 shrink-0" />
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold flex-1">
          Compare Sessions
        </p>
        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            className="text-[9px] text-white/30 hover:text-white/50 transition-colors flex items-center gap-0.5"
          >
            <X size={9} /> Clear
          </button>
        )}
      </div>

      <p className="text-[10px] text-white/35">
        {selected.length === 0 && "Select 2 sessions to compare them side by side."}
        {selected.length === 1 && "Select one more session to compare."}
        {selected.length === 2 && "Ready to compare! Click the button below."}
      </p>

      {/* Session picker */}
      <AnimatePresence initial={false}>
        {!showCompare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2 max-h-64 overflow-y-auto council-hidden-scrollbar"
          >
            {sessions.map(s => (
              <SessionPickerCard
                key={s.id}
                session={s}
                isSelected={selected.includes(s.id)}
                selectionIndex={selected.indexOf(s.id) !== -1 ? selected.indexOf(s.id) : null}
                onToggle={() => toggleSelect(s.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare CTA */}
      {canCompare && !showCompare && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowCompare(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-semibold transition-all"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.15))", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}
        >
          <Sparkles size={11} /> Compare Side by Side <ArrowRight size={11} />
        </motion.button>
      )}

      {/* Side-by-side comparison */}
      <AnimatePresence>
        {showCompare && sessionA && sessionB && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-3"
          >
            <button
              onClick={() => { setShowCompare(false); setSelected([]); }}
              className="text-[9px] text-white/30 hover:text-white/55 transition-colors flex items-center gap-1"
            >
              <X size={9} /> Close comparison
            </button>
            <div className="flex gap-3">
              <ComparisonColumn
                session={sessionA}
                label="Session A"
                accent={ACCENT_COLORS[0]}
                onRestore={() => { onRestoreIdea(sessionA); setShowCompare(false); setSelected([]); }}
              />
              <div className="flex items-center shrink-0 self-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white/20 border border-white/10 text-[9px] font-bold"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  vs
                </div>
              </div>
              <ComparisonColumn
                session={sessionB}
                label="Session B"
                accent={ACCENT_COLORS[1]}
                onRestore={() => { onRestoreIdea(sessionB); setShowCompare(false); setSelected([]); }}
              />
            </div>
            {/* Delta summary */}
            <div className="rounded-2xl border border-white/8 p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Delta Summary</p>
              <div className="grid grid-cols-4 gap-2">
                {PERSONA_KEYS.map(key => {
                  const cfg = PERSONA_CONFIG[key];
                  const rA = sessionA.responses.find(r => r.persona_key === key);
                  const rB = sessionB.responses.find(r => r.persona_key === key);
                  const scoreA = rA?.vote_score ?? null;
                  const scoreB = rB?.vote_score ?? null;
                  const delta = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;
                  return (
                    <div key={key} className="flex flex-col items-center gap-1 rounded-xl p-2" style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}12` }}>
                      <span className="text-[8px] font-bold" style={{ color: cfg.color }}>{cfg.name}</span>
                      <span className="text-[9px] text-white/40">{scoreA ?? "—"} → {scoreB ?? "—"}</span>
                      {delta !== null && (
                        <span className="text-[9px] font-bold" style={{ color: delta > 0 ? "#34d399" : delta < 0 ? "#f87171" : "#ffffff50" }}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {sessionA.consensus_score !== null && sessionB.consensus_score !== null && (
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-[9px] text-white/25">Overall consensus delta</span>
                  <span className="text-[10px] font-bold" style={{
                    color: sessionB.consensus_score - sessionA.consensus_score > 0 ? "#34d399"
                      : sessionB.consensus_score - sessionA.consensus_score < 0 ? "#f87171" : "#ffffff50"
                  }}>
                    {sessionB.consensus_score - sessionA.consensus_score > 0 ? "+" : ""}
                    {sessionB.consensus_score - sessionA.consensus_score}%
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BoardroomComparison;
