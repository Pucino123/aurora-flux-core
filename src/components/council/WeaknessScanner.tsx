import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Loader2, AlertTriangle, Brain, TrendingDown, Maximize2, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import CouncilAvatar from "./CouncilAvatar";

interface Weakness {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  suggestion: string;
  persona_key: string;
}

interface WeaknessScannerProps {
  ideaId: string;
  ideaContent: string;
  personas: { key: string; name: string; color: string }[];
}

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  missing_info: AlertTriangle,
  logical_flaw: Brain,
  financial_risk: TrendingDown,
  scalability: Maximize2,
  market_saturation: Scale,
  emotional_bias: Brain,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(0 84% 60%)",
  high: "hsl(30 90% 55%)",
  medium: "hsl(45 90% 55%)",
  low: "hsl(150 60% 45%)",
};

const WeaknessScanner = ({ ideaId, ideaContent, personas }: WeaknessScannerProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);

  const scan = async () => {
    if (loading) return;
    setLoading(true);
    setOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: { type: "council-weakness", idea: ideaContent },
      });
      if (error) throw error;
      setWeaknesses(data?.weaknesses || []);
    } catch (e: any) {
      console.error("Weakness scan error:", e);
      toast.error(t("council.error"));
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = weaknesses.filter((w) => w.severity === "critical" || w.severity === "high").length;

  return (
    <div className="mb-4">
      <button
        onClick={weaknesses.length > 0 ? () => setOpen(!open) : scan}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-500/10 to-pink-500/10 hover:from-red-500/20 hover:to-pink-500/20 border border-red-500/20 transition-all"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} className="text-red-500" />}
        🧩 {t("council.weakness_scan")}
        {weaknesses.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">
            {criticalCount > 0 ? `${criticalCount}!` : weaknesses.length}
          </span>
        )}
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
                <Loader2 size={24} className="animate-spin mx-auto mb-3 text-red-500" />
                <p className="text-sm text-muted-foreground">{t("council.scanning")}</p>
              </div>
            )}

            {!loading && weaknesses.length > 0 && (
              <div className="space-y-2">
                {weaknesses.map((w, i) => {
                  const Icon = CATEGORY_ICONS[w.category] || AlertTriangle;
                  const persona = personas.find((p) => p.key === w.persona_key);
                  const severityColor = SEVERITY_COLORS[w.severity] || SEVERITY_COLORS.medium;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flux-card py-2.5 px-3"
                      style={{ borderLeft: `3px solid ${severityColor}` }}
                    >
                      <div className="flex items-start gap-2">
                        <Icon size={14} className="shrink-0 mt-0.5" style={{ color: severityColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${severityColor}20`, color: severityColor }}
                            >
                              {w.severity}
                            </span>
                            <span className="text-[9px] text-muted-foreground">{w.category.replace(/_/g, " ")}</span>
                            {persona && (
                              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground ml-auto">
                                <CouncilAvatar color={persona.color} size={12} />
                                {persona.name}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-foreground mb-1">{w.description}</p>
                          <p className="text-[10px] text-muted-foreground italic">💡 {w.suggestion}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!loading && weaknesses.length === 0 && (
              <div className="flux-card text-center py-4">
                <p className="text-sm text-muted-foreground">✅ {t("council.no_weaknesses")}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeaknessScanner;
