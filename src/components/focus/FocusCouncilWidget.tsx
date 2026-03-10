import { useState, useRef, useCallback } from "react";
import { Send, Loader2, Swords, Eye, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useFlux } from "@/context/FluxContext";
import { PERSONAS } from "../TheCouncil";
import DraggableWidget from "./DraggableWidget";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import CouncilAvatar from "../council/CouncilAvatar";
import { useMonetization } from "@/context/MonetizationContext";
import { SPARKS_COSTS } from "@/lib/sparksConfig";

type CouncilMode = "full" | "single" | "debate";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Tooltip for highlighted terms
const HighlightTerm = ({ term, tip }: { term: string; tip: string }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="font-semibold text-white/90 border-b border-dashed border-white/30 cursor-pointer"
      >
        {term}
      </button>
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-max max-w-[160px] px-2 py-1 rounded-lg bg-white/10 backdrop-blur-xl border border-white/15 text-[9px] text-white/70 text-center pointer-events-none"
          >
            {tip}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

// Pre-filled mock council response
interface MockCard {
  personaIdx: number;
  name: string;
  role: string;
  color: string;
  glowColor: string;
  feedback: React.ReactNode;
}

const MOCK_CARDS: MockCard[] = [
  {
    personaIdx: 2,
    name: "Anton",
    role: "Devil's Advocate",
    color: "#f87171",
    glowColor: "rgba(248,113,113,0.3)",
    feedback: (
      <span>
        You calculated the monthly loan, but completely left out{" "}
        <HighlightTerm term="insurance" tip="Click to highlight this cell" /> and{" "}
        <HighlightTerm term="depreciation" tip="Click to highlight row 8" />. That's a huge hidden cost.
      </span>
    ),
  },
  {
    personaIdx: 1,
    name: "Elena",
    role: "The Pragmatist",
    color: "#34d399",
    glowColor: "rgba(52,211,153,0.3)",
    feedback: (
      <span>
        Your <HighlightTerm term="fuel estimates" tip="Click to highlight row 5" /> look solid based on current prices, but I'd add a 10% buffer for maintenance.
      </span>
    ),
  },
  {
    personaIdx: 3,
    name: "Helen",
    role: "Branding Expert",
    color: "#fbbf24",
    glowColor: "rgba(251,191,36,0.3)",
    feedback: (
      <span>
        Financially okay, but does an <HighlightTerm term="SUV" tip="Click to review vehicle column" /> align with your eco-friendly goals from last week's notes?
      </span>
    ),
  },
  {
    personaIdx: 4,
    name: "Margot",
    role: "The Visionary",
    color: "#22d3ee",
    glowColor: "rgba(34,211,238,0.3)",
    feedback: (
      <span>
        If you switch this to an EV, your long-term ROI in{" "}
        <HighlightTerm term="row 14" tip="Click to jump to row 14" /> will look much better!
      </span>
    ),
  },
];

const parsePersonaSegments = (text: string) => {
  const segments: { personaIdx: number; text: string }[] = [];
  const emojiMap: Record<string, number> = { "🔮": 0, "🌿": 1, "🌹": 2, "💧": 3, "☀️": 4 };
  const parts = text.split(/(\*\*[🔮🌿🌹💧☀️][^*]*\*\*)/);
  let currentIdx = -1;
  for (const part of parts) {
    const m = part.match(/\*\*([🔮🌿🌹💧☀️])/);
    if (m) { currentIdx = emojiMap[m[1]] ?? -1; segments.push({ personaIdx: currentIdx, text: part }); }
    else if (part.trim()) segments.push({ personaIdx: currentIdx, text: part });
  }
  return segments;
};

const FocusCouncilWidget = () => {
  const { setActiveView, setActiveFolder } = useFlux();
  const { consumeSparks } = useMonetization();
  const [mode, setMode] = useState<CouncilMode>("full");
  const [selectedPersona, setSelectedPersona] = useState(-1);
  const [input, setInput] = useState("Review my car budget spreadsheet.");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showMock, setShowMock] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const askCouncil = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (mode === "single" && selectedPersona < 0) { toast.info("Tap a persona to choose who to talk to"); return; }
    const sparkKey = mode === "single" ? "council_quick" : "council_analysis";
    if (!consumeSparks(SPARKS_COSTS[sparkKey], sparkKey)) return;

    // Show scanning animation first
    setShowMock(false);
    setScanning(true);
    setResponse("");

    setTimeout(async () => {
      setScanning(false);
      setLoading(true);
      setSpeakingIdx(mode === "single" ? selectedPersona : 0);

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/flux-ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
          body: JSON.stringify({ type: "council-quick", question, mode, persona_key: mode === "single" ? PERSONAS[selectedPersona]?.key : undefined }),
        });
        if (resp.status === 429) { toast.error("Rate limit exceeded."); setLoading(false); return; }
        if (resp.status === 402) { toast.error("AI credits exhausted."); setLoading(false); return; }
        if (!resp.ok || !resp.body) throw new Error("Failed");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", fullText = "", personaIdx = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let ni: number;
          while ((ni = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, ni); buffer = buffer.slice(ni + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content; setResponse(fullText);
                const matches = fullText.match(/\*\*[🔮🌿🌹💧☀️]/g);
                if (matches && matches.length > personaIdx) { personaIdx = matches.length - 1; setSpeakingIdx(Math.min(personaIdx, 4)); }
                responseRef.current?.scrollTo({ top: responseRef.current.scrollHeight, behavior: "smooth" });
              }
            } catch { buffer = line + "\n" + buffer; break; }
          }
        }
      } catch (e) { console.error(e); toast.error("Could not reach The Council"); }
      finally { setLoading(false); setSpeakingIdx(null); setInput(""); }
    }, 1200);
  }, [input, loading, mode, selectedPersona]);

  const renderResponse = () => {
    if (!response) return null;
    if (mode === "single" && selectedPersona >= 0) {
      const p = PERSONAS[selectedPersona];
      return (
        <div ref={responseRef} className="flex-1 overflow-y-auto council-hidden-scrollbar mb-2 max-h-[160px]">
          <div className="flex gap-1.5 items-start p-1.5 rounded-xl bg-white/5 border border-white/10">
            <CouncilAvatar color={p?.color} size={24} isSpeaking={speakingIdx !== null} personalityIndex={selectedPersona} />
            <div className="min-w-0 text-[9px] text-white/60 leading-relaxed prose prose-sm prose-invert prose-p:my-0 prose-strong:text-white/90"><ReactMarkdown>{response}</ReactMarkdown></div>
          </div>
        </div>
      );
    }
    const segments = parsePersonaSegments(response);
    if (segments.length <= 1) {
      return <div ref={responseRef} className="flex-1 overflow-y-auto council-hidden-scrollbar mb-2 px-2 py-2 rounded-xl bg-white/5 border border-white/10 max-h-[160px] text-[9px] text-white/60 leading-relaxed prose prose-sm prose-invert prose-p:my-0.5 prose-strong:text-white/90"><ReactMarkdown>{response}</ReactMarkdown></div>;
    }
    return (
      <div ref={responseRef} className="flex-1 overflow-y-auto council-hidden-scrollbar mb-2 max-h-[160px] space-y-1">
        {segments.filter(s => s.personaIdx >= 0).map((seg, i) => {
          const p = PERSONAS[seg.personaIdx];
          if (!p) return null;
          return (
            <div key={i} className="flex gap-1.5 items-start p-1 rounded-lg bg-white/5 border border-white/5">
              <CouncilAvatar color={p.color} size={20} isSpeaking={speakingIdx === seg.personaIdx} personalityIndex={seg.personaIdx} />
              <div className="min-w-0 text-[9px] text-white/60 leading-relaxed prose prose-sm prose-invert prose-p:my-0 prose-strong:text-white/90"><ReactMarkdown>{seg.text}</ReactMarkdown></div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <DraggableWidget id="council" title="Live Council" defaultPosition={{ x: 60, y: 360 }} defaultSize={{ w: 340, h: 400 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col">
        {/* Header with pulsing eye */}
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Eye size={12} className="text-violet-400" />
          </motion.div>
          <span className="text-[9px] text-white/30 italic">Watching your workspace context…</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2 shrink-0">
          {PERSONAS.map((p, i) => (
            <motion.button key={p.key} onClick={() => { if (mode === "single") setSelectedPersona(i); }} whileHover={{ scale: 1.15, y: -2 }} className="relative">
              <CouncilAvatar color={p.color} size={30} isSpeaking={speakingIdx === i} personalityIndex={i} />
              {mode === "single" && selectedPersona === i && <motion.div className="absolute -inset-0.5 rounded-full border-2 pointer-events-none" style={{ borderColor: p.color }} layoutId="focus-persona-ring" />}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-1 mb-2 shrink-0">
          {(["full", "single", "debate"] as CouncilMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setResponse(""); setShowMock(false); }}
              className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-all flex items-center gap-0.5 ${mode === m ? "bg-white/10 text-white/90" : "text-white/30 hover:text-white/60"}`}>
              {m === "debate" && <Swords size={8} />}
              {m === "full" ? "Full Council" : m === "single" ? (selectedPersona >= 0 ? t(PERSONAS[selectedPersona]?.name) : "Choose") : "Debate"}
            </button>
          ))}
        </div>

        {/* Scanning animation */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-2 mb-2 relative overflow-hidden rounded-xl bg-white/3 border border-white/8"
            >
              <div className="text-[10px] text-white/40 flex items-center gap-1.5">
                <Sparkles size={10} className="text-violet-400" />
                Scanning page context…
              </div>
              {/* Laser sweep */}
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mock pre-filled cards */}
        {showMock && !scanning && !response && !loading && (
          <div className="flex-1 overflow-y-auto council-hidden-scrollbar mb-2 space-y-1.5">
            {MOCK_CARDS.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-2 items-start p-2 rounded-xl border border-white/8 bg-white/4"
                style={{ boxShadow: `0 0 8px ${card.glowColor}` }}
              >
                {/* Avatar circle with glow ring */}
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white/90 border-2 mt-0.5"
                  style={{ backgroundColor: card.color + "25", borderColor: card.color }}>
                  {card.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold text-white/80">{card.name}</span>
                    <span className="text-[8px] text-white/30">· {card.role}</span>
                  </div>
                  <p className="text-[10px] text-white/55 leading-relaxed">{card.feedback}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {renderResponse()}

        {loading && !response && (
          <div className="flex-1 flex items-center justify-center mb-2">
            <motion.div className="flex items-center gap-1.5" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Loader2 size={12} className="animate-spin text-white/50" />
              <span className="text-[9px] text-white/40">Deliberating…</span>
            </motion.div>
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-auto shrink-0">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askCouncil()}
            placeholder={mode === "debate" ? "Topic to debate…" : "Ask the Council…"} disabled={loading || scanning}
            className="flex-1 px-2.5 py-1.5 rounded-xl text-[10px] bg-white/5 border border-white/10 text-white/80 outline-none focus:border-white/25 placeholder:text-white/20 disabled:opacity-40 transition-all" />
          <button onClick={askCouncil} disabled={loading || scanning || !input.trim()} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 disabled:opacity-20 transition-all">
            {(loading || scanning) ? <Loader2 size={11} className="animate-spin" /> : mode === "debate" ? <Swords size={11} /> : <Send size={11} />}
          </button>
        </div>
      </motion.div>
    </DraggableWidget>
  );
};

export default FocusCouncilWidget;
