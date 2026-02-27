import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";
import { useFlux } from "@/context/FluxContext";

const TodaysPlanWidget = () => {
  const { setActiveView } = useFlux();

  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== "undefined" ? Math.round(window.innerWidth * 0.75) : 1100,
    y: typeof window !== "undefined" ? Math.round(window.innerHeight * 0.06) : 60,
  }), []);

  return (
    <DraggableWidget
      id="planner"
      title="Today's Plan"
      defaultPosition={defaultPlannerPos}
      defaultSize={{ w: 340, h: 620 }}
      scrollable
    >
      <div className="focus-planner-dark -mx-4 -mt-4 -mb-4 h-[calc(100%+2rem)] council-hidden-scrollbar overflow-auto flex flex-col">
        <div className="flex-1 min-h-0">
          <Scheduler onOpenFullCalendar={() => setActiveView("calendar")} />
        </div>
      </div>
    </DraggableWidget>
  );
};

export default TodaysPlanWidget;
