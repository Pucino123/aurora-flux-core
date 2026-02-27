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

  // Smooth state transition via lerp
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

    // Siri-inspired color blobs — vibrant cyan, deep purple, hot pink, indigo
    const blobs = [
      // Vibrant cyan
      { hue: 185, sat: 95, light: 58, ox: -0.12, oy: -0.08, rad: 1.15, spd: 0.06, ph: 0 },
      // Deep indigo
      { hue: 235, sat: 80, light: 42, ox: 0.1,  oy: 0.12,  rad: 1.2,  spd: 0.05, ph: 1.5 },
      // Hot pink / magenta
      { hue: 320, sat: 90, light: 55, ox: -0.06, oy: 0.1,  rad: 1.1,  spd: 0.07, ph: 3.0 },
      // Deep purple
      { hue: 270, sat: 75, light: 48, ox: 0.08,  oy: -0.1, rad: 1.0,  spd: 0.065, ph: 4.5 },
      // Bright teal-cyan
      { hue: 175, sat: 85, light: 52, ox: 0.12,  oy: 0.0,  rad: 0.95, spd: 0.08, ph: 2.2 },
      // Warm pink glow center
      { hue: 340, sat: 85, light: 60, ox: 0.0,   oy: 0.0,  rad: 0.85, spd: 0.04, ph: 5.5 },
      // Blue-purple bridge
      { hue: 250, sat: 70, light: 50, ox: -0.08, oy: -0.05, rad: 1.05, spd: 0.055, ph: 0.8 },
      // Green-cyan accent
      { hue: 160, sat: 80, light: 48, ox: 0.05,  oy: -0.12, rad: 0.8, spd: 0.09, ph: 3.8 },
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

      // Draw blobs on offscreen
      offCtx.save();
      offCtx.beginPath();
      offCtx.arc(cx, cy, r, 0, Math.PI * 2);
      offCtx.clip();

      // Dark base — deep navy-indigo, NOT black
      const bgGrad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0, "#1e1240");
      bgGrad.addColorStop(0.4, "#150d35");
      bgGrad.addColorStop(0.7, "#10082a");
      bgGrad.addColorStop(1, "#0a0520");
      offCtx.fillStyle = bgGrad;
      offCtx.fillRect(0, 0, size, size);

      offCtx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        // Very slow, smooth orbiting — large sweeping arcs
        const bx = cx + (blob.ox
          + Math.sin(t * blob.spd + blob.ph) * 0.22
          + Math.sin(t * blob.spd * 0.35 + blob.ph * 2.3) * 0.12
        ) * r * cfg.ampMul;
        const by = cy + (blob.oy
          + Math.cos(t * blob.spd * 0.6 + blob.ph) * 0.2
          + Math.cos(t * blob.spd * 0.25 + blob.ph * 1.7) * 0.1
        ) * r * cfg.ampMul;
        const br = blob.rad * r * (0.85 + Math.sin(t * blob.spd * 0.2 + blob.ph) * 0.15);

        const grad = offCtx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        grad.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${l}%, 0.9)`);
        grad.addColorStop(0.15, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.92}%, 0.7)`);
        grad.addColorStop(0.35, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.85}%, 0.4)`);
        grad.addColorStop(0.6, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.7}%, 0.15)`);
        grad.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.5}%, 0)`);
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
      }

      // Central bright white glow — creates the Siri "inner light" effect
      const centerGlow = offCtx.createRadialGradient(
        cx + Math.sin(t * 0.07) * r * 0.08,
        cy + Math.cos(t * 0.05) * r * 0.06,
        0,
        cx, cy, r * 0.5
      );
      centerGlow.addColorStop(0, `rgba(255,255,255,${0.35 * cfg.brightness})`);
      centerGlow.addColorStop(0.2, `rgba(220,240,255,${0.15 * cfg.brightness})`);
      centerGlow.addColorStop(0.5, `rgba(180,200,255,${0.05 * cfg.brightness})`);
      centerGlow.addColorStop(1, "rgba(180,200,255,0)");
      offCtx.fillStyle = centerGlow;
      offCtx.fillRect(0, 0, size, size);

      offCtx.restore();

      // === Main canvas with heavy blur for lava merging ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.filter = `blur(${r * 0.25}px)`;
      ctx.drawImage(offCanvas, 0, 0, size, size);
      ctx.filter = "none";

      // Frosted glass overlay — subtle white mist
      const frostGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      frostGrad.addColorStop(0, "rgba(255,255,255,0.06)");
      frostGrad.addColorStop(0.4, "rgba(255,255,255,0.03)");
      frostGrad.addColorStop(1, "rgba(220,225,240,0.01)");
      ctx.fillStyle = frostGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = "soft-light";
      const frost2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      frost2.addColorStop(0, "rgba(220,225,240,0.08)");
      frost2.addColorStop(0.5, "rgba(200,210,230,0.04)");
      frost2.addColorStop(1, "rgba(180,190,210,0.01)");
      ctx.fillStyle = frost2;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";

      // Soft edge fade — NO hard border, just frosted edge dissolve
      const edgeFade = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
      edgeFade.addColorStop(0, "rgba(0,0,0,0)");
      edgeFade.addColorStop(0.65, "rgba(10,5,32,0.08)");
      edgeFade.addColorStop(0.85, "rgba(10,5,32,0.35)");
      edgeFade.addColorStop(0.95, "rgba(10,5,32,0.7)");
      edgeFade.addColorStop(1, "rgba(10,5,32,0.9)");
      ctx.fillStyle = edgeFade;
      ctx.fillRect(0, 0, size, size);

      // Specular highlight — top-left white shine
      const specX = cx - r * 0.28;
      const specY = cy - r * 0.32;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.45);
      specGrad.addColorStop(0, "rgba(255,255,255,0.18)");
      specGrad.addColorStop(0.12, "rgba(255,255,255,0.06)");
      specGrad.addColorStop(0.35, "rgba(255,255,255,0.015)");
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
          opacity: state === "idle" ? [0.06, 0.15, 0.06] : [0.15, 0.4, 0.15],
          scale: state === "idle" ? [1.02, 1.06, 1.02] : [1.04, 1.14, 1.04],
        }}
        transition={{ duration: state === "idle" ? 8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,200,220,0.1) 0%, rgba(130,60,255,0.06) 30%, rgba(255,50,150,0.04) 50%, transparent 70%)",
          filter: "blur(20px)",
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
