import React, { useEffect, useRef } from "react";

const BLOBS = [
  { hue: 188, sat: 100, light: 80, spd:  0.28, ph: 0.0,  orbitR: 0.54 },
  { hue: 272, sat: 90,  light: 72, spd: -0.22, ph: 2.1,  orbitR: 0.56 },
  { hue: 322, sat: 96,  light: 76, spd:  0.17, ph: 4.8,  orbitR: 0.50 },
  { hue: 198, sat: 90,  light: 84, spd:  0.19, ph: 1.0,  orbitR: 0.38 },
];

const MiniAuraOrb: React.FC<{ size?: number }> = ({ size = 14 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

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

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt * 0.3;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // dark bg
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bg.addColorStop(0, "rgba(10,5,25,0.95)");
      bg.addColorStop(1, "rgba(5,2,15,0.98)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = "screen";

      for (const blob of BLOBS) {
        const angle = t * blob.spd * Math.PI * 2 + blob.ph;
        const bx = cx + Math.cos(angle) * blob.orbitR * r;
        const by = cy + Math.sin(angle * 0.8) * blob.orbitR * r * 0.85;
        const br = 0.7 * r;
        const l = Math.min(blob.light * 1.05, 100);
        const op = 0.65;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0,    `hsla(${blob.hue},${blob.sat}%,${l}%,${(op * 0.72).toFixed(2)})`);
        g.addColorStop(0.4,  `hsla(${blob.hue},${blob.sat}%,${l * 0.85}%,${(op * 0.4).toFixed(2)})`);
        g.addColorStop(1,    `hsla(${blob.hue},${blob.sat}%,${l * 0.5}%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // iridescent ring
      const steps = 60;
      ctx.save();
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < steps; i++) {
        const a0 = (i / steps) * Math.PI * 2;
        const a1 = ((i + 1.2) / steps) * Math.PI * 2;
        const hue = ((i / steps) * 360 + t * 30) % 360;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 0.5, a0, a1);
        ctx.strokeStyle = `hsl(${hue}, 85%, 78%)`;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // specular
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const sx = cx - r * 0.2;
      const sy = cy - r * 0.24;
      const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.28);
      spec.addColorStop(0, "rgba(255,255,255,0.55)");
      spec.addColorStop(0.2, "rgba(255,255,255,0.12)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: "50%", display: "block", flexShrink: 0 }}
    />
  );
};

export default MiniAuraOrb;
