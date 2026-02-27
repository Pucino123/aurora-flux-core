import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

/**
 * 3D frosted glass sphere with colorful liquid interior.
 * Colors: deep indigo, purple, cyan, pink + orange/pink rim glow.
 * Matching the Apple Siri reference image.
 */

const stateConfig = {
  idle:       { speedMul: 0.4, ampMul: 1.0, glow: 0.5, brightness: 0.9, spread: 1.0 },
  listening:  { speedMul: 1.6, ampMul: 1.4, glow: 0.9, brightness: 1.3, spread: 1.2 },
  processing: { speedMul: 4.0, ampMul: 0.6, glow: 1.0, brightness: 1.5, spread: 0.7 },
  speaking:   { speedMul: 1.2, ampMul: 1.1, glow: 0.7, brightness: 1.1, spread: 1.1 },
};

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef(stateConfig[state]);
  const animRef = useRef<number>(0);

  // Smooth config interpolation
  useEffect(() => {
    const target = stateConfig[state];
    const start = { ...configRef.current };
    const startTime = performance.now();
    const duration = 600;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const e = t * t * (3 - 2 * t); // smoothstep
      configRef.current = {
        speedMul: lerp(start.speedMul, target.speedMul, e),
        ampMul: lerp(start.ampMul, target.ampMul, e),
        glow: lerp(start.glow, target.glow, e),
        brightness: lerp(start.brightness, target.brightness, e),
        spread: lerp(start.spread, target.spread, e),
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

    // Blob definitions — large, soft, overlapping colored masses
    const blobs = [
      { hue: 240, sat: 85, light: 35, x: -0.2, y: -0.15, radius: 0.55, speed: 0.3, phase: 0 },      // deep indigo
      { hue: 275, sat: 80, light: 40, x: 0.15, y: 0.2, radius: 0.5, speed: 0.25, phase: 1.5 },       // purple
      { hue: 190, sat: 95, light: 50, x: 0.0, y: -0.05, radius: 0.45, speed: 0.35, phase: 3.0 },     // cyan
      { hue: 320, sat: 90, light: 45, x: -0.1, y: 0.15, radius: 0.4, speed: 0.4, phase: 4.5 },       // pink/magenta
      { hue: 210, sat: 100, light: 55, x: 0.2, y: -0.2, radius: 0.35, speed: 0.28, phase: 2.0 },     // bright blue
      { hue: 160, sat: 80, light: 45, x: -0.15, y: 0.0, radius: 0.3, speed: 0.32, phase: 5.5 },      // teal-green
    ];

    // Flowing wave/ribbon definitions
    const waves = [
      { hue: 180, sat: 90, light: 60, yOff: -0.05, amp: 0.12, speed: 0.4, phase: 0, width: 0.08 },    // cyan wave
      { hue: 40,  sat: 80, light: 55, yOff: 0.03,  amp: 0.10, speed: 0.35, phase: 2.0, width: 0.06 }, // warm gold wave
      { hue: 300, sat: 70, light: 55, yOff: -0.02, amp: 0.08, speed: 0.45, phase: 4.0, width: 0.05 }, // pink wave
    ];

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const cfg = configRef.current;
      timeRef.current += dt * cfg.speedMul;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      // === Clip to sphere ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // === Deep dark background ===
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0, "#0a0520");
      bgGrad.addColorStop(0.5, "#060318");
      bgGrad.addColorStop(1, "#020110");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // === Colorful liquid blobs ===
      ctx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        const bx = cx + (blob.x + Math.sin(t * blob.speed + blob.phase) * 0.15 * cfg.ampMul) * r * cfg.spread;
        const by = cy + (blob.y + Math.cos(t * blob.speed * 0.8 + blob.phase) * 0.12 * cfg.ampMul) * r * cfg.spread;
        const br = blob.radius * r * (0.9 + Math.sin(t * blob.speed * 0.5 + blob.phase) * 0.1 * cfg.ampMul);

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        const l = Math.min(blob.light * cfg.brightness, 100);
        grad.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${l}%, 0.7)`);
        grad.addColorStop(0.3, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.8}%, 0.4)`);
        grad.addColorStop(0.6, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.6}%, 0.15)`);
        grad.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${l * 0.4}%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }

      // === Flowing wave ribbons across the sphere ===
      for (const wave of waves) {
        const numPts = 50;
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i <= numPts; i++) {
          const frac = i / numPts;
          const wx = cx - r + frac * r * 2;
          const w1 = Math.sin(frac * Math.PI * 2.5 + t * wave.speed + wave.phase) * wave.amp * r * cfg.ampMul;
          const w2 = Math.sin(frac * Math.PI * 4 + t * wave.speed * 0.7 + wave.phase * 1.3) * wave.amp * r * 0.4 * cfg.ampMul;
          const wy = cy + wave.yOff * r + w1 + w2;
          points.push({ x: wx, y: wy });
        }

        // Draw wave with glow layers
        const layers = [
          { widthMul: 4.0, alpha: 0.08 },
          { widthMul: 2.0, alpha: 0.2 },
          { widthMul: 1.0, alpha: 0.5 },
          { widthMul: 0.3, alpha: 0.9 },
        ];

        for (const layer of layers) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          const l = Math.min(wave.light * cfg.brightness, 100);
          ctx.strokeStyle = `hsla(${wave.hue}, ${wave.sat}%, ${l}%, ${layer.alpha * cfg.brightness * 0.7})`;
          ctx.lineWidth = wave.width * r * layer.widthMul;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";

      // === Center white glow ===
      const glowR = r * 0.6;
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glowGrad.addColorStop(0, `rgba(255,255,255,${0.25 * cfg.glow})`);
      glowGrad.addColorStop(0.2, `rgba(255,255,255,${0.1 * cfg.glow})`);
      glowGrad.addColorStop(0.5, `rgba(200,200,255,${0.03 * cfg.glow})`);
      glowGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, size, size);

      // === Frosted glass specular highlight (top-left) ===
      const specX = cx - r * 0.28;
      const specY = cy - r * 0.32;
      const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.45);
      specGrad.addColorStop(0, "rgba(255,255,255,0.18)");
      specGrad.addColorStop(0.3, "rgba(255,255,255,0.06)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, size, size);

      // === Secondary specular (bottom-right, warm) ===
      const spec2X = cx + r * 0.2;
      const spec2Y = cy + r * 0.25;
      const spec2Grad = ctx.createRadialGradient(spec2X, spec2Y, 0, spec2X, spec2Y, r * 0.3);
      spec2Grad.addColorStop(0, "rgba(255,200,150,0.08)");
      spec2Grad.addColorStop(1, "rgba(255,200,150,0)");
      ctx.fillStyle = spec2Grad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // === 3D glass rim with orange/pink edge glow ===
      // Outer glow ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100,180,255,0.12)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Orange/pink rim highlight (top-right arc)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -0.8, 0.6);
      const rimGrad = ctx.createLinearGradient(cx + r * 0.5, cy - r * 0.8, cx + r * 0.3, cy + r * 0.5);
      rimGrad.addColorStop(0, "rgba(255,140,60,0.25)");
      rimGrad.addColorStop(0.5, "rgba(255,100,120,0.15)");
      rimGrad.addColorStop(1, "rgba(255,60,180,0.05)");
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Cyan rim highlight (left arc)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 2.2, 4.2);
      const rimGrad2 = ctx.createLinearGradient(cx - r, cy - r * 0.5, cx - r * 0.5, cy + r * 0.5);
      rimGrad2.addColorStop(0, "rgba(0,200,255,0.2)");
      rimGrad2.addColorStop(1, "rgba(100,100,255,0.05)");
      ctx.strokeStyle = rimGrad2;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Subtle full rim
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,160,255,0.06)";
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
      {/* Outer ambient glow — colorful, matching sphere palette */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          opacity: state === "idle" ? [0.15, 0.3, 0.15] : [0.35, 0.6, 0.35],
          scale: state === "idle" ? [1.05, 1.12, 1.05] : [1.1, 1.25, 1.1],
        }}
        transition={{ duration: state === "idle" ? 6 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(100,60,255,0.25) 0%, rgba(0,180,220,0.12) 30%, rgba(255,100,150,0.08) 50%, transparent 70%)",
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
