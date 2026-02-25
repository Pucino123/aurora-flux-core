

# Ultimate Widget Editor: Focus Mode + Pixel-Perfect UI

## Overview

Transform the Widget Style Editor into a "Focus Mode" experience matching the existing Clock Editor pattern: dimmed background overlay, elevated widget, and a draggable editor panel positioned intelligently beside the widget.

## Current State

- **ClockEditor** already implements the desired UX: a fixed dark overlay (`bg-black/30 backdrop-blur-[3px]`), the clock widget elevated above it at `z-[65]`, and the editor at `z-[80]`.
- **WidgetStyleEditor** is rendered as a child `absolute` div inside `DraggableWidget`, meaning it overlaps the widget and has no focus overlay.
- The editor's visual design (tabs, glassmorphism, swatches) is already close to the reference but needs refinement.

## Plan

### 1. Focus Mode Overlay System

**File: `src/components/focus/DraggableWidget.tsx`**

- Remove the inline `WidgetStyleEditor` rendering (lines 394-412) from inside the widget.
- Instead, when the gear icon is clicked, call a new callback prop `onOpenStyleEditor(widgetId, widgetRect)` that bubbles up to `FocusDashboardView`.

**File: `src/components/focus/FocusDashboardView.tsx`**

- Add state: `styleEditorTarget: { id: string, rect: DOMRect } | null`.
- When `styleEditorTarget` is set, render:
  1. A fixed overlay: `fixed inset-0 z-[60] bg-black/30 backdrop-blur-[3px]` (same as ClockEditor).
  2. The target widget re-rendered at `z-[65]` above the overlay (same pattern as ClockEditor lines 370-376).
  3. The `WidgetStyleEditor` at `z-[80]`, initially positioned to the right of the widget rect (or left if no space).
- Clicking the overlay closes the editor.

### 2. Smart "No-Overlap" Positioning

When opening the editor:
- Read the widget's bounding rect via `getBoundingClientRect()`.
- If `widgetRect.right + 360 < window.innerWidth`, position editor at `left: widgetRect.right + 20px`.
- Otherwise, position at `right: window.innerWidth - widgetRect.left + 20px`.
- Vertically center with the widget.
- The editor remains draggable from its header for manual repositioning.

### 3. Visual Polish (Matching Reference Screenshot)

**File: `src/components/focus/WidgetStyleEditor.tsx`**

Minor refinements to match the screenshot pixel-perfectly:
- Container: keep current `rgba(28,28,30,0.88)` with `blur(60px)` -- already matches.
- Tab bar: ensure active tab has `bg-white/12` highlight with subtle shadow.
- Bottom slider: keep blue accent track (`#0a84ff`), white 22px thumb with drop shadow.
- Close button (`X`): subtle in top-right corner -- already implemented.
- Add `onClose` prop (rename from `onReset`) so closing just closes without resetting styles.

### 4. Clock Widget Integration

The ClockEditor already has its own Focus Mode. No changes needed there. But ensure:
- The `ClockWidget` does NOT render any default background colors or glows (already fixed in prior iterations -- will verify `ClockWidget.tsx` has no hardcoded bg classes).

### 5. 0% Opacity = True Transparency

**File: `src/components/focus/DraggableWidget.tsx`**

Already implemented in current code (lines 209-215): when `backgroundOpacity === 0`, background is set to `"transparent"` and blur is disabled. Will verify this path works correctly when the editor is externalized.

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/focus/DraggableWidget.tsx` | Remove inline editor rendering. Add `onOpenStyleEditor` callback prop. Pass widget ref for rect calculation. |
| `src/components/focus/FocusDashboardView.tsx` | Add focus overlay + elevated widget + positioned editor pattern (mirroring ClockEditor). Wire up `onOpenStyleEditor` for all widget instances. |
| `src/components/focus/WidgetStyleEditor.tsx` | Add `onClose` prop separate from `onReset`. Minor visual tweaks for pixel-perfect match. |

### Files Unchanged
- `ClockWidget.tsx` -- already transparent by default.
- `ClockEditor.tsx` -- already has its own focus mode.
- `useWidgetStyle.ts` -- no changes needed.

### Z-Index Stack
```text
z-[60]  Focus overlay (dimmed + blur)
z-[65]  Active widget (elevated above overlay)
z-[80]  Style Editor popup (draggable, above everything)
```

### Component Flow
```text
User clicks gear icon on widget header
  --> DraggableWidget calls onOpenStyleEditor(id)
  --> FocusDashboardView sets styleEditorTarget = { id }
  --> Renders: overlay + elevated widget + WidgetStyleEditor
  --> User edits in real-time, can drag editor aside
  --> Click overlay or X to close
```

