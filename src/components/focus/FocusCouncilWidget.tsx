import { useState, useRef, useCallback } from "react";
import { Send, Loader2, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useFlux } from "@/context/FluxContext";
import { PERSONAS } from "../TheCouncil";
import DraggableWidget from "./DraggableWidget";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

type CouncilMode = "full" | "single" | "debate";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

import CouncilAvatar from "../council/CouncilAvatar";

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
  const [mode, setMode] = useState<CouncilMode>("full");
  const [selectedPersona, setSelectedPersona] = useState(-1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const askCouncil = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (mode === "single" && selectedPersona < 0) { toast.info("Tap a persona to choose who to talk to"); return; }
    setLoading(true); setResponse(""); setSpeakingIdx(mode === "single" ? selectedPersona : 0);

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
            if (content) { fullText += content; setResponse(fullText); const matches = fullText.match(/\*\*[🔮🌿🌹💧☀️]/g); if (matches && matches.length > personaIdx) { personaIdx = matches.length - 1; setSpeakingIdx(Math.min(personaIdx, 4)); } responseRef.current?.scrollTo({ top: responseRef.current.scrollHeight, behavior: "smooth" }); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) { console.error(e); toast.error("Could not reach The Council"); }
    finally { setLoading(false); setSpeakingIdx(null); setInput(""); }
  }, [input, loading, mode, selectedPersona]);

  const renderResponse = () => {
    if (!response) return null;
    if (mode === "single" && selectedPersona >= 0) {
      const p = PERSONAS[selectedPersona];
      return (
        <div ref={responseRef} className="flex-1 overflow-y-auto mb-2 max-h-[140px]">
          <div className="flex gap-1.5 items-start p-1.5 rounded-xl bg-white/5 border border-white/10">
            <CouncilAvatar color={p?.color} size={24} isSpeaking={speakingIdx !== null} personalityIndex={selectedPersona} />
            <div className="min-w-0 text-[9px] text-white/60 leading-relaxed prose prose-sm prose-invert prose-p:my-0 prose-strong:text-white/90"><ReactMarkdown>{response}</ReactMarkdown></div>
          </div>
        </div>
      );
    }
    const segments = parsePersonaSegments(response);
    if (segments.length <= 1) {
      return <div ref={responseRef} className="flex-1 overflow-y-auto mb-2 px-2 py-2 rounded-xl bg-white/5 border border-white/10 max-h-[140px] text-[9px] text-white/60 leading-relaxed prose prose-sm prose-invert prose-p:my-0.5 prose-strong:text-white/90"><ReactMarkdown>{response}</ReactMarkdown></div>;
    }
    return (
      <div ref={responseRef} className="flex-1 overflow-y-auto mb-2 max-h-[140px] space-y-1">
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
    <DraggableWidget id="council" title="Council" defaultPosition={{ x: 60, y: 360 }} defaultSize={{ w: 340, h: 380 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col">
        <div className="flex items-center justify-center gap-2 mb-2">
          {PERSONAS.map((p, i) => (
            <motion.button key={p.key} onClick={() => { if (mode === "single") setSelectedPersona(i); }} whileHover={{ scale: 1.15, y: -2 }} className="relative">
              <CouncilAvatar color={p.color} size={30} isSpeaking={speakingIdx === i} personalityIndex={i} />
              {mode === "single" && selectedPersona === i && <motion.div className="absolute -inset-0.5 rounded-full border-2 pointer-events-none" style={{ borderColor: p.color }} layoutId="focus-persona-ring" />}
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-1 mb-2">
          {(["full", "single", "debate"] as CouncilMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setResponse(""); }}
              className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-all flex items-center gap-0.5 ${mode === m ? "bg-white/10 text-white/90" : "text-white/30 hover:text-white/60"}`}>
              {m === "debate" && <Swords size={8} />}
              {m === "full" ? "Full Council" : m === "single" ? (selectedPersona >= 0 ? t(PERSONAS[selectedPersona]?.name) : "Choose") : "Debate"}
            </button>
          ))}
        </div>
        {renderResponse()}
        {loading && !response && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div className="flex items-center gap-1.5" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Loader2 size={12} className="animate-spin text-white/50" />
              <span className="text-[9px] text-white/40">Deliberating…</span>
            </motion.div>
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-auto">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askCouncil()}
            placeholder={mode === "debate" ? "Topic to debate…" : "Ask the Council…"} disabled={loading}
            className="flex-1 px-2.5 py-1.5 rounded-xl text-[10px] bg-white/5 border border-white/10 text-white/80 outline-none focus:border-white/25 placeholder:text-white/20 disabled:opacity-40 transition-all" />
          <button onClick={askCouncil} disabled={loading || !input.trim()} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 disabled:opacity-20 transition-all">
            {loading ? <Loader2 size={11} className="animate-spin" /> : mode === "debate" ? <Swords size={11} /> : <Send size={11} />}
          </button>
        </div>
      </motion.div>
    </DraggableWidget>
  );
};

export default FocusCouncilWidget;
