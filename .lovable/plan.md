
## Root causes

**Bug 1 — stale `state` closure in canvas loop:**
The `useEffect` that runs the canvas animation has `[size]` as its dependency array. This means `state` is captured once at mount and never updated inside the `draw` function. So `state === "listening"` is always `false` — the blobs never switch to audio-reactive mode.

**Fix:** Replace `state === "listening"` checks inside the loop with a `stateRef` that always holds the current state value. Add a `useEffect` that keeps `stateRef.current` in sync with `state`.

**Bug 2 — SVG "gas blinks" when listening starts:**
The `useEffect` at lines 82–103 fires on every `state` change and sets `blobGroup.style.opacity` to the new state's value (`0.72` for listening vs `0.58` for idle). This causes a visible flash. The SVG gas layer should remain at idle-level settings regardless of state — only the canvas blobs should react to audio.

**Fix:** Remove the `useEffect` that updates SVG attributes on state change. Lock the SVG layer permanently to idle-level config (`scale: 14`, `opacity: 0.58`, `seedDur: "12s"`). The canvas blobs handle all audio reactivity.

## Changes

**`src/components/focus/AuraOrb.tsx`:**
1. Add `stateRef = useRef(state)` and a `useEffect` that keeps it in sync with `state` prop changes
2. Remove the SVG-updating `useEffect` (lines 81–103) entirely — SVG stays at idle settings always
3. In the SVG JSX, hardcode `initCfg` to always use `svgStateConfig.idle` values so it never changes on re-render either
4. Replace all `state === "listening"` checks in the canvas draw loop with `stateRef.current === "listening"`
