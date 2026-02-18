import { useState, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";

export function useToolbarOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const merged = parsed.filter(id => defaultOrder.includes(id));
        defaultOrder.forEach(id => { if (!merged.includes(id)) merged.push(id); });
        return merged;
      }
    } catch {}
    return defaultOrder;
  });

  const handleReorder = useCallback((activeId: string, overId: string) => {
    setOrder(prev => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  return { order, handleReorder };
}
