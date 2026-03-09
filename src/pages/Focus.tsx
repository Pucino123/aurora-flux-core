import { useState, useEffect, lazy, Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import SEO from "@/components/SEO";

const SettingsModal = lazy(() => import("@/components/settings/SettingsModal"));

const Focus = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("open-settings", handler);
    return () => window.removeEventListener("open-settings", handler);
  }, []);

  return (
    <>
      <SEO
        title="Focus Mode"
        description="Enter deep work mode with ambient soundscapes, timers, and a distraction-free workspace."
        url="/focus"
        keywords="focus mode, deep work, pomodoro timer, ambient sounds, productivity"
      />
      <Dashboard
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        focusMode={false}
      />
      <Suspense fallback={null}>
        {settingsOpen && <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
      </Suspense>
    </>
  );
};

export default Focus;
