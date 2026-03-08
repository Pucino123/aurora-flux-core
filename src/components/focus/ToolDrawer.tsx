import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Timer, Music, CalendarClock, StickyNote, Clock, BarChart3, FileText, MessageSquareQuote, Wind, Users, DollarSign, PieChart, Dumbbell, ListTodo, Briefcase, Sparkles, Award, Brain, X, ChevronUp, Focus, Hammer, MessageCircle, Lightbulb, RotateCcw, Orbit, Users2, GripHorizontal, Palette, SlidersHorizontal, AppWindow, Trash2 } from "lucide-react";
import { useFocusStore, SystemMode } from "@/context/FocusContext";
import { useWindowManager } from "@/context/WindowManagerContext";
import { useTrash } from "@/context/TrashContext";
import { useFocusMode } from "@/context/FocusModeContext";
import { AnimatePresence, motion } from "framer-motion";
import FocusReportModal from "./FocusReportModal";
import CollabMessagesModal from "./CollabMessagesModal";
import MissionControl from "@/components/windows/MissionControl";
import TrashModal from "@/components/TrashModal";
import { getSuggestedWidgets } from "@/hooks/useWidgetIntelligence";
import { useTeamChat } from "@/hooks/useTeamChat";
import { Slider } from "@/components/ui/slider";

const TOOL_CATEGORIES = [
  {
    label: "Core",
    tools: [
      { id: "clock", label: "Clock", icon: Clock },
      { id: "timer", label: "Timer", icon: Timer },
      { id: "notes", label: "Notes", icon: StickyNote },
      { id: "scratchpad", label: "Scratchpad", icon: FileText },
      { id: "crm", label: "CRM", icon: Users2 },
    ],
  },
  {
    label: "Insight",
    tools: [
      { id: "budget-preview", label: "Budget", icon: DollarSign },
      { id: "savings-ring", label: "Savings", icon: PieChart },
      { id: "weekly-workout", label: "Workout", icon: Dumbbell },
      { id: "project-status", label: "Projects", icon: Briefcase },
      { id: "stats", label: "Focus Stats", icon: BarChart3 },
    ],
  },
  {
    label: "Smart",
    tools: [
      { id: "aura", label: "Aura", icon: Orbit },
      { id: "council", label: "Council", icon: Brain },
      { id: "smart-plan", label: "Smart Plan", icon: Sparkles },
      { id: "gamification", label: "Streaks", icon: Award },
      { id: "top-tasks", label: "Tasks", icon: ListTodo },
    ],
  },
  {
    label: "Integration",
    tools: [
      { id: "planner", label: "Planner", icon: CalendarClock },
      { id: "music", label: "Music", icon: Music },
      { id: "quote", label: "Quote", icon: MessageSquareQuote },
      { id: "breathing", label: "Breathe", icon: Wind },
    ],
  },
];

const MODES: { key: SystemMode; label: string; icon: any; desc: string }[] = [
  { key: "focus", label: "Focus", icon: Focus, desc: "Clock + primary tool" },
  { key: "build", label: "Build", icon: Hammer, desc: "Customize layout" },
];

const TOOLBAR_POS_KEY = "flux-toolbar-pos";
const TOOLBAR_STYLE_KEY = "flux-toolbar-style";

interface ToolbarStyle {
  bgOpacity: number;
  bgColor: string;
  textColor: string;
  blurAmount: number;
  borderOpacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  textOpacity: number;
}

const DEFAULT_TOOLBAR_STYLE: ToolbarStyle = {
  bgOpacity: 10,
  bgColor: "#000000",
  textColor: "#ffffff",
  blurAmount: 16,
  borderOpacity: 20,
  borderRadius: 50,
  borderWidth: 1,
  borderColor: "#ffffff",
  textOpacity: 80,
};

function loadToolbarPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(TOOLBAR_POS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveToolbarPos(pos: { x: number; y: number }) {
  localStorage.setItem(TOOLBAR_POS_KEY, JSON.stringify(pos));
}

function loadToolbarStyle(): ToolbarStyle {
  try {
    const raw = localStorage.getItem(TOOLBAR_STYLE_KEY);
    return raw ? { ...DEFAULT_TOOLBAR_STYLE, ...JSON.parse(raw) } : DEFAULT_TOOLBAR_STYLE;
  } catch { return DEFAULT_TOOLBAR_STYLE; }
}
function saveToolbarStyle(s: ToolbarStyle) {
  localStorage.setItem(TOOLBAR_STYLE_KEY, JSON.stringify(s));
}

const BORDER_RADIUS_PRESETS = [
  { label: "Soft", value: 12 },
  { label: "Round", value: 24 },
  { label: "Pill", value: 50 },
];

const BORDER_STYLES_LIST = [
  { label: "None", value: 0 },
  { label: "Thin", value: 1 },
  { label: "Med", value: 2 },
  { label: "Bold", value: 3 },
];

const SWATCH_COLORS = ["#ffffff", "#a5b4fc", "#6ee7b7", "#fde68a", "#f9a8d4", "#7dd3fc", "#fca5a5"];
const BG_SWATCHES = ["#000000", "#1a1a2e", "#0f172a", "#1e293b", "#0c0c0c", "#14041e", "#0a1628"];

// ── Style panel ──────────────────────────────────────────────────────
const ToolbarStylePanel = ({ style, onUpdate, onReset, onClose }: {
  style: ToolbarStyle;
  onUpdate: (patch: Partial<ToolbarStyle>) => void;
  onReset: () => void;
  onClose: () => void;
}) => {
  const [colorTab, setColorTab] = useState<"text" | "bg">("text");
  return (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.92, y: 8 }}
    transition={{ type: "spring", stiffness: 420, damping: 30 }}
    className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-72 rounded-2xl p-4 shadow-2xl z-[10200]"
    style={{ background: "rgba(18,18,20,0.92)", backdropFilter: "blur(48px)", border: "1px solid rgba(255,255,255,0.1)" }}
    onPointerDown={e => e.stopPropagation()}
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Toolbar Style</span>
      <div className="flex items-center gap-2">
        <button onClick={onReset} className="text-[9px] text-white/30 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">Reset</button>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={13} /></button>
      </div>
    </div>

    <div className="space-y-4">
      {/* Color tabs */}
      <div className="space-y-2">
        <div className="flex gap-1 p-0.5 rounded-xl bg-white/[0.05]">
          {(["text", "bg"] as const).map(m => (
            <button key={m} onClick={() => setColorTab(m)}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${colorTab === m ? "bg-white/15 text-white/90" : "text-white/40 hover:text-white/60"}`}>
              {m === "text" ? "Text" : "Background"}
            </button>
          ))}
        </div>
        {colorTab === "text" ? (
          <div className="flex gap-1.5 flex-wrap">
            {["#ffffff", "#f0f0f0", "#a5b4fc", "#6ee7b7", "#fde68a", "#f9a8d4", "#7dd3fc"].map(c => (
              <button key={c} onClick={() => onUpdate({ textColor: c })}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: style.textColor === c ? "rgba(255,255,255,0.9)" : "transparent" }} />
            ))}
            <label className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-white/20 hover:scale-110 transition-transform"
              style={{ background: "conic-gradient(hsl(0 80% 60%),hsl(120 80% 60%),hsl(240 80% 60%),hsl(360 80% 60%))" }}>
              <input type="color" value={style.textColor || "#ffffff"} onChange={e => onUpdate({ textColor: e.target.value })} className="opacity-0 w-full h-full" />
            </label>
          </div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {BG_SWATCHES.map(c => (
              <button key={c} onClick={() => onUpdate({ bgColor: c })}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: style.bgColor === c ? "rgba(255,255,255,0.9)" : "transparent", border: c === "#000000" ? "2px solid rgba(255,255,255,0.2)" : undefined }} />
            ))}
            <label className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-white/20 hover:scale-110 transition-transform"
              style={{ background: "conic-gradient(hsl(0 80% 60%),hsl(120 80% 60%),hsl(240 80% 60%),hsl(360 80% 60%))" }}>
              <input type="color" value={style.bgColor || "#000000"} onChange={e => onUpdate({ bgColor: e.target.value })} className="opacity-0 w-full h-full" />
            </label>
          </div>
        )}
      </div>

      {/* Background opacity */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">BG Opacity</span>
          <span className="text-[10px] text-white/30 tabular-nums">{style.bgOpacity}%</span>
        </div>
        <Slider value={[style.bgOpacity]} onValueChange={([v]) => onUpdate({ bgOpacity: v })} min={0} max={80} step={1}
          className="[&_[data-radix-slider-track]]:h-[5px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-range]]:bg-white/50 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:shadow-md" />
      </div>

      {/* Blur */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Blur</span>
          <span className="text-[10px] text-white/30 tabular-nums">{style.blurAmount}px</span>
        </div>
        <Slider value={[style.blurAmount]} onValueChange={([v]) => onUpdate({ blurAmount: v })} min={0} max={40} step={1}
          className="[&_[data-radix-slider-track]]:h-[5px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-range]]:bg-white/50 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:shadow-md" />
      </div>

      {/* Text opacity */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Text Opacity</span>
          <span className="text-[10px] text-white/30 tabular-nums">{style.textOpacity}%</span>
        </div>
        <Slider value={[style.textOpacity]} onValueChange={([v]) => onUpdate({ textOpacity: v })} min={10} max={100} step={1}
          className="[&_[data-radix-slider-track]]:h-[5px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-range]]:bg-white/50 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:shadow-md" />
      </div>

      {/* Border radius presets */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider block">Shape</span>
        <div className="flex gap-1.5">
          {BORDER_RADIUS_PRESETS.map(p => (
            <button key={p.label} onClick={() => onUpdate({ borderRadius: p.value })}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${style.borderRadius === p.value ? "bg-white/15 text-white" : "text-white/35 hover:bg-white/8 hover:text-white/60 border border-white/8"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Border width */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider block">Border</span>
        <div className="flex gap-1.5">
          {BORDER_STYLES_LIST.map(b => (
            <button key={b.label} onClick={() => onUpdate({ borderWidth: b.value })}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${style.borderWidth === b.value ? "bg-white/15 text-white" : "text-white/35 hover:bg-white/8 hover:text-white/60 border border-white/8"}`}>
              {b.label}
            </button>
          ))}
        </div>
        {style.borderWidth > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Border Opacity</span>
              <span className="text-[10px] text-white/30 tabular-nums">{style.borderOpacity}%</span>
            </div>
            <Slider value={[style.borderOpacity]} onValueChange={([v]) => onUpdate({ borderOpacity: v })} min={0} max={100} step={5}
              className="[&_[data-radix-slider-track]]:h-[5px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-range]]:bg-white/50 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:shadow-md" />
            {/* Border color swatches */}
            <div className="flex gap-1.5 flex-wrap mt-1">
              {SWATCH_COLORS.map(c => (
                <button key={c} onClick={() => onUpdate({ borderColor: c })}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: style.borderColor === c ? "rgba(255,255,255,0.9)" : "transparent" }} />
              ))}
              <label className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-white/20 hover:scale-110 transition-transform"
                style={{ background: "conic-gradient(hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%))" }}>
                <input type="color" value={style.borderColor} onChange={e => onUpdate({ borderColor: e.target.value })} className="opacity-0 w-full h-full cursor-pointer" />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  </motion.div>
  );
};

