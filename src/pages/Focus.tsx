import { useState } from "react";
import Dashboard from "@/components/Dashboard";
import SEO from "@/components/SEO";

const Focus = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);

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
    </>
  );
};

export default Focus;
