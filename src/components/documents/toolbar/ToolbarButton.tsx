import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  lightMode?: boolean;
  className?: string;
  disabled?: boolean;
}

const ToolbarButton = ({ icon, label, onClick, active = false, lightMode = false, className = "", disabled = false }: ToolbarButtonProps) => {
  const lm = lightMode;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              active
                ? lm
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "bg-white/[0.15] text-foreground shadow-[0_0_12px_hsl(var(--aurora-violet)/0.3)]"
                : lm
                  ? "hover:bg-gray-200/80 text-gray-600 hover:text-gray-900"
                  : "hover:bg-white/[0.1] text-foreground/70 hover:text-foreground"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px] px-2 py-1">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ToolbarButton;
