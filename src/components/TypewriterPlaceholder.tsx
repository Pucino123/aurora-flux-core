import { useState, useEffect, useRef } from "react";
import { t } from "@/lib/i18n";

const PHRASES = [
  t("tw.1"),
  t("tw.2"),
  t("tw.3"),
  t("tw.4"),
  t("tw.5"),
];

const TYPE_SPEED = 60;
const DELETE_SPEED = 35;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

const TypewriterPlaceholder = () => {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const phrase = PHRASES[phraseIdx];

    if (!isDeleting) {
      if (displayed.length < phrase.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(phrase.slice(0, displayed.length + 1));
        }, TYPE_SPEED);
      } else {
        timeoutRef.current = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      }
    } else {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, DELETE_SPEED);
      } else {
        setIsDeleting(false);
        setPhraseIdx((i) => (i + 1) % PHRASES.length);
        timeoutRef.current = setTimeout(() => {}, PAUSE_AFTER_DELETE);
      }
    }

    return () => clearTimeout(timeoutRef.current);
  }, [displayed, isDeleting, phraseIdx]);

  return (
    <span className="text-muted-foreground/50 pointer-events-none select-none">
      {displayed}
      <span className="animate-pulse ml-px">|</span>
    </span>
  );
};

export default TypewriterPlaceholder;
