import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import DraggableWidget from "./DraggableWidget";

const STORAGE_KEY = "flux-scratchpad";

const MOCK_TEXT = "• Call Sarah about the eco-project\n• Buy more oat milk\n• Schedule dentist appointment\n\nIdeas for tomorrow:\n- Deep work block 9–11am\n- Draft Q2 OKR proposal\n- Review team feedback";

const countWords = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

const timeAgo = (ts: number) => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const ScratchpadWidget = () => {
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || MOCK_TEXT; } catch { return MOCK_TEXT; }
  });
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [, forceUpdate] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh "last edited" display every 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const save = useCallback((val: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, val);
      setLastSaved(Date.now());
    }, 500);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    save(val);
  };

  const clear = () => {
    setText("");
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(Date.now());
  };

  const words = countWords(text);
  const chars = text.length;

  return (
    <DraggableWidget
      id="scratchpad"
      title="Scratchpad"
      defaultPosition={{ x: typeof window !== "undefined" ? window.innerWidth - 420 : 800, y: 340 }}
      defaultSize={{ w: 360, h: 300 }}
    >
      <div className="h-full flex flex-col -mt-1">
        {/* Clear button */}
        <div className="flex justify-end mb-1 shrink-0">
          <button
            onClick={clear}
            className="flex items-center gap-1 text-[9px] text-white/20 hover:text-white/50 transition-colors"
          >
            <Trash2 size={9} /> Clear
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Brain dump here..."
          className="flex-1 bg-transparent text-white/75 text-[12px] leading-relaxed placeholder:text-white/20 resize-none focus:outline-none font-light tracking-wide"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace" }}
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/6 shrink-0">
          <span className="text-[9px] text-white/20">{words} words · {chars} chars</span>
          <span className="text-[9px] text-white/15">Last edited: {timeAgo(lastSaved)}</span>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default ScratchpadWidget;
