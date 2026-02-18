import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";

interface WorkoutModalProps {
  open: boolean;
  onClose: () => void;
}

const energyEmojis = ["😫", "😓", "😐", "🙂", "😊", "💪", "🔥", "⚡️", "🚀", "🏆"];

const WorkoutModal = ({ open, onClose }: WorkoutModalProps) => {
  const { logWorkout } = useFlux();
  const [activity, setActivity] = useState("");
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState("");

  const handleSubmit = async () => {
    if (!activity.trim()) return;
    await logWorkout({
      date: new Date().toISOString().split("T")[0],
      activity: activity.trim(),
      energy,
      mood,
    });
    setActivity("");
    setEnergy(5);
    setMood("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-panel rounded-2xl p-6 w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-display">{t("wm.title")}</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("wm.what")}</label>
            <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder={t("wm.placeholder")} className="w-full px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur border border-white/50 text-sm outline-none focus:border-primary/30 transition-colors mb-4" />
            <label className="text-sm font-medium text-foreground mb-2 block">{t("wm.energy")}: {energy}/10 {energyEmojis[energy - 1]}</label>
            <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-full mb-4 accent-primary" />
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("wm.mood")}</label>
            <textarea value={mood} onChange={(e) => setMood(e.target.value)} placeholder={t("wm.mood_placeholder")} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur border border-white/50 text-sm outline-none focus:border-primary/30 transition-colors resize-none mb-5" />
            <button onClick={handleSubmit} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">{t("wm.submit")}</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WorkoutModal;
