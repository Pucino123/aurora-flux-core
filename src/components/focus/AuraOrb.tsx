import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

/*
 * Siri-style orb — Canvas-based wide luminous aurora bands
 * that flow and blend with screen-mode compositing, plus
 * a bright white center glow. Inspired by Apple Siri.
 */

const stateConfig = {
  idle:       { speedMul: 0.6,  ampMul: 1.0, glow: 0.5, brightness: 0.85, bandWidth: 1.0 },
  listening:  { speedMul: 1.8,  ampMul: 1.5, glow: 0.85, brightness: 1.2, bandWidth: 1.3 },
  processing: { speedMul: 3.5,  ampMul: 0.5, glow: 1.0,  brightness: 1.4, bandWidth: 0.7 },
  speaking:   { speedMul: 1.4,  ampMul: 1.2, glow: 0.7,  brightness: 1.0, bandWidth: 1.1 },
};

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef(stateConfig[state]);
  const animRef = useRef<number>(0);

  // Smoothly interpolate config on state change
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
        bandWidth: lerp(start.bandWidth, target.bandWidth, e),
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

    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.44;

    let lastTime = performance.now();

    // Define aurora bands — wide, luminous, flowing
    const bands = [
      { hue: 280, sat: 100, light: 60, phase: 0,    speed: 0.35, yOff: -0.15, amp: 0.18 },  // purple
      { hue: 320, sat: 100, light: 55, phase: 1.2,  speed: 0.28, yOff: 0.05,  amp: 0.22 },  // pink/magenta
      { hue: 200, sat: 100, light: 60, phase: 2.5,  speed: 0.42, yOff: -0.08, amp: 0.16 },  // cyan/blue
      { hue: 240, sat: 90,  light: 50, phase: 3.8,  speed: 0.32, yOff: 0.12,  amp: 0.20 },  // deep blue
      { hue: 170, sat: 90,  light: 55, phase: 5.0,  speed: 0.38, yOff: -0.02, amp: 0.14 },  // teal
      { hue: 300, sat: 80,  light: 65, phase: 0.8,  speed: 0.25, yOff: 0.18,  amp: 0.15 },  // violet-pink
    ];

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const cfg = configRef.current;
      timeRef.current += dt * cfg.speedMul;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      // === Dark sphere background ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      bgGrad.addColorStop(0, "#1a0a2e");
      bgGrad.addColorStop(0.4, "#0d0520");
      bgGrad.addColorStop(0.7, "#080318");
      bgGrad.addColorStop(1, "#030108");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // === Draw luminous aurora bands ===
      const numPts = 60;

      for (const band of bands) {
        const amp = band.amp * cfg.ampMul * radius;
        const bandW = radius * 0.35 * cfg.bandWidth; // Wide bands

        // Build wave path
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i <= numPts; i++) {
          const frac = i / numPts;
          const x = cx - radius + frac * radius * 2;

          // Layered sine waves for organic, flowing motion
          const w1 = Math.sin(frac * Math.PI * 2.0 + t * band.speed + band.phase) * amp;
          const w2 = Math.sin(frac * Math.PI * 3.5 + t * band.speed * 0.6 + band.phase * 1.5) * amp * 0.5;
          const w3 = Math.sin(frac * Math.PI * 1.2 + t * band.speed * 1.4 + band.phase * 0.6) * amp * 0.35;

          const y = cy + band.yOff * radius + w1 + w2 + w3;
          points.push({ x, y });
        }

        // Draw multiple layers for each band (glow → core → bright center)
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        const layers = [
          { widthMul: 3.0, alpha: 0.06 },  // wide outer glow
          { widthMul: 2.0, alpha: 0.12 },  // mid glow
          { widthMul: 1.2, alpha: 0.25 },  // main band
          { widthMul: 0.5, alpha: 0.45 },  // bright core
          { widthMul: 0.15, alpha: 0.7 },  // hot center line
        ];

        for (const layer of layers) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }

          const l = Math.min(band.light * cfg.brightness, 100);
          ctx.strokeStyle = `hsla(${band.hue}, ${band.sat}%, ${l}%, ${layer.alpha * cfg.brightness})`;
          ctx.lineWidth = bandW * layer.widthMul;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }

        ctx.restore();
      }

      // === Bright white center glow (convergence point) ===
      const glowR = radius * 0.55;
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glowGrad.addColorStop(0, `rgba(255,255,255,${0.5 * cfg.glow})`);
      glowGrad.addColorStop(0.15, `rgba(255,255,255,${0.25 * cfg.glow})`);
      glowGrad.addColorStop(0.4, `rgba(200,180,255,${0.08 * cfg.glow})`);
      glowGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // === Specular highlight (top-left) ===
      const specX = cx - radius * 0.25;
      const specY = cy - radius * 0.3;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, radius * 0.3);
      specGrad.addColorStop(0, "rgba(255,255,255,0.1)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();

      // === Subtle rim ===
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,140,255,0.08)";
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
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.2, 0.35, 0.2] : [0.4, 0.65, 0.4],
          scale: state === "idle" ? [1.05, 1.15, 1.05] : [1.1, 1.3, 1.1],
        }}
        transition={{ duration: state === "idle" ? 5 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(140,60,255,0.3) 0%, rgba(200,80,200,0.15) 30%, rgba(80,180,255,0.08) 50%, transparent 70%)",
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
