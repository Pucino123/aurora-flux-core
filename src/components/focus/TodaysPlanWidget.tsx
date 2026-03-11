import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";
import { useFlux } from "@/context/FluxContext";

const TodaysPlanWidget = () => {
  const { setActiveView } = useFlux();

  // Fixed to the right edge of the viewport — unaffected by sidebar
  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 340 - 16 : 1180,
    y: 0,
  }), []);

  const defaultPlannerHeight = typeof window !== "undefined" ? window.innerHeight : 900;

  return (
    <DraggableWidget
      id="planner"
      title="Today's Plan"
      defaultPosition={defaultPlannerPos}
      defaultSize={{ w: 340, h: defaultPlannerHeight }}
      scrollable
      fixedPosition
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
