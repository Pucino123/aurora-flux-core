import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Settings2, Save, Trash2, Target, BarChart3 } from "lucide-react";
import DraggableWidget from "./DraggableWidget";
import { motion, AnimatePresence } from "framer-motion";

const playChime = (freq: number, duration = 0.15) => {
  try { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = "sine"; osc.frequency.value = freq; gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration); } catch {}
};
const playCompletionChime = () => { try { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); [0, 0.15, 0.3, 0.5].forEach((delay, i) => { const freq = [523, 659, 784, 1047][i]; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = "sine"; osc.frequency.value = freq; gain.gain.setValueAtTime(0.06, ctx.currentTime + delay); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4); osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.4); }); } catch {} };
const vibrate = (ms: number) => { try { navigator.vibrate?.(ms); } catch {} };

type Phase = "inhale" | "hold" | "exhale" | "rest";
const PHASE_LABELS: Record<Phase, string> = { inhale: "Inhale", hold: "Hold", exhale: "Exhale", rest: "Rest" };

interface Preset { label: string; inhale: number; hold: number; exhale: number; custom?: boolean; }
const BUILT_IN_PRESETS: Preset[] = [
  { label: "4-7-8", inhale: 4, hold: 7, exhale: 8 },
  { label: "Box", inhale: 4, hold: 4, exhale: 4 },
  { label: "Wim Hof", inhale: 2, hold: 0, exhale: 2 },
  { label: "Calm", inhale: 5, hold: 2, exhale: 7 },
];

const STORAGE_KEY = "flux-breathing-prefs";
const CUSTOM_PRESETS_KEY = "flux-breathing-custom-presets";

const PHASE_COLORS: Record<Phase, { inner: string; mid: string; outer: string; glow: string }> = {
  inhale: { inner: "rgba(147,197,253,0.5)", mid: "rgba(147,197,253,0.2)", outer: "rgba(147,197,253,0.08)", glow: "rgba(147,197,253,0.25)" },
  hold: { inner: "rgba(253,230,138,0.4)", mid: "rgba(253,230,138,0.15)", outer: "rgba(253,230,138,0.06)", glow: "rgba(253,230,138,0.2)" },
  exhale: { inner: "rgba(196,181,253,0.5)", mid: "rgba(196,181,253,0.2)", outer: "rgba(196,181,253,0.08)", glow: "rgba(196,181,253,0.25)" },
  rest: { inner: "rgba(255,255,255,0.15)", mid: "rgba(255,255,255,0.06)", outer: "rgba(255,255,255,0.03)", glow: "rgba(255,255,255,0.08)" },
};

type ViewMode = "main" | "edit";

