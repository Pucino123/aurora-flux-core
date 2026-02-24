import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";

const TodaysPlanWidget = () => {
  const defaultPlannerPos = React.useMemo(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 360 : 1100,
    y: 20,
  }), []);

  return (
    <DraggableWidget id="planner" title="Planner" defaultPosition={defaultPlannerPos} defaultSize={{ w: 340, h: 520 }} scrollable>
      <div className="focus-planner-dark -mx-4 -mt-4 -mb-4 h-[calc(100%+2rem)] council-hidden-scrollbar overflow-auto">
        <Scheduler />
      </div>
    </DraggableWidget>
  );
};

export default TodaysPlanWidget;
