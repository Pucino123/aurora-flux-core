import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { ArrowRight, Calendar, CheckSquare, Layers, Sparkles, Zap, Brain, Clock, BarChart3, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

const features = [
  {
    icon: Calendar,
    title: "AI Calendar",
    desc: "Your schedule, intelligently planned. Flux auto-schedules tasks around your life, blocks deep work time, and adapts when plans change.",
    color: "from-blue-500/20 to-indigo-500/10",
    accent: "hsl(217 90% 62%)",
  },
  {
    icon: CheckSquare,
    title: "Smart Task Manager",
    desc: "AI-prioritized task lists that surface what matters most. Drag, sort, and organize across days — Flux handles the heavy lifting.",
    color: "from-violet-500/20 to-purple-500/10",
    accent: "hsl(270 70% 65%)",
  },
  {
    icon: Layers,
    title: "Tool Ecosystem",
    desc: "A modular workspace with 20+ tools — timers, notes, budget trackers, fitness logs, and more. Build your perfect focus environment.",
    color: "from-emerald-500/20 to-teal-500/10",
    accent: "hsl(160 60% 45%)",
  },
  {
    icon: Brain,
    title: "The Council",
    desc: "Submit any idea or decision. Five distinct AI personas debate it from every angle — strategist, skeptic, advocate, operator, growth architect.",
    color: "from-rose-500/20 to-pink-500/10",
    accent: "hsl(330 80% 65%)",
  },
];

const steps = [
  {
    num: "01",
    title: "Tell Flux your goals",
    desc: "Type a goal, project, or task in plain language. Flux parses your intent and structures everything automatically.",
  },
  {
    num: "02",
    title: "AI builds your plan",
    desc: "Flux schedules tasks in your calendar, sets priorities, and blocks time for deep work — all without you lifting a finger.",
  },
  {
    num: "03",
    title: "Work in Flow",
    desc: "Open Focus Mode for a distraction-free environment with your tools, clock, and tasks exactly where you need them.",
  },
];

const stats = [
  { value: "20+", label: "Productivity tools" },
  { value: "5×", label: "AI personas in Council" },
  { value: "∞", label: "Tasks & goals" },
  { value: "1", label: "Unified workspace" },
];

const LandingPage = ({ onEnter }: LandingPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const handleCTA = () => {
    if (user) { onEnter(""); }
    else { navigate("/auth"); }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap size={14} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-lg font-display tracking-tight">Flux</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate("/auth")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Sign in
          </button>
          <button
            onClick={handleCTA}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get started <ArrowRight size={13} />
          </button>
        </motion.div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full opacity-[0.07] bg-primary blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.05] bg-accent blur-[100px]" />
          <div className="absolute top-[40%] right-[25%] w-[300px] h-[300px] rounded-full opacity-[0.04] bg-aurora-pink blur-[80px]" />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          {/* Pill */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-secondary/60 text-xs font-medium text-muted-foreground mb-8 backdrop-blur-sm"
          >
            <Sparkles size={11} className="text-primary" />
            Introducing Flux Intelligence
            <ChevronRight size={11} />
          </motion.div>

          {/* Headline — Joobie-style bold serif */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Plan less.{" "}
            <span className="italic" style={{ color: "hsl(var(--primary))" }}>Achieve</span>{" "}
            more.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
          >
            Flux is the AI-powered workspace that builds your schedule, prioritizes your tasks, and keeps you in flow — automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={handleCTA}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background text-base font-semibold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start for free
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/focus")}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-border/60 bg-secondary/40 text-foreground text-base font-medium hover:bg-secondary/80 transition-all backdrop-blur-sm"
            >
              Try Focus Mode
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-border/30 w-full"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold font-display">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Mock UI preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="relative z-10 mt-16 w-full max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-card/40">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
              <div className="flex-1 mx-4 h-5 rounded-md bg-secondary/60 text-[10px] flex items-center justify-center text-muted-foreground/50 font-mono">
                flux.app/focus
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 min-h-[200px]">
              {/* Mock Task Card */}
              <div className="col-span-2 rounded-xl border border-border/30 bg-background/40 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare size={12} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground/70">Today's Tasks</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">3 remaining</span>
                </div>
                {["Launch landing page redesign", "Review Q2 roadmap", "Sync with design team"].map((task, i) => (
                  <div key={task} className={`flex items-center gap-2.5 py-1.5 ${i === 0 ? "opacity-40 line-through" : ""}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${i === 0 ? "bg-primary border-primary" : "border-border"}`}>
                      {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{task}</span>
                    {i === 1 && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">High</span>}
                  </div>
                ))}
              </div>
              {/* Mock Clock */}
              <div className="rounded-xl border border-border/30 bg-background/40 p-3 flex flex-col items-center justify-center">
                <Clock size={14} className="text-muted-foreground mb-2" />
                <div className="text-2xl font-bold tabular-nums font-display">14:32</div>
                <div className="text-[10px] text-muted-foreground mt-1">Thursday</div>
                <div className="mt-2 w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-3/5 rounded-full bg-primary/60" />
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">2/3 complete</div>
              </div>
              {/* Mock Calendar strip */}
              <div className="col-span-3 rounded-xl border border-border/30 bg-background/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={12} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground/70">AI Calendar</span>
                </div>
                <div className="flex gap-2 overflow-hidden">
                  {[
                    { time: "9:00", label: "Deep Work", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
                    { time: "11:00", label: "Team Sync", color: "bg-purple-500/20 text-purple-400 border-purple-500/20" },
                    { time: "13:00", label: "Lunch", color: "bg-green-500/20 text-green-400 border-green-500/20" },
                    { time: "14:30", label: "Design Review", color: "bg-pink-500/20 text-pink-400 border-pink-500/20" },
                    { time: "16:00", label: "Deep Work", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
                  ].map((block) => (
                    <div key={block.time} className={`flex-1 rounded-lg border px-2 py-1.5 ${block.color}`}>
                      <div className="text-[9px] opacity-60 font-mono">{block.time}</div>
                      <div className="text-[10px] font-medium truncate">{block.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow beneath preview */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/10 blur-3xl rounded-full" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-secondary/40 text-xs font-medium text-muted-foreground mb-6">
            <BarChart3 size={11} className="text-primary" />
            Everything you need
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">
            Your entire workflow,<br />
            <span className="italic" style={{ color: "hsl(var(--primary))" }}>unified.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Flux brings together every tool you need — without the friction of switching between apps.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative rounded-2xl border border-border/40 bg-gradient-to-br ${feat.color} p-6 hover:border-border/70 transition-all duration-300 cursor-default`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${feat.accent}20`, border: `1px solid ${feat.accent}30` }}
                >
                  <Icon size={18} style={{ color: feat.accent }} />
                </div>
                <h3 className="text-lg font-bold font-display mb-2">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 md:px-12 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-secondary/40 text-xs font-medium text-muted-foreground mb-6">
              <Zap size={11} className="text-primary" />
              How it works
            </div>
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">
              From chaos to clarity<br />
              <span className="italic" style={{ color: "hsl(var(--primary))" }}>in minutes.</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex gap-6 p-6 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm hover:border-border/60 transition-colors"
              >
                <div className="text-4xl font-bold font-display text-muted-foreground/20 tabular-nums shrink-0 leading-none pt-1">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display mb-1.5">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative max-w-3xl mx-auto rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl p-12 md:p-16 text-center overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 opacity-10 bg-primary blur-3xl rounded-full" />
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">
              Ready to enter Flow?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Join thousands of builders, creators, and achievers who plan better with Flux.
            </p>
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background text-base font-semibold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started — it's free
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center">
              <Zap size={10} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-sm font-display">Flux</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Flux. Built for focus.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
