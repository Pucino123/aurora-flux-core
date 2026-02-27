import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";
import { useFlux } from "@/context/FluxContext";

const TodaysPlanWidget = () => {
  const { setActiveView } = useFlux();

  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 380 : 1100,
    y: 60,
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
