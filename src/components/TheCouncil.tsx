import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, ChevronDown, ChevronUp, Clock, X, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { useFlux } from "@/context/FluxContext";
import CouncilAvatar from "./council/CouncilAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import CouncilThread from "./council/CouncilThread";
import CouncilIdeasList from "./council/CouncilIdeasList";
import CouncilDashboard from "./council/CouncilDashboard";
import StickyNote from "./council/StickyNote";
import TypewriterText from "./council/TypewriterText";
import PersonaProfile from "./council/PersonaProfile";
import SimulationPanel from "./council/SimulationPanel";
import DebateMode from "./council/DebateMode";
import EvolutionTimeline from "./council/EvolutionTimeline";
import DecisionScoreCard from "./council/DecisionScoreCard";
import ExecutionPipeline from "./council/ExecutionPipeline";
import WeaknessScanner from "./council/WeaknessScanner";
import PersonalityControls from "./council/PersonalityControls";
import VoteTooltip from "./council/VoteTooltip";
import ProactiveIntelligence from "./council/ProactiveIntelligence";

// ── Types ──

interface PersonaResponse {
  id?: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  analysis: string;
  vote: string;
  voteScore: number;
  personaKey: string;
  threads: { id: string; user_message: string; persona_reply: string; created_at: string }[];
}

interface IdeaSummary {
  id: string;
  content: string;
  consensus_score: number | null;
  starred: boolean;
  created_at: string;
}

interface StickyNoteData {
  id: string;
  parent_id: string;
  parent_type: string;
  content: string;
  color: string;
  collapsed: boolean;
  emoji_reaction: string | null;
  priority_flag: string | null;
}

// ── Constants ──

export const PERSONAS = [
  { key: "strategist", emoji: "🔮", name: "council.violet", color: "hsl(270 70% 65%)", bgColor: "hsl(270 70% 95%)", noteColor: "purple", subtitle: "The Strategist" },
  { key: "operator", emoji: "🌿", name: "council.leaf", color: "hsl(150 60% 45%)", bgColor: "hsl(150 60% 95%)", noteColor: "green", subtitle: "The Operator" },
  { key: "skeptic", emoji: "🌹", name: "council.rose", color: "hsl(330 70% 65%)", bgColor: "hsl(330 70% 95%)", noteColor: "pink", subtitle: "The Skeptic" },
  { key: "advocate", emoji: "💧", name: "council.blue", color: "hsl(217 90% 70%)", bgColor: "hsl(217 90% 95%)", noteColor: "blue", subtitle: "The Analyst" },
  { key: "growth", emoji: "☀️", name: "council.sunny", color: "hsl(45 90% 55%)", bgColor: "hsl(45 90% 95%)", noteColor: "yellow", subtitle: "The Optimist" },
];

const voteLabels: Record<string, { label: string; score: number }> = {
  GO: { label: "GO", score: 2 },
  EXPERIMENT: { label: "EXPERIMENT", score: 1 },
  PIVOT: { label: "PIVOT", score: 0 },
  KILL: { label: "KILL", score: -2 },
};

// ── Component ──

