import React from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
}

/*
 * Siri-style orb — thin translucent SVG ribbon paths that weave
 * and cross inside a dark sphere, with a bright central glow.
 */

// Each ribbon: array of 'd' path keyframes + gradient colors + per-state timing
const ribbons = [
  {
    // Cyan → Pink ribbon — sweeps top-left to bottom-right
    id: "r1",
    gradientColors: ["#06d6f0", "#ec4899"],
    paths: {
      idle: [
        "M 40 100 C 60 40, 120 30, 160 100 C 140 160, 80 170, 40 100",
        "M 35 95 C 70 30, 130 50, 165 105 C 130 170, 70 160, 35 95",
        "M 45 105 C 55 45, 125 25, 155 95 C 145 155, 85 175, 45 105",
        "M 40 100 C 60 40, 120 30, 160 100 C 140 160, 80 170, 40 100",
      ],
      listening: [
        "M 30 100 C 55 20, 135 15, 170 100 C 145 180, 65 185, 30 100",
        "M 25 90 C 65 10, 145 25, 175 110 C 135 190, 55 180, 25 90",
        "M 35 110 C 50 25, 130 10, 165 90 C 150 175, 70 190, 35 110",
        "M 30 100 C 55 20, 135 15, 170 100 C 145 180, 65 185, 30 100",
      ],
      processing: [
        "M 60 100 C 75 65, 110 55, 140 100 C 125 140, 90 145, 60 100",
        "M 65 95 C 80 60, 115 70, 135 105 C 120 135, 85 140, 65 95",
        "M 55 105 C 70 70, 105 60, 145 95 C 130 130, 95 150, 55 105",
        "M 60 100 C 75 65, 110 55, 140 100 C 125 140, 90 145, 60 100",
      ],
      speaking: [
        "M 38 100 C 58 35, 125 28, 162 100 C 142 165, 78 172, 38 100",
        "M 42 95 C 62 42, 128 32, 158 105 C 138 158, 82 168, 42 95",
        "M 35 105 C 55 38, 122 25, 165 95 C 145 162, 75 175, 35 105",
        "M 38 100 C 58 35, 125 28, 162 100 C 142 165, 78 172, 38 100",
      ],
    },
    duration: { idle: 8, listening: 2.5, processing: 0.7, speaking: 2 },
    strokeWidth: 2.5,
    opacity: 0.8,
  },
  {
    // Pink → Purple ribbon — sweeps bottom-left to top-right
    id: "r2",
    gradientColors: ["#f472b6", "#a855f7"],
    paths: {
      idle: [
        "M 100 35 C 160 55, 175 120, 100 165 C 40 140, 25 80, 100 35",
        "M 105 30 C 170 50, 180 130, 95 170 C 30 145, 20 75, 105 30",
        "M 95 40 C 155 60, 170 115, 105 160 C 45 135, 30 85, 95 40",
        "M 100 35 C 160 55, 175 120, 100 165 C 40 140, 25 80, 100 35",
      ],
      listening: [
        "M 100 20 C 175 45, 190 130, 100 180 C 25 150, 10 70, 100 20",
        "M 110 15 C 180 40, 195 140, 90 185 C 15 155, 5 60, 110 15",
        "M 90 25 C 170 50, 185 125, 110 175 C 30 145, 15 75, 90 25",
        "M 100 20 C 175 45, 190 130, 100 180 C 25 150, 10 70, 100 20",
      ],
      processing: [
        "M 100 60 C 135 70, 145 115, 100 140 C 65 125, 55 85, 100 60",
        "M 105 55 C 140 68, 148 120, 95 145 C 60 128, 52 82, 105 55",
        "M 95 65 C 130 75, 142 110, 105 135 C 70 122, 58 88, 95 65",
        "M 100 60 C 135 70, 145 115, 100 140 C 65 125, 55 85, 100 60",
      ],
      speaking: [
        "M 100 32 C 165 52, 178 125, 100 168 C 38 142, 22 78, 100 32",
        "M 108 28 C 168 48, 182 128, 92 172 C 32 148, 18 72, 108 28",
        "M 92 38 C 158 58, 172 118, 108 162 C 42 138, 28 82, 92 38",
        "M 100 32 C 165 52, 178 125, 100 168 C 38 142, 22 78, 100 32",
      ],
    },
    duration: { idle: 7, listening: 2, processing: 0.6, speaking: 1.8 },
    strokeWidth: 2,
    opacity: 0.75,
  },
  {
    // Green → Blue ribbon — diagonal
    id: "r3",
    gradientColors: ["#34d399", "#3b82f6"],
    paths: {
      idle: [
        "M 55 55 C 90 30, 140 60, 145 145 C 120 170, 60 140, 55 55",
        "M 50 60 C 85 25, 145 55, 150 140 C 125 175, 55 145, 50 60",
        "M 60 50 C 95 35, 135 65, 140 150 C 115 165, 65 135, 60 50",
        "M 55 55 C 90 30, 140 60, 145 145 C 120 170, 60 140, 55 55",
      ],
      listening: [
        "M 40 40 C 85 15, 155 50, 160 160 C 130 185, 45 155, 40 40",
        "M 35 45 C 80 10, 160 45, 165 155 C 135 190, 40 160, 35 45",
        "M 45 35 C 90 20, 150 55, 155 165 C 125 180, 50 150, 45 35",
        "M 40 40 C 85 15, 155 50, 160 160 C 130 185, 45 155, 40 40",
      ],
      processing: [
        "M 75 75 C 95 60, 120 75, 125 125 C 110 140, 80 120, 75 75",
        "M 70 80 C 90 55, 125 70, 130 120 C 115 145, 75 125, 70 80",
        "M 80 70 C 100 65, 115 80, 120 130 C 105 135, 85 115, 80 70",
        "M 75 75 C 95 60, 120 75, 125 125 C 110 140, 80 120, 75 75",
      ],
      speaking: [
        "M 52 52 C 88 28, 142 58, 148 148 C 122 172, 58 142, 52 52",
        "M 48 58 C 82 22, 148 52, 152 142 C 128 178, 52 148, 48 58",
        "M 58 48 C 92 32, 138 62, 142 152 C 118 168, 62 138, 58 48",
        "M 52 52 C 88 28, 142 58, 148 148 C 122 172, 58 142, 52 52",
      ],
    },
    duration: { idle: 9, listening: 2.8, processing: 0.8, speaking: 2.2 },
    strokeWidth: 2,
    opacity: 0.7,
  },
  {
    // Orange → Cyan ribbon — inverse diagonal
    id: "r4",
    gradientColors: ["#fb923c", "#06b6d4"],
    paths: {
      idle: [
        "M 145 55 C 170 90, 140 140, 55 145 C 30 120, 60 60, 145 55",
        "M 150 50 C 175 85, 145 145, 50 150 C 25 125, 55 55, 150 50",
        "M 140 60 C 165 95, 135 135, 60 140 C 35 115, 65 65, 140 60",
        "M 145 55 C 170 90, 140 140, 55 145 C 30 120, 60 60, 145 55",
      ],
      listening: [
        "M 160 40 C 185 85, 155 155, 40 160 C 15 130, 45 45, 160 40",
        "M 165 35 C 190 80, 160 160, 35 165 C 10 135, 40 40, 165 35",
        "M 155 45 C 180 90, 150 150, 45 155 C 20 125, 50 50, 155 45",
        "M 160 40 C 185 85, 155 155, 40 160 C 15 130, 45 45, 160 40",
      ],
      processing: [
        "M 125 75 C 140 95, 120 120, 75 125 C 60 110, 80 80, 125 75",
        "M 130 70 C 145 90, 125 125, 70 130 C 55 115, 75 75, 130 70",
        "M 120 80 C 135 100, 115 115, 80 120 C 65 105, 85 85, 120 80",
        "M 125 75 C 140 95, 120 120, 75 125 C 60 110, 80 80, 125 75",
      ],
      speaking: [
        "M 148 52 C 172 88, 142 142, 52 148 C 28 122, 58 58, 148 52",
        "M 152 48 C 178 82, 148 148, 48 152 C 22 128, 52 52, 152 48",
        "M 142 58 C 168 92, 138 138, 58 142 C 32 118, 62 62, 142 58",
        "M 148 52 C 172 88, 142 142, 52 148 C 28 122, 58 58, 148 52",
      ],
    },
    duration: { idle: 10, listening: 3, processing: 0.9, speaking: 2.4 },
    strokeWidth: 1.8,
    opacity: 0.65,
  },
  {
    // Purple → Teal — figure-8 shape
    id: "r5",
    gradientColors: ["#c084fc", "#2dd4bf"],
    paths: {
      idle: [
        "M 100 70 C 130 40, 160 80, 130 100 C 160 120, 130 160, 100 130 C 70 160, 40 120, 70 100 C 40 80, 70 40, 100 70",
        "M 100 65 C 135 35, 165 75, 135 100 C 165 125, 135 165, 100 135 C 65 165, 35 125, 65 100 C 35 75, 65 35, 100 65",
        "M 100 75 C 125 45, 155 85, 125 100 C 155 115, 125 155, 100 125 C 75 155, 45 115, 75 100 C 45 85, 75 45, 100 75",
        "M 100 70 C 130 40, 160 80, 130 100 C 160 120, 130 160, 100 130 C 70 160, 40 120, 70 100 C 40 80, 70 40, 100 70",
      ],
      listening: [
        "M 100 60 C 140 25, 175 70, 140 100 C 175 130, 140 175, 100 140 C 60 175, 25 130, 60 100 C 25 70, 60 25, 100 60",
        "M 100 55 C 145 20, 180 65, 145 100 C 180 135, 145 180, 100 145 C 55 180, 20 135, 55 100 C 20 65, 55 20, 100 55",
        "M 100 65 C 135 30, 170 75, 135 100 C 170 125, 135 170, 100 135 C 65 170, 30 125, 65 100 C 30 75, 65 30, 100 65",
        "M 100 60 C 140 25, 175 70, 140 100 C 175 130, 140 175, 100 140 C 60 175, 25 130, 60 100 C 25 70, 60 25, 100 60",
      ],
      processing: [
        "M 100 80 C 115 65, 135 85, 115 100 C 135 115, 115 135, 100 120 C 85 135, 65 115, 85 100 C 65 85, 85 65, 100 80",
        "M 100 78 C 118 62, 138 82, 118 100 C 138 118, 118 138, 100 122 C 82 138, 62 118, 82 100 C 62 82, 82 62, 100 78",
        "M 100 82 C 112 68, 132 88, 112 100 C 132 112, 112 132, 100 118 C 88 132, 68 112, 88 100 C 68 88, 88 68, 100 82",
        "M 100 80 C 115 65, 135 85, 115 100 C 135 115, 115 135, 100 120 C 85 135, 65 115, 85 100 C 65 85, 85 65, 100 80",
      ],
      speaking: [
        "M 100 68 C 132 38, 162 78, 132 100 C 162 122, 132 162, 100 132 C 68 162, 38 122, 68 100 C 38 78, 68 38, 100 68",
        "M 100 72 C 128 42, 158 82, 128 100 C 158 118, 128 158, 100 128 C 72 158, 42 118, 72 100 C 42 82, 72 42, 100 72",
        "M 100 65 C 135 35, 165 75, 135 100 C 165 125, 135 165, 100 135 C 65 165, 35 125, 65 100 C 35 75, 65 35, 100 65",
        "M 100 68 C 132 38, 162 78, 132 100 C 162 122, 132 162, 100 132 C 68 162, 38 122, 68 100 C 38 78, 68 38, 100 68",
      ],
    },
    duration: { idle: 6, listening: 1.8, processing: 0.5, speaking: 1.6 },
    strokeWidth: 2.2,
    opacity: 0.7,
  },
];

