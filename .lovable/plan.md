
## Overview — "Psychologically Inviting Calendar" Full Epic

Building all 7 feature clusters in one pass. No Zustand migration — everything stays in React Context. No new DnD packages — project already has `@dnd-kit/core` + `@dnd-kit/sortable`.

---

## What exists that I'm building on
- `CalendarView.tsx` (1049 lines) — week/day/month views, mini-cal sidebar, provider sync, Aura briefing. No right drawer, no drag-to-schedule, no inline creation.
- `FluxContext.tsx` — tasks (`todo`/`done`, `scheduled_date`), `scheduleBlocks`, CRUD actions. Tasks have `task_id` field in `schedule_blocks` table.
- `CRMContext.tsx` — `deals` with `invoices` (status: `"Paid"|"Pending"|"Sent"`).
- `AskAura.tsx` — `workspaceContext()` already reads tasks/goals/deals.
- `MonetizationContext.tsx` — `sparksBalance`.
- `CommandPalette.tsx` — basic static list, not wired globally.
- `FluxSidebar.tsx` — no settings trigger.
- DB: `schedule_blocks` has `task_id`, `is_ai` columns already. `calendar_events` exists.

---

## Files to create (5 new)

```
src/components/ui/EmptyState.tsx
src/components/calendar/TaskDrawer.tsx
src/components/settings/SettingsModal.tsx
```
Plus inline sub-components defined inside `CalendarView.tsx` (InlineDraftPill, AuraScheduleBar, ProposedEventOverlay) to avoid prop-drilling complexity.

---

## Files to modify (5 existing)

| File | What changes |
|---|---|
| `src/components/CalendarView.tsx` | Full restructure: 3-col layout, dnd-kit, inline creation, Aura auto-schedule, proposed events, right task drawer |
| `src/components/CommandPalette.tsx` | Rewrite as omni-search (tasks + events + CRM + docs) with keyboard navigation |
| `src/pages/Index.tsx` | Add global Cmd+K + Cmd+, listeners, render SettingsModal |
| `src/components/FluxSidebar.tsx` | Add Settings gear button at bottom, wire Cmd+, |
| `src/context/FluxContext.tsx` | Add `scheduleTask(taskId, startTime)` action to interface + provider |
| `src/components/AskAura.tsx` | Enrich `workspaceContext()` with today's schedule + sparks balance |
| `src/pages/CRMPage.tsx` | Add "✨ Ask Aura to Analyze" button + CRM Intelligence approval panel |

---

## Feature-by-feature implementation

### 1. `scheduleTask()` in FluxContext
```ts
scheduleTask: async (taskId: string, startTime: string) => void
// → createBlock({ title: task.title, time: startTime, task_id: taskId, scheduled_date: today })
// → updateTask(taskId, { scheduled_date: today })
```

### 2. CalendarView — 3-Column Layout
```
[Left w-64 fixed] [Main flex-1] [Right w-72 collapsible]
```
- Left: existing sidebar (unchanged)
- Main: existing views + dnd-kit droppable slots + inline draft + proposed events overlay
- Right: `<TaskDrawer>` — lists `tasks.filter(t => !t.done && t.status === 'todo' && !t.scheduled_date)`

### 3. dnd-kit Drag-to-Schedule
- `<DndContext onDragEnd>` wraps the entire CalendarView layout
- `useDraggable({ id: taskId })` on task cards in right drawer
- Time slots in WeekView/DayView become droppable via `useDroppable({ id: 'slot-{date}-{hour}' })`
- `onDragEnd`: parse slot id → call `scheduleTask(activeId, startTime)`
- Task visually disappears from drawer (filtered out since `scheduled_date` is now set)

### 4. Inline Event Creation (no modal for week/day)
- `draftSlot: { date: string; hour: number } | null` state in CalendarView
- Clicking empty grid slot in week/day view → sets `draftSlot` instead of opening modal
- Renders `<InlineDraftPill>` — `<input autoFocus>`, Enter → `saveCustomEvent()`, Escape → clear
- Month view: keeps existing `AddEventModal` for usability on compact cells

