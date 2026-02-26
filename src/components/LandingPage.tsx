import { useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, CheckSquare, Calendar, Brain, Layers, LayoutGrid, Settings2, GripVertical, X, Pin, StickyNote, Play, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import cherryBg from "@/assets/bg-cherry-blossom.jpg";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

const MOCK_WIDGETS = [
  { id: "tasks", label: "Today's Tasks", color: "bg-blue-400", items: ["Review Q3 report", "Team standup @ 10am", "Finish proposal draft", "Reply to Sarah"] },
  { id: "plan", label: "Smart Plan", color: "bg-violet-400", items: ["Morning: deep work block", "Afternoon: meetings", "Evening: gym + review", "Bedtime: journal"] },
  { id: "finance", label: "Budget Preview", color: "bg-emerald-400", items: ["Rent: $1,800", "Savings: +$400", "Groceries: $120", "Entertainment: $85"] },
];

const FEATURES = [
  { title: "Personal Dashboard", desc: "Drag, resize, and customize 12+ widgets. Build the exact productivity cockpit you want.", bullets: ["Pick only the widgets you need", "Drag to rearrange any time", "Resize to fit your workflow"] },
  { title: "AI Task Manager", desc: "Smart task prioritization that surfaces what matters most, automatically.", bullets: ["Drag between Today / In Progress / Upcoming", "AI auto-prioritizes by deadline & energy", "Undo completed tasks instantly"] },
  { title: "The Council", desc: "Five AI personas debate your ideas from every angle — before you commit.", bullets: ["Strategist, Skeptic, Advocate & more", "Real structured debate on your decisions", "Export consensus summary"] },
  { title: "Focus Mode", desc: "Full-screen distraction-free workspace with ambient music and timers.", bullets: ["Custom soundscapes & Pomodoro timer", "Floating draggable widgets", "Background themes for every mood"] },
];

/* ── Interactive Dashboard Preview ── */
const DashboardPreview = () => {
  const [removed, setRemoved] = useState<string[]>([]);
  const visible = MOCK_WIDGETS.filter(w => !removed.includes(w.id));

  return (
    <div className="rounded-3xl overflow-hidden border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.22)] bg-black/50 backdrop-blur-2xl">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.04]">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-4 bg-white/10 rounded-full px-4 py-1 text-[11px] text-white/30 text-center tracking-wide">flux.app · Dashboard</div>
        <div className="flex items-center gap-1.5 text-white/30"><Settings2 size={12} /><span className="text-[10px]">Customize</span></div>
      </div>
      <div className="flex">
        <div className="w-14 bg-white/[0.03] border-r border-white/10 flex flex-col items-center py-4 gap-3">
          {[LayoutGrid, Calendar, CheckSquare, Brain].map((Icon, i) => (
            <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${i === 0 ? "bg-white/20 text-white" : "text-white/30 hover:text-white/60 hover:bg-white/10"}`}>
              <Icon size={14} />
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <div><div className="text-white/80 text-xs font-bold mb-0.5">My Dashboard</div><div className="text-white/30 text-[10px]">Thursday, Feb 26</div></div>
            <button onClick={() => setRemoved([])} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 text-[10px] transition-all"><Pin size={9} /> Reset</button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <AnimatePresence>
              {visible.map((widget) => (
                <motion.div key={widget.id} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="group rounded-2xl bg-white/[0.06] border border-white/10 p-3 relative hover:bg-white/[0.1] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <GripVertical size={10} className="text-white/20 group-hover:text-white/50 transition-colors" />
                      <div className={`w-1.5 h-1.5 rounded-full ${widget.color}`} />
                      <span className="text-white/60 text-[10px] font-semibold">{widget.label}</span>
                    </div>
                    <button onClick={() => setRemoved(r => [...r, widget.id])}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-md bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-white/40 hover:text-red-300 transition-all">
                      <X size={8} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {widget.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-sm border border-white/20 shrink-0 ${j === 0 ? `${widget.color} border-transparent` : ""}`} />
                        <span className="text-white/50 text-[9px] truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <motion.div layout className="rounded-2xl bg-yellow-100/10 border border-yellow-200/20 p-3">
              <div className="flex items-center gap-1.5 mb-2"><StickyNote size={10} className="text-yellow-300/60" /><span className="text-yellow-200/60 text-[10px] font-semibold">Sticky Note</span></div>
              <p className="text-yellow-100/40 text-[9px] leading-relaxed">Ideas for Q2: podcast, referral campaign, product hunt launch...</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

      {/* ── Dashboard preview ── */}
      <section className="relative z-10 px-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25 }} className="max-w-4xl mx-auto">
          <div className="text-center mb-4">
            <span className="text-white/50 text-xs font-medium bg-white/10 backdrop-blur px-3 py-1 rounded-full border border-white/20">
              ↑ Hover widgets · click × to remove
            </span>
          </div>
          <DashboardPreview />
        </motion.div>
      </section>

      {/* ── "More than just tasks" feature section — like Joobie's "More than a match score" ── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
              More than just <em style={{ fontStyle: "italic" }}>tasks</em>
            </h2>
            <p className="text-white/65 text-base max-w-md mx-auto">One workspace that replaces all your productivity apps.</p>
          </motion.div>

          {/* Horizontal scroll cards — like Joobie's feature row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: i * 0.1 }}
                className="rounded-2xl p-6 border border-white/20 hover:border-white/35 transition-all group cursor-default"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
              >
                <h3 className="text-white font-bold text-base mb-3" style={{ fontFamily: "Georgia, serif" }}>{f.title}</h3>
                <p className="text-white/60 text-sm mb-4 leading-relaxed">{f.desc}</p>
                <ul className="space-y-2">
                  {f.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-white/50 text-xs">
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-white/40 shrink-0 mt-1.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
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

      {/* ── How it works ── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
              How it <em style={{ fontStyle: "italic" }}>works</em>
            </h2>
          </motion.div>
          <div className="space-y-6">
            {[
              { step: "1", title: "Build your dashboard", desc: "Choose from 12+ widgets — tasks, calendar, budget, AI council, notes. Drag to arrange, resize as you like." },
              { step: "2", title: "Let AI prioritize your day", desc: "Flux analyzes tasks, deadlines and energy to generate a perfect daily plan — auto-updated in real-time." },
              { step: "3", title: "Stay in flow, not in apps", desc: "Everything in one place. No more tab switching between Notion, Google Cal, Todoist, and spreadsheets." },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.12 }} className="flex items-start gap-5 group">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:bg-white/30 transition-all">{s.step}</div>
                <div className="flex-1 rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-all" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)" }}>
                  <h3 className="text-white font-bold text-base mb-1" style={{ fontFamily: "Georgia, serif" }}>{s.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
