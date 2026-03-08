
## Full Plan: 4 Tasks

### What exists
- `CouncilBoardroom.tsx`: Full 2×2 grid with mock responses only — no real AI call. Uses `MOCK_RESPONSES` dict for all 4 personas, no per-persona streaming.
- `CRMWidget.tsx`: Stage-change popover works. No drag-and-drop. Uses framer-motion `layout` already.
- `NotesWidget.tsx`: Pure local state. No DB persistence.
- `flux-ai` edge: Has `handleCouncil` (type `"council"`) but that returns 5 personas from the old format. Need a new `"boardroom-consult"` handler that returns 4 named personas (Elena, Helen, Anton, Margot) in structured format.

---

### Task 1 — Council Boardroom: Real AI + Inter-persona Banter + 1-on-1 Expand

**Edge function change** (`supabase/functions/flux-ai/index.ts`):
Add `handleBoardroomConsult(idea, apiKey)` — uses tool calling to return exactly 4 personas with `{ key, analysis, question, confidence }`. System prompt forces cross-references ("I disagree with Elena's point about...") and a Socratic bold question at end. Route: `if (type === "boardroom-consult")`.

**`CouncilBoardroom.tsx` changes**:

1. **Real AI call**: Replace mock `setTimeout` reveal loop with actual `supabase.functions.invoke("flux-ai", { body: { type: "boardroom-consult", idea } })`. On success, parse `result.personas` array and sequence reveals with 400ms delays between each.

2. **Inter-persona banter**: The prompt forces it — just display the real text. Add a visual `"↩️ replying to Elena"` chip when the analysis contains another persona's name.

3. **Floating emoji reactions**: Currently `showReaction` boolean — wire it so when persona[i] is "typing", the OTHER 3 cards show random floating emojis every 1.2s via `useInterval`.

4. **1-on-1 deep dive (70% expand)**: Currently uses `flex: isExpanded ? 3 : 1`. Change grid to `flex` row with `motion.div` flex values: expanded=`flex-[3]`, others=`flex-[1]`. This visually gives 75% to expanded card. The chat thread (`sendChat`) already works via `supabase.functions.invoke` — keep it.

5. **Action plan**: Currently uses static `ACTION_PLAN` array. After real AI response, derive action plan from actual responses (or add `action_plan` field to the boardroom tool call output).

---

### Task 2 — CRM Drag-and-Drop with Framer Motion

**Approach**: Use framer-motion `useDrag` / reorder via state. Since @dnd-kit is installed, use it for proper DnD but avoid overcomplicating:
- Wrap `CRMWidgetContent` with `DndContext` from `@dnd-kit/core`
- Each `DealCard` becomes `<Draggable id={deal.id}>`
- Each stage container becomes `<Droppable id={stage}>`
- `onDragEnd`: extract `active.id` (deal id) and `over.id` (stage), call `handleStageChange`
- Use `motion.div` `layout` on cards for smooth reorder animation (already present)
- Keep existing popover for mobile/accessibility

**Files changed**: Only `src/components/focus/CRMWidget.tsx`

---

### Task 3 — Notes Persistent Cloud Storage

**DB table**: `tasks` table already has `type` column — notes with `type: "note"` already exist in the system. The `NotesWidget` needs to read/write to the `tasks` table using `type: "note"`, syncing with the existing `useFlux` context that already loads tasks.

However, the notes widget needs `isLocked` and `password` which aren't in the tasks table. Options:
- Store `isLocked` + `password` in the `content` JSONB field as metadata → messy
- Use the `tags` array column to store `["locked"]` flag, `content` field for the text, a separate column for password → no password column exists

Best approach: Store notes as tasks with `type: "note"`. For lock state, use `tags` array: `["locked"]` indicates locked. For password, encode in `content` field as first line: `__pw:1234__\nActual content`. On load, parse this.

Actually cleaner: the `tasks` table has `content` (text), `title` (text), `tags` (array), `type` (text). Store `isLocked = tags?.includes("locked")`, `password` encoded as `\n__pw:hash__` appended to content. On save, strip the pw line from display content.

**`NotesWidget.tsx` changes**:
- Replace `useState<Note[]>(INITIAL_NOTES)` with Supabase query loading tasks where `type = "note"` and `user_id = user.id`
- Map DB tasks to `Note` interface: `{ id, title, content, isLocked: tags?.includes("locked"), password: extractPw(content), updatedAt }`
- On save (content change, debounced 600ms): `supabase.from("tasks").upsert({ id, title, content: encodedContent, tags, type: "note", user_id })`
- On create note: insert to tasks table
- On delete: delete from tasks table
- Show loading skeleton while fetching
- Fall back to `INITIAL_NOTES` if unauthenticated (guest mode)
- Real-time: subscribe to `tasks` table changes filtered by `type=note` and `user_id`

**Password encoding**: `content` field stores `__LOCK_PW:1234\nActual text content`. On display, strip the `__LOCK_PW:xxx` line. On save, re-prepend if `isLocked`.

---

### Edge function addition

Add to `supabase/functions/flux-ai/index.ts`:

```typescript
async function handleBoardroomConsult(idea: string, apiKey: string) {
  // Returns { personas: [{ key, analysis, question, confidence }], action_plan: string[] }
  // System prompt forces:
  // - Each persona references another by name
  // - Ends with bold Socratic question
  // - Inter-persona banter: "Building on Elena's logistics point..."
}
```

Register: `if (type === "boardroom-consult") return await handleBoardroomConsult(context?.idea || messages?.[0]?.content || "", LOVABLE_API_KEY);`

---

### Files to change

1. `supabase/functions/flux-ai/index.ts` — add `handleBoardroomConsult` + route
2. `src/components/council/CouncilBoardroom.tsx` — real AI call, floating emoji useInterval, flex expand layout, banter chips, dynamic action plan
3. `src/components/focus/CRMWidget.tsx` — @dnd-kit DnD integration
4. `src/components/focus/NotesWidget.tsx` — Supabase persistence via tasks table

### Implementation notes

- The tasks table has all required columns and RLS policies already in place
- `useAuth` provides `user` — import it in NotesWidget
- `@dnd-kit/core` and `@dnd-kit/sortable` already installed — can use immediately
- For Boardroom real AI: fallback to `MOCK_RESPONSES` on error so the widget never breaks
- Lock password stored via `tags: ["locked", "pw:1234"]` is cleaner than encoding in content
- Floating emoji timer: `useEffect` + `setInterval` when any card is in "typing" state
