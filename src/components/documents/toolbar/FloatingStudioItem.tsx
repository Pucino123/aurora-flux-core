import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingStudioItemProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders children into a portal on document.body when active (Studio Mode).
 * This breaks out of any parent overflow/clipping constraints.
 */
const FloatingStudioItem = ({ active, children, className = "" }: FloatingStudioItemProps) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (active) {
      let el = document.getElementById("studio-overlay");
      if (!el) {
        el = document.createElement("div");
        el.id = "studio-overlay";
        el.style.position = "fixed";
        el.style.inset = "0";
        el.style.pointerEvents = "none";
        el.style.zIndex = "9999";
        document.body.appendChild(el);
      }
      setPortalRoot(el);
    } else {
      setPortalRoot(null);
    }
  }, [active]);

  if (!active || !portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={className}
        style={{ pointerEvents: "auto" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>,
    portalRoot
  );
};

export default FloatingStudioItem;
