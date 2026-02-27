import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AuraState = "idle" | "listening" | "processing" | "speaking";

interface AuraOrbProps {
  state: AuraState;
  size?: number;
  onClick?: () => void;
}

// Per-state aurora behavior
const stateConfig = {
  idle:       { speed: 0.12, warpAmp: 0.55, brightness: 0.70, rotation: 0.008 },
  listening:  { speed: 0.55, warpAmp: 1.10, brightness: 1.20, rotation: 0.030 },
  processing: { speed: 1.40, warpAmp: 1.40, brightness: 1.40, rotation: 0.060 },
  speaking:   { speed: 0.30, warpAmp: 0.80, brightness: 0.95, rotation: 0.018 },
};

// SVG turbulence per state
const svgConfig: Record<AuraState, { baseFreq: string; scale: number; dur: string }> = {
  idle:       { baseFreq: "0.005 0.008", scale: 12, dur: "22s" },
  listening:  { baseFreq: "0.009 0.012", scale: 22, dur: "7s"  },
  processing: { baseFreq: "0.013 0.016", scale: 32, dur: "4s"  },
  speaking:   { baseFreq: "0.007 0.010", scale: 16, dur: "11s" },
};

// Aurora bands: each is a sweeping ribbon of color
// hue, sat, lightStart/End, yOffset (0-1 of radius), width (fraction of radius),
// speed multiplier, phase, rotation offset
const BANDS = [
  // Cyan-teal band
  { h1: 172, h2: 195, s: 100, yOff: -0.30, w: 0.55, spd: 1.00, ph: 0.00, rot: 0.00 },
  // Blue-cyan band
  { h1: 195, h2: 215, s: 90,  yOff:  0.05, w: 0.45, spd: 0.78, ph: 1.20, rot: 0.40 },
  // Purple band
  { h1: 255, h2: 280, s: 88,  yOff:  0.25, w: 0.50, spd: 0.60, ph: 2.50, rot: 0.90 },
  // Magenta-pink band
  { h1: 300, h2: 330, s: 95,  yOff: -0.10, w: 0.40, spd: 0.88, ph: 4.10, rot: 1.70 },
  // Pink-rose band
  { h1: 330, h2: 350, s: 90,  yOff:  0.40, w: 0.35, spd: 1.10, ph: 3.30, rot: 2.50 },
  // Deep violet (backdrop anchor)
  { h1: 235, h2: 260, s: 80,  yOff: -0.50, w: 0.60, spd: 0.45, ph: 5.80, rot: -0.60 },
];

