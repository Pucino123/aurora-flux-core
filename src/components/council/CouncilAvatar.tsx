import { motion } from "framer-motion";

interface CouncilAvatarProps {
  color: string;
  vote?: string;
  isSpeaking?: boolean;
  isDebating?: boolean;
  size?: number;
  onClick?: () => void;
  /** 0-4, gives each persona a unique idle animation personality */
  personalityIndex?: number;
}

const CouncilAvatar = ({ color, vote, isSpeaking = false, isDebating = false, size = 64, onClick, personalityIndex }: CouncilAvatarProps) => {
  const pi = personalityIndex ?? 0;

  const getMouthPath = () => {
    switch (vote) {
      case "GO": return `M ${size * 0.35} ${size * 0.62} Q ${size * 0.5} ${size * 0.72} ${size * 0.65} ${size * 0.62}`;
      case "EXPERIMENT": return `M ${size * 0.38} ${size * 0.65} L ${size * 0.62} ${size * 0.65}`;
      case "PIVOT": return `M ${size * 0.38} ${size * 0.67} Q ${size * 0.5} ${size * 0.63} ${size * 0.62} ${size * 0.67}`;
      case "KILL": return `M ${size * 0.35} ${size * 0.7} Q ${size * 0.5} ${size * 0.6} ${size * 0.65} ${size * 0.7}`;
      default: return `M ${size * 0.38} ${size * 0.65} L ${size * 0.62} ${size * 0.65}`;
    }
  };

  // Unique idle animations per personality
  const getIdleAnimation = () => {
    switch (pi) {
      case 0: // Strategist — slow contemplative sway
        return { y: [0, -3, 0], rotate: [-1, 1, -1], scale: [1, 1.02, 1] };
      case 1: // Operator — subtle side-to-side weight shift
        return { x: [-1.5, 1.5, -1.5], y: [0, -1, 0], scale: [1, 1.01, 1] };
      case 2: // Skeptic — restless fidget, arms-crossed energy
        return { rotate: [-2, 0, 2, 0, -2], y: [0, -1, 0, -0.5, 0], scale: [1, 1.01, 1] };
      case 3: // Analyst — head tilt, looking at data
        return { rotate: [0, -3, 0, 3, 0], y: [0, -1.5, 0] };
      case 4: // Optimist — bouncy energy
        return { y: [0, -4, 0, -2, 0], scale: [1, 1.03, 1, 1.01, 1] };
      default:
        return { y: [0, -2, 0], scale: [1, 1.01, 1] };
    }
  };

  const getIdleTransition = () => {
    const durations = [3.5, 4, 2.8, 3.2, 2.5];
    return { duration: durations[pi] || 3, repeat: Infinity, ease: "easeInOut" as const };
  };

  const getBodyAnimation = () => {
    if (isDebating) return { scale: [1, 1.06, 1], rotate: [-3, 3, -3, 0], y: [0, -3, 0] };
    if (isSpeaking) return { scale: [1, 1.05, 1], y: [0, -2, 0] };
    switch (vote) {
      case "GO": return { y: [0, -4, 0], scale: [1, 1.03, 1] };
      case "KILL": return { x: [-1, 1, -1, 0], y: [0, -1, 0] };
      case "EXPERIMENT": return { rotate: [-2, 2, -2, 0], y: [0, -1, 0] };
      case "PIVOT": return { y: [0, -1, 0] };
      default: return getIdleAnimation();
    }
  };

  const getBodyTransition = () => {
    if (isDebating) return { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const };
    if (isSpeaking) return { duration: 0.6, repeat: Infinity };
    switch (vote) {
      case "GO": return { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const };
      case "KILL": return { duration: 0.4, repeat: Infinity, repeatDelay: 1.5 };
      case "EXPERIMENT": return { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const };
      default: return getIdleTransition();
    }
  };

  const getEyeSize = () => {
    switch (vote) {
      case "GO": return size * 0.03;
      case "KILL": return size * 0.02;
      default: return size * 0.025;
    }
  };

  // Unique idle arm animations per personality
  const getLeftArmIdle = () => {
    switch (pi) {
      case 0: return { rotate: [0, -8, 0], y: [0, -1, 0] }; // stroking chin
      case 1: return { rotate: [0, -3, 0] }; // steady
      case 2: return { rotate: [-5, 5, -5], y: [0, -2, 0] }; // fidgeting
      case 3: return { rotate: [0, -12, 0, -12, 0] }; // scratching head
      case 4: return { rotate: [-8, 8, -8], y: [0, -4, 0] }; // waving
      default: return { rotate: [0, -2, 0] };
    }
  };

  const getRightArmIdle = () => {
    switch (pi) {
      case 0: return { rotate: [0, 3, 0] }; // calm
      case 1: return { rotate: [0, 5, 0, 5, 0] }; // tapping
      case 2: return { rotate: [5, -5, 5] }; // crossed arms vibe
      case 3: return { rotate: [0, 8, 0] }; // pointing at data
      case 4: return { rotate: [8, -8, 8], y: [0, -3, 0] }; // waving other arm
      default: return { rotate: [0, 2, 0] };
    }
  };

  const blinkAnimation = { scaleY: [1, 0.1, 1] };
  const blinkTransition = {
    duration: 0.2,
    repeat: Infinity,
    repeatDelay: 3 + (pi * 0.7),
    ease: "easeInOut" as const,
  };

  // Idle eye movement for personality
  const getEyeIdleAnimation = () => {
    if (isSpeaking || isDebating || vote) return {};
    switch (pi) {
      case 3: return { cx: [size * 0.43, size * 0.44, size * 0.42, size * 0.43] }; // looking around (analyst)
      case 2: return { cy: [size * 0.33, size * 0.32, size * 0.33] }; // suspicious glance up (skeptic)
      default: return {};
    }
  };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      animate={getBodyAnimation()}
      transition={getBodyTransition()}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : ""}
      style={{ filter: onClick ? "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.08))" }}
    >
      {/* Glow ring for speaking/debating */}
      {(isSpeaking || isDebating) && (
        <motion.circle
          cx={size * 0.5} cy={size * 0.5} r={size * 0.46}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.3}
          animate={{ r: [size * 0.46, size * 0.48, size * 0.46], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Body */}
      <ellipse cx={size * 0.5} cy={size * 0.55} rx={size * 0.35} ry={size * 0.4} fill={color} opacity={0.9} />
      {/* Head */}
      <circle cx={size * 0.5} cy={size * 0.32} r={size * 0.22} fill={color} />
      {/* Face plate */}
      <ellipse cx={size * 0.5} cy={size * 0.35} rx={size * 0.16} ry={size * 0.14} fill="white" opacity={0.95} />

      {/* Eyes with blinking + idle eye movement */}
      <motion.circle
        cx={size * 0.43} cy={size * 0.33} r={getEyeSize()} fill="#333"
        animate={{ ...blinkAnimation, ...getEyeIdleAnimation() }}
        transition={{ ...blinkTransition }}
      />
      <motion.circle
        cx={size * 0.57} cy={size * 0.33} r={getEyeSize()} fill="#333"
        animate={blinkAnimation}
        transition={{ ...blinkTransition, repeatDelay: 3.1 + (pi * 0.5) }}
      />
      {/* Eye connector */}
      <line x1={size * 0.43} y1={size * 0.33} x2={size * 0.57} y2={size * 0.33} stroke="#333" strokeWidth={1} opacity={0.3} />

      {/* Cheek blush for GO */}
      {vote === "GO" && (
        <>
          <circle cx={size * 0.35} cy={size * 0.4} r={size * 0.035} fill={color} opacity={0.5} />
          <circle cx={size * 0.65} cy={size * 0.4} r={size * 0.035} fill={color} opacity={0.5} />
        </>
      )}
      {/* Sweat drop for KILL */}
      {vote === "KILL" && (
        <motion.ellipse
          cx={size * 0.7} cy={size * 0.28} rx={size * 0.015} ry={size * 0.025}
          fill="hsl(217 90% 80%)" opacity={0.7}
          animate={{ y: [0, size * 0.03, 0], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {/* Thinking dots for EXPERIMENT or idle Analyst */}
      {(vote === "EXPERIMENT" || (!vote && !isSpeaking && pi === 3)) && (
        <motion.g animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <circle cx={size * 0.72} cy={size * 0.22} r={size * 0.01} fill={color} opacity={0.4} />
          <circle cx={size * 0.76} cy={size * 0.18} r={size * 0.013} fill={color} opacity={0.3} />
          <circle cx={size * 0.8} cy={size * 0.14} r={size * 0.016} fill={color} opacity={0.2} />
        </motion.g>
      )}

      {/* Idle sparkles for Optimist */}
      {!vote && !isSpeaking && !isDebating && pi === 4 && (
        <motion.g animate={{ opacity: [0, 0.6, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}>
          <circle cx={size * 0.25} cy={size * 0.2} r={size * 0.008} fill="hsl(45 90% 70%)" />
          <circle cx={size * 0.75} cy={size * 0.15} r={size * 0.006} fill="hsl(45 90% 70%)" />
          <circle cx={size * 0.68} cy={size * 0.25} r={size * 0.007} fill="hsl(45 90% 70%)" />
        </motion.g>
      )}

      {/* Mouth */}
      <motion.path
        d={getMouthPath()} stroke="#333" strokeWidth={1.5} fill="none" strokeLinecap="round"
        animate={isSpeaking ? { opacity: [1, 0.5, 1], d: [getMouthPath(), `M ${size * 0.4} ${size * 0.65} Q ${size * 0.5} ${size * 0.68} ${size * 0.6} ${size * 0.65}`, getMouthPath()] } : {}}
        transition={isSpeaking ? { duration: 0.3, repeat: Infinity } : {}}
      />

      {/* Arms with personality idle animations */}
      <motion.ellipse
        cx={size * 0.18} cy={size * 0.6} rx={size * 0.06} ry={size * 0.12}
        fill={color} opacity={0.8}
        animate={
          isDebating ? { rotate: [-15, 15, -15], y: [0, -3, 0] } :
          isSpeaking ? { rotate: [-10, 10, -10] } :
          vote === "GO" ? { rotate: [-5, 5, -5] } :
          getLeftArmIdle()
        }
        transition={
          isDebating ? { duration: 0.4, repeat: Infinity } :
          isSpeaking ? { duration: 0.6, repeat: Infinity } :
          getIdleTransition()
        }
      />
      <motion.ellipse
        cx={size * 0.82} cy={size * 0.6} rx={size * 0.06} ry={size * 0.12}
        fill={color} opacity={0.8}
        animate={
          isDebating ? { rotate: [15, -15, 15], y: [0, -3, 0] } :
          isSpeaking ? { rotate: [10, -10, 10] } :
          vote === "GO" ? { rotate: [5, -5, 5] } :
          getRightArmIdle()
        }
        transition={
          isDebating ? { duration: 0.4, repeat: Infinity } :
          isSpeaking ? { duration: 0.6, repeat: Infinity } :
          getIdleTransition()
        }
      />
    </motion.svg>
  );
};

export default CouncilAvatar;
