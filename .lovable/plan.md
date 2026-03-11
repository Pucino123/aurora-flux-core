
## Problem Analysis

The screenshot shows:
- **Clock**: Large, centered horizontally in the visible canvas (~790px from left in a ~1540px viewport with ~210px sidebar)
- **Today's Plan**: Docked flush to the right side, full height
- **Toolbar + Pill**: Fixed at bottom, centered in canvas

**Root cause**: `DraggableWidget` uses `position: absolute` with pixel coordinates stored in `widgetPositions`. These are relative to the canvas container. When the sidebar collapses/expands, the container shifts width, so widgets appear to "tear" or drift.

The fix is to switch the clock and planner to `position: fixed` (viewport-relative), so they never move when the sidebar changes.

---

## Plan

### 1. Make DraggableWidget support `fixed` positioning mode

Add an optional `fixed` prop to `DraggableWidget`. When `fixed={true}`:
- Use `position: fixed` instead of `absolute` on the widget container
- Positions stored/read are viewport coordinates (not canvas-relative)
- Drag still works — just clamps to viewport bounds instead of canvas bounds

### 2. Update ClockWidget default position

Change `defaultClockPos` to use pure viewport centering (no sidebar offset needed since `fixed` positioning is viewport-relative):
```
x = Math.round((window.innerWidth - 400) / 2)
y = Math.round(window.innerHeight * 0.04)
```
Pass `fixed` prop to DraggableWidget.

### 3. Update TodaysPlanWidget default position

Change default position to be right-docked in viewport coordinates:
```
x = window.innerWidth - 340 - 16   // 16px from right edge
y = 0                                // starts from top
h = window.innerHeight               // full height
```
Pass `fixed` prop to DraggableWidget.

Also reset the saved `planner` position in `FocusContext.tsx` `loadState()` just like we do for `clock` — so existing users get the new position.

### 4. Fix toolbar + pill centering (remove the +130px sidebar offset)

Both the toolbar (`ToolDrawer.tsx`) and the pill (`FocusDashboardView.tsx`) currently use:
```
left: "calc(50% + 130px)"
```
This was a hack to compensate for the sidebar. Since `position: fixed` is viewport-relative, `50%` of the viewport is NOT the center of the canvas. 

The sidebar is ~210px wide (not 260px as previously assumed). The correct formula for centering in the canvas area:
```
left: calc(210px + (100vw - 210px) / 2)  =  calc(105px + 50vw)
```
But actually, looking at the screenshot more carefully: the pill is at ~890px (center of 1540-210 = 1330px canvas → 210 + 665 = 875px). The toolbar is directly below it, same center.

**Simplest correct approach**: Use `left: 50%` with `transform: translateX(-50%)` — but add a CSS variable for sidebar width that gets applied. Actually, the sidebar is always visible in the screenshot, and collapsed state needs to work too.

**Best approach for robustness**: Don't offset at all. Both toolbar and pill should use `left: 50%; transform: translateX(-50%)` relative to the full viewport. This centers them across the entire screen. The clock uses fixed centering too. When sidebar collapses, everything stays put (which is actually the desired behavior — "pulling" stops).

Looking at the screenshot: the toolbar/pill appears roughly centered between the sidebar right edge and screen right edge. But the user's complaint is about sidebar collapse causing drift. The simplest fix that matches the screenshot is to center relative to the full viewport width (not try to offset for sidebar). The visual result in the screenshot has the sidebar open, and the elements look centered in the canvas — which matches `left: 50%` of viewport only approximately (since sidebar is ~14% of viewport), but it's close enough and stable.

### 5. Add `planner` to default `activeWidgets`

In `FocusContext.tsx` DEFAULT_STATE, `activeWidgets` already includes `"planner"`. Good.

Also in `loadState()`, delete `merged.widgetPositions.planner` so the fresh default position is used for all existing users.

---

## Files to change

1. **`src/components/focus/DraggableWidget.tsx`** — Add `fixed?: boolean` prop; use `position: fixed` when set; clamp to viewport coords
2. **`src/components/focus/ClockWidget.tsx`** — Use pure viewport centering; pass `fixed` prop
3. **`src/components/focus/TodaysPlanWidget.tsx`** — Right-dock default position; pass `fixed` prop; full-height default
4. **`src/context/FocusContext.tsx`** — Delete `planner` from widgetPositions in `loadState()` (same as clock)
5. **`src/components/focus/ToolDrawer.tsx`** — Change pill centering from `calc(50% + 130px)` to `calc(50%)` (pure center)
6. **`src/components/focus/FocusDashboardView.tsx`** — Same for toolbar pill: change `calc(50% + 130px)` to `calc(50%)`
