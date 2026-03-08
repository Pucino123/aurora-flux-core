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
  focusedId: string | null;
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
  // Track which window id is "focused" for keyboard shortcuts & focus ring
  const [focusedId, setFocusedId] = useState<string | null>(null);
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
      const existing = prev.find(w => w.contentId === payload.contentId && w.type === payload.type);
      if (existing) {
        setFocusedId(existing.id);
        return prev.map(w =>
          w.id === existing.id
            ? { ...w, zIndex: counterRef.current, minimized: false }
            : w
        );
      }
      setFocusedId(id);
      return [...prev, { ...payload, id, zIndex: counterRef.current, minimized: false }];
    });
    return id;
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.filter(w => w.id !== id);
      // Move focus to next highest visible window
      const visible = next.filter(w => !w.minimized);
      setFocusedId(visible.length ? visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
      return next;
    });
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
    setFocusedId(id);
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, minimized: true } : w);
      const visible = next.filter(w => !w.minimized);
      setFocusedId(visible.length ? visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
      return next;
    });
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setFocusedId(id);
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, minimized: false, zIndex: maxZ + 1 } : w);
    });
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      setWindows(prev => {
        const visible = prev.filter(w => !w.minimized);
        if (!visible.length) return prev;
        const top = visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));

        // ⌘W — close focused window
        if (e.key === "w" || e.key === "W") {
          e.preventDefault();
          const next = prev.filter(w => w.id !== top.id);
          const nextVisible = next.filter(w => !w.minimized);
          setFocusedId(nextVisible.length ? nextVisible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
          return next;
        }

        // ⌘M — minimize focused window
        if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          const next = prev.map(w => w.id === top.id ? { ...w, minimized: true } : w);
          const nextVisible = next.filter(w => !w.minimized);
          setFocusedId(nextVisible.length ? nextVisible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
          return next;
        }

        return prev;
      });

      // ⌘` — cycle focus forward through visible windows
      if (e.key === "`") {
        e.preventDefault();
        setWindows(prev => {
          const visible = prev.filter(w => !w.minimized).sort((a, b) => a.zIndex - b.zIndex);
          if (visible.length < 2) return prev;
          // The currently focused window is the one with highest zIndex; bring the next one to front
          const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
          const top = visible[visible.length - 1];
          const nextWin = visible[visible.findIndex(w => w.id === top.id) - 1] ?? visible[visible.length - 2];
          setFocusedId(nextWin.id);
          return prev.map(w => w.id === nextWin.id ? { ...w, zIndex: maxZ + 1 } : w);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <WindowManagerContext.Provider value={{
      windows, focusedId, openWindow, closeWindow, setWindowLayout,
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
