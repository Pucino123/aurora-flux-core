import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from "react";

export type WindowLayout = 'floating' | 'fullscreen' | 'split-left' | 'split-right';
export type WindowContentType = 'document' | 'widget';

export interface AppWindow {
  id: string;
  type: WindowContentType;
  contentId: string;
  title: string;
  layout: WindowLayout;
  zIndex: number;
  position: { x: number; y: number };
  size?: { w: number; h: number };
  minimized?: boolean;
}

// Only persist the fields we need to reopen windows
type PersistedWindow = Pick<AppWindow, 'type' | 'contentId' | 'title' | 'layout' | 'position' | 'size' | 'minimized'>;

const STORAGE_KEY = "flux-windows-v1";

function loadPersistedWindows(): PersistedWindow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function hydrateWindows(persisted: PersistedWindow[]): AppWindow[] {
  return persisted.map((p, i) => ({
    id: `win-restored-${i}-${Date.now()}`,
    zIndex: 100 + i,
    ...p,
  }));
}

interface WindowManagerContextType {
  windows: AppWindow[];
  openWindow: (payload: Omit<AppWindow, 'id' | 'zIndex'>) => string;
  closeWindow: (id: string) => void;
  setWindowLayout: (id: string, layout: WindowLayout) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export const WindowManagerProvider = ({ children }: { children: ReactNode }) => {
  const [windows, setWindows] = useState<AppWindow[]>(() =>
    hydrateWindows(loadPersistedWindows())
  );
  const counterRef = useRef(200);

  // Persist to localStorage on every change
  useEffect(() => {
    const toSave: PersistedWindow[] = windows.map(({ type, contentId, title, layout, position, size, minimized }) => ({
      type, contentId, title, layout, position, size, minimized,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [windows]);

  const openWindow = useCallback((payload: Omit<AppWindow, 'id' | 'zIndex'>): string => {
    const id = `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), counterRef.current);
      counterRef.current = maxZ + 1;
      // If already open with same contentId+type, bring to front and restore if minimized
      const existing = prev.find(w => w.contentId === payload.contentId && w.type === payload.type);
      if (existing) {
        return prev.map(w =>
          w.id === existing.id
            ? { ...w, zIndex: counterRef.current, minimized: false }
            : w
        );
      }
      return [...prev, { ...payload, id, zIndex: counterRef.current, minimized: false }];
    });
    return id;
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const setWindowLayout = useCallback((id: string, layout: WindowLayout) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, layout } : w));
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x, y } } : w));
  }, []);

  const updateWindowSize = useCallback((id: string, w: number, h: number) => {
    setWindows(prev => prev.map(win => win.id === id ? { ...win, size: { w, h } } : win));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, minimized: false, zIndex: maxZ + 1 } : w);
    });
  }, []);

  // ── Global keyboard shortcuts: Cmd+W = close, Cmd+M = minimize focused ────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key === "w" || e.key === "W") {
        setWindows(prev => {
          const visible = prev.filter(w => !w.minimized);
          if (!visible.length) return prev;
          const top = visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
          e.preventDefault();
          return prev.filter(w => w.id !== top.id);
        });
      }
      if (e.key === "m" || e.key === "M") {
        setWindows(prev => {
          const visible = prev.filter(w => !w.minimized);
          if (!visible.length) return prev;
          const top = visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
          e.preventDefault();
          return prev.map(w => w.id === top.id ? { ...w, minimized: true } : w);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <WindowManagerContext.Provider value={{
      windows, openWindow, closeWindow, setWindowLayout,
      updateWindowPosition, updateWindowSize, bringToFront,
      minimizeWindow, restoreWindow,
    }}>
      {children}
    </WindowManagerContext.Provider>
  );
};

export const useWindowManager = () => {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
};
