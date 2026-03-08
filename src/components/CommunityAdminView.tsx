import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Clock, CheckCircle, X, ExternalLink, Loader2,
  RefreshCw, Users, TrendingUp, Activity, AlertTriangle, Trash2,
  Search, MoreHorizontal, Shield, Ban, Cpu
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const ADMIN_EMAIL = "kevin.therkildsen@icloud.com";

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

type AdminTab = "overview" | "directory" | "logs";

/* ─── KPI Card ─── */
const KpiCard = ({ icon: Icon, label, value, sub, subColor = "text-emerald-400", pulse }: {
  icon: React.ElementType; label: string; value: string; sub?: string; subColor?: string; pulse?: boolean;
}) => (
  <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div className="flex items-center justify-between">
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</p>
      {pulse && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
    </div>
    <p className="text-3xl font-bold text-white leading-none">{value}</p>
    {sub && <p className={`text-xs font-medium ${subColor}`}>{sub}</p>}
  </div>
);

/* ─── Activity Feed Item ─── */
const ActivityItem = ({ avatar, name, action, time }: { avatar: string; name: string; action: string; time: string }) => (
  <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
      {avatar}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-white/80"><span className="font-semibold text-white">{name}</span> {action}</p>
      <p className="text-[10px] text-white/30 mt-0.5">{time}</p>
    </div>
  </div>
);

/* ─── Mock data ─── */
const MOCK_ACTIVITY = [
  { avatar: "S", name: "Sarah K.", action: "created a new Idea Frame", time: "2m ago" },
  { avatar: "M", name: "Mike R.", action: "published 'Alpha Dashboard' to Community", time: "14m ago" },
  { avatar: "A", name: "Anna L.", action: "upgraded to Pro plan", time: "1h ago" },
  { avatar: "J", name: "James T.", action: "submitted 'DevTrack' for approval", time: "2h ago" },
  { avatar: "P", name: "Priya M.", action: "joined via invite link", time: "3h ago" },
  { avatar: "T", name: "Tom H.", action: "connected Google Calendar", time: "5h ago" },
];

const MOCK_REPORTS = [
  { id: 1, project: "SpamFarm Pro", reason: "Inappropriate content", user: "anon@test.com" },
  { id: 2, project: "CryptoScam.io", reason: "Phishing attempt", user: "bad@actor.net" },
];

const MOCK_USERS = [
  { id: 1, avatar: "S", name: "Sarah K.", email: "sarah@example.com", plan: "Pro", joined: "Jan 12, 2025" },
  { id: 2, avatar: "M", name: "Mike R.", email: "mike@devco.io", plan: "Pro", joined: "Feb 3, 2025" },
  { id: 3, avatar: "A", name: "Anna L.", email: "anna@startup.com", plan: "Starter", joined: "Feb 18, 2025" },
  { id: 4, avatar: "J", name: "James T.", email: "james@freelancer.io", plan: "Starter", joined: "Mar 1, 2025" },
  { id: 5, avatar: "P", name: "Priya M.", email: "priya@design.co", plan: "Pro", joined: "Mar 5, 2025" },
];

const MOCK_LOGS = [
  { time: "08:14:32", event: "User login", detail: "kevin.therkildsen@icloud.com — IP 192.168.1.1" },
  { time: "08:02:11", event: "Slot approved", detail: "Slot #4 'Alpha Dashboard' approved by admin" },
  { time: "07:50:05", event: "New signup", detail: "Priya M. created account" },
  { time: "07:31:20", event: "Invoice generated", detail: "Invoice #INV-042 sent to Mike R." },
  { time: "06:45:00", event: "System health check", detail: "All services operational — 99.9% uptime" },
];

/* ─── Main Admin View ─── */
const CommunityAdminView = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [reports, setReports] = useState<typeof MOCK_REPORTS>([]);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("community_slots").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load slots"); setLoading(false); return; }
    setSlots((data || []).map((row) => ({
      id: row.id, slotIndex: row.slot_index, userId: row.user_id,
      status: row.status as Slot["status"], projectName: row.project_name ?? undefined,
      websiteUrl: row.website_url ?? undefined, thumbnailUrl: row.thumbnail_url ?? undefined,
      createdAt: row.created_at ?? "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchSlots();
    const channel = supabase.channel("admin_community_slots")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_slots" }, () => fetchSlots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSlots, isAdmin]);

  // ─── RBAC guard — after all hooks ───
  if (user && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10 rounded-3xl max-w-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", backdropFilter: "blur(20px)" }}>
          <Shield size={40} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">403 — Unauthorized</h2>
          <p className="text-sm text-white/50">You don't have permission to access this area.</p>
        </motion.div>
      </div>
    );
  }


  const handleApprove = async (slot: Slot) => {
    const { error } = await supabase.from("community_slots").update({ status: "approved" }).eq("id", slot.id);
    if (error) toast.error("Failed to approve");
    else { toast.success(`✅ "${slot.projectName}" approved!`); fetchSlots(); }
  };

  const handleReject = async (slot: Slot) => {
    const { error } = await supabase.from("community_slots").delete().eq("id", slot.id);
    if (error) toast.error("Failed to reject");
    else { toast.success("Slot cleared."); fetchSlots(); }
  };

  const pendingSlots = slots.filter((s) => s.status === "pending");
  const approvedSlots = slots.filter((s) => s.status === "approved");
  const visibleSlots = tab === "pending" ? pendingSlots : tab === "approved" ? approvedSlots : slots;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)" }}>
      <SEO title="Community Admin" description="Manage community board submissions." />
      <div className="px-6 md:px-10 py-8 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck size={22} className="text-indigo-400" /> Command Center
            </h2>
            <p className="text-sm text-white/40 mt-0.5">Manage the Aurora community platform.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </div>
            <button onClick={fetchSlots} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Admin Tab Switcher */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["overview", "directory", "logs"] as AdminTab[]).map((t) => (
            <button key={t} onClick={() => setAdminTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${adminTab === t ? "bg-indigo-500 text-white shadow" : "text-white/40 hover:text-white"}`}>
              {t === "overview" ? "Overview" : t === "directory" ? "User Directory" : "System Logs"}
            </button>
          ))}
        </div>

        {adminTab === "overview" && (
          <>
            {/* KPI Row — based on real slot data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Users} label="Total Submissions" value={String(slots.length)} sub={`${approvedSlots.length} approved`} />
              <KpiCard icon={Cpu} label="Live Slots" value={String(approvedSlots.length)} sub="Visible on board" subColor="text-blue-400" />
              <KpiCard icon={AlertTriangle} label="Pending Review" value={String(pendingSlots.length)} sub={pendingSlots.length > 0 ? "Requires attention" : "All clear"} subColor={pendingSlots.length > 0 ? "text-red-400" : "text-emerald-400"} pulse={pendingSlots.length > 0} />
              <KpiCard icon={Activity} label="Available Slots" value={String(Math.max(0, 18 - slots.length))} sub="Free to claim" subColor="text-amber-400" />
            </div>

            {/* Two-col split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent submissions */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Activity size={14} className="text-indigo-400" /> Recent Submissions</h3>
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">No submissions yet</div>
                ) : (
                  <div>
                    {slots.slice(0, 6).map((slot, i) => (
                      <div key={slot.id} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                          {slot.projectName?.[0] ?? "#"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80"><span className="font-semibold text-white">{slot.projectName || "Unnamed project"}</span> submitted slot #{slot.slotIndex}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">{timeAgo(slot.createdAt)}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${slot.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {slot.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Moderation Queue */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-400" /> Moderation Queue</h3>
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">No pending reports</div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{r.project}</p>
                            <p className="text-xs text-red-400/80 mt-0.5">{r.reason}</p>
                            <p className="text-[10px] text-white/30 mt-1">{r.user}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setReports(p => p.filter(x => x.id !== r.id))}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors" style={{ border: "1px solid rgba(34,197,94,0.2)" }}>
                              Dismiss
                            </button>
                            <button onClick={() => { toast.success(`${r.project} taken down.`); setReports(p => p.filter(x => x.id !== r.id)); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                              Takedown
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Slot Review below reports */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Slot Submissions</h3>
                  <div className="flex gap-2 border-b mb-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    {(["pending", "approved", "all"] as const).map((t) => (
                      <button key={t} onClick={() => setTab(t)}
                        className={`px-3 py-1.5 text-xs font-medium capitalize border-b-2 -mb-px transition-all ${tab === t ? "border-indigo-400 text-white" : "border-transparent text-white/40 hover:text-white"}`}>
                        {t}
                        {t === "pending" && pendingSlots.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{pendingSlots.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-white/30" /></div>
                  ) : visibleSlots.length === 0 ? (
                    <p className="text-center text-xs text-white/30 py-6">Nothing here</p>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {visibleSlots.map((slot) => (
                          <motion.div key={slot.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                              {slot.thumbnailUrl ? (
                                <img src={slot.thumbnailUrl} alt={slot.projectName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-base font-bold text-indigo-400">{slot.projectName?.[0] ?? "?"}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{slot.projectName || "—"}</p>
                              {slot.websiteUrl && (
                                <a href={slot.websiteUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] text-white/30 hover:text-indigo-400 flex items-center gap-1 truncate">
                                  {slot.websiteUrl}<ExternalLink size={8} className="shrink-0" />
                                </a>
                              )}
                              <p className="text-[10px] text-white/20 mt-0.5">Slot #{slot.slotIndex} · {timeAgo(slot.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {slot.status === "pending" && (
                                <button onClick={() => handleApprove(slot)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors" style={{ border: "1px solid rgba(34,197,94,0.2)" }}>
                                  <CheckCircle size={11} /> Approve
                                </button>
                              )}
                              <button onClick={() => handleReject(slot)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
                                {slot.status === "approved" ? <><Trash2 size={11} /> Remove</> : <><X size={11} /> Reject</>}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {adminTab === "directory" && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Search size={13} className="text-white/30" />
              <input placeholder="Search submissions…" className="bg-transparent text-sm outline-none text-white placeholder:text-white/20 flex-1" />
              <span className="text-xs text-white/30">{slots.length} entries</span>
            </div>
            {slots.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">No submissions yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Project", "URL", "Slot", "Status", "Submitted", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id} className="transition-colors hover:bg-white/[0.03]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.2)" }}>
                            {slot.thumbnailUrl ? <img src={slot.thumbnailUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-[11px] font-bold text-indigo-400">{slot.projectName?.[0] ?? "?"}</span>}
                          </div>
                          <span className="text-white/80 font-medium text-xs">{slot.projectName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs max-w-[120px] truncate">{slot.websiteUrl || "—"}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">#{slot.slotIndex}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{
                          background: slot.status === "approved" ? "rgba(34,197,94,0.15)" : slot.status === "pending" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)",
                          color: slot.status === "approved" ? "#4ade80" : slot.status === "pending" ? "#fbbf24" : "rgba(255,255,255,0.4)",
                        }}>{slot.status}</span>
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs">{timeAgo(slot.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/60 transition-colors"><MoreHorizontal size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {adminTab === "logs" && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Ban size={13} className="text-indigo-400" />
              <span className="text-sm font-semibold text-white">System Logs</span>
              <span className="ml-auto text-xs text-white/30">Today</span>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {MOCK_LOGS.map((log, i) => (
                <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-[10px] text-white/20 font-mono shrink-0 mt-0.5">{log.time}</span>
                  <span className="text-xs font-medium text-indigo-400 shrink-0">{log.event}</span>
                  <span className="text-xs text-white/40 truncate">{log.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating pending banner */}
        <AnimatePresence>
          {pendingSlots.length > 0 && adminTab !== "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium cursor-pointer z-50 shadow-lg"
              style={{ background: "#f59e0b", color: "#fff" }}
              onClick={() => setAdminTab("overview")}>
              <AlertTriangle size={15} />
              {pendingSlots.length} pending submission{pendingSlots.length > 1 ? "s" : ""}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CommunityAdminView;
