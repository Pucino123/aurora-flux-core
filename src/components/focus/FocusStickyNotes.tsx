import React, { useRef, useCallback, useState } from "react";
import { X, Plus, Users, Loader2 } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COLORS = [
  { key: "yellow", bg: "hsl(50 95% 88%)", border: "hsl(50 90% 65%)" },
  { key: "purple", bg: "hsl(270 70% 92%)", border: "hsl(270 70% 75%)" },
  { key: "green", bg: "hsl(150 60% 90%)", border: "hsl(150 60% 55%)" },
  { key: "blue", bg: "hsl(217 90% 92%)", border: "hsl(217 90% 75%)" },
  { key: "pink", bg: "hsl(340 80% 90%)", border: "hsl(340 80% 70%)" },
  { key: "orange", bg: "hsl(30 90% 88%)", border: "hsl(30 90% 65%)" },
  { key: "coral", bg: "hsl(10 85% 90%)", border: "hsl(10 85% 68%)" },
  { key: "mint", bg: "hsl(170 55% 88%)", border: "hsl(170 55% 55%)" },
  { key: "lavender", bg: "hsl(240 60% 92%)", border: "hsl(240 60% 75%)" },
  { key: "peach", bg: "hsl(20 90% 90%)", border: "hsl(20 90% 70%)" },
];

let idCounter = Date.now();

const MIN_W = 140;
const MIN_H = 120;
const DEFAULT_W = 180;
const DEFAULT_H = 160;

const COUNCIL_PERSONAS = [
  { key: "strategist", emoji: "🔮", name: "Violet", subtitle: "Strategist", color: "hsl(270 70% 65%)" },
  { key: "operator", emoji: "🌿", name: "Leaf", subtitle: "Operator", color: "hsl(150 60% 45%)" },
  { key: "skeptic", emoji: "🌹", name: "Rose", subtitle: "Skeptic", color: "hsl(330 70% 65%)" },
  { key: "advocate", emoji: "💧", name: "Blue", subtitle: "Analyst", color: "hsl(217 90% 70%)" },
  { key: "growth", emoji: "☀️", name: "Sunny", subtitle: "Optimist", color: "hsl(45 90% 55%)" },
];

const getColors = (key: string) => COLORS.find((c) => c.key === key) || COLORS[0];

interface NoteData {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  w?: number;
  h?: number;
}

