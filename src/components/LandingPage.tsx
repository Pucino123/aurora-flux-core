import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, CheckSquare, Calendar, Brain, Layers, LayoutGrid, Settings2, GripVertical, X, Pin, StickyNote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import skyBg from "@/assets/bg-joobie-sky.jpg";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

/* ── Widget mock data ── */
const MOCK_WIDGETS = [
  { id: "tasks", label: "Today's Tasks", color: "bg-blue-400", items: ["Review Q3 report", "Team standup @ 10am", "Finish proposal draft", "Reply to Sarah"] },
  { id: "plan", label: "Smart Plan", color: "bg-violet-400", items: ["Morning: deep work block", "Afternoon: meetings", "Evening: gym + review", "Bedtime: journal"] },
  { id: "finance", label: "Budget Preview", color: "bg-emerald-400", items: ["Rent: $1,800", "Savings: +$400", "Groceries: $120", "Entertainment: $85"] },
];

const FEATURES = [
  { icon: LayoutGrid, title: "Personal Dashboard", desc: "Drag, resize, and customize 12+ widgets. Build the exact productivity cockpit you want — nothing forced, everything earned." },
  { icon: Calendar, title: "AI Calendar", desc: "Flux auto-schedules your tasks, blocks deep work, and adapts instantly when plans change." },
  { icon: CheckSquare, title: "Smart Task Manager", desc: "AI-prioritized task lists that surface what matters. Drag across Today, In Progress, and Upcoming." },
  { icon: Brain, title: "The Council", desc: "Five AI personas — Strategist, Skeptic, Advocate, Analyst, Visionary — debate your ideas from every angle." },
  { icon: Layers, title: "Tool Ecosystem", desc: "20+ modular tools: timers, notes, budgets, fitness logs. Your workspace, your rules." },
  { icon: Sparkles, title: "AI Sync", desc: "Today's Plan widget auto-syncs with your calendar and tasks via AI for a live daily briefing." },
];

