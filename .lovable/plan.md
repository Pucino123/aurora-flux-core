
## Bug Analysis

### Bug 1: Widget "Jumping" / Layout Shift

**Root cause:** `DraggableWidget` wraps everything in a `<motion.div>` with `initial/animate/exit` transitions. When `AuraWidget` switches states (idle ↔ active), line 997 conditionally switches between `createPortal(widget, document.body)` and rendering `widget` inline. This **unmounts and remounts** the entire `DraggableWidget` every time `isActive` toggles, destroying the drag library's DOM reference and causing position resets/jumps.

Additionally, the outer `motion.div` in `DraggableWidget` applies `scale: 0.95 → 1` on mount, which creates a visible jump each time the widget remounts.

### Bug 2: Toggle Glitch (close immediately reopens)

**Root cause:** In `AiToolsPanel.tsx`, the `askAura` function dispatches `aura:toggle`. The `aura:toggle` handler in `AuraWidget.tsx` (lines 474-492) checks `pillModeRef.current`. However, there's also a `mousedown` outside-click handler (lines 413-423) that calls `revertToIdle()` when clicking outside. When the user clicks the toolbar orb button:
1. `mousedown` fires → outside-click handler sees pillMode is "input" → calls `revertToIdle()` (sets to "idle")  
2. `click` fires → `aura:toggle` handler sees mode is now "idle" → re-opens Aura

This is the double-flip race condition.

## Fix Plan

### Fix 1: Stop unmounting/remounting DraggableWidget
- In `AuraWidget.tsx` line 997: always render `widget` (no portal conditional). Instead, manage z-index via `containerStyle` (already done for `injectedDocContext`, just extend it to always use high z when active)
- Remove the `isActive ? createPortal(widget, document.body) : widget` pattern — always render directly, keep `zIndex` elevation via `containerStyle` prop

### Fix 2: Fix toggle double-fire
- In `AuraWidget.tsx` `aura:toggle` handler: use `e.stopImmediatePropagation()` and also set a ref flag `isTogglingRef` that the outside-click `mousedown` handler checks before calling `revertToIdle()`
- In `AiToolsPanel.tsx` `askAura`: change from dispatching `CustomEvent` on `click` to using `onMouseDown` + `e.stopPropagation()` + `e.preventDefault()` on the toggle button so the outside-click listener never sees it

**Specifically:**
- `AiToolsPanel.tsx`: Add `onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}` to the ToolbarButton wrapper, or pass `onMouseDown` prop
- `AuraWidget.tsx`: In the outside-click `mousedown` handler, add a guard using a `isHandlingToggleRef` ref that is set to `true` during the `aura:toggle` handler and reset after, to prevent the outside-click from firing simultaneously
- Alternative simpler fix: change the outside-click listener from `mousedown` to `click`, and in the `aura:toggle` event dispatch, call `e.stopPropagation()` on the original click event in `AiToolsPanel`

### Cleanest solution:
1. **`AiToolsPanel.tsx`**: In `askAura`, use `mousedown` with `stopPropagation` instead of relying on `onClick`
2. **`AuraWidget.tsx`**: 
   - Change outside-click listener from `mousedown` to `click` 
   - Always render `widget` without portal switching (remove the conditional portal)
   - Increase `zIndex` to `9000` when `isActive` (already partially done)

### Files to edit:
- `src/components/focus/AuraWidget.tsx` — remove portal conditional, fix outside-click listener to use `click` instead of `mousedown`
- `src/components/documents/toolbar/AiToolsPanel.tsx` — use `onMouseDown` with `stopPropagation` for the toggle button
- `src/components/documents/toolbar/ToolbarButton.tsx` — check if it needs `onMouseDown` prop support
