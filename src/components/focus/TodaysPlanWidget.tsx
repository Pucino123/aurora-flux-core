import React from "react";
import DraggableWidget from "./DraggableWidget";
import Scheduler from "../Scheduler";

const TodaysPlanWidget = () => {
  return (
    <DraggableWidget id="planner" title="Planner" defaultPosition={{ x: 60, y: 80 }} defaultSize={{ w: 340, h: 520 }} scrollable>
      <div className="focus-planner-dark -mx-4 -mt-4 -mb-4 h-[calc(100%+2rem)] council-hidden-scrollbar overflow-auto">
        <Scheduler />
      </div>
    </DraggableWidget>
  );
};

export default TodaysPlanWidget;
