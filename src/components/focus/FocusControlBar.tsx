import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import { useFocusMode } from "@/context/FocusModeContext";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface FocusControlBarProps {
  /** Only render on the Focus dashboard, not on other views */
  onlyOnDashboard?: boolean;
}

const FocusControlBar = ({ onlyOnDashboard = true }: FocusControlBarProps) => {
  const {
    isFocusModeActive,
    focusTaskTitle,
    focusTimeRemaining,
    setFocusTimeRemaining,
    disableFocusMode,
    notificationQueue,
  } = useFocusMode();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown tick
  useEffect(() => {
    if (isFocusModeActive && focusTimeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setFocusTimeRemaining(Math.max(0, focusTimeRemaining - 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isFocusModeActive, focusTimeRemaining, setFocusTimeRemaining]);

  const isTimerDone = focusTimeRemaining === 0;
  const timerColor = isTimerDone
    ? "rgb(251,113,133)"      // rose when done
    : focusTimeRemaining < 5 * 60
      ? "rgb(251,191,36)"     // amber < 5 min
      : "rgb(52,211,153)";    // emerald normal

  return (
    <AnimatePresence>
      {isFocusModeActive && (
        <motion.div
          key="focus-control-bar"
          initial={{ opacity: 0, y: -28, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.93 }}
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
          className="fixed top-4 left-1/2 z-[9999] flex items-center gap-6 px-6 py-3 rounded-full"
          style={{
            transform: "translateX(-50%)",
            background: "rgba(8, 6, 18, 0.92)",
            backdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Left: task title */}
          <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
            {/* Live glow dot */}
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: "rgb(139,92,246)", boxShadow: "0 0 8px rgba(139,92,246,0.7)" }}
            />
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 0 20px rgba(255,255,255,0.15)" }}
              title={focusTaskTitle ?? "Deep Work Session"}
            >
              {focusTaskTitle || "Deep Work Session"}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Center: countdown */}
          <span
            className="font-mono text-lg font-bold tracking-tight tabular-nums shrink-0 transition-colors duration-500"
            style={{ color: timerColor, textShadow: `0 0 16px ${timerColor}60` }}
          >
            {isTimerDone ? "Done!" : formatTime(focusTimeRemaining)}
          </span>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Right: notification count badge + exit */}
          <div className="flex items-center gap-2 shrink-0">
            {notificationQueue.length > 0 && (
              <div className="relative flex items-center">
                <Bell size={13} className="text-white/30" />
                <span
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "rgb(239,68,68)", color: "white" }}
                >
                  {notificationQueue.length > 9 ? "9+" : notificationQueue.length}
                </span>
              </div>
            )}
            <button
              onClick={disableFocusMode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                color: "rgba(251,113,133,0.85)",
                border: "1px solid rgba(251,113,133,0.25)",
                background: "rgba(251,113,133,0.06)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,113,133,0.15)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(251,113,133,0.5)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,113,133,0.06)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(251,113,133,0.25)";
              }}
            >
              <X size={11} />
              Exit
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FocusControlBar;
