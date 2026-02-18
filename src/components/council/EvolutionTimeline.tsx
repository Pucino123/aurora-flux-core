import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, RotateCcw, Loader2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import CouncilAvatar from "./CouncilAvatar";

const db = supabase as any;

interface Version {
  id: string;
  version_number: number;
  content: string;
  change_summary: string | null;
  influenced_by: string | null;
  consensus_score: number | null;
  created_at: string;
}

interface EvolutionTimelineProps {
  ideaId: string;
  ideaContent: string;
  userId: string;
  consensusScore: number | null;
  personas: { key: string; name: string; color: string }[];
  onRevert: (content: string) => void;
}

const EvolutionTimeline = ({ ideaId, ideaContent, userId, consensusScore, personas, onRevert }: EvolutionTimelineProps) => {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [influencedBy, setInfluencedBy] = useState<string | null>(null);

  useEffect(() => {
    if (open && ideaId) loadVersions();
  }, [open, ideaId]);

  const loadVersions = async () => {
    const { data } = await db
      .from("idea_versions")
      .select("*")
      .eq("idea_id", ideaId)
      .order("version_number", { ascending: true });
    setVersions((data as Version[]) || []);
  };

  const saveVersion = async () => {
    if (!editContent.trim() || loading) return;
    setLoading(true);

    try {
      // Save current as new version
      const nextVersion = versions.length + 1;
      const { data } = await db
        .from("idea_versions")
        .insert({
          idea_id: ideaId,
          user_id: userId,
          version_number: nextVersion,
          content: editContent.trim(),
          change_summary: changeSummary || null,
          influenced_by: influencedBy,
          consensus_score: consensusScore,
        })
        .select()
        .single();

      // Update the idea content
      await db.from("council_ideas").update({ content: editContent.trim() }).eq("id", ideaId);

      if (data) setVersions((prev) => [...prev, data]);
      onRevert(editContent.trim());
      setEditing(false);
      setChangeSummary("");
      setInfluencedBy(null);
      toast.success(t("council.version_saved"));
    } catch (e) {
      console.error("Version save error:", e);
      toast.error(t("council.error"));
    } finally {
      setLoading(false);
    }
  };

  const revertToVersion = async (version: Version) => {
    await db.from("council_ideas").update({ content: version.content }).eq("id", ideaId);
    onRevert(version.content);
    toast.success(t("council.reverted_to", { v: String(version.version_number) }));
  };

  const startEdit = () => {
    setEditContent(ideaContent);
    setEditing(true);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border border-green-500/20 transition-all"
      >
        <GitBranch size={14} className="text-green-500" />
        🧬 {t("council.evolution")}
        {versions.length > 0 && <span className="text-[10px] opacity-60">(v{versions.length})</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 space-y-3"
          >
            {/* Edit button */}
            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Pencil size={12} />
                {t("council.evolve_idea")}
              </button>
            )}

            {/* Edit form */}
            {editing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card border border-green-500/20 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-secondary/30 rounded-lg p-2 text-sm outline-none resize-none min-h-[80px]"
                />
                <input
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder={t("council.change_summary_ph")}
                  className="w-full bg-secondary/30 rounded-lg p-2 text-xs outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{t("council.influenced_by")}:</span>
                  {personas.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setInfluencedBy(influencedBy === p.key ? null : p.key)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        influencedBy === p.key ? "scale-125 border-foreground" : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={saveVersion}
                    disabled={loading || !editContent.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-600 hover:bg-green-500/25 transition-colors"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {t("council.save_version")}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <X size={12} />
                    {t("input.cancel")}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Timeline */}
            {versions.length > 0 && (
              <div className="relative pl-4 border-l-2 border-green-500/20 space-y-3">
                {/* Original */}
                <div className="relative">
                  <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-secondary border-2 border-green-500/40" />
                  <div className="p-2 rounded-lg bg-secondary/30">
                    <p className="text-[10px] font-bold text-muted-foreground">v0 — Original</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ideaContent.slice(0, 80)}...</p>
                  </div>
                </div>

                {versions.map((v) => {
                  const influencer = personas.find((p) => p.key === v.influenced_by);
                  return (
                    <div key={v.id} className="relative">
                      <div
                        className="absolute -left-[21px] w-3 h-3 rounded-full border-2"
                        style={{
                          backgroundColor: influencer?.color || "hsl(var(--secondary))",
                          borderColor: influencer?.color || "hsl(var(--border))",
                        }}
                      />
                      <div className="p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold">v{v.version_number}</span>
                          {influencer && (
                            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <CouncilAvatar color={influencer.color} size={14} />
                              {influencer.name}
                            </span>
                          )}
                          {v.consensus_score !== null && (
                            <span className="text-[9px] font-bold" style={{ color: v.consensus_score >= 0 ? "hsl(150 60% 45%)" : "hsl(0 84% 60%)" }}>
                              {v.consensus_score > 0 ? "+" : ""}{v.consensus_score}
                            </span>
                          )}
                        </div>
                        {v.change_summary && (
                          <p className="text-[10px] text-muted-foreground italic mb-0.5">{v.change_summary}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate">{v.content.slice(0, 80)}...</p>
                        <button
                          onClick={() => revertToVersion(v)}
                          className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RotateCcw size={9} />
                          {t("council.revert")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {versions.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">{t("council.no_versions")}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EvolutionTimeline;
