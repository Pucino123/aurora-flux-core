import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, BarChart2, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PERSONA_CONFIG: Record<string, { name: string; color: string }> = {
  elena:  { name: "Elena",  color: "#34d399" },
  helen:  { name: "Helen",  color: "#fbbf24" },
  anton:  { name: "Anton",  color: "#f87171" },
  margot: { name: "Margot", color: "#22d3ee" },
};

interface Props { userId: string }

interface SessionRow {
  created_at: string;
  consensus_score: number | null;
  content: string;
  responses: { persona_key: string; vote_score: number | null }[];
}

const BoardroomAnalytics: React.FC<Props> = ({ userId }) => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const { data: ideas } = await supabase
      .from("council_ideas")
      .select("id, content, consensus_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!ideas || ideas.length === 0) { setLoading(false); return; }

    const ids = ideas.map(i => i.id);
    const { data: respData } = await supabase
      .from("council_responses")
      .select("idea_id, persona_key, vote_score")
      .in("idea_id", ids)
      .in("persona_key", ["elena","helen","anton","margot"]);

    const byIdea: Record<string, { persona_key: string; vote_score: number | null }[]> = {};
    (respData || []).forEach(r => {
      if (!byIdea[r.idea_id]) byIdea[r.idea_id] = [];
      byIdea[r.idea_id].push(r);
    });

    const rows: SessionRow[] = ideas
      .filter(i => (byIdea[i.id] || []).length > 0)
      .map(i => ({
        created_at: i.created_at,
        consensus_score: i.consensus_score,
        content: i.content,
        responses: byIdea[i.id] || [],
      }));

    setSessions(rows);
    setLoading(false);
  };

  // ── Avg confidence per advisor
  const avgByAdvisor = Object.entries(PERSONA_CONFIG).map(([key, cfg]) => {
    const scores = sessions.flatMap(s => s.responses.filter(r => r.persona_key === key && r.vote_score !== null).map(r => r.vote_score as number));
    return { name: cfg.name, avg: scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0, color: cfg.color, total: scores.length };
  });

  // ── Timeline: last 10 sessions consensus
  const timelineData = sessions.slice(-12).map((s, i) => ({
    label: `#${i + 1}`,
    consensus: s.consensus_score ?? 0,
    elena: s.responses.find(r => r.persona_key === "elena")?.vote_score ?? 0,
    helen: s.responses.find(r => r.persona_key === "helen")?.vote_score ?? 0,
    anton: s.responses.find(r => r.persona_key === "anton")?.vote_score ?? 0,
    margot: s.responses.find(r => r.persona_key === "margot")?.vote_score ?? 0,
  }));

  // ── Most common themes from idea content
  const THEMES = ["market", "brand", "revenue", "risk", "product", "customer", "growth", "launch", "team", "finance", "strategy", "tech"];
  const themeCounts = THEMES.map(t => ({
    theme: t.charAt(0).toUpperCase() + t.slice(1),
    count: sessions.filter(s => s.content.toLowerCase().includes(t)).length,
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
    </div>
  );

  if (sessions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <BarChart2 size={24} className="text-white/20" />
      <p className="text-[11px] text-white/30 text-center">No analytics yet — start consulting the board to see insights here.</p>
    </div>
  );

  const overallAvg = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.consensus_score ?? 0), 0) / sessions.length)
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 px-3 py-2 text-[10px]" style={{ background: "rgba(10,8,20,0.95)" }}>
        <p className="text-white/40 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name ?? p.dataKey}: <strong>{p.value}%</strong></p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sessions", value: sessions.length, icon: Clock, color: "#a78bfa" },
          { label: "Avg Consensus", value: `${overallAvg}%`, icon: TrendingUp, color: "#34d399" },
          { label: "Top Theme", value: themeCounts[0]?.theme || "—", icon: Sparkles, color: "#fbbf24" },
        ].map(s => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-3 border border-white/8 flex flex-col gap-1"
            style={{ background: `${s.color}08` }}
          >
            <s.icon size={12} style={{ color: s.color }} />
            <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-white/35 uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Avg confidence per advisor */}
      <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">Avg Confidence per Advisor</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={avgByAdvisor} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg" radius={[4,4,0,0]}>
              {avgByAdvisor.map((e) => (
                <rect key={e.name} fill={e.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-around mt-1">
          {avgByAdvisor.map(a => (
            <div key={a.name} className="flex flex-col items-center gap-0.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
              <span className="text-[8px] text-white/30">{a.avg}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {timelineData.length >= 2 && (
        <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">Confidence Over Time</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={timelineData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(PERSONA_CONFIG).map(([key, cfg]) => (
                <Line key={key} type="monotone" dataKey={key} name={cfg.name} stroke={cfg.color} strokeWidth={1.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Common themes */}
      {themeCounts.length > 0 && (
        <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">Most Common Themes</p>
          <div className="space-y-2">
            {themeCounts.map((t, i) => (
              <div key={t.theme} className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-14 text-right shrink-0">{t.theme}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.count / Math.max(...themeCounts.map(x=>x.count))) * 100}%` }}
                    transition={{ delay: 0.1 * i, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: `hsl(${270 - i * 25} 70% 65%)` }}
                  />
                </div>
                <span className="text-[9px] text-white/25 w-4 shrink-0">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardroomAnalytics;
