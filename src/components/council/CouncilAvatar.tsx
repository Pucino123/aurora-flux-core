import { motion } from "framer-motion";

// Map persona key to a canonical expression
export type PersonaExpression = "smile" | "straight" | "frown" | "analytical" | "wide-smile";

const PERSONA_EXPRESSIONS: Record<string, PersonaExpression> = {
  strategist: "analytical",
  operator: "straight",
  skeptic: "frown",
  advocate: "smile",
  growth: "wide-smile",
};

// Vote → expression override
const VOTE_EXPRESSIONS: Record<string, PersonaExpression> = {
  GO: "wide-smile",
  EXPERIMENT: "smile",
  PIVOT: "straight",
  KILL: "frown",
};

interface CouncilAvatarProps {
  color: string;
  vote?: string;
  isSpeaking?: boolean;
  isDebating?: boolean;
  size?: number;
  onClick?: () => void;
  personalityIndex?: number;
  personaKey?: string;
}

const CouncilAvatar = ({
  color,
  vote,
  isSpeaking = false,
  isDebating = false,
  size = 64,
  onClick,
  personalityIndex,
  personaKey,
}: CouncilAvatarProps) => {
  const pi = personalityIndex ?? 0;
  const S = size;
  const cx = S / 2;
  const cy = S / 2;

  // ── Choose expression ──
  const expression: PersonaExpression = vote
    ? VOTE_EXPRESSIONS[vote] ?? "straight"
    : personaKey
    ? PERSONA_EXPRESSIONS[personaKey] ?? "straight"
    : "straight";

  // ── Eye geometry ──
  const baseSpread = S * 0.195;
  const eyeRx = S * 0.075;
  const eyeRy = S * 0.115;
  const eyeCY = cy - S * 0.04;
  let leftEyeCX = cx - baseSpread;
  let rightEyeCX = cx + baseSpread;
  let lRx = eyeRx, lRy = eyeRy, rRx = eyeRx, rRy = eyeRy;
  let leftRotate = 0, rightRotate = 0;
  let barPath = "";
  const barY = eyeCY;

  switch (expression) {
    case "smile":
      barPath = `M ${leftEyeCX} ${barY + S * 0.02} Q ${cx} ${barY + S * 0.12} ${rightEyeCX} ${barY + S * 0.02}`;
      break;
    case "wide-smile":
      leftEyeCX  = cx - baseSpread * 1.12;
      rightEyeCX = cx + baseSpread * 1.12;
      lRx = rRx = eyeRx * 1.1;
      lRy = rRy = eyeRy * 0.85; // squinting with joy
      barPath = `M ${leftEyeCX} ${barY + S * 0.02} Q ${cx} ${barY + S * 0.18} ${rightEyeCX} ${barY + S * 0.02}`;
      break;
    case "analytical":
      leftEyeCX  = cx - baseSpread * 0.82;
      rightEyeCX = cx + baseSpread * 0.82;
      barPath = `M ${leftEyeCX} ${barY} L ${rightEyeCX} ${barY}`;
      break;
    case "frown":
      // No eye rotation — just squint eyes closer together and draw a clear downward frown (∩ shape)
      leftEyeCX  = cx - baseSpread * 0.80;
      rightEyeCX = cx + baseSpread * 0.80;
      lRy = rRy = eyeRy * 0.72; // squinted / narrowed eyes
      // Frown bar: endpoints at bottom, control point far above = ∩ = sad mouth
      barPath = `M ${leftEyeCX - S * 0.01} ${barY + S * 0.14} Q ${cx} ${barY - S * 0.10} ${rightEyeCX + S * 0.01} ${barY + S * 0.14}`;
      break;
    case "straight":
    default:
      barPath = `M ${leftEyeCX} ${barY} L ${rightEyeCX} ${barY}`;
  }

  const barStrokeW = Math.max(0.8, S * 0.045);
  const eyeFill = "#0f172a";

  // ── Circle shell ──
  const shellR = S * 0.46;
  const gradId = `ca-grad-${color.replace(/[^a-z0-9]/gi, "")}-${S}`;
  const glowId = `ca-glow-${color.replace(/[^a-z0-9]/gi, "")}-${S}`;

  // ── Animation timings ──
  const breathDurations = [4.2, 3.6, 3.0, 3.8, 2.8];
  const blinkDelays     = [3.5, 4.2, 2.8, 5.0, 3.1];
  const auraDurations   = [3.0, 2.6, 2.2, 3.4, 2.0];

  // Body motion while speaking / debating / voting
  const getBodyAnimation = () => {
    if (isDebating) return { scale: [1, 1.06, 1], rotate: [-3, 3, -3, 0], y: [0, -3, 0] };
    if (isSpeaking) return { scale: [1, 1.05, 1], y: [0, -2, 0] };
    switch (vote) {
      case "GO":   return { y: [0, -4, 0], scale: [1, 1.03, 1] };
      case "KILL": return { x: [-1, 1, -1, 0], y: [0, -1, 0] };
      default:     return {};
    }
  };

  const getBodyTransition = () => {
    if (isDebating) return { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const };
    if (isSpeaking) return { duration: 0.6, repeat: Infinity };
    if (vote === "GO")   return { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const };
    if (vote === "KILL") return { duration: 0.4, repeat: Infinity, repeatDelay: 1.5 };
    return {};
  };

  const blinkAnim = { scaleY: [1, 1, 1, 0.08, 1] };
  const blinkTransition = {
    duration: 0.25,
    repeat: Infinity,
    repeatDelay: blinkDelays[pi] || 3.5,
    ease: "easeInOut" as const,
    times: [0, 0.7, 0.9, 0.95, 1],
  };

  const svgContent = (
    <svg
      width={S} height={S} viewBox={`0 0 ${S} ${S}`}
      fill="none" xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="65%"  stopColor="#f0f0f2" stopOpacity="1" />
          <stop offset="100%" stopColor={color}   stopOpacity="0.18" />
        </radialGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={S * 0.08} result="blur" />
          <feFlood floodColor={color} floodOpacity="0.55" result="colour" />
          <feComposite in="colour" in2="blur" operator="in" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Pulsing aura halo */}
      <motion.circle
        cx={cx} cy={cy} r={shellR + S * 0.06}
        fill={color}
        animate={{ opacity: [0.14, 0.28, 0.14], r: [shellR + S * 0.04, shellR + S * 0.10, shellR + S * 0.04] }}
        transition={{ duration: auraDurations[pi] || 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Shell */}
      <circle cx={cx} cy={cy} r={shellR} fill={`url(#${gradId})`} stroke={color} strokeWidth={S * 0.055} strokeOpacity={0.5} />
      <circle cx={cx - S * 0.06} cy={cy - S * 0.1} r={shellR * 0.55} fill="white" opacity={0.18} />

      {/* Left eye */}
      <motion.ellipse
        cx={leftEyeCX} cy={eyeCY} rx={lRx} ry={lRy} fill={eyeFill}
        transform={leftRotate !== 0 ? `rotate(${leftRotate}, ${leftEyeCX}, ${eyeCY})` : undefined}
        animate={blinkAnim}
        transition={blinkTransition}
        style={{ transformOrigin: `${leftEyeCX}px ${eyeCY}px` }}
        whileHover={{ scaleY: 1.15, scaleX: 1.12 }}
      />

      {/* Right eye */}
      <motion.ellipse
        cx={rightEyeCX} cy={eyeCY} rx={rRx} ry={rRy} fill={eyeFill}
        transform={rightRotate !== 0 ? `rotate(${rightRotate}, ${rightEyeCX}, ${eyeCY})` : undefined}
        animate={blinkAnim}
        transition={{ ...blinkTransition, repeatDelay: (blinkDelays[pi] || 3.5) + 0.08 }}
        style={{ transformOrigin: `${rightEyeCX}px ${eyeCY}px` }}
        whileHover={{ scaleY: 1.15, scaleX: 1.12 }}
      />

      {/* Connecting bar / mouth */}
      <path d={barPath} stroke={eyeFill} strokeWidth={barStrokeW} strokeLinecap="round" fill="none" opacity={0.85} />

      {/* Speaking mouth twitch */}
      {isSpeaking && (
        <motion.path
          d={barPath} stroke={eyeFill} strokeWidth={barStrokeW} strokeLinecap="round" fill="none"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      )}

      {/* Cheek blush for GO */}
      {vote === "GO" && (
        <>
          <circle cx={cx - S * 0.15} cy={eyeCY + S * 0.08} r={S * 0.035} fill={color} opacity={0.4} />
          <circle cx={cx + S * 0.15} cy={eyeCY + S * 0.08} r={S * 0.035} fill={color} opacity={0.4} />
        </>
      )}
      {/* Sweat drop for KILL */}
      {vote === "KILL" && (
        <motion.ellipse
          cx={S * 0.7} cy={S * 0.28} rx={S * 0.015} ry={S * 0.025}
          fill="hsl(217 90% 80%)" opacity={0.7}
          animate={{ y: [0, S * 0.03, 0], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {/* Thinking dots for analytical/skeptic */}
      {(!vote && !isSpeaking && (expression === "analytical" || expression === "frown")) && (
        <motion.g animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
          <circle cx={S * 0.72} cy={S * 0.22} r={S * 0.01} fill={color} opacity={0.5} />
          <circle cx={S * 0.76} cy={S * 0.17} r={S * 0.013} fill={color} opacity={0.35} />
          <circle cx={S * 0.80} cy={S * 0.13} r={S * 0.016} fill={color} opacity={0.2} />
        </motion.g>
      )}
      {/* Idle sparkles for growth/optimist */}
      {!vote && !isSpeaking && !isDebating && expression === "wide-smile" && (
        <motion.g animate={{ opacity: [0, 0.7, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}>
          <circle cx={S * 0.25} cy={S * 0.2} r={S * 0.008} fill="hsl(45 90% 70%)" />
          <circle cx={S * 0.75} cy={S * 0.15} r={S * 0.006} fill="hsl(45 90% 70%)" />
          <circle cx={S * 0.68} cy={S * 0.25} r={S * 0.007} fill="hsl(45 90% 70%)" />
        </motion.g>
      )}
    </svg>
  );

  return (
    <motion.div
      style={{ display: "inline-flex", position: "relative", cursor: onClick ? "pointer" : "default" }}
      whileHover={{ scale: 1.15, filter: "brightness(1.3)" }}
      onClick={onClick}
    >
      {/* Static aura — no pulse */}
      <div
        style={{
          position: "absolute",
          inset: -S * 0.12,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={getBodyAnimation()}
        transition={getBodyTransition()}
        style={{ position: "relative", zIndex: 1 }}
      >
        {svgContent}
      </motion.div>
    </motion.div>
  );
};

export default CouncilAvatar;
