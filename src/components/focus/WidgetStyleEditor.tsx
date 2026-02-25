import React, { useRef, useState, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, GripHorizontal } from "lucide-react";
import type { WidgetStyle } from "@/hooks/useWidgetStyle";

const PRESET_COLORS = [
  "", "#ffffff", "#000000", "#1a1a2e", "#16213e",
  "#0f3460", "#533483", "#e94560", "#f5a623",
  "#4ecdc4", "#2ecc71", "#3498db", "#9b59b6",
];

interface WidgetStyleEditorProps {
  style: WidgetStyle;
  onUpdate: (updates: Partial<WidgetStyle>) => void;
  onReset: () => void;
}

const ColorRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) => (
  <div className="space-y-1.5">
    <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{label}</span>
    <div className="flex flex-wrap gap-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c || "none"}
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-md border transition-all duration-150 hover:scale-110 ${
            value === c ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent" : "border-white/15"
          }`}
          style={{
            backgroundColor: c || "transparent",
            backgroundImage: c ? undefined : "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)",
            backgroundSize: c ? undefined : "6px 6px",
            backgroundPosition: c ? undefined : "0 0, 3px 3px",
          }}
        />
      ))}
      <label className="w-5 h-5 rounded-md border border-white/15 overflow-hidden cursor-pointer relative hover:scale-110 transition-transform">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="w-full h-full"
          style={{
            background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
          }}
        />
      </label>
    </div>
  </div>
);

const SliderRow = ({
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
      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] tabular-nums text-white/30">
        {Math.round(value)}{unit}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      className="[&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-primary/60 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white/40 [&_[data-radix-slider-thumb]]:w-3 [&_[data-radix-slider-thumb]]:h-3"
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
      className="w-64 rounded-xl overflow-hidden"
      style={{
        transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
        background: "rgba(20, 20, 35, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 16px 48px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Draggable title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onDragStart}
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal size={12} className="text-white/40" />
          <span className="text-[11px] font-semibold text-white/70">Widget Style</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[360px] overflow-y-auto council-hidden-scrollbar">
        <ColorRow
          label="Background Color"
          value={style.backgroundColor}
          onChange={(c) => onUpdate({ backgroundColor: c })}
        />

        <SliderRow
          label="Background Opacity"
          value={style.backgroundOpacity}
          min={0} max={100} step={5} unit="%"
          onChange={(v) => onUpdate({ backgroundOpacity: v })}
        />

        <ColorRow
          label="Text Color"
          value={style.textColor}
          onChange={(c) => onUpdate({ textColor: c })}
        />

        <ColorRow
          label="Border Color"
          value={style.borderColor}
          onChange={(c) => onUpdate({ borderColor: c })}
        />

        <SliderRow
          label="Border Width"
          value={style.borderWidth}
          min={0} max={10} step={1} unit="px"
          onChange={(v) => onUpdate({ borderWidth: v })}
        />

        <SliderRow
          label="Border Radius"
          value={style.borderRadius}
          min={0} max={50} step={2} unit="px"
          onChange={(v) => onUpdate({ borderRadius: v })}
        />

        <SliderRow
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
