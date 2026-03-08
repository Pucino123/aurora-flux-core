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
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  ArrowRight, Sparkles, CheckSquare, Calendar, Brain, LayoutGrid,
  Zap, Target, Music, BarChart3, Users, FileText, Clock, Star,
  LucideIcon, Sun, Moon, Briefcase, FolderKanban, Dumbbell,
  MessageCircle, Globe, Layers, GitBranch, HeartPulse, ChevronLeft, ChevronRight,
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

  {
    tag: "🧠 The Council",
    tagColor: "rgba(139,92,246,0.7)",
    tagBorder: "rgba(139,92,246,0.4)",
    headline: "Your personal board\nof advisors.",
    body: "Submit any idea. Four AI personas with distinct worldviews debate it — so you decide with confidence.",
    accentColor: "rgba(139,92,246,0.3)",
    visual: (
      <div className="space-y-2.5">
        {/* Persona row */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { initials: "EV", name: "Evangelist", color: "#34d399" },
            { initials: "HK", name: "Hawk", color: "#fbbf24" },
            { initials: "AO", name: "Analyst", color: "#f87171" },
            { initials: "ML", name: "Mentor", color: "#22d3ee" },
          ].map((a) => (
            <div key={a.initials} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: `${a.color}20`, border: `1.5px solid ${a.color}45`, color: a.color }}>
                {a.initials}
              </div>
              <span className="text-[8px] text-white/30">{a.name}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-300 font-medium">Debating</span>
          </div>
        </div>
        {/* Messages */}
        {[
          { who: "Skeptic", color: "#f87171", msg: "Fatal assumption — market isn't ready." },
          { who: "Optimist", color: "#34d399", msg: "Early adopters will pay a premium." },
          { who: "Pragmatist", color: "#fbbf24", msg: "Can you reach PMF in 90 days?" },
        ].map(m => (
          <div key={m.who} className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: `${m.color}20`, color: m.color }}>{m.who[0]}</div>
            <div className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white/75" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {m.msg}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: "⏱ Focus Mode",
    tagColor: "rgba(52,211,153,0.7)",
    tagBorder: "rgba(52,211,153,0.4)",
    headline: "Your space.\nYour rules.",
    body: "A fully customizable focus environment — drag widgets, pick your soundscape, and enter deep work.",
    accentColor: "rgba(52,211,153,0.25)",
    visual: (
      <div className="space-y-2.5">
        {/* Timer */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(52,211,153,0.15)", border: "2px solid rgba(52,211,153,0.4)" }}>
            <span className="text-emerald-300 font-mono font-bold text-sm">24:58</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Deep Work</div>
            <div className="text-xs text-white/45 mt-0.5">Session 2 of 4</div>
            <div className="flex items-center gap-1 mt-1.5">
              {[1,2,0,0].map((v,i) => <div key={i} className="w-5 h-1 rounded-full" style={{ background: v ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.12)" }} />)}
            </div>
          </div>
        </div>
        {/* Soundscape + widgets */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "🎵", label: "Rain + Café", sub: "Playing" },
            { icon: "✅", label: "4 / 7 done", sub: "Tasks" },
            { icon: "🌲", label: "Forest", sub: "Theme" },
          ].map(w => (
            <div key={w.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <div className="text-base mb-1">{w.icon}</div>
              <div className="text-[10px] font-semibold text-white/80 leading-tight">{w.label}</div>
              <div className="text-[9px] text-white/35">{w.sub}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "📄 Smart Docs",
    tagColor: "rgba(251,191,36,0.7)",
    tagBorder: "rgba(251,191,36,0.4)",
    headline: "Write, plan,\nand build.",
    body: "A document editor that thinks with you. Rich text, spreadsheets, AI writing — all inside one tab.",
    accentColor: "rgba(251,191,36,0.2)",
    visual: (
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(14,12,8,0.75)", border: "1px solid rgba(251,191,36,0.18)" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
          {["B", "I", "H1", "H2"].map(b => (
            <span key={b} className="text-[11px] px-1.5 py-0.5 rounded font-semibold text-white/40" style={{ background: "rgba(255,255,255,0.07)" }}>{b}</span>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[10px] text-yellow-300/60 font-medium">
            <span>✨</span> AI
          </div>
        </div>
        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="text-sm font-bold text-white/85">2025 Product Roadmap</div>
          <div className="h-2 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-2 rounded-full w-5/6" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-2 rounded-full w-4/5" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(251,191,36,0.09)", border: "1px solid rgba(251,191,36,0.22)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-yellow-300/80 font-semibold">✨ Aura suggests</span>
            </div>
            <div className="h-2 rounded-full w-full mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-2 rounded-full w-3/4" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    tag: "💼 CRM & Finance",
    tagColor: "rgba(56,189,248,0.7)",
    tagBorder: "rgba(56,189,248,0.4)",
    headline: "Run your work life\nfrom one place.",
    body: "Contacts, deals, invoices, and finances — all connected. No more spreadsheets or separate tools.",
    accentColor: "rgba(56,189,248,0.2)",
    visual: (
      <div className="space-y-3">
        {/* Pipeline */}
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Pipeline</div>
        {[
          { stage: "Lead", val: "$8k", pct: "35%", color: "rgba(148,163,184,0.55)" },
          { stage: "Proposal", val: "$31k", pct: "55%", color: "rgba(56,189,248,0.65)" },
          { stage: "Negotiation", val: "$19k", pct: "75%", color: "rgba(251,191,36,0.65)" },
          { stage: "Closed", val: "$54k", pct: "92%", color: "rgba(52,211,153,0.65)" },
        ].map(s => (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="text-xs text-white/40 w-20 shrink-0">{s.stage}</div>
            <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-1.5 rounded-full transition-all" style={{ background: s.color, width: s.pct }} />
            </div>
            <div className="text-xs font-semibold text-white/55 w-10 text-right">{s.val}</div>
          </div>
        ))}
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          {[
            { label: "Revenue MTD", val: "$24,300", up: true },
            { label: "Budget Left", val: "$1,840", up: false },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] text-white/35 mb-0.5">{s.label}</div>
              <div className="text-sm font-bold text-white">{s.val}</div>
              <div className={`text-[9px] mt-0.5 ${s.up ? "text-emerald-400" : "text-rose-400"}`}>{s.up ? "↑ 12% vs last month" : "↓ 3% remaining"}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "📅 AI Scheduler",
    tagColor: "rgba(167,139,250,0.7)",
    tagBorder: "rgba(167,139,250,0.4)",
    headline: "Let AI\nplan your day.",
    body: "Describe your tasks. Dashiii builds a realistic, energy-aware daily schedule. Syncs with Google Calendar.",
    accentColor: "rgba(167,139,250,0.2)",
    visual: (
      <div className="space-y-1.5">
        {[
          { time: "9:00", dur: "2h", title: "Deep Work Block", tag: "Focus", color: "rgba(167,139,250,0.18)", border: "rgba(167,139,250,0.3)", dot: "#a78bfa" },
          { time: "11:00", dur: "30m", title: "Team Standup", tag: "Meeting", color: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)", dot: "#38bdf8" },
          { time: "13:00", dur: "1h", title: "Lunch Break", tag: "Break", color: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", dot: "#94a3b8" },
          { time: "14:00", dur: "2h", title: "Client Proposal", tag: "Work", color: "rgba(167,139,250,0.18)", border: "rgba(167,139,250,0.3)", dot: "#a78bfa" },
          { time: "16:30", dur: "1h", title: "Workout", tag: "Health", color: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", dot: "#34d399" },
        ].map(b => (
          <div key={b.time} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: b.color, border: `1px solid ${b.border}` }}>
            <div className="w-1 h-8 rounded-full shrink-0" style={{ background: b.dot }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/85 font-medium truncate">{b.title}</div>
              <div className="text-[10px] text-white/35">{b.time} · {b.dur}</div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: `${b.dot}20`, color: b.dot }}>{b.tag}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: "💪 Fitness & Habits",
    tagColor: "rgba(52,211,153,0.7)",
    tagBorder: "rgba(52,211,153,0.4)",
    headline: "Build habits.\nTrack everything.",
    body: "Log workouts, track your mood, and watch streaks build. Your health dashboard lives right inside Dashiii.",
    accentColor: "rgba(52,211,153,0.22)",
    visual: (
      <div className="space-y-3">
        {/* Streak heatmap */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 font-semibold">Weekly Activity</span>
            <span className="text-xs text-emerald-400 font-bold">🔥 7 day streak</span>
          </div>
          <div className="flex gap-1.5">
            {[4, 6, 3, 7, 5, 6, 7].map((v, i) => (
              <div key={i} className="flex-1 rounded-md" style={{ height: 28, background: `rgba(52,211,153,${(v / 7) * 0.75 + 0.1})` }} />
            ))}
          </div>
          <div className="flex mt-1">
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <span key={i} className="text-[9px] text-white/25 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "😊", label: "Mood", val: "Great" },
            { icon: "🏃", label: "Run", val: "5.2 km" },
            { icon: "⚡", label: "Energy", val: "82%" },
          ].map(w => (
            <div key={w.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-sm mb-1">{w.icon}</div>
              <div className="text-xs font-bold text-white/80">{w.val}</div>
              <div className="text-[9px] text-white/35">{w.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const FeatureSlideshow = ({ isDark }: { isDark: boolean }) => {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const go = (next: number, direction: number) => {
    setDir(direction);
    setIdx((next + SLIDES.length) % SLIDES.length);
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => go(idx + 1, 1), 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      go(idx + (diff > 0 ? 1 : -1), diff > 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  const slide = SLIDES[idx];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Slide nav dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {SLIDES.map((s, i) => (
          <button
            key={i}
            onClick={() => { go(i, i > idx ? 1 : -1); }}
            className={`transition-all duration-300 rounded-full ${i === idx ? "w-6 h-2 bg-white/80" : "w-2 h-2 bg-white/25 hover:bg-white/45"}`}
          />
        ))}
      </div>

      {/* Main slide card */}
      <div
        className="relative rounded-3xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          background: isDark ? "rgba(14,12,22,0.72)" : "rgba(255,255,255,0.12)",
          backdropFilter: "blur(32px)",
          border: isDark ? `1.5px solid ${slide.accentColor}` : "1.5px solid rgba(255,255,255,0.22)",
          boxShadow: `0 40px 100px ${slide.accentColor}`,
        }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 70% 40%, ${slide.accentColor}, transparent 65%)` }} />

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[380px]">
          {/* Left: copy */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: dir * 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -24 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-widest"
                  style={{ background: `${slide.accentColor}`, border: `1px solid ${slide.tagBorder}`, color: "rgba(255,255,255,0.85)" }}
                >
                  {slide.tag}
                </div>
                <h2
                  className="text-3xl md:text-4xl font-bold text-white mb-4 leading-snug whitespace-pre-line"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {slide.headline.split("\n").map((line, i) => (
                    <span key={i}>
                      {i === 1 ? <em style={{ fontStyle: "italic" }}>{line}</em> : line}
                      {i < slide.headline.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </h2>
                <p className="text-sm md:text-base text-white/65 leading-relaxed max-w-xs">{slide.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: visual */}
          <div className="p-6 md:p-8 flex items-center border-t md:border-t-0 md:border-l" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: dir * 40, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: dir * -30, scale: 0.97 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                className="w-full"
              >
                {slide.visual}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Prev / Next arrows — skjult på mobil, auto-advance klarer det */}
        <button
          onClick={() => go(idx - 1, -1)}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => go(idx + 1, 1)}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Slide tag labels — ingen scrollbar, wrap på mobil */}
      <div className="flex items-center gap-2 mt-6 flex-wrap justify-center px-2">
        {SLIDES.map((s, i) => (
          <button
            key={i}
            onClick={() => go(i, i > idx ? 1 : -1)}
            className={`flex-shrink-0 text-xs px-3 py-1 rounded-full transition-all duration-200 ${i === idx ? "text-white font-semibold" : "text-white/35 hover:text-white/60"}`}
            style={i === idx ? { background: slide.accentColor, border: `1px solid ${slide.tagBorder}` } : {}}
          >
            {s.tag}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Main Landing Page ── */
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

      {/* Product Video — first thing after hero */}
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
            {/* To embed: replace the div below with:
                <iframe className="w-full h-full absolute inset-0" src="https://www.youtube.com/embed/YOUR_VIDEO_ID?rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            */}
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

      {/* Social Proof Strip */}
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
