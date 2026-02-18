import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Palette, SlidersHorizontal, Layout } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { Slider } from "@/components/ui/slider";

const FONT_OPTIONS = [
  { id: "inter", label: "Sans", family: "'Inter', sans-serif" },
  { id: "playfair", label: "Serif", family: "'Playfair Display', serif" },
  { id: "jetbrains", label: "Mono", family: "'JetBrains Mono', monospace" },
  { id: "poppins", label: "Display", family: "'Poppins', sans-serif" },
  { id: "nunito", label: "Rounded", family: "'Nunito', sans-serif" },
  { id: "oswald", label: "Condensed", family: "'Oswald', sans-serif" },
];

const WEIGHT_OPTIONS = [
  { value: 200, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 700, label: "Bold" },
];

const COLOR_PRESETS = [
  { id: "white", value: "rgba(255,255,255,1)", label: "White" },
  { id: "warm", value: "rgba(255,220,180,1)", label: "Warm" },
  { id: "cool", value: "rgba(180,210,255,1)", label: "Cool" },
  { id: "aurora-violet", value: "hsl(270 80% 75%)", label: "Violet" },
  { id: "aurora-blue", value: "hsl(217 90% 70%)", label: "Blue" },
  { id: "emerald", value: "hsl(150 60% 55%)", label: "Emerald" },
  { id: "rose", value: "hsl(340 75% 65%)", label: "Rose" },
  { id: "amber", value: "hsl(38 90% 60%)", label: "Amber" },
  { id: "sky", value: "hsl(200 90% 70%)", label: "Sky" },
  { id: "lavender", value: "hsl(250 60% 75%)", label: "Lavender" },
];

const TIMEZONE_OPTIONS = [
  { value: "", label: "None" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
];

type EditorTab = "font" | "color" | "style" | "layout";

interface ClockEditorProps {
  onClose: () => void;
}

const ClockEditor = ({ onClose }: ClockEditorProps) => {
  const {
    clockFont, setClockFont,
    clockColor, setClockColor,
    clockWeight, setClockWeight,
    clockShowDate, setClockShowDate,
    clockShowSeconds, setClockShowSeconds,
    clockSecondaryTz, setClockSecondaryTz,
    clockGlassEffect, setClockGlassEffect,
    clockDepthShadow, setClockDepthShadow,
    clockFontSize, setClockFontSize,
  } = useFocusStore();

  const [tab, setTab] = useState<EditorTab>("font");

  const tabs = [
    { key: "font" as EditorTab, label: "Font", icon: Type },
    { key: "color" as EditorTab, label: "Color", icon: Palette },
    { key: "style" as EditorTab, label: "Style", icon: SlidersHorizontal },
    { key: "layout" as EditorTab, label: "Layout", icon: Layout },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl bg-black/60 backdrop-blur-[24px] border border-white/15 shadow-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex gap-1">
                {tabs.map(({ key, label, icon: Icon }: any) => (
              <button
                key={key}
                onClick={() => setTab(key as EditorTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  tab === key ? "bg-white/15 text-white" : "text-white/35 hover:text-white/60"
                }`}
              >
                <Icon size={13 as any} />
                {label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Tab content */}
        <div className="px-4 pb-4 pt-1">
          <AnimatePresence mode="wait">
            {tab === "font" && (
              <motion.div key="font" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                <div className="flex gap-2 overflow-x-auto pb-2 council-hidden-scrollbar">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setClockFont(f.id)}
                      className={`shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all ${
                        clockFont === f.id ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/40 hover:bg-white/5"
                      }`}
                    >
                      <span style={{ fontFamily: f.family, fontSize: "24px", fontWeight: clockWeight, color: clockColor }} className="tabular-nums">12</span>
                      <span className="text-[10px]">{f.label}</span>
                    </button>
                  ))}
                </div>
                {/* Size slider */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] text-white/30 w-8">Size</span>
                  <Slider
                    value={[clockFontSize]}
                    onValueChange={([v]) => setClockFontSize(v)}
                    min={30} max={120} step={2}
                    className="flex-1 [&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-white/30 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white/40 [&_[data-radix-slider-thumb]]:w-3 [&_[data-radix-slider-thumb]]:h-3"
                  />
                  <span className="text-[10px] text-white/25 tabular-nums w-8 text-right">{clockFontSize}</span>
                </div>
              </motion.div>
            )}

            {tab === "color" && (
              <motion.div key="color" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setClockColor(c.value)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                        clockColor === c.value ? "ring-2 ring-white/40 bg-white/5" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full border border-white/10" style={{ backgroundColor: c.value }} />
                      <span className="text-[9px] text-white/40">{c.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === "style" && (
              <motion.div key="style" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="space-y-3">
                {/* Weight */}
                <div>
                  <span className="text-[10px] text-white/30 mb-1.5 block">Weight</span>
                  <div className="flex gap-1.5">
                    {WEIGHT_OPTIONS.map((w) => (
                      <button
                        key={w.value}
                        onClick={() => setClockWeight(w.value)}
                        className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-medium transition-all ${
                          clockWeight === w.value ? "bg-white/15 text-white" : "text-white/35 hover:bg-white/5"
                        }`}
                        style={{ fontWeight: w.value }}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Effects */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setClockGlassEffect(!clockGlassEffect)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                      clockGlassEffect ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
                    }`}
                  >
                    Glass Effect
                  </button>
                  <button
                    onClick={() => setClockDepthShadow(!clockDepthShadow)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                      clockDepthShadow ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
                    }`}
                  >
                    Depth Shadow
                  </button>
                </div>
              </motion.div>
            )}

            {tab === "layout" && (
              <motion.div key="layout" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => setClockShowDate(!clockShowDate)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                      clockShowDate ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
                    }`}
                  >
                    Show Date
                  </button>
                  <button
                    onClick={() => setClockShowSeconds(!clockShowSeconds)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                      clockShowSeconds ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/35 hover:bg-white/5 border border-white/10"
                    }`}
                  >
                    Show Seconds
                  </button>
                </div>
                {/* Secondary timezone */}
                <div>
                  <span className="text-[10px] text-white/30 mb-1.5 block">Secondary Timezone</span>
                  <select
                    value={clockSecondaryTz}
                    onChange={(e) => setClockSecondaryTz(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl text-white text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-black text-white">{tz.label}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ClockEditor;
