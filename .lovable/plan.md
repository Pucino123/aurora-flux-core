
## Plan: Window Snapping Guide + "Open in Window" + Resize Handle + Bug Verification

---

### Feature 1 — Edge Snap Guide (WindowFrame.tsx)

During pill drag, track `e.clientX` against screen edges. When within ~100px of left or right edge, show a fullscreen overlay drop zone highlight. On pointer up, if snapping threshold was met, call `setWindowLayout` with `split-left` or `split-right` instead of `updateWindowPosition`.

Changes to `WindowFrame.tsx`:
- Add `snapZone` state: `null | 'left' | 'right'`
- In `handlePillPointerMove`: check `e.clientX < 100` → snapZone = 'left', `e.clientX > window.innerWidth - 100` → snapZone = 'right', else null
- In `handlePillPointerUp`: if `snapZone` → call `setWindowLayout(win.id, snapZone === 'left' ? 'split-left' : 'split-right')`, else save position normally
- Render the snap overlay via a portal: a full-screen `pointer-events-none` div at `z-[9990]`, with a 50% left or right highlighted zone (semi-transparent emerald glow, rounded border) — only visible when `snapZone !== null && isFloating && dragging.current`

---

### Feature 2 — "Open in Window" button in ToolDrawer

The ToolDrawer needs access to `openWindow` from `WindowManagerContext`. Since `ToolDrawer` is rendered inside `FocusDashboardView` which is already wrapped in `WindowManagerProvider`, the hook is available.

Changes to `ToolDrawer.tsx`:
- Import `useWindowManager` and widget icon map
- Add a small window icon button (`ExternalLink` or `AppWindow` icon, 10px, `z-10`) that appears on hover next to each tool tile
- The button calls `openWindow({ type: 'widget', contentId: id, title: label, layout: 'floating', position: { x: 120, y: 80 } })`
- Keep existing toggle behavior (click tile body = toggle widget on page)

Changes to `FocusDashboardView.tsx`:
- In the `WindowFrame` render loop, handle `win.type === 'widget'`: render the corresponding widget component inside the frame (same widget components, just re-rendered in the window context)
- Map widget contentId to the widget JSX (a `WIDGET_MAP` record)

---

### Feature 3 — Resize Handle (WindowFrame.tsx + WindowManagerContext.tsx)

**Context change:** Add `size` to `AppWindow`:
```ts
size?: { w: number; h: number }
```
Add `updateWindowSize(id, w, h)` action to context.

**WindowFrame changes:**
- Add local `size` state defaulting to `win.size ?? { w: 820, h: 620 }`
- Only active when `isFloating`
- Bottom-right corner: a `16×16` div with `cursor-se-resize`, `absolute bottom-0 right-0 z-[70]`  
- Use manual pointer events (`onPointerDown` → capture → `pointermove` on window → `pointerup`): calculate delta from drag start, clamp to minW=320 minH=240, update local `size` state on move, call `updateWindowSize` on up
- Apply `size.w` and `size.h` as inline styles when floating (override the Tailwind w/h classes)
- Also add bottom-edge and right-edge handles (thin 4px strips) for a more macOS-like experience

---

### Feature 4 — Verification (widget isolation + window manager)

**Widget isolation bug (line 2085 in Mission Control thumbnail):**  
```ts
const widgets = page.activeWidgets ?? activeWidgets;  // line 2085
```
This is a secondary instance of the same bug pattern. While the render at line 564 is already fixed (`?? []`), the Mission Control thumbnail preview still falls back to `activeWidgets`. Fix: change to `?? []`.

No new behavior change needed for the window manager end-to-end test — the existing code handles double-click open, drag, layout switch via pill menu, and X close.

---

### Files to change

| File | Changes |
|---|---|
| `src/components/windows/WindowFrame.tsx` | Snap guide overlay + snap logic on drag + resize handle (SE corner + right/bottom edges) + `updateWindowSize` wiring |
| `src/context/WindowManagerContext.tsx` | Add `size?: {w,h}` to `AppWindow`, add `updateWindowSize` action |
| `src/components/focus/ToolDrawer.tsx` | Import `useWindowManager`, add hover "Open in Window" button on each tool tile |
| `src/components/focus/FocusDashboardView.tsx` | Add `WIDGET_MAP` for widget type windows + fix Mission Control thumbnail `?? []` on line 2085 |

### Order
1. Context — add `size` + `updateWindowSize`
2. WindowFrame — resize handle + snap guide
3. ToolDrawer — "Open in Window" button
4. FocusDashboardView — WIDGET_MAP + line 2085 fix
