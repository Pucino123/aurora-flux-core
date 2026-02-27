import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.15, ampMul: 0.8, glow: 0.5, brightness: 1.0 },
  listening:  { speedMul: 0.6,  ampMul: 1.2, glow: 0.9, brightness: 1.3 },
  processing: { speedMul: 2.0,  ampMul: 0.6, glow: 1.0, brightness: 1.4 },
  speaking:   { speedMul: 0.5,  ampMul: 1.0, glow: 0.7, brightness: 1.1 },
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

    // Very large, slow blobs that overlap and merge like lava
    const blobs = [
      { hue: 240, sat: 70, light: 45, ox: -0.15, oy: -0.1,  rad: 1.1,  spd: 0.08, ph: 0 },
      { hue: 280, sat: 65, light: 48, ox: 0.12,  oy: 0.1,   rad: 1.0,  spd: 0.07, ph: 1.8 },
      { hue: 195, sat: 85, light: 50, ox: 0.0,   oy: -0.05, rad: 0.95, spd: 0.1,  ph: 3.2 },
      { hue: 320, sat: 75, light: 45, ox: -0.08, oy: 0.12,  rad: 0.9,  spd: 0.09, ph: 4.8 },
      { hue: 215, sat: 80, light: 52, ox: 0.15,  oy: -0.08, rad: 0.85, spd: 0.075, ph: 2.4 },
      { hue: 260, sat: 60, light: 40, ox: 0.0,   oy: 0.0,   rad: 1.2,  spd: 0.05, ph: 6.0 },
      { hue: 175, sat: 70, light: 46, ox: 0.05,  oy: 0.05,  rad: 0.8,  spd: 0.11, ph: 1.0 },
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

      // Lighter dark base — NOT pure black, more like deep indigo
      const bgGrad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0, "#1a1035");
      bgGrad.addColorStop(0.5, "#120a28");
      bgGrad.addColorStop(1, "#0d0820");
      offCtx.fillStyle = bgGrad;
      offCtx.fillRect(0, 0, size, size);

      offCtx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        // Very slow, smooth orbiting
        const bx = cx + (blob.ox
          + Math.sin(t * blob.spd + blob.ph) * 0.18
          + Math.sin(t * blob.spd * 0.4 + blob.ph * 2.1) * 0.1
        ) * r * cfg.ampMul;
        const by = cy + (blob.oy
          + Math.cos(t * blob.spd * 0.7 + blob.ph) * 0.16
          + Math.cos(t * blob.spd * 0.3 + blob.ph * 1.4) * 0.08
        ) * r * cfg.ampMul;
        const br = blob.rad * r * (0.9 + Math.sin(t * blob.spd * 0.3 + blob.ph) * 0.1);

        const grad = offCtx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        grad.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${l}%, 0.85)`);
        grad.addColorStop(0.2, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.9}%, 0.6)`);
        grad.addColorStop(0.45, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.8}%, 0.3)`);
        grad.addColorStop(0.7, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.6}%, 0.1)`);
        grad.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.4}%, 0)`);
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
      }

      offCtx.restore();

      // === Main canvas ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Heavy blur for lava-like merging
      ctx.filter = `blur(${r * 0.28}px)`;
      ctx.drawImage(offCanvas, 0, 0, size, size);
      ctx.filter = "none";

      // Frosted glass overlay
      const frostGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      frostGrad.addColorStop(0, "rgba(255,255,255,0.08)");
      frostGrad.addColorStop(0.4, "rgba(255,255,255,0.04)");
      frostGrad.addColorStop(1, "rgba(220,225,240,0.02)");
      ctx.fillStyle = frostGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = "soft-light";
      const frost2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      frost2.addColorStop(0, "rgba(220,225,240,0.1)");
      frost2.addColorStop(0.5, "rgba(200,210,230,0.05)");
      frost2.addColorStop(1, "rgba(180,190,210,0.02)");
      ctx.fillStyle = frost2;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";

      // Frosted edge fade
      const edgeFade = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
      edgeFade.addColorStop(0, "rgba(0,0,0,0)");
      edgeFade.addColorStop(0.7, "rgba(13,8,32,0.15)");
      edgeFade.addColorStop(0.9, "rgba(13,8,32,0.5)");
      edgeFade.addColorStop(1, "rgba(13,8,32,0.85)");
      ctx.fillStyle = edgeFade;
      ctx.fillRect(0, 0, size, size);

      // Specular highlight
      const specX = cx - r * 0.3;
      const specY = cy - r * 0.35;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.5);
      specGrad.addColorStop(0, "rgba(255,255,255,0.2)");
      specGrad.addColorStop(0.15, "rgba(255,255,255,0.07)");
      specGrad.addColorStop(0.4, "rgba(255,255,255,0.02)");
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
          opacity: state === "idle" ? [0.08, 0.18, 0.08] : [0.2, 0.45, 0.2],
          scale: state === "idle" ? [1.02, 1.07, 1.02] : [1.05, 1.16, 1.05],
        }}
        transition={{ duration: state === "idle" ? 8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(100,60,255,0.12) 0%, rgba(0,180,220,0.06) 35%, rgba(255,100,150,0.03) 55%, transparent 70%)",
          filter: "blur(22px)",
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
