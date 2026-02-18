import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import ToolbarButton from "./ToolbarButton";

const COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#efefef", "#ffffff",
  "#ff0000", "#ff6600", "#ffcc00", "#33cc33", "#0099ff", "#6633cc", "#cc00cc",
  "#cc0000", "#cc5500", "#ccaa00", "#229922", "#0077cc", "#5522aa", "#aa00aa",
  "#990000", "#993300", "#997700", "#116611", "#005599", "#441188", "#880088",
];

interface ColorPickerPopoverProps {
  icon: React.ReactNode;
  label: string;
  onSelect: (color: string) => void;
  lightMode?: boolean;
}

const ColorPickerPopover = ({ icon, label, onSelect, lightMode = false }: ColorPickerPopoverProps) => {
  const lm = lightMode;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <ToolbarButton icon={icon} label={label} onClick={() => {}} lightMode={lm} />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[300] bg-popover border-border shadow-xl" align="start" sideOffset={6}>
        <div className="grid grid-cols-7 gap-1 p-2.5" onMouseDown={e => e.preventDefault()}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => onSelect(c)}
              className="w-5 h-5 rounded-sm border border-border/30 hover:scale-125 transition-transform duration-150 hover:shadow-md"
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            onClick={() => onSelect("")}
            className={`col-span-7 text-[10px] mt-1.5 px-2 py-1 rounded-md transition-colors ${
              lm ? "hover:bg-gray-100 text-gray-500" : "hover:bg-secondary/40 text-muted-foreground"
            }`}
          >
            Remove color
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPickerPopover;
