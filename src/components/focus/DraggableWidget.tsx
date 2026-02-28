import React, { useRef, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, Minus, Plus, Settings2 } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { useResizable, ResizeDirection } from "@/hooks/useResizable";
import { useWidgetStyle } from "@/hooks/useWidgetStyle";
import { useStyleEditorCallback, useStyleEditorTarget } from "./StyleEditorContext";

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
  headerActions?: React.ReactNode;
  overflowVisible?: boolean;
}

const GRID = 40;

const CURSOR_MAP: Record<ResizeDirection, string> = {
  n: "ns-resize", s: "ns-resize",
  e: "ew-resize", w: "ew-resize",
  ne: "nesw-resize", sw: "nesw-resize",
  nw: "nwse-resize", se: "nwse-resize",
};

const ResizeHandle = ({
  dir,
  onPointerDown,
}: {
  dir: ResizeDirection;
  onPointerDown: (e: React.PointerEvent, dir: ResizeDirection) => void;
}) => {
  const isCorner = dir.length === 2;
  const posStyle: React.CSSProperties = (() => {
    const SIZE = isCorner ? 10 : 6;
    const OFFSET = isCorner ? -5 : -3;
    const base: React.CSSProperties = {
      position: "absolute",
      cursor: CURSOR_MAP[dir],
      pointerEvents: "auto",
      zIndex: 10,
    };
    if (isCorner) {
      if (dir === "nw") return { ...base, top: OFFSET, left: OFFSET, width: SIZE, height: SIZE };
      if (dir === "ne") return { ...base, top: OFFSET, right: OFFSET, width: SIZE, height: SIZE };
      if (dir === "sw") return { ...base, bottom: OFFSET, left: OFFSET, width: SIZE, height: SIZE };
      if (dir === "se") return { ...base, bottom: OFFSET, right: OFFSET, width: SIZE, height: SIZE };
    } else {
      if (dir === "n") return { ...base, top: OFFSET, left: "25%", right: "25%", height: SIZE };
      if (dir === "s") return { ...base, bottom: OFFSET, left: "25%", right: "25%", height: SIZE };
      if (dir === "w") return { ...base, top: "25%", bottom: "25%", left: OFFSET, width: SIZE };
      if (dir === "e") return { ...base, top: "25%", bottom: "25%", right: OFFSET, width: SIZE };
    }
    return base;
  })();

  return (
    <div
      style={posStyle}
      onPointerDown={(e) => onPointerDown(e, dir)}
      className="group"
    >
      {isCorner ? (
        <div
          style={{ width: "100%", height: "100%" }}
          className="rounded-full bg-primary/70 border border-primary/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        />
      ) : (
        <div
          style={{ width: "100%", height: "100%" }}
          className="rounded-full bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        />
      )}
    </div>
  );
};

/** Convert hex to rgba with alpha */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return "transparent";
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "transparent";
  return `rgba(${r},${g},${b},${alpha})`;
}

