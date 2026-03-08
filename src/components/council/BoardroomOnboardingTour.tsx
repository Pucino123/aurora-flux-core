import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, X, Lightbulb, Users, BookmarkPlus } from "lucide-react";

interface Step {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  body: string;
  highlight: string;
}

const STEPS: Step[] = [
  {
    icon: Lightbulb,
    iconColor: "#fbbf24",
    title: "Type your idea",
    body: "Start by typing any idea, decision, or question you want the board to analyse — from business plans to life choices.",
    highlight: "Be specific! The more context you give, the sharper the council's insight.",
  },
  {
    icon: Sparkles,
    iconColor: "#a78bfa",
    title: "Consult the Board",
    body: "Click Consult Board and watch your 4 AI advisors — Elena, Helen, Anton, and Margot — each respond with unique perspectives.",
    highlight: "Each advisor has a distinct personality and bias. Anton will challenge you. Margot will inspire you.",
  },
  {
    icon: Users,
    iconColor: "#22d3ee",
    title: "Review the analysis",
    body: "Each advisor shows a confidence score, a detailed analysis, and a probing question. Click any card to deep-dive with follow-up chat.",
    highlight: "Tune the Personality Sliders to make advisors more conservative or visionary before consulting.",
  },
  {
    icon: BookmarkPlus,
    iconColor: "#34d399",
    title: "Save to your Council",
    body: "When the action plan appears, click Save to Council to archive the analysis. Browse history, filter by tag, and track your trends.",
    highlight: "Use tags like 'startup', 'pivot', 'personal' to organise sessions and filter them later.",
  },
];

interface Props {
  onDismiss: () => void;
}

const BoardroomOnboardingTour: React.FC<Props> = ({ onDismiss }) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
      onClick={onDismiss}
    >
      <motion.div
        key={step}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl overflow-hidden border"
        style={{
          background: "linear-gradient(135deg, rgba(10,8,22,0.98) 0%, rgba(18,10,40,0.98) 100%)",
          borderColor: `${current.iconColor}30`,
          boxShadow: `0 0 60px ${current.iconColor}18, 0 30px 60px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Close */}
        <div className="flex items-center justify-between px-5 py-4">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  background: i === step ? current.iconColor : `${current.iconColor}30`,
                }}
              />
            ))}
          </div>
          <button
            onClick={onDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-full text-white/25 hover:text-white/60 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <X size={11} />
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center pb-4">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 40% 40%, ${current.iconColor}22, ${current.iconColor}08)`,
              border: `1px solid ${current.iconColor}25`,
              boxShadow: `0 8px 32px ${current.iconColor}20`,
            }}
          >
            <Icon size={28} color={current.iconColor} />
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-lg font-bold text-white/90 mb-2 text-center"
          >
            {current.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-[12px] text-white/55 leading-relaxed text-center mb-4"
          >
            {current.body}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="rounded-xl px-3 py-2.5 mb-5"
            style={{
              background: `${current.iconColor}0a`,
              border: `1px solid ${current.iconColor}20`,
            }}
          >
            <p className="text-[10px] leading-relaxed" style={{ color: `${current.iconColor}cc` }}>
              💡 {current.highlight}
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl text-[11px] text-white/30 hover:text-white/60 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => isLast ? onDismiss() : setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${current.iconColor}60, ${current.iconColor}30)`,
              border: `1px solid ${current.iconColor}40`,
              boxShadow: `0 4px 16px ${current.iconColor}20`,
            }}
          >
            {isLast ? (
              <><Sparkles size={12} /> Start Consulting</>
            ) : (
              <>Next <ChevronRight size={12} /></>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BoardroomOnboardingTour;
