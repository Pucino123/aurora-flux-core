import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.10, ampMul: 0.8,  opacity: 0.55, brightness: 1.0 },
  listening:  { speedMul: 0.55, ampMul: 1.4,  opacity: 0.80, brightness: 1.3 },
  processing: { speedMul: 2.0,  ampMul: 0.9,  opacity: 0.90, brightness: 1.5 },
  speaking:   { speedMul: 0.38, ampMul: 1.1,  opacity: 0.70, brightness: 1.2 },
};

// Soap-bubble aurora blobs: vibrant but transparent
const BLOBS = [
  { hue: 188, sat: 100, light: 72, ox: -0.08, oy: -0.05, rad: 0.80, spd: 0.055, ph: 0.0 },
  { hue: 320, sat:  95, light: 68, ox:  0.07, oy:  0.10, rad: 0.78, spd: 0.062, ph: 2.5 },
  { hue: 272, sat:  90, light: 62, ox:  0.00, oy: -0.10, rad: 0.72, spd: 0.044, ph: 1.2 },
  { hue: 210, sat:  85, light: 60, ox: -0.07, oy:  0.08, rad: 0.68, spd: 0.050, ph: 4.0 },
  { hue: 165, sat:  88, light: 60, ox:  0.10, oy: -0.03, rad: 0.62, spd: 0.070, ph: 3.2 },
  { hue: 345, sat:  92, light: 72, ox:  0.02, oy:  0.02, rad: 0.56, spd: 0.036, ph: 5.5 },
];

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef({ ...stateConfig[state] });
  const animRef = useRef<number>(0);

  // Smooth config transitions
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
        opacity:    lerp(start.opacity,    target.opacity,    e),
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

    // Off-screen canvas for blur pass
    const off = document.createElement("canvas");
    off.width  = canvas.width;
    off.height = canvas.height;
    const oct = off.getContext("2d")!;
    oct.scale(dpr, dpr);

    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const cfg = configRef.current;
      timeRef.current += dt * cfg.speedMul;
      const t = timeRef.current;

      // --- Off-screen: draw blobs clipped to circle ---
      oct.clearRect(0, 0, size, size);
      oct.save();
      oct.beginPath();
      oct.arc(cx, cy, r, 0, Math.PI * 2);
      oct.clip();

      // Transparent base — soap bubble is mostly clear
      oct.clearRect(0, 0, size, size);

      // Source-over blending keeps blobs transparent, not additive
      oct.globalCompositeOperation = "source-over";

      for (const blob of BLOBS) {
        const bx = cx + (blob.ox
          + Math.sin(t * blob.spd + blob.ph) * 0.30
          + Math.sin(t * blob.spd * 0.28 + blob.ph * 2.2) * 0.16
        ) * r * cfg.ampMul;
        const by = cy + (blob.oy
          + Math.cos(t * blob.spd * 0.55 + blob.ph) * 0.26
          + Math.cos(t * blob.spd * 0.18 + blob.ph * 1.7) * 0.14
        ) * r * cfg.ampMul;
        const br = blob.rad * r * (0.80 + Math.sin(t * blob.spd * 0.2 + blob.ph) * 0.20);

        const g = oct.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        const op = cfg.opacity;
        g.addColorStop(0,    `hsla(${blob.hue},${blob.sat}%,${l}%,${(op * 0.55).toFixed(2)})`);
        g.addColorStop(0.25, `hsla(${blob.hue},${blob.sat}%,${l * 0.9}%,${(op * 0.35).toFixed(2)})`);
        g.addColorStop(0.55, `hsla(${blob.hue},${blob.sat}%,${l * 0.75}%,${(op * 0.15).toFixed(2)})`);
        g.addColorStop(1,    `hsla(${blob.hue},${blob.sat}%,${l * 0.5}%,0)`);
        oct.fillStyle = g;
        oct.fillRect(0, 0, size, size);
      }

      // Very faint inner glow so it's not completely void
      const center = oct.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
      center.addColorStop(0,   `rgba(220,240,255,${(0.10 * cfg.brightness).toFixed(2)})`);
      center.addColorStop(0.5, `rgba(180,210,255,0.04)`);
      center.addColorStop(1,   `rgba(180,210,255,0)`);
      oct.fillStyle = center;
      oct.fillRect(0, 0, size, size);

      oct.restore();

      // --- Main canvas ---
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Soft blur merges blob edges (liquid feel)
      ctx.filter = `blur(${r * 0.18}px)`;
      ctx.drawImage(off, 0, 0, size, size);
      ctx.filter = "none";

      // Edge fade — makes the sphere feel hollow/thin
      const fade = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
      fade.addColorStop(0,    "rgba(0,0,0,0)");
      fade.addColorStop(0.65, "rgba(0,0,0,0)");
      fade.addColorStop(0.82, "rgba(0,0,0,0.08)");
      fade.addColorStop(0.92, "rgba(0,0,0,0.22)");
      fade.addColorStop(1,    "rgba(0,0,0,0.50)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, size, size);

      // Specular top-left highlight (glassy sphere)
      const specX = cx - r * 0.22;
      const specY = cy - r * 0.26;
      const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.38);
      spec.addColorStop(0,   `rgba(255,255,255,${(0.40 * cfg.brightness).toFixed(2)})`);
      spec.addColorStop(0.15,`rgba(255,255,255,0.12)`);
      spec.addColorStop(0.40,`rgba(255,255,255,0.03)`);
      spec.addColorStop(1,   `rgba(255,255,255,0)`);
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // --- Iridescent soap-bubble edge ring (drawn OUTSIDE clip) ---
      const ringSteps = 72;
      for (let i = 0; i < ringSteps; i++) {
        const a0 = (i / ringSteps) * Math.PI * 2;
        const a1 = ((i + 1) / ringSteps) * Math.PI * 2;
        const hue = ((i / ringSteps) * 360 + t * 20) % 360;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 0.5, a0, a1);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `hsla(${hue},90%,80%,${(0.30 + 0.12 * Math.sin(t * 0.5 + i * 0.2)).toFixed(2)})`;
        ctx.stroke();
        ctx.restore();
      }

      // Bottom-right subtle reflection shimmer
      const shimX = cx + r * 0.18;
      const shimY = cy + r * 0.22;
      const shim = ctx.createRadialGradient(shimX, shimY, 0, shimX, shimY, r * 0.22);
      shim.addColorStop(0,  "rgba(200,230,255,0.12)");
      shim.addColorStop(0.5,"rgba(200,230,255,0.04)");
      shim.addColorStop(1,  "rgba(200,230,255,0)");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = shim;
      ctx.fillRect(0, 0, size, size);
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
      {/* Very subtle ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.06, 0.14, 0.06] : [0.12, 0.28, 0.12],
          scale:   state === "idle" ? [1.02, 1.06, 1.02] : [1.04, 1.12, 1.04],
        }}
        transition={{ duration: state === "idle" ? 8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,210,230,0.10) 0%, rgba(180,50,255,0.06) 35%, rgba(255,50,140,0.04) 55%, transparent 75%)",
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
