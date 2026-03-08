import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal, Maximize2, PanelLeft, PanelRight, Square } from "lucide-react";
import { useWindowManager, AppWindow, WindowLayout } from "@/context/WindowManagerContext";
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
  { label: "Float", value: "floating", icon: <Square size={13} /> },
  { label: "Full Screen", value: "fullscreen", icon: <Maximize2 size={13} /> },
  { label: "Split Left", value: "split-left", icon: <PanelLeft size={13} /> },
  { label: "Split Right", value: "split-right", icon: <PanelRight size={13} /> },
];

const SNAP_THRESHOLD = 100; // px from edge to trigger snap
const MIN_W = 320;
const MIN_H = 240;
const DEFAULT_W = 820;
const DEFAULT_H = 620;

const WindowFrame = ({ window: win, children }: WindowFrameProps) => {
  const { closeWindow, setWindowLayout, updateWindowPosition, updateWindowSize, bringToFront } = useWindowManager();

  // ── Drag state ──────────────────────────────────────────────────────────────
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState(win.position);
  const [snapZone, setSnapZone] = useState<'left' | 'right' | null>(null);
  const isFloating = win.layout === "floating";

  // ── Size state ──────────────────────────────────────────────────────────────
  const [size, setSize] = useState({ w: win.size?.w ?? DEFAULT_W, h: win.size?.h ?? DEFAULT_H });
  const resizing = useRef<string | null>(null); // 'se' | 's' | 'e'
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  // Keep pos in sync when layout snaps back to floating
  useEffect(() => {
    if (isFloating) setPos(win.position);
  }, [isFloating, win.position.x, win.position.y]);

  // ── DRAG handlers ────────────────────────────────────────────────────────────
  const handlePillPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isFloating) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isFloating, pos.x, pos.y]);

  const handlePillPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const nx = e.clientX - offset.current.x;
    const ny = Math.max(0, e.clientY - offset.current.y);
    setPos({ x: nx, y: ny });
    // Snap zone detection
    if (e.clientX < SNAP_THRESHOLD) setSnapZone('left');
    else if (e.clientX > window.innerWidth - SNAP_THRESHOLD) setSnapZone('right');
    else setSnapZone(null);
  }, []);

  const handlePillPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const nx = e.clientX - offset.current.x;
    const ny = Math.max(0, e.clientY - offset.current.y);
    if (snapZone) {
      setWindowLayout(win.id, snapZone === 'left' ? 'split-left' : 'split-right');
    } else {
      updateWindowPosition(win.id, nx, ny);
    }
    setSnapZone(null);
  }, [win.id, updateWindowPosition, setWindowLayout, snapZone]);

  // ── RESIZE handlers (global pointermove/up) ───────────────────────────────
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
      if (resizing.current.includes('e')) nw = Math.max(MIN_W, w + dx);
      if (resizing.current.includes('s')) nh = Math.max(MIN_H, h + dy);
      setSize({ w: nw, h: nh });
    };
    const onUp = (e: PointerEvent) => {
      if (!resizing.current) return;
      const { mouseX, mouseY, w, h } = resizeStart.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      let nw = w, nh = h;
      if (resizing.current.includes('e')) nw = Math.max(MIN_W, w + dx);
      if (resizing.current.includes('s')) nh = Math.max(MIN_H, h + dy);
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

  // ── Layout-dependent Tailwind classes ────────────────────────────────────────
  const layoutClasses = useMemo(() => {
    const base = "absolute rounded-2xl shadow-2xl bg-card/90 backdrop-blur-2xl border border-border/20 overflow-hidden flex flex-col";
    switch (win.layout) {
      case "floating":
        return `${base}`;
      case "fullscreen":
        return `${base} inset-4`;
      case "split-left":
        return `${base} top-4 left-4 bottom-4 w-[calc(50%-1.25rem)]`;
      case "split-right":
        return `${base} top-4 right-4 bottom-4 w-[calc(50%-1.25rem)]`;
      default:
        return base;
    }
  }, [win.layout]);

  const posStyle = useMemo(() => {
    if (win.layout !== "floating") return {};
    return { left: pos.x, top: pos.y, width: size.w, height: size.h };
  }, [win.layout, pos.x, pos.y, size.w, size.h]);

  return (
    <>
      {/* ── Snap zone overlay (portal) ───────────────────────────────────────── */}
      {snapZone && dragging.current && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9990] flex">
          <AnimatePresence>
            {snapZone === 'left' && (
              <motion.div
                key="snap-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-full rounded-2xl m-3"
                style={{
                  width: "calc(50% - 20px)",
                  background: "rgba(99,102,241,0.18)",
                  border: "2px solid rgba(129,140,248,0.6)",
                  boxShadow: "inset 0 0 40px rgba(99,102,241,0.1)",
                }}
              />
            )}
            {snapZone === 'right' && (
              <motion.div
                key="snap-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="h-full rounded-2xl m-3 ml-auto"
                style={{
                  width: "calc(50% - 20px)",
                  background: "rgba(99,102,241,0.18)",
                  border: "2px solid rgba(129,140,248,0.6)",
                  boxShadow: "inset 0 0 40px rgba(99,102,241,0.1)",
                }}
              />
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* ── Window frame ─────────────────────────────────────────────────────── */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className={`${layoutClasses} select-none`}
        style={{ zIndex: win.zIndex, ...posStyle }}
        onPointerDownCapture={() => bringToFront(win.id)}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
      >
        {/* ── Window chrome header ─────────────────────────── */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b border-border/20 shrink-0">
          {/* Title */}
          <span className="text-xs font-semibold text-foreground/80 truncate max-w-[55%]">{win.title}</span>

          {/* ── Center Pill (drag handle + menu) ── */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 top-1.5 flex items-center justify-center w-12 h-5 bg-foreground/10 hover:bg-foreground/18 rounded-full transition-colors z-[60] ${isFloating ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
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
                  <MoreHorizontal size={12} className="text-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={8} className="z-[9999] min-w-[160px]">
                {LAYOUT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setWindowLayout(win.id, opt.value)}
                    className={`flex items-center gap-2.5 text-xs ${win.layout === opt.value ? "text-primary font-semibold" : ""}`}
                  >
                    {opt.icon}
                    {opt.label}
                    {win.layout === opt.value && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => closeWindow(win.id)}
                  className="flex items-center gap-2.5 text-xs text-destructive focus:text-destructive"
                >
                  <X size={13} /> Close Window
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Close button */}
          <button
            onClick={() => closeWindow(win.id)}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive/20 hover:bg-destructive/80 text-destructive hover:text-destructive-foreground transition-colors z-[60]"
          >
            <X size={10} />
          </button>
        </div>

        {/* ── Content area ─────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden select-text pointer-events-auto">
          {children}
        </div>

        {/* ── Resize handles (floating only) ───────────────────────────────── */}
        {isFloating && (
          <>
            {/* Right edge */}
            <div
              className="absolute top-0 right-0 w-1.5 h-full cursor-e-resize z-[70] hover:bg-primary/20 transition-colors"
              onPointerDown={(e) => handleResizePointerDown(e, 'e')}
            />
            {/* Bottom edge */}
            <div
              className="absolute bottom-0 left-0 h-1.5 w-full cursor-s-resize z-[70] hover:bg-primary/20 transition-colors"
              onPointerDown={(e) => handleResizePointerDown(e, 's')}
            />
            {/* SE corner */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[71] flex items-end justify-end pr-0.5 pb-0.5"
              onPointerDown={(e) => handleResizePointerDown(e, 'se')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-30">
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
