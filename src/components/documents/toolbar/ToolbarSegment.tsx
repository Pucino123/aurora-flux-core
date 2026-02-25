import React, { useState } from "react";
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
  studioMode?: boolean;
}

const ToolbarSegment = ({ children, className = "", visible = true, id, sortable = false, studioMode = false }: ToolbarSegmentProps) => {
  if (!visible) return null;

  if (sortable && id) {
    return <SortableSegment id={id} className={className} studioMode={studioMode}>{children}</SortableSegment>;
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

// iOS-style spring physics for sortable toolbar segments
const SortableSegment = ({ id, children, className = "", studioMode = false }: { id: string; children: React.ReactNode; className?: string; studioMode?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } = useSortable({ id });
  const [justDropped, setJustDropped] = useState(false);

  React.useEffect(() => {
    if (!isDragging && isSorting) {
      setJustDropped(true);
      const t = setTimeout(() => setJustDropped(false), 400);
      return () => clearTimeout(t);
    }
  }, [isDragging, isSorting]);

  // In studio mode, segments are free-draggable via framer-motion
  if (studioMode) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileDrag={{ scale: 1.06, boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4), 0 0 30px rgba(139,92,246,0.2)", zIndex: 100 }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={`group/seg flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/[0.08] backdrop-blur-[16px] border border-white/[0.15] shadow-lg cursor-grab active:cursor-grabbing ${className}`}
        style={{ position: "relative", zIndex: 1 }}
      >
        <div className="flex items-center justify-center w-3 h-5 opacity-40 shrink-0">
          <GripVertical size={9} className="text-foreground/60" />
        </div>
        {children}
      </motion.div>
    );
  }

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: undefined,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
    // When dragging, make the original ghost semi-transparent
    opacity: isDragging ? 0.3 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        scale: justDropped ? 1.02 : 1,
        boxShadow: justDropped
          ? "0 8px 20px -6px rgba(0,0,0,0.2)"
          : "0 4px 12px -4px rgba(0,0,0,0.15)",
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={
        justDropped
          ? { type: "spring", stiffness: 300, damping: 22, bounce: 0.15, layout: { type: "spring", stiffness: 500, damping: 35 } }
          : { type: "spring", stiffness: 500, damping: 35, layout: { type: "spring", stiffness: 500, damping: 35 } }
      }
      className={`group/seg flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/[0.08] backdrop-blur-[16px] border border-white/[0.15] transition-colors duration-200 ${
        isDragging ? "ring-2 ring-primary/40 border-primary/30" : ""
      } ${justDropped ? "ring-1 ring-primary/20" : ""} ${className}`}
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