const AuraOrb: React.FC<AuraOrbProps> = ({ state, size = 120, onClick }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const svgRef     = useRef<SVGSVGElement>(null);
  const timeRef    = useRef(0);
  const rotRef     = useRef(0);
  const cfgRef     = useRef({ ...stateConfig[state] });
  const animRef    = useRef<number>(0);
  const uid        = useRef(`aura-${Math.random().toString(36).slice(2, 8)}`);

  // Smooth lerp between states
  useEffect(() => {
    const target = stateConfig[state];
    const start  = { ...cfgRef.current };
    const t0 = performance.now();
    const dur = 800;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      const p = Math.min((performance.now() - t0) / dur, 1);
      const e = p * p * (3 - 2 * p); // smoothstep
      cfgRef.current = {
        speed:      lerp(start.speed,      target.speed,      e),
        warpAmp:    lerp(start.warpAmp,    target.warpAmp,    e),
        brightness: lerp(start.brightness, target.brightness, e),
        rotation:   lerp(start.rotation,   target.rotation,   e),
      };
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [state]);

  // Update SVG filter on state change
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const c = svgConfig[state];
    const turb = svg.querySelector("feTurbulence");
    const disp = svg.querySelector("feDisplacementMap");
    const grp  = svg.querySelector(".aurora-svg-layer") as SVGGElement | null;
    if (turb) {
      turb.setAttribute("baseFrequency", c.baseFreq);
      const anim = turb.querySelector("animate");
      if (anim) anim.setAttribute("dur", c.dur);
    }
    if (disp) disp.setAttribute("scale", String(c.scale));
    if (grp)  grp.style.opacity = state === "idle" ? "0.38" : state === "speaking" ? "0.48" : "0.58";
  }, [state]);

  // Canvas: draw aurora ribbons
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
    const R  = size * 0.46; // sphere radius

    let lastTs = performance.now();

    const draw = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      const cfg = cfgRef.current;
      timeRef.current += dt * cfg.speed;
      rotRef.current  += dt * cfg.rotation;
      const t   = timeRef.current;
      const rot = rotRef.current;

      ctx.clearRect(0, 0, size, size);

      // ── Clip to sphere ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // ── Dark void base — very transparent so bubble stays glass-like ──
      ctx.fillStyle = "rgba(4,2,12,0.18)";
      ctx.fillRect(0, 0, size, size);

      // ── Aurora ribbons — rotate coordinate system, then draw each band ──
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);
      ctx.globalCompositeOperation = "screen";

      for (const band of BANDS) {
        // Wave undulation: band center drifts sinusoidally
        const wave1 = Math.sin(t * band.spd + band.ph) * 0.22 * cfg.warpAmp;
        const wave2 = Math.sin(t * band.spd * 0.6 + band.ph + 1.3) * 0.12 * cfg.warpAmp;
        const bandCenterY = cy + (band.yOff + wave1 + wave2) * R;
        const bandH = band.w * R * (0.85 + 0.15 * Math.sin(t * band.spd * 0.8 + band.ph));

        // Horizontal shimmer — band tilts slightly
        const tiltX = Math.sin(t * band.spd * 0.4 + band.ph + 0.7) * R * 0.18 * cfg.warpAmp;

        // Aurora ribbon: draw as a rotated gradient rect, capped to sphere
        const brightness = Math.min(cfg.brightness, 1.8);
        const lMid = Math.min(65 * brightness, 90);
        const lEdge = Math.min(50 * brightness, 75);

        // Gradient runs top-to-bottom across the band
        const grd = ctx.createLinearGradient(
          cx + tiltX, bandCenterY - bandH,
          cx - tiltX, bandCenterY + bandH
        );
        const alpha = (0.55 + 0.15 * Math.sin(t * band.spd * 1.2 + band.ph)) * (brightness * 0.7);
        const hMid = band.h1 + (band.h2 - band.h1) * (0.5 + 0.5 * Math.sin(t * band.spd * 0.3 + band.ph));

        grd.addColorStop(0,    `hsla(${band.h1},${band.s}%,${lEdge}%,0)`);
        grd.addColorStop(0.15, `hsla(${band.h1},${band.s}%,${lMid}%,${(alpha * 0.45).toFixed(3)})`);
        grd.addColorStop(0.40, `hsla(${hMid},   ${band.s}%,${lMid}%,${(alpha * 0.85).toFixed(3)})`);
        grd.addColorStop(0.60, `hsla(${band.h2},${band.s}%,${lMid}%,${(alpha * 0.80).toFixed(3)})`);
        grd.addColorStop(0.85, `hsla(${band.h2},${band.s}%,${lEdge}%,${(alpha * 0.35).toFixed(3)})`);
        grd.addColorStop(1,    `hsla(${band.h2},${band.s}%,${lEdge}%,0)`);

        ctx.fillStyle = grd;
        // Draw a tall wide rect — the clip handles the sphere boundary
        ctx.fillRect(cx - R * 1.4, bandCenterY - bandH, R * 2.8, bandH * 2);
      }

      ctx.restore(); // un-rotate
      ctx.globalCompositeOperation = "source-over";

      // ── Hollow center — very slight cool brightening (glass lens) ──
      const hollow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
      hollow.addColorStop(0, "rgba(210,245,255,0.05)");
      hollow.addColorStop(1, "rgba(210,245,255,0)");
      ctx.fillStyle = hollow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // un-clip

      // ── Iridescent soap-bubble ring ──
      const ringSteps = 120;
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.26 + 0.08 * Math.sin(t * 0.45);
      for (let i = 0; i < ringSteps; i++) {
        const a0 = (i / ringSteps) * Math.PI * 2;
        const a1 = ((i + 1.3) / ringSteps) * Math.PI * 2;
        const hue = ((i / ringSteps) * 360 + t * 28) % 360;
        const lt  = 76 + 8 * Math.sin(t * 0.38 + i * 0.14);
        ctx.beginPath();
        ctx.arc(cx, cy, R - 0.8, a0, a1);
        ctx.strokeStyle = `hsl(${hue},82%,${lt}%)`;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── Specular top-left highlight ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const sX = cx - R * 0.20, sY = cy - R * 0.24, sR = R * 0.28;
      const spec = ctx.createRadialGradient(sX, sY, 0, sX, sY, sR);
      const sOp = Math.min(0.48 * cfg.brightness, 0.88);
      spec.addColorStop(0,    `rgba(255,255,255,${sOp.toFixed(2)})`);
      spec.addColorStop(0.22, `rgba(255,255,255,0.12)`);
      spec.addColorStop(0.60, `rgba(255,255,255,0.03)`);
      spec.addColorStop(1,    `rgba(255,255,255,0)`);
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(sX, sY, sR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  const id  = uid.current;
  const sc  = svgConfig[state];

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
          opacity: state === "idle" ? [0.04, 0.10, 0.04] : [0.12, 0.28, 0.12],
          scale:   state === "idle" ? [1.02, 1.07, 1.02] : [1.05, 1.14, 1.05],
        }}
        transition={{ duration: state === "idle" ? 10 : 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,220,255,0.12) 0%, rgba(160,40,255,0.08) 38%, rgba(255,40,160,0.05) 60%, transparent 78%)",
          filter: "blur(16px)",
        }}
      />

      {/* Canvas — aurora ribbons + bubble ring + specular */}
      <canvas
        ref={canvasRef}
        className="absolute z-10"
        style={{ borderRadius: "50%", top: 0, left: 0 }}
      />

      {/* SVG turbulence — warps the aurora into organic flowing shapes */}
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="absolute z-20 pointer-events-none"
        style={{ top: 0, left: 0, mixBlendMode: "screen" }}
      >
        <defs>
          {/* Flowing aurora gradient fills */}
          <linearGradient id={`${id}-lg-cyan`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="hsl(185,100%,68%)" stopOpacity="0" />
            <stop offset="30%"  stopColor="hsl(185,100%,70%)" stopOpacity="0.65" />
            <stop offset="65%"  stopColor="hsl(200,90%,62%)"  stopOpacity="0.50" />
            <stop offset="100%" stopColor="hsl(210,80%,55%)"  stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-lg-purple`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="hsl(268,88%,62%)" stopOpacity="0" />
            <stop offset="35%"  stopColor="hsl(268,88%,65%)" stopOpacity="0.60" />
            <stop offset="70%"  stopColor="hsl(285,82%,58%)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(295,78%,52%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-lg-pink`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="hsl(318,95%,66%)" stopOpacity="0" />
            <stop offset="30%"  stopColor="hsl(320,95%,68%)" stopOpacity="0.55" />
            <stop offset="65%"  stopColor="hsl(338,88%,62%)" stopOpacity="0.40" />
            <stop offset="100%" stopColor="hsl(348,82%,55%)" stopOpacity="0" />
          </linearGradient>

          {/* Turbulence displacement */}
          <filter id={`${id}-turb`} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={sc.baseFreq}
              numOctaves={5}
              seed={2}
              result="noise"
            >
              <animate
                attributeName="seed"
                values="2;10;18;26;18;10;2"
                dur={sc.dur}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={sc.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Sphere clip */}
          <clipPath id={`${id}-clip`}>
            <circle cx={size / 2} cy={size / 2} r={size * 0.455} />
          </clipPath>
        </defs>

        {/* Aurora bands displaced by turbulence */}
        <g
          className="aurora-svg-layer"
          filter={`url(#${id}-turb)`}
          clipPath={`url(#${id}-clip)`}
          style={{ mixBlendMode: "screen", opacity: 0.42 }}
        >
          {/* Cyan aurora curtain — top half */}
          <rect x="0" y={size * 0.05} width={size} height={size * 0.45}
            fill={`url(#${id}-lg-cyan)`} />
          {/* Purple curtain — mid */}
          <rect x="0" y={size * 0.28} width={size} height={size * 0.44}
            fill={`url(#${id}-lg-purple)`} />
          {/* Pink curtain — lower */}
          <rect x="0" y={size * 0.42} width={size} height={size * 0.48}
            fill={`url(#${id}-lg-pink)`} />
        </g>
      </svg>
    </div>
  );
};

export default AuraOrb;
