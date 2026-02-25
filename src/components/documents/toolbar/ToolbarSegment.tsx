import React from "react";
import { motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";

interface ToolbarSegmentProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  studioMode?: boolean;
  lightMode?: boolean;
  onHide?: () => void;
}

const ToolbarSegment = ({ children, className = "", visible = true, studioMode = false, lightMode = false, onHide }: ToolbarSegmentProps) => {
  if (!visible) return null;

  const lm = lightMode;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.18}
      dragConstraints={studioMode ? false : undefined}
      whileDrag={{
        scale: 1.06,
        rotate: 1.5,
        boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4), 0 0 30px rgba(139,92,246,0.25)",
        zIndex: 200,
      }}
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`group/seg flex items-center gap-0.5 px-1.5 py-1 rounded-xl cursor-grab active:cursor-grabbing ${
        lm ? "bg-white/60" : "bg-white/[0.06]"
      } ${className}`}
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="flex items-center justify-center w-3 h-5 opacity-0 group-hover/seg:opacity-40 hover:!opacity-70 transition-opacity duration-200 shrink-0">
        <GripVertical size={9} className="text-foreground/60" />
      </div>
      {children}
      {onHide && (
        <button
          onClick={(e) => { e.stopPropagation(); onHide(); }}
          className={`opacity-0 group-hover/seg:opacity-40 hover:!opacity-100 transition-opacity duration-200 ml-0.5 p-0.5 rounded ${
            lm ? "hover:bg-gray-200" : "hover:bg-white/10"
          }`}
          title="Hide"
        >
          <X size={9} className="text-foreground/60" />
        </button>
      )}
    </motion.div>
  );
};

export default ToolbarSegment;
