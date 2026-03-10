import React, { useState, useEffect } from "react";
import SEO from "./SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMonetization } from "@/context/MonetizationContext";
import { SPARKS_COSTS } from "@/lib/sparksConfig";
import { useTheme } from "next-themes";
import {
  Settings, User, Palette, LogOut, Brain, Pencil, Trash2, Check, X,
  Bell, Globe, Key, Zap, ChevronRight, Moon, Sun, Monitor,
} from "lucide-react";
import { toast } from "sonner";

interface AuraMemory {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "da", label: "Dansk" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "sv", label: "Svenska" },
  { code: "nb", label: "Norsk" },
];

const SettingsView = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { sparksBalance, hasBYOK, setBYOK, addSparks, userPlan, openBilling } = useMonetization();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<AuraMemory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [language, setLanguage] = useState("en");
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifDigest, setNotifDigest] = useState(true);
  const [notifCouncil, setNotifCouncil] = useState(false);
  const [byokInput, setByokInput] = useState("");
  const [byokVisible, setByokVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("profile");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name, settings").eq("id", user.id).single();
      if (data) {
        setDisplayName(data.display_name || "");
        const s = data.settings as Record<string, any> | null;
        if (s?.language) setLanguage(s.language);
        if (s?.notifDeadlines !== undefined) setNotifDeadlines(s.notifDeadlines);
        if (s?.notifDigest !== undefined) setNotifDigest(s.notifDigest);
        if (s?.notifCouncil !== undefined) setNotifCouncil(s.notifCouncil);
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

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("settings").eq("id", user.id).single();
    const currentSettings = (profile?.settings as Record<string, any>) || {};
    await supabase.from("profiles").update({
      display_name: displayName,
      settings: { ...currentSettings, theme, language, notifDeadlines, notifDigest, notifCouncil } as any,
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

  const saveBYOK = () => {
    if (byokInput.trim()) {
      setBYOK(true);
      toast.success("BYOK API key saved — Sparks deductions disabled for AI features");
    } else {
      setBYOK(false);
      toast.info("BYOK key removed");
    }
    setByokInput("");
  };

  const SECTIONS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "language", label: "Language", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "sparks", label: "Sparks & AI", icon: Zap },
    { id: "memory", label: "Aura Memory", icon: Brain },
  ];

  return (
    <div className="flex-1 overflow-hidden flex">
      <SEO title="Settings" description="Preferences, profile, appearance and workspace settings for your Dashiii account." url="/" keywords="settings, preferences, profile, theme, workspace configuration" />
      {/* Sidebar nav */}
      <div className="hidden md:flex w-52 shrink-0 flex-col border-r border-border/30 py-6 px-3 gap-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Settings</p>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              activeSection === s.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <s.icon size={15} />
            {s.label}
            {activeSection === s.id && <ChevronRight size={12} className="ml-auto" />}
          </button>
        ))}
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pt-4 pb-0 flex-wrap">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors ${
              activeSection === s.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground bg-secondary/40"
            }`}
          >
            <s.icon size={12} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-2xl">

        {/* ── Profile ── */}
        {activeSection === "profile" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Manage your account information</p>
            </div>
            <div className="flux-card space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Display Name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</label>
                <input
                  value={user?.email || ""}
                  readOnly
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/30 border border-border text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 border border-border/50">
                  <span className="text-xs text-muted-foreground">Plan:</span>
                  <button onClick={openBilling} className="text-xs font-semibold text-primary hover:underline">{userPlan}</button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* ── Appearance ── */}
        {activeSection === "appearance" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground">Choose how Dashiii looks</p>
            </div>
            <div className="flux-card">
              <p className="text-sm font-semibold text-foreground mb-3">Theme</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", label: "Light", icon: Sun, desc: "Clean white surface" },
                  { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                  { value: "system", label: "System", icon: Monitor, desc: "Follows your OS" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      theme === opt.value
                        ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <opt.icon size={20} className={theme === opt.value ? "text-primary" : "text-muted-foreground"} />
                    <span className={`text-sm font-semibold ${theme === opt.value ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground/60 text-center">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {/* ── Language ── */}
        {activeSection === "language" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Language</h2>
              <p className="text-sm text-muted-foreground">Set your preferred interface language</p>
            </div>
            <div className="flux-card">
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                      language === lang.code
                        ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {lang.label}
                    {language === lang.code && <Check size={13} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {/* ── Notifications ── */}
        {activeSection === "notifications" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Control what alerts you receive</p>
            </div>
            <div className="flux-card divide-y divide-border/30">
              {[
                { label: "Deadline Reminders", desc: "Get notified before task deadlines", value: notifDeadlines, onChange: setNotifDeadlines },
                { label: "Weekly AI Digest", desc: "Aura's weekly summary of your progress", value: notifDigest, onChange: setNotifDigest },
                { label: "Council Activity", desc: "Alerts when Council analysis completes", value: notifCouncil, onChange: setNotifCouncil },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.onChange(!item.value)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${item.value ? "bg-primary" : "bg-secondary"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${item.value ? "left-5" : "left-1"}`} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {/* ── Sparks & AI ── */}
        {activeSection === "sparks" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Sparks & AI</h2>
              <p className="text-sm text-muted-foreground">Manage your AI credits and API key</p>
            </div>

            {/* Balance card */}
            <div className="flux-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sparks Balance</p>
                  <p className="text-xs text-muted-foreground">Used for all AI-powered features</p>
                </div>
                <div className="text-3xl font-black text-primary">{sparksBalance} ✨</div>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((sparksBalance / 500) * 100, 100)}%` }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addSparks(10)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border"
                >
                  + 10 ✨ (demo)
                </button>
                <button
                  onClick={openBilling}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Top Up
                </button>
              </div>
            </div>

            {/* Spark costs reference */}
            <div className="flux-card">
              <p className="text-sm font-semibold text-foreground mb-3">Spark Costs</p>
              <div className="space-y-2">
                {[
                  { action: "Aura AI message", cost: 1 },
                  { action: "Document AI tools (Rewrite, Expand)", cost: 2 },
                  { action: "Document Translate", cost: 3 },
                  { action: "Full Council Consult", cost: 5 },
                  { action: "1-on-1 Council Deep Dive / msg", cost: 1 },
                ].map(item => (
                  <div key={item.action} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.action}</span>
                    <span className="font-semibold text-foreground">−{item.cost} ✨</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BYOK */}
            <div className="flux-card">
              <div className="flex items-center gap-2 mb-2">
                <Key size={15} className="text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Bring Your Own Key (BYOK)</p>
                {hasBYOK && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">Active</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-3">Use your own OpenAI API key to bypass Spark deductions entirely.</p>
              <div className="flex gap-2">
                <input
                  type={byokVisible ? "text" : "password"}
                  value={byokInput}
                  onChange={e => setByokInput(e.target.value)}
                  placeholder={hasBYOK ? "Key saved (masked)" : "sk-..."}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={() => setByokVisible(v => !v)}
                  className="px-3 py-2 rounded-xl bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors border border-border"
                >
                  {byokVisible ? "Hide" : "Show"}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveBYOK}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {hasBYOK ? "Update Key" : "Save Key"}
                </button>
                {hasBYOK && (
                  <button
                    onClick={() => { setBYOK(false); toast.info("BYOK key removed"); }}
                    className="px-4 py-2 rounded-xl text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Aura Memory ── */}
        {activeSection === "memory" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Aura Memory</h2>
              <p className="text-sm text-muted-foreground">Things Aura has learned about you. Edit or delete any entry.</p>
            </div>
            {!user ? (
              <p className="text-xs text-muted-foreground italic">Sign in to manage Aura's memory.</p>
            ) : memoriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-9 rounded-lg bg-secondary/40 animate-pulse" />)}
              </div>
            ) : memories.length === 0 ? (
              <div className="flux-card text-center py-8">
                <Brain size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No memories stored yet.</p>
                <p className="text-xs text-muted-foreground/60">Chat with Aura and she'll start learning about you.</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-border/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/20">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-1/3">Key</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Value</th>
                      <th className="px-2 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {memories.map((mem, i) => (
                      <tr key={mem.id} className={`border-b border-border/10 last:border-0 group ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        {editingId === mem.id ? (
                          <>
                            <td className="px-2 py-1.5">
                              <input
                                value={editKey}
                                onChange={e => setEditKey(e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-secondary/60 border border-primary/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-secondary/60 border border-primary/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
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
        )}
      </div>
    </div>
  );
};

export default SettingsView;
