import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Plus, ExternalLink, CheckCircle, Clock, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import SEO from "@/components/SEO";

interface Slot {
  id: string;
  slotIndex: number;
  userId: string | null;
  status: "available" | "pending" | "approved";
  projectName?: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
}

const TOTAL_SLOTS = 18;

const initialSlots = (): Slot[] =>
  Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
    id: `slot-${i}`,
    slotIndex: i,
    userId: null,
    status: "available",
    ...(i === 2 ? { status: "approved" as const, userId: "demo", projectName: "NovaPulse", websiteUrl: "https://example.com", thumbnailUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=400&fit=crop" } : {}),
    ...(i === 7 ? { status: "approved" as const, userId: "demo2", projectName: "Zephyr UI", websiteUrl: "https://example.com", thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop" } : {}),
  }));

/* ── Setup Modal ── */
const SetupModal = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: { projectName: string; websiteUrl: string; thumbnail: string }) => void }) => {
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setThumbnail(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground">
          <X size={16} />
        </button>
        <h2 className="text-xl font-bold text-foreground mb-5">Setup your Space</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project Name (max 25 chars)</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.slice(0, 25))}
              placeholder="My Awesome Project"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Website URL</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourproject.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cover Image (800×800px recommended)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => document.getElementById("cbs-file-input")?.click()}
              className={`relative rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                dragOver ? "border-primary/60 bg-primary/5" : "border-border/60 hover:border-primary/40"
              }`}
            >
              {thumbnail ? (
                <img src={thumbnail} className="w-20 h-20 object-cover rounded-xl" alt="Preview" />
              ) : (
                <>
                  <Plus size={20} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Drop image or click to upload</p>
                </>
              )}
              <input id="cbs-file-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
          <button
            onClick={() => { if (projectName && websiteUrl) onSubmit({ projectName, websiteUrl, thumbnail }); }}
            disabled={!projectName || !websiteUrl}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Submit for Approval
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── Checkout Simulation ── */
const CheckoutModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setProcessing(false);
    onSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center"
        style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground">
          <X size={16} />
        </button>
        <div className="text-3xl mb-3">🏷️</div>
        <h2 className="text-xl font-bold text-foreground mb-1">Claim this Space</h2>
        <p className="text-sm text-muted-foreground mb-6">$10 / month — Cancel anytime.</p>
        <button
          onClick={handlePay}
          disabled={processing}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 transition-colors"
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
              Processing…
            </span>
          ) : "🔒 Pay $10 / month"}
        </button>
        <p className="text-[10px] text-muted-foreground mt-3">Simulated checkout — no real payment</p>
      </motion.div>
    </motion.div>
  );
};

const CommunityBoardView = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [checkoutSlot, setCheckoutSlot] = useState<number | null>(null);
  const [setupSlot, setSetupSlot] = useState<number | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  const pendingSlots = slots.filter((s) => s.status === "pending");

  const handleClaim = useCallback((slotIndex: number) => {
    setCheckoutSlot(slotIndex);
  }, []);

  const handleCheckoutSuccess = useCallback(() => {
    if (checkoutSlot === null) return;
    setCheckoutSlot(null);
    setSetupSlot(checkoutSlot);
  }, [checkoutSlot]);

  const handleSetupSubmit = useCallback((data: { projectName: string; websiteUrl: string; thumbnail: string }) => {
    if (setupSlot === null) return;
    setSlots((prev) => prev.map((s) => s.slotIndex === setupSlot ? {
      ...s,
      status: "pending" as const,
      userId: user?.id || "local",
      projectName: data.projectName,
      websiteUrl: data.websiteUrl,
      thumbnailUrl: data.thumbnail || undefined,
    } : s));
    setSetupSlot(null);
  }, [setupSlot, user]);

  const handleApprove = useCallback((slotIndex: number) => {
    setSlots((prev) => prev.map((s) => s.slotIndex === slotIndex ? { ...s, status: "approved" as const } : s));
  }, []);

  const handleReject = useCallback((slotIndex: number) => {
    setSlots((prev) => prev.map((s) => s.slotIndex === slotIndex ? { ...s, status: "available" as const, userId: null, projectName: undefined, websiteUrl: undefined, thumbnailUrl: undefined } : s));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <SEO title="Community Board" description="Discover projects from the Flux community and claim your digital space." />
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Grid size={20} className="text-primary" /> Community Board
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Discover projects from the Flux community. Claim a space to promote your own startup.</p>
        </div>
        <button
          onClick={() => setAdminMode((v) => !v)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${adminMode ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {adminMode ? "Exit Admin" : "Admin Mode"}
        </button>
      </div>

      {/* Admin Queue */}
      <AnimatePresence>
        {adminMode && pendingSlots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" /> Pending Submissions Queue
            </h3>
            <div className="space-y-3">
              {pendingSlots.map((slot) => (
                <div key={slot.slotIndex} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  {slot.thumbnailUrl && (
                    <img src={slot.thumbnailUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" alt={slot.projectName} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{slot.projectName}</p>
                    <a href={slot.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate flex items-center gap-0.5">
                      {slot.websiteUrl} <ExternalLink size={9} />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(slot.slotIndex)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-500 text-xs font-medium hover:bg-green-500/20 transition-colors">
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button onClick={() => handleReject(slot.slotIndex)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
                      <X size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-4">
        {slots.map((slot) => {
          const isMyPending = slot.status === "pending" && (slot.userId === user?.id || slot.userId === "local");

          return (
            <motion.div
              key={slot.slotIndex}
              layout
              className={`aspect-square rounded-2xl overflow-hidden relative cursor-pointer group transition-all duration-200 ${
                slot.status === "available" ? "border-2 border-dashed border-border/40 hover:border-primary/60" : "border border-border/20"
              }`}
            >
              {slot.status === "available" && (
                <button
                  onClick={() => handleClaim(slot.slotIndex)}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={20} />
                  <span className="text-[10px] font-medium">Claim this space</span>
                  <span className="text-[9px] text-muted-foreground/70">$10 / month</span>
                </button>
              )}

              {isMyPending && (
                <div className="relative w-full h-full flex items-center justify-center">
                  {slot.thumbnailUrl && (
                    <img src={slot.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover blur-md opacity-40" alt="" />
                  )}
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1 p-2">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-[9px] font-semibold text-center text-foreground">⏳ Pending Admin Approval</span>
                  </div>
                </div>
              )}

              {slot.status === "approved" && (
                <a href={slot.websiteUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
                  {slot.thumbnailUrl ? (
                    <img src={slot.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" alt={slot.projectName} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{slot.projectName?.[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-all duration-300 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 p-2 backdrop-blur-[2px] rounded-2xl">
                    <span className="text-xs font-bold text-white text-center">{slot.projectName}</span>
                    <span className="text-[9px] text-white/80 flex items-center gap-0.5">Visit Project <ExternalLink size={8} /></span>
                  </div>
                </a>
              )}

              {/* Admin approve overlay */}
              {adminMode && slot.status === "approved" && (
                <button
                  onClick={() => handleReject(slot.slotIndex)}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

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
