import React, { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import ToolbarButton from "./ToolbarButton";

const EMOJI_GROUPS = [
  { label: "Smileys", emojis: ["😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "🤔", "😴", "🫡"] },
  { label: "Hands", emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🫶", "☝️"] },
  { label: "Objects", emojis: ["⭐", "🔥", "💡", "🎯", "🚀", "💎", "🏆", "📌", "✅", "❌"] },
  { label: "Nature", emojis: ["🌟", "🌈", "☀️", "🌙", "🌸", "🍀", "🦋", "🐬", "🌊", "⚡"] },
];

interface EmojiTouchbarProps {
  onInsert: (emoji: string) => void;
  lightMode?: boolean;
}

const EmojiTouchbar = ({ onInsert, lightMode = false }: EmojiTouchbarProps) => {
  const lm = lightMode;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <ToolbarButton icon={<Smile size={14} />} label="Emoji" onClick={() => setOpen(!open)} lightMode={lm} />
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className={`w-[280px] p-2 rounded-xl z-[9999] ${lm ? "bg-white border-gray-200" : "bg-popover/95 backdrop-blur-xl border-border/30"} shadow-2xl`}
      >
        {EMOJI_GROUPS.map(group => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className={`text-[9px] font-medium uppercase tracking-wider mb-1 px-1 ${lm ? "text-gray-400" : "text-muted-foreground/50"}`}>
              {group.label}
            </p>
            <div className="flex flex-wrap gap-0.5">
              {group.emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onInsert(emoji); setOpen(false); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-base hover:scale-125 transition-all duration-150 ${
                    lm ? "hover:bg-gray-100" : "hover:bg-white/[0.1]"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default EmojiTouchbar;
