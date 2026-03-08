import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Moon, Sun, Focus, BellOff, Bell, Zap, CalendarDays,
  CheckSquare, AlertTriangle, Clock,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useFocusMode } from "@/context/FocusModeContext";
import { useFlux } from "@/context/FluxContext";
import { useMonetization } from "@/context/MonetizationContext";
import { format } from "date-fns";
import { useState } from "react";

interface ControlCenterProps {
  open: boolean;
  onClose: () => void;
}

const ControlCenter = ({ open, onClose }: ControlCenterProps) => {
  const { theme, setTheme } = useTheme();
  const { isFocusModeActive, toggleFocusMode } = useFocusMode();
  const { tasks, scheduleBlocks } = useFlux();
  const { sparksBalance } = useMonetization();
  const [muted, setMuted] = useState(false);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayBlocks = scheduleBlocks
    .filter(b => b.scheduled_date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3);

  const pendingTasks = tasks.filter(t => !t.done).slice(0, 3);

  // Build notifications from real data
  const notifications: { icon: React.ReactNode; text: string; time: string; color: string }[] = [];
  const overdueTasks = tasks.filter(t => !t.done && t.due_date && t.due_date < today);
  if (overdueTasks.length) {
    notifications.push({
      icon: <AlertTriangle size={13} />,
      text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      time: "Now",
      color: "text-rose-400",
    });
  }
  const nextBlock = todayBlocks.find(b => b.time >= format(new Date(), "HH:mm"));
  if (nextBlock) {
    notifications.push({
      icon: <Clock size={13} />,
      text: `"${nextBlock.title}" at ${nextBlock.time}`,
      time: "Today",
      color: "text-violet-400",
    });
  }
  if (sparksBalance < 20) {
    notifications.push({
      icon: <Zap size={13} />,
      text: `Only ${sparksBalance} Sparks remaining`,
      time: "Account",
      color: "text-amber-400",
    });
  }

  const toggles = [
    {
      id: "focus",
      label: "Focus",
      icon: <Focus size={18} />,
      active: isFocusModeActive,
      color: "text-violet-400",
      activeBg: "bg-violet-500/20 border-violet-500/40",
      onClick: () => { toggleFocusMode(); },
    },
    {
      id: "mute",
      label: muted ? "Unmute" : "Mute",
      icon: muted ? <BellOff size={18} /> : <Bell size={18} />,
      active: muted,
      color: "text-slate-400",
      activeBg: "bg-slate-500/20 border-slate-500/40",
      onClick: () => setMuted(p => !p),
    },
    {
      id: "theme",
      label: theme === "dark" ? "Light" : "Dark",
      icon: theme === "dark" ? <Sun size={18} /> : <Moon size={18} />,
      active: false,
      color: "text-amber-400",
      activeBg: "bg-amber-500/20 border-amber-500/40",
      onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9490]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="fixed top-4 right-4 bottom-4 w-80 z-[9500] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--card) / 0.75)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid hsl(var(--border) / 0.4)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <span className="text-sm font-semibold text-foreground">Control Center</span>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-foreground/8 hover:bg-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Quick Toggles */}
            <div className="px-4 pb-3 shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 px-1">Quick Toggles</p>
              <div className="grid grid-cols-3 gap-2">
                {toggles.map(t => (
                  <button
                    key={t.id}
                    onClick={t.onClick}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                      t.active
                        ? `${t.activeBg} ${t.color}`
                        : "bg-foreground/5 border-border/20 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    }`}
                  >
                    {t.icon}
                    <span className="text-[10px] font-medium leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-4 h-px bg-border/20 shrink-0" />

            {/* Aura Insights */}
            <div className="px-4 py-3 shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 px-1">Aura Insights</p>
              <div
                className="rounded-xl p-3 space-y-2"
                style={{
                  background: "hsl(var(--primary) / 0.06)",
                  border: "1px solid hsl(var(--primary) / 0.15)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Zap size={10} className="text-primary" />
                  </div>
                  <p className="text-xs text-foreground font-medium">
                    {pendingTasks.length === 0
                      ? "All tasks complete — great work! 🎯"
                      : `${pendingTasks.length} task${pendingTasks.length > 1 ? "s" : ""} pending today`}
                  </p>
                </div>
                {todayBlocks.length > 0 && (
                  <div className="flex items-start gap-2">
                    <CalendarDays size={10} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {todayBlocks.length} scheduled block{todayBlocks.length > 1 ? "s" : ""} today:&nbsp;
                      {todayBlocks.map(b => b.title).join(", ")}
                    </p>
                  </div>
                )}
                {pendingTasks.length > 0 && (
                  <div className="flex items-start gap-2">
                    <CheckSquare size={10} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Next up: {pendingTasks[0].title}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5">
                    <Zap size={9} />{sparksBalance} Sparks
                  </span>
                </div>
              </div>
            </div>

            <div className="mx-4 h-px bg-border/20 shrink-0" />

            {/* Notifications */}
            <div className="px-4 py-3 flex-1 overflow-y-auto min-h-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 px-1">Notifications</p>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell size={20} className="text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground/50">All clear — no alerts</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {notifications.map((n, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "hsl(var(--card) / 0.4)", border: "1px solid hsl(var(--border) / 0.2)" }}
                    >
                      <span className={n.color}>{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{n.text}</p>
                        <p className="text-[10px] text-muted-foreground">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Focus mode banner */}
            <AnimatePresence>
              {isFocusModeActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-4 mb-4 rounded-xl overflow-hidden"
                  style={{
                    background: "hsl(270 76% 65% / 0.15)",
                    border: "1px solid hsl(270 76% 65% / 0.3)",
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Focus size={13} className="text-violet-400 shrink-0" />
                    <p className="text-xs text-violet-300 font-medium">Focus Mode active</p>
                    <button
                      onClick={() => { toggleFocusMode(); }}
                      className="ml-auto text-[10px] text-violet-400/70 hover:text-violet-300 transition-colors"
                    >
                      Exit
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ControlCenter;
