import { Focus, Layers, Users, CalendarDays, MoreHorizontal, BarChart3, Folder, FileText, Settings } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MobileNav = () => {
  const { activeView, setActiveView, setActiveFolder } = useFlux();
  const [moreOpen, setMoreOpen] = useState(false);

  const mainTabs = [
    { icon: Focus, label: "Focus", view: "focus" as const },
    { icon: Layers, label: t("mob.stream"), view: "stream" as const },
    { icon: Users, label: t("council.nav"), view: "council" as const },
    { icon: CalendarDays, label: "Calendar", view: "calendar" as const },
  ];

  const moreTabs = [
    { icon: BarChart3, label: "Analytics", view: "analytics" as const },
    { icon: Folder, label: "Projects", view: "projects" as const },
    { icon: FileText, label: "Documents", view: "documents" as const },
    { icon: Settings, label: "Settings", view: "settings" as const },
  ];

  const isMoreActive = moreTabs.some(t => t.view === activeView);

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-16 left-2 right-2 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 md:hidden shadow-xl"
            >
              <div className="grid grid-cols-4 gap-2">
                {moreTabs.map(tab => (
                  <button
                    key={tab.view}
                    onClick={() => { setActiveFolder(null); setActiveView(tab.view); setMoreOpen(false); }}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-all ${
                      activeView === tab.view ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <tab.icon size={18} />
                    <span className="text-[9px] font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe">
        <div className="bg-background/80 backdrop-blur-2xl border-t border-border px-2 py-2 flex items-center justify-around">
          {mainTabs.map(tab => (
            <button
              key={tab.view}
              onClick={() => { setActiveFolder(null); setActiveView(tab.view); setMoreOpen(false); }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
                activeView === tab.view ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon size={20} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
              isMoreActive || moreOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
