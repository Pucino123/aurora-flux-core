import { forwardRef, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ChevronRight } from "lucide-react";
import { useMonetization } from "@/context/MonetizationContext";

const TOUR_STEPS = [
  {
    id: "pagination",
    title: "Swipe and Organize",
    body: "Click the dots or use Left/Right arrow keys to organize your tools across multiple pages — just like your phone.",
    selector: '[data-tour="pagination-dots"]',
  },
  {
    id: "split-view",
    title: "True Multitasking",
    body: "Drag any document into the center workspace to open it. Drag a second one to instantly snap into Split-View.",
    selector: '[data-tour="workspace-nav"]',
  },
  {
    id: "council",
    title: "Meet The Council",
    body: "Your advisors are ready. They can review your work in real-time and help you strategize from multiple perspectives.",
    selector: '[data-tour="council-nav"]',
  },
];

const SPARKS_REWARD = 50;

const OnboardingFlow = () => {
  const { addSparks } = useMonetization();
  const [phase, setPhase] = useState<"welcome" | "tour" | "reward" | "done">("welcome");
  const [step, setStep] = useState(0);
  const [sparkCount, setSparkCount] = useState(0);
  const [done, setDone] = useState(() => !!localStorage.getItem("flux_onboarding_done_v1"));
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "reward") {
      let count = 0;
      counterRef.current = setInterval(() => {
        count += Math.ceil(SPARKS_REWARD / 30);
        if (count >= SPARKS_REWARD) {
          count = SPARKS_REWARD;
          if (counterRef.current) clearInterval(counterRef.current);
        }
        setSparkCount(count);
      }, 50);
    }
    return () => { if (counterRef.current) clearInterval(counterRef.current); };
  }, [phase]);

  if (done) return null;

  const skip = () => {
    localStorage.setItem("flux_onboarding_done_v1", "1");
    setDone(true);
  };

  const finish = () => {
    addSparks(SPARKS_REWARD);
    localStorage.setItem("flux_onboarding_done_v1", "1");
    setDone(true);
  };

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[8000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)" }}
        >
          {/* Skip button */}
          <button
            onClick={skip}
            className="absolute bottom-8 right-8 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>

          {/* Welcome */}
          {phase === "welcome" && (
            <motion.div
              initial={{ scale: 0.9, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 24 }}
              className="w-full max-w-md rounded-3xl p-10 text-center shadow-2xl"
              style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}
            >
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to your new Workspace.</h1>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                Flux is designed to help you think clearer, work faster, and make better decisions with your own personal AI advisory board.
              </p>
              <button
                onClick={() => setPhase("tour")}
                className="w-full py-3.5 rounded-2xl font-semibold text-base text-primary-foreground flex items-center justify-center gap-2 shadow-lg"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--aurora-violet)))" }}
              >
                Start the Tour <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* Tour */}
          {phase === "tour" && (
            <motion.div
              key={`tour-${step}`}
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className="w-full max-w-sm rounded-3xl p-8 shadow-2xl"
              style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}
            >
              <div className="flex items-center gap-2 mb-5">
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-border"}`} />
                ))}
              </div>
              <div className="text-xs font-semibold text-primary mb-1">Step {step + 1} of {TOUR_STEPS.length}</div>
              <h2 className="text-lg font-bold text-foreground mb-2">{TOUR_STEPS[step].title}</h2>
              <p className="text-sm text-muted-foreground mb-7 leading-relaxed">{TOUR_STEPS[step].body}</p>
              <div className="flex gap-3">
                {step > 0 && (
                  <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground">
                    Back
                  </button>
                )}
                <button
                  onClick={() => step < TOUR_STEPS.length - 1 ? setStep((s) => s + 1) : setPhase("reward")}
                  className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  {step < TOUR_STEPS.length - 1 ? "Next" : "Finish"} <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Reward */}
          {phase === "reward" && (
            <motion.div
              initial={{ scale: 0.88, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl p-10 text-center shadow-2xl overflow-hidden relative"
              style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}
            >
              {/* confetti dots */}
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -120 + Math.random() * 80, x: (Math.random() - 0.5) * 160, scale: 0.5 }}
                  transition={{ duration: 1.5, delay: i * 0.05, ease: "easeOut" }}
                  className="absolute w-2 h-2 rounded-full pointer-events-none"
                  style={{
                    left: `${15 + (i % 9) * 10}%`,
                    top: "30%",
                    background: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--aurora-violet))" : "#f5c842",
                  }}
                />
              ))}
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">You're ready to go.</h2>
              <p className="text-sm text-muted-foreground mb-6">To get you started, we've credited your account with your first Sparks.</p>
              <motion.div
                className="text-5xl font-black text-foreground mb-2"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              >
                {sparkCount} ✨
              </motion.div>
              <p className="text-xs text-muted-foreground mb-8">Use them to consult The Council or generate Smart Plans.</p>
              <button
                onClick={finish}
                className="w-full py-3.5 rounded-2xl font-semibold text-primary-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--aurora-violet)))" }}
              >
                Enter Workspace
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingFlow;
