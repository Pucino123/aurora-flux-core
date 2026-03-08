import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

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
}

interface WindowManagerContextType {
  windows: AppWindow[];
  openWindow: (payload: Omit<AppWindow, 'id' | 'zIndex'>) => string;
  closeWindow: (id: string) => void;
  setWindowLayout: (id: string, layout: WindowLayout) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export const WindowManagerProvider = ({ children }: { children: ReactNode }) => {
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const counterRef = useRef(100);

  const openWindow = useCallback((payload: Omit<AppWindow, 'id' | 'zIndex'>): string => {
    const id = `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setWindows(prev => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), counterRef.current);
      counterRef.current = maxZ + 1;
      // If a window with same contentId+type already open, bring it to front instead
      const existing = prev.find(w => w.contentId === payload.contentId && w.type === payload.type);
      if (existing) {
        return prev.map(w => w.id === existing.id ? { ...w, zIndex: counterRef.current } : w);
      }
      return [...prev, { ...payload, id, zIndex: counterRef.current }];
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

  return (
    <WindowManagerContext.Provider value={{ windows, openWindow, closeWindow, setWindowLayout, updateWindowPosition, updateWindowSize, bringToFront }}>
      {children}
    </WindowManagerContext.Provider>
  );
};

export const useWindowManager = () => {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
};
