import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, BarChart2, Send, Loader2, Share2, X, MessageSquare, TrendingUp, AlertTriangle, Lightbulb, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Personas ──

interface Persona {
  key: string;
  name: string;
  title: string;
  initials: string;
  ringPct: number;
  glow: string;
  glowBorder: string;
  sentiment: "positive" | "neutral" | "negative" | "visionary";
  icon: React.ElementType;
  delay: number;
  stat: string;
}

const PERSONAS: Persona[] = [
  {
    key: "elena",
    name: "Elena Verna",
    title: "The Pragmatist",
    initials: "EV",
    ringPct: 85,
    glow: "rgba(52,211,153,0.25)",
    glowBorder: "rgba(52,211,153,0.4)",
    sentiment: "positive",
    icon: TrendingUp,
    delay: 0,
    stat: "📊 Market data: Eco-retail growing 15% YoY",
  },
  {
    key: "helen",
    name: "Helen Lee Kupp",
    title: "The Branding Expert",
    initials: "HK",
    ringPct: 60,
    glow: "rgba(251,191,36,0.2)",
    glowBorder: "rgba(251,191,36,0.35)",
    sentiment: "neutral",
    icon: Lightbulb,
    delay: 400,
    stat: "💡 Brand recognition drives 30% repeat customers",
  },
  {
    key: "anton",
    name: "Anton Osika",
    title: "The Devil's Advocate",
    initials: "AO",
    ringPct: 30,
    glow: "rgba(248,113,113,0.25)",
    glowBorder: "rgba(248,113,113,0.4)",
    sentiment: "negative",
    icon: AlertTriangle,
    delay: 800,
    stat: "⚠️ 60% of cafes close in first 3 years",
  },
  {
    key: "margot",
    name: "Margot van Laer",
    title: "The Visionary",
    initials: "ML",
    ringPct: 95,
    glow: "rgba(34,211,238,0.2)",
    glowBorder: "rgba(34,211,238,0.4)",
    sentiment: "visionary",
    icon: Star,
    delay: 1200,
    stat: "✨ Community-led brands see 4x higher LTV",
  },
];

const MOCK_RESPONSES: Record<string, { analysis: string; question: string }> = {
  elena: {
    analysis: "The logistics check out — foot traffic analysis shows strong potential in urban eco-districts. Your supply chain for fair-trade sourcing is viable at scale. However, I'd recommend piloting with a pop-up before committing to a lease. Focus on unit economics first: your target of 200 cups/day at $6 average means $1,200/day revenue, which is achievable.",
    question: "**Have you modeled your break-even point at different occupancy rates?**",
  },
  helen: {
    analysis: "I have to build on Elena's optimism here — the positioning opportunity is real. 'Eco-friendly coffee' is becoming mainstream, which is both an opportunity and a threat. You need a differentiated brand story beyond just the eco angle. Think about rituals, community, and the emotional journey. I'd advise against the term 'eco-friendly' — it's overused. Instead, lead with *radical transparency*.",
    question: "**What is the one sentence that will make a customer choose you over a $6 Starbucks oat latte?**",
  },
  anton: {
    analysis: "Let me be the one to say what no one wants to hear. You've calculated the monthly loan, but you've completely left out insurance, staff churn, and depreciation on equipment. That's a massive hidden cost structure. Also, the eco-premium market is increasingly competitive — Blank Street, Bluestone Lane, and a dozen VC-funded chains are targeting the exact same customer. What's your moat?",
    question: "**Have you calculated your 12-month burn rate assuming 40% below projected revenue?**",
  },
  margot: {
    analysis: "This idea has genuine transformative potential — and I love that. An eco-coffee shop is not just a business, it's a community node. If you design it right, this becomes a gathering point for sustainable entrepreneurs, creators, and advocates. Pair it with a monthly speaker series, a zero-waste workshop program, and a membership model. The long-term brand equity here is enormous.",
    question: "**What if this wasn't just a café, but the headquarters of a local sustainability movement?**",
  },
};

const ACTION_PLAN = [
  "Launch a weekend pop-up to validate unit economics before signing a lease — target 150+ cups served as your green light signal.",
  "Build a transparent sourcing story and brand identity around 'radical sustainability' rather than generic eco labels.",
  "Model a 12-month burn rate with a conservative 60% revenue scenario and ensure 18 months of runway before launch.",
];

