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
  borderOpacity: number;
  blurAmount: number;
  fontFamily: string;
  fontSize: number;
  glassEffect: boolean;
  depthShadow: boolean;
  hideSubtitle: boolean;
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  backgroundColor: "#000000",
  backgroundOpacity: 25,
  textColor: "",
  textOpacity: 100,
  borderColor: "#ffffff",
  borderWidth: 1,
  borderRadius: 16,
  borderStyle: "solid",
  borderOpacity: 15,
  blurAmount: 20,
  fontFamily: "",
  fontSize: 0,
  glassEffect: false,
  depthShadow: false,
  hideSubtitle: false,
};

const STORAGE_KEY = "flux-widget-styles";
export const GLOBAL_STYLE_KEY = "__global__";

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

export function getGlobalStyle(): WidgetStyle {
  return { ...DEFAULT_WIDGET_STYLE, ...(cachedStyles[GLOBAL_STYLE_KEY] || {}) };
}

export function getWidgetStyle(id: string): WidgetStyle {
  const global = cachedStyles[GLOBAL_STYLE_KEY] || {};
  const perWidget = cachedStyles[id] || {};
  return { ...DEFAULT_WIDGET_STYLE, ...global, ...perWidget };
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
