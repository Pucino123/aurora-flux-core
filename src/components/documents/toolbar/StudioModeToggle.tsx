import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StudioModeOverlayProps {
  active: boolean;
  onClose: () => void;
}

const StudioModeOverlay = ({ active, onClose }: StudioModeOverlayProps) => (
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/20 z-[100] pointer-events-none"
      />
    )}
  </AnimatePresence>
);

export default StudioModeOverlay;