const BreathingWidget = () => {
  const saved = (() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {} return null; })();
  const [running, setRunning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [inhaleTime, setInhaleTime] = useState(saved?.inhale ?? 4);
  const [holdTime, setHoldTime] = useState(saved?.hold ?? 7);
  const [exhaleTime, setExhaleTime] = useState(saved?.exhale ?? 8);
  const [customPresets, setCustomPresets] = useState<Preset[]>(() => { try { const raw = localStorage.getItem(CUSTOM_PRESETS_KEY); if (raw) return JSON.parse(raw); } catch {} return []; });
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [progress, setProgress] = useState(0);
  const [cycles, setCycles] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ inhale: inhaleTime, hold: holdTime, exhale: exhaleTime })); }, [inhaleTime, holdTime, exhaleTime]);
  useEffect(() => { localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customPresets)); }, [customPresets]);

  const phaseDuration = useCallback(() => {
    switch (phase) { case "inhale": return inhaleTime * 1000; case "hold": return holdTime * 1000; case "exhale": return exhaleTime * 1000; case "rest": return 1000; }
  }, [phase, inhaleTime, holdTime, exhaleTime]);

  const nextPhase = useCallback((current: Phase): Phase => {
    switch (current) { case "inhale": return holdTime > 0 ? "hold" : "exhale"; case "hold": return "exhale"; case "exhale": return "rest"; case "rest": return "inhale"; }
  }, [holdTime]);

  useEffect(() => {
    if (!running) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    startRef.current = performance.now();
    const duration = phaseDuration();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p >= 1) {
        const next = nextPhase(phase);
        if (next === "inhale") { playChime(520, 0.2); vibrate(30); }
        else if (next === "hold") { playChime(660, 0.12); vibrate(15); }
        else if (next === "exhale") { playChime(440, 0.25); vibrate(30); }
        if (phase === "rest") setCycles((c) => c + 1);
        setPhase(next);
        startRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, phase, phaseDuration, nextPhase]);

  const handleToggle = () => { if (!running) { setPhase("inhale"); setProgress(0); setCycles(0); } setRunning(!running); };
  const applyPreset = (p: Preset) => { setInhaleTime(p.inhale); setHoldTime(p.hold); setExhaleTime(p.exhale); if (running) { setRunning(false); setPhase("inhale"); setProgress(0); } };
  const saveCustomPreset = () => { const name = saveName.trim(); if (!name) return; const exists = customPresets.find(p => p.label === name); if (exists) { setCustomPresets(customPresets.map(p => p.label === name ? { ...p, inhale: inhaleTime, hold: holdTime, exhale: exhaleTime } : p)); } else { setCustomPresets([...customPresets, { label: name, inhale: inhaleTime, hold: holdTime, exhale: exhaleTime, custom: true }]); } setSaveName(""); setShowSaveInput(false); };
  const deleteCustomPreset = (label: string) => { setCustomPresets(customPresets.filter(p => p.label !== label)); };

  const circleScale = phase === "inhale" ? 1 + progress * 0.45 : phase === "exhale" ? 1.45 - progress * 0.45 : phase === "hold" ? 1.45 : 1;
  const currentDuration = phase === "inhale" ? inhaleTime : phase === "hold" ? holdTime : phase === "exhale" ? exhaleTime : 1;
  const remainingSeconds = Math.ceil(currentDuration * (1 - progress));
  const activePreset = allPresets.find(p => p.inhale === inhaleTime && p.hold === holdTime && p.exhale === exhaleTime);
  const colors = PHASE_COLORS[running ? phase : "rest"];

  return (
    <DraggableWidget id="breathing" title="Breathe"
      defaultPosition={{ x: Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) / 2 - 150), y: 180 }}
      defaultSize={{ w: 300, h: 360 }}>
      <div className="flex flex-col items-center justify-center h-full gap-2 relative">
        <div className="absolute top-0 right-0 flex items-center gap-1 z-10">
          <button onClick={() => setViewMode(viewMode === "edit" ? "main" : "edit")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "edit" ? "bg-white/15 text-white/70" : "text-white/20 hover:text-white/50 hover:bg-white/5"}`} title="Patterns & timing">
            <Settings2 size={14} />
          </button>
        </div>

        <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
          <motion.div animate={{ scale: running ? circleScale * 1.15 : 1, opacity: running ? 0.4 : 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute rounded-full" style={{ width: 110, height: 110, border: `1px solid ${colors.mid}` }} />
          <motion.div animate={{ scale: running ? circleScale * 1.05 : 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute rounded-full" style={{ width: 90, height: 90, background: `radial-gradient(circle, ${colors.mid}, transparent)`, filter: running ? "blur(8px)" : "none" }} />
          <motion.div animate={{ scale: running ? circleScale : 1 }} transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-full relative" style={{ width: 70, height: 70, background: `radial-gradient(circle at 40% 35%, ${colors.inner}, ${colors.mid} 70%, transparent)`, boxShadow: running ? `0 0 50px ${colors.glow}, 0 0 100px ${colors.outer}` : "none" }} />
          <svg width="150" height="150" className="absolute">
            <circle cx="75" cy="75" r="68" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
            {running && <circle cx="75" cy="75" r="68" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
              strokeDasharray={`${2 * Math.PI * 68}`} strokeDashoffset={`${2 * Math.PI * 68 * (1 - progress)}`} strokeLinecap="round" transform="rotate(-90 75 75)" />}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-white/80 text-sm font-medium tracking-wide">{running ? PHASE_LABELS[phase] : "Ready"}</span>
            {running && <span className="text-white/30 text-xs tabular-nums mt-0.5">{remainingSeconds}s</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleToggle} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>
          {cycles > 0 && <span className="text-[11px] text-white/30 tabular-nums">{cycles} cycles</span>}
        </div>

        {viewMode === "main" && !running && activePreset && (
          <span className="text-[10px] text-white/25">{activePreset.label} ({inhaleTime}-{holdTime}-{exhaleTime})</span>
        )}

        <AnimatePresence>
          {viewMode === "edit" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 w-full overflow-hidden">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {allPresets.map((p) => (
                  <div key={p.label} className="relative group/preset">
                    <button onClick={() => applyPreset(p)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${activePreset?.label === p.label ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"}`}>{p.label}</button>
                    {p.custom && <button onClick={(e) => { e.stopPropagation(); deleteCustomPreset(p.label); }} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/60 text-white flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity"><Trash2 size={8} /></button>}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { label: "Inhale", value: inhaleTime, set: setInhaleTime, min: 2, max: 10 },
                  { label: "Hold", value: holdTime, set: setHoldTime, min: 0, max: 10 },
                  { label: "Exhale", value: exhaleTime, set: setExhaleTime, min: 2, max: 12 },
                ].map(({ label, value, set, min, max }) => (
                  <div key={label} className="flex items-center justify-between px-2">
                    <span className="text-[10px] text-white/40 w-12">{label}</span>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
                        <button key={v} onClick={() => set(v)} className={`w-5 h-5 rounded-full text-[9px] tabular-nums transition-all ${v === value ? "bg-white/20 text-white" : "text-white/20 hover:text-white/50"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!activePreset && (
                <div className="flex justify-center">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveCustomPreset()}
                        placeholder="Pattern name..." className="bg-white/10 text-white/80 text-[10px] px-2 py-1 rounded-lg border border-white/10 outline-none w-24" autoFocus />
                      <button onClick={saveCustomPreset} className="p-1 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all"><Save size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSaveInput(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 transition-all"><Save size={10} /> Save pattern</button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DraggableWidget>
  );
};

export default BreathingWidget;
