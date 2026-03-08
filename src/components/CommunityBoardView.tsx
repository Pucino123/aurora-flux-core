import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Plus, ExternalLink, Clock, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

type LayoutType = "saas" | "ecommerce" | "dashboard" | "portfolio";

interface Slot {
  id?: string;
  slotIndex: number;
  userId: string | null;
  status: "available" | "pending" | "approved";
  projectName?: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
  layoutType?: LayoutType;
}

const TOTAL_SLOTS = 18;

const LAYOUT_TYPES: LayoutType[] = ["saas", "ecommerce", "dashboard", "portfolio", "saas", "ecommerce", "dashboard", "portfolio", "saas", "ecommerce", "dashboard", "portfolio", "saas", "ecommerce", "dashboard", "portfolio", "saas", "ecommerce"];

const buildGrid = (dbSlots: Slot[]): Slot[] =>
  Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const found = dbSlots.find((s) => s.slotIndex === i);
    return found ?? { slotIndex: i, userId: null, status: "available", layoutType: LAYOUT_TYPES[i] };
  });

/* ─── CSS Micro-Layouts ─── */
const SaasLayout = () => (
  <div className="flex-1 w-full flex flex-col items-center pt-3 px-2 relative overflow-hidden" style={{ background: "#0a0c14" }}>
    {/* Glow blob */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full opacity-30" style={{ background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)", filter: "blur(6px)" }} />
    {/* Hero text */}
    <div className="w-1/2 h-1.5 rounded-full mb-1 mt-2" style={{ background: "#e2e8f0" }} />
    <div className="w-1/3 h-1 rounded-full mb-2" style={{ background: "#475569" }} />
    {/* CTA button */}
    <div className="w-8 h-2 rounded-full mb-3" style={{ background: "#6366f1" }} />
    {/* Feature grid */}
    <div className="flex gap-1.5 w-full px-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: 18, background: "#1e2130", border: "1px solid rgba(255,255,255,0.06)" }} />
      ))}
    </div>
  </div>
);

const EcommerceLayout = () => (
  <div className="flex-1 w-full flex flex-col overflow-hidden" style={{ background: "#fafafa" }}>
    {/* Navbar */}
    <div className="h-2 border-b flex items-center justify-between px-2" style={{ borderColor: "#e2e8f0" }}>
      <div className="w-5 h-1 rounded-full" style={{ background: "#1e293b" }} />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => <div key={i} className="w-3 h-0.5 rounded-full" style={{ background: "#94a3b8" }} />)}
      </div>
    </div>
    {/* Hero banner */}
    <div className="w-full flex items-center justify-center" style={{ height: 20, background: "#ffe4e6" }}>
      <div className="w-10 h-1 rounded-full" style={{ background: "#f43f5e" }} />
    </div>
    {/* Product grid */}
    <div className="grid grid-cols-4 gap-1 p-1.5 flex-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-sm flex flex-col justify-end p-0.5" style={{ background: "#fff", border: "1px solid #e2e8f0", minHeight: 20 }}>
          <div className="w-full h-0.5 rounded-full mb-0.5" style={{ background: "#e2e8f0" }} />
          <div className="w-2/3 h-0.5 rounded-full" style={{ background: "#6366f1" }} />
        </div>
      ))}
    </div>
  </div>
);

