import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Plus, ExternalLink, CheckCircle, Clock, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

interface Slot {
  id?: string;
  slotIndex: number;
  userId: string | null;
  status: "available" | "pending" | "approved";
  projectName?: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
}

const TOTAL_SLOTS = 18;

const buildGrid = (dbSlots: Slot[]): Slot[] =>
  Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const found = dbSlots.find((s) => s.slotIndex === i);
    return found ?? { slotIndex: i, userId: null, status: "available" };
  });

/* ── Setup Modal ── */
const SetupModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { projectName: string; websiteUrl: string; thumbnail: string }) => void;
}) => {
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      // Try to upload to storage, fall back to data URL
      const ext = file.name.split(".").pop();
      const path = `community/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("document-images")
        .upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from("document-images")
          .getPublicUrl(data.path);
        setThumbnail(urlData.publicUrl);
      } else {
        // Fallback to local data URL
        const reader = new FileReader();
        reader.onload = (e) => setThumbnail(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    } finally {
      setUploading(false);
    }
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground"
        >
          <X size={16} />
        </button>
        <h2 className="text-xl font-bold text-foreground mb-5">Setup your Space</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Project Name (max 25 chars)
            </label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.slice(0, 25))}
              placeholder="My Awesome Project"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Website URL
            </label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourproject.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Cover Image (800×800px recommended)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => document.getElementById("cbs-file-input")?.click()}
              className={`relative rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                dragOver
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 hover:border-primary/40"
              }`}
            >
              {uploading ? (
                <Loader2 size={20} className="text-muted-foreground animate-spin" />
              ) : thumbnail ? (
                <img
                  src={thumbnail}
                  className="w-20 h-20 object-cover rounded-xl"
                  alt="Preview"
                />
              ) : (
                <>
                  <Plus size={20} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Drop image or click to upload</p>
                </>
              )}
              <input
                id="cbs-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (projectName && websiteUrl) onSubmit({ projectName, websiteUrl, thumbnail });
            }}
            disabled={!projectName || !websiteUrl || uploading}
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
const CheckoutModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground"
        >
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
              <Loader2 size={14} className="animate-spin" />
              Processing…
            </span>
          ) : (
            "🔒 Pay $10 / month"
          )}
        </button>
        <p className="text-[10px] text-muted-foreground mt-3">
          Simulated checkout — no real payment
        </p>
      </motion.div>
    </motion.div>
  );
};

/* ── Main View ── */
const CommunityBoardView = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>(buildGrid([]));
  const [loading, setLoading] = useState(true);
  const [checkoutSlot, setCheckoutSlot] = useState<number | null>(null);
  const [setupSlot, setSetupSlot] = useState<number | null>(null);

  /* ── Fetch from DB ── */
  const fetchSlots = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_slots")
      .select("*")
      .order("slot_index", { ascending: true });

    if (error) {
      console.error("Community board fetch error:", error);
      setLoading(false);
      return;
    }

    const mapped: Slot[] = (data || []).map((row) => ({
      id: row.id,
      slotIndex: row.slot_index,
      userId: row.user_id,
      status: row.status as Slot["status"],
      projectName: row.project_name ?? undefined,
      websiteUrl: row.website_url ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
    }));

    setSlots(buildGrid(mapped));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots();

    // Realtime: re-fetch on any change so all users see live updates
    const channel = supabase
      .channel("community_slots_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_slots" },
        () => fetchSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSlots]);

  /* ── Pending queue (only current user's own) ── */
  const pendingSlots = slots.filter(
    (s) => s.status === "pending" && s.userId === user?.id
  );

  /* ── Claim ── */
  const handleClaim = useCallback((slotIndex: number) => {
    if (!user) {
      toast.error("Sign in to claim a space");
      return;
    }
    setCheckoutSlot(slotIndex);
  }, [user]);

  /* ── After checkout: open setup modal ── */
  const handleCheckoutSuccess = useCallback(() => {
    if (checkoutSlot === null) return;
    setCheckoutSlot(null);
    setSetupSlot(checkoutSlot);
  }, [checkoutSlot]);

  /* ── Submit setup → insert pending into DB ── */
  const handleSetupSubmit = useCallback(
    async (data: { projectName: string; websiteUrl: string; thumbnail: string }) => {
      if (setupSlot === null || !user) return;

      // Optimistic update
      setSlots((prev) =>
        prev.map((s) =>
          s.slotIndex === setupSlot
            ? {
                ...s,
                status: "pending" as const,
                userId: user.id,
                projectName: data.projectName,
                websiteUrl: data.websiteUrl,
                thumbnailUrl: data.thumbnail || undefined,
              }
            : s
        )
      );
      setSetupSlot(null);

      const { error } = await supabase.from("community_slots").insert({
        slot_index: setupSlot,
        status: "pending",
        user_id: user.id,
        project_name: data.projectName,
        website_url: data.websiteUrl,
        thumbnail_url: data.thumbnail || null,
      });

      if (error) {
        toast.error("Failed to submit — please try again");
        fetchSlots(); // revert optimistic
      } else {
        toast.success("Submitted for approval! We'll review it shortly.");
        fetchSlots();
      }
    },
    [setupSlot, user, fetchSlots]
  );

  /* ── Admin: Approve ── */
  const handleApprove = useCallback(
    async (slot: Slot) => {
      setSlots((prev) =>
        prev.map((s) => (s.slotIndex === slot.slotIndex ? { ...s, status: "approved" as const } : s))
      );
      if (slot.id) {
        const { error } = await supabase
          .from("community_slots")
          .update({ status: "approved" })
          .eq("id", slot.id);
        if (error) { toast.error("Update failed"); fetchSlots(); }
        else toast.success(`${slot.projectName} approved!`);
      }
    },
    [fetchSlots]
  );

  /* ── Admin: Reject / remove ── */
  const handleReject = useCallback(
    async (slot: Slot) => {
      setSlots((prev) =>
        prev.map((s) =>
          s.slotIndex === slot.slotIndex
            ? { slotIndex: s.slotIndex, userId: null, status: "available" as const }
            : s
        )
      );
      if (slot.id) {
        const { error } = await supabase
          .from("community_slots")
          .delete()
          .eq("id", slot.id);
        if (error) { toast.error("Delete failed"); fetchSlots(); }
        else toast.success("Slot cleared.");
      }
    },
    [fetchSlots]
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <SEO
        title="Community Board"
        description="Discover projects from the Flux community and claim your digital space."
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Grid size={20} className="text-primary" /> Community Board
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Discover projects from the Flux community. Claim a space to promote your own startup.
          </p>
        </div>
      </div>

      {/* Admin Pending Queue - removed (use Community Admin view in sidebar) */}

      {/* Slot Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-4">
          {slots.map((slot) => {
            const isMyPending =
              slot.status === "pending" && slot.userId === user?.id;
            const isOtherPending =
              slot.status === "pending" && slot.userId !== user?.id;

            return (
              <motion.div
                key={slot.slotIndex}
                layout
                className={`aspect-square rounded-2xl overflow-hidden relative cursor-pointer group transition-all duration-200 ${
                  slot.status === "available"
                    ? "border-2 border-dashed border-border/40 hover:border-primary/60"
                    : "border border-border/20"
                }`}
              >
                {/* Available */}
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

                {/* My pending — rich badge with thumbnail + animated pulse ring */}
                {isMyPending && (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
                    {/* Blurred background */}
                    {slot.thumbnailUrl && (
                      <img
                        src={slot.thumbnailUrl}
                        className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30"
                        alt=""
                      />
                    )}
                    {/* Amber overlay */}
                    <div className="absolute inset-0 bg-amber-500/10" />

                    {/* Animated amber border ring */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/60 animate-pulse" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center gap-1.5 p-3 text-center">
                      {slot.thumbnailUrl ? (
                        <img
                          src={slot.thumbnailUrl}
                          className="w-9 h-9 rounded-lg object-cover ring-2 ring-amber-400/60 mb-0.5"
                          alt={slot.projectName}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center mb-0.5">
                          <Clock size={14} className="text-amber-400" />
                        </div>
                      )}
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide leading-tight">
                        Pending Review
                      </span>
                      {slot.projectName && (
                        <span className="text-[8px] text-foreground/70 truncate w-full text-center leading-tight">
                          {slot.projectName}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Other pending — always show as available (admins manage via Community Admin view) */}
                {isOtherPending && (
                  <button
                    onClick={() => handleClaim(slot.slotIndex)}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] font-medium">Claim this space</span>
                    <span className="text-[9px] text-muted-foreground/70">$10 / month</span>
                  </button>
                )}

                {/* Approved */}
                {slot.status === "approved" && (
                  <a
                    href={slot.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full relative"
                  >
                    {slot.thumbnailUrl ? (
                      <img
                        src={slot.thumbnailUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt={slot.projectName}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {slot.projectName?.[0]}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-all duration-300 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 p-2 backdrop-blur-[2px] rounded-2xl">
                      <span className="text-xs font-bold text-white text-center">
                        {slot.projectName}
                      </span>
                      <span className="text-[9px] text-white/80 flex items-center gap-0.5">
                        Visit Project <ExternalLink size={8} />
                      </span>
                    </div>
                  </a>
                )}

                {/* Admin remove button on approved */}
                {adminMode && slot.status === "approved" && (
                  <button
                    onClick={() => handleReject(slot)}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X size={10} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {checkoutSlot !== null && (
          <CheckoutModal
            onClose={() => setCheckoutSlot(null)}
            onSuccess={handleCheckoutSuccess}
          />
        )}
        {setupSlot !== null && (
          <SetupModal
            onClose={() => setSetupSlot(null)}
            onSubmit={handleSetupSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityBoardView;
