import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.12, ampMul: 0.9, glow: 0.5, brightness: 1.0 },
  listening:  { speedMul: 0.5,  ampMul: 1.3, glow: 0.9, brightness: 1.4 },
  processing: { speedMul: 1.8,  ampMul: 0.7, glow: 1.0, brightness: 1.5 },
  speaking:   { speedMul: 0.4,  ampMul: 1.1, glow: 0.7, brightness: 1.2 },
};

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef(stateConfig[state]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const target = stateConfig[state];
    const start = { ...configRef.current };
    const startTime = performance.now();
    const duration = 800;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const e = t * t * (3 - 2 * t);
      configRef.current = {
        speedMul: lerp(start.speedMul, target.speedMul, e),
        ampMul: lerp(start.ampMul, target.ampMul, e),
        glow: lerp(start.glow, target.glow, e),
        brightness: lerp(start.brightness, target.brightness, e),
      };
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.46;

    let lastTime = performance.now();

    // Siri-inspired blobs — VERY vibrant, large, overlapping
    const blobs = [
      // Bright cyan — dominant
      { hue: 185, sat: 100, light: 65, ox: -0.1, oy: -0.06, rad: 1.3, spd: 0.055, ph: 0 },
      // Hot magenta/pink — dominant
      { hue: 325, sat: 95, light: 62, ox: 0.08, oy: 0.1, rad: 1.25, spd: 0.06, ph: 2.5 },
      // Deep indigo
      { hue: 240, sat: 85, light: 50, ox: 0.0, oy: -0.12, rad: 1.15, spd: 0.045, ph: 1.2 },
      // Vivid purple
      { hue: 280, sat: 90, light: 58, ox: -0.08, oy: 0.08, rad: 1.1, spd: 0.05, ph: 4.0 },
      // Teal accent
      { hue: 170, sat: 90, light: 55, ox: 0.12, oy: -0.04, rad: 1.0, spd: 0.07, ph: 3.2 },
      // Warm pink center glow
      { hue: 345, sat: 90, light: 68, ox: 0.02, oy: 0.02, rad: 0.9, spd: 0.035, ph: 5.5 },
      // Blue bridge
      { hue: 210, sat: 80, light: 55, ox: -0.05, oy: -0.08, rad: 1.05, spd: 0.048, ph: 0.6 },
      // Emerald accent
      { hue: 155, sat: 85, light: 52, ox: 0.06, oy: 0.06, rad: 0.85, spd: 0.065, ph: 1.8 },
    ];

    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext("2d")!;
    offCtx.scale(dpr, dpr);

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const cfg = configRef.current;
      timeRef.current += dt * cfg.speedMul;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);
      offCtx.clearRect(0, 0, size, size);

      offCtx.save();
      offCtx.beginPath();
      offCtx.arc(cx, cy, r, 0, Math.PI * 2);
      offCtx.clip();

      // Base — dark but NOT black, deep navy-purple
      const bgGrad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0, "#221548");
      bgGrad.addColorStop(0.35, "#18103a");
      bgGrad.addColorStop(0.65, "#120c30");
      bgGrad.addColorStop(1, "#0c0825");
      offCtx.fillStyle = bgGrad;
      offCtx.fillRect(0, 0, size, size);

      // Use "lighter" for more additive, vibrant blending
      offCtx.globalCompositeOperation = "lighter";

      for (const blob of blobs) {
        const bx = cx + (blob.ox
          + Math.sin(t * blob.spd + blob.ph) * 0.24
          + Math.sin(t * blob.spd * 0.3 + blob.ph * 2.5) * 0.14
        ) * r * cfg.ampMul;
        const by = cy + (blob.oy
          + Math.cos(t * blob.spd * 0.55 + blob.ph) * 0.22
          + Math.cos(t * blob.spd * 0.2 + blob.ph * 1.8) * 0.12
        ) * r * cfg.ampMul;
        const br = blob.rad * r * (0.82 + Math.sin(t * blob.spd * 0.18 + blob.ph) * 0.18);

        const grad = offCtx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        grad.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${l}%, 0.95)`);
        grad.addColorStop(0.12, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.93}%, 0.75)`);
        grad.addColorStop(0.3, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.85}%, 0.45)`);
        grad.addColorStop(0.55, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.7}%, 0.18)`);
        grad.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.5}%, 0)`);
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
      }

      // Strong central white glow — the Siri "inner light" star
      const glowX = cx + Math.sin(t * 0.06) * r * 0.06;
      const glowY = cy + Math.cos(t * 0.04) * r * 0.05;
      const centerGlow = offCtx.createRadialGradient(glowX, glowY, 0, cx, cy, r * 0.45);
      centerGlow.addColorStop(0, `rgba(255,255,255,${0.55 * cfg.brightness})`);
      centerGlow.addColorStop(0.12, `rgba(230,245,255,${0.3 * cfg.brightness})`);
      centerGlow.addColorStop(0.3, `rgba(200,220,255,${0.12 * cfg.brightness})`);
      centerGlow.addColorStop(0.6, `rgba(180,200,255,${0.03 * cfg.brightness})`);
      centerGlow.addColorStop(1, "rgba(180,200,255,0)");
      offCtx.fillStyle = centerGlow;
      offCtx.fillRect(0, 0, size, size);

      offCtx.restore();

      // Main canvas — blur for lava merging
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.filter = `blur(${r * 0.22}px)`;
      ctx.drawImage(offCanvas, 0, 0, size, size);
      ctx.filter = "none";

      // Very subtle frost overlay
      ctx.globalCompositeOperation = "soft-light";
      const frost = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      frost.addColorStop(0, "rgba(255,255,255,0.06)");
      frost.addColorStop(0.5, "rgba(220,230,245,0.03)");
      frost.addColorStop(1, "rgba(200,210,230,0.01)");
      ctx.fillStyle = frost;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";

      // Soft edge fade — borderless
      const edgeFade = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
      edgeFade.addColorStop(0, "rgba(0,0,0,0)");
      edgeFade.addColorStop(0.6, "rgba(12,8,37,0.06)");
      edgeFade.addColorStop(0.8, "rgba(12,8,37,0.25)");
      edgeFade.addColorStop(0.92, "rgba(12,8,37,0.55)");
      edgeFade.addColorStop(1, "rgba(12,8,37,0.85)");
      ctx.fillStyle = edgeFade;
      ctx.fillRect(0, 0, size, size);

      // Specular highlight — top-left
      const specX = cx - r * 0.25;
      const specY = cy - r * 0.28;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.4);
      specGrad.addColorStop(0, "rgba(255,255,255,0.22)");
      specGrad.addColorStop(0.1, "rgba(255,255,255,0.08)");
      specGrad.addColorStop(0.3, "rgba(255,255,255,0.02)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specGrad;
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
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.08, 0.2, 0.08] : [0.2, 0.5, 0.2],
          scale: state === "idle" ? [1.02, 1.07, 1.02] : [1.05, 1.15, 1.05],
        }}
        transition={{ duration: state === "idle" ? 8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,220,240,0.12) 0%, rgba(180,50,255,0.08) 30%, rgba(255,50,150,0.05) 50%, transparent 70%)",
          filter: "blur(18px)",
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
