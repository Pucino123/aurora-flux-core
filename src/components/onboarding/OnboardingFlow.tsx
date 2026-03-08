/**
 * OnboardingFlow — Professional minimalist redesign
 * Swiss-style typography, line-art icons, slide-fade transitions.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Users, Calendar, Zap, CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";
import { useMonetization } from "@/context/MonetizationContext";

const SPARKS_REWARD = 50;

const STEPS = [
  {
    id: "crm",
    icon: Users,
    color: "hsl(var(--aurora-violet))",
    code: "SYS_CRM",
    label: "Contact Intelligence",
    body: "Manage deals, log interactions, and generate invoices directly from contact profiles.",
  },
  {
    id: "calendar",
    icon: Calendar,
    color: "hsl(var(--aurora-blue))",
    code: "SYS_CAL",
    label: "Scheduling Engine",
    body: "Link meetings to CRM contacts. Sync with Google Calendar for a unified timeline.",
  },
  {
    id: "aura",
    icon: Zap,
    color: "#10b981",
    code: "SYS_AURA",
    label: "Agentic AI — Aura",
    body: "Give Aura a command in natural language. She creates tasks, schedules events, and checks your invoices.",
  },
  {
    id: "tasks",
    icon: CheckCircle2,
    color: "hsl(var(--primary))",
    code: "SYS_TASK",
    label: "Task Operations",
    body: "Kanban, priority scoring, and deadline tracking across projects and folders.",
  },
];

type Phase = "welcome" | "systems" | "reward";

const OnboardingFlow = () => {
  const { addSparks } = useMonetization();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [sparkCount, setSparkCount] = useState(0);
  const [done, setDone] = useState(() => !!localStorage.getItem("dashiii_onboarding_done_v2"));
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "reward") {
      let count = 0;
      counterRef.current = setInterval(() => {
        count += Math.ceil(SPARKS_REWARD / 35);
        if (count >= SPARKS_REWARD) { count = SPARKS_REWARD; clearInterval(counterRef.current!); }
        setSparkCount(count);
      }, 40);
    }
    return () => { if (counterRef.current) clearInterval(counterRef.current); };
  }, [phase]);

  if (done) return null;

  const skip = () => { localStorage.setItem("dashiii_onboarding_done_v2", "1"); setDone(true); };
  const finish = () => { addSparks(SPARKS_REWARD); localStorage.setItem("dashiii_onboarding_done_v2", "1"); setDone(true); };

  const slideVariants = {
    enter:  { opacity: 0, x: 24 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -24 },
  };

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[8000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(16px)" }}
        >
          {/* Skip */}
          {phase !== "reward" && (
            <button onClick={skip}
              className="absolute top-6 right-6 text-[11px] tracking-wider uppercase font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Skip
            </button>
          )}

          <AnimatePresence mode="wait">

            {/* ── WELCOME ── */}
            {phase === "welcome" && (
              <motion.div key="welcome" variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-md"
              >
                <div
                  className="rounded-3xl p-10 border border-white/10 shadow-2xl text-center"
                  style={{ background: "hsl(var(--card)/0.85)", backdropFilter: "blur(40px)" }}
                >
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-8"
                    style={{ background: "hsl(var(--primary)/0.08)" }}>
                    <Cpu size={24} strokeWidth={1.5} className="text-primary" />
                  </div>

                  <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/60 mb-3">DASHIII — WORKSPACE OS</p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">
                    Your command centre<br />is ready.
                  </h1>
                  <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
                    AI-powered. Zero friction. Every tool you need, unified in one interface.
                  </p>

                  <button onClick={() => setPhase("systems")}
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--aurora-violet)))" }}
                  >
                    Initialise Workspace <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── SYSTEMS ── */}
            {phase === "systems" && (
              <motion.div key="systems" variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-lg"
              >
                <div
                  className="rounded-3xl p-8 border border-white/10 shadow-2xl"
                  style={{ background: "hsl(var(--card)/0.85)", backdropFilter: "blur(40px)" }}
                >
                  <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/60 mb-1">SYSTEM MODULES</p>
                  <h2 className="text-lg font-bold tracking-tight text-foreground mb-6">Core capabilities loaded.</h2>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {STEPS.map(step => {
                      const Icon = step.icon;
                      const isHovered = hoveredStep === step.id;
                      return (
                        <motion.div
                          key={step.id}
                          onMouseEnter={() => setHoveredStep(step.id)}
                          onMouseLeave={() => setHoveredStep(null)}
                          animate={{ borderColor: isHovered ? `${step.color}40` : "hsl(var(--border)/0.3)" }}
                          className="p-4 rounded-2xl border cursor-default transition-colors"
                          style={{
                            background: isHovered ? `${step.color}06` : "hsl(var(--secondary)/0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2.5">
                            <Icon size={14} strokeWidth={1.5} style={{ color: step.color }} />
                            <span className="text-[9px] tracking-[0.15em] uppercase font-mono text-muted-foreground/50">{step.code}</span>
                          </div>
                          <p className="text-xs font-semibold text-foreground mb-1 leading-tight">{step.label}</p>
                          <AnimatePresence>
                            {isHovered && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-[10px] text-muted-foreground leading-relaxed"
                              >
                                {step.body}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  <button onClick={() => setPhase("reward")}
                    className="w-full py-3 rounded-2xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    Claim Your Sparks <ChevronRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── REWARD ── */}
            {phase === "reward" && (
              <motion.div key="reward" variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-sm"
              >
                <div
                  className="rounded-3xl p-10 border border-white/10 shadow-2xl text-center relative overflow-hidden"
                  style={{ background: "hsl(var(--card)/0.85)", backdropFilter: "blur(40px)" }}
                >
                  {/* Particle burst */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -80 + Math.random() * 60, x: (Math.random() - 0.5) * 120, scale: 0.4 }}
                      transition={{ duration: 1.2, delay: i * 0.07, ease: "easeOut" }}
                      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                      style={{
                        left: `${20 + (i % 6) * 12}%`,
                        top: "25%",
                        backgroundColor: i % 2 === 0 ? "#10b981" : "#8b5cf6",
                      }}
                    />
                  ))}

                  <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/60 mb-2">INITIALISATION COMPLETE</p>
                  <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">Access granted.</h2>
                  <p className="text-xs text-muted-foreground mb-6 leading-relaxed">Your workspace credit has been issued. Use Sparks to unlock AI features.</p>

                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
                    className="text-5xl font-black text-foreground mb-1"
                  >
                    {sparkCount} ✨
                  </motion.div>
                  <p className="text-[11px] text-muted-foreground mb-8">Sparks credited</p>

                  <button onClick={finish}
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--aurora-violet)))" }}
                  >
                    Enter Workspace <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingFlow;
