import { Home, PanelLeftClose, PanelLeft, LogOut, Users, Sun, Moon, CalendarDays, ListTodo, Camera, Layers, Grid, CreditCard, Zap, ShieldCheck, Briefcase, Settings } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import BrainTree from "./BrainTree";
import NotificationBell from "./NotificationBell";
import { useFlux } from "@/context/FluxContext";
import { useMonetization } from "@/context/MonetizationContext";
import { t } from "@/lib/i18n";
import { PERSONAS } from "./TheCouncil";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFocusMode } from "@/context/FocusModeContext";

interface FluxSidebarProps {
  visible: boolean;
  onToggle: () => void;
  onRequestCreateFolder?: () => void;
}

const UserSection = () => {
  const { user, signOut } = useAuth();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data && (data as any).avatar_url) setAvatarUrl((data as any).avatar_url);
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("document-images").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Failed to upload avatar"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("document-images").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", user.id);
    setAvatarUrl(publicUrl);
    toast.success("Avatar updated!");
    setUploading(false);
  };

  const { userPlan, openBilling } = useMonetization();

  return (
    <div className="px-3 pt-3 border-t border-border/20">
      <div className="flex items-center gap-3 py-1">
        <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Avatar className="w-7 h-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} className="object-cover" /> : null}
            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">{name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> : <Camera size={8} className="text-white" />}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
          <button
            onClick={openBilling}
            className="text-[11px] text-muted-foreground leading-tight hover:text-primary transition-colors cursor-pointer"
          >
            {userPlan} Plan
          </button>
        </div>
        <button onClick={() => signOut()} className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground hover:text-foreground" title={t("auth.signout")}>
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
};

const ADMIN_EMAIL = "kevin.therkildsen@icloud.com";

