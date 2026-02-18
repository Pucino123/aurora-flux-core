import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Loader2, ThumbsUp, RotateCcw, Zap, Vote, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import CouncilAvatar from "./CouncilAvatar";

const db = supabase as any;


interface DebateRound {
  id?: string;
  round: number;
  challenger_key: string;
  defender_key: string;
  challenger_argument: string;
  challenger_key_points?: string[];
  defender_counter: string;
  defender_key_points?: string[];
  winner_key?: string | null;
}

interface DebateModeProps {
  ideaId: string;
  ideaContent: string;
  userId: string;
  responses: { personaKey: string; vote: string; voteScore: number; analysis: string }[];
  personas: { key: string; name: string; color: string; emoji: string }[];
}

// ── SFX Engine (Web Audio API) ──
const useFightSFX = () => {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  };

  const playTone = (freq: number, duration: number, delay: number, type: OscillatorType = "square", vol = 0.15) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  };

  const playNoise = (duration: number, delay: number, vol = 0.08) => {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    source.connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  };

  const playIntro = () => {
    // Dramatic whoosh (characters slide in)
    playNoise(0.5, 0.3, 0.12);
    // Low rumble
    playTone(60, 1.2, 0.2, "sawtooth", 0.08);
    // VS impact
    playTone(200, 0.15, 0.6, "square", 0.2);
    playTone(150, 0.2, 0.65, "square", 0.15);
    // "ROUND ONE" chime
    playTone(440, 0.12, 1.2, "square", 0.12);
    playTone(660, 0.12, 1.35, "square", 0.12);
    playTone(880, 0.15, 1.5, "square", 0.15);
    // FIGHT! explosion
    playNoise(0.4, 1.8, 0.25);
    playTone(120, 0.3, 1.7, "sawtooth", 0.2);
    playTone(240, 0.2, 1.75, "square", 0.18);
    playTone(480, 0.15, 1.8, "square", 0.12);
  };

  return { playIntro };
};

// Tekken-style fight intro
const FightIntro = ({
  challengerP,
  defenderP,
  onComplete,
}: {
  challengerP: { name: string; color: string; emoji: string } | undefined;
  defenderP: { name: string; color: string; emoji: string } | undefined;
  onComplete: () => void;
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 2800);
      }}
    >
      {/* Dark cinematic backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* VS split line */}
      <motion.div
        className="absolute inset-0 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-1/2 h-full" style={{ background: `linear-gradient(135deg, ${challengerP?.color}20 0%, transparent 70%)` }} />
        <div className="w-1/2 h-full" style={{ background: `linear-gradient(225deg, ${defenderP?.color}20 0%, transparent 70%)` }} />
      </motion.div>

      {/* Lightning divider */}
      <motion.div
        className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2"
        style={{ background: `linear-gradient(180deg, transparent 0%, hsl(45 90% 55%) 30%, hsl(45 90% 55%) 70%, transparent 100%)` }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      />

      {/* Challenger (left) */}
      <motion.div
        className="absolute left-[15%] flex flex-col items-center gap-3 z-10"
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: challengerP?.color }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <CouncilAvatar color={challengerP?.color || ""} size={80} isDebating isSpeaking />
        </div>
        <motion.p
          className="text-lg font-black tracking-widest uppercase"
          style={{ color: challengerP?.color }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {challengerP?.name}
        </motion.p>
        <motion.span
          className="text-[10px] font-bold tracking-[0.3em] uppercase text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          ⚔️ Challenger
        </motion.span>
      </motion.div>

      {/* Defender (right) */}
      <motion.div
        className="absolute right-[15%] flex flex-col items-center gap-3 z-10"
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: defenderP?.color }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
          <CouncilAvatar color={defenderP?.color || ""} size={80} isDebating isSpeaking />
        </div>
        <motion.p
          className="text-lg font-black tracking-widest uppercase"
          style={{ color: defenderP?.color }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {defenderP?.name}
        </motion.p>
        <motion.span
          className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          🛡️ Defender
        </motion.span>
      </motion.div>

      {/* VS text */}
      <motion.div
        className="relative z-20 flex flex-col items-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4, type: "spring", stiffness: 200 }}
      >
        <motion.span
          className="text-5xl font-black text-transparent bg-clip-text"
          style={{
            backgroundImage: `linear-gradient(135deg, ${challengerP?.color} 0%, hsl(45 90% 55%) 50%, ${defenderP?.color} 100%)`,
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
        >
          VS
        </motion.span>
      </motion.div>

      {/* ROUND ONE */}
      <motion.div
        className="absolute top-[18%] flex flex-col items-center z-20"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <motion.span
          className="text-xs font-bold tracking-[0.5em] uppercase text-muted-foreground"
        >
          Round One
        </motion.span>
      </motion.div>

      {/* FIGHT! */}
      <motion.div
        className="absolute bottom-[22%] z-20"
        initial={{ scale: 0, opacity: 0, rotate: -5 }}
        animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 1], rotate: 0 }}
        transition={{ delay: 1.8, duration: 0.5, ease: "easeOut" }}
      >
        <motion.span
          className="text-4xl sm:text-5xl font-black tracking-wider text-transparent bg-clip-text"
          style={{
            backgroundImage: `linear-gradient(90deg, hsl(0 84% 60%) 0%, hsl(45 90% 55%) 50%, hsl(0 84% 60%) 100%)`,
            textShadow: "0 0 40px rgba(239,68,68,0.5)",
          }}
          animate={{
            textShadow: [
              "0 0 20px rgba(239,68,68,0.3)",
              "0 0 60px rgba(239,68,68,0.8)",
              "0 0 20px rgba(239,68,68,0.3)",
            ]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          FIGHT!
        </motion.span>
      </motion.div>

      {/* Screen flash */}
      <motion.div
        className="absolute inset-0 bg-white z-30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.7, 0] }}
        transition={{ delay: 1.7, duration: 0.4, times: [0, 0, 0.1, 1] }}
      />
    </motion.div>
  );
};

