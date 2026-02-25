import React from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

interface ToolbarSegmentProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  id?: string;
  studioMode?: boolean;
  lightMode?: boolean;
}

const ToolbarSegment = ({ children, className = "", visible = true, studioMode = false, lightMode = false }: ToolbarSegmentProps) => {
  if (!visible) return null;

  const lm = lightMode;
  const baseCls = `group/seg flex items-center gap-0.5 px-1.5 py-1 rounded-xl backdrop-blur-[16px] border shadow-lg cursor-grab active:cursor-grabbing ${
    lm
      ? "bg-white/80 border-gray-200/60"
      : "bg-white/[0.08] border-white/[0.15]"
  } ${className}`;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.18}
      dragConstraints={studioMode ? undefined : undefined}
      whileDrag={{
        scale: 1.06,
        rotate: 1.5,
        boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4), 0 0 30px rgba(139,92,246,0.25)",
        zIndex: 200,
      }}
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={baseCls}
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="flex items-center justify-center w-3 h-5 opacity-0 group-hover/seg:opacity-40 hover:!opacity-70 transition-opacity duration-200 shrink-0">
        <GripVertical size={9} className="text-foreground/60" />
      </div>
      {children}
    </motion.div>
  );
};

export default ToolbarSegment;
