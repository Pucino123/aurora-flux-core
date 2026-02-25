import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Wrench, Plus } from "lucide-react";
import { isDanish } from "@/lib/i18n";

interface ToolboxPopoverProps {
  hiddenSegments: string[];
  segmentLabels: Record<string, string>;
  onRestore: (id: string) => void;
  onRestoreAll: () => void;
  lightMode?: boolean;
}

const ToolboxPopover = ({ hiddenSegments, segmentLabels, onRestore, onRestoreAll, lightMode }: ToolboxPopoverProps) => {
  const lm = lightMode;

  if (hiddenSegments.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
            lm
              ? "hover:bg-gray-100 text-gray-500"
              : "hover:bg-white/10 text-foreground/50"
          }`}
          title={isDanish ? "Værktøjskasse" : "Toolbox"}
        >
          <Wrench size={14} />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
            {hiddenSegments.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className={`w-48 p-2 rounded-xl border backdrop-blur-xl ${
          lm ? "bg-white/95 border-gray-200" : "bg-popover/95 border-border/40"
        }`}
        style={{ zIndex: 9999 }}
      >
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
          {isDanish ? "Skjulte værktøjer" : "Hidden tools"}
        </p>
        <div className="space-y-0.5 mt-1">
          {hiddenSegments.map(id => (
            <button
              key={id}
              onClick={() => onRestore(id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                lm
                  ? "hover:bg-gray-100 text-gray-700"
                  : "hover:bg-white/10 text-foreground/80"
              }`}
            >
              <Plus size={12} className="text-primary shrink-0" />
              <span>{segmentLabels[id] || id}</span>
            </button>
          ))}
        </div>
        {hiddenSegments.length > 1 && (
          <button
            onClick={onRestoreAll}
            className={`w-full mt-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              lm
                ? "hover:bg-gray-100 text-primary"
                : "hover:bg-white/10 text-primary"
            }`}
          >
            {isDanish ? "Vis alle" : "Show all"}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ToolboxPopover;
