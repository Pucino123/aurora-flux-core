import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Settings, User, Palette, LogOut, Brain, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface AuraMemory {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

const SettingsView = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<AuraMemory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");

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
    fetchMemories();
  }, [user]);

  const fetchMemories = async () => {
    if (!user) return;
    setMemoriesLoading(true);
    const { data } = await (supabase as any).from("aura_memory").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setMemories((data || []) as AuraMemory[]);
    setMemoriesLoading(false);
  };

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

  const startEdit = (mem: AuraMemory) => {
    setEditingId(mem.id);
    setEditKey(mem.key);
    setEditValue(mem.value);
  };

  const saveEdit = async () => {
    if (!user || !editingId) return;
    await (supabase as any).from("aura_memory").update({ key: editKey.trim(), value: editValue.trim() }).eq("id", editingId).eq("user_id", user.id);
    setEditingId(null);
    fetchMemories();
    toast.success("Memory updated");
  };

  const deleteMemory = async (id: string) => {
    if (!user) return;
    await (supabase as any).from("aura_memory").delete().eq("id", id).eq("user_id", user.id);
    setMemories(prev => prev.filter(m => m.id !== id));
    toast.success("Memory deleted");
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

        {/* Aura Memory Manager */}
        <div className="flux-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Brain size={16} /> Aura Memory</h3>
          <p className="text-xs text-muted-foreground mb-4">Things Aura has learned and remembered about you. Edit or delete any entry.</p>
          {!user ? (
            <p className="text-xs text-muted-foreground italic">Sign in to manage Aura's memory.</p>
          ) : memoriesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-9 rounded-lg bg-secondary/40 animate-pulse" />)}
            </div>
          ) : memories.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No memories stored yet. Chat with Aura and she'll start learning about you.</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border/30">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-1/3">Key</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Value</th>
                    <th className="px-2 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {memories.map((mem, i) => (
                    <tr key={mem.id} className={`border-b border-border/10 last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      {editingId === mem.id ? (
                        <>
                          <td className="px-2 py-1.5">
                            <input
                              value={editKey}
                              onChange={e => setEditKey(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-secondary/60 border border-primary/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-secondary/60 border border-primary/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                              autoFocus
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1 justify-end">
                              <button onClick={saveEdit} className="p-1 rounded-md hover:bg-primary/20 text-primary transition-colors"><Check size={12} /></button>
                              <button onClick={() => setEditingId(null)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors"><X size={12} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 font-medium text-foreground/80">{mem.key}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{mem.value}</td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 hover:opacity-100">
                              <button onClick={() => startEdit(mem)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil size={11} /></button>
                              <button onClick={() => deleteMemory(mem.id)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
