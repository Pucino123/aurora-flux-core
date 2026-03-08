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
      {/* Background — dark mode: darker + desaturated like Apple */}
      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${cherryBg})`,
          y: bgY,
          filter: isDark ? "blur(22px) brightness(0.38) saturate(0.5)" : "blur(18px)",
          transform: "scale(1.08)",
        }}
      />
      {/* Dark overlay tint */}
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

      {/* ── CTA ── */}
      <section className="relative z-10 px-4 md:px-6 pb-20 md:pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
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


      {/* ── Bento Box Feature Grid ── */}
      <section className="relative z-10 px-4 md:px-6 pb-20">
        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-white text-center mb-10" style={{ fontFamily: "Georgia, serif" }}>
          Everything you need, unified.
        </motion.h2>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {/* Large: The Council */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}
            className="col-span-2 row-span-2 rounded-3xl p-7 flex flex-col justify-between overflow-hidden relative"
            style={{ background: isDark ? "rgba(20,20,30,0.65)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(24px)", border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid rgba(255,255,255,0.25)" }}>
            <div className="flex gap-3 mb-4">
              {["🔵","🟣","🔴","🟡"].map((e, i) => (
                <div key={i} className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ background: "rgba(255,255,255,0.12)" }}>{e}</div>
              ))}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Meet The Council.</h3>
              <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.75)" }}>Don't make decisions alone. Get instant, multi-perspective feedback on your ideas.</p>
            </div>
          </motion.div>
          {/* Split-View */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="col-span-2 rounded-3xl p-5 flex flex-col justify-between"
            style={{ background: isDark ? "rgba(20,20,30,0.55)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: isDark ? "1.5px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(255,255,255,0.22)" }}>
            <div className="flex gap-2 mb-3 flex-1">
              <div className="flex-1 rounded-xl bg-white/10 flex items-center justify-center text-xs text-white/60">Doc A</div>
              <div className="w-px bg-white/20" />
              <div className="flex-1 rounded-xl bg-white/10 flex items-center justify-center text-xs text-white/60">Doc B</div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">True Multitasking.</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>Drag and snap documents side-by-side in our native iPadOS-style workspace.</p>
            </div>
          </motion.div>
          {/* iOS Dashboard */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
            className="col-span-1 rounded-3xl p-5 flex flex-col justify-between"
            style={{ background: isDark ? "rgba(20,20,30,0.55)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: isDark ? "1.5px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(255,255,255,0.22)" }}>
            <div className="flex gap-1.5 justify-center mb-3">
              {[0,1,2].map(i => <div key={i} className={`rounded-full transition-all ${i === 1 ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30"}`} />)}
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Swipe & Organize.</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>Organize tools across multiple pages with keyboard navigation.</p>
            </div>
          </motion.div>
          {/* Sparks */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="col-span-1 rounded-3xl p-5 flex flex-col justify-between"
            style={{ background: isDark ? "rgba(20,20,30,0.55)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: isDark ? "1.5px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(255,255,255,0.22)" }}>
            <div className="text-3xl mb-2">✨</div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Fuel creativity.</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>Pay only for the AI you use, or bring your own key.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Security Banner ── */}
      <section className="relative z-10 px-4 md:px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-3xl px-8 py-6 flex flex-col md:flex-row items-center gap-6"
          style={{ background: isDark ? "rgba(10,10,14,0.8)" : "rgba(20,20,40,0.7)", backdropFilter: "blur(24px)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
          <div className="text-4xl shrink-0">🔒</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Enterprise-Grade Privacy.</h3>
            <p className="text-sm text-white/50 mb-3">Your data is cryptographically isolated. Not even we can read your notes.</p>
            <div className="flex flex-wrap gap-4">
              {["Row-Level Security (RLS) Database", "BYOK (Bring Your Own Key) Support", "Strict Prompt-Injection Defenses"].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className="text-green-400">✓</span> {f}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Pricing Teaser & Final CTA ── */}
      <section className="relative z-10 px-4 md:px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto rounded-3xl p-10 text-center shadow-2xl"
          style={{ background: "linear-gradient(135deg, rgba(100,60,200,0.35), rgba(60,140,240,0.35))", backdropFilter: "blur(32px)", border: "1.5px solid rgba(255,255,255,0.15)" }}>
          <div className="text-3xl mb-3">✨</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "Georgia, serif" }}>
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
