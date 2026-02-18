import React, { useMemo } from "react";
import { Bell } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { format } from "date-fns";

const NotificationBell = () => {
  const { tasks } = useFlux();

  const overdueCount = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return tasks.filter(t => !t.done && t.due_date && t.due_date < today).length;
  }, [tasks]);

  return (
    <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Notifications">
      <Bell size={16} />
      {overdueCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5">
          {overdueCount > 9 ? "9+" : overdueCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
