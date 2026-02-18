import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { Dumbbell, CalendarDays } from "lucide-react";

const energyEmojis = ["😫", "😓", "😐", "🙂", "😊", "💪", "🔥", "⚡️", "🚀", "🏆"];

export const WeeklyWorkoutWidget = () => {
  const { workouts } = useFlux();

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayWorkouts = workouts.filter((w) => w.date === dateStr);
    return {
      day: d.toLocaleDateString("da-DK", { weekday: "short" }),
      done: dayWorkouts.length > 0,
      energy: dayWorkouts[0]?.energy || 0,
    };
  });

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display">{t("widget.weekly_workout")}</span>
      </div>
      <div className="flex-1 flex items-end justify-around gap-1">
        {last7.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                d.done
                  ? "bg-[hsl(var(--priority-low))] text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {d.done ? "✓" : "·"}
            </div>
            <span className="text-[9px] text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NextWorkoutWidget = () => {
  const { workouts } = useFlux();
  const latest = workouts[0];

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 p-1">
      <CalendarDays size={20} className="text-primary" />
      {latest ? (
        <>
          <span className="text-xs font-semibold font-display">{latest.activity}</span>
          <span className="text-[10px] text-muted-foreground">{latest.date}</span>
          <span className="text-lg">{energyEmojis[(latest.energy || 5) - 1]}</span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">{t("widget.no_workouts")}</span>
      )}
    </div>
  );
};
