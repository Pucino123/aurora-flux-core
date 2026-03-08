import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { X, MoreHorizontal, Maximize2, PanelLeft, PanelRight, Square, Minus } from "lucide-react";
import { useWindowManager, AppWindow, WindowLayout } from "@/context/WindowManagerContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WindowFrameProps {
  window: AppWindow;
  children: React.ReactNode;
}

const LAYOUT_OPTIONS: { label: string; value: WindowLayout; icon: React.ReactNode }[] = [
  { label: "Float",        value: "floating",    icon: <Square    size={13} /> },
  { label: "Full Screen",  value: "fullscreen",  icon: <Maximize2 size={13} /> },
  { label: "Split Left",   value: "split-left",  icon: <PanelLeft  size={13} /> },
  { label: "Split Right",  value: "split-right", icon: <PanelRight size={13} /> },
];

const SNAP_THRESHOLD = 100;
const MIN_W = 320;
const MIN_H = 240;
const DEFAULT_W = 820;
const DEFAULT_H = 620;

// Snappier spring — much less lag on float drag
const DRAG_SPRING = { stiffness: 520, damping: 36, mass: 0.45 };

// Layout pill indicator color (uses CSS vars via inline style so no hardcoded Tailwind colors)
const LAYOUT_PILL_BG: Record<WindowLayout, string> = {
  floating:    "hsl(142 71% 45%)",
  fullscreen:  "hsl(217 91% 60%)",
  "split-left":  "hsl(270 76% 65%)",
  "split-right": "hsl(270 76% 65%)",
};

