import { useState, useRef, useEffect } from "react";
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

/* ── Feature Slideshow ── */
const SLIDES = [
  {
    tag: "🧠 The Council",
    tagColor: "rgba(139,92,246,0.7)",
    tagBorder: "rgba(139,92,246,0.4)",
    headline: "Your personal board\nof advisors.",
    body: "Submit any idea. Four AI personas with distinct worldviews debate it — so you decide with confidence.",
    accentColor: "rgba(139,92,246,0.3)",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 mb-5">
          {[
            { initials: "EV", color: "#34d399" },
            { initials: "HK", color: "#fbbf24" },
            { initials: "AO", color: "#f87171" },
            { initials: "ML", color: "#22d3ee" },
          ].map((a) => (
            <div key={a.initials} className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold"
              style={{ background: `${a.color}22`, border: `1.5px solid ${a.color}50`, color: a.color }}>
              {a.initials}
            </div>
          ))}
          <span className="ml-auto text-xs text-white/30">Live debate</span>
        </div>
        {[
          { who: "🔴 Skeptic", msg: "This plan has a fatal assumption — the market isn't ready.", c: "rgba(239,68,68,0.12)", b: "rgba(239,68,68,0.22)" },
          { who: "🔵 Optimist", msg: "Early adopters will pay a premium for this exact pain point.", c: "rgba(59,130,246,0.12)", b: "rgba(59,130,246,0.22)" },
          { who: "🟡 Pragmatist", msg: "Both valid. Can you reach PMF in 90 days?", c: "rgba(234,179,8,0.12)", b: "rgba(234,179,8,0.22)" },
        ].map(m => (
          <div key={m.who} className="rounded-xl px-4 py-3" style={{ background: m.c, border: `1px solid ${m.b}` }}>
            <div className="text-xs font-semibold text-white/50 mb-1">{m.who}</div>
            <p className="text-sm text-white/80">{m.msg}</p>
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
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: "Focus Timer", sub: "25:00 Pomodoro", icon: "⏱" },
          { title: "Soundscape", sub: "☔ Rain + Café", icon: "🎵" },
          { title: "Today's Plan", sub: "4 of 7 done", icon: "✅" },
          { title: "Aura AI", sub: "Ask anything…", icon: "✨" },
        ].map(w => (
          <div key={w.title} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-2xl mb-2">{w.icon}</div>
            <div className="text-xs font-bold text-white">{w.title}</div>
            <div className="text-xs text-white/45 mt-0.5">{w.sub}</div>
          </div>
        ))}
        <div className="col-span-2 rounded-xl px-4 py-3 text-xs text-white/50" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          🌲 Forest — Deep Work Mode active
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
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(18,16,10,0.7)", border: "1px solid rgba(251,191,36,0.15)" }}>
        <div className="flex items-center gap-1.5 px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
          {["Bold","Italic","H1","H2","AI ✨"].map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded text-white/50 font-medium" style={{ background: "rgba(255,255,255,0.08)" }}>{t}</span>
          ))}
        </div>
        <div className="p-5 space-y-2.5">
          <div className="h-4 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="h-2.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div className="h-2.5 rounded-full w-5/6" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div className="mt-4 rounded-xl p-3 border" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" }}>
            <div className="text-xs text-yellow-300/70 mb-1.5 font-semibold">✨ AI Suggestion</div>
            <div className="h-2.5 rounded-full w-full mb-1" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-2.5 rounded-full w-3/4" style={{ background: "rgba(255,255,255,0.1)" }} />
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
      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Deal Pipeline</div>
        {[
          { stage: "Lead", color: "rgba(148,163,184,0.6)", w: "35%" },
          { stage: "Proposal", color: "rgba(56,189,248,0.7)", w: "55%" },
          { stage: "Negotiation", color: "rgba(251,191,36,0.7)", w: "75%" },
          { stage: "Closed Won", color: "rgba(52,211,153,0.7)", w: "90%" },
        ].map(s => (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="text-xs text-white/45 w-24 shrink-0">{s.stage}</div>
            <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-1.5 rounded-full" style={{ background: s.color, width: s.w }} />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[{ label: "Revenue MTD", val: "$24,300" }, { label: "Budget Left", val: "$1,840" }].map(s => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs text-white/35 mb-1">{s.label}</div>
              <div className="text-sm font-bold text-white">{s.val}</div>
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
      <div className="space-y-2">
        {[
          { time: "9:00", title: "Deep Work Block", color: "rgba(167,139,250,0.2)", border: "rgba(167,139,250,0.35)" },
          { time: "11:00", title: "Team Standup", color: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.3)" },
          { time: "13:00", title: "Lunch Break", color: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)" },
          { time: "14:00", title: "Client Proposal", color: "rgba(167,139,250,0.2)", border: "rgba(167,139,250,0.35)" },
          { time: "16:30", title: "Workout", color: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.3)" },
        ].map(b => (
          <div key={b.time} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: b.color, border: `1px solid ${b.border}` }}>
            <span className="text-xs text-white/35 w-10 shrink-0 font-mono">{b.time}</span>
            <span className="text-sm text-white/80">{b.title}</span>
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
          <div className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">7-day streak 🔥</div>
          <div className="flex gap-1.5">
            {[4, 6, 3, 7, 5, 6, 7].map((v, i) => (
              <div key={i} className="flex-1 rounded-md" style={{ height: 28, background: `rgba(52,211,153,${(v / 7) * 0.8 + 0.1})` }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <span key={i} className="text-[9px] text-white/25 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
        {/* Mood + workout */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-lg mb-1">😊</div>
            <div className="text-xs font-bold text-white">Mood</div>
            <div className="text-xs text-white/40 mt-0.5">Feeling great</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-lg mb-1">🏃</div>
            <div className="text-xs font-bold text-white">Run</div>
            <div className="text-xs text-white/40 mt-0.5">5.2 km today</div>
          </div>
        </div>
        {/* Energy bar */}
        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-white/60">Energy level</span>
            <span className="text-xs font-bold text-emerald-300">82%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(52,211,153,0.8)", width: "82%" }} />
          </div>
        </div>
      </div>
    ),
  },
];

const FeatureSlideshow = ({ isDark }: { isDark: boolean }) => {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        {/* Prev / Next arrows */}
        <button
          onClick={() => go(idx - 1, -1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => go(idx + 1, 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Slide tag labels — horizontal scroll on mobile */}
      <div className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar px-2 pb-1 justify-start md:justify-center">
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
          filter: isDark ? "blur(8px) brightness(0.6) saturate(1.1)" : "blur(6px) brightness(1.0) saturate(1.1)",
          transform: "scale(1.06)",
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-700"
        style={{ background: isDark ? "rgba(6,4,12,0.42)" : "rgba(255,255,255,0.05)" }} />

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
      <section className="relative z-10 flex flex-col items-center text-center pt-10 md:pt-16 pb-16 md:pb-24 px-5">
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

      {/* Feature Slideshow */}
      <section className="relative z-10 px-4 md:px-8 pb-24 md:pb-32">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <FeatureSlideshow isDark={isDark} />
        </motion.div>
      </section>

      {/* Product Video Section */}
      <section className="relative z-10 px-4 md:px-8 pb-20 md:pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
              See it in <em style={{ fontStyle: "italic" }}>action</em>
            </h2>
            <p className="text-sm text-white/50">Watch how Dashiii adapts to the way you work.</p>
          </div>
          <div
            className="relative rounded-3xl overflow-hidden aspect-video flex items-center justify-center"
            style={{
              background: isDark ? "rgba(12,10,20,0.70)" : "rgba(255,255,255,0.12)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid rgba(255,255,255,0.28)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.3)",
            }}
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(167,139,250,0.18), transparent 70%)" }} />
            {/* Play button placeholder */}
            <div className="flex flex-col items-center gap-4 relative z-10">
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
