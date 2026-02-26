import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";
import { CalendarDays } from "lucide-react";
import { useFlux } from "@/context/FluxContext";

const TodaysPlanWidget = () => {
  const { setActiveView } = useFlux();
  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 360 : 1100,
    y: 20,
  }), []);

  return (
    <DraggableWidget id="planner" title="Planner" defaultPosition={defaultPlannerPos} defaultSize={{ w: 340, h: 520 }} scrollable>
      <div className="focus-planner-dark -mx-4 -mt-4 -mb-4 h-[calc(100%+2rem)] council-hidden-scrollbar overflow-auto">
        {/* Clickable header icon → full calendar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Today's Plan</span>
          <button
            onClick={() => setActiveView("calendar")}
            title="Open full calendar"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <CalendarDays size={14} />
          </button>
        </div>
        <Scheduler />
      </div>
    </DraggableWidget>
  );
};

export default TodaysPlanWidget;
