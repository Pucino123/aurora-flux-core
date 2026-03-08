import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Focus, Timer, X, Zap } from "lucide-react";
import { useFocusMode } from "@/context/FocusModeContext";

const PRESET_DURATIONS = [
  { label: "25m", seconds: 25 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
  { label: "90m", seconds: 90 * 60 },
];

interface FocusIntentionModalProps {
  open: boolean;
  onConfirm: (taskTitle: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const FocusIntentionModal = ({ open, onConfirm, onCancel }: FocusIntentionModalProps) => {
  const [title, setTitle] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setSelectedDuration(25 * 60);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  const handleConfirm = () => {
    onConfirm(title.trim() || "Deep Work Session", selectedDuration);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[9995] left-1/2 top-1/2"
            initial={{ opacity: 0, scale: 0.88, y: 20, x: "-50%", translateY: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%", translateY: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, y: 16, x: "-50%", translateY: "-50%" }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <div
              className="w-[420px] rounded-3xl p-6 flex flex-col gap-5"
              style={{
                background: "rgba(10, 8, 20, 0.88)",
                backdropFilter: "blur(32px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Focus size={15} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Enter Focus Mode</p>
                    <p className="text-[11px] text-white/40">Notifications will be silenced</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Intention input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
                  What is your main focus?
                </label>
                <input
                  ref={inputRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Write the quarterly report…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
                />
              </div>

              {/* Duration selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Timer size={11} /> Session Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_DURATIONS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setSelectedDuration(p.seconds)}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: selectedDuration === p.seconds
                          ? "rgba(139,92,246,0.25)"
                          : "rgba(255,255,255,0.05)",
                        border: selectedDuration === p.seconds
                          ? "1px solid rgba(139,92,246,0.6)"
                          : "1px solid rgba(255,255,255,0.08)",
                        color: selectedDuration === p.seconds ? "rgb(196,181,253)" : "rgba(255,255,255,0.4)",
                        boxShadow: selectedDuration === p.seconds
                          ? "0 0 12px rgba(139,92,246,0.2)"
                          : "none",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 border border-white/8 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-2 flex-grow py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.7), rgba(109,40,217,0.8))",
                    border: "1px solid rgba(139,92,246,0.5)",
                    color: "white",
                    boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
                  }}
                >
                  <Zap size={13} />
                  Start Focusing
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FocusIntentionModal;
