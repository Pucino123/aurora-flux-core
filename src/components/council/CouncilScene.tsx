import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import CouncilAvatar3D from "./CouncilAvatar3D";

interface PersonaData {
  key: string;
  color: string;
  name: string;
  vote?: string;
}

interface CouncilSceneProps {
  personas: PersonaData[];
  speakingPersona: string | null;
  expandedPersona: string | null;
  responses: { personaKey: string; vote?: string }[];
  onSelectPersona: (key: string) => void;
  loading?: boolean;
}

// Wider semicircle with deeper stagger
const SEMICIRCLE_3D: [number, number, number][] = [
  [-3.2, 0, 1.5],    // far left, furthest back
  [-1.6, 0, 0.4],    // left, slightly back
  [0, 0, -0.8],      // center, most forward
  [1.6, 0, 0.4],     // right, slightly back
  [3.2, 0, 1.5],     // far right, furthest back
];

function CameraRig({ mouseRef }: { mouseRef: React.RefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const smoothPos = useRef({ x: 0, y: 2.0 });

  useFrame(() => {
    if (!mouseRef.current) return;
    const targetX = mouseRef.current.x * 0.25;
    const targetY = 2.0 + mouseRef.current.y * 0.12;
    smoothPos.current.x += (targetX - smoothPos.current.x) * 0.02;
    smoothPos.current.y += (targetY - smoothPos.current.y) * 0.02;
    camera.position.x = smoothPos.current.x;
    camera.position.y = smoothPos.current.y;
    camera.lookAt(0, 0.2, 0.3);
  });

  return null;
}

function SceneContent({
  personas,
  speakingPersona,
  expandedPersona,
  responses,
  onSelectPersona,
  hoveredPersona,
  setHoveredPersona,
}: CouncilSceneProps & {
  hoveredPersona: string | null;
  setHoveredPersona: (key: string | null) => void;
}) {
  return (
    <>
      {personas.map((persona, i) => {
        const response = responses.find((r) => r.personaKey === persona.key);
        const pos = SEMICIRCLE_3D[i] || SEMICIRCLE_3D[0];

        const debateTargetX = speakingPersona && speakingPersona !== persona.key
          ? SEMICIRCLE_3D[personas.findIndex(p => p.key === speakingPersona)]?.[0] ?? 0
          : 0;

        return (
          <CouncilAvatar3D
            key={persona.key}
            color={persona.color}
            position={pos}
            personaKey={persona.key}
            isSpeaking={speakingPersona === persona.key}
            isListening={speakingPersona !== null && speakingPersona !== persona.key}
            isDebating={false}
            isActive={expandedPersona === persona.key}
            isHovered={hoveredPersona === persona.key}
            vote={response?.vote}
            entranceDelay={i * 0.25}
            debateTargetX={debateTargetX}
            onClick={() => onSelectPersona(persona.key)}
            onPointerOver={() => setHoveredPersona(persona.key)}
            onPointerOut={() => setHoveredPersona(null)}
          />
        );
      })}

      <ContactShadows
        position={[0, -0.66, 0]}
        opacity={0.25}
        scale={12}
        blur={2.5}
        far={4}
      />

      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 5]} intensity={0.7} />
      <directionalLight position={[-4, 4, -3]} intensity={0.25} color="#c8d8ff" />
      <pointLight position={[0, 3, 3]} intensity={0.2} color="#ffffff" />
      <pointLight position={[0, -1, 2]} intensity={0.3} color="#fff5e6" />

      <Environment preset="studio" />
    </>
  );
}

const CouncilScene = ({
  personas,
  speakingPersona,
  expandedPersona,
  responses,
  onSelectPersona,
  loading = false,
}: CouncilSceneProps) => {
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      style={{ height: 360 }}
    >
      <Canvas
        camera={{ position: [0, 2.0, 6.0], fov: 32 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <CameraRig mouseRef={mouseRef} />
          <SceneContent
            personas={personas}
            speakingPersona={speakingPersona}
            expandedPersona={expandedPersona}
            responses={responses}
            onSelectPersona={onSelectPersona}
            hoveredPersona={hoveredPersona}
            setHoveredPersona={setHoveredPersona}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default CouncilScene;