const TheCouncil = () => {
  const { user } = useAuth();
  const { filterPersona } = useFlux();
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<PersonaResponse[]>([]);
  const [consensusScore, setConsensusScore] = useState<number | null>(null);
  const [biasData, setBiasData] = useState<{ axis: string; value: number }[]>([]);
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [activeIdeaContent, setActiveIdeaContent] = useState("");
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [speakingPersona, setSpeakingPersona] = useState<string | null>(null);
  const [isNewResponse, setIsNewResponse] = useState(false);
  const [profilePersona, setProfilePersona] = useState<string | null>(null);
  const [personaIntensities, setPersonaIntensities] = useState<Record<string, { aggression: number; risk: number; creativity: number }>>({});
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreviousIdeas, setShowPreviousIdeas] = useState(false);
  const [showDebatePanel, setShowDebatePanel] = useState(false);
  const [dashStats, setDashStats] = useState({ totalIdeas: 0, totalVotes: 0, totalThreads: 0, totalNotes: 0, personaStats: [] as any[] });

  // Detect strong disagreement for auto-debate
  const hasStrongDisagreement = responses.length > 0 && (() => {
    const scores = responses.map(r => r.voteScore);
    return Math.max(...scores) - Math.min(...scores) >= 3;
  })();

  // ── Data Loading (unchanged logic) ──

  useEffect(() => { if (user) loadIdeas(); }, [user]);

  const loadIdeas = async () => {
    if (!user) return;
    const { data } = await supabase.from("council_ideas").select("id, content, consensus_score, starred, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (data) setIdeas(data);
  };

  const loadIdea = async (ideaId: string) => {
    if (!user) return;
    setActiveIdeaId(ideaId);
    setIsNewResponse(false);
    setExpandedPersona(null);
    setShowPreviousIdeas(false);

    const { data: respData } = await supabase.from("council_responses").select("*").eq("idea_id", ideaId).eq("user_id", user.id);
    const { data: threadData } = await supabase.from("council_threads").select("*").eq("user_id", user.id).in("response_id", (respData || []).map((r: any) => r.id));
    const { data: ideaData } = await supabase.from("council_ideas").select("*").eq("id", ideaId).single();

    if (ideaData) {
      setActiveIdeaContent(ideaData.content);
      setConsensusScore(ideaData.consensus_score);
      setBiasData(Array.isArray(ideaData.bias_radar) ? (ideaData.bias_radar as any[]) : []);
    }

    if (respData) {
      setResponses(respData.map((r: any) => {
        const persona = PERSONAS.find((p) => p.key === r.persona_key) || PERSONAS[0];
        const threads = (threadData || []).filter((th: any) => th.response_id === r.id);
        return { id: r.id, name: t(persona.name), emoji: persona.emoji, color: persona.color, bgColor: persona.bgColor, analysis: r.analysis, vote: r.vote, voteScore: r.vote_score, personaKey: r.persona_key, threads };
      }));
    }

    const { data: notes } = await supabase.from("council_sticky_notes").select("*").eq("parent_id", ideaId).eq("user_id", user.id);
    setStickyNotes(notes || []);
  };

  const loadDashboard = async () => {
    if (!user) return;
    setShowDashboard(true);
    const [{ count: ideaCount }, { count: voteCount }, { count: threadCount }, { count: noteCount }] = await Promise.all([
      supabase.from("council_ideas").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("council_responses").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("council_threads").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("council_sticky_notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const { data: allResp } = await supabase.from("council_responses").select("persona_key, vote").eq("user_id", user.id);
    const personaStats = PERSONAS.map((p) => {
      const items = (allResp || []).filter((r: any) => r.persona_key === p.key);
      return { persona_key: p.key, total: items.length, go_count: items.filter((r: any) => r.vote === "GO").length, experiment_count: items.filter((r: any) => r.vote === "EXPERIMENT").length, pivot_count: items.filter((r: any) => r.vote === "PIVOT").length, kill_count: items.filter((r: any) => r.vote === "KILL").length };
    });
    setDashStats({ totalIdeas: ideaCount || 0, totalVotes: voteCount || 0, totalThreads: threadCount || 0, totalNotes: noteCount || 0, personaStats });
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading || !user) return;
    setLoading(true);
    setResponses([]);
    setConsensusScore(null);
    setStickyNotes([]);
    setShowDashboard(false);
    setExpandedPersona(null);
    setShowPreviousIdeas(false);
    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", { body: { type: "council", messages: [{ role: "user", content: input.trim() }] } });
      if (error) throw error;
      if (data?.personas) {
        const total = data.personas.reduce((s: number, p: any) => s + (voteLabels[p.vote]?.score ?? 0), 0);
        const { data: idea, error: ideaErr } = await supabase.from("council_ideas").insert({ user_id: user.id, content: input.trim(), consensus_score: total, bias_radar: data.bias_radar || [] }).select().single();
        if (ideaErr) throw ideaErr;
        const responseInserts = data.personas.map((p: any, i: number) => ({ idea_id: idea.id, user_id: user.id, persona_key: PERSONAS[i].key, analysis: p.analysis || "", vote: p.vote || "EXPERIMENT", vote_score: voteLabels[p.vote]?.score ?? 0 }));
        const { data: savedResp, error: respErr } = await supabase.from("council_responses").insert(responseInserts).select();
        if (respErr) throw respErr;
        const mapped: PersonaResponse[] = data.personas.map((p: any, i: number) => {
          const saved = savedResp?.find((r: any) => r.persona_key === PERSONAS[i].key);
          return { id: saved?.id, ...PERSONAS[i], name: t(PERSONAS[i].name), analysis: p.analysis || "", vote: p.vote || "EXPERIMENT", voteScore: voteLabels[p.vote]?.score ?? 0, personaKey: PERSONAS[i].key, threads: [] };
        });
        setResponses(mapped);
        setIsNewResponse(true);
        setConsensusScore(total);
        setActiveIdeaId(idea.id);
        setActiveIdeaContent(input.trim());
        if (data.bias_radar) setBiasData(data.bias_radar);
        for (let i = 0; i < PERSONAS.length; i++) { setSpeakingPersona(PERSONAS[i].key); await new Promise((r) => setTimeout(r, 600)); }
        setSpeakingPersona(null);
        loadIdeas();
        setInput("");
      }
    } catch (e: any) { console.error("Council error:", e); toast.error(t("council.error")); }
    finally { setLoading(false); }
  };

  const handleToggleStar = async (ideaId: string, starred: boolean) => { await supabase.from("council_ideas").update({ starred }).eq("id", ideaId); setIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, starred } : i))); };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!user) return;
    try {
      const { data: respData } = await supabase.from("council_responses").select("id").eq("idea_id", ideaId).eq("user_id", user.id);
      const respIds = (respData || []).map((r: any) => r.id);
      await Promise.all([
        supabase.from("council_sticky_notes").delete().eq("parent_id", ideaId).eq("user_id", user.id),
        supabase.from("council_simulations").delete().eq("idea_id", ideaId).eq("user_id", user.id),
        supabase.from("council_decision_scores").delete().eq("idea_id", ideaId).eq("user_id", user.id),
        supabase.from("council_debates").delete().eq("idea_id", ideaId).eq("user_id", user.id),
        supabase.from("idea_versions").delete().eq("idea_id", ideaId).eq("user_id", user.id),
        ...(respIds.length > 0 ? [supabase.from("council_threads").delete().in("response_id", respIds).eq("user_id", user.id)] : []),
      ]);
      await supabase.from("council_responses").delete().eq("idea_id", ideaId).eq("user_id", user.id);
      await supabase.from("council_ideas").delete().eq("id", ideaId).eq("user_id", user.id);
      if (activeIdeaId === ideaId) { setActiveIdeaId(null); setActiveIdeaContent(""); setResponses([]); setConsensusScore(null); setBiasData([]); setStickyNotes([]); }
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      toast.success("Idé slettet");
    } catch (e: any) { console.error("Delete idea error:", e); toast.error("Kunne ikke slette idé"); }
  };

  const handleAddStickyNote = async (parentId: string, color: string) => { if (!user) return; const { data } = await supabase.from("council_sticky_notes").insert({ user_id: user.id, parent_id: parentId, parent_type: "idea", color, content: "" }).select().single(); if (data) setStickyNotes((prev) => [...prev, data]); };
  const handleUpdateStickyNote = async (id: string, updates: any) => { await supabase.from("council_sticky_notes").update(updates).eq("id", id); setStickyNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n))); };
  const handleDeleteStickyNote = async (id: string) => { await supabase.from("council_sticky_notes").delete().eq("id", id); setStickyNotes((prev) => prev.filter((n) => n.id !== id)); toast.success(t("council.note_deleted")); };
  const handleThreadAdded = (responseId: string, thread: any) => { setResponses((prev) => prev.map((r) => (r.id === responseId ? { ...r, threads: [...r.threads, thread] } : r))); };

  const handleBackToInput = () => {
    setActiveIdeaId(null);
    setActiveIdeaContent("");
    setResponses([]);
    setConsensusScore(null);
    setBiasData([]);
    setStickyNotes([]);
    setShowAdvanced(false);
    setShowDebatePanel(false);
    setExpandedPersona(null);
  };

  const getGaugeLabel = (score: number) => {
    if (score >= 7) return { label: t("council.strong_go"), color: "hsl(150 60% 45%)" };
    if (score >= 3) return { label: t("council.go"), color: "hsl(150 60% 55%)" };
    if (score >= 0) return { label: t("council.experiment"), color: "hsl(45 90% 55%)" };
    if (score >= -3) return { label: t("council.pivot"), color: "hsl(30 90% 55%)" };
    return { label: t("council.kill"), color: "hsl(0 84% 60%)" };
  };

  const filteredResponses = responses.filter((p) => !filterPersona || p.personaKey === filterPersona);
  const hasResults = responses.length > 0 || loading;

  // ── Render ──

  return (
    <div className="flex-1 overflow-y-auto h-full">
      {/* Full-page gradient background */}
      <div className="council-hero-gradient relative min-h-screen overflow-hidden">
        {/* Ambient blobs — slowed down */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[hsl(25_80%_75%/0.05)] blur-[120px] animate-aurora-slow-1" />
          <div className="absolute top-[10%] right-[-15%] w-[50%] h-[50%] rounded-full bg-[hsl(330_70%_75%/0.04)] blur-[120px] animate-aurora-slow-2" />
          <div className="absolute bottom-[-10%] left-[20%] w-[55%] h-[55%] rounded-full bg-[hsl(217_80%_75%/0.04)] blur-[120px] animate-aurora-slow-3" />
        </div>

        {/* Dashboard view */}
        {showDashboard && (
          <div className="relative z-10 px-4 md:px-8 pb-8 pt-6 max-w-4xl mx-auto">
            <button
              onClick={() => setShowDashboard(false)}
              className="mb-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/8 text-foreground/70 hover:bg-black/12 backdrop-blur-md transition-all border border-black/10"
            >
              <X size={12} />
              {t("council.back_to_council")}
            </button>
            <CouncilDashboard {...dashStats} />
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        {!showDashboard && (
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {!hasResults ? (
                /* ═══ FULL-SCREEN CENTERED INPUT ═══ */
                <motion.div
                  key="fullscreen-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, scale: 0.97 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center px-4 md:px-8"
                  style={{ minHeight: "calc(100vh - 60px)" }}
                >
                  {/* Avatars */}
                  <div className="flex justify-center items-end gap-1 sm:gap-2 mb-[-18px] sm:mb-[-22px] relative z-20">
                    {PERSONAS.map((p, i) => {
                      const isCenter = i === 2;
                      const baseSize = isMobile ? 38 : 52;
                      const size = isCenter ? baseSize + (isMobile ? 12 : 16) : baseSize;
                      return (
                        <motion.button
                          key={p.key}
                          initial={{ opacity: 0, y: 24, scale: 0.7 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 200 }}
                          whileHover={{ scale: 1.15, y: -6 }}
                          onClick={() => setProfilePersona(p.key)}
                          className="relative group"
                          style={{ marginBottom: isCenter ? 0 : i === 1 || i === 3 ? 4 : 10 }}
                        >
                          <div className="absolute -inset-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${p.color}35 0%, transparent 70%)` }} />
                          <CouncilAvatar color={p.color} size={size} />
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Glass card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 160 }}
                    className={`council-glass-card relative w-full max-w-xl p-6 sm:p-8 pt-8 sm:pt-10 ${inputFocused ? "council-glass-card--focused" : ""}`}
                  >
                    {/* Shimmer */}
                    <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
                      <motion.div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{ background: "linear-gradient(105deg, transparent 38%, hsl(var(--aurora-violet) / 0.4) 44%, hsl(var(--aurora-pink) / 0.4) 56%, transparent 62%)", backgroundSize: "200% 100%" }}
                        animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                    </div>

                    <div className="relative z-10">
                      {/* Persona dots */}
                      <div className="flex justify-center flex-wrap gap-3 mb-5">
                        {PERSONAS.map((p) => (
                          <button key={p.key} onClick={() => setProfilePersona(p.key)} className="flex items-center gap-1.5 group">
                            <div className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-150" style={{ backgroundColor: p.color }} />
                            <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">{t(p.name)}</span>
                          </button>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        placeholder={t("council.placeholder") || "Beskriv din idé, strategi eller beslutning…"}
                        rows={isMobile ? 3 : 4}
                        className="w-full bg-white/50 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 outline-none text-sm sm:text-base resize-none border border-white/60 placeholder:text-muted-foreground/40 focus:border-[hsl(var(--aurora-violet)/0.3)] focus:bg-white/70 transition-all duration-300 leading-relaxed"
                        disabled={loading}
                      />

                      {/* Submit */}
                      <motion.button
                        onClick={handleSubmit}
                        disabled={loading || !input.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all shadow-lg council-submit-btn"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {t("council.submit") || "Indsend til Rådet"}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Toggle previous ideas */}
                  {ideas.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      onClick={() => setShowPreviousIdeas(!showPreviousIdeas)}
                      className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-black/8 text-foreground/70 hover:bg-black/12 backdrop-blur-md transition-all border border-black/10"
                    >
                      <Clock size={13} />
                      {showPreviousIdeas ? "Skjul tidligere idéer" : `Tidligere idéer (${ideas.length})`}
                      <motion.div animate={{ rotate: showPreviousIdeas ? 180 : 0 }}>
                        <ChevronDown size={13} />
                      </motion.div>
                    </motion.button>
                  )}

                  {/* Previous ideas panel */}
                  <AnimatePresence>
                    {showPreviousIdeas && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35 }}
                        className="w-full max-w-2xl mt-4 overflow-hidden"
                      >
                        <div className="council-glass-card p-4 sm:p-5 max-h-[50vh] overflow-y-auto council-hidden-scrollbar">
                          {user && <ProactiveIntelligence userId={user.id} onNavigateToIdea={loadIdea} />}
                          <CouncilIdeasList ideas={ideas} activeId={activeIdeaId} onSelect={loadIdea} onToggleStar={handleToggleStar} onDelete={handleDeleteIdea} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                /* ═══ 3-COLUMN RESULTS LAYOUT ═══ */
                <motion.div
                  key="results-layout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="px-3 sm:px-4 md:px-6 lg:px-8 pb-8 pt-4 md:pt-6"
                >
                  {/* Question title — prominent at top */}
                  {activeIdeaContent && (
                    <motion.div
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 md:mb-6"
                    >
                      <button
                        onClick={handleBackToInput}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-black/8 text-foreground/70 hover:bg-black/12 backdrop-blur-md transition-all border border-black/10 mb-3"
                      >
                        <X size={12} />
                        Ny idé
                      </button>
                      <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold font-display leading-snug max-w-3xl" style={{ background: "linear-gradient(135deg, hsl(270 60% 40%), hsl(330 60% 45%), hsl(217 70% 45%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {activeIdeaContent}
                      </h1>
                    </motion.div>
                  )}

                  {/* 3-column grid */}
                  <div className={`grid gap-4 md:gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"}`}>
                    {/* ═══ LEFT COLUMN: Input + Idea ═══ */}
                    <div className="space-y-4">
                      {/* Compact input card */}
                      <div className="council-glass-card p-4">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          placeholder="Ny idé eller opfølgning…"
                          rows={2}
                          className="w-full bg-white/50 rounded-xl px-3 py-2.5 outline-none text-sm resize-none border border-white/60 placeholder:text-muted-foreground/40 focus:border-[hsl(var(--aurora-violet)/0.3)] focus:bg-white/70 transition-all duration-300"
                          disabled={loading}
                        />
                        <motion.button
                          onClick={handleSubmit}
                          disabled={loading || !input.trim()}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all council-submit-btn"
                        >
                          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Indsend
                        </motion.button>
                      </div>

                      {/* Previous ideas toggle */}
                      {ideas.length > 0 && (
                        <>
                          <button
                            onClick={() => setShowPreviousIdeas(!showPreviousIdeas)}
                            className="flex items-center gap-2 text-[11px] text-foreground/50 hover:text-foreground/80 transition-colors"
                          >
                            <Clock size={12} />
                            {showPreviousIdeas ? "Skjul" : `Tidligere idéer (${ideas.length})`}
                            <motion.div animate={{ rotate: showPreviousIdeas ? 180 : 0 }}><ChevronDown size={12} /></motion.div>
                          </button>
                          <AnimatePresence>
                            {showPreviousIdeas && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="council-glass-card p-3 max-h-[40vh] overflow-y-auto council-hidden-scrollbar">
                                  <CouncilIdeasList ideas={ideas} activeId={activeIdeaId} onSelect={loadIdea} onToggleStar={handleToggleStar} onDelete={handleDeleteIdea} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}

                      {/* Advanced tools — left column */}
                      {responses.length > 0 && activeIdeaId && user && (
                        <>
                          <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-[11px] text-foreground/50 hover:text-foreground/80 transition-colors"
                          >
                            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {showAdvanced ? "Skjul avancerede værktøjer" : "Avancerede værktøjer"}
                          </button>
                          <AnimatePresence>
                            {showAdvanced && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-3"
                              >
                                <DecisionScoreCard ideaId={activeIdeaId} userId={user.id} responses={responses} />
                                <PersonalityControls
                                  personas={PERSONAS.map((p) => ({ ...p, name: t(p.name) }))}
                                  intensities={personaIntensities}
                                  onChange={(key, intensity) => setPersonaIntensities((prev) => ({ ...prev, [key]: intensity }))}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <SimulationPanel ideaId={activeIdeaId} ideaContent={activeIdeaContent} userId={user.id} personas={PERSONAS.map((p) => ({ ...p, name: t(p.name) }))} />
                                  <EvolutionTimeline ideaId={activeIdeaId} ideaContent={activeIdeaContent} userId={user.id} consensusScore={consensusScore} personas={PERSONAS.map((p) => ({ ...p, name: t(p.name) }))} onRevert={(content) => setActiveIdeaContent(content)} />
                                  <ExecutionPipeline ideaId={activeIdeaId} ideaContent={activeIdeaContent} userId={user.id} onCreateTasks={() => toast.success(t("council.tasks_created"))} />
                                  <WeaknessScanner ideaId={activeIdeaId} ideaContent={activeIdeaContent} personas={PERSONAS.map((p) => ({ ...p, name: t(p.name) }))} />
                                </div>
                                {stickyNotes.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {stickyNotes.map((note) => (
                                      <StickyNote key={note.id} id={note.id} content={note.content} color={note.color} collapsed={note.collapsed} emojiReaction={note.emoji_reaction} priorityFlag={note.priority_flag} onUpdate={handleUpdateStickyNote} onDelete={handleDeleteStickyNote} />
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-foreground/40 mr-1">{t("council.add_note")}:</span>
                                  {PERSONAS.map((p) => (
                                    <button key={p.key} onClick={() => handleAddStickyNote(activeIdeaId!, p.noteColor)} className="w-4 h-4 rounded shadow-sm hover:scale-125 transition-transform" style={{ backgroundColor: p.color }} title={t(p.name)} />
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>

                    {/* ═══ MIDDLE COLUMN: Consensus + Radar ═══ */}
                    <div className="space-y-4">
                      {/* Consensus Meter */}
                      <AnimatePresence>
                        {consensusScore !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="council-glass-card p-5"
                          >
                            <h3 className="text-xs sm:text-sm font-bold text-foreground/50 uppercase tracking-wider mb-3">Konsensus</h3>
                            <div className="flex items-center gap-3 mb-3">
                              <motion.span
                                className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display"
                                style={{ color: getGaugeLabel(consensusScore).color }}
                                initial={{ scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200 }}
                              >
                                {consensusScore > 0 ? "+" : ""}{consensusScore}
                              </motion.span>
                              <motion.span
                                className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold"
                                style={{ backgroundColor: `${getGaugeLabel(consensusScore).color}20`, color: getGaugeLabel(consensusScore).color }}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 }}
                              >
                                {getGaugeLabel(consensusScore).label}
                              </motion.span>
                            </div>
                            <div className="h-2.5 rounded-full bg-black/10 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: getGaugeLabel(consensusScore).color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, Math.max(5, ((consensusScore + 10) / 20) * 100))}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Radar Chart + Summary */}
                      {biasData.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="council-glass-card p-4 sm:p-5"
                        >
                          <h3 className="text-xs sm:text-sm font-bold text-foreground/50 uppercase tracking-wider mb-2">Bias Radar</h3>
                          <div className="w-full h-[320px] sm:h-[400px] lg:h-[460px] mx-auto">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={biasData} cx="50%" cy="50%" outerRadius="75%">
                                <PolarGrid stroke="hsl(0 0% 50% / 0.2)" />
                                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "hsl(240 10% 30%)", fontWeight: 600 }} tickLine={false} />
                                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Council Summary */}
                          {responses.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-black/8 space-y-4">
                              <h4 className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider">Resumé</h4>
                              {(() => {
                                const positives = responses.filter(r => r.voteScore >= 1);
                                const negatives = responses.filter(r => r.voteScore <= -1);
                                const neutrals = responses.filter(r => r.voteScore === 0);

                                const getSentences = (text: string, count: number) => {
                                  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                                  return sentences.slice(0, count).map(s => s.trim()).join(" ");
                                };

                                const renderGroup = (items: typeof responses, icon: string, iconClass: string, label: string) => {
                                  if (items.length === 0) return null;
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${iconClass}`}>{icon} {label}</span>
                                      </div>
                                      {items.map(r => (
                                        <div key={r.personaKey} className="flex gap-2 pl-3 border-l-2" style={{ borderColor: r.color }}>
                                          <div className="min-w-0 w-full">
                                            <div className="flex items-center gap-1.5 mb-0.5 flex-nowrap">
                                              <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: r.color }}>{r.name}</span>
                                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: `${r.color}15`, color: r.color }}>
                                                {r.vote === "GO" ? "Støtter" : r.vote === "EXPERIMENT" ? "Åben" : r.vote === "PIVOT" ? "Bekymret" : r.vote === "KILL" ? "Fraråder" : r.vote}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-foreground/65 leading-snug break-words">
                                              {getSentences(r.analysis, 2)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                };

                                return (
                                  <>
                                    {renderGroup(positives, "▲", "text-[hsl(150_60%_45%)]", "Positive")}
                                    {renderGroup(negatives, "▼", "text-destructive", "Negative")}
                                    {renderGroup(neutrals, "◆", "text-foreground/40", "Neutrale")}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Debate — only shown via banner button */}
                      {showDebatePanel && activeIdeaId && user && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <DebateMode ideaId={activeIdeaId} ideaContent={activeIdeaContent} userId={user.id} responses={responses} personas={PERSONAS.map((p) => ({ ...p, name: t(p.name) }))} />
                        </motion.div>
                      )}

                      {/* Proactive Intelligence */}
                      {user && <ProactiveIntelligence userId={user.id} onNavigateToIdea={loadIdea} />}

                      {/* Loading state */}
                      {loading && (
                        <div className="council-glass-card p-4 space-y-3">
                          <h3 className="text-xs sm:text-sm font-bold text-foreground/50 uppercase tracking-wider">Rådet tænker…</h3>
                          {PERSONAS.map((p, i) => (
                            <motion.div
                              key={p.key}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-center gap-3 animate-pulse"
                            >
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-xs sm:text-sm font-medium text-foreground/70 w-14 shrink-0">{t(p.name)}</span>
                              <div className="flex-1 space-y-1">
                                <div className="h-2 bg-black/10 rounded w-3/4" />
                                <div className="h-2 bg-black/10 rounded w-1/2" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ═══ RIGHT COLUMN: Council Opinions — always expanded ═══ */}
                    <div className="space-y-3">
                      {responses.length > 0 && (
                        <h3 className="text-xs sm:text-sm font-bold text-foreground/50 uppercase tracking-wider px-1">Rådets vurderinger</h3>
                      )}
                      {responses.length > 0 && !showDebatePanel && (
                        <motion.button
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setShowDebatePanel(true)}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          className={`w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all ${hasStrongDisagreement ? "animate-pulse" : ""}`}
                          style={{
                            background: hasStrongDisagreement
                              ? "linear-gradient(135deg, hsl(0 84% 50%), hsl(330 70% 55%), hsl(270 70% 55%))"
                              : "linear-gradient(135deg, hsl(270 60% 50%), hsl(330 60% 50%))",
                            boxShadow: hasStrongDisagreement
                              ? "0 4px 20px hsl(0 84% 50% / 0.35), 0 0 40px hsl(330 70% 55% / 0.15)"
                              : "0 4px 15px hsl(270 60% 50% / 0.25)",
                          }}
                        >
                          <motion.div
                            animate={hasStrongDisagreement ? { rotate: [0, -12, 12, 0] } : {}}
                            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Swords size={16} />
                          </motion.div>
                          {hasStrongDisagreement ? "⚡ Stærk uenighed — Start Debate!" : "⚔️ Start Debate"}
                        </motion.button>
                      )}
                      {filteredResponses.map((persona, i) => {
                        // Find who agrees/disagrees
                        const agreesWithKeys = filteredResponses
                          .filter(p => p.personaKey !== persona.personaKey && p.vote === persona.vote)
                          .map(p => p.name);
                        const disagreesWithKeys = filteredResponses
                          .filter(p => p.personaKey !== persona.personaKey && Math.abs(p.voteScore - persona.voteScore) >= 3)
                          .map(p => p.name);

                        return (
                          <motion.div
                            key={persona.personaKey}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="council-glass-card overflow-hidden transition-shadow hover:shadow-lg"
                            style={{ borderLeftWidth: 4, borderLeftColor: persona.color }}
                          >
                            {/* Header bar — clickable for profile modal */}
                            <div className="flex items-center gap-3 p-3 sm:p-4">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                onClick={() => setProfilePersona(persona.personaKey)}
                                className="cursor-pointer"
                              >
                                <CouncilAvatar
                                  color={persona.color}
                                  vote={persona.vote}
                                  isSpeaking={speakingPersona === persona.personaKey}
                                  size={isMobile ? 34 : 40}
                                />
                              </motion.div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm sm:text-base font-bold font-display">{persona.name}</span>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{PERSONAS.find(p => p.key === persona.personaKey)?.subtitle}</span>
                                </div>
                              </div>
                              <VoteTooltip vote={persona.vote} voteScore={persona.voteScore} />
                            </div>

                            {/* Always visible content */}
                            <div className="px-4 pb-4 pt-0">
                              {/* Agreement / Disagreement badges */}
                              {(agreesWithKeys.length > 0 || disagreesWithKeys.length > 0) && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {agreesWithKeys.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-[hsl(150_60%_45%/0.12)] text-[hsl(150_60%_40%)]">
                                      ✓ Enig med {agreesWithKeys.join(", ")}
                                    </span>
                                  )}
                                  {disagreesWithKeys.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-[hsl(0_70%_55%/0.12)] text-[hsl(0_70%_50%)]">
                                      ✗ Uenig med {disagreesWithKeys.join(", ")}
                                    </span>
                                  )}
                                </div>
                              )}

                              {isNewResponse ? (
                                <TypewriterText text={persona.analysis} speed={8} />
                              ) : (
                                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed prose prose-sm max-w-none">
                                  <ReactMarkdown>{persona.analysis}</ReactMarkdown>
                                </div>
                              )}
                              {persona.id && user && (
                                <CouncilThread
                                  responseId={persona.id}
                                  personaKey={persona.personaKey}
                                  personaName={persona.name}
                                  personaColor={persona.color}
                                  ideaContent={activeIdeaContent}
                                  personaAnalysis={persona.analysis}
                                  threads={persona.threads}
                                  userId={user.id}
                                  onThreadAdded={(thread) => handleThreadAdded(persona.id!, thread)}
                                />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Persona Profile Modal */}
      <AnimatePresence>
        {profilePersona && <PersonaProfile personaKey={profilePersona} onClose={() => setProfilePersona(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default TheCouncil;
