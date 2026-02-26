
## Understanding the request

The user wants:
1. **Today's Plan (Scheduler) always stays in sync with Full Calendar** — both views read from the same `scheduleBlocks` data source (they already do via FluxContext), but the issue is the Full Calendar doesn't show the AI-planned blocks in the same rich way and the Scheduler doesn't automatically pick up tasks that have a `scheduled_date` set for today without an AI plan trigger.
2. **AI automatically adds todos/tasks in the correct order that makes sense** — currently the Sparkles (✦) button is manual-only. The user wants an automatic trigger (on load / when tasks exist without a plan for today) so the AI generates an ordered daily plan without needing to press the button every day.

## Current sync situation

Both `Scheduler` and `FullCalendarView` read from `scheduleBlocks` and `tasks` via `useFlux()` (FluxContext) which is a shared context backed by Supabase. So data is already in sync — the same rows power both views.

**The real gaps:**
1. No auto-trigger of the AI plan — user has to manually press ✦ every day
2. The AI plan only includes tasks passed to it — it currently filters `!t.done` but doesn't send `scheduled_date` context to the AI, so AI can't distinguish "already scheduled" from "needs scheduling"
3. No deduplication: re-running AI plan `replaceBlocksForDate` wipes and regenerates — good, but auto-trigger must be smart enough not to re-plan if blocks already exist for today
4. The `handlePlan` in the edge function has `ONLY use items from the provided list. NEVER invent tasks` — correct but we should also pass `scheduled_date` to guide ordering

## Plan

### 1. `src/components/Scheduler.tsx` — Auto-trigger AI plan on mount
- Add a `useEffect` that fires once when the component mounts for today
- Condition: only auto-plan if today has **0 schedule blocks** AND there are **undone tasks**
- Add a small "Auto-planning your day..." toast to inform the user
- This replaces the need to manually press ✦ every morning

### 2. `src/components/Scheduler.tsx` — Improve task data sent to AI
- Pass `scheduled_date` field to the AI context so it knows which tasks the user already explicitly scheduled for today
- Sort/prioritize tasks in the payload: tasks with `scheduled_date = today` first, then by `priority` (high → medium → low), then by `due_date`
- Also pass `due_date` so AI can reason about urgency

### 3. `supabase/functions/flux-ai/index.ts` — Improve `handlePlan` system prompt
- Add instruction: tasks with `scheduled_date` set to today must appear first in the schedule
- Add instruction: tasks with `due_date = today` are urgent and should be scheduled before 12:00
- Add instruction: respect priority order — high priority = morning, medium = midday, low = afternoon
- This ensures the generated order is logical and matches user expectations

### 4. `src/pages/FullCalendarView.tsx` — Ensure full sync visual
- The Full Calendar already reads from the same `scheduleBlocks` — no data sync issue
- But it currently shows blocks with minimal info — ensure `task_id` linked blocks show the task's priority badge/color so it visually matches what the Scheduler shows
- Add a small refresh indicator when `scheduleBlocks` update (already reactive via context)

## Files to change

1. `src/components/Scheduler.tsx` — auto-plan trigger + smarter task payload
2. `supabase/functions/flux-ai/index.ts` — improved `handlePlan` prompt with ordering rules
3. `src/pages/FullCalendarView.tsx` — show task priority color on linked blocks for visual parity
