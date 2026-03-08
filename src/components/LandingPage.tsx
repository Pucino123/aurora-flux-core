import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  ArrowRight, Sparkles, CheckSquare, Calendar, Brain, LayoutGrid,
  Zap, Target, Music, BarChart3, Users, FileText, Clock, Star,
  LucideIcon, Sun, Moon, Briefcase, FolderKanban, Dumbbell,
  MessageCircle, Globe, Layers, GitBranch, HeartPulse,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import gradientBg from "@/assets/bg-gradient.png";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

/* ── Feature marquee data ── */
const FEATURES_ROW1 = [
  { icon: LayoutGrid, title: "Personal Dashboard" },
  { icon: CheckSquare, title: "AI Task Manager" },
  { icon: Brain, title: "The Council" },
  { icon: Target, title: "Focus Mode" },
  { icon: Calendar, title: "Smart Calendar" },
  { icon: BarChart3, title: "Finance Tracker" },
  { icon: Music, title: "Soundscapes" },
  { icon: Zap, title: "Quick Capture" },
  { icon: Briefcase, title: "CRM" },
  { icon: FolderKanban, title: "Projects" },
  { icon: Dumbbell, title: "Fitness Tracker" },
  { icon: HeartPulse, title: "Mood Tracker" },
];
const FEATURES_ROW2 = [
  { icon: FileText, title: "Documents" },
  { icon: Users, title: "Team Chat" },
  { icon: Star, title: "Goals" },
  { icon: Clock, title: "Routines" },
  { icon: Brain, title: "Neural View" },
  { icon: BarChart3, title: "Analytics" },
  { icon: Target, title: "Kanban Board" },
  { icon: Zap, title: "AI Scheduler" },
  { icon: MessageCircle, title: "Ask Aura" },
  { icon: Globe, title: "Community" },
  { icon: Layers, title: "Multitasking" },
  { icon: GitBranch, title: "Brain Tree" },
];

const MarqueePill = ({ icon: Icon, title, isDark }: { icon: LucideIcon; title: string; isDark: boolean }) => (
  <div
    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full cursor-default"
    style={{
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.18)",
      border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.35)",
      backdropFilter: "blur(16px)",
    }}
  >
    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.30)" }}>
      <Icon size={11} className="text-white" />
    </div>
    <span className="text-white font-medium text-xs md:text-sm whitespace-nowrap">{title}</span>
  </div>
);

const FeatureMarquee = ({ isDark }: { isDark: boolean }) => (
  <div className="py-2 space-y-3 select-none">
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-[marquee_55s_linear_infinite]">
        {[...FEATURES_ROW1, ...FEATURES_ROW1].map((f, i) => <MarqueePill key={i} icon={f.icon} title={f.title} isDark={isDark} />)}
      </div>
    </div>
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-[marquee-reverse_55s_linear_infinite]">
        {[...FEATURES_ROW2, ...FEATURES_ROW2].map((f, i) => <MarqueePill key={i} icon={f.icon} title={f.title} isDark={isDark} />)}
      </div>
    </div>
  </div>
);

