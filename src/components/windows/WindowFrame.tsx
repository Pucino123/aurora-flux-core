import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  X, Maximize2, PanelLeft, PanelRight, Square, Minus,
  Copy, Group, Ungroup, Pencil, FolderOpen,
} from "lucide-react";
import { useWindowManager, AppWindow, WindowLayout } from "@/context/WindowManagerContext";
import { useFolders } from "@/hooks/useCloudSync";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Non-floating layouts must sit above pill (z-9999) and dock (z-10150)
const OVERLAY_Z = 10300;
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
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
  focused?: boolean;
}

const LAYOUT_OPTIONS: { label: string; value: WindowLayout; icon: React.ReactNode }[] = [
  { label: "Float",        value: "floating",    icon: <Square    size={13} /> },
  { label: "Full Screen",  value: "fullscreen",  icon: <Maximize2 size={13} /> },
  { label: "Split Left",   value: "split-left",  icon: <PanelLeft  size={13} /> },
  { label: "Split Right",  value: "split-right", icon: <PanelRight size={13} /> },
];

const SNAP_THRESHOLD = 100;
const GUIDE_THRESHOLD = 18;
const MIN_W = 320;
const MIN_H = 240;
const DEFAULT_W = 820;
const DEFAULT_H = 620;
const DEAD_ZONE_LEFT = 110;

const DRAG_SPRING = { stiffness: 900, damping: 50, mass: 0.3 };

const LAYOUT_PILL_BG: Record<WindowLayout, string> = {
  floating:     "hsl(142 71% 45%)",
  fullscreen:   "hsl(217 91% 60%)",
  "split-left": "hsl(270 76% 65%)",
  "split-right":"hsl(270 76% 65%)",
};
const LAYOUT_LABEL: Record<WindowLayout, string> = {
  floating:     "float",
  fullscreen:   "full",
  "split-left": "◀ left",
  "split-right":"right ▶",
};

// ── Snap guide lines ───────────────────────────────────────────────────────────
type Guide = { type: "v"; x: number } | { type: "h"; y: number };
function SnapGuides({ guides }: { guides: Guide[] }) {
  if (!guides.length) return null;
  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 10200 }}>
      {guides.map((g, i) =>
        g.type === "v" ? (
          <motion.div key={i}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }} className="absolute top-0 bottom-0"
            style={{ left: g.x, width: 1, background: "hsl(var(--primary) / 0.55)", boxShadow: "0 0 6px 1px hsl(var(--primary) / 0.35)" }}
          />
        ) : (
          <motion.div key={i}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }} className="absolute left-0 right-0"
            style={{ top: g.y, height: 1, background: "hsl(var(--primary) / 0.55)", boxShadow: "0 0 6px 1px hsl(var(--primary) / 0.35)" }}
          />
        )
      )}
    </div>,
    document.body
  );
}

// ── Group badge ───────────────────────────────────────────────────────────────
function GroupBadge({ groupId }: { groupId: string }) {
  // Derive a short colour from the group ID for visual identity
  const hue = Math.abs(groupId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-bold shrink-0"
      style={{ background: `hsl(${hue} 70% 55%)`, color: "#fff" }}
      title="Grouped window"
    >
      G
    </span>
  );
}

