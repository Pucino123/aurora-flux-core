import React from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
}

const stateConfig = {
  idle: {
    scale: [1, 1.05, 1],
    rotate: [0, 360],
    transition: {
      scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
    },
  },
  listening: {
    scale: [1, 1.12, 0.97, 1.08, 1],
    rotate: [0, 360],
    transition: {
      scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
    },
  },
  processing: {
    scale: [0.88, 1.1, 0.88],
    rotate: [0, 720],
    transition: {
      scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
    },
  },
  speaking: {
    scale: [1, 1.06, 0.98, 1.04, 1],
    rotate: [0, 360],
    transition: {
      scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 12, repeat: Infinity, ease: "linear" },
    },
  },
};

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120 }) => {
  const config = stateConfig[state];
  const isActive = state !== "idle";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: config.scale.map((s) => s * 1.3),
          opacity: isActive ? [0.3, 0.5, 0.3] : [0.15, 0.25, 0.15],
        }}
        transition={{
          scale: config.transition.scale,
          opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Mid layer — conic gradient */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          background: "conic-gradient(from 0deg, #a855f7, #3b82f6, #06b6d4, #ec4899, #a855f7)",
          filter: "blur(12px)",
          opacity: 0.6,
        }}
        animate={{
          rotate: config.rotate,
          scale: config.scale,
        }}
        transition={{
          rotate: config.transition.rotate,
          scale: config.transition.scale,
        }}
      />

      {/* Core orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: "radial-gradient(circle at 35% 35%, #c084fc, #7c3aed 40%, #3b82f6 70%, #06b6d4 100%)",
          boxShadow: `0 0 ${isActive ? 40 : 20}px rgba(139,92,246,0.5), inset 0 0 20px rgba(255,255,255,0.1)`,
        }}
        animate={{
          scale: config.scale,
        }}
        transition={config.transition.scale}
      />

      {/* Specular highlight */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.3,
          height: size * 0.2,
          top: size * 0.22,
          left: size * 0.28,
          background: "radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default AuraOrb;
