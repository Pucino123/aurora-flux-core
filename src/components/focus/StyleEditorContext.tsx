import { createContext, useContext } from "react";

interface StyleEditorContextValue {
  openEditor: (widgetId: string) => void;
  activeWidgetId: string | null;
}

const StyleEditorContext = createContext<StyleEditorContextValue | null>(null);

export const StyleEditorProvider = StyleEditorContext.Provider;

export function useStyleEditorCallback(): ((widgetId: string) => void) | null {
  const ctx = useContext(StyleEditorContext);
  return ctx?.openEditor ?? null;
}

export function useStyleEditorTarget(): string | null {
  const ctx = useContext(StyleEditorContext);
  return ctx?.activeWidgetId ?? null;
}