/* ── Animated dashboard preview ── */
const DashboardPreview = () => {
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);

  const visible = MOCK_WIDGETS.filter(w => !removed.includes(w.id));

  return (
    <div className="rounded-3xl overflow-hidden border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.22)] bg-black/50 backdrop-blur-2xl">
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.04]">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-4 bg-white/10 rounded-full px-4 py-1 text-[11px] text-white/30 text-center tracking-wide">flux.app · Dashboard</div>
        <div className="flex items-center gap-1.5 text-white/30">
          <Settings2 size={12} />
          <span className="text-[10px]">Customize</span>
        </div>
      </div>

      {/* Sidebar + main */}
      <div className="flex">
        {/* Mini sidebar */}
        <div className="w-14 bg-white/[0.03] border-r border-white/10 flex flex-col items-center py-4 gap-3">
          {[LayoutGrid, Calendar, CheckSquare, Brain].map((Icon, i) => (
            <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${i === 0 ? "bg-white/20 text-white" : "text-white/30 hover:text-white/60 hover:bg-white/10"}`}>
              <Icon size={14} />
            </div>
          ))}
        </div>

        {/* Dashboard grid */}
        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white/80 text-xs font-bold mb-0.5">My Dashboard</div>
              <div className="text-white/30 text-[10px]">Thursday, Feb 26</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const next = removed[0];
                  if (next) { setRemoved(r => r.filter(x => x !== next)); }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 text-[10px] transition-all"
              >
                <Pin size={9} /> Add widget
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <AnimatePresence>
              {visible.map((widget) => (
                <motion.div
                  key={widget.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="group rounded-2xl bg-white/[0.06] border border-white/10 p-3 relative cursor-pointer hover:bg-white/[0.1] transition-all"
                  onMouseEnter={() => setActiveWidget(widget.id)}
                  onMouseLeave={() => setActiveWidget(null)}
                >
                  {/* Drag handle + X */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <GripVertical size={10} className="text-white/20 group-hover:text-white/50 transition-colors cursor-grab" />
                      <div className={`w-1.5 h-1.5 rounded-full ${widget.color}`} />
                      <span className="text-white/60 text-[10px] font-semibold">{widget.label}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRemoved(r => [...r, widget.id]); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-md bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-white/40 hover:text-red-300"
                    >
                      <X size={8} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {widget.items.map((item, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: j * 0.05 }}
                        className="flex items-center gap-1.5"
                      >
                        <div className={`w-2.5 h-2.5 rounded-sm border border-white/20 shrink-0 ${j === 0 ? `${widget.color} border-transparent` : ""}`} />
                        <span className="text-white/50 text-[9px] truncate">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Sticky note mock */}
            <motion.div layout className="rounded-2xl bg-yellow-100/10 border border-yellow-200/20 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <StickyNote size={10} className="text-yellow-300/60" />
                <span className="text-yellow-200/60 text-[10px] font-semibold">Sticky Note</span>
              </div>
              <p className="text-yellow-100/40 text-[9px] leading-relaxed">Ideas for Q2 launch: podcast, referral campaign, product hunt...</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Scroll slider like Joobie "Before/After" ── */
const BeforeAfterSlider = () => {
  const [drag, setDrag] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!dragging.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setDrag(pct);
  };

  return (
    <div
      ref={ref}
      className="relative h-64 rounded-2xl overflow-hidden border border-white/20 cursor-ew-resize select-none"
      onMouseDown={() => { dragging.current = true; }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onMouseMove={e => handleMove(e.clientX)}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
    >
      {/* Before — messy old dashboard */}
      <div className="absolute inset-0 bg-gray-100 flex flex-col p-4">
        <div className="text-xs font-bold text-gray-500 mb-3">Before Flux</div>
        <div className="space-y-2">
          {["Notion tab", "Google Calendar", "Todoist", "Spreadsheet budget", "Spotify"].map((app, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 shadow-sm border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-[10px] text-gray-600">{app}</span>
              <span className="ml-auto text-[9px] text-gray-300">open tab</span>
            </div>
          ))}
        </div>
      </div>

      {/* After — Flux dashboard */}
      <div
        className="absolute inset-0 bg-slate-900 flex flex-col p-4 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - drag}% 0 0)` }}
      >
        <div className="text-xs font-bold text-white/60 mb-3">After Flux</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Tasks", color: "bg-blue-500", items: 4 },
            { label: "Calendar", color: "bg-violet-500", items: 3 },
            { label: "Budget", color: "bg-emerald-500", items: 2 },
            { label: "Council", color: "bg-pink-500", items: 5 },
          ].map((w, i) => (
            <div key={i} className="bg-white/[0.07] rounded-xl p-2.5 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${w.color}`} />
                <span className="text-white/60 text-[9px] font-semibold">{w.label}</span>
              </div>
              {Array.from({ length: w.items }).map((_, j) => (
                <div key={j} className={`h-1 rounded-full bg-white/${[20, 15, 10, 8][j % 4]} mb-1 w-${["full", "4/5", "3/5", "2/3"][j % 4]}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Drag handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${drag}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L2 7L5 11M9 3L12 7L9 11" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-3 left-3 text-[9px] text-gray-400 font-medium bg-white/80 px-2 py-0.5 rounded-full">Before</div>
      <div className="absolute bottom-3 right-3 text-[9px] text-white/60 font-medium bg-black/40 px-2 py-0.5 rounded-full">After</div>
    </div>
  );
};

const LandingPage = ({ onEnter }: LandingPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const bgY = useTransform(scrollY, [0, 600], [0, 80]);

  const handleCTA = () => {
    if (user) onEnter("");
    else navigate("/auth");
  };

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-x-hidden overflow-y-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Parallax sky background */}
      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: `url(${skyBg})`, y: bgY }}
      />
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-sky-200/10 via-transparent to-sky-400/20 pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="relative z-20 flex items-center justify-between px-8 md:px-16 py-5">
        <span className="text-2xl font-bold text-white drop-shadow-lg tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          Flux
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/auth")} className="text-white/80 hover:text-white text-sm font-medium transition-colors drop-shadow">
            Sign in
          </button>
          <button
            onClick={handleCTA}
            className="flex items-center gap-1.5 bg-white text-slate-800 text-sm font-bold px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get started <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center pt-16 pb-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-md border border-white/50 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-10 shadow-sm">
            <Sparkles size={11} className="text-yellow-200" /> The workspace that shapes itself around you
          </div>

          {/* Big serif headline — exactly like Joobie */}
          <h1
            className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-bold text-white leading-[1.0] mb-4"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 4px 30px rgba(0,40,100,0.20), 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Your workspace,
          </h1>
          <h1
            className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-bold text-white leading-[1.0] mb-8"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              textShadow: "0 4px 30px rgba(0,40,100,0.20), 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            fully yours.
          </h1>

          <p className="text-lg md:text-xl text-white/85 max-w-lg mx-auto mb-10 leading-relaxed drop-shadow">
            Drag widgets, build your dashboard, let AI handle the rest. Flux is the personalizable OS for focused people.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCTA}
              className="flex items-center gap-2 bg-white text-slate-800 font-bold px-9 py-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base"
            >
              Start for free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/30 transition-all text-base"
            >
              Sign in
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Interactive Dashboard Preview ── */}
      <section className="relative z-10 px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-4">
            <span className="text-white/50 text-xs font-medium bg-white/10 backdrop-blur px-3 py-1 rounded-full border border-white/20">
              ↑ Hover widgets · click × to remove · fully interactive
            </span>
          </div>
          <DashboardPreview />
        </motion.div>
      </section>

      {/* ── How it works (Joobie-style numbered steps) ── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg"
              style={{ fontFamily: "Georgia, serif" }}
            >
              How it <em style={{ fontStyle: "italic" }}>works</em>
            </h2>
            <p className="text-white/60 text-base">Three steps to your perfect productivity flow.</p>
          </motion.div>

          <div className="space-y-6">
            {[
              { step: "1", title: "Build your dashboard", desc: "Choose from 12+ widgets — tasks, calendar, budget, AI council, notes and more. Drag to arrange, resize as you like." },
              { step: "2", title: "Let AI prioritize your day", desc: "Flux analyzes your tasks, deadlines and energy level to generate a perfect daily plan — automatically updated in real-time." },
              { step: "3", title: "Stay in flow, not in apps", desc: "Everything in one place. No more tab switching between Notion, Google Cal, Todoist, and spreadsheets." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="flex items-start gap-5 group"
              >
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:bg-white/30 transition-all">
                  {s.step}
                </div>
                <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl p-5 flex-1 hover:bg-white/20 transition-all hover:shadow-xl">
                  <h3 className="text-white font-bold text-base mb-1" style={{ fontFamily: "Georgia, serif" }}>{s.title}</h3>
                  <p className="text-white/65 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After Slider ── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-8"
          >
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Before &amp; After
            </h2>
            <p className="text-white/55 text-sm">← Drag to compare →</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <BeforeAfterSlider />
          </motion.div>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="relative z-10 px-6 pb-28">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Everything you need.<br />
              <em style={{ fontStyle: "italic" }}>Nothing you don't.</em>
            </h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">
              Built for people who take their focus seriously.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="group rounded-3xl p-6 border border-white/20 bg-white/12 backdrop-blur-xl shadow-lg hover:bg-white/20 hover:shadow-2xl hover:scale-[1.01] transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                  <f.icon size={18} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-base mb-2" style={{ fontFamily: "Georgia, serif" }}>{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA bottom ── */}
      <section className="relative z-10 px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center rounded-3xl border border-white/25 bg-white/15 backdrop-blur-2xl p-14 shadow-2xl"
        >
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Ready to get into<br />
            <em style={{ fontStyle: "italic" }}>flow?</em>
          </h2>
          <p className="text-white/65 mb-8 text-base">
            Join thousands of people who replaced 5 apps with one workspace.
          </p>
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 mx-auto bg-white text-slate-800 font-bold px-10 py-4 rounded-full shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base"
          >
            Start for free <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-10 text-white/35 text-xs">
        © 2025 Flux. Built for deep work.
      </footer>
    </div>
  );
};

export default LandingPage;
