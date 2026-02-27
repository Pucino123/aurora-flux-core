import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.3, ampMul: 1.0, glow: 0.5, brightness: 0.9 },
  listening:  { speedMul: 1.4, ampMul: 1.4, glow: 0.9, brightness: 1.2 },
  processing: { speedMul: 3.5, ampMul: 0.7, glow: 1.0, brightness: 1.4 },
  speaking:   { speedMul: 1.0, ampMul: 1.1, glow: 0.7, brightness: 1.0 },
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
    const duration = 600;
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

    // Large soft aurora blobs
    const blobs = [
      { hue: 235, sat: 80, light: 32, ox: -0.22, oy: -0.18, rad: 0.75, spd: 0.18, ph: 0 },
      { hue: 280, sat: 75, light: 36, ox: 0.18,  oy: 0.15,  rad: 0.7,  spd: 0.15, ph: 1.8 },
      { hue: 190, sat: 90, light: 42, ox: 0.05,  oy: -0.1,  rad: 0.65, spd: 0.22, ph: 3.2 },
      { hue: 320, sat: 85, light: 38, ox: -0.12, oy: 0.2,   rad: 0.6,  spd: 0.2,  ph: 4.8 },
      { hue: 210, sat: 95, light: 45, ox: 0.22,  oy: -0.12, rad: 0.55, spd: 0.17, ph: 2.4 },
      { hue: 260, sat: 70, light: 30, ox: 0.0,   oy: 0.0,   rad: 0.85, spd: 0.12, ph: 6.0 },
      { hue: 170, sat: 75, light: 36, ox: 0.08,  oy: 0.08,  rad: 0.5,  spd: 0.25, ph: 1.0 },
      { hue: 340, sat: 80, light: 40, ox: -0.18, oy: -0.05, rad: 0.45, spd: 0.19, ph: 5.2 },
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

      offCtx.fillStyle = "#040212";
      offCtx.fillRect(0, 0, size, size);

      offCtx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        // Smooth orbiting with multiple sine layers
        const bx = cx + (blob.ox
          + Math.sin(t * blob.spd + blob.ph) * 0.22
          + Math.sin(t * blob.spd * 0.6 + blob.ph * 2.3) * 0.12
          + Math.cos(t * blob.spd * 0.35 + blob.ph * 0.7) * 0.08
        ) * r * cfg.ampMul;
        const by = cy + (blob.oy
          + Math.cos(t * blob.spd * 0.85 + blob.ph) * 0.2
          + Math.cos(t * blob.spd * 0.5 + blob.ph * 1.6) * 0.1
          + Math.sin(t * blob.spd * 0.3 + blob.ph * 1.2) * 0.06
        ) * r * cfg.ampMul;
        const br = blob.rad * r * (0.85 + Math.sin(t * blob.spd * 0.4 + blob.ph) * 0.15);

        const grad = offCtx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        grad.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${l}%, 0.9)`);
        grad.addColorStop(0.2, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.85}%, 0.6)`);
        grad.addColorStop(0.45, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.7}%, 0.3)`);
        grad.addColorStop(0.7, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.5}%, 0.1)`);
        grad.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.3}%, 0)`);
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
      }

      offCtx.restore();

      // === Main canvas: clip to circle and draw blurred aurora ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Draw heavily blurred blobs
      ctx.filter = `blur(${r * 0.22}px)`;
      ctx.drawImage(offCanvas, 0, 0, size, size);
      ctx.filter = "none";

      // === Frosted glass overlay ===
      const frostGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      frostGrad.addColorStop(0, "rgba(255,255,255,0.1)");
      frostGrad.addColorStop(0.3, "rgba(255,255,255,0.06)");
      frostGrad.addColorStop(0.6, "rgba(220,225,240,0.04)");
      frostGrad.addColorStop(1, "rgba(200,210,230,0.02)");
      ctx.fillStyle = frostGrad;
      ctx.fillRect(0, 0, size, size);

      // Soft-light frost desaturation
      ctx.globalCompositeOperation = "soft-light";
      const frostGrad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      frostGrad2.addColorStop(0, "rgba(220,225,240,0.12)");
      frostGrad2.addColorStop(0.5, "rgba(200,210,230,0.06)");
      frostGrad2.addColorStop(1, "rgba(180,190,210,0.02)");
      ctx.fillStyle = frostGrad2;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";

      // === Frosted edge fade (no hard border) ===
      // Soft radial fade at the edges to make it look frosted/diffused
      const edgeFade = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
      edgeFade.addColorStop(0, "rgba(0,0,0,0)");
      edgeFade.addColorStop(0.6, "rgba(0,0,0,0)");
      edgeFade.addColorStop(0.85, "rgba(10,5,20,0.3)");
      edgeFade.addColorStop(0.95, "rgba(10,5,20,0.7)");
      edgeFade.addColorStop(1, "rgba(10,5,20,0.95)");
      ctx.fillStyle = edgeFade;
      ctx.fillRect(0, 0, size, size);

      // === Specular highlight (top-left) ===
      const specX = cx - r * 0.3;
      const specY = cy - r * 0.35;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.5);
      specGrad.addColorStop(0, "rgba(255,255,255,0.22)");
      specGrad.addColorStop(0.15, "rgba(255,255,255,0.08)");
      specGrad.addColorStop(0.4, "rgba(255,255,255,0.02)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // NO border/rim strokes — purely frosted edge

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
          opacity: state === "idle" ? [0.1, 0.2, 0.1] : [0.25, 0.5, 0.25],
          scale: state === "idle" ? [1.03, 1.08, 1.03] : [1.06, 1.18, 1.06],
        }}
        transition={{ duration: state === "idle" ? 7 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(100,60,255,0.15) 0%, rgba(0,180,220,0.08) 35%, rgba(255,100,150,0.04) 55%, transparent 70%)",
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
