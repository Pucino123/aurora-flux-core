
## Plan: Move CalendarDays icon into Scheduler's header row

**Problem:** The CalendarDays icon is currently placed via `headerActions` prop in the DraggableWidget's title bar. The user wants it in the row inside Scheduler that contains the `+` (Plus) and `✦` (Sparkles) icons — lines 391-410 of Scheduler.tsx.

**Changes:**

### 1. `src/components/Scheduler.tsx`
- Add optional prop `onOpenFullCalendar?: () => void`
- Import `CalendarDays` from lucide-react
- In the icons row (line 391), add a `CalendarDays` button after the existing `CalendarIcon` popover trigger, before the `+` button — only rendered when `onOpenFullCalendar` is provided

### 2. `src/components/focus/TodaysPlanWidget.tsx`
- Remove `calendarAction` JSX and `headerActions` prop from DraggableWidget
- Pass `onOpenFullCalendar={() => setActiveView("calendar")}` directly to `<Scheduler />`
