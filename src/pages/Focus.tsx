import FocusDashboardView from "@/components/focus/FocusDashboardView";
import SEO from "@/components/SEO";

const Focus = () => {
  return (
    <>
      <SEO
        title="Focus Mode"
        description="Enter deep work mode with ambient soundscapes, timers, and a distraction-free workspace."
        url="/focus"
        keywords="focus mode, deep work, pomodoro timer, ambient sounds, productivity"
      />
      <FocusDashboardView />
    </>
  );
};

export default Focus;
