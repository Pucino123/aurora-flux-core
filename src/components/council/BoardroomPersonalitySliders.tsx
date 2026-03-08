import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";

export interface PersonaSliders {
  riskTolerance: number;  // 0-100: conservative ↔ risk-taking
  innovation: number;     // 0-100: pragmatic ↔ visionary
  pragmatism: number;     // 0-100: theoretical ↔ pragmatic
}

export const DEFAULT_SLIDERS: PersonaSliders = {
  riskTolerance: 50,
  innovation: 50,
  pragmatism: 50,
};

const PERSONA_CONFIG: Record<string, { name: string; color: string; defaultSliders: PersonaSliders }> = {
  elena:  { name: "Elena",  color: "#34d399", defaultSliders: { riskTolerance: 30, innovation: 50, pragmatism: 80 } },
  helen:  { name: "Helen",  color: "#fbbf24", defaultSliders: { riskTolerance: 50, innovation: 70, pragmatism: 60 } },
  anton:  { name: "Anton",  color: "#f87171", defaultSliders: { riskTolerance: 20, innovation: 35, pragmatism: 70 } },
  margot: { name: "Margot", color: "#22d3ee", defaultSliders: { riskTolerance: 80, innovation: 90, pragmatism: 40 } },
};

export type AllSliders = Record<string, PersonaSliders>;

export const DEFAULT_ALL_SLIDERS: AllSliders = Object.fromEntries(
  Object.entries(PERSONA_CONFIG).map(([k, v]) => [k, { ...v.defaultSliders }])
);

interface Props {
  sliders: AllSliders;
  onChange: (sliders: AllSliders) => void;
}

const SLIDER_DEFS: { field: keyof PersonaSliders; leftLabel: string; rightLabel: string }[] = [
  { field: "riskTolerance", leftLabel: "Conservative", rightLabel: "Risk-Taking" },
  { field: "innovation",    leftLabel: "Pragmatic",     rightLabel: "Visionary" },
  { field: "pragmatism",    leftLabel: "Theoretical",   rightLabel: "Direct" },
];

const BoardroomPersonalitySliders: React.FC<Props> = ({ sliders, onChange }) => {
  const [open, setOpen] = useState(false);

  const update = (key: string, field: keyof PersonaSliders, value: number) => {
    onChange({ ...sliders, [key]: { ...sliders[key], [field]: value } });
  };

  const resetAll = () => {
    onChange(DEFAULT_ALL_SLIDERS);
  };

  const hasCustom = Object.entries(sliders).some(([k, s]) => {
    const def = PERSONA_CONFIG[k].defaultSliders;
    return s.riskTolerance !== def.riskTolerance || s.innovation !== def.innovation || s.pragmatism !== def.pragmatism;
  });

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${
            open ? "text-purple-300 border border-purple-400/30" : "text-white/30 hover:text-white/60 border border-white/8"
          }`}
          style={{ background: open ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)" }}
          title="Advisor Personality"
        >
          <SlidersHorizontal size={11} />
          Personality
          {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />}
        </button>
        {hasCustom && (
          <button
            onClick={resetAll}
            className="text-[9px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-0.5"
            title="Reset to defaults"
          >
            <X size={8} /> Reset
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden mt-2"
          >
            <div
              className="rounded-2xl border border-white/8 p-4 grid grid-cols-2 gap-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              {Object.entries(PERSONA_CONFIG).map(([key, cfg]) => {
                const s = sliders[key] || cfg.defaultSliders;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                        style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
                      >
                        {cfg.name[0]}
                      </div>
                      <span className="text-[10px] font-semibold text-white/70">{cfg.name}</span>
                    </div>
                    {SLIDER_DEFS.map(def => (
                      <div key={def.field} className="space-y-0.5">
                        <div className="flex justify-between text-[8px] text-white/25">
                          <span>{def.leftLabel}</span>
                          <span className="font-semibold" style={{ color: cfg.color }}>{s[def.field]}</span>
                          <span>{def.rightLabel}</span>
                        </div>
                        <div className="relative h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div
                            className="absolute left-0 top-0 h-full rounded-full"
                            style={{ width: `${s[def.field]}%`, background: `linear-gradient(90deg, ${cfg.color}40, ${cfg.color})` }}
                          />
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={s[def.field]}
                            onChange={e => update(key, def.field, Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
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

export default BoardroomPersonalitySliders;
