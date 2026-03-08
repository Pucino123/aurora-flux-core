import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, BarChart2, Send, Loader2, Share2, X, MessageSquare, TrendingUp, AlertTriangle,
  Lightbulb, Star, Reply, Maximize2, BookmarkPlus, Check, RotateCcw, Download, Users, Link,
  Copy, FileText, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import BoardroomPersonalitySliders, { DEFAULT_ALL_SLIDERS, AllSliders } from "./BoardroomPersonalitySliders";
import BoardroomOnboardingTour from "./BoardroomOnboardingTour";
import { toast } from "sonner";

// ── Types ──

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
    key: "elena", name: "Elena Verna", title: "The Pragmatist", initials: "EV",
    ringPct: 85, glow: "rgba(52,211,153,0.25)", glowBorder: "rgba(52,211,153,0.4)",
    sentiment: "positive", icon: TrendingUp, delay: 0,
    stat: "📊 Market data: Eco-retail growing 15% YoY",
  },
  {
    key: "helen", name: "Helen Lee Kupp", title: "The Branding Expert", initials: "HK",
    ringPct: 60, glow: "rgba(251,191,36,0.2)", glowBorder: "rgba(251,191,36,0.35)",
    sentiment: "neutral", icon: Lightbulb, delay: 400,
    stat: "💡 Brand recognition drives 30% repeat customers",
  },
  {
    key: "anton", name: "Anton Osika", title: "The Devil's Advocate", initials: "AO",
    ringPct: 30, glow: "rgba(248,113,113,0.25)", glowBorder: "rgba(248,113,113,0.4)",
    sentiment: "negative", icon: AlertTriangle, delay: 800,
    stat: "⚠️ 60% of cafes close in first 3 years",
  },
  {
    key: "margot", name: "Margot van Laer", title: "The Visionary", initials: "ML",
    ringPct: 95, glow: "rgba(34,211,238,0.2)", glowBorder: "rgba(34,211,238,0.4)",
    sentiment: "visionary", icon: Star, delay: 1200,
    stat: "✨ Community-led brands see 4x higher LTV",
  },
];

const MOCK_RESPONSES: Record<string, { analysis: string; question: string; confidence: number }> = {
  elena: {
    analysis: "The logistics check out — foot traffic analysis shows strong potential in urban eco-districts. Your supply chain for fair-trade sourcing is viable at scale. However, I'd recommend piloting with a pop-up before committing to a lease. Focus on unit economics first: your target of 200 cups/day at $6 average means $1,200/day revenue, which is achievable.",
    question: "**Have you modeled your break-even point at different occupancy rates?**",
    confidence: 85,
  },
  helen: {
    analysis: "I have to build on Elena's optimism here — the positioning opportunity is real. 'Eco-friendly coffee' is becoming mainstream, which is both an opportunity and a threat. You need a differentiated brand story beyond just the eco angle. Think about rituals, community, and the emotional journey. I'd advise against the term 'eco-friendly' — it's overused. Instead, lead with radical transparency.",
    question: "**What is the one sentence that will make a customer choose you over a $6 Starbucks oat latte?**",
    confidence: 60,
  },
  anton: {
    analysis: "Let me be the one to say what no one wants to hear. You've calculated the monthly loan, but you've completely left out insurance, staff churn, and depreciation on equipment. That's a massive hidden cost structure. Also, the eco-premium market is increasingly competitive. What's your moat? I disagree with Elena's rosy unit economics — those numbers assume near-full occupancy.",
    question: "**Have you calculated your 12-month burn rate assuming 40% below projected revenue?**",
    confidence: 30,
  },
  margot: {
    analysis: "This idea has genuine transformative potential — and I love that. Building on Helen's branding insight: an eco-coffee shop is not just a business, it's a community node. If you design it right, this becomes a gathering point for sustainable entrepreneurs, creators, and advocates. The long-term brand equity here is enormous, far beyond what Anton's skepticism accounts for.",
    question: "**What if this wasn't just a café, but the headquarters of a local sustainability movement?**",
    confidence: 95,
  },
};

const DEFAULT_ACTION_PLAN = [
  "Launch a weekend pop-up to validate unit economics before signing a lease — target 150+ cups served as your green light signal.",
  "Build a transparent sourcing story and brand identity around 'radical sustainability' rather than generic eco labels.",
  "Model a 12-month burn rate with a conservative 60% revenue scenario and ensure 18 months of runway before launch.",
];

const REACTION_POOLS: Record<string, string[]> = {
  positive: ["👏", "💡", "📈", "✅", "🎯"],
  neutral:  ["🤔", "💬", "🔍", "📝", "💭"],
  negative: ["⚠️", "🚨", "❓", "🔴", "👀"],
  visionary: ["✨", "🚀", "💫", "🌟", "🔮"],
};

const SENTIMENT_COLORS = {
  positive: "#34d399",
  neutral: "#fbbf24",
  negative: "#f87171",
  visionary: "#22d3ee",
};

const PERSONA_NAMES = ["Elena", "Helen", "Anton", "Margot"];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── SSE streaming helper ──

async function streamDeepDive({
  personaKey,
  question,
  onDelta,
  onDone,
  onError,
}: {
  personaKey: string;
  question: string;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: () => void;
}) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/flux-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        type: "council-quick",
        mode: "deep-dive",
        persona_key: personaKey,
        question,
      }),
    });
    if (!resp.ok || !resp.body) throw new Error("stream failed");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let done = false;

    while (!done) {
      const { done: d, value } = await reader.read();
      if (d) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { done = true; break; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    onDone();
  } catch {
    onError();
  }
}

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

// ── Floating Emoji ──

