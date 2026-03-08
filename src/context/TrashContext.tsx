import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type TrashItemType = "task" | "contact" | "document";

export interface TrashItem {
  id: string;
  type: TrashItemType;
  title: string;
  deletedAt: string; // ISO string
  originalData: any;
}

export type AutoDeleteDays = 3 | 7 | 30 | null; // null = never auto-delete

interface TrashContextType {
  trash: TrashItem[];
  autoDeleteDays: AutoDeleteDays;
  setAutoDeleteDays: (days: AutoDeleteDays) => void;
  moveToTrash: (item: Omit<TrashItem, "deletedAt">) => void;
  restoreItem: (id: string) => TrashItem | null;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;
}

const TrashContext = createContext<TrashContextType | null>(null);

const LS_KEY = "flux-trash-v1";
const LS_AUTO_KEY = "flux-trash-auto-delete";

function loadTrash(): TrashItem[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function loadAutoDelete(): AutoDeleteDays {
  try {
    const v = localStorage.getItem(LS_AUTO_KEY);
    if (v === "null" || v === null) return null;
    const n = Number(v);
    if (n === 3 || n === 7 || n === 30) return n as AutoDeleteDays;
  } catch {}
  return 30; // default: 30 days
}

export const TrashProvider = ({ children }: { children: ReactNode }) => {
  const [trash, setTrash] = useState<TrashItem[]>(loadTrash);
  const [autoDeleteDays, setAutoDeleteDaysState] = useState<AutoDeleteDays>(loadAutoDelete);

  const persist = useCallback((items: TrashItem[]) => {
    setTrash(items);
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, []);

  const setAutoDeleteDays = useCallback((days: AutoDeleteDays) => {
    setAutoDeleteDaysState(days);
    localStorage.setItem(LS_AUTO_KEY, String(days));
  }, []);

  // Auto-purge expired items on mount and whenever settings change
  useEffect(() => {
    if (!autoDeleteDays) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - autoDeleteDays);
    const filtered = trash.filter(item => new Date(item.deletedAt) > cutoff);
    if (filtered.length !== trash.length) persist(filtered);
  }, [autoDeleteDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToTrash = useCallback((item: Omit<TrashItem, "deletedAt">) => {
    setTrash(prev => {
      const next = [{ ...item, deletedAt: new Date().toISOString() }, ...prev];
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const restoreItem = useCallback((id: string): TrashItem | null => {
    let found: TrashItem | null = null;
    setTrash(prev => {
      found = prev.find(t => t.id === id) ?? null;
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
    return found;
  }, []);

  const permanentlyDelete = useCallback((id: string) => {
    setTrash(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const emptyTrash = useCallback(() => persist([]), [persist]);

  return (
    <TrashContext.Provider value={{ trash, autoDeleteDays, setAutoDeleteDays, moveToTrash, restoreItem, permanentlyDelete, emptyTrash }}>
      {children}
    </TrashContext.Provider>
  );
};

export const useTrash = () => {
  const ctx = useContext(TrashContext);
  if (!ctx) throw new Error("useTrash must be used inside TrashProvider");
  return ctx;
};
