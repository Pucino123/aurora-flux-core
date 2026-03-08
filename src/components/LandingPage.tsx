import { useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { ArrowRight, Sparkles, CheckSquare, Calendar, Brain, LayoutGrid, Play, Upload, Zap, Target, Music, BarChart3, Users, FileText, Clock, Star, LucideIcon, Sun, Moon, Briefcase, FolderKanban, Dumbbell, MessageCircle, Globe, Layers, GitBranch, HeartPulse } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import cherryBg from "@/assets/bg-cherry-blossom.jpg";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

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

/* ── Marquee Pill ── */
const MarqueePill = ({ icon: Icon, title, isDark }: { icon: LucideIcon; title: string; isDark: boolean }) => (
  <div
    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full transition-colors cursor-default"
    style={{
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.18)",
      border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.35)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    }}
  >
    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shrink-0"
      style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.30)" }}>
      <Icon size={11} className="text-white" />
    </div>
    <span className="text-white font-medium text-xs md:text-sm whitespace-nowrap">{title}</span>
  </div>
);

/* ── Marquee Banner ── */
const FeatureMarquee = ({ isDark }: { isDark: boolean }) => (
  <div className="py-2 space-y-3 select-none">
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-[marquee_55s_linear_infinite]">
        {[...FEATURES_ROW1, ...FEATURES_ROW1].map((f, i) => (
          <MarqueePill key={i} icon={f.icon} title={f.title} isDark={isDark} />
        ))}
      </div>
    </div>
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-[marquee-reverse_55s_linear_infinite]">
        {[...FEATURES_ROW2, ...FEATURES_ROW2].map((f, i) => (
          <MarqueePill key={i} icon={f.icon} title={f.title} isDark={isDark} />
        ))}
      </div>
    </div>
  </div>
);

/* ── Video Section ── */
const VideoSection = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoUrl(URL.createObjectURL(file));
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="rounded-3xl overflow-hidden border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.28)] bg-black/50 backdrop-blur-2xl relative">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.04]">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-4 bg-white/10 rounded-full px-4 py-1 text-[11px] text-white/30 text-center">dashiii.app · Overview</div>
      </div>
      <div className="relative aspect-video bg-black/40">
        {videoUrl ? (
          <>
            <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" onEnded={() => setPlaying(false)} />
            <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center group">
              <AnimatePresence>
                {!playing && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-2xl group-hover:bg-white/30 transition-all">
                    <Play size={30} className="text-white ml-1" fill="white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0 opacity-20 grid grid-cols-3 gap-3 p-6 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/10 border border-white/10" />
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => inputRef.current?.click()}
              className="relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Upload size={22} className="text-white/70" />
              </div>
              <div className="text-center">
                <p className="text-white/80 font-semibold text-sm mb-1">Upload your intro video</p>
                <p className="text-white/40 text-xs">MP4, MOV, WebM — drag or click</p>
              </div>
            </motion.button>
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
          </div>
        )}
      </div>
    </div>
  );
};

