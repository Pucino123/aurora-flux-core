import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Link, Zap, Palette, LogOut, CheckCheck, Loader2,
  Globe, Sun, Moon, Monitor, Camera, Check, ChevronRight, Sparkles, CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMonetization, type UserPlan } from "@/context/MonetizationContext";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import SparksCheckoutModal from "@/components/billing/SparksCheckoutModal";

type Tab = "account" | "integrations" | "sparks" | "appearance";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS = [
  {
    id: "google",
    name: "Google Calendar",
    desc: "Sync meetings, events & reminders",
    color: "#4285f4",
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <path fill="#4285F4" d="M45.5 24.5c0-1.7-.1-3.4-.4-5H24v9.5h12.1c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.6-9.5 6.6-16.4z" />
        <path fill="#34A853" d="M24 46c6.5 0 11.9-2.1 15.9-5.7l-7.1-5.4c-2.1 1.4-4.8 2.2-8.8 2.2-6.7 0-12.4-4.5-14.4-10.6H2.2v5.6C6.1 41.6 14.5 46 24 46z" />
        <path fill="#FBBC05" d="M9.6 26.5c-.5-1.4-.8-3-.8-4.5s.3-3.1.8-4.5v-5.6H2.2C.8 14.9 0 19.4 0 24s.8 9.1 2.2 12.1l7.4-5.6z" />
        <path fill="#EA4335" d="M24 9.5c3.8 0 7.1 1.3 9.8 3.8l7.3-7.3C36.9 2.1 30.9 0 24 0 14.5 0 6.1 4.4 2.2 11.9l7.4 5.6C11.6 14 17.3 9.5 24 9.5z" />
      </svg>
    ),
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    desc: "Connect work calendar & Teams meetings",
    color: "#0078d4",
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <rect x="4" y="4" width="19" height="19" fill="#f25022" />
        <rect x="25" y="4" width="19" height="19" fill="#7fba00" />
        <rect x="4" y="25" width="19" height="19" fill="#00a4ef" />
        <rect x="25" y="25" width="19" height="19" fill="#ffb900" />
      </svg>
    ),
  },
  {
    id: "apple",
    name: "Apple iCloud",
    desc: "Import iCal events from Apple devices",
    color: "#888",
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6" fill="currentColor">
        <path d="M35.1 26.1c-.1-4.9 4-7.3 4.2-7.4-2.3-3.3-5.8-3.8-7.1-3.9-3-.3-5.9 1.8-7.4 1.8-1.5 0-3.9-1.7-6.4-1.7-3.3.1-6.3 1.9-8 4.9-3.4 5.9-.9 14.6 2.4 19.4 1.6 2.3 3.5 4.9 6.1 4.8 2.4-.1 3.3-1.6 6.3-1.6s3.7 1.6 6.3 1.5c2.6 0 4.3-2.3 5.9-4.7 1.9-2.7 2.6-5.3 2.7-5.4-.1 0-5-1.9-5-7.7z" />
        <path d="M30.2 11.1c1.3-1.6 2.2-3.8 2-6.1-1.9.1-4.3 1.3-5.7 2.9-1.2 1.4-2.3 3.7-2 5.9 2.1.2 4.3-1.1 5.7-2.7z" />
      </svg>
    ),
  },
];

const PLANS = [
  {
    name: "Starter" as UserPlan,
    price: "Free",
    billing: "",
    description: "Core tools, 50 Sparks/mo",
    features: ["50 ✨ Sparks/month", "1 Council Advisor", "Basic Dashboard", "Core Tasks & Calendar"],
    missing: ["Split-View", "Mail Sync", "Full Council", "Team Chat"],
  },
  {
    name: "Pro" as UserPlan,
    price: "$19",
    billing: "/mo",
    description: "All features, 500 Sparks/mo",
    features: ["500 ✨ Sparks/month", "Full Council (4 Advisors)", "Split-View Multitasking", "Mail Sync", "Priority Support"],
    missing: ["Team Chat", "Shared Folders"],
    badge: "Most Popular",
  },
  {
    name: "Team" as UserPlan,
    price: "$12",
    billing: "/user/mo",
    description: "Pro + collaboration",
    features: ["Everything in Pro", "Team Chat", "Shared Folders", "Team Analytics", "Admin Dashboard"],
    missing: [],
  },
];

