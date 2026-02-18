import React, { useRef, useCallback, useState, useEffect } from "react";
import { X, GripHorizontal, Minus, Plus, Settings2 } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";

interface FontSizeControl {
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
}

interface DraggableWidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { w: number; h: number };
  className?: string;
  hideHeader?: boolean;
  scrollable?: boolean;
  fontSizeControl?: FontSizeControl;
  autoHeight?: boolean;
  onEditAction?: () => void;
  containerStyle?: React.CSSProperties;
}

const GRID = 40;

const DraggableWidget = ({
  id, title, children, defaultPosition, defaultSize, className = "", hideHeader = false, scrollable = false, fontSizeControl, autoHeight = false, onEditAction, containerStyle,
}: DraggableWidgetProps) => {
  const { widgetPositions, updateWidgetPosition, toggleWidget, getWidgetOpacity, setWidgetOpacity, widgetMinimalMode, systemMode } = useFocusStore();
  const isBuildMode = systemMode === "build";
  const isFocusMode = systemMode === "focus";
  const defW = defaultSize?.w ?? 380;
  const defH = defaultSize?.h ?? 300;
  const rawPos = widgetPositions[id] || {
    x: defaultPosition?.x ?? 100,
    y: defaultPosition?.y ?? 100,
    w: defW,
    h: defH,
  };

  const safeW = (!rawPos.w || isNaN(rawPos.w) || rawPos.w < 200) ? defW : rawPos.w;
  const safeH = (!rawPos.h || isNaN(rawPos.h) || rawPos.h < 150) ? defH : rawPos.h;

  const maxX = typeof window !== "undefined" ? Math.max(0, window.innerWidth - safeW) : 1400;
  const maxY = typeof window !== "undefined" ? Math.max(0, window.innerHeight - safeH) : 800;
  const rawX = isNaN(rawPos.x) || !isFinite(rawPos.x) ? (defaultPosition?.x ?? 100) : rawPos.x;
  const rawY = isNaN(rawPos.y) || !isFinite(rawPos.y) ? (defaultPosition?.y ?? 100) : rawPos.y;
  const pos = {
    x: Math.max(0, Math.min(rawX, maxX)),
    y: Math.max(0, Math.min(rawY, maxY)),
    w: safeW,
    h: safeH,
  };

  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showOpacity, setShowOpacity] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const opacity = getWidgetOpacity(id);
  const textDark = opacity > 0.55;
  const textClass = textDark ? "focus-widget-light" : "";

  const posRef = useRef(pos);
  posRef.current = pos;

  const onPointerDownDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  const onPointerDownResize = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    resizing.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current || resizing.current) {
        e.preventDefault();
      }
      if (dragging.current) {
        const nx = e.clientX - offset.current.x;
        const ny = e.clientY - offset.current.y;
        updateWidgetPosition(id, { x: nx, y: ny });
      }
      if (resizing.current) {
        const dx = e.clientX - offset.current.x;
        const dy = e.clientY - offset.current.y;
        offset.current = { x: e.clientX, y: e.clientY };
        updateWidgetPosition(id, {
          w: Math.max(280, posRef.current.w + dx),
          h: Math.max(200, posRef.current.h + dy),
        });
      }
    };

    const onUp = () => {
      if (dragging.current || resizing.current) {
        // Snap to grid on drop in build mode
        if (isBuildMode && dragging.current) {
          updateWidgetPosition(id, {
            x: Math.round(posRef.current.x / GRID) * GRID,
            y: Math.round(posRef.current.y / GRID) * GRID,
          });
        }
        dragging.current = false;
        resizing.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [id, isBuildMode, updateWidgetPosition]);

  const isGlass = opacity < 0.01;
  const bgAlpha = isGlass ? 0 : 0.1 + opacity * 0.8;
  const borderAlpha = isGlass ? 0 : 0.2 + opacity * 0.4;
  const blurClass = isGlass ? "" : "backdrop-blur-[16px]";

  const iconColor = textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)";
  const activeIconBg = textDark ? "bg-black/10" : "bg-white/15";

  // In focus mode: no chrome, minimal shadow
  const showHeader = !isFocusMode && !hideHeader && !widgetMinimalMode;
  const showResize = !isFocusMode && !widgetMinimalMode;
  const showCorners = isBuildMode && !widgetMinimalMode;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}

      className={`absolute z-50 ${isDragging ? "cursor-grabbing select-none" : ""} ${textClass} ${className} ${
        isBuildMode ? "rounded-2xl" : ""
      }`}
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        ...(autoHeight ? {} : { height: pos.h }),
        pointerEvents: "none",
        ...containerStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Build mode: pulsing ring */}
      {isBuildMode && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: "1px solid rgba(255,255,255,0.2)" }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Build mode: prominent drag handle overlay */}
      {isBuildMode && (
        <div
          className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 px-3 py-1 rounded-b-lg bg-white/10 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none border border-t-0 border-white/15"
          style={{ pointerEvents: "auto" }}
          onPointerDown={onPointerDownDrag}
        >
          <GripHorizontal size={14} className="text-white/50" />
          <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">{title}</span>
        </div>
      )}

      <div
        className={`w-full h-full flex flex-col ${widgetMinimalMode ? "" : `rounded-2xl ${blurClass} ${isGlass ? "" : (isFocusMode ? "shadow-lg" : "shadow-2xl")}`} overflow-hidden`}
        style={{
          background: widgetMinimalMode ? "transparent" : (isGlass ? "transparent" : `rgba(255,255,255,${bgAlpha})`),
          borderWidth: widgetMinimalMode ? 0 : (isGlass ? 0 : 1),
          borderStyle: "solid",
          borderColor: widgetMinimalMode ? "transparent" : (isGlass ? "transparent" : `rgba(255,255,255,${borderAlpha})`),
          pointerEvents: "auto",
        }}
      >
        <AnimatePresence>
          {showHeader && (
            <motion.div
              key="header"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 py-2.5 cursor-grab active:cursor-grabbing select-none"
                style={{ borderBottom: `1px solid rgba(${textDark ? "0,0,0" : "255,255,255"},0.1)` }}
                onPointerDown={onPointerDownDrag}
              >
                <div className="flex items-center gap-2">
                  <GripHorizontal size={14} style={{ color: textDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-medium" style={{ color: textDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)" }}>{title}</span>
                </div>
                <motion.div
                  className="flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered || isBuildMode ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {onEditAction && isBuildMode && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onEditAction}
                      className="p-1 rounded-lg transition-colors bg-white/10 hover:bg-white/20"
                      style={{ color: iconColor }}
                      title="Edit"
                    >
                      <Settings2 size={14} />
                    </button>
                  )}
                  {fontSizeControl && (
                    <button
                      onClick={() => { setShowFontSize(!showFontSize); setShowOpacity(false); }}
                      className={`p-1 rounded-lg transition-colors ${showFontSize ? activeIconBg : ""}`}
                      style={{ color: iconColor }}
                      title="Adjust text size"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <text x="2" y="17" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none">A</text>
                        <text x="14" y="17" fontSize="10" fill="currentColor" stroke="none">A</text>
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => { setShowOpacity(!showOpacity); setShowFontSize(false); }}
                    className={`p-1 rounded-lg transition-colors ${showOpacity ? activeIconBg : ""}`}
                    style={{ color: iconColor }}
                    title="Adjust opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor" opacity="0.3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleWidget(id)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: iconColor }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showFontSize && fontSizeControl && !widgetMinimalMode && !isFocusMode && (
          <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(${textDark ? "0,0,0" : "255,255,255"},0.08)` }}>
            <span className="text-[10px] font-medium shrink-0" style={{ color: textDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)" }}>Size</span>
            <button
              onClick={() => fontSizeControl.set(Math.max(fontSizeControl.min, fontSizeControl.value - fontSizeControl.step))}
              className="p-1 rounded-md bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <Minus size={12} />
            </button>
            <span className="text-[10px] tabular-nums w-8 text-center" style={{ color: textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)" }}>
              {fontSizeControl.value}px
            </span>
            <button
              onClick={() => fontSizeControl.set(Math.min(fontSizeControl.max, fontSizeControl.value + fontSizeControl.step))}
              className="p-1 rounded-md bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <Plus size={12} />
            </button>
          </div>
        )}

        {showOpacity && !widgetMinimalMode && !isFocusMode && (
          <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(${textDark ? "0,0,0" : "255,255,255"},0.08)` }}>
            <span className="text-[10px] font-medium shrink-0" style={{ color: textDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)" }}>Opacity</span>
            <Slider
              value={[opacity]}
              onValueChange={([v]) => setWidgetOpacity(id, v)}
              min={0}
              max={1}
              step={0.05}
              className={`flex-1 ${textDark
                ? "[&_[data-radix-slider-track]]:bg-black/10 [&_[data-radix-slider-range]]:bg-black/30 [&_[data-radix-slider-thumb]]:bg-black/60 [&_[data-radix-slider-thumb]]:border-black/20"
                : "[&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-white/30 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white/40"
              } [&_[data-radix-slider-thumb]]:w-3 [&_[data-radix-slider-thumb]]:h-3`}
            />
            <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)" }}>
              {Math.round(opacity * 100)}%
            </span>
          </div>
        )}

        <div className={`flex-1 ${scrollable ? "overflow-auto council-hidden-scrollbar" : "overflow-hidden"} px-3 ${isFocusMode ? "py-3" : "py-2"} ${widgetMinimalMode || isFocusMode ? "cursor-grab active:cursor-grabbing" : ""}`}
          onPointerDown={(widgetMinimalMode || isFocusMode) ? onPointerDownDrag : undefined}
        >
          {children}
        </div>

        {/* Resize handle */}
        <AnimatePresence>
          {showResize && (
            <motion.div
              key="resize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute bottom-0 right-0 cursor-nwse-resize ${isBuildMode ? "w-10 h-10" : "w-7 h-7"}`}
              style={{ pointerEvents: "auto" }}
              onPointerDown={onPointerDownResize}
            >
              {isBuildMode ? (
                <div className="w-full h-full flex items-end justify-end p-0.5">
                  <div className="w-3 h-3 rounded-sm border-r-2 border-b-2 border-white/40" />
                </div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ color: textDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)" }}>
                  <path d="M14 16L16 14M9 16L16 9M4 16L16 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Build mode: corner dots */}
        <AnimatePresence>
          {showCorners && (
            <motion.div
              key="corners"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-white/20 border border-white/30 -translate-x-1/2 -translate-y-1/2" style={{ pointerEvents: "none" }} />
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white/20 border border-white/30 translate-x-1/2 -translate-y-1/2" style={{ pointerEvents: "none" }} />
              <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-white/20 border border-white/30 -translate-x-1/2 translate-y-1/2" style={{ pointerEvents: "none" }} />
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-white/30 border border-white/40 translate-x-1/2 translate-y-1/2" style={{ pointerEvents: "none" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DraggableWidget;
