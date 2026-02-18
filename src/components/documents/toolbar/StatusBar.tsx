import React from "react";

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  lightMode?: boolean;
}

const StatusBar = ({ wordCount, charCount, lightMode = false }: StatusBarProps) => {
  const lm = lightMode;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className={`flex items-center justify-between px-4 py-1.5 text-[10px] border-t ${
      lm ? "border-gray-200 text-gray-400 bg-gray-50/50" : "border-white/[0.08] text-foreground/40 bg-white/[0.02]"
    }`}>
      <div className="flex items-center gap-3">
        <span>{wordCount} words</span>
        <span>·</span>
        <span>{charCount} chars</span>
        <span>·</span>
        <span>~{readingTime} min read</span>
      </div>
      <div className="hidden md:flex items-center gap-2">
        {[
          { key: "\u2318B", label: "Bold" },
          { key: "\u2318I", label: "Italic" },
          { key: "\u2318U", label: "Underline" },
          { key: "\u2318K", label: "Link" },
        ].map(s => (
          <span key={s.key} className="flex items-center gap-0.5">
            <kbd className={`px-1 py-0.5 rounded text-[9px] ${lm ? "bg-gray-100 text-gray-500" : "bg-white/[0.06] text-foreground/40"}`}>{s.key}</kbd>
            <span>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default StatusBar;
