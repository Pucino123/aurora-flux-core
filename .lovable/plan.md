
# Full Replica: Sync with Original flux-dreamscape-os

After comparing every file in the GitHub repo against this project, I found **massive differences**. The original has evolved significantly since the remix was created. Here is a complete inventory of everything that needs to be added or updated.

---

## Summary of Differences

The original repo has **~60+ files** that are either missing or modified compared to this project. The changes span new views, new component directories, new hooks, updated context, and modified core components.

---

## Phase 1: Database Schema Update

The original added an `icon` column to the `folders` table. We need:

- **Add `icon` column** (text, nullable) to the `folders` table

---

## Phase 2: New Context + Hooks (Foundation Layer)

These must be created first since many components depend on them.

### New files to create:
1. **`src/context/FocusContext.tsx`** -- Focus mode state management (widget positions, visibility, backgrounds)
2. **`src/hooks/useDashboardConfig.ts`** -- Dashboard widget configuration hook (activeWidgets, layouts, stickyNotes, widgetNames)
3. **`src/hooks/useDocuments.ts`** -- Documents CRUD hook
4. **`src/hooks/useFolderWidgets.ts`** -- Folder-specific widget config
5. **`src/hooks/useTeamChat.ts`** -- Team chat messaging hook
6. **`src/hooks/useWidgetIntelligence.ts`** -- AI-powered widget suggestions

### Modified files:
7. **`src/context/FluxContext.tsx`** -- Extended `activeView` type to include: `"focus" | "calendar" | "analytics" | "projects" | "documents" | "settings"`. Added `filterPersona` / `setFilterPersona`. Added `icon` field to DbFolder/FolderNode. Updated `createFolder` to accept `icon` param.

---

## Phase 3: New Component Directories

### `src/components/focus/` (24 files -- the Focus/Home view)
This is the biggest new feature -- an OS-like desktop home screen with draggable widgets:

1. `BackgroundEngine.tsx` -- Dynamic background renderer
2. `BreathingWidget.tsx` -- Breathing exercise widget
3. `ClockEditor.tsx` -- Clock customization editor
4. `ClockWidget.tsx` -- Live clock display
5. `CollabMessagesModal.tsx` -- Collaboration messages modal
6. `DesktopFolder.tsx` -- Desktop-style folder icons
7. `DraggableWidget.tsx` -- Draggable widget wrapper
8. `FocusCouncilWidget.tsx` -- Council AI widget on home
9. `FocusDashboardView.tsx` -- Main focus/home view orchestrator
10. `FocusReportModal.tsx` -- Focus session report
11. `FocusStatsWidget.tsx` -- Focus statistics
12. `FocusStickyNotes.tsx` -- Sticky notes on desktop
13. `FocusTimer.tsx` -- Pomodoro/focus timer
14. `FolderContents.tsx` -- Folder content viewer
15. `FolderModal.tsx` -- Folder creation/edit modal
16. `FolderTemplateSelector.tsx` -- Template picker for new folders
17. `HomeWidgets.tsx` -- Widget layout for home screen
18. `MusicWidget.tsx` -- Background music/soundscape player
19. `QuoteOfDay.tsx` -- Daily quote display
20. `ScratchpadWidget.tsx` -- Quick scratchpad
21. `TimeBoxPlanner.tsx` -- Time-boxing planner
22. `TodaysPlanWidget.tsx` -- Today's plan display
23. `ToolDrawer.tsx` -- Bottom tool drawer
24. `WidgetToggleBar.tsx` -- Widget visibility toggles
25. `soundGenerators.ts` -- Audio generation utilities
26. `soundscapeConfig.ts` -- Soundscape configuration

### `src/components/dashboard/` (3 files)
1. `FolderWidgetBar.tsx` -- Folder-specific widget toolbar
2. `PinnedItemsSection.tsx` -- Pinned items section on dashboard
3. `WidgetCard.tsx` -- Reusable widget card wrapper

### `src/components/chat/` (1 file)
1. `TeamChatWidget.tsx` -- Floating team chat widget

### `src/components/council/` (17 files)
1. `CouncilAvatar.tsx` -- Council persona avatar
2. `CouncilAvatar3D.tsx` -- 3D avatar variant
3. `CouncilDashboard.tsx` -- Council overview dashboard
4. `CouncilIdeasList.tsx` -- Ideas list from council
5. `CouncilScene.tsx` -- Council visual scene
6. `CouncilThread.tsx` -- Threaded council conversation
7. `DebateMode.tsx` -- Debate mode between personas
8. `DecisionScoreCard.tsx` -- Decision scoring card
9. `EvolutionTimeline.tsx` -- Persona evolution timeline
10. `ExecutionPipeline.tsx` -- Task execution pipeline
11. `PersonaProfile.tsx` -- Individual persona profile
12. `PersonalityControls.tsx` -- Persona personality sliders
13. `ProactiveIntelligence.tsx` -- Proactive AI suggestions
14. `SimulationPanel.tsx` -- Decision simulation
15. `StickyNote.tsx` -- Sticky note component
16. `TypewriterText.tsx` -- Typewriter text effect
17. `VoteTooltip.tsx` -- Voting tooltip
18. `WeaknessScanner.tsx` -- Weakness analysis