// ── Confidence Ring ──

const ConfidenceRing: React.FC<{ pct: number; color: string; animate: boolean; size?: number }> = ({
  pct, color, animate, size = 56,
}) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: animate ? offset : circ }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
};

// ── Floating Emoji Reaction ──

const FloatingEmoji: React.FC<{ emoji: string }> = ({ emoji }) => (
  <motion.div
    initial={{ opacity: 0, y: 0, x: Math.random() * 20 - 10 }}
    animate={{ opacity: [0, 1, 0], y: -30 }}
    transition={{ duration: 1.5, ease: "easeOut" }}
    className="absolute bottom-4 right-4 text-base pointer-events-none z-10"
  >
    {emoji}
  </motion.div>
);

// ── Typing Dots ──

const TypingDots = () => (
  <div className="flex items-center gap-1 py-2">
    {[0, 0.15, 0.3].map((delay, i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-white/30"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 0.9, repeat: Infinity, delay }}
      />
    ))}
  </div>
);

// ── Persona Card ──

interface PersonaCardProps {
  persona: Persona;
  state: "idle" | "typing" | "revealed";
  response: { analysis: string; question: string } | null;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  showReaction: boolean;
}

const SENTIMENT_COLORS = {
  positive: "#34d399",
  neutral: "#fbbf24",
  negative: "#f87171",
  visionary: "#22d3ee",
};

const PersonaCard: React.FC<PersonaCardProps> = ({
  persona, state, response, isExpanded, onExpand, onCollapse, showReaction,
}) => {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const Icon = persona.icon;
  const color = SENTIMENT_COLORS[persona.sentiment];
  const reactions = ["💡", "👏", "🤔", "✨"];

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const { data } = await supabase.functions.invoke("flux-ai", {
        body: { type: "council", messages: [{ role: "user", content: `You are ${persona.name}, ${persona.title}. Respond in character: ${msg}` }] },
      });
      const reply = data?.personas?.[0]?.analysis || `As ${persona.title}, I think this deserves deeper analysis. Let me share my perspective...`;
      setChatMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: `Great question. As ${persona.title}, I believe the key factor here is strategic alignment with your core objectives.` }]);
    }
    setChatLoading(false);
  };

  // Bold key terms in text
  const renderBoldTerms = (text: string): React.ReactNode[] => {
    const terms = ["insurance", "depreciation", "brand", "positioning", "market", "eco", "revenue", "burn rate", "churn", "moat", "unit economics", "row 14", "LTV"];
    let parts: React.ReactNode[] = [text];
    terms.forEach(term => {
      parts = parts.flatMap((part) => {
        if (typeof part !== "string") return [part];
        const regex = new RegExp(`(${term})`, "gi");
        const split = part.split(regex);
        return split.map((s, i) =>
          regex.test(s)
            ? <span
                key={`${term}-${i}`}
                className="font-semibold cursor-pointer relative"
                style={{ color }}
                onMouseEnter={() => setShowTooltip(term)}
                onMouseLeave={() => setShowTooltip(null)}
              >
                {s}
                <AnimatePresence>
                  {showTooltip === term && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded-lg text-[9px] text-white/70 bg-black/80 backdrop-blur-sm border border-white/10 whitespace-nowrap z-50"
                    >
                      💡 Click to highlight this metric
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>
            : s
        );
      });
    });
    return parts;
  };

  return (
    <motion.div
      layout
      animate={{
        flex: isExpanded ? 3 : 1,
        boxShadow: state !== "idle" ? `0 0 30px ${persona.glow}, 0 0 60px ${persona.glow}` : `0 0 12px rgba(0,0,0,0.3)`,
      }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-3xl border overflow-hidden backdrop-blur-xl min-w-0"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: state !== "idle" ? persona.glowBorder : "rgba(255,255,255,0.1)",
      }}
    >
      {/* Idle breathing animation */}
      {state === "idle" && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ background: `radial-gradient(circle at 50% 30%, ${color}, transparent 70%)` }}
        />
      )}

      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar with confidence ring */}
          <div className="relative w-14 h-14 shrink-0">
            <ConfidenceRing pct={persona.ringPct} color={color} animate={state === "revealed"} size={56} />
            <div
              className="absolute inset-[6px] rounded-full flex items-center justify-center text-[12px] font-bold"
              style={{ background: `linear-gradient(135deg, ${color}25, ${color}10)`, border: `1px solid ${color}30` }}
            >
              <span style={{ color }}>{persona.initials}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white/90 truncate">{persona.name}</p>
            <p className="text-[10px] text-white/40">{persona.title}</p>
            {state === "revealed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 mt-1"
              >
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                  {persona.ringPct}%
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {/* Stat tooltip */}
            <div className="relative group">
              <button className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                <BarChart2 size={12} />
              </button>
              <div className="absolute right-0 bottom-full mb-1 px-2 py-1.5 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-[9px] text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {persona.stat}
              </div>
            </div>
            {state === "revealed" && !isExpanded && (
              <button onClick={onExpand} className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                <MessageSquare size={12} />
              </button>
            )}
            {isExpanded && (
              <button onClick={onCollapse} className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {state === "idle" && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Icon size={20} style={{ color: `${color}60` } as React.CSSProperties} />
            </motion.div>
          </div>
        )}

        {state === "typing" && <TypingDots />}

        {state === "revealed" && response && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto council-hidden-scrollbar text-[11px] text-white/65 leading-relaxed space-y-2">
              <p>{renderBoldTerms(response.analysis)}</p>
              <p className="font-bold text-white/80">{response.question}</p>
            </div>
            {/* 1-on-1 chat */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 border-t border-white/8 pt-3 flex flex-col gap-2"
              >
                <div className="max-h-[120px] overflow-y-auto council-hidden-scrollbar space-y-2">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`text-[10px] rounded-xl px-2.5 py-1.5 ${m.role === "user" ? "bg-white/10 text-white/80 self-end ml-6" : "bg-white/5 text-white/60 mr-6"}`}>
                      {m.text}
                    </div>
                  ))}
                  {chatLoading && <TypingDots />}
                </div>
                <div className="flex gap-1">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder={`Ask ${persona.name.split(" ")[0]}...`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-white/20"
                  />
                  <button onClick={sendChat} className="w-7 h-7 flex items-center justify-center rounded-xl" style={{ background: `${color}30` }}>
                    <Send size={11} style={{ color }} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Floating reaction */}
      {showReaction && state === "typing" && (
        <FloatingEmoji emoji={reactions[Math.floor(Math.random() * reactions.length)]} />
      )}
    </motion.div>
  );
};