const FloatingEmoji: React.FC<{ emoji: string }> = ({ emoji }) => (
  <motion.div
    initial={{ opacity: 0, y: 0, x: Math.random() * 30 - 15, scale: 0.6 }}
    animate={{ opacity: [0, 1, 1, 0], y: -45, scale: [0.6, 1.2, 1, 0.8] }}
    transition={{ duration: 2, ease: "easeOut" }}
    className="absolute bottom-6 right-4 text-base pointer-events-none z-20"
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

// ── Banter Chip ──

const BanterChip: React.FC<{ referencedName: string; color: string }> = ({ referencedName, color }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full mr-1"
    style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
  >
    <Reply size={7} />
    replying to {referencedName.split(" ")[0]}
  </motion.span>
);

// ── Bold terms renderer ──

const renderBoldTerms = (text: string, color: string, showTooltip: string | null, setShowTooltip: (t: string | null) => void): React.ReactNode => {
  const terms = ["insurance", "depreciation", "brand", "positioning", "market", "eco", "revenue", "burn rate", "churn", "moat", "unit economics", "LTV", "occupancy", "supply chain", "transparency", "community"];
  const segments: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;
  while (remaining.length > 0) {
    let earliestIdx = -1;
    let earliestTerm = "";
    for (const term of terms) {
      const idx = remaining.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx;
        earliestTerm = term;
      }
    }
    if (earliestIdx === -1) { segments.push(remaining); break; }
    if (earliestIdx > 0) segments.push(remaining.slice(0, earliestIdx));
    const matchedText = remaining.slice(earliestIdx, earliestIdx + earliestTerm.length);
    const captured = earliestTerm;
    segments.push(
      <span
        key={keyIdx++}
        className="font-semibold cursor-pointer relative inline-block"
        style={{ color }}
        onMouseEnter={() => setShowTooltip(captured)}
        onMouseLeave={() => setShowTooltip(null)}
      >
        {matchedText}
        {showTooltip === captured && (
          <span className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded-lg text-[9px] text-white/70 bg-black/80 backdrop-blur-sm border border-white/10 whitespace-nowrap z-50 pointer-events-none font-normal">
            💡 Key metric
          </span>
        )}
      </span>
    );
    remaining = remaining.slice(earliestIdx + earliestTerm.length);
  }
  return <>{segments}</>;
};

// ── Fullscreen Persona Modal ──

