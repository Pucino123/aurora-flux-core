import React, { useState } from "react";
import { RefreshCw, Copy, Heart, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DraggableWidget from "./DraggableWidget";
import { useFocusStore } from "@/context/FocusContext";

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus is the art of knowing what to ignore.", author: "James Clear" },
  { text: "In every walk with nature, one receives far more than he seeks.", author: "John Muir" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "The earth does not belong to us, we belong to the earth.", author: "Chief Seattle" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
];

const QuoteOfDay = () => {
  const { quoteFontSize, setQuoteFontSize } = useFocusStore();

  const dateIdx = (() => {
    const d = new Date().toDateString();
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) % QUOTES.length;
    return Math.abs(h);
  })();

  const [idx, setIdx] = useState(dateIdx);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [direction, setDirection] = useState(1);
  const [key, setKey] = useState(0);

  const quote = QUOTES[idx];

  const next = () => {
    setDirection(1);
    setIdx(i => (i + 1) % QUOTES.length);
    setKey(k => k + 1);
    setLiked(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(`"${quote.text}" — ${quote.author}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DraggableWidget
      id="quote"
      title="Quote of the Day"
      defaultPosition={{ x: 80, y: 500 }}
      defaultSize={{ w: 380, h: 160 }}
      fontSizeControl={{ value: quoteFontSize, set: setQuoteFontSize, min: 10, max: 28, step: 2 }}
      autoHeight
    >
      <div className="flex flex-col gap-3">
        {/* Quote text */}
        <div className="relative">
          {/* Decorative quotation mark */}
          <span className="absolute -top-2 -left-1 text-4xl text-white/6 font-serif leading-none select-none">"</span>

          <AnimatePresence mode="wait">
            <motion.div
              key={key}
              initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
              transition={{ duration: 0.3 }}
              className="pl-3"
            >
              <p
                className="text-white/70 italic font-light leading-snug"
                style={{ fontSize: `${quoteFontSize}px` }}
              >
                "{quote.text}"
              </p>
              <p className="text-white/30 text-[10px] mt-1.5 font-medium tracking-wide">
                — {quote.author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => setLiked(v => !v)}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              liked ? "bg-rose-400/20 text-rose-400" : "bg-white/5 text-white/25 hover:text-white/50 hover:bg-white/10"
            }`}
          >
            <Heart size={11} fill={liked ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button
              onClick={copy}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                copied ? "bg-emerald-400/20 text-emerald-400" : "bg-white/5 text-white/25 hover:text-white/50 hover:bg-white/10"
              }`}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-emerald-300 bg-emerald-900/60 px-1.5 py-0.5 rounded-md whitespace-nowrap border border-emerald-400/20"
                >
                  Copied!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={next}
            className="w-6 h-6 rounded-lg bg-white/5 text-white/25 hover:text-white/50 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default QuoteOfDay;
