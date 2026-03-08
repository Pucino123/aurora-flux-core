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
import { toast } from "sonner";

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

  // Handle invite token from URL
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;
    // Remove token from URL
    window.history.replaceState({}, "", window.location.pathname);
    (async () => {
      const { data: invite } = await (supabase as any)
        .from("team_invites").select("*").eq("token", token).maybeSingle();
      if (!invite) { toast.error("Invite link not found or expired"); return; }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) { toast.error("Invite link has expired"); return; }
      const { data: existing } = await (supabase as any)
        .from("team_members").select("id").eq("team_id", invite.team_id).eq("user_id", user.id).maybeSingle();
      if (existing) { toast.info("You're already a member of this team"); return; }
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const { error } = await (supabase as any).from("team_members").insert({
        team_id: invite.team_id, user_id: user.id, role: "member",
        display_name: (profile as any)?.display_name || user.email?.split("@")[0] || "Member",
      });
      if (error) toast.error("Failed to join team");
      else { const { data: teamData } = await (supabase as any).from("teams").select("name").eq("id", invite.team_id).single();
        toast.success(`Joined team "${(teamData as any)?.name || "team"}"! Open Colab to chat.`); }
    })();
  }, [user]);

  // Show landing when NOT logged in
  useEffect(() => {
    if (!user) {
      setView("landing");
      return;
    }

    // Sync display name to localStorage for greeting widget
    const displayName = user.user_metadata?.display_name;
    if (displayName) {
      const firstName = displayName.split(" ")[0];
      localStorage.setItem("flux-user-name", firstName);
    }

    // Restore saved theme preference
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
    } else if (stored) {
      sessionStorage.removeItem("flux_pending_prompt");
      setPrompt(stored);
    }

    setView("dashboard");
  }, [user]);

  const handleEnter = (text: string) => {
    setPrompt(text);
    setView("dashboard");
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd+K or Cmd+/ → global search palette
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "/")) {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "?") {
      e.preventDefault();
      setShortcutsOpen((prev) => !prev);
    }
    // Cmd+Shift+A → toggle Ask Aura
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "a") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("toggle-aura"));
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
