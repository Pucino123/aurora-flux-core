import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypewriterText = ({ text, speed = 12, onComplete }: TypewriterTextProps) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <div className="text-xs text-muted-foreground leading-relaxed prose prose-xs max-w-none">
      <ReactMarkdown>{displayed}</ReactMarkdown>
      {!done && <span className="inline-block w-1.5 h-3.5 bg-foreground/60 animate-pulse ml-0.5 align-middle" />}
    </div>
  );
};

export default TypewriterText;