interface StickyNoteItemProps {
  note: NoteData;
  onUpdateText: (id: string, text: string) => void;
  onUpdateNote: (id: string, patch: Partial<NoteData>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onAddNote: () => void;
}

const StickyNoteItem = ({ note, onUpdateText, onUpdateNote, onDelete, onMove, onAddNote }: StickyNoteItemProps) => {
  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [councilLoading, setCouncilLoading] = useState(false);
  const [councilFeedback, setCouncilFeedback] = useState<{ persona: typeof COUNCIL_PERSONAS[0]; text: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const c = getColors(note.color);
  const noteW = note.w ?? DEFAULT_W;
  const noteH = note.h ?? DEFAULT_H;

  // Close controls when clicking outside the note
  React.useEffect(() => {
    if (!showControls) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowControls(false);
      }
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [showControls]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, textarea, [data-no-drag]")) return;
    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - note.x, y: e.clientY - note.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [note.x, note.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      onMove(note.id, e.clientX - offset.current.x, e.clientY - offset.current.y);
    }
    if (resizing.current) {
      const dx = e.clientX - offset.current.x;
      const dy = e.clientY - offset.current.y;
      offset.current = { x: e.clientX, y: e.clientY };
      onUpdateNote(note.id, {
        w: Math.max(MIN_W, noteW + dx),
        h: Math.max(MIN_H, noteH + dy),
      });
    }
  }, [note.id, noteW, noteH, onMove, onUpdateNote]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    resizing.current = false;
    setIsDragging(false);
  }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    resizing.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const askCouncil = useCallback(async (personaKey: string) => {
    if (!note.text.trim()) {
      toast.error("Skriv noget i noten først");
      return;
    }
    setCouncilLoading(true);
    setShowCouncil(false);
    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: { type: "note-review", note_text: note.text, persona_key: personaKey },
      });
      if (error) throw error;
      const persona = COUNCIL_PERSONAS.find((p) => p.key === personaKey) || COUNCIL_PERSONAS[0];
      setCouncilFeedback({ persona, text: data.reply });
    } catch (e) {
      console.error(e);
      toast.error("Kunne ikke hente feedback");
    } finally {
      setCouncilLoading(false);
    }
  }, [note.text]);

  // Derive text color based on opacity – when bg fades, switch to white text like other widgets
  const textDark = note.opacity > 0.55;
  const textColor = textDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)";
  const placeholderClass = textDark ? "placeholder:text-black/30" : "placeholder:text-white/30";
  const iconColor = textDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)";

  // Background alpha based on opacity (only affects bg, not text)
  const bgAlpha = note.opacity;
  const borderAlpha = note.opacity;

  return (
    <motion.div
      key={note.id}
      initial={{ scale: 0.7, opacity: 0, rotate: note.rotation }}
      animate={{ scale: 1, opacity: 1, rotate: note.rotation }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`absolute group ${isDragging ? "cursor-grabbing z-[60]" : "cursor-grab z-50"}`}
      ref={containerRef}
      style={{
        left: note.x,
        top: note.y,
        width: noteW,
        height: noteH,
        pointerEvents: "auto",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="w-full h-full rounded-lg flex flex-col overflow-visible relative"
        style={{
          backgroundColor: bgAlpha > 0 ? c.bg.replace(")", ` / ${bgAlpha})`) : "transparent",
          borderLeft: bgAlpha > 0.05 ? `4px solid ${c.border.replace(")", ` / ${borderAlpha})`)}` : "none",
          boxShadow: bgAlpha > 0.1 ? `0 4px 16px rgba(0,0,0,${0.15 * bgAlpha}), 0 1px 3px rgba(0,0,0,${0.1 * bgAlpha})` : "none",
        }}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }}
            className="w-3.5 h-3.5 rounded-full border border-black/10 hover:scale-125 transition-transform"
            style={{ backgroundColor: c.border, opacity: Math.max(bgAlpha, 0.3) }}
            title="Note settings"
          />
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowCouncil(!showCouncil); setShowControls(false); }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: iconColor }}
              title="Få Council feedback"
            >
              {councilLoading ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddNote(); }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: iconColor }}
              title="Add new note"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: iconColor }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Per-note controls popover */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              data-no-drag
              className="absolute left-0 top-7 z-[70] w-44 sm:w-48 p-2.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/15 shadow-xl cursor-default max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Color swatches */}
              <div className="mb-2">
                <span className="text-[9px] text-white/40 mb-1.5 block">Color</span>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => onUpdateNote(note.id, { color: col.key })}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${note.color === col.key ? "border-white/80 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: col.border }}
                    />
                  ))}
                </div>
              </div>
              {/* Opacity slider */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] text-white/40 w-10 shrink-0">Opacity</span>
                <Slider
                  value={[note.opacity]}
                  onValueChange={([v]) => onUpdateNote(note.id, { opacity: v })}
                  min={0}
                  max={1}
                  step={0.05}
                  className="flex-1 [&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-white/30 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white/40 [&_[data-radix-slider-thumb]]:w-3 [&_[data-radix-slider-thumb]]:h-3"
                />
              </div>
              {/* Rotation slider */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-10 shrink-0">Rotate</span>
                <Slider
                  value={[note.rotation]}
                  onValueChange={([v]) => onUpdateNote(note.id, { rotation: v })}
                  min={-15}
                  max={15}
                  step={1}
                  className="flex-1 [&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-white/30 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white/40 [&_[data-radix-slider-thumb]]:w-3 [&_[data-radix-slider-thumb]]:h-3"
                />
                <span className="text-[9px] text-white/30 tabular-nums w-6 text-right">{note.rotation}°</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Council persona picker */}
        <AnimatePresence>
          {showCouncil && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              data-no-drag
              className="absolute right-0 top-7 z-[70] w-40 sm:w-44 p-2 rounded-lg bg-black/70 backdrop-blur-xl border border-white/15 shadow-xl cursor-default max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-[9px] text-white/40 mb-1.5 block">Vælg Council medlem</span>
              <div className="flex flex-col gap-1">
                {COUNCIL_PERSONAS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => askCouncil(p.key)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="text-sm">{p.emoji}</span>
                    <div>
                      <span className="text-[11px] text-white/80 block leading-tight">{p.name}</span>
                      <span className="text-[9px] text-white/40 leading-tight">{p.subtitle}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Council feedback display */}
        <AnimatePresence>
          {councilFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              data-no-drag
              className="absolute left-0 z-[70] p-2.5 rounded-lg bg-black/75 backdrop-blur-xl border border-white/15 shadow-xl cursor-default max-h-[40vh] overflow-y-auto"
              style={{ top: noteH + 4, width: Math.max(noteW, 200), maxWidth: "90vw" }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{councilFeedback.persona.emoji}</span>
                  <span className="text-[11px] font-medium" style={{ color: councilFeedback.persona.color }}>{councilFeedback.persona.name}</span>
                  <span className="text-[9px] text-white/30">{councilFeedback.persona.subtitle}</span>
                </div>
                <button onClick={() => setCouncilFeedback(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={10} />
                </button>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">{councilFeedback.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text area */}
        <textarea
          value={note.text}
          onChange={(e) => onUpdateText(note.id, e.target.value)}
          placeholder="Write a note..."
          className={`flex-1 w-full bg-transparent text-xs leading-relaxed outline-none resize-none px-2.5 pb-2 ${placeholderClass}`}
          style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: "15px", color: textColor }}
        />
        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-60 transition-opacity"
          onPointerDown={onResizePointerDown}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ color: "rgba(0,0,0,0.3)" }}>
            <path d="M14 16L16 14M9 16L16 9M4 16L16 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

const FocusStickyNotes = () => {
  const { focusStickyNotes, setFocusStickyNotes } = useFocusStore();

  const addNote = () => {
    const color = COLORS[focusStickyNotes.length % COLORS.length];
    const rotation = Math.round((Math.random() - 0.5) * 8);
    const vw = Math.min(window.innerWidth - 200, 500);
    const vh = Math.min(window.innerHeight - 250, 400);
    const baseX = 40 + Math.random() * Math.max(vw, 60);
    const baseY = 60 + Math.random() * Math.max(vh, 60);
    setFocusStickyNotes([
      ...focusStickyNotes,
      { id: `fn-${++idCounter}`, text: "", color: color.key, x: baseX, y: baseY, rotation, opacity: 1 },
    ]);
  };

  const updateText = (id: string, text: string) => {
    setFocusStickyNotes(focusStickyNotes.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const updateNote = (id: string, patch: Partial<NoteData>) => {
    setFocusStickyNotes(focusStickyNotes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const deleteNote = (id: string) => {
    setFocusStickyNotes(focusStickyNotes.filter((n) => n.id !== id));
  };

  const moveNote = useCallback((id: string, x: number, y: number) => {
    setFocusStickyNotes(focusStickyNotes.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }, [focusStickyNotes, setFocusStickyNotes]);

  // Auto-create a note when component mounts with no notes
  React.useEffect(() => {
    if (focusStickyNotes.length === 0) {
      addNote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {focusStickyNotes.map((note) => (
        <StickyNoteItem
          key={note.id}
          note={{
            ...note,
            x: note.x ?? 300,
            y: note.y ?? 200,
            rotation: note.rotation ?? 0,
            opacity: note.opacity ?? 1,
          }}
          onUpdateText={updateText}
          onUpdateNote={updateNote}
          onDelete={deleteNote}
          onMove={moveNote}
          onAddNote={addNote}
        />
      ))}
    </AnimatePresence>
  );
};

export default FocusStickyNotes;
