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
  groupId?: string; // links two windows into a pair
  lastActiveAt?: string; // ISO timestamp, updated on bringToFront / openWindow
}

type PersistedWindow = Pick<AppWindow, 'type' | 'contentId' | 'title' | 'layout' | 'position' | 'size' | 'minimized' | 'groupId' | 'lastActiveAt'>;

const STORAGE_KEY = "flux-windows-v2";
// Documents always render above widgets with a fixed z-offset tier
const DOC_Z_BOOST = 500;

function loadPersistedWindows(): PersistedWindow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function hydrateWindows(persisted: PersistedWindow[]): AppWindow[] {
  return persisted.map((p, i) => ({
    id: `win-restored-${i}-${Date.now()}`,
    zIndex: 100 + i + (p.type === 'document' ? DOC_Z_BOOST : 0),
    ...p,
  }));
}

interface WindowManagerContextType {
  windows: AppWindow[];
  focusedId: string | null;
  switcherOpen: boolean;
  switcherTargetId: string | null;
  openWindow: (payload: Omit<AppWindow, 'id' | 'zIndex'>) => string;
  closeWindow: (id: string) => void;
  setWindowLayout: (id: string, layout: WindowLayout) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeSwitcher: () => void;
  duplicateWindow: (id: string) => void;
  groupWindows: (idA: string, idB: string) => void;
  ungroupWindow: (id: string) => void;
  updateWindowTitle: (id: string, title: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export const WindowManagerProvider = ({ children }: { children: ReactNode }) => {
  const [windows, setWindows] = useState<AppWindow[]>(() =>
    hydrateWindows(loadPersistedWindows())
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherTargetId, setSwitcherTargetId] = useState<string | null>(null);
  const counterRef = useRef(200);
  const switcherTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    const toSave: PersistedWindow[] = windows.map(
      ({ type, contentId, title, layout, position, size, minimized, groupId }) => ({
        type, contentId, title, layout, position, size, minimized, groupId,
      })
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [windows]);

  const closeSwitcher = useCallback(() => {
    setSwitcherOpen(false);
    setSwitcherTargetId(prev => {
      if (prev) {
        setFocusedId(prev);
        setWindows(ws => {
          const maxZ = ws.reduce((m, w) => Math.max(m, w.zIndex), 0);
          const win = ws.find(w => w.id === prev);
          const boost = win?.type === 'document' ? DOC_Z_BOOST : 0;
          return ws.map(w => w.id === prev ? { ...w, zIndex: maxZ + 1 + boost, minimized: false } : w);
        });
      }
      return null;
    });
  }, []);

  const openWindow = useCallback((payload: Omit<AppWindow, 'id' | 'zIndex'>): string => {
    const id = `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const boost = payload.type === 'document' ? DOC_Z_BOOST : 0;
    const now = new Date().toISOString();
    const shouldMinimize = payload.minimized === true;
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), counterRef.current);
      counterRef.current = maxZ + 1;
      const existing = prev.find(w => w.contentId === payload.contentId && w.type === payload.type);
      if (existing) {
        // If caller wants to minimize an existing window, respect that
        if (shouldMinimize) {
          const next = prev.map(w =>
            w.id === existing.id ? { ...w, minimized: true, lastActiveAt: now } : w
          );
          const visible = next.filter(w => !w.minimized);
          setFocusedId(visible.length ? visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
          return next;
        }
        setFocusedId(existing.id);
        return prev.map(w =>
          w.id === existing.id
            ? { ...w, zIndex: counterRef.current + boost, minimized: false, lastActiveAt: now }
            : w
        );
      }
      if (!shouldMinimize) setFocusedId(id);
      return [...prev, { ...payload, id, zIndex: counterRef.current + boost, minimized: shouldMinimize, lastActiveAt: now }];
    });
    return id;
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.filter(w => w.id !== id);
      const visible = next.filter(w => !w.minimized);
      setFocusedId(visible.length ? visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
      return next;
    });
  }, []);

  const setWindowLayout = useCallback((id: string, layout: WindowLayout) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, layout } : w));
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id);
      if (!win) return prev;
      if (win.groupId) {
        const dx = x - win.position.x;
        const dy = y - win.position.y;
        return prev.map(w => {
          if (w.id === id) return { ...w, position: { x, y } };
          if (w.groupId === win.groupId) return { ...w, position: { x: w.position.x + dx, y: w.position.y + dy } };
          return w;
        });
      }
      return prev.map(w => w.id === id ? { ...w, position: { x, y } } : w);
    });
  }, []);

  const updateWindowSize = useCallback((id: string, w: number, h: number) => {
    setWindows(prev => prev.map(win => win.id === id ? { ...win, size: { w, h } } : win));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setFocusedId(id);
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      const win = prev.find(w => w.id === id);
      const boost = win?.type === 'document' ? DOC_Z_BOOST : 0;
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 + boost, lastActiveAt: new Date().toISOString() } : w);
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
      const win = prev.find(w => w.id === id);
      const boost = win?.type === 'document' ? DOC_Z_BOOST : 0;
      return prev.map(w => w.id === id ? { ...w, minimized: false, zIndex: maxZ + 1 + boost } : w);
    });
  }, []);

  const duplicateWindow = useCallback((id: string) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id);
      if (!win) return prev;
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      const boost = win.type === 'document' ? DOC_Z_BOOST : 0;
      const newId = `win-dup-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setFocusedId(newId);
      return [...prev, {
        ...win,
        id: newId,
        groupId: undefined,
        zIndex: maxZ + 1 + boost,
        minimized: false,
        position: { x: win.position.x + 32, y: win.position.y + 32 },
      }];
    });
  }, []);

