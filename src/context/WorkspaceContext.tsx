import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { DbDocument } from "@/hooks/useDocuments";

export interface WorkspacePanel {
  doc: DbDocument;
}

interface WorkspaceContextType {
  panels: [WorkspacePanel | null, WorkspacePanel | null];
  openInWorkspace: (doc: DbDocument) => void;
  closePanel: (idx: 0 | 1) => void;
  replacePanel: (idx: 0 | 1, doc: DbDocument) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [panels, setPanels] = useState<[WorkspacePanel | null, WorkspacePanel | null]>([null, null]);

  const openInWorkspace = useCallback((doc: DbDocument) => {
    setPanels((prev) => {
      // If already open in a slot, just keep it (bring focus)
      if (prev[0]?.doc.id === doc.id || prev[1]?.doc.id === doc.id) return prev;
      const next: [WorkspacePanel | null, WorkspacePanel | null] = [...prev] as any;
      if (!next[0]) { next[0] = { doc }; return next; }
      if (!next[1]) { next[1] = { doc }; return next; }
      // Both occupied — replace the left one
      next[0] = { doc };
      return next;
    });
  }, []);

  const closePanel = useCallback((idx: 0 | 1) => {
    setPanels((prev) => {
      const next: [WorkspacePanel | null, WorkspacePanel | null] = [...prev] as any;
      next[idx] = null;
      return next;
    });
  }, []);

  const replacePanel = useCallback((idx: 0 | 1, doc: DbDocument) => {
    setPanels((prev) => {
      const next: [WorkspacePanel | null, WorkspacePanel | null] = [...prev] as any;
      next[idx] = { doc };
      return next;
    });
  }, []);

  return (
    <WorkspaceContext.Provider value={{ panels, openInWorkspace, closePanel, replacePanel }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
};
