

## Implementation Plan: Core Fixes, Layout, Tasks, and Collaboration

This is a large set of features. Here is the breakdown into implementation steps, grouped by area.

---

### 1. Rename "Hjem" to "Dashboard" in Navigation

**Files:** `src/lib/i18n.ts`
- Change `sidebar.home` from `"Hjem"` (da) → `"Dashboard"` and `"Home"` (en) → `"Dashboard"`.

---

### 2. Default Dashboard Layout for First-Time Users

**Files:** `src/context/FocusContext.tsx`, `src/components/focus/FocusDashboardView.tsx`, `src/components/focus/ClockWidget.tsx`

- Set `DEFAULT_STATE.currentBackground` to the background matching the user's screenshot (the forest/waterfall — `"cozy-fireplace"` which maps to "Rainforest" video).
- Set `DEFAULT_STATE.activeWidgets` to `["clock", "notes", "planner"]` (already correct).
- Set `DEFAULT_STATE.clockFontSize` to match the large clock visible in the screenshot (~80–90px).
- Ensure the vignette effect is always present on the focus view (currently only shows in "focus" systemMode — change to show by default).

---

### 3. Frosted Glass Default for New Widgets

**Files:** `src/components/focus/DraggableWidget.tsx`, `src/hooks/useWidgetStyle.ts`

- In `useWidgetStyle`, set default style values for any widget that hasn't been customized to include `backdrop-blur` and translucent background (frosted glass).
- In `DraggableWidget`, apply these defaults when rendering the widget container so new widgets instantiate with the glass effect.

---

### 4. Calendar Drag & Drop Fix

**Files:** `src/pages/FullCalendarView.tsx`

- The current drag-and-drop uses native HTML drag events. The issue is that `onDragOver` needs `e.preventDefault()` to allow drops, which is present but may not fire correctly for schedule blocks.
- Add drag support for schedule blocks (currently only tasks are draggable).
- Add ability to drag blocks between time slots in week view.
- Ensure `handleDrop` also handles block rescheduling (currently only handles task-id).

---

### 5. Task Team Assignments

**Files:** `src/pages/AITaskManager.tsx`, `src/context/FluxContext.tsx`

- Add an `assigned_to` field to tasks (database migration for the `tasks` table).
- In the expanded task row panel, add an avatar/dropdown selector showing team members.
- Display assigned user avatar badge on each task row.

---

### 6. Undo Task Completion

**Files:** `src/pages/AITaskManager.tsx`

- Already partially implemented — `onUndone` prop exists on `SortableTaskRow` and the `RotateCcw` button shows on hover for done tasks.
- Verify the `onUndone` handler is wired correctly in the main component. Wire `onUndone` to call `updateTask(id, { done: false, status: "todo" })`.

---

### 7. AI "Today's Plan" Auto-Push

**Files:** `src/components/Scheduler.tsx`, new edge function `supabase/functions/ai-daily-plan/index.ts`

- On mount, check if the user has schedule blocks for today. If not, call an AI edge function that reads the user's tasks and generates a prioritized daily plan.
- The edge function uses Lovable AI (Gemini Flash) with tool calling to return structured task suggestions.
- Auto-create schedule blocks from the AI response and display in Today's Plan widget.

---

### 8. Mini Colab Widget Upgrade

**Files:** `src/components/chat/TeamChatWidget.tsx`, `src/components/focus/CollabMessagesModal.tsx`

- Replace the current simple floating chat panel with a scaled-down version of the Colab Modal.
- Reuse the same sidebar (contacts, conversations) + message area from `CollabMessagesModal` but in a compact 380×500 container.
- Retain all functionality: chat, contacts, pending invites, reactions, file attachments.

---

### 9. AI Contextual Action: Message → Task/Calendar

**Files:** `src/components/focus/CollabMessagesModal.tsx`, `src/components/chat/TeamChatWidget.tsx`, new edge function `supabase/functions/message-to-action/index.ts`

- Extend the existing right-click context menu on messages to include "Add to Task" and "Add to Calendar" options (alongside existing emoji reactions and Reply).
- On click, call a new edge function that takes the raw message text and uses AI to rewrite it as an actionable task title (e.g., "Fix the header (Requested by Alex)").
- For "Add to Task": create a task via FluxContext's `createTask`.
- For "Add to Calendar": create a schedule block via `createBlock` with today's date.
- Show a toast confirming the action.

---

### Database Migration Required

Add `assigned_to` column to the `tasks` table:
```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);
```

### New Edge Functions

1. **`ai-daily-plan`** — Reads user tasks, returns structured daily plan via Lovable AI.
2. **`message-to-action`** — Rewrites a chat message into an actionable task/event title via Lovable AI.

---

### Technical Notes

- The i18n system uses a simple key-value map with Danish/English fallback. The rename is a single string change.
- The `DraggableWidget` already supports custom styles via `useWidgetStyle` — the frosted glass default is a change to the hook's fallback values.
- Calendar D&D currently handles tasks but not schedule blocks — extending `handleDragStart`/`handleDrop` to support block IDs will fix this.
- The Colab modal is ~1100 lines. The mini widget will import and compose the same internal components rather than duplicating code.