### `src/components/documents/` (contents not fully loaded but referenced)
- Document management components

### `src/components/inbox/` (contents not fully loaded but referenced)
- Inbox management components

---

## Phase 4: New Top-Level Components

1. **`src/components/AnalyticsView.tsx`** -- Analytics dashboard view
2. **`src/components/CalendarView.tsx`** -- Calendar view
3. **`src/components/CreateFolderModal.tsx`** -- Folder creation modal with icon picker + subfolders (includes `suggestIcon` function)
4. **`src/components/DocumentsView.tsx`** -- Documents management view
5. **`src/components/GamificationCard.tsx`** -- Gamification/streak card (exists in remix but needs checking)
6. **`src/components/KanbanBoard.tsx`** -- Kanban board component
7. **`src/components/MoodTracker.tsx`** -- Mood + energy tracking component
8. **`src/components/NotificationBell.tsx`** -- Notification bell in sidebar
9. **`src/components/ProjectsOverview.tsx`** -- Projects overview page
10. **`src/components/SettingsView.tsx`** -- Settings page

---

## Phase 5: New Widget Components

1. **`src/components/widgets/SmartPlanWidget.tsx`** -- AI-powered smart plan widget
2. **`src/components/widgets/DashboardStickyNotes.tsx`** -- Dashboard sticky notes widget
3. **`src/components/widgets/CouncilWidget.tsx`** -- Council mini-widget for dashboard

---

## Phase 6: Modified Core Components

These existing files need significant updates:

1. **`src/components/Dashboard.tsx`** -- Complete rewrite: added FocusDashboardView, CalendarView, AnalyticsView, ProjectsOverview, DocumentsView, SettingsView routing. Added CreateFolderModal, TeamChatWidget, plan submission logic.
2. **`src/components/FluxSidebar.tsx`** -- Added Calendar, Analytics, Projects, Documents, Settings nav items. Added persona filter dots. Added NotificationBell. Added theme toggle. Added `onRequestCreateFolder` prop. User section with avatar.
3. **`src/components/GridDashboard.tsx`** -- Complete rewrite using `useDashboardConfig`, new widgets (SmartPlanWidget, DashboardStickyNotes, CouncilWidget, MoodTracker, GamificationCard), PinnedItemsSection, WidgetCard, editable widget names.
4. **`src/components/MobileNav.tsx`** -- Rewritten with Focus as home, "More" menu with Calendar/Analytics/Projects/Documents/Settings, sticky notes creation.
5. **`src/components/BrainTree.tsx`** -- Updated (changed 5 hours ago)
6. **`src/components/InboxView.tsx`** -- Updated
7. **`src/components/ProjectBoard.tsx`** -- Updated
8. **`src/components/LandingPage.tsx`** -- Updated
9. **`src/pages/Index.tsx`** -- Added pendingPlan/onPlanConsumed flow, theme sync from profile settings
10. **`src/pages/Auth.tsx`** -- Updated

---

## Phase 7: New Pages

1. **`src/pages/Focus.tsx`** -- Dedicated focus mode page

---

## Implementation Strategy

Due to the massive scope (~70+ files to create/modify), this will need to be done in multiple batches:

**Batch 1:** Database migration (add `icon` column) + FluxContext update + new hooks
**Batch 2:** Focus directory components (24 files)
**Batch 3:** Dashboard, council, chat, documents directories
**Batch 4:** Top-level components (views, widgets)
**Batch 5:** Core component updates (Dashboard, FluxSidebar, GridDashboard, MobileNav, etc.)
**Batch 6:** Page updates (Index, Auth, Focus)

Each file will be fetched from the GitHub repo and replicated exactly. This is a large undertaking that will require multiple implementation rounds.

---

## Technical Notes

- The `icon` column needs to be added to the `folders` table via migration
- The `activeView` type expands from 3 values to 9 values
- `filterPersona` state is added to FluxContext
- `useDashboardConfig` hook stores widget layout config (likely in localStorage or profiles.settings)
- The Focus view is essentially an OS desktop metaphor with draggable widgets, folder icons, timer, music, and more
- Team chat uses a dedicated hook and floating widget
- All files need to be read from the GitHub raw URLs and replicated exactly
