import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface FocusModeContextType {
  isFocusModeActive: boolean;
  enableFocusMode: () => void;
  disableFocusMode: () => void;
  toggleFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | null>(null);

export const FocusModeProvider = ({ children }: { children: ReactNode }) => {
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);

  const enableFocusMode  = useCallback(() => setIsFocusModeActive(true), []);
  const disableFocusMode = useCallback(() => setIsFocusModeActive(false), []);
  const toggleFocusMode  = useCallback(() => setIsFocusModeActive(p => !p), []);

  return (
    <FocusModeContext.Provider value={{ isFocusModeActive, enableFocusMode, disableFocusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
};

export const useFocusMode = () => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error("useFocusMode must be used inside FocusModeProvider");
  return ctx;
};
