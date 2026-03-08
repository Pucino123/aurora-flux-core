
## Refactoring 10 Widget Components

### Architecture Overview

Each widget is a **self-contained component** wrapped in `DraggableWidget`. The `DraggableWidget` wrapper already provides the global "style" button (Settings2 icon in build mode), close (X), and drag handle — these must be preserved by keeping the `DraggableWidget` wrapper intact. New content lives **inside** it.

The affected files and their mapping:

```text
Widget ID          Current Component                  New Component (to replace content)
-----------        ----------------------------       ------------------------------------
savings-ring       FinanceWidget.tsx SavingsRingWidget → replace with full SavingsWidget.tsx
weekly-workout     FitnessWidget.tsx WeeklyWorkout    → replace with full WorkoutWidget.tsx
project-status     ProductivityWidget.tsx ProjectStatus → replace with ProjectTrackerWidget.tsx
stats              FocusStatsWidget.tsx               → full rewrite (keep DraggableWidget wrapper)
smart-plan         SmartPlanWidget.tsx                → full rewrite
gamification       GamificationCard.tsx               → replace with StreakTrackerWidget.tsx
top-tasks          ProductivityWidget.tsx Top5Tasks   → replace with TaskManagerWidget.tsx
quote              QuoteOfDay.tsx                     → full rewrite
scratchpad         ScratchpadWidget.tsx               → full rewrite (keep DraggableWidget wrapper)
council            FocusCouncilWidget.tsx             → full rewrite (keep DraggableWidget wrapper)
```

### Files to Create

1. `src/components/widgets/SavingsWidget.tsx` — full savings goal tracker (mock data, deposit/withdraw inline, progress gradient)
2. `src/components/widgets/WorkoutWidget.tsx` — weekly tracker + exercises with set checkboxes
3. `src/components/widgets/ProjectTrackerWidget.tsx` — projects with milestones, expand/collapse
4. `src/components/widgets/StreakTrackerWidget.tsx` — gamified habit tracker with 7-day circles
5. `src/components/widgets/TaskManagerWidget.tsx` — Apple Reminders-style with Smart List grid

### Files to Rewrite

6. `src/components/focus/FocusStatsWidget.tsx` — keep `logFocusMinutes` export, add Pomodoro timer + circular ring + weekly bars
7. `src/components/widgets/SmartPlanWidget.tsx` — AI timeline with mock schedule, optimize animation
8. `src/components/focus/QuoteOfDay.tsx` — keep DraggableWidget, add cycle/copy/like actions
9. `src/components/focus/ScratchpadWidget.tsx` — keep DraggableWidget, add word count footer, pre-filled text
10. `src/components/focus/FocusCouncilWidget.tsx` — new "Live Council" compact widget with mock car-budget data, scanning animation, tooltips

### Files to Update

11. `src/components/widgets/FinanceWidget.tsx` — `SavingsRingWidget` now renders `<SavingsWidget />`
12. `src/components/widgets/FitnessWidget.tsx` — `WeeklyWorkoutWidget` now renders `<WorkoutWidget />`
13. `src/components/widgets/ProductivityWidget.tsx` — `ProjectStatusWidget` → `<ProjectTrackerWidget />`, `Top5TasksWidget` → `<TaskManagerWidget />`
14. `src/components/GamificationCard.tsx` — render `<StreakTrackerWidget />` inside
15. `src/components/focus/HomeWidgets.tsx` — adjust default sizes for new taller widgets

### Key Design Decisions

**Savings (savings-ring, w:300 → w:360, h:480):**
- Local state array of goals with `id, name, current, target`
- Progress bar with gradient: `from-blue-400 to-emerald-400` based on pct
- Inline deposit/withdraw with animated input reveal per card
- "Goal Reached!" badge when pct >= 100 with ring glow

**Workout (weekly-workout, w:340 → w:380, h:480):**
- Local state: weekDays (completed boolean), exercises array with sets[]
- Each set is a circle button with fill animation on click
- All sets done → "Workout Complete!" badge + confetti pulse
- Inline weight/reps editing via click-to-edit cell

**Projects (project-status, w:340 → w:380, h:480):**
- Local state: projects with status, milestones[]
- Filter tabs: All / In Progress / Completed / Delayed
- Accordion expand: shows milestone checkboxes
- Progress auto-recalculates from milestone done count

**Focus Stats (stats, w:300 → w:340, h:440):**
- Keeps `logFocusMinutes` exported function
- Circular SVG progress ring (CSS animation on mount)
- Pomodoro timer: useState for seconds, useInterval countdown
- 7 vertical bars for weekly data (mock data pre-filled)

**Smart Plan (smart-plan, w:380 → w:400, h:480):**
- Local schedule array with time blocks + `isAI` boolean
- "Optimize" button triggers 800ms skeleton then re-sorts + inserts "AI Break"
- Timeline with drag-handle visual (GripVertical icon, no actual drag needed)
- Suggestion chips as quick-action buttons

**Streaks (gamification, w:340 → w:360, h:480):**
- Local habits array with streak count, 7-day boolean array
- "Check In" fills today's circle + increments streak
- Pulse animation on flame icon after check-in
- Best streak highlighted at top with large 🔥 card

**Tasks (top-tasks, w:340 → w:380, h:480):**
- Uses existing `useFlux()` tasks + `updateTask` for global sync
- Smart List grid: counts derived from tasks data
- Circular radio checkbox with fill animation
- Inline "New Reminder..." input at bottom

**Quote of Day (quote, w:380 → w:380, h:160):**
- Array of 7 eco/productivity quotes
- `useState` for index, liked state, copied state
- Fade transition via AnimatePresence on quote change
- Copy to clipboard with "Copied!" tooltip

**Scratchpad (scratchpad, keep size):**
- Keep localStorage persistence
- Pre-fill if empty with mock text
- Word/char count footer + "Last edited: X ago"
- Monospace-ish font class

**Council Widget (council, keep w:340, h:380):**
- New "Live Council" with pre-filled mock car-budget analysis
- 4 mini-cards with avatar + colored glow rings
- "Scanning Page Context..." laser-sweep animation on submit
- Clickable bold terms with glass tooltip on hover
- Keeps the real ask-council API call capability

### Default Size Adjustments in HomeWidgets.tsx

```text
savings-ring:   { w: 360, h: 480 }  (was 300×260)
weekly-workout: { w: 380, h: 480 }  (was 340×280)
project-status: { w: 380, h: 480 }  (was 340×280)
stats:          { w: 340, h: 440 }  (was 300×220)
smart-plan:     { w: 400, h: 480 }  (was 380×320)
gamification:   { w: 360, h: 480 }  (was 340×260)
top-tasks:      { w: 380, h: 480 }  (was 340×320)
```

### Style Conventions

All new widgets follow the existing glassmorphism system:
- Text colors: `text-white/80`, `text-white/50`, `text-white/30`
- Backgrounds: `bg-white/5`, `bg-white/10`
- Borders: `border-white/10`
- Transitions via `framer-motion` for state changes
- Scrollbars hidden via `council-hidden-scrollbar` class

### Tasks (Scope Summary)

- 5 new widget files to create
- 5 existing widget files to rewrite
- 5 wrapper/integration files to update
- Total: ~15 file changes
