import { useState, useCallback } from "react";

const getKey = (storageKey: string) => `flux-toolbar-hidden-${storageKey}`;

export function useToolbarVisibility(storageKey: string, allSegments: string[]) {
  const [hidden, setHidden] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(getKey(storageKey));
      const parsed: string[] = stored ? JSON.parse(stored) : [];
      // "ai" segment must never be hidden
      return parsed.filter(id => id !== "ai");
    } catch {
      return [];
    }
  });

  const visible = allSegments.filter(id => !hidden.includes(id));
  const hiddenSegments = allSegments.filter(id => hidden.includes(id));

  const hideSegment = useCallback((id: string) => {
    setHidden(prev => {
      const next = [...prev, id];
      localStorage.setItem(getKey(storageKey), JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const showSegment = useCallback((id: string) => {
    setHidden(prev => {
      const next = prev.filter(x => x !== id);
      localStorage.setItem(getKey(storageKey), JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const showAll = useCallback(() => {
    setHidden([]);
    localStorage.removeItem(getKey(storageKey));
  }, [storageKey]);

  const reset = useCallback(() => {
    setHidden([]);
    localStorage.removeItem(getKey(storageKey));
    // Clear any saved position data
    localStorage.removeItem(`flux-toolbar-pos-${storageKey}`);
  }, [storageKey]);

  return { visible, hiddenSegments, hideSegment, showSegment, showAll, reset };
}
