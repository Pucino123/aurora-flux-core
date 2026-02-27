

## Plan: Dashboard Interactions, UI Standardization, Defaults & Reactive Today's Plan

### 1. Context Menu — Place items at click coordinates
**File:** `src/components/focus/FocusDashboardView.tsx`
- Store the context menu `{x, y}` coordinates when right-clicking.
- Pass these coordinates to `CreateFolderModal` and to `createDocument` so newly created folders/documents spawn at the exact click position.
- For folders: after creation, immediately set `desktopFolderPositions[folder.id] = { x: contextMenu.x, y: contextMenu.y }` in the FocusStore.
- For documents: same pattern with `desktopDocPositions`.
- For sticky notes: use the context menu coordinates instead of random placement.

### 2. Folder Modal — "Create folder" button text
**File:** `src/lib/i18n.ts`, `src/components/CreateFolderModal.tsx`
- Add `"folder.create_button": "Create folder"` to both `da` and `en` dictionaries.
- The button already uses `t("folder.create_button")` — just needs the i18n key defined.

### 3. Standardize all close buttons (red, top-right)
**Files:** All modals/popups across the app (~10 files)
- Define a shared close button style: small circle with `background: #ff5f57`, positioned `absolute top-3 right-3`.
- X icon appears on hover (matching Colab modal pattern).
- Apply to: `CreateFolderModal`, `PlanModal`, `FolderModal`, `DesktopDocumentViewer`, `ToolDrawer`, `ClockEditor`, `WidgetStyleEditor`, `CollabMessagesModal` (move from left to right), `FocusReportModal`, `WorkoutModal`, `AddToCalendarModal`, `KeyboardShortcutsSheet`.

### 4. Default Spaces settings (match screenshot 3)
**File:** `src/components/focus/BackgroundEngine.tsx`
- Change default `bgBlur` from `0` → `4`.
- Change default `vignette` from `0` → `0.22`.
- Brightness (dimming=0.15 = 85%) is already correct.
- Video Audio (0%) is already correct.

### 5. Default clock settings
**File:** `src/context/FocusContext.tsx`
- Already set to `clockFontSize: 86`, `clockWeight: 200`, `clockShowSeconds: true`, `clockShowDate: true`, `clockShowGreeting: true`. Verify these match the screenshot — they do.

### 6. Reactive Today's Plan
**File:** `src/components/Scheduler.tsx`, `src/components/focus/TodaysPlanWidget.tsx`
- Add a `useEffect` that listens for changes to tasks and schedule blocks (via FluxContext) and auto-refreshes the plan view.
- Subscribe to FluxContext's `tasks` and `scheduleBlocks` arrays as dependencies so the widget re-renders immediately when a task or event is created/updated anywhere.
- Add a simple AI sorting heuristic: sort today's items by priority (high → medium → low), then by scheduled time, grouping calendar events and tasks into a logical timeline.

### Technical Details

**Context menu coordinate passing:**
```text
contextMenu {x, y} → CreateFolderModal.onCreate callback 
  → setDesktopFolderPositions(prev => ({...prev, [folder.id]: {x, y}}))
```

**Red close button pattern (reusable):**
```text
<button className="absolute top-3 right-3 z-50 group">
  <div style={{ width: 13, height: 13, borderRadius: "50%", 
    background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.12)" }}>
    <X size={7} className="opacity-0 group-hover:opacity-100" />
  </div>
</button>
```

**Spaces defaults localStorage:**
- On first load (no localStorage key), `bgBlur` initializes to `4` and `vignette` to `0.22`.
- Existing users who already have saved values will keep their settings.

