import { useState, useCallback, useEffect } from "react";
import AuroraBackground from "../components/AuroraBackground";
import Dashboard from "../components/Dashboard";
import CommandPalette from "../components/CommandPalette";
import { useFlux } from "@/context/FluxContext";

const Index = () => {
  const { loading } = useFlux();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuroraBackground />
        <div className="relative z-10 animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      <AuroraBackground intensity="subtle" />
      <Dashboard
        key="dashboard"
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        focusMode={false}
      />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
};

export default Index;
