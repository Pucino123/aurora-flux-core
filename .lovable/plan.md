

## Issues Found & Fix Plan

### 1. Sidebar Folders: Remove Default Kanban + Remove Budget Item

**Problem:** `FolderNodeComponent` in `BrainTree.tsx` shows `folder.tasks.length` as a badge, and clicking a folder runs `setActiveView("canvas")` which opens the kanban board. The user wants folders to only display their actual nested contents (sub-folders and documents) — not tasks/kanban.

Additionally, the task count badge (`folder.tasks.length`) implies kanban-style content. The "følg mit månedlige budget" item appears because tasks are associated with folders.

**Fix in `BrainTree.tsx`:**
- Remove the `folder.tasks.length` badge from `FolderNodeComponent` (line 145-147)
- Change `handleClick` to only toggle the folder open/closed (expand tree) instead of switching to canvas/kanban view. Double-click can still open the folder modal on the desktop.
- Only show documents and child folders in the expanded tree — no tasks

### 2. Group Drag Broken After Marquee Selection

**Root cause:** `handleGroupDragStart` calls `e.preventDefault()` on the PointerEvent (line 392). This suppresses the subsequent mouse events. But the group drag movement listener (`onMouseMove` at line 304) listens on `window.addEventListener("mousemove", ...)`. Since `preventDefault()` on pointerdown suppresses mousedown → mousemove chain, the group drag never gets movement data.

**Fix in `FocusDashboardView.tsx`:**
- Change `window.addEventListener("mousemove", onMouseMove)` and `window.addEventListener("mouseup", onMouseUp)` to use `pointermove` and `pointerup` instead. This ensures compatibility with the PointerEvent-based drag initiation.
- Remove `e.preventDefault()` from `handleGroupDragStart` or ensure pointer events are used throughout.

### 3. Right-Click Should Not Move Items

**Problem:** Right-clicking a selected item triggers `handlePointerDown` which can start group drag, then the context menu opens, but the group drag state is now active.

**Fix in `DesktopFolder.tsx` and `DesktopDocument.tsx`:**
- In `handlePointerDown`, check `if (e.button !== 0) return;` at the very top — only start drag on left-click. Right-click (button 2) should be ignored by the drag handler.
- Same check needed in `handleGroupDragStart` in `FocusDashboardView.tsx`

### Summary of File Changes

| File | Change |
|------|--------|
| `BrainTree.tsx` | Remove task count badge; change folder click to toggle expand instead of opening kanban |
| `FocusDashboardView.tsx` | Switch mousemove/mouseup listeners to pointermove/pointerup; add button check in handleGroupDragStart |
| `DesktopFolder.tsx` | Add `if (e.button !== 0) return;` guard in handlePointerDown |
| `DesktopDocument.tsx` | Same button guard |

