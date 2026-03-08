import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, AppWindow, X, Minus } from "lucide-react";
import { useWindowManager } from "@/context/WindowManagerContext";
import { useEffect } from "react";

interface MissionControlProps {
  open: boolean;
  onClose: () => void;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const MissionControl = ({ open, onClose }: MissionControlProps) => {
  const { windows, bringToFront, restoreWindow, closeWindow, minimizeWindow, focusedId } = useWindowManager();

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const activeWindows = windows.filter(w => !w.minimized);
  const minimizedWindows = windows.filter(w => w.minimized);

  const handleActivate = (id: string, isMinimized: boolean) => {
    if (isMinimized) restoreWindow(id);
    else bringToFront(id);
    onClose();
  };

  const renderCard = (win: typeof windows[number]) => {
    const isMinimized = !!win.minimized;
    const isFocused = win.id === focusedId && !isMinimized;
    const WinIcon = win.type === "document" ? FileText : AppWindow;
    const iconColor = win.type === "document" ? "rgba(125,211,252,0.85)" : "rgba(167,139,250,0.85)";

    return (
      <motion.div
        key={win.id}
        layout
        initial={{ opacity: 0, scale: 0.82, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 8 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="group relative cursor-pointer"
        onClick={() => handleActivate(win.id, isMinimized)}
      >
        {/* Card */}
        <div
          className="relative rounded-2xl overflow-hidden transition-all duration-150 group-hover:scale-[1.04]"
          style={{
            width: 200,
            height: 130,
            background: "rgba(15,12,28,0.75)",
            backdropFilter: "blur(20px)",
            border: isFocused
              ? "2px solid rgba(0,122,255,0.75)"
              : isMinimized
              ? "1.5px solid rgba(255,255,255,0.1)"
              : "1.5px solid rgba(255,255,255,0.18)",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(0,122,255,0.18), 0 12px 40px rgba(0,0,0,0.6)"
              : "0 8px 32px rgba(0,0,0,0.55)",
            opacity: isMinimized ? 0.6 : 1,
          }}
        >
          {/* Preview placeholder with icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 opacity-30">
              <WinIcon size={28} style={{ color: iconColor }} />
            </div>
          </div>

          {/* Minimized badge */}
          {isMinimized && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.12)" }}>
              minimized
            </div>
          )}

          {/* Focused indicator */}
          {isFocused && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(0,122,255,0.8)]" />
          )}

          {/* Close button on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full items-center justify-center hidden group-hover:flex transition-all z-10"
            style={{ background: "rgba(239,68,68,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <X size={9} strokeWidth={2.5} style={{ color: "#fff" }} />
          </button>

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-10 rounded-b-2xl"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }} />
        </div>

        {/* Label below */}
        <div className="mt-2 flex flex-col items-center gap-0.5 px-1">
          <div className="flex items-center gap-1.5">
            <WinIcon size={10} style={{ color: iconColor }} />
            <span className="text-[11px] font-semibold text-white/80 truncate max-w-[160px]">{win.title}</span>
          </div>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(win.lastActiveAt)}</span>
        </div>
      </motion.div>
    );
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10400]"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-[10401] flex flex-col items-center justify-center gap-8 pointer-events-none"
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.25em]">Mission Control</p>
              <p className="text-[10px] text-white/20">Click a window to activate · Esc to close</p>
            </div>

            {/* Active windows section */}
            {activeWindows.length > 0 && (
              <div className="pointer-events-auto flex flex-col items-center gap-3">
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Open</p>
                <div className="flex flex-wrap items-center justify-center gap-4 px-8"
                  style={{ maxWidth: Math.min(window.innerWidth - 64, Math.ceil(Math.sqrt(activeWindows.length + 1)) * 240) }}>
                  <AnimatePresence mode="popLayout">
                    {activeWindows.map(win => renderCard(win))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Minimized windows section */}
            {minimizedWindows.length > 0 && (
              <div className="pointer-events-auto flex flex-col items-center gap-3">
                {activeWindows.length > 0 && (
                  <div className="w-32 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                )}
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Minimized</p>
                <div className="flex flex-wrap items-center justify-center gap-4 px-8">
                  <AnimatePresence mode="popLayout">
                    {minimizedWindows.map(win => renderCard(win))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Empty state */}
            {windows.length === 0 && (
              <div className="pointer-events-auto flex flex-col items-center gap-3">
                <AppWindow size={48} className="text-white/10" />
                <p className="text-sm text-white/30">No open windows</p>
                <p className="text-xs text-white/20">Open a document or widget to get started</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MissionControl;
