import { useState, useCallback, useEffect } from "react";

export interface WidgetStyle {
  backgroundColor: string;
  backgroundOpacity: number;
  textColor: string;
  textOpacity: number;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  borderStyle: string;
  blurAmount: number;
  fontFamily: string;
  fontSize: number;
  glassEffect: boolean;
  depthShadow: boolean;
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  backgroundColor: "",
  backgroundOpacity: 0,
  textColor: "",
  textOpacity: 100,
  borderColor: "",
  borderWidth: 0,
  borderRadius: 16,
  borderStyle: "solid",
  blurAmount: 0,
  fontFamily: "",
  fontSize: 0,
  glassEffect: false,
  depthShadow: false,
};

const STORAGE_KEY = "flux-widget-styles";

function loadStyles(): Record<string, WidgetStyle> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let cachedStyles: Record<string, WidgetStyle> = loadStyles();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStyles));
  listeners.forEach((fn) => fn());
}

export function getWidgetStyle(id: string): WidgetStyle {
  return { ...DEFAULT_WIDGET_STYLE, ...(cachedStyles[id] || {}) };
}

export function setWidgetStyle(id: string, updates: Partial<WidgetStyle>) {
  cachedStyles = {
    ...cachedStyles,
    [id]: { ...getWidgetStyle(id), ...updates },
  };
  persist();
}

export function resetWidgetStyle(id: string) {
  const { [id]: _, ...rest } = cachedStyles;
  cachedStyles = rest;
  persist();
}

export function useWidgetStyle(id: string) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const style = getWidgetStyle(id);

  const update = useCallback(
    (updates: Partial<WidgetStyle>) => setWidgetStyle(id, updates),
    [id]
  );

  const reset = useCallback(() => resetWidgetStyle(id), [id]);

  return { style, update, reset };
}