### 5. Aura Auto-Schedule
**Button**: `✨ Auto-Schedule with Aura` at top of right drawer
- violet glow: `bg-slate-800 border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]`

**Algorithm** (pure client-side, no API):
```ts
function buildProposals(todayEvents, unscheduledTasks):
  working = [9..17]
  occupied = todayEvents with startTime
  gaps = findHourGaps(working, occupied) // consecutive 1-hr blocks
  return unscheduledTasks.slice(0, gaps.length).map((t, i) =>
    ({ ...t, proposedStart: gaps[i], proposedEnd: gaps[i]+1 }))
```

**Scanning animation**: framer-motion `motion.div` with a violet gradient that animates `top: 0% → 100%` over 2s (sweeping line)

**Proposed event pills**: `border-2 border-dashed border-violet-500/60 bg-violet-500/10 animate-pulse`

**Floating approval bar**: `fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]` — "Aura found time for N tasks" + Reject/Approve buttons

**Approve**: calls `scheduleTask()` for each proposed slot, clears proposals

### 6. CRM Intelligence
- In `CRMPage.tsx` contact detail/modal: add `✨ Ask Aura to Analyze` button
- Local state: `proposedPoints: string[]`, `isAnalyzing: boolean`
- Mock algorithm (1.5s):
  - Invoices with `status === "Pending"` → "Follow up on pending invoice for {name}"
  - Stage `"proposal"` → "Prepare presentation materials for {name}"
  - Stage `"contacted"` → "Schedule discovery call with {name}"
- Approval slide-down panel with `+ Add to Tasks` per item → `createTask()` from FluxContext

### 7. Global Command Palette (Cmd+K)
Rewrite `CommandPalette.tsx`:
- Reads: `tasks` from FluxContext, `deals` from CRMContext, `customEvents` via prop or context
- Search: simple `.toLowerCase().includes(query)` across all entities
- Groups: Tasks / Contacts / Events
- Arrow key `selectedIndex` state, Enter executes action (navigate to view + highlight)
- Global listener in `Index.tsx`: `(e.metaKey || e.ctrlKey) && e.key === 'k'`
- `z-[10001]`, `max-w-2xl`, `text-2xl` input

### 8. Settings Modal (Cmd+,)
New `src/components/settings/SettingsModal.tsx`:
- `fixed inset-0 z-[10002]` backdrop
- `w-[900px] h-[600px]` centered window
- Left nav tabs: Account / Integrations / Sparks & Billing / Appearance
- **Account**: avatar initials, display name, email (read from auth), Sign Out
- **Integrations**: same provider cards as `IntegrationModal` in CalendarView (moved here)
- **Sparks & Billing**: gradient progress bar `from-violet-500 to-emerald-500`, usage text, Upgrade button
- **Appearance**: theme toggle (light/dark/system)
- Rendered via portal in `Index.tsx`
- FluxSidebar: gear icon at bottom → fires `window.dispatchEvent(new Event('open-settings'))`

### 9. EmptyState Component
`src/components/ui/EmptyState.tsx`:
- Props: `icon`, `title`, `description`, `actionText`, `onAction`
- framer-motion: `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`
- Applied to:
  - CalendarView right drawer (no unscheduled tasks)
  - CRMPage (no contacts) — only if `deals.length === 0`

---

## Z-index map
```
Aura orb:        10000
Command palette: 10001
Settings modal:  10002
Window frames:   ~5000–9999
Cal Aura bar:    100 (within scroll container)
```

---

## Key constraints respected
- Monday-start week preserved (existing `weekStartsOn: 1`)
- No Zustand — all state in FluxContext / local component state
- `@dnd-kit/core` already installed — no new packages
- `schedule_blocks.task_id` column exists — `scheduleTask()` maps directly to DB schema
- `schedule_blocks.is_ai` column exists — used for Aura-proposed blocks on approve
- Inline creation only in week/day view — month keeps modal
- Settings modal does NOT break existing `SettingsView.tsx` full-page view
