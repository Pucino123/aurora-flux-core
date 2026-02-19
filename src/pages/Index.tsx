import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import AuroraBackground from "../components/AuroraBackground";
import LandingPage from "../components/LandingPage";
import Dashboard from "../components/Dashboard";
import CommandPalette from "../components/CommandPalette";
import KeyboardShortcutsSheet from "../components/KeyboardShortcutsSheet";
import GlobalSearch from "../components/GlobalSearch";
import { useFlux } from "@/context/FluxContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const { loading } = useFlux();
  const { setTheme } = useTheme();

  const [view, setView] = useState<"landing" | "dashboard">("dashboard");
  const [prompt, setPrompt] = useState<string | undefined>();
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync user name + theme on login
  useEffect(() => {
    if (user) {
      // Sync display name to localStorage for greeting widget
      const displayName = user.user_metadata?.display_name;
      if (displayName) {
        const firstName = displayName.split(" ")[0];
        localStorage.setItem("flux-user-name", firstName);
      }

      // Restore saved theme preference (default dark for dashboard)
      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("settings")
          .eq("id", user.id)
          .maybeSingle();
        const settings = data?.settings as Record<string, any> | null;
        const savedTheme = settings?.theme || "dark";
        setTheme(savedTheme);
      })();

      const storedPlan = sessionStorage.getItem("flux_pending_plan");
      const stored = sessionStorage.getItem("flux_pending_prompt");

      if (storedPlan) {
        sessionStorage.removeItem("flux_pending_plan");
        sessionStorage.removeItem("flux_pending_prompt");
        try {
          const plan = JSON.parse(storedPlan);
          setPendingPlan(plan);
          setPrompt(plan.text);
        } catch {}
        setView("dashboard");
      } else if (stored) {
        sessionStorage.removeItem("flux_pending_prompt");
        setPrompt(stored);
        setView("dashboard");
      }
    }
    setView("dashboard");
  }, [user]);

  const handleEnter = (text: string) => {
    setPrompt(text);
    setView("dashboard");
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((prev) => !prev);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "?") {
      e.preventDefault();
      setShortcutsOpen((prev) => !prev);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
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
      <AuroraBackground intensity={view === "dashboard" ? "subtle" : "full"} />
      <AnimatePresence mode="wait">
        {view === "landing" ? (
          <LandingPage key="landing" onEnter={handleEnter} />
        ) : (
          <Dashboard
            key="dashboard"
            initialPrompt={prompt}
            pendingPlan={pendingPlan}
            onPlanConsumed={() => setPendingPlan(null)}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible((v) => !v)}
            focusMode={false}
          />
        )}
      </AnimatePresence>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <KeyboardShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default Index;