const DashboardLayout = () => (
  <div className="flex-1 w-full flex overflow-hidden" style={{ background: "#0f172a" }}>
    {/* Sidebar */}
    <div className="flex flex-col py-2 px-1 gap-1" style={{ width: 22, background: "#1e293b", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="w-3 h-1 rounded-full mx-auto" style={{ background: i === 0 ? "#6366f1" : "rgba(255,255,255,0.15)" }} />
      ))}
    </div>
    {/* Main */}
    <div className="flex-1 p-1.5 flex flex-col gap-1.5">
      {/* Stat row */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: 10, background: "#1e293b", border: "1px solid rgba(255,255,255,0.05)" }} />
        ))}
      </div>
      {/* Chart */}
      <div className="w-full flex-1 rounded-sm relative overflow-hidden" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.05)", minHeight: 20 }}>
        {/* Fake chart bars */}
        <div className="absolute bottom-1 left-0 right-0 flex items-end justify-around px-1 gap-0.5" style={{ height: "80%" }}>
          {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 3 ? "#6366f1" : "rgba(99,102,241,0.3)" }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PortfolioLayout = () => (
  <div className="flex-1 w-full flex gap-1.5 p-2 overflow-hidden" style={{ background: "#fdfbf7" }}>
    {/* Left: text */}
    <div className="flex-1 flex flex-col justify-center gap-1">
      <div className="w-full h-2 rounded-sm" style={{ background: "#1e293b" }} />
      <div className="w-3/4 h-1.5 rounded-sm" style={{ background: "#1e293b" }} />
      <div className="w-1/2 h-1 rounded-sm" style={{ background: "#94a3b8" }} />
      <div className="w-8 h-1.5 rounded-full mt-1" style={{ background: "#f97316" }} />
    </div>
    {/* Right: masonry grid */}
    <div className="flex gap-1" style={{ width: "45%" }}>
      <div className="flex flex-col gap-1 flex-1">
        <div className="rounded-sm" style={{ height: 22, background: "#fed7aa" }} />
        <div className="rounded-sm flex-1" style={{ background: "#bfdbfe" }} />
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <div className="rounded-sm flex-1" style={{ background: "#d1fae5" }} />
        <div className="rounded-sm" style={{ height: 18, background: "#fce7f3" }} />
      </div>
    </div>
  </div>
);

const MicroLayout = ({ type }: { type: LayoutType }) => {
  const map = { saas: SaasLayout, ecommerce: EcommerceLayout, dashboard: DashboardLayout, portfolio: PortfolioLayout };
  const Comp = map[type];
  return <Comp />;
};

/* ─── Browser Chrome Wrapper ─── */
const BrowserChrome = ({ children, layoutType }: { children?: React.ReactNode; layoutType?: LayoutType }) => (
  <div className="w-full flex flex-col overflow-hidden rounded-tl-lg rounded-tr-lg" style={{ background: "#fff" }}>
    {/* Top bar with traffic lights */}
    <div className="h-4 flex items-center px-2 gap-1 shrink-0" style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
      <div className="flex-1 mx-2 h-1.5 rounded-full" style={{ background: "#e2e8f0" }} />
    </div>
    {/* Content */}
    <div className="flex flex-1 overflow-hidden">
      {layoutType ? <MicroLayout type={layoutType} /> : children}
    </div>
  </div>
);

