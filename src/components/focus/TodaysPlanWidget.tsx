import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";
import { CalendarDays } from "lucide-react";
import { useFlux } from "@/context/FluxContext";

const TodaysPlanWidget = () => {
  const { setActiveView } = useFlux();

  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 360 : 1100,
    y: 20,
  }), []);

  const calendarAction = (
    <button
      onClick={() => setActiveView("calendar")}
      title="Open full calendar"
      className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
    >
      <CalendarDays size={14} />
    </button>
  );

  return (
    <DraggableWidget
      id="planner"
      title="Today's Plan"
      defaultPosition={defaultPlannerPos}
      defaultSize={{ w: 340, h: 520 }}
      scrollable
      headerActions={calendarAction}
    >
      <div className="focus-planner-dark -mx-4 -mt-4 -mb-4 h-[calc(100%+2rem)] council-hidden-scrollbar overflow-auto flex flex-col">
        <div className="flex-1 min-h-0">
          <Scheduler />
        </div>
      </div>
    </DraggableWidget>
  );
};

export default TodaysPlanWidget;
