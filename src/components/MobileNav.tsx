import { Focus, Layers, Users, CalendarDays } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";

const MobileNav = () => {
  const { activeView, setActiveView, setActiveFolder } = useFlux();
  const mainTabs = [
    { icon: Focus, label: "Focus", view: "focus" as const },
    { icon: Layers, label: t("mob.stream"), view: "stream" as const },
    { icon: Users, label: t("council.nav"), view: "council" as const },
    { icon: CalendarDays, label: "Calendar", view: "calendar" as const },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe">
      <div className="bg-background/80 backdrop-blur-2xl border-t border-border px-2 py-2 flex items-center justify-around">
        {mainTabs.map(tab => (
          <button
            key={tab.view}
            onClick={() => { setActiveFolder(null); setActiveView(tab.view); }}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
              activeView === tab.view ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
