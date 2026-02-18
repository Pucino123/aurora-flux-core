interface AuroraBackgroundProps {
  intensity?: "full" | "subtle";
}

const AuroraBackground = ({ intensity = "full" }: AuroraBackgroundProps) => {
  const opBlue = intensity === "subtle" ? "0.08" : "0.18";
  const opPink = intensity === "subtle" ? "0.06" : "0.15";
  const opViolet = intensity === "subtle" ? "0.05" : "0.12";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-[10vh] -left-[5vw] w-[70vw] h-[70vh] rounded-full blur-[150px] animate-aurora-1`} style={{ background: `hsl(var(--aurora-blue) / ${opBlue})` }} />
      <div className={`absolute -bottom-[10vh] -right-[5vw] w-[65vw] h-[65vh] rounded-full blur-[150px] animate-aurora-2`} style={{ background: `hsl(var(--aurora-pink) / ${opPink})` }} />
      <div className={`absolute top-1/4 left-1/4 w-[50vw] h-[50vh] rounded-full blur-[150px] animate-aurora-3`} style={{ background: `hsl(var(--aurora-violet) / ${opViolet})` }} />
      <div className="absolute inset-0 bg-[hsl(var(--background)/0.2)]" />
      {/* Vignette — darkened edges fading to center */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.6) 100%)',
      }} />
    </div>
  );
};

export default AuroraBackground;
