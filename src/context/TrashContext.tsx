import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type TrashItemType = "task" | "contact" | "document";

export interface TrashItem {
  id: string;
  type: TrashItemType;
  title: string;
  deletedAt: string; // ISO string
  originalData: any;
}

interface TrashContextType {
  trash: TrashItem[];
  moveToTrash: (item: Omit<TrashItem, "deletedAt">) => void;
  restoreItem: (id: string) => TrashItem | null;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;
}

const TrashContext = createContext<TrashContextType | null>(null);

const LS_KEY = "flux-trash-v1";
function loadTrash(): TrashItem[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

export const TrashProvider = ({ children }: { children: ReactNode }) => {
  const [trash, setTrash] = useState<TrashItem[]>(loadTrash);

  const persist = useCallback((items: TrashItem[]) => {
    setTrash(items);
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, []);

  const moveToTrash = useCallback((item: Omit<TrashItem, "deletedAt">) => {
    persist([{ ...item, deletedAt: new Date().toISOString() }, ...trash]);
  }, [trash, persist]);

  const restoreItem = useCallback((id: string): TrashItem | null => {
    const found = trash.find(t => t.id === id) ?? null;
    persist(trash.filter(t => t.id !== id));
    return found;
  }, [trash, persist]);

  const permanentlyDelete = useCallback((id: string) => {
    persist(trash.filter(t => t.id !== id));
  }, [trash, persist]);

  const emptyTrash = useCallback(() => persist([]), [persist]);

  return (
    <TrashContext.Provider value={{ trash, moveToTrash, restoreItem, permanentlyDelete, emptyTrash }}>
      {children}
    </TrashContext.Provider>
  );
};

export const useTrash = () => {
  const ctx = useContext(TrashContext);
  if (!ctx) throw new Error("useTrash must be used inside TrashProvider");
  return ctx;
};