const WindowFrame = ({ window: win, children }: WindowFrameProps) => {
  const {
    closeWindow, setWindowLayout, updateWindowPosition,
    updateWindowSize, bringToFront, minimizeWindow,
  } = useWindowManager();

  const isFloating = win.layout === "floating";

  // Track previous layout so toggling fullscreen restores to it
  const prevLayoutRef = useRef<WindowLayout>(win.layout);
  // Remember exact position/size before going fullscreen
  const preFullscreenState = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── Spring-based position — snappier config ───────────────────────────────
  const rawX = useRef(win.position.x);
  const rawY = useRef(win.position.y);
  const motionX = useMotionValue(win.position.x);
  const motionY = useMotionValue(win.position.y);
  const springX = useSpring(motionX, DRAG_SPRING);
  const springY = useSpring(motionY, DRAG_SPRING);

  // Sync spring origin when position changes externally
  useEffect(() => {
    if (isFloating) {
      motionX.set(win.position.x);
      motionY.set(win.position.y);
      rawX.current = win.position.x;
      rawY.current = win.position.y;
    }
  }, [isFloating, win.position.x, win.position.y, motionX, motionY]);

  // ── Snap zone ──────────────────────────────────────────────────────────────
  const [snapZone, setSnapZone] = useState<"left" | "right" | null>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // ── Size state ─────────────────────────────────────────────────────────────
  const [size, setSize] = useState({ w: win.size?.w ?? DEFAULT_W, h: win.size?.h ?? DEFAULT_H });
  const resizing = useRef<string | null>(null);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  // ── Fullscreen toggle helpers ──────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    preFullscreenState.current = {
      x: rawX.current,
      y: rawY.current,
      w: size.w,
      h: size.h,
    };
    prevLayoutRef.current = win.layout;
    setWindowLayout(win.id, "fullscreen");
  }, [win.id, win.layout, setWindowLayout, size]);

  const exitFullscreen = useCallback(() => {
    const prev = preFullscreenState.current;
    const restoreLayout = prevLayoutRef.current === "fullscreen" ? "floating" : prevLayoutRef.current;
    setWindowLayout(win.id, restoreLayout);
    if (prev && restoreLayout === "floating") {
      // Restore exact position & size after layout change settles
      requestAnimationFrame(() => {
        motionX.set(prev.x);
        motionY.set(prev.y);
        rawX.current = prev.x;
        rawY.current = prev.y;
        updateWindowPosition(win.id, prev.x, prev.y);
        setSize({ w: prev.w, h: prev.h });
        updateWindowSize(win.id, prev.w, prev.h);
      });
    }
  }, [win.id, setWindowLayout, motionX, motionY, updateWindowPosition, updateWindowSize]);

  const toggleFullscreen = useCallback(() => {
    if (win.layout === "fullscreen") exitFullscreen();
    else enterFullscreen();
  }, [win.layout, enterFullscreen, exitFullscreen]);

  // ── Double-click header → toggle fullscreen ────────────────────────────────
  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    toggleFullscreen();
  }, [toggleFullscreen]);

  // ── DRAG handlers ─────────────────────────────────────────────────────────
  const handlePillPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isFloating) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    offset.current = { x: e.clientX - rawX.current, y: e.clientY - rawY.current };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isFloating]);

  const handlePillPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const nx = e.clientX - offset.current.x;
    const ny = Math.max(0, e.clientY - offset.current.y);
    rawX.current = nx;
    rawY.current = ny;
    motionX.set(nx);
    motionY.set(ny);
    if (e.clientX < SNAP_THRESHOLD) setSnapZone("left");
    else if (e.clientX > window.innerWidth - SNAP_THRESHOLD) setSnapZone("right");
    else setSnapZone(null);
  }, [motionX, motionY]);

  const handlePillPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (snapZone) {
      setWindowLayout(win.id, snapZone === "left" ? "split-left" : "split-right");
    } else {
      updateWindowPosition(win.id, rawX.current, rawY.current);
    }
    setSnapZone(null);
  }, [win.id, updateWindowPosition, setWindowLayout, snapZone]);

  // ── RESIZE handlers ────────────────────────────────────────────────────────
  const handleResizePointerDown = useCallback((e: React.PointerEvent, dir: string) => {
    if (!isFloating) return;
    e.stopPropagation();
    e.preventDefault();
    resizing.current = dir;
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, w: size.w, h: size.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isFloating, size]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizing.current) return;
      e.preventDefault();
      const { mouseX, mouseY, w, h } = resizeStart.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      let nw = w, nh = h;
      if (resizing.current.includes("e")) nw = Math.max(MIN_W, w + dx);
      if (resizing.current.includes("s")) nh = Math.max(MIN_H, h + dy);
      setSize({ w: nw, h: nh });
    };
    const onUp = (e: PointerEvent) => {
      if (!resizing.current) return;
      const { mouseX, mouseY, w, h } = resizeStart.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      let nw = w, nh = h;
      if (resizing.current.includes("e")) nw = Math.max(MIN_W, w + dx);
      if (resizing.current.includes("s")) nh = Math.max(MIN_H, h + dy);
      resizing.current = null;
      updateWindowSize(win.id, nw, nh);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [win.id, updateWindowSize]);

  // ── Layout classes ─────────────────────────────────────────────────────────
  const layoutClasses = useMemo(() => {
    const base = "absolute rounded-2xl shadow-2xl bg-card/90 backdrop-blur-2xl border border-border/20 overflow-hidden flex flex-col";
    switch (win.layout) {
      case "floating":    return base;
      case "fullscreen":  return `${base} inset-4`;
      case "split-left":  return `${base} top-4 left-4 bottom-4 w-[calc(50%-1.25rem)]`;
      case "split-right": return `${base} top-4 right-4 bottom-4 w-[calc(50%-1.25rem)]`;
      default:            return base;
    }
  }, [win.layout]);

  const posStyle = useMemo<React.CSSProperties>(() => {
    if (win.layout !== "floating") return {};
    return { width: size.w, height: size.h };
  }, [win.layout, size.w, size.h]);

  // ── Minimized: ghost div that flies toward dock ────────────────────────────
  if (win.minimized) {
    return (
      <motion.div
        layoutId={`window-${win.id}`}
        className="absolute rounded-2xl bg-card/90 backdrop-blur-2xl border border-border/20 overflow-hidden pointer-events-none"
        initial={false}
        animate={{ opacity: 0, scale: 0.12, y: "85vh" }}
        transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
        style={{
          zIndex: win.zIndex,
          left: rawX.current,
          top: rawY.current,
          width: size.w,
          height: 48,
        }}
      />
    );
  }

  const layoutPillColor = LAYOUT_PILL_COLORS[win.layout];

  return (
    <>
      {/* ── Snap zone overlay ───────────────────────────────────────────────── */}
      {snapZone && dragging.current && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9990] flex">
          <AnimatePresence>
            {snapZone === "left" && (
              <motion.div
                key="snap-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-full rounded-2xl m-3"
                style={{
                  width: "calc(50% - 20px)",
                  background: "hsl(var(--primary) / 0.14)",
                  border: "2px solid hsl(var(--primary) / 0.55)",
                  boxShadow: "inset 0 0 40px hsl(var(--primary) / 0.08)",
                }}
              />
            )}
            {snapZone === "right" && (
              <motion.div
                key="snap-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="h-full rounded-2xl m-3 ml-auto"
                style={{
                  width: "calc(50% - 20px)",
                  background: "hsl(var(--primary) / 0.14)",
                  border: "2px solid hsl(var(--primary) / 0.55)",
                  boxShadow: "inset 0 0 40px hsl(var(--primary) / 0.08)",
                }}
              />
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* ── Window frame ────────────────────────────────────────────────────── */}
      <motion.div
        layoutId={`window-${win.id}`}
        layout={win.layout !== "floating"}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className={`${layoutClasses} select-none`}
        style={{
          zIndex: win.zIndex,
          ...(isFloating ? { x: springX, y: springY, ...posStyle } : {}),
        }}
        onPointerDownCapture={() => bringToFront(win.id)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div
          className="relative flex items-center px-3 py-2 border-b border-border/20 shrink-0 h-9"
          onDoubleClick={handleHeaderDoubleClick}
        >
          {/* Traffic-light + layout indicator */}
          <div className="flex items-center gap-1.5 z-[62]">
            {/* Red — close */}
            <button
              onClick={() => closeWindow(win.id)}
              className="group w-3.5 h-3.5 rounded-full bg-red-500/60 hover:bg-red-500 transition-colors flex items-center justify-center"
              title="Close (⌘W)"
            >
              <X size={7} className="opacity-0 group-hover:opacity-100 text-red-900" />
            </button>

            {/* Amber — minimize */}
            <button
              onClick={() => minimizeWindow(win.id)}
              className="group w-3.5 h-3.5 rounded-full bg-amber-400/60 hover:bg-amber-400 transition-colors flex items-center justify-center"
              title="Minimize (⌘M)"
            >
              <Minus size={7} className="opacity-0 group-hover:opacity-100 text-amber-900" />
            </button>

            {/* Green — fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="group w-3.5 h-3.5 rounded-full bg-emerald-500/60 hover:bg-emerald-500 transition-colors flex items-center justify-center"
              title={win.layout === "fullscreen" ? "Restore" : "Full Screen"}
            >
              <Maximize2 size={7} className="opacity-0 group-hover:opacity-100 text-emerald-900" />
            </button>

            {/* Layout mode indicator pill — shows current layout with color */}
            <span
              className={`inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide opacity-70 ${layoutPillColor} text-black/80`}
              title={`Layout: ${win.layout}`}
            >
              {win.layout === "floating"     && "float"}
              {win.layout === "fullscreen"   && "full"}
              {win.layout === "split-left"   && "⬤ left"}
              {win.layout === "split-right"  && "right ⬤"}
            </span>
          </div>

          {/* Title */}
          <span
            className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground/70 truncate max-w-[40%] pointer-events-none select-none"
            title="Double-click to toggle fullscreen"
          >
            {win.title}
          </span>

          {/* ── Drag pill + layout menu ───────────────────────────────────── */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 top-1 flex items-center justify-center w-10 h-[18px] bg-foreground/8 hover:bg-foreground/15 rounded-full transition-colors z-[60] ${isFloating ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
            onPointerDown={handlePillPointerDown}
            onPointerMove={handlePillPointerMove}
            onPointerUp={handlePillPointerUp}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center w-full h-full rounded-full"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={11} className="text-foreground/40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={8} className="z-[9999] min-w-[160px]">
                {LAYOUT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => {
                      if (opt.value === "fullscreen" && win.layout !== "fullscreen") enterFullscreen();
                      else if (opt.value !== "fullscreen" && win.layout === "fullscreen") {
                        // restore then switch
                        prevLayoutRef.current = opt.value;
                        exitFullscreen();
                      } else {
                        setWindowLayout(win.id, opt.value);
                      }
                    }}
                    className={`flex items-center gap-2.5 text-xs ${win.layout === opt.value ? "text-primary font-semibold" : ""}`}
                  >
                    {opt.icon}
                    {opt.label}
                    {win.layout === opt.value && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => minimizeWindow(win.id)} className="flex items-center gap-2.5 text-xs">
                  <Minus size={13} /> Minimize <span className="ml-auto text-foreground/30">⌘M</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => closeWindow(win.id)}
                  className="flex items-center gap-2.5 text-xs text-destructive focus:text-destructive"
                >
                  <X size={13} /> Close Window <span className="ml-auto text-foreground/30">⌘W</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden select-text pointer-events-auto">
          {children}
        </div>

        {/* ── Resize handles ──────────────────────────────────────────────── */}
        {isFloating && (
          <>
            <div
              className="absolute top-0 right-0 w-1.5 h-full cursor-e-resize z-[70] hover:bg-primary/15 transition-colors"
              onPointerDown={(e) => handleResizePointerDown(e, "e")}
            />
            <div
              className="absolute bottom-0 left-0 h-1.5 w-full cursor-s-resize z-[70] hover:bg-primary/15 transition-colors"
              onPointerDown={(e) => handleResizePointerDown(e, "s")}
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[71] flex items-end justify-end pr-0.5 pb-0.5"
              onPointerDown={(e) => handleResizePointerDown(e, "se")}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/25">
                <path d="M10 0 L10 10 L0 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10 4 L10 10 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
};

export default WindowFrame;
