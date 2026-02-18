import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Settings, User, Palette, LogOut } from "lucide-react";
import { toast } from "sonner";

const SettingsView = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name, settings").eq("id", user.id).single();
      if (data) {
        setDisplayName(data.display_name || "");
        const s = data.settings as Record<string, any> | null;
        if (s?.theme) setTheme(s.theme);
      }
    })();
  }, [user]);

  // Apply theme immediately on change
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("settings").eq("id", user.id).single();
    const currentSettings = (profile?.settings as Record<string, any>) || {};
    await supabase.from("profiles").update({
      display_name: displayName,
      settings: { ...currentSettings, theme } as any,
    }).eq("id", user.id);
    setSaving(false);
    toast.success("Settings saved");
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display flex items-center gap-2"><Settings size={22} /> Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="flux-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><User size={16} /> Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input value={user?.email || ""} readOnly className="w-full px-3 py-2 rounded-xl bg-secondary/30 border border-border text-sm text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="flux-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Palette size={16} /> Appearance</h3>
          <div className="flex gap-2">
            {(["system", "light", "dark"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  theme === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
