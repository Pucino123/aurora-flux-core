
## Tasks to implement

**1. Drag-to-move tooltip on DraggableWidget grip handle (build mode)**
- In `DraggableWidget.tsx`, add a Tooltip wrapping the build-mode drag handle bar (the `GripHorizontal` strip at the top of the widget). Show tooltip content "Drag to move" only in build mode, only on hover. Use a simple `title` attr or a small absolute positioned tooltip div that fades in on hover to keep it lightweight — no extra Radix dependency needed.

**2. Button-click guard for DesktopFolder and DesktopDocument**
- Both `DesktopFolder.tsx` and `DesktopDocument.tsx` use `handlePointerDown` which doesn't check if the click target is a `button` or `a` element.
- Add the same guard from `DraggableWidget`: if `target.tagName === "BUTTON" || target.tagName === "A" || !!target.closest("button, a")` → return early without starting drag.
- This ensures their context-menu items, rename inputs, action buttons all work without triggering accidental drag.

**3. Fix X button not working in DraggableWidget build mode**
- The X button (and Settings2 gear) in the header already have `onPointerDown={(e) => e.stopPropagation()}`. The issue is that the outer widget `motion.div` itself does NOT have a drag handler — only the inner header strip and the top build-mode grip handle do.
- Checking: the build-mode drag handle div at the top (`-top-0.5` position) uses `onPointerDown={onPointerDownDrag}`. The inner normal header uses `onPointerDown={onPointerDownDrag}`.
- The real root problem: `isBuildMode && !hideHeader` — in build mode `showHeader` is true (since `!isFocusMode && !hideHeader && !widgetMinimalMode`). But in build mode, the header IS shown. The X button's `onPointerDown={e => e.stopPropagation()}` stops propagation to the header's `onPointerDown={onPointerDownDrag}`. So the X click should work.
- The actual bug may be that the build-mode drag handle (`-top-0.5` positioned div) sits on top of or intercepts the X button at the top-right of the widget header. The drag handle is `absolute -top-0.5 left-1/2 -translate-x-1/2` so it's centered, not covering the right corner. 
- More likely: the header's `onPointerDown={onPointerDownDrag}` fires before buttons' `onPointerDown` because of event order. The guard check `!!target.closest("button, a")` should catch the X button. Let me re-read...
- The guard IS there: `const isInteractive = target.tagName === "BUTTON" || target.tagName === "A" || !!target.closest("button, a"); if (isInteractive) return;` — but is there a timing issue? The button's `onPointerDown` stops propagation, so `onPointerDownDrag` on the header div shouldn't fire at all.
- The real issue may be that `dragging.current` gets set in the same event cycle or from a prior incomplete drag. Let me look at this more carefully.
- Actually the real problem: `dragging.current = true` is set but `isDragging` (React state) might be false if threshold not met. On `pointerup`, if `isDragging` is false, nothing clears `dragging.current` since the condition is `if (dragging.current)` → it does reset. So that should be fine.
- More likely: buttons in the widget content area (not the header) trigger drag. The `motion.div` wrapper does NOT have `onPointerDown`. Only the header and build-mode grip handle do. So clicking a button in the body shouldn't trigger drag at all.
- The fix: ensure the X button's `onPointerDown` propagation stop works reliably. Add `onClick={(e) => { e.stopPropagation(); toggleWidget(id); }}` as well (currently it's just `onClick={() => toggleWidget(id)}`), AND add `onMouseDown={(e) => e.stopPropagation()}` as double-safety.

**4. Calendar Ecosystem Upgrade**
This is the large feature. Let me design the architecture:

**CalendarView.tsx** — full redesign:
- 2-column layout: left sidebar (260px) + main grid area
- Left sidebar contains:
  - Mini month-picker (uses existing `Calendar` shadcn component)
  - "My Calendars" section with toggleable providers (dashiii, google, outlook, apple) 
  - "+ New Event" button
  - "Sync External Calendars" button → opens `IntegrationModal`
- Main area:
  - Header: Today button, prev/next arrows, date label, Day/Week/Month view toggle
  - "Now" indicator (pulsing rose line) in Week/Day view
  - Soft glowing event pills: `bg-emerald-500/20 border-emerald-500/50` style
  - Subtle grid lines: `border-white/5`
  - Inline event creation on empty slot click (small card below clicked slot)

**CalEvent** type — add `provider` flag: `'dashiii' | 'google' | 'outlook' | 'apple'`

**IntegrationModal** (new component or inline):
- Glassmorphism modal: "Connect Your World"
- 3 cards: Google Calendar, Microsoft Outlook, Apple iCloud
- Framer-motion: idle → loading → connected states
- On connect: mark provider as connected in local state, inject 2-3 mock events with `provider` flag
- Provider icon shown on event pills (tiny badge)

**AuraDailyBriefing** (new component):
- Floating panel: `fixed bottom-6 right-6 z-50 w-96`
- Slides up on first visit to calendar (localStorage flag `aura-briefing-shown`)
- Breathing glow: `shadow-[0_0_20px_rgba(139,92,246,0.2)]` with animation
- Reads today's events + overdue tasks from FluxContext
- Generates contextual summary text
- Action buttons: "Yes, reschedule task" (calls `updateTask` to push due_date to tomorrow), "Dismiss"
- toast.success on action

**Files to change:**
- `src/components/CalendarView.tsx` — full redesign (2-col layout, new event pills, now indicator, inline creation, integration modal, Aura briefing)
- `src/components/focus/DraggableWidget.tsx` — tooltip on grip + X button fix
- `src/components/focus/DesktopFolder.tsx` — button click guard in handlePointerDown
- `src/components/focus/DesktopDocument.tsx` — button click guard in handlePointerDown

**Implementation approach for CalendarView:**
- Keep existing DB logic (`calendar_events` table, `saveCustomEvent`, loading)
- Add `provider` field to `CalEvent` interface (optional, defaults to 'dashiii')
- Add `connectedProviders` local state array
- IntegrationModal: self-contained with framer-motion states per card
- AuraDailyBriefing: reads tasks (overdue = `due_date < today && !done`), today events
- Now indicator: `useEffect` updates current time every minute, calculate pixel offset in week view grid
- Inline creation: `hoveredSlot` state, on slot hover show faint ghost block, on click show small input card inline
- Event pills redesigned: glassmorphism with colored border instead of solid bg

**Design tokens for new calendar:**
- Event pills: `bg-{color}/15 border border-{color}/40 text-{color}`  
- Grid cells: `border-white/5`
- Today column: `bg-primary/5`
- Now line: `bg-rose-500` with `animate-pulse` dot on left

**Scope:** Keep Day view out of scope (user requested Day/Week/Month but current has month/week/agenda — will add Day view as new, keep agenda, rename to match).

Actually keeping it clean: Day | Week | Month toggle → map to existing week/month + add a proper day view. Or simpler: keep month/week/agenda and just rename the toggle to match what's built. User said "Day | Week | Month" — I'll implement all three (Day = single day detailed view).

The plan is complete and concrete. Let me present it.