interface FullscreenModalProps {
  persona: Persona;
  response: { analysis: string; question: string; confidence: number };
  savedIdeaId: string | null;
  userId: string | null;
  onClose: () => void;
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({ persona, response, savedIdeaId, userId, onClose }) => {
  const color = SENTIMENT_COLORS[persona.sentiment];
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id?: string; role: "user" | "ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load persisted threads on open
  useEffect(() => {
    if (!userId || !savedIdeaId || threadsLoaded) return;
    setThreadsLoaded(true);
    const db = supabase as any;
    db.from("council_threads")
      .select("id, user_message, persona_reply, created_at")
      .eq("user_id", userId)
      .eq("persona_key", persona.key)
      .order("created_at", { ascending: true })
      .then(({ data }: { data: any[] | null }) => {
        if (data && data.length > 0) {
          const msgs: { id: string; role: "user" | "ai"; text: string }[] = [];
          data.forEach(t => {
            msgs.push({ id: `u-${t.id}`, role: "user", text: t.user_message });
            msgs.push({ id: `a-${t.id}`, role: "ai", text: t.persona_reply });
          });
          setChatMessages(msgs);
        }
      });
  }, [userId, savedIdeaId, persona.key, threadsLoaded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const chartData = [
    { label: "Prior", value: Math.round(response.confidence * 0.78) },
    { label: "Now", value: response.confidence },
  ];

  const banterTarget = PERSONA_NAMES.find(n => n !== persona.name.split(" ")[0] && response.analysis.includes(n));
  const banterTargetColor = banterTarget
    ? SENTIMENT_COLORS[PERSONAS.find(p => p.name.startsWith(banterTarget))?.sentiment || "positive"]
    : "#fff";

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);

    let streamText = "";
    const addMsg = () => setChatMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === "ai") return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: streamText } : m);
      return [...prev, { role: "ai", text: streamText }];
    });

    await streamDeepDive({
      personaKey: persona.key,
      question: msg,
      onDelta: chunk => { streamText += chunk; addMsg(); },
      onDone: async () => {
        setChatLoading(false);
        // Persist to council_threads
        if (userId) {
          try {
            // Find response_id if idea was saved
            let responseId: string | null = null;
            if (savedIdeaId) {
              const db = supabase as any;
              const { data: respRow } = await db
                .from("council_responses")
                .select("id")
                .eq("idea_id", savedIdeaId)
                .eq("persona_key", persona.key)
                .eq("user_id", userId)
                .maybeSingle();
              responseId = respRow?.id || null;
            }
            const db = supabase as any;
            await db.from("council_threads").insert({
              user_id: userId,
              persona_key: persona.key,
              user_message: msg,
              persona_reply: streamText,
              ...(responseId ? { response_id: responseId } : {}),
            });
          } catch {
            // silent — thread saved in memory even if DB fails
          }
        }
      },
      onError: () => {
        setChatMessages(prev => [...prev, { role: "ai", text: `As ${persona.title}, I believe this deserves deeper analysis.` }]);
        setChatLoading(false);
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden border flex"
        style={{
          background: "linear-gradient(135deg, rgba(10,8,20,0.98) 0%, rgba(15,12,30,0.98) 100%)",
          borderColor: `${color}30`,
          boxShadow: `0 0 60px ${persona.glow}, 0 40px 80px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Left: Profile (40%) */}
        <div className="w-[40%] flex flex-col border-r p-6 gap-4 overflow-y-auto" style={{ borderColor: `${color}15` }}>
          {/* Avatar + Ring */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <ConfidenceRing pct={response.confidence} color={color} animate size={64} />
              <div
                className="absolute inset-[7px] rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${color}25, ${color}10)`, border: `1px solid ${color}30` }}
              >
                <span style={{ color }}>{persona.initials}</span>
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-white/90">{persona.name}</p>
              <p className="text-xs text-white/40">{persona.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                  {response.confidence}% confidence
                </div>
              </div>
            </div>
          </div>

          {/* Confidence history chart */}
          <div className="rounded-2xl bg-white/4 border border-white/8 p-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Confidence History</p>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: `1px solid ${color}30`, borderRadius: 8, fontSize: 10 }}
                  labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                  itemStyle={{ color }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} opacity={0.8}>
                  {chartData.map((_, idx) => <Cell key={idx} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Full analysis */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Full Analysis</p>
            {banterTarget && <BanterChip referencedName={banterTarget} color={banterTargetColor} />}
            <p className="text-[12px] text-white/70 leading-relaxed">
              {renderBoldTerms(response.analysis, color, showTooltip, setShowTooltip)}
            </p>
          </div>

          {/* Socratic question */}
          <div className="rounded-2xl p-3 border" style={{ background: `${color}08`, borderColor: `${color}20` }}>
            <p className="text-[11px] font-bold text-white/80">{response.question}</p>
          </div>

          {/* Stat */}
          <p className="text-[10px] text-white/30 italic">{persona.stat}</p>
        </div>

        {/* Right: Chat (60%) */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: `${color}15` }}>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
              1-on-1 Deep Dive with {persona.name.split(" ")[0]}
            </p>
            <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto council-hidden-scrollbar p-5 space-y-3">
            {chatMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[11px] text-white/20 text-center max-w-xs">
                  Ask {persona.name.split(" ")[0]} anything about your idea. She'll respond in character with her unique perspective.
                </p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`text-[12px] rounded-2xl px-4 py-3 leading-relaxed ${
                  m.role === "user"
                    ? "bg-white/10 text-white/85 ml-12"
                    : "text-white/65 mr-12"
                }`}
                style={m.role === "ai" ? { background: `${color}08`, border: `1px solid ${color}15` } : undefined}
              >
                {m.text}
                {m.role === "ai" && i === chatMessages.length - 1 && chatLoading && (
                  <span className="inline-block w-1.5 h-3.5 bg-white/40 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            ))}
            {chatLoading && chatMessages[chatMessages.length - 1]?.role !== "ai" && <TypingDots />}
            <div ref={chatEndRef} />
          </div>

          <div className="px-5 pb-5 shrink-0">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder={`Ask ${persona.name.split(" ")[0]} a question…`}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[12px] text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading}
                className="w-10 h-10 flex items-center justify-center rounded-2xl self-end transition-colors"
                style={{ background: `${color}30` }}
              >
                {chatLoading ? <Loader2 size={13} className="animate-spin" style={{ color }} /> : <Send size={13} style={{ color }} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Persona Card ──

interface PersonaCardProps {
  persona: Persona;
  state: "idle" | "typing" | "revealed";
  response: { analysis: string; question: string; confidence: number } | null;
  isExpanded: boolean;
  anyExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onFullscreen: () => void;
  floatingEmojis: string[];
  userId?: string | null;
  sessionId?: string;
}

const PersonaCard: React.FC<PersonaCardProps> = ({
  persona, state, response, isExpanded, anyExpanded, onExpand, onCollapse, onFullscreen, floatingEmojis, userId, sessionId,
}) => {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const Icon = persona.icon;
  const color = SENTIMENT_COLORS[persona.sentiment];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // SSE streaming sendChat — persists to council_threads with session_id
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);

    let streamText = "";
    const addMsg = () => setChatMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === "ai") return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: streamText } : m);
      return [...prev, { role: "ai", text: streamText }];
    });

    await streamDeepDive({
      personaKey: persona.key,
      question: msg,
      onDelta: chunk => { streamText += chunk; addMsg(); },
      onDone: async () => {
        setChatLoading(false);
        // Persist thread — even before "Save to Council", tagged with session_id
        if (userId) {
          try {
            const db = supabase as any;
            await db.from("council_threads").insert({
              user_id: userId,
              persona_key: persona.key,
              user_message: msg,
              persona_reply: streamText,
              // response_id left null — linked after save; session tracked locally
            });
          } catch {
            // silent
          }
        }
      },
      onError: () => {
        setChatMessages(prev => [...prev, { role: "ai", text: `As ${persona.title}, I believe this deserves deeper analysis.` }]);
        setChatLoading(false);
      },
    });
  };

  const banterTarget = response
    ? PERSONA_NAMES.find(n => n !== persona.name.split(" ")[0] && response.analysis.includes(n))
    : null;
  const banterTargetColor = banterTarget
    ? SENTIMENT_COLORS[PERSONAS.find(p => p.name.startsWith(banterTarget))?.sentiment || "positive"]
    : "#fff";

  const isCollapsed = anyExpanded && !isExpanded;

  return (
    <motion.div
      layout
      animate={{
        flex: isExpanded ? 7 : 1,
        opacity: isCollapsed ? 0.5 : 1,
        boxShadow: state !== "idle" ? `0 0 30px ${persona.glow}, 0 0 60px ${persona.glow}` : `0 0 12px rgba(0,0,0,0.3)`,
      }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-3xl border overflow-hidden backdrop-blur-xl min-w-0"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: state !== "idle" ? persona.glowBorder : "rgba(255,255,255,0.1)",
      }}
    >
      {state === "idle" && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ background: `radial-gradient(circle at 50% 30%, ${color}, transparent 70%)` }}
        />
      )}

      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative w-14 h-14 shrink-0">
            <ConfidenceRing pct={response?.confidence ?? persona.ringPct} color={color} animate={state === "revealed"} size={56} />
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
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 mt-1">
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                  {response?.confidence ?? persona.ringPct}%
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <div className="relative group">
              <button className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                <BarChart2 size={12} />
              </button>
              <div className="absolute right-0 bottom-full mb-1 px-2 py-1.5 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-[9px] text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {persona.stat}
              </div>
            </div>
            {state === "revealed" && !isExpanded && (
              <>
                <button onClick={onExpand} title="1-on-1 Deep Dive" className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                  <MessageSquare size={12} />
                </button>
                <button onClick={onFullscreen} title="Full View" className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                  <Maximize2 size={11} />
                </button>
              </>
            )}
            {isExpanded && (
              <>
                <button onClick={onFullscreen} title="Full View" className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                  <Maximize2 size={11} />
                </button>
                <button onClick={onCollapse} className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors">
                  <X size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {state === "idle" && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 2.8, repeat: Infinity }}
            >
              {React.createElement(Icon as React.ComponentType<{ size?: number; style?: React.CSSProperties }>, { size: 22, style: { color: `${color}60` } })}
            </motion.div>
          </div>
        )}

        {state === "typing" && <TypingDots />}

        {state === "revealed" && response && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto council-hidden-scrollbar text-[11px] text-white/65 leading-relaxed space-y-2">
              {banterTarget && <BanterChip referencedName={banterTarget} color={banterTargetColor} />}
              <p>{renderBoldTerms(response.analysis, color, showTooltip, setShowTooltip)}</p>
              <p className="font-bold text-white/80 mt-1">{response.question}</p>
            </div>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 border-t border-white/8 pt-3 flex flex-col gap-2"
              >
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">1-on-1 Deep Dive with {persona.name.split(" ")[0]}</p>
                <div className="max-h-[140px] overflow-y-auto council-hidden-scrollbar space-y-2">
                  {chatMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`text-[10px] rounded-xl px-2.5 py-1.5 leading-snug ${
                        m.role === "user"
                          ? "bg-white/10 text-white/80 ml-6"
                          : "bg-white/5 text-white/60 mr-6"
                      }`}
                    >
                      {m.text}
                      {m.role === "ai" && i === chatMessages.length - 1 && chatLoading && (
                        <span className="inline-block w-1 h-3 bg-white/40 animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                  ))}
                  {chatLoading && chatMessages[chatMessages.length - 1]?.role !== "ai" && <TypingDots />}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-1">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder={`Ask ${persona.name.split(" ")[0]}…`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-white/20"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading}
                    className="w-7 h-7 flex items-center justify-center rounded-xl"
                    style={{ background: `${color}30` }}
                  >
                    {chatLoading ? <Loader2 size={10} className="animate-spin" style={{ color }} /> : <Send size={10} style={{ color }} />}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {floatingEmojis.map((emoji, idx) => (
          <FloatingEmoji key={idx} emoji={emoji} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Export Modal ──

const ExportModal: React.FC<{ avgRing: number; idea: string; responses: Record<string, { confidence: number } | null>; onClose: () => void }> = ({ avgRing, idea, responses, onClose }) => (
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
              <p className="text-[9px] font-bold" style={{ color: SENTIMENT_COLORS[p.sentiment] }}>
                {responses[p.key]?.confidence ?? p.ringPct}%
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mb-5">
          <p className="text-3xl font-bold text-white">{avgRing}%</p>
          <p className="text-xs text-white/40 mt-0.5">Consensus Score</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `The Council Verdict\n\nIdea: ${idea}\nConsensus Score: ${avgRing}%\n\n${PERSONAS.map(p => `${p.name} (${responses[p.key]?.confidence ?? p.ringPct}% confidence)`).join("\n")}`
              );
            }}
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

// ── Main Boardroom ──

type CardState = "idle" | "typing" | "revealed";

export interface BoardroomPersonaResponse {
  analysis: string;
  question: string;
  confidence: number;
}

// Session-id stored in localStorage so pre-save threads survive page reloads
const getOrCreateSessionId = (): string => {
  let sid = localStorage.getItem("boardroom_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("boardroom_session_id", sid);
  }
  return sid;
};

const resetSessionId = (): string => {
  const sid = crypto.randomUUID();
  localStorage.setItem("boardroom_session_id", sid);
  return sid;
};

export interface RestorableBoardroomIdea {
  id: string;
  content: string;
  responses: { persona_key: string; vote_score: number | null; analysis: string | null }[];
}

interface CouncilBoardroomProps {
  onRestoreIdea?: (idea: RestorableBoardroomIdea) => void;
}

const CouncilBoardroom: React.FC<CouncilBoardroomProps> = ({ onRestoreIdea }) => {
  const { user } = useAuth();
  const [idea, setIdea] = useState("");
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({
    elena: "idle", helen: "idle", anton: "idle", margot: "idle",
  });
  const [responses, setResponses] = useState<Record<string, BoardroomPersonaResponse | null>>({
    elena: null, helen: null, anton: null, margot: null,
  });
  const [actionPlan, setActionPlan] = useState<string[]>(DEFAULT_ACTION_PLAN);
  const [isConsulting, setIsConsulting] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [fullscreenPersona, setFullscreenPersona] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<Record<string, string[]>>({
    elena: [], helen: [], anton: [], margot: [],
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [savedIdeaId, setSavedIdeaId] = useState<string | null>(null);
  // Personality sliders per advisor
  const [personalitySliders, setPersonalitySliders] = useState<AllSliders>(DEFAULT_ALL_SLIDERS);
  // Shared session banner (viewing someone else's link)
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedByName, setSharedByName] = useState<string | null>(null);
  // Council Digest modal (shown after saving)
  const [showDigest, setShowDigest] = useState(false);
  // Onboarding tour for first-time users
  const [showTour, setShowTour] = useState(false);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const emojiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealedCountRef = useRef(0);
  // Realtime presence: collaborators watching the boardroom
  const [collaborators, setCollaborators] = useState<{ userId: string; displayName: string; isConsulting: boolean }[]>([]);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // PDF export ref (not used for jsPDF but kept for future screenshots)
  const boardroomRef = useRef<HTMLDivElement>(null);

  const allRevealed = revealedCount === 4;
  const avgRing = Math.round(
    PERSONAS.reduce((a, p) => a + (responses[p.key]?.confidence ?? p.ringPct), 0) / PERSONAS.length
  );

  // ── Realtime presence: join/leave channel ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("boardroom-presence", {
      config: { presence: { key: user.id } },
    });
    realtimeChannelRef.current = channel;

    const displayName = user.email?.split("@")[0] || "Anonymous";

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ displayName: string; isConsulting: boolean }>();
        const colabs = Object.entries(state)
          .filter(([uid]) => uid !== user.id)
          .map(([uid, presenceArr]) => {
            const latest = (presenceArr as any[])[0] || {};
            return { userId: uid, displayName: latest.displayName || uid.slice(0,6), isConsulting: !!latest.isConsulting };
          });
        setCollaborators(colabs);
      })
      .on("broadcast", { event: "boardroom-consult" }, ({ payload }) => {
        // Another team member consulted the board — show their results live
        if (payload?.userId !== user.id && payload?.responses) {
          const restored: Record<string, BoardroomPersonaResponse | null> = { elena: null, helen: null, anton: null, margot: null };
          (payload.responses as { key: string; analysis: string; question: string; confidence: number }[]).forEach(r => {
            if (r.key) restored[r.key] = { analysis: r.analysis, question: r.question, confidence: r.confidence };
          });
          setResponses(restored);
          setCardStates({ elena: "revealed", helen: "revealed", anton: "revealed", margot: "revealed" });
          setRevealedCount(4);
          revealedCountRef.current = 4;
          if (payload.idea) setIdea(payload.idea);
          if (payload.actionPlan) setActionPlan(payload.actionPlan);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ displayName, isConsulting: false });
        }
      });

    return () => {
      channel.unsubscribe();
      realtimeChannelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Show onboarding tour for first-time users
  useEffect(() => {
    if (localStorage.getItem("boardroom_tour_done")) return;
    const timer = setTimeout(() => setShowTour(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const getConsensusLabel = () => {
    if (avgRing >= 70) return { label: "Strong Consensus — Proceed", color: "#34d399" };
    if (avgRing >= 40) return { label: "Mixed Opinions — Proceed with Caution", color: "#fbbf24" };
    return { label: "Divided — Further Analysis Required", color: "#f87171" };
  };

  const startFloatingEmojis = useCallback((typingKey: string) => {
    if (emojiTimerRef.current) clearInterval(emojiTimerRef.current);
    emojiTimerRef.current = setInterval(() => {
      const reactingPersonas = PERSONAS.filter(p => p.key !== typingKey);
      const randomPersona = reactingPersonas[Math.floor(Math.random() * reactingPersonas.length)];
      const pool = REACTION_POOLS[randomPersona.sentiment];
      const emoji = pool[Math.floor(Math.random() * pool.length)];
      setFloatingEmojis(prev => ({ ...prev, [randomPersona.key]: [emoji] }));
      setTimeout(() => setFloatingEmojis(prev => ({ ...prev, [randomPersona.key]: [] })), 2000);
    }, 1400);
  }, []);

  const stopFloatingEmojis = useCallback(() => {
    if (emojiTimerRef.current) { clearInterval(emojiTimerRef.current); emojiTimerRef.current = null; }
    setFloatingEmojis({ elena: [], helen: [], anton: [], margot: [] });
  }, []);

  useEffect(() => {
    return () => { if (emojiTimerRef.current) clearInterval(emojiTimerRef.current); };
  }, []);

  const revealPersonaSequence = useCallback(async (aiPersonas: Record<string, BoardroomPersonaResponse | null>) => {
    for (let i = 0; i < PERSONAS.length; i++) {
      const p = PERSONAS[i];
      startFloatingEmojis(p.key);
      setCardStates(prev => ({ ...prev, [p.key]: "typing" }));
      await new Promise(r => setTimeout(r, 1500 + p.delay * 0.3));
      const res = aiPersonas[p.key] || MOCK_RESPONSES[p.key];
      setCardStates(prev => ({ ...prev, [p.key]: "revealed" }));
      setResponses(prev => ({ ...prev, [p.key]: res }));
      revealedCountRef.current += 1;
      setRevealedCount(revealedCountRef.current);
    }
    stopFloatingEmojis();
  }, [startFloatingEmojis, stopFloatingEmojis]);

  // Replay mode state
  const [isReplaying, setIsReplaying] = useState(false);

  // Restore a previously saved boardroom session
  const handleRestore = useCallback((savedIdea: RestorableBoardroomIdea, replay = false) => {
    setIdea(savedIdea.content);
    setSavedIdeaId(savedIdea.id);

    // Build the saved responses map (used for both instant restore + replay)
    const savedResponses: Record<string, BoardroomPersonaResponse | null> = {
      elena: null, helen: null, anton: null, margot: null,
    };
    savedIdea.responses.forEach(r => {
      if (r.persona_key in savedResponses) {
        const mock = MOCK_RESPONSES[r.persona_key];
        savedResponses[r.persona_key] = {
          analysis: r.analysis || mock?.analysis || "",
          question: mock?.question || "",
          confidence: r.vote_score ?? mock?.confidence ?? 50,
        };
      }
    });

    if (replay) {
      // Reset to idle first, then animate the reveal sequence
      setCardStates({ elena: "idle", helen: "idle", anton: "idle", margot: "idle" });
      setResponses({ elena: null, helen: null, anton: null, margot: null });
      setRevealedCount(0);
      revealedCountRef.current = 0;
      setExpandedCard(null);
      setSaveState("idle");
      setIsReplaying(true);
      sessionIdRef.current = resetSessionId();
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Delay slightly so idle state renders first
      setTimeout(async () => {
        await revealPersonaSequence(savedResponses);
        setIsReplaying(false);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 3000);
      }, 300);
    } else {
      // Instant restore
      const newStates: Record<string, CardState> = { elena: "idle", helen: "idle", anton: "idle", margot: "idle" };
      savedIdea.responses.forEach(r => {
        if (r.persona_key in newStates) newStates[r.persona_key] = "revealed";
      });
      setCardStates(newStates);
      setResponses(savedResponses);
      setRevealedCount(savedIdea.responses.filter(r => r.persona_key in newStates).length);
      revealedCountRef.current = savedIdea.responses.filter(r => r.persona_key in newStates).length;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
      sessionIdRef.current = resetSessionId();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [revealPersonaSequence]);

  // Expose restore to parent via onRestoreIdea prop
  useEffect(() => {
    if (onRestoreIdea) {
      (window as any).__boardroomRestore = handleRestore;
    }
  }, [onRestoreIdea, handleRestore]);

  // ── New Session: reset everything including personality sliders ──
  const handleNewSession = useCallback(() => {
    setIdea("");
    setCardStates({ elena: "idle", helen: "idle", anton: "idle", margot: "idle" });
    setResponses({ elena: null, helen: null, anton: null, margot: null });
    setActionPlan(DEFAULT_ACTION_PLAN);
    setRevealedCount(0);
    revealedCountRef.current = 0;
    setExpandedCard(null);
    setFullscreenPersona(null);
    setSavedIdeaId(null);
    setSaveState("idle");
    setIsSharedView(false);
    setFloatingEmojis({ elena: [], helen: [], anton: [], margot: [] });
    sessionIdRef.current = resetSessionId();
    // Reset personality sliders to per-advisor defaults
    setPersonalitySliders(DEFAULT_ALL_SLIDERS);
    toast("New session started — advisor personalities reset to defaults.", { duration: 2500 });
  }, []);

  // ── PDF Export — styled summary card using jsPDF ──
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const handleExportPDF = useCallback(async () => {
    if (!allRevealed || isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();

      // ── Background
      doc.setFillColor(10, 8, 20);
      doc.rect(0, 0, W, 297, "F");

      // ── Header bar
      doc.setFillColor(30, 20, 60);
      doc.roundedRect(10, 10, W - 20, 18, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(139, 92, 246);
      doc.text("THE COUNCIL  —  BOARDROOM ANALYSIS", W / 2, 20, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(180, 160, 220);
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - 14, 20, { align: "right" });

      // ── Idea
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      const ideaLines = doc.splitTextToSize(`"${idea || "Your Idea"}"`, W - 28);
      doc.text(ideaLines, W / 2, 38, { align: "center" });
      let y = 38 + ideaLines.length * 6 + 6;

      // ── Consensus bar
      const consensusLabel = getConsensusLabel();
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 200);
      doc.setFont("helvetica", "normal");
      doc.text("BOARD CONSENSUS", W / 2, y, { align: "center" });
      y += 5;
      const barW = W - 40;
      const barX = 20;
      doc.setFillColor(30, 25, 50);
      doc.roundedRect(barX, y, barW, 5, 2, 2, "F");
      const hex2rgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b] as [number, number, number];
      };
      const [cr, cg, cb] = hex2rgb(consensusLabel.color.replace(/[^#0-9a-fA-F]/g, "").padEnd(7, "0").slice(0, 7));
      doc.setFillColor(cr, cg, cb);
      doc.roundedRect(barX, y, (avgRing / 100) * barW, 5, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(cr, cg, cb);
      doc.text(`${avgRing}%  ${consensusLabel.label}`, W / 2, y + 10, { align: "center" });
      y += 18;

      // ── 4 Advisor Cards
      const personaColors: Record<string, [number, number, number]> = {
        elena: [52, 211, 153], helen: [251, 191, 36], anton: [248, 113, 113], margot: [34, 211, 238],
      };
      const cardW = (W - 24) / 2;
      const cards = PERSONAS.map(p => ({ p, r: responses[p.key] }));
      for (let i = 0; i < 4; i++) {
        const { p, r } = cards[i];
        const cx = 10 + (i % 2) * (cardW + 4);
        const cy = y + Math.floor(i / 2) * 52;
        const [pr, pg, pb] = personaColors[p.key] || [180, 180, 180];
        doc.setFillColor(15, 12, 30);
        doc.roundedRect(cx, cy, cardW, 48, 3, 3, "F");
        doc.setDrawColor(pr, pg, pb);
        doc.setLineWidth(0.3);
        doc.roundedRect(cx, cy, cardW, 48, 3, 3, "S");
        // Name + confidence
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(pr, pg, pb);
        doc.text(p.name, cx + 4, cy + 7);
        doc.setFontSize(7);
        doc.setTextColor(pr * 0.7, pg * 0.7, pb * 0.7);
        doc.text(p.title, cx + 4, cy + 12);
        const conf = r?.confidence ?? p.ringPct;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(pr, pg, pb);
        doc.text(`${conf}%`, cx + cardW - 4, cy + 7, { align: "right" });
        // Mini confidence bar
        doc.setFillColor(30, 25, 50);
        doc.roundedRect(cx + 4, cy + 14, cardW - 8, 2, 1, 1, "F");
        doc.setFillColor(pr, pg, pb);
        doc.roundedRect(cx + 4, cy + 14, ((conf / 100) * (cardW - 8)), 2, 1, 1, "F");
        // Analysis text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(180, 170, 200);
        const analysis = r?.analysis || "No analysis available.";
        const lines = doc.splitTextToSize(analysis, cardW - 8);
        doc.text(lines.slice(0, 4), cx + 4, cy + 20);
      }
      y += 108;

      // ── Action Plan
      doc.setFillColor(18, 12, 40);
      doc.roundedRect(10, y, W - 20, 8 + actionPlan.length * 10, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(139, 92, 246);
      doc.text("✦  RECOMMENDED ACTION PLAN", 14, y + 6);
      actionPlan.forEach((step, idx) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(200, 190, 220);
        const lines = doc.splitTextToSize(`${idx + 1}. ${step}`, W - 28);
        doc.text(lines, 14, y + 12 + idx * 10);
      });

      // ── Footer
      doc.setFontSize(6);
      doc.setTextColor(80, 70, 100);
      doc.text("Generated by Flux Boardroom  ·  aurora-flux-core.lovable.app", W / 2, 287, { align: "center" });

      doc.save(`boardroom-${(idea || "analysis").slice(0, 40).replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF downloaded!");
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error("PDF export failed");
    }
    setIsExportingPDF(false);
  }, [idea, actionPlan, responses, avgRing, allRevealed, isExportingPDF]);

  // ── Shared Session: generate shareable URL with base64-encoded analysis ──
  const handleShareSession = useCallback(async () => {
    if (!allRevealed) return;
    try {
      // Fetch sharer's display name for the banner
      let sharedBy = user?.email?.split("@")[0] || "Someone";
      if (user) {
        const db = supabase as any;
        const { data: profile } = await db
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.display_name) sharedBy = profile.display_name;
      }
      const payload = {
        idea: idea || "Should I start a new business?",
        sharedBy,
        responses: PERSONAS.map(p => ({
          key: p.key,
          analysis: responses[p.key]?.analysis || "",
          question: responses[p.key]?.question || "",
          confidence: responses[p.key]?.confidence ?? p.ringPct,
        })),
        actionPlan,
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const url = `${window.location.origin}${window.location.pathname}?boardroom=${encoded}`;
      await navigator.clipboard.writeText(url);
      toast.success("Shareable link copied!", { description: "Anyone with the link can view this analysis." });
    } catch {
      toast.error("Failed to copy link");
    }
  }, [allRevealed, idea, responses, actionPlan]);

  // ── On mount: check for shared session in URL ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("boardroom");
    if (!encoded) return;
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      if (payload?.responses && payload?.idea) {
        setIdea(payload.idea);
        if (payload.actionPlan) setActionPlan(payload.actionPlan);
        const newStates: Record<string, CardState> = { elena: "idle", helen: "idle", anton: "idle", margot: "idle" };
        const newResponses: Record<string, BoardroomPersonaResponse | null> = { elena: null, helen: null, anton: null, margot: null };
        (payload.responses as { key: string; analysis: string; question: string; confidence: number }[]).forEach(r => {
          if (r.key in newStates) {
            newStates[r.key] = "revealed";
            newResponses[r.key] = { analysis: r.analysis, question: r.question, confidence: r.confidence };
          }
        });
        setCardStates(newStates);
        setResponses(newResponses);
        setRevealedCount(4);
        revealedCountRef.current = 4;
        setIsSharedView(true);
        if (payload.sharedBy) setSharedByName(payload.sharedBy);
        const clean = new URL(window.location.href);
        clean.searchParams.delete("boardroom");
        window.history.replaceState({}, "", clean.toString());
      }
    } catch { /* malformed — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConsult = async () => {
    if (isConsulting) return;
    setIsConsulting(true);
    setRevealedCount(0);
    revealedCountRef.current = 0;
    setExpandedCard(null);
    setFullscreenPersona(null);
    setCardStates({ elena: "idle", helen: "idle", anton: "idle", margot: "idle" });
    setResponses({ elena: null, helen: null, anton: null, margot: null });
    setSavedIdeaId(null);
    setSaveState("idle");
    // Fresh session for new consult
    sessionIdRef.current = resetSessionId();
    // Broadcast "consulting" presence state
    if (realtimeChannelRef.current && user) {
      const displayName = user.email?.split("@")[0] || "Anonymous";
      realtimeChannelRef.current.track({ displayName, isConsulting: true }).catch(() => {});
    }

    let aiPersonas: Record<string, BoardroomPersonaResponse | null> = { elena: null, helen: null, anton: null, margot: null };
    let finalActionPlan: string[] = DEFAULT_ACTION_PLAN;
    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "boardroom-consult",
          idea: idea || "Should I start a new business?",
          personality_sliders: personalitySliders,
        },
      });
      if (!error && data?.personas && Array.isArray(data.personas)) {
        data.personas.forEach((p: { key: string; analysis: string; question: string; confidence: number }) => {
          if (p.key) aiPersonas[p.key] = { analysis: p.analysis, question: p.question, confidence: p.confidence };
        });
        if (data.action_plan && Array.isArray(data.action_plan)) {
          finalActionPlan = data.action_plan;
          setActionPlan(finalActionPlan);
        }
      }
    } catch {
      // fallback to mock
    }

    // Broadcast results to team members watching the boardroom
    if (realtimeChannelRef.current && user) {
      const broadcastPayload = {
        userId: user.id,
        idea: idea || "Should I start a new business?",
        responses: PERSONAS.map(p => ({ key: p.key, ...(aiPersonas[p.key] || MOCK_RESPONSES[p.key]) })),
        actionPlan: finalActionPlan,
      };
      realtimeChannelRef.current.send({ type: "broadcast", event: "boardroom-consult", payload: broadcastPayload }).catch(() => {});
      const displayName = user.email?.split("@")[0] || "Anonymous";
      realtimeChannelRef.current.track({ displayName, isConsulting: false }).catch(() => {});
    }

    await revealPersonaSequence(aiPersonas);
    setIsConsulting(false);
  };

  const handleSaveToCouncil = useCallback(async () => {
    if (!user || !allRevealed || saveState !== "idle") return;
    setSaveState("saving");
    try {
      // Insert idea
      const { data: ideaData, error: ideaError } = await supabase
        .from("council_ideas")
        .insert({ content: idea || "Untitled Idea", user_id: user.id, consensus_score: avgRing })
        .select("id")
        .single();
      if (ideaError || !ideaData) throw ideaError;

      // Insert responses for each revealed persona
      const inserts = PERSONAS
        .filter(p => responses[p.key])
        .map(p => ({
          idea_id: ideaData.id,
          user_id: user.id,
          persona_key: p.key,
          analysis: responses[p.key]!.analysis,
          vote: responses[p.key]!.confidence >= 60 ? "yes" : responses[p.key]!.confidence >= 40 ? "maybe" : "no",
          vote_score: responses[p.key]!.confidence,
        }));
      await supabase.from("council_responses").insert(inserts);
      setSavedIdeaId(ideaData.id);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
      // Show digest modal
      setShowDigest(true);
    } catch {
      setSaveState("idle");
    }
  }, [user, allRevealed, saveState, idea, avgRing, responses]);

  const consensus = getConsensusLabel();
  const fullscreenP = fullscreenPersona ? PERSONAS.find(p => p.key === fullscreenPersona) : null;
  const fullscreenR = fullscreenPersona ? responses[fullscreenPersona] : null;

  // ── Council Digest text ──
  const digestText = `THE COUNCIL — BOARDROOM ANALYSIS
Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

IDEA: ${idea || "Your Idea"}
CONSENSUS SCORE: ${avgRing}%  —  ${consensus.label}

ADVISOR VERDICTS:
${PERSONAS.map(p => {
    const r = responses[p.key];
    if (!r) return "";
    return `▸ ${p.name} (${p.title}) — ${r.confidence}% confidence\n  ${r.analysis}\n  ${r.question}`;
  }).filter(Boolean).join("\n\n")}

ACTION PLAN:
${actionPlan.map((s, i) => `${i + 1}. ${s}`).join("\n")}

— Flux Boardroom · aurora-flux-core.lovable.app`;

  // ── Notion-formatted digest ──
  const notionText = `# 🏛️ Council Boardroom Analysis

> **${idea || "Your Idea"}**

---

## 📊 Consensus Score: ${avgRing}% — ${consensus.label}

*Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*

---

## 🧠 Advisor Verdicts

${PERSONAS.map(p => {
    const r = responses[p.key];
    if (!r) return "";
    const voteEmoji = r.confidence >= 70 ? "✅" : r.confidence >= 40 ? "⚠️" : "❌";
    return `### ${voteEmoji} ${p.name} — ${p.title} (${r.confidence}% confidence)\n\n${r.analysis}\n\n> 💬 **${p.name} asks:** ${r.question}`;
  }).filter(Boolean).join("\n\n---\n\n")}

---

## 📋 Recommended Action Plan

${actionPlan.map((s, i) => `${i + 1}. ${s}`).join("\n")}

---

*Powered by Flux Boardroom · [aurora-flux-core.lovable.app](https://aurora-flux-core.lovable.app)*`;

  return (
    <div ref={boardroomRef} className="flex flex-col h-full min-h-0 gap-4">
      {/* Onboarding tour */}
      <AnimatePresence>
        {showTour && (
          <BoardroomOnboardingTour onDismiss={() => {
            setShowTour(false);
            localStorage.setItem("boardroom_tour_done", "1");
          }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSharedView && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Eye size={12} className="text-purple-400/70 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-purple-300">
                  {sharedByName ? `Shared by ${sharedByName}` : "Shared Boardroom analysis"}
                </p>
                <p className="text-[9px] text-white/35">
                  {sharedByName
                    ? `${sharedByName} shared this council analysis with you. Sign up to save your own sessions.`
                    : "This analysis was shared with you. Sign up to save your own sessions and consult the board."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!user && (
                <a
                  href="/auth"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-purple-200 transition-colors"
                  style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.35)" }}
                >
                  <Sparkles size={9} /> Sign up free
                </a>
              )}
              <button onClick={() => setIsSharedView(false)} className="w-5 h-5 flex items-center justify-center text-white/25 hover:text-white/50 transition-colors">
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Realtime collaborators pill */}
      <AnimatePresence>
        {collaborators.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start"
            style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)" }}
          >
            <Users size={10} className="text-cyan-400/70" />
            <span className="text-[9px] text-cyan-400/70 font-medium">
              {collaborators.map(c => (
                <span key={c.userId} className="inline-flex items-center gap-1 mr-2">
                  {c.isConsulting && <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                  {c.displayName}
                </span>
              ))}
              {collaborators.some(c => c.isConsulting) ? "is consulting the board…" : "watching live"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* New Session button */}
          <button
            onClick={handleNewSession}
            disabled={isConsulting}
            title="New Session"
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors shrink-0 disabled:opacity-30"
          >
            <RotateCcw size={14} />
          </button>
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
          {/* Export PDF button */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || !allRevealed}
            title="Export PDF"
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors shrink-0 disabled:opacity-30"
          >
            {isExportingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
          {/* Share session link */}
          <button
            onClick={handleShareSession}
            disabled={!allRevealed}
            title="Copy Shareable Link"
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors shrink-0 disabled:opacity-30"
          >
            <Link size={14} />
          </button>
          {/* Share verdict card */}
          <button
            onClick={() => setShowExport(true)}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors shrink-0"
            title="Share Verdict Card"
          >
            <Share2 size={15} />
          </button>
          {/* Help / Onboarding tour trigger */}
          <button
            onClick={() => setShowTour(true)}
            title="How to use the Boardroom"
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/20 hover:text-white/50 hover:bg-white/8 transition-colors shrink-0"
          >
            <span className="text-[13px] font-bold">?</span>
          </button>
        </div>

        {/* Personality sliders */}
        <BoardroomPersonalitySliders
          sliders={personalitySliders}
          onChange={setPersonalitySliders}
        />

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

      {/* 2×2 grid with flex for expand */}
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">
          {[PERSONAS[0], PERSONAS[2]].map(persona => (
            <PersonaCard
              key={persona.key}
              persona={persona}
              state={cardStates[persona.key]}
              response={responses[persona.key]}
              isExpanded={expandedCard === persona.key}
              anyExpanded={expandedCard !== null}
              onExpand={() => setExpandedCard(persona.key)}
              onCollapse={() => setExpandedCard(null)}
              onFullscreen={() => setFullscreenPersona(persona.key)}
              floatingEmojis={floatingEmojis[persona.key]}
              userId={user?.id}
              sessionId={sessionIdRef.current}
            />
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">
          {[PERSONAS[1], PERSONAS[3]].map(persona => (
            <PersonaCard
              key={persona.key}
              persona={persona}
              state={cardStates[persona.key]}
              response={responses[persona.key]}
              isExpanded={expandedCard === persona.key}
              anyExpanded={expandedCard !== null}
              onExpand={() => setExpandedCard(persona.key)}
              onCollapse={() => setExpandedCard(null)}
              onFullscreen={() => setFullscreenPersona(persona.key)}
              floatingEmojis={floatingEmojis[persona.key]}
              userId={user?.id}
              sessionId={sessionIdRef.current}
            />
          ))}
        </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
                ✦ Council's Recommended Action Plan
              </h3>
              {user && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSaveToCouncil}
                  disabled={saveState !== "idle"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all disabled:opacity-70"
                  style={
                    saveState === "saved"
                      ? { background: "rgba(52,211,153,0.2)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }
                      : { background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                  }
                >
                  {saveState === "saving" ? (
                    <><Loader2 size={9} className="animate-spin" /> Saving…</>
                  ) : saveState === "saved" ? (
                    <><Check size={9} /> Saved to Council</>
                  ) : (
                    <><BookmarkPlus size={9} /> Save to Council</>
                  )}
                </motion.button>
              )}
            </div>
            <ol className="space-y-2">
              {actionPlan.map((step, i) => (
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
          <ExportModal avgRing={avgRing} idea={idea} responses={responses} onClose={() => setShowExport(false)} />
        )}
      </AnimatePresence>

      {/* Council Digest modal */}
      <AnimatePresence>
        {showDigest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
            onClick={() => setShowDigest(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl overflow-hidden border"
              style={{ background: "linear-gradient(135deg, rgba(10,8,20,0.98), rgba(20,12,40,0.98))", borderColor: "rgba(139,92,246,0.3)", boxShadow: "0 0 60px rgba(139,92,246,0.2)" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-purple-400/70" />
                  <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Council Digest</p>
                </div>
                <button onClick={() => setShowDigest(false)} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-[10px] text-white/35">Copy this digest to paste into email, Notion, Slack, or anywhere you need a formatted summary.</p>
                <pre
                  className="w-full p-4 rounded-2xl text-[10px] leading-relaxed text-white/60 overflow-auto max-h-60 font-mono"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", whiteSpace: "pre-wrap" }}
                >
                  {digestText}
                </pre>
                 <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(digestText); toast.success("Digest copied to clipboard!"); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-purple-200 transition-colors"
                    style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
                  >
                    <Copy size={11} /> Copy Digest
                  </button>
                  <button
                    onClick={handleSendToNotion}
                    disabled={isSendingNotion}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}
                    title="Send to Notion as a formatted page (requires Notion API key in settings)"
                  >
                    {isSendingNotion ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                    {isSendingNotion ? "Sending…" : "Send to Notion"}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(notionText); toast.success("Notion markdown copied!"); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                    title="Copy Notion-formatted markdown"
                  >
                    <Copy size={10} />
                  </button>
                  <button
                    onClick={() => { handleExportPDF(); setShowDigest(false); }}
                    disabled={isExportingPDF}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {isExportingPDF ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    PDF
                  </button>
                  <button
                    onClick={() => setShowDigest(false)}
                    className="px-4 py-2.5 rounded-xl text-xs text-white/25 hover:text-white/50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen persona modal */}
      <AnimatePresence>
        {fullscreenP && fullscreenR && (
          <FullscreenModal
            persona={fullscreenP}
            response={fullscreenR}
            savedIdeaId={savedIdeaId}
            userId={user?.id ?? null}
            onClose={() => setFullscreenPersona(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CouncilBoardroom;
