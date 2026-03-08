import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionText, onAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full w-full p-8 text-center"
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full" />
        <Icon className="relative w-14 h-14 text-muted-foreground/40" strokeWidth={1.5} />
      </div>
      <p className="text-foreground/80 text-base font-medium tracking-tight mb-2">{title}</p>
      <p className="text-muted-foreground text-sm max-w-[220px] mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-foreground/80 border border-white/10 shadow-lg text-xs font-medium transition-all"
        >
          {actionText}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
import React from "react";
