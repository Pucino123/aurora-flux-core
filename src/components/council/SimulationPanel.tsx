import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Target, AlertTriangle, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import CouncilAvatar from "./CouncilAvatar";

const db = supabase as any;

interface Scenario {
  type: "best" | "worst" | "realistic";
  description: string;
  risk_probability: number;
  time_to_execution: string;
  required_resources: string;
  failure_points: string;
  persona_reactions: { persona_key: string; reaction: string; vote: string }[];
  consensus_score: number;
}

interface SimulationPanelProps {
  ideaId: string;
  ideaContent: string;
  userId: string;
  personas: { key: string; name: string; color: string; emoji: string }[];
}

const SCENARIO_CONFIG = {
  best: { icon: TrendingUp, label: "Best Case", labelDa: "Bedste Scenarie", color: "hsl(150 60% 45%)", bg: "hsl(150 60% 95%)" },
  worst: { icon: TrendingDown, label: "Worst Case", labelDa: "Værste Scenarie", color: "hsl(0 84% 60%)", bg: "hsl(0 84% 95%)" },
  realistic: { icon: Target, label: "Most Likely", labelDa: "Mest Sandsynligt", color: "hsl(217 90% 60%)", bg: "hsl(217 90% 95%)" },
};

const SimulationPanel = ({ ideaId, ideaContent, userId, personas }: SimulationPanelProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<"best" | "worst" | "realistic">("realistic");

  const runSimulation = async () => {
    if (loading) return;
    setLoading(true);
    setOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: { type: "council-simulate", idea: ideaContent },
      });

      if (error) throw error;

      const sims = data?.scenarios || [];
      setScenarios(sims);

      // Save to DB
      for (const sim of sims) {
        await db.from("council_simulations").insert({
          idea_id: ideaId,
          user_id: userId,
          scenario_type: sim.type,
          scenario_description: sim.description,
          risk_probability: sim.risk_probability,
          time_to_execution: sim.time_to_execution,
          required_resources: sim.required_resources,
          failure_points: sim.failure_points,
          persona_reactions: sim.persona_reactions,
          consensus_score: sim.consensus_score,
        });
      }
    } catch (e: any) {
      console.error("Simulation error:", e);
      toast.error(t("council.error"));
    } finally {
      setLoading(false);
    }
  };

  const active = scenarios.find((s) => s.type === activeScenario);
  const cfg = SCENARIO_CONFIG[activeScenario];

  const getVoteColor = (vote: string) => {
    switch (vote) {
      case "GO": return "bg-[hsl(150_60%_45%)]/15 text-[hsl(150_60%_35%)]";
      case "EXPERIMENT": return "bg-[hsl(45_90%_55%)]/15 text-[hsl(45_80%_35%)]";
      case "PIVOT": return "bg-[hsl(30_90%_55%)]/15 text-[hsl(30_80%_35%)]";
      case "KILL": return "bg-destructive/15 text-destructive";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={scenarios.length > 0 ? () => setOpen(!open) : runSimulation}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20 transition-all"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-purple-500" />}
        🔮 {t("council.simulate")}
        {scenarios.length > 0 && <span className="text-[10px] opacity-60">({scenarios.length})</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            {loading && (
              <div className="flux-card text-center py-8">
                <Loader2 size={24} className="animate-spin mx-auto mb-3 text-purple-500" />
                <p className="text-sm text-muted-foreground">{t("council.simulating")}</p>
              </div>
            )}

            {!loading && scenarios.length > 0 && (
              <div className="space-y-3">
                {/* Scenario tabs */}
                <div className="flex gap-1.5">
                  {(["best", "worst", "realistic"] as const).map((type) => {
                    const c = SCENARIO_CONFIG[type];
                    const Icon = c.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveScenario(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeScenario === type
                            ? "text-white shadow-md"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                        style={activeScenario === type ? { backgroundColor: c.color } : {}}
                      >
                        <Icon size={12} />
                        {c.labelDa}
                      </button>
                    );
                  })}
                </div>

                {/* Active scenario */}
                {active && (
                  <motion.div
                    key={activeScenario}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flux-card"
                    style={{ borderLeft: `3px solid ${cfg.color}` }}
                  >
                    {/* Description */}
                    <div className="prose prose-xs max-w-none text-sm text-muted-foreground mb-4">
                      <ReactMarkdown>{active.description}</ReactMarkdown>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      <div className="bg-secondary/30 rounded-lg p-2 text-center">
                        <AlertTriangle size={14} className="mx-auto mb-1 text-orange-500" />
                        <p className="text-lg font-bold">{active.risk_probability}%</p>
                        <p className="text-[9px] text-muted-foreground">{t("council.risk_prob")}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-2 text-center">
                        <Clock size={14} className="mx-auto mb-1 text-blue-500" />
                        <p className="text-xs font-bold mt-1">{active.time_to_execution}</p>
                        <p className="text-[9px] text-muted-foreground">{t("council.time_exec")}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-2 text-center">
                        <Package size={14} className="mx-auto mb-1 text-green-500" />
                        <p className="text-[10px] font-medium mt-1 leading-tight">{active.required_resources}</p>
                        <p className="text-[9px] text-muted-foreground">{t("council.resources")}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-2 text-center">
                        <Target size={14} className="mx-auto mb-1" style={{ color: cfg.color }} />
                        <p className="text-lg font-bold" style={{ color: cfg.color }}>
                          {active.consensus_score > 0 ? "+" : ""}{active.consensus_score}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{t("council.consensus")}</p>
                      </div>
                    </div>

                    {/* Failure points */}
                    {active.failure_points && (
                      <div className="mb-4 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <p className="text-[10px] font-semibold text-destructive mb-1">{t("council.failure_points")}</p>
                        <p className="text-[11px] text-muted-foreground">{active.failure_points}</p>
                      </div>
                    )}

                    {/* Persona reactions */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("council.persona_reactions")}</p>
                      {active.persona_reactions?.map((pr) => {
                        const persona = personas.find((p) => p.key === pr.persona_key);
                        if (!persona) return null;
                        return (
                          <div key={pr.persona_key} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20">
                            <CouncilAvatar color={persona.color} size={24} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-bold">{persona.name}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${getVoteColor(pr.vote)}`}>{pr.vote}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{pr.reaction}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SimulationPanel;
