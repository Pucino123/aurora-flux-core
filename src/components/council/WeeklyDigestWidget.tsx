import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown, Sparkles, RotateCcw, BarChart2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PERSONA_CONFIG: Record<string, { name: string; color: string }> = {
  elena:  { name: "Elena",  color: "#34d399" },
  helen:  { name: "Helen",  color: "#fbbf24" },
  anton:  { name: "Anton",  color: "#f87171" },
  margot: { name: "Margot", color: "#22d3ee" },
};

interface WeekSession {
  id: string;
  content: string;
  consensus_score: number | null;
  created_at: string;
  responses: { persona_key: string; vote_score: number | null }[];
}

interface Props {
  userId: string;
  onRestoreIdea?: (idea: WeekSession) => void;
}

const WeeklyDigestWidget: React.FC<Props> = ({ userId, onRestoreIdea }) => {
  const [sessions, setSessions] = useState<WeekSession[]>([]);
  const [prevSessions, setPrevSessions] = useState<WeekSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { loadDigest(); /* eslint-disable-next-line */ }, [userId]);

  const loadDigest = async () => {
    setLoading(true);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();

    const [{ data: thisWeek }, { data: lastWeek }] = await Promise.all([
      supabase
        .from("council_ideas")
        .select("id, content, consensus_score, created_at")
        .eq("user_id", userId)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false }),
      supabase
        .from("council_ideas")
        .select("id, content, consensus_score, created_at")
        .eq("user_id", userId)
        .gte("created_at", twoWeeksAgo)
        .lt("created_at", weekAgo)
        .order("created_at", { ascending: false }),
    ]);

    const attachResponses = async (ideas: typeof thisWeek): Promise<WeekSession[]> => {
      if (!ideas || ideas.length === 0) return [];
      const ids = ideas.map(i => i.id);
      const { data: respData } = await supabase
        .from("council_responses")
        .select("idea_id, persona_key, vote_score")
        .in("idea_id", ids)
        .in("persona_key", ["elena", "helen", "anton", "margot"]);
      const byIdea: Record<string, { persona_key: string; vote_score: number | null }[]> = {};
      (respData || []).forEach(r => {
        if (!byIdea[r.idea_id]) byIdea[r.idea_id] = [];
        byIdea[r.idea_id].push(r);
      });
      return ideas
        .filter(i => (byIdea[i.id] || []).length > 0)
        .map(i => ({ ...i, consensus_score: i.consensus_score, responses: byIdea[i.id] || [] }));
    };

    const [thisWeekFull, lastWeekFull] = await Promise.all([
      attachResponses(thisWeek),
      attachResponses(lastWeek),
    ]);

    setSessions(thisWeekFull);
    setPrevSessions(lastWeekFull);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
    </div>
  );

  const totalSessions = sessions.length;
  const prevTotal = prevSessions.length;
  const sessionDelta = totalSessions - prevTotal;

  const avgConsensus = totalSessions > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.consensus_score ?? 0), 0) / totalSessions)
    : 0;
  const prevAvg = prevTotal > 0
    ? Math.round(prevSessions.reduce((a, s) => a + (s.consensus_score ?? 0), 0) / prevTotal)
    : 0;
  const consensusDelta = avgConsensus - prevAvg;

  const topIdea = sessions.length > 0
    ? sessions.reduce((best, s) => (s.consensus_score ?? 0) > (best.consensus_score ?? 0) ? s : best, sessions[0])
    : null;

  // Per-advisor avg this week
  const advisorAvgs = Object.entries(PERSONA_CONFIG).map(([key, cfg]) => {
    const scores = sessions.flatMap(s => s.responses.filter(r => r.persona_key === key && r.vote_score !== null).map(r => r.vote_score as number));
    const prevScores = prevSessions.flatMap(s => s.responses.filter(r => r.persona_key === key && r.vote_score !== null).map(r => r.vote_score as number));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const prevAvgAdv = prevScores.length ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length) : null;
    const delta = avg !== null && prevAvgAdv !== null ? avg - prevAvgAdv : null;
    return { key, name: cfg.name, color: cfg.color, avg, delta };
  });

  // Day-by-day session counts for spark line
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  });
  const dayCounts = dayLabels.map((_, i) => {
    const dayStart = new Date(Date.now() - (6 - i) * 86_400_000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    return sessions.filter(s => {
      const t = new Date(s.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
  });
  const maxDay = Math.max(...dayCounts, 1);

  if (totalSessions === 0 && prevTotal === 0) {
    return (
      <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={12} className="text-purple-400/60" />
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">This Week's Digest</p>
        </div>
        <p className="text-[11px] text-white/25 text-center py-4">No boardroom sessions this week. Consult the board to start building your weekly insights.</p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/8 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      {/* Header — always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/3 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <Calendar size={14} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/70">This Week's Council Digest</p>
          <p className="text-[9px] text-white/30">
            {totalSessions} session{totalSessions !== 1 ? "s" : ""} · {avgConsensus}% avg consensus
            {sessionDelta !== 0 && (
              <span className={sessionDelta > 0 ? "text-emerald-400" : "text-red-400"}>
                {" "}({sessionDelta > 0 ? "+" : ""}{sessionDelta} vs last week)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Spark line */}
          <div className="flex items-end gap-0.5 h-6">
            {dayCounts.map((count, i) => (
              <div
                key={i}
                className="w-1.5 rounded-sm transition-all"
                style={{
                  height: `${Math.max(10, (count / maxDay) * 100)}%`,
                  background: count > 0 ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.06)",
                }}
              />
            ))}
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <BarChart2 size={12} className="text-white/20" />
          </motion.div>
        </div>
      </button>

      {/* Expanded content */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-4 border-t border-white/6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-3">
            {[
              {
                label: "Sessions",
                value: totalSessions,
                delta: sessionDelta,
                icon: Calendar,
                color: "#a78bfa",
              },
              {
                label: "Avg Consensus",
                value: `${avgConsensus}%`,
                delta: consensusDelta,
                icon: TrendingUp,
                color: "#34d399",
              },
              {
                label: "Best Score",
                value: topIdea ? `${topIdea.consensus_score ?? "—"}%` : "—",
                delta: null,
                icon: Sparkles,
                color: "#fbbf24",
              },
            ].map(stat => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-2.5 border border-white/6 flex flex-col gap-1"
                style={{ background: `${stat.color}06` }}
              >
                <stat.icon size={10} style={{ color: stat.color }} />
                <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <div className="flex items-center gap-1">
                  <p className="text-[8px] text-white/30 uppercase tracking-wider">{stat.label}</p>
                  {stat.delta !== null && stat.delta !== 0 && (
                    <span className={`text-[8px] font-bold ${stat.delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {stat.delta > 0 ? "↑" : "↓"}{Math.abs(stat.delta)}{typeof stat.value === "string" && stat.value.includes("%") ? "%" : ""}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Advisor trend bars */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Advisor Confidence This Week</p>
            <div className="space-y-2">
              {advisorAvgs.map(a => (
                <div key={a.key} className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold w-9 shrink-0" style={{ color: a.color }}>{a.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: a.avg !== null ? `${a.avg}%` : "0%" }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: a.color }}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-16 shrink-0 justify-end">
                    <span className="text-[9px] font-bold" style={{ color: a.avg !== null ? a.color : "rgba(255,255,255,0.2)" }}>
                      {a.avg !== null ? `${a.avg}%` : "—"}
                    </span>
                    {a.delta !== null && a.delta !== 0 && (
                      <span className={`text-[8px] ${a.delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {a.delta > 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily spark bars with labels */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Sessions by Day</p>
            <div className="flex items-end gap-1 h-12">
              {dayCounts.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(10, (count / maxDay) * 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="w-full rounded-t-sm"
                    style={{ background: count > 0 ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.05)" }}
                  />
                  <span className="text-[7px] text-white/20">{dayLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top idea of the week */}
          {topIdea && (
            <div className="rounded-xl p-3" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={9} style={{ color: "#34d399" }} />
                <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#34d399" }}>Top Idea This Week</p>
                <span className="ml-auto text-[9px] font-bold" style={{ color: "#34d399" }}>{topIdea.consensus_score}%</span>
              </div>
              <p className="text-[10px] text-white/60 leading-snug line-clamp-2">{topIdea.content}</p>
              {onRestoreIdea && (
                <button
                  onClick={() => onRestoreIdea(topIdea)}
                  className="mt-2 flex items-center gap-1 text-[9px] font-semibold transition-colors"
                  style={{ color: "rgba(52,211,153,0.7)" }}
                >
                  <RotateCcw size={8} /> Restore to Boardroom
                </button>
              )}
            </div>
          )}

          {/* Session list (compact) */}
          {sessions.length > 1 && (
            <div className="space-y-1">
              <p className="text-[9px] text-white/25 uppercase tracking-widest">All Sessions This Week</p>
              {sessions.map(s => {
                const consColor = s.consensus_score !== null
                  ? s.consensus_score >= 70 ? "#34d399" : s.consensus_score >= 40 ? "#fbbf24" : "#f87171"
                  : "#ffffff30";
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/4 transition-colors group cursor-pointer"
                    onClick={() => onRestoreIdea?.(s)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: consColor }} />
                    <p className="flex-1 text-[10px] text-white/50 truncate">{s.content}</p>
                    {s.consensus_score !== null && (
                      <span className="text-[9px] font-bold shrink-0" style={{ color: consColor }}>{s.consensus_score}%</span>
                    )}
                    <RotateCcw size={8} className="text-white/0 group-hover:text-white/30 transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WeeklyDigestWidget;
