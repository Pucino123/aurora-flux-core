
## What's happening

From the code, `FocusDashboardView.tsx` renders exactly one `<WidgetToggleBar />` at line 1523 — the correct frosted pill. But the screenshot shows a second darker toolbar beneath it. This is the old `WindowDock` component that was injected **inside FocusDashboardView.tsx** by a previous AI edit that added it as a Portal or direct render somewhere in the 2192-line file that we haven't inspected yet.

The current `WindowDock.tsx` returns `null`, so if `FocusDashboardView` still imports and renders it (it doesn't — the import was removed), it wouldn't show. The second bar is more likely leftover from the previous AI edit that modified `FocusDashboardView.tsx` to add a dock-like component inline.

## Root cause

The previous AI added a **new inline dock element** directly inside `FocusDashboardView.tsx` as a `fixed bottom-4` component with `rounded-2xl bg-slate-900/80 backdrop-blur-2xl` — the exact macOS-style dock from Phase 1. This element was never removed, so it renders **behind** the original `WidgetToggleBar` pill.

## The fix + minimize-to-toolbar feature

### 1. Remove the phantom dock from FocusDashboardView.tsx
Search for and delete any `fixed bottom` element in FocusDashboardView.tsx that is NOT `<WidgetToggleBar />`. This removes the duplicate toolbar.

### 2. Minimize-to-toolbar animation in WidgetToggleBar.tsx
When a window is minimized (via Cmd+M or the `-` button in WindowFrame), it should:
- Animate from its current position on screen down into the toolbar using `framer-motion` `layoutId`
- Appear as a compact chip **immediately after the first divider** (between widget buttons and the separator), on the left side of the separator

The `WidgetToggleBar` already has `layoutId={`window-${win.id}`}` on each chip, but the windows appear **after** the separator (right side). Instead, minimized windows should appear to the **left of the separator**, right after the widget toggles.

### 3. Window chips reordering

Current order in pill:
```
[ Clock | Timer | Music | Planner | sep | + More | Eye | Reset | sep | ALL windows | sep | Trash ]
```

Requested order (minimized windows appear left of the separator):
```
[ Clock | Timer | Music | Planner | sep | MiniWin1 | MiniWin2 | sep | + More | Eye | Reset | sep | Trash ]
```

Only **minimized** windows appear to the left. Active/open windows still appear to the right OR we simplify: all open windows appear in the chip section after the static tools, before More.

Actually re-reading the user: "når man minimizer et dokument skal det dukke op ved siden af separator ved venstre side af tools" — when minimized, it should appear next to the separator on the LEFT side of the tools. So minimized chips go between the static widget buttons and the divider.

New layout:
```
[ Clock | Timer | Music | Planner | MiniDoc1 | MiniDoc2 | ──── | + More | Eye | Reset | ──── | Trash ]
```
- Minimized window chips slide in between Planner and the divider
- They are compact (icon only, small label)
- Click → restore the window

### Files to change

| File | Change |
|---|---|
| `src/components/focus/FocusDashboardView.tsx` | Find and delete the phantom fixed-bottom dock element that was added by the previous AI |
| `src/components/focus/WidgetToggleBar.tsx` | Move minimized-window chips to appear LEFT of the divider (between Planner and the separator), with `layoutId` spring animation |
| `src/components/windows/WindowFrame.tsx` | Ensure the minimize button (`Minus` / `-`) calls `minimizeWindow(win.id)` and the motion container has `layoutId={`window-${win.id}`}` so framer-motion can animate it down into the toolbar |

### The minimize animation

In `WindowFrame.tsx`, wrap the entire frame in `<motion.div layoutId={`window-${win.id}`}>`. When `minimizeWindow` is called, the window disappears from the canvas and the `layoutId` connects to the chip in `WidgetToggleBar`, making framer-motion animate it smoothly from desktop position down to the toolbar. This is the `shared layout animation` pattern from framer-motion.

The chip in `WidgetToggleBar` also uses the same `layoutId={`window-${win.id}`}` — this is already in the current code, so the connect is already established. The only issue is the chips currently show ALL windows (not just minimized), so we need to filter to `windows.filter(w => w.minimized)` for the left section, and optionally show active (non-minimized) open windows separately or not at all.

### Summary of changes to WidgetToggleBar

```
Before divider:
  - Static widget toggles (unchanged)
  - NEW: minimized window chips (only win.minimized === true)

After divider:
  - + More button (with badge for total open windows count)
  - Eye toggle
  - Reset

After second divider:
  - Trash
```

Active (non-minimized) windows are NOT shown as chips — they are visible on the desktop. Only minimized ones show in the dock. This matches real macOS behavior.
