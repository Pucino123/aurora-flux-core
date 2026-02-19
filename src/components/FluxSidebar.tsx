import { Home, PanelLeftClose, PanelLeft, LogOut, Users, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import BrainTree from "./BrainTree";
import NotificationBell from "./NotificationBell";
import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { PERSONAS } from "./TheCouncil";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FluxSidebarProps {
  visible: boolean;
  onToggle: () => void;
  onRequestCreateFolder?: () => void;
}

const UserSection = () => {
  const { user, signOut } = useAuth();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  return (
    <div className="px-3 pt-3 border-t border-border/20">
      <div className="flex items-center gap-3 py-1">
        <Avatar className="w-7 h-7">
          <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
            {name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{t("app.plan")}</p>
        </div>
        <button onClick={() => signOut()} className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground hover:text-foreground" title={t("auth.signout")}>
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
};

const NAV_SECTIONS: { key: any; icon: any; label: string }[] = [];

const FluxSidebar = ({ visible, onToggle, onRequestCreateFolder }: FluxSidebarProps) => {
  const { activeView, activeFolder, setActiveView, setActiveFolder, filterPersona, setFilterPersona } = useFlux();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isHomeActive = activeView === "focus" && activeFolder === null;

  return (
    <>
      {!visible && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg glass-panel-hover"
        >
          <PanelLeft size={18} className="text-muted-foreground" />
        </button>
      )}

      <AnimatePresence>
        {visible && (
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-[260px] min-w-[260px] h-screen sidebar-apple flex flex-col py-3 z-30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 mb-3">
              <h1 className="text-base font-semibold text-foreground">{t("app.name")}</h1>
              <div className="flex items-center gap-0.5">
                <NotificationBell />
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground"
                  title="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            </div>

            {/* Home */}
            <div className="px-2 space-y-0.5">
              <button
                onClick={() => { setActiveFolder(null); setActiveView("focus"); }}
                className={`sidebar-item w-full ${isHomeActive ? "sidebar-item-active" : ""}`}
              >
                <Home size={18} className="shrink-0" />
                <span>{t("sidebar.home")}</span>
              </button>

              {/* Council */}
              <button
                onClick={() => { setActiveFolder(null); setActiveView("council"); setFilterPersona(null); }}
                className={`sidebar-item w-full ${activeView === "council" ? "sidebar-item-active" : ""}`}
              >
                <Users size={18} className="shrink-0" />
                <span className="flex-1 text-left">{t("council.nav")}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {PERSONAS.map((p) => (
                    <button
                      key={p.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFolder(null);
                        setActiveView("council");
                        setFilterPersona(filterPersona === p.key ? null : p.key);
                      }}
                      className={`w-[7px] h-[7px] rounded-full transition-all duration-150 hover:scale-150 ${
                        filterPersona === p.key ? "ring-[1.5px] ring-foreground/50 scale-150" : "opacity-50 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={t(p.name)}
                    />
                  ))}
                </div>
              </button>
            </div>

            <div className="sidebar-separator" />

            {/* Folder tree */}
            <nav className="flex-1 overflow-y-auto min-h-0 px-2">
              <BrainTree onRequestCreateFolder={onRequestCreateFolder} />
            </nav>

            <div className="sidebar-separator" />

            {/* Extra nav sections */}
            <div className="px-2 space-y-0.5">
              {NAV_SECTIONS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setActiveFolder(null); setActiveView(item.key); }}
                  className={`sidebar-item w-full ${activeView === item.key ? "sidebar-item-active" : ""}`}
                >
                  <item.icon size={16} className="shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Bottom section */}
            <UserSection />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default FluxSidebar;