const scaleBreathing = {
  idle: { scale: [1, 1.03, 1], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } },
  listening: { scale: [1, 1.08, 0.96, 1.06, 1], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
  processing: { scale: [0.92, 1.06, 0.92], transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } },
  speaking: { scale: [1, 1.06, 0.97, 1.04, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
};

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120 }) => {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          opacity: state === "idle" ? [0.15, 0.25, 0.15] : [0.3, 0.5, 0.3],
          scale: state === "idle" ? [1.1, 1.2, 1.1] : [1.15, 1.35, 1.15],
        }}
        transition={{ duration: state === "idle" ? 4 : 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(6,182,212,0.12) 40%, transparent 70%)",
          filter: "blur(16px)",
        }}
      />

      {/* Main SVG orb */}
      <motion.div
        animate={scaleBreathing[state]}
        style={{ width: size * 0.88, height: size * 0.88 }}
      >
        <svg
          viewBox="0 0 200 200"
          width="100%"
          height="100%"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Dark sphere background */}
            <radialGradient id="sphereBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1030" />
              <stop offset="60%" stopColor="#0d0a1a" />
              <stop offset="100%" stopColor="#050510" />
            </radialGradient>

            {/* Central glow */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.5" />
              <stop offset="30%" stopColor="white" stopOpacity="0.15" />
              <stop offset="70%" stopColor="white" stopOpacity="0" />
            </radialGradient>

            {/* Specular highlight */}
            <radialGradient id="specular" cx="38%" cy="32%" r="30%">
              <stop offset="0%" stopColor="white" stopOpacity="0.18" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>

            {/* Ribbon gradients */}
            {ribbons.map((r) => (
              <linearGradient key={r.id} id={`grad-${r.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={r.gradientColors[0]} />
                <stop offset="100%" stopColor={r.gradientColors[1]} />
              </linearGradient>
            ))}

            {/* Soft blur for ribbons */}
            <filter id="ribbonBlur">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>

          {/* Dark sphere */}
          <circle cx="100" cy="100" r="96" fill="url(#sphereBg)" />

          {/* Clip ribbons to sphere */}
          <clipPath id="sphereClip">
            <circle cx="100" cy="100" r="94" />
          </clipPath>

          <g clipPath="url(#sphereClip)">
            {/* Ribbon paths */}
            {ribbons.map((ribbon) => (
              <React.Fragment key={ribbon.id}>
                {/* Glow layer — wider, more transparent */}
                <motion.path
                  d={ribbon.paths[state][0]}
                  animate={{ d: ribbon.paths[state] }}
                  transition={{
                    duration: ribbon.duration[state],
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  fill="none"
                  stroke={`url(#grad-${ribbon.id})`}
                  strokeWidth={ribbon.strokeWidth + 4}
                  strokeLinecap="round"
                  opacity={ribbon.opacity * 0.25}
                  filter="url(#ribbonBlur)"
                />
                {/* Main ribbon stroke */}
                <motion.path
                  d={ribbon.paths[state][0]}
                  animate={{ d: ribbon.paths[state] }}
                  transition={{
                    duration: ribbon.duration[state],
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  fill="none"
                  stroke={`url(#grad-${ribbon.id})`}
                  strokeWidth={ribbon.strokeWidth}
                  strokeLinecap="round"
                  opacity={ribbon.opacity}
                  filter="url(#ribbonBlur)"
                />
                {/* Bright core line */}
                <motion.path
                  d={ribbon.paths[state][0]}
                  animate={{ d: ribbon.paths[state] }}
                  transition={{
                    duration: ribbon.duration[state],
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  fill="none"
                  stroke="white"
                  strokeWidth={ribbon.strokeWidth * 0.3}
                  strokeLinecap="round"
                  opacity={ribbon.opacity * 0.3}
                  filter="url(#ribbonBlur)"
                />
              </React.Fragment>
            ))}

            {/* Central white glow */}
            <motion.circle
              cx="100"
              cy="100"
              r="28"
              fill="url(#centerGlow)"
              animate={{
                opacity: state === "idle" ? [0.4, 0.6, 0.4] : [0.5, 0.85, 0.5],
                r: state === "idle" ? [26, 30, 26] : [24, 34, 24],
              }}
              transition={{
                duration: state === "idle" ? 4 : 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>

          {/* Specular highlight on top */}
          <circle cx="80" cy="68" r="32" fill="url(#specular)" />

          {/* Sphere edge ring */}
          <circle
            cx="100"
            cy="100"
            r="96"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.8"
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default AuraOrb;
