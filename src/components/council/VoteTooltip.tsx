import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/i18n";

// 5-tier vote system mapped from internal votes
const VOTE_TIERS: Record<string, { label: string; tier: number; glow: string; bg: string; text: string }> = {
  GO: {
    label: "Støtter",
    tier: 5,
    glow: "0 0 12px hsl(150 60% 45% / 0.4)",
    bg: "bg-[hsl(150_60%_45%)]/15",
    text: "text-[hsl(150_60%_35%)]",
  },
  EXPERIMENT: {
    label: "Åben",
    tier: 4,
    glow: "0 0 8px hsl(150 60% 55% / 0.3)",
    bg: "bg-[hsl(150_60%_55%)]/10",
    text: "text-[hsl(150_60%_45%)]",
  },
  NEUTRAL: {
    label: "Neutral",
    tier: 3,
    glow: "none",
    bg: "bg-secondary",
    text: "text-secondary-foreground",
  },
  PIVOT: {
    label: "Bekymret",
    tier: 2,
    glow: "0 0 8px hsl(30 90% 55% / 0.3)",
    bg: "bg-[hsl(30_90%_55%)]/15",
    text: "text-[hsl(30_80%_35%)]",
  },
  KILL: {
    label: "Fraråder",
    tier: 1,
    glow: "0 0 12px hsl(0 84% 60% / 0.4)",
    bg: "bg-destructive/15",
    text: "text-destructive",
  },
};

interface VoteTooltipProps {
  vote: string;
  voteScore: number;
  confidence?: number;
  riskRating?: number;
  innovationScore?: number;
}

const VoteTooltip = ({ vote, voteScore, confidence, riskRating, innovationScore }: VoteTooltipProps) => {
  const [hovered, setHovered] = useState(false);
  const tier = VOTE_TIERS[vote] || VOTE_TIERS.NEUTRAL;

  // Derive confidence and scores from vote if not provided
  const conf = confidence ?? (vote === "GO" ? 85 : vote === "EXPERIMENT" ? 65 : vote === "PIVOT" ? 45 : vote === "KILL" ? 80 : 50);
  const risk = riskRating ?? (vote === "KILL" ? 85 : vote === "PIVOT" ? 65 : vote === "EXPERIMENT" ? 40 : vote === "GO" ? 20 : 50);
  const innov = innovationScore ?? (vote === "GO" ? 75 : vote === "EXPERIMENT" ? 80 : vote === "PIVOT" ? 50 : vote === "KILL" ? 30 : 50);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <motion.span
        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${tier.bg} ${tier.text} cursor-default inline-flex items-center gap-1`}
        style={{ boxShadow: tier.glow }}
        animate={
          tier.tier >= 4
            ? { scale: [1, 1.05, 1] }
            : tier.tier <= 2
            ? { x: [-0.5, 0.5, -0.5, 0] }
            : {}
        }
        transition={
          tier.tier >= 4
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : tier.tier <= 2
            ? { duration: 0.3, repeat: Infinity, repeatDelay: 3 }
            : {}
        }
      >
        {tier.label}
        <span className="opacity-60 text-[8px]">({voteScore > 0 ? "+" : ""}{voteScore})</span>
      </motion.span>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 right-0 w-40 p-2.5 rounded-xl glass-panel shadow-lg border border-border"
          >
            <div className="space-y-1.5">
              <TooltipRow label="Confidence" value={conf} color="hsl(150 60% 45%)" />
              <TooltipRow label="Risk" value={risk} color="hsl(0 84% 60%)" />
              <TooltipRow label="Innovation" value={innov} color="hsl(270 70% 65%)" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TooltipRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div>
    <div className="flex justify-between mb-0.5">
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <span className="text-[9px] font-bold">{value}%</span>
    </div>
    <div className="h-1 rounded-full bg-secondary overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  </div>
);

export default VoteTooltip;