const FluxSidebar = ({ visible, onToggle, onRequestCreateFolder }: FluxSidebarProps) => {
  const { activeView, activeFolder, setActiveView, setActiveFolder, filterPersona, setFilterPersona } = useFlux();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const { sparksBalance, openBilling, closeBilling } = useMonetization();
  const { theme, setTheme } = useTheme();
  const { isFocusModeActive } = useFocusMode();

  // Every nav click must close any open billing/overlay, then switch view
  const nav = (view: typeof activeView | string) => {
    closeBilling();
    setActiveFolder(null);
    setActiveView(view as any);
  };

  const isHomeActive = activeView === "focus" && activeFolder === null;

  return (
    <>
      {/* Floating re-open trigger when sidebar is hidden */}
      {!visible && (
        <motion.button
          onClick={onToggle}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg glass-panel-hover"
        >
          <PanelLeft size={18} className="text-muted-foreground" />
        </motion.button>
      )}

      {/* Sidebar — width animates smoothly to 0 when hidden */}
      <motion.aside
        animate={{
          width: visible ? 260 : 0,
          opacity: visible ? 1 : 0,
          x: visible ? 0 : -20,
        }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{ overflow: "hidden", minWidth: 0 }}
        className="h-screen sidebar-apple flex flex-col py-3 z-30 shrink-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-2">
          <h1 className="text-base font-semibold text-foreground">{t("app.name")}</h1>
          <div className="flex items-center gap-0.5">
            <NotificationBell />
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground" title="Toggle theme">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground">
              <PanelLeftClose size={15} />
            </button>
          </div>
        </div>

        {/* Sparks pill — low-balance warning when < 5 */}
        <div className="px-3 mb-2">
          <button
            onClick={openBilling}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
              sparksBalance < 5
                ? "bg-destructive/8 border-destructive/40 hover:bg-destructive/12 animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                : "bg-primary/8 border-primary/15 hover:bg-primary/12"
            }`}
          >
            <Zap size={12} className={`shrink-0 ${sparksBalance < 5 ? "text-destructive" : "text-primary"}`} />
            <span className={`text-xs font-semibold flex-1 text-left ${sparksBalance < 5 ? "text-destructive" : "text-primary"}`}>
              {sparksBalance < 5 ? `⚠ Only ${sparksBalance} Sparks left!` : `${sparksBalance} Sparks ✨`}
            </span>
            <CreditCard size={11} className="text-muted-foreground" />
          </button>
        </div>

        {/* Nav links */}
        <div className="px-2 space-y-0.5">
          <button
            onClick={() => nav("focus")}
            className={`sidebar-item w-full ${isHomeActive ? "sidebar-item-active" : ""}`}
          >
            <Home size={18} className="shrink-0" />
            <span>{t("sidebar.home")}</span>
          </button>

          <button
            onClick={() => nav("calendar")}
            className={`sidebar-item w-full ${activeView === "calendar" ? "sidebar-item-active" : ""}`}
          >
            <CalendarDays size={18} className="shrink-0" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => nav("tasks")}
            className={`sidebar-item w-full ${activeView === "tasks" ? "sidebar-item-active" : ""}`}
          >
            <ListTodo size={18} className="shrink-0" />
            <span>Tasks</span>
          </button>

          {/* CRM */}
          <button
            onClick={() => nav("crm")}
            className={`sidebar-item w-full ${activeView === ("crm" as any) ? "sidebar-item-active" : ""}`}
          >
            <Briefcase size={18} className="shrink-0" />
            <span>CRM</span>
          </button>

          {/* Council */}
          <button
            onClick={() => { nav("council"); setFilterPersona(null); }}
            className={`sidebar-item w-full ${activeView === "council" ? "sidebar-item-active" : ""}`}
            data-tour="council-nav"
          >
            <Users size={18} className="shrink-0" />
            <span className="flex-1 text-left">{t("council.nav")}</span>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {PERSONAS.map((p) => {
                const initials = t(p.name).slice(0, 2).toUpperCase();
                const isActive = filterPersona === p.key;
                return (
                  <div key={p.key} className="relative group/avatar">
                    <button
                      onClick={(e) => { e.stopPropagation(); nav("council"); setFilterPersona(isActive ? null : p.key); }}
                      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-200 ${isActive ? "scale-115" : "opacity-50 hover:opacity-90 hover:scale-105"}`}
                      style={{
                        backgroundColor: p.color,
                        color: "#fff",
                        boxShadow: isActive ? `0 0 0 2.5px ${p.color}80, 0 0 8px ${p.color}60` : "none",
                      }}
                    >
                      {initials}
                    </button>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                      <div className="rounded-lg px-2.5 py-1.5 text-center shadow-xl"
                        style={{ background: "rgba(12,10,20,0.88)", backdropFilter: "blur(16px)", border: `1px solid ${p.color}40` }}>
                        <div className="text-[11px] font-semibold text-white leading-tight">{t(p.name)}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: p.color }}>{p.subtitle}</div>
                      </div>
                      {/* Arrow */}
                      <div className="w-2 h-2 mx-auto -mt-1 rotate-45 rounded-sm" style={{ background: "rgba(12,10,20,0.88)", border: `0 0 1px 1px ${p.color}40` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </button>

          {/* Workspace (Split-View) */}
          <button
            onClick={() => nav("multitask")}
            className={`sidebar-item w-full ${activeView === ("multitask" as any) ? "sidebar-item-active" : ""}`}
            data-tour="workspace-nav"
          >
            <Layers size={18} className="shrink-0" />
            <span>Workspace</span>
          </button>

          {/* Community Board */}
          <button
            onClick={() => nav("community")}
            className={`sidebar-item w-full ${activeView === ("community" as any) ? "sidebar-item-active" : ""}`}
          >
            <Grid size={18} className="shrink-0" />
            <span>Community Board</span>
          </button>

          {/* Community Admin — admin only */}
          {isAdmin && (
            <button
              onClick={() => nav("community-admin")}
              className={`sidebar-item w-full ${activeView === ("community-admin" as any) ? "sidebar-item-active" : ""}`}
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span>Community Admin</span>
            </button>
          )}
        </div>

        <div className="sidebar-separator" />

        {/* Folder tree */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-2">
          <BrainTree onRequestCreateFolder={onRequestCreateFolder} />
        </nav>

        <div className="sidebar-separator" />

        {/* Billing */}
        <div className="px-2 pb-1 space-y-0.5">
          <button
            onClick={openBilling}
            className={`sidebar-item w-full ${(activeView as string) === "billing" ? "sidebar-item-active" : ""}`}
          >
            <CreditCard size={16} className="shrink-0" />
            <span>Billing & Plans</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event("open-settings"))}
            className="sidebar-item w-full"
          >
            <Settings size={16} className="shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        <UserSection />
      </motion.aside>
    </>
  );
};

export default FluxSidebar;
