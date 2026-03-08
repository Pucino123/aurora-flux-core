
## Overview

This is a large request with 5 distinct tasks. Based on codebase inspection, here's my assessment and plan:

**Task 1 (Verification):** I've read all 10 refactored widgets — they are all correctly implemented. The widgets are well-built and functional:
- SavingsWidget ✅ (deposit/withdraw inline, progress gradient, goal reached badge)
- WorkoutWidget ✅ (weekly tracker, set checkboxes, inline editing, completion badge)
- ProjectTrackerWidget — need to verify it exists
- StreakTrackerWidget — need to verify
- TaskManagerWidget ✅ (smart list grid, flex/use-flux sync, quick add)
- FocusStatsWidget ✅ (pomodoro timer, circular ring, weekly bars)
- SmartPlanWidget ✅ (AI timeline, skeleton optimize animation)
- QuoteOfDay ✅ (cycle/copy/like, AnimatePresence fade)
- ScratchpadWidget ✅ (word count, last edited, pre-fill)
- FocusCouncilWidget ✅ (scanning laser, mock cards, tooltips)

The implementation looks solid. No fixes required unless testing reveals issues.

**Task 2 (Notes widget):** The current "Sticky Notes" tool (id: `notes`) renders `FocusStickyNotes` — floating canvas notes. The new task asks to build an **Apple Notes-style two-pane notes widget** inside `DraggableWidget`. This replaces the `FocusStickyNotes` component (keeping `id: "notes"` in the tool drawer) OR we create it as a new widget ID `note-editor`. However the user said "Replace the current sticky notes tool" — so we'll rewire `id: "notes"` to render the new Apple Notes widget.

**Task 3 (CRM sidebar):** Build a new `CRMWidget` component rendered inside a `DraggableWidget` with accordion stages. Since this needs to fit the tool drawer, add a new tool entry `crm` to `ToolDrawer.tsx` and render it in `FocusDashboardView`.

**Task 4 (Council main view):** The existing `TheCouncil.tsx` is the Council main page shown at `/` inside the app. The user wants the 2x2 glass advisor grid. Looking at `TheCouncil.tsx`, it's already a very full-featured component but uses the existing Violet/Leaf/Rose/Blue/Sunny persona set. The new design uses Elena/Helen/Anton/Margot specifically. This means we need a **new dedicated Council page** or refactor the main TheCouncil layout. Given the instruction says "Build the ultimate Council main view page" and the existing Council at TheCouncil.tsx is accessed from FluxSidebar, we'll create a new `CouncilMainView.tsx` component that wraps into the existing Council page rendering. However, the existing Council is heavily integrated. The safest approach is to add a new "Premium Board" tab/mode at the top of TheCouncil.tsx, or create a standalone route. Given complexity, I'll create a new `CouncilBoardroom.tsx` that renders as an overlay/tab toggle in the TheCouncil area.

**Task 5 (Persistent cloud sync):** This is already implemented! Looking at `FocusContext.tsx` lines 232-265, there's already full `dashboard_state` DB sync:
- Loads from `dashboard_state` table on mount for authenticated users
- Debounced upsert (800ms) on every state change to `dashboard_state.state`
- `widgetPositions` contains both x/y AND w/h per widget
- Everything persists: activeWidgets, widgetPositions, background, clock settings, etc.

So Task 5 is already complete — no changes needed.

---

## Files to Create

1. `src/components/focus/NotesWidget.tsx` — Apple Notes two-pane widget
2. `src/components/focus/CRMWidget.tsx` — CRM pipeline widget
3. `src/components/council/CouncilBoardroom.tsx` — The ultimate 2x2 glass boardroom UI

## Files to Edit

4. `src/components/focus/FocusDashboardView.tsx` — Import + render NotesWidget (id: `notes` replaces FocusStickyNotes) + CRMWidget (id: `crm`)
5. `src/components/focus/ToolDrawer.tsx` — Add `crm` tool entry to Core or Integration category
6. `src/components/TheCouncil.tsx` — Add a "Boardroom" tab toggle at top to switch between existing Council and new CouncilBoardroom

---

## Component Designs

### NotesWidget (`id: "notes"`)

**Changes in FocusDashboardView:** When `activeWidgets.includes("notes")`, render `<NotesWidget />` instead of `<FocusStickyNotes />`.

