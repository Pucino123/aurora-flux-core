
This is a large multi-feature request. I'll scope each task clearly, identify what already exists, and plan the minimal-correct implementation for each.

## What already exists
- **Dashboard**: `Canvas` → `InboxView` (when no folder) or `ProjectBoard`/`FitnessTracker`. The "home" view uses `FocusDashboardView`. `GridDashboard` handles the widget grid with `react-grid-layout`.
- **Inbox**: `InboxView` has Tasks/Mail/Chat tabs already (basic). `TeamChatView` and `EmailListView` exist.
- **Sidebar**: `FluxSidebar` with `NotificationBell` in the header — the bell is already present and has a working dropdown from previous work.
- **Landing**: `LandingPage.tsx` has hero, video, marquee, CTA, and a footer.
- **DnD**: `@dnd-kit/core` and `@dnd-kit/sortable` are already installed.

## TASK 1: iOS-style Multi-Page Dashboard

**What to build**: Replace `GridDashboard` (the home widget grid, shown when `activeView === "canvas"` or when `Canvas` renders) with a new `MultiPageDashboard` component.

**Architecture**:
- State: `pages: Page[]` where `Page = { id, name, widgets: string[] }`, stored in `useDashboardConfig` (localStorage-backed hook already exists)
- `currentPage: number` state
- Pagination dots row + `+` button
- Arrow key listener with INPUT/TEXTAREA guard
- Drag-to-hover-dot page switch (500ms timer on dot hover)
- Framer-motion `AnimatePresence` with `x` slide direction for page transitions
- Widgets are the existing `WIDGET_REGISTRY` items rendered in a responsive CSS grid (not react-grid-layout, which is already used for customization — we keep it but wrap per-page)

**Init data**: Page 1 = `['smart-plan', 'today-todo', 'budget-preview', 'savings-ring']`, Page 2 = `['top-tasks', 'project-status', 'gamification', 'recent-notes']`

**Files to change**:
- `src/components/GridDashboard.tsx` — refactor to add pagination wrapper
- `src/hooks/useDashboardConfig.ts` — add `pages` field to config

## TASK 2: Inbox Redesign

**What to fix**:
1. Remove any floating overlapping input (check `TeamChatView`)
2. Rename labels to English
3. iOS Segmented Control tab bar
4. Split-pane layout (30% list / 70% detail)
5. Tasks tab uses global `useFlux` tasks (already does)
6. Mail tab: Google/Outlook icons + "Connect your Inbox" onboarding state
7. Chat tab: team list left / thread right — ONE input at bottom

**Files to change**:
- `src/components/InboxView.tsx` — full redesign
- `src/components/inbox/TeamChatView.tsx` — check for rogue input
- `src/components/inbox/EmailListView.tsx` — redesign with split pane

## TASK 3: Split-View Multitasking Workspace

**What to build**: A new `MultitaskingView` component using `react-resizable-panels` (already installed).

- Register as `activeView === "multitask"` in `Dashboard.tsx`
- Add "Workspace" nav item in `FluxSidebar.tsx`
- Empty state: centered glassmorphism placeholder
- 1 panel: full width
- 2 panels: `PanelGroup` with `Panel` left + `ResizableHandle` + `Panel` right
- Each panel: glass window header (file type icon, filename, red close dot)
- Drag-to-open: HTML5 drag from `BrainTree` sidebar items → drop zones
- Window swap: drag panel header to other side

**Files to change/create**:
- `src/components/MultitaskingView.tsx` — new
- `src/components/FluxSidebar.tsx` — add nav item
- `src/components/Dashboard.tsx` — add `multitask` branch
- `src/components/BrainTree.tsx` — add `draggable` attribute to folder/doc items

## TASK 4: Architecture Optimization

Strict scope (under-the-hood only, no visual changes):
1. `useDebounce` hook — 800ms debounce for AI inputs
2. Prompt caching — sessionStorage + SHA-like hash
3. Token limits in edge function system prompts
4. `react-helmet-async` SEO wrapper (install + implement)
5. Lazy loading for heavy components with glassmorphism skeleton
6. `React.memo` + `useCallback` on drag handlers

**Files to change**:
- `src/hooks/useDebounce.ts` — new
- `src/lib/promptCache.ts` — new
- `src/components/SEO.tsx` — new
- `src/App.tsx` — wrap with `HelmetProvider`
- `src/pages/Index.tsx` — add SEO tags
- Heavy lazy-loaded components in `Dashboard.tsx`

## TASK 5: Monetization Engine

**What to build**: Global plan/sparks state + billing UI + feature gating.

- `src/context/MonetizationContext.tsx` — `userPlan`, `sparksBalance`, `hasBYOK`, `consumeSparks()`
- `src/components/billing/BillingView.tsx` — 2-tab pricing + spark store
- `src/components/billing/UpgradeModal.tsx`
- `src/components/billing/OutOfSparksModal.tsx`
- `src/components/billing/CheckoutOverlay.tsx` — simulated Apple Pay UI
- Sparks balance pill in sidebar header
- Gate Split-View and Mail tab behind Pro plan

