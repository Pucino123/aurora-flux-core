import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
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

// iOS-style spring physics for sortable toolbar segments
const SortableSegment = ({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } = useSortable({ id });
  const [justDropped, setJustDropped] = useState(false);

  // Handle drop settle animation
  React.useEffect(() => {
    if (!isDragging && isSorting) {
      setJustDropped(true);
      const t = setTimeout(() => setJustDropped(false), 400);
      return () => clearTimeout(t);
    }
  }, [isDragging, isSorting]);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    // No CSS transition — framer-motion layout handles it
    transition: undefined,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.05 : justDropped ? 1.02 : 1,
        rotate: isDragging ? (Math.random() > 0.5 ? 2 : -2) : 0,
        boxShadow: isDragging
          ? "0 20px 40px -10px rgba(0,0,0,0.35), 0 0 20px rgba(var(--primary-rgb, 139,92,246), 0.25)"
          : justDropped
            ? "0 8px 20px -6px rgba(0,0,0,0.2)"
            : "0 4px 12px -4px rgba(0,0,0,0.15)",
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={
        isDragging
          ? { type: "spring", stiffness: 400, damping: 28, layout: { type: "spring", stiffness: 500, damping: 35 } }
          : justDropped
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
