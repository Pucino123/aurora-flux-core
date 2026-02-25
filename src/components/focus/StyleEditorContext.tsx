import { createContext, useContext } from "react";

type StyleEditorCallback = (widgetId: string) => void;

const StyleEditorContext = createContext<StyleEditorCallback | null>(null);

export const StyleEditorProvider = StyleEditorContext.Provider;

export function useStyleEditorCallback(): StyleEditorCallback | null {
  return useContext(StyleEditorContext);
}
