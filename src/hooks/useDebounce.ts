import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay (default 800ms).
 * Cancels pending updates on unmount to prevent memory leaks.
 */
export function useDebounce<T>(value: T, delay: number = 800): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