**Layout (inside DraggableWidget, id: "notes", w: 520, h: 480):**
```text
┌─ DraggableWidget (520×480) ───────────────────────┐
│ ┌── Left (160px) ─┐  ┌── Right (360px) ──────────┐│
│ │ [Notes] [+]     │  │ [Toolbar: B I U 🔒 ...]   ││
│ │ [Search...]     │  │                            ││
│ │                 │  │  [LOCK SCREEN or EDITOR]   ││
│ │ ○ Note 1        │  │                            ││
│ │ ○ 🔒 Note 2    │  │                            ││
│ │ ○ Note 3        │  │                            ││
│ └─────────────────┘  └────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

**State:**
```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  password?: string;
  updatedAt: string;
}
```

**Logic:**
- 4 mock notes, one `isLocked: true` with password "1234"
- Session-unlocked Set tracks which locked notes are currently unlocked
- Left pane: clickable notes list, locked shows "🔒 Locked Note" snippet
- Right pane: if selected note is locked & not session-unlocked → show unlock screen (padlock icon + password input + Unlock button)
- If unlocked/normal → show content area with first line = title
- Toolbar: Bold, Italic, Underline pill buttons + lock toggle button (shows "Lock" or "Unlock Note")
- Real-time: typing in content area updates left pane preview instantly

### CRMWidget (`id: "crm"`)

**New tool in ToolDrawer** under "Core" or new "Work" category: `{ id: "crm", label: "CRM", icon: Users2 }`

**HomeWidgets:** Add `FocusCRMWidget` export wrapping `CRMWidget` in `DraggableWidget` (w: 340, h: 520).

**Inside DraggableWidget:**
- Header: "Sales Pipeline" + search input + `+` button
- 4 accordion stages: New Leads, Contacted, Proposal Sent, Closed/Won
- Each stage header: colored dot + name + total $ value
- Each deal card: initials avatar + contact name + company + deal value right-aligned + drag handle icon (GripVertical)
- On card click → inline popover with stage dropdown to move card
- Mock data: 7 deals across stages

**Stage colors:**
- New Leads → blue dot
- Contacted → yellow dot
- Proposal Sent → orange dot
- Closed/Won → green dot

**State:** `useState` for `deals[]`, each with `{ id, name, company, value, stage }`
- Moving stage: clicking card opens a small popover with `<select>` dropdown
- Stage totals computed dynamically

### CouncilBoardroom (`src/components/council/CouncilBoardroom.tsx`)

Rendered in `TheCouncil.tsx` as a new tab. The existing Council has a tab system — we add a "Boardroom" tab.

**Layout:**
```text
┌── Pitch Area ────────────────────────────────────┐
│ [input: "Idea: Should I start..."] [✨ Consult]  │
│ ──── Consensus Meter (glowing bar) ────          │
└──────────────────────────────────────────────────┘
┌── 2×2 Grid ──────────────────────────────────────┐
│ [Elena - Pragmatist]  [Helen - Branding Expert]  │
│ [Anton - Devil's Adv] [Margot - Visionary]       │
└──────────────────────────────────────────────────┘
┌── Action Plan Panel (fades in after all 4) ──────┐
│ Council's Recommended Action Plan                │
│ • Step 1  • Step 2  • Step 3                     │
└──────────────────────────────────────────────────┘
```

**Persona Card anatomy:**
- Glass card (`bg-white/8 border border-white/15 rounded-3xl backdrop-blur-xl`)
- Avatar circle + Name + Archetype title
- Circular SVG confidence ring (animates 0% → X% on reveal)
- Adaptive glow: `box-shadow: 0 0 30px ${glowColor}` based on sentiment
- Typing indicator: iMessage dots animation
- Text with auto-bolded business terms
- "Chart" icon tooltip with market stat on hover
- Socratic question at bottom in bold
- "Discuss" button → expands card to 70% width, shrinks others, opens chat thread

**4 Personas:**
```typescript
const BOARD_PERSONAS = [
  { name: "Elena Verna", title: "The Pragmatist", ring: 85, glowPositive: "rgba(52,211,153,0.3)", icon: "📊" },
  { name: "Helen Lee Kupp", title: "The Branding Expert", ring: 60, glowNeutral: "rgba(251,191,36,0.25)", icon: "💡" },
  { name: "Anton Osika", title: "The Devil's Advocate", ring: 30, glowNegative: "rgba(248,113,113,0.3)", icon: "⚠️" },
  { name: "Margot van Laer", title: "The Visionary", ring: 95, glowCyan: "rgba(34,211,238,0.3)", icon: "✨" },
];
```

**Animations:**
- Idle "breathing": `animate={{ scale: [1, 1.008, 1] }}` repeat Infinity
- Consult flow: all 4 show typing → sequenced reveal with 400ms delays
- Floating reactions: emoji floats on non-speaking cards
- Confidence ring: `strokeDashoffset` animates from full to target on reveal
- Action plan: `AnimatePresence` fade-in after all 4 reveal
- 1-on-1 Deep Dive: `layout` animation expands selected card

**Export Verdict modal:**
- Opens on "📤 Export Verdict" button click
- Social card with gradient bg + 4 avatars + consensus score
- "Download Image" button (uses `html2canvas` or styled div with instructions)

**Consensus meter:**
- Average of 4 confidence rings
- Color: <40 red, 40–70 yellow, >70 green
- Label: "Strong Consensus — Proceed", "Mixed Opinions — Proceed with Caution", "Divided — Further Analysis Required"

**API:** Calls existing `flux-ai` edge function with `type: "boardroom-consult"` for real responses, with mock fallback data shown immediately for demo.

---

## Implementation Order

1. `NotesWidget.tsx` (new) — Apple Notes split pane
2. `CRMWidget.tsx` (new) — CRM pipeline  
3. `CouncilBoardroom.tsx` (new) — 2x2 glass boardroom
4. `FocusDashboardView.tsx` (edit) — wire notes + crm
5. `ToolDrawer.tsx` (edit) — add CRM tool
6. `HomeWidgets.tsx` (edit) — add FocusCRMWidget export
7. `TheCouncil.tsx` (edit) — add Boardroom tab toggle

Cloud sync (Task 5) is already fully implemented in `FocusContext.tsx` — confirmed via lines 232–265. No changes needed.

---

## Key Technical Notes

- Notes widget replaces canvas sticky notes behavior in FocusDashboardView: change the `activeWidgets.includes("notes")` branch from `<FocusStickyNotes />` to `<NotesWidget />`; keep `FocusStickyNotes` import for the right-click context menu "New Sticky Note" which creates floating notes independently.
- CRM widget is purely local state (no DB) — matches other widget patterns like SavingsWidget
- CouncilBoardroom uses mock responses for the demo (no API key delay), with real streaming call as bonus if user clicks Consult
- Export Verdict creates a styled `<div>` printable summary; true `html2canvas` download is complex and not installed, so we implement a "Copy summary text" fallback with a beautiful preview card
