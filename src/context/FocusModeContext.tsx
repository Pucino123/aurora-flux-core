import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { toast } from "sonner";

export interface QueuedNotification {
  id: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  timestamp: number;
}

interface FocusModeContextType {
  isFocusModeActive: boolean;
  notificationQueue: QueuedNotification[];
  focusTaskTitle: string | null;
  focusTimeRemaining: number; // seconds
  setFocusTaskTitle: (title: string | null) => void;
  setFocusTimeRemaining: (seconds: number | ((prev: number) => number)) => void;
  enableFocusMode: (taskTitle?: string, durationSeconds?: number) => void;
  disableFocusMode: () => void;
  toggleFocusMode: () => void;
  /** Call instead of toast() to respect DND queue */
  notify: (message: string, type?: QueuedNotification["type"]) => void;
  clearQueue: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | null>(null);

const DEFAULT_DURATION = 25 * 60; // 25 minutes in seconds

export const FocusModeProvider = ({ children }: { children: ReactNode }) => {
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<QueuedNotification[]>([]);
  const [focusTaskTitle, setFocusTaskTitle] = useState<string | null>(null);
  const [focusTimeRemaining, setFocusTimeRemaining] = useState(DEFAULT_DURATION);
  const isActiveRef = useRef(false);

  const clearQueue = useCallback(() => setNotificationQueue([]), []);

  const notify = useCallback((message: string, type: QueuedNotification["type"] = "info") => {
    if (isActiveRef.current) {
      setNotificationQueue(prev => [
        ...prev,
        { id: `notif-${Date.now()}-${Math.random()}`, message, type, timestamp: Date.now() },
      ]);
    } else {
      toast[type === "success" ? "success" : type === "error" ? "error" : type === "warning" ? "warning" : "info"](message);
    }
  }, []);

  const enableFocusMode = useCallback((taskTitle?: string, durationSeconds?: number) => {
    setFocusTaskTitle(taskTitle ?? null);
    setFocusTimeRemaining(durationSeconds ?? DEFAULT_DURATION);
    setNotificationQueue([]);
    isActiveRef.current = true;
    setIsFocusModeActive(true);
  }, []);

  const disableFocusMode = useCallback(() => {
    isActiveRef.current = false;
    setIsFocusModeActive(false);
    setNotificationQueue(prev => {
      if (prev.length > 0) {
        // Show summary after a short delay so the exit animation plays first
        const count = prev.length;
        setTimeout(() => {
          toast.info(`📬 You received ${count} notification${count > 1 ? "s" : ""} while focusing`, {
            duration: 5000,
            description: "Check your inbox to catch up.",
          });
        }, 600);
      }
      return [];
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    if (isActiveRef.current) {
      disableFocusMode();
    } else {
      // The intention modal will call enableFocusMode with params — 
      // we just signal "pending activation" by setting active so the modal shows.
      // Actually, we let the UI handle the intention modal before calling enableFocusMode.
      // So toggleFocusMode just flips; if you want the modal, call enableFocusMode directly.
      isActiveRef.current = true;
      setIsFocusModeActive(true);
    }
  }, [disableFocusMode]);

  return (
    <FocusModeContext.Provider value={{
      isFocusModeActive, notificationQueue, focusTaskTitle, focusTimeRemaining,
      setFocusTaskTitle, setFocusTimeRemaining,
      enableFocusMode, disableFocusMode, toggleFocusMode,
      notify, clearQueue,
    }}>
      {children}
    </FocusModeContext.Provider>
  );
};

export const useFocusMode = () => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error("useFocusMode must be used inside FocusModeProvider");
  return ctx;
};
