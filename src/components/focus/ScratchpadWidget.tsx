import React, { useState, useEffect, useRef, useCallback } from "react";
import DraggableWidget from "./DraggableWidget";

const STORAGE_KEY = "flux-scratchpad";

const ScratchpadWidget = () => {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((val: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, val);
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    save(val);
  };

  return (
    <DraggableWidget
      id="scratchpad"
      title="Scratchpad"
      defaultPosition={{ x: typeof window !== "undefined" ? window.innerWidth - 420 : 800, y: 340 }}
      defaultSize={{ w: 360, h: 280 }}
    >
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Brain dump here..."
        className="w-full h-full bg-transparent text-white/80 text-sm leading-relaxed placeholder:text-white/20 resize-none focus:outline-none font-light"
      />
    </DraggableWidget>
  );
};

export default ScratchpadWidget;
