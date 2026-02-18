import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, ShieldAlert, Lightbulb, Wrench, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";

const db = supabase as any;

interface DecisionScoreCardProps {
  ideaId: string;
  userId: string;
  responses: { vote: string; voteScore: number }[];
}

interface Scores {
  consensus_pct: number;
  risk_score: number;
  innovation_score: number;
  execution_difficulty: number;
  long_term_potential: number;
}

const METRICS: { key: keyof Scores; icon: typeof Trophy; label: string; color: string; inverted?: boolean }[] = [
  { key: "consensus_pct", icon: Trophy, label: "council.score_consensus", color: "hsl(150 60% 45%)" },
  { key: "risk_score", icon: ShieldAlert, label: "council.score_risk", color: "hsl(0 84% 60%)", inverted: true },
  { key: "innovation_score", icon: Lightbulb, label: "council.score_innovation", color: "hsl(270 70% 65%)" },
  { key: "execution_difficulty", icon: Wrench, label: "council.score_execution", color: "hsl(45 90% 55%)", inverted: true },
  { key: "long_term_potential", icon: Rocket, label: "council.score_longterm", color: "hsl(217 90% 60%)" },
];

const DecisionScoreCard = ({ ideaId, userId, responses }: DecisionScoreCardProps) => {
  const [scores, setScores] = useState<Scores | null>(null);

  useEffect(() => {
    if (!ideaId || responses.length === 0) return;
    computeAndLoad();
  }, [ideaId, responses]);

  const computeAndLoad = async () => {
    // Check if scores already exist
    const { data: existing } = await db
      .from("council_decision_scores")
      .select("*")
      .eq("idea_id", ideaId)
      .maybeSingle();

    if (existing) {
      setScores(existing as any);
      return;
    }

    // Compute from responses
    const totalVotes = responses.length;
    const goCount = responses.filter((r) => r.vote === "GO").length;
    const expCount = responses.filter((r) => r.vote === "EXPERIMENT").length;
    const totalScore = responses.reduce((s, r) => s + r.voteScore, 0);

    // Consensus: % of positive votes (GO + EXPERIMENT)
    const consensusPct = Math.round(((goCount + expCount) / totalVotes) * 100);

    // Risk: inverse of consensus, weighted by KILL votes
    const killCount = responses.filter((r) => r.vote === "KILL").length;
    const riskScore = Math.min(100, Math.round((killCount / totalVotes) * 100 + (totalScore < 0 ? 30 : 0)));

    // Innovation: based on spread of opinions (high spread = polarizing = potentially innovative)
    const scores_arr = responses.map((r) => r.voteScore);
    const spread = Math.max(...scores_arr) - Math.min(...scores_arr);
    const innovationScore = Math.min(100, Math.round(50 + spread * 10 + (goCount > 0 ? 15 : 0)));

    // Execution difficulty: inverse of operator's enthusiasm
    const operatorResp = responses.find((_, i) => i === 1); // operator is index 1
    const execDiff = operatorResp
      ? operatorResp.vote === "GO" ? 25 : operatorResp.vote === "EXPERIMENT" ? 50 : operatorResp.vote === "PIVOT" ? 70 : 90
      : 50;

    // Long-term potential: growth architect + strategist signals
    const strategistResp = responses[0];
    const growthResp = responses[4];
    const ltScores = [strategistResp, growthResp].filter(Boolean).map((r) =>
      r!.vote === "GO" ? 90 : r!.vote === "EXPERIMENT" ? 65 : r!.vote === "PIVOT" ? 40 : 15
    );
    const longTermPotential = Math.round(ltScores.reduce((a, b) => a + b, 0) / ltScores.length);

    const computed: Scores = {
      consensus_pct: consensusPct,
      risk_score: riskScore,
      innovation_score: innovationScore,
      execution_difficulty: execDiff,
      long_term_potential: longTermPotential,
    };

    // Save
    await db.from("council_decision_scores").insert({
      idea_id: ideaId,
      user_id: userId,
      ...computed,
    });

    setScores(computed);
  };

  if (!scores) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flux-card mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-yellow-500" />
        <h4 className="text-xs font-bold">{t("council.decision_score")}</h4>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {METRICS.map((m) => {
          const value = scores[m.key as keyof Scores];
          const isGood = m.inverted ? value < 50 : value >= 50;

          return (
            <div key={m.key} className="text-center">
              <div className="relative mx-auto w-12 h-12 mb-1.5">
                {/* Background ring */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={m.color}
                    strokeWidth="3"
                    strokeDasharray={`${(value / 100) * 97.5} 97.5`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold">{value}</span>
                </div>
              </div>
              <m.icon size={10} className="mx-auto mb-0.5" style={{ color: m.color }} />
              <p className="text-[8px] text-muted-foreground leading-tight">{t(m.label)}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DecisionScoreCard;
