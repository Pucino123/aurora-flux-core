import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CouncilAvatar3DProps {
  color: string;
  position: [number, number, number];
  isSpeaking?: boolean;
  isListening?: boolean;
  isDebating?: boolean;
  isActive?: boolean;
  isHovered?: boolean;
  personaKey?: string;
  vote?: string;
  entranceDelay?: number;
  debateTargetX?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

const PERSONALITY_MOTION: Record<string, { idleSpeed: number; idleAmplitude: number; breathSpeed: number; gestureRange: number }> = {
  strategist: { idleSpeed: 0.4, idleAmplitude: 0.06, breathSpeed: 0.4, gestureRange: 0.12 },
  operator: { idleSpeed: 0.3, idleAmplitude: 0.03, breathSpeed: 0.3, gestureRange: 0.06 },
  skeptic: { idleSpeed: 0.5, idleAmplitude: 0.07, breathSpeed: 0.45, gestureRange: 0.15 },
  advocate: { idleSpeed: 0.25, idleAmplitude: 0.04, breathSpeed: 0.3, gestureRange: 0.08 },
  growth: { idleSpeed: 0.55, idleAmplitude: 0.08, breathSpeed: 0.5, gestureRange: 0.18 },
};

const lerp = (current: number, target: number, factor: number) => current + (target - current) * factor;

const CouncilAvatar3D = ({
  color,
  position,
  isSpeaking = false,
  isListening = false,
  isDebating = false,
  isActive = false,
  isHovered = false,
  personaKey = "strategist",
  vote,
  entranceDelay = 0,
  debateTargetX = 0,
  onClick,
  onPointerOver,
  onPointerOut,
}: CouncilAvatar3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const shirtRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const entranceRef = useRef({ progress: 0, started: false, startTime: 0 });
  const smoothState = useRef({
    headRotX: 0, headRotY: 0,
    leftArmZ: 0.35, rightArmZ: -0.35,
    groupRotX: 0, groupRotY: 0, groupRotZ: 0,
    scale: 0, posY: position[1] - 1,
    emissive: 0.03, glowOpacity: 0.02,
    bodyScaleY: 1,
  });

  // Phase offset per persona for variety
  const phaseOffset = useMemo(() => (personaKey.charCodeAt(0) + personaKey.charCodeAt(1)) * 0.7, [personaKey]);

  const threeColor = useMemo(() => {
    // Convert modern CSS hsl(270 70% 65%) to comma format for THREE.Color
    const fixed = color.replace(/hsl\((\d+)\s+([\d.]+%)\s+([\d.]+%)\)/, 'hsl($1, $2, $3)');
    return new THREE.Color(fixed);
  }, [color]);
  const motion = PERSONALITY_MOTION[personaKey] || PERSONALITY_MOTION.strategist;

  // Skin material — matte white
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf5f0eb,
    roughness: 0.8,
    metalness: 0.02,
  }), []);

  // Colored shirt — semi-gloss with subtle base emissive
  const shirtMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: threeColor,
    roughness: 0.4,
    metalness: 0.05,
    emissive: threeColor,
    emissiveIntensity: 0.08,
    envMapIntensity: 0.6,
  }), [threeColor]);

  // Arms match shirt
  const armMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: threeColor,
    roughness: 0.4,
    metalness: 0.05,
    emissive: threeColor,
    emissiveIntensity: 0.08,
    envMapIntensity: 0.6,
  }), [threeColor]);

  const glowMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: threeColor,
    transparent: true,
    opacity: 0.04,
    emissive: threeColor,
    emissiveIntensity: 0.5,
    roughness: 1,
    metalness: 0,
    side: THREE.BackSide,
  }), [threeColor]);

  // Smoother blending
  const SMOOTH = 0.04;
  const SMOOTH_FAST = 0.08;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime + phaseOffset;
    const s = smoothState.current;

    // ── Entrance animation ──
    const ent = entranceRef.current;
    if (!ent.started) {
      ent.started = true;
      ent.startTime = state.clock.elapsedTime + entranceDelay;
    }
    const entranceElapsed = state.clock.elapsedTime - ent.startTime;
    if (entranceElapsed < 0) {
      groupRef.current.scale.setScalar(0);
      groupRef.current.position.y = position[1] - 1;
      return;
    }
    ent.progress = Math.min(1, entranceElapsed / 1.4);
    const ease = 1 - Math.pow(1 - ent.progress, 4);

    const baseScale = isActive ? 1.1 : isHovered ? 1.04 : 1;
    const targetScale = ease * baseScale;
    s.scale = lerp(s.scale, targetScale, SMOOTH_FAST);
    groupRef.current.scale.setScalar(s.scale);

    const targetPosY = ent.progress < 1
      ? position[1] + (1 - ease) * -0.6
      : position[1] + Math.sin(t * motion.idleSpeed * 1.5) * motion.idleAmplitude * 1.3;
    s.posY = lerp(s.posY, targetPosY, SMOOTH);
    groupRef.current.position.y = s.posY;

    if (ent.progress < 1) return;

    // ── Breathing ──
    const targetBreath = 1 + Math.sin(t * motion.breathSpeed * 1.5) * 0.015;
    s.bodyScaleY = lerp(s.bodyScaleY, targetBreath, SMOOTH);
    if (bodyRef.current) bodyRef.current.scale.set(1, s.bodyScaleY, 1);
    if (shirtRef.current) shirtRef.current.scale.set(1, s.bodyScaleY, 1);

    // ── Body sway (Z-rotation) ──
    let targetSwayZ = Math.sin(t * 0.3) * 0.03;
    if (isSpeaking) targetSwayZ += Math.sin(t * 1.5) * 0.01;
    s.groupRotZ = lerp(s.groupRotZ, targetSwayZ, SMOOTH);

    // ── Head rotation ──
    let targetHeadX = Math.cos(t * 0.2) * 0.02;
    let targetHeadY = Math.sin(t * 0.25) * 0.025;

    if (isSpeaking) {
      targetHeadX = -0.1 + Math.sin(t * 2) * 0.04;
      targetHeadY = Math.sin(t * 1.5) * 0.05;
    } else if (isDebating) {
      const dirToOpponent = Math.sign(debateTargetX - position[0]);
      targetHeadY = dirToOpponent * 0.2 + Math.sin(t * 1.8) * 0.05;
      targetHeadX = -0.12 + Math.sin(t * 2.5) * 0.04;
    } else if (isListening) {
      targetHeadY = -position[0] * 0.04;
      targetHeadX = 0.02;
    }
    if (personaKey === "strategist") targetHeadX -= 0.04;
    if (personaKey === "growth") targetHeadX -= 0.02;

    s.headRotX = lerp(s.headRotX, targetHeadX, SMOOTH);
    s.headRotY = lerp(s.headRotY, targetHeadY, SMOOTH);
    if (headRef.current) {
      headRef.current.rotation.x = s.headRotX;
      headRef.current.rotation.y = s.headRotY;
    }

    // ── Arms ──
    let targetLArm = 0.35 + Math.sin(t * 0.4) * 0.03;
    let targetRArm = -0.35 - Math.sin(t * 0.4) * 0.03;

    if (isSpeaking) {
      targetLArm = 0.3 + Math.sin(t * 2) * motion.gestureRange * 1.2;
      targetRArm = -0.3 + Math.sin(t * 2 + 0.8) * motion.gestureRange * 1.2;
    } else if (isDebating) {
      targetLArm = 0.2 + Math.sin(t * 2.5) * motion.gestureRange * 1.5;
      targetRArm = -0.2 + Math.sin(t * 2.5 + 0.6) * motion.gestureRange * 1.5;
    }

    s.leftArmZ = lerp(s.leftArmZ, targetLArm, SMOOTH);
    s.rightArmZ = lerp(s.rightArmZ, targetRArm, SMOOTH);
    if (leftArmRef.current) leftArmRef.current.rotation.z = s.leftArmZ;
    if (rightArmRef.current) rightArmRef.current.rotation.z = s.rightArmZ;

    // ── Emissive glow ──
    const targetEmissive = isSpeaking ? 0.25 + Math.sin(t * 3) * 0.12
      : isDebating ? 0.35 + Math.sin(t * 4) * 0.15
      : isActive ? 0.12
      : isHovered ? 0.08
      : 0.08;
    s.emissive = lerp(s.emissive, targetEmissive, SMOOTH);
    shirtMaterial.emissiveIntensity = s.emissive;
    armMaterial.emissiveIntensity = s.emissive;

    // ── Outer glow ──
    const targetGlow = isSpeaking ? 0.12 + Math.sin(t * 3) * 0.04
      : isDebating ? 0.15 + Math.sin(t * 4) * 0.05
      : isHovered ? 0.06
      : 0.04;
    s.glowOpacity = lerp(s.glowOpacity, targetGlow, SMOOTH);
    glowMaterial.opacity = s.glowOpacity;

    // ── Group rotation ──
    let targetGroupY = 0;
    let targetGroupX = 0;
    if (isHovered) targetGroupY = 0.08;
    if (isSpeaking) targetGroupX = -0.05;
    if (isDebating) {
      const dir = Math.sign(debateTargetX - position[0]);
      targetGroupY = dir * 0.15;
      targetGroupX = -0.04;
    }
    s.groupRotX = lerp(s.groupRotX, targetGroupX, SMOOTH);
    s.groupRotY = lerp(s.groupRotY, targetGroupY, SMOOTH);
    groupRef.current.rotation.x = s.groupRotX;
    groupRef.current.rotation.y = s.groupRotY;
    groupRef.current.rotation.z = s.groupRotZ;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(); document.body.style.cursor = "pointer"; }}
      onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.(); document.body.style.cursor = "auto"; }}
    >
      {/* Outer glow — always subtly visible */}
      <mesh ref={glowRef} scale={1.8}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>

      {/* Main body / shirt — prominent colored ellipsoid */}
      <mesh ref={shirtRef} position={[0, -0.18, 0]} scale={[1.2, 1.3, 1.0]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <primitive object={shirtMaterial} attach="material" />
      </mesh>

      {/* Neck connector — thin, skin */}
      <mesh ref={bodyRef} position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <primitive object={skinMaterial} attach="material" />
      </mesh>

      {/* Head — round, skin, no face */}
      <group ref={headRef} position={[0, 0.48, 0]}>
        <mesh>
          <sphereGeometry args={[0.24, 32, 32]} />
          <primitive object={skinMaterial} attach="material" />
        </mesh>
      </group>

      {/* Left arm */}
      <mesh ref={leftArmRef} position={[-0.52, -0.08, 0]}>
        <capsuleGeometry args={[0.10, 0.28, 8, 16]} />
        <primitive object={armMaterial} attach="material" />
      </mesh>

      {/* Right arm */}
      <mesh ref={rightArmRef} position={[0.52, -0.08, 0]}>
        <capsuleGeometry args={[0.10, 0.28, 8, 16]} />
        <primitive object={armMaterial} attach="material" />
      </mesh>

      {/* Ground shadow */}
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshStandardMaterial
          color={0x000000}
          transparent
          opacity={isActive ? 0.2 : 0.1}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  );
};

export default CouncilAvatar3D;
