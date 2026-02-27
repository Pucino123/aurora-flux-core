

## Plan: Persistent Dashboard State, Clock Defaults & Marquee Fix

### 1. Database Table for Dashboard State Persistence

Create a new `dashboard_state` table to sync FocusContext state to the backend:

```sql
CREATE TABLE public.dashboard_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE dashboard_state ENABLE ROW LEVEL SECURITY;
-- RLS: users can only access their own state
CREATE POLICY "Users manage own dashboard state" ON dashboard_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 2. Sync Logic in FocusContext

**`src/context/FocusContext.tsx`** changes:
- Accept `user` from AuthProvider (or import `useAuth` at Provider level)
- On mount with authenticated user: fetch `dashboard_state` row, merge with localStorage, prefer DB data
- On state change: debounced upsert (800ms) to `dashboard_state` table, alongside existing localStorage write
- This ensures all widget positions, folder positions, doc positions, sticky notes, clock settings, etc. persist across sessions and devices

### 3. Default Clock Widget Configuration

**`src/context/FocusContext.tsx`** — update `DEFAULT_STATE`:
- `clockFontSize: 86` (already set)
- `clockShowSeconds: false` (match video — clean display)
- `clockShowGreeting: true` (already set)
- `clockShowDate: true` (already set)
- `clockWeight: 200` (already set — thin weight)
- `clockDepthShadow: true` (add depth shadow for video look)

**`src/components/focus/ClockWidget.tsx`** — update `defaultClockPos`:
- Center horizontally: `Math.round((window.innerWidth - 400) / 2)` (already correct)
- Position vertically higher: `y: 80` to match video reference where clock is upper-center

### 4. Bug Fix: Marquee vs Widget Drag Conflict

The root cause: `StickyNoteItem` in `FocusStickyNotes.tsx` uses `onPointerDown` with `setPointerCapture` but does NOT call `e.stopPropagation()`. The event bubbles up to the canvas `onMouseDown` handler which starts the marquee.

**`src/components/focus/FocusStickyNotes.tsx`** — in `onPointerDown` callback (line ~125):
- Add `e.stopPropagation()` before the drag logic

**`src/components/focus/DraggableWidget.tsx`** — in `onPointerDownDrag` callback (line ~158):
- Add `e.stopPropagation()` to prevent marquee when dragging any widget header

**`src/components/focus/FocusDashboardView.tsx`** — strengthen the target check in `handleCanvasMouseDown`:
- Add `[data-no-drag]` and sticky note selectors to the `.closest()` check to catch any edge cases

### File Change Summary

| File | Change |
|------|--------|
| **Migration SQL** | Create `dashboard_state` table with RLS |
| `src/context/FocusContext.tsx` | Add DB sync (load on mount, debounced save); update clock defaults |
| `src/components/focus/ClockWidget.tsx` | Adjust default Y position to `80` |
| `src/components/focus/FocusStickyNotes.tsx` | Add `e.stopPropagation()` in `onPointerDown` |
| `src/components/focus/DraggableWidget.tsx` | Add `e.stopPropagation()` in `onPointerDownDrag` |