interface ToolDrawerProps {
  pageActiveWidgets?: string[];
  onTogglePageWidget?: (id: string) => void;
}

const ToolDrawer = ({ pageActiveWidgets, onTogglePageWidget }: ToolDrawerProps = {}) => {
  const { activeWidgets, toggleWidget, systemMode, setSystemMode, resetDashboard } = useFocusStore();
  const { openWindow, windows, restoreWindow, closeWindow, bringToFront } = useWindowManager();
  const { trash } = useTrash();
  const { isFocusModeActive } = useFocusMode();
  const minimizedWindows = windows.filter(w => w.minimized);

  const effectiveWidgets = pageActiveWidgets ?? activeWidgets;
  const effectiveToggle = (id: string) => {
    if (onTogglePageWidget) onTogglePageWidget(id);
    else toggleWidget(id);
  };

  const [open, setOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const allToolIds = useMemo(() => TOOL_CATEGORIES.flatMap(c => c.tools), []);
  const suggestions = useMemo(() => getSuggestedWidgets(effectiveWidgets as string[]), [effectiveWidgets]);
  const { unreadCount, markAsRead } = useTeamChat();

  // ── Bounce on new minimized chip ──────────────────────────────────
  const [bounceChipId, setBounceChipId] = useState<string | null>(null);
  const prevMinimizedIds = useRef<Set<string>>(new Set(minimizedWindows.map(w => w.id)));
  useEffect(() => {
    const current = new Set(minimizedWindows.map(w => w.id));
    for (const id of current) {
      if (!prevMinimizedIds.current.has(id)) {
        setBounceChipId(id);
        setTimeout(() => setBounceChipId(null), 600);
        break;
      }
    }
    prevMinimizedIds.current = current;
  }, [minimizedWindows]);


  // (Mission Control removed)

  // ── Toolbar style ─────────────────────────────────────────────────
  const [toolbarStyle, setToolbarStyleState] = useState<ToolbarStyle>(loadToolbarStyle);
  const updateToolbarStyle = useCallback((patch: Partial<ToolbarStyle>) => {
    setToolbarStyleState(prev => {
      const next = { ...prev, ...patch };
      saveToolbarStyle(next);
      return next;
    });
  }, []);
  const resetToolbarStyle = useCallback(() => {
    setToolbarStyleState(DEFAULT_TOOLBAR_STYLE);
    saveToolbarStyle(DEFAULT_TOOLBAR_STYLE);
  }, []);

  // ── Drag position (build mode only) ──────────────────────────────────
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(loadToolbarPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (systemMode !== "build") return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    didDrag.current = false;
    setIsDragging(true);
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    } else if (toolbarPos) {
      offset.current = { x: e.clientX - toolbarPos.x, y: e.clientY - toolbarPos.y };
    } else {
      const w = barRef.current?.offsetWidth ?? 320;
      offset.current = { x: e.clientX - (window.innerWidth / 2 - w / 2), y: e.clientY - (window.innerHeight - 48) };
    }
  }, [systemMode, toolbarPos]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      didDrag.current = true;
      const nx = e.clientX - offset.current.x;
      const ny = e.clientY - offset.current.y;
      const w = barRef.current?.offsetWidth ?? 320;
      const h = barRef.current?.offsetHeight ?? 48;
      const cx = Math.max(0, Math.min(nx, window.innerWidth - w));
      const cy = Math.max(0, Math.min(ny, window.innerHeight - h));
      setToolbarPos({ x: cx, y: cy });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDragging(false);
      if (didDrag.current && toolbarPos) {
        saveToolbarPos(toolbarPos);
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [toolbarPos]);

  const posStyle: React.CSSProperties = toolbarPos
    ? { left: toolbarPos.x, top: toolbarPos.y, bottom: "auto", transform: "none" }
    : { left: "50%", bottom: "24px", top: "auto", transform: "translateX(-50%)" };

  const isBuild = systemMode === "build";

  // ── Dynamic bar style from ToolbarStyle ──────────────────────────
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const barBg = hexToRgba(toolbarStyle.bgColor || "#000000", toolbarStyle.bgOpacity / 100);
  const barBorder = toolbarStyle.borderWidth > 0
    ? `${toolbarStyle.borderWidth}px solid ${hexToRgba(toolbarStyle.borderColor, toolbarStyle.borderOpacity / 100)}`
    : "1px solid rgba(255,255,255,0.12)";
  const barRadius = toolbarStyle.borderRadius;
  const barBlur = toolbarStyle.blurAmount;
  const textAlpha = toolbarStyle.textOpacity / 100;
  const textRgba = hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha);

  return (
    <>
      {/* Bottom bar */}
      <motion.div
        ref={barRef}
        className="fixed z-[10100] flex items-center gap-1 px-2 py-1.5 select-none"
        animate={isBouncing ? { scale: [1, 1.06, 0.97, 1.02, 1] } : { scale: 1 }}
        transition={isBouncing ? { duration: 0.45, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 20 }}
        style={{
          ...posStyle,
          cursor: isBuild ? (isDragging ? "grabbing" : "grab") : "default",
          borderRadius: barRadius,
          background: barBg,
          backdropFilter: `blur(${barBlur}px)`,
          WebkitBackdropFilter: `blur(${barBlur}px)`,
          border: barBorder,
          boxShadow: isDragging
            ? "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.3)"
            : "0 8px 32px rgba(0,0,0,0.55)",
        }}
        onPointerDown={isBuild ? handlePointerDown : undefined}
      >
        {/* Grip indicator in build mode */}
        <AnimatePresence>
          {isBuild && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <GripHorizontal size={12} style={{ color: `rgba(255,255,255,${textAlpha * 0.4})` }} className="mr-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode buttons */}
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setSystemMode(key)}
            title={label}
            className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[10px] font-medium transition-all ${
              systemMode === key ? "bg-white/15 shadow-[0_0_10px_rgba(255,255,255,0.05)]" : "hover:bg-white/5"
            }`}
            style={{ color: systemMode === key ? textRgba : hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.4) }}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

        {/* Collab button */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => { setCollabOpen(true); markAsRead(); }}
          title="Collab"
          className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[10px] font-medium transition-all hover:bg-white/5"
          style={{ color: hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.4) }}
        >
          <MessageCircle size={14} />
          <span className="hidden sm:inline">Collab</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-lg">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="w-px h-5 mx-1" style={{ background: hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.15) }} />

        {/* Minimized window chips — macOS Dock style */}
        <AnimatePresence initial={false}>
          {minimizedWindows.map(win => {
            const WinIcon = win.type === "document" ? FileText : AppWindow;
            const iconColor = win.type === "document" ? hexToRgba("#7dd3fc", 0.85) : hexToRgba("#a78bfa", 0.85);
            const isNew = bounceChipId === win.id;
            const lastActive = win.lastActiveAt ? (() => {
              const diff = Date.now() - new Date(win.lastActiveAt).getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 1) return "just now";
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.floor(hrs / 24)}d ago`;
            })() : "just now";
            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, scale: 0.5, y: 8 }}
                animate={isNew
                  ? { opacity: 1, scale: [0.5, 1.18, 0.92, 1.06, 1], y: [8, -8, 2, -4, 0] }
                  : { opacity: 1, scale: 1, y: 0 }
                }
                exit={{ opacity: 0, scale: 0.5, y: 8 }}
                transition={isNew
                  ? { duration: 0.55, ease: "easeOut" }
                  : { duration: 0.22, type: "spring", stiffness: 380, damping: 28 }
                }
                className="relative shrink-0 group"
                onPointerDown={e => e.stopPropagation()}
              >
                {/* Frosted tooltip — appears on hover above the chip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 rounded-xl pointer-events-none z-[10300] opacity-0 group-hover:opacity-100 transition-opacity duration-150 min-w-[130px] max-w-[200px]"
                  style={{ background: "rgba(10,8,22,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <WinIcon size={10} style={{ color: iconColor, flexShrink: 0 }} />
                    <span className="text-[11px] font-semibold text-white truncate">{win.title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{win.type}</span>
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{lastActive}</span>
                  </div>
                  <span className="text-[9px] block mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Click to restore</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent" style={{ borderTopColor: "rgba(255,255,255,0.1)" }} />
                </div>

                <button
                  onClick={() => restoreWindow(win.id)}
                  className="flex items-center gap-1.5 pl-2 pr-2 py-1.5 rounded-full text-[10px] font-medium transition-all hover:bg-white/10 max-w-[110px]"
                  style={{
                    color: hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.65),
                    background: hexToRgba(toolbarStyle.bgColor || "#000000", 0.18),
                    border: `1px solid ${hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.18)}`,
                  }}
                >
                  <WinIcon size={11} className="shrink-0" style={{ color: iconColor }} />
                  <span className="truncate hidden sm:inline">{win.title}</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hexToRgba(toolbarStyle.textColor || "#ffffff", 0.28) }} />
                </button>

                {/* X close button — appears on hover */}
                <button
                  onClick={() => closeWindow(win.id)}
                  title="Close"
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ background: "rgba(239,68,68,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <X size={8} strokeWidth={2.5} style={{ color: "#fff" }} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {minimizedWindows.length > 0 && (
          <div className="w-px h-5 mx-1" style={{ background: `repeating-linear-gradient(to bottom, ${hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.3)} 0px, ${hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.3)} 3px, transparent 3px, transparent 6px)` }} />
        )}

        {/* Tools trigger */}
        <motion.button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => { setOpen(!open); setStyleOpen(false); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-medium transition-all ${open ? "bg-white/15" : "hover:bg-white/5"}`}
          style={{ color: open ? textRgba : hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.5) }}
          whileTap={{ scale: 0.96 }}
        >
          <ChevronUp size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          <span className="hidden sm:inline">Tools</span>
          {effectiveWidgets.length > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.3) }}>{effectiveWidgets.length}</span>
          )}
        </motion.button>

        {/* Style button — build mode only */}
        {isBuild && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => { setStyleOpen(!styleOpen); setOpen(false); }}
            title="Customize toolbar style"
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[10px] font-medium transition-all ${styleOpen ? "bg-white/15" : "hover:bg-white/5"}`}
            style={{ color: styleOpen ? textRgba : hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.4) }}
          >
            <Palette size={13} />
          </button>
        )}

        {/* Style panel */}
        <AnimatePresence>
          {styleOpen && isBuild && (
            <ToolbarStylePanel
              style={toolbarStyle}
              onUpdate={updateToolbarStyle}
              onReset={resetToolbarStyle}
              onClose={() => setStyleOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Right-side separator */}
        <div className="w-px h-5 mx-1" style={{ background: hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.12) }} />

        {/* Trash */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setTrashOpen(true)}
          title="Recently Deleted"
          className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[10px] font-medium transition-all hover:bg-white/5"
          style={{ color: hexToRgba(toolbarStyle.textColor || "#ffffff", textAlpha * 0.4) }}
        >
          <Trash2 size={14} />
          {trash.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-bold"
              style={{ background: "rgba(239,68,68,0.85)", color: "#fff", boxShadow: "0 0 6px rgba(239,68,68,0.5)" }}>
              {trash.length > 9 ? "9+" : trash.length}
            </span>
          )}
        </button>
      </motion.div>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10050] bg-black/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel — anchored above the bar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scaleX: 0.92, scaleY: 0.88 }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, y: 18, scaleX: 0.94, scaleY: 0.90 }}
            transition={{ type: "spring", stiffness: 500, damping: 36, mass: 0.8 }}
            style={{
              transformOrigin: "50% 100%",
              ...(toolbarPos
                ? { left: toolbarPos.x, bottom: `calc(100vh - ${toolbarPos.y}px + 8px)`, top: "auto", transform: "none" }
                : { left: "50%", bottom: "88px", top: "auto", transform: "translateX(-50%)" }),
            }}
            className="fixed z-[10100] w-[92vw] max-w-[520px] p-4 rounded-2xl bg-black/60 backdrop-blur-[24px] border border-white/15 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Tool Ecosystem</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { resetDashboard(); setOpen(false); }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 flex items-center gap-1"
                  title="Reset all widget positions to defaults"
                >
                  <RotateCcw size={10} />
                  Reset Layout
                </button>
                <button
                  onClick={() => { setReportOpen(true); setOpen(false); }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  Focus Report
                </button>
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto council-hidden-scrollbar">
              {suggestions.length > 0 && (
                <div>
                  <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Lightbulb size={10} /> Suggested for you
                  </span>
                  <div className="flex gap-1.5">
                    {suggestions.map((id) => {
                      const tool = allToolIds.find(t => t.id === id);
                      if (!tool) return null;
                      const Icon = tool.icon;
                      return (
                        <button
                          key={id}
                          onClick={() => effectiveToggle(id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
                        >
                          <Icon size={14} />
                          <span>{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {TOOL_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-1.5 block">{cat.label}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {cat.tools.map(({ id, label, icon: Icon }) => {
                      const active = effectiveWidgets.includes(id);
                      return (
                        <div key={id} className="relative group/tile">
                          <button
                            onClick={() => effectiveToggle(id)}
                            className={`w-full flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-medium transition-all ${
                              active
                                ? "bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                                : "text-white/35 hover:text-white/70 hover:bg-white/5"
                            }`}
                          >
                            <Icon size={16} />
                            <span>{label}</span>
                          </button>
                          {/* Open in Window button — appears on hover */}
                          <button
                            title="Open in Window"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              openWindow({
                                type: 'widget',
                                contentId: id,
                                title: label,
                                layout: 'floating',
                                position: { x: 120 + Math.random() * 80, y: 80 + Math.random() * 40 },
                              });
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/tile:opacity-100 transition-opacity bg-primary/80 hover:bg-primary text-primary-foreground shadow-md z-10"
                          >
                            <AppWindow size={9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FocusReportModal open={reportOpen} onOpenChange={setReportOpen} />
      <CollabMessagesModal open={collabOpen} onOpenChange={setCollabOpen} />
      <TrashModal open={trashOpen} onClose={() => setTrashOpen(false)} />
    </>
  );
};

export default ToolDrawer;
