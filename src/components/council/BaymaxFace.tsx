/**
 * BaymaxFace — precision SVG component matching the canonical Baymax face.
 *
 * Reference: circular white/grey face, two dark vertical ovals (eyes) connected
 * by a thin horizontal stroke. Per-persona colour + expression tweaks.
 */
import React from "react";

export type BaymaxExpression = "smile" | "straight" | "frown" | "analytical" | "wide-smile";

interface BaymaxFaceProps {
  /** Accent / glow colour for the circular background shell */
  color: string;
  /** Overall rendered size in px (width = height) */
  size?: number;
  /** Expression variant */
  expression?: BaymaxExpression;
  className?: string;
  /** Extra CSS style on the root <svg> */
  style?: React.CSSProperties;
}

const BaymaxFace: React.FC<BaymaxFaceProps> = ({
  color,
  size = 22,
  expression = "straight",
  className = "",
  style,
}) => {
  const S = size;          // shorthand
  const cx = S / 2;
  const cy = S / 2;

  /* ── Circle shell ── */
  const shellR = S * 0.46;
  // Subtle gradient from near-white to a tinted light version of the accent
  const gradId = `bf-grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  const glowId = `bf-glow-${color.replace(/[^a-z0-9]/gi, "")}`;

  /* ── Eye geometry ──
   * The canonical Baymax eyes are vertical ovals: rx < ry.
   * Positioned symmetrically left/right of centre, slightly above mid-height.
   */
  const baseSpread  = S * 0.195;   // horizontal distance from centre to each eye
  const eyeRx       = S * 0.075;   // eye horizontal radius
  const eyeRy       = S * 0.115;   // eye vertical radius  (taller than wide)
  const eyeCY       = cy - S * 0.04; // slightly above centre

  /* ── Per-expression overrides ── */
  let leftEyeCX  = cx - baseSpread;
  let rightEyeCX = cx + baseSpread;
  let lRx = eyeRx, lRy = eyeRy, rRx = eyeRx, rRy = eyeRy;
  let leftRotate  = 0;
  let rightRotate = 0;

  // Connecting bar Y (centre of bar between the two eyes)
  const barY = eyeCY;

  // Bar path — rebuilt per expression
  let barPath = "";

  switch (expression) {
    case "smile": {
      // Gentle upward-curving smile line
      barPath = `M ${leftEyeCX} ${barY + S * 0.02} Q ${cx} ${barY + S * 0.12} ${rightEyeCX} ${barY + S * 0.02}`;
      break;
    }
    case "wide-smile": {
      // Big warm deep-curve smile, slightly wider eye spacing
      leftEyeCX  = cx - baseSpread * 1.12;
      rightEyeCX = cx + baseSpread * 1.12;
      lRx = rRx = eyeRx * 1.1;
      lRy = rRy = eyeRy * 1.1;
      barPath = `M ${leftEyeCX} ${barY + S * 0.02} Q ${cx} ${barY + S * 0.18} ${rightEyeCX} ${barY + S * 0.02}`;
      break;
    }
    case "analytical": {
      // Eyes slightly closer, perfectly straight rigid line
      leftEyeCX  = cx - baseSpread * 0.82;
      rightEyeCX = cx + baseSpread * 0.82;
      barPath = `M ${leftEyeCX} ${barY} L ${rightEyeCX} ${barY}`;
      break;
    }
    case "frown": {
      // Eyes rotated inward (furrowed brow): left eye rotates CW, right CCW
      leftRotate  = 18;
      rightRotate = -18;
      // Eyes shift slightly inward+down for furrowed look
      leftEyeCX  = cx - baseSpread * 0.9;
      rightEyeCX = cx + baseSpread * 0.9;
      barPath = `M ${leftEyeCX} ${barY + S * 0.01} L ${rightEyeCX} ${barY + S * 0.01}`;
      break;
    }
    case "straight":
    default: {
      barPath = `M ${leftEyeCX} ${barY} L ${rightEyeCX} ${barY}`;
      break;
    }
  }

  const barStrokeW = Math.max(0.8, S * 0.045);
  const eyeFill    = "#0f172a"; // near-black

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {/* Shell gradient: soft white centre → tinted edge */}
        <radialGradient id={gradId} cx="42%" cy="38%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="65%"  stopColor="#f0f0f2" stopOpacity="1" />
          <stop offset="100%" stopColor={color}   stopOpacity="0.18" />
        </radialGradient>
        {/* Outer glow filter */}
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={S * 0.08} result="blur" />
          <feFlood floodColor={color} floodOpacity="0.55" result="colour" />
          <feComposite in="colour" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow halo */}
      <circle
        cx={cx} cy={cy} r={shellR + S * 0.06}
        fill={color}
        opacity={0.18}
      />

      {/* Main circular shell */}
      <circle
        cx={cx} cy={cy} r={shellR}
        fill={`url(#${gradId})`}
        stroke={color}
        strokeWidth={S * 0.055}
        strokeOpacity={0.5}
      />

      {/* Inner subtle sheen */}
      <circle
        cx={cx - S * 0.06} cy={cy - S * 0.1} r={shellR * 0.55}
        fill="white"
        opacity={0.18}
      />

      {/* ── Left eye ── */}
      <ellipse
        cx={leftEyeCX}
        cy={eyeCY}
        rx={lRx}
        ry={lRy}
        fill={eyeFill}
        transform={leftRotate !== 0 ? `rotate(${leftRotate}, ${leftEyeCX}, ${eyeCY})` : undefined}
      />

      {/* ── Right eye ── */}
      <ellipse
        cx={rightEyeCX}
        cy={eyeCY}
        rx={rRx}
        ry={rRy}
        fill={eyeFill}
        transform={rightRotate !== 0 ? `rotate(${rightRotate}, ${rightEyeCX}, ${eyeCY})` : undefined}
      />

      {/* ── Connecting bar ── */}
      <path
        d={barPath}
        stroke={eyeFill}
        strokeWidth={barStrokeW}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
    </svg>
  );
};

export default BaymaxFace;
