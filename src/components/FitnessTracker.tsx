import { useState, useMemo, useRef } from "react";
import { useFlux, DbWorkout } from "@/context/FluxContext";
import { Dumbbell, Flame, Zap, TrendingUp, Pencil, Trash2, Check, X, Share2, Download, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StreakHeatmap from "./StreakHeatmap";
import WorkoutModal from "./WorkoutModal";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import CollapsibleSection from "./CollapsibleSection";

interface FitnessTrackerProps {
  folderId: string;
}

const energyEmojis = ["😫", "😓", "😐", "🙂", "😊", "💪", "🔥", "⚡️", "🚀", "🏆"];

const FitnessTracker = ({ folderId }: FitnessTrackerProps) => {
  const { workouts, findFolderNode, editWorkout, removeWorkout, logWorkout } = useFlux();
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnergy, setEditEnergy] = useState(5);
  const [editActivity, setEditActivity] = useState("");
  const [editMood, setEditMood] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const folder = findFolderNode(folderId);

  const stats = useMemo(() => {
    if (workouts.length === 0) return { streak: 0, total: 0, avgEnergy: 0 };
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      if (sorted.some((w) => w.date === dateStr)) streak++;
      else if (i > 0) break;
    }
    const avgEnergy = workouts.reduce((sum, w) => sum + w.energy, 0) / workouts.length;
    return { streak, total: workouts.length, avgEnergy };
  }, [workouts]);

  const statCards = [
    { icon: Flame, label: t("fit.streak"), value: `${stats.streak} ${t("fit.days")}`, color: "hsl(var(--aurora-pink))" },
    { icon: Dumbbell, label: t("fit.total"), value: stats.total.toString(), color: "hsl(var(--aurora-violet))" },
    { icon: Zap, label: t("fit.avg_energy"), value: stats.avgEnergy.toFixed(1), color: "hsl(var(--aurora-blue))" },
  ];

  const startEdit = (w: DbWorkout) => {
    setEditingId(w.id);
    setEditActivity(w.activity);
    setEditEnergy(w.energy);
    setEditMood(w.mood);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await editWorkout(editingId, { activity: editActivity, energy: editEnergy, mood: editMood });
    setEditingId(null);
    toast.success(t("fit.updated"));
  };

  const captureHeatmap = async (): Promise<HTMLCanvasElement | null> => {
    if (!heatmapRef.current) return null;
    setShareLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: "#0f0f14",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      return canvas;
    } finally {
      setShareLoading(false);
    }
  };

  const handleDownload = async () => {
    const canvas = await captureHeatmap();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `flux-streak-${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Streak card downloaded!");
    setShowShareModal(false);
  };

  const handleCopyToClipboard = async () => {
    const canvas = await captureHeatmap();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Copied to clipboard!");
      } catch {
        toast.error("Clipboard not supported in this browser.");
      }
    }, "image/png");
    setShowShareModal(false);
  };

  const handleDelete = async (id: string) => {
    const workout = workouts.find((w) => w.id === id);
    await removeWorkout(id);
    toast(t("fit.deleted"), {
      action: workout ? {
        label: t("toast.undo"),
        onClick: () => logWorkout({ date: workout.date, activity: workout.activity, energy: workout.energy, mood: workout.mood }),
      } : undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">{folder?.title || "Fitness"}</h2>
          <p className="text-sm text-muted-foreground">{t("fit.dashboard_sub")}</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow">
          <TrendingUp size={16} /> {t("fit.log")}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flux-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}22` }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold font-display">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <CollapsibleSection title={t("fit.activity_map") || "Activity Map"}>
        <div className="flux-card mb-6">
          {/* Heatmap share header */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">365-day activity</span>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Share streak card"
            >
              <Share2 size={12} /> Share
            </button>
          </div>
          {/* Capturable heatmap area */}
          <div ref={heatmapRef} className="p-3 rounded-xl" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs font-semibold text-foreground">{folder?.title || "Fitness"} — {stats.streak} day streak 🔥</span>
            </div>
            <StreakHeatmap workouts={workouts} />
            <p className="text-[10px] text-muted-foreground/50 mt-2 text-right">flux.app</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-border/30 overflow-hidden shadow-2xl w-full max-w-xs"
              style={{ background: "hsl(var(--card)/0.95)", backdropFilter: "blur(32px)" }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold font-display">Share Streak Card</h3>
                  <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Export your activity heatmap as a PNG to share on social media or save locally.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={shareLoading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Download size={14} />
                    {shareLoading ? "Capturing…" : "Download PNG"}
                  </button>
                  <button
                    onClick={handleCopyToClipboard}
                    disabled={shareLoading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    <Copy size={14} />
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CollapsibleSection title={t("fit.recent")} count={workouts.length} defaultOpen={true}>
        {workouts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Dumbbell size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("fit.no_workouts")}</p>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {workouts.slice(0, showAllWorkouts ? undefined : 5).map((w) => (
              <div key={w.id} className="flux-card group">
                {editingId === w.id ? (
                  <div className="space-y-2">
                    <input value={editActivity} onChange={(e) => setEditActivity(e.target.value)} className="w-full text-sm bg-transparent outline-none border-b border-border pb-1" autoFocus />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("wm.energy")}: {editEnergy}/10 {energyEmojis[editEnergy - 1]}</span>
                      <input type="range" min={1} max={10} value={editEnergy} onChange={(e) => setEditEnergy(Number(e.target.value))} className="flex-1 accent-primary" />
                    </div>
                    <input value={editMood} onChange={(e) => setEditMood(e.target.value)} className="w-full text-xs bg-transparent outline-none border-b border-border pb-1" placeholder={t("wm.mood_placeholder")} />
                    <div className="flex gap-1.5">
                      <button onClick={saveEdit} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20"><Check size={12} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded bg-secondary text-muted-foreground"><X size={12} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">{energyEmojis[w.energy - 1]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{w.activity}</p>
                      <p className="text-[11px] text-muted-foreground">{w.date}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{w.energy}/10</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(w)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(w.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {workouts.length > 5 && (
              <button
                onClick={() => setShowAllWorkouts(!showAllWorkouts)}
                className="text-xs text-primary hover:underline font-medium mt-2"
              >
                {showAllWorkouts ? (t("board.show_less") || "Show less") : `Show all ${workouts.length}…`}
              </button>
            )}
          </div>
        )}
      </CollapsibleSection>

      <WorkoutModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default FitnessTracker;
