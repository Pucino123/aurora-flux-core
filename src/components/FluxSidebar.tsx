import { Home, PanelLeftClose, PanelLeft, LogOut, Users, Sun, Moon, CalendarDays, ListTodo, Camera, Layers, Grid, CreditCard, Zap, ShieldCheck, Briefcase } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import BillingModal from "./billing/BillingModal";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
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

interface FluxSidebarProps {
  visible: boolean;
  onToggle: () => void;
  onRequestCreateFolder?: () => void;
}

const UserSection = () => {
  const { user, signOut } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const path = `avatars/${user.id}.${ext}`;
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
  const { sparksBalance, openBilling } = useMonetization();
  const { theme, setTheme } = useTheme();

  const isHomeActive = activeView === "focus" && activeFolder === null;

  return (
    <>
      {!visible && (
        <button onClick={onToggle} className="fixed top-4 left-4 z-50 p-2 rounded-lg glass-panel-hover">
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

            {/* Sparks pill */}
            <div className="px-3 mb-2">
              <button
                onClick={openBilling}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/15 hover:bg-primary/12 transition-colors"
              >
                <Zap size={12} className="text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary flex-1 text-left">{sparksBalance} Sparks ✨</span>
                <CreditCard size={11} className="text-muted-foreground" />
              </button>
            </div>

            {/* Nav links */}
            <div className="px-2 space-y-0.5">
              <button
                onClick={() => { setActiveFolder(null); setActiveView("focus"); }}
                className={`sidebar-item w-full ${isHomeActive ? "sidebar-item-active" : ""}`}
              >
                <Home size={18} className="shrink-0" />
                <span>{t("sidebar.home")}</span>
              </button>

              <button
                onClick={() => { setActiveFolder(null); setActiveView("calendar"); }}
                className={`sidebar-item w-full ${activeView === "calendar" ? "sidebar-item-active" : ""}`}
              >
                <CalendarDays size={18} className="shrink-0" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => { setActiveFolder(null); setActiveView("tasks"); }}
                className={`sidebar-item w-full ${activeView === "tasks" ? "sidebar-item-active" : ""}`}
              >
                <ListTodo size={18} className="shrink-0" />
                <span>Tasks</span>
              </button>

              {/* CRM */}
              <button
                onClick={() => { setActiveFolder(null); setActiveView("crm" as any); }}
                className={`sidebar-item w-full ${activeView === ("crm" as any) ? "sidebar-item-active" : ""}`}
              >
                <Briefcase size={18} className="shrink-0" />
                <span>CRM</span>
              </button>

              {/* Council */}
              <button
                onClick={() => { setActiveFolder(null); setActiveView("council"); setFilterPersona(null); }}
                className={`sidebar-item w-full ${activeView === "council" ? "sidebar-item-active" : ""}`}
                data-tour="council-nav"
              >
                <Users size={18} className="shrink-0" />
                <span className="flex-1 text-left">{t("council.nav")}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {PERSONAS.map((p) => (
                    <button
                      key={p.key}
                      onClick={(e) => { e.stopPropagation(); setActiveFolder(null); setActiveView("council"); setFilterPersona(filterPersona === p.key ? null : p.key); }}
                      className={`w-[7px] h-[7px] rounded-full transition-all duration-150 hover:scale-150 ${filterPersona === p.key ? "ring-[1.5px] ring-foreground/50 scale-150" : "opacity-50 hover:opacity-100"}`}
                      style={{ backgroundColor: p.color }}
                      title={t(p.name)}
                    />
                  ))}
                </div>
              </button>

              {/* Workspace (Split-View) */}
              <button
                onClick={() => { setActiveFolder(null); setActiveView("multitask" as any); }}
                className={`sidebar-item w-full ${activeView === ("multitask" as any) ? "sidebar-item-active" : ""}`}
                data-tour="workspace-nav"
              >
                <Layers size={18} className="shrink-0" />
                <span>Workspace</span>
              </button>

              {/* Community Board */}
              <button
                onClick={() => { setActiveFolder(null); setActiveView("community" as any); }}
                className={`sidebar-item w-full ${activeView === ("community" as any) ? "sidebar-item-active" : ""}`}
              >
                <Grid size={18} className="shrink-0" />
                <span>Community Board</span>
              </button>

              {/* Community Admin — admin only */}
              {isAdmin && (
                <button
                  onClick={() => { setActiveFolder(null); setActiveView("community-admin" as any); }}
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
            <div className="px-2 pb-1">
              <button
                onClick={openBilling}
                className={`sidebar-item w-full ${(activeView as string) === "billing" ? "sidebar-item-active" : ""}`}
              >
                <CreditCard size={16} className="shrink-0" />
                <span>Billing & Plans</span>
              </button>
            </div>

            <UserSection />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default FluxSidebar;
