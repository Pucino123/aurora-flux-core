import React, { useRef, useState, useCallback, useEffect } from "react";
import { X, Palette, SlidersHorizontal, LayoutGrid, Type } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { WidgetStyle } from "@/hooks/useWidgetStyle";

/* ─── Constants ─── */
const PALETTE = [
  "", "#ffffff", "#f5f5f7", "#1d1d1f", "#0a84ff",
  "#30d158", "#ff9f0a", "#ff375f", "#bf5af2",
  "#64d2ff", "#ac8e68", "#ff6482",
];

const FONTS: { key: string; label: string; family: string }[] = [
  { key: "sans", label: "Sans", family: "'Inter', sans-serif" },
  { key: "serif", label: "Serif", family: "'Playfair Display', serif" },
  { key: "mono", label: "Mono", family: "'JetBrains Mono', monospace" },
  { key: "display", label: "Display", family: "'Oswald', sans-serif" },
  { key: "rounded", label: "Rounded", family: "'Nunito', sans-serif" },
  { key: "condensed", label: "Condensed", family: "'Poppins', sans-serif" },
];

const RADIUS_PRESETS = [
  { label: "Square", value: 0 },
  { label: "Soft", value: 8 },
  { label: "Rounded", value: 16 },
  { label: "Pill", value: 28 },
  { label: "Circle", value: 50 },
];

const BORDER_STYLES = [
  { label: "None", value: "none" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
];

type Tab = "font" | "color" | "style" | "layout";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "font", label: "Font", icon: <Type size={14} /> },
  { id: "color", label: "Color", icon: <Palette size={14} /> },
  { id: "style", label: "Style", icon: <SlidersHorizontal size={14} /> },
  { id: "layout", label: "Layout", icon: <LayoutGrid size={14} /> },
];

interface WidgetStyleEditorProps {
  style: WidgetStyle;
  onUpdate: (updates: Partial<WidgetStyle>) => void;
  onReset: () => void;
  onClose?: () => void;
  initialPosition?: { x: number; y: number };
}

/* ─── Swatch grid ─── */
const SwatchGrid = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) => (
  <div className="flex items-center gap-2 flex-wrap">
    {PALETTE.map((c) => {
      const isActive = value === c;
      return (
        <button
          key={c || "none"}
          onClick={() => onChange(c)}
          className="relative transition-transform duration-200 hover:scale-110"
          style={{ width: 32, height: 32 }}
        >
          <div
            className="absolute inset-0 rounded-full transition-all duration-200"
            style={{
              border: isActive ? "2.5px solid rgba(255,255,255,0.9)" : "2.5px solid transparent",
              transform: isActive ? "scale(1.18)" : "scale(1)",
            }}
          />
          <div
            className="w-full h-full rounded-full border border-white/15"
            style={{
              backgroundColor: c || "transparent",
              backgroundImage: c
                ? undefined
                : "linear-gradient(135deg, rgba(255,255,255,0.1) 50%, transparent 50%)",
            }}
          />
          {!c && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "rotate(-45deg)" }}>
              <div className="w-[1px] h-5 bg-red-400/70" />
            </div>
          )}
        </button>
      );
    })}
    <label className="relative transition-transform duration-200 hover:scale-110 cursor-pointer" style={{ width: 32, height: 32 }}>
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div
        className="w-full h-full rounded-full border border-white/15"
        style={{
          background: "conic-gradient(hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%), hsl(360 80% 60%))",
        }}
      />
    </label>
  </div>
);

