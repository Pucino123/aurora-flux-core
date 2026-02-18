import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Clock, Brain, Users, CalendarDays, Dumbbell, BookOpen, ListChecks, Palette, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (plan: { text: string; timeframe: string; focus: string }) => void;
}

const PlanModal = ({ open, onClose, onSubmit }: PlanModalProps) => {
  const [text, setText] = useState("");
  const [timeframe, setTimeframe] = useState("today");
  const [focus, setFocus] = useState("deep");
  const [phase, setPhase] = useState<"input" | "reasoning" | "generating">("input");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setPhase("reasoning");
    await new Promise((r) => setTimeout(r, 1500));
    setPhase("generating");
    await new Promise((r) => setTimeout(r, 800));
    onSubmit({ text: text.trim(), timeframe, focus });
    setText("");
    setPhase("input");
    onClose();
  };

  const handleClose = () => {
    setPhase("input");
    onClose();
  };

  const timeframes = [
    { value: "today", label: t("plan.today"), icon: Clock },
    { value: "week", label: t("plan.week"), icon: CalendarDays },
  ];

  const focusOptions = [
    { value: "deep", label: t("plan.deep"), icon: Brain },
    { value: "meetings", label: t("plan.meetings"), icon: Users },
    { value: "workout", label: t("plan.workout"), icon: Dumbbell },
    { value: "reading", label: t("plan.reading"), icon: BookOpen },
    { value: "tasks", label: t("plan.tasks"), icon: ListChecks },
    { value: "creative", label: t("plan.creative"), icon: Palette },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
              {phase === "input" ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold font-display flex items-center gap-2">
                      <Sparkles size={18} className="text-primary" />
                      {t("plan.title")}
                    </h2>
                    <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("plan.placeholder")}
                    rows={4}
                    className="w-full p-4 rounded-2xl bg-white/60 border border-white/50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/50 mb-4"
                  />

                  {/* Timeframe */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("plan.timeframe")}</p>
                    <div className="flex gap-2 flex-wrap">
                      {timeframes.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setTimeframe(value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            timeframe === value
                              ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Focus */}
                  <div className="mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("plan.focus")}</p>
                    <div className="flex gap-2 flex-wrap">
                      {focusOptions.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setFocus(value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            focus === value
                              ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!text.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--aurora-blue))] to-[hsl(var(--aurora-violet))] text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {t("plan.generate")}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain size={36} className="text-primary" />
                  </motion.div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold font-display text-foreground">
                      {phase === "reasoning" ? t("plan.reasoning") : t("plan.generating")}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PlanModal;
