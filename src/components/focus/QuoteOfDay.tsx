import React from "react";
import DraggableWidget from "./DraggableWidget";
import { useFocusStore } from "@/context/FocusContext";

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "Focus on being productive instead of busy.",
  "Do what you can, with what you have, where you are.",
  "Small daily improvements are the key to staggering long-term results.",
  "Your future is created by what you do today, not tomorrow.",
  "The only way to do great work is to love what you do.",
  "Don't watch the clock; do what it does. Keep going.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Discipline is the bridge between goals and accomplishment.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Start where you are. Use what you have. Do what you can.",
  "It always seems impossible until it's done.",
  "Believe you can and you're halfway there.",
  "One day or day one. You decide.",
  "Progress, not perfection.",
  "Action is the foundational key to all success.",
  "Great things never come from comfort zones.",
  "Dream big. Start small. Act now.",
  "You don't have to be great to start, but you have to start to be great.",
  "What we fear doing most is usually what we most need to do.",
  "Simplicity is the ultimate sophistication.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Everything you've ever wanted is on the other side of fear.",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Quality is not an act, it is a habit.",
  "Stay focused. Stay humble. Stay positive.",
  "The mind is everything. What you think you become.",
  "Strive for progress, not perfection.",
  "Be so good they can't ignore you.",
];

const QuoteOfDay = () => {
  const { quoteFontSize, setQuoteFontSize } = useFocusStore();
  const dateStr = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) % QUOTES.length;
  }
  const quote = QUOTES[Math.abs(hash) % QUOTES.length];

  return (
    <DraggableWidget
      id="quote"
      title="Quote of the Day"
      defaultPosition={{ x: 80, y: 500 }}
      defaultSize={{ w: 380, h: 80 }}
      fontSizeControl={{ value: quoteFontSize, set: setQuoteFontSize, min: 10, max: 28, step: 2 }}
      autoHeight
    >
      <div className="flex items-center gap-2 -mt-2 -mb-2">
        <span className="text-white/30 text-sm shrink-0">✦</span>
        <p
          className="text-white/50 italic font-light leading-snug"
          style={{ fontSize: `${quoteFontSize}px` }}
        >
          "{quote}"
        </p>
      </div>
    </DraggableWidget>
  );
};

export default QuoteOfDay;
