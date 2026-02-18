import { useMemo } from "react";
import { DbWorkout } from "@/context/FluxContext";
import { motion } from "framer-motion";
import { t } from "@/lib/i18n";

interface StreakHeatmapProps {
  workouts: DbWorkout[];
}

const StreakHeatmap = ({ workouts }: StreakHeatmapProps) => {
  const days = useMemo(() => {
    const today = new Date();
    const grid: { date: string; energy: number; hasWorkout: boolean }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayWorkouts = workouts.filter((w) => w.date === dateStr);
      const avgEnergy = dayWorkouts.length > 0 ? dayWorkouts.reduce((sum, w) => sum + w.energy, 0) / dayWorkouts.length : 0;
      grid.push({ date: dateStr, energy: avgEnergy, hasWorkout: dayWorkouts.length > 0 });
    }
    return grid;
  }, [workouts]);

  const getColor = (energy: number, hasWorkout: boolean) => {
    if (!hasWorkout) return "hsl(var(--muted))";
    if (energy <= 3) return "hsl(270, 70%, 85%)";
    if (energy <= 5) return "hsl(270, 70%, 72%)";
    if (energy <= 7) return "hsl(270, 70%, 60%)";
    return "hsl(270, 70%, 48%)";
  };

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      <h3 className="text-sm font-semibold font-display mb-3">{t("fit.heatmap")}</h3>
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <motion.div key={day.date} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: wi * 0.01 }}
                title={`${day.date}${day.hasWorkout ? ` — ${t("wm.energy")}: ${day.energy.toFixed(0)}` : ""}`}
                className="w-3 h-3 rounded-sm cursor-default transition-colors"
                style={{ backgroundColor: getColor(day.energy, day.hasWorkout) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreakHeatmap;
