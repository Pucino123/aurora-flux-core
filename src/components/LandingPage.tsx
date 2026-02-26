import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, CheckSquare, Layers, Brain, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import skyBg from "@/assets/bg-sky-hero.jpg";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

const features = [
  {
    icon: Calendar,
    title: "AI Calendar",
    desc: "Your schedule, intelligently planned. Flux auto-schedules tasks, blocks deep work time, and adapts when plans change.",
  },
  {
    icon: CheckSquare,
    title: "Smart Task Manager",
    desc: "AI-prioritized task lists that surface what matters most. Drag, sort, and organize across days effortlessly.",
  },
  {
    icon: Layers,
    title: "Tool Ecosystem",
    desc: "A modular workspace with 20+ tools — timers, notes, budgets, fitness logs. Build your perfect focus environment.",
  },
  {
    icon: Brain,
    title: "The Council",
    desc: "Five distinct AI personas debate your ideas and decisions from every angle — strategist, skeptic, advocate and more.",
  },
];

const LandingPage = ({ onEnter }: LandingPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) { onEnter(""); }
    else { navigate("/auth"); }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Full-screen sky background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${skyBg})` }}
      />
      {/* Subtle vignette overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-sky-400/10 via-transparent to-sky-600/20" />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-8 md:px-16 py-5">
        <span className="text-xl font-bold text-white drop-shadow-md tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          Flux
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/auth")}
            className="text-white/90 hover:text-white text-sm font-medium transition-colors drop-shadow"
          >
            Sign in
          </button>
          <button
            onClick={handleCTA}
            className="flex items-center gap-1.5 bg-white/95 text-slate-800 text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg hover:bg-white transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center pt-20 pb-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/30 backdrop-blur-md border border-white/50 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 shadow-sm">
            <Sparkles size={12} className="text-blue-600" /> AI-powered productivity workspace
          </div>

          {/* Headline — Joobie-style large serif */}
          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-bold text-white leading-[1.05] mb-6 drop-shadow-xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 2px 20px rgba(0,50,120,0.18)" }}
          >
            Do more of what<br />
            <em className="not-italic" style={{ fontStyle: "italic" }}>actually matters.</em>
          </h1>

          <p className="text-lg md:text-xl text-white/90 max-w-xl mx-auto mb-10 leading-relaxed drop-shadow font-sans" style={{ fontFamily: "system-ui, sans-serif" }}>
            Flux combines an AI calendar, smart task manager, and a modular tool ecosystem into one beautifully unified workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCTA}
              className="flex items-center gap-2 bg-white text-slate-800 font-semibold px-8 py-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Get started free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/30 transition-all text-base"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Sign in
            </button>
          </div>
        </motion.div>
      </section>

      {/* App preview card — glassmorphic dark panel like Joobie */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-3xl overflow-hidden border border-white/20 shadow-[0_32px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl bg-black/40">
            {/* Mock toolbar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10 bg-white/5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
              <div className="flex-1 mx-4 bg-white/10 rounded-full px-4 py-1 text-xs text-white/40 text-center">app.flux.ai</div>
            </div>
            {/* Mock app UI */}
            <div className="grid grid-cols-3 gap-3 p-5">
              {["Today's Tasks", "In Progress", "Upcoming"].map((col, i) => (
                <div key={col} className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-sm ${["bg-blue-400","bg-purple-400","bg-slate-400"][i]}`} />
                    <span className="text-white/80 text-xs font-semibold">{col}</span>
                    <span className="ml-auto text-white/30 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{[4,2,6][i]}</span>
                  </div>
                  {Array.from({ length: [3,2,4][i] }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2.5 bg-white/[0.04] rounded-xl px-3 py-2">
                      <div className={`w-3.5 h-3.5 rounded-full border ${j===0 && i===0 ? "bg-blue-500 border-blue-500" : "border-white/20"} shrink-0`}>
                        {j===0 && i===0 && <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className={`h-1.5 rounded-full bg-white/${[30,20,15][j%3]} w-${["full","4/5","3/5"][j%3]}`} />
                        <div className={`h-1 rounded-full bg-white/10 w-${["3/5","2/5","3/4"][j%3]}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-32">
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
            <p className="text-white/70 text-lg max-w-lg mx-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
              Built for people who take their productivity seriously.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group rounded-3xl p-7 border border-white/20 bg-white/15 backdrop-blur-xl shadow-xl hover:bg-white/20 transition-all hover:shadow-2xl hover:scale-[1.01]"
              >
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center mb-5 group-hover:bg-white/30 transition-all shadow-sm">
                  <f.icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>{f.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed" style={{ fontFamily: "system-ui, sans-serif" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center rounded-3xl border border-white/20 bg-white/15 backdrop-blur-xl p-12 shadow-2xl"
        >
          <h2
            className="text-4xl font-bold text-white mb-4 drop-shadow"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Ready to get into flow?
          </h2>
          <p className="text-white/70 mb-8 text-base" style={{ fontFamily: "system-ui, sans-serif" }}>
            Join thousands of people working smarter with Flux.
          </p>
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 mx-auto bg-white text-slate-800 font-semibold px-9 py-4 rounded-full shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-base"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Start for free <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-10 text-white/40 text-xs" style={{ fontFamily: "system-ui, sans-serif" }}>
        © 2025 Flux. Built for deep work.
      </footer>
    </div>
  );
};

export default LandingPage;
