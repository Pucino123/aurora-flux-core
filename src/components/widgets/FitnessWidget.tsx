import { t } from "@/lib/i18n";
import WorkoutWidget from "./WorkoutWidget";
import { useFlux } from "@/context/FluxContext";
import { CalendarDays } from "lucide-react";

const energyEmojis = ["😫", "😓", "😐", "🙂", "😊", "💪", "🔥", "⚡️", "🚀", "🏆"];

export const WeeklyWorkoutWidget = () => <WorkoutWidget />;

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
