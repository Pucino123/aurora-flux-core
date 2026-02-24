import React from "react";
import { Focus, Printer, ZoomIn, ZoomOut, Sun, Moon } from "lucide-react";
import ToolbarButton from "./ToolbarButton";

interface ViewModeToggleProps {
  studioMode: boolean;
  onToggleStudio: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
}

const ViewModeToggle = ({ studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false, onToggleLightMode }: ViewModeToggleProps) => {
  const lm = lightMode;

  return (
    <>
      <ToolbarButton
        icon={<Focus size={14} />}
        label={studioMode ? "Exit Studio Mode" : "Studio Mode"}
        onClick={onToggleStudio}
        active={studioMode}
        lightMode={lm}
      />
      <ToolbarButton icon={<ZoomOut size={14} />} label="Zoom out" onClick={() => onZoomChange(Math.max(50, zoom - 10))} lightMode={lm} />
      <span className={`text-[10px] min-w-[32px] text-center font-mono ${lm ? "text-gray-500" : "text-foreground/50"}`}>{zoom}%</span>
      <ToolbarButton icon={<ZoomIn size={14} />} label="Zoom in" onClick={() => onZoomChange(Math.min(200, zoom + 10))} lightMode={lm} />
      <ToolbarButton icon={<Printer size={14} />} label="Print" onClick={() => window.print()} lightMode={lm} />
      {onToggleLightMode && (
        <>
          <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />
          <ToolbarButton
            icon={lm ? <Moon size={14} /> : <Sun size={14} />}
            label={lm ? "Dark mode" : "Light mode"}
            onClick={onToggleLightMode}
            lightMode={lm}
          />
        </>
      )}
    </>
  );
};

export default ViewModeToggle;
