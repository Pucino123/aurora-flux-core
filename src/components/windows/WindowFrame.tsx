import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal, Maximize2, Minimize2, PanelLeft, PanelRight, Square } from "lucide-react";
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

const WindowFrame = ({ window: win, children }: WindowFrameProps) => {
  const { closeWindow, setWindowLayout, updateWindowPosition, bringToFront } = useWindowManager();

  // ── Drag state (manual pointer events, no framer-motion drag prop) ──────────
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState(win.position);
  const isFloating = win.layout === "floating";

  // Keep pos in sync when layout snaps back to floating (restores last known pos)
  useEffect(() => {
    if (isFloating) setPos(win.position);
  }, [isFloating, win.position.x, win.position.y]);

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
  }, []);

  const handlePillPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const nx = e.clientX - offset.current.x;
    const ny = Math.max(0, e.clientY - offset.current.y);
    updateWindowPosition(win.id, nx, ny);
  }, [win.id, updateWindowPosition]);

  // ── Layout-dependent Tailwind classes ────────────────────────────────────────
  const layoutClasses = useMemo(() => {
    const base = "absolute rounded-2xl shadow-2xl bg-card/90 backdrop-blur-2xl border border-border/20 overflow-hidden flex flex-col";
    switch (win.layout) {
      case "floating":
        return `${base} w-[820px] h-[620px]`;
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
    return { left: pos.x, top: pos.y };
  }, [win.layout, pos.x, pos.y]);

  return (
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
      {/* ── Window chrome header ─────────────────────────────────── */}
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

      {/* ── Content area — select-text allowed ─────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden select-text pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
};

export default WindowFrame;
