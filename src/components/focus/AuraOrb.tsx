import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

/*
 * Siri-style orb — Canvas-based smooth aurora color bands that
 * flow and blend like real Siri, not geometric SVG paths.
 */

// Color palette for Siri-like bands
const BAND_COLORS = [
  { r: 255, g: 60, b: 120, label: "pink" },
  { r: 100, g: 180, b: 255, label: "blue" },
  { r: 180, g: 100, b: 255, label: "purple" },
  { r: 80, g: 220, b: 200, label: "teal" },
  { r: 255, g: 140, b: 50, label: "orange" },
  { r: 120, g: 255, b: 160, label: "green" },
];

interface Band {
  color: typeof BAND_COLORS[number];
  phase: number;
  speed: number;
  amplitude: number;
  yOffset: number;
  width: number;
}

function createBands(): Band[] {
  return BAND_COLORS.map((color, i) => ({
    color,
    phase: (i / BAND_COLORS.length) * Math.PI * 2,
    speed: 0.3 + i * 0.08,
    amplitude: 0.15 + (i % 3) * 0.06,
    yOffset: -0.25 + (i / (BAND_COLORS.length - 1)) * 0.5,
    width: 0.12 + (i % 2) * 0.04,
  }));
}

const stateConfig = {
  idle: { speedMul: 1, ampMul: 1, glow: 0.4, brightness: 0.7 },
  listening: { speedMul: 2.2, ampMul: 1.4, glow: 0.7, brightness: 1 },
  processing: { speedMul: 4, ampMul: 0.6, glow: 0.9, brightness: 1.2 },
  speaking: { speedMul: 1.8, ampMul: 1.2, glow: 0.6, brightness: 0.9 },
};

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandsRef = useRef<Band[]>(createBands());
  const timeRef = useRef(0);
  const stateRef = useRef(state);
  const configRef = useRef(stateConfig[state]);
  const animRef = useRef<number>(0);

  stateRef.current = state;

  // Smoothly interpolate config
  useEffect(() => {
    const target = stateConfig[state];
    const start = { ...configRef.current };
    const startTime = performance.now();
    const duration = 600;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const eased = t * t * (3 - 2 * t); // smoothstep
      configRef.current = {
        speedMul: lerp(start.speedMul, target.speedMul, eased),
        ampMul: lerp(start.ampMul, target.ampMul, eased),
        glow: lerp(start.glow, target.glow, eased),
        brightness: lerp(start.brightness, target.brightness, eased),
      };
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const bands = bandsRef.current;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt * configRef.current.speedMul;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = w * 0.44;

      // Dark sphere background
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      bgGrad.addColorStop(0, "#1a1030");
      bgGrad.addColorStop(0.6, "#0d0a1a");
      bgGrad.addColorStop(1, "#050510");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw flowing aurora bands
      const cfg = configRef.current;
      const numPoints = 80;

      for (const band of bands) {
        const { color, phase, speed, amplitude, yOffset, width: bandW } = band;
        const amp = amplitude * cfg.ampMul * radius;
        const bw = bandW * radius * 1.2;

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Build wave path points
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i <= numPoints; i++) {
          const frac = i / numPoints;
          const x = cx - radius + frac * radius * 2;

          // Multiple sine waves for organic flow
          const wave1 = Math.sin(frac * Math.PI * 2.5 + t * speed + phase) * amp;
          const wave2 = Math.sin(frac * Math.PI * 4 + t * speed * 0.7 + phase * 1.3) * amp * 0.4;
          const wave3 = Math.sin(frac * Math.PI * 1.5 + t * speed * 1.3 + phase * 0.7) * amp * 0.3;

          const y = cy + yOffset * radius + wave1 + wave2 + wave3;
          points.push({ x, y });
        }

        // Draw band as a thick gradient stroke with feathered edges
        for (let layer = 0; layer < 3; layer++) {
          const layerWidth = layer === 0 ? bw * 2 : layer === 1 ? bw : bw * 0.4;
          const layerAlpha = layer === 0 ? 0.08 : layer === 1 ? 0.25 : 0.5;

          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }

          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${layerAlpha * cfg.brightness})`;
          ctx.lineWidth = layerWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }

        ctx.restore();
      }

      // Central white glow
      const glowRadius = radius * 0.45;
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glowGrad.addColorStop(0, `rgba(255,255,255,${0.35 * cfg.glow})`);
      glowGrad.addColorStop(0.4, `rgba(255,255,255,${0.1 * cfg.glow})`);
      glowGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // Specular highlight top-left
      const specGrad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.3, 0, cx - radius * 0.2, cy - radius * 0.3, radius * 0.35);
      specGrad.addColorStop(0, "rgba(255,255,255,0.12)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();

      // Thin ring around sphere
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
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
      <canvas
        ref={canvasRef}
        className="relative z-10"
        style={{ borderRadius: "50%" }}
      />
    </div>
  );
};

export default AuraOrb;