**Files to change**:
- `src/App.tsx` — wrap with `MonetizationProvider`
- `src/components/FluxSidebar.tsx` — sparks pill
- `src/components/Dashboard.tsx` — billing view branch
- `src/components/InboxView.tsx` — gate Mail tab

## TASK 6: Security Hardening

Strictly code-level (RLS already exists per schema). Focus on:
1. Session timeout (2h inactivity) in `useAuth`
2. Input sanitization with DOMPurify for user-generated content
3. Rate limiting in edge function (`flux-ai/index.ts`)
4. BYOK key masking in settings
5. Destructive action confirmation pattern
6. Generic error messages

**Files to change**:
- `src/hooks/useAuth.tsx` — session timeout
- `supabase/functions/flux-ai/index.ts` — rate limit + prompt hardening + max_tokens
- `src/components/SettingsView.tsx` — BYOK masking

## TASK 7: Onboarding Flow

- Trigger once via `localStorage` `flux_onboarding_v1`
- Welcome modal → 3-step spotlight tour → Confetti celebration + 50 Sparks credit
- Spotlight: darken background, CSS `ring-4 ring-white/50` on target elements
- Uses `MonetizationContext.addSparks(50)`

**Files to create**:
- `src/components/onboarding/OnboardingFlow.tsx`
- `src/components/onboarding/SpotlightOverlay.tsx`

## TASK 8: Landing Page Additions (APPEND ONLY)

Inject 3 new sections just above `<footer>` in `LandingPage.tsx`:
1. Bento Box grid (4 asymmetric cards)
2. Security trust banner (lock icon + 3 checkmarks)
3. Pricing teaser + final CTA

## TASK 9: Notification Bell (already implemented)

The bell is already built in `NotificationBell.tsx` from previous messages and is already placed in the sidebar header. It needs the unread pulsing dot to be verified and mock data added if not present.

## TASK 10: Community Board

- New view `CommunityBoardView.tsx` with Pinterest-style grid
- Empty slot (dashed, claim), pending slot (blurred), active slot (thumbnail + hover overlay)
- Checkout simulation modal
- Setup modal (project name, URL, image upload)
- Admin mode toggle with approval queue
- Add "Community Board" nav item to sidebar
- Store state in local component state + Supabase `community_slots` table (new migration)

---

## Implementation Order

Given the size, I'll implement all tasks in parallel across files, grouping related changes:

**Group A** (Dashboard + Inbox + Multitasking):
- `GridDashboard.tsx` → iOS pagination
- `InboxView.tsx` → split pane redesign
- `MultitaskingView.tsx` → new
- `Dashboard.tsx` → add multitask branch

**Group B** (Global Systems: Monetization + Onboarding):
- `MonetizationContext.tsx` → new
- `BillingView.tsx` + modals → new
- `OnboardingFlow.tsx` → new

**Group C** (Optimization + Security):
- `useDebounce.ts`, `promptCache.ts`, `SEO.tsx` → new
- `flux-ai/index.ts` → hardening

**Group D** (Landing + Community Board + Sidebar):
- `LandingPage.tsx` → append sections
- `CommunityBoardView.tsx` → new
- `FluxSidebar.tsx` → add nav items

**Group E** (Session + Auth):
- `useAuth.tsx` → session timeout

---

## Technical Details

**iOS Pagination** (`GridDashboard.tsx`):
```text
pages array in useDashboardConfig
  └─ currentPage index (useState)
  └─ direction (1 / -1 for slide)
  └─ ArrowKey listener with input guard
  └─ Dot row: pill for active, circle for inactive
  └─ hoverDotTimer: useRef<NodeJS.Timeout>
  └─ AnimatePresence variants: enter from right (+100%) or left (-100%)
```

**Split-View** (`MultitaskingView.tsx`):
```text
openPanels: [null, null] (max 2)
  └─ PanelGroup horizontal from react-resizable-panels
  └─ Panel with glass window header + close dot
  └─ Drop zones shown when dragging (isDragging state)
  └─ HTML5 onDragOver / onDrop on zones
BrainTree items: draggable=true, onDragStart sets dataTransfer
```

**Monetization**:
```text
MonetizationContext:
  userPlan: 'Starter' | 'Pro' | 'Team'
  sparksBalance: number (localStorage)
  consumeSparks(cost, feature) → boolean
  FloatAnimation: "-X ✨" framer-motion absolute positioned
```

**Onboarding**:
```text
Step 1: dim overlay + welcome modal
Step 2: tour steps with spotlight rings targeting CSS selectors
Step 3: confetti + sparks counter animation
Persisted in localStorage key 'flux_onboarding_done_v1'
```

**Community Board** table:
```sql
create table public.community_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slot_index integer not null,
  status text not null default 'available', -- available | pending | approved
  project_name text,
  website_url text,
  thumbnail_url text,
  created_at timestamptz default now()
);
alter table public.community_slots enable row level security;
-- RLS: anyone can read approved, owners can see own pending
```
