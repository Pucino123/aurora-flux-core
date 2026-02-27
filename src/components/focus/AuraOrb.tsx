import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.10, ampMul: 0.7,  opacity: 0.45, brightness: 1.0 },
  listening:  { speedMul: 0.55, ampMul: 1.2,  opacity: 0.70, brightness: 1.3 },
  processing: { speedMul: 2.0,  ampMul: 1.0,  opacity: 0.80, brightness: 1.5 },
  speaking:   { speedMul: 0.38, ampMul: 0.9,  opacity: 0.60, brightness: 1.2 },
};

// Aurora swirls positioned near the EDGE of the bubble, not center
// This creates the soap-bubble hollow effect
const BLOBS = [
  { hue: 188, sat: 100, light: 75, ox:  0.55, oy: -0.35, rad: 0.55, spd: 0.055, ph: 0.0 },
  { hue: 320, sat:  95, light: 70, ox: -0.40, oy:  0.50, rad: 0.52, spd: 0.062, ph: 2.5 },
  { hue: 272, sat:  90, light: 65, ox:  0.20, oy: -0.55, rad: 0.50, spd: 0.044, ph: 1.2 },
  { hue: 210, sat:  85, light: 68, ox: -0.55, oy: -0.20, rad: 0.48, spd: 0.050, ph: 4.0 },
  { hue: 165, sat:  88, light: 65, ox:  0.45, oy:  0.40, rad: 0.45, spd: 0.070, ph: 3.2 },
  { hue: 345, sat:  92, light: 75, ox: -0.30, oy:  0.55, rad: 0.42, spd: 0.036, ph: 5.5 },
];

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef({ ...stateConfig[state] });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const target = stateConfig[state];
    const start = { ...configRef.current };
    const startTime = performance.now();
    const dur = 800;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / dur, 1);
      const e = t * t * (3 - 2 * t);
      configRef.current = {
        speedMul:   lerp(start.speedMul,   target.speedMul,   e),
        ampMul:     lerp(start.ampMul,     target.ampMul,     e),
        opacity:    lerp(start.opacity,    target.opacity,     e),
        brightness: lerp(start.brightness, target.brightness, e),
      };
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r  = size * 0.46;

    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const cfg = configRef.current;
      timeRef.current += dt * cfg.speedMul;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Paint each aurora blob individually using arc (not fillRect)
      // Blobs are small and edge-positioned for hollow/clear center effect
      for (const blob of BLOBS) {
        const bx = cx + (blob.ox + Math.sin(t * blob.spd + blob.ph) * 0.25) * r * cfg.ampMul;
        const by = cy + (blob.oy + Math.cos(t * blob.spd * 0.6 + blob.ph) * 0.22) * r * cfg.ampMul;
        const br = blob.rad * r * (0.75 + Math.sin(t * blob.spd * 0.2 + blob.ph) * 0.25);

        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        const op = cfg.opacity;
        g.addColorStop(0,    `hsla(${blob.hue},${blob.sat}%,${l}%,${(op * 0.38).toFixed(2)})`);
        g.addColorStop(0.35, `hsla(${blob.hue},${blob.sat}%,${l * 0.85}%,${(op * 0.18).toFixed(2)})`);
        g.addColorStop(0.70, `hsla(${blob.hue},${blob.sat}%,${l * 0.7}%,${(op * 0.06).toFixed(2)})`);
        g.addColorStop(1,    `hsla(${blob.hue},${blob.sat}%,${l * 0.5}%,0)`);
        ctx.fillStyle = g;
        // Paint ONLY within a circle around the blob center (not full canvas)
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Very subtle hollow center — barely visible
      const hollow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6);
      hollow.addColorStop(0,   "rgba(200,230,255,0.03)");
      hollow.addColorStop(0.5, "rgba(200,230,255,0.01)");
      hollow.addColorStop(1,   "rgba(200,230,255,0)");
      ctx.fillStyle = hollow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // --- Iridescent soap-bubble edge ring ---
      const ringSteps = 72;
      for (let i = 0; i < ringSteps; i++) {
        const a0 = (i / ringSteps) * Math.PI * 2;
        const a1 = ((i + 1.5) / ringSteps) * Math.PI * 2;
        const hue = ((i / ringSteps) * 360 + t * 25) % 360;
        const alpha = 0.22 + 0.12 * Math.sin(t * 0.6 + i * 0.28);
        ctx.beginPath();
        ctx.arc(cx, cy, r - 0.8, a0, a1);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = `hsla(${hue},90%,82%,${alpha.toFixed(2)})`;
        ctx.stroke();
      }

      // Specular highlight top-left (glassy sphere)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const specX = cx - r * 0.22;
      const specY = cy - r * 0.26;
      const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.32);
      spec.addColorStop(0,   `rgba(255,255,255,${(0.45 * cfg.brightness).toFixed(2)})`);
      spec.addColorStop(0.2, `rgba(255,255,255,0.12)`);
      spec.addColorStop(0.5, `rgba(255,255,255,0.03)`);
      spec.addColorStop(1,   `rgba(255,255,255,0)`);
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(specX, specY, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

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
      {/* Very subtle ambient outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.04, 0.10, 0.04] : [0.10, 0.22, 0.10],
          scale:   state === "idle" ? [1.01, 1.05, 1.01] : [1.03, 1.10, 1.03],
        }}
        transition={{ duration: state === "idle" ? 8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,210,230,0.08) 0%, rgba(180,50,255,0.05) 35%, rgba(255,50,140,0.03) 55%, transparent 75%)",
          filter: "blur(12px)",
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
