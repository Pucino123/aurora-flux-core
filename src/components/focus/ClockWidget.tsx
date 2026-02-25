import React, { useState, useEffect } from "react";
import DraggableWidget from "./DraggableWidget";
import { useFocusStore } from "@/context/FocusContext";
import { useFlux } from "@/context/FluxContext";
import { motion } from "framer-motion";

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  playfair: "'Playfair Display', serif",
  jetbrains: "'JetBrains Mono', monospace",
  poppins: "'Poppins', sans-serif",
  nunito: "'Nunito', sans-serif",
  oswald: "'Oswald', sans-serif",
};

const getGreeting = (hour: number) => {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
};

/** Time tone removed – clock is fully transparent by default */

interface ClockWidgetProps {
  onOpenEditor?: () => void;
  editorOpen?: boolean;
}

const ClockWidget = ({ onOpenEditor, editorOpen }: ClockWidgetProps) => {
  const defaultClockPos = React.useMemo(() => ({
    x: typeof window !== 'undefined' ? Math.round((window.innerWidth - 400) / 2) : 500,
    y: 30,
  }), []);
  const [now, setNow] = useState(new Date());
  const {
    clockFontSize, setClockFontSize,
    clockFont, clockColor, clockWeight,
    clockShowDate, clockShowSeconds,
    clockSecondaryTz,
    clockGlassEffect, clockDepthShadow,
    systemMode,
  } = useFocusStore();

  // Get tasks for productivity ring
  let tasksDone = 0;
  let tasksTotal = 0;
  try {
    const flux = useFlux();
    tasksTotal = flux.tasks.length;
    tasksDone = flux.tasks.filter(t => t.done).length;
  } catch {}

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load Google Fonts
  useEffect(() => {
    const fonts = ["Inter", "Playfair+Display", "JetBrains+Mono", "Poppins", "Nunito", "Oswald"];
    const link = document.getElementById("clock-fonts-link") as HTMLLinkElement;
    if (!link) {
      const el = document.createElement("link");
      el.id = "clock-fonts-link";
      el.rel = "stylesheet";
      el.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f}:wght@200;400;500;700`).join("&")}&display=swap`;
      document.head.appendChild(el);
    }
  }, []);

  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const greeting = getGreeting(now.getHours());

  let displayName = "";
  try {
    const raw = localStorage.getItem("flux-user-name");
    if (raw) displayName = raw;
  } catch {}

  const fontFamily = FONT_MAP[clockFont] || FONT_MAP.inter;
  const secondsSize = Math.max(16, clockFontSize * 0.5);
  const greetingSize = Math.max(11, clockFontSize * 0.22);
  const dateSize = Math.max(11, clockFontSize * 0.18);

  const textShadow = clockDepthShadow
    ? `0 4px 20px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)`
    : "none";

  const glassTextStyle: React.CSSProperties = clockGlassEffect
    ? { WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", backgroundImage: `linear-gradient(135deg, ${clockColor} 0%, rgba(255,255,255,0.35) 50%, ${clockColor} 100%)`, backgroundColor: "transparent", filter: "drop-shadow(0 0 8px rgba(255,255,255,0.12))" }
    : {};

  

  // Secondary timezone
  let secondaryTime = "";
  if (clockSecondaryTz) {
    try {
      secondaryTime = new Intl.DateTimeFormat(undefined, {
        timeZone: clockSecondaryTz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
    } catch {}
  }

  const tzLabel = clockSecondaryTz ? clockSecondaryTz.split("/").pop()?.replace("_", " ") : "";

  // Productivity ring
  const showRing = systemMode === "focus" && tasksTotal > 0;
  const ringProgress = tasksTotal > 0 ? tasksDone / tasksTotal : 0;
  const ringSize = clockFontSize * 1.8;
  const ringStroke = 3;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - ringProgress * ringCircumference;

  return (
    <DraggableWidget
      id="clock"
      title="Clock"
      defaultPosition={defaultClockPos}
      defaultSize={{ w: 400, h: 260 }}
      fontSizeControl={{ value: clockFontSize, set: setClockFontSize, min: 30, max: 120, step: 10 }}
      onEditAction={onOpenEditor}
      containerStyle={editorOpen ? { zIndex: 70, position: 'relative' } : undefined}
    >
      <div className="relative flex flex-col items-center justify-center h-full gap-2 group">
        

        {/* Productivity ring */}
        {showRing && (
          <svg
            width={ringSize}
            height={ringSize}
            className="absolute -rotate-90 pointer-events-none"
            style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-90deg)" }}
          >
            <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={ringStroke} />
            <motion.circle
              cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none"
              stroke="hsl(var(--aurora-blue))"
              strokeWidth={ringStroke} strokeLinecap="round"
              strokeDasharray={ringCircumference}
              initial={{ strokeDashoffset: ringCircumference }}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
        )}

        <div className="relative z-[1]">
          <div
            className="tracking-widest tabular-nums text-center"
            style={{
              fontFamily,
              fontSize: `${clockFontSize}px`,
              fontWeight: clockWeight,
              color: clockGlassEffect ? undefined : (clockColor || "inherit"),
              lineHeight: 1.1,
              textShadow,
              transition: "all 0.3s ease",
              ...glassTextStyle,
            }}
          >
            {hours}:{minutes}
            {clockShowSeconds && (
              <span style={{ fontSize: `${secondsSize}px`, opacity: 0.3, marginLeft: 4 }}>{seconds}</span>
            )}
          </div>
          {systemMode === "build" && (
            <p style={{ color: "inherit", opacity: 0.3, fontSize: "9px", textAlign: "center", marginTop: 4 }}>✏️ Use header edit button</p>
          )}
        </div>

        <p style={{ color: "inherit", opacity: 0.5, fontSize: `${greetingSize}px`, fontFamily }} className="font-medium relative z-[1]">
          {displayName ? `${greeting}, ${displayName}` : greeting}
        </p>

        {clockShowDate && (
          <p style={{ color: "inherit", opacity: 0.25, fontSize: `${dateSize}px`, marginTop: 2 }} className="relative z-[1]">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        )}

        {secondaryTime && (
          <p style={{ color: "inherit", opacity: 0.2, fontSize: `${dateSize}px`, marginTop: 4 }} className="relative z-[1]">
            {tzLabel} · {secondaryTime}
          </p>
        )}

        {showRing && (
          <p style={{ color: "inherit", opacity: 0.15, fontSize: "10px", marginTop: 4 }} className="relative z-[1]">
            {tasksDone}/{tasksTotal} tasks complete
          </p>
        )}
      </div>
    </DraggableWidget>
  );
};

export default ClockWidget;
