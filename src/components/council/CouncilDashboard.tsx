import { motion } from "framer-motion";
import { BarChart3, Lightbulb, MessageSquare, StickyNote } from "lucide-react";
import { t } from "@/lib/i18n";
import CouncilAvatar from "./CouncilAvatar";

const PERSONAS = [
  { key: "strategist", name: "council.strategist", color: "hsl(270 70% 65%)" },
  { key: "operator", name: "council.operator", color: "hsl(150 60% 45%)" },
  { key: "skeptic", name: "council.skeptic", color: "hsl(330 70% 65%)" },
  { key: "advocate", name: "council.advocate", color: "hsl(217 90% 70%)" },
  { key: "growth", name: "council.growth", color: "hsl(45 90% 55%)" },
];

interface PersonaStats {
  persona_key: string;
  total: number;
  go_count: number;
  experiment_count: number;
  pivot_count: number;
  kill_count: number;
}

interface DashboardProps {
  totalIdeas: number;
  totalVotes: number;
  totalThreads: number;
  totalNotes: number;
  personaStats: PersonaStats[];
}

const CouncilDashboard = ({ totalIdeas, totalVotes, totalThreads, totalNotes, personaStats }: DashboardProps) => {
  const stats = [
    { icon: Lightbulb, label: t("council.dash_ideas"), value: totalIdeas, color: "hsl(var(--primary))" },
    { icon: BarChart3, label: t("council.dash_votes"), value: totalVotes, color: "hsl(150 60% 45%)" },
    { icon: MessageSquare, label: t("council.dash_threads"), value: totalThreads, color: "hsl(217 90% 70%)" },
    { icon: StickyNote, label: t("council.dash_notes"), value: totalNotes, color: "hsl(50 95% 55%)" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flux-card flex items-center gap-3 py-3">
            <s.icon size={18} style={{ color: s.color }} />
            <div>
              <p className="text-lg font-bold font-display">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Persona voting patterns — % Support / Concern / Neutral */}
      <div className="flux-card">
        <h4 className="text-xs font-semibold mb-3">{t("council.dash_persona_stats")}</h4>
        <div className="space-y-3">
          {PERSONAS.map((p) => {
            const ps = personaStats.find((s) => s.persona_key === p.key);
            const total = ps?.total || 0;
            const support = (ps?.go_count || 0) + (ps?.experiment_count || 0);
            const concern = (ps?.pivot_count || 0) + (ps?.kill_count || 0);
            const supportPct = total > 0 ? Math.round((support / total) * 100) : 0;
            const concernPct = total > 0 ? Math.round((concern / total) * 100) : 0;
            const neutralPct = total > 0 ? 100 - supportPct - concernPct : 0;

            return (
              <div key={p.key} className="flex items-center gap-3">
                <CouncilAvatar color={p.color} size={32} />
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1">{t(p.name)}</p>
                  {total > 0 ? (
                    <div className="space-y-1">
                      <div className="h-2 rounded-full overflow-hidden flex">
                        {supportPct > 0 && (
                          <div className="h-full bg-[hsl(150_60%_45%)]" style={{ width: `${supportPct}%` }} />
                        )}
                        {neutralPct > 0 && (
                          <div className="h-full bg-secondary" style={{ width: `${neutralPct}%` }} />
                        )}
                        {concernPct > 0 && (
                          <div className="h-full bg-[hsl(0_70%_55%)]" style={{ width: `${concernPct}%` }} />
                        )}
                      </div>
                      <div className="flex gap-2 text-[9px] text-muted-foreground">
                        <span>{supportPct}% støtter</span>
                        <span>{neutralPct}% neutral</span>
                        <span>{concernPct}% bekymret</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{t("council.no_data")}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{total} {t("council.dash_evals")}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default CouncilDashboard;
