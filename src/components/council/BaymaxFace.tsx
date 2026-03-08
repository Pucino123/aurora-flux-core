/**
 * BaymaxFace — precision SVG component matching the canonical Baymax face.
 * With continuous idle breathing, blinking, and pulsing aura (framer-motion).
 */
import React from "react";
import { motion } from "framer-motion";

export type BaymaxExpression = "smile" | "straight" | "frown" | "analytical" | "wide-smile";

interface BaymaxFaceProps {
  /** Accent / glow colour for the circular background shell */
  color: string;
  /** Overall rendered size in px (width = height) */
  size?: number;
  /** Expression variant */
  expression?: BaymaxExpression;
  className?: string;
  /** Extra CSS style on the root element */
  style?: React.CSSProperties;
  /** 0–4 personalityIndex for unique animation timing */
  personalityIndex?: number;
  /** Disable animations (e.g. tiny sidebar chips) */
  static?: boolean;
}

const BaymaxFace: React.FC<BaymaxFaceProps> = ({
  color,
  size = 22,
  expression = "straight",
  className = "",
  style,
  personalityIndex = 0,
  static: isStatic = false,
}) => {
  const S = size;
  const cx = S / 2;
  const cy = S / 2;

  /* ── Circle shell ── */
  const shellR = S * 0.46;
  const gradId = `bf-grad-${color.replace(/[^a-z0-9]/gi, "")}-${S}`;
  const glowId = `bf-glow-${color.replace(/[^a-z0-9]/gi, "")}-${S}`;

  /* ── Eye geometry ── */
  const baseSpread  = S * 0.195;
  const eyeRx       = S * 0.075;
  const eyeRy       = S * 0.115;
  const eyeCY       = cy - S * 0.04;

  let leftEyeCX  = cx - baseSpread;
  let rightEyeCX = cx + baseSpread;
  let lRx = eyeRx, lRy = eyeRy, rRx = eyeRx, rRy = eyeRy;
  let leftRotate  = 0;
  let rightRotate = 0;
  const barY = eyeCY;
  let barPath = "";

  switch (expression) {
    case "smile": {
      barPath = `M ${leftEyeCX} ${barY + S * 0.02} Q ${cx} ${barY + S * 0.12} ${rightEyeCX} ${barY + S * 0.02}`;
      break;
    }
    case "wide-smile": {
      leftEyeCX  = cx - baseSpread * 1.12;
      rightEyeCX = cx + baseSpread * 1.12;
      lRx = rRx = eyeRx * 1.1;
      lRy = rRy = eyeRy * 1.1;
      barPath = `M ${leftEyeCX} ${barY + S * 0.02} Q ${cx} ${barY + S * 0.18} ${rightEyeCX} ${barY + S * 0.02}`;
      break;
    }
    case "analytical": {
      leftEyeCX  = cx - baseSpread * 0.82;
      rightEyeCX = cx + baseSpread * 0.82;
      barPath = `M ${leftEyeCX} ${barY} L ${rightEyeCX} ${barY}`;
      break;
    }
    case "frown": {
      leftRotate  = 20;
      rightRotate = -20;
      leftEyeCX  = cx - baseSpread * 0.88;
      rightEyeCX = cx + baseSpread * 0.88;
      // Frown in SVG: endpoints at eye-level, control point BELOW → arc sags down = sad drooping mouth
      barPath = `M ${leftEyeCX} ${barY} Q ${cx} ${barY + S * 0.18} ${rightEyeCX} ${barY}`;
      break;
    }
    case "straight":
    default: {
      barPath = `M ${leftEyeCX} ${barY} L ${rightEyeCX} ${barY}`;
      break;
    }
  }

  const barStrokeW = Math.max(0.8, S * 0.045);
  const eyeFill    = "#0f172a";

  // ── Animation timings per personality ──
  const breathDurations = [4.2, 3.6, 3.0, 3.8, 2.8];
  const blinkDelays     = [3.5, 4.2, 2.8, 5.0, 3.1];
  const auraDurations   = [3.0, 2.6, 2.2, 3.4, 2.0];
  const pi = personalityIndex ?? 0;

  // Only animate if size > 18 (don't animate tiny sidebar chips)
  const shouldAnimate = !isStatic && S > 18;

  const svgContent = (
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
        <radialGradient id={gradId} cx="42%" cy="38%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%"  stopColor="#f5f5f7" stopOpacity="1" />
          <stop offset="100%" stopColor={color}   stopOpacity="0.25" />
        </radialGradient>
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

      {/* Static aura halo — no pulse */}
      <circle cx={cx} cy={cy} r={shellR + S * 0.06} fill={color} opacity={0.15} />

      {/* Main circular shell */}
      <circle
        cx={cx} cy={cy} r={shellR}
        fill={`url(#${gradId})`}
        stroke={color}
        strokeWidth={S * 0.055}
        strokeOpacity={0.5}
      />

      {/* Inner subtle sheen */}
      <circle cx={cx - S * 0.06} cy={cy - S * 0.1} r={shellR * 0.55} fill="white" opacity={0.18} />

      {/* ── Left eye with blink ── */}
      {shouldAnimate ? (
        <motion.ellipse
          cx={leftEyeCX}
          cy={eyeCY}
          rx={lRx}
          ry={lRy}
          fill={eyeFill}
          transform={leftRotate !== 0 ? `rotate(${leftRotate}, ${leftEyeCX}, ${eyeCY})` : undefined}
          animate={{ scaleY: [1, 1, 1, 0.08, 1] }}
          transition={{
            duration: 0.25,
            repeat: Infinity,
            repeatDelay: blinkDelays[pi] || 3.5,
            ease: "easeInOut",
            times: [0, 0.7, 0.9, 0.95, 1],
          }}
          style={{ transformOrigin: `${leftEyeCX}px ${eyeCY}px` }}
          whileHover={{ scaleY: 1.15, scaleX: 1.12 }}
        />
      ) : (
        <ellipse
          cx={leftEyeCX} cy={eyeCY} rx={lRx} ry={lRy} fill={eyeFill}
          transform={leftRotate !== 0 ? `rotate(${leftRotate}, ${leftEyeCX}, ${eyeCY})` : undefined}
        />
      )}

      {/* ── Right eye with blink (slightly offset timing) ── */}
      {shouldAnimate ? (
        <motion.ellipse
          cx={rightEyeCX}
          cy={eyeCY}
          rx={rRx}
          ry={rRy}
          fill={eyeFill}
          transform={rightRotate !== 0 ? `rotate(${rightRotate}, ${rightEyeCX}, ${eyeCY})` : undefined}
          animate={{ scaleY: [1, 1, 1, 0.08, 1] }}
          transition={{
            duration: 0.25,
            repeat: Infinity,
            repeatDelay: (blinkDelays[pi] || 3.5) + 0.08,
            ease: "easeInOut",
            times: [0, 0.7, 0.9, 0.95, 1],
          }}
          style={{ transformOrigin: `${rightEyeCX}px ${eyeCY}px` }}
          whileHover={{ scaleY: 1.15, scaleX: 1.12 }}
        />
      ) : (
        <ellipse
          cx={rightEyeCX} cy={eyeCY} rx={rRx} ry={rRy} fill={eyeFill}
          transform={rightRotate !== 0 ? `rotate(${rightRotate}, ${rightEyeCX}, ${eyeCY})` : undefined}
        />
      )}

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

  if (!shouldAnimate) return svgContent;

  return (
    <motion.div
      style={{ display: "inline-flex" }}
      whileHover={{ scale: 1.15, filter: "brightness(1.3)" }}
    >
      {svgContent}
    </motion.div>
  );
};

export default BaymaxFace;
