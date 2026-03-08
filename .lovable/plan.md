
## What the user wants

The newly created `WindowDock.tsx` (a separate macOS-style dock at `z-9000`) should be **removed/replaced**. Instead, open windows should appear **inside the existing `WidgetToggleBar` pill** (the frosted glass pill at `bottom-6 left-1/2 z-40`). The pill should dynamically widen as windows are added, keeping one unified, consistent glass toolbar.

---

## Current state
- `WidgetToggleBar.tsx` — the existing pill: `rounded-full bg-white/10 backdrop-blur-[16px] border border-white/20`. Shows widget toggles (Clock, Timer, Music, Planner, More, Eye, Reset).
- `WindowDock.tsx` — the new separate dock rendered via portal in `FocusDashboardView.tsx`. **This is what the user wants removed.**
- `WindowManagerContext.tsx` — holds `windows[]`, each with `title`, `type`, `contentId`, `minimized`.

## Plan

### 1. Delete `WindowDock.tsx` content → replace with a thin re-export shim
Rather than breaking `FocusDashboardView.tsx` imports, gut `WindowDock.tsx` and make it render `null`. This avoids touching the large FocusDashboardView import list.

### 2. Modify `WidgetToggleBar.tsx` — integrate open windows

- Import `useWindowManager` from `WindowManagerContext`
- Import `useTrash` from `TrashContext`  
- Read `windows` array from context
- **Divider**: When `windows.length > 0`, show a `w-px h-5 bg-white/15 mx-1` separator after the existing widget buttons
- **Window chips**: For each open window, render a compact chip inside the pill:
  - Minimized: `bg-white/5 text-white/40 border border-white/10` with a small dot indicator
  - Active/open: `bg-white/15 text-white border border-white/20 shadow-[0_0_12px_hsl(var(--aurora-violet)/0.3)]`
  - Click → `bringToFront(win.id)` or `restoreWindow(win.id)` if minimized
  - Hover → show title tooltip
  - `×` close button on hover
  - Icon: use the same `WIDGET_ICONS` map for widgets, `FileText` for documents
- **Trash section**: After another divider, render the Trash icon button (uses `useTrash`, opens `TrashModal`)
- **Dynamic width**: The pill uses `flex items-center gap-1` so it naturally grows. Add `transition-all duration-300` to animate width changes.
- **Focus Mode hide**: Wrap everything in the existing pattern: hide when `isFocusModeActive` (import `useFocusMode`)

### 3. Keep `TrashModal` rendered
`TrashModal` is currently rendered inside `WindowDock`. Move it to render inside `WidgetToggleBar` directly (via local state `trashOpen`).

### 4. Keep `WindowSwitcher` unchanged
`WindowSwitcher` is a separate portal overlay — no changes needed.

## Files changed
| File | Change |
|---|---|
| `src/components/windows/WindowDock.tsx` | Gut to `export default () => null` (preserves import in FocusDashboardView) |
| `src/components/focus/WidgetToggleBar.tsx` | Add window tiles + trash + focus mode hide |

## What it looks like
```
[ Clock | Timer | Music | Planner | + More | Eye | Reset | ──── | 📄 Doc1 | ⚙ Widget | ──── | 🗑 Trash ]
                                                                ↑ divider appears when windows exist
```
The pill is one unified glass form, expands naturally via flexbox as windows open.
