import { useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, CheckSquare, Calendar, Brain, LayoutGrid, Play, Upload, Zap, Target, Music, BarChart3, Users, FileText, Clock, Star, LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import cherryBg from "@/assets/bg-cherry-blossom.jpg";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

const FEATURES_ROW1 = [
  { icon: LayoutGrid, title: "Personal Dashboard", desc: "12+ draggable widgets, fully yours" },
  { icon: CheckSquare, title: "AI Task Manager", desc: "Smart prioritization by energy & deadline" },
  { icon: Brain, title: "The Council", desc: "5 AI personas debate your decisions" },
  { icon: Target, title: "Focus Mode", desc: "Deep work with timers & ambient sounds" },
  { icon: Calendar, title: "Smart Calendar", desc: "AI-scheduled time blocks, auto-adjusted" },
  { icon: BarChart3, title: "Finance Tracker", desc: "Budget, savings & spending insights" },
  { icon: Music, title: "Soundscapes", desc: "Rain, café, fire — set the mood" },
  { icon: Zap, title: "Quick Capture", desc: "Dump ideas instantly, sort them later" },
];

const FEATURES_ROW2 = [
  { icon: FileText, title: "Documents", desc: "Rich notes with AI writing tools" },
  { icon: Users, title: "Team Chat", desc: "Collaborate in real-time with your team" },
  { icon: Star, title: "Goals", desc: "Track milestones with visual progress rings" },
  { icon: Clock, title: "Routines", desc: "Build daily habits that actually stick" },
  { icon: Brain, title: "Neural View", desc: "Visual mind map of all your ideas" },
  { icon: BarChart3, title: "Analytics", desc: "See patterns in how you work" },
  { icon: Target, title: "Kanban Board", desc: "Drag cards across custom project stages" },
  { icon: Zap, title: "AI Scheduler", desc: "Turn your task list into a perfect day" },
];

/* ── Marquee Pill (Joobie-style) ── */
const MarqueePill = ({ icon: Icon, title }: { icon: LucideIcon; title: string }) => (
  <div
    className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-white/25 hover:border-white/50 transition-colors cursor-default"
    style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
  >
    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
      <Icon size={13} className="text-white" />
    </div>
    <span className="text-white font-medium text-sm whitespace-nowrap">{title}</span>
  </div>
);

/* ── Marquee Banner ── */
const FeatureMarquee = () => (
  <div className="py-2 space-y-3 select-none">
    {/* Row 1: scrolls left */}
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-[marquee_32s_linear_infinite]">
        {[...FEATURES_ROW1, ...FEATURES_ROW1].map((f, i) => (
          <MarqueePill key={i} icon={f.icon} title={f.title} />
        ))}
      </div>
    </div>
    {/* Row 2: scrolls right */}
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-[marquee-reverse_32s_linear_infinite]">
        {[...FEATURES_ROW2, ...FEATURES_ROW2].map((f, i) => (
          <MarqueePill key={i} icon={f.icon} title={f.title} />
        ))}
      </div>
    </div>
  </div>
);

/* ── Video Upload Section ── */
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
    <div className="rounded-3xl overflow-hidden border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.22)] bg-black/50 backdrop-blur-2xl relative">
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.04]">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-4 bg-white/10 rounded-full px-4 py-1 text-[11px] text-white/30 text-center">flux.app · Overview</div>
      </div>

      <div className="relative aspect-video bg-black/40">
        {videoUrl ? (
          <>
            <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" onEnded={() => setPlaying(false)} />
            <button onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group">
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
          /* Upload placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            {/* Fake app screenshot mockup behind */}
            <div className="absolute inset-0 opacity-20 grid grid-cols-3 gap-3 p-6 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/10 border border-white/10" />
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => inputRef.current?.click()}
              className="relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all group cursor-pointer"
            >
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const bgY = useTransform(scrollY, [0, 800], [0, 120]);

  const handleCTA = () => {
    if (user) onEnter("");
    else navigate("/auth");
  };

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-x-hidden overflow-y-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* ── Blurred parallax cherry blossom background (exactly like Joobie) ── */}
      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cherryBg})`, y: bgY, filter: "blur(18px)", transform: "scale(1.08)" }}
      />
      {/* Soft overlay to make text pop */}
      <div className="fixed inset-0 z-0 bg-white/10 pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="relative z-20 flex items-center justify-between px-8 md:px-16 py-5">
        <span className="text-2xl font-bold text-white drop-shadow-lg tracking-tight" style={{ fontFamily: "Georgia, serif" }}>Flux</span>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/auth")} className="text-white/80 hover:text-white text-sm font-medium transition-colors drop-shadow">Sign in</button>
          <button onClick={handleCTA} className="flex items-center gap-1.5 bg-white text-slate-800 text-sm font-bold px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
            Get started <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center pt-16 pb-24 px-6">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-md border border-white/50 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-10 shadow-sm">
            <Sparkles size={11} className="text-yellow-200" /> The workspace that shapes itself around you
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-bold text-white leading-[1.0] mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 4px 30px rgba(0,40,100,0.25), 0 1px 0 rgba(255,255,255,0.15)" }}>
            Your workspace,
          </h1>
          <h1 className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-bold text-white leading-[1.0] mb-8"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", textShadow: "0 4px 30px rgba(0,40,100,0.25), 0 1px 0 rgba(255,255,255,0.15)" }}>
            fully yours.
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-lg mx-auto mb-10 leading-relaxed drop-shadow font-sans">
            Drag widgets, build your dashboard, let AI handle the rest. Flux is the personalizable OS for focused people.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={handleCTA} className="flex items-center gap-2 bg-white text-slate-800 font-bold px-9 py-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base">
              Start for free <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate("/auth")} className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/30 transition-all text-base">
              Sign in
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Intro video section ── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
              See it in <em style={{ fontStyle: "italic" }}>action</em>
            </h2>
            <p className="text-white/60 text-sm">Upload your own intro video or walkthrough.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}>
            <VideoSection />
          </motion.div>
        </div>
      </section>

      {/* ── "More than just tasks" marquee banner ── */}
      <section className="relative z-10 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-10 px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
            More than just <em style={{ fontStyle: "italic" }}>tasks</em>
          </h2>
          <p className="text-white/65 text-base max-w-md mx-auto">One workspace that replaces all your productivity apps.</p>
        </motion.div>
        <FeatureMarquee />
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center rounded-3xl p-14 shadow-2xl border border-white/25"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)" }}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Ready to get into<br /><em style={{ fontStyle: "italic" }}>flow?</em>
          </h2>
          <p className="text-white/65 mb-8 text-base">Join thousands replacing 5 apps with one workspace.</p>
          <button onClick={handleCTA} className="flex items-center gap-2 mx-auto bg-white text-slate-800 font-bold px-10 py-4 rounded-full shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base">
            Start for free <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      <footer className="relative z-10 text-center pb-10 text-white/35 text-xs">© 2025 Flux. Built for deep work.</footer>
    </div>
  );
};

export default LandingPage;
