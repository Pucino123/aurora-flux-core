import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.08, ampMul: 0.7,  opacity: 0.40, brightness: 1.0 },
  listening:  { speedMul: 0.80, ampMul: 1.3,  opacity: 0.72, brightness: 1.4 },
  processing: { speedMul: 2.2,  ampMul: 1.1,  opacity: 0.80, brightness: 1.6 },
  speaking:   { speedMul: 0.45, ampMul: 1.0,  opacity: 0.58, brightness: 1.2 },
};

// Fluid "gas pocket" blobs — overlapping, varied sizes, swirling at DIFFERENT rates
// to create organic fluid mixing. Each has a primary hue and swirl parameters.
const BLOBS = [
  // Cyan cluster
  { hue: 185, sat: 100, light: 72, ox: 0.3,  oy: -0.3, rad: 0.70, spd: 0.041, ph: 0.0,  orbitR: 0.28 },
  { hue: 195, sat: 90,  light: 78, ox: -0.2, oy: -0.4, rad: 0.55, spd: 0.057, ph: 1.1,  orbitR: 0.22 },
  // Purple cluster
  { hue: 275, sat: 88,  light: 65, ox: -0.35,oy: 0.25, rad: 0.65, spd: 0.033, ph: 2.4,  orbitR: 0.32 },
  { hue: 260, sat: 80,  light: 60, ox: 0.15, oy: 0.4,  rad: 0.50, spd: 0.068, ph: 3.8,  orbitR: 0.20 },
  // Pink / magenta cluster
  { hue: 320, sat: 95,  light: 68, ox: 0.40, oy: 0.20, rad: 0.60, spd: 0.050, ph: 5.0,  orbitR: 0.26 },
  { hue: 340, sat: 85,  light: 72, ox: -0.1, oy: 0.35, rad: 0.45, spd: 0.044, ph: 1.7,  orbitR: 0.18 },
  // Accent warm teal (blends cyan+purple center)
  { hue: 210, sat: 80,  light: 62, ox: 0.0,  oy: -0.1, rad: 0.42, spd: 0.025, ph: 4.2,  orbitR: 0.15 },
];

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef({ ...stateConfig[state] });
  const animRef = useRef<number>(0);

  // Smooth transition between states
  useEffect(() => {
    const target = stateConfig[state];
    const start = { ...configRef.current };
    const startTime = performance.now();
    const dur = 700;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / dur, 1);
      const e = t * t * (3 - 2 * t); // smoothstep
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

      // ── Clip to sphere ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // ── Background: very subtle dark void (not solid) ──
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0,   "rgba(8,4,18,0.12)");
      bgGrad.addColorStop(0.6, "rgba(4,2,12,0.08)");
      bgGrad.addColorStop(1,   "rgba(0,0,0,0.04)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // ── Fluid gas blobs — each orbits and breathes ──
      // Use "screen" blend for colour mixing (gas/light blending)
      ctx.globalCompositeOperation = "screen";

      for (const blob of BLOBS) {
        // Orbital position: elliptical paths at different speeds give fluid swirling
        const orbitAngle = t * blob.spd * 6.28 + blob.ph;
        const breathe = 0.85 + 0.15 * Math.sin(t * blob.spd * 1.3 + blob.ph * 0.7);
        const bx = cx + (blob.ox * r + Math.cos(orbitAngle) * blob.orbitR * r) * cfg.ampMul;
        const by = cy + (blob.oy * r + Math.sin(orbitAngle * 0.73) * blob.orbitR * r * 0.8) * cfg.ampMul;
        const br = blob.rad * r * breathe * (0.9 + 0.1 * Math.sin(t * blob.spd * 2.1 + blob.ph));

        const l = Math.min(blob.light * cfg.brightness, 100);
        const op = cfg.opacity;

        // Multi-stop radial gradient for soft "gas cloud" falloff
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0,    `hsla(${blob.hue},${blob.sat}%,${l}%,${(op * 0.55).toFixed(2)})`);
        g.addColorStop(0.25, `hsla(${blob.hue},${blob.sat}%,${l * 0.88}%,${(op * 0.35).toFixed(2)})`);
        g.addColorStop(0.55, `hsla(${blob.hue},${blob.sat}%,${l * 0.72}%,${(op * 0.15).toFixed(2)})`);
        g.addColorStop(0.80, `hsla(${blob.hue},${blob.sat}%,${l * 0.55}%,${(op * 0.04).toFixed(2)})`);
        g.addColorStop(1,    `hsla(${blob.hue},${blob.sat}%,${l * 0.4}%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // ── Very subtle hollow center brightening (glass lensing effect) ──
      const hollow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
      hollow.addColorStop(0,   "rgba(210,240,255,0.04)");
      hollow.addColorStop(0.5, "rgba(210,240,255,0.02)");
      hollow.addColorStop(1,   "rgba(210,240,255,0)");
      ctx.fillStyle = hollow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // ── Iridescent soap-bubble ring — SMOOTH continuous conic approach ──
      // Draw a single thin arc with a rotating conic-like gradient via multiple strokes
      const ringSteps = 120;
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.28 + 0.08 * Math.sin(t * 0.5);
      for (let i = 0; i < ringSteps; i++) {
        const a0 = (i / ringSteps) * Math.PI * 2;
        const a1 = ((i + 1.2) / ringSteps) * Math.PI * 2;
        const hue = ((i / ringSteps) * 360 + t * 30) % 360;
        const lightness = 78 + 8 * Math.sin(t * 0.4 + i * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, r - 1.0, a0, a1);
        ctx.strokeStyle = `hsl(${hue}, 85%, ${lightness}%)`;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── Specular highlight — top-left glassy reflection ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const specX = cx - r * 0.20;
      const specY = cy - r * 0.24;
      const specR = r * 0.30;
      const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, specR);
      const specOpacity = 0.50 * cfg.brightness;
      spec.addColorStop(0,   `rgba(255,255,255,${Math.min(specOpacity, 0.9).toFixed(2)})`);
      spec.addColorStop(0.18, `rgba(255,255,255,0.14)`);
      spec.addColorStop(0.50, `rgba(255,255,255,0.04)`);
      spec.addColorStop(1,   `rgba(255,255,255,0)`);
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(specX, specY, specR, 0, Math.PI * 2);
      ctx.fill();

      // Secondary bottom-right caustic (glass refraction)
      const caus2X = cx + r * 0.28;
      const caus2Y = cy + r * 0.30;
      const caus2 = ctx.createRadialGradient(caus2X, caus2Y, 0, caus2X, caus2Y, r * 0.18);
      caus2.addColorStop(0,   "rgba(200,230,255,0.06)");
      caus2.addColorStop(1,   "rgba(200,230,255,0)");
      ctx.fillStyle = caus2;
      ctx.beginPath();
      ctx.arc(caus2X, caus2Y, r * 0.18, 0, Math.PI * 2);
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
      {/* Ambient outer glow — very subtle, state-reactive */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.03, 0.08, 0.03] : [0.10, 0.24, 0.10],
          scale:   state === "idle" ? [1.02, 1.06, 1.02] : [1.04, 1.12, 1.04],
        }}
        transition={{ duration: state === "idle" ? 9 : 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,210,240,0.10) 0%, rgba(180,50,255,0.07) 35%, rgba(255,50,140,0.04) 55%, transparent 75%)",
          filter: "blur(14px)",
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