const LS_INTEGRATIONS = "flux_connected_integrations";

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { user, signOut } = useAuth();
  const { sparksBalance, userPlan, setUserPlan } = useMonetization();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("account");
  const [connectedProviders, setConnectedProviders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_INTEGRATIONS) || "[]"); } catch { return []; }
  });
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sparksCheckoutOpen, setSparksCheckoutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  useEffect(() => {
    if (!user || !open) return;
    supabase.from("profiles").select("avatar_url, display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        if ((data as any).avatar_url) setAvatarUrl((data as any).avatar_url);
        setDisplayName((data as any).display_name || name);
      }
    });
  }, [user, open]);

  // Persist integrations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LS_INTEGRATIONS, JSON.stringify(connectedProviders));
  }, [connectedProviders]);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() } as any).eq("id", user.id);
    toast.success("Display name updated");
    setSavingName(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("document-images")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("document-images").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", user.id);
    setAvatarUrl(publicUrl + "?t=" + Date.now());
    toast.success("Profile picture updated!");
    setUploading(false);
  };

  const handleConnect = async (id: string) => {
    setConnectingProvider(id);
    await new Promise(r => setTimeout(r, 1800));
    setConnectedProviders(prev => {
      const next = [...prev, id];
      localStorage.setItem(LS_INTEGRATIONS, JSON.stringify(next));
      return next;
    });
    setConnectingProvider(null);
    toast.success(`${PROVIDERS.find(p => p.id === id)?.name} connected!`);
  };

  const handleDisconnect = (id: string) => {
    setConnectedProviders(prev => {
      const next = prev.filter(p => p !== id);
      localStorage.setItem(LS_INTEGRATIONS, JSON.stringify(next));
      return next;
    });
    toast.success(`${PROVIDERS.find(p => p.id === id)?.name} disconnected`);
  };

  const TAB_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: "Account", icon: <User size={15} /> },
    { id: "integrations", label: "Integrations", icon: <Link size={15} /> },
    { id: "sparks", label: "Sparks & Billing", icon: <Zap size={15} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
  ];

  const sparksUsed = 500 - sparksBalance;
  const sparksPercent = Math.min((sparksUsed / 500) * 100, 100);

  if (!open) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
            style={{ background: "hsl(var(--background) / 0.8)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[860px] h-[580px] flex rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "hsl(var(--card) / 0.92)",
                border: "1px solid hsl(var(--border))",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 60px hsl(var(--primary) / 0.1), 0 25px 50px hsl(0 0% 0% / 0.4)",
              }}
            >
              {/* Left nav */}
              <div
                className="w-56 shrink-0 flex flex-col p-3 border-r border-border/30"
                style={{ background: "hsl(var(--card) / 0.5)" }}
              >
                <div className="flex items-center justify-between mb-4 px-2 pt-1">
                  <p className="text-sm font-bold text-foreground">Settings</p>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-0.5 flex-1">
                  {TAB_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                        tab === item.id
                          ? "bg-primary/10 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { signOut(); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all mt-auto"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>

              {/* Right content */}
              <div className="flex-1 p-7 overflow-y-auto">
                <AnimatePresence mode="wait">

                  {/* ── ACCOUNT ── */}
                  {tab === "account" && (
                    <motion.div key="account" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                      <h2 className="text-base font-bold text-foreground mb-5">Account</h2>
                      <div className="flex items-center gap-4 mb-6">
                        {/* Avatar with upload overlay */}
                        <div
                          className="relative w-16 h-16 rounded-full cursor-pointer group"
                          onClick={() => fileRef.current?.click()}
                        >
                          <Avatar className="w-16 h-16">
                            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="object-cover" />}
                            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{name[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {/* Camera overlay on hover */}
                          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {uploading
                              ? <Loader2 size={18} className="text-white animate-spin" />
                              : <Camera size={18} className="text-white" />
                            }
                          </div>
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">{email}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Click photo to change</p>
                        </div>
                      </div>
                      <div className="space-y-4 max-w-sm">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">Display Name</label>
                          <input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveName()}
                            className="w-full px-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 text-foreground outline-none focus:border-primary/40 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">Email</label>
                          <input
                            value={email}
                            readOnly
                            className="w-full px-3 py-2 rounded-xl text-sm bg-secondary/30 border border-border/20 text-muted-foreground outline-none cursor-not-allowed"
                          />
                        </div>
                        <button
                          onClick={handleSaveName}
                          disabled={savingName}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {savingName ? <Loader2 size={12} className="animate-spin" /> : null}
                          Save Changes
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── INTEGRATIONS ── */}
                  {tab === "integrations" && (
                    <motion.div key="integrations" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                      <h2 className="text-base font-bold text-foreground mb-1">Integrations</h2>
                      <p className="text-xs text-muted-foreground mb-5">Connect your external calendars to see everything in one place.</p>
                      <div className="space-y-3 max-w-md">
                        {PROVIDERS.map(prov => {
                          const connected = connectedProviders.includes(prov.id);
                          const loading = connectingProvider === prov.id;
                          return (
                            <div
                              key={prov.id}
                              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${connected ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/30 hover:border-border/50"}`}
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `${prov.color}15`, border: `1px solid ${prov.color}30` }}>
                                {prov.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{prov.name}</p>
                                <p className="text-xs text-muted-foreground">{prov.desc}</p>
                              </div>
                              {connected ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shrink-0">
                                    <CheckCheck size={11} /> Connected
                                  </div>
                                  <button
                                    onClick={() => handleDisconnect(prov.id)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 border border-border/20 transition-all"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : loading ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs shrink-0">
                                  <Loader2 size={11} className="animate-spin" /> Syncing…
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleConnect(prov.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
                                  style={{ background: `${prov.color}20`, border: `1px solid ${prov.color}40`, color: prov.color }}
                                >
                                  Connect
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground/40 mt-4">🔒 OAuth-secured · events are read-only imports</p>
                    </motion.div>
                  )}

                  {/* ── SPARKS & BILLING ── */}
                  {tab === "sparks" && (
                    <motion.div key="sparks" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                      <h2 className="text-base font-bold text-foreground mb-1">Sparks & Billing</h2>
                      <p className="text-xs text-muted-foreground mb-4">Sparks are your AI credits. Each Aura interaction uses 1 Spark.</p>

                      {/* Balance card */}
                      <div className="p-4 rounded-2xl border border-border/30 mb-5" style={{ background: "hsl(var(--card) / 0.6)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{sparksBalance} Sparks remaining</p>
                            <p className="text-xs text-muted-foreground">Used {sparksUsed} of 500 this month</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, hsl(265 60% 60% / 0.2), hsl(160 84% 39% / 0.2))", border: "1px solid hsl(265 60% 60% / 0.3)" }}>
                            <Zap size={18} className="text-primary" />
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${sparksPercent}%`, background: "linear-gradient(90deg, hsl(265 60% 60%), hsl(160 84% 39%))" }}
                          />
                        </div>
                      </div>

                      {/* Buy Sparks packs */}
                      <p className="text-xs font-semibold text-foreground mb-2">Top Up Sparks</p>
                      <div className="grid grid-cols-3 gap-2.5 mb-6">
                        {[
                          { sparks: 50, price: "$5", label: "Starter Pack" },
                          { sparks: 120, price: "$10", label: "Power Pack", best: true },
                          { sparks: 300, price: "$20", label: "Pro Bundle" },
                        ].map(pack => (
                          <button
                            key={pack.sparks}
                            onClick={() => setSparksCheckoutOpen(true)}
                            className="relative flex flex-col items-center p-3 rounded-2xl border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                          >
                            {pack.best && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                                BEST VALUE
                              </span>
                            )}
                            <Sparkles size={18} className="text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-bold text-foreground">{pack.sparks} ✨</p>
                            <p className="text-[10px] text-muted-foreground">{pack.label}</p>
                            <p className="text-xs font-semibold text-primary mt-1">{pack.price}</p>
                          </button>
                        ))}
                      </div>

                      {/* Plan upgrade/downgrade */}
                      <p className="text-xs font-semibold text-foreground mb-2">Workspace Plan</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {PLANS.map(plan => {
                          const isCurrent = userPlan === plan.name;
                          const isDowngrade = plan.name === "Starter" && userPlan !== "Starter";
                          return (
                            <div
                              key={plan.name}
                              className={`relative flex flex-col p-3.5 rounded-2xl border transition-all ${
                                isCurrent
                                  ? "border-emerald-500/40 bg-emerald-500/5"
                                  : "border-border/30 bg-card/50 hover:border-border/60"
                              }`}
                            >
                              {(plan as any).badge && !isCurrent && (
                                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white whitespace-nowrap">
                                  {(plan as any).badge}
                                </span>
                              )}
                              <p className="text-xs font-bold text-foreground">{plan.name}</p>
                              <div className="flex items-baseline gap-0.5 mt-0.5 mb-1.5">
                                <span className="text-lg font-black text-primary">{plan.price}</span>
                                <span className="text-[10px] text-muted-foreground">{plan.billing}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mb-2 leading-tight">{plan.description}</p>
                              {isCurrent ? (
                                <div className="mt-auto w-full py-1.5 rounded-xl text-center text-[11px] font-semibold text-emerald-500 border border-emerald-500/30 bg-emerald-500/5">
                                  ✓ Current
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setUserPlan(plan.name); toast.success(`Switched to ${plan.name} plan`); }}
                                  className="mt-auto w-full py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                                >
                                  {isDowngrade ? "Downgrade" : "Upgrade"} <ChevronRight size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ── APPEARANCE ── */}
                  {tab === "appearance" && (
                    <motion.div key="appearance" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                      <h2 className="text-base font-bold text-foreground mb-5">Appearance</h2>
                      <p className="text-xs text-muted-foreground mb-4">Choose your preferred color scheme.</p>
                      <div className="grid grid-cols-3 gap-3 max-w-xs">
                        {([
                          { id: "light", label: "Light", icon: <Sun size={18} /> },
                          { id: "dark", label: "Dark", icon: <Moon size={18} /> },
                          { id: "system", label: "System", icon: <Monitor size={18} /> },
                        ] as const).map(t => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-xs font-medium ${
                              theme === t.id
                                ? "border-primary/60 bg-primary/10 text-foreground"
                                : "border-border/30 text-muted-foreground hover:border-border/60 hover:bg-secondary/40"
                            }`}
                          >
                            {t.icon}
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparks checkout modal (rendered outside settings modal so z-index stacks properly) */}
      <SparksCheckoutModal open={sparksCheckoutOpen} onClose={() => setSparksCheckoutOpen(false)} />
    </>,
    document.body
  );
};

export default SettingsModal;
