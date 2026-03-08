import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Clock, CheckCircle, X, ExternalLink, Loader2,
  Grid, Trash2, AlertTriangle, RefreshCw, Users, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

interface Slot {
  id: string;
  slotIndex: number;
  userId: string | null;
  status: "available" | "pending" | "approved";
  projectName?: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => {
  const I = Icon as React.FC<{ size?: number }>;
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <I size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

const CommunityAdminView = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_slots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load slots");
      setLoading(false);
      return;
    }

    setSlots(
      (data || []).map((row) => ({
        id: row.id,
        slotIndex: row.slot_index,
        userId: row.user_id,
        status: row.status as Slot["status"],
        projectName: row.project_name ?? undefined,
        websiteUrl: row.website_url ?? undefined,
        thumbnailUrl: row.thumbnail_url ?? undefined,
        createdAt: row.created_at ?? "",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots();

    const channel = supabase
      .channel("admin_community_slots")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_slots" }, () =>
        fetchSlots()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSlots]);

  const handleApprove = async (slot: Slot) => {
    const { error } = await supabase
      .from("community_slots")
      .update({ status: "approved" })
      .eq("id", slot.id);
    if (error) toast.error("Failed to approve");
    else {
      toast.success(`✅ "${slot.projectName}" approved!`);
      fetchSlots();
    }
  };

  const handleReject = async (slot: Slot) => {
    const { error } = await supabase
      .from("community_slots")
      .delete()
      .eq("id", slot.id);
    if (error) toast.error("Failed to reject");
    else {
      toast.success("Slot cleared.");
      fetchSlots();
    }
  };

  const pendingSlots = slots.filter((s) => s.status === "pending");
  const approvedSlots = slots.filter((s) => s.status === "approved");
  const visibleSlots =
    tab === "pending" ? pendingSlots : tab === "approved" ? approvedSlots : slots;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      <SEO title="Community Admin" description="Manage community board submissions." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> Community Admin
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review, approve, and manage all community board submissions.
          </p>
        </div>
        <button
          onClick={fetchSlots}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Grid} label="Total Slots" value={18} color="bg-secondary/60 text-muted-foreground" />
        <StatCard icon={CheckCircle} label="Approved" value={approvedSlots.length} color="bg-green-500/10 text-green-500" />
        <StatCard icon={Clock} label="Pending Review" value={pendingSlots.length} color="bg-amber-500/10 text-amber-500" />
        <StatCard icon={TrendingUp} label="Available" value={18 - slots.length} color="bg-primary/10 text-primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/40 pb-0">
        {(["pending", "approved", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-all ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "pending" && pendingSlots.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingSlots.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Slot List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : visibleSlots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Users size={32} className="opacity-30" />
          <p className="text-sm">
            {tab === "pending" ? "No pending submissions" : "Nothing here yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visibleSlots.map((slot) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card hover:border-border/60 transition-all group"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary/40 flex items-center justify-center">
                  {slot.thumbnailUrl ? (
                    <img
                      src={slot.thumbnailUrl}
                      alt={slot.projectName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-primary">
                      {slot.projectName?.[0] ?? "?"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {slot.projectName || "—"}
                    </p>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        slot.status === "approved"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {slot.status}
                    </span>
                  </div>
                  {slot.websiteUrl && (
                    <a
                      href={slot.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                    >
                      {slot.websiteUrl}
                      <ExternalLink size={9} className="shrink-0" />
                    </a>
                  )}
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Slot #{slot.slotIndex} · {timeAgo(slot.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {slot.status === "pending" && (
                    <button
                      onClick={() => handleApprove(slot)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(slot)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                    title={slot.status === "approved" ? "Remove slot" : "Reject"}
                  >
                    {slot.status === "approved" ? (
                      <><Trash2 size={13} /> Remove</>
                    ) : (
                      <><X size={13} /> Reject</>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pending warning banner */}
      <AnimatePresence>
        {pendingSlots.length > 0 && tab !== "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500 text-white shadow-lg text-sm font-medium cursor-pointer z-50"
            onClick={() => setTab("pending")}
          >
            <AlertTriangle size={16} />
            {pendingSlots.length} pending submission{pendingSlots.length > 1 ? "s" : ""}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityAdminView;
