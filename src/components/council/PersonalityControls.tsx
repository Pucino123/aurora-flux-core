import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { t } from "@/lib/i18n";
import CouncilAvatar from "./CouncilAvatar";

interface PersonaIntensity {
  aggression: number; // 0-100: conservative ↔ aggressive
  risk: number; // 0-100: safe ↔ risk-taking
  creativity: number; // 0-100: analytical ↔ creative
}

interface PersonalityControlsProps {
  personas: { key: string; name: string; color: string }[];
  intensities: Record<string, PersonaIntensity>;
  onChange: (key: string, intensity: PersonaIntensity) => void;
}

const SLIDERS = [
  { field: "aggression" as const, leftLabel: "council.conservative", rightLabel: "council.aggressive" },
  { field: "risk" as const, leftLabel: "council.safe", rightLabel: "council.risk_taking" },
  { field: "creativity" as const, leftLabel: "council.analytical", rightLabel: "council.creative" },
];

const PersonalityControls = ({ personas, intensities, onChange }: PersonalityControlsProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500/10 to-violet-500/10 hover:from-indigo-500/20 hover:to-violet-500/20 border border-indigo-500/20 transition-all"
      >
        <SlidersHorizontal size={14} className="text-indigo-500" />
        🎭 {t("council.personality")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="flux-card space-y-4">
              <p className="text-[10px] text-muted-foreground">{t("council.personality_desc")}</p>

              {personas.map((persona) => {
                const intensity = intensities[persona.key] || { aggression: 50, risk: 50, creativity: 50 };
                return (
                  <div key={persona.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CouncilAvatar color={persona.color} size={24} />
                      <span className="text-xs font-bold">{persona.name}</span>
                    </div>

                    {SLIDERS.map((slider) => (
                      <div key={slider.field} className="flex items-center gap-2">
                        <span className="text-[8px] text-muted-foreground w-16 text-right">{t(slider.leftLabel)}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={intensity[slider.field]}
                          onChange={(e) =>
                            onChange(persona.key, { ...intensity, [slider.field]: Number(e.target.value) })
                          }
                          className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, hsl(var(--secondary)) 0%, ${persona.color} ${intensity[slider.field]}%, hsl(var(--secondary)) 100%)`,
                          }}
                        />
                        <span className="text-[8px] text-muted-foreground w-16">{t(slider.rightLabel)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalityControls;