// Extract key bullet points from argument text (first sentence of each paragraph or markdown bullet)
const extractKeyPoints = (text: string, max = 3): string[] => {
  // Try markdown bullets first
  const bullets = text.match(/^[-*•]\s+(.+)/gm);
  if (bullets && bullets.length > 0) {
    return bullets.slice(0, max).map(b => b.replace(/^[-*•]\s+/, '').split(/[.!?]/)[0].trim()).filter(Boolean);
  }
  // Try numbered lists
  const numbered = text.match(/^\d+[.)]\s+(.+)/gm);
  if (numbered && numbered.length > 0) {
    return numbered.slice(0, max).map(b => b.replace(/^\d+[.)]\s+/, '').split(/[.!?]/)[0].trim()).filter(Boolean);
  }
  // Fallback: first sentence of each paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 10);
  return paragraphs.slice(0, max).map(p => {
    const sentence = p.replace(/^[#*_]+\s*/, '').split(/[.!?]/)[0].trim();
    return sentence.length > 80 ? sentence.slice(0, 77) + '…' : sentence;
  }).filter(Boolean);
};

const DebateMode = ({ ideaId, ideaContent, userId, responses, personas }: DebateModeProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [showFightIntro, setShowFightIntro] = useState(false);
  const [showVerdictIntro, setShowVerdictIntro] = useState(false);
  const [verdict, setVerdict] = useState<{ winner_key: string; verdict: string; winner_title: string } | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const autoStartDone = useRef(false);
  const debateStarted = useRef(false);
  const sfx = useFightSFX();

  // Detect disagreement
  const votes = responses.map((r) => r.voteScore);
  const maxDiff = Math.max(...votes) - Math.min(...votes);
  const hasConflict = maxDiff >= 3;

  const sorted = [...responses].sort((a, b) => b.voteScore - a.voteScore);
  const challenger = sorted[sorted.length - 1];
  const defender = sorted[0];

  const challengerP = personas.find((p) => p.key === challenger?.personaKey);
  const defenderP = personas.find((p) => p.key === defender?.personaKey);

  // Auto-start fight intro on mount when there's conflict
  useEffect(() => {
    if (autoStartDone.current) return;
    if (challenger && defender && rounds.length === 0) {
      autoStartDone.current = true;
      setShowFightIntro(true);
      sfx.playIntro();
    }
  }, []);

  const triggerDebate = async (mode: "normal" | "push" | "force_vote" = "normal") => {
    if (loading || !challenger || !defender) return;

    if (rounds.length === 0 && mode === "normal") {
      setShowFightIntro(true);
      sfx.playIntro();
      return;
    }

    await executeDebate(mode);
  };

  const executeDebate = async (mode: "normal" | "push" | "force_vote" = "normal") => {
    if (debateStarted.current && mode === "normal" && rounds.length === 0) return;
    if (mode === "normal" && rounds.length === 0) debateStarted.current = true;
    setLoading(true);
    setOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "council-debate",
          idea: ideaContent,
          challenger_key: challenger.personaKey,
          challenger_analysis: challenger.analysis,
          challenger_vote: challenger.vote,
          defender_key: defender.personaKey,
          defender_analysis: defender.analysis,
          defender_vote: defender.vote,
          round: rounds.length + 1,
          previous_rounds: rounds,
          mode,
          risk_tolerance: riskTolerance,
        },
      });

      if (error) throw error;

      const newRound: DebateRound = {
        round: rounds.length + 1,
        challenger_key: challenger.personaKey,
        defender_key: defender.personaKey,
        challenger_argument: data?.challenger_argument || "...",
        challenger_key_points: data?.challenger_key_points || [],
        defender_counter: data?.defender_counter || "...",
        defender_key_points: data?.defender_key_points || [],
      };

      const { data: saved } = await db
        .from("council_debates")
        .insert({
          idea_id: ideaId,
          user_id: userId,
          challenger_key: newRound.challenger_key,
          defender_key: newRound.defender_key,
          challenger_argument: newRound.challenger_argument,
          defender_counter: newRound.defender_counter,
          round: newRound.round,
        })
        .select()
        .single();

      if (saved) newRound.id = saved.id;
      setRounds((prev) => [...prev, newRound]);
    } catch (e: any) {
      console.error("Debate error:", e);
      toast.error(t("council.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleFightIntroComplete = () => {
    setShowFightIntro(false);
    executeDebate("normal");
  };

  const pickWinner = async (roundIndex: number, winnerKey: string) => {
    const round = rounds[roundIndex];
    if (!round?.id) return;

    await db.from("council_debates").update({ winner_key: winnerKey }).eq("id", round.id);
    setRounds((prev) =>
      prev.map((r, i) => (i === roundIndex ? { ...r, winner_key: winnerKey } : r))
    );
    toast.success(`${t("council.sided_with")} ${personas.find((p) => p.key === winnerKey)?.name}`);
  };

  const endDebate = async () => {
    if (verdictLoading || rounds.length === 0) return;
    setVerdictLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "council-verdict",
          idea: ideaContent,
          challenger_key: challenger.personaKey,
          defender_key: defender.personaKey,
          rounds: rounds.map(r => ({
            round: r.round,
            challenger_key: r.challenger_key,
            defender_key: r.defender_key,
            challenger_argument: r.challenger_argument,
            defender_counter: r.defender_counter,
          })),
        },
      });
      if (error) throw error;
      setVerdict(data);
      setShowVerdictIntro(true);
      sfx.playIntro();
    } catch (e: any) {
      console.error("Verdict error:", e);
      toast.error("Kunne ikke afslutte debat");
    } finally {
      setVerdictLoading(false);
    }
  };

  if (!challenger || !defender) return null;

  return (
    <div className="mb-4">
      {/* Fight intro overlay */}
      <AnimatePresence>
        {showFightIntro && (
          <FightIntro
            challengerP={challengerP}
            defenderP={defenderP}
            onComplete={handleFightIntroComplete}
          />
        )}
      </AnimatePresence>

      {/* Debate rounds */}
      <AnimatePresence>
        {(open || rounds.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {rounds.map((round, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flux-card border border-red-500/10"
              >
                {/* Tekken-style round header */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <motion.div
                    className="h-[1px] flex-1"
                    style={{ background: `linear-gradient(90deg, transparent, ${challengerP?.color}40)` }}
                  />
                  <motion.span
                    className="text-xs font-black tracking-[0.3em] uppercase text-transparent bg-clip-text"
                    style={{
                      backgroundImage: `linear-gradient(90deg, hsl(0 84% 60%), hsl(45 90% 55%), hsl(0 84% 60%))`,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    Round {round.round}
                  </motion.span>
                  <motion.div
                    className="h-[1px] flex-1"
                    style={{ background: `linear-gradient(90deg, ${defenderP?.color}40, transparent)` }}
                  />
                </div>

                {/* Challenger & Defender facing each other */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Challenger */}
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${challengerP?.color}08` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CouncilAvatar color={challengerP?.color || ""} size={32} isDebating isSpeaking />
                      <div>
                        <p className="text-[10px] font-bold">{challengerP?.name}</p>
                        <p className="text-[8px] text-muted-foreground">⚔️ Challenger</p>
                      </div>
                    </div>
                    {/* Key points */}
                    {(round.challenger_key_points?.length ? round.challenger_key_points : extractKeyPoints(round.challenger_argument)).map((point, pi) => {
                      const isPlus = point.startsWith('+');
                      const isMinus = point.startsWith('−') || point.startsWith('-');
                      const cleanPoint = point.replace(/^[+\-−]\s*/, '');
                      return (
                        <div key={pi} className="flex items-start gap-1.5 mb-1">
                          <span className={`text-[10px] font-black mt-px shrink-0 ${isPlus ? 'text-[hsl(150_60%_45%)]' : isMinus ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {isPlus ? '＋' : isMinus ? '−' : '●'}
                          </span>
                          <span className="text-[10px] font-semibold text-foreground/80 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{cleanPoint}</span>
                        </div>
                      );
                    })}
                    <div className="mt-2 prose prose-xs max-w-none text-[11px] text-muted-foreground">
                      <ReactMarkdown>{round.challenger_argument}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Defender */}
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${defenderP?.color}08` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CouncilAvatar color={defenderP?.color || ""} size={32} isDebating isSpeaking />
                      <div>
                        <p className="text-[10px] font-bold">{defenderP?.name}</p>
                        <p className="text-[8px] text-muted-foreground">🛡️ Defender</p>
                      </div>
                    </div>
                    {/* Key points */}
                    {(round.defender_key_points?.length ? round.defender_key_points : extractKeyPoints(round.defender_counter)).map((point, pi) => {
                      const isPlus = point.startsWith('+');
                      const isMinus = point.startsWith('−') || point.startsWith('-');
                      const cleanPoint = point.replace(/^[+\-−]\s*/, '');
                      return (
                        <div key={pi} className="flex items-start gap-1.5 mb-1">
                          <span className={`text-[10px] font-black mt-px shrink-0 ${isPlus ? 'text-[hsl(150_60%_45%)]' : isMinus ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {isPlus ? '＋' : isMinus ? '−' : '●'}
                          </span>
                          <span className="text-[10px] font-semibold text-foreground/80 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{cleanPoint}</span>
                        </div>
                      );
                    })}
                    <div className="mt-2 prose prose-xs max-w-none text-[11px] text-muted-foreground">
                      <ReactMarkdown>{round.defender_counter}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Voting */}
                {!round.winner_key ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{t("council.side_with")}:</span>
                    <button
                      onClick={() => pickWinner(i, round.challenger_key)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium hover:bg-secondary/80 transition-colors bg-secondary/50"
                    >
                      <ThumbsUp size={10} />
                      {challengerP?.name}
                    </button>
                    <button
                      onClick={() => pickWinner(i, round.defender_key)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium hover:bg-secondary/80 transition-colors bg-secondary/50"
                    >
                      <ThumbsUp size={10} />
                      {defenderP?.name}
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    ✅ {t("council.sided_with")} <span className="font-bold">{personas.find((p) => p.key === round.winner_key)?.name}</span>
                  </p>
                )}
              </motion.div>
            ))}

            {/* Controls */}
            {rounds.length > 0 && !verdict && (
              <div className="flex gap-2">
                <button
                  onClick={() => triggerDebate("normal")}
                  disabled={loading || verdictLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  Næste runde
                </button>
                <button
                  onClick={endDebate}
                  disabled={verdictLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  {verdictLoading ? <Loader2 size={12} className="animate-spin" /> : <Swords size={12} />}
                  Afslut debat
                </button>
              </div>
            )}

            {/* Verdict result (after cinematic) */}
            {verdict && !showVerdictIntro && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="council-glass-card p-4 text-center border-2"
                style={{ borderColor: personas.find(p => p.key === verdict.winner_key)?.color }}
              >
                <div className="flex justify-center mb-2">
                  <CouncilAvatar color={personas.find(p => p.key === verdict.winner_key)?.color || ""} size={48} isDebating />
                </div>
                <p className="text-lg font-black mb-1" style={{ color: personas.find(p => p.key === verdict.winner_key)?.color }}>
                  🏆 {personas.find(p => p.key === verdict.winner_key)?.name}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{verdict.winner_title}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{verdict.verdict}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory cinematic overlay */}
      <AnimatePresence>
        {showVerdictIntro && verdict && (() => {
          const winnerP = personas.find(p => p.key === verdict.winner_key);
          const loserKey = verdict.winner_key === challenger?.personaKey ? defender?.personaKey : challenger?.personaKey;
          const loserP = personas.find(p => p.key === loserKey);
          return (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onAnimationComplete={() => setTimeout(() => setShowVerdictIntro(false), 3500)}
            >
              <motion.div className="absolute inset-0 bg-black/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />

              {/* Winner glow */}
              <motion.div
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 50% 50%, ${winnerP?.color}25 0%, transparent 60%)` }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Loser (dimmed, smaller) */}
              <motion.div
                className="absolute left-[20%] flex flex-col items-center gap-2 z-10"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 0.3 }}
                transition={{ delay: 0.4 }}
              >
                <CouncilAvatar color={loserP?.color || ""} size={50} />
                <p className="text-xs font-bold text-muted-foreground/50 line-through">{loserP?.name}</p>
              </motion.div>

              {/* Winner (large, glowing) */}
              <motion.div
                className="relative z-20 flex flex-col items-center gap-3"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
              >
                <motion.div
                  className="absolute -inset-8 rounded-full blur-3xl"
                  style={{ backgroundColor: winnerP?.color }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <CouncilAvatar color={winnerP?.color || ""} size={100} isDebating isSpeaking />
                <motion.p
                  className="text-2xl font-black tracking-wider uppercase"
                  style={{ color: winnerP?.color }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {winnerP?.name}
                </motion.p>
                <motion.span
                  className="text-[10px] font-bold tracking-[0.4em] uppercase text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  {verdict.winner_title}
                </motion.span>
              </motion.div>

              {/* WINNER text */}
              <motion.div
                className="absolute bottom-[18%] z-20"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.5 }}
              >
                <motion.span
                  className="text-4xl sm:text-5xl font-black tracking-wider text-transparent bg-clip-text"
                  style={{
                    backgroundImage: `linear-gradient(90deg, hsl(45 90% 55%), ${winnerP?.color}, hsl(45 90% 55%))`,
                  }}
                  animate={{
                    textShadow: ["0 0 20px rgba(234,179,8,0.3)", "0 0 60px rgba(234,179,8,0.8)", "0 0 20px rgba(234,179,8,0.3)"],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🏆 WINNER!
                </motion.span>
              </motion.div>

              {/* Flash */}
              <motion.div
                className="absolute inset-0 bg-white z-30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0.6, 0] }}
                transition={{ delay: 1.5, duration: 0.4, times: [0, 0, 0.1, 1] }}
              />
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default DebateMode;