const DraggableWidget = ({
  id, title, children, defaultPosition, defaultSize, className = "", hideHeader = false, scrollable = false, fontSizeControl, autoHeight = false, onEditAction, containerStyle, headerActions, overflowVisible = false,
}: DraggableWidgetProps) => {
  const { widgetPositions, updateWidgetPosition, toggleWidget, getWidgetOpacity, setWidgetOpacity, widgetMinimalMode, systemMode } = useFocusStore();
  const openStyleEditor = useStyleEditorCallback();
  const styleEditorTarget = useStyleEditorTarget();
  const isBeingEdited = !!styleEditorTarget && styleEditorTarget === id;
  const isEditingOther = !!styleEditorTarget && styleEditorTarget !== id;
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
  const offset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showOpacity, setShowOpacity] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false); // kept for non-focus-mode toggle tracking
  const [isHovered, setIsHovered] = useState(false);

  const opacity = getWidgetOpacity(id);
  const textDark = opacity > 0.55;
  const textClass = textDark ? "focus-widget-light" : "";

  // Widget style from hook
  const { style: widgetStyle, update: updateWidgetStyle, reset: resetWidgetStyle } = useWidgetStyle(id);

  const posRef = useRef(pos);
  posRef.current = pos;

  const onPointerDownDrag = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  const { onPointerDownResize } = useResizable({
    pos,
    minW: 220,
    minH: 160,
    onUpdate: (updates) => updateWidgetPosition(id, updates),
    enabled: isBuildMode,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current) {
        e.preventDefault();
        const nx = e.clientX - offset.current.x;
        const ny = e.clientY - offset.current.y;
        updateWidgetPosition(id, { x: nx, y: ny });
      }
    };

    const onUp = () => {
      if (dragging.current) {
        if (isBuildMode) {
          updateWidgetPosition(id, {
            x: Math.round(posRef.current.x / GRID) * GRID,
            y: Math.round(posRef.current.y / GRID) * GRID,
          });
        }
        dragging.current = false;
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

  // Compute styled background
  const hasCustomBg = !!widgetStyle.backgroundColor;
  const customBgColor = hasCustomBg
    ? hexToRgba(widgetStyle.backgroundColor, widgetStyle.backgroundOpacity / 100)
    : undefined;

  // Fallback to legacy opacity system if no custom style
  const isGlass = !hasCustomBg && opacity < 0.01;
  const bgAlpha = isGlass ? 0 : 0.1 + opacity * 0.8;
  const borderAlpha = isGlass ? 0 : 0.2 + opacity * 0.4;

  // True transparency: 0% opacity or no bg = fully transparent
  const isFullyTransparent = hasCustomBg && widgetStyle.backgroundOpacity === 0;

  const effectiveBg = isFullyTransparent
    ? "transparent"
    : hasCustomBg
      ? customBgColor
      : (isGlass ? "transparent" : `rgba(255,255,255,${bgAlpha})`);

  const bdrOpacity = (widgetStyle.borderOpacity ?? 100) / 100;
  const effectiveBorder = widgetStyle.borderColor
    ? hexToRgba(widgetStyle.borderColor, bdrOpacity)
    : (isGlass ? "transparent" : `rgba(255,255,255,${borderAlpha * bdrOpacity})`);

  // Blur: only apply when user explicitly set it > 0 via style editor, or legacy non-glass
  // 0% background opacity = no blur at all
  const zeroBgOpacity = hasCustomBg && widgetStyle.backgroundOpacity === 0;
  const userSetBlur = widgetStyle.blurAmount > 0;
  const effectiveBlur = (isFullyTransparent || zeroBgOpacity || isGlass)
    ? (userSetBlur && !zeroBgOpacity ? `blur(${widgetStyle.blurAmount}px)` : "none")
    : userSetBlur
      ? `blur(${widgetStyle.blurAmount}px)`
      : (hasCustomBg ? "none" : "blur(16px)");

  const effectiveRadius = `${widgetStyle.borderRadius}px`;

  const iconColor = textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)";
  const activeIconBg = textDark ? "bg-black/10" : "bg-white/15";

  const showHeader = !isFocusMode && !hideHeader && !widgetMinimalMode;
  const showResize = isBuildMode && !widgetMinimalMode;
  const showCorners = isBuildMode && !widgetMinimalMode;

  const ALL_DIRS: ResizeDirection[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  const widgetContent = (
    <motion.div
      data-widget-id={id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isEditingOther ? 0.15 : 1,
        scale: isEditingOther ? 0.98 : 1,
        filter: isEditingOther ? "blur(4px)" : "none",
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`${isBeingEdited ? "fixed" : "absolute"} ${isDragging ? "cursor-grabbing select-none" : ""} ${textClass} ${className}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        ...(autoHeight ? {} : { height: pos.h }),
        pointerEvents: isEditingOther ? "none" : "auto",
        zIndex: containerStyle?.zIndex ?? (isBeingEdited ? 65 : 50),
        ...containerStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Build mode selection ring */}
      {isBuildMode && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: effectiveRadius, border: "1px solid rgba(255,255,255,0.2)" }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Build mode drag handle */}
      {isBuildMode && (
        <div
          className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 px-3 py-1 rounded-b-lg bg-white/10 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none border border-t-0 border-white/15"
          style={{ pointerEvents: "auto" }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={onPointerDownDrag}
        >
          <GripHorizontal size={14} className="text-white/50" />
          <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">{title}</span>
        </div>
      )}

      {/* 8-point resize handles */}
      <AnimatePresence>
        {showResize && (
          <motion.div
            key="resize-handles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none"
          >
            {ALL_DIRS.map((dir) => (
              <ResizeHandle key={dir} dir={dir} onPointerDown={onPointerDownResize} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`w-full h-full flex flex-col ${widgetMinimalMode || isFullyTransparent || (isGlass && !hasCustomBg) ? "" : (isFocusMode ? "shadow-lg" : "shadow-2xl")} ${overflowVisible ? "overflow-visible" : "overflow-hidden"}`}
        style={{
          background: widgetMinimalMode ? "transparent" : effectiveBg,
          borderWidth: widgetMinimalMode ? 0 : (widgetStyle.borderWidth || (isGlass && !hasCustomBg ? 0 : 1)),
          borderStyle: widgetStyle.borderStyle === "none" ? "none" : (widgetStyle.borderStyle || "solid"),
          borderColor: widgetMinimalMode ? "transparent" : effectiveBorder,
          borderRadius: widgetMinimalMode ? 0 : effectiveRadius,
          backdropFilter: widgetMinimalMode ? "none" : effectiveBlur,
          WebkitBackdropFilter: widgetMinimalMode ? "none" : effectiveBlur,
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
                onMouseDown={(e) => e.stopPropagation()}
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
                  {/* Extra actions injected by parent (e.g. calendar icon) */}
                  {headerActions && (
                    <div onPointerDown={(e) => e.stopPropagation()} className="flex items-center gap-1">
                      {headerActions}
                    </div>
                  )}
                  {/* Build mode: gear + close */}
                  {isBuildMode && (
                    <>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          if (openStyleEditor) openStyleEditor(id);
                          setShowOpacity(false);
                          setShowFontSize(false);
                        }}
                        className="p-1 rounded-lg transition-colors bg-white/10 hover:bg-white/20"
                        style={{ color: iconColor }}
                        title="Widget Style"
                      >
                        <Settings2 size={14} />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => toggleWidget(id)}
                        className="p-1 rounded-lg transition-colors bg-white/10 hover:bg-red-500/30"
                        style={{ color: iconColor }}
                        title="Remove widget"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                  {/* Non-build mode controls */}
                  {!isBuildMode && (
                    <>
                      {fontSizeControl && (
                        <button
                          onClick={() => { setShowFontSize(!showFontSize); setShowOpacity(false); setShowStyleEditor(false); }}
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
                        onClick={() => { setShowOpacity(!showOpacity); setShowFontSize(false); setShowStyleEditor(false); }}
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
                    </>
                  )}

                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Style editor removed — now rendered in FocusDashboardView as Focus Mode overlay */}

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

        <div
          className={`flex-1 ${scrollable ? "overflow-auto council-hidden-scrollbar" : overflowVisible ? "overflow-visible" : "overflow-hidden"} px-3 ${isFocusMode ? "py-3" : "py-2"} ${widgetMinimalMode || isFocusMode ? "cursor-grab active:cursor-grabbing" : ""} ${widgetStyle.glassEffect ? "widget-glass-text" : ""} ${widgetStyle.depthShadow ? "widget-depth-shadow" : ""}`}
          style={{
            color: widgetStyle.textColor || "inherit",
            opacity: (widgetStyle.textOpacity ?? 100) / 100,
            fontFamily: widgetStyle.fontFamily || undefined,
            fontSize: widgetStyle.fontSize ? `${widgetStyle.fontSize}px` : undefined,
            "--widget-glass-gradient": `linear-gradient(135deg, ${widgetStyle.textColor || "rgba(255,255,255,1)"} 0%, rgba(255,255,255,0.35) 50%, ${widgetStyle.textColor || "rgba(255,255,255,1)"} 100%)`,
          } as React.CSSProperties}
          onPointerDown={(widgetMinimalMode || isFocusMode) ? onPointerDownDrag : undefined}
        >
          {children}
        </div>

        {/* Build mode corner dots */}
        <AnimatePresence>
          {showCorners && (
            <motion.div
              key="corners"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none"
            >
              {[
                "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
                "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full bg-primary/40 border border-primary/60 ${cls}`}
                  style={{ pointerEvents: "none" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  // Portal the widget to document.body when being edited so it escapes the z-20 parent stacking context
  if (isBeingEdited) {
    return createPortal(widgetContent, document.body);
  }

  return widgetContent;
};

export default DraggableWidget;
