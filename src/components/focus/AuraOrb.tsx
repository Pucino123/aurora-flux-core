import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

const stateConfig = {
  idle:       { speedMul: 0.3, ampMul: 1.0, glow: 0.5, brightness: 0.85 },
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
    const r = size * 0.44;

    let lastTime = performance.now();

    // Aurora blobs — large, soft, heavily blurred colored masses
    const blobs = [
      { hue: 235, sat: 80, light: 30, ox: -0.25, oy: -0.2, rad: 0.7,  spd: 0.18, ph: 0 },
      { hue: 280, sat: 75, light: 35, ox: 0.2,   oy: 0.15, rad: 0.65, spd: 0.15, ph: 1.8 },
      { hue: 190, sat: 90, light: 40, ox: 0.0,   oy: -0.1, rad: 0.6,  spd: 0.22, ph: 3.2 },
      { hue: 320, sat: 85, light: 38, ox: -0.15,  oy: 0.2,  rad: 0.55, spd: 0.2,  ph: 4.8 },
      { hue: 210, sat: 95, light: 45, ox: 0.25,  oy: -0.15, rad: 0.5,  spd: 0.17, ph: 2.4 },
      { hue: 260, sat: 70, light: 28, ox: 0.0,   oy: 0.0,  rad: 0.8,  spd: 0.12, ph: 6.0 },
      { hue: 170, sat: 75, light: 35, ox: 0.1,   oy: 0.1,  rad: 0.45, spd: 0.25, ph: 1.0 },
      { hue: 340, sat: 80, light: 40, ox: -0.2,  oy: -0.05, rad: 0.4,  spd: 0.19, ph: 5.2 },
    ];

    // Offscreen canvas for blur
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

      // Draw aurora blobs on offscreen (will be blurred)
      offCtx.save();
      offCtx.beginPath();
      offCtx.arc(cx, cy, r, 0, Math.PI * 2);
      offCtx.clip();

      // Dark base
      offCtx.fillStyle = "#050215";
      offCtx.fillRect(0, 0, size, size);

      // Blobs with screen blending
      offCtx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        // Organic orbiting motion
        const bx = cx + (blob.ox + Math.sin(t * blob.spd + blob.ph) * 0.2 + Math.sin(t * blob.spd * 0.6 + blob.ph * 2) * 0.1) * r * cfg.ampMul;
        const by = cy + (blob.oy + Math.cos(t * blob.spd * 0.9 + blob.ph) * 0.18 + Math.cos(t * blob.spd * 0.5 + blob.ph * 1.5) * 0.08) * r * cfg.ampMul;
        const br = blob.rad * r * (0.85 + Math.sin(t * blob.spd * 0.4 + blob.ph) * 0.15);

        const grad = offCtx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        grad.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${l}%, 0.85)`);
        grad.addColorStop(0.25, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.85}%, 0.55)`);
        grad.addColorStop(0.5, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.7}%, 0.25)`);
        grad.addColorStop(0.75, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.5}%, 0.08)`);
        grad.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.3}%, 0)`);
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
      }

      offCtx.restore();

      // === Draw blurred aurora onto main canvas ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Draw blurred blobs
      ctx.filter = `blur(${r * 0.18}px)`;
      ctx.drawImage(offCanvas, 0, 0, size, size);
      ctx.filter = "none";

      // === Frosted glass overlay — multiple layers for heavy frost ===
      // Semi-transparent white mist
      const frostGrad1 = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      frostGrad1.addColorStop(0, "rgba(255,255,255,0.12)");
      frostGrad1.addColorStop(0.4, "rgba(255,255,255,0.07)");
      frostGrad1.addColorStop(0.7, "rgba(200,210,230,0.05)");
      frostGrad1.addColorStop(1, "rgba(180,190,210,0.03)");
      ctx.fillStyle = frostGrad1;
      ctx.fillRect(0, 0, size, size);

      // Secondary frost — slight desaturation overlay
      ctx.globalCompositeOperation = "soft-light";
      const frostGrad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      frostGrad2.addColorStop(0, "rgba(220,225,240,0.15)");
      frostGrad2.addColorStop(0.5, "rgba(200,210,230,0.08)");
      frostGrad2.addColorStop(1, "rgba(180,190,210,0.03)");
      ctx.fillStyle = frostGrad2;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";

      // === Specular highlights for 3D glass look ===
      // Top-left main specular
      const specX = cx - r * 0.3;
      const specY = cy - r * 0.35;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.5);
      specGrad.addColorStop(0, "rgba(255,255,255,0.28)");
      specGrad.addColorStop(0.2, "rgba(255,255,255,0.12)");
      specGrad.addColorStop(0.5, "rgba(255,255,255,0.03)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, size, size);

      // Bottom-right warm reflection
      const spec2X = cx + r * 0.25;
      const spec2Y = cy + r * 0.3;
      const spec2Grad = ctx.createRadialGradient(spec2X, spec2Y, 0, spec2X, spec2Y, r * 0.35);
      spec2Grad.addColorStop(0, "rgba(255,200,160,0.06)");
      spec2Grad.addColorStop(1, "rgba(255,200,160,0)");
      ctx.fillStyle = spec2Grad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // === 3D rim highlights ===
      // Orange/pink arc (right side)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -0.9, 0.7);
      const rimGrad = ctx.createLinearGradient(cx + r * 0.6, cy - r * 0.8, cx + r * 0.2, cy + r * 0.6);
      rimGrad.addColorStop(0, "rgba(255,150,80,0.3)");
      rimGrad.addColorStop(0.5, "rgba(255,100,130,0.18)");
      rimGrad.addColorStop(1, "rgba(255,80,180,0.05)");
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Cyan/blue arc (left side)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 2.0, 4.3);
      const rimGrad2 = ctx.createLinearGradient(cx - r, cy - r * 0.4, cx - r * 0.3, cy + r * 0.5);
      rimGrad2.addColorStop(0, "rgba(0,200,255,0.25)");
      rimGrad2.addColorStop(0.5, "rgba(80,140,255,0.12)");
      rimGrad2.addColorStop(1, "rgba(120,100,255,0.04)");
      ctx.strokeStyle = rimGrad2;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Subtle full rim
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,200,240,0.08)";
      ctx.lineWidth = 1;
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
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.12, 0.25, 0.12] : [0.3, 0.55, 0.3],
          scale: state === "idle" ? [1.04, 1.1, 1.04] : [1.08, 1.22, 1.08],
        }}
        transition={{ duration: state === "idle" ? 7 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(100,60,255,0.2) 0%, rgba(0,180,220,0.1) 30%, rgba(255,100,150,0.06) 50%, transparent 70%)",
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
