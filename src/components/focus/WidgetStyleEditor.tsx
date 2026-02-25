import React, { useRef, useState, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";
import type { WidgetStyle } from "@/hooks/useWidgetStyle";

const PALETTE = [
  "", "#ffffff", "#f5f5f7", "#1d1d1f", "#0a84ff",
  "#30d158", "#ff9f0a", "#ff375f", "#bf5af2",
  "#64d2ff", "#ac8e68", "#ff6482",
];

interface WidgetStyleEditorProps {
  style: WidgetStyle;
  onUpdate: (updates: Partial<WidgetStyle>) => void;
  onReset: () => void;
}

/* ─── Apple-style color swatch row ─── */
const SwatchRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) => (
  <div className="space-y-2">
    <span className="text-[11px] font-medium text-white/60 tracking-tight">{label}</span>
    <div className="flex items-center gap-2 flex-wrap">
      {PALETTE.map((c) => {
        const isActive = value === c;
        return (
          <button
            key={c || "none"}
            onClick={() => onChange(c)}
            className="relative transition-transform duration-200 hover:scale-110"
            style={{ width: 28, height: 28 }}
          >
            {/* Selection ring */}
            <div
              className="absolute inset-0 rounded-full transition-all duration-200"
              style={{
                border: isActive ? "2px solid rgba(255,255,255,0.9)" : "2px solid transparent",
                transform: isActive ? "scale(1.15)" : "scale(1)",
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
            {/* No-color slash */}
            {!c && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: "rotate(-45deg)" }}
              >
                <div className="w-[1px] h-4 bg-red-400/70" />
              </div>
            )}
          </button>
        );
      })}
      {/* Custom color picker */}
      <label className="relative transition-transform duration-200 hover:scale-110 cursor-pointer" style={{ width: 28, height: 28 }}>
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
  </div>
);

/* ─── Minimal Apple-style slider ─── */
const AppleSlider = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-white/60 tracking-tight">{label}</span>
      <span className="text-[11px] tabular-nums text-white/35 font-medium">
        {Math.round(value)}{unit}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      className="[&_[data-radix-slider-track]]:h-[6px] [&_[data-radix-slider-track]]:bg-white/8 [&_[data-radix-slider-track]]:rounded-full [&_[data-radix-slider-range]]:bg-white/25 [&_[data-radix-slider-range]]:rounded-full [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-0 [&_[data-radix-slider-thumb]]:w-[18px] [&_[data-radix-slider-thumb]]:h-[18px] [&_[data-radix-slider-thumb]]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
    />
  </div>
);

const WidgetStyleEditor = ({ style, onUpdate, onReset }: WidgetStyleEditorProps) => {
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
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

  return (
    <div
      className="w-72 rounded-2xl overflow-hidden"
      style={{
        transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
        background: "rgba(28, 28, 30, 0.92)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 80px -16px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* iOS-style drag pill */}
      <div
        className="flex items-center justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
        onPointerDown={onDragStart}
      >
        <div className="w-9 h-[5px] rounded-full bg-white/20" />
      </div>

      {/* Title + reset */}
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-[13px] font-semibold text-white/85 tracking-tight">Customize</span>
        <button
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          title="Reset"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-white/8 mx-4" />

      {/* Controls */}
      <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto council-hidden-scrollbar">
        <SwatchRow
          label="Background"
          value={style.backgroundColor}
          onChange={(c) => onUpdate({ backgroundColor: c })}
        />

        <AppleSlider
          label="Opacity"
          value={style.backgroundOpacity}
          min={0} max={100} step={5} unit="%"
          onChange={(v) => onUpdate({ backgroundOpacity: v })}
        />

        {/* Separator */}
        <div className="h-px bg-white/6" />

        <SwatchRow
          label="Text"
          value={style.textColor}
          onChange={(c) => onUpdate({ textColor: c })}
        />

        {/* Separator */}
        <div className="h-px bg-white/6" />

        <SwatchRow
          label="Border"
          value={style.borderColor}
          onChange={(c) => onUpdate({ borderColor: c })}
        />

        <div className="grid grid-cols-2 gap-3">
          <AppleSlider
            label="Width"
            value={style.borderWidth}
            min={0} max={10} step={1} unit="px"
            onChange={(v) => onUpdate({ borderWidth: v })}
          />
          <AppleSlider
            label="Radius"
            value={style.borderRadius}
            min={0} max={50} step={2} unit="px"
            onChange={(v) => onUpdate({ borderRadius: v })}
          />
        </div>

        {/* Separator */}
        <div className="h-px bg-white/6" />

        <AppleSlider
          label="Glass Blur"
          value={style.blurAmount}
          min={0} max={40} step={2} unit="px"
          onChange={(v) => onUpdate({ blurAmount: v })}
        />
      </div>
    </div>
  );
};

export default WidgetStyleEditor;
