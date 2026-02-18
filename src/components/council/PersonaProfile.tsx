import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CouncilAvatar from "./CouncilAvatar";
import { PERSONAS } from "../TheCouncil";
import { t } from "@/lib/i18n";

const db = supabase as any;

interface PersonaProfileProps {
  personaKey: string;
  onClose: () => void;
}

const PERSONA_DESCRIPTIONS: Record<string, { role: string; helps: string; relyOn: string }> = {
  strategist: {
    role: "Ser det store billede og langsigtede potentiale. Fokuserer på vision, innovation og unikke muligheder der kan skabe transformativ forandring.",
    helps: "Hjælper dig med at tænke større, identificere skjulte muligheder og sikre at din idé har en klar strategisk retning.",
    relyOn: "Når du har brug for at forstå markedsposition, langsigtet potentiale, og strategiske fordele.",
  },
  operator: {
    role: "Fokuserer på praktisk udførelse, ressourcer og realisme. Vurderer om en idé kan implementeres effektivt med de tilgængelige midler.",
    helps: "Hjælper dig med at omsætte visioner til konkrete handlingsplaner og identificere praktiske udfordringer tidligt.",
    relyOn: "Når du skal vurdere tidsplaner, budgetter, og om planen faktisk kan gennemføres.",
  },
  skeptic: {
    role: "Udfordrer risici, svagheder og blinde vinkler. Stiller de svære spørgsmål og finder fejl før de bliver problemer.",
    helps: "Hjælper dig med at stress-teste din idé og finde kritiske svagheder før de koster dig dyrt.",
    relyOn: "Når du har brug for ærlig kritik og vil sikre, at du ikke overser vigtige risici.",
  },
  advocate: {
    role: "Analyserer data, risici og logiske mønstre. Giver objektiv, evidensbaseret feedback på styrker og svagheder.",
    helps: "Hjælper dig med at identificere blinde vinkler, kvantificere risici og styrke din idés analytiske fundament.",
    relyOn: "Når du har brug for objektiv, datadrevet vurdering og logisk analyse.",
  },
  growth: {
    role: "Fokuserer på vækstpotentiale, momentum og muligheder. Ser det positive og finder veje til at accelerere fremdrift.",
    helps: "Hjælper dig med at finde energi og optimisme i din idé, identificere vækstmuligheder og holde motivationen oppe.",
    relyOn: "Når du har brug for at se muligheder, finde vækstkanaler og holde fremdriften.",
  },
};

