import React, { useMemo } from "react";
import { useFlux } from "@/context/FluxContext";
import { Award, Flame, Zap, Target } from "lucide-react";
import { format, subDays, differenceInCalendarDays } from "date-fns";

const GamificationCard = () => {
  const { tasks, workouts } = useFlux();

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Calculate task streak (consecutive days with completed tasks)
    let taskStreak = 0;
    for (let i = 0; i < 365; i++) {
      const dayStr = format(subDays(today, i), "yyyy-MM-dd");
      const completedOnDay = tasks.some(t => t.done && t.updated_at?.startsWith(dayStr));
      if (completedOnDay) taskStreak++;
      else break;
    }

    // Workout streak
    let workoutStreak = 0;
    const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < sortedWorkouts.length; i++) {
      const expectedDate = format(subDays(today, i), "yyyy-MM-dd");
      if (sortedWorkouts.some(w => w.date === expectedDate)) workoutStreak++;
      else break;
    }

    // Weekly completions
    const weekStart = subDays(today, 6);
    const weekCompleted = tasks.filter(t => {
      if (!t.done || !t.updated_at) return false;
      const d = new Date(t.updated_at);
      return d >= weekStart && d <= today;
    }).length;

    // Level (based on total completions)
    const totalCompleted = tasks.filter(t => t.done).length;
    const level = Math.floor(totalCompleted / 10) + 1;
    const xpInLevel = totalCompleted % 10;

    return { taskStreak, workoutStreak, weekCompleted, level, xpInLevel, totalCompleted };
  }, [tasks, workouts]);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-3">
        <Award size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display">Streaks & Progress</span>
      </div>

      {/* Level bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="font-medium">Level {stats.level}</span>
          <span className="text-muted-foreground">{stats.xpInLevel}/10 XP</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${(stats.xpInLevel / 10) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-secondary/50">
          <Flame size={16} className="text-orange-500 mb-1" />
          <span className="text-lg font-bold font-display">{stats.taskStreak}</span>
          <span className="text-[9px] text-muted-foreground">Task Streak</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-secondary/50">
          <Zap size={16} className="text-yellow-500 mb-1" />
          <span className="text-lg font-bold font-display">{stats.workoutStreak}</span>
          <span className="text-[9px] text-muted-foreground">Workout Streak</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-secondary/50">
          <Target size={16} className="text-primary mb-1" />
          <span className="text-lg font-bold font-display">{stats.weekCompleted}</span>
          <span className="text-[9px] text-muted-foreground">This Week</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-secondary/50">
          <Award size={16} className="text-primary mb-1" />
          <span className="text-lg font-bold font-display">{stats.totalCompleted}</span>
          <span className="text-[9px] text-muted-foreground">Total Done</span>
        </div>
      </div>
    </div>
  );
};

export default GamificationCard;
