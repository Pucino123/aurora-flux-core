
## Summary of all 7 tasks and my implementation plan

### Task 1: Fix Pagination Dots (INVISIBLE)

**Root cause identified**: The dots ARE rendering in `GridDashboard.tsx` at line 509–573. They live inside `<div className="shrink-0 flex items-center justify-center gap-2 py-3 border-t border-border/20">` at the very bottom of a `flex-1 flex flex-col min-h-0 overflow-hidden` container. The problem is that the GridDashboard is rendered inside `Canvas.tsx`, which may have `overflow-hidden` clipping it, and the overall container in `Dashboard.tsx` uses `flex-1 flex flex-col min-h-screen` — the dots get pushed off screen or clipped.

**Fix**: Replace the in-flow bottom bar dots with a `fixed` positioned pill component that renders as a portal or at root level in `Dashboard.tsx`, completely outside the scroll containers. Place it directly in `Dashboard.tsx` alongside `<CommHub />` and other root-level elements. Use `z-[9999]` and `fixed bottom-28 left-1/2 -translate-x-1/2`.

Changes:
- `src/components/GridDashboard.tsx`: Remove the in-flow pagination bar from lines 509–573. Export a `usePaginationState` hook or lift state up so Dashboard can access `pages`, `currentPage`, `goToPage`.
- `src/components/Dashboard.tsx`: Conditionally render a `<PaginationPill>` component when `effectiveView === "canvas"` (or wherever GridDashboard shows).

**Simpler approach**: Keep state in GridDashboard but render the dots via `createPortal(document.body)` from within GridDashboard itself, with `fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999]`. This avoids prop drilling.

### Task 2: CRM Contact Email/Phone + Invoice Payment Details

**CRM Form** (`src/pages/CRMPage.tsx` — `DealForm`):
- Add `email` and `phone` fields to the form state
- Pass them through `onSave` → `addDeal` / `updateDeal`
- Show email/phone in the table row (replace or add a column)

**CRMContext** (`src/context/CRMContext.tsx`):
- `CRMContact` already has `email?: string` and `phone?: string` — they just aren't captured in the form

**Invoice Payment Details** (`src/components/crm/InvoiceModal.tsx`):
- Add state: `paymentDetails` (bankName, iban, swift)
- Add a "Payment Instructions" section in the left editor column
- Add a "Save as default" checkbox that persists to localStorage
- Render in the right A4 preview as a shaded footer box

### Task 3: Fix Sparks Exit Strategy

**Issue**: `SparksCheckoutModal` already has a close button and backdrop click. But the `OutOfSparksModal` / any inline Sparks panel opened via sidebar click (`openBilling` → sets `billingOpen` → routes to `BillingView`) has no dedicated modal close — user must navigate away.

**The real issue**: Clicking the Sparks balance in the sidebar calls `openBilling()` which sets `billingOpen: true`, which makes `effectiveView` become `"billing"`, routing to `BillingView` (a full page). There's no easy close button because it's a full routed view.

**Fix**: Add a close/back button to `BillingView` that calls `closeBilling()`. Also wrap `SparksCheckoutModal` with an Escape key listener.

Changes:
- `src/components/billing/BillingView.tsx`: Add an `X` button at the top that calls `closeBilling()` from `useMonetization()`
- `src/components/billing/SparksCheckoutModal.tsx`: Add `useEffect` for `Escape` key
- `src/context/MonetizationContext.tsx`: Already has `closeBilling` — just needs to be wired in the UI

### Task 4: Global Notification System

**Already implemented** in `src/components/NotificationBell.tsx`! The bell has: unread indicator, dropdown with mark-all-read, delete individual, localStorage persistence, and overdue task triggers.

**Gap**: Need to wire `pushNotification()` into:
- Task creation in `FluxContext` → push `"general"` notification
- Invoice send in `InvoiceModal` → push `"general"` notification

Changes:
- `src/components/crm/InvoiceModal.tsx`: Import `pushNotification` and call it on send success
- `src/context/FluxContext.tsx`: In `createTask`, call `pushNotification` after inserting

### Task 5: Power-User Feature Expansion (Kanban, CRM Pipeline, Calendar Timeblocking, Slash Commands)

This is the largest task. Breaking into parts:

**a) Tasks Kanban** (`src/pages/AITaskManager.tsx`):
- Add a "Board/List" toggle tab
- Board view: 3-column layout (Todo / In Progress / Done)
- Use `@dnd-kit/core` and `@dnd-kit/sortable` (already installed) for drag-and-drop
- Dragging updates `task.status` via `updateTask()`

**b) CRM Pipeline View** (`src/pages/CRMPage.tsx`):
- Add "Table/Pipeline" view toggle  
- Pipeline view: 4-column Kanban by `stage`
- Use `@dnd-kit` drag-and-drop to move deals between stage columns
- Show "Total Value" per column header

**c) Document Slash Commands** (`src/components/documents/DocumentView.tsx` / TextEditor):
- Listen for `/` keydown in the editor
- Show a floating popover with H1, H2, Bullet, Ask Aura options
- Arrow key navigation, Enter to select, Escape to close

**d) Calendar Timeblocking** (`src/pages/FullCalendarView.tsx`):
- Add collapsible right drawer for "Unscheduled Tasks"
- Drag task from drawer → time slot creates a calendar block

### Task 6: The Council Redesign

**File**: `src/components/council/CouncilBoardroom.tsx` (1871 lines)

Changes:
- Wrap the page in `min-h-screen bg-slate-950 relative overflow-hidden`
- Add 3 ambient orb `<div>`s (emerald top-left, violet bottom-right, cyan center)
- Force all cards to `bg-slate-900/40 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-2xl`
- Override persona card backgrounds and text colors with slate palette

### Task 7: Remove Onboarding Accent/Color Step

**File**: `src/components/onboarding/OnboardingFlow.tsx`

Changes:
- Remove the `"accent"` phase entirely
- Remove `ACCENTS` array, `selectedAccent` state
- Change `"systems"` button from `setPhase("accent")` → `setPhase("reward")`
- Remove `{phase === "accent" && ...}` block
- Update `type Phase` to remove `"accent"`
- Keep default emerald theme (no CSS variable override needed since it's already the default)

---

## File change list

| File | Change |
|---|---|
| `src/components/GridDashboard.tsx` | Replace in-flow dots with `createPortal` fixed pill at z-9999 |
| `src/pages/CRMPage.tsx` | Add email/phone fields to DealForm; add Pipeline kanban view |
| `src/components/crm/InvoiceModal.tsx` | Add payment instructions editor + preview; push notification on send |
| `src/context/CRMContext.tsx` | Ensure email/phone flow through addDeal/updateDeal |
| `src/components/billing/BillingView.tsx` | Add X close button calling closeBilling() |
| `src/components/billing/SparksCheckoutModal.tsx` | Add Escape key listener |
| `src/context/FluxContext.tsx` | Call pushNotification on createTask |
| `src/pages/AITaskManager.tsx` | Add Board/List toggle + dnd-kit Kanban |
| `src/components/council/CouncilBoardroom.tsx` | Full bg redesign: ambient orbs + glass cards |
| `src/components/onboarding/OnboardingFlow.tsx` | Remove accent step, wire systems → reward directly |