const LandingPage = ({ onEnter }: LandingPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const bgY = useTransform(scrollY, [0, 800], [0, 120]);

  const isDark = theme === "dark";

  const handleCTA = () => {
    if (user) onEnter("");
    else navigate("/auth");
  };

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-x-hidden overflow-y-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Background */}
      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${cherryBg})`,
          y: bgY,
          filter: isDark ? "blur(22px) brightness(0.38) saturate(0.5)" : "blur(18px)",
          transform: "scale(1.08)",
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-700"
        style={{ background: isDark ? "rgba(10,10,14,0.55)" : "rgba(255,255,255,0.08)" }} />

      {/* ── Navbar ── */}
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

      {/* ── Hero ── */}
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
            Drag widgets, build your dashboard, let AI handle the rest. Dashiii is the personalizable workspace for focused people.
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

      {/* ── Intro video section ── */}
      <section className="relative z-10 px-4 md:px-6 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
              See it in <em style={{ fontStyle: "italic" }}>action</em>
            </h2>
            <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.60)" }}>Upload your own intro video or walkthrough.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}>
            <VideoSection />
          </motion.div>
        </div>
      </section>

      {/* ── "More than just tasks" marquee banner ── */}
      <section className="relative z-10 pb-16 md:pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-8 md:mb-10 px-5">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
            More than just <em style={{ fontStyle: "italic" }}>tasks</em>
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.65)" }}>
            One workspace that replaces all your productivity apps.
          </p>
        </motion.div>
        <FeatureMarquee isDark={isDark} />
      </section>

      {/* ── Mid CTA ── */}
      <section className="relative z-10 px-4 md:px-6 pb-20 md:pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center rounded-3xl p-8 md:p-14 shadow-2xl transition-all duration-500"
          style={{
            background: isDark ? "rgba(28,28,32,0.70)" : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid rgba(255,255,255,0.25)",
          }}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Ready to get into<br /><em style={{ fontStyle: "italic" }}>flow?</em>
          </h2>
          <p className="mb-8 text-base" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.65)" }}>
            Join thousands replacing 5 apps with one workspace.
          </p>
          <button onClick={handleCTA} className="flex items-center gap-2 mx-auto bg-white text-slate-800 font-bold px-10 py-4 rounded-full shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base">
            Start for free <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      {/* ── Feature Section 1: The Council ── */}
      <section className="relative z-10 px-4 md:px-8 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center min-h-[500px]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
              style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)", color: "rgba(200,180,255,0.9)" }}>
              🧠 The Council
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Your personal board<br />of <em>advisors.</em>
            </h2>
            <p className="text-base text-white/65 mb-8 leading-relaxed max-w-md">
              Submit any idea, decision, or dilemma. Six AI personas with distinct worldviews debate it from every angle — so you can decide with full confidence.
            </p>
            <ul className="space-y-3">
              {[
                { icon: "🔵", label: "The Optimist", desc: "Finds hidden opportunity in every scenario" },
                { icon: "🔴", label: "The Devil's Advocate", desc: "Challenges assumptions and stress-tests your plan" },
                { icon: "🟡", label: "The Pragmatist", desc: "Cuts through theory with real-world execution steps" },
                { icon: "🟣", label: "The Visionary", desc: "Connects dots across industries and disciplines" },
              ].map(p => (
                <li key={p.label} className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">{p.icon}</span>
                  <span className="text-white/75 text-sm"><span className="text-white font-semibold">{p.label}:</span> {p.desc}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}>
            <div className="rounded-3xl p-6 space-y-3" style={{ background: isDark ? "rgba(18,14,30,0.75)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", border: isDark ? "1.5px solid rgba(139,92,246,0.2)" : "1.5px solid rgba(255,255,255,0.25)" }}>
              <div className="flex items-center gap-3 mb-4">
                {["🔵","🟣","🔴","🟡"].map((e,i) => (
                  <div key={i} className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}>{e}</div>
                ))}
                <span className="ml-auto text-xs text-white/40">Live debate</span>
              </div>
              {[
                { persona: "🔴 Skeptic", color: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.25)", msg: "This plan has a fatal assumption — the market isn't ready. Here's why..." },
                { persona: "🔵 Optimist", color: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.25)", msg: "I disagree. Early adopters will pay a premium for exactly this pain point." },
                { persona: "🟡 Pragmatist", color: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.25)", msg: "Both valid. The real question is: can you reach PMF in 90 days?" },
              ].map(m => (
                <div key={m.persona} className="rounded-2xl px-4 py-3" style={{ background: m.color, border: `1px solid ${m.border}` }}>
                  <div className="text-xs font-semibold text-white/60 mb-1">{m.persona}</div>
                  <p className="text-sm text-white/80 leading-relaxed">{m.msg}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature Section 2: Focus Mode ── */}
      <section className="relative z-10 px-4 md:px-8 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center min-h-[500px]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <div className="rounded-3xl p-5 relative" style={{ background: isDark ? "rgba(14,20,18,0.8)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", border: isDark ? "1.5px solid rgba(52,211,153,0.2)" : "1.5px solid rgba(255,255,255,0.25)", minHeight: 320 }}>
              <div className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse at 30% 60%, rgba(52,211,153,0.18) 0%, transparent 70%)" }} />
              <div className="grid grid-cols-2 gap-3 relative z-10">
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
              </div>
              <div className="mt-3 rounded-2xl px-4 py-3 text-xs text-white/50 relative z-10" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                🌲 Forest — Deep Work Mode active
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }} className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
              style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "rgba(134,239,172,0.9)" }}>
              ⏱ Focus Mode
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Your space.<br /><em>Your rules.</em>
            </h2>
            <p className="text-base text-white/65 mb-8 leading-relaxed max-w-md">
              A fully customizable focus environment that adapts to how you work — not the other way around. Drag, drop, and arrange your perfect workflow.
            </p>
            <ul className="space-y-3">
              {[
                "Drag-and-drop widgets onto a freeform canvas",
                "40+ ambient soundscapes: rain, café, forest, fireplace",
                "Pomodoro & custom focus timers with session stats",
                "Beautiful backgrounds that shift your mental state",
                "Sticky notes, scratchpad & today's plan at a glance",
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="text-green-400 shrink-0 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Feature Section 3: Smart Docs ── */}
      <section className="relative z-10 px-4 md:px-8 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center min-h-[500px]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "rgba(253,224,71,0.9)" }}>
              📄 Smart Docs
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Write, plan,<br />and <em>build.</em>
            </h2>
            <p className="text-base text-white/65 mb-8 leading-relaxed max-w-md">
              A document editor that thinks with you. From a blank page to a structured report — all inside your workspace, no switching tabs.
            </p>
            <ul className="space-y-3">
              {[
                "Rich text with headings, tables, toggles, and embeds",
                "Spreadsheet mode with formula engine built in",
                "AI writing tools: summarize, expand, rewrite, translate",
                "Drawing canvas for diagrams and visual planning",
                "Organize everything into folders and sub-folders",
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="text-yellow-300 shrink-0 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}>
            <div className="rounded-3xl overflow-hidden" style={{ background: isDark ? "rgba(18,16,10,0.8)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", border: isDark ? "1.5px solid rgba(251,191,36,0.2)" : "1.5px solid rgba(255,255,255,0.25)" }}>
              <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                {["Bold","Italic","H1","H2","Table","AI ✨"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md text-white/60 font-medium" style={{ background: "rgba(255,255,255,0.08)" }}>{t}</span>
                ))}
              </div>
              <div className="p-6 space-y-3">
                <div className="h-5 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.15)" }} />
                <div className="h-3 rounded-full w-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                <div className="h-3 rounded-full w-5/6" style={{ background: "rgba(255,255,255,0.07)" }} />
                <div className="h-3 rounded-full w-4/5" style={{ background: "rgba(255,255,255,0.07)" }} />
                <div className="mt-4 rounded-2xl p-3 border" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" }}>
                  <div className="text-xs text-yellow-300/70 mb-2 font-semibold">✨ AI Suggestion</div>
                  <div className="h-3 rounded-full w-full mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <div className="h-3 rounded-full w-3/4" style={{ background: "rgba(255,255,255,0.1)" }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {["=SUM(A1:A10)","=AVG(...)","=IF(...)"].map(f => (
                    <div key={f} className="rounded-xl px-2 py-2 text-center text-xs text-white/50 font-mono" style={{ background: "rgba(255,255,255,0.05)" }}>{f}</div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature Section 4: CRM & Finance ── */}
      <section className="relative z-10 px-4 md:px-8 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center min-h-[500px]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <div className="rounded-3xl p-5 space-y-3" style={{ background: isDark ? "rgba(10,18,22,0.8)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", border: isDark ? "1.5px solid rgba(56,189,248,0.2)" : "1.5px solid rgba(255,255,255,0.25)" }}>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Deal Pipeline</div>
              {[
                { stage: "Lead", count: 8, color: "rgba(148,163,184,0.6)", w: "35%" },
                { stage: "Proposal", count: 4, color: "rgba(56,189,248,0.7)", w: "55%" },
                { stage: "Negotiation", count: 2, color: "rgba(251,191,36,0.7)", w: "75%" },
                { stage: "Closed Won", count: 6, color: "rgba(52,211,153,0.7)", w: "90%" },
              ].map(s => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="text-xs text-white/50 w-24 shrink-0">{s.stage}</div>
                  <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-2 rounded-full" style={{ background: s.color, width: s.w }} />
                  </div>
                  <div className="text-xs text-white/40 w-4 text-right">{s.count}</div>
                </div>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Revenue MTD", val: "$24,300" },
                  { label: "Savings Goal", val: "68%" },
                  { label: "Invoices Out", val: "3 pending" },
                  { label: "Budget Left", val: "$1,840" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-xs text-white/40 mb-1">{s.label}</div>
                    <div className="text-sm font-bold text-white">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }} className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
              style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", color: "rgba(125,211,252,0.9)" }}>
              💼 CRM & Finance
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Run your work life<br />from <em>one dashboard.</em>
            </h2>
            <p className="text-base text-white/65 mb-8 leading-relaxed max-w-md">
              Stop juggling spreadsheets and separate CRM tools. Dashiii brings your contacts, deals, invoices, and finances into one intelligent workspace.
            </p>
            <ul className="space-y-3">
              {[
                "Full CRM: contacts, companies, and deal pipeline",
                "Drag deals across stages with Kanban-style board",
                "Generate and track invoices in seconds",
                "Budget tracker with monthly spending breakdown",
                "Savings goals with visual progress rings",
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="text-sky-300 shrink-0 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Feature Section 5: AI Scheduler ── */}
      <section className="relative z-10 px-4 md:px-8 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center min-h-[500px]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "rgba(196,181,253,0.9)" }}>
              📅 AI Scheduler
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Let AI<br /><em>plan your day.</em>
            </h2>
            <p className="text-base text-white/65 mb-8 leading-relaxed max-w-md">
              Describe your tasks and deadlines, and Dashiii builds you a realistic, energy-aware schedule. Syncs with your Google Calendar in real time.
            </p>
            <ul className="space-y-3">
              {[
                "AI generates a full daily schedule from your task list",
                "Two-way Google Calendar sync — always in harmony",
                "Time-blocking with drag-to-reschedule",
                "Energy-aware scheduling: hard tasks when you're sharp",
                "Weekly review with focus stats and streaks",
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="text-violet-300 shrink-0 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}>
            <div className="rounded-3xl p-5" style={{ background: isDark ? "rgba(14,10,22,0.8)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", border: isDark ? "1.5px solid rgba(167,139,250,0.2)" : "1.5px solid rgba(255,255,255,0.25)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-white">Today</span>
                <span className="text-xs text-white/40">Mon — Sun</span>
              </div>
              <div className="space-y-2">
                {[
                  { time: "9:00", title: "Deep Work Block", tag: "AI", color: "rgba(167,139,250,0.25)", border: "rgba(167,139,250,0.4)" },
                  { time: "11:00", title: "Team Standup", tag: "Cal", color: "rgba(56,189,248,0.2)", border: "rgba(56,189,248,0.35)" },
                  { time: "13:00", title: "Lunch + Break", tag: "", color: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" },
                  { time: "14:00", title: "Client Proposal", tag: "AI", color: "rgba(167,139,250,0.25)", border: "rgba(167,139,250,0.4)" },
                  { time: "16:30", title: "Workout", tag: "Habit", color: "rgba(52,211,153,0.2)", border: "rgba(52,211,153,0.35)" },
                ].map(b => (
                  <div key={b.time} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: b.color, border: `1px solid ${b.border}` }}>
                    <span className="text-xs text-white/40 w-10 shrink-0 font-mono">{b.time}</span>
                    <span className="text-sm text-white/85 flex-1">{b.title}</span>
                    {b.tag && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>{b.tag}</span>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature Section 6: Fitness & Habits ── */}
      <section className="relative z-10 px-4 md:px-8 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center min-h-[500px]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <div className="rounded-3xl p-5 space-y-4" style={{ background: isDark ? "rgba(10,18,14,0.8)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(28px)", border: isDark ? "1.5px solid rgba(52,211,153,0.2)" : "1.5px solid rgba(255,255,255,0.25)" }}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Streak", val: "14d 🔥" },
                  { label: "Mood", val: "😊 Great" },
                  { label: "Energy", val: "8/10 ⚡" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <div className="text-xs text-white/40 mb-1">{s.label}</div>
                    <div className="text-sm font-bold text-white">{s.val}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs text-white/35 mb-2 uppercase tracking-wider">Activity Heatmap</div>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                  {[0.08,0.18,0.55,0.08,0.75,0.35,0.9,0.18,0.55,0.08,0.35,0.75,0.18,0.55,
                    0.9,0.35,0.08,0.55,0.75,0.18,0.35,0.9,0.08,0.55,0.35,0.18,0.75,0.08,
                    0.55,0.9,0.18,0.35,0.08,0.75,0.55,0.18,0.9,0.35,0.08,0.55,0.75,0.18,
                    0.35,0.9,0.08,0.55,0.18,0.35,0.75,0.08,0.55,0.9,0.18,0.35,0.08,0.75].map((op, i) => (
                    <div key={i} className="aspect-square rounded-sm" style={{ background: `rgba(52,211,153,${op})` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Morning Run", detail: "5.2 km · 28 min", icon: "🏃" },
                  { name: "Push-up Challenge", detail: "Day 14/30", icon: "💪" },
                ].map(w => (
                  <div key={w.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-lg">{w.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-white/85">{w.name}</div>
                      <div className="text-xs text-white/40">{w.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }} className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
              style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "rgba(110,231,183,0.9)" }}>
              💪 Fitness & Habits
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Track what<br /><em>matters most.</em>
            </h2>
            <p className="text-base text-white/65 mb-8 leading-relaxed max-w-md">
              Your wellbeing isn't separate from your productivity — it's the foundation. Log workouts, moods, and habits alongside your work, all in one place.
            </p>
            <ul className="space-y-3">
              {[
                "Workout logger with activity type, duration, and energy",
                "Daily mood journal with emoji reactions and notes",
                "Streak heatmap to visualize your consistency",
                "Custom habits with target frequencies and reminders",
                "Fitness stats integrated into your weekly focus report",
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="text-emerald-400 shrink-0 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Security Banner ── */}
      <section className="relative z-10 px-4 md:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-3xl px-8 md:px-14 py-10 flex flex-col md:flex-row items-center gap-8"
          style={{ background: isDark ? "rgba(10,10,14,0.85)" : "rgba(20,20,40,0.75)", backdropFilter: "blur(28px)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
          <div className="text-5xl shrink-0">🔒</div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">Enterprise-Grade Privacy.</h3>
            <p className="text-sm text-white/50 mb-4 max-w-xl">Your data is cryptographically isolated per user. Not even we can read your notes. Designed from day one for people who take privacy seriously.</p>
            <div className="flex flex-wrap gap-5">
              {["Row-Level Security (RLS) Database", "BYOK (Bring Your Own Key) Support", "Strict Prompt-Injection Defenses"].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-sm text-white/70">
                  <span className="text-green-400">✓</span> {f}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 px-4 md:px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto rounded-3xl p-10 text-center shadow-2xl"
          style={{ background: "linear-gradient(135deg, rgba(100,60,200,0.35), rgba(60,140,240,0.35))", backdropFilter: "blur(32px)", border: "1.5px solid rgba(255,255,255,0.15)" }}>
          <div className="text-3xl mb-3">✨</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Ready to upgrade your workflow?
          </h2>
          <p className="text-base text-white/70 mb-8">Claim your first 50 Sparks ✨ today and start consulting The Council.</p>
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