const WindowFrame = ({ window: win, children, focused = false }: WindowFrameProps) => {
  const {
    closeWindow, setWindowLayout, updateWindowPosition,
    updateWindowSize, bringToFront, minimizeWindow,
    duplicateWindow, groupWindows, ungroupWindow, windows, updateWindowTitle,
  } = useWindowManager();

  const { user } = useAuth();
  const { fetchFolders } = useFolders();
  const [folders, setFolders] = useState<{ id: string; title: string; icon?: string | null }[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(win.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load folders for "Move to Folder" submenu
  const loadFolders = useCallback(async () => {
    const data = await fetchFolders();
    setFolders(data || []);
  }, [fetchFolders]);

  const commitRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === win.title) { setIsRenaming(false); return; }
    if (win.type === "document" && user) {
      await (supabase as any).from("documents").update({ title: trimmed }).eq("id", win.contentId).eq("user_id", user.id);
    }
    updateWindowTitle(win.id, trimmed);
    setIsRenaming(false);
  }, [renameValue, win, user, updateWindowTitle]);

  const handleRenameKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") { setIsRenaming(false); setRenameValue(win.title); }
  }, [commitRename, win.title]);

  useEffect(() => {
    if (isRenaming) setTimeout(() => renameInputRef.current?.select(), 30);
  }, [isRenaming]);

  const moveToFolder = useCallback(async (folderId: string | null) => {
    if (!user) return;
    await (supabase as any).from("documents").update({ folder_id: folderId }).eq("id", win.contentId).eq("user_id", user.id);
  }, [win.contentId, user]);

  const isFloating = win.layout === "floating";
  const prevLayoutRef = useRef<WindowLayout>(win.layout);
  const preFullscreenState = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Per-document light/dark override (null = inherit system theme)
  const [docTheme, setDocTheme] = useState<"light" | "dark" | null>(() => {
    try { return localStorage.getItem(`flux_win_light_${win.id}`) === "1" ? "light" : null; } catch { return null; }
  });
  const toggleDocTheme = useCallback(() => {
    setDocTheme(prev => {
      const next = prev === "light" ? null : "light";
      try { localStorage.setItem(`flux_win_light_${win.id}`, next === "light" ? "1" : "0"); } catch {}
      return next;
    });
  }, [win.id]);

  // Listen for toggle events fired from DocumentView's toolbar
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.windowId && e.detail.windowId !== win.id) return;
      toggleDocTheme();
    };
    window.addEventListener("doc:toggle-light" as any, handler);
    return () => window.removeEventListener("doc:toggle-light" as any, handler);
  }, [toggleDocTheme, win.id]);

  // ── Direct position (no spring during drag — pixel-perfect tracking) ────────
  const rawX = useRef(win.position.x);
  const rawY = useRef(win.position.y);
  const motionX = useMotionValue(win.position.x);
  const motionY = useMotionValue(win.position.y);
  // Spring only used for programmatic moves (restore, snap), not live drag
  const springX = useSpring(motionX, DRAG_SPRING);
  const springY = useSpring(motionY, DRAG_SPRING);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isFloating) {
      motionX.set(win.position.x);
      motionY.set(win.position.y);
      rawX.current = win.position.x;
      rawY.current = win.position.y;
    }
  }, [isFloating, win.position.x, win.position.y, motionX, motionY]);

  const [snapZone, setSnapZone] = useState<"left" | "right" | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const [size, setSize] = useState({ w: win.size?.w ?? DEFAULT_W, h: win.size?.h ?? DEFAULT_H });
  const liveSizeRef = useRef(size);
  const resizing = useRef<string | null>(null);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  // ── Fullscreen helpers ─────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    preFullscreenState.current = { x: rawX.current, y: rawY.current, w: size.w, h: size.h };
    prevLayoutRef.current = win.layout;
    setWindowLayout(win.id, "fullscreen");
  }, [win.id, win.layout, setWindowLayout, size]);

  const exitFullscreen = useCallback(() => {
    const prev = preFullscreenState.current;
    const restoreLayout = prevLayoutRef.current === "fullscreen" ? "floating" : prevLayoutRef.current;
    setWindowLayout(win.id, restoreLayout);
    if (prev && restoreLayout === "floating") {
      requestAnimationFrame(() => {
        motionX.set(prev.x); motionY.set(prev.y);
        rawX.current = prev.x; rawY.current = prev.y;
        updateWindowPosition(win.id, prev.x, prev.y);
        liveSizeRef.current = { w: prev.w, h: prev.h };
        setSize({ w: prev.w, h: prev.h });
        updateWindowSize(win.id, prev.w, prev.h);
      });
    }
  }, [win.id, setWindowLayout, motionX, motionY, updateWindowPosition, updateWindowSize]);

  const toggleFullscreen = useCallback(() => {
    if (win.layout === "fullscreen") exitFullscreen();
    else enterFullscreen();
  }, [win.layout, enterFullscreen, exitFullscreen]);

  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,[role='button'],[data-radix-collection-item]")) return;
    toggleFullscreen();
  }, [toggleFullscreen]);

  // ── Full-header drag ──────────────────────────────────────────────────────
  const handleHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFloating) return;
    if (e.nativeEvent.offsetX < DEAD_ZONE_LEFT) return;
    if ((e.target as HTMLElement).closest("button,[role='button'],[data-radix-collection-item]")) return;
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - rawX.current, y: e.clientY - rawY.current };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [isFloating]);

  const handleHeaderPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const nx = e.clientX - offset.current.x;
    const ny = Math.max(0, e.clientY - offset.current.y);
    rawX.current = nx; rawY.current = ny;
    motionX.set(nx); motionY.set(ny);
    if (e.clientX < SNAP_THRESHOLD) setSnapZone("left");
    else if (e.clientX > window.innerWidth - SNAP_THRESHOLD) setSnapZone("right");
    else setSnapZone(null);
    const sw = liveSizeRef.current.w;
    const newGuides: Guide[] = [];
    const scrW = window.innerWidth, scrH = window.innerHeight;
    if (nx < GUIDE_THRESHOLD) newGuides.push({ type: "v", x: 0 });
    if (nx + sw > scrW - GUIDE_THRESHOLD) newGuides.push({ type: "v", x: scrW });
    if (Math.abs(nx + sw / 2 - scrW / 2) < GUIDE_THRESHOLD) newGuides.push({ type: "v", x: scrW / 2 });
    if (ny < GUIDE_THRESHOLD) newGuides.push({ type: "h", y: 0 });
    if (Math.abs(ny - scrH / 2) < GUIDE_THRESHOLD) newGuides.push({ type: "h", y: scrH / 2 });
    setGuides(newGuides);
  }, [motionX, motionY]);

  const handleHeaderPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    setGuides([]);
    if (snapZone) setWindowLayout(win.id, snapZone === "left" ? "split-left" : "split-right");
    else updateWindowPosition(win.id, rawX.current, rawY.current);
    setSnapZone(null);
  }, [win.id, updateWindowPosition, setWindowLayout, snapZone]);

  // ── Direct DOM resize — zero React re-renders during drag ─────────────────
  const handleResizePointerDown = useCallback((e: React.PointerEvent, dir: string) => {
    if (!isFloating) return;
    e.stopPropagation(); e.preventDefault();
    resizing.current = dir;
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, w: liveSizeRef.current.w, h: liveSizeRef.current.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isFloating]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizing.current) return;
      e.preventDefault();
      const { mouseX, mouseY, w, h } = resizeStart.current;
      const dx = e.clientX - mouseX, dy = e.clientY - mouseY;
      let nw = w, nh = h;
      if (resizing.current.includes("e")) nw = Math.max(MIN_W, w + dx);
      if (resizing.current.includes("s")) nh = Math.max(MIN_H, h + dy);
      liveSizeRef.current = { w: nw, h: nh };
      if (frameRef.current) {
        frameRef.current.style.width = `${nw}px`;
        frameRef.current.style.height = `${nh}px`;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!resizing.current) return;
      const { mouseX, mouseY, w, h } = resizeStart.current;
      const dx = e.clientX - mouseX, dy = e.clientY - mouseY;
      let nw = w, nh = h;
      if (resizing.current.includes("e")) nw = Math.max(MIN_W, w + dx);
      if (resizing.current.includes("s")) nh = Math.max(MIN_H, h + dy);
      resizing.current = null;
      liveSizeRef.current = { w: nw, h: nh };
      setSize({ w: nw, h: nh });
      updateWindowSize(win.id, nw, nh);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [win.id, updateWindowSize]);

  // ── z-index: non-floating layouts go ABOVE pill + dock ────────────────────
  const effectiveZ = useMemo(() => {
    if (!isFloating) return Math.max(win.zIndex, OVERLAY_Z);
    return win.zIndex;
  }, [isFloating, win.zIndex]);

  // ── Layout classes ─────────────────────────────────────────────────────────
  const layoutClasses = useMemo(() => {
    const base = "absolute rounded-2xl bg-card/90 backdrop-blur-2xl border overflow-hidden flex flex-col pointer-events-auto";
    const focusRing = focused
      ? "border-primary/60 shadow-[0_0_0_2px_hsl(var(--primary)/0.35),0_8px_40px_rgba(0,0,0,0.55)]"
      : "border-border/20 shadow-2xl";
    switch (win.layout) {
      case "floating":    return `${base} ${focusRing}`;
      case "fullscreen":  return `${base} ${focusRing} inset-0`;
      case "split-left":  return `${base} ${focusRing} inset-y-0 left-0 w-1/2`;
      case "split-right": return `${base} ${focusRing} inset-y-0 right-0 w-1/2`;
      default:            return `${base} ${focusRing}`;
    }
  }, [win.layout, focused]);

  const posStyle = useMemo<React.CSSProperties>(() => {
    if (win.layout !== "floating") return {};
    return { width: size.w, height: size.h };
  }, [win.layout, size.w, size.h]);

  // ── Minimized: hide (don't unmount) so child state like openDoc is preserved
  const isMinimized = !!win.minimized;

  const layoutPillBg = LAYOUT_PILL_BG[win.layout];
  const layoutLabel  = LAYOUT_LABEL[win.layout];

  // Windows available to group with (same layout, not self, not already grouped with this window)
  const groupCandidates = windows.filter(
    w => w.id !== win.id && !w.minimized && w.layout === "floating" &&
    !(w.groupId && w.groupId === win.groupId)
  );

  const headerContent = (
    <div
      className={`relative flex items-center justify-between px-3 py-2 border-b shrink-0 h-9 ${isFloating ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={docTheme === "light"
        ? { background: "#f9f9f9", borderColor: "rgba(0,0,0,0.1)", color: "#111" }
        : { borderColor: "hsl(var(--border) / 0.2)" }}
      onPointerDown={handleHeaderPointerDown}
      onPointerMove={handleHeaderPointerMove}
      onPointerUp={handleHeaderPointerUp}
      onDoubleClick={handleHeaderDoubleClick}
    >
      {/* Left: traffic-lights + layout switcher */}
      <div className="flex items-center gap-1.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => closeWindow(win.id)}
          className="group w-3.5 h-3.5 rounded-full bg-red-500/60 hover:bg-red-500 transition-colors flex items-center justify-center" title="Close (⌘W)">
          <X size={7} className="opacity-0 group-hover:opacity-100 text-red-900" />
        </button>
        <button onClick={() => minimizeWindow(win.id)}
          className="group w-3.5 h-3.5 rounded-full bg-amber-400/60 hover:bg-amber-400 transition-colors flex items-center justify-center" title="Minimize (⌘M)">
          <Minus size={7} className="opacity-0 group-hover:opacity-100 text-amber-900" />
        </button>
        <button onClick={toggleFullscreen}
          className="group w-3.5 h-3.5 rounded-full bg-emerald-500/60 hover:bg-emerald-500 transition-colors flex items-center justify-center" title={win.layout === "fullscreen" ? "Restore" : "Full Screen"}>
          <Maximize2 size={7} className="opacity-0 group-hover:opacity-100 text-emerald-900" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: layoutPillBg, color: "rgba(0,0,0,0.75)" }} title="Change layout"
            >
              {layoutLabel}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} style={{ zIndex: 10999 }} className="min-w-[160px]">
            {LAYOUT_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt.value}
                onClick={() => {
                  if (opt.value === "fullscreen" && win.layout !== "fullscreen") enterFullscreen();
                  else if (opt.value !== "fullscreen" && win.layout === "fullscreen") { prevLayoutRef.current = opt.value; exitFullscreen(); }
                  else setWindowLayout(win.id, opt.value);
                }}
                className={`flex items-center gap-2.5 text-xs ${win.layout === opt.value ? "text-primary font-semibold" : ""}`}
              >
                {opt.icon} {opt.label}
                {win.layout === opt.value && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => minimizeWindow(win.id)} className="flex items-center gap-2.5 text-xs">
              <Minus size={13} /> Minimize <span className="ml-auto text-foreground/30">⌘M</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => closeWindow(win.id)} className="flex items-center gap-2.5 text-xs text-destructive focus:text-destructive">
              <X size={13} /> Close <span className="ml-auto text-foreground/30">⌘W</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group badge */}
        {win.groupId && <GroupBadge groupId={win.groupId} />}
      </div>

      {/* Center: title — tappable for rename */}
      {isRenaming ? (
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKey}
          onBlur={commitRename}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold bg-transparent border-b border-primary outline-none text-foreground/90 truncate max-w-[36%] text-center"
          style={{ minWidth: 80 }}
        />
      ) : (
        <span
          className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground/70 truncate max-w-[36%] pointer-events-none select-none"
          title="Double-click header to fullscreen; right-click for more">
          {win.title}
        </span>
      )}

      {/* Drag hint */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-8 h-1 rounded-full bg-foreground/15 pointer-events-none" />

    </div>
  );

  return (
    <div style={isMinimized ? { display: "none" } : undefined}>
      {/* Snap zone overlay */}
      {snapZone && dragging.current && createPortal(
        <div className="fixed inset-0 pointer-events-none flex" style={{ zIndex: 10200 }}>
          <AnimatePresence>
            {snapZone === "left" && (
              <motion.div key="snap-left" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="h-full rounded-2xl m-3"
                style={{ width: "calc(50% - 20px)", background: "hsl(var(--primary) / 0.14)", border: "2px solid hsl(var(--primary) / 0.55)" }} />
            )}
            {snapZone === "right" && (
              <motion.div key="snap-right" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }} className="h-full rounded-2xl m-3 ml-auto"
                style={{ width: "calc(50% - 20px)", background: "hsl(var(--primary) / 0.14)", border: "2px solid hsl(var(--primary) / 0.55)" }} />
            )}
          </AnimatePresence>
        </div>, document.body
      )}

      <AnimatePresence>{guides.length > 0 && <SnapGuides guides={guides} />}</AnimatePresence>

      {/* ── Window frame ──────────────────────────────────────────────────── */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            ref={frameRef as React.Ref<HTMLDivElement>}
            layoutId={`window-${win.id}`}
            layout={!isFloating}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className={`${layoutClasses} select-none`}
            style={{
              zIndex: effectiveZ,
              ...(isFloating ? { x: isDragging ? motionX : springX, y: isDragging ? motionY : springY, ...posStyle } : {}),
              ...(docTheme === "light" ? {
                background: "#ffffff",
                borderColor: "rgba(0,0,0,0.12)",
                color: "#111",
                ["--background" as any]: "0 0% 99%",
                ["--foreground" as any]: "220 20% 10%",
                ["--card" as any]: "0 0% 100%",
                ["--card-foreground" as any]: "220 20% 10%",
                ["--muted" as any]: "220 15% 96%",
                ["--muted-foreground" as any]: "220 10% 45%",
                ["--border" as any]: "220 15% 88%",
                ["--secondary" as any]: "220 15% 94%",
                ["--secondary-foreground" as any]: "220 20% 20%",
              } : {}),
            }}
            onPointerDownCapture={() => bringToFront(win.id)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
          >
            {/* ── Header ────────────────────────────────────────────────── */}
            {headerContent}

            {/* ── Content ──────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-hidden select-text pointer-events-auto">
              {children}
            </div>

            {/* ── Resize handles ──────────────────────────────────────── */}
            {isFloating && (
              <>
                <div className="absolute top-0 right-0 w-1.5 h-full cursor-e-resize z-[70] hover:bg-primary/15 transition-colors" onPointerDown={e => handleResizePointerDown(e, "e")} />
                <div className="absolute bottom-0 left-0 h-1.5 w-full cursor-s-resize z-[70] hover:bg-primary/15 transition-colors" onPointerDown={e => handleResizePointerDown(e, "s")} />
                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[71] flex items-end justify-end pr-0.5 pb-0.5" onPointerDown={e => handleResizePointerDown(e, "se")}>
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/25">
                    <path d="M10 0 L10 10 L0 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M10 4 L10 10 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </>
            )}
          </motion.div>
        </ContextMenuTrigger>

        {/* ── Right-click context menu ─────────────────────────────────────── */}
        <ContextMenuContent style={{ zIndex: 10999 }} className="min-w-[200px]">
          {/* Layout options */}
          <ContextMenuItem
            onClick={() => {
              if (win.layout !== "fullscreen") enterFullscreen();
              else exitFullscreen();
            }}
            className="flex items-center gap-2.5 text-xs"
          >
            <Maximize2 size={13} />
            {win.layout === "fullscreen" ? "Restore" : "Full Screen"}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setWindowLayout(win.id, "floating")}
            className={`flex items-center gap-2.5 text-xs ${win.layout === "floating" ? "text-primary" : ""}`}
          >
            <Square size={13} /> Float
            {win.layout === "floating" && <span className="ml-auto text-primary">✓</span>}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setWindowLayout(win.id, "split-left")}
            className={`flex items-center gap-2.5 text-xs ${win.layout === "split-left" ? "text-primary" : ""}`}
          >
            <PanelLeft size={13} /> Split Left
            {win.layout === "split-left" && <span className="ml-auto text-primary">✓</span>}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setWindowLayout(win.id, "split-right")}
            className={`flex items-center gap-2.5 text-xs ${win.layout === "split-right" ? "text-primary" : ""}`}
          >
            <PanelRight size={13} /> Split Right
            {win.layout === "split-right" && <span className="ml-auto text-primary">✓</span>}
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Window management */}
          <ContextMenuItem onClick={() => { setIsRenaming(true); setRenameValue(win.title); }} className="flex items-center gap-2.5 text-xs">
            <Pencil size={13} /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicateWindow(win.id)} className="flex items-center gap-2.5 text-xs">
            <Copy size={13} /> Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={() => minimizeWindow(win.id)} className="flex items-center gap-2.5 text-xs">
            <Minus size={13} /> Minimize
            <span className="ml-auto text-foreground/30">⌘M</span>
          </ContextMenuItem>

          {/* Move to folder (documents only) */}
          {win.type === "document" && (
            <ContextMenuSub>
              <ContextMenuSubTrigger
                className="flex items-center gap-2.5 text-xs"
                onPointerEnter={loadFolders}
              >
                <FolderOpen size={13} /> Move to Folder…
              </ContextMenuSubTrigger>
              <ContextMenuSubContent style={{ zIndex: 11000 }} className="min-w-[180px]">
                <ContextMenuItem
                  onClick={() => moveToFolder(null)}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  No folder (root)
                </ContextMenuItem>
                {folders.map(f => (
                  <ContextMenuItem
                    key={f.id}
                    onClick={() => moveToFolder(f.id)}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="mr-0.5">{f.icon || "📁"}</span>
                    <span className="truncate max-w-[140px]">{f.title}</span>
                  </ContextMenuItem>
                ))}
                {folders.length === 0 && (
                  <ContextMenuItem disabled className="text-xs text-muted-foreground">No folders found</ContextMenuItem>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          <ContextMenuSeparator />

          {/* Group management */}
          {groupCandidates.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2.5 text-xs">
                <Group size={13} /> Link to Window…
              </ContextMenuSubTrigger>
              <ContextMenuSubContent style={{ zIndex: 11000 }} className="min-w-[180px]">
                {groupCandidates.map(w => (
                  <ContextMenuItem
                    key={w.id}
                    onClick={() => groupWindows(win.id, w.id)}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="truncate max-w-[140px]">{w.title}</span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          {win.groupId && (
            <ContextMenuItem onClick={() => ungroupWindow(win.id)} className="flex items-center gap-2.5 text-xs">
              <Ungroup size={13} /> Unlink from Group
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => closeWindow(win.id)}
            className="flex items-center gap-2.5 text-xs text-destructive focus:text-destructive"
          >
            <X size={13} /> Close
            <span className="ml-auto text-foreground/30">⌘W</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};

export default WindowFrame;