/* ─── Setup Modal ─── */
const SetupModal = ({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { projectName: string; websiteUrl: string; thumbnail: string }) => void;
}) => {
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `community/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("document-images").upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from("document-images").getPublicUrl(data.path);
        setThumbnail(urlData.publicUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => setThumbnail(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    } finally { setUploading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground"><X size={16} /></button>
        <h2 className="text-xl font-bold text-foreground mb-5">Setup your Space</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project Name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value.slice(0, 25))} placeholder="My Awesome Project"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Website URL</label>
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourproject.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cover Image (optional)</label>
            <div onClick={() => document.getElementById("cbs-file-input")?.click()}
              className="rounded-xl border-2 border-dashed border-border/60 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-all">
              {uploading ? <Loader2 size={20} className="text-muted-foreground animate-spin" /> :
                thumbnail ? <img src={thumbnail} className="w-20 h-20 object-cover rounded-xl" alt="Preview" /> :
                  <><Plus size={20} className="text-muted-foreground" /><p className="text-xs text-muted-foreground">Drop image or click to upload</p></>}
              <input id="cbs-file-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
          <button onClick={() => { if (projectName && websiteUrl) onSubmit({ projectName, websiteUrl, thumbnail }); }}
            disabled={!projectName || !websiteUrl || uploading}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
            Submit for Approval
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Checkout Modal ─── */
const CheckoutModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [processing, setProcessing] = useState(false);
  const handlePay = async () => { setProcessing(true); await new Promise(r => setTimeout(r, 1200)); setProcessing(false); onSuccess(); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center"
        style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground"><X size={16} /></button>
        <div className="text-3xl mb-3">🏷️</div>
        <h2 className="text-xl font-bold text-foreground mb-1">Claim this Space</h2>
        <p className="text-sm text-muted-foreground mb-6">$10 / month — Cancel anytime.</p>
        <button onClick={handlePay} disabled={processing}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 transition-colors">
          {processing ? <><Loader2 size={14} className="animate-spin" />Processing…</> : "🔒 Pay $10 / month"}
        </button>
        <p className="text-[10px] text-muted-foreground mt-3">Simulated checkout — no real payment</p>
      </motion.div>
    </motion.div>
  );
};

/* ─── Main View ─── */
const ADMIN_EMAIL = "kevin.therkildsen@icloud.com";

const CommunityBoardView = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [slots, setSlots] = useState<Slot[]>(buildGrid([]));
  const [loading, setLoading] = useState(true);
  const [checkoutSlot, setCheckoutSlot] = useState<number | null>(null);
  const [setupSlot, setSetupSlot] = useState<number | null>(null);
  const [adminUploadSlot, setAdminUploadSlot] = useState<number | null>(null);
  const [adminUploading, setAdminUploading] = useState(false);

  const fetchSlots = useCallback(async () => {
    const { data, error } = await supabase.from("community_slots").select("*").order("slot_index", { ascending: true });
    if (error) { console.error("Community board fetch error:", error); setLoading(false); return; }
    const mapped: Slot[] = (data || []).map((row) => ({
      id: row.id, slotIndex: row.slot_index, userId: row.user_id,
      status: row.status as Slot["status"], projectName: row.project_name ?? undefined,
      websiteUrl: row.website_url ?? undefined, thumbnailUrl: row.thumbnail_url ?? undefined,
    }));
    setSlots(buildGrid(mapped));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots();
    const channel = supabase.channel("community_slots_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_slots" }, () => fetchSlots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSlots]);

  const handleClaim = useCallback((slotIndex: number) => {
    if (!user) { toast.error("Sign in to claim a space"); return; }
    setCheckoutSlot(slotIndex);
  }, [user]);

  const handleCheckoutSuccess = useCallback(() => {
    if (checkoutSlot === null) return;
    setCheckoutSlot(null);
    setSetupSlot(checkoutSlot);
  }, [checkoutSlot]);

  const handleSetupSubmit = useCallback(async (data: { projectName: string; websiteUrl: string; thumbnail: string }) => {
    if (setupSlot === null || !user) return;
    setSlots((prev) => prev.map((s) => s.slotIndex === setupSlot
      ? { ...s, status: "pending" as const, userId: user.id, projectName: data.projectName, websiteUrl: data.websiteUrl, thumbnailUrl: data.thumbnail || undefined }
      : s));
    setSetupSlot(null);
    const { error } = await supabase.from("community_slots").insert({
      slot_index: setupSlot, status: "pending", user_id: user.id,
      project_name: data.projectName, website_url: data.websiteUrl, thumbnail_url: data.thumbnail || null,
    });
    if (error) { toast.error("Failed to submit — please try again"); fetchSlots(); }
    else { toast.success("Submitted for approval! We'll review it shortly."); fetchSlots(); }
  }, [setupSlot, user, fetchSlots]);

  // Admin: upload/replace thumbnail for any slot
  const handleAdminThumbnailUpload = useCallback(async (file: File, slotIndex: number) => {
    const slot = slots.find(s => s.slotIndex === slotIndex);
    if (!slot?.id) return;
    setAdminUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `community/admin-${slotIndex}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("document-images").upload(path, file, { upsert: true });
      let url = "";
      if (!error && data) {
        const { data: urlData } = supabase.storage.from("document-images").getPublicUrl(data.path);
        url = urlData.publicUrl;
      } else {
        await new Promise<void>((res) => {
          const reader = new FileReader();
          reader.onload = (e) => { url = e.target?.result as string; res(); };
          reader.readAsDataURL(file);
        });
      }
      const { error: updateError } = await supabase.from("community_slots").update({ thumbnail_url: url }).eq("id", slot.id);
      if (!updateError) { toast.success("Thumbnail updated!"); fetchSlots(); }
      else toast.error("Failed to update thumbnail");
    } finally { setAdminUploading(false); setAdminUploadSlot(null); }
  }, [slots, fetchSlots]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <SEO title="Community Board" description="Discover projects from the Dashiii community and claim your digital space." />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Grid size={20} className="text-primary" /> Community Board
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Discover projects from the community. Claim a space to promote your startup.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {slots.map((slot) => {
            const isMyPending = slot.status === "pending" && slot.userId === user?.id;
            const lt = slot.layoutType ?? LAYOUT_TYPES[slot.slotIndex % LAYOUT_TYPES.length];

            return (
              <motion.div
                key={slot.slotIndex}
                layout
                className={`rounded-2xl overflow-hidden relative cursor-pointer group transition-all duration-300 ${
                  slot.status === "available"
                    ? "border-2 border-dashed border-border/40 hover:border-primary/60"
                    : "border border-border/20"
                }`}
                style={{ aspectRatio: "16/11" }}
              >
                {/* Available */}
                {slot.status === "available" && (
                  <button onClick={() => handleClaim(slot.slotIndex)}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Plus size={20} />
                    <span className="text-[10px] font-medium">Claim this space</span>
                    <span className="text-[9px] text-muted-foreground/70">$10 / month</span>
                  </button>
                )}

                {/* My pending */}
                {isMyPending && (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/60 animate-pulse" />
                    <div className="absolute inset-0 bg-amber-500/10" />
                    <div className="relative z-10 flex flex-col items-center gap-1.5 p-3 text-center">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center mb-0.5">
                        <Clock size={14} className="text-amber-400" />
                      </div>
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Pending Review</span>
                      {slot.projectName && <span className="text-[8px] text-foreground/70 truncate w-full text-center">{slot.projectName}</span>}
                    </div>
                  </div>
                )}

                {/* Other pending (treat as available) */}
                {slot.status === "pending" && slot.userId !== user?.id && (
                  <button onClick={() => handleClaim(slot.slotIndex)}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Plus size={20} />
                    <span className="text-[10px] font-medium">Claim this space</span>
                  </button>
                )}

                {/* Approved — CSS micro-layout */}
                {slot.status === "approved" && (
                  <div className="relative w-full h-full">
                    <a href={slot.websiteUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      {slot.thumbnailUrl ? (
                        <div className="relative w-full h-full overflow-hidden">
                          <img src={slot.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={slot.projectName} />
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-all duration-300 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                            <span className="text-xs font-bold text-white text-center">{slot.projectName}</span>
                            <span className="text-[9px] text-white/80 flex items-center gap-0.5">Visit <ExternalLink size={8} /></span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex flex-col overflow-hidden">
                          <div className="flex flex-col h-full overflow-hidden group-hover:scale-[1.03] transition-transform duration-500 origin-center">
                            <BrowserChrome layoutType={lt} />
                          </div>
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/70 transition-all duration-300 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 rounded-2xl">
                            <span className="text-xs font-bold text-white text-center px-2">{slot.projectName}</span>
                            <span className="text-[9px] text-white/80 flex items-center gap-0.5">Visit Project <ExternalLink size={8} /></span>
                          </div>
                        </div>
                      )}
                    </a>
                    {/* Admin upload button */}
                    {isAdmin && (
                      <label
                        className="absolute top-1.5 right-1.5 z-20 cursor-pointer p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all opacity-0 group-hover:opacity-100"
                        title="Replace thumbnail"
                        onClick={e => e.stopPropagation()}
                      >
                        {adminUploading && adminUploadSlot === slot.slotIndex
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Plus size={11} />}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { setAdminUploadSlot(slot.slotIndex); handleAdminThumbnailUpload(f, slot.slotIndex); } }} />
                      </label>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {checkoutSlot !== null && (
          <CheckoutModal onClose={() => setCheckoutSlot(null)} onSuccess={handleCheckoutSuccess} />
        )}
        {setupSlot !== null && (
          <SetupModal onClose={() => setSetupSlot(null)} onSubmit={handleSetupSubmit} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityBoardView;
