import { useState } from "react";
import { Home, ListTodo, Layers, Users, CalendarDays, Briefcase, Menu, X, Sun, Moon, CreditCard, Zap, ShieldCheck, Grid } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { useAuth } from "@/hooks/useAuth";
import { useMonetization } from "@/context/MonetizationContext";
import { useTheme } from "next-themes";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_EMAIL = "kevin.therkildsen@icloud.com";

const MobileNav = () => {
  const { activeView, setActiveView, setActiveFolder } = useFlux();
  const { user } = useAuth();
  const { sparksBalance, openBilling } = useMonetization();
  const { theme, setTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const mainTabs = [
    { icon: Home, label: "Home", view: "focus" as const },
    { icon: ListTodo, label: "Tasks", view: "tasks" as const },
    { icon: Users, label: t("council.nav"), view: "council" as const },
    { icon: CalendarDays, label: "Calendar", view: "calendar" as const },
    { icon: Menu, label: "More", view: null as any },
  ];

  const drawerLinks = [
    { icon: ListTodo, label: "Tasks", view: "tasks" as any },
    { icon: Briefcase, label: "CRM", view: "crm" as any },
    { icon: Grid, label: "Community", view: "community" as any },
    { icon: Layers, label: "Workspace", view: "multitask" as any },
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin", view: "community-admin" as any }] : []),
  ];

  const navigate = (view: any) => {
    setActiveFolder(null);
    setActiveView(view);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe">
        <div className="bg-background/85 backdrop-blur-2xl border-t border-border px-1 py-1.5 flex items-center justify-around">
          {mainTabs.map((tab) => {
            if (tab.view === null) {
              return (
                <button
                  key="more"
                  onClick={() => setDrawerOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[44px] min-h-[44px] justify-center text-muted-foreground"
                >
                  <Menu size={20} />
                  <span className="text-[10px] font-medium">More</span>
                </button>
              );
            }
            return (
              <button
                key={tab.view}
                onClick={() => navigate(tab.view)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[44px] min-h-[44px] justify-center ${
                  activeView === tab.view ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-3xl border-t border-border/30 pb-safe overflow-hidden"
              style={{ background: "hsl(var(--card)/0.98)", backdropFilter: "blur(32px)" }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-4 pb-4">
                {/* Header */}
                <div className="flex items-center justify-between py-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{t("app.name")}</span>
                    <button
                      onClick={openBilling}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
                        sparksBalance < 5
                          ? "bg-destructive/10 border-destructive/40 animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                          : "bg-primary/10 border-primary/20"
                      }`}
                    >
                      <Zap size={10} className={sparksBalance < 5 ? "text-destructive" : "text-primary"} />
                      <span className={`text-[10px] font-semibold ${sparksBalance < 5 ? "text-destructive" : "text-primary"}`}>
                        {sparksBalance < 5 ? `⚠ ${sparksBalance}` : `${sparksBalance} ✨`}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="p-2 rounded-xl bg-secondary/60 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="p-2 rounded-xl bg-secondary/60 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Nav links grid */}
                <div className="grid grid-cols-3 gap-2">
                  {drawerLinks.map((link) => (
                    <button
                      key={link.view}
                      onClick={() => navigate(link.view)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all min-h-[72px] justify-center ${
                        activeView === link.view
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-secondary/40 border-border/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <link.icon size={22} />
                      <span className="text-[11px] font-medium">{link.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => { openBilling(); setDrawerOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/20 bg-secondary/40 text-muted-foreground hover:text-foreground transition-all min-h-[72px] justify-center"
                  >
                    <CreditCard size={22} />
                    <span className="text-[11px] font-medium">Billing</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;
