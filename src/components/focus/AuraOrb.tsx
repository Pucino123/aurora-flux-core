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

// SVG turbulence config per state
const svgStateConfig: Record<AuraState, { baseFreq: string; scale: number; seedDur: string; opacity: number }> = {
  idle:       { baseFreq: "0.006 0.006", scale: 8,  seedDur: "18s", opacity: 0.48 },
  listening:  { baseFreq: "0.010 0.010", scale: 18, seedDur: "5s",  opacity: 0.62 },
  processing: { baseFreq: "0.014 0.014", scale: 24, seedDur: "4s",  opacity: 0.68 },
  speaking:   { baseFreq: "0.008 0.008", scale: 12, seedDur: "7s",  opacity: 0.55 },
};

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
  const svgRef = useRef<SVGSVGElement>(null);
  const timeRef = useRef(0);
  const configRef = useRef({ ...stateConfig[state] });
  const animRef = useRef<number>(0);
  // Unique IDs to avoid conflicts when multiple orbs exist
  const uid = useRef(`aura-${Math.random().toString(36).slice(2, 8)}`);

  // Smooth transition between canvas states
  useEffect(() => {
    const target = stateConfig[state];
    const start = { ...configRef.current };
    const startTime = performance.now();
    const dur = 700;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / dur, 1);
      const e = t * t * (3 - 2 * t);
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

  // Update SVG filter attributes on state change (no re-render needed)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const cfg = svgStateConfig[state];

    const turbulence = svg.querySelector("feTurbulence");
    const displacement = svg.querySelector("feDisplacementMap");
    const blobGroup = svg.querySelector(".aura-blob-group") as SVGGElement | null;

    if (turbulence) {
      turbulence.setAttribute("baseFrequency", cfg.baseFreq);
      // Update seed animation duration
      const anim = turbulence.querySelector("animate");
      if (anim) anim.setAttribute("dur", cfg.seedDur);
    }
    if (displacement) {
      displacement.setAttribute("scale", String(cfg.scale));
    }
    if (blobGroup) {
      blobGroup.style.opacity = String(cfg.opacity);
    }
  }, [state]);

  // Canvas animation loop
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

      // ── Background: very subtle dark void ──
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0,   "rgba(8,4,18,0.10)");
      bgGrad.addColorStop(0.6, "rgba(4,2,12,0.06)");
      bgGrad.addColorStop(1,   "rgba(0,0,0,0.03)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // ── Fluid gas blobs — screen blend for colour mixing ──
      ctx.globalCompositeOperation = "screen";

      for (const blob of BLOBS) {
        const orbitAngle = t * blob.spd * 6.28 + blob.ph;
        const breathe = 0.85 + 0.15 * Math.sin(t * blob.spd * 1.3 + blob.ph * 0.7);
        const bx = cx + (blob.ox * r + Math.cos(orbitAngle) * blob.orbitR * r) * cfg.ampMul;
        const by = cy + (blob.oy * r + Math.sin(orbitAngle * 0.73) * blob.orbitR * r * 0.8) * cfg.ampMul;
        const br = blob.rad * r * breathe * (0.9 + 0.1 * Math.sin(t * blob.spd * 2.1 + blob.ph));

        const l = Math.min(blob.light * cfg.brightness, 100);
        const op = cfg.opacity;

        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0,    `hsla(${blob.hue},${blob.sat}%,${l}%,${(op * 0.50).toFixed(2)})`);
        g.addColorStop(0.25, `hsla(${blob.hue},${blob.sat}%,${l * 0.88}%,${(op * 0.30).toFixed(2)})`);
        g.addColorStop(0.55, `hsla(${blob.hue},${blob.sat}%,${l * 0.72}%,${(op * 0.12).toFixed(2)})`);
        g.addColorStop(0.80, `hsla(${blob.hue},${blob.sat}%,${l * 0.55}%,${(op * 0.03).toFixed(2)})`);
        g.addColorStop(1,    `hsla(${blob.hue},${blob.sat}%,${l * 0.4}%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // ── Very subtle hollow center brightening ──
      const hollow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
      hollow.addColorStop(0,   "rgba(210,240,255,0.04)");
      hollow.addColorStop(0.5, "rgba(210,240,255,0.02)");
      hollow.addColorStop(1,   "rgba(210,240,255,0)");
      ctx.fillStyle = hollow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // ── Iridescent soap-bubble ring — smooth continuous ──
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
      spec.addColorStop(0,    `rgba(255,255,255,${Math.min(specOpacity, 0.9).toFixed(2)})`);
      spec.addColorStop(0.18, `rgba(255,255,255,0.14)`);
      spec.addColorStop(0.50, `rgba(255,255,255,0.04)`);
      spec.addColorStop(1,    `rgba(255,255,255,0)`);
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

  const id = uid.current;
  const initCfg = svgStateConfig[state];

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Ambient outer glow */}
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

      {/* Canvas — soap bubble base with iridescent ring + specular */}
      <canvas
        ref={canvasRef}
        className="absolute z-10"
        style={{ borderRadius: "50%", top: 0, left: 0 }}
      />

      {/* SVG turbulence layer — organic gas displacement on top of canvas */}
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="absolute z-20 pointer-events-none"
        style={{ top: 0, left: 0, mixBlendMode: "screen" }}
      >
        <defs>
          {/* Radial gradient fills for the gas blobs */}
          <radialGradient id={`${id}-g-cyan`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(188,100%,70%)" stopOpacity="0.70" />
            <stop offset="45%"  stopColor="hsl(195,90%,60%)"  stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(200,80%,50%)"  stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-g-purple`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(270,90%,68%)" stopOpacity="0.65" />
            <stop offset="45%"  stopColor="hsl(255,80%,58%)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="hsl(245,70%,48%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-g-pink`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(322,95%,70%)" stopOpacity="0.60" />
            <stop offset="45%"  stopColor="hsl(335,85%,60%)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(345,75%,50%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-g-teal`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(210,80%,65%)" stopOpacity="0.45" />
            <stop offset="50%"  stopColor="hsl(220,70%,55%)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(230,60%,45%)" stopOpacity="0" />
          </radialGradient>

          {/* Turbulence displacement filter */}
          <filter id={`${id}-turbulence`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={initCfg.baseFreq}
              numOctaves={4}
              seed={0}
              result="noise"
            >
              <animate
                attributeName="seed"
                values="0;8;16;24;16;8;0"
                dur={initCfg.seedDur}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={initCfg.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Clip to sphere */}
          <clipPath id={`${id}-clip`}>
            <circle cx={size / 2} cy={size / 2} r={size * 0.46} />
          </clipPath>
        </defs>

        {/* Gas blobs displaced by turbulence — clipped to sphere */}
        <g
          className="aura-blob-group"
          filter={`url(#${id}-turbulence)`}
          clipPath={`url(#${id}-clip)`}
          style={{ mixBlendMode: "screen", opacity: initCfg.opacity }}
        >
          {/* Cyan blob — top-left area */}
          <circle cx={size * 0.38} cy={size * 0.33} r={size * 0.38} fill={`url(#${id}-g-cyan)`} />
          {/* Purple blob — bottom-right area */}
          <circle cx={size * 0.62} cy={size * 0.65} r={size * 0.35} fill={`url(#${id}-g-purple)`} />
          {/* Pink blob — center-right, slightly up */}
          <circle cx={size * 0.57} cy={size * 0.38} r={size * 0.32} fill={`url(#${id}-g-pink)`} />
          {/* Teal accent — center */}
          <circle cx={size * 0.45} cy={size * 0.52} r={size * 0.25} fill={`url(#${id}-g-teal)`} />
        </g>
      </svg>
    </div>
  );
};

export default AuraOrb;