/* ─── Bottom slider (blue accent like reference) ─── */
const BottomSlider = ({
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-3 px-1">
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      className="flex-1 [&_[data-radix-slider-track]]:h-[8px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-track]]:rounded-full [&_[data-radix-slider-range]]:bg-[#0a84ff] [&_[data-radix-slider-range]]:rounded-full [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-[22px] [&_[data-radix-slider-thumb]]:h-[22px] [&_[data-radix-slider-thumb]]:shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
    />
    <span className="text-[12px] tabular-nums text-white/40 font-medium w-10 text-right shrink-0">
      {displayValue}
    </span>
  </div>
);

/* ─── Font tab ─── */
const FontTab = ({ style, onUpdate }: { style: WidgetStyle; onUpdate: (u: Partial<WidgetStyle>) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-2">
      {FONTS.map((f) => {
        const active = style.fontFamily === f.family;
        return (
          <button
            key={f.key}
            onClick={() => onUpdate({ fontFamily: active ? "" : f.family })}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all duration-200 ${
              active
                ? "bg-white/15 border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10"
            }`}
          >
            <span
              className="text-[28px] font-medium text-white/90"
              style={{ fontFamily: f.family }}
            >
              12
            </span>
            <span className={`text-[10px] font-medium ${active ? "text-white/80" : "text-white/40"}`}>
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/* ─── Color tab ─── */
const ColorTab = ({ style, onUpdate, colorMode, setColorMode }: { style: WidgetStyle; onUpdate: (u: Partial<WidgetStyle>) => void; colorMode: "text" | "bg"; setColorMode: (m: "text" | "bg") => void }) => (
  <div className="space-y-4">
    <div className="flex gap-1 p-0.5 rounded-xl bg-white/[0.05]">
      <button
        onClick={() => setColorMode("text")}
        className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
          colorMode === "text" ? "bg-white/15 text-white/90" : "text-white/40 hover:text-white/60"
        }`}
      >
        Text
      </button>
      <button
        onClick={() => setColorMode("bg")}
        className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
          colorMode === "bg" ? "bg-white/15 text-white/90" : "text-white/40 hover:text-white/60"
        }`}
      >
        Background
      </button>
    </div>
    <SwatchGrid
      value={colorMode === "bg" ? style.backgroundColor : style.textColor}
      onChange={(c) => onUpdate(colorMode === "bg" ? { backgroundColor: c } : { textColor: c })}
    />
  </div>
);

/* ─── Style tab ─── */
const StyleTab = ({ style, onUpdate }: { style: WidgetStyle; onUpdate: (u: Partial<WidgetStyle>) => void }) => (
  <div className="space-y-3">
    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Border Radius</span>
    <div className="grid grid-cols-5 gap-1.5">
      {RADIUS_PRESETS.map((p) => {
        const active = style.borderRadius === p.value;
        return (
          <button
            key={p.label}
            onClick={() => onUpdate({ borderRadius: p.value })}
            className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-200 ${
              active
                ? "bg-white/15 border-white/30"
                : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            <div
              className="w-6 h-6 border-2 border-white/50"
              style={{ borderRadius: `${Math.min(p.value, 12)}px` }}
            />
            <span className={`text-[9px] font-medium ${active ? "text-white/80" : "text-white/35"}`}>
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
    {/* Inline radius slider */}
    <div className="flex items-center gap-3 px-1">
      <Slider
        value={[style.borderRadius]}
        onValueChange={([v]) => onUpdate({ borderRadius: v })}
        min={0} max={50} step={1}
        className="flex-1 [&_[data-radix-slider-track]]:h-[6px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-range]]:bg-[#0a84ff] [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-[18px] [&_[data-radix-slider-thumb]]:h-[18px] [&_[data-radix-slider-thumb]]:shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      />
      <span className="text-[11px] tabular-nums text-white/40 font-medium w-10 text-right">{style.borderRadius}px</span>
    </div>

    {/* Border Opacity slider */}
    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Border Opacity</span>
    <div className="flex items-center gap-3 px-1">
      <Slider
        value={[style.borderOpacity ?? 100]}
        onValueChange={([v]) => onUpdate({ borderOpacity: v })}
        min={0} max={100} step={5}
        className="flex-1 [&_[data-radix-slider-track]]:h-[6px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-range]]:bg-[#0a84ff] [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-[18px] [&_[data-radix-slider-thumb]]:h-[18px] [&_[data-radix-slider-thumb]]:shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      />
      <span className="text-[11px] tabular-nums text-white/40 font-medium w-10 text-right">{style.borderOpacity ?? 100}%</span>
    </div>

    {/* Effects */}
    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Effects</span>
    <div className="flex gap-2">
      <button
        onClick={() => onUpdate({ glassEffect: !style.glassEffect })}
        className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
          style.glassEffect ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
        }`}
      >
        Glass Effect
      </button>
      <button
        onClick={() => onUpdate({ depthShadow: !style.depthShadow })}
        className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
          style.depthShadow ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
        }`}
      >
        Depth Shadow
      </button>
    </div>
  </div>
);

/* ─── Layout tab ─── */
const LayoutTab = ({ style, onUpdate }: { style: WidgetStyle; onUpdate: (u: Partial<WidgetStyle>) => void }) => (
  <div className="space-y-3">
    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Border Style</span>
    <div className="grid grid-cols-4 gap-1.5">
      {BORDER_STYLES.map((b) => {
        const active = (style.borderStyle || "solid") === b.value;
        return (
          <button
            key={b.value}
            onClick={() => onUpdate({ borderStyle: b.value, borderWidth: b.value === "none" ? 0 : Math.max(1, style.borderWidth) })}
            className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-200 ${
              active
                ? "bg-white/15 border-white/30"
                : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            <div
              className="w-8 h-0"
              style={{
                borderTop: b.value === "none" ? "2px solid rgba(255,255,255,0.15)" : `2px ${b.value} rgba(255,255,255,0.5)`,
                opacity: b.value === "none" ? 0.3 : 1,
              }}
            />
            <span className={`text-[9px] font-medium ${active ? "text-white/80" : "text-white/35"}`}>
              {b.label}
            </span>
          </button>
        );
      })}
    </div>

    {/* Display options */}
    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Display</span>
    <button
      onClick={() => onUpdate({ hideSubtitle: !style.hideSubtitle })}
      className={`w-full px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
        style.hideSubtitle ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
      }`}
    >
      Hide Subtitle
    </button>
  </div>
);

/* ─── Main editor ─── */
const WidgetStyleEditor = ({ style, onUpdate, onReset, onClose, initialPosition }: WidgetStyleEditorProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("font");
  const [colorMode, setColorMode] = useState<"text" | "bg">("text");
  const [dragPos, setDragPos] = useState(initialPosition ?? { x: 0, y: 0 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - dragPos.x, y: e.clientY - dragPos.y };
  }, [dragPos]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      setDragPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  /* Bottom slider config per tab — color tab switches based on text/bg mode */
  const colorSlider = colorMode === "text"
    ? { value: style.textOpacity ?? 100, display: `${Math.round(style.textOpacity ?? 100)}%`, key: "textOpacity" as keyof WidgetStyle, label: "Text" }
    : { value: style.backgroundOpacity, display: `${Math.round(style.backgroundOpacity)}%`, key: "backgroundOpacity" as keyof WidgetStyle, label: "BG" };

  const sliderConfig: Record<Tab, { value: number; min: number; max: number; step: number; display: string; key: keyof WidgetStyle; label?: string }> = {
    font: { value: style.fontSize || 14, min: 8, max: 200, step: 1, display: `${style.fontSize || 14}px`, key: "fontSize", label: "Size" },
    color: { value: colorSlider.value, min: 0, max: 100, step: 5, display: colorSlider.display, key: colorSlider.key, label: colorSlider.label },
    style: { value: style.borderRadius, min: 0, max: 50, step: 1, display: `${style.borderRadius}px`, key: "borderRadius", label: "Radius" },
    layout: { value: style.borderWidth, min: 0, max: 10, step: 1, display: `${style.borderWidth}px`, key: "borderWidth", label: "Width" },
  };

  const sl = sliderConfig[activeTab];

  return (
    <div
      className="w-[340px] rounded-[24px] overflow-hidden"
      style={{
        transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
        background: "rgba(28, 28, 30, 0.88)",
        backdropFilter: "blur(60px) saturate(200%)",
        WebkitBackdropFilter: "blur(60px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 32px 80px -12px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.1)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Drag header + close */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-1 cursor-grab active:cursor-grabbing"
        onPointerDown={onDragStart}
      >
        <div className="w-6" />
        <div className="w-9 h-[5px] rounded-full bg-white/20" />
        <button
          onClick={(e) => { e.stopPropagation(); (onClose ?? onReset)(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded-full hover:bg-white/10 text-white/35 hover:text-white/60 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mx-3 mt-1 mb-2 p-1 rounded-2xl bg-white/[0.04]">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
                active
                  ? "bg-white/[0.12] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  : "text-white/35 hover:text-white/55"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="px-4 py-2 min-h-[160px]">
        {activeTab === "font" && <FontTab style={style} onUpdate={onUpdate} />}
        {activeTab === "color" && <ColorTab style={style} onUpdate={onUpdate} colorMode={colorMode} setColorMode={setColorMode} />}
        {activeTab === "style" && <StyleTab style={style} onUpdate={onUpdate} />}
        {activeTab === "layout" && <LayoutTab style={style} onUpdate={onUpdate} />}
      </div>

      {/* Bottom slider — hidden for Style tab (slider is inline there) */}
      {activeTab !== "style" && (
        <div className="px-4 pb-4 pt-1">
          <BottomSlider
            value={sl.value}
            min={sl.min}
            max={sl.max}
            step={sl.step}
            displayValue={sl.display}
            onChange={(v) => onUpdate({ [sl.key]: v })}
          />
        </div>
      )}
    </div>
  );
};

export default WidgetStyleEditor;
