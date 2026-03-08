
## Two separate issues to fix

---

### Issue 1 — Widgets appear on ALL pages instead of only the current one

**Root cause found:** The `ToolDrawer` correctly receives `pageActiveWidgets` (from `currentPage?.activeWidgets`) and `onTogglePageWidget` (which calls `updatePageWidgets` — a per-page writer). This part is correct.

The bug is the **fallback** on line 561:
```typescript
const pageActiveWidgets: string[] = currentPage?.activeWidgets ?? activeWidgets;
```
When `currentPage?.activeWidgets` is `undefined` (i.e. a newly-created page that has never had its widget list explicitly set), it falls back to the **global** `activeWidgets` from `FocusContext` — which is shared across all pages. So if the user hasn't toggled any widget on a page yet, toggling one writes to the page for the first time — but if default widgets ("clock", "notes", "planner") were active globally, any page with no `activeWidgets` key shows them.

More importantly: when `updatePageWidgets` first writes to a fresh page that had `activeWidgets: undefined`, it correctly sets the array. But new pages created via `addPage()` already set `visibleFolderIds: []` and `visibleDocIds: []` but never set `activeWidgets: []`. The first `onTogglePageWidget` call correctly writes `[id]` to that page. BUT the widgets rendering at line 1311 uses `pageActiveWidgets` which for a brand-new page falls back to global activeWidgets. So previously-active widgets from global appear immediately.

**Fix:** In `addPage()` and `duplicatePage()` already handles this correctly (copies source `activeWidgets`). The issue is the initial default pages. The fix is:
1. Change the fallback so new pages default to an **empty array** instead of inheriting global widgets. Change line 561: `const pageActiveWidgets: string[] = currentPage?.activeWidgets ?? [];`
2. For the very first/only page (migration case), keep backward compat by detecting if it's the only page and has never been saved.

Actually the cleanest fix: Change `pageActiveWidgets` fallback from `?? activeWidgets` to `?? []`. This means brand-new pages start empty. The initial "Home" page from localStorage already has `activeWidgets` set from prior sessions, so existing users won't be broken.

**File:** `src/components/focus/FocusDashboardView.tsx` — line 561

---

### Issue 2 — iPadOS Window Management Engine

This is a large feature. Based on the codebase:
- `WorkspaceContext` already exists with a simple `panels[0|1]` array model
- `MultitaskingView` renders a split-view using `react-resizable-panels`
- The existing system is document-only and limited to 2 panels

**Architecture:**

#### New file: `src/context/WindowManagerContext.tsx`
Zustand-style React context (no extra lib, use existing `useState`) with the interface:
```typescript
interface AppWindow {
  id: string;
  type: 'document' | 'widget';
  contentId: string;
  title: string;
  layout: 'floating' | 'fullscreen' | 'split-left' | 'split-right';
  zIndex: number;
  position: { x: number; y: number };
}
```
Actions: `openWindow`, `closeWindow`, `setWindowLayout`, `updateWindowPosition`, `bringToFront`

#### New file: `src/components/windows/WindowFrame.tsx`
- `motion.div` wrapper component
- `useMemo` for Tailwind classes by layout
- Drag enabled only when `layout === 'floating'` via plain pointer events (same pattern as DraggableWidget — avoids framer-motion drag + layout animation conflict)
- `onPointerDownCapture` → `bringToFront`
- Top-center pill: `absolute top-2 left-1/2 -translate-x-1/2`
- Pill opens a `DropdownMenu` (Radix, already installed) with 4 layout options
- X close button: `absolute top-3 right-3`
- `select-none` on frame, `select-text pointer-events-auto` on content wrapper

#### Integration points:
- `FocusDashboardView` — add `<WindowManagerProvider>` and render `<WindowFrame>` elements for each open window over the canvas
- Keep existing `MultitaskingView` / `WorkspaceContext` as-is for the Index page — this new engine is Focus-mode only
- `DesktopDocument` and `DesktopFolder` — add option to open in a WindowFrame instead of the existing `setOpenDesktopDoc` / `setOpenFolderId` modals

**Layout class map:**
```
floating:    absolute w-[800px] h-[600px] rounded-2xl shadow-2xl
fullscreen:  absolute inset-4 rounded-2xl shadow-2xl
split-left:  absolute top-4 left-4 bottom-4 w-[calc(50%-1rem)] rounded-2xl shadow-2xl
split-right: absolute top-4 right-4 bottom-4 w-[calc(50%-1rem)] rounded-2xl shadow-2xl
```
Base aesthetic: `bg-slate-900/90 backdrop-blur-2xl border border-white/10 overflow-hidden flex flex-col`

**Files to create/modify:**
1. `src/context/WindowManagerContext.tsx` — new file, full window state engine
2. `src/components/windows/WindowFrame.tsx` — new file, the window chrome component
3. `src/components/focus/FocusDashboardView.tsx` — wrap with provider, render windows layer above canvas, wire `DesktopDocument` open → `openWindow`
4. `src/App.tsx` — add `<WindowManagerProvider>` wrapper

**Drag conflict resolution:**
- The `WindowFrame` drag uses the same pointer-events pattern as `DraggableWidget` (no framer-motion `drag` prop — it causes z-index stacking context issues). Manual `pointerdown/pointermove/pointerup` on the pill handle only.
- `select-none` on the frame drag handle, `select-text` on content.

**Order of implementation:**
1. Fix widget pagination bug (1 line change)
2. Create `WindowManagerContext`
3. Create `WindowFrame` component
4. Wire into `FocusDashboardView`
5. Add provider to `App.tsx`
