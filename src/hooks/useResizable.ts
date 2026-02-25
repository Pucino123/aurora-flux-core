import { useRef, useCallback, useEffect } from "react";

export type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface UseResizableOptions {
  pos: { x: number; y: number; w: number; h: number };
  minW?: number;
  minH?: number;
  onUpdate: (updates: Partial<{ x: number; y: number; w: number; h: number }>) => void;
  onDone?: () => void;
  enabled: boolean;
}

export const useResizable = ({
  pos,
  minW = 220,
  minH = 160,
  onUpdate,
  onDone,
  enabled,
}: UseResizableOptions) => {
  const resizing = useRef<ResizeDirection | null>(null);
  const startState = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0, w: 0, h: 0 });

  const onPointerDownResize = useCallback(
    (e: React.PointerEvent, dir: ResizeDirection) => {
      if (!enabled) return;
      e.stopPropagation();
      e.preventDefault();
      resizing.current = dir;
      startState.current = {
        x: pos.x,
        y: pos.y,
        mouseX: e.clientX,
        mouseY: e.clientY,
        w: pos.w,
        h: pos.h,
      };
    },
    [enabled, pos.x, pos.y, pos.w, pos.h]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const dir = resizing.current;
      if (!dir) return;
      e.preventDefault();

      const { x, y, mouseX, mouseY, w, h } = startState.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;

      let nx = x, ny = y, nw = w, nh = h;

      // Horizontal
      if (dir.includes("e")) nw = Math.max(minW, w + dx);
      if (dir.includes("w")) {
        const clamped = Math.min(w - minW, dx);
        nx = x + clamped;
        nw = Math.max(minW, w - clamped);
      }
      // Vertical
      if (dir.includes("s")) nh = Math.max(minH, h + dy);
      if (dir.includes("n")) {
        const clamped = Math.min(h - minH, dy);
        ny = y + clamped;
        nh = Math.max(minH, h - clamped);
      }

      onUpdate({ x: nx, y: ny, w: nw, h: nh });
    };

    const onUp = () => {
      if (resizing.current) {
        resizing.current = null;
        onDone?.();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [minW, minH, onUpdate, onDone]);

  return { onPointerDownResize };
};