const PersonaProfile = ({ personaKey, onClose }: PersonaProfileProps) => {
  const { user } = useAuth();
  const persona = PERSONAS.find((p) => p.key === personaKey);
  const description = PERSONA_DESCRIPTIONS[personaKey];
  const [stats, setStats] = useState<{
    total: number;
    supportPct: number;
    concernPct: number;
    neutralPct: number;
    recentIdeas: { content: string; vote: string; created_at: string }[];
  }>({ total: 0, supportPct: 0, concernPct: 0, neutralPct: 0, recentIdeas: [] });

  useEffect(() => {
    if (!user || !persona) return;
    (async () => {
      const { data } = await db
        .from("council_responses")
        .select("vote, vote_score, idea_id, created_at")
        .eq("user_id", user.id)
        .eq("persona_key", personaKey)
        .order("created_at", { ascending: false });

      if (!data) return;

      // Classify into Support / Concern / Neutral
      let support = 0, concern = 0, neutral = 0;
      data.forEach((r: any) => {
        if (r.vote === "GO" || r.vote === "EXPERIMENT") support++;
        else if (r.vote === "KILL" || r.vote === "PIVOT") concern++;
        else neutral++;
      });

      const total = data.length;
      const supportPct = total > 0 ? Math.round((support / total) * 100) : 0;
      const concernPct = total > 0 ? Math.round((concern / total) * 100) : 0;
      const neutralPct = total > 0 ? 100 - supportPct - concernPct : 0;

      const recentIds = data.slice(0, 5).map((r: any) => r.idea_id);
      const { data: ideas } = await db
        .from("council_ideas")
        .select("id, content")
        .in("id", recentIds);

      const recentIdeas = data.slice(0, 5).map((r: any) => {
        const idea = ideas?.find((i: any) => i.id === r.idea_id);
        return { content: idea?.content?.slice(0, 80) || "...", vote: r.vote, created_at: r.created_at };
      });

      setStats({ total, supportPct, concernPct, neutralPct, recentIdeas });
    })();
  }, [user, personaKey]);

  if (!persona) return null;

  const voteToLabel = (vote: string) => {
    if (vote === "GO") return "Støtter";
    if (vote === "EXPERIMENT") return "Åben";
    if (vote === "PIVOT") return "Bekymret";
    if (vote === "KILL") return "Fraråder";
    return vote;
  };

  const voteToColor = (vote: string) => {
    if (vote === "GO" || vote === "EXPERIMENT") return "hsl(150 60% 45%)";
    if (vote === "PIVOT") return "hsl(30 90% 55%)";
    if (vote === "KILL") return "hsl(0 70% 55%)";
    return "hsl(0 0% 50%)";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-[440px] max-w-[92vw] max-h-[85vh] overflow-y-auto council-hidden-scrollbar p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <CouncilAvatar color={persona.color} size={52} />
            <div>
              <h3 className="font-bold font-display text-lg sm:text-xl">{t(persona.name)}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{persona.key}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Role description */}
        {description && (
          <div className="space-y-3 mb-5">
            <div className="rounded-xl p-3.5 sm:p-4" style={{ backgroundColor: `${persona.color}10`, borderLeft: `3px solid ${persona.color}` }}>
              <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-1">Hvad denne rådgiver står for</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description.role}</p>
            </div>
            <div className="rounded-xl p-3.5 sm:p-4 bg-secondary/30">
              <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-1">Sådan hjælper den dig</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description.helps}</p>
            </div>
            <div className="rounded-xl p-3.5 sm:p-4 bg-secondary/20">
              <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-1">Hvornår du bør lytte</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description.relyOn}</p>
            </div>
          </div>
        )}

        {/* Stats section — % Support / Concern / Neutral */}
        {stats.total > 0 && (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold text-foreground/60 mb-3">Holdning over {stats.total} idéer</p>

              {/* Visual bar */}
              <div className="h-3 rounded-full overflow-hidden flex mb-3">
                {stats.supportPct > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.supportPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-[hsl(150_60%_45%)]"
                  />
                )}
                {stats.neutralPct > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.neutralPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="h-full bg-secondary"
                  />
                )}
                {stats.concernPct > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.concernPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-[hsl(0_70%_55%)]"
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(150_60%_45%)]" />
                  <span className="text-[10px] sm:text-xs font-medium">{stats.supportPct}% Støtter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  <span className="text-[10px] sm:text-xs font-medium">{stats.neutralPct}% Neutral</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(0_70%_55%)]" />
                  <span className="text-[10px] sm:text-xs font-medium">{stats.concernPct}% Bekymret</span>
                </div>
              </div>
            </div>

            {/* Recent evaluations */}
            {stats.recentIdeas.length > 0 && (
              <div>
                <p className="text-xs sm:text-sm font-semibold mb-2.5">Seneste evalueringer</p>
                <div className="space-y-1.5">
                  {stats.recentIdeas.map((idea, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs sm:text-sm py-2 px-3 rounded-xl bg-secondary/20">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold shrink-0"
                        style={{ backgroundColor: `${voteToColor(idea.vote)}22`, color: voteToColor(idea.vote) }}
                      >
                        {voteToLabel(idea.vote)}
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">{idea.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {stats.total === 0 && (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">Ingen data endnu. Indsend en idé for at se statistik.</p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PersonaProfile;
