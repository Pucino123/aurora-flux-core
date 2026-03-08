
## Update Landing Page Marquee Features

### Current state
Row 1 (8 items): Personal Dashboard, AI Task Manager, The Council, Focus Mode, Smart Calendar, Finance Tracker, Soundscapes, Quick Capture

Row 2 (8 items): Documents, Team Chat, Goals, Routines, Neural View, Analytics, Kanban Board, AI Scheduler

### Missing features (from actual codebase)
The app has these views/features not yet in the marquee:
- **CRM** — full CRM with contacts, deals & invoices (`CRMPage`)
- **Community Board** — community space (`CommunityBoardView`)
- **Multitasking View** — split/multi-panel work (`MultitaskingView`)
- **Projects Overview** — project tracking (`ProjectsOverview`)
- **Ask Aura** — AI assistant chat (`AskAura`)
- **Fitness Tracker** — workouts & health (`FitnessTracker`)
- **Mood Tracker** — wellbeing tracking (`MoodTracker`)
- **Budget Tracker** — budget/savings widgets (`BudgetWidget`)
- **Collaboration** — team collab hub (`CommHub`)
- **Brain Tree** — mind mapping (`BrainTree`)

### Plan

Update `FEATURES_ROW1` and `FEATURES_ROW2` in `src/components/LandingPage.tsx` to expand from 8 items each to ~12 items each, adding the missing features. Also add the matching icons to the existing import line.

**New Row 1** (~12 items):
Personal Dashboard, AI Task Manager, The Council, Focus Mode, Smart Calendar, Finance Tracker, Soundscapes, Quick Capture, CRM, Projects, Fitness Tracker, Mood Tracker

**New Row 2** (~12 items):
Documents, Team Chat, Goals, Routines, Neural View, Analytics, Kanban Board, AI Scheduler, Ask Aura, Community, Multitasking, Brain Tree

### Files to change
1. `src/components/LandingPage.tsx` — expand both `FEATURES_ROW1` and `FEATURES_ROW2` arrays + add missing icon imports
