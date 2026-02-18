import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface ToolbarSegmentProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  id?: string;
  sortable?: boolean;
}

const ToolbarSegment = ({ children, className = "", visible = true, id, sortable = false }: ToolbarSegmentProps) => {
  if (!visible) return null;

  if (sortable && id) {
    return <SortableSegment id={id} className={className}>{children}</SortableSegment>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/[0.08] backdrop-blur-[16px] border border-white/[0.15] shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  );
};

const SortableSegment = ({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? "1.04" : "1",
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 35 }, duration: 0.15 }}
      className={`group/seg flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/[0.08] backdrop-blur-[16px] border border-white/[0.15] shadow-lg transition-shadow duration-200 ${isDragging ? "shadow-2xl ring-2 ring-primary/40 border-primary/30" : ""} ${className}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-3 h-5 cursor-grab active:cursor-grabbing opacity-0 group-hover/seg:opacity-30 hover:!opacity-70 transition-all duration-200 shrink-0"
        title="Drag to reorder"
      >
        <GripVertical size={9} className="text-foreground/60" />
      </div>
      {children}
    </motion.div>
  );
};

export default ToolbarSegment;