// ── Export Verdict Modal ──

const ExportModal: React.FC<{ avgRing: number; idea: string; onClose: () => void }> = ({ avgRing, idea, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/15"
      style={{ background: "linear-gradient(135deg, #1a0533 0%, #0a1628 40%, #032233 100%)" }}
    >
      <div className="p-6">
        <div className="text-center mb-5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">The Council — Verdict</p>
          <p className="text-sm font-semibold text-white/80 line-clamp-2">{idea || "Your idea"}</p>
        </div>
        {/* 4 avatars */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {PERSONAS.map(p => (
            <div key={p.key} className="flex flex-col items-center gap-1.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold"
                style={{ background: `linear-gradient(135deg, ${SENTIMENT_COLORS[p.sentiment]}30, ${SENTIMENT_COLORS[p.sentiment]}10)`, border: `1px solid ${SENTIMENT_COLORS[p.sentiment]}30` }}
              >
                <span style={{ color: SENTIMENT_COLORS[p.sentiment] }}>{p.initials}</span>
              </div>
              <p className="text-[8px] text-white/40 text-center leading-tight">{p.name.split(" ")[0]}</p>
            </div>
          ))}
        </div>
        {/* Consensus */}
        <div className="text-center mb-5">
          <p className="text-3xl font-bold text-white">{avgRing}%</p>
          <p className="text-xs text-white/40 mt-0.5">Consensus Score</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(`The Council Verdict\n\nIdea: ${idea}\nConsensus Score: ${avgRing}%\n\nPersonas: ${PERSONAS.map(p => `${p.name} (${p.ringPct}% confidence)`).join(", ")}`); }}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors"
          >
            Copy Summary
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// ── Main Boardroom Component ──

type CardState = "idle" | "typing" | "revealed";

const CouncilBoardroom: React.FC = () => {
  const [idea, setIdea] = useState("");
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({
    elena: "idle", helen: "idle", anton: "idle", margot: "idle",
  });
  const [responses, setResponses] = useState<Record<string, { analysis: string; question: string } | null>>({
    elena: null, helen: null, anton: null, margot: null,
  });
  const [isConsulting, setIsConsulting] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  const revealedCountRef = useRef(0);

  const allRevealed = revealedCount === 4;
  const avgRing = Math.round(PERSONAS.reduce((a, p) => a + p.ringPct, 0) / PERSONAS.length);

  const getConsensusLabel = () => {
    if (avgRing >= 70) return { label: "Strong Consensus — Proceed", color: "#34d399" };
    if (avgRing >= 40) return { label: "Mixed Opinions — Proceed with Caution", color: "#fbbf24" };
    return { label: "Divided — Further Analysis Required", color: "#f87171" };
  };

  const handleConsult = async () => {
    if (isConsulting) return;
    setIsConsulting(true);
    setRevealedCount(0);
    revealedCountRef.current = 0;
    setExpandedCard(null);
    // Reset all to typing
    setCardStates({ elena: "typing", helen: "typing", anton: "typing", margot: "typing" });
    setResponses({ elena: null, helen: null, anton: null, margot: null });

    // Sequentially reveal each persona
    for (let i = 0; i < PERSONAS.length; i++) {
      const p = PERSONAS[i];
      // Show floating reactions on other cards
      setReactions(prev => {
        const nr = { ...prev };
        PERSONAS.forEach(op => { if (op.key !== p.key) nr[op.key] = true; });
        return nr;
      });
      await new Promise(r => setTimeout(r, p.delay + 800));
      setCardStates(prev => ({ ...prev, [p.key]: "revealed" }));
      setResponses(prev => ({ ...prev, [p.key]: MOCK_RESPONSES[p.key] }));
      revealedCountRef.current += 1;
      setRevealedCount(revealedCountRef.current);
      setReactions(prev => ({ ...prev, [p.key]: false }));
    }
    setIsConsulting(false);
  };

  const consensus = getConsensusLabel();

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Pitch area */}
      <div className="space-y-3 shrink-0">
        <div className="flex gap-2">
          <input
            value={idea}
            onChange={e => setIdea(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConsult()}
            placeholder="Idea: Should I start an eco-friendly coffee shop?"
            className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
          />
          <motion.button
            onClick={handleConsult}
            disabled={isConsulting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(270 70% 55%), hsl(310 70% 55%), hsl(200 80% 55%))",
              boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
            }}
          >
            {isConsulting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isConsulting ? "Consulting…" : "Consult Board"}
          </motion.button>
          <button
            onClick={() => setShowExport(true)}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors shrink-0"
            title="Export Verdict"
          >
            <Share2 size={15} />
          </button>
        </div>

        {/* Consensus meter */}
        <AnimatePresence>
          {allRevealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 rounded-2xl bg-white/4 border border-white/8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Board Consensus</span>
                  <span className="text-[11px] font-bold" style={{ color: consensus.color }}>{consensus.label}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${avgRing}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${consensus.color}80, ${consensus.color})` }}
                  />
                </div>
                <p className="text-[9px] text-white/25 mt-1">{avgRing}% average confidence across all 4 advisors</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2×2 grid */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {PERSONAS.map(persona => (
          <PersonaCard
            key={persona.key}
            persona={persona}
            state={cardStates[persona.key]}
            response={responses[persona.key]}
            isExpanded={expandedCard === persona.key}
            onExpand={() => setExpandedCard(persona.key)}
            onCollapse={() => setExpandedCard(null)}
            showReaction={reactions[persona.key] || false}
          />
        ))}
      </div>

      {/* Action plan */}
      <AnimatePresence>
        {allRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="shrink-0 rounded-2xl border border-white/10 bg-white/4 backdrop-blur-xl p-4"
          >
            <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">
              ✦ Council's Recommended Action Plan
            </h3>
            <ol className="space-y-2">
              {ACTION_PLAN.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex gap-2.5 text-[11px] text-white/65 leading-snug"
                >
                  <span className="shrink-0 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </motion.li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export modal */}
      <AnimatePresence>
        {showExport && (
          <ExportModal avgRing={avgRing} idea={idea} onClose={() => setShowExport(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CouncilBoardroom;