const LandingPage = ({ onEnter }: LandingPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const handleCTA = () => {
    if (user) onEnter("");
    else navigate("/auth");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${gradientBg})`,
          filter: isDark ? "blur(8px) brightness(0.55) saturate(1.1)" : "blur(6px) brightness(0.88) saturate(1.1)",
          transform: "scale(1.06)",
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-700"
        style={{ background: isDark ? "rgba(4,2,10,0.38)" : "rgba(10,8,30,0.18)" }} />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-5 md:px-16 py-4 md:py-5">
        <span className="text-xl md:text-2xl font-bold text-white drop-shadow-lg tracking-tight" style={{ fontFamily: "Georgia, serif" }}>Dashiii</span>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all"
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button onClick={() => navigate("/auth")} className="hidden sm:block text-white/80 hover:text-white text-sm font-medium transition-colors drop-shadow">Sign in</button>
          <button onClick={handleCTA} className="flex items-center gap-1.5 bg-white text-slate-800 text-xs md:text-sm font-bold px-4 md:px-5 py-2 md:py-2.5 rounded-full shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
            Get started <ArrowRight size={12} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center pt-10 md:pt-16 pb-10 md:pb-16 px-5">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/35 text-white text-[11px] md:text-xs font-semibold px-3 md:px-4 py-1 md:py-1.5 rounded-full mb-7 md:mb-10 shadow-sm">
            <Sparkles size={10} className="text-yellow-200" /> The workspace that shapes itself around you
          </div>
          <h1 className="text-[2.6rem] sm:text-6xl md:text-[5rem] lg:text-[6.5rem] font-bold text-white leading-[1.05] mb-2 md:mb-3 w-full"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", textShadow: isDark ? "0 4px 40px rgba(0,0,0,0.6)" : "0 4px 30px rgba(0,40,100,0.25)" }}>
            Your workspace,
          </h1>
          <h1 className="text-[2.6rem] sm:text-6xl md:text-[5rem] lg:text-[6.5rem] font-bold text-white leading-[1.05] mb-6 md:mb-8 w-full"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", textShadow: isDark ? "0 4px 40px rgba(0,0,0,0.6)" : "0 4px 30px rgba(0,40,100,0.25)" }}>
            fully yours.
          </h1>
          <p className="text-base md:text-xl text-white/85 max-w-sm md:max-w-lg mx-auto mb-8 md:mb-10 leading-relaxed drop-shadow font-sans">
            Drag widgets, build your dashboard, let AI handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button onClick={handleCTA} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-800 font-bold px-8 py-3.5 md:py-4 rounded-full shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-sm md:text-base">
              Start for free <ArrowRight size={15} />
            </button>
            <button onClick={() => navigate("/auth")} className="w-full sm:w-auto flex items-center justify-center gap-2 backdrop-blur-md border border-white/30 text-white font-semibold px-7 py-3.5 md:py-4 rounded-full transition-all text-sm md:text-base"
              style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.20)" }}>
              Sign in
            </button>
          </div>
        </motion.div>
      </section>

      {/* Product Video */}
      <section className="relative z-10 px-4 md:px-8 pb-20 md:pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
              See it in <em style={{ fontStyle: "italic" }}>action</em>
            </h2>
            <p className="text-sm text-white/50">Watch how Dashiii adapts to the way you work.</p>
          </div>
          <div
            className="relative rounded-3xl overflow-hidden aspect-video"
            style={{
              background: isDark ? "rgba(12,10,20,0.70)" : "rgba(255,255,255,0.12)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid rgba(255,255,255,0.28)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.3)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(100,140,255,0.18), transparent 70%)" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="ml-1 opacity-90"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <p className="text-white/40 text-sm">Product demo coming soon</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Marquee */}
      <section className="relative z-10 pb-16 md:pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-8 px-5">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
            More than just <em style={{ fontStyle: "italic" }}>tasks</em>
          </h2>
          <p className="text-sm text-white/50">One workspace that replaces all your productivity apps.</p>
        </motion.div>
        <FeatureMarquee isDark={isDark} />
      </section>

      {/* Social Proof */}
      <section className="relative z-10 pb-16 md:pb-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { initials: "MK", name: "Marcus K.", role: "Freelance Designer", stars: 5, quote: "Dashiii replaced four apps for me. The focus mode alone is worth it." },
            { initials: "SR", name: "Sofia R.", role: "Product Manager", stars: 5, quote: "The Council feature is uncanny — it debates my ideas better than most colleagues." },
            { initials: "JT", name: "James T.", role: "Solo Founder", stars: 5, quote: "I went from scattered notes and tabs to one beautiful workspace in an afternoon." },
          ].map((t) => (
            <div
              key={t.initials}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                background: isDark ? "rgba(12,10,22,0.60)" : "rgba(255,255,255,0.14)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.32)",
              }}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="text-sm text-white/75 leading-relaxed flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "rgba(139,92,246,0.5)", border: "1px solid rgba(139,92,246,0.4)" }}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white/90">{t.name}</div>
                  <div className="text-[10px] text-white/40">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-4 md:px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto rounded-3xl p-10 text-center"
          style={{
            background: isDark ? "rgba(12,10,18,0.68)" : "rgba(255,255,255,0.12)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid rgba(255,255,255,0.28)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
          }}>
          <div className="text-3xl mb-4">✨</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Ready to upgrade your workflow?
          </h2>
          <p className="text-sm md:text-base text-white/55 mb-8 max-w-sm mx-auto leading-relaxed">Claim your first 50 Sparks ✨ and start consulting The Council.</p>
          <button onClick={handleCTA} className="inline-flex items-center gap-2 bg-white text-slate-800 font-bold px-10 py-4 rounded-full shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base">
            Get Started for Free <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      <footer className="relative z-10 text-center pb-10 text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>© 2025 Dashiii. Built for deep work.</footer>
    </div>
  );
};

export default LandingPage;
