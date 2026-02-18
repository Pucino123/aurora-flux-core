import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useFocusStore, TimerMode } from "@/context/FocusContext";
import { logFocusMinutes } from "./FocusStatsWidget";
import DraggableWidget from "./DraggableWidget";
import { AnimatePresence, motion } from "framer-motion";

const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

function playCompletionBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

const FocusTimer = () => {
  const { timerMode, setTimerMode, goalText, setGoalText, setIsZenMode, activeTaskId, logTaskTime } = useFocusStore();
  const [seconds, setSeconds] = useState(POMODORO_WORK);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const isBreakRef = useRef(false);
  const [editingGoal, setEditingGoal] = useState(!goalText);
  const [goalInput, setGoalInput] = useState(goalText);
  const [customMinutes, setCustomMinutes] = useState(10);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Stable refs for callbacks to avoid effect re-runs
  const logTaskTimeRef = useRef(logTaskTime);
  const activeTaskIdRef = useRef(activeTaskId);
  const setIsZenModeRef = useRef(setIsZenMode);
  const timerModeRef = useRef(timerMode);

  useEffect(() => { logTaskTimeRef.current = logTaskTime; }, [logTaskTime]);
  useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);
  useEffect(() => { setIsZenModeRef.current = setIsZenMode; }, [setIsZenMode]);
  useEffect(() => { timerModeRef.current = timerMode; }, [timerMode]);
  useEffect(() => { isBreakRef.current = isBreak; }, [isBreak]);

  // Reset timer when mode changes
  useEffect(() => {
    setRunning(false);
    setIsZenModeRef.current(false);
    setIsBreak(false);
    isBreakRef.current = false;
    elapsedRef.current = 0;
    if (timerMode === "pomodoro") setSeconds(POMODORO_WORK);
    else if (timerMode === "countdown") setSeconds(customMinutes * 60);
    else setSeconds(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode, customMinutes]);

  // Tick — only depends on `running`
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        const mode = timerModeRef.current;
        if (mode === "stopwatch") {
          elapsedRef.current += 1;
          return prev + 1;
        }
        if (prev <= 1) {
          playCompletionBeep();
          if (mode === "pomodoro") {
            const wasBreak = isBreakRef.current;
            if (!wasBreak) {
              logFocusMinutes(25);
              const taskId = activeTaskIdRef.current;
              if (taskId) logTaskTimeRef.current(taskId, 25);
            }
            const nextBreak = !wasBreak;
            setIsBreak(nextBreak);
            isBreakRef.current = nextBreak;
            return nextBreak ? POMODORO_BREAK : POMODORO_WORK;
          }
          // Countdown finished
          const elapsedMin = Math.round(elapsedRef.current / 60);
          if (elapsedMin > 0) {
            logFocusMinutes(elapsedMin);
            const taskId = activeTaskIdRef.current;
            if (taskId) logTaskTimeRef.current(taskId, elapsedMin);
          }
          elapsedRef.current = 0;
          setRunning(false);
          setIsZenModeRef.current(false);
          return 0;
        }
        elapsedRef.current += 1;
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const toggleRunning = () => {
    if (running) {
      if (timerMode === "stopwatch") {
        const elapsedMin = Math.round(elapsedRef.current / 60);
        if (elapsedMin > 0) {
          logFocusMinutes(elapsedMin);
          if (activeTaskId) logTaskTime(activeTaskId, elapsedMin);
        }
        elapsedRef.current = 0;
      }
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setIsBreak(false);
    isBreakRef.current = false;
    elapsedRef.current = 0;
    if (timerMode === "pomodoro") setSeconds(POMODORO_WORK);
    else if (timerMode === "countdown") setSeconds(customMinutes * 60);
    else setSeconds(0);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleGoalSubmit = useCallback(() => {
    if (goalInput.trim()) {
      setGoalText(goalInput.trim());
      setEditingGoal(false);
    }
  }, [goalInput, setGoalText]);

  const modes: { key: TimerMode; label: string }[] = [
    { key: "pomodoro", label: "Focus 25/5" },
    { key: "stopwatch", label: "Stopwatch" },
    { key: "countdown", label: "Countdown" },
  ];

  return (
    <DraggableWidget
      id="timer"
      title="Focus Timer"
      defaultPosition={{ x: 420, y: 40 }}
      defaultSize={{ w: 380, h: 340 }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setTimerMode(m.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timerMode === m.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {timerMode === "countdown" && !running && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={180}
              value={customMinutes}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 1;
                setCustomMinutes(v);
                setSeconds(v * 60);
              }}
              className="w-16 bg-white/5 border border-white/15 rounded-lg text-center text-white text-sm py-1 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <span className="text-white/40 text-xs">min</span>
          </div>
        )}

        {timerMode === "pomodoro" && isBreak && (
          <span className="text-xs text-emerald-400/80 font-medium">Break Time</span>
        )}

        <div className="text-7xl font-light text-white tracking-wider font-display tabular-nums">
          {formatTime(seconds)}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleRunning}
            className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            {running ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={reset}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-full mt-2">
          <AnimatePresence mode="wait">
            {editingGoal ? (
              <motion.input
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGoalSubmit()}
                onBlur={handleGoalSubmit}
                placeholder="What is your main goal?"
                className="w-full bg-transparent border-b border-white/20 text-white/80 text-center text-sm py-2 placeholder:text-white/25 focus:outline-none focus:border-white/40"
                autoFocus
              />
            ) : (
              <motion.p
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingGoal(true)}
                className="text-lg font-display text-center text-white/70 cursor-pointer hover:text-white/90 transition-colors"
              >
                {goalText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default FocusTimer;
