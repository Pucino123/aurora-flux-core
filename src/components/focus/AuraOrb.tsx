import React from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
}

/**
 * Siri-style fluid blob — multiple overlapping color blobs that morph
 * organically with borderRadius keyframes, creating the signature
 * Apple multi-color living shape.
 */
const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120 }) => {
  const isActive = state !== "idle";
  const half = size / 2;

  // Each blob has its own color, offset, morph shapes, and timing
  const blobs = [
    {
      // Red / Pink
      color: "rgba(255,55,95,0.85)",
      x: -half * 0.12,
      y: -half * 0.08,
      scale: 0.55,
      morph: {
        idle: [
          "40% 60% 55% 45% / 55% 45% 55% 45%",
          "55% 45% 40% 60% / 45% 55% 45% 55%",
          "40% 60% 55% 45% / 55% 45% 55% 45%",
        ],
        listening: [
          "35% 65% 60% 40% / 60% 40% 60% 40%",
          "60% 40% 35% 65% / 40% 60% 40% 60%",
          "35% 65% 60% 40% / 60% 40% 60% 40%",
        ],
        processing: [
          "30% 70% 65% 35% / 65% 35% 65% 35%",
          "65% 35% 30% 70% / 35% 65% 35% 65%",
          "30% 70% 65% 35% / 65% 35% 65% 35%",
        ],
        speaking: [
          "38% 62% 52% 48% / 58% 42% 58% 42%",
          "58% 42% 38% 62% / 42% 58% 42% 58%",
          "38% 62% 52% 48% / 58% 42% 58% 42%",
        ],
      },
      duration: { idle: 6, listening: 1.8, processing: 0.7, speaking: 2 },
    },
    {
      // Purple
      color: "rgba(168,85,247,0.8)",
      x: half * 0.1,
      y: half * 0.05,
      scale: 0.6,
      morph: {
        idle: [
          "55% 45% 45% 55% / 50% 50% 50% 50%",
          "45% 55% 55% 45% / 55% 45% 55% 45%",
          "55% 45% 45% 55% / 50% 50% 50% 50%",
        ],
        listening: [
          "60% 40% 40% 60% / 55% 45% 55% 45%",
          "40% 60% 60% 40% / 45% 55% 45% 55%",
          "60% 40% 40% 60% / 55% 45% 55% 45%",
        ],
        processing: [
          "65% 35% 35% 65% / 60% 40% 60% 40%",
          "35% 65% 65% 35% / 40% 60% 40% 60%",
          "65% 35% 35% 65% / 60% 40% 60% 40%",
        ],
        speaking: [
          "52% 48% 48% 52% / 52% 48% 52% 48%",
          "48% 52% 52% 48% / 48% 52% 48% 52%",
          "52% 48% 48% 52% / 52% 48% 52% 48%",
        ],
      },
      duration: { idle: 7, listening: 2, processing: 0.8, speaking: 2.2 },
    },
    {
      // Blue
      color: "rgba(59,130,246,0.8)",
      x: half * 0.08,
      y: -half * 0.12,
      scale: 0.52,
      morph: {
        idle: [
          "50% 50% 60% 40% / 45% 55% 45% 55%",
          "40% 60% 50% 50% / 55% 45% 55% 45%",
          "50% 50% 60% 40% / 45% 55% 45% 55%",
        ],
        listening: [
          "45% 55% 65% 35% / 40% 60% 40% 60%",
          "35% 65% 45% 55% / 60% 40% 60% 40%",
          "45% 55% 65% 35% / 40% 60% 40% 60%",
        ],
        processing: [
          "38% 62% 68% 32% / 35% 65% 35% 65%",
          "32% 68% 38% 62% / 65% 35% 65% 35%",
          "38% 62% 68% 32% / 35% 65% 35% 65%",
        ],
        speaking: [
          "48% 52% 58% 42% / 44% 56% 44% 56%",
          "42% 58% 48% 52% / 56% 44% 56% 44%",
          "48% 52% 58% 42% / 44% 56% 44% 56%",
        ],
      },
      duration: { idle: 8, listening: 1.6, processing: 0.6, speaking: 1.8 },
    },
    {
      // Cyan / Teal
      color: "rgba(6,182,212,0.75)",
      x: -half * 0.06,
      y: half * 0.14,
      scale: 0.48,
      morph: {
        idle: [
          "60% 40% 50% 50% / 50% 50% 40% 60%",
          "50% 50% 40% 60% / 40% 60% 50% 50%",
          "60% 40% 50% 50% / 50% 50% 40% 60%",
        ],
        listening: [
          "65% 35% 45% 55% / 45% 55% 35% 65%",
          "45% 55% 35% 65% / 35% 65% 45% 55%",
          "65% 35% 45% 55% / 45% 55% 35% 65%",
        ],
        processing: [
          "70% 30% 40% 60% / 40% 60% 30% 70%",
          "40% 60% 30% 70% / 30% 70% 40% 60%",
          "70% 30% 40% 60% / 40% 60% 30% 70%",
        ],
        speaking: [
          "56% 44% 48% 52% / 48% 52% 40% 60%",
          "48% 52% 40% 60% / 40% 60% 48% 52%",
          "56% 44% 48% 52% / 48% 52% 40% 60%",
        ],
      },
      duration: { idle: 9, listening: 2.2, processing: 0.9, speaking: 2.4 },
    },
    {
      // Orange / warm accent
      color: "rgba(255,159,10,0.6)",
      x: half * 0.15,
      y: half * 0.1,
      scale: 0.38,
      morph: {
        idle: [
          "45% 55% 50% 50% / 55% 45% 50% 50%",
          "55% 45% 55% 45% / 45% 55% 45% 55%",
          "45% 55% 50% 50% / 55% 45% 50% 50%",
        ],
        listening: [
          "40% 60% 55% 45% / 60% 40% 55% 45%",
          "60% 40% 60% 40% / 40% 60% 40% 60%",
          "40% 60% 55% 45% / 60% 40% 55% 45%",
        ],
        processing: [
          "35% 65% 60% 40% / 65% 35% 60% 40%",
          "65% 35% 65% 35% / 35% 65% 35% 65%",
          "35% 65% 60% 40% / 65% 35% 60% 40%",
        ],
        speaking: [
          "44% 56% 52% 48% / 56% 44% 52% 48%",
          "56% 44% 56% 44% / 44% 56% 44% 56%",
          "44% 56% 52% 48% / 56% 44% 52% 48%",
        ],
      },
      duration: { idle: 10, listening: 2.5, processing: 1, speaking: 2.6 },
    },
  ];

  const scaleMultiplier = {
    idle: [1, 1.04, 1],
    listening: [1, 1.15, 0.95, 1.1, 1],
    processing: [0.85, 1.12, 0.85],
    speaking: [1, 1.08, 0.96, 1.05, 1],
  };

  const containerScale = {
    idle: { duration: 5, ease: "easeInOut" as const },
    listening: { duration: 1.4, ease: "easeInOut" as const },
    processing: { duration: 0.6, ease: "easeInOut" as const },
    speaking: { duration: 1.8, ease: "easeInOut" as const },
  };

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Ambient glow behind the whole blob cluster */}
      <motion.div
        className="absolute inset-0"
        animate={{
          scale: isActive ? [1.2, 1.4, 1.2] : [1.1, 1.2, 1.1],
          opacity: isActive ? [0.4, 0.6, 0.4] : [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: isActive ? 2 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(59,130,246,0.15) 40%, transparent 70%)",
          filter: "blur(24px)",
          borderRadius: "50%",
        }}
      />

      {/* Main blob container — all blobs scale together */}
      <motion.div
        className="relative"
        style={{ width: size * 0.85, height: size * 0.85 }}
        animate={{ scale: scaleMultiplier[state] }}
        transition={{
          duration: containerScale[state].duration,
          repeat: Infinity,
          ease: containerScale[state].ease,
        }}
      >
        {blobs.map((blob, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: size * blob.scale,
              height: size * blob.scale,
              left: `calc(50% - ${(size * blob.scale) / 2}px + ${blob.x}px)`,
              top: `calc(50% - ${(size * blob.scale) / 2}px + ${blob.y}px)`,
              background: blob.color,
              filter: `blur(${size * 0.06}px)`,
              mixBlendMode: "screen",
            }}
            animate={{
              borderRadius: blob.morph[state],
            }}
            transition={{
              duration: blob.duration[state],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Central bright highlight for specular feel */}
        <motion.div
          className="absolute"
          style={{
            width: size * 0.28,
            height: size * 0.2,
            left: `calc(50% - ${(size * 0.28) / 2}px - ${size * 0.04}px)`,
            top: `calc(50% - ${(size * 0.2) / 2}px - ${size * 0.08}px)`,
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%)",
            filter: "blur(6px)",
            mixBlendMode: "overlay",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
};

export default AuraOrb;
