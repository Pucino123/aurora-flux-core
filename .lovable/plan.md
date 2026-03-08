
## Fixes: SmartPlanWidget crash + Remove redundant chat widget

### Issue 1 — SmartPlanWidget runtime crash

The crash occurs because `SortableBlock` renders a `motion.div` with the `layout` prop. This sits inside both `DndContext`+`SortableContext` AND `AnimatePresence mode="popLayout"` simultaneously. Framer Motion's layout measurement and `@dnd-kit`'s transform system both try to control the element's position at the same time → React throws.

**Fix:** Remove the `layout` prop from `SortableBlock`'s `motion.div`. This is the only source of the crash — the DndContext manages reordering via CSS transforms, not Framer layout animations. The `initial`/`animate`/`exit` animations on the block are fine to keep.

```
// BEFORE (line 143-150):
<motion.div ref={setNodeRef} style={s} layout initial=... exit=...>

// AFTER:
<motion.div ref={setNodeRef} style={s} initial=... exit=...>
```

---

### Issue 2 — Remove floating chat widget

`CommHub` (`src/components/CommHub.tsx`) is a floating button at the bottom-right of the dashboard that opens a panel with two tabs: **Aura** and **Team Chat**. The user says chat is redundant because Collab already exists at the bottom.

`CommHub` is rendered in `Dashboard.tsx` line 175:
```tsx
{effectiveView !== "focus" && effectiveView !== "stream" && <CommHub />}
```

**Decision:** Remove `CommHub` entirely from Dashboard. The Aura functionality it duplicates already exists via the dedicated `AskAura` component. The Team Chat it contained duplicates the Collab panel in the bottom bar.

**Files to change:**
1. `src/components/widgets/SmartPlanWidget.tsx` — remove `layout` prop from `SortableBlock` motion.div (line 143)
2. `src/components/Dashboard.tsx` — remove the `<CommHub />` line and its import