  const groupWindows = useCallback((idA: string, idB: string) => {
    const groupId = `group-${Date.now()}`;
    setWindows(prev => prev.map(w =>
      w.id === idA || w.id === idB ? { ...w, groupId } : w
    ));
  }, []);

  const ungroupWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, groupId: undefined } : w));
  }, []);

  const updateWindowTitle = useCallback((id: string, title: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, title } : w));
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      // ⌘W — close top window
      if (e.key === "w" || e.key === "W") {
        setWindows(prev => {
          const visible = prev.filter(w => !w.minimized);
          if (!visible.length) return prev;
          const top = visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b);
          e.preventDefault();
          const next = prev.filter(w => w.id !== top.id);
          const nextVisible = next.filter(w => !w.minimized);
          setFocusedId(nextVisible.length ? nextVisible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
          return next;
        });
        return;
      }

      // ⌘M — minimize top window
      if (e.key === "m" || e.key === "M") {
        setWindows(prev => {
          const visible = prev.filter(w => !w.minimized);
          if (!visible.length) return prev;
          const top = visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b);
          e.preventDefault();
          const next = prev.map(w => w.id === top.id ? { ...w, minimized: true } : w);
          const nextVisible = next.filter(w => !w.minimized);
          setFocusedId(nextVisible.length ? nextVisible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id : null);
          return next;
        });
        return;
      }

      // ⌘` — open/cycle window switcher
      if (e.key === "`") {
        e.preventDefault();
        if (switcherTimerRef.current) clearTimeout(switcherTimerRef.current);

        setWindows(prev => {
          const all = prev.filter(w => !w.minimized).sort((a, b) => a.zIndex - b.zIndex);
          if (all.length === 0) return prev;

          setSwitcherOpen(true);
          setSwitcherTargetId(current => {
            const idx = all.findIndex(w => w.id === current);
            const nextIdx = idx <= 0 ? all.length - 1 : idx - 1;
            return all[nextIdx]?.id ?? all[0].id;
          });

          switcherTimerRef.current = setTimeout(() => {
            setSwitcherOpen(false);
            setSwitcherTargetId(target => {
              if (target) {
                setFocusedId(target);
                setWindows(ws => {
                  const maxZ = ws.reduce((m, w) => Math.max(m, w.zIndex), 0);
                  const win = ws.find(w => w.id === target);
                  const boost = win?.type === 'document' ? DOC_Z_BOOST : 0;
                  return ws.map(w =>
                    w.id === target ? { ...w, zIndex: maxZ + 1 + boost, minimized: false } : w
                  );
                });
              }
              return null;
            });
          }, 1500);

          return prev;
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (switcherTimerRef.current) clearTimeout(switcherTimerRef.current);
    };
  }, []);

  return (
    <WindowManagerContext.Provider value={{
      windows, focusedId, switcherOpen, switcherTargetId,
      openWindow, closeWindow, setWindowLayout,
      updateWindowPosition, updateWindowSize, bringToFront,
      minimizeWindow, restoreWindow, closeSwitcher,
      duplicateWindow, groupWindows, ungroupWindow, updateWindowTitle,
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
