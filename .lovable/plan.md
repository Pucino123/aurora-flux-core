
## Current state analysis

**`WidgetToggleBar.tsx`** already has:
- All static widget toggles (Clock, Timer, Music, Planner) ✅
- Open windows listed as chips with `useWindowManager` ✅  
- Minimized windows shown with a dot indicator ✅
- Close button on hover ✅
- Trash icon with badge ✅
- Focus mode hide animation ✅
- `motion.div` wrapper — but it's a plain `motion.div` with `animate`, NOT using `layout` prop ❌

**`WindowFrame.tsx`** already has:
- `minimizeWindow` amber traffic-light button ✅
- Minimize in dropdown + context menu ✅
- `layoutId={window-${win.id}}` on both the ghost (minimized state) and the live frame ✅
- When `win.minimized` → renders a ghost that animates `scale: 0.08, opacity: 0, y: "30vh"` ✅

**What the task is actually asking for that's MISSING:**

1. **`<motion.div layout>` on the toolbar container** — currently it uses a static `motion.div` with only `animate` (for focus mode). Adding `layout` will enable smooth width expansion when chips appear/disappear. This is the primary ask.

2. **Mobile window count badge on "More" button** — currently the More button has no badge. Need to add a badge showing `windows.length` when > 0. On mobile, the window chips are hidden (`hidden sm:inline`) so the badge is the only indicator.

3. **`Cmd+M` global shortcut in `WindowManagerContext.tsx`** — already handles `⌘W` and `⌘M` in the existing `useEffect` keyboard listener on line ~230. Reading the file confirms `⌘M` IS already wired to minimize the top window. ✅ No change needed here.

4. **"Suck down" animate to toolbar** — `WindowFrame` already uses `layoutId={window-${win.id}}`. The chip in `WidgetToggleBar` needs `layoutId={window-${win.id}}` too — then framer-motion will animate between the two. Currently the chip uses a plain `motion.div` with scale/opacity but NO `layoutId`. This is the key missing piece for the "suck down" effect.

## Exact changes needed

### File 1: `src/components/focus/WidgetToggleBar.tsx`

**Change 1** — Add `layout` prop and `layoutId` to the outer toolbar `motion.div` so it animates its width:
```tsx
<motion.div layout layoutId="widget-toggle-bar" ...>
```

**Change 2** — Add window count badge to the "More" button (mobile indicator):
```tsx
<button className="relative ...">
  <Plus size={15} ... />
  <span className="hidden sm:inline">More</span>
  {windows.length > 0 && (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-black/30 sm:hidden">
      {windows.length > 9 ? "9+" : windows.length}
    </span>
  )}
</button>
```

**Change 3** — Add `layoutId={window-${win.id}}` to each window chip `motion.div` so framer-motion can animate the shared layout transition between `WindowFrame` (which already has the matching `layoutId`) and the chip in the toolbar:
```tsx
<motion.div
  key={win.id}
  layoutId={`window-${win.id}`}   // ← ADD THIS
  initial={{ opacity: 0, scale: 0.8 }}
  ...
```

This single addition makes the "suck down" animation work — framer-motion sees the same `layoutId` in both `WindowFrame` (the full window) and the chip in the toolbar, and animates between them automatically when `win.minimized` changes.

### No changes needed to:
- `WindowFrame.tsx` — minimize button, ghost animation, `layoutId` all already correct
- `WindowManagerContext.tsx` — `⌘M` shortcut already implemented

## Summary of files changed

| File | What changes |
|---|---|
| `src/components/focus/WidgetToggleBar.tsx` | Add `layout` to outer `motion.div`, add `layoutId` to each window chip, add mobile window count badge on More button |

That's it — one file, three targeted additions.
