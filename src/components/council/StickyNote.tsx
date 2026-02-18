import { useState } from "react";
import { motion } from "framer-motion";
import { X, Flag, ChevronDown, ChevronUp, Smile } from "lucide-react";

const STICKY_COLORS: Record<string, { bg: string; border: string }> = {
  purple: { bg: "hsl(270 70% 92%)", border: "hsl(270 70% 75%)" },
  green: { bg: "hsl(150 60% 90%)", border: "hsl(150 60% 55%)" },
  red: { bg: "hsl(0 84% 92%)", border: "hsl(0 84% 70%)" },
  blue: { bg: "hsl(217 90% 92%)", border: "hsl(217 90% 75%)" },
  orange: { bg: "hsl(30 90% 90%)", border: "hsl(30 90% 65%)" },
  yellow: { bg: "hsl(50 95% 88%)", border: "hsl(50 90% 65%)" },
};

const EMOJIS = ["👍", "🔥", "💡", "⚠️", "❤️", "🎯"];
const PRIORITY_FLAGS = ["high", "medium", "low"];

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  collapsed: boolean;
  emojiReaction?: string | null;
  priorityFlag?: string | null;
  onUpdate: (id: string, data: { content?: string; collapsed?: boolean; emoji_reaction?: string | null; priority_flag?: string | null }) => void;
  onDelete: (id: string) => void;
}

const StickyNote = ({ id, content, color, collapsed, emojiReaction, priorityFlag, onUpdate, onDelete }: StickyNoteProps) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const colors = STICKY_COLORS[color] || STICKY_COLORS.yellow;

  const handleBlur = () => {
    setEditing(false);
    if (text !== content) onUpdate(id, { content: text });
  };

  const flagColors: Record<string, string> = {
    high: "hsl(0 84% 60%)",
    medium: "hsl(30 90% 55%)",
    low: "hsl(217 90% 60%)",
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, rotate: Math.random() * 4 - 2 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="relative w-full min-h-[80px] rounded-lg shadow-md select-none"
      style={{
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.03) 23px, rgba(0,0,0,0.03) 24px)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
        <div className="flex items-center gap-1">
          {priorityFlag && (
            <Flag size={12} style={{ color: flagColors[priorityFlag] || "currentColor" }} fill={flagColors[priorityFlag] || "currentColor"} />
          )}
          {emojiReaction && <span className="text-sm">{emojiReaction}</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-0.5 hover:bg-black/5 rounded text-muted-foreground">
            <Smile size={12} />
          </button>
          <button onClick={() => setShowFlag(!showFlag)} className="p-0.5 hover:bg-black/5 rounded text-muted-foreground">
            <Flag size={12} />
          </button>
          <button onClick={() => onUpdate(id, { collapsed: !collapsed })} className="p-0.5 hover:bg-black/5 rounded text-muted-foreground">
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          <button onClick={() => onDelete(id)} className="p-0.5 hover:bg-black/5 rounded text-muted-foreground">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="flex gap-1 px-2 pb-1">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => { onUpdate(id, { emoji_reaction: e }); setShowEmoji(false); }} className="text-sm hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
          {emojiReaction && (
            <button onClick={() => { onUpdate(id, { emoji_reaction: null }); setShowEmoji(false); }} className="text-[10px] text-muted-foreground hover:text-destructive">✕</button>
          )}
        </div>
      )}

      {/* Priority picker */}
      {showFlag && (
        <div className="flex gap-1 px-2 pb-1">
          {PRIORITY_FLAGS.map((f) => (
            <button
              key={f}
              onClick={() => { onUpdate(id, { priority_flag: priorityFlag === f ? null : f }); setShowFlag(false); }}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${flagColors[f]}22`, color: flagColors[f], border: priorityFlag === f ? `1px solid ${flagColors[f]}` : "1px solid transparent" }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div className="px-2 pb-2">
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              autoFocus
              className="w-full bg-transparent text-xs leading-relaxed outline-none resize-none min-h-[40px]"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            />
          ) : (
            <p
              onClick={() => setEditing(true)}
              className="text-xs leading-relaxed cursor-text whitespace-pre-wrap"
              style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: "13px" }}
            >
              {content || "Click to add a note..."}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StickyNote;
