// Baymax-inspired SVG persona face component
import React from "react";

interface BaymaxFaceProps {
  color: string;
  size?: number;
  expression?: "smile" | "straight" | "frown" | "calm" | "wide";
  className?: string;
}

const BaymaxFace: React.FC<BaymaxFaceProps> = ({ color, size = 22, expression = "straight", className = "" }) => {
  const w = size;
  const h = size;
  const cx = w / 2;
  const cy = h / 2;
  const r = (size * 0.18); // eye radius

  // Eye positions
  const leftEyeX = cx - size * 0.22;
  const rightEyeX = cx + size * 0.22;
  const eyeY = cy - size * 0.06;

  // Connecting line variants
  const lineY = cy + size * 0.12;
  let lineD = "";
  if (expression === "smile") {
    lineD = `M ${leftEyeX} ${lineY} Q ${cx} ${lineY + size * 0.14} ${rightEyeX} ${lineY}`;
  } else if (expression === "frown") {
    // Furrowed — eyes angled toward center
    lineD = `M ${leftEyeX} ${lineY} L ${rightEyeX} ${lineY}`;
  } else if (expression === "wide") {
    lineD = `M ${leftEyeX - size * 0.04} ${lineY} Q ${cx} ${lineY + size * 0.16} ${rightEyeX + size * 0.04} ${lineY}`;
  } else {
    lineD = `M ${leftEyeX} ${lineY} L ${rightEyeX} ${lineY}`;
  }

  // Eye size adjustments
  const leftR = expression === "frown" ? r * 0.85 : expression === "wide" ? r * 1.15 : r;
  const rightR = expression === "frown" ? r * 0.85 : expression === "wide" ? r * 1.15 : r;

  // Eye Y offset for frown (furrowed brow effect)
  const leftEyeOffsetY = expression === "frown" ? eyeY + size * 0.04 : eyeY;
  const rightEyeOffsetY = expression === "frown" ? eyeY - size * 0.04 : eyeY;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className={className}
      style={{ filter: `drop-shadow(0 0 ${size * 0.2}px ${color}90)` }}
    >
      {/* Left eye */}
      <circle cx={leftEyeX} cy={leftEyeOffsetY} r={leftR} fill={color} />
      {/* Right eye */}
      <circle cx={rightEyeX} cy={rightEyeOffsetY} r={rightR} fill={color} />
      {/* Connecting line */}
      <path d={lineD} stroke={color} strokeWidth={size * 0.09} strokeLinecap="round" fill="none" />
    </svg>
  );
};

export default BaymaxFace;
